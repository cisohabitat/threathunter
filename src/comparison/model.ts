import type { PublicRecord as M01Record } from "../domain/contracts";
import type { PublicRecord as P1Record } from "../campaign/contracts";
import { recordTitles, sourceLabels } from "../ui/caseLanguage";

export const comparisonKey = (ref: {
  acquisitionId: string;
  recordId: string;
}) => JSON.stringify([ref.acquisitionId, ref.recordId]);
export type Observation = {
  key: string;
  title: string;
  text: string;
  source: string;
  lineage: string;
  subjects: string[];
  event: string;
  cutoff: number;
  delivered: number;
  coverage: string;
  limits: string[];
};
export const fromM01 = (records: M01Record[]): Observation[] =>
  records.map((r) => ({
    key: comparisonKey(r.ref),
    title: recordTitles[r.ref.recordId] ?? "Collected observation",
    text: r.observation,
    source: sourceLabels[r.sourceId] ?? r.sourceId,
    lineage: r.lineageGroup,
    subjects: [...r.subjectIds],
    event:
      r.eventTimeLabel +
      (r.eventTick === null ? "" : ` · event step ${r.eventTick}`),
    cutoff: r.snapshotCutoff,
    delivered: r.deliveredTick,
    coverage: r.collection,
    limits: [...r.caveats],
  }));
export const fromP1 = (records: P1Record[]): Observation[] =>
  records.map((r) => ({
    key: comparisonKey(r.ref),
    title: r.title,
    text: r.text,
    source: r.sourceId.replaceAll("_", " "),
    lineage: r.lineage,
    subjects: [
      ...new Set(
        [
          r.targetId === "all" ? "" : r.targetId,
          r.relationship?.account,
          r.relationship?.host,
        ].filter((s): s is string => Boolean(s)),
      ),
    ],
    event:
      r.eventTick === null
        ? "No event step specified by this record"
        : `Event/catalogue step ${r.eventTick}`,
    cutoff: r.cutoffTick,
    delivered: r.deliveredTick,
    coverage: r.coverage,
    limits: [],
  }));
export function relationship(a: Observation, b: Observation) {
  if (a.key === b.key)
    return "The same acquired observation is selected twice. This is not a second acquisition.";
  if (a.lineage && a.lineage === b.lineage)
    return "Shared lineage. These records name the same origin group. They may be different snapshots or views of related activity; compare the proposition and time bounds rather than counting cards.";
  if (a.source === b.source)
    return "Same source, different lineage labels. They may describe different propositions, but source and lineage labels alone do not establish independent corroboration.";
  return "Different source and lineage labels. Check what each source can observe. Different labels alone establish neither independent corroboration nor a sufficient finding.";
}

export function choices(
  records: Observation[],
  page: number,
  selected: string[],
) {
  const last = Math.max(0, Math.ceil(records.length / 50) - 1);
  const current = Math.min(Math.max(0, page), last);
  const batch = records.slice(current * 50, current * 50 + 50);
  const extras = records.filter(
    (r) => selected.includes(r.key) && !batch.some((b) => b.key === r.key),
  );
  return { page: current, last, records: [...batch, ...extras] };
}
