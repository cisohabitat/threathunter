import { describe, it, expect } from "vitest";
import fixture from "../content/m01.json";
import {
  createRun,
  processCommand,
  project,
  type EngineState,
} from "../engine/engine";
import {
  emptyDraft,
  refKey,
  type Action,
  type CaseDraft,
  type Disposition,
  type World,
} from "../domain/contracts";
import { exportSave, importSave } from "../persistence/saves";
function act(s: EngineState, a: Action, id = `command-${s.view.revision}`) {
  return processCommand(s, {
    ...a,
    commandId: id,
    runId: s.view.runId,
    expectedRevision: s.view.revision,
  });
}
function acquire(s: EngineState, q: "Q-H" | "Q-D" | "Q-C" | "Q-F") {
  return act(s, { kind: "ACQUIRE", queryId: q, cutoffTick: s.view.tick }).state;
}
function route(world: World, steps: string[]) {
  let s = createRun("test", world);
  for (const step of steps) {
    if (step === "V")
      s = act(s, {
        kind: "REQUEST_CHECK",
        check: "directory_callback",
        subjectId: "U-01",
      }).state;
    else if (step.startsWith("+"))
      s = act(s, {
        kind: "ADVANCE",
        durationTicks: Number(step.slice(1)),
      }).state;
    else s = acquire(s, step as "Q-H");
  }
  return s;
}
function draft(s: EngineState, disposition: Disposition): CaseDraft {
  const nextStep = fixture.expectedNext[disposition] as CaseDraft["nextStep"];
  const alternativeStatus =
    disposition === "explained"
      ? "misuse_weakened"
      : s.view.records.some((r) => s.facts[refKey(r.ref)] === "approval_gap")
        ? "approved_work_unresolved"
        : "approved_work_weakened";
  return {
    ...emptyDraft(),
    coverageThroughTick: s.view.tick,
    disposition,
    confidence: disposition === "unresolved" ? "low" : "medium",
    evidence: s.view.records.map((r) => r.ref),
    alternativeStatus,
    alternativeEvidence: s.view.records.map((r) => r.ref),
    caveats: [{ code: "anomaly_not_proof", evidence: [s.view.records[0].ref] }],
    nextStep,
    ...(fixture.nextStepPackages[nextStep] as Pick<
      CaseDraft,
      "nextOwnerRole" | "reviewWithinTicks" | "followupTrigger"
    >),
  };
}
function close(s: EngineState, d: CaseDraft) {
  return act(s, { kind: "CLOSE_CASE", draft: d }).state.debrief!;
}
describe("M01 golden traces — GDD Appendix B", () => {
  it.each([
    ["B", ["Q-H", "Q-D", "Q-C"], "explained", 3, 100, false, false],
    ["B", ["Q-C", "Q-H", "Q-D"], "explained", 3, 100, false, false],
    ["M", ["Q-H", "Q-D", "Q-C", "Q-F"], "likely_misuse", 4, 100, false, true],
    ["M", ["V", "Q-H", "Q-F"], "likely_misuse", 3, 100, false, true],
    [
      "U-B",
      ["V", "Q-H", "Q-D", "Q-C", "Q-F"],
      "unresolved",
      5,
      100,
      false,
      false,
    ],
    [
      "U-M",
      ["V", "Q-H", "Q-D", "Q-C", "Q-F"],
      "unresolved",
      5,
      100,
      true,
      false,
    ],
    [
      "M",
      ["Q-H", "Q-D", "Q-C", "Q-F", "+3"],
      "likely_misuse",
      7,
      91,
      true,
      true,
    ],
    ["M", [], "likely_misuse", 0, 14, true, false],
    ["M", [], "unresolved", 0, 14, true, false],
    ["M", ["Q-H", "+1", "Q-F"], "unresolved", 3, 85, true, false],
  ] as const)(
    "%s %j → %s",
    (world, steps, disposition, tick, quality, objective, revoked) => {
      const s = route(world, [...steps]);
      const result = close(s, draft(s, disposition));
      expect(result.closeTick).toBe(tick);
      expect(result.quality.total).toBe(quality);
      expect(result.objectiveAchieved).toBe(objective);
      expect(result.sessionRevoked).toBe(revoked);
    },
  );
  it("sparse twins have identical public observations and assessment, different hidden outcome", () => {
    const a = route("U-B", ["V", "Q-H", "Q-D", "Q-C", "Q-F"]),
      b = route("U-M", ["V", "Q-H", "Q-D", "Q-C", "Q-F"]);
    expect(project(a)).toEqual(project(b));
    expect(close(a, draft(a, "unresolved")).quality).toEqual(
      close(b, draft(b, "unresolved")).quality,
    );
  });
});
describe("command, snapshot and time contracts", () => {
  it("query at step 1 excludes activity that becomes available at step 2; refresh preserves both snapshots", () => {
    let s = acquire(createRun("test", "M"), "Q-H");
    s = acquire(s, "Q-F");
    expect(Object.values(s.facts)).toContain("scope_empty");
    expect(s.view.responseWindowOpenedAt).toBeNull();
    s = acquire(s, "Q-F");
    expect(Object.values(s.facts)).toContain("scope_unexpected");
    expect(
      s.view.records.filter((r) => r.ref.recordId === "EV-05"),
    ).toHaveLength(2);
    expect(s.view.responseWindowOpenedAt).toBe(3);
  });
  it("owner check arrives at start +3, not completion +3", () => {
    const s = route("M", ["V", "Q-H", "Q-F"]);
    expect(s.view.pendingChecks).toHaveLength(0);
    expect(Object.values(s.facts)).toContain("owner_denies");
    expect(
      s.view.records.find((r) => r.ref.recordId === "EV-06")?.deliveredTick,
    ).toBe(3);
  });
  it("pending repeated verification is free", () => {
    const s = route("M", ["V"]);
    const r = act(s, {
      kind: "REQUEST_CHECK",
      check: "directory_callback",
      subjectId: "U-01",
    });
    expect(r.state.view.tick).toBe(1);
    expect(r.state.view.pendingChecks).toHaveLength(1);
  });
  it("reopens a static source without charging time", () => {
    let s = acquire(createRun("test", "B"), "Q-H");
    s = acquire(s, "Q-H");
    expect(s.view.tick).toBe(1);
    expect(s.view.records).toHaveLength(2);
  });
  it("identical dynamic snapshot is cached while refresh to a later cutoff costs a step", () => {
    let s = acquire(createRun("test", "M"), "Q-F");
    s = act(s, { kind: "ACQUIRE", queryId: "Q-F", cutoffTick: 0 }).state;
    expect(s.view.tick).toBe(1);
    s = acquire(s, "Q-F");
    expect(s.view.tick).toBe(2);
  });
  it("duplicate command returns original receipt even after revision changed", () => {
    const s = createRun("test", "M");
    const cmd = {
      kind: "ADVANCE",
      durationTicks: 1,
      commandId: "once",
      runId: "test",
      expectedRevision: 0,
    };
    const first = processCommand(s, cmd);
    const repeat = processCommand(first.state, cmd);
    expect(repeat.receipt.replayed).toBe(true);
    expect(repeat.state).toEqual(first.state);
    expect(
      processCommand(first.state, { ...cmd, durationTicks: 2 }).receipt
        .errorCode,
    ).toBe("ID_CONFLICT");
  });
  it.each([0, 5, -1, true, 1.5, Infinity])(
    "invalid ADVANCE %s leaves state unchanged",
    (durationTicks) => {
      const s = createRun("test", "M");
      const result = processCommand(s, {
        kind: "ADVANCE",
        durationTicks,
        commandId: "invalid",
        runId: "test",
        expectedRevision: 0,
      });
      expect(result.receipt.status).toBe("rejected");
      expect(result.state).toBe(s);
    },
  );
  it("rejects stale revision and unauthorised endpoint control", () => {
    const s = route("M", ["Q-H"]);
    expect(
      processCommand(s, {
        kind: "ADVANCE",
        durationTicks: 1,
        commandId: "stale",
        runId: "test",
        expectedRevision: 0,
      }).receipt.errorCode,
    ).toBe("STALE_REVISION");
    expect(
      processCommand(s, {
        kind: "ISOLATE_DEVICE",
        commandId: "isolate",
        runId: "test",
        expectedRevision: 1,
      }).receipt.status,
    ).toBe("rejected");
  });
  it("rejects undelivered evidence without advancing", () => {
    const s = createRun("test", "M");
    const d = draft(s, "unresolved");
    d.evidence.push({ acquisitionId: "future", recordId: "EV-05" });
    const result = act(s, { kind: "CLOSE_CASE", draft: d });
    expect(result.receipt.errorCode).toBe("INVALID_SCOPE");
    expect(result.state).toBe(s);
  });
  it("response completion at tick 8 prevents the same-tick objective", () => {
    const s = route("M", ["Q-H", "Q-D", "Q-C", "Q-F", "+2"]);
    expect(close(s, draft(s, "likely_misuse")).objectiveAchieved).toBe(false);
  });
  it("replay resumes pending checks with original due tick", () => {
    const s = route("M", ["V", "Q-H"]);
    const restored = importSave(JSON.stringify(exportSave(s)));
    expect(restored).toEqual(s);
    expect(acquire(restored, "Q-F")).toEqual(acquire(s, "Q-F"));
  });
  it("no private truth is present in public view", () => {
    const view = project(createRun("test", "M"));
    for (const key of fixture.publicTruthFieldsForbidden)
      expect(Object.keys(view)).not.toContain(key);
    expect(JSON.stringify(view)).not.toContain("scope_unexpected");
  });
  it("state and score are deterministic with identical inputs", () => {
    const a = route("M", ["V", "Q-H", "Q-F"]),
      b = route("M", ["V", "Q-H", "Q-F"]);
    expect(a).toEqual(b);
    expect(close(a, draft(a, "likely_misuse"))).toEqual(
      close(b, draft(b, "likely_misuse")),
    );
  });
  it("post-close input is rejected and cannot alter assessment", () => {
    const s = route("M", ["V", "Q-H", "Q-F"]);
    const closed = act(s, {
      kind: "CLOSE_CASE",
      draft: draft(s, "likely_misuse"),
    }).state;
    expect(
      act(closed, { kind: "ADVANCE", durationTicks: 1 }).receipt.errorCode,
    ).toBe("CLOSED");
  });
  it("canonical fixture references all exist and weights sum to one", () => {
    expect(
      Object.values(fixture.qualityWeights).reduce((a, b) => a + b, 0),
    ).toBe(1);
    for (const sets of Object.values(fixture.sufficientSets))
      for (const set of sets)
        for (const fact of set)
          expect(fixture.recordByFact).toHaveProperty(fact);
  });
});

