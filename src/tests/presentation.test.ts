import { expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import artwork from "../presentation/art.json";
import masters from "../../production/MASTERS.json";
const sha = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");
it("ships matching art dimensions, immutable versions and responsive budget variants", () => {
  for (const composition of artwork.compositions) {
    const data = readFileSync("public" + composition.path);
    expect(sha(data)).toBe(composition.sha256);
    expect(data.length).toBe(composition.bytes);
    expect(data.toString("ascii", 0, 4)).toBe("RIFF");
    const kind = data.toString("ascii", 12, 16);
    const width =
      kind === "VP8X"
        ? data.readUIntLE(24, 3) + 1
        : data.readUInt16LE(26) & 0x3fff;
    const height =
      kind === "VP8X"
        ? data.readUIntLE(27, 3) + 1
        : data.readUInt16LE(28) & 0x3fff;
    expect([width, height]).toEqual([composition.width, composition.height]);
    expect(composition.bytes).toBeLessThan(
      composition.width <= 720 ? 450 * 1024 : 800 * 1024,
    );
  }
  expect(existsSync("public" + artwork.fallback)).toBe(true);
  expect(artwork.reviewStatus).toBe("pending-human-acceptance");
});
it("retains intact lossless master archives outside public delivery", () => {
  for (const archive of masters.archives) {
    const bytes = readFileSync("production/" + archive.path);
    expect(bytes.length).toBe(archive.bytes);
    expect(sha(bytes)).toBe(archive.sha256);
    expect(existsSync("public/production/" + archive.path)).toBe(false);
  }
  expect(masters.audio).toHaveLength(21);
});
function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
it("core narrative and action palette pairs meet the stated contrast thresholds", () => {
  const css = readFileSync("src/ui/styles.css", "utf8");
  const tokens = Object.fromEntries(
    [...css.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6});/g)].map((m) => [
      m[1],
      m[2],
    ]),
  );
  const contrast = (a: string, b: string) => {
    const pair = [luminance(tokens[a]), luminance(tokens[b])].sort(
      (a, b) => b - a,
    );
    return (pair[0] + 0.05) / (pair[1] + 0.05);
  };
  for (const background of ["--bg-deep", "--surface-1", "--surface-2"])
    for (const text of [
      "--text-primary",
      "--text-secondary",
      "--accent-cyan",
      "--accent-amber",
      "--status-risk",
    ])
      expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
  expect(contrast("--bg-deep", "--accent-cyan")).toBeGreaterThanOrEqual(4.5);
  expect(contrast("--focus-ring", "--surface-1")).toBeGreaterThanOrEqual(3);
});
it("all authored CSS token references resolve to an authored declaration", () => {
  const css = readFileSync("src/ui/styles.css", "utf8");
  const declarations = new Set(
    [...css.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]),
  );
  for (const match of css.matchAll(/var\((--[a-z0-9-]+)\)/g))
    expect(declarations.has(match[1])).toBe(true);
});
