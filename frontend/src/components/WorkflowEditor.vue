<template>
  <div class="workflow-editor">
    <div class="toolbar">
      <h3>工作流图编辑器</h3>
      <div class="tool-buttons">
        <button @click="addNode('text')" class="btn btn-secondary">
          <span class="icon">📝</span> 文本节点
        </button>
        <button @click="addNode('image')" class="btn btn-info">
          <span class="icon">🖼️</span> 图片节点
        </button>
        <button @click="addNode('audio')" class="btn btn-info">
          <span class="icon">🔊</span> 音频节点
        </button>
        <button @click="addNode('video')" class="btn btn-info">
          <span class="icon">🎬</span> 视频节点
        </button>
        <button @click="addNode('file')" class="btn btn-info">
          <span class="icon">📁</span> 文件节点
        </button>
        <button @click="addNode('property')" class="btn btn-info">
          <span class="icon">🏷️</span> 属性节点
        </button>
        <div class="divider"></div>
        <button @click="saveGraph" class="btn btn-info">
          <span class="icon">💾</span> 保存
        </button>
        <button @click="loadGraph" class="btn btn-info">
          <span class="icon">📂</span> 加载
        </button>
        <button @click="downloadJson" class="btn btn-success">
          <span class="icon">⬇️</span> 导出JSON
        </button>
        <button @click="clearGraph" class="btn btn-danger">
          <span class="icon">🗑️</span>清空
        </button>
      </div>
    </div>

    <div class="editor-container">
      <div class="graph-container" @contextmenu.prevent>
        <div
          ref="container"
          class="cytoplasm-container"
          @click="clearSelection"
        >
          <!-- SVG layer for edges -->
          <svg
            class="edge-layer"
            :width="containerSize.width"
            :height="containerSize.height"
          >
            <defs>
              <marker
                id="arrow"
                markerWidth="16"
                markerHeight="16"
                refX="14"
                refY="8"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M1,3 L14,8 L1,13 L4,8 z" fill="#5aa6e6" />
              </marker>
            </defs>
            <path
              v-for="edge in edges"
              :key="edge.id"
              :d="getEdgePath(edge.source, edge.target)"
              stroke="#5aa6e6"
              stroke-width="3"
              fill="none"
              marker-end="url(#arrow)"
            />
          </svg>

          <!-- Node overlays -->
          <div class="node-overlay-layer">
            <div
              v-for="node in nodes"
              :key="node.id"
              class="node-overlay"
              :id="'node_' + node.id"
              :class="`node-${node.type}`"
              :style="getNodeStyle(node)"
              v-resize="(w, h) => updateNodeSize(node, w, h)"
              @mousedown.stop="startDrag(node.id, $event)"
              @contextmenu.prevent.stop="openContext($event, node.id)"
            >
              <div v-if="node.type === 'root'" class="node-card node-card-root">
                <div class="node-root-label">
                  {{ formatRootTitle(node.title) }}
                </div>
              </div>

              <div v-else class="node-card">
                <div class="node-card-header">
                  <input
                    class="node-title-input"
                    v-model="node.title"
                    placeholder="节点标题"
                  />
                  <div class="node-header-actions">
                    <select class="node-status-select" v-model="node.status">
                      <option value="pending">⏳ 待执行</option>
                      <option value="running">🏃 执行中</option>
                      <option value="completed">✅ 已完成</option>
                      <option value="failed">❌ 执行失败</option>
                    </select>
                    <select
                      class="node-type-select"
                      v-model="node.type"
                      @change="updateNodeType(node)"
                    >
                      <option value="text">文本(Text)</option>
                      <option value="property">属性(Property)</option>
                      <option value="image">图片(Image)</option>
                      <option value="video">视频(Video)</option>
                      <option value="audio">音频(Audio)</option>
                      <option value="file">文件资源(File)</option>
                    </select>
                  </div>
                </div>

                <div class="node-card-body">
                  <textarea
                    v-if="node.type !== 'property'"
                    class="node-textarea"
                    v-model="node.config.textContent"
                    maxlength="2000"
                    placeholder="请输入提示词或描述..."
                  ></textarea>
                  <div v-if="node.type !== 'property'" class="node-text-count">
                    {{ (node.config.textContent || '').length }} / 2000
                  </div>

                  <div v-if="node.type === 'file'" class="additional-input">
                    <input
                      type="text"
                      class="node-file-input"
                      v-model="node.config.resourceUrl"
                      placeholder="关联文件路径..."
                    />
                  </div>

                  <div
                    v-if="node.type === 'property'"
                    class="property-list-container"
                  >
                    <div class="property-list">
                      <div
                        v-for="(prop, index) in node.config.properties"
                        :key="index"
                        class="property-row"
                      >
                        <input
                          v-model="prop.key"
                          class="prop-input prop-key"
                          placeholder="属性名"
                        />
                        <input
                          v-model="prop.value"
                          class="prop-input prop-val"
                          placeholder="属性值"
                        />
                        <button
                          class="remove-prop-btn"
                          @click="removeProperty(node, index)"
                        >
                          ✖
                        </button>
                      </div>
                    </div>
                    <button class="add-prop-btn" @click="addProperty(node)">
                      + 添加属性
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="contextMenu.visible"
          class="context-menu"
          :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
        >
          <div class="context-menu-group">添加子节点</div>
          <button class="context-menu-item" @click="handleContextAdd('text')">
            增加文本节点
          </button>
          <button
            class="context-menu-item"
            @click="handleContextAdd('property')"
          >
            增加属性节点
          </button>
          <button class="context-menu-item" @click="handleContextAdd('file')">
            增加文件节点
          </button>
          <button class="context-menu-item" @click="handleContextAdd('image')">
            增加图片节点
          </button>
          <button class="context-menu-item" @click="handleContextAdd('video')">
            增加视频节点
          </button>
          <button class="context-menu-item" @click="handleContextAdd('audio')">
            增加音频节点
          </button>

          <div class="context-menu-divider"></div>
          <div class="context-menu-group">连线操作</div>
          <button class="context-menu-item" @click="setConnectionSource">
            设为连线起点
          </button>
          <button
            v-if="
              connectingSourceId && connectingSourceId !== contextMenu.nodeId
            "
            class="context-menu-item highlight-item"
            @click="connectFromSource"
          >
            🔌 连接至此节点
          </button>
          <button class="context-menu-item" @click="removeIncomingEdges">
            删除所有输入连线
          </button>
          <button class="context-menu-item" @click="removeOutgoingEdges">
            删除所有输出连线
          </button>

          <div class="context-menu-divider"></div>
          <button class="context-menu-item danger" @click="handleContextDelete">
            删除当前节点
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue';

