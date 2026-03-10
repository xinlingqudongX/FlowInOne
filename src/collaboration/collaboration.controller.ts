import { Controller, Get, Post, Delete, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RoomManagerService } from './room-manager.service';
import { UserManagerService } from './user-manager.service';
import { ConnectionManagerService } from './connection-manager.service';
import { OperationLoggerService, OperationLogEntry } from './operation-logger.service';
import { HeartbeatService } from './heartbeat.service';

/**
 * 协同功能REST API控制器
 * 提供协同服务的监控、管理和统计接口
 */
@ApiTags('协同功能')
@Controller('api/collaboration')
export class CollaborationController {
  constructor(
    private readonly roomManager: RoomManagerService,
    private readonly userManager: UserManagerService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly operationLogger: OperationLoggerService,
    private readonly heartbeatService: HeartbeatService,
  ) {}

  /**
   * 获取服务器统计信息
   */
  @Get('stats')
  @ApiOperation({ summary: '获取协同服务器统计信息' })
  @ApiResponse({ status: 200, description: '返回服务器统计信息' })
  getServerStats() {
    const heartbeatStats = this.heartbeatService.getServiceStats();
    const userStats = this.userManager.getUserStats();
    
    return {
      ...heartbeatStats,
      userStats,
      uptimeString: this.heartbeatService.getUptimeString(),
    };
  }

  /**
   * 获取所有房间信息
   */
  @Get('rooms')
  @ApiOperation({ summary: '获取所有项目房间信息' })
  @ApiResponse({ status: 200, description: '返回房间列表' })
  getRooms() {
    return {
      rooms: this.heartbeatService.getRoomStats(),
      totalRooms: this.roomManager.getRoomCount(),
    };
  }

