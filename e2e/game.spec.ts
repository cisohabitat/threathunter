import { test, expect } from "@playwright/test";
test("complete a case, resume an immutable save, and continue offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Something/ })).toBeVisible();
  await page.getByText(/^Play settings ·/).click();
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(
    page.getByRole("heading", { name: "The Midnight Login", level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  await page.reload();
  await page.getByRole("button", { name: "Resume investigation" }).click();
  await expect(
    page.getByText(
      "Collected sign-ins over the previous 14 days normally used daytime hours and a registered client.",
    ),
  ).toBeVisible();
  await context.setOffline(true);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Explore/ })
    .click();
  await page
    .getByRole("button", { name: "Collect through step 1 · 1 step" })
    .first()
    .click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Case File/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Which explanation fits?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "What can you defend?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm and close case" }).click();
  await expect(
    page.getByRole("heading", { name: "After your handoff" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("reading, navigating and mentor guidance do not advance time", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText(/^Play settings ·/).click();
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(
    page.getByRole("heading", { name: "The Midnight Login", level: 1 }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Timeline/ })
    .click();
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Leads/ })
    .click();
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
});
test("320px has no horizontal overflow and all destinations remain operable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByText(/^Play settings ·/).click();
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  for (const name of ["Explore", "Case File", "Timeline", "Leads"]) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name: new RegExp(name) })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("the guided case offers a focused question and optional tools", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin investigation" }).click();
  const guide = page.getByRole("region", {
    name: "Guided investigation",
    exact: true,
  });
  await expect(
    guide.getByRole("heading", {
      name: "A login at 02:13. Should we worry?",
    }),
  ).toBeVisible();
  await guide
    .getByRole("button", {
      name: "Compare usual sign-ins · 1 step →",
    })
    .click();
  await expect(
    guide.getByRole("heading", { name: "How does this compare?" }),
  ).toBeFocused();
  await expect(page.locator(".step-badge")).toContainText("STEP 1");
  await guide
    .getByRole("button", { name: "Choose what to check next →" })
    .click();
  await expect(
    guide.getByRole("button", {
      name: "Was overnight work approved? · 1 step",
    }),
  ).toBeVisible();
  await expect(
    guide.getByRole("button", {
      name: "Is this a known work computer? · 1 step",
    }),
  ).toBeVisible();
  await expect(page.locator(".step-badge")).toContainText("STEP 1");
});

test("guidance can be hidden, restored and remembered without advancing time", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await page
    .getByText("Investigate further · all tools and settings", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Switch to independent investigation" })
    .click();
  await expect(
    page.getByRole("region", { name: "Guided investigation", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
  await page.reload();
  await page.getByText(/^Play settings ·/).click();
  await expect(
    page.getByRole("button", { name: /Independent investigation/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Resume investigation" }).click();
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(
    page.getByRole("region", { name: "Guided investigation", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
});

test("play settings stay open when the saved case finishes loading", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device", { timeout: 30000 });
  // Hold the validator so the settings open before the saved case loads.
  await page.route(/validationWorker/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.continue();
  });
  await page.reload();
  await page.getByText(/^Play settings ·/).click();
  const settings = page.locator(".play-settings");
  await expect(settings).toHaveAttribute("open", "");
  await expect(
    page.getByRole("button", { name: /^Resume investigation/ }),
  ).toBeVisible({ timeout: 30000 });
  await expect(settings).toHaveAttribute("open", "");
  await expect(
    page.getByRole("button", { name: /Independent investigation/ }),
  ).toBeVisible();
});
