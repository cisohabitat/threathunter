import "fake-indexeddb/auto";
import { beforeEach, expect, it, vi } from "vitest";
import { database as m01DB } from "../persistence/saves";
import { exportSave, exportLegacySave } from "../persistence/format";
import { createRun, processCommand } from "../engine/engine";
import { database as p1DB } from "../campaign/storage";
import {
  createRun as createP1,
  processCommand as commandP1,
} from "../campaign/engine";
import { exportSave as exportP1 } from "../campaign/format";
import * as validator from "../campaign/validator";
import { loadProgress } from "../journey/load";
import { nextCase } from "../journey/contracts";

beforeEach(async () => {
  vi.restoreAllMocks();
  await m01DB.runs.clear();
  await p1DB.rows.clear();
});
function closed01(id: string) {
  const s = createRun(id, "M");
  return processCommand(s, {
    kind: "CLOSE_CASE",
    draft: s.view.draft,
    commandId: "close",
    runId: id,
    expectedRevision: 0,
  }).state;
}
function closedP1(mission: "M04" | "M07", id: string) {
  const s = createP1(mission, id, "U-M");
  return commandP1(s, {
    kind: "CLOSE_CASE",
    finding: s.view.finding,
    commandId: "close",
    runId: id,
    expectedRevision: 0,
  }).state;
}
const rows = async () =>
  JSON.stringify([await m01DB.runs.toArray(), await p1DB.rows.toArray()]);
it("recommends M01 without inventing completion for empty storage", async () => {
  const progress = await loadProgress();
  expect(progress.map((p) => p.active)).toEqual(["none", "none", "none"]);
  expect(progress.every((p) => !p.completed)).toBe(true);
  expect(nextCase(progress)).toBe("M01");
});
it("recognises low-score closures in all three cases with no save mutation or private summary fields", async () => {
  const m01 = closed01("first"),
    m04 = closedP1("M04", "second"),
    m07 = closedP1("M07", "third");
  expect(
    [
      m01.debrief!.quality.total,
      m04.debrief!.quality.total,
      m07.debrief!.quality.total,
    ].every((n) => n < 30),
  ).toBe(true);
  await m01DB.runs.put({
    id: "active",
    revision: m01.view.revision,
    current: exportSave(m01),
    previous: null,
  });
  for (const state of [m04, m07])
    await p1DB.rows.put({
      id: `active:${state.missionId}`,
      revision: state.view.revision,
      current: exportP1(state),
      previous: null,
    });
  const before = await rows(),
    progress = await loadProgress();
  expect(progress.every((p) => p.completed && p.active === "closed")).toBe(
    true,
  );
  expect(nextCase(progress)).toBeNull();
  expect(await rows()).toBe(before);
  for (const p of progress)
    expect(Object.keys(p).sort()).toEqual([
      "active",
      "archiveCheck",
      "archivedCompletion",
      "completed",
      "mission",
    ]);
});
it("reads legacy active rows without upgrading and recognises archived completions alongside a replay", async () => {
  const old = createRun("legacy", "B"),
    past = closedP1("M04", "past"),
    current = createP1("M04", "replay", "U-M");
  await m01DB.runs.put({
    id: "active",
    revision: 0,
    current: exportLegacySave(old),
    previous: null,
  });
  await p1DB.rows.put({
    id: "completed:M04:past",
    revision: past.view.revision,
    current: exportP1(past),
    previous: null,
  });
  await p1DB.rows.put({
    id: "active:M04",
    revision: 0,
    current: exportP1(current),
    previous: null,
  });
  const before = await rows(),
    progress = await loadProgress();
  expect(progress[0].active).toBe("open");
  expect(progress[1]).toMatchObject({
    active: "open",
    completed: true,
    archivedCompletion: true,
  });
  expect(nextCase(progress)).toBe("M01");
  expect(await rows()).toBe(before);
});
it("does not count a corrupt active row's valid backup or a forged archive", async () => {
  const s = closed01("bad"),
    valid = exportSave(s);
  await m01DB.runs.put({
    id: "active",
    revision: s.view.revision,
    current: { ...valid, hash: "00000000" },
    previous: valid,
  });
  const p = closedP1("M04", "real-run");
  await p1DB.rows.put({
    id: "completed:M04:wrong-run",
    revision: p.view.revision,
    current: exportP1(p),
    previous: null,
  });
  await p1DB.rows.put({
    id: "active:M07",
    revision: p.view.revision,
    current: exportP1(p),
    previous: null,
  });
  const before = await rows(),
    progress = await loadProgress();
  expect(progress[0]).toMatchObject({
    active: "needs_recovery",
    completed: false,
  });
  expect(progress[1]).toMatchObject({
    archiveCheck: "partial",
    completed: false,
  });
  expect(progress[2]).toMatchObject({
    active: "needs_recovery",
    completed: false,
  });
  expect(await rows()).toBe(before);
});
it("bounds archive inspection and reports incomplete coverage instead of falsely claiming no completion", async () => {
  for (let i = 0; i < 6; i++) {
    const p =
      i === 5 ? closedP1("M07", `r${i}`) : createP1("M07", `r${i}`, "U-B");
    await p1DB.rows.put({
      id: `completed:M07:r${i}`,
      revision: p.view.revision,
      current: exportP1(p),
      previous: null,
    });
  }
  const progress = await loadProgress();
  expect(progress[2]).toMatchObject({
    completed: false,
    archiveCheck: "partial",
  });
  expect(await p1DB.rows.count()).toBe(6);
});
it("distinguishes unavailable validation from corruption and leaves stored data intact", async () => {
  const p = closedP1("M04", "retained");
  await p1DB.rows.put({
    id: "active:M04",
    revision: p.view.revision,
    current: exportP1(p),
    previous: null,
  });
  const before = await rows();
  vi.spyOn(validator, "request").mockRejectedValue(
    new validator.ValidatorUnavailable(),
  );
  expect((await loadProgress())[1]).toMatchObject({
    active: "unavailable",
    completed: false,
  });
  expect(await rows()).toBe(before);
});