  /**
   * 获取特定房间信息
   */
  @Get('rooms/:projectId')
  @ApiOperation({ summary: '获取特定项目房间信息' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({ status: 200, description: '返回房间信息' })
  @ApiResponse({ status: 404, description: '房间不存在' })
  getRoom(@Param('projectId') projectId: string) {
    const room = this.roomManager.getRoom(projectId);
    if (!room) {
      return { error: '房间不存在' };
    }
    
    const users = this.roomManager.getUsersInRoom(projectId);
    
    return {
      projectId: room.projectId,
      userCount: users.length,
      users: users.map(user => ({
        userId: user.userId,
        displayName: user.displayName,
        joinedAt: user.joinedAt,
        lastActivity: user.lastActivity,
        connected: user.client.connected,
      })),
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
    };
  }

  /**
   * 获取所有在线用户
   */
  @Get('users')
  @ApiOperation({ summary: '获取所有在线用户信息' })
  @ApiResponse({ status: 200, description: '返回用户列表' })
  getUsers() {
    const users = this.userManager.getAllUsers();
    const userStats = this.userManager.getUserStats();
    
    return {
      users: users.map(user => ({
        userId: user.userId,
        displayName: user.displayName,
        joinedAt: user.joinedAt,
        lastActivity: user.lastActivity,
        connected: user.client.connected,
        sessionTime: Date.now() - user.joinedAt.getTime(),
        rooms: this.roomManager.getUserRooms(user.userId),
      })),
      stats: userStats,
    };
  }

  /**
   * 获取特定用户信息
   */
  @Get('users/:userId')
  @ApiOperation({ summary: '获取特定用户信息' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '返回用户信息' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  getUser(@Param('userId') userId: string) {
    const user = this.userManager.getUser(userId);
    if (!user) {
      return { error: '用户不存在' };
    }
    
    return {
      userId: user.userId,
      displayName: user.displayName,
      joinedAt: user.joinedAt,
      lastActivity: user.lastActivity,
      connected: user.client.connected,
      sessionTime: Date.now() - user.joinedAt.getTime(),
      rooms: this.roomManager.getUserRooms(user.userId),
    };
  }

  /**
   * 健康检查
   */
  @Get('health')
  @ApiOperation({ summary: '协同服务健康检查' })
  @ApiResponse({ status: 200, description: '服务健康' })
  @ApiResponse({ status: 503, description: '服务异常' })
  healthCheck() {
    const health = this.heartbeatService.healthCheck();
    
    return {
      ...health,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 手动触发清理任务
   */
  @Post('cleanup')
  @ApiOperation({ summary: '手动触发清理任务' })
  @ApiResponse({ status: 200, description: '清理任务已触发' })
  @HttpCode(HttpStatus.OK)
  triggerCleanup() {
    this.heartbeatService.triggerCleanup();
    
    return {
      message: '清理任务已触发',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 清理僵尸连接
   */
  @Post('cleanup/zombies')
  @ApiOperation({ summary: '清理僵尸连接' })
  @ApiResponse({ status: 200, description: '僵尸连接已清理' })
  @HttpCode(HttpStatus.OK)
  cleanupZombies() {
    const cleanedCount = this.heartbeatService.cleanupZombieConnections();
    
    return {
      message: `已清理 ${cleanedCount} 个僵尸连接`,
      cleanedCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 强制断开用户连接
   */
  @Delete('users/:userId')
  @ApiOperation({ summary: '强制断开用户连接' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiQuery({ name: 'reason', description: '断开原因', required: false })
  @ApiResponse({ status: 200, description: '用户已断开' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @HttpCode(HttpStatus.OK)
  disconnectUser(
    @Param('userId') userId: string,
    @Query('reason') reason?: string
  ) {
    const user = this.userManager.getUser(userId);
    if (!user) {
      return { error: '用户不存在' };
    }
    
    this.userManager.disconnectUser(userId, reason);
    
    return {
      message: `用户 ${user.displayName} 已断开连接`,
      reason: reason || '管理员操作',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 删除空房间
   */
  @Delete('rooms/empty')
  @ApiOperation({ summary: '删除所有空房间' })
  @ApiResponse({ status: 200, description: '空房间已删除' })
  @HttpCode(HttpStatus.OK)
  deleteEmptyRooms() {
    const roomStats = this.heartbeatService.getRoomStats();
    const emptyRooms = roomStats.filter(room => room.userCount === 0);
    
    for (const room of emptyRooms) {
      this.roomManager.deleteRoom(room.projectId);
    }
    
    return {
      message: `已删除 ${emptyRooms.length} 个空房间`,
      deletedRooms: emptyRooms.map(room => room.projectId),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 删除特定房间
   */
  @Delete('rooms/:projectId')
  @ApiOperation({ summary: '删除特定项目房间' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiQuery({ name: 'force', description: '是否强制删除（即使有用户）', required: false })
  @ApiResponse({ status: 200, description: '房间已删除' })
  @ApiResponse({ status: 400, description: '房间不为空，无法删除' })
  @HttpCode(HttpStatus.OK)
  deleteRoom(
    @Param('projectId') projectId: string,
    @Query('force') force?: string
  ) {
    const room = this.roomManager.getRoom(projectId);
    if (!room) {
      return { error: '房间不存在' };
    }
    
    const isForce = force === 'true';
    
    if (room.users.size > 0 && !isForce) {
      return {
        error: '房间不为空，无法删除',
        userCount: room.users.size,
        suggestion: '使用 ?force=true 参数强制删除',
      };
    }
    
    // 如果是强制删除，先断开所有用户
    if (isForce && room.users.size > 0) {
      for (const user of room.users.values()) {
        this.userManager.disconnectUser(user.userId, '房间被管理员删除');
      }
    }
    
    this.roomManager.deleteRoom(projectId);
    
    return {
      message: `房间 ${projectId} 已删除`,
      wasForced: isForce,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 重启清理任务
   */
  @Post('cleanup/restart')
  @ApiOperation({ summary: '重启清理任务' })
  @ApiResponse({ status: 200, description: '清理任务已重启' })
  @HttpCode(HttpStatus.OK)
  restartCleanupTask() {
    this.heartbeatService.restartCleanupTask();
    
    return {
      message: '清理任务已重启',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取运行时间
   */
  @Get('uptime')
  @ApiOperation({ summary: '获取服务运行时间' })
  @ApiResponse({ status: 200, description: '返回运行时间信息' })
  getUptime() {
    return {
      uptime: this.heartbeatService.getUptime(),
      uptimeString: this.heartbeatService.getUptimeString(),
      startTime: this.heartbeatService.getServiceStats().startTime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取连接统计信息
   */
  @Get('connections')
  @ApiOperation({ summary: '获取连接统计信息' })
  @ApiResponse({ status: 200, description: '返回连接统计信息' })
  getConnectionStats() {
    return this.connectionManager.getConnectionStats();
  }

  /**
   * 获取操作日志
   */
  @Get('logs')
  @ApiOperation({ summary: '获取操作日志' })
  @ApiQuery({ name: 'userId', description: '用户ID', required: false })
  @ApiQuery({ name: 'projectId', description: '项目ID', required: false })
  @ApiQuery({ name: 'operationType', description: '操作类型', required: false })
  @ApiQuery({ name: 'limit', description: '返回数量限制', required: false })
  @ApiQuery({ name: 'offset', description: '偏移量', required: false })
  @ApiResponse({ status: 200, description: '返回操作日志' })
  getOperationLogs(
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
    @Query('operationType') operationType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const options = {
      userId,
      projectId,
      operationType,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return {
      logs: this.operationLogger.getOperationLogs(options),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取操作统计信息
   */
  @Get('logs/stats')
  @ApiOperation({ summary: '获取操作统计信息' })
  @ApiQuery({ name: 'projectId', description: '项目ID', required: false })
  @ApiResponse({ status: 200, description: '返回操作统计信息' })
  getOperationStats(@Query('projectId') projectId?: string) {
    return this.operationLogger.getOperationStats(projectId);
  }

  /**
   * 获取用户活动摘要
   */
  @Get('users/:userId/activity')
  @ApiOperation({ summary: '获取用户活动摘要' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '返回用户活动摘要' })
  getUserActivity(@Param('userId') userId: string) {
    return this.operationLogger.getUserActivitySummary(userId);
  }

  /**
   * 导出操作日志
   */
  @Get('logs/export')
  @ApiOperation({ summary: '导出操作日志' })
  @ApiQuery({ name: 'format', description: '导出格式 (json|csv)', required: false })
  @ApiResponse({ status: 200, description: '返回导出的日志数据' })
  exportLogs(@Query('format') format: 'json' | 'csv' = 'json') {
    const data = this.operationLogger.exportLogs(format);
    
    return {
      format,
      data,
      exportedAt: new Date().toISOString(),
      totalRecords: this.operationLogger.getLogStorageStatus().totalLogs,
    };
  }

  /**
   * 获取日志存储状态
   */
  @Get('logs/storage')
  @ApiOperation({ summary: '获取日志存储状态' })
  @ApiResponse({ status: 200, description: '返回日志存储状态' })
  getLogStorageStatus() {
    return this.operationLogger.getLogStorageStatus();
  }

  /**
   * 清理旧日志
   */
  @Post('logs/cleanup')
  @ApiOperation({ summary: '清理旧日志' })
  @ApiQuery({ name: 'maxAge', description: '最大保留时间（毫秒）', required: false })
  @ApiResponse({ status: 200, description: '日志清理完成' })
  @HttpCode(HttpStatus.OK)
  cleanupOldLogs(@Query('maxAge') maxAge?: string) {
    const maxAgeMs = maxAge ? parseInt(maxAge, 10) : undefined;
    const removedCount = this.operationLogger.cleanupOldLogs(maxAgeMs);
    
    return {
      message: `已清理 ${removedCount} 个旧日志条目`,
      removedCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 设置连接限制
   */
  @Post('connections/limits')
  @ApiOperation({ summary: '设置连接限制' })
  @ApiQuery({ name: 'maxPerIP', description: '单IP最大连接数', required: false })
  @ApiQuery({ name: 'maxTotal', description: '服务器最大总连接数', required: false })
  @ApiResponse({ status: 200, description: '连接限制已更新' })
  @HttpCode(HttpStatus.OK)
  setConnectionLimits(
    @Query('maxPerIP') maxPerIP?: string,
    @Query('maxTotal') maxTotal?: string,
  ) {
    const maxPerIPNum = maxPerIP ? parseInt(maxPerIP, 10) : undefined;
    const maxTotalNum = maxTotal ? parseInt(maxTotal, 10) : undefined;
    
    if (maxPerIPNum || maxTotalNum) {
      this.connectionManager.setConnectionLimits(
        maxPerIPNum || 10,
        maxTotalNum || 1000
      );
    }
    
    return {
      message: '连接限制已更新',
      currentLimits: this.connectionManager.getConnectionStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 广播服务器消息
   */
  @Post('broadcast')
  @ApiOperation({ summary: '广播服务器消息' })
  @ApiQuery({ name: 'message', description: '消息内容', required: true })
  @ApiQuery({ name: 'level', description: '消息级别 (info|warning|error)', required: false })
  @ApiResponse({ status: 200, description: '消息已广播' })
  @HttpCode(HttpStatus.OK)
  broadcastMessage(
    @Query('message') message: string,
    @Query('level') level: 'info' | 'warning' | 'error' = 'info',
  ) {
    this.connectionManager.broadcastServerMessage(message, level);
    
    return {
      message: '服务器消息已广播',
      broadcastMessage: message,
      level,
      timestamp: new Date().toISOString(),
    };
  }
}