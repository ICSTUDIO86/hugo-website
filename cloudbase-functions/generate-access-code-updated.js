/**
 * IC Studio - 访问码生成云函数 (CloudBase)
 * 简化版本 - 不依赖外部数据库
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  console.log('🔧 云函数被调用:', { event, context });
  
  try {
    const { action, access_code, order_data, device_id } = event;
    
    if (action === 'generate') {
      // 生成访问码逻辑
      const accessCode = generateAccessCode();
      
      console.log('✨ 生成访问码:', accessCode);
      
      // 存储到数据库（可选）
      try {
        await db.collection('ic_studio_orders').add({
          access_code: accessCode,
          order_data: order_data || {},
          device_id: device_id || 'unknown',
          created_at: new Date(),
          status: 'active'
        });
        console.log('📝 访问码已存储到数据库');
      } catch (dbError) {
        console.warn('⚠️ 数据库存储失败，但继续返回访问码:', dbError.message);
      }
      
      return {
        code: 200,
        data: {
          accessCode: accessCode,
          expires_at: null // 永久有效
        },
        message: '访问码生成成功'
      };
      
    } else if (action === 'verify') {
      // 验证访问码逻辑
      console.log('🔍 验证访问码:', access_code);
      
      if (!access_code || access_code.length !== 12) {
        return {
          code: 400,
          message: '访问码格式无效'
        };
      }
      
      // 简化验证：检查格式和基本规则
      const isValid = validateAccessCodeFormat(access_code);
      
      if (isValid) {
        // 记录验证日志（可选）
        try {
          await db.collection('access_logs').add({
            access_code: access_code,
            device_id: device_id || 'unknown',
            action: 'verify',
            verified_at: new Date(),
            result: 'success'
          });
        } catch (dbError) {
          console.warn('⚠️ 日志存储失败:', dbError.message);
        }
        
        return {
          code: 200,
          data: {
            expires_at: null // 永久有效
          },
          message: '访问码验证成功'
        };
      } else {
        return {
          code: 401,
          message: '访问码无效或已过期'
        };
      }
    }
    
    return {
      code: 400,
      message: '无效的操作类型'
    };
    
  } catch (error) {
    console.error('❌ 云函数执行错误:', error);
    return {
      code: 500,
      message: '系统内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
};

/**
 * 生成12位访问码
 */
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // 添加时间戳确保唯一性
  const timestamp = Date.now().toString(36).toUpperCase();
  result += timestamp.substring(0, 4);
  
  // 填充随机字符到12位
  while (result.length < 12) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result.substring(0, 12);
}

/**
 * 验证访问码格式
 */
function validateAccessCodeFormat(code) {
  // 基本格式检查
  if (!code || typeof code !== 'string' || code.length !== 12) {
    return false;
  }
  
  // 检查是否只包含大写字母和数字
  const validPattern = /^[A-Z0-9]{12}$/;
  if (!validPattern.test(code)) {
    return false;
  }
  
  // 简化验证：对于演示，我们认为所有格式正确的访问码都有效
  // 在生产环境中，这里应该查询数据库验证
  return true;
}