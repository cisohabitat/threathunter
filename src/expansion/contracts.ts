import { z } from "zod";
export const missionIdSchema = z.enum([
  "M02",
  "M03",
  "M05",
  "M06",
  "M08",
  "M09",
  "M10",
  "M11",
  "M12",
]);
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
export const keyOf = (r: Ref) => JSON.stringify([r.acquisitionId, r.recordId]);
export const dispositionSchema = z.enum([
  "explained",
  "misuse",
  "visibility",
  "provisional",
]);
export type Disposition = z.infer<typeof dispositionSchema>;
export const findingSchema = z
  .object({
    disposition: dispositionSchema,
    confidence: z.enum(["low", "medium", "high"]),
    evidence: z.array(refSchema).max(100),
    alternativeEvidence: z.array(refSchema).max(100),
    alternative: z.enum([
      "untested",
      "business_context_tested",
      "attribution_unresolved",
      "coverage_tested",
    ]),
    links: z
      .array(
        z
          .object({
            ref: refSchema,
            role: z.enum([
              "supports",
              "weakens",
              "sets_scope",
              "limits_confidence",
            ]),
            claimId: z.string().min(1).max(60),
          })
          .strict(),
      )
      .max(100),
    limitations: z.array(z.string().min(1).max(60)).max(10),
    targetId: z.string().min(1).max(60),
    mechanicChoice: z.string().max(60),
    priorities: z.array(z.string().min(1).max(60)).max(6),
    handoff: z.enum([
      "close_explained",
      "restrict_access",
      "review_monitor",
      "repair_collection",
    ]),
    owner: z.string().max(80),
    reviewWithinTicks: z.number().int().min(1).max(4),
    followup: z.enum([
      "unselected",
      "confirm_scope_and_control",
      "verify_business_context",
      "restore_and_retest",
      "review_new_evidence",
      "routine_monitoring",
    ]),
    followups: z
      .array(
        z
          .object({
            targetId: z.string().max(60),
            owner: z.string().max(80),
            trigger: z.enum([
              "restore_and_retest",
              "review_new_evidence",
              "routine_monitoring",
            ]),
            reviewWithinTicks: z.number().int().min(1).max(4),
          })
          .strict(),
      )
      .max(6),
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
      (s) => !["__proto__", "constructor", "prototype"].includes(s),
      "Reserved ID",
    ),
  runId: z.string().min(1).max(100),
  expectedRevision: z.number().int().min(0).max(20000),
};
const variants = [
  z
    .object({
      ...envelope,
      kind: z.literal("ACQUIRE"),
      queryId: z.string().min(1).max(60),
      cutoffTick: z.number().int().min(0).max(100000),
    })
    .strict(),
  z
    .object({
      ...envelope,
      kind: z.literal("SCOPE"),
      targetId: z.string().min(1).max(60),
    })
    .strict(),
  z
    .object({
      ...envelope,
      kind: z.literal("REQUEST_CHECK"),
      targetId: z.string().min(1).max(60),
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
      kind: z.literal("REQUEST_RESPONSE"),
      targetId: z.string().min(1).max(60),
      evidence: z.array(refSchema).max(100),
    })
    .strict(),
  z
    .object({
      ...envelope,
      kind: z.literal("ENABLE_SENSOR"),
      targetId: z.string().min(1).max(60),
      durationTicks: z.number().int().min(2).max(4),
    })
    .strict(),
  z
    .object({
      ...envelope,
      kind: z.literal("CLOSE_CASE"),
      finding: findingSchema,
    })
    .strict(),
] as const;
export const commandSchema = z.discriminatedUnion("kind", variants);
export type Command = z.infer<typeof commandSchema>;
export type Action = Command extends infer T
  ? T extends Command
    ? Omit<T, keyof typeof envelope>
    : never
  : never;
export type PublicRecord = {
  ref: Ref;
  title: string;
  text: string;
  sourceId: string;
  entityIds: string[];
  eventTick: number | null;
  cutoffTick: number;
  deliveredTick: number;
  coverage: "covered" | "partial" | "unavailable";
  lineage: string;
  caveats: string[];
};
export type History = {
  id: string;
  tick: number;
  title: string;
  text: string;
  refs: Ref[];
};
export type View = {
  runId: string;
  revision: number;
  tick: number;
  phase: "investigating" | "closed";
  missionId: MissionId;
  policy: { responseDelayTicks: number; collectionDelayTicks: number };
  scope: string;
  entityIds: string[];
  records: PublicRecord[];
  finding: Finding;
  history: History[];
  pendingChecks: {
    id: string;
    targetId: string;
    requestedTick: number;
    dueTick: number;
  }[];
  responses: {
    id: string;
    targetId: string;
    requestedTick: number;
    dueTick: number;
    status: "pending" | "effective";
    text: string;
  }[];
  sensor: { targetId: string; startsAt: number; endsAt: number } | null;
  responseWindowOpenedAt: number | null;
};
export type Receipt = {
  commandId: string;
  status: "accepted" | "rejected";
  replayed: boolean;
  resultingRevision: number;
  resultingTick: number;
  durability: "memory_only" | "committed" | "not_applicable";
  error?: string;
};
export type Quality = {
  rubricVersion: "expansion-1.0.0";
  supported: boolean;
  evidence: number;
  reasoning: number;
  decision: number;
  report: number;
  total: number;
  reasons: {
    id: string;
    points: number;
    possible: number;
    text: string;
    refs: Ref[];
  }[];
};
export type Event = {
  id: string;
  tick: number;
  phase: number;
  priority: number;
  kind: string;
  actor: string;
  targetId: string;
  text: string;
  occurred: boolean;
};
export type Collection = {
  id: string;
  originId: string;
  sourceId: string;
  recordedTick: number;
  availableAt: number;
  coverage: string;
};
export type Acquisition = {
  id: string;
  queryId: string;
  targetId: string;
  cutoffTick: number;
  deliveredTick: number;
  refs: Ref[];
};
export type Debrief = {
  finding: Finding;
  quality: Quality;
  closeTick: number;
  resolvedThrough: number;
  records: PublicRecord[];
  history: History[];
  pendingChecks: View["pendingChecks"];
  objectiveOccurred: boolean;
  controlEffective: boolean;
  world: World;
  events: Event[];
  collection: Collection[];
  acquisitions: Acquisition[];
  takeaways: string[];
};
