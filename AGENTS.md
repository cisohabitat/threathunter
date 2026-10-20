# Threat Hunter repository instructions

Read `docs/THREAT_HUNTER_GAME_DESIGN_DOCUMENT_v4.3.md` before changing gameplay. It is the authoritative product and implementation baseline. In particular, preserve Sections 8 (commands), 9 (scheduler), 13 (scoring) and Appendix A (M01 ruleset 4.0.0).

- Keep hidden truth inside engine state; React and presentation consume permitted player projections. Never leak world identifiers through labels, loading states, sounds or defaults.
- Only accepted commands advance ticks. Reading and media callbacks never advance time. Validate before mutation and preserve idempotency and immutable acquisitions.
- Grade from cited, delivered evidence. Operational outcomes and hidden truth must not change quality for identical observations.
- Keep the chosen React/TypeScript/Vite/Tailwind/Zustand/Zod/Dexie/Motion/Howler stack unless a documented architecture decision establishes an equivalent alternative.
- Do not describe this internal build as P0-complete until all GDD release gates pass, including required generated voice, art review, accessibility and physical-device/player tests.
- Run lint, typecheck, unit tests and build for relevant changes; run browser checks for interaction/storage/layout changes. Do not edit historical validation claims to imply they tested this implementation.
- Record production status and intentional limitations in `docs/IMPLEMENTATION_STATUS.md`. Preserve the original GDD verbatim; propose a revision explicitly when rules conflict.

## Documentation maintenance — required for every change

- Review `AGENTS.md` and `README.md` during every task and before committing or pushing. Update both in the same change whenever implementation, workflow, architecture, commands, deployment, onboarding, or known limitations change. Do not leave stale descriptions for a later task.
- Keep `README.md` accurate for players and developers: live URL, how to play, local setup, verification commands, implemented capabilities, deployment workflow and release limits.
- Keep `AGENTS.md` accurate for future agents: repository conventions, architectural boundaries, current delivery context and required verification. Carry forward established user preferences, including pushing authorized updates to `main` and using the existing Vercel project.
- Update `docs/IMPLEMENTATION_STATUS.md` when capabilities, open gates, deployment state or validation evidence change. Distinguish historical checks from current results; never claim a queued or unrun check passed.
- Documentation-only tasks require relevant link/path checks and `git diff --check`; they do not require rerunning gameplay tests. If neither document needs a content change, explicitly record that both were reviewed in the change description.
- Preserve the original GDD verbatim. Document current implementation separately rather than editing design history to match incomplete software.

## Current delivery context

- Production URL: https://threathunter-rosy.vercel.app
- Repository: `cisohabitat/threathunter`; production branch: `main`.
- Existing Vercel project: `threathunter` (`prj_uz7WLOK0bffjodL77sxVDvot23tv`). Git-connected pushes to `main` trigger production deployment. Inspect that deployment instead of creating duplicate projects or deployments.
- This is an internal three-mission candidate (M01, M04, M07), not accepted P0/P1. The user deferred review-first expansion ordering; player/device/creative/listening acceptance remains deferred.
- Guided investigation is the recommended first-run presentation. Its preference is stored separately from gameplay. Guide content must use public observations, remain optional, and never alter truth, timing, conclusions or scoring automatically.

## Evidence and reporting conventions

- `EvidenceCard` is the shared interaction surface in Explore and Case File. Citation, alternative checks and limitations issue validated, zero-tick `EDIT_CASE` commands using immutable acquisition references; do not maintain a second evidence list in presentation state.
- The Case File has four freely navigable steps. Keep Review finding available throughout, allow incomplete findings, and require explicit final confirmation. Optional notes must be saved explicitly or flushed on review/close.
- Keep the newest acquisition prominent and preserve earlier dynamic snapshots. Do not overwrite an empty earlier result when a refresh returns later activity.
- Debrief findings, pending checks and investigation history are frozen by the engine on close. Evidence-linked feedback uses decision-time observations and rubric predicates, never hidden actor identity or operational damage.
- “What I knew then” filters by record delivery step, not event timestamp. Selecting an earlier step must hide later observations without recomputing the original score. Keep numeric grading optional and separate from operational outcome.
- Enriched debrief data is reconstructed from existing version-1 command-log saves; do not change gameplay ruleset or sufficient-evidence predicates solely for presentation changes.

## Voice and sound conventions

