import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  createRun,
  processCommand,
  project,
  type EngineState,
} from "../engine/engine";
import { refKey, type Action } from "../domain/contracts";
import {
  investigationFlow,
  nextStepPackages,
  toggleReference,
} from "../ui/investigationFlow";
import { GuidedInvestigation } from "../ui/GuidedInvestigation";
import fixture from "../content/m01.json";
function act(state: EngineState, action: Action) {
  const result = processCommand(state, {
    ...action,
    runId: state.view.runId,
    commandId: `move-${state.view.revision}`,
    expectedRevision: state.view.revision,
  });
  expect(result.receipt.status).toBe("accepted");
  return result.state;
}
it("progresses on delivered observations without requiring citations or choosing a finding", () => {
  for (const world of ["B", "M", "U-B", "U-M"] as const) {
    let state = createRun("onboarding", world);
    expect(investigationFlow(project(state), null).stage).toBe("opening");
    state = act(state, { kind: "ACQUIRE", queryId: "Q-H", cutoffTick: 0 });
    expect(investigationFlow(project(state), null).stage).toBe("result");
    const dismissed = refKey(state.view.records.at(-1)!.ref);
    expect(investigationFlow(project(state), dismissed).stage).toBe(
      "questions",
    );
    state = act(state, { kind: "ACQUIRE", queryId: "Q-C", cutoffTick: 1 });
    expect(investigationFlow(project(state), dismissed).stage).toBe("result");
    expect(state.view.draft.evidence).toEqual([]);
    expect(state.view.draft.alternativeEvidence).toEqual([]);
    expect(state.view.draft.disposition).toBe("unresolved");
    expect(state.view.tick).toBe(2);
  }
});
it("does not present a pending check as a new observation, then shows the delivered result", () => {
  let state = act(createRun("pending", "B"), {
    kind: "ACQUIRE",
    queryId: "Q-H",
    cutoffTick: 0,
  });
  const dismissed = refKey(state.view.records.at(-1)!.ref);
  state = act(state, {
    kind: "REQUEST_CHECK",
    check: "directory_callback",
    subjectId: "U-01",
  });
  expect(investigationFlow(project(state), dismissed).stage).toBe("questions");
  expect(state.view.records.some((r) => r.ref.recordId === "EV-06")).toBe(
    false,
  );
  state = act(state, { kind: "ADVANCE", durationTicks: 2 });
  expect(investigationFlow(project(state), dismissed).stage).toBe("result");
  expect(investigationFlow(project(state), dismissed).latest.ref.recordId).toBe(
    "EV-06",
  );
});
it("keeps reference selection immutable and snapshot-specific", () => {
  const first = { acquisitionId: "a1", recordId: "EV-05" },
    second = { acquisitionId: "a2", recordId: "EV-05" };
  const original = [first];
  expect(toggleReference(original, second)).toEqual([first, second]);
  expect(toggleReference(original, first)).toEqual([]);
  expect(original).toEqual([first]);
  expect(nextStepPackages).toEqual(fixture.nextStepPackages);
});
it("renders identical sparse-twin guidance without dispatching commands or mutating state", () => {
  const outputs = [];
  for (const world of ["U-B", "U-M"] as const) {
    let state = act(createRun("same-public-run", world), {
      kind: "ACQUIRE",
      queryId: "Q-H",
      cutoffTick: 0,
    });
    state = act(state, { kind: "ACQUIRE", queryId: "Q-C", cutoffTick: 1 });
    const before = structuredClone(state);
    let commands = 0;
    outputs.push(
      renderToStaticMarkup(
        createElement(GuidedInvestigation, {
          view: project(state),
          busy: false,
          send: async () => {
            commands++;
          },
          navigate: () => {},
          independent: () => {},
        }),
      ),
    );
    expect(commands).toBe(0);
    expect(state).toEqual(before);
  }
  expect(outputs[0]).toBe(outputs[1]);
});
