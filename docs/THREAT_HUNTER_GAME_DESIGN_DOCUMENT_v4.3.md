# THREAT HUNTER: SILENT INTRUSION

## Game Design Document v4.3

| Document control | Value |
|---|---|
| Date | 19 October 2026 |
| Status | Consolidated game-design and implementation baseline with a declared web technology stack, mandatory visuals and generated voice; game implementation and player testing remain pending |
| Replaces | v4.2 as the complete integrated GDD. M01 gameplay ruleset 4.0.0 and its reference fixtures remain unchanged; v4.3 strengthens the player-experience, art, synthetic-voice production and P1 mission-design contracts. |
| Product | Single-player cybersecurity investigation web game with a polished visual identity and optional-to-hear generated voice |
| Delivery | React + TypeScript + Vite, Tailwind CSS, static-first Vercel web deployment from GitHub |
| Audience | Newcomers with basic computer literacy and cybersecurity generalists who are not threat-hunting specialists |
| Devices | Desktop/laptop, iPad landscape and portrait, smartphone portrait; input-equivalent gameplay |
| First-session target | First meaningful choice within 2 minutes; first case 10–15 minutes, excluding optional debrief |
| Standard-case target | 15–25 minutes; action-driven simulation with unrestricted reading time |
| Commercial assumption | No purchase, account, installation, advertising or monetisation required in the initial scope |
| Assessment | Historical v4.0 desk assessment: 9.1/10. v4.3 provisional desk assessment: 9.3/10 for the specification, not game quality; gameplay, visuals, voice and device usability require testing. |
| Presentation requirement | Home-page theme art, polished gameplay screens, concise pre-generated or recorded voice, captions and player-controlled sound are mandatory in completed P0 and public releases. |
| Stack decision | React, TypeScript, Vite, Tailwind CSS, Zustand, custom deterministic TypeScript engine, Dexie/IndexedDB, Zod, Motion, Howler.js, Vitest, Playwright, GitHub and Vercel; React Flow deferred unless justified by gameplay. |

> **Player promise:** Find what does not fit, test an explanation, and make a defensible call. You do not need to write security queries or recognise attack-technique numbers.

**Normative language:** MUST identifies an acceptance requirement; SHOULD identifies a preferred implementation with a documented exception; MAY identifies optional scope. Numeric usability and performance targets are proposed thresholds, not measured results. Fictional case facts, policies, response delays and scores are game rules, not universal operational guidance.

**Authority:** The command table in Section 8, scheduler in Section 9, scoring contract in Section 13, and M01 fixture in Appendix A are the single sources of truth for their respective subjects. Section 15 defines the implementation technology and component ownership; Section 18 defines the required visual and audio experience, with delivery budgets in Section 19 and release gates in Sections 21–22. Examples must conform to them. A later appendix does not silently override an earlier rule. A discrepancy blocks the relevant implementation until reconciled in the next document revision.

## Contents

