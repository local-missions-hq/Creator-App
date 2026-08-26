import { Ionicons } from '../../components/DecorativeIcon';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { AppShell, appColors } from '../../components/AppShell';
import { StatePreviewSheet } from '../../components/StatePreviewSheet';

const metrics = [
  {
    color: appColors.teal,
    icon: 'rocket-outline',
    label: 'Active',
    softColor: appColors.tealSoft,
    value: '1',
  },
  {
    color: appColors.success,
    icon: 'people-outline',
    label: 'Applicants',
    softColor: appColors.successSoft,
    value: '8',
  },
  {
    color: appColors.orange,
    icon: 'time-outline',
    label: 'To review',
    softColor: appColors.orangeSoft,
    value: '2',
  },
  {
    color: appColors.warning,
    icon: 'wallet-outline',
    label: 'Funded',
    softColor: appColors.warningSoft,
    value: '$500',
  },
] as const;

const checklist = [
  { done: true, label: 'Business approved' },
  { done: true, label: 'Payment method ready' },
  { done: false, label: 'Publish first mission' },
] as const;

export default function BusinessDashboardScreen() {
  const [stateSheetOpen, setStateSheetOpen] = useState(false);

  return (
    <AppShell mode="business" showTabs title="Good morning, Demo Family Fun Center">
      <View style={styles.statusRow}>
        <View style={styles.approvedBadge}>
          <Ionicons color={appColors.success} name="checkmark-circle" size={17} />
          <Text maxFontSizeMultiplier={1.2} style={styles.approvedText}>
            BUSINESS APPROVED
          </Text>
        </View>
        <Text maxFontSizeMultiplier={1.3} style={styles.testData}>
          Test data only
        </Text>
      </View>

      <View style={styles.metrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: metric.softColor }]}>
              <Ionicons color={metric.color} name={metric.icon} size={21} />
            </View>
            <Text maxFontSizeMultiplier={1.4} style={[styles.metricValue, { color: metric.color }]}>
              {metric.value}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.metricLabel}>
              {metric.label}
            </Text>
          </View>
        ))}
      </View>

      <Link asChild href="/business/mission-brief">
        <Pressable
          accessibilityLabel="Create a new local mission"
          accessibilityRole="button"
          style={styles.createButton}
          testID="business-create-mission"
        >
          <Ionicons color="#ffffff" name="add-circle" size={22} />
          <Text maxFontSizeMultiplier={1.4} style={styles.createText}>
            Create mission
          </Text>
        </Pressable>
      </Link>

      <View style={styles.quickActions}>
        <Link asChild href="/business/applicants">
          <Pressable
            accessibilityLabel="View Business applicants"
            accessibilityRole="button"
            style={styles.quickAction}
            testID="business-view-applicants"
          >
            <Ionicons color={appColors.teal} name="people-outline" size={21} />
            <Text maxFontSizeMultiplier={1.2} style={styles.quickActionText}>
              Applicants
            </Text>
          </Pressable>
        </Link>
        <Link asChild href="/business/submission-review">
          <Pressable
            accessibilityLabel="Review Creator submissions"
            accessibilityRole="button"
            style={styles.quickAction}
            testID="business-review-submissions"
          >
            <Ionicons color={appColors.orange} name="clipboard-outline" size={21} />
            <Text maxFontSizeMultiplier={1.2} style={styles.quickActionText}>
              Review work
            </Text>
          </Pressable>
        </Link>
        <Link asChild href="/business/results">
          <Pressable
            accessibilityLabel="View campaign results"
            accessibilityRole="button"
            style={styles.quickAction}
            testID="business-view-results"
          >
            <Ionicons color={appColors.success} name="analytics-outline" size={21} />
            <Text maxFontSizeMultiplier={1.2} style={styles.quickActionText}>
              Results
            </Text>
          </Pressable>
        </Link>
      </View>

      <Pressable
        accessibilityHint="Opens local examples of loading, empty, offline, error, pending, locked, warning, and success states"
        accessibilityLabel="Preview business interface states"
        accessibilityRole="button"
        onPress={() => setStateSheetOpen(true)}
        style={styles.statePreview}
        testID="business-open-state-previews"
      >
        <View style={styles.statePreviewIcon}>
          <Ionicons color={appColors.orange} name="layers-outline" size={20} />
        </View>
        <View style={styles.statePreviewCopy}>
          <Text maxFontSizeMultiplier={1.35} style={styles.statePreviewTitle}>
            Preview dashboard states
          </Text>
          <Text maxFontSizeMultiplier={1.45} style={styles.statePreviewBody}>
            Local examples · No money or campaign action
          </Text>
        </View>
        <Ionicons color={appColors.orange} name="chevron-up" size={18} />
      </Pressable>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text maxFontSizeMultiplier={1.35} style={styles.cardTitle}>
            Mission overview
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.viewAll}>
            VIEW ALL
          </Text>
        </View>
        <View style={styles.missionRow}>
          <View style={styles.missionIcon}>
            <Ionicons color={appColors.orange} name="star-outline" size={24} />
          </View>
          <View style={styles.missionCopy}>
            <Text maxFontSizeMultiplier={1.4} style={styles.missionTitle}>
              Family Adventure Preview
            </Text>
            <Text maxFontSizeMultiplier={1.4} style={styles.missionMeta}>
              Draft · 10 Community Slots
            </Text>
          </View>
          <View style={styles.amountCopy}>
            <Text maxFontSizeMultiplier={1.35} style={styles.amount}>
              $500
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.pool}>
              reward pool
            </Text>
          </View>
        </View>
        <View style={styles.totalRow}>
          <Text maxFontSizeMultiplier={1.4} style={styles.totalLabel}>
            Estimated total due at Fund and Publish
          </Text>
          <Text maxFontSizeMultiplier={1.35} style={styles.total}>
            $575
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text maxFontSizeMultiplier={1.35} style={styles.cardTitle}>
          Launch checklist
        </Text>
        {checklist.map((item, index) => (
          <View key={item.label} style={styles.checkRow}>
            <View style={[styles.step, item.done && styles.stepDone]}>
              {item.done ? (
                <Ionicons color="#ffffff" name="checkmark" size={16} />
              ) : (
                <Text style={styles.stepNumber}>{index + 1}</Text>
              )}
            </View>
            <View style={styles.checkCopy}>
              <Text maxFontSizeMultiplier={1.4} style={styles.checkTitle}>
                {item.label}
              </Text>
              <Text maxFontSizeMultiplier={1.4} style={styles.checkStatus}>
                {item.done ? 'Completed' : 'Next step'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.promiseCard}>
        <Ionicons color={appColors.teal} name="shield-checkmark-outline" size={26} />
        <View style={styles.promiseCopy}>
          <Text maxFontSizeMultiplier={1.4} style={styles.promiseTitle}>
            Pay for completed creator slots
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={styles.promiseBody}>
            Cancelled or incomplete slots return to the campaign balance under the pilot rules.
          </Text>
        </View>
      </View>
      <StatePreviewSheet
        mode="business"
        onDismiss={() => setStateSheetOpen(false)}
        visible={stateSheetOpen}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 10,
  },
  approvedBadge: {
    alignItems: 'center',
    backgroundColor: appColors.successSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  approvedText: {
    color: appColors.success,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  testData: { color: appColors.muted, flexShrink: 1, fontSize: 10 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  metricCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  metricValue: { fontSize: 25, fontWeight: '900', marginTop: 9 },
  metricLabel: { color: appColors.muted, fontSize: 12, marginTop: 2 },
  createButton: {
    alignItems: 'center',
    backgroundColor: appColors.orange,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    padding: 17,
  },
  createText: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickAction: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 11,
  },
  quickActionText: { color: appColors.ink, fontSize: 9, fontWeight: '900' },
  statePreview: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderColor: appColors.orange,
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
  card: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  cardTitle: { color: appColors.ink, flexShrink: 1, fontSize: 19, fontWeight: '900' },
  viewAll: {
    color: appColors.teal,
    flexShrink: 0,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  missionRow: { alignItems: 'center', flexDirection: 'row', marginTop: 15 },
  missionIcon: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 20,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  missionCopy: { flex: 1, marginLeft: 10 },
  missionTitle: { color: appColors.ink, fontSize: 14, fontWeight: '800' },
  missionMeta: { color: appColors.muted, fontSize: 10, marginTop: 3 },
  amountCopy: { alignItems: 'flex-end' },
  amount: { color: appColors.ink, fontSize: 17, fontWeight: '900' },
  pool: { color: appColors.muted, fontSize: 9, marginTop: 1 },
  totalRow: {
    borderTopColor: appColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  totalLabel: { color: appColors.muted, flex: 1, fontSize: 10 },
  total: { color: appColors.orange, fontSize: 14, fontWeight: '900' },
  checkRow: { alignItems: 'center', flexDirection: 'row', marginTop: 14 },
  step: {
    alignItems: 'center',
    borderColor: appColors.orange,
    borderRadius: 17,
    borderWidth: 2,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  stepDone: { backgroundColor: '#116b49', borderColor: '#116b49' },
  stepNumber: { color: appColors.orange, fontSize: 13, fontWeight: '900' },
  checkCopy: { marginLeft: 11 },
  checkTitle: { color: appColors.ink, fontSize: 14, fontWeight: '800' },
  checkStatus: { color: appColors.muted, fontSize: 10, marginTop: 2 },
  promiseCard: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 15,
  },
  promiseCopy: { flex: 1 },
  promiseTitle: { color: appColors.ink, fontSize: 14, fontWeight: '900' },
  promiseBody: { color: appColors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
});
