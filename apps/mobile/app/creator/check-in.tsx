import { Ionicons } from '../../components/DecorativeIcon';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { CreatorMissionShell } from '../../components/CreatorMissionShell';

export default function CreatorCheckInScreen() {
  return (
    <CreatorMissionShell badge="MISSION WINDOW" title="Check in">
      <View style={styles.missionCard}>
        <View style={styles.ticketIcon}>
          <Ionicons color={appColors.orange} name="ticket-outline" size={30} />
        </View>
        <View>
          <Text style={styles.missionTitle}>Family Adventure Preview</Text>
          <Text style={styles.missionMeta}>Today · 2:00–4:00 PM</Text>
        </View>
      </View>

      <View style={styles.scanner} accessibilityLabel="Demo QR scanner preview">
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        <View style={styles.qrMark}>
          <Ionicons color="#ffffff" name="qr-code-outline" size={95} />
          <Text style={styles.scannerLabel}>Synthetic venue code</Text>
        </View>
      </View>
      <Text style={styles.scanTitle}>Scan the rotating venue QR code</Text>

      <View style={styles.privacyCard}>
        <Ionicons color={appColors.teal} name="shield-checkmark-outline" size={28} />
        <Text style={styles.privacyText}>
          Location is checked only during this mission window and is not continuously tracked.
        </Text>
      </View>

      <View style={styles.areaCard}>
        <Ionicons color="#159464" name="checkmark-circle" size={25} />
        <Text style={styles.areaText}>Demo state: within the check-in area</Text>
      </View>

      <Link asChild href="/creator/deliverables">
        <Pressable
          accessibilityLabel="Complete synthetic QR check in"
          accessibilityRole="button"
          style={styles.primaryButton}
          testID="creator-complete-check-in"
        >
          <Ionicons color="#ffffff" name="qr-code-outline" size={22} />
          <Text style={styles.primaryText}>Complete demo check-in</Text>
        </Pressable>
      </Link>

      <Pressable
        accessibilityLabel="Enter venue staff code instead"
        accessibilityRole="button"
        style={styles.secondaryButton}
        testID="creator-enter-staff-code"
      >
        <Ionicons color={appColors.teal} name="keypad-outline" size={20} />
        <Text style={styles.secondaryText}>Enter staff code instead</Text>
      </Pressable>

      <Text style={styles.footer}>No camera, precise location, or venue system is connected.</Text>
    </CreatorMissionShell>
  );
}

const styles = StyleSheet.create({
  missionCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    padding: 14,
  },
  ticketIcon: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 22,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  missionTitle: { color: appColors.ink, fontSize: 17, fontWeight: '900' },
  missionMeta: { color: appColors.muted, fontSize: 12, marginTop: 4 },
  scanner: {
    alignItems: 'center',
    backgroundColor: '#102a43',
    borderRadius: 24,
    height: 330,
    justifyContent: 'center',
    marginTop: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  qrMark: { alignItems: 'center', opacity: 0.92 },
  scannerLabel: { color: '#ffffff', fontSize: 12, fontWeight: '800', marginTop: 11 },
  corner: { borderColor: '#ffffff', height: 44, position: 'absolute', width: 44 },
  topLeft: { borderLeftWidth: 4, borderTopWidth: 4, left: 26, top: 26 },
  topRight: { borderRightWidth: 4, borderTopWidth: 4, right: 26, top: 26 },
  bottomLeft: { borderBottomWidth: 4, borderLeftWidth: 4, bottom: 26, left: 26 },
  bottomRight: { borderBottomWidth: 4, borderRightWidth: 4, bottom: 26, right: 26 },
  scanTitle: {
    color: appColors.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center',
  },
  privacyCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 15,
    padding: 14,
  },
  privacyText: { color: appColors.muted, flex: 1, fontSize: 12, lineHeight: 18 },
  areaCard: {
    alignItems: 'center',
    backgroundColor: appColors.successSoft,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    marginTop: 11,
    padding: 14,
  },
  areaText: { color: appColors.success, flex: 1, fontSize: 13, fontWeight: '800' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 13,
    padding: 17,
  },
  primaryText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: appColors.teal,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    padding: 15,
  },
  secondaryText: { color: appColors.teal, fontSize: 14, fontWeight: '900' },
  footer: { color: appColors.muted, fontSize: 10, marginTop: 11, textAlign: 'center' },
});
