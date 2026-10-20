import { describe, it, expect } from "vitest";
import { packages, validatePackage } from "../expansion/content";
import { missions } from "../expansion/public";
import {
  createRun,
  createFreeHunt,
  processCommand,
  project,
  assess,
  replay,
  stateHash,
  acknowledge,
  type State,
} from "../expansion/engine";
import { exportSave, importSave } from "../expansion/format";
import type { Action, Finding, MissionId, World } from "../expansion/contracts";
const ids = Object.keys(packages) as MissionId[];
function act(s: State, a: Action) {
  const result = processCommand(s, {
    ...a,
    runId: s.view.runId,
    commandId: `c${s.view.revision}`,
    expectedRevision: s.view.revision,
  });
  expect(result.receipt.status, result.receipt.error).toBe("accepted");
  return result.state;
}
const query = (s: State, queryId: string) =>
  act(s, { kind: "ACQUIRE", queryId, cutoffTick: s.view.tick });
function route(id: MissionId, world: World, second = false) {
  let s = query(createRun(id, "golden", world), "baseline");
  s = act(s, { kind: "SCOPE", targetId: packages[id].primaryTarget });
  if (second) {
    s = act(s, { kind: "REQUEST_CHECK", targetId: packages[id].primaryTarget });
    s = query(s, "independent");
    s = act(s, { kind: "ADVANCE", durationTicks: 1 });
  } else {
    s = query(s, "context");
    s = query(s, "activity");
  }
  return s;
}
function finding(s: State): Finding {
  const p = packages[s.missionId],
    disposition = s.world.startsWith("U")
      ? "visibility"
      : s.world === "B"
        ? "explained"
        : "misuse";
  return {
    ...s.view.finding,
    disposition,
    confidence: disposition === "visibility" ? "low" : "medium",
    evidence: s.view.records.map((r) => r.ref),
    alternative: "business_context_tested",
    alternativeEvidence: s.view.records
      .filter(
        (r) =>
          r.sourceId === "work_register" || r.sourceId === "directory_callback",
      )
      .map((r) => r.ref),
    limitations: ["scope", "operator"],
    targetId: p.primaryTarget,
    mechanicChoice: p.mechanic.supportedChoice,
    priorities: p.mechanic.priorities,
    links: s.view.records
      .filter(
        (r) =>
          r.sourceId === "scope_catalogue" ||
          ["session_audit", "service_journal"].includes(r.sourceId),
      )
      .map((r) => ({
        ref: r.ref,
        role: r.coverage === "unavailable" ? "limits_confidence" : "supports",
        claimId:
          r.sourceId === "scope_catalogue"
            ? p.mechanic.claims[0].id
            : p.mechanic.claims[1].id,
      })),
    handoff:
      disposition === "explained"
        ? "close_explained"
        : disposition === "misuse"
          ? "restrict_access"
          : "repair_collection",
    owner: disposition === "explained" ? "none" : p.response.owner,
    followup:
      disposition === "explained"
        ? "routine_monitoring"
        : disposition === "misuse"
          ? "confirm_scope_and_control"
          : "restore_and_retest",
    scopeAcknowledged: true,
    followups:
      p.mechanic.kind === "capstone"
        ? [
            {
              targetId: p.mechanic.priorities[1],
              owner: "Detection Engineering",
              trigger: "restore_and_retest",
              reviewWithinTicks: 4,
            },
          ]
        : [],
  };
}
describe.each(ids)("%s independently authored mission", (id) => {
  it("has distinct public capabilities without expected answers or hidden predicates", () => {
    expect(validatePackage(packages[id])).toEqual(packages[id]);
    const publicText = JSON.stringify(missions[id]);
    for (const key of [
      '"sufficient"',
      '"worlds"',
      '"supportedChoice"',
      '"unsupportedChoices"',
      '"requiredFacts"',
      '"facts"',
      '"objectiveTick"',
    ])
      expect(publicText).not.toContain(key);
    expect(missions[id].queries.map((q) => q.id)).toEqual(
      packages[id].queries.map((q) => q.id),
    );
  });
  for (const world of ["B", "M", "U-B", "U-M"] as World[])
    for (const second of [false, true])
      it(`${world} has a maximum-credit independent route ${second ? 2 : 1} and replayable frozen debrief`, () => {
        const s = route(id, world, second),
          f = finding(s),
          before = JSON.stringify(s),
          q = assess(s, f);
        expect(q.total, JSON.stringify(q.reasons)).toBe(100);
        expect(JSON.stringify(s)).toBe(before);
        const closed = act(s, { kind: "CLOSE_CASE", finding: f });
        expect(closed.debrief!.quality).toEqual(q);
        expect(closed.debrief!.records).toEqual(s.view.records);
        expect(closed.debrief!.closeTick).toBe(s.view.tick);
        expect(closed.view.phase).toBe("closed");
        expect(replay(createRun(id, "golden", world), closed.commands)).toEqual(
          closed,
        );
        expect(importSave(JSON.stringify(exportSave(closed)))).toEqual(closed);
        expect(
          processCommand(closed, {
            kind: "ADVANCE",
            durationTicks: 1,
            commandId: "after",
            runId: "golden",
            expectedRevision: closed.view.revision,
          }).receipt.status,
        ).toBe("rejected");
      });
  it("keeps matched observations and quality identical while separating the hidden outcome", () => {
    const a = route(id, "U-B"),
      b = route(id, "U-M");
    expect(project(a)).toEqual(project(b));
    const f = finding(a);
    expect(assess(a, f)).toEqual(assess(b, f));
    const ac = act(a, { kind: "CLOSE_CASE", finding: f }),
      bc = act(b, { kind: "CLOSE_CASE", finding: f });
    expect(ac.debrief!.quality).toEqual(bc.debrief!.quality);
    expect(ac.debrief!.objectiveOccurred).toBe(false);
    expect(bc.debrief!.objectiveOccurred).toBe(true);
  });
  it("supports incomplete/provisional handoff but gives unsupported guesses low credit", () => {
    const initial = createRun(id, "guess", "M");
    expect(assess(initial, initial.view.finding).total).toBeLessThan(30);
    let s = query(createRun(id, "provisional", "U-M"), "baseline");
    s = act(s, { kind: "SCOPE", targetId: packages[id].primaryTarget });
    s = query(s, "context");
    const f = {
      ...finding(s),
      disposition: "provisional" as const,
      handoff: "review_monitor" as const,
    };
    expect(assess(s, f).supported).toBe(true);
    expect(assess(s, f).total).toBeGreaterThan(80);
  });
  it("excludes future records at request start and retains earlier empty snapshots", () => {
    let s = query(createRun(id, "cutoff", "M"), "baseline");
    s = act(s, { kind: "SCOPE", targetId: packages[id].primaryTarget });
    s = query(s, "activity");
    const empty = s.view.records.at(-1)!;
    expect(empty.ref.recordId).toBe("empty-activity");
    expect(empty.cutoffTick).toBe(1);
    s = query(s, "activity");
    expect(s.view.records).toContainEqual(empty);
    expect(s.view.records.at(-1)!.eventTick).toBe(2);
    expect(s.view.records.at(-1)!.cutoffTick).toBe(2);
  });
});
it("enforces receipt ordering, exact payload identity, static caching, targets and non-mutating rejected actions", () => {
  let s = createRun("M02", "receipts", "M");
  const c = {
    kind: "ACQUIRE",
    queryId: "baseline",
    cutoffTick: 0,
    commandId: "once",
    runId: "receipts",
    expectedRevision: 0,
  } as const;
  const first = processCommand(s, c);
  s = first.state;
  const before = JSON.stringify(s);
  expect(processCommand(s, c).receipt.replayed).toBe(true);
  expect(processCommand(s, { ...c, queryId: "activity" }).receipt.error).toBe(
    "ID_CONFLICT",
  );
  for (const bad of [
    { kind: "SCOPE", targetId: "unknown" },
    {
      kind: "REQUEST_RESPONSE",
      targetId: packages.M02.primaryTarget,
      evidence: [],
    },
    {
      kind: "ENABLE_SENSOR",
      targetId: packages.M02.primaryTarget,
      durationTicks: 2,
    },
  ])
    expect(
      processCommand(s, {
        ...bad,
        commandId: "bad",
        runId: s.view.runId,
        expectedRevision: s.view.revision,
      }).receipt.status,
    ).toBe("rejected");
  expect(JSON.stringify(s)).toBe(before);
  const free = query(s, "baseline");
  expect(free.view.tick).toBe(s.view.tick);
  expect(free.view.records).toEqual(s.view.records);
  expect(replay(createRun("M02", "receipts", "M"), free.commands)).toEqual(
    free,
  );
  const duplicate = [...free.commands, free.commands[0]];
  expect(() => replay(createRun("M02", "receipts", "M"), duplicate)).toThrow();
});
it("completes verified checks exactly at request-start +3, caches duplicates and freezes pending knowledge", () => {
  let s = query(createRun("M05", "checks", "U-M"), "baseline");
  s = act(s, { kind: "REQUEST_CHECK", targetId: packages.M05.primaryTarget });
  expect(s.view.pendingChecks[0].dueTick).toBe(4);
  const t = s.view.tick;
  s = act(s, { kind: "REQUEST_CHECK", targetId: packages.M05.primaryTarget });
  expect(s.view.tick).toBe(t);
  const closed = act(s, { kind: "CLOSE_CASE", finding: s.view.finding });
  expect(closed.debrief!.pendingChecks).toHaveLength(1);
  expect(
    closed.debrief!.records.some((r) => r.sourceId === "directory_callback"),
  ).toBe(false);
  expect(
    closed.view.records.filter((r) => r.sourceId === "directory_callback"),
  ).toHaveLength(1);
  expect(closed.view.records.at(-1)!.deliveredTick).toBe(4);
});
it("applies authorised control before the objective on the same tick, with separate outcome and known timing credit", () => {
  let s = route("M09", "M");
  const f = finding(s);
  s = act(s, { kind: "ADVANCE", durationTicks: 3 });
  const q = assess(s, f);
  expect(q.decision).toBe(70);
  s = act(s, {
    kind: "REQUEST_RESPONSE",
    targetId: packages.M09.primaryTarget,
    evidence: f.evidence,
  });
  expect(s.view.responses[0].dueTick).toBe(8);
  const closed = act(s, { kind: "CLOSE_CASE", finding: f });
  expect(closed.debrief!.controlEffective).toBe(true);
  expect(closed.debrief!.objectiveOccurred).toBe(false);
  expect(closed.debrief!.quality).toEqual(assess(s, f));
  expect(closed.debrief!.quality.total).toBe(91);
});
for (const mission of ["M08", "M11"] as const)
  it(`${mission} collects a controlled event only after activation and never backfills historical gaps`, () => {
    let s = route(mission, "U-M");
    s = act(s, {
      kind: "ENABLE_SENSOR",
      targetId: packages[mission].primaryTarget,
      durationTicks: 2,
    });
    expect(s.view.sensor!.startsAt).toBe(5);
    const old = s.view.records.filter((r) => r.coverage === "unavailable");
    s = query(s, "window");
    expect(s.view.records.at(-1)!.ref.recordId).toBe("empty-window");
    s = query(s, "window");
    expect(s.view.records.at(-1)!.eventTick).toBe(6);
    expect(s.view.records.at(-1)!.cutoffTick).toBe(6);
    expect(s.view.records.filter((r) => r.coverage === "unavailable")).toEqual(
      old,
    );
    expect(assess(s, finding(s)).supported).toBe(true);
  });
