import { Ionicons } from '../../components/DecorativeIcon';
import { Link } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { BusinessWizardShell } from '../../components/BusinessWizardShell';

const deliverables = [
  {
    icon: 'videocam-outline',
    label: '2 short vertical clips',
    meta: '5–15 sec each · 9:16 · at least 1080p',
  },
  {
    icon: 'images-outline',
    label: '5 original photos',
    meta: 'Readable files · ordinary current iPhone is enough',
  },
] as const;

const rules = [
  { icon: 'refresh-outline', label: 'At most one objective correction' },
  { icon: 'thumbs-up-outline', label: 'No positive review required' },
  { icon: 'person-outline', label: 'Creator keeps ownership' },
] as const;

export default function BusinessDeliverablesRightsScreen() {
  const { fontScale, width } = useWindowDimensions();
  const useExpandedLayout = width < 390 || fontScale > 1.4;

  return (
    <BusinessWizardShell step={2} title="Deliverables & rights">
      <Text style={styles.intro}>
        Lock the exact work and usage term so every Creator sees the same checklist.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Visit & Create checklist</Text>
        <View style={styles.noPostBadge}>
          <Ionicons color={appColors.teal} name="shield-checkmark-outline" size={17} />
          <Text style={styles.noPostText}>NO PUBLIC POST REQUIRED</Text>
        </View>
        {deliverables.map((item) => (
          <View
            accessible
            accessibilityLabel={`${item.label}. ${item.meta}. Included.`}
            key={item.label}
            style={styles.deliverableRow}
          >
            <View style={styles.deliverableIcon}>
              <Ionicons color={appColors.teal} name={item.icon} size={25} />
            </View>
            <View style={styles.deliverableCopy}>
              <Text style={styles.deliverableLabel}>{item.label}</Text>
              <Text style={styles.deliverableMeta}>{item.meta}</Text>
            </View>
            <Ionicons color="#159464" name="checkmark-circle" size={21} />
          </View>
        ))}
      </View>

      <View style={styles.rightsCard}>
        <View style={styles.rightsHeader}>
          <Ionicons color={appColors.orange} name="document-lock-outline" size={25} />
          <Text style={styles.rightsTitle}>Base content rights</Text>
        </View>
        <View
          accessible
          accessibilityLabel="Business usage term: 90 days."
          style={[styles.termRow, useExpandedLayout && styles.termRowExpanded]}
        >
          <Text style={styles.termLabel}>Business usage term</Text>
          <Text style={styles.termValue}>90 days</Text>
        </View>
        <View
          accessible
          accessibilityLabel="Permitted channels: Owned organic social."
          style={[styles.termRow, useExpandedLayout && styles.termRowExpanded]}
        >
          <Text style={styles.termLabel}>Permitted channels</Text>
          <Text style={styles.termValue}>Owned organic social</Text>
        </View>
        <View
          accessible
          accessibilityLabel="Paid advertising: Not included."
          style={[styles.termRow, useExpandedLayout && styles.termRowExpanded]}
        >
          <Text style={styles.termLabel}>Paid advertising</Text>
          <Text style={styles.termValue}>Not included</Text>
        </View>
        <Text style={styles.rightsNote}>
          Website/email use or paid ads require a separately priced creator bonus and fresh consent.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Creator protections</Text>
        {rules.map((rule) => (
          <View key={rule.label} style={styles.ruleRow}>
            <Ionicons color={appColors.teal} name={rule.icon} size={21} />
            <Text style={styles.ruleText}>{rule.label}</Text>
          </View>
        ))}
        <View style={styles.disclosureRow}>
          <Ionicons color={appColors.orange} name="megaphone-outline" size={21} />
          <Text style={styles.disclosureText}>
            If a separate posting add-on is selected, clear sponsorship disclosure becomes required.
          </Text>
        </View>
      </View>

      <Link asChild href="/business/budget">
        <Pressable
          accessibilityLabel="Continue to mission budget"
          accessibilityRole="button"
          style={styles.continueButton}
          testID="business-continue-budget"
        >
          <Text style={styles.continueText}>Continue to budget</Text>
          <Ionicons color="#ffffff" name="arrow-forward" size={21} />
        </Pressable>
      </Link>
    </BusinessWizardShell>
  );
}

const styles = StyleSheet.create({
  intro: { color: appColors.muted, fontSize: 13, lineHeight: 19, marginTop: 17 },
  card: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  cardTitle: { color: appColors.ink, fontSize: 18, fontWeight: '900' },
  noPostBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: appColors.tealSoft,
    borderRadius: 13,
    flexDirection: 'row',
    gap: 5,
    marginTop: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  noPostText: { color: appColors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  deliverableRow: {
    alignItems: 'center',
    borderTopColor: appColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
  },
  deliverableIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  deliverableCopy: { flex: 1 },
  deliverableLabel: { color: appColors.ink, fontSize: 14, fontWeight: '900' },
  deliverableMeta: { color: appColors.muted, fontSize: 9, lineHeight: 13, marginTop: 3 },
  rightsCard: {
    backgroundColor: appColors.orangeSoft,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  rightsHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  rightsTitle: { color: appColors.ink, fontSize: 18, fontWeight: '900' },
  termRow: {
    borderTopColor: appColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
    paddingTop: 10,
  },
  termRowExpanded: { flexDirection: 'column', gap: 4 },
  termLabel: { color: appColors.muted, fontSize: 11 },
  termValue: { color: appColors.ink, fontSize: 11, fontWeight: '900' },
  rightsNote: { color: appColors.warning, fontSize: 10, lineHeight: 15, marginTop: 11 },
  ruleRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 12 },
  ruleText: { color: appColors.ink, fontSize: 12, fontWeight: '700' },
  disclosureRow: {
    alignItems: 'flex-start',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 13,
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
    padding: 11,
  },
  disclosureText: { color: appColors.warning, flex: 1, fontSize: 10, lineHeight: 15 },
  continueButton: {
    alignItems: 'center',
    backgroundColor: appColors.orange,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 15,
    padding: 17,
  },
  continueText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});
