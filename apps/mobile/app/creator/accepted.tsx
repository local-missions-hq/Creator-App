import { Ionicons } from '../../components/DecorativeIcon';
import { Link } from 'expo-router';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import heroImage from '../../../../docs/business-plan/assets/local-missions-cover-hero.png';
import { AppShell, appColors } from '../../components/AppShell';

const stages = [
  { active: true, done: true, label: 'Applied' },
  { active: true, done: false, label: 'Accepted' },
  { active: false, done: false, label: 'Check in' },
  { active: false, done: false, label: 'Submit' },
  { active: false, done: false, label: 'Paid' },
] as const;

const preparations = [
  { icon: 'document-text-outline', label: 'Review the mission brief' },
  { icon: 'camera-outline', label: 'Charge your iPhone' },
  { icon: 'id-card-outline', label: 'Bring photo ID for venue staff' },
] as const;

export default function CreatorAcceptedScreen() {
  const { fontScale, width } = useWindowDimensions();
  const useExpandedLayout = width < 390 || fontScale > 1.4;

  return (
    <AppShell mode="creator" title="You’re in!">
      <Text style={styles.subtitle}>Your demo application has been accepted.</Text>

      <View style={[styles.missionCard, useExpandedLayout && styles.missionCardExpanded]}>
        <Image
          source={heroImage}
          style={[styles.image, useExpandedLayout && styles.imageExpanded]}
        />
        <View style={styles.missionCopy}>
          <Text style={styles.missionTitle}>Family Adventure Preview</Text>
          <View style={styles.metaRow}>
            <Ionicons color={appColors.teal} name="storefront-outline" size={17} />
            <Text style={styles.meta}>Demo Family Fun Center</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons color={appColors.teal} name="calendar-outline" size={17} />
            <Text style={styles.meta}>Wed · 2:00–4:00 PM</Text>
          </View>
          <View style={styles.rewardRow}>
            <Ionicons color="#159464" name="shield-checkmark-outline" size={18} />
            <Text style={styles.reward}>$50 guaranteed · Funded</Text>
          </View>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel="Mission progress: Applied complete. Accepted current. Check in, Submit, and Paid upcoming."
        style={styles.progressCard}
      >
        <View style={styles.line} />
        {stages.map((stage) => (
          <View key={stage.label} style={styles.stage}>
            <View
              style={[
                styles.stageDot,
                stage.active && styles.stageDotActive,
                stage.done && styles.stageDotDone,
              ]}
            >
              {stage.done ? <Ionicons color="#ffffff" name="checkmark" size={15} /> : null}
            </View>
            <Text style={[styles.stageLabel, stage.active && styles.stageLabelActive]}>
              {stage.label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Before you go</Text>
      <View style={styles.listCard}>
        {preparations.map((item) => (
          <View key={item.label} style={styles.prepRow}>
            <View style={styles.prepIcon}>
              <Ionicons color={appColors.teal} name={item.icon} size={21} />
            </View>
            <Text style={styles.prepText}>{item.label}</Text>
            <Ionicons color={appColors.muted} name="chevron-forward" size={19} />
          </View>
        ))}
      </View>

      <View style={styles.privacyCard}>
        <Ionicons color={appColors.teal} name="location-outline" size={23} />
        <Text style={styles.privacyText}>
          Location is evaluated only when you start check-in during the mission window.
        </Text>
      </View>

      <Link asChild href="/creator/instructions">
        <Pressable
          accessibilityLabel="Review full mission instructions"
          accessibilityRole="button"
          style={styles.instructionsButton}
          testID="creator-open-instructions"
        >
          <Ionicons color={appColors.teal} name="document-text-outline" size={20} />
          <Text style={styles.instructionsText}>Review full mission instructions</Text>
          <Ionicons color={appColors.teal} name="chevron-forward" size={18} />
        </Pressable>
      </Link>

      <Link asChild href="/creator/check-in">
        <Pressable
          accessibilityLabel="Open demo check in"
          accessibilityRole="button"
          style={styles.primaryButton}
          testID="creator-open-check-in"
        >
          <Text style={styles.primaryText}>Open demo check-in</Text>
          <Ionicons color="#ffffff" name="arrow-forward" size={21} />
        </Pressable>
      </Link>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: appColors.muted, fontSize: 15, marginTop: 7 },
  missionCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    marginTop: 19,
    padding: 13,
  },
  missionCardExpanded: { flexDirection: 'column' },
  image: { borderRadius: 14, height: 122, width: 102 },
  imageExpanded: { height: 150, width: '100%' },
  missionCopy: { flex: 1, justifyContent: 'center' },
  missionTitle: { color: appColors.ink, fontSize: 18, fontWeight: '900', lineHeight: 22 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 7 },
  meta: { color: appColors.muted, flex: 1, fontSize: 11 },
  rewardRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 8 },
  reward: { color: '#128056', fontSize: 11, fontWeight: '900' },
  progressCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingHorizontal: 11,
    paddingVertical: 17,
    position: 'relative',
  },
  line: {
    backgroundColor: '#cfd5da',
    height: 3,
    left: 30,
    position: 'absolute',
    right: 30,
    top: 31,
  },
  stage: { alignItems: 'center', flex: 1, zIndex: 1 },
  stageDot: {
    backgroundColor: appColors.card,
    borderColor: '#aeb7bf',
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    width: 28,
  },
  stageDotActive: { borderColor: appColors.teal },
  stageDotDone: {
    alignItems: 'center',
    backgroundColor: '#159464',
    borderColor: '#159464',
    justifyContent: 'center',
  },
  stageLabel: { color: appColors.muted, fontSize: 9, marginTop: 7 },
  stageLabelActive: { color: appColors.teal, fontWeight: '900' },
  sectionTitle: { color: appColors.ink, fontSize: 21, fontWeight: '900', marginTop: 21 },
  listCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  prepRow: {
    alignItems: 'center',
    borderBottomColor: appColors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 13,
  },
  prepIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  prepText: { color: appColors.ink, flex: 1, fontSize: 13, fontWeight: '700' },
  privacyCard: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 10,
    marginTop: 13,
    padding: 14,
  },
  privacyText: { color: appColors.muted, flex: 1, fontSize: 11, lineHeight: 16 },
  instructionsButton: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.teal,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 14,
  },
  instructionsText: { color: appColors.teal, flex: 1, fontSize: 12, fontWeight: '900' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    padding: 17,
  },
  primaryText: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
});
