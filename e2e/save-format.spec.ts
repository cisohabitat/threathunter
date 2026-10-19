import { test, expect } from "@playwright/test";

test("legacy save upgrades only on successful commit and retains its original backup", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  const original = await page.evaluate(async () => {
    // @ts-expect-error Vite browser module.
    const { createRun, processCommand } = await import("/src/engine/engine.ts");
    // @ts-expect-error Vite browser module.
    const { exportLegacySave } = await import("/src/persistence/format.ts");
    // @ts-expect-error Vite browser module.
    const { database } = await import("/src/persistence/saves.ts");
    let state = createRun("legacy-browser", "B");
    state = processCommand(state, {
      kind: "REQUEST_CHECK",
      check: "directory_callback",
      subjectId: "U-01",
      runId: state.view.runId,
      commandId: "legacy-check",
      expectedRevision: 0,
    }).state;
    state = processCommand(state, {
      kind: "EDIT_CASE",
      draft: {
        ...state.view.draft,
        optionalNotes: "An existing note must survive.",
      },
      runId: state.view.runId,
      commandId: "legacy-note",
      expectedRevision: 1,
    }).state;
    const current = exportLegacySave(state);
    await database.runs.put({
      id: "active",
      revision: 2,
      current,
      previous: null,
    });
    return current;
  });
  await page.reload();
  await page.getByRole("button", { name: "Resume investigation" }).click();
  await expect(page.locator(".step-badge")).toContainText("STEP 1");
  await expect(page.getByText("Play muted · voice available")).toBeVisible();
  const before = await page.evaluate(async () => {
    // @ts-expect-error Vite browser module.
    const { database, load } = await import("/src/persistence/saves.ts");
    const state = await load();
    return {
      row: await database.runs.get("active"),
      due: state.view.pendingChecks[0].dueTick,
      note: state.view.draft.optionalNotes,
      durability: state.receipts["legacy-check"].receipt.durability,
    };
  });
  expect(before.row.current).toEqual(original);
  expect(before.durability).toBe("committed");
  expect(before.note).toContain("existing note");
  await page
    .getByRole("button", { name: "Collect through step 1 · 1 step" })
    .first()
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  const after = await page.evaluate(async () => {
    // @ts-expect-error Vite browser module.
    const { database, load } = await import("/src/persistence/saves.ts");
    return { row: await database.runs.get("active"), state: await load() };
  });
  expect(after.row.current.schemaVersion).toBe(2);
  expect(after.row.current.latestCommittedRevision).toBe(3);
  expect(after.row.current.snapshot.throughRevision).toBe(3);
  expect(after.row.previous).toEqual(original);
  expect(after.state.view.tick).toBe(2);
  expect(after.state.view.pendingChecks[0].dueTick).toBe(before.due);
  expect(after.state.view.draft.optionalNotes).toBe(before.note);
  expect(
    Object.values(after.state.receipts).every(
      (entry: { receipt: { durability: string } }) =>
        entry.receipt.durability === "committed",
    ),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Resume investigation" }).click();
  await expect(page.locator(".step-badge")).toContainText("STEP 2");
});

test("failed upgrade keeps legacy data and memory-only receipts until retry commits", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === "runs" && localStorage.getItem("test-fail-upgrade"))
        throw new DOMException("Injected full storage", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.evaluate(async () => {
    // @ts-expect-error Vite browser module.
    const { createRun } = await import("/src/engine/engine.ts");
    // @ts-expect-error Vite browser module.
    const { exportLegacySave } = await import("/src/persistence/format.ts");
    // @ts-expect-error Vite browser module.
    const { database } = await import("/src/persistence/saves.ts");
    await database.runs.put({
      id: "active",
      revision: 0,
      current: exportLegacySave(createRun("failed-upgrade", "M")),
      previous: null,
    });
  });
  await page.reload();
  await page.getByRole("button", { name: "Resume investigation" }).click();
  await page.evaluate(() => localStorage.setItem("test-fail-upgrade", "yes"));
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await expect(page.getByRole("status")).toHaveText("Not saved");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export save", exact: true }).click();
  const download = await downloading;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const portable = JSON.parse(Buffer.concat(chunks).toString());
  expect(portable.latestCommittedRevision).toBe(0);
  const receipts = Object.values(portable.snapshot.state.receipts) as {
    receipt: { durability: string };
  }[];
  expect(receipts).toHaveLength(1);
  expect(receipts[0].receipt.durability).toBe("memory_only");
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Vite browser module.
      const { database } = await import("/src/persistence/saves.ts");
      return (await database.runs.get("active")).current.schemaVersion;
    }),
  ).toBe(1);
  await page.evaluate(() => localStorage.removeItem("test-fail-upgrade"));
  await page
    .getByRole("button", { name: "Retry saving retained progress" })
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  const saved = await page.evaluate(async () => {
    // @ts-expect-error Vite browser module.
    const { load } = await import("/src/persistence/saves.ts");
    const state = await load();
    return {
      revision: state.view.revision,
      tick: state.view.tick,
      receipts: Object.values(state.receipts).map(
        (entry: { receipt: { durability: string } }) =>
          entry.receipt.durability,
      ),
    };
  });
  expect(saved).toEqual({ revision: 1, tick: 1, receipts: ["committed"] });
});
