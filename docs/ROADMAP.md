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

## Phase 4 — Shared presentation across families · done

Goal: P1 and expansion get the M01 presentation work instead of older patterns.

- Done: P1 and expansion wrap their topbar, save/readiness region and audio controls in `UtilityHeader`. Expansion's separately sticky context bar and P1's fixed 6rem help-anchor margin are gone; clearance comes from the measured header. Only a visible header publishes the clearance variables (hidden mounted cases no longer overwrite them) and only the last publisher clears them. At desktop widths both headers stay sticky with Mute reachable after scrolling; taller phone headers scroll away, as M01's oversized header does. The expansion readiness copy is visually hidden rather than `display: none`, and its save actions no longer squeeze the status text.
- Done: P1 records and collection windows use public source names (`campaign/labels.ts`); expansion records and the source filter use names from the public query catalogue with a readable fallback (`expansion/labels.ts`).
- Done: expansion review/follow-up summaries and their select options share one label map instead of `replaceAll("_", " ")`; "owner: none" reads as an explained closure in both families. Option values and saved findings are unchanged.

Verification: lint, format check, types, 280 units, build, budgets and all 200 Chromium desktop/phone checks passed locally, including new header-clearance checks for M04/M02 at 390/1280px with a switch back to M01, and readable expansion source names.

## Phase 5 — Startup performance · done (measurement; no speed change shipped)

Goal: reduce main-thread work before first interaction, measured with more than three samples.

- Done: `profile:startup` accepts `--samples=N`, `--fresh-browser` and `--label=`, writes a median/p90 summary and honours `THREAT_HUNTER_CHROMIUM_PATH`. Defaults keep the original three-sample method.
- Measured: on the current build (`/assets/index-DVbZWaUn.js`) ten fresh-browser cold loads at 4 Mbps / 100 ms / 4× CPU gave median **2158 ms**, p90 2416 ms; interleaved repeats gave 2081 and 2135 ms, and the shared-browser method 2108 ms ([baseline](verification/roadmap-startup-baseline.json), [A/B](verification/roadmap-startup-ab.json)). The historical 4.6–27 s captures were taken on a contended host; this does not pass the reference-device gate.
- Rejected: Zod `jitless` mode (medians 2085/2169/2175 ms vs baseline 2158/2081/2135 ms) — no measurable gain, not shipped.
- Not attempted: worker prefetch (30–65 ms fetch; unmeasurable with the cache-disabled method) and lazy post-Begin M01 screens (offline Begin needs them before case-ready; low expected gain at a ~2.1 s median). Revisit with named-device traces.

## Later — needs a decision or broader review

- Merge the near-identical P1/expansion storage modules and controller hooks behind the existing storage/adversarial suites (high-stakes persistence code).
- Align action terminology across families ("Export save", "Confirm and close case", temporary play wording) together with PlayPrimer copy and e2e selectors.
- P1/expansion debrief progressive disclosure and itemised review with quiet Edit actions, matching M01.
- Move content-package Zod validation from module load to build/tests (touches frozen engine/content modules; needs a compatibility decision).
- Release-and-reacquire Web Locks on `pagehide`/`pageshow` if diagnostics show a back/forward-cached page holding a mission lock.
