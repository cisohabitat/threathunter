import {
  refKey,
  type CaseDraft,
  type EvidenceRef,
  type PlayerView,
} from "../domain/contracts";

// A notebook is the delivered record ledger. Reading never adds report citations.
export function investigationFlow(view: PlayerView, dismissed: string | null) {
  const lead = view.records.find((r) => r.ref.recordId === "EV-01");
  const baseline = view.records.find((r) => r.ref.recordId === "EV-02");
  const latest = view.records.at(-1)!;
  return {
    lead,
    baseline,
    latest,
    stage: !baseline
      ? "opening"
      : refKey(latest.ref) !== dismissed
        ? "result"
        : "questions",
  } as const;
}

export function toggleReference(refs: EvidenceRef[], ref: EvidenceRef) {
  return refs.some((entry) => refKey(entry) === refKey(ref))
    ? refs.filter((entry) => refKey(entry) !== refKey(ref))
    : [...refs, ref];
}

export const nextStepPackages = {
  close_explained: {
    nextOwnerRole: "none",
    reviewWithinTicks: null,
    followupTrigger: "routine_monitoring",
  },
  handoff_revoke_session: {
    nextOwnerRole: "response_team",
    reviewWithinTicks: 2,
    followupTrigger: "confirm_revocation_and_assess_scope",
  },
  handoff_review_monitor: {
    nextOwnerRole: "response_team",
    reviewWithinTicks: 4,
    followupTrigger: "new_suspicious_activity_or_verification_result",
  },
} as const satisfies Record<CaseDraft["nextStep"], Partial<CaseDraft>>;
