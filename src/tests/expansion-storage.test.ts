import { archiveMatches } from "../persistence/archive";
import "fake-indexeddb/auto";
import { beforeEach, expect, it, vi } from "vitest";
import {
  createRun,
  createFreeHunt,
  processCommand,
  acknowledge,
} from "../expansion/engine";
import {
  replaceImported,
  replacementBackups,
  archiveCompleted,
  commit,
  database,
  inspect,
  recover,
  validateRow,
} from "../expansion/storage";
import { exportSave, importSave } from "../expansion/format";
import { request } from "../expansion/validator";

beforeEach(async () => {
  await database.rows.clear();
  vi.restoreAllMocks();
});
it("commits each mission independently and acknowledges only the returned clone", async () => {
  const first = createRun("M02", "m02", "B"),
    other = createRun("M03", "m03", "U-M");
  const next = processCommand(first, {
    kind: "ADVANCE",
    durationTicks: 1,
    runId: "m02",
    expectedRevision: 0,
    commandId: "one",
  }).state;
  const saved = await commit(next, null);
  await commit(other, null);
  expect(next.receipts.one.receipt.durability).toBe("memory_only");
  expect(saved.receipts.one.receipt.durability).toBe("committed");
  expect((await inspect("M02")).state).toEqual(saved);
  expect((await inspect("M03")).state).toEqual(acknowledge(other, 0));
  expect(importSave((await request("export", next)).text!)).toEqual(next);
});
it("retains failed accepted work and retries without replaying its action", async () => {
  const first = createRun("M02", "quota", "M");
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
  expect((await inspect("M02")).state?.view.revision).toBe(0);
  const committed = await commit(next, 0);
  expect(committed.view.tick).toBe(1);
  expect(committed.commands).toHaveLength(1);
  expect((await database.rows.get("active:M02"))?.previous).toEqual(
    exportSave(acknowledge(first, 0)),
  );
  await expect(commit(next, 0)).rejects.toThrow("Another tab");
});
it("rejects a concurrent replacement even at the same saved revision", async () => {
  const initial = createRun("M03", "cas", "U-B");
  await commit(initial, null);
  const next = processCommand(initial, {
    kind: "ADVANCE",
    durationTicks: 1,
    runId: "cas",
    expectedRevision: 0,
    commandId: "next",
  }).state;
  const original = await database.rows.get("active:M03");
  const intercepted = vi
    .spyOn(database.rows, "get")
    .mockResolvedValueOnce(original)
    .mockResolvedValueOnce({ ...original!, previous: original!.current });
  await expect(commit(next, 0)).rejects.toThrow("Another tab");
  intercepted.mockRestore();
  expect((await inspect("M03")).state?.view.revision).toBe(0);
});
it("preserves a corrupt original and restores only a validated previous save", async () => {
  const first = createRun("M02", "recover", "B");
  await commit(first, null);
  const next = processCommand(first, {
    kind: "ADVANCE",
    durationTicks: 1,
    runId: "recover",
    expectedRevision: 0,
    commandId: "one",
  }).state;
  await commit(next, 0);
  await database.rows.update("active:M02", { "current.hash": "00000000" });
  const inspected = await inspect("M02");
  expect(inspected.state).toBeNull();
  expect(inspected.issue?.previous?.view.revision).toBe(0);
  expect(await database.rows.get("original:M02")).toBeUndefined();
  await recover("M02", inspected.issue!.original, inspected.issue!.previous!);
  expect((await inspect("M02")).state?.view.revision).toBe(0);
  expect((await database.rows.get("original:M02"))?.current.hash).toBe(
    "00000000",
  );
});
it("archives only the exact durable completed run and keeps its portable reconstruction", async () => {
  const first = createRun("M03", "closed", "U-M");
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
  expect(await database.rows.get("active:M03")).toBeUndefined();
  const archived = await database.rows.get("completed:M03:closed");
  expect((await validateRow(archived!, "M03")).debrief).toEqual(saved.debrief);
});
it("rejects oversized, hostile and cross-mission records without replacing storage", async () => {
  await commit(createRun("M03", "safe", "U-B"), null);
  const before = await database.rows.get("active:M03");
  expect(() => importSave('"' + "界".repeat(700000) + '"')).toThrow("2 MiB");
  expect(() => importSave('{"__proto__":{}}')).toThrow("Unsafe");
  expect(() => importSave("[".repeat(65) + "]".repeat(65))).toThrow("nesting");
  await expect(validateRow(before!, "M02")).rejects.toThrow("mission");
  expect(await database.rows.get("active:M03")).toEqual(before);
});
it("replaces atomically while preserving the full saved row and completed finding", async () => {
  const first = createRun("M02", "same-id", "B");
  const closed = processCommand(first, {
    kind: "CLOSE_CASE",
    runId: first.view.runId,
    expectedRevision: 0,
    commandId: "close",
    finding: first.view.finding,
  }).state;
  await commit(first, null);
  await commit(closed, 0);
  const before = await database.rows.get("active:M02");
  const incoming = createRun("M02", "replacement", "M");
  const saved = await replaceImported(incoming, "same-id", 1);
  expect((await inspect("M02")).state).toEqual(saved);
  const backups = await replacementBackups("M02");
  expect(backups).toHaveLength(1);
  expect(await database.rows.get(backups[0])).toEqual({
    ...before!,
    id: backups[0],
  });
  expect((await database.rows.get("active:M02"))?.previous).toEqual(
    before?.current,
  );
  expect(
    await validateRow(
      (await database.rows.get("completed:M02:same-id"))!,
      "M02",
    ),
  ).toEqual(acknowledge(closed, 1));
  const all = await database.rows.toArray();
  await expect(replaceImported(first, "same-id", 1)).rejects.toThrow("changed");
  expect(await database.rows.toArray()).toEqual(all);
});
it("preserves colliding completed run IDs instead of overwriting archives", async () => {
  for (const world of ["B", "M"] as const) {
    const first = createRun("M02", "colliding", world);
    const closed = processCommand(first, {
      kind: "CLOSE_CASE",
      runId: "colliding",
      expectedRevision: 0,
      commandId: "close",
      finding: first.view.finding,
    }).state;
    const saved = await commit(closed, null);
    await archiveCompleted(saved);
  }
  const rows = await database.rows.toArray();
  expect(rows).toHaveLength(2);
  expect(rows.every((row) => archiveMatches(row.id, "M02", "colliding"))).toBe(
    true,
  );
  expect(
    (await Promise.all(rows.map((row) => validateRow(row, "M02"))))
      .map((s) => s.world)
      .sort(),
  ).toEqual(["B", "M"]);
});
it("keeps seeded free replacement separate from an authored slot and rolls back failed writes", async () => {
  const free = createFreeHunt("separate", "free-one");
  const authored = createRun(free.missionId, "authored", "B");
  await commit(free, null);
  await commit(authored, null);
  const before = await database.rows.toArray();
  const write = vi
    .spyOn(database.rows, "put")
    .mockRejectedValueOnce(Error("QuotaExceededError"));
  await expect(
    replaceImported(createFreeHunt("new", "free-two"), "free-one", 0),
  ).rejects.toThrow("Quota");
  write.mockRestore();
  expect(await database.rows.toArray()).toEqual(before);
  await replaceImported(createFreeHunt("new", "free-two"), "free-one", 0);
  expect((await inspect(free.missionId)).state?.view.runId).toBe("authored");
  expect((await inspect("free")).state?.view.runId).toBe("free-two");
});
it("commits successive accepted free-hunt commands to the free slot and resumes their exact history", async () => {
  let state = createFreeHunt("free-command-regression", "free-actions");
  state = await commit(state, null);
  for (let i = 0; i < 3; i++) {
    const next = processCommand(state, {
      kind: "ADVANCE",
      durationTicks: 1,
      runId: state.view.runId,
      commandId: `free-${i}`,
      expectedRevision: state.view.revision,
    }).state;
    state = await commit(next, state.view.revision);
  }
  expect((await inspect("free")).state).toEqual(state);
  expect(state.view.tick).toBe(3);
  expect(await database.rows.get(`active:${state.missionId}`)).toBeUndefined();
});
