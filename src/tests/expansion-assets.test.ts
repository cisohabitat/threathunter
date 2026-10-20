import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { it, expect } from "vitest";
import { audioPacks } from "../expansion/audio";
const sha = (data: Buffer) => createHash("sha256").update(data).digest("hex");
it("ships all nine complete packs with literal matching scripts, immutable shared deliveries and bounded selected guidance", () => {
  const sharedPaths = new Set<string>();
  for (const [id, pack] of Object.entries(audioPacks)) {
    const scripts = JSON.parse(
      readFileSync(`src/expansion/audio/${id.toLowerCase()}/cues.json`, "utf8"),
    );
    expect(pack.cues).toHaveLength(21);
    expect(pack.reviewStatus).toBe("pending-human-listening");
    expect(pack.reviewer).toBeNull();
    let voice = 0,
      sound = 0;
    for (const cue of pack.cues) {
      const bytes = readFileSync("public" + cue.audioPath);
      expect(bytes.length).toBe(cue.bytes);
      expect(sha(bytes)).toBe(cue.sha256);
      if (cue.text) {
        expect(scripts[cue.id].text).toBe(cue.text);
        voice += bytes.length;
      } else sound += bytes.length;
      if (cue.id.startsWith("morgan-"))
        expect(cue.durationMs).toBeLessThanOrEqual(12000);
      if (cue.id === "briefing") {
        expect(cue.audioPath).toContain(`/${id.toLowerCase()}/`);
        expect(cue.durationMs).toBeLessThanOrEqual(30000);
      }
      if (cue.audioPath.includes("/expansion-shared/"))
        sharedPaths.add(cue.audioPath);
    }
    expect(voice).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(sound).toBeLessThanOrEqual(500 * 1024);
  }
  expect(sharedPaths.size).toBe(14);
});
it("retains original and revised lossless archives with recorded hashes and matching active/previous deliveries", () => {
  const master = JSON.parse(
      readFileSync("production/expansion-MASTERS.json", "utf8"),
    ),
    revision = JSON.parse(
      readFileSync("production/expansion-nudge-v2-MASTERS.json", "utf8"),
    );
  expect(master.files).toHaveLength(32);
  expect(master.archives).toHaveLength(10);
  expect(revision.files).toHaveLength(9);
  for (const item of master.archives) {
    const data = readFileSync(item.path);
    expect(data.length).toBe(item.bytes);
    expect(sha(data)).toBe(item.sha256);
  }
  const archive = readFileSync(revision.archive);
  expect(archive.length).toBe(revision.archiveBytes);
  expect(sha(archive)).toBe(revision.archiveSha256);
  for (const f of master.files) {
    expect(sha(readFileSync("public" + f.deliveryPath))).toBe(f.deliverySha256);
    expect(f.pcmSha256).toMatch(/^[a-f0-9]{64}$/);
  }
  for (const f of revision.files) {
    expect(sha(readFileSync("public" + f.activeCue.audioPath))).toBe(
      f.activeCue.sha256,
    );
    expect(existsSync("public" + f.previousCue.audioPath)).toBe(true);
    expect(f.activeCue.durationMs).toBeLessThanOrEqual(12000);
  }
});
