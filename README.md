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

## Optional voice and sound

Open **Voice & sound → Enable voice and sound**. The complete M01 pack loads separately from the text game (about 1 MB). Once **Voice pack ready** appears, it can play offline for that loaded session. Choose **Play briefing**, a Morgan guidance topic, or—after closure—**Read my debrief** and **Read operational outcome**. All 16 spoken clips, four interface sounds and the ambience loop are pre-generated static assets; no runtime speech service, microphone or account is needed.

Use **Skip speech**, **Replay last line**, the always-reachable **Mute all**, and separate master/voice/effects/ambience levels. Captions default on; a transcript remains available when captions are hidden. **Screen-reader-friendly audio** disables unsolicited speech while keeping on-demand playback. Fresh sessions start muted; level and accessibility preferences persist separately from saves. Navigation clears stale speech and backgrounding stops playback.

This is a **candidate synthetic voice pack, pending human listening/device review**. See the [production and rights record](docs/audio/PRODUCTION.md). If audio cannot load or play, continue with the same text and game rules.

## Saves and recovery

**Saved on this device** appears only after a successful local transaction. If saving fails, your accepted action stays in memory. Use **Export save**, **Retry saving retained progress**, or explicitly continue without saving. Temporary mode shows the last committed revision; **Try saving this session** saves the retained actions together without charging their steps again. A write conflict preserves both versions: export your temporary progress, then explicitly reload the saved case.

A damaged or incompatible save opens recovery choices instead of starting over silently. **Export recovery original** downloads the untouched stored record for inspection; it is not a portable import file. Restore a validated previous save when available, or confirm a restart. The most recent recovery original remains on this device and available for export after recovery. Export it elsewhere for a separate backup; browser storage can still be cleared or evicted. New **Export save** files use format 2 with a versioned causal simulation snapshot. Existing format-1 files remain readable by this build; older deployed builds cannot read format 2. Loading an old local save does not rewrite it: the next successful save upgrades it and retains its original as the previous backup.

**Try another approach** preserves the completed case and starts a fresh run of the same authored situation. On home, **Saved completed investigations** exports those frozen cases for later review. **Start a separate case** selects a new situation.

A waiting read-only tab refreshes the committed case when the writer tab closes. Reloading discards unsaved memory only after an explicit choice in the recovery controls. Browsers without Web Locks support read/export and explicitly chosen temporary play; they do not write shared saves. Actual device termination, storage eviction and private-session behavior still need device testing.

The home now selects separate landscape/portrait candidate artwork, with a text-safe composition and SVG failure fallback. Source PNGs and lossless audio masters are versioned outside site delivery. The art and voice still require human acceptance.

Use **Field guide** for terminology, scoped entity profiles and authority. Each source question also explains what it can and cannot establish. These free views never advance time.

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
npm run check:budgets
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
npm run test:e2e:cross
```

Engine and persistence tests cover all ten Appendix B golden traces, source cutoffs, verification delivery, static/dynamic caching, command idempotency, scope, same-tick response priority, sparse-twin fairness, replay, import corruption and stale writes. See the [current verification ledger](docs/verification/RESULTS.md) for executed results, browser-engine coverage, production measurements and remaining device gaps. Browser tests cover case completion, reload/resume, offline continuation, free navigation, guided acquisition/citation, remembered assistance preferences, direct evidence roles, a complete reference-scored finding, historical evidence cutoffs, offline full-pack audio, mute/skip/transcript controls, audio-failure fallback, save invariance, injected quota failure/retry, damaged-save recovery, incompatible-save restart, writer handoff, old-save upgrades (including failed writes), receipt durability and 320px reflow on Chromium desktop and phone emulation. Emulation does not establish physical iOS/Android compatibility.

## Architecture

- React + TypeScript + Vite + Tailwind, using the GDD palette and an original SVG night-scene composition.
- Pure authoritative engine and evidence-based scoring, isolated from rendering and wall-clock time. Seven fixed scheduler phases resolve business/adversary dependencies, control-first ties, source recording and queries/checks; an explicitly revealed post-close timeline distinguishes the world, collection and acquisitions. Post-close feedback links to delivered observations and a frozen copy of the finding; the M01 numeric rubric and source fixture remain unchanged.
- Zustand stores navigation only. Components receive permitted `PlayerView` projections; hidden truth appears only in the closed-case debrief.
- Zod command/import schemas; Dexie transactions, expected-revision checks and previous-save retention. Format-2 saves include a versioned case manifest, engine/acquisition snapshots, draft, pending checks, original receipts, canonical commands, revision boundaries and state hashes. Snapshot fields are audited against deterministic command replay before restoration; only commands after the snapshot boundary execute on the restored state.
- Web Locks restrict writes to one tab where supported. A failed save is shown as **Not saved**; retry retains accepted actions, temporary mode is explicit, and damaged-save recovery preserves the original for export. The controller receives committed receipts only after the transaction completes; failed writes keep memory-only receipts.
- Motion provides nonessential, reduced-motion-aware presentation. Howler is loaded on opt-in and plays a complete, pre-generated candidate voice/sound pack. All scripts, checksums, source attribution and delivery metadata are versioned. Human listening and physical-device audio review are still pending.

See [save formats and compatibility](docs/SAVE_FORMAT.md) for the migration and replay contract.

After the application is loaded, all active-case text and rules are local. Offline cold-start is not promised. Saves belong to one browser origin and do not follow a different device or deployment URL; export first. The checksum detects accidental corruption, not tampering.

## Deployment and release

`vercel.json` configures a static Vite build and SPA refresh. The existing Vercel project `threathunter` is connected to this repository; pushes to `main` trigger production deployment at the live URL above. Verify that the deployment reaches **READY** and serves the intended commit before reporting success. Avoid creating a second deployment if Git integration has already started one.

GitHub Actions is configured to run lint, typecheck, unit tests, build and browser smoke tests. Local passing checks are separate from GitHub CI status; the observed CI runs were queued when last inspected.

See the [full GDD acceptance checklist](docs/GDD_ACCEPTANCE.md), [creative handoff](docs/creative/README.md), [human/device test protocol](docs/verification/HUMAN_TEST_PROTOCOL.md), and [implementation status](docs/IMPLEMENTATION_STATUS.md). Reviewed voice, artwork/device acceptance, accessibility and human playtesting remain mandatory before completed-P0 sign-off. M04, M07 and campaign expansion follow P0 acceptance.

## Keeping documentation current

Every task must review `AGENTS.md` and this README, updating relevant guidance in the same change as the implementation. Keep player instructions, commands, deployment details and limitations synchronized. Update [implementation status](docs/IMPLEMENTATION_STATUS.md) when capabilities or release evidence change. The full maintenance policy is in [AGENTS.md](AGENTS.md).

Waiting read-only tabs receive committed-save notifications where BroadcastChannel is available and may inspect the current case. Ownership transfer reloads durable state; read-only note buffers follow accepted notes even after returning from another screen, without replacing a writer’s local unfinished edits. Missing or rejected Web Locks access permits explicit temporary play and export, with durable writes disabled.
