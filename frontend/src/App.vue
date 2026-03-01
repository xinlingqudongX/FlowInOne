<script setup lang="ts">
// 主应用组件保持原有的欢迎页面功能
import { ref } from 'vue'
import WorkflowEditor from './components/WorkflowEditor.vue'

const features = ref([
  { name: '项目管理', description: '创建和管理项目，跟踪进度，分配资源', icon: '📊' },
  { name: '工作流建模', description: '可视化设计复杂的工作流程和业务逻辑', icon: '🔄' },
  { name: '任务节点', description: '定义和配置各种任务节点，支持多种执行模式', icon: '⚙️' },
  { name: 'AI智能体', description: '集成AI能力，自动化处理复杂任务', icon: '🤖' }
])

const apiStatus = ref('检查中...')
const showWorkflowEditor = ref(false)

//检查API状态
fetch('/api-reference')
  .then(response => {
    if (response.ok) {
      apiStatus.value = 'API文档可用'
    } else {
      apiStatus.value = 'API文档不可用'
    }
  })
  .catch(() => {
    apiStatus.value = '无法连接到API'
  })

const toggleWorkflowEditor = () => {
  showWorkflowEditor.value = !showWorkflowEditor.value
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>🚀 FlowInOne工作流平台</h1>
      <p class="subtitle">现代化的工作流管理平台</p>
    </header>
    
    <main class="main">
      <div v-if="!showWorkflowEditor">
        <div class="welcome-card">
          <h2>欢迎使用 FlowInOne</h2>
          <p>FlowInOne 是一个现代化的工作流管理平台，帮助您高效地组织和执行复杂的业务流程。</p>
          <div class="api-status">
            <span class="status-indicator" :class="{ 
              'status-ok': apiStatus.includes('可用'), 
              'status-error': apiStatus.includes('不可用') || apiStatus.includes('无法连接') 
            }"></span>
            API状态: {{ apiStatus }}
          </div>
          <div class="navigation-links">
            <a href="/api-reference" class="api-link">查看 API 文档</a>
            <button @click="toggleWorkflowEditor" class="workflow-button">工作流编辑器</button>
          </div>
        </div>
        
        <div class="features-grid">
          <div 
            v-for="feature in features" 
            :key="feature.name" 
            class="feature-card"
          >
            <div class="feature-icon">{{ feature.icon }}</div>
            <h3>{{ feature.name }}</h3>
            <p>{{ feature.description }}</p>
          </div>
        </div>
      </div>
      
      <div v-else class="workflow-container">
        <div class="workflow-header">
          <h2>工作流编辑器</h2>
          <button @click="toggleWorkflowEditor" class="back-button">← 返回主页</button>
        </div>
        <WorkflowEditor />
      </div>
    </main>
    
    <footer class="footer">
      <p>FlowInOne &copy; 2026 - 现代化工作流平台</p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 2rem;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.header h1 {
  color: white;
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 300;
}

.subtitle {
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  font-size: 1.2rem;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.welcome-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.welcome-card h2 {
  color: #333;
  margin-top: 0;
  border-bottom: 2px solid #667eea;
  padding-bottom: 0.5rem;
}

.api-status {
  display: flex;
  align-items: center;
  margin: 1rem 0;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 5px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.status-ok {
  background: #4CAF50;
}

.status-error {
  background: #f44336;
}

.navigation-links {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.api-link {
  display: inline-block;
  padding: 0.8rem 1.5rem;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  background: #667eea;
  color: white;
}

.workflow-button {
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 25px;
  background: #4CAF50;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.api-link:hover, .workflow-button:hover {
  text-decoration: none;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.api-link:hover {
  background: #5a6fd8;
  color: white;
}

.workflow-button:hover {
  background: #45a049;
  color: white;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.feature-card {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  color: #667eea;
  margin: 0 0 0.5rem 0;
}

.feature-card p {
  color: #666;
  margin: 0;
  line-height: 1.5;
}

/* 工作流编辑器样式 */
.workflow-container {
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-width: 100%;
  width: 100%;
}

.workflow-header {
  background: #667eea;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.workflow-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.back-button {
  padding: 0.5rem 1rem;
  border: 1px solid white;
  border-radius: 20px;
  background: transparent;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-button:hover {
  background: white;
  color: #667eea;
}

.footer {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.1);
  margin-top: 2rem;
}
</style>