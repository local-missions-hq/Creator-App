import { Ionicons } from '../../components/DecorativeIcon';
import { Link } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AccessiblePressable as Pressable } from '../../components/AccessiblePressable';

import { appColors } from '../../components/AppShell';
import { BusinessWizardShell } from '../../components/BusinessWizardShell';

const paymentStates = [
  {
    color: appColors.teal,
    icon: 'wallet-outline',
    label: 'Funded',
    softColor: appColors.tealSoft,
  },
  {
    color: appColors.orange,
    icon: 'clipboard-outline',
    label: 'Pending review',
    softColor: appColors.orangeSoft,
  },
  {
    color: appColors.success,
    icon: 'checkmark-circle-outline',
    label: 'Available',
    softColor: appColors.successSoft,
  },
  {
    color: appColors.warning,
    icon: 'paper-plane-outline',
    label: 'Paid',
    softColor: appColors.warningSoft,
  },
] as const;

export default function BusinessBudgetScreen() {
  const { fontScale, width } = useWindowDimensions();
  const usesExpandedLayout = fontScale >= 1.5 || width < 360;

  return (
    <BusinessWizardShell step={3} title="Budget & funding">
      <Text style={styles.intro}>
        Review the full price now. Your saved test payment method is not charged during drafting or
        review.
      </Text>

      <View style={styles.breakdownCard}>
        <Text style={styles.cardTitle}>Funding breakdown</Text>
        <View style={[styles.moneyRow, usesExpandedLayout && styles.moneyRowExpanded]}>
          <View style={styles.moneyCopy}>
            <Text style={styles.moneyLabel}>Creator Reward Pool</Text>
            <Text style={styles.moneyMeta}>10 Community Slots × $50</Text>
          </View>
          <Text style={[styles.moneyValue, usesExpandedLayout && styles.moneyValueExpanded]}>
            $500.00
          </Text>
        </View>
        <View style={[styles.moneyRow, usesExpandedLayout && styles.moneyRowExpanded]}>
          <View style={styles.moneyCopy}>
            <Text style={styles.moneyLabel}>Platform fee</Text>
            <Text style={styles.moneyMeta}>Transparent 15%</Text>
          </View>
          <Text style={[styles.moneyValue, usesExpandedLayout && styles.moneyValueExpanded]}>
            $75.00
          </Text>
        </View>
        <View style={[styles.totalRow, usesExpandedLayout && styles.totalRowExpanded]}>
          <Text style={styles.totalLabel}>Total Due</Text>
          <Text style={[styles.totalValue, usesExpandedLayout && styles.totalValueExpanded]}>
            $575.00
          </Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <View style={[styles.statusHeader, usesExpandedLayout && styles.statusHeaderExpanded]}>
          <Text style={styles.cardTitle}>Funding status</Text>
          <View
            style={[styles.notFundedBadge, usesExpandedLayout && styles.notFundedBadgeExpanded]}
          >
            <Ionicons color={appColors.orange} name="alert-circle" size={17} />
            <Text style={styles.notFundedText}>NOT FUNDED</Text>
          </View>
        </View>
        <View style={[styles.paymentMethod, usesExpandedLayout && styles.paymentMethodExpanded]}>
          <View style={styles.cardBrand}>
            <Text style={styles.cardBrandText}>TEST</Text>
          </View>
          <View style={styles.paymentCopy}>
            <Text style={styles.paymentTitle}>Demo Visa ending 4242</Text>
            <Text style={styles.paymentMeta}>Synthetic setup value · not stored</Text>
          </View>
          <Text style={[styles.change, usesExpandedLayout && styles.changeExpanded]}>Change</Text>
        </View>
      </View>

      <View style={styles.flowCard}>
        <Text style={styles.cardTitle}>How creator rewards move</Text>
        <View style={[styles.flowRow, usesExpandedLayout && styles.flowRowExpanded]}>
          {paymentStates.map((state, index) => (
            <View
              key={state.label}
              style={[styles.flowItem, usesExpandedLayout && styles.flowItemExpanded]}
            >
              <View style={[styles.flowIcon, { backgroundColor: state.softColor }]}>
                <Ionicons color={state.color} name={state.icon} size={23} />
              </View>
              <Text style={[styles.flowLabel, { color: state.color }]}>{state.label}</Text>
              {!usesExpandedLayout && index < paymentStates.length - 1 ? (
                <Ionicons color="#aeb7bf" name="chevron-forward" size={14} style={styles.arrow} />
              ) : null}
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.promiseCard, usesExpandedLayout && styles.promiseCardExpanded]}>
        <Ionicons color={appColors.success} name="shield-checkmark-outline" size={29} />
        <View style={styles.promiseCopy}>
          <Text style={styles.promiseTitle}>All-or-nothing per Creator slot</Text>
          <Text style={styles.promiseText}>
            Completed slots earn the full $50. Cancelled, no-show, or incomplete slots are not
            charged to the business under the pilot rules.
          </Text>
        </View>
      </View>

      <Link asChild href="/business/review-publish">
        <Pressable
          accessibilityLabel="Continue to mission review"
          accessibilityRole="button"
          style={styles.continueButton}
          testID="business-continue-review"
        >
          <Text style={styles.continueText}>Continue to review</Text>
          <Ionicons color="#ffffff" name="arrow-forward" size={21} />
        </Pressable>
      </Link>
      <Text style={styles.footer}>
        No charge occurs until approval and an explicit Fund and Publish action.
      </Text>
    </BusinessWizardShell>
  );
}

const styles = StyleSheet.create({
  intro: { color: appColors.muted, fontSize: 13, lineHeight: 19, marginTop: 17 },
  breakdownCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  cardTitle: { color: appColors.ink, fontSize: 18, fontWeight: '900' },
  moneyRow: {
    alignItems: 'center',
    borderBottomColor: appColors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingBottom: 11,
  },
  moneyRowExpanded: { alignItems: 'stretch', flexDirection: 'column' },
  moneyCopy: { flex: 1, minWidth: 0 },
  moneyLabel: { color: appColors.ink, fontSize: 13, fontWeight: '800' },
  moneyMeta: { color: appColors.muted, fontSize: 10, marginTop: 3 },
  moneyValue: {
    color: appColors.ink,
    flexShrink: 0,
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
    textAlign: 'right',
  },
  moneyValueExpanded: { alignSelf: 'flex-start', marginLeft: 0, marginTop: 8, textAlign: 'left' },
  totalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
  },
  totalRowExpanded: { alignItems: 'flex-start', flexDirection: 'column' },
  totalLabel: { color: appColors.ink, fontSize: 16, fontWeight: '900' },
  totalValue: { color: appColors.teal, fontSize: 24, fontWeight: '900' },
  totalValueExpanded: { marginTop: 5 },
  statusCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  statusHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  statusHeaderExpanded: { alignItems: 'flex-start', flexDirection: 'column' },
  notFundedBadge: {
    alignItems: 'center',
    backgroundColor: appColors.orangeSoft,
    borderRadius: 13,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  notFundedBadgeExpanded: { marginTop: 9 },
  notFundedText: { color: appColors.orange, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  paymentMethod: {
    alignItems: 'center',
    borderColor: appColors.line,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 13,
    padding: 11,
  },
  paymentMethodExpanded: { alignItems: 'flex-start', flexWrap: 'wrap' },
  cardBrand: {
    alignItems: 'center',
    backgroundColor: '#123a8c',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 48,
  },
  cardBrandText: { color: '#ffffff', fontSize: 9, fontWeight: '900' },
  paymentCopy: { flex: 1 },
  paymentTitle: { color: appColors.ink, fontSize: 12, fontWeight: '800' },
  paymentMeta: { color: appColors.muted, fontSize: 9, marginTop: 2 },
  change: { color: appColors.teal, fontSize: 10, fontWeight: '900' },
  changeExpanded: { marginLeft: 57 },
  flowCard: {
    backgroundColor: appColors.card,
    borderColor: appColors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  flowRow: { flexDirection: 'row', marginTop: 14 },
  flowRowExpanded: { flexWrap: 'wrap', rowGap: 14 },
  flowItem: { alignItems: 'center', flex: 1, position: 'relative' },
  flowItemExpanded: { flexBasis: '50%', flexGrow: 0 },
  flowIcon: {
    alignItems: 'center',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  flowLabel: { fontSize: 8, fontWeight: '900', marginTop: 6, textAlign: 'center' },
  arrow: { position: 'absolute', right: -7, top: 14 },
  promiseCard: {
    alignItems: 'center',
    backgroundColor: appColors.successSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 11,
    marginTop: 14,
    padding: 14,
  },
  promiseCardExpanded: { alignItems: 'flex-start', flexDirection: 'column' },
  promiseCopy: { flex: 1 },
  promiseTitle: { color: appColors.success, fontSize: 14, fontWeight: '900' },
  promiseText: { color: appColors.success, fontSize: 10, lineHeight: 15, marginTop: 3 },
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
  continueText: {
    color: '#ffffff',
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  footer: {
    color: appColors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
    textAlign: 'center',
  },
});
