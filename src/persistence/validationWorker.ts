import { importSave, exportSave, markCommitted, serializeSave } from "./format";
import type { EngineState } from "../engine/engine";

// This worker has no database or command adapter. It validates an isolated copy.
self.onmessage = (
  event: MessageEvent<{
    id: number;
    text?: string;
    state?: EngineState;
    exportOnly?: boolean;
  }>,
) => {
  const { id, text, state: input } = event.data;
  try {
    if (input && event.data.exportOnly) {
      self.postMessage({ id, text: serializeSave(input) });
    } else if (input) {
      const state = markCommitted(input);
      const envelope = exportSave(state);
      importSave(JSON.stringify(envelope));
      self.postMessage({ id, state, envelope });
    } else {
      const state = text === undefined ? undefined : importSave(text);
      self.postMessage({ id, state });
    }
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    const message =
      name === "ZodError"
        ? "This save has unsupported fields or versions."
        : error instanceof Error
          ? error.message
          : "The save could not be validated.";
    self.postMessage({ id, error: { name, message } });
  }
};
