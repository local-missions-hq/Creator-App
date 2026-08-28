import * as WebBrowser from 'expo-web-browser';

import type { MobileSessionStorage } from './auth-session';
import {
  MobileAuthOrchestrator,
  restoreAndRefreshMobileSession,
  type MobileAuthBrowserBoundary,
} from './auth-orchestration';
import { expoOidcCryptoBoundary } from './oidc-runtime';
import { UnavailableOidcTokenEndpoint, type OidcIdTokenVerifier } from './oidc-session-exchange';
import { MemoryOidcTransactionStore, SecureOidcTransactionStore } from './oidc-transaction-storage';
import { createMobileSessionDataAdapter } from './session-data';

export const expoSystemAuthBrowserBoundary: MobileAuthBrowserBoundary = {
  async open(input) {
    const result = await WebBrowser.openAuthSessionAsync(input.authorizationUrl, input.redirectUri);
    if (result.type === 'success') {
      return { callbackUrl: result.url, status: 'success' };
    }
    if (
      result.type === WebBrowser.WebBrowserResultType.CANCEL ||
      result.type === WebBrowser.WebBrowserResultType.DISMISS
    ) {
      return { status: 'cancelled' };
    }
    return { status: 'failed' };
  },
};

const unavailableIdTokenVerifier: OidcIdTokenVerifier = {
  async verify() {
    throw new Error('External identity verification is not configured.');
  },
};

export function createFailClosedMobileAuthRuntime(input: {
  native: boolean;
  sessionStorage: MobileSessionStorage;
}) {
  const bootstrap = createMobileSessionDataAdapter();
  const tokenEndpoint = new UnavailableOidcTokenEndpoint();
  const orchestrator = new MobileAuthOrchestrator({
    bootstrap,
    browser: expoSystemAuthBrowserBoundary,
    configuration: { available: false },
    crypto: expoOidcCryptoBoundary,
    idTokenVerifier: unavailableIdTokenVerifier,
    sessionIdRandomBytes: expoOidcCryptoBoundary.randomBytes,
    sessionStorage: input.sessionStorage,
    tokenEndpoint,
    transactionStore: input.native
      ? new SecureOidcTransactionStore()
      : new MemoryOidcTransactionStore(),
  });
  return {
    orchestrator,
    restore: () =>
      restoreAndRefreshMobileSession({
        bootstrap,
        clientId: '00000000-0000-4000-8000-000000000000',
        sessionStorage: input.sessionStorage,
        tokenEndpoint,
      }),
  };
}
