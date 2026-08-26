import { Ionicons } from '../../components/DecorativeIcon';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppShell, appColors } from '../../components/AppShell';

const metrics = [
  {
    color: appColors.teal,
    icon: 'people-outline',
    label: 'Visits completed',
    softColor: appColors.tealSoft,
    value: '10',
  },
  {
    color: appColors.orange,
    icon: 'videocam-outline',
    label: 'Clips delivered',
    softColor: appColors.orangeSoft,
    value: '20',
  },
  {
    color: appColors.success,
    icon: 'images-outline',
    label: 'Photos delivered',
    softColor: appColors.successSoft,
    value: '50',
  },
  {
    color: appColors.warning,
    icon: 'cash-outline',
    label: 'Creator rewards',
    softColor: appColors.warningSoft,
    value: '$500',
  },
] as const;

const paymentStates = ['Funded', 'Pending review', 'Available', 'Paid'] as const;

export default function BusinessResultsScreen() {
  const { fontScale, width } = useWindowDimensions();
  const useExpandedLayout = width < 390 || fontScale > 1.4;

  return (
    <AppShell mode="business" showTabs title="Campaign results">
      <View style={styles.completeBadge}>
        <Ionicons color="#159464" name="checkmark-circle" size={18} />
        <Text style={styles.completeText}>SYNTHETIC CAMPAIGN COMPLETE</Text>
      </View>
      <Text style={styles.intro}>
        Family Adventure Preview finished all 10 Community Slots. Results below are local demo data,
        not live customer or payment records.
      </Text>

      <View style={styles.metrics}>
        {metrics.map((metric) => (
          <View
            accessible
            accessibilityLabel={`${metric.label}: ${metric.value}`}
            key={metric.label}
            style={[styles.metricCard, useExpandedLayout && styles.metricCardExpanded]}
          >
            <View style={[styles.metricIcon, { backgroundColor: metric.softColor }]}>
              <Ionicons color={metric.color} name={metric.icon} size={22} />
            </View>
            <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.costCard, useExpandedLayout && styles.costCardExpanded]}>
        <View accessible accessibilityLabel="Creator Reward Pool: 500 dollars">
          <Text style={styles.costLabel}>Creator Reward Pool</Text>
          <Text style={styles.costValue}>$500</Text>
        </View>
        <View
          accessible
          accessibilityLabel="Completed campaign cost: 575 dollars"
          style={[styles.costRight, useExpandedLayout && styles.costRightExpanded]}
        >
          <Text style={styles.costLabel}>Completed campaign cost</Text>
          <Text style={styles.totalValue}>$575</Text>
        </View>
      </View>

      <View style={styles.passCard}>
        <View
          accessible
          accessibilityLabel="Foot-traffic signal: Local Pass"
          style={styles.cardHeader}
        >
          <View>
            <Text style={styles.cardEyebrow}>FOOT-TRAFFIC SIGNAL</Text>
            <Text style={styles.cardTitle}>Local Pass</Text>
          </View>
          <View style={styles.passIcon}>
            <Ionicons color={appColors.teal} name="ticket-outline" size={27} />
          </View>
        </View>
        <View style={[styles.passMetrics, useExpandedLayout && styles.passMetricsExpanded]}>
          <View
            accessible
            accessibilityLabel="Pass claims: 42"
            style={[styles.passMetric, useExpandedLayout && styles.passMetricExpanded]}
          >
            <Text style={styles.passValue}>42</Text>
            <Text style={styles.passLabel}>Pass claims</Text>
          </View>
          <View style={[styles.passDivider, useExpandedLayout && styles.passDividerExpanded]} />
          <View
            accessible
            accessibilityLabel="Verified redemptions: 18"
            style={[styles.passMetric, useExpandedLayout && styles.passMetricExpanded]}
          >
            <Text style={styles.passValue}>18</Text>
            <Text style={styles.passLabel}>Verified redemptions</Text>
          </View>
          <View style={[styles.passDivider, useExpandedLayout && styles.passDividerExpanded]} />
          <View
            accessible
            accessibilityLabel="Claim-to-redemption: 42.9 percent"
            style={[styles.passMetric, useExpandedLayout && styles.passMetricExpanded]}
          >
            <Text style={styles.passValue}>42.9%</Text>
            <Text style={styles.passLabel}>Claim-to-redemption</Text>
          </View>
        </View>
        <View style={styles.attributionNote}>
          <Ionicons color={appColors.orange} name="information-circle-outline" size={20} />
          <Text style={styles.attributionText}>
            Claims and verified redemptions are reported separately. They are not purchases, sales,
            or proof of incremental customers.
          </Text>
        </View>
        <View
          accessible
          accessibilityLabel="Campaign cost per verified redemption: 31 dollars and 94 cents"
          style={[styles.efficiencyRow, useExpandedLayout && styles.efficiencyRowExpanded]}
        >
          <Text style={styles.efficiencyLabel}>Campaign cost per verified redemption</Text>
          <Text style={styles.efficiencyValue}>$31.94</Text>
        </View>
      </View>

      <View style={styles.paymentCard}>
        <Text style={styles.cardTitle}>Creator payment status</Text>
        <View style={[styles.paymentFlow, useExpandedLayout && styles.paymentFlowExpanded]}>
          {paymentStates.map((state, index) => (
            <View
              accessible
              accessibilityLabel={`${state}: complete`}
              key={state}
              style={[styles.paymentItem, useExpandedLayout && styles.paymentItemExpanded]}
            >
              <View style={styles.paymentCircle}>
                <Ionicons color="#ffffff" name="checkmark" size={16} />
              </View>
              <Text style={styles.paymentLabel}>{state}</Text>
              {index < paymentStates.length - 1 && !useExpandedLayout ? (
                <View style={styles.paymentLine} />
              ) : null}
            </View>
          ))}
        </View>
        <Text style={styles.paymentNote}>
          Demo terminal state only. No Stripe transfer, charge, refund, or payout was created.
        </Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  completeBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e8f6ef',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  completeText: { color: '#128056', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  intro: { color: appColors.muted, fontSize: 13, lineHeight: 19, marginTop: 11 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 },
  metricCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
  },
  metricCardExpanded: { flexBasis: '100%' },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  metricValue: { fontSize: 23, fontWeight: '900', marginTop: 8 },
  metricLabel: { color: appColors.muted, fontSize: 10, marginTop: 2 },
  costCard: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 15,
  },
  costCardExpanded: { alignItems: 'flex-start', flexDirection: 'column', gap: 14 },
  costLabel: { color: appColors.muted, fontSize: 9 },
  costValue: { color: appColors.ink, fontSize: 21, fontWeight: '900', marginTop: 2 },
  costRight: { alignItems: 'flex-end' },
  costRightExpanded: { alignItems: 'flex-start' },
  totalValue: { color: appColors.orange, fontSize: 21, fontWeight: '900', marginTop: 2 },
  passCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    padding: 15,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardEyebrow: { color: appColors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  cardTitle: { color: appColors.ink, fontSize: 18, fontWeight: '900', marginTop: 2 },
  passIcon: {
    alignItems: 'center',
    backgroundColor: appColors.tealSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  passMetrics: { flexDirection: 'row', marginTop: 16 },
  passMetricsExpanded: { flexDirection: 'column', gap: 12 },
  passMetric: { alignItems: 'center', flex: 1 },
  passMetricExpanded: { alignItems: 'flex-start', flex: 0 },
  passDivider: { backgroundColor: appColors.line, width: 1 },
  passDividerExpanded: { height: 1, width: '100%' },
  passValue: { color: appColors.teal, fontSize: 21, fontWeight: '900' },
  passLabel: {
    color: appColors.muted,
    fontSize: 8,
    lineHeight: 12,
    marginTop: 3,
    textAlign: 'center',
  },
  attributionNote: {
    alignItems: 'flex-start',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
    padding: 11,
  },
  attributionText: { color: '#805238', flex: 1, fontSize: 9, lineHeight: 14 },
  efficiencyRow: {
    alignItems: 'center',
    borderTopColor: appColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 12,
  },
  efficiencyRowExpanded: { alignItems: 'flex-start', flexDirection: 'column', gap: 6 },
  efficiencyLabel: { color: appColors.muted, flex: 1, fontSize: 9 },
  efficiencyValue: { color: appColors.ink, fontSize: 16, fontWeight: '900' },
  paymentCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    padding: 15,
  },
  paymentFlow: { flexDirection: 'row', marginTop: 15 },
  paymentFlowExpanded: { alignItems: 'flex-start', flexDirection: 'column', gap: 12 },
  paymentItem: { alignItems: 'center', flex: 1, position: 'relative' },
  paymentItemExpanded: { alignItems: 'center', flex: 0, flexDirection: 'row', gap: 10 },
  paymentCircle: {
    alignItems: 'center',
    backgroundColor: '#159464',
    borderRadius: 16,
    height: 31,
    justifyContent: 'center',
    width: 31,
    zIndex: 2,
  },
  paymentLabel: {
    color: '#116b49',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 5,
    textAlign: 'center',
  },
  paymentLine: {
    backgroundColor: '#95d8b7',
    height: 3,
    left: '63%',
    position: 'absolute',
    top: 14,
    width: '74%',
  },
  paymentNote: {
    color: appColors.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 13,
    textAlign: 'center',
  },
});
