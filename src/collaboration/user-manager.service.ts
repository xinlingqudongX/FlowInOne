import { Injectable, Logger } from '@nestjs/common';
import { ConnectedUser } from './types/collaboration.types';

/**
 * 用户管理服务
 * 负责管理连接的用户状态和信息
 */
@Injectable()
export class UserManagerService {
  private readonly logger = new Logger(UserManagerService.name);
  private readonly users = new Map<string, ConnectedUser>();
  private readonly clientToUser = new Map<string, string>(); // clientId -> userId 映射

  /**
   * 添加用户
   */
  addUser(user: ConnectedUser): void {
    // 获取客户端ID
    const clientId = this.getClientId(user.client);
    
    // 如果用户已存在，先移除旧连接
    if (this.users.has(user.userId)) {
      this.logger.warn(`用户 ${user.userId} 重复连接，移除旧连接`);
      this.removeUser(user.userId);
    }
    
    this.users.set(user.userId, user);
    this.clientToUser.set(clientId, user.userId);
    
    this.logger.log(
      `添加用户: ${user.displayName} (${user.userId}), ` +
      `客户端ID: ${clientId}, 总用户数: ${this.users.size}`
    );
  }

  /**
   * 移除用户
   */
  removeUser(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      const clientId = this.getClientId(user.client);
      this.clientToUser.delete(clientId);
      this.users.delete(userId);
      
      this.logger.log(
        `移除用户: ${user.displayName} (${userId}), ` +
        `剩余用户数: ${this.users.size}`
      );
    }
  }

  /**
   * 根据用户ID获取用户
   */
  getUser(userId: string): ConnectedUser | null {
    return this.users.get(userId) || null;
  }

  /**
   * 根据客户端ID获取用户
   */
  getUserByClientId(clientId: string): ConnectedUser | null {
    const userId = this.clientToUser.get(clientId);
    return userId ? this.getUser(userId) : null;
  }

  /**
   * 获取所有用户
   */
  getAllUsers(): ConnectedUser[] {
    return Array.from(this.users.values());
  }

  /**
   * 更新用户活动时间
   */
  updateUserActivity(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.lastActivity = new Date();
    }
  }

  /**
   * 更新用户信息
   */
  updateUserInfo(userId: string, userInfo: { displayName?: string }): void {
    const user = this.users.get(userId);
    if (user) {
      if (userInfo.displayName) {
        const oldName = user.displayName;
        user.displayName = userInfo.displayName;
        this.logger.log(`用户 ${userId} 更新显示名称: ${oldName} -> ${userInfo.displayName}`);
      }
    }
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    
    // 检查WebSocket连接状态
    try {
      return user.client && user.client.readyState === 1; // 1 = OPEN
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取用户总数
   */
  getTotalUserCount(): number {
    return this.users.size;
  }

  /**
   * 获取在线用户列表（用于广播）
   */
  getOnlineUsersList(): Array<{
    userId: string;
    displayName: string;
    isOnline: boolean;
    lastSeen: Date;
  }> {
    return Array.from(this.users.values()).map(user => ({
      userId: user.userId,
      displayName: user.displayName,
      isOnline: this.isUserOnline(user.userId),
      lastSeen: user.lastActivity,
    }));
  }

  /**
   * 清理断开连接的用户
   */
  cleanupDisconnectedUsers(): void {
    const disconnectedUsers: string[] = [];
    
    for (const [userId, user] of this.users.entries()) {
      if (!this.isUserOnline(userId)) {
        disconnectedUsers.push(userId);
      }
    }
    
    for (const userId of disconnectedUsers) {
      this.removeUser(userId);
    }
    
    if (disconnectedUsers.length > 0) {
      this.logger.log(`清理了 ${disconnectedUsers.length} 个断开连接的用户`);
    }
  }

  /**
   * 清理不活跃的用户
   */
  cleanupInactiveUsers(maxInactiveTime: number = 1800000): void { // 默认30分钟
    const now = Date.now();
    const inactiveUsers: string[] = [];
    
    for (const [userId, user] of this.users.entries()) {
      const inactiveTime = now - user.lastActivity.getTime();
      
      if (inactiveTime > maxInactiveTime) {
        inactiveUsers.push(userId);
      }
    }
    
    for (const userId of inactiveUsers) {
      this.logger.log(`清理不活跃用户: ${userId}`);
      this.removeUser(userId);
    }
    
    if (inactiveUsers.length > 0) {
      this.logger.log(`清理了 ${inactiveUsers.length} 个不活跃用户`);
    }
  }

  /**
   * 获取用户统计信息
   */
  getUserStats(): {
    totalUsers: number;
    connectedUsers: number;
    disconnectedUsers: number;
    averageSessionTime: number;
  } {
    const now = Date.now();
    let connectedCount = 0;
    let totalSessionTime = 0;
    
    for (const user of this.users.values()) {
      if (this.isUserOnline(user.userId)) {
        connectedCount++;
      }
      totalSessionTime += now - user.joinedAt.getTime();
    }
    
    return {
      totalUsers: this.users.size,
      connectedUsers: connectedCount,
      disconnectedUsers: this.users.size - connectedCount,
      averageSessionTime: this.users.size > 0 ? totalSessionTime / this.users.size : 0,
    };
  }

  /**
   * 根据显示名称查找用户
   */
  findUsersByDisplayName(displayName: string): ConnectedUser[] {
    return Array.from(this.users.values()).filter(
      user => user.displayName.toLowerCase().includes(displayName.toLowerCase())
    );
  }

  /**
   * 检查显示名称是否已被使用
   */
  isDisplayNameTaken(displayName: string, excludeUserId?: string): boolean {
    for (const [userId, user] of this.users.entries()) {
      if (userId !== excludeUserId && user.displayName === displayName) {
        return true;
      }
    }
    return false;
  }

  /**
   * 生成唯一的显示名称
   */
  generateUniqueDisplayName(baseName: string): string {
    let counter = 1;
    let uniqueName = baseName;
    
    while (this.isDisplayNameTaken(uniqueName)) {
      uniqueName = `${baseName} (${counter})`;
      counter++;
    }
    
    return uniqueName;
  }

  /**
   * 强制断开用户连接
   */
  disconnectUser(userId: string, reason?: string): void {
    const user = this.users.get(userId);
    if (user) {
      this.logger.log(`强制断开用户 ${user.displayName} (${userId}): ${reason || '无原因'}`);
      user.client.disconnect(true);
      this.removeUser(userId);
    }
  }

  /**
   * 向特定用户发送消息
   */
  sendMessageToUser(userId: string, event: string, data: any): boolean {
    const user = this.users.get(userId);
    if (user && user.client.connected) {
      user.client.emit(event, data);
      return true;
    }
    return false;
  }

  /**
   * 向所有用户广播消息
   */
  broadcastToAllUsers(event: string, data: any): void {
    let sentCount = 0;
    
    for (const user of this.users.values()) {
      if (user.client.connected) {
        user.client.emit(event, data);
        sentCount++;
      }
    }
    
    this.logger.log(`向 ${sentCount} 个用户广播消息: ${event}`);
  }

  /**
   * 获取用户的连接时长
   */
  getUserSessionTime(userId: string): number | null {
    const user = this.users.get(userId);
    return user ? Date.now() - user.joinedAt.getTime() : null;
  }

  /**
   * 清空所有用户（用于测试或维护）
   */
  clearAllUsers(): void {
    const userCount = this.users.size;
    
    // 断开所有连接
    for (const user of this.users.values()) {
      if (user.client.connected) {
        user.client.disconnect(true);
      }
    }
    
    this.users.clear();
    this.clientToUser.clear();
    
    this.logger.warn(`强制清空了所有用户 (${userCount} 个)`);
  }

  /**
   * 获取客户端ID
   */
  private getClientId(client: any): string {
    // 为WebSocket客户端生成唯一ID
    if (!client._clientId) {
      client._clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return client._clientId;
  }
}