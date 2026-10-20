import { z } from "zod";
import { packages } from "./content";
import { commandSchema, missionIdSchema, worldSchema } from "./contracts";
import {
  acknowledge,
  canonical,
  checksum,
  createRun,
  createFreeHunt,
  replay,
  stateHash,
  type State,
} from "./engine";

const rev = z.number().int().min(0).max(20000);
const hash = z.string().regex(/^[a-f0-9]{8}$/);
const schema = z
  .object({
    kind: z.literal("threat-hunter-expansion"),
    schemaVersion: z.literal(1),
    runId: z.string().min(1).max(100),
    revision: rev,
    committedRevision: rev.nullable(),
    manifest: z
      .object({
        missionId: missionIdSchema,
        engineVersion: z.literal("expansion-1"),
        contentVersion: z.literal("1.0.0"),
        rubricVersion: z.literal("expansion-1.0.0"),
        policyVersion: z.string(),
        fixtureHash: hash,
        profileVersion: z.literal("expansion-authored-worlds-1"),
        world: worldSchema,
        mode: z.enum(["campaign", "free"]),
        profile: z.enum(["standard", "late-collection", "slow-response"]),
        generatorVersion: z.literal("causal-templates-xorshift32-1"),
        seed: z.string().min(1).max(80).nullable(),
        selectionAlgorithm: z.enum([
          "finite-authored-v1",
          "causal-templates-xorshift32-1",
        ]),
      })
      .strict(),
    commands: z.array(commandSchema).max(20000),
    snapshot: z
      .object({ throughRevision: rev, state: z.unknown(), stateHash: hash })
      .strict(),
    stateHash: hash,
    hash,
  })
  .strict();
export type Envelope = z.infer<typeof schema>;
export const MAX_BYTES = 2 * 1024 * 1024;
function atBoundary(state: State, boundary: number) {
  const checkpoint =
    boundary === state.view.revision
      ? structuredClone(state)
      : acknowledge(
          replay(
            createRun(
              state.missionId,
              state.view.runId,
              state.world,
              state.profile,
              state.seed,
            ),
            state.commands.slice(0, boundary),
          ),
          state.persistence.committedRevision === null
            ? null
            : Math.min(boundary, state.persistence.committedRevision),
        );
  const pack = packages[state.missionId];
  const data = {
    kind: "threat-hunter-expansion" as const,
    schemaVersion: 1 as const,
    runId: state.view.runId,
    revision: state.view.revision,
    committedRevision: state.persistence.committedRevision,
    manifest: {
      missionId: state.missionId,
      engineVersion: "expansion-1" as const,
      contentVersion: pack.version,
      rubricVersion: pack.rubricVersion,
      policyVersion: pack.policyVersion,
      fixtureHash: checksum(pack),
      profileVersion: "expansion-authored-worlds-1" as const,
      world: state.world,
      mode: state.mode,
      profile: state.profile,
      generatorVersion: "causal-templates-xorshift32-1" as const,
      seed: state.seed,
      selectionAlgorithm:
        state.mode === "free"
          ? ("causal-templates-xorshift32-1" as const)
          : ("finite-authored-v1" as const),
    },
    commands: structuredClone(state.commands),
    snapshot: {
      throughRevision: boundary,
      state: checkpoint,
      stateHash: stateHash(checkpoint),
    },
    stateHash: stateHash(state),
  };
  return { ...data, hash: checksum(data) };
}
export function exportSave(state: State): Envelope {
  const latest = atBoundary(state, state.view.revision);
  if (new TextEncoder().encode(JSON.stringify(latest)).length <= MAX_BYTES)
    return latest;
  const minimal = atBoundary(state, 0);
  if (new TextEncoder().encode(JSON.stringify(minimal)).length <= MAX_BYTES)
    return minimal;
  throw Error(
    "Save exceeds 2 MiB; progress has been retained without truncation.",
  );
}
export function importSave(text: string): State {
  if (new TextEncoder().encode(text).length > MAX_BYTES)
    throw Error("Save exceeds 2 MiB.");
  let depth = 0,
    quoted = false,
    escaped = false;
  for (const c of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "{" || c === "[") {
      if (++depth > 64) throw Error("Save nesting exceeds limit.");
    } else if (c === "}" || c === "]") depth--;
  }
  const parsed = JSON.parse(text, (key, value: unknown) => {
    if (["__proto__", "constructor", "prototype"].includes(key))
      throw Error("Unsafe save key");
    return value;
  });
  const result = schema.safeParse(parsed);
  if (!result.success)
    throw Error(
      "Unsupported Expansion save fields or versions. Use this mission's export file.",
    );
  const saved = result.data,
    { hash: _hash, ...data } = saved;
  if (checksum(data) !== _hash) throw Error("Save checksum does not match.");
  const pack = packages[saved.manifest.missionId];
  if (
    checksum(pack) !== saved.manifest.fixtureHash ||
    pack.policyVersion !== saved.manifest.policyVersion ||
    !pack.worlds.includes(saved.manifest.world)
  )
    throw Error(
      "Save content is incompatible; original data has not been changed.",
    );
  const boundary = saved.snapshot.throughRevision;
  if (
    saved.revision !== saved.commands.length ||
    boundary > saved.revision ||
    (saved.committedRevision !== null &&
      saved.committedRevision > saved.revision)
  )
    throw Error("Inconsistent save revision or checkpoint.");
  const m = saved.manifest;
  if (
    m.selectionAlgorithm !==
    (m.mode === "free" ? "causal-templates-xorshift32-1" : "finite-authored-v1")
  )
    throw Error("Selection algorithm/mode mismatch");
  if (
    (m.mode === "campaign" && (m.seed !== null || m.profile !== "standard")) ||
    (m.mode === "free" && m.seed === null)
  )
    throw Error("Invalid seed/profile mode");
  const initial =
    m.mode === "free"
      ? createFreeHunt(m.seed!, saved.runId)
      : createRun(pack.missionId, saved.runId, m.world);
  if (
    initial.missionId !== m.missionId ||
    initial.world !== m.world ||
    initial.profile !== m.profile
  )
    throw Error("Seed/template selection mismatch");
  const audited = acknowledge(
    replay(initial, saved.commands.slice(0, boundary)),
    saved.committedRevision === null
      ? null
      : Math.min(boundary, saved.committedRevision),
  );
  if (
    canonical(audited) !== canonical(saved.snapshot.state) ||
    stateHash(audited) !== saved.snapshot.stateHash
  )
    throw Error("Saved snapshot does not match its command history.");
  const state = acknowledge(
    replay(saved.snapshot.state as State, saved.commands.slice(boundary)),
    saved.committedRevision,
  );
  if (
    state.view.revision !== saved.revision ||
    stateHash(state) !== saved.stateHash
  )
    throw Error("Final state hash does not match.");
  return state;
}
