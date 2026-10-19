import { useState } from "react";
import {
  refKey,
  type PlayerView,
  type CaseDraft,
  type Action,
  type EvidenceRef,
} from "../domain/contracts";
const alternativeLabels = {
  untested: "Not yet tested",
  misuse_weakened: "Unauthorised use is weakened",
  approved_work_weakened: "Approved work is weakened",
  approved_work_unresolved: "Approved work remains unverified",
};
const caveatLabels = {
  anomaly_not_proof: "Unusual timing alone is not proof",
  registration_not_authorship: "Registration does not identify the operator",
  approval_not_authorship: "Approval does not prove who acted",
  collection_gap: "Collection is missing",
  owner_unavailable: "The owner could not be reached",
  needs_identity_verification: "Identity still needs verification",
};
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
export const nextLabels = {
  close_explained: "Close this lead · routine monitoring",
  handoff_revoke_session: "Recommend response-team revocation of S-01",
  handoff_review_monitor:
    "Hand over for review, collection restoration and owner verification",
};
export const dispositionLabels = {
  explained: "Credible explanation",
  likely_misuse: "Likely session misuse",
  unresolved: "Unresolved / provisional risk",
};
export function CaseEditor({
  view,
  send,
  busy,
}: {
  view: PlayerView;
  send: (action: Action) => Promise<void>;
  busy: boolean;
}) {
  const [review, setReview] = useState(false),
    [notes, setNotes] = useState(view.draft.optionalNotes);
  const d = view.draft;
  const patch = (changes: Partial<CaseDraft>) =>
    send({
      kind: "EDIT_CASE",
      draft: { ...d, ...changes, coverageThroughTick: view.tick },
    });
  const toggle = (refs: EvidenceRef[], ref: EvidenceRef) =>
    refs.some((r) => refKey(r) === refKey(ref))
      ? refs.filter((r) => refKey(r) !== refKey(ref))
      : [...refs, ref];
  if (review)
    return (
      <section className="panel review">
        <p className="eyebrow">Confirm your finding</p>
        <h2>What can you defend?</h2>
        <p>
          Session S-01 only · {dispositionLabels[d.disposition]} ·{" "}
          {d.confidence} confidence
        </p>
        <p>{nextLabels[d.nextStep]}</p>
        <p>
          Next owner:{" "}
          {d.nextOwnerRole === "none" ? "Routine monitoring" : "Response team"}
          {d.reviewWithinTicks
            ? ` · review requested within ${d.reviewWithinTicks} steps`
            : ""}
          .
        </p>
        <h3>Cited observations ({d.evidence.length})</h3>
        {view.records
          .filter((r) => d.evidence.some((e) => refKey(e) === refKey(r.ref)))
          .map((r) => (
            <p key={refKey(r.ref)}>{r.observation}</p>
          ))}
        <p>
          {d.caveats.length} limitation(s) recorded.{" "}
          {view.pendingChecks.length
            ? "Owner verification is still pending."
            : "No pending owner check."}
        </p>
        {!d.evidence.length ? (
          <p className="notice">
            You have not cited evidence. You may still submit and learn from the
            debrief.
          </p>
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
          <button onClick={() => setReview(false)}>Keep investigating</button>
        </div>
      </section>
    );
  return (
    <section className="panel">
      <p className="eyebrow">Your case · S-01 only</p>
      <h2>Build a defensible finding.</h2>
      <p className="muted">
        Changing your explanation, citing records and reading never advance
        time.
      </p>
      <fieldset disabled={busy}>
        <legend>01 · Working explanation</legend>
        <label>
          Finding
          <select
            value={d.disposition}
            onChange={(e) =>
              patch({ disposition: e.target.value as CaseDraft["disposition"] })
            }
          >
            {Object.entries(dispositionLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
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
      </fieldset>
      <fieldset disabled={busy}>
        <legend>02 · Supporting and opposing facts</legend>
        <p>
          Select the observations you cite. Repeated snapshots do not create
          extra corroboration.
        </p>
        {view.records.map((r) => (
          <label className="check" key={refKey(r.ref)}>
            <input
              type="checkbox"
              checked={d.evidence.some((e) => refKey(e) === refKey(r.ref))}
              onChange={() => patch({ evidence: toggle(d.evidence, r.ref) })}
            />
            <span>
              {r.observation}
              <small>
                {r.sourceId.replaceAll("_", " ")} · through step{" "}
                {r.snapshotCutoff}
              </small>
            </span>
          </label>
        ))}
        <label>
          Competing explanation
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
        <p>Which observations test that alternative?</p>
        {view.records.map((r) => (
          <label className="check" key={refKey(r.ref)}>
            <input
              type="checkbox"
              checked={d.alternativeEvidence.some(
                (e) => refKey(e) === refKey(r.ref),
              )}
              onChange={() =>
                patch({
                  alternativeEvidence: toggle(d.alternativeEvidence, r.ref),
                })
              }
            />
            <span>{r.observation}</span>
          </label>
        ))}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>03 · What remains unknown</legend>
        {Object.entries(caveatLabels).map(([code, label]) => {
          const caveat = d.caveats.find((c) => c.code === code);
          return (
            <label key={code}>
              {label}
              <select
                aria-label={`Evidence for: ${label}`}
                value={caveat?.evidence[0] ? refKey(caveat.evidence[0]) : ""}
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
                    {r.observation}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>04 · Next step</legend>
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
        <p className="muted">
          Recommendations go to the response team. You cannot approve your own
          control.
        </p>
        <label>
          Optional notes · not graded
          <textarea
            maxLength={4000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== d.optionalNotes) patch({ optionalNotes: notes });
            }}
          />
        </label>
      </fieldset>
      <button
        className="primary"
        disabled={busy}
        onClick={() => setReview(true)}
      >
        Review finding →
      </button>
    </section>
  );
}
