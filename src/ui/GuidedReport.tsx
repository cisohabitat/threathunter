import { useEffect, useRef, useState } from "react";
import {
  refKey,
  type Action,
  type CaseDraft,
  type PlayerView,
} from "../domain/contracts";
import { useNavigation } from "../stores/view";
import {
  alternativeLabels,
  caveatLabels,
  dispositionLabels,
  nextLabels,
  recordTitles,
} from "./caseLanguage";
import { nextStepPackages, toggleReference } from "./investigationFlow";
import { Observation } from "./Observation";

const followupLabels: Record<string, string> = {
  routine_monitoring: "routine monitoring",
  confirm_revocation_and_assess_scope:
    "confirm the session ended and assess its scope",
  new_suspicious_activity_or_verification_result:
    "new suspicious activity or an owner-verification result",
};
const prompts = [
  "What do you think happened?",
  "Which facts support your call?",
  "What can’t you tell yet?",
  "What should the team do next?",
  "Ready to send your report?",
];

const uncertaintyHelp = {
  anomaly_not_proof: {
    question: "Does an unusual login prove someone broke in?",
    help: "The unfamiliar login shows unusual timing and a different client. That alone does not establish unauthorised use. Link the original login if this limit matters to your call.",
  },
  registration_not_authorship: {
    question: "Does knowing the computer tell us who used it?",
    help: "Device registration can connect a client to a work computer, or report no match or a missing mapping. It cannot identify the person at the keyboard. Read your device-registration result before including this limit.",
  },
  approval_not_authorship: {
    question: "Does a work approval prove who logged in?",
    help: "The work register checks permission for a task. A matching approval, no approval or an unavailable archive does not by itself identify who acted. Link the work-register result if this matters to your call.",
  },
  collection_gap: {
    question: "Are records missing for the activity we need to check?",
    help: "Read Session activity and coverage. Include this only if it reports missing collection for the interval. An empty result through an earlier cutoff is different: it does not cover later activity.",
  },
  owner_unavailable: {
    question: "Did an attempted owner check end without a reply?",
    help: "Include this only when a delivered Verified-owner check says the owner did not respond. A check you have not requested, or one still pending, is not a completed attempt without a reply.",
  },
  needs_identity_verification: {
    question: "Do we still need to verify who used the account?",
    help: "Session activity can show what the account did without proving who operated it. If the activity leaves identity in question, link that result and explain this limit in your report.",
  },
} satisfies Record<
  keyof typeof caveatLabels,
  { question: string; help: string }
>;

