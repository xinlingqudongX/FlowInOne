# LogicFlow 数据结构与实现方案

## 一、JSON 数据结构解析

### 1.1 顶层结构概览

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "project": {
    "name": "我的项目",
    "exportTime": "2026-03-14T05:59:42.013Z",
    "totalNodes": 2,
    "totalEdges": 1,
    "description": "工作流自动化与项目拆解图谱 (LogicFlow版本)"
  },
  "data": {
    "elements": [...]  // 通用数据格式
  },
  "logicFlowData": {
    "nodes": [...],    // LogicFlow 专用节点数据
    "edges": [...]     // LogicFlow 专用边数据
  }
}
```

**核心发现**：
- **数据双重存储**：同时保留了通用格式 (`data.elements`) 和 LogicFlow 专用格式 (`logicFlowData`)
- **项目元数据**：包含名称、导出时间、节点/边统计、描述
- **节点类型**：支持 RootNode（根节点）、TextNode（文本节点）等多种类型
- **边类型**：使用 polyline（折线）连接节点

---

## 二、节点数据结构详解

### 2.1 节点字段分析

| 字段 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `id` | string | 节点唯一标识 | `"start"`, `"node_3aaeab6a-..."` |
| `type` | string | LogicFlow 节点类型 | `"RootNode"`, `"TextNode"` |
| `x`, `y` | number | 节点位置坐标 | `849`, `254` |
| `text` | object | 节点文本配置 | `{ "x": ..., "y": ..., "value": "开始" }` |
| `properties` | object | 节点属性对象 | 详见下方 |

### 2.2 节点属性 (properties) 详细字段

```typescript
interface NodeProperties {
  title: string;           // 节点标题
  status: 'pending' | 'completed' | 'error';  // 节点状态
  textContent: string;      // 文本内容（文本节点专用）
  resourceUrl: string;       // 资源 URL（资源节点专用）
  resourceName: string;     // 资源名称
  nodeType: string;         // 节点类型标识
  width: number;            // 节点宽度
  height: number;           // 节点高度
  requirement: string;      // 需求描述
  prompt: string | null;    // AI 提示词
  attributes: Array<any>;   // 自定义属性数组
  properties: Array<any>;   // 扩展属性数组
}
```

### 2.3 节点类型映射

| LogicFlow 类型 | nodeType | 说明 |
|----------------|----------|------|
| `RootNode` | `root` | 根节点（项目起始点） |
| `TextNode` | `text` | 文本节点 |
| `AudioNode` | `audio` | 音频节点 |
| `VideoNode` | `video` | 视频节点 |
| `FileNode` | `file` | 文件资源节点 |

---

## 三、边数据结构详解

### 3.1 边字段分析

```typescript
interface Edge {
  id: string;                    // 边的唯一标识
  type: string;                  // 边的类型（如 "polyline"）
  properties: object;            // 边属性
  sourceNodeId: string;          // 源节点 ID
  targetNodeId: string;          // 目标节点 ID
  sourceAnchorId: string;        // 源节点锚点 ID
  targetAnchorId: string;        // 目标节点锚点 ID
  startPoint: { x: number; y: number };  // 起点坐标
  endPoint: { x: number; y: number };    // 终点坐标
  pointsList: Point[];           // 折线路径点列表
}

