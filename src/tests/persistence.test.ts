import "fake-indexeddb/auto";
import { beforeEach, it, expect, vi } from "vitest";
import {
  database,
  commit,
  load,
  exportSave,
  importSave,
} from "../persistence/saves";
import { markCommitted } from "../persistence/format";
import { createRun, processCommand } from "../engine/engine";
beforeEach(async () => {
  await database.runs.clear();
});
it("atomically saves and restores an active run", async () => {
  const run = createRun("saved", "B");
  await commit(run, null);
  expect(await load()).toEqual(markCommitted(run));
});
it("rejects a second-tab stale write without replacing the saved state", async () => {
  const first = createRun("saved", "M");
  await commit(first, null);
  const next = processCommand(first, {
    kind: "ADVANCE",
    durationTicks: 1,
    commandId: "one",
    runId: "saved",
    expectedRevision: 0,
  }).state;
  await commit(next, 0);
  await expect(commit(next, 0)).rejects.toThrow("Another tab");
  expect(await load()).toEqual(markCommitted(next));
  const row = await database.runs.get("active");
  expect(row?.previous).toEqual(exportSave(markCommitted(first)));
});
it("does not replace a different active case on new-run or import", async () => {
  await commit(createRun("one", "B"), null);
  await expect(commit(createRun("two", "M"), null)).rejects.toThrow(
    "already exists",
  );
});
it("rejects corrupt, incompatible and unsafe saves", () => {
  const save = exportSave(createRun("save", "B"));
  expect(() =>
    importSave(JSON.stringify({ ...save, runId: "changed" })),
  ).toThrow("checksum");
  expect(() =>
    importSave(JSON.stringify({ ...save, ruleset: "9.0" })),
  ).toThrow();
  expect(() => importSave('{"__proto__":{}}')).toThrow("Unsafe");
  expect(() => importSave("[".repeat(65) + "]".repeat(65))).toThrow("nesting");
});

it("offers only a validated previous save and preserves the damaged original on recovery", async () => {
  const { inspectSave, resolveRecovery } = await import("../persistence/saves");
  const first = createRun("recover", "B");
  const next = processCommand(first, {
    kind: "ADVANCE",
    durationTicks: 1,
    commandId: "step",
    runId: "recover",
    expectedRevision: 0,
  }).state;
  await commit(first, null);
  await commit(next, 0);
  await database.runs.update("active", { "current.hash": "00000000" });
  const inspected = await inspectSave();
  expect(inspected.state).toBeNull();
  expect(inspected.issue?.previous).toEqual(markCommitted(first));
  expect(await database.runs.get("recovery-original")).toBeUndefined();
  expect(await resolveRecovery(inspected.issue!.original, "previous")).toEqual(
    markCommitted(first),
  );
  expect(await load()).toEqual(markCommitted(first));
  expect((await database.runs.get("recovery-original"))?.current.hash).toBe(
    "00000000",
  );
});

it("does not recover over a save changed since inspection", async () => {
  const { inspectSave, resolveRecovery } = await import("../persistence/saves");
  await commit(createRun("recover", "M"), null);
  await database.runs.update("active", { "current.hash": "00000000" });
  const issue = (await inspectSave()).issue!;
  await database.runs.update("active", { revision: 99 });
  await expect(resolveRecovery(issue.original, "restart")).rejects.toThrow(
    "Another tab",
  );
  expect((await database.runs.get("active"))?.revision).toBe(99);
});

it("requires explicit restart for incompatible saves without a valid backup", async () => {
  const { inspectSave, resolveRecovery } = await import("../persistence/saves");
  await commit(createRun("unsupported", "B"), null);
  await database.runs.update("active", {
    // @ts-expect-error Deliberately inject an incompatible stored version.
    "current.ruleset": "future",
    previous: null,
  });
  const issue = (await inspectSave()).issue!;
  expect(issue.previous).toBeNull();
  await resolveRecovery(issue.original, "restart");
  expect(await load()).toBeNull();
  expect((await database.runs.get("recovery-original"))?.current.ruleset).toBe(
    "future",
  );
});

it("rejects inconsistent row revisions rather than overwriting a corrupt save", async () => {
  const run = createRun("revision", "B");
  await commit(run, null);
  await database.runs.update("active", { revision: 9 });
  await expect(load()).rejects.toThrow("revision");
  await expect(commit(run, 9)).rejects.toThrow("revision");
  expect((await database.runs.get("active"))?.revision).toBe(9);
});

it("rolls back a quota failure and retries the prepared state without replaying its action", async () => {
  const first = createRun("quota", "B");
  await commit(first, null);
  const next = processCommand(first, {
    kind: "ADVANCE",
    durationTicks: 1,
    commandId: "once",
    runId: "quota",
    expectedRevision: 0,
  }).state;
  const write = vi
    .spyOn(database.runs, "put")
    .mockRejectedValueOnce(new DOMException("Full", "QuotaExceededError"));
  await expect(commit(next, 0)).rejects.toThrow("Full");
  write.mockRestore();
  expect(next.receipts.once.receipt.durability).toBe("memory_only");
  expect(next.persistence.committedRevision).toBeNull();
  expect(await load()).toEqual(markCommitted(first));
  const acknowledged = await commit(next, 0);
  expect(acknowledged.receipts.once.receipt.durability).toBe("committed");
  expect(next.receipts.once.receipt.durability).toBe("memory_only");
  const resumed = await load();
  expect(resumed).toEqual(markCommitted(next));
  expect(resumed?.commands).toHaveLength(1);
  expect(resumed?.view.tick).toBe(1);
});

it("archives only the exact durably closed run and preserves its frozen report for export", async () => {
  const { archiveCompleted, completedCases } =
    await import("../persistence/saves");
  let state = createRun("completed", "B");
  await commit(state, null);
  await expect(archiveCompleted("completed", 0)).rejects.toThrow("closed");
  state = processCommand(state, {
    kind: "CLOSE_CASE",
    draft: state.view.draft,
    commandId: "close",
    runId: "completed",
    expectedRevision: 0,
  }).state;
  await commit(state, 0);
  await expect(archiveCompleted("completed", 0)).rejects.toThrow("changed");
  await archiveCompleted("completed", 1);
  expect(await load()).toBeNull();
  const archived = await database.runs.get("completed:completed");
  expect(importSave(JSON.stringify(archived?.current)).debrief).toEqual(
    state.debrief,
  );
  expect(await completedCases()).toEqual([
    { id: "completed:completed", closeTick: 0 },
  ]);
});

it("rejects a same-revision row replacement while validation is in progress", async () => {
  const first = createRun("same-revision-race", "M");
  await commit(first, null);
  const next = processCommand(first, {
    kind: "ADVANCE",
    durationTicks: 1,
    commandId: "advance",
    runId: first.view.runId,
    expectedRevision: 0,
  }).state;
  const read = database.runs.get.bind(database.runs);
  const spy = vi.spyOn(database.runs, "get").mockImplementationOnce(() =>
    database.transaction("rw", database.runs, async () => {
      const original = await read("active");
      await database.runs.update("active", { previous: exportSave(first) });
      return original;
    }),
  );
  try {
    await expect(commit(next, 0)).rejects.toThrow("Another tab");
  } finally {
    spy.mockRestore();
  }
  const stored = await database.runs.get("active");
  expect(stored?.revision).toBe(0);
  expect(stored?.previous).toEqual(exportSave(first));
});
