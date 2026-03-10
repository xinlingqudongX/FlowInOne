# 实时协同功能

本模块实现了基于WebSocket的实时协同编辑功能，支持多用户同时编辑工作流图谱，包括光标同步、操作广播、用户管理等功能。

## 功能特性

### 核心功能
- **实时连接管理**: WebSocket连接的建立、维护和断开处理
- **房间管理**: 按项目ID分组的用户房间管理
- **用户管理**: 在线用户状态跟踪和信息管理
- **消息处理**: 各种协同消息的验证、处理和广播
- **光标同步**: 实时显示其他用户的鼠标光标位置
- **操作同步**: 节点创建、编辑、删除等操作的实时同步

### 高级功能
- **连接保护**: IP连接数限制、总连接数限制
- **心跳机制**: 检测和清理僵尸连接
- **操作日志**: 详细的操作审计和统计
- **消息验证**: 确保消息格式和内容的安全性
- **资源清理**: 自动清理不活跃的用户和房间

## 架构设计

### 服务组件

#### CollaborationGateway
WebSocket网关，处理客户端连接和消息路由
- 连接/断开连接处理
- 消息订阅和分发
- 错误处理和响应

#### RoomManagerService
房间管理服务，负责项目房间的创建和管理
- 房间创建和删除
- 用户加入和离开房间
- 房间统计和清理

#### UserManagerService
用户管理服务，跟踪在线用户状态
- 用户连接状态管理
- 用户信息更新
- 活动时间跟踪

#### MessageHandlerService
消息处理服务，处理各种协同消息的业务逻辑
- 用户加入/离开处理
- 光标位置同步
- 节点操作同步
- 用户信息更新

#### ConnectionManagerService
连接管理服务，处理连接保护和资源管理
- 连接数限制
- 心跳监控
- 僵尸连接清理
- 连接统计

#### OperationLoggerService
操作日志服务，记录所有协同操作
- 操作审计日志
- 用户活动统计
- 日志导出和清理

#### MessageValidatorService
消息验证服务，确保消息安全性
- 消息格式验证
- 内容安全检查
- 频率限制

#### HeartbeatService
心跳服务，维护系统健康状态
- 定期清理任务
- 系统健康检查
- 性能监控

## API接口

### WebSocket事件

#### 客户端发送事件
- `join-room`: 加入项目房间
- `leave-room`: 离开项目房间
- `cursor-move`: 光标位置更新
- `node-operation`: 节点操作
- `user-info-update`: 用户信息更新
- `heartbeat`: 心跳消息

#### 服务器发送事件
- `connection-established`: 连接建立确认
- `room-joined`: 房间加入成功
- `room-left`: 房间离开确认
- `online-users`: 在线用户列表
- `message`: 协同消息广播
- `heartbeat-ack`: 心跳确认
- `error`: 错误消息

### REST API

#### 统计信息
- `GET /api/collaboration/stats`: 获取服务器统计信息
- `GET /api/collaboration/connections`: 获取连接统计信息
- `GET /api/collaboration/health`: 健康检查

#### 房间管理
- `GET /api/collaboration/rooms`: 获取所有房间信息
- `GET /api/collaboration/rooms/:projectId`: 获取特定房间信息
- `DELETE /api/collaboration/rooms/:projectId`: 删除特定房间
- `DELETE /api/collaboration/rooms/empty`: 删除所有空房间

#### 用户管理
- `GET /api/collaboration/users`: 获取所有在线用户
- `GET /api/collaboration/users/:userId`: 获取特定用户信息
- `GET /api/collaboration/users/:userId/activity`: 获取用户活动摘要
- `DELETE /api/collaboration/users/:userId`: 强制断开用户连接

#### 操作日志
- `GET /api/collaboration/logs`: 获取操作日志
- `GET /api/collaboration/logs/stats`: 获取操作统计信息
- `GET /api/collaboration/logs/export`: 导出操作日志
- `GET /api/collaboration/logs/storage`: 获取日志存储状态
- `POST /api/collaboration/logs/cleanup`: 清理旧日志

#### 系统管理
- `POST /api/collaboration/cleanup`: 手动触发清理任务
- `POST /api/collaboration/cleanup/zombies`: 清理僵尸连接
- `POST /api/collaboration/cleanup/restart`: 重启清理任务
- `POST /api/collaboration/connections/limits`: 设置连接限制
- `POST /api/collaboration/broadcast`: 广播服务器消息

## 使用示例

### 前端连接示例

