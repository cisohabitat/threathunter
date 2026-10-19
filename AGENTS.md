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
