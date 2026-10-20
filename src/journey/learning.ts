import { archiveMatches } from "../persistence/archive";
import { database as m01DB } from "../persistence/browserStore";
import {
  validateSave,
  ValidationUnavailableError,
} from "../persistence/validation";
import { database as p1DB } from "../campaign/storage";
import {
  request as p1Request,
  ValidatorUnavailable as P1Unavailable,
} from "../campaign/validator";
import { database as expansionDB } from "../expansion/storage";
import {
  request as expansionRequest,
  ValidatorUnavailable as ExpansionUnavailable,
} from "../expansion/validator";
import { caseOrder } from "./contracts";
export type Learning = {
  completedExamples: number;
  testedAlternatives: number;
  scopedFindings: number;
  visibilityFindings: number;
  provisionalHandoffs: number;
  checkedRows: number;
  partial: boolean;
  unavailable: boolean;
};
export async function loadLearning(): Promise<Learning> {
  const result: Learning = {
    completedExamples: 0,
    testedAlternatives: 0,
    scopedFindings: 0,
    visibilityFindings: 0,
    provisionalHandoffs: 0,
    checkedRows: 0,
    partial: false,
    unavailable: false,
  };
  for (const mission of caseOrder) {
    const p1 = mission === "M04" || mission === "M07",
      table =
        mission === "M01" ? m01DB.runs : p1 ? p1DB.rows : expansionDB.rows;
    try {
      const active = await table.get(
          mission === "M01" ? "active" : `active:${mission}`,
        ),
        archives = await table
          .where("id")
          .startsWith(
            mission === "M01" ? "completed:" : `completed:${mission}:`,
          )
          .limit(6)
          .toArray();
      if (archives.length > 5) result.partial = true;
      for (const row of [
        ...(active ? [active] : []),
        ...archives.slice(0, 5),
      ]) {
        result.checkedRows++;
        try {
          const state =
            mission === "M01"
              ? await validateSave(JSON.stringify(row.current))
              : (
                  await (p1 ? p1Request : expansionRequest)(
                    "import",
                    JSON.stringify(row.current),
                  )
                ).state;
          if (
            !state ||
            state.view.revision !== row.revision ||
            ("missionId" in state && state.missionId !== mission) ||
            ("mode" in state && state.mode !== "campaign")
          )
            throw Error("Saved identity mismatch");
          if (
            row.id.startsWith("completed:") &&
            !archiveMatches(row.id, mission, state.view.runId)
          )
            throw Error("Archive identity mismatch");
          const d = state.debrief;
          if (state.view.phase !== "closed" || !d) continue;
          result.completedExamples++;
          const q = d.quality,
            supported =
              "supported" in q
                ? q.supported
                : q.reasons.some(
                    (r) => r.ruleId === "evidence.support" && r.points > 0,
                  ),
            f = d.finding;
          const records =
            "decisionRecords" in d ? d.decisionRecords : d.records;
          if (
            supported &&
            f.alternativeEvidence.length &&
            ("alternativeStatus" in f
              ? f.alternativeStatus !== "untested"
              : f.alternative !== "untested")
          )
            result.testedAlternatives++;
          if (
            supported &&
            f.evidence.length &&
            ("scopeStatement" in f
              ? f.scopeStatement === "session_only"
              : f.scopeAcknowledged)
          )
            result.scopedFindings++;
          if (
            supported &&
            (f.disposition === "visibility" ||
              (f.disposition === "unresolved" &&
                records.some(
                  (r) =>
                    ("collection" in r ? r.collection : r.coverage) ===
                    "unavailable",
                )))
          )
            result.visibilityFindings++;
          if (
            supported &&
            (f.disposition === "provisional" || f.disposition === "unresolved")
          )
            result.provisionalHandoffs++;
          // One example per case: do not turn a bounded read into an all-time ranking.
          break;
        } catch (error) {
          result.partial = true;
          if (
            error instanceof ValidationUnavailableError ||
            error instanceof P1Unavailable ||
            error instanceof ExpansionUnavailable
          ) {
            result.unavailable = true;
            break;
          }
        }
      }
    } catch {
      result.partial = true;
      result.unavailable = true;
    }
  }
  return result;
}
