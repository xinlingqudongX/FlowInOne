---
phase: 4
slug: node-edit-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `frontend/vite.config.ts` (test.environment = jsdom) |
| **Quick run command** | `cd frontend && pnpm run test` |
| **Full suite command** | `cd frontend && pnpm run test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm run test`
- **After every plan wave:** Run `cd frontend && pnpm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | EDITOR-01..05 | unit stubs | `cd frontend && pnpm run test` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | EDITOR-01 | unit | `cd frontend && pnpm run test -- --reporter=verbose node-card` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | EDITOR-02, EDITOR-03 | unit | `cd frontend && pnpm run test -- --reporter=verbose node-card` | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 1 | EDITOR-04 | unit | `cd frontend && pnpm run test -- --reporter=verbose node-card` | ❌ W0 | ⬜ pending |
| 4-02-04 | 02 | 1 | EDITOR-05 | unit | `cd frontend && pnpm run test -- --reporter=verbose node-api` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 2 | EDITOR-01..05 | integration | `cd frontend && pnpm run test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/tests/node-card.spec.ts` — 覆盖 EDITOR-01 至 EDITOR-04（CardNodeModel.setAttributes、CardNodeView.setHtml DOM 构建、expanded toggle）
- [ ] `frontend/src/tests/node-api.spec.ts` — 覆盖 EDITOR-05（patchNode fetch 调用、save status DOM 反馈）

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 节点在 LogicFlow 画布上展开时连线锚点不错位 | EDITOR-01 | 需要真实 LogicFlow 渲染环境 | 打开画布，点击节点，检查展开后连线是否正常 |
| 事件冒泡阻断：卡片内点击不误触 LogicFlow 拖拽 | EDITOR-01 | DOM 事件需要真实交互 | 在展开的卡片内点击 textarea，确认画布不触发 node:click |
| 保存成功提示"已保存 ✓"2秒后消失 | EDITOR-05 | 定时器视觉效果 | 编辑节点内容，等待自动保存，确认提示出现并消失 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
