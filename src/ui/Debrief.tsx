import type { Debrief as DebriefData } from "../domain/contracts";
export function Debrief({
  data,
  restart,
  busy,
}: {
  data: DebriefData;
  restart: () => Promise<void>;
  busy: boolean;
}) {
  return (
    <main className="debrief">
      <p className="eyebrow">Case M01 · investigation closed</p>
      <h1>
        A finding.
        <br />
        <span>A defensible next step.</span>
      </h1>
      <div className="debrief-grid">
        <section className="panel">
          <p className="eyebrow">Investigation quality</p>
          <div className="score">
            {data.quality.total}
            <span>/100</span>
          </div>
          <p>
            Assessed from your cited observations, reasoning and disclosed
            policy. Hidden intent and operational damage do not change this
            score.
          </p>
          {(["evidence", "reasoning", "decision", "report"] as const).map(
            (k) => (
              <div className="score-row" key={k}>
                <span>{k}</span>
                <meter min={0} max={100} value={data.quality[k]} />
                <strong>{data.quality[k]}</strong>
              </div>
            ),
          )}
        </section>
        <section className="panel">
          <p className="eyebrow">Operational outcome · separate from quality</p>
          <h2>After your handoff</h2>
          <p>{data.response}</p>
          <p>
            {data.objectiveAchieved
              ? "The simulated data objective occurred."
              : "The simulated data objective did not occur."}
          </p>
          <p className="muted">
            Finding frozen at step {data.closeTick}. Continuation resolved
            through step {data.resolvedThrough}. This is an authored simulation,
            not a real-world response prediction.
          </p>
          <h3>What the simulation knew</h3>
          <p>{data.truth}</p>
          <p className="muted">
            These hidden facts were unavailable for grading your intent
            judgement.
          </p>
        </section>
      </div>
      <section className="panel">
        <p className="eyebrow">Reconstruction</p>
        <h2>What you knew at the decision</h2>
        {data.decisionRecords.map((r) => (
          <p key={r.ref.acquisitionId}>
            {r.observation}{" "}
            <span className="muted">Through step {r.snapshotCutoff}.</span>
          </p>
        ))}
        <h3>Feedback by rule</h3>
        {data.quality.reasons.map((r) => (
          <p key={r.ruleId} className={r.points ? "" : "muted"}>
            {r.points ? "✓" : "○"} {r.explanation}{" "}
            <strong>{r.points} points</strong>
          </p>
        ))}
      </section>
      <p className="transfer">
        Take this with you: an anomaly starts a question. A finding needs
        evidence, boundaries and an owner for the next check.
      </p>
      <button className="primary" disabled={busy} onClick={restart}>
        Try another approach →
      </button>
    </main>
  );
}
