import { useEffect, useRef, useState } from "react";
import {
  learningGroup,
  caseDetails,
  caseOrder,
  nextCase,
  canOpenCase,
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
  const [expanded, setExpanded] = useState(false);
  const [independentOrder, setIndependentOrder] = useState(false);
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
      "threat-hunter-expansion-changes",
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
      <h2>Twelve cases. A new question each time.</h2>
      <p>
        Start with M01 → M04 → M07, then investigate priority, identity, scope,
        authority and competing causal explanations. Later cases unlock through
        completion at any score. You can also choose independent case order.
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
              : `${progress.filter((p) => p.completed).length} of ${caseOrder.length} cases have a validated saved completion.`}
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {next === null ? (
        <p>
          You have completed all twelve authored cases. Revisit a debrief or
          replay a case with a different investigation route.
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
      <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded
          ? "Show the introductory path"
          : "Show all twelve authored cases"}
      </button>
      <button
        aria-pressed={independentOrder}
        onClick={() => {
          setIndependentOrder(!independentOrder);
          setExpanded(true);
        }}
      >
        {independentOrder
          ? "Use the completion-based path"
          : "Choose independent case order"}
      </button>
      {independentOrder ? (
        <p>
          Independent order changes navigation. Facts, action costs and scoring
          remain the same.
        </p>
      ) : null}
      <ol className="journey-cases">
        {caseOrder
          .filter((id, i) => expanded || i < 3 || id === next)
          .map((id) => {
            const p = progress?.find((item) => item.mission === id);
            return (
              <li key={id}>
                <p className="eyebrow">{learningGroup(id)}</p>
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
                <button
                  disabled={
                    !ready ||
                    !canOpenCase(id, stale ? null : progress, independentOrder)
                  }
                  onClick={() => open(id)}
                >
                  Open {id} investigation
                </button>
                {!canOpenCase(id, stale ? null : progress, independentOrder) ? (
                  <p>
                    Complete the preceding case and refresh saved progress, or
                    choose independent order. A score threshold is never
                    required.
                  </p>
                ) : null}
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
        {next
          ? "A new question awaits"
          : "Twelve ways to investigate Northstar"}
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
