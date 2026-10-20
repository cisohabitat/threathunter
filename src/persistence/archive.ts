import type { Table } from "dexie";
export function archiveMatches(key: string, mission: string, runId: string) {
  const base = `completed:${mission === "M01" ? "" : mission + ":"}${runId}`;
  return (
    key === base ||
    (key.startsWith(base + ":copy:") &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        key.slice(base.length + 6),
      ))
  );
}
// Call within the existing write transaction. An imported/replayed run ID may
// already have an archive; preserve both exact rows rather than overwrite one.
export async function preserveArchive<T extends { id: string }>(
  table: Table<T, string>,
  base: string,
  row: T,
  canonical: (value: unknown) => string,
) {
  const target = { ...row, id: base },
    current = await table.get(base);
  if (current && canonical(current) === canonical(target)) return base;
  const id = current ? `${base}:copy:${crypto.randomUUID()}` : base;
  await table.add({ ...row, id });
  return id;
}
