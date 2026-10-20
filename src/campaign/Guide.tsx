import { useState } from "react";
import type { View } from "./contracts";
import { cueMaps } from "./audio";
import { selectHint, vocabulary } from "./guidance";
import type { useMissionAudio } from "../presentation/sound/useMissionAudio";

type Level = 1 | 2 | 3;
type Request = { step: number; hintId: string; level: Level };
function readPreference(mission: string) {
  try {
    return (
      (localStorage.getItem(`threat-hunter-${mission}-guidance-v1`) ??
        localStorage.getItem("threat-hunter-guidance-v1")) !== "independent"
    );
  } catch {
    return true;
  }
}

export function CampaignGuide({
  view,
  audio,
  show,
}: {
  view: View;
  audio: ReturnType<typeof useMissionAudio>;
  show: (
    screen: "Investigate" | "Case File" | "Timeline",
    target: string,
  ) => void;
}) {
  const [guided, setGuided] = useState(() => readPreference(view.missionId));
  const [revealed, setRevealed] = useState<{ id: string; level: Level } | null>(
    null,
  );
  const [usage, setUsage] = useState<{ total: number; requests: Request[] }>({
    total: 0,
    requests: [],
  });
  const hint = selectHint(view);
  const level = revealed?.id === hint.id ? revealed.level : 0;
  const narration = cueMaps[view.missionId].get(hint.cue)!.text;
  function choose(value: boolean) {
    setGuided(value);
    try {
      localStorage.setItem(
        `threat-hunter-${view.missionId}-guidance-v1`,
        value ? "guided" : "independent",
      );
    } catch {
      /* Help remains usable when preferences cannot be stored. */
    }
  }
  function request(next: Level) {
    setRevealed({ id: hint.id, level: next });
    setUsage((previous) => ({
      total: previous.total + 1,
      requests: [
        ...previous.requests.slice(-99),
        { step: view.tick, hintId: hint.id, level: next },
      ],
    }));
    if (next === 3) show(hint.screen, hint.target);
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: "threat-hunter-assistance",
            version: 1,
            missionId: view.missionId,
            runId: view.runId,
            scope:
              "This mounted session only; latest 100 requests; no gameplay or score changes",
            totalRequests: usage.total,
            requests: usage.requests,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${view.missionId}-assistance.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      className="investigation-guide"
      aria-label={`${view.missionId} investigation help`}
    >
      <div className="guide-heading">
        <p className="eyebrow">INVESTIGATION HELP · OPTIONAL</p>
        <span>Help is free · no score penalty</span>
      </div>
      {view.phase !== "closed" ? (
        <>
          <fieldset className="assistance-choice">
            <legend>Choose your assistance</legend>
            <div className="actions">
              <button aria-pressed={guided} onClick={() => choose(true)}>
                Guided investigation
              </button>
              <button aria-pressed={!guided} onClick={() => choose(false)}>
                Independent investigation
              </button>
            </div>
          </fieldset>
          {guided ? (
            <>
              <h2>{hint.question}</h2>
              <p>
                Ask for a little help or a source to try. “Show me” focuses a
                control; you decide whether to use it. All other investigation
                routes stay available.
              </p>
              <div className="actions">
                <button onClick={() => request(1)}>Ask for a nudge</button>
                <button disabled={level < 1} onClick={() => request(2)}>
                  Suggest a source
                </button>
                <button disabled={level < 2} onClick={() => request(3)}>
                  Show me
                </button>
              </div>
              <div aria-live="polite" aria-atomic="true">
                {level >= 1 ? (
                  <>
                    <p className="guide-tip">
                      <strong>Morgan:</strong> {narration}
                    </p>
                    <button
                      disabled={
                        audio.phase !== "ready" ||
                        !audio.enabled ||
                        audio.prefs.masterMuted ||
                        audio.prefs.voiceMuted
                      }
                      onClick={() => audio.play(hint.cue)}
                    >
                      Listen to this nudge
                    </button>
                  </>
                ) : null}
                {level >= 2 ? <p>{hint.source}</p> : null}
                {level >= 3 ? (
                  <p>
                    {hint.action}. {hint.cost}. No action was taken for you.
                  </p>
                ) : null}
              </div>
              <p className="muted">
                Reading, asking for help and moving between screens never
                advance time. Review finding stays available without completing
                a checklist.
              </p>
            </>
          ) : (
            <p>
              Independent investigation keeps every source available. Switch
              back whenever you want help.
            </p>
          )}
        </>
      ) : (
        <h2>Your assistance record</h2>
      )}
      <details>
        <summary>Assistance used · {usage.total} requests this session</summary>
        <p>
          Recorded separately from the game save and assessment. This tab
          retains the latest 100 requests while this run is mounted; reload
          starts a fresh assistance record. Nothing is sent to a server.
        </p>
        <button onClick={download}>Export assistance record</button>
      </details>
    </section>
  );
}

export function CampaignFieldGuide({ view }: { view: View }) {
  const legacy = view.records.some((r) => r.relationship?.host === "LEGACY-01");
  return (
    <details className="panel field-guide">
      <summary>Field guide · words, scope and authority</summary>
      <p>
        Reading is free. These are fictional case rules; you do not need to
        memorise the terms.
      </p>
      <h2>Your scope and authority</h2>
      <p>
        {view.missionId === "M04"
          ? "Review svc-billing, its expected APP-01 batch origin and any relationships delivered by your account query. Registry absence is a reason to investigate, not permission to stop a system."
          : "Review CS-API and CS-PORTAL application collection separately. Each test concerns only its target, capability and event time; identity records cannot establish every application action."}
      </p>
      {view.missionId === "M04" && legacy ? (
        <p>
          LEGACY-01 was discovered by your query. Establish its ownership and
          billing dependency before recommending a scoped response; direct
          isolation is unavailable.
        </p>
      ) : null}
      <p>
        {view.missionId === "M04"
          ? "Billing Operations owns dependency checks. The response team decides whether cited evidence supports a session restriction. You cannot approve or execute it yourself."
          : "Detection Engineering owns collection repair and repeat verification. The temporary window is a future test, not a permanent repair or a reconstruction of the missing interval."}
      </p>
      <h2>Words in context</h2>
      <dl>
        {vocabulary[view.missionId].map(([term, text]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
