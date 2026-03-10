const WebSocket = require('ws');

console.log('测试基本WebSocket通信...');

const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', function open() {
  console.log('✅ WebSocket连接成功');
  
  // 发送一个简单的消息
  const testMessage = {
    type: 'join-room',
    projectId: 'test-project',
    userId: 'test-user',
    timestamp: new Date().toISOString(),
    data: {
      projectId: 'test-project',
      userInfo: {
        userId: 'test-user',
        displayName: '测试用户'
      }
    }
  };
  
  console.log('发送测试消息:', JSON.stringify(testMessage, null, 2));
  ws.send(JSON.stringify(testMessage));
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

// 5秒后关闭连接
setTimeout(() => {
  console.log('关闭连接...');
  ws.close();
  process.exit(0);
}, 5000);