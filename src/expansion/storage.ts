import { preserveArchive } from "../persistence/archive";
import Dexie, { type Table } from "dexie";
import type { MissionId } from "./contracts";
import { acknowledge, canonical, stateHash, type State } from "./engine";
import type { Envelope } from "./format";
import { request, ValidatorUnavailable } from "./validator";

export type Slot = MissionId | "free";
export const slotOf = (state: State): Slot =>
  state.mode === "free" ? "free" : state.missionId;
export type Row = {
  id: string;
  revision: number;
  current: Envelope;
  previous: Envelope | null;
};
class CampaignDB extends Dexie {
  rows!: Table<Row, string>;
  constructor() {
    super("threat-hunter-expansion-v1");
    this.version(1).stores({ rows: "id" });
  }
}
export const database = new CampaignDB();
const activeKey = (mission: Slot) => `active:${mission}`;
/**
 * Notifies only for commits to `mission`. Messages without a mission (from an
 * older build in another tab) still notify, which is the previous behaviour.
 */
export function subscribe(mission: Slot, notify: () => void) {
  try {
    const channel = new BroadcastChannel("threat-hunter-expansion-changes");
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data as { mission?: unknown } | null;
      if (typeof data === "object" && data?.mission !== mission) return;
      notify();
    };
    return () => channel.close();
  } catch {
    return () => {};
  }
}
function changed(mission: Slot) {
  if (typeof window === "undefined") return;
  try {
    const channel = new BroadcastChannel("threat-hunter-expansion-changes");
    channel.postMessage({ mission });
    channel.close();
  } catch {
    /* Transactions and Web Locks still enforce ownership. */
  }
}
export async function validateRow(row: Row, mission: Slot) {
  const { state } = await request("import", JSON.stringify(row.current));
  if (
    !state ||
    slotOf(state) !== mission ||
    state.view.revision !== row.revision
  )
    throw Error("Stored mission/revision does not match its history.");
  return acknowledge(state, state.view.revision);
}
export async function inspect(mission: Slot) {
  await request("ready");
  const row = await database.rows.get(activeKey(mission));
  if (!row) return { state: null, issue: null };
  try {
    return { state: await validateRow(row, mission), issue: null };
  } catch (error) {
    if (error instanceof ValidatorUnavailable) throw error;
    let previous: State | null = null;
    if (row.previous) {
      try {
        previous = await validateRow(
          { ...row, revision: row.previous.revision, current: row.previous },
          mission,
        );
      } catch (e) {
        if (e instanceof ValidatorUnavailable) throw e;
      }
    }
    return { state: null, issue: { original: row, previous } };
  }
}
export async function commit(state: State, expectedRevision: number | null) {
  const prepared = await request("commit", state);
  if (!prepared.state || !prepared.envelope) throw new ValidatorUnavailable();
  const id = activeKey(slotOf(state)),
    inspected = await database.rows.get(id);
  if (inspected) await validateRow(inspected, slotOf(state));
  await database.transaction("rw", database.rows, async () => {
    const current = await database.rows.get(id);
    if (
      canonical(current) !== canonical(inspected) ||
      (expectedRevision === null
        ? Boolean(current)
        : !current ||
          current.revision !== expectedRevision ||
          current.current.runId !== state.view.runId)
    )
      throw Error(
        "Another tab changed this mission save. Export retained progress before reloading.",
      );
    await database.rows.put({
      id,
      revision: state.view.revision,
      current: prepared.envelope!,
      previous: current?.current ?? null,
    });
  });
  changed(slotOf(state));
  return prepared.state;
}
export async function recover(mission: Slot, original: Row, state: State) {
  const prepared = await request("commit", state);
  if (!prepared.state || !prepared.envelope || slotOf(state) !== mission)
    throw Error("Recovery mission mismatch.");
  await database.transaction("rw", database.rows, async () => {
    const current = await database.rows.get(activeKey(mission));
    if (canonical(current) !== canonical(original))
      throw Error(
        "Stored data changed since recovery inspection. Reload before choosing again.",
      );
    await database.rows.put({ ...original, id: `original:${mission}` });
    await database.rows.put({
      id: activeKey(mission),
      revision: state.view.revision,
      current: prepared.envelope!,
      previous: null,
    });
  });
  changed(mission);
  return prepared.state;
}
export async function archiveCompleted(state: State) {
  const id = activeKey(slotOf(state)),
    original = await database.rows.get(id);
  if (!original) throw Error("No durable completed case to archive.");
  const checked = await validateRow(original, slotOf(state));
  if (
    !checked.debrief ||
    checked.view.runId !== state.view.runId ||
    checked.view.revision !== state.view.revision ||
    stateHash(checked) !== stateHash(state)
  )
    throw Error("Save the exact closed finding before replaying.");
  await database.transaction("rw", database.rows, async () => {
    if (canonical(await database.rows.get(id)) !== canonical(original))
      throw Error("Completed save changed before archival.");
    await preserveArchive(
      database.rows,
      `completed:${slotOf(state)}:${state.view.runId}`,
      original,
      canonical,
    );
    await database.rows.delete(id);
  });
  changed(slotOf(state));
}
export async function archives(mission: Slot) {
  return database.rows
    .where("id")
    .startsWith(`completed:${mission}:`)
    .primaryKeys();
}
export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function download(state: State) {
  const { text } = await request("export", state);
  if (!text) throw new ValidatorUnavailable();
  downloadText(
    text,
    `threat-hunter-${state.missionId}-${state.view.runId}.json`,
  );
}
export async function downloadRow(id: string, mission: Slot, raw = false) {
  const row = await database.rows.get(id);
  if (!row) throw Error("Stored record is no longer available.");
  if (raw)
    downloadText(
      JSON.stringify(row, null, 2),
      `threat-hunter-${mission}-recovery.json`,
    );
  else await download(await validateRow(row, mission));
}

export async function replaceImported(
  state: State,
  expectedRunId: string,
  expectedRevision: number,
) {
  const slot = slotOf(state),
    id = activeKey(slot),
    original = await database.rows.get(id);
  if (!original)
    throw Error(
      "The active save changed before import. Reload before replacing it.",
    );
  const checked = await validateRow(original, slot);
  if (
    checked.view.runId !== expectedRunId ||
    checked.view.revision !== expectedRevision
  )
    throw Error(
      "The active save changed before import. Export retained progress and reload.",
    );
  const prepared = await request("commit", state);
  if (!prepared.state || !prepared.envelope) throw new ValidatorUnavailable();
  await database.transaction("rw", database.rows, async () => {
    if (canonical(await database.rows.get(id)) !== canonical(original))
      throw Error(
        "The active save changed during import; neither version was replaced.",
      );
    await database.rows.add({
      ...original,
      id: `replaced:${slot}:${crypto.randomUUID()}`,
    });
    if (checked.debrief)
      await preserveArchive(
        database.rows,
        `completed:${slot}:${checked.view.runId}`,
        original,
        canonical,
      );
    await database.rows.put({
      id,
      revision: state.view.revision,
      current: prepared.envelope!,
      previous: original.current,
    });
  });
  changed(slot);
  return prepared.state;
}
export async function replacementBackups(slot: Slot) {
  return database.rows
    .where("id")
    .startsWith(`replaced:${slot}:`)
    .primaryKeys();
}
