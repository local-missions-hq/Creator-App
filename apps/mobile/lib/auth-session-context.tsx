import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { revokeSessionAndClearLocalState } from './account-actions';
import { createMobileAccountDataAdapter } from './account-data';
import {
  apiAuthorizationContextForSession,
  createLocalPreviewSession,
  grantRecentAuthentication,
  hasRecentAuthentication,
  persistedSessionFromRuntime,
  selectBusinessWorkspace,
  selectMobileMode,
  type MobileAuthState,
  type MobileMode,
  type RecentAuthPurpose,
} from './auth-session';
import { createMobileSessionStorage } from './auth-session-storage';
import { type MobileSignInResult, type MobileSignInState } from './auth-orchestration';
import { createFailClosedMobileAuthRuntime } from './auth-orchestration-runtime';
import type { OidcProviderIntent } from './oidc-client';
import { createLocalOidcPreview } from './oidc-preview';

type SignOutResult = { remoteConfirmed: boolean; warning?: string };

type MobileAuthContextValue = {
  beginSignIn(
    provider: OidcProviderIntent,
    preferredMode: 'business' | 'creator',
  ): Promise<MobileSignInResult>;
  cacheEpoch: number;
  chooseWorkspace(workspacePublicId: string): Promise<void>;
  dataMode: 'api' | 'local-preview';
  hasRecentAuth(purpose: RecentAuthPurpose): boolean;
  previewRecentAuth(purpose: RecentAuthPurpose): void;
  selectMode(mode: MobileMode): Promise<void>;
  signOut(): Promise<SignOutResult>;
  startLocalPreview(mode: 'business' | 'creator'): void;
  state: MobileAuthState;
  signInState: MobileSignInState;
  resetSignIn(): void;
};

const MobileAuthContext = createContext<MobileAuthContextValue | null>(null);

