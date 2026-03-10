const WebSocket = require('ws');

console.log('开始测试WebSocket连接...');

// 测试连接到后端WebSocket服务
const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', function open() {
  console.log('✅ WebSocket连接成功建立');
  
  // 发送测试消息
  const testMessage = {
    type: 'heartbeat',
    projectId: '',
    userId: 'test-user',
    timestamp: new Date().toISOString(),
    data: {}
  };
  
  console.log('发送心跳消息:', JSON.stringify(testMessage));
  ws.send(JSON.stringify(testMessage));
});

ws.on('message', function message(data) {
  console.log('📨 收到服务器消息:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket连接错误:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket连接已关闭');
  console.log('关闭代码:', code);
  console.log('关闭原因:', reason.toString());
});

// 10秒后关闭连接
setTimeout(() => {
  console.log('测试完成，关闭连接');
  ws.close();
  process.exit(0);
}, 10000);