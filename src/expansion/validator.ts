import { acknowledge, type State } from "./engine";
import type { Envelope } from "./format";

type Result = { state?: State; envelope?: Envelope; text?: string };
let worker: Worker | null = null,
  sequence = 0;
const pending = new Map<
  number,
  {
    resolve: (value: Result) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
export class ValidatorUnavailable extends Error {
  constructor() {
    super(
      "Expansion save validation is unavailable or timed out. Stored and retained progress have not been replaced. Retry or export recovery data.",
    );
  }
}
function stop() {
  worker?.terminate();
  worker = null;
  for (const job of pending.values()) {
    clearTimeout(job.timer);
    job.reject(new ValidatorUnavailable());
  }
  pending.clear();
}
export async function request(
  op: "ready" | "import" | "commit" | "export",
  input?: string | State,
): Promise<Result> {
  if (typeof Worker === "undefined") {
    if (typeof window !== "undefined") throw new ValidatorUnavailable();
    if (op === "ready") return {};
    const captured =
      op === "import"
        ? (input as string)
        : op === "export"
          ? structuredClone(input as State)
          : acknowledge(input as State, (input as State).view.revision);
    // Tooling-only fallback: browser Worker failures reject above.
    const { exportSave, importSave } = await import("./format");
    if (op === "import") return { state: importSave(captured as string) };
    if (op === "export")
      return { text: JSON.stringify(exportSave(captured as State)) };
    const state = captured as State,
      envelope = exportSave(state);
    importSave(JSON.stringify(envelope));
    return { state, envelope };
  }
  return new Promise((resolve, reject) => {
    try {
      if (!worker) {
        worker = new Worker(new URL("./expansionWorker.ts", import.meta.url), {
          type: "module",
        });
        const owner = worker;
        const fail = () => {
          if (owner === worker) stop();
        };
        worker.onerror = fail;
        worker.onmessageerror = fail;
        worker.onmessage = (
          event: MessageEvent<Result & { id: number; error?: string }>,
        ) => {
          const job = pending.get(event.data.id);
          if (!job) return;
          clearTimeout(job.timer);
          pending.delete(event.data.id);
          if (event.data.error) job.reject(new Error(event.data.error));
          else job.resolve(event.data);
        };
      }
      const id = ++sequence;
      pending.set(id, { resolve, reject, timer: setTimeout(stop, 20000) });
      worker.postMessage({
        id,
        op,
        ...(typeof input === "string" ? { text: input } : { state: input }),
      });
    } catch {
      stop();
      reject(new ValidatorUnavailable());
    }
  });
}
