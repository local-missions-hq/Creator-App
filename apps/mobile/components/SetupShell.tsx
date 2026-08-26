import { Ionicons } from './DecorativeIcon';
import { useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from './AccessiblePressable';

import { appColors } from './theme';

type SetupShellProps = PropsWithChildren<{
  accent: string;
  eyebrow: string;
  stepCount: number;
  title: string;
}>;

const colors = appColors;

export function SetupShell({ accent, children, eyebrow, stepCount, title }: SetupShellProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
            testID="setup-go-back"
          >
            <Ionicons color={colors.ink} name="chevron-back" size={24} />
          </Pressable>
          <Text style={[styles.preview, { color: accent }]}>LOCAL PREVIEW</Text>
        </View>

        <View accessibilityLabel={`Step 1 of ${stepCount}`} style={styles.progressRow}>
          {Array.from({ length: stepCount }, (_, index) => (
            <View
              key={index}
              style={[
                styles.progressSegment,
                { backgroundColor: index === 0 ? accent : colors.line },
              ]}
            />
          ))}
        </View>

        <Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export const setupColors = colors;

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  page: { padding: 20, paddingBottom: 42 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  preview: { fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  progressRow: { flexDirection: 'row', gap: 8, marginTop: 25 },
  progressSegment: { borderRadius: 4, flex: 1, height: 6 },
  eyebrow: { fontSize: 14, fontWeight: '800', marginTop: 18 },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 39,
    marginTop: 8,
  },
});
