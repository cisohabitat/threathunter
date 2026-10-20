import { useEffect, useRef } from "react";
import {
  refKey,
  type Action,
  type PlayerView,
  type PublicRecord,
} from "../domain/contracts";
import type { Screen } from "../stores/view";
import { nextMove } from "./onboarding";
import { recordTitles, sourceLabels } from "./caseLanguage";

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
  const { stage, lead, baseline, context, comparison } = nextMove(view);
  const section = useRef<HTMLElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    previous = useRef(stage);
  useEffect(() => {
    if (previous.current !== stage && screen !== "Case File") {
      section.current?.scrollIntoView({ block: "start", behavior: "instant" });
      heading.current?.focus({ preventScroll: true });
    }
    previous.current = stage;
  }, [stage, screen]);
  function save(records: PublicRecord[]) {
    void send({
      kind: "EDIT_CASE",
      draft: {
        ...view.draft,
        coverageThroughTick: view.tick,
        evidence: [
          ...view.draft.evidence,
          ...records
            .map((record) => record.ref)
            .filter(
              (ref) =>
                !view.draft.evidence.some(
                  (existing) => refKey(existing) === refKey(ref),
                ),
            ),
        ],
      },
    });
  }
  const phase =
    stage === "compare" || stage === "save-comparison"
      ? 0
      : stage === "check" || stage === "save-check"
        ? 1
        : 2;
  return (
    <section
      ref={section}
      className="investigation-guide"
      aria-label="Guided investigation"
    >
      <ol className="guide-route" aria-label="Investigation path">
        {["Compare", "Check", "Make your call"].map((label, index) => (
          <li
            key={label}
            aria-current={
              (screen === "Case File" ? 2 : phase) === index
                ? "step"
                : undefined
            }
          >
            <span>{index + 1}</span> {label}
          </li>
        ))}
      </ol>
      {screen === "Case File" ? (
        <>
          <h2 ref={heading} tabIndex={-1}>
            Tell the story in four parts.
          </h2>
          <p>
            Choose what you think happened. Use the four tabs below to check
            your evidence, explain any uncertainty and choose a next action.{" "}
            <strong>Review finding</strong> lets you check your report before{" "}
            <strong>Confirm and close case</strong> ends it.
          </p>
        </>
      ) : stage === "compare" ? (
        <>
          <p className="eyebrow">YOUR NEXT MOVE · COMPARE</p>
          <h2 ref={heading} tabIndex={-1}>
            Why did someone sign in at 02:13?
          </h2>
          <p>Compare this login with the account’s usual sign-ins.</p>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              void send({
                kind: "ACQUIRE",
                queryId: "Q-H",
                cutoffTick: view.tick,
              })
            }
          >
            Compare sign-ins · 1 step →
          </button>
          <p className="guide-tip">
            Your goal: decide whether this login has an ordinary explanation,
            looks like unauthorised use, or cannot yet be explained. No
            countdown runs while you read.
          </p>
        </>
      ) : stage === "save-comparison" && baseline ? (
        <>
          <p className="eyebrow">READ THE RESULT</p>
          <h2 ref={heading} tabIndex={-1}>
            Now compare unusual with usual.
          </h2>
          <div className="baseline-comparison">
            <article>
              <small>THIS LOGIN · 02:13</small>
              <p>{lead?.observation}</p>
            </article>
            <article>
              <small>USUAL SIGN-INS · PREVIOUS 14 DAYS</small>
              <p>{baseline.observation}</p>
            </article>
          </div>
          <p>
            The login is different from normal. That alone does not tell you who
            used the account. Keep these two records in your report before
            checking an explanation.
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => save(comparison)}
          >
            Add these observations to Case File · free
          </button>
          <p className="guide-tip">
            Case File is your report. Adding a record saves it as evidence; it
            does not choose a conclusion.
          </p>
        </>
      ) : stage === "check" ? (
        <>
          <p className="eyebrow">YOUR NEXT MOVE · CHOOSE A CHECK</p>
          <h2 ref={heading} tabIndex={-1}>
            What could explain this login?
          </h2>
          <p>
            Someone may have been working late with permission. Choose a
            question to investigate that possibility.
          </p>
          <div className="actions">
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                void send({
                  kind: "ACQUIRE",
                  queryId: "Q-C",
                  cutoffTick: view.tick,
                })
              }
            >
              Check approved work · 1 step
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void send({
                  kind: "ACQUIRE",
                  queryId: "Q-D",
                  cutoffTick: view.tick,
                })
              }
            >
              Check device registration · 1 step
            </button>
          </div>
          <p className="guide-tip">
            Approved work checks whether the time, device and task had
            permission. Device registration checks whether the computer was
            known to the organisation. Explore has more checks if you want them.
          </p>
        </>
      ) : stage === "save-check" && context ? (
        <>
          <p className="eyebrow">
            READ THE RESULT · {recordTitles[context.ref.recordId]}
          </p>
          <h2 ref={heading} tabIndex={-1}>
            Here is what your check found.
          </h2>
          <blockquote className="guide-result">
            <p>{context.observation}</p>
            <small>
              {sourceLabels[context.sourceId]} · received at step{" "}
              {context.deliveredTick}
            </small>
          </blockquote>
          <p>
            Does this explain the login, raise a concern, or leave something
            unknown?
          </p>
          <div className="actions">
            <button
              className="primary"
              disabled={busy}
              onClick={() => save([context])}
            >
              Add this observation to Case File · free
            </button>
            <button onClick={() => navigate("Explore")}>
              Choose another check →
            </button>
          </div>
          <button
            className="guide-shortcut"
            onClick={() => navigate("Case File")}
          >
            Build my finding →
          </button>
        </>
      ) : (
        <>
          <p className="eyebrow">YOUR NEXT MOVE · MAKE YOUR CALL</p>
          <h2 ref={heading} tabIndex={-1}>
            What do you think happened?
          </h2>
          <p>
            Your records are saved in Case File. Choose your explanation, say
            how sure you are, and decide whether to close this lead or ask the
            response team to investigate further.
          </p>
          <div className="actions">
            <button className="primary" onClick={() => navigate("Case File")}>
              Build my finding →
            </button>
            <button onClick={() => navigate("Explore")}>
              Explore more evidence →
            </button>
          </div>
          <p className="guide-tip">
            You can finish without collecting every record. If the information
            is missing or contradictory, an unresolved finding with a clear next
            step is valid. Review is always available.
          </p>
        </>
      )}
      {screen === "Timeline" ? (
        <p className="guide-tip">
          A requested owner check arrives after three simulation steps. Reading
          this page does not advance it; choose an action or deliberately
          advance the world.
        </p>
      ) : null}
    </section>
  );
}
