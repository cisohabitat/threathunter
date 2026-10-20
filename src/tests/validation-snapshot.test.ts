import { expect, it } from "vitest";
import * as m01 from "../engine/engine";
import * as m01Format from "../persistence/format";
import { prepareCommit, prepareExport } from "../persistence/validation";
import * as p1 from "../campaign/engine";
import * as p1Format from "../campaign/format";
import { request as p1Request } from "../campaign/validator";
import * as expansion from "../expansion/engine";
import * as expansionFormat from "../expansion/format";
import { request as expansionRequest } from "../expansion/validator";

async function capturesInput<S extends { view: { runId: string } }, R>(
  state: S,
  prepare: (state: S) => Promise<R>,
  expected: R,
) {
  const pending = prepare(state);
  state.view.runId = "changed-after-request";
  expect(await pending).toEqual(expected);
  expect(state.view.runId).toBe("changed-after-request");
}

it("M01 tooling preparation captures commit/export input before lazy loading", async () => {
  const state = m01.createRun("original", "B"),
    committed = m01Format.markCommitted(state);
  await capturesInput(state, prepareCommit, {
    state: committed,
    envelope: m01Format.exportSave(committed),
  });
  const exporting = m01.createRun("export-original", "B");
  await capturesInput(exporting, prepareExport, m01Format.serializeSave(exporting));
});

it("P1 tooling preparation captures commit/export input before lazy loading", async () => {
  const state = p1.createRun("M04", "original", "B"),
    committed = p1.acknowledge(state, state.view.revision);
  await capturesInput(state, (input) => p1Request("commit", input), {
    state: committed,
    envelope: p1Format.exportSave(committed),
  });
  const exporting = p1.createRun("M04", "export-original", "B");
  await capturesInput(exporting, (input) => p1Request("export", input), {
    text: JSON.stringify(p1Format.exportSave(exporting)),
  });
});

it("expansion tooling preparation captures commit/export input before lazy loading", async () => {
  const state = expansion.createRun("M02", "original", "B"),
    committed = expansion.acknowledge(state, state.view.revision);
  await capturesInput(state, (input) => expansionRequest("commit", input), {
    state: committed,
    envelope: expansionFormat.exportSave(committed),
  });
  const exporting = expansion.createRun("M02", "export-original", "B");
  await capturesInput(exporting, (input) => expansionRequest("export", input), {
    text: JSON.stringify(expansionFormat.exportSave(exporting)),
  });
});
