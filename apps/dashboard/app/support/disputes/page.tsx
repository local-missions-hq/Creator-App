import { ConsoleShell } from '../../../components/ConsoleShell';
import { StatusPill } from '../../../components/StatusPill';

export default function SupportDisputesPage() {
  return (
    <ConsoleShell
      description="Coordinate mission-window help and evidence-based disputes while creator rewards, refunds, and immutable records stay protected."
      eyebrow="SUPPORT · CASE WORKSPACE"
      title="Support & disputes"
    >
      <div className="caseLayout">
        <section aria-label="Open cases" className="caseList">
          <div className="sectionHeading">
            <div>
              <p className="itemMeta">OPEN CASES</p>
              <h2>2 need attention</h2>
            </div>
            <button type="button">Filter</button>
          </div>
          <article className="caseCard selected">
            <div className="caseCardTop">
              <span>DSP-ORL-009</span>
              <StatusPill tone="attention">Due in 2h</StatusPill>
            </div>
            <h3>Revision request disputed</h3>
            <p>Family Dinner Story · Slot 04</p>
            <small>Objective checklist review</small>
          </article>
          <article className="caseCard">
            <div className="caseCardTop">
              <span>SUP-ORL-024</span>
              <StatusPill tone="warning">Mission today</StatusPill>
            </div>
            <h3>Venue reports delayed opening</h3>
            <p>Winter Park Brunch Visit · Slot 02</p>
            <small>Business-caused interruption</small>
          </article>
        </section>
        <section aria-label="Selected dispute" className="caseDetail">
          <div className="caseTitleRow">
            <div>
              <p className="itemMeta">DISPUTE · DSP-ORL-009</p>
              <h2>Was the correction inside the locked checklist?</h2>
              <p>Creator CRT-ORL-012 · Business BIZ-ORL-004 · Campaign CMP-ORL-018</p>
            </div>
            <StatusPill tone="attention">Investigation open</StatusPill>
          </div>
          <section className="protectedReward">
            <div>
              <span>Creator reward</span>
              <strong>$50 protected pending outcome</strong>
            </div>
            <p>Ordinary business payment disputes cannot take back an approved reward.</p>
          </section>
          <div className="evidenceGrid">
            <article>
              <p className="itemMeta">LOCKED REQUIREMENT</p>
              <h3>Two vertical clips, 5–15 seconds each</h3>
              <p>Natural venue footage. Normal iPhone quality is acceptable.</p>
            </article>
            <article>
              <p className="itemMeta">BUSINESS REQUEST</p>
              <h3>Replace clip 2 with a 20-second voiceover</h3>
              <p>Voiceover and extended duration do not appear in checklist v3.</p>
            </article>
          </div>
          <section className="caseTimeline">
            <h3>Case timeline</h3>
            <div>
              <time>10:14 AM</time>
              <p>Creator opened dispute and attached checklist reference.</p>
            </div>
            <div>
              <time>10:19 AM</time>
              <p>System paused the correction timer; original media preserved.</p>
            </div>
            <div>
              <time>10:34 AM</time>
              <p>Operations review assigned. Original reviewer cannot decide an appeal.</p>
            </div>
          </section>
          <div className="decisionPanel">
            <div>
              <p className="itemMeta">SYNTHETIC DECISION PREVIEW</p>
              <h3>Likely outcome: creator work meets the locked requirement</h3>
              <p>
                A reason code and recent step-up are required before any real privileged action.
              </p>
            </div>
            <button type="button">Review resolution</button>
          </div>
        </section>
      </div>
      <aside className="policyNote">
        <strong>Support boundary</strong>
        <p>
          This workspace shows public IDs and the evidence needed for this case. It does not expose
          a street address, raw locality proof, bank account, private follower analytics, or broad
          user profile.
        </p>
      </aside>
    </ConsoleShell>
  );
}
