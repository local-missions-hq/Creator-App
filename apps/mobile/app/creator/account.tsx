import { Ionicons } from '../../components/DecorativeIcon';
import { Link, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { AppShell, appColors } from '../../components/AppShell';

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
          <Text style={styles.demoText}>DEMO</Text>
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

      <Text style={styles.sectionTitle}>Creator settings</Text>
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
  sectionTitle: { color: appColors.ink, fontSize: 20, fontWeight: '900', marginTop: 20 },
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
