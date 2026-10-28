# Threat Hunter: Silent Intrusion

A single-player cybersecurity investigation game for newcomers and cybersecurity generalists. Investigate fictional Northstar Services, test ordinary and suspicious explanations, and make a scoped, evidence-backed finding.

**Live:** https://threathunter-rosy.vercel.app

**Status: twelve-case internal candidate plus constrained seeded free hunts. Required player, device, accessibility and creative/listening reviews remain deferred, not passed.**

## How to play M01: The Midnight Login

**Your job:** explain one unusual login. Decide whether it looks like approved work, unauthorised use, or something you cannot yet explain. You finish by submitting your finding; you can include uncertainty.

The first case defaults to a focused **question → result → decision** flow. Select **Begin investigation**, then **Compare usual sign-ins** Read the comparison and choose what to learn next: whether overnight work was approved, whether the computer is registered, or what the account did afterward. Each new check costs one simulation step; reading never advances a live countdown.

Every delivered record stays in **Your notebook** automatically. This does not cite it in your report. Beside a result, you can explicitly record what it means for the competing explanation, or leave it undecided. Static results reopen for free; session activity can be refreshed through a later step without overwriting an earlier snapshot. An owner-verification request uses the verified directory callback, costs one step and completes three steps after the request; keep checking other sources or deliberately wait while it is pending.

Choose **Make my call** to select an explanation and confidence, mark the supporting facts, link any relevant uncertainty and choose what the response team should do next. Your accepted choices build an editable report. **Review finding** remains available throughout, including for an incomplete finding; **Confirm and close case** is the only action that ends the case. The debrief explains what your evidence supported and separates investigation quality from the simulated operational outcome. Its numeric score is optional.

**Investigate further · all tools and settings** opens all sources/comparison tools, the full four-part Case File with optional notes, or the timeline. **Back to guided investigation** returns to the focused flow with accepted choices intact. **Play settings** on home contains both assistance modes and remembers your preference; **Switch to independent investigation** opens the full workspace with identical facts, costs and scoring. This progressive disclosure replaces the earlier always-visible home mode chooser and citation-led guide; no gameplay or save-format revision is involved.

Use **Compare observation · free** in the full workspace to compare two immutable snapshots, including their source, scope, event time, cutoff, delivery and lineage. Comparison never cites evidence or changes your finding. The notebook, reading and navigation never issue gameplay commands. Source acquisition, verification requests and explicitly waiting consume steps. An unresolved finding is valid when its limits and follow-up are explained.

If you opened a later case or a free hunt and feel lost, choose **New here? Learn with The Midnight Login** in its introduction. The first case teaches the controls before the campaign adds more tools. Loaded investigations remain available when switching cases.

The focused redesign has 273 unit checks and complete browser journeys for evidence-backed findings, enlarged text, offline resume and note retention. Hosted verification caught a 320px font-wrapping issue where the fixed mute control covered the first action; the shorter opening now retains the same coverage assertions and adds a wider-fallback-font check. All 48 affected local browser checks pass. Exact-commit hosted/live results remain separate from uncoached novice playtesting, which is pending. See [implementation status](docs/IMPLEMENTATION_STATUS.md) for build identity and retained initial failures.

## Optional voice and sound

Open **Voice & sound → Enable voice and sound**. The complete M01 pack loads separately from the text game (about 1 MB). Once **Voice pack ready** appears, it can play offline for that loaded session. Choose **Play briefing**, a Morgan guidance topic, or—after closure—**Read my debrief** and **Read operational outcome**. All 16 spoken clips, four interface sounds and the ambience loop are pre-generated static assets; no runtime speech service, microphone or account is needed.

