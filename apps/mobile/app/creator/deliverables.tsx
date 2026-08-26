import { Ionicons } from '../../components/DecorativeIcon';
import { Link } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { CreatorMissionShell } from '../../components/CreatorMissionShell';

const deliverables = [
  {
    count: '2 of 2',
    icon: 'videocam-outline',
    label: 'Vertical clips',
    meta: '5–15 sec each · 9:16 · 1080p',
  },
  {
    count: '5 of 5',
    icon: 'images-outline',
    label: 'Original photos',
    meta: 'Readable · no unrelated marks',
  },
] as const;

export default function CreatorDeliverablesScreen() {
  const { fontScale, width } = useWindowDimensions();
  const useExpandedLayout = width < 390 || fontScale > 1.4;

  return (
    <CreatorMissionShell badge="CHECKED IN" title="Mission deliverables">
      <View
        accessible
        accessibilityLabel="Check-in confirmed. Family Adventure Preview. Test data."
        style={styles.successCard}
      >
        <Ionicons color="#159464" name="checkmark-circle" size={25} />
        <View style={styles.successCopy}>
          <Text style={styles.successTitle}>Check-in confirmed</Text>
          <Text style={styles.successBody}>Family Adventure Preview · test data</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Required files</Text>
      {deliverables.map((item) => (
        <View
          accessible
          accessibilityLabel={`${item.label}. ${item.meta}. Complete: ${item.count}.`}
          key={item.label}
          style={[styles.deliverableCard, useExpandedLayout && styles.deliverableCardExpanded]}
        >
          <View style={styles.deliverableIcon}>
            <Ionicons color={appColors.teal} name={item.icon} size={28} />
          </View>
          <View style={styles.deliverableCopy}>
            <Text style={styles.deliverableLabel}>{item.label}</Text>
            <Text style={styles.deliverableMeta}>{item.meta}</Text>
          </View>
          <View style={[styles.completeBadge, useExpandedLayout && styles.completeBadgeExpanded]}>
            <Ionicons color="#159464" name="checkmark-circle" size={17} />
            <Text style={styles.completeText}>{item.count}</Text>
          </View>
        </View>
      ))}

      <View style={styles.uploadCard}>
        <View
          accessible
          accessibilityLabel="Upload complete, 100 percent. 7 synthetic files validated locally."
          style={styles.uploadHeader}
        >
          <Ionicons color={appColors.teal} name="cloud-upload-outline" size={24} />
          <View style={styles.uploadCopy}>
            <Text style={styles.uploadTitle}>Upload complete · 100%</Text>
            <Text style={styles.uploadMeta}>7 synthetic files validated locally</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
        <View accessible accessibilityLabel="entrance-clip.mov. 12 seconds." style={styles.fileRow}>
          <Ionicons color={appColors.teal} name="videocam" size={19} />
          <Text style={styles.fileName}>entrance-clip.mov</Text>
          <Text style={styles.fileStatus}>12 sec</Text>
        </View>
        <View
          accessible
          accessibilityLabel="experience-photos.zip. 5 files."
          style={styles.fileRow}
        >
          <Ionicons color={appColors.teal} name="images" size={19} />
          <Text style={styles.fileName}>experience-photos.zip</Text>
          <Text style={styles.fileStatus}>5 files</Text>
        </View>
        <View style={[styles.uploadActions, useExpandedLayout && styles.uploadActionsExpanded]}>
          <Pressable
            accessibilityLabel="Pause synthetic upload preview"
            accessibilityRole="button"
            style={styles.uploadAction}
            testID="creator-pause-upload-preview"
          >
            <Ionicons color={appColors.teal} name="pause-outline" size={18} />
            <Text style={styles.uploadActionText}>Pause demo</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Retry synthetic upload preview"
            accessibilityRole="button"
            style={styles.uploadAction}
            testID="creator-retry-upload-preview"
          >
            <Ionicons color={appColors.teal} name="refresh-outline" size={18} />
            <Text style={styles.uploadActionText}>Retry demo</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.resumeNote}>
        <Ionicons color={appColors.teal} name="information-circle-outline" size={20} />
        <Text style={styles.resumeText}>Uploads resume automatically after a connection drop.</Text>
      </View>

      <Link asChild href="/creator/revision">
        <Pressable
          accessibilityLabel="Submit synthetic deliverables"
          accessibilityRole="button"
          style={styles.submitButton}
          testID="creator-submit-deliverables"
        >
          <Text style={styles.submitText}>Submit demo deliverables</Text>
          <Ionicons color="#ffffff" name="arrow-forward" size={20} />
        </Pressable>
      </Link>
      <Text style={styles.footer}>No files were selected, uploaded, licensed, or transmitted.</Text>
    </CreatorMissionShell>
  );
}

const styles = StyleSheet.create({
  successCard: {
    alignItems: 'center',
    backgroundColor: appColors.successSoft,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    padding: 14,
  },
  successCopy: { flex: 1 },
  successTitle: { color: appColors.success, fontSize: 14, fontWeight: '900' },
  successBody: { color: appColors.success, fontSize: 10, marginTop: 2 },
  sectionTitle: { color: appColors.ink, fontSize: 21, fontWeight: '900', marginTop: 20 },
  deliverableCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 10,
    padding: 14,
  },
  deliverableCardExpanded: { alignItems: 'flex-start', flexDirection: 'column' },
  deliverableIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  deliverableCopy: { flex: 1 },
  deliverableLabel: { color: appColors.ink, fontSize: 15, fontWeight: '900' },
  deliverableMeta: { color: appColors.muted, fontSize: 10, marginTop: 4 },
  completeBadge: { alignItems: 'center', gap: 3 },
  completeBadgeExpanded: { flexDirection: 'row' },
  completeText: { color: '#128056', fontSize: 10, fontWeight: '900' },
  uploadCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  uploadHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  uploadCopy: { flex: 1 },
  uploadTitle: { color: appColors.ink, fontSize: 15, fontWeight: '900' },
  uploadMeta: { color: appColors.muted, fontSize: 10, marginTop: 3 },
  progressTrack: { backgroundColor: appColors.line, borderRadius: 4, height: 7, marginTop: 13 },
  progressFill: { backgroundColor: appColors.teal, borderRadius: 4, height: 7, width: '100%' },
  fileRow: {
    alignItems: 'center',
    borderBottomColor: appColors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 46,
  },
  fileName: { color: appColors.ink, flex: 1, fontSize: 11, fontWeight: '700' },
  fileStatus: { color: appColors.muted, fontSize: 10 },
  uploadActions: { flexDirection: 'row', gap: 9, marginTop: 12 },
  uploadActionsExpanded: { flexDirection: 'column' },
  uploadAction: {
    alignItems: 'center',
    borderColor: appColors.line,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    padding: 10,
  },
  uploadActionText: { color: appColors.teal, fontSize: 11, fontWeight: '800' },
  resumeNote: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 13 },
  resumeText: { color: appColors.muted, flex: 1, fontSize: 10 },
  submitButton: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    padding: 17,
  },
  submitText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  footer: { color: appColors.muted, fontSize: 10, marginTop: 10, textAlign: 'center' },
});
