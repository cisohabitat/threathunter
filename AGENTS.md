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
- This is a deployed internal M01 build, not completed P0. Reviewed voice and the other documented acceptance gates remain open.
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

- Use `docs/GDD_ACCEPTANCE.md` for all 28 GDD backlog requirements. P0 remains a candidate until real device, creative/listening and 8+8 target-player / 3 specialist gates pass. GDD Sections 21.4 and 22.1 gate M04/M07 production expansion on those results; never describe a prototype mission or empty menu as full campaign implementation.
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
