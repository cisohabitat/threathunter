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
  load,
  clearSave,
  downloadSave,
  importSave,
} from "../persistence/saves";
export function useGame() {
  const engine = useRef<EngineState | null>(null),
    locked = useRef(false);
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
    [temporary, setTemporary] = useState(false);
  const expose = (state: EngineState) => {
    engine.current = state;
    setView(project(state));
    setDebrief(state.debrief ? structuredClone(state.debrief) : null);
  };
  useEffect(() => {
    let active = true;
    load()
      .then((state) => {
        if (!active) return;
        if (state) expose(state);
        setStatus(state ? "Saved on this device" : "No active case");
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
  }, []);
  async function start() {
    if (locked.current || readOnly) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const id = crypto.randomUUID();
      const bytes = crypto.getRandomValues(new Uint8Array(1));
      const world = (["B", "M", "U-B", "U-M"] as const)[bytes[0] % 4];
      const state = createRun(id, world);
      expose(state);
      if (!temporary) {
        await commit(state, null);
        setStatus("Saved on this device");
      } else setStatus("Temporary session — not saved");
    } catch (e) {
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
        await commit(result.state, before.view.revision);
        setStatus("Saved on this device");
      } else setStatus("Temporary session — not saved");
    } catch (e) {
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
      await clearSave();
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
      await commit(state, null);
      expose(state);
      setStatus("Saved on this device");
      setError("");
    } catch (e) {
      setError(`Import failed: ${String(e)}`);
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
