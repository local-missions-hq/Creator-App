export type MobileAccountStatus = 'active' | 'deletion_requested' | 'disabled';
export type MobileRole = 'business_manager' | 'business_owner' | 'creator' | 'venue_staff';
export type MobileMode = 'business' | 'creator' | 'venue_staff';
export type MobileApiRole = 'business_manager' | 'business_owner' | 'creator';
export type MobileApiAuthorizationContext = {
  businessPublicId?: string;
  role: MobileApiRole;
};
export type RecentAuthPurpose =
  'account_deletion' | 'identity_link' | 'identity_unlink' | 'payout_change';

export type PersistedMobileSession = {
  accountStatus: MobileAccountStatus;
  expiresAt: string;
  provider: 'apple' | 'google' | 'microsoft' | 'passwordless_email';
  refreshCredential?: string;
  roles: MobileRole[];
  selectedMode: MobileMode;
  sessionPublicId: string;
  userPublicId: string;
  version: 1;
  workspacePublicId?: string;
  workspaceRole?: 'business_manager' | 'business_owner';
};

export type AuthenticatedMobileSession = PersistedMobileSession & {
  accessToken?: string;
  accessTokenExpiresAt?: string;
  source: 'api' | 'local-preview';
};

export type MobileAuthState =
  | { phase: 'anonymous'; reason?: 'logout' | 'missing' }
  | { phase: 'blocked'; reason: 'deletion_requested' | 'disabled' }
  | { phase: 'expired' }
  | { phase: 'restoring' }
  | {
      phase: 'authenticated';
      recentAuth?: { expiresAt: string; purpose: RecentAuthPurpose };
      session: AuthenticatedMobileSession;
    };

export interface MobileSessionStorage {
  readonly kind: 'native-secure-store' | 'web-preview-memoryless';
  clear(): Promise<void>;
  load(): Promise<PersistedMobileSession | null>;
  save(session: PersistedMobileSession): Promise<void>;
}

export type MobileRouteAuthorization = {
  allowed: boolean;
  requiredMode?: MobileMode;
  reason?: 'account-blocked' | 'anonymous' | 'expired' | 'missing-role';
};

export type MobilePrivateResource =
  'account' | 'business_campaigns' | 'creator_missions' | 'venue_check_in';

export const mobileResourceRoleMatrix: Record<MobilePrivateResource, MobileRole[]> = {
  account: ['creator', 'business_owner', 'business_manager'],
  business_campaigns: ['business_owner', 'business_manager'],
  creator_missions: ['creator'],
  venue_check_in: ['venue_staff'],
};

const publicRoutes = new Set([
  '/',
  '/business/setup',
  '/business/sign-in',
  '/creator/profile',
  '/creator/sign-in',
]);

export function availableModes(roles: MobileRole[]): MobileMode[] {
  const result: MobileMode[] = [];
  if (roles.includes('creator')) result.push('creator');
  if (roles.includes('business_owner') || roles.includes('business_manager')) {
    result.push('business');
  }
  if (roles.includes('venue_staff')) result.push('venue_staff');
  return result;
}

export function requiredModeForRoute(pathname: string): MobileMode | undefined {
  if (publicRoutes.has(pathname)) return undefined;
  if (pathname.startsWith('/creator/')) return 'creator';
  if (pathname.startsWith('/business/')) return 'business';
  if (pathname.startsWith('/venue/')) return 'venue_staff';
  return undefined;
}

export function authorizeMobileRoute(
  state: MobileAuthState,
  pathname: string,
): MobileRouteAuthorization {
  const requiredMode = requiredModeForRoute(pathname);
  if (!requiredMode) return { allowed: true };
  if (state.phase === 'blocked') {
    return { allowed: false, reason: 'account-blocked', requiredMode };
  }
  if (state.phase === 'expired') return { allowed: false, reason: 'expired', requiredMode };
  if (state.phase !== 'authenticated') {
    return { allowed: false, reason: 'anonymous', requiredMode };
  }
  if (!availableModes(state.session.roles).includes(requiredMode)) {
    return { allowed: false, reason: 'missing-role', requiredMode };
  }
  return { allowed: true, requiredMode };
}

export function authorizeMobileResource(
  state: MobileAuthState,
  resource: MobilePrivateResource,
): boolean {
  if (state.phase !== 'authenticated' || state.session.accountStatus !== 'active') return false;
  return mobileResourceRoleMatrix[resource].some((role) => state.session.roles.includes(role));
}

export function createLocalPreviewSession(
  selectedMode: 'business' | 'creator' = 'creator',
): AuthenticatedMobileSession {
  return {
    accountStatus: 'active',
    expiresAt: '2099-01-01T00:00:00.000Z',
    provider: 'apple',
    roles: ['creator', 'business_owner', 'venue_staff'],
    selectedMode,
    sessionPublicId: 'ses_synthetic_preview_001',
    source: 'local-preview',
    userPublicId: 'usr_synthetic_preview_001',
    version: 1,
    workspacePublicId: 'biz_synthetic_orlando_001',
    workspaceRole: 'business_owner',
  };
}