it("pins seed/template/profile selection and generates a meaningful fixed corpus, not independent random evidence", () => {
  const corpus = Array.from({ length: 100 }, (_, i) =>
    createFreeHunt(`corpus-${i}`, "free"),
  );
  expect(new Set(corpus.map((s) => s.missionId)).size).toBe(9);
  expect(new Set(corpus.map((s) => s.profile)).size).toBe(3);
  expect(new Set(corpus.map((s) => s.world)).size).toBe(4);
  for (const s of corpus) {
    expect(createFreeHunt(s.seed!, "free")).toEqual(s);
    expect(importSave(JSON.stringify(exportSave(s)))).toEqual(s);
    expect(s.view.policy.collectionDelayTicks).toBe(
      s.profile === "late-collection" ? 2 : 0,
    );
  }
  let s = query(
    corpus.find((s) => s.profile === "late-collection" && s.world === "M")!,
    "baseline",
  );
  s = act(s, { kind: "SCOPE", targetId: packages[s.missionId].primaryTarget });
  s = query(s, "activity");
  s = query(s, "activity");
  expect(s.view.records.at(-1)!.ref.recordId).toBe("empty-activity");
  const good = exportSave(corpus[0]);
  good.manifest.seed = "different";
  const { hash: _hash, ...data } = good;
  void _hash;
  expect(() =>
    importSave(JSON.stringify({ ...data, hash: "00000000" })),
  ).toThrow();
  expect(stateHash(acknowledge(s, s.view.revision))).toBe(stateHash(s));
});
it("rejects malformed authoring, unavailable origins and impossible branches", () => {
  const base = structuredClone(packages.M02);
  base.facts[0].entityIds = ["missing"];
  expect(() => validatePackage(base)).toThrow();
  const late = structuredClone(packages.M02);
  late.facts.find((f) => f.id === "activity_M")!.availableAt = 1;
  expect(() => validatePackage(late)).toThrow();
  const impossible = structuredClone(packages.M02);
  impossible.sufficient.explained = [["context_B", "activity_M"]];
  expect(() => validatePackage(impossible)).toThrow();
});