export function GuidedReport({
  view,
  busy,
  send,
  initialReview,
  investigate,
  fullReport,
}: {
  view: PlayerView;
  busy: boolean;
  send: (action: Action) => Promise<void>;
  initialReview: boolean;
  investigate: () => void;
  fullReport: () => void;
}) {
  const [step, setStep] = useState(initialReview ? 4 : 0);
  const [editingReview, setEditingReview] = useState(false);
  const [showAlternative, setShowAlternative] = useState(false);
  const editSection = (target: number, alternative = false) => {
    setShowAlternative(alternative);
    setEditingReview(true);
    setStep(target);
  };
  const heading = useRef<HTMLHeadingElement>(null);
  const d = view.draft;
  const patch = (changes: Partial<CaseDraft>) =>
    void send({
      kind: "EDIT_CASE",
      draft: { ...d, ...changes, coverageThroughTick: view.tick },
    });
  useEffect(() => {
    heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  const remembered = useNavigation((state) => state.editor);
  const notes =
    remembered?.runId === view.runId ? remembered.notes : d.optionalNotes;
  const cited = view.records.filter((r) =>
    d.evidence.some((e) => refKey(e) === refKey(r.ref)),
  );
  const alternative = view.records.filter((r) =>
    d.alternativeEvidence.some((e) => refKey(e) === refKey(r.ref)),
  );
  return (
    <section className="guided-report" aria-label="Your report">
      <p className="eyebrow">
        {step < 4
          ? `YOUR CALL · ${step + 1} OF 4`
          : "YOUR REPORT · THIS LOGIN ONLY"}
      </p>
      <h1 ref={heading} tabIndex={-1}>
        {prompts[step]}
      </h1>
      {step === 0 ? (
        <fieldset disabled={busy}>
          <legend>Choose an explanation</legend>
          <p>You can change your mind. “I can’t tell yet” is a valid call.</p>
          <div className="flow-choices">
            {Object.entries(dispositionLabels).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={d.disposition === id}
                onClick={() =>
                  patch({ disposition: id as CaseDraft["disposition"] })
                }
              >
                {label}
              </button>
            ))}
          </div>
          <label>
            How sure are you?
            <select
              value={d.confidence}
              onChange={(e) =>
                patch({ confidence: e.target.value as CaseDraft["confidence"] })
              }
            >
              <option value="low">Not very sure · low confidence</option>
              <option value="medium">Fairly sure · medium confidence</option>
              <option value="high">Very sure · high confidence</option>
            </select>
          </label>
        </fieldset>
      ) : null}
      {step === 1 ? (
        <fieldset disabled={busy}>
          <legend>Choose the facts your report relies on</legend>
          <p>
            Everything you found is in your notebook. Select the observations
            that support your call; reading alone does not cite them.
          </p>
          {view.records.map((r) => (
            <label className="flow-fact" key={refKey(r.ref)}>
              <input
                type="checkbox"
                checked={d.evidence.some(
                  (ref) => refKey(ref) === refKey(r.ref),
                )}
                onChange={() =>
                  patch({ evidence: toggleReference(d.evidence, r.ref) })
                }
              />
              <span>
                <strong>
                  {recordTitles[r.ref.recordId]} · through step{" "}
                  {r.snapshotCutoff}
                </strong>
                <span>{r.observation}</span>
              </span>
            </label>
          ))}
          <details
            open={showAlternative}
            onToggle={(event) => setShowAlternative(event.currentTarget.open)}
          >
            <summary>Review the other explanation you tested</summary>
            <label>
              What did your checks show?
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
            <p>Select the records you used to test that explanation.</p>
            {view.records.map((r) => (
              <label className="flow-fact" key={refKey(r.ref)}>
                <input
                  type="checkbox"
                  checked={d.alternativeEvidence.some(
                    (ref) => refKey(ref) === refKey(r.ref),
                  )}
                  onChange={() =>
                    patch({
                      alternativeEvidence: toggleReference(
                        d.alternativeEvidence,
                        r.ref,
                      ),
                    })
                  }
                />
                <span>
                  <strong>
                    {recordTitles[r.ref.recordId]} · through step{" "}
                    {r.snapshotCutoff}
                  </strong>
                  <span>{r.observation}</span>
                </span>
              </label>
            ))}
          </details>
        </fieldset>
      ) : null}
      {step === 2 ? (
        <fieldset disabled={busy}>
          <legend>Keep your claim within the evidence</legend>
          <p>
            Open a question, read the guidance and decide whether it applies to
            the records you collected. Nothing is selected for you. Link a
            record only when it supports the limit you want to report; you can
            leave these empty.
          </p>
          {Object.entries(caveatLabels).map(([code, label]) => {
            const caveat = d.caveats.find((c) => c.code === code);
            const guidance =
              uncertaintyHelp[code as keyof typeof uncertaintyHelp];
            return (
              <details key={code} open={Boolean(caveat)}>
                <summary>{guidance.question}</summary>
                <p>{guidance.help}</p>
                <p>Report limit: {label}</p>
                <label>
                  Observation for: {label}
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
                    <option value="">Not included in my report</option>
                    {view.records.map((r) => (
                      <option key={refKey(r.ref)} value={refKey(r.ref)}>
                        {recordTitles[r.ref.recordId]} · through step{" "}
                        {r.snapshotCutoff}: {r.observation}
                      </option>
                    ))}
                  </select>
                  {caveat && caveat.evidence.length > 1 ? (
                    <small>
                      Additional linked observations remain included until you
                      change this selection.
                    </small>
                  ) : null}
                </label>
              </details>
            );
          })}
        </fieldset>
      ) : null}
      {step === 3 ? (
        <fieldset disabled={busy}>
          <legend>Choose your recommendation</legend>
          <p>
            You investigate and recommend. The response team carries out any
            session restriction.
          </p>
          <div className="flow-choices">
            {Object.entries(nextLabels).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={d.nextStep === id}
                onClick={() => {
                  const nextStep = id as CaseDraft["nextStep"];
                  patch({ nextStep, ...nextStepPackages[nextStep] });
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="flow-tip">
            {d.nextStep === "close_explained"
              ? "Close this login only; routine monitoring continues."
              : d.nextStep === "handoff_revoke_session"
                ? "Ask the response team to review within 2 steps, confirm the session ended and assess its scope."
                : "Ask the response team to review within 4 steps, restore missing collection, verify the owner and monitor new activity."}
          </p>
        </fieldset>
      ) : null}
      {step === 4 ? (
        <div className="flow-summary">
          <div className="report-section-heading report-verdict">
            <h2>{dispositionLabels[d.disposition]}</h2>
            <button
              className="quiet-edit"
              aria-label="Edit explanation and confidence"
              disabled={busy}
              onClick={() => editSection(0)}
            >
              Edit
            </button>
          </div>
          <p>
            {d.confidence} confidence · account U-01, session S-01 only ·
            evidence through step {view.tick}
          </p>
          <div className="report-section-heading">
            {" "}
            <h3>Facts I rely on ({cited.length})</h3>
            <button
              className="quiet-edit"
              aria-label="Edit supporting facts"
              disabled={busy}
              onClick={() => editSection(1)}
            >
              Edit
            </button>{" "}
          </div>
          {cited.length ? (
            cited.map((r) => <Observation key={refKey(r.ref)} record={r} />)
          ) : (
            <p className="notice">
              No supporting facts selected. You can still submit and learn from
              the debrief.
            </p>
          )}
          <div className="report-section-heading">
            {" "}
            <h3>The other explanation I tested</h3>
            <button
              className="quiet-edit"
              aria-label="Edit overall explanation and its records"
              disabled={busy}
              onClick={() => editSection(1, true)}
            >
              Edit
            </button>{" "}
          </div>
          <p>{alternativeLabels[d.alternativeStatus]}</p>
          {alternative.map((r) => (
            <Observation key={refKey(r.ref)} record={r} />
          ))}
          {!alternative.length ? (
            <p>No records selected for an alternative check.</p>
          ) : null}
          <div className="report-section-heading">
            {" "}
            <h3>What I still can’t tell</h3>
            <button
              className="quiet-edit"
              aria-label="Edit unknowns"
              disabled={busy}
              onClick={() => editSection(2)}
            >
              Edit
            </button>{" "}
          </div>
          {d.caveats.length ? (
            d.caveats.map((c) => (
              <div key={c.code}>
                <p>{caveatLabels[c.code]}</p>
                {view.records
                  .filter((r) =>
                    c.evidence.some((ref) => refKey(ref) === refKey(r.ref)),
                  )
                  .map((r) => (
                    <Observation key={refKey(r.ref)} record={r} />
                  ))}
              </div>
            ))
          ) : (
            <p>No uncertainty recorded.</p>
          )}
          <div className="report-section-heading">
            {" "}
            <h3>What I recommend</h3>
            <button
              className="quiet-edit"
              aria-label="Edit recommendation"
              disabled={busy}
              onClick={() => editSection(3)}
            >
              Edit
            </button>{" "}
          </div>
          <p>{nextLabels[d.nextStep]}</p>
          <p>
            Follow-up owner:{" "}
            {d.nextOwnerRole === "none"
              ? "routine monitoring"
              : "response team"}
            {d.reviewWithinTicks
              ? ` · requested review within ${d.reviewWithinTicks} steps`
              : ""}
            . Trigger:{" "}
            {d.followupTrigger
              ? (followupLabels[d.followupTrigger] ?? d.followupTrigger)
              : "none recorded"}
            .
          </p>
          <p>
            {view.pendingChecks.length
              ? `Owner verification is pending, due at step ${view.pendingChecks[0].dueTick}. You may close before it arrives.`
              : "No owner verification is pending."}
          </p>
          {notes ? (
            <>
              <h3>Your notes · not graded</h3>
              <p className="preserve-lines">{notes}</p>
              {notes !== d.optionalNotes ? (
                <p>These unfinished notes will be included when you confirm.</p>
              ) : null}
            </>
          ) : null}
          <p>
            Confirming ends this investigation and freezes your report. You’ll
            then see what your evidence supported and what could help next time.
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              void send({
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
        </div>
      ) : null}
      <div className="flow-actions">
        {step > 0 ? (
          <button
            disabled={busy}
            onClick={() => (step === 4 ? editSection(0) : setStep(step - 1))}
          >
            {step === 4 ? "Edit my report" : "← Back"}
          </button>
        ) : null}
        {step < 4 ? (
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              setStep(editingReview ? 4 : step + 1);
              setEditingReview(false);
            }}
          >
            {editingReview
              ? "Return to review →"
              : step === 3
                ? "Review finding →"
                : "Continue →"}
          </button>
        ) : null}
        {step < 3 ? (
          <button disabled={busy} onClick={() => setStep(4)}>
            Review finding →
          </button>
        ) : null}
        <button onClick={investigate}>Keep investigating</button>
      </div>
      <details className="flow-extras">
        <summary>Detailed report and notes</summary>
        <button onClick={fullReport}>Open full Case File</button>
      </details>
    </section>
  );
}
