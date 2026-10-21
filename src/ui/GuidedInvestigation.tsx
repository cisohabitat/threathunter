import { useEffect, useRef, useState } from "react";
import {
  refKey,
  type Action,
  type CaseDraft,
  type PlayerView,
  type PublicRecord,
  type QueryId,
} from "../domain/contracts";
import type { Screen } from "../stores/view";
import { GuidedReport } from "./GuidedReport";
import { SourceIcon } from "./SourceIcon";
import { Observation } from "./Observation";
import { investigationFlow, toggleReference } from "./investigationFlow";

const enquiries = [
  {
    id: "Q-C",
    record: "EV-04",
    question: "Was overnight work approved?",
    source: "Work register",
    sourceId: "change_record",
    purpose:
      "Look for permission matching this account, computer, time and task.",
    limit: "Permission alone does not identify who used the account.",
  },
  {
    id: "Q-D",
    record: "EV-03",
    question: "Is this a known work computer?",
    source: "Device registry",
    sourceId: "registry",
    purpose:
      "Check whether this client maps to a registered organisation device.",
    limit: "Registration alone does not identify the person using it.",
  },
  {
    id: "Q-F",
    record: "EV-05",
    question: "What did the account do afterward?",
    source: "Application audit",
    sourceId: "application_audit",
    purpose:
      "Follow this session’s recorded activity through the current step.",
    limit:
      "An empty result covers only the recorded interval. Later activity requires another check.",
  },
] as const;
const interpretations = [
  ["misuse_weakened", "Unauthorised use looks less likely"],
  ["approved_work_weakened", "Approved work looks less likely"],
  ["approved_work_unresolved", "Approved work is still unverified"],
] as const;

