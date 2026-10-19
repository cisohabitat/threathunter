import type { Action, PlayerView, QueryId } from "../domain/contracts";
import { refKey } from "../domain/contracts";
export const questions: {
  id: QueryId;
  label: string;
  source: string;
  description: string;
  static: boolean;
}[] = [
  {
    id: "Q-H",
    label: "Compare sign-in history",
    source: "Identity records",
    description: "How does this session compare with the previous 14 days?",
    static: true,
  },
  {
    id: "Q-D",
    label: "Check device registration",
    source: "Device registry",
    description: "Does the client map to an organisation-managed device?",
    static: true,
  },
  {
    id: "Q-C",
    label: "Check approved work",
    source: "Work register",
    description: "Is there a matching person, client, time window and task?",
    static: true,
  },
  {
    id: "Q-F",
    label: "Follow session activity",
    source: "Application audit",
    description:
      "What did this session try to access through the current step?",
    static: false,
  },
];
export function Workbench({
  view,
  busy,
  send,
}: {
  view: PlayerView;
  busy: boolean;
  send: (action: Action) => Promise<void>;
}) {
  return (
    <section className="panel">
      <p className="eyebrow">Ask a better question</p>
      <h2>Follow the evidence.</h2>
      <p className="muted">
        Each new acquisition costs one step. Reading and comparing what you
        already have are free.
      </p>
      <div className="question-grid">
        {questions.map((q, i) => {
          const record = view.records.find(
            (r) => r.ref.recordId === `EV-0${i + 2}`,
          );
          const cached =
            record && (q.static || record.snapshotCutoff === view.tick);
          return (
            <article className="question" key={q.id}>
              <div className="question-number">0{i + 1}</div>
              <small>{q.source} · U-01 / S-01</small>
              <h3>{q.label}</h3>
              <p>{q.description}</p>
              <button
                disabled={busy}
                onClick={() =>
                  send({
                    kind: "ACQUIRE",
                    queryId: q.id,
                    cutoffTick: view.tick,
                  })
                }
              >
                {cached
                  ? "Reopen · free"
                  : `Collect through step ${view.tick} · 1 step`}
              </button>
              {record ? <small>✓ Snapshot available below</small> : null}
            </article>
          );
        })}
      </div>
      <article className="owner-check">
        <div>
          <h3>Ask the account holder.</h3>
          <p>
            Use a verified directory callback, never the potentially compromised
            account. Submit for 1 step; result due 3 steps after request. Keep
            investigating while it is pending.
          </p>
        </div>
        <button
          disabled={
            busy || view.records.some((r) => r.ref.recordId === "EV-06")
          }
          onClick={() =>
            send({
              kind: "REQUEST_CHECK",
              check: "directory_callback",
              subjectId: "U-01",
            })
          }
        >
          {view.pendingChecks.length
            ? `Pending · due step ${view.pendingChecks[0].dueTick} · repeat free`
            : view.records.some((r) => r.ref.recordId === "EV-06")
              ? "Check delivered"
              : "Request verification · 1 step"}
        </button>
      </article>
      <h3 className="section-label">
        Collected observations · {view.records.length}
      </h3>
      <div className="record-list">
        {view.records.map((r) => (
          <article className="record" key={refKey(r.ref)}>
            <div className="record-top">
              <span>
                {r.ref.recordId} · {r.sourceId.replaceAll("_", " ")}
              </span>
              <span>
                {r.collection === "unavailable"
                  ? "Collection unavailable"
                  : "Collected record"}
              </span>
            </div>
            <p>{r.observation}</p>
            <small>
              U-01 / S-01 · collected through step {r.snapshotCutoff} ·
              delivered at step {r.deliveredTick}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
