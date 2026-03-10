<template>
  <div class="collaborative-cursors">
    <!-- 其他用户的光标 -->
    <div
      v-for="cursor in visibleCursors"
      :key="cursor.userId"
      class="user-cursor"
      :data-cursor-id="cursor.userId"
      :style="getCursorStyle(cursor)"
      @click="handleCursorClick(cursor)"
    >
      <!-- 光标指针 -->
      <div class="cursor-pointer" :style="{ borderLeftColor: cursor.color }">
        <svg width="20" height="20" viewBox="0 0 20 20" class="cursor-icon">
          <path
            d="M2 2 L2 18 L7 13 L10 13 L14 17 L16 15 L12 11 L12 8 Z"
            :fill="cursor.color"
            stroke="white"
            stroke-width="1"
          />
        </svg>
      </div>
      
      <!-- 用户名称标签 -->
      <div
        v-if="showUserNames && cursor.displayName"
        class="cursor-label"
        :style="{ backgroundColor: cursor.color }"
      >
        {{ cursor.displayName }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import type { CursorPosition } from '../services/collaboration.service';

/**
 * 用户光标信息
 */
interface UserCursor {
  userId: string;
  displayName: string;
  color: string;
  position: CursorPosition;
  lastUpdate: Date;
  visible: boolean;
}

interface Props {
  /** 是否显示用户名称 */
  showUserNames?: boolean;
  /** 光标超时时间（毫秒），超过此时间的光标将被隐藏 */
  cursorTimeout?: number;
  /** 容器元素，用于计算相对位置 */
  container?: HTMLElement;
}

interface Emits {
  (e: 'cursor-click', userId: string, position: CursorPosition): void;
}

const props = withDefaults(defineProps<Props>(), {
  showUserNames: true,
  cursorTimeout: 10000, // 10秒
});

const emit = defineEmits<Emits>();

// 用户光标映射
const userCursors = ref<Map<string, UserCursor>>(new Map());

// 清理定时器
let cleanupTimer: number | null = null;

// 计算可见的光标
const visibleCursors = computed(() => {
  const now = Date.now();
  return Array.from(userCursors.value.values()).filter(cursor => {
    // 检查光标是否在超时时间内
    const timeSinceUpdate = now - cursor.lastUpdate.getTime();
    return cursor.visible && timeSinceUpdate < props.cursorTimeout;
  });
});

/**
 * 更新用户光标位置
 */
function updateCursor(userId: string, displayName: string, color: string, position: CursorPosition): void {
  const existingCursor = userCursors.value.get(userId);
  
  const cursor: UserCursor = {
    userId,
    displayName,
    color,
    position: {
      ...position,
      timestamp: new Date(position.timestamp),
    },
    lastUpdate: new Date(),
    visible: true,
  };

  userCursors.value.set(userId, cursor);

  // 如果是新光标或位置发生显著变化，触发动画
  if (!existingCursor || hasSignificantMovement(existingCursor.position, position)) {
    animateCursor(userId);
  }
}

/**
 * 移除用户光标
 */
function removeCursor(userId: string): void {
  userCursors.value.delete(userId);
}

/**
 * 隐藏用户光标
 */
function hideCursor(userId: string): void {
  const cursor = userCursors.value.get(userId);
  if (cursor) {
    cursor.visible = false;
  }
}

/**
 * 显示用户光标
 */
function showCursor(userId: string): void {
  const cursor = userCursors.value.get(userId);
  if (cursor) {
    cursor.visible = true;
    cursor.lastUpdate = new Date();
  }
}

/**
 * 清除所有光标
 */
function clearAllCursors(): void {
  userCursors.value.clear();
}

/**
 * 获取光标样式
 */
function getCursorStyle(cursor: UserCursor): Record<string, string> {
  return {
    left: `${cursor.position.x}px`,
    top: `${cursor.position.y}px`,
    transform: 'translate(-2px, -2px)', // 微调光标位置
    zIndex: '1000',
  };
}

/**
 * 检查是否有显著的位置变化
 */
function hasSignificantMovement(oldPos: CursorPosition, newPos: CursorPosition): boolean {
  const threshold = 5; // 5像素阈值
  const dx = Math.abs(newPos.x - oldPos.x);
  const dy = Math.abs(newPos.y - oldPos.y);
  return dx > threshold || dy > threshold;
}

/**
 * 处理光标点击
 */
function handleCursorClick(cursor: UserCursor): void {
  emit('cursor-click', cursor.userId, cursor.position);
}

/**
 * 光标动画
 */
function animateCursor(userId: string): void {
  const cursorElement = document.querySelector(`[data-cursor-id="${userId}"]`) as HTMLElement;
  if (cursorElement) {
    cursorElement.classList.add('cursor-animate');
    setTimeout(() => {
      cursorElement.classList.remove('cursor-animate');
    }, 200);
  }
}

/**
 * 启动清理定时器
 */
function startCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
  }

  cleanupTimer = window.setInterval(() => {
    const now = Date.now();
    const cursorsToRemove: string[] = [];

    userCursors.value.forEach((cursor, userId) => {
      const timeSinceUpdate = now - cursor.lastUpdate.getTime();
      if (timeSinceUpdate > props.cursorTimeout) {
        cursorsToRemove.push(userId);
      }
    });

    cursorsToRemove.forEach(userId => {
      userCursors.value.delete(userId);
    });
  }, 1000); // 每秒检查一次
}

