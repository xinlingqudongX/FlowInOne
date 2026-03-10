import { CollaborationService } from './collaboration.service';
import type { User, CursorPosition, CollaborationOperation } from './collaboration.service';
import { UserManagerService } from './user-manager.service';
import type { UserConfig } from './user-manager.service';
import { CursorTrackerService } from './cursor-tracker.service';
import { OperationSyncService } from './operation-sync.service';
import type { OperationConflict } from './operation-sync.service';
import type { ConnectionState } from './websocket-manager';

/**
 * 协同管理器配置
 */
interface CollaborationManagerConfig {
  /** WebSocket服务器URL */
  serverUrl: string;
  /** 是否启用协同功能 */
  enabled: boolean;
  /** 是否自动连接 */
  autoConnect: boolean;
  /** 光标追踪配置 */
  cursorTracking: {
    enabled: boolean;
    throttleInterval: number;
    minMovementDistance: number;
  };
  /** 操作同步配置 */
  operationSync: {
    enableConflictDetection: boolean;
    autoResolveConflicts: boolean;
  };
}

/**
 * 协同状态
 */
export interface CollaborationState {
  isEnabled: boolean;
  isConnected: boolean;
  connectionState: ConnectionState;
  currentUser: UserConfig | null;
  onlineUsers: User[];
  pendingOperations: number;
  conflicts: number;
}

/**
 * 协同管理器
 * 整合所有协同服务，提供统一的协同功能接口
 */
export class CollaborationManagerService {
  private config: CollaborationManagerConfig;
  private collaborationService!: CollaborationService;
  private userManager!: UserManagerService;
  private cursorTracker!: CursorTrackerService;
  private operationSync!: OperationSyncService;

  private currentProjectId: string = '';
  private isInitialized = false;

  // 状态
  private onlineUsers: User[] = [];
  private connectionState: ConnectionState = 'disconnected';

  // 事件回调
  private stateChangeCallbacks: ((state: CollaborationState) => void)[] = [];
  private userJoinCallbacks: ((user: User) => void)[] = [];
  private userLeaveCallbacks: ((userId: string) => void)[] = [];
  private cursorUpdateCallbacks: ((userId: string, position: CursorPosition) => void)[] = [];
  private operationCallbacks: ((operation: CollaborationOperation) => void)[] = [];
  private conflictCallbacks: ((conflict: OperationConflict) => void)[] = [];

  constructor(config: Partial<CollaborationManagerConfig> = {}) {
    this.config = {
      serverUrl: 'ws://localhost:3000',
      enabled: true,
      autoConnect: true,
      cursorTracking: {
        enabled: true,
        throttleInterval: 50,
        minMovementDistance: 2,
      },
      operationSync: {
        enableConflictDetection: true,
        autoResolveConflicts: true,
      },
      ...config,
    };

    this.initializeServices();
  }

  /**
   * 初始化所有服务
   */
  private initializeServices(): void {
    // 初始化用户管理器
    this.userManager = new UserManagerService();

    // 初始化协同服务
    this.collaborationService = new CollaborationService();

    // 初始化光标追踪器
    this.cursorTracker = new CursorTrackerService({
      enabled: this.config.cursorTracking.enabled,
      throttleInterval: this.config.cursorTracking.throttleInterval,
      minMovementDistance: this.config.cursorTracking.minMovementDistance,
    });

    // 初始化操作同步器
    this.operationSync = new OperationSyncService({
      enableConflictDetection: this.config.operationSync.enableConflictDetection,
      autoResolveConflicts: this.config.operationSync.autoResolveConflicts,
    });

    this.setupEventHandlers();
    this.isInitialized = true;
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 协同服务事件
    this.collaborationService.onConnectionStateChange((state) => {
      this.connectionState = state;
      this.notifyStateChange();
    });

    this.collaborationService.onUserJoin((user) => {
      // 不需要手动添加，因为会通过 online-users 消息更新
      this.userJoinCallbacks.forEach(callback => callback(user));
    });

    this.collaborationService.onUserLeave((userId) => {
      // 不需要手动移除，因为会通过 online-users 消息更新
      this.userLeaveCallbacks.forEach(callback => callback(userId));
    });

    this.collaborationService.onCursorUpdate((userId, position) => {
      this.cursorUpdateCallbacks.forEach(callback => callback(userId, position));
    });

    this.collaborationService.onOperationReceived((operation) => {
      this.operationSync.handleRemoteOperation(operation);
    });

    this.collaborationService.onOnlineUsersUpdate((users) => {
      this.onlineUsers = users;
      this.notifyStateChange();
    });

    // 光标追踪事件
    this.cursorTracker.onPositionUpdate((position) => {
      this.collaborationService.broadcastCursorPosition(position);
    });

    // 操作同步事件
    this.operationSync.onOperationApply((operation) => {
      this.operationCallbacks.forEach(callback => callback(operation));
    });

    this.operationSync.onConflictDetected((conflict) => {
      this.conflictCallbacks.forEach(callback => callback(conflict));
      this.notifyStateChange();
    });

    this.operationSync.onConflictResolved(() => {
      this.notifyStateChange();
    });
  }

