import { Ionicons } from './DecorativeIcon';
import { Link, type Href, usePathname } from 'expo-router';
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

import { appColors } from './theme';

export { appColors } from './theme';

type AppShellProps = PropsWithChildren<{
  mode: 'business' | 'creator' | 'venue staff';
  showTabs?: boolean;
  title: string;
}>;

type TabMode = 'business' | 'creator';

type TabItem = {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  testID: string;
};

const roleTabs: Record<TabMode, TabItem[]> = {
  creator: [
    {
      href: '/creator/discover',
      icon: 'compass-outline',
      label: 'Discover',
      testID: 'creator-tab-discover',
    },
    {
      href: '/creator/missions',
      icon: 'list-outline',
      label: 'Missions',
      testID: 'creator-tab-missions',
    },
    {
      href: '/creator/earnings',
      icon: 'wallet-outline',
      label: 'Earnings',
      testID: 'creator-tab-earnings',
    },
    {
      href: '/creator/account',
      icon: 'person-outline',
      label: 'Account',
      testID: 'creator-tab-account',
    },
  ],
  business: [
    {
      href: '/business/dashboard',
      icon: 'home-outline',
      label: 'Home',
      testID: 'business-tab-home',
    },
    {
      href: '/business/applicants',
      icon: 'people-outline',
      label: 'Applicants',
      testID: 'business-tab-applicants',
    },
    {
      href: '/business/submission-review',
      icon: 'clipboard-outline',
      label: 'Review',
      testID: 'business-tab-review',
    },
    {
      href: '/business/results',
      icon: 'analytics-outline',
      label: 'Results',
      testID: 'business-tab-results',
    },
  ],
};

export function RoleTabBar({ mode }: Readonly<{ mode: TabMode }>) {
  const pathname = usePathname();
  const accent = mode === 'business' ? appColors.orange : appColors.teal;

  return (
    <View accessibilityRole="tablist" style={styles.tabBar}>
      {roleTabs[mode].map((tab) => {
        const active = pathname === tab.href;

        return (
          <Link asChild href={tab.href} key={tab.label}>
            <Pressable
              accessibilityLabel={`${tab.label} tab`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={styles.tabButton}
              testID={tab.testID}
            >
              <View style={[styles.tabIndicator, active && { backgroundColor: accent }]} />
              <Ionicons color={active ? accent : appColors.muted} name={tab.icon} size={23} />
              <Text
                maxFontSizeMultiplier={1.15}
                style={[styles.tabText, active && { color: accent }]}
              >
                {tab.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

export function AppShell({ children, mode, showTabs = false, title }: AppShellProps) {
  const accent = mode === 'business' ? appColors.orange : appColors.teal;
  const { width } = useWindowDimensions();
  const showPreviewBadge = width >= 375;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView bounces={false} contentContainerStyle={styles.page}>
        <View style={styles.brandRow}>
          <View style={[styles.mark, { backgroundColor: accent }]}>
            <Ionicons color={appColors.onAccent} name="location" size={20} />
          </View>
          <View style={styles.brandCopy}>
            <Text maxFontSizeMultiplier={1.35} style={styles.brand}>
              LOCAL MISSIONS
            </Text>
            <Text maxFontSizeMultiplier={1.35} style={[styles.mode, { color: accent }]}>
              {mode.toUpperCase()} MODE
            </Text>
          </View>
          {showPreviewBadge ? (
            <View style={styles.previewBadge}>
              <Text maxFontSizeMultiplier={1.2} style={styles.previewText}>
                LOCAL PREVIEW
              </Text>
            </View>
          ) : null}
        </View>
        <Text maxFontSizeMultiplier={1.45} style={styles.title}>
          {title}
        </Text>
        {children}
      </ScrollView>
      {showTabs && mode !== 'venue staff' ? <RoleTabBar mode={mode} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: appColors.canvas, flex: 1 },
  page: { padding: 20, paddingBottom: 46 },
  brandRow: { alignItems: 'center', flexDirection: 'row' },
  mark: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  brandCopy: { flex: 1, marginLeft: 10 },
  brand: { color: appColors.ink, fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  mode: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 1 },
  previewBadge: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  previewText: { color: appColors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  title: {
    color: appColors.ink,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.9,
    lineHeight: 37,
    marginTop: 22,
  },
  tabBar: {
    backgroundColor: appColors.card,
    borderTopColor: appColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingBottom: 4,
    paddingHorizontal: 7,
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 62,
    paddingTop: 7,
    position: 'relative',
  },
  tabIndicator: {
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    height: 3,
    left: 13,
    position: 'absolute',
    right: 13,
    top: 0,
  },
  tabText: { color: appColors.muted, fontSize: 9, fontWeight: '800', marginTop: 3 },
});
