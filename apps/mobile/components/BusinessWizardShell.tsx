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

type BusinessWizardShellProps = PropsWithChildren<{
  step: number;
  title: string;
}>;

export function BusinessWizardShell({ children, step, title }: BusinessWizardShellProps) {
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
            testID="business-wizard-back"
          >
            <Ionicons color={appColors.ink} name="chevron-back" size={23} />
          </Pressable>
          {!useExpandedHeader ? (
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>STEP {step} OF 4</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <View style={styles.previewBadge}>
            <Text style={styles.previewText}>TEST</Text>
          </View>
        </View>
        {useExpandedHeader ? (
          <View style={styles.expandedHeaderCopy}>
            <Text style={styles.eyebrow}>STEP {step} OF 4</Text>
            <Text style={styles.expandedTitle}>{title}</Text>
          </View>
        ) : null}
        <View style={styles.progress}>
          {[1, 2, 3, 4].map((segment) => (
            <View key={segment} style={[styles.segment, segment <= step && styles.segmentActive]} />
          ))}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: appColors.canvas, flex: 1 },
  page: { padding: 18, paddingBottom: 46 },
  header: { alignItems: 'center', flexDirection: 'row' },
  back: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: { flex: 1, marginLeft: 12 },
  headerSpacer: { flex: 1 },
  expandedHeaderCopy: { marginTop: 10 },
  eyebrow: { color: appColors.orange, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  title: { color: appColors.ink, fontSize: 23, fontWeight: '900', marginTop: 2 },
  expandedTitle: { color: appColors.ink, fontSize: 23, fontWeight: '900', marginTop: 4 },
  previewBadge: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 48,
  },
  previewText: { color: appColors.orange, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  progress: { flexDirection: 'row', gap: 7, marginTop: 18 },
  segment: { backgroundColor: appColors.line, borderRadius: 3, flex: 1, height: 6 },
  segmentActive: { backgroundColor: appColors.orange },
});
