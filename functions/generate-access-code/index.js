const tcb = require('@cloudbase/node-sdk');

// 初始化 Cloudbase
const app = tcb.init({
  env: process.env.TCB_ENV
});

const db = app.database();

/**
 * 生成和验证访问码的云函数
 */
exports.main = async (event, context) => {
  console.log('访问码处理请求:', event);
  
  const { action, access_code } = event;
  
  try {
    switch (action) {
      case 'verify':
        return await verifyAccessCode(access_code);
      case 'generate':
        return await generateNewAccessCode();
      default:
        return {
          success: false,
          error: '无效的操作类型'
        };
    }
  } catch (error) {
    console.error('访问码处理错误:', error);
    return {
      success: false,
      error: '服务器内部错误'
    };
  }
};

/**
 * 验证访问码
 */
async function verifyAccessCode(accessCode) {
  if (!accessCode) {
    return {
      success: false,
      error: '访问码不能为空'
    };
  }
  
  // 查询数据库中的访问码
  const result = await db
    .collection('ic_studio_orders')
    .where({
      access_code: accessCode,
      status: 'paid'
    })
    .get();
    
  if (result.data.length === 0) {
    return {
      success: false,
      error: '访问码无效或已过期'
    };
  }
  
  const order = result.data[0];
  
  // 检查是否过期
  if (new Date() > new Date(order.expires_at)) {
    return {
      success: false,
      error: '访问码已过期'
    };
  }
  
  return {
    success: true,
    message: '访问码验证成功',
    data: {
      access_code: accessCode,
      expires_at: order.expires_at,
      order_id: order.order_id
    }
  };
}

/**
 * 生成新的访问码 (仅供管理员使用)
 */
async function generateNewAccessCode() {
  const accessCode = generateAccessCode();
  
  // 保存到数据库
  await db.collection('ic_studio_orders').add({
    order_id: 'ADMIN_' + Date.now(),
    transaction_id: 'MANUAL_' + Date.now(),
    amount: 1.00,
    access_code: accessCode,
    status: 'paid',
    type: 'manual',
    created_at: new Date(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年有效期
  });
  
  return {
    success: true,
    message: '访问码生成成功',
    data: {
      access_code: accessCode
    }
  };
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