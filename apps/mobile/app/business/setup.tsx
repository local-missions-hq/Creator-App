import { Ionicons } from '../../components/DecorativeIcon';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { SetupShell, setupColors } from '../../components/SetupShell';

const accent = '#cf3f1f';

export default function BusinessSetupScreen() {
  const router = useRouter();
  const { fontScale, width } = useWindowDimensions();
  const useExpandedLayout = width < 390 || fontScale > 1.4;
  const previewOnly = () =>
    Alert.alert('Local preview only', 'Business verification and payments are not connected.');

  return (
    <SetupShell accent={accent} eyebrow="Step 1 of 4" stepCount={4} title="Set up your business">
      <Text style={styles.intro}>
        Tell us about your business so local creators can find and visit you.
      </Text>

      <View
        accessible
        accessibilityLabel="Why we verify. Real business and location checks protect creators and make check-in trustworthy."
        style={[styles.verifyCard, useExpandedLayout && styles.verifyCardExpanded]}
      >
        <View style={styles.verifyIcon}>
          <Ionicons color="#007c83" name="shield-checkmark-outline" size={32} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.cardTitle}>Why we verify</Text>
          <Text style={styles.cardBody}>
            Real business and location checks protect creators and make check-in trustworthy.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business details</Text>
        <Text style={styles.fieldLabel}>Business name</Text>
        <Pressable
          accessibilityLabel="Edit business name. Current value: Demo Family Fun Center"
          accessibilityRole="button"
          onPress={previewOnly}
          style={styles.field}
          testID="business-setup-name"
        >
          <Text style={styles.fieldText}>Demo Family Fun Center</Text>
        </Pressable>
        <Text style={styles.fieldLabel}>Business category</Text>
        <Pressable
          accessibilityLabel="Edit business category. Current value: Family entertainment"
          accessibilityRole="button"
          onPress={previewOnly}
          style={styles.field}
          testID="business-setup-category"
        >
          <Text style={styles.fieldText}>Family entertainment</Text>
          <Ionicons color={setupColors.muted} name="chevron-down" size={19} />
        </Pressable>
        <Text style={styles.fieldLabel}>Primary website</Text>
        <Pressable
          accessibilityLabel="Edit primary website. Current value: demo.example"
          accessibilityRole="button"
          onPress={previewOnly}
          style={styles.field}
          testID="business-setup-website"
        >
          <Text style={styles.fieldText}>demo.example</Text>
        </Pressable>
      </View>

      <View
        accessible
        accessibilityLabel="Business location. Orlando. 100 Demo Way, Orlando, Florida."
        style={styles.locationCard}
      >
        <View style={styles.mapPlaceholder}>
          <Ionicons color="#007c83" name="location" size={38} />
          <Text style={styles.mapTitle}>Orlando</Text>
        </View>
        <View style={styles.locationRow}>
          <Ionicons color="#007c83" name="location-outline" size={20} />
          <Text style={styles.cardBody}>100 Demo Way, Orlando, FL</Text>
        </View>
      </View>

      <View style={styles.checklist}>
        <Text style={styles.sectionTitle}>Verification checklist</Text>
        <View
          accessible
          accessibilityLabel="Business contact verified. Your contact email is verified."
          style={styles.checkRow}
        >
          <Ionicons color="#159464" name="checkmark-circle" size={25} />
          <View>
            <Text style={styles.checkTitle}>Business contact verified</Text>
            <Text style={styles.cardBody}>Your contact email is verified.</Text>
          </View>
        </View>
        <View
          accessible
          accessibilityLabel="Location pending. We still need to verify this location."
          style={styles.checkRow}
        >
          <Ionicons color="#e28100" name="time" size={25} />
          <View>
            <Text style={styles.checkTitle}>Location pending</Text>
            <Text style={styles.cardBody}>We still need to verify this location.</Text>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Continue to business verification preview"
        accessibilityRole="button"
        onPress={() => router.push('/business/dashboard')}
        style={styles.continueButton}
        testID="business-setup-continue"
      >
        <Text style={styles.continueText}>Continue to verification</Text>
        <Ionicons color="#ffffff" name="arrow-forward" size={22} />
      </Pressable>
      <Text style={styles.footer}>Synthetic setup data · No payment method collected</Text>
    </SetupShell>
  );
}

const styles = StyleSheet.create({
  intro: { color: setupColors.muted, fontSize: 15, lineHeight: 22, marginTop: 9 },
  verifyCard: {
    alignItems: 'center',
    backgroundColor: setupColors.successSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 13,
    marginTop: 20,
    padding: 15,
  },
  verifyCardExpanded: { alignItems: 'flex-start', flexDirection: 'column' },
  verifyIcon: {
    alignItems: 'center',
    backgroundColor: setupColors.card,
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  copy: { flex: 1 },
  cardTitle: { color: setupColors.ink, fontSize: 18, fontWeight: '800' },
  cardBody: { color: setupColors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  section: {
    backgroundColor: setupColors.card,
    borderColor: setupColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  sectionTitle: { color: setupColors.ink, fontSize: 18, fontWeight: '800' },
  fieldLabel: {
    color: setupColors.ink,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 14,
  },
  field: {
    alignItems: 'center',
    borderColor: setupColors.line,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 13,
  },
  fieldText: { color: setupColors.ink, fontSize: 15 },
  locationCard: {
    backgroundColor: setupColors.card,
    borderColor: setupColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    alignItems: 'center',
    backgroundColor: setupColors.tealSoft,
    height: 122,
    justifyContent: 'center',
  },
  mapTitle: { color: setupColors.ink, fontSize: 22, fontWeight: '800' },
  locationRow: { alignItems: 'center', flexDirection: 'row', gap: 8, padding: 14 },
  checklist: {
    backgroundColor: setupColors.card,
    borderColor: setupColors.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 15,
    marginTop: 14,
    padding: 16,
  },
  checkRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  checkTitle: { color: setupColors.ink, fontSize: 14, fontWeight: '800' },
  continueButton: {
    alignItems: 'center',
    backgroundColor: accent,
    borderRadius: 17,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 9,
    marginTop: 16,
    padding: 18,
  },
  continueText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  footer: { color: setupColors.muted, fontSize: 11, marginTop: 14, textAlign: 'center' },
});
