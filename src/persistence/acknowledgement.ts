import type { EngineState } from "../engine/engine";

// Storage metadata only. These functions clone their input and cannot dispatch.
export function acknowledge(
  state: EngineState,
  committedRevision: number | null,
): EngineState {
  const copy = structuredClone(state);
  copy.persistence = { committedRevision };
  for (const entry of Object.values(copy.receipts)) {
    entry.receipt.durability =
      committedRevision !== null &&
      entry.receipt.resultingRevision <= committedRevision
        ? "committed"
        : "memory_only";
  }
  return copy;
}
// A prepared acknowledgement is private to the transaction until commit resolves.
export function markCommitted(state: EngineState) {
  return acknowledge(state, state.view.revision);
}