  /**
   * 启动协同功能
   */
  async start(projectId: string, container?: HTMLElement): Promise<void> {
    if (!this.config.enabled) {
      console.log('协同功能已禁用');
      return;
    }

    if (!this.isInitialized) {
      throw new Error('协同管理器未初始化');
    }

    this.currentProjectId = projectId;

    try {
      // 确保用户信息存在
      let currentUser = this.userManager.getCurrentUser();
      if (!currentUser) {
        console.log('创建新用户信息');
        currentUser = this.userManager.setUserInfo({
          userId: '',
          displayName: '',
        });
      }

      console.log('启动协同功能，用户信息:', {
        userId: currentUser.userId,
        displayName: currentUser.displayName,
        color: currentUser.color,
      });

      // 连接协同服务
      await this.collaborationService.connect(
        projectId,
        {
          userId: currentUser.userId,
          displayName: currentUser.displayName,
          color: currentUser.color,
        },
        this.config.serverUrl
      );

      // 启动光标追踪
      if (this.config.cursorTracking.enabled && container) {
        this.cursorTracker.startTracking(container);
        console.log('光标追踪已启动');
      }

      console.log(`协同功能已启动，项目ID: ${projectId}`);
      this.notifyStateChange();

    } catch (error) {
      console.error('启动协同功能失败:', error);
      throw error;
    }
  }

