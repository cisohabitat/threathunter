# Improvement roadmap — October 2026

Source: a code review of `main` at `517d22d` covering player experience across the three case families (M01, P1 M04/M07, expansion M02–M12 and free hunts), startup reliability, code health and test infrastructure. Every software item preserves the frozen engines, scoring, save formats, content packages, workers and media described in [AGENTS.md](../AGENTS.md). Human, device, creative and listening acceptance stay deferred and are not affected by this roadmap.

Each phase lands as its own commit with its own verification. Status is updated here as phases complete; an item stays open until its regression check exists.

## Phase 1 — Tooling and test hygiene · done

Goal: a reproducible, consistent contributor loop before changing behaviour.

- Done: authored content/manifest JSON, recorded evidence under `docs/` and `index.html` are excluded from Prettier, so formatting never churns hashed or historical bytes; the drifted code files (validators, scripts, three e2e specs, one unit test) are formatted with no logic change.
- Done: `format`/`format:check` scripts; CI runs `format:check` after lint.
- Done: `THREAT_HUNTER_CHROMIUM_PATH` points both Chromium projects at a preinstalled browser when it differs from the pinned Playwright build.
- Not done: a global Playwright expect timeout was rejected — raising timeouts across every assertion would loosen timing, which AGENTS.md forbids. Slow waits stay explicit per assertion.

Verification: lint, format check, types, 273 units, build, budgets and the 38 reformatted-spec Chromium checks (startup, recovery, campaign) passed locally.

## Phase 2 — Startup and save reliability · done

Goal: remove plausible causes of the intermittent "Begin stays disabled" failure and the WebKit learning-link race, and make the next failure diagnosable.

- Done: `persistence/workerClient.ts` is the one browser client for the M01, P1 and expansion validators. Messages are still posted immediately (input captured at call time); the 20-second deadline applies only to the oldest outstanding job and starts once earlier jobs reply, so a case inspection queued behind journey/archive checks can no longer time out on their behalf. A deadline or worker error still terminates the worker, rejects every pending job and uses a fresh worker on retry. Five unit checks cover queued deadlines, overdue rejection, fresh-worker retry, per-job errors and late replies.
- Done: P1/expansion save notifications post `{ mission }`; controllers ignore other missions' commits instead of restarting their inspection. Unscoped messages (older builds) still refresh; Journey still treats any message as stale. Unit-checked for both families.
- Done: P1/expansion pre-start actions (learning link, assistance choice) are disabled and the panel is `aria-busy` while inspection runs, so a saved case replacing the panel cannot consume a premature click. The expansion context line no longer says "Preparing…" after inspection ends.
- Done: P1/expansion save regions expose `data-readiness` (`busy`, `temporary`, `validation-error`, `no-writer`, `waiting-for-other-tab`, `ready`) and record `threat-hunter:<mission>:<readiness>` performance marks. No world data is exposed. An e2e regression delays the expansion validator and requires busy → ready, a disabled-then-enabled learning link and navigation to M01; it failed before the change.
- Not established: whether either fix caused the historical live M02 failure. The next occurrence should be read from `data-readiness` and the marks.

Verification: lint, format check, types, 280 units (seven new), build, budgets and all 188 Chromium desktop/phone checks passed locally.

## Phase 3 — Accessibility and focus parity · done

Goal: every family moves focus and announces changes the way M01 does.

- Done: the debrief heading receives focus when a case closes in M01, P1 and expansion (`ui/useFocusOnMount.ts`).
- Done: expansion Review focuses and scrolls to its confirmation; the navigation Review button is disabled while blocked; `<main>` takes `tabIndex={-1}` for the skip link; debrief headings are one level lower, so the page keeps a single `h1`.
- Done: P1/expansion announce new deliveries through a polite `aria-live` region (`ui/DeliveryAnnouncer.tsx`, deliberately not `role="status"` so labelled save-status regions stay unique). The first render and a new run establish a silent baseline; reading and navigation announce nothing.
- Done: the expansion Leads panel keeps the opening lead and adds the latest delivery; the mobile art fallback drops the responsive `<source>`, as M01 does.

Verification: lint, format check, types, 280 units, build, budgets and all 190 Chromium desktop/phone checks passed locally. New checks (expansion announcement/review/debrief focus and single `h1`; P1 and M01 debrief focus) failed against the previous source.

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