type NodeType =
  | 'root'
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'property';
type NodeStatus = 'pending' | 'running' | 'completed' | 'failed';

interface NodeConfig {
  typeKey?: NodeType;
  textContent?: string;
  resourceName?: string;
  resourceUrl?: string;
  properties?: { key: string; value: string }[];
}

interface NodeItem {
  id: string;
  title: string;
  type: NodeType;
  status: NodeStatus;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  config: NodeConfig;
}

interface EdgeItem {
  id: string;
  source: string;
  target: string;
}

const props = defineProps<{
  workflowData?: any | null;
  projectName?: string;
}>();

const emit = defineEmits<{
  (e: 'save', payload: { elements: unknown[]; timestamp: string }): void;
}>();

const container = ref<HTMLDivElement | null>(null);
const containerSize = ref({ width: 1200, height: 800 });
const nodes = ref<NodeItem[]>([]);
const edges = ref<EdgeItem[]>([]);

const generateUniqueId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
};

const dragging = reactive({ id: '', offsetX: 0, offsetY: 0, active: false });
const contextMenu = reactive({ visible: false, x: 0, y: 0, nodeId: '' });

const connectingSourceId = ref<string>('');

const vResize = {
  mounted(el: HTMLElement, binding: any) {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const target = entry?.target as HTMLElement;
      binding.value(target.offsetWidth, target.offsetHeight);
    });
    observer.observe(el);
    (el as any)._resizeObserver = observer;
  },
  unmounted(el: HTMLElement) {
    if ((el as any)._resizeObserver) {
      (el as any)._resizeObserver.disconnect();
    }
  },
};