export function MobileAuthSessionProvider({ children }: PropsWithChildren) {
  const dataMode = process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'local-preview';
  const storage = useMemo(
    () => createMobileSessionStorage(Platform.OS === 'web' ? 'web' : 'native'),
    [],
  );
  const [cacheEpoch, setCacheEpoch] = useState(0);
  const localSignInActive = useRef(false);
  const [signInState, setSignInState] = useState<MobileSignInState>({ phase: 'idle' });
  const [state, setState] = useState<MobileAuthState>(() =>
    dataMode === 'local-preview'
      ? { phase: 'authenticated', session: createLocalPreviewSession() }
      : { phase: 'restoring' },
  );
  const authRuntime = useMemo(
    () =>
      createFailClosedMobileAuthRuntime({ native: Platform.OS !== 'web', sessionStorage: storage }),
    [storage],
  );

  useEffect(() => {
    if (dataMode !== 'api') return;
    let active = true;
    void authRuntime.restore().then((restored) => {
      if (active) setState(restored);
    });
    return () => {
      active = false;
    };
  }, [authRuntime, dataMode]);

  const beginSignIn = useCallback(
    async (
      provider: OidcProviderIntent,
      preferredMode: 'business' | 'creator',
    ): Promise<MobileSignInResult> => {
      if (dataMode === 'local-preview') {
        if (localSignInActive.current) return { status: 'ignored' };
        localSignInActive.current = true;
        setSignInState({ phase: 'preparing', provider });
        try {
          await createLocalOidcPreview(provider);
          setSignInState({ phase: 'request_ready', provider });
          return { status: 'request_ready' };
        } catch {
          setSignInState({ code: 'session_failed', phase: 'error', provider });
          return { status: 'error' };
        } finally {
          localSignInActive.current = false;
        }
      }
      const result = await authRuntime.orchestrator.signIn({
        onState: setSignInState,
        preferredMode,
        provider,
      });
      if ('session' in result) {
        setState({ phase: 'authenticated', session: result.session });
        setCacheEpoch((value) => value + 1);
      }
      return result;
    },
    [authRuntime, dataMode],
  );

  const selectMode = useCallback(
    async (mode: MobileMode) => {
      const next = selectMobileMode(state, mode);
      setState(next);
      setCacheEpoch((value) => value + 1);
      if (next.phase === 'authenticated' && next.session.source === 'api') {
        await storage.save(persistedSessionFromRuntime(next.session));
      }
    },
    [state, storage],
  );

  const startLocalPreview = useCallback(
    (mode: 'business' | 'creator') => {
      if (dataMode !== 'local-preview') return;
      const preview = createLocalPreviewSession(mode);
      const session =
        mode === 'business'
          ? { ...preview, workspacePublicId: undefined, workspaceRole: undefined }
          : preview;
      setState({ phase: 'authenticated', session });
      if (mode === 'business') {
        const provider = signInState.phase === 'idle' ? 'apple' : signInState.provider;
        setSignInState({
          phase: 'workspace_required',
          provider,
          workspaces: session.workspaces.map((workspace) => ({ ...workspace })),
        });
      }
      setCacheEpoch((value) => value + 1);
    },
    [dataMode, signInState],
  );

  const chooseWorkspace = useCallback(
    async (workspacePublicId: string) => {
      const next = selectBusinessWorkspace(state, workspacePublicId);
      if (next.phase !== 'authenticated') {
        throw new Error('A signed-in account is required to select a Business workspace.');
      }
      if (next.session.source === 'api') {
        await storage.save(persistedSessionFromRuntime(next.session));
      }
      setState(next);
      setCacheEpoch((value) => value + 1);
      const provider = signInState.phase === 'idle' ? 'apple' : signInState.provider;
      setSignInState({ phase: 'authenticated', provider });
    },
    [signInState, state, storage],
  );

  const resetSignIn = useCallback(() => setSignInState({ phase: 'idle' }), []);

  const previewRecentAuth = useCallback(
    (purpose: RecentAuthPurpose) => {
      if (dataMode !== 'local-preview') return;
      setState((current) => grantRecentAuthentication(current, purpose));
    },
    [dataMode],
  );

  const hasRecentAuth = useCallback(
    (purpose: RecentAuthPurpose) => hasRecentAuthentication(state, purpose),
    [state],
  );

  const signOut = useCallback(async (): Promise<SignOutResult> => {
    const current = state;
    let remoteConfirmed = false;
    let warning: string | undefined;
    const clearSensitiveLocalState = async () => {
      await storage.clear();
    };

    try {
      if (current.phase === 'authenticated' && current.session.source === 'api') {
        const adapter = createMobileAccountDataAdapter({
          accessToken: current.session.accessToken,
          authorizationContext: apiAuthorizationContextForSession(current.session),
          mode: 'api',
          sessionPublicId: current.session.sessionPublicId,
        });
        await revokeSessionAndClearLocalState({
          adapter,
          cache: { clearSensitiveAccountState: clearSensitiveLocalState },
          sessionPublicId: current.session.sessionPublicId,
        });
        remoteConfirmed = true;
      } else {
        await clearSensitiveLocalState();
      }
    } catch {
      warning =
        'This device is signed out. Server revocation or protected-storage cleanup could not be confirmed.';
    } finally {
      setCacheEpoch((value) => value + 1);
      setState({ phase: 'anonymous', reason: 'logout' });
      setSignInState({ phase: 'idle' });
    }
    return warning ? { remoteConfirmed, warning } : { remoteConfirmed };
  }, [state, storage]);

  const value = useMemo<MobileAuthContextValue>(
    () => ({
      beginSignIn,
      cacheEpoch,
      chooseWorkspace,
      dataMode,
      hasRecentAuth,
      previewRecentAuth,
      resetSignIn,
      selectMode,
      signOut,
      startLocalPreview,
      state,
      signInState,
    }),
    [
      beginSignIn,
      cacheEpoch,
      chooseWorkspace,
      dataMode,
      hasRecentAuth,
      previewRecentAuth,
      resetSignIn,
      selectMode,
      signOut,
      startLocalPreview,
      state,
      signInState,
    ],
  );

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuthSession(): MobileAuthContextValue {
  const value = useContext(MobileAuthContext);
  if (!value) throw new Error('MobileAuthSessionProvider is missing from the app root.');
  return value;
}
