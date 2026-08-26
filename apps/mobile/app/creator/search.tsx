import { Ionicons } from '../../components/DecorativeIcon';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { CreatorMissionShell } from '../../components/CreatorMissionShell';

const filterGroups = [
  { label: 'When', options: ['Today', 'This week', 'Weekend'] },
  { label: 'Distance band', options: ['0–3 miles', '4–6 miles', '7–10 miles'] },
  { label: 'Mission fit', options: ['Family', 'Food', 'Attractions'] },
] as const;

export default function CreatorSearchScreen() {
  const [selected, setSelected] = useState<Record<string, string>>({
    'Distance band': '4–6 miles',
    'Mission fit': 'Family',
    When: 'Today',
  });
  const [applied, setApplied] = useState(false);

  return (
    <CreatorMissionShell badge="6 OPEN" title="Search & filters">
      <Text style={styles.intro}>
        Find Community opportunities by timing, coarse distance, and mission fit—never by follower
        minimum.
      </Text>

      <View style={styles.searchField}>
        <Ionicons color={appColors.muted} name="search" size={21} />
        <Text style={styles.searchText}>Family activities</Text>
        <Ionicons color={appColors.teal} name="close-circle" size={20} />
      </View>

      {filterGroups.map((group) => (
        <View key={group.label} style={styles.groupCard}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          <View style={styles.options}>
            {group.options.map((option) => {
              const active = selected[group.label] === option;
              return (
                <Pressable
                  key={option}
                  accessibilityLabel={`${option} ${active ? 'selected' : 'not selected'}`}
                  accessibilityRole="button"
                  onPress={() => {
                    setApplied(false);
                    setSelected((current) => ({ ...current, [group.label]: option }));
                  }}
                  style={[styles.option, active && styles.optionActive]}
                  testID={`creator-search-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.rewardCard}>
        <View>
          <Text style={styles.groupLabel}>Guaranteed reward</Text>
          <Text style={styles.rewardValue}>$25 or more</Text>
        </View>
        <View style={styles.rewardIcon}>
          <Ionicons color={appColors.orange} name="cash-outline" size={26} />
        </View>
      </View>

      <View style={styles.fairnessCard}>
        <Ionicons color={appColors.teal} name="shield-checkmark-outline" size={25} />
        <View style={styles.fairnessCopy}>
          <Text style={styles.fairnessTitle}>Community opportunities stay open</Text>
          <Text style={styles.fairnessText}>
            There is no follower-count filter. Optional Reach offers appear separately with a clear
            extra reward.
          </Text>
        </View>
      </View>

      {applied ? (
        <View style={styles.resultState}>
          <Ionicons color="#159464" name="checkmark-circle" size={23} />
          <Text style={styles.resultText}>2 synthetic missions match these filters</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="Apply local mission filters"
        accessibilityRole="button"
        onPress={() => setApplied(true)}
        style={[styles.primaryButton, applied && styles.primaryButtonDone]}
        testID="creator-apply-search-filters"
      >
        <Text style={styles.primaryText}>
          {applied ? 'Filters applied · 2 matches' : 'Show missions'}
        </Text>
        <Ionicons color="#ffffff" name={applied ? 'checkmark' : 'search'} size={20} />
      </Pressable>
    </CreatorMissionShell>
  );
}

const styles = StyleSheet.create({
  intro: { color: appColors.muted, fontSize: 13, lineHeight: 19, marginTop: 18 },
  searchField: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
    padding: 15,
  },
  searchText: { color: appColors.ink, flex: 1, fontSize: 14, fontWeight: '700' },
  groupCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  groupLabel: { color: appColors.ink, fontSize: 14, fontWeight: '900' },
  options: { flexDirection: 'row', gap: 7, marginTop: 11 },
  option: {
    alignItems: 'center',
    borderColor: appColors.line,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 43,
    paddingHorizontal: 5,
  },
  optionActive: { backgroundColor: appColors.teal, borderColor: appColors.teal },
  optionText: { color: appColors.teal, fontSize: 9, fontWeight: '900', textAlign: 'center' },
  optionTextActive: { color: '#ffffff' },
  rewardCard: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 14,
  },
  rewardValue: { color: appColors.orange, fontSize: 20, fontWeight: '900', marginTop: 3 },
  rewardIcon: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  fairnessCard: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    padding: 14,
  },
  fairnessCopy: { flex: 1 },
  fairnessTitle: { color: appColors.ink, fontSize: 13, fontWeight: '900' },
  fairnessText: { color: appColors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  resultState: {
    alignItems: 'center',
    backgroundColor: '#e8f6ef',
    borderRadius: 15,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 12,
  },
  resultText: { color: '#116b49', fontSize: 11, fontWeight: '900' },
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
});
