import {
  restoreMobileSession,
  type AuthenticatedMobileSession,
  type MobileAuthState,
  type MobileMode,
  type MobileSessionStorage,
} from './auth-session';
import {
  consumeOidcCallback,
  createOidcAuthorizationRequest,
  type OidcConfiguration,
  type OidcCryptoBoundary,
  type OidcProviderIntent,
  type OidcTransactionStore,
} from './oidc-client';
import {
  completeOidcMobileSession,
  refreshOidcMobileSession,
  type MobileSessionBootstrapBoundary,
  type OidcIdTokenVerifier,
  type OidcTokenEndpoint,
} from './oidc-session-exchange';

export type MobileSignInState =
  | { phase: 'idle' }
  | { phase: 'preparing'; provider: OidcProviderIntent }
  | { phase: 'opening_browser'; provider: OidcProviderIntent }
  | { phase: 'exchanging'; provider: OidcProviderIntent }
  | { phase: 'request_ready'; provider: OidcProviderIntent }
  | { phase: 'cancelled'; provider: OidcProviderIntent }
  | {
      code: 'browser_failed' | 'configuration_unavailable' | 'provider_failed' | 'session_failed';
      phase: 'error';
      provider: OidcProviderIntent;
    }
  | {
      phase: 'workspace_required';
      provider: OidcProviderIntent;
      workspaces: AuthenticatedMobileSession['workspaces'];
    }
  | { phase: 'authenticated'; provider: OidcProviderIntent };

export type MobileAuthBrowserBoundary = {
  open(input: {
    authorizationUrl: string;
    redirectUri: string;
  }): Promise<
    { callbackUrl: string; status: 'success' } | { status: 'cancelled' } | { status: 'failed' }
  >;
};

export type MobileAuthOrchestrationDependencies = {
  bootstrap: MobileSessionBootstrapBoundary;
  browser: MobileAuthBrowserBoundary;
  configuration: { available: false } | { available: true; value: OidcConfiguration };
  crypto: OidcCryptoBoundary;
  idTokenVerifier: OidcIdTokenVerifier;
  sessionStorage: MobileSessionStorage;
  sessionIdRandomBytes(length: number): Promise<Uint8Array>;
  tokenEndpoint: OidcTokenEndpoint;
  transactionStore: OidcTransactionStore;
};

export type MobileSignInResult =
  | { status: 'cancelled' | 'error' | 'ignored' | 'request_ready' }
  | { session: AuthenticatedMobileSession; status: 'authenticated' | 'workspace_required' };

export class MobileAuthOrchestrator {
  private active = false;

  constructor(private readonly dependencies: MobileAuthOrchestrationDependencies) {}

  async signIn(input: {
    onState(state: MobileSignInState): void;
    preferredMode: Extract<MobileMode, 'business' | 'creator'>;
    provider: OidcProviderIntent;
  }): Promise<MobileSignInResult> {
    if (this.active) return { status: 'ignored' };
    this.active = true;
    const { onState, preferredMode, provider } = input;
    try {
      if (!this.dependencies.configuration.available) {
        onState({ code: 'configuration_unavailable', phase: 'error', provider });
        return { status: 'error' };
      }
      onState({ phase: 'preparing', provider });
      const request = await createOidcAuthorizationRequest({
        configuration: this.dependencies.configuration.value,
        crypto: this.dependencies.crypto,
        providerIntent: provider,
        purpose: 'sign_in',
      });
      await this.dependencies.transactionStore.save(request.transaction);
      onState({ phase: 'opening_browser', provider });
      const browserResult = await this.dependencies.browser.open({
        authorizationUrl: request.authorizationUrl,
        redirectUri: request.transaction.redirectUri,
      });
      if (browserResult.status === 'cancelled') {
        await this.dependencies.transactionStore.clear();
        onState({ phase: 'cancelled', provider });
        return { status: 'cancelled' };
      }
      if (browserResult.status === 'failed') {
        await this.dependencies.transactionStore.clear();
        onState({ code: 'browser_failed', phase: 'error', provider });
        return { status: 'error' };
      }
      const callback = await consumeOidcCallback({
        callbackUrl: browserResult.callbackUrl,
        store: this.dependencies.transactionStore,
      });
      if (callback.status === 'cancelled') {
        onState({ phase: 'cancelled', provider });
        return { status: 'cancelled' };
      }
      if (callback.status === 'error') {
        onState({ code: 'provider_failed', phase: 'error', provider });
        return { status: 'error' };
      }
      onState({ phase: 'exchanging', provider });
      const completed = await completeOidcMobileSession({
        bootstrap: this.dependencies.bootstrap,
        callback,
        clientId: this.dependencies.configuration.value.clientId,
        idTokenVerifier: this.dependencies.idTokenVerifier,
        preferredMode,
        redirectUri: this.dependencies.configuration.value.redirectUri,
        sessionIdRandomBytes: this.dependencies.sessionIdRandomBytes,
        storage: this.dependencies.sessionStorage,
        tokenEndpoint: this.dependencies.tokenEndpoint,
      });
      if (completed.status !== 'authenticated') {
        onState(
          completed.status === 'cancelled'
            ? { phase: 'cancelled', provider }
            : { code: 'provider_failed', phase: 'error', provider },
        );
        return { status: completed.status === 'cancelled' ? 'cancelled' : 'error' };
      }
      if (preferredMode === 'business' && completed.session.workspaces.length > 1) {
        onState({
          phase: 'workspace_required',
          provider,
          workspaces: completed.session.workspaces.map((workspace) => ({ ...workspace })),
        });
        return { session: completed.session, status: 'workspace_required' };
      }
      onState({ phase: 'authenticated', provider });
      return { session: completed.session, status: 'authenticated' };
    } catch {
      onState({ code: 'session_failed', phase: 'error', provider });
      return { status: 'error' };
    } finally {
      this.active = false;
    }
  }
}

export async function restoreAndRefreshMobileSession(input: {
  bootstrap: MobileSessionBootstrapBoundary;
  clientId: string;
  sessionStorage: MobileSessionStorage;
  tokenEndpoint: OidcTokenEndpoint;
}): Promise<MobileAuthState> {
  const restored = await restoreMobileSession(input.sessionStorage);
  if (restored.phase !== 'authenticated') return restored;
  if (!restored.session.refreshCredential) {
    await input.sessionStorage.clear();
    return { phase: 'anonymous', reason: 'missing' };
  }
  try {
    return {
      phase: 'authenticated',
      session: await refreshOidcMobileSession({
        bootstrap: input.bootstrap,
        clientId: input.clientId,
        current: restored.session,
        storage: input.sessionStorage,
        tokenEndpoint: input.tokenEndpoint,
      }),
    };
  } catch {
    await input.sessionStorage.clear();
    return { phase: 'expired' };
  }
}
