import { useEffect, useRef, useState } from "react";
import { packages } from "./content";
import type { Action, Debrief, MissionId, View, World } from "./contracts";
import { createRun, processCommand, project, type State } from "./engine";
import { request } from "./validator";
import * as storage from "./storage";

export function useCampaign(mission: MissionId) {
  const engine = useRef<State | null>(null),
    durable = useRef<number | null>(null),
    guard = useRef(false);
  const [view, setView] = useState<View | null>(null),
    [debrief, setDebrief] = useState<Debrief | null>(null);
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
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (engine.current && engine.current.view.revision !== durable.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    if (!navigator.locks) {
      setReadOnly(false);
      return;
    }
    const controller = new AbortController();
    let disposed = false,
      release: (() => void) | undefined;
    navigator.locks
      .request(
        `threat-hunter-campaign-${mission}`,
        { signal: controller.signal },
        async (lock) => {
          if (disposed || !lock) return;
          setReadOnly(false);
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        },
      )
      .catch(() => {
        if (!disposed) {
          setWriterAvailable(false);
          setReadOnly(false);
        }
      });
    return () => {
      disposed = true;
      controller.abort();
      release?.();
    };
  }, [mission]);
  useEffect(() => {
    if (!readOnly || temporary) return;
    return storage.subscribe(() => setRefresh((v) => v + 1));
  }, [readOnly, temporary]);
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
  function newRun(world?: World) {
    const worlds = packages[mission].worlds;
    return createRun(
      mission,
      crypto.randomUUID(),
      world ??
        worlds[crypto.getRandomValues(new Uint8Array(1))[0] % worlds.length],
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
  async function start() {
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
      const state = newRun();
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
  async function send(action: Action) {
    if (
      guard.current ||
      !engine.current ||
      (!temporary && (readOnly || !writerAvailable || error))
    )
      return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      const before = engine.current;
      const result = processCommand(before, {
        ...action,
        runId: before.view.runId,
        commandId: crypto.randomUUID(),
        expectedRevision: before.view.revision,
      });
      if (result.receipt.status !== "accepted")
        throw Error(result.receipt.error);
      expose(result.state);
      await saveRetained(result.state);
    } catch (e) {
      setError(String(e));
      setStatus("Not saved — progress retained");
    } finally {
      guard.current = false;
      setBusy(false);
    }
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
      (!temporary && (readOnly || !writerAvailable))
    )
      return;
    guard.current = true;
    setBusy(true);
    try {
      const { state } = await request("import", text);
      if (!state || state.missionId !== mission)
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
  async function replay() {
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
      if (!temporary) {
        await storage.archiveCompleted(old);
        setArchiveIds(await storage.archives(mission));
      }
      const fresh = newRun(old.world);
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
  return {
    view,
    debrief,
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
    download,
    blocked:
      busy || (!temporary && (readOnly || !writerAvailable || Boolean(error))),
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
