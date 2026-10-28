import { PlayPrimer } from "../ui/PlayPrimer";
import { BackupImport } from "../ui/BackupImport";
import { useEffect, useRef, useState } from "react";
import { packages } from "./content";
import { type Finding, type MissionId, type View } from "./contracts";
import { useCampaign } from "./useCampaign";
import { HistoryTimeline } from "../ui/HistoryTimeline";
import { AudioPanel } from "../ui/AudioPanel";
import { useMissionAudio } from "../presentation/sound/useMissionAudio";
import { audioPacks, cueMaps, findingCue } from "./audio";
import { CampaignDebrief } from "./Debrief";
import { CampaignGuide, CampaignFieldGuide } from "./Guide";
import { ContinueJourney } from "../journey/Journey";
import type { CaseId } from "../journey/contracts";
import { ComparisonPanel, ComparisonProvider } from "../comparison/Comparison";
import { fromP1 } from "../comparison/model";

import {
  claimLabels,
  handoffLabels,
  limitLabels,
  followupLabels,
} from "./labels";
import { Records, RecordCard } from "./Records";
type Game = ReturnType<typeof useCampaign>;
function Scope({ view, game }: { view: View; game: Game }) {
  const legacy = view.records.some((r) => r.relationship?.host === "LEGACY-01");
  const targets =
    view.missionId === "M04"
      ? ["all", "APP-01", ...(legacy ? ["LEGACY-01"] : [])]
      : ["all", "CS-API", "CS-PORTAL"];
  return (
    <section className="panel">
      <p className="eyebrow">Choose the question’s scope · free</p>
      <h2>
        {view.missionId === "M04"
          ? "Follow an account-to-host relationship"
          : "Compare declared and observed collection"}
      </h2>
      {view.missionId === "M04" ? (
        <table className="scope-matrix">
          <caption>svc-billing · account-to-host comparison</caption>
          <thead>
            <tr>
              <th>Host</th>
              <th>Account relationship</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>APP-01</th>
              <td>
                Expected scheduled batch origin.{" "}
                {view.records.some((r) => r.relationship?.host === "APP-01")
                  ? "Authentication comparison acquired."
                  : "Observed relationships not yet queried."}
              </td>
            </tr>
            {legacy ? (
              <tr>
                <th>LEGACY-01</th>
                <td>
                  An interactive account relationship was discovered by your
                  query. Select it to test its purpose and business dependency.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      ) : (
        <>
          <div className="context-grid">
            <article>
              <h3>CS-API</h3>
              <p>
                Customer-service API. Its result cannot stand in for the portal.
              </p>
            </article>
            <article>
              <h3>CS-PORTAL</h3>
              <p>
                Customer-service portal. Investigate this source’s capability
                and interval explicitly.
              </p>
            </article>
          </div>
          <div
            className="context-grid"
            aria-label="Declared versus observed collection"
          >
            <article>
              <h3>Declared collection</h3>
              <p>
                {view.records.find(
                  (r) => r.sourceId === "collection_configuration",
                )?.text ??
                  "The promised capability and interval have not been inspected yet."}
              </p>
            </article>
            <article>
              <h3>Observed delivery</h3>
              <p>
                {view.records.find((r) => r.sourceId === "delivery_health")
                  ?.text ??
                  "The actual delivery ledger has not been inspected yet."}
              </p>
            </article>
          </div>
        </>
      )}
      <label>
        Investigation scope
        <select
          id={`${view.missionId}-help-scope`}
          value={view.scope}
          disabled={game.blocked}
          onChange={(e) =>
            void game.send({ kind: "SCOPE", targetId: e.target.value as "all" })
          }
        >
          {targets.map((id) => (
            <option key={id} value={id}>
              {id === "all"
                ? view.missionId === "M04"
                  ? "svc-billing · all permitted hosts"
                  : "Both customer-service systems"
                : id}
            </option>
          ))}
        </select>
      </label>
      <p className="muted">
        Narrowing or comparing already acquired information is free. New source
        snapshots cost one step.
      </p>
    </section>
  );
}
function Investigation({ view, game }: { view: View; game: Game }) {
  const pack = packages[view.missionId],
    [windowTicks, setWindowTicks] = useState(4);
  const update = (finding: Finding) =>
    game.send({ kind: "EDIT_CASE", finding });
  const latest = view.records.at(-1);
  const dependency = view.records.some((r) => r.sourceId === "ownership");
  const gap = view.records.some((r) => r.sourceId === "delivery_health");
  const target = view.missionId === "M04" ? "LEGACY-01" : "CS-PORTAL";
  const canEnable =
    view.scope === target &&
    (view.missionId === "M04" ? dependency : gap) &&
    !view.windows.length;
  return (
    <>
      <Scope view={view} game={game} />
      <section className="panel">
        <p className="eyebrow">Which source could test your explanation?</p>
        <h2>Choose an enquiry</h2>
        <div className="question-list">
          {pack.queries.map((q) => {
            const scoped = q.scope !== "host" || view.scope === "LEGACY-01";
            const cached =
              q.static &&
              view.acquisitions.some(
                (a) => a.queryId === q.id && a.targetId === view.scope,
              );
            return (
              <article
                className="question"
                key={q.id}
                id={`${view.missionId}-help-${q.id}`}
                tabIndex={-1}
              >
                <h3>{q.label}</h3>
                <p>{q.can}</p>
                <p className="muted">Limit: {q.cannot}</p>
                <button
                  disabled={game.blocked || !scoped}
                  onClick={() =>
                    void game.send({
                      kind: "ACQUIRE",
                      queryId: q.id,
                      cutoffTick: view.tick,
                    })
                  }
                >
                  {cached
                    ? "Reopen acquired snapshot · free"
                    : `Acquire ${q.label.toLowerCase()} · 1 step`}
                </button>
                {!scoped ? (
                  <p>
                    Select the discovered host to investigate this relationship.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
      <section
        className="panel"
        id={`${view.missionId}-help-collection`}
        tabIndex={-1}
      >
        <h2>Future-only collection</h2>
        <p>
          Activation takes two steps. The stated window starts at completion; it
          cannot backfill an earlier event. Only one bounded window is
          authorised in this run.
        </p>
        <label>
          Observation window
          <select
            value={windowTicks}
            disabled={game.blocked || Boolean(view.windows.length)}
            onChange={(e) => setWindowTicks(Number(e.target.value))}
          >
            <option value={2}>2 steps</option>
            <option value={3}>3 steps</option>
            <option value={4}>4 steps · recommended for verification</option>
          </select>
        </label>
        <button
          disabled={game.blocked || !canEnable}
          onClick={() =>
            void game.send({
              kind: "ENABLE_SENSOR",
              targetId: target,
              sourceId: view.missionId === "M04" ? "task_process" : "cs_app",
              observationTicks: windowTicks,
            })
          }
        >
          Enable future collection · 2 steps
        </button>
        {!canEnable && !view.windows.length ? (
          <p className="muted">
            Select the relevant target and establish{" "}
            {view.missionId === "M04"
              ? "its ownership/dependency"
              : "the delivery gap"}{" "}
            first.
          </p>
        ) : null}
        {view.windows.map((w) => (
          <p key={w.id}>
            {w.sourceId} on {w.targetId}: steps {w.startsAt}–{w.endsAt}.{" "}
            {view.tick > w.endsAt
              ? "The temporary window has ended; use its captured results and hand over permanent repair."
              : "The window is measured in accepted investigation steps."}
          </p>
        ))}
        {view.missionId === "M07" ? (
          <>
            <h3>Controlled source verification</h3>
            <p>
              A harmless privileged application event is generated three steps
              after request. A result applies only to its target, capability and
              event time. You can keep investigating while it is pending.
            </p>
            <button
              disabled={
                game.blocked || !["CS-API", "CS-PORTAL"].includes(view.scope)
              }
              onClick={() =>
                void game.send({
                  kind: "VERIFY",
                  targetId: view.scope as "CS-API" | "CS-PORTAL",
                  capability: "privileged_application_action",
                })
              }
            >
              {view.pending.some((p) => p.targetId === view.scope)
                ? "Check already pending · free"
                : "Request controlled verification · 1 step"}
            </button>
          </>
        ) : null}
      </section>
      <section className="panel">
        <p className="eyebrow">Acquired knowledge</p>
        <h2>Latest observation</h2>
        {latest ? (
          <RecordCard
            record={latest}
            finding={view.finding}
            busy={game.blocked}
            update={update}
          />
        ) : null}
        <details className="earlier-records">
          <summary>All acquired observations ({view.records.length})</summary>
          <Records
            records={[...view.records].reverse()}
            finding={view.finding}
            busy={game.blocked}
            update={update}
          />
        </details>
      </section>
    </>
  );
}
function CaseFile({
  view,
  game,
  onDirtyChange,
}: {
  view: View;
  game: Game;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const finding = view.finding,
    [review, setReview] = useState(false),
    [buffer, setBuffer] = useState({
      base: finding.notes,
      text: finding.notes,
    });
  useEffect(() => {
    onDirtyChange(buffer.text !== finding.notes);
  }, [buffer.text, finding.notes, onDirtyChange]);
  if (
    buffer.base !== finding.notes &&
    ((!game.temporary && game.readOnly) || buffer.text === buffer.base)
  )
    setBuffer({ base: finding.notes, text: finding.notes });
  const update = (next: Finding) =>
    game.send({ kind: "EDIT_CASE", finding: next });
  function recommendation(handoff: Finding["handoff"]) {
    const owner =
      view.missionId === "M07"
        ? "Detection Engineering"
        : handoff === "close_explained"
          ? "none"
          : "Billing Operations";
    const followup =
      view.missionId === "M07"
        ? "repeat_application_verification"
        : handoff === "close_explained"
          ? "routine_monitoring"
          : handoff === "restrict_session"
            ? "confirm_session_restriction"
            : "verify_dependency_and_scope";
    void update({ ...finding, handoff, owner, followup });
  }
  return (
    <section
      className="panel"
      id={`${view.missionId}-help-finding`}
      tabIndex={-1}
    >
      <p className="eyebrow">A finding is more than a verdict</p>
      <h2>Your Case File</h2>
      <p>
        State what the acquired observations support, what they cannot establish
        and who owns the next step. All edits are free. Notes are not graded.
      </p>
      <fieldset disabled={game.blocked}>
        <legend>Explanation and confidence</legend>
        <label>
          Finding
          <select
            value={finding.disposition}
            onChange={(e) =>
              void update({
                ...finding,
                disposition: e.target.value as Finding["disposition"],
              })
            }
          >
            {Object.entries(claimLabels).map(([id, text]) => (
              <option key={id} value={id}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <label>
          Claim confidence
          <select
            value={finding.confidence}
            onChange={(e) =>
              void update({
                ...finding,
                confidence: e.target.value as Finding["confidence"],
              })
            }
          >
            <option value="low">Low · bounded uncertainty</option>
            <option value="medium">Medium · supported scoped claim</option>
            <option value="high">High</option>
          </select>
        </label>
        <p className="muted">
          A visibility finding can be excellent work with low confidence about
          actor intent. This case’s strong explanation/misuse routes use medium
          claim confidence.
        </p>
      </fieldset>
      <h3>Evidence roles</h3>
      <p>
        {finding.evidence.length} cited; {finding.alternativeEvidence.length}{" "}
        used to test another explanation.
      </p>
      <Records
        records={view.records}
        finding={finding}
        busy={game.blocked}
        update={update}
      />
      <fieldset disabled={game.blocked}>
        <legend>Competing explanation and limits</legend>
        <label>
          Alternative tested
          <select
            value={finding.alternative}
            onChange={(e) =>
              void update({
                ...finding,
                alternative: e.target.value as Finding["alternative"],
              })
            }
          >
            <option value="untested">Not tested yet</option>
            <option value="approved_work_tested">
              Compared the specific approved-work explanation
            </option>
            <option value="coverage_configuration_tested">
              Tested a collection/configuration explanation
            </option>
            <option value="attribution_unresolved">
              Operator attribution remains unresolved
            </option>
          </select>
        </label>
        {Object.entries(limitLabels).map(([id, text]) => (
          <label className="audio-check" key={id}>
            <input
              type="checkbox"
              checked={finding.limitations.includes(
                id as Finding["limitations"][number],
              )}
              onChange={(e) =>
                void update({
                  ...finding,
                  limitations: e.target.checked
                    ? [
                        ...finding.limitations,
                        id as Finding["limitations"][number],
                      ]
                    : finding.limitations.filter((l) => l !== id),
                })
              }
            />
            {text}
          </label>
        ))}
      </fieldset>
      <fieldset disabled={game.blocked}>
        <legend>Scope and next action</legend>
        <label className="audio-check">
          <input
            type="checkbox"
            checked={finding.scopeAcknowledged}
            onChange={(e) =>
              void update({ ...finding, scopeAcknowledged: e.target.checked })
            }
          />
          {view.missionId === "M04"
            ? "My finding concerns BILL-S1 on the discovered host, preserving the billing dependency"
            : "My finding concerns the CS-PORTAL application source and its stated missing interval"}
        </label>
        {view.missionId === "M07" ? (
          <label>
            Missing historical interval
            <select
              value={
                finding.missingFrom === -3 && finding.missingThrough === 0
                  ? "gap"
                  : "unknown"
              }
              disabled={
                game.blocked ||
                !view.records.some((r) => r.sourceId === "delivery_health")
              }
              onChange={(e) =>
                void update({
                  ...finding,
                  missingFrom: e.target.value === "gap" ? -3 : null,
                  missingThrough: e.target.value === "gap" ? 0 : null,
                })
              }
            >
              <option value="unknown">Not established yet</option>
              <option value="gap">
                Steps -3 through 0 · application collection only
              </option>
            </select>
          </label>
        ) : (
          <p className="muted">
            Direct host isolation is unavailable. Inventory absence and host age
            are not permission to disrupt billing.
          </p>
        )}
        <label>
          Recommendation
          <select
            value={finding.handoff}
            onChange={(e) =>
              recommendation(e.target.value as Finding["handoff"])
            }
          >
            {Object.entries(handoffLabels)
              .filter(([id]) =>
                view.missionId === "M04"
                  ? id !== "repair_collection"
                  : id === "repair_collection",
              )
              .map(([id, text]) => (
                <option key={id} value={id} disabled={id === "isolate_host"}>
                  {text}
                </option>
              ))}
          </select>
        </label>
        <label>
          Next owner
          <select
            value={finding.owner}
            onChange={(e) =>
              void update({
                ...finding,
                owner: e.target.value as Finding["owner"],
              })
            }
          >
            <option>Billing Operations</option>
            <option>Detection Engineering</option>
            <option value="none">
              No additional response owner · explained lead only
            </option>
          </select>
        </label>
        <label>
          Requested review window
          <select
            value={finding.reviewWithinTicks}
            onChange={(e) =>
              void update({
                ...finding,
                reviewWithinTicks: Number(e.target.value),
              })
            }
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                Within {n} investigation step(s)
              </option>
            ))}
          </select>
        </label>
        <label>
          Follow-up trigger
          <select
            value={finding.followup}
            onChange={(e) =>
              void update({
                ...finding,
                followup: e.target.value as Finding["followup"],
              })
            }
          >
            {Object.entries(followupLabels).map(([id, text]) => (
              <option key={id} value={id}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <label>
          Optional notes · not graded
          <textarea
            value={buffer.text}
            maxLength={4000}
            rows={4}
            onChange={(e) => setBuffer({ ...buffer, text: e.target.value })}
          />
        </label>
        <button onClick={() => void update({ ...finding, notes: buffer.text })}>
          Save notes · free
        </button>
      </fieldset>
      <button
        className="primary"
        disabled={game.blocked}
        onClick={async () => {
          if (buffer.text !== finding.notes)
            await update({ ...finding, notes: buffer.text });
          setReview(true);
        }}
      >
        Review finding
      </button>
      {review ? (
        <section className="finding-summary" aria-label="Review finding">
          <h3>Confirm the scoped handoff</h3>
          <p>
            {claimLabels[finding.disposition]} · {finding.confidence} confidence
          </p>
          <p>
            {finding.evidence.length} cited observations;{" "}
            {finding.alternativeEvidence.length} alternative observations.
          </p>
          <p>
            {handoffLabels[finding.handoff]} · owner: {finding.owner} · review
            within {finding.reviewWithinTicks} steps.
          </p>
          <p>{followupLabels[finding.followup]}</p>
          <p className="preserve-lines">{buffer.text}</p>
          <p>
            Closure freezes this finding and your delivered observations.
            Pending checks or later events cannot revise its quality.
          </p>
          <button
            disabled={game.blocked}
            onClick={() =>
              void game.send({
                kind: "CLOSE_CASE",
                finding: { ...finding, notes: buffer.text },
              })
            }
          >
            Confirm and close hunt
          </button>
          <button onClick={() => setReview(false)}>Keep investigating</button>
        </section>
      ) : null}
    </section>
  );
}
function Timeline({ view, game }: { view: View; game: Game }) {
  const [duration, setDuration] = useState(1);
  return (
    <section className="panel">
      <h2>The investigation timeline</h2>
      <p>
        Reading and navigation never move the world. Steps are investigation
        opportunities, not minutes.
      </p>
      <HistoryTimeline items={view.history} />
      <h3 id={`${view.missionId}-help-pending`} tabIndex={-1}>
        Pending verification
      </h3>
      {view.pending.length ? (
        view.pending.map((c) => (
          <p key={c.id}>
            {c.targetId} · requested at {c.requestedTick}, due at {c.dueTick}.
            No result is assumed before delivery.
          </p>
        ))
      ) : (
        <p>No pending verification.</p>
      )}
      <label>
        Advance the world
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n} step(s)
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={game.blocked}
        onClick={() =>
          void game.send({ kind: "ADVANCE", durationTicks: duration })
        }
      >
        Advance selected steps
      </button>
    </section>
  );
}
export default function Campaign({
  missionId,
  active,
  onExit,
  onOpenMission,
}: {
  missionId: MissionId;
  active: boolean;
  onExit: () => void;
  onOpenMission: (mission: CaseId) => void;
}) {
  const game = useCampaign(missionId),
    pack = packages[missionId],
    [screen, setScreen] = useState("Brief"),
    [notesDirty, setNotesDirty] = useState(false),
    [confirmRecovery, setConfirmRecovery] = useState(false),
    [confirmReload, setConfirmReload] = useState(false),
    [confirmedReplay, setConfirmedReplay] = useState<string | null>(null);
  const replayIdentity = `${game.view?.runId}:${game.resetKey}`;
  const heading = useRef<HTMLHeadingElement>(null),
    scroll = useRef<Record<string, number>>({});
  const audio = useMissionAudio(
    game.view,
    game.debrief,
    `${missionId}:${game.view?.runId}:${game.resetKey}:${screen}`,
    audioPacks[missionId],
    active,
  );
  useEffect(() => {
    if (!notesDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [notesDirty]);
  function navigate(next: string) {
    scroll.current[screen] = window.scrollY;
    setScreen(next);
    requestAnimationFrame(() => {
      window.scrollTo({ top: scroll.current[next] ?? 0, behavior: "instant" });
      heading.current?.focus({ preventScroll: true });
    });
  }
  function showHelp(
    screen: "Investigate" | "Case File" | "Timeline",
    target: string,
  ) {
    navigate(screen);
    requestAnimationFrame(() => {
      const element = document.getElementById(`${missionId}-help-${target}`);
      element?.focus({ preventScroll: true });
      element?.scrollIntoView({ block: "center", behavior: "instant" });
    });
  }
  return (
    <ComparisonProvider
      key={`${game.view?.runId ?? missionId}:${game.resetKey}`}
      records={fromP1(game.debrief ? [] : (game.view?.records ?? []))}
    >
      <div className="app-shell campaign-shell" data-mission={missionId}>
        <a href={`#main-${missionId}`} className="skip-link">
          Skip to investigation
        </a>
        <header className="topbar">
          <button
            className="wordmark"
            onClick={() => {
              audio.playMuted();
              onExit();
            }}
          >
            Threat Hunter · home
          </button>
          <span>{missionId} · INTERNAL CANDIDATE</span>
          {game.view ? (
            <span>STEP {game.view.tick} · no live countdown</span>
          ) : null}
        </header>
        <section
          className="save-strip"
          aria-label={`${missionId} save and recovery`}
          data-readiness={game.readiness}
        >
          <span role="status">{game.busy ? "Working…" : game.status}</span>
          <div>
            {game.view ? (
              <button onClick={() => void game.download()}>
                Export hunt save
              </button>
            ) : (
              <label className="file-button">
                Import hunt save
                <input
                  type="file"
                  accept="application/json"
                  disabled={
                    game.busy ||
                    (!game.temporary &&
                      (game.readOnly ||
                        !game.writerAvailable ||
                        Boolean(game.issue)))
                  }
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) game.rejectOversized();
                      else await game.restore(await file.text());
                    }
                  }}
                />
              </label>
            )}
            {game.storedAvailable ? (
              <button
                onClick={() => void game.download(`active:${missionId}`, true)}
              >
                Export stored recovery data
              </button>
            ) : null}
            {game.originalAvailable ? (
              <button
                onClick={() =>
                  void game.download(`original:${missionId}`, true)
                }
              >
                Export recovery original
              </button>
            ) : null}
          </div>
        </section>
        {game.view ? (
          <BackupImport
            disabled={
              game.blocked ||
              game.temporary ||
              notesDirty ||
              game.durableRevision !== game.view.revision
            }
            replace={game.replace}
            backups={game.backupIds}
            download={game.download}
          />
        ) : null}
        {game.requestError ? (
          <section role="alert">
            <p>{game.requestError}</p>
            <button onClick={game.dismissRequestError}>
              Dismiss import message
            </button>
          </section>
        ) : null}
        <AudioPanel
          audio={audio}
          debrief={null}
          cues={cueMaps[missionId]}
          report={
            game.debrief
              ? {
                  cue: findingCue(game.debrief),
                  objectiveOccurred: game.debrief.objectiveOccurred,
                }
              : undefined
          }
        />
        {game.readOnly && !game.temporary ? (
          <p className="notice">
            Read-only: another tab owns this mission’s save. You may
            read/export, or explicitly create temporary progress.
          </p>
        ) : null}
        {game.error ? (
          <section className="error" role="alert">
            <p>{game.error}</p>
            <p>
              Stored progress is retained. Export before discarding any unsaved
              work.
            </p>
            <div className="actions">
              {!game.view ? (
                <button disabled={game.busy} onClick={game.reloadSaved}>
                  Retry saved-case inspection
                </button>
              ) : null}
              <button
                disabled={
                  game.busy ||
                  !game.writerAvailable ||
                  game.readOnly ||
                  !game.view
                }
                onClick={() => void game.retry()}
              >
                Retry saving retained hunt
              </button>
              <button disabled={game.busy} onClick={game.playTemporarily}>
                Play temporarily without saving
              </button>
            </div>
            <label className="audio-check">
              <input
                type="checkbox"
                checked={confirmReload}
                onChange={(e) => setConfirmReload(e.target.checked)}
              />
              I exported retained progress or accept discarding its unsaved
              changes
            </label>
            <button
              disabled={!confirmReload || game.busy}
              onClick={() => {
                game.reloadSaved();
                setConfirmReload(false);
              }}
            >
              Reload saved hunt
            </button>
          </section>
        ) : null}
        {game.temporary ? (
          <section className="notice" aria-label="Temporary hunt">
            <p>
              Temporary session. Last verified durable revision:{" "}
              {game.durableRevision ?? "none"}. Temporary actions do not replace
              the saved case.
            </p>
            <button
              onClick={() => void game.retry()}
              disabled={
                game.busy ||
                game.readOnly ||
                !game.writerAvailable ||
                !game.view
              }
            >
              Try saving retained hunt
            </button>
          </section>
        ) : null}
        {game.issue ? (
          <section className="panel">
            <h2>Recover this mission</h2>
            <p>
              Export the original first. Recovery archives it before restoring a
              validated previous save or starting a separate case.
            </p>
            <label className="audio-check">
              <input
                type="checkbox"
                checked={confirmRecovery}
                onChange={(e) => setConfirmRecovery(e.target.checked)}
              />
              I understand recovery replaces the active mission and retains its
              original for export
            </label>
            <button
              disabled={
                !confirmRecovery ||
                !game.issue.previous ||
                game.busy ||
                game.readOnly
              }
              onClick={() => void game.recover(true)}
            >
              Restore previous hunt
            </button>
            <button
              disabled={
                !confirmRecovery ||
                game.busy ||
                game.readOnly ||
                !game.writerAvailable
              }
              onClick={() => void game.recover(false)}
            >
              Restart mission with recovery original retained
            </button>
          </section>
        ) : null}
        <main id={`main-${missionId}`} tabIndex={-1}>
          <div className="campaign-banner">
            <picture>
              <source
                media="(max-width: 767px)"
                srcSet="/art/northstar-investigation-portrait-v1.webp"
              />
              <img
                src="/art/northstar-investigation-landscape-v1.webp"
                alt=""
                onError={(e) => {
                  e.currentTarget.hidden = true;
                }}
              />
            </picture>
            <div>
              <p className="eyebrow">
                NORTHSTAR · PLANNED REVIEW · NO OPENING ALERT
              </p>
              <h1 ref={heading} tabIndex={-1}>
                {pack.title}
              </h1>
              <p>{pack.question}</p>
            </div>
          </div>
          {game.view ? (
            <>
              <CampaignGuide
                key={`${game.view.runId}:${game.resetKey}`}
                view={game.view}
                audio={audio}
                show={showHelp}
              />
              <CampaignFieldGuide view={game.view} />
            </>
          ) : null}
          {!game.view ? (
            // Until inspection finishes a saved case may replace this panel,
            // so its actions stay disabled rather than move under the pointer.
            <section className="panel" aria-busy={game.busy}>
              <h2>Your starting question</h2>
              <PlayPrimer />
              <button disabled={game.busy} onClick={() => onOpenMission("M01")}>
                New here? Learn with The Midnight Login →
              </button>
              <p>{pack.briefing}</p>
              <p>
                This mission has its own local save. Switching cases keeps
                accepted in-memory work; export for an independent backup.
                Player, physical-device, artwork and listening reviews are
                deferred.
              </p>
              <button
                className="primary"
                disabled={game.blocked}
                onClick={async () => {
                  await game.start();
                  navigate("Investigate");
                }}
              >
                Begin proactive hunt
              </button>
            </section>
          ) : game.debrief ? (
            <>
              <CampaignDebrief
                data={game.debrief}
                missionId={missionId}
                busy={
                  game.blocked ||
                  (game.temporary && confirmedReplay !== replayIdentity)
                }
                replay={async () => {
                  const acknowledged = confirmedReplay === replayIdentity;
                  if (game.temporary && !acknowledged) return;
                  setConfirmedReplay(null);
                  await game.replay(acknowledged);
                  navigate("Investigate");
                }}
              />
              {game.temporary ? (
                <label className="audio-check">
                  <input
                    type="checkbox"
                    checked={confirmedReplay === replayIdentity}
                    onChange={(event) =>
                      setConfirmedReplay(
                        event.target.checked ? replayIdentity : null,
                      )
                    }
                  />
                  I exported the temporary closed finding I want to keep; replay
                  replaces this in-memory run.
                </label>
              ) : null}
              <ContinueJourney
                mission={missionId}
                open={(mission) => {
                  audio.playMuted();
                  onOpenMission(mission);
                }}
                saved={game.durableRevision === game.view.revision}
              />
            </>
          ) : (
            <>
              <ComparisonPanel />
              <nav
                className="campaign-nav"
                aria-label={`${missionId} investigation`}
              >
                {["Brief", "Investigate", "Case File", "Timeline"].map((s) => (
                  <button
                    key={s}
                    aria-current={screen === s ? "page" : undefined}
                    onClick={() => navigate(s)}
                  >
                    {s}
                  </button>
                ))}
              </nav>
              <div hidden={screen !== "Brief"}>
                <section className="panel">
                  <h2>The review brief</h2>
                  <PlayPrimer />
                  <p>{pack.briefing}</p>
                  <h3>How to play</h3>
                  <p>
                    {missionId === "M04"
                      ? "Compare the account’s activity by host. Select the relationship you discover, check the dependency, then compare approval and session/task/application evidence. A host missing from inventory is a question, not a verdict."
                      : "Inspect declared coverage, compare heartbeats and select one system. Compare collector configuration and authentication limits. Request a controlled test, open a future collection window and inspect only what it actually covers."}
                  </p>
                  <p>
                    Cite observations and mark the alternative you tested. Build
                    your Case File, review it, then explicitly close. Useful
                    uncertainty can score as well as a supported explanation.
                  </p>
                  <p>
                    Only accepted acquisitions, checks, sensor activation and
                    deliberate advances move time. Nothing counts down while you
                    read.
                  </p>
                </section>
              </div>
              <div hidden={screen !== "Investigate"}>
                <Investigation view={game.view} game={game} />
              </div>
              <div hidden={screen !== "Case File"}>
                <CaseFile
                  key={`${game.view.runId}:${game.resetKey}`}
                  view={game.view}
                  game={game}
                  onDirtyChange={setNotesDirty}
                />
              </div>
              <div hidden={screen !== "Timeline"}>
                <Timeline view={game.view} game={game} />
              </div>
            </>
          )}
          {game.archiveIds.length ? (
            <details className="panel">
              <summary>Completed {missionId} investigations</summary>
              {game.archiveIds.map((id, i) => (
                <button key={id} onClick={() => void game.download(id)}>
                  Export completed hunt {i + 1}
                </button>
              ))}
            </details>
          ) : null}
        </main>
        <footer className="global-footer">
          <p>
            Fictional training environment · candidate synthetic voice · local
            browser storage · reviews deferred, not passed.
          </p>
        </footer>
      </div>
    </ComparisonProvider>
  );
}
