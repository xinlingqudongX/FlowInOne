const WebSocket = require('ws');

console.log('开始测试多用户WebSocket连接...');

// 创建多个用户连接
const users = [
  { userId: 'user1', displayName: '张三' },
  { userId: 'user2', displayName: '李四' },
  { userId: 'user3', displayName: '王五' }
];

const connections = [];
const projectId = 'test-project-001';

// 为每个用户创建连接
users.forEach((user, index) => {
  setTimeout(() => {
    console.log(`\n=== 创建用户 ${user.displayName} 的连接 ===`);
    
    const ws = new WebSocket('ws://localhost:5000/ws');
    connections.push({ ws, user });

    ws.on('open', function open() {
      console.log(`✅ ${user.displayName} WebSocket连接成功建立`);
      
      // 加入房间
      const joinMessage = {
        type: 'join-room',
        projectId: projectId,
        userId: user.userId,
        timestamp: new Date().toISOString(),
        data: {
          projectId: projectId,
          userInfo: {
            userId: user.userId,
            displayName: user.displayName
          }
        }
      };
      
      console.log(`${user.displayName} 发送加入房间消息`);
      ws.send(JSON.stringify(joinMessage));
      
      // 定期发送光标移动消息
      const cursorInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const cursorMessage = {
            type: 'cursor-move',
            projectId: projectId,
            userId: user.userId,
            timestamp: new Date().toISOString(),
            data: {
              position: {
                x: Math.floor(Math.random() * 800),
                y: Math.floor(Math.random() * 600),
                timestamp: new Date()
              }
            }
          };
          ws.send(JSON.stringify(cursorMessage));
        } else {
          clearInterval(cursorInterval);
        }
      }, 2000);
      
      // 定期发送节点操作消息（模拟拖拽）
      const nodeOperationInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const nodeOperationMessage = {
            type: 'node-operation',
            projectId: projectId,
            userId: user.userId,
            timestamp: new Date().toISOString(),
            data: {
              operation: {
                type: 'node-update',
                nodeId: 'node_root',
                data: {
                  position: {
                    x: 200 + Math.floor(Math.random() * 100) - 50,
                    y: 120 + Math.floor(Math.random() * 100) - 50
                  },
                  isDragging: Math.random() > 0.5
                },
                userId: user.userId,
                timestamp: new Date()
              }
            }
          };
          ws.send(JSON.stringify(nodeOperationMessage));
        } else {
          clearInterval(nodeOperationInterval);
        }
      }, 3000);
      
      // 保存定时器引用
      ws._cursorInterval = cursorInterval;
      ws._nodeOperationInterval = nodeOperationInterval;
    });

    ws.on('message', function message(data) {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'online-users') {
        console.log(`📊 ${user.displayName} 收到在线用户列表: ${message.data.users?.length || 0} 人在线`);
        if (message.data.users) {
          message.data.users.forEach(u => {
            console.log(`   - ${u.displayName} (${u.userId})`);
          });
        }
      } else if (message.type === 'room-joined') {
        console.log(`🏠 ${user.displayName} 成功加入房间，当前 ${message.data.userCount} 人在线`);
      } else if (message.type === 'user-join') {
        console.log(`👋 ${user.displayName} 看到 ${message.data.displayName} 加入了房间`);
      } else if (message.type === 'user-leave') {
        console.log(`👋 ${user.displayName} 看到 ${message.data.displayName} 离开了房间`);
      } else if (message.type === 'cursor-move') {
        console.log(`🖱️ ${user.displayName} 看到 ${message.data.displayName} 的光标移动到 (${message.data.position.x}, ${message.data.position.y})`);
      } else if (message.type === 'node-operation') {
        const op = message.data.operation;
        if (op.type === 'node-update' && op.data.position) {
          console.log(`📦 ${user.displayName} 看到 ${message.data.displayName} ${op.data.isDragging ? '拖拽' : '移动'}节点 ${op.nodeId} 到 (${op.data.position.x}, ${op.data.position.y})`);
        } else {
          console.log(`📦 ${user.displayName} 看到 ${message.data.displayName} 执行节点操作: ${op.type}`);
        }
      } else {
        console.log(`📨 ${user.displayName} 收到消息: ${message.type}`);
      }
    });

    ws.on('error', function error(err) {
      console.error(`❌ ${user.displayName} WebSocket连接错误:`, err.message);
    });

    ws.on('close', function close(code, reason) {
      console.log(`🔌 ${user.displayName} WebSocket连接已关闭`);
      if (ws._cursorInterval) {
        clearInterval(ws._cursorInterval);
      }
      if (ws._nodeOperationInterval) {
        clearInterval(ws._nodeOperationInterval);
      }
    });

  }, index * 3000); // 每3秒连接一个用户
});

// 20秒后开始断开连接测试
setTimeout(() => {
  console.log('\n=== 开始断开连接测试 ===');
  
  connections.forEach((conn, index) => {
    setTimeout(() => {
      console.log(`断开 ${conn.user.displayName} 的连接`);
      if (conn.ws._cursorInterval) {
        clearInterval(conn.ws._cursorInterval);
      }
      if (conn.ws._nodeOperationInterval) {
        clearInterval(conn.ws._nodeOperationInterval);
      }
      conn.ws.close();
    }, index * 4000);
  });
}, 20000);

// 40秒后退出
setTimeout(() => {
  console.log('\n=== 测试完成 ===');
  process.exit(0);
}, 40000);