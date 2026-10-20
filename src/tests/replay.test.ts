import { expect, it } from "vitest";
import { createRun, processCommand, replayCommands } from "../engine/engine";
import type { Action, Command } from "../domain/contracts";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
it.each(["B", "M", "U-B", "U-M"] as const)(
  "owned replay matches immutable transitions and split checkpoints in %s",
  (world) => {
    for (let seed = 1; seed <= 5; seed++) {
      const initial = freeze(createRun("replay-equivalence", world));
      let reference = initial;
      const commands: Command[] = [];
      let random = seed;
      for (let i = 0; i < 35; i++) {
        random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
        const choice = random % 7;
        const action: Action =
          choice < 4
            ? {
                kind: "ACQUIRE",
                queryId: (["Q-H", "Q-D", "Q-C", "Q-F"] as const)[choice],
                cutoffTick: reference.view.tick,
              }
            : choice === 4
              ? { kind: "ADVANCE", durationTicks: 1 + (random % 4) }
              : choice === 5
                ? {
                    kind: "REQUEST_CHECK",
                    check: "directory_callback",
                    subjectId: "U-01",
                  }
                : {
                    kind: "EDIT_CASE",
                    draft: {
                      ...reference.view.draft,
                      optionalNotes: "Edit " + i,
                      evidence: reference.view.records.map((r) => r.ref),
                    },
                  };
        const command = {
          ...action,
          runId: reference.view.runId,
          commandId: "command-" + i,
          expectedRevision: i,
        } as Command;
        commands.push(command);
        const next = processCommand(reference, command);
        expect(next.receipt.status).toBe("accepted");
        reference = next.state;
        expect(replayCommands(initial, commands)).toEqual(reference);
      }
      const close = {
        kind: "CLOSE_CASE",
        runId: reference.view.runId,
        commandId: "close",
        expectedRevision: 35,
        draft: reference.view.draft,
      } as Command;
      commands.push(close);
      reference = processCommand(reference, close).state;
      freeze(commands);
      expect(replayCommands(initial, commands)).toEqual(reference);
      const prefix = replayCommands(initial, commands.slice(0, 12));
      const savedPrefix = structuredClone(prefix);
      expect(replayCommands(freeze(prefix), commands.slice(12))).toEqual(
        reference,
      );
      expect(prefix).toEqual(savedPrefix);
      expect(initial.view.revision).toBe(0);
      expect(initial.commands).toHaveLength(0);
    }
  },
);
it("rejects an invalid or repeated history without changing its caller-owned checkpoint", () => {
  const initial = freeze(createRun("replay-invalid", "M"));
  const command: Command = {
    kind: "ADVANCE",
    runId: initial.view.runId,
    commandId: "first",
    expectedRevision: 0,
    durationTicks: 1,
  };
  for (const invalid of [
    command,
    { ...command, commandId: "second", expectedRevision: 9 },
    { ...command, commandId: "second", runId: "other" },
  ]) {
    expect(() => replayCommands(initial, [command, invalid])).toThrow(
      "history is invalid",
    );
    expect(initial.view.tick).toBe(0);
    expect(initial.commands).toHaveLength(0);
  }
});
it("detaches retained command payloads and keeps live transitions immutable", () => {
  const initial = freeze(createRun("replay-alias", "B"));
  const command: Command = freeze({
    kind: "EDIT_CASE",
    runId: initial.view.runId,
    commandId: "edit",
    expectedRevision: 0,
    draft: { ...initial.view.draft, optionalNotes: "Original" },
  });
  const owned = replayCommands(initial, [command]);
  if (owned.commands[0].kind === "EDIT_CASE")
    owned.commands[0].draft.optionalNotes = "Changed copy";
  expect(command.draft.optionalNotes).toBe("Original");
  expect(initial.view.draft.optionalNotes).toBe("");
  const live = processCommand(initial, command);
  expect(live.state).not.toBe(initial);
  expect(initial.view.revision).toBe(0);
});
