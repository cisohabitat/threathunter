// Shared browser client for the M01, P1 and expansion validation workers.
// Messages are posted immediately, so each request captures its input at call
// time. Workers answer in order; the deadline applies only to the oldest
// outstanding job and starts once every earlier job has replied, so work
// queued behind a slow inspection cannot time out (and cancel) on its behalf.
// Any failure or deadline still terminates the worker and rejects every pending
// job; the next request starts a fresh worker.
export const VALIDATION_DEADLINE_MS = 20000;

type Reply = { id: number };
type Job<Result> = {
  resolve: (result: Result) => void;
  reject: (error: Error) => void;
};

export function createWorkerClient<Result, Message extends object>(options: {
  create: () => Worker;
  unavailable: () => Error;
  /** Returns the job's result, or the error the worker reported. */
  read: (reply: Reply & Record<string, unknown>) => Result | Error;
  deadlineMs?: number;
}) {
  const deadline = options.deadlineMs ?? VALIDATION_DEADLINE_MS;
  const pending = new Map<number, Job<Result>>();
  let worker: Worker | null = null,
    sequence = 0,
    head: number | undefined,
    timer: ReturnType<typeof setTimeout> | undefined;

  function stop() {
    clearTimeout(timer);
    timer = head = undefined;
    worker?.terminate();
    worker = null;
    const jobs = [...pending.values()];
    pending.clear();
    for (const job of jobs) job.reject(options.unavailable());
  }
  // Map iteration follows insertion order, so the first key is the oldest job.
  function arm() {
    const oldest = pending.keys().next().value as number | undefined;
    if (oldest === head) return;
    clearTimeout(timer);
    head = oldest;
    timer = oldest === undefined ? undefined : setTimeout(stop, deadline);
  }

  function send(message: Message): Promise<Result> {
    return new Promise((resolve, reject) => {
      try {
        if (!worker) {
          worker = options.create();
          const owner = worker;
          const fail = () => {
            if (worker === owner) stop();
          };
          worker.onerror = fail;
          worker.onmessageerror = fail;
          worker.onmessage = (
            event: MessageEvent<Reply & Record<string, unknown>>,
          ) => {
            if (worker !== owner) return;
            const job = pending.get(event.data.id);
            if (!job) return;
            pending.delete(event.data.id);
            arm();
            const result = options.read(event.data);
            if (result instanceof Error) job.reject(result);
            else job.resolve(result);
          };
        }
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        worker.postMessage({ ...message, id });
        arm();
      } catch {
        stop();
        reject(options.unavailable());
      }
    });
  }
  return { send };
}
