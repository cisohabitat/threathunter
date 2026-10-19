import { useEffect, useRef } from "react";
import { EvidenceCard } from "./EvidenceCard";
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
  const latest = view.records.at(-1)!;
  const latestHeading = useRef<HTMLHeadingElement>(null);
  const previousCount = useRef(view.records.length);
  useEffect(() => {
    if (view.records.length > previousCount.current) {
      latestHeading.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
      latestHeading.current?.focus({ preventScroll: true });
    }
    previousCount.current = view.records.length;
  }, [view.records.length]);
  return (
    <section className="panel">
      <div className="latest-evidence">
        <p className="eyebrow">Read what you found</p>
        <h2 ref={latestHeading} tabIndex={-1}>
          Latest observation
        </h2>
        <EvidenceCard
          record={latest}
          draft={view.draft}
          tick={view.tick}
          busy={busy}
          send={send}
        />
        {view.records.length > 1 ? (
          <details className="earlier-records">
            <summary>Earlier observations ({view.records.length - 1})</summary>
            {view.records
              .slice(0, -1)
              .reverse()
              .map((r) => (
                <EvidenceCard
                  key={refKey(r.ref)}
                  record={r}
                  draft={view.draft}
                  tick={view.tick}
                  busy={busy}
                  send={send}
                />
              ))}
          </details>
        ) : null}
      </div>
      <p className="eyebrow">Ask a better question</p>
      <h2>What would you check next?</h2>
      <p className="muted">
        Each new acquisition costs one step. Reading and comparing what you
        already have are free.
      </p>
      <div className="question-grid">
        {questions.map((q, i) => {
          const record = [...view.records]
            .reverse()
            .find((r) => r.ref.recordId === `EV-0${i + 2}`);
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
              {record ? <small>✓ Snapshot available above</small> : null}
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
    </section>
  );
}
