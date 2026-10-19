import { z } from "zod";
import manifest from "./manifest.json";
import type { Debrief } from "../../domain/contracts";
export const packSchema = z
  .object({
    packId: z.literal("M01-voice-en-US-v1"),
    schemaVersion: z.literal(1),
    reviewStatus: z.literal("pending-human-listening"),
    reviewer: z.null(),
    generationDate: z.string(),
    productionMethod: z.string(),
    modelSource: z.string().url(),
    modelSha256: z.string().regex(/^[a-f0-9]{64}$/),
    datasetLicense: z.string(),
    delivery: z.string(),
    cues: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9-]+$/),
            text: z.string(),
            when: z.string(),
            speaker: z.string(),
            language: z.literal("en-US"),
            audioPath: z.string().regex(/^\/audio\/m01\/[a-z0-9-]+-v1\.mp3$/),
            durationMs: z.number().int().positive(),
            bytes: z.number().int().positive(),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict(),
      )
      .length(21),
  })
  .strict();
export const voicePack = packSchema.parse(manifest);
export const cues = new Map(voicePack.cues.map((c) => [c.id, c]));
export function debriefCue(data: Debrief) {
  if (
    !data.quality.reasons.find((r) => r.ruleId === "evidence.support")?.points
  )
    return "finding-unsupported";
  if (data.finding.disposition === "explained") return "finding-explained";
  if (data.finding.disposition === "likely_misuse") return "finding-misuse";
  return data.decisionRecords.some((r) => r.collection === "unavailable")
    ? "finding-visibility"
    : "finding-provisional";
}
