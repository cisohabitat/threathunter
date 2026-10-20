// Retained m01-snapshot-1 reader. Keep semantics frozen for validated migration.
import { z } from "zod";
import fixture from "../content/m01.json";
import { commandSchema, type Command } from "../domain/contracts";
import {
  canonical,
  createRun,
  processCommand,
  type EngineState,
} from "./legacyEngine";

const revision = z.number().int().min(0).max(20000);
const hash = z.string().regex(/^[0-9a-f]{8}$/);
const world = z.enum(["B", "M", "U-B", "U-M"]);
const common = {
  ruleset: z.literal("4.0.0"),
  runId: z.string().min(1).max(100),
  commands: z.array(commandSchema).max(20000),
  hash,
};
const legacySchema = z
  .object({ ...common, schemaVersion: z.literal(1), world })
  .strict();
const snapshotSchema = z
  .object({
    ...common,
    schemaVersion: z.literal(2),
    manifest: z
      .object({
        missionId: z.literal("M01"),
        engineVersion: z.literal("m01-snapshot-1"),
        fixtureHash: hash,
        world,
      })
      .strict(),
    revision,
    latestCommittedRevision: revision.nullable(),
    snapshot: z
      .object({
        throughRevision: revision,
        state: z.unknown(),
        stateHash: hash,
      })
      .strict(),
    stateHash: hash,
    metadata: z
      .object({
        producer: z.literal("threat-hunter-save-v2"),
        checksum: z.literal("fnv1a32"),
      })
      .strict(),
  })
  .strict();
export type LegacySaveEnvelope = z.infer<typeof legacySchema>;
export type SnapshotSaveEnvelope = z.infer<typeof snapshotSchema>;
export type SaveEnvelope = LegacySaveEnvelope | SnapshotSaveEnvelope;

export function checksum(value: unknown) {
  let h = 2166136261;
  for (const c of canonical(value)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
const fixtureHash = checksum(fixture);

// Storage acknowledgement cannot affect investigation facts, scores or replay hashes.
export function gameplayHash(state: EngineState) {
  const copy = structuredClone(state);
  for (const entry of Object.values(copy.receipts))
    entry.receipt.durability = "memory_only";
  const { persistence: _storage, ...gameplay } = copy;
  void _storage;
  return checksum(gameplay);
}
function acknowledge(
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
function replay(state: EngineState, commands: Command[]) {
  for (const command of commands) {
    const result = processCommand(state, command);
    if (result.receipt.status !== "accepted" || result.receipt.replayed)
      throw Error("Save command history is invalid.");
    state = result.state;
  }
  return state;
}
export function exportLegacySave(state: EngineState): LegacySaveEnvelope {
  const data = {
    schemaVersion: 1 as const,
    ruleset: "4.0.0" as const,
    runId: state.view.runId,
    world: state.world,
    commands: state.commands,
  };
  return { ...data, hash: checksum(data) };
}
export function exportSave(
  state: EngineState,
  throughRevision = state.view.revision,
) {
  if (
    !Number.isInteger(throughRevision) ||
    throughRevision < 0 ||
    throughRevision > state.commands.length
  )
    throw Error("Invalid snapshot boundary.");
  const latestCommittedRevision = state.persistence.committedRevision;
  const checkpoint =
    throughRevision === state.view.revision
      ? structuredClone(state)
      : acknowledge(
          replay(
            createRun(state.view.runId, state.world),
            state.commands.slice(0, throughRevision),
          ),
          latestCommittedRevision === null
            ? null
            : Math.min(latestCommittedRevision, throughRevision),
        );
  const data = {
    schemaVersion: 2 as const,
    ruleset: "4.0.0" as const,
    runId: state.view.runId,
    manifest: {
      missionId: "M01" as const,
      engineVersion: "m01-snapshot-1" as const,
      fixtureHash,
      world: state.world,
    },
    revision: state.view.revision,
    latestCommittedRevision,
    commands: structuredClone(state.commands),
    snapshot: {
      throughRevision,
      state: checkpoint,
      stateHash: gameplayHash(checkpoint),
    },
    stateHash: gameplayHash(state),
    metadata: {
      producer: "threat-hunter-save-v2" as const,
      checksum: "fnv1a32" as const,
    },
  };
  return { ...data, hash: checksum(data) };
}
function parseJSON(text: string): unknown {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw Error("Save exceeds 2 MiB.");
  let depth = 0,
    quoted = false,
    escaped = false;
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
  return JSON.parse(text, (key, value) => {
    if (["__proto__", "constructor", "prototype"].includes(key))
      throw Error("Unsafe save key.");
    return value;
  });
}
export function importSave(text: string): EngineState {
  const saved = z
    .discriminatedUnion("schemaVersion", [legacySchema, snapshotSchema])
    .parse(parseJSON(text));
  const { hash: savedHash, ...data } = saved;
  if (checksum(data) !== savedHash)
    throw Error("Save checksum does not match.");
  if (saved.schemaVersion === 1)
    return replay(createRun(saved.runId, saved.world), saved.commands);
  if (saved.manifest.fixtureHash !== fixtureHash)
    throw Error("Save case content is incompatible with this build.");
  const boundary = saved.snapshot.throughRevision;
  if (
    saved.revision !== saved.commands.length ||
    boundary > saved.revision ||
    (saved.latestCommittedRevision !== null &&
      saved.latestCommittedRevision > saved.revision)
  )
    throw Error("Save revision or snapshot boundary is invalid.");
  // Audit the prefix independently. Exact canonical equality validates every
  // nested field and reference, including hidden facts, draft, due ticks and receipts.
  // The audited prefix is not applied again to the restored snapshot.
  const audited = acknowledge(
    replay(
      createRun(saved.runId, saved.manifest.world),
      saved.commands.slice(0, boundary),
    ),
    saved.latestCommittedRevision === null
      ? null
      : Math.min(saved.latestCommittedRevision, boundary),
  );
  if (
    canonical(saved.snapshot.state) !== canonical(audited) ||
    saved.snapshot.stateHash !== gameplayHash(audited)
  )
    throw Error("Save snapshot does not match its command history.");
  const checkpoint = structuredClone(saved.snapshot.state) as EngineState;
  const restored = acknowledge(
    replay(checkpoint, saved.commands.slice(boundary)),
    saved.latestCommittedRevision,
  );
  if (
    restored.view.revision !== saved.revision ||
    gameplayHash(restored) !== saved.stateHash
  )
    throw Error("Save gameplay-state hash does not match.");
  return restored;
}
