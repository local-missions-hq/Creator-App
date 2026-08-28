import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { revokeSessionAndClearLocalState } from './account-actions';
import { createMobileAccountDataAdapter } from './account-data';
import {
  createLocalPreviewSession,
  grantRecentAuthentication,
  hasRecentAuthentication,
  persistedSessionFromRuntime,
  restoreMobileSession,
  selectMobileMode,
  type MobileAuthState,
  type MobileMode,
  type RecentAuthPurpose,
} from './auth-session';
import { createMobileSessionStorage } from './auth-session-storage';

type SignOutResult = { remoteConfirmed: boolean; warning?: string };

type MobileAuthContextValue = {
  cacheEpoch: number;
  dataMode: 'api' | 'local-preview';
  hasRecentAuth(purpose: RecentAuthPurpose): boolean;
  previewRecentAuth(purpose: RecentAuthPurpose): void;
  selectMode(mode: MobileMode): Promise<void>;
  signOut(): Promise<SignOutResult>;
  startLocalPreview(mode: 'business' | 'creator'): void;
  state: MobileAuthState;
};

const MobileAuthContext = createContext<MobileAuthContextValue | null>(null);

export function MobileAuthSessionProvider({ children }: PropsWithChildren) {
  const dataMode = process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'local-preview';
  const storage = useMemo(
    () => createMobileSessionStorage(Platform.OS === 'web' ? 'web' : 'native'),
    [],
  );
  const [cacheEpoch, setCacheEpoch] = useState(0);
  const [state, setState] = useState<MobileAuthState>(() =>
    dataMode === 'local-preview'
      ? { phase: 'authenticated', session: createLocalPreviewSession() }
      : { phase: 'restoring' },
  );

  useEffect(() => {
    if (dataMode !== 'api') return;
    let active = true;
    void restoreMobileSession(storage).then((restored) => {
      if (active) setState(restored);
    });
    return () => {
      active = false;
    };
  }, [dataMode, storage]);

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
      setState({ phase: 'authenticated', session: createLocalPreviewSession(mode) });
      setCacheEpoch((value) => value + 1);
    },
    [dataMode],
  );

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
          mode: 'api',
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
    }
    return warning ? { remoteConfirmed, warning } : { remoteConfirmed };
  }, [state, storage]);

  const value = useMemo<MobileAuthContextValue>(
    () => ({
      cacheEpoch,
      dataMode,
      hasRecentAuth,
      previewRecentAuth,
      selectMode,
      signOut,
      startLocalPreview,
      state,
    }),
    [
      cacheEpoch,
      dataMode,
      hasRecentAuth,
      previewRecentAuth,
      selectMode,
      signOut,
      startLocalPreview,
      state,
    ],
  );

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuthSession(): MobileAuthContextValue {
  const value = useContext(MobileAuthContext);
  if (!value) throw new Error('MobileAuthSessionProvider is missing from the app root.');
  return value;
}
