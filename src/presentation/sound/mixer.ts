import { Howl } from "howler";
import { voicePack } from "../voice/pack";
export type AudioAsset = {
  id: string;
  text: string;
  audioPath: string;
  bytes: number;
  sha256: string;
};
export type AudioPreferences = {
  master: number;
  voice: number;
  effects: number;
  ambience: number;
  masterMuted: boolean;
  voiceMuted: boolean;
  effectsMuted: boolean;
  ambienceMuted: boolean;
  captions: boolean;
  screenReaderFriendly: boolean;
};
export class MissionMixer {
  private sounds = new Map<string, Howl>();
  private urls: string[] = [];
  private speaking = false;
  private foreground: Howl | null = null;
  private enabled = false;
  private prefs!: AudioPreferences;
  constructor(
    private onError: (message: string) => void,
    private onPlaying: (playing: boolean) => void,
    private assets: readonly AudioAsset[] = voicePack.cues,
  ) {}
  private loading: AbortController | null = null;
  private generation = 0;
  async load() {
    const controller = new AbortController(),
      generation = ++this.generation;
    this.loading = controller;
    const deadline = setTimeout(() => controller.abort(), 20000);
    try {
      await Promise.all(
        this.assets.map(async (cue) => {
          const response = await fetch(cue.audioPath, {
            signal: controller.signal,
          });
          if (!response.ok) throw Error(`Could not load ${cue.id}.`);
          const bytes = await response.arrayBuffer();
          const hash = Array.from(
            new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
          )
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          if (
            controller.signal.aborted ||
            generation !== this.generation ||
            bytes.byteLength !== cue.bytes ||
            hash !== cue.sha256
          )
            throw Error("Voice asset unavailable or incompatible.");
          const url = URL.createObjectURL(
            new Blob([bytes], { type: "audio/mpeg" }),
          );
          this.urls.push(url);
          await new Promise<void>((resolve, reject) => {
            const abort = () => reject(Error("Voice preparation cancelled."));
            controller.signal.addEventListener("abort", abort, { once: true });
            const h = new Howl({
              src: [url],
              format: ["mp3"],
              preload: true,
              loop: cue.id === "ambience",
              onload: () => {
                controller.signal.removeEventListener("abort", abort);
                if (
                  generation !== this.generation ||
                  controller.signal.aborted
                ) {
                  h.unload();
                  reject(Error("Obsolete voice preparation."));
                } else resolve();
              },
              onloaderror: () => {
                controller.signal.removeEventListener("abort", abort);
                reject(Error(`Could not decode ${cue.id}.`));
              },
            });
            // Own pending decoders immediately so failure/disposal can unload them.
            this.sounds.set(cue.id, h);
          });
        }),
      );
    } catch {
      controller.abort();
      this.dispose();
      throw Error(
        "Voice pack unavailable. Continue with text; you can retry audio.",
      );
    } finally {
      clearTimeout(deadline);
      if (this.loading === controller) this.loading = null;
    }
  }
  configure(prefs: AudioPreferences, enabled: boolean) {
    this.prefs = prefs;
    this.enabled = enabled;
    if (!enabled || prefs.masterMuted || prefs.master === 0) {
      this.stopAll();
      return;
    }
    if (prefs.voiceMuted || prefs.voice === 0) this.stopVoice();
    if (prefs.effectsMuted || prefs.effects === 0)
      for (const [id, sound] of this.sounds)
        if (id.startsWith("effect-")) sound.stop();
    this.updateLevels();
    const ambient = this.sounds.get("ambience");
    if (prefs.ambienceMuted || prefs.ambience === 0) ambient?.stop();
    else if (ambient && !ambient.playing()) ambient.play();
  }
  private level(channel: "voice" | "effects" | "ambience") {
    return !this.enabled ||
      this.prefs.masterMuted ||
      this.prefs[`${channel}Muted`]
      ? 0
      : this.prefs.master *
          this.prefs[channel] *
          (channel === "ambience" && this.speaking ? 0.25 : 1);
  }
  private updateLevels() {
    for (const [id, sound] of this.sounds)
      sound.volume(
        this.level(
          id === "ambience"
            ? "ambience"
            : id.startsWith("effect-")
              ? "effects"
              : "voice",
        ),
      );
  }
  voice(id: string) {
    this.stopVoice();
    if (!this.enabled || this.level("voice") === 0) return;
    const sound = this.sounds.get(id);
    if (!sound || !this.assets.find((cue) => cue.id === id)?.text) return;
    this.foreground = sound;
    this.speaking = true;
    this.onPlaying(true);
    this.updateLevels();
    sound.once("end", () => {
      if (this.foreground === sound) this.stopVoice();
    });
    sound.once("playerror", () => {
      this.stopVoice();
      this.onError(
        "Playback was blocked. Tap Replay to enable it; the same text remains available.",
      );
    });
    sound.play();
  }
  effect(id: string) {
    if (this.enabled && this.level("effects") > 0) this.sounds.get(id)?.play();
  }
  stopVoice() {
    this.foreground?.stop();
    this.foreground?.off("end");
    this.foreground?.off("playerror");
    this.foreground = null;
    this.speaking = false;
    this.onPlaying(false);
    if (this.prefs) this.updateLevels();
  }
  stopAll() {
    this.stopVoice();
    for (const sound of this.sounds.values()) sound.stop();
  }
  dispose() {
    this.generation++;
    this.loading?.abort();
    this.loading = null;
    this.stopAll();
    for (const sound of this.sounds.values()) sound.unload();
    this.sounds.clear();
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls = [];
  }
}
