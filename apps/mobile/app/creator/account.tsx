import { Ionicons } from '../../components/DecorativeIcon';
import { Link, type Href, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { AppShell, appColors } from '../../components/AppShell';
import { useMobileAuthSession } from '../../lib/auth-session-context';
import { useAccountOverview } from '../../lib/use-account-data';

const providerPresentation = {
  apple: { icon: 'logo-apple', label: 'Apple' },
  google: { icon: 'logo-google', label: 'Google' },
  microsoft: { icon: 'logo-windows', label: 'Microsoft' },
  passwordless_email: { icon: 'mail-outline', label: 'Passwordless email' },
} as const;

const accountItems: Array<{
  detail: string;
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  status: string;
  testID: string;
  title: string;
}> = [
  {
    detail: 'Annual area verification · no street address shared',
    href: '/creator/locality',
    icon: 'location-outline',
    status: 'VERIFIED',
    testID: 'creator-account-locality',
    title: 'Locality verification',
  },
  {
    detail: 'Future Stripe-hosted setup · no bank details in this app',
    href: '/creator/payout',
    icon: 'wallet-outline',
    status: 'NOT CONNECTED',
    testID: 'creator-account-payout',
    title: 'Payout setup',
  },
  {
    detail: 'Optional per-platform tiers · Community access never depends on this',
    href: '/creator/reach',
    icon: 'megaphone-outline',
    status: 'OPTIONAL',
    testID: 'creator-account-reach',
    title: 'Reach analytics',
  },
  {
    detail: 'Mission terms, privacy notices, and optional permissions',
    href: '/creator/consent',
    icon: 'document-text-outline',
    status: 'CURRENT',
    testID: 'creator-account-consent',
    title: 'Consent history',
  },
  {
    detail: 'Mission, payment, accessibility, and account help',
    href: '/creator/support',
    icon: 'help-buoy-outline',
    status: 'AVAILABLE',
    testID: 'creator-account-support',
    title: 'Support',
  },
  {
    detail: 'Export and deletion-request preview with retained-record notice',
    href: '/creator/delete-account',
    icon: 'trash-outline',
    status: 'REVIEW',
    testID: 'creator-account-deletion',
    title: 'Account deletion',
  },
];

export default function CreatorAccountScreen() {
  const { data, source } = useAccountOverview();
  const auth = useMobileAuthSession();
  const router = useRouter();
  const recentIdentityAuth = auth.hasRecentAuth('identity_link');

  const signOut = async () => {
    const result = await auth.signOut();
    if (result.warning) Alert.alert('Signed out on this device', result.warning);
    router.replace('/');
  };

  return (
    <AppShell mode="creator" showTabs title="Account & safety">
      <View style={styles.profileCard}>
        <View
          accessibilityElementsHidden
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>J</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>Jordan L.</Text>
          <Text style={styles.profileMeta}>Creator profile · Orlando-area verified</Text>
        </View>
        <View style={styles.demoBadge}>
          <Text style={styles.demoText}>{source === 'api' ? 'LIVE' : 'DEMO'}</Text>
        </View>
      </View>

      <View style={styles.roleCard}>
        <Ionicons color={appColors.teal} name="people-circle-outline" size={25} />
        <View style={styles.roleCopy}>
          <Text style={styles.roleTitle}>One identity, separate roles</Text>
          <Text style={styles.roleText}>
            Creator data stays scoped to Creator mode. Deleting this profile would not silently
            delete an active Business role.
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionTitle}>Sign-in & sessions</Text>
        <Text style={styles.sourceText}>
          {source === 'api' ? 'AUTHENTICATED' : 'LOCAL PREVIEW'}
        </Text>
      </View>
      <View style={styles.identityCard}>
        {data.identities.map((identity) => {
          const provider = providerPresentation[identity.provider];
          return (
            <View key={identity.provider} style={styles.identityRow}>
              <View style={styles.providerIcon}>
                <Ionicons color={appColors.teal} name={provider.icon} size={22} />
              </View>
              <View style={styles.identityCopy}>
                <Text style={styles.identityTitle}>{provider.label}</Text>
                <Text style={styles.identityDetail}>Verified sign-in method</Text>
              </View>
              <View style={styles.connectedBadge}>
                <Ionicons color="#159464" name="checkmark-circle" size={14} />
                <Text style={styles.connectedText}>CONNECTED</Text>
              </View>
            </View>
          );
        })}
        <View style={styles.sessionRow}>
          <View style={styles.sessionIcon}>
            <Ionicons color={appColors.orange} name="phone-portrait-outline" size={22} />
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.identityTitle}>
              {data.sessions.length} active {data.sessions.length === 1 ? 'session' : 'sessions'}
            </Text>
            <Text style={styles.identityDetail}>
              {data.sessions[0]
                ? `Signed in with ${providerPresentation[data.sessions[0].provider].label}`
                : 'No active device sessions'}
            </Text>
          </View>
          <Text style={styles.secureText}>SECURE</Text>
        </View>
      </View>
      <View style={styles.recentAuthCard}>
        <View style={styles.recentAuthCopy}>
          <Text style={styles.recentAuthTitle}>Recent sign-in for sensitive changes</Text>
          <Text style={styles.recentAuthDetail}>
            {recentIdentityAuth
              ? 'Preview proof is fresh for five minutes · never stored'
              : 'Required before adding/removing sign-in methods or deleting the account'}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Preview recent sign-in state"
          accessibilityRole="button"
          disabled={source === 'api' || recentIdentityAuth}
          onPress={() => auth.previewRecentAuth('identity_link')}
          style={[styles.recentAuthButton, recentIdentityAuth && styles.recentAuthButtonDone]}
          testID="creator-preview-recent-auth"
        >
          <Text style={styles.recentAuthButtonText}>
            {recentIdentityAuth ? 'FRESH' : source === 'api' ? 'PROVIDER' : 'PREVIEW'}
          </Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityLabel="Add another sign-in method"
        accessibilityRole="button"
        disabled={source === 'local-preview'}
        style={[styles.addMethodButton, source === 'local-preview' && styles.previewButton]}
        testID="creator-add-sign-in-method"
      >
        <Ionicons color={appColors.teal} name="add-circle-outline" size={20} />
        <View style={styles.addMethodCopy}>
          <Text style={styles.addMethodTitle}>Add another sign-in method</Text>
          <Text style={styles.addMethodDetail}>
            {source === 'local-preview'
              ? 'Preview only · provider setup stays disconnected'
              : 'Requires recent authentication'}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel="Sign out this session"
        accessibilityRole="button"
        disabled={data.sessions.length === 0}
        onPress={() => void signOut()}
        style={[styles.sessionActionButton, data.sessions.length === 0 && styles.previewButton]}
        testID="creator-sign-out-session"
      >
        <Ionicons color={appColors.orange} name="log-out-outline" size={20} />
        <View style={styles.addMethodCopy}>
          <Text style={styles.addMethodTitle}>Sign out this session</Text>
          <Text style={styles.addMethodDetail}>
            {source === 'local-preview'
              ? 'Clears this memory-only preview · no provider is contacted'
              : 'Clears protected account data after server revocation'}
          </Text>
        </View>
      </Pressable>

      {data.sensitiveHoldActive ? (
        <View style={styles.holdCard}>
          <Ionicons color={appColors.orange} name="lock-closed-outline" size={24} />
          <Text style={styles.holdText}>
            Sensitive money and identity changes are temporarily paused for account recovery.
          </Text>
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, styles.settingsTitle]}>Creator settings</Text>
      <View style={styles.listCard}>
        {accountItems.map((item) => (
          <Link key={item.title} asChild href={item.href}>
            <Pressable
              accessibilityLabel={`Open ${item.title}`}
              accessibilityRole="button"
              style={styles.itemRow}
              testID={item.testID}
            >
              <View style={styles.itemIcon}>
                <Ionicons color={appColors.teal} name={item.icon} size={23} />
              </View>
              <View style={styles.itemCopy}>
                <View style={styles.itemTitleRow}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemStatus}>{item.status}</Text>
                </View>
                <Text style={styles.itemDetail}>{item.detail}</Text>
              </View>
              <Ionicons color={appColors.muted} name="chevron-forward" size={19} />
            </Pressable>
          </Link>
        ))}
      </View>

      <View style={styles.securityCard}>
        <Ionicons color="#159464" name="shield-checkmark-outline" size={28} />
        <View style={styles.securityCopy}>
          <Text style={styles.securityTitle}>Money and identity changes are protected</Text>
          <Text style={styles.securityText}>
            Production changes require recent sign-in. Removing the last sign-in method or changing
            payout details cannot happen silently.
          </Text>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 14,
    padding: 15,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  profileCopy: { flex: 1 },
  name: { color: appColors.ink, fontSize: 19, fontWeight: '900' },
  profileMeta: { color: appColors.muted, fontSize: 10, marginTop: 4 },
  demoBadge: { backgroundColor: appColors.tealSoft, borderRadius: 12, padding: 7 },
  demoText: { color: appColors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  roleCard: {
    alignItems: 'flex-start',
    backgroundColor: appColors.tealSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    padding: 14,
  },
  roleCopy: { flex: 1 },
  roleTitle: { color: appColors.ink, fontSize: 14, fontWeight: '900' },
  roleText: { color: appColors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionHeadingRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  sectionTitle: { color: appColors.ink, fontSize: 20, fontWeight: '900' },
  sourceText: { color: appColors.teal, fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  identityCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  identityRow: {
    alignItems: 'center',
    borderBottomColor: appColors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 66,
    padding: 12,
  },
  providerIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  identityCopy: { flex: 1 },
  identityTitle: { color: appColors.ink, fontSize: 13, fontWeight: '900' },
  identityDetail: { color: appColors.muted, fontSize: 9, marginTop: 3 },
  connectedBadge: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  connectedText: { color: '#159464', fontSize: 7, fontWeight: '900', letterSpacing: 0.3 },
  sessionRow: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 66, padding: 12 },
  sessionIcon: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  secureText: { color: appColors.orange, fontSize: 7, fontWeight: '900', letterSpacing: 0.4 },
  addMethodButton: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    marginTop: 10,
    padding: 12,
  },
  sessionActionButton: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    marginTop: 8,
    padding: 12,
  },
  recentAuthCard: {
    alignItems: 'center',
    backgroundColor: appColors.warningSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    padding: 11,
  },
  recentAuthCopy: { flex: 1 },
  recentAuthTitle: { color: appColors.ink, fontSize: 10, fontWeight: '900' },
  recentAuthDetail: { color: appColors.muted, fontSize: 8, lineHeight: 12, marginTop: 2 },
  recentAuthButton: {
    backgroundColor: appColors.card,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  recentAuthButtonDone: { backgroundColor: appColors.successSoft },
  recentAuthButtonText: { color: appColors.ink, fontSize: 8, fontWeight: '900' },
  previewButton: { opacity: 0.82 },
  addMethodCopy: { flex: 1 },
  addMethodTitle: { color: appColors.ink, fontSize: 12, fontWeight: '900' },
  addMethodDetail: { color: appColors.muted, fontSize: 8, marginTop: 2 },
  holdCard: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    padding: 12,
  },
  holdText: { color: '#805238', flex: 1, fontSize: 9, lineHeight: 14 },
  settingsTitle: { marginTop: 20 },
  listCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  itemRow: {
    alignItems: 'center',
    borderBottomColor: appColors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 83,
    padding: 12,
  },
  itemIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  itemCopy: { flex: 1 },
  itemTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  itemTitle: { color: appColors.ink, flex: 1, fontSize: 14, fontWeight: '900' },
  itemStatus: { color: appColors.teal, fontSize: 7, fontWeight: '900', letterSpacing: 0.4 },
  itemDetail: { color: appColors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  securityCard: {
    alignItems: 'flex-start',
    backgroundColor: '#e9f7ef',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    marginTop: 13,
    padding: 14,
  },
  securityCopy: { flex: 1 },
  securityTitle: { color: '#116b49', fontSize: 13, fontWeight: '900' },
  securityText: { color: '#477261', fontSize: 9, lineHeight: 14, marginTop: 3 },
});