- `cues.json` is the canonical narration text. Generated MP3 assets and `manifest.json` must match its scripts and checksums. Keep source attribution, exact model hash, generation method and honest listening-review status in `docs/audio/PRODUCTION.md`; never mark an unreviewed pack approved.
- Generate speech only at content-production time. Do not add runtime TTS, user-voice cloning, API keys or microphone permissions for the shipped pack. Keep model weights and lossless masters outside `public/`.
- The Howler mixer is lazy-loaded on explicit opt-in. Prepare all active-mission clips, including every alternative debrief, before claiming Voice pack ready; never fetch a secret branch-specific subset.
- Audio consumes public deliveries and closed-case report classes only. It must never dispatch gameplay commands, change clocks, revise scores, reveal testimony early or leak hidden world identifiers through cues or filenames. Sparse twins share reasoning narration; outcome narration is separate and post-close only.
- Fresh sessions are silent until explicit consent. Maintain captions/transcripts, skip/replay, independent channels, master mute, a screen-reader-friendly mode and safe media failure. Stop obsolete speech on navigation and all playback on backgrounding without replaying a backlog.
- Preserve immutable approved asset versions when replacing a pack, and update its version/paths, source record and tests together. Keep the Vercel SPA rewrite from rewriting `/audio/` assets.

## Persistence and recovery conventions

- Format 2 is the default export/write format; continue reading format-1 command logs. Inspecting an old row must not rewrite it. Upgrade only on a successful commit, retaining the old envelope as the previous backup. See `docs/SAVE_FORMAT.md`.
- Track the last durable revision separately from volatile engine revision. `commit` returns an acknowledged clone only after the transaction completes; the controller must expose that returned state. Never mutate caller receipts on failure. Retrying storage must commit the retained state, never re-dispatch commands or merge over a different saved revision. Temporary restarts must not delete the durable case.
- Inspect and validate stored command history, checksum and row revision before resuming or retaining it as the next backup. Offer only validated previous saves; never silently repair incompatible rulesets or discard a damaged current record.
- Recovery compares the complete inspected row again inside its transaction. Archive the original under `recovery-original` before restoring/restarting. The raw recovery export is for inspection, separate from the normal portable save format; the most recent original remains exportable after recovery.
- Waiting Web Lock owners must reload committed state when ownership transfers. Keep read-only enforcement and explicit export/discard controls for conflicts. Web Locks fallback/leases, abrupt device kill, eviction and future incompatible-format migration coverage remain release work.
- Browser storage changes require actual stored-state assertions under failed writes, recovery and multiple tabs, alongside the existing offline and gameplay flows. Fault injection belongs in tests only.

- `persistence/format.ts` owns portable schemas, manifest compatibility, snapshot audit, receipt acknowledgement and gameplay hashing. `engine.persistence` is storage metadata only; engine transitions never promote it, and presentation receives no hidden snapshot fields.
- Pin the snapshot compatibility ID and fixture hash. Any change that invalidates saved snapshot semantics needs a new compatibility ID and explicit retained-build/migration/recovery handling. Do not reinterpret a saved world or silently regenerate different facts.
- Runtime snapshot validation uses exact canonical comparison with an independently reconstructed command prefix, including nested records, references, receipts, drafts and due ticks. Restore that validated snapshot and apply only the trailing command slice. Keep validation audit separate from applying commands to restored state.
- Gameplay hashes exclude storage acknowledgement metadata and normalize receipt durability. Portable envelope checksums still cover every field. Keep exports deterministic and media/preferences separate; never describe FNV checksums as authenticated scoring.

## Full-GDD completion and simulation conventions

User override, 20 October 2026: “defer review. continue gdd” authorizes M04/M07 implementation now. The previous review-first expansion restriction below is superseded for development, not release acceptance. Keep reviews deferred/unpassed; preserve the original GDD and document authored P1 rules separately in `docs/DESIGN_DECISIONS.md` and mission specifications. Do not request this authorization again.

- Use `docs/GDD_ACCEPTANCE.md` for all 28 GDD backlog requirements. P0 remains a candidate until real device, creative/listening and 8+8 target-player / 3 specialist gates pass. The user explicitly deferred the Sections 21.4/22.1 review-first ordering for development; M04/M07 implementation is authorised. Never turn deferred reviews into passed reviews or describe empty mission menus as implementation.
- `engine/scheduler.ts` owns phases 1–7, stable authored priority/event ordering, response-first ties, access/dependency checks and the private world/collection/acquisition ledger. All costly commands use that scheduler. Keep request-start snapshots and absolute due ticks; continuation cannot mutate decision-time observations, clocks or quality.
- `m01-snapshot-1` compatibility code is retained and frozen. New writes use `m01-snapshot-2`; migration must validate the original envelope, replay additively and compare every original field before accepting. Keep original fixtures/GDD unchanged.
- World reconstruction is exposed only in the closed-case debrief behind an explicit reveal, with world, source collection and player acquisitions distinguished. Never project simulation events, private source context or hidden objectives into live headers, help, sounds or urgency.
- Same-world replay archives the exact durably closed run before clearing the active slot and starts a new run ID. Completed archives remain exportable. Reject stale archival requests; never discard an unsaved closed finding.
- `content/validate.ts` enforces the M01 authoring boundary, including reference/source/schedule/branch/fairness checks. New missions need their own reviewed package, not relaxation of M01 predicates.
- The field guide and source capability descriptions are public constants. Case File stage and unfinished note buffers live in presentation state; accepted facts/draft references still come only from engine commands. Navigation restores per-run scroll/focus without charging time.
- Browsers without Web Locks may read/export saved state and explicitly play temporarily; durable writes/recovery/restart are disabled. Do not silently fall back to multiple writers.

