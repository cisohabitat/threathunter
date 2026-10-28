import { useEffect, useRef, useState } from "react";
import { readinessOf, useReadinessMarks } from "../persistence/readiness";
import {
  useCommittedRefresh,
  useUnloadGuard,
  useWriterLock,
} from "../persistence/useMissionGuards";
import { packages } from "./content";
import type { Action, Debrief, View, World } from "./contracts";
import {
  createRun,
  createFreeHunt,
  processCommand,
  project,
  type State,
  type Profile,
} from "./engine";
import { request } from "./validator";
import * as storage from "./storage";

export function useExpansion(mission: storage.Slot) {
  const engine = useRef<State | null>(null),
    durable = useRef<number | null>(null),
    guard = useRef(false);
  const [view, setView] = useState<View | null>(null),
    [debrief, setDebrief] = useState<Debrief | null>(null);
  const [requestError, setRequestError] = useState("");
  const [resetKey, setResetKey] = useState(0),
    [backupIds, setBackupIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [status, setStatus] = useState("Checking this mission's local save…");
  const [readOnly, setReadOnly] = useState(true),
    [writerAvailable, setWriterAvailable] = useState(Boolean(navigator.locks));
  const [temporary, setTemporary] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [issue, setIssue] =
      useState<Awaited<ReturnType<typeof storage.inspect>>["issue"]>(null),
    [archiveIds, setArchiveIds] = useState<string[]>([]);
  const [storedAvailable, setStoredAvailable] = useState(false),
    [originalAvailable, setOriginalAvailable] = useState(false);
  const expose = (state: State) => {
    engine.current = state;
    setView(project(state));
    setDebrief(state.debrief ? structuredClone(state.debrief) : null);
  };
  useUnloadGuard(
    () =>
      Boolean(engine.current) &&
      engine.current!.view.revision !== durable.current,
  );
  useWriterLock(
    `threat-hunter-expansion-${mission}`,
    setReadOnly,
    setWriterAvailable,
  );
  useCommittedRefresh(mission, readOnly && !temporary, storage.subscribe, () =>
    setRefresh((v) => v + 1),
  );
  useEffect(() => {
    if (temporary) return;
    let alive = true;
    setBusy(true);
    storage.database.rows
      .bulkGet([`active:${mission}`, `original:${mission}`])
      .then(([stored, original]) => {
        if (alive) {
          setStoredAvailable(Boolean(stored));
          setOriginalAvailable(Boolean(original));
        }
      })
      .catch(() => {});
    storage
      .inspect(mission)
      .then((result) => {
        if (!alive) return;
        setIssue(result.issue);
        durable.current = result.state?.view.revision ?? null;
        if (result.state) expose(result.state);
        else {
          engine.current = null;
          setView(null);
          setDebrief(null);
        }
        setStatus(
          result.issue
            ? "Save needs recovery"
            : result.state
              ? "Saved on this device"
              : "No active case for this mission",
        );
        setError(
          result.issue
            ? "The stored mission cannot be resumed safely. Its original remains unchanged."
            : !writerAvailable
              ? "This browser cannot coordinate durable writes. Read/export or explicitly play temporarily."
              : "",
        );
        storage
          .replacementBackups(mission)
          .then((ids) => {
            if (alive) setBackupIds(ids);
          })
          .catch(() => {});
        storage
          .archives(mission)
          .then((ids) => {
            if (alive) setArchiveIds(ids);
          })
          .catch(() => {});
      })
      .catch((e) => {
        if (alive) {
          setError(String(e));
          setStatus("Not saved — validation or storage unavailable");
        }
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [mission, readOnly, writerAvailable, refresh, temporary]);
  function newRun(
    world?: World,
    profile: Profile = "standard",
    seed: string | null = null,
  ) {
    if (mission === "free")
      return createFreeHunt(seed ?? "recovery", crypto.randomUUID());
    const worlds = packages[mission].worlds;
    return createRun(
      mission,
      crypto.randomUUID(),
      world ??
        worlds[crypto.getRandomValues(new Uint8Array(1))[0] % worlds.length],
      profile,
      seed,
    );
  }
  async function saveRetained(state: State) {
    if (temporary) {
      setStatus("Temporary session — not saved");
      return;
    }
    setStatus("Saving…");
    const committed = await storage.commit(state, durable.current);
    durable.current = committed.view.revision;
    expose(committed);
    setStatus("Saved on this device");
    setStoredAvailable(true);
  }
  async function start(seed?: string) {
    if (mission === "free" && !seed?.trim()) {
      setError("Enter a reproducible seed before starting a free hunt.");
      return;
    }
    if (
      guard.current ||
      engine.current ||
      (!temporary && (readOnly || !writerAvailable || error))
    )
      return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      const state = newRun(
        undefined,
        "standard",
        mission === "free" ? seed! : null,
      );
      expose(state);
      await saveRetained(state);
    } catch (e) {
      setError(String(e));
      setStatus("Not saved — progress retained");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function send(action: Action): Promise<boolean> {
    if (
      guard.current ||
      !engine.current ||
      (!temporary && (readOnly || !writerAvailable || error))
    )
      return false;
    guard.current = true;
    setBusy(true);
    setError("");
    let accepted = false;
    try {
      const before = engine.current;
      const result = processCommand(before, {
        ...action,
        runId: before.view.runId,
        commandId: crypto.randomUUID(),
        expectedRevision: before.view.revision,
      });
      if (result.receipt.status !== "accepted") {
        setRequestError(
          `Request not accepted: ${result.receipt.error}. No action or time was charged.`,
        );
        return false;
      }
      setRequestError("");
      accepted = true;
      expose(result.state);
      await saveRetained(result.state);
    } catch (e) {
      setError(String(e));
      setStatus("Not saved — progress retained");
    } finally {
      guard.current = false;
      setBusy(false);
    }
    return accepted;
  }
  async function retry() {
    if (!engine.current || guard.current || readOnly || !writerAvailable)
      return;
    guard.current = true;
    setBusy(true);
    try {
      const committed = await storage.commit(engine.current, durable.current);
      expose(committed);
      durable.current = committed.view.revision;
      setTemporary(false);
      setError("");
      setStatus("Saved on this device");
    } catch (e) {
      setError(String(e));
      setStatus("Not saved — progress retained");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function restore(text: string) {
    if (
      guard.current ||
      engine.current ||
      (!temporary && Boolean(issue)) ||
      (!temporary && (readOnly || !writerAvailable))
    )
      return;
    guard.current = true;
    setBusy(true);
    try {
      const { state } = await request("import", text);
      if (!state || storage.slotOf(state) !== mission)
        throw Error(
          "This export belongs to a different mission. Select that mission first.",
        );
      expose(state);
      await saveRetained(state);
      setError("");
    } catch (e) {
      setError(String(e));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function replace(text: string) {
    const old = engine.current;
    if (
      !old ||
      guard.current ||
      temporary ||
      readOnly ||
      !writerAvailable ||
      error ||
      durable.current !== old.view.revision
    )
      return;
    guard.current = true;
    setBusy(true);
    setRequestError("");
    try {
      const { state } = await request("import", text);
      if (!state || storage.slotOf(state) !== mission)
        throw Error(
          "This backup belongs to a different mission or free-hunt slot.",
        );
      const committed = await storage.replaceImported(
        state,
        old.view.runId,
        old.view.revision,
      );
      expose(committed);
      durable.current = committed.view.revision;
      setResetKey((key) => key + 1);
      setStatus("Saved on this device");
      await storage
        .replacementBackups(mission)
        .then(setBackupIds)
        .catch(() => {});
      await storage
        .archives(mission)
        .then(setArchiveIds)
        .catch(() => {});
    } catch (e) {
      setRequestError(
        `Import failed: ${String(e)}. Your active investigation remains available.`,
      );
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function recover(previous: boolean) {
    if (!issue || guard.current || readOnly || !writerAvailable) return;
    const selected = previous ? issue.previous : newRun();
    if (!selected) return;
    guard.current = true;
    setBusy(true);
    try {
      const state = await storage.recover(mission, issue.original, selected);
      expose(state);
      durable.current = state.view.revision;
      setIssue(null);
      setOriginalAvailable(true);
      setError("");
      setStatus("Saved on this device");
    } catch (e) {
      setError(String(e));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function replay(same = true, newSeed?: string) {
    if (
      !engine.current?.debrief ||
      guard.current ||
      (!temporary && (readOnly || !writerAvailable))
    )
      return;
    guard.current = true;
    setBusy(true);
    try {
      const old = engine.current;
      const alternatives = packages[old.missionId].worlds.filter(
        (w) =>
          w !== old.world && !(w.startsWith("U") && old.world.startsWith("U")),
      );
      const fresh = same
        ? newRun(old.world, old.profile, old.seed)
        : mission === "free"
          ? newRun(undefined, "standard", newSeed ?? crypto.randomUUID())
          : newRun(
              alternatives[
                crypto.getRandomValues(new Uint8Array(1))[0] %
                  alternatives.length
              ],
            );
      if (!temporary) {
        await storage.archiveCompleted(old);
        setArchiveIds(await storage.archives(mission));
      }
      durable.current = null;
      expose(fresh);
      await saveRetained(fresh);
      setError("");
    } catch (e) {
      setError(String(e));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function download(id?: string, raw = false) {
    try {
      if (id) await storage.downloadRow(id, mission, raw);
      else if (engine.current) await storage.download(engine.current);
    } catch (e) {
      setError(String(e));
    }
  }
  const readiness = readinessOf({
    busy,
    temporary,
    error,
    writerAvailable,
    readOnly,
  });
  useReadinessMarks(mission, readiness);
  return {
    resetKey,
    backupIds,
    replace,
    view,
    debrief,
    requestError,
    dismissRequestError: () => setRequestError(""),
    busy,
    error,
    status,
    readOnly,
    writerAvailable,
    temporary,
    issue,
    archiveIds,
    durableRevision: durable.current,
    storedAvailable,
    originalAvailable,
    start,
    send,
    retry,
    restore,
    recover,
    replay,
    another: (seed?: string) => replay(false, seed),
    download,
    blocked:
      busy || (!temporary && (readOnly || !writerAvailable || Boolean(error))),
    readiness,
    playTemporarily: () => {
      setTemporary(true);
      setError("");
      setStatus("Temporary session — not saved");
    },
    reloadSaved: () => {
      setTemporary(false);
      setRefresh((v) => v + 1);
    },
    rejectOversized: () =>
      setError(
        "Import failed: Save exceeds 2 MiB. Stored data has not changed.",
      ),
  };
}