  /**
   * 停止协同功能
   */
  async stop(): Promise<void> {
    try {
      // 停止光标追踪
      this.cursorTracker.stopTracking();

      // 断开协同服务
      await this.collaborationService.disconnect();

      // 清理状态
      this.onlineUsers = [];
      this.currentProjectId = '';
      this.connectionState = 'disconnected';

      console.log('协同功能已停止');
      this.notifyStateChange();

    } catch (error) {
      console.error('停止协同功能失败:', error);
    }
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<void> {
    if (!this.currentProjectId) {
      throw new Error('无法重连：未设置项目ID');
    }

    await this.collaborationService.reconnect();
  }

  /**
   * 更新用户信息
   */
  updateUserInfo(userInfo: Partial<UserConfig>): UserConfig {
    const updatedUser = this.userManager.setUserInfo(userInfo);
    
    // 如果已连接，更新服务器上的用户信息
    if (this.connectionState === 'connected') {
      this.collaborationService.setUserInfo({
        userId: updatedUser.userId,
        displayName: updatedUser.displayName,
        color: updatedUser.color,
      });
    }

    this.notifyStateChange();
    return updatedUser;
  }

  /**
   * 广播操作
   */
  broadcastOperation(operation: Omit<CollaborationOperation, 'userId' | 'timestamp'>): void {
    const currentUser = this.userManager.getCurrentUser();
    if (!currentUser) {
      console.warn('无法广播操作：用户信息不存在');
      return;
    }

    const fullOperation: CollaborationOperation = {
      ...operation,
      userId: currentUser.userId,
      timestamp: new Date(),
    };

    // 处理本地操作
    this.operationSync.handleLocalOperation(fullOperation);

    // 广播给其他用户
    this.collaborationService.broadcastOperation(fullOperation);
  }

  /**
   * 手动解决冲突
   */
  resolveConflict(conflict: OperationConflict, resolution: OperationConflict['resolution']): void {
    this.operationSync.resolveConflict(conflict, resolution);
  }

  /**
   * 获取协同状态
   */
  getState(): CollaborationState {
    return {
      isEnabled: this.config.enabled,
      isConnected: this.connectionState === 'connected',
      connectionState: this.connectionState,
      currentUser: this.userManager.getCurrentUser(),
      onlineUsers: this.onlineUsers,
      pendingOperations: this.operationSync.getPendingOperations().length,
      conflicts: this.operationSync.getConflictQueue().length,
    };
  }

  /**
   * 获取在线用户列表
   */
  getOnlineUsers(): User[] {
    return [...this.onlineUsers];
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): UserConfig | null {
    return this.userManager.getCurrentUser();
  }

  /**
   * 获取用户管理器
   */
  getUserManager(): UserManagerService {
    return this.userManager;
  }

  /**
   * 获取冲突队列
   */
  getConflicts(): OperationConflict[] {
    return this.operationSync.getConflictQueue();
  }

  /**
   * 启用/禁用协同功能
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (!enabled && this.connectionState === 'connected') {
      this.stop();
    }
    
    this.notifyStateChange();
  }

  /**
   * 启用/禁用光标追踪
   */
  setCursorTrackingEnabled(enabled: boolean): void {
    this.config.cursorTracking.enabled = enabled;
    this.cursorTracker.updateConfig({ enabled });
    
    if (!enabled) {
      this.cursorTracker.stopTracking();
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CollaborationManagerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 更新子服务配置
    if (config.cursorTracking) {
      this.cursorTracker.updateConfig(config.cursorTracking);
    }
  }

  // 事件监听器注册方法
  onStateChange(callback: (state: CollaborationState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  onUserJoin(callback: (user: User) => void): void {
    this.userJoinCallbacks.push(callback);
  }

  onUserLeave(callback: (userId: string) => void): void {
    this.userLeaveCallbacks.push(callback);
  }

  onCursorUpdate(callback: (userId: string, position: CursorPosition) => void): void {
    this.cursorUpdateCallbacks.push(callback);
  }

  onOperation(callback: (operation: CollaborationOperation) => void): void {
    this.operationCallbacks.push(callback);
  }

  onConflict(callback: (conflict: OperationConflict) => void): void {
    this.conflictCallbacks.push(callback);
  }

  /**
   * 添加在线用户
   */
  private addOnlineUser(user: User): void {
    const existingIndex = this.onlineUsers.findIndex(u => u.userId === user.userId);
    if (existingIndex > -1) {
      this.onlineUsers[existingIndex] = user;
    } else {
      this.onlineUsers.push(user);
    }
    this.notifyStateChange();
  }

  /**
   * 移除在线用户
   */
  private removeOnlineUser(userId: string): void {
    this.onlineUsers = this.onlineUsers.filter(u => u.userId !== userId);
    this.notifyStateChange();
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(): void {
    const state = this.getState();
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('状态变化回调执行失败:', error);
      }
    });
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    config: CollaborationManagerConfig;
    state: CollaborationState;
    services: {
      collaboration: any;
      cursorTracker: any;
      operationSync: any;
      userManager: any;
    };
  } {
    return {
      config: this.config,
      state: this.getState(),
      services: {
        collaboration: this.collaborationService.getConnectionState(),
        cursorTracker: this.cursorTracker.getStats(),
        operationSync: this.operationSync.getStats(),
        userManager: this.userManager.getUserStats(),
      },
    };
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stop();
    
    // 销毁所有服务
    this.collaborationService.destroy();
    this.cursorTracker.destroy();
    this.operationSync.destroy();
    
    // 清空所有回调
    this.stateChangeCallbacks.length = 0;
    this.userJoinCallbacks.length = 0;
    this.userLeaveCallbacks.length = 0;
    this.cursorUpdateCallbacks.length = 0;
    this.operationCallbacks.length = 0;
    this.conflictCallbacks.length = 0;
    
    this.isInitialized = false;
  }
}