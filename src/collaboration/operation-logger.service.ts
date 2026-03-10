import { Injectable, Logger } from '@nestjs/common';
import { 
  CollaborationOperation, 
  WebSocketMessage,
  ConnectedUser 
} from './types/collaboration.types';

/**
 * 操作日志记录器接口
 */
export interface OperationLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  displayName: string;
  projectId: string;
  operationType: string;
  details: any;
  clientIP?: string;
  sessionId: string;
}

/**
 * 操作日志服务
 * 负责记录所有协同操作，用于审计、调试和分析
 */
@Injectable()
export class OperationLoggerService {
  private readonly logger = new Logger(OperationLoggerService.name);
  private readonly operationLogs: OperationLogEntry[] = [];
  private readonly maxLogEntries = 10000; // 最大日志条目数
  private logIdCounter = 0;

  /**
   * 记录用户加入操作
   */
  logUserJoin(user: ConnectedUser, projectId: string, clientIP?: string) {
    this.addLogEntry({
      userId: user.userId,
      displayName: user.displayName,
      projectId,
      operationType: 'user-join',
      details: {
        joinedAt: user.joinedAt,
      },
      clientIP,
      sessionId: user.client.id,
    });
  }

  /**
   * 记录用户离开操作
   */
  logUserLeave(user: ConnectedUser, projectId: string, reason?: string) {
    const sessionTime = Date.now() - user.joinedAt.getTime();
    
    this.addLogEntry({
      userId: user.userId,
      displayName: user.displayName,
      projectId,
      operationType: 'user-leave',
      details: {
        leftAt: new Date(),
        sessionTime,
        reason: reason || 'normal',
      },
      sessionId: user.client.id,
    });
  }

  /**
   * 记录光标移动操作（采样记录，避免日志过多）
   */
  logCursorMove(userId: string, displayName: string, projectId: string, position: { x: number; y: number }) {
    // 只记录每10秒的第一次光标移动，避免日志过多
    const now = Date.now();
    const lastCursorLog = this.getLastLogEntry(userId, 'cursor-move');
    
    if (!lastCursorLog || (now - lastCursorLog.timestamp.getTime()) > 10000) {
      this.addLogEntry({
        userId,
        displayName,
        projectId,
        operationType: 'cursor-move',
        details: {
          position,
          sampledAt: new Date(),
        },
        sessionId: this.getCurrentSessionId(userId),
      });
    }
  }

  /**
   * 记录节点操作
   */
  logNodeOperation(
    userId: string, 
    displayName: string, 
    projectId: string, 
    operation: CollaborationOperation
  ) {
    this.addLogEntry({
      userId,
      displayName,
      projectId,
      operationType: 'node-operation',
      details: {
        operation: {
          type: operation.type,
          nodeId: operation.nodeId,
          edgeId: operation.edgeId,
          timestamp: operation.timestamp,
        },
        dataSize: operation.data ? JSON.stringify(operation.data).length : 0,
      },
      sessionId: this.getCurrentSessionId(userId),
    });
  }

  /**
   * 记录用户信息更新操作
   */
  logUserInfoUpdate(
    userId: string, 
    oldDisplayName: string, 
    newDisplayName: string, 
    projectId: string
  ) {
    this.addLogEntry({
      userId,
      displayName: newDisplayName,
      projectId,
      operationType: 'user-info-update',
      details: {
        oldDisplayName,
        newDisplayName,
      },
      sessionId: this.getCurrentSessionId(userId),
    });
  }

  /**
   * 记录连接事件
   */
  logConnectionEvent(
    eventType: 'connect' | 'disconnect' | 'heartbeat-timeout' | 'force-disconnect',
    sessionId: string,
    userId?: string,
    displayName?: string,
    details?: any
  ) {
    this.addLogEntry({
      userId: userId || 'unknown',
      displayName: displayName || 'unknown',
      projectId: 'system',
      operationType: `connection-${eventType}`,
      details: {
        sessionId,
        ...details,
      },
      sessionId,
    });
  }