const updateNodeSize = (node: NodeItem, w: number, h: number) => {
  if (Math.abs(node.width - w) > 2 || Math.abs(node.height - h) > 2) {
    node.width = w;
    node.height = h;
  }
};

const getNodeSize = (type: NodeType) => {
  switch (type) {
    case 'root':
      return { width: 180, height: 70 };
    case 'property':
      return { width: 440, height: 260 };
    case 'text':
    case 'file':
    case 'image':
    case 'video':
    case 'audio':
      return { width: 420, height: 260 };
    default:
      return { width: 420, height: 260 };
  }
};

const formatRootTitle = (title: string) => (title || '项目').toUpperCase();

const ensureRoot = () => {
  if (nodes.value.find((n) => n.type === 'root')) return;
  const size = getNodeSize('root');
  nodes.value.push({
    id: 'node_root',
    title: props.projectName || '项目',
    type: 'root',
    status: 'pending',
    x: 200,
    y: 120,
    width: size.width,
    height: size.height,
    zIndex: 10,
    config: { typeKey: 'root' },
  });
};

const updateContainerSize = () => {
  if (!container.value) return;
  const r = container.value.getBoundingClientRect();
  containerSize.value.width = Math.max(r.width, 1);
  containerSize.value.height = Math.max(r.height, 1);
};

onMounted(() => {
  updateContainerSize();
  window.addEventListener('resize', updateContainerSize);
  ensureRoot();
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('click', () => {
    contextMenu.visible = false;
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateContainerSize);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
});

watch(
  () => props.workflowData,
  (value) => {
    if (!value || !Array.isArray(value.elements)) return;
    nodes.value = [];
    edges.value = [];
    value.elements.forEach((el: any) => {
      if (el.group === 'nodes') {
        const pos = el.position || { x: 100, y: 100 };
        const type: NodeType = el.data?.type || 'text';
        const size = getNodeSize(type);
        nodes.value.push({
          id: el.data?.id || generateUniqueId('node'),
          title: el.data?.title || el.data?.name || '节点',
          type,
          status: el.data?.status || 'pending',
          x: pos.x,
          y: pos.y,
          width: size.width,
          height: size.height,
          zIndex: 10,
          config: el.data?.config || {},
        });
      }
      if (el.group === 'edges') {
        edges.value.push({
          id: el.data?.id || generateUniqueId('edge'),
          source: el.data?.source,
          target: el.data?.target,
        });
      }
    });
    ensureRoot();
  },
  { immediate: true },
);

const getNodeById = (id: string) => nodes.value.find((n) => n.id === id);

const getEdgePath = (sourceId: string, targetId: string) => {
  const sourceNode = getNodeById(sourceId);
  const targetNode = getNodeById(targetId);
  if (!sourceNode || !targetNode) return '';

  const x1 = sourceNode.x;
  const y1 = sourceNode.y;
  const x2 = targetNode.x;
  const y2 = targetNode.y;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return '';

  const tw = targetNode.width / 2 + 8; // padding for arrow marker visibility
  const th = targetNode.height / 2 + 8;
  const txScale = dx !== 0 ? Math.abs(tw / dx) : Infinity;
  const tyScale = dy !== 0 ? Math.abs(th / dy) : Infinity;
  const tScale = Math.min(txScale, tyScale, 1);

  const tx = x2 - dx * tScale;
  const ty = y2 - dy * tScale;

  const sw = sourceNode.width / 2;
  const sh = sourceNode.height / 2;
  const sxScale = dx !== 0 ? Math.abs(sw / dx) : Infinity;
  const syScale = dy !== 0 ? Math.abs(sh / dy) : Infinity;
  const sScale = Math.min(sxScale, syScale, 1);

  const sx = x1 + dx * sScale;
  const sy = y1 + dy * sScale;

  return `M ${sx},${sy} L ${tx},${ty}`;
};

const getNodeStyle = (node: NodeItem) => {
  const isProp = node.type === 'property';
  const isRoot = node.type === 'root';
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
    transform: 'translate(-50%, -50%)',
    width: isProp ? 'fit-content' : isRoot ? '180px' : '420px',
    height: isProp ? 'fit-content' : isRoot ? '70px' : '260px',
    minWidth: isProp ? '440px' : 'auto',
    minHeight: isProp ? '260px' : 'auto',
    zIndex: node.zIndex || 10,
  };
};

