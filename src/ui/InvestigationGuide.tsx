import { refKey, type Action, type PlayerView } from "../domain/contracts";
import type { Screen } from "../stores/view";

export function InvestigationGuide({
  view,
  screen,
  busy,
  send,
  navigate,
}: {
  view: PlayerView;
  screen: Screen;
  busy: boolean;
  send: (action: Action) => Promise<void>;
  navigate: (screen: Screen) => void;
}) {
  const baseline = view.records.find((r) => r.ref.recordId === "EV-02");
  const hasContext = view.records.some((r) =>
    ["EV-03", "EV-04", "EV-06"].includes(r.ref.recordId),
  );
  const citedBaseline =
    baseline &&
    view.draft.evidence.some((r) => refKey(r) === refKey(baseline.ref));
  const step = !baseline ? 1 : !citedBaseline ? 2 : !hasContext ? 3 : 4;
  return (
    <section className="investigation-guide" aria-label="Guided investigation">
      <div className="guide-heading">
        <p className="eyebrow">
          MORGAN’S FIELD GUIDE ·{" "}
          {screen === "Case File" ? "YOUR FINDING" : `STEP ${step} OF 4`}
        </p>
        <span>Help is free · no score penalty</span>
      </div>
      {screen === "Case File" ? (
        <>
          <h2>Tell the story in four parts.</h2>
          <p>
            Choose what you think happened, cite the records that support it,
            explain what you still don’t know, then choose who should act next.
            You can change your mind before confirming.
          </p>
          <ol className="guide-checklist">
            <li>
              <strong>Finding:</strong> approved work, likely misuse, or
              unresolved. Confidence describes how sure you are.
            </li>
            <li>
              <strong>Evidence:</strong> tick the records you rely on. Test
              another possible explanation with a record too.
            </li>
            <li>
              <strong>Limits:</strong> choose a limitation and the record that
              shows why it matters. Leave unrelated ones empty.
            </li>
            <li>
              <strong>Next step:</strong> close this lead, recommend session
              revocation, or hand over an unresolved risk.
            </li>
          </ol>
          <p className="guide-tip">
            “Review finding” lets you check everything first. Only “Confirm and
            close case” ends the investigation.
          </p>
        </>
      ) : !baseline ? (
        <>
          <h2>You’re the investigator. Start with the unusual login.</h2>
          <p>
            Someone used a finance account at <strong>02:13</strong> from an
            unfamiliar client. It could be approved late-night work. Your job is
            to find out what the records support, then explain your decision.
          </p>
          <p>
            First, compare it with the account’s usual sign-ins. You don’t need
            to know security tools or write a query.
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              send({ kind: "ACQUIRE", queryId: "Q-H", cutoffTick: view.tick })
            }
          >
            Compare sign-ins · 1 step →
          </button>
          <p className="guide-tip">
            A step is one investigation opportunity, not a minute. There is no
            countdown while you read. You may also explore the sources in any
            order.
          </p>
        </>
      ) : !citedBaseline ? (
        <>
          <h2>Now compare unusual with usual.</h2>
          <div className="baseline-comparison">
            <article>
              <small>THIS SESSION · 02:13</small>
              <p>{view.records[0].observation}</p>
            </article>
            <article>
              <small>THE USUAL PATTERN · PREVIOUS 14 DAYS</small>
              <p>{baseline.observation}</p>
            </article>
          </div>
          <p>
            You have found a difference, not proof of an intrusion. Add these
            observations to your Case File so you can refer to them in your
            finding.
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              const refs = [view.records[0].ref, baseline.ref];
              send({
                kind: "EDIT_CASE",
                draft: {
                  ...view.draft,
                  coverageThroughTick: view.tick,
                  evidence: [
                    ...view.draft.evidence,
                    ...refs.filter(
                      (ref) =>
                        !view.draft.evidence.some(
                          (existing) => refKey(existing) === refKey(ref),
                        ),
                    ),
                  ],
                },
              });
            }}
          >
            Add these observations to Case File · free
          </button>
        </>
      ) : !hasContext ? (
        <>
          <h2>What could explain this login?</h2>
          <p>
            You choose the next check. Approved work could explain the timing;
            device registration could explain the unfamiliar client. Neither
            source tells the whole story on its own.
          </p>
          <div className="actions">
            <button
              disabled={busy}
              onClick={() =>
                send({ kind: "ACQUIRE", queryId: "Q-C", cutoffTick: view.tick })
              }
            >
              Check approved work · 1 step
            </button>
            <button
              disabled={busy}
              onClick={() =>
                send({ kind: "ACQUIRE", queryId: "Q-D", cutoffTick: view.tick })
              }
            >
              Check device registration · 1 step
            </button>
          </div>
          <p className="guide-tip">
            Or open Explore to request an owner check or follow the session’s
            activity. All routes stay available.
          </p>
        </>
      ) : (
        <>
          <h2>Read what you found. Decide what to check next.</h2>
          <p>{view.records.at(-1)?.observation}</p>
          <p>
            Does this help explain the login? What remains uncertain? In
            Explore, you can collect another source or follow what the session
            accessed. In Case File, you can start putting your finding together.
          </p>
          <div className="actions">
            <button onClick={() => navigate("Explore")}>
              Explore more evidence →
            </button>
            <button className="primary" onClick={() => navigate("Case File")}>
              Build my finding →
            </button>
          </div>
          <p className="guide-tip">
            “Unresolved” is a valid finding when you explain the missing
            information and who should follow it up. You don’t have to collect
            every record.
          </p>
        </>
      )}
      {screen === "Timeline" ? (
        <p className="guide-tip">
          Pending checks arrive as you take other actions. Advance only when you
          deliberately want to move the world forward.
        </p>
      ) : null}
    </section>
  );
}
