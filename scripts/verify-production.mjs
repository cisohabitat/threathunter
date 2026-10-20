import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const browser = await chromium.launch();
const capture = (target, options) =>
  process.argv.includes("--no-screens")
    ? Promise.resolve()
    : target.screenshot({ ...options, animations: "disabled", timeout: 60000 });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 100,
    downloadThroughput: 4_000_000 / 8,
    uploadThroughput: 1_000_000 / 8,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const origin = process.env.THREAT_HUNTER_TEST_URL ?? "http://127.0.0.1:4173";
  const started = Date.now();
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Begin investigation" })
    .waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("Begin investigation"),
      )?.disabled && document.querySelector(".hero-art")?.complete,
  );
  const readyMs = Date.now() - started;
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await mkdir("docs/verification/screens", { recursive: true });
  await capture(page, {
    path: "docs/verification/screens/01-home-phone.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Saved on this device" })
    .waitFor();
  await capture(page, {
    path: "docs/verification/screens/02-leads-phone.png",
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Explore/ })
    .click();
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Saved on this device" })
    .waitFor();
  await capture(page, {
    path: "docs/verification/screens/03-evidence-phone.png",
    fullPage: true,
  });
  const navigation = page.getByRole("navigation", {
    name: "Investigation",
    exact: true,
  });
  await navigation.getByRole("button", { name: /Case File/ }).click();
  await capture(page, {
    path: "docs/verification/screens/04-case-file-phone.png",
    fullPage: true,
  });
  const acknowledgeMs = await page.evaluate(async () => {
    const values = [];
    for (let i = 0; i < 100; i++) {
      const button = Array.from(document.querySelectorAll("button")).find((b) =>
        ["Hide guidance", "How to play"].includes(b.textContent.trim()),
      );
      const start = performance.now();
      button.click();
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      values.push(performance.now() - start);
    }
    return values;
  });
  const commitMs = [];
  for (let i = 0; i < 10; i++) {
    const t = performance.now();
    await page
      .getByRole("button", {
        name: i % 2 === 0 ? /^Credible explanation/ : /^Likely session misuse/,
      })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Saved on this device" })
      .waitFor();
    commitMs.push(performance.now() - t);
  }
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .last()
    .click();
  await capture(page, {
    path: "docs/verification/screens/05-review-phone.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Confirm and close case" }).click();
  await page.getByRole("heading", { name: "After your handoff" }).waitFor();
  await capture(page, {
    path: "docs/verification/screens/06-debrief-phone.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await capture(page, {
    path: "docs/verification/screens/07-debrief-tablet-landscape.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture(page, {
    path: "docs/verification/screens/08-debrief-tablet-portrait.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Threat Hunter Silent Intrusion home" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, {
    path: "docs/verification/screens/09-home-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Voice & sound", exact: true })
    .click();
  await page.getByRole("button", { name: "Enable voice and sound" }).click();
  await page.getByText("Voice pack ready · enabled", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Play briefing", exact: true })
    .click();
  await capture(page, {
    path: "docs/verification/screens/10-voice-enabled-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Mute all", exact: true }).click();
  const html = await readFile("dist/index.html", "utf8");
  const entry = html.match(/<script[^>]+src="([^"]+)"/)[1];
  const p95 = (values) =>
    [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
  await writeFile(
    "docs/verification/performance.json",
    JSON.stringify(
      {
        buildBundle: entry,
        bundleSha256: createHash("sha256")
          .update(await readFile("dist" + entry))
          .digest("hex"),
        browser: browser.version(),
        profile: {
          network: "4 Mbps down / 1 Mbps up / 100 ms RTT",
          cpu: "4x Chromium emulation during cold load",
          viewport: "390x844",
        },
        coldCaseReadyMs: readyMs,
        interactions: {
          samples: 100,
          method:
            "Synthetic click to two animation frames, healthy local browser after load; includes frame wait",
          p95Ms: p95(acknowledgeMs),
        },
        durableCommands: {
          samples: 10,
          method:
            "Playwright click to Saved label after IndexedDB transaction, healthy local storage; includes automation overhead",
          p95Ms: p95(commitMs),
        },
        limits:
          "Linux Chromium lab measurement only. No reference physical phone or iPad; not a physical-device acceptance result. Long-task and actual touchscreen latency require device profiling.",
      },
      null,
      2,
    ) + "\n",
  );
  const errorContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await errorContext.addInitScript(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException(
        "Injected storage failure for review frame",
        "QuotaExceededError",
      );
    };
  });
  const errorPage = await errorContext.newPage();
  await errorPage.goto(origin);
  await errorPage.getByRole("button", { name: "Begin investigation" }).click();
  await errorPage
    .getByRole("status")
    .filter({ hasText: "Not saved" })
    .waitFor();
  await capture(errorPage, {
    path: "docs/verification/screens/11-storage-error-injected-phone.png",
    fullPage: true,
  });
  await errorContext.close();
} finally {
  await browser.close();
}
