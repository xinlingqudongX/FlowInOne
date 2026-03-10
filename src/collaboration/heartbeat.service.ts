import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RoomManagerService } from './room-manager.service';
import { UserManagerService } from './user-manager.service';
import { COLLABORATION_CONFIG } from './types/collaboration.types';

/**
 * 心跳服务
 * 负责检测僵尸连接、清理不活跃用户和房间
 */
@Injectable()
export class HeartbeatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeartbeatService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;
  private startTime: Date = new Date();

  constructor(
    private readonly roomManager: RoomManagerService,
    private readonly userManager: UserManagerService,
  ) {}

  /**
   * 模块初始化时启动清理任务
   */
  onModuleInit() {
    this.startCleanupTask();
    this.logger.log('心跳服务已启动');
  }

  /**
   * 模块销毁时停止清理任务
   */
  onModuleDestroy() {
    this.stopCleanupTask();
    this.logger.log('心跳服务已停止');
  }

  /**
   * 启动定期清理任务
   */
  private startCleanupTask() {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, COLLABORATION_CONFIG.CLEANUP_INTERVAL);
    
    this.logger.log(`清理任务已启动，间隔: ${COLLABORATION_CONFIG.CLEANUP_INTERVAL}ms`);
  }

  /**
   * 停止清理任务
   */
  private stopCleanupTask() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 执行清理操作
   */
  private performCleanup() {
    try {
      this.logger.debug('开始执行清理任务');
      
      // 清理断开连接的用户
      this.userManager.cleanupDisconnectedUsers();
      
      // 清理不活跃的用户
      this.userManager.cleanupInactiveUsers(COLLABORATION_CONFIG.INACTIVE_USER_TIMEOUT);
      
      // 清理不活跃的房间
      this.roomManager.cleanupInactiveRooms(COLLABORATION_CONFIG.INACTIVE_ROOM_TIMEOUT);
      
      // 记录统计信息
      const stats = this.getServiceStats();
      this.logger.debug(
        `清理完成 - 房间数: ${stats.totalRooms}, 用户数: ${stats.totalUsers}, ` +
        `运行时间: ${Math.round(stats.uptime / 1000)}秒`
      );
      
    } catch (error) {
      this.logger.error(`清理任务执行失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 手动触发清理
   */
  triggerCleanup() {
    this.logger.log('手动触发清理任务');
    this.performCleanup();
  }

  /**
   * 检测僵尸连接
   */
  detectZombieConnections(): string[] {
    const zombieUsers: string[] = [];
    const users = this.userManager.getAllUsers();
    
    for (const user of users) {
      // 检查连接状态
      if (!user.client.connected) {
        zombieUsers.push(user.userId);
        continue;
      }
      
      // 检查最后活动时间
      const inactiveTime = Date.now() - user.lastActivity.getTime();
      if (inactiveTime > COLLABORATION_CONFIG.INACTIVE_USER_TIMEOUT) {
        zombieUsers.push(user.userId);
      }
    }
    
    return zombieUsers;
  }

  /**
   * 清理僵尸连接
   */
  cleanupZombieConnections(): number {
    const zombieUsers = this.detectZombieConnections();
    
    for (const userId of zombieUsers) {
      this.logger.log(`清理僵尸连接: ${userId}`);
      this.userManager.removeUser(userId);
    }
    
    return zombieUsers.length;
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats() {
    const uptime = Date.now() - this.startTime.getTime();
    const memoryUsage = process.memoryUsage();
    
    return {
      totalRooms: this.roomManager.getRoomCount(),
      totalUsers: this.userManager.getTotalUserCount(),
      uptime,
      memoryUsage,
      startTime: this.startTime,
    };
  }

  /**
   * 获取详细的房间统计信息
   */
  getRoomStats() {
    return this.roomManager.getRoomStats();
  }

  /**
   * 获取详细的用户统计信息
   */
  getUserStats() {
    return this.userManager.getUserStats();
  }

  /**
   * 健康检查
   */
  healthCheck(): {
    status: 'healthy' | 'warning' | 'error';
    details: {
      uptime: number;
      memoryUsage: NodeJS.MemoryUsage;
      totalRooms: number;
      totalUsers: number;
      zombieConnections: number;
      cleanupTaskRunning: boolean;
    };
  } {
    const stats = this.getServiceStats();
    const zombieCount = this.detectZombieConnections().length;
    
    // 判断健康状态
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    
    // 内存使用超过500MB时警告
    if (stats.memoryUsage.heapUsed > 500 * 1024 * 1024) {
      status = 'warning';
    }
    
    // 僵尸连接超过10个时警告
    if (zombieCount > 10) {
      status = 'warning';
    }
    
    // 清理任务未运行时错误
    if (!this.cleanupInterval) {
      status = 'error';
    }
    
    return {
      status,
      details: {
        uptime: stats.uptime,
        memoryUsage: stats.memoryUsage,
        totalRooms: stats.totalRooms,
        totalUsers: stats.totalUsers,
        zombieConnections: zombieCount,
        cleanupTaskRunning: this.cleanupInterval !== null,
      },
    };
  }

  /**
   * 重启清理任务
   */
  restartCleanupTask() {
    this.logger.log('重启清理任务');
    this.stopCleanupTask();
    this.startCleanupTask();
  }

  /**
   * 设置清理间隔
   */
  setCleanupInterval(intervalMs: number) {
    if (intervalMs < 60000) { // 最小1分钟
      throw new Error('清理间隔不能小于60秒');
    }
    
    this.logger.log(`更新清理间隔: ${intervalMs}ms`);
    this.stopCleanupTask();
    
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, intervalMs);
  }

  /**
   * 强制清理所有数据（用于测试或紧急情况）
   */
  forceCleanupAll() {
    this.logger.warn('执行强制清理所有数据');
    
    this.userManager.clearAllUsers();
    this.roomManager.clearAllRooms();
    
    // 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * 获取运行时间（毫秒）
   */
  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * 获取运行时间（格式化字符串）
   */
  getUptimeString(): string {
    const uptime = this.getUptime();
    const seconds = Math.floor(uptime / 1000) % 60;
    const minutes = Math.floor(uptime / (1000 * 60)) % 60;
    const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `${days}天 ${hours}小时 ${minutes}分钟 ${seconds}秒`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟 ${seconds}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}