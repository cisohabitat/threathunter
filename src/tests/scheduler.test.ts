import { expect, it } from "vitest";
import {
  createRun,
  processCommand,
  project,
  canonical,
  type EngineState,
} from "../engine/engine";
import {
  createSimulation,
  resolveTick,
  schedule,
  type Simulation,
  type ScheduledEvent,
} from "../engine/scheduler";
import { exportSave, importSave, gameplayHash } from "../persistence/format";
import {
  exportSave as oldExport,
  markCommitted as oldCommit,
} from "../persistence/legacyFormat";
import {
  createRun as oldCreate,
  processCommand as oldProcess,
} from "../persistence/legacyEngine";
import type { Action } from "../domain/contracts";
function act(state: EngineState, action: Action) {
  return processCommand(state, {
    ...action,
    commandId: `event-${state.view.revision}`,
    runId: state.view.runId,
    expectedRevision: state.view.revision,
  }).state;
}
function to(simulation: Simulation, tick: number) {
  while (simulation.tick < tick) resolveTick(simulation, "M");
}
function control(tick: number): ScheduledEvent {
  return {
    id: "response.control",
    tick,
    phase: 1,
    priority: 0,
    actor: "response",
    scope: "S-01",
    description: "Revoke",
    requires: {},
    effects: ["revoke_session"],
  };
}
it("resolves all seven phases in order and applies same-tick controls before adversary actions", () => {
  const simulation = createSimulation("M");
  const order: number[] = [];
  resolveTick(simulation, "M", { phase: (p) => order.push(p) });
  expect(order).toEqual([1, 2, 3, 4, 5, 6, 7]);
  schedule(simulation, control(5));
  to(simulation, 8);
  expect(simulation.reportPrepared).toBe(false);
  expect(simulation.objectiveAchieved).toBe(false);
  expect(
    simulation.ledger.find((e) => e.id === "adversary.prepare")?.status,
  ).toBe("blocked");
});
it("the objective requires access and preparation; revocation at the objective tick wins", () => {
  const stopped = createSimulation("M");
  schedule(stopped, control(8));
  to(stopped, 8);
  expect(stopped.reportPrepared).toBe(true);
  expect(stopped.objectiveAchieved).toBe(false);
  const late = createSimulation("M");
  schedule(late, control(9));
  to(late, 9);
  expect(late.objectiveAchieved).toBe(true);
  expect(late.sessionActive).toBe(false);
  const missingDependency = createSimulation("M");
  missingDependency.pending = missingDependency.pending.filter(
    (e) => e.id !== "asset.prepared-report",
  );
  to(missingDependency, 8);
  expect(missingDependency.objectiveAchieved).toBe(false);
});
it("uses authored priority then stable event ID within a phase and rejects duplicate scheduling", () => {
  const simulation = createSimulation("M");
  const event = control(1);
  for (const [id, priority] of [
    ["z", 1],
    ["b", 0],
    ["a", 0],
  ] as const)
    schedule(simulation, { ...event, id, priority });
  expect(() => schedule(simulation, { ...event, id: "a" })).toThrow(
    "duplicate",
  );
  resolveTick(simulation, "M");
  expect(
    simulation.ledger.filter((e) => e.tick === 1).map((e) => e.id),
  ).toEqual(["a", "b", "z"]);
});
it("models benign business dependencies separately and records only source capabilities", () => {
  const benign = createSimulation("B");
  while (benign.tick < 8) resolveTick(benign, "B");
  expect(benign.financeTaskCompleted).toBe(true);
  expect(benign.financeTaskValidated).toBe(true);
  expect(benign.ledger.some((e) => e.actor === "adversary")).toBe(false);
  expect(benign.objectiveAchieved).toBe(false);
  const sparse = createSimulation("U-M");
  while (sparse.tick < 8) resolveTick(sparse, "U-M");
  expect(sparse.objectiveAchieved).toBe(true);
  expect(
    sparse.collection.some((r) => r.capability === "session_access_scope"),
  ).toBe(false);
});
it("never projects world state or advances events on reading, duplicate or invalid commands", () => {
  let state = createRun("projection", "M");
  state = act(state, { kind: "ADVANCE", durationTicks: 4 });
  expect(JSON.stringify(project(state))).not.toMatch(
    /adversary|reportPrepared|objectiveAchieved|worldClass/,
  );
  const saved = canonical(state);
  processCommand(state, state.commands[0]);
  processCommand(state, { kind: "ADVANCE", durationTicks: 99 });
  project(state);
  expect(canonical(state)).toBe(saved);
});
it("migrates existing snapshot-1 saves additively with identical original decisions and receipts", () => {
  for (const world of ["B", "M", "U-B", "U-M"] as const) {
    let old = oldCreate("compatibility", world);
    for (const queryId of ["Q-H", "Q-D", "Q-C", "Q-F"] as const)
      old = oldProcess(old, {
        kind: "ACQUIRE",
        queryId,
        cutoffTick: old.view.tick,
        runId: old.view.runId,
        commandId: `q${old.view.revision}`,
        expectedRevision: old.view.revision,
      }).state;
    old = oldProcess(old, {
      kind: "CLOSE_CASE",
      draft: old.view.draft,
      runId: old.view.runId,
      commandId: "close",
      expectedRevision: old.view.revision,
    }).state;
    const file = oldExport(oldCommit(old), 2);
    const migrated = importSave(JSON.stringify(file));
    expect(migrated.view).toEqual(old.view);
    expect(migrated.receipts).toEqual(oldCommit(old).receipts);
    expect(migrated.debrief?.quality).toEqual(old.debrief?.quality);
    expect(migrated.debrief?.objectiveAchieved).toBe(
      old.debrief?.objectiveAchieved,
    );
    expect(importSave(JSON.stringify(exportSave(migrated)))).toEqual(migrated);
    expect(gameplayHash(migrated)).toBe(
      gameplayHash(importSave(JSON.stringify(exportSave(migrated)))),
    );
  }
});
it("freezes decision observations and score while reconstructing later hidden world events", () => {
  let state = act(createRun("continuation", "M"), {
    kind: "REQUEST_CHECK",
    check: "directory_callback",
    subjectId: "U-01",
  });
  const records = structuredClone(state.view.records),
    pending = structuredClone(state.view.pendingChecks);
  state = act(state, { kind: "CLOSE_CASE", draft: state.view.draft });
  expect(state.view.tick).toBe(1);
  expect(state.view.records).toEqual(records);
  expect(state.debrief?.pendingChecks).toEqual(pending);
  expect(
    state.debrief?.reconstruction.worldEvents.some((e) => e.tick === 8),
  ).toBe(true);
  expect(
    state.debrief?.reconstruction.worldEvents.some(
      (e) => e.id.startsWith("check.") && e.tick === 3,
    ),
  ).toBe(true);
  expect(state.debrief?.objectiveAchieved).toBe(true);
  expect(state.simulation.tick).toBe(state.debrief?.resolvedThrough);
  expect(state.simulation.objectiveAchieved).toBe(
    state.debrief?.objectiveAchieved,
  );
  expect(
    state.debrief?.reconstruction.collectionRecords.find(
      (r) => r.capability === "verified_directory_result",
    )?.availableTick,
  ).toBe(3);
});
