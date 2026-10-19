import fixture from "../content/m01.json";
import {
  commandSchema,
  emptyDraft,
  refKey,
  type Command,
  type World,
  type PlayerView,
  type Receipt,
  type Debrief,
  type PublicRecord,
} from "../domain/contracts";
import { assess } from "../evaluation/score";
export type EngineState = {
  schemaVersion: 1;
  ruleset: "4.0.0";
  world: World;
  // Storage acknowledgement only; excluded from gameplay hashes and projections.
  persistence: { committedRevision: number | null };
  view: PlayerView;
  facts: Record<string, string>;
  cache: Record<string, boolean>;
  checkCompleted: boolean;
  receipts: Record<string, { fingerprint: string; receipt: Receipt }>;
  commands: Command[];
  debrief: Debrief | null;
};
export const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ":" +
            canonical((value as Record<string, unknown>)[k]),
        )
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
};
function deliver(
  state: EngineState,
  fact: string,
  acquisitionId: string,
  cutoff: number,
) {
  const rule = (
    fixture.recordByFact as Record<
      string,
      { id: string; source: string; text: string; lineageGroup: string }
    >
  )[fact];
  const record: PublicRecord = {
    ref: { acquisitionId, recordId: rule.id },
    sourceId: rule.source,
    subjectIds: ["U-01", "S-01"],
    eventTick:
      fact === "scope_expected" || fact === "scope_unexpected" ? 2 : null,
    eventTimeLabel:
      fact === "anomalous_session"
        ? "02:13 · session began"
        : "Authored case record",
    snapshotCutoff: cutoff,
    deliveredTick: state.view.tick,
    collection: fact.includes("gap") ? "unavailable" : "covered",
    observation: rule.text,
    caveats: [],
    lineageGroup: rule.lineageGroup,
  };
  state.view.records.push(record);
  state.facts[refKey(record.ref)] = fact;
  if (fact === "scope_unexpected" && state.view.responseWindowOpenedAt === null)
    state.view.responseWindowOpenedAt = state.view.tick;
}
export function createRun(runId: string, world: World): EngineState {
  const state: EngineState = {
    schemaVersion: 1,
    ruleset: "4.0.0",
    world,
    persistence: { committedRevision: null },
    view: {
      runId,
      revision: 0,
      tick: 0,
      phase: "investigating",
      records: [],
      pendingChecks: [],
      draft: emptyDraft(),
      responseWindowOpenedAt: null,
      history: [
        {
          tick: 0,
          text: "Lead received: an unfamiliar finance session at 02:13.",
        },
        {
          tick: 0,
          text: "Routine feed: identity service available; finance portal available.",
        },
      ],
    },
    facts: {},
    cache: {},
    checkCompleted: false,
    receipts: {},
    commands: [],
    debrief: null,
  };
  deliver(state, "anomalous_session", "opening", 0);
  return state;
}
export const project = (state: EngineState): PlayerView =>
  structuredClone(state.view);