/**
 * 停止清理定时器
 */
function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * 获取用户光标信息
 */
function getCursor(userId: string): UserCursor | undefined {
  return userCursors.value.get(userId);
}

/**
 * 获取所有光标
 */
function getAllCursors(): UserCursor[] {
  return Array.from(userCursors.value.values());
}

/**
 * 获取在线用户数量
 */
function getOnlineUserCount(): number {
  return visibleCursors.value.length;
}

// 生命周期
onMounted(() => {
  startCleanupTimer();
});

onBeforeUnmount(() => {
  stopCleanupTimer();
});

// 暴露方法给父组件
defineExpose({
  updateCursor,
  removeCursor,
  hideCursor,
  showCursor,
  clearAllCursors,
  getCursor,
  getAllCursors,
  getOnlineUserCount,
});
</script>

<style scoped>
.collaborative-cursors {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999;
}

.user-cursor {
  position: absolute;
  pointer-events: auto;
  transition: all 0.1s ease-out;
  cursor: pointer;
}

.user-cursor.cursor-animate {
  animation: cursorPulse 0.2s ease-out;
}

.cursor-pointer {
  position: relative;
  width: 20px;
  height: 20px;
}

.cursor-icon {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  transition: transform 0.1s ease-out;
}

.user-cursor:hover .cursor-icon {
  transform: scale(1.1);
}

.cursor-label {
  position: absolute;
  top: 20px;
  left: 10px;
  background: #333;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 1001;
  opacity: 0;
  transform: translateY(-5px);
  transition: all 0.2s ease-out;
  pointer-events: none;
}

.user-cursor:hover .cursor-label {
  opacity: 1;
  transform: translateY(0);
}

/* 光标动画 */
@keyframes cursorPulse {
  0% {
    transform: translate(-2px, -2px) scale(1);
  }
  50% {
    transform: translate(-2px, -2px) scale(1.2);
  }
  100% {
    transform: translate(-2px, -2px) scale(1);
  }
}

/* 光标进入动画 */
.user-cursor {
  animation: cursorEnter 0.3s ease-out;
}

@keyframes cursorEnter {
  0% {
    opacity: 0;
    transform: translate(-2px, -2px) scale(0.5);
  }
  100% {
    opacity: 1;
    transform: translate(-2px, -2px) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cursor-label {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }
  
  .cursor-icon {
    width: 16px;
    height: 16px;
  }
  
  .cursor-pointer {
    width: 16px;
    height: 16px;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .cursor-label {
    border: 1px solid white;
  }
  
  .cursor-icon {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .user-cursor,
  .cursor-icon,
  .cursor-label {
    transition: none;
  }
  
  .user-cursor.cursor-animate {
    animation: none;
  }
  
  .user-cursor {
    animation: none;
  }
}
</style>