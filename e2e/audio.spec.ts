import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("optional full voice pack plays offline, can be skipped/muted and never changes the save", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/audio/m01/")) requests.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
  const beforeDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export save" }).click();
  const before = await beforeDownload;
  const original = await readFile((await before.path())!, "utf8");
  await page
    .getByRole("button", { name: "Voice & sound", exact: true })
    .click();
  await expect(
    page.getByText("Play muted · voice available", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(0);
  await expect(page.locator('select option[value="morgan-6"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Enable voice and sound" }).click();
  await expect(
    page.getByText("Voice pack ready · enabled", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  expect(new Set(requests).size).toBe(21);
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Play briefing", exact: true })
    .click();
  await expect(page.locator(".voice-caption")).toContainText(
    "A finance session began at an unusual hour",
  );
  await page.getByRole("button", { name: "Skip speech", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Skip speech", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Screen-reader-friendly audio · on-demand speech only")
    .check();
  await page
    .getByRole("combobox", { name: "Morgan guidance", exact: true })
    .selectOption("morgan-4");
  await page
    .getByRole("button", { name: "Play guidance", exact: true })
    .click();
  await expect(page.locator(".voice-caption")).toContainText(
    "A source can have missing collection.",
  );
  await page.getByRole("button", { name: "Mute all", exact: true }).click();
  await expect(
    page.getByText("Voice pack ready · muted", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Skip speech", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Show voice captions").uncheck();
  await expect(page.locator(".voice-caption")).toHaveCount(0);
  await page
    .getByText("Selected narration · text transcript", { exact: true })
    .click();
  await expect(page.locator(".voice-transcript")).toContainText(
    "A source can have missing collection.",
  );
  const afterDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export save" }).click();
  const after = await afterDownload;
  expect(await readFile((await after.path())!, "utf8")).toBe(original);
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
  expect(new Set(requests).size).toBe(21);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("failed audio loading leaves text investigation and saving available", async ({
  page,
}) => {
  await page.route("**/audio/m01/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await page
    .getByRole("button", { name: "Voice & sound", exact: true })
    .click();
  await page.getByRole("button", { name: "Enable voice and sound" }).click();
  await expect(
    page.getByText("Audio unavailable · text ready", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voice & sound", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Compare usual sign-ins · 1 step →",
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "How does this compare?" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
});

test("foreground replacement, orientation and backgrounding never replay stale speech or advance the case", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.getByText(/^Play settings ·/).click();
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await page
    .getByRole("button", { name: "Voice & sound", exact: true })
    .click();
  await page.getByRole("button", { name: "Enable voice and sound" }).click();
  await expect(
    page.getByText("Voice pack ready · enabled", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Play briefing", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Morgan guidance", exact: true })
    .selectOption("morgan-3");
  await page
    .getByRole("button", { name: "Play guidance", exact: true })
    .click();
  await expect(page.locator(".voice-caption")).toContainText(
    "Attach the observation",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".voice-caption")).toContainText(
    "Attach the observation",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Skip speech", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Skip speech", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Play guidance", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Explore/ })
    .click();
  await expect(page.locator(".voice-caption")).toHaveCount(0);
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
});
