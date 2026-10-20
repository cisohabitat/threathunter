import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  choices,
  comparisonKey,
  relationship,
  type Observation,
} from "./model";

type Comparison = {
  records: Observation[];
  selected: [string, string];
  set: (slot: 0 | 1, key: string) => void;
  pin: (key: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  heading: RefObject<HTMLHeadingElement | null>;
};
const Context = createContext<Comparison | null>(null);
export function ComparisonProvider({
  records,
  children,
}: {
  records: Observation[];
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<[string, string]>(["", ""]);
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  function set(slot: 0 | 1, key: string) {
    setSelected((previous) =>
      slot === 0 ? [key, previous[1]] : [previous[0], key],
    );
  }
  function pin(key: string) {
    setSelected(([a, b]) =>
      a === key ? ["", b] : b === key ? [a, ""] : !a ? [key, b] : [a, key],
    );
    setOpen(true);
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
    });
  }
  return (
    <Context.Provider
      value={{
        records,
        selected,
        set,
        pin,
        clear: () => setSelected(["", ""]),
        open,
        setOpen,
        heading,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function CompareButton({
  reference,
}: {
  reference: { acquisitionId: string; recordId: string };
}) {
  const context = useContext(Context);
  if (
    !context ||
    !context.records.some((r) => r.key === comparisonKey(reference))
  )
    return null;
  const key = comparisonKey(reference),
    selected = context.selected.includes(key);
  return (
    <button aria-pressed={selected} onClick={() => context.pin(key)}>
      {selected
        ? "Selected for comparison · free"
        : "Compare observation · free"}
    </button>
  );
}

export function ComparisonPanel() {
  const context = useContext(Context);
  const [requestedPage, setPage] = useState(0);
  const index = useMemo(
    () => new Map(context?.records.map((r) => [r.key, r])),
    [context?.records],
  );
  if (!context) return null;
  const { records, selected } = context;
  const pair = selected.map((key) => index.get(key));
  const available = choices(records, requestedPage, selected);
  const common =
    pair[0] && pair[1]
      ? pair[0].subjects.filter((s) => pair[1]!.subjects.includes(s))
      : [];
  return (
    <section
      className="panel comparison"
      aria-label="Compare acquired observations"
    >
      <button
        aria-expanded={context.open}
        onClick={() => context.setOpen(!context.open)}
      >
        {context.open
          ? "Hide observation comparison"
          : "Compare acquired observations · free"}
      </button>
      {context.open ? (
        <>
          <h2 ref={context.heading} tabIndex={-1}>
            Compare two acquired snapshots
          </h2>
          <p>
            Reading and selecting are free. Comparing does not cite evidence,
            change your Case File or decide what happened.
          </p>
          {records.length < 2 ? (
            <p>
              Acquire another observation to compare two snapshots. No new query
              is run for you.
            </p>
          ) : null}
          {records.length > 50 ? (
            <nav aria-label="Comparison choices">
              <p>
                Choice page {available.page + 1} of {available.last + 1} · up to
                50 observations per page; selected snapshots stay available.
              </p>
              <button disabled={!available.page} onClick={() => setPage(0)}>
                First choices
              </button>
              <button
                disabled={!available.page}
                onClick={() => setPage(available.page - 1)}
              >
                Previous choices
              </button>
              <button
                disabled={available.page === available.last}
                onClick={() => setPage(available.page + 1)}
              >
                Next choices
              </button>
              <button
                disabled={available.page === available.last}
                onClick={() => setPage(available.last)}
              >
                Latest choices
              </button>
            </nav>
          ) : null}
          <div className="comparison-grid">
            {([0, 1] as const).map((slot) => (
              <label key={slot}>
                {slot === 0 ? "First observation" : "Second observation"}
                <select
                  value={pair[slot]?.key ?? ""}
                  onChange={(e) => context.set(slot, e.target.value)}
                >
                  <option value="">Choose an acquired snapshot…</option>
                  {available.records.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.title} · {r.source} · through {r.cutoff} · received{" "}
                      {r.delivered}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="actions">
            <button disabled={!selected.some(Boolean)} onClick={context.clear}>
              Clear comparison
            </button>
          </div>
          {selected.some((key, i) => key && !pair[i]) ? (
            <p>
              One selection is outside the currently shown observations. Choose
              an available snapshot; no hidden observation is displayed.
            </p>
          ) : null}
          <div className="comparison-grid">
            {pair.map((r, slot) => (
              <article
                className="comparison-record"
                key={slot}
                aria-label={
                  slot === 0
                    ? "First compared observation"
                    : "Second compared observation"
                }
              >
                <h3>{slot === 0 ? "First snapshot" : "Second snapshot"}</h3>
                {r ? (
                  <>
                    <h4>{r.title}</h4>
                    <p>{r.text}</p>
                    <dl>
                      <dt>Source</dt>
                      <dd>{r.source}</dd>
                      <dt>Recorded scope identifiers</dt>
                      <dd>
                        {r.subjects.join(" / ") ||
                          "Not specified by this record"}
                      </dd>
                      <dt>Event time</dt>
                      <dd>{r.event}</dd>
                      <dt>Snapshot cutoff</dt>
                      <dd>Through step {r.cutoff}</dd>
                      <dt>Delivered to you</dt>
                      <dd>Step {r.delivered}</dd>
                      <dt>Collection</dt>
                      <dd>{r.coverage}</dd>
                      <dt>Origin / lineage group</dt>
                      <dd>{r.lineage || "Not specified by this record"}</dd>
                    </dl>
                    {r.limits.length ? (
                      <ul aria-label="Source caveats">
                        {r.limits.map((text, i) => (
                          <li key={i}>{text}</li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <p>No snapshot selected in the current view.</p>
                )}
              </article>
            ))}
          </div>
          {pair[0] && pair[1] ? (
            <div className="comparison-relation">
              <h3>How these observations relate</h3>
              <p>{relationship(pair[0], pair[1])}</p>
              <p>
                {common.length
                  ? `Shared recorded scope: ${common.join(" / ")}. Shared scope does not identify the actor.`
                  : "No shared scope identifier is stated by both records. This does not establish that the activity is unrelated."}
              </p>
            </div>
          ) : null}
          <p className="muted">
            Event time, collection cutoff and delivery time answer different
            questions. Missing collection is not proof of inactivity. A later
            snapshot does not replace an earlier one. You decide what a
            defensible finding needs.
          </p>
        </>
      ) : null}
    </section>
  );
}
