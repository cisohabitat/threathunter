import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const hash = (b) => createHash("sha256").update(b).digest("hex");
const url = process.env.THREAT_HUNTER_TEST_URL ?? "http://127.0.0.1:4173";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
const fixtures = {};
let longSave, freeSave;
try {
  const e = await server.ssrLoadModule("/src/expansion/engine.ts"),
    f = await server.ssrLoadModule("/src/expansion/format.ts"),
    { packages } = await server.ssrLoadModule("/src/expansion/content.ts");
  const act = (s, a) => {
    const r = e.processCommand(s, {
      ...a,
      commandId: `lab-${s.view.revision}`,
      expectedRevision: s.view.revision,
      runId: s.view.runId,
    });
    assert.equal(r.receipt.status, "accepted", r.receipt.error);
    return r.state;
  };
  for (const [mission, p] of Object.entries(packages)) {
    let s = e.createRun(mission, `production-${mission}`, "B");
    s = act(s, {
      kind: "ACQUIRE",
      queryId: "baseline",
      cutoffTick: s.view.tick,
    });
    s = act(s, { kind: "SCOPE", targetId: p.primaryTarget });
    for (const queryId of ["context", "activity"])
      s = act(s, { kind: "ACQUIRE", queryId, cutoffTick: s.view.tick });
    fixtures[mission] = JSON.stringify(f.exportSave(s));
  }
  let s = e.createRun("M11", "production-long-history", "U-M");
  const commands = Array.from({ length: 1000 }, (_, i) => ({
    kind: "ADVANCE",
    durationTicks: 1,
    commandId: `long-${i}`,
    runId: s.view.runId,
    expectedRevision: i,
  }));
  s = e.replay(s, commands);
  longSave = JSON.stringify(f.exportSave(s));
  freeSave = JSON.stringify(
    f.exportSave(e.createFreeHunt("production-free-1", "production-free")),
  );
} finally {
  await server.close();
}
const browser = await chromium.launch();
const results = [];
const heartbeat = async (page) =>
  page.evaluate(() => {
    const w = window;
    w.labBeat = { count: 0, gaps: [], last: performance.now() };
    w.labBeat.timer = setInterval(() => {
      const now = performance.now();
      w.labBeat.gaps.push(now - w.labBeat.last);
      w.labBeat.last = now;
      w.labBeat.count++;
    }, 16);
  });
const beatResult = async (page) =>
  page.evaluate(() => {
    const w = window,
      b = w.labBeat;
    clearInterval(b.timer);
    return { callbacks: b.count, maxGapMs: Math.max(0, ...b.gaps) };
  });
