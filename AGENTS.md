# Threat Hunter repository instructions

Read `docs/THREAT_HUNTER_GAME_DESIGN_DOCUMENT_v4.3.md` before changing gameplay. It is the authoritative product and implementation baseline. In particular, preserve Sections 8 (commands), 9 (scheduler), 13 (scoring) and Appendix A (M01 ruleset 4.0.0).

- Keep hidden truth inside engine state; React and presentation consume permitted player projections. Never leak world identifiers through labels, loading states, sounds or defaults.
- Only accepted commands advance ticks. Reading and media callbacks never advance time. Validate before mutation and preserve idempotency and immutable acquisitions.
- Grade from cited, delivered evidence. Operational outcomes and hidden truth must not change quality for identical observations.
- Keep the chosen React/TypeScript/Vite/Tailwind/Zustand/Zod/Dexie/Motion/Howler stack unless a documented architecture decision establishes an equivalent alternative.
- Do not describe this internal build as P0-complete until all GDD release gates pass, including required generated voice, art review, accessibility and physical-device/player tests.
- Run lint, typecheck, unit tests and build for relevant changes; run browser checks for interaction/storage/layout changes. Do not edit historical validation claims to imply they tested this implementation.
- Record production status and intentional limitations in `docs/IMPLEMENTATION_STATUS.md`. Preserve the original GDD verbatim; propose a revision explicitly when rules conflict.
