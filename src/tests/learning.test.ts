import "fake-indexeddb/auto";
import { beforeEach, it, expect } from "vitest";
import { database as m01 } from "../persistence/saves";
import { database as p1 } from "../campaign/storage";
import { database, commit } from "../expansion/storage";
import { createRun, processCommand, assess } from "../expansion/engine";
import { packages } from "../expansion/content";
import { loadLearning } from "../journey/learning";
import type { Action, World } from "../expansion/contracts";
beforeEach(async () => {
  await Promise.all([m01.runs.clear(), p1.rows.clear(), database.rows.clear()]);
});
const rows = async () =>
  JSON.stringify([
    await m01.runs.toArray(),
    await p1.rows.toArray(),
    await database.rows.toArray(),
  ]);
function closed(world: World) {
  let s = createRun("M02", "learning", world);
  const act = (a: Action) => {
    s = processCommand(s, {
      ...a,
      commandId: `c${s.view.revision}`,
      runId: s.view.runId,
      expectedRevision: s.view.revision,
    }).state;
  };
  act({ kind: "ACQUIRE", queryId: "baseline", cutoffTick: 0 });
  act({ kind: "SCOPE", targetId: packages.M02.primaryTarget });
  act({ kind: "ACQUIRE", queryId: "context", cutoffTick: 1 });
  act({ kind: "ACQUIRE", queryId: "activity", cutoffTick: 2 });
  const f = {
    ...s.view.finding,
    disposition: "visibility" as const,
    confidence: "low" as const,
    evidence: s.view.records.map((r) => r.ref),
    alternative: "business_context_tested" as const,
    alternativeEvidence: s.view.records
      .filter((r) => r.sourceId === "work_register")
      .map((r) => r.ref),
    targetId: packages.M02.primaryTarget,
    scopeAcknowledged: true,
    limitations: ["coverage"],
    mechanicChoice: packages.M02.mechanic.supportedChoice,
    priorities: packages.M02.mechanic.priorities,
    handoff: "repair_collection" as const,
    followup: "restore_and_retest" as const,
  };
  expect(assess(s, f).supported).toBe(true);
  act({ kind: "CLOSE_CASE", finding: f });
  return s;
}
it("reports no invented achievements and never writes a profile database", async () => {
  const before = await rows(),
    value = await loadLearning();
  expect(value.completedExamples).toBe(0);
  expect(value.checkedRows).toBe(0);
  expect(value.unavailable).toBe(false);
  expect(await rows()).toBe(before);
});
it("recognises observation-based habits identically across matched worlds without changing rows", async () => {
  let expected;
  for (const world of ["U-B", "U-M"] as const) {
    await database.rows.clear();
    await commit(closed(world), null);
    const before = await rows(),
      value = await loadLearning();
    expect(value.completedExamples).toBe(1);
    expect(value.scopedFindings).toBe(1);
    expect(value.testedAlternatives).toBe(1);
    expect(value.visibilityFindings).toBe(1);
    expect(await rows()).toBe(before);
    if (expected) expect(value).toEqual(expected);
    expected = value;
  }
});
it("does not count forged archive identity or corrupt rows as a learning example", async () => {
  const s = closed("U-M");
  await commit(s, null);
  const row = (await database.rows.get("active:M02"))!;
  await database.rows.delete("active:M02");
  await database.rows.put({ ...row, id: "completed:M02:different-run" });
  const before = await rows(),
    value = await loadLearning();
  expect(value.completedExamples).toBe(0);
  expect(value.partial).toBe(true);
  expect(await rows()).toBe(before);
});
