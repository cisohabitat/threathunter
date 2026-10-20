import { useMemo, useState } from "react";
import { HistoryTimeline } from "./HistoryTimeline";
import {
  CompareButton,
  ComparisonPanel,
  ComparisonProvider,
} from "../comparison/Comparison";
import { fromM01 } from "../comparison/model";
import { refKey, type Debrief as DebriefData } from "../domain/contracts";
import {
  alternativeLabels,
  caveatLabels,
  dispositionLabels,
  nextLabels,
  recordTitles,
  sourceLabels,
} from "./caseLanguage";
const availableQuestions = [
  [
    "EV-02",
    "Compare sign-in history",
    "Establish the account’s usual pattern.",
  ],
  [
    "EV-03",
    "Check device registration",
    "Test whether the unfamiliar client has an enrolled-device mapping.",
  ],
  ["EV-04", "Check approved work", "Test a matching business explanation."],
  [
    "EV-05",
    "Follow session activity",
    "Investigate access scope and collection coverage.",
  ],
] as const;
export function Debrief({
  data,
  restart,
  busy,
}: {
  data: DebriefData;
  restart: () => Promise<void>;
  busy: boolean;
}) {
  const [through, setThrough] = useState(data.closeTick);
  const supported =
    data.quality.reasons.find((r) => r.ruleId === "evidence.support")!.points >
    0;
  const cited = new Set(data.finding.evidence.map(refKey));
  const alternative = new Set(data.finding.alternativeEvidence.map(refKey));
  const unavailable = data.decisionRecords.filter(
    (r) => r.collection === "unavailable",
  );
  const notChecked = availableQuestions.filter(
    ([id]) => !data.decisionRecords.some((r) => r.ref.recordId === id),
  );
  const ticks = useMemo(
    () =>
      [
        ...new Set([
          0,
          data.closeTick,
          ...data.decisionRecords.map((r) => r.deliveredTick),
          ...data.decisionHistory.map((h) => h.tick),
        ]),
      ].sort((a, b) => a - b),
    [data],
  );
  const history = useMemo(
    () => data.decisionHistory.filter((h) => h.tick <= through),
    [data, through],
  );
  const takeaways = data.quality.reasons
    .filter(
      (r) =>
        r.points === 0 &&
        ![
          "reasoning.support",
          "decision.authority",
          "report.followup",
        ].includes(r.ruleId),
    )
    .slice(0, 3);
  const strengths = data.quality.reasons
    .filter(
      (r) =>
        r.points > 0 &&
        [
          "evidence.baseline",
          "reasoning.alternative",
          "reasoning.limit",
        ].includes(r.ruleId),
    )
    .slice(0, 3);
  const anchor = (key: string) =>
    `known-record-${data.decisionRecords.findIndex((r) => refKey(r.ref) === key)}`;
  return (
    <section className="debrief" aria-label="Case debrief">
      <p className="eyebrow">
        CASE M01 · FINDING FROZEN AT STEP {data.closeTick}
      </p>
      <h1>
        Your finding.
        <br />
        <span>What it was built on.</span>
      </h1>
      <section className="panel finding-verdict">
        <p className="eyebrow">Your finding · S-01 only</p>
        <h2>{dispositionLabels[data.finding.disposition]}</h2>
        <p>
          {data.finding.confidence} confidence · {data.finding.evidence.length}{" "}
          cited observation(s)
        </p>
        <p className="verdict-summary">
          {supported
            ? "Your cited observations support this finding within the investigated session."
            : "Your cited observations did not establish this finding. The useful next step is to strengthen the evidence or bound the claim."}
        </p>
        <p>{nextLabels[data.finding.nextStep]}</p>
        <p className="muted">
          This assessment uses the information available when you closed. The
          hidden actor and later operational outcome do not change it.
        </p>
      </section>
      <div className="debrief-grid">
        <section className="panel">
          <p className="eyebrow">Your reasoning</p>
          <h2>What you considered</h2>
          <p>{alternativeLabels[data.finding.alternativeStatus]}</p>
          <h3>Limits you recorded</h3>
          {data.finding.caveats.length ? (
            <ul>
              {data.finding.caveats.map((c) => (
                <li key={c.code}>{caveatLabels[c.code]}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No limitations were recorded.</p>
          )}
          {data.finding.optionalNotes ? (
            <>
              <h3>Your notes · not graded</h3>
              <p className="preserve-lines">{data.finding.optionalNotes}</p>
            </>
          ) : null}
          <h3>
            {takeaways.length ? "Your next investigation" : "Keep doing this"}
          </h3>
          {(takeaways.length ? takeaways : strengths).map((r) => (
            <p key={r.ruleId}>{r.feedback}</p>
          ))}
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
            Continuation resolved through step {data.resolvedThrough}. This is
            an authored simulation, not a real-world response prediction.
          </p>
          <details className="debrief-details">
            <summary>Reveal the simulation’s hidden facts</summary>
            <p>{data.truth}</p>
            <p className="muted">
              These facts were not available to establish your actor-intent
              finding. An honestly unresolved case can still be excellent work.
            </p>
          </details>
        </section>
      </div>
      <details className="panel" aria-label="Simulation reconstruction">
        <summary>Reveal world, collection and acquisition timeline</summary>
        <p>
          This reveals the authored world through step {data.resolvedThrough},
          including events you could not know at your decision. It does not
          change your finding or score.
        </p>
        <h2>What happened in the simulation</h2>
        <ol className="timeline">
          {data.reconstruction.worldEvents.map((event) => (
            <li key={event.id}>
              <strong>{event.tick.toString().padStart(2, "0")}</strong>
              <div>
                <p>{event.description}</p>
                <small>
                  Phase {event.phase} · {event.actor} ·{" "}
                  {event.status === "applied" ? "Applied" : "Did not apply"}
                </small>
                {event.reason ? <p>{event.reason}</p> : null}
              </div>
            </li>
          ))}
        </ol>
        <h2>What sources recorded</h2>
        {data.reconstruction.collectionRecords.length ? (
          data.reconstruction.collectionRecords.map((record) => (
            <p key={record.id}>
              {sourceLabels[record.sourceId] ?? record.sourceId} ·{" "}
              {record.capability.replaceAll("_", " ")} · catalogue/event step{" "}
              {record.eventTick}; available from step {record.availableTick}.
              Recorded context is not automatically an observation you acquired.
            </p>
          ))
        ) : (
          <p>
            No application access-scope record was collected in this world. This
            is a visibility limit, not evidence that no activity occurred.
          </p>
        )}
        <h2>What reached you before closure</h2>
        <p>
          The opening lead was available at step 0. Later acquisitions retain
          their original scope, cutoff and delivery step.
        </p>
        {data.reconstruction.acquisitions.map((acquisition) => (
          <p key={acquisition.id}>
            {sourceLabels[acquisition.sourceId] ?? "Verified directory"} ·
            collected through step {acquisition.cutoffTick} · delivered at step{" "}
            {acquisition.deliveredTick} ·{" "}
            {acquisition.coverage === "unavailable"
              ? "collection unavailable"
              : "stated coverage only"}
            .
          </p>
        ))}
      </details>
      <section className="panel">
        <p className="eyebrow">Evidence reconstruction</p>
        <h2>Known at your decision</h2>
        <p>
          Compare what reached you with what you used. Reading a record and
          citing it are different actions.
        </p>
        <label>
          What I knew then
          {ticks.length > 100 ? (
            <input
              type="number"
              min={0}
              max={data.closeTick}
              step={1}
              value={through}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                if (
                  Number.isInteger(value) &&
                  value >= 0 &&
                  value <= data.closeTick
                )
                  setThrough(value);
              }}
            />
          ) : (
            <select
              value={through}
              onChange={(e) => setThrough(Number(e.target.value))}
            >
              {ticks.map((t) => (
                <option key={t} value={t}>
                  Through step {t}
                  {t === data.closeTick ? " · decision snapshot" : ""}
                </option>
              ))}
            </select>
          )}
        </label>
        <p className="muted">
          Showing observations delivered by step {through}. Later observations
          are hidden; the assessment remains frozen at step {data.closeTick}.
        </p>
        <ComparisonProvider
          records={fromM01(
            data.decisionRecords.filter((r) => r.deliveredTick <= through),
          )}
        >
          <ComparisonPanel />
          {data.decisionRecords
            .filter((r) => r.deliveredTick <= through)
            .map((r) => (
              <article
                className="record"
                id={anchor(refKey(r.ref))}
                key={refKey(r.ref)}
              >
                <div className="record-top">
                  <span>
                    {recordTitles[r.ref.recordId]} ·{" "}
                    {sourceLabels[r.sourceId] ?? r.sourceId}
                  </span>
                  <span>
                    {cited.has(refKey(r.ref))
                      ? "Cited in your finding"
                      : "Not cited in your finding"}
                  </span>
                </div>
                <p>{r.observation}</p>
                <CompareButton reference={r.ref} />
                <small>
                  Collected through step {r.snapshotCutoff} · delivered at step{" "}
                  {r.deliveredTick}
                  {alternative.has(refKey(r.ref))
                    ? " · used to test another explanation"
                    : ""}
                </small>
              </article>
            ))}
        </ComparisonProvider>
        <details className="debrief-details">
          <summary>Your investigation timeline</summary>
          <HistoryTimeline items={history} />
        </details>
      </section>
      <div className="debrief-grid">
        <section className="panel">
          <p className="eyebrow">Could have been checked</p>
          <h2>Other available questions</h2>
          {notChecked.length ? (
            notChecked.map(([, label, why]) => (
              <p key={label}>
                <strong>{label}.</strong> {why}
              </p>
            ))
          ) : (
            <p>
              You checked each of the four available source questions. More
              checks are not automatically better; whether their results support
              your reasoning matters.
            </p>
          )}
          {!data.decisionRecords.some((r) => r.ref.recordId === "EV-06") &&
          !data.pendingChecks.length ? (
            <p>
              A verified-directory owner check was also available. Its result
              would have taken three steps from request; a result is not assumed
              before it arrives.
            </p>
          ) : null}
          <p className="muted">
            These were available enquiries, not a claim about what their hidden
            results would have been. No optimal order or counterfactual outcome
            is implied.
          </p>
        </section>
        <section className="panel">
          <p className="eyebrow">Not observable then</p>
          <h2>Limits on what you could know</h2>
          {unavailable.map((r) => (
            <p key={refKey(r.ref)}>{r.observation}</p>
          ))}
          {data.pendingChecks.map((p) => (
            <p key={p.requestId}>
              Your owner check was due at step {p.dueTick}, after your decision
              at step {data.closeTick}. No response can be treated as known
              earlier.
            </p>
          ))}
          <p>
            Each activity snapshot covers only its stated cutoff. Later activity
            and uncollected sources are not part of your decision-time
            knowledge.
          </p>
        </section>
      </div>
      <details className="panel score-breakdown">
        <summary>
          Investigation quality · show score and evidence-linked feedback
        </summary>
        <div className="score">
          {data.quality.total}
          <span>/100</span>
        </div>
        <p>
          Quality grades your evidence, reasoning, decision and report.
          Operational damage is assessed separately.
        </p>
        {(["evidence", "reasoning", "decision", "report"] as const).map((k) => (
          <div className="score-row" key={k}>
            <span>{k}</span>
            <meter
              aria-label={`${k} score`}
              min={0}
              max={100}
              value={data.quality[k]}
            />
            <strong>{data.quality[k]}</strong>
          </div>
        ))}
        {data.quality.reasons.map((r) => (
          <article className="rubric-feedback" key={r.ruleId}>
            <h3>
              {r.points ? "✓" : "○"} {r.explanation}
            </h3>
            <p>{r.feedback}</p>
            <small>
              {r.points} component points · rubric {data.quality.rubricVersion}
            </small>
            {r.evidence.length ? (
              <div className="feedback-links" aria-label="Related observations">
                {r.evidence.map((ref) => (
                  <a
                    key={refKey(ref)}
                    href={`#${anchor(refKey(ref))}`}
                    onClick={() => setThrough(data.closeTick)}
                  >
                    {recordTitles[ref.recordId]} ·{" "}
                    {
                      data.decisionRecords.find(
                        (rec) => refKey(rec.ref) === refKey(ref),
                      )?.snapshotCutoff
                    }
                  </a>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </details>
      <p className="transfer">
        A finding is more than a verdict: show what supports it, what remains
        uncertain and who owns the next step.
      </p>
      <button className="primary" disabled={busy} onClick={restart}>
        Try another approach →
      </button>
    </section>
  );
}
