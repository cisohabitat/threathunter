import { expect, it } from "vitest";
import { packages, validatePackage } from "../campaign/content";
import {
  createRun,
  processCommand,
  project,
  replay,
  checksum,
  type State,
} from "../campaign/engine";
import type { Action, Finding, World } from "../campaign/contracts";
import { exportSave, importSave } from "../campaign/format";

function act(s: State, action: Action) {
  const result = processCommand(s, {
    ...action,
    runId: s.view.runId,
    commandId: `c-${s.view.revision}`,
    expectedRevision: s.view.revision,
  });
  expect(result.receipt.status, result.receipt.error).toBe("accepted");
  return result.state;
}
const query = (s: State, queryId: string) =>
  act(s, { kind: "ACQUIRE", queryId, cutoffTick: s.view.tick });
function finding(s: State, disposition: Finding["disposition"]): Finding {
  return {
    ...s.view.finding,
    disposition,
    confidence: ["visibility", "provisional"].includes(disposition)
      ? "low"
      : "medium",
    evidence: s.view.records.map((r) => r.ref),
    alternative:
      s.missionId === "M04"
        ? "approved_work_tested"
        : "coverage_configuration_tested",
    alternativeEvidence: s.view.records
      .filter((r) =>
        [
          "change_register",
          "collector_config",
          "synthetic_verification",
        ].includes(r.sourceId),
      )
      .map((r) => r.ref),
    limitations:
      s.missionId === "M04"
        ? ["anomaly_not_proof", "dependency", "historical_gap"]
        : ["historical_gap", "test_not_history", "attribution"],
    targetId: s.missionId === "M04" ? "LEGACY-01" : "CS-PORTAL",
    missingFrom: s.missionId === "M07" ? -3 : null,
    missingThrough: s.missionId === "M07" ? 0 : null,
    handoff:
      s.missionId === "M07"
        ? "repair_collection"
        : disposition === "explained"
          ? "close_explained"
          : disposition === "misuse"
            ? "restrict_session"
            : "review_dependency",
    owner:
      s.missionId === "M07"
        ? "Detection Engineering"
        : disposition === "explained"
          ? "none"
          : "Billing Operations",
    followup:
      s.missionId === "M07"
        ? "repeat_application_verification"
        : disposition === "explained"
          ? "routine_monitoring"
          : disposition === "misuse"
            ? "confirm_session_restriction"
            : "verify_dependency_and_scope",
    scopeAcknowledged: true,
  };
}
function m04(world: World, order: string[]) {
  let s = createRun("M04", "golden", world);
  s = query(s, "account_hosts");
  s = act(s, { kind: "SCOPE", targetId: "LEGACY-01" });
  for (const id of order) {
    if (id === "application" && s.view.tick < 6)
      s = act(s, {
        kind: "ADVANCE",
        durationTicks: Math.min(4, 6 - s.view.tick),
      });
    s = query(s, id);
  }
  return s;
}
export function m07(world: "U-B" | "U-M", negative = false) {
  let s = createRun("M07", "coverage-golden", world);
  for (const id of ["coverage", "health"]) s = query(s, id);
  s = act(s, { kind: "SCOPE", targetId: "CS-PORTAL" });
  if (negative) {
    s = act(s, {
      kind: "VERIFY",
      targetId: "CS-PORTAL",
      capability: "privileged_application_action",
    });
    s = act(s, { kind: "ADVANCE", durationTicks: 2 });
  }
  for (const id of ["configuration", "authentication"]) s = query(s, id);
  s = act(s, {
    kind: "ENABLE_SENSOR",
    targetId: "CS-PORTAL",
    sourceId: "cs_app",
    observationTicks: 4,
  });
  s = act(s, {
    kind: "VERIFY",
    targetId: "CS-PORTAL",
    capability: "privileged_application_action",
  });
  s = act(s, { kind: "ADVANCE", durationTicks: 3 });
  return query(s, "window");
}
it("validates complete P1 packages and rejects broken source, event and fairness references", () => {
  for (const p of Object.values(packages))
    expect(validatePackage(p)).toEqual(p);
  const bad = structuredClone(packages.M04);
  bad.queries[0].factIds.push("invented");
  expect(() => validatePackage(bad)).toThrow("source");
  const twins = structuredClone(packages.M07);
  twins.facts[0].worlds = ["U-B"];
  expect(() => validatePackage(twins)).toThrow("Sparse");
});
it("earns the M04 discovery by a query, validates scope, caches freely and excludes an event created during acquisition", () => {
  let s = createRun("M04", "scope", "M");
  expect(JSON.stringify(project(s))).not.toContain("LEGACY-01");
  expect(
    processCommand(s, {
      kind: "SCOPE",
      targetId: "LEGACY-01",
      runId: "scope",
      expectedRevision: 0,
      commandId: "bad",
    }).receipt.error,
  ).toBe("INVALID_SCOPE");
  s = query(s, "account_hosts");
  expect(s.view.records.some((r) => r.relationship?.host === "LEGACY-01")).toBe(
    true,
  );
  const tick = s.view.tick;
  s = query(s, "account_hosts");
  expect(s.view.tick).toBe(tick);
  s = act(s, { kind: "SCOPE", targetId: "LEGACY-01" });
  s = query(s, "task"); // start 1, world task arrives at 2.
  expect(s.view.records.at(-1)!.title).toBe(
    "No matching record at this cutoff",
  );
  s = query(s, "task");
  expect(s.view.records.at(-1)!.text).toContain("recurring export task");
});
it("scores two independent M04 explanation routes and two misuse routes at 100 without hindsight", () => {
  const routes = [
    {
      world: "B" as const,
      claim: "explained" as const,
      ids: ["dependency", "change", "task"],
    },
    {
      world: "B" as const,
      claim: "explained" as const,
      ids: ["session_origin", "change", "dependency"],
    },
    {
      world: "M" as const,
      claim: "misuse" as const,
      ids: ["dependency", "change", "session_origin", "task"],
    },
    {
      world: "M" as const,
      claim: "misuse" as const,
      ids: ["session_origin", "dependency", "change", "application"],
    },
  ];
  for (const r of routes) {
    let s = m04(r.world, r.ids);
    s = act(s, { kind: "CLOSE_CASE", finding: finding(s, r.claim) });
    expect(
      s.debrief!.quality.total,
      JSON.stringify(s.debrief!.quality.reasons.filter((r) => !r.earned)),
    ).toBe(100);
    expect(s.debrief!.businessPreserved).toBe(true);
    expect(s.debrief!.events.find((e) => e.id === "task-created")?.phase).toBe(
      r.world === "B" ? 3 : 4,
    );
  }
});
it("freezes M04 quality across an on-objective-tick restriction and a late restriction", () => {
  const initial = m04("M", ["dependency", "change", "session_origin", "task"]);
  const closed = (tick: number) => {
    let s = initial;
    while (s.view.tick < tick)
      s = act(s, {
        kind: "ADVANCE",
        durationTicks: Math.min(4, tick - s.view.tick),
      });
    return act(s, { kind: "CLOSE_CASE", finding: finding(s, "misuse") });
  };
  const onTime = closed(8),
    late = closed(10);
  expect(onTime.debrief!.objectiveOccurred).toBe(false);
  expect(late.debrief!.objectiveOccurred).toBe(true);
  expect(onTime.debrief!.quality).toEqual(late.debrief!.quality);
  expect(
    onTime.debrief!.events.find((e) => e.id === "objective")?.applied,
  ).toBe(false);
  expect(onTime.view.tick).toBe(8);
  expect(onTime.debrief!.resolvedThrough).toBe(10);
});
it("never backfills M04 task creation when collection starts later, while observing a bounded future execution", () => {
  let s = m04("U-M", ["dependency"]);
  s = act(s, {
    kind: "ENABLE_SENSOR",
    targetId: "LEGACY-01",
    sourceId: "task_process",
    observationTicks: 4,
  });
  expect(s.view.windows[0]).toMatchObject({ startsAt: 4, endsAt: 8 });
  s = query(s, "task");
  expect(s.view.records.at(-1)!.coverage).toBe("unavailable");
  s = act(s, { kind: "ADVANCE", durationTicks: 3 });
  s = query(s, "window");
  expect(s.view.records.at(-1)!.text).toContain("execution at step 8");
  expect(
    s.view.records.some((r) =>
      r.text.includes("creating a recurring export task"),
    ),
  ).toBe(false);
});
it("gives both M04 sparse worlds identical public observations, quality and cues through closure", () => {
  const close = (w: World) => {
    let s = m04(w, ["dependency", "change", "task"]);
    s = act(s, { kind: "CLOSE_CASE", finding: finding(s, "visibility") });
    return s;
  };
  const a = close("U-B"),
    b = close("U-M");
  expect(project(a)).toEqual(project(b));
  expect(a.debrief!.quality).toEqual(b.debrief!.quality);
  expect(a.debrief!.quality.total).toBe(100);
  expect(a.debrief!.truth).not.toBe(b.debrief!.truth);
});
it("supports both M07 verification orders and matched-world visibility findings at 100", () => {
  for (const negative of [false, true]) {
    const close = (w: "U-B" | "U-M") => {
      const s = m07(w, negative);
      return act(s, { kind: "CLOSE_CASE", finding: finding(s, "visibility") });
    };
    const a = close("U-B"),
      b = close("U-M");
    expect(project(a)).toEqual(project(b));
    expect(a.debrief!.quality).toEqual(b.debrief!.quality);
    expect(a.debrief!.quality.total).toBe(100);
    expect(a.debrief!.objectiveOccurred).not.toBe(b.debrief!.objectiveOccurred);
  }
});
it("activates an authorised sensor before a verification due at the same step", () => {
  let s = createRun("M07", "sensor-tie", "U-M");
  s = query(s, "health");
  s = act(s, { kind: "SCOPE", targetId: "CS-PORTAL" });
  s = act(s, {
    kind: "VERIFY",
    targetId: "CS-PORTAL",
    capability: "privileged_application_action",
  });
  const due = s.view.pending[0].dueTick;
  s = act(s, {
    kind: "ENABLE_SENSOR",
    targetId: "CS-PORTAL",
    sourceId: "cs_app",
    observationTicks: 2,
  });
  expect(s.view.tick).toBe(due);
  expect(s.events.find((e) => e.id.startsWith("synthetic."))?.phase).toBe(3);
  expect(s.view.records.at(-1)!.title).toBe(
    "Controlled application event received",
  );
  expect(s.view.records.at(-1)!.cutoffTick).toBe(due);
});
it("keeps a post-close check result out of the decision snapshot while resolving its private collection", () => {
  let s = createRun("M07", "pending-close", "U-B");
  s = act(s, { kind: "SCOPE", targetId: "CS-API" });
  s = act(s, {
    kind: "VERIFY",
    targetId: "CS-API",
    capability: "privileged_application_action",
  });
  s = act(s, { kind: "CLOSE_CASE", finding: s.view.finding });
  expect(s.debrief!.pending).toHaveLength(1);
  expect(
    s.debrief!.records.some((r) => r.sourceId === "synthetic_verification"),
  ).toBe(false);
  expect(
    s.debrief!.collection.some((c) => c.originId.startsWith("synthetic.")),
  ).toBe(true);
  expect(s.view.tick).toBe(1);
});
it("does not count another target's successful verification or a pending observation window as historical coverage", () => {
  let s = createRun("M07", "wrong-target", "U-M");
  s = query(s, "coverage");
  s = query(s, "health");
  s = act(s, { kind: "SCOPE", targetId: "CS-API" });
  s = act(s, {
    kind: "VERIFY",
    targetId: "CS-API",
    capability: "privileged_application_action",
  });
  const pending = act(s, {
    kind: "CLOSE_CASE",
    finding: finding(s, "visibility"),
  });
  expect(pending.debrief!.pending).toHaveLength(1);
  expect(pending.debrief!.quality.supported).toBe(false);
  s = act(s, { kind: "ADVANCE", durationTicks: 2 });
  expect(s.view.records.at(-1)!.text).toContain("CS-API");
  const wrong = act(s, {
    kind: "CLOSE_CASE",
    finding: finding(s, "visibility"),
  });
  expect(wrong.debrief!.quality.supported).toBe(false);
});
it("rejects self-authorised isolation, stale revisions, forged references and changed IDs without effects", () => {
  const s = createRun("M04", "invalid", "M");
  const command = {
    kind: "ADVANCE",
    durationTicks: 1,
    commandId: "id",
    runId: "invalid",
    expectedRevision: 0,
  };
  const next = processCommand(s, command).state;
  expect(processCommand(next, command).receipt.replayed).toBe(true);
  expect(
    processCommand(next, { ...command, durationTicks: 2 }).receipt.error,
  ).toBe("ID_CONFLICT");
  expect(
    processCommand(s, { ...command, kind: "APPROVE_ISOLATION" }).state,
  ).toBe(s);
  expect(
    processCommand(s, {
      ...command,
      kind: "CLOSE_CASE",
      finding: {
        ...s.view.finding,
        evidence: [{ acquisitionId: "future", recordId: "invented" }],
      },
    }).state,
  ).toBe(s);
  expect(s.view.revision).toBe(0);
  expect(s.view.tick).toBe(0);
});
it("replays complete P1 states and audits portable snapshots, manifests and acknowledgements", () => {
  for (const s of [
    m04("M", ["dependency", "change", "session_origin", "task"]),
    m07("U-M", true),
  ]) {
    expect(
      replay(createRun(s.missionId, s.view.runId, s.world), s.commands),
    ).toEqual(s);
    const envelope = exportSave(s);
    expect(importSave(JSON.stringify(envelope))).toEqual(s);
    const bad = structuredClone(envelope);
    (bad.snapshot.state as State).view.tick++;
    bad.snapshot.stateHash = "00000000";
    const { hash: _hash, ...body } = bad;
    void _hash;
    bad.hash = checksum(body);
    expect(() => importSave(JSON.stringify(bad))).toThrow("snapshot");
    const incompatible = {
      ...envelope,
      manifest: { ...envelope.manifest, fixtureHash: "00000000" },
    };
    const { hash: _old, ...data } = incompatible;
    void _old;
    incompatible.hash = checksum(data);
    expect(() => importSave(JSON.stringify(incompatible))).toThrow(
      "incompatible",
    );
  }
});

it("bounds an unsupported M04 guess and supports a proportionate preliminary handoff", () => {
  let early = createRun("M04", "guess", "M");
  early = act(early, {
    kind: "CLOSE_CASE",
    finding: { ...early.view.finding, disposition: "misuse" },
  });
  expect(early.debrief!.quality.total).toBe(0);
  let preliminary = m04("M", ["dependency", "change", "session_origin"]);
  preliminary = act(preliminary, {
    kind: "CLOSE_CASE",
    finding: finding(preliminary, "provisional"),
  });
  expect(preliminary.debrief!.quality.total).toBe(100);
  const sparse = m04("U-M", [
    "session_origin",
    "dependency",
    "change",
    "application",
  ]);
  expect(
    act(sparse, { kind: "CLOSE_CASE", finding: finding(sparse, "visibility") })
      .debrief!.quality.total,
  ).toBe(100);
});
