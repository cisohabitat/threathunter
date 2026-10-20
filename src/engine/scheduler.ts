import fixture from "../content/m01.json";
import type { World, EvidenceRef } from "../domain/contracts";
export type Phase = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Actor =
  "business" | "adversary" | "response" | "sensor" | "investigator";
export type Effect =
  | "revoke_session"
  | "start_task"
  | "validate_task"
  | "complete_task"
  | "prepare_report"
  | "complete_objective"
  | "record_scope"
  | "record_owner_result"
  | "accept_review";
export type ScheduledEvent = {
  id: string;
  tick: number;
  phase: Phase;
  priority: number;
  actor: Actor;
  scope: "S-01";
  description: string;
  requires: {
    activeSession?: boolean;
    preparedReport?: boolean;
    events?: string[];
  };
  effects: Effect[];
};
export type WorldEvent = ScheduledEvent & {
  status: "applied" | "blocked";
  reason: string | null;
};
export type CollectionRecord = {
  id: string;
  originEventId: string;
  sourceId: string;
  eventTick: number;
  collectedTick: number;
  availableTick: number;
  capability: string;
  fact: string;
};
export type Acquisition = {
  id: string;
  queryId: string;
  sourceId: string;
  subjectIds: ["U-01", "S-01"];
  cutoffTick: number;
  deliveredTick: number;
  recordRefs: EvidenceRef[];
  collectionRecordIds: string[];
  coverage: "covered" | "unavailable";
};
export type Simulation = {
  tick: number;
  sessionActive: boolean;
  financeTaskStarted: boolean;
  financeTaskValidated: boolean;
  financeTaskCompleted: boolean;
  reportPrepared: boolean;
  objectiveAchieved: boolean;
  pending: ScheduledEvent[];
  ledger: WorldEvent[];
  collection: CollectionRecord[];
  acquisitions: Acquisition[];
};
export const phases: readonly Phase[] = [1, 2, 3, 4, 5, 6, 7];
export function schedule(simulation: Simulation, event: ScheduledEvent) {
  if (
    !Number.isInteger(event.tick) ||
    event.tick <= simulation.tick ||
    event.scope !== "S-01" ||
    simulation.pending.some((e) => e.id === event.id) ||
    simulation.ledger.some((e) => e.id === event.id)
  )
    throw Error("Invalid or duplicate scheduled event.");
  simulation.pending.push(structuredClone(event));
}
export function createSimulation(world: World): Simulation {
  const simulation: Simulation = {
    tick: 0,
    sessionActive: true,
    financeTaskStarted: false,
    financeTaskValidated: false,
    financeTaskCompleted: false,
    reportPrepared: false,
    objectiveAchieved: false,
    pending: [],
    ledger: [],
    collection: [],
    acquisitions: [],
  };
  // Authored historical catalogues exist at run creation. Loading context is
  // distinct from observing it: only an acquisition projects these records.
  for (const [queryId, fact, capability] of [
    ["Q-H", fixture.commonFacts["Q-H"], "historical_sign_in_baseline"],
    ["Q-D", fixture.worlds[world].facts["Q-D"], "device_mapping"],
    ["Q-C", fixture.worlds[world].facts["Q-C"], "work_approval"],
    ["opening", "anomalous_session", "session_opening"],
  ]) {
    const originEventId = `catalogue.${queryId}`;
    const source =
      fixture.recordByFact[fact as keyof typeof fixture.recordByFact].source;
    simulation.ledger.push({
      id: originEventId,
      tick: 0,
      phase: 5,
      priority: 0,
      actor: "sensor",
      scope: "S-01",
      description:
        "Authored source catalogue loaded; acquisition is still required.",
      requires: {},
      effects: [],
      status: "applied",
      reason: null,
    });
    simulation.collection.push({
      id: `collection.${queryId}`,
      originEventId,
      sourceId: source,
      eventTick: 0,
      collectedTick: 0,
      availableTick: 0,
      capability,
      fact,
    });
  }
  const misuse = fixture.worlds[world].worldClass === "misuse";
  const actor = misuse ? "adversary" : "business";
  const activity = misuse ? "adversary.scope" : "business.finance";
  const add = (
    id: string,
    tick: number,
    phase: Phase,
    actor: Actor,
    description: string,
    requires: ScheduledEvent["requires"],
    effects: Effect[],
  ) =>
    schedule(simulation, {
      id,
      tick,
      phase,
      priority: 0,
      actor,
      scope: "S-01",
      description,
      requires,
      effects,
    });
  add(
    activity,
    2,
    misuse ? 3 : 2,
    actor,
    misuse
      ? "Session attempts access outside its ordinary finance workflow."
      : "Account holder performs the approved finance task.",
    { activeSession: true },
    [],
  );
  add(
    "asset.finance-activity",
    2,
    4,
    actor,
    "Finance activity changes the report-service state.",
    { events: [activity] },
    misuse ? [] : ["start_task"],
  );
  if (fixture.worlds[world].visibility === "complete")
    add(
      "sensor.scope",
      2,
      5,
      "sensor",
      "Application audit records the session access scope.",
      { events: [activity] },
      ["record_scope"],
    );
  if (!misuse) {
    add(
      "business.validate",
      5,
      2,
      "business",
      "Account holder validates the approved finance task.",
      { activeSession: true, events: ["business.finance"] },
      [],
    );
    add(
      "asset.validated-task",
      5,
      4,
      "business",
      "Finance task validation completes.",
      { events: ["business.validate"] },
      ["validate_task"],
    );
    add(
      "business.complete",
      8,
      2,
      "business",
      "Account holder completes the approved finance task.",
      { activeSession: true, events: ["asset.validated-task"] },
      [],
    );
    add(
      "asset.completed-task",
      8,
      4,
      "business",
      "Approved finance work is complete.",
      { events: ["business.complete"] },
      ["complete_task"],
    );
  }
  if (misuse) {
    add(
      "adversary.prepare",
      5,
      3,
      "adversary",
      "Session prepares the sensitive report.",
      { activeSession: true, events: [activity] },
      [],
    );
    add(
      "asset.prepared-report",
      5,
      4,
      "adversary",
      "Report preparation completes.",
      { events: ["adversary.prepare"] },
      ["prepare_report"],
    );
    add(
      "adversary.objective",
      8,
      3,
      "adversary",
      "Session attempts the authored data objective.",
      { activeSession: true, preparedReport: true },
      [],
    );
    add(
      "asset.objective",
      8,
      4,
      "adversary",
      "The authored data objective completes.",
      { events: ["adversary.objective"] },
      ["complete_objective"],
    );
  }
  return simulation;
}
export function resolveTick(
  simulation: Simulation,
  world: World,
  callbacks: {
    phase?: (phase: Phase) => void;
    complete?: () => void;
    project?: () => void;
  } = {},
) {
  simulation.tick++;
  for (const phase of phases) {
    callbacks.phase?.(phase);
    const due = simulation.pending
      .filter((e) => e.tick === simulation.tick && e.phase === phase)
      .sort(
        (a, b) =>
          a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );
    for (const event of due) {
      const reason =
        event.requires.activeSession && !simulation.sessionActive
          ? "Session access has been revoked."
          : event.requires.preparedReport && !simulation.reportPrepared
            ? "Required report preparation did not complete."
            : event.requires.events?.some(
                  (id) =>
                    !simulation.ledger.some(
                      (e) => e.id === id && e.status === "applied",
                    ),
                )
              ? "A required causal event did not apply."
              : null;
      if (!reason)
        for (const effect of event.effects) {
          if (effect === "revoke_session") simulation.sessionActive = false;
          if (effect === "start_task") simulation.financeTaskStarted = true;
          if (effect === "validate_task")
            simulation.financeTaskValidated = true;
          if (effect === "complete_task")
            simulation.financeTaskCompleted = true;
          if (effect === "prepare_report") simulation.reportPrepared = true;
          if (effect === "complete_objective")
            simulation.objectiveAchieved = true;
          if (effect === "record_owner_result")
            simulation.collection.push({
              id: "collection.directory_callback",
              originEventId: event.id,
              sourceId: "directory_callback",
              eventTick: simulation.tick,
              collectedTick: simulation.tick,
              availableTick: simulation.tick,
              capability: "verified_directory_result",
              fact: fixture.worlds[world].facts.VERIFY,
            });
          if (effect === "record_scope")
            simulation.collection.push({
              id: "collection.scope",
              originEventId: event.requires.events![0],
              sourceId: "application_audit",
              eventTick: 2,
              collectedTick: simulation.tick,
              availableTick: simulation.tick,
              capability: "session_access_scope",
              fact: fixture.worlds[world].facts["Q-F"],
            });
        }
      simulation.ledger.push({
        ...structuredClone(event),
        status: reason ? "blocked" : "applied",
        reason,
      });
    }
    simulation.pending = simulation.pending.filter(
      (e) => !(e.tick === simulation.tick && e.phase === phase),
    );
    if (phase === 6) callbacks.complete?.();
    if (phase === 7) callbacks.project?.();
  }
}
export function activityFact(
  simulation: Simulation,
  world: World,
  cutoff: number,
) {
  if (fixture.worlds[world].visibility !== "complete") return "scope_gap";
  return (
    simulation.collection.find(
      (r) =>
        r.capability === "session_access_scope" && r.availableTick <= cutoff,
    )?.fact ?? "scope_empty"
  );
}
export function recordAcquisition(
  simulation: Simulation,
  acquisition: Omit<Acquisition, "collectionRecordIds">,
) {
  simulation.acquisitions.push({
    ...structuredClone(acquisition),
    collectionRecordIds:
      acquisition.queryId === "Q-F"
        ? simulation.collection
            .filter(
              (r) =>
                r.capability === "session_access_scope" &&
                r.availableTick <= acquisition.cutoffTick,
            )
            .map((r) => r.id)
        : simulation.collection
            .filter((r) => r.id === `collection.${acquisition.queryId}`)
            .map((r) => r.id),
  });
}
export function continueAfterHandoff(
  simulation: Simulation,
  world: World,
  commandId: string,
  response: "revoke" | "review" | "unsupported" | "none",
  through: number,
) {
  const continued = structuredClone(simulation);
  if (response !== "none")
    schedule(continued, {
      id: `response.${commandId}`,
      tick: simulation.tick + fixture.responseDelay,
      phase: 1,
      priority: 0,
      actor: "response",
      scope: "S-01",
      description:
        response === "revoke"
          ? "Response team revokes the investigated session."
          : response === "review"
            ? "Response queue accepts review and monitoring ownership."
            : "Response team requires further evidence before revocation.",
      requires: {},
      effects: response === "revoke" ? ["revoke_session"] : ["accept_review"],
    });
  while (continued.tick < through) resolveTick(continued, world);
  return continued;
}
