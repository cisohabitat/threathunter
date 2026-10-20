import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
const html = readFileSync("dist/index.html", "utf8");
const entry = html.match(/<script[^>]+src="([^"]+)"/)[1];
const css = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map(
  (m) => m[1],
);
const workers = readdirSync("dist/assets")
  .filter((name) => /^validationWorker-.*\.js$/.test(name))
  .map((name) => "/assets/" + name);
assert(workers.length === 1, "Expected the preloaded save-validation worker");
const core = [entry, ...workers, ...css].map((path) => ({
  path,
  bytes: statSync("dist" + path).size,
  gzipBytes: gzipSync(readFileSync("dist" + path)).length,
}));
const art = JSON.parse(readFileSync("src/presentation/art.json", "utf8"));
const audio = JSON.parse(
  readFileSync("src/presentation/voice/manifest.json", "utf8"),
);
assert(
  core
    .filter((item) => item.path.endsWith(".js"))
    .reduce((sum, item) => sum + item.gzipBytes, 0) <=
    400 * 1024,
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
const p1JavaScript = readdirSync("dist/assets")
  .filter((name) => name.endsWith(".js") && !name.startsWith("mixer-"))
  .reduce(
    (sum, name) => sum + gzipSync(readFileSync("dist/assets/" + name)).length,
    0,
  );
assert(
  p1JavaScript <= 400 * 1024,
  "Loaded P1 text/worker JavaScript exceeds 400 KiB compressed",
);
const p1Packs = ["m04", "m07"].map((mission) => {
  const pack = JSON.parse(
    readFileSync(`src/campaign/audio/${mission}/manifest.json`, "utf8"),
  );
  const voice = pack.cues
      .filter((c) => c.text)
      .reduce((sum, c) => sum + c.bytes, 0),
    sound = pack.cues
      .filter((c) => !c.text)
      .reduce((sum, c) => sum + c.bytes, 0);
  assert(
    voice <= 2 * 1024 * 1024 && sound <= 500 * 1024,
    `${mission} optional voice/sound exceeds its budget`,
  );
  return { mission, voiceBytes: voice, soundBytes: sound };
});
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
      p1LoadedJavaScriptGzipBytes: p1JavaScript,
      p1Packs,
      physicalDevicePerformance: "not measured",
    },
    null,
    2,
  ),
);
