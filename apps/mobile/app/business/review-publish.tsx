import { Ionicons } from '../../components/DecorativeIcon';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { BusinessWizardShell } from '../../components/BusinessWizardShell';

const summary = [
  { icon: 'location-outline', label: 'Orlando · verified venue' },
  { icon: 'calendar-outline', label: 'Wed, Aug 28 · 2:00–4:00 PM' },
  { icon: 'people-outline', label: '10 Community Slots · $50 each' },
  { icon: 'images-outline', label: '2 clips · 5 photos · 90-day organic use' },
] as const;

export default function BusinessReviewPublishScreen() {
  const [approved, setApproved] = useState(false);
  const [published, setPublished] = useState(false);
  const { fontScale, width } = useWindowDimensions();
  const usesExpandedLayout = fontScale >= 1.5 || width < 360;
  const statusTitle = published
    ? 'Demo mission funded and published'
    : approved
      ? 'Admin-approved demo · ready to fund'
      : 'Ready for admin review preview';
  const statusBody = published
    ? 'The prototype has reached its terminal Business publish state.'
    : approved
      ? 'Only an explicit Fund and Publish action may charge the saved method.'
      : 'Submitting the preview does not reserve money or expose the mission to Creators.';

  const primaryAction = () => {
    if (!approved) {
      setApproved(true);
      return;
    }
    setPublished(true);
  };

  return (
    <BusinessWizardShell step={4} title="Review & publish">
      <Text style={styles.intro}>
        Confirm the Creator-facing contract. This local screen previews admin approval and funding
        without sending or charging anything.
      </Text>

      <View style={styles.missionCard}>
        <View
          accessible
          accessibilityLabel="Mission: Family Adventure Preview. Demo Family Fun Center"
          style={[styles.missionHeader, usesExpandedLayout && styles.missionHeaderExpanded]}
        >
          <View style={styles.missionIcon}>
            <Ionicons color={appColors.orange} name="star-outline" size={28} />
          </View>
          <View style={styles.missionCopy}>
            <Text style={styles.label}>MISSION</Text>
            <Text style={styles.missionTitle}>Family Adventure Preview</Text>
            <Text style={styles.business}>Demo Family Fun Center</Text>
          </View>
        </View>
        {summary.map((item) => (
          <View
            accessible
            accessibilityLabel={item.label}
            key={item.label}
            style={styles.summaryRow}
          >
            <Ionicons color={appColors.teal} name={item.icon} size={19} />
            <Text style={styles.summaryText}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.moneyCard, usesExpandedLayout && styles.moneyCardExpanded]}>
        <View accessible accessibilityLabel="Creator Reward Pool: 500 dollars">
          <Text style={styles.moneyLabel}>Creator Reward Pool</Text>
          <Text style={styles.moneyValue}>$500</Text>
        </View>
        <View
          accessible
          accessibilityLabel="Total Due: 575 dollars"
          style={[styles.totalCopy, usesExpandedLayout && styles.totalCopyExpanded]}
        >
          <Text style={styles.moneyLabel}>Total Due</Text>
          <Text style={styles.totalValue}>$575</Text>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={`${statusTitle}. ${statusBody}`}
        style={[styles.statusCard, usesExpandedLayout && styles.statusCardExpanded]}
      >
        <View
          style={[
            styles.statusIcon,
            approved && styles.statusIconApproved,
            published && styles.statusIconPublished,
          ]}
        >
          <Ionicons
            color="#ffffff"
            name={published ? 'rocket' : approved ? 'checkmark' : 'clipboard-outline'}
            size={27}
          />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>{statusTitle}</Text>
          <Text style={styles.statusBody}>{statusBody}</Text>
        </View>
      </View>

      <View style={styles.checklistCard}>
        <Text style={styles.cardTitle}>Launch checklist</Text>
        {[
          ['Business verified', true],
          ['Objective checklist complete', true],
          ['Creator-facing rights accepted', true],
          ['Admin approval', approved],
          ['Funding confirmed', published],
        ].map(([label, done]) => (
          <View
            accessible
            accessibilityLabel={`${String(label)}: ${done ? 'complete' : 'pending'}`}
            key={String(label)}
            style={styles.checkRow}
          >
            <Ionicons
              color={done ? appColors.success : appColors.locked}
              name={done ? 'checkmark-circle' : 'ellipse-outline'}
              size={21}
            />
            <Text style={[styles.checkText, !done && styles.checkTextPending]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.auditCard}>
        <Text style={styles.cardTitle}>Preview audit timeline</Text>
        <View
          accessible
          accessibilityLabel="10:15 AM. Draft created"
          style={[styles.auditRow, usesExpandedLayout && styles.auditRowExpanded]}
        >
          <Text style={styles.auditTime}>10:15 AM</Text>
          <Text style={styles.auditText}>Draft created</Text>
        </View>
        <View
          accessible
          accessibilityLabel={`Now. ${approved ? 'Admin approval previewed' : 'Awaiting review preview'}`}
          style={[styles.auditRow, usesExpandedLayout && styles.auditRowExpanded]}
        >
          <Text style={styles.auditTime}>Now</Text>
          <Text style={styles.auditText}>
            {approved ? 'Admin approval previewed' : 'Awaiting review preview'}
          </Text>
        </View>
        {published ? (
          <View
            accessible
            accessibilityLabel="Now. Fund and Publish previewed. No charge"
            style={[styles.auditRow, usesExpandedLayout && styles.auditRowExpanded]}
          >
            <Text style={styles.auditTime}>Now</Text>
            <Text style={styles.auditText}>Fund and Publish previewed · no charge</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityLabel={
          published
            ? 'Mission published in local preview'
            : approved
              ? 'Preview Fund and Publish for 575 dollars'
              : 'Submit mission for synthetic admin review'
        }
        accessibilityRole="button"
        disabled={published}
        onPress={primaryAction}
        style={[styles.primaryButton, published && styles.primaryButtonDone]}
        testID="business-review-primary-action"
      >
        <Text style={styles.primaryText}>
          {published
            ? 'Demo mission published'
            : approved
              ? 'Preview Fund and Publish · $575'
              : 'Submit demo for admin review'}
        </Text>
        <Ionicons color="#ffffff" name={published ? 'checkmark' : 'arrow-forward'} size={21} />
      </Pressable>
      <Text style={styles.footer}>
        No mission, approval request, payment intent, charge, or Creator-facing publication is
        created.
      </Text>
    </BusinessWizardShell>
  );
}

const styles = StyleSheet.create({
  intro: { color: appColors.muted, fontSize: 13, lineHeight: 19, marginTop: 17 },
  missionCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  missionHeader: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  missionHeaderExpanded: { alignItems: 'flex-start', flexDirection: 'column' },
  missionIcon: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  missionCopy: { flex: 1 },
  label: { color: appColors.orange, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  missionTitle: { color: appColors.ink, fontSize: 18, fontWeight: '900', marginTop: 3 },
  business: { color: appColors.muted, fontSize: 10, marginTop: 3 },
  summaryRow: {
    alignItems: 'center',
    borderTopColor: appColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 11,
    paddingTop: 10,
  },
  summaryText: { color: appColors.ink, flex: 1, fontSize: 11, fontWeight: '700' },
  moneyCard: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    padding: 15,
  },
  moneyCardExpanded: { alignItems: 'flex-start', flexDirection: 'column' },
  moneyLabel: { color: appColors.muted, fontSize: 10 },
  moneyValue: { color: appColors.ink, fontSize: 22, fontWeight: '900', marginTop: 2 },
  totalCopy: { alignItems: 'flex-end' },
  totalCopyExpanded: { alignItems: 'flex-start', marginTop: 12 },
  totalValue: { color: appColors.orange, fontSize: 22, fontWeight: '900', marginTop: 2 },
  statusCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 14,
    padding: 14,
  },
  statusCardExpanded: { alignItems: 'flex-start', flexDirection: 'column' },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: appColors.orange,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  statusIconApproved: { backgroundColor: appColors.teal },
  statusIconPublished: { backgroundColor: '#116b49' },
  statusCopy: { flex: 1 },
  statusTitle: { color: appColors.ink, fontSize: 14, fontWeight: '900' },
  statusBody: { color: appColors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  checklistCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  cardTitle: { color: appColors.ink, fontSize: 17, fontWeight: '900' },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 11 },
  checkText: { color: appColors.ink, fontSize: 12, fontWeight: '700' },
  checkTextPending: { color: appColors.muted },
  auditCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  auditRow: { alignItems: 'center', flexDirection: 'row', gap: 11, marginTop: 11 },
  auditRowExpanded: { alignItems: 'flex-start', flexDirection: 'column', gap: 3 },
  auditTime: { color: appColors.teal, fontSize: 10, fontWeight: '900', width: 62 },
  auditText: { color: appColors.ink, flex: 1, fontSize: 11 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: appColors.orange,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 15,
    padding: 17,
  },
  primaryButtonDone: { backgroundColor: '#116b49' },
  primaryText: {
    color: '#ffffff',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  footer: {
    color: appColors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
    textAlign: 'center',
  },
});
