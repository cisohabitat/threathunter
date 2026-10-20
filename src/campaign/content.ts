import { z } from "zod";
import m04 from "./content/m04.json";
import m07 from "./content/m07.json";
import { missionIdSchema, worldSchema, type MissionId } from "./contracts";

const factSchema = z
  .object({
    id: z.string(),
    recordId: z.string(),
    title: z.string(),
    text: z.string(),
    sourceId: z.string(),
    lineage: z.string(),
    targetId: z.string(),
    worlds: z.array(worldSchema).min(1),
    eventTick: z.number().int().nullable(),
    availableAt: z.number().int().nonnegative(),
    coverage: z.enum(["covered", "partial", "unavailable"]),
    originId: z.string().nullable(),
    relationship: z
      .object({
        account: z.literal("svc-billing"),
        host: z.enum(["APP-01", "LEGACY-01"]),
      })
      .strict()
      .optional(),
  })
  .strict();
export const packageSchema = z
  .object({
    missionId: missionIdSchema,
    version: z.literal("1.0.0"),
    rubricVersion: z.literal("p1-1.0.0"),
    policyVersion: z.enum([
      "m04-session-and-dependency-1",
      "m07-future-collection-1",
    ]),
    title: z.string(),
    question: z.string(),
    briefing: z.string(),
    worlds: z.array(worldSchema).min(2),
    openingFactIds: z.array(z.string()),
    facts: z.array(factSchema),
    queries: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          sourceId: z.string(),
          can: z.string(),
          cannot: z.string(),
          factIds: z.array(z.string()),
          static: z.boolean(),
          scope: z.enum(["account", "host", "services"]),
        })
        .strict(),
    ),
    sufficientSets: z
      .object({
        explained: z.array(z.array(z.string()).min(3)),
        misuse: z.array(z.array(z.string()).min(3)),
        visibility: z.array(z.array(z.string()).min(3)),
        provisional: z.array(z.array(z.string()).min(3)),
      })
      .strict(),
    events: z.array(
      z
        .object({
          id: z.string(),
          tick: z.number().int(),
          phase: z.number().int().min(1).max(7),
          worlds: z.array(worldSchema),
          actor: z.enum(["world", "business", "adversary"]),
          description: z.string(),
          requires: z.array(z.string()),
          effect: z.enum([
            "task_ready",
            "access_ready",
            "task_execution",
            "billing_completed",
            "objective",
          ]),
        })
        .strict(),
    ),
    truth: z
      .object({
        B: z.string(),
        M: z.string(),
        "U-B": z.string(),
        "U-M": z.string(),
      })
      .strict(),
  })
  .strict();
export type Package = z.infer<typeof packageSchema>;
export type Fact = z.infer<typeof factSchema>;
const runtimeFacts = [
  "sensor_enabled",
  "test_failed",
  "test_received",
  "window_complete",
];
export function validatePackage(input: unknown): Package {
  const pack = packageSchema.parse(input);
  const facts = new Map(pack.facts.map((f) => [f.id, f]));
  const events = new Map(pack.events.map((e) => [e.id, e]));
  if (
    facts.size !== pack.facts.length ||
    events.size !== pack.events.length ||
    new Set(pack.queries.map((q) => q.id)).size !== pack.queries.length
  )
    throw Error("Duplicate authored ID");
  if (
    pack.policyVersion !==
    (pack.missionId === "M04"
      ? "m04-session-and-dependency-1"
      : "m07-future-collection-1")
  )
    throw Error("Policy does not match mission");
  for (const id of pack.openingFactIds)
    if (!facts.has(id)) throw Error("Dangling opening fact");
  for (const query of pack.queries)
    for (const id of query.factIds) {
      const fact = facts.get(id);
      if (!fact || fact.sourceId !== query.sourceId)
        throw Error("Query/source reference mismatch");
    }
  for (const fact of pack.facts) {
    if (fact.eventTick !== null && fact.eventTick > fact.availableAt)
      throw Error("Source available before its event");
    if (
      fact.originId &&
      (!events.has(fact.originId) ||
        events.get(fact.originId)!.tick !== fact.eventTick)
    )
      throw Error("Invalid source lineage");
    if (fact.worlds.some((w) => !pack.worlds.includes(w)))
      throw Error("Fact uses unsupported world");
  }
  for (const sets of Object.values(pack.sufficientSets))
    for (const set of sets) {
      if (
        new Set(set).size !== set.length ||
        set.some((id) => !facts.has(id) && !runtimeFacts.includes(id))
      )
        throw Error("Invalid sufficient set");
      const authored = set.flatMap((id) =>
        facts.has(id) ? [facts.get(id)!] : [],
      );
      if (new Set(authored.map((f) => f.lineage)).size < 3)
        throw Error("Insufficient independent source propositions");
    }
  if (
    pack.missionId === "M07" &&
    (pack.sufficientSets.misuse.length || pack.sufficientSets.explained.length)
  )
    throw Error("Coverage twins cannot establish actor intent");
  // Sparse twins must share every authored observation and its availability.
  const twin = (world: string) =>
    JSON.stringify(
      pack.facts
        .filter((f) => f.worlds.includes(world as "U-B"))
        .map(({ worlds: _worlds, ...f }) => {
          void _worlds;
          return f;
        }),
    );
  if (twin("U-B") !== twin("U-M")) throw Error("Sparse observation mismatch");
  return pack;
}
export const packages: Record<MissionId, Package> = {
  M04: validatePackage(m04),
  M07: validatePackage(m07),
};
