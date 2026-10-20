import type { MissionId, View } from "./contracts";

export type Hint = {
  id: string;
  cue: "morgan-1" | "morgan-2" | "morgan-3" | "morgan-4" | "morgan-5";
  question: string;
  source: string;
  target: string;
  screen: "Investigate" | "Case File" | "Timeline";
  action: string;
  cost: string;
};

// Only delivered knowledge and public tool state enter this selector. Never
// import engine state, private package facts, sufficient sets or the rubric here.
export function selectHint(view: View): Hint {
  const has = (source: string) =>
    view.records.some((r) => r.sourceId === source);
  const query = (id: string) => view.acquisitions.some((a) => a.queryId === id);
  if (view.missionId === "M04") {
    if (!view.records.some((r) => r.relationship?.host === "LEGACY-01"))
      return {
        id: "m04-relationships",
        cue: "morgan-1",
        question:
          "Which recorded connections fit the account’s documented purpose?",
        source:
          "The authentication comparison can show account-to-host relationships. It cannot establish intent.",
        target: "account_hosts",
        screen: "Investigate",
        action: "Show the account comparison",
        cost: "Acquiring a new snapshot costs 1 step",
      };
    if (view.scope !== "LEGACY-01")
      return {
        id: "m04-scope",
        cue: "morgan-1",
        question:
          "Which discovered relationship would you like to investigate?",
        source:
          "The account-to-host comparison has delivered LEGACY-01. Selecting a scope only changes the question’s target.",
        target: "scope",
        screen: "Investigate",
        action: "Show the scope selector",
        cost: "Selecting a scope is free",
      };
    if (!has("ownership"))
      return {
        id: "m04-dependency",
        cue: "morgan-5",
        question: "What business work might be interrupted by a response?",
        source:
          "The ownership and dependency check explains the host’s business purpose and the response boundary.",
        target: "dependency",
        screen: "Investigate",
        action: "Show the dependency check",
        cost: "Acquiring a new snapshot costs 1 step",
      };
    if (!query("change") || !query("session_origin")) {
      const approval = !query("change");
      return {
        id: approval ? "m04-approval" : "m04-origin",
        cue: "morgan-2",
        question: "Could approved work explain this particular session?",
        source: approval
          ? "The change register can check whether account, host, operator, time and task match. An approval is bounded to that work."
          : "Session origin comes from a separate management-gateway path. Compare it with the approval rather than treating two cards as automatic corroboration.",
        target: approval ? "change" : "session_origin",
        screen: "Investigate",
        action: approval
          ? "Show the approval enquiry"
          : "Show the origin enquiry",
        cost: "Acquiring a new snapshot costs 1 step",
      };
    }
    if (!query("task") && !query("application"))
      return {
        id: "m04-activity",
        cue: "morgan-4",
        question: "Which activity source could test the explanation’s scope?",
        source:
          "Task records describe recorded process creation. Billing application records provide a different view of access. An empty snapshot covers only its stated cutoff.",
        target: "task",
        screen: "Investigate",
        action: "Show the task enquiry",
        cost: "A new snapshot costs 1 step; other routes remain available",
      };
  } else {
    if (!query("coverage") || !query("health")) {
      const declared = !query("coverage");
      return {
        id: declared ? "m07-declared" : "m07-delivered",
        cue: "morgan-1",
        question:
          "Does actual delivery support what the collection map promises?",
        source: declared
          ? "Declared coverage describes the promised systems, capability and interval. Compare that promise with actual deliveries."
          : "The delivery ledger shows which heartbeats arrived. Missing delivery alone cannot establish what happened in that interval.",
        target: declared ? "coverage" : "health",
        screen: "Investigate",
        action: declared
          ? "Show declared coverage"
          : "Show delivered heartbeats",
        cost: "Acquiring a new snapshot costs 1 step",
      };
    }
    if (!query("configuration") || !query("authentication")) {
      const routing = !query("configuration");
      return {
        id: routing ? "m07-routing" : "m07-independent",
        cue: "morgan-2",
        question:
          "What could explain a delivery gap, and what can another source establish?",
        source: routing
          ? "Collector routing can explain a pipeline defect. It cannot attribute activity while the pipeline was blind."
          : "The independent identity source records authentication. Its capability differs from privileged application collection.",
        target: routing ? "configuration" : "authentication",
        screen: "Investigate",
        action: routing
          ? "Show the routing enquiry"
          : "Show the independent source",
        cost: "Acquiring a new snapshot costs 1 step",
      };
    }
    if (view.scope !== "CS-PORTAL")
      return {
        id: "m07-scope",
        cue: "morgan-4",
        question: "Which system’s collection capability are you testing?",
        source:
          "A test on CS-API cannot establish CS-PORTAL coverage. Select the system explicitly; this does not run a test.",
        target: "scope",
        screen: "Investigate",
        action: "Show the scope selector",
        cost: "Selecting a scope is free",
      };
    if (!view.windows.length)
      return {
        id: "m07-window",
        cue: "morgan-4",
        question: "What could a controlled event prove about collection now?",
        source:
          "A future-only window starts after activation. You may request the controlled event before or after activation; compare its due step with the chosen window. Neither action restores history.",
        target: "collection",
        screen: "Investigate",
        action: "Show future collection and verification",
        cost: "Activation costs 2 steps; verification costs 1 and is due at request +3",
      };
    if (view.pending.length)
      return {
        id: "m07-pending",
        cue: "morgan-4",
        question: "When will your requested verification be delivered?",
        source:
          "The timeline shows the requested target and due step. You can investigate while waiting; reading does not move time.",
        target: "pending",
        screen: "Timeline",
        action: "Show pending verification",
        cost: "Reading is free; deliberate advance costs the selected 1–4 steps",
      };
    if (!view.records.some((r) => r.ref.recordId.startsWith("R-test_")))
      return {
        id: "m07-test",
        cue: "morgan-4",
        question: "Which event would test this window’s stated capability?",
        source:
          "Controlled verification generates one harmless event on the selected system at request +3. Check whether that time is inside the recorded window; an expired window cannot be extended in this run.",
        target: "collection",
        screen: "Investigate",
        action: "Show controlled verification",
        cost: "A new check costs 1 step; reopening a pending check is free",
      };
  }
  return {
    id: `${view.missionId.toLowerCase()}-finding`,
    cue: "morgan-3",
    question:
      "What do your delivered observations support, and what remains unknown?",
    source:
      "In the Case File, cite supporting observations, test an alternative and record limits. Choose a scoped next step and owner. You may keep investigating or submit an incomplete finding for feedback.",
    target: "finding",
    screen: "Case File",
    action: "Show the Case File",
    cost: "Editing and reviewing are free; only explicit confirmation closes the case",
  };
}

