import { useMemo, useState } from "react";
import { ComparisonPanel, ComparisonProvider } from "../comparison/Comparison";
import { fromExpansion } from "../comparison/model";
import { HistoryTimeline } from "../ui/HistoryTimeline";
import { Records } from "./Records";
import { keyOf, type Debrief as Data, type Ref } from "./contracts";
import type { PublicMission } from "./public";
const labels = {
  explained: "A scoped approved-work explanation",
  misuse: "Activity outside the disclosed approved scope",
  visibility: "A bounded visibility finding",
  provisional: "A preliminary finding with open questions",
};
export function Debrief({
  data: d,
  definition: p,
  replay,
  busy,
}: {
  data: Data;
  definition: PublicMission;
  replay: () => void;
  busy: boolean;
}) {
  const [through, setThrough] = useState(d.closeTick),
    [related, setRelated] = useState<Ref[] | null>(null),
    [revealed, setRevealed] = useState(false);
  const records = useMemo(
    () =>
      d.records.filter(
        (r) =>
          r.deliveredTick <= through &&
          (!related || related.some((ref) => keyOf(ref) === keyOf(r.ref))),
      ),
    [d, through, related],
  );
  return (
    <section aria-label={`${p.missionId} investigation debrief`}>
      <p className="eyebrow">YOUR FINDING · FROZEN AT STEP {d.closeTick}</p>
      <h1>{labels[d.finding.disposition]}</h1>
      <section className="panel finding-verdict">
        <h2>What your observations support</h2>
        <p>
          {d.quality.supported
            ? "Your cited observations meet a sufficient set for the selected finding within this case’s declared source and scope limits."
            : "The cited observations do not establish the selected finding. Check the missing evidence questions below; the simulation’s hidden actor cannot supply that evidence for you."}
        </p>
        <p>
          Scope: {d.finding.targetId}. Confidence: {d.finding.confidence}.
          Boundary:{" "}
          {p.mechanic.options.find((o) => o.id === d.finding.mechanicChoice)
            ?.label ?? "Not recorded"}
          .
        </p>
      </section>
      <section className="panel">
        <h2>Known at your decision</h2>
        <label>
          What I knew then
          <input
            type="number"
            min={0}
            max={d.closeTick}
            step={1}
            value={through}
            onChange={(e) => {
              const value = e.target.valueAsNumber;
              if (
                Number.isInteger(value) &&
                value >= 0 &&
                value <= d.closeTick
              ) {
                setThrough(value);
                setRelated(null);
              }
            }}
          />
        </label>
        <p>
          Showing observations delivered by step {through}. Event time does not
          make an undelivered record knowable. Your original finding and grade
          stay frozen.
        </p>
        {related ? (
          <button onClick={() => setRelated(null)}>
            Show all observations known then
          </button>
        ) : null}
        <ComparisonProvider records={fromExpansion(records)}>
          <ComparisonPanel />
          <Records records={records} definition={p} />
        </ComparisonProvider>
        <details>
          <summary>Your recorded evidence relationships</summary>
          {d.finding.links.map((l) => {
            const record = records.find((r) => keyOf(r.ref) === keyOf(l.ref));
            return record ? (
              <p key={`${keyOf(l.ref)}/${l.claimId}`}>
                {record.title} →{" "}
                {p.mechanic.claims.find((c) => c.id === l.claimId)?.label}:{" "}
                {l.role.replaceAll("_", " ")}.
              </p>
            ) : null;
          })}
          <p>
            Only relationships whose observations are present in the current
            known-then view are listed.
          </p>
        </details>
        <details>
          <summary>Your investigation timeline</summary>
          <HistoryTimeline items={d.history.filter((h) => h.tick <= through)} />
        </details>
      </section>
      <section className="panel">
        <h2>Evidence-linked feedback</h2>
        {d.quality.reasons.map((r) => (
          <div key={r.id}>
            <p>
              {r.points === r.possible ? "Established: " : "To strengthen: "}
              {r.text}
            </p>
            {r.refs.length ? (
              <button
                onClick={() => {
                  setThrough(d.closeTick);
                  setRelated(r.refs);
                }}
              >
                Inspect observations for {r.id.replaceAll(".", " ")}
              </button>
            ) : null}
          </div>
        ))}
        <details>
          <summary>Optional in-game quality breakdown</summary>
          <p>
            This scenario-specific feedback is not a professional competency
            diagnosis.
          </p>
          <p>
            Total: {d.quality.total}/100 · evidence {d.quality.evidence} × 30% ·
            reasoning {d.quality.reasoning} × 25% · decision{" "}
            {d.quality.decision} × 30% · report {d.quality.report} × 15%.
          </p>
        </details>
      </section>
      <div className="mechanic-columns">
        <section className="panel">
          <h2>Could have been checked</h2>
          {p.queries
            .filter(
              (q) =>
                !d.acquisitions.some(
                  (a) => a.queryId === q.id && a.deliveredTick <= d.closeTick,
                ),
            )
            .map((q) => (
              <p key={q.id}>
                <strong>{q.label}.</strong> {q.can} {q.cannot}
              </p>
            ))}
          <p>
            There is no secretly optimal click order. Each useful source answers
            a distinct evidence question.
          </p>
        </section>
        <section className="panel">
          <h2>Not observable then</h2>
          {d.records
            .filter((r) => r.coverage !== "covered")
            .map((r) => (
              <p key={keyOf(r.ref)}>{r.text}</p>
            ))}
          {d.pendingChecks.map((c) => (
            <p key={c.id}>
              A verified check for {c.targetId} was still pending at submission
              (due step {c.dueTick}). Its later result cannot support the
              original finding.
            </p>
          ))}
          <p>
            A missing source, person identity or motive cannot be filled in by
            guessing the authored world.
          </p>
        </section>
      </div>
      <section className="panel">
        <h2>After your handoff · operational outcome</h2>
        <p>
          {d.objectiveOccurred
            ? "The bounded out-of-scope objective completed in the simulation."
            : "The bounded out-of-scope objective did not complete in the simulation."}{" "}
          {d.controlEffective
            ? "The authorised responder restricted only the named session."
            : "No effective session restriction is recorded in this continuation."}
        </p>
        <p>
          Continuation resolved through step {d.resolvedThrough}. This separate
          outcome does not change your decision-time investigation quality.
        </p>
        <button aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>
          {revealed
            ? "Hide simulation reconstruction"
            : "Reveal simulation reconstruction"}
        </button>
        {revealed ? (
          <>
            <h3>Actual world activity</h3>
            <HistoryTimeline
              items={[...d.events]
                .sort(
                  (a, b) =>
                    a.tick - b.tick ||
                    a.phase - b.phase ||
                    a.priority - b.priority ||
                    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
                )
                .map((e) => ({
                  id: e.id,
                  tick: e.tick,
                  title: `Phase ${e.phase} · ${e.kind.replaceAll("_", " ")}`,
                  text: `${e.actor}: ${e.text} ${e.occurred ? "Occurred." : "Preconditions were not satisfied; no effect."}`,
                  refs: [],
                }))}
            />
            <h3>Source collection</h3>
            {d.collection.map((c) => (
              <p key={c.id}>
                {c.sourceId.replaceAll("_", " ")} · recorded step{" "}
                {c.recordedTick} ·{" "}
                {c.availableAt > d.resolvedThrough
                  ? "scheduled availability"
                  : "available"}{" "}
                {c.availableAt} · {c.coverage}. Origin {c.originId}.
              </p>
            ))}
            <h3>Player acquisitions</h3>
            {d.acquisitions.map((a) => (
              <p key={a.id}>
                {a.queryId} · target {a.targetId} · cutoff {a.cutoffTick} ·
                delivered {a.deliveredTick} · {a.refs.length} observation(s).
              </p>
            ))}
          </>
        ) : null}
      </section>
      <section className="panel">
        <h2>Take it to the next investigation</h2>
        <ul>
          {d.takeaways.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <details>
          <summary>Optional transfer question</summary>
          <p>
            Which additional source would strengthen the conclusion in a similar
            investigation, and which target, capability or time limit would
            still remain?
          </p>
        </details>
        <button disabled={busy} onClick={replay}>
          Try another approach · same conditions
        </button>
        <p>
          Replay uses the same authored world and conditions after a reveal; it
          is a learning exercise, not a blind test.
        </p>
      </section>
    </section>
  );
}
