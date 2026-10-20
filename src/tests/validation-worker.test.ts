import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
});
it("terminates an unresponsive validator and rejects queued work without accepting state", async () => {
  vi.useFakeTimers();
  const terminate = vi.fn();
  class HungWorker {
    postMessage() {}
    terminate = terminate;
  }
  vi.stubGlobal("Worker", HungWorker);
  const { validateSave, ValidationUnavailableError } =
    await import("../persistence/validation");
  const first = validateSave("{}");
  const second = validateSave("{}");
  const rejected = Promise.all([
    expect(first).rejects.toBeInstanceOf(ValidationUnavailableError),
    expect(second).rejects.toBeInstanceOf(ValidationUnavailableError),
  ]);
  await vi.advanceTimersByTimeAsync(20000);
  await rejected;
  expect(terminate).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
it("reports blocked browser workers without falling back to a synchronous audit", async () => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("Worker", undefined);
  const { prepareSaveValidation, ValidationUnavailableError } =
    await import("../persistence/validation");
  await expect(prepareSaveValidation()).rejects.toBeInstanceOf(
    ValidationUnavailableError,
  );
});

it("ignores delayed failure events from a terminated worker after retry", async () => {
  vi.useFakeTimers();
  const instances: FakeWorker[] = [];
  class FakeWorker {
    onerror = () => {};
    onmessageerror = () => {};
    onmessage: (event: { data: { id: number; state: unknown } }) => void =
      () => {};
    terminate = vi.fn();
    id = 0;
    constructor() {
      instances.push(this);
    }
    postMessage(message: { id: number }) {
      this.id = message.id;
    }
  }
  vi.stubGlobal("Worker", FakeWorker);
  const { validateSave } = await import("../persistence/validation");
  const first = validateSave("{}");
  const rejected = expect(first).rejects.toThrow("validation is unavailable");
  instances[0].onerror();
  await rejected;
  const retried = validateSave("{}");
  instances[0].onerror();
  expect(instances[1].terminate).not.toHaveBeenCalled();
  instances[1].onmessage({
    data: { id: instances[1].id, state: { validated: true } },
  });
  await expect(retried).resolves.toEqual({ validated: true });
  expect(vi.getTimerCount()).toBe(0);
});