const startDrag = (id: string, e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const tagName = target.tagName;

  if (
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    tagName === 'INPUT' ||
    tagName === 'BUTTON' ||
    target.closest('.prop-input')
  ) {
    return;
  }

  e.preventDefault();

  const n = getNodeById(id);
  if (!n || !container.value) return;
  const rect = container.value.getBoundingClientRect();
  dragging.id = id;
  dragging.active = true;
  dragging.offsetX = e.clientX - rect.left - n.x;
  dragging.offsetY = e.clientY - rect.top - n.y;

  // Bring to front
  nodes.value.forEach((node) => {
    node.zIndex = node.id === id ? 20 : 10;
  });
};

const onMouseMove = (e: MouseEvent) => {
  if (!dragging.active) return;
  const n = getNodeById(dragging.id);
  if (!n || !container.value) return;
  const rect = container.value.getBoundingClientRect();
  n.x = e.clientX - rect.left - dragging.offsetX;
  n.y = e.clientY - rect.top - dragging.offsetY;
};

const onMouseUp = () => {
  dragging.active = false;
  dragging.id = '';
};

const addNode = (
  type: NodeType,
  position?: { x: number; y: number },
  parentId?: string,
) => {
  const id = generateUniqueId('node');
  const size = getNodeSize(type);
  const pos = position ?? {
    x: 150 + Math.random() * 300,
    y: 150 + Math.random() * 300,
  };
  nodes.value.push({
    id,
    title: `${type.toUpperCase()} ${id}`,
    type,
    status: 'pending',
    x: pos.x,
    y: pos.y,
    width: size.width,
    height: size.height,
    zIndex: 10,
    config: getDefaultConfig(type) as any,
  });
  if (parentId) createEdge(parentId, id);
};

const addProperty = (node: NodeItem) => {
  if (!node.config.properties) {
    node.config.properties = [];
  }
  node.config.properties.push({ key: '', value: '' });
};

const removeProperty = (node: NodeItem, index: number) => {
  if (node.config.properties) {
    node.config.properties.splice(index, 1);
  }
};

const createEdge = (source: string, target: string) => {
  if (edges.value.find((e) => e.source === source && e.target === target))
    return;
  edges.value.push({ id: generateUniqueId('edge'), source, target });
};

const getDefaultConfig = (type: NodeType) => {
  switch (type) {
    case 'text':
      return { typeKey: 'text', textContent: '' };
    case 'property':
      return {
        typeKey: 'property',
        textContent: '',
        properties: [{ key: '', value: '' }],
      };
    case 'image':
      return { typeKey: 'image', resourceName: '', resourceUrl: '' };
    case 'video':
      return { typeKey: 'video', resourceName: '', resourceUrl: '' };
    case 'audio':
      return { typeKey: 'audio', resourceName: '', resourceUrl: '' };
    default:
      return { typeKey: type };
  }
};

const handleContextAdd = (type: NodeType) => {
  if (!contextMenu.nodeId) return;
  const parent = contextMenu.nodeId;
  addNode(type, undefined, parent);
  contextMenu.visible = false;
};

const handleContextDelete = () => {
  if (!contextMenu.nodeId) return;
  const id = contextMenu.nodeId;
  const n = getNodeById(id);
  if (!n) return;
  if (n.type === 'root') {
    alert('根节点不可删除');
    contextMenu.visible = false;
    return;
  }
  nodes.value = nodes.value.filter((i) => i.id !== id);
  edges.value = edges.value.filter((e) => e.source !== id && e.target !== id);
  contextMenu.visible = false;
};

const setConnectionSource = () => {
  if (!contextMenu.nodeId) return;
  connectingSourceId.value = contextMenu.nodeId;
  contextMenu.visible = false;
};

const connectFromSource = () => {
  if (!connectingSourceId.value || !contextMenu.nodeId) return;
  createEdge(connectingSourceId.value, contextMenu.nodeId);
  connectingSourceId.value = '';
  contextMenu.visible = false;
};

