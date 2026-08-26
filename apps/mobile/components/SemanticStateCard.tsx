import { Ionicons } from './DecorativeIcon';
import { ActivityIndicator, type ColorValue, StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from './AccessiblePressable';

import { appColors } from './AppShell';

export type SemanticState =
  'empty' | 'error' | 'loading' | 'locked' | 'offline' | 'pending' | 'success' | 'warning';

const stateTokens: Record<
  SemanticState,
  {
    background: ColorValue;
    foreground: ColorValue;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  success: {
    background: appColors.successSoft,
    foreground: appColors.success,
    icon: 'checkmark-circle-outline',
    label: 'Success',
  },
  warning: {
    background: appColors.warningSoft,
    foreground: appColors.warning,
    icon: 'warning-outline',
    label: 'Warning',
  },
  error: {
    background: appColors.errorSoft,
    foreground: appColors.error,
    icon: 'close-circle-outline',
    label: 'Error',
  },
  pending: {
    background: appColors.tealSoft,
    foreground: appColors.teal,
    icon: 'time-outline',
    label: 'Pending',
  },
  locked: {
    background: appColors.lockedSoft,
    foreground: appColors.locked,
    icon: 'lock-closed-outline',
    label: 'Locked',
  },
  empty: {
    background: appColors.card,
    foreground: appColors.locked,
    icon: 'file-tray-outline',
    label: 'Empty',
  },
  loading: {
    background: appColors.card,
    foreground: appColors.teal,
    icon: 'sync-outline',
    label: 'Loading',
  },
  offline: {
    background: appColors.warningSoft,
    foreground: appColors.warning,
    icon: 'cloud-offline-outline',
    label: 'Offline',
  },
};

export function SemanticStateCard({
  actionLabel,
  body,
  onAction,
  state,
  testID,
  title,
}: Readonly<{
  actionLabel?: string;
  body: string;
  onAction?: () => void;
  state: SemanticState;
  testID?: string;
  title: string;
}>) {
  const tokens = stateTokens[state];

  return (
    <View style={[styles.card, { backgroundColor: tokens.background }]} testID={testID}>
      <View
        accessible
        accessibilityLabel={`${tokens.label}: ${title}. ${body}`}
        accessibilityRole={state === 'loading' ? 'progressbar' : 'alert'}
        style={styles.header}
      >
        <View style={[styles.icon, { borderColor: tokens.foreground }]}>
          {state === 'loading' ? (
            <ActivityIndicator color={tokens.foreground} size="small" />
          ) : (
            <Ionicons color={tokens.foreground} name={tokens.icon} size={22} />
          )}
        </View>
        <View style={styles.copy}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.label, { color: tokens.foreground }]}>
            {tokens.label.toUpperCase()}
          </Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.title}>
            {title}
          </Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.body}>
            {body}
          </Text>
        </View>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={`${actionLabel} for ${tokens.label.toLowerCase()} state preview`}
          accessibilityRole="button"
          onPress={onAction}
          style={[styles.action, { borderColor: tokens.foreground }]}
          testID={`${testID}-action`}
        >
          <Text
            maxFontSizeMultiplier={1.4}
            style={[styles.actionText, { color: tokens.foreground }]}
          >
            {actionLabel}
          </Text>
          <Ionicons color={tokens.foreground} name="arrow-forward" size={17} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 11 },
  icon: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: { flex: 1 },
  label: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  title: { color: appColors.ink, fontSize: 14, fontWeight: '900', marginTop: 3 },
  body: { color: appColors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  action: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: appColors.card,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  actionText: { fontSize: 10, fontWeight: '900' },
});
