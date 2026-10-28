import { useState } from "react";
import { keyOf, type Finding, type PublicRecord } from "./contracts";
import { CompareButton } from "../comparison/Comparison";
import { sourceLabel } from "./labels";
export function RecordCard({
  record,
  finding,
  busy,
  update,
}: {
  record: PublicRecord;
  finding?: Finding;
  busy?: boolean;
  update?: (finding: Finding) => Promise<void>;
}) {
  function toggle(role: "evidence" | "alternativeEvidence") {
    if (!finding || !update) return;
    const exists = finding[role].some((r) => keyOf(r) === keyOf(record.ref));
    if (!exists && finding[role].length >= 100) return;
    void update({
      ...finding,
      [role]: exists
        ? finding[role].filter((r) => keyOf(r) !== keyOf(record.ref))
        : [...finding[role], record.ref],
    });
  }
  return (
    <article className="record" aria-label={record.title}>
      <div className="record-top">
        <strong>{record.title}</strong>
        <span>{sourceLabel(record.sourceId)}</span>
      </div>
      <p>{record.text}</p>
      <small>
        {record.targetId} · collected through step {record.cutoffTick} ·
        delivered at step {record.deliveredTick} · {record.coverage} collection
      </small>
      {record.eventTick !== null ? (
        <p className="muted">
          Recorded event/catalogue step {record.eventTick}; source lineage:{" "}
          {record.lineage}.
        </p>
      ) : null}
      <CompareButton reference={record.ref} />
      {finding && update ? (
        <div className="actions">
          <button
            disabled={busy}
            aria-pressed={finding.evidence.some(
              (r) => keyOf(r) === keyOf(record.ref),
            )}
            onClick={() => toggle("evidence")}
          >
            Cite in finding · free
          </button>
          <button
            disabled={busy}
            aria-pressed={finding.alternativeEvidence.some(
              (r) => keyOf(r) === keyOf(record.ref),
            )}
            onClick={() => toggle("alternativeEvidence")}
          >
            Test another explanation · free
          </button>
        </div>
      ) : null}
    </article>
  );
}
export function Records({
  records,
  finding,
  busy,
  update,
}: {
  records: PublicRecord[];
  finding?: Finding;
  busy?: boolean;
  update?: (finding: Finding) => Promise<void>;
}) {
  const [requestedPage, setPage] = useState(0),
    last = Math.max(0, Math.ceil(records.length / 20) - 1),
    page = Math.min(requestedPage, last);
  return (
    <>
      {records.length > 20 ? (
        <nav aria-label="Observation pages">
          <p role="status">
            Observations {page * 20 + 1}–
            {Math.min((page + 1) * 20, records.length)} of {records.length}
          </p>
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            Previous observations
          </button>
          <button disabled={page === last} onClick={() => setPage(page + 1)}>
            Next observations
          </button>
        </nav>
      ) : null}
      {records.slice(page * 20, page * 20 + 20).map((r) => (
        <RecordCard
          key={keyOf(r.ref)}
          record={r}
          finding={finding}
          busy={busy}
          update={update}
        />
      ))}
    </>
  );
}
