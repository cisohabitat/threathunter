import { test, expect, type Page } from "@playwright/test";
async function startFixture(page: Page, world: "B" | "M") {
  await page.goto("/");
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  const input = page.locator("input[type=file]");
  await expect(input).toBeEnabled();
  // Resolve the existing versioned fixture through Vite, then exercise the real import UI.
  // The Node test runner does not load browser JSON modules directly.
  const save = await page.evaluate(async (world) => {
    const { createRun } = await import("/src/engine/engine.ts");
    const { exportSave } = await import("/src/persistence/saves.ts");
    return JSON.stringify(exportSave(createRun("browser-reference", world)));
  }, world);
  await input.setInputFiles({
    name: "case.json",
    mimeType: "application/json",
    buffer: Buffer.from(save),
  });
  await page.getByRole("button", { name: "Resume investigation" }).click();
  await expect(
    page.getByRole("heading", { name: "The Midnight Login", level: 1 }),
  ).toBeVisible();
}
async function collect(page: Page, label: string) {
  await page
    .locator(".question")
    .filter({ has: page.getByRole("heading", { name: label, exact: true }) })
    .getByRole("button")
    .click();
}
const investigate = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: new RegExp(name) })
    .click();
const stage = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Case File steps" })
    .getByRole("button", { name: new RegExp(name) })
    .click();
test("direct evidence actions and four reporting steps produce the reference explained finding", async ({
  page,
}) => {
  // This journey includes import, every report section, confirmation and reload.
  test.setTimeout(60_000);
  await startFixture(page, "B");
  const latest = page.locator(".latest-evidence");
  await latest
    .getByRole("button", { name: "Cite in finding · free", exact: true })
    .click();
  await latest.getByText("Note a limitation · free", { exact: true }).click();
  await latest
    .getByLabel("Add a limitation for this observation")
    .selectOption("anomaly_not_proof");
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
  await collect(page, "Compare sign-in history");
  await latest
    .getByRole("button", { name: "Cite in finding · free", exact: true })
    .click();
  await collect(page, "Check device registration");
  await latest
    .getByRole("button", { name: "Cite in finding · free", exact: true })
    .click();
  await latest
    .getByRole("button", {
      name: "Test another explanation · free",
      exact: true,
    })
    .click();
  await collect(page, "Check approved work");
  await latest
    .getByRole("button", { name: "Cite in finding · free", exact: true })
    .click();
  await investigate(page, "Case File");
  await page.getByRole("button", { name: /Approved work explains it/ }).click();
  await page.getByLabel("Confidence about this finding").selectOption("medium");
  await stage(page, "Evidence");
  await page
    .getByLabel("What happened to the other explanation?")
    .selectOption("misuse_weakened");
  await expect(
    page.getByRole("button", { name: "✓ Cited in finding", exact: true }),
  ).toHaveCount(4);
  await stage(page, "Unknowns");
  await expect(
    page.getByLabel("Evidence for: Unusual timing alone is not proof"),
  ).not.toHaveValue("");
  await stage(page, "Next step");
  await page
    .getByRole("combobox", { name: "Recommendation", exact: true })
    .selectOption("close_explained");
  await page
    .getByLabel("Optional notes · not graded")
    .fill("The finding applies to this session only.");
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("The finding applies to this session only."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cited observations (4)" }),
  ).toBeVisible();
  await expect(page.locator(".step-badge")).toContainText("STEP 3");
  await page.getByRole("button", { name: "Confirm and close case" }).click();
  await expect(
    page.getByText(
      "Your cited observations support this finding within the investigated session.",
    ),
  ).toBeVisible();
  await expect(page.locator(".score")).not.toBeVisible();
  await page
    .getByText(
      "Investigation quality · show score and evidence-linked feedback",
      { exact: true },
    )
    .click();
  await expect(page.locator(".score")).toContainText("100/100");
  await expect(
    page
      .locator(".score-breakdown")
      .getByText(
        "You cited both the unfamiliar session and the account’s normal sign-in pattern.",
      ),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Resume investigation" }).click();
  await expect(
    page.getByText("The finding applies to this session only."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("activity refresh retains the earlier snapshot and debrief hides later observations at earlier steps", async ({
  page,
}) => {
  await startFixture(page, "M");
  const latest = page.locator(".latest-evidence");
  await latest
    .getByRole("button", { name: "Cite in finding · free", exact: true })
    .click();
  await collect(page, "Follow session activity");
  const empty =
    "No matching follow-on activity is recorded through this query cutoff; later activity is not covered.";
  await expect(latest.getByText(empty, { exact: true })).toBeVisible();
  await investigate(page, "Timeline");
  await page.getByRole("button", { name: "Advance selected steps" }).click();
  await investigate(page, "Explore");
  await collect(page, "Follow session activity");
  const activity =
    "The session attempted to access sensitive reports outside this user role and its ordinary workflow.";
  await expect(latest.getByText(activity, { exact: true })).toBeVisible();
  await latest
    .getByRole("button", { name: "Cite in finding · free", exact: true })
    .click();
  await latest.getByText("Earlier observations (2)", { exact: true }).click();
  await expect(latest.getByText(empty, { exact: true })).toBeVisible();
  await expect(page.locator(".step-badge")).toContainText("STEP 3");
  await investigate(page, "Case File");
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Confirm and close case" }).click();
  const known = page
    .getByRole("heading", { name: "Known at your decision", exact: true })
    .locator("..");
  await expect(known.getByText(activity, { exact: true })).toBeVisible();
  await page.getByLabel("What I knew then").selectOption("1");
  await expect(known.getByText(activity, { exact: true })).toHaveCount(0);
  await expect(known.getByText(empty, { exact: true })).toBeVisible();
  await page.getByLabel("What I knew then").selectOption("3");
  await expect(known.getByText(activity, { exact: true })).toBeVisible();
});
