import { Ionicons } from '../../components/DecorativeIcon';
import { Link } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { AppShell, appColors } from '../../components/AppShell';

const creators = [
  {
    area: '4–6 miles from venue',
    fit: 'Family activities · weekday available',
    name: 'Jordan L.',
    reliability: '3 completed · on-time',
  },
  {
    area: '7–10 miles from venue',
    fit: 'Food and attractions · weekday available',
    name: 'Alex R.',
    reliability: 'New Creator · profile verified',
  },
  {
    area: '4–6 miles from venue',
    fit: 'Family activities · vertical video',
    name: 'Taylor M.',
    reliability: '1 completed · on-time',
  },
] as const;

export default function BusinessApplicantsScreen() {
  const { fontScale, width } = useWindowDimensions();
  const useExpandedLayout = width < 390 || fontScale > 1.4;

  return (
    <AppShell mode="business" showTabs title="Applicants & capacity">
      <Text style={styles.intro}>
        Community Slots rotate among qualified local Creators. Audience size and appearance are not
        selection criteria.
      </Text>

      <View style={[styles.capacityCard, useExpandedLayout && styles.capacityCardExpanded]}>
        <View style={styles.capacityCopy}>
          <Text style={styles.capacityLabel}>COMMUNITY CAPACITY</Text>
          <Text style={styles.capacityValue}>8 of 10 assigned</Text>
        </View>
        <View style={[styles.capacityIcon, useExpandedLayout && styles.capacityIconExpanded]}>
          <Ionicons color={appColors.teal} name="people" size={28} />
        </View>
      </View>

      <View style={styles.fairnessCard}>
        <Ionicons color={appColors.teal} name="shield-checkmark-outline" size={26} />
        <View style={styles.fairnessCopy}>
          <Text style={styles.fairnessTitle}>Fair Community matching</Text>
          <Text style={styles.fairnessText}>
            Locality, availability, mission fit, and reliability are shown. Exact ZIP, follower
            totals, private analytics, and street addresses are hidden.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Assigned Creator previews</Text>
      {creators.map((creator, index) => (
        <View key={creator.name} style={styles.creatorCard}>
          <View
            accessibilityElementsHidden
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{creator.name.slice(0, 1)}</Text>
          </View>
          <View style={styles.creatorCopy}>
            <View style={styles.nameRow}>
              <Text style={styles.creatorName}>{creator.name}</Text>
              <View style={styles.slotBadge}>
                <Text style={styles.slotText}>SLOT {index + 1}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Ionicons color={appColors.teal} name="navigate-outline" size={16} />
              <Text style={styles.detailText}>{creator.area}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons color={appColors.teal} name="sparkles-outline" size={16} />
              <Text style={styles.detailText}>{creator.fit}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons color="#159464" name="checkmark-circle-outline" size={16} />
              <Text style={styles.detailText}>{creator.reliability}</Text>
            </View>
            <Pressable
              accessibilityLabel={`Request an objective replacement for ${creator.name}`}
              accessibilityRole="button"
              style={styles.replaceButton}
              testID={`business-request-replacement-${index + 1}`}
            >
              <Text style={styles.replaceText}>Request objective replacement</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <View style={styles.replacementNote}>
        <Ionicons color={appColors.orange} name="information-circle-outline" size={20} />
        <Text style={styles.replacementText}>
          A replacement requires a valid availability, safety, location, eligibility, or mission-fit
          reason. Popularity or subjective preference is not valid.
        </Text>
      </View>

      <Link asChild href="/business/submission-review">
        <Pressable
          accessibilityLabel="Confirm synthetic Community assignments"
          accessibilityRole="button"
          style={styles.primaryButton}
          testID="business-confirm-community-assignments"
        >
          <Text style={styles.primaryText}>Confirm demo assignments</Text>
          <Ionicons color="#ffffff" name="arrow-forward" size={21} />
        </Pressable>
      </Link>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  intro: { color: appColors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  capacityCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 17,
    padding: 16,
  },
  capacityCardExpanded: { alignItems: 'flex-start', flexDirection: 'column' },
  capacityCopy: { flex: 1, minWidth: 0 },
  capacityLabel: { color: appColors.orange, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  capacityValue: { color: appColors.ink, fontSize: 22, fontWeight: '900', marginTop: 4 },
  capacityIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  capacityIconExpanded: { marginTop: 12 },
  fairnessCard: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 11,
    marginTop: 13,
    padding: 14,
  },
  fairnessCopy: { flex: 1 },
  fairnessTitle: { color: appColors.ink, fontSize: 14, fontWeight: '900' },
  fairnessText: { color: appColors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionTitle: { color: appColors.ink, fontSize: 20, fontWeight: '900', marginTop: 20 },
  creatorCard: {
    alignItems: 'flex-start',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 10,
    padding: 13,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  avatarText: { color: '#ffffff', fontSize: 19, fontWeight: '900' },
  creatorCopy: { flex: 1 },
  nameRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  creatorName: { color: appColors.ink, fontSize: 16, fontWeight: '900' },
  slotBadge: { backgroundColor: appColors.orangeSoft, borderRadius: 10, padding: 5 },
  slotText: { color: appColors.orange, fontSize: 7, fontWeight: '900', letterSpacing: 0.4 },
  detailRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 7 },
  detailText: { color: appColors.muted, flex: 1, fontSize: 10 },
  replaceButton: {
    alignSelf: 'flex-start',
    borderColor: appColors.line,
    borderRadius: 11,
    borderWidth: 1,
    marginTop: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  replaceText: { color: appColors.teal, fontSize: 9, fontWeight: '900' },
  replacementNote: {
    alignItems: 'flex-start',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 12,
  },
  replacementText: { color: '#805238', flex: 1, fontSize: 9, lineHeight: 14 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: appColors.orange,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    padding: 17,
  },
  primaryText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});
