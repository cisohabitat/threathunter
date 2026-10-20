# M04/M07 authored implementation specification

These executable 1.0.0 packages extend GDD v4.3 Section 11 without changing its historical text or M01 rules. The user explicitly deferred review-first sequencing; [the decision](DESIGN_DECISIONS.md) authorizes development, not review sign-off. Source fixtures are `src/campaign/content/m04.json` and `m07.json`. Both begin as planned reviews without an incident alert.

## Shared contract and grading

`p1-1` is the engine compatibility ID; `p1-1.0.0` is the rubric version. Finite selections are recorded privately, with no procedural generation or display code exposing the branch. M04 uses B/M/U-B/U-M; M07 uses matched U-B/U-M. Public projections omit truth, private facts, collection and events. Explicit reconstruction is available only after closure.

| Action | Cost | Boundaries |
| --- | ---: | --- |
| Scope / evidence roles / Case File / reading | 0 | Accepted edits receive revisions; navigation has no engine command |
| Acquire | 1 | Capture available source records at the requested cutoff before advancing; future cutoffs/invalid scope rejected |
| Reopen identical static/dynamic snapshot | 0 | Cache key is query, scope and static version or dynamic cutoff, independent of hidden activity |
| Controlled verification | 1 | M07 only, selected target and privileged-application capability; event/result due at request+3; repeating the pending target is free |
| Enable sensor | 2 | Known dependency/coverage and matching selected target required; active at completion for 2–4 steps, inclusive endpoints; one authorized bounded window per run |
| Advance | 1–4 | All seven phases resolve for each accepted step |
| Close | 0 | Freeze finding/records/history/pending checks, then separately resolve response/world continuation |

Phase order is controls, accepted-command boundary, benign actions (including controlled test generation), adversary/world activity, collection, check completion/delivery, then the presentation/escalation boundary. Authored events have equal priority within a phase and stable ASCII IDs break ties. Source collection precedes delivery. A source activated at the same tick as a test works because phase 1 precedes generation/collection/completion. It does not recreate earlier events.

The canonical weights are Evidence 30%, Reasoning 25%, Decision 30%, Report 15%, rounded half up once. Component predicates differ from M01 and are explicitly versioned:

| Component | Points | Predicate |
| --- | ---: | --- |
| Evidence | 25 each | Relevant opening scope/baseline; fixed context obligation; relevant technical capability; cited authored sufficient set |
| Reasoning | 50/30/20 | Supported selected finding; compatible alternative status with evidence in the alternative role; relevant recorded limits supported by cited observations |
| Decision | 40/30/30 | Supported finding/action pair; permitted exact scope/capability; disclosed response owner within permitted scope |
| Report | 40/30/30 | Medium claim confidence for supported M04 explanation/misuse, low for visibility/provisional; exact scope and relevant limits; owner, 1–4-step review and explicit follow-up trigger |

No free text is graded. No hidden urgency, action-count bonus, speed bonus or damage multiplier affects quality. Missing obligations remain in the denominator. Repeated copies do not create new predicates. An unsupported early accusation or unexplored uncertainty cannot earn support credit. Source IDs, lineages, availability, references, sufficient-set feasibility and sparse-twin equivalence are linted/tested. Media and preferences are outside state/hash/commands.

## M04 — The Forgotten Server

Opening scope: svc-billing is expected to run scheduled billing work from APP-01. The account-to-host query reveals BILL-S1 on LEGACY-01; the host is not selectable before this discovery. A query scoped only to APP-01 does not clear unqueried hosts. The relationship matrix labels expected purpose and observed relationships separately.

| Query/source | Availability/cutoff | What it establishes / limit |
| --- | --- | --- |
| Account hosts / authentication | Static review snapshot, session at 0 | Expected APP-01 and discovered LEGACY-01 relationship; neither anomaly nor inventory absence establishes intent |
| Dependency / ownership | Static catalogue | LEGACY-01 supports billing; Billing Operations owns dependency review; no managed-host isolation capability exists |
| Change register | Static | B: matching account/host/operator/interval/task approval; M: covered register has no matching task; sparse twins: archive unavailable |
| Session origin / independent gateway | Static event at 0 | B: management operation matches approval; M: route outside permitted migration origin; sparse: operator/origin mapping unavailable |
| Task provenance / host collection | Dynamic; creation at 2 | B: matching approved task; M: recurring export task outside change provenance; sparse: no historical creation collection |
| Application / billing audit | Dynamic; consequential access at 6 | B: scoped reconciliation; M: customer-export scope outside approval; sparse: application detail not collected |
| Future window / task sensor | Explicit activation interval; later execution at 8 | May show that execution only; never recovers creation at 2 |

Causal events: task creation 2 requires the reviewed session; application access 6 requires task/session; scheduled execution 8 requires the task; billing batch 10 is a separate APP-01 business dependency; the malicious objective at 10 requires prepared access and the still-active reviewed session. The sparse twins differ privately, not in observable evidence or quality.

