import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  createRun,
  processCommand,
  project,
  type EngineState,
} from "../engine/engine";
import type { Action } from "../domain/contracts";
import { nextMove } from "../ui/onboarding";
import { InvestigationGuide } from "../ui/InvestigationGuide";

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
function comparison(state: EngineState) {
  const view = project(state);
  return act(state, {
    kind: "EDIT_CASE",
    draft: { ...view.draft, evidence: view.records.map((r) => r.ref) },
  });
}
it("guides received results through citation and a decision without advancing time for citations", () => {
  for (const world of ["B", "M", "U-B", "U-M"] as const) {
    let state = createRun("onboarding", world);
    expect(nextMove(project(state)).stage).toBe("compare");
    state = act(state, { kind: "ACQUIRE", queryId: "Q-H", cutoffTick: 0 });
    expect(nextMove(project(state)).stage).toBe("save-comparison");
    state = comparison(state);
    expect(state.view.tick).toBe(1);
    expect(nextMove(project(state)).stage).toBe("check");
    state = act(state, { kind: "ACQUIRE", queryId: "Q-C", cutoffTick: 1 });
    expect(nextMove(project(state)).stage).toBe("save-check");
    const result = nextMove(project(state)).context!;
    expect(result.ref.recordId).toBe("EV-04");
    state = comparison(state);
    expect(state.view.tick).toBe(2);
    expect(nextMove(project(state)).stage).toBe("decide");
    expect(state.view.draft.disposition).toBe("unresolved");
    expect(state.view.draft.alternativeStatus).toBe("untested");
  }
});
it("does not claim the comparison is saved if only the baseline was cited", () => {
  let state = act(createRun("partial", "B"), {
    kind: "ACQUIRE",
    queryId: "Q-H",
    cutoffTick: 0,
  });
  const view = project(state);
  state = act(state, {
    kind: "EDIT_CASE",
    draft: {
      ...view.draft,
      evidence: [view.records.find((r) => r.ref.recordId === "EV-02")!.ref],
    },
  });
  expect(nextMove(project(state)).stage).toBe("save-comparison");
});
it("pending owner checks are not presented as a received result", () => {
  let state = comparison(
    act(createRun("pending", "B"), {
      kind: "ACQUIRE",
      queryId: "Q-H",
      cutoffTick: 0,
    }),
  );
  state = act(state, {
    kind: "REQUEST_CHECK",
    check: "directory_callback",
    subjectId: "U-01",
  });
  expect(nextMove(project(state)).stage).toBe("check");
  expect(nextMove(project(state)).context).toBeUndefined();
});
it("renders identical guidance for sparse twins and never acts while reading", () => {
  const outputs = [];
  for (const world of ["U-B", "U-M"] as const) {
    let state = comparison(
      act(createRun("same-public-run", world), {
        kind: "ACQUIRE",
        queryId: "Q-H",
        cutoffTick: 0,
      }),
    );
    state = act(state, { kind: "ACQUIRE", queryId: "Q-C", cutoffTick: 1 });
    const before = structuredClone(state);
    let commands = 0;
    outputs.push(
      renderToStaticMarkup(
        createElement(InvestigationGuide, {
          view: project(state),
          screen: "Leads",
          busy: false,
          send: async () => {
            commands++;
          },
          navigate: () => {},
        }),
      ),
    );
    expect(commands).toBe(0);
    expect(state).toEqual(before);
  }
  expect(outputs[0]).toBe(outputs[1]);
});
