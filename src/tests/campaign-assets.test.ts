import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { audioPacks } from "../campaign/audio";
it("ships complete versioned P1 voice packs with matching delivery hashes and deferred review status", () => {
  for (const pack of Object.values(audioPacks)) {
    expect(pack.reviewStatus).toBe("pending-human-listening");
    expect(pack.cues).toHaveLength(21);
    for (const id of [
      "briefing",
      ...Array.from({ length: 6 }, (_, i) => `morgan-${i + 1}`),
      "check-ready",
      "report-submitted",
      "finding-explained",
      "finding-misuse",
      "finding-visibility",
      "finding-provisional",
      "finding-unsupported",
      "outcome-occurred",
      "outcome-not-occurred",
    ])
      expect(pack.cues.some((c) => c.id === id && c.text)).toBe(true);
    let voice = 0,
      sound = 0;
    for (const cue of pack.cues) {
      const data = readFileSync("public" + cue.audioPath);
      expect(data.length).toBe(cue.bytes);
      expect(createHash("sha256").update(data).digest("hex")).toBe(cue.sha256);
      if (cue.text) voice += data.length;
      else sound += data.length;
    }
    expect(voice).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(sound).toBeLessThanOrEqual(500 * 1024);
  }
});