interface Point {
  x: number;
  y: number;
}
```

### 3.2 边的数据结构示例

```json
{
  "id": "a84c8981-5c07-4304-a5ad-8b7bb281a693",
  "type": "polyline",
  "sourceNodeId": "start",
  "targetNodeId": "node_3aaeab6a-4eca-47d6-ac1e-152302ad8ec7",
  "sourceAnchorId": "start_2",
  "targetAnchorId": "node_3aaeab6a-4eca-47d6-ac1e-152302ad8ec7_0",
  "startPoint": { "x": 849, "y": 289 },
  "endPoint": { "x": 329.363288114999, "y": 297.59261031005707 },
  "pointsList": [
    { "x": 849, "y": 289 },
    { "x": 849, "y": 304 },
    { "x": 589.1816440574995, "y": 304 },
    { "x": 589.1816440574995, "y": 282.59261031005707 },
    { "x": 329.363288114999, "y": 282.59261031005707 },
    { "x": 329.363288114999, "y": 297.59261031005707 }
  ]
}
```

**核心特性**：
- **折线路径**：使用 `pointsList` 记录完整的折线路径
- **锚点连接**：通过 `sourceAnchorId` 和 `targetAnchorId` 精确定位连接点
- **自动计算路径**：路径点由 LogicFlow 自动计算（正交路由算法）

---

## 四、实现方案

### 4.1 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                     前端层 (Vue 3)                      │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │WorkflowEditor│  │ NodeConfig   │  │ Toolbar      │  │
│  │ (LogicFlow)  │  │  Panel       │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│                   后端层 (NestJS + Fastify)             │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │WorkflowGraph │  │ TaskNode     │  │ Project      │  │
│  │   Controller │  │ Controller   │  │ Controller   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │WorkflowGraph │  │ TaskNode     │  │ Project      │  │
│  │    Service   │  │   Service    │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓ ORM
┌─────────────────────────────────────────────────────────┐
│                 数据库层 (SQLite + MikroORM)             │
├─────────────────────────────────────────────────────────┤
│  Projects  │  WorkflowGraphs  │  TaskNodes  │  Edges    │
└─────────────────────────────────────────────────────────┘
```

---

### 4.2 数据库设计

#### 4.2.1 Project 实体（项目）

```typescript
@Entity()
export class Project {
  @PrimaryKey()
  id: string;

  @Property()
  name: string;

  @Property()
  description: string;

  @Property({ nullable: true })
  exportTime?: Date;

  @OneToMany(() => WorkflowGraph, wf => wf.project)
  workflowGraphs = new Collection<WorkflowGraph>(this);

  @Property()
  createdAt: Date = new Date();

  @Property()
  updatedAt: Date = new Date();
}
```

#### 4.2.2 WorkflowGraph 实体（工作流图）

```typescript
@Entity()
export class WorkflowGraph {
  @PrimaryKey()
  id: string;

  @Property()
  name: string;

  @Property()
  description: string;

  @ManyToOne(() => Project)
  project: Project;

  @OneToMany(() => TaskNode, node => node.workflowGraph)
  nodes = new Collection<TaskNode>(this);

  @OneToMany(() => WorkflowEdge, edge => edge.workflowGraph)
  edges = new Collection<WorkflowEdge>(this);

  @Property()
  totalNodes: number = 0;

  @Property()
  totalEdges: number = 0;

  @Property()
  createdAt: Date = new Date();

  @Property()
  updatedAt: Date = new Date();
}
```

#### 4.2.3 TaskNode 实体（任务节点）

```typescript
@Entity()
export class TaskNode {
  @PrimaryKey()
  id: string;

  @Property()
  nodeType: string;  // root, text, audio, video, file

  @Property()
  title: string;

  @Property()
  status: 'pending' | 'completed' | 'error' = 'pending';

  @Property({ type: 'json' })
  config: {
    typeKey: string;
    textContent: string;
    resourceUrl: string;
    resourceName: string;
    properties: any[];
    requirement: string;
    prompt: string | null;
    attributes: any[];
  };

  @Property()
  x: number;

  @Property()
  y: number;

  @Property()
  width: number;

  @Property()
  height: number;

  @ManyToOne(() => WorkflowGraph)
  workflowGraph: WorkflowGraph;

  @ManyToOne(() => TaskNode, { nullable: true })
  parentNode?: TaskNode;

  @OneToMany(() => TaskNode, node => node.parentNode)
  children = new Collection<TaskNode>(this);

  @OneToMany(() => TaskOutput, output => output.taskNode)
  outputs = new Collection<TaskOutput>(this);

  @Property()
  createdAt: Date = new Date();

  @Property()
  updatedAt: Date = new Date();
}
```

#### 4.2.4 WorkflowEdge 实体（工作流边）

```typescript
@Entity()
export class WorkflowEdge {
  @PrimaryKey()
  id: string;

  @Property()
  type: string;  // polyline, bezier, etc.

  @ManyToOne(() => TaskNode)
  sourceNode: TaskNode;

  @ManyToOne(() => TaskNode)
  targetNode: TaskNode;

  @Property({ type: 'json' })
  pointsList: Array<{ x: number; y: number }>;

  @Property()
  sourceAnchorId: string;

  @Property()
  targetAnchorId: string;

  @Property()
  startPoint: { x: number; y: number };

  @Property()
  endPoint: { x: number; y: number };

  @ManyToOne(() => WorkflowGraph)
  workflowGraph: WorkflowGraph;

  @Property()
  createdAt: Date = new Date();

  @Property()
  updatedAt: Date = new Date();
}
```

