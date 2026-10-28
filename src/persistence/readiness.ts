import { useEffect } from "react";

/**
 * Public reason a mission can or cannot accept a durable Begin/action yet.
 * Contains no world data; exposed as `data-readiness` and performance marks so
 * an intermittent "Begin stays disabled" failure records which gate held.
 */
export type Readiness =
  | "busy"
  | "temporary"
  | "validation-error"
  | "no-writer"
  | "waiting-for-other-tab"
  | "ready";

export function readinessOf(state: {
  busy: boolean;
  temporary: boolean;
  error: string;
  writerAvailable: boolean;
  readOnly: boolean;
}): Readiness {
  if (state.busy) return "busy";
  if (state.temporary) return "temporary";
  if (state.error) return "validation-error";
  if (!state.writerAvailable) return "no-writer";
  if (state.readOnly) return "waiting-for-other-tab";
  return "ready";
}

export function useReadinessMarks(scope: string, readiness: Readiness) {
  useEffect(() => {
    try {
      performance.mark(`threat-hunter:${scope}:${readiness}`);
    } catch {
      /* Marks are diagnostics only. */
    }
  }, [scope, readiness]);
}
