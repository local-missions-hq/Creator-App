import { Ionicons } from './DecorativeIcon';
import { useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { AccessiblePressable as Pressable } from './AccessiblePressable';

import { appColors } from './AppShell';

type CreatorMissionShellProps = PropsWithChildren<{
  badge?: string;
  title: string;
}>;

export function CreatorMissionShell({ badge, children, title }: CreatorMissionShellProps) {
  const router = useRouter();
  const { fontScale, width } = useWindowDimensions();
  const useExpandedHeader = width < 390 || fontScale > 1.4;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView bounces={false} contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.back}
            testID="creator-mission-back"
          >
            <Ionicons color={appColors.ink} name="chevron-back" size={24} />
          </Pressable>
          {!useExpandedHeader ? <Text style={styles.title}>{title}</Text> : null}
          {badge && !useExpandedHeader ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
        {useExpandedHeader ? <Text style={styles.expandedTitle}>{title}</Text> : null}
        {badge && useExpandedHeader ? (
          <View style={styles.expandedBadgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: appColors.canvas, flex: 1 },
  page: { padding: 18, paddingBottom: 46 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  back: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 21,
    borderWidth: 1,
    flexShrink: 0,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  title: {
    color: appColors.ink,
    flex: 1,
    fontSize: 21,
    fontWeight: '900',
    marginHorizontal: 10,
    minWidth: 0,
    textAlign: 'center',
  },
  expandedTitle: {
    color: appColors.ink,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: appColors.teal,
    borderRadius: 14,
    flexShrink: 0,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  badgeText: { color: '#ffffff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  expandedBadgeRow: { alignItems: 'flex-end', marginTop: 8 },
  spacer: { flexShrink: 0, width: 42 },
});