## Presentation and release evidence

- Versioned landscape/portrait WebP artwork uses the art manifest; preserve the generated PNG and lossless FLAC archives in `production/`, outside browser delivery. Keep master/delivery hashes, exact source rights records and honest pending-review statuses. Never replace an immutable `/art/` or `/audio/` path in place.
- Audio settings scroll in normal flow so enlarged text cannot obscure navigation. The existing master-mute control remains reachable. Reflection/finding/outcome speech is gated on public closed phase; keep all mission clips loaded together independent of private branch.
- Run `npm run check:budgets` after build. `npm run verify:production` and `npm run verify:crash` require a running production preview and generate lab/screen/recovery evidence. They are not physical-device or human reviews. Do not kill shared browsers: the crash verifier targets only its own spawned browser PID/process group.
- `npm run test:e2e` covers Chromium desktop/phone emulation; `npm run test:e2e:cross` configures Firefox and WebKit. Record host startup failures and actual per-engine results separately. Do not call Linux WebKit physical Safari, or queued GitHub CI passing.
- Keep the human/device/audio CSV sheets blank/pending until actual sessions occur. Human sign-off must identify reviewer/build/device and evidence; never infer natural voice delivery, enjoyment or a >9 grade from automated checks.

Waiting read-only tabs receive committed-save notifications where BroadcastChannel is available and may inspect the current case. Ownership transfer reloads durable state; read-only note buffers follow accepted notes even after returning from another screen, without replacing a writer’s local unfinished edits. Missing or rejected Web Locks access permits explicit temporary play and export, with durable writes disabled.

## Background save-validation contract

- Browser save inspection, imports, commit envelope/hash preparation, recovery and archives use `persistence/validation.ts` and the isolated `validationWorker.ts`. Keep the pure synchronous reader for non-browser tooling; never silently move a browser audit back onto the interface thread when workers fail.
- Prepare the validator before case-ready so a loaded session can save offline. Count its initial JavaScript in the compressed/core budgets. Worker messages carry private engine state only to persistence/controller code; React still receives permitted projections.
- Worker construction, messaging, decoding or 20-second deadline failure must retain stored and volatile progress, report unavailable validation, and support a fresh worker on retry. Such failures are not evidence that a stored row is corrupt.
- Never await a worker inside a Dexie transaction. Validate the inspected row first, then compare its complete canonical bytes with the transaction's current row before writing or archiving; reject any change, even at the same revision.
- `npm run verify:history` profiles 100/350/750-command synthetic histories and the actual production import/commit/reload with an interface heartbeat. It requires preview on port 4173. Report replay complexity and serialization limits honestly; the worker is not a constant-time restore or physical-device performance claim.

When browser validation cannot start for an existing save, offer an explicit raw stored-data recovery export without validating or rewriting it. Keep that recovery copy distinct from portable imports; temporary play must leave the original row unchanged.

## Owned history replay

- Live `processCommand` remains immutable. Its private transition mode must not become a public flag or a UI mutation API. `replayCommands` clones its caller's checkpoint once and owns that detached state for the whole audit.
- Replay still validates every command, expected revision, authority/scope and receipt ID. Reject duplicate log entries, including idempotent repeats; on any invalid history, discard the owned copy without touching the supplied checkpoint or command payloads.
- Prove complete-state equality with ordinary immutable transitions across worlds, mixed actions, closure and split checkpoints. Preserve sufficient sets, receipts, due ticks, debrief reconstruction and compatibility IDs. The frozen snapshot-1 reader stays unchanged.
- `verify:history` now includes a same-build immutable/owned replay comparison and a 20,000-command format-1 Node import within the 2 MiB limit. This does not establish browser rendering speed for a 20,000-entry timeline or physical-device acceptance.

## Portable size and timeline bounds

