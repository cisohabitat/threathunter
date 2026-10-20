import { refKey, type PlayerView } from "../domain/contracts";

// Use only received records and the player's accepted citations, never truth or scores.
export function nextMove(view: PlayerView) {
  const lead = view.records.find((r) => r.ref.recordId === "EV-01");
  const baseline = view.records.find((r) => r.ref.recordId === "EV-02");
  const context = view.records
    .filter((r) => ["EV-03", "EV-04", "EV-06"].includes(r.ref.recordId))
    .at(-1);
  const saved = (ref: { acquisitionId: string; recordId: string }) =>
    view.draft.evidence.some((entry) => refKey(entry) === refKey(ref));
  const comparison = [lead, baseline].filter((record) => record !== undefined);
  const stage = !baseline
    ? "compare"
    : !comparison.every((record) => saved(record.ref))
      ? "save-comparison"
      : !context
        ? "check"
        : !saved(context.ref)
          ? "save-check"
          : "decide";
  return { stage, lead, baseline, context, comparison };
}
