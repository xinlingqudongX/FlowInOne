<template>
  <div class="workflow-editor">
    <div class="toolbar">
      <h3>工作流图编辑器</h3>
      <div class="tool-buttons">
        <button @click="addNode('start')" class="btn btn-primary">
          <span class="icon">▶️</span> 开始节点
        </button>
        <button @click="addNode('task')" class="btn btn-secondary">
          <span class="icon">⚙️</span> 任务节点
        </button>
        <button @click="addNode('decision')" class="btn btn-warning">
          <span class="icon">❓</span>决节点
        </button>
        <button @click="addNode('end')" class="btn btn-success">
          <span class="icon">⏹️</span> 结束节点
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
      <div class="graph-container">
        <div ref="cyContainer" class="cytoscape-container"></div>
      </div>
      
      <div class="property-panel" v-if="selectedNode">
        <h4>节点属性</h4>
        <div class="property-group">
          <label>节点ID:</label>
          <input v-model="selectedNode.data.id" readonly />
        </div>
        <div class="property-group">
          <label>节点名称:</label>
          <input v-model="selectedNode.data.name" @input="updateNode" />
        </div>
        <div class="property-group">
          <label>节点类型:</label>
          <select v-model="selectedNode.data.type" @change="updateNode">
            <option value="start">开始</option>
            <option value="task">任务</option>
            <option value="decision">决策</option>
            <option value="end">结束</option>
          </select>
        </div>
        <div class="property-group" v-if="selectedNode.data.type === 'task'">
          <label>任务描述:</label>
          <textarea v-model="selectedNode.data.description" @input="updateNode"></textarea>
        </div>
        <div class="property-group">
          <label>状态:</label>
          <select v-model="selectedNode.data.status" @change="updateNode">
            <option value="pending">待处理</option>
            <option value="running">运行中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
          </select>
        </div>
        <button @click="deleteNode" class="btn btn-danger btn-block">
          <span class="icon">❌</span> 删除节点
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import cytoscape from 'cytoscape'

// 类型定义
interface NodeData {
  id: string
  name: string
  type: 'start' | 'task' | 'decision' | 'end'
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  [key: string]: any
}

// interface EdgeData {  //未使用
//   id: string
//   source: string
//   target: string
//   [key: string]: any
// }

//响应式数据
const cyContainer = ref<HTMLDivElement>()
const selectedNode = ref<{ data: NodeData } | null>(null)
let cy: cytoscape.Core | null = null
let nodeIdCounter = 1

// 初始化Cytoscape
const initCytoscape = () => {
  if (!cyContainer.value) return
  
  cy = cytoscape({
    container: cyContainer.value,
    elements: [],
    style: [
      {
        selector: 'node',
        style: {
          'width': 80,
          'height': 80,
          'background-color': '#667eea',
          'label': 'data(name)',
          'color': '#fff',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': 12,
          'font-weight': 'bold',
          'text-wrap': 'wrap',
          'text-max-width': '70px'
        }
      },
      {
        selector: 'node[type = "start"]',
        style: {
          'shape': 'ellipse',
          'background-color': '#4CAF50'
        }
      },
      {
        selector: 'node[type = "task"]',
        style: {
          'shape': 'rectangle',
          'background-color': '#2196F3'
        }
      },
      {
        selector: 'node[type = "decision"]',
        style: {
          'shape': 'diamond',
          'background-color': '#FF9800',
          'width': 70,
          'height': 70
        }
      },
      {
        selector: 'node[type = "end"]',
        style: {
          'shape': 'ellipse',
          'background-color': '#f44336'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': 3,
          'border-color': '#FFD700',
          'border-style': 'solid'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#667eea',
          'target-arrow-color': '#667eea',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'width': 4,
          'line-color': '#FFD700',
          'target-arrow-color': '#FFD700'
        }
      }
    ],
    layout: {
      name: 'preset'
    }
  })

  // 事件绑定
  setupEventListeners()
}

