import { useState } from "react";

const PAGE_SIZE = 50;
export function HistoryTimeline({
  items,
  page: controlledPage,
  onPageChange,
}: {
  items: readonly { tick: number; text: string }[];
  page?: number;
  onPageChange?: (page: number) => void;
}) {
  const [localPage, setLocalPage] = useState(0);
  const last = Math.max(0, Math.ceil(items.length / PAGE_SIZE) - 1);
  const page = Math.min(controlledPage ?? localPage, last);
  const start = page * PAGE_SIZE;
  function change(next: number) {
    if (onPageChange) onPageChange(next);
    else setLocalPage(next);
  }
  return (
    <>
      {items.length > PAGE_SIZE ? (
        <nav aria-label="Timeline pages" className="timeline-pages">
          <p role="status">
            Actions {start + 1}–{Math.min(start + PAGE_SIZE, items.length)} of{" "}
            {items.length}
          </p>
          <div className="feedback-links">
            <button disabled={page === 0} onClick={() => change(0)}>
              First actions
            </button>
            <button disabled={page === 0} onClick={() => change(page - 1)}>
              Previous actions
            </button>
            <button disabled={page === last} onClick={() => change(page + 1)}>
              Next actions
            </button>
            <button disabled={page === last} onClick={() => change(last)}>
              Latest actions
            </button>
          </div>
        </nav>
      ) : null}
      <ol className="timeline" start={start + 1}>
        {items.slice(start, start + PAGE_SIZE).map((item, index) => (
          <li key={start + index}>
            <strong>{item.tick.toString().padStart(2, "0")}</strong>
            <p>{item.text}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
