import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
test.use({ reducedMotion: "reduce", actionTimeout: 15000 });
const ids = ["M02", "M03", "M05", "M06", "M08", "M09", "M10", "M11", "M12"];
const shell = (page: Page, slot: string) =>
  page.locator(`[data-expansion="${slot}"]`);
async function open(page: Page, mission: string) {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Show all twelve authored cases",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Choose independent case order", exact: true })
    .click();
  const button = page.getByRole("button", {
    name: `Open ${mission} investigation`,
    exact: true,
  });
  await expect(button).toBeEnabled({ timeout: 30000 });
  await button.click();
  const area = shell(page, mission);
  await expect(area).toBeVisible({ timeout: 30000 });
  return area;
}
async function saved(area: Locator, slot: string) {
  await expect(
    area
      .getByRole("region", { name: `${slot} save and readiness`, exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device", { timeout: 30000 });
}
async function start(page: Page, mission: string, world = "B") {
  const area = await open(page, mission);
  await expect(
    area.getByRole("button", { name: "Begin investigation", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  const fixture = await page.evaluate(
    async ({ mission, world }) => {
      // @ts-expect-error Vite test fixture module.
      const e = await import("/src/expansion/engine.ts");
      // @ts-expect-error Vite test fixture module.
      const f = await import("/src/expansion/format.ts");
      // @ts-expect-error Vite test fixture module.
      const { packages } = await import("/src/expansion/content.ts");
      const p = packages[mission];
      return {
        save: JSON.stringify(
          f.exportSave(e.createRun(mission, "browser-" + mission, world)),
        ),
        primary: p.primaryTarget,
        choice: p.mechanic.supportedChoice,
        claims: p.mechanic.claims,
        limit: p.limits[0].label,
        owner: p.response.owner,
        kind: p.mechanic.kind,
      };
    },
    { mission, world },
  );
  await area.locator('input[type="file"]').setInputFiles({
    name: "case.json",
    mimeType: "application/json",
    buffer: Buffer.from(fixture.save),
  });
  await saved(area, mission);
  return { area, fixture };
}
async function tab(area: Locator, mission: string, name: string) {
  await area
    .getByRole("navigation", { name: `${mission} investigation`, exact: true })
    .getByRole("button", { name, exact: true })
    .click();
}
async function query(area: Locator, mission: string, title: string) {
  await area
    .locator(".question")
    .filter({ hasText: title })
    .getByRole("button")
    .click();
  await saved(area, mission);
}
async function collect(area: Locator, mission: string, primary: string) {
  await tab(area, mission, "Explore");
  await query(area, mission, "Establish the task and business consequence");
  await area
    .getByRole("combobox", { name: "Current investigation scope", exact: true })
    .selectOption(primary);
  await saved(area, mission);
  await query(area, mission, "Check the exact work authorisation");
  await query(area, mission, "Inspect the scoped session activity");
}
async function portable(page: Page, area: Locator) {
  const pending = page.waitForEvent("download");
  await area
    .getByRole("button", { name: "Export investigation save", exact: true })
    .click();
  return readFile(await (await pending).path(), "utf8");
}
async function report(
  area: Locator,
  mission: string,
  fixture: {
    primary: string;
    choice: string;
    claims: { id: string }[];
    limit: string;
    owner: string;
    kind: string;
  },
  visibility = false,
) {
  await tab(area, mission, "Case File");
  const step = async (name: string) =>
    area
      .getByRole("navigation", {
        name: `${mission} Case File steps`,
        exact: true,
      })
      .getByRole("button", { name, exact: true })
      .click();
  const select = async (name: string, value: string) => {
    await area.getByRole("combobox", { name, exact: true }).selectOption(value);
    await saved(area, mission);
  };
  await step("Explanation");
  await select("Finding", visibility ? "visibility" : "explained");
  await select("Claim confidence", visibility ? "low" : "medium");
  await select("Finding scope", fixture.primary);
  await select("Working investigation boundary", fixture.choice);
  if (fixture.kind === "triage" || fixture.kind === "capstone") {
    await area
      .getByRole("button", {
        name: `Move ${fixture.primary} earlier · free`,
        exact: true,
      })
      .click();
    await saved(area, mission);
    await area
      .getByRole("button", {
        name: "Save this priority order · free",
        exact: true,
      })
      .click();
    await saved(area, mission);
  }
  await step("Evidence");
  const citations = area.getByRole("button", {
    name: "Cite in finding · free",
    exact: true,
  });
  while (await citations.count()) {
    await citations.first().click();
    await saved(area, mission);
  }
  await area
    .getByRole("article", {
      name: visibility
        ? "Work record unavailable"
        : "The specific work authorisation",
      exact: true,
    })
    .getByRole("button", {
      name: "Test another explanation · free",
      exact: true,
    })
    .click();
  await saved(area, mission);
  if (fixture.kind === "causal")
    for (const [title, claim] of [
      ["Task, scope and business consequence", fixture.claims[0].id],
      ["Recorded session activity", fixture.claims[1].id],
    ]) {
      const card = area.getByRole("article", { name: title, exact: true });
      await card.locator("summary").click();
      await card
        .getByRole("combobox", { name: "Claim", exact: true })
        .selectOption(claim);
      await card
        .getByRole("button", {
          name: "Attach observation to selected claim · free",
          exact: true,
        })
        .click();
      await saved(area, mission);
    }
  await step("Unknowns");
  await select("Competing explanation status", "business_context_tested");
  await area
    .getByRole("checkbox", { name: fixture.limit, exact: true })
    .check();
  await saved(area, mission);
  await step("Next step");
  await select(
    "Next action",
    visibility ? "repair_collection" : "close_explained",
  );
  await select("Responsible owner", visibility ? fixture.owner : "none");
  await select(
    "Follow-up trigger",
    visibility ? "restore_and_retest" : "routine_monitoring",
  );
  await area
    .getByRole("checkbox", { name: /^My finding covers the named scope/ })
    .check();
  await saved(area, mission);
  if (fixture.kind === "capstone") {
    await area
      .getByRole("button", {
        name: "Assign separate coverage restoration · free",
        exact: true,
      })
      .click();
    await saved(area, mission);
  }
  await area
    .getByRole("textbox", { name: "Optional case notes", exact: true })
    .fill(`Browser report for ${mission}`);
  await area
    .getByRole("navigation", { name: `${mission} investigation`, exact: true })
    .getByRole("button", { name: "Review finding", exact: true })
    .click();
  await area
    .getByRole("region", { name: "Finding confirmation", exact: true })
    .getByRole("button", { name: "Confirm and close case", exact: true })
    .click();
  await saved(area, mission);
  await area
    .getByText("Optional in-game quality breakdown", { exact: true })
    .click();
  await expect(area).toContainText("Total: 100/100", { timeout: 10000 });
}
for (const mission of ids)
  test(`${mission} completes its own investigation, saves the finding and replays identical conditions`, async ({
    page,
  }) => {
    test.setTimeout(150000);
    const { area, fixture } = await start(page, mission);
    await collect(area, mission, fixture.primary);
    await report(area, mission, fixture);
    const closed = await portable(page, area),
      data = JSON.parse(closed);
    expect(data.manifest.missionId).toBe(mission);
    expect(data.committedRevision).toBe(data.revision);
    expect(data.snapshot.state.debrief.finding.notes).toBe(
      `Browser report for ${mission}`,
    );
    await page.setViewportSize({ width: 320, height: 800 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    expect(
      (
        await new AxeBuilder({ page })
          .include(".expansion-shell")
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await open(page, mission);
    await saved(shell(page, mission), mission);
    await expect(
      shell(page, mission).getByRole("region", {
        name: `${mission} investigation debrief`,
        exact: true,
      }),
    ).toBeVisible();
    const resumed = shell(page, mission);
    expect(JSON.parse(await portable(page, resumed))).toEqual(data);
    await resumed
      .getByRole("button", {
        name: "Try another approach · same conditions",
        exact: true,
      })
      .click();
    await saved(resumed, mission);
    const fresh = JSON.parse(await portable(page, resumed));
    expect(fresh.manifest.world).toBe(data.manifest.world);
    expect(fresh.runId).not.toBe(data.runId);
    expect(fresh.revision).toBe(0);
    const archive = await page.evaluate(
      async ({ mission, runId }) => {
        // @ts-expect-error Vite test fixture module.
        const { database } = await import("/src/expansion/storage.ts");
        return (await database.rows.get(`completed:${mission}:${runId}`))
          .current;
      },
      { mission, runId: data.runId },
    );
    expect(archive).toEqual(data);
  });
test("expansion announces deliveries and moves focus to review and debrief", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { area } = await start(page, "M02");
  const live = area.locator('[aria-live="polite"][aria-atomic="true"]');
  await expect(live).toHaveText("");
  await tab(area, "M02", "Explore");
  await query(area, "M02", "Establish the task and business consequence");
  await expect(live).toHaveText(/^New observation: /);
  // Records show public source names, not raw source IDs.
  await expect(
    area
      .locator(".record")
      .filter({ hasText: "Scope and dependency catalogue" }),
  ).not.toHaveCount(0);
  await expect(area.locator(".record").first()).toContainText(
    "Review briefing ·",
  );
  const before = await portable(page, area);
  await area
    .getByRole("navigation", { name: "M02 investigation", exact: true })
    .getByRole("button", { name: "Review finding", exact: true })
    .click();
  await expect(
    area.getByRole("heading", { name: "Review your finding", exact: true }),
  ).toBeFocused();
  expect(await portable(page, area)).toBe(before);
  await area
    .getByRole("button", { name: "Confirm and close case", exact: true })
    .click();
  await saved(area, "M02");
  const debrief = area.getByRole("region", {
    name: "M02 investigation debrief",
    exact: true,
  });
  await expect(debrief.locator("h2").first()).toBeFocused();
  await expect(area.locator("h1")).toHaveCount(1);
});

test("M08 runs its complete text, future-only collection and loaded voice pack offline without changing save bytes during listening", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const { area, fixture } = await start(page, "M08", "U-M");
  await collect(area, "M08", fixture.primary);
  await area
    .getByRole("button", { name: "Voice & sound", exact: true })
    .click();
  await area
    .getByRole("button", { name: "Enable voice and sound", exact: true })
    .click();
  await expect(area.getByText(/Voice pack ready/)).toBeVisible({
    timeout: 30000,
  });
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/audio/")) requests.push(r.url());
  });
  await context.setOffline(true);
  const before = await portable(page, area);
  await area
    .getByRole("button", { name: "Play briefing", exact: true })
    .click();
  await area.getByRole("button", { name: "Skip speech", exact: true }).click();
  await area.getByRole("button", { name: "Mute all", exact: true }).click();
  expect(await portable(page, area)).toBe(before);
  expect(requests).toEqual([]);
  await area
    .getByRole("button", {
      name: "Enable future-only collection · 2 steps",
      exact: true,
    })
    .click();
  await saved(area, "M08");
  await query(area, "M08", "Read the enabled future observation window");
  await query(area, "M08", "Read the enabled future observation window");
  await report(area, "M08", fixture, true);
  await area
    .getByRole("button", {
      name: "Reveal simulation reconstruction",
      exact: true,
    })
    .click();
  await expect(area).toContainText(
    "A harmless source-health event is generated after the explicitly enabled collection starts.",
  );
  const closed = JSON.parse(await portable(page, area));
  expect(closed.snapshot.state.generatedTests).toHaveLength(1);
  expect(
    closed.snapshot.state.debrief.records.some(
      (r: { eventTick: number; cutoffTick: number; sourceId: string }) =>
        r.sourceId === "future_verification" &&
        r.eventTick === 6 &&
        r.cutoffTick === 6,
    ),
  ).toBe(true);
  expect(requests).toEqual([]);
});
test("failed writes retain volatile actions, retry once, preserve recovery originals and transfer writer ownership", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const { area, fixture } = await start(page, "M03");
  const original = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture module.
    const { database } = await import("/src/expansion/storage.ts");
    const prior = database.rows.put.bind(database.rows);
    (globalThis as typeof globalThis & { restorePut?: () => void }).restorePut =
      () => {
        database.rows.put = prior;
      };
    const row = await database.rows.get("active:M03");
    database.rows.put = async () => {
      throw new DOMException("Injected quota failure", "QuotaExceededError");
    };
    return row;
  });
  await tab(area, "M03", "Explore");
  await area
    .locator(".question")
    .filter({ hasText: "Establish the task and business consequence" })
    .getByRole("button")
    .click();
  await expect(area.getByRole("alert")).toContainText("Quota");
  await expect(area).toContainText("M03 · step 1");
  const volatile = JSON.parse(await portable(page, area));
  await area.getByRole("button", { name: /THREAT HUNTER.*HOME/ }).click();
  await page
    .getByRole("button", { name: "M04 · The Forgotten Server", exact: true })
    .click();
  await page
    .locator('[data-mission="M04"]')
    .getByRole("button", { name: "Threat Hunter · home", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open M03 investigation", exact: true })
    .click();
  await expect(area).toContainText("M03 · step 1");
  expect(JSON.parse(await portable(page, area))).toEqual(volatile);
  expect(volatile.committedRevision).toBe(0);
  expect(volatile.commands).toHaveLength(1);
  await page.evaluate(() => {
    (
      globalThis as typeof globalThis & { restorePut?: () => void }
    ).restorePut?.();
  });
  await area
    .getByRole("button", {
      name: "Retry saving retained progress",
      exact: true,
    })
    .click();
  await saved(area, "M03");
  const next = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture module.
    const { database } = await import("/src/expansion/storage.ts");
    return database.rows.get("active:M03");
  });
  expect(next.current.commands).toHaveLength(1);
  expect(next.previous).toEqual(original.current);
  const waiting = await context.newPage(),
    other = await open(waiting, "M03");
  await expect(other).toContainText("Read-only: another tab owns");
  await expect(
    other.getByRole("button", {
      name: "Inspect the scoped session activity · 1 step",
    }),
  ).toHaveCount(0);
  await page.close();
  await expect(
    other.getByText("Read-only: another tab owns", { exact: false }),
  ).toHaveCount(0, { timeout: 30000 });
  await saved(other, "M03");
  await waiting.evaluate(async () => {
    // @ts-expect-error Vite test fixture module.
    const { database } = await import("/src/expansion/storage.ts");
    await database.rows.update("active:M03", { "current.hash": "00000000" });
  });
  await open(waiting, "M03");
  await expect(
    shell(waiting, "M03").getByRole("heading", {
      name: "Recover this mission",
    }),
  ).toBeVisible({ timeout: 30000 });
  const broken = await waiting.evaluate(async () => {
    // @ts-expect-error Vite test fixture module.
    const { database } = await import("/src/expansion/storage.ts");
    return database.rows.get("active:M03");
  });
  await shell(waiting, "M03")
    .getByRole("button", {
      name: "Restore validated previous save",
      exact: true,
    })
    .click();
  await saved(shell(waiting, "M03"), "M03");
  const recovered = await waiting.evaluate(async () => {
    // @ts-expect-error Vite test fixture module.
    const { database } = await import("/src/expansion/storage.ts");
    return {
      active: await database.rows.get("active:M03"),
      original: await database.rows.get("original:M03"),
    };
  });
  expect(recovered.active.revision).toBe(0);
  expect({ ...recovered.original, id: broken.id }).toEqual(broken);
  void fixture;
});
test("unavailable expansion validation retains raw rows and supports an actual inspection retry", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  const original = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture module.
    const e = await import("/src/expansion/engine.ts");
    // @ts-expect-error Vite test fixture module.
    const f = await import("/src/expansion/format.ts");
    // @ts-expect-error Vite test fixture module.
    const { database } = await import("/src/expansion/storage.ts");
    const row = {
      id: "active:M05",
      revision: 0,
      current: f.exportSave(e.createRun("M05", "worker-failure", "B")),
      previous: null,
    };
    await database.rows.put(row);
    const NativeWorker = Worker;
    (
      globalThis as typeof globalThis & { restoreWorker?: () => void }
    ).restoreWorker = () => {
      globalThis.Worker = NativeWorker;
    };
    globalThis.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (String(url).includes("expansionWorker"))
          throw new Error("Injected unavailable worker");
        super(url, options);
      }
    };
    return row;
  });
  await page
    .getByRole("button", {
      name: "Show all twelve authored cases",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Choose independent case order", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open M05 investigation", exact: true })
    .click();
  const area = shell(page, "M05");
  await expect(area.getByRole("alert")).toContainText(
    "validation is unavailable",
    { timeout: 30000 },
  );
  await expect(
    area.getByRole("heading", { name: "Recover this mission" }),
  ).toHaveCount(0);
  const pending = page.waitForEvent("download");
  await area
    .getByRole("button", {
      name: "Export raw stored recovery data",
      exact: true,
    })
    .click();
  expect(
    JSON.parse(await readFile(await (await pending).path(), "utf8")),
  ).toEqual(original);
  await page.evaluate(() => {
    (
      globalThis as typeof globalThis & { restoreWorker?: () => void }
    ).restoreWorker?.();
  });
  await area
    .getByRole("button", { name: "Retry saved-case inspection", exact: true })
    .click();
  await saved(area, "M05");
  expect(JSON.parse(await portable(page, area)).runId).toBe("worker-failure");
});
test("missing Web Locks permits explicit temporary play and export without shared save writes", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "locks", {
      value: undefined,
      configurable: true,
    });
  });
  const area = await open(page, "M06");
  await expect(area.getByRole("alert")).toContainText(
    "cannot coordinate durable writes",
    { timeout: 30000 },
  );
  await area
    .getByRole("button", {
      name: "Continue as a temporary session",
      exact: true,
    })
    .click();
  await area
    .getByRole("button", { name: "Begin investigation", exact: true })
    .click();
  await tab(area, "M06", "Explore");
  await area
    .locator(".question")
    .filter({ hasText: "Establish the task and business consequence" })
    .getByRole("button")
    .click();
  await expect(area).toContainText("M06 · step 1");
  const save = JSON.parse(await portable(page, area));
  expect(save.commands).toHaveLength(1);
  expect(save.committedRevision).toBeNull();
  const rows = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture module.
    const { database } = await import("/src/expansion/storage.ts");
    return database.rows.toArray();
  });
  expect(rows).toEqual([]);
});
test("a lazy-interface failure still exports the exact stored row through the root emergency boundary", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  const original = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture module.
    const e = await import("/src/engine/engine.ts");
    // @ts-expect-error Vite test fixture module.
    const f = await import("/src/persistence/format.ts");
    // @ts-expect-error Vite test fixture module.
    const { database } = await import("/src/persistence/saves.ts");
    const s = e.createRun("render-recovery", "B"),
      row = {
        id: "active",
        revision: 0,
        current: f.exportSave(s),
        previous: null,
      };
    await database.runs.put(row);
    return row;
  });
  await page.route("**/src/expansion/Expansion.tsx", (route) => route.abort());
  // Navigate directly: the injected module failure may replace the entire
  // home screen before a navigation button's click has finished settling.
  await page.goto("/case/m02");
  await expect(
    page.getByRole("heading", {
      name: "The interface could not load.",
      exact: true,
    }),
  ).toBeVisible({ timeout: 30000 });
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export raw stored row", exact: true })
    .click();
  const raw = JSON.parse(await readFile(await (await pending).path(), "utf8"));
  expect(raw.kind).toBe("threat-hunter-raw-row-recovery");
  expect(raw.row).toEqual(original);
  const unchanged = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture module.
    const { database } = await import("/src/persistence/saves.ts");
    return database.runs.get("active");
  });
  expect(unchanged).toEqual(original);
});

