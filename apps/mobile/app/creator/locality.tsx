import { Ionicons } from '../../components/DecorativeIcon';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { CreatorMissionShell } from '../../components/CreatorMissionShell';

export default function CreatorLocalityScreen() {
  const [changed, setChanged] = useState(false);

  return (
    <CreatorMissionShell badge={changed ? 'REVERIFY' : 'VERIFIED'} title="Locality verification">
      <View style={[styles.statusCard, changed && styles.statusCardWarning]}>
        <View style={[styles.statusIcon, changed && styles.statusIconWarning]}>
          <Ionicons color="#ffffff" name={changed ? 'refresh' : 'checkmark'} size={31} />
        </View>
        <Text style={styles.statusTitle}>
          {changed ? 'Reverification required' : 'Orlando-area verified'}
        </Text>
        <Text style={styles.statusBody}>
          {changed
            ? 'The old locality badge is unavailable until a new review finishes.'
            : 'Businesses see only this verified area and a coarse venue-distance band.'}
        </Text>
      </View>

      <View style={styles.timelineCard}>
        <Text style={styles.cardTitle}>Verification lifecycle</Text>
        {[
          ['Verified', 'Aug 26, 2026'],
          ['Annual expiry', 'Aug 26, 2027'],
          ['Raw proof deletion due', 'Sep 25, 2026'],
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

      <View style={styles.visibleCard}>
        <Text style={styles.cardTitle}>What a business can see</Text>
        {(changed
          ? ['Locality verification unavailable', 'No distance band shown']
          : ['Orlando-area verified', 'Verification currently valid', 'Coarse distance band only']
        ).map((item) => (
          <View key={item} style={styles.checkRow}>
            <Ionicons
              color={changed ? appColors.orange : '#159464'}
              name={changed ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={20}
            />
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.privateCard}>
        <Ionicons color={appColors.teal} name="lock-closed-outline" size={25} />
        <View style={styles.privateCopy}>
          <Text style={styles.privateTitle}>Never shown to a business</Text>
          <Text style={styles.privateText}>
            Street address, unit, ZIP, uploaded proof, document metadata, exact distance, bank,
            Stripe, tax, or payout information.
          </Text>
        </View>
      </View>

      <View style={styles.separationCard}>
        <Ionicons color={appColors.orange} name="git-compare-outline" size={24} />
        <Text style={styles.separationText}>
          Locality is separate from Stripe identity and from mission-window check-in location.
        </Text>
      </View>

      <Pressable
        accessibilityLabel={changed ? 'Reset locality preview' : 'Preview declared address change'}
        accessibilityRole="button"
        onPress={() => setChanged((value) => !value)}
        style={[styles.primaryButton, changed && styles.primaryButtonWarning]}
        testID="creator-preview-address-change"
      >
        <Text style={styles.primaryText}>
          {changed ? 'Reset local preview' : 'Preview “I moved” flow'}
        </Text>
        <Ionicons color="#ffffff" name={changed ? 'refresh' : 'home-outline'} size={20} />
      </Pressable>
      <Text style={styles.footer}>No address, document, or verification event is collected.</Text>
    </CreatorMissionShell>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 20,
    marginTop: 17,
    padding: 18,
  },
  statusCardWarning: { backgroundColor: appColors.orangeSoft },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: '#159464',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  statusIconWarning: { backgroundColor: appColors.orange },
  statusTitle: { color: appColors.ink, fontSize: 20, fontWeight: '900', marginTop: 10 },
  statusBody: {
    color: appColors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
    textAlign: 'center',
  },
  timelineCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  cardTitle: { color: appColors.ink, fontSize: 16, fontWeight: '900' },
  detailRow: {
    borderBottomColor: appColors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
    paddingBottom: 9,
  },
  detailLabel: { color: appColors.muted, fontSize: 10 },
  detailValue: { color: appColors.ink, fontSize: 10, fontWeight: '900' },
  visibleCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 9 },
  checkText: { color: appColors.ink, fontSize: 10, fontWeight: '700' },
  privateCard: {
    alignItems: 'flex-start',
    backgroundColor: appColors.tealSoft,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 13,
  },
  privateCopy: { flex: 1 },
  privateTitle: { color: appColors.ink, fontSize: 13, fontWeight: '900' },
  privateText: { color: appColors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  separationCard: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 13,
  },
  separationText: { color: '#805238', flex: 1, fontSize: 9, lineHeight: 14 },
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
  primaryButtonWarning: { backgroundColor: appColors.orange },
  primaryText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  footer: { color: appColors.muted, fontSize: 9, marginTop: 9, textAlign: 'center' },
});
