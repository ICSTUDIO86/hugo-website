const tcb = require('@cloudbase/node-sdk');
const crypto = require('crypto');

// 初始化 Cloudbase
const app = tcb.init({
  env: process.env.TCB_ENV
});

const db = app.database();

/**
 * Z-pay 支付回调处理函数
 */
exports.main = async (event, context) => {
  console.log('收到 Z-pay 支付回调:', event);
  
  try {
    // 解析回调数据
    const { 
      merchant_id, 
      order_id, 
      amount, 
      status, 
      transaction_id, 
      timestamp, 
      signature 
    } = event.queryStringParameters || event;
    
    // 验证签名
    const isValidSignature = verifyZPaySignature({
      merchant_id,
      order_id, 
      amount,
      status,
      transaction_id,
      timestamp
    }, signature);
    
    if (!isValidSignature) {
      console.error('Z-pay 签名验证失败');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '签名验证失败' })
      };
    }
    
    // 检查支付状态
    if (status !== 'success') {
      console.log('支付未成功, 状态:', status);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: '支付状态已记录' })
      };
    }
    
    // 检查金额是否正确
    if (parseFloat(amount) !== 48.00) {
      console.error('支付金额不正确:', amount);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '支付金额不正确' })
      };
    }
    
    // 生成访问码
    const accessCode = generateAccessCode();
    
    // 保存到数据库
    await db.collection('ic_studio_orders').add({
      order_id,
      transaction_id,
      amount: parseFloat(amount),
      access_code: accessCode,
      status: 'paid',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年有效期
    });
    
    console.log('支付成功，访问码生成:', accessCode);
    
    // 返回成功响应给 Z-pay
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        access_code: accessCode,
        message: '支付处理成功'
      })
    };
    
  } catch (error) {
    console.error('支付回调处理错误:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '服务器内部错误' })
    };
  }
};

/**
 * 验证 Z-pay 签名
 */
function verifyZPaySignature(params, signature) {
  const apiKey = process.env.ZPAY_API_KEY;
  
  // 按键名排序
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&') + `&key=${apiKey}`;
    
  const computedSignature = crypto
    .createHash('md5')
    .update(signString)
    .digest('hex')
    .toUpperCase();
    
  return computedSignature === signature.toUpperCase();
}

/**
 * 生成访问码 
 */
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // 生成格式: ABC123XYZ789
  for (let i = 0; i < 12; i++) {
    if (i === 3 || i === 6 || i === 9) {
      result += chars.charAt(Math.floor(Math.random() * 10) + 26); // 数字
    } else {
      result += chars.charAt(Math.floor(Math.random() * 26)); // 字母
    }
  }
  
  return result;
}