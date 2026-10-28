import { expect, test, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

test.use({ actionTimeout: 15000 });

const shell = (page: Page, mission = "M04") =>
  page.locator(`[data-mission="${mission}"]`);
async function open(page: Page, mission: "M04" | "M07", world?: string) {
  await page.goto("/");
  await page
    .getByRole("button", { name: new RegExp(`${mission} ·`) })
    .click({ timeout: 30000 });
  const area = shell(page, mission);
  await expect(
    area.getByRole("button", { name: "Begin investigation" }),
  ).toBeEnabled({ timeout: 30000 });
  if (world) {
    const text = await page.evaluate(
      async ({ mission, world }) => {
        // @ts-expect-error Vite test fixture module.
        const { createRun } = await import("/src/campaign/engine.ts");
        // @ts-expect-error Vite test fixture module.
        const { exportSave } = await import("/src/campaign/format.ts");
        return JSON.stringify(
          exportSave(createRun(mission, "browser-" + mission, world)),
        );
      },
      { mission, world },
    );
    await area.locator('input[type="file"]').setInputFiles({
      name: "mission.json",
      mimeType: "application/json",
      buffer: Buffer.from(text),
    });
  } else
    await area.getByRole("button", { name: "Begin investigation" }).click();
  await saved(area);
  await area
    .getByRole("navigation", { name: `${mission} investigation` })
    .getByRole("button", { name: "Investigate", exact: true })
    .click();
  return area;
}
async function saved(area: Locator) {
  await expect(
    area.getByRole("status").filter({ hasText: "Saved on this device" }),
  ).toBeVisible({ timeout: 60000 });
}
async function acquire(area: Locator, title: string) {
  await area
    .locator(".question")
    .filter({ hasText: title })
    .getByRole("button")
    .click();
  await saved(area);
}
async function tab(area: Locator, name: string) {
  await area
    .getByRole("navigation", { name: /investigation$/ })
    .getByRole("button", { name, exact: true })
    .click();
}
async function report(area: Locator, mission: "M04" | "M07") {
  await tab(area, "Case File");
  const evidence = area.getByRole("button", {
    name: "Cite in finding · free",
    exact: true,
  });
  for (let i = 0; i < (await evidence.count()); i++) {
    await evidence.nth(i).click();
    await saved(area);
  }
  const alternative = area.getByRole("article", {
    name:
      mission === "M04"
        ? "A matching migration record"
        : "A routing mismatch explains the pipeline gap",
    exact: true,
  });
  await alternative
    .getByRole("button", { name: "Test another explanation · free" })
    .click();
  await saved(area);
  await area
    .getByRole("combobox", { name: "Finding", exact: true })
    .selectOption(mission === "M04" ? "explained" : "visibility");
  await saved(area);
  await area
    .getByRole("combobox", { name: "Claim confidence", exact: true })
    .selectOption(mission === "M04" ? "medium" : "low");
  await saved(area);
  await area
    .getByRole("combobox", { name: "Alternative tested", exact: true })
    .selectOption(
      mission === "M04"
        ? "approved_work_tested"
        : "coverage_configuration_tested",
    );
  await saved(area);
  for (const name of mission === "M04"
    ? [
        "An unfamiliar relationship is not proof of misuse",
        "The host supports an essential billing dependency",
      ]
    : [
        "Missing historical collection cannot be reconstructed",
        "A successful test now does not prove historical coverage",
      ]) {
    await area.getByLabel(name, { exact: true }).check();
    await saved(area);
  }
  await area
    .getByLabel(
      mission === "M04"
        ? "My finding concerns BILL-S1 on the discovered host, preserving the billing dependency"
        : "My finding concerns the CS-PORTAL application source and its stated missing interval",
      { exact: true },
    )
    .check();
  await saved(area);
  if (mission === "M04") {
    await area
      .getByRole("combobox", { name: "Recommendation", exact: true })
      .selectOption("close_explained");
    await saved(area);
  } else {
    await area
      .getByRole("combobox", {
        name: "Missing historical interval",
        exact: true,
      })
      .selectOption("gap");
    await saved(area);
    await area
      .getByRole("combobox", { name: "Follow-up trigger", exact: true })
      .selectOption("repeat_application_verification");
    await saved(area);
  }
  await area
    .getByLabel("Optional notes · not graded", { exact: true })
    .fill("The finding is bounded to the investigated source and target.");
  await area
    .getByRole("button", { name: "Review finding", exact: true })
    .click();
  await saved(area);
  await area.getByRole("button", { name: "Confirm and close case" }).click();
  await saved(area);
  const debrief = area.getByRole("region", { name: `${mission} hunt debrief` });
  await expect(debrief).toBeVisible();
  await expect(debrief.locator("h2").first()).toBeFocused();
  await debrief
    .getByText(
      "Investigation quality · optional score and evidence-linked feedback",
      { exact: true },
    )
    .click();
  await expect(debrief.locator(".score")).toHaveText("100/100");
  // Evidence-linked feedback opens the reconstruction before scrolling to it.
  const reconstruction = debrief.locator(".evidence-reconstruction");
  await expect(reconstruction).not.toHaveAttribute("open");
  await debrief
    .getByRole("button", { name: "Review related observations" })
    .first()
    .click();
  await expect(reconstruction).toHaveAttribute("open", "");
}
async function portable(page: Page, area: Locator) {
  const pending = page.waitForEvent("download");
  await area.getByRole("button", { name: "Export save", exact: true }).click();
  return (await readFile((await (await pending).path())!)).toString();
}
test("M04 earns its relationship discovery, preserves billing, closes at 100 and archives a replay", async ({
  page,
}) => {
  test.setTimeout(120000);
  const area = await open(page, "M04", "B");
  await expect(area.getByLabel("Investigation scope")).not.toContainText(
    "LEGACY-01",
  );
  await acquire(area, "Compare account activity by host");
  await area.getByLabel("Investigation scope").selectOption("LEGACY-01");
  await saved(area);
  for (const name of [
    "Check ownership and billing dependency",
    "Check the migration approval",
    "Inspect session origin",
  ])
    await acquire(area, name);
  await report(area, "M04");
  const closed = JSON.parse(await portable(page, area));
  expect(closed.committedRevision).toBe(closed.revision);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.reload();
  await expect(
    shell(page).getByRole("region", { name: "M04 hunt debrief" }),
  ).toBeVisible();
  await saved(shell(page));
  await shell(page)
    .getByRole("button", { name: "Try another approach" })
    .click();
  await saved(shell(page));
  const stored = await page.evaluate(async () => {
    // @ts-expect-error Vite test module.
    const { database } = await import("/src/campaign/storage.ts");
    return {
      active: await database.rows.get("active:M04"),
      completed: await database.rows
        .where("id")
        .startsWith("completed:M04:")
        .toArray(),
    };
  });
  expect(stored.active.current.runId).not.toBe(closed.runId);
  expect(stored.completed[0].current).toEqual(closed);
  expect(stored.active.current.manifest.world).toBe("B");
});
test("M07 proves a future collection window without backfilling history and closes a visibility finding at 100", async ({
  page,
}) => {
  test.setTimeout(120000);
  const area = await open(page, "M07", "U-M");
  await area.getByLabel("Investigation scope").selectOption("CS-PORTAL");
  await saved(area);
  for (const name of [
    "Inspect declared coverage",
    "Compare delivered heartbeats",
    "Inspect collector routing",
    "Examine the independent identity source",
  ])
    await acquire(area, name);
  await area
    .getByRole("button", { name: "Enable future collection · 2 steps" })
    .click();
  await saved(area);
  await area
    .getByRole("button", { name: "Request controlled verification · 1 step" })
    .click();
  await saved(area);
  await tab(area, "Timeline");
  await area
    .getByRole("combobox", { name: "Advance the world", exact: true })
    .selectOption("3");
  await area.getByRole("button", { name: "Advance selected steps" }).click();
  await saved(area);
  await tab(area, "Investigate");
  await acquire(area, "Review the future observation window");
  await expect(
    area.locator(".panel").filter({ hasText: "Latest observation" }),
  ).toContainText("Historical collection is not backfilled");
  await report(area, "M07");
  const exported = JSON.parse(await portable(page, area));
  expect(exported.manifest.missionId).toBe("M07");
  // report() leaves the reconstruction open after following feedback.
  await area.getByLabel("What I knew then").fill("0");
  await expect(
    area
      .getByRole("region", { name: "M07 hunt debrief" })
      .getByText("Future observation window complete", { exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
for (const mission of ["M04", "M07"] as const)
  test(`${mission} switching, full offline voice and free reading preserve the save`, async ({
    page,
    context,
  }) => {
    test.setTimeout(90000);
    await page.goto("/");
    await page.getByText(/^Play settings ·/).click();
    await page
      .getByRole("button", { name: /Independent investigation/ })
      .click();
    await page.getByRole("button", { name: "Begin investigation" }).click();
    await expect(
      page
        .getByRole("region", { name: "Save and readiness", exact: true })
        .getByRole("status"),
    ).toHaveText("Saved on this device");
    const originalM01 = await page.evaluate(async () => {
      // @ts-expect-error Vite test module.
      const { database } = await import("/src/persistence/saves.ts");
      return database.runs.get("active");
    });
    const area = await open(page, mission, "U-B");
    await acquire(
      area,
      mission === "M04"
        ? "Compare account activity by host"
        : "Inspect declared coverage",
    );
    const before = await portable(page, area);
    const requests: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes(`/audio/${mission.toLowerCase()}/`))
        requests.push(r.url());
    });
    await area
      .getByRole("button", { name: "Voice & sound", exact: true })
      .click();
    await area
      .getByRole("button", { name: "Enable voice and sound", exact: true })
      .click();
    await expect(area.getByText(/Voice pack ready/)).toBeVisible({
      timeout: 60000,
    });
    expect(new Set(requests).size).toBe(21);
    await context.setOffline(true);
    await area
      .getByRole("button", { name: "Play briefing", exact: true })
      .click();
    await expect(
      area.getByText("Selected narration · text transcript", { exact: true }),
    ).toBeVisible();
    await area.getByRole("button", { name: "Mute all", exact: true }).click();
    await tab(area, "Brief");
    await tab(area, "Timeline");
    expect(await portable(page, area)).toBe(before);
    await context.setOffline(false);
    await area
      .getByRole("button", { name: "Threat Hunter · home", exact: true })
      .click();
    const other = mission === "M04" ? "M07" : "M04";
    await page.getByRole("button", { name: new RegExp(`${other} ·`) }).click();
    await expect(
      shell(page, other).getByRole("button", { name: "Begin investigation" }),
    ).toBeEnabled();
    await shell(page, other)
      .getByRole("button", { name: "Begin investigation" })
      .click();
    await saved(shell(page, other));
    await shell(page, other)
      .getByRole("button", { name: "Threat Hunter · home", exact: true })
      .click();
    await page
      .getByRole("button", { name: new RegExp(`${mission} ·`) })
      .click();
    expect(await portable(page, shell(page, mission))).toBe(before);
    expect(
      await page.evaluate(async () => {
        // @ts-expect-error Vite test module.
        const { database } = await import("/src/persistence/saves.ts");
        return database.runs.get("active");
      }),
    ).toEqual(originalM01);
    await page.setViewportSize({ width: 320, height: 720 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("P1 failed writes retain accepted work and corruption recovery archives the original", async ({
  page,
}) => {
  test.setTimeout(90000);
  const area = await open(page, "M04", "M");
  await page.evaluate(async () => {
    // @ts-expect-error Vite test module.
    const { database } = await import("/src/campaign/storage.ts");
    const put = database.rows.put.bind(database.rows);
    let fail = true;
    database.rows.put = (...args: unknown[]) => {
      if (fail) {
        fail = false;
        throw new DOMException("Injected quota", "QuotaExceededError");
      }
      return put(...args);
    };
  });
  await area
    .locator(".question")
    .filter({ hasText: "Compare account activity by host" })
    .getByRole("button")
    .click();
  await expect(area.getByRole("alert")).toContainText("quota");
  await area
    .getByRole("button", { name: "Retry saving retained hunt", exact: true })
    .click();
  await saved(area);
  const original = await page.evaluate(async () => {
    // @ts-expect-error Vite test module.
    const { database } = await import("/src/campaign/storage.ts");
    const row = await database.rows.get("active:M04");
    if (row.revision !== 1 || row.current.commands.length !== 1)
      throw Error("Action duplicated or not committed");
    await database.rows.update("active:M04", { "current.hash": "00000000" });
    return database.rows.get("active:M04");
  });
  await page.reload();
  const recovered = shell(page);
  await expect(
    recovered.getByRole("heading", { name: "Recover this mission" }),
  ).toBeVisible();
  await recovered
    .getByLabel(
      "I understand recovery replaces the active mission and retains its original for export",
    )
    .check();
  await recovered
    .getByRole("button", { name: "Restore previous hunt" })
    .click();
  await saved(recovered);
  const pending = page.waitForEvent("download");
  await recovered
    .getByRole("button", { name: "Export recovery original", exact: true })
    .click();
  expect(
    JSON.parse((await readFile((await (await pending).path())!)).toString()),
  ).toEqual({ ...original, id: "original:M04" });
});
test("a waiting P1 tab refreshes committed knowledge and takes writer ownership safely", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const writer = await open(page, "M04", "B");
  const second = await context.newPage();
  await second.goto("/");
  await second.getByRole("button", { name: /M04 ·/ }).click();
  const reader = shell(second);
  await expect(reader.getByText(/Read-only: another tab owns/)).toBeVisible();
  await acquire(writer, "Compare account activity by host");
  await reader
    .getByRole("navigation", { name: "M04 investigation" })
    .getByRole("button", { name: "Investigate", exact: true })
    .click();
  await expect(reader.getByLabel("Investigation scope")).toContainText(
    "LEGACY-01",
  );
  await page.close();
  await expect(reader.getByLabel("Investigation scope")).toBeEnabled({
    timeout: 15000,
  });
  await reader.getByLabel("Investigation scope").selectOption("LEGACY-01");
  await saved(reader);
});
test("P1 without Web Locks requires explicit temporary play and leaves durable storage untouched", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "locks", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /M04 ·/ }).click();
  const area = shell(page);
  await expect(area.getByRole("alert")).toContainText(
    "cannot coordinate durable writes",
    { timeout: 30000 },
  );
  await expect(
    area.getByRole("button", { name: "Begin investigation" }),
  ).toBeDisabled();
  await area
    .getByRole("button", { name: "Play temporarily without saving" })
    .click();
  await area.getByRole("button", { name: "Begin investigation" }).click();
  await tab(area, "Investigate");
  await area
    .locator(".question")
    .filter({ hasText: "Compare account activity by host" })
    .getByRole("button")
    .click();
  await expect(area.getByRole("status")).toHaveText(
    "Temporary session — not saved",
  );
  const file = JSON.parse(await portable(page, area));
  expect(file.committedRevision).toBeNull();
  expect(file.commands).toHaveLength(1);
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Vite test module.
      const { database } = await import("/src/campaign/storage.ts");
      return database.rows.get("active:M04");
    }),
  ).toBeUndefined();
});

