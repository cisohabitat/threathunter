import "fake-indexeddb/auto";
import { beforeEach, expect, it, vi } from "vitest";
import { createRun, processCommand, acknowledge } from "../campaign/engine";
import {
  replaceImported,
  replacementBackups,
  archiveCompleted,
  commit,
  database,
  inspect,
  recover,
  validateRow,
} from "../campaign/storage";
import { exportSave, importSave } from "../campaign/format";
import { request } from "../campaign/validator";

beforeEach(async () => {
  await database.rows.clear();
  vi.restoreAllMocks();
});
it("commits each mission independently and acknowledges only the returned clone", async () => {
  const first = createRun("M04", "m04", "B"),
    other = createRun("M07", "m07", "U-M");
  const next = processCommand(first, {
    kind: "ADVANCE",
    durationTicks: 1,
    runId: "m04",
    expectedRevision: 0,
    commandId: "one",
  }).state;
  const saved = await commit(next, null);
  await commit(other, null);
  expect(next.receipts.one.receipt.durability).toBe("memory_only");
  expect(saved.receipts.one.receipt.durability).toBe("committed");
  expect((await inspect("M04")).state).toEqual(saved);
  expect((await inspect("M07")).state).toEqual(acknowledge(other, 0));
  expect(importSave((await request("export", next)).text!)).toEqual(next);
});
it("retains failed accepted work and retries without replaying its action", async () => {
  const first = createRun("M04", "quota", "M");
  await commit(first, null);
  const next = processCommand(first, {
    kind: "ADVANCE",
    durationTicks: 1,
    runId: "quota",
    expectedRevision: 0,
    commandId: "once",
  }).state;
  const write = vi
    .spyOn(database.rows, "put")
    .mockRejectedValueOnce(new Error("QuotaExceededError"));
  await expect(commit(next, 0)).rejects.toThrow("Quota");
  expect(next.receipts.once.receipt.durability).toBe("memory_only");
  write.mockRestore();
  expect((await inspect("M04")).state?.view.revision).toBe(0);
  const committed = await commit(next, 0);
  expect(committed.view.tick).toBe(1);
  expect(committed.commands).toHaveLength(1);
  expect((await database.rows.get("active:M04"))?.previous).toEqual(
    exportSave(acknowledge(first, 0)),
  );
  await expect(commit(next, 0)).rejects.toThrow("Another tab");
});
it("rejects a concurrent replacement even at the same saved revision", async () => {
  const initial = createRun("M07", "cas", "U-B");
  await commit(initial, null);
  const next = processCommand(initial, {
    kind: "ADVANCE",
    durationTicks: 1,
    runId: "cas",
    expectedRevision: 0,
    commandId: "next",
  }).state;
  const original = await database.rows.get("active:M07");
  const intercepted = vi
    .spyOn(database.rows, "get")
    .mockResolvedValueOnce(original)
    .mockResolvedValueOnce({ ...original!, previous: original!.current });
  await expect(commit(next, 0)).rejects.toThrow("Another tab");
  intercepted.mockRestore();
  expect((await inspect("M07")).state?.view.revision).toBe(0);
});
it("preserves a corrupt original and restores only a validated previous save", async () => {
  const first = createRun("M04", "recover", "B");
  await commit(first, null);
  const next = processCommand(first, {
    kind: "ADVANCE",
    durationTicks: 1,
    runId: "recover",
    expectedRevision: 0,
    commandId: "one",
  }).state;
  await commit(next, 0);
  await database.rows.update("active:M04", { "current.hash": "00000000" });
  const inspected = await inspect("M04");
  expect(inspected.state).toBeNull();
  expect(inspected.issue?.previous?.view.revision).toBe(0);
  expect(await database.rows.get("original:M04")).toBeUndefined();
  await recover("M04", inspected.issue!.original, inspected.issue!.previous!);
  expect((await inspect("M04")).state?.view.revision).toBe(0);
  expect((await database.rows.get("original:M04"))?.current.hash).toBe(
    "00000000",
  );
});
it("archives only the exact durable completed run and keeps its portable reconstruction", async () => {
  const first = createRun("M07", "closed", "U-M");
  await commit(first, null);
  const closed = processCommand(first, {
    kind: "CLOSE_CASE",
    runId: "closed",
    expectedRevision: 0,
    commandId: "close",
    finding: first.view.finding,
  }).state;
  await expect(archiveCompleted(closed)).rejects.toThrow("exact closed");
  const saved = await commit(closed, 0);
  await archiveCompleted(saved);
  expect(await database.rows.get("active:M07")).toBeUndefined();
  const archived = await database.rows.get("completed:M07:closed");
  expect((await validateRow(archived!, "M07")).debrief).toEqual(saved.debrief);
});
it("rejects oversized, hostile and cross-mission records without replacing storage", async () => {
  await commit(createRun("M07", "safe", "U-B"), null);
  const before = await database.rows.get("active:M07");
  expect(() => importSave('"' + "界".repeat(700000) + '"')).toThrow("2 MiB");
  expect(() => importSave('{"__proto__":{}}')).toThrow("Unsafe");
  expect(() => importSave("[".repeat(65) + "]".repeat(65))).toThrow("nesting");
  await expect(validateRow(before!, "M04")).rejects.toThrow("mission");
  expect(await database.rows.get("active:M07")).toEqual(before);
});

it("preserves the exact P1 row on validated active replacement and rejects stale replacement", async () => {
  const old = createRun("M04", "old", "B");
  await commit(old, null);
  const row = await database.rows.get("active:M04");
  const saved = await replaceImported(
    createRun("M04", "incoming", "M"),
    "old",
    0,
  );
  expect((await inspect("M04")).state).toEqual(saved);
  const ids = await replacementBackups("M04");
  expect(ids).toHaveLength(1);
  expect(await database.rows.get(ids[0])).toEqual({ ...row!, id: ids[0] });
  const before = await database.rows.toArray();
  await expect(replaceImported(old, "old", 0)).rejects.toThrow("changed");
  expect(await database.rows.toArray()).toEqual(before);
});
