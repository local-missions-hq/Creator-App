import { Ionicons } from './DecorativeIcon';
import { type Href, useRouter } from 'expo-router';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from './AccessiblePressable';

import { useMobileAuthSession } from '../lib/auth-session-context';
import type { OidcProviderIntent } from '../lib/oidc-client';
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
  const signInBusy = ['exchanging', 'opening_browser', 'preparing'].includes(
    auth.signInState.phase,
  );
  const activeProviderIntent =
    auth.signInState.phase === 'idle' ? undefined : auth.signInState.provider;
  const activeProvider = providers.find((provider) => provider.provider === activeProviderIntent);
  const goToSignedInRoute = () =>
    router.replace(role === 'creator' ? '/creator/discover' : '/business/dashboard');
  const beginProviderSignIn = async (provider: Provider) => {
    const result = await auth.beginSignIn(provider.provider, role);
    if (result.status === 'authenticated') goToSignedInRoute();
  };

  const statePresentation = (() => {
    switch (auth.signInState.phase) {
      case 'preparing':
        return {
          badge: 'SECURE',
          detail: 'Creating a one-use PKCE request',
          icon: 'shield-checkmark-outline' as const,
          title: `Securing ${activeProvider?.label ?? 'sign-in'}`,
        };
      case 'opening_browser':
        return {
          badge: 'WAITING',
          detail: 'Finish or cancel in the protected system browser',
          icon: 'open-outline' as const,
          title: 'Waiting for browser',
        };
      case 'exchanging':
        return {
          badge: 'VERIFYING',
          detail: 'Checking the return and starting your Local Missions session',
          icon: 'shield-checkmark-outline' as const,
          title: 'Verifying your account',
        };
      case 'request_ready':
        return {
          badge: 'READY',
          detail: 'PKCE + state + nonce prepared · no browser or provider opened',
          icon: 'shield-checkmark-outline' as const,
          title: `${activeProvider?.label ?? 'Secure'} request ready`,
        };
      case 'cancelled':
        return {
          badge: 'CANCELED',
          detail: 'Nothing was changed. You can safely try again.',
          error: true,
          icon: 'close-circle-outline' as const,
          title: 'Sign-in canceled',
        };
      case 'error':
        return {
          badge: 'BLOCKED',
          detail:
            auth.signInState.code === 'configuration_unavailable'
              ? 'External sign-in is not configured · no provider opened'
              : 'The secure sign-in could not finish. No password was shared.',
          error: true,
          icon: 'alert-circle-outline' as const,
          title:
            auth.signInState.code === 'configuration_unavailable'
              ? 'Sign-in not configured'
              : 'Sign-in needs another try',
        };
      default:
        return undefined;
    }
  })();

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
              disabled={signInBusy}
              key={provider.label}
              onPress={() => void beginProviderSignIn(provider)}
              style={({ pressed }) => [
                styles.providerButton,
                provider.primary && styles.primaryProvider,
                signInBusy && styles.disabled,
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

        {statePresentation ? (
          <View
            accessibilityLabel={`${statePresentation.title}. ${statePresentation.detail}`}
            style={[styles.oidcState, statePresentation.error && styles.oidcStateError]}
            testID={`${role}-oidc-boundary-state`}
          >
            {signInBusy ? (
              <ActivityIndicator color={accent} size="small" />
            ) : (
              <Ionicons
                color={statePresentation.error ? colors.orange : colors.success}
                name={statePresentation.icon}
                size={23}
              />
            )}
            <View style={styles.oidcStateCopy}>
              <Text style={styles.oidcStateTitle}>{statePresentation.title}</Text>
              <Text style={styles.oidcStateDetail}>{statePresentation.detail}</Text>
            </View>
            <Text style={styles.oidcStateBadge}>{statePresentation.badge}</Text>
          </View>
        ) : null}

        {auth.signInState.phase === 'cancelled' || auth.signInState.phase === 'error' ? (
          <Pressable
            accessibilityLabel={`Retry with ${activeProvider?.label ?? 'the selected provider'}`}
            accessibilityRole="button"
            onPress={() => {
              const provider = activeProvider ?? providers[0];
              if (provider) void beginProviderSignIn(provider);
            }}
            style={styles.retryButton}
            testID={`${role}-sign-in-retry`}
          >
            <Ionicons color={accent} name="refresh-outline" size={18} />
            <Text style={[styles.retryText, { color: accent }]}>Try again</Text>
          </Pressable>
        ) : null}

        {auth.signInState.phase === 'workspace_required' ? (
          <View style={styles.workspacePanel} testID={`${role}-workspace-selection`}>
            <Text style={styles.workspaceEyebrow}>CHOOSE A BUSINESS</Text>
            <Text style={styles.workspaceTitle}>Which workspace are you entering?</Text>
            <Text style={styles.workspaceDetail}>
              Your role and campaign access change with this choice. You can switch later.
            </Text>
            <View style={styles.workspaceList}>
              {auth.signInState.workspaces.map((workspace) => (
                <Pressable
                  accessibilityLabel={`Continue to ${workspace.name}`}
                  accessibilityRole="button"
                  key={workspace.publicId}
                  onPress={() => {
                    void auth.chooseWorkspace(workspace.publicId).then(goToSignedInRoute);
                  }}
                  style={({ pressed }) => [styles.workspaceButton, pressed && styles.pressed]}
                  testID={`business-workspace-${workspace.publicId}`}
                >
                  <View style={[styles.workspaceIcon, { backgroundColor: accent }]}>
                    <Ionicons color={colors.card} name="storefront-outline" size={20} />
                  </View>
                  <View style={styles.workspaceCopy}>
                    <Text style={styles.workspaceName}>{workspace.name}</Text>
                    <Text style={styles.workspaceRole}>
                      {workspace.role === 'business_owner' ? 'Owner' : 'Manager'}
                    </Text>
                  </View>
                  <Ionicons color={colors.muted} name="chevron-forward" size={19} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {auth.dataMode === 'local-preview' ? (
          <Pressable
            accessibilityHint="Uses synthetic memory-only state and does not contact an identity provider"
            accessibilityLabel={`Open the ${role} local preview`}
            accessibilityRole="button"
            disabled={signInBusy}
            onPress={() => {
              auth.startLocalPreview(role);
              if (role === 'creator') goToSignedInRoute();
            }}
            style={[styles.previewSessionButton, signInBusy && styles.disabled]}
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
  disabled: { opacity: 0.5 },
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
  retryButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 7,
    paddingHorizontal: 13,
  },
  retryText: { fontSize: 12, fontWeight: '900' },
  workspacePanel: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  workspaceEyebrow: { color: colors.teal, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  workspaceTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 5 },
  workspaceDetail: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  workspaceList: { gap: 9, marginTop: 13 },
  workspaceButton: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    padding: 10,
  },
  workspaceIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  workspaceCopy: { flex: 1 },
  workspaceName: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  workspaceRole: { color: colors.muted, fontSize: 10, marginTop: 2 },
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
