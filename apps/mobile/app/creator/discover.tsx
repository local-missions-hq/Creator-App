import { Ionicons } from '../../components/DecorativeIcon';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import heroImage from '../../../../docs/business-plan/assets/local-missions-cover-hero.png';
import { AppShell, appColors } from '../../components/AppShell';
import { StatePreviewSheet } from '../../components/StatePreviewSheet';

const filters = [
  { icon: 'calendar-outline', label: 'Today' },
  { icon: 'calendar-number-outline', label: 'This week' },
  { icon: 'people-outline', label: 'Family' },
] as const;

const filterGroups = [
  { label: 'When', options: ['Today', 'This week', 'Weekend'] },
  { label: 'Distance band', options: ['0–3 miles', '4–6 miles', '7–10 miles'] },
  { label: 'Mission fit', options: ['Family', 'Food', 'Attractions'] },
] as const;

type FilterSelection = Record<string, string>;

const initialFilters: FilterSelection = {
  'Distance band': '4–6 miles',
  'Mission fit': 'Family',
  When: 'Today',
};

function CreatorFilterSheet({
  current,
  onApply,
  onDismiss,
}: Readonly<{
  current: FilterSelection;
  onApply: (selection: FilterSelection) => void;
  onDismiss: () => void;
}>) {
  const [draft, setDraft] = useState(current);

  return (
    <Modal animationType="slide" onRequestClose={onDismiss} transparent visible>
      <View style={styles.sheetOverlay}>
        <Pressable
          accessibilityLabel="Dismiss filters without applying"
          accessibilityRole="button"
          onPress={onDismiss}
          style={styles.sheetBackdrop}
          testID="creator-dismiss-filter-backdrop"
        />
        <View accessibilityViewIsModal style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetEyebrow}>COMMUNITY MISSION FILTERS</Text>
              <Text style={styles.sheetTitle}>Find the right local fit</Text>
            </View>
            <Pressable
              accessibilityLabel="Close filters without applying"
              accessibilityRole="button"
              onPress={onDismiss}
              style={styles.sheetClose}
              testID="creator-dismiss-filter-sheet"
            >
              <Ionicons color={appColors.ink} name="close" size={23} />
            </Pressable>
          </View>

          <ScrollView bounces={false} contentContainerStyle={styles.sheetContent}>
            <Text style={styles.sheetIntro}>
              Choose timing, a coarse distance band, and mission fit. There is never a
              follower-count filter.
            </Text>
            {filterGroups.map((group) => (
              <View key={group.label} style={styles.sheetGroup}>
                <Text style={styles.sheetGroupLabel}>{group.label}</Text>
                <View style={styles.sheetOptions}>
                  {group.options.map((option) => {
                    const active = draft[group.label] === option;
                    return (
                      <Pressable
                        accessibilityLabel={`${option} ${active ? 'selected' : 'not selected'}`}
                        accessibilityRole="button"
                        key={option}
                        onPress={() => setDraft((value) => ({ ...value, [group.label]: option }))}
                        style={[styles.sheetOption, active && styles.sheetOptionActive]}
                        testID={`creator-filter-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      >
                        <Text
                          style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            <View style={styles.sheetFairness}>
              <Ionicons color={appColors.teal} name="shield-checkmark-outline" size={23} />
              <Text style={styles.sheetFairnessText}>
                Community Slots stay open to qualified everyday creators. Optional Reach offers
                remain separate.
              </Text>
            </View>
          </ScrollView>

          <Pressable
            accessibilityLabel="Apply local mission filters"
            accessibilityRole="button"
            onPress={() => onApply(draft)}
            style={styles.sheetApply}
            testID="creator-apply-filter-sheet"
          >
            <Text style={styles.sheetApplyText}>Apply filters · 2 matches</Text>
            <Ionicons color="#ffffff" name="checkmark" size={20} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function CreatorDiscoveryScreen() {
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [stateSheetOpen, setStateSheetOpen] = useState(false);
  const quickFilters = filtersApplied
    ? [
        { icon: 'calendar-number-outline' as const, label: appliedFilters.When },
        { icon: 'navigate-outline' as const, label: appliedFilters['Distance band'] },
        { icon: 'sparkles-outline' as const, label: appliedFilters['Mission fit'] },
      ]
    : filters;

  return (
    <AppShell mode="creator" showTabs title="Good morning, Jordan">
      <View style={styles.locationRow}>
        <Ionicons color={appColors.teal} name="location" size={18} />
        <Text maxFontSizeMultiplier={1.5} style={styles.location}>
          Orlando-area verified
        </Text>
      </View>

      <Pressable
        accessibilityLabel="Open mission filters"
        accessibilityRole="button"
        onPress={() => setSheetOpen(true)}
        style={styles.search}
        testID="creator-open-search"
      >
        <Ionicons color={appColors.muted} name="search" size={23} />
        <View style={styles.searchCopy}>
          <Text maxFontSizeMultiplier={1.5} style={styles.searchText}>
            {filtersApplied ? '2 matching missions' : 'Search local missions'}
          </Text>
          {filtersApplied ? (
            <Text maxFontSizeMultiplier={1.5} style={styles.searchSummary}>
              {appliedFilters.When} · {appliedFilters['Distance band']} ·{' '}
              {appliedFilters['Mission fit']}
            </Text>
          ) : null}
        </View>
        <Ionicons color={appColors.teal} name="options-outline" size={21} />
      </Pressable>

      <View style={styles.filters}>
        {quickFilters.map((filter, index) => (
          <View
            key={filter.label}
            style={[
              styles.filter,
              !filtersApplied && index === 0 && styles.activeFilter,
              filtersApplied && styles.appliedFilter,
            ]}
          >
            <Ionicons
              color={!filtersApplied && index === 0 ? '#ffffff' : appColors.teal}
              name={filter.icon}
              size={18}
            />
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.filterText, !filtersApplied && index === 0 && styles.activeFilterText]}
            >
              {filter.label}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityHint="Opens local examples of loading, empty, offline, error, pending, locked, warning, and success states"
        accessibilityLabel="Preview creator interface states"
        accessibilityRole="button"
        onPress={() => setStateSheetOpen(true)}
        style={styles.statePreview}
        testID="creator-open-state-previews"
      >
        <View style={styles.statePreviewIcon}>
          <Ionicons color={appColors.teal} name="layers-outline" size={20} />
        </View>
        <View style={styles.statePreviewCopy}>
          <Text maxFontSizeMultiplier={1.4} style={styles.statePreviewTitle}>
            Preview feed states
          </Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.statePreviewBody}>
            Local examples · No actions leave this device
          </Text>
        </View>
        <Ionicons color={appColors.teal} name="chevron-up" size={18} />
      </Pressable>

      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>Missions near you</Text>
          <Text style={styles.sectionBody}>Community Slots · No follower minimum</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>6 OPEN</Text>
        </View>
      </View>

      <Link asChild href="/creator/mission-details">
        <Pressable
          accessibilityLabel="Open Family Adventure Preview mission"
          accessibilityRole="button"
          style={styles.missionCard}
          testID="creator-open-featured-mission"
        >
          <ImageBackground imageStyle={styles.image} source={heroImage} style={styles.hero}>
            <View style={styles.heroShade} />
            <View style={styles.communityBadge}>
              <Ionicons color={appColors.teal} name="people" size={14} />
              <Text style={styles.communityText}>COMMUNITY SLOT</Text>
            </View>
          </ImageBackground>
          <View style={styles.cardBody}>
            <Text style={styles.business}>DEMO FAMILY FUN CENTER</Text>
            <Text style={styles.missionTitle}>Family Adventure Preview</Text>
            <View style={styles.rewardBadge}>
              <Ionicons color="#ffffff" name="shield-checkmark-outline" size={18} />
              <Text style={styles.reward}>$50 guaranteed</Text>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons color={appColors.orange} name="calendar-outline" size={18} />
                <Text style={styles.metaText}>Wed · 2–4 PM</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons color={appColors.teal} name="navigate" size={18} />
                <Text style={styles.metaText}>4–6 miles</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons color={appColors.teal} name="people" size={18} />
                <Text style={styles.metaText}>3 spots</Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>

      <View style={styles.reachNote}>
        <Ionicons color={appColors.orange} name="megaphone-outline" size={22} />
        <View style={styles.reachCopy}>
          <Text style={styles.reachTitle}>Want an optional Reach bonus?</Text>
          <Text style={styles.reachBody}>
            Verified platform tiers appear as separately paid offers.
          </Text>
        </View>
      </View>

      {sheetOpen ? (
        <CreatorFilterSheet
          current={appliedFilters}
          onApply={(selection) => {
            setAppliedFilters(selection);
            setFiltersApplied(true);
            setSheetOpen(false);
          }}
          onDismiss={() => setSheetOpen(false)}
        />
      ) : null}
      <StatePreviewSheet
        mode="creator"
        onDismiss={() => setStateSheetOpen(false)}
        visible={stateSheetOpen}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  locationRow: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 7 },
  location: { color: appColors.teal, fontSize: 13, fontWeight: '800' },
  search: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    minHeight: 58,
    paddingHorizontal: 16,
  },
  searchCopy: { flex: 1 },
  searchText: { color: appColors.ink, fontSize: 15, fontWeight: '700' },
  searchSummary: { color: appColors.muted, fontSize: 9, marginTop: 3 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  statePreview: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderColor: appColors.teal,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    minHeight: 56,
    paddingHorizontal: 12,
  },
  statePreviewIcon: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  statePreviewCopy: { flex: 1 },
  statePreviewTitle: { color: appColors.ink, fontSize: 12, fontWeight: '900' },
  statePreviewBody: { color: appColors.muted, fontSize: 9, marginTop: 2 },
  filter: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeFilter: { backgroundColor: appColors.teal, borderColor: appColors.teal },
  appliedFilter: { backgroundColor: appColors.tealSoft, borderColor: appColors.tealSoft },
  filterText: { color: appColors.teal, fontSize: 12, fontWeight: '800' },
  activeFilterText: { color: '#ffffff' },
  sectionRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  sectionTitle: { color: appColors.ink, fontSize: 21, fontWeight: '800' },
  sectionBody: { color: appColors.muted, fontSize: 11, marginTop: 4 },
  countBadge: { backgroundColor: appColors.tealSoft, borderRadius: 13, padding: 8 },
  countText: { color: appColors.teal, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  missionCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 14,
    overflow: 'hidden',
    shadowColor: appColors.ink,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  hero: { height: 190, justifyContent: 'flex-start' },
  image: { opacity: 0.96 },
  heroShade: {
    backgroundColor: 'rgba(16,42,67,0.12)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  communityBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 15,
    flexDirection: 'row',
    gap: 5,
    margin: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  communityText: { color: appColors.teal, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  cardBody: { padding: 17 },
  business: { color: appColors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  missionTitle: { color: appColors.ink, fontSize: 24, fontWeight: '800', marginTop: 6 },
  rewardBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: appColors.orange,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
    marginTop: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  reward: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  metaText: { color: appColors.ink, fontSize: 11, fontWeight: '700' },
  reachNote: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
    padding: 15,
  },
  reachCopy: { flex: 1 },
  reachTitle: { color: appColors.ink, fontSize: 14, fontWeight: '800' },
  reachBody: { color: appColors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: {
    backgroundColor: 'rgba(16,42,67,0.42)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheetCard: {
    backgroundColor: appColors.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 18,
    paddingHorizontal: 18,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#b8c0c7',
    borderRadius: 3,
    height: 5,
    marginTop: 9,
    width: 42,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  sheetEyebrow: { color: appColors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  sheetTitle: { color: appColors.ink, fontSize: 22, fontWeight: '900', marginTop: 3 },
  sheetClose: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  sheetContent: { paddingBottom: 12 },
  sheetIntro: { color: appColors.muted, fontSize: 11, lineHeight: 16, marginTop: 12 },
  sheetGroup: { marginTop: 14 },
  sheetGroupLabel: { color: appColors.ink, fontSize: 13, fontWeight: '900' },
  sheetOptions: { flexDirection: 'row', gap: 7, marginTop: 8 },
  sheetOption: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 4,
  },
  sheetOptionActive: { backgroundColor: appColors.teal, borderColor: appColors.teal },
  sheetOptionText: { color: appColors.teal, fontSize: 9, fontWeight: '900', textAlign: 'center' },
  sheetOptionTextActive: { color: '#ffffff' },
  sheetFairness: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
    padding: 12,
  },
  sheetFairnessText: { color: appColors.muted, flex: 1, fontSize: 9, lineHeight: 14 },
  sheetApply: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    padding: 15,
  },
  sheetApplyText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
});