#### 4.2.5 TaskOutput 实体（节点产出）

```typescript
@Entity()
export class TaskOutput {
  @PrimaryKey()
  id: string;

  @Property()
  outputType: string;  // text, file, image, etc.

  @Property()
  content: string;

  @Property({ nullable: true })
  filePath?: string;

  @ManyToOne(() => TaskNode)
  taskNode: TaskNode;

  @Property()
  createdAt: Date = new Date();
}
```

---

### 4.3 Zod 数据验证 Schema

```typescript
import { z } from 'zod';

// 节点配置 Schema
const NodeConfigSchema = z.object({
  typeKey: z.string(),
  textContent: z.string().default(''),
  resourceUrl: z.string().default(''),
  resourceName: z.string().default(''),
  properties: z.array(z.any()).default([]),
  requirement: z.string().default(''),
  prompt: z.string().nullable(),
  attributes: z.array(z.any()).default([])
});

// 节点 Schema
const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['RootNode', 'TextNode', 'AudioNode', 'VideoNode', 'FileNode']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  text: z.object({
    x: z.number().nullable(),
    y: z.number().nullable(),
    value: z.string()
  }),
  properties: z.object({
    title: z.string(),
    status: z.enum(['pending', 'completed', 'error']),
    textContent: z.string().default(''),
    resourceUrl: z.string().default(''),
    resourceName: z.string().default(''),
    nodeType: z.string(),
    requirement: z.string().default(''),
    prompt: z.string().nullable(),
    attributes: z.array(z.any()).default([])
  })
});

// 边 Schema
const EdgeSchema = z.object({
  id: z.string(),
  type: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  sourceAnchorId: z.string(),
  targetAnchorId: z.string(),
  startPoint: z.object({ x: z.number(), y: z.number() }),
  endPoint: z.object({ x: z.number(), y: z.number() }),
  pointsList: z.array(z.object({ x: z.number(), y: z.number() }))
});

// 工作流图 Schema
const WorkflowGraphSchema = z.object({
  project: z.object({
    name: z.string(),
    exportTime: z.string(),
    totalNodes: z.number(),
    totalEdges: z.number(),
    description: z.string()
  }),
  logicFlowData: z.object({
    nodes: z.array(NodeSchema),
    edges: z.array(EdgeSchema)
  })
});

// 导出验证函数
export const validateWorkflowGraph = (data: unknown) => {
  return WorkflowGraphSchema.safeParse(data);
};
```

---

### 4.4 前端 LogicFlow 集成

#### 4.4.1 WorkflowEditor 组件

```vue
<template>
  <div class="workflow-editor">
    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import LogicFlow from '@logicflow/core';
import '@logicflow/core/dist/style/index.css';
import { RootNode, TextNode } from './custom-nodes';

const editorContainer = ref<HTMLElement>();
let lf: LogicFlow;

onMounted(() => {
  lf = new LogicFlow({
    container: editorContainer.value!,
    width: 1200,
    height: 800,
    grid: {
      size: 20,
      visible: true,
      type: 'dot'
    },
    edgeType: 'polyline',
    background: {
      backgroundImage: 'url(data:image/svg+xml;base64,...)'
    }
  });

  // 注册自定义节点
  lf.register(RootNode);
  lf.register(TextNode);

  // 监听节点变化
  lf.on('node:click', (data) => {
    console.log('Node clicked:', data);
  });

  lf.on('node:dblclick', (data) => {
    // 打开节点配置面板
    openNodeConfigPanel(data);
  });

  lf.on('edge:click', (data) => {
    console.log('Edge clicked:', data);
  });
});

// 保存工作流图
const saveWorkflowGraph = () => {
  const graphData = lf.getGraphData();
  return {
    project: {
      name: '我的项目',
      exportTime: new Date().toISOString(),
      totalNodes: graphData.nodes.length,
      totalEdges: graphData.edges.length,
      description: '工作流自动化与项目拆解图谱'
    },
    logicFlowData: graphData
  };
};

// 加载工作流图
const loadWorkflowGraph = (data: any) => {
  lf.render(data.logicFlowData);
};
</script>
```

