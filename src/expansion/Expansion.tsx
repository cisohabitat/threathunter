import { BackupImport } from "../ui/BackupImport";
import { useEffect, useRef, useState } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { AudioPanel } from "../ui/AudioPanel";
import { useMissionAudio } from "../presentation/sound/useMissionAudio";
import { HistoryTimeline } from "../ui/HistoryTimeline";
import { ComparisonPanel, ComparisonProvider } from "../comparison/Comparison";
import { fromExpansion } from "../comparison/model";
import { ContinueJourney } from "../journey/Journey";
import type { CaseId } from "../journey/contracts";
import { audioPacks, cueMaps, findingCue } from "./audio";
import { missions } from "./public";
import { useExpansion } from "./useExpansion";
import { Records, type Update } from "./Records";
import { Mechanic } from "./Mechanic";
import { Debrief } from "./Debrief";
import type { Slot } from "./storage";
import type { Finding } from "./contracts";
const screens = ["Leads", "Explore", "Case File", "Timeline"] as const;
type Screen = (typeof screens)[number];
const dispositionLabels = {
  explained: "Approved work explains this scoped action",
  misuse: "Activity exceeded the disclosed approved scope",
  visibility: "Collection is insufficient for the intended conclusion",
  provisional: "A preliminary concern needs further review",
};
function preference(key: string) {
  try {
    return (
      (localStorage.getItem(key) ??
        localStorage.getItem("threat-hunter-guidance-v1")) !== "independent"
    );
  } catch {
    return true;
  }
}
export default function Expansion({
  slot,
  active,
  onExit,
  onOpenMission,
}: {
  slot: Slot;
  active: boolean;
  onExit: () => void;
  onOpenMission: (id: CaseId) => void;
}) {
  const game = useExpansion(slot),
    v = game.view,
    p = missions[v?.missionId ?? (slot === "free" ? "M02" : slot)],
    audioMission = v?.missionId ?? (slot === "free" ? "M02" : slot);
  const [screen, setScreen] = useState<Screen>("Leads"),
    [reportStep, setReportStep] = useState(0),
    [guided, setGuided] = useState(() =>
      preference(`threat-hunter-guidance-${slot}`),
    ),
    [hint, setHint] = useState(0),
    [helpLevel, setHelpLevel] = useState(0),
    [seed, setSeed] = useState(""),
    [review, setReview] = useState(false),
    [confirmResponse, setConfirmResponse] = useState(false),
    [confirmRecovery, setConfirmRecovery] = useState(false),
    [confirmReload, setConfirmReload] = useState(false),
    [confirmReplay, setConfirmReplay] = useState(false),
    [source, setSource] = useState("all"),
    [recordPages, setRecordPages] = useState({ Explore: 0, "Case File": 0 }),
    [duration, setDuration] = useState(1),
    [windowDuration, setWindowDuration] = useState(2),
    [notes, setNotes] = useState(""),
    [notesFor, setNotesFor] = useState(""),
    [notesDirty, setNotesDirty] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null),
    positions = useRef<Record<string, number>>({}),
    assistance = useRef<{
      total: number;
      entries: { step: number; screen: Screen; level: number; topic: string }[];
    }>({ total: 0, entries: [] });
  const reduced = useReducedMotion();
  const audio = useMissionAudio(
    v,
    game.debrief,
    `${slot}:${v?.runId ?? "empty"}:${game.resetKey}:${game.debrief ? "debrief" : screen}`,
    audioPacks[audioMission],
    active,
  );
  useEffect(() => {
    if (v && notesFor !== `${v.runId}:${game.resetKey}`) {
      setNotes(v.finding.notes);
      setNotesFor(`${v.runId}:${game.resetKey}`);
      setNotesDirty(false);
      setSource("all");
      setReportStep(0);
      setRecordPages({ Explore: 0, "Case File": 0 });
      setHint(0);
      setHelpLevel(0);
      setConfirmReplay(false);
      positions.current = {};
      assistance.current = { total: 0, entries: [] };
    }
  }, [v, notesFor, game.resetKey]);
  useEffect(() => {
    if (v && game.readOnly) {
      setNotes(v.finding.notes);
      setNotesDirty(false);
    }
  }, [v, game.readOnly]);
  useEffect(() => {
    if (!notesDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [notesDirty]);
  function navigate(next: Screen) {
    if (v) positions.current[`${v.runId}:${screen}`] = window.scrollY;
    setScreen(next);
    setReview(false);
    requestAnimationFrame(() => {
      window.scrollTo({
        top: positions.current[`${v?.runId}:${next}`] ?? 0,
        behavior: "instant",
      });
      heading.current?.focus({ preventScroll: true });
    });
  }
  const update: Update = (change) => {
    if (v) void game.send({ kind: "EDIT_CASE", finding: change(v.finding) });
  };
  function guidance(value: boolean) {
    setGuided(value);
    try {
      localStorage.setItem(
        `threat-hunter-guidance-${slot}`,
        value ? "guided" : "independent",
      );
    } catch {
      /* Session help remains available. */
    }
  }
  function requestHelp(topic = hint, level = helpLevel) {
    if (!v) return;
    setHint(topic);
    setHelpLevel(level);
    assistance.current.total++;
    assistance.current.entries.push({
      step: v.tick,
      screen,
      level,
      topic: `morgan-${topic + 1}`,
    });
    assistance.current.entries = assistance.current.entries.slice(-100);
  }
  async function exportAssistance() {
    const { downloadText } = await import("./storage");
    downloadText(
      JSON.stringify(
        {
          kind: "threat-hunter-assistance",
          schemaVersion: 1,
          missionId: v?.missionId,
          runId: v?.runId,
          sessionOnly: true,
          ...assistance.current,
        },
        null,
        2,
      ),
      "threat-hunter-assistance.json",
    );
  }
  async function reviewFinding() {
    if (!v) return;
    if (notes !== v.finding.notes) {
      await game.send({ kind: "EDIT_CASE", finding: { ...v.finding, notes } });
      setNotesDirty(false);
    }
    setReview(true);
  }
  async function restore(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      game.rejectOversized();
      return;
    }
    await game.restore(await file.text());
  }
  const known = p.entities.filter((e) => v?.entityIds.includes(e.id)),
    f = v?.finding;
  const visibleRecords =
    v?.records.filter((r) => source === "all" || r.sourceId === source) ?? [];
  return (
    <ComparisonProvider
      key={`${v?.runId ?? slot}:${game.resetKey}`}
      records={fromExpansion(game.debrief ? [] : (v?.records ?? []))}
    >
      <LazyMotion features={domAnimation}>
        <div className="app-shell expansion-shell" data-expansion={slot}>
          <a className="skip-link" href={`#main-${slot}`}>
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
              <span aria-hidden="true">⌖</span>
              <span>
                THREAT HUNTER<small>SILENT INTRUSION · HOME</small>
              </span>
            </button>
            <span className="build-tag">
              {slot === "free"
                ? "SEEDED FREE HUNT"
                : p.missionId + " · " + p.trigger}
            </span>
          </header>
          <section
            className="expansion-context"
            aria-label={`${slot} save and readiness`}
          >
            <p role="status">{game.busy ? "Working…" : game.status}</p>
            <p>
              {v
                ? `${v.missionId} · step ${v.tick} · ${v.pendingChecks.length} pending check(s) · ${v.phase === "closed" ? "Finding closed" : "Investigation open"}`
                : "Preparing the mission’s validated save and text-complete workspace."}
            </p>
            <div className="actions">
              {v ? (
                <button
                  disabled={game.busy}
                  onClick={() => void game.download()}
                >
                  Export investigation save
                </button>
              ) : (
                <label>
                  Import this mission’s save
                  <input
                    type="file"
                    accept="application/json,.json"
                    disabled={
                      game.busy ||
                      (!game.temporary &&
                        (game.readOnly ||
                          !game.writerAvailable ||
                          Boolean(game.issue)))
                    }
                    onChange={(e) => void restore(e.target.files?.[0])}
                  />
                </label>
              )}
              <span>
                {game.busy
                  ? "Preparing case…"
                  : v
                    ? "Case ready · optional voice below"
                    : "Text workspace ready · choose or import a case"}
              </span>
            </div>
          </section>
          {v ? (
            <BackupImport
              disabled={
                game.blocked ||
                game.temporary ||
                notesDirty ||
                game.durableRevision !== v.revision
              }
              replace={game.replace}
              backups={game.backupIds}
              download={game.download}
            />
          ) : null}
          {slot !== "free" || v ? (
            <AudioPanel
              audio={audio}
              debrief={null}
              cues={cueMaps[audioMission]}
              report={
                game.debrief
                  ? {
                      cue: findingCue(game.debrief),
                      objectiveOccurred: game.debrief.objectiveOccurred,
                    }
                  : undefined
              }
            />
          ) : (
            <p className="muted">
              The selected free hunt’s voiced briefing becomes available after
              choosing or importing its seed.
            </p>
          )}
          {game.readOnly ? (
            <p className="notice">
              Read-only: another tab owns this investigation. Close that writer
              to transfer ownership; your case will reload its committed
              revision.
            </p>
          ) : null}
          {game.requestError ? (
            <section className="notice" role="alert">
              <p>{game.requestError}</p>
              <button onClick={game.dismissRequestError}>
                Dismiss request message
              </button>
            </section>
          ) : null}
          {game.error ? (
            <section className="notice" role="alert">
              <h2>Stored and retained progress are preserved</h2>
              <p>{game.error}</p>
              {v && !game.readOnly && game.writerAvailable ? (
                <button disabled={game.busy} onClick={() => void game.retry()}>
                  Retry saving retained progress
                </button>
              ) : null}
              <button disabled={game.busy} onClick={game.playTemporarily}>
                Continue as a temporary session
              </button>
              {!v && game.storedAvailable ? (
                <button disabled={game.busy} onClick={game.reloadSaved}>
                  Retry saved-case inspection
                </button>
              ) : null}
              {game.storedAvailable ? (
                <button
                  disabled={game.busy}
                  onClick={() => void game.download(`active:${slot}`, true)}
                >
                  Export raw stored recovery data
                </button>
              ) : null}
            </section>
          ) : null}
          {game.temporary ? (
            <section className="notice">
              <p>
                Temporary play is not saved. Last durable revision:{" "}
                {game.durableRevision ?? "none"}. Export before leaving this
                page.
              </p>
              {game.writerAvailable && !game.readOnly ? (
                <button disabled={game.busy} onClick={() => void game.retry()}>
                  Try saving this session
                </button>
              ) : null}
              {game.storedAvailable ? (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={confirmReload}
                      onChange={(e) => setConfirmReload(e.target.checked)}
                    />{" "}
                    I exported any temporary work I want to keep before
                    reloading.
                  </label>
                  <button
                    disabled={game.busy || !confirmReload}
                    onClick={game.reloadSaved}
                  >
                    Reload saved case and discard temporary changes
                  </button>
                </>
              ) : null}
            </section>
          ) : null}
          {game.issue ? (
            <section className="panel">
              <h2>Recover this mission</h2>
              <p>
                The original row remains untouched. A restart preserves its raw
                copy for inspection; a free-hunt restart uses the disclosed seed
                “recovery”.
              </p>
              <button
                disabled={game.busy}
                onClick={() => void game.download(`active:${slot}`, true)}
              >
                Export recovery original
              </button>
              {game.issue.previous ? (
                <button
                  disabled={game.busy || game.readOnly || !game.writerAvailable}
                  onClick={() => void game.recover(true)}
                >
                  Restore validated previous save
                </button>
              ) : null}
              <label>
                <input
                  type="checkbox"
                  checked={confirmRecovery}
                  onChange={(e) => setConfirmRecovery(e.target.checked)}
                />{" "}
                Preserve the original and start a new case.
              </label>
              <button
                disabled={
                  game.busy ||
                  game.readOnly ||
                  !game.writerAvailable ||
                  !confirmRecovery
                }
                onClick={() => void game.recover(false)}
              >
                Confirm recovery restart
              </button>
            </section>
          ) : null}
          {game.originalAvailable ? (
            <button
              disabled={game.busy}
              onClick={() => void game.download(`original:${slot}`, true)}
            >
              Export preserved recovery original
            </button>
          ) : null}
          <main id={`main-${slot}`}>
            <div className="expansion-banner">
              <picture>
                <source
                  media="(max-width: 767px)"
                  srcSet="/art/northstar-investigation-portrait-v1.webp"
                />
                <img
                  src="/art/northstar-investigation-landscape-v1.webp"
                  alt=""
                  onError={(e) => {
                    e.currentTarget.src = "/art/northstar-night.svg";
                  }}
                />
              </picture>
              <div>
                <p className="eyebrow">
                  NORTHSTAR ·{" "}
                  {slot === "free" ? "CONSTRAINED CAUSAL TEMPLATES" : p.trigger}
                </p>
                <h1 ref={heading} tabIndex={-1}>
                  {slot === "free" && !v
                    ? "Seeded free hunt"
                    : `${p.missionId} · ${p.title}`}
                </h1>
                <p>
                  {slot === "free" && !v
                    ? "Choose a seed to reproduce a validated template, world and disclosed collection/response profile. Cases derive from authored causal packages; their records are not independently randomised."
                    : p.question}
                </p>
              </div>
            </div>
            {!v ? (
              <section className="panel">
                <h2>Your starting question</h2>
                {slot !== "free" ? (
                  <p>{p.briefing}</p>
                ) : (
                  <>
                    <label>
                      Free-hunt seed
                      <input
                        value={seed}
                        maxLength={80}
                        onChange={(e) => setSeed(e.target.value)}
                      />
                    </label>
                    <p>
                      Generator: causal-templates-xorshift32-1. The seed and
                      complete version manifest are saved privately for replay.
                      Human review remains deferred.
                    </p>
                  </>
                )}
                <fieldset>
                  <legend>How would you like to play?</legend>
                  <button aria-pressed={guided} onClick={() => guidance(true)}>
                    Guided investigation · recommended
                  </button>
                  <button
                    aria-pressed={!guided}
                    onClick={() => guidance(false)}
                  >
                    Independent investigation
                  </button>
                </fieldset>
                <button
                  className="primary"
                  disabled={game.blocked || (slot === "free" && !seed.trim())}
                  onClick={() => void game.start(seed)}
                >
                  Begin investigation
                </button>
                <p>
                  Reading is free. Only accepted costly actions advance
                  simulation steps. No account, real security data or runtime AI
                  is used.
                </p>
                {game.archiveIds.length ? (
                  <details>
                    <summary>Saved completed investigations</summary>
                    {game.archiveIds.map((id) => (
                      <button
                        key={id}
                        disabled={game.busy}
                        onClick={() => void game.download(id)}
                      >
                        Export completed {id.split(":").at(-1)}
                      </button>
                    ))}
                  </details>
                ) : null}
              </section>
            ) : game.debrief ? (
              <>
                <Debrief
                  data={game.debrief}
                  definition={p}
                  busy={game.blocked || (game.temporary && !confirmReplay)}
                  replay={() => {
                    void game.replay().then(() => navigate("Leads"));
                    setReview(false);
                  }}
                />
                <section className="panel">
                  <h2>Another case variation</h2>
                  {game.temporary ? (
                    <label>
                      <input
                        type="checkbox"
                        checked={confirmReplay}
                        onChange={(e) => setConfirmReplay(e.target.checked)}
                      />
                      I exported the temporary closed finding I want to keep;
                      replay replaces this in-memory run.
                    </label>
                  ) : null}
                  {slot === "free" ? (
                    <label>
                      Next free-hunt seed
                      <input
                        value={seed}
                        maxLength={80}
                        onChange={(e) => setSeed(e.target.value)}
                      />
                    </label>
                  ) : null}
                  <button
                    disabled={
                      game.blocked ||
                      (game.temporary && !confirmReplay) ||
                      (slot === "free" && !seed.trim())
                    }
                    onClick={() => {
                      void game.another(seed).then(() => navigate("Leads"));
                      setReview(false);
                    }}
                  >
                    Start another{" "}
                    {slot === "free" ? "seeded hunt" : "authored variation"}
                  </button>
                  <p>
                    The exact durably closed run is archived before a new active
                    save begins. Temporary runs require an explicit export
                    acknowledgement.
                  </p>
                </section>
                {slot !== "free" ? (
                  <ContinueJourney
                    mission={v.missionId}
                    open={(id) => {
                      audio.playMuted();
                      onOpenMission(id);
                    }}
                    saved={game.durableRevision === v.revision}
                  />
                ) : (
                  <p>
                    Free hunts remain separate from the twelve authored-case
                    completion records.
                  </p>
                )}
              </>
            ) : (
              <>
                <nav
                  className="campaign-nav"
                  aria-label={`${p.missionId} investigation`}
                >
                  {screens.map((name) => (
                    <button
                      key={name}
                      aria-current={screen === name ? "page" : undefined}
                      onClick={() => navigate(name)}
                    >
                      {name}
                    </button>
                  ))}
                  <button
                    className="primary"
                    onClick={() => void reviewFinding()}
                  >
                    Review finding
                  </button>
                </nav>
                <div className="workspace-tools">
                  <button
                    aria-pressed={guided}
                    onClick={() => guidance(!guided)}
                  >
                    {guided ? "Hide guidance" : "How to play"}
                  </button>
                  <span className="step-badge">
                    STEP {v.tick}
                    <small>No live countdown</small>
                  </span>
                </div>
                {guided ? (
                  <section
                    className="panel"
                    aria-label={`${p.missionId} Morgan guidance`}
                  >
                    <p className="eyebrow">MORGAN · OPTIONAL HELP</p>
                    <label>
                      Help topic
                      <select
                        value={hint}
                        onChange={(e) => requestHelp(Number(e.target.value), 0)}
                      >
                        {[
                          "Start this investigation",
                          "Test another explanation",
                          "Connect evidence",
                          "Understand collection limits",
                          "Prepare handoff",
                        ].map((topic, i) => (
                          <option key={topic} value={i}>
                            {topic}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>
                      {cueMaps[audioMission].get(`morgan-${hint + 1}`)?.text}
                    </p>
                    <div className="actions">
                      <button onClick={() => requestHelp(hint, 0)}>
                        Give me a nudge · free
                      </button>
                      <button onClick={() => requestHelp(hint, 1)}>
                        Suggest a source · free
                      </button>
                      <button
                        onClick={() => {
                          requestHelp(hint, 2);
                          navigate("Explore");
                          requestAnimationFrame(() =>
                            document
                              .getElementById(`${slot}-questions`)
                              ?.focus(),
                          );
                        }}
                      >
                        Show me the questions · free
                      </button>
                      <button
                        disabled={audio.phase !== "ready" || !audio.enabled}
                        onClick={() => audio.play(`morgan-${hint + 1}`)}
                      >
                        Play this guidance
                      </button>
                    </div>
                    {helpLevel > 0 ? (
                      <p>
                        Use the scope catalogue for task and consequence, the
                        work register or verified contact for business
                        authority, and a scoped activity source or independent
                        transaction for what was recorded. A new acquisition
                        costs one step; reading and source comparison are free.
                      </p>
                    ) : null}
                    {helpLevel === 2 ? (
                      <p>
                        The source list is focused. No query, scope or finding
                        has been selected for you.
                      </p>
                    ) : null}
                    <button onClick={() => void exportAssistance()}>
                      Export this session’s assistance log
                    </button>
                    <p className="muted">
                      Assistance is ungraded and separate from game saves; the
                      latest 100 requests and total are session-only.
                    </p>
                  </section>
                ) : null}
                <details className="panel field-guide">
                  <summary>Field guide · scope, sources and authority</summary>
                  <p>{p.lesson}</p>
                  <p>{p.reviewWindow}</p>
                  <p>
                    Claim confidence is ordinal: medium/high may fit a tightly
                    explained scoped action; medium fits a supported
                    activity-outside-approval finding; low fits
                    visibility/preliminary findings. These cases do not
                    establish a human operator or malicious motive.
                  </p>
                  {p.glossary.map((g) => (
                    <p key={g.term}>
                      <strong>{g.term}:</strong> {g.definition}
                    </p>
                  ))}
                  <p>
                    {p.response.control}. Owner: {p.response.owner}. Response
                    delay: {v.policy.responseDelayTicks} steps. Dynamic source
                    availability delay in this profile:{" "}
                    {v.policy.collectionDelayTicks} steps.{" "}
                    {p.response.dependency}
                  </p>
                  <p>
                    Source availability is distinct from event time. An empty
                    covered snapshot, unavailable historical collection and a
                    pending check support different conclusions.
                  </p>
                </details>
                <ComparisonPanel />
                {v.responseWindowOpenedAt !== null ? (
                  <p className="notice">
                    An out-of-scope operation was delivered at step{" "}
                    {v.responseWindowOpenedAt}. Disclosed policy asks for a
                    scoped handoff within {p.response.windowTicks} more
                    investigation steps (by step{" "}
                    {v.responseWindowOpenedAt + p.response.windowTicks}). This
                    indicator comes from delivered evidence.
                  </p>
                ) : null}
                {review ? (
                  <section className="panel" aria-label="Finding confirmation">
                    <h2>Review your finding</h2>
                    <p>
                      {dispositionLabels[v.finding.disposition]} · confidence{" "}
                      {v.finding.confidence} · scope {v.finding.targetId}.
                    </p>
                    <p>
                      {v.finding.evidence.length} cited observations,{" "}
                      {v.finding.alternativeEvidence.length} alternative checks
                      and {v.finding.limitations.length} recorded limitations.{" "}
                      {v.pendingChecks.length} check(s) remain pending.
                    </p>
                    <p>
                      Next action: {v.finding.handoff.replaceAll("_", " ")}.
                      Owner: {v.finding.owner}. Follow-up:{" "}
                      {v.finding.followup.replaceAll("_", " ")}.
                    </p>
                    {!v.finding.evidence.length ||
                    v.finding.targetId === "unselected" ||
                    !v.finding.scopeAcknowledged ? (
                      <p className="notice">
                        Some report fields are incomplete. You may intentionally
                        close a weak finding and learn from its debrief; this is
                        not a hidden-answer check.
                      </p>
                    ) : null}
                    <button
                      disabled={game.blocked}
                      onClick={() =>
                        void game.send({
                          kind: "CLOSE_CASE",
                          finding: { ...v.finding, notes },
                        })
                      }
                    >
                      Confirm and close case
                    </button>
                    <button onClick={() => setReview(false)}>
                      Return to investigation
                    </button>
                  </section>
                ) : null}
                <m.div
                  key={screen}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 0.16 }}
                >
                  {screen === "Leads" ? (
                    <>
                      <section className="panel">
                        <h2>Your current observations</h2>
                        <p>{v.records[0].text}</p>
                        <button
                          disabled={game.blocked}
                          onClick={() => {
                            navigate("Explore");
                          }}
                        >
                          Choose a source question
                        </button>
                      </section>
                      <Mechanic
                        view={v}
                        definition={p}
                        update={update}
                        busy={game.blocked}
                        scope={(targetId) =>
                          void game.send({ kind: "SCOPE", targetId })
                        }
                      />
                    </>
                  ) : null}
                  {screen === "Explore" ? (
                    <>
                      <section className="panel">
                        <h2>Choose the scope you have established</h2>
                        <label>
                          Current investigation scope
                          <select
                            disabled={game.blocked}
                            value={v.scope}
                            onChange={(e) =>
                              void game.send({
                                kind: "SCOPE",
                                targetId: e.target.value,
                              })
                            }
                          >
                            {known.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.id} · {e.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p>
                          Only scopes named by acquired records are selectable.
                          The task catalogue can reveal the relevant
                          relationship before you narrow the investigation.
                        </p>
                        <div className="scope-cards">
                          {known
                            .filter((e) => e.id === v.scope)
                            .map((e) => (
                              <article className="scope-card" key={e.id}>
                                <h3>{e.name}</h3>
                                <p>{e.purpose}</p>
                                <p>
                                  Owner: {e.owner}. {e.impact}
                                </p>
                                <p>{e.capability}</p>
                              </article>
                            ))}
                        </div>
                      </section>
                      <section
                        className="panel"
                        id={`${slot}-questions`}
                        tabIndex={-1}
                      >
                        <h2>
                          Which question would change your interpretation?
                        </h2>
                        <div className="question-list">
                          {p.queries
                            .filter(
                              (q) =>
                                q.targets.includes("all") ||
                                q.targets.includes(v.scope),
                            )
                            .map((q) => {
                              const acquired =
                                q.static &&
                                v.records.some(
                                  (r) => r.sourceId === q.sourceId,
                                );
                              return (
                                <article className="question" key={q.id}>
                                  <p className="eyebrow">
                                    {q.source} ·{" "}
                                    {q.targets.includes("all")
                                      ? "Current review"
                                      : v.scope}
                                  </p>
                                  <h3>{q.label}</h3>
                                  <p>{q.question}</p>
                                  <p>
                                    <strong>Can establish:</strong> {q.can}
                                  </p>
                                  <p>
                                    <strong>Cannot establish:</strong>{" "}
                                    {q.cannot}
                                  </p>
                                  <p>
                                    Request cutoff: step {v.tick}.{" "}
                                    {q.static
                                      ? "Static content: reopening an acquired revision is free."
                                      : "Refreshing to a later cutoff costs one step, even if no new matching event exists."}
                                  </p>
                                  <button
                                    disabled={
                                      game.blocked ||
                                      (q.id === "window" && !v.sensor)
                                    }
                                    onClick={() => {
                                      if (acquired) {
                                        setSource(q.sourceId);
                                        requestAnimationFrame(() =>
                                          document
                                            .getElementById(
                                              `${slot}-observations`,
                                            )
                                            ?.focus(),
                                        );
                                      } else
                                        void game.send({
                                          kind: "ACQUIRE",
                                          queryId: q.id,
                                          cutoffTick: v.tick,
                                        });
                                    }}
                                  >
                                    {acquired
                                      ? "Read acquired result · free"
                                      : `${q.label} · 1 step`}
                                  </button>
                                  {q.id === "window" && !v.sensor ? (
                                    <p>
                                      Enable the permitted future window before
                                      querying it; no historical source is
                                      fabricated.
                                    </p>
                                  ) : null}
                                </article>
                              );
                            })}
                        </div>
                      </section>
                      {v.entityIds.includes(p.primaryTarget) ? (
                        <section className="panel">
                          <h2>Verify the business context</h2>
                          <p>
                            Directory-check target: {p.primaryTarget}. This
                            contact request does not change your selected query
                            scope.
                          </p>
                          <p>
                            A pre-established directory contact can confirm the
                            specific task record. A response or timeout is due
                            at request-start +3; requesting costs one step. It
                            does not identify the person operating a session.
                          </p>
                          <button
                            disabled={game.blocked}
                            onClick={() => {
                              if (v.pendingChecks.length) navigate("Timeline");
                              else if (
                                v.records.some((r) => r.ref.recordId === "VR01")
                              ) {
                                setSource("directory_callback");
                                document
                                  .getElementById(`${slot}-observations`)
                                  ?.focus();
                              } else
                                void game.send({
                                  kind: "REQUEST_CHECK",
                                  targetId: p.primaryTarget,
                                });
                            }}
                          >
                            {v.pendingChecks.length
                              ? "Review pending business check · free"
                              : v.records.some((r) => r.ref.recordId === "VR01")
                                ? "Read verified business response · free"
                                : "Request verified business check · 1 step"}
                          </button>
                          {v.pendingChecks.map((c) => (
                            <p key={c.id}>
                              Requested at step {c.requestedTick}; due{" "}
                              {c.dueTick} for {c.targetId}. An identical pending
                              request is free and does not reset its due step.
                            </p>
                          ))}
                        </section>
                      ) : null}
                      {p.sensorEnabled &&
                      v.entityIds.includes(p.primaryTarget) ? (
                        <section className="panel">
                          <h2>Enable a bounded future-only collection test</h2>
                          <p>
                            Test target: {p.primaryTarget}; capability:
                            controlled source-health event collection.
                          </p>
                          <p>
                            Activation costs two steps. The source starts at
                            completion; a harmless event is generated on the
                            next advanced step. It never collects an earlier
                            operation. Read the future-window question
                            afterwards to acquire the result.
                          </p>
                          <label>
                            Future observation duration
                            <select
                              value={windowDuration}
                              onChange={(e) =>
                                setWindowDuration(Number(e.target.value))
                              }
                            >
                              {[2, 3, 4].map((n) => (
                                <option key={n} value={n}>
                                  {n} steps
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            disabled={
                              game.blocked ||
                              Boolean(v.sensor && v.sensor.endsAt >= v.tick)
                            }
                            onClick={() =>
                              void game.send({
                                kind: "ENABLE_SENSOR",
                                targetId: p.primaryTarget,
                                durationTicks: windowDuration,
                              })
                            }
                          >
                            Enable future-only collection · 2 steps
                          </button>
                          {v.sensor ? (
                            <p>
                              Source window: {v.sensor.startsAt} through{" "}
                              {v.sensor.endsAt}; target {v.sensor.targetId}.
                            </p>
                          ) : null}
                        </section>
                      ) : null}
                      <section
                        className="panel"
                        id={`${slot}-observations`}
                        tabIndex={-1}
                      >
                        <h2>Acquired observations</h2>
                        <label>
                          Show acquired source
                          <select
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                          >
                            <option value="all">All acquired sources</option>
                            {[...new Set(v.records.map((r) => r.sourceId))].map(
                              (id) => (
                                <option key={id} value={id}>
                                  {id.replaceAll("_", " ")}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <Records
                          records={visibleRecords}
                          page={recordPages.Explore}
                          onPageChange={(page) =>
                            setRecordPages((previous) => ({
                              ...previous,
                              Explore: page,
                            }))
                          }
                          definition={p}
                          finding={v.finding}
                          update={update}
                          busy={game.blocked}
                        />
                      </section>
                    </>
                  ) : null}
                  {screen === "Case File" && f ? (
                    <section className="panel">
                      <h2>Your Case File</h2>
                      <p>
                        Working explanation → supporting and opposing facts →
                        unknowns → next step. Each edit is free; no selected
                        explanation is marked correct before submission.
                      </p>
                      <nav
                        className="campaign-nav"
                        aria-label={`${p.missionId} Case File steps`}
                      >
                        {[
                          "Explanation",
                          "Evidence",
                          "Unknowns",
                          "Next step",
                        ].map((name, index) => (
                          <button
                            key={name}
                            aria-current={
                              reportStep === index ? "step" : undefined
                            }
                            onClick={() => setReportStep(index)}
                          >
                            {name}
                          </button>
                        ))}
                      </nav>
                      {reportStep === 0 ? (
                        <>
                          <fieldset disabled={game.blocked}>
                            <legend>Working explanation</legend>
                            <label>
                              Finding
                              <select
                                value={f.disposition}
                                onChange={(e) =>
                                  update((f) => ({
                                    ...f,
                                    disposition: e.target
                                      .value as Finding["disposition"],
                                  }))
                                }
                              >
                                {Object.entries(dispositionLabels).map(
                                  ([id, label]) => (
                                    <option key={id} value={id}>
                                      {label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>
                            <label>
                              Claim confidence
                              <select
                                value={f.confidence}
                                onChange={(e) =>
                                  update((f) => ({
                                    ...f,
                                    confidence: e.target
                                      .value as Finding["confidence"],
                                  }))
                                }
                              >
                                {["low", "medium", "high"].map((id) => (
                                  <option key={id} value={id}>
                                    {id}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Finding scope
                              <select
                                value={f.targetId}
                                onChange={(e) =>
                                  update((f) => ({
                                    ...f,
                                    targetId: e.target.value,
                                  }))
                                }
                              >
                                <option value="unselected">
                                  Choose an acquired scope…
                                </option>
                                {known.map((e) => (
                                  <option key={e.id} value={e.id}>
                                    {e.id} · {e.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </fieldset>
                          <Mechanic
                            view={v}
                            definition={p}
                            update={update}
                            busy={game.blocked}
                            scope={(targetId) =>
                              void game.send({ kind: "SCOPE", targetId })
                            }
                          />
                        </>
                      ) : null}
                      {reportStep === 1 ? (
                        <>
                          <h3>Supporting and opposing facts</h3>
                          <Records
                            records={v.records}
                            page={recordPages["Case File"]}
                            onPageChange={(page) =>
                              setRecordPages((previous) => ({
                                ...previous,
                                "Case File": page,
                              }))
                            }
                            definition={p}
                            finding={f}
                            update={update}
                            busy={game.blocked}
                          />
                        </>
                      ) : null}
                      {reportStep === 2 ? (
                        <>
                          <fieldset disabled={game.blocked}>
                            <legend>What remains unknown</legend>
                            <label>
                              Competing explanation status
                              <select
                                value={f.alternative}
                                onChange={(e) =>
                                  update((f) => ({
                                    ...f,
                                    alternative: e.target
                                      .value as Finding["alternative"],
                                  }))
                                }
                              >
                                <option value="untested">
                                  I have not tested another explanation
                                </option>
                                <option value="business_context_tested">
                                  I tested the specific business explanation
                                </option>
                                <option value="attribution_unresolved">
                                  Business context was tested; person or motive
                                  remains unresolved
                                </option>
                                <option value="coverage_tested">
                                  I tested the available collection boundary
                                </option>
                              </select>
                            </label>
                            {p.limits.map((limit) => (
                              <label key={limit.id}>
                                <input
                                  type="checkbox"
                                  checked={f.limitations.includes(limit.id)}
                                  onChange={(e) =>
                                    update((f) => ({
                                      ...f,
                                      limitations: e.target.checked
                                        ? [...f.limitations, limit.id]
                                        : f.limitations.filter(
                                            (id) => id !== limit.id,
                                          ),
                                    }))
                                  }
                                />
                                {limit.label}
                              </label>
                            ))}
                          </fieldset>
                        </>
                      ) : null}
                      {reportStep === 3 ? (
                        <>
                          <fieldset disabled={game.blocked}>
                            <legend>Next step</legend>
                            <label>
                              Next action
                              <select
                                value={f.handoff}
                                onChange={(e) =>
                                  update((f) => ({
                                    ...f,
                                    handoff: e.target
                                      .value as Finding["handoff"],
                                  }))
                                }
                              >
                                <option value="close_explained">
                                  Close this scoped explained lead
                                </option>
                                <option value="restrict_access">
                                  Recommend the permitted session restriction
                                </option>
                                <option value="review_monitor">
                                  Hand over remaining uncertainty for review
                                </option>
                                <option value="repair_collection">
                                  Assign collection restoration and repeat
                                  verification
                                </option>
                              </select>
                            </label>
                            <label>
                              Responsible owner
                              <select
                                value={f.owner}
                                onChange={(e) =>
                                  update((f) => ({
                                    ...f,
                                    owner: e.target.value,
                                  }))
                                }
                              >
                                <option value="none">
                                  None · explained closure
                                </option>
                                <option value={p.response.owner}>
                                  {p.response.owner}
                                </option>
                              </select>
                            </label>
                            <label>
                              Review within steps
                              <select
                                value={f.reviewWithinTicks}
                                onChange={(e) =>
                                  update((f) => ({
                                    ...f,
                                    reviewWithinTicks: Number(e.target.value),
                                  }))
                                }
                              >
                                {[1, 2, 3, 4].map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Follow-up trigger
                              <select
                                value={f.followup}
                                onChange={(e) =>
                                  update((f) => ({
                                    ...f,
                                    followup: e.target
                                      .value as Finding["followup"],
                                  }))
                                }
                              >
                                <option value="unselected">
                                  Choose a concrete follow-up…
                                </option>
                                <option value="confirm_scope_and_control">
                                  Confirm restriction and assess the named scope
                                </option>
                                <option value="verify_business_context">
                                  Verify the outstanding business context
                                </option>
                                <option value="restore_and_retest">
                                  Restore collection and repeat the defined test
                                </option>
                                <option value="review_new_evidence">
                                  Review a new scoped observation or verified
                                  response
                                </option>
                                <option value="routine_monitoring">
                                  Routine monitoring for an explained lead
                                </option>
                              </select>
                            </label>
                            <label>
                              <input
                                type="checkbox"
                                checked={f.scopeAcknowledged}
                                onChange={(e) =>
                                  update((f) => ({
                                    ...f,
                                    scopeAcknowledged: e.target.checked,
                                  }))
                                }
                              />
                              My finding covers the named scope and source
                              interval; an authorised responder owns any
                              control.
                            </label>
                          </fieldset>
                          {p.mechanic.kind === "capstone" ? (
                            <fieldset disabled={game.blocked}>
                              <legend>
                                Keep the independent coverage task in the
                                handoff
                              </legend>
                              <p>
                                A settlement finding does not resolve the
                                separately disclosed customer-service collection
                                gap. Record a restoration owner and test trigger
                                for that scope.
                              </p>
                              <button
                                onClick={() =>
                                  update((f) => ({
                                    ...f,
                                    followups: [
                                      ...f.followups.filter(
                                        (x) => x.targetId !== "COVERAGE-12",
                                      ),
                                      {
                                        targetId: "COVERAGE-12",
                                        owner: "Detection Engineering",
                                        trigger: "restore_and_retest",
                                        reviewWithinTicks: 4,
                                      },
                                    ],
                                  }))
                                }
                              >
                                Assign separate coverage restoration · free
                              </button>
                              {f.followups.map((x) => (
                                <p key={x.targetId}>
                                  {x.targetId} · {x.owner} ·{" "}
                                  {x.trigger.replaceAll("_", " ")} · review
                                  within {x.reviewWithinTicks} steps.
                                </p>
                              ))}
                            </fieldset>
                          ) : null}
                          <label>
                            Optional case notes
                            <textarea
                              maxLength={4000}
                              value={notes}
                              disabled={game.readOnly && !game.temporary}
                              onChange={(e) => {
                                setNotes(e.target.value);
                                setNotesDirty(true);
                              }}
                            />
                          </label>
                          <button
                            disabled={game.blocked || notes === f.notes}
                            onClick={() => {
                              update((f) => ({ ...f, notes }));
                              setNotesDirty(false);
                            }}
                          >
                            Save optional notes · free
                          </button>
                          <p>
                            {notesDirty || notes !== f.notes
                              ? "Notes pending explicit save; review also saves the complete draft."
                              : "Notes match the accepted Case File."}
                          </p>
                        </>
                      ) : null}
                      <button
                        className="primary"
                        onClick={() => void reviewFinding()}
                      >
                        Review finding
                      </button>
                    </section>
                  ) : null}
                  {screen === "Timeline" ? (
                    <>
                      <section className="panel">
                        <h2>Known investigation history</h2>
                        <HistoryTimeline items={v.history} />
                        <h3>Pending checks</h3>
                        {v.pendingChecks.length ? (
                          v.pendingChecks.map((c) => (
                            <p key={c.id}>
                              {c.targetId} · requested {c.requestedTick} · due{" "}
                              {c.dueTick}
                            </p>
                          ))
                        ) : (
                          <p>No verified check is pending.</p>
                        )}
                        <h3>Response requests</h3>
                        {v.responses.map((r) => (
                          <p key={r.id}>
                            {r.targetId} · {r.status} · requested{" "}
                            {r.requestedTick} · due {r.dueTick}. {r.text}
                          </p>
                        ))}
                      </section>
                      <section className="panel">
                        <h2>Advance only when you choose</h2>
                        <p>
                          Reading, audio and backgrounding do not advance the
                          world. Check pending due steps before committing.
                        </p>
                        <label>
                          Steps to advance
                          <select
                            value={duration}
                            onChange={(e) =>
                              setDuration(Number(e.target.value))
                            }
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
                            void game.send({
                              kind: "ADVANCE",
                              durationTicks: duration,
                            })
                          }
                        >
                          Advance selected steps
                        </button>
                      </section>
                    </>
                  ) : null}
                </m.div>
                {v.entityIds.includes(p.primaryTarget) &&
                !v.responses.length ? (
                  <section className="panel">
                    <h2>Request response while continuing</h2>
                    <p>
                      {p.response.control}. The authorised team validates cited
                      evidence; submitting a request costs one step. A valid
                      request completes after {v.policy.responseDelayTicks}{" "}
                      steps. {p.response.dependency}
                    </p>
                    <button
                      disabled={game.blocked}
                      onClick={() => setConfirmResponse(true)}
                    >
                      Review a scoped response request
                    </button>
                    {confirmResponse ? (
                      <>
                        <p>
                          Target: {p.primaryTarget}. Only your currently cited
                          observations are submitted. This does not approve
                          account disablement, endpoint isolation or a service
                          shutdown.
                        </p>
                        <button
                          disabled={game.blocked}
                          onClick={() => {
                            void game.send({
                              kind: "REQUEST_RESPONSE",
                              targetId: p.primaryTarget,
                              evidence: v.finding.evidence,
                            });
                            setConfirmResponse(false);
                          }}
                        >
                          Confirm session-only response request · 1 step
                        </button>
                        <button onClick={() => setConfirmResponse(false)}>
                          Cancel response request
                        </button>
                      </>
                    ) : null}
                  </section>
                ) : null}
              </>
            )}
          </main>
        </div>
      </LazyMotion>
    </ComparisonProvider>
  );
}
