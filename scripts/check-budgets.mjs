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
const preloads = [
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g),
].map((m) => m[1]);
const core = [
  ...new Set(["/index.html", entry, ...preloads, ...workers, ...css]),
].map((path) => ({
  path,
  bytes: statSync("dist" + path).size,
  gzipBytes: gzipSync(readFileSync("dist" + path)).length,
}));
const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8"));
const roots = Object.keys(manifest).filter((k) => manifest[k].isEntry);
assert(roots.length === 1, "Expected one application entry");
function graph(key, seen = new Set()) {
  const item = manifest[key];
  assert(item, `Missing build graph node ${key}`);
  seen.add(item.file);
  for (const next of item.imports ?? [])
    if (!seen.has(manifest[next]?.file)) graph(next, seen);
  return seen;
}
const initialFiles = graph(roots[0]);
const toolingReaders = [
  "src/persistence/format.ts",
  "src/campaign/format.ts",
  "src/expansion/format.ts",
].map((key) => {
  const reader = manifest[key];
  assert(
    reader?.isDynamicEntry,
    `Expected the isolated tooling save reader: ${key}`,
  );
  assert(
    !initialFiles.has(reader.file),
    `${key} leaked into the initial interface graph`,
  );
  return reader;
});
function profile(name, module, workerPattern) {
  const paths = new Set(initialFiles);
  if (module) for (const p of graph(module)) paths.add(p);
  for (const reader of toolingReaders)
    assert(
      !paths.has(reader.file),
      `${name} statically loads a tooling-only save reader`,
    );
  for (const name of readdirSync("dist/assets"))
    if (workerPattern.test(name)) paths.add("assets/" + name);
  const bytes = [...paths]
    .filter((p) => p.endsWith(".js"))
    .reduce((n, p) => n + gzipSync(readFileSync("dist/" + p)).length, 0);
  assert(
    bytes <= 400 * 1024,
    `${name} active text/worker JavaScript exceeds 400 KiB compressed`,
  );
  return { name, gzipJavaScriptBytes: bytes, files: [...paths].sort() };
}
const profiles = [
  profile("M01", null, /^validationWorker-.*\.js$/),
  profile(
    "P1 M04/M07",
    "src/campaign/Campaign.tsx",
    /^(validationWorker|p1Worker)-.*\.js$/,
  ),
  profile(
    "Expansion/free hunts",
    "src/expansion/Expansion.tsx",
    /^(validationWorker|expansionWorker)-.*\.js$/,
  ),
];
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
const allShippedJavaScript = readdirSync("dist/assets")
  .filter((name) => name.endsWith(".js"))
  .reduce(
    (sum, name) => sum + gzipSync(readFileSync("dist/assets/" + name)).length,
    0,
  );
const p1Packs = [
  "m04",
  "m07",
  "m02",
  "m03",
  "m05",
  "m06",
  "m08",
  "m09",
  "m10",
  "m11",
  "m12",
].map((mission) => {
  const pack = JSON.parse(
    readFileSync(
      `src/${mission === "m04" || mission === "m07" ? "campaign" : "expansion"}/audio/${mission}/manifest.json`,
      "utf8",
    ),
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
      activeCaseProfiles: profiles,
      allShippedJavaScriptGzipBytes: allShippedJavaScript,
      toolingOnlyReaders: toolingReaders.map((reader) => ({
        path: "/" + reader.file,
        gzipBytes: gzipSync(readFileSync("dist/" + reader.file)).length,
      })),
      budgetMethod:
        "400 KiB applies to the cold active-case text graph plus loaded workers; all shipped JavaScript, including tooling-only dynamic readers, is reported separately. Initial modulepreloads are included. The core asset estimate also includes gzip HTML, CSS and the largest selected art variant.",
      p1Packs,
      physicalDevicePerformance: "not measured",
    },
    null,
    2,
  ),
);