#### 4.4.2 自定义节点实现

```typescript
// RootNode 实现
export const RootNode = {
  type: 'RootNode',
  view: RectNode,
  model: class extends RectNodeModel {
    setAttributes() {
      this.width = 180;
      this.height = 70;
      this.fill = '#1890ff';
      this.stroke = '#1890ff';
      this.radius = 8;
    }
    getNodeStyle() {
      return {
        fill: '#1890ff',
        stroke: '#1890ff',
        strokeWidth: 2,
        fillOpacity: 0.95
      };
    }
  }
};

// TextNode 实现
export const TextNode = {
  type: 'TextNode',
  view: RectNode,
  model: class extends RectNodeModel {
    setAttributes() {
      this.width = this.properties.width || 200;
      this.height = this.properties.height || 100;
      this.fill = '#ffffff';
      this.stroke = '#1890ff';
      this.radius = 4;
    }
    getNodeStyle() {
      return {
        fill: '#ffffff',
        stroke: '#1890ff',
        strokeWidth: 2
      };
    }
  }
};
```

---

### 4.5 后端 API 设计

#### 4.5.1 WorkflowGraph Controller

```typescript
@Controller('workflow-graphs')
export class WorkflowGraphController {
  constructor(
    private readonly workflowGraphService: WorkflowGraphService
  ) {}

  @Post()
  @HttpCode(201)
  async create(@Body() createDto: CreateWorkflowGraphDto) {
    return this.workflowGraphService.create(createDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workflowGraphService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkflowGraphDto
  ) {
    return this.workflowGraphService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.workflowGraphService.delete(id);
  }

  @Post(':id/export')
  async export(@Param('id') id: string) {
    return this.workflowGraphService.export(id);
  }

  @Post('import')
  async import(@Body() data: WorkflowGraphSchema) {
    return this.workflowGraphService.import(data);
  }
}
```

#### 4.5.2 DTO 定义

```typescript
export class CreateWorkflowGraphDto {
  name: string;
  description: string;
  projectId: string;
}

export class UpdateWorkflowGraphDto {
  name?: string;
  description?: string;
  nodes?: any[];
  edges?: any[];
}

export class WorkflowGraphSchema {
  project: {
    name: string;
    exportTime: string;
    totalNodes: number;
    totalEdges: number;
    description: string;
  };
  logicFlowData: {
    nodes: NodeSchema[];
    edges: EdgeSchema[];
  };
}
```

---

### 4.6 数据转换服务

