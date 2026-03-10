import type { CollaborationOperation } from './collaboration.service';

/**
 * 操作冲突类型
 */
export type ConflictType = 'concurrent-edit' | 'delete-modified' | 'move-conflict' | 'none';

/**
 * 操作冲突信息
 */
export interface OperationConflict {
  type: ConflictType;
  localOperation: CollaborationOperation;
  remoteOperation: CollaborationOperation;
  resolution?: 'accept-local' | 'accept-remote' | 'merge' | 'manual';
  message: string;
}

/**
 * 操作历史记录
 */
export interface OperationHistory {
  operation: CollaborationOperation;
  timestamp: Date;
  applied: boolean;
  reverted: boolean;
}

/**
 * 操作同步配置
 */
interface OperationSyncConfig {
  /** 是否启用冲突检测 */
  enableConflictDetection: boolean;
  /** 操作历史保留时间（毫秒） */
  historyRetentionTime: number;
  /** 最大历史记录数量 */
  maxHistorySize: number;
  /** 是否自动解决冲突 */
  autoResolveConflicts: boolean;
}

/**
 * 操作同步服务
 * 负责协同操作的同步、冲突检测和解决
 */
export class OperationSyncService {
  private config: OperationSyncConfig;
  private operationHistory: OperationHistory[] = [];
  private pendingOperations: Map<string, CollaborationOperation> = new Map();
  private conflictQueue: OperationConflict[] = [];

  // 回调函数
  private operationApplyCallbacks: ((operation: CollaborationOperation) => void)[] = [];
  private conflictDetectedCallbacks: ((conflict: OperationConflict) => void)[] = [];
  private conflictResolvedCallbacks: ((conflict: OperationConflict) => void)[] = [];

  constructor(config: Partial<OperationSyncConfig> = {}) {
    this.config = {
      enableConflictDetection: true,
      historyRetentionTime: 300000, // 5分钟
      maxHistorySize: 1000,
      autoResolveConflicts: true,
      ...config,
    };

    // 启动清理定时器
    this.startCleanupTimer();
  }

  /**
   * 处理本地操作
   */
  handleLocalOperation(operation: CollaborationOperation): void {
    // 记录到历史
    this.addToHistory(operation, true);

    // 添加到待处理队列
    this.pendingOperations.set(this.generateOperationId(operation), operation);

    console.log('处理本地操作:', operation);
  }

  /**
   * 处理远程操作
   */
  handleRemoteOperation(operation: CollaborationOperation): void {
    console.log('处理远程操作:', operation);

    // 检查冲突
    if (this.config.enableConflictDetection) {
      const conflict = this.detectConflict(operation);
      if (conflict.type !== 'none') {
        this.handleConflict(conflict);
        return;
      }
    }

    // 应用操作
    this.applyOperation(operation);
  }

  /**
   * 应用操作
   */
  private applyOperation(operation: CollaborationOperation): void {
    // 记录到历史
    this.addToHistory(operation, true);

    // 从待处理队列中移除相同的操作
    const operationId = this.generateOperationId(operation);
    this.pendingOperations.delete(operationId);

    // 通知应用回调
    this.operationApplyCallbacks.forEach(callback => {
      try {
        callback(operation);
      } catch (error) {
        console.error('操作应用回调执行失败:', error);
      }
    });
  }

  /**
   * 检测操作冲突
   */
  private detectConflict(remoteOperation: CollaborationOperation): OperationConflict {
    // 查找可能冲突的本地操作
    const conflictingLocalOp = this.findConflictingOperation(remoteOperation);
    
    if (!conflictingLocalOp) {
      return {
        type: 'none',
        localOperation: remoteOperation,
        remoteOperation: remoteOperation,
        message: '无冲突',
      };
    }

    const conflictType = this.determineConflictType(conflictingLocalOp, remoteOperation);
    
    return {
      type: conflictType,
      localOperation: conflictingLocalOp,
      remoteOperation: remoteOperation,
      message: this.getConflictMessage(conflictType, conflictingLocalOp, remoteOperation),
    };
  }

  /**
   * 查找冲突的操作
   */
  private findConflictingOperation(remoteOperation: CollaborationOperation): CollaborationOperation | null {
    // 检查待处理的本地操作
    for (const localOp of this.pendingOperations.values()) {
      if (this.operationsConflict(localOp, remoteOperation)) {
        return localOp;
      }
    }

    // 检查最近的历史操作
    const recentHistory = this.operationHistory
      .filter(h => h.applied && !h.reverted)
      .slice(-10); // 检查最近10个操作

    for (const historyItem of recentHistory) {
      if (this.operationsConflict(historyItem.operation, remoteOperation)) {
        return historyItem.operation;
      }
    }

    return null;
  }

