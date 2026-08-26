import { Ionicons } from '../../components/DecorativeIcon';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { CreatorMissionShell } from '../../components/CreatorMissionShell';

const checklist = [
  'Arrive during the 2:00–4:00 PM mission window',
  'Scan the rotating venue QR or use the staff-code fallback',
  'Capture 2 distinct vertical clips, each 5–15 seconds',
  'Capture 5 original photos with at least one venue-wide image',
  'Upload original files by 8:00 PM the same day',
] as const;

export default function CreatorInstructionsScreen() {
  return (
    <CreatorMissionShell badge="FUNDED · $50" title="Mission instructions">
      <View style={styles.headerCard}>
        <Text style={styles.eyebrow}>FAMILY ADVENTURE PREVIEW</Text>
        <Text style={styles.business}>Demo Family Fun Center</Text>
        <View style={styles.metaRow}>
          <Ionicons color={appColors.teal} name="calendar-outline" size={18} />
          <Text style={styles.meta}>Wed, Aug 28 · 2:00–4:00 PM</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons color={appColors.teal} name="navigate-outline" size={18} />
          <Text style={styles.meta}>4–6 miles · exact venue shown after acceptance</Text>
        </View>
      </View>

      <View style={styles.includedCard}>
        <Ionicons color={appColors.orange} name="restaurant-outline" size={26} />
        <View style={styles.includedCopy}>
          <Text style={styles.cardTitle}>Included experience</Text>
          <Text style={styles.cardBody}>
            One Creator admission and one standard meal up to $25 value.
          </Text>
        </View>
      </View>

      <View style={styles.checklistCard}>
        <Text style={styles.cardTitle}>Your objective checklist</Text>
        {checklist.map((item, index) => (
          <View key={item} style={styles.checkRow}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.rulesCard}>
        <Text style={styles.cardTitle}>Content and rights</Text>
        {[
          'No public post or positive review is required',
          'Business receives 90-day owned-organic-social use',
          'Paid ads, website, or email use require extra pay',
          'You keep ownership of the original content',
          'One objective correction round is included',
        ].map((item) => (
          <View key={item} style={styles.ruleRow}>
            <Ionicons color="#159464" name="checkmark-circle-outline" size={19} />
            <Text style={styles.ruleText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.privacyCard}>
        <Ionicons color={appColors.teal} name="location-outline" size={24} />
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>Location only during check-in</Text>
          <Text style={styles.privacyText}>
            The prototype requests no permission. The planned app evaluates location only when you
            start check-in during the mission window—not continuously.
          </Text>
        </View>
      </View>

      <Link asChild href="/creator/check-in">
        <Pressable
          accessibilityLabel="Continue from mission instructions to demo check in"
          accessibilityRole="button"
          style={styles.primaryButton}
          testID="creator-instructions-continue"
        >
          <Text style={styles.primaryText}>I understand · open check-in</Text>
          <Ionicons color="#ffffff" name="arrow-forward" size={20} />
        </Pressable>
      </Link>
      <Text style={styles.footer}>
        Need help? Contact support before the mission window closes.
      </Text>
    </CreatorMissionShell>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 17,
    padding: 15,
  },
  eyebrow: { color: appColors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  business: { color: appColors.ink, fontSize: 19, fontWeight: '900', marginTop: 3 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 10 },
  meta: { color: appColors.muted, flex: 1, fontSize: 10 },
  includedCard: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    padding: 14,
  },
  includedCopy: { flex: 1 },
  cardTitle: { color: appColors.ink, fontSize: 16, fontWeight: '900' },
  cardBody: { color: appColors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  checklistCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 11 },
  number: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  numberText: { color: appColors.teal, fontSize: 11, fontWeight: '900' },
  checkText: { color: appColors.ink, flex: 1, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  rulesCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  ruleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 9 },
  ruleText: { color: appColors.ink, flex: 1, fontSize: 10 },
  privacyCard: {
    alignItems: 'flex-start',
    backgroundColor: appColors.tealSoft,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 13,
  },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: appColors.ink, fontSize: 13, fontWeight: '900' },
  privacyText: { color: appColors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
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
  primaryText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  footer: { color: appColors.muted, fontSize: 9, marginTop: 9, textAlign: 'center' },
});
