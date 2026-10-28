import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function seed(page: Page, m01Closed = true) {
  await page.goto("/");
  await page.evaluate(
    async ({ m01Closed }) => {
      // @ts-expect-error Vite fixture module.
      const m01 = await import("/src/engine/engine.ts");
      // @ts-expect-error Vite fixture module.
      const m01Format = await import("/src/persistence/format.ts");
      // @ts-expect-error Vite fixture module.
      const m01Storage = await import("/src/persistence/saves.ts");
      // @ts-expect-error Vite fixture module.
      const p1 = await import("/src/campaign/engine.ts");
      // @ts-expect-error Vite fixture module.
      const p1Format = await import("/src/campaign/format.ts");
      // @ts-expect-error Vite fixture module.
      const p1Storage = await import("/src/campaign/storage.ts");
      if (m01Closed) {
        const s = m01.createRun("journey-m01", "M");
        const closed = m01.processCommand(s, {
          kind: "CLOSE_CASE",
          draft: s.view.draft,
          commandId: "close",
          runId: s.view.runId,
          expectedRevision: 0,
        }).state;
        if (closed.debrief.quality.total >= 30)
          throw Error("Fixture must have a low score");
        await m01Storage.database.runs.put({
          id: "active",
          revision: closed.view.revision,
          current: m01Format.exportSave(closed),
          previous: null,
        });
      }
      const s = p1.createRun("M04", "journey-m04", "U-M");
      await p1Storage.database.rows.put({
        id: "active:M04",
        revision: 0,
        current: p1Format.exportSave(s),
        previous: null,
      });
    },
    { m01Closed },
  );
  await page.reload();
}
async function rows(page: Page) {
  return page.evaluate(async () => {
    // @ts-expect-error Vite fixture module.
    const { database: m01 } = await import("/src/persistence/saves.ts");
    // @ts-expect-error Vite fixture module.
    const { database: p1 } = await import("/src/campaign/storage.ts");
    return JSON.stringify([await m01.runs.toArray(), await p1.rows.toArray()]);
  });
}
const overview = (page: Page) =>
  page.getByRole("region", { name: "Your investigation journey", exact: true });
async function check(page: Page, completed: number) {
  const area = overview(page);
  await area
    .getByRole("button", { name: /^(Check|Refresh) saved progress$/ })
    .click();
  await expect(area.getByRole("status")).toHaveText(
    `${completed} of 12 cases have a validated saved completion.`,
    { timeout: 60000 },
  );
  return area;
}

