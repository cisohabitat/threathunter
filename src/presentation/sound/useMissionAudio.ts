import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cues, type voicePack } from "../voice/pack";
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
let inSessionPreferences: AudioPreferences | undefined;
export function useMissionAudio(
  view: {
    runId: string;
    phase: "investigating" | "closed";
    records: { ref: { recordId: string } }[];
  } | null,
  debrief: object | null,
  scene: string,
  pack?: { cues: typeof voicePack.cues },
  active = true,
) {
  const selectedCues = useMemo(
    () => (pack ? new Map(pack.cues.map((c) => [c.id, c])) : cues),
    [pack],
  );
  const [prefs, setPrefs] = useState(() => ({
      ...(inSessionPreferences ?? preferences()),
    })),
    [enabled, setEnabled] = useState(false),
    [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">(
      "idle",
    ),
    [error, setError] = useState(""),
    [lastCue, setLastCue] = useState<string | null>(null),
    [playing, setPlaying] = useState(false);
  const generation = useRef(0),
    preparing = useRef<MissionMixer | null>(null),
    packRef = useRef(pack);
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
  useEffect(() => {
    if (packRef.current === pack) return;
    packRef.current = pack;
    generation.current++;
    preparing.current?.dispose();
    preparing.current = null;
    mixer.current?.dispose();
    mixer.current = null;
    loading.current = false;
    enabledRef.current = false;
    setEnabled(false);
    setPhase("idle");
    setLastCue(null);
    setPlaying(false);
    setError("");
  }, [pack]);
  useEffect(() => {
    const sync = (event: Event) => {
      if (event.type === "storage") {
        if ((event as StorageEvent).key !== "threat-hunter-audio-v1") return;
        inSessionPreferences = preferences();
      }
      if (inSessionPreferences) setPrefs({ ...inSessionPreferences });
    };
    window.addEventListener("threat-hunter-audio-prefs", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("threat-hunter-audio-prefs", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const invalidateLoads = useCallback(() => {
    generation.current++;
  }, []);
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
      invalidateLoads();
      preparing.current?.dispose();
      preparing.current = null;
      loading.current = false;
      mixer.current?.dispose();
    };
  }, [invalidateLoads]);
  useEffect(() => {
    mixer.current?.stopVoice();
    setLastCue(null);
  }, [scene]);
  useEffect(() => {
    if (!active) {
      mixer.current?.stopAll();
      setEnabled(false);
    }
  }, [active]);
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) mixer.current?.stopAll();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);
  const play = useCallback(
    (id: string) => {
      if (!selectedCues.get(id)?.text) return;
      if (
        (id === "morgan-6" ||
          id.startsWith("finding-") ||
          id.startsWith("outcome-")) &&
        view?.phase !== "closed"
      )
        return;
      setLastCue(id);
      setError("");
      mixer.current?.voice(id);
    },
    [view?.phase, selectedCues],
  );
  useEffect(() => {
    if (!view) {
      previous.current = null;
      return;
    }
    const next = {
      runId: view.runId,
      records: view.records.length,
      checks: view.records.filter(
        (r) =>
          r.ref.recordId === "EV-06" ||
          r.ref.recordId === "VR01" ||
          r.ref.recordId.startsWith("R-test_") ||
          r.ref.recordId === "R-other_test_received",
      ).length,
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
    const ownerGeneration = generation.current;
    setPhase("loading");
    setError("");
    try {
      const { MissionMixer } = await import("./mixer");
      if (!alive.current || generation.current !== ownerGeneration) return;
      const next = new MissionMixer(
        (message) => {
          if (alive.current && generation.current === ownerGeneration)
            setError(message);
        },
        (value) => {
          if (alive.current && generation.current === ownerGeneration)
            setPlaying(value);
        },
        pack?.cues,
      );
      preparing.current = next;
      await next.load();
      if (!alive.current || generation.current !== ownerGeneration) {
        next.dispose();
        return;
      }
      preparing.current = null;
      mixer.current = next;
      next.configure(prefsRef.current, enabledRef.current);
      setPhase("ready");
    } catch (e) {
      if (alive.current && generation.current === ownerGeneration) {
        preparing.current?.dispose();
        preparing.current = null;
        setPhase("error");
        setError(String(e));
      }
    } finally {
      if (generation.current === ownerGeneration) loading.current = false;
    }
  }
  function update(changes: Partial<AudioPreferences>) {
    const next = { ...prefs, ...changes };
    inSessionPreferences = { ...next };
    setPrefs(next);
    try {
      localStorage.setItem("threat-hunter-audio-v1", JSON.stringify(next));
    } catch {
      /* Optional preferences do not affect the save. */
    }
    window.dispatchEvent(new Event("threat-hunter-audio-prefs"));
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
