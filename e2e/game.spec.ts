import { test, expect } from "@playwright/test";
test("complete a case, resume an immutable save, and continue offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Something/ })).toBeVisible();
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
