const WebSocket = require('ws');

console.log('测试NestJS WebSocket通信...');

const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', function open() {
  console.log('✅ WebSocket连接成功');
  
  // NestJS WebSocket期望的消息格式
  const joinRoomMessage = {
    event: 'join-room',
    data: {
      projectId: 'test-project',
      userInfo: {
        userId: 'test-user-123',
        displayName: '测试用户'
      }
    }
  };
  
  console.log('发送加入房间消息:', JSON.stringify(joinRoomMessage, null, 2));
  ws.send(JSON.stringify(joinRoomMessage));
  
  // 2秒后发送节点操作消息
  setTimeout(() => {
    const nodeOperationMessage = {
      event: 'node-operation',
      data: {
        projectId: 'test-project',
        operation: {
          type: 'node-update',
          nodeId: 'node_root',
          data: {
            position: { x: 300, y: 200 },
            isDragging: true,
            dragStart: true
          },
          userId: 'test-user-123',
          timestamp: new Date()
        }
      }
    };
    
    console.log('发送节点操作消息:', JSON.stringify(nodeOperationMessage, null, 2));
    ws.send(JSON.stringify(nodeOperationMessage));
  }, 2000);
});

ws.on('message', function message(data) {
  console.log('收到消息:', data.toString());
  
  try {
    const parsed = JSON.parse(data.toString());
    console.log('解析后的消息:', JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('消息解析失败:', e.message);
  }
});

ws.on('error', function error(err) {
  console.error('WebSocket错误:', err);
});

ws.on('close', function close(code, reason) {
  console.log('WebSocket连接关闭:', code, reason?.toString());
});

// 8秒后关闭连接
setTimeout(() => {
  console.log('关闭连接...');
  ws.close();
  process.exit(0);
}, 8000);