it("does not reward unsupported person, intent, authority or global-scope assertions, even with otherwise strong observations", () => {
  for (const id of ids) {
    const s = route(id, "B"),
      good = finding(s);
    for (const choice of packages[id].mechanic.unsupportedChoices) {
      const q = assess(s, { ...good, mechanicChoice: choice });
      expect(q.supported, `${id}/${choice}`).toBe(false);
      expect(q.total).toBeLessThan(70);
    }
  }
});
it("allows high confidence for a tightly explained scoped action, without extending it to person or motive attribution", () => {
  for (const id of ids) {
    const s = route(id, "B"),
      f = { ...finding(s), confidence: "high" as const };
    expect(assess(s, f).report).toBe(100);
    const m = route(id, "M");
    expect(assess(m, { ...finding(m), confidence: "high" }).report).toBe(60);
  }
});
it("requires evidence relationships to fit the causal claim rather than merely placing a card in a column", () => {
  const s = route("M11", "B"),
    f = finding(s);
  expect(assess(s, f).reasoning).toBe(100);
  expect(
    assess(s, {
      ...f,
      links: f.links.map((l) => ({ ...l, role: "weakens" as const })),
    }).reasoning,
  ).toBe(50);
});

it("collects later causal operations only after their event and source availability, with preserved request-start snapshots", () => {
  for (const world of ["B", "M"] as const) {
    let s = route("M02", world);
    s = act(s, { kind: "ADVANCE", durationTicks: 4 });
    expect(s.view.tick).toBe(7);
    s = query(s, "activity");
    const earlier = s.view.records.filter(
      (r) => r.ref.acquisitionId === `c${s.view.revision - 1}`,
    );
    expect(earlier.some((r) => r.ref.recordId === "R05")).toBe(false);
    s = query(s, "activity");
    expect(s.view.records.at(-1)!.ref.recordId).toBe("R05");
    expect(s.view.records.at(-1)!.eventTick).toBe(8);
    expect(s.view.records.at(-1)!.cutoffTick).toBe(8);
    expect(s.view.records).toEqual(expect.arrayContaining(earlier));
  }
  const seed = Array.from({ length: 100 }, (_, i) => `corpus-${i}`).find(
    (seed) => {
      const s = createFreeHunt(seed, "later");
      return s.profile === "late-collection" && s.world === "M";
    },
  )!;
  let s = createFreeHunt(seed, "later");
  s = query(s, "baseline");
  s = act(s, { kind: "SCOPE", targetId: packages[s.missionId].primaryTarget });
  for (let i = 0; i < 3; i++) s = act(s, { kind: "ADVANCE", durationTicks: 4 });
  s = query(s, "activity");
  expect(s.view.records.at(-1)!.eventTick).toBe(10);
  expect(s.view.records.at(-1)!.cutoffTick).toBe(13);
});
it("the fixed hundred-seed corpus retains both supported investigation orders under every selected collection profile", () => {
  for (let i = 0; i < 100; i++)
    for (const second of [false, true]) {
      let s = query(
        createFreeHunt(`corpus-${i}`, "corpus-fairness"),
        "baseline",
      );
      s = act(s, {
        kind: "SCOPE",
        targetId: packages[s.missionId].primaryTarget,
      });
      if (second) {
        s = act(s, {
          kind: "REQUEST_CHECK",
          targetId: packages[s.missionId].primaryTarget,
        });
        if (s.view.tick < 4) s = act(s, { kind: "ADVANCE", durationTicks: 2 });
        s = query(s, "independent");
      } else {
        s = query(s, "context");
        if (s.profile === "late-collection")
          s = act(s, { kind: "ADVANCE", durationTicks: 2 });
        s = query(s, "activity");
      }
      const quality = assess(s, finding(s));
      expect(
        quality.total,
        `seed ${i} ${s.missionId} ${s.profile} route ${Number(second) + 1}: ${JSON.stringify(quality.reasons)}`,
      ).toBe(100);
    }
});
