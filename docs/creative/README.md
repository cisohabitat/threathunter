# Creative production handoff — three-mission candidate

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

## Timeline revision reference

[Current pagination control](../verification/screens/12-timeline-pagination.png) was captured from the production preview with a 20,000-command case. Before: every history entry was rendered in one list. After: at most 50 entries, an announced range, and first/previous/next/latest native buttons; the full ordered log remains accessible and exportable. Other composition frames remain the earlier baseline, not recaptured or reapproved here. Human/device visual acceptance remains pending.

## M04/M07 extension

The existing versioned generated Northstar landscape/portrait environmental compositions and their original PNG archive are reused as decorative mission-banner crops. This is reuse of existing candidate art, not a claim of new or approved mission illustrations. M04 adds a readable account-to-host matrix; M07 presents declared collection and observed delivery as separate labelled panels. Evidence roles, bounded lists, the Case File, separate outcome/quality debrief and full audio controls share the established grammar. New audio/script/master records are in [the production record](../audio/PRODUCTION.md).

`npm run verify:campaign` captures current production-preview mission choices, M04 matrix/Case File/debrief, and M07 coverage/window/debrief frames (13–19 in `docs/verification/screens`). Earlier M01 frames remain labelled historical references. Before: only M01 was playable and M04/M07 were blueprints. After: two executable proactive hunts, with their own source mechanics and saved reports. The user deferred all human creative/listening/device reviews; these frames are technical review material, not approval.

## Twelve-case extension

The nine expansion missions reuse the same immutable Northstar environmental crops and tokens. Distinct public workspaces cover alert priority, task context, credential attribution, management paths, app/workload boundaries, emergency grants, behaviour/intent, separate causal claims and a prioritised capstone. `npm run verify:expansion` records actual production-preview frames 24–33, sampled desktop/320px accessibility, exact portable save invariance and reload, plus a 1,000-command worker-import/timeline check. These captures are review material with human creative acceptance still deferred. Source records and all lossless masters remain outside browser delivery.
