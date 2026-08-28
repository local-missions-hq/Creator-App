import { Ionicons } from './DecorativeIcon';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from './AccessiblePressable';

import { useMobileAuthSession } from '../lib/auth-session-context';
import type { OidcProviderIntent } from '../lib/oidc-client';
import { createLocalOidcPreview } from '../lib/oidc-preview';
import { appColors } from './theme';

type Provider = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  primary?: boolean;
  provider: OidcProviderIntent;
};

type SignInScreenProps = {
  accent: string;
  createLabel: string;
  eyebrow: string;
  headline: string;
  onboardingHref: Href;
  providers: Provider[];
  role: 'business' | 'creator';
};

const colors = appColors;

export function SignInScreen({
  accent,
  createLabel,
  eyebrow,
  headline,
  onboardingHref,
  providers,
  role,
}: SignInScreenProps) {
  const router = useRouter();
  const auth = useMobileAuthSession();
  const [preparedProvider, setPreparedProvider] = useState<string>();
  const [preparationFailed, setPreparationFailed] = useState(false);

  const prepareLocalBoundary = async (provider: Provider) => {
    if (auth.dataMode !== 'local-preview') {
      setPreparationFailed(true);
      setPreparedProvider(undefined);
      return;
    }
    try {
      await createLocalOidcPreview(provider.provider);
      setPreparedProvider(provider.label);
      setPreparationFailed(false);
    } catch {
      setPreparedProvider(undefined);
      setPreparationFailed(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
            testID={`${role}-sign-in-back`}
          >
            <Ionicons color={colors.ink} name="chevron-back" size={24} />
          </Pressable>
          <View style={styles.previewPill}>
            <Text style={styles.previewPillText}>LOCAL PREVIEW</Text>
          </View>
        </View>

        <View style={styles.brand}>
          <View style={[styles.brandMark, { backgroundColor: accent }]}>
            <Ionicons color={colors.card} name="location" size={26} />
          </View>
          <View>
            <Text style={styles.brandLocal}>LOCAL</Text>
            <Text style={[styles.brandMissions, { color: accent }]}>MISSIONS</Text>
          </View>
        </View>

        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.subhead}>
            One identity can hold Creator and Business roles. You can switch modes after sign-in.
          </Text>
        </View>

        <View style={styles.providerList}>
          {providers.map((provider) => (
            <Pressable
              accessibilityHint={`Prepares a protected ${provider.label} browser request without opening a provider in local preview`}
              accessibilityLabel={`Continue with ${provider.label}`}
              accessibilityRole="button"
              key={provider.label}
              onPress={() => void prepareLocalBoundary(provider)}
              style={({ pressed }) => [
                styles.providerButton,
                provider.primary && styles.primaryProvider,
                pressed && styles.pressed,
              ]}
              testID={`${role}-sign-in-${provider.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            >
              <Ionicons
                color={provider.primary ? colors.card : accent}
                name={provider.icon}
                size={25}
              />
              <Text style={[styles.providerText, provider.primary && styles.primaryProviderText]}>
                Continue with {provider.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {preparedProvider || preparationFailed ? (
          <View
            accessibilityLabel={
              preparedProvider
                ? `${preparedProvider} secure browser request ready. No provider was opened.`
                : 'Secure browser request unavailable. No provider was opened.'
            }
            style={[styles.oidcState, preparationFailed && styles.oidcStateError]}
            testID={`${role}-oidc-boundary-state`}
          >
            <Ionicons
              color={preparationFailed ? colors.orange : colors.success}
              name={preparationFailed ? 'alert-circle-outline' : 'shield-checkmark-outline'}
              size={23}
            />
            <View style={styles.oidcStateCopy}>
              <Text style={styles.oidcStateTitle}>
                {preparationFailed
                  ? 'Secure request unavailable'
                  : `${preparedProvider} request ready`}
              </Text>
              <Text style={styles.oidcStateDetail}>
                {preparationFailed
                  ? 'Configuration failed closed · no browser opened'
                  : 'PKCE + state + nonce prepared · no browser or provider opened'}
              </Text>
            </View>
            <Text style={styles.oidcStateBadge}>{preparationFailed ? 'BLOCKED' : 'READY'}</Text>
          </View>
        ) : null}

        {auth.dataMode === 'local-preview' ? (
          <Pressable
            accessibilityHint="Uses synthetic memory-only state and does not contact an identity provider"
            accessibilityLabel={`Open the ${role} local preview`}
            accessibilityRole="button"
            onPress={() => {
              auth.startLocalPreview(role);
              router.replace(role === 'creator' ? '/creator/discover' : '/business/dashboard');
            }}
            style={styles.previewSessionButton}
            testID={`${role}-open-local-preview`}
          >
            <Ionicons color={accent} name="phone-portrait-outline" size={21} />
            <View style={styles.previewSessionCopy}>
              <Text style={styles.previewSessionTitle}>Open safe local preview</Text>
              <Text style={styles.previewSessionDetail}>Memory only · no token · no provider</Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.securityNote}>
          <Ionicons color={accent} name="shield-checkmark-outline" size={25} />
          <Text style={styles.securityText}>
            Secure sign-in opens in the system browser. Local Missions never sees your password.
          </Text>
        </View>

        <Pressable
          accessibilityLabel={createLabel}
          accessibilityRole="button"
          onPress={() => router.push(onboardingHref)}
          style={styles.createRow}
          testID={`${role}-start-onboarding`}
        >
          <Text style={styles.createPrompt}>
            {role === 'creator' ? 'New creator?' : 'New business?'}
          </Text>
          <Text style={[styles.createLink, { color: accent }]}>{createLabel}</Text>
        </Pressable>

        <Text style={styles.footer}>Adult-only Orlando pilot · No live payments</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  page: { padding: 22, paddingBottom: 38 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  previewPill: {
    backgroundColor: colors.tealSoft,
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  previewPillText: { color: colors.teal, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 28,
  },
  brandMark: {
    alignItems: 'center',
    borderRadius: 22,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  brandLocal: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 1.5,
    lineHeight: 22,
  },
  brandMissions: { fontSize: 21, fontWeight: '800', letterSpacing: 1.5, lineHeight: 22 },
  heading: { alignItems: 'center', marginTop: 34 },
  eyebrow: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  headline: {
    color: colors.ink,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.2,
    marginTop: 9,
    textAlign: 'center',
  },
  subhead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 350,
    textAlign: 'center',
  },
  providerList: { gap: 12, marginTop: 34 },
  providerButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 18,
  },
  primaryProvider: { backgroundColor: colors.ink, borderColor: colors.ink },
  providerText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  primaryProviderText: { color: colors.card },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  oidcState: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    marginTop: 13,
    padding: 13,
  },
  oidcStateError: { backgroundColor: colors.orangeSoft },
  oidcStateCopy: { flex: 1 },
  oidcStateTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  oidcStateDetail: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 2 },
  oidcStateBadge: { color: colors.ink, fontSize: 8, fontWeight: '900' },
  previewSessionButton: {
    alignItems: 'center',
    backgroundColor: colors.tealSoft,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 11,
    marginTop: 13,
    padding: 13,
  },
  previewSessionCopy: { flex: 1 },
  previewSessionTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  previewSessionDetail: { color: colors.muted, fontSize: 10, marginTop: 2 },
  securityNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 25,
    paddingHorizontal: 9,
  },
  securityText: { color: colors.muted, flex: 1, fontSize: 13, lineHeight: 19 },
  createRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 29,
  },
  createPrompt: { color: colors.muted, fontSize: 15 },
  createLink: { fontSize: 15, fontWeight: '800', textDecorationLine: 'underline' },
  footer: { color: colors.muted, fontSize: 11, marginTop: 28, textAlign: 'center' },
});