test("saved progress is read-only and low scores permit case-to-case continuation", async ({
  page,
}) => {
  test.setTimeout(120000);
  await seed(page);
  const before = await rows(page),
    journey = await check(page, 1);
  await expect(journey).toContainText("Recommended next: M04");
  expect(await rows(page)).toBe(before);
  await page.evaluate(() => {
    const channel = new BroadcastChannel("threat-hunter-campaign-changes");
    channel.postMessage("changed");
    channel.close();
  });
  await expect(journey).toContainText("Saved progress may have changed");
  await check(page, 1);
  await journey
    .getByRole("button", { name: "Open M01 investigation", exact: true })
    .click();
  const firstContinuation = page.getByRole("region", {
    name: "Continue your investigation journey",
    exact: true,
  });
  await expect(firstContinuation).toContainText(
    "Case completion, not a score threshold",
  );
  await firstContinuation
    .getByRole("button", {
      name: "Continue to M04 · The Forgotten Server",
      exact: true,
    })
    .click();
  expect(await rows(page)).toBe(before);
  const hunt = page.locator('[data-mission="M04"]');
  await expect(
    hunt.getByRole("status").filter({ hasText: "Saved on this device" }),
  ).toBeVisible();
  await hunt
    .getByRole("navigation", { name: "M04 investigation" })
    .getByRole("button", { name: "Case File", exact: true })
    .click();
  await hunt
    .getByRole("button", { name: "Review finding", exact: true })
    .click();
  await hunt
    .getByRole("button", { name: "Confirm and close case", exact: true })
    .click();
  const continuation = hunt.getByRole("region", {
    name: "Continue your investigation journey",
    exact: true,
  });
  await expect(continuation).toContainText(
    "Case completion, not a score threshold",
  );
  await expect(continuation).toContainText(
    "Your saved finding stays available",
  );
  const closed = await rows(page);
  await continuation
    .getByRole("button", {
      name: "Continue to M07 · The Missing Logs",
      exact: true,
    })
    .click();
  await expect(
    page
      .locator('[data-mission="M07"]')
      .getByRole("button", { name: "Begin investigation", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  expect(await rows(page)).toBe(closed);
  await page
    .locator('[data-mission="M07"]')
    .getByRole("button", { name: "Threat Hunter · home", exact: true })
    .click();
  await expect(overview(page)).toBeVisible();
  await check(page, 2);
  await expect(overview(page)).toContainText("Recommended next: M07");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.reload();
  await check(page, 2);
  await overview(page)
    .getByRole("button", { name: "Open M07 investigation", exact: true })
    .click();
  const finalHunt = page.locator('[data-mission="M07"]');
  await finalHunt
    .getByRole("button", { name: "Begin investigation", exact: true })
    .click();
  await finalHunt
    .getByRole("navigation", { name: "M07 investigation" })
    .getByRole("button", { name: "Case File", exact: true })
    .click();
  await finalHunt
    .getByRole("button", { name: "Review finding", exact: true })
    .click();
  await finalHunt
    .getByRole("button", { name: "Confirm and close case", exact: true })
    .click();
  await expect(
    finalHunt.getByRole("region", {
      name: "Continue your investigation journey",
      exact: true,
    }),
  ).toContainText("Your saved finding stays available");
  await finalHunt
    .getByRole("button", {
      name: "Continue to M02 · Too Many Alerts",
      exact: true,
    })
    .click();
  await page
    .locator('[data-expansion="M02"]')
    .getByRole("button", { name: /THREAT HUNTER.*HOME/ })
    .click();
  await check(page, 3);
  await expect(overview(page)).toContainText("Recommended next: M02");
});

test("damaged saves stay retained and failed workers do not masquerade as corruption", async ({
  page,
}) => {
  test.setTimeout(120000);
  await seed(page);
  await page.evaluate(async () => {
    // @ts-expect-error Vite fixture module.
    const { database } = await import("/src/campaign/storage.ts");
    const row = await database.rows.get("active:M04");
    await database.rows.put({
      ...row,
      current: { ...row.current, hash: "00000000" },
      previous: row.current,
    });
  });
  const before = await rows(page);
  await check(page, 1);
  await expect(overview(page)).toContainText("Active save needs recovery");
  expect(await rows(page)).toBe(before);
  // New page module/worker lifetime: block the P1 validator, retain a valid row.
  await page.evaluate(async () => {
    // @ts-expect-error Vite fixture module.
    const { database } = await import("/src/campaign/storage.ts");
    const row = await database.rows.get("active:M04");
    await database.rows.put({ ...row, current: row.previous, previous: null });
  });
  await page.reload();
  await page.route("**/p1Worker*", (route) => route.abort());
  const retained = await rows(page);
  await check(page, 1);
  await expect(overview(page)).toContainText(
    "Active-save validation or storage is unavailable",
  );
  await expect(overview(page)).not.toContainText("Active save needs recovery");
  expect(await rows(page)).toBe(retained);
  await page.unroute("**/p1Worker*");
  await check(page, 1);
  await expect(overview(page)).toContainText(
    "An investigation is saved in progress",
  );
});

test("temporary closure does not invent a durable completion", async ({
  page,
}) => {
  test.setTimeout(120000);
  await seed(page, false);
  const before = await rows(page);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "locks", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.reload();
  await check(page, 0);
  await overview(page)
    .getByRole("button", { name: "Open M04 investigation", exact: true })
    .click();
  const hunt = page.locator('[data-mission="M04"]');
  await expect(hunt.getByRole("alert")).toContainText(
    "cannot coordinate durable writes",
  );
  await hunt
    .getByRole("button", {
      name: "Play temporarily without saving",
      exact: true,
    })
    .click();
  await hunt
    .getByRole("navigation", { name: "M04 investigation" })
    .getByRole("button", { name: "Case File", exact: true })
    .click();
  await hunt
    .getByRole("button", { name: "Review finding", exact: true })
    .click();
  await hunt
    .getByRole("button", { name: "Confirm and close case", exact: true })
    .click();
  await expect(
    hunt.getByRole("region", {
      name: "Continue your investigation journey",
      exact: true,
    }),
  ).toContainText("not yet confirmed saved");
  await hunt
    .getByRole("button", { name: "Threat Hunter · home", exact: true })
    .click();
  await check(page, 0);
  expect(await rows(page)).toBe(before);
  await overview(page)
    .getByRole("button", { name: "Open M04 investigation", exact: true })
    .click();
  await expect(
    hunt.getByRole("region", { name: "M04 hunt debrief", exact: true }),
  ).toBeVisible();
});

test("returning home while the next case loads retains the prior completed finding", async ({
  page,
}) => {
  test.setTimeout(90000);
  await seed(page);
  const before = await rows(page);
  await overview(page)
    .getByRole("button", { name: "Open M01 investigation", exact: true })
    .click();
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/src/campaign/Campaign.tsx", async (route) => {
    await blocked;
    await route.continue();
  });
  try {
    await page
      .getByRole("button", {
        name: "Continue to M04 · The Forgotten Server",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Preparing investigation…",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Return home", exact: true })
      .click();
    await expect(overview(page)).toBeVisible();
    expect(await rows(page)).toBe(before);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
