import { useState } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useGame } from "./controller";
import { useNavigation, type Screen } from "../stores/view";
import { InvestigationGuide } from "../ui/InvestigationGuide";
import { CaseEditor } from "../ui/CaseEditor";
import { Workbench } from "../ui/Workbench";
import { Debrief } from "../ui/Debrief";
import { briefing, hints } from "../presentation/voice/scripts";
function readGuidancePreference() {
  try {
    return localStorage.getItem("threat-hunter-guidance-v1") !== "independent";
  } catch {
    return true;
  }
}
const screens: Screen[] = ["Leads", "Explore", "Case File", "Timeline"];
export default function App() {
  const game = useGame(),
    { screen, setScreen } = useNavigation(),
    [hint, setHint] = useState(-1),
    [home, setHome] = useState(true),
    [replace, setReplace] = useState(false);
  const [guided, setGuided] = useState(readGuidancePreference);
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
  const reduced = useReducedMotion();
  const v = game.view;
  const blocked =
    game.busy || game.readOnly || Boolean(game.error && !game.temporary);
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      await game.restore("");
      return;
    }
    await game.restore(await file.text());
  };
  return (
    <LazyMotion features={domAnimation}>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <div className="app-shell">
        <header className="topbar">
          <button
            className="wordmark"
            onClick={() => setHome(true)}
            aria-label="Threat Hunter home"
          >
            <span className="logo-mark">⌖</span>
            <span>
              THREAT HUNTER<small>SILENT INTRUSION</small>
            </span>
          </button>
          <div className="header-meta">
            <span className="build-badge">INTERNAL BUILD · 0.1</span>
            {v ? (
              <span>
                STEP <strong>{v.tick.toString().padStart(2, "0")}</strong>
              </span>
            ) : (
              <span>NORTHSTAR SERVICES</span>
            )}
          </div>
        </header>
        <div className="save-strip">
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
                  disabled={game.busy || game.readOnly}
                  onChange={(e) => importFile(e.target.files?.[0])}
                />
              </label>
            )}
            <span>Text ready · voice pack pending production</span>
          </div>
        </div>
        {game.readOnly && !game.busy ? (
          <div className="notice">
            Read-only: another tab owns the active save. Close that tab and
            reload this one to take ownership.
          </div>
        ) : null}
        {game.error ? (
          <div className="error" role="alert">
            <p>{game.error}</p>
            <button onClick={game.enableTemporary}>
              Continue explicitly without saving
            </button>
            <p>
              Export progress before leaving. Temporary progress does not
              overwrite the last durable save.
            </p>
          </div>
        ) : null}
        <main id="main" tabIndex={-1}>
          {home || !v ? (
            <section className="home">
              <img className="hero-art" src="/art/northstar-night.svg" alt="" />
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
                  An unfamiliar session. A plausible explanation.
                  <br />
                  Find what the evidence actually supports.
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
                <div className="actions">
                  <button
                    className="primary"
                    disabled={game.busy || game.readOnly}
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
                <p className="hero-foot">
                  ONE CASE. YOUR JUDGEMENT. NO COUNTDOWN.
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
                    Internal development build. Required reviewed voice, device
                    testing and release gates are still pending. Local saves
                    stay in this browser; exports contain fictional scenario
                    data.
                  </p>
                </div>
              </div>
            </section>
          ) : game.debrief ? (
            <Debrief
              data={game.debrief}
              restart={async () => {
                await game.restart();
                setHome(true);
              }}
              busy={game.busy}
            />
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
                      onClick={() => setScreen(s)}
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
                  <button onClick={() => setHint((hint + 1) % hints.length)}>
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
                    <h1>
                      {screen === "Leads"
                        ? "Start with a question."
                        : screen === "Explore"
                          ? "Every source has limits."
                          : screen === "Case File"
                            ? "What does it mean?"
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
                          02<span>:</span>13<small>AN UNFAMILIAR CLIENT</small>
                        </div>
                        <div>
                          <p className="eyebrow">U-01 · SESSION S-01</p>
                          <h2>
                            Late doesn’t always
                            <br />
                            mean wrong.
                          </h2>
                          <p>
                            {v.records[0].observation} Finance sometimes carries
                            out approved work outside normal hours.
                          </p>
                          <p className="muted">
                            Your task: test the ordinary explanation, follow the
                            scope and make a bounded call.
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
                          Acquire records, ask for verified checks and prepare a
                          finding. The response team owns session revocation.
                        </p>
                      </article>
                      <article className="panel">
                        <p className="eyebrow">Your scope</p>
                        <h3>One session. A connected trail.</h3>
                        <p>
                          U-01 account → S-01 session → FIN-01 Finance Portal →
                          RPT-01 report service.
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
                    <ol className="timeline">
                      {v.history.map((item, i) => (
                        <li key={i}>
                          <strong>
                            {item.tick.toString().padStart(2, "0")}
                          </strong>
                          <p>{item.text}</p>
                        </li>
                      ))}
                    </ol>
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
  );
}
