import { z } from "zod";
export const queryIds = ["Q-H", "Q-D", "Q-C", "Q-F"] as const;
export const dispositionIds = [
  "explained",
  "likely_misuse",
  "unresolved",
] as const;
export type QueryId = (typeof queryIds)[number];
export type Disposition = (typeof dispositionIds)[number];
export type World = "B" | "M" | "U-B" | "U-M";
export const refSchema = z
  .object({ acquisitionId: z.string().max(100), recordId: z.string().max(20) })
  .strict();
export type EvidenceRef = z.infer<typeof refSchema>;
export const draftSchema = z
  .object({
    subjectId: z.literal("U-01"),
    sessionId: z.literal("S-01"),
    coverageThroughTick: z.number().int().nonnegative(),
    disposition: z.enum(dispositionIds),
    confidence: z.enum(["low", "medium", "high"]),
    evidence: z.array(refSchema).max(100),
    alternativeStatus: z.enum([
      "untested",
      "misuse_weakened",
      "approved_work_weakened",
      "approved_work_unresolved",
    ]),
    alternativeEvidence: z.array(refSchema).max(100),
    caveats: z
      .array(
        z
          .object({
            code: z.enum([
              "anomaly_not_proof",
              "registration_not_authorship",
              "approval_not_authorship",
              "collection_gap",
              "owner_unavailable",
              "needs_identity_verification",
            ]),
            evidence: z.array(refSchema).max(100),
          })
          .strict(),
      )
      .max(6),
    nextStep: z.enum([
      "close_explained",
      "handoff_revoke_session",
      "handoff_review_monitor",
    ]),
    nextOwnerRole: z.enum(["none", "response_team"]),
    reviewWithinTicks: z.number().int().min(1).max(4).nullable(),
    followupTrigger: z.string().max(100).nullable(),
    scopeStatement: z.literal("session_only"),
    optionalNotes: z.string().max(4000),
  })
  .strict();
export type CaseDraft = z.infer<typeof draftSchema>;
const envelope = {
  commandId: z.string().min(1).max(100),
  runId: z.string().min(1).max(100),
  expectedRevision: z.number().int().nonnegative(),
};
export const commandSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...envelope,
      kind: z.literal("ACQUIRE"),
      queryId: z.enum(queryIds),
      cutoffTick: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      ...envelope,
      kind: z.literal("REQUEST_CHECK"),
      check: z.literal("directory_callback"),
      subjectId: z.literal("U-01"),
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
    .object({ ...envelope, kind: z.literal("EDIT_CASE"), draft: draftSchema })
    .strict(),
  z
    .object({ ...envelope, kind: z.literal("CLOSE_CASE"), draft: draftSchema })
    .strict(),
]);
export type Command = z.infer<typeof commandSchema>;
export type Action = Command extends infer C
  ? C extends Command
    ? Omit<C, "commandId" | "runId" | "expectedRevision">
    : never
  : never;
export type PublicRecord = {
  ref: EvidenceRef;
  sourceId: string;
  subjectIds: string[];
  eventTick: number | null;
  eventTimeLabel: string;
  snapshotCutoff: number;
  deliveredTick: number;
  collection: "covered" | "partial" | "unavailable";
  observation: string;
  caveats: string[];
  lineageGroup: string;
};
export type PendingCheck = {
  requestId: string;
  subjectId: string;
  requestedTick: number;
  dueTick: number;
  kind: "directory_callback";
};
export type PlayerView = {
  runId: string;
  revision: number;
  tick: number;
  phase: "investigating" | "closed";
  records: PublicRecord[];
  pendingChecks: PendingCheck[];
  draft: CaseDraft;
  responseWindowOpenedAt: number | null;
  history: { tick: number; text: string }[];
};
export type QualityReport = {
  rubricVersion: string;
  evidence: number;
  reasoning: number;
  decision: number;
  report: number;
  total: number;
  reasons: { ruleId: string; points: number; explanation: string }[];
};
export type Debrief = {
  quality: QualityReport;
  truth: string;
  closeTick: number;
  resolvedThrough: number;
  objectiveAchieved: boolean;
  sessionRevoked: boolean;
  response: string;
  decisionRecords: PublicRecord[];
};
export type Receipt = {
  commandId: string;
  status: "accepted" | "rejected";
  replayed: boolean;
  resultingRevision: number;
  resultingTick: number;
  durability: "committed" | "memory_only" | "not_applicable";
  errorCode?: string;
};
export const emptyDraft = (): CaseDraft => ({
  subjectId: "U-01",
  sessionId: "S-01",
  coverageThroughTick: 0,
  disposition: "unresolved",
  confidence: "low",
  evidence: [],
  alternativeStatus: "untested",
  alternativeEvidence: [],
  caveats: [],
  nextStep: "handoff_review_monitor",
  nextOwnerRole: "response_team",
  reviewWithinTicks: 4,
  followupTrigger: "new_suspicious_activity_or_verification_result",
  scopeStatement: "session_only",
  optionalNotes: "",
});
export const refKey = (r: EvidenceRef) => `${r.acquisitionId}/${r.recordId}`;
