import { expect, it } from "vitest";
import {
  createRun,
  processCommand,
  replayCommands,
  type EngineState,
} from "../engine/engine";
import type { Action } from "../domain/contracts";
import {
  checksum,
  exportSave,
  exportLegacySave,
  importSave,
  gameplayHash,
  markCommitted,
  serializeSave,
  MAX_SAVE_BYTES,
} from "../persistence/format";
it("fits a large legacy history into portable format 2 without losing receipts or acknowledgements", () => {
  const initial = createRun("r", "M");
  const state = markCommitted(
    replayCommands(
      initial,
      Array.from({ length: 5000 }, (_, i) => ({
        kind: "ADVANCE" as const,
        runId: "r",
        commandId: i.toString(36),
        expectedRevision: i,
        durationTicks: 1,
      })),
    ),
  );
  const before = gameplayHash(state);
  const save = exportSave(state);
  expect(save.snapshot.throughRevision).toBe(0);
  expect(
    new TextEncoder().encode(serializeSave(state)).length,
  ).toBeLessThanOrEqual(MAX_SAVE_BYTES);
  expect(read(save)).toEqual(state);
  expect(gameplayHash(state)).toBe(before);
  expect(() => exportSave(state, 5000)).toThrow("2 MiB");
  expect(exportSave(state, 0)).toEqual(save);
}, 20000);
it("rejects histories that cannot fit even with a minimal checkpoint without truncation or receipt changes", () => {
  const initial = createRun("oversize", "B");
  const state = replayCommands(
    initial,
    Array.from({ length: 1100 }, (_, i) => ({
      kind: "EDIT_CASE" as const,
      runId: "oversize",
      commandId: `edit-${i}`,
      expectedRevision: i,
      draft: { ...initial.view.draft, optionalNotes: "x".repeat(2000) },
    })),
  );
  expect(() => serializeSave(state)).toThrow("2 MiB");
  expect(state.commands).toHaveLength(1100);
  expect(state.persistence.committedRevision).toBeNull();
});
function act(state: EngineState, action: Action) {
  const result = processCommand(state, {
    ...action,
    commandId: `command-${state.view.revision}`,
    runId: state.view.runId,
    expectedRevision: state.view.revision,
  });
  expect(result.receipt.status).toBe("accepted");
  return result.state;
}
function read(value: unknown) {
  return importSave(JSON.stringify(value));
}
function rehash<T extends { hash: string }>(value: T): T {
  const { hash: _hash, ...data } = value;
  void _hash;
  return { ...value, hash: checksum(data) };
}
it("imports every legacy world without changing facts, clocks, pending checks or commands", () => {
  for (const world of ["B", "M", "U-B", "U-M"] as const) {
    let state = createRun(`legacy-${world}`, world);
    state = act(state, { kind: "ACQUIRE", queryId: "Q-H", cutoffTick: 0 });
    state = act(state, {
      kind: "REQUEST_CHECK",
      check: "directory_callback",
      subjectId: "U-01",
    });
    state = act(state, {
      kind: "EDIT_CASE",
      draft: { ...state.view.draft, optionalNotes: "Keep this note." },
    });
    const legacy = exportLegacySave(state);
    const restored = read(legacy);
    expect(restored).toEqual(state);
    expect(read(exportSave(restored))).toEqual(state);
    expect(exportSave(restored).manifest.missionId).toBe("M01");
  }
});
it("restores a checkpoint then applies only its trailing commands, delivering a pending result once", () => {
  let state = createRun("trailing", "B");
  state = act(state, {
    kind: "REQUEST_CHECK",
    check: "directory_callback",
    subjectId: "U-01",
  });
  const due = state.view.pendingChecks[0].dueTick;
  state = markCommitted(state);
  state = act(state, { kind: "ACQUIRE", queryId: "Q-H", cutoffTick: 1 });
  state = act(state, { kind: "ACQUIRE", queryId: "Q-H", cutoffTick: 1 }); // Cached/free, but still a revision.
  state = act(state, { kind: "ADVANCE", durationTicks: 1 });
  expect(state.view.tick).toBe(due);
  const save = exportSave(state, 1);
  expect(save.snapshot.state.view.pendingChecks[0].dueTick).toBe(due);
  expect(save.snapshot.throughRevision).toBe(1);
  const restored = read(save);
  expect(restored).toEqual(state);
  expect(restored.commands).toHaveLength(4);
  expect(
    restored.view.records.filter(
      (r) => r.ref.acquisitionId === state.commands[0].commandId,
    ),
  ).toHaveLength(1);
  expect(read(exportSave(restored))).toEqual(restored);
});
it("keeps storage acknowledgements out of gameplay hashes and replays original committed receipts", () => {
  let state = act(createRun("receipts", "M"), {
    kind: "ADVANCE",
    durationTicks: 1,
  });
  const hash = gameplayHash(state);
  const committed = markCommitted(state);
  expect(state.receipts["command-0"].receipt.durability).toBe("memory_only");
  expect(gameplayHash(committed)).toBe(hash);
  expect(read(exportSave(committed))).toEqual(committed);
  const duplicate = processCommand(
    read(exportSave(committed)),
    state.commands[0],
  );
  expect(duplicate.receipt).toMatchObject({
    replayed: true,
    durability: "committed",
    resultingRevision: 1,
    resultingTick: 1,
  });
  state = act(committed, { kind: "ADVANCE", durationTicks: 1 });
  const restored = read(exportSave(state));
  expect(restored.persistence.committedRevision).toBe(1);
  expect(restored.receipts["command-1"].receipt.durability).toBe("memory_only");
});
it("validates snapshot fields and references even if envelope and snapshot hashes were recomputed", () => {
  const state = act(createRun("forged", "B"), {
    kind: "ACQUIRE",
    queryId: "Q-H",
    cutoffTick: 0,
  });
  const save = exportSave(state);
  save.snapshot.state.view.records[0].observation = "Invented observation";
  save.snapshot.stateHash = gameplayHash(save.snapshot.state);
  expect(() => read(rehash(save))).toThrow("snapshot");
});
it("rejects incompatible content, invalid boundaries and inconsistent committed revisions", () => {
  const save = exportSave(createRun("bounds", "B"));
  expect(() =>
    read(
      rehash({
        ...save,
        manifest: { ...save.manifest, fixtureHash: "00000000" },
      }),
    ),
  ).toThrow("incompatible");
  expect(() =>
    read(
      rehash({ ...save, snapshot: { ...save.snapshot, throughRevision: 1 } }),
    ),
  ).toThrow("boundary");
  expect(() => read(rehash({ ...save, latestCommittedRevision: 1 }))).toThrow(
    "revision",
  );
  expect(() => read(rehash({ ...save, stateHash: "00000000" }))).toThrow(
    "state hash",
  );
});
it("rejects duplicate or inconsistent trailing logs rather than accepting a matching snapshot", () => {
  const state = act(createRun("tail-invalid", "B"), {
    kind: "ADVANCE",
    durationTicks: 1,
  });
  const save = exportSave(state, 0);
  const bad = {
    ...save,
    revision: 2,
    commands: [state.commands[0], state.commands[0]],
  };
  expect(() => read(rehash(bad))).toThrow("history");
});
it("round trips a closed report, citations and pending-check debrief without rescoring differences", () => {
  let state = createRun("closed-snapshot", "M");
  state = act(state, { kind: "ACQUIRE", queryId: "Q-H", cutoffTick: 0 });
  state = act(state, {
    kind: "REQUEST_CHECK",
    check: "directory_callback",
    subjectId: "U-01",
  });
  state = act(state, {
    kind: "CLOSE_CASE",
    draft: {
      ...state.view.draft,
      evidence: [state.view.records[0].ref],
      optionalNotes: "Uncertainty is preserved.",
    },
  });
  const restored = read(exportSave(markCommitted(state), 1));
  expect(restored.debrief).toEqual(state.debrief);
  expect(restored.view.records).toEqual(state.view.records);
  expect(restored.view.pendingChecks).toEqual(state.view.pendingChecks);
  expect(restored.view.phase).toBe("closed");
});
