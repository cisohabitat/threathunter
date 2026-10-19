import {
  refKey,
  type CaseDraft,
  type EvidenceRef,
  type PublicRecord,
} from "../domain/contracts";
// Post-close feedback is derived from the same observed facts and predicates as the scorer.
// No world identity or operational outcome is an input.
export function explainRule(
  ruleId: string,
  ok: boolean,
  records: PublicRecord[],
  facts: Record<string, string>,
  draft: CaseDraft,
  tick: number,
  urgency: number | null,
  supported: boolean,
): { feedback: string; evidence: EvidenceRef[] } {
  const refs = draft.evidence;
  const matching = (list: EvidenceRef[], test: (fact: string) => boolean) =>
    list.filter((r) => test(facts[refKey(r)] ?? ""));
  const collected = (test: (fact: string) => boolean) =>
    records.some((r) => test(facts[refKey(r.ref)] ?? ""));
  const prefix =
    (...starts: string[]) =>
    (fact: string) =>
      starts.some((s) => fact.startsWith(s));
  let evidence = refs;
  let feedback = "";
  switch (ruleId) {
    case "evidence.baseline":
      evidence = matching(refs, (f) =>
        ["anomalous_session", "daytime_baseline"].includes(f),
      );
      feedback = ok
        ? "You cited both the unfamiliar session and the account’s normal sign-in pattern."
        : collected((f) => f === "daytime_baseline")
          ? "You collected the sign-in baseline, but your report did not cite both it and the opening session."
          : "Your report did not establish the usual sign-in pattern. Comparing sign-in history was an available question.";
      break;
    case "evidence.legitimacy":
      evidence = matching(refs, prefix("approval_", "owner_"));
      feedback = ok
        ? "Your cited work-register or verified-owner result tested whether this could be legitimate work. A failed check can still establish a limit."
        : collected(prefix("approval_", "owner_"))
          ? "You received work or owner context but did not cite it in your finding."
          : "Your report did not include a work-register or completed verified-owner check. Those questions could test an ordinary explanation.";
      break;
    case "evidence.technical":
      evidence = matching(refs, prefix("device_", "scope_"));
      feedback = ok
        ? "You cited device registration, session activity or a documented collection limit."
        : collected(prefix("device_", "scope_"))
          ? "You collected technical context but did not cite it in your finding."
          : "Your report did not include device registration, session activity or a collection-coverage result.";
      break;
    case "evidence.support":
    case "reasoning.support":
      feedback = ok
        ? "The combination of observations you cited supports this finding within session S-01."
        : "The cited observations do not establish the finding you selected. Reconsider the claim or gather and cite a stronger basis; the simulation’s hidden actor cannot fill the gap.";
      break;
    case "reasoning.alternative":
      evidence = draft.alternativeEvidence;
      feedback = ok
        ? "The observations linked to your alternative support the status you selected."
        : draft.alternativeStatus === "untested"
          ? "You did not record a tested alternative explanation. A plausible ordinary or suspicious explanation needs an explicit check."
          : !evidence.length
            ? "You selected a status for another explanation but did not link an observation that tested it."
            : "The observations linked to the other explanation do not support the status you selected for this finding.";
      break;
    case "reasoning.limit":
      evidence = draft.caveats.flatMap((c) => c.evidence);
      feedback = ok
        ? "You tied a relevant limitation to a delivered observation instead of treating missing information as certainty."
        : !draft.caveats.length
          ? "You did not record what your evidence leaves unknown. Link an observation to a relevant limitation."
          : "Your recorded limits were not supported by their linked observations. A limitation needs evidence too.";
      break;
    case "decision.pair":
      feedback = ok
        ? "Your proposed next action is proportionate to the supported finding."
        : !supported
          ? "A next action needs a defensible, evidence-supported finding behind it."
          : "Your next action does not match the finding supported by your cited observations.";
      break;
    case "decision.authority":
      evidence = [];
      feedback =
        "Your recommendation stayed within S-01 and the response team’s authority. You did not self-approve a disruptive control.";
      break;
    case "decision.timing":
      evidence = matching(
        records.map((r) => r.ref),
        (f) => f === "scope_unexpected",
      );
      feedback = !supported
        ? "Timing credit requires an evidence-supported finding; an early unsupported guess does not earn it."
        : urgency === null
          ? "No urgent response condition had been established by your delivered observations."
          : ok
            ? `Out-of-role activity was delivered at step ${urgency}. You submitted at step ${tick}, within the disclosed two-step policy window.`
            : `Out-of-role activity was delivered at step ${urgency}. The disclosed handoff window ended at step ${urgency + 2}; you submitted at step ${tick}. This deduction reflects known delay, not hidden damage.`;
      break;
    case "report.confidence":
      feedback = ok
        ? "Your stated confidence is compatible with the evidence-supported finding."
        : !supported
          ? "Confidence credit requires a finding established by cited evidence."
          : "Your selected confidence overstates or understates what this supported finding establishes. For M01, explained findings allow medium/high, likely misuse medium, and unresolved findings low confidence.";
      break;
    case "report.scope":
      feedback = ok
        ? "Your report cites the opening session, uses at least two source families and records a relevant limit while staying scoped to S-01."
        : "The report needs the opening session, at least two cited source families and an evidence-linked limitation. More cards from one source do not create another source family.";
      break;
    case "report.followup":
      evidence = [];
      feedback = ok
        ? "Your supported next step includes its required owner, review window and follow-up trigger."
        : "A complete follow-up package must match a supported finding, its next owner, review window and trigger.";
  }
  const unique = [...new Map(evidence.map((r) => [refKey(r), r])).values()];
  return { feedback, evidence: unique };
}
