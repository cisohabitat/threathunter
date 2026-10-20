import { expect, it } from "vitest";
import {
  comparisonKey,
  fromM01,
  fromP1,
  choices,
  relationship,
} from "../comparison/model";
import { createRun, processCommand, project } from "../engine/engine";
import {
  createRun as p1,
  processCommand as command,
  project as projectP1,
} from "../campaign/engine";

it("keeps immutable dynamic snapshots and distinct acquisition identities without touching engine state", () => {
  let state = createRun("compare", "M");
  for (const queryId of ["Q-F", "Q-H", "Q-F"] as const) {
    state = processCommand(state, {
      kind: "ACQUIRE",
      queryId,
      cutoffTick: state.view.tick,
      commandId: `c${state.view.revision}`,
      runId: state.view.runId,
      expectedRevision: state.view.revision,
    }).state;
  }
  const before = JSON.stringify(state),
    records = fromM01(project(state).records);
  const snapshots = records.filter((r) => r.source === records.at(-1)!.source);
  expect(snapshots.length).toBeGreaterThanOrEqual(2);
  expect(snapshots[0].cutoff).toBe(0);
  expect(snapshots.at(-1)!.cutoff).toBe(2);
  expect(snapshots[0].key).not.toBe(snapshots.at(-1)!.key);
  expect(
    relationship(snapshots[0], { ...snapshots[0], key: "another-acquisition" }),
  ).toContain("Shared lineage");
  expect(relationship(records[0], records[0])).toContain(
    "same acquired observation",
  );
  records[0].subjects.push("UI-only");
  records[0].limits.push("UI-only");
  expect(JSON.stringify(state)).toBe(before);
  expect(comparisonKey({ acquisitionId: "a/b", recordId: "c" })).not.toBe(
    comparisonKey({ acquisitionId: "a", recordId: "b/c" }),
  );
});
it("bounds large choice lists while preserving two selected snapshots and respecting filtered inputs", () => {
  const base = fromM01(project(createRun("compare", "B")).records)[0];
  const records = Array.from({ length: 1001 }, (_, i) => ({
    ...base,
    key: `record-${i}`,
  }));
  const selected = ["record-0", "record-1000"];
  expect(choices(records, 10, selected).records).toHaveLength(52);
  expect(choices(records, -1, selected).page).toBe(0);
  expect(choices(records, 999, selected).page).toBe(20);
  expect(
    choices(records.slice(0, 2), 20, selected).records.map((r) => r.key),
  ).toEqual(["record-0", "record-1"]);
  expect(choices([], 1, selected).records).toEqual([]);
});
it("projects matched sparse twins identically for all three missions and never promotes labels to sufficiency", () => {
  expect(fromM01(project(createRun("twins", "U-B")).records)).toEqual(
    fromM01(project(createRun("twins", "U-M")).records),
  );
  for (const mission of ["M04", "M07"] as const) {
    const observe = (world: "U-B" | "U-M") => {
      let state = p1(mission, "twins", world);
      for (const queryId of mission === "M04"
        ? ["account_hosts"]
        : ["coverage", "health"]) {
        const result = command(state, {
          kind: "ACQUIRE",
          queryId,
          cutoffTick: state.view.tick,
          commandId: `c${state.view.revision}`,
          runId: state.view.runId,
          expectedRevision: state.view.revision,
        });
        expect(result.receipt.status, result.receipt.error).toBe("accepted");
        state = result.state;
      }
      return fromP1(projectP1(state).records);
    };
    const records = observe("U-B");
    expect(records).toEqual(observe("U-M"));
    expect(
      relationship(
        { ...records[0], source: "a", lineage: "x" },
        { ...records[1], source: "b", lineage: "y" },
      ),
    ).toContain("neither independent corroboration nor a sufficient finding");
  }
});

it("summarises only the latest acquired expansion view per source without replacing earlier snapshots", async () => {
  const { latestViews } = await import("../expansion/observations");
  const { fromExpansion } = await import("../comparison/model");
  const base = {
    ref: { acquisitionId: "a0", recordId: "R03" },
    title: "Scoped observation",
    text: "An earlier empty result",
    sourceId: "audit",
    entityIds: ["session"],
    eventTick: null,
    cutoffTick: 0,
    deliveredTick: 1,
    coverage: "covered" as const,
    lineage: "same-origin",
    caveats: [],
  };
  const records = Array.from({ length: 1200 }, (_, i) => ({
    ...base,
    ref: { acquisitionId: `a${i}`, recordId: "R03" },
    cutoffTick: i,
    deliveredTick: i + 1,
  }));
  const before = JSON.stringify(records),
    summary = latestViews(records, ["audit"]);
  expect(summary).toHaveLength(1);
  expect(summary[0].ref.acquisitionId).toBe("a1199");
  expect(JSON.stringify(records)).toBe(before);
  const adapted = fromExpansion(records);
  expect(adapted[0].cutoff).toBe(0);
  expect(adapted.at(-1)!.cutoff).toBe(1199);
  expect(adapted[0].key).not.toBe(adapted.at(-1)!.key);
});
