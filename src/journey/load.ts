import { archiveMatches } from "../persistence/archive";
import { database as m01DB } from "../persistence/browserStore";
import {
  validateSave,
  ValidationUnavailableError,
} from "../persistence/validation";
import { database as p1DB } from "../campaign/storage";
import { request, ValidatorUnavailable } from "../campaign/validator";
import { caseOrder, type CaseId, type Progress } from "./contracts";

import { database as expansionDB } from "../expansion/storage";
import {
  request as requestExpansion,
  ValidatorUnavailable as ExpansionUnavailable,
} from "../expansion/validator";
const isP1 = (id: CaseId) => id === "M04" || id === "M07";
const archiveLimit = 5;
type Row = { id: string; revision: number; current: unknown };
// A lazy, read-only adapter. Full states stay here; React receives only progress.
async function check(row: Row, mission: CaseId, archive: boolean) {
  const state =
    mission === "M01"
      ? await validateSave(JSON.stringify(row.current))
      : (
          await (isP1(mission) ? request : requestExpansion)(
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
    throw Error("Saved mission/revision mismatch");
  if (archive && !archiveMatches(row.id, mission, state.view.runId))
    throw Error("Archive run does not match its key");
  return state.view.phase === "closed" && Boolean(state.debrief);
}
const unavailable = (error: unknown) =>
  error instanceof ValidationUnavailableError ||
  error instanceof ValidatorUnavailable ||
  error instanceof ExpansionUnavailable;

async function loadMission(mission: CaseId): Promise<Progress> {
  const result: Progress = {
    mission,
    active: "none",
    completed: false,
    archivedCompletion: false,
    archiveCheck: "complete",
  };
  const table =
    mission === "M01"
      ? m01DB.runs
      : isP1(mission)
        ? p1DB.rows
        : expansionDB.rows;
  const activeKey = mission === "M01" ? "active" : `active:${mission}`;
  try {
    const active = await table.get(activeKey);
    if (active) {
      try {
        result.completed = await check(active, mission, false);
        result.active = result.completed ? "closed" : "open";
      } catch (error) {
        result.active = unavailable(error) ? "unavailable" : "needs_recovery";
      }
    }
  } catch {
    result.active = "unavailable";
  }
  // Closed active progress already establishes completion. Do not scan archives
  // unnecessarily or load an unbounded history of past runs onto the interface.
  if (result.completed) return result;
  try {
    const rows = await table
      .where("id")
      .startsWith(mission === "M01" ? "completed:" : `completed:${mission}:`)
      .limit(archiveLimit + 1)
      .toArray();
    for (const row of rows.slice(0, archiveLimit)) {
      try {
        if (await check(row, mission, true)) {
          result.completed = true;
          result.archivedCompletion = true;
          return result;
        }
        result.archiveCheck = "partial";
      } catch (error) {
        result.archiveCheck = unavailable(error) ? "unavailable" : "partial";
        if (unavailable(error)) return result;
      }
    }
    if (rows.length > archiveLimit) result.archiveCheck = "partial";
  } catch {
    result.archiveCheck = "unavailable";
  }
  return result;
}
export async function loadProgress(): Promise<Progress[]> {
  return Promise.all(caseOrder.map(loadMission));
}
