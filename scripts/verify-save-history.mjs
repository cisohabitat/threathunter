import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
const samples = [];
let text;
let boundedLegacy;
let sameBuildReplayComparison;
try {
  const { createRun, processCommand, replayCommands } =
    await server.ssrLoadModule("/src/engine/engine.ts");
  const { exportSave, importSave } = await server.ssrLoadModule(
    "/src/persistence/format.ts",
  );
  let state = createRun("history-lab", "M");
  for (let i = 0; i < 750; i++) {
    state = processCommand(state, {
      kind: "EDIT_CASE",
      commandId: "history-" + i,
      runId: state.view.runId,
      expectedRevision: i,
      draft: { ...state.view.draft, optionalNotes: "History edit " + i },
    }).state;
    if ([100, 350, 750].includes(i + 1)) {
      text = JSON.stringify(exportSave(state));
      const started = performance.now();
      const restored = importSave(text);
      assert.equal(restored.commands.length, i + 1);
      samples.push({
        commands: i + 1,
        utf8Bytes: Buffer.byteLength(text),
        synchronousNodeValidationMs: Math.round(performance.now() - started),
      });
    }
  }
  const referenceStarted = performance.now();
  let reference = createRun("history-lab", "M");
  for (const command of state.commands)
    reference = processCommand(reference, command).state;
  const immutableReplayMs = performance.now() - referenceStarted;
  const ownedStarted = performance.now();
  const owned = replayCommands(createRun("history-lab", "M"), state.commands);
  const ownedReplayMs = performance.now() - ownedStarted;
  assert.deepEqual(owned, reference);
  sameBuildReplayComparison = {
    commands: 750,
    immutableReplayMs: Math.round(immutableReplayMs),
    ownedReplayMs: Math.round(ownedReplayMs),
    equalCompleteState: true,
    method:
      "Single same-build Node trial, identical parsed commands and initial state; no physical-device or population claim",
  };
  const { checksum } = await server.ssrLoadModule("/src/persistence/format.ts");
  const data = {
    schemaVersion: 1,
    ruleset: "4.0.0",
    runId: "r",
    world: "M",
    commands: Array.from({ length: 20000 }, (_, i) => ({
      kind: "ADVANCE",
      runId: "r",
      commandId: i.toString(36),
      expectedRevision: i,
      durationTicks: 1,
    })),
  };
  const boundedText = JSON.stringify({ ...data, hash: checksum(data) });
  assert(Buffer.byteLength(boundedText) <= 2 * 1024 * 1024);
  const boundedStarted = performance.now();
  const bounded = importSave(boundedText);
  assert.equal(bounded.view.revision, 20000);
  assert.equal(bounded.view.tick, 20000);
  assert.equal(bounded.simulation.tick, 20000);
  assert.equal(bounded.simulation.objectiveAchieved, true);
  assert.equal(bounded.commands.length, 20000);
  assert.equal(Object.keys(bounded.receipts).length, 20000);
  boundedLegacy = {
    commands: 20000,
    utf8Bytes: Buffer.byteLength(boundedText),
    validationMs: Math.round(performance.now() - boundedStarted),
    restoredTick: bounded.view.tick,
    receipts: Object.keys(bounded.receipts).length,
    method:
      "Node import of a valid format-1 file at the command-count limit; no browser rendering claim",
  };
} finally {
  await server.close();
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto(
    process.env.THREAT_HUNTER_TEST_URL ?? "http://127.0.0.1:4173",
  );
  await page.getByRole("button", { name: "Begin investigation" }).waitFor();
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("Begin investigation"),
      )?.disabled,
  );
  await page.evaluate(() => {
    const probe = {
      started: performance.now(),
      previous: performance.now(),
      gaps: [],
      longTasks: [],
    };
    probe.timer = setInterval(() => {
      const now = performance.now();
      probe.gaps.push(now - probe.previous);
      probe.previous = now;
    }, 20);
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      probe.observer = new PerformanceObserver((list) =>
        probe.longTasks.push(...list.getEntries().map((e) => e.duration)),
      );
      probe.observer.observe({ entryTypes: ["longtask"] });
    }
    window.historyProbe = probe;
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "history.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  await page
    .getByRole("button", { name: "Voice & sound", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Saved on this device" })
    .waitFor({ timeout: 60000 });
  const responsiveness = await page.evaluate(() => {
    const p = window.historyProbe;
    clearInterval(p.timer);
    p.observer?.disconnect();
    const sorted = [...p.gaps].sort((a, b) => a - b);
    return {
      importAndCommitMs: Math.round(performance.now() - p.started),
      heartbeatSamples: sorted.length,
      heartbeatP95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
      maximumHeartbeatGapMs: sorted.at(-1),
      longTaskDurationsMs: p.longTasks,
    };
  });
  assert(
    responsiveness.heartbeatSamples > 0 ||
      responsiveness.importAndCommitMs < 100,
    "Interface heartbeat did not run during validation",
  );
  const stored = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("threat-hunter-v1");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db.transaction("runs").objectStore("runs").get("active");
          read.onsuccess = () => {
            resolve(read.result);
            db.close();
          };
          read.onerror = () => {
            reject(read.error);
            db.close();
          };
        };
      }),
  );
  assert.equal(stored.revision, 750);
  assert.deepEqual(stored.current.commands, JSON.parse(text).commands);
  assert.equal(stored.current.snapshot.state.view.tick, 0);
  assert.equal(
    stored.current.snapshot.state.view.draft.optionalNotes,
    "History edit 749",
  );
  assert.equal(stored.current.latestCommittedRevision, 750);
  await page.reload();
  await page
    .getByRole("status")
    .filter({ hasText: "Saved on this device" })
    .waitFor({ timeout: 30000 });
  const html = await readFile("dist/index.html", "utf8");
  const entry = html.match(/<script[^>]+src="([^"]+)"/)[1];
  await writeFile(
    "docs/verification/save-history.json",
    JSON.stringify(
      {
        buildBundle: entry,
        bundleSha256: createHash("sha256")
          .update(await readFile("dist" + entry))
          .digest("hex"),
        browser: browser.version(),
        method:
          "Linux Chromium production preview, healthy desktop CPU/storage; 20 ms main-thread heartbeat during real file import and durable commit; exact stored command comparison and reload",
        validationSamples: samples,
        boundedLegacy,
        sameBuildReplayComparison,
        workerImport: responsiveness,
        restored: {
          revision: 750,
          tick: 0,
          commands: 750,
          committed: true,
          reloadPassed: true,
        },
        limits:
          "Owned replay removes per-command whole-state copies; validation, checksums, serialization and cloning still cost time. Serialization, cloning and rendering still use the main thread. The 20,000-command result is Node format-1 import only, not browser rendering, durable format-2 migration or physical-device acceptance. Large snapshot exports may exceed the existing 2 MiB limit. Validation has a 20-second per-request deadline; oversized/incompatible data is rejected without writes.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      validationSamples: samples,
      boundedLegacy,
      sameBuildReplayComparison,
      workerImport: responsiveness,
    }),
  );
} finally {
  await browser.close();
}
