import { useState } from "react";
import type { Learning as Data } from "./learning";
const cards = [
  ["testedAlternatives", "Tested another explanation"],
  ["scopedFindings", "Kept the finding in scope"],
  ["visibilityFindings", "Made a visibility limit useful"],
  ["provisionalHandoffs", "Made uncertainty actionable"],
] as const;
export function Learning() {
  const [value, setValue] = useState<Data | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  async function check() {
    setBusy(true);
    setError(false);
    try {
      const { loadLearning } = await import("./learning");
      setValue(await loadLearning());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" aria-label="Your investigation habits">
      <h2>Notice your investigation habits</h2>
      <p>
        Optional recognitions describe what you recorded in this game. They are
        not a personality profile, professional assessment, ranking or
        diagnosis. No streaks, daily rewards or score locks apply.
      </p>
      <button disabled={busy} onClick={() => void check()}>
        {busy
          ? "Checking local examples…"
          : "Check my local investigation examples"}
      </button>
      {error ? (
        <p role="alert">
          Local examples could not be checked. Saves remain unchanged; try again
          after validation is available.
        </p>
      ) : null}
      {value ? (
        <>
          <p role="status">
            {value.completedExamples} validated closed example(s), at most one
            per authored case.
          </p>
          {value.partial ? (
            <p>
              Some data was unavailable, invalid or outside the five-archive
              inspection limit. These are observed examples, not complete
              all-time counts.
            </p>
          ) : null}
          {value.unavailable ? (
            <p>
              Validation or storage was unavailable for part of this read. That
              does not establish corruption.
            </p>
          ) : null}
          <ul>
            {cards.map(([key, title]) => (
              <li key={key}>
                <strong>{title}</strong>: {value[key]} supported example(s).
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="muted">
        This read validates existing saves and never creates a profile database,
        changes scores, upgrades rows or sends analytics. Refresh explicitly
        after completing another case.
      </p>
    </section>
  );
}