try {
  for (const [index, mission] of Object.keys(fixtures).entries()) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(`${url}/case/${mission.toLowerCase()}`);
    const area = page.locator(`[data-expansion="${mission}"]`),
      status = area
        .getByRole("region", {
          name: `${mission} save and readiness`,
          exact: true,
        })
        .getByRole("status");
    const input = area.locator('input[type="file"]');
    await expect(input).toBeEnabled({ timeout: 30000 });
    await input.setInputFiles({
      name: "production.json",
      mimeType: "application/json",
      buffer: Buffer.from(fixtures[mission]),
    });
    await expect(status).toHaveText("Saved on this device", { timeout: 30000 });
    const portable = async () => {
      const pending = page.waitForEvent("download");
      await area
        .getByRole("button", { name: "Export investigation save", exact: true })
        .click();
      return readFile(await (await pending).path(), "utf8");
    };
    const before = await portable();
    const nav = area.getByRole("navigation", {
      name: `${mission} investigation`,
      exact: true,
    });
    await nav.getByRole("button", { name: "Case File", exact: true }).click();
    const workspace = area.getByRole("region", {
      name: `${mission} investigation workspace`,
      exact: true,
    });
    await expect(workspace).toBeVisible();
    const frame = `docs/verification/screens/${24 + index}-${mission.toLowerCase()}-workspace.png`;
    await page.screenshot({ path: frame, fullPage: true });
    assert.equal(
      await portable(),
      before,
      "Reading/navigation changed portable bytes",
    );
    const desktop = (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations;
    assert.equal(desktop.length, 0, JSON.stringify(desktop));
    await page.setViewportSize({ width: 320, height: 800 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      320,
    );
    const phone = (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations;
    assert.equal(phone.length, 0, JSON.stringify(phone));
    await nav
      .getByRole("button", { name: "Review finding", exact: true })
      .click();
    await area
      .getByRole("region", { name: "Finding confirmation", exact: true })
      .getByRole("button", { name: "Confirm and close case", exact: true })
      .click();
    await expect(status).toHaveText("Saved on this device", { timeout: 30000 });
    const closed = await portable(),
      envelope = JSON.parse(closed);
    assert.ok(envelope.snapshot.state.debrief);
    if (mission === "M12")
      await page.screenshot({
        path: "docs/verification/screens/33-m12-bounded-debrief.png",
        fullPage: true,
      });
    await page.reload();
    await expect(status).toHaveText("Saved on this device", { timeout: 30000 });
    assert.equal(await portable(), closed);
    results.push({
      mission,
      frame,
      desktopAxeViolations: desktop.length,
      phoneAxeViolations: phone.length,
      phoneWidth: 320,
      readingPortableEquality: true,
      closureReloadEquality: true,
      closedRevision: envelope.revision,
    });
    await context.close();
  }
  // Exercise background audit and bounded rendering with an actual long browser save.
  const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    }),
    page = await context.newPage();
  await page.goto(`${url}/case/m11`);
  const area = page.locator('[data-expansion="M11"]');
  const input = area.locator('input[type="file"]');
  await expect(input).toBeEnabled({ timeout: 30000 });
  await heartbeat(page);
  const start = performance.now();
  await input.setInputFiles({
    name: "long.json",
    mimeType: "application/json",
    buffer: Buffer.from(longSave),
  });
  await expect(area.getByRole("status")).toHaveText("Saved on this device", {
    timeout: 30000,
  });
  const importMs = performance.now() - start,
    beat = await beatResult(page);
  await area
    .getByRole("navigation", { name: "M11 investigation", exact: true })
    .getByRole("button", { name: "Timeline", exact: true })
    .click();
  const timelineCount = await area.locator(".timeline li").count();
  assert.ok(timelineCount <= 50);
  const pending = page.waitForEvent("download");
  await area
    .getByRole("button", { name: "Export investigation save", exact: true })
    .click();
  const exported = await readFile(await (await pending).path(), "utf8");
  assert.equal(JSON.parse(exported).commands.length, 1000);
  await page.reload();
  await expect(area.getByRole("status")).toHaveText("Saved on this device", {
    timeout: 30000,
  });
  await page.goto(`${url}/hunt/free`);
  const free = page.locator('[data-expansion="free"]');
  await expect(free.locator('input[type="file"]')).toBeEnabled({
    timeout: 30000,
  });
  await free.locator('input[type="file"]').setInputFiles({
    name: "free.json",
    mimeType: "application/json",
    buffer: Buffer.from(freeSave),
  });
  await expect(free.getByRole("status")).toHaveText("Saved on this device", {
    timeout: 30000,
  });
  await context.close();
  const html = await (await fetch(url)).text(),
    entry = html.match(/src="([^"]+\.js)"/)[1],
    bytes = await (await fetch(url + entry)).arrayBuffer();
  const report = {
    capturedAt: new Date().toISOString(),
    url,
    entry,
    entrySha256: hash(Buffer.from(bytes)),
    method:
      "Actual production preview; imported audited fixtures; public workspaces; reading/export equality; weak explicit closure and exact reload; WCAG A/AA samples at desktop and 320px; long-history background import. Full maximum-credit player flows are separately covered by e2e/expansion.spec.ts.",
    missions: results,
    longHistory: {
      commands: 1000,
      bytes: Buffer.byteLength(longSave),
      importMs,
      heartbeat: beat,
      timelineVisibleItems: timelineCount,
      exportCommands: 1000,
      reloaded: true,
    },
    freeHuntImported: true,
    physicalDevicePerformance: "not measured",
    humanReview: "deferred/unpassed",
  };
  await writeFile(
    "docs/verification/expansion.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
