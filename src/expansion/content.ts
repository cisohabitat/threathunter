import { z } from "zod";
import { missionIdSchema, worldSchema, dispositionSchema } from "./contracts";
import m02 from "./content/m02.json";
import m03 from "./content/m03.json";
import m05 from "./content/m05.json";
import m06 from "./content/m06.json";
import m08 from "./content/m08.json";
import m09 from "./content/m09.json";
import m10 from "./content/m10.json";
import m11 from "./content/m11.json";
import m12 from "./content/m12.json";
const id = z.string().min(1).max(80),
  text = z.string().min(1).max(3000),
  tick = z.number().int().min(0).max(10000);
const entity = z
  .object({
    id,
    name: text,
    purpose: text,
    owner: text,
    impact: text,
    capability: text,
    dependency: text,
  })
  .strict();
export const packageSchema = z
  .object({
    missionId: missionIdSchema,
    version: z.literal("1.0.0"),
    rubricVersion: z.literal("expansion-1.0.0"),
    policyVersion: id,
    title: text,
    trigger: text,
    question: text,
    reviewWindow: text,
    briefing: text,
    lesson: text,
    worlds: z.array(worldSchema).length(4),
    entities: z.array(entity).min(2).max(6),
    initialEntities: z.array(id).min(1).max(6),
    initialScope: id,
    primaryTarget: id,
    mechanic: z
      .object({
        kind: z.enum([
          "triage",
          "context",
          "attribution",
          "path",
          "boundary",
          "grant",
          "intent",
          "causal",
          "capstone",
        ]),
        question: text,
        options: z
          .array(z.object({ id, label: text }).strict())
          .min(2)
          .max(4),
        supportedChoice: id,
        unsupportedChoices: z.array(id).max(4),
        requires: z.array(id).min(1),
        claims: z
          .array(z.object({ id, label: text }).strict())
          .min(2)
          .max(4),
        priorities: z.array(id).min(2).max(6),
      })
      .strict(),
    limits: z
      .array(
        z.object({ id, label: text, requires: z.array(id).min(1) }).strict(),
      )
      .min(1)
      .max(10),
    queries: z
      .array(
        z
          .object({
            id,
            label: text,
            sourceId: id,
            source: text,
            question: text,
            can: text,
            cannot: text,
            targets: z.array(id).min(1).max(6),
            static: z.boolean(),
            factIds: z.array(id).min(1),
          })
          .strict(),
      )
      .min(4)
      .max(12),
    facts: z
      .array(
        z
          .object({
            id,
            recordId: id,
            title: text,
            text,
            sourceId: id,
            worlds: z.array(worldSchema).min(1),
            entityIds: z.array(id).min(1),
            eventTick: tick.nullable(),
            availableAt: tick,
            coverage: z.enum(["covered", "partial", "unavailable"]),
            lineage: id,
            originId: id,
            caveats: z.array(text).max(10),
          })
          .strict(),
      )
      .min(5)
      .max(80),
    sufficient: z.record(dispositionSchema, z.array(z.array(id).min(1)).min(1)),
    response: z
      .object({
        targetId: id,
        owner: text,
        delayTicks: z.number().int().min(1).max(4),
        windowTicks: z.number().int().min(1).max(4),
        control: text,
        requiredFacts: z.array(id).min(1),
        objectiveTick: z.number().int().min(4).max(20),
        objective: text,
        dependency: text,
      })
      .strict(),
    sensorEnabled: z.boolean(),
    glossary: z
      .array(z.object({ term: text, definition: text }).strict())
      .min(1)
      .max(12),
  })
  .strict();
