---
phase: 03-workflow-export
plan: 01
subsystem: testing
tags: [jest, tdd, red-phase, workflow-export, topological-sort, cycle-detection]

# Dependency graph
requires:
  - phase: 02-node-api
    provides: NodeService, WorkflowController, NodeMetadataEntity, ProjectEntity with workflowJson
provides:
  - 14 RED failing unit tests for WorkflowExportService (EXPORT-01 through EXPORT-06)
  - 1 RED failing controller routing test for GET :projectId/export
  - Locked test contract specifying exact export response shape and edge-case behavior
affects: [03-workflow-export plan 02 — Wave 2 implementation drives these to GREEN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED baseline — write all spec cases before any implementation class exists
    - Mock-object pattern with jest.fn() factories (no NestJS TestingModule)
    - Cycle detection test via try/catch with UnprocessableEntityException introspection

key-files:
  created:
    - src/node/workflow-export.service.spec.ts
    - src/node/workflow.controller.spec.ts
  modified: []

key-decisions:
  - "Out-of-scope (dangling/deleted) dependency treated as satisfied for can_execute — test case 9 locks this behavior"
  - "UnprocessableEntityException cycle response shape: { error: string, cycle: string[] } where cycle[0] === cycle[last]"
  - "Topological order assertions use indexOf() comparisons — same-level nodes not additionally ordered"
  - "Controller spec writes two-argument constructor (NodeService + WorkflowExportService) in advance of Wave 2 injection"

patterns-established:
  - "TDD RED scaffold: import target module that does not exist yet — suite fails at import, not at assertion"
  - "Cycle exception introspection: thrownError.getResponse() to access NestJS exception response body"

requirements-completed: [EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04, EXPORT-05, EXPORT-06]

# Metrics
duration: 8min
completed: 2026-03-13
---

# Phase 3 Plan 01: Workflow Export TDD RED Baseline Summary

**15 failing test cases (14 service + 1 controller) establish the RED contract for WorkflowExportService before any implementation exists**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-13T10:31:12Z
- **Completed:** 2026-03-13T10:39:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Wrote 14 spec cases for WorkflowExportService covering all 6 export requirements (404, empty export, field shape, dangling edges, can_execute logic, topo order, executable_now, 422 cycle detection)
- Wrote 1 controller routing spec verifying two-argument constructor delegation to WorkflowExportService
- Confirmed RED state: all 15 tests fail due to missing implementation, not syntax errors
- Verified all existing Phase 1 and 2 node tests remain GREEN (29 tests, 5 suites)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write workflow-export.service.spec.ts with 14 failing cases** - `d3089bc` (test)
2. **Task 2: Write workflow.controller.spec.ts for export route** - `2996ddc` (test)

**Plan metadata:** (docs commit below)

_Note: TDD RED phase — both commits are test-only, implementation intentionally absent_

## Files Created/Modified
- `src/node/workflow-export.service.spec.ts` — 14 RED test cases for WorkflowExportService; covers EXPORT-01 through EXPORT-06
- `src/node/workflow.controller.spec.ts` — 1 RED test case for WorkflowController.export() routing delegation

## Decisions Made
- Out-of-scope (dangling/deleted/unsynced) dependency is treated as satisfied for `can_execute` — locked by test case 9
- `UnprocessableEntityException` cycle response shape: `{ error: 'Cyclic dependency detected', cycle: string[] }` where `cycle[0] === cycle[cycle.length - 1]`
- Topological order assertions use `indexOf()` comparisons; same-level nodes not additionally ordered per CONTEXT.md
- Controller spec pre-writes the two-argument constructor (NodeService + WorkflowExportService) — RED now, GREEN after Wave 2

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness
- Wave 2 (Plan 02) can now implement `WorkflowExportService` and the `GET :projectId/export` route against these locked specs
- All 15 tests will turn GREEN once Wave 2 creates the service class and updates WorkflowController with the new dependency
- No blockers

---
*Phase: 03-workflow-export*
*Completed: 2026-03-13*
