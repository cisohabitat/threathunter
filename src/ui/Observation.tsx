import type { PublicRecord } from "../domain/contracts";
import { recordTitles, sourceLabels } from "./caseLanguage";

export function Observation({ record }: { record: PublicRecord }) {
  return (
    <article
      className="flow-observation"
      aria-label={`${recordTitles[record.ref.recordId]} · through step ${record.snapshotCutoff}`}
    >
      <p className="eyebrow">{recordTitles[record.ref.recordId]}</p>
      <p>{record.observation}</p>
      <small>
        {sourceLabels[record.sourceId]} · {record.eventTimeLabel} · collected
        through step {record.snapshotCutoff} · received at step{" "}
        {record.deliveredTick} · {record.collection} collection
      </small>
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
