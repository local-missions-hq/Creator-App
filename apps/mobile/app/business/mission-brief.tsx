import { Ionicons } from '../../components/DecorativeIcon';
import { Link, useRouter } from 'expo-router';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';

const templates = [
  'Visit & Create',
  'Visit & Share',
  'Event Attendance',
  'Private Feedback',
] as const;

const fields = [
  { icon: 'star-outline', label: 'Mission title', value: 'Family Adventure Preview' },
  { icon: 'flag-outline', label: 'Objective', value: 'Drive a verified in-person visit' },
  {
    icon: 'document-text-outline',
    label: 'Plain-language brief',
    value: 'Show families why Demo Family Fun Center is a memorable Orlando day out.',
  },
] as const;

export default function BusinessMissionBriefScreen() {
  const router = useRouter();
  const { fontScale, width } = useWindowDimensions();
  const useExpandedLayout = width < 390 || fontScale > 1.4;
  const previewOnly = () =>
    Alert.alert('Local preview only', 'This draft is synthetic and is not being saved or funded.');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.back}
            testID="business-mission-brief-back"
          >
            <Ionicons color={appColors.ink} name="chevron-back" size={23} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>STEP 1 OF 4</Text>
            <Text style={styles.headerTitle}>Create mission</Text>
          </View>
          <Pressable
            accessibilityLabel="Preview saving the mission draft"
            accessibilityRole="button"
            onPress={previewOnly}
            style={styles.saveButton}
            testID="business-preview-save-draft"
          >
            <Ionicons color={appColors.teal} name="bookmark-outline" size={18} />
          </Pressable>
        </View>

        <View style={styles.progress}>
          {[0, 1, 2, 3].map((step) => (
            <View
              key={step}
              style={[styles.progressSegment, step === 0 && styles.progressActive]}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Choose a mission type</Text>
        <Text style={styles.sectionBody}>
          Templates keep the work objective and easy to review.
        </Text>
        <View style={[styles.templates, useExpandedLayout && styles.templatesExpanded]}>
          {templates.map((template, index) => (
            <Pressable
              accessibilityLabel={`Select ${template} mission template`}
              accessibilityRole="button"
              accessibilityState={{ selected: index === 0 }}
              key={template}
              onPress={previewOnly}
              style={[
                styles.template,
                useExpandedLayout && styles.templateExpanded,
                index === 0 && styles.templateActive,
              ]}
              testID={`business-template-${template.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            >
              <Ionicons
                color={index === 0 ? '#ffffff' : appColors.teal}
                name={index === 0 ? 'camera-outline' : 'ellipse-outline'}
                size={20}
              />
              <Text style={[styles.templateText, index === 0 && styles.templateTextActive]}>
                {template}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Build the mission brief</Text>
          {fields.map((field) => (
            <View key={field.label} style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Ionicons color={appColors.teal} name={field.icon} size={17} />
                <Text style={styles.fieldLabel}>{field.label}</Text>
              </View>
              <Pressable
                accessibilityLabel={`Edit ${field.label}. Current value: ${field.value}`}
                accessibilityRole="button"
                onPress={previewOnly}
                style={styles.field}
                testID={`business-brief-${field.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              >
                <Text style={styles.fieldText}>{field.value}</Text>
              </Pressable>
            </View>
          ))}

          <View style={[styles.twoColumn, useExpandedLayout && styles.twoColumnExpanded]}>
            <View style={styles.half}>
              <Text style={styles.fieldLabel}>Date & time</Text>
              <Pressable
                accessibilityLabel="Edit mission date and time. Current value: Wednesday, August 28, 2 to 4 PM"
                accessibilityRole="button"
                onPress={previewOnly}
                style={styles.smallField}
                testID="business-brief-date-time"
              >
                <Text style={styles.smallValue}>Wed, Aug 28</Text>
                <Text style={styles.smallMeta}>2:00–4:00 PM</Text>
              </Pressable>
            </View>
            <View style={styles.half}>
              <Text style={styles.fieldLabel}>Community Slots</Text>
              <Pressable
                accessibilityLabel="Edit Community Slot count and reward. Current value: 10 creators at 50 dollars each"
                accessibilityRole="button"
                onPress={previewOnly}
                style={styles.smallField}
                testID="business-brief-community-slots"
              >
                <Text style={styles.smallValue}>10 creators</Text>
                <Text style={styles.smallMeta}>$50 each</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View
          accessible
          accessibilityLabel="Creator preview. Demo Family Fun Center. Family Adventure Preview. Orlando, Wednesday August 28, 2 to 4 PM. 50 dollars guaranteed. 10 Community Slots."
          style={styles.previewCard}
        >
          <View style={styles.previewHeader}>
            <Ionicons color={appColors.teal} name="eye-outline" size={22} />
            <Text style={styles.previewTitle}>Creator preview</Text>
          </View>
          <View style={styles.previewBody}>
            <Text style={styles.previewBusiness}>DEMO FAMILY FUN CENTER</Text>
            <Text style={styles.previewMission}>Family Adventure Preview</Text>
            <Text style={styles.previewMeta}>Orlando · Wed, Aug 28 · 2–4 PM</Text>
            <View style={styles.previewReward}>
              <Text style={styles.previewRewardText}>$50 guaranteed · 10 Community Slots</Text>
            </View>
          </View>
        </View>

        <View
          accessible
          accessibilityLabel="Creator Reward Pool: 500 dollars. Estimated total due: 575 dollars."
          style={[styles.budgetCard, useExpandedLayout && styles.budgetCardExpanded]}
        >
          <View>
            <Text style={styles.budgetLabel}>Creator Reward Pool</Text>
            <Text style={styles.budgetValue}>$500</Text>
          </View>
          <View style={[styles.totalCopy, useExpandedLayout && styles.totalCopyExpanded]}>
            <Text style={styles.totalLabel}>Estimated total due</Text>
            <Text style={styles.totalValue}>$575</Text>
          </View>
        </View>
        <Text style={styles.feeNote}>
          Includes a transparent 15% platform fee. No charge until Fund and Publish.
        </Text>

        <Link asChild href="/business/deliverables-rights">
          <Pressable
            accessibilityLabel="Continue to mission deliverables and rights"
            accessibilityRole="button"
            style={styles.continueButton}
            testID="business-brief-continue"
          >
            <Text style={styles.continueText}>Continue to deliverables</Text>
            <Ionicons color="#ffffff" name="arrow-forward" size={21} />
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: appColors.canvas, flex: 1 },
  page: { padding: 18, paddingBottom: 44 },
  header: { alignItems: 'center', flexDirection: 'row' },
  back: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: { flex: 1, marginLeft: 12 },
  headerEyebrow: { color: appColors.orange, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  headerTitle: { color: appColors.ink, fontSize: 23, fontWeight: '900', marginTop: 2 },
  saveButton: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.teal,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  progress: { flexDirection: 'row', gap: 7, marginTop: 19 },
  progressSegment: { backgroundColor: appColors.line, borderRadius: 3, flex: 1, height: 6 },
  progressActive: { backgroundColor: appColors.orange },
  sectionTitle: { color: appColors.ink, fontSize: 22, fontWeight: '900', marginTop: 22 },
  sectionBody: { color: appColors.muted, fontSize: 12, marginTop: 4 },
  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 },
  templatesExpanded: { flexDirection: 'column' },
  template: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 7,
    minHeight: 49,
    paddingHorizontal: 12,
  },
  templateExpanded: { flexBasis: 'auto', width: '100%' },
  templateActive: { backgroundColor: appColors.teal, borderColor: appColors.teal },
  templateText: { color: appColors.ink, flex: 1, fontSize: 11, fontWeight: '800' },
  templateTextActive: { color: '#ffffff' },
  card: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  cardTitle: { color: appColors.ink, fontSize: 19, fontWeight: '900' },
  fieldGroup: { marginTop: 14 },
  fieldLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 6 },
  fieldLabel: { color: appColors.ink, fontSize: 12, fontWeight: '800' },
  field: {
    borderColor: '#cfd5da',
    borderRadius: 11,
    borderWidth: 1,
    minHeight: 47,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  fieldText: { color: appColors.ink, fontSize: 13, lineHeight: 18 },
  twoColumn: { flexDirection: 'row', gap: 10, marginTop: 14 },
  twoColumnExpanded: { flexDirection: 'column' },
  half: { flex: 1 },
  smallField: {
    borderColor: '#cfd5da',
    borderRadius: 11,
    borderWidth: 1,
    marginTop: 6,
    minHeight: 59,
    padding: 10,
  },
  smallValue: { color: appColors.ink, fontSize: 12, fontWeight: '800' },
  smallMeta: { color: appColors.muted, fontSize: 10, marginTop: 4 },
  previewCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    overflow: 'hidden',
  },
  previewHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, padding: 14 },
  previewTitle: { color: appColors.ink, fontSize: 17, fontWeight: '900' },
  previewBody: { backgroundColor: appColors.tealSoft, padding: 16 },
  previewBusiness: { color: appColors.teal, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  previewMission: { color: appColors.ink, fontSize: 20, fontWeight: '900', marginTop: 5 },
  previewMeta: { color: appColors.muted, fontSize: 11, marginTop: 5 },
  previewReward: {
    alignSelf: 'flex-start',
    backgroundColor: appColors.orange,
    borderRadius: 12,
    marginTop: 11,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  previewRewardText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  budgetCard: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    padding: 15,
  },
  budgetCardExpanded: { alignItems: 'flex-start', gap: 12 },
  budgetLabel: { color: appColors.muted, fontSize: 10 },
  budgetValue: { color: appColors.ink, fontSize: 22, fontWeight: '900', marginTop: 3 },
  totalCopy: { alignItems: 'flex-end' },
  totalCopyExpanded: { alignItems: 'flex-start' },
  totalLabel: { color: appColors.muted, fontSize: 10 },
  totalValue: { color: appColors.orange, fontSize: 22, fontWeight: '900', marginTop: 3 },
  feeNote: {
    color: appColors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  continueButton: {
    alignItems: 'center',
    backgroundColor: appColors.orange,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 15,
    padding: 17,
  },
  continueText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});
