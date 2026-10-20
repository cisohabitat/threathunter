import { z } from "zod";
const text = z.string().min(1).max(4000);
const tick = z.number().int().min(0).max(100);
const sources = z.enum([
  "identity",
  "registry",
  "change_record",
  "application_audit",
  "collection_status",
  "directory_callback",
]);
const factList = z.array(text).min(1).max(32);
const sets = z.array(factList).min(1).max(10);
const dispositions = ["explained", "likely_misuse", "unresolved"] as const;
const world = z
  .object({
    worldClass: z.enum(["benign", "misuse"]),
    visibility: z.enum(["complete", "sparse"]),
    facts: z
      .object({ "Q-D": text, "Q-C": text, "Q-F": text, VERIFY: text })
      .strict(),
  })
  .strict();
export const missionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.literal("M01"),
    ruleset: z.literal("4.0.0"),
    title: text,
    initialTick: z.literal(0),
    responseDelay: z.literal(2),
    objectiveTick: z.literal(8),
    responseWindow: z.literal(2),
    scope: z
      .object({
        identity: z.literal("U-01"),
        session: z.literal("S-01"),
        service: z.literal("FIN-01"),
      })
      .strict(),
    queryRules: z
      .object({
        cost: z.literal(1),
        capture: z.literal("request_start"),
        delivery: z.literal("completion"),
        staticCacheCost: z.literal(0),
      })
      .strict(),
    verification: z
      .object({
        cost: z.literal(1),
        dueOffset: z.literal(3),
        duplicatePendingCost: z.literal(0),
        channel: z.literal("directory_callback"),
      })
      .strict(),
    queries: z.record(
      z.enum(["Q-H", "Q-D", "Q-C", "Q-F"]),
      z.object({ label: text, source: sources, static: z.boolean() }).strict(),
    ),
    initialFacts: factList,
    commonFacts: z.object({ "Q-H": text }).strict(),
    recordByFact: z.record(
      text,
      z
        .object({
          id: z.enum(["EV-01", "EV-02", "EV-03", "EV-04", "EV-05", "EV-06"]),
          source: sources,
          text,
          lineageGroup: text,
        })
        .strict(),
    ),
    worlds: z
      .object({ B: world, M: world, "U-B": world, "U-M": world })
      .strict(),
    adversaryEvents: z
      .array(
        z
          .object({
            tick,
            kind: z.enum([
              "session_scope_attempt",
              "prepare_reports",
              "objective_transfer",
            ]),
          })
          .strict(),
      )
      .length(3),
    businessEvents: z
      .array(
        z
          .object({
            tick,
            kind: z.enum([
              "approved_finance_activity",
              "validate_finance_task",
              "complete_finance_task",
            ]),
          })
          .strict(),
      )
      .length(3),
    sufficientSets: z.record(z.enum(dispositions), sets),
    expectedNext: z.record(
      z.enum(dispositions),
      z.enum([
        "close_explained",
        "handoff_revoke_session",
        "handoff_review_monitor",
      ]),
    ),
    confidenceAllowed: z.record(
      z.enum(dispositions),
      z.array(z.enum(["low", "medium", "high"])).min(1),
    ),
    alternativeEvidence: z.record(text, factList),
    caveatEvidence: z.record(text, factList),
    qualityWeights: z
      .object({
        evidence: z.literal(0.3),
        reasoning: z.literal(0.25),
        decision: z.literal(0.3),
        report: z.literal(0.15),
      })
      .strict(),
    publicTruthFieldsForbidden: factList,
    nextStepPackages: z.record(
      text,
      z
        .object({
          nextOwnerRole: z.enum(["none", "response_team"]),
          reviewWithinTicks: z.number().int().min(1).max(4).nullable(),
          followupTrigger: text,
        })
        .strict(),
    ),
    truthNarrative: z
      .object({ B: text, M: text, "U-B": text, "U-M": text })
      .strict(),
  })
  .strict();
export function validateMission(raw: unknown) {
  const mission = missionSchema.parse(raw);
  const fail = (message: string): never => {
    throw Error(`Mission authoring: ${message}`);
  };
  const requireFact = (fact: string) => {
    if (!Object.hasOwn(mission.recordByFact, fact))
      fail(`dangling fact ${fact}`);
  };
  for (const fact of [
    ...mission.initialFacts,
    ...Object.values(mission.commonFacts),
    ...Object.values(mission.worlds).flatMap((w) => Object.values(w.facts)),
    ...Object.values(mission.sufficientSets).flat(2),
    ...Object.values(mission.alternativeEvidence).flat(),
    ...Object.values(mission.caveatEvidence).flat(),
  ])
    requireFact(fact);
  for (const w of Object.values(mission.worlds)) {
    const available = new Set([
      ...mission.initialFacts,
      ...Object.values(mission.commonFacts),
      ...Object.values(w.facts),
    ]);
    const supported = dispositions.filter((d) =>
      mission.sufficientSets[d].some((set) =>
        set.every((f) => available.has(f)),
      ),
    );
    if (!supported.length) fail("branch has no defensible disposition");
    if (supported.includes("explained") && supported.includes("likely_misuse"))
      fail("conflicting explanation predicates");
  }
  if (
    JSON.stringify(mission.worlds["U-B"].facts) !==
    JSON.stringify(mission.worlds["U-M"].facts)
  )
    fail("sparse twins disclose different observations");
  for (const list of [mission.adversaryEvents, mission.businessEvents]) {
    if (list.map((e) => e.tick).join(",") !== "2,5,8")
      fail("event schedule differs from the reference fixture");
  }
  for (const [query, def] of Object.entries(mission.queries)) {
    const expectedSource = {
      "Q-H": "identity",
      "Q-D": "registry",
      "Q-C": "change_record",
      "Q-F": "application_audit",
    }[query];
    if (def.source !== expectedSource)
      fail("query uses an unsupported source capability");
    if (query === "Q-F" ? def.static : !def.static)
      fail("source cache/capability mismatch");
  }
  for (const value of Object.values(mission.recordByFact)) {
    if (
      /\b(?:sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16})\b|(?:must|only)\s+(?:hover|drag)|<script|eval\s*\(/i.test(
        value.text,
      )
    )
      fail("unsafe or inaccessible evidence copy");
  }
  return mission;
}
