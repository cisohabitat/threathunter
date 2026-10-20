import { useEffect, useRef, useState } from "react";
import {
  caseDetails,
  caseOrder,
  nextCase,
  type CaseId,
  type Progress,
} from "./contracts";

export function Journey({
  open,
  ready = true,
}: {
  open: (id: CaseId) => void;
  ready?: boolean;
}) {
  const [progress, setProgress] = useState<Progress[] | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const generation = useRef(0),
    alive = useRef(true),
    changed = useRef(0);
  useEffect(() => {
    alive.current = true;
    const dirty = () => {
      changed.current++;
      setStale(true);
    };
    const channels: BroadcastChannel[] = [];
    for (const name of [
      "threat-hunter-save-changes",
      "threat-hunter-campaign-changes",
    ]) {
      try {
        const channel = new BroadcastChannel(name);
        channel.onmessage = dirty;
        channels.push(channel);
      } catch {
        /* Explicit refresh remains available. */
      }
    }
    return () => {
      alive.current = false;
      channels.forEach((c) => c.close());
    };
  }, []);
  async function refresh() {
    const token = ++generation.current,
      before = changed.current;
    setBusy(true);
    setError("");
    try {
      const { loadProgress } = await import("./load");
      const snapshot = await loadProgress();
      if (alive.current && token === generation.current) {
        setProgress(snapshot);
        setStale(before !== changed.current);
      }
    } catch {
      if (alive.current && token === generation.current)
        setError(
          "Saved progress could not be checked. Open a case to inspect or recover it; existing saves are retained.",
        );
    } finally {
      if (alive.current && token === generation.current) setBusy(false);
    }
  }
  const next = progress && !stale ? nextCase(progress) : undefined;
  return (
    <section className="panel journey" aria-label="Your investigation journey">
      <p className="eyebrow">YOUR INVESTIGATION JOURNEY</p>
      <h2>Three cases. A new question each time.</h2>
      <p>
        Recommended order: M01 → M04 → M07. Continue by completing a case, at
        any score. All three cases remain available if you prefer another order.
      </p>
      <button disabled={busy || !ready} onClick={() => void refresh()}>
        {!ready
          ? "Waiting for the current save operation to finish."
          : busy
            ? "Checking saved progress…"
            : progress
              ? "Refresh saved progress"
              : "Check saved progress"}
      </button>
      <p role="status">
        {busy
          ? "Reading and validating local saves; no case is being changed."
          : !progress
            ? "Progress has not been checked in this view."
            : stale
              ? "Saved progress may have changed. Refresh before relying on this snapshot."
              : `${progress.filter((p) => p.completed).length} of 3 cases have a validated saved completion.`}
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {next === null ? (
        <p>
          You have completed all three cases. Revisit a debrief or replay a case
          with a different investigation route.
        </p>
      ) : next ? (
        <p>
          Recommended next:{" "}
          <strong>
            {next} · {caseDetails[next].title}
          </strong>
          .{" "}
          {progress?.find((p) => p.mission === next)?.active ===
          "needs_recovery"
            ? "Open it to inspect recovery choices first."
            : "Your score does not gate this case."}
        </p>
      ) : null}
      <ol className="journey-cases">
        {caseOrder.map((id) => {
          const p = progress?.find((item) => item.mission === id);
          return (
            <li key={id}>
              <h3>
                {id} · {caseDetails[id].title}
              </h3>
              <p>{caseDetails[id].lesson}</p>
              {p ? (
                <>
                  <p>
                    {p.completed
                      ? p.archivedCompletion
                        ? "Completed case preserved in an archive."
                        : "Closed finding saved on this device."
                      : p.active === "open"
                        ? "An investigation is saved in progress."
                        : p.active === "none" && p.archiveCheck === "complete"
                          ? "No saved completion found."
                          : "Completion could not be fully established."}
                  </p>
                  {p.active === "needs_recovery" ? (
                    <p>
                      Active save needs recovery. Open the case to inspect the
                      retained original.
                    </p>
                  ) : p.active === "unavailable" ? (
                    <p>
                      Active-save validation or storage is unavailable; this
                      does not establish corruption.
                    </p>
                  ) : null}
                  {p.archiveCheck !== "complete" ? (
                    <p>
                      Archive check{" "}
                      {p.archiveCheck === "partial"
                        ? "incomplete (at most five entries checked)"
                        : "unavailable"}
                      . No archive was repaired or removed.
                    </p>
                  ) : null}
                </>
              ) : (
                <p>Saved progress not checked.</p>
              )}
              <button disabled={!ready} onClick={() => open(id)}>
                Open {id} investigation
              </button>
            </li>
          );
        })}
      </ol>
      <p className="muted">
        This overview checks saved cases only. Temporary or unsaved work stays
        in its current tab. Refresh after saving or importing; opening a case
        does not erase another investigation.
      </p>
    </section>
  );
}

export function ContinueJourney({
  mission,
  open,
  saved,
}: {
  mission: CaseId;
  open: (id: CaseId) => void;
  saved: boolean;
}) {
  const next = caseOrder[caseOrder.indexOf(mission) + 1];
  return (
    <section className="panel" aria-label="Continue your investigation journey">
      <h2>
        {next ? "A new question awaits" : "Three ways to investigate Northstar"}
      </h2>
      <p>
        {next
          ? "Case completion, not a score threshold, is enough to continue. You can keep reading this debrief or open the next investigation."
          : "You can revisit the earlier cases or try another approach here. There is no required score, streak or daily reward."}
      </p>
      {!saved ? (
        <p>
          This finding is not yet confirmed saved on this device. Export it
          before leaving this tab; switching cases keeps the loaded
          investigation mounted.
        </p>
      ) : (
        <p>Your saved finding stays available when you switch cases.</p>
      )}
      {next ? (
        <button onClick={() => open(next)}>
          Continue to {next} · {caseDetails[next].title}
        </button>
      ) : (
        <button onClick={() => open("M01")}>
          Revisit M01 · The Midnight Login
        </button>
      )}
    </section>
  );
}
