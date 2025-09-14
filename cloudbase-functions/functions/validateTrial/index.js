/**
 * validateTrial 云函数 - 严格的服务端试用验证
 * 功能：基于设备指纹在服务端验证和跟踪试用时间
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
  return event.headers['x-forwarded-for'] ||
         event.headers['x-real-ip'] ||
         event.requestContext?.requestIp ||
         '127.0.0.1';
}

exports.main = async (event, context) => {
  console.log('[validateTrial] 收到试用验证请求:', {
    deviceFingerprint: event.deviceFingerprint?.slice(0, 50) + '...',
    timestamp: event.timestamp
  });

  try {
    // 获取请求参数
    const { deviceFingerprint, timestamp, userAgent } = event;
    const clientIP = getClientIP(event);

    // 基本参数检查
    if (!deviceFingerprint || !timestamp || !userAgent) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          valid: false,
          error: '缺少必要参数'
        })
      };
    }

    // 时间戳验证（防止时间篡改）
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    if (timeDiff > 5 * 60 * 1000) { // 5分钟容忍度
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          valid: false,
          error: '时间戳异常，请检查系统时间'
        })
      };
    }

    // 生成设备唯一标识
    const deviceHash = generateDeviceHash(deviceFingerprint, clientIP, userAgent);
    console.log('[validateTrial] 设备哈希:', deviceHash);

    // 查询设备试用记录
    const { data: trials } = await db.collection('device_trials')
      .where({ device_hash: deviceHash })
      .limit(1)
      .get();

    let trialRecord;
    const trialDuration = 10 * 60 * 1000; // 10分钟

    if (trials.length === 0) {
      // 首次使用，创建试用记录
      trialRecord = {
        device_hash: deviceHash,
        client_ip: clientIP,
        user_agent: userAgent.slice(0, 200),
        device_fingerprint: deviceFingerprint.slice(0, 500),
        trial_start: now,
        trial_duration: trialDuration,
        total_usage: 0,
        last_access: now,
        access_count: 1,
        created_at: new Date()
      };

      await db.collection('device_trials').add(trialRecord);
      console.log('[validateTrial] 新设备试用记录已创建');

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          valid: true,
          remaining: trialDuration,
          isFirstTime: true,
          deviceHash: deviceHash.slice(0, 8) + '...',
          message: '欢迎试用！您有10分钟的免费使用时间'
        })
      };
    }

    // 现有设备，更新使用记录
    trialRecord = trials[0];
    const elapsed = now - trialRecord.trial_start;
    const remaining = Math.max(0, trialDuration - elapsed);

    // 更新访问记录
    await db.collection('device_trials')
      .doc(trialRecord._id)
      .update({
        last_access: now,
        access_count: (trialRecord.access_count || 0) + 1,
        total_usage: elapsed
      });

    console.log('[validateTrial] 试用状态:', {
      elapsed: Math.floor(elapsed / 1000) + 's',
      remaining: Math.floor(remaining / 1000) + 's',
      expired: remaining <= 0
    });

    if (remaining <= 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          valid: false,
          remaining: 0,
          expired: true,
          deviceHash: deviceHash.slice(0, 8) + '...',
          message: '试用时间已用完，请购买完整版继续使用'
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        valid: true,
        remaining: remaining,
        elapsed: elapsed,
        deviceHash: deviceHash.slice(0, 8) + '...',
        message: `试用剩余时间：${Math.floor(remaining / 60000)}分${Math.floor((remaining % 60000) / 1000)}秒`
      })
    };

  } catch (error) {
    console.error('[validateTrial] 验证过程出错:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        valid: false,
        error: '服务器内部错误，请稍后重试'
      })
    };
  }
};