export type Package = z.infer<typeof packageSchema>;
export type Fact = Package["facts"][number];
export function validatePackage(value: unknown): Package {
  const p = packageSchema.parse(value),
    entities = new Set(p.entities.map((e) => e.id)),
    facts = new Map(p.facts.map((f) => [f.id, f]));
  if (
    entities.size !== p.entities.length ||
    facts.size !== p.facts.length ||
    new Set(p.queries.map((q) => q.id)).size !== p.queries.length ||
    new Set(p.worlds).size !== 4
  )
    throw Error("Duplicate package IDs");
  for (const target of [
    ...p.initialEntities,
    p.initialScope,
    p.primaryTarget,
    p.response.targetId,
    ...p.mechanic.priorities,
  ])
    if (!entities.has(target)) throw Error("Dangling scope");
  if (
    !p.initialEntities.includes(p.initialScope) ||
    p.response.targetId !== p.primaryTarget
  )
    throw Error("Initial/response scope mismatch");
  if (
    p.mechanic.unsupportedChoices.some(
      (id) => !p.mechanic.options.some((o) => o.id === id),
    ) ||
    p.mechanic.unsupportedChoices.includes(p.mechanic.supportedChoice)
  )
    throw Error("Invalid unsupported-assertion catalogue");
  if (!p.mechanic.options.some((o) => o.id === p.mechanic.supportedChoice))
    throw Error("Missing authored reasoning option");
  for (const f of p.facts) {
    if (
      f.entityIds.some((e) => !entities.has(e)) ||
      (f.eventTick !== null && f.availableAt < f.eventTick)
    )
      throw Error("Invalid fact target/time");
    for (const other of p.facts)
      if (
        other !== f &&
        other.recordId === f.recordId &&
        other.worlds.some((w) => f.worlds.includes(w))
      )
        throw Error("Overlapping record identities");
    if (/-----BEGIN|AKIA[A-Z0-9]{16}|<script|Bearer\s+[A-Za-z0-9]/.test(f.text))
      throw Error("Unsafe authored content");
  }
  for (const q of p.queries) {
    if (
      q.targets.some((t) => t !== "all" && !entities.has(t)) ||
      q.factIds.some(
        (id) => !facts.has(id) || facts.get(id)!.sourceId !== q.sourceId,
      )
    )
      throw Error("Unsupported query references");
    for (const world of p.worlds)
      if (
        q.factIds.filter((id) => facts.get(id)!.worlds.includes(world)).length >
        20
      )
        throw Error("Source snapshot exceeds bounded workspace");
    for (const world of p.worlds)
      if (!q.factIds.some((id) => facts.get(id)!.worlds.includes(world)))
        throw Error("Source has no defined outcome for world");
  }
  for (const ids of [
    ...Object.values(p.sufficient).flat(),
    p.mechanic.requires,
    p.response.requiredFacts,
    ...p.limits.map((l) => l.requires),
  ])
    if (ids.some((id) => !facts.has(id)))
      throw Error("Dangling evidence predicate");
  for (const [d, sets] of Object.entries(p.sufficient))
    for (const set of sets) {
      if (
        new Set(set).size !== set.length ||
        !p.worlds.some((w) =>
          set.every((id) => facts.get(id)!.worlds.includes(w)),
        )
      )
        throw Error("Impossible sufficient set");
      if (
        d === "misuse" &&
        !set.some((id) => p.response.requiredFacts.includes(id))
      )
        throw Error("Disruptive finding has no scoped operation evidence");
    }
  for (const world of p.worlds)
    if (
      !Object.values(p.sufficient)
        .flat()
        .some((set) => set.every((id) => facts.get(id)!.worlds.includes(world)))
    )
      throw Error("World has no defensible conclusion");
  // Every sparse-twin source, content field and availability must be literally equal.
  const visible = (w: string) =>
    p.facts
      .filter((f) => f.worlds.includes(w as "U-B"))
      .map(({ id, worlds, ...f }) => {
        void id;
        void worlds;
        return f;
      });
  if (JSON.stringify(visible("U-B")) !== JSON.stringify(visible("U-M")))
    throw Error("Sparse twin collection differs");
  return p;
}
export const packages = Object.fromEntries(
  [m02, m03, m05, m06, m08, m09, m10, m11, m12].map((p) => {
    const valid = validatePackage(p);
    return [valid.missionId, valid];
  }),
) as Record<z.infer<typeof missionIdSchema>, Package>;
