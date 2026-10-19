import "fake-indexeddb/auto";
import { beforeEach, it, expect } from "vitest";
import {
  database,
  commit,
  load,
  clearSave,
  exportSave,
  importSave,
} from "../persistence/saves";
import { createRun, processCommand } from "../engine/engine";
beforeEach(async () => {
  await clearSave();
});
it("atomically saves and restores an active run", async () => {
  const run = createRun("saved", "B");
  await commit(run, null);
  expect(await load()).toEqual(run);
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
  expect(await load()).toEqual(next);
  const row = await database.runs.get("active");
  expect(row?.previous).toEqual(exportSave(first));
});
it("does not replace a different active case on new-run or import", async () => {
  await commit(createRun("one", "B"), null);
  await expect(commit(createRun("two", "M"), null)).rejects.toThrow(
    "already exists",
  );
});
it("rejects corrupt, incompatible and unsafe saves", () => {
  const save = exportSave(createRun("save", "B"));
  expect(() => importSave(JSON.stringify({ ...save, world: "M" }))).toThrow(
    "checksum",
  );
  expect(() =>
    importSave(JSON.stringify({ ...save, ruleset: "9.0" })),
  ).toThrow();
  expect(() => importSave('{"__proto__":{}}')).toThrow("Unsafe");
  expect(() => importSave("[".repeat(65) + "]".repeat(65))).toThrow("nesting");
});
