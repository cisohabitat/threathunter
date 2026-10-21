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
const nextCheck = (page: Page) =>
  page
    .getByRole("button", { name: "Choose what to check next →", exact: true })
    .click();
const compare = (page: Page) =>
  page
    .getByRole("button", {
      name: "Compare usual sign-ins · 1 step →",
      exact: true,
    })
    .click();
async function portable(page: Page) {
  await saved(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export save", exact: true }).click();
  return JSON.parse(await readFile(await (await download).path(), "utf8"));
}
async function fixture(page: Page, world: "B" | "M" | "U-B" | "U-M") {
  await page.goto("/");
  const save = await page.evaluate(async (world) => {
    const { createRun } = await import("/src/engine/engine.ts");
    const { exportSave } = await import("/src/persistence/saves.ts");
    return JSON.stringify(exportSave(createRun("guided-reference", world)));
  }, world);
  await expect(page.locator("input[type=file]")).toBeEnabled();
  await page.locator("input[type=file]").setInputFiles({
    name: "case.json",
    mimeType: "application/json",
    buffer: Buffer.from(save),
  });
  await page.getByRole("button", { name: "Resume investigation" }).click();
  await saved(page);
}
async function onScreen(button: Locator, height: number) {
  await expect(button).toBeEnabled({ timeout: 30000 });
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(height);
  expect(
    await button.evaluate((element) => {
      const r = element.getBoundingClientRect();
      return [
        [r.left + 4, r.top + 4],
        [r.right - 4, r.bottom - 4],
      ].every(([x, y]) => element.contains(document.elementFromPoint(x, y)));
    }),
  ).toBe(true);
}
for (const [width, height] of [
  [320, 740],
  [390, 844],
]) {
  test(`first useful actions are visible and uncovered without scrolling at ${width}px`, async ({
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
    await onScreen(
      page.getByRole("button", {
        name: "Compare usual sign-ins · 1 step →",
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
test("the 320px opening stays uncovered with wider fallback fonts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.addStyleTag({
    content:
      'html, body { font-family: "DejaVu Sans", sans-serif; } .guided-case h1 { font-family: "DejaVu Serif", serif; }',
  });
  const begin = page.getByRole("button", { name: /^Begin investigation/ });
  await onScreen(begin, 740);
  await begin.click();
  await saved(page);
  await onScreen(
    page.getByRole("button", {
      name: "Compare usual sign-ins · 1 step →",
      exact: true,
    }),
    740,
  );
});
test("notebook reading, cached results and incomplete review do not cite facts or advance time", async ({
  page,
}) => {
  await fixture(page, "B");
  await compare(page);
  await nextCheck(page);
  await page
    .getByRole("button", {
      name: "Was overnight work approved? · 1 step",
      exact: true,
    })
    .click();
  await saved(page);
  const before = await portable(page);
  expect(
    before.commands.filter((c: { kind: string }) => c.kind === "ACQUIRE"),
  ).toHaveLength(2);
  expect(
    before.commands.some((c: { kind: string }) => c.kind === "EDIT_CASE"),
  ).toBe(false);
  await nextCheck(page);
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Was overnight work approved?",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Read this result · free", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .click();
  await expect(
    page.getByText(
      "No supporting facts selected. You can still submit and learn from the debrief.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep investigating", exact: true })
    .click();
  await page.getByText(/^Your notebook ·/).click();
  await expect(
    page.getByRole("article", {
      name: "The unfamiliar login · through step 0",
      exact: true,
    }),
  ).toBeVisible();
  const after = await portable(page);
  expect(after).toEqual(before);
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm and close case", exact: true })
    .click();
  await saved(page);
  expect((await portable(page)).commands.at(-1).draft.evidence).toEqual([]);
});
test("a beginner can build, edit, review, save and resume the complete explained finding", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await fixture(page, "B");
  await compare(page);
  await nextCheck(page);
  await page
    .getByRole("button", {
      name: "Is this a known work computer? · 1 step",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "This weakens unauthorised use", exact: true })
    .click();
  await saved(page);
  await nextCheck(page);
  await page
    .getByRole("button", {
      name: "Was overnight work approved? · 1 step",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Make my call →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "What do you think happened?",
      exact: true,
    }),
  ).toBeFocused();
  const headingBox = await page
    .getByRole("heading", { name: "What do you think happened?", exact: true })
    .boundingBox();
  expect(headingBox!.y).toBeGreaterThanOrEqual(0);
  expect(headingBox!.y + headingBox!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );

  await page
    .getByRole("button", { name: "Approved work explains it", exact: true })
    .click();
  await saved(page);
  await page
    .getByRole("combobox", { name: "How sure are you?", exact: true })
    .selectOption("medium");
  await saved(page);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  const facts = page.getByRole("group", {
    name: "Choose the facts your report relies on",
    exact: true,
  });
  for (const title of [
    "The unfamiliar login",
    "The usual sign-in pattern",
    "Device registration",
    "Approved work",
  ]) {
    await facts
      .getByRole("checkbox", { name: new RegExp(`^${title} ·`) })
      .check();
    await saved(page);
  }
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page
    .getByText("Unusual timing alone is not proof", { exact: true })
    .click();
  const anomaly = page.getByRole("combobox", {
    name: "Observation for: Unusual timing alone is not proof",
    exact: true,
  });
  const opening = await anomaly.locator("option").nth(1).getAttribute("value");
  await anomaly.selectOption(opening!);
  await saved(page);
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Close this lead · routine monitoring",
      exact: true,
    })
    .click();
  await saved(page);
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Facts I rely on (4)", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit my report", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Approved work explains it",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .click();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Confirm and close case", exact: true })
    .click();
  await saved(page);
  await page
    .getByText(
      "Investigation quality · show score and evidence-linked feedback",
      { exact: true },
    )
    .click();
  await expect(page.locator(".score")).toContainText("100/100");
  const exported = await portable(page);
  expect(
    exported.commands.filter((c: { kind: string }) => c.kind === "ACQUIRE"),
  ).toHaveLength(3);
  expect(exported.commands.at(-1).draft.evidence).toHaveLength(4);
  expect(exported.commands.at(-1).draft.alternativeEvidence).toHaveLength(1);
  expect(errors).toEqual([]);
  await context.setOffline(false);
  await page.reload();
  await page.getByRole("button", { name: "Resume investigation" }).click();
  expect(await portable(page)).toEqual(exported);
});
test("pending owner verification stays pending and activity refresh keeps its original snapshot", async ({
  page,
}) => {
  await fixture(page, "M");
  await compare(page);
  await nextCheck(page);
  await page
    .getByRole("button", {
      name: "What did the account do afterward? · 1 step",
      exact: true,
    })
    .click();
  await nextCheck(page);
  await page
    .getByText("Ask the account holder or wait for a reply", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Request owner verification · 1 step",
      exact: true,
    })
    .click();
  await saved(page);
  await expect(
    page.getByText(
      "Reply due at step 5. Current step: 3. Waiting advances the simulation; it can also allow other activity to happen.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "What did the account do afterward? · 1 step",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(/Policy asks for handoff by step 6/),
  ).toBeVisible();
  await page.getByText(/^Your notebook ·/).click();
  await expect(
    page.getByRole("article", {
      name: "Session activity and coverage · through step 1",
      exact: true,
    }),
  ).toBeVisible();
  const snapshot = await portable(page);
  expect(
    snapshot.commands.filter((c: { kind: string }) => c.kind === "ACQUIRE"),
  ).toHaveLength(3);
  expect(
    snapshot.commands.filter(
      (c: { kind: string }) => c.kind === "REQUEST_CHECK",
    ),
  ).toHaveLength(1);
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .click();
  await expect(
    page.getByText(
      "Owner verification is pending, due at step 5. You may close before it arrives.",
      { exact: true },
    ),
  ).toBeVisible();
});
test("full-tool notes survive returning to the guided report and explicit closure", async ({
  page,
}) => {
  await fixture(page, "B");
  await page
    .getByText("Investigate further · all tools and settings", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Full Case File and notes", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Case File steps", exact: true })
    .getByRole("button", { name: /Next step/ })
    .click();
  await page
    .getByLabel("Optional notes · not graded", { exact: true })
    .fill("Keep this reasoning when I return to the guided case.");
  await page
    .getByRole("button", { name: "Back to guided investigation", exact: true })
    .click();
  expect(
    await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .click();
  await expect(
    page.getByText("Keep this reasoning when I return to the guided case.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm and close case", exact: true })
    .click();
  await saved(page);
  const save = await portable(page);
  expect(save.commands).toHaveLength(1);
  expect(save.commands[0].kind).toBe("CLOSE_CASE");
  expect(save.commands[0].draft.optionalNotes).toBe(
    "Keep this reasoning when I return to the guided case.",
  );
  expect(
    await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(false);
});
test("guided questions and report reflow with doubled text at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await fixture(page, "B");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await compare(page);
  await nextCheck(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "I’m ready to make my call →", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
for (const world of ["M", "U-M"] as const) {
  test(`${world} supports a complete evidence-backed call without revealing a hidden answer`, async ({
    page,
  }) => {
    await fixture(page, world);
    await compare(page);
    await nextCheck(page);
    if (world === "U-M") {
      await page
        .getByText("Ask the account holder or wait for a reply", {
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name: "Request owner verification · 1 step",
          exact: true,
        })
        .click();
      await saved(page);
    }
    await page
      .getByRole("button", {
        name: "Is this a known work computer? · 1 step",
        exact: true,
      })
      .click();
    await nextCheck(page);
    await page
      .getByRole("button", {
        name: "Was overnight work approved? · 1 step",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name:
          world === "M"
            ? "This weakens approved work"
            : "Approved work is still unverified",
        exact: true,
      })
      .click();
    await saved(page);
    await nextCheck(page);
    await page
      .getByRole("button", {
        name: "What did the account do afterward? · 1 step",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Make my call →", exact: true })
      .click();
    await page
      .getByRole("button", {
        name:
          world === "M"
            ? "It looks like unauthorised use"
            : "I can’t tell yet · unresolved",
        exact: true,
      })
      .click();
    await saved(page);
    await page
      .getByRole("combobox", { name: "How sure are you?", exact: true })
      .selectOption(world === "M" ? "medium" : "low");
    await saved(page);
    await page.getByRole("button", { name: "Continue →", exact: true }).click();
    for (const checkbox of await page.getByRole("checkbox").all()) {
      await checkbox.check();
      await saved(page);
    }
    await page.getByRole("button", { name: "Continue →", exact: true }).click();
    const limit =
      world === "M"
        ? "Identity still needs verification"
        : "Collection is missing";
    await page.getByText(limit, { exact: true }).click();
    await page
      .getByRole("combobox", { name: `Observation for: ${limit}`, exact: true })
      .selectOption({
        label: (await page
          .getByRole("combobox", {
            name: `Observation for: ${limit}`,
            exact: true,
          })
          .locator("option")
          .filter({ hasText: /^Session activity and coverage/ })
          .textContent()) as string,
      });
    await saved(page);
    await page.getByRole("button", { name: "Continue →", exact: true }).click();
    await page
      .getByRole("button", {
        name:
          world === "M"
            ? "Ask the response team to end this login session"
            : "Ask for further investigation and missing records",
        exact: true,
      })
      .click();
    await saved(page);
    await page
      .getByRole("button", { name: "Review finding →", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm and close case", exact: true })
      .click();
    await saved(page);
    await page
      .getByText(
        "Investigation quality · show score and evidence-linked feedback",
        { exact: true },
      )
      .click();
    await expect(page.locator(".score")).toContainText("100/100");
  });
}
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
