import { acknowledge, type State } from "./engine";
import type { Envelope } from "./format";
import { createWorkerClient } from "../persistence/workerClient";

type Result = { state?: State; envelope?: Envelope; text?: string };
export class ValidatorUnavailable extends Error {
  constructor() {
    super(
      "P1 save validation is unavailable or timed out. Stored and retained progress have not been replaced. Retry or export recovery data.",
    );
  }
}
const client = createWorkerClient<
  Result,
  { op: "ready" | "import" | "commit" | "export"; text?: string; state?: State }
>({
  create: () =>
    new Worker(new URL("./p1Worker.ts", import.meta.url), {
      type: "module",
    }),
  unavailable: () => new ValidatorUnavailable(),
  read: (reply) =>
    typeof reply.error === "string"
      ? new Error(reply.error)
      : (reply as unknown as Result),
});
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
  return client.send({
    op,
    ...(typeof input === "string" ? { text: input } : { state: input }),
  });
}
