import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("long-history import validates in a worker and preserves every free edit", async ({
  page,
}) => {
  test.setTimeout(90000);
  const workers: string[] = [];
  page.on("worker", (worker) => workers.push(worker.url()));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Begin investigation" }),
  ).toBeEnabled();
  const text = await page.evaluate(async () => {
    // @ts-expect-error Vite browser import.
    const { createRun, processCommand } = await import("/src/engine/engine.ts");
    // @ts-expect-error Vite browser import.
    const { exportSave } = await import("/src/persistence/format.ts");
    let state = createRun("long-browser-history", "M");
    for (let i = 0; i < 350; i++)
      state = processCommand(state, {
        kind: "EDIT_CASE",
        commandId: "edit-" + i,
        runId: state.view.runId,
        expectedRevision: i,
        draft: { ...state.view.draft, optionalNotes: "History edit " + i },
      }).state;
    return JSON.stringify(exportSave(state));
  });
  expect(workers.some((url) => url.includes("validationWorker"))).toBe(true);
  await page.locator('input[type="file"]').setInputFiles({
    name: "history.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  await expect(page.getByRole("status")).toHaveText("Saved on this device", {
    timeout: 60000,
  });
  const restored = await page.evaluate(async () => {
    // @ts-expect-error Vite browser import.
    const { load } = await import("/src/persistence/saves.ts");
    const state = await load();
    return {
      revision: state.view.revision,
      tick: state.view.tick,
      commands: state.commands.length,
      notes: state.view.draft.optionalNotes,
      committed: state.persistence.committedRevision,
    };
  });
  expect(restored).toEqual({
    revision: 350,
    tick: 0,
    commands: 350,
    notes: "History edit 349",
    committed: 350,
  });
});

test("worker failure retains the durable row and retry commits the action only once", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message) {
      if (
        Reflect.get(window, "failSaveValidation") &&
        (message.text !== undefined || message.state !== undefined)
      )
        throw new Error("Injected worker failure");
      post.call(this, message);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  await page.evaluate(() => Reflect.set(window, "failSaveValidation", true));
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await expect(page.getByRole("status")).toHaveText("Not saved");
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Vite browser import.
      const { database } = await import("/src/persistence/saves.ts");
      return (await database.runs.get("active")).revision;
    }),
  ).toBe(0);
  await expect(page.locator(".step-badge")).toContainText("STEP 1");
  await page.evaluate(() => Reflect.set(window, "failSaveValidation", false));
  await page
    .getByRole("button", { name: "Retry saving retained progress" })
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Vite browser import.
      const { load } = await import("/src/persistence/saves.ts");
      const state = await load();
      return {
        revision: state.view.revision,
        tick: state.view.tick,
        commands: state.commands.length,
      };
    }),
  ).toEqual({ revision: 1, tick: 1, commands: 1 });
});

test("blocked validator startup preserves an existing case and offers a raw recovery export", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  const before = await page.evaluate(async () => {
    // @ts-expect-error Vite browser import.
    const { database } = await import("/src/persistence/saves.ts");
    return database.runs.get("active");
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, "Worker", {
      value: class {
        constructor() {
          throw new Error("Injected startup failure");
        }
      },
    });
  });
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(
    "Not saved — save validation unavailable",
  );
  await expect(
    page.getByText("Save needs recovery", { exact: true }),
  ).toHaveCount(0);
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export stored recovery data" })
    .click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("threat-hunter-stored-recovery.json");
  expect(JSON.parse(await readFile((await file.path())!, "utf8"))).toEqual(
    before,
  );
  await page
    .getByRole("button", { name: "Continue explicitly without saving" })
    .click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Temporary session — not saved",
  );
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Vite browser import.
      const { database } = await import("/src/persistence/saves.ts");
      return database.runs.get("active");
    }),
  ).toEqual(before);
});
