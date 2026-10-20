import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
test.use({ reducedMotion: "reduce", actionTimeout: 15000 });
test.setTimeout(90000);
const saved = (page: Page) =>
  expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device", { timeout: 30000 });
async function onScreen(button: Locator, height: number) {
  await expect(button).toBeEnabled({ timeout: 30000 });
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(height);
  expect(
    await button.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return [
        [rect.left + 4, rect.top + 4],
        [rect.right - 4, rect.bottom - 4],
      ].every(([x, y]) => element.contains(document.elementFromPoint(x, y)));
    }),
  ).toBe(true);
}
for (const [width, height] of [
  [320, 740],
  [390, 844],
]) {
  test(`first useful actions are visible without scrolling at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const begin = page.getByRole("button", { name: /^Begin investigation/ });
    await onScreen(begin, height);
    await expect(
      page.getByText("Read a record → Check an explanation → Make your call", {
        exact: true,
      }),
    ).toBeVisible();
    await begin.click();
    await saved(page);
    const guide = page.getByRole("region", {
      name: "Guided investigation",
      exact: true,
    });
    await onScreen(
      guide.getByRole("button", {
        name: "Compare sign-ins · 1 step →",
        exact: true,
      }),
      height,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
test("a new player follows the visible next moves through a saved finding without the glossary", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: /^Begin investigation/ }).click();
  await saved(page);
  const guide = page.getByRole("region", {
    name: "Guided investigation",
    exact: true,
  });
  await guide
    .getByRole("button", { name: "Compare sign-ins · 1 step →", exact: true })
    .click();
  await guide
    .getByRole("button", {
      name: "Add these observations to Case File · free",
      exact: true,
    })
    .click();
  await saved(page);
  await expect(page.locator(".step-badge")).toContainText("STEP 1");
  await guide
    .getByRole("button", { name: "Check approved work · 1 step", exact: true })
    .click();
  await expect(
    guide.getByRole("heading", {
      name: "Here is what your check found.",
      exact: true,
    }),
  ).toBeFocused();
  await guide
    .getByRole("button", {
      name: "Add this observation to Case File · free",
      exact: true,
    })
    .click();
  await saved(page);
  await expect(
    guide.getByRole("heading", {
      name: "What do you think happened?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".step-badge")).toContainText("STEP 2");
  await guide
    .getByRole("button", { name: "Build my finding →", exact: true })
    .click();
  await expect(page.locator(".case-editor > h2")).toBeFocused();
  await onScreen(
    page.getByRole("button", { name: /Approved work explains it/ }),
    page.viewportSize()!.height,
  );
  await page.getByRole("button", { name: /I can’t tell yet/ }).click();
  await saved(page);
  await page
    .getByRole("combobox", {
      name: "Confidence about this finding",
      exact: true,
    })
    .selectOption("low");
  await saved(page);
  await page
    .getByRole("button", { name: "Next: Evidence →", exact: true })
    .click();
  await page
    .getByRole("combobox", {
      name: "What happened to the other explanation?",
      exact: true,
    })
    .selectOption("approved_work_unresolved");
  await saved(page);
  await page
    .getByRole("article", { name: /^Approved work · through step/ })
    .getByRole("button", {
      name: "Test another explanation · free",
      exact: true,
    })
    .click();
  await saved(page);
  await page
    .getByRole("button", { name: "Next: Unknowns →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Next: Next step →", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Recommendation", exact: true })
    .selectOption("handoff_review_monitor");
  await saved(page);
  await page
    .locator(".case-step-actions")
    .getByRole("button", { name: "Review finding →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm and close case", exact: true })
    .click();
  await saved(page);
  await expect(
    page.getByRole("region", { name: "Case debrief", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export save", exact: true }).click();
  const portable = JSON.parse(
    await readFile(await (await download).path(), "utf8"),
  );
  expect(
    portable.commands.filter(
      (command: { kind: string }) => command.kind === "ACQUIRE",
    ),
  ).toHaveLength(2);
  const close = portable.commands.at(-1);
  expect(close.kind).toBe("CLOSE_CASE");
  expect(close.draft.evidence).toHaveLength(3);
  expect(close.draft.disposition).toBe("unresolved");
  expect(close.draft.alternativeEvidence).toHaveLength(1);
  expect(errors).toEqual([]);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
for (const path of ["/case/m04", "/case/m02", "/hunt/free"]) {
  test(`${path} offers a first-case learning path before starting`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(
      page.getByRole("complementary", { name: "How to play", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "New here? Learn with The Midnight Login →",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/case\/m01$/);
    await expect(
      page.getByRole("button", { name: /^Begin investigation/ }),
    ).toBeEnabled({ timeout: 30000 });
  });
}
