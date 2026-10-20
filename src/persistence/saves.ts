import Dexie, { type Table } from "dexie";
import { canonical, type EngineState } from "../engine/engine";
import { exportSave, markCommitted, type SaveEnvelope } from "./format";
export { exportSave, importSave, checksum } from "./format";
export { validateSave } from "./validation";
import {
  validateSave,
  prepareSaveValidation,
  prepareCommit,
  ValidationUnavailableError,
} from "./validation";
type Row = {
  id: string;
  revision: number;
  current: SaveEnvelope;
  previous: SaveEnvelope | null;
};
class SaveDB extends Dexie {
  runs!: Table<Row, string>;
  constructor() {
    super("threat-hunter-v1");
    this.version(1).stores({ runs: "id" });
  }
}
export const database = new SaveDB();
// Notifications carry no save contents. Only waiting readers reload committed data.
function notifySaveChanges() {
  if (typeof window === "undefined") return;
  try {
    const channel = new BroadcastChannel("threat-hunter-save-changes");
    channel.postMessage({ type: "save_changed" });
    channel.close();
  } catch {
    /* Coordination remains protected by Web Locks and transactions. */
  }
}
export function subscribeSaveChanges(onChange: () => void) {
  try {
    const channel = new BroadcastChannel("threat-hunter-save-changes");
    channel.onmessage = (event) => {
      if (event.data?.type === "save_changed") onChange();
    };
    return () => channel.close();
  } catch {
    return () => {};
  }
}

async function validateRow(row: Row) {
  const state = await validateSave(JSON.stringify(row.current));
  if (state.view.revision !== row.revision)
    throw Error("Saved revision does not match its command history.");
  return markCommitted(state);
}
export type SaveInspection = {
  state: EngineState | null;
  issue: null | { original: Row; previous: EngineState | null };
  archived: boolean;
};
export async function inspectSave(): Promise<SaveInspection> {
  await prepareSaveValidation();
  const [row, archive] = await database.runs.bulkGet([
    "active",
    "recovery-original",
  ]);
  if (!row) return { state: null, issue: null, archived: Boolean(archive) };
  try {
    return {
      state: await validateRow(row),
      issue: null,
      archived: Boolean(archive),
    };
  } catch (error) {
    if (error instanceof ValidationUnavailableError) throw error;
    let previous: EngineState | null = null;
    try {
      if (row.previous)
        previous = markCommitted(
          await validateSave(JSON.stringify(row.previous)),
        );
    } catch {
      /* A damaged backup is never offered as recoverable. */
    }
    return {
      state: null,
      issue: { original: row, previous },
      archived: Boolean(archive),
    };
  }
}
// Compare the complete inspected row inside the write transaction. Recovery must
// not replace a save that changed while the player considered the choices.
export async function resolveRecovery(
  original: Row,
  choice: "previous" | "restart",
) {
  const recovered =
    choice === "previous"
      ? markCommitted(await validateSave(JSON.stringify(original.previous)))
      : null;
  const prepared = recovered ? (await prepareCommit(recovered)).envelope : null;
  await database.transaction("rw", database.runs, async () => {
    const current = await database.runs.get("active");
    if (canonical(current) !== canonical(original))
      throw Error("Another tab changed this save. Reload before recovering.");
    await database.runs.put({ ...original, id: "recovery-original" });
    if (recovered)
      await database.runs.put({
        id: "active",
        revision: recovered.view.revision,
        current: prepared!,
        previous: null,
      });
    else await database.runs.delete("active");
  });
  notifySaveChanges();
  return recovered;
}
export async function downloadStoredSave(original?: Row) {
  const row = original ?? (await database.runs.get("recovery-original"));
  if (!row) throw Error("No original recovery data is available.");
  downloadJSON(row, "threat-hunter-recovery-original.json");
}
export async function commit(
  state: EngineState,
  expectedRevision: number | null,
) {
  // Hash/envelope preparation and audit happen in the worker before the transaction.
  // No acknowledgement escapes until the write completes.
  const { state: committed, envelope: current } = await prepareCommit(state);
  const inspected = await database.runs.get("active");
  if (inspected) await validateRow(inspected);
  await database.transaction("rw", database.runs, async () => {
    const old = await database.runs.get("active");
    if (
      expectedRevision !== null &&
      (!old ||
        old.current.runId !== state.view.runId ||
        old.revision !== expectedRevision)
    )
      throw Error("Another tab changed this save. Reload before writing.");
    if (expectedRevision === null && old)
      throw Error(
        "A saved case already exists. Resume it before starting another.",
      );
    if (canonical(old) !== canonical(inspected))
      throw Error("Another tab changed this save. Reload before writing.");
    await database.runs.put({
      id: "active",
      revision: state.view.revision,
      current,
      previous: old?.current ?? null,
    });
  });
  notifySaveChanges();
  return committed;
}
export async function load() {
  const row = await database.runs.get("active");
  return row ? await validateRow(row) : null;
}
export async function clearSave() {
  await database.runs.delete("active");
  notifySaveChanges();
}
export function downloadSave(state: EngineState) {
  downloadJSON(exportSave(state), `threat-hunter-${state.view.runId}.json`);
}
function downloadJSON(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function archiveCompleted(runId: string, revision: number) {
  const inspected = await database.runs.get("active");
  const saved = inspected ? await validateRow(inspected) : null;
  await database.transaction("rw", database.runs, async () => {
    const row = await database.runs.get("active");
    if (!row || row.current.runId !== runId || row.revision !== revision)
      throw Error(
        "The saved case changed. Export progress and reload before replaying.",
      );
    if (canonical(row) !== canonical(inspected))
      throw Error("The saved case changed. Reload before replaying.");
    if (!saved?.debrief || saved.view.phase !== "closed")
      throw Error("Save the closed finding before starting a replay.");
    await database.runs.put({
      ...row,
      id: `completed:${runId}`,
      previous: null,
    });
    await database.runs.delete("active");
  });
  notifySaveChanges();
}
export async function completedCases() {
  const rows = await database.runs
    .where("id")
    .startsWith("completed:")
    .toArray();
  const result: { id: string; closeTick: number }[] = [];
  for (const row of rows) {
    try {
      const state = await validateRow(row);
      if (state.debrief)
        result.push({ id: row.id, closeTick: state.debrief.closeTick });
    } catch {
      // Never offer a damaged archive as a valid portable case.
    }
  }
  return result;
}
export async function downloadCompleted(id: string) {
  if (!id.startsWith("completed:"))
    throw Error("Invalid completed-case reference.");
  const row = await database.runs.get(id);
  if (!row) throw Error("Completed case is unavailable.");
  downloadSave(await validateRow(row));
}

// Recovery export is deliberately raw: unavailable validation must not prevent backup.
export async function hasStoredSave() {
  return Boolean(await database.runs.get("active"));
}
export async function downloadActiveStoredSave() {
  const row = await database.runs.get("active");
  if (!row) throw Error("No stored case is available to export.");
  downloadJSON(row, "threat-hunter-stored-recovery.json");
}