const removeIncomingEdges = () => {
  if (!contextMenu.nodeId) return;
  edges.value = edges.value.filter((e) => e.target !== contextMenu.nodeId);
  contextMenu.visible = false;
};

const removeOutgoingEdges = () => {
  if (!contextMenu.nodeId) return;
  edges.value = edges.value.filter((e) => e.source !== contextMenu.nodeId);
  contextMenu.visible = false;
};

const openContext = (e: MouseEvent, nodeId: string) => {
  if (container.value && container.value.parentElement) {
    const rect = container.value.parentElement.getBoundingClientRect();
    contextMenu.x = e.clientX - rect.left;
    contextMenu.y = e.clientY - rect.top;
  } else {
    contextMenu.x = e.clientX;
    contextMenu.y = e.clientY;
  }
  contextMenu.visible = true;
  contextMenu.nodeId = nodeId;
};

const clearSelection = () => {
  contextMenu.visible = false;
};

const saveGraph = () => {
  const elements: any[] = [];
  nodes.value.forEach((n) =>
    elements.push({
      group: 'nodes',
      data: {
        id: n.id,
        name: n.title,
        title: n.title,
        type: n.type,
        status: n.status,
        config: n.config,
      },
      position: { x: n.x, y: n.y },
    }),
  );
  edges.value.forEach((e) =>
    elements.push({
      group: 'edges',
      data: { id: e.id, source: e.source, target: e.target },
    }),
  );
  emit('save', { elements, timestamp: new Date().toISOString() });
};

const updateNodeType = (node: NodeItem) => {
  const size = getNodeSize(node.type);
  node.width = size.width;
  node.height = size.height;
  node.config = getDefaultConfig(node.type) as any;
};

const loadGraph = () => {
  // watcher will handle reloading from props.workflowData
};

const downloadJson = () => {
  if (nodes.value.length === 0) return;

  // Build a map for easy lookup
  const nodeMap = new Map();
  nodes.value.forEach((n) => nodeMap.set(n.id, n));

  // Determine root nodes (nodes with no incoming edges or strictly type 'root')
  const rootNode = nodes.value.find((n) => n.type === 'root');

  const structNodes = nodes.value.map((n) => {
    const incomingEdges = edges.value.filter((e) => e.target === n.id);
    const parentId = incomingEdges.length > 0 ? incomingEdges[0].source : null;
    const outgoing = edges.value
      .filter((e) => e.source === n.id)
      .map((e) => e.target);
    const contentText = n.config.textContent || '';
    const fileUrl = n.config.resourceUrl || '';

    return {
      id: n.id,
      title: n.title,
      type: n.type,
      status: n.status,
      description: contentText,
      fileResource: fileUrl,
      properties: n.config.properties || [],
      dependsOn: parentId,
      nextNodes: outgoing,
      metadata: {
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
      },
    };
  });

  // Extract separate workflow pipelines (paths originating from root)
  const pipelines: any[] = [];
  if (rootNode) {
    const rootEdges = edges.value.filter((e) => e.source === rootNode.id);
    rootEdges.forEach((e) => {
      // Each outgoing edge from root is a top-level feature pipeline
      const targetNode = nodeMap.get(e.target);
      if (targetNode) {
        pipelines.push({
          pipelineStartId: e.target,
          featureName: targetNode.title,
          description: targetNode.config?.textContent || '',
        });
      }
    });
  }

  const exportData = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    project: {
      name: props.projectName || 'Workflow Project',
      exportTime: new Date().toISOString(),
      totalNodes: nodes.value.length,
      totalEdges: edges.value.length,
      description: '工作流自动化与项目拆解图谱',
    },
    pipelines: pipelines,
    nodes: structNodes,
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${props.projectName || 'workflow'}_schema.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const clearGraph = () => {
  if (!confirm('确定要清空所有节点吗？')) return;
  nodes.value = [];
  edges.value = [];
  ensureRoot();
};
</script>

<style scoped>
.workflow-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.toolbar {
  background: #fff;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar h3 {
  margin: 0;
  color: #333;
}

.tool-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-primary {
  background: #667eea;
  color: white;
}
.btn-secondary {
  background: #2196f3;
  color: white;
}
.btn-warning {
  background: #ff9800;
  color: white;
}
.btn-success {
  background: #4caf50;
  color: white;
}
.btn-info {
  background: #00bcd4;
  color: white;
}
.btn-danger {
  background: #f44336;
  color: white;
}

.btn-block {
  width: 100%;
  justify-content: center;
}

.icon {
  font-size: 1.1rem;
}

.divider {
  width: 1px;
  height: 24px;
  background: #ddd;
  margin: 0 0.5rem;
}

.editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 600px;
  width: 100%;
  max-width: 100%;
}

