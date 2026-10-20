import { useState, useEffect } from "react";
import { FieldGuide } from "../ui/FieldGuide";
import { AudioPanel } from "../ui/AudioPanel";
import { useMissionAudio } from "../presentation/sound/useMissionAudio";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useGame } from "./controller";
import { useNavigation, type Screen } from "../stores/view";
import { InvestigationGuide } from "../ui/InvestigationGuide";
import { CaseEditor } from "../ui/CaseEditor";
import { Workbench } from "../ui/Workbench";
import { Debrief } from "../ui/Debrief";
import { HistoryTimeline } from "../ui/HistoryTimeline";
import { briefing, hints } from "../presentation/voice/scripts";
import { Learning } from "../journey/Learning";
import { Journey, ContinueJourney } from "../journey/Journey";
import type { CaseId } from "../journey/contracts";
import { ComparisonPanel, ComparisonProvider } from "../comparison/Comparison";
import { fromM01 } from "../comparison/model";
function readGuidancePreference() {
  try {
    return localStorage.getItem("threat-hunter-guidance-v1") !== "independent";
  } catch {
    return true;
  }
}
const screens: Screen[] = ["Leads", "Explore", "Case File", "Timeline"];
export default function App({
  openCampaign,
  openFreeHunt,
  homeRequest = 0,
  caseRequest = 0,
  active = true,
}: {
  openCampaign?: (mission: Exclude<CaseId, "M01">) => void;
  openFreeHunt?: () => void;
  homeRequest?: number;
  caseRequest?: number;
  active?: boolean;
}) {
  const game = useGame(),
    {
      screen,
      setScreen: changeScreen,
      timelinePages,
      rememberTimeline,
    } = useNavigation(),
    [hint, setHint] = useState(-1),
    [home, setHome] = useState(true),
    [replace, setReplace] = useState(false),
    [confirmRecovery, setConfirmRecovery] = useState(false),
    [artFailed, setArtFailed] = useState(false),
    [artReady, setArtReady] = useState(false),
    [artUnavailable, setArtUnavailable] = useState(false);
  const [guided, setGuided] = useState(readGuidancePreference);
  const [handledCaseRequest, setHandledCaseRequest] = useState(0);
  useEffect(() => {
    const view = game.view;
    if (!view) return;
    const warn = (event: BeforeUnloadEvent) => {
      const editor = useNavigation.getState().editor;
      if (
        view.revision !== game.durableRevision ||
        (editor?.runId === view.runId &&
          editor.notes !== view.draft.optionalNotes)
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [game.view, game.durableRevision]);
  useEffect(() => {
    if (caseRequest === handledCaseRequest || game.busy) return;
    setHandledCaseRequest(caseRequest);
    setHome(!game.view);
  }, [caseRequest, handledCaseRequest, game.busy, game.view]);
  const [handledHomeRequest, setHandledHomeRequest] = useState(homeRequest);
  if (handledHomeRequest !== homeRequest) {
    setHandledHomeRequest(homeRequest);
    setHome(true);
  }
  function chooseGuidance(value: boolean) {
    setGuided(value);
    try {
      localStorage.setItem(
        "threat-hunter-guidance-v1",
        value ? "guided" : "independent",
      );
    } catch {
      /* Guidance still works without preference storage. */
    }
  }
  function setScreen(next: Screen) {
    const navigation = useNavigation.getState();
    const firstReport =
      next === "Case File" &&
      navigation.scrollPositions[`${game.view?.runId}:${next}`] === undefined;
    if (!home && game.view)
      navigation.rememberScroll(`${game.view.runId}:${screen}`, window.scrollY);
    const top = home
      ? 0
      : (navigation.scrollPositions[`${game.view?.runId}:${next}`] ?? 0);
    changeScreen(next);
    requestAnimationFrame(() => {
      window.scrollTo({ left: 0, top, behavior: "instant" });
      if (firstReport) {
        const question =
          document.querySelector<HTMLElement>(".case-editor > h2");
        question?.scrollIntoView({ block: "start", behavior: "instant" });
        question?.focus({ preventScroll: true });
        return;
      }
      document
        .querySelector<HTMLElement>(".workspace-heading h1")
        ?.focus({ preventScroll: true });
    });
  }
  const reduced = useReducedMotion();
  const v = game.view;
  const audio = useMissionAudio(
    v,
    game.debrief,
    home ? "home" : game.debrief ? "debrief" : screen,
    undefined,
    active,
  );
  const blocked =
    game.busy || game.readOnly || Boolean(game.error && !game.temporary);
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      game.rejectOversizedImport();
      return;
    }
    await game.restore(await file.text());
  };
  async function openJourney(mission: CaseId) {
    if (mission === "M01") {
      if (!v) await game.start();
      setHome(false);
      setScreen("Leads");
    } else {
      audio.playMuted();
      openCampaign?.(mission);
    }
  }
  return (
    <ComparisonProvider
      key={v?.runId ?? "no-active-m01"}
      records={fromM01(game.debrief ? [] : (v?.records ?? []))}
    >
      <LazyMotion features={domAnimation}>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <div className={`app-shell m01-shell${guided ? " guided-play" : ""}`}>
          <header className="topbar">
            <button
              className="wordmark"
              onClick={() => setHome(true)}
              aria-label="Threat Hunter Silent Intrusion home"
            >
              <span className="logo-mark" aria-hidden="true">
                ⌖
              </span>
              <span>
                THREAT HUNTER <small>SILENT INTRUSION</small>
              </span>
            </button>
            <div className="header-meta">
              <span className="build-badge">INTERNAL BUILD · 0.1</span>
              {v ? (
                <span>
                  STEP <strong>{v.tick.toString().padStart(2, "0")}</strong> ·{" "}
                  {v.pendingChecks.length} pending
                </span>
              ) : (
                <span>NORTHSTAR SERVICES</span>
              )}
            </div>
          </header>
          <div
            className="save-strip"
            role="region"
            aria-label="Save and readiness"
          >
            <span role="status">{game.busy ? "Working…" : game.status}</span>
            <div>
              {v ? (
                <button onClick={game.export}>Export save</button>
              ) : (
                <label className="file-button">
                  Import save
                  <input
                    type="file"
                    accept="application/json"
                    disabled={
                      (!game.writerAvailable && !game.temporary) ||
                      game.busy ||
                      game.readOnly ||
                      Boolean(game.recovery && !game.temporary)
                    }
                    onChange={(e) => importFile(e.target.files?.[0])}
                  />
                </label>
              )}
              {game.recovery || game.archived ? (
                <button onClick={game.exportOriginal}>
                  Export recovery original
                </button>
              ) : null}
              <span className="art-readiness">
                {artReady
                  ? "Case ready · optional sound below"
                  : artUnavailable
                    ? "Text ready · artwork unavailable"
                    : "Text ready · preparing artwork"}
              </span>
            </div>
          </div>
          <AudioPanel audio={audio} debrief={game.debrief} />
          {game.readOnly && !game.busy ? (
            <div className="notice">
              Read-only: another tab owns the active save. Close that tab and
              this one will refresh the saved case when ownership becomes
              available.
            </div>
          ) : null}
          {game.error ? (
            <div className="error" role="alert">
              <p>{game.error}</p>
              {v ? (
                <div>
                  <p>
                    For a write conflict, export this progress before reloading
                    the saved case.
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={confirmRecovery}
                      onChange={(e) => setConfirmRecovery(e.target.checked)}
                    />{" "}
                    Discard unsaved progress in this tab.
                  </label>
                  <button
                    disabled={!confirmRecovery || game.busy}
                    onClick={() => window.location.reload()}
                  >
                    Reload saved case
                  </button>
                </div>
              ) : !game.recovery ? (
                <button
                  disabled={game.busy}
                  onClick={() => window.location.reload()}
                >
                  Check stored save again
                </button>
              ) : null}
              {game.canExportStored && !v ? (
                <div>
                  <button disabled={game.busy} onClick={game.exportStored}>
                    Export stored recovery data
                  </button>
                  <p>
                    This preserves the stored data without validation. It is a
                    recovery copy, not a normal import file.
                  </p>
                </div>
              ) : null}
              {game.canRetry && game.writerAvailable && !game.recovery ? (
                <button
                  disabled={game.busy || game.readOnly}
                  onClick={game.retrySave}
                >
                  Retry saving retained progress
                </button>
              ) : null}
              {game.recovery && !v ? (
                <div>
                  <p>
                    Export the original data before choosing. Recovery keeps a
                    copy on this device and never changes the case rules. The
                    original export is for inspection; use Export save after
                    recovery for a portable save.
                  </p>
                  {game.recovery.previousStep !== null ? (
                    <button
                      disabled={
                        game.busy || game.readOnly || !game.writerAvailable
                      }
                      onClick={() => game.recover("previous")}
                    >
                      Restore previous save · step {game.recovery.previousStep}
                    </button>
                  ) : (
                    <p>No valid previous save is available.</p>
                  )}
                  <label>
                    <input
                      type="checkbox"
                      checked={confirmRecovery}
                      onChange={(e) => setConfirmRecovery(e.target.checked)}
                    />{" "}
                    I understand restarting removes the active case; the
                    original is kept for export.
                  </label>
                  <button
                    disabled={
                      !confirmRecovery ||
                      game.busy ||
                      game.readOnly ||
                      !game.writerAvailable
                    }
                    onClick={() => game.recover("restart")}
                  >
                    Restart after preserving original
                  </button>
                </div>
              ) : null}
              <button
                disabled={game.busy || game.readOnly}
                onClick={game.enableTemporary}
              >
                Continue explicitly without saving
              </button>
              <p>
                Export progress before leaving. Temporary progress does not
                overwrite the last durable save.
              </p>
            </div>
          ) : null}
          {!game.writerAvailable ? (
            <div className="notice">
              Autosave is read-only in this browser. Temporary play and exports
              remain available; use a browser with Web Locks to save safely.
            </div>
          ) : null}
          {game.temporary ? (
            <div className="notice">
              Temporary progress is not saved.{" "}
              {game.durableRevision === null
                ? "No committed revision for this session."
                : `Last saved revision: ${game.durableRevision}.`}
              {game.view ? (
                <button onClick={game.export}>Export temporary progress</button>
              ) : null}
              {game.view && game.writerAvailable && !game.recovery ? (
                <button
                  disabled={game.busy || game.readOnly}
                  onClick={game.retrySave}
                >
                  Try saving this session
                </button>
              ) : null}
            </div>
          ) : null}
          {home && game.completed.length ? (
            <details className="panel completed-cases">
              <summary>
                Saved completed investigations · export for review
              </summary>
              <p>
                These are separate frozen cases. Export one, then import it with
                no active case to review its debrief.
              </p>
              {game.completed.map((completed, index) => (
                <button
                  key={completed.id}
                  onClick={() => game.exportCompleted(completed.id)}
                >
                  Export completed investigation {index + 1} · closed at step{" "}
                  {completed.closeTick}
                </button>
              ))}
            </details>
          ) : null}
          <main id="main" tabIndex={-1}>
            {home || !v ? (
              <section className="home">
                <picture>
                  {!artFailed ? (
                    <source
                      media="(max-width: 767px)"
                      srcSet="/art/northstar-investigation-portrait-v1.webp"
                    />
                  ) : null}
                  <img
                    className="hero-art"
                    src={
                      artFailed
                        ? "/art/northstar-night.svg"
                        : "/art/northstar-investigation-landscape-v1.webp"
                    }
                    width="1440"
                    height="810"
                    alt=""
                    fetchPriority="high"
                    onLoad={() => setArtReady(true)}
                    onError={() => {
                      if (artFailed) setArtUnavailable(true);
                      else setArtFailed(true);
                    }}
                  />
                </picture>
                <div className="hero-shade" />
                <m.div
                  className="hero-copy"
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="eyebrow">
                    <span className="live-dot" /> A CYBERSECURITY INVESTIGATION
                    GAME
                  </p>
                  <h1>
                    Something
                    <br />
                    doesn’t <em>fit.</em>
                  </h1>
                  <p className="hero-description">
                    A finance account was used at 02:13. Was it approved work,
                    unauthorised use, or still unexplained?
                  </p>
                  <p className="home-play-loop">
                    Read a record → Check an explanation → Make your call
                  </p>
                  <div className="actions start-actions">
                    <button
                      className="primary"
                      disabled={
                        game.busy ||
                        (!v && game.readOnly) ||
                        Boolean(!v && game.error && !game.temporary)
                      }
                      onClick={async () => {
                        if (!v) await game.start();
                        setHome(false);
                        setScreen("Leads");
                      }}
                    >
                      {v ? "Resume investigation" : "Begin investigation"}{" "}
                      <span>↗</span>
                    </button>
                    <a href="#case-brief" className="text-link">
                      Read the brief ↓
                    </a>
                  </div>
                  <p className="first-case-label">
                    START HERE · THE MIDNIGHT LOGIN · 10–15 MINUTES
                  </p>
                  <fieldset className="assistance-choice">
                    <legend>How would you like to play?</legend>
                    <div className="actions">
                      <button
                        aria-pressed={guided}
                        onClick={() => chooseGuidance(true)}
                      >
                        Guided investigation{" "}
                        <small>Recommended · Morgan explains each step</small>
                      </button>
                      <button
                        aria-pressed={!guided}
                        onClick={() => chooseGuidance(false)}
                      >
                        Independent investigation{" "}
                        <small>Explore at your own pace</small>
                      </button>
                    </div>
                  </fieldset>
                  <p className="hero-foot">
                    TWELVE CASES. YOUR JUDGEMENT. NO COUNTDOWN.
                  </p>
                </m.div>
                <div className="hero-coordinate">
                  NORTHSTAR SERVICES
                  <br />
                  FINANCE PORTAL · 02:13
                </div>
                <div id="case-brief" className="home-brief">
                  <div>
                    <p className="eyebrow">01 / THE MIDNIGHT LOGIN</p>
                    <h2>
                      A late login.
                      <br />
                      An open question.
                    </h2>
                  </div>
                  <div>
                    <p>{briefing}</p>
                    <p className="muted">
                      10–15 minutes · no specialist knowledge needed · synthetic
                      case data
                    </p>
                    <p className="muted">
                      Internal development build. Required reviewed voice,
                      device testing and release gates are still pending. Local
                      saves stay in this browser; exports contain fictional
                      scenario data.
                    </p>
                  </div>
                </div>
                {openCampaign ? (
                  <section
                    className="home-brief"
                    aria-label="More investigations"
                  >
                    <div>
                      <p className="eyebrow">PROACTIVE HUNTS</p>
                      <h2>Start with a question.</h2>
                    </div>
                    <div>
                      <p>
                        Review an account’s reach, or test whether your
                        collection can see the activity you care about. Each
                        case keeps its own local save.
                      </p>
                      {openFreeHunt ? (
                        <button
                          disabled={game.busy}
                          onClick={() => {
                            audio.playMuted();
                            openFreeHunt();
                          }}
                        >
                          Seeded free hunt · validated templates
                        </button>
                      ) : null}
                      <div className="actions">
                        <button
                          disabled={game.busy}
                          onClick={() => {
                            audio.playMuted();
                            openCampaign("M04");
                          }}
                        >
                          M04 · The Forgotten Server
                        </button>
                        <button
                          disabled={game.busy}
                          onClick={() => {
                            audio.playMuted();
                            openCampaign("M07");
                          }}
                        >
                          M07 · The Missing Logs
                        </button>
                      </div>
                      <p className="muted">
                        Internal candidates. Player, device and creative reviews
                        are deferred.
                      </p>
                    </div>
                  </section>
                ) : null}
                {openCampaign ? (
                  <>
                    <Journey
                      ready={!game.busy}
                      open={(mission) => void openJourney(mission)}
                    />
                    <Learning />
                  </>
                ) : null}
              </section>
            ) : game.debrief ? (
              <>
                <Debrief
                  data={game.debrief}
                  restart={async () => {
                    await game.replay();
                    setHome(true);
                  }}
                  busy={blocked}
                />
                {openCampaign ? (
                  <ContinueJourney
                    mission="M01"
                    open={(mission) => void openJourney(mission)}
                    saved={game.durableRevision === v.revision}
                  />
                ) : null}
              </>
            ) : (
              <div className="workspace">
                <aside className="sidebar">
                  <p className="eyebrow">CASE M01</p>
                  <h2>
                    The Midnight
                    <br />
                    Login
                  </h2>
                  <span className="case-status">● Investigation open</span>
                  <nav aria-label="Investigation">
                    {screens.map((s, i) => (
                      <button
                        key={s}
                        aria-current={screen === s ? "page" : undefined}
                        onClick={() => {
                          audio.effect("effect-select");
                          setScreen(s);
                        }}
                      >
                        <span>0{i + 1}</span>
                        {s}
                        <span className="nav-arrow">↗</span>
                      </button>
                    ))}
                  </nav>
                  <div className="sidebar-bottom">
                    <p>
                      Reading is free.
                      <br />
                      Only accepted actions move the world.
                    </p>
                    <button
                      onClick={() => {
                        const next = (hint + 1) % 5;
                        setHint(next);
                        audio.play(`morgan-${next + 1}`);
                      }}
                    >
                      Ask Morgan · free
                    </button>
                    <button
                      className="primary"
                      onClick={() => setScreen("Case File")}
                    >
                      Review finding →
                    </button>
                  </div>
                </aside>
                <div className="workspace-main">
                  <div className="workspace-heading">
                    <div>
                      <p className="eyebrow">NORTHSTAR / FINANCE / S-01</p>
                      <h1 tabIndex={-1}>
                        {screen === "Leads"
                          ? "The Midnight Login"
                          : screen === "Explore"
                            ? "Choose what to check"
                            : screen === "Case File"
                              ? "Make your call"
                              : "What happened, and when?"}
                      </h1>
                    </div>
                    <div className="workspace-tools">
                      <button
                        aria-pressed={guided}
                        onClick={() => chooseGuidance(!guided)}
                      >
                        {guided ? "Hide guidance" : "How to play"}
                      </button>
                      <span className="step-badge">
                        STEP {v.tick}
                        <small>No live countdown</small>
                      </span>
                    </div>
                  </div>
                  {guided ? (
                    <InvestigationGuide
                      view={v}
                      screen={screen}
                      busy={blocked}
                      send={game.send}
                      navigate={setScreen}
                    />
                  ) : null}
                  {v.responseWindowOpenedAt !== null ? (
                    <div className="notice">
                      Out-of-role activity was delivered at step{" "}
                      {v.responseWindowOpenedAt}. Policy asks for handoff within
                      two more investigation steps (by step{" "}
                      {v.responseWindowOpenedAt + 2}). This is not an attacker
                      countdown.
                    </div>
                  ) : null}
                  {hint >= 0 ? (
                    <aside className="mentor">
                      <span>M</span>
                      <div>
                        <small>MORGAN · MENTOR</small>
                        <p>{hints[hint]}</p>
                      </div>
                      <button
                        aria-label="Dismiss mentor guidance"
                        onClick={() => setHint(-1)}
                      >
                        ×
                      </button>
                    </aside>
                  ) : null}
                  {screen === "Leads" ? (
                    <>
                      <section className="lead-card">
                        <div className="lead-label">
                          LEAD 01 <span>NOT YET EXPLAINED</span>
                        </div>
                        <div className="lead-body">
                          <div className="time-art">
                            02<span>:</span>13
                            <small>AN UNFAMILIAR CLIENT</small>
                          </div>
                          <div>
                            <p className="eyebrow">U-01 · SESSION S-01</p>
                            <h2>
                              Late doesn’t always
                              <br />
                              mean wrong.
                            </h2>
                            <p>
                              {v.records[0].observation} Finance sometimes
                              carries out approved work outside normal hours.
                            </p>
                            <p className="muted">
                              Your task: test the ordinary explanation, follow
                              the scope and make a bounded call.
                            </p>
                            <button
                              className="primary"
                              onClick={() => setScreen("Explore")}
                            >
                              Explore this session →
                            </button>
                          </div>
                        </div>
                      </section>
                      <div className="context-grid">
                        <article className="panel">
                          <p className="eyebrow">Your authority</p>
                          <h3>Investigate. Recommend.</h3>
                          <p>
                            Acquire records, ask for verified checks and prepare
                            a finding. The response team owns session
                            revocation.
                          </p>
                        </article>
                        <article className="panel">
                          <p className="eyebrow">Your scope</p>
                          <h3>One session. A connected trail.</h3>
                          <p>
                            U-01 account → S-01 session → FIN-01 Finance Portal
                            → RPT-01 report service.
                          </p>
                        </article>
                      </div>
                      {!guided ? (
                        <Workbench view={v} busy={blocked} send={game.send} />
                      ) : null}
                    </>
                  ) : screen === "Explore" ? (
                    <>
                      <div className="relationship">
                        <span>
                          U-01<small>Finance account</small>
                        </span>
                        <b>→</b>
                        <span>
                          S-01<small>Observed session</small>
                        </span>
                        <b>→</b>
                        <span>
                          FIN-01<small>Finance Portal</small>
                        </span>
                        <b>→</b>
                        <span>
                          RPT-01<small>Report service</small>
                        </span>
                      </div>
                      <Workbench view={v} busy={blocked} send={game.send} />
                    </>
                  ) : screen === "Case File" ? (
                    <CaseEditor
                      key={v.runId}
                      readOnly={game.readOnly}
                      view={v}
                      busy={blocked}
                      send={game.send}
                    />
                  ) : (
                    <section className="panel">
                      <p className="eyebrow">Action-driven simulation</p>
                      <h2>The investigation timeline</h2>
                      <p>
                        Steps are investigation opportunities, not minutes.
                        Reading, orientation changes and closing the browser do
                        not advance the world.
                      </p>
                      <HistoryTimeline
                        items={v.history}
                        page={timelinePages[v.runId] ?? 0}
                        onPageChange={(page) => rememberTimeline(v.runId, page)}
                      />
                      <h3>Pending requests</h3>
                      {v.pendingChecks.length ? (
                        v.pendingChecks.map((p) => (
                          <p key={p.requestId}>
                            Verified directory callback · requested at{" "}
                            {p.requestedTick}, due at {p.dueTick}.
                          </p>
                        ))
                      ) : (
                        <p className="muted">No pending requests.</p>
                      )}
                      <label>
                        Advance the world
                        <select id="advance-steps" defaultValue="1">
                          <option value="1">1 step</option>
                          <option value="2">2 steps</option>
                          <option value="3">3 steps</option>
                          <option value="4">4 steps</option>
                        </select>
                      </label>
                      <button
                        disabled={blocked}
                        onClick={() => {
                          const input =
                            document.querySelector<HTMLSelectElement>(
                              "#advance-steps",
                            );
                          game.send({
                            kind: "ADVANCE",
                            durationTicks: Number(input?.value ?? 1),
                          });
                        }}
                      >
                        Advance selected steps
                      </button>
                    </section>
                  )}
                  <div className="investigation-reference">
                    <FieldGuide />
                    <ComparisonPanel />
                  </div>
                  <div className="case-footer">
                    <p>
                      Still undecided? An honest, scoped unresolved finding is a
                      valid option.
                    </p>
                    <button onClick={() => setScreen("Case File")}>
                      Open Case File →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
          {v && home ? (
            <div className="restart-area">
              {replace ? (
                <>
                  <p>
                    Export your save first. This removes the active local case.
                  </p>
                  <button
                    disabled={game.busy || game.readOnly}
                    onClick={async () => {
                      await game.restart();
                      setReplace(false);
                    }}
                  >
                    Remove active save
                  </button>
                  <button onClick={() => setReplace(false)}>Cancel</button>
                </>
              ) : (
                <button onClick={() => setReplace(true)}>
                  Start a separate case
                </button>
              )}
            </div>
          ) : null}
          <footer className="global-footer">
            <span>THREAT HUNTER / SILENT INTRUSION</span>
            <span>Fictional records. Real questions.</span>
            <span>GDD v4.3 · M01 ruleset 4.0.0</span>
          </footer>
        </div>
      </LazyMotion>
    </ComparisonProvider>
  );
}
