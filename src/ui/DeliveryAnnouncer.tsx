import { useEffect, useRef, useState } from "react";

/**
 * Politely announces newly delivered public records. Reading and navigation
 * deliver nothing, so they announce nothing. Uses `aria-live` without
 * `role="status"` so labelled save-status regions stay the only status role.
 */
export function DeliveryAnnouncer({
  runId,
  records,
}: {
  runId: string;
  records: { key: string; title: string }[];
}) {
  const known = useRef<{ runId: string; keys: Set<string> } | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const keys = new Set(records.map((record) => record.key));
    const previous = known.current;
    known.current = { runId, keys };
    // A new run or the first render establishes the baseline silently.
    if (!previous || previous.runId !== runId) {
      setMessage("");
      return;
    }
    const added = records.filter((record) => !previous.keys.has(record.key));
    if (!added.length) return;
    setMessage(
      added.length === 1
        ? `New observation: ${added[0].title}`
        : `${added.length} new observations, latest: ${added.at(-1)!.title}`,
    );
  }, [runId, records]);
  return (
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
