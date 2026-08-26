import { Ionicons } from '../../components/DecorativeIcon';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { AppShell, appColors } from '../../components/AppShell';

const deliverables = [
  '2 vertical clips received',
  '5 original photos received',
  'File and duration rules passed',
  'No public post or positive review required',
] as const;

export default function BusinessSubmissionReviewScreen() {
  const router = useRouter();
  const [decision, setDecision] = useState<'pending' | 'revision' | 'approved'>('pending');

  const approveOrContinue = () => {
    if (decision === 'approved') {
      router.push('/business/results');
      return;
    }
    setDecision('approved');
  };

  return (
    <AppShell mode="business" showTabs title="Review submission">
      <Text style={styles.intro}>
        Compare the Creator&apos;s files with the objective checklist. Popularity, style preference,
        and whether the review is positive are not approval criteria.
      </Text>

      <View style={styles.creatorCard}>
        <View
          accessibilityElementsHidden
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>J</Text>
        </View>
        <View style={styles.creatorCopy}>
          <Text style={styles.eyebrow}>COMMUNITY SLOT 1</Text>
          <Text style={styles.creatorName}>Jordan L.</Text>
          <Text style={styles.creatorMeta}>Family Adventure Preview · $50 reward</Text>
        </View>
        <View style={styles.reviewBadge}>
          <Text style={styles.reviewBadgeText}>IN REVIEW</Text>
        </View>
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewVisual}>
          <Ionicons color="#ffffff" name="play-circle" size={48} />
          <Text style={styles.previewLabel}>SYNTHETIC MEDIA PREVIEW</Text>
        </View>
        <View style={styles.previewMeta}>
          <Ionicons color={appColors.teal} name="cloud-done-outline" size={20} />
          <Text style={styles.previewMetaText}>7 files uploaded · validation complete</Text>
        </View>
      </View>

      <View style={styles.checklistCard}>
        <Text style={styles.cardTitle}>Objective checklist</Text>
        {deliverables.map((item) => (
          <View key={item} style={styles.checkRow}>
            <Ionicons color="#159464" name="checkmark-circle" size={21} />
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.timelineCard}>
        <Text style={styles.cardTitle}>Audit timeline</Text>
        {[
          ['2:02 PM', 'Venue check-in verified'],
          ['3:41 PM', 'Submission completed'],
          ['3:42 PM', 'Automated file checks passed'],
          [
            'Now',
            decision === 'approved'
              ? 'Business approved objective work'
              : decision === 'revision'
                ? 'One objective correction requested'
                : 'Awaiting business decision',
          ],
        ].map(([time, label]) => (
          <View
            accessible
            accessibilityLabel={`${time}. ${label}`}
            key={`${time}-${label}`}
            style={styles.timelineRow}
          >
            <Text style={styles.timelineTime}>{time}</Text>
            <View style={styles.timelineDot} />
            <Text style={styles.timelineText}>{label}</Text>
          </View>
        ))}
      </View>

      {decision === 'revision' ? (
        <View style={styles.revisionState}>
          <Ionicons color={appColors.orange} name="create-outline" size={24} />
          <View style={styles.revisionCopy}>
            <Text style={styles.revisionTitle}>Objective correction previewed</Text>
            <Text style={styles.revisionText}>
              Replace one duplicate photo with a distinct venue-wide image. This is the single
              included correction round; no request or notification was sent.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Preview one objective correction request"
          accessibilityRole="button"
          disabled={decision === 'approved'}
          onPress={() => setDecision('revision')}
          style={[styles.secondaryButton, decision === 'approved' && styles.disabledButton]}
          testID="business-request-objective-correction"
        >
          <Ionicons color={appColors.orange} name="create-outline" size={19} />
          <Text style={styles.secondaryText}>Request objective correction</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={
            decision === 'approved' ? 'View synthetic campaign results' : 'Approve objective work'
          }
          accessibilityRole="button"
          onPress={approveOrContinue}
          style={[styles.primaryButton, decision === 'approved' && styles.primaryButtonDone]}
          testID="business-approve-submission"
        >
          <Text style={styles.primaryText}>
            {decision === 'approved' ? 'View campaign results' : 'Approve objective work'}
          </Text>
          <Ionicons
            color="#ffffff"
            name={decision === 'approved' ? 'arrow-forward' : 'checkmark'}
            size={21}
          />
        </Pressable>
      </View>

      <Text style={styles.footer}>
        This prototype records no decision, sends no revision request, and releases no payment.
      </Text>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  intro: { color: appColors.muted, fontSize: 13, lineHeight: 19, marginTop: 9 },
  creatorCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
    padding: 14,
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
  eyebrow: { color: appColors.orange, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  creatorName: { color: appColors.ink, fontSize: 17, fontWeight: '900', marginTop: 2 },
  creatorMeta: { color: appColors.muted, fontSize: 9, marginTop: 3 },
  reviewBadge: { backgroundColor: appColors.orangeSoft, borderRadius: 12, padding: 7 },
  reviewBadgeText: { color: appColors.orange, fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  previewCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 12,
    overflow: 'hidden',
  },
  previewVisual: {
    alignItems: 'center',
    backgroundColor: '#102a43',
    height: 132,
    justifyContent: 'center',
  },
  previewLabel: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 6,
  },
  previewMeta: { alignItems: 'center', flexDirection: 'row', gap: 7, padding: 11 },
  previewMetaText: { color: appColors.ink, fontSize: 11, fontWeight: '700' },
  checklistCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  cardTitle: { color: appColors.ink, fontSize: 17, fontWeight: '900' },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  checkText: { color: appColors.ink, flex: 1, fontSize: 11, fontWeight: '700' },
  timelineCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  timelineRow: { alignItems: 'center', flexDirection: 'row', marginTop: 10 },
  timelineTime: { color: appColors.teal, fontSize: 9, fontWeight: '900', width: 58 },
  timelineDot: {
    backgroundColor: appColors.teal,
    borderRadius: 4,
    height: 7,
    marginRight: 8,
    width: 7,
  },
  timelineText: { color: appColors.ink, flex: 1, fontSize: 10 },
  revisionState: {
    alignItems: 'flex-start',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 13,
  },
  revisionCopy: { flex: 1 },
  revisionTitle: { color: appColors.ink, fontSize: 13, fontWeight: '900' },
  revisionText: { color: appColors.warning, fontSize: 9, lineHeight: 14, marginTop: 3 },
  actions: { gap: 10, marginTop: 14 },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.orange,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    padding: 14,
  },
  disabledButton: { opacity: 0.45 },
  secondaryText: { color: appColors.orange, fontSize: 13, fontWeight: '900' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: appColors.orange,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    padding: 16,
  },
  primaryButtonDone: { backgroundColor: '#116b49' },
  primaryText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  footer: {
    color: appColors.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 9,
    textAlign: 'center',
  },
});