1. [Fresh review and corrective decisions](#1-fresh-review-and-corrective-decisions)
2. [Product identity and audience](#2-product-identity-and-audience)
3. [What makes this a game](#3-what-makes-this-a-game)
4. [Learning, assistance and progression](#4-learning-assistance-and-progression)
5. [World, role and release boundaries](#5-world-role-and-release-boundaries)
6. [Investigation workspace and interaction contract](#6-investigation-workspace-and-interaction-contract)
7. [Evidence, claims and knowledge](#7-evidence-claims-and-knowledge)
8. [Canonical command and authority contract](#8-canonical-command-and-authority-contract)
9. [Clock, requests and adversary resolution](#9-clock-requests-and-adversary-resolution)
10. [Complete first case: The Midnight Login](#10-complete-first-case-the-midnight-login)
11. [Next cases and campaign architecture](#11-next-cases-and-campaign-architecture)
12. [Replayability without arbitrary puzzles](#12-replayability-without-arbitrary-puzzles)
13. [Scoring without hindsight or guesswork](#13-scoring-without-hindsight-or-guesswork)
14. [Debrief and transferable learning](#14-debrief-and-transferable-learning)
15. [Browser architecture and data contracts](#15-browser-architecture-and-data-contracts)
16. [Persistence, recovery and deployment](#16-persistence-recovery-and-deployment)
17. [Responsive design and accessibility](#17-responsive-design-and-accessibility)
18. [Visual, audio and narrative direction](#18-visual-audio-and-narrative-direction)
19. [Performance and compatibility](#19-performance-and-compatibility)
20. [Content production and validation](#20-content-production-and-validation)
21. [Testing and release evidence](#21-testing-and-release-evidence)
22. [Build sequence and acceptance backlog](#22-build-sequence-and-acceptance-backlog)
23. [Risks, privacy and deferred decisions](#23-risks-privacy-and-deferred-decisions)
24. [Quality assessment and remaining uncertainty](#24-quality-assessment-and-remaining-uncertainty)
25. [References and interpretation boundaries](#25-references-and-interpretation-boundaries)
26. [Appendix A: M01 reference fixture](#appendix-a-m01-reference-fixture)
27. [Appendix B: Validation record](#appendix-b-validation-record)

## 1. Fresh review and corrective decisions

### 1.0 v4.3 design-improvement record

This review deliberately **does not alter M01's authoritative tick scheduler, evidence predicates, scoring or source fixtures**. It instead resolves the weakest remaining *product* areas with measurable creative and experience deliverables.

| Design gap in v4.2 | v4.3 improvement | Acceptance evidence still required |
|---|---|---|
| Hunting may feel like inspecting forms | Discovery beats, meaningful-choice matrix, feedback and pacing plan, anti-boredom audit | Observed novice gameplay, not author opinion |
| Visual direction described but no actual production language | Palette/type/layout tokens, component states, hero wireframes, screen-by-screen creative specifications, art delivery manifest | Screenshots/mockups and cross-device contrast tests |
| Speech required but production unclear | Voice casting and QA rubric, manifest schema, branching debrief assembly, browser playback edge cases | Generated clips, listening tests, accessibility/latency results |
| P1 cases remain brief pitches | M04 and M07 authored branch/evidence/response blueprints, trace requirements and gates | Actual P1 scenario JSON and engine fixture checks |
| Quality gates favour technical correctness | Discovery and emotional-payoff metrics, silent/voiced comparison, visual consistency review | Blind player studies with build evidence |

**Status distinction:** all design tokens, beat sheets, voice manifests and next-case tables below are **production targets**, not generated UI, voice files, finished scenario JSON or verified performance. M01's Appendix A is still the only detailed executable-reference input.

### 1.1 v4.2 technology-stack change record

This revision records the agreed **web-game technology stack as the recommended implementation baseline**, rather than leaving every framework selection open to individual developers. It retains v4.1 theme art, in-game polish, synthetic voice, accessible captions, save/resume and deterministic game-rule requirements. The stack is intended for a responsive, polished *game*, not a conventional enterprise dashboard.

| Requirement | Decision | Verification |
|---|---|---|
| Modern, shareable web game | React + TypeScript + Vite, deployed as a static-first Vercel site | Build, HTTPS deep-link and production smoke tests |
| Consistent visual identity | Tailwind CSS with design tokens; authored/AI-generated, reviewed theme art | Desktop, iPad and mobile visual acceptance and accessibility testing |
| Attractive game interactions | Motion for React for restrained transitions | Reduced-motion and playback/gameplay invariance tests |
| Predictable client state | Zustand for *view state only*; authoritative deterministic TypeScript engine | State-boundary and seeded replay tests |
| Safe local storage | Dexie.js over IndexedDB; versioned snapshots and explicit commit receipts | Reload, migration, quota failure and multiple-tab tests |
| Validated content and saves | Zod runtime schemas in addition to TypeScript typing | Malformed input, reference and import rejection tests |
| Network relationships | Readable relationship cards/list for P0; optional lazy-loaded React Flow at P1 or later | Touch, keyboard and screen-reader input parity |
| Natural generated speech | Reviewed pre-generated TTS assets and Howler.js playback; text-equivalent captions | Voice-pack coverage, autoplay handling, silent parity and cue tests |
| Engineering quality | Vitest unit/property-style checks, Playwright interaction tests, GitHub Actions CI | Versioned golden traces and release evidence ledger |

**Scope:** This change locks architectural defaults but does not assert that dependencies have been installed, a repository has been created, assets have been rendered or software tests have passed. Exact package versions and licences are confirmed at project initiation and recorded in a lockfile. Replacing a chosen library requires a short architecture-decision record and equivalent acceptance evidence. M01's authored rules, timings, evidence, fixtures and score remain unchanged.

### 1.2 v4.1 change record

This revision makes the requested audiovisual experience part of the product contract, not a future enhancement. It integrates the requirements throughout the release scope, build sequence, content package, performance budgets and acceptance checks. The original v4.0 review below is retained as design history.

| User requirement | Integrated decision | Primary sections |
|---|---|---|
| Main page has theme art | Text-free, responsive landscape/portrait key art with live title and accessible menu controls | 18.2–18.3 |
| The game itself is visually appealing | One finished design system across the investigation, Case File, timeline, handoff and debrief | 6, 18.4–18.5 |
| Include voice; synthetic speech is acceptable | Pre-generated, reviewed briefings, Morgan guidance, selected status cues and debrief coverage | 18.6–18.10 |
| Preserve approachable browser gameplay | Captions, independent audio controls, no audio-only information, lightweight assets and text fallback | 16–19 |
| Requirements are implemented rather than deferred | Mandatory completed-P0/public-release gates; remove prior “no voice” and “cut voiced characters” defaults | 5, 21–23 |

**Revision boundary:** this is a Markdown specification update. No new art or speech files, browser implementation, device validation or listener study are claimed. Appendix A's ruleset remains `4.0.0` because no investigation or scoring behaviour changes.

### 1.3 Historical v4.0 review

The previous document had strong intent and useful requirements, but its 9.4 rating overstated internal consistency and implementation completeness. Repeated specifications, unresolved action semantics and partly illustrative scenarios still left important decisions to the developer. More pages would not resolve that problem.

| Review finding in v3.0 | Consequence | v4.0 correction |
|---|---|---|
| Sections 1–22 and 23–34 duplicated rules, types and build sequencing | Two developers could implement different behaviour while both following the document | One consolidated specification and one canonical contract for each subsystem |
| Escalation was both an irreversible ending and a state permitting further investigation | Handoff timing, adversary progression and scoring had no single interpretation | Initial release uses **Handoff and close**; assessment freezes, then an explicitly unscored response continuation resolves |
| Owner verification had an action cost but unclear delivery semantics | A player could spend time twice, receive information prematurely, or become stuck | Non-blocking request: one-tick submission, a response due at request tick +3, with explicit timeout |
| Operational impact contributed to the investigation score despite promises to separate outcome and judgement | A justified decision could receive a worse assessment solely because hidden circumstances were unfavourable | Remove actual operational outcome from quality scoring; assess proportionality from decision-time knowledge |
| Evidence coverage used a denominator based on what was available before the player's decision | Closing very early could make the denominator artificially easy; “inconclusive” risked becoming a universal escape | Fixed, predeclared evidence questions, multiple sufficient evidence sets, and minimum uncertainty-investigation requirements |
| Different observations of one event were treated too categorically as dependent | Independent source corroboration could be discarded, while additional cards could still masquerade as additional evidence | Separate duplicate lineage, collection-path dependence and distinct propositions; no universal two-card rule |
| The first login case mentioned inspecting or isolating an unmanaged device | The story could grant the player control over an endpoint outside organisational management | First-case response targets the organisation's **session**, not an external device |
| An “uncertain” branch did not fully define the actual world | Uncertainty in observation could be confused with uncertainty in the simulation | Paired sparse-visibility benign and malicious worlds share the same observable evidence and receive the same assessment |
| First missions were predominantly alert-led | The game could teach alert triage while calling it proactive hunting | First-case alert tutorial, followed by two hypothesis-led cases with no opening security alert |
| MVP meant one mission, three branches, or three different missions in different places | Prematurely broad build and inconsistent completion claims | Separate P0: one case with four world/visibility fixtures; P1: three distinct cases |
| Many schemas and “full” cases remained illustrative | The engineer still needed to invent timing, sources, admissible conclusions and edge cases | A finite M01 evidence catalogue, query semantics, predicates, response rules and executable-reference checks |
| Confidence, scoring, multiple workspaces and several resource meters were introduced together | The intended beginner could face too much interface before making an interesting decision | One Case File, four in-mission destinations, progressive disclosure and time as the only universal scarce resource |

**Preserved:** browser-first delivery, synthetic data, no specialist command line, deterministic replay, accessible evidence linking, uncertainty-aware debriefs, three device classes and the wider 12-case campaign ambition.

## 2. Product identity and audience

### 2.1 Elevator pitch

A cyber detective game where you investigate a small, understandable organisation. A late login, an overlooked service account or a gap in monitoring may mean something important, or may have an ordinary explanation. Choose a question, inspect the relevant records, test competing explanations, and decide what can responsibly be concluded.

**The promise is not “there is always an attacker inside.”** That premise would reveal the answer and reward suspicion. The promise is: **there may be an intrusion, and your task is to establish what the evidence supports.**

### 2.2 Portfolio boundary

| Game | Player's central question | Responsibility boundary |
|---|---|---|
| CISO Risk Game | Where should resources and risk decisions go? | Strategy, prioritisation and governance |
| Threat Hunter | What does this activity mean, and what can I substantiate? | Discovery, evidence, scope, uncertainty and proportionate handoff |
| Breach Command | What should the organisation do during an incident? | Incident coordination, response and recovery |

Threat Hunter ends at a defensible finding or handoff, with narrowly scoped defensive recommendations where needed. It does not add a second crisis-management campaign inside an investigation game. Incident response is part of wider risk management in NIST SP 800-61 Rev. 3; this portfolio split is a gameplay choice, not a claim that professional disciplines operate in sealed stages. [R2]

### 2.3 Who this is for

The primary player understands accounts, computers and business applications but may not know how a threat hunt works. A GRC practitioner should recognise why evidence matters; an IT administrator should recognise the environment; a student should understand the next action without outside reading. Specialists are credibility reviewers and an optional audience, not the group whose technical expectations determine the interface.

Do not require knowledge of query languages, protocol numbers, Windows event identifiers, malware families, packet capture or ATT&CK technique identifiers. Optional record fields add texture but cannot be the sole route to a conclusion.

### 2.4 Learning contract

After the initial three cases, players should be able to distinguish an anomaly from a substantiated threat, propose a testable explanation, seek evidence that could disprove it, recognise a collection gap, qualify a conclusion to the systems actually checked, and explain a proportionate escalation.

No score represents professional certification, employability, a real organisation's security posture, or measured readiness to investigate production systems.

### 2.5 Presentation contract

The product combines approachable investigative depth with distinctive home-page theme art, polished in-game presentation and concise generated voice. These are core identity requirements, not a separate promotional skin. Voice is required as a shipped feature but always optional to hear; all content remains available as readable text. Section 18 specifies the baseline for the completed first playable experience.

## 3. What makes this a game

### 3.1 Primary verbs

**Compare. Follow. Test. Connect. Decide.** These verbs must exist as actions that alter the player's understanding, not as five labels over a multiple-choice quiz.

A typical 60–90-second interaction sequence is:

1. Select a login and compare its device and hour with the account's normal pattern.
2. Choose whether to check approved work or follow the session into another application.
3. Receive a record that supports one explanation but leaves a useful uncertainty.
4. Attach the fact to the relevant claim, or change the working explanation.
5. Decide whether another check is worth the simulated delay, or hand over the case now.

Reading, comparison, filtering and organising already-acquired material are free. Only acquiring new information, placing a request or advancing the world consumes simulation ticks.

### 3.2 The source of enjoyment

The intended reward is a change in understanding: “That was unusual, but now I know why,” or “The approved work explains the login, but not this second action.” The interface should make the difference visible through a comparison, a newly meaningful connection or a resolved contradiction.

Suspense comes from the cost of the next investigation step and the consequences of being wrong, not from an unpausable countdown. Satisfaction comes from explaining a case, including an honestly bounded unresolved case, not from collecting all available cards.

### 3.3 Three repeatable investigation patterns

| Pattern | Player action | Interesting decision | Avoid |
|---|---|---|---|
| Baseline comparison | Compare an identity, system or service with its expected behaviour | Does this difference justify a closer look? | Treating every unusual event as malicious |
| Competing explanation | Test an approved-business explanation against technical observations | Does the explanation cover the actual scope and time? | A “contact owner” button that always reveals the answer |
| Bounded scope | Follow activity one relationship beyond the starting lead | Is the concern isolated, broader, or not observable? | Automatically revealing the entire attack path |

The first case uses the first two patterns. Later cases add scope and dependencies. Not every case needs every tool.

### 3.4 Meaningful choice test

A costly action is worth keeping when its result could alter a claim, establish an important limit, change response urgency or identify a different affected entity. An action that only adds a longer log list is not a meaningful choice.

Every authored case MUST contain at least two reasonable investigation orders and at least one moment where a player revises, bounds or strengthens an explanation. A static record puzzle is acceptable for the tutorial; the broader product must also include cases where future observable events depend on the player's choices.

### 3.5 Anti-boredom and anti-overload rules

P0 initially presents one lead, at most six relevant entities, three plausible explanations and a short feed. Advanced evidence stays collapsed. No mandatory introductory video, forced essay, shopping tree or fatigue meter. One fact can support several statements without being pinned repeatedly.

No hidden score meter rewards clicking everything. No credibility penalty is attached to a reasonable good-faith escalation that turns out benign. The debrief can challenge an unsupported escalation without teaching players to conceal concerns.

If the first case still feels like paperwork, reduce navigation and duplicate reading before adding decorative complexity, adversaries or more missions. The required visual and voice baseline in Section 18 still applies; neither attractive art nor narration replaces a meaningful investigation loop.

### 3.6 The discovery beat: make every investigation feel consequential

Every mission needs a **discovery beat** that is experienced rather than explained by a narrator. The authored situation should have: (1) an understandable expectation, (2) a surprising but credible observation, (3) a player-selected way to check it, (4) an evidence-based shift in interpretation, and (5) a report or handoff that acknowledges the shift. A benign resolution can be just as satisfying as finding an intrusion when the player's reasoning answers a concrete mystery.

| Beat | Player-facing experience | Allowed feedback | Forbidden shortcut |
|---|---|---|---|
| *Hook* | “Why did finance sign in at 02:13?” | One notable lead, contextual environment art | “An intruder is in finance” title |
| *Expectation* | Compare normal hours and device history | Clear baseline/current comparison | A hidden-truth colour coding of the account |
| *Tension* | Approved work and technical activity may disagree | Unresolved relationship, source capability and scope | Manufactured countdown unrelated to disclosed policy |
| *Insight* | A source strengthens or weakens a working explanation | Short non-verdict discovery accent, case-file connection | Correct/wrong confetti, attacker-only music cue |
| *Decision* | Decide whether to check further or submit a scoped finding | Transparent action cost and response implications | Preselecting the secret correct answer |
| *Payoff* | See reasoning and simulation reconstructed in debrief | Clear reveal of knowledge versus outcome | Changing the score according to hidden intent |

**Novelty budget:** Each P1 case MUST introduce one genuinely new investigative interaction, not just a different story skin. M01: explain an anomalous login. M04: proactively scope an account-to-host hunt and investigate a business dependency. M07: test whether collection coverage itself is trustworthy. The case should be understandable without reading technical reference material beforehand.

### 3.7 Meaningful-choice and anti-clicking acceptance rule

For each priced investigative action in a mission, the author must document a player-visible question and at least one credible answer capable of altering: a hypothesis, a scope limit, urgency, or next-step recommendation. A tool that merely reveals an additional block of identical log entries is optional scenery, not mandatory gameplay. The player must be able to explain **why they chose this source** when interviewed afterwards.

- P0 design goal: by the end of M01, an uncoached player can identify at least one observation that changed or bounded their initial explanation.
- P1 design goal: each mission contains at least two defensible action sequences that differ meaningfully in source order or scope, with neither labelled incorrect solely because it is not the tutorial path.
- Avoid forced chain-puzzles in which every click is required to unlock the next clickable card; let players select enquiries and see causally consistent outcomes.
- If users systematically open all available sources before thinking, first improve source questions, compare views and reasoning prompts. Do not add an arbitrary click-tax or precision-timer as a substitute for engaging design.
- Discovery accents, voice and sound are keyed to public record delivery classes, **not** to whether a secret world is benign or malicious.

### 3.8 M01 player-facing interaction storyboard, not a mandated click path

| Approximate experience beat | Screen | Visible element | Interaction | Product feedback |
|---|---|---|---|---|
| Enter the shift | Home/Briefing | Art, title, short mission objective, Morgan introduction | Begin or skip narrated briefing | Direct entry, no mandatory video |
| Notice the anomaly | Leads | Finance sign-in plus routine entries | Open the lead | Session summary without malicious label |
| Establish expectation | Leads/Explore | Current vs normal sign-in comparison | Run Q-H | Matching values and differences become easy to scan |
| Choose an explanation | Case File | Approved work, unauthorised use, still unknown | Select one as working hypothesis | No right/wrong feedback |
| Follow a test | Explore | Device, approved work, activity, owner check | Choose Q-D, Q-C, Q-F or verified check | Visible tick cost; source coverage shown |
| Reframe | Case File | Supports, weakens, scope limit | Attach delivered record and reconsider hypothesis | Subtle line/connection emphasis |
| Make the call | Case File | Disposition, confidence and proposed next action | Review then explicitly close | Authorisation and uncertainty checked before commit |
| Understand outcome | Debrief | Three-track reconstruction and finding | Compare what was known with what happened | Satisfying, factual conclusion without hindsight punishment |

**Quality guard:** the exact order may change. These beats shape comprehension and visual pacing, not game-engine unlocks or a different score formula. No discovery animation, narration or mobile layout may use private branch labels to vary pre-close feedback.

## 4. Learning, assistance and progression

### 4.1 First-run assistance

First launch offers **Guided investigation** as the recommended path and **Independent investigation** as an equally visible alternative. Existing players resume their preference. Do not default a newcomer into the most demanding mode because they work in cybersecurity.

Guidance changes presentation and available hints, not underlying world facts or action costs. The same seed and ruleset remain comparable across assistance settings. Later challenge profiles may change noise or visibility, but they must be separately versioned scenarios, not a hidden multiplier on attacker speed.

### 4.2 First two minutes

| Target | Screen content | Required user action | Learning |
|---|---|---|---|
| 0–20 seconds | One short briefing and scope of authority | Begin case | Investigate, do not assume compromise |
| 20–45 seconds | One noteworthy login and two routine entries | Inspect any entry | A lead is not a verdict |
| 45–75 seconds | Login detail with **Compare sign-ins** | Acquire baseline | Anomaly needs a reference point |
| 75–100 seconds | Side-by-side current and usual pattern | Attach a fact to the Case File | Observation differs from explanation |
| 100–120 seconds | Two clearly labelled next checks | Choose one, or request a hint | The player directs the investigation |

These are observational targets, not time limits. Reading more slowly never advances the adversary.

### 4.3 Mentor contract

Morgan is a scripted senior analyst, not an omniscient hint engine. Hints are selected from the player's visible state and tool capabilities only. Selected guidance MUST have reviewed, pre-generated or recorded voice as specified in Section 18, with identical on-screen text. Optional listening, replaying or skipping cannot reveal additional facts, change hint availability or advance the simulation.

| Hint level | Example | Restriction |
|---|---|---|
| Nudge | “What would make approved work a credible explanation?” | Must not imply which branch is active |
| Source suggestion | “The work record can tell you whether this device and task were authorised.” | Names a useful source, not its result |
| Guided action | Highlight **Check approved work** and explain the cost | Does not auto-select the conclusion |

Hints do not deduct quality points. Record assistance separately for learning evaluation. The same visible state MUST produce the same hint across matched benign and malicious worlds.

### 4.4 Vocabulary

Introduce only a few new concepts per case. Use “activity records” before “telemetry,” “other systems accessed” before “lateral movement,” and “missing collection” before specialised monitoring terminology. Include the professional term in optional definitions so the player gains vocabulary gradually.

No correct ending depends on memorising a glossary definition. A technical field that matters must have an understandable summary and a visible limitation.

### 4.5 Progression

Unlock cases through completion, not an arbitrary score threshold. A player who misunderstands a case receives a useful debrief and can continue. Optional mastery challenges assess a different evidence configuration, not recall of a previously exposed answer.

Achievements recognise scoped conclusions, a well-tested alternative, a helpful visibility finding or an appropriate early handoff. Do not use streaks, daily rewards or punitive failure screens to pressure play.

## 5. World, role and release boundaries

### 5.1 Fictional organisation

**Northstar Services** is a fictional business with finance, customer services, identity infrastructure and some legacy applications. Asset and person names are invented. The setting is legible without a lengthy story bible.

Each asset profile contains its purpose, owner, consequence of interruption, monitoring capability and known dependencies. Documentation can be stale, but the game must provide a discoverable way to investigate an important dependency before penalising a player for ignoring it.

### 5.2 Authority

The player is an investigator. They can acquire permitted records, request a verified business check, maintain a case, and submit findings. They cannot promote themselves to incident lead or approve their own response request.

In M01, the only disruptive recommendation is to revoke the suspicious organisation-controlled session through the response team. It is not endpoint isolation, account-wide disablement or shutdown of the finance portal. The observed client may not be an organisation-managed endpoint.

Later endpoint isolation requires an identified managed asset, an operative management channel, a mission policy and an authorised responder. The scope and limitations of every control must be declared in the scenario. A control stops only the access or activity it actually governs in that simulation.

### 5.3 Release stages

| Stage | Included | Gate | Explicitly excluded |
|---|---|---|---|
| **P0: playable proof** | M01, one environment, four world/visibility fixtures, core loop, handoff, debrief and save/resume; theme art, polished gameplay UI, core generated voice, captions and sound controls | Evidence loop understandable and enjoyable; M01 reference behaviours and Section 18 visual/audio baseline implemented and reviewed | Other cases, network graph editor, procedural engine, accounts, PWA claims |
| **P1: first public game** | M01, M04 and M07, each fully authored, polished and voiced at the required coverage; two cases begin without alerts; device and accessibility evidence | Three distinct cases pass content, gameplay, visual/audio and device gates | Remaining campaign, multiplayer, leaderboard, live logs |
| **P2: campaign expansion** | Remaining nine authored missions and richer environments | Each case passes the same independent content gate | Unvalidated procedural combinations |
| **P3: free hunts** | Constrained, seeded recombination of validated patterns | Generation validator, fixed regression corpus and sufficient meaningful variation | Unbounded LLM-generated truth or scoring |

M01 has **three observable outcome families** and **four internal world/visibility fixtures**, not four different missions. The 12-case campaign is an approved direction, not a claim that all twelve cases are engineering-complete in this document.

### 5.4 Non-goals and cost control

No live corporate telemetry, real exploitation, external access, mandatory raw-log search, forced essays, LLM requirement, native app, multiplayer or national-scale simulation. No stock market or resource-allocation subsystem. No investigator upgrades that make evidence intrinsically more reliable.

Time is the only universal scarce resource. Monitoring slots exist only in cases that explicitly teach coverage choices. Remove generic analyst fatigue and escalation-credibility currencies from the initial game. Audiovisual production is bounded to a shared design system, a responsive home-art set and short authored voice clips for required moments. Do not remove all voice or defer visual polish to keep unnecessary cinematic features.

## 6. Investigation workspace and interaction contract

### 6.1 Four in-mission destinations

| Destination | Purpose | Essential actions |
|---|---|---|
| **Leads** | What deserves attention? | Inspect, compare with baseline, start an investigation |
| **Explore** | Who and what are involved? | Review asset/account context, follow a relationship, acquire records |
| **Case File** | What do I think, and why? | Attach evidence, test alternatives, record limits, set confidence, prepare handoff |
| **Timeline** | What happened and what is pending? | Review actions, collection cutoffs, pending checks and known activity |

The workbench is a context panel within Leads/Explore, not another compulsory destination. The Evidence Board and Journal are two views of the same Case File, not separate data-entry obligations. A visual network is an enhancement over the same relationship list. Every destination MUST use the finished visual system and screen treatment in Section 18.4; the home artwork alone does not satisfy the visual requirement.

### 6.2 A source query is an understandable question

Show choices such as **Compare sign-in history**, **Check device registration**, **Check approved work**, and **Follow this session's activity**. Always display the source, scope, expected type of result and tick cost before commitment.

Advanced players can view a structured filter builder later. They do not type arbitrary queries in P0. Each question opens a functioning source view with a timestamped result, not a correct/incorrect response to a quiz.

### 6.3 Record card

A record card contains a factual headline, subject, event time or tick, source, collection cutoff, relevant fields, caveats and follow-up links. Its visual style must not change based on hidden truth. “External or unregistered client” is a factual context label; “attacker device” is not allowed before evidence establishes that claim.

Actions: inspect context, attach to claim, attach as counterevidence, note limitation, compare and follow entity. Opening, filtering or rearranging material already acquired costs zero ticks.

### 6.4 Case File structure

The Case File has four concise fields: **Working explanation**, **Supporting and opposing facts**, **What remains unknown**, and **Next step**. Free text is optional. The structured choices are editable representations of reasoning, not an examination screen.

One evidence attachment can be assigned a role: `supports`, `weakens`, `sets_scope`, or `limits_confidence`. Physical relationships such as same session or same host can be shown automatically when the underlying fields establish them. The player still decides what those relationships mean.

“Insufficient information” is a possible disposition, not a causal hypothesis. Keep causal explanations such as authorised work and unauthorised session use separate from confidence and reporting status.

### 6.5 Completion contract

At every point, players can find **Review finding**. The review shows scope, disposition, confidence, cited facts, limitations, pending checks and next action. It warns about missing fields, not whether the hidden answer is correct.

A player may intentionally submit a weak conclusion and receive a learning debrief. The UI must not force the “correct” evidence combination before permitting completion. Invalid references and impossible actions are rejected; poor judgement is assessed after submission.

Submission requires an explicit confirmation. Browser navigation, a double tap or dismissing a panel must never submit a case or cause a disruptive recommendation.

## 7. Evidence, claims and knowledge

### 7.1 Three layers

1. **World truth:** who actually acted, their intent, access, actions and consequences.
2. **Collection:** what a source records, when it becomes available, and what it cannot observe.
3. **Player knowledge:** the records delivered to this player and their recorded interpretation.

The UI receives only the third layer plus disclosed capabilities. The score receives decision-time knowledge, policy, action history and an observation-based rubric. Actual damage and hidden actor identity are used only by the separate outcome/debrief system.

A local browser implementation cannot make authored truth secret from a determined source inspector. This is an entertainment limitation, not a secure anti-cheat boundary. Ordinary UI, accessibility text, filenames presented to the player, error messages and hint selection must still avoid accidental truth leaks.

### 7.2 Record states

| State | Meaning | Valid conclusion |
|---|---|---|
| Records returned | The source collected matching observations | The observations occurred as represented, within source limits |
| Empty, covered interval | Query ran over a stated interval with relevant collection working | No matching observations were recorded in that scope |
| Partial collection | Some relevant observation capability was missing | Findings are bounded; absence does not clear the unobserved scope |
| Collection unavailable | Source has no usable collection for the requested scope | This is a visibility finding, not evidence of clean behaviour |
| Pending | A human or automated result is not due yet | No result should be inferred |
| Rejected request | An invalid or unauthorised request did not run | No observation about the world was made |

A quiet network-flow result cannot establish that no file was read. A missing endpoint agent cannot retrospectively produce process history after it is enabled. These are explicit simulation capability rules, not puzzles that change to frustrate the player.

### 7.3 Corroboration and lineage

Each record has an origin/lineage group and a collection-path identifier. Two views of one SIEM entry are duplicates for evidence credit. Separately collected records of the same transaction can strengthen confidence that the transaction occurred, while remaining evidence about only one transaction. Distinct propositions, such as verified approved work and actual access scope, may establish an explanation together.

Do not implement “two records equals sufficient evidence,” “two sensors always means independence,” or “same event means no corroboration.” The scenario's sufficient sets are based on the claims the records support and their stated limitations.

### 7.4 Decision snapshots and opportunity

Every consequential decision stores the delivered record set, current collection coverage, available tools, known urgency, pending requests, cited evidence, policy version and case draft. A debrief distinguishes:

- **Known then:** delivered before the decision.
- **Reasonably investigable then:** a visibly available source or check, identified without using hidden truth.
- **Unknowable then:** outside collection, permission or delivery conditions.

The first group supports immediate decision assessment. The second can support a missed-opportunity lesson under a predeclared evidence question. The third cannot be used as a retrospective fault.

The required evidence questions are fixed when the case begins. They do not shrink because the player stops early or avoids a source. A failed but appropriate attempt can establish a real limitation. Deliberately disabling collection cannot erase an earlier obligation.

### 7.5 Confidence

Confidence applies to the claim about activity, not to the quality of the player's work. A well-investigated unresolved case can have low claim confidence and excellent investigation quality. Labels are ordinal, not probabilities.

M01 supports medium/high confidence in a tightly explained benign lead, medium confidence in a likely unauthorised session, and low confidence about whether a sparse-evidence session is malicious. “Confirmed compromise” is outside M01's selectable dispositions because its simplified sources do not establish that stronger claim. Later cases must explicitly teach and specify any confirmation criteria.

## 8. Canonical command and authority contract

### 8.1 Commands

| Command | P0 availability | Tick cost | Effect |
|---|---|---:|---|
| Inspect/filter/compare acquired records | Yes | 0 | Read-only navigation over delivered knowledge |
| Edit Case File / attach / detach / set confidence | Yes | 0 | Update case draft and history; no world advancement |
| `ACQUIRE` | Yes | 1 | Capture permitted source records at request-start cutoff; deliver at completion |
| Reopen identical acquired snapshot | Yes | 0 | Cached result, visibly labelled with its existing cutoff |
| `REQUEST_CHECK` | Yes | 1 | Start a non-blocking verified-owner check; response due at request tick +3 |
| Repeat an identical pending check | Yes | 0 | Return the existing request; no extra response, delay or cost |
| `ADVANCE` | Yes | 1–4 | Advance the world by chosen ticks, showing pending requests before commitment |
| `CLOSE_CASE` | Yes | 0 | Freeze assessment and close; optionally hand over a structured response recommendation |
| `REQUEST_RESPONSE` while continuing investigation | P1 only, case-specific | 1 | Submit to responder policy; never self-approve |
| `ENABLE_SENSOR` | P1 only, case-specific | 2 | Activate a specified capability at completion; no backfilled collection |

The P0 player has no `APPROVE_CONTAINMENT` command and no direct isolation control. P1 commands do not appear in P0 menus. All asynchronous costs and delays use the same scheduler; there is no separate wall-clock timer.

### 8.2 Validation and idempotency

A command envelope includes a stable command ID, run ID, expected state revision, command type and validated payload. Processing MUST follow this order:

1. Check whether the command ID was already processed. Same ID and same payload returns the original receipt with `replayed: true`, regardless of the now-current tick. No new effects occur.
2. Same ID with different payload returns `ID_CONFLICT`, without effects.
3. Validate run state, expected revision, target, permissions, query capability, scope and capacity.
4. Invalid commands return a typed error and have no gameplay, resource or clock effect.
5. Accept once, schedule effects, generate an immutable receipt and commit the resulting state.

A receipt distinguishes **accepted in memory**, **durably saved**, and **replayed**. A persistence failure cannot be disguised as a successful durable save. The recovery behaviour is in Section 16.

### 8.3 Query snapshots and caching

`ACQUIRE` at tick `s` captures matching records already available at `s`, with the requested end of range clamped to `s`. It consumes one tick and delivers that snapshot at `s+1`. An event becoming available during that tick does not leak into the earlier cutoff. The result states **Collected through step s**.

Static sources such as a loaded roster are acquired once per content revision. Reopening them is free. Dynamic source refresh is a new query to a later cutoff and costs one tick even if the answer remains empty. Changing sort order or narrowing a filter within an already-acquired snapshot is free.

The engine must not make a refresh free or costly based on whether hidden malicious events exist. Cache status is determined by source, scope, revision and cutoff, not hidden relevance.

### 8.4 Closing and handoff

`CLOSE_CASE` supplies scope, disposition, confidence, evidence references, structured rationale, limits and one next-step package:

- `close_explained`: close this lead with routine monitoring; do not claim the organisation is clean.
- `handoff_revoke_session`: hand to response team for the named session, with its evidence and justification.
- `handoff_review_monitor`: assign unresolved risk to the response team, state the collection gap, follow-up trigger and review window.

M01's exact follow-up packages are: `close_explained` uses owner `none`, no review deadline and trigger `routine_monitoring`; `handoff_revoke_session` uses `response_team`, a two-tick review window and trigger `confirm_revocation_and_assess_scope`; `handoff_review_monitor` uses `response_team`, a four-tick requested review window and trigger `new_suspicious_activity_or_verification_result`. The unresolved packet also asks for collection restoration and owner verification. A requested review window is not an automatic promise that missing data will become available. These fields are validated for reporting credit, not inferred from free text.

Once accepted, the investigation is closed. Player decisions cannot be edited in the same scored run. The simulation then resolves a labelled **After your handoff** continuation. New observations produced in that continuation cannot change the frozen quality score.

Changing a conclusion is allowed before closing, at no cost. After closing, **Try another approach** creates a separate replay run. There is no ambiguous escalated-but-still-scored P0 state.

## 9. Clock, requests and adversary resolution

### 9.1 Time meaning

A tick is an abstract investigation opportunity, not a minute or a fixed quantity of real analyst work. Existing records may contain conventional event times, but simulation step labels must not imply that one click equals a real minute.

No progression happens while reading, rearranging facts, viewing settings, changing orientation, backgrounding the app or closing the browser. Accepted time-costing commands are the sole driver.

### 9.2 Fixed phase order

For every tick crossed, resolve:

1. Scheduled response/control completions.
2. Scheduled legitimate business actions.
3. Eligible adversary actions, checking current access and dependencies.
4. Resulting asset and service-state changes.
5. Sensor recording and delivery of records whose availability tick has arrived.
6. Completion of player queries and verified checks due at this tick.
7. Update known urgency, terminal conditions and projected player state.

Ties within a phase use authored priority and stable event ID. No reliance on browser task ordering. A control effective at a tick is applied before the adversary action scheduled for that same tick. This tie rule MUST be tested.

### 9.3 Owner verification

A check submitted at tick 0 costs one tick, then remains pending until tick 3. The player can acquire two other one-tick sources and receive the check without separately waiting. A timeout at tick 3 is a delivered result, not a softlock or an undisclosed extra cost.

Verification is through a pre-established directory contact, with the channel recorded. It is corroborating testimony, not proof by itself. Do not send the check to the potentially compromised account and treat any reply as authoritative.

Closing while a check is pending is allowed. The review screen shows its status. Early handoff can be reasonable when sufficient risk evidence is already known; waiting for every possible record is not a requirement.

### 9.4 Bounded adversary

P0 uses an authored schedule with access preconditions, not a large adaptive AI. For the visible malicious M01 fixture, session activity occurs at tick 2, report preparation at tick 5, and the abstract data objective at tick 8 unless the session has been revoked. All are causal events projected through configured sources.

An attacker cannot read the player's notes or react to ordinary record inspection. Later profiles may react to observable controls or loss of access only. No attack-technique enumeration is treated as a compulsory linear sequence. MITRE ATT&CK supplies a vocabulary for adversary behaviour, not a required order of play. [R1]

### 9.5 Outcome, deadlines and safe endings

M01 provides no exact attacker countdown. Once a sufficient risk case is delivered, a visible policy reminder says to hand it over within two further investigation steps. This is a disclosed organisational expectation, not knowledge of a secret data-transfer time.

Attacker success does not immediately terminate the investigation. Players can still establish what happened, acknowledge uncertainty and hand over. A case cannot become unwinnable because the player is unable to find a hidden terminal flag.

After closing, the M01 world runs to `max(8, closeTick + 2)` to resolve the declared responder delay and scheduled objective. This is labelled simulated continuation, not additional player time or a prediction of a real response team.

## 10. Complete first case: The Midnight Login

### 10.1 Briefing and purpose

**Player-facing briefing:**

> A finance session began at 02:13 from a client the sign-in system does not recognise. Finance sometimes carries out approved work outside normal hours. Establish whether this session has a credible explanation, whether it warrants response-team action, or whether missing information prevents a reliable conclusion. You can inspect records and request verification. You cannot isolate a device or shut down finance systems.

**Learning objectives:** compare an anomaly with a baseline; check whether a business explanation matches the actual session; use more than an unexplained alert to support a claim; recognise the difference between unregistered and compromised; make a scoped handoff.

**Visible scope:** account `U-01`, session `S-01`, Finance Portal `FIN-01`, report service `RPT-01`, device registry and work-record source. Do not load the full organisation map in the first case.

**Initial state:** tick 0, one anomalous-session record `EV-01`, two routine feed entries, no confirmed incident and no pending check. All variants use the same opening layout, record identifiers, severity, source menus and help text. Variant codes in Appendix A are author/debug identifiers and must not appear in normal gameplay.

### 10.2 World and visibility matrix

| Internal fixture | Actual world | Visible device/work context | Session visibility | Verification | Defensible end state |
|---|---|---|---|---|---|
| B | Approved work by the account holder | Registered device mapping and matching approved task | Activity within the task | Owner confirms through directory callback | Explained, scoped to this lead |
| M | Unauthorised use of the session | No managed-device match and no work approval in a complete register | Out-of-role sensitive-report activity becomes recordable at tick 2 | Owner denies session | Likely misuse, or an appropriately qualified provisional risk handoff |
| U-B | Approved work by the account holder | Registration mapping and approval archive unavailable | Application collection gap | Owner check times out | Unresolved with documented visibility limit and follow-up |
| U-M | Unauthorised session use | Exactly the same visible limitations as U-B | Exactly the same collection gap | Exactly the same timeout | The same unresolved finding and quality assessment as U-B |

The sparse twins prove a design principle: hidden intent must not alter the assessment of an identical investigation. Their actual post-close outcomes can differ. A player who identifies the sparse pattern cannot earn a high score by guessing its hidden actor.

### 10.3 Available questions and records

| Question | Record template | What it establishes | What it does not establish |
|---|---|---|---|
| Opening anomaly | EV-01 | Successful session, unusual time/client | Who operated it or whether it is malicious |
| Q-H: Compare sign-in history | EV-02 | Relevant 14-day baseline | That legitimate exceptions are impossible |
| Q-D: Check device registration | EV-03 | Mapping to an enrolled device, no match, or unavailable mapping | Maliciousness merely because there is no match |
| Q-C: Check approved work | EV-04 | Whether a reliable register contains a matching person/client/time/task record | That approval alone proves every later action is authorised |
| Q-F: Follow session activity | EV-05 | Recorded access scope, an empty covered interval, or a collection gap | Unrecorded activity beyond the query cutoff or source capability |
| Request verified-owner check | EV-06 | Corroborating confirmation, denial, or timeout | Absolute attribution based on testimony alone |

EV identifiers designate record templates. Every delivered snapshot gets its own immutable acquisition reference and cutoff. A refreshed EV-05 must not overwrite the earlier empty EV-05 snapshot. This preserves what the player actually saw at each decision.

### 10.4 Evidence delivery and dependencies

Q-H, Q-D and Q-C are static for the duration of this case. First acquisition costs one tick; subsequent inspection is free. Q-F is dynamic. Complete-visibility worlds have no matching follow-on entry before tick 2; a query started before tick 2 therefore returns an honestly bounded empty result even if it completes after activity occurs. A new query at or after tick 2 can return the follow-on record. Sparse worlds return a collection-gap result instead.

Owner check submission at tick `s` returns confirmation, denial or timeout at `s+3`. It is not necessary to use that source in every strong solution. Do not reveal the response in a loading label, request duration or voice line before its scheduled arrival.

### 10.5 Sufficient explanations

These are M01 authoring predicates, not universal cyber-investigation rules. A sufficient set uses **cited, delivered observations** and a compatible structured explanation. Merely opening a source is not enough to assert its contents.

| Disposition | Sufficient cited observations | Confidence | Expected next step |
|---|---|---|---|
| Explained | Matching enrolled-device mapping + work record matching this session; alternatively verified-owner confirmation + matching work record | Medium or high | Close this lead with normal monitoring |
| Likely misuse | Owner denies session + observed out-of-role access; alternatively no device match + no approval in a complete register + observed out-of-role access | Medium | Evidence-backed handoff recommending revocation of S-01 |
| Unresolved: visibility-limited | Collection gap + owner timeout + unavailable approval archive | Low about actor intent | Handoff for investigation/monitoring, with stated gap and owner |
| Unresolved: provisional risk | Opening session record + observed out-of-role access, without yet asserting who acted | Low about actor intent | Prompt provisional handoff with identity-verification follow-up |

The provisional-risk route is deliberately valid. A player need not delay a prudent escalation until a stronger attribution claim is supported. It can receive excellent decision-judgement marks while its evidence and reasoning report correctly show a less complete investigation.

### 10.6 Exact action traces

**Benign route A:** Q-H at 0 delivers at 1; Q-D at 1 delivers at 2; Q-C at 2 delivers at 3. Link the session and baseline, cite device/work agreement, consider misuse as the alternative, note that an anomaly alone is not proof, and close the scoped lead at tick 3. No owner request is necessary.

**Benign route B:** Q-C, Q-H, Q-D. The same material understanding is established at tick 3. A different order must not change the quality assessment.

**Malicious technical route:** Q-H, Q-D, Q-C, Q-F. The Q-F snapshot starts at tick 3 and is delivered at tick 4. The complete cited set supports likely misuse. Handoff at tick 4; the responder revokes the session at tick 6, before the scheduled tick-8 objective.

**Malicious verification route:** request the owner check at tick 0; acquire Q-H from 1 to 2; acquire Q-F from 2 to 3. At tick 3, the player receives both the follow-on record and the owner denial. Cite those alongside the baseline, test approved work, bound attribution and hand off. Revocation takes effect at tick 5, before that tick's adversary action.

**Sparse route:** request owner check, then Q-H, Q-D, Q-C and Q-F. The owner timeout arrives at tick 3; the complete route ends at tick 5. The evidence supports a visibility-limited unresolved case. The same recorded reasoning receives the same quality score in U-B and U-M.

**Provisional-risk route:** Q-H, advance one tick, then Q-F. At tick 3 the player can report observed out-of-role activity without claiming established identity compromise. A review-and-monitor handoff with a clear owner and follow-up is supported. Not checking the work/owner explanation yet remains visible as a learning opportunity, not an invalid escalation.

**Late route:** complete the malicious technical route at tick 4, then advance three extra ticks with no investigative purpose and close at tick 7. The policy response window has been missed. Revocation at tick 9 cannot undo the tick-8 objective. Timing judgement decreases because the urgency was known, not simply because damage occurred.

### 10.7 Response continuation

For `handoff_revoke_session`, the response team acts after two ticks if the submitted evidence satisfies the likely-misuse predicate and the recommendation targets S-01. Otherwise it returns **Needs further review**, rather than blindly executing a user's unsupported request.

For `handoff_review_monitor`, the response queue accepts the stated unresolved risk, review ownership and monitoring trigger after two ticks. No immediate session revocation is modelled. The game must not portray this simplified continuation as a complete real-world response process. What happens after handoff is reported separately from the quality of the player's decision.

For `close_explained`, no security control is changed. Only the specific investigated lead is closed. Normal organisational monitoring continues in the story.

Session revocation in M01 stops this session only. This authored case has no second attacker foothold. Later cases may model additional access explicitly; they must not imply that revoking one session removes every possible compromise.

### 10.8 Completion and hints

Every branch can be completed without specialist knowledge or forced response. Unsupported conclusions remain submittable for learning. Required form fields and valid evidence IDs are input constraints; hidden rubric predicates are not submission locks.

The first hint asks what would make unusual finance activity legitimate. The second points to approved work or the device mapping. After a gap is delivered, the mentor asks what can still be concluded and who should own the missing check. For matched sparse worlds these hints are identical.

No visible record, query cost, hint, achievement, sound, default confidence or debrief preview may identify the true branch before closing.

## 11. Next cases and campaign architecture

### 11.1 M04: The Forgotten Server, first proactive hunt

**P1 role:** introduce hunting without waiting for an alert. A planned review asks: **Could the billing service account be used interactively on systems outside its documented purpose?** There is no initial security warning. CrowdStrike's description of hunting includes hypothesis-led searches and resolution through communication to security operations; that distinction informs this design choice. [R3]

The player chooses a scope using a simple account-to-system comparison. The baseline says `svc-billing` ordinarily runs scheduled work from `APP-01`. A targeted authentication query reveals an interactive session on `LEGACY-01`, absent from the current asset list. The player chooses whether to investigate the business dependency, the session origin or the server's monitoring coverage.

| Element | Authored design requirement |
|---|---|
| Starting scope | Service account, billing application and records of its normal use |
| First discovery | A specific session on a legacy host, reached by the player's query rather than an initial alert |
| Benign explanation | Approved migration support uses the legacy host; an old change record and task-origin record explain the specific session |
| Malicious explanation | Unauthorised interactive use establishes a persistent task; host/task evidence and application/network context support the claim |
| Visibility-limited explanation | Ownership and authentication are observable but the legacy host lacks historical process collection |
| Business dependency | Legacy host supports a billing batch. Registry absence or system age does not mean it is disposable. |
| Required sources | Service-account baseline; authentication; ownership/dependency check; task-origin collection where available; change record |
| New mechanic | Narrow the hunt from an account/system matrix, then test an unexpected relationship |
| Response boundary | Recommend a scoped account/session or managed-host action only under the specified capability and policy |
| Learning outcome | A quiet dashboard is not proof that no hunt is warranted; undocumented does not automatically mean malicious |

**Planned event schedule:** unusual session at 0, task activity at 2, consequential access at 6, objective opportunity at 10. These numbers are a P1 authoring target, not shipped fixture data. A sensor enabled at tick 4 must not reveal the process creation at tick 2. It may observe a later scheduled execution if that source capability is explicitly modelled.

**Required sufficient sets before P1 implementation:** one business-explained route with matching change/task origin; one suspicious route linking unauthorised account use with a distinct host or application observation; one gap route establishing both the missing capability and a follow-up owner. The case needs two sound investigation orders and at least one decision where host dependency changes the recommended response.

### 11.1.1 M04 concrete P1 authoring blueprint

**This section is a content-design brief, not executable M04 rules.** It must be converted into a versioned mission package and reviewed before P1 release. It follows the canonical source-cutoff, permission and case-closing principles of Sections 7–9, but P1-specific account/host commands and scoring must be defined explicitly during authoring.

**Opening question:** “Has `svc-billing` been used interactively outside the application systems it is meant to support?” No alert banner appears. The first satisfying discovery must be earned by a player-initiated query of account-to-host activity.

| Component | Proposed playable specification |
|---|---|
| Discoverable starting context | Service account profile; expected batch origin `APP-01`; permitted review window; read-only relationship list |
| Initial investigative questions | Compare account activity by host; inspect session type/origin; inspect ownership and dependencies; check relevant change record; inspect monitored task provenance |
| Core surprising clue | An interactive-looking session on `LEGACY-01`, absent from the current inventory but reachable via authentication relationship |
| Business constraint | `LEGACY-01` supports a billing batch; “absent from inventory” does not imply safe shutdown |
| Benign branch | Verified migration task covers the same account, host, time, operator and interactive session purpose; corroborating origin record exists |
| Malicious branch | No applicable approved task; an unauthorised session relates to a new persistent task and separately recorded consequential access |
| Sparse branch | Host process telemetry absent; account and dependency context visible; no sufficient evidence to claim task origin or operator |
| Response | Recommend account/session investigation or an explicitly authorised managed-host action **only** when target capability and business dependency are known |
| Debrief payoff | Show why the discovered connection matters and whether avoiding automatic isolation protected an essential billing job |

**Authoring to-do before P1 sign-off:** define stable host/account IDs; time/cutoff matrix for each record; a complete coverage table; source lineage; response authority; two independent valid routes per observable branch; appropriately bounded inconclusive sets; a fairness twin when visibility is intentionally matched; and strong/incomplete/guess golden traces. Do not reuse M01's scoring predicates or assume that every interactive service-account session proves compromise.

**P1 visual and audio hook:** the player starts with a clean account-to-host relationship overview. A player-initiated exploration reveals the previously undocumented legacy connection, using the same neutral discovery styling regardless of its truth. Morgan's optional line: “That account appears on a system outside its usual path. Can you establish why?” The evidence screen should reveal dependency context without a wall of raw events.

### 11.2 M07: The Missing Logs, a coverage-led hunt

**P1 role:** teach that a hunt can produce an operationally useful visibility finding. The starting question is: **Would we be able to observe privileged activity on the customer-service systems over the period under review?** There is no opening compromise alert.

The player compares a declared collection map with recent source health and a permitted synthetic verification event. A source marked active may have stopped delivering records. A second source covers authentication but not the consequential application action.

| Element | Authored design requirement |
|---|---|
| Starting scope | Two services, their declared collection capabilities and a bounded time window |
| First discovery | Claimed coverage and actual recent collection do not agree |
| Benign world | Collection misconfiguration; no unauthorised access |
| Malicious world | Activity occurred in the missing interval but is not attributable from the available sources |
| Matched-evidence test | At least one benign/malicious pair is observationally indistinguishable and receives identical quality assessment |
| New mechanic | Future-only enhanced collection and a defined observation window |
| Useful resolution | Identify missing source/period, bound the hunt conclusion, assign a repair and recheck, and state what would trigger escalation |
| Failure to avoid | Concluding that no records means no activity, or claiming evasion merely because a sensor failed |

**Authoring requirement:** state exactly what the verification event can test. Successful receipt proves only that specified collection worked for that event and time, not that all historical activity was monitored. There is no need for an executable attack payload.

M04 and M07 are designed here but do not yet have production JSON, complete observation predicates or executed golden fixtures. Their P1 authoring acceptance gate is mandatory; the M01 validation results must not be reused to claim they are ready.

### 11.2.1 M07 concrete P1 authoring blueprint

**This is an authored-design target, not a production fixture.** Its purpose is to make an intentionally incomplete case meaningful, not to reward pretending to know hidden malicious activity.

| Component | Proposed playable specification |
|---|---|
| Opening question | “Can we reliably observe privileged actions on the two customer-service systems during the period we intend to hunt?” |
| Starting view | Two service cards, declared sensor/collection map, stated audit period and no incident alert |
| First tension | Dashboard says collection enabled, but recent source health suggests one pipeline stopped delivering records |
| Investigative tools | Inspect coverage configuration; compare delivered-event heartbeats; initiate a synthetic source-health check; examine another source's **limited** capability |
| New mechanic | Select a monitoring coverage question, use a controlled verification event, and distinguish evidence of functioning collection **now** from missing historical collection |
| Benign branch | Source configuration mistake explains absence; no unauthorised system action occurred |
| Malicious branch | Some unauthorised activity occurs within the missing interval but is not established by available telemetry |
| Sparse evidence twins | Same player-visible coverage failure, verification responses, timings and cues in benign and malicious worlds |
| Supported finding | State exact system, source, missing interval and unsupported inference; assign restoration and a repeat verification/review |
| Unacceptable conclusion | “No logs, therefore no activity” or “No logs, therefore deliberate attacker evasion” |
| Debrief payoff | Distinguish a genuinely useful visibility finding from proof of an intrusion and show subsequent organisational handling without altering the frozen quality score |

**P1 authoring to-do:** specify source-health semantics, observation windows, synthetic-check coverage, record lineage, what a successful test actually proves, limited sensor-enablement authority, response ownership, versions, score rubric and at least one paired evidence-equivalent hidden world. Enabling a sensor later must never recover historical events that its capability did not record.

**P1 presentation hook:** a layered coverage map shows *declared* vs *observed* collection as two labelled channels rather than ominous threat-red dots. Morgan can say, “Before judging the activity, establish whether you would have been able to see it.” The scene should culminate in an actionable visibility finding, not a fake attacker reveal.

### 11.3 Twelve-case campaign

Retain stable mission IDs even when release order changes. P1 introduces M01, M04 and M07; the eventual campaign navigation groups them by learning purpose rather than falsely labelling them consecutive content IDs.

| ID | Mission | Trigger | Distinct addition | Main misconception challenged |
|---|---|---|---|---|
| M01 | The Midnight Login | Alert/tutorial | Baseline and session explanation | Unusual means malicious |
| M02 | Too Many Alerts | Alert comparison | Severity versus business priority | The loudest alert is always most important |
| M03 | The Trusted Employee | Behaviour review | Trusted identity and behavioural context | A trusted person/account cannot be misused |
| M04 | The Forgotten Server | Proactive hypothesis | Account-to-host scope and legacy dependencies | No alert or inventory entry means no risk |
| M05 | Stolen Identity | Intelligence-led hypothesis | Credentials versus person attribution | Activity by an account proves the owner did it |
| M06 | Moving Quietly | Proactive scope review | Distinguish management activity from suspicious cross-system access | Every administrative connection is lateral movement |
| M07 | The Missing Logs | Coverage-led hypothesis | Collection limits and future-only monitoring | No records means nothing occurred |
| M08 | The Cloud Connection | Workload/identity review | App, identity and workload boundaries | Endpoint-only investigation covers cloud activity |
| M09 | The Silent Administrator | Privilege review | Emergency access and authorisation scope | Privileged means authorised for every task |
| M10 | The Insider Question | Conflicting reports | Behaviour versus intent; evidence discipline | Policy breach proves malicious intent |
| M11 | The Unseen Adversary | Multi-source hypothesis | Split and rejoin several causal explanations | Every suspicious event belongs to one attack |
| M12 | Operation Shadowfall | Capstone | Bounded conclusions and prioritised handoff | A complete investigation needs certainty about everything |

OT and critical-infrastructure environments remain later expansions, not hidden P1 commitments. Before shipping them, commission appropriate scenario review of safety constraints, monitoring capability and control authority. The game should not use corporate endpoint assumptions as universal OT rules.

## 12. Replayability without arbitrary puzzles

### 12.1 What changes

Authored variants may change whether an exception is legitimate, which independently useful source is available, how a dependency is documented, which activity is actually in scope, and when an observable follow-on action occurs. A variant must change at least one meaningful inference or decision, not merely swap IP addresses or employee names.

Initial replay offers **Same case, same conditions** or **Another case variation**. A same-seed replay is a learning exercise after the truth was revealed. Do not present its score as a blind test.

### 12.2 What must not change

The actual world is selected before play and remains fixed. Hints, narrative randomisation, accessibility settings, animation timing and device speed cannot change it. Opening another panel does not reroll an event. Failed commands and duplicate requests do not create extra world turns.

A seed alone is insufficient to reproduce a run unless the engine, content, policy and scenario-profile versions are also fixed. Persist all of them. Cosmetic randomisation uses a separate stream and is excluded from gameplay state hashes.

### 12.3 Later procedural mode

Generate from validated causal templates, not arbitrary combinations of records. The generator chooses a world, collection profile, permitted actions, business explanation and response constraints, then derives records. It must not independently invent a story and a contradictory evidence list.

Before accepting a generated case, validate entity references, access preconditions, event order, source capability, evidence provenance, at least one supported disposition, a sensible uncertainty route where applicable, and two materially different reasonable investigation orders for cases intended to support them.

Reject cases whose answer is leaked by branch names, record count, loading time, source availability wording, hints or decorative emphasis. Introduce matched-observation tests so the evaluator cannot silently use hidden truth.

### 12.4 Progression and community features

Hunter profiles describe in-game habits such as testing alternatives or recording scope limits. They are not personality or competency diagnoses. Shared seeds MAY be introduced without accounts. Competitive leaderboards, multiplayer and server validation are separate projects and are not prerequisites for replayability.

## 13. Scoring without hindsight or guesswork

### 13.1 Two reports, not one blended number

**Investigation Quality** assesses reasoning and action from the information reasonably in play. **Operational Outcome** reports what happened in the simulation, including activity before discovery and the simplified response continuation. Actual damage, attacker success and business downtime do not enter the quality formula.

Proportionality and response timing still matter, but they are evaluated against disclosed policy and the decision snapshot. A lucky guess cannot become an excellent investigation merely because the underlying actor was malicious.

### 13.2 Canonical formula

Each component is in the range 0–100. Weights are fixed for P0; a later change requires a new rubric version and fresh golden expectations.

```text
Quality = round_half_up(
    0.30 * Evidence
  + 0.25 * Reasoning
  + 0.30 * Decision
  + 0.15 * Report
)
```

Round once, at the end. There is no separate speed bonus, number-of-alerts bonus, operational-damage multiplier, hidden resource-efficiency meter or penalty for using hints. Ticks and redundant actions may be shown descriptively.

### 13.3 M01 component rules

| Component | Points within component | Rule |
|---|---:|---|
| Evidence | 25 | Cite the starting session and relevant baseline |
| Evidence | 25 | Check and cite legitimate-work context: work register or verified-owner result, including a documented failed check |
| Evidence | 25 | Check and cite technical/session context: registry or application/collection result |
| Evidence | 25 | The cited observations meet one sufficient set for the selected disposition |
| Reasoning | 50 | The stated explanation has a sufficient cited set |
| Reasoning | 30 | A competing explanation is tested with a compatible record and its status correctly bounded |
| Reasoning | 20 | A limitation is recorded and tied to a delivered observation |
| Decision | 40 | The supported disposition and recommended next action form an appropriate pair |
| Decision | 30 | The recommendation uses a permitted action and correct session scope; no self-authorised control |
| Decision | 30 | A supported finding is handed over within the disclosed response window, or no urgent response condition has been established |
| Report | 40 | Claim confidence is compatible with the evidence-supported finding |
| Report | 30 | Scope is S-01 only, the starting session is referenced, at least two source families support the report, and a relevant limit is recorded |
| Report | 30 | A supported next step includes the required owner, review window and trigger, or appropriately closes the explained lead |

The two-source-family reporting rule is specific to this introductory case. It is not a general statement that any two sources confirm compromise. The sufficient-set predicates do the substantive work.

The baseline, legitimacy and technical questions are fixed obligations. They remain in the denominator if the player closes at tick 0. A completed failed check can earn credit for establishing a limitation; never querying that source cannot.

### 13.4 Structured reasoning and anti-gaming

The scorer uses selected claims, evidence roles, scope and rationale codes, not an LLM's impression of prose quality. Optional free text is not graded in P0. Every point is traceable to a visible observation or recorded action.

Each claim has one selected competing-explanation status, so ticking every explanation cannot earn extra credit. A mismatched fact/status pair earns no reasoning credit. Repeated evidence from the same acquisition does not fill additional evidence questions. An irrelevant caveat does not satisfy the limitations rule.

A terminal report may acknowledge several remaining uncertainties without being forced into one narrative. The player is allowed to choose a conservative preliminary handoff. “Unresolved” earns a supported-basis credit only when either the required visibility checks or the provisional-risk predicate is satisfied. Unsupported uncertainty receives a low evidence score, just as unsupported accusation does.

P0's record catalogue contains only statements that can be safely presented in the supported structured forms. If later free-form claim construction allows additional assertions, add explicit unsupported-assertion and contradiction fixtures before scoring them. Do not silently add natural-language grading.

### 13.5 Timing and missed opportunity

M01 starts its response-window indicator when an out-of-role session observation is delivered, not when the hidden activity occurs. The player sees the two-step expectation and pending checks. The quality deduction for a late handoff is limited to Decision's 30-point timing component, equivalent to nine points in the total score.

A missed baseline or legitimacy question affects the relevant component, not a hidden universal score cap. If a provisional escalation is timely and proportionate, its Decision score can be full even with incomplete Evidence or Reasoning scores.

Later cases must author any additional urgent-window triggers and exceptions explicitly. They may not punish a player for an unobserved countdown or an unavailable verification path.

### 13.6 Fixture outcomes

Appendix B lists the actual finite-reference results. Strong complete M01 traces currently score 100; these are deliberate maximum-credit test cases, not a claim that most players will do so. An evidence-backed provisional handoff scores 85. A deliberately delayed, otherwise strong handoff scores 91. Unsupported early guesses and unsupported unresolved closures score 14.

These numbers verify the authored arithmetic and ordering; they do not validate educational effectiveness or prove the rubric is calibrated. Human reviewers must assess whether the differences feel fair. If the rubric changes, update both the narrative rules and machine-readable fixture, then rerun the checks.

## 14. Debrief and transferable learning

### 14.1 First screen

Start with **Your finding**, one sentence on whether it was supported, and a specific explanation. Present quality and outcome as separate labelled cards. Make the numeric breakdown optional so a newcomer can focus on understanding rather than performance anxiety.

A high-quality unresolved case should not show a red failure banner because a hidden attacker was present. An unsupported but lucky accusation should not receive celebratory attack-caught messaging as though the method was sound.

### 14.2 Reconstruction

Show three aligned tracks: actual world activity, collection availability, and player actions/knowledge. At each decision, clicking **What I knew then** must hide later observations. Highlight the next reasonably investigable question and why it mattered, not a secretly optimal click sequence.

Use explicit labels: **Known at your decision**, **Could have been checked**, **Not observable then**, and **After your handoff**. Ground truth from the last category never moves retrospectively into the first.

### 14.3 Debrief example: sparse world

> You established that the session was unusual, but the approval archive and application records were unavailable and the owner could not be reached. Your low-confidence, session-scoped report and follow-up request were justified. The simulation's hidden actor was malicious. That fact was not established by the sources available to you, so it does not reduce your investigation-quality assessment.

A benign twin uses the same reasoning assessment and different explicitly labelled world outcome. Neither version implies that the player proved the entire environment safe.

### 14.4 Debrief example: late handoff

> By step 4, you had observed activity outside the account's role and checked the main alternative explanation. You then advanced three steps without gathering additional relevant evidence. The case's two-step handoff expectation was exceeded. The response took effect after the simulated objective. The timing deduction reflects the known delay, not a requirement to predict the attacker's hidden schedule.

### 14.5 Counterfactuals and transfer

A counterfactual is allowed only when it is actually rerun from a saved state under the same rules with a specified changed action. Otherwise label it as an illustrative alternative, not “what definitely would have happened.” Counterfactual outcomes do not alter the original quality score.

End with at most three concrete takeaways tied to the player's own actions. A short transfer question may ask which additional source would strengthen this kind of conclusion elsewhere; keep it optional and do not use it to gate progression.

## 15. Browser architecture and data contracts

### 15.1 Declared technology stack and ownership

The first implementation MUST be a browser-native, single-player React application. The following packages and patterns are the **recommended committed baseline** for P0 unless a recorded architecture decision demonstrates a clearly better equivalent. Do not introduce a dedicated game engine such as Unity, Unreal or Phaser merely to display event cards, evidence relationships and investigative screens. The game's most important mechanics are state transitions, source queries, evidence reasoning and handoff, not 3D physics or reflex combat.

#### 15.1.1 Technology decision matrix

| Area | Preferred technology | P0 priority | Responsibility and constraints |
|---|---|---|---|
| UI framework | **React + TypeScript** | Core | Typed components, navigable screens, accessible controls and mobile/desktop parity |
| Dev/build tool | **Vite** | Core | Fast local workflow, static production assets, environment-specific builds and code splitting |
| Styling and design system | **Tailwind CSS** with named CSS variables/tokens | Core | Theme, surface, typography, spacing, contrast, responsiveness and shared components; avoid arbitrary per-screen styles |
| Lightweight app/view state | **Zustand** | Core | Active screen, selected lead, visible filters, panel states and permitted `PlayerView`; **not** a second authoritative simulation engine |
| Simulation/game rules | **Custom pure TypeScript state machine/reducer** | Core | Truth, discrete clock, adversary behaviour, query projection, authority, decisions, scoring and deterministic replay |
| Runtime validation | **Zod** | Core | Validate scenario content, imported saves, commands, media manifests and persistence versions at trust boundaries |
| Durable browser storage | **IndexedDB through Dexie.js** | Core | Atomic commits, mission progress, source snapshots, saves, schema migrations, run leases and recovery |
| Game UI transitions | **Motion for React** | Core but restrained | Screen changes, card emphasis, evidence movement and nonessential discovery effects; respect reduced motion and never advance game time |
| Audio playback | **Howler.js** | Core | Pre-generated voice, essential sound effects, channel mixer, playback priorities and safe autoplay failure handling; guard browser-specific limitations |
| Voice asset creation | **Approved pre-generated text-to-speech workflow** | Content pipeline, core assets | Narration, Morgan guidance, status and debrief clips authored and listened to before release; provider-neutral and no runtime voice service |
| Theme/mission artwork | **Original or rights-cleared artwork, including generated imagery** | Content pipeline, core assets | Text-free landscape/portrait artwork, reviewed crops, compressed delivery variants and source/attribution inventory |
| Topology/relationship UI | **Accessible cards/list initially; React Flow optional** | P1 optional | Add React Flow only if playtests show that an interactive graph improves investigation; lazy-load it and always retain the list equivalent |
| Unit and simulation tests | **Vitest** | Core | Reducer contracts, scheduler, source visibility, fixed M01 traces, score invariants and deterministic replay |
| Browser/interaction tests | **Playwright** | Core | Start-to-finish flows, responsive layout, keyboard/touch emulation, saving, content loading, no-truth-leak checks |
| Repository and continuous integration | **GitHub + GitHub Actions** | Core | Source, reviewed pull requests, typecheck, lint, build and automated quality checks before deployment |
| Deployment | **Vercel** | Core | Static-first HTTPS hosting, deployment previews, production deployment, SPA fallback routes and versioned static assets |
| Server/database service | **None for P0** | Deliberately excluded | No player account, API, server database, realtime sync, live logs or paid inference dependency |

**Technology version policy:** At repository creation, record supported Node.js and browser targets, select mutually compatible current stable dependencies, pin a package-manager lockfile and record licences. Do not silently replace the stack with a different framework, install experimental packages indiscriminately, or infer that listing a library means it has already been installed. **React Flow is not a prerequisite for P0**; the network/relationship view can still be visually polished using bespoke cards and SVG connections where accessible.

#### 15.1.2 One-way ownership of data and effects

```text
                   VERCEL STATIC WEB APPLICATION
          React + TypeScript + Vite + Tailwind CSS
                                |
         +----------------------+--------------------+
         |                                           |
     PRESENTATION                                UI INTERACTION
   hero/mission art                           commands / navigation
   Motion for React                                |
   Howler.js + voice                         Zustand view store
         |                                           |
         |                                   command adapter
         |                                           |
         |                                authoritative TypeScript
         |                                  deterministic engine
         |                                           |
         |                                 validated content (Zod)
         |                                           |
         |                                  commit and recovery
         |                                  Dexie / IndexedDB
         |
     permitted PlayerView / debrief only (never private truth)
```

- UI components submit **typed commands** through a single command adapter; they never directly change the authoritative simulation clock, hidden truth, evidence-source availability or assessment result.
- The **engine** alone validates commands, resolves discrete ticks, projects permitted records, computes rubric outputs and produces deterministic replay events.
- **Zustand** holds ephemeral UI state and published permitted views. Avoid copying private world truth into a UI store or maintaining a second independent clock.
- **Dexie** owns the IndexedDB persistence boundary; only a completed transaction can produce a `committed` save receipt. Replays derive engine state from the versioned manifest, snapshot and canonical command log, not from visual state.
- **Zod** validates data at runtime. TypeScript compile-time types alone cannot validate JSON, version compatibility or user-imported saves. Cross-file scenario references need an additional authoring validator.
- **Motion/Howler/art** consume observed game events or permitted view state through a presentation adapter. Audio callbacks, animation completion, decode readiness and image load MUST NOT dispatch gameplay commands, reveal hidden truth or alter replay hashes.
- Network graphs, if introduced, are a **visual projection** of the same authorised relationship records. React Flow must not invent causal edges or make critical information available only through dragging.

#### 15.1.3 Production folder and boundary convention

```text
src/
  app/              React entry, routes, responsive shell and error boundaries
  ui/               shared Tailwind-driven primitives, tokens, accessibility
  features/         leads, explore, case-file, timeline, handoff and debrief
  stores/           Zustand view/selection/preferences state (not world truth)
  domain/           TypeScript commands, records, permissions, rubric contracts
  engine/           pure reducer, tick scheduler, truth, projections and replay
  content/          versioned case data, glossary and validated fixtures
  evaluation/       evidence-based scoring and debrief-fact generation
  persistence/      Dexie database, migrations, atomic writes, import/export
  presentation/
    art/            responsive art manifest, crops and fallback definitions
    voice/          cue definitions, approved scripts, transcripts and captions
    sound/          Howler mixer, priority queue, ambience and effects
    motion/         Motion variants and reduced-motion equivalents
  tests/            Vitest fixtures, golden traces and Playwright E2E tests
public/
  art/              compressed text-free hero, portrait and case images
  audio/            pre-generated compressed voice and effect assets
.github/workflows/  CI for typecheck, lint, unit tests, build and E2E checks
```

An engine test must run without React, Zustand, Tailwind, Dexie, Motion, Howler, DOM APIs or a browser. Storage tests use an appropriate IndexedDB test adapter, while final IndexedDB and audio behaviour must also be verified in browsers. Keep static authored media away from engine imports. A media manifest must refer to **public player-safe cue IDs** only; do not expose hidden world/branch names in asset filenames, network requests, preload sets or accessibility labels.

#### 15.1.4 Web presentation and generated voice production

1. **Artwork:** create approved text-free landscape and portrait masters; export responsive compressed variants; add an immutable art-manifest entry with dimensions, source/review status and focal/crop metadata. The UI renders the title and controls as live text, never as part of the flattened hero.
2. **Voice:** author script and captions first, generate approved synthetic speech at build/content-production time, human-review pronunciation/clarity, export compressed browser-compatible files and register cue ID, transcript, duration, speaker, trigger and asset version. No runtime TTS service is required.
3. **Playback:** Howler.js handles the audio layer; a game-owned mixer handles master/voice/effects/ambience levels, consent-to-play, caption pairing, single foreground narrator, skip/replay and interruption. Browser autoplay restrictions must result in a safe **Tap to enable audio** state, not a gameplay failure.
4. **Motion:** Motion for React animates presentation only, with stable keys and nonblocking transitions. Prefer CSS for trivial static hover/focus styles. Honour reduced motion and prioritise legibility on phone/tablet.
5. **Lazy loading:** deliver a small themed shell and currently selected hero variant first. Defer the React Flow package (if ever selected), advanced case diagrams, later mission artwork and secondary audio bundles. `Case ready` remains distinct from `Voice pack ready` as specified in Section 18.

#### 15.1.5 Development and deployment workflow

1. Initialise a GitHub repository with TypeScript strict mode, Vite, the chosen package manager and committed lockfile.
2. Configure Tailwind tokens, responsive game shell, Zustand permitted-view store, command adapter and pure engine; build and test one complete M01 route before adding presentation complexity.
3. Add Zod schemas and cross-file content validation, Dexie schema/migrations and golden Vitest reference checks. Then integrate the required artwork, Motion transitions and reviewed Howler voice pack.
4. Configure GitHub Actions to run at least **format/lint, TypeScript typecheck, schema/content lint, Vitest, production build and Playwright smoke flows**. Fail CI on red core contracts or missing mandatory cues/assets.
5. Deploy previews to Vercel for device and creative review. Promote only after the release matrix in Sections 19–22 passes; preserve the previous ruleset's save/replay compatibility or provide an explicit migration/incompatibility path.
6. Pin dependency versions in CI and deployment. Examine bundle reports and licences, monitor security advisories and avoid shipping unused animation, audio, graph or AI libraries in the P0 entry bundle.

**Explicit non-requirements:** Next.js SSR, a hosted database, Firebase/Supabase, serverless APIs, a multiplayer service, WebGL/Three.js, a proprietary simulation engine and a runtime language model are **not required** for P0. Add one only with a concrete capability gap, budget, data/privacy model and documented acceptance tests.

### 15.2 Boundary types

The following is a compilable TypeScript boundary contract, not an implementation of the engine. Runtime validators must enforce scope, references and size limits in addition to these static types. Observation codes used by the reference fixture are private rubric identifiers; normal UI uses the corresponding factual text.

```ts
type Tick = number;
type Disposition = 'explained' | 'likely_misuse' | 'unresolved';
type Confidence = 'low' | 'medium' | 'high';
type NextStep =
  | 'close_explained'
  | 'handoff_revoke_session'
  | 'handoff_review_monitor';
type QueryId = 'Q-H' | 'Q-D' | 'Q-C' | 'Q-F';
type EvidenceRef = {
  acquisitionId: string;
  recordId: string;
};
type CaseDraft = {
  subjectId: string;
  sessionId: string;
  coverageThroughTick: Tick;
  disposition: Disposition;
  confidence: Confidence;
  evidence: EvidenceRef[];
  alternativeStatus: string;
  alternativeEvidence: EvidenceRef[];
  caveats: { code: string; evidence: EvidenceRef[] }[];
  nextStep: NextStep;
  nextOwnerRole: 'none' | 'response_team';
  reviewWithinTicks: number | null;
  followupTrigger: string | null;
  scopeStatement: 'session_only';
  optionalNotes: string;
};
type PlayerCommand = {
  commandId: string;
  runId: string;
  expectedRevision: number;
} & (
  | { kind: 'ACQUIRE'; queryId: QueryId; cutoffTick: Tick }
  | { kind: 'REQUEST_CHECK'; check: 'directory_callback'; subjectId: string }
  | { kind: 'ADVANCE'; durationTicks: 1 | 2 | 3 | 4 }
  | { kind: 'EDIT_CASE'; draft: CaseDraft }
  | { kind: 'CLOSE_CASE'; draft: CaseDraft }
);
type PublicRecord = {
  ref: EvidenceRef;
  sourceId: string;
  subjectIds: string[];
  eventTick: Tick | null;
  eventTimeLabel: string;
  snapshotCutoff: Tick;
  deliveredTick: Tick;
  collection: 'covered' | 'partial' | 'unavailable';
  observation: string;
  caveats: string[];
  lineageGroup: string;
};
type PendingCheck = {
  requestId: string;
  subjectId: string;
  requestedTick: Tick;
  dueTick: Tick;
  kind: 'directory_callback';
};
type PlayerView = {
  runId: string;
  revision: number;
  tick: Tick;
  phase: 'briefing' | 'investigating' | 'closed' | 'debrief';
  records: PublicRecord[];
  pendingChecks: PendingCheck[];
  draft: CaseDraft;
  responseWindowOpenedAt: Tick | null;
};
type Receipt = {
  commandId: string;
  status: 'accepted' | 'rejected';
  replayed: boolean;
  resultingRevision: number;
  resultingTick: Tick;
  durability: 'committed' | 'memory_only' | 'not_applicable';
  errorCode?: 'ID_CONFLICT' | 'STALE_REVISION' | 'INVALID_TARGET'
    | 'INVALID_SCOPE' | 'UNAUTHORIZED' | 'CLOSED' | 'INVALID_PAYLOAD';
};
type QualityReport = {
  rubricVersion: string;
  evidence: number;
  reasoning: number;
  decision: number;
  report: number;
  total: number;
  reasons: { ruleId: string; evidence: EvidenceRef[]; explanation: string }[];
};
```

### 15.3 Additional domain records

| Record | Required contents | Invariant |
|---|---|---|
| Truth event | Stable ID, tick, actor, preconditions, affected scope and consequences | No effect without satisfied preconditions |
| Collection record | Truth/source origin, capability, collection time, availability time and coverage | No collection outside declared capability |
| Acquisition | Query, fixed scope/cutoff, resulting record references and delivery tick | Immutable, including empty/gap results |
| Decision snapshot | Known records, capabilities, urgency, pending checks, policy and submitted draft | Cannot be supplemented with later facts for scoring |
| Run manifest | Engine, content, rubric, schema, policy and profile versions; seed; private selected fixture | Reproduction requires the full manifest |
| Response event | Target, authority, cited decision snapshot, effective tick and result | Cannot exceed the explicitly requested and permitted scope |

In P0, the observation tokens in Appendix A can be mapped directly to these records. Production authoring must attach origin and lineage information; the compact reference fixture is not a substitute for the full persistence schema or rendering implementation.

### 15.4 Determinism and randomness

P0 is a finite authored state machine; random generation is unnecessary for its event logic. If the UI selects a variant, record that choice privately at run creation. Display run codes must not reveal the variant. Later random generation uses a named, seeded algorithm whose version is part of the manifest.

Authoritative transitions cannot depend on `Date.now()`, animation frames, locale sorting or uncontrolled `Math.random()`. Real timestamps are permitted for save metadata only. Use stable event ordering and canonical serialisation for replay hashes; exclude view position, sound settings, local timestamps and cosmetic identifiers.

### 15.5 Rendering and errors

Project only permitted fields into the UI. Error messages must explain the failed request without disclosing hidden actor status. A source result may be empty or incomplete; a technical rendering failure must be a different error state, not fabricated evidence.

Keep case data and evaluation logic separate from presentation. The Case File's structured claims must render as accessible text even if a graph fails. Use error boundaries that preserve the last committed run and offer safe reload/export.

## 16. Persistence, recovery and deployment

### 16.1 Honest storage promise

Use IndexedDB for versioned local saves. Browser storage is origin-scoped and may be best-effort; browsers can evict it and users can clear it. Local autosave is therefore not an unconditional backup guarantee. [R4]

The interface says **Saved on this device**, not “saved to your account.” Opening the game on another device or another deployment hostname does not automatically transfer progress. Provide export/import before claiming portability. Explain private-session or storage failure risks when detected; do not claim that persistence APIs guarantee protection against user deletion.

### 16.2 Commit sequence

For a consequential command, prepare the next state deterministically, then transactionally store the accepted command, receipt, resulting snapshot and updated revision. Mark the action **durably committed** only after that transaction succeeds. Disable a second conflicting command while the first commit is unresolved, with immediate visible feedback.

On storage failure, retain the prepared in-memory state, show **Not saved**, and offer export or an explicitly chosen temporary-session mode. Do not silently discard accepted in-memory work or claim it was durable. In temporary mode, clearly distinguish the last durable save from current volatile progress.

Free-text drafts can use a short debounce, but closing a case must flush the full draft. Backgrounding can request a best-effort flush; it is not a guarantee that an abruptly killed browser will save every keystroke. The UI must show pending versus saved changes accurately.

### 16.3 Save envelope

Persist schema version, complete run manifest, run ID, latest committed revision, canonical command log, last valid engine snapshot, acquisition snapshots, case draft, pending requests, original command receipts, state hash and save metadata. Store accessibility preferences, caption preference, audio channel levels and voice consent separately from gameplay state. Restoring a run must not autoplay speech or reroll facts.

A checksum detects accidental corruption, not malicious tampering. For local single-player play, a technically knowledgeable user may inspect or alter a save. Do not present checksum validation as authenticated competitive scoring.

### 16.4 Recovery and migration

On resume, validate the envelope and its versions, restore a valid snapshot, replay commands after its sequence boundary, then compare the expected gameplay-state hash. Never reapply commands already included in the snapshot. Pending requests resume at their existing due ticks, not at a newly calculated wall-clock deadline.

Keep one last-known-good committed snapshot. A failed migration must offer export and an explicit recovery/restart choice without overwriting the old save. Major incompatible rulesets cannot be silently translated into different outcomes. Offer supported migration, a retained compatible build where available, or clearly labelled restart with the original export preserved.

### 16.5 Multiple tabs and import limits

One run has one active writer. Use a run lease and revision checks with cross-tab notification where supported; a second tab opens read-only until ownership is transferred. A stale revision must be rejected and refreshed, not merged by last-write-wins.

P0 import accepts the game's validated JSON envelope only. Initial product limits: 2 MiB file size, 20,000 commands, bounded strings and maximum nesting depth 64. Validate enum values, IDs, numeric bounds, version compatibility and references before state construction. Reject prototype-pollution keys and never evaluate imported text. No real-log import or arbitrary scenario code is supported.

### 16.6 Connectivity contract

A first online load is required in P0. Before showing **Case ready**, preload the active case's rules, records, glossary, debrief templates, essential interface assets and gameplay routes. Once ready, that case must remain fully playable in text without further network requests, including its debrief and local save. Deferred route chunks must not break this promise when the user goes offline.

Required voice assets are shipped with the product but load as a separate active-mission pack without blocking the core investigation. Show **Voice pack ready** only when the complete required pack, including alternative debrief paths, is available for the current session. Missing or failed audio falls back to the same text with an honest status. Once the pack is ready, its clips require no additional network requests during that loaded session. Home-art or optional ambience failure must not break controls or invent evidence. See Section 18.9.

P0 does not promise offline cold start after browser restart. Optional service-worker/PWA work is P2 or later and requires separate cold-start, update, cache and recovery tests. An install button is not evidence of offline reliability.

### 16.7 Vercel release contract

The production build must provide working HTTPS assets, direct-route refresh, explicit asset/content versioning, no client secrets and a predictable upgrade path for existing saves. Cache immutable versioned assets separately from the release entry point; do not swap rule bundles in a running case.

Before promotion, the preview build runs the automated regression suite and the appropriate manual device cases. Deployment URL changes require an export/import explanation because saves do not magically follow a different origin. A deploy is not evidence that save migration, responsiveness or offline behaviour has passed.

## 17. Responsive design and accessibility

### 17.1 Layout contract

| Available width | Default layout | Essential behaviour |
|---|---|---|
| 320–767 CSS px | One primary panel and four-destination navigation | Full case completable without horizontal page scrolling or hidden controls |
| 768–1199 CSS px | Context-aware one/two-pane layout | Case File can open without losing selected evidence or query scope |
| 1200 CSS px and above | Two panes; optional third contextual pane | Comfortable comparison without requiring panel management |

Use content-driven collapse when zoom or text scaling reduces usable space. Portrait tablets are not forced into a small desktop interface. Phone landscape must remain functional, including short-height viewports, but cannot be a prerequisite for completion.

### 17.2 Touch and keyboard parity

All critical controls target at least 44×44 CSS pixels as this product's usability rule. This is deliberately stricter than the WCAG 2.2 AA target-size minimum of 24×24 CSS pixels, which has specified exceptions. Do not describe 44×44 as the AA minimum. [R6]

No essential action requires dragging, hovering, right-clicking, long-pressing, pinching or rapid tapping. Evidence linking uses select fact, select relation, select destination and confirm. Drag linking is an optional equivalent.

Keyboard access includes sensible focus order, a visible focus indicator, escape/back behaviour, focus restoration on closing sheets, and text-accessible alternatives for relationships. Mobile screen readers must be able to inspect and attach facts, identify caveats and submit a finding.

### 17.3 Readability and sensory access

Target an applicable WCAG 2.2 AA audit at release without claiming conformance from design alone. Product requirements include readable contrast, non-colour status cues, no information conveyed only by sound, reduced-motion support and scalable text. Every voiced line has matching text and speaker identification; captions default on when voice is enabled. The audio controls and screen-reader-friendly mode in Section 18.8 are gameplay accessibility requirements, not optional polish.

Normal narrative text should start around 16 CSS pixels, with sufficient line spacing and no tiny compulsory raw-data fields. At 200% text size and at a 320 CSS pixel reflow width, users must still inspect evidence and submit a case. A map may pan internally, but the equivalent list must remain available.

### 17.4 Mobile interruption cases

Test browser bars, safe areas, on-screen keyboard, text entry, focus restoration, rotate during a request, home-screen backgrounding, tab switching, browser back/forward and accidentally reopening the same run in another tab. No orientation event may advance the world or duplicate a command.

Show the mission, current step, pending-check count and save status in a compact persistent context bar. Do not cram the entire hypothesis into a narrow status strip. Preserve filter state, current selection and scroll position when returning to a destination.

## 18. Visual, audio and narrative direction

### 18.1 Mandatory experience contract

**The game MUST be visually appealing throughout and include generated or recorded voice for selected narrative and guidance moments.** It must feel like a polished cyber-investigation game, not a plain enterprise dashboard, a static training page or a quiz with decorative artwork. Visual presentation and a minimum voiced experience are required in the completed P0 playable proof and every public release. Temporary placeholders are acceptable during internal development only.

**Required in the product does not mean compulsory for the player.** Voice and other sound must be optional to hear. Muted play must provide the same facts, guidance, actions, progression and assessment. Human voice actors are not required: carefully directed, pre-generated synthetic speech is an acceptable primary production approach.

The mandatory experience has three parts: distinctive home-page theme art, consistently polished in-game screens, and a concise, coherent voice-and-sound layer. A striking landing page cannot compensate for unfinished investigation screens. Conversely, clear controls alone do not satisfy the visual-appeal requirement.

### 18.2 Art direction and visual identity

Adopt a contemporary cyber-investigation thriller style: a believable analyst workspace, layered evidence, a recognisable organisation and quiet uncertainty. Use realistic or semi-realistic key art with a clean, readable interface. Suspense should come from investigating an uncertain situation, not military spectacle or an assumption that every case contains an attacker.

| Element | Required direction | Avoid |
|---|---|---|
| Mood | Intelligent, atmospheric, professional and inviting to a newcomer | Aggressive hacker fantasy, horror or unexplained alarm overload |
| Palette | Deep navy/slate surfaces, cool blue/cyan/teal highlights, warm amber accents and readable neutral text | Excessively black screens, washed-out text or continuous neon glow |
| Status language | Icon, label and colour together; red reserved for a disclosed warning or known disruptive consequence | Red identifying a hidden attacker or every unfamiliar identity |
| Typography | Distinct display treatment for the title; legible sans-serif body text; monospace for optional record fields | Tiny log text, all-uppercase paragraphs or illegible futuristic type |
| Depth | Layered surfaces, restrained shadows, selective lighting and clear foreground/background separation | Transparent text panels over busy artwork or decorative gauges |
| Iconography | A coherent set for identities, sessions, systems, sources, evidence, coverage and requests | Inconsistent stock symbols or symbols that require specialist knowledge |
| Character presentation | A thoughtful investigator and supportive mentor, without implying a real person's identity | Celebrity likenesses, agency branding or a compulsory player avatar |

Create reusable design tokens for colours, spacing, type scale, surface elevation, borders, focus, selected states, warning states and motion. Use the same system across menus, gameplay, settings and debrief. Maintain visible detail at ordinary phone/tablet brightness; “cinematic” must not mean too dark to read.

### 18.2.1 Initial design-token specification

The following palette is an **art-director starting specification**. Adjust values after actual contrast and device reviews; do not assume an attractive swatch passes WCAG requirements. All core colours, states and fonts must be tokenised and reused, not scattered through individual screens.

| Token | Initial value | Intended use |
|---|---|---|
| `--bg-deep` | `#0B1422` | Outer shell and theme background |
| `--surface-1` | `#132338` | Primary game panels |
| `--surface-2` | `#1B3047` | Raised cards and inspector drawers |
| `--text-primary` | `#F2F6FA` | Body text and primary labels |
| `--text-secondary` | `#B7C8D9` | Descriptive text and provenance |
| `--accent-cyan` | `#64D9E7` | Focused relationships and intentional interaction accents |
| `--accent-amber` | `#F0B867` | Disclosed caution and pending decisions |
| `--status-risk` | `#EC847A` | Visible policy/impact warnings, **not** hidden actor status |
| `--focus-ring` | `#C1EFF5` | Visible keyboard focus |
| `--stroke-subtle` | `#34506A` | Panel and card separation |

**Typography:** select a legally licensed readable system or self-hostable sans-serif family for body copy (e.g., Inter if verified) and a restrained condensed or geometric display face for the title (e.g., Space Grotesk if verified). Use a monospace font only for optional event fields. P0 UI sizing guidelines: body 16–18 CSS px, evidence metadata 14–16 px where space permits, section titles 20–28 px; no information-critical microcopy below a readable verified size. Support text reflow to 200% and local font fallbacks.

**Component state language:** every selectable record and action has distinguishable default, hover (where supported), focused, selected, pending, disabled, failed and completed states. Selected and pending must differ by more than colour. Avoid glowing every card. Informational badges state whether a source is available, missing or pending; they do not predict attacker presence.

**Design texture:** atmospheric artwork is reserved for home/briefing and restrained environmental crops. Investigation surfaces prefer opaque panels, consistent radius and spacing, limited shadow depth and minimal grain behind text. Every critical screen has at least one visually distinctive moment without sacrificing legibility.

### 18.3 Home-page theme art and composition

The home page MUST feature original or appropriately cleared theme/hero art that immediately communicates investigation, evidence and the possibility of a silent intrusion. The artwork should feel like game key art, not a generic cybersecurity photograph or a stock corporate banner.

**Existing concept reference:** `silent_intrusion_threat_hunter.png` in the conversation shows the intended atmospheric analyst-workspace direction. It is a visual reference, not production-ready interface artwork. Its baked-in title, illustrative alerts and decorative labels must not become functional menu controls or evidence. This document revision does not create new art assets.

Production requirements:

1. Provide a text-free landscape composition and a separately art-directed portrait composition, or an equivalently reviewed responsive composition. Preserve the investigator/evidence focal point rather than blindly centre-cropping the landscape image on phones. Prefer a 16:9 landscape master and a 9:16 portrait master; test additional viewport shapes rather than assuming those ratios fit every device.
2. Reserve a calm title/menu zone. On wider screens, a useful default is the title and actions to the left with the investigation scene to the right. On phones, place the focal visual above or behind a clearly separated title/action area. Keep essential controls reachable without scrolling through a large decorative image.
3. Render the game title, subtitle, tagline and controls as live accessible interface elements, not flattened text in the background. The title is **Threat Hunter: Silent Intrusion**. The recommended tagline is **Follow the evidence. Make the call.**
4. Show **Continue investigation** when a valid save exists, **New investigation**, **Campaign** and **Settings**. Before P1, Campaign must accurately identify available content rather than present unbuilt missions as playable. Settings must include audio and accessibility controls.
5. Provide a subtle contrast treatment behind live text. Do not darken the entire scene until its subject disappears. No required control may overlap decorative text, faces, bright monitor details or a device safe area.
6. Keep title and actions usable while the image loads or fails. Show the themed shell and a static background fallback; never block entry into a case waiting for cinematic artwork or audio.
7. Keep the hero independent of the selected mission's hidden truth. No branch-specific threat glow, attacker silhouette, music cue or loading variant may reveal whether a case is malicious.
8. Optional parallax or environmental motion must have a static equivalent and respect reduced motion. A video background, 3D scene or animated opening is not required and cannot replace good static artwork.

The art delivery set must include editable/source artwork where available, text-free masters, tested landscape/portrait delivery variants, thumbnail versions and an asset manifest. Store production asset names and attribution information with the project. Do not label an upscaled file as a native-resolution master.

### 18.3.1 Home-screen responsive wireframes

These are layout contracts that designers must translate into **reviewable desktop, iPad and phone mockups** before art sign-off. Real titles and menus remain HTML text and buttons, layered over text-free illustrations.

**Desktop / wide iPad landscape**

```text
+------------------------------------------------------------------+
|  BRAND + SETTINGS                                      SOUND      |
|                                                                  |
|  THREAT HUNTER:          [cinematic evidence / investigator]      |
|  SILENT INTRUSION                                                |
|  Follow the evidence. Make the call.                              |
|                                                                  |
|  [Continue] [New Investigation]                                   |
|  Campaign   Settings                                             |
|                                                                  |
|  Save state / case count / accessibility help                     |
+------------------------------------------------------------------+
```

**iPad portrait / phone portrait**

```text
+----------------------------------+
| BRAND                        MENU|
|     Investigator/theme crop       |
|     with safe focal framing       |
|----------------------------------|
| THREAT HUNTER                    |
| SILENT INTRUSION                 |
| Follow the evidence. Make the call.|
| [Continue Investigation]         |
| [New Investigation]              |
| [Campaign] [Settings]            |
| Save / sound controls visible    |
+----------------------------------+
```

**Required deliverables:** text-free 16:9 and 9:16 compositions or independently approved responsive equivalents; focal-coordinate/crop notes; mobile-safe title area; compressed delivery variants; failure fallback; review screenshots at narrow phone, tablet portrait/landscape and desktop. Show at least one save/no-save variation and audio enabled/muted state. Do not use baked-in HUD facts or hero text as interactive controls.

### 18.3.2 Artwork acceptance and asset register

An art asset is not ready because it looks good at full resolution. For each hero and mission image, record a unique ID, source/usage rights, master dimensions, safe focal rectangle, responsive variants, compression formats, byte budget, alt/decorative status and reviewer. Test the actual delivered crop behind real controls and at standard device brightness. A 4K master may be retained in production but is not automatically a 4K runtime asset or proof of native detail.

A screenshot/composition review uses four questions: **Does it instantly communicate the mystery? Can the user find the first action? Can every label be read? Does this art remain appropriate in a benign-world playthrough?** Failures require an art/layout adjustment, not an extra dark overlay that makes the artwork invisible.

### 18.4 In-game visual requirements by screen

| Screen or surface | Required visual treatment | Functional safeguard |
|---|---|---|
| Briefing | Mission-specific illustration or environmental crop, clear objective, scope and Morgan's introduction | The player can read, skip voice and begin immediately |
| Leads | Well-spaced activity cards, distinct source icons, concise facts and visible selected state | No styling reveals the correct interpretation of an anomaly |
| Explore | Readable asset/identity cards and a polished relationship view with highlighted selected connections | An accessible relationship list supports every graph-based action |
| Acquisition and comparison | Visually aligned baseline/current values, clear differences, provenance and collection cutoff | A highlighted difference means “different,” not “malicious” |
| Case File | Attractive evidence cards, clear supports/weakens/limits relationships and a concise explanation summary | Do not turn the screen into an unreadable web of connecting lines |
| Timeline | Legible player actions, source coverage, pending checks and disclosed response windows | No visible progress bar for the attacker's hidden schedule |
| Request and handoff | Clear target, permitted authority, expected scope and pending/completed/review states | Disruptive recommendations require explicit confirmation |
| Debrief | A satisfying reconstruction with separate investigation-quality and operational-outcome presentation | A justified unresolved case is not styled as a failure |
| Settings and recovery | Matching theme, readable sliders, toggles, warnings and save states | Error recovery and accessibility must not feel like unfinished secondary screens |

P0 requires a polished selected-entity/relationship presentation, not a large animated network. Use readable cards and a small connection view where a graph would add unnecessary complexity. All required screens must share the same quality standard; no blank prototype panels or unrelated visual styles in the completed playable proof.

### 18.4.1 Mandatory visual mockup package and screen grammar

Before coding every gameplay screen, produce at least **six reviewable frames**: (1) Home desktop, (2) Home phone, (3) Leads with a selected event, (4) baseline comparison, (5) Case File with competing interpretations, and (6) debrief with evidence/operational tracks. Include iPad landscape/portrait adaptations of Leads, Case File and debrief. Static mockups are acceptable during design but must show actual-sized UI copy and controls, not generic decorative shapes.

| Screen | Required focal hierarchy | Visual signature | Do not do |
|---|---|---|---|
| Leads | Mission → event → next question | Clean source-linked event cards; one current investigation focal point | Fifty meaningless alert tiles |
| Baseline comparison | Current observation → normal range → relevant difference | Aligned time/device/activity rows with clear scope labels | Red result solely because it is unusual |
| Explore | Selected identity/asset → recorded relationships → available enquiries | Restrained relationship strokes with accessible list | Huge unreadable animated spider-web |
| Case File | Working explanation → supporting/weakening facts → unknowns → action | Compact evidence clusters and clear link semantics | Drag-only puzzle or citation-entry form |
| Timeline | Known time → pending checks → collection cutoff | Three visible classes of timeline event | Exposing the hidden adversary schedule |
| Debrief | Your finding → what was knowable → what occurred → next lesson | Satisfying three-track reveal with calm voice and distinct outcome labels | Celebrating lucky guesses as expert investigation |

**Visual continuity rule:** icons, typography, selection, pending requests, source confidence and action confirmation must retain meaning between screens. Mission art can change but the visual language of evidence may not. Maintain an annotated before/after screenshot record for every P0 visual revision so aesthetic improvements do not silently impair readability.

### 18.5 Motion and feedback

Use motion to communicate an action or a change in knowledge. Selecting a record highlights it; acquiring a snapshot introduces the new material; attaching evidence makes its destination clear; submitting a request shows a receipt; returning to the Case File preserves context.

Initial production targets are approximately 120–220 ms for common control transitions and no more than 350 ms for a nonessential discovery accent. These are design targets, not measured performance. Effects must not block input, conceal text or delay the authoritative command receipt. Prefer restrained emphasis over repetitive flashes or constantly moving background widgets.

A discovery cue means **new information**, not **correct clue**. Equivalent observable records receive equivalent cues across benign and malicious worlds. Any sound, visual emphasis or voice trigger during an investigation must be derived from `PlayerView` and disclosed policy only. Reduce motion without changing the underlying action, evidence, hint availability or timing.

### 18.6 Required voice coverage

Use pre-generated speech from reviewed scripts as the default implementation. No runtime speech-generation service, microphone, account, API key or recurring paid generation call is required to play. A human performance may be used, but synthetic voices are fully acceptable. An installed device's text-to-speech voice must not be the only way the required authored voice pack is delivered.

| Moment | Required P0 coverage | Expansion rule |
|---|---|---|
| Mission opening | One concise voiced briefing covering purpose, uncertainty and the player's authority | Every released mission has its own opening |
| Morgan guidance | At least six short lines covering baseline, competing explanation, evidence attachment, collection limits, scoped handoff and reflection | Additional lines support new mechanics without narrating every click |
| Important status | At least two neutral cues, such as a requested check becoming available and a case report being submitted | Use for meaningful visible changes, not every routine event |
| Debrief | Authored coverage for explained, likely-misuse, visibility-limited and provisional findings, plus an unsupported-finding fallback | Combine approved assessment and outcome segments only after closure |

Each listed content class is mandatory to ship; a player is not required to encounter every line in one run. Debrief content must cover both sparse-world outcomes without changing the identical reasoning assessment. Unsupported findings must receive an accurate neutral explanation rather than a celebratory success clip. Avoid voicing arbitrary free text or combining fragments that imply a conclusion the deterministic debrief does not support.

Target briefings of roughly 15–30 seconds, guidance lines of roughly 4–12 seconds, concise status phrases, and optional debrief narration of roughly 15–35 seconds. These are content limits to review by listening, not waits imposed on the player. Not every record or line of dialogue needs speech.

### 18.7 Voice direction and content safety

**Morgan:** calm, intelligent, mature, supportive and credible. Deliver naturally, without lecturing, exaggerated urgency or a synthetic-announcer cadence. Use clear conversational English that the intended audience can follow. Keep one consistent voice identity across missions; the briefing and mentor may share the same voice. A separate concise system voice is optional, not another mandatory cast member.

Generated clips must be listened to and corrected for pronunciation, pauses, clipped words, digital artefacts, inconsistent pace and distracting changes of tone. Maintain a pronunciation sheet for names and recurring technical terms. Where possible, speak ordinary words such as “the finance session” and show the precise identifier in the associated text, rather than awkwardly reading every technical ID aloud.

Use only approved synthetic voice identities or recorded performances with documented permission for the planned release. Do not imitate a real person without their permission or imply that generated dialogue is a real employee recording. Record the production method, voice identifier, script version and asset attribution in the production manifest; disclose synthetic voices in the credits when used.

Before debrief, voice may explain a delivered fact or suggest an investigation, but must not reveal owner testimony before delivery, announce a hidden attacker stage, supply new evidence, assert an unsupported conclusion or raise urgency from private world state. The exact same visible state must produce the same guidance and status cues in the sparse twins.

### 18.8 Playback, captions and controls

Voice and sound are silent on a fresh session until the player explicitly enables them through a visible control. Offer **Enable voice and sound** and **Play muted** without delaying access to the case. Persist preferences, but handle a playback rejection safely: retain text, show a replay/enable control and do not change game state.

Provide separate **Master**, **Voice**, **Effects** and **Ambience/music** levels, individual channel mute where applicable, and an always-reachable master mute. Caption display defaults on when voice is enabled. Every spoken line must have a matching on-screen text equivalent and an accessible transcript with speaker identity. Even when captions are hidden, the associated briefing, hint, evidence or debrief text remains accessible.

All playback is skippable and replayable where useful. Pausing, skipping, replaying, changing volume, muting, listening longer or losing audio focus must never advance simulation ticks, spend investigation resources, change hint eligibility or affect quality scoring. Do not require finishing a clip before a button becomes available.

Allow only one foreground voice at a time. Player-requested speech replaces stale unsolicited guidance; voice reduces background ambience while playing. Drop obsolete queued lines when the scene changes instead of delivering outdated hints. Stop or pause audio on app backgrounding and do not resume an unexpected backlog on return. Muting stops current speech immediately; unmuting does not replay missed clips automatically.

Avoid competing speech when a screen reader is in use. Provide an explicit **Screen-reader-friendly audio** option that disables unsolicited mentor/system speech while leaving on-demand playback available. Never depend on detecting assistive technology automatically.

### 18.9 Soundscape and performance boundary

Provide a restrained ambience bed and a small set of purposeful interface effects for selection, acquired information, request completion and case submission. Music is optional; voice and the limited core sound layer are not replaced by a large soundtrack. Avoid jump scares, constant alarm tones and repetitive spoken prompts. Sound design must reinforce investigation rather than portray every ambiguity as an attack.

Pre-generate, review and compress delivery clips before deployment. Preserve lossless source audio outside the initial browser bundle. Choose and test delivery formats against the supported browser matrix. Store scene/cue IDs, script IDs, captions/transcripts, language, speaker, duration, asset path, production attribution and permitted trigger conditions in a versioned presentation manifest.

Use responsive art delivery, lazy-load later missions and exclude original high-resolution masters from the initial payload. Keep core readiness and optional audio preparation distinct: **Case ready** means the entire text-complete investigation works offline after load. **Voice pack ready** means all required voice clips for the active mission, including alternative debrief paths, are loaded for the current session. Load the full small mission pack rather than fetching only the active hidden branch. Audio download/decode failure must never block investigation or saving.

If connectivity is lost before voice finishes loading, show an honest audio-unavailable state and continue with text. Once the active mission voice pack is ready, its clips must play without additional network requests for that loaded session. This is not an offline cold-start guarantee. Keep playback/loading state outside the gameplay hash and command scheduler. The initial budgets and test ledger are in Section 19.

### 18.10 Initial script examples

These are approved-direction examples for further content review, not a claim that audio files already exist. The final voiced and displayed script versions must match.

| Cue ID | Trigger | Proposed line |
|---|---|---|
| M01-BRIEF-01 | Player starts or replays the briefing | “A finance session started at an unusual hour. It may be approved work, or it may need investigation. Follow the evidence, test another explanation, and make a supported call.” |
| M01-MORGAN-01 | Player asks for baseline guidance | “Before deciding what is unusual, compare this session with the account's normal pattern.” |
| M01-MORGAN-02 | Player asks how to test an alternative | “Could approved work explain this? Check whether the record matches the person, device and task.” |
| M01-MORGAN-03 | Evidence attachment help | “Attach the observation to your explanation, and state what it supports. A fact is not the same as a conclusion.” |
| M01-MORGAN-04 | A collection gap is already delivered | “This source cannot show the activity you need. Record that limit. Missing records do not establish that nothing happened.” |
| M01-MORGAN-05 | Player opens handoff guidance | “State what you know, what remains uncertain, and the specific session you are handing over.” |
| M01-MORGAN-06 | Reflection after a case is closed | “Review the evidence you had when you made the call. Later information should not rewrite what you knew then.” |
| M01-SYSTEM-01 | A requested check result is delivered | “Your requested check is ready to review.” |
| M01-SYSTEM-02 | Case closure is accepted | “Case report submitted. Review your investigation and the simulated outcome.” |

Write debrief clips from the deterministic report classes, not from a generic “mission success” template. A supported unresolved summary must describe useful work without implying proof that the session was benign or malicious.

### 18.10.1 Synthetic-voice production manifest and branching rules

A voice pack is a versioned **content asset**, not uncontrolled browser speech output. Each production line receives a canonical text script; optional delivery variants for pacing are recorded as separate approved versions. Always have a text equivalent in the interface, and do not prepend new facts through voice.

**Minimal cue manifest example** (shape to be validated in Zod; paths are illustrative only):

```json
{
  "packId": "M01-voice-en-SG-v1",
  "language": "en-SG",
  "speaker": "Morgan",
  "cues": [
    {
      "id": "M01-MORGAN-01",
      "when": "player_requested_baseline_hint",
      "scriptId": "baseline_hint_v1",
      "text": "Before deciding what is unusual, compare this session with the account's normal pattern.",
      "audioPath": "/audio/m01/morgan-baseline-v1.opus",
      "durationMs": 6100,
      "captionSpeaker": "Morgan",
      "priority": "player_requested",
      "requiresVisibleEvidenceIds": []
    }
  ]
}
```

`durationMs` is an **illustrative target**, not a measured file duration. Choose broadly understandable Singapore English delivery, with subtle natural phrasing and no affectation. The exact voice model and provider are left to the art/audio production review; document permitted commercial usage, identity/licence, model or voice ID, output format, recording/generation date and the reviewer who listened to the final clip. No user voice or real employee recording is required.

**Debrief branching:** pre-author separate compatible speech segments for (a) justified explained, (b) supported likely misuse, (c) justified unresolved with benign outcome, (d) justified unresolved with malicious outcome and (e) unsupported finding. Select these only after `CLOSE_CASE` and use the actual deterministic quality report and outcome class. The shared reasoning explanation in matched sparse worlds must be literally or semantically the same; hidden-outcome differences belong in a separately labelled post-close segment. Never generate an unreviewed new claim by concatenating arbitrary clip fragments.

**Audio QA listening checklist:** correct terminology; no clipping; no abrupt volume jumps; natural pauses; no robotically stressed IDs; intelligible at normal phone speaker volume; clear with captions; no stale speech after navigation; no overlap with screen reader; no branch leakage; and complete silence when muted. Review at least one low-volume listening pass and one mobile-speaker pass, not merely waveform metadata.

### 18.11 Visual and audio acceptance gates

Before completed-P0 sign-off and every public release:

- Review home, briefing, Leads, Explore, Case File, Timeline, handoff, debrief and settings on desktop, iPad landscape/portrait and phone portrait. Theme art, type, contrast and touch targets must remain usable, with no image stretching, clipped menus or unreadable evidence overlays.
- Demonstrate that the home has real theme art and every core gameplay screen uses the finished design system. Placeholder art/unstyled investigation screens block sign-off, even if the engine passes its tests.
- Confirm all mandatory voice classes exist and play; review pronunciation and consistency; verify caption/script matching, mute, replay, skip, volume, background interruption and failed playback.
- Complete the same reference action trace with voice on, voice off, reduced motion, delayed assets and failed audio. Gameplay-state hashes and quality reports must match.
- Confirm pre-close visuals, voice, subtitles, music and cue timing do not distinguish the sparse twins. Validate post-close narration against the actual approved debrief facts and keep assessment separate from hidden outcome.
- Ask each target cohort separately about visual appeal and voice clarity. Initial targets are at least 6 of 8 rating the actual gameplay presentation at least 4/5, and at least 6 of 8 who try voice finding it clear and non-distracting. Record the counts, screenshots/build and criticisms. A positive home-screen rating alone does not pass the in-game visual gate.

These gates are proposed requirements, not completed validation. If presentation fails, reduce decorative clutter, improve contrast or replace poor clips. Do not respond by deleting required artwork or all voice from the release.

### 18.12 Production scope

P0 delivers a focused but finished audiovisual experience: landscape/portrait theme art, a shared UI system, polished M01 screens, core generated voice, captions, controls, a restrained ambience layer and essential effects. P1 extends the same standard and required voice coverage to all three released cases. P2 may add richer environmental art, additional speakers and more extensive narration.

Cut opening cinematics, 3D rooms, animated backgrounds, additional voice actors, exhaustive line-by-line narration and large soundtracks before cutting the mandatory baseline. Keep the continuing story light, with a believable team and recurring systems. Atmosphere must support the investigation, not obscure it.

## 19. Performance and compatibility

### 19.1 Measurable product budgets

These are initial gates for profiling, not achieved benchmarks or general web standards. Record the actual device, OS/browser version, production build, connection conditions and measurement method for every result.

| Measure | Initial target | Measurement |
|---|---:|---|
| Visual acknowledgement of a tap/key | P95 ≤100 ms | At least 100 ordinary local interactions after case load |
| Acquired-evidence panel interaction | P95 ≤200 ms, excluding declared simulation/commit work | Open, compare and attach flows on reference mobile hardware |
| Consequential command and durable commit | P95 ≤500 ms | Short-case commands with healthy local storage; errors reported separately |
| Initial critical JavaScript | ≤400 KiB compressed | Production transfer report; exceptions need measured justification |
| First ready case, total critical assets | ≤2 MiB compressed, including selected home-art delivery variant and essential interface assets | Cold-load network trace; voice pack measured separately and does not block core readiness |
| Case ready on profiled mobile connection | Target ≤6 seconds for cold-load core readiness; visible title/menu shell earlier | Declared 4 Mbps / 100 ms RTT lab profile plus physical-device observation; includes art delivery rather than an empty placeholder screen |
| Selected home-art delivery asset | Target ≤450 KiB on phone; ≤800 KiB on larger layouts | Load only the selected responsive variant; review visual quality after compression |
| Active P0 mission voice pack | Target ≤2 MiB compressed, covering all required M01 cue/debrief classes | Separate network ledger; all paths load independent of hidden branch |
| Active ambience/effects pack | Target ≤500 KiB compressed | Separate optional-listening payload; no uncompressed masters in the site bundle |
| Voice availability | Immediate text; no game action blocked by download, decode or playback | Test uncached, cached, muted, rejected playback and interrupted network cases |
| Normal main-thread tasks | No repeated tasks over 50 ms during simple investigation | Browser profiling trace |
| P0 loaded information | Six initial relevant entities, bounded lists and snapshot records | Content and render audit; no fake thousands-of-events requirement |

A reference physical phone and iPad must be named in the test ledger before these gates can be marked passed. Lab throttling results are not physical-device measurements. Use a worker only if profiling shows a meaningful benefit; do not add concurrent simulation ownership prematurely.

### 19.1.1 Stack-specific load and graceful degradation requirements

The stated budgets apply to the **production Vite build**, not the development server. Record React/Tailwind application shell, Zustand and engine code, Dexie/Zod validation, Motion presentation code, Howler audio code and any optional graph chunk separately. Do not ship React Flow in the first-load chunk unless an actual P0 interaction demonstrably requires it; any deviation needs a bundle report and design sign-off.

- Initial UI must appear while optional voice assets are downloading, without showing a false claim that voice is ready.
- Use code splitting and responsive image assets rather than embedding full-resolution theme masters in JavaScript or CSS.
- Prefer independently cached/versioned media files; CSS/animation/audio failure must not prevent the player from submitting a case.
- The same ordered engine commands must produce identical gameplay hashes with Motion enabled/disabled, Howler audio enabled/muted and React Flow present/absent.
- If compressed JS/art/voice budgets conflict, prioritise a complete, readable, accessible game loop. Record the exception and the measured user impact; do not secretly omit mandatory voice or theme art.

### 19.2 Browser matrix

At release, record exact current and previous supported major desktop versions rather than assuming them from this document's date. Target desktop Chrome, Edge, Firefox and Safari; physical iPadOS Safari in both orientations; physical iPhone Safari portrait; and physical Android Chrome portrait. Specify any unsupported older platform plainly.

Playwright can emulate settings such as viewport, user agent and touch. That is useful for automated interaction checks, but emulation is not a physical iPhone/iPad test. [R5] Report browser-engine automation, device-profile emulation and physical-device testing as different evidence types.

### 19.3 Graceful degradation

Use list fallback if a graph is slow or inaccessible. Reduce animation rather than changing event timing. Virtualised lists must preserve keyboard focus and provide accessible reading access. Use a themed static fallback when art fails and matching text when audio fails; persistent missing release assets remain a defect to fix, not grounds to remove the requirements. Never lower evidence quality, omit consequential records or alter score rules to improve frame rate.

## 20. Content production and validation

### 20.1 A mission is a package

Every shipped mission includes its briefing and learning objectives, initial world, actual benign/adversary causal events, source capabilities, collection gaps, acquisition catalogue, authority policy, response delays, observation-based sufficient sets, glossary, hint ladder, debrief facts and test traces.

Its presentation package also includes reviewed artwork or environmental crops, UI-state references, required generated/recorded voice clips, matching script and caption/transcript data, cue triggers, source/voice attribution, pronunciation notes and muted/failed-audio fallbacks. Store the presentation version independently from the M01 ruleset. No clip may be selected from private truth before the relevant debrief phase.

Version these together. A text correction that changes the meaning of evidence requires content/rubric review, not an untracked copy edit. Keep player-facing copy separate from hidden truth and evaluation identifiers.

### 20.2 Authoring review questions

Does the lead make sense without a specialist term? What genuinely competing explanations exist? Which source could test them? What can this source not prove? What is the player authorised to do? Which dependency changes the response? What happens if the player checks the sources in another sensible order? What can a well-investigated unresolved case legitimately conclude?

For each material fact, provide source provenance and a discoverable path. For each material action, state cost, start/completion effects, error states, preconditions, consequences and how it appears in debrief.

### 20.3 Content lints

Reject dangling entity/record IDs, unsupported query sources, invalid time ranges, records available before their origin, mismatched session references, impossible control targets, uncollected historical backfill, conflicting explanation predicates and branches with no defensible disposition.

Flag real credentials, production organisations, personal telemetry, executable attack snippets, inaccessible visual-only instructions and truth-revealing labels. Also flag missing required art/voice files, broken asset references, stale script/caption versions, mismatched transcript text, pre-close truth-dependent cue selection and spoken facts absent from the corresponding permitted text. Use wholly synthetic events and bounded descriptions of attacker objectives.

### 20.4 Required alternate traces

Each observable case family needs a strong route, a materially different strong or proportionate route, a plausible incomplete route, an unsupported guess, and an intentionally visibility-limited route where relevant. Test outcomes and relative scoring, not just completion through the tutorial's preferred click order.

A reviewer must check that a false-positive explanation covers the specific activity, not simply say “it was maintenance.” A malicious explanation must not rely solely on country, working hour, a tool name, employee reputation or system age.

### 20.5 Creative production and traceability package

A P0 content handoff MUST include, alongside the scenario fixture: `design-tokens.json` (or an equivalent documented token source), responsive layout frames, artwork manifest, audio cue manifest, approved scripts/transcripts, audio review log, and screen-by-screen creative acceptance notes. These are not authoritative simulation inputs. The engine ignores all presentation fields except permitted public cue-event identifiers.

| Asset class | Required producer handoff | Basic automated gate | Human gate |
|---|---|---|---|
| Visual tokens | Token source, component states and contrast samples | All referenced tokens resolve; no raw secret branches | Legibility and hierarchy on target screens |
| Hero/mission art | Masters, responsive crops, source/rights, fallback | Paths and dimensions valid, budget checked | Relevant, readable, non-misleading imagery |
| Sound design | Compressed effect set and mixer mapping | Referenced paths exist; mute/replay tests | Effects sound purposeful, not fatiguing |
| Voice pack | Script, transcript, voice identity, asset manifest, clip revisions | Required cue coverage, caption equality, cue gating | Natural delivery and acceptable pronunciation |
| UI storyboard | Six frames plus key tablet adaptations | Navigation/control inventory matches spec | Art director and novice player can locate next step |

Any generated image or speech asset may need manual corrections. Passing a manifest linter does **not** demonstrate artistic quality. No source audio files or fonts are distributed as part of this GDD.

## 21. Testing and release evidence

### 21.1 Separate validation layers

| Layer | What must be checked | What it does not prove |
|---|---|---|
| Document checks | Links, headings, JSON, types, weighted ratings and cross-references | Enjoyment or browser behaviour |
| Finite reference model | M01 snapshots, supported paths, score arithmetic, uncertainty twins and response timing | Production reducer, storage, rendering or performance |
| Production engine unit/property tests | Scheduling, permissions, receipt idempotency, source projection and rule invariants | Device usability |
| Golden replay tests | Stable manifests, commands, state and scores; alternative valid routes | Learning transfer |
| Browser interaction tests | Start, acquire, attach, close, resume and input equivalence | Physical-device characteristics when only emulated |
| Physical-device and accessibility review | Touch, screen readers, orientation, keyboard, layout and interruption | Meaningful learning by itself |
| Visual and voice review | Home and gameplay art, type, responsive crops, clip coverage, pronunciation, caption matching and playback controls | A finished or enjoyable game merely because the home art is attractive |
| Audiovisual invariance tests | Same action trace under mute, replay, skip, slow/failed media and reduced motion; identical sparse-world cues | Natural delivery or visual appeal without human review |
| Blind target-player sessions | Understanding, enjoyment, misconceptions and willingness to continue | Population-wide effectiveness from a small sample |

Appendix B separates the historical v4.0 reference results from the v4.1 audiovisual and v4.2 technology document-update checks. Unexecuted work, including all audiovisual implementation and player/listener testing, remains explicitly pending.

### 21.2 Mandatory automated edge cases

Test repeated command IDs before stale-revision checks; same ID with changed payload; source snapshots excluding events created during acquisition; static cache reopens; dynamic refreshes; pending and timed-out checks; invalid targets; no authority escalation; paired hidden worlds with identical projected observations; controls effective on the objective tick; closing with a pending check; and response continuation unable to mutate the frozen score.

Add production-only cases for persistence commit failure, quota error, corrupt save, unsupported version, double application of commands after snapshot, multi-tab write conflict, import bounds, route refresh and offline navigation after case-ready preload. Tests must assert actual state, not merely the presence of a “Saved” label.

Add presentation cases for blocked playback, missing voice files, captions, mute/unmute mid-line, foreground voice priority, background/resume, orientation with active captions, slow hero-art loading and offline voice playback after pack readiness. Replay the same commands with media enabled and disabled: gameplay hashes and scores must be equal. Compare sparse-twin visual, caption and cue outputs before closure. Test that voice playback duration never advances the world.

### 21.2.1 Technology-integration test matrix

| Integration | Required tests | Failure to avoid |
|---|---|---|
| React + Zustand | Change tab, rotate device, leave/return to Case File, retain permitted projection and focus | UI reinitialisation or duplicate command dispatch |
| Custom engine + Vitest | Match M01 golden traces, ordering, authority and identical sparse twins | UI-dependent rule logic or time progression |
| Zod + content pipeline | Reject malformed case, broken ID, out-of-range tick and invalid media cue | Untrusted JSON reaching engine or revealing author-only truth |
| Dexie + IndexedDB | Transaction rollback, quota failure, reload, migration, multitab lease, corrupted import | UI says Saved when no durable transaction committed |
| Motion for React | Reduced-motion mode, fast navigation during transition, replay hash equality | Animation callback advancing world or blocking actions |
| Howler.js + generated voice | Consent/autoplay failure, mute/skip/replay, priority, captions, missing-file fallback | Hidden-branch audio cue, stale speech or audio-only knowledge |
| Optional React Flow | Keyboard/touch evidence navigation, accessible list equivalence, chunk lazy-load | Required interaction inaccessible on iPad/phone or screen reader |
| GitHub Actions + Vercel | Lockfile install, typecheck/lint, tests, production build, preview routes, direct refresh and assets | Local-only success masking broken deployed build |

Automated tests establish contracts, not a human judgement that the visual design or voice sounds premium. Run the user/device visual and listening assessments separately.

### 21.3 Human test protocol

For formative testing, recruit at least eight first-time newcomers and eight cyber generalists who are not threat-hunting specialists, plus three specialist reviewers for credibility. These are product-research samples, not a basis for statistical generalisation.

Use an uncoached first-run segment. Explain controls only after recording the point of failure. Give later participants a different case variation so observation of earlier sessions does not teach the answer. Separate clarity, enjoyment and technical accuracy questions.

| Candidate gate | Initial target | Evidence to record |
|---|---|---|
| Unassisted completion | At least 7 of 8 in each target cohort finish M01 | Counts, observed blockers and time distribution |
| Concept understanding | At least 6 of 8 in each cohort explain why unusual activity alone is insufficient | Their explanation, not yes/no self-rating |
| Inconclusive outcome | At least 6 of 8 understand why a visibility-limited finding can be good work | Response to a sparse case/debrief |
| Continued interest | At least 6 of 8 voluntarily begin another case when offered without pressure | Actual choice, separate from “would you play?” |
| Device usability | No critical inability to investigate, attach evidence or close on required devices | Device-specific recording and issue IDs |
| Technical credibility | No unresolved critical false lesson in a shipped case | Reviewer findings and resolution |
| In-game visual appeal | At least 6 of 8 in each target cohort rate actual gameplay presentation at least 4/5 | Home and gameplay rated separately; build/screenshots, readability issues and comments |
| Voice clarity and fit | At least 6 of 8 in each cohort who try voice find it clear and non-distracting | Tested clips, pronunciation concerns, mute choices and caption usability |
| Muted equivalence | No missing fact, guidance or required action when audio is off | Equivalent voiced and silent walkthroughs; no completion penalty for silence |

Ask whether it felt like investigating or filling in a form. Record whether players can name the discovery that changed their mind. These observations matter more than a favourable overall rating obtained after coaching.

### 21.3.1 Gameplay and creative validation scorecard

Review **the actual build**, not a slideshow. Record separate scores from novice and cyber-generalist cohorts, with raw counts and observed behaviour. All are candidate release gates until a study is actually run.

| Test dimension | Test question or observation | Proposed P0 success signal |
|---|---|---|
| First-use agency | Can a player select a meaningful investigation step without being told? | At least 7/8 per target cohort act unassisted |
| Discovery payoff | Can the player name evidence that changed or bounded a belief? | At least 6/8 per cohort give a concrete example |
| Perceived gameplay | Does the player describe comparing/testing/deciding, not just opening tabs? | At least 6/8 per cohort report genuine investigative agency |
| Motivation | When offered a second variation, does the player start it freely? | At least 6/8 per cohort opt in |
| In-game visual appeal | Does the gameplay itself look coherent and readable, independent of the hero? | At least 6/8 per cohort score ≥4/5; no critical legibility blocker |
| Voice effectiveness | Does Morgan help rather than distract, and is speech intelligible? | At least 6/8 voice users per cohort find it clear; no mandatory audio knowledge |
| Fairness | Are different valid routes understood after debrief? | Specialist audit approves the multiple-route and sparse-twin explanations |

In observer notes, record the first 'aha' moment and the first frustration moment. Interview players before showing the authored answer. If visual/audio polish increases positive first impressions but does not increase comprehension or willingness to play a second case, revise the core loop rather than claiming the presentation fixed engagement.

### 21.4 What happens when a gate fails

If players cannot start, revise the briefing and first available actions. If they can start but cannot form a claim, simplify the Case File and comparison views. If they always click every source without thought, improve hypothesis relevance and consequential choices before introducing harsher penalties. If benign or unresolved endings feel unrewarding, fix the debrief and narrative resolution rather than forcing every case to contain a visible attacker.

Do not build the remaining campaign merely because the first case is technically functional. P1 expansion requires evidence that the first loop is understandable, worth repeating and presented at the Section 18 visual/audio standard. If artwork obscures facts or voice distracts players, revise the presentation and clips rather than abandoning the required baseline.

## 22. Build sequence and acceptance backlog

### 22.1 Recommended sequence

Build M01's pure reference-aligned TypeScript engine with Vitest and a React/Vite/Tailwind responsive interface together. Use Zustand only for permitted view state, Zod for authoring/runtime boundaries and Dexie for durable saves. Establish the visual tokens, home-art composition and voice script/cue structure early so presentation fits the controls rather than being bolted on afterwards. Complete a start-to-finish case before building an elaborate network map. Add save/resume and the debrief early, because they expose mismatches in state, evidence and scoring.

An internal greybox may use temporary art and silent text for formative mechanics tests, but it must be labelled an internal development build. Before P0 sign-off, replace placeholders with the required home art and polished screens, integrate the generated voice pack with Howler.js, Motion interactions, captions and controls, and pass the Section 18 gates. Run target-player tests on that actual presentation, not only the greybox.

Only after P0 passes should M04 and M07 receive their production fixtures and full implementation with the same visual/audio standard. Introduce React Flow only when an accessible, lazy-loaded relationship graph demonstrably adds gameplay value. The remaining campaign, procedural hunts, elaborate cinematics, larger voice cast and optional runtime language features remain later decisions.

### 22.2 Traceable P0 backlog

| Requirement | Implementation acceptance | Test ID family |
|---|---|---|
| TH-001 Launch | A shareable URL starts a case without account or installation | START |
| TH-002 Question-led acquisition | All four M01 questions expose cost, cutoff, result and limits | QUERY |
| TH-003 Case reasoning | Facts can support/weaken a claim; limits and confidence persist | CASE |
| TH-004 Authoritative time | Only accepted costly actions advance; snapshot and due-time rules hold | TIME |
| TH-005 Authority | No external-device isolation or self-approval; valid scoped handoff | AUTH |
| TH-006 Fair assessment | Sufficient-set routes and sparse twins match reference expectations | SCORE |
| TH-007 Explained outcome | Known/knowable/hidden/after-handoff facts remain distinguishable | DEBRIEF |
| TH-008 Local recovery | Committed actions resume once; storage errors are honestly reported | SAVE |
| TH-009 Input parity | All essential flows work by keyboard and touch selection | INPUT |
| TH-010 Narrow screens | Complete a case at 320 px and required physical phone widths | LAYOUT |
| TH-011 Reproduction | Same manifest and ordered commands give the same gameplay result | REPLAY |
| TH-012 Offline continuation | Once case-ready, every text-complete active-case screen and save works offline; ready voice pack works offline for the loaded session | NETWORK |
| TH-013 Home theme art | Reviewed landscape/portrait composition, live accessible title/actions and nonblocking fallback | ART-HOME |
| TH-014 In-game visual quality | All required screens use the finished design system and pass separate gameplay-appeal review | ART-PLAY |
| TH-015 Required voice | Opening, six Morgan guidance lines, selected status and all required debrief classes have reviewed generated/recorded assets | VOICE |
| TH-016 Audio accessibility | Matching text/captions, speaker identity, independent levels, mute, skip, replay and screen-reader-friendly mode | AUDIO-A11Y |
| TH-017 Presentation invariance | Voice, audio loading and motion never change facts, actions, clock or score; sparse cues are equivalent | MEDIA-FAIR |
| TH-018 Media resilience | Correct responsive crops, failed-media fallbacks, preload statuses and measured art/audio budgets | MEDIA-LOAD |
| TH-019 Stack baseline | React/TypeScript/Vite/Tailwind/Zustand application wired to pure engine, Dexie and Zod; dependency manifest locked | STACK |
| TH-020 Presentation packages | Motion transitions and Howler sound/voice control are decoupled from time/scoring | PRESENTATION-API |
| TH-021 Validation contracts | Content, import and media-manifest schemas reject invalid references and private-truth leaks | SCHEMA |
| TH-022 CI and previews | GitHub Actions typecheck, lint, unit, build and Playwright smoke pass; Vercel preview and direct-route tests pass | CI-DEPLOY |
| TH-023 Bundle discipline | Initial load meets measured budgets, optional graph assets lazy-load and required voice remains a separate ready state | BUNDLE |
| TH-024 Discovery rhythm | P0 storyboard beats are supported without locking a single source order; at least one meaningful insight | GAME-FEEL |
| TH-025 Visual design bible | Tokens, six mockup frames, states, hero responsive compositions and production art manifest | DESIGN-SYS |
| TH-026 Synthetic voice production | Reviewed clips, manifest/rights record, branch-safe debrief and phone-speaker listening checks | VOICE-PROD |
| TH-027 P1 mission readiness | M04/M07 complete authored evidence packages, two fair routes and candidate fixture traces before P1 implementation | P1-CONTENT |
| TH-028 Creative playtest gate | Novice/generalist cohorts evaluated for discovery, clarity, voice and in-game visual quality separately | HUMAN-GAME |

### 22.3 Non-negotiable release blockers

A hidden fact changes a score for identical observations. A rejected command advances time. A duplicate command executes twice. A query receives future evidence from after its snapshot cutoff. A control acts without authority. A case requires hover/drag to complete. A pending check silently charges time twice. A storage failure is labelled saved. A debrief rewrites what the player knew. A branch has no supported conclusion. A player is punished for hidden intent rather than a knowable decision mistake.

Presentation also blocks completed-P0/public-release sign-off if the home has no theme art; investigation screens remain unstyled placeholders; required voice coverage is absent; essential facts are audio-only; speech cannot be muted/skipped; captions disagree with narration; media reveals hidden truth; image/audio loading blocks the game; or a required device cannot read or operate the finished presentation.

### 22.4 Features to remove first

Remove elaborate animated topology, resizable three-pane layouts, additional voiced characters, cinematic openings, exhaustive narration, advanced filter builders, achievements, accounts, cloud sync, global ranking, PWA installation and runtime AI dialogue first. Never cut the baseline home theme art, polished in-game screens, core generated voice, captions/audio controls, evidence clarity, fair assessment, touch parity, source capabilities or save integrity. A small cast and short clips meet the voice requirement without a large cinematic production.

P0 is a complete small game loop, not a technology demonstration containing all planned systems.

## 23. Risks, privacy and deferred decisions

### 23.1 Main residual risks

| Risk | Leading signal | Mitigation |
|---|---|---|
| Investigating still feels like clerical work | Players cannot identify a meaningful discovery | Reduce copying and navigation; improve comparison and hypothesis relevance |
| Rubric feels like another hidden-answer puzzle | Players cannot understand lost points from the debrief | Expose the evidence questions and policy; test alternative valid paths |
| Sparse cases feel unsatisfying | Players believe uncertainty means automatic failure | Reward the useful coverage finding and complete follow-up story |
| Provisional handoff becomes the only strategy | Players ignore all optional investigation even when it is safe and useful | Review case variety and reporting quality; do not penalise prudent escalation itself |
| Client code exposes authored truth | A user inspects bundled data | Accept for non-competitive play; avoid false anti-cheat claims |
| More features obscure the first case | Increased onboarding time without better understanding | Enforce P0 scope and remove duplicate workspaces |
| Scoring becomes falsely authoritative | Players interpret quality as a professional assessment | Label it as in-game, scenario-specific feedback |
| Home art is impressive but gameplay feels unfinished | Players rate the menu highly and the Case File poorly | Review every core screen and gameplay appeal separately |
| Synthetic voice sounds unnatural or becomes repetitive | Players immediately mute it because of delivery or interruption | Review clips by listening, shorten lines and enforce playback priority; preserve silent parity |
| Presentation reveals the scenario answer | Cue, glow or narration differs with hidden truth | Select pre-close presentation only from permitted observations; test sparse twins |
| Media slows or breaks mobile play | Delayed controls, failed narration or excessive transfer | Responsive assets, separate voice readiness, explicit budgets and text/static fallbacks |

### 23.2 Privacy and content security

No real logs, credentials, private organisational information or network access are required. No analytics or cloud sync is enabled in P0. A future opt-in analytics design must minimise collected events and exclude optional case notes by default. User text is rendered as text, never evaluated code or unsanitised HTML.

Keep secrets out of browser bundles. Validate imported saves and authored content. Maintain an asset/dependency attribution inventory and obtain any needed permissions before publishing third-party art, sound or marks. The game should use its own branding rather than imply endorsement by a cybersecurity framework owner or agency.

### 23.3 AI policy

No runtime LLM controls facts, observations, source capability, authority, simulation timing, hints or score. Build-time generation of voice from reviewed scripts is explicitly permitted and is the default voice-production approach. Approved generated artwork may also be used subject to the same asset review. Generated media does not create new investigation facts. A later optional language layer may rephrase approved facts, but must be unable to invent evidence or access hidden truth before debrief. It must fail safely to authored text. Optional AI is not a solution to an unclear deterministic game loop.

### 23.4 Settled presentation scope and remaining decisions

Home theme art, polished in-game visual presentation and core generated/recorded voice are settled requirements, not deferred decisions. Section 15's React/Vite/TypeScript stack and its library ownership boundaries are the baseline for P0; React Flow remains an explicit optional P1 presentation enhancement. Before completed-P0 sign-off, select and review the final art variants, the voice identity, the approved scripts and tested delivery formats. Human voice actors are not required. The existing concept image is an art-direction reference rather than a final accessible UI asset.

Additional cast members, cinematic sequences, extensive narration, monetisation, accounts, cloud saves, competitive sharing, full OT scenarios and integrations with Breach Command remain deferred. Defaults are generated voice with optional listening, captions/text equivalents, no account, no monetisation, no cross-game dependency and no runtime generation service.

The initial engine contract, command costs, first-case evidence, response authority, score formula and release boundaries are settled for the P0 build in this revision. Changes require a recorded decision and updated tests rather than quiet developer interpretation.

## 24. Quality assessment and remaining uncertainty

### 24.1 Consistent grading standard

A score of 9 means a strong, coherent design specification with a credible implementation path and limited material ambiguity in its declared scope. It does not mean the browser game exists, players find it fun, performance meets targets or all twelve missions are complete.

The table below preserves the historical assessment of the original v3.0 and revised v4.0 documents, using the same weights. It is an editorial desk assessment, not an independent professional audit. v4.1 added mandatory audiovisual design; v4.2 added the technology and integration contracts. v4.3 adds design tokens, screen/storyboard requirements, synthetic-voice production semantics and deeper P1 authoring blueprints. Its updated 9.3/10 desk score is an editorial specification judgement, not demonstrated game quality. Differences of a tenth should not be treated as measurement precision.

| Dimension | Weight | Fresh v3.0 | Revised v4.0 | Why |
|---|---:|---:|---:|---|
| Core gameplay and appeal | 20% | 8.0 | 8.8 | Clearer verbs, discovery patterns and less clerical UI; enjoyment still untested |
| Beginner/generalist accessibility | 15% | 8.8 | 9.3 | Guided default, plain-language questions, one Case File and optional technical depth |
| Internal consistency and fairness | 20% | 7.4 | 9.2 | One ruleset, outcome-independent grading, fixed evidence questions and uncertainty twins |
| Scenario depth and replay design | 15% | 7.5 | 9.0 | Concrete M01 sources, paths and reference fixtures; P1/P2 authoring honestly bounded |
| Engineering and state semantics | 15% | 8.0 | 9.2 | Snapshot queries, request timing, receipt idempotency and explicit handoff continuation |
| Browser UX and resilience | 10% | 8.6 | 9.3 | Input parity, origin-aware saves, preload contract, commit/recovery and measurable tests |
| Scope discipline and validation | 5% | 8.0 | 9.2 | One-case proof before three-case release; separate document, reference, browser and human evidence |
| **Weighted assessment** | **100%** | **8.0/10** | **9.1/10** | **Documented design only** |

### 24.1.1 Provisional v4.3 desk review

| Dimension | v4.2 review | v4.3 provisional | What improved; what remains unproven |
|---|---:|---:|---|
| Gameplay clarity and engagement design | 8.6 | 9.0 | Discovery beats and source-choice rationale; player fun still untested |
| Audience onboarding/accessibility | 9.4 | 9.5 | Player-facing storyboard and mobile hierarchy; no physical-device test |
| Evidence/simulation consistency | 9.4 | 9.4 | Canonical M01 rules and fixtures preserved; production engine unbuilt |
| Visual production readiness | 9.0 | 9.4 | Palette, typography, mockups and responsive hero specs; artwork not delivered |
| Voice/audio production readiness | 9.2 | 9.5 | Cue schema, debrief segmentation, listening gate; audio not generated |
| P1 campaign content maturity | 8.4 | 8.9 | M04/M07 branch blueprints; full tested fixtures still missing |
| Engineering feasibility | 9.2 | 9.3 | Creative handoff and new acceptance traceability; no deployed build |
| **Overall document judgement** | **9.1** | **9.3** | **Provisional desk review only** |

This overall number is a holistic editorial rating, not an arithmetic claim about population satisfaction or a certification of release readiness. Improvements are real specification detail, but the strongest remaining evidence must come from a runnable M01 and actual visual/voice assets.

### 24.2 What was improved, not merely expanded

The duplicated rulebooks were removed. The first release was narrowed. Actual outcome was removed from the quality formula. Verification became non-blocking. Escalation became a single defined terminal action with a separate continuation. The unmanaged-client response error was removed. Uncertainty now has matched hidden worlds. Evidence predicates and alternate traces are concrete enough to check. Hypothesis-led cases now carry the hunting identity beyond the alert tutorial.

### 24.3 What remains unproven

There has been no browser implementation or physical-device playtest in this document update. The final theme-art variants, complete screen mockups and generated voice assets have not been produced or evaluated here. The reference model is deliberately finite and does not validate the production scheduler, persistence implementation, user interface, audiovisual delivery or listener experience. Human calibration of the score and the enjoyment of investigating remain the most important uncertainties. M04 and M07 require full production content packages before P1; the later nine campaign missions require additional design and authoring.

**Build decision:** v4.3 is ready to guide a tightly scoped, art-directed M01 prototype. It is not evidence for marketing the finished game as 9.1/10, nor authority to skip the playtest and device gates.

## 25. References and interpretation boundaries

Source references and their stated 19 October 2026 review date are retained from v4.0; no additional source verification is claimed for the v4.1 editorial update. They support the limited technical/contextual points cited in the document. The game's exact tick costs, evidence sets, scores, response policies and launch targets are original design choices, not requirements taken from these references.

- **[R1] MITRE ATT&CK.** Behaviour vocabulary and framework context, not a linear attack script. <https://attack.mitre.org/>
- **[R2] NIST SP 800-61 Rev. 3, final publication page.** Incident-response integration with cybersecurity risk management; final published April 2025. <https://csrc.nist.gov/pubs/sp/800/61/r3/final>
- **[R3] CrowdStrike, What Is Cyber Threat Hunting?** Provider's explanation of proactive/hypothesis-led investigation and communication of findings. <https://www.crowdstrike.com/en-us/cybersecurity-101/threat-intelligence/threat-hunting/>
- **[R4] MDN, Storage quotas and eviction criteria.** Origin separation, browser storage and persistence limitations. <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>
- **[R5] Playwright, Emulation.** Scope of device-parameter emulation. <https://playwright.dev/docs/emulation>
- **[R6] W3C, Understanding SC 2.5.8: Target Size (Minimum).** AA target-size requirement and exceptions; informs the distinction from the game's 44×44 product target. <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>

No framework compliance, vendor endorsement, complete accessibility conformance or professional-training accreditation is claimed.


## Appendix A: M01 reference fixture

This JSON is the canonical **finite M01 reference input** used by the companion checker. Its internal world IDs and semantic fact tokens are authoring/evaluation data, not player-visible labels. Production code must project the text and immutable acquisition references into `PlayerView`; do not dump this JSON into the game UI.

The fixture describes world/visibility combinations, source questions, observation templates, sufficient sets, permitted confidence, follow-up packages and event gates. A production mission still needs the actual reducer, source projection, runtime validators, acquisition references, persistence and interface. The reference checker is a small executable specification of the selected behaviours, not the finished game engine.

```json
{
  "schemaVersion": 1,
  "id": "M01",
  "ruleset": "4.0.0",
  "title": "The Midnight Login",
  "initialTick": 0,
  "responseDelay": 2,
  "objectiveTick": 8,
  "responseWindow": 2,
  "scope": {
    "identity": "U-01",
    "session": "S-01",
    "service": "FIN-01"
  },
  "queryRules": {
    "cost": 1,
    "capture": "request_start",
    "delivery": "completion",
    "staticCacheCost": 0
  },
  "verification": {
    "cost": 1,
    "dueOffset": 3,
    "duplicatePendingCost": 0,
    "channel": "directory_callback"
  },
  "queries": {
    "Q-H": {
      "label": "Compare sign-in history",
      "source": "identity",
      "static": true
    },
    "Q-D": {
      "label": "Check device registration",
      "source": "registry",
      "static": true
    },
    "Q-C": {
      "label": "Check approved work",
      "source": "change_record",
      "static": true
    },
    "Q-F": {
      "label": "Follow session activity",
      "source": "application_audit",
      "static": false
    }
  },
  "initialFacts": [
    "anomalous_session"
  ],
  "commonFacts": {
    "Q-H": "daytime_baseline"
  },
  "recordByFact": {
    "anomalous_session": {
      "id": "EV-01",
      "source": "identity",
      "text": "A successful finance session began at 02:13 from an unfamiliar client.",
      "lineageGroup": "identity_session_opening"
    },
    "daytime_baseline": {
      "id": "EV-02",
      "source": "identity",
      "text": "Collected sign-ins over the previous 14 days normally used daytime hours and a registered client.",
      "lineageGroup": "identity_history_baseline"
    },
    "device_match": {
      "id": "EV-03",
      "source": "registry",
      "text": "The observed client maps to a newly enrolled organisation device assigned to the account holder.",
      "lineageGroup": "registry_session_mapping"
    },
    "device_no_match": {
      "id": "EV-03",
      "source": "registry",
      "text": "The registry has no organisation-managed device matching this session client; this does not establish who used it.",
      "lineageGroup": "registry_session_mapping"
    },
    "device_gap": {
      "id": "EV-03",
      "source": "registry",
      "text": "The device-registration mapping is unavailable for the session identifier.",
      "lineageGroup": "registry_session_mapping"
    },
    "approval_match": {
      "id": "EV-04",
      "source": "change_record",
      "text": "A verified work record matches this person, client, time window and finance task.",
      "lineageGroup": "work_authorisation_record"
    },
    "approval_absent": {
      "id": "EV-04",
      "source": "change_record",
      "text": "The complete applicable work register contains no approval for this session and task.",
      "lineageGroup": "work_authorisation_record"
    },
    "approval_gap": {
      "id": "EV-04",
      "source": "change_record",
      "text": "The relevant approval archive is unavailable; authorisation cannot be checked from this source.",
      "lineageGroup": "work_authorisation_record"
    },
    "scope_expected": {
      "id": "EV-05",
      "source": "application_audit",
      "text": "Recorded activity stays within the finance task and access scope described in the work record.",
      "lineageGroup": "application_scope_observation"
    },
    "scope_unexpected": {
      "id": "EV-05",
      "source": "application_audit",
      "text": "The session attempted to access sensitive reports outside this user role and its ordinary workflow.",
      "lineageGroup": "application_scope_observation"
    },
    "scope_gap": {
      "id": "EV-05",
      "source": "collection_status",
      "text": "Application-audit collection is missing for this session interval; access scope is not observable.",
      "lineageGroup": "application_collection_health"
    },
    "scope_empty": {
      "id": "EV-05",
      "source": "application_audit",
      "text": "No matching follow-on activity is recorded through this query cutoff; later activity is not covered.",
      "lineageGroup": "application_query_coverage"
    },
    "owner_confirms": {
      "id": "EV-06",
      "source": "directory_callback",
      "text": "The account holder, reached through the verified directory contact, confirms the session and task details.",
      "lineageGroup": "verified_owner_check"
    },
    "owner_denies": {
      "id": "EV-06",
      "source": "directory_callback",
      "text": "The account holder, reached through the verified directory contact, denies using this session.",
      "lineageGroup": "verified_owner_check"
    },
    "owner_timeout": {
      "id": "EV-06",
      "source": "directory_callback",
      "text": "The account holder did not respond within this check window; no explanation was verified.",
      "lineageGroup": "verified_owner_check"
    }
  },
  "worlds": {
    "B": {
      "worldClass": "benign",
      "visibility": "complete",
      "facts": {
        "Q-D": "device_match",
        "Q-C": "approval_match",
        "Q-F": "scope_expected",
        "VERIFY": "owner_confirms"
      }
    },
    "M": {
      "worldClass": "misuse",
      "visibility": "complete",
      "facts": {
        "Q-D": "device_no_match",
        "Q-C": "approval_absent",
        "Q-F": "scope_unexpected",
        "VERIFY": "owner_denies"
      }
    },
    "U-B": {
      "worldClass": "benign",
      "visibility": "sparse",
      "facts": {
        "Q-D": "device_gap",
        "Q-C": "approval_gap",
        "Q-F": "scope_gap",
        "VERIFY": "owner_timeout"
      }
    },
    "U-M": {
      "worldClass": "misuse",
      "visibility": "sparse",
      "facts": {
        "Q-D": "device_gap",
        "Q-C": "approval_gap",
        "Q-F": "scope_gap",
        "VERIFY": "owner_timeout"
      }
    }
  },
  "adversaryEvents": [
    {
      "tick": 2,
      "kind": "session_scope_attempt"
    },
    {
      "tick": 5,
      "kind": "prepare_reports"
    },
    {
      "tick": 8,
      "kind": "objective_transfer"
    }
  ],
  "sufficientSets": {
    "explained": [
      [
        "device_match",
        "approval_match"
      ],
      [
        "owner_confirms",
        "approval_match"
      ]
    ],
    "likely_misuse": [
      [
        "owner_denies",
        "scope_unexpected"
      ],
      [
        "device_no_match",
        "approval_absent",
        "scope_unexpected"
      ]
    ],
    "unresolved": [
      [
        "scope_gap",
        "owner_timeout",
        "approval_gap"
      ],
      [
        "anomalous_session",
        "scope_unexpected"
      ]
    ]
  },
  "expectedNext": {
    "explained": "close_explained",
    "likely_misuse": "handoff_revoke_session",
    "unresolved": "handoff_review_monitor"
  },
  "confidenceAllowed": {
    "explained": [
      "medium",
      "high"
    ],
    "likely_misuse": [
      "medium"
    ],
    "unresolved": [
      "low"
    ]
  },
  "alternativeEvidence": {
    "misuse_weakened": [
      "device_match",
      "approval_match",
      "owner_confirms"
    ],
    "approved_work_weakened": [
      "approval_absent",
      "owner_denies"
    ],
    "approved_work_unresolved": [
      "approval_gap",
      "owner_timeout"
    ]
  },
  "caveatEvidence": {
    "anomaly_not_proof": [
      "anomalous_session"
    ],
    "registration_not_authorship": [
      "device_match",
      "device_no_match",
      "device_gap"
    ],
    "approval_not_authorship": [
      "approval_match",
      "approval_absent",
      "approval_gap"
    ],
    "collection_gap": [
      "scope_gap"
    ],
    "owner_unavailable": [
      "owner_timeout"
    ],
    "needs_identity_verification": [
      "scope_unexpected"
    ]
  },
  "qualityWeights": {
    "evidence": 0.3,
    "reasoning": 0.25,
    "decision": 0.3,
    "report": 0.15
  },
  "publicTruthFieldsForbidden": [
    "worldClass",
    "worldKey",
    "sufficientSets",
    "adversaryEvents"
  ],
  "businessEvents": [
    {
      "tick": 2,
      "kind": "approved_finance_activity"
    },
    {
      "tick": 5,
      "kind": "validate_finance_task"
    },
    {
      "tick": 8,
      "kind": "complete_finance_task"
    }
  ],
  "nextStepPackages": {
    "close_explained": {
      "nextOwnerRole": "none",
      "reviewWithinTicks": null,
      "followupTrigger": "routine_monitoring"
    },
    "handoff_revoke_session": {
      "nextOwnerRole": "response_team",
      "reviewWithinTicks": 2,
      "followupTrigger": "confirm_revocation_and_assess_scope"
    },
    "handoff_review_monitor": {
      "nextOwnerRole": "response_team",
      "reviewWithinTicks": 4,
      "followupTrigger": "new_suspicious_activity_or_verification_result"
    }
  },
  "truthNarrative": {
    "B": "The real account holder performs approved finance work using the matching enrolled device.",
    "M": "An unauthorised actor uses session S-01. No other foothold exists in this authored case.",
    "U-B": "The real account holder performs approved finance work, but source outages hide the mapping, authorisation and application activity from this hunt.",
    "U-M": "An unauthorised actor uses session S-01. The same source outages and owner timeout as U-B hide distinguishing observations."
  }
}
```

## Appendix B: Validation record

### B.1 Historical v4.0 reference checks

The v4.0 validation record reports that the M01 finite-reference checker completed **33 checks**, with all passing, and that the standalone TypeScript boundary contract passed `tsc --noEmit --strict --skipLibCheck`. Its Markdown structural and JSON checks were also recorded. These historical results concern document/reference behaviour only; they do not validate the v4.1 audiovisual requirements.

The optional companion bundle contains `m01_fixture.json`, `check_reference.py`, `reference_validation.json`, `boundary_contract.ts` and a README. The Python checker uses the standard library and reads the sibling JSON fixture; it does not require a browser, a security tool or a server.

### B.2 Exact reference traces

| Reference trace | Close tick | Quality | Simulated objective achieved | Session revoked |
|---|---:|---:|---|---|
| Explained, registry-first | 3 | 100 | No | No |
| Explained, work-record-first | 3 | 100 | No | No |
| Likely misuse, technical route | 4 | 100 | No | Yes |
| Likely misuse, verification route | 3 | 100 | No | Yes |
| Sparse visibility, benign truth | 5 | 100 | No | No |
| Sparse visibility, misuse truth | 5 | 100 | Yes | No |
| Late supported handoff | 7 | 91 | Yes | Yes |
| Unsupported likely-misuse guess | 0 | 14 | Yes | No |
| Unsupported unresolved closure | 0 | 14 | Yes | No |
| Provisional risk handoff | 3 | 85 | Yes | No |

The strong traces deliberately exercise maximum-credit examples. They are not a prediction of typical player scores. The sparse twins both receive 100 even though only the malicious world achieves a data objective. The quality difference for the late handoff is exactly the disclosed timing component. A provisional handoff remains viable without waiting to establish a stronger attribution claim.

### B.3 Executed check inventory

| # | Reference assertion | Result |
|---|---|---|
| 1 | Two benign orders receive equal quality | Pass |
| 2 | Two materially different malicious routes receive equal quality | Pass |
| 3 | Sparse observational twins receive identical assessment | Pass |
| 4 | Sparse worlds have different actual outcomes | Pass |
| 5 | Timely supported response stops scheduled objective | Pass |
| 6 | Late handoff reflects visible timing breach | Pass |
| 7 | Guessing does not receive a high quality score | Pass |
| 8 | Unsupported uncertainty is not a high-score shortcut | Pass |
| 9 | Provisional evidence-backed handoff is viable | Pass |
| 10 | Snapshot cutoff excludes events created during query | Pass |
| 11 | Later refresh can reveal newly available evidence | Pass |
| 12 | Owner check arrives at start plus three without double waiting | Pass |
| 13 | Repeated pending verification has no extra cost | Pass |
| 14 | Static source reopen is free | Pass |
| 15 | Duplicate ID returns original receipt without effects | Pass |
| 16 | Conflicting duplicate payload is rejected | Pass |
| 17 | Unauthorised endpoint control has no effect | Pass |
| 18 | Invalid advance 0 does not move clock | Pass |
| 19 | Invalid advance 5 does not move clock | Pass |
| 20 | Invalid advance -1 does not move clock | Pass |
| 21 | Invalid advance True does not move clock | Pass |
| 22 | Invalid query does not move clock | Pass |
| 23 | Same fixture and actions reproduce assessment and outcome | Pass |
| 24 | Reference state copy resumes equivalent simulation | Pass |
| 25 | Same-tick response takes precedence over objective | Pass |
| 26 | Sparse twins visible after REQUEST_CHECK:None | Pass |
| 27 | Sparse twins visible after ACQUIRE:Q-H | Pass |
| 28 | Sparse twins visible after ACQUIRE:Q-D | Pass |
| 29 | Sparse twins visible after ACQUIRE:Q-C | Pass |
| 30 | Sparse twins visible after ACQUIRE:Q-F | Pass |
| 31 | Quality component weights total one | Pass |
| 32 | All sufficient-set facts exist | Pass |
| 33 | All query names used by worlds are defined | Pass |

### B.4 Limits of those results

Not executed in this review: production browser engine tests, IndexedDB transactions, stale-revision and multi-tab enforcement, immutable acquisition rendering, save import/migration, device emulation, physical iPhone/iPad/Android checks, accessibility testing, network/offline deployment checks, performance profiling or human playtests. The reference state-copy test is **not** a browser persistence test. The fixture validator does **not** establish the completeness of all later mission packages.

The reference uses a finite authored schedule. It tests the listed M01 behaviours, including control priority at the objective tick, but is not a full implementation of every scheduler phase in Section 9. Production tests must re-establish these assertions against the actual reducer rather than simply reusing the reference report as proof.

### B.5 Historical v4.0 revision outcome

**v4.0 replaces v3.0.** The strongest improvement is not the page count: it is a single coherent ruleset, a smaller first build, explicit uncertainty and handoff behaviour, and a first-case reference that can expose implementation disagreements before they reach players.

**Recommended next production action:** implement and playtest M01 against this specification. Expand only after its investigation loop proves understandable, credible and enjoyable for newcomers and cybersecurity generalists.


### B.6 v4.1 document-update validation

This revision integrates mandatory visual and voice requirements into the existing document rather than leaving contradictory future-phase defaults. The update checks verify a single v4.1 document header, unique section headings, working internal contents links, balanced code fences, valid embedded JSON, removal of the superseded no-voice/cut-voice defaults, and unchanged Appendix A gameplay JSON and TypeScript boundary block.

The existing M01 ruleset stays `4.0.0`; presentation assets receive their own version when produced. The original reference-check bundle remains a historical gameplay reference and is not an audiovisual implementation package. No game deployment, new artwork, generated audio, caption playback, performance measurement, device test, accessibility conformance test or listener/playtest result is claimed by this Markdown update.

### B.7 v4.2 technology decision validation

This v4.2 change consolidates the agreed frontend, engine, persistence, artwork, voice, test and hosting choices in Section 15 and integrates them into Sections 19, 21, 22 and 23. The existing authored M01 scenario (`ruleset: 4.0.0`) and the original gameplay boundary contract are retained without logic changes. Version 4.2 is a **specification change**, not a production repository or a deployed game. No package installation, live TTS generation, browser performance result, Playwright run, Vercel deployment or player test is claimed.

The required follow-up during implementation is to choose compatible package versions and licences, lock dependencies, implement the pure engine and data boundaries, prove media independence, run the full automated and physical-device matrix, and then measure whether the finished game's visuals and voice meet the player-facing acceptance criteria.


### B.8 v4.3 design-document revision validation

This revision adds gameplay discovery/choice specifications, a visual design-token and screen-mockup contract, a synthetic-voice content/QA manifest example, and fuller M04/M07 authoring blueprints. M01's authoritative scoring/timing rules and Appendix A finite scenario JSON are intentionally unchanged from v4.2. This version is a **documentation deliverable**; it does not claim to have generated assets, deployed a web game, executed a new human study or validated mobile audio output. Any structural/parser checks performed when creating this Markdown are document checks only.
