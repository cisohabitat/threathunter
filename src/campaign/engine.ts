import { packages, type Fact } from "./content";
import {
  commandSchema,
  keyOf,
  type Acquisition,
  type Collection,
  type Command,
  type Debrief,
  type Event,
  type Finding,
  type MissionId,
  type Quality,
  type Receipt,
  type Ref,
  type View,
  type World,
  type Window,
} from "./contracts";

export const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
};
export function checksum(value: unknown) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(canonical(value))) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
export type State = {
  engineVersion: "p1-1";
  missionId: MissionId;
  world: World;
  view: View;
  facts: Record<string, string>;
  cache: Record<string, boolean>;
  flags: Record<string, boolean>;
  events: Event[];
  collection: Collection[];
  acquisitions: Acquisition[];
  activation: Window | null;
  receipts: Record<string, { fingerprint: string; receipt: Receipt }>;
  commands: Command[];
  persistence: { committedRevision: number | null };
  debrief: Debrief | null;
};
export function emptyFinding(mission: MissionId): Finding {
  return {
    disposition: "provisional",
    confidence: "low",
    evidence: [],
    alternative: "untested",
    alternativeEvidence: [],
    limitations: [],
    targetId: mission === "M04" ? "unselected" : "CS-PORTAL",
    missingFrom: null,
    missingThrough: null,
    handoff: mission === "M04" ? "review_dependency" : "repair_collection",
    owner: mission === "M04" ? "Billing Operations" : "Detection Engineering",
    reviewWithinTicks: 4,
    followup: "unselected",
    scopeAcknowledged: false,
    notes: "",
  };
}
function deliver(
  s: State,
  fact: Fact,
  acquisitionId: string,
  cutoffTick: number,
) {
  const ref = { acquisitionId, recordId: fact.recordId };
  s.view.records.push({
    ref,
    title: fact.title,
    text: fact.text,
    sourceId: fact.sourceId,
    lineage: fact.lineage,
    targetId: fact.targetId,
    eventTick: fact.eventTick,
    cutoffTick,
    deliveredTick: s.view.tick,
    coverage: fact.coverage,
    ...(fact.relationship
      ? { relationship: structuredClone(fact.relationship) }
      : {}),
  });
  s.facts[keyOf(ref)] = fact.id;
  return ref;
}
function runtime(
  s: State,
  id: string,
  title: string,
  text: string,
  sourceId: string,
  acquisitionId: string,
  targetId: string,
  cutoff: number,
  coverage: Fact["coverage"] = "covered",
) {
  return deliver(
    s,
    {
      id,
      recordId: `R-${id}`,
      title,
      text,
      sourceId,
      lineage: sourceId,
      targetId,
      worlds: [s.world],
      eventTick: cutoff,
      availableAt: s.view.tick,
      coverage,
      originId: null,
    },
    acquisitionId,
    cutoff,
  );
}
function acquisition(
  s: State,
  id: string,
  queryId: string,
  targetId: string,
  cutoffTick: number,
  refs: Ref[],
) {
  const item = {
    id,
    queryId,
    targetId,
    cutoffTick,
    deliveredTick: s.view.tick,
    refs,
  };
  s.acquisitions.push(item);
  s.view.acquisitions.push(structuredClone(item));
}
export function createRun(
  missionId: MissionId,
  runId: string,
  world: World,
): State {
  const pack = packages[missionId];
  if (!pack.worlds.includes(world))
    throw Error("Unsupported mission selection");
  const s: State = {
    engineVersion: "p1-1",
    missionId,
    world,
    view: {
      missionId,
      runId,
      revision: 0,
      tick: 0,
      phase: "investigating",
      scope: "all",
      records: [],
      pending: [],
      windows: [],
      finding: emptyFinding(missionId),
      acquisitions: [],
      history: [{ tick: 0, text: `Planned review opened: ${pack.question}` }],
    },
    facts: {},
    cache: {},
    flags: { session_active: true },
    events: [],
    collection: [],
    acquisitions: [],
    activation: null,
    receipts: {},
    commands: [],
    persistence: { committedRevision: null },
    debrief: null,
  };
  for (const e of pack.events.filter(
    (e) => e.tick <= 0 && e.worlds.includes(world),
  )) {
    s.events.push({
      id: e.id,
      tick: e.tick,
      phase: e.phase,
      actor: e.actor,
      description: e.description,
      applied: true,
    });
    s.flags[e.effect] = true;
  }
  for (const f of pack.facts.filter(
    (f) =>
      f.worlds.includes(world) && !f.originId && f.coverage !== "unavailable",
  ))
    s.collection.push({
      id: `catalogue.${f.id}`,
      sourceId: f.sourceId,
      originId: `catalogue.${f.id}`,
      eventTick: f.eventTick ?? 0,
      availableTick: f.availableAt,
      capability: f.lineage,
    });
  for (const id of pack.openingFactIds)
    deliver(
      s,
      pack.facts.find((f) => f.id === id)!,
      "opening",
      0,
    );
  return s;
}
const has = (s: State, fact: string) => Object.values(s.facts).includes(fact);
// The pinned finite profile expands the shared M04 world-event templates.
// Legitimate work belongs in phase 3; unauthorised work belongs in phase 4.
const phaseOf = (event: { actor: string; phase: number }, world: World) =>
  event.actor === "world" && (world === "B" || world === "U-B")
    ? 3
    : event.phase;
