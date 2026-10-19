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

- Preserve version-1 command-log import/export compatibility until an explicit, tested format migration exists. The current recovery work does not complete the GDD snapshot/trailing-log or committed-receipt requirements.
- Track the last durable revision separately from volatile engine revision. Retrying storage must commit the retained state, never re-dispatch commands or merge over a different saved revision. Temporary restarts must not delete the durable case.
- Inspect and validate stored command history, checksum and row revision before resuming or retaining it as the next backup. Offer only validated previous saves; never silently repair incompatible rulesets or discard a damaged current record.
- Recovery compares the complete inspected row again inside its transaction. Archive the original under `recovery-original` before restoring/restarting. The raw recovery export is for inspection, separate from the normal portable save format; the most recent original remains exportable after recovery.
- Waiting Web Lock owners must reload committed state when ownership transfers. Keep read-only enforcement and explicit export/discard controls for conflicts. Web Locks fallback/leases, abrupt device kill, eviction and full migration coverage remain release work.
- Browser storage changes require actual stored-state assertions under failed writes, recovery and multiple tabs, alongside the existing offline and gameplay flows. Fault injection belongs in tests only.
