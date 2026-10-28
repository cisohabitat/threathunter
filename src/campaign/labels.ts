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
// Public source names (capabilities only); records keep their source IDs.
export const sourceLabels: Record<string, string> = {
  authentication: "Authentication records",
  management_gateway: "Management gateway",
  ownership: "Ownership and dependency register",
  change_register: "Change register",
  task_process: "Process telemetry",
  billing_application: "Billing application audit",
  collection_configuration: "Declared collection configuration",
  delivery_health: "Delivery health",
  collector_config: "Collector routing",
  identity_authentication: "Identity authentication records",
  cs_app: "Privileged application telemetry",
};
export const sourceLabel = (sourceId: string) =>
  sourceLabels[sourceId] ?? sourceId.replaceAll("_", " ");
