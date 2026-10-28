import { useEffect, type Dispatch, type SetStateAction } from "react";

// Shared P1/expansion controller effects. Lock names, read-only enforcement and
// notification scoping are supplied by each family so stored keys never change.

/** Warns before unloading while accepted progress is not yet durable. */
export function useUnloadGuard(unsaved: () => boolean) {
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (unsaved()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
    // `unsaved` reads refs at unload time; registering once is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Holds the mission's Web Lock while mounted. Without Web Locks the controller
 * stays writable (as before); a rejected request disables durable writes.
 */
export function useWriterLock(
  lockName: string,
  setReadOnly: Dispatch<SetStateAction<boolean>>,
  setWriterAvailable: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    if (!navigator.locks) {
      setReadOnly(false);
      return;
    }
    const controller = new AbortController();
    let disposed = false,
      release: (() => void) | undefined;
    navigator.locks
      .request(lockName, { signal: controller.signal }, async (lock) => {
        if (disposed || !lock) return;
        setReadOnly(false);
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      })
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
  }, [lockName, setReadOnly, setWriterAvailable]);
}

/** While read-only, reloads committed state when this mission's save changes. */
export function useCommittedRefresh<Mission extends string>(
  mission: Mission,
  active: boolean,
  subscribe: (mission: Mission, notify: () => void) => () => void,
  refresh: () => void,
) {
  useEffect(() => {
    if (!active) return;
    return subscribe(mission, refresh);
    // `subscribe`/`refresh` are stable module/setter functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission, active]);
}
