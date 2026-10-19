# Implementation status — internal build 0.1

The v4.3 GDD is preserved unchanged and controls this implementation. This is a deployed internal M01 build at https://threathunter-rosy.vercel.app. Completed-P0 acceptance remains pending.

## Implemented

- Exact Appendix A JSON extraction and four internal world fixtures; normal gameplay does not expose their identifiers.
- Start/resume, fictional briefing, Leads, Explore, Case File, Timeline, review/confirmation and frozen debrief.
- Pure deterministic TypeScript reducer, request-start query cutoffs, immutable acquisition references, static/dynamic snapshot caches, free record navigation, nonblocking owner checks and bounded advance commands.
- Command schemas, idempotency/conflict checks, revisions, target/scope validation and post-close rejection. Delayed scoped responder outcomes, including response precedence at objective tick 8.
- Canonical weighted scoring, structured alternative/limit evidence, explicit scope/next-step packages, independent operational outcome. Ten reference traces match GDD expectations.
- IndexedDB transactions, last-good export retention, revision conflict rejection, one active writer through Web Locks where supported, explicit temporary mode and replay-based export/import validation.
- Palette/type/layout tokens, responsive surfaces, relationship-list alternative, touch/keyboard controls, reduced-motion-aware home transition and original text-free SVG home artwork.
- Locked dependencies, strict TypeScript, ESLint, Vitest, Playwright, CI and Vercel static configuration.

## Open completed-P0 gates

| Area             | Current limit / required work                                                                                                                                                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Voice / Howler   | Briefing and six Morgan scripts exist as text. No generated recordings, reviewed voice pack, caption/audio mixer or playback integration is claimed. Required voice remains a release blocker. No TTS tool or configured voice provider is available in this session.                                                                     |
| Art acceptance   | The original SVG night scene is an initial composition. Landscape/portrait final variants, reviewed asset register, six mockups, contrast measurements and gameplay-appeal review are pending.                                                                                                                                            |
| Persistence      | v1 portable saves use complete validated command replay rather than the GDD's full snapshot + trailing-log envelope. Previous committed export is retained but recovery choice UI/migrations are pending. Web Locks are used where available; unsupported browsers retain transaction/revision checks and need read-only fallback review. |
| Receipts         | Engine receipts distinguish accepted in-memory and rejected/replayed. The UI marks saves only after IndexedDB commit. Persisted receipt durability is not yet promoted to a committed receipt; export replay reconstructs original in-memory receipts.                                                                                    |
| Scheduler detail | M01 observations/check due times and frozen continuation outcomes are implemented. Complete general seven-phase event records, dependency-driven business/adversary state and richer debrief reconstruction remain to be implemented before future missions.                                                                              |
| Validation       | Command/import enums, bounds, IDs and references are checked. General scenario/media authoring schemas, every malformed import edge case, acquisition provenance reporting and explicit rubric-reference explanations remain open.                                                                                                        |
| Device / access  | Chromium desktop and phone emulation are automated. Physical iPhone/iPad/Android, Safari/Firefox, assistive technology, 200% text, media interruption and full accessibility review are pending.                                                                                                                                          |
| Recovery UX      | Quota/private-mode behavior, abrupt process kill, imported-save replacement workflow and active-run transfer need additional browser tests.                                                                                                                                                                                               |
| Performance      | First internal bundle has a Vite size warning; production bundle/CPU budgets and art/audio network budgets need measurement and tuning. No measured production performance is claimed.                                                                                                                                                    |
| Human evaluation | No novice/generalist studies, listening review, visual acceptance or learning-outcome validation has occurred.                                                                                                                                                                                                                            |
| Deployment       | Production deployment is live and Git-connected to `main`. Guided onboarding deployed successfully at commit `8bff19b`. Physical-device and release-acceptance gates remain open.                                                                                                                                                         |

Do not expand into M04/M07 until M01's required release evidence is complete. No public-release sign-off is implied by passing automated checks.

## Asset provenance

`public/art/northstar-night.svg` is original vector artwork authored for this repository. It has no external image/font dependency, embedded text or personal data. System fonts are used. A complete production rights/license inventory for all locked dependencies and future voice/art assets is still required.

## Verification executed on 19 October 2026

- `npm run lint`: passed.
- `npm run typecheck` / `npm run build`: passed; build reports the documented >500 kB initial-JavaScript warning (approximately 168 kB gzip).
- `npm test`: 35 tests passed, including all ten Appendix B golden trace expectations.
- `npm run test:e2e`: six tests passed on Chromium desktop and phone emulation, including 320px overflow checks, offline text completion and committed reload/resume.
- Original uploaded Markdown compared byte-for-byte with the GitHub copy: identical. Appendix A JSON extracted directly without rules changes.

The first browser pass exposed a development-remount writer-lock race; the lock request now waits with an abortable lifetime and releases on cleanup. The corrected browser suite passed. These are local execution results, not an assertion that GitHub Actions or a Vercel preview has passed.

## Guided onboarding update

Added the GDD Section 4 first-run assistance: equally available guided/independent modes, a remembered presentation preference, an explanation of the investigator’s goal and action-driven time, side-by-side sign-in comparison, an explicit free evidence-citation action, a choice of follow-up checks and plain-language Case File instructions. Guidance uses delivered public observations only, does not choose a finding or alter scoring, and can be hidden/restored at any time. Guided Leads defers the full source workbench to Explore to reduce the initial information load.

Validation: lint, typecheck/build and all 35 engine/persistence tests pass. All 10 browser checks passed, adding guided first acquisition, free citation, next-check choice and guidance preference/resume to the existing desktop/phone flows. Required voice production remains open; this update adds text guidance only.
