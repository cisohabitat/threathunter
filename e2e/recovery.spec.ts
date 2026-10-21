import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem("threat-hunter-guidance-v1", "independent"));
});

test("damaged current save recovers pending checks from the previous commit exactly once", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    // @ts-expect-error Vite resolves these browser imports.
    const { createRun, processCommand } = await import("/src/engine/engine.ts");
    // @ts-expect-error Vite resolves these browser imports.
    const { commit, database } = await import("/src/persistence/saves.ts");
    const first = createRun("recover-pending", "B");
    await commit(first, null);
    const requested = processCommand(first, {
      kind: "REQUEST_CHECK",
      commandId: "verify",
      runId: first.view.runId,
      expectedRevision: 0,
      subjectId: "U-01",
      check: "directory_callback",
    });
    if (requested.receipt.status !== "accepted")
      throw Error(JSON.stringify(requested.receipt));
    await commit(requested.state, 0);
    const advanced = processCommand(requested.state, {
      kind: "ADVANCE",
      durationTicks: 1,
      commandId: "advance",
      runId: first.view.runId,
      expectedRevision: 1,
    }).state;
    await commit(advanced, 1);
    await database.runs.update("active", { "current.hash": "00000000" });
  });
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Save needs recovery");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export recovery original" }).click();
  expect((await download).suggestedFilename()).toContain("recovery-original");
  await page
    .getByRole("button", { name: "Restore previous save · step 1" })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  await page.getByRole("button", { name: "Resume investigation" }).click();
  await expect(page.locator(".step-badge")).toContainText("STEP 1");
  const before = await page.evaluate(async () => {
    // @ts-expect-error Browser import.
    const { load } = await import("/src/persistence/saves.ts");
    const state = await load();
    return {
      revision: state.view.revision,
      pending: state.view.pendingChecks,
      commands: state.commands.length,
    };
  });
  expect(before.revision).toBe(1);
  expect(before.commands).toBe(1);
  expect(before.pending).toHaveLength(1);
  await page.reload();
  const after = await page.evaluate(async () => {
    // @ts-expect-error Browser import.
    const { load } = await import("/src/persistence/saves.ts");
    const state = await load();
    return {
      revision: state.view.revision,
      pending: state.view.pendingChecks,
      commands: state.commands.length,
    };
  });
  expect(after).toEqual(before);
});

test("unsupported save requires explicit restart and keeps original data", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    // @ts-expect-error Browser import.
    const { createRun } = await import("/src/engine/engine.ts");
    // @ts-expect-error Browser import.
    const { commit, database } = await import("/src/persistence/saves.ts");
    await commit(createRun("future-case", "B"), null);
    await database.runs.update("active", { "current.ruleset": "future" });
  });
  await page.reload();
  await expect(
    page.getByText("No valid previous save is available."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Begin investigation" }),
  ).toBeDisabled();
  const restart = page.getByRole("button", {
    name: "Restart after preserving original",
  });
  await expect(restart).toBeDisabled();
  await page.getByRole("checkbox", { name: /I understand restarting/ }).check();
  await restart.click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("No active case");
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Browser import.
      const { database } = await import("/src/persistence/saves.ts");
      return (await database.runs.get("recovery-original")).current.ruleset;
    }),
  ).toBe("future");
});

test("quota failure retains actions and retry saves them without applying them twice", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === "runs" && localStorage.getItem("test-fail-save"))
        throw new DOMException("Injected quota failure", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page.goto("/");
  await page.getByText(/^Play settings ·/).click();
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  await page.evaluate(() => localStorage.setItem("test-fail-save", "yes"));
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Not saved");
  await expect(page.locator(".step-badge")).toContainText("STEP 1");
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Browser import.
      const { load } = await import("/src/persistence/saves.ts");
      return (await load()).view.tick;
    }),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Continue explicitly without saving" })
    .click();
  await expect(
    page.getByText("Last saved revision: 0.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Collect through step 1 · 1 step" })
    .first()
    .click();
  await expect(page.locator(".step-badge")).toContainText("STEP 2");
  await page.evaluate(() => localStorage.removeItem("test-fail-save"));
  await page.getByRole("button", { name: "Try saving this session" }).click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  await page.reload();
  await page.getByRole("button", { name: "Resume investigation" }).click();
  await expect(page.locator(".step-badge")).toContainText("STEP 2");
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Browser import.
      const { load } = await import("/src/persistence/saves.ts");
      return (await load()).commands.length;
    }),
  ).toBe(2);
});

