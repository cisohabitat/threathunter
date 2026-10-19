import { test, expect } from "@playwright/test";
test("complete a case, resume an immutable save, and continue offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Something/ })).toBeVisible();
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(
    page.getByRole("heading", { name: "Start with a question." }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
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
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Case File/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Build a defensible finding." }),
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
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(
    page.getByRole("heading", { name: "Start with a question." }),
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

test("guided first investigation explains, compares, cites for free and offers a choice", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Guided investigation/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Begin investigation" }).click();
  const guide = page.getByRole("region", { name: "Guided investigation" });
  await expect(
    guide.getByRole("heading", {
      name: "You’re the investigator. Start with the unusual login.",
    }),
  ).toBeVisible();
  await guide
    .getByRole("button", { name: "Compare sign-ins · 1 step →" })
    .click();
  await expect(
    guide.getByRole("heading", { name: "Now compare unusual with usual." }),
  ).toBeVisible();
  await expect(page.locator(".step-badge")).toContainText("STEP 1");
  await guide
    .getByRole("button", { name: "Add these observations to Case File · free" })
    .click();
  await expect(
    guide.getByRole("heading", { name: "What could explain this login?" }),
  ).toBeVisible();
  await expect(page.locator(".step-badge")).toContainText("STEP 1");
  await guide
    .getByRole("button", { name: "Check approved work · 1 step" })
    .click();
  await expect(
    guide.getByRole("heading", {
      name: "Read what you found. Decide what to check next.",
    }),
  ).toBeVisible();
  await guide.getByRole("button", { name: "Build my finding →" }).click();
  await expect(
    guide.getByRole("heading", { name: "Tell the story in four parts." }),
  ).toBeVisible();
  const evidence = page.getByRole("group", {
    name: "02 · Supporting and opposing facts",
  });
  await expect(evidence.getByRole("checkbox").nth(0)).toBeChecked();
  await expect(evidence.getByRole("checkbox").nth(1)).toBeChecked();
  await expect(page.locator(".step-badge")).toContainText("STEP 2");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("guidance can be hidden, restored and remembered without advancing time", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await page.getByRole("button", { name: "Hide guidance" }).click();
  await expect(
    page.getByRole("region", { name: "Guided investigation" }),
  ).toHaveCount(0);
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Independent investigation/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Resume investigation" }).click();
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(
    page.getByRole("region", { name: "Guided investigation" }),
  ).toBeVisible();
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
});
