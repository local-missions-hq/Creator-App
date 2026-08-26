import { Ionicons } from '../../components/DecorativeIcon';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { CreatorMissionShell } from '../../components/CreatorMissionShell';

const history = [
  {
    date: 'Aug 26, 2026',
    detail: 'Version 1.0 · required for the accepted mission',
    status: 'ACTIVE',
    title: 'Family Adventure mission terms',
  },
  {
    date: 'Aug 26, 2026',
    detail: 'Mission-window-only check-in explanation',
    status: 'ACKNOWLEDGED',
    title: 'Location privacy notice',
  },
  {
    date: 'Aug 26, 2026',
    detail: '90-day owned-organic-social use only',
    status: 'ACTIVE',
    title: 'Content rights license',
  },
] as const;

export default function CreatorConsentScreen() {
  const [reachEnabled, setReachEnabled] = useState(false);

  return (
    <CreatorMissionShell badge="HISTORY" title="Consent history">
      <Text style={styles.intro}>
        Required mission terms and optional permissions are separated, versioned, and visible after
        acceptance.
      </Text>

      <View style={styles.historyCard}>
        {history.map((item) => (
          <View
            accessible
            accessibilityLabel={`${item.title}. ${item.status}. ${item.detail}. ${item.date}`}
            key={item.title}
            style={styles.historyRow}
          >
            <View style={styles.historyIcon}>
              <Ionicons color={appColors.teal} name="document-text-outline" size={21} />
            </View>
            <View style={styles.historyCopy}>
              <View style={styles.historyTitleRow}>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <Text style={styles.historyStatus}>{item.status}</Text>
              </View>
              <Text style={styles.historyDetail}>{item.detail}</Text>
              <Text style={styles.historyDate}>{item.date}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.optionalCard}>
        <View style={styles.optionalHeader}>
          <View style={styles.optionalIcon}>
            <Ionicons color={appColors.orange} name="megaphone-outline" size={23} />
          </View>
          <View style={styles.optionalCopy}>
            <Text style={styles.optionalTitle}>Optional Reach analytics</Text>
            <Text style={styles.optionalStatus}>
              {reachEnabled ? 'PREVIEW ENABLED' : 'NOT ENABLED'}
            </Text>
          </View>
        </View>
        <Text style={styles.optionalText}>
          Reach permission is per platform, expires, and can be revoked. Community missions remain
          available whether this is on or off.
        </Text>
        <Pressable
          accessibilityLabel={
            reachEnabled
              ? 'Preview revoking optional Reach consent'
              : 'Preview optional Reach consent'
          }
          accessibilityRole="button"
          onPress={() => setReachEnabled((value) => !value)}
          style={[styles.optionalButton, reachEnabled && styles.optionalButtonEnabled]}
          testID="creator-preview-reach-consent"
        >
          <Text
            style={[styles.optionalButtonText, reachEnabled && styles.optionalButtonTextEnabled]}
          >
            {reachEnabled ? 'Preview revoke consent' : 'Preview optional consent'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.promiseCard}>
        <Ionicons color="#159464" name="shield-checkmark-outline" size={26} />
        <Text style={styles.promiseText}>
          Revoking optional analytics never cancels an accepted reward or removes Community access.
        </Text>
      </View>
      <Text style={styles.footer}>No consent record or analytics connection is created.</Text>
    </CreatorMissionShell>
  );
}

const styles = StyleSheet.create({
  intro: { color: appColors.muted, fontSize: 13, lineHeight: 19, marginTop: 17 },
  historyCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 13,
    overflow: 'hidden',
  },
  historyRow: {
    alignItems: 'flex-start',
    borderBottomColor: appColors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 13,
  },
  historyIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  historyCopy: { flex: 1 },
  historyTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  historyTitle: { color: appColors.ink, flex: 1, fontSize: 12, fontWeight: '900' },
  historyStatus: { color: appColors.teal, fontSize: 7, fontWeight: '900', letterSpacing: 0.4 },
  historyDetail: { color: appColors.muted, fontSize: 9, lineHeight: 13, marginTop: 3 },
  historyDate: { color: appColors.teal, fontSize: 8, fontWeight: '800', marginTop: 5 },
  optionalCard: {
    backgroundColor: appColors.orangeSoft,
    borderRadius: 19,
    marginTop: 12,
    padding: 14,
  },
  optionalHeader: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  optionalIcon: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  optionalCopy: { flex: 1 },
  optionalTitle: { color: appColors.ink, fontSize: 14, fontWeight: '900' },
  optionalStatus: { color: appColors.orange, fontSize: 8, fontWeight: '900', marginTop: 2 },
  optionalText: { color: '#805238', fontSize: 10, lineHeight: 15, marginTop: 11 },
  optionalButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: appColors.orange,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 11,
    padding: 12,
  },
  optionalButtonEnabled: { backgroundColor: appColors.orange },
  optionalButtonText: { color: appColors.orange, fontSize: 11, fontWeight: '900' },
  optionalButtonTextEnabled: { color: '#ffffff' },
  promiseCard: {
    alignItems: 'center',
    backgroundColor: '#e9f7ef',
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 13,
  },
  promiseText: { color: '#477261', flex: 1, fontSize: 10, lineHeight: 15 },
  footer: { color: appColors.muted, fontSize: 9, marginTop: 10, textAlign: 'center' },
});
