import Dexie, { type Table } from "dexie";
import { canonical, type EngineState } from "../engine/engine";
import {
  exportSave,
  importSave,
  markCommitted,
  type SaveEnvelope,
} from "./format";
export { exportSave, importSave, checksum } from "./format";
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
function validateRow(row: Row) {
  const state = importSave(JSON.stringify(row.current));
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
  const [row, archive] = await database.runs.bulkGet([
    "active",
    "recovery-original",
  ]);
  if (!row) return { state: null, issue: null, archived: Boolean(archive) };
  try {
    return { state: validateRow(row), issue: null, archived: Boolean(archive) };
  } catch {
    let previous: EngineState | null = null;
    try {
      if (row.previous)
        previous = markCommitted(importSave(JSON.stringify(row.previous)));
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
      ? markCommitted(importSave(JSON.stringify(original.previous)))
      : null;
  await database.transaction("rw", database.runs, async () => {
    const current = await database.runs.get("active");
    if (canonical(current) !== canonical(original))
      throw Error("Another tab changed this save. Reload before recovering.");
    await database.runs.put({ ...original, id: "recovery-original" });
    if (recovered)
      await database.runs.put({
        id: "active",
        revision: recovered.view.revision,
        current: exportSave(recovered),
        previous: null,
      });
    else await database.runs.delete("active");
  });
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
  const committed = markCommitted(state);
  const current = exportSave(committed);
  // Validate before opening the write transaction; no acknowledgement escapes yet.
  importSave(JSON.stringify(current));
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
    if (old) validateRow(old);
    await database.runs.put({
      id: "active",
      revision: state.view.revision,
      current,
      previous: old?.current ?? null,
    });
  });
  return committed;
}
export async function load() {
  const row = await database.runs.get("active");
  return row ? validateRow(row) : null;
}
export async function clearSave() {
  await database.runs.delete("active");
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
