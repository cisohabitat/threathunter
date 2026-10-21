// Source identity only: appearance never depends on a finding or private truth.
const sourcePaths: Record<string, string> = {
  identity: "M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 21v-3a8 8 0 0 1 16 0v3",
  registry: "M3 4h18v12H3zM8 21h8M12 16v5",
  change_record: "M6 3h12v18H6zM9 7h6M9 11h6M9 15h4",
  application_audit: "M3 19V5M3 19h18M7 14l4-5 4 3 6-8",
  collection_status: "M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01",
  directory_callback:
    "M4 4h5l2 5-3 2a15 15 0 0 0 5 5l2-3 5 2v5C10 22 2 14 4 4z",
};
export function SourceIcon({ source }: { source: string }) {
  return (
    <svg
      className="source-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={sourcePaths[source] ?? sourcePaths.change_record} />
    </svg>
  );
}