export const vocabulary: Record<
  MissionId,
  readonly (readonly [string, string])[]
> = {
  M04: [
    [
      "Service account",
      "An account used by an application or scheduled job. Interactive use deserves context; it is not automatically misuse.",
    ],
    [
      "Interactive session",
      "A connection used to perform work directly, rather than only running a scheduled batch.",
    ],
    [
      "Task origin · provenance",
      "Records of where a task came from and how it was created. A later execution is a different event.",
    ],
    [
      "Business dependency",
      "Work that relies on a system. A host missing from inventory can still be essential.",
    ],
    [
      "Scoped response",
      "A recommendation limited to a supported account/session. The response team owns any disruptive control.",
    ],
  ],
  M07: [
    [
      "Activity collection · telemetry",
      "Records delivered by a particular source about a stated capability and interval.",
    ],
    [
      "Heartbeat",
      "A periodic delivery signal. Its presence does not prove every application action was recorded.",
    ],
    [
      "Collector routing",
      "The destination used by a collection pipeline. An incorrect destination may explain missing deliveries.",
    ],
    [
      "Controlled verification",
      "A harmless test event with a known target, capability and time. A successful test now cannot prove historical coverage.",
    ],
    [
      "Future observation window",
      "A bounded interval starting after activation. It cannot recover earlier missing records.",
    ],
  ],
};
