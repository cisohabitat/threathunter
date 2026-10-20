import { z } from "zod";
import { packSchema } from "../presentation/voice/pack";
import { missionIdSchema, type MissionId, type Debrief } from "./contracts";
const manifests = import.meta.glob("./audio/m*/manifest.json", {
  eager: true,
  import: "default",
});
const scripts = import.meta.glob("./audio/m*/cues.json", {
  eager: true,
  import: "default",
});
const schema = packSchema.extend({
  packId: z.string().regex(/^M(02|03|05|06|08|09|10|11|12)-voice-en-US-v1$/),
  cues: z
    .array(
      packSchema.shape.cues.element.extend({
        audioPath: z
          .string()
          .regex(
            /^\/audio\/(m(01|02|03|05|06|08|09|10|11|12)|expansion-shared)\/[a-z0-9-]+-v[12]\.mp3$/,
          ),
      }),
    )
    .length(21),
});
export const audioPacks = Object.fromEntries(
  missionIdSchema.options.map((id) => {
    const path = `./audio/${id.toLowerCase()}/manifest.json`,
      pack = schema.parse(manifests[path]),
      script = scripts[`./audio/${id.toLowerCase()}/cues.json`] as Record<
        string,
        { text: string }
      >;
    if (
      pack.packId !== `${id}-voice-en-US-v1` ||
      new Set(pack.cues.map((c) => c.id)).size !== 21 ||
      pack.cues.some((c) => c.text && script[c.id]?.text !== c.text)
    )
      throw Error("Expansion voice/script mismatch");
    return [id, pack];
  }),
) as Record<MissionId, z.infer<typeof schema>>;
export const cueMaps = Object.fromEntries(
  Object.entries(audioPacks).map(([id, p]) => [
    id,
    new Map(p.cues.map((c) => [c.id, c])),
  ]),
) as Record<MissionId, Map<string, z.infer<typeof schema>["cues"][number]>>;
export function findingCue(d: Debrief) {
  return d.quality.supported
    ? (
        {
          explained: "finding-explained",
          misuse: "finding-misuse",
          visibility: "finding-visibility",
          provisional: "finding-provisional",
        } as const
      )[d.finding.disposition]
    : "finding-unsupported";
}
