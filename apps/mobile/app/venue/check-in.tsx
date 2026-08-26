import { Ionicons } from '../../components/DecorativeIcon';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { AppShell, appColors } from '../../components/AppShell';

const restrictedFields = [
  'Creator earnings or payout state',
  'Follower totals or private analytics',
  'Home address, ZIP, or locality proof',
  'Business billing or campaign budget',
  'Admin, support, or dispute controls',
] as const;

export default function VenueCheckInScreen() {
  const [checkedIn, setCheckedIn] = useState(false);

  return (
    <AppShell mode="venue staff" title="Confirm arrival">
      <View style={styles.restrictedBadge}>
        <Ionicons color={appColors.teal} name="lock-closed" size={17} />
        <Text style={styles.restrictedText}>AUTHORIZED VENUE STAFF · DEMO ONLY</Text>
      </View>
      <Text style={styles.intro}>
        Confirm only the assigned visit and included experience. This mode cannot review content,
        approve work, or control money.
      </Text>

      <View style={styles.venueCard}>
        <View style={styles.venueIcon}>
          <Ionicons color={appColors.orange} name="storefront-outline" size={27} />
        </View>
        <View style={styles.venueCopy}>
          <Text style={styles.eyebrow}>ASSIGNED LOCATION</Text>
          <Text style={styles.venueTitle}>Demo Family Fun Center</Text>
          <Text style={styles.venueMeta}>Orlando venue · Wed, Aug 28 · 2:00–4:00 PM</Text>
        </View>
      </View>

      <View style={styles.scanCard}>
        <View style={[styles.scanIcon, checkedIn && styles.scanIconDone]}>
          <Ionicons color="#ffffff" name={checkedIn ? 'checkmark' : 'qr-code-outline'} size={43} />
        </View>
        <Text style={styles.scanTitle}>
          {checkedIn ? 'Arrival confirmed' : 'Synthetic Creator pass scanned'}
        </Text>
        <Text style={styles.scanBody}>
          {checkedIn
            ? 'The local preview reached its terminal staff check-in state.'
            : 'Token DEMO-8K2 is valid for this location and mission window.'}
        </Text>
      </View>

      <View style={styles.creatorCard}>
        <View
          accessibilityElementsHidden
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>J</Text>
        </View>
        <View style={styles.creatorCopy}>
          <Text style={styles.eyebrow}>COMMUNITY SLOT 1</Text>
          <Text style={styles.creatorName}>Jordan L.</Text>
          <Text style={styles.creatorMeta}>Family Adventure Preview</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{checkedIn ? 'CHECKED IN' : 'EXPECTED'}</Text>
        </View>
      </View>

      <View style={styles.inclusionCard}>
        <Text style={styles.cardTitle}>Confirm the included experience</Text>
        {[
          'One Creator admission',
          'One standard meal up to $25 value',
          'Visit window ends at 4:00 PM',
        ].map((item) => (
          <View key={item} style={styles.checkRow}>
            <Ionicons color="#159464" name="checkmark-circle-outline" size={21} />
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
        <View style={styles.noteCard}>
          <Ionicons color={appColors.orange} name="information-circle-outline" size={20} />
          <Text style={styles.noteText}>
            Do not ask for a positive review, extra deliverables, a public post, or payment from the
            Creator.
          </Text>
        </View>
      </View>

      <View style={styles.privacyCard}>
        <Text style={styles.cardTitle}>Hidden from Venue Staff</Text>
        {restrictedFields.map((item) => (
          <View key={item} style={styles.hiddenRow}>
            <Ionicons color={appColors.muted} name="remove-circle-outline" size={18} />
            <Text style={styles.hiddenText}>{item}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityLabel={
          checkedIn
            ? 'Creator arrival confirmed in local preview'
            : 'Confirm synthetic Creator arrival'
        }
        accessibilityRole="button"
        disabled={checkedIn}
        onPress={() => setCheckedIn(true)}
        style={[styles.primaryButton, checkedIn && styles.primaryButtonDone]}
        testID="venue-confirm-creator-arrival"
      >
        <Text style={styles.primaryText}>
          {checkedIn ? 'Demo arrival confirmed' : 'Confirm arrival & inclusion'}
        </Text>
        <Ionicons color="#ffffff" name={checkedIn ? 'checkmark' : 'arrow-forward'} size={21} />
      </Pressable>
      <Text style={styles.footer}>
        No check-in event, location record, message, mission state, or payment action is created.
      </Text>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  restrictedBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: appColors.tealSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  restrictedText: { color: appColors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  intro: { color: appColors.muted, fontSize: 13, lineHeight: 19, marginTop: 11 },
  venueCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 14,
  },
  venueIcon: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  venueCopy: { flex: 1 },
  eyebrow: { color: appColors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  venueTitle: { color: appColors.ink, fontSize: 16, fontWeight: '900', marginTop: 2 },
  venueMeta: { color: appColors.muted, fontSize: 9, marginTop: 3 },
  scanCard: {
    alignItems: 'center',
    backgroundColor: appColors.ink,
    borderRadius: 20,
    marginTop: 12,
    padding: 18,
  },
  scanIcon: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 31,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  scanIconDone: { backgroundColor: '#159464' },
  scanTitle: { color: '#ffffff', fontSize: 17, fontWeight: '900', marginTop: 10 },
  scanBody: { color: '#c8d4df', fontSize: 10, lineHeight: 15, marginTop: 4, textAlign: 'center' },
  creatorCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    padding: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  creatorCopy: { flex: 1 },
  creatorName: { color: appColors.ink, fontSize: 16, fontWeight: '900', marginTop: 2 },
  creatorMeta: { color: appColors.muted, fontSize: 9, marginTop: 3 },
  statusBadge: { backgroundColor: appColors.tealSoft, borderRadius: 12, padding: 7 },
  statusText: { color: appColors.teal, fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  inclusionCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  cardTitle: { color: appColors.ink, fontSize: 17, fontWeight: '900' },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  checkText: { color: appColors.ink, fontSize: 11, fontWeight: '700' },
  noteCard: {
    alignItems: 'flex-start',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 7,
    marginTop: 12,
    padding: 11,
  },
  noteText: { color: '#805238', flex: 1, fontSize: 9, lineHeight: 14 },
  privacyCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  hiddenRow: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 8 },
  hiddenText: { color: appColors.muted, fontSize: 10 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 14,
    padding: 16,
  },
  primaryButtonDone: { backgroundColor: '#159464' },
  primaryText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  footer: {
    color: appColors.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 9,
    textAlign: 'center',
  },
});
