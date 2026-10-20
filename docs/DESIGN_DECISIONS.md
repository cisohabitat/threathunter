# Design decisions

## 2026-10-20 — deferred reviews and P1 expansion

The user explicitly instructed: “defer review. continue gdd”. This authorizes M04/M07 implementation before the reviews required by GDD Sections 21.4 and 22.1. Those reviews remain deferred, not passed or waived for release. The original v4.3 document remains unchanged. This decision supersedes repository instructions that previously stopped production authoring at that gate.

M01 remains pinned to its existing fixture, scoring and save readers. M04/M07 use a separately versioned P1 mission package, engine contract and persistence namespace because account/host and coverage actions cannot truthfully be represented as M01 finance-session commands. New packages define source/cutoff matrices, seven-phase events, authority, sufficient sets, independent routes, fairness twins, receipts, recovery and audiovisual packages. P1 remains an internal candidate until the deferred reviews actually occur.

## 2026-10-20 — optional completion-based journey

GDD Section 4.5 is implemented as an optional recommended M01→M04→M07 path. Existing direct access to the three shipped candidates is preserved; recommendations advance on validated saved completion without a quality-score threshold. This avoids adding new locks to cases already offered freely. Debrief continuation also remains available for temporary closures, with explicit unsaved status and retained mounted progress. The overview counts durable validated active/archive completions only, with bounded archive checks and no separate progression save. It is a read model, not an achievement system or proof of competency.

## 2026-10-20 — full catalogue and constrained free-hunt development

The user explicitly instructed “do until all of gdd completed”. Development therefore includes the nine remaining §11.3 cases and the constrained, validated §12.3/P3 free-hunt scope. Explicit non-goals and separately deferred products remain excluded. Human/device/creative/listening gates remain deferred and unpassed. New expansion packages use their own engine, rubric, content manifests and persistence namespace; existing M01 and P1 packages/readers remain unchanged. The complete worklist is in `GDD_COMPLETION.md`.

## 2026-10-20 — isolate M01 tooling readers from the browser interface

Source-mapped startup profiling identified substantial schema initialisation on the interface thread even though browser save audits already run in a worker. Browser controllers now import the storage implementation directly; the old `saves.ts` module remains a facade with the same synchronous APIs and database instance. Exact detached-clone acknowledgement helpers move to a shared metadata module. The validation adapter lazily imports portable APIs only for non-browser callers, retaining an explicit rejection when a browser lacks workers.

This changes import placement, not game/save semantics. Engines, fixtures, old reducer/reader files, reader decisions, checksums, audit policies, formats, versions, worker deadlines and CAS remain unchanged. Twenty before/after fixtures across all four worlds match canonical states and exact portable bytes, including old snapshot migration. Build and runtime cold-load guards prevent the tooling reader returning to the interface's initial graph. Diagnostic sampled schema work decreased, but shared-host total wall time did not; no performance acceptance is inferred from the diagnostic trace.

The same Node-only portable import separation applies to P1 and expansion adapters. Their format modules, engines and workers are unchanged; browser unavailability still rejects before the tooling branch.

A targeted caller-mutation regression exposed late capture while the new Node-only import was pending. Preparation now captures its input before awaiting: committed metadata is private, and exports do not acknowledge receipts. This preserves P1/expansion capture timing and corrects the formerly delayed M01 tooling fallback to match browser postMessage snapshots. Three tests exercise both commit and export; none changes valid immutable caller outputs, browser scheduling, formats or versions.
