# Design decisions

## 2026-10-20 — deferred reviews and P1 expansion

The user explicitly instructed: “defer review. continue gdd”. This authorizes M04/M07 implementation before the reviews required by GDD Sections 21.4 and 22.1. Those reviews remain deferred, not passed or waived for release. The original v4.3 document remains unchanged. This decision supersedes repository instructions that previously stopped production authoring at that gate.

M01 remains pinned to its existing fixture, scoring and save readers. M04/M07 use a separately versioned P1 mission package, engine contract and persistence namespace because account/host and coverage actions cannot truthfully be represented as M01 finance-session commands. New packages define source/cutoff matrices, seven-phase events, authority, sufficient sets, independent routes, fairness twins, receipts, recovery and audiovisual packages. P1 remains an internal candidate until the deferred reviews actually occur.
