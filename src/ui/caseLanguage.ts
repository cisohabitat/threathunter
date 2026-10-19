// Player-facing wording only. No private fixture/rubric data belongs here.
export const alternativeLabels = {
  untested: "I haven’t tested another explanation yet",
  misuse_weakened: "The records weaken unauthorised use",
  approved_work_weakened: "The records weaken approved work",
  approved_work_unresolved: "Approved work remains unverified",
};
export const caveatLabels = {
  anomaly_not_proof: "Unusual timing alone is not proof",
  registration_not_authorship: "Registration does not identify the operator",
  approval_not_authorship: "Approval does not prove who acted",
  collection_gap: "Collection is missing",
  owner_unavailable: "The owner could not be reached",
  needs_identity_verification: "Identity still needs verification",
};
export const nextLabels = {
  close_explained: "Close this lead · routine monitoring",
  handoff_revoke_session: "Recommend response-team revocation of S-01",
  handoff_review_monitor:
    "Hand over for review, collection restoration and owner verification",
};
export const dispositionLabels = {
  explained: "Credible explanation",
  likely_misuse: "Likely session misuse",
  unresolved: "Unresolved / provisional risk",
};
export const recordTitles: Record<string, string> = {
  "EV-01": "The unfamiliar login",
  "EV-02": "The usual sign-in pattern",
  "EV-03": "Device registration",
  "EV-04": "Approved work",
  "EV-05": "Session activity and coverage",
  "EV-06": "Verified-owner check",
};
export const sourceLabels: Record<string, string> = {
  identity: "Identity records",
  registry: "Device registry",
  change_record: "Work register",
  application_audit: "Application audit",
  collection_status: "Collection status",
  directory_callback: "Verified directory callback",
};
