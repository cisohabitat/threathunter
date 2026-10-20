import { useMemo, useState } from "react";
import { keyOf, type Debrief, type MissionId, type Ref } from "./contracts";
import { packages } from "./content";
import { claimLabels, handoffLabels } from "./labels";
import { Records } from "./Records";
import { HistoryTimeline } from "../ui/HistoryTimeline";

export function CampaignDebrief({
  data,
  missionId,
  busy,
  replay,
}: {
  data: Debrief;
  missionId: MissionId;
  busy: boolean;
  replay: () => Promise<void>;
}) {
  const [through, setThrough] = useState(data.closeTick),
    [related, setRelated] = useState<Ref[] | null>(null);
  const records = useMemo(
    () =>
      data.records.filter(
        (r) =>
          r.deliveredTick <= through &&
          (!related || related.some((ref) => keyOf(ref) === keyOf(r.ref))),
      ),
    [data, through, related],
  );
  const history = useMemo(
    () => data.history.filter((h) => h.tick <= through),
    [data, through],
  );
  const unanswered = packages[missionId].queries.filter(
    (q) => !data.acquisitions.some((a) => a.queryId === q.id),
  );
  return (
    <section className="debrief" aria-label={`${missionId} hunt debrief`}>
      <p className="eyebrow">YOUR FINDING · FROZEN AT STEP {data.closeTick}</p>
      <h2>{claimLabels[data.finding.disposition]}</h2>
      <section className="panel finding-verdict">
        <h3>What your observations support</h3>
        <p className="verdict-summary">
          {data.quality.supported
            ? "Your cited observations support this scoped finding. A justified visibility limit is useful work."
            : "The cited observations did not establish this finding. Strengthen the evidence or bound the claim before treating it as established."}
        </p>
        <p>
          {data.finding.confidence} claim confidence ·{" "}
          {data.finding.evidence.length} citations
        </p>
        <p>{handoffLabels[data.finding.handoff]}</p>
        <p>
          Owner: {data.finding.owner}; requested review within{" "}
          {data.finding.reviewWithinTicks} steps. Optional notes are not graded.
        </p>
        {data.finding.notes ? (
          <p className="preserve-lines">{data.finding.notes}</p>
        ) : null}
      </section>
      <section className="panel">
        <p className="eyebrow">OPERATIONAL OUTCOME · SEPARATE FROM QUALITY</p>
        <h3>After your handoff</h3>
        <p>{data.response}</p>
        <p>
          Continuation resolved through step {data.resolvedThrough}. This
          authored simulation is not a real-world response prediction. Its
          hidden outcome cannot revise what was knowable at your decision.
        </p>
        {missionId === "M04" ? (
          <p>
            The billing dependency remained available. Host age and inventory
            absence did not authorise shutdown.
          </p>
        ) : (
          <p>
            A repaired or successfully tested source now cannot establish what
            happened in its missing historical interval.
          </p>
        )}
        <details>
          <summary>Reveal the simulation’s hidden facts</summary>
          <p>{data.truth}</p>
          <p>
            {data.objectiveOccurred
              ? "The simulated unauthorised objective occurred."
              : "The simulated unauthorised objective did not occur."}{" "}
            This does not change the frozen assessment.
          </p>
        </details>
      </section>
      <section className="panel">
        <p className="eyebrow">EVIDENCE RECONSTRUCTION</p>
        <h3>Known at your decision</h3>
        <label>
          What I knew then
          <input
            type="number"
            min={0}
            max={data.closeTick}
            step={1}
            value={through}
            onChange={(e) => {
              const value = e.target.valueAsNumber;
              if (
                Number.isInteger(value) &&
                value >= 0 &&
                value <= data.closeTick
              ) {
                setThrough(value);
                setRelated(null);
              }
            }}
          />
        </label>
        <p>
          Showing observations delivered by step {through}, regardless of their
          earlier event timestamp. The assessment stays frozen at step{" "}
          {data.closeTick}.
        </p>
        {related ? (
          <>
            <p>Showing observations related to the selected feedback rule.</p>
            <button onClick={() => setRelated(null)}>
              Show all known observations
            </button>
          </>
        ) : null}
        <Records records={records} />
        <details>
          <summary>Your investigation timeline</summary>
          <HistoryTimeline items={history} />
        </details>
      </section>
      <div className="debrief-grid">
        <section className="panel">
          <h3>Could have been checked</h3>
          {unanswered.length ? (
            unanswered.map((q) => (
              <p key={q.id}>
                <strong>{q.label}.</strong> {q.can} {q.cannot}
              </p>
            ))
          ) : (
            <p>
              You investigated each available source question. Source counts
              alone do not establish a conclusion.
            </p>
          )}
          <p>
            These were available questions, not a claim about unseen results or
            an optimal click order.
          </p>
        </section>
        <section className="panel">
          <h3>Not observable then</h3>
          <Records
            records={data.records.filter(
              (r) => r.coverage !== "covered" && r.deliveredTick <= through,
            )}
          />
          {data.pending.map((c) => (
            <p key={c.id}>
              The requested {c.targetId} test was still pending, due at step{" "}
              {c.dueTick}. No response was known before that delivery.
            </p>
          ))}
          <p>
            Every acquisition retains its original source, target and cutoff.
            Later facts cannot fill an earlier decision snapshot.
          </p>
        </section>
      </div>
      <details className="panel score-breakdown">
        <summary>
          Investigation quality · optional score and evidence-linked feedback
        </summary>
        <div className="score">
          {data.quality.total}
          <span>/100</span>
        </div>
        <p>
          Evidence 30% · reasoning 25% · decision 30% · report 15%. No speed
          bonus, hidden-outcome multiplier or grading of free text.
        </p>
        {(["evidence", "reasoning", "decision", "report"] as const).map(
          (component) => (
            <div className="score-row" key={component}>
              <span>{component}</span>
              <meter
                min={0}
                max={100}
                value={data.quality[component]}
                aria-label={`${component} score`}
              />
              <strong>{data.quality[component]}</strong>
            </div>
          ),
        )}
        {data.quality.reasons.map((reason) => (
          <article className="rubric-feedback" key={reason.id}>
            <h4>
              {reason.earned ? "Met" : "Not established"} · {reason.text}
            </h4>
            {reason.refs.length ? (
              <button
                onClick={() => {
                  setThrough(data.closeTick);
                  setRelated(reason.refs);
                }}
              >
                Review related observations
              </button>
            ) : null}
          </article>
        ))}
      </details>
      <details className="panel">
        <summary>
          Reveal world, source collection and player acquisition tracks
        </summary>
        <p>
          This explicit reveal contains facts beyond your decision-time
          knowledge. It cannot change your quality report.
        </p>
        <h3>World events</h3>
        <HistoryTimeline
          items={data.events.map((e) => ({
            tick: e.tick,
            text: `Phase ${e.phase} · ${e.actor} · ${e.applied ? "Applied" : "Blocked"}: ${e.description}`,
          }))}
        />
        <h3>Source collection</h3>
        <HistoryTimeline
          items={data.collection.map((c) => ({
            tick: c.availableTick,
            text: `${c.sourceId} · ${c.capability} · origin ${c.originId}; event at ${c.eventTick}, available from ${c.availableTick}. A collected record is not automatically player knowledge.`,
          }))}
        />
        <h3>Player acquisitions</h3>
        <HistoryTimeline
          items={data.acquisitions.map((a) => ({
            tick: a.deliveredTick,
            text: `${a.queryId} on ${a.targetId}; collected through ${a.cutoffTick}; ${a.refs.length} delivered reference(s).`,
          }))}
        />
      </details>
      <p className="transfer">
        A finding explains what supports it, what remains unknown and who owns
        the next check.
      </p>
      <button className="primary" disabled={busy} onClick={() => void replay()}>
        Try another approach
      </button>
    </section>
  );
}