export function GuidedInvestigation({
  view,
  busy,
  send,
  navigate,
  independent,
}: {
  view: PlayerView;
  busy: boolean;
  send: (action: Action) => Promise<void>;
  navigate: (screen: Screen) => void;
  independent: () => void;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicRecord | null>(null);
  const [report, setReport] = useState<"edit" | "review" | null>(null);
  const { stage, lead, latest } = investigationFlow(view, dismissed);
  const result = selected ?? latest;
  const otherDeliveries = selected
    ? []
    : view.records.filter(
        (r) =>
          r.deliveredTick === latest.deliveredTick &&
          refKey(r.ref) !== refKey(latest.ref),
      );
  const heading = useRef<HTMLHeadingElement>(null);
  const location = `${report ?? stage}:${refKey(result.ref)}`;
  const previous = useRef(location);
  useEffect(() => {
    if (location !== previous.current && !report) {
      heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
      heading.current?.focus({ preventScroll: true });
    }
    previous.current = location;
  }, [location, report]);
  const patch = (changes: Partial<CaseDraft>) =>
    void send({
      kind: "EDIT_CASE",
      draft: { ...view.draft, ...changes, coverageThroughTick: view.tick },
    });
  const ask = (queryId: QueryId) => {
    setSelected(null);
    void send({ kind: "ACQUIRE", queryId, cutoffTick: view.tick });
  };
  const questions = () => {
    setSelected(null);
    setDismissed(refKey(latest.ref));
    setReport(null);
  };
  return (
    <section className="guided-case" aria-label="Guided investigation">
      <div className="flow-topline">
        <p className="eyebrow">THE MIDNIGHT LOGIN · ONE ACCOUNT, ONE SESSION</p>
        <span className="step-badge">
          STEP {view.tick}
          <small>No live countdown</small>
        </span>
      </div>
      {view.responseWindowOpenedAt !== null ? (
        <p className="notice">
          The records show out-of-role activity. Policy asks for handoff by step{" "}
          {view.responseWindowOpenedAt + 2}. Reading and writing your report
          cost no steps.
        </p>
      ) : null}
      {report ? (
        <GuidedReport
          key={report}
          view={view}
          busy={busy}
          send={send}
          initialReview={report === "review"}
          investigate={questions}
          fullReport={() => navigate("Case File")}
        />
      ) : (
        <>
          <div className="flow-beat">
            {stage === "opening" && !selected ? (
              <>
                <p className="eyebrow">THE MYSTERY</p>
                <h1 ref={heading} tabIndex={-1}>
                  A login at 02:13. Should we worry?
                </h1>
                <p>
                  A finance account was used from an unfamiliar computer. Was
                  this approved work?
                </p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => ask("Q-H")}
                >
                  Compare usual sign-ins · 1 step →
                </button>
                <p className="flow-tip">
                  Identity records · this account and session · through step{" "}
                  {view.tick}. Compare with the previous 14 days of sign-ins. A
                  different pattern gives you a question to investigate.
                </p>
                <details>
                  <summary>Read the original login record</summary>
                  {lead ? <Observation record={lead} /> : null}
                </details>
              </>
            ) : stage === "result" || selected ? (
              <>
                <p className="eyebrow">
                  {selected
                    ? "FROM YOUR NOTEBOOK · FREE TO READ"
                    : "WHAT YOU FOUND"}
                </p>
                <h1 ref={heading} tabIndex={-1}>
                  {result.ref.recordId === "EV-02"
                    ? "How does this compare?"
                    : "What does this tell you?"}
                </h1>
                {result.ref.recordId === "EV-02" && lead ? (
                  <div className="flow-comparison">
                    <Observation record={lead} />
                    <Observation record={result} />
                  </div>
                ) : (
                  <>
                    {otherDeliveries.map((r) => (
                      <Observation key={refKey(r.ref)} record={r} />
                    ))}
                    <Observation record={result} />
                  </>
                )}
                {result.ref.recordId === "EV-02" ? (
                  <p>
                    Unusual timing is a reason to check. It does not tell you
                    who used the account or whether they had permission.
                  </p>
                ) : (
                  <details className="flow-interpretation" open>
                    <summary>
                      Your current overall explanation · free to edit
                    </summary>
                    <p>
                      Taking all your checks together, how does approved work
                      look? This is one overall judgment, shown beside every
                      record. Changing it replaces your earlier judgment.
                    </p>
                    <label className="flow-fact">
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={view.draft.alternativeEvidence.some(
                          (r) => refKey(r) === refKey(result.ref),
                        )}
                        onChange={() =>
                          patch({
                            alternativeEvidence: toggleReference(
                              view.draft.alternativeEvidence,
                              result.ref,
                            ),
                          })
                        }
                      />
                      <span>
                        Use this record to test my overall explanation
                      </span>
                    </label>
                    <div className="flow-choices">
                      {interpretations.map(([id, label]) => (
                        <button
                          key={id}
                          disabled={busy}
                          aria-pressed={view.draft.alternativeStatus === id}
                          onClick={() => patch({ alternativeStatus: id })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="flow-tip">
                      Choose which records you used separately. Your final call
                      and supporting facts stay in your report.
                    </p>
                  </details>
                )}
                <div className="flow-actions">
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={questions}
                  >
                    Choose what to check next →
                  </button>
                  <button disabled={busy} onClick={() => setReport("edit")}>
                    Make my call →
                  </button>
                </div>
                <p className="flow-tip">
                  This record is kept in your notebook. You’ll choose which
                  facts support your report when you make your call.
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow">FOLLOW YOUR QUESTION</p>
                <h1 ref={heading} tabIndex={-1}>
                  What could explain this login?
                </h1>
                <p>
                  Choose what you want to learn. You can check another source
                  afterward or make your call whenever you’re ready.
                </p>
                <div className="flow-enquiries">
                  {enquiries.map((q) => {
                    const acquired = [...view.records]
                      .reverse()
                      .find((r) => r.ref.recordId === q.record);
                    const cached =
                      acquired &&
                      (q.id !== "Q-F" || acquired.snapshotCutoff === view.tick);
                    return (
                      <article key={q.id}>
                        <h2>
                          <SourceIcon source={q.sourceId} />
                          {q.question}
                        </h2>
                        <p>{q.purpose}</p>
                        <small>
                          {q.source} · account U-01 / session S-01 ·{" "}
                          {cached
                            ? `existing snapshot through step ${acquired.snapshotCutoff}`
                            : `collect through step ${view.tick}`}
                        </small>
                        <button
                          disabled={busy}
                          onClick={() =>
                            cached ? setSelected(acquired) : ask(q.id)
                          }
                        >
                          {cached
                            ? "Read this result · free"
                            : `${q.question} · 1 step`}
                        </button>
                        <details>
                          <summary>What this check can’t tell you</summary>
                          <p>{q.limit}</p>
                        </details>
                      </article>
                    );
                  })}
                </div>
                <details className="flow-extras">
                  <summary>Ask the account holder or wait for a reply</summary>
                  <p>
                    Contact the account holder through a verified directory
                    callback. It costs 1 step to request; confirmation, denial
                    or timeout arrives 3 steps after the request. Keep checking
                    other sources while you wait.
                  </p>
                  <button
                    disabled={
                      busy ||
                      view.pendingChecks.length > 0 ||
                      view.records.some((r) => r.ref.recordId === "EV-06")
                    }
                    onClick={() => {
                      void send({
                        kind: "REQUEST_CHECK",
                        check: "directory_callback",
                        subjectId: "U-01",
                      });
                    }}
                  >
                    Request owner verification · 1 step
                  </button>
                  {view.pendingChecks.map((p) => (
                    <div key={p.requestId}>
                      <p>
                        Reply due at step {p.dueTick}. Current step: {view.tick}
                        . Waiting advances the simulation; it can also allow
                        other activity to happen.
                      </p>
                      <button
                        disabled={busy}
                        onClick={() => {
                          void send({ kind: "ADVANCE", durationTicks: 1 });
                        }}
                      >
                        Wait 1 investigation step
                      </button>
                    </div>
                  ))}
                  {view.records.some((r) => r.ref.recordId === "EV-06") ? (
                    <p>The owner check is in your notebook.</p>
                  ) : null}
                </details>
                <button disabled={busy} onClick={() => setReport("edit")}>
                  I’m ready to make my call →
                </button>
              </>
            )}
          </div>
          <div className="flow-footer">
            <span>Investigate → Decide → Send your report</span>
            <button disabled={busy} onClick={() => setReport("review")}>
              Review finding →
            </button>
          </div>
        </>
      )}
      <details className="flow-notebook">
        <summary>Your notebook · {view.records.length} records kept</summary>
        <p>
          Every delivered record stays here. Earlier snapshots keep their
          original cutoff. Keeping a record does not select it as report
          evidence.
        </p>
        {view.records
          .slice(-10)
          .reverse()
          .map((r) => (
            <article key={refKey(r.ref)}>
              <Observation record={r} />
              <button
                onClick={() => {
                  setSelected(r);
                  setReport(null);
                }}
              >
                Think about this record · free
              </button>
            </article>
          ))}
        {view.records.length > 10 ? (
          <button onClick={() => navigate("Explore")}>
            Read all earlier snapshots
          </button>
        ) : null}
      </details>
      <details className="flow-extras">
        <summary>Investigate further · all tools and settings</summary>
        <p>
          Reading and navigation are free. New checks and waiting move the
          simulation. Your scope is this login; the response team owns any
          session restriction.
        </p>
        <div className="flow-actions">
          {(["Explore", "Case File", "Timeline"] as const).map((s) => (
            <button key={s} onClick={() => navigate(s)}>
              {s === "Case File"
                ? "Full Case File and notes"
                : s === "Explore"
                  ? "All sources and comparison tools"
                  : "Timeline and pending requests"}
            </button>
          ))}
          <button onClick={independent}>
            Switch to independent investigation
          </button>
        </div>
      </details>
    </section>
  );
}