test("waiting tab refreshes the committed case when writer ownership transfers", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByText(/^Play settings ·/).click();
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByText(/Read-only: another tab/)).toBeVisible();
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  await page.close();
  await expect(second.getByText(/Read-only: another tab/)).toHaveCount(0);
  await second.getByRole("button", { name: "Resume investigation" }).click();
  await expect(second.locator(".step-badge")).toContainText("STEP 1");
});

test("trying another approach retains the original completed case and replays its world with a new run ID", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin investigation" }).click();
  const original = await page.evaluate(async () => {
    // @ts-expect-error Browser import.
    const { load } = await import("/src/persistence/saves.ts");
    const state = await load();
    return { world: state.world, runId: state.view.runId };
  });
  await page
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Case File/ })
    .click();
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Confirm and close case" }).click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  await page.getByRole("button", { name: "Try another approach →" }).click();
  await expect(
    page.getByText("Saved completed investigations · export for review", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  const replay = await page.evaluate(async () => {
    // @ts-expect-error Browser import.
    const { load, database } = await import("/src/persistence/saves.ts");
    const state = await load();
    return {
      world: state.world,
      runId: state.view.runId,
      tick: state.view.tick,
      archives: (
        await database.runs.where("id").startsWith("completed:").toArray()
      ).length,
    };
  });
  expect(replay.world).toBe(original.world);
  expect(replay.runId).not.toBe(original.runId);
  expect(replay.tick).toBe(0);
  expect(replay.archives).toBe(1);
});

test("invalid and oversized imports leave storage intact and show player-safe errors", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.locator("input[type=file]");
  await expect(input).toBeEnabled();
  await input.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        ruleset: "4.0.0",
        runId: "bad",
        world: "unknown",
        commands: [],
        hash: "00000000",
      }),
    ),
  });
  await expect(page.getByRole("alert")).toContainText(
    "unsupported save fields or versions",
  );
  await expect(page.getByRole("alert")).not.toContainText("U-M");
  await input.setInputFiles({
    name: "too-large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1, 32),
  });
  await expect(page.getByRole("alert")).toContainText("Save exceeds 2 MiB");
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Browser import.
      const { load } = await import("/src/persistence/saves.ts");
      return await load();
    }),
  ).toBeNull();
});

test("rejected Web Locks access offers temporary play without a durable write", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "locks", {
      value: {
        request: () =>
          Promise.reject(new DOMException("Unavailable", "SecurityError")),
      },
      configurable: true,
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("Autosave is read-only in this browser.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Begin investigation" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Continue explicitly without saving" })
    .click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Temporary session — not saved");
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Browser import.
      const { database } = await import("/src/persistence/saves.ts");
      return database.runs.get("active");
    }),
  ).toBeUndefined();
});

test("waiting reader receives committed observations and notes before taking ownership", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.getByText(/^Play settings ·/).click();
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByText(/Read-only: another tab/)).toBeVisible();
  await second.getByRole("button", { name: "Resume investigation" }).click();
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await expect(second.locator(".step-badge")).toContainText("STEP 1");
  for (const tab of [page, second]) {
    await tab
      .getByRole("navigation", { name: "Investigation", exact: true })
      .getByRole("button", { name: /Case File/ })
      .click();
    await tab
      .getByRole("navigation", { name: "Case File steps" })
      .getByRole("button", { name: /Next step/ })
      .click();
  }
  const ownerNotes = page.getByRole("textbox", {
    name: "Optional notes · not graded",
  });
  const readerNotes = second.getByRole("textbox", {
    name: "Optional notes · not graded",
  });
  await expect(readerNotes).toBeDisabled();
  await ownerNotes.fill("Committed owner note remains intact after transfer.");
  await page.getByRole("button", { name: "Save notes · free" }).click();
  await expect(readerNotes).toHaveValue(
    "Committed owner note remains intact after transfer.",
  );
  await second
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Explore/ })
    .click();
  await ownerNotes.fill(
    "Second committed note arrives while the reader is elsewhere.",
  );
  await page.getByRole("button", { name: "Save notes · free" }).click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  await second
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Case File/ })
    .click();
  await expect(readerNotes).toHaveValue(
    "Second committed note arrives while the reader is elsewhere.",
  );
  await page.close();
  await expect(readerNotes).toBeEnabled();
  await expect(readerNotes).toHaveValue(
    "Second committed note arrives while the reader is elsewhere.",
  );
  await expect(
    second.getByRole("button", { name: "Save notes · free" }),
  ).toBeDisabled();
});
