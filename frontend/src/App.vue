<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import WorkflowEditor from './components/WorkflowEditor.vue'

interface WorkflowGraph {
  elements: unknown[]
  timestamp: string
}

interface ProjectSummary {
  id: string
  name: string
  updatedAt?: string
}

interface ProjectDetail extends ProjectSummary {
  description?: string
  basePath?: string
  techStack?: Record<string, unknown>
  workflowJson?: WorkflowGraph | null
  createdAt?: string
}

const apiBase = '/api/v1'

const projects = ref<ProjectSummary[]>([])
const selectedProject = ref<ProjectDetail | null>(null)
const projectLoading = ref(false)
const projectError = ref('')
const workflowSaving = ref(false)
const workflowError = ref('')
const selectedWorkflow = ref<WorkflowGraph | null>(null)

const newProject = reactive({
  name: '',
  description: '',
  basePath: ''
})

const canEditWorkflow = computed(() => !!selectedProject.value)

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const normalizeProject = (value: unknown): ProjectDetail | null => {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' ? value.id : ''
  const name = typeof value.name === 'string' ? value.name : ''
  if (!id || !name) return null
  return {
    id,
    name,
    description: typeof value.description === 'string' ? value.description : undefined,
    basePath: typeof value.basePath === 'string' ? value.basePath : undefined,
    techStack: isRecord(value.techStack) ? value.techStack : undefined,
    workflowJson: isRecord(value.workflowJson) && Array.isArray(value.workflowJson.elements)
      ? { elements: value.workflowJson.elements, timestamp: typeof value.workflowJson.timestamp === 'string' ? value.workflowJson.timestamp : '' }
      : null,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined
  }
}

const fetchProjects = async () => {
  projectLoading.value = true
  projectError.value = ''
  try {
    const response = await fetch(`${apiBase}/project`)
    if (!response.ok) {
      projectError.value = '项目列表获取失败'
      projects.value = []
      return
    }
    const data: unknown = await response.json()
    if (!Array.isArray(data)) {
      projectError.value = '项目列表格式错误'
      projects.value = []
      return
    }
    const normalized = data
      .map(item => normalizeProject(item))
      .filter((item): item is ProjectDetail => !!item)
      .map(item => ({
        id: item.id,
        name: item.name,
        updatedAt: item.updatedAt
      }))
    projects.value = normalized
  } catch (error) {
    projectError.value = '项目列表获取失败'
    projects.value = []
  } finally {
    projectLoading.value = false
  }
}

const fetchProjectDetail = async (projectId: string) => {
  projectLoading.value = true
  projectError.value = ''
  try {
    const response = await fetch(`${apiBase}/project/${projectId}`)
    if (!response.ok) {
      projectError.value = '项目详情获取失败'
      return null
    }
    const data: unknown = await response.json()
    return normalizeProject(data)
  } catch (error) {
    projectError.value = '项目详情获取失败'
    return null
  } finally {
    projectLoading.value = false
  }
}

const createProject = async () => {
  if (!newProject.name.trim()) return
  projectLoading.value = true
  projectError.value = ''
  try {
    const response = await fetch(`${apiBase}/project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newProject.name.trim(),
        description: newProject.description.trim() || undefined,
        basePath: newProject.basePath.trim() || '',
        techStack: {}
      })
    })
    if (!response.ok) {
      projectError.value = '项目创建失败'
      return
    }
    const data: unknown = await response.json()
    const project = normalizeProject(data)
    if (project) {
      selectedProject.value = project
      selectedWorkflow.value = project.workflowJson ?? null
    }
    newProject.name = ''
    newProject.description = ''
    newProject.basePath = ''
    await fetchProjects()
  } catch (error) {
    projectError.value = '项目创建失败'
  } finally {
    projectLoading.value = false
  }
}

const selectProject = async (projectId: string) => {
  const detail = await fetchProjectDetail(projectId)
  if (detail) {
    selectedProject.value = detail
    selectedWorkflow.value = detail.workflowJson ?? null
  }
}

const saveWorkflow = async (graph: WorkflowGraph) => {
  if (!selectedProject.value) return
  workflowSaving.value = true
  workflowError.value = ''
  try {
    const response = await fetch(`${apiBase}/project/${selectedProject.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowJson: graph
      })
    })
    if (!response.ok) {
      workflowError.value = '工作流保存失败'
      return
    }
    const data: unknown = await response.json()
    const updated = normalizeProject(data)
    if (updated) {
      selectedProject.value = updated
      selectedWorkflow.value = updated.workflowJson ?? graph
      await fetchProjects()
    }
  } catch (error) {
    workflowError.value = '工作流保存失败'
  } finally {
    workflowSaving.value = false
  }
}

