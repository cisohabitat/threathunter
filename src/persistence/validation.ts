import type { SaveEnvelope } from "./format";
import type { EngineState } from "../engine/engine";
import { markCommitted } from "./acknowledgement";
import { createWorkerClient } from "./workerClient";

export class ValidationUnavailableError extends Error {
  constructor() {
    super(
      "Save validation is unavailable or took too long. Stored data has not been changed. Retry or export your progress.",
    );
    this.name = "ValidationUnavailableError";
  }
}
type Result = { state?: EngineState; envelope?: SaveEnvelope; text?: string };
const client = createWorkerClient<
  Result,
  { text?: string; state?: EngineState; exportOnly: boolean }
>({
  create: () =>
    new Worker(new URL("./validationWorker.ts", import.meta.url), {
      type: "module",
    }),
  unavailable: () => new ValidationUnavailableError(),
  read: (reply) => {
    const failure = reply.error as
      { name: string; message: string } | undefined;
    if (failure) {
      const error = new Error(failure.message);
      error.name = failure.name;
      return error;
    }
    return {
      state: reply.state as EngineState | undefined,
      envelope: reply.envelope as SaveEnvelope | undefined,
      text: reply.text as string | undefined,
    };
  },
});
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
  return client.send({ text, state, exportOnly });
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
