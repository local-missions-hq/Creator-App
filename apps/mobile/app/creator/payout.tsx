import { Ionicons } from '../../components/DecorativeIcon';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { CreatorMissionShell } from '../../components/CreatorMissionShell';

export default function CreatorPayoutScreen() {
  const [previewed, setPreviewed] = useState(false);

  return (
    <CreatorMissionShell badge="TEST ONLY" title="Payout setup">
      <View style={styles.statusCard}>
        <View style={styles.stripeMark}>
          <Text maxFontSizeMultiplier={1.25} style={styles.stripeText}>
            STRIPE
          </Text>
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusLabel}>PRODUCTION PROVIDER PLAN</Text>
          <Text style={styles.statusTitle}>Stripe-hosted onboarding</Text>
          <Text style={styles.statusText}>Current prototype status: Not connected</Text>
        </View>
      </View>

      <View style={styles.boundaryCard}>
        <Text style={styles.cardTitle}>What stays with Stripe</Text>
        {['Bank-account details', 'Identity/KYC documents', 'Tax and payout verification'].map(
          (item) => (
            <View key={item} style={styles.checkRow}>
              <Ionicons color="#159464" name="shield-checkmark-outline" size={20} />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ),
        )}
      </View>

      <View style={styles.localCard}>
        <Text style={styles.cardTitle}>What Local Missions shows</Text>
        {[
          ['Connection status', 'Not connected'],
          ['Payout readiness', 'Setup required'],
          ['Reward state', 'Funded → Pending review → Available → Paid'],
        ].map(([label, value]) => (
          <View
            accessible
            accessibilityLabel={`${label}: ${value}`}
            key={label}
            style={styles.detailRow}
          >
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.protectionCard}>
        <Ionicons color={appColors.teal} name="lock-closed-outline" size={25} />
        <View style={styles.protectionCopy}>
          <Text style={styles.protectionTitle}>Recent sign-in required</Text>
          <Text style={styles.protectionText}>
            Adding or changing a payout destination requires recent authentication and sends a
            security notification. It never changes locality verification.
          </Text>
        </View>
      </View>

      {previewed ? (
        <View style={styles.previewState}>
          <Ionicons color="#159464" name="checkmark-circle" size={23} />
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>Hosted handoff previewed</Text>
            <Text style={styles.previewText}>
              A production build would now open the approved Stripe-hosted flow. Nothing opened or
              connected here.
            </Text>
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="Preview Stripe hosted payout setup handoff"
        accessibilityRole="button"
        onPress={() => setPreviewed(true)}
        style={[styles.primaryButton, previewed && styles.primaryButtonDone]}
        testID="creator-preview-payout-handoff"
      >
        <Text style={styles.primaryText}>
          {previewed ? 'Handoff preview complete' : 'Preview hosted setup'}
        </Text>
        <Ionicons color="#ffffff" name={previewed ? 'checkmark' : 'open-outline'} size={20} />
      </Pressable>
      <Text style={styles.footer}>
        No Stripe request, account, bank record, or payout is created.
      </Text>
    </CreatorMissionShell>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 17,
    padding: 15,
  },
  stripeMark: {
    alignItems: 'center',
    backgroundColor: '#635bff',
    borderRadius: 22,
    height: 45,
    justifyContent: 'center',
    width: 67,
  },
  stripeText: { color: '#ffffff', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  statusCopy: { flex: 1 },
  statusLabel: { color: appColors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  statusTitle: { color: appColors.ink, fontSize: 16, fontWeight: '900', marginTop: 2 },
  statusText: { color: appColors.muted, fontSize: 9, marginTop: 3 },
  boundaryCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  cardTitle: { color: appColors.ink, fontSize: 16, fontWeight: '900' },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  checkText: { color: appColors.ink, fontSize: 11, fontWeight: '700' },
  localCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  detailRow: {
    borderBottomColor: appColors.line,
    borderBottomWidth: 1,
    marginTop: 11,
    paddingBottom: 9,
  },
  detailLabel: { color: appColors.muted, fontSize: 9 },
  detailValue: { color: appColors.ink, fontSize: 10, fontWeight: '900', marginTop: 3 },
  protectionCard: {
    alignItems: 'flex-start',
    backgroundColor: appColors.tealSoft,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 13,
  },
  protectionCopy: { flex: 1 },
  protectionTitle: { color: appColors.ink, fontSize: 13, fontWeight: '900' },
  protectionText: { color: appColors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  previewState: {
    alignItems: 'flex-start',
    backgroundColor: '#e9f7ef',
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 13,
  },
  previewCopy: { flex: 1 },
  previewTitle: { color: '#116b49', fontSize: 13, fontWeight: '900' },
  previewText: { color: '#477261', fontSize: 9, lineHeight: 14, marginTop: 3 },
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
  primaryText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  footer: { color: appColors.muted, fontSize: 9, marginTop: 9, textAlign: 'center' },
});
