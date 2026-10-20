import { acknowledge } from "./engine";
import { exportSave, importSave } from "./format";
import type { State } from "./engine";

self.onmessage = (
  event: MessageEvent<{
    id: number;
    op: "ready" | "import" | "commit" | "export";
    text?: string;
    state?: State;
  }>,
) => {
  const { id, op, text, state } = event.data;
  try {
    if (op === "ready") self.postMessage({ id });
    else if (op === "import")
      self.postMessage({ id, state: importSave(text!) });
    else if (op === "export")
      self.postMessage({ id, text: JSON.stringify(exportSave(state!)) });
    else {
      const committed = acknowledge(state!, state!.view.revision),
        envelope = exportSave(committed);
      importSave(JSON.stringify(envelope));
      self.postMessage({ id, state: committed, envelope });
    }
  } catch (error) {
    self.postMessage({
      id,
      error:
        error instanceof Error ? error.message : "Save preparation failed.",
    });
  }
};
