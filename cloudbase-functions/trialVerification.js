/**
 * CloudBase 云函数 - 试用验证系统
 * 防止无痕浏览模式等绕过手段
 */

const cloud = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  const { fingerprint, sessionId, action, timestamp, userAgent, url, referrer, isIncognito } = event;

  console.log(`[Trial Verification] 请求: ${action}, 指纹: ${fingerprint}, 无痕模式: ${isIncognito}`);

  try {
    // 基础参数验证
    if (!fingerprint || !action) {
      return {
        success: false,
        error: '缺少必要参数'
      };
    }

    // 检测无痕模式（基于多种指标）
    const detectedIncognito = detectIncognitoMode(userAgent, event);

    // 获取或创建试用记录
    const trialRecord = await getTrialRecord(fingerprint, detectedIncognito);

    switch (action) {
      case 'check':
        return await checkTrialStatus(trialRecord, fingerprint);

      case 'use':
        return await recordTrialUsage(trialRecord, fingerprint, sessionId, userAgent, url, referrer);

      case 'reset':
        return await resetTrialRecord(fingerprint);

      default:
        return {
          success: false,
          error: '未知操作类型'
        };
    }

  } catch (error) {
    console.error('[Trial Verification] 错误:', error);
    return {
      success: false,
      error: '服务器内部错误',
      details: error.message
    };
  }
};

// 检测无痕模式
function detectIncognitoMode(userAgent, event) {
  // 基于多种指标检测无痕模式
  let incognitoScore = 0;

  // 检查用户代理字符串中的无痕模式指标
  if (userAgent) {
    // 某些无痕模式会有特定的用户代理特征
    if (userAgent.includes('Incognito') || userAgent.includes('Private')) {
      incognitoScore += 2;
    }
  }

  // 检查是否明确标记为无痕模式
  if (event.isIncognito === true) {
    incognitoScore += 3;
  }

  console.log(`[detectIncognitoMode] 无痕模式得分: ${incognitoScore}`);

  // 得分超过2就认为是无痕模式
  return incognitoScore >= 2;
}

// 获取试用记录
async function getTrialRecord(fingerprint, isIncognito = false) {
  try {
    const collection = db.collection('trial_records');
    const result = await collection.where({ fingerprint }).get();

    if (result.data.length > 0) {
      const record = result.data[0];

      // 如果现有记录的maxUsage不符合当前模式，更新它
      const expectedMaxUsage = isIncognito ? 3 : 20;
      if (record.maxUsage !== expectedMaxUsage) {
        console.log(`[getTrialRecord] 更新记录限制: ${record.maxUsage} -> ${expectedMaxUsage}`);
        await collection.doc(record._id).update({
          maxUsage: expectedMaxUsage,
          isIncognito: isIncognito,
          updatedAt: new Date()
        });
        record.maxUsage = expectedMaxUsage;
        record.isIncognito = isIncognito;
      }

      return record;
    }

    // 创建新记录，根据模式设置限制
    const maxUsage = isIncognito ? 3 : 20;
    const newRecord = {
      fingerprint,
      usageCount: 0,
      maxUsage: maxUsage,
      isIncognito: isIncognito,
      firstUse: null,
      lastUse: null,
      sessions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log(`[getTrialRecord] 创建新记录: maxUsage=${maxUsage}, isIncognito=${isIncognito}`);

    const insertResult = await collection.add(newRecord);
    return { ...newRecord, _id: insertResult.id };

  } catch (error) {
    console.error('[getTrialRecord] 错误:', error);
    throw error;
  }
}

// 检查试用状态
async function checkTrialStatus(record, fingerprint) {
  const remainingTrial = Math.max(0, record.maxUsage - record.usageCount);
  const allowed = remainingTrial > 0;

  console.log(`[checkTrialStatus] 指纹: ${fingerprint}, 使用次数: ${record.usageCount}/${record.maxUsage}, 剩余: ${remainingTrial}`);

  return {
    success: true,
    allowed,
    remainingTrial,
    usageCount: record.usageCount,
    maxUsage: record.maxUsage,
    lastUse: record.lastUse,
    source: 'server'
  };
}

// 记录试用使用
async function recordTrialUsage(record, fingerprint, sessionId, userAgent, url, referrer) {
  try {
    const now = new Date();
    const remainingBefore = Math.max(0, record.maxUsage - record.usageCount);

    // 检查是否还能使用
    if (remainingBefore <= 0) {
      return {
        success: false,
        allowed: false,
        error: 'Trial usage limit exceeded',
        remainingTrial: 0,
        usageCount: record.usageCount,
        maxUsage: record.maxUsage
      };
    }

    // 更新使用记录
    const newUsageCount = record.usageCount + 1;
    const newSession = {
      sessionId,
      timestamp: now,
      userAgent,
      url,
      referrer,
      ip: getClientIP()
    };

    const collection = db.collection('trial_records');
    await collection.doc(record._id).update({
      usageCount: newUsageCount,
      lastUse: now,
      updatedAt: now,
      sessions: db.command.push([newSession])
    });

    const remainingAfter = Math.max(0, record.maxUsage - newUsageCount);

    console.log(`[recordTrialUsage] 记录使用 - 指纹: ${fingerprint}, 新计数: ${newUsageCount}/${record.maxUsage}`);

    // 记录详细使用日志（用于分析）
    await logUsageDetail(fingerprint, sessionId, userAgent, url, referrer, newUsageCount);

    return {
      success: true,
      allowed: remainingAfter > 0,
      remainingTrial: remainingAfter,
      usageCount: newUsageCount,
      maxUsage: record.maxUsage,
      source: 'server'
    };

  } catch (error) {
    console.error('[recordTrialUsage] 错误:', error);
    throw error;
  }
}

// 重置试用记录（管理员功能）
async function resetTrialRecord(fingerprint) {
  try {
    const collection = db.collection('trial_records');
    const result = await collection.where({ fingerprint }).get();

    if (result.data.length === 0) {
      return {
        success: false,
        error: '未找到对应记录'
      };
    }

    await collection.doc(result.data[0]._id).update({
      usageCount: 0,
      lastUse: null,
      sessions: [],
      updatedAt: new Date()
    });

    console.log(`[resetTrialRecord] 已重置指纹: ${fingerprint}`);

    return {
      success: true,
      message: '试用记录已重置'
    };

  } catch (error) {
    console.error('[resetTrialRecord] 错误:', error);
    throw error;
  }
}

// 记录详细使用日志
async function logUsageDetail(fingerprint, sessionId, userAgent, url, referrer, usageCount) {
  try {
    const logCollection = db.collection('trial_usage_logs');
    await logCollection.add({
      fingerprint,
      sessionId,
      userAgent,
      url,
      referrer,
      usageCount,
      timestamp: new Date(),
      clientIP: getClientIP()
    });
  } catch (error) {
    console.error('[logUsageDetail] 日志记录失败:', error);
    // 不抛出错误，日志失败不应影响主要功能
  }
}

// 获取客户端IP（简化版）
function getClientIP() {
  try {
    // CloudBase 环境中获取客户端 IP 的方法
    return context?.SOURCE_IP || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

// 数据库清理函数（定期清理过期记录）
async function cleanupOldRecords() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 清理30天前的日志
    const logCollection = db.collection('trial_usage_logs');
    await logCollection.where({
      timestamp: db.command.lt(thirtyDaysAgo)
    }).remove();

    console.log('[cleanupOldRecords] 清理完成');
  } catch (error) {
    console.error('[cleanupOldRecords] 清理失败:', error);
  }
}