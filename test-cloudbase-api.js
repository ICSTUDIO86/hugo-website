/**
 * 直接测试 CloudBase API 的脚本
 * 用于验证数据写入功能
 */

const https = require('https');

// 测试数据
const testData = {
  orderId: 'TEST-' + Date.now(),
  deviceId: 'test-device-' + Math.random().toString(36).substr(2, 9),
  paymentMethod: 'test',
  amount: 0,
  timestamp: Date.now(),
  testMode: true
};

console.log('🧪 开始测试 CloudBase API...');
console.log('📊 测试数据:', testData);

// 创建 POST 请求
const postData = JSON.stringify(testData);

const options = {
  hostname: 'cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com',
  path: '/generate-access-code',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Request-Source': 'IC-Studio-Test',
    'X-Test-Mode': 'true',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`📡 响应状态码: ${res.statusCode}`);
  console.log(`📡 响应头:`, res.headers);
  
  let responseBody = '';
  
  res.on('data', (chunk) => {
    responseBody += chunk;
  });
  
  res.on('end', () => {
    console.log('📥 响应内容:', responseBody);
    
    try {
      const result = JSON.parse(responseBody);
      if (result.success) {
        console.log('✅ 测试成功！访问码:', result.accessCode);
        console.log('🎯 CloudBase 数据写入正常工作！');
      } else {
        console.log('❌ 测试失败:', result.message);
      }
    } catch (e) {
      console.log('❌ JSON 解析失败:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ 请求失败:', e.message);
});

// 发送请求
req.write(postData);
req.end();