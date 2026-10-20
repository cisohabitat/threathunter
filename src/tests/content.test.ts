import { expect, it } from "vitest";
import fixture from "../content/m01.json";
import { validateMission } from "../content/validate";
import { createRun, processCommand } from "../engine/engine";
it("validates the complete retained mission and its playable observation branches", () => {
  expect(validateMission(fixture)).toEqual(fixture);
});
it("rejects dangling facts, unsupported sources, invalid scope and changed event times", () => {
  const dangling = structuredClone(fixture);
  dangling.worlds.B.facts["Q-D"] = "missing";
  expect(() => validateMission(dangling)).toThrow("dangling");
  expect(() =>
    validateMission({
      ...fixture,
      scope: { ...fixture.scope, session: "S-99" },
    }),
  ).toThrow();
  const source = structuredClone(fixture);
  source.queries["Q-H"].source = "network_flow";
  expect(() => validateMission(source)).toThrow();
  const events = structuredClone(fixture);
  events.adversaryEvents[0].tick = 1;
  expect(() => validateMission(events)).toThrow("schedule");
});
it("rejects conflicting conclusions, broken fairness twins and unplayable branches", () => {
  const conflicting = structuredClone(fixture);
  conflicting.sufficientSets.likely_misuse = [["approval_match"]];
  expect(() => validateMission(conflicting)).toThrow("conflicting");
  const sparse = structuredClone(fixture);
  sparse.worlds["U-M"].facts["Q-C"] = "approval_absent";
  expect(() => validateMission(sparse)).toThrow();
  const empty = structuredClone(fixture);
  empty.sufficientSets.explained = [["owner_denies"]];
  expect(() => validateMission(empty)).toThrow("defensible");
});
it("rejects secret-like and visual-only evidence instructions", () => {
  for (const text of [
    "Only hover to read this fact.",
    "sk-123456789012345678901234567890",
    "<script>run()</script>",
  ]) {
    const candidate = structuredClone(fixture);
    candidate.recordByFact.anomalous_session.text = text;
    expect(() => validateMission(candidate)).toThrow("unsafe");
  }
});
it("every acquired record has a valid immutable scope/cutoff, lineage and source origin", () => {
  let state = createRun("provenance", "M");
  for (const queryId of ["Q-H", "Q-D", "Q-C", "Q-F"] as const)
    state = processCommand(state, {
      kind: "ACQUIRE",
      queryId,
      cutoffTick: state.view.tick,
      runId: state.view.runId,
      commandId: queryId,
      expectedRevision: state.view.revision,
    }).state;
  for (const acquired of state.simulation.acquisitions) {
    expect(acquired.subjectIds).toEqual(["U-01", "S-01"]);
    for (const ref of acquired.recordRefs) {
      const record = state.view.records.find(
        (r) =>
          r.ref.acquisitionId === ref.acquisitionId &&
          r.ref.recordId === ref.recordId,
      )!;
      expect(record).toBeDefined();
      expect(record.sourceId).toBe(acquired.sourceId);
      expect(record.lineageGroup).toBeTruthy();
      if (acquired.queryId === "opening")
        expect(record.snapshotCutoff).toBe(record.deliveredTick);
      else expect(record.snapshotCutoff).toBeLessThan(record.deliveredTick);
    }
    for (const id of acquired.collectionRecordIds) {
      const collected = state.simulation.collection.find((r) => r.id === id)!;
      expect(collected.availableTick).toBeLessThanOrEqual(acquired.cutoffTick);
      expect(collected.collectedTick).toBeGreaterThanOrEqual(
        collected.eventTick,
      );
      expect(
        state.simulation.ledger.some(
          (e) => e.id === collected.originEventId && e.status === "applied",
        ),
      ).toBe(true);
    }
  }
});
