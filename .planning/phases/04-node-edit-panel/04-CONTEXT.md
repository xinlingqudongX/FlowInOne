# Phase 4: Node Edit Panel - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

让开发者在画布上直接查看和编辑每个节点的 requirement、prompt、attributes 字段。实现节点卡片化——画布上常驻显示节点摘要，点击节点展开内联编辑区，自动保存到 `PATCH /api/v1/node/:id`。不包含状态颜色可视化（Phase 5）和审核按钮（Phase 6）。

</domain>

<decisions>
## Implementation Decisions

### 设计方案变更（重要）
- **不使用右侧滑入 Panel**（EDITOR-01 原方案）——用户明确选择内联卡片方案
- 所有节点改为 **LogicFlow 自定义 HtmlNode** 渲染器，节点本身即为卡片
- 原 REQUIREMENTS.md 中 EDITOR-01 的 `NodeEditPanel.vue` 组件不再创建；以内联编辑替代

### 节点卡片常驻内容
- 节点顶部始终显示：**节点类型/名称 + requirement 首行**（最多 ~50 字符截断）
- requirement 为空时显示灰色占位文字"未填写"
- 节点大小随内容自适应（展开时向下拉伸）

### 编辑触发与收起
- **单击节点**：展开/收起内联编辑区（切换行为）
- 展开区域直接渲染在节点卡片下方（节点向下延伸）
- 再次点击同一节点收起编辑区

### 展开后的编辑区域
- 展示全部三个字段：
  1. `requirement` — 多行文本域（multi-line textarea）
  2. `prompt` — 多行文本域
  3. `attributes` — 键值对表格（key/value 行，支持动态增删行）
- 内容多时节点向下拉长，不限制高度

### 保存机制
- **自动保存**：内容变动后 500ms 防抖触发 `PATCH /api/v1/node/:id`
- 不显示保存按钮
- 保存成功时节点内展示"已保存 ✓"（短暂 2s 后消失）
- 保存失败时节点内展示"保存失败"（持续显示，直到下一次保存成功）

### Claude's Discretion
- HtmlNode 具体渲染框架（Vue 3 组件 via `createApp` 挂载 vs 纯 DOM）
- LogicFlow 自定义节点注册方式（与现有节点类型兼容）
- attributes 新增行时的默认值（空字符串）
- 节点最小高度和卡片样式细节

</decisions>

<specifics>
## Specific Ideas

- 用户要求"数据太多拉长即可"——节点高度动态，不需要滚动条，直接展开
- 编辑区在节点"下面"（不是旁边的 popover）——即节点卡片上下两段：上段摘要，下段编辑表单
- 与 Phase 5 的状态颜色可视化协作：Phase 4 的卡片上方预留 status 颜色边框（Phase 5 再实现颜色逻辑）

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WorkflowEditor.vue:554` — `lf.on('node:click', ...)` 已存在，目前只打 console.log；Phase 4 在此基础上触发节点展开/收起
- `WorkflowEditor.vue:emit` — 目前只有 `save` emit；Phase 4 需要增加 `node-selected` emit（或在组件内部处理，不必向上冒泡）
- `frontend/src/config/logicflow.config.ts` — 现有节点类型配置；Phase 4 需要替换为 HtmlNode 自定义渲染

### Established Patterns
- **自动保存防抖**：`WorkflowManagerService` 已有 500ms 防抖自动保存画布 — Phase 4 的节点字段自动保存也用相同间隔
- **API 调用**：后端 `PATCH /api/v1/node/:id` 已在 Phase 2 实现，需前端调用
- **Vue 3 + Vite**：前端全量 Vue 3 Composition API，TypeScript

### Integration Points
- `lf.on('node:click')` — 在此注册点击展开/收起逻辑
- LogicFlow 自定义节点注册：通过 `lf.register()` 或配置 `nodes` 选项替换现有节点类型
- 所有现有节点类型（text, image, video, audio, file, decision, parallel）均需升级为新的 HtmlNode 卡片渲染器

### Potential Pitfall
- LogicFlow HtmlNode 的动态高度：展开后需要调用 `lf.getNodeModelById(id).setHeight(newHeight)` 更新节点模型高度，否则画布碰撞检测会错位
- HtmlNode 内部的 Vue 3 组件挂载需要在 `setHtml(rootEl)` 回调中完成

</code_context>

<deferred>
## Deferred Ideas

- 右侧滑入 Panel 方案 — 用户选择了内联卡片方案代替
- 状态颜色显示 — Phase 5 实现
- 审核按钮（通过/拒绝）— Phase 6 实现

</deferred>

---

*Phase: 04-node-edit-panel*
*Context gathered: 2026-03-13*
