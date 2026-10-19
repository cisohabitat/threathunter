import { explainRule } from "./explanations";
import fixture from "../content/m01.json";
import {
  refKey,
  type CaseDraft,
  type EvidenceRef,
  type PublicRecord,
  type QualityReport,
} from "../domain/contracts";
export function assess(
  records: PublicRecord[],
  facts: Record<string, string>,
  draft: CaseDraft,
  tick: number,
  urgency: number | null,
): QualityReport {
  const get = (refs: EvidenceRef[]) =>
    new Set(refs.map((r) => facts[refKey(r)]).filter(Boolean));
  const cited = get(draft.evidence);
  const has = (...fs: string[]) => fs.every((f) => cited.has(f));
  const supported = fixture.sufficientSets[draft.disposition].some((set) =>
    has(...set),
  );
  const alternativeAllowed =
    draft.disposition === "explained"
      ? ["misuse_weakened"]
      : ["approved_work_weakened", "approved_work_unresolved"];
  const altFacts = get(draft.alternativeEvidence);
  const alternatives = fixture.alternativeEvidence as Record<string, string[]>;
  const alternative =
    alternativeAllowed.includes(draft.alternativeStatus) &&
    (alternatives[draft.alternativeStatus] ?? []).some((f) => altFacts.has(f));
  const caveatRules = fixture.caveatEvidence as Record<string, string[]>;
  const limit = draft.caveats.some((c) =>
    (caveatRules[c.code] ?? []).some((f) => get(c.evidence).has(f)),
  );
  const pair =
    supported && fixture.expectedNext[draft.disposition] === draft.nextStep;
  const expected = fixture.nextStepPackages[draft.nextStep];
  const next =
    pair &&
    expected.nextOwnerRole === draft.nextOwnerRole &&
    expected.reviewWithinTicks === draft.reviewWithinTicks &&
    expected.followupTrigger === draft.followupTrigger;
  const families = new Set(
    records
      .filter((r) => draft.evidence.some((e) => refKey(e) === refKey(r.ref)))
      .map((r) => r.sourceId),
  );
  const rules: [string, number, boolean, string][] = [
    [
      "evidence.baseline",
      25,
      has("anomalous_session", "daytime_baseline"),
      "Cite the opening session and its sign-in baseline.",
    ],
    [
      "evidence.legitimacy",
      25,
      [...cited].some(
        (f) => f.startsWith("approval_") || f.startsWith("owner_"),
      ),
      "Cite a work-register or verified-owner result, including a failed check.",
    ],
    [
      "evidence.technical",
      25,
      [...cited].some((f) => f.startsWith("device_") || f.startsWith("scope_")),
      "Cite registration, activity or collection coverage.",
    ],
    [
      "evidence.support",
      25,
      supported,
      "Cited observations substantiate the selected finding.",
    ],
    [
      "reasoning.support",
      50,
      supported,
      "The explanation has a sufficient cited basis.",
    ],
    [
      "reasoning.alternative",
      30,
      alternative,
      "Test a competing explanation with compatible evidence.",
    ],
    [
      "reasoning.limit",
      20,
      limit,
      "Tie a relevant limitation to delivered evidence.",
    ],
    [
      "decision.pair",
      40,
      pair,
      "Match a supported finding to an appropriate next action.",
    ],
    [
      "decision.authority",
      30,
      draft.sessionId === "S-01",
      "Keep the recommendation within session S-01 and responder authority.",
    ],
    [
      "decision.timing",
      30,
      supported &&
        (urgency === null || tick <= urgency + fixture.responseWindow),
      "Hand over a supported finding within the disclosed policy window.",
    ],
    [
      "report.confidence",
      40,
      supported &&
        (fixture.confidenceAllowed[draft.disposition] as string[]).includes(
          draft.confidence,
        ),
      "Use confidence compatible with the supported finding.",
    ],
    [
      "report.scope",
      30,
      has("anomalous_session") &&
        families.size >= 2 &&
        limit &&
        draft.scopeStatement === "session_only",
      "Scope to S-01, cite the session and two source families, and state a limit.",
    ],
    [
      "report.followup",
      30,
      next,
      "Include the correct next owner, review window and follow-up trigger.",
    ],
  ];
  const sum = (prefix: string) =>
    rules
      .filter((r) => r[0].startsWith(prefix))
      .reduce((n, r) => n + (r[2] ? r[1] : 0), 0);
  const evidence = sum("evidence."),
    reasoning = sum("reasoning."),
    decision = sum("decision."),
    report = sum("report.");
  return {
    rubricVersion: fixture.ruleset,
    evidence,
    reasoning,
    decision,
    report,
    total: Math.floor(
      (30 * evidence + 25 * reasoning + 30 * decision + 15 * report) / 100 +
        0.5,
    ),
    reasons: rules.map(([ruleId, points, ok, explanation]) => ({
      ruleId,
      points: ok ? points : 0,
      explanation,
      ...explainRule(
        ruleId,
        ok,
        records,
        facts,
        draft,
        tick,
        urgency,
        supported,
      ),
    })),
  };
}
