export const caseOrder = [
  "M01",
  "M04",
  "M07",
  "M02",
  "M03",
  "M05",
  "M06",
  "M08",
  "M09",
  "M10",
  "M11",
  "M12",
] as const;
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
  M11: {
    title: "The Unseen Adversary",
    lesson:
      "Do several suspicious observations share one explanation, or should their causal claims stay separate?",
  },
  M12: {
    title: "Operation Shadowfall",
    lesson:
      "What should be handed over first when one service has a scoped action and another has an unresolved coverage gap?",
  },
  M06: {
    title: "Moving Quietly",
    lesson:
      "Does a cross-system connection fit a specific management task or extend beyond it?",
  },
  M03: {
    title: "The Trusted Employee",
    lesson:
      "Does a familiar account\u2019s activity fit its assigned task, without using the employee\u2019s reputation as evidence?",
  },
  M09: {
    title: "The Silent Administrator",
    lesson:
      "Did emergency access authorise this particular task, target and interval?",
  },
  M02: {
    title: "Too Many Alerts",
    lesson:
      "Which alert deserves the first scoped investigation when severity and business impact disagree?",
  },
  M10: {
    title: "The Insider Question",
    lesson:
      "Which behaviour can be established without turning a policy observation into a claim about motive?",
  },
  M08: {
    title: "The Cloud Connection",
    lesson:
      "Which cloud identity and workload boundary can explain an application action that endpoint records cannot cover?",
  },
  M05: {
    title: "Stolen Identity",
    lesson:
      "What can credential-use evidence establish, and which person-attribution claims remain unsupported?",
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

export function canOpenCase(
  id: CaseId,
  progress: Progress[] | null,
  independent = false,
): boolean {
  const index = caseOrder.indexOf(id),
    own = progress?.find((p) => p.mission === id);
  if (index < 0) return false;
  if (
    index < 3 ||
    independent ||
    (own && own.active !== "none") ||
    own?.completed
  )
    return true;
  return Boolean(
    progress?.find((p) => p.mission === caseOrder[index - 1])?.completed,
  );
}

export function learningGroup(id: CaseId): string {
  if (["M01", "M04", "M07"].includes(id))
    return "Foundations · anomaly, hypothesis and collection";
  if (["M02", "M03", "M05"].includes(id))
    return "Context · priority, trust and attribution";
  if (["M06", "M08", "M09"].includes(id))
    return "Boundaries · access, workload and authority";
  return "Synthesis · intent, causal claims and handoff";
}