Supported cited sets (the JSON is executable authority for these new packages):

- Explained: baseline + discovered relationship + dependency + matching change + either matching host task or independently matching session origin.
- Likely misuse: baseline + relationship + dependency + covered missing approval + unapproved origin + either recurring-task provenance or independently recorded out-of-scope application access.
- Visibility: baseline + relationship + dependency + either unavailable approval/task origin, or unavailable origin/application attribution. The fixed approval-context obligation still applies for full credit.
- Provisional: baseline + relationship + dependency + missing matching approval + unapproved origin, with proportionate review rather than a definitive claim.

The alternative role tests the specific approval record, including a documented archive failure. Record the billing dependency and anomaly-not-proof limit; visibility findings additionally require the historical-gap limit. M04 recommendations are explained scoped closure, account/session/dependency review, or evidence-supported BILL-S1 restriction. Billing Operations coordinates ownership; the response team validates and applies session restriction at close+2. There is no direct player isolation or account-wide shutdown. Restriction effective at objective tick 10 resolves first. An equally supported later handoff can have identical quality but a different outcome.

Golden expectations cover two explanation routes, two misuse routes, sparse twins, incomplete/unsupported reports, on-objective-tick versus late restriction, static cache and acquisition exclusion of an event created during the query. See `src/tests/campaign.test.ts`; browser tests independently submit the explained route and preserve its completed archive.

## M07 — The Missing Logs

Opening scope: CS-API and CS-PORTAL, privileged application actions, historical steps -6 through 0. The dashboard is a hypothesis about coverage, not an alert or proof. The interface shows declared versus observed collection in separate labelled panels.

| Source/tool | Semantics |
| --- | --- |
| Declared coverage | Dashboard claims application collection active on both services over -6..0 |
| Delivery health | API received heartbeats through 0; portal last delivered at -4, leaving -3..0 without usable application delivery |
| Collector configuration | Portal points to retired receiver; Detection Engineering owns repair and verification; does not attribute activity |
| Independent authentication | Retained authentication at -2, not subsequent application actions, authorship or their absence |
| Controlled application event | Due at request+3 for exactly the selected service and capability; API success cannot satisfy portal verification |
| Future portal window | Activation completes after two steps; declared 2–4-step interval; a check must occur inside it; quiet future data does not fill -3..0 |

The private malicious twin contains an unobserved action at -2; the benign twin does not. Both have exactly the same public records, timestamps, source availability, test results, cue selection and assessment for the same commands. No available set supports an actor-intent accusation or a historical clean bill of health.

Full visibility support cites opening scope, declaration, heartbeat gap, limited authentication, enablement, successful portal verification and completed future window, plus either a failed pre-repair portal test or the routing configuration. The alternative role tests that configuration/failure. Record both historical-gap and test-not-history limits. State CS-PORTAL, missing interval -3..0, Detection Engineering, a bounded review and repeat privileged-application verification trigger. Low claim confidence can earn full investigation quality.

Two strong orders are tested: failed portal test before repair, or configuration-led repair before the successful controlled test. Verification pending before activation may complete at the activation tick; the control/source/completion phase ordering is tested explicitly. Closing with a pending result retains it as unknown at decision, even when later collection appears in the separately revealed continuation.

## Saves, presentation and remaining acceptance

M01 keeps its original database, rules, format-1/2 readers and golden traces. P1 has its own `threat-hunter-campaign-v1` namespace and per-mission active, previous, completed and recovery-original rows. Its `threat-hunter-p1` schema-1 envelope pins engine/content/rubric/policy/profile selection, fixture hash, private finite world and null seed, checkpoint, full commands, receipts and final hash. Audited latest checkpoints fall back to revision zero only to fit the same 2 MiB bound. Browser preparation/audit uses a preloaded worker; receipts become committed only after the transaction. Full-row CAS, one writer per mission, original recovery and explicit temporary mode remain mandatory. Changing missions keeps loaded state mounted and silences inactive audio; it does not merge or discard cases.

Each mission includes 16 spoken clips, four effects and ambience, exact transcripts/hashes and retained lossless archives. The stock synthetic Piper English-US identity and original Northstar landscape/portrait environmental artwork are reused under the existing provenance/rights records. They are candidates, not newly approved casting or artwork. Optional packs load fully per mission, independent of hidden branch; offline readiness is for the loaded session, not cold start. The mixer cancels failed/stalled preparation and owns pending decoders; audio cannot dispatch commands.

The requested review deferral leaves player studies, physical devices, assistive technology, composition, accent/pronunciation and listening approval unperformed. This is executable P1 candidate content, not P0/P1 release sign-off or a validated >9 player grade. M02/M03/M05/M06/M08–M12, procedural generation, accounts/cloud sync and competitive features retain the GDD's later design/production scope; they are not presented as playable menus.