// 设置事件监听器
const setupEventListeners = () => {
  if (!cy) return

  //点击事件
  cy.on('tap', 'node', (event) => {
    const node = event.target
    selectedNode.value = {
      data: node.data() as NodeData
    }
  })

  // 图空白处点击，取消选择
  cy.on('tap', (event) => {
    if (event.target === cy) {
      selectedNode.value = null
    }
  })

  //拖节点事件
  cy.on('drag', 'node', (event) => {
    const node = event.target
    //拖节点时动态监控信息
    // note: not used in this snapshot line
    //头 222: const newPos = node.position()

    // 更新节点属性面板的位置信息
    if (selectedNode.value && selectedNode.value.data.id === node.id()) {
      //这里可以更新节点的额外位置信息
    }
  })
}

// 添加节点方法
const addNode = (type: 'start' | 'task' | 'decision' | 'end') => {
  if (!cy) return

  const nodeId = `node_${nodeIdCounter++}`
  const nodeName = type === 'start' ? '开始' : 
                  type === 'task' ? '任务' : 
                  type === 'decision' ? '决策' : '结束'
  
  const nodeData: NodeData = {
    id: nodeId,
    name: `${nodeName} ${nodeIdCounter - 1}`,
    type: type,
    status: 'pending'
  }

  if (type === 'task') {
    nodeData.description = '请输入任务描述'
  }

  cy.add({
    group: 'nodes',
    data: nodeData,
    position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 300 }
  })

  // 自动选择新添加的节点
  selectedNode.value = { data: nodeData }
}

// 更新节点属性
const updateNode = () => {
  if (!cy || !selectedNode.value) return
  
  const node = cy.getElementById(selectedNode.value.data.id)
  if (node) {
    node.data(selectedNode.value.data)
  }
}

// 删除节点
const deleteNode = () => {
  if (!cy || !selectedNode.value) return
  
  const node = cy.getElementById(selectedNode.value.data.id)
  if (node) {
    node.remove()
    selectedNode.value = null
  }
}

// 保存图
const saveGraph = () => {
  if (!cy) return
  
  const elements = cy.elements().jsons()
  const graphData = {
    elements: elements,
    timestamp: new Date().toISOString()
  }
  
  // 保存到localStorage作为示例
  localStorage.setItem('workflowGraph', JSON.stringify(graphData))
  
  //这里可以调用后端API保存
  alert('工作流图已保存!')
}

// 加载图
const loadGraph = () => {
  if (!cy) return
  
  const savedData = localStorage.getItem('workflowGraph')
  if (savedData) {
    try {
      const graphData = JSON.parse(savedData)
      cy.elements().remove()
      cy.add(graphData.elements)
      alert('工作流图已加载!')
    } catch (error) {
      alert('加载失败: 数据格式错误')
    }
  } else {
    alert('没有找到保存的工作流图')
  }
}

//清空图
const clearGraph = () => {
  if (!cy || !confirm('确定要清空所有节点吗？')) return
  
  cy.elements().remove()
  selectedNode.value = null
  nodeIdCounter = 1
  // edgeIdCounter = 1  //未时未使用
}

//组件生命周期
onMounted(() => {
  initCytoscape()
})

onBeforeUnmount(() => {
  if (cy) {
    cy.destroy()
    cy = null
  }
})
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
}

.graph-container {
  flex: 1;
  position: relative;
}

.cytoscape-container {
  width: 100%;
  height: 100%;
  background: #fafafa;
}

.property-panel {
  width: 300px;
  background: #fff;
  border-left: 1px solid #ddd;
  padding: 1rem;
  overflow-y: auto;
}

.property-panel h4 {
  margin: 0 0 1rem 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.property-group {
  margin-bottom: 1rem;
}

.property-group label {
  display: block;
  margin-bottom: 0.3rem;
  font-weight: 500;
  color: #555;
  font-size: 0.9rem;
}

.property-group input,
.property-group select,
.property-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.property-group textarea {
  min-height: 80px;
  resize: vertical;
}

.property-group input:focus,
.property-group select:focus,
.property-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}