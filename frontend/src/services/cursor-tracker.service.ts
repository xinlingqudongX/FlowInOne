import type { CursorPosition } from './collaboration.service';

/**
 * 光标追踪配置
 */
interface CursorTrackerConfig {
  /** 发送间隔（毫秒） */
  throttleInterval: number;
  /** 最小移动距离（像素） */
  minMovementDistance: number;
  /** 是否启用追踪 */
  enabled: boolean;
  /** 容器元素 */
  container?: HTMLElement;
}

/**
 * 光标追踪服务
 * 负责追踪本地鼠标位置并广播给其他用户
 */
export class CursorTrackerService {
  private config: CursorTrackerConfig;
  private lastPosition: CursorPosition | null = null;
  private lastSentPosition: CursorPosition | null = null;
  private throttleTimer: number | null = null;
  private isTracking = false;

  // 事件监听器
  private mouseMoveHandler: ((event: MouseEvent) => void) | null = null;
  private mouseLeaveHandler: ((event: MouseEvent) => void) | null = null;
  private mouseEnterHandler: ((event: MouseEvent) => void) | null = null;

  // 回调函数
  private positionUpdateCallbacks: ((position: CursorPosition) => void)[] = [];
  private cursorHideCallbacks: (() => void)[] = [];
  private cursorShowCallbacks: (() => void)[] = [];

  constructor(config: Partial<CursorTrackerConfig> = {}) {
    this.config = {
      throttleInterval: 50, // 20fps
      minMovementDistance: 2, // 2像素
      enabled: true,
      ...config,
    };
  }

  /**
   * 开始追踪光标
   */
  startTracking(container?: HTMLElement): void {
    if (this.isTracking) {
      console.warn('光标追踪已经启动');
      return;
    }

    const targetElement = container || this.config.container || document.body;
    this.config.container = targetElement;

    this.setupEventListeners(targetElement);
    this.isTracking = true;
    
    console.log('光标追踪已启动');
  }

  /**
   * 停止追踪光标
   */
  stopTracking(): void {
    if (!this.isTracking) {
      return;
    }

    this.removeEventListeners();
    this.clearThrottleTimer();
    this.isTracking = false;
    this.lastPosition = null;
    this.lastSentPosition = null;
    
    console.log('光标追踪已停止');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CursorTrackerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果禁用了追踪，停止追踪
    if (!this.config.enabled && this.isTracking) {
      this.stopTracking();
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): CursorTrackerConfig {
    return { ...this.config };
  }

  /**
   * 获取最后的光标位置
   */
  getLastPosition(): CursorPosition | null {
    return this.lastPosition ? { ...this.lastPosition } : null;
  }

  /**
   * 是否正在追踪
   */
  isTrackingActive(): boolean {
    return this.isTracking;
  }

  /**
   * 手动更新光标位置
   */
  updatePosition(x: number, y: number): void {
    if (!this.config.enabled) return;

    const position: CursorPosition = {
      x,
      y,
      timestamp: new Date(),
    };

    this.handlePositionUpdate(position);
  }

  /**
   * 添加位置更新回调
   */
  onPositionUpdate(callback: (position: CursorPosition) => void): void {
    this.positionUpdateCallbacks.push(callback);
  }

  /**
   * 移除位置更新回调
   */
  offPositionUpdate(callback: (position: CursorPosition) => void): void {
    const index = this.positionUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      this.positionUpdateCallbacks.splice(index, 1);
    }
  }

  /**
   * 添加光标隐藏回调
   */
  onCursorHide(callback: () => void): void {
    this.cursorHideCallbacks.push(callback);
  }

  /**
   * 移除光标隐藏回调
   */
  offCursorHide(callback: () => void): void {
    const index = this.cursorHideCallbacks.indexOf(callback);
    if (index > -1) {
      this.cursorHideCallbacks.splice(index, 1);
    }
  }

  /**
   * 添加光标显示回调
   */
  onCursorShow(callback: () => void): void {
    this.cursorShowCallbacks.push(callback);
  }

