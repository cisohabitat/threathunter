# Threat Hunter: Silent Intrusion

A single-player cybersecurity investigation game for newcomers and cybersecurity generalists. Investigate fictional Northstar Services, test ordinary and suspicious explanations, and make a scoped, evidence-backed finding.

**Status: internal M01 development build, not completed P0 or a public release.**

## Authoritative design

[Game Design Document v4.3](docs/THREAT_HUNTER_GAME_DESIGN_DOCUMENT_v4.3.md) is the implementation baseline. The uploaded document is preserved unchanged. Sections 8, 9 and 13 govern commands, scheduling and scoring; Appendix A governs M01 fixtures. `src/content/m01.json` is extracted directly from Appendix A; gameplay ruleset remains `4.0.0`. Presentation and save formats are versioned separately.

Future changes must respect this document. Record intentional deviations in `docs/IMPLEMENTATION_STATUS.md`; never silently alter the reference fixture or represent an internal build as a completed release.

## Run

Use Node.js 24 (minimum supported 22.12) and the committed npm lockfile.

```sh
npm ci
npm run dev
```

Open the Vite URL. Start a case, inspect the lead, acquire sources, cite delivered observations in the Case File, test an alternative, record limits, and review/confirm the finding. Reading does not advance simulation time. No accounts, backend, telemetry or real security data are used.

## Verify

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Engine and persistence tests cover all ten Appendix B golden traces, source cutoffs, verification delivery, static/dynamic caching, command idempotency, scope, same-tick response priority, sparse-twin fairness, replay, import corruption and stale writes. Browser tests cover case completion, reload/resume, offline continuation, free navigation and 320px reflow on Chromium desktop and phone emulation. Emulation does not establish physical iOS/Android compatibility.

## Architecture

- React + TypeScript + Vite + Tailwind, using the GDD palette and an original SVG night-scene composition.
- Pure authoritative engine and evidence-based scoring, isolated from rendering and wall-clock time.
- Zustand stores navigation only. Components receive permitted `PlayerView` projections; hidden truth appears only in the closed-case debrief.
- Zod command/import schemas; Dexie transactions, expected-revision checks, previous-save retention and replay-based portable JSON exports.
- Web Locks restrict writes to one tab where supported. A failed save is shown as **Not saved**; temporary mode is an explicit choice, with export available.
- Motion provides nonessential, reduced-motion-aware presentation. Howler is pinned for the required future reviewed voice pack; recordings and its playback integration are not implemented yet.

After the application is loaded, all active-case text and rules are local. Offline cold-start is not promised. Saves belong to one browser origin and do not follow a different device or deployment URL; export first. The checksum detects accidental corruption, not tampering.

## Deployment and release

`vercel.json` configures a static Vite build and SPA refresh. GitHub Actions runs lint, typecheck, unit tests, build and browser smoke tests. No deployment or production promotion is performed by this change.

See [implementation status and release gates](docs/IMPLEMENTATION_STATUS.md). Reviewed voice, artwork/device acceptance, accessibility and human playtesting remain mandatory before completed-P0 sign-off. M04, M07 and campaign expansion follow P0 acceptance.