```typescript
import { io, Socket } from 'socket.io-client';

// 建立连接
const socket: Socket = io('ws://localhost:3000', {
  transports: ['websocket'],
});

// 监听连接事件
socket.on('connection-established', (data) => {
  console.log('连接已建立:', data);
});

// 加入项目房间
socket.emit('join-room', {
  projectId: 'my-project-001',
  userInfo: {
    userId: 'user-123',
    displayName: '张三',
  },
});

// 监听房间加入成功
socket.on('room-joined', (data) => {
  console.log('已加入房间:', data);
});

// 监听在线用户列表
socket.on('online-users', (users) => {
  console.log('在线用户:', users);
});

// 发送光标位置
socket.emit('cursor-move', {
  projectId: 'my-project-001',
  position: { x: 100, y: 200, timestamp: new Date() },
});

// 监听协同消息
socket.on('message', (message) => {
  switch (message.type) {
    case 'user-join':
      console.log('用户加入:', message.data);
      break;
    case 'user-leave':
      console.log('用户离开:', message.data);
      break;
    case 'cursor-move':
      console.log('光标移动:', message.data);
      break;
    case 'node-operation':
      console.log('节点操作:', message.data);
      break;
  }
});

// 发送节点操作
socket.emit('node-operation', {
  projectId: 'my-project-001',
  operation: {
    type: 'node-create',
    nodeId: 'node-456',
    data: { name: '新节点', x: 100, y: 200 },
    userId: 'user-123',
    timestamp: new Date(),
  },
});

// 发送心跳
setInterval(() => {
  socket.emit('heartbeat');
}, 30000);

// 监听心跳确认
socket.on('heartbeat-ack', (data) => {
  console.log('心跳确认:', data);
});
```

### 错误处理

```typescript
// 监听错误事件
socket.on('error', (error) => {
  console.error('协同错误:', error);
  
  switch (error.code) {
    case 'SERVER_FULL':
      alert('服务器连接数已满，请稍后重试');
      break;
    case 'IP_LIMIT_EXCEEDED':
      alert('连接数已达上限');
      break;
    case 'HEARTBEAT_TIMEOUT':
      console.log('心跳超时，尝试重连');
      socket.connect();
      break;
    case 'INVALID_OPERATION':
      console.error('无效的操作数据');
      break;
  }
});

// 监听连接断开
socket.on('disconnect', (reason) => {
  console.log('连接断开:', reason);
  
  if (reason === 'io server disconnect') {
    // 服务器主动断开，需要重新连接
    socket.connect();
  }
});
```

## 配置选项

### 环境变量

```bash
# WebSocket服务器配置
WS_PORT=3000
WS_CORS_ORIGIN=*

# 连接限制
MAX_CONNECTIONS_PER_IP=10
MAX_TOTAL_CONNECTIONS=1000

# 心跳和清理配置
HEARTBEAT_INTERVAL=30000
INACTIVE_USER_TIMEOUT=1800000
INACTIVE_ROOM_TIMEOUT=3600000
CLEANUP_INTERVAL=300000

# 日志配置
MAX_LOG_ENTRIES=10000
LOG_CLEANUP_INTERVAL=86400000
```

### 代码配置

```typescript
// 在 collaboration.types.ts 中修改配置常量
export const COLLABORATION_CONFIG = {
  MAX_USERS_PER_ROOM: 50,
  HEARTBEAT_INTERVAL: 30000,
  INACTIVE_USER_TIMEOUT: 1800000,
  INACTIVE_ROOM_TIMEOUT: 3600000,
  CLEANUP_INTERVAL: 300000,
} as const;
```

## 监控和调试

### 健康检查

```bash
# 检查服务健康状态
curl http://localhost:3000/api/collaboration/health

# 获取连接统计
curl http://localhost:3000/api/collaboration/connections

# 获取操作统计
curl http://localhost:3000/api/collaboration/logs/stats
```

### 日志查看

```bash
# 获取最近的操作日志
curl "http://localhost:3000/api/collaboration/logs?limit=50"

# 获取特定用户的日志
curl "http://localhost:3000/api/collaboration/logs?userId=user-123"

# 导出日志为CSV
curl "http://localhost:3000/api/collaboration/logs/export?format=csv"
```

### 管理操作

```bash
# 手动触发清理
curl -X POST http://localhost:3000/api/collaboration/cleanup

# 清理僵尸连接
curl -X POST http://localhost:3000/api/collaboration/cleanup/zombies

# 强制断开用户
curl -X DELETE "http://localhost:3000/api/collaboration/users/user-123?reason=维护"

# 广播系统消息
curl -X POST "http://localhost:3000/api/collaboration/broadcast?message=系统维护通知&level=warning"
```

## 性能优化

### 连接优化
- 合理设置连接数限制
- 及时清理僵尸连接
- 使用心跳机制维护连接健康

### 消息优化
- 光标移动消息采样发送
- 批量处理操作消息
- 压缩大型消息内容

### 内存优化
- 定期清理操作日志
- 限制房间和用户数量
- 及时释放断开连接的资源

## 安全考虑

### 连接安全
- IP连接数限制
- 总连接数限制
- 连接超时机制

### 消息安全
- 消息格式验证
- 内容长度限制
- 频率限制保护

### 数据安全
- 用户身份验证
- 项目访问权限
- 敏感信息过滤

## 故障排除

### 常见问题

1. **连接失败**
   - 检查WebSocket端口是否开放
   - 确认CORS配置正确
   - 验证网络连接

2. **消息丢失**
   - 检查心跳机制是否正常
   - 确认消息格式正确
   - 查看错误日志

3. **性能问题**
   - 监控连接数和内存使用
   - 检查清理任务是否正常运行
   - 优化消息发送频率

4. **用户同步问题**
   - 确认房间管理正常
   - 检查用户状态更新
   - 验证消息广播机制

### 调试工具

使用浏览器开发者工具的Network标签页监控WebSocket连接：
- 查看连接状态
- 监控消息收发
- 检查错误信息

使用提供的REST API获取系统状态：
- 连接统计信息
- 用户活动状态
- 操作日志分析