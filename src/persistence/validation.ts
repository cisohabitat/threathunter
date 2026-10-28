import type { SaveEnvelope } from "./format";
import type { EngineState } from "../engine/engine";
import { markCommitted } from "./acknowledgement";

export class ValidationUnavailableError extends Error {
  constructor() {
    super(
      "Save validation is unavailable or took too long. Stored data has not been changed. Retry or export your progress.",
    );
    this.name = "ValidationUnavailableError";
  }
}
type Result = { state?: EngineState; envelope?: SaveEnvelope; text?: string };
let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<
  number,
  {
    resolve: (result: Result) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
function stop() {
  worker?.terminate();
  worker = null;
  for (const job of pending.values()) {
    clearTimeout(job.timer);
    job.reject(new ValidationUnavailableError());
  }
  pending.clear();
}
function request(
  text?: string,
  state?: EngineState,
  exportOnly = false,
): Promise<Result> {
  // Non-browser unit/authoring callers retain the same pure synchronous reader.
  if (typeof Worker === "undefined" && typeof window !== "undefined")
    return Promise.reject(new ValidationUnavailableError());
  if (typeof Worker === "undefined") {
    // Detach before awaiting module loading, as postMessage does in a browser.
    const captured = state
      ? exportOnly
        ? structuredClone(state)
        : markCommitted(state)
      : undefined;
    return import("./format").then((format) => {
      if (!captured)
        return {
          state: text === undefined ? undefined : format.importSave(text),
        };
      if (exportOnly) return { text: format.serializeSave(captured) };
      const envelope = format.exportSave(captured);
      format.importSave(JSON.stringify(envelope));
      return { state: captured, envelope };
    });
  }
  return new Promise((resolve, reject) => {
    try {
      if (!worker) {
        worker = new Worker(new URL("./validationWorker.ts", import.meta.url), {
          type: "module",
        });
        const activeWorker = worker;
        const fail = () => {
          if (worker === activeWorker) stop();
        };
        worker.onerror = fail;
        worker.onmessageerror = fail;
        worker.onmessage = (
          event: MessageEvent<{
            id: number;
            state?: EngineState;
            envelope?: SaveEnvelope;
            text?: string;
            error?: { name: string; message: string };
          }>,
        ) => {
          const job = pending.get(event.data.id);
          if (!job) return;
          clearTimeout(job.timer);
          pending.delete(event.data.id);
          if (event.data.error) {
            const error = new Error(event.data.error.message);
            error.name = event.data.error.name;
            job.reject(error);
          } else
            job.resolve({
              state: event.data.state,
              envelope: event.data.envelope,
              text: event.data.text,
            });
        };
      }
      const id = ++sequence;
      pending.set(id, { resolve, reject, timer: setTimeout(stop, 20000) });
      worker.postMessage({ id, text, state, exportOnly });
    } catch {
      stop();
      reject(new ValidationUnavailableError());
    }
  });
}
export async function prepareSaveValidation() {
  await request();
}
export async function validateSave(text: string): Promise<EngineState> {
  const { state } = await request(text);
  if (!state) throw new ValidationUnavailableError();
  return state;
}

export async function prepareCommit(state: EngineState) {
  const result = await request(undefined, state);
  if (!result.state || !result.envelope) throw new ValidationUnavailableError();
  return { state: result.state, envelope: result.envelope };
}
export async function prepareExport(state: EngineState) {
  const { text } = await request(undefined, state, true);
  if (!text) throw new ValidationUnavailableError();
  return text;
}
