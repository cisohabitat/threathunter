import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
const html = readFileSync("dist/index.html", "utf8");
const entry = html.match(/<script[^>]+src="([^"]+)"/)[1];
const css = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map(
  (m) => m[1],
);
const core = [entry, ...css].map((path) => ({
  path,
  bytes: statSync("dist" + path).size,
  gzipBytes: gzipSync(readFileSync("dist" + path)).length,
}));
const art = JSON.parse(readFileSync("src/presentation/art.json", "utf8"));
const audio = JSON.parse(
  readFileSync("src/presentation/voice/manifest.json", "utf8"),
);
assert(
  core[0].gzipBytes <= 400 * 1024,
  "Critical JavaScript exceeds 400 KiB compressed",
);
for (const item of art.compositions)
  assert(
    item.bytes <= (item.width <= 720 ? 450 : 800) * 1024,
    "Art exceeds delivery budget",
  );
const voiceBytes = audio.cues
  .filter((c) => c.text)
  .reduce((sum, c) => sum + c.bytes, 0);
const soundBytes = audio.cues
  .filter((c) => !c.text)
  .reduce((sum, c) => sum + c.bytes, 0);
assert(voiceBytes <= 2 * 1024 * 1024, "Voice exceeds 2 MiB");
assert(soundBytes <= 500 * 1024, "Effects/ambience exceed 500 KiB");
const coreTotal =
  core.reduce((sum, item) => sum + item.gzipBytes, 0) +
  Math.max(...art.compositions.map((c) => c.bytes));
assert(coreTotal <= 2 * 1024 * 1024, "Critical assets exceed 2 MiB");
assert(
  !readdirSync("dist").includes("production"),
  "Masters leaked into browser output",
);
console.log(
  JSON.stringify(
    {
      critical: core,
      criticalTotalWithLargestArt: coreTotal,
      voiceBytes,
      soundBytes,
      physicalDevicePerformance: "not measured",
    },
    null,
    2,
  ),
);
