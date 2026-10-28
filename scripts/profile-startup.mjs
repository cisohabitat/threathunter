import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

// Diagnostic evidence, not a timing assertion or a physical-device acceptance.
const origin = process.env.THREAT_HUNTER_TEST_URL ?? "http://127.0.0.1:4173";
const output =
  process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
  "docs/verification/startup-profile.json";
const html = await readFile("dist/index.html", "utf8");
const entry = html.match(/<script[^>]+src="([^"]+)"/)[1];
const manifest = JSON.parse(await readFile("dist/.vite/manifest.json", "utf8"));
const toolingReaderPath = "/" + manifest["src/persistence/format.ts"].file;
const toolingReaderPaths = [
  "src/persistence/format.ts",
  "src/campaign/format.ts",
  "src/expansion/format.ts",
].map((key) => "/" + manifest[key].file);
const browser = await chromium.launch();
const runs = [];
try {
  for (let sample = 0; sample < 3; sample++) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.startupTasks = [];
        new PerformanceObserver((list) => {
          window.startupTasks.push(
            ...list.getEntries().map((e) => ({
              startMs: e.startTime,
              durationMs: e.duration,
            })),
          );
        }).observe({ type: "longtask", buffered: true });
      });
      const client = await context.newCDPSession(page);
      await client.send("Network.enable");
      await client.send("Network.setCacheDisabled", { cacheDisabled: true });
      await client.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 100,
        downloadThroughput: 500_000,
        uploadThroughput: 125_000,
      });
      await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const encodings = {};
      client.on("Network.responseReceived", ({ response }) => {
        encodings[new URL(response.url).pathname] =
          response.headers["Content-Encoding"] ??
          response.headers["content-encoding"] ??
          "identity";
      });
      const response = await page.goto(origin);
      assert(response?.ok(), "Preview navigation failed");
      assert.equal(
        await response.text(),
        html,
        "Served HTML differs from dist",
      );
      await page.waitForFunction(() => {
        const button = [...document.querySelectorAll("button")].find((b) =>
          b.textContent.includes("Begin investigation"),
        );
        const art = document.querySelector(".hero-art");
        return (
          button && !button.disabled && art?.complete && art.naturalWidth > 0
        );
      });
      runs.push(
        await page.evaluate(() => ({
          readyMs: performance.now(),
          longTasks: window.startupTasks,
          resources: performance.getEntriesByType("resource").map((e) => ({
            path: new URL(e.name).pathname,
            startMs: e.startTime,
            responseEndMs: e.responseEnd,
            transferBytes: e.transferSize,
            encodedBytes: e.encodedBodySize,
            decodedBytes: e.decodedBodySize,
          })),
        })),
      );
      runs.at(-1).contentEncodings = encodings;
      assert(
        !runs
          .at(-1)
          .resources.some((resource) =>
            toolingReaderPaths.includes(resource.path),
          ),
        "The browser fetched the tooling-only save reader during cold readiness",
      );
      console.log(
        `Cold sample ${sample + 1}: ${Math.round(runs.at(-1).readyMs)} ms`,
      );
    } finally {
      await context.close();
    }
  }
  await writeFile(
    output,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        origin,
        buildBundle: entry,
        htmlSha256: createHash("sha256").update(html).digest("hex"),
        bundleSha256: createHash("sha256")
          .update(await readFile("dist" + entry))
          .digest("hex"),
        browser: browser.version(),
        toolingReaderPath,
        toolingReaderPaths,
        toolingReaderFetchedDuringColdReadiness: false,
        method:
          "Three sequential fresh browser contexts; cache disabled; 390x844; 4 Mbps down / 1 Mbps up / 100 ms RTT; 4x CPU throughout. Readiness requires enabled Begin and decoded art. ResourceTiming and Long Tasks observation enabled; no CPU profiler. Every sample retained.",
        runs,
        limits:
          "Shared Linux host and Chromium emulation, not a reference phone. Worker ResourceTiming may contain inconsistent start/end timestamps; retain raw values, do not subtract them as execution time. Server compression is observed, not assumed. No human/device acceptance implied.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