for (const mission of ["M04", "M07"] as const)
  test(`${mission} three-level help focuses without acting and keeps assistance outside the save`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const area = await open(page, mission, "U-M");
    const help = area.getByRole("region", {
      name: `${mission} investigation help`,
    });
    const before = await portable(page, area);
    await expect(
      help.getByRole("button", { name: "Guided investigation", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      help.getByRole("button", { name: "Suggest a source", exact: true }),
    ).toBeDisabled();
    await help
      .getByRole("button", { name: "Ask for a nudge", exact: true })
      .click();
    await expect(
      help.getByRole("button", { name: "Listen to this nudge", exact: true }),
    ).toBeDisabled();
    await help
      .getByRole("button", { name: "Suggest a source", exact: true })
      .click();
    await help.getByRole("button", { name: "Show me", exact: true }).click();
    const query = mission === "M04" ? "account_hosts" : "coverage";
    await expect(area.locator(`#${mission}-help-${query}`)).toBeFocused();
    expect(await portable(page, area)).toBe(before);
    await area
      .getByText("Field guide · words, scope and authority", { exact: true })
      .click();
    await expect(
      area.getByRole("heading", {
        name: "Your scope and authority",
        exact: true,
      }),
    ).toBeVisible();
    expect(await portable(page, area)).toBe(before);
    await help
      .getByText("Assistance used · 3 requests this session", { exact: true })
      .click();
    const downloaded = page.waitForEvent("download");
    await help
      .getByRole("button", { name: "Export assistance record", exact: true })
      .click();
    const record = JSON.parse(
      await readFile((await (await downloaded).path())!, "utf8"),
    );
    expect(record.format).toBe("threat-hunter-assistance");
    expect(record.totalRequests).toBe(3);
    expect(record.requests).toEqual(
      [1, 2, 3].map((level) => ({
        step: 0,
        hintId: mission === "M04" ? "m04-relationships" : "m07-declared",
        level,
      })),
    );
    expect(await portable(page, area)).toBe(before);
    await acquire(
      area,
      mission === "M04"
        ? "Compare account activity by host"
        : "Inspect declared coverage",
    );
    await expect(
      help.getByRole("button", { name: "Suggest a source", exact: true }),
    ).toBeDisabled();
    await help
      .getByRole("button", { name: "Independent investigation", exact: true })
      .click();
    await expect(
      help.getByRole("button", { name: "Ask for a nudge", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    const restored = shell(page, mission).getByRole("region", {
      name: `${mission} investigation help`,
    });
    await expect(
      restored.getByRole("button", {
        name: "Independent investigation",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await restored
      .getByRole("button", { name: "Guided investigation", exact: true })
      .click();
    await page.setViewportSize({ width: 320, height: 720 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await restored
      .getByRole("button", { name: "Ask for a nudge", exact: true })
      .click();
    await restored
      .getByRole("button", { name: "Suggest a source", exact: true })
      .click();
    await restored
      .getByRole("button", { name: "Show me", exact: true })
      .click();
    await expect(
      shell(page, mission).locator(
        `#${mission}-help-${mission === "M04" ? "scope" : "health"}`,
      ),
    ).toBeFocused();
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
  });
test("P1 unfinished notes survive navigation and block replacement until explicitly saved", async ({
  page,
}) => {
  test.setTimeout(90000);
  const area = await open(page, "M04", "B");
  const pending = page.waitForEvent("download");
  await area.getByRole("button", { name: "Export save", exact: true }).click();
  const initial = await readFile(await (await pending).path(), "utf8");
  await tab(area, "Case File");
  await area
    .getByRole("textbox", { name: "Optional notes · not graded", exact: true })
    .fill("Keep this unfinished note");
  const control = area.locator(".backup-import");
  await control.locator("summary").first().click();
  await expect(control.getByRole("checkbox")).toBeDisabled();
  await tab(area, "Brief");
  await expect(control.getByRole("checkbox")).toBeDisabled();
  await tab(area, "Case File");
  await expect(
    area.getByRole("textbox", {
      name: "Optional notes · not graded",
      exact: true,
    }),
  ).toHaveValue("Keep this unfinished note");
  await area
    .getByRole("button", { name: "Save notes · free", exact: true })
    .click();
  await saved(area);
  await expect(control.getByRole("checkbox")).toBeEnabled();
  await control.getByRole("checkbox").check();
  await control.locator('input[type="file"]').setInputFiles({
    name: "earlier.json",
    mimeType: "application/json",
    buffer: Buffer.from(initial),
  });
  await saved(area);
  await expect(
    area.getByRole("textbox", {
      name: "Optional notes · not graded",
      exact: true,
    }),
  ).toHaveValue("");
  const rows = await page.evaluate(async () => {
    // @ts-expect-error Vite test module.
    const { database } = await import("/src/campaign/storage.ts");
    return database.rows.where("id").startsWith("replaced:M04:").toArray();
  });
  expect(rows).toHaveLength(1);
  expect(rows[0].current.snapshot.state.view.finding.notes).toBe(
    "Keep this unfinished note",
  );
});

test("a screen chosen while the first P1 save is pending stays selected", async ({
  page,
}) => {
  // Hold P1 commit replies so navigation happens before the first save ends.
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (!String(url).includes("p1Worker")) return;
        const post = this.postMessage.bind(this);
        this.postMessage = (message: { op?: string }) => {
          if (message?.op === "commit") setTimeout(() => post(message), 1500);
          else post(message);
        };
      }
    } as typeof Worker;
  });
  await page.goto("/");
  await page.getByRole("button", { name: /M04 ·/ }).click({ timeout: 30000 });
  const area = shell(page);
  const begin = area.getByRole("button", { name: "Begin investigation" });
  await expect(begin).toBeEnabled({ timeout: 30000 });
  await begin.click();
  const nav = area.getByRole("navigation", { name: "M04 investigation" });
  await nav.getByRole("button", { name: "Case File", exact: true }).click();
  await saved(area);
  await expect(
    nav.getByRole("button", { name: "Case File", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    area.getByRole("button", { name: "Review finding", exact: true }),
  ).toBeVisible();
});
