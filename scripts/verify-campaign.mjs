import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
let fixtures, readSave;
try {
  const { createRun } = await server.ssrLoadModule("/src/campaign/engine.ts");
  const { exportSave, importSave } = await server.ssrLoadModule(
    "/src/campaign/format.ts",
  );
  readSave = importSave;
  fixtures = {
    M04: JSON.stringify(exportSave(createRun("M04", "production-m04", "B"))),
    M07: JSON.stringify(exportSave(createRun("M07", "production-m07", "U-M"))),
  };
} finally {
  await server.close();
}
const browser = await chromium.launch();
const results = [];
const percentile = (values) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
try {
  await mkdir("docs/verification/screens", { recursive: true });
  for (const mission of ["M04", "M07"]) {
    const page = await browser.newPage({
      viewport:
        mission === "M04"
          ? { width: 390, height: 844 }
          : { width: 834, height: 1112 },
      reducedMotion: "reduce",
    });
    const area = page.locator(`[data-mission="${mission}"]`),
      times = [];
    const saved = () =>
      area
        .getByRole("status")
        .filter({ hasText: "Saved on this device" })
        .waitFor({ timeout: 60000 });
    const tab = (name) =>
      area
        .getByRole("navigation", { name: `${mission} investigation` })
        .getByRole("button", { name, exact: true })
        .click();
    const acquire = async (title) => {
      const start = performance.now();
      await area
        .locator(".question")
        .filter({ hasText: title })
        .getByRole("button")
        .click();
      await saved();
      times.push(performance.now() - start);
    };
    await page.goto(
      process.env.THREAT_HUNTER_TEST_URL ?? "http://127.0.0.1:4173",
    );
    await page.getByRole("button", { name: "Begin investigation" }).waitFor();
    await page.waitForFunction(
      () =>
        ![...document.querySelectorAll("button")].find((b) =>
          b.textContent.includes("Begin investigation"),
        )?.disabled,
    );
    if (mission === "M04")
      await page
        .getByRole("region", { name: "More investigations" })
        .screenshot({
          path: "docs/verification/screens/13-mission-choices.png",
          animations: "disabled",
        });
    const readyStart = performance.now();
    await page
      .getByRole("button", { name: new RegExp(`${mission} ·`) })
      .click();
    await area.getByRole("button", { name: "Begin proactive hunt" }).waitFor();
    await page.waitForFunction(
      (m) =>
        !document.querySelector(`[data-mission="${m}"] input[type="file"]`)
          ?.disabled,
      mission,
    );
    const textReadyMs = Math.round(performance.now() - readyStart),
      importStart = performance.now();
    await area.locator('input[type="file"]').setInputFiles({
      name: "case.json",
      mimeType: "application/json",
      buffer: Buffer.from(fixtures[mission]),
    });
    await saved();
    const importAndCommitMs = Math.round(performance.now() - importStart);
    await tab("Investigate");
    if (mission === "M04") {
      await acquire("Compare account activity by host");
      await area.getByLabel("Investigation scope").selectOption("LEGACY-01");
      await saved();
      await area.locator(".scope-matrix").screenshot({
        path: "docs/verification/screens/14-m04-matrix-phone.png",
        animations: "disabled",
      });
      for (const name of [
        "Check ownership and billing dependency",
        "Check the migration approval",
        "Inspect session origin",
        "Inspect task provenance",
      ])
        await acquire(name);
      await tab("Case File");
      await area
        .getByRole("heading", { name: "Your Case File" })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: "docs/verification/screens/15-m04-case-file-phone.png",
        animations: "disabled",
      });
      await tab("Investigate");
    } else {
      for (const name of [
        "Inspect declared coverage",
        "Compare delivered heartbeats",
        "Inspect collector routing",
        "Examine the independent identity source",
      ])
        await acquire(name);
      await area
        .locator('[aria-label="Declared versus observed collection"]')
        .screenshot({
          path: "docs/verification/screens/16-m07-coverage-tablet.png",
          animations: "disabled",
        });
      await area.getByLabel("Investigation scope").selectOption("CS-PORTAL");
      await saved();
      await area
        .getByRole("button", { name: "Enable future collection · 2 steps" })
        .click();
      await saved();
      await area
        .getByRole("button", {
          name: "Request controlled verification · 1 step",
        })
        .click();
      await saved();
      await tab("Timeline");
      await area
        .getByRole("combobox", { name: "Advance the world", exact: true })
        .selectOption("3");
      await area
        .getByRole("button", { name: "Advance selected steps" })
        .click();
      await saved();
      await tab("Investigate");
      await acquire("Review the future observation window");
      await page.setViewportSize({ width: 390, height: 844 });
      const latest = area
        .locator(".panel")
        .filter({ hasText: "Latest observation" });
      await latest.screenshot({
        path: "docs/verification/screens/17-m07-window-phone.png",
        animations: "disabled",
      });
    }
    const portable = async () => {
      const pending = page.waitForEvent("download");
      await area
        .getByRole("button", { name: "Export hunt save", exact: true })
        .click();
      return readFile(await (await pending).path(), "utf8");
    };
    const before = await portable(),
      restored = readSave(before);
    assert.equal(restored.missionId, mission);
    assert.equal(
      restored.persistence.committedRevision,
      restored.view.revision,
    );
    if (mission === "M04")
      assert(
        restored.view.records.some((r) => r.relationship?.host === "LEGACY-01"),
      );
    else {
      assert(
        restored.view.records.some(
          (r) => r.title === "Future observation window complete",
        ),
      );
      assert(
        restored.view.records.some(
          (r) => r.title === "Controlled application event received",
        ),
      );
    }
    const requests = new Set();
    page.on("request", (r) => {
      if (r.url().includes(`/audio/${mission.toLowerCase()}/`))
        requests.add(r.url());
    });
    await area
      .getByRole("button", { name: "Voice & sound", exact: true })
      .click();
    await area
      .getByRole("button", { name: "Enable voice and sound", exact: true })
      .click();
    await area.getByText(/Voice pack ready/).waitFor({ timeout: 60000 });
    assert.equal(requests.size, 21);
    await page.context().setOffline(true);
    await area
      .getByRole("button", { name: "Play briefing", exact: true })
      .click();
    await area
      .getByText("Selected narration · text transcript", { exact: true })
      .waitFor();
    await area.getByRole("button", { name: "Mute all", exact: true }).click();
    const interactions = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await tab(i % 2 ? "Brief" : "Timeline");
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
      );
      interactions.push(performance.now() - start);
    }
    assert.equal(await portable(), before);
    await page.context().setOffline(false);
    await page.reload();
    await saved();
    assert.deepEqual(JSON.parse(await portable()), JSON.parse(before));
    await tab("Case File");
    const cited = area.getByRole("button", {
      name: "Cite in finding · free",
      exact: true,
    });
    for (let i = 0; i < (await cited.count()); i++) {
      await cited.nth(i).click();
      await saved();
    }
    await area
      .getByRole("article", {
        name:
          mission === "M04"
            ? "A matching migration record"
            : "A routing mismatch explains the pipeline gap",
        exact: true,
      })
      .getByRole("button", { name: "Test another explanation · free" })
      .click();
    await saved();
    for (const [name, value] of [
      ["Finding", mission === "M04" ? "explained" : "visibility"],
      ["Claim confidence", mission === "M04" ? "medium" : "low"],
      [
        "Alternative tested",
        mission === "M04"
          ? "approved_work_tested"
          : "coverage_configuration_tested",
      ],
    ]) {
      await area
        .getByRole("combobox", { name, exact: true })
        .selectOption(value);
      await saved();
    }
    for (const label of mission === "M04"
      ? [
          "An unfamiliar relationship is not proof of misuse",
          "The host supports an essential billing dependency",
        ]
      : [
          "Missing historical collection cannot be reconstructed",
          "A successful test now does not prove historical coverage",
        ]) {
      await area.getByLabel(label, { exact: true }).check();
      await saved();
    }
    await area
      .getByLabel(
        mission === "M04"
          ? "My finding concerns BILL-S1 on the discovered host, preserving the billing dependency"
          : "My finding concerns the CS-PORTAL application source and its stated missing interval",
        { exact: true },
      )
      .check();
    await saved();
    if (mission === "M04") {
      await area
        .getByRole("combobox", { name: "Recommendation", exact: true })
        .selectOption("close_explained");
      await saved();
    } else {
      await area
        .getByRole("combobox", {
          name: "Missing historical interval",
          exact: true,
        })
        .selectOption("gap");
      await saved();
      await area
        .getByRole("combobox", { name: "Follow-up trigger", exact: true })
        .selectOption("repeat_application_verification");
      await saved();
    }
    await area
      .getByRole("button", { name: "Review finding", exact: true })
      .click();
    await area.getByRole("button", { name: "Confirm and close hunt" }).click();
    await saved();
    const finalState = readSave(await portable());
    assert.equal(finalState.view.phase, "closed");
    assert.equal(finalState.debrief.quality.total, 100);
    await page.setViewportSize(
      mission === "M04"
        ? { width: 1280, height: 1000 }
        : { width: 834, height: 1112 },
    );
    const debrief = area.getByRole("region", {
      name: `${mission} hunt debrief`,
    });
    await page.evaluate((m) => {
      const el = document.querySelector(`[aria-label="${m} hunt debrief"]`);
      window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 20);
    }, mission);
    await page.screenshot({
      path: `docs/verification/screens/${mission === "M04" ? "18-m04-debrief-desktop" : "19-m07-debrief-tablet"}.png`,
      animations: "disabled",
    });
    await page.reload();
    await saved();
    await debrief.waitFor();
    results.push({
      mission,
      textReadyMs,
      importAndCommitMs,
      acquisitionSamples: times.length,
      acquisitionCommitP95Ms: Math.round(percentile(times)),
      navigationSamples: 100,
      navigationP95Ms: Math.round(percentile(interactions)),
      restoredRevision: restored.view.revision,
      restoredTick: restored.view.tick,
      commands: restored.commands.length,
      fullVoiceFiles: requests.size,
      referenceQuality: finalState.debrief.quality.total,
      finalRevision: finalState.view.revision,
      closedReloadPassed: true,
      offlineVoiceAndExportInvariant: true,
      reloadPortableEquality: true,
    });
    await page.close();
  }
  const html = await readFile("dist/index.html", "utf8"),
    entry = html.match(/<script[^>]+src="([^"]+)"/)[1];
  const report = {
    buildBundle: entry,
    bundleSha256: createHash("sha256")
      .update(await readFile("dist" + entry))
      .digest("hex"),
    browser: browser.version(),
    method:
      "Linux Chromium production preview; phone/tablet viewports, healthy local storage/network. Actual UI fixture import, acquisition, source window, full-pack offline playback, 100 navigation clicks with two-frame wait, portable export/pure-reader validation and reload equality.",
    missions: results,
    limits:
      "Lab automation and emulation only. No physical-device, assistive-technology, listening, creative or player review. Acquisition timings include declared simulation/commit work and automation. Reference scored closure/reload is also checked. These authored-fixture expectations are not human calibration or player acceptance.",
  };
  await writeFile(
    "docs/verification/campaign.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
