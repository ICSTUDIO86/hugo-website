/**
 * trialCounter 云函数 - 严格的20条旋律试用计数系统
 * 功能：基于设备指纹在服务端跟踪和限制旋律生成次数
 */
const tcb = require('@cloudbase/node-sdk');
const crypto = require('crypto');

// 初始化CloudBase
const app = tcb.init({
  env: process.env.TCB_ENV
});
const db = app.database();

// 生成设备哈希
function generateDeviceHash(fingerprint, ip, userAgent) {
  const data = `${fingerprint}|${ip}|${userAgent.slice(0, 100)}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// 获取客户端IP
function getClientIP(event) {
  return event.headers?.['x-forwarded-for'] ||
         event.headers?.['x-real-ip'] ||
         event.requestContext?.requestIp ||
         event.requestContext?.ip ||
         '127.0.0.1';
}

exports.main = async (event, context) => {
  console.log('[trialCounter] 收到试用计数请求');

  // 处理预检请求（CORS）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600'
      },
      body: ''
    };
  }

  try {
    // 获取请求参数
    const body = event.body ? JSON.parse(event.body) : event;
    const {
      action,           // 'check' 或 'increment'
      deviceFingerprint,
      userAgent,
      accessCode        // 可选：访问码
    } = body;

    // 如果提供了访问码，验证访问码
    if (accessCode && accessCode.length >= 10) {
      console.log('[trialCounter] 检测到访问码，验证中...');

      // 查询访问码
      const { data: codes } = await db.collection('codes')
        .where({
          code: accessCode,
          status: 'active'
        })
        .limit(1)
        .get();

      if (codes.length > 0) {
        console.log('[trialCounter] 访问码有效，允许无限制使用');
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify({
            allowed: true,
            hasFullAccess: true,
            remaining: 999999,
            total: 999999,
            message: '访问码有效，无限制使用'
          })
        };
      }
    }

    // 基本参数检查
    if (!action || !deviceFingerprint || !userAgent) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          allowed: false,
          error: '缺少必要参数'
        })
      };
    }

    // 获取客户端IP
    const clientIP = getClientIP(event);

    // 生成设备唯一标识
    const deviceHash = generateDeviceHash(deviceFingerprint, clientIP, userAgent);
    console.log('[trialCounter] 设备哈希:', deviceHash.slice(0, 8) + '...');

    // 查询设备试用记录，如果集合不存在则先创建
    let trials;
    try {
      const result = await db.collection('device_melody_trials')
        .where({ device_hash: deviceHash })
        .limit(1)
        .get();
      trials = result.data;
    } catch (error) {
      if (error.code === 'DATABASE_COLLECTION_NOT_EXIST') {
        console.log('[trialCounter] 集合不存在，尝试创建...');

        // 创建集合的方法：插入一条记录然后删除它
        try {
          const initDoc = {
            _id: 'init_' + Date.now(),
            device_hash: 'init_temp',
            melody_count: 0,
            created_at: new Date()
          };

          const initResult = await db.collection('device_melody_trials').add(initDoc);
          console.log('[trialCounter] 集合创建成功，删除初始记录...');
          await db.collection('device_melody_trials').doc(initResult.id).remove();

          // 重新查询
          const result = await db.collection('device_melody_trials')
            .where({ device_hash: deviceHash })
            .limit(1)
            .get();
          trials = result.data;
        } catch (createError) {
          console.error('[trialCounter] 创建集合失败:', createError);
          throw error; // 重新抛出原始错误
        }
      } else {
        throw error; // 重新抛出非集合不存在的错误
      }
    }

    const maxTrialCount = 20; // 20条旋律限制
    let trialRecord;

    if (trials.length === 0) {
      // 新设备，创建记录
      if (action === 'check') {
        // 只是检查，返回全新状态
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify({
            allowed: true,
            isFirstTime: true,
            used: 0,
            remaining: maxTrialCount,
            total: maxTrialCount,
            message: `欢迎试用！您有 ${maxTrialCount} 条免费旋律`
          })
        };
      }

      // increment 操作，创建并计数
      trialRecord = {
        device_hash: deviceHash,
        client_ip: clientIP,
        user_agent: userAgent.slice(0, 200),
        device_fingerprint: deviceFingerprint.slice(0, 500),
        melody_count: 1,
        max_count: maxTrialCount,
        first_use: new Date(),
        last_use: new Date(),
        melody_history: [{
          index: 1,
          timestamp: new Date(),
          ip: clientIP
        }],
        created_at: new Date()
      };

      await db.collection('device_melody_trials').add(trialRecord);
      console.log('[trialCounter] 新设备记录已创建，首次生成旋律');

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          allowed: true,
          isFirstTime: true,
          used: 1,
          remaining: maxTrialCount - 1,
          total: maxTrialCount,
          message: `旋律已生成 (1/${maxTrialCount})`
        })
      };
    }

    // 现有设备
    trialRecord = trials[0];
    const currentCount = trialRecord.melody_count || 0;
    const remaining = Math.max(0, maxTrialCount - currentCount);

    console.log('[trialCounter] 试用状态:', {
      used: currentCount,
      remaining: remaining,
      action: action
    });

    // 检查是否超出限制
    if (currentCount >= maxTrialCount) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          allowed: false,
          expired: true,
          used: currentCount,
          remaining: 0,
          total: maxTrialCount,
          message: '试用次数已用完，请购买完整版继续使用'
        })
      };
    }

    // 如果是检查操作，返回当前状态
    if (action === 'check') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          allowed: true,
          used: currentCount,
          remaining: remaining,
          total: maxTrialCount,
          message: `已使用 ${currentCount}/${maxTrialCount} 条旋律`
        })
      };
    }

    // increment 操作，增加计数
    if (action === 'increment') {
      const newCount = currentCount + 1;
      const newRemaining = Math.max(0, maxTrialCount - newCount);

      // 更新记录
      const updateData = {
        melody_count: newCount,
        last_use: new Date()
      };

      // 添加历史记录
      if (!trialRecord.melody_history) {
        trialRecord.melody_history = [];
      }
      trialRecord.melody_history.push({
        index: newCount,
        timestamp: new Date(),
        ip: clientIP
      });

      // 只保留最近100条历史
      if (trialRecord.melody_history.length > 100) {
        trialRecord.melody_history = trialRecord.melody_history.slice(-100);
      }

      updateData.melody_history = trialRecord.melody_history;

      await db.collection('device_melody_trials')
        .doc(trialRecord._id)
        .update(updateData);

      console.log('[trialCounter] 计数已更新:', newCount);

      // 检查是否刚好用完
      const isLastOne = newCount >= maxTrialCount;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          allowed: !isLastOne, // 如果是最后一条，下次就不允许了
          used: newCount,
          remaining: newRemaining,
          total: maxTrialCount,
          expired: isLastOne,
          message: isLastOne
            ? '这是您的最后一条免费旋律，请购买完整版继续使用'
            : `旋律已生成 (${newCount}/${maxTrialCount})`
        })
      };
    }

    // 无效的action
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        allowed: false,
        error: '无效的操作类型'
      })
    };

  } catch (error) {
    console.error('[trialCounter] 处理过程出错:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        allowed: false,
        error: '服务器内部错误，请稍后重试'
      })
    };
  }
};