describe("evidence-linked debrief feedback", () => {
  it("distinguishes collected-but-uncited baseline from an unasked question", () => {
    const s = route("B", ["Q-H"]);
    const d = draft(s, "unresolved");
    d.evidence = [s.view.records[0].ref];
    const report = close(s, d);
    const reason = report.quality.reasons.find(
      (r) => r.ruleId === "evidence.baseline",
    )!;
    expect(reason.feedback).toContain("collected the sign-in baseline");
    expect(reason.points).toBe(0);
    expect(reason.evidence).toEqual([s.view.records[0].ref]);
  });
  it("freezes reasoning, knowledge and pending checks and reconstructs them on save replay", () => {
    const s = route("M", ["V", "Q-H"]);
    const d = draft(s, "unresolved");
    const closed = act(s, { kind: "CLOSE_CASE", draft: d }).state;
    expect(closed.debrief?.pendingChecks[0].dueTick).toBe(3);
    expect(closed.debrief?.finding).toEqual(d);
    expect(importSave(JSON.stringify(exportSave(closed))).debrief).toEqual(
      closed.debrief,
    );
    d.evidence = [];
    expect(closed.debrief?.finding.evidence.length).toBe(2);
  });
  it("feedback references only delivered observations and explains the disclosed late window", () => {
    const s = route("M", ["Q-H", "Q-D", "Q-C", "Q-F", "+3"]);
    const result = close(s, draft(s, "likely_misuse"));
    const known = new Set(result.decisionRecords.map((r) => refKey(r.ref)));
    for (const reason of result.quality.reasons)
      for (const ref of reason.evidence)
        expect(known.has(refKey(ref))).toBe(true);
    expect(
      result.quality.reasons.find((r) => r.ruleId === "decision.timing")
        ?.feedback,
    ).toContain("ended at step 6");
    expect(result.quality.total).toBe(91);
  });
});

it.each(["__proto__", "constructor", "prototype"])(
  "rejects reserved receipt ID %s without clock, state or prototype mutation",
  (commandId) => {
    const state = createRun("reserved", "B");
    const result = processCommand(state, {
      kind: "ADVANCE",
      durationTicks: 1,
      runId: "reserved",
      expectedRevision: 0,
      commandId,
    });
    expect(result.state).toBe(state);
    expect(result.receipt.status).toBe("rejected");
    expect(result.receipt.errorCode).toBe("INVALID_PAYLOAD");
    expect(state.view.tick).toBe(0);
    expect(state.commands).toHaveLength(0);
    expect(Object.getPrototypeOf(state.receipts)).toBe(Object.prototype);
    expect(Object.keys(state.receipts)).toEqual([]);
  },
);
