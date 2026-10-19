import Dexie, { type Table } from "dexie";
import { z } from "zod";
import {
  canonical,
  createRun,
  processCommand,
  type EngineState,
} from "../engine/engine";
import { commandSchema } from "../domain/contracts";
const saveSchema = z
  .object({
    schemaVersion: z.literal(1),
    ruleset: z.literal("4.0.0"),
    runId: z.string().min(1).max(100),
    world: z.enum(["B", "M", "U-B", "U-M"]),
    commands: z.array(commandSchema).max(20000),
    hash: z.string().regex(/^[0-9a-f]{8}$/),
  })
  .strict();
export type SaveEnvelope = z.infer<typeof saveSchema>;
export function checksum(value: unknown) {
  let h = 2166136261;
  for (const c of canonical(value)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
export function exportSave(state: EngineState): SaveEnvelope {
  const data = {
    schemaVersion: 1 as const,
    ruleset: "4.0.0" as const,
    runId: state.view.runId,
    world: state.world,
    commands: state.commands,
  };
  return { ...data, hash: checksum(data) };
}
export function importSave(text: string): EngineState {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw Error("Save exceeds 2 MiB.");
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const ch of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === "{" || ch === "[") {
      if (++depth > 64) throw Error("Save nesting exceeds 64.");
    } else if (ch === "}" || ch === "]") depth--;
  }
  const raw = JSON.parse(text, (key, value) => {
    if (["__proto__", "constructor", "prototype"].includes(key))
      throw Error("Unsafe save key.");
    return value;
  });
  const saved = saveSchema.parse(raw);
  const { hash, ...data } = saved;
  if (checksum(data) !== hash) throw Error("Save checksum does not match.");
  let state = createRun(saved.runId, saved.world);
  for (const command of saved.commands) {
    const result = processCommand(state, command);
    if (result.receipt.status === "rejected" || result.receipt.replayed)
      throw Error("Save command history is invalid.");
    state = result.state;
  }
  return state;
}
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
export async function commit(
  state: EngineState,
  expectedRevision: number | null,
) {
  const current = exportSave(state);
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
    await database.runs.put({
      id: "active",
      revision: state.view.revision,
      current,
      previous: old?.current ?? null,
    });
  });
}
export async function load() {
  const row = await database.runs.get("active");
  return row ? importSave(JSON.stringify(row.current)) : null;
}
export async function clearSave() {
  await database.runs.delete("active");
}
export function downloadSave(state: EngineState) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(exportSave(state), null, 2)], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `threat-hunter-${state.view.runId}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
