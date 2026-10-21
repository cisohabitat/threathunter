import { SourceIcon } from "./SourceIcon";
import type { PublicRecord } from "../domain/contracts";
import { recordTitles, sourceLabels } from "./caseLanguage";

export function Observation({ record }: { record: PublicRecord }) {
  return (
    <article
      className="flow-observation"
      aria-label={`${recordTitles[record.ref.recordId]} · through step ${record.snapshotCutoff}`}
    >
      <header className="record-heading">
        <span className="source-emblem">
          <SourceIcon source={record.sourceId} />
        </span>
        <div>
          <p className="eyebrow">{recordTitles[record.ref.recordId]}</p>
          <p className="record-source">{sourceLabels[record.sourceId]}</p>
        </div>
      </header>
      <p className="record-observation">{record.observation}</p>
      <div className="record-coverage" aria-label="Record coverage">
        <span>Through step {record.snapshotCutoff}</span>
        <span>Received at step {record.deliveredTick}</span>
        <span>{record.collection} collection</span>
      </div>
      <details className="record-provenance">
        <summary>Record details</summary>
        <dl>
          <div>
            <dt>Event</dt>
            <dd>{record.eventTimeLabel}</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>{record.subjectIds.join(" · ")}</dd>
          </div>
          <div>
            <dt>Source lineage</dt>
            <dd>{record.lineageGroup}</dd>
          </div>
        </dl>
      </details>
      {record.caveats.length ? (
        <ul>
          {record.caveats.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