.graph-container {
  flex: 1;
  position: relative;
  min-height: 600px;
  width: 100%;
  max-width: 100%;
}

.cytoplasm-container {
  width: 100%;
  height: 100%;
  background: #fafafa;
  border: 2px solid #ddd;
  border-radius: 4px;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
  min-height: 600px;
}

.edge-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.node-overlay-layer {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.node-overlay {
  position: absolute;
  pointer-events: auto;
}

.node-overlay,
.node-card {
  box-sizing: border-box;
}

.node-card {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: #ffffff;
  border: 2px solid #2e73b2;
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.node-card-header {
  background: linear-gradient(180deg, #5aa6e6 0%, #2f7bbd 100%);
  color: #fff;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.node-title-input {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  flex: 1;
  margin-right: 8px;
  outline: none;
}
.node-title-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.node-header-actions {
  display: flex;
  gap: 4px;
}

.node-type-select,
.node-status-select {
  background: #ffffff;
  border: 1px solid #c9d7ea;
  border-radius: 6px;
  padding: 4px;
  font-size: 11px;
  color: #2c3e50;
  width: auto;
  min-width: 60px;
}

.node-card-body {
  flex: 1;
  padding: 10px;
  background: #f9fbfd;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-textarea {
  flex: 1;
  border: 1px solid #cfd8e3;
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  resize: none;
  background: #ffffff;
  color: #2c3e50;
}

.node-text-count {
  text-align: right;
  font-size: 11px;
  color: #7b8794;
}

.additional-input {
  margin-top: 4px;
}
.node-file-input {
  width: 100%;
  border: 1px solid #d4deea;
  border-radius: 6px;
  padding: 6px;
  font-size: 12px;
  background: #ffffff;
  color: #2c3e50;
  box-sizing: border-box;
}

.property-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.property-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 8px;
}

.property-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
  align-items: center;
}

.prop-input {
  flex: 1;
  border: 1px solid #cfd8e3;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 11px;
  min-width: 0;
}

.prop-key {
  flex: 0.8;
  font-weight: 500;
}

.remove-prop-btn {
  background: transparent;
  border: none;
  color: #f44336;
  cursor: pointer;
  padding: 0 4px;
  font-size: 12px;
}

.add-prop-btn {
  background: #e9f0f7;
  border: 1px dashed #b1c5d8;
  color: #2e73b2;
  border-radius: 4px;
  padding: 4px;
  font-size: 11px;
  cursor: pointer;
  text-align: center;
  width: 100%;
}
.add-prop-btn:hover {
  background: #dfe8f2;
}

.node-media-body {
  align-items: center;
  justify-content: center;
}

.node-media-icon {
  width: 70px;
  height: 55px;
  border-radius: 12px;
  border: 2px solid #cfd8e3;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #6b7c93;
  background: #ffffff;
}

.node-card-root {
  background: linear-gradient(180deg, #1f5d98 0%, #0e3f6f 100%);
  border-radius: 14px;
  border: 2px solid #0b3c66;
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.node-root-label {
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
}

.context-menu {
  position: absolute;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 30;
  min-width: 140px;
}

.context-menu-item {
  border: none;
  background: transparent;
  padding: 0.6rem 0.9rem;
  text-align: left;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
}

.context-menu-item:hover {
  background: rgba(102, 126, 234, 0.08);
}
.context-menu-item.danger {
  color: #f44336;
}
.context-menu-divider {
  height: 1px;
  background: #eee;
  margin: 4px 0;
}
.context-menu-group {
  font-size: 0.75rem;
  color: #999;
  padding: 4px 14px;
  text-transform: uppercase;
}
.highlight-item {
  color: #2196f3;
  font-weight: bold;
}
</style>