  /**
   * 判断两个操作是否冲突
   */
  private operationsConflict(op1: CollaborationOperation, op2: CollaborationOperation): boolean {
    // 如果操作同一个节点或边
    if (op1.nodeId && op2.nodeId && op1.nodeId === op2.nodeId) {
      return true;
    }
    
    if (op1.edgeId && op2.edgeId && op1.edgeId === op2.edgeId) {
      return true;
    }

    // 特殊冲突情况
    if (op1.type === 'node-delete' && op2.type === 'node-update' && op1.nodeId === op2.nodeId) {
      return true;
    }

    if (op1.type === 'node-update' && op2.type === 'node-delete' && op1.nodeId === op2.nodeId) {
      return true;
    }

    return false;
  }

  /**
   * 确定冲突类型
   */
  private determineConflictType(localOp: CollaborationOperation, remoteOp: CollaborationOperation): ConflictType {
    // 并发编辑同一节点
    if (localOp.type === 'node-update' && remoteOp.type === 'node-update' && localOp.nodeId === remoteOp.nodeId) {
      return 'concurrent-edit';
    }

    // 删除已修改的节点
    if ((localOp.type === 'node-delete' && remoteOp.type === 'node-update') ||
        (localOp.type === 'node-update' && remoteOp.type === 'node-delete')) {
      return 'delete-modified';
    }

    // 移动冲突（如果有位置信息）
    if (this.hasMoveConflict(localOp, remoteOp)) {
      return 'move-conflict';
    }

    return 'concurrent-edit';
  }

  /**
   * 检查是否有移动冲突
   */
  private hasMoveConflict(op1: CollaborationOperation, op2: CollaborationOperation): boolean {
    // 检查操作数据中是否包含位置信息
    const op1Data = op1.data as any;
    const op2Data = op2.data as any;

    if (op1Data?.position && op2Data?.position && op1.nodeId === op2.nodeId) {
      const pos1 = op1Data.position;
      const pos2 = op2Data.position;
      
      // 如果位置不同，则存在移动冲突
      return pos1.x !== pos2.x || pos1.y !== pos2.y;
    }

    return false;
  }

  /**
   * 获取冲突消息
   */
  private getConflictMessage(type: ConflictType, localOp: CollaborationOperation, remoteOp: CollaborationOperation): string {
    switch (type) {
      case 'concurrent-edit':
        return `用户 ${remoteOp.userId} 同时编辑了节点 ${remoteOp.nodeId}`;
      case 'delete-modified':
        if (localOp.type === 'node-delete') {
          return `您删除的节点 ${localOp.nodeId} 被用户 ${remoteOp.userId} 修改了`;
        } else {
          return `您修改的节点 ${localOp.nodeId} 被用户 ${remoteOp.userId} 删除了`;
        }
      case 'move-conflict':
        return `节点 ${remoteOp.nodeId} 的位置发生冲突`;
      default:
        return '未知冲突类型';
    }
  }

  /**
   * 处理冲突
   */
  private handleConflict(conflict: OperationConflict): void {
    console.warn('检测到操作冲突:', conflict);

    // 添加到冲突队列
    this.conflictQueue.push(conflict);

    // 通知冲突检测回调
    this.conflictDetectedCallbacks.forEach(callback => {
      try {
        callback(conflict);
      } catch (error) {
        console.error('冲突检测回调执行失败:', error);
      }
    });

    // 自动解决冲突
    if (this.config.autoResolveConflicts) {
      this.autoResolveConflict(conflict);
    }
  }

  /**
   * 自动解决冲突
   */
  private autoResolveConflict(conflict: OperationConflict): void {
    let resolution: OperationConflict['resolution'] = 'accept-remote';

    switch (conflict.type) {
      case 'concurrent-edit':
        // 默认接受远程操作（后来者优先）
        resolution = 'accept-remote';
        break;
      case 'delete-modified':
        // 如果本地删除，远程修改，接受删除
        if (conflict.localOperation.type === 'node-delete') {
          resolution = 'accept-local';
        } else {
          // 如果本地修改，远程删除，接受删除
          resolution = 'accept-remote';
        }
        break;
      case 'move-conflict':
        // 移动冲突默认接受远程位置
        resolution = 'accept-remote';
        break;
      default:
        resolution = 'accept-remote';
    }

    this.resolveConflict(conflict, resolution);
  }

