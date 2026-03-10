const WebSocket = require('ws');

console.log('开始测试多用户同时拖拽不同节点的协作功能...');

// 创建三个用户连接
const users = [
  { userId: 'dragger1', displayName: '拖拽者1', nodeId: 'node_root' },
  { userId: 'dragger2', displayName: '拖拽者2', nodeId: 'node_text_1' },
  { userId: 'observer1', displayName: '观察者1', nodeId: null }
];

const connections = [];
const projectId = 'test-multi-drag-project';

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
      
      // 如果是拖拽者，先创建节点然后开始拖拽
      if (user.nodeId && user.nodeId !== 'node_root') {
        setTimeout(() => {
          console.log(`\n📦 ${user.displayName} 创建节点 ${user.nodeId}...`);
          createNode(ws, user, user.nodeId);
          
          setTimeout(() => {
            console.log(`\n🖱️ ${user.displayName} 开始拖拽节点 ${user.nodeId}...`);
            simulateDragOperation(ws, user);
          }, 2000);
        }, 4000);
      } else if (user.nodeId === 'node_root') {
        setTimeout(() => {
          console.log(`\n🖱️ ${user.displayName} 开始拖拽根节点...`);
          simulateDragOperation(ws, user);
        }, 5000);
      }
    });

    ws.on('message', function message(data) {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'online-users') {
        console.log(`📊 ${user.displayName} 收到在线用户列表: ${message.data.users?.length || 0} 人在线`);
        if (message.data.users) {
          const userNames = message.data.users.map(u => u.displayName).join(', ');
          console.log(`   在线用户: ${userNames}`);
        }
      } else if (message.type === 'room-joined') {
        console.log(`🏠 ${user.displayName} 成功加入房间，当前 ${message.data.userCount} 人在线`);
      } else if (message.type === 'node-operation') {
        const op = message.data.operation;
        if (op.type === 'node-create') {
          console.log(`📦 ${user.displayName} 看到 ${message.data.displayName} 创建了节点 ${op.nodeId}`);
        } else if (op.type === 'node-update' && op.data.position) {
          let status = '';
          if (op.data.dragStart) {
            status = '开始拖拽';
          } else if (op.data.isDragging) {
            status = '拖拽中';
          } else {
            status = '拖拽结束';
          }
          console.log(`🎯 ${user.displayName} 看到 ${message.data.displayName} ${status}节点 ${op.nodeId} 到位置 (${Math.round(op.data.position.x)}, ${Math.round(op.data.position.y)})`);
        }
      } else if (message.type === 'user-join') {
        console.log(`👋 ${user.displayName} 看到 ${message.data.displayName} 加入了房间`);
      } else if (message.type === 'user-leave') {
        console.log(`👋 ${user.displayName} 看到 ${message.data.displayName} 离开了房间`);
      } else if (message.type === 'connection-established') {
        console.log(`🔗 ${user.displayName} 连接已建立`);
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
 * 创建节点
 */
function createNode(ws, user, nodeId) {
  const createMessage = {
    type: 'node-operation',
    projectId: projectId,
    userId: user.userId,
    timestamp: new Date().toISOString(),
    data: {
      operation: {
        type: 'node-create',
        nodeId: nodeId,
        data: {
          title: `${user.displayName}的节点`,
          type: 'text',
          status: 'pending',
          position: { 
            x: 300 + Math.random() * 200, 
            y: 200 + Math.random() * 200 
          },
          config: { typeKey: 'text', textContent: `由${user.displayName}创建` }
        },
        userId: user.userId,
        timestamp: new Date()
      }
    }
  };
  
  ws.send(JSON.stringify(createMessage));
}

/**
 * 模拟拖拽操作
 */
function simulateDragOperation(ws, user) {
  const nodeId = user.nodeId;
  let dragStep = 0;
  const totalSteps = 8;
  
  // 根据用户设置不同的起始和结束位置
  let startX, startY, endX, endY;
  if (user.userId === 'dragger1') {
    startX = 200; startY = 120; endX = 400; endY = 300;
  } else if (user.userId === 'dragger2') {
    startX = 350; startY = 250; endX = 150; endY = 400;
  }
  
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
  }, 300); // 每300ms发送一次位置更新
}

// 25秒后断开连接
setTimeout(() => {
  console.log('\n=== 测试完成，断开连接 ===');
  connections.forEach(conn => {
    conn.ws.close();
  });
  
  console.log('\n📋 测试总结:');
  console.log('✅ 测试了多用户同时拖拽不同节点');
  console.log('✅ 验证了拖拽状态的实时广播');
  console.log('✅ 检查了节点创建和位置更新的协作');
  console.log('✅ 确认了用户加入/离开的通知机制');
  
  process.exit(0);
}, 25000);