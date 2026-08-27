import { Ionicons } from '../../components/DecorativeIcon';
import { useState } from 'react';
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

import { appColors, RoleTabBar } from '../../components/AppShell';

const paymentStages = [
  { icon: 'checkmark', label: 'Funded', time: 'Funding confirmed' },
  { icon: 'checkmark', label: 'Pending review', time: 'Work reviewed' },
  { icon: 'wallet-outline', label: 'Available', time: 'Reward available' },
  { icon: 'business-outline', label: 'Paid', time: 'Payout reported' },
] as const;

export default function CreatorEarningsScreen() {
  const [paid, setPaid] = useState(false);
  const { fontScale, width } = useWindowDimensions();
  const useExpandedLayout = width < 390 || fontScale > 1.4;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView bounces={false} contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CREATOR REWARDS</Text>
            {!useExpandedLayout ? <Text style={styles.title}>Earnings</Text> : null}
          </View>
          <Pressable
            accessibilityLabel="Preview Creator rewards help"
            accessibilityRole="button"
            onPress={() =>
              Alert.alert(
                'Creator rewards help',
                'This is a local preview. No support request is sent.',
              )
            }
            style={styles.helpIcon}
            testID="creator-preview-earnings-help"
          >
            <Ionicons color="#ffffff" name="help" size={23} />
          </Pressable>
        </View>
        {useExpandedLayout ? <Text style={styles.titleExpanded}>Earnings</Text> : null}

        <View style={styles.balanceCard}>
          <View
            accessible
            accessibilityLabel={`${paid ? 'Paid in this demo' : 'Available balance'}: 50 dollars. Test money only.`}
          >
            <Text style={styles.balanceLabel}>
              {paid ? 'Paid in this demo' : 'Available balance'}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              numberOfLines={1}
              style={styles.balance}
            >
              $50.00
            </Text>
            <View style={styles.testBadge}>
              <Ionicons color="#ffffff" name="flask-outline" size={15} />
              <Text style={styles.testText}>TEST MONEY ONLY</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel={
              paid ? 'Reset available payout preview' : 'Preview paid payout state'
            }
            accessibilityRole="button"
            onPress={() => setPaid((value) => !value)}
            style={styles.withdrawButton}
            testID="creator-preview-paid-state"
          >
            <Text style={styles.withdrawText}>{paid ? 'Reset preview' : 'Preview paid state'}</Text>
          </Pressable>
        </View>

        <View style={styles.paymentCard}>
          <View
            accessible
            accessibilityLabel={`Family Adventure Preview. 50 dollar creator reward. ${paid ? 'Paid' : 'Available'}.`}
            style={[styles.paymentHeader, useExpandedLayout && styles.paymentHeaderExpanded]}
            testID={paid ? 'creator-reward-status-paid' : 'creator-reward-status-available'}
          >
            <View>
              <Text style={styles.paymentTitle}>Family Adventure Preview</Text>
              <Text style={styles.paymentAmount}>$50.00 creator reward</Text>
            </View>
            <View
              style={[
                styles.stateBadge,
                paid && styles.stateBadgePaid,
                useExpandedLayout && styles.stateBadgeExpanded,
              ]}
            >
              <Text style={[styles.stateBadgeText, paid && styles.stateBadgeTextPaid]}>
                {paid ? 'PAID' : 'AVAILABLE'}
              </Text>
            </View>
          </View>

          <View
            accessible
            accessibilityLabel={`Payment progress. Funded complete. Pending review complete. Available ${paid ? 'complete' : 'current'}. Paid ${paid ? 'current' : 'upcoming'}.`}
            style={[styles.timeline, useExpandedLayout && styles.timelineExpanded]}
          >
            {!useExpandedLayout ? <View style={styles.timelineLine} /> : null}
            {paymentStages.map((stage, index) => {
              const complete = index < 3 || paid;
              const current = paid ? index === 3 : index === 2;
              return (
                <View
                  key={stage.label}
                  style={[styles.stage, useExpandedLayout && styles.stageExpanded]}
                >
                  <View
                    style={[
                      styles.stageIcon,
                      complete && styles.stageIconComplete,
                      current && styles.stageIconCurrent,
                    ]}
                  >
                    <Ionicons
                      color={complete ? '#ffffff' : '#8f99a2'}
                      name={stage.icon}
                      size={17}
                    />
                  </View>
                  <View style={useExpandedLayout ? styles.stageCopyExpanded : undefined}>
                    <Text style={[styles.stageLabel, current && styles.stageLabelCurrent]}>
                      {stage.label}
                    </Text>
                    <Text style={styles.stageTime}>{stage.time}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.processorNote}>
            <Ionicons color={appColors.teal} name="information-circle-outline" size={20} />
            <Text style={styles.processorText}>
              Production payouts will use the approved Stripe Connect setup. This prototype does not
              contact Stripe.
            </Text>
          </View>
        </View>

        <View
          accessible
          accessibilityLabel="Approved work stays owed to you. Ordinary business disputes do not silently reverse an approved reward or deduct it from another mission."
          style={styles.protectionCard}
        >
          <Ionicons color="#159464" name="shield-checkmark-outline" size={29} />
          <View style={styles.protectionCopy}>
            <Text style={styles.protectionTitle}>Approved work stays owed to you</Text>
            <Text style={styles.protectionText}>
              Ordinary business disputes do not silently reverse an approved reward or deduct it
              from another mission.
            </Text>
          </View>
        </View>

        <View
          accessible
          accessibilityLabel="August demo earnings: 110 dollars."
          style={styles.monthCard}
        >
          <View style={styles.monthIcon}>
            <Ionicons color={appColors.teal} name="bar-chart-outline" size={28} />
          </View>
          <View style={styles.monthCopy}>
            <Text style={styles.monthLabel}>August demo earnings</Text>
            <Text style={styles.monthValue}>$110.00</Text>
          </View>
          <Ionicons color={appColors.teal} name="chevron-forward" size={22} />
        </View>

        <Text style={styles.footer}>
          Synthetic ledger preview · No bank account, payout account, or real balance exists.
        </Text>
      </ScrollView>
      <RoleTabBar mode="creator" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: appColors.canvas, flex: 1 },
  page: { padding: 20, paddingBottom: 46 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerCopy: { flex: 1 },
  eyebrow: { color: appColors.teal, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: appColors.ink, fontSize: 34, fontWeight: '900', marginTop: 3 },
  titleExpanded: { color: appColors.ink, fontSize: 34, fontWeight: '900', marginTop: 8 },
  helpIcon: {
    alignItems: 'center',
    backgroundColor: appColors.teal,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  balanceCard: {
    backgroundColor: '#102a43',
    borderRadius: 23,
    marginTop: 19,
    overflow: 'hidden',
    padding: 22,
  },
  balanceLabel: { color: '#d6e2eb', fontSize: 15, fontWeight: '700' },
  balance: { color: '#ffffff', fontSize: 47, fontWeight: '900', marginTop: 4 },
  testBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  testText: { color: '#ffffff', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  withdrawButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: appColors.teal,
    borderRadius: 14,
    marginTop: 17,
    minWidth: 168,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  withdrawText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  paymentCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  paymentHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentHeaderExpanded: { flexDirection: 'column', gap: 9 },
  paymentTitle: { color: appColors.ink, fontSize: 16, fontWeight: '900' },
  paymentAmount: { color: appColors.muted, fontSize: 11, marginTop: 3 },
  stateBadge: { backgroundColor: appColors.tealSoft, borderRadius: 12, padding: 7 },
  stateBadgePaid: { backgroundColor: appColors.successSoft },
  stateBadgeExpanded: { alignSelf: 'flex-start' },
  stateBadgeText: { color: appColors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  stateBadgeTextPaid: { color: appColors.success },
  timeline: { flexDirection: 'row', marginTop: 20, position: 'relative' },
  timelineExpanded: { flexDirection: 'column', gap: 12 },
  timelineLine: {
    backgroundColor: appColors.line,
    height: 3,
    left: 30,
    position: 'absolute',
    right: 30,
    top: 19,
  },
  stage: { alignItems: 'center', flex: 1, zIndex: 1 },
  stageExpanded: { flexDirection: 'row', gap: 11 },
  stageCopyExpanded: { flex: 1 },
  stageIcon: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  stageIconComplete: { backgroundColor: appColors.teal, borderColor: appColors.teal },
  stageIconCurrent: { borderColor: appColors.success, borderWidth: 4 },
  stageLabel: {
    color: appColors.ink,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 7,
    textAlign: 'center',
  },
  stageLabelCurrent: { color: appColors.success },
  stageTime: {
    color: appColors.muted,
    fontSize: 8,
    lineHeight: 11,
    marginTop: 3,
    textAlign: 'center',
  },
  processorNote: {
    alignItems: 'flex-start',
    borderTopColor: appColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginTop: 16,
    paddingTop: 13,
  },
  processorText: { color: appColors.muted, flex: 1, fontSize: 10, lineHeight: 15 },
  protectionCard: {
    alignItems: 'center',
    backgroundColor: appColors.successSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 11,
    marginTop: 14,
    padding: 15,
  },
  protectionCopy: { flex: 1 },
  protectionTitle: { color: appColors.success, fontSize: 14, fontWeight: '900' },
  protectionText: { color: appColors.success, fontSize: 10, lineHeight: 15, marginTop: 3 },
  monthCard: {
    alignItems: 'center',
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 15,
  },
  monthIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  monthCopy: { flex: 1 },
  monthLabel: { color: appColors.muted, fontSize: 11 },
  monthValue: { color: appColors.ink, fontSize: 23, fontWeight: '900', marginTop: 2 },
  footer: {
    color: appColors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 13,
    textAlign: 'center',
  },
});
