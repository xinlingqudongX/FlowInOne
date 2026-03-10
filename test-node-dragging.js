const WebSocket = require('ws');

console.log('开始测试节点拖拽协作功能...');

// 创建两个用户连接
const users = [
  { userId: 'dragger1', displayName: '拖拽者1' },
  { userId: 'observer1', displayName: '观察者1' }
];

const connections = [];
const projectId = 'test-drag-project';

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
      
      // 如果是拖拽者，开始模拟拖拽操作
      if (user.userId === 'dragger1') {
        setTimeout(() => {
          console.log(`\n🖱️ ${user.displayName} 开始模拟拖拽操作...`);
          simulateDragOperation(ws, user);
        }, 3000);
      }
    });

    ws.on('message', function message(data) {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'online-users') {
        console.log(`📊 ${user.displayName} 收到在线用户列表: ${message.data.users?.length || 0} 人在线`);
      } else if (message.type === 'room-joined') {
        console.log(`🏠 ${user.displayName} 成功加入房间，当前 ${message.data.userCount} 人在线`);
      } else if (message.type === 'node-operation') {
        const op = message.data.operation;
        if (op.type === 'node-update' && op.data.position) {
          let status = '';
          if (op.data.dragStart) {
            status = '开始拖拽';
          } else if (op.data.isDragging) {
            status = '拖拽中';
          } else {
            status = '拖拽结束';
          }
          console.log(`📦 ${user.displayName} 看到 ${message.data.displayName} ${status}节点 ${op.nodeId} 到位置 (${op.data.position.x}, ${op.data.position.y})`);
        }
      } else if (message.type === 'user-join') {
        console.log(`👋 ${user.displayName} 看到 ${message.data.displayName} 加入了房间`);
      } else {
        console.log(`📨 ${user.displayName} 收到消息: ${message.type}`);
      }
    });

    ws.on('error', function error(err) {
      console.error(`❌ ${user.displayName} WebSocket连接错误:`, err.message);
    });

    ws.on('close', function close(code, reason) {
      console.log(`🔌 ${user.displayName} WebSocket连接已关闭`);
    });

  }, index * 2000); // 每2秒连接一个用户
});

/**
 * 模拟拖拽操作
 */
function simulateDragOperation(ws, user) {
  const nodeId = 'node_root';
  let dragStep = 0;
  const totalSteps = 10;
  const startX = 200;
  const startY = 120;
  const endX = 400;
  const endY = 300;
  
  // 发送拖拽开始消息
  console.log(`🎯 ${user.displayName} 开始拖拽节点 ${nodeId}`);
  ws.send(JSON.stringify({
    type: 'node-operation',
    projectId: projectId,
    userId: user.userId,
    timestamp: new Date().toISOString(),
    data: {
      operation: {
        type: 'node-update',
        nodeId: nodeId,
        data: {
          position: { x: startX, y: startY },
          isDragging: true,
          dragStart: true
        },
        userId: user.userId,
        timestamp: new Date()
      }
    }
  }));
  
  // 模拟拖拽过程
  const dragInterval = setInterval(() => {
    dragStep++;
    const progress = dragStep / totalSteps;
    const currentX = Math.round(startX + (endX - startX) * progress);
    const currentY = Math.round(startY + (endY - startY) * progress);
    
    const isDragging = dragStep < totalSteps;
    
    console.log(`🖱️ ${user.displayName} 拖拽节点到 (${currentX}, ${currentY}) - 步骤 ${dragStep}/${totalSteps}`);
    
    ws.send(JSON.stringify({
      type: 'node-operation',
      projectId: projectId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
      data: {
        operation: {
          type: 'node-update',
          nodeId: nodeId,
          data: {
            position: { x: currentX, y: currentY },
            isDragging: isDragging
          },
          userId: user.userId,
          timestamp: new Date()
        }
      }
    }));
    
    if (dragStep >= totalSteps) {
      clearInterval(dragInterval);
      console.log(`✅ ${user.displayName} 完成拖拽操作`);
    }
  }, 200); // 每200ms发送一次位置更新
}

// 20秒后断开连接
setTimeout(() => {
  console.log('\n=== 测试完成，断开连接 ===');
  connections.forEach(conn => {
    conn.ws.close();
  });
  process.exit(0);
}, 20000);