Use **Skip speech**, **Replay last line**, **Mute all** in the utility toolbar, and separate master/voice/effects/ambience levels. Captions default on; a transcript remains available when captions are hidden. **Screen-reader-friendly audio** disables unsolicited speech while keeping on-demand playback. Fresh sessions start muted; level and accessibility preferences persist separately from saves. Navigation clears stale speech and backgrounding stops playback.

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
npm run format:check
npm run typecheck
npm test
npm run build
npm run check:budgets
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
npm run test:e2e:cross
```

`npm run format` applies Prettier; recorded evidence under `docs/`, authored content JSON and `index.html` are excluded so their hashed or historical bytes never change. If a preinstalled Chromium does not match the pinned Playwright build (for example in a sandbox), set `THREAT_HUNTER_CHROMIUM_PATH` to its executable instead of reinstalling.

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

GitHub Actions is configured to run lint, typecheck, unit tests, build and browser smoke tests. Local passing checks are separate from GitHub CI status; the [baseline b3e309b run](https://github.com/cisohabitat/threathunter/actions/runs/39349995606) passed, including Chromium, Firefox and WebKit. New commits require their own observed result.

See the [full GDD acceptance checklist](docs/GDD_ACCEPTANCE.md), [creative handoff](docs/creative/README.md), [human/device test protocol](docs/verification/HUMAN_TEST_PROTOCOL.md), [implementation status](docs/IMPLEMENTATION_STATUS.md) and the phased [improvement roadmap](docs/ROADMAP.md). Reviewed voice, artwork/device acceptance, accessibility and human playtesting remain mandatory before completed-P0 sign-off. The user explicitly deferred review-first sequencing so M04/M07 development can proceed. Their new rules and fixtures are documented separately; this is not P0/P1 release acceptance.

## Keeping documentation current

Every task must review `AGENTS.md` and this README, updating relevant guidance in the same change as the implementation. Keep player instructions, commands, deployment details and limitations synchronized. Update [implementation status](docs/IMPLEMENTATION_STATUS.md) when capabilities or release evidence change. The full maintenance policy is in [AGENTS.md](AGENTS.md).

Waiting read-only tabs receive committed-save notifications where BroadcastChannel is available and may inspect the current case. Ownership transfer reloads durable state; read-only note buffers follow accepted notes even after returning from another screen, without replacing a writer’s local unfinished edits. Missing or rejected Web Locks access permits explicit temporary play and export, with durable writes disabled.

Long save histories are validated in an isolated browser worker, including imports, commit envelope/hash preparation and save recovery. The validator loads before case-ready and works offline for the loaded session. Failed or slow validation leaves stored data untouched; retry keeps the accepted in-memory action. See the [save-history lab evidence](docs/verification/save-history.json). The semantic audit still replays history; very large saves can take longer and have a 20-second validation deadline.

With a production preview running (`npm exec vite preview -- --host 127.0.0.1 --port 4173`), run `npm run verify:history` to reproduce the save-history lab. `npm run verify:production` and `npm run verify:crash` reproduce the load/interaction and abrupt-process recovery checks.

For performance-only reruns, `npm run verify:production -- --no-screens` keeps the existing visual reference frames; the default command still captures them. The current free-interaction probe alternates Case File tabs and returns to Explanation; its ten accepted finding edits use the current labels. Keep new output separate from historical measurements when using `--output=/tmp/report.json`.

`npm run profile:startup` records three sequential cold loads with cache disabled, compressed resource sizes/encodings and main-thread long tasks at 4 Mbps / 100 ms / 4× CPU. It requires the production preview and retains every sample in `docs/verification/startup-profile.json`; use `-- --output=/tmp/profile.json` for an exploratory run. Add `-- --samples=10 --fresh-browser --label=name` for a repeatable comparison; the report adds a nearest-rank median/p90 summary. `THREAT_HUNTER_CHROMIUM_PATH` also applies here. Responsive artwork is preloaded from HTML. An early-validator experiment was slower and was removed; inspection/recovery behavior is unchanged. `verify:production` also reports in-browser click→Working→Saved latency alongside its original automation-inclusive measurement; `--output=...` preserves historical reports. These lab tools do not establish physical-device acceptance.

M01 browser controllers and journey readers import `persistence/browserStore.ts`. The retained `persistence/saves.ts` facade still exports the same synchronous reader/writer APIs for tests and authoring. Portable/legacy schemas run in the preloaded validation worker; the non-browser validation adapter imports them only when needed. P1 and expansion validators apply the same tooling-only dynamic import, while their browser audits remain in their existing workers. This removes duplicate reader initialisation from the interface without changing save bytes, compatibility IDs, acknowledgement rules, audits or recovery. Tooling preparation captures a detached input before awaiting a lazy import, so later caller edits cannot change a pending commit/export. Build budgets reject reintroducing those tooling schemas into an active case's static interface graph; the cold-load profiler also rejects fetching that reader chunk.

When browser validation cannot start for an existing save, offer an explicit raw stored-data recovery export without validating or rewriting it. Keep that recovery copy distinct from portable imports; temporary play must leave the original row unchanged.

Save-history audits now replay into a detached engine state, avoiding a copy of the growing history for every command. Live commands remain immutable, and validation/migration rules are unchanged. `npm run verify:history` also checks complete-state equivalence against ordinary replay and a bounded 20,000-command Node import; large browser timeline rendering and physical-device performance remain separate acceptance work.

## Large histories and portable exports

Timeline and debrief history show up to 50 entries per page, with keyboard-accessible first/previous/next/latest controls. Timeline remembers its page when you change investigation screens. Pagination and the debrief delivery-step filter are free and never alter the finding.

Normal exports are compact format-2 JSON prepared in the background validator without changing receipt acknowledgements. When a full snapshot exceeds 2 MiB, the writer uses a revision-zero checkpoint plus every original command and the final state hash. The reader reconstructs the same case; no actions are removed. If even the minimal envelope exceeds 2 MiB, saving/export reports an error and retains progress. The 20,000-command limit still applies. See [save compatibility](docs/SAVE_FORMAT.md) and [current verification](docs/verification/RESULTS.md).

## Play the proactive hunts

Choose **M04 · The Forgotten Server** or **M07 · The Missing Logs** under **More investigations**, below the home brief. Each mission keeps its own active save and completed-case archives. Switching investigations preserves accepted in-memory work and silences inactive audio. Export before changing browser/device or clearing storage.

Use **Guided investigation** for optional three-level help: **Ask for a nudge → Suggest a source → Show me**. The last step focuses the relevant enquiry, scope selector, collection tools, timeline or Case File and explains its cost; you still choose whether to act. **Listen to this nudge** uses the existing matching transcript/voice clip after audio opt-in. **Independent investigation** hides help without changing sources, costs or scoring; each hunt remembers its preference. Open **Field guide · words, scope and authority** for plain-language terms and response boundaries.

**Assistance used** records hint requests separately from assessment, with an optional JSON export. It covers only the mounted run in this tab and retains its latest 100 requests; reloading starts a new assistance record. It is not part of a portable game save and nothing is uploaded.

**M04 — The Forgotten Server:** begin a planned account review, acquire **Compare account activity by host**, then select the newly discovered host in **Investigation scope**. Check its billing dependency and compare the specific migration approval with session origin, task provenance or application access. Cite acquired observations, mark evidence used to test an alternative, and make a scoped Case File recommendation. An undocumented host is not a shutdown target; the response team owns permitted session restrictions.

**M07 — The Missing Logs:** compare declared coverage with actual heartbeats, inspect collector configuration and the limited identity source, then select the relevant service. A controlled verification costs one step and completes three steps after request. Future collection takes two steps to activate; choose a four-step window for a test requested afterwards, or plan the check before activation. Use **Timeline** to advance deliberately or keep acquiring other sources. Review the completed window, name the missing historical source/interval, and assign repair/reverification. Successful collection now does not recover historical activity.

In both hunts, **Case File → Review finding → Confirm and close case** freezes your decision-time knowledge. Numeric grading is optional and separate from the explicitly revealed world outcome. Reading, scope selection and evidence roles are free. The debrief offers earlier-step filtering, source/world/acquisition tracks, evidence-linked feedback and same-world replay with a new run ID.

Each hunt has a complete candidate pre-generated voice pack with the same consent, captions/transcript, channel levels, mute, skip/replay and offline loaded-session controls as M01. Packs load in full independent of private truth. All listening/creative reviews remain deferred. Lossless masters are archived outside delivery; no runtime TTS, account, backend or microphone is involved.

P1 exports use a separate versioned `threat-hunter-p1` envelope. Select the matching mission before importing; M01 files retain their existing format/readers. Durable receipt acknowledgement occurs only after the transaction succeeds. Failed writes keep accepted work for export/retry, damaged records retain an original recovery copy, and browsers without Web Locks require explicit temporary play. See [P1 rules and matrices](docs/P1_MISSIONS.md), [review deferral decision](docs/DESIGN_DECISIONS.md) and [save compatibility](docs/SAVE_FORMAT.md).

`npm run verify:guidance` checks the production-preview P1 help flow, focus targets, separate assistance export and opted-in offline nudge without changing portable saves. It requires preview on port 4173 and writes a lab report and two help reference frames.

## Your investigation journey

On home, **Check saved progress** reads and validates all twelve authored cases stored in this browser. Start with M01 → M04 → M07; later cases in the guided path unlock through completion at any score. **Show all twelve authored cases** and **Choose independent case order** let you investigate out of order with the same facts, costs and scoring. Each debrief now offers the next investigation while retaining its saved or in-memory finding. M12 offers a return to M01.

The overview distinguishes saved open/closed cases, preserved completed archives, recovery needs and unavailable validation. It checks at most five archives per mission and explicitly labels incomplete/unavailable checks. Recovery backups and temporary/unsaved closures do not count as saved completion. **Refresh saved progress** after saving or importing; where supported, save-change notifications mark an older snapshot as stale. Checking progress never repairs, rewrites, upgrades or removes a case, and creates no separate profile or cloud account.

`npm run verify:journey` verifies production-preview continuation, low-score completion, a read-only progress check and unchanged prior-case export. It requires preview on port 4173 and writes a report and phone/tablet reference frames.

The journey's progress announcement is separate from **Save and readiness**. A completed overview check does not save an investigation; rely on its case's **Saved on this device** status.

Run `npm run verify:comparison` against a production preview on port 4173 (or `THREAT_HUNTER_TEST_URL`). It imports real three-mission fixtures, compares snapshots at 320px, checks sampled accessibility and unchanged portable exports, and writes [comparison evidence](docs/verification/comparison.json). This is automated lab evidence, not human or device acceptance.

## The complete authored campaign

After the three introductory cases, investigate **M02 Too Many Alerts**, **M03 The Trusted Employee**, **M05 Stolen Identity**, **M06 Moving Quietly**, **M08 The Cloud Connection**, **M09 The Silent Administrator**, **M10 The Insider Question**, **M11 The Unseen Adversary** and **M12 Operation Shadowfall**. Stable mission IDs describe learning purposes rather than a false consecutive release order. Each case has its own task, scope, authority, competing explanations and evidence-based debrief. Use priority queues, task/permission comparisons, acquired scope pivots and claim relationships; a selected explanation receives no pre-close correct/wrong feedback.

In expansion cases, open **Explore**, establish the task/business consequence, choose an acquired scope, then select a source question. Query costs and cutoffs are explicit. A verified business check costs one step and is due at request-start +3. M08/M11 can enable a bounded future-only collection test for two steps. The Case File records evidence roles, alternatives, limits, confidence and handoff; notes are explicitly saved or flushed on review. A responder can restrict only the supported named session, with explicit confirmation. Review/close remains available for incomplete findings.

Every case ships an optional complete 21-entry voice pack. Expansion packs have their own opening/first guidance, literal shared neutral speech and unchanged M01 sounds. All scripts, captions, measured durations and delivery/master hashes are retained; short first-guidance v2 clips preserve their original v1 candidates. Listening/art/device acceptance remains pending. [Expansion rules and source matrices](docs/P2_MISSIONS.md) specify both strong routes, sparse twins and the independently versioned rubric. Existing M01/P1 saves and rules remain unchanged.

## Seeded free hunts and local learning

Choose **Seeded free hunt · validated templates**, enter a seed and begin. The fixed generator selects a validated causal template, world/collection family and disclosed source/response profile. The full manifest reproduces it; records are derived from the causal selection. The active free hunt and completed archives are separate from authored campaign completion. **Try another approach** repeats identical conditions; **Start another seeded hunt** archives the durable closed run and uses the new seed. Temporary runs require export acknowledgement before replacement. These are local practice cases without a runtime LLM, account or leaderboard.

**Notice your investigation habits → Check my local investigation examples** reads at most one validated closed example per authored case, inspecting at most five archives. It recognises tested alternatives, bounded scope, useful visibility findings and preliminary handoffs. These are descriptive in-game examples rather than a competency or personality diagnosis. Invalid/unavailable reads and limits are explicit; there is no profile database or analytics.

## Routes and emergency export

Case links use `/case/m01` through `/case/m12`; seeded hunts use `/hunt/free`. Refresh resumes the selected case's stored state, and browser history changes only navigation. Loaded controllers stay mounted when switching cases, retaining accepted volatile work and stopping inactive audio. The legacy M01 home/Begin flow remains available at `/`.

If the interface fails, **Export stored recovery data** can download one exact active/previous or preserved-original row using a read-only path independent of game rendering and validation. The recovery JSON is for inspection, separate from portable imports. It preserves stored data; uncommitted memory that was lost in a rendering failure is not reconstructed. See the [full completion worklist](docs/GDD_COMPLETION.md) for implementation versus acceptance evidence.

Each expansion Case File has four steps: **Explanation → Evidence → Unknowns → Next step**. Review is available throughout, including for an incomplete finding. In the save controls, **Import another backup** preserves the current saved row before replacing a fully saved matching case; save optional notes first. Previous imported versions remain exportable, and replay never overwrites an earlier completed run sharing its ID. Free-hunt backups belong to their separate free-hunt slot.

`npm run verify:expansion` checks a running production preview on port 4173 and writes the current twelve-case extension's workspace screenshots and lab report. Campaign groups cover foundations, context, boundaries and synthesis. These automated reports remain separate from deferred player, listening and physical-device reviews.

Unfinished M04/M07 notes stay in their mounted Case File when navigating and block backup replacement until explicitly saved. The browser warns before leaving with unfinished notes. Run local browser engines sequentially; concurrent runners require separate artifact directories.

The unit suite now contains **273 checks**, including three tooling snapshot regressions and four first-case guidance regressions. Final local verification includes 32 targeted unit checks and 34 Chromium desktop/phone storage, recovery and offline checks; the initial full-run timeout and successful isolated reruns are recorded in the ledger. Transfer budgets pass. Performance acceptance remains open: the latest three cold-load samples were 11.43 / 4.65 / 4.98 seconds against the six-second target. Duplicate portable-reader initialisation is removed from the interface, but readiness remains inconsistent; reference-device profiling and deferred human reviews are still required. See [the completion worklist](docs/GDD_COMPLETION.md) and [verification ledger](docs/verification/RESULTS.md) for methods and failed/retried runs. Each publication also requires observed hosted CI, the existing Vercel deployment and matching live assets/routes.

The emergency-recovery browser test injects a lazy-module failure on a direct case route, then verifies exact raw-row export without changing storage. This avoids racing the home navigation controls while deliberately replacing the whole interface.

The home hero now labels the complete twelve-case catalogue consistently with the journey. Earlier production-preview reports keep their captured artifact hashes; the final count-copy correction does not change game rules, saves or media.

The reader-boundary candidate passed 34 selected local Chromium desktop/phone checks covering M01/P1/expansion recovery, failed writes, writer transfer and offline flows. Final lab visual P95 was 39 ms and in-browser save P95 132.1 ms; a separate full-flow cold load still took 7.571 s. These are shared-host measurements with CPU throttling removed after load, not reference-device acceptance. See [the evidence ledger](docs/verification/RESULTS.md) for exact artifacts, preserved intermediate runs, the caller-snapshot regression and initial unit timeout.

## First-load validation recovery

If a campaign case or free hunt cannot validate its save before Begin becomes available, restore connectivity if needed and choose **Retry saved-case inspection**. This works even before your first save and does not start a case or write progress. Temporary play remains an explicit separate choice. Once a case is loaded, use its retained-progress saving/recovery controls. While a campaign case or free hunt is still checking its save, its pre-start buttons stay disabled briefly so a resumed case cannot replace them under your pointer. Every case family uses the same action names and debrief layout: your finding and one takeaway first, with the evidence reconstruction, outcome and limits a click away. Every case family shares the same compact save and sound toolbar, which stays reachable while you scroll on larger screens, and records name their sources in plain language. Closing a case moves keyboard and screen-reader focus to its debrief, and campaign cases and free hunts politely announce each new observation. For diagnosis, each save region exposes a public `data-readiness` state and `threat-hunter:<mission>:<state>` performance marks.

The first-load follow-up passed eight local Chromium desktop/phone checks for empty-slot retry, exact saved-row preservation and existing-save recovery. The preceding `d5775d7` build passed [269 units and 260 browser checks in hosted CI](https://github.com/cisohabitat/threathunter/actions/runs/39445335185) and reached production READY with 124 matching live assets. One live M02 Begin attempt timed out; two fresh-profile complete repeats passed without application or timeout changes. Its cause remains unestablished. The new retry controls repair a separately reproduced recovery gap; they do not establish a startup-performance fix. See [the evidence ledger](docs/verification/RESULTS.md). Overall startup, named-device performance and deferred human reviews remain unpassed.

## Protecting unfinished progress

M01 asks before leaving with temporary progress, a failed save or unfinished Case File notes, including after navigating away from the editor. Save or export work you want to keep; a successful save clears the warning. Browser unload warnings cannot protect against a device kill or storage eviction.

Before **Try another approach** replaces a temporary M04/M07 finding, acknowledge that you exported anything you want to keep. Each new closed run needs its own acknowledgement. Saved findings continue to be archived before replay.

Expansion **Review finding** waits for the current command to finish and opens only after pending notes are accepted. A rejected edit or text typed during an earlier save keeps the unsaved-note warning and blocks backup replacement. Run `npx playwright test e2e/progress-protection.spec.ts --workers=1` for these browser regressions.

This follow-up passed local lint, types, 269 unit checks, build/budgets and the full 148 Chromium desktop/phone checks. Hosted CI and production verification are separate results for the published commit; these checks do not promote deferred device or human acceptance.

The first-case interpretation is one explicitly labelled overall judgment. Select the records used to test it separately; changing the judgment never silently adds a record. Report unknowns use plain questions with source guidance, and each review section has a direct Edit action followed by Return to review. Reading and navigation remain free.

The first-case workspace carries the home artwork into a subdued backdrop. A compact utility header keeps saving, export, voice settings and mute together; expanded sound settings and headers made tall by enlarged text stay in normal flow. Records distinguish source, literal observation and visible coverage, with additional provenance under **Record details**. Report review places quieter **Edit** actions beside each heading. The debrief leads with your finding and a takeaway; expand reasoning, evidence/timeline and visibility limits as needed. These views do not advance time or change saved findings. Heading and record clearance follows the measured sticky header; related-evidence links in the debrief move keyboard focus to the record.
