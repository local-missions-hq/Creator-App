import { ConsoleShell } from '../../../components/ConsoleShell';
import { StatusPill } from '../../../components/StatusPill';

const timeline = [
  {
    time: '2:42 PM',
    actor: 'System',
    title: 'Creator reward became available',
    detail: 'SUB-ORL-104 approved against checklist v3. Full $50 reward obligation recorded.',
    tag: 'Money obligation',
    tone: 'success' as const,
  },
  {
    time: '2:41 PM',
    actor: 'Avery Rivera · Operations',
    title: 'Submission review approved',
    detail: 'Reason REV-OBJECTIVE-MET. No ledger entry was edited by the reviewer.',
    tag: 'Staff action',
    tone: 'attention' as const,
  },
  {
    time: '1:18 PM',
    actor: 'Creator CRT-ORL-012',
    title: 'Bounded revision resubmitted',
    detail: 'One requested clip replaced. Original and revised evidence remain linked.',
    tag: 'Creator action',
    tone: 'neutral' as const,
  },
  {
    time: '11:06 AM',
    actor: 'Lake Eola Kitchen',
    title: 'One correction requested',
    detail: 'Checklist item CLIP-02 cited. Revision window ends Aug 27 at 11:06 AM.',
    tag: 'Business action',
    tone: 'warning' as const,
  },
  {
    time: 'Yesterday · 6:22 PM',
    actor: 'System',
    title: 'Submission received',
    detail: 'Seven media objects passed local prototype validation; no provider upload occurred.',
    tag: 'Evidence',
    tone: 'neutral' as const,
  },
];

export default function AuditTimelinePage() {
  return (
    <ConsoleShell
      description="Reconstruct a case from append-only synthetic events. This view is read-only and never rewrites the action that actually occurred."
      eyebrow="ADMIN · READ-ONLY HISTORY"
      title="Audit timeline"
    >
      <section className="auditToolbar">
        <div>
          <span>Public object ID</span>
          <strong>CMP-ORL-018 · SUB-ORL-104</strong>
        </div>
        <div>
          <span>Current outcome</span>
          <StatusPill tone="success">Reward available · $50</StatusPill>
        </div>
        <button type="button">Export preview</button>
      </section>
      <section aria-label="Audit events" className="timeline">
        {timeline.map((event, index) => (
          <article className="timelineEvent" key={`${event.time}-${event.title}`}>
            <div aria-hidden="true" className="timelineRail">
              <span className={index === 0 ? 'current' : ''} />
            </div>
            <time>{event.time}</time>
            <div className="eventBody">
              <div className="eventHeading">
                <div>
                  <p className="itemMeta">{event.actor}</p>
                  <h2>{event.title}</h2>
                </div>
                <StatusPill tone={event.tone}>{event.tag}</StatusPill>
              </div>
              <p>{event.detail}</p>
              <small>Event {String(5841 - index).padStart(6, '0')} · Synthetic record</small>
            </div>
          </article>
        ))}
      </section>
      <aside className="policyNote successNote">
        <strong>History is immutable</strong>
        <p>
          Corrections create a new event linked to the original. Ordinary support cannot edit money,
          delete history, or reverse an approved creator reward.
        </p>
      </aside>
    </ConsoleShell>
  );
}
