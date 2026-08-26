import { Ionicons } from '../../components/DecorativeIcon';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import heroImage from '../../../../docs/business-plan/assets/local-missions-cover-hero.png';
import { appColors } from '../../components/AppShell';

const expectations = [
  'Capture the atmosphere and key experiences',
  'Show real interactions and highlight features',
  'Follow the exact content checklist',
] as const;

export default function CreatorMissionDetailsScreen() {
  const router = useRouter();
  const [consented, setConsented] = useState(false);

  const apply = () => {
    if (!consented) {
      Alert.alert('Review the mission first', 'Confirm the checklist and mission rules to apply.');
      return;
    }
    Alert.alert(
      'Application previewed',
      'No application was sent. Continue into the accepted demo to inspect the next workflow states.',
      [
        { text: 'Stay here', style: 'cancel' },
        { text: 'View accepted demo', onPress: () => router.push('/creator/accepted') },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.back}
            testID="creator-mission-details-back"
          >
            <Ionicons color={appColors.teal} name="chevron-back" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Mission details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <ImageBackground imageStyle={styles.image} source={heroImage} style={styles.hero} />
          <View style={styles.heroBody}>
            <View style={styles.communityBadge}>
              <Text style={styles.communityText}>COMMUNITY SLOT</Text>
            </View>
            <Text style={styles.business}>Demo Family Fun Center</Text>
            <Text style={styles.mission}>Family Adventure Preview</Text>
            <View style={styles.stats}>
              <View accessible accessibilityLabel="50 dollars guaranteed" style={styles.stat}>
                <Ionicons color={appColors.teal} name="cash-outline" size={23} />
                <Text style={styles.statStrong}>$50</Text>
                <Text style={styles.statLabel}>guaranteed</Text>
              </View>
              <View accessible accessibilityLabel="Wednesday, 2 to 4 PM" style={styles.stat}>
                <Ionicons color={appColors.orange} name="time-outline" size={23} />
                <Text style={styles.statStrong}>Wed</Text>
                <Text style={styles.statLabel}>2–4 PM</Text>
              </View>
              <View accessible accessibilityLabel="Orlando, 4 to 6 miles" style={styles.stat}>
                <Ionicons color={appColors.teal} name="location-outline" size={23} />
                <Text style={styles.statStrong}>Orlando</Text>
                <Text style={styles.statLabel}>4–6 miles</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Deliverables</Text>
          <View style={styles.deliverables}>
            <View accessible accessibilityLabel="2 vertical clips" style={styles.deliverable}>
              <Ionicons color={appColors.teal} name="videocam-outline" size={29} />
              <View>
                <Text style={styles.deliverableCount}>2</Text>
                <Text style={styles.cardBody}>vertical clips</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View accessible accessibilityLabel="5 original photos" style={styles.deliverable}>
              <Ionicons color={appColors.teal} name="images-outline" size={29} />
              <View>
                <Text style={styles.deliverableCount}>5</Text>
                <Text style={styles.cardBody}>original photos</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What to expect</Text>
          {expectations.map((item) => (
            <View accessible accessibilityLabel={item} key={item} style={styles.checkRow}>
              <Ionicons color="#159464" name="checkmark-circle" size={21} />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>

        <View
          accessible
          accessibilityLabel="90-day organic content use. Paid-ad use costs extra. Sponsorship disclosure is required."
          style={styles.rightsCard}
        >
          <Ionicons color={appColors.orange} name="document-lock-outline" size={32} />
          <View style={styles.rightsCopy}>
            <Text style={styles.rightsTitle}>90-day organic content use</Text>
            <Text style={styles.cardBody}>
              Paid-ad use costs extra. Sponsorship disclosure is required.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Accept mission deliverables, rules, and disclosure"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consented }}
          onPress={() => setConsented((value) => !value)}
          style={styles.consentRow}
          testID="creator-accept-mission-terms"
        >
          <View style={[styles.checkbox, consented && styles.checkboxChecked]}>
            {consented ? <Ionicons color="#ffffff" name="checkmark" size={18} /> : null}
          </View>
          <Text style={styles.consent}>I understand the deliverables, rules, and disclosure.</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Apply for Family Adventure Preview mission"
          accessibilityRole="button"
          accessibilityState={{ disabled: !consented }}
          onPress={apply}
          style={[styles.apply, !consented && styles.applyDisabled]}
          testID="creator-submit-application"
        >
          <Text style={styles.applyText}>Apply for mission</Text>
          <Ionicons color="#ffffff" name="arrow-forward" size={21} />
        </Pressable>
        <Text style={styles.footer}>
          No follower count required · Applying does not guarantee acceptance
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: appColors.canvas, flex: 1 },
  page: { padding: 18, paddingBottom: 42 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  back: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: { color: appColors.ink, fontSize: 19, fontWeight: '800' },
  headerSpacer: { width: 40 },
  heroCard: {
    backgroundColor: appColors.card,
    borderRadius: 22,
    marginTop: 18,
    overflow: 'hidden',
  },
  hero: { height: 195 },
  image: { opacity: 0.98 },
  heroBody: { padding: 16 },
  communityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: appColors.orange,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  communityText: { color: '#ffffff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  business: { color: appColors.ink, fontSize: 24, fontWeight: '900', marginTop: 11 },
  mission: { color: appColors.muted, fontSize: 15, fontWeight: '700', marginTop: 3 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  stat: { alignItems: 'center', flex: 1 },
  statStrong: { color: appColors.ink, fontSize: 15, fontWeight: '900', marginTop: 3 },
  statLabel: { color: appColors.muted, fontSize: 10, marginTop: 1 },
  card: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 13,
    padding: 16,
  },
  cardTitle: { color: appColors.teal, fontSize: 19, fontWeight: '900' },
  cardBody: { color: appColors.muted, fontSize: 12, lineHeight: 18 },
  deliverables: { alignItems: 'center', flexDirection: 'row', marginTop: 13 },
  deliverable: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 10 },
  deliverableCount: { color: appColors.ink, fontSize: 23, fontWeight: '900' },
  divider: { backgroundColor: appColors.line, height: 54, width: 1 },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 12 },
  checkText: { color: appColors.ink, flex: 1, fontSize: 13, lineHeight: 18 },
  rightsCard: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderColor: '#f1c6a7',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    marginTop: 13,
    padding: 15,
  },
  rightsCopy: { flex: 1 },
  rightsTitle: { color: appColors.ink, fontSize: 15, fontWeight: '900', marginBottom: 3 },
  consentRow: { alignItems: 'center', flexDirection: 'row', gap: 11, marginTop: 18 },
  checkbox: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.teal,
    borderRadius: 6,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  checkboxChecked: { backgroundColor: appColors.teal },
  consent: { color: appColors.ink, flex: 1, fontSize: 13, lineHeight: 18 },
  apply: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 17,
    padding: 18,
  },
  applyDisabled: { opacity: 0.55 },
  applyText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  footer: {
    color: appColors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 11,
    textAlign: 'center',
  },
});
