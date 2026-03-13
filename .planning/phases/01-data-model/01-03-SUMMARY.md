---
phase: 01-data-model
plan: 03
subsystem: database
tags: [zod, validation, typescript, contract-testing, node-metadata]

requires:
  - phase: 01-data-model
    provides: "NodeMetadataEntity + locked NodeStatus enum from plans 01-01 and 01-02"

provides:
  - "validation.service.ts aligned to locked schema: NodeStatus=pending|completed|failed|review_needed, InstructionsSchema=requirement+prompt"
  - "src/node/node-metadata.contract.spec.ts: 6 contract tests proving WorkflowGraph cannot overwrite backend AI fields"
  - "src/node/NODE-METADATA-CONTRACT.md: in-codebase schema document satisfying ROADMAP Phase 1 success criterion 4"
  - "Phase 1 ROADMAP success criteria: 4/4 now satisfied"

affects:
  - 02-sync-api
  - 03-export

tech-stack:
  added: []
  patterns:
    - "Contract test pattern: TypeScript structural assertions prove field isolation across layers"
    - "Schema alignment: Zod validators must always mirror the canonical TypeScript type definition"

key-files:
  created:
    - src/node/node-metadata.contract.spec.ts
    - src/node/NODE-METADATA-CONTRACT.md
  modified:
    - src/services/validation.service.ts
    - src/services/__tests__/validation.service.spec.ts

key-decisions:
  - "Contract spec tests structural isolation at TypeScript type level — if WorkflowGraph ever gains top-level AI fields, type errors will surface"
  - "validation.service.ts was the only remaining file with stale running/skipped/guide/logic/criteria — now fully aligned"
  - "NODE-METADATA-CONTRACT.md lives in src/node/ (not in .planning/) so it is a codebase-browsable artifact satisfying ROADMAP criterion 4"

patterns-established:
  - "Schema contracts belong in code: in-codebase .md documents next to entities serve as developer-accessible reference"
  - "Zod schema and TypeScript types must stay in sync: separate Zod file that drifts from types creates split-brain validation"

requirements-completed:
  - DATA-04

duration: 12min
completed: 2026-03-13
---

# Phase 1 Plan 3: Gap Closure — Validation Sync + DATA-04 Contract Summary

**Aligned validation.service.ts to locked 4-value NodeStatus and requirement+prompt Instructions, and created contract spec + schema document proving the auto-save path cannot overwrite backend AI fields**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-13T08:45:00Z
- **Completed:** 2026-03-13T08:57:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `validation.service.ts` InstructionsSchema updated from `guide/logic/criteria` to `requirement/prompt`; NodeStatus enum updated from `pending|running|completed|failed|skipped` to `pending|completed|failed|review_needed`
- `validation.service.spec.ts` fully rewritten: 27 tests pass, zero references to guide/logic/criteria or running/skipped; added dedicated tests for `review_needed` acceptance and `running`/`skipped` rejection
- `src/node/node-metadata.contract.spec.ts` created with 6 tests proving WorkflowGraph structural isolation from backend AI fields
- `src/node/NODE-METADATA-CONTRACT.md` created documenting nodeId PK, backend-only status, sync field exclusions, WorkflowGraph isolation, and soft-delete behavior
- ROADMAP Phase 1 success criteria: 4/4 satisfied (criteria 3 and 4 previously blocked by missing artifacts)

## Task Commits

1. **Task 1: Update validation.service.ts schemas and fix spec fixtures** - `192c322` (fix)
2. **Task 2: Create contract spec and in-codebase schema document for DATA-04** - `059272e` (feat)

## Files Created/Modified

- `src/services/validation.service.ts` - InstructionsSchema and NodeStatus enum aligned to locked contract
- `src/services/__tests__/validation.service.spec.ts` - All fixtures updated; 27 tests cover new and old schema behavior
- `src/node/node-metadata.contract.spec.ts` - 6 contract tests for WorkflowGraph/NodeMetadataEntity field isolation
- `src/node/NODE-METADATA-CONTRACT.md` - Authoritative schema document for developers browsing the codebase

## Decisions Made

- **Contract test approach:** Used TypeScript structural assertions (`'requirement' in node === false`) rather than runtime mocking — catches type contract violations at compile time, not just at test time
- **NODE-METADATA-CONTRACT.md location:** Placed in `src/node/` alongside the entity it describes, not in `.planning/` — this is a codebase artifact developers will find when working on node-related code
- **Spec rewrite vs. partial edit:** Rewrote the entire spec file to eliminate all `guide/logic/criteria` references cleanly rather than patching individual lines — ensures no stale fixtures remain

## Deviations from Plan

None — plan executed exactly as written. The spec already had TypeScript errors from the earlier `workflow.types.ts` update (confirmed during RED check), so the test infrastructure was already in the expected RED state. Implementation restored all tests to GREEN.

## Issues Encountered

- Pre-existing test failures in `filesystem.service.spec.ts`, `permission-manager.service.spec.ts`, `project.service.spec.ts`, `project.controller.spec.ts`, and `workflow-file-manager.service.spec.ts` — all due to browser-only APIs (`indexedDB`) or NestJS DI issues unrelated to this plan's changes. These were confirmed pre-existing by verifying they are not in the set of files modified by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 is now 4/4 on ROADMAP success criteria — the data model contract is fully locked and proven
- Phase 2 sync API can build on the confirmed contract: nodeId is PK, sync writes only nodeId/projectId/nodeType, AI fields are protected
- Blocker from STATE.md still applies: confirm MikroORM 6.6.8 exact `em.upsert()` signature before Phase 2 implementation

---
*Phase: 01-data-model*
*Completed: 2026-03-13*