  /**
   * 记录错误事件
   */
  logError(
    userId: string,
    displayName: string,
    projectId: string,
    errorType: string,
    errorMessage: string,
    errorDetails?: any
  ) {
    this.addLogEntry({
      userId,
      displayName,
      projectId,
      operationType: 'error',
      details: {
        errorType,
        errorMessage,
        errorDetails,
        stack: errorDetails?.stack,
      },
      sessionId: this.getCurrentSessionId(userId),
    });
  }

  /**
   * 记录系统事件
   */
  logSystemEvent(
    eventType: string,
    details: any
  ) {
    this.addLogEntry({
      userId: 'system',
      displayName: 'system',
      projectId: 'system',
      operationType: `system-${eventType}`,
      details,
      sessionId: 'system',
    });
  }

  /**
   * 添加日志条目
   */
  private addLogEntry(entry: Omit<OperationLogEntry, 'id' | 'timestamp'>) {
    const logEntry: OperationLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      ...entry,
    };

    this.operationLogs.push(logEntry);

    // 限制日志数量，移除最旧的条目
    if (this.operationLogs.length > this.maxLogEntries) {
      const removedCount = this.operationLogs.length - this.maxLogEntries;
      this.operationLogs.splice(0, removedCount);
      
      if (removedCount > 0) {
        this.logger.debug(`移除了 ${removedCount} 个旧日志条目`);
      }
    }

