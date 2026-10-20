export const caseOrder = ["M01", "M04", "M07"] as const;
export type CaseId = (typeof caseOrder)[number];
export const caseDetails = {
  M01: {
    title: "The Midnight Login",
    lesson:
      "Investigate an alert, test approved work and make a scoped finding.",
  },
  M04: {
    title: "The Forgotten Server",
    lesson:
      "Start a proactive account review and investigate an unexpected relationship.",
  },
  M07: {
    title: "The Missing Logs",
    lesson: "Test collection capability and make a useful visibility finding.",
  },
} as const;
export type Progress = {
  mission: CaseId;
  active: "none" | "open" | "closed" | "needs_recovery" | "unavailable";
  completed: boolean;
  archivedCompletion: boolean;
  archiveCheck: "complete" | "partial" | "unavailable";
};
export function nextCase(progress: Progress[]): CaseId | null {
  return (
    caseOrder.find(
      (id) => !progress.find((p) => p.mission === id)?.completed,
    ) ?? null
  );
}
