import { expect, it } from "vitest";
import {
  createRun,
  processCommand,
  project,
  stateHash,
  type State,
} from "../campaign/engine";
import { exportSave } from "../campaign/format";
import { selectHint } from "../campaign/guidance";
import { cueMaps } from "../campaign/audio";
import type { Action, MissionId } from "../campaign/contracts";

function act(s: State, action: Action) {
  const result = processCommand(s, {
    ...action,
    runId: s.view.runId,
    commandId: `help-${s.view.revision}`,
    expectedRevision: s.view.revision,
  });
  expect(result.receipt.status, result.receipt.error).toBe("accepted");
  return result.state;
}
const query = (s: State, queryId: string) =>
  act(s, { kind: "ACQUIRE", queryId, cutoffTick: s.view.tick });

for (const mission of ["M04", "M07"] as MissionId[]) {
  it(`${mission} has identical public help for sparse twins throughout investigation and never mutates a save`, () => {
    let benign = createRun(mission, "same-run", "U-B");
    let misuse = createRun(mission, "same-run", "U-M");
    const check = () => {
      const before = JSON.stringify(exportSave(benign)),
        hash = stateHash(benign);
      const hint = selectHint(project(benign));
      expect(hint).toEqual(selectHint(project(misuse)));
      expect(cueMaps[mission].get(hint.cue)?.text).toBeTruthy();
      expect(hint.cue).not.toBe("morgan-6");
      expect(JSON.stringify(exportSave(benign))).toBe(before);
      expect(stateHash(benign)).toBe(hash);
    };
    const both = (action: Action) => {
      benign = act(benign, action);
      misuse = act(misuse, action);
      check();
    };
    const acquire = (id: string) =>
      both({ kind: "ACQUIRE", queryId: id, cutoffTick: benign.view.tick });
    check();
    if (mission === "M04") {
      expect(selectHint(project(benign)).target).toBe("account_hosts");
      expect(JSON.stringify(selectHint(project(benign)))).not.toContain(
        "LEGACY-01",
      );
      acquire("account_hosts");
      expect(selectHint(project(benign)).target).toBe("scope");
      both({ kind: "SCOPE", targetId: "LEGACY-01" });
      acquire("dependency");
      acquire("session_origin");
      acquire("change");
      acquire("task");
    } else {
      acquire("coverage");
      acquire("health");
      acquire("configuration");
      acquire("authentication");
      both({ kind: "SCOPE", targetId: "CS-PORTAL" });
      expect(selectHint(project(benign)).target).toBe("collection");
      both({
        kind: "ENABLE_SENSOR",
        targetId: "CS-PORTAL",
        sourceId: "cs_app",
        observationTicks: 4,
      });
      both({
        kind: "VERIFY",
        targetId: "CS-PORTAL",
        capability: "privileged_application_action",
      });
      expect(selectHint(project(benign)).target).toBe("pending");
      both({ kind: "ADVANCE", durationTicks: 2 });
    }
    expect(selectHint(project(benign)).target).toBe("finding");
  });
}

it("M04 suggests source capabilities rather than interpreting branch-specific results", () => {
  const hints = (["B", "M"] as const).map((world) => {
    let s = query(createRun("M04", "public", world), "account_hosts");
    s = act(s, { kind: "SCOPE", targetId: "LEGACY-01" });
    s = query(s, "dependency");
    s = query(s, "change");
    return selectHint(project(s));
  });
  expect(hints[0]).toEqual(hints[1]);
  expect(hints[0].target).toBe("session_origin");
});
