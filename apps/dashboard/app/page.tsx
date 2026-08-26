import Link from 'next/link';

import { ConsoleShell } from '../components/ConsoleShell';
import { StatusPill } from '../components/StatusPill';

const queueCards = [
  {
    href: '/admin/review',
    title: 'Objective reviews',
    count: '3',
    detail: 'Business, campaign, and creator evidence awaiting a decision.',
    status: 'Action needed',
  },
  {
    href: '/support/disputes',
    title: 'Support & disputes',
    count: '2',
    detail: 'Mission-window help and one checklist-based dispute.',
    status: 'Within SLA',
  },
  {
    href: '/admin/audit',
    title: 'Audit events today',
    count: '8',
    detail: 'Read-only history for decisions, holds, funding, and approvals.',
    status: 'Immutable',
  },
];

export default function DashboardHome() {
  return (
    <ConsoleShell
      description="Review evidence, resolve cases, and follow every synthetic decision without exposing private creator data or changing money history."
      eyebrow="ORLANDO PILOT · LOCAL PREVIEW"
      title="Good morning, Avery."
    >
      <section aria-label="Pilot safeguards" className="summaryStrip">
        <div>
          <span>Approved businesses</span>
          <strong>6 / 10</strong>
        </div>
        <div>
          <span>Verified creators</span>
          <strong>42 / 100</strong>
        </div>
        <div>
          <span>Unsettled rewards</span>
          <strong>$1,250 / $25,000</strong>
        </div>
        <div>
          <span>New funding gate</span>
          <StatusPill tone="success">Preview open</StatusPill>
        </div>
      </section>
      <section aria-label="Operations queues" className="dashboardGrid">
        {queueCards.map((card, index) => (
          <Link className="queueCard" href={card.href} key={card.href}>
            <div className="queueCardHead">
              <span className="queueNumber">0{index + 1}</span>
              <StatusPill tone={index === 0 ? 'attention' : 'neutral'}>{card.status}</StatusPill>
            </div>
            <strong className="largeCount">{card.count}</strong>
            <h2>{card.title}</h2>
            <p>{card.detail}</p>
            <span className="textLink">Open view →</span>
          </Link>
        ))}
      </section>
      <section className="boundaryPanel">
        <div>
          <p className="eyebrow">YOUR ACCESS</p>
          <h2>Operations can coordinate. Finance controls money exceptions.</h2>
        </div>
        <p>
          You can review objective evidence and manage support cases. You cannot edit ledger
          history, change payout destinations, approve your own appeal, or force funding through a
          closed safety gate.
        </p>
      </section>
    </ConsoleShell>
  );
}
