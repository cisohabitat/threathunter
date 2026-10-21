import { useState } from "react";
import type { Debrief } from "../domain/contracts";
import type { useMissionAudio } from "../presentation/sound/useMissionAudio";
import { cues as defaultCues, debriefCue } from "../presentation/voice/pack";
export function AudioPanel({
  audio,
  debrief,
  cues = defaultCues,
  report,
}: {
  audio: ReturnType<typeof useMissionAudio>;
  debrief: Debrief | null;
  cues?: ReadonlyMap<string, { id: string; text: string; speaker: string }>;
  report?: { cue: string; objectiveOccurred: boolean };
}) {
  const [open, setOpen] = useState(false),
    [guidance, setGuidance] = useState("morgan-1");
  const closed = Boolean(debrief || report);
  const selectedGuidance =
    guidance === "morgan-6" && !closed ? "morgan-1" : guidance;
  const cue = audio.lastCue ? cues.get(audio.lastCue) : null;
  const muted = !audio.enabled || audio.prefs.masterMuted;
  return (
    <section className="audio-controls" aria-label="Voice and sound controls">
      <div className="audio-toolbar">
        <button aria-expanded={open} onClick={() => setOpen(!open)}>
          Voice & sound
        </button>
        <span className="audio-status" aria-live="polite">
          {audio.phase === "loading"
            ? "Loading voice pack…"
            : audio.phase === "ready"
              ? "Voice pack ready · " + (muted ? "muted" : "enabled")
              : audio.phase === "error"
                ? "Audio unavailable · text ready"
                : "Play muted · voice available"}
        </span>
        <button aria-pressed={muted} onClick={audio.mute}>
          Mute all
        </button>
      </div>
      {open ? (
        <div className="audio-settings">
          <p className="muted">
            Morgan uses pre-generated synthetic speech. Listening is optional
            and never moves the world. These candidate recordings still need
            human listening and device review.
          </p>
          <div className="actions">
            <button
              disabled={audio.phase === "loading"}
              onClick={() => {
                audio.update({ masterMuted: false });
                audio.enable();
              }}
            >
              Enable voice and sound
            </button>
            <button onClick={audio.playMuted}>Play muted</button>
          </div>
          <fieldset disabled={audio.phase !== "ready" || muted}>
            <legend>On-demand narration</legend>
            <div className="actions">
              <button onClick={() => audio.play("briefing")}>
                Play briefing
              </button>
              {closed ? (
                <>
                  <button
                    onClick={() =>
                      audio.play(report?.cue ?? debriefCue(debrief!))
                    }
                  >
                    Read my debrief
                  </button>
                  <button
                    onClick={() =>
                      audio.play(
                        (report?.objectiveOccurred ??
                          debrief!.objectiveAchieved)
                          ? "outcome-occurred"
                          : "outcome-not-occurred",
                      )
                    }
                  >
                    Read operational outcome
                  </button>
                </>
              ) : null}
              <button disabled={!audio.lastCue || muted} onClick={audio.replay}>
                Replay last line
              </button>
              <button disabled={!audio.playing} onClick={audio.skip}>
                Skip speech
              </button>
            </div>
          </fieldset>
          <label>
            Morgan guidance
            <select
              value={selectedGuidance}
              onChange={(e) => setGuidance(e.target.value)}
            >
              {Array.from(cues.values())
                .filter(
                  (c) =>
                    c.id.startsWith("morgan-") &&
                    (c.id !== "morgan-6" || closed),
                )
                .map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {
                      [
                        "Compare a baseline",
                        "Test another explanation",
                        "Attach evidence",
                        "Recognise collection limits",
                        "Scope a handoff",
                        "Reflect on the evidence",
                      ][i]
                    }
                  </option>
                ))}
            </select>
          </label>
          <p>{cues.get(selectedGuidance)?.text}</p>
          <button
            disabled={audio.phase !== "ready" || muted}
            onClick={() => audio.play(selectedGuidance)}
          >
            Play guidance
          </button>
          <div className="audio-levels">
            {(["master", "voice", "effects", "ambience"] as const).map(
              (channel) => (
                <div key={channel}>
                  <label>
                    {channel === "ambience"
                      ? "Ambience / music"
                      : channel[0].toUpperCase() + channel.slice(1)}{" "}
                    level
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audio.prefs[channel]}
                      onChange={(e) =>
                        audio.update({ [channel]: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="audio-check">
                    <input
                      type="checkbox"
                      checked={audio.prefs[`${channel}Muted`]}
                      onChange={(e) =>
                        audio.update({ [`${channel}Muted`]: e.target.checked })
                      }
                    />
                    Mute {channel}
                  </label>
                </div>
              ),
            )}
          </div>
          <label className="audio-check">
            <input
              type="checkbox"
              checked={audio.prefs.captions}
              onChange={(e) => audio.update({ captions: e.target.checked })}
            />
            Show voice captions
          </label>
          <label className="audio-check">
            <input
              type="checkbox"
              checked={audio.prefs.screenReaderFriendly}
              onChange={(e) =>
                audio.update({ screenReaderFriendly: e.target.checked })
              }
            />
            Screen-reader-friendly audio · on-demand speech only
          </label>
          <p className="muted">
            Voice: stock LJSpeech / Piper English (US), synthetic, with no voice
            cloning. LJSpeech dataset: public domain; voice repository declares
            MIT. Effects and ambience are original tones.
          </p>
        </div>
      ) : null}
      {audio.error ? <p className="audio-error">{audio.error}</p> : null}
      {cue && audio.enabled && audio.prefs.captions ? (
        <p className="voice-caption">
          <strong>{cue.speaker}:</strong> {cue.text}
        </p>
      ) : null}
      {cue ? (
        <details className="voice-transcript">
          <summary>Selected narration · text transcript</summary>
          <p>
            <strong>{cue.speaker}:</strong> {cue.text}
          </p>
        </details>
      ) : null}
    </section>
  );
}
