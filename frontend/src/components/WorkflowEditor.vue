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
        <div class="divider"></div>
        <button @click="saveGraph" class="btn btn-info">
          <span class="icon">💾</span> 保存
        </button>
        <button @click="loadGraph" class="btn btn-info">
          <span class="icon">📂</span> 加载
        </button>
        <button @click="clearGraph" class="btn btn-danger">
          <span class="icon">🗑️</span>清空
        </button>
      </div>
    </div>

    <div class="editor-container">
      <div class="graph-container" @contextmenu.prevent>
        <div ref="container" class="cytoplasm-container" @click="clearSelection">
          <!-- SVG layer for edges -->
          <svg class="edge-layer" :width="containerSize.width" :height="containerSize.height">
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="#667eea" />
              </marker>
            </defs>
            <line
              v-for="edge in edges"
              :key="edge.id"
              :x1="getNodeCenter(edge.source).x"
              :y1="getNodeCenter(edge.source).y"
              :x2="getNodeCenter(edge.target).x"
              :y2="getNodeCenter(edge.target).y"
              stroke="#667eea"
              stroke-width="3"
              marker-end="url(#arrow)"
            />
          </svg>

          <!-- Node overlays -->
          <div class="node-overlay-layer">
            <div
              v-for="node in nodes"
              :key="node.id"
              class="node-overlay"
              :class="`node-${node.type}`"
              :style="getNodeStyle(node)"
              @mousedown.stop.prevent="startDrag(node.id, $event)"
              @contextmenu.prevent.stop="openContext($event, node.id)"
            >
              <div v-if="node.type === 'root'" class="node-card node-card-root">
                <div class="node-root-label">{{ formatRootTitle(node.title) }}</div>
              </div>

              <div v-else class="node-card">
                <div class="node-card-header">
                  <span class="node-card-title">{{ getNodeHeaderTitle(node.type) }}</span>
                  <select class="node-type-select" v-model="node.type" @change.stop="updateNodeType(node)">
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>

                <div v-if="node.type === 'text'" class="node-card-body">
                  <textarea class="node-textarea" v-model="node.config.textContent" maxlength="2000"></textarea>
                  <div class="node-text-count">{{ (node.config.textContent || '').length }} / 2000</div>
                </div>

                <div v-else class="node-card-body node-media-body">
                  <div class="node-media-icon">
                    <span v-if="node.type === 'image'">🖼️</span>
                    <span v-else-if="node.type === 'video'">▶️</span>
                    <span v-else>🔊</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="contextMenu.visible" class="context-menu" :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }">
          <button class="context-menu-item" @click="handleContextAdd('text')">增加文本子节点</button>
          <button class="context-menu-item" @click="handleContextAdd('image')">增加图片子节点</button>
          <button class="context-menu-item" @click="handleContextAdd('video')">增加视频子节点</button>
          <button class="context-menu-item" @click="handleContextAdd('audio')">增加音频子节点</button>
          <button class="context-menu-item danger" @click="handleContextDelete">删除节点</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'

type NodeType = 'root' | 'text' | 'image' | 'video' | 'audio'

interface NodeConfig {
  typeKey?: NodeType
  textContent?: string
  resourceName?: string
  resourceUrl?: string
}

interface NodeItem {
  id: string
  title: string
  type: NodeType
  x: number
  y: number
  width: number
  height: number
  config: NodeConfig
}

interface EdgeItem {
  id: string
  source: string
  target: string
}

const props = defineProps<{
  workflowData?: any | null
  projectName?: string
}>()

const emit = defineEmits<{
  (e: 'save', payload: { elements: unknown[]; timestamp: string }): void
}>()

const container = ref<HTMLDivElement | null>(null)
const containerSize = ref({ width: 1200, height: 800 })
const nodes = ref<NodeItem[]>([])
const edges = ref<EdgeItem[]>([])
let nodeCounter = 1
let edgeCounter = 1

const dragging = reactive({ id: '', offsetX: 0, offsetY: 0, active: false })
const contextMenu = reactive({ visible: false, x: 0, y: 0, nodeId: '' })

const getNodeSize = (type: NodeType) => {
  switch (type) {
    case 'root': return { width: 180, height: 70 }
    case 'text': return { width: 280, height: 210 }
    default: return { width: 160, height: 120 }
  }
}

const formatRootTitle = (title: string) => (title || '项目').toUpperCase()
const getNodeHeaderTitle = (type: NodeType) => ({ text: 'TEXT NODE', image: 'IMAGE NODE', video: 'VIDEO NODE', audio: 'AUDIO NODE' } as any)[type] || 'NODE'

const ensureRoot = () => {
  if (nodes.value.find(n => n.type === 'root')) return
  const size = getNodeSize('root')
  nodes.value.push({ id: 'node_root', title: props.projectName || '项目', type: 'root', x: 200, y: 120, width: size.width, height: size.height, config: { typeKey: 'root' } })
}

const updateContainerSize = () => {
  if (!container.value) return
  const r = container.value.getBoundingClientRect()
  containerSize.value.width = Math.max(r.width, 1)
  containerSize.value.height = Math.max(r.height, 1)
}

onMounted(() => {
  updateContainerSize()
  window.addEventListener('resize', updateContainerSize)
  ensureRoot()
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('click', () => { contextMenu.visible = false })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateContainerSize)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})

