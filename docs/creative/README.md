# Creative production handoff — M01 candidate

**Status: pending human creative and listening acceptance.** Automated validation and agent visual inspection are evidence of technical delivery, not art direction approval or a completed player study.

## Source and delivery register

| Asset                    | Source / retained master                                                                    | Delivery / purpose                                                                                                   | Review                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Landscape key art        | Original OpenAI image-generation output; `production/art-masters-v1.zip`                    | `/art/northstar-investigation-landscape-v1.webp`, 1440×810, 66,944 bytes; focal point 73%/52%, quiet left title area | Pending                                                             |
| Portrait key art         | Separately recomposed from the generated landscape, not a centre crop; same archive         | `/art/northstar-investigation-portrait-v1.webp`, 720×1280, 55,588 bytes; focal point 65%/72%, quiet upper title area | Pending                                                             |
| Original vector fallback | Repository-authored `public/art/northstar-night.svg`                                        | Nonblocking, text-free fallback when delivery art fails                                                              | Pending physical brightness/crop review                             |
| Voice and sound          | Stock Piper LJSpeech model + original tones/ambience; `production/m01-voice-masters-v1.zip` | 21 immutable MP3 delivery files; full pack loads only on explicit consent                                            | All human listening entries pending                                 |
| Tokens                   | `src/ui/styles.css :root`; `src/presentation/design-tokens.json`                            | Core colors, surfaces, focus, body font and responsive control conventions                                           | Automated core-pair contrast checks; human hierarchy review pending |
| Dependency inventory     | [Declared lockfile metadata](DEPENDENCIES.json)                                             | 250 pinned package entries at inventory generation; generation tools documented separately in audio record           | Human rights/dependency acceptance pending                          |

Art uses an anonymous fictional investigator seen from behind; no real-person likeness, agency branding, readable evidence text or functional controls were requested. The model identifier is not exposed by the image-generation tool; the record states that limitation instead of inventing one. Generation date: 19 October 2026. Compressed delivery uses FFmpeg WebP quality 82. Master and delivery SHA-256 values are retained in `production/MASTERS.json` and `src/presentation/art.json`. The original files remain intact in the archive.

The art is decorative. Actual title, choices, records, warnings and clocks remain HTML. The `<picture>` chooses one responsive delivery variant; essential text remains usable during slow/failed art loading. `Case ready` is separate from optional `Voice pack ready`. Audio/caption settings do not enter gameplay state.

Lossless audio was converted from retained WAV masters to FLAC and verified by matching decoded PCM SHA-256. `production/MASTERS.json` records original WAV hashes, FLAC hashes and PCM hashes; archives remain outside `public/` and Vite output. Model weights are not shipped. See [voice production and rights](../audio/PRODUCTION.md) for source/model identity, licence declarations, scripts and generation method.

## Design language and screen references

Navy/slate surfaces, cyan intent/focus, amber disclosed caution and labelled red risk are used consistently. Ordinary evidence uses opaque cards; art does not sit behind consequential case text. Critical labelled controls use 44px targets. At enlarged text, navigation wraps rather than clipping; media settings scroll normally and the single master-mute control stays reachable. CSS reflow and automated contrast scans do not establish physical-device or screen-reader acceptance.

Actual production-build reference captures live in `docs/verification/screens/`: home, Leads, acquired evidence, Case File, review, debrief, portrait/landscape tablet adaptations, desktop home and enabled voice. These are review frames of the implemented UI, not an independently approved storyboard or an optimal investigative route. The capture script is `npm run verify:production` against a running Vite preview.

Review each frame for next-action clarity, readable hierarchy, focus/selection/pending/error distinctions, title crop safety and touch reachability. Rate home art and actual gameplay separately. Verify the muted and enabled-voice states, saved/no-active-case states, failed-media fallback and storage-error states in the live build as well as the screenshots.

## Decisions still requiring people

- Approve or revise both compositions at phone, tablet portrait/landscape and desktop sizes; assess ordinary screen brightness and whether decorative imagery suggests a conclusion.
- Listen to every final clip using the [audio review sheet](../verification/audio-review.csv). Approve identity/accent (English US is a candidate departure from the preferred Singapore English direction), pauses, pronunciation, artifacts and levels.
- Evaluate all six gameplay screens with newcomers/generalists and three specialist reviewers using the GDD's separate clarity, discovery, fairness and visual-appeal measures.
- Review actual device interruption, accessibility and media decoding. Do not replace these with headless browser results.
