import { Ionicons } from '../../components/DecorativeIcon';
import { Link, type Href } from 'expo-router';
import { type ColorValue, StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { AppShell, appColors } from '../../components/AppShell';

type MissionItem = {
  action: string;
  color: ColorValue;
  href: Href;
  meta: string;
  softColor: ColorValue;
  status: string;
  title: string;
  testID: string;
};

const sections: Array<{ items: MissionItem[]; title: string }> = [
  {
    items: [
      {
        action: 'Review instructions',
        color: appColors.teal,
        href: '/creator/instructions',
        meta: 'Wed · 2:00–4:00 PM · $50',
        softColor: appColors.tealSoft,
        status: 'ACCEPTED',
        title: 'Family Adventure Preview',
        testID: 'creator-missions-review-instructions',
      },
    ],
    title: 'Upcoming',
  },
  {
    items: [
      {
        action: 'Open correction',
        color: appColors.orange,
        href: '/creator/revision',
        meta: 'Due tomorrow · one photo',
        softColor: appColors.orangeSoft,
        status: 'NEEDS ACTION',
        title: 'Weekend Café Preview',
        testID: 'creator-missions-open-correction',
      },
    ],
    title: 'Needs action',
  },
  {
    items: [
      {
        action: 'View earnings',
        color: appColors.success,
        href: '/creator/earnings',
        meta: 'Completed Aug 17 · $50 paid',
        softColor: appColors.successSoft,
        status: 'PAID',
        title: 'Science Center Visit',
        testID: 'creator-missions-view-earnings',
      },
    ],
    title: 'Completed',
  },
];

export default function CreatorMissionsScreen() {
  return (
    <AppShell mode="creator" showTabs title="My Missions">
      <Text style={styles.intro}>
        Every application and accepted mission stays organized by the action you need next.
      </Text>

      {sections.map((section) => (
        <View key={section.title}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.items.length}</Text>
          </View>
          {section.items.map((mission) => (
            <View key={mission.title} style={styles.missionCard}>
              <View style={[styles.statusBar, { backgroundColor: mission.color }]} />
              <View style={styles.missionBody}>
                <View style={styles.missionHeader}>
                  <View style={[styles.icon, { backgroundColor: mission.softColor }]}>
                    <Ionicons color={mission.color} name="location-outline" size={22} />
                  </View>
                  <View style={styles.missionCopy}>
                    <Text style={[styles.status, { color: mission.color }]}>{mission.status}</Text>
                    <Text style={styles.missionTitle}>{mission.title}</Text>
                    <Text style={styles.meta}>{mission.meta}</Text>
                  </View>
                </View>
                <Link asChild href={mission.href}>
                  <Pressable
                    accessibilityLabel={`${mission.action} for ${mission.title}`}
                    accessibilityRole="button"
                    style={styles.actionButton}
                    testID={mission.testID}
                  >
                    <Text style={[styles.actionText, { color: mission.color }]}>
                      {mission.action}
                    </Text>
                    <Ionicons color={mission.color} name="chevron-forward" size={18} />
                  </Pressable>
                </Link>
              </View>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.promiseCard}>
        <Ionicons color={appColors.teal} name="notifications-outline" size={24} />
        <Text style={styles.promiseText}>
          Deadlines and money-state changes remain visible here even if a notification is missed.
        </Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  intro: { color: appColors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  sectionRow: { alignItems: 'center', flexDirection: 'row', marginTop: 19 },
  sectionTitle: { color: appColors.ink, fontSize: 19, fontWeight: '900' },
  sectionCount: {
    backgroundColor: appColors.tealSoft,
    borderRadius: 12,
    color: appColors.teal,
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 7,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  missionCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 9,
    overflow: 'hidden',
  },
  statusBar: { width: 5 },
  missionBody: { flex: 1, padding: 13 },
  missionHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  icon: { alignItems: 'center', borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
  missionCopy: { flex: 1 },
  status: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  missionTitle: { color: appColors.ink, fontSize: 15, fontWeight: '900', marginTop: 2 },
  meta: { color: appColors.muted, fontSize: 9, marginTop: 3 },
  actionButton: {
    alignItems: 'center',
    borderTopColor: appColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
    paddingTop: 10,
  },
  actionText: { fontSize: 11, fontWeight: '900' },
  promiseCard: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    marginTop: 16,
    padding: 13,
  },
  promiseText: { color: appColors.muted, flex: 1, fontSize: 10, lineHeight: 15 },
});