watch(() => props.workflowData, (value) => {
  if (!value || !Array.isArray(value.elements)) return
  nodes.value = []
  edges.value = []
  value.elements.forEach((el: any) => {
    if (el.group === 'nodes') {
      const pos = el.position || { x: 100, y: 100 }
      const type: NodeType = el.data?.type || 'text'
      const size = getNodeSize(type)
      nodes.value.push({ id: el.data?.id || `node_${nodeCounter++}`, title: el.data?.title || el.data?.name || '节点', type, x: pos.x, y: pos.y, width: size.width, height: size.height, config: el.data?.config || {} })
    }
    if (el.group === 'edges') {
      edges.value.push({ id: el.data?.id || `edge_${edgeCounter++}`, source: el.data?.source, target: el.data?.target })
    }
  })
  ensureRoot()
}, { immediate: true })

const getNodeById = (id: string) => nodes.value.find(n => n.id === id)

const getNodeCenter = (id: string) => {
  const n = getNodeById(id)
  if (!n) return { x: 0, y: 0 }
  return { x: n.x, y: n.y }
}

const getNodeStyle = (node: NodeItem) => ({
  width: `${node.width}px`,
  height: `${node.height}px`,
  left: `${node.x}px`,
  top: `${node.y}px`,
  transform: 'translate(-50%, -50%)'
})

const startDrag = (id: string, e: MouseEvent) => {
  const n = getNodeById(id)
  if (!n || !container.value) return
  const rect = container.value.getBoundingClientRect()
  dragging.id = id
  dragging.active = true
  dragging.offsetX = e.clientX - rect.left - n.x
  dragging.offsetY = e.clientY - rect.top - n.y
}

const onMouseMove = (e: MouseEvent) => {
  if (!dragging.active) return
  const n = getNodeById(dragging.id)
  if (!n || !container.value) return
  const rect = container.value.getBoundingClientRect()
  n.x = e.clientX - rect.left - dragging.offsetX
  n.y = e.clientY - rect.top - dragging.offsetY
}

const onMouseUp = () => {
  dragging.active = false
  dragging.id = ''
}

const addNode = (type: NodeType, position?: { x: number; y: number }, parentId?: string) => {
  const id = `node_${nodeCounter++}`
  const size = getNodeSize(type)
  const pos = position ?? { x: 150 + Math.random() * 300, y: 150 + Math.random() * 300 }
  nodes.value.push({ id, title: `${type.toUpperCase()} ${id}`, type, x: pos.x, y: pos.y, width: size.width, height: size.height, config: getDefaultConfig(type) as any })
  if (parentId) createEdge(parentId, id)
}

const createEdge = (source: string, target: string) => {
  if (edges.value.find(e => e.source === source && e.target === target)) return
  edges.value.push({ id: `edge_${edgeCounter++}`, source, target })
}

const getDefaultConfig = (type: NodeType) => {
  switch (type) {
    case 'text': return { typeKey: 'text', textContent: '' }
    case 'image': return { typeKey: 'image', resourceName: '', resourceUrl: '' }
    case 'video': return { typeKey: 'video', resourceName: '', resourceUrl: '' }
    case 'audio': return { typeKey: 'audio', resourceName: '', resourceUrl: '' }
    default: return { typeKey: type }
  }
}

const handleContextAdd = (type: NodeType) => {
  if (!contextMenu.nodeId) return
  const parent = contextMenu.nodeId
  addNode(type, undefined, parent)
  contextMenu.visible = false
}

const handleContextDelete = () => {
  if (!contextMenu.nodeId) return
  const id = contextMenu.nodeId
  const n = getNodeById(id)
  if (!n) return
  if (n.type === 'root') { alert('根节点不可删除'); contextMenu.visible = false; return }
  nodes.value = nodes.value.filter(i => i.id !== id)
  edges.value = edges.value.filter(e => e.source !== id && e.target !== id)
  contextMenu.visible = false
}

const openContext = (e: MouseEvent, nodeId: string) => {
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.visible = true
  contextMenu.nodeId = nodeId
}

const clearSelection = () => { contextMenu.visible = false }

const saveGraph = () => {
  const elements: any[] = []
  nodes.value.forEach(n => elements.push({ group: 'nodes', data: { id: n.id, name: n.title, title: n.title, type: n.type, status: 'pending', config: n.config }, position: { x: n.x, y: n.y } }))
  edges.value.forEach(e => elements.push({ group: 'edges', data: { id: e.id, source: e.source, target: e.target } }))
  emit('save', { elements, timestamp: new Date().toISOString() })
}

const updateNodeType = (node: NodeItem) => {
  const size = getNodeSize(node.type)
  node.width = size.width; node.height = size.height
    node.config = getDefaultConfig(node.type) as any;
}

const loadGraph = () => {
  // watcher will handle reloading from props.workflowData
}

const clearGraph = () => {
  if (!confirm('确定要清空所有节点吗？')) return
  nodes.value = []
  edges.value = []
  nodeCounter = 1
  edgeCounter = 1
  ensureRoot()
}
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.btn-primary { background: #667eea; color: white; }
.btn-secondary { background: #2196F3; color: white; }
.btn-warning { background: #FF9800; color: white; }
.btn-success { background: #4CAF50; color: white; }
.btn-info { background: #00bcd4; color: white; }
.btn-danger { background: #f44336; color: white; }

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

.node-card-title {
  letter-spacing: 0.4px;
}

.node-type-select {
  background: #ffffff;
  border: 1px solid #c9d7ea;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 12px;
  color: #2c3e50;
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

.context-menu-item:hover { background: rgba(102,126,234,0.08); }
.context-menu-item.danger { color: #f44336 }

</style>