export function apiAuthorizationContextForSession(
  session: AuthenticatedMobileSession,
): MobileApiAuthorizationContext {
  if (session.selectedMode === 'creator') {
    if (!session.roles.includes('creator')) {
      throw new Error('The signed-in account does not have Creator API access.');
    }
    return { role: 'creator' };
  }

  if (session.selectedMode === 'business') {
    if (!session.workspacePublicId) {
      throw new Error('Business API access requires a selected business workspace.');
    }
    const availableBusinessRoles = session.roles.filter(
      (role): role is 'business_manager' | 'business_owner' =>
        role === 'business_manager' || role === 'business_owner',
    );
    const workspaceRole =
      session.workspaceRole ??
      (availableBusinessRoles.length === 1 ? availableBusinessRoles[0] : undefined);
    if (workspaceRole && availableBusinessRoles.includes(workspaceRole)) {
      return { businessPublicId: session.workspacePublicId, role: workspaceRole };
    }
    throw new Error('Business API access requires the selected workspace role.');
  }

  throw new Error('Venue Staff API access is not available in this checkpoint.');
}

export function authenticatedMobileApiHeaders(
  accessToken: string | undefined,
  context: MobileApiAuthorizationContext | undefined,
): Record<string, string> {
  if (!accessToken) {
    throw new Error('API data mode requires an authenticated session token.');
  }
  if (!context) {
    throw new Error('API data mode requires an authenticated role context.');
  }
  if (context.role === 'creator' && context.businessPublicId) {
    throw new Error('Creator API context cannot include a business workspace.');
  }
  if (context.role !== 'creator' && !context.businessPublicId) {
    throw new Error('Business API context requires a selected business workspace.');
  }
  return {
    Authorization: `Bearer ${accessToken}`,
    'x-local-missions-role': context.role,
    ...(context.businessPublicId ? { 'x-local-missions-business': context.businessPublicId } : {}),
  };
}

export function selectMobileMode(
  state: MobileAuthState,
  selectedMode: MobileMode,
): MobileAuthState {
  if (state.phase !== 'authenticated') return state;
  if (!availableModes(state.session.roles).includes(selectedMode)) {
    throw new Error('The signed-in account does not have that mode.');
  }
  return { ...state, session: { ...state.session, selectedMode } };
}

export function grantRecentAuthentication(
  state: MobileAuthState,
  purpose: RecentAuthPurpose,
  now = new Date(),
): MobileAuthState {
  if (state.phase !== 'authenticated') return state;
  return {
    ...state,
    recentAuth: { expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(), purpose },
  };
}

export function hasRecentAuthentication(
  state: MobileAuthState,
  purpose: RecentAuthPurpose,
  now = new Date(),
): boolean {
  return (
    state.phase === 'authenticated' &&
    state.recentAuth?.purpose === purpose &&
    Date.parse(state.recentAuth.expiresAt) > now.getTime()
  );
}

export async function restoreMobileSession(
  storage: MobileSessionStorage,
  now = new Date(),
): Promise<MobileAuthState> {
  let session: PersistedMobileSession | null;
  try {
    session = await storage.load();
  } catch {
    try {
      await storage.clear();
    } catch {
      // The in-memory state still fails closed when device cleanup is unavailable.
    }
    return { phase: 'anonymous', reason: 'missing' };
  }
  if (!session) return { phase: 'anonymous', reason: 'missing' };
  if (session.accountStatus !== 'active') {
    await storage.clear();
    return { phase: 'blocked', reason: session.accountStatus };
  }
  if (Date.parse(session.expiresAt) <= now.getTime()) {
    await storage.clear();
    return { phase: 'expired' };
  }
  const modes = availableModes(session.roles);
  if (modes.length === 0) {
    await storage.clear();
    return { phase: 'blocked', reason: 'disabled' };
  }
  const selectedMode = modes.includes(session.selectedMode) ? session.selectedMode : modes[0]!;
  return {
    phase: 'authenticated',
    session: { ...session, selectedMode, source: 'api' },
  };
}

export function persistedSessionFromRuntime(
  session: AuthenticatedMobileSession,
): PersistedMobileSession {
  return {
    accountStatus: session.accountStatus,
    expiresAt: session.expiresAt,
    provider: session.provider,
    refreshCredential: session.refreshCredential,
    roles: [...session.roles],
    selectedMode: session.selectedMode,
    sessionPublicId: session.sessionPublicId,
    userPublicId: session.userPublicId,
    version: 1,
    workspacePublicId: session.workspacePublicId,
    workspaceRole: session.workspaceRole,
  };
}
