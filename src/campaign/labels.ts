export const claimLabels = {
  explained: "Specific activity explained by approved work",
  misuse: "Likely unauthorised use",
  visibility: "Established visibility limit",
  provisional: "Bounded preliminary finding",
};
export const handoffLabels = {
  close_explained: "Close this scoped lead; routine monitoring",
  restrict_session: "Recommend BILL-S1 restriction to the response team",
  review_dependency: "Request account/session and billing-dependency review",
  repair_collection:
    "Request source repair and repeat application verification",
  isolate_host: "Host isolation is not authorised",
};
export const limitLabels = {
  anomaly_not_proof: "An unfamiliar relationship is not proof of misuse",
  historical_gap: "Missing historical collection cannot be reconstructed",
  test_not_history: "A successful test now does not prove historical coverage",
  dependency: "The host supports an essential billing dependency",
  attribution: "These sources do not identify every operator/action",
};
export const followupLabels = {
  unselected: "Choose a follow-up trigger",
  confirm_session_restriction:
    "Confirm session restriction and review remaining scope",
  verify_dependency_and_scope:
    "Verify business dependency, ownership and account scope",
  repeat_application_verification:
    "Repeat privileged application verification and review delivery",
  routine_monitoring: "Continue routine monitoring of this scoped lead",
};
