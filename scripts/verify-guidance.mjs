import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const browser = await chromium.launch();
const missions = [];
try {
  for (const mission of ["M04", "M07"]) {
    const page = await browser.newPage({
      viewport:
        mission === "M04"
          ? { width: 390, height: 844 }
          : { width: 834, height: 1112 },
      reducedMotion: "reduce",
    });
    await page.goto(
      process.env.THREAT_HUNTER_TEST_URL ?? "http://127.0.0.1:4173",
    );
    await page
      .getByRole("button", { name: new RegExp(`${mission} ·`) })
      .click({ timeout: 30000 });
    const area = page.locator(`[data-mission="${mission}"]`);
    await area
      .getByRole("button", { name: "Begin proactive hunt", exact: true })
      .click({ timeout: 30000 });
    await area
      .getByRole("status")
      .filter({ hasText: "Saved on this device" })
      .waitFor({ timeout: 60000 });
    const portable = async () => {
      const pending = page.waitForEvent("download");
      await area
        .getByRole("button", { name: "Export hunt save", exact: true })
        .click();
      return readFile(await (await pending).path(), "utf8");
    };
    const before = await portable();
    const help = area.getByRole("region", {
      name: `${mission} investigation help`,
    });
    await help
      .getByRole("button", { name: "Ask for a nudge", exact: true })
      .click();
    await help
      .getByRole("button", { name: "Suggest a source", exact: true })
      .click();
    await help.getByRole("button", { name: "Show me", exact: true }).click();
    const anchor = `${mission}-help-${mission === "M04" ? "account_hosts" : "coverage"}`;
    assert.equal(await page.evaluate(() => document.activeElement.id), anchor);
    await help.screenshot({
      path: `docs/verification/screens/${mission === "M04" ? "20-m04-guidance-phone" : "21-m07-guidance-tablet"}.png`,
      animations: "disabled",
    });
    await area
      .getByText("Field guide · words, scope and authority", { exact: true })
      .click();
    await area
      .getByRole("button", { name: "Voice & sound", exact: true })
      .click();
    await area
      .getByRole("button", { name: "Enable voice and sound", exact: true })
      .click();
    await area.getByText(/Voice pack ready/).waitFor({ timeout: 60000 });
    await page.context().setOffline(true);
    await help
      .getByRole("button", { name: "Listen to this nudge", exact: true })
      .click();
    await area
      .getByText("Selected narration · text transcript", { exact: true })
      .waitFor();
    const transcript = await area.locator(".guide-tip").innerText();
    const spokenText = (element) =>
      [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join("")
        .trim();
    assert.equal(
      await area.locator(".voice-transcript p").evaluate(spokenText),
      await area.locator(".guide-tip").evaluate(spokenText),
    );
    assert.equal(await portable(), before);
    await help
      .getByText("Assistance used · 3 requests this session", { exact: true })
      .click();
    const pending = page.waitForEvent("download");
    await help
      .getByRole("button", { name: "Export assistance record", exact: true })
      .click();
    const assistance = JSON.parse(
      await readFile(await (await pending).path(), "utf8"),
    );
    assert.equal(assistance.totalRequests, 3);
    assert.deepEqual(
      assistance.requests.map((r) => r.level),
      [1, 2, 3],
    );
    assert(assistance.requests.every((r) => r.step === 0));
    assert.equal(await portable(), before);
    missions.push({
      mission,
      levels: [1, 2, 3],
      focusedAnchor: anchor,
      saveUnchanged: true,
      offlineNudge: true,
      transcript,
      assistanceRequests: assistance.totalRequests,
    });
    await page.close();
  }
  const html = await readFile("dist/index.html", "utf8"),
    buildBundle = html.match(/src="([^"]+\.js)"/)[1];
  const result = {
    buildBundle,
    bundleSha256: createHash("sha256")
      .update(await readFile(`dist${buildBundle}`))
      .digest("hex"),
    browser: browser.version(),
    method:
      "Linux Chromium production preview, phone/tablet viewports, reduced motion. Real help/focus, separate export, field-guide reading and opted-in offline nudge; complete portable bytes identical before/after. No physical-device or human review claim.",
    missions,
  };
  await writeFile(
    "docs/verification/guidance.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
