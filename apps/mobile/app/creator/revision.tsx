import { Ionicons } from '../../components/DecorativeIcon';
import { Link } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { CreatorMissionShell } from '../../components/CreatorMissionShell';

const timeline = [
  { active: false, done: true, label: 'Submitted', time: 'Today · 10:12 AM' },
  { active: false, done: true, label: 'In review', time: 'Today · 12:45 PM' },
  { active: true, done: false, label: 'Revision requested', time: 'Today · 2:30 PM' },
  { active: false, done: false, label: 'Approved', time: 'Upcoming' },
] as const;

export default function CreatorRevisionScreen() {
  return (
    <CreatorMissionShell title="Submission">
      <View
        accessible
        accessibilityLabel="One revision requested. Objective checklist correction due tomorrow at 5 PM."
        style={styles.warningBanner}
      >
        <Ionicons color="#ffffff" name="alert-circle-outline" size={26} />
        <View style={styles.warningCopy}>
          <Text style={styles.warningTitle}>One revision requested</Text>
          <Text style={styles.warningBody}>
            Objective checklist correction · due tomorrow at 5 PM
          </Text>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel="Mission: Family Adventure Preview."
        style={styles.missionCard}
      >
        <View style={styles.missionIcon}>
          <Ionicons color={appColors.teal} name="compass-outline" size={31} />
        </View>
        <View style={styles.missionCopy}>
          <Text style={styles.label}>MISSION</Text>
          <Text style={styles.missionTitle}>Family Adventure Preview</Text>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel="Reviewer note. Please add one 10 to 15 second vertical clip showing the entrance. No other work can be added to this revision."
        style={styles.noteCard}
      >
        <View style={styles.noteIcon}>
          <Ionicons color={appColors.teal} name="chatbox-outline" size={28} />
        </View>
        <View style={styles.noteCopy}>
          <Text style={styles.noteTitle}>Reviewer note</Text>
          <Text style={styles.noteText}>
            Please add one 10–15 second vertical clip showing the entrance.
          </Text>
          <Text style={styles.scopeNote}>No other work can be added to this revision.</Text>
        </View>
      </View>

      <View style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>Submission timeline</Text>
        {timeline.map((item, index) => (
          <View
            accessible
            accessibilityLabel={`${item.label}. ${item.time}.`}
            key={item.label}
            style={styles.timelineRow}
          >
            <View style={styles.timelineMarkerColumn}>
              <View
                style={[
                  styles.timelineMarker,
                  item.done && styles.timelineDone,
                  item.active && styles.timelineActive,
                ]}
              >
                {item.done ? <Ionicons color="#ffffff" name="checkmark" size={16} /> : null}
              </View>
              {index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
            </View>
            <View style={styles.timelineCopy}>
              <Text style={[styles.timelineLabel, item.active && styles.timelineLabelActive]}>
                {item.label}
              </Text>
              <Text style={styles.timelineTime}>{item.time}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.fileCard}>
        <View style={styles.fileIcon}>
          <Ionicons color={appColors.teal} name="videocam-outline" size={28} />
        </View>
        <View style={styles.fileCopy}>
          <Text style={styles.fileName}>entrance-clip.mov</Text>
          <Text style={styles.fileMeta}>0:12 · MOV · synthetic</Text>
        </View>
        <Pressable
          accessibilityLabel="Preview replacing entrance-clip.mov"
          accessibilityRole="button"
          onPress={() =>
            Alert.alert('Local preview only', 'No file picker opens and no file is changed.')
          }
          style={styles.replaceButton}
          testID="creator-preview-replace-revision-file"
        >
          <Text style={styles.replace}>Replace</Text>
        </Pressable>
      </View>

      <Link asChild href="/creator/earnings">
        <Pressable
          accessibilityLabel="Resubmit synthetic revision"
          accessibilityRole="button"
          style={styles.primaryButton}
          testID="creator-resubmit-revision"
        >
          <Text style={styles.primaryText}>Resubmit demo revision</Text>
          <Ionicons color="#ffffff" name="arrow-forward" size={20} />
        </Pressable>
      </Link>
      <Pressable
        accessibilityLabel="Ask Local Missions for revision help"
        accessibilityRole="button"
        style={styles.helpButton}
        testID="creator-revision-help"
      >
        <Ionicons color={appColors.teal} name="help-circle-outline" size={20} />
        <Text style={styles.helpText}>Ask Local Missions for help</Text>
      </Pressable>
      <Text style={styles.footer}>This preview does not submit files or notify a business.</Text>
    </CreatorMissionShell>
  );
}

const styles = StyleSheet.create({
  warningBanner: {
    alignItems: 'center',
    backgroundColor: '#e87900',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    padding: 15,
  },
  warningCopy: { flex: 1 },
  warningTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  warningBody: { color: '#fff6ea', fontSize: 10, marginTop: 3 },
  missionCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 13,
    padding: 14,
  },
  missionIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  missionCopy: { flex: 1 },
  label: { color: appColors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  missionTitle: { color: appColors.ink, fontSize: 17, fontWeight: '900', marginTop: 4 },
  noteCard: {
    alignItems: 'flex-start',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 13,
    padding: 15,
  },
  noteIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  noteCopy: { flex: 1 },
  noteTitle: { color: appColors.teal, fontSize: 14, fontWeight: '900' },
  noteText: { color: appColors.ink, fontSize: 15, lineHeight: 21, marginTop: 6 },
  scopeNote: { color: appColors.muted, fontSize: 10, marginTop: 7 },
  timelineCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 13,
    padding: 15,
  },
  timelineTitle: { color: appColors.teal, fontSize: 17, fontWeight: '900' },
  timelineRow: { flexDirection: 'row', minHeight: 59 },
  timelineMarkerColumn: { alignItems: 'center', width: 36 },
  timelineMarker: {
    backgroundColor: appColors.card,
    borderColor: '#aeb7bf',
    borderRadius: 13,
    borderWidth: 2,
    height: 26,
    marginTop: 10,
    width: 26,
  },
  timelineDone: {
    alignItems: 'center',
    backgroundColor: '#159464',
    borderColor: '#159464',
    justifyContent: 'center',
  },
  timelineActive: { borderColor: '#e87900', borderWidth: 7 },
  timelineLine: { backgroundColor: '#cfd5da', flex: 1, width: 2 },
  timelineCopy: { flex: 1, paddingLeft: 8, paddingTop: 10 },
  timelineLabel: { color: appColors.ink, fontSize: 13, fontWeight: '800' },
  timelineLabelActive: { color: '#c45e00' },
  timelineTime: { color: appColors.muted, fontSize: 10, marginTop: 3 },
  fileCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 13,
    padding: 13,
  },
  fileIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  fileCopy: { flex: 1 },
  fileName: { color: appColors.ink, fontSize: 13, fontWeight: '900' },
  fileMeta: { color: appColors.muted, fontSize: 10, marginTop: 3 },
  replaceButton: { justifyContent: 'center' },
  replace: { color: appColors.teal, fontSize: 12, fontWeight: '900' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    padding: 17,
  },
  primaryText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  helpButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 12,
  },
  helpText: { color: appColors.teal, fontSize: 13, fontWeight: '900' },
  footer: { color: appColors.muted, fontSize: 10, marginTop: 11, textAlign: 'center' },
});
