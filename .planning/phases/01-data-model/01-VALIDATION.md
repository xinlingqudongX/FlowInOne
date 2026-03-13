---
phase: 1
slug: data-model
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest (backend) / Vitest 4.0.18 (frontend) |
| **Config file** | `jest` block in `package.json` (root) / `test` block in `frontend/vite.config.ts` |
| **Quick run command** | `pnpm test` (backend) or `cd frontend && pnpm test` (frontend) |
| **Full suite command** | `pnpm test && cd frontend && pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the relevant spec file only (see Per-Task map)
- **After every plan wave:** Run `pnpm test` (backend) + `cd frontend && pnpm test` (frontend)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | DATA-01 | unit | `pnpm test -- --testPathPattern node-metadata` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | DATA-02 | unit | `pnpm test -- --testPathPattern node-execution-history` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | DATA-03 | integration | `pnpm test -- --testPathPattern migration.spec` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 0 | DATA-04 | unit | `pnpm test -- --testPathPattern node-metadata.contract` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 0 | DATA-05 | unit | `cd frontend && pnpm test -- --reporter=verbose logicflow-converter` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/node/entities/node-metadata.entity.spec.ts` — stubs for DATA-01
- [ ] `src/node/entities/node-execution-history.entity.spec.ts` — stubs for DATA-02
- [ ] `src/node/migration.spec.ts` — integration: apply migration to in-memory SQLite, verify tables (DATA-03)
- [ ] `src/node/node-metadata.contract.spec.ts` — verify sync logic skips AI fields (DATA-04)
- [ ] `frontend/src/tests/setup.ts` — Vitest setup file (referenced in `vite.config.ts` but does not exist)
- [ ] `frontend/src/tests/logicflow-converter.spec.ts` — covers DATA-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| NodeMetadataEntity schema doc exists stating nodeId is PK, status is backend-only, sync skips AI fields | DATA-04 | Documentation artifact, not runtime behavior | Check `.planning/` or `src/node/` for schema contract doc |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
