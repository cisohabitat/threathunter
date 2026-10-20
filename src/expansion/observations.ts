import type { PublicRecord } from "./contracts";
// Summaries use the latest delivered acquisition per requested source. Earlier
// records remain immutable and fully accessible in the paged evidence list.
export function latestViews(
  records: PublicRecord[],
  sources: readonly string[],
) {
  const latest = new Map<string, { id: string; delivered: number }>();
  for (const r of records)
    if (sources.includes(r.sourceId)) {
      const before = latest.get(r.sourceId);
      if (!before || r.deliveredTick >= before.delivered)
        latest.set(r.sourceId, {
          id: r.ref.acquisitionId,
          delivered: r.deliveredTick,
        });
    }
  return records.filter(
    (r) => latest.get(r.sourceId)?.id === r.ref.acquisitionId,
  );
}