const actorOf = (event: { actor: string }, world: World) =>
  event.actor === "world"
    ? world === "B" || world === "U-B"
      ? "business"
      : "adversary"
    : event.actor;
function sensorAt(s: State, tick: number, target: string) {
  return (
    target === "CS-API" ||
    s.view.windows.some(
      (w) => w.targetId === target && w.startsAt <= tick && tick <= w.endsAt,
    )
  );
}
function advance(
  s: State,
  duration: number,
  controlTick?: number,
  continuation = false,
) {
  const pack = packages[s.missionId];
  for (let tick = s.view.tick + 1; tick <= s.view.tick + duration; tick++) {
    // All seven phases run in order. Author priorities are fixed; IDs break ties.
    for (let phase = 1; phase <= 7; phase++) {
      if (phase === 1) {
        if (controlTick === tick) {
          s.flags.session_active = false;
          s.events.push({
            id: `response.${tick}`,
            tick,
            phase,
            actor: "response",
            description:
              "Response team restricts BILL-S1 only; the billing host and APP-01 batch remain available.",
            applied: true,
          });
        }
        if (s.activation?.startsAt === tick && !continuation) {
          const w = s.activation;
          s.view.windows.push(structuredClone(w));
          s.activation = null;
          const previous = s.view.tick;
          s.view.tick = tick;
          const ref = runtime(
            s,
            "sensor_enabled",
            "Future collection window enabled",
            `${w.sourceId} collection on ${w.targetId} is enabled from step ${tick} through ${w.endsAt}. Earlier missing records remain missing. This is a bounded verification window, not permanent remediation.`,
            w.sourceId,
            w.id,
            w.targetId,
            tick,
          );
          acquisition(s, w.id, "enable_sensor", w.targetId, tick, [ref]);
          s.view.tick = previous;
          s.events.push({
            id: `sensor.${w.id}`,
            tick,
            phase,
            actor: "sensor",
            description: `Future-only ${w.sourceId} collection begins on ${w.targetId}.`,
            applied: true,
          });
        }
      }
      if (phase === 3) {
        for (const check of s.view.pending
          .filter((c) => c.dueTick === tick)
          .sort((a, b) => (a.id < b.id ? -1 : 1)))
          s.events.push({
            id: `synthetic.${check.id}`,
            tick,
            phase,
            actor: "investigator",
            description: `A harmless controlled application event tests ${check.targetId}.`,
            applied: true,
          });
      }
      for (const e of pack.events
        .filter(
          (e) =>
            e.tick === tick &&
            phaseOf(e, s.world) === phase &&
            e.worlds.includes(s.world),
        )
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
        const applied = e.requires.every((k) => s.flags[k]);
        s.events.push({
          id: e.id,
          tick,
          phase,
          actor: actorOf(e, s.world),
          description: e.description,
          applied,
        });
        if (!applied) continue;
        s.flags[e.effect] = true;
      }
      if (phase === 5) {
        for (const f of pack.facts.filter(
          (f) =>
            f.worlds.includes(s.world) && f.originId && f.availableAt === tick,
        )) {
          if (s.events.some((e) => e.id === f.originId && e.applied))
            s.collection.push({
              id: `record.${f.id}`,
              sourceId: f.sourceId,
              originId: f.originId!,
              eventTick: f.eventTick!,
              availableTick: tick,
              capability: f.lineage,
            });
        }
        if (
          s.flags.task_execution &&
          pack.missionId === "M04" &&
          tick === 8 &&
          sensorAt(s, tick, "LEGACY-01")
        )
          s.collection.push({
            id: "future.task.execution",
            sourceId: "task_process",
            originId: "future-execution",
            eventTick: tick,
            availableTick: tick,
            capability: "execution_only_not_creation",
          });
      }
      if (phase === 5) {
        for (const check of s.view.pending.filter((c) => c.dueTick === tick))
          if (sensorAt(s, tick, check.targetId))
            s.collection.push({
              id: `verification.${check.id}`,
              sourceId: "cs_app",
              originId: `synthetic.${check.id}`,
              eventTick: tick,
              availableTick: tick,
              capability: "controlled_privileged_application_event",
            });
      }
      if (phase === 6) {
        for (const check of s.view.pending.filter((c) => c.dueTick === tick)) {
          const received = s.collection.some(
            (c) => c.id === `verification.${check.id}`,
          );
          const previous = s.view.tick;
          s.view.tick = tick;
          const fact =
            check.targetId === "CS-PORTAL"
              ? received
                ? "test_received"
                : "test_failed"
              : "other_test_received";
          if (!continuation) {
            const ref = runtime(
              s,
              fact,
              received
                ? "Controlled application event received"
                : "Controlled application event not received",
              `${check.targetId}: the harmless privileged-application verification event at step ${tick} ${received ? "reached the collection path" : "did not reach a working collection path"}. This tests that event, source, target and time only; it proves nothing about the earlier missing interval or another service.`,
              "synthetic_verification",
              check.id,
              check.targetId,
              tick,
              received ? "covered" : "unavailable",
            );
            acquisition(s, check.id, "verification", check.targetId, tick, [
              ref,
            ]);
          }
          if (!continuation) {
            s.view.history.push({
              tick,
              text: `Requested verification on ${check.targetId} completed; its stated source/time limits apply.`,
            });
          }
          s.view.tick = previous;
        }
        s.view.pending = s.view.pending.filter((c) => c.dueTick !== tick);
      }
    }
  }
  s.view.tick += duration;
}
function evaluate(s: State, finding: Finding): Quality {
  const pack = packages[s.missionId];
  const factSet = new Set(finding.evidence.map((r) => s.facts[keyOf(r)]));
  const alternatives = new Set(
    finding.alternativeEvidence.map((r) => s.facts[keyOf(r)]),
  );
  const contains = (id: string) => factSet.has(id);
  const supported = pack.sufficientSets[finding.disposition].some((set) =>
    set.every(contains),
  );
  const baseline = contains(
    s.missionId === "M04" ? "baseline" : "review_scope",
  );
  const context =
    s.missionId === "M04"
      ? contains("dependency") &&
        ["change_match", "change_none", "change_gap"].some(contains)
      : contains("declared") && contains("heartbeat_gap");
  const technical =
    s.missionId === "M04"
      ? [
          "task_approved",
          "task_persistence",
          "task_gap",
          "origin_approved",
          "origin_unapproved",
          "origin_gap",
          "access_unexpected",
          "access_gap",
        ].some(contains)
      : contains("auth_limited") &&
        ["test_failed", "test_received", "configuration"].some(contains);
  const alternative =
    s.missionId === "M04"
      ? finding.alternative === "approved_work_tested" &&
        ["change_match", "change_none", "change_gap"].some((id) =>
          alternatives.has(id),
        )
      : finding.alternative === "coverage_configuration_tested" &&
        ["configuration", "test_failed"].some((id) => alternatives.has(id));
  const limit =
    s.missionId === "M04"
      ? finding.limitations.includes("dependency") &&
        contains("dependency") &&
        (finding.disposition === "visibility"
          ? finding.limitations.includes("historical_gap")
          : finding.limitations.includes("anomaly_not_proof"))
      : finding.limitations.includes("historical_gap") &&
        finding.limitations.includes("test_not_history") &&
        contains("heartbeat_gap");
  const scoped =
    finding.scopeAcknowledged &&
    finding.targetId === (s.missionId === "M04" ? "LEGACY-01" : "CS-PORTAL") &&
    (s.missionId === "M04"
      ? contains("relationship")
      : finding.missingFrom === -3 && finding.missingThrough === 0);
  const permitted =
    scoped &&
    finding.handoff !== "isolate_host" &&
    (s.missionId === "M04"
      ? finding.handoff !== "repair_collection" && contains("dependency")
      : finding.handoff === "repair_collection");
  const appropriate =
    supported &&
    (s.missionId === "M04"
      ? finding.handoff ===
        (finding.disposition === "explained"
          ? "close_explained"
          : finding.disposition === "misuse"
            ? "restrict_session"
            : "review_dependency")
      : finding.handoff === "repair_collection");
  const confidence =
    supported &&
    (finding.disposition === "visibility" ||
    finding.disposition === "provisional"
      ? finding.confidence === "low"
      : finding.confidence === "medium");
  const owner =
    finding.owner ===
    (s.missionId === "M04"
      ? finding.handoff === "close_explained"
        ? "none"
        : "Billing Operations"
      : "Detection Engineering");
  const followup =
    finding.reviewWithinTicks <= 4 &&
    finding.followup ===
      (s.missionId === "M07"
        ? "repeat_application_verification"
        : finding.handoff === "close_explained"
          ? "routine_monitoring"
          : finding.handoff === "restrict_session"
            ? "confirm_session_restriction"
            : "verify_dependency_and_scope");
  const reasons: Quality["reasons"] = [];
  const rule = (
    id: string,
    earned: boolean,
    text: string,
    refs = finding.evidence,
  ) => {
    reasons.push({ id, earned, text, refs: structuredClone(refs) });
    return earned ? 1 : 0;
  };
  const evidence =
    25 *
    (rule(
      "evidence.baseline",
      baseline,
      "Cite the planned review scope and relevant baseline.",
    ) +
      rule(
        "evidence.context",
        context,
        "Cite business/approval context or the declared-versus-observed collection mismatch.",
      ) +
      rule(
        "evidence.technical",
        technical,
        "Cite a source that tests the relevant technical capability and its limits.",
      ) +
      rule(
        "evidence.support",
        supported,
        "Your cited observations must meet an authored sufficient set for this finding.",
      ));
  const reasoning =
    50 *
      rule(
        "reasoning.support",
        supported,
        "The finding needs observation-based support, including useful uncertainty.",
      ) +
    30 *
      rule(
        "reasoning.alternative",
        alternative,
        "Test a competing explanation using the separate evidence role.",
        finding.alternativeEvidence,
      ) +
    20 *
      rule(
        "reasoning.limits",
        limit,
        "Record the relevant dependency or historical/test collection limits.",
      );
  const decision =
    40 *
      rule(
        "decision.proportion",
        appropriate,
        "Pair the supported finding with a proportionate next action.",
      ) +
    30 *
      rule(
        "decision.authority",
        permitted,
        "Use the exact target and permitted capability; no unmanaged-host isolation.",
      ) +
    30 *
      rule(
        "decision.ownership",
        owner && permitted,
        "Use the disclosed response owner; there is no hidden speed bonus or hindsight penalty.",
      );
  const report =
    40 *
      rule(
        "report.confidence",
        confidence,
        "Use medium claim confidence for supported M04 explanations/misuse and low for visibility/provisional findings.",
      ) +
    30 *
      rule(
        "report.scope",
        scoped && limit,
        "Bound the exact host/session or source and missing interval.",
      ) +
    30 *
      rule(
        "report.followup",
        owner && followup && appropriate,
        "State the owner, bounded review and explicit verification/follow-up trigger.",
      );
  return {
    evidence,
    reasoning,
    decision,
    report,
    total: Math.floor(
      0.3 * evidence + 0.25 * reasoning + 0.3 * decision + 0.15 * report + 0.5,
    ),
    supported,
    reasons,
  };
}
function validRefs(s: State, finding: Finding) {
  return [...finding.evidence, ...finding.alternativeEvidence].every((r) =>
    Object.hasOwn(s.facts, keyOf(r)),
  );
}
function transition(
  current: State,
  input: unknown,
  copy: boolean,
): { state: State; receipt: Receipt } {
  const raw = input as Partial<Command> | null;
  const rejected = (error: string) => ({
    state: current,
    receipt: {
      status: "rejected" as const,
      commandId: typeof raw?.commandId === "string" ? raw.commandId : "invalid",
      revision: current.view.revision,
      tick: current.view.tick,
      durability: "not_applicable" as const,
      replayed: false,
      error,
    },
  });
  let fingerprint: string;
  try {
    fingerprint = canonical(input);
  } catch {
    return rejected("INVALID_PAYLOAD");
  }
  if (
    typeof raw?.commandId === "string" &&
    Object.hasOwn(current.receipts, raw.commandId)
  ) {
    const old = current.receipts[raw.commandId];
    return old.fingerprint === fingerprint
      ? { state: current, receipt: { ...old.receipt, replayed: true } }
      : rejected("ID_CONFLICT");
  }
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) return rejected("INVALID_PAYLOAD");
  const cmd = parsed.data,
    v = current.view,
    pack = packages[current.missionId];
  if (cmd.runId !== v.runId) return rejected("WRONG_RUN");
  if (cmd.expectedRevision !== v.revision) return rejected("STALE_REVISION");
  if (v.phase === "closed") return rejected("CLOSED");
  if (cmd.kind === "SCOPE") {
    const allowed =
      current.missionId === "M04"
        ? [
            "all",
            "APP-01",
            ...(has(current, "relationship") ? ["LEGACY-01"] : []),
          ]
        : ["all", "CS-API", "CS-PORTAL"];
    if (!allowed.includes(cmd.targetId)) return rejected("INVALID_SCOPE");
  }
  const q =
    cmd.kind === "ACQUIRE"
      ? pack.queries.find((q) => q.id === cmd.queryId)
      : undefined;
  if (
    cmd.kind === "ACQUIRE" &&
    (!q ||
      cmd.cutoffTick > v.tick ||
      (q.scope === "host" && v.scope !== "LEGACY-01"))
  )
    return rejected("INVALID_SCOPE_OR_CUTOFF");
  if (
    cmd.kind === "VERIFY" &&
    (current.missionId !== "M07" || v.scope !== cmd.targetId)
  )
    return rejected("INVALID_TARGET");
  if (
    cmd.kind === "ENABLE_SENSOR" &&
    (v.windows.length > 0 ||
      current.activation ||
      v.scope !== cmd.targetId ||
      (current.missionId === "M04"
        ? cmd.targetId !== "LEGACY-01" ||
          cmd.sourceId !== "task_process" ||
          !has(current, "dependency")
        : cmd.targetId !== "CS-PORTAL" ||
          cmd.sourceId !== "cs_app" ||
          !has(current, "heartbeat_gap")))
  )
    return rejected("UNAUTHORIZED_SENSOR");
  if (
    (cmd.kind === "EDIT_CASE" || cmd.kind === "CLOSE_CASE") &&
    !validRefs(current, cmd.finding)
  )
    return rejected("UNKNOWN_EVIDENCE");
  const s = copy ? structuredClone(current) : current;
  const start = s.view.tick;
  if (cmd.kind === "SCOPE") {
    s.view.scope = cmd.targetId;
    if (cmd.targetId === "LEGACY-01") s.view.finding.targetId = "LEGACY-01";
  } else if (cmd.kind === "ACQUIRE" && q) {
    const cache = `${q.id}:${s.view.scope}:${q.static ? "static" : cmd.cutoffTick}`;
    if (!s.cache[cache]) {
      const selected = pack.facts.filter(
        (f) =>
          q.factIds.includes(f.id) &&
          f.worlds.includes(s.world) &&
          f.availableAt <= cmd.cutoffTick &&
          (!f.originId ||
            s.collection.some(
              (c) =>
                c.originId === f.originId &&
                c.sourceId === f.sourceId &&
                c.availableTick <= cmd.cutoffTick,
            )) &&
          (q.scope !== "account" ||
            s.view.scope === "all" ||
            f.targetId === s.view.scope),
      );
      const window =
        q.id === "window"
          ? s.view.windows.find(
              (w) =>
                w.targetId === s.view.scope && w.startsAt <= cmd.cutoffTick,
            )
          : undefined;
      const execution =
        window &&
        s.collection.find(
          (c) =>
            c.id === "future.task.execution" && c.eventTick <= cmd.cutoffTick,
        );
      advance(s, 1);
      const refs = selected.map((f) =>
        deliver(s, f, cmd.commandId, cmd.cutoffTick),
      );
      if (q.id === "window") {
        const complete = window && cmd.cutoffTick >= window.endsAt;
        refs.push(
          runtime(
            s,
            complete ? "window_complete" : "window_pending",
            complete
              ? "Future observation window complete"
              : "Observation window not complete",
            window
              ? `Only ${window.sourceId} on ${window.targetId}, steps ${window.startsAt}–${Math.min(cmd.cutoffTick, window.endsAt)}, is in this snapshot. ${complete ? "The defined window is complete." : "The requested cutoff is before its end."} ${execution ? "A scheduled execution at step 8 was recorded; its creation origin was not recovered." : "No additional execution is established by this snapshot."} Historical collection is not backfilled; a quiet future window does not establish historical inactivity.`
              : "No permitted future observation window has been enabled. Choose a target, establish its dependency/coverage, then enable the stated source.",
            q.sourceId,
            cmd.commandId,
            s.view.scope,
            cmd.cutoffTick,
            window ? "partial" : "unavailable",
          ),
        );
      } else if (!refs.length)
        refs.push(
          runtime(
            s,
            "covered_empty",
            "No matching record at this cutoff",
            `This source returned no matching records in the selected scope through step ${cmd.cutoffTick}. It does not include events created during this acquisition or later.`,
            q.sourceId,
            cmd.commandId,
            s.view.scope,
            cmd.cutoffTick,
          ),
        );
      acquisition(s, cmd.commandId, q.id, s.view.scope, cmd.cutoffTick, refs);
      s.cache[cache] = true;
      s.view.history.push({
        tick: s.view.tick,
        text: `${q.label}; scope ${s.view.scope}; collected through step ${cmd.cutoffTick}.`,
      });
    }
  } else if (cmd.kind === "VERIFY") {
    if (!s.view.pending.some((c) => c.targetId === cmd.targetId)) {
      s.view.pending.push({
        id: cmd.commandId,
        targetId: cmd.targetId,
        requestedTick: start,
        dueTick: start + 3,
      });
      advance(s, 1);
      s.view.history.push({
        tick: s.view.tick,
        text: `Controlled application verification requested on ${cmd.targetId}; due at step ${start + 3}.`,
      });
    }
  } else if (cmd.kind === "ENABLE_SENSOR") {
    s.activation = {
      id: cmd.commandId,
      targetId: cmd.targetId,
      sourceId: cmd.sourceId,
      startsAt: start + 2,
      endsAt: start + 2 + cmd.observationTicks,
    };
    advance(s, 2);
    s.view.history.push({
      tick: s.view.tick,
      text: `Future-only ${cmd.sourceId} collection enabled on ${cmd.targetId}; window ends at step ${s.view.windows.at(-1)!.endsAt}.`,
    });
  } else if (cmd.kind === "ADVANCE") {
    advance(s, cmd.durationTicks);
    s.view.history.push({
      tick: s.view.tick,
      text: `Advanced ${cmd.durationTicks} investigation step(s).`,
    });
  } else if (cmd.kind === "EDIT_CASE" || cmd.kind === "CLOSE_CASE") {
    s.view.finding = structuredClone(cmd.finding);
    if (cmd.kind === "CLOSE_CASE") {
      const quality = evaluate(s, cmd.finding);
      const continuation = structuredClone(s);
      const restrict =
        s.missionId === "M04" &&
        quality.supported &&
        cmd.finding.disposition === "misuse" &&
        cmd.finding.handoff === "restrict_session" &&
        cmd.finding.targetId === "LEGACY-01" &&
        cmd.finding.scopeAcknowledged &&
        cmd.finding.evidence.some((r) => s.facts[keyOf(r)] === "dependency");
      const end = Math.max(s.missionId === "M04" ? 10 : start + 2, start + 2);
      advance(
        continuation,
        end - start,
        restrict ? start + 2 : undefined,
        true,
      );
      const response =
        s.missionId === "M07"
          ? cmd.finding.handoff === "repair_collection" &&
            cmd.finding.scopeAcknowledged &&
            cmd.finding.targetId === "CS-PORTAL"
            ? "Detection Engineering receives the bounded repair/reverification request. The temporary test window does not establish earlier activity or restore the missing historical interval."
            : "The response request lacks the permitted target or bounds and requires review. No disruptive action is approved."
          : restrict
            ? `Response team restricts BILL-S1 at step ${start + 2}. LEGACY-01 and its APP-01 billing dependency stay available.`
            : cmd.finding.handoff === "isolate_host"
              ? "Host isolation is not authorised: no managed-host capability exists. The responder retains the billing dependency and requests scoped review."
              : cmd.finding.handoff === "restrict_session"
                ? "Session restriction needs further evidence/scope review; it is not self-approved."
                : "Billing Operations receives the scoped finding; the billing dependency remains available for routine monitoring or review.";
      if (!restrict)
        continuation.events.push({
          id: `handoff.${cmd.commandId}`,
          tick: start + 2,
          phase: 1,
          actor: "response",
          description: response,
          applied: cmd.finding.handoff !== "isolate_host",
        });
      continuation.events.sort(
        (a, b) =>
          a.tick - b.tick ||
          a.phase - b.phase ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );
      s.debrief = {
        finding: structuredClone(cmd.finding),
        quality,
        closeTick: start,
        resolvedThrough: end,
        records: structuredClone(s.view.records),
        history: structuredClone(s.view.history),
        pending: structuredClone(s.view.pending),
        response,
        objectiveOccurred: Boolean(continuation.flags.objective),
        businessPreserved:
          s.missionId === "M04"
            ? Boolean(continuation.flags.billing_completed)
            : true,
        truth: pack.truth[s.world],
        events: continuation.events,
        collection: continuation.collection,
        acquisitions: structuredClone(s.acquisitions),
      };
      s.view.phase = "closed";
      s.view.history.push({
        tick: start,
        text: "Finding frozen; after-handoff continuation resolved separately.",
      });
    }
  }
  s.view.revision++;
  s.commands.push(structuredClone(cmd));
  const receipt: Receipt = {
    status: "accepted",
    commandId: cmd.commandId,
    revision: s.view.revision,
    tick: s.view.tick,
    durability: "memory_only",
    replayed: false,
  };
  s.receipts[cmd.commandId] = { fingerprint, receipt };
  return { state: s, receipt };
}
export const processCommand = (current: State, input: unknown) =>
  transition(current, input, true);
export function replay(initial: State, commands: Command[]) {
  let state = structuredClone(initial);
  for (const command of commands) {
    const result = transition(state, command, false);
    if (result.receipt.status !== "accepted" || result.receipt.replayed)
      throw Error("Invalid P1 command history");
    state = result.state;
  }
  return state;
}
export function project(state: State) {
  return structuredClone(state.view);
}
export function acknowledge(state: State, revision: number | null) {
  const copy = structuredClone(state);
  copy.persistence.committedRevision = revision;
  for (const { receipt } of Object.values(copy.receipts))
    receipt.durability =
      revision !== null && receipt.revision <= revision
        ? "committed"
        : "memory_only";
  return copy;
}
export function stateHash(state: State) {
  const copy = acknowledge(state, null);
  return checksum(copy);
}