    // 记录到控制台（仅重要操作）
    if (this.isImportantOperation(entry.operationType)) {
      this.logger.log(
        `[${entry.operationType}] ${entry.displayName} (${entry.userId}) ` +
        `在项目 ${entry.projectId} 中执行操作`
      );
    }
  }

  /**
   * 生成日志ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${++this.logIdCounter}`;
  }

  /**
   * 获取当前会话ID
   */
  private getCurrentSessionId(userId: string): string {
    // 这里可以从用户管理器获取当前会话ID
    // 暂时返回一个占位符
    return `session_${userId}_${Date.now()}`;
  }

  /**
   * 获取最后一条日志条目
   */
  private getLastLogEntry(userId: string, operationType: string): OperationLogEntry | null {
    for (let i = this.operationLogs.length - 1; i >= 0; i--) {
      const entry = this.operationLogs[i];
      if (entry.userId === userId && entry.operationType === operationType) {
        return entry;
      }
    }
    return null;
  }

  /**
   * 判断是否为重要操作
   */
  private isImportantOperation(operationType: string): boolean {
    const importantOps = [
      'user-join',
      'user-leave',
      'node-operation',
      'user-info-update',
      'connection-disconnect',
      'connection-force-disconnect',
      'error',
    ];
    return importantOps.includes(operationType);
  }

  /**
   * 获取操作日志
   */
  getOperationLogs(options: {
    userId?: string;
    projectId?: string;
    operationType?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  } = {}): OperationLogEntry[] {
    let filteredLogs = [...this.operationLogs];

    // 应用过滤条件
    if (options.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === options.userId);
    }

    if (options.projectId) {
      filteredLogs = filteredLogs.filter(log => log.projectId === options.projectId);
    }

    if (options.operationType) {
      filteredLogs = filteredLogs.filter(log => log.operationType === options.operationType);
    }

    if (options.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.startTime!);
    }

    if (options.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= options.endTime!);
    }

    // 按时间倒序排序
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 应用分页
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    
    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * 获取操作统计信息
   */
  getOperationStats(projectId?: string): {
    totalOperations: number;
    operationsByType: Record<string, number>;
    operationsByUser: Record<string, number>;
    operationsByHour: Record<string, number>;
    recentActivity: OperationLogEntry[];
  } {
    let logs = this.operationLogs;
    
    if (projectId) {
      logs = logs.filter(log => log.projectId === projectId);
    }

    const operationsByType: Record<string, number> = {};
    const operationsByUser: Record<string, number> = {};
    const operationsByHour: Record<string, number> = {};

    for (const log of logs) {
      // 按类型统计
      operationsByType[log.operationType] = (operationsByType[log.operationType] || 0) + 1;

      // 按用户统计
      const userKey = `${log.displayName} (${log.userId})`;
      operationsByUser[userKey] = (operationsByUser[userKey] || 0) + 1;

      // 按小时统计
      const hourKey = log.timestamp.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      operationsByHour[hourKey] = (operationsByHour[hourKey] || 0) + 1;
    }

    // 获取最近的活动
    const recentActivity = logs
      .filter(log => log.operationType !== 'cursor-move') // 排除光标移动
      .slice(0, 20);

    return {
      totalOperations: logs.length,
      operationsByType,
      operationsByUser,
      operationsByHour,
      recentActivity,
    };
  }

  /**
   * 获取用户活动摘要
   */
  getUserActivitySummary(userId: string): {
    totalOperations: number;
    sessionCount: number;
    totalSessionTime: number;
    averageSessionTime: number;
    operationsByType: Record<string, number>;
    projectsVisited: string[];
    firstSeen: Date | null;
    lastSeen: Date | null;
  } {
    const userLogs = this.operationLogs.filter(log => log.userId === userId);
    
    if (userLogs.length === 0) {
      return {
        totalOperations: 0,
        sessionCount: 0,
        totalSessionTime: 0,
        averageSessionTime: 0,
        operationsByType: {},
        projectsVisited: [],
        firstSeen: null,
        lastSeen: null,
      };
    }

    const operationsByType: Record<string, number> = {};
    const projectsVisited = new Set<string>();
    const sessions = new Set<string>();
    let totalSessionTime = 0;

    for (const log of userLogs) {
      operationsByType[log.operationType] = (operationsByType[log.operationType] || 0) + 1;
      projectsVisited.add(log.projectId);
      sessions.add(log.sessionId);

      // 计算会话时间（从用户离开日志中获取）
      if (log.operationType === 'user-leave' && log.details.sessionTime) {
        totalSessionTime += log.details.sessionTime;
      }
    }

    const sortedLogs = userLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      totalOperations: userLogs.length,
      sessionCount: sessions.size,
      totalSessionTime,
      averageSessionTime: sessions.size > 0 ? totalSessionTime / sessions.size : 0,
      operationsByType,
      projectsVisited: Array.from(projectsVisited).filter(p => p !== 'system'),
      firstSeen: sortedLogs[0]?.timestamp || null,
      lastSeen: sortedLogs[sortedLogs.length - 1]?.timestamp || null,
    };
  }

  /**
   * 清理旧日志
   */
  cleanupOldLogs(maxAge: number = 7 * 24 * 60 * 60 * 1000) { // 默认7天
    const cutoffTime = new Date(Date.now() - maxAge);
    const initialCount = this.operationLogs.length;
    
    // 移除旧日志
    const filteredLogs = this.operationLogs.filter(log => log.timestamp > cutoffTime);
    this.operationLogs.splice(0, this.operationLogs.length, ...filteredLogs);
    
    const removedCount = initialCount - this.operationLogs.length;
    
    if (removedCount > 0) {
      this.logger.log(`清理了 ${removedCount} 个旧日志条目`);
    }
    
    return removedCount;
  }

  /**
   * 导出日志数据
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['ID', '时间戳', '用户ID', '显示名称', '项目ID', '操作类型', '详情', '会话ID'];
      const rows = this.operationLogs.map(log => [
        log.id,
        log.timestamp.toISOString(),
        log.userId,
        log.displayName,
        log.projectId,
        log.operationType,
        JSON.stringify(log.details),
        log.sessionId,
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(this.operationLogs, null, 2);
  }

  /**
   * 获取日志存储状态
   */
  getLogStorageStatus(): {
    totalLogs: number;
    maxLogs: number;
    usagePercentage: number;
    oldestLog: Date | null;
    newestLog: Date | null;
    memoryUsageEstimate: number;
  } {
    const totalLogs = this.operationLogs.length;
    const sortedLogs = [...this.operationLogs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // 估算内存使用量
    const sampleLog = this.operationLogs[0];
    const estimatedSizePerLog = sampleLog ? JSON.stringify(sampleLog).length * 2 : 1000; // 字符数 * 2 (UTF-16)
    const memoryUsageEstimate = totalLogs * estimatedSizePerLog;

    return {
      totalLogs,
      maxLogs: this.maxLogEntries,
      usagePercentage: (totalLogs / this.maxLogEntries) * 100,
      oldestLog: sortedLogs[0]?.timestamp || null,
      newestLog: sortedLogs[sortedLogs.length - 1]?.timestamp || null,
      memoryUsageEstimate,
    };
  }
}