test("case routes refresh and browser history restores loaded investigations without adding commands", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { area } = await start(page, "M03");
  const before = await portable(page, area);
  await expect(page).toHaveURL(/\/case\/m03$/);
  await area.getByRole("button", { name: /THREAT HUNTER.*HOME/ }).click();
  await page
    .getByRole("button", { name: "Open M03 investigation", exact: true })
    .click();
  await saved(area, "M03");
  await page.goBack();
  await expect(
    page.getByRole("heading", {
      name: "Twelve cases. A new question each time.",
      exact: true,
    }),
  ).toBeVisible();
  await page.goForward();
  await saved(area, "M03");
  expect(await portable(page, area)).toBe(before);
  await page.reload();
  await saved(shell(page, "M03"), "M03");
  expect(await portable(page, shell(page, "M03"))).toBe(before);
  await page.goto("/case/m04");
  await expect(
    page
      .locator('[data-mission="M04"]')
      .getByRole("button", { name: "Begin proactive hunt", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.goto("/hunt/free");
  await expect(
    shell(page, "free").getByRole("textbox", {
      name: "Free-hunt seed",
      exact: true,
    }),
  ).toBeVisible({ timeout: 30000 });
});
test("a different free-hunt seed cancels stale audio preparation, uses the next pack and keeps settings/save data separate", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  const seeds = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture module.
    const { createFreeHunt } = await import("/src/expansion/engine.ts");
    const first = createFreeHunt("switch-0", "example");
    for (let i = 1; i < 100; i++) {
      const seed = `switch-${i}`,
        next = createFreeHunt(seed, "example");
      if (next.missionId !== first.missionId)
        return [
          { seed: "switch-0", mission: first.missionId },
          { seed, mission: next.missionId },
        ];
    }
    throw Error("Need distinct template seeds");
  });
  await page
    .getByRole("button", {
      name: "Seeded free hunt · validated templates",
      exact: true,
    })
    .click();
  const area = shell(page, "free");
  await area
    .getByRole("textbox", { name: "Free-hunt seed", exact: true })
    .fill(seeds[0].seed);
  await area
    .getByRole("button", { name: "Begin investigation", exact: true })
    .click();
  await saved(area, "free");
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    `**/audio/${seeds[0].mission.toLowerCase()}/briefing-v1.mp3`,
    async (route) => {
      await gate;
      await route.continue().catch(() => {});
    },
  );
  await area
    .getByRole("button", { name: "Voice & sound", exact: true })
    .click();
  await area
    .getByRole("button", { name: "Enable voice and sound", exact: true })
    .click();
  await expect(
    area.getByText("Loading voice pack…", { exact: true }),
  ).toBeVisible();
  await area
    .getByRole("navigation", {
      name: `${seeds[0].mission} investigation`,
      exact: true,
    })
    .getByRole("button", { name: "Review finding", exact: true })
    .click();
  await area
    .getByRole("region", { name: "Finding confirmation", exact: true })
    .getByRole("button", { name: "Confirm and close case", exact: true })
    .click();
  await saved(area, "free");
  await area
    .getByRole("textbox", { name: "Next free-hunt seed", exact: true })
    .fill(seeds[1].seed);
  await area
    .getByRole("button", { name: "Start another seeded hunt", exact: true })
    .click();
  await saved(area, "free");
  await expect(area).toContainText(`${seeds[1].mission} · step 0`);
  release();
  await area
    .getByRole("button", { name: "Voice & sound", exact: true })
    .click();
  await expect(
    area.getByText("Play muted · voice available", { exact: true }),
  ).toBeVisible();
  await area
    .getByRole("button", { name: "Enable voice and sound", exact: true })
    .click();
  await expect(area.getByText(/Voice pack ready/)).toBeVisible({
    timeout: 30000,
  });
  const before = await portable(page, area),
    data = JSON.parse(before);
  expect(data.manifest.seed).toBe(seeds[1].seed);
  expect(data.manifest.mode).toBe("free");
  expect(data.manifest.missionId).toBe(seeds[1].mission);
  const text = await page.evaluate(async (mission) => {
    // @ts-expect-error Vite test fixture module.
    const { cueMaps } = await import("/src/expansion/audio.ts");
    return cueMaps[mission].get("briefing").text;
  }, seeds[1].mission);
  await context.setOffline(true);
  await area
    .getByRole("button", { name: "Play briefing", exact: true })
    .click();
  await expect(area.locator(".voice-caption")).toContainText(text);
  await area.getByRole("button", { name: "Skip speech", exact: true }).click();
  const master = area.getByRole("slider", {
    name: "Master level",
    exact: true,
  });
  await master.press("Home");
  for (let i = 0; i < 4; i++) await master.press("ArrowRight");
  await expect(master).toHaveValue("0.2");
  expect(await portable(page, area)).toBe(before);
  await context.setOffline(false);
  await area.getByRole("button", { name: /THREAT HUNTER.*HOME/ }).click();
  await page
    .getByRole("button", { name: "Voice & sound", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Master level", exact: true }),
  ).toHaveValue("0.2");
  await page
    .getByRole("button", { name: "Check saved progress", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Your investigation journey", exact: true })
      .getByRole("status"),
  ).toHaveText("0 of 12 cases have a validated saved completion.", {
    timeout: 30000,
  });
  const archives = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture module.
    const { database } = await import("/src/expansion/storage.ts");
    return database.rows.where("id").startsWith("completed:free:").toArray();
  });
  expect(archives).toHaveLength(1);
  expect(archives[0].current.manifest.seed).toBe(seeds[0].seed);
});
test("validated active replacement preserves the original row and resets same-run presentation", async ({
  page,
}) => {
  test.setTimeout(90000);
  const { area, fixture } = await start(page, "M02");
  await collect(area, "M02", fixture.primary);
  const before = await portable(page, area);
  await tab(area, "M02", "Case File");
  await area
    .getByRole("navigation", { name: "M02 Case File steps", exact: true })
    .getByRole("button", { name: "Next step", exact: true })
    .click();
  await area
    .getByRole("textbox", { name: "Optional case notes", exact: true })
    .fill("unsaved buffer");
  const controls = area.locator(".backup-import");
  await controls.locator("summary").first().click();
  await expect(controls.getByRole("checkbox")).toBeDisabled();
  await area
    .getByRole("button", { name: "Save optional notes · free", exact: true })
    .click();
  await saved(area, "M02");
  const original = await page.evaluate(async () => {
    // @ts-expect-error Vite fixture.
    const { database } = await import("/src/expansion/storage.ts");
    return database.rows.get("active:M02");
  });
  await controls.getByRole("checkbox").check();
  await controls.locator('input[type="file"]').setInputFiles({
    name: "earlier.json",
    mimeType: "application/json",
    buffer: Buffer.from(before),
  });
  await saved(area, "M02");
  await expect(
    area
      .getByRole("navigation", { name: "M02 Case File steps", exact: true })
      .getByRole("button", { name: "Explanation", exact: true }),
  ).toHaveAttribute("aria-current", "step");
  const rows = await page.evaluate(async () => {
    // @ts-expect-error Vite fixture.
    const { database } = await import("/src/expansion/storage.ts");
    return database.rows.where("id").startsWith("replaced:M02:").toArray();
  });
  expect(rows).toHaveLength(1);
  expect({ ...rows[0], id: original.id }).toEqual(original);
  const restored = JSON.parse(await portable(page, area));
  expect(restored.snapshot.state.view.finding.notes).toBe("");
});