  /**
   * 手动解决冲突
   */
  resolveConflict(conflict: OperationConflict, resolution: OperationConflict['resolution']): void {
    conflict.resolution = resolution;

    switch (resolution) {
      case 'accept-local':
        // 保持本地操作，忽略远程操作
        console.log('冲突解决：接受本地操作');
        break;
      case 'accept-remote':
        // 应用远程操作，撤销本地操作
        this.revertLocalOperation(conflict.localOperation);
        this.applyOperation(conflict.remoteOperation);
        console.log('冲突解决：接受远程操作');
        break;
      case 'merge':
        // 尝试合并操作
        const mergedOperation = this.mergeOperations(conflict.localOperation, conflict.remoteOperation);
        if (mergedOperation) {
          this.applyOperation(mergedOperation);
          console.log('冲突解决：合并操作');
        } else {
          // 合并失败，默认接受远程操作
          this.resolveConflict(conflict, 'accept-remote');
        }
        break;
      case 'manual':
        // 需要用户手动处理
        console.log('冲突解决：需要手动处理');
        break;
    }

    // 从冲突队列中移除
    const index = this.conflictQueue.indexOf(conflict);
    if (index > -1) {
      this.conflictQueue.splice(index, 1);
    }

    // 通知冲突解决回调
    this.conflictResolvedCallbacks.forEach(callback => {
      try {
        callback(conflict);
      } catch (error) {
        console.error('冲突解决回调执行失败:', error);
      }
    });
  }

  /**
   * 撤销本地操作
   */
  private revertLocalOperation(operation: CollaborationOperation): void {
    // 从待处理队列中移除
    const operationId = this.generateOperationId(operation);
    this.pendingOperations.delete(operationId);

    // 在历史中标记为已撤销
    const historyItem = this.operationHistory.find(h => 
      h.operation.type === operation.type &&
      h.operation.nodeId === operation.nodeId &&
      h.operation.edgeId === operation.edgeId &&
      h.operation.userId === operation.userId
    );

    if (historyItem) {
      historyItem.reverted = true;
    }

    console.log('撤销本地操作:', operation);
  }

  /**
   * 合并操作
   */
  private mergeOperations(localOp: CollaborationOperation, remoteOp: CollaborationOperation): CollaborationOperation | null {
    // 只有相同类型的操作才能合并
    if (localOp.type !== remoteOp.type || localOp.nodeId !== remoteOp.nodeId) {
      return null;
    }

    // 目前只支持节点更新操作的合并
    if (localOp.type === 'node-update') {
      const localData = localOp.data as any;
      const remoteData = remoteOp.data as any;

      // 简单的属性合并
      const mergedData = {
        ...localData,
        ...remoteData,
        // 保留本地的某些属性
        position: localData?.position || remoteData?.position,
      };

      return {
        ...remoteOp,
        data: mergedData,
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * 生成操作ID
   */
  private generateOperationId(operation: CollaborationOperation): string {
    return `${operation.type}-${operation.nodeId || operation.edgeId}-${operation.userId}-${operation.timestamp.getTime()}`;
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(operation: CollaborationOperation, applied: boolean): void {
    const historyItem: OperationHistory = {
      operation,
      timestamp: new Date(),
      applied,
      reverted: false,
    };

    this.operationHistory.push(historyItem);

    // 限制历史记录大小
    if (this.operationHistory.length > this.config.maxHistorySize) {
      this.operationHistory.shift();
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupHistory();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 清理过期的历史记录
   */
  private cleanupHistory(): void {
    const now = Date.now();
    const cutoffTime = now - this.config.historyRetentionTime;

    this.operationHistory = this.operationHistory.filter(item => 
      item.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * 获取待处理的操作
   */
  getPendingOperations(): CollaborationOperation[] {
    return Array.from(this.pendingOperations.values());
  }

  /**
   * 获取冲突队列
   */
  getConflictQueue(): OperationConflict[] {
    return [...this.conflictQueue];
  }

  /**
   * 获取操作历史
   */
  getOperationHistory(): OperationHistory[] {
    return [...this.operationHistory];
  }

  /**
   * 清除所有待处理操作
   */
  clearPendingOperations(): void {
    this.pendingOperations.clear();
  }

  /**
   * 清除冲突队列
   */
  clearConflictQueue(): void {
    this.conflictQueue.length = 0;
  }

  // 事件监听器注册方法
  onOperationApply(callback: (operation: CollaborationOperation) => void): void {
    this.operationApplyCallbacks.push(callback);
  }

  onConflictDetected(callback: (conflict: OperationConflict) => void): void {
    this.conflictDetectedCallbacks.push(callback);
  }

  onConflictResolved(callback: (conflict: OperationConflict) => void): void {
    this.conflictResolvedCallbacks.push(callback);
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    pendingOperations: number;
    conflictQueue: number;
    historySize: number;
    config: OperationSyncConfig;
  } {
    return {
      pendingOperations: this.pendingOperations.size,
      conflictQueue: this.conflictQueue.length,
      historySize: this.operationHistory.length,
      config: this.config,
    };
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.pendingOperations.clear();
    this.conflictQueue.length = 0;
    this.operationHistory.length = 0;
    
    // 清空所有回调
    this.operationApplyCallbacks.length = 0;
    this.conflictDetectedCallbacks.length = 0;
    this.conflictResolvedCallbacks.length = 0;
  }
}