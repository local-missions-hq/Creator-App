import { Ionicons } from '../components/DecorativeIcon';
import Constants from 'expo-constants';
import { Link, type Href } from 'expo-router';
import { ImageBackground, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../components/AccessiblePressable';

import heroImage from '../../../docs/business-plan/assets/local-missions-cover-hero.png';
import { environmentLabel } from '../lib/environment';

const colors = {
  canvas: '#fff7ed',
  card: '#ffffff',
  ink: '#102a43',
  muted: '#526273',
  line: '#e5d8c8',
  teal: '#007c83',
  tealSoft: '#e8f5f3',
  orange: '#cf3f1f',
  orangeSoft: '#fff0e3',
};

type RoleCardProps = {
  accent: string;
  accentSoft: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
  title: string;
  testID: string;
};

function Brand() {
  return (
    <View accessibilityLabel="Local Missions" style={styles.brand}>
      <View style={styles.pin}>
        <View style={styles.pinCenter}>
          <View style={styles.pinSpark} />
        </View>
      </View>
      <View>
        <Text style={styles.brandLocal}>Local</Text>
        <Text style={styles.brandMissions}>Missions</Text>
      </View>
    </View>
  );
}

function RoleCard({ accent, accentSoft, description, href, icon, testID, title }: RoleCardProps) {
  return (
    <Link asChild href={href}>
      <Pressable
        accessibilityHint={description}
        accessibilityLabel={title}
        accessibilityRole="button"
        style={({ pressed }) => [styles.roleCard, pressed && styles.roleCardPressed]}
        testID={testID}
      >
        <View style={[styles.roleIcon, { backgroundColor: accentSoft }]}>
          <Ionicons color={accent} name={icon} size={34} />
        </View>
        <View style={styles.roleCopy}>
          <Text style={styles.roleTitle}>{title}</Text>
          <Text style={styles.roleDescription}>{description}</Text>
        </View>
        <View style={[styles.roleArrow, { backgroundColor: accent }]}>
          <Ionicons color={colors.card} name="chevron-forward" size={25} />
        </View>
      </Pressable>
    </Link>
  );
}

export default function HomeScreen() {
  const appEnvironment = environmentLabel(Constants.expoConfig?.extra?.appEnvironment);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView bounces={false} contentContainerStyle={styles.page}>
        <View style={styles.intro}>
          <Brand />
          <Text lineBreakStrategyIOS="hangul-word" maxFontSizeMultiplier={1.6} style={styles.title}>
            Turn local experiences into paid missions.
          </Text>
          <Text lineBreakStrategyIOS="hangul-word" maxFontSizeMultiplier={1.6} style={styles.body}>
            Businesses fund real visits. Creators complete clear deliverables and get paid.
          </Text>
        </View>

        <ImageBackground
          accessibilityLabel="Local creators visiting an Orlando-area business"
          imageStyle={styles.heroImage}
          resizeMode="cover"
          source={heroImage}
          style={styles.hero}
        >
          <View style={styles.heroShade} />
          <View style={styles.heroBadge}>
            <Ionicons color={colors.teal} name="location" size={14} />
            <Text style={styles.heroBadgeText}>ORLANDO PILOT</Text>
          </View>
        </ImageBackground>

        <View style={styles.roles}>
          <RoleCard
            accent={colors.teal}
            accentSoft={colors.tealSoft}
            description="Find and complete paid local missions"
            href="/creator/sign-in"
            icon="camera-outline"
            title="I’m a Creator"
            testID="home-select-creator-role"
          />
          <RoleCard
            accent={colors.orange}
            accentSoft={colors.orangeSoft}
            description="Create and fund a local campaign"
            href="/business/sign-in"
            icon="storefront-outline"
            title="I’m a Business"
            testID="home-select-business-role"
          />
        </View>

        <View style={styles.accountLinks}>
          <Pressable
            accessibilityLabel="Sign in to an existing account preview"
            accessibilityRole="button"
            style={styles.signInRow}
            testID="home-existing-account-sign-in"
          >
            <Text style={styles.signInPrompt}>Already have an account?</Text>
            <Text style={styles.signInLink}>Sign in</Text>
          </Pressable>
          <Link asChild href="/venue/check-in">
            <Pressable
              accessibilityLabel="Open authorized Venue Staff demo"
              accessibilityRole="button"
              style={styles.staffLink}
              testID="open-venue-staff-demo"
            >
              <Ionicons color={colors.teal} name="key-outline" size={16} />
              <Text style={styles.staffLinkText}>Authorized Venue Staff demo</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.environmentNotice}>
          <Text style={styles.environmentTitle}>v0.1.0 · {appEnvironment}</Text>
          <Text style={styles.environmentBody}>Test data only · No live payments</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  page: { paddingBottom: 30 },
  intro: { alignItems: 'center', paddingHorizontal: 26, paddingTop: 20 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  pin: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 18,
    height: 50,
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    width: 50,
  },
  pinCenter: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  pinSpark: {
    backgroundColor: colors.orange,
    height: 13,
    transform: [{ rotate: '45deg' }],
    width: 13,
  },
  brandLocal: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 28,
  },
  brandMissions: {
    color: colors.teal,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 29,
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.1,
    lineHeight: 39,
    marginTop: 25,
    textAlign: 'center',
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 350,
    textAlign: 'center',
  },
  hero: {
    height: 210,
    justifyContent: 'flex-end',
    marginTop: 24,
    overflow: 'hidden',
  },
  heroImage: { opacity: 0.96 },
  heroShade: {
    backgroundColor: 'rgba(16, 42, 67, 0.10)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 5,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  roles: { gap: 13, marginTop: -20, paddingHorizontal: 18 },
  roleCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    minHeight: 116,
    padding: 16,
    shadowColor: colors.ink,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  roleCardPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  roleIcon: {
    alignItems: 'center',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  roleCopy: { flex: 1, gap: 5 },
  roleTitle: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.5 },
  roleDescription: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  roleArrow: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  accountLinks: { alignItems: 'center', paddingBottom: 20, paddingTop: 24 },
  signInRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  signInPrompt: { color: colors.muted, fontSize: 15 },
  signInLink: { color: colors.teal, fontSize: 15, fontWeight: '800' },
  staffLink: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 13, padding: 5 },
  staffLinkText: { color: colors.teal, fontSize: 12, fontWeight: '800' },
  environmentNotice: { alignItems: 'center', gap: 3 },
  environmentTitle: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  environmentBody: { color: colors.muted, fontSize: 10 },
});