const reloadWorkflow = () => {
  selectedWorkflow.value = selectedProject.value?.workflowJson ?? null
}

const formatTime = (value?: string) => {
  if (!value) return '未更新'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未更新'
  return date.toLocaleString()
}

onMounted(() => {
  fetchProjects()
})
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>🚀 FlowInOne工作流平台</h1>
      <p class="subtitle">现代化的工作流管理平台</p>
    </header>
    
    <main class="main">
      <div class="dashboard">
        <section class="project-panel">
          <div class="panel-header">
            <h2>项目管理</h2>
            <button class="btn btn-secondary" :disabled="projectLoading" @click="fetchProjects">刷新</button>
          </div>
          <form class="project-form" @submit.prevent="createProject">
            <div class="form-group">
              <label>项目名称</label>
              <input v-model="newProject.name" placeholder="请输入项目名称" />
            </div>
            <div class="form-group">
              <label>项目描述</label>
              <input v-model="newProject.description" placeholder="可选" />
            </div>
            <div class="form-group">
              <label>项目路径</label>
              <input v-model="newProject.basePath" placeholder="可选" />
            </div>
            <button class="btn btn-primary" type="submit" :disabled="projectLoading || !newProject.name.trim()">创建项目</button>
            <p v-if="projectError" class="status-text error-text">{{ projectError }}</p>
          </form>
          <div class="project-list">
            <button
              v-for="project in projects"
              :key="project.id"
              class="project-item"
              :class="{ active: selectedProject && selectedProject.id === project.id }"
              @click="selectProject(project.id)"
            >
              <div class="project-name">{{ project.name }}</div>
              <div class="project-meta">更新时间：{{ formatTime(project.updatedAt) }}</div>
            </button>
          </div>
        </section>

        <section class="workflow-panel">
          <div class="panel-header">
            <div>
              <h2>工作流编辑器</h2>
              <p class="panel-subtitle">{{ selectedProject ? selectedProject.name : '请选择项目' }}</p>
            </div>
            <div class="panel-actions">
              <button class="btn btn-info" :disabled="!selectedProject" @click="reloadWorkflow">重新加载</button>
            </div>
          </div>
          <div v-if="workflowError" class="status-text error-text">{{ workflowError }}</div>
          <div v-if="workflowSaving" class="status-text saving-text">保存中...</div>
          <div v-if="canEditWorkflow" class="workflow-container">
            <WorkflowEditor
              :workflow-data="selectedWorkflow"
              :project-name="selectedProject?.name"
              @save="saveWorkflow"
            />
          </div>
          <div v-else class="empty-state">
            <p>请选择项目后开始编辑工作流</p>
          </div>
        </section>
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
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 2rem;
}

.project-panel,
.workflow-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.panel-header h2 {
  margin: 0;
  color: #333;
}

.panel-subtitle {
  margin: 0.4rem 0 0;
  color: #666;
  font-size: 0.95rem;
}

.panel-actions {
  display: flex;
  gap: 0.75rem;
}

.project-form {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.35rem;
  font-weight: 500;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 0.95rem;
}

.project-list {
  display: grid;
  gap: 0.75rem;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.3rem;
}

.project-item {
  text-align: left;
  border: 1px solid #e5e5e5;
  background: white;
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.project-item:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.project-item.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.project-name {
  font-weight: 600;
  color: #333;
}

.project-meta {
  margin-top: 0.35rem;
  color: #777;
  font-size: 0.85rem;
}

.workflow-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workflow-container {
  background: white;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  width: 100%;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #666;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
}

.status-text {
  margin: 0;
  font-size: 0.9rem;
}

.error-text {
  color: #f44336;
}

.saving-text {
  color: #2196F3;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  color: white;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.btn-primary {
  background: #667eea;
}

.btn-secondary {
  background: #4CAF50;
}

.btn-info {
  background: #2196F3;
}

.footer {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.1);
  margin-top: 2rem;
}
</style>
