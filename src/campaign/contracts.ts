import { z } from "zod";

export const missionIdSchema = z.enum(["M04", "M07"]);
export type MissionId = z.infer<typeof missionIdSchema>;
export const worldSchema = z.enum(["B", "M", "U-B", "U-M"]);
export type World = z.infer<typeof worldSchema>;
export const refSchema = z
  .object({
    acquisitionId: z.string().min(1).max(100),
    recordId: z.string().min(1).max(80),
  })
  .strict();
export type Ref = z.infer<typeof refSchema>;
export const keyOf = (ref: Ref) => `${ref.acquisitionId}/${ref.recordId}`;
export const findingSchema = z
  .object({
    disposition: z.enum(["explained", "misuse", "visibility", "provisional"]),
    confidence: z.enum(["low", "medium", "high"]),
    evidence: z.array(refSchema).max(100),
    alternative: z.enum([
      "untested",
      "approved_work_tested",
      "coverage_configuration_tested",
      "attribution_unresolved",
    ]),
    alternativeEvidence: z.array(refSchema).max(100),
    limitations: z
      .array(
        z.enum([
          "anomaly_not_proof",
          "historical_gap",
          "test_not_history",
          "dependency",
          "attribution",
        ]),
      )
      .max(5),
    targetId: z.enum(["unselected", "LEGACY-01", "CS-PORTAL"]),
    missingFrom: z.literal(-3).nullable(),
    missingThrough: z.literal(0).nullable(),
    handoff: z.enum([
      "close_explained",
      "review_dependency",
      "restrict_session",
      "repair_collection",
      "isolate_host",
    ]),
    owner: z.enum(["Billing Operations", "Detection Engineering", "none"]),
    reviewWithinTicks: z.number().int().min(1).max(4),
    followup: z.enum([
      "unselected",
      "confirm_session_restriction",
      "verify_dependency_and_scope",
      "repeat_application_verification",
      "routine_monitoring",
    ]),
    scopeAcknowledged: z.boolean(),
    notes: z.string().max(4000),
  })
  .strict();
export type Finding = z.infer<typeof findingSchema>;
const envelope = {
  commandId: z
    .string()
    .min(1)
    .max(100)
    .refine(
      (id) => !["__proto__", "constructor", "prototype"].includes(id),
      "Reserved command ID",
    ),
  runId: z.string().min(1).max(100),
  expectedRevision: z.number().int().min(0).max(19999),
};
export const commandSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...envelope,
      kind: z.literal("SCOPE"),
      targetId: z.enum(["all", "APP-01", "LEGACY-01", "CS-API", "CS-PORTAL"]),
    })
    .strict(),
  z
    .object({
      ...envelope,
      kind: z.literal("ACQUIRE"),
      queryId: z.string().min(1).max(50),
      cutoffTick: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      ...envelope,
      kind: z.literal("VERIFY"),
      targetId: z.enum(["CS-API", "CS-PORTAL"]),
      capability: z.literal("privileged_application_action"),
    })
    .strict(),
  z
    .object({
      ...envelope,
      kind: z.literal("ENABLE_SENSOR"),
      targetId: z.enum(["LEGACY-01", "CS-PORTAL"]),
      sourceId: z.enum(["task_process", "cs_app"]),
      observationTicks: z.number().int().min(2).max(4),
    })
    .strict(),
  z
    .object({
      ...envelope,
      kind: z.literal("ADVANCE"),
      durationTicks: z.number().int().min(1).max(4),
    })
    .strict(),
  z
    .object({
      ...envelope,
      kind: z.literal("EDIT_CASE"),
      finding: findingSchema,
    })
    .strict(),
  z
    .object({
      ...envelope,
      kind: z.literal("CLOSE_CASE"),
      finding: findingSchema,
    })
    .strict(),
]);
export type Command = z.infer<typeof commandSchema>;
export type Action = Command extends infer C
  ? C extends Command
    ? Omit<C, keyof typeof envelope>
    : never
  : never;
export type PublicRecord = {
  ref: Ref;
  title: string;
  text: string;
  sourceId: string;
  lineage: string;
  eventTick: number | null;
  cutoffTick: number;
  deliveredTick: number;
  coverage: "covered" | "partial" | "unavailable";
  targetId: string;
  relationship?: { account: string; host: string };
};
export type Check = {
  id: string;
  targetId: "CS-API" | "CS-PORTAL";
  requestedTick: number;
  dueTick: number;
};
export type Window = {
  id: string;
  targetId: "LEGACY-01" | "CS-PORTAL";
  sourceId: "task_process" | "cs_app";
  startsAt: number;
  endsAt: number;
};
export type View = {
  missionId: MissionId;
  runId: string;
  revision: number;
  tick: number;
  phase: "investigating" | "closed";
  scope: string;
  records: PublicRecord[];
  pending: Check[];
  windows: Window[];
  finding: Finding;
  history: { tick: number; text: string }[];
  acquisitions: Acquisition[];
};
export type Event = {
  id: string;
  tick: number;
  phase: number;
  actor: string;
  description: string;
  applied: boolean;
};
export type Acquisition = {
  id: string;
  queryId: string;
  targetId: string;
  cutoffTick: number;
  deliveredTick: number;
  refs: Ref[];
};
export type Collection = {
  id: string;
  sourceId: string;
  originId: string;
  eventTick: number;
  availableTick: number;
  capability: string;
};
export type Quality = {
  total: number;
  evidence: number;
  reasoning: number;
  decision: number;
  report: number;
  supported: boolean;
  reasons: { id: string; earned: boolean; text: string; refs: Ref[] }[];
};
export type Debrief = {
  finding: Finding;
  quality: Quality;
  closeTick: number;
  resolvedThrough: number;
  records: PublicRecord[];
  history: View["history"];
  pending: Check[];
  response: string;
  objectiveOccurred: boolean;
  businessPreserved: boolean;
  truth: string;
  events: Event[];
  collection: Collection[];
  acquisitions: Acquisition[];
};
export type Receipt = {
  status: "accepted" | "rejected";
  commandId: string;
  revision: number;
  tick: number;
  durability: "memory_only" | "committed" | "not_applicable";
  replayed: boolean;
  error?: string;
};