```typescript
@Injectable()
export class DataTransformService {
  // LogicFlow 数据 -> 数据库实体
  async logicFlowToEntities(
    graphData: WorkflowGraphSchema,
    projectId: string
  ): Promise<{ workflowGraph: WorkflowGraph; nodes: TaskNode[]; edges: WorkflowEdge[] }> {
    const workflowGraph = new WorkflowGraph();
    workflowGraph.name = graphData.project.name;
    workflowGraph.description = graphData.project.description;
    workflowGraph.totalNodes = graphData.project.totalNodes;
    workflowGraph.totalEdges = graphData.project.totalEdges;

    // 转换节点
    const nodes = graphData.logicFlowData.nodes.map(nodeData => {
      const node = new TaskNode();
      node.id = nodeData.id;
      node.nodeType = nodeData.properties.nodeType;
      node.title = nodeData.properties.title;
      node.status = nodeData.properties.status;
      node.config = nodeData.properties;
      node.x = nodeData.x;
      node.y = nodeData.y;
      node.width = nodeData.width;
      node.height = nodeData.height;
      node.workflowGraph = workflowGraph;
      return node;
    });

    // 转换边
    const edges = graphData.logicFlowData.edges.map(edgeData => {
      const edge = new WorkflowEdge();
      edge.id = edgeData.id;
      edge.type = edgeData.type;
      edge.sourceNode = nodes.find(n => n.id === edgeData.sourceNodeId)!;
      edge.targetNode = nodes.find(n => n.id === edgeData.targetNodeId)!;
      edge.sourceAnchorId = edgeData.sourceAnchorId;
      edge.targetAnchorId = edgeData.targetAnchorId;
      edge.startPoint = edgeData.startPoint;
      edge.endPoint = edgeData.endPoint;
      edge.pointsList = edgeData.pointsList;
      edge.workflowGraph = workflowGraph;
      return edge;
    });

    return { workflowGraph, nodes, edges };
  }

  // 数据库实体 -> LogicFlow 数据
  async entitiesToLogicFlow(workflowGraph: WorkflowGraph): Promise<WorkflowGraphSchema> {
    return {
      project: {
        name: workflowGraph.name,
        exportTime: new Date().toISOString(),
        totalNodes: workflowGraph.nodes.count(),
        totalEdges: workflowGraph.edges.count(),
        description: workflowGraph.description
      },
      logicFlowData: {
        nodes: workflowGraph.nodes.getItems().map(node => ({
          id: node.id,
          type: this.getNodeType(node.nodeType),
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          text: {
            x: null,
            y: null,
            value: node.title
          },
          properties: node.config
        })),
        edges: workflowGraph.edges.getItems().map(edge => ({
          id: edge.id,
          type: edge.type,
          sourceNodeId: edge.sourceNode.id,
          targetNodeId: edge.targetNode.id,
          sourceAnchorId: edge.sourceAnchorId,
          targetAnchorId: edge.targetAnchorId,
          startPoint: edge.startPoint,
          endPoint: edge.endPoint,
          pointsList: edge.pointsList
        }))
      }
    };
  }

  private getNodeType(nodeType: string): string {
    const typeMap = {
      'root': 'RootNode',
      'text': 'TextNode',
      'audio': 'AudioNode',
      'video': 'VideoNode',
      'file': 'FileNode'
    };
    return typeMap[nodeType] || 'TextNode';
  }
}
```

---

## 五、功能实现清单

### 5.1 已实现功能（基于 JSON 分析）
- ✅ 工作流图数据结构定义
- ✅ 节点基础类型支持（RootNode、TextNode）
- ✅ 节点属性配置（标题、状态、内容、资源等）
- ✅ 边的连接关系（polyline 折线）
- ✅ 节点位置和尺寸配置
- ✅ 项目元数据管理（名称、描述、统计）

### 5.2 待实现功能
- ⬜ 数据库实体完整定义
- ⬜ 后端 API 完整实现
- ⬜ 前端 LogicFlow 编辑器集成
- ⬜ 自定义节点组件开发（AudioNode、VideoNode、FileNode）
- ⬜ 节点配置面板 UI
- ⬜ 数据导入导出功能
- ⬜ 实时协作功能（WebSocket）
- ⬜ 节点层级关系管理
- ⬜ 工作流图版本控制
- ⬜ AI 数据解析与验证

---

## 六、开发优先级建议

### 6.1 第一阶段：核心功能（P0）
1. 数据库实体定义与迁移
2. 后端 CRUD API 实现
3. 前端 LogicFlow 基础集成
4. 数据转换服务（LogicFlow ↔ 实体）

### 6.2 第二阶段：节点扩展（P1）
1. 自定义节点组件开发
2. 节点配置面板
3. 节点属性编辑
4. 数据导入导出

### 6.3 第三阶段：高级功能（P2）
1. 实时协作
2. 版本控制
3. AI 能力集成
4. 性能优化

---

## 七、技术要点总结

1. **数据双重存储**：同时支持通用格式和 LogicFlow 格式，便于数据交换
2. **节点类型系统**：使用 `nodeType` 和 LogicFlow `type` 双重标识
3. **折线路径**：LogicFlow 自动计算正交路由路径
4. **数据验证**：使用 Zod Schema 确保数据合法性
5. **实体映射**：LogicFlow 数据 ↔ 数据库实体的双向转换
6. **项目隔离**：每个工作流图关联到项目，支持多项目
7. **扩展性**：通过 `properties` 和 `attributes` 支持自定义扩展

---

## 八、后续优化方向

1. **性能优化**：大规模节点的渲染优化
2. **用户体验**：拖拽体验、快捷键、撤销重做
3. **协作功能**：实时同步、冲突解决
4. **AI 集成**：智能节点生成、工作流优化建议
5. **插件系统**：支持自定义节点类型和边类型
