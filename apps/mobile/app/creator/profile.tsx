import { Ionicons } from '../../components/DecorativeIcon';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { SetupShell, setupColors } from '../../components/SetupShell';

const accent = '#007c83';

const profileItems = [
  { icon: 'location-outline', label: 'Home area', value: 'Orlando, FL' },
  { icon: 'star-outline', label: 'Interests', value: 'Family fun, Food, Attractions' },
  { icon: 'time-outline', label: 'Availability', value: 'Weekday afternoons' },
  { icon: 'camera-outline', label: 'Content abilities', value: 'Vertical video, Photography' },
] as const;

export default function CreatorProfileScreen() {
  const router = useRouter();
  const previewOnly = () =>
    Alert.alert('Local preview only', 'This setup data is synthetic and is not being saved yet.');

  return (
    <SetupShell
      accent={accent}
      eyebrow="Step 1 of 3"
      stepCount={3}
      title="Let’s build your creator profile"
    >
      <View style={styles.eligibilityCard}>
        <View style={styles.softIcon}>
          <Ionicons color={accent} name="shield-checkmark-outline" size={30} />
        </View>
        <View style={styles.itemCopy}>
          <Text style={styles.label}>Adult eligibility</Text>
          <View style={styles.checkedRow}>
            <Ionicons color="#159464" name="checkmark-circle" size={23} />
            <Text style={styles.value}>I am 18 or older</Text>
          </View>
        </View>
      </View>

      <View style={styles.list}>
        {profileItems.map((item) => (
          <Pressable
            accessibilityLabel={`Edit ${item.label}`}
            accessibilityRole="button"
            key={item.label}
            onPress={previewOnly}
            style={styles.itemCard}
            testID={`creator-profile-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          >
            <View style={styles.icon}>
              <Ionicons color="#ffffff" name={item.icon} size={27} />
            </View>
            <View style={styles.itemCopy}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
            <Ionicons color="#7b7b78" name="chevron-forward" size={25} />
          </Pressable>
        ))}

        <Pressable
          accessibilityLabel="Add optional portfolio media"
          accessibilityRole="button"
          onPress={previewOnly}
          style={styles.itemCard}
          testID="creator-profile-portfolio"
        >
          <View style={styles.softIcon}>
            <Ionicons color={accent} name="images-outline" size={27} />
          </View>
          <View style={styles.itemCopy}>
            <Text style={styles.label}>
              Your portfolio <Text style={styles.optional}>(optional)</Text>
            </Text>
            <Text style={styles.value}>Add up to 5 photos or videos</Text>
          </View>
          <Text style={styles.upload}>Upload</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityLabel="Continue to Creator mission discovery"
        accessibilityRole="button"
        onPress={() => router.push('/creator/discover')}
        style={styles.continueButton}
        testID="creator-profile-continue"
      >
        <Text style={styles.continueText}>Continue</Text>
      </Pressable>

      <View style={styles.privacyRow}>
        <Ionicons color={accent} name="lock-closed-outline" size={18} />
        <Text style={styles.privacy}>Only mission-window location is used for check-in.</Text>
      </View>
    </SetupShell>
  );
}

const styles = StyleSheet.create({
  eligibilityCard: {
    alignItems: 'center',
    backgroundColor: '#f8fcfa',
    borderColor: '#dce9e3',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 24,
    padding: 15,
  },
  softIcon: {
    alignItems: 'center',
    backgroundColor: '#dff2ed',
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  checkedRow: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 5 },
  list: { gap: 11, marginTop: 12 },
  itemCard: {
    alignItems: 'center',
    backgroundColor: setupColors.card,
    borderColor: setupColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    minHeight: 84,
    padding: 13,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: accent,
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  itemCopy: { flex: 1 },
  label: { color: setupColors.ink, fontSize: 17, fontWeight: '800' },
  value: { color: setupColors.muted, fontSize: 14, lineHeight: 20, marginTop: 3 },
  optional: { color: setupColors.muted, fontWeight: '500' },
  upload: { color: accent, fontSize: 14, fontWeight: '800' },
  continueButton: {
    alignItems: 'center',
    backgroundColor: accent,
    borderRadius: 17,
    marginTop: 18,
    padding: 18,
  },
  continueText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  privacyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 16,
  },
  privacy: { color: setupColors.muted, flexShrink: 1, fontSize: 12, textAlign: 'center' },
});
