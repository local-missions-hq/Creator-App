import { ConsoleShell } from '../../../components/ConsoleShell';
import { StatusPill } from '../../../components/StatusPill';

const reviews = [
  {
    id: 'BIZ-ORL-004',
    kind: 'Business approval',
    name: 'Lake Eola Kitchen',
    area: 'Central Orlando',
    due: 'Due today · 3:30 PM',
    detail: 'Business identity, operating location, and authorized representative evidence ready.',
    checks: ['Identity submitted', 'Location evidence', 'Conflict check clear'],
  },
  {
    id: 'CMP-ORL-018',
    kind: 'Campaign review',
    name: 'Family Dinner Story',
    area: '10 Community Slots · $50 each',
    due: 'Due in 5 hours',
    detail: '$500 Creator Reward Pool + $75 fee = $575 Total Due after approval.',
    checks: ['Objective checklist', 'Rights within range', 'Capacity available'],
  },
  {
    id: 'CRT-ORL-031',
    kind: 'Creator correction',
    name: 'Locality reverification',
    area: 'Orlando area · exact address hidden',
    due: 'Due tomorrow',
    detail: 'Address changed. Old locality badge and distance band are already unavailable.',
    checks: ['Raw proof restricted', 'Annual review', 'Payout data separate'],
  },
];

export default function ReviewQueuePage() {
  return (
    <ConsoleShell
      description="Decide from structured evidence and published policy—not popularity, appearance, private analytics, or informal notes."
      eyebrow="ADMIN · OBJECTIVE REVIEW"
      title="Review queue"
    >
      <section aria-label="Review queue totals" className="summaryStrip compactSummary">
        <div>
          <span>Needs action</span>
          <strong>3</strong>
        </div>
        <div>
          <span>Due today</span>
          <strong>2</strong>
        </div>
        <div>
          <span>Oldest wait</span>
          <strong>6h 12m</strong>
        </div>
        <div>
          <span>Appeals assigned to original reviewer</span>
          <strong>0</strong>
        </div>
      </section>
      <div aria-label="Queue filters" className="filterRow">
        <button className="filterActive" type="button">
          All 3
        </button>
        <button type="button">Business 1</button>
        <button type="button">Campaign 1</button>
        <button type="button">Creator 1</button>
      </div>
      <section aria-label="Pending reviews" className="reviewList">
        {reviews.map((review, index) => (
          <article className="reviewCard" key={review.id}>
            <div className="reviewPrimary">
              <div className="reviewHeading">
                <span aria-hidden="true" className="typeBadge">
                  {index + 1}
                </span>
                <div>
                  <p className="itemMeta">
                    {review.kind} · {review.id}
                  </p>
                  <h2>{review.name}</h2>
                  <p className="areaLabel">{review.area}</p>
                </div>
              </div>
              <p className="reviewDetail">{review.detail}</p>
              <div className="checkRow">
                {review.checks.map((check) => (
                  <span key={check}>✓ {check}</span>
                ))}
              </div>
            </div>
            <div className="reviewAction">
              <StatusPill tone={index === 0 ? 'attention' : 'warning'}>{review.due}</StatusPill>
              <button aria-label={`Open synthetic review ${review.id}`} type="button">
                Open review
              </button>
              <small>Reason + audit event required</small>
            </div>
          </article>
        ))}
      </section>
      <aside className="policyNote">
        <strong>Objective review boundary</strong>
        <p>
          Descriptive briefs, chat, comments, audience size, and subjective preference cannot add
          requirements or deny a qualified Community creator. Appeals require an independent
          reviewer.
        </p>
      </aside>
    </ConsoleShell>
  );
}
