# Phase 4: Node Edit Panel - Research

**Researched:** 2026-03-14
**Domain:** LogicFlow HtmlNode + Vue 3 内联编辑卡片 + REST API 自动保存
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **不使用右侧滑入 Panel**——用户明确选择内联卡片方案
- 所有节点改为 **LogicFlow 自定义 HtmlNode** 渲染器，节点本身即为卡片
- 原 REQUIREMENTS.md 中 EDITOR-01 的 `NodeEditPanel.vue` 组件不再创建；以内联编辑替代
- 节点顶部始终显示：**节点类型/名称 + requirement 首行**（最多 ~50 字符截断）
- requirement 为空时显示灰色占位文字"未填写"
- 节点大小随内容自适应（展开时向下拉伸）
- **单击节点**：展开/收起内联编辑区（切换行为）
- 展开区域直接渲染在节点卡片下方（节点向下延伸）
- 再次点击同一节点收起编辑区
- 展开后显示全部三个字段：requirement（多行文本域）、prompt（多行文本域）、attributes（键值对表格，支持动态增删行）
- 内容多时节点向下拉长，不限制高度
- **自动保存**：内容变动后 500ms 防抖触发 `PATCH /api/v1/node/:id`
- 不显示保存按钮
- 保存成功时节点内展示"已保存 ✓"（短暂 2s 后消失）
- 保存失败时节点内展示"保存失败"（持续显示，直到下一次保存成功）
- Phase 4 的卡片上方预留 status 颜色边框（Phase 5 再实现颜色逻辑）

### Claude's Discretion

- HtmlNode 具体渲染框架（Vue 3 组件 via `createApp` 挂载 vs 纯 DOM）
- LogicFlow 自定义节点注册方式（与现有节点类型兼容）
- attributes 新增行时的默认值（空字符串）
- 节点最小高度和卡片样式细节

### Deferred Ideas (OUT OF SCOPE)

- 右侧滑入 Panel 方案 — 用户选择了内联卡片方案代替
- 状态颜色显示 — Phase 5 实现
- 审核按钮（通过/拒绝）— Phase 6 实现
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EDITOR-01 | 点击节点时展开/收起内联编辑区（替代原 NodeEditPanel.vue 右侧 Panel） | HtmlNode.setHtml() 挂载卡片 DOM；node:click 事件切换展开态；model.width/height 动态更新 |
| EDITOR-02 | requirement 多行文本域展示与编辑 | foreignObject 内原生 textarea；oninput 事件驱动防抖保存 |
| EDITOR-03 | prompt 多行文本域展示与编辑 | 同 EDITOR-02，第二个 textarea 字段 |
| EDITOR-04 | attributes 键值对表格，支持动态增删行 | 纯 DOM 渲染键值对行；增删行后调用 model.setProperties + 重新 setHtml |
| EDITOR-05 | 自动保存调用 PATCH /api/v1/node/:id，显示成功/失败反馈 | 500ms debounce fetch；结果写入节点 DOM 元素的状态提示区 |
</phase_requirements>

---

## Summary

Phase 4 将画布上的所有节点从简单的 `RectNode` 升级为 `HtmlNode` 卡片渲染器。每个节点卡片分为两段：上段常驻显示节点类型图标和 requirement 摘要，下段在单击时展开，呈现 requirement/prompt textarea 和 attributes 键值对表格。编辑内容通过 500ms 防抖自动保存到 `PATCH /api/v1/node/:id`。

关键技术挑战在于 LogicFlow HtmlNode 与 Vue 3 的集成方式。LogicFlow 内部使用 Preact 渲染，`setHtml(rootEl)` 提供的 `rootEl` 是 SVG `<foreignObject>` 元素——可以在其中挂载 Vue 3 应用（`createApp`），也可以用纯 DOM API 操作。推荐使用**纯 DOM API**方案，避免多个 Vue 应用实例内存开销和 Preact/Vue 并发渲染的潜在冲突。

动态高度是核心陷阱：展开/收起时必须调用 `lf.getNodeModelById(id)` 取得 model，直接设置 `model.height = newHeight`（model 上的 height 是 observable setter，会触发 Preact 重渲染），否则画布锚点和边连接点错位。

