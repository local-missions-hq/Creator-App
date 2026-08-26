import { Ionicons } from '../../components/DecorativeIcon';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { CreatorMissionShell } from '../../components/CreatorMissionShell';

export default function CreatorDeleteAccountScreen() {
  const [previewed, setPreviewed] = useState(false);

  return (
    <CreatorMissionShell badge="NO REQUEST" title="Account deletion">
      <View style={styles.warningCard}>
        <Ionicons color={appColors.orange} name="warning-outline" size={31} />
        <View style={styles.warningCopy}>
          <Text style={styles.warningTitle}>Review before requesting deletion</Text>
          <Text style={styles.warningText}>
            Production deletion requires recent sign-in, a clear scope review, and confirmation. It
            cannot silently erase money owed or another active role.
          </Text>
        </View>
      </View>

      <View style={styles.deleteCard}>
        <Text style={styles.cardTitle}>Creator data scheduled for deletion</Text>
        {[
          'Creator profile, interests, and availability',
          'Portfolio and removable media copies',
          'Optional Reach connections and raw analytics',
          'Locality proof under its verified deletion lifecycle',
        ].map((item) => (
          <View key={item} style={styles.deleteRow}>
            <Ionicons color={appColors.orange} name="remove-circle-outline" size={20} />
            <Text style={styles.deleteText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.retainCard}>
        <Text style={styles.cardTitle}>Records retained when justified</Text>
        {[
          'Earned rewards, transfers, refunds, and ledger history',
          'Required tax, fraud, legal, and dispute records',
          'Minimal audit proof of the deletion request and completion',
          'An active Business role unless separately requested',
        ].map((item) => (
          <View key={item} style={styles.retainRow}>
            <Ionicons color="#159464" name="shield-checkmark-outline" size={20} />
            <Text style={styles.retainText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.exportCard}>
        <Ionicons color={appColors.teal} name="download-outline" size={25} />
        <View style={styles.exportCopy}>
          <Text style={styles.exportTitle}>Request an account export first</Text>
          <Text style={styles.exportText}>
            A production export would describe included and excluded records without exposing other
            users or restricted operational data.
          </Text>
        </View>
      </View>

      {previewed ? (
        <View style={styles.previewState}>
          <Ionicons color="#159464" name="checkmark-circle" size={23} />
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>Deletion review previewed</Text>
            <Text style={styles.previewText}>
              No request was submitted. A real flow would still require recent authentication and a
              final explicit confirmation.
            </Text>
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="Preview Creator account deletion review"
        accessibilityRole="button"
        onPress={() => setPreviewed(true)}
        style={[styles.primaryButton, previewed && styles.primaryButtonDone]}
        testID="creator-preview-account-deletion"
      >
        <Text style={styles.primaryText}>
          {previewed ? 'Deletion review previewed' : 'Preview deletion review'}
        </Text>
        <Ionicons color="#ffffff" name={previewed ? 'checkmark' : 'arrow-forward'} size={20} />
      </Pressable>
      <Text style={styles.footer}>
        No account, profile, media, identity, mission, payment, or provider record is deleted.
      </Text>
    </CreatorMissionShell>
  );
}

const styles = StyleSheet.create({
  warningCard: {
    alignItems: 'flex-start',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    marginTop: 17,
    padding: 14,
  },
  warningCopy: { flex: 1 },
  warningTitle: { color: appColors.ink, fontSize: 14, fontWeight: '900' },
  warningText: { color: '#805238', fontSize: 10, lineHeight: 15, marginTop: 3 },
  deleteCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  cardTitle: { color: appColors.ink, fontSize: 16, fontWeight: '900' },
  deleteRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  deleteText: { color: appColors.ink, flex: 1, fontSize: 10 },
  retainCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  retainRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  retainText: { color: appColors.ink, flex: 1, fontSize: 10 },
  exportCard: {
    alignItems: 'flex-start',
    backgroundColor: appColors.tealSoft,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 13,
  },
  exportCopy: { flex: 1 },
  exportTitle: { color: appColors.ink, fontSize: 13, fontWeight: '900' },
  exportText: { color: appColors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
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
    backgroundColor: appColors.orange,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 14,
    padding: 16,
  },
  primaryButtonDone: { backgroundColor: '#159464' },
  primaryText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  footer: {
    color: appColors.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 9,
    textAlign: 'center',
  },
});