function advance(state: EngineState, n: number) {
  for (let i = 0; i < n; i++) {
    state.view.tick++;
    const due = state.view.pendingChecks.filter(
      (c) => c.dueTick === state.view.tick,
    );
    for (const check of due) {
      deliver(
        state,
        fixture.worlds[state.world].facts.VERIFY,
        check.requestId,
        check.dueTick,
      );
      state.checkCompleted = true;
      state.view.history.push({
        tick: state.view.tick,
        text: "Verified-directory check delivered.",
      });
    }
    state.view.pendingChecks = state.view.pendingChecks.filter(
      (c) => c.dueTick > state.view.tick,
    );
  }
}
export function processCommand(
  current: EngineState,
  input: unknown,
): { state: EngineState; receipt: Receipt } {
  const fingerprint = canonical(input);
  const id =
    input &&
    typeof input === "object" &&
    "commandId" in input &&
    typeof input.commandId === "string"
      ? input.commandId
      : "";
  const prior = Object.hasOwn(current.receipts, id)
    ? current.receipts[id]
    : undefined;
  const reject = (errorCode: string) => ({
    state: current,
    receipt: {
      commandId: id,
      status: "rejected" as const,
      replayed: false,
      resultingRevision: current.view.revision,
      resultingTick: current.view.tick,
      durability: "not_applicable" as const,
      errorCode,
    },
  });
  if (prior)
    return prior.fingerprint === fingerprint
      ? { state: current, receipt: { ...prior.receipt, replayed: true } }
      : reject("ID_CONFLICT");
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) return reject("INVALID_PAYLOAD");
  const cmd = parsed.data;
  if (cmd.runId !== current.view.runId) return reject("INVALID_TARGET");
  if (cmd.expectedRevision !== current.view.revision)
    return reject("STALE_REVISION");
  if (current.view.phase === "closed") return reject("CLOSED");
  if (cmd.kind === "ACQUIRE" && cmd.cutoffTick > current.view.tick)
    return reject("INVALID_PAYLOAD");
  if (cmd.kind === "EDIT_CASE" || cmd.kind === "CLOSE_CASE") {
    const refs = [
      ...cmd.draft.evidence,
      ...cmd.draft.alternativeEvidence,
      ...cmd.draft.caveats.flatMap((c) => c.evidence),
    ];
    if (
      refs.some((r) => !Object.hasOwn(current.facts, refKey(r))) ||
      cmd.draft.coverageThroughTick > current.view.tick
    )
      return reject("INVALID_SCOPE");
  }
  const state = structuredClone(current),
    v = state.view,
    start = v.tick;
  if (cmd.kind === "ACQUIRE") {
    const query = fixture.queries[cmd.queryId],
      cutoff = cmd.cutoffTick;
    const cacheKey = query.static ? cmd.queryId : `${cmd.queryId}:${cutoff}`;
    if (!state.cache[cacheKey]) {
      const world = fixture.worlds[state.world];
      let fact =
        cmd.queryId === "Q-H"
          ? fixture.commonFacts["Q-H"]
          : world.facts[cmd.queryId];
      if (
        cmd.queryId === "Q-F" &&
        world.visibility === "complete" &&
        cutoff < 2
      )
        fact = "scope_empty";
      advance(state, 1);
      deliver(state, fact, cmd.commandId, cutoff);
      state.cache[cacheKey] = true;
      v.history.push({
        tick: v.tick,
        text: `${query.label} · collected through step ${cutoff}.`,
      });
    }
  } else if (cmd.kind === "REQUEST_CHECK") {
    if (!v.pendingChecks.length && !state.checkCompleted) {
      v.pendingChecks.push({
        requestId: cmd.commandId,
        subjectId: "U-01",
        requestedTick: start,
        dueTick: start + 3,
        kind: "directory_callback",
      });
      advance(state, 1);
      v.history.push({
        tick: v.tick,
        text: `Owner check requested through verified directory; due at step ${start + 3}.`,
      });
    }
  } else if (cmd.kind === "ADVANCE") {
    advance(state, cmd.durationTicks);
    v.history.push({
      tick: v.tick,
      text: `Advanced ${cmd.durationTicks} investigation step(s).`,
    });
  } else {
    v.draft = structuredClone(cmd.draft);
    if (cmd.kind === "CLOSE_CASE") {
      const quality = assess(
        v.records,
        state.facts,
        v.draft,
        start,
        v.responseWindowOpenedAt,
      );
      const likely = fixture.sufficientSets.likely_misuse.some((set) =>
        set.every((f) =>
          v.draft.evidence.some((r) => state.facts[refKey(r)] === f),
        ),
      );
      const sessionRevoked =
        v.draft.nextStep === "handoff_revoke_session" && likely;
      const misuse = fixture.worlds[state.world].worldClass === "misuse";
      state.debrief = {
        quality,
        truth: fixture.truthNarrative[state.world],
        closeTick: start,
        resolvedThrough: Math.max(8, start + 2),
        objectiveAchieved: misuse && (!sessionRevoked || start + 2 > 8),
        sessionRevoked,
        response: sessionRevoked
          ? `Response team revokes S-01 at step ${start + 2}.`
          : v.draft.nextStep === "handoff_revoke_session"
            ? "Needs further review: submitted evidence does not justify session revocation."
            : v.draft.nextStep === "handoff_review_monitor"
              ? `Response queue accepts review and monitoring ownership at step ${start + 2}; no immediate revocation is modelled.`
              : "Only this lead is closed; routine monitoring continues.",
        decisionRecords: structuredClone(v.records),
        finding: structuredClone(v.draft),
        decisionHistory: structuredClone(v.history),
        pendingChecks: structuredClone(v.pendingChecks),
      };
      v.phase = "closed";
      v.history.push({
        tick: start,
        text: "Finding frozen. After-handoff simulation resolved separately.",
      });
    }
  }
  v.revision++;
  state.commands.push(cmd);
  const receipt: Receipt = {
    commandId: cmd.commandId,
    status: "accepted",
    replayed: false,
    resultingRevision: v.revision,
    resultingTick: v.tick,
    durability: "memory_only",
  };
  state.receipts[id] = { fingerprint, receipt };
  return { state, receipt };
}
