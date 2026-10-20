import { afterEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const mock = vi.hoisted(() => ({
  created: [] as { unload: ReturnType<typeof vi.fn> }[],
}));
vi.mock("howler", () => ({
  Howl: class {
    unload = vi.fn();
    stop = vi.fn();
    off = vi.fn();
    constructor() {
      mock.created.push(this);
    }
  },
}));
import { MissionMixer } from "../presentation/sound/mixer";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  mock.created.length = 0;
});
it("fails a pack promptly and cancels another stalled fetch instead of waiting for every clip", async () => {
  let signal: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, options: { signal: AbortSignal }) =>
      path === "/broken"
        ? Promise.reject(Error("missing"))
        : new Promise((_resolve, reject) => {
            signal = options.signal;
            signal.addEventListener("abort", () => reject(Error("cancelled")), {
              once: true,
            });
          }),
    ),
  );
  const assets = ["/broken", "/stalled"].map((audioPath, i) => ({
    id: `clip-${i}`,
    text: "candidate",
    audioPath,
    bytes: 4,
    sha256: "0".repeat(64),
  }));
  const mixer = new MissionMixer(
    () => {},
    () => {},
    assets,
  );
  await expect(mixer.load()).rejects.toThrow("Voice pack unavailable");
  expect(signal?.aborted).toBe(true);
});
it("bounds a stalled decoder and unloads its owned media without leaving a ready partial pack", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const bytes = new TextEncoder().encode("clip");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(bytes)),
  );
  const assets = [
    {
      id: "voice",
      text: "candidate",
      audioPath: "/clip",
      bytes: 4,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
  ];
  const mixer = new MissionMixer(
      () => {},
      () => {},
      assets,
    ),
    load = mixer.load();
  const rejected = expect(load).rejects.toThrow("Voice pack unavailable");
  await vi.waitFor(() => expect(mock.created).toHaveLength(1));
  await vi.advanceTimersByTimeAsync(20000);
  await rejected;
  expect(mock.created[0].unload).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
