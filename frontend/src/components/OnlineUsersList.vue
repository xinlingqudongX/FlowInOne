<template>
  <div class="online-users-list" :class="{ collapsed: isCollapsed }">
    <!-- 头部 -->
    <div class="users-header" @click="toggleCollapse">
      <div class="header-content">
        <div class="header-icon">👥</div>
        <div class="header-text">
          <span class="title">在线用户</span>
          <span class="count">({{ onlineUsers.length }})</span>
        </div>
      </div>
      <button class="collapse-btn" :class="{ rotated: isCollapsed }">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M4 6 L8 10 L12 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- 用户列表 -->
    <div v-if="!isCollapsed" class="users-content">
      <!-- 连接状态指示器 -->
      <div class="connection-status" :class="connectionStateClass">
        <div class="status-indicator"></div>
        <span class="status-text">{{ connectionStatusText }}</span>
      </div>

      <!-- 当前用户 -->
      <div v-if="currentUser" class="current-user">
        <div class="user-item current">
          <div class="user-avatar" :style="{ backgroundColor: currentUser.color }">
            {{ getUserInitials(currentUser.displayName) }}
          </div>
          <div class="user-info">
            <div class="user-name">{{ currentUser.displayName }} (您)</div>
            <div class="user-status">当前用户</div>
          </div>
          <button class="user-action-btn" @click="editCurrentUser" title="编辑用户信息">
            ⚙️
          </button>
        </div>
      </div>

      <!-- 其他在线用户 -->
      <div v-if="otherUsers.length > 0" class="other-users">
        <div class="section-title">其他用户</div>
        <div
          v-for="user in otherUsers"
          :key="user.userId"
          class="user-item"
          @click="focusOnUser(user)"
          :title="`点击定位到 ${user.displayName} 的光标`"
        >
          <div class="user-avatar" :style="{ backgroundColor: user.color || '#999' }">
            {{ getUserInitials(user.displayName) }}
          </div>
          <div class="user-info">
            <div class="user-name">{{ user.displayName }}</div>
            <div class="user-status">
              <span class="online-indicator"></span>
              {{ getLastSeenText(user.lastSeen) }}
            </div>
          </div>
          <div class="user-actions">
            <button
              class="user-action-btn"
              @click.stop="toggleUserCursor(user)"
              :title="user.cursorVisible ? '隐藏光标' : '显示光标'"
            >
              {{ user.cursorVisible ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="otherUsers.length === 0 && connectionState === 'connected'" class="empty-state">
        <div class="empty-icon">🤝</div>
        <div class="empty-text">暂无其他用户在线</div>
        <div class="empty-hint">邀请团队成员一起协作吧！</div>
      </div>

      <!-- 离线状态 -->
      <div v-if="connectionState === 'disconnected'" class="offline-state">
        <div class="offline-icon">📡</div>
        <div class="offline-text">协同功能已离线</div>
        <button class="reconnect-btn" @click="reconnect" :disabled="reconnecting">
          {{ reconnecting ? '重连中...' : '重新连接' }}
        </button>
      </div>
    </div>

    <!-- 快速操作栏 -->
    <div v-if="!isCollapsed && connectionState === 'connected'" class="quick-actions">
      <button class="quick-action-btn" @click="toggleAllCursors" :title="showAllCursors ? '隐藏所有光标' : '显示所有光标'">
        {{ showAllCursors ? '🙈' : '👀' }} {{ showAllCursors ? '隐藏' : '显示' }}光标
      </button>
      <button class="quick-action-btn" @click="refreshUsers" title="刷新用户列表">
        🔄 刷新
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { User } from '../services/collaboration.service';
import type { ConnectionState } from '../services/websocket-manager';

interface Props {
  /** 在线用户列表 */
  users: User[];
  /** 当前用户信息 */
  currentUser?: User | null;
  /** 连接状态 */
  connectionState: ConnectionState;
  /** 是否显示所有光标 */
  showAllCursors?: boolean;
  /** 是否默认折叠 */
  defaultCollapsed?: boolean;
}

interface Emits {
  (e: 'edit-user'): void;
  (e: 'focus-user', user: User): void;
  (e: 'toggle-user-cursor', user: User, visible: boolean): void;
  (e: 'toggle-all-cursors', visible: boolean): void;
  (e: 'reconnect'): void;
  (e: 'refresh-users'): void;
}

const props = withDefaults(defineProps<Props>(), {
  showAllCursors: true,
  defaultCollapsed: false,
});

const emit = defineEmits<Emits>();

// 状态
const isCollapsed = ref(props.defaultCollapsed);
const reconnecting = ref(false);
const userCursorVisibility = ref<Map<string, boolean>>(new Map());

// 计算属性
const onlineUsers = computed(() => props.users.filter(user => user.isOnline));

const otherUsers = computed(() => 
  onlineUsers.value
    .filter(user => user.userId !== props.currentUser?.userId)
    .map(user => ({
      ...user,
      cursorVisible: userCursorVisibility.value.get(user.userId) ?? true,
    }))
);

const connectionStateClass = computed(() => {
  switch (props.connectionState) {
    case 'connected':
      return 'connected';
    case 'connecting':
    case 'reconnecting':
      return 'connecting';
    case 'disconnected':
      return 'disconnected';
    default:
      return 'unknown';
  }
});

const connectionStatusText = computed(() => {
  switch (props.connectionState) {
    case 'connected':
      return '已连接';
    case 'connecting':
      return '连接中...';
    case 'reconnecting':
      return '重连中...';
    case 'disconnected':
      return '已断开';
    default:
      return '未知状态';
  }
});

// 监听用户列表变化，初始化光标可见性
watch(
  () => props.users,
  (newUsers) => {
    newUsers.forEach(user => {
      if (!userCursorVisibility.value.has(user.userId)) {
        userCursorVisibility.value.set(user.userId, true);
      }
    });
  },
  { immediate: true }
);

/**
 * 切换折叠状态
 */
function toggleCollapse(): void {
  isCollapsed.value = !isCollapsed.value;
}

/**
 * 获取用户名首字母
 */
function getUserInitials(displayName: string): string {
  if (!displayName) return '?';
  
  const words = displayName.trim().split(/\s+/);
  if (words.length === 1) {
    const firstWord = words[0];
    return firstWord ? firstWord.charAt(0).toUpperCase() : '?';
  } else {
    return words.slice(0, 2).map(word => word ? word.charAt(0).toUpperCase() : '').join('');
  }
}

/**
 * 获取最后在线时间文本
 */
function getLastSeenText(lastSeen: Date): string {
  const now = new Date();
  const diff = now.getTime() - lastSeen.getTime();
  
  if (diff < 60000) { // 1分钟内
    return '刚刚在线';
  } else if (diff < 3600000) { // 1小时内
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分钟前`;
  } else if (diff < 86400000) { // 24小时内
    const hours = Math.floor(diff / 3600000);
    return `${hours}小时前`;
  } else {
    return lastSeen.toLocaleDateString();
  }
}

/**
 * 编辑当前用户信息
 */
function editCurrentUser(): void {
  emit('edit-user');
}

/**
 * 聚焦到用户
 */
function focusOnUser(user: User): void {
  emit('focus-user', user);
}

/**
 * 切换用户光标显示
 */
function toggleUserCursor(user: User): void {
  const currentVisible = userCursorVisibility.value.get(user.userId) ?? true;
  const newVisible = !currentVisible;
  
  userCursorVisibility.value.set(user.userId, newVisible);
  emit('toggle-user-cursor', user, newVisible);
}

/**
 * 切换所有光标显示
 */
function toggleAllCursors(): void {
  const newVisible = !props.showAllCursors;
  
  // 更新所有用户的光标可见性
  otherUsers.value.forEach(user => {
    userCursorVisibility.value.set(user.userId, newVisible);
  });
  
  emit('toggle-all-cursors', newVisible);
}

/**
 * 重新连接
 */
async function reconnect(): Promise<void> {
  reconnecting.value = true;
  try {
    emit('reconnect');
    // 等待一段时间让连接状态更新
    await new Promise(resolve => setTimeout(resolve, 2000));
  } finally {
    reconnecting.value = false;
  }
}

/**
 * 刷新用户列表
 */
function refreshUsers(): void {
  emit('refresh-users');
}

/**
 * 获取用户统计信息
 */
function getUserStats(): {
  totalUsers: number;
  onlineUsers: number;
  offlineUsers: number;
} {
  const total = props.users.length;
  const online = onlineUsers.value.length;
  const offline = total - online;
  
  return {
    totalUsers: total,
    onlineUsers: online,
    offlineUsers: offline,
  };
}

// 暴露方法给父组件
defineExpose({
  getUserStats,
  toggleCollapse,
  refreshUsers,
});
</script>

<style scoped>
.online-users-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e5e5;
  overflow: hidden;
  transition: all 0.3s ease;
  min-width: 280px;
  max-width: 320px;
}

.online-users-list.collapsed {
  max-height: 60px;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e5e5;
  cursor: pointer;
  transition: background-color 0.2s;
}

.users-header:hover {
  background: #e9ecef;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.25rem;
}

.header-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title {
  font-weight: 600;
  color: #333;
}

.count {
  color: #666;
  font-size: 0.9rem;
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
  color: #666;
}

.collapse-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.collapse-btn.rotated {
  transform: rotate(180deg);
}

.users-content {
  max-height: 400px;
  overflow-y: auto;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e5e5;
  font-size: 0.85rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.connection-status.connected .status-indicator {
  background: #28a745;
}

.connection-status.connecting .status-indicator {
  background: #ffc107;
  animation: pulse 1.5s infinite;
}

.connection-status.disconnected .status-indicator {
  background: #dc3545;
}

.status-text {
  color: #666;
  font-weight: 500;
}

.current-user {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e5e5;
}

.other-users {
  padding: 0.75rem 0;
}

.section-title {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  transition: background-color 0.2s;
  cursor: pointer;
}

.user-item:hover {
  background: #f8f9fa;
}

.user-item.current {
  background: rgba(102, 126, 234, 0.1);
  cursor: default;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status {
  font-size: 0.8rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.online-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #28a745;
}

.user-actions {
  display: flex;
  gap: 0.25rem;
}

.user-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  font-size: 0.9rem;
  opacity: 0.6;
  transition: all 0.2s;
}

.user-action-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  opacity: 1;
}

.empty-state,
.offline-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #666;
}

.empty-icon,
.offline-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.empty-text,
.offline-text {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.empty-hint {
  font-size: 0.85rem;
  color: #999;
}

.reconnect-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-top: 1rem;
  transition: background-color 0.2s;
}

.reconnect-btn:hover:not(:disabled) {
  background: #5a6fd8;
}

.reconnect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e5e5e5;
}

.quick-action-btn {
  flex: 1;
  background: white;
  border: 1px solid #ddd;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

/* 动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 滚动条样式 */
.users-content::-webkit-scrollbar {
  width: 6px;
}

.users-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.users-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.users-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .online-users-list {
    min-width: 260px;
    max-width: 300px;
  }
  
  .user-avatar {
    width: 32px;
    height: 32px;
    font-size: 0.8rem;
  }
  
  .user-name {
    font-size: 0.9rem;
  }
  
  .user-status {
    font-size: 0.75rem;
  }
}
</style>