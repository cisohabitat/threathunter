import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const origin = process.env.THREAT_HUNTER_TEST_URL ?? "http://127.0.0.1:4173";
async function row(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("threat-hunter-v1");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db
            .transaction("runs", "readonly")
            .objectStore("runs")
            .get("active");
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
}
if (process.argv[2] === "--child") {
  const context = await chromium.launchPersistentContext(process.argv[3], {
    headless: true,
  });
  const page = await context.newPage();
  await page.goto(origin);
  await page.getByText(/^Play settings ·/).click();
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await page
    .getByRole("button", { name: "Request verification · 1 step" })
    .click();
  await page
    .getByRole("button", { name: "Collect through step 1 · 1 step" })
    .first()
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Saved on this device" })
    .waitFor();
  const cdp = await context.browser().newBrowserCDPSession();
  const info = await cdp.send("SystemInfo.getProcessInfo");
  const browserPid = info.processInfo.find(
    (process) => process.type === "browser",
  ).id;
  process.send({ ready: true, row: await row(page), browserPid });
} else {
  if (process.platform !== "linux")
    throw Error(
      "This process-group crash verifier is for Linux; use the manual device protocol elsewhere.",
    );
  const profile = await mkdtemp(join(tmpdir(), "threat-hunter-crash-"));
  const child = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), "--child", profile],
    {
      detached: true,
      stdio: ["ignore", "ignore", "pipe", "ipc"],
      env: process.env,
    },
  );
  let errors = "";
  child.stderr.on("data", (chunk) => {
    errors += chunk.toString();
  });
  let context;
  try {
    const original = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            Error(
              "Crash child did not reach committed state: " +
                errors.slice(-1200),
            ),
          ),
        45000,
      );
      child.once("message", (message) => {
        clearTimeout(timer);
        resolve(message);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(
          Error(
            "Crash child exited before commit: " +
              code +
              " " +
              errors.slice(-1200),
          ),
        );
      });
    });
    const committed = original.row;
    assert(Number.isInteger(child.pid) && child.pid > 1);
    assert(
      Number.isInteger(original.browserPid) &&
        original.browserPid > 1 &&
        original.browserPid !== process.pid,
    );
    const stopped = new Promise((resolve) => child.once("exit", resolve));
    // Only the process group created by this test is killed. No shared browser,
    // current agent or real player profile is targeted.
    process.kill(original.browserPid, "SIGKILL");
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      /* Child may exit on browser disconnect. */
    }
    await stopped;
    context = await chromium.launchPersistentContext(profile, {
      headless: true,
    });
    const page = await context.newPage();
    await page.goto(origin);
    await page.getByRole("button", { name: "Resume investigation" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Saved on this device" })
      .waitFor();
    const restored = await row(page);
    assert.deepEqual(
      restored,
      committed,
      "Committed database row changed after an abrupt process kill.",
    );
    assert.equal(restored.current.snapshot.state.view.tick, 2);
    assert.equal(
      restored.current.snapshot.state.view.pendingChecks[0].dueTick,
      3,
    );
    await page
      .getByRole("navigation", { name: "Investigation", exact: true })
      .getByRole("button", { name: /Timeline/ })
      .click();
    await page.getByRole("button", { name: /Advance .*step/ }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Saved on this device" })
      .waitFor();
    const continued = await row(page);
    assert.equal(
      continued.current.snapshot.state.view.records.filter(
        (r) => r.ref.recordId === "EV-06",
      ).length,
      1,
    );
    assert.equal(continued.current.snapshot.state.view.tick, 3);
    const hash = (value) =>
      createHash("sha256").update(JSON.stringify(value)).digest("hex");
    await mkdir("docs/verification", { recursive: true });
    await writeFile(
      "docs/verification/crash-recovery.json",
      JSON.stringify(
        {
          method:
            "SIGKILL of the owned Chromium browser PID obtained through CDP, then the isolated verifier process group; persistent-profile relaunch",
          browser: context.browser()?.version(),
          committedRevision: committed.revision,
          restoredTick: 2,
          ownerDueTick: 3,
          ownerDeliveriesAfterAdvance: 1,
          beforeRowSha256: hash(committed),
          afterRowSha256: hash(restored),
          physicalDevice: false,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      "Abrupt browser process recovery passed; pending result delivered exactly once.",
    );
  } finally {
    if (context) await context.close();
    if (child.exitCode === null && child.signalCode === null) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        /* Already exited. */
      }
    }
    await rm(profile, { recursive: true, force: true });
  }
}
