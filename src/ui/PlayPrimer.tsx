export function PlayPrimer() {
  return (
    <aside className="play-primer" aria-label="How to play">
      <strong>
        You are the investigator. Your job is to explain what happened.
      </strong>
      <ol className="play-loop">
        <li>
          <b>Read</b> a record.
        </li>
        <li>
          <b>Check</b> an explanation.
        </li>
        <li>
          <b>Decide</b> what the evidence supports.
        </li>
      </ol>
      <p>
        Save useful records with <strong>Cite in finding</strong>. Finish in
        <strong> Case File → Review finding → Confirm and close</strong>. “Not
        enough information” is a valid conclusion. Reading does not use time.
      </p>
    </aside>
  );
}
