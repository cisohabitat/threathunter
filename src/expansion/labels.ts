import type { Finding } from "./contracts";
import type { PublicMission } from "./public";

// Display text only; option values and saved findings keep their enum IDs.
export const handoffLabels: Record<Finding["handoff"], string> = {
  close_explained: "Close this scoped explained lead",
  restrict_access: "Recommend the permitted session restriction",
  review_monitor: "Hand over remaining uncertainty for review",
  repair_collection: "Assign collection restoration and repeat verification",
};
export const followupLabels: Record<Finding["followup"], string> = {
  unselected: "Choose a concrete follow-up…",
  confirm_scope_and_control: "Confirm restriction and assess the named scope",
  verify_business_context: "Verify the outstanding business context",
  restore_and_retest: "Restore collection and repeat the defined test",
  review_new_evidence: "Review a new scoped observation or verified response",
  routine_monitoring: "Routine monitoring for an explained lead",
};
const readable = (id: string) => {
  const text = id.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};
/** Public source name from the mission's query catalogue, else a readable ID. */
export function sourceLabel(mission: PublicMission, sourceId: string) {
  return (
    mission.queries.find((q) => q.sourceId === sourceId)?.source ??
    readable(sourceId)
  );
}