**Primary recommendation:** 使用 HtmlNode + 纯 DOM 渲染卡片，通过 `lf.getNodeModelById(id).height = newHeight` 实现动态高度，通过 `model.setProperties({...})` 触发 `setHtml` 重绘。

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@logicflow/core` | 2.1.11 | HtmlNode / HtmlNodeModel 基类，自定义节点注册 | 项目已使用，HtmlNode 是官方 HTML 自定义节点机制 |
| Vue 3 | 3.5.25 | 前端框架（WorkflowEditor.vue 组件所在） | 项目既有选型 |
| TypeScript | 5.9.3 | 类型安全 | 项目既有选型 |
| Vitest | 4.0.18 | 前端单元测试 | 项目既有选型，vite.config.ts 已配置 jsdom |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@logicflow/extension` | 2.1.15 | Control / Menu / SelectionSelect 插件 | 已在 logicflow.config.ts 使用，无需新增 |
| 原生 `fetch` | browser built-in | 调用 PATCH /api/v1/node/:id | 无需额外 HTTP 库 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 纯 DOM API 渲染卡片 | Vue `createApp` 挂载 | createApp 会在每个节点内创建独立 Vue 应用，内存开销大，且与 Preact foreignObject 生命周期冲突难以追踪 |
| 直接设置 `model.height` | 调用 `lf.changeNodeType` 重建节点 | changeNodeType 会丢失 edges 连接关系；直接设置 height 是官方推荐的动态尺寸方案 |

**Installation:** 无需新增依赖，全部使用已有库。

---

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/
├── components/
│   └── WorkflowEditor.vue        # 修改：替换 registerCustomNodes，增加 node:click 处理
├── nodes/                         # 新建目录
│   ├── NodeCardRenderer.ts        # HtmlNode 子类，setHtml 逻辑
│   ├── NodeCardModel.ts           # HtmlNodeModel 子类，setAttributes 动态高度
│   └── node-card.css              # 卡片样式（卡片容器、表格、按钮等）
├── services/
│   └── node-api.service.ts        # 新建：封装 PATCH /api/v1/node/:id
└── types/
    └── logicflow.types.ts         # 已有：ExtendedNodeConfig.properties 含 requirement/prompt/attributes
```

### Pattern 1: HtmlNode 注册替换现有 RectNode

**What:** 用 `HtmlNode` + `HtmlNodeModel` 替代当前的 `RectNode` + `RectNodeModel`，通过 `lf.register({ type, view, model })` 注册相同类型名（如 `TextNode`、`FileNode` 等），覆盖原有注册。

**When to use:** 需要在节点内渲染 HTML 表单控件时。

**Example:**

```typescript
// Source: @logicflow/core/es/view/node/HtmlNode.d.ts + HtmlNodeModel.d.ts
import { HtmlNode, HtmlNodeModel } from '@logicflow/core';

class CardNodeModel extends HtmlNodeModel {
  // setAttributes 在 properties 变化时被调用
  setAttributes() {
    const COLLAPSED_HEIGHT = 80;
    const EXPANDED_HEIGHT = this.properties.expanded ? 400 : COLLAPSED_HEIGHT;
    this.width = 320;
    this.height = EXPANDED_HEIGHT;
    // height 是 observable setter，赋值即触发 Preact 重渲染
  }
}

class CardNodeView extends HtmlNode {
  setHtml(rootEl: SVGForeignObjectElement) {
    // 清空并重建 DOM（confirmUpdate 也调用此方法）
    rootEl.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'node-card';
    // ... 构建卡片 DOM
    rootEl.appendChild(card);
  }

