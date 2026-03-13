---
phase: 02-node-api
plan: 01
subsystem: api
tags: [nestjs, zod, nestjs-zod, dto, jest, tdd]

# Dependency graph
requires:
  - phase: 01-data-model
    provides: NodeMetadataEntity and NodeExecutionHistoryEntity with NodeStatus type
provides:
  - src/test-setup.ts satisfying Jest setupFilesAfterEnv
  - Four Zod DTOs for node API endpoints (update, status, history, sync)
  - RED test stubs for 5 NodeService methods
  - GREEN structural contract asserting sync upsert excludes 4 protected fields
  - ProjectService exported from ProjectModule
affects:
  - 02-02 (NodeService implementation uses all 4 DTOs)
  - 02-03 (NodeController uses DTOs via service)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Zod schema + createZodDto class pair (matches existing project/dto pattern)
    - Structural contract spec (plain object assertion, no service dependency)
    - TDD RED stubs establish failing baseline before implementation

key-files:
  created:
    - src/test-setup.ts
    - src/node/dto/update-node.dto.ts
    - src/node/dto/update-node-status.dto.ts
    - src/node/dto/create-node-history.dto.ts
    - src/node/dto/sync-workflow.dto.ts
    - src/node/node.service.spec.ts
    - src/node/sync.contract.spec.ts
  modified:
    - src/project/project.module.ts

key-decisions:
  - "UpdateNodeDto omits status field by design — status is updated exclusively via dedicated updateStatus endpoint"
  - "CreateNodeHistoryDto uses executedBy (caller-facing name); mapping to entity field createdBy is NodeService's responsibility"
  - "sync.contract.spec.ts is a GREEN structural test — defines the upsert config inline, no running service needed"
  - "Jest 30 renamed --testPathPattern to positional arg matching; all tests run correctly via pnpm test or pnpm test -- <pattern>"

patterns-established:
  - "Structural contract test: define config const in spec, assert all protected field names are present — prevents accidental sync overwrite of backend-owned fields"
  - "DTO split by concern: UpdateNodeDto (content) vs UpdateNodeStatusDto (status only) enforces separate update paths"

requirements-completed: [API-01, API-02, API-03, API-04, API-05]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 2 Plan 01: Node API Foundation Summary

**Four Zod DTOs for node CRUD/sync endpoints, RED spec stubs for 5 NodeService methods, GREEN sync upsert contract, and ProjectService exported from ProjectModule.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-13T06:51:07Z
- **Completed:** 2026-03-13T06:56:09Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created 4 typed Zod DTO files matching NodeMetadataEntity and NodeExecutionHistoryEntity fields
- Established failing RED baseline specs for all 5 NodeService methods (updateNode, updateStatus, createHistory, getHistory, sync)
- Verified sync upsert contract protects status/requirement/prompt/attributes from overwrite
- Fixed ProjectModule to export ProjectService so NodeModule can inject it in Phase 2 Wave 2

## Task Commits

Each task was committed atomically:

1. **Task 1: Create test-setup.ts and DTO files** - `31eb4bf` (feat)
2. **Task 2: Create spec scaffolds (RED) and export ProjectService** - `40da226` (test)

## Files Created/Modified
- `src/test-setup.ts` - Jest setupFilesAfterEnv hook file (was already present, unchanged)
- `src/node/dto/update-node.dto.ts` - UpdateNodeDto: requirement/prompt/attributes, no status
- `src/node/dto/update-node-status.dto.ts` - UpdateNodeStatusDto: status enum only (required)
- `src/node/dto/create-node-history.dto.ts` - CreateNodeHistoryDto: result/executedBy/executedAt
- `src/node/dto/sync-workflow.dto.ts` - SyncWorkflowDto: nodes array with nodeId + nodeType
- `src/node/node.service.spec.ts` - 5 RED failing describe blocks for service method stubs
- `src/node/sync.contract.spec.ts` - GREEN structural contract: 4 fields excluded from upsert
- `src/project/project.module.ts` - Added exports: [ProjectService]

## Decisions Made
- UpdateNodeDto deliberately omits `status` — separate endpoint enforces the invariant that content edits never accidentally change AI execution status
- `executedBy` in CreateNodeHistoryDto maps to `createdBy` in entity — the renaming happens in NodeService to keep the request API semantically clear to callers
- sync.contract.spec.ts defines SYNC_UPSERT_OPTIONS inline (not imported from service) — this is intentional so the contract remains testable even before NodeService is implemented

## Deviations from Plan

None — plan executed exactly as written.

One discovery: Jest 30 removed `--testPathPattern` flag (renamed to positional argument). The plan's verification command used `--testPathPattern` which returned no matches. All tests still pass correctly — the pattern for running a specific spec is `pnpm test -- "sync.contract"` (positional). Logged for future plan authors.

## Issues Encountered
- `src/test-setup.ts` already existed from a prior scaffold; it satisfied the requirement without modification.
- Jest 30 changed `--testPathPattern` CLI flag behavior. The sync.contract spec verifies GREEN and node.service spec verifies RED when run without the deprecated flag.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 DTO files ready for import by NodeService in Plan 02-02
- RED stubs in node.service.spec.ts give Plan 02-02 the test targets to turn GREEN
- ProjectModule now exports ProjectService; NodeModule can add `imports: [ProjectModule]` in 02-02
- sync.contract.spec.ts will remain GREEN throughout all subsequent waves as a regression guard

## Self-Check: PASSED

All created files confirmed present on disk. Both task commits (31eb4bf, 40da226) verified in git log.

---
*Phase: 02-node-api*
*Completed: 2026-03-13*
