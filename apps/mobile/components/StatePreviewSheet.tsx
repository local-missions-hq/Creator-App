import { Ionicons } from './DecorativeIcon';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from './AccessiblePressable';

import { appColors } from './AppShell';
import { SemanticStateCard, type SemanticState } from './SemanticStateCard';

const creatorStates: Array<{ body: string; state: SemanticState; title: string }> = [
  {
    body: 'Two local opportunities were refreshed just now.',
    state: 'success',
    title: 'Missions updated',
  },
  {
    body: 'One mission closes in 45 minutes. Reward and requirements are unchanged.',
    state: 'warning',
    title: 'Application window closing',
  },
  {
    body: 'Nothing was submitted. Retry without losing your filters.',
    state: 'error',
    title: 'Missions could not load',
  },
  {
    body: 'The business has not decided yet. Your application is still active.',
    state: 'pending',
    title: 'Application pending',
  },
  {
    body: 'New applications are paused for this mission. Accepted work is unaffected.',
    state: 'locked',
    title: 'Applications paused',
  },
  {
    body: 'Try a wider time or distance band. Community access is unchanged.',
    state: 'empty',
    title: 'No matching missions yet',
  },
  {
    body: 'Using your saved locality and filters to find nearby work.',
    state: 'loading',
    title: 'Loading nearby missions',
  },
  {
    body: 'Showing saved results. Applying or submitting waits for a connection.',
    state: 'offline',
    title: 'You are offline',
  },
];

const businessStates: Array<{ body: string; state: SemanticState; title: string }> = [
  {
    body: 'The campaign summary is current and all amounts reconcile.',
    state: 'success',
    title: 'Campaign data updated',
  },
  {
    body: 'Two submissions need an objective decision within 24 hours.',
    state: 'warning',
    title: 'Review deadline approaching',
  },
  {
    body: 'Nothing changed. Retry the dashboard refresh safely.',
    state: 'error',
    title: 'Dashboard could not refresh',
  },
  {
    body: 'Admin review is underway. Funding is not available yet.',
    state: 'pending',
    title: 'Campaign approval pending',
  },
  {
    body: 'New funding is paused by a safety gate. Existing obligations continue.',
    state: 'locked',
    title: 'Fund and Publish locked',
  },
  {
    body: 'Create a draft to begin; no payment method is charged during drafting.',
    state: 'empty',
    title: 'No campaigns yet',
  },
  {
    body: 'Loading campaign totals without changing any stored value.',
    state: 'loading',
    title: 'Loading dashboard',
  },
  {
    body: 'Showing saved campaign data. Funding and review actions wait for a connection.',
    state: 'offline',
    title: 'You are offline',
  },
];

export function StatePreviewSheet({
  mode,
  onDismiss,
  visible,
}: Readonly<{ mode: 'business' | 'creator'; onDismiss: () => void; visible: boolean }>) {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const accent = mode === 'business' ? appColors.orange : appColors.teal;
  const states = mode === 'business' ? businessStates : creatorStates;

  return (
    <Modal animationType="slide" onRequestClose={onDismiss} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Dismiss state previews"
          onPress={onDismiss}
          style={styles.backdrop}
          testID={`${mode}-dismiss-state-previews`}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.eyebrow, { color: accent }]}>
                LOCAL PROTOTYPE STATE SYSTEM
              </Text>
              <Text maxFontSizeMultiplier={1.45} style={styles.title}>
                {mode === 'business' ? 'Business' : 'Creator'} interface states
              </Text>
              <Text maxFontSizeMultiplier={1.5} style={styles.intro}>
                Every state names what happened, what remains safe, and what the user can do next.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close state previews"
              accessibilityRole="button"
              onPress={onDismiss}
              style={styles.close}
              testID={`${mode}-close-state-previews`}
            >
              <Ionicons color={appColors.ink} name="close" size={23} />
            </Pressable>
          </View>

          <ScrollView bounces={false} contentContainerStyle={styles.content}>
            {states.map((item) => (
              <SemanticStateCard
                actionLabel={
                  ['error', 'offline', 'locked'].includes(item.state)
                    ? item.state === 'locked'
                      ? 'Why is this locked?'
                      : 'Retry preview'
                    : undefined
                }
                body={item.body}
                key={item.state}
                onAction={
                  ['error', 'offline', 'locked'].includes(item.state)
                    ? () => setLastAction(`${item.state} action previewed`)
                    : undefined
                }
                state={item.state}
                testID={`${mode}-state-${item.state}`}
                title={item.title}
              />
            ))}
            {lastAction ? (
              <View style={styles.localResult}>
                <Ionicons color={appColors.teal} name="flask-outline" size={19} />
                <Text maxFontSizeMultiplier={1.5} style={styles.localResultText}>
                  {lastAction}. No request was sent.
                </Text>
              </View>
            ) : null}
            <Text maxFontSizeMultiplier={1.4} style={styles.footer}>
              Synthetic states only · No network, payment, identity, location, or message action
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    backgroundColor: appColors.scrim,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: appColors.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingHorizontal: 18,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: appColors.sheetHandle,
    borderRadius: 3,
    height: 5,
    marginTop: 9,
    width: 42,
  },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, marginTop: 13 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  title: { color: appColors.ink, fontSize: 22, fontWeight: '900', marginTop: 3 },
  intro: { color: appColors.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  close: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  content: { paddingBottom: 26 },
  localResult: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    marginTop: 11,
    padding: 12,
  },
  localResultText: { color: appColors.muted, flex: 1, fontSize: 9, fontWeight: '800' },
  footer: {
    color: appColors.muted,
    fontSize: 8,
    lineHeight: 12,
    marginTop: 14,
    textAlign: 'center',
  },
});