- Default format-2 writers prefer the latest checkpoint, falling back to revision zero if the complete compact envelope exceeds 2 MiB. Explicit checkpoint boundaries remain exact and fail if oversized. Preserve every command, original acknowledgement boundary and final hash; never raise import bounds or truncate history to make a save fit. No compatibility ID changed.
- Browser portable exports use `prepareExport` in the preloaded worker and compact JSON bytes. Export must not call `markCommitted` or promote volatile receipts. Handle async export errors in the controller. Raw recovery downloads remain separate inspection records.
- `HistoryTimeline` renders at most 50 public entries with accessible page controls. Navigation state remembers the live page per run; debrief filters by delivery step before pagination. Histories with over 100 distinct steps use a bounded numeric step control instead of thousands of select options. Reading and page changes dispatch no engine commands.
- Include WCAG 2.1 A as well as AA in sampled accessibility audits; accessible button names must include all visible title text. Keep save/readiness copy inside its labelled region.

## P1 mission contract

- `guidance.ts` selects P1 hints from `View` only: delivered records, public scope, queries, windows and pending checks. Never import private engine state, package facts or scoring predicates. Sparse twins receive identical guidance; source suggestions describe capabilities rather than infer branch-specific answers.
- `Guide.tsx` offers optional nudge/source/show-me levels and a plain-language field guide. Show-me may navigate/focus only; it never dispatches, selects scope, attaches evidence or closes automatically. Use stable mission-prefixed help anchors and visible focus. Selected nudge transcript/narration reuse the exact immutable existing cue.
- P1 guidance preference is mission-scoped with M01 preference fallback. Assistance requests are session-only presentation records (latest 100 plus total), optionally exported separately. They cannot enter save manifests, commands, hashes or quality; reload does not restore the log. Keep this limitation explicit.

- `src/campaign` contains independently authored M04/M07 1.0.0 packages, the `p1-1` engine, strict command/finding contracts and the `p1-1.0.0` rubric. Keep M01 fixtures, schemas, engine/old readers and golden expectations unchanged. P1 packages and their authority/source matrices are specified in `docs/P1_MISSIONS.md`; review deferral is recorded in `docs/DESIGN_DECISIONS.md`.
- M04 earns its unexpected account/host relationship through acquisition. Scope changes and evidence roles are free; the business dependency and unmanaged-host boundary must govern response recommendations. M07 tests declared versus delivered collection with matched hidden-world evidence. A controlled test proves only its target/capability/time.
- Queries capture at request start and cost one step; verification costs one and completes at start+3. `ENABLE_SENSOR` costs two and activates at completion for an explicit 2–4-step window. It never backfills process creation or a missing historical interval. Controls precede benign test generation (phase 3), source recording (5) and completion/delivery (6).
- P1 scoring uses cited facts and explicit sufficient sets, the canonical 30/25/30/15 weights, separate alternative evidence, limits, scope, owner and follow-up. No natural-language grading, hidden timing bonus or outcome multiplier. Closed knowledge/quality is frozen; later check collection belongs only to the separately revealed reconstruction.
- P1 format `threat-hunter-p1`, schema 1, pins all manifest versions, finite world selection and fixture hash, snapshots and full commands. It is separate from M01 format 1/2. Browser validation/export/commit preparation uses `p1Worker.ts`, a preloaded worker with a 20-second deadline. Bounded inputs, prefix audit, final hash, receipt acknowledgement, full-row CAS and raw-original recovery remain mandatory. Changes after first publication that invalidate replay require a new compatibility ID and explicit retained-reader/migration handling.
- `threat-hunter-campaign-v1` stores separate active/previous/completed/original rows per mission. Web Locks and notifications are mission-scoped. Unsupported locks permit only reading/export or explicit temporary play. Switching mission screens keeps loaded investigations mounted and stops inactive audio; never drop accepted volatile work. Completed durable runs are archived before same-world replay.
- Candidate M04/M07 packs each ship 21 immutable files with canonical transcripts and lossless master archives. The shared mixer accepts the active mission pack; full-pack loading, gating, consent and all existing M01 audio invariants remain. Fail promptly on a bad clip, abort/unload remaining fetches/decoders, and bound preparation at 20 seconds. Generation refuses to overwrite existing v1 deliveries.
- Run `e2e/campaign.spec.ts` for both new end-to-end findings, exports/reload/replay, both offline voice packs, cross-mission/M01 preservation, failed writes/recovery, ownership transfer and no-Web-Locks temporary play. Retain M01 regressions. `check:budgets` also counts loaded P1 text/worker JavaScript and each separate optional pack.

Run `npm run verify:guidance` against production preview for P1 help/focus, separate assistance export and offline nudge/save invariance. It writes `docs/verification/guidance.json` and frames 20–21. These are lab references, not human/device acceptance. Keep the complete campaign journeys alongside targeted guidance tests; startup waits account for lazy modules and bounded worker readiness.
