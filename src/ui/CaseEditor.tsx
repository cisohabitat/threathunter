import { useNavigation } from "../stores/view";
import { useEffect, useRef, useState } from "react";
import {
  refKey,
  type PlayerView,
  type CaseDraft,
  type Action,
} from "../domain/contracts";
import { EvidenceCard } from "./EvidenceCard";
import {
  alternativeLabels,
  caveatLabels,
  nextLabels,
  dispositionLabels,
  recordTitles,
} from "./caseLanguage";
const packages = {
  close_explained: {
    nextOwnerRole: "none",
    reviewWithinTicks: null,
    followupTrigger: "routine_monitoring",
  },
  handoff_revoke_session: {
    nextOwnerRole: "response_team",
    reviewWithinTicks: 2,
    followupTrigger: "confirm_revocation_and_assess_scope",
  },
  handoff_review_monitor: {
    nextOwnerRole: "response_team",
    reviewWithinTicks: 4,
    followupTrigger: "new_suspicious_activity_or_verification_result",
  },
} as const;
const stages = ["Explanation", "Evidence", "Unknowns", "Next step"];
export function CaseEditor({
  view,
  send,
  busy,
  readOnly,
}: {
  view: PlayerView;
  send: (action: Action) => Promise<void>;
  busy: boolean;
  readOnly: boolean;
}) {
  const remembered = useNavigation.getState().editor;
  const section = useRef<HTMLElement>(null);
  const wasReview = useRef(false);
  const [review, setReview] = useState(false),
    [stage, updateStage] = useState(
      remembered?.runId === view.runId ? remembered.stage : 0,
    ),
    [notes, updateNotes] = useState(
      remembered?.runId === view.runId
        ? remembered.notes
        : view.draft.optionalNotes,
    );
  const setStage = (next: number) => {
    updateStage(next);
    useNavigation.getState().rememberEditor(view.runId, next, notes);
  };
  const setNotes = (next: string) => {
    updateNotes(next);
    useNavigation.getState().rememberEditor(view.runId, stage, next);
  };
  const d = view.draft;
  const lastSavedNotes = useRef(d.optionalNotes);
  useEffect(() => {
    const previous = lastSavedNotes.current;
    lastSavedNotes.current = d.optionalNotes;
    if (
      notes !== d.optionalNotes &&
      (readOnly || (previous !== d.optionalNotes && notes === previous))
    ) {
      updateNotes(d.optionalNotes);
      useNavigation
        .getState()
        .rememberEditor(view.runId, stage, d.optionalNotes);
    }
  }, [d.optionalNotes, notes, readOnly, stage, view.runId]);
  useEffect(() => {
    if (review) section.current?.querySelector<HTMLElement>("h2")?.focus();
    else if (wasReview.current)
      section.current
        ?.querySelector<HTMLElement>('.case-stages button[aria-current="step"]')
        ?.focus();
    wasReview.current = review;
  }, [review]);
  const patch = (changes: Partial<CaseDraft>) =>
    send({
      kind: "EDIT_CASE",
      draft: { ...d, ...changes, coverageThroughTick: view.tick },
    });
  const cited = view.records.filter((r) =>
    d.evidence.some((e) => refKey(e) === refKey(r.ref)),
  );
  const opposing = view.records.filter((r) =>
    d.alternativeEvidence.some((e) => refKey(e) === refKey(r.ref)),
  );
  const showReview = async () => {
    if (notes !== d.optionalNotes) await patch({ optionalNotes: notes });
    setReview(true);
  };
  if (review)
    return (
      <section
        ref={section}
        className="panel review"
        onKeyDown={(event) => {
          if (event.key === "Escape") setReview(false);
        }}
      >
        <p className="eyebrow">Confirm your finding · S-01 only</p>
        <h2 tabIndex={-1}>What can you defend?</h2>
        <div className="finding-summary">
          <h3>{dispositionLabels[d.disposition]}</h3>
          <p>{d.confidence} confidence · scoped to this session</p>
          <h3>Your proposed next step</h3>
          <p>{nextLabels[d.nextStep]}</p>
          <p>
            Next owner:{" "}
            {d.nextOwnerRole === "none"
              ? "Routine monitoring"
              : "Response team"}
            {d.reviewWithinTicks
              ? ` · review requested within ${d.reviewWithinTicks} steps`
              : ""}
            .
          </p>
        </div>
        <h3>Cited observations ({cited.length})</h3>
        {cited.map((r) => (
          <blockquote key={refKey(r.ref)}>
            {r.observation}
            <small>
              {recordTitles[r.ref.recordId]} · through step {r.snapshotCutoff}
            </small>
          </blockquote>
        ))}
        {!cited.length ? (
          <p className="notice">
            You have not cited evidence. You may still submit and learn from the
            debrief.
          </p>
        ) : null}
        <h3>Another explanation you considered</h3>
        <p>{alternativeLabels[d.alternativeStatus]}</p>
        {opposing.map((r) => (
          <p key={refKey(r.ref)}>{r.observation}</p>
        ))}
        <h3>What you still don’t know</h3>
        {d.caveats.length ? (
          d.caveats.map((c) => (
            <div key={c.code}>
              <p>{caveatLabels[c.code]}</p>
              {view.records
                .filter((r) =>
                  c.evidence.some((e) => refKey(e) === refKey(r.ref)),
                )
                .map((r) => (
                  <blockquote key={refKey(r.ref)}>{r.observation}</blockquote>
                ))}
            </div>
          ))
        ) : (
          <p className="muted">
            No limitations recorded. You can go back and explain a relevant
            uncertainty.
          </p>
        )}
        <p>
          {view.pendingChecks.length
            ? `Owner verification is pending; due at step ${view.pendingChecks[0].dueTick}.`
            : "No pending owner check."}
        </p>
        {notes ? (
          <>
            <h3>Your notes · not graded</h3>
            <p className="preserve-lines">{notes}</p>
          </>
        ) : null}
        <p className="muted">
          Confirming freezes this assessment. Any response is a separate,
          unscored continuation.
        </p>
        <div className="actions">
          <button
            disabled={busy}
            className="primary"
            onClick={() =>
              send({
                kind: "CLOSE_CASE",
                draft: {
                  ...d,
                  optionalNotes: notes,
                  coverageThroughTick: view.tick,
                },
              })
            }
          >
            Confirm and close case
          </button>
          <button disabled={busy} onClick={() => setReview(false)}>
            Keep investigating
          </button>
        </div>
      </section>
    );
  return (
    <section ref={section} className="panel case-editor">
      <p className="eyebrow">Your case · S-01 only</p>
      <h2>Build a defensible finding.</h2>
      <p className="muted">
        Four short steps. Everything here is free, and you can change your mind
        before closing.
      </p>
      <nav className="case-stages" aria-label="Case File steps">
        {stages.map((name, i) => (
          <button
            key={name}
            aria-current={stage === i ? "step" : undefined}
            onClick={() => setStage(i)}
          >
            <span>0{i + 1}</span>
            {name}
          </button>
        ))}
      </nav>
      <div className="case-progress">
        <span>{d.evidence.length} cited observation(s)</span>
        <span>{d.alternativeEvidence.length} alternative check(s)</span>
        <span>{d.caveats.length} limitation(s)</span>
      </div>
      {stage === 0 ? (
        <fieldset disabled={busy}>
          <legend>01 · Working explanation</legend>
          <p>
            Choose the finding you can currently defend. An unusual login is a
            starting question, not a verdict.
          </p>
          <div className="finding-options">
            {Object.entries(dispositionLabels).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={d.disposition === id}
                onClick={() =>
                  patch({ disposition: id as CaseDraft["disposition"] })
                }
              >
                <strong>{label}</strong>
                <span>
                  {id === "explained"
                    ? "The evidence gives this session a credible explanation."
                    : id === "likely_misuse"
                      ? "The evidence supports unauthorised session use."
                      : "The actor is uncertain, or the evidence supports a provisional handoff."}
                </span>
              </button>
            ))}
          </div>
          <label>
            Confidence about this finding
            <select
              value={d.confidence}
              onChange={(e) =>
                patch({ confidence: e.target.value as CaseDraft["confidence"] })
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <p className="muted">
            Confidence means how sure you are about the finding. A careful
            unresolved report can have low confidence and excellent
            investigation quality.
          </p>
        </fieldset>
      ) : null}
      {stage === 1 ? (
        <fieldset disabled={busy}>
          <legend>02 · Supporting and opposing facts</legend>
          <p>
            Cite the observations your finding relies on. Use a record to test
            another explanation where appropriate. These are your reasoning
            choices, not a correctness check.
          </p>
          <label>
            What happened to the other explanation?
            <select
              value={d.alternativeStatus}
              onChange={(e) =>
                patch({
                  alternativeStatus: e.target
                    .value as CaseDraft["alternativeStatus"],
                })
              }
            >
              {Object.entries(alternativeLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {view.records.map((r) => (
            <EvidenceCard
              key={refKey(r.ref)}
              record={r}
              draft={d}
              tick={view.tick}
              busy={busy}
              send={send}
            />
          ))}
        </fieldset>
      ) : null}
      {stage === 2 ? (
        <fieldset disabled={busy}>
          <legend>03 · What remains unknown</legend>
          <p>
            Pick a limitation that matters to your finding, then link the
            observation that explains it. You do not need to fill every
            category.
          </p>
          {Object.entries(caveatLabels).map(([code, label]) => {
            const caveat = d.caveats.find((c) => c.code === code);
            return (
              <details
                className="limitation-choice"
                key={code}
                open={Boolean(caveat)}
              >
                <summary>
                  {caveat ? "✓ " : ""}
                  {label}
                </summary>
                <label>
                  Evidence for: {label}
                  <select
                    value={
                      caveat?.evidence[0] ? refKey(caveat.evidence[0]) : ""
                    }
                    onChange={(e) => {
                      const record = view.records.find(
                        (r) => refKey(r.ref) === e.target.value,
                      );
                      patch({
                        caveats: [
                          ...d.caveats.filter((c) => c.code !== code),
                          ...(record
                            ? [
                                {
                                  code: code as CaseDraft["caveats"][number]["code"],
                                  evidence: [record.ref],
                                },
                              ]
                            : []),
                        ],
                      });
                    }}
                  >
                    <option value="">No limitation recorded</option>
                    {view.records.map((r) => (
                      <option key={refKey(r.ref)} value={refKey(r.ref)}>
                        {recordTitles[r.ref.recordId]} · through step{" "}
                        {r.snapshotCutoff}: {r.observation}
                      </option>
                    ))}
                  </select>
                </label>
                {caveat?.evidence.length && caveat.evidence.length > 1 ? (
                  <p>
                    Additional linked observations are also retained until you
                    change this selection.
                  </p>
                ) : null}
              </details>
            );
          })}
        </fieldset>
      ) : null}
      {stage === 3 ? (
        <fieldset disabled={busy}>
          <legend>04 · Next step</legend>
          <p>
            Choose what should happen to this lead. A recommendation goes to the
            response team; you cannot approve your own control.
          </p>
          <label>
            Recommendation
            <select
              value={d.nextStep}
              onChange={(e) => {
                const nextStep = e.target.value as CaseDraft["nextStep"];
                patch({ nextStep, ...packages[nextStep] });
              }}
            >
              {Object.entries(nextLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="next-owner">
            <strong>
              {d.nextOwnerRole === "none"
                ? "Routine monitoring"
                : "Response team owns the follow-up"}
            </strong>
            <p>
              {d.nextStep === "close_explained"
                ? "Close only this investigated lead. Do not claim the whole organisation is clean."
                : d.nextStep === "handoff_revoke_session"
                  ? "Request review within 2 steps, confirmation of session revocation and assessment of scope."
                  : "Request review within 4 steps, collection restoration, owner verification and monitoring for new activity."}
            </p>
          </div>
          <label>
            Optional notes · not graded
            <textarea
              disabled={busy}
              maxLength={4000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {notes !== d.optionalNotes ? (
            <p className="muted">
              Notes have unsaved changes. They stay in memory when changing
              tabs. Save them before reloading; reviewing also saves them.
            </p>
          ) : null}
          <button
            disabled={busy || notes === d.optionalNotes}
            onClick={() => patch({ optionalNotes: notes })}
          >
            Save notes · free
          </button>
        </fieldset>
      ) : null}
      <div className="case-step-actions">
        <div className="actions">
          {stage > 0 ? (
            <button disabled={busy} onClick={() => setStage(stage - 1)}>
              ← Back
            </button>
          ) : null}
          {stage < 3 ? (
            <button disabled={busy} onClick={() => setStage(stage + 1)}>
              Next: {stages[stage + 1]} →
            </button>
          ) : null}
        </div>
        <button className="primary" disabled={busy} onClick={showReview}>
          Review finding →
        </button>
      </div>
      <p className="muted">
        Review is always available. You can submit an incomplete finding and
        learn from its debrief.
      </p>
    </section>
  );
}
