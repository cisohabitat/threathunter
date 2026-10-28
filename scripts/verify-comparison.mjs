import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
const fixtures = {};
try {
  for (const mission of ["M01", "M04", "M07"]) {
    const e = await server.ssrLoadModule(
      mission === "M01" ? "/src/engine/engine.ts" : "/src/campaign/engine.ts",
    );
    const f = await server.ssrLoadModule(
      mission === "M01"
        ? "/src/persistence/format.ts"
        : "/src/campaign/format.ts",
    );
    let s =
      mission === "M01"
        ? e.createRun("comparison-production", "M")
        : e.createRun(mission, "comparison-production-" + mission, "U-M");
    const act = (action) => {
      const r = e.processCommand(s, {
        ...action,
        commandId: `c${s.view.revision}`,
        expectedRevision: s.view.revision,
        runId: s.view.runId,
      });
      assert.equal(r.receipt.status, "accepted", r.receipt.error);
      s = r.state;
    };
    for (const queryId of mission === "M01"
      ? ["Q-F", "Q-H", "Q-F"]
      : mission === "M04"
        ? ["account_hosts", "dependency"]
        : ["coverage", "health"]) {
      if (queryId === "dependency")
        act({ kind: "SCOPE", targetId: "LEGACY-01" });
      act({ kind: "ACQUIRE", queryId, cutoffTick: s.view.tick });
    }
    fixtures[mission] = JSON.stringify(f.exportSave(s));
  }
} finally {
  await server.close();
}
const browser = await chromium.launch();
const results = [];
try {
  for (const mission of ["M01", "M04", "M07"]) {
    const context = await browser.newContext({
      viewport: { width: 320, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(
      process.env.THREAT_HUNTER_TEST_URL ?? "http://127.0.0.1:4173",
    );
    let area = page;
    if (mission !== "M01") {
      await page
        .getByRole("button", { name: new RegExp(`${mission} ·`) })
        .click();
      area = page.locator(`[data-mission="${mission}"]`);
    }
    const input = area.locator('input[type="file"]').first();
    await expect(input).toBeEnabled({ timeout: 30000 });
    await input.setInputFiles({
      name: "comparison.json",
      mimeType: "application/json",
      buffer: Buffer.from(fixtures[mission]),
    });
    await expect(
      area.getByRole("status").filter({ hasText: "Saved on this device" }),
    ).toBeVisible({ timeout: 60000 });
    const portable = async () => {
      const pending = page.waitForEvent("download");
      await area
        .getByRole("button", {
          name: mission === "M01" ? "Export save" : "Export save",
          exact: true,
        })
        .click();
      return readFile(await (await pending).path(), "utf8");
    };
    const before = await portable();
    if (mission === "M01")
      await page.getByRole("button", { name: /^Resume investigation/ }).click();
    const panel = area.getByRole("region", {
      name: "Compare acquired observations",
      exact: true,
    });
    await panel
      .getByRole("button", {
        name: "Compare acquired observations · free",
        exact: true,
      })
      .click();
    const first = panel.getByRole("combobox", {
        name: "First observation",
        exact: true,
      }),
      second = panel.getByRole("combobox", {
        name: "Second observation",
        exact: true,
      });
    await first.selectOption({ index: 2 });
    await second.selectOption({ index: 3 });
    const original = await panel
      .getByRole("article", { name: "First compared observation", exact: true })
      .innerText();
    await second.selectOption({ index: 1 });
    assert.equal(
      await panel
        .getByRole("article", {
          name: "First compared observation",
          exact: true,
        })
        .innerText(),
      original,
    );
    await expect(panel).toContainText("Snapshot cutoff");
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    const axe = await new AxeBuilder({ page })
      .include(".comparison")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    assert.deepEqual(axe.violations, []);
    assert.equal(await portable(), before);
    results.push({
      mission,
      portableSaveSha256: hash(before),
      comparisonLeavesPortableBytesUnchanged: true,
      firstSnapshotPreserved: true,
      reflow320: true,
      sampledAxeViolations: 0,
    });
    await context.close();
  }
  const html = await readFile("dist/index.html", "utf8"),
    entry = html.match(/src="([^"]+\.js)"/)[1];
  const report = {
    date: "2026-10-20",
    method:
      "Chromium production preview; real portable imports/exports, two native selectors, immutable first snapshot, 320px reflow and sampled axe comparison region. Automated lab only; no physical-device or human acceptance.",
    entry,
    entrySha256: hash(await readFile("dist" + entry)),
    results,
  };
  await writeFile(
    "docs/verification/comparison.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
