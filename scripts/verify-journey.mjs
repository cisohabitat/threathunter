import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
let fixture;
try {
  const { createRun, processCommand } = await server.ssrLoadModule(
    "/src/engine/engine.ts",
  );
  const { exportSave } = await server.ssrLoadModule(
    "/src/persistence/format.ts",
  );
  const initial = createRun("journey-production-m01", "M");
  const closed = processCommand(initial, {
    kind: "CLOSE_CASE",
    draft: initial.view.draft,
    commandId: "close",
    runId: initial.view.runId,
    expectedRevision: 0,
  }).state;
  assert(closed.debrief.quality.total < 30);
  fixture = JSON.stringify(exportSave(closed));
} finally {
  await server.close();
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await page.goto(
    process.env.THREAT_HUNTER_TEST_URL ?? "http://127.0.0.1:4173",
  );
  await page.waitForFunction(() => {
    const input = document.querySelector('input[type="file"]');
    return input && !input.disabled;
  });
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "closed-m01.json",
      mimeType: "application/json",
      buffer: Buffer.from(fixture),
    });
  const saved01 = () =>
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status")
      .filter({ hasText: "Saved on this device" })
      .waitFor({ timeout: 60000 });
  await saved01();
  const export01 = async () => {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export save", exact: true })
      .click();
    return readFile(await (await pending).path(), "utf8");
  };
  const before = await export01();
  const overview = page.getByRole("region", {
    name: "Your investigation journey",
    exact: true,
  });
  const check = async (count) => {
    await overview
      .getByRole("button", { name: /^(Check|Refresh) saved progress$/ })
      .click();
    await page.waitForFunction(
      (expected) =>
        [
          ...document.querySelectorAll(
            '[aria-label="Your investigation journey"] [role="status"]',
          ),
        ].some(
          (el) =>
            el.textContent ===
            `${expected} of 12 cases have a validated saved completion.`,
        ),
      count,
    );
  };
  await check(1);
  assert((await overview.innerText()).includes("Recommended next: M04"));
  assert.equal(await export01(), before);
  await overview.screenshot({
    path: "docs/verification/screens/22-journey-phone.png",
    animations: "disabled",
  });
  await overview
    .getByRole("button", { name: "Open M01 investigation", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Continue to M04 · The Forgotten Server",
      exact: true,
    })
    .click();
  const hunt = page.locator('[data-mission="M04"]');
  await hunt
    .getByRole("button", { name: "Begin proactive hunt", exact: true })
    .click();
  const saved04 = () =>
    hunt
      .getByRole("status")
      .filter({ hasText: "Saved on this device" })
      .waitFor({ timeout: 60000 });
  await saved04();
  await hunt
    .getByRole("navigation", { name: "M04 investigation", exact: true })
    .getByRole("button", { name: "Case File", exact: true })
    .click();
  await hunt
    .getByRole("button", { name: "Review finding", exact: true })
    .click();
  await hunt
    .getByRole("button", { name: "Confirm and close hunt", exact: true })
    .click();
  await saved04();
  const pending = page.waitForEvent("download");
  await hunt
    .getByRole("button", { name: "Export hunt save", exact: true })
    .click();
  const p1Server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  let score;
  try {
    const { importSave } = await p1Server.ssrLoadModule(
      "/src/campaign/format.ts",
    );
    const state = importSave(
      await readFile(await (await pending).path(), "utf8"),
    );
    score = state.debrief.quality.total;
    assert(score < 30);
  } finally {
    await p1Server.close();
  }
  await page.setViewportSize({ width: 834, height: 1112 });
  await hunt
    .getByRole("region", {
      name: "Continue your investigation journey",
      exact: true,
    })
    .screenshot({
      path: "docs/verification/screens/23-case-continuation-tablet.png",
      animations: "disabled",
    });
  await hunt
    .getByRole("button", {
      name: "Continue to M07 · The Missing Logs",
      exact: true,
    })
    .click();
  const next = page.locator('[data-mission="M07"]');
  await next
    .getByRole("button", { name: "Begin proactive hunt", exact: true })
    .waitFor();
  await next
    .getByRole("button", { name: "Threat Hunter · home", exact: true })
    .click();
  await check(2);
  assert((await overview.innerText()).includes("Recommended next: M07"));
  assert.equal(await export01(), before);
  const html = await readFile("dist/index.html", "utf8"),
    buildBundle = html.match(/src="([^"]+\.js)"/)[1];
  const report = {
    buildBundle,
    bundleSha256: createHash("sha256")
      .update(await readFile(`dist${buildBundle}`))
      .digest("hex"),
    browser: browser.version(),
    method:
      "Linux Chromium production preview, phone/tablet and reduced motion. Real closed-file import, read-only overview, M01→M04→M07 navigation, low-score UI closure and home return; exported M01 bytes equal before/after. Lab automation, not human/device review.",
    completionCounts: [1, 2],
    recommendations: ["M04", "M07"],
    lowScoreM04: score,
    existingM01SaveUnchanged: true,
    screenshots: ["22-journey-phone.png", "23-case-continuation-tablet.png"],
  };
  await writeFile(
    "docs/verification/journey.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
