import { test, expect } from "@playwright/test";

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
  await expect(page.getByRole("status")).toHaveText("Save needs recovery");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export recovery original" }).click();
  expect((await download).suggestedFilename()).toContain("recovery-original");
  await page
    .getByRole("button", { name: "Restore previous save · step 1" })
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
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
  await expect(page.getByRole("status")).toHaveText("No active case");
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
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
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  await page.evaluate(() => localStorage.setItem("test-fail-save", "yes"));
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await expect(page.getByRole("status")).toHaveText("Not saved");
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
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
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
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByText(/Read-only: another tab/)).toBeVisible();
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  await page.close();
  await expect(second.getByText(/Read-only: another tab/)).toHaveCount(0);
  await second.getByRole("button", { name: "Resume investigation" }).click();
  await expect(second.locator(".step-badge")).toContainText("STEP 1");
});
