# Improvement roadmap — October 2026

Source: a code review of `main` at `517d22d` covering player experience across the three case families (M01, P1 M04/M07, expansion M02–M12 and free hunts), startup reliability, code health and test infrastructure. Every software item preserves the frozen engines, scoring, save formats, content packages, workers and media described in [AGENTS.md](../AGENTS.md). Human, device, creative and listening acceptance stay deferred and are not affected by this roadmap.

Each phase lands as its own commit with its own verification. Status is updated here as phases complete; an item stays open until its regression check exists.

## Phase 1 — Tooling and test hygiene

Goal: a reproducible, consistent contributor loop before changing behaviour.

- Exclude authored content/manifest JSON from Prettier (as `m01.json` already is) so formatting never churns hashed content; format the remaining drifted code files.
- Add `format:check` and run it in CI alongside lint/types.
- Give Playwright one shared expect timeout instead of ad-hoc per-call waits, and document that local runs need browsers matching the pinned `@playwright/test`.

## Phase 2 — Startup and save reliability

Goal: remove plausible causes of the intermittent "Begin stays disabled" failure and the WebKit learning-link race, and make the next failure diagnosable.

- Validator clients start each 20-second deadline when a job is dispatched to the worker, not when it is queued, and run jobs one at a time. A slow journey/archive inspection can no longer time out (and cancel) a case's own inspection. Keep the per-job deadline, terminate-on-timeout and fresh-worker retry contract. Share one client implementation across M01, P1 and expansion validators.
- Save-change BroadcastChannel messages carry their mission/slot; P1 and expansion controllers ignore other missions' commits instead of restarting their own inspection. Journey still treats any message as stale.
- P1/expansion pre-start actions stay disabled and keep a stable layout until save inspection completes, so a startup content swap cannot consume a premature click.
- Expose why a case cannot begin yet (inspecting, waiting for another tab, validation unavailable) as public readiness state, and record `performance` marks for startup milestones.

## Phase 3 — Accessibility and focus parity

Goal: every family moves focus and announces changes the way M01 does.

- Focus the debrief heading when a case closes (all three families).
- Expansion: focus the review confirmation when it opens; disable Review while blocked; give `<main>` `tabIndex={-1}` for the skip link; single page `h1` while the debrief shows.
- P1/expansion: announce new observations politely after an accepted acquisition.
- Expansion "Your current observations" shows the latest delivery, not the first record; mobile art fallback drops the responsive `<source>` like M01.

## Phase 4 — Shared presentation across families

Goal: P1 and expansion get the M01 presentation work instead of older patterns.

- Wrap P1/expansion topbar, save strip and audio controls in `UtilityHeader`, removing the competing sticky bars and hard-coded clearance offsets.
- Readable public source labels for P1/expansion records and filters instead of raw source IDs.
- Readable review/handoff/follow-up labels in P1/expansion review summaries instead of `replaceAll("_", " ")` values.

## Phase 5 — Startup performance

Goal: reduce main-thread work before first interaction, measured with more than three samples.

- Profile with more samples (fresh browser per sample, median/p90) so changes can be judged.
- Prefetch the validation worker chunk during idle network time (no early worker execution; the rejected warm-up stays rejected).
- Evaluate lazy-loading post-Begin M01 screens with idle prefetch, keeping offline Begin/save. Ship only if measured better; record rejected experiments.

## Later — needs a decision or broader review

- Merge the near-identical P1/expansion storage modules and controller hooks behind the existing storage/adversarial suites (high-stakes persistence code).
- Align action terminology across families ("Export save", "Confirm and close case", temporary play wording) together with PlayPrimer copy and e2e selectors.
- P1/expansion debrief progressive disclosure and itemised review with quiet Edit actions, matching M01.
- Move content-package Zod validation from module load to build/tests (touches frozen engine/content modules; needs a compatibility decision).
- Release-and-reacquire Web Locks on `pagehide`/`pageshow` if diagnostics show a back/forward-cached page holding a mission lock.
