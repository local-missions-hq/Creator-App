import { Ionicons } from '../../components/DecorativeIcon';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { CreatorMissionShell } from '../../components/CreatorMissionShell';

const topics = [
  {
    detail: 'Mission window, check-in, or venue issue',
    icon: 'time-outline',
    title: 'Active mission help',
  },
  {
    detail: 'Objective correction or unclear request',
    icon: 'document-text-outline',
    title: 'Submission support',
  },
  {
    detail: 'Available/Paid state or payout setup',
    icon: 'wallet-outline',
    title: 'Reward and payout',
  },
  {
    detail: 'Sign-in, verification, accessibility, or safety',
    icon: 'shield-outline',
    title: 'Account and safety',
  },
] as const;

export default function CreatorSupportScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [requestPreviewed, setRequestPreviewed] = useState(false);

  return (
    <CreatorMissionShell badge="DEMO" title="Creator support">
      <View style={styles.responseCard}>
        <Ionicons color={appColors.teal} name="headset-outline" size={30} />
        <View style={styles.responseCopy}>
          <Text style={styles.responseTitle}>Help during active mission windows</Text>
          <Text style={styles.responseText}>
            Pilot support is staffed during scheduled visits. Emergency services remain separate
            from app support.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>What do you need help with?</Text>
      <View style={styles.topicList}>
        {topics.map((topic) => {
          const active = selected === topic.title;
          return (
            <Pressable
              key={topic.title}
              accessibilityLabel={`Preview support topic ${topic.title}`}
              accessibilityRole="button"
              onPress={() => {
                setRequestPreviewed(false);
                setSelected(topic.title);
              }}
              style={[styles.topicRow, active && styles.topicRowActive]}
              testID={`creator-support-topic-${topic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            >
              <View style={[styles.topicIcon, active && styles.topicIconActive]}>
                <Ionicons color={active ? '#ffffff' : appColors.teal} name={topic.icon} size={22} />
              </View>
              <View style={styles.topicCopy}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicDetail}>{topic.detail}</Text>
              </View>
              <Ionicons color={appColors.muted} name="chevron-forward" size={18} />
            </Pressable>
          );
        })}
      </View>

      {selected ? (
        <View style={styles.previewState}>
          <Ionicons color="#159464" name="checkmark-circle" size={23} />
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>
              {requestPreviewed ? 'Support request preview complete' : `${selected} selected`}
            </Text>
            <Text style={styles.previewText}>
              {requestPreviewed
                ? 'The prototype reached its terminal support state. No request or notification was sent.'
                : 'A production form would collect only the details needed for this topic. No support request was sent.'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.boundaryCard}>
        <Ionicons color={appColors.orange} name="information-circle-outline" size={22} />
        <Text style={styles.boundaryText}>
          Ordinary support cannot edit ledger history, silently reverse approved rewards, or view
          raw locality proof without separately authorized access.
        </Text>
      </View>

      <Pressable
        accessibilityLabel="Preview creating a Creator support request"
        accessibilityRole="button"
        disabled={!selected}
        onPress={() => setRequestPreviewed(true)}
        style={[
          styles.primaryButton,
          !selected && styles.primaryButtonDisabled,
          requestPreviewed && styles.primaryButtonDone,
        ]}
        testID="creator-preview-support-request"
      >
        <Text style={styles.primaryText}>
          {requestPreviewed ? 'Support preview complete' : 'Preview support request'}
        </Text>
        <Ionicons
          color="#ffffff"
          name={requestPreviewed ? 'checkmark' : 'arrow-forward'}
          size={20}
        />
      </Pressable>
      <Text style={styles.footer}>
        No email, chat, case, attachment, or notification is created.
      </Text>
    </CreatorMissionShell>
  );
}

const styles = StyleSheet.create({
  responseCard: {
    alignItems: 'flex-start',
    backgroundColor: appColors.tealSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    marginTop: 17,
    padding: 14,
  },
  responseCopy: { flex: 1 },
  responseTitle: { color: appColors.ink, fontSize: 14, fontWeight: '900' },
  responseText: { color: appColors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionTitle: { color: appColors.ink, fontSize: 18, fontWeight: '900', marginTop: 19 },
  topicList: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  topicRow: {
    alignItems: 'center',
    borderBottomColor: appColors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    padding: 12,
  },
  topicRowActive: { backgroundColor: appColors.tealSoft },
  topicIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  topicIconActive: { backgroundColor: appColors.teal },
  topicCopy: { flex: 1 },
  topicTitle: { color: appColors.ink, fontSize: 13, fontWeight: '900' },
  topicDetail: { color: appColors.muted, fontSize: 9, marginTop: 3 },
  previewState: {
    alignItems: 'flex-start',
    backgroundColor: '#e9f7ef',
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 13,
  },
  previewCopy: { flex: 1 },
  previewTitle: { color: '#116b49', fontSize: 13, fontWeight: '900' },
  previewText: { color: '#477261', fontSize: 9, lineHeight: 14, marginTop: 3 },
  boundaryCard: {
    alignItems: 'flex-start',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 13,
  },
  boundaryText: { color: '#805238', flex: 1, fontSize: 9, lineHeight: 14 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 14,
    padding: 16,
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonDone: { backgroundColor: '#159464' },
  primaryText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  footer: { color: appColors.muted, fontSize: 9, marginTop: 9, textAlign: 'center' },
});
