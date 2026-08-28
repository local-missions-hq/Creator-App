import { Ionicons } from '../../components/DecorativeIcon';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { CreatorMissionShell } from '../../components/CreatorMissionShell';
import { useCreatorReachOverview } from '../../lib/use-reach-data';

type PlatformKey = 'instagram' | 'tiktok' | 'youtube';

const platforms: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  key: PlatformKey;
  label: string;
}> = [
  { icon: 'logo-instagram', key: 'instagram', label: 'Instagram' },
  { icon: 'logo-tiktok', key: 'tiktok', label: 'TikTok' },
  { icon: 'logo-youtube', key: 'youtube', label: 'YouTube' },
];

export default function CreatorReachScreen() {
  const { data, source } = useCreatorReachOverview();
  const [consentPreviewed, setConsentPreviewed] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>('instagram');
  const selected = platforms.find((platform) => platform.key === selectedPlatform) ?? platforms[0]!;

  return (
    <CreatorMissionShell badge="OPTIONAL" title="Reach analytics">
      <View style={styles.communityCard}>
        <View style={styles.communityIcon}>
          <Ionicons color={appColors.teal} name="people" size={25} />
        </View>
        <View style={styles.communityCopy}>
          <Text style={styles.communityTitle}>Community missions always stay open</Text>
          <Text style={styles.communityText}>
            You never need a follower minimum or social connection for Community Slots.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Choose one platform to preview</Text>
      <Text style={styles.sectionIntro}>
        Each platform qualifies separately. Audiences are never added together.
      </Text>

      <View style={styles.platformList}>
        {platforms.map((platform) => {
          const selectedPlatformCard = platform.key === selectedPlatform;
          const platformState = data.platforms.find((item) => item.platform === platform.key);
          const status = platformState?.qualification
            ? platformState.qualification.tier.replace('_', ' ').toUpperCase()
            : platformState?.connectionAvailable
              ? 'READY TO CONNECT'
              : selectedPlatformCard
                ? 'SETUP PREVIEW'
                : 'NOT CONNECTED';

          return (
            <Pressable
              accessibilityLabel={`Preview ${platform.label} Reach setup${selectedPlatformCard ? ', selected' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedPlatformCard }}
              key={platform.key}
              onPress={() => {
                setSelectedPlatform(platform.key);
                setConsentPreviewed(false);
              }}
              style={[styles.platformCard, selectedPlatformCard && styles.platformCardSelected]}
              testID={`creator-reach-platform-${platform.key}`}
            >
              <View
                style={[styles.platformIcon, selectedPlatformCard && styles.platformIconSelected]}
              >
                <Ionicons
                  color={selectedPlatformCard ? '#ffffff' : appColors.teal}
                  name={platform.icon}
                  size={24}
                />
              </View>
              <View style={styles.platformCopy}>
                <Text style={styles.platformName}>{platform.label}</Text>
                <Text style={styles.platformStatus}>{status}</Text>
              </View>
              <Ionicons
                color={selectedPlatformCard ? appColors.teal : appColors.muted}
                name={selectedPlatformCard ? 'checkmark-circle' : 'chevron-forward'}
                size={22}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <View style={styles.previewLogo}>
            <Ionicons color="#ffffff" name={selected.icon} size={24} />
          </View>
          <View style={styles.previewCopy}>
            <Text style={styles.previewEyebrow}>
              ILLUSTRATIVE {selected.label.toUpperCase()} RESULT
            </Text>
            <Text style={styles.previewTitle}>Level 2 · Current for 90 days</Text>
          </View>
        </View>

        <View style={styles.bandCard}>
          <Text style={styles.bandLabel}>Estimated verified local-audience band</Text>
          <Text style={styles.bandValue}>5,000–19,999</Text>
          <Text style={styles.bandMeta}>
            The Business sees “{selected.label} · Level 2,” not this range or raw analytics.
          </Text>
        </View>

        <View style={styles.steps}>
          {[
            ['1', 'Consent', 'Read-only access for this platform only'],
            ['2', 'Verify', 'Approved provider derives authenticity and local tier'],
            ['3', 'Choose', 'You decide whether to accept the higher paid offer'],
          ].map(([step, title, body]) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step}</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepBody}>{body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityLabel={
            consentPreviewed
              ? `Undo ${selected.label} consent preview`
              : `Preview consenting to ${selected.label} Reach analytics`
          }
          accessibilityRole="button"
          onPress={() => setConsentPreviewed((value) => !value)}
          style={[styles.consentButton, consentPreviewed && styles.consentButtonActive]}
          testID="creator-reach-preview-consent"
        >
          <Ionicons
            color={consentPreviewed ? '#ffffff' : appColors.orange}
            name={consentPreviewed ? 'checkmark-circle' : 'shield-checkmark-outline'}
            size={21}
          />
          <Text style={[styles.consentText, consentPreviewed && styles.consentTextActive]}>
            {consentPreviewed
              ? 'Consent previewed · no connection created'
              : 'Preview optional consent'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.privacyCard}>
        <Ionicons color={appColors.success} name="lock-closed-outline" size={25} />
        <Text style={styles.privacyText}>
          Revoking consent blocks only future Reach offers. It never cancels Community access or
          lowers a reward you already accepted.
        </Text>
      </View>
      <Text style={styles.footer}>
        {source === 'local-preview' ? 'Local preview only · ' : ''}No provider is enabled and no
        social account is contacted.
      </Text>
    </CreatorMissionShell>
  );
}

const styles = StyleSheet.create({
  communityCard: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 19,
    flexDirection: 'row',
    gap: 11,
    marginTop: 16,
    padding: 14,
  },
  communityIcon: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  communityCopy: { flex: 1 },
  communityTitle: { color: appColors.ink, fontSize: 14, fontWeight: '900' },
  communityText: { color: appColors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionTitle: { color: appColors.ink, fontSize: 20, fontWeight: '900', marginTop: 20 },
  sectionIntro: { color: appColors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  platformList: { gap: 9, marginTop: 12 },
  platformCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 66,
    padding: 10,
  },
  platformCardSelected: { borderColor: appColors.teal, borderWidth: 2 },
  platformIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  platformIconSelected: { backgroundColor: appColors.teal },
  platformCopy: { flex: 1 },
  platformName: { color: appColors.ink, fontSize: 14, fontWeight: '900' },
  platformStatus: { color: appColors.teal, fontSize: 8, fontWeight: '900', marginTop: 3 },
  previewCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  previewHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  previewLogo: {
    alignItems: 'center',
    backgroundColor: appColors.orange,
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  previewCopy: { flex: 1 },
  previewEyebrow: { color: appColors.orange, fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  previewTitle: { color: appColors.ink, fontSize: 16, fontWeight: '900', marginTop: 3 },
  bandCard: { backgroundColor: appColors.orangeSoft, borderRadius: 15, marginTop: 13, padding: 12 },
  bandLabel: { color: appColors.muted, fontSize: 9, fontWeight: '800' },
  bandValue: { color: appColors.ink, fontSize: 22, fontWeight: '900', marginTop: 3 },
  bandMeta: { color: appColors.warning, fontSize: 9, lineHeight: 14, marginTop: 4 },
  steps: { marginTop: 4 },
  stepRow: {
    alignItems: 'center',
    borderBottomColor: appColors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 11,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepNumberText: { color: appColors.teal, fontSize: 12, fontWeight: '900' },
  stepCopy: { flex: 1 },
  stepTitle: { color: appColors.ink, fontSize: 11, fontWeight: '900' },
  stepBody: { color: appColors.muted, fontSize: 9, lineHeight: 13, marginTop: 2 },
  consentButton: {
    alignItems: 'center',
    borderColor: appColors.orange,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 13,
    padding: 13,
  },
  consentButtonActive: { backgroundColor: appColors.orange },
  consentText: { color: appColors.orange, flexShrink: 1, fontSize: 11, fontWeight: '900' },
  consentTextActive: { color: '#ffffff' },
  privacyCard: {
    alignItems: 'center',
    backgroundColor: appColors.successSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    marginTop: 13,
    padding: 14,
  },
  privacyText: { color: appColors.success, flex: 1, fontSize: 10, lineHeight: 15 },
  footer: {
    color: appColors.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 10,
    textAlign: 'center',
  },
});
