import { readFileSync } from "node:fs";
import scripts from "../presentation/voice/cues.json";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { voicePack, debriefCue, packSchema } from "../presentation/voice/pack";
import { createRun, processCommand, type EngineState } from "../engine/engine";
import { emptyDraft, type Action } from "../domain/contracts";
function act(s: EngineState, action: Action) {
  return processCommand(s, {
    ...action,
    commandId: `cmd-${s.view.revision}`,
    expectedRevision: s.view.revision,
    runId: s.view.runId,
  }).state;
}
it("ships every required script class with intact assets and within the mission-pack budget", () => {
  const ids = new Set(voicePack.cues.map((c) => c.id));
  for (const id of [
    "briefing",
    ...Array.from({ length: 6 }, (_, i) => `morgan-${i + 1}`),
    "check-ready",
    "report-submitted",
    "finding-explained",
    "finding-misuse",
    "finding-visibility",
    "finding-provisional",
    "finding-unsupported",
    "outcome-occurred",
    "outcome-not-occurred",
  ])
    expect(ids.has(id)).toBe(true);
  expect(ids.size).toBe(voicePack.cues.length);
  for (const [id, script] of Object.entries(scripts))
    expect(voicePack.cues.find((c) => c.id === id)?.text).toBe(script.text);
  let total = 0;
  for (const cue of voicePack.cues) {
    const bytes = readFileSync("public" + cue.audioPath);
    expect(bytes.byteLength).toBe(cue.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(cue.sha256);
    total += bytes.byteLength;
  }
  expect(total).toBeLessThan(2 * 1024 * 1024);
  expect(voicePack.reviewStatus).toBe("pending-human-listening");
});
it("rejects a private field or missing cue in the media manifest", () => {
  expect(() => packSchema.parse({ ...voicePack, worldKey: "M" })).toThrow();
  expect(() =>
    packSchema.parse({ ...voicePack, cues: voicePack.cues.slice(1) }),
  ).toThrow();
});
it("selects the same reasoning narration for observationally identical sparse worlds", () => {
  const reports = (["U-B", "U-M"] as const).map((world) => {
    let state = createRun("same", world);
    state = act(state, {
      kind: "REQUEST_CHECK",
      check: "directory_callback",
      subjectId: "U-01",
    });
    for (const queryId of ["Q-H", "Q-D", "Q-C", "Q-F"] as const)
      state = act(state, {
        kind: "ACQUIRE",
        queryId,
        cutoffTick: state.view.tick,
      });
    const draft = {
      ...emptyDraft(),
      evidence: state.view.records.map((r) => r.ref),
      coverageThroughTick: state.view.tick,
    };
    return act(state, { kind: "CLOSE_CASE", draft }).debrief!;
  });
  expect(debriefCue(reports[0])).toBe("finding-visibility");
  expect(debriefCue(reports[1])).toBe("finding-visibility");
  expect(reports[0].objectiveAchieved).not.toBe(reports[1].objectiveAchieved);
});
