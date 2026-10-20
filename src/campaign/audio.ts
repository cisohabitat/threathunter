import { z } from "zod";
import { packSchema } from "../presentation/voice/pack";
import m04 from "./audio/m04/manifest.json";
import m07 from "./audio/m07/manifest.json";
import scripts04 from "./audio/m04/cues.json";
import scripts07 from "./audio/m07/cues.json";
import type { Debrief, MissionId } from "./contracts";

const schema = packSchema.extend({
  packId: z.enum(["M04-voice-en-US-v1", "M07-voice-en-US-v1"]),
  cues: z
    .array(
      packSchema.shape.cues.element.extend({
        audioPath: z.string().regex(/^\/audio\/m0[47]\/[a-z0-9-]+-v1\.mp3$/),
      }),
    )
    .length(21),
});
export const audioPacks = { M04: schema.parse(m04), M07: schema.parse(m07) };
for (const mission of ["M04", "M07"] as const) {
  const scripts = (mission === "M04" ? scripts04 : scripts07) as Record<
    string,
    { text: string }
  >;
  const pack = audioPacks[mission];
  if (
    pack.packId !== `${mission}-voice-en-US-v1` ||
    new Set(pack.cues.map((c) => c.id)).size !== 21 ||
    pack.cues.some(
      (c) =>
        !c.audioPath.startsWith(`/audio/${mission.toLowerCase()}/`) ||
        (c.text && scripts[c.id]?.text !== c.text),
    )
  )
    throw Error("Mission voice package does not match its scripts/version.");
}
export const cueMaps = Object.fromEntries(
  Object.entries(audioPacks).map(([id, p]) => [
    id,
    new Map(p.cues.map((c) => [c.id, c])),
  ]),
) as Record<MissionId, Map<string, (typeof audioPacks.M04.cues)[number]>>;
export function findingCue(debrief: Debrief) {
  return !debrief.quality.supported
    ? "finding-unsupported"
    : (
        {
          explained: "finding-explained",
          misuse: "finding-misuse",
          visibility: "finding-visibility",
          provisional: "finding-provisional",
        } as const
      )[debrief.finding.disposition];
}
