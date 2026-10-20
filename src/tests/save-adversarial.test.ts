import { it, expect } from "vitest";
import { createRun, processCommand } from "../engine/engine";
import {
  checksum,
  exportSave,
  importSave,
  type SnapshotSaveEnvelope,
} from "../persistence/format";
import type { EngineState } from "../engine/engine";

it.each(["B", "M", "U-B", "U-M"] as const)(
  "rejects rechecksummed forged histories and private snapshots in %s",
  (world) => {
    let state = createRun("adversarial", world);
    for (let i = 0; i < 12; i++)
      state = processCommand(state, {
        kind: "EDIT_CASE",
        commandId: "edit-" + i,
        runId: state.view.runId,
        expectedRevision: i,
        draft: { ...state.view.draft, optionalNotes: "Edit " + i },
      }).state;
    const edits: ((save: SnapshotSaveEnvelope) => void)[] = [
      (s) => s.commands.reverse(),
      (s) => s.commands.push(s.commands[0]),
      (s) => {
        s.commands[3].expectedRevision = 999;
      },
      (s) => {
        s.commands[3].commandId = s.commands[2].commandId;
      },
      (s) => {
        s.commands[3].runId = "other-run";
      },
      (s) => {
        (s.snapshot.state as EngineState).simulation.sessionActive = false;
      },
      (s) => {
        (s.snapshot.state as EngineState).view.draft.optionalNotes =
          "Forged note";
      },
      (s) => {
        (s.snapshot.state as EngineState).persistence.committedRevision = 999;
      },
      (s) => {
        s.latestCommittedRevision = s.revision + 1;
      },
      (s) => {
        s.snapshot.throughRevision = s.revision + 1;
      },
    ];
    for (const mutate of edits) {
      const saved = structuredClone(exportSave(state));
      mutate(saved);
      const { hash: _hash, ...data } = saved;
      void _hash;
      saved.hash = checksum(data);
      expect(() => importSave(JSON.stringify(saved))).toThrow();
    }
    expect(importSave(JSON.stringify(exportSave(state)))).toEqual(state);
  },
);

it("rejects hostile JSON syntax, unsafe nested keys and excessive UTF-8 bytes without prototype mutation", () => {
  for (const text of [
    '{"x":{"constructor":{}}}',
    '{"x":{"prototype":1}}',
    '{"x":{"__proto__":{"polluted":true}}}',
    '{"schemaVersion":2,}',
    "[1,",
    '"unterminated',
  ])
    expect(() => importSave(text)).toThrow();
  expect(() => importSave('"' + "界".repeat(700000) + '"')).toThrow("2 MiB");
  expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
});
