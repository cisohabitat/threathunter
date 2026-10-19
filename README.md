# Threat Hunter: Silent Intrusion

A single-player cybersecurity investigation game for newcomers and cybersecurity generalists. Investigate fictional Northstar Services, test ordinary and suspicious explanations, and make a scoped, evidence-backed finding.

**Live:** https://threathunter-rosy.vercel.app

**Status: deployed internal M01 development build; completed-P0 acceptance is still pending.**

## How to play

1. Choose **Guided investigation** (recommended), then **Begin investigation** or **Resume investigation**.
2. Morgan explains your role: investigate an unfamiliar finance login at 02:13 and decide what the evidence supports.
3. Select **Compare sign-ins · 1 step**. Read the side-by-side comparison, then **Add these observations to Case File · free**.
4. Choose your next check: approved work, device registration, session activity or verified-owner contact. Explore shows the newest observation first and keeps earlier snapshots available. Use **Cite in finding**, **Test another explanation**, or **Note a limitation** directly on an evidence card; all three are free.
5. Open **Case File** and move through **Explanation → Evidence → Unknowns → Next step**. Your evidence-card choices carry over. Choose a finding/confidence, describe the alternative you tested, record relevant limits and select a next action. You can revisit any step and review at any time. Optional notes have an explicit save button and are also saved when reviewing.
6. Select **Review finding**, then **Confirm and close case** when ready. The debrief explains your finding and separates it from the operational outcome. Use **What I knew then** to view only observations delivered by a selected step. Expand the optional quality breakdown for your score, specific feedback and links to the relevant observations.

Reading, navigation and evidence citation are free. New acquisitions, verification requests and deliberately advancing the world consume simulation steps. There is no real-time countdown. An unresolved finding is valid when its limits and follow-up are explained.

Use **Hide guidance** / **How to play** to change assistance at any time. The game remembers that preference; independent mode uses the same facts, costs and scoring.

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

Engine and persistence tests cover all ten Appendix B golden traces, source cutoffs, verification delivery, static/dynamic caching, command idempotency, scope, same-tick response priority, sparse-twin fairness, replay, import corruption and stale writes. The latest local verification passed 38 engine/persistence tests and 14 browser checks. Browser tests cover case completion, reload/resume, offline continuation, free navigation, guided acquisition/citation, remembered assistance preferences, direct evidence roles, a complete reference-scored finding, historical evidence cutoffs and 320px reflow on Chromium desktop and phone emulation. Emulation does not establish physical iOS/Android compatibility.

## Architecture

- React + TypeScript + Vite + Tailwind, using the GDD palette and an original SVG night-scene composition.
- Pure authoritative engine and evidence-based scoring, isolated from rendering and wall-clock time. Post-close feedback links to delivered observations and a frozen copy of the finding; the M01 numeric rubric and source fixture remain unchanged.
- Zustand stores navigation only. Components receive permitted `PlayerView` projections; hidden truth appears only in the closed-case debrief.
- Zod command/import schemas; Dexie transactions, expected-revision checks, previous-save retention and replay-based portable JSON exports.
- Web Locks restrict writes to one tab where supported. A failed save is shown as **Not saved**; temporary mode is an explicit choice, with export available.
- Motion provides nonessential, reduced-motion-aware presentation. Howler is pinned for the required future reviewed voice pack; recordings and its playback integration are not implemented yet.

After the application is loaded, all active-case text and rules are local. Offline cold-start is not promised. Saves belong to one browser origin and do not follow a different device or deployment URL; export first. The checksum detects accidental corruption, not tampering.

## Deployment and release

`vercel.json` configures a static Vite build and SPA refresh. The existing Vercel project `threathunter` is connected to this repository; pushes to `main` trigger production deployment at the live URL above. Verify that the deployment reaches **READY** and serves the intended commit before reporting success. Avoid creating a second deployment if Git integration has already started one.

GitHub Actions is configured to run lint, typecheck, unit tests, build and browser smoke tests. Local passing checks are separate from GitHub CI status; the observed CI runs were queued when last inspected.

See [implementation status and release gates](docs/IMPLEMENTATION_STATUS.md). Reviewed voice, artwork/device acceptance, accessibility and human playtesting remain mandatory before completed-P0 sign-off. M04, M07 and campaign expansion follow P0 acceptance.

## Keeping documentation current

Every task must review `AGENTS.md` and this README, updating relevant guidance in the same change as the implementation. Keep player instructions, commands, deployment details and limitations synchronized. Update [implementation status](docs/IMPLEMENTATION_STATUS.md) when capabilities or release evidence change. The full maintenance policy is in [AGENTS.md](AGENTS.md).
