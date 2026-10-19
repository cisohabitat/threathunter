import { useCallback, useEffect, useRef, useState } from "react";
import type { Debrief, PlayerView } from "../../domain/contracts";
import { cues } from "../voice/pack";
import type { AudioPreferences, MissionMixer } from "./mixer";
const defaults: AudioPreferences = {
  master: 0.7,
  voice: 0.85,
  effects: 0.3,
  ambience: 0.15,
  masterMuted: false,
  voiceMuted: false,
  effectsMuted: false,
  ambienceMuted: false,
  captions: true,
  screenReaderFriendly: false,
};
function preferences() {
  try {
    const stored = JSON.parse(
      localStorage.getItem("threat-hunter-audio-v1") ?? "{}",
    );
    const result = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof AudioPreferences)[]) {
      if (
        typeof defaults[key] === "number" &&
        typeof stored[key] === "number" &&
        stored[key] >= 0 &&
        stored[key] <= 1
      )
        Object.assign(result, { [key]: stored[key] });
      if (
        typeof defaults[key] === "boolean" &&
        typeof stored[key] === "boolean"
      )
        Object.assign(result, { [key]: stored[key] });
    }
    return result;
  } catch {
    return { ...defaults };
  }
}
export function useMissionAudio(
  view: PlayerView | null,
  debrief: Debrief | null,
  scene: string,
) {
  const [prefs, setPrefs] = useState(preferences),
    [enabled, setEnabled] = useState(false),
    [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">(
      "idle",
    ),
    [error, setError] = useState(""),
    [lastCue, setLastCue] = useState<string | null>(null),
    [playing, setPlaying] = useState(false);
  const mixer = useRef<MissionMixer | null>(null),
    loading = useRef(false),
    alive = useRef(true),
    prefsRef = useRef(prefs),
    enabledRef = useRef(enabled),
    previous = useRef<{
      runId: string;
      records: number;
      checks: number;
      closed: boolean;
    } | null>(null);
  // This boundary has no command adapter and cannot change gameplay.
  useEffect(() => {
    prefsRef.current = prefs;
    enabledRef.current = enabled;
    mixer.current?.configure(prefs, enabled);
  }, [prefs, enabled]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      mixer.current?.dispose();
    };
  }, []);
  useEffect(() => {
    mixer.current?.stopVoice();
    setLastCue(null);
  }, [scene]);
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) mixer.current?.stopAll();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);
  const play = useCallback((id: string) => {
    if (!cues.get(id)?.text) return;
    setLastCue(id);
    setError("");
    mixer.current?.voice(id);
  }, []);
  useEffect(() => {
    if (!view) {
      previous.current = null;
      return;
    }
    const next = {
      runId: view.runId,
      records: view.records.length,
      checks: view.records.filter((r) => r.ref.recordId === "EV-06").length,
      closed: Boolean(debrief),
    };
    const before = previous.current;
    previous.current = next;
    if (!before || before.runId !== next.runId || !enabled || phase !== "ready")
      return;
    if (!before.closed && next.closed) {
      mixer.current?.effect("effect-submit");
      if (!prefs.screenReaderFriendly) play("report-submitted");
    } else if (next.checks > before.checks) {
      mixer.current?.effect("effect-check");
      if (!prefs.screenReaderFriendly) play("check-ready");
    } else if (next.records > before.records)
      mixer.current?.effect("effect-acquire");
  }, [view, debrief, enabled, phase, prefs.screenReaderFriendly, play]);
  async function enable() {
    setEnabled(true);
    if (mixer.current) {
      setPhase("ready");
      return;
    }
    if (loading.current) return;
    loading.current = true;
    setPhase("loading");
    setError("");
    try {
      const { MissionMixer } = await import("./mixer");
      const next = new MissionMixer(
        (message) => {
          if (alive.current) setError(message);
        },
        (value) => {
          if (alive.current) setPlaying(value);
        },
      );
      await next.load();
      if (!alive.current) {
        next.dispose();
        return;
      }
      mixer.current = next;
      next.configure(prefsRef.current, enabledRef.current);
      setPhase("ready");
    } catch (e) {
      if (alive.current) {
        setPhase("error");
        setError(String(e));
      }
    } finally {
      loading.current = false;
    }
  }
  function update(changes: Partial<AudioPreferences>) {
    const next = { ...prefs, ...changes };
    setPrefs(next);
    try {
      localStorage.setItem("threat-hunter-audio-v1", JSON.stringify(next));
    } catch {
      /* Optional preferences do not affect the save. */
    }
  }
  return {
    prefs,
    enabled,
    phase,
    error,
    lastCue,
    playing,
    enable,
    update,
    play,
    replay: () => {
      if (lastCue) play(lastCue);
    },
    skip: () => mixer.current?.stopVoice(),
    mute: () => update({ masterMuted: true }),
    playMuted: () => {
      setEnabled(false);
      mixer.current?.stopAll();
    },
    effect: (id: string) => mixer.current?.effect(id),
  };
}