  /**
   * 移除光标显示回调
   */
  offCursorShow(callback: () => void): void {
    const index = this.cursorShowCallbacks.indexOf(callback);
    if (index > -1) {
      this.cursorShowCallbacks.splice(index, 1);
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(container: HTMLElement): void {
    this.mouseMoveHandler = (event: MouseEvent) => {
      this.handleMouseMove(event);
    };

    this.mouseLeaveHandler = () => {
      this.handleMouseLeave();
    };

    this.mouseEnterHandler = () => {
      this.handleMouseEnter();
    };

    container.addEventListener('mousemove', this.mouseMoveHandler, { passive: true });
    container.addEventListener('mouseleave', this.mouseLeaveHandler);
    container.addEventListener('mouseenter', this.mouseEnterHandler);
  }

  /**
   * 移除事件监听器
   */
  private removeEventListeners(): void {
    if (!this.config.container) return;

    if (this.mouseMoveHandler) {
      this.config.container.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = null;
    }

    if (this.mouseLeaveHandler) {
      this.config.container.removeEventListener('mouseleave', this.mouseLeaveHandler);
      this.mouseLeaveHandler = null;
    }

    if (this.mouseEnterHandler) {
      this.config.container.removeEventListener('mouseenter', this.mouseEnterHandler);
      this.mouseEnterHandler = null;
    }
  }

  /**
   * 处理鼠标移动
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.config.enabled || !this.config.container) return;

    // 计算相对于容器的位置
    const rect = this.config.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 检查是否在容器边界内
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      return;
    }

    const position: CursorPosition = {
      x: Math.round(x), // 四舍五入避免小数
      y: Math.round(y),
      timestamp: new Date(),
    };

    this.handlePositionUpdate(position);
  }

  /**
   * 处理鼠标离开
   */
  private handleMouseLeave(): void {
    // 通知光标隐藏
    this.cursorHideCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('光标隐藏回调执行失败:', error);
      }
    });
  }

  /**
   * 处理鼠标进入
   */
  private handleMouseEnter(): void {
    // 通知光标显示
    this.cursorShowCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('光标显示回调执行失败:', error);
      }
    });
  }

  /**
   * 处理位置更新
   */
  private handlePositionUpdate(position: CursorPosition): void {
    this.lastPosition = position;

    // 检查是否需要发送更新
    if (this.shouldSendUpdate(position)) {
      this.schedulePositionSend(position);
    }
  }

  /**
   * 检查是否应该发送更新
   */
  private shouldSendUpdate(position: CursorPosition): boolean {
    if (!this.lastSentPosition) {
      return true;
    }

    // 检查移动距离
    const dx = position.x - this.lastSentPosition.x;
    const dy = position.y - this.lastSentPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance >= this.config.minMovementDistance;
  }

  /**
   * 安排位置发送
   */
  private schedulePositionSend(position: CursorPosition): void {
    // 如果已有定时器，不重复安排
    if (this.throttleTimer) {
      return;
    }

    this.throttleTimer = window.setTimeout(() => {
      this.sendPositionUpdate(position);
      this.throttleTimer = null;
    }, this.config.throttleInterval);
  }

  /**
   * 发送位置更新
   */
  private sendPositionUpdate(position: CursorPosition): void {
    this.lastSentPosition = position;

    // 通知所有回调
    this.positionUpdateCallbacks.forEach(callback => {
      try {
        callback(position);
      } catch (error) {
        console.error('位置更新回调执行失败:', error);
      }
    });
  }

  /**
   * 清除节流定时器
   */
  private clearThrottleTimer(): void {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    isTracking: boolean;
    lastPosition: CursorPosition | null;
    lastSentPosition: CursorPosition | null;
    callbackCount: number;
    config: CursorTrackerConfig;
  } {
    return {
      isTracking: this.isTracking,
      lastPosition: this.lastPosition,
      lastSentPosition: this.lastSentPosition,
      callbackCount: this.positionUpdateCallbacks.length,
      config: this.config,
    };
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopTracking();
    
    // 清空所有回调
    this.positionUpdateCallbacks.length = 0;
    this.cursorHideCallbacks.length = 0;
    this.cursorShowCallbacks.length = 0;
  }
}