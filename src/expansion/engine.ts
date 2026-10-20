import { packages, type Fact } from "./content";
import {
  commandSchema,
  keyOf,
  type Command,
  type Debrief,
  type Disposition,
  type Finding,
  type MissionId,
  type PublicRecord,
  type Quality,
  type Receipt,
  type Ref,
  type View,
  type World,
  type Event,
  type Collection,
  type Acquisition,
} from "./contracts";
export const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(",")}]`
    : value !== null && typeof value === "object"
      ? `{${Object.keys(value)
          .sort()
          .map(
            (k) =>
              `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`,
          )
          .join(",")}}`
      : JSON.stringify(value);
export function checksum(value: unknown) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(canonical(value))) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
export type Profile = "standard" | "late-collection" | "slow-response";
export type State = {
  engineVersion: "expansion-1";
  missionId: MissionId;
  world: World;
  profile: Profile;
  seed: string | null;
  mode: "campaign" | "free";
  view: View;
  facts: Record<string, string>;
  cache: Record<string, boolean>;
  events: Event[];
  collection: Collection[];
  acquisitions: Acquisition[];
  receipts: Record<string, { fingerprint: string; receipt: Receipt }>;
  commands: Command[];
  persistence: { committedRevision: number | null };
  debrief: Debrief | null;
  accessActive: boolean;
  objectiveOccurred: boolean;
  controlEffective: boolean;
  generatedTests: { id: string; targetId: string; tick: number }[];
};
const clone = <T>(x: T): T => structuredClone(x);
export function emptyFinding(mission: MissionId): Finding {
  return {
    disposition: "provisional",
    confidence: "low",
    evidence: [],
    alternativeEvidence: [],
    alternative: "untested",
    links: [],
    limitations: [],
    targetId: "unselected",
    mechanicChoice: "",
    priorities: [],
    handoff: "review_monitor",
    owner: packages[mission].response.owner,
    reviewWithinTicks: 4,
    followup: "unselected",
    followups: [],
    scopeAcknowledged: false,
    notes: "",
  };
}
export function createRun(
  mission: MissionId,
  runId: string,
  world: World,
  profile: Profile = "standard",
  seed: string | null = null,
): State {
  if (
    !packages[mission] ||
    !packages[mission].worlds.includes(world) ||
    !runId ||
    runId.length > 100 ||
    !["standard", "late-collection", "slow-response"].includes(profile)
  )
    throw Error("Invalid run selection");
  const p = packages[mission];
  const s: State = {
    engineVersion: "expansion-1",
    missionId: mission,
    world,
    profile,
    seed,
    mode: seed === null ? "campaign" : "free",
    view: {
      runId,
      revision: 0,
      tick: 0,
      phase: "investigating",
      missionId: mission,
      policy: {
        responseDelayTicks:
          p.response.delayTicks + (profile === "slow-response" ? 1 : 0),
        collectionDelayTicks: profile === "late-collection" ? 2 : 0,
      },
      scope: p.initialScope,
      entityIds: [...p.initialEntities],
      records: [],
      finding: emptyFinding(mission),
      history: [],
      pendingChecks: [],
      responses: [],
      sensor: null,
      responseWindowOpenedAt: null,
    },
    facts: {},
    cache: {},
    events: [],
    collection: [],
    acquisitions: [],
    receipts: {},
    commands: [],
    persistence: { committedRevision: null },
    debrief: null,
    accessActive: true,
    objectiveOccurred: false,
    controlEffective: false,
    generatedTests: [],
  };
  s.events.push({
    id: "session-start",
    tick: 0,
    phase: world.endsWith("M") ? 3 : 2,
    priority: 0,
    kind: "session_start",
    actor: world.endsWith("M")
      ? "Unauthorised session operator"
      : "Authorised business operator",
    targetId: p.primaryTarget,
    text: "A named session obtains the access represented by this authored case.",
    occurred: true,
  });
  const f = p.facts.find((f) => f.id === "opening")!;
  deliver(s, f, "initial", 0);
  s.acquisitions.push({
    id: "initial",
    queryId: "briefing",
    targetId: p.initialScope,
    cutoffTick: 0,
    deliveredTick: 0,
    refs: [clone(s.view.records[0].ref)],
  });
  return s;
}
export function project(s: State): View {
  return clone(s.view);
}
const pack = (s: State) => packages[s.missionId];
const offset = (s: State) => (s.profile === "late-collection" ? 2 : 0);
const responseDelay = (s: State) =>
  pack(s).response.delayTicks + (s.profile === "slow-response" ? 1 : 0);
export function disclosedPolicy(s: State) {
  return {
    responseDelayTicks: responseDelay(s),
    collectionDelayTicks: offset(s),
  };
}
const factEventTick = (s: State, f: Fact) =>
  f.eventTick === null
    ? null
    : f.eventTick +
      (["objective", "follow-on"].includes(f.originId) &&
      s.profile === "late-collection"
        ? 2
        : 0);
const factAvailable = (s: State, f: Fact) =>
  f.availableAt +
  (["objective", "follow-on"].includes(f.originId) &&
  s.profile === "late-collection"
    ? 2
    : 0) +
  (f.eventTick === null ? 0 : offset(s));
function deliver(s: State, f: Fact, acquisitionId: string, cutoff: number) {
  const ref = { acquisitionId, recordId: f.recordId };
  const record: PublicRecord = {
    ref,
    title: f.title,
    text: f.text,
    sourceId: f.sourceId,
    entityIds: [...f.entityIds],
    eventTick: factEventTick(s, f),
    cutoffTick: cutoff,
    deliveredTick: s.view.tick,
    coverage: f.coverage,
    lineage: f.lineage,
    caveats: [...f.caveats],
  };
  s.view.records.push(record);
  if (
    f.eventTick === null &&
    f.sourceId !== "directory_callback" &&
    !s.collection.some((c) => c.id === `catalogue:${f.id}`)
  )
    s.collection.push({
      id: `catalogue:${f.id}`,
      originId: f.originId,
      sourceId: f.sourceId,
      recordedTick: 0,
      availableAt: f.availableAt,
      coverage: f.coverage,
    });
  s.facts[keyOf(ref)] = f.id;
  for (const id of f.entityIds)
    if (!s.view.entityIds.includes(id)) s.view.entityIds.push(id);
  if (
    pack(s).response.requiredFacts.includes(f.id) &&
    s.view.responseWindowOpenedAt === null
  )
    s.view.responseWindowOpenedAt = s.view.tick;
  return clone(ref);
}
function history(
  s: State,
  id: string,
  title: string,
  text: string,
  refs: Ref[] = [],
) {
  s.view.history.push({
    id,
    tick: s.view.tick,
    title,
    text,
    refs: clone(refs),
  });
}
function recordSource(s: State, tick: number) {
  for (const f of [...pack(s).facts].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  )) {
    if (
      f.eventTick === null ||
      factEventTick(s, f)! > tick ||
      !f.worlds.includes(s.world) ||
      f.coverage !== "covered" ||
      f.sourceId === "directory_callback"
    )
      continue;
    if (!s.events.some((e) => e.id === f.originId && e.occurred)) continue;
    const id = `collection:${f.id}`;
    if (!s.collection.some((c) => c.id === id))
      s.collection.push({
        id,
        originId: f.originId,
        sourceId: f.sourceId,
        recordedTick: factEventTick(s, f)!,
        availableAt: factAvailable(s, f),
        coverage: f.coverage,
      });
  }
}
function advance(s: State, duration: number) {
  const p = pack(s);
  for (let i = 0; i < duration; i++) {
    s.view.tick++;
    const t = s.view.tick;
    // 1. Response/control completions, before business/adversary ties.
    for (const response of [...s.view.responses].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ))
      if (response.status === "pending" && response.dueTick === t) {
        response.status = "effective";
        response.text =
          "The authorised response team restricted only the named session. Other identities, sessions and services remain outside this control.";
        s.accessActive = false;
        s.controlEffective = true;
        s.events.push({
          id: response.id,
          tick: t,
          phase: 1,
          priority: 0,
          kind: "response",
          actor: p.response.owner,
          targetId: response.targetId,
          text: response.text,
          occurred: true,
        });
        if (s.view.phase === "investigating")
          history(s, response.id, "Scoped response effective", response.text);
      }
    // 2. Legitimate business activity has its own actor and explicit access precondition.
    if (t === 2 && !s.world.endsWith("M"))
      s.events.push({
        id: "session-action",
        tick: t,
        phase: 2,
        priority: 0,
        kind: "business_action",
        actor: "Authorised business operator",
        targetId: p.primaryTarget,
        text: p.facts.find((f) => f.id === "activity_B")!.text,
        occurred: s.accessActive,
      });
    // 3. Unauthorised activity and harmless, explicitly requested test generation.
    if (t === 2 && s.world.endsWith("M"))
      s.events.push({
        id: "session-action",
        tick: t,
        phase: 3,
        priority: 0,
        kind: "session_action",
        actor: "Unauthorised session operator",
        targetId: p.primaryTarget,
        text: p.facts.find((f) => f.id === "activity_M")!.text,
        occurred: s.accessActive,
      });
    const objectiveAt =
      p.response.objectiveTick + (s.profile === "late-collection" ? 2 : 0);
    if (t === objectiveAt && !s.world.endsWith("M"))
      s.events.push({
        id: "follow-on",
        tick: t,
        phase: 2,
        priority: 10,
        kind: "business_follow_on",
        actor: "Authorised business operator",
        targetId: p.primaryTarget,
        text: "The session performs an additional approved operation within the same business scope.",
        occurred: s.accessActive,
      });
    if (t === objectiveAt && s.world.endsWith("M")) {
      const occurred = s.accessActive;
      s.events.push({
        id: "objective",
        tick: t,
        phase: 3,
        priority: 10,
        kind: "objective_attempt",
        actor: "Unauthorised session operator",
        targetId: p.primaryTarget,
        text: p.response.objective,
        occurred,
      });
      if (occurred) s.objectiveOccurred = true;
    }
    if (
      s.view.sensor &&
      t === s.view.sensor.startsAt + 1 &&
      t <= s.view.sensor.endsAt
    ) {
      s.generatedTests.push({
        id: `test:${t}`,
        targetId: s.view.sensor.targetId,
        tick: t,
      });
      s.events.push({
        id: `test:${t}`,
        tick: t,
        phase: 3,
        priority: 20,
        kind: "benign_verification_event",
        actor: "Authorised synthetic test",
        targetId: s.view.sensor.targetId,
        text: "A harmless source-health event is generated after the explicitly enabled collection starts.",
        occurred: true,
      });
    }
    // 4. Consequences stay private and never enter quality.
    if (
      s.objectiveOccurred &&
      !s.events.some((e) => e.id === "objective-state")
    )
      s.events.push({
        id: "objective-state",
        tick: t,
        phase: 4,
        priority: 0,
        kind: "service_state",
        actor: "Simulation",
        targetId: p.primaryTarget,
        text: "The bounded out-of-scope objective completed through this session.",
        occurred: true,
      });
    // 5. Sources record only their capabilities; delayed availability is separate.
    recordSource(s, t);
    for (const test of s.generatedTests)
      if (test.tick === t)
        s.collection.push({
          id: `collection:${test.id}`,
          originId: test.id,
          sourceId: "future_verification",
          recordedTick: t,
          availableAt: t,
          coverage: "covered",
        });
    // 6. Non-blocking verified checks complete at request-start +3, once.
    const due = s.view.pendingChecks.filter((c) => c.dueTick === t);
    for (const check of due) {
      const f = p.facts.find(
        (f) =>
          f.sourceId === "directory_callback" && f.worlds.includes(s.world),
      )!;
      s.events.push({
        id: `verified:${check.id}`,
        tick: t,
        phase: 6,
        priority: 0,
        kind: "verified_business_response",
        actor: "Pre-established directory contact channel",
        targetId: check.targetId,
        text: f.text,
        occurred: true,
      });
      s.collection.push({
        id: `collection:${check.id}`,
        originId: `verified:${check.id}`,
        sourceId: f.sourceId,
        recordedTick: t,
        availableAt: t,
        coverage: f.coverage,
      });
      const ref = deliver(s, f, check.id, t);
      s.acquisitions.push({
        id: check.id,
        queryId: "directory_callback",
        targetId: check.targetId,
        cutoffTick: t,
        deliveredTick: t,
        refs: [ref],
      });
      history(s, check.id, "Verified business check delivered", f.text, [ref]);
    }
    s.view.pendingChecks = s.view.pendingChecks.filter((c) => c.dueTick > t);
    // 7. Public urgency is updated only by delivered observations in deliver().
  }
}
function refsValid(s: State, refs: Ref[]) {
  const keys = refs.map(keyOf);
  return (
    new Set(keys).size === keys.length &&
    keys.every((k) => Object.hasOwn(s.facts, k))
  );
}
function findingValid(s: State, f: Finding) {
  const p = pack(s);
  return (
    refsValid(s, f.evidence) &&
    refsValid(s, f.alternativeEvidence) &&
    f.links.every(
      (l) =>
        refsValid(s, [l.ref]) &&
        p.mechanic.claims.some((c) => c.id === l.claimId),
    ) &&
    new Set(f.links.map((l) => `${keyOf(l.ref)}/${l.claimId}`)).size ===
      f.links.length &&
    f.limitations.every((id) => p.limits.some((l) => l.id === id)) &&
    new Set(f.limitations).size === f.limitations.length &&
    (f.targetId === "unselected" || s.view.entityIds.includes(f.targetId)) &&
    (!f.mechanicChoice ||
      p.mechanic.options.some((o) => o.id === f.mechanicChoice)) &&
    f.priorities.every((id) => s.view.entityIds.includes(id)) &&
    new Set(f.priorities).size === f.priorities.length &&
    f.followups.every((x) => s.view.entityIds.includes(x.targetId)) &&
    new Set(f.followups.map((x) => x.targetId)).size === f.followups.length
  );
}
function cited(s: State, refs: Ref[]) {
  return new Set(refs.map((r) => s.facts[keyOf(r)]).filter(Boolean));
}
function hasSet(s: State, refs: Ref[], disposition: Disposition) {
  const facts = cited(s, refs);
  return pack(s).sufficient[disposition].some((set) =>
    set.every((id) => facts.has(id)),
  );
}
export function assess(s: State, f: Finding): Quality {
  const p = pack(s),
    facts = cited(s, f.evidence),
    alternative = cited(s, f.alternativeEvidence),
    all = [
      ...f.evidence,
      ...f.alternativeEvidence,
      ...f.links.map((l) => l.ref),
    ],
    allFacts = cited(s, all);
  const reasons: Quality["reasons"] = [];
  const add = (
    id: string,
    condition: boolean,
    possible: number,
    text: string,
    refs: Ref[] = f.evidence,
  ) => {
    const points = condition ? possible : 0;
    reasons.push({ id, points, possible, text, refs: clone(refs) });
    return points;
  };
  const claimBounded = !p.mechanic.unsupportedChoices.includes(
    f.mechanicChoice,
  );
  const supported = hasSet(s, f.evidence, f.disposition) && claimBounded;
  const scoped =
    f.targetId === p.primaryTarget && f.scopeAcknowledged && claimBounded;
  const limit = f.limitations.some((id) =>
    p.limits.find((l) => l.id === id)!.requires.some((id) => allFacts.has(id)),
  );
  const evidence =
    add(
      "evidence.context",
      facts.has("opening") && facts.has("baseline"),
      25,
      "Cite the starting observations and task/business baseline.",
    ) +
    add(
      "evidence.business",
      [...facts].some(
        (id) => id.startsWith("context_") || id.startsWith("verified_"),
      ),
      25,
      "Cite a delivered work record or verified check, including an actual gap or timeout.",
    ) +
    add(
      "evidence.technical",
      [...facts].some(
        (id) => id.startsWith("activity_") || id.startsWith("independent_"),
      ),
      25,
      "Cite a scoped activity source, its independent transaction or its delivered collection limitation.",
    ) +
    add(
      "evidence.sufficiency",
      supported,
      25,
      claimBounded
        ? "A complete authored sufficient set supports the selected scoped disposition; card count alone does not."
        : `Your selected boundary, “${p.mechanic.options.find((o) => o.id === f.mechanicChoice)?.label}”, makes a stronger person, authority, causal or coverage claim than these cited sources establish. Keep the finding within its actual evidence boundary.`,
    );
  const alternativeOK =
    f.alternative !== "untested" &&
    [...alternative].some(
      (id) => id.startsWith("context_") || id.startsWith("verified_"),
    ) &&
    (f.alternative === "business_context_tested" ||
      f.alternative === "attribution_unresolved" ||
      ((f.disposition === "visibility" || f.disposition === "provisional") &&
        f.alternative === "coverage_tested"));
  const mechanic =
    f.mechanicChoice === p.mechanic.supportedChoice &&
    p.mechanic.requires.every((id) => facts.has(id));
  const linksOK =
    p.mechanic.kind !== "causal" ||
    f.disposition === "provisional" ||
    (f.links.some(
      (l) =>
        l.claimId === p.mechanic.claims[0].id &&
        ["supports", "sets_scope"].includes(l.role) &&
        s.facts[keyOf(l.ref)] === "baseline",
    ) &&
      f.links.some(
        (l) =>
          l.claimId === p.mechanic.claims[1].id &&
          (s.facts[keyOf(l.ref)].endsWith("gap")
            ? ["limits_confidence", "sets_scope"].includes(l.role)
            : l.role === "supports") &&
          [
            "activity_B",
            "activity_M",
            "activity_gap",
            "independent_B",
            "independent_M",
            "independent_gap",
          ].includes(s.facts[keyOf(l.ref)]),
      ));
  const prioritiesOK =
    !["triage", "capstone"].includes(p.mechanic.kind) ||
    p.mechanic.priorities.every((id, i) => f.priorities[i] === id);
  const reasoning =
    add(
      "reasoning.basis",
      supported && mechanic && linksOK && prioritiesOK,
      50,
      "State an evidence-supported explanation, apply the disclosed investigation boundary, and retain separate claims or priorities where this case requires them.",
    ) +
    add(
      "reasoning.alternative",
      alternativeOK,
      30,
      "Test a competing business or coverage explanation with compatible delivered evidence.",
      f.alternativeEvidence,
    ) +
    add(
      "reasoning.limit",
      limit,
      20,
      "Tie at least one relevant limit to a delivered observation.",
      all,
    );
  const next =
    f.disposition === "explained"
      ? f.handoff === "close_explained"
      : f.disposition === "misuse"
        ? f.handoff === "restrict_access"
        : f.disposition === "visibility"
          ? f.handoff === "repair_collection" || f.handoff === "review_monitor"
          : f.handoff === "review_monitor";
  const timely =
    s.view.responseWindowOpenedAt === null ||
    s.view.tick <= s.view.responseWindowOpenedAt + p.response.windowTicks ||
    s.view.responses.some(
      (r) =>
        r.requestedTick <=
        s.view.responseWindowOpenedAt! + p.response.windowTicks,
    );
  const decision =
    add(
      "decision.proportionality",
      supported && next,
      40,
      "Use a next action proportionate to the supported finding, with no account-wide or host-wide inference.",
    ) +
    add(
      "decision.scope",
      scoped,
      30,
      "Name the acquired session scope and acknowledge the declared responder authority.",
    ) +
    add(
      "decision.window",
      timely,
      30,
      "Respond within the disclosed window after relevant evidence was delivered; there is no hidden-stage timing bonus.",
    );
  const confidence =
    supported &&
    (f.disposition === "visibility" || f.disposition === "provisional"
      ? f.confidence === "low"
      : f.disposition === "explained"
        ? ["medium", "high"].includes(f.confidence)
        : f.confidence === "medium");
  const followup =
    f.disposition === "explained"
      ? f.owner === "none" && f.followup === "routine_monitoring"
      : f.owner === p.response.owner &&
        f.followup !== "unselected" &&
        f.followup !== "routine_monitoring" &&
        f.reviewWithinTicks <= 4;
  const capstone =
    p.mechanic.kind !== "capstone" ||
    f.followups.some(
      (x) =>
        x.targetId === p.mechanic.priorities[1] &&
        x.owner === "Detection Engineering" &&
        x.trigger === "restore_and_retest",
    );
  const report =
    add(
      "report.confidence",
      confidence,
      40,
      "Keep confidence compatible with the source limits; session evidence does not identify a person or motive.",
    ) +
    add(
      "report.boundary",
      scoped && facts.has("opening") && limit,
      30,
      "State the named scope and a relevant observation-linked uncertainty.",
    ) +
    add(
      "report.followup",
      supported && next && followup && capstone,
      30,
      "Assign an owner, bounded review and concrete follow-up; keep the capstone coverage repair separate when applicable.",
    );
  return {
    rubricVersion: "expansion-1.0.0",
    supported,
    evidence,
    reasoning,
    decision,
    report,
    total: Math.floor(
      (30 * evidence + 25 * reasoning + 30 * decision + 15 * report + 50) / 100,
    ),
    reasons,
  };
}
function rejected(s: State, id: string, error: string) {
  return {
    state: s,
    receipt: {
      commandId: id,
      status: "rejected",
      replayed: false,
      resultingRevision: s.view.revision,
      resultingTick: s.view.tick,
      durability: "not_applicable",
      error,
    } satisfies Receipt,
  };
}
export function processCommand(
  input: State,
  value: unknown,
): { state: State; receipt: Receipt } {
  return transition(input, value, false);
}
function transition(
  input: State,
  value: unknown,
  owned: boolean,
): { state: State; receipt: Receipt } {
  const id =
    typeof value === "object" &&
    value !== null &&
    "commandId" in value &&
    typeof value.commandId === "string"
      ? value.commandId
      : "invalid";
  const fingerprint = canonical(value);
  if (Object.hasOwn(input.receipts, id)) {
    const prior = input.receipts[id];
    return prior.fingerprint === fingerprint
      ? { state: input, receipt: { ...clone(prior.receipt), replayed: true } }
      : rejected(input, id, "ID_CONFLICT");
  }
  const parsed = commandSchema.safeParse(value);
  if (!parsed.success) return rejected(input, id, "INVALID_PAYLOAD");
  const cmd = parsed.data,
    p = pack(input),
    v = input.view;
  if (cmd.runId !== v.runId) return rejected(input, id, "INVALID_RUN");
  if (cmd.expectedRevision !== v.revision)
    return rejected(input, id, "STALE_REVISION");
  if (v.phase !== "investigating") return rejected(input, id, "CLOSED");
  if (input.commands.length >= 20000)
    return rejected(input, id, "COMMAND_LIMIT");
  const q =
    cmd.kind === "ACQUIRE"
      ? p.queries.find((q) => q.id === cmd.queryId)
      : undefined;
  if (
    cmd.kind === "ACQUIRE" &&
    (!q ||
      cmd.cutoffTick > v.tick ||
      (!q.targets.includes("all") && !q.targets.includes(v.scope)))
  )
    return rejected(input, id, "INVALID_SCOPE_OR_CUTOFF");
  if (cmd.kind === "ACQUIRE" && q?.id === "window" && !v.sensor)
    return rejected(input, id, "NO_ENABLED_WINDOW");
  if (cmd.kind === "SCOPE" && !v.entityIds.includes(cmd.targetId))
    return rejected(input, id, "UNKNOWN_SCOPE");
  if (
    cmd.kind === "REQUEST_CHECK" &&
    (cmd.targetId !== p.primaryTarget || !v.entityIds.includes(cmd.targetId))
  )
    return rejected(input, id, "INVALID_CHECK_TARGET");
  if (
    (cmd.kind === "EDIT_CASE" || cmd.kind === "CLOSE_CASE") &&
    !findingValid(input, cmd.finding)
  )
    return rejected(input, id, "INVALID_FINDING_REFERENCES");
  if (
    cmd.kind === "REQUEST_RESPONSE" &&
    (cmd.targetId !== p.response.targetId ||
      !v.entityIds.includes(cmd.targetId) ||
      !refsValid(input, cmd.evidence) ||
      !hasSet(input, cmd.evidence, "misuse"))
  )
    return rejected(input, id, "UNSUPPORTED_OR_UNAUTHORISED_RESPONSE");
  if (
    cmd.kind === "ENABLE_SENSOR" &&
    (!p.sensorEnabled ||
      cmd.targetId !== p.primaryTarget ||
      !v.entityIds.includes(cmd.targetId) ||
      (v.sensor && v.sensor.endsAt >= v.tick))
  )
    return rejected(input, id, "UNAUTHORISED_OR_CAPACITY");
  const s = owned ? input : clone(input),
    start = s.view.tick;
  if (cmd.kind === "SCOPE") {
    s.view.scope = cmd.targetId;
    history(
      s,
      id,
      "Investigation scope selected",
      `Reading and scope changes are free. Current scope: ${cmd.targetId}.`,
    );
  } else if (cmd.kind === "ACQUIRE" && q) {
    const target = q.targets.includes("all") ? "all" : s.view.scope,
      key = `${q.id}:${target}:${q.static ? "static" : cmd.cutoffTick}`;
    if (s.cache[key])
      history(
        s,
        id,
        "Acquired snapshot reopened",
        `The existing ${q.label.toLowerCase()} snapshot is unchanged; no new collection was requested.`,
      );
    else {
      // Capture eligible records BEFORE the one-step acquisition advances time.
      const captured = p.facts.filter(
        (f) =>
          q.id !== "window" &&
          q.factIds.includes(f.id) &&
          f.worlds.includes(s.world) &&
          factAvailable(s, f) <= cmd.cutoffTick &&
          (f.eventTick === null ||
            s.events.some((e) => e.id === f.originId && e.occurred)),
      );
      advance(s, 1);
      const refs = captured.map((f) => deliver(s, f, id, cmd.cutoffTick));
      if (q.id === "window")
        for (const test of s.generatedTests.filter(
          (t) =>
            t.targetId === target &&
            t.tick <= cmd.cutoffTick &&
            t.tick >= s.view.sensor!.startsAt &&
            t.tick <= s.view.sensor!.endsAt,
        )) {
          const template = p.facts.find((f) => f.id === "future_sample")!;
          refs.push(
            deliver(
              s,
              {
                ...template,
                recordId: `W01-${test.tick}`,
                eventTick: test.tick,
                availableAt: test.tick,
                originId: test.id,
                lineage: `future-verification-${test.tick}`,
              },
              id,
              cmd.cutoffTick,
            ),
          );
        }
      if (!refs.length) {
        const ref = { acquisitionId: id, recordId: `empty-${q.id}` };
        s.view.records.push({
          ref,
          title: "No matching records in this acquired snapshot",
          text: `The ${q.source.toLowerCase()} query contains no delivered matching observation through step ${cmd.cutoffTick}. This says nothing about a later snapshot or an operation outside this source’s capability.`,
          sourceId: q.sourceId,
          entityIds: [target === "all" ? p.initialScope : target],
          eventTick: null,
          cutoffTick: cmd.cutoffTick,
          deliveredTick: s.view.tick,
          coverage: "covered",
          lineage: `${q.sourceId}-empty`,
          caveats: [q.cannot],
        });
        s.facts[keyOf(ref)] = `empty:${q.id}`;
        refs.push(ref);
      }
      s.cache[key] = true;
      s.acquisitions.push({
        id,
        queryId: q.id,
        targetId: target,
        cutoffTick: cmd.cutoffTick,
        deliveredTick: s.view.tick,
        refs,
      });
      history(
        s,
        id,
        q.label,
        `Collected through step ${cmd.cutoffTick}; delivered at step ${s.view.tick}.`,
        refs,
      );
    }
  } else if (cmd.kind === "REQUEST_CHECK") {
    const pending = s.view.pendingChecks.find(
      (c) => c.targetId === cmd.targetId,
    );
    if (pending)
      history(
        s,
        id,
        "Existing verified check retained",
        `The same check is already due at step ${pending.dueTick}; no extra cost or delay.`,
      );
    else if (
      s.acquisitions.some(
        (a) =>
          a.queryId === "directory_callback" && a.targetId === cmd.targetId,
      )
    )
      history(
        s,
        id,
        "Delivered verified result reopened",
        "The prior verified business response is retained; no new contact is fabricated.",
      );
    else {
      s.view.pendingChecks.push({
        id,
        targetId: cmd.targetId,
        requestedTick: start,
        dueTick: start + 3,
      });
      advance(s, 1);
      history(
        s,
        id,
        "Verified business check requested",
        `Pre-established directory callback for ${cmd.targetId}; due at step ${start + 3}. It confirms task context, not human identity.`,
      );
    }
  } else if (cmd.kind === "ADVANCE") {
    advance(s, cmd.durationTicks);
    history(
      s,
      id,
      "World advanced deliberately",
      `${cmd.durationTicks} chosen step(s); reading never advances time.`,
    );
  } else if (cmd.kind === "EDIT_CASE") {
    s.view.finding = clone(cmd.finding);
    history(
      s,
      id,
      "Case File updated",
      "Evidence roles, scope, alternatives and notes were edited without advancing the world.",
    );
  } else if (cmd.kind === "REQUEST_RESPONSE") {
    if (s.view.responses.length)
      history(
        s,
        id,
        "Existing response request retained",
        "A response for this session is already requested; duplicate requests have no new effect.",
      );
    else {
      s.view.responses.push({
        id,
        targetId: cmd.targetId,
        requestedTick: start,
        dueTick: start + responseDelay(s),
        status: "pending",
        text: "An authorised responder is reviewing the named session evidence. No account-wide or host-wide action is requested.",
      });
      advance(s, 1);
      history(
        s,
        id,
        "Scoped response requested",
        `The responder’s declared completion is step ${start + responseDelay(s)}; investigation can continue.`,
        cmd.evidence,
      );
    }
  } else if (cmd.kind === "ENABLE_SENSOR") {
    advance(s, 2);
    s.view.sensor = {
      targetId: cmd.targetId,
      startsAt: s.view.tick,
      endsAt: s.view.tick + cmd.durationTicks,
    };
    s.events.push({
      id: `sensor:${id}`,
      tick: s.view.tick,
      phase: 6,
      priority: 0,
      kind: "sensor_activation",
      actor: "Authorised collection operator",
      targetId: cmd.targetId,
      text: `Future-only source verification begins now and ends at step ${s.view.sensor.endsAt}; no earlier action is collected.`,
      occurred: true,
    });
    history(
      s,
      id,
      "Future-only collection enabled",
      `Active from step ${s.view.tick} through ${s.view.sensor.endsAt}; a harmless verification event is generated on the next advanced step. No historical backfill.`,
    );
  } else if (cmd.kind === "CLOSE_CASE") {
    s.view.finding = clone(cmd.finding);
    const quality = assess(s, cmd.finding),
      records = clone(s.view.records),
      pendingChecks = clone(s.view.pendingChecks);
    history(
      s,
      id,
      "Finding submitted",
      "The decision-time observations and quality are frozen. Later source deliveries belong to the separately revealed continuation.",
      cmd.finding.evidence,
    );
    const frozenHistory = clone(s.view.history);
    s.view.phase = "closed";
    if (
      cmd.finding.handoff === "restrict_access" &&
      quality.supported &&
      cmd.finding.disposition === "misuse" &&
      cmd.finding.targetId === p.response.targetId &&
      !s.view.responses.length
    )
      s.view.responses.push({
        id: `handoff:${id}`,
        targetId: p.response.targetId,
        requestedTick: start,
        dueTick: start + responseDelay(s),
        status: "pending",
        text: "Session-only response handed to the authorised team.",
      });
    const horizon = Math.max(
      p.response.objectiveTick + (s.profile === "late-collection" ? 2 : 0),
      ...s.view.pendingChecks.map((c) => c.dueTick),
      ...s.view.responses.map((r) => r.dueTick),
    );
    advance(s, Math.max(0, horizon - s.view.tick));
    s.debrief = {
      finding: clone(cmd.finding),
      quality,
      closeTick: start,
      resolvedThrough: s.view.tick,
      records,
      history: frozenHistory,
      pendingChecks,
      objectiveOccurred: s.objectiveOccurred,
      controlEffective: s.controlEffective,
      world: s.world,
      events: clone(s.events),
      collection: clone(s.collection),
      acquisitions: clone(s.acquisitions),
      takeaways: [
        quality.supported
          ? "Your finding has a sufficient cited basis within this case’s declared source and scope limits."
          : "Identify the missing evidence question before treating a selected conclusion as established.",
        quality.reasoning === 100
          ? "You tested the competing explanation and recorded a source-linked limit."
          : "A competing explanation, a relevant limit and the case-specific boundary need explicit evidence.",
        "A later simulation outcome does not change what you could justify when you submitted.",
      ],
    };
  }
  s.view.revision++;
  s.commands.push(clone(cmd));
  const receipt: Receipt = {
    commandId: id,
    status: "accepted",
    replayed: false,
    resultingRevision: s.view.revision,
    resultingTick: s.view.tick,
    durability: "memory_only",
  };
  s.receipts[id] = { fingerprint, receipt };
  return { state: s, receipt: clone(receipt) };
}
export function acknowledge(input: State, revision: number | null) {
  const s = clone(input);
  s.persistence.committedRevision = revision;
  for (const entry of Object.values(s.receipts))
    entry.receipt.durability =
      revision !== null && entry.receipt.resultingRevision <= revision
        ? "committed"
        : "memory_only";
  return s;
}
export function stateHash(s: State) {
  const value = clone(s);
  value.persistence.committedRevision = null;
  for (const entry of Object.values(value.receipts))
    entry.receipt.durability = "memory_only";
  return checksum(value);
}
export function replay(initial: State, commands: Command[]) {
  let state = clone(initial);
  const ids = new Set(state.commands.map((c) => c.commandId));
  for (const c of commands) {
    if (ids.has(c.commandId)) throw Error("Duplicate canonical command");
    const result = transition(state, c, true);
    if (result.receipt.status !== "accepted" || result.receipt.replayed)
      throw Error(`Invalid command history: ${result.receipt.error}`);
    ids.add(c.commandId);
    state = result.state;
  }
  return state;
}
// Seeded selection is finite and versioned; records always derive from the chosen causal template.
export function createFreeHunt(seed: string, runId: string): State {
  if (!seed.trim() || seed.length > 80)
    throw Error("Use a seed of 1–80 characters");
  let x = Number.parseInt(checksum(seed), 16) >>> 0;
  const next = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return x >>> 0;
  };
  const ids = Object.keys(packages).sort() as MissionId[],
    mission = ids[next() % ids.length],
    world = packages[mission].worlds[next() % 4],
    profile = (["standard", "late-collection", "slow-response"] as const)[
      next() % 3
    ];
  return createRun(mission, runId, world, profile, seed);
}
