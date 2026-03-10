import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { RoomManagerService } from './room-manager.service';
import { UserManagerService } from './user-manager.service';
import { MessageHandlerService } from './message-handler.service';
import { ConnectionManagerService } from './connection-manager.service';
import { OperationLoggerService } from './operation-logger.service';
import { 
  WebSocketMessage, 
  ConnectedUser,
  CursorPosition,
  CollaborationOperation 
} from './types/collaboration.types';

/**
 * WebSocket网关 - 处理实时协同功能
 * 负责客户端连接管理、消息路由和房间管理
 */
@WebSocketGateway({
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/ws',
    transports: ['websocket'],
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: any;

  private readonly logger = new Logger(CollaborationGateway.name);

  constructor(
    private readonly roomManager: RoomManagerService,
    private readonly userManager: UserManagerService,
    private readonly messageHandler: MessageHandlerService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly operationLogger: OperationLoggerService,
  ) {}

  /**
   * 处理客户端连接
   */
  async handleConnection(client: any, request?: any) {
    this.logger.log(`客户端连接: ${this.getClientId(client)}`);
    
    // 使用连接管理器处理连接
    const connectionAccepted = this.connectionManager.handleConnection(client, request);
    
    if (connectionAccepted) {
      // 设置服务器实例
      this.connectionManager.setServer(this.server);
      
      // 记录连接事件
      this.operationLogger.logConnectionEvent('connect', this.getClientId(client));
      
      // 发送连接确认消息
      this.sendMessage(client, {
        type: 'connection-established',
        projectId: '',
        userId: '',
        timestamp: new Date().toISOString(),
        data: {
          clientId: this.getClientId(client),
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * 处理客户端断开连接
   */
  async handleDisconnect(client: any) {
    this.logger.log(`客户端断开连接: ${this.getClientId(client)}`);
    
    try {
      // 获取用户信息用于日志记录
      const user = this.userManager.getUserByClientId(this.getClientId(client));
      
      // 使用连接管理器处理断开连接
      this.connectionManager.handleDisconnection(client);
      
      // 记录断开连接事件
      if (user) {
        this.operationLogger.logConnectionEvent(
          'disconnect', 
          this.getClientId(client), 
          user.userId, 
          user.displayName
        );
      } else {
        this.operationLogger.logConnectionEvent('disconnect', this.getClientId(client));
      }
      
    } catch (error) {
      this.logger.error(`处理断开连接时出错: ${error.message}`, error.stack);
    }
  }

  /**
   * 发送消息到客户端
   */
  private sendMessage(client: any, message: WebSocketMessage): void {
    try {
      if (client.readyState === 1) { // 1 = OPEN
        client.send(JSON.stringify(message));
      }
    } catch (error) {
      this.logger.error(`发送消息失败: ${error.message}`);
    }
  }

  /**
   * 发送错误消息
   */
  private sendErrorMessage(client: any, error: { message: string; code: string }): void {
    this.sendMessage(client, {
      type: 'error',
      projectId: '',
      userId: '',
      timestamp: new Date().toISOString(),
      data: error,
    });
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

  /**
   * 广播消息到房间
   */
  private broadcastToRoom(projectId: string, message: WebSocketMessage, excludeClient?: any): void {
    const room = this.roomManager.getRoom(projectId);
    if (!room) return;

    for (const user of room.users.values()) {
      if (user.client !== excludeClient && user.client.readyState === 1) { // 1 = OPEN
        this.sendMessage(user.client, message);
      }
    }
  }

  /**
   * 处理用户加入项目房间
   */
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: any,
    @MessageBody() data: { projectId: string; userInfo: { userId: string; displayName: string } }
  ) {
    await this.messageHandler.handleUserJoin(
      this.server,
      client,
      data.projectId,
      data.userInfo
    );
  }

  /**
   * 处理用户离开项目房间
   */
  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: any,
    @MessageBody() data: { projectId: string }
  ) {
    await this.messageHandler.handleUserLeave(this.server, client, data.projectId);
  }

  /**
   * 处理光标位置同步
   */
  @SubscribeMessage('cursor-move')
  async handleCursorMove(
    @ConnectedSocket() client: any,
    @MessageBody() data: { projectId: string; position: CursorPosition }
  ) {
    await this.messageHandler.handleCursorMove(
      this.server,
      client,
      data.projectId,
      data.position
    );
  }

  /**
   * 处理节点操作同步
   */
  @SubscribeMessage('node-operation')
  async handleNodeOperation(
    @ConnectedSocket() client: any,
    @MessageBody() data: { projectId: string; operation: CollaborationOperation }
  ) {
    await this.messageHandler.handleNodeOperation(
      this.server,
      client,
      data.projectId,
      data.operation
    );
  }

  /**
   * 处理用户信息更新
   */
  @SubscribeMessage('user-info-update')
  async handleUserInfoUpdate(
    @ConnectedSocket() client: any,
    @MessageBody() data: { projectId: string; userInfo: { displayName: string } }
  ) {
    await this.messageHandler.handleUserInfoUpdate(
      this.server,
      client,
      data.projectId,
      data.userInfo
    );
  }

  /**
   * 处理心跳消息
   */
  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: any) {
    const user = this.userManager.getUserByClientId(this.getClientId(client));
    
    // 使用连接管理器处理心跳
    this.connectionManager.handleHeartbeat(client, user?.userId);
    
    // 使用消息处理器处理心跳逻辑
    await this.messageHandler.handleHeartbeat(client);
  }

  /**
   * 获取服务器统计信息（用于监控）
   */
  getServerStats() {
    return {
      totalRooms: this.roomManager.getRoomCount(),
      totalUsers: this.userManager.getTotalUserCount(),
      connectedClients: this.server.clients?.size || 0,
    };
  }
}