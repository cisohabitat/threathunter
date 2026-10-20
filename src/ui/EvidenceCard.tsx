import {
  refKey,
  type Action,
  type CaseDraft,
  type PublicRecord,
} from "../domain/contracts";
import { caveatLabels, recordTitles, sourceLabels } from "./caseLanguage";
import { CompareButton } from "../comparison/Comparison";
const contains = (refs: CaseDraft["evidence"], record: PublicRecord) =>
  refs.some((ref) => refKey(ref) === refKey(record.ref));
export function EvidenceCard({
  record,
  draft,
  tick,
  busy,
  send,
}: {
  record: PublicRecord;
  draft: CaseDraft;
  tick: number;
  busy: boolean;
  send: (action: Action) => Promise<void>;
}) {
  const cited = contains(draft.evidence, record),
    alternative = contains(draft.alternativeEvidence, record);
  const limits = draft.caveats.filter((c) => contains(c.evidence, record));
  const patch = (changes: Partial<CaseDraft>) =>
    send({
      kind: "EDIT_CASE",
      draft: { ...draft, ...changes, coverageThroughTick: tick },
    });
  const toggle = (field: "evidence" | "alternativeEvidence") =>
    patch({
      [field]: contains(draft[field], record)
        ? draft[field].filter((r) => refKey(r) !== refKey(record.ref))
        : [...draft[field], record.ref],
    });
  const toggleLimit = (code: CaseDraft["caveats"][number]["code"]) => {
    const existing = draft.caveats.find((c) => c.code === code);
    const evidence =
      existing && contains(existing.evidence, record)
        ? existing.evidence.filter((r) => refKey(r) !== refKey(record.ref))
        : [...(existing?.evidence ?? []), record.ref];
    patch({
      caveats: [
        ...draft.caveats.filter((c) => c.code !== code),
        ...(evidence.length ? [{ code, evidence }] : []),
      ],
    });
  };
  return (
    <article
      className="record evidence-card"
      aria-label={`${recordTitles[record.ref.recordId] ?? "Observation"} · through step ${record.snapshotCutoff}`}
    >
      <div className="record-top">
        <span>
          {sourceLabels[record.sourceId] ?? record.sourceId} ·{" "}
          {record.ref.recordId}
        </span>
        <span>
          {record.collection === "unavailable"
            ? "Collection unavailable"
            : "Collected observation"}
        </span>
      </div>
      <h3>{recordTitles[record.ref.recordId] ?? "Collected observation"}</h3>
      <p>{record.observation}</p>
      <small>
        U-01 / S-01 · through step {record.snapshotCutoff} · received at step{" "}
        {record.deliveredTick}
      </small>
      <div className="evidence-actions">
        <CompareButton reference={record.ref} />
        <button
          disabled={busy}
          aria-pressed={cited}
          onClick={() => toggle("evidence")}
        >
          {cited ? "✓ Cited in finding" : "Cite in finding · free"}
        </button>
        <button
          disabled={busy}
          aria-pressed={alternative}
          onClick={() => toggle("alternativeEvidence")}
        >
          {alternative
            ? "✓ Used to test alternative"
            : "Test another explanation · free"}
        </button>
      </div>
      {limits.length ? (
        <ul className="limit-chips" aria-label="Recorded limitations">
          {limits.map((c) => (
            <li key={c.code}>
              <span>{caveatLabels[c.code]}</span>
              <button
                disabled={busy}
                aria-label={`Remove limitation: ${caveatLabels[c.code]}`}
                onClick={() => toggleLimit(c.code)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <details className="record-limits">
        <summary>Note a limitation · free</summary>
        <p>
          What does this observation leave unknown? You decide which limit is
          relevant; choosing one does not certify it as correct.
        </p>
        <label>
          Add a limitation for this observation
          <select
            disabled={busy}
            value=""
            onChange={(e) => {
              if (e.target.value)
                toggleLimit(
                  e.target.value as CaseDraft["caveats"][number]["code"],
                );
            }}
          >
            <option value="">Choose a limitation…</option>
            {Object.entries(caveatLabels)
              .filter(([code]) => !limits.some((c) => c.code === code))
              .map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
          </select>
        </label>
      </details>
    </article>
  );
}
