import { useEffect, useRef, useState } from "react";
import {
  createRun,
  processCommand,
  project,
  type EngineState,
} from "../engine/engine";
import type { Action, Debrief, PlayerView } from "../domain/contracts";
import {
  commit,
  inspectSave,
  resolveRecovery,
  downloadStoredSave,
  type SaveInspection,
  clearSave,
  downloadSave,
  importSave,
} from "../persistence/saves";
export function useGame() {
  const engine = useRef<EngineState | null>(null),
    locked = useRef(false),
    durableRevision = useRef<number | null>(null);
  const [readOnly, setReadOnly] = useState(true);
  useEffect(() => {
    if (!navigator.locks) {
      setReadOnly(false);
      return;
    }
    const controller = new AbortController();
    let disposed = false;
    let release: (() => void) | undefined;
    navigator.locks
      .request(
        "threat-hunter-active-writer",
        { signal: controller.signal },
        async (lock) => {
          if (disposed) return;
          if (!lock) {
            setReadOnly(true);
            return;
          }
          setReadOnly(false);
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        },
      )
      .catch(() => {
        if (!disposed) setReadOnly(true);
      });
    return () => {
      disposed = true;
      controller.abort();
      release?.();
    };
  }, []);
  const [view, setView] = useState<PlayerView | null>(null),
    [debrief, setDebrief] = useState<Debrief | null>(null),
    [busy, setBusy] = useState(true),
    [status, setStatus] = useState("Checking local save…"),
    [error, setError] = useState(""),
    [temporary, setTemporary] = useState(false),
    [recovery, setRecovery] = useState<SaveInspection["issue"]>(null),
    [archived, setArchived] = useState(false),
    [canRetry, setCanRetry] = useState(false);
  const expose = (state: EngineState) => {
    engine.current = state;
    setView(project(state));
    setDebrief(state.debrief ? structuredClone(state.debrief) : null);
  };
  useEffect(() => {
    let active = true;
    setBusy(true);
    inspectSave()
      .then(({ state, issue, archived }) => {
        if (!active) return;
        setRecovery(issue);
        setArchived(archived);
        durableRevision.current = state?.view.revision ?? null;
        if (state) expose(state);
        else {
          engine.current = null;
          setView(null);
          setDebrief(null);
        }
        setStatus(
          issue
            ? "Save needs recovery"
            : state
              ? "Saved on this device"
              : "No active case",
        );
        setError(
          issue
            ? "The current save is damaged or incompatible. Your stored data has not been changed."
            : "",
        );
      })
      .catch(() => {
        if (active) {
          setStatus("Not saved — device storage unavailable");
          setError("Use a temporary session or export progress.");
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [readOnly]);
  async function start() {
    if (locked.current || readOnly || (!temporary && error) || engine.current)
      return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      durableRevision.current = null;
      const id = crypto.randomUUID();
      const bytes = crypto.getRandomValues(new Uint8Array(1));
      const world = (["B", "M", "U-B", "U-M"] as const)[bytes[0] % 4];
      const state = createRun(id, world);
      expose(state);
      if (!temporary) {
        await commit(state, null);
        durableRevision.current = state.view.revision;
        setCanRetry(false);
        setStatus("Saved on this device");
      } else setStatus("Temporary session — not saved");
    } catch (e) {
      setCanRetry(true);
      setStatus("Not saved");
      setError(String(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function send(action: Action) {
    if (locked.current || readOnly || (!temporary && error) || !engine.current)
      return;
    locked.current = true;
    setBusy(true);
    setError("");
    const before = engine.current;
    const command = {
      ...action,
      runId: before.view.runId,
      expectedRevision: before.view.revision,
      commandId: crypto.randomUUID(),
    };
    try {
      const result = processCommand(before, command);
      if (result.receipt.status === "rejected")
        throw Error(result.receipt.errorCode);
      expose(result.state);
      setStatus("Saving…");
      if (!temporary) {
        await commit(result.state, durableRevision.current);
        durableRevision.current = result.state.view.revision;
        setCanRetry(false);
        setStatus("Saved on this device");
      } else setStatus("Temporary session — not saved");
    } catch (e) {
      setCanRetry(engine.current?.view.revision !== durableRevision.current);
      setStatus("Not saved");
      setError(String(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function restart() {
    if (locked.current || readOnly) return;
    locked.current = true;
    setBusy(true);
    try {
      if (!temporary) await clearSave();
      durableRevision.current = null;
      setCanRetry(false);
      engine.current = null;
      setView(null);
      setDebrief(null);
      setStatus("No active case");
      setError("");
    } catch (e) {
      setError(String(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function restore(text: string) {
    if (locked.current || readOnly) return;
    locked.current = true;
    setBusy(true);
    try {
      const state = importSave(text);
      if (engine.current)
        throw Error(
          "Export and finish the current case before importing another.",
        );
      if (!temporary) await commit(state, null);
      durableRevision.current = temporary ? null : state.view.revision;
      expose(state);
      setStatus(
        temporary ? "Temporary session — not saved" : "Saved on this device",
      );
      setError("");
    } catch (e) {
      setError(`Import failed: ${String(e)}`);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function retrySave() {
    if (locked.current || readOnly || !engine.current || recovery) return;
    locked.current = true;
    setBusy(true);
    try {
      await commit(engine.current, durableRevision.current);
      durableRevision.current = engine.current.view.revision;
      setCanRetry(false);
      setTemporary(false);
      setError("");
      setStatus("Saved on this device");
    } catch (e) {
      setStatus("Not saved");
      setError(String(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function recover(choice: "previous" | "restart") {
    if (locked.current || readOnly || !recovery || engine.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const state = await resolveRecovery(recovery.original, choice);
      setRecovery(null);
      setArchived(true);
      setError("");
      setTemporary(false);
      durableRevision.current = state?.view.revision ?? null;
      if (state) expose(state);
      setStatus(state ? "Saved on this device" : "No active case");
    } catch (e) {
      setError(String(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    view,
    debrief,
    busy,
    readOnly,
    status,
    error,
    temporary,
    recovery: recovery
      ? { previousStep: recovery.previous?.view.tick ?? null }
      : null,
    archived,
    canRetry,
    retrySave,
    recover,
    exportOriginal: async () => {
      try {
        await downloadStoredSave(recovery?.original);
      } catch (e) {
        setError(String(e));
      }
    },
    durableRevision: durableRevision.current,
    start,
    send,
    restart,
    restore,
    export: () => {
      if (engine.current) downloadSave(engine.current);
    },
    enableTemporary: () => {
      setTemporary(true);
      setStatus("Temporary session — not saved");
      setError("");
    },
  };
}
