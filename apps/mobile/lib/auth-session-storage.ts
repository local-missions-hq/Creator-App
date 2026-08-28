import * as SecureStore from 'expo-secure-store';

import type { MobileSessionStorage, PersistedMobileSession } from './auth-session';

const sessionKey = 'local_missions.mobile_session.v1';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  keychainService: 'com.stratios.localmissions.session',
};

type SecureStoreBoundary = Pick<
  typeof SecureStore,
  'deleteItemAsync' | 'getItemAsync' | 'isAvailableAsync' | 'setItemAsync'
>;

function isPersistedSession(value: unknown): value is PersistedMobileSession {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<PersistedMobileSession>;
  const roles = record.roles ?? [];
  const workspaces = record.workspaces ?? [];
  const allowedRoles = new Set(['business_manager', 'business_owner', 'creator', 'venue_staff']);
  const workspaceRoleValid =
    record.workspaceRole === undefined ||
    ((record.workspaceRole === 'business_manager' || record.workspaceRole === 'business_owner') &&
      roles.includes(record.workspaceRole));
  const workspacesValid =
    Array.isArray(record.workspaces) &&
    workspaces.every(
      (workspace) =>
        workspace &&
        typeof workspace === 'object' &&
        typeof workspace.name === 'string' &&
        workspace.name.length > 0 &&
        workspace.name.length <= 200 &&
        /^biz_[a-z0-9_]{8,100}$/.test(workspace.publicId) &&
        (workspace.role === 'business_owner' || workspace.role === 'business_manager') &&
        roles.includes(workspace.role),
    ) &&
    new Set(workspaces.map((workspace) => workspace.publicId)).size === workspaces.length;
  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.publicId === record.workspacePublicId,
  );
  return (
    record.version === 1 &&
    ['active', 'deletion_requested', 'disabled'].includes(record.accountStatus ?? '') &&
    typeof record.expiresAt === 'string' &&
    Number.isFinite(Date.parse(record.expiresAt)) &&
    ['apple', 'google', 'microsoft', 'passwordless_email'].includes(record.provider ?? '') &&
    Array.isArray(record.roles) &&
    roles.length > 0 &&
    roles.every((role) => allowedRoles.has(role)) &&
    new Set(roles).size === roles.length &&
    ['business', 'creator', 'venue_staff'].includes(record.selectedMode ?? '') &&
    typeof record.sessionPublicId === 'string' &&
    /^ses_[a-z0-9_]{8,100}$/.test(record.sessionPublicId) &&
    typeof record.userPublicId === 'string' &&
    /^usr_[a-z0-9_]{8,100}$/.test(record.userPublicId) &&
    (record.refreshCredential === undefined ||
      /^[A-Za-z0-9._~-]{16,8000}$/.test(record.refreshCredential)) &&
    (record.workspacePublicId === undefined ||
      /^biz_[a-z0-9_]{8,100}$/.test(record.workspacePublicId)) &&
    workspaceRoleValid &&
    workspacesValid &&
    (record.workspacePublicId === undefined || selectedWorkspace?.role === record.workspaceRole)
  );
}

export function createWebPreviewSessionStorage(): MobileSessionStorage {
  return {
    kind: 'web-preview-memoryless',
    async clear() {},
    async load() {
      return null;
    },
    async save() {},
  };
}

export function createNativeSecureSessionStorage(
  boundary: SecureStoreBoundary = SecureStore,
): MobileSessionStorage {
  return {
    kind: 'native-secure-store',
    async clear() {
      await boundary.deleteItemAsync(sessionKey, secureStoreOptions);
    },
    async load() {
      if (!(await boundary.isAvailableAsync())) return null;
      const raw = await boundary.getItemAsync(sessionKey, secureStoreOptions);
      if (!raw) return null;
      try {
        const value: unknown = JSON.parse(raw);
        if (isPersistedSession(value)) return value;
      } catch {
        // Invalid or obsolete protected state is removed below.
      }
      await boundary.deleteItemAsync(sessionKey, secureStoreOptions);
      return null;
    },
    async save(session) {
      if (!(await boundary.isAvailableAsync())) {
        throw new Error('Protected session storage is unavailable on this device.');
      }
      await boundary.setItemAsync(sessionKey, JSON.stringify(session), secureStoreOptions);
    },
  };
}

export function createMobileSessionStorage(platform: 'native' | 'web'): MobileSessionStorage {
  return platform === 'web' ? createWebPreviewSessionStorage() : createNativeSecureSessionStorage();
}

export const mobileSessionStorageKeyForTests = sessionKey;
