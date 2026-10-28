import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWorkerClient,
  VALIDATION_DEADLINE_MS,
} from "../persistence/workerClient";

class FakeWorker {
  static created: FakeWorker[] = [];
  posted: { id: number; value: number }[] = [];
  terminated = false;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  constructor() {
    FakeWorker.created.push(this);
  }
  postMessage(message: { id: number; value: number }) {
    this.posted.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(id: number, data: Record<string, unknown> = {}) {
    this.onmessage?.({ data: { id, ...data } } as MessageEvent);
  }
}
class Unavailable extends Error {}
const client = () =>
  createWorkerClient<number, { value: number }>({
    create: () => new FakeWorker() as unknown as Worker,
    unavailable: () => new Unavailable(),
    read: (reply) =>
      typeof reply.error === "string"
        ? new Error(reply.error)
        : (reply.value as number),
  });

describe("validation worker client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWorker.created = [];
  });
  afterEach(() => vi.useRealTimers());

  it("posts every request immediately so input is captured at call time", () => {
    const { send } = client();
    void send({ value: 1 });
    void send({ value: 2 });
    expect(FakeWorker.created).toHaveLength(1);
    expect(FakeWorker.created[0].posted.map((m) => m.value)).toEqual([1, 2]);
  });

  it("starts a queued job's deadline only when earlier jobs have replied", async () => {
    const { send } = client();
    const first = send({ value: 1 });
    const second = send({ value: 2 });
    const worker = FakeWorker.created[0];
    // The first job takes almost the whole deadline.
    vi.advanceTimersByTime(VALIDATION_DEADLINE_MS - 1);
    worker.reply(1, { value: 10 });
    await expect(first).resolves.toBe(10);
    // The second job now has its own full deadline.
    vi.advanceTimersByTime(VALIDATION_DEADLINE_MS - 1);
    worker.reply(2, { value: 20 });
    await expect(second).resolves.toBe(20);
    expect(worker.terminated).toBe(false);
  });

  it("an overdue oldest job terminates the worker and rejects every pending job", async () => {
    const { send } = client();
    const first = send({ value: 1 });
    const second = send({ value: 2 });
    vi.advanceTimersByTime(VALIDATION_DEADLINE_MS);
    await expect(first).rejects.toBeInstanceOf(Unavailable);
    await expect(second).rejects.toBeInstanceOf(Unavailable);
    expect(FakeWorker.created[0].terminated).toBe(true);
    // Retrying uses a fresh worker.
    const retry = send({ value: 3 });
    expect(FakeWorker.created).toHaveLength(2);
    FakeWorker.created[1].reply(3, { value: 30 });
    await expect(retry).resolves.toBe(30);
  });

  it("a reported error rejects only its own job", async () => {
    const { send } = client();
    const first = send({ value: 1 });
    const second = send({ value: 2 });
    const worker = FakeWorker.created[0];
    worker.reply(1, { error: "invalid save" });
    worker.reply(2, { value: 20 });
    await expect(first).rejects.toThrow("invalid save");
    await expect(second).resolves.toBe(20);
    expect(worker.terminated).toBe(false);
  });

  it("a worker error rejects pending jobs and ignores late replies", async () => {
    const { send } = client();
    const first = send({ value: 1 });
    const worker = FakeWorker.created[0];
    worker.onerror?.();
    await expect(first).rejects.toBeInstanceOf(Unavailable);
    expect(worker.terminated).toBe(true);
    const next = send({ value: 2 });
    worker.reply(1, { value: 10 });
    FakeWorker.created[1].reply(2, { value: 20 });
    await expect(next).resolves.toBe(20);
  });
});