  // shouldUpdate 控制 setHtml 何时调用（properties 未变化时跳过）
  shouldUpdate() {
    if (this.preProperties === this.currentProperties) return false;
    this.preProperties = this.currentProperties;
    return true;
  }
}
```

### Pattern 2: 展开/收起通过 setProperties 驱动

**What:** 在 `lf.on('node:click')` 回调中调用 `lf.getNodeModelById(id).setProperties({ expanded: !current })` 切换展开状态。`setProperties` 会更新 `model.properties` 并触发 `setAttributes`（通过 MobX observable），`setAttributes` 设置新 `height`，Preact 重渲染 foreignObject 高度，然后调用 `confirmUpdate → setHtml` 重绘卡片内容。

**When to use:** 任何需要改变节点外观/内容的操作。

**Example:**

```typescript
// WorkflowEditor.vue setupLogicFlowEvents() 中
lf.on('node:click', ({ data }) => {
  const model = lf.getNodeModelById(data.id);
  if (!model) return;
  const isExpanded = model.properties.expanded ?? false;
  model.setProperties({ expanded: !isExpanded });
});
```

### Pattern 3: 防抖自动保存

**What:** 在 `setHtml` 渲染 textarea 时，`oninput` 事件绑定防抖函数，延迟 500ms 后调用 `PATCH /api/v1/node/:id`。

**When to use:** 所有需要实时持久化的用户输入。

**Example:**

```typescript
// 在 setHtml 内，nodeId 通过闭包捕获
function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const saveNode = debounce(async (nodeId: string, payload: Record<string, unknown>) => {
  try {
    const res = await fetch(`/api/v1/node/${nodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('save failed');
    showSaveStatus(rootEl, 'success'); // 显示"已保存 ✓"2s
  } catch {
    showSaveStatus(rootEl, 'error');   // 显示"保存失败"持续
  }
}, 500);
```

### Anti-Patterns to Avoid

- **在 setHtml 里 new Vue / createApp:** Preact foreignObject 生命周期与 Vue 应用实例不同步，会导致节点删除时 Vue 实例泄漏，且每个节点都创建独立 Vue 根实例开销大。用纯 DOM API。
- **在 node:click 里直接修改 model.height:** 应通过 `model.setProperties({...})` → `setAttributes` 的链路修改高度，直接改 height 不会触发 `shouldUpdate`/`setHtml` 重绘卡片内容（虽然 foreignObject 尺寸变化，但内容不更新）。
- **不清空 rootEl.innerHTML 就追加 DOM:** `confirmUpdate` 和 `setHtml` 都会被调用，不清空会导致内容重复渲染。
- **忘记 stopPropagation:** 卡片内 textarea/button 的点击事件会冒泡到 LogicFlow 的 node:click，触发意外收起。必须在卡片容器上调用 `event.stopPropagation()`。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 防抖 | 自定义 debounce 包装 | 内联 debounce（20行以内）或 lodash-es/debounce | 边界情况多；但本项目无 lodash，内联 20 行足够 |
| API 调用封装 | 复杂 HTTP 客户端 | 原生 `fetch` + 直接 try/catch | 只有一个端点，无需 axios |
| 动态高度测量 | ResizeObserver 监测 DOM | 直接在用户操作后计算目标高度并设置 | HtmlNode 的 foreignObject 高度由 model.height 控制，测量 DOM 高度再反写会产生循环 |

**Key insight:** LogicFlow HtmlNode 的高度控制完全在 model 层（`model.height = N`），不要从 DOM 高度反推。

---

## Common Pitfalls

### Pitfall 1: 动态高度后锚点错位

**What goes wrong:** 展开节点高度变化后，边的连接锚点仍指向旧位置，画布上连线错位。

**Why it happens:** 直接操作 DOM 改变 foreignObject 高度，但 `model.height` 未更新，LogicFlow 锚点仍按旧 height 计算。

**How to avoid:** 始终通过 `model.setProperties({ height: newHeight })` 或直接 `model.height = newHeight` 触发 model 更新（已验证：`HtmlNodeModel.setAttributes` 会读取 `properties.height` 赋值给 `this.height`）。推荐方案：在 `setAttributes` 内根据 `properties.expanded` 计算高度。

**Warning signs:** 节点展开后拖动时，连线端点不跟随节点端口移动。

### Pitfall 2: node:click 事件在卡片交互时误触发

**What goes wrong:** 用户在 textarea 内点击，触发 `node:click`，导致编辑区意外收起。

**Why it happens:** 事件冒泡：卡片内元素点击 → foreignObject → LogicFlow canvas 事件。

**How to avoid:** 在卡片根容器（`div.node-card`）的 `mousedown` 和 `click` 事件上调用 `event.stopPropagation()`。注意：LogicFlow 监听的是 `mousedown`，不只是 `click`。

**Warning signs:** 单击 textarea 文字区域，节点立即收起。

### Pitfall 3: shouldUpdate 导致 setHtml 不重绘

**What goes wrong:** 调用 `model.setProperties({...})` 后，卡片内容不刷新。

**Why it happens:** `HtmlNode.shouldUpdate()` 比较 `this.preProperties` 和 `this.currentProperties`（JSON.stringify(model.properties)），如果 properties 引用未变化，返回 false，跳过 `confirmUpdate`。

**How to avoid:** 确保 `setProperties` 传入新的数据（哪怕只改一个字段），或重写 `shouldUpdate` 始终返回 `true`（适合 Phase 4 的用例，因为高度和内容都需要随时重绘）。

**Warning signs:** 展开后卡片内容显示旧数据。

### Pitfall 4: 现有节点类型名与 HtmlNode 注册冲突

**What goes wrong:** 调用 `lf.register({ type: 'TextNode', view: CardNodeView, model: CardNodeModel })` 后报错或旧节点类型未被覆盖。

**Why it happens:** LogicFlow 2.x 中 `lf.register()` 允许覆盖已注册类型，但必须在 `lf.render()` 之前调用。

**How to avoid:** 在 `registerCustomNodes()` 函数中，用 HtmlNode/HtmlNodeModel 子类替换所有现有的 RectNode 注册（7 种类型全部替换）。调用顺序：`createLogicFlowInstance` → `registerCustomNodes` → `ensureRootNode`（当前代码已是此顺序）。

**Warning signs:** 节点渲染为空白矩形而非卡片 HTML 内容。

### Pitfall 5: attributes 键值对表格行增删后数据不同步

**What goes wrong:** 用户点击"+"添加行，但 model.properties.attributes 未更新，下次重绘时新行消失。

**Why it happens:** DOM 操作（插入新 `<tr>`）只修改了 DOM，未回写 model。

**How to avoid:** 增删行的按钮 onclick 立即调用 `model.setProperties({ attributes: [...newRows] })` 触发 `setHtml` 重绘（这会从 model 重新渲染 DOM，确保一致）。

---

## Code Examples

### HtmlNode 完整注册模式

```typescript
// Source: @logicflow/core/es/view/node/HtmlNode.js + HtmlNodeModel.js (verified from source)
import { HtmlNode, HtmlNodeModel } from '@logicflow/core';

const COLLAPSED_HEIGHT = 80;
const EXPANDED_HEIGHT_BASE = 300; // 最小展开高度

class CardNodeModel extends HtmlNodeModel {
  setAttributes() {
    this.width = 320;
    this.height = this.properties.expanded ? EXPANDED_HEIGHT_BASE : COLLAPSED_HEIGHT;
  }
}

class CardNodeView extends HtmlNode {
  setHtml(rootEl: SVGForeignObjectElement) {
    rootEl.innerHTML = '';
    const model = this.props.model;
    const props = model.properties;

    const card = document.createElement('div');
    card.className = 'node-card';
    // 阻止事件冒泡，防止误触 node:click
    card.addEventListener('mousedown', (e) => e.stopPropagation());
    card.addEventListener('click', (e) => e.stopPropagation());

    // 上段：摘要
    const summary = document.createElement('div');
    summary.className = 'node-card__summary';
    summary.textContent = props.requirement
      ? String(props.requirement).slice(0, 50)
      : '未填写';
    card.appendChild(summary);

    // 下段：展开区域
    if (props.expanded) {
      const form = buildEditForm(model);
      card.appendChild(form);
    }

    rootEl.appendChild(card);
  }
}

// 注册（在 registerCustomNodes 中替换对应类型）
lf.register({ type: 'TextNode', view: CardNodeView, model: CardNodeModel });
```

### node:click 展开/收起

```typescript
// Source: WorkflowEditor.vue setupLogicFlowEvents() — 现有代码替换 console.log
lf.on('node:click', ({ data }) => {
  const model = lf.getNodeModelById(data.id);
  if (!model) return;
  // 不展开 RootNode
  if (data.type === 'RootNode') return;
  const current = model.getProperties();
  model.setProperties({ expanded: !current.expanded });
});
```

### PATCH API 调用

```typescript
// Source: 后端 PATCH /api/v1/node/:id 在 Phase 2 已实现 (API-01)
// 请求体: { requirement?: string, prompt?: string, attributes?: Record<string, string> }
async function patchNode(nodeId: string, payload: {
  requirement?: string;
  prompt?: string;
  attributes?: Record<string, string>;
}) {
  const res = await fetch(`/api/v1/node/${nodeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RectNode + RectNodeModel（SVG 矩形） | HtmlNode + HtmlNodeModel（foreignObject HTML） | Phase 4 | 支持任意 HTML 控件（textarea、table、button） |
| node:click → console.log | node:click → setProperties toggle expanded | Phase 4 | 单击展开卡片编辑区 |
| 无 AI 字段前端编辑 | 内联 textarea 自动保存到 PATCH API | Phase 4 | requirement/prompt/attributes 可视化编辑 |

**Deprecated/outdated:**
- `RectNode` / `RectNodeModel` 作为内容节点基类：Phase 4 全部替换为 HtmlNode/HtmlNodeModel。RootNode 可保留 RectNode（只展示标题，无编辑需求）。

---

## Open Questions

1. **attributes 后端数据格式**
   - What we know: `PATCH /api/v1/node/:id` 的 `attributes` 字段在 Phase 2 实现，类型是 JSON（`NodeMetadataEntity.attributes`）
   - What's unclear: 是 `Record<string, string>` 还是 `Array<{ key: string, value: string }>`（前端 types 定义为后者）
   - Recommendation: 查阅 Phase 2 的 `UpdateNodeDto` 定义确认格式；前端存储用 Array，POST 时转换为 Record 或直接传 Array（取决于 DTO）

2. **节点初始化时从后端加载 AI 字段**
   - What we know: 画布节点数据来自本地 JSON 文件（通过 logicflow-converter），后端 `NodeMetadataEntity` 独立存储 AI 字段
   - What's unclear: Phase 4 范围内是否需要在画布加载时从后端拉取 AI 字段并写入 properties？
   - Recommendation: Phase 4 聚焦于"写入"路径（编辑 → 保存），"读取"路径（加载时从后端填充）可作为本 Phase 的附加任务或 Phase 5 补充

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | vite.config.ts（test.environment = jsdom） |
| Quick run command | `pnpm run test` (in frontend/) |
| Full suite command | `pnpm run test` (in frontend/) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDITOR-01 | node:click 切换 expanded property | unit | `pnpm run test -- --reporter=verbose node-card` | ❌ Wave 0 |
| EDITOR-02 | requirement textarea 绑定 oninput，防抖后触发保存 | unit | `pnpm run test -- --reporter=verbose node-card` | ❌ Wave 0 |
| EDITOR-03 | prompt textarea 绑定 oninput，防抖后触发保存 | unit | `pnpm run test -- --reporter=verbose node-card` | ❌ Wave 0 |
| EDITOR-04 | attributes 增删行后 model.properties.attributes 同步 | unit | `pnpm run test -- --reporter=verbose node-card` | ❌ Wave 0 |
| EDITOR-05 | patchNode 发出正确 fetch 请求；成功/失败状态提示 | unit | `pnpm run test -- --reporter=verbose node-api` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd frontend && pnpm run test`
- **Per wave merge:** `cd frontend && pnpm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `frontend/src/tests/node-card.spec.ts` — 覆盖 EDITOR-01 至 EDITOR-04（CardNodeModel.setAttributes、CardNodeView.setHtml 中 DOM 构建、expanded toggle）
- [ ] `frontend/src/tests/node-api.spec.ts` — 覆盖 EDITOR-05（patchNode fetch 调用、save status DOM 反馈）

*(已有 `frontend/src/tests/setup.ts` 和 `logicflow-converter.spec.ts`，现有 jsdom + Vitest 配置完全覆盖 HtmlNode 相关的 DOM 操作测试)*

---

## Sources

### Primary (HIGH confidence)

- `@logicflow/core/es/view/node/HtmlNode.js` — setHtml、confirmUpdate、shouldUpdate、getShape（foreignObject）实现细节，已直接读取源码
- `@logicflow/core/es/model/node/HtmlNodeModel.js` — setAttributes 中 properties.width/height 赋值机制，已直接读取源码
- `@logicflow/core/es/model/node/BaseNodeModel.d.ts` — setProperties、getProperties、height setter、setAttributes 生命周期，已直接读取类型定义
- `frontend/src/components/WorkflowEditor.vue` — 现有 registerCustomNodes、setupLogicFlowEvents、lf.on('node:click') 入口，已直接读取
- `frontend/src/config/logicflow.config.ts` — 现有 createLogicFlowInstance 和节点注册流程，已直接读取
- `.planning/phases/04-node-edit-panel/04-CONTEXT.md` — 用户锁定决策，已直接读取

### Secondary (MEDIUM confidence)

- `frontend/src/types/logicflow.types.ts` — `ExtendedNodeConfig.properties` 含 requirement/prompt/attributes 字段定义
- `frontend/package.json` — 版本确认：@logicflow/core@^2.1.11，vitest@^4.0.18

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — 直接从源码和 package.json 验证，无需推测
- Architecture: HIGH — HtmlNode API 从源码确认，setHtml/setAttributes/shouldUpdate 链路清晰
- Pitfalls: HIGH — 从 HtmlNode.js 源码分析事件冒泡和 shouldUpdate 逻辑；动态高度机制从 HtmlNodeModel.setAttributes 源码确认

**Research date:** 2026-03-14
**Valid until:** 2026-05-14（LogicFlow 2.x API 稳定，30 天内有效）
