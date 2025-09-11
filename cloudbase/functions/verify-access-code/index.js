/**
 * Cloudbase 云函数：访问码验证 - 安全增强版
 * 功能：验证随机生成的11-12位访问码是否存在于数据库中
 * 只有通过付款生成并存储的访问码才能通过验证
 * 
 * 安全增强：
 * - 添加请求频率限制
 * - 增强日志记录
 * - 添加IP和User-Agent检查
 * - 加强参数验证
 */

const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const accessCodesCollection = db.collection('access-codes')
const rateLimitCollection = db.collection('rate-limits')

exports.main = async (event, context) => {
  const startTime = Date.now()
  let clientIP = null
  let userAgent = null
  
  try {
    // 获取客户端信息
    if (context && context.SOURCE) {
      clientIP = context.SOURCE.ip || 'unknown'
    }
    if (event && event.headers) {
      userAgent = event.headers['user-agent'] || event.headers['User-Agent'] || 'unknown'
    }
    
    console.log(`[安全日志] 验证请求开始 - IP: ${clientIP}, UA: ${userAgent}`)
    
    // 处理HTTP请求数据
    let data = event
    if (event.body) {
      // HTTP请求时，数据在body中
      if (typeof event.body === 'string') {
        try {
          data = JSON.parse(event.body)
        } catch (e) {
          console.error('[安全错误] JSON解析失败:', e)
          await logSecurityEvent('json_parse_error', clientIP, userAgent, event.body)
          return {
            success: false,
            message: '请求数据格式错误'
          }
        }
      } else {
        data = event.body
      }
    }
    
    const { accessCode, code, deviceId } = data
    const inputCode = accessCode || code // 兼容两种参数名
    
    // 增强的参数验证
    if (!inputCode || !deviceId) {
      await logSecurityEvent('missing_parameters', clientIP, userAgent, data)
      return {
        success: false,
        message: '参数错误：缺少访问码或设备ID'
      }
    }
    
    // 检查请求频率限制
    const rateLimitCheck = await checkRateLimit(clientIP, deviceId)
    if (!rateLimitCheck.allowed) {
      console.warn(`[安全警告] 请求频率超限 - IP: ${clientIP}, Device: ${deviceId}`)
      await logSecurityEvent('rate_limit_exceeded', clientIP, userAgent, { deviceId, attempts: rateLimitCheck.attempts })
      return {
        success: false,
        message: `请求过于频繁，请${rateLimitCheck.waitSeconds}秒后重试`
      }
    }

    // 格式化访问码（转换为大写）
    const formattedCode = inputCode.toUpperCase().trim()
    
    // 验证访问码格式（11-12位字母数字组合）
    if (!/^[A-Z0-9]{11,12}$/.test(formattedCode)) {
      return {
        success: false,
        message: '访问码格式错误，应为11-12位字母数字组合'
      }
    }

    // 查询访问码
    const codeResult = await accessCodesCollection
      .where({
        code: formattedCode
      })
      .get()

    if (codeResult.data.length === 0) {
      // 记录无效访问尝试
      await recordAccessAttempt(inputCode, deviceId, 'invalid', '访问码不存在', clientIP, userAgent)
      
      return {
        success: false,
        message: '访问码无效或已过期'
      }
    }

    const codeData = codeResult.data[0]

    // 检查访问码状态
    if (!codeData.isActive) {
      await recordAccessAttempt(inputCode, deviceId, 'inactive', '访问码已被禁用', clientIP, userAgent)
      
      return {
        success: false,
        message: '访问码已被禁用，请联系客服'
      }
    }

    // 检查访问码是否已过期
    if (codeData.expiresAt && new Date() > new Date(codeData.expiresAt)) {
      await recordAccessAttempt(inputCode, deviceId, 'expired', '访问码已过期', clientIP, userAgent)
      
      return {
        success: false,
        message: '访问码已过期'
      }
    }

    // 检查是否存在异常使用模式
    const usagePattern = await analyzeUsagePattern(codeData, deviceId, clientIP)
    if (usagePattern.suspicious) {
      console.warn(`[安全警告] 检测到可疑使用模式:`, usagePattern)
      await logSecurityEvent('suspicious_usage', clientIP, userAgent, {
        code: formattedCode,
        deviceId,
        pattern: usagePattern
      })
    }

    // 更新最后使用时间和设备信息
    await accessCodesCollection
      .doc(codeData._id)
      .update({
        lastUsedAt: new Date(),
        lastUsedDevice: deviceId,
        lastUsedIP: clientIP,
        usageCount: codeData.usageCount ? codeData.usageCount + 1 : 1
      })

    // 重置该IP和设备的速率限制（验证成功后）
    await resetRateLimit(clientIP, deviceId)

    // 记录成功访问
    await recordAccessAttempt(inputCode, deviceId, 'success', '验证成功', clientIP, userAgent)

    const responseTime = Date.now() - startTime
    console.log(`[安全日志] 验证成功 - Code: ${formattedCode}, Time: ${responseTime}ms`)

    return {
      success: true,
      message: '访问码验证成功',
      data: {
        code: formattedCode,
        purchaseDate: codeData.purchaseDate,
        features: codeData.features || ['sight-reading-tool'],
        expiresAt: codeData.expiresAt,
        usageCount: codeData.usageCount + 1,
        paymentMethod: codeData.paymentMethod || 'unknown',
        amount: codeData.amount || 0,
        currency: codeData.currency || 'CNY',
        orderId: codeData.orderId
      }
    }

  } catch (error) {
    console.error('[安全错误] 验证访问码时发生错误:', error)
    
    // 记录错误事件
    try {
      await logSecurityEvent('server_error', clientIP, userAgent, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date()
      })
    } catch (logError) {
      console.error('记录错误日志失败:', logError)
    }
    
    return {
      success: false,
      message: '服务器错误，请稍后重试'
    }
  }
}

// 记录访问尝试日志 - 增强版
async function recordAccessAttempt(code, deviceId, status, message, ip, userAgent) {
  try {
    await db.collection('access-logs').add({
      code: code,
      deviceId: deviceId,
      status: status,
      message: message,
      timestamp: new Date(),
      ip: ip || 'unknown',
      userAgent: userAgent || 'unknown',
      source: 'verify-access-code-v2'
    })
  } catch (error) {
    console.error('记录访问日志失败:', error)
  }
}

// 检查请求频率限制
async function checkRateLimit(ip, deviceId) {
  const now = Date.now()
  const windowMinutes = 5 // 5分钟窗口
  const maxAttempts = 10 // 每个窗口最多10次尝试
  const windowStart = now - (windowMinutes * 60 * 1000)
  
  try {
    // 检查IP的请求频率
    const ipLimitResult = await rateLimitCollection
      .where({
        identifier: ip,
        type: 'ip',
        timestamp: db.command.gte(new Date(windowStart))
      })
      .count()
    
    // 检查设备的请求频率
    const deviceLimitResult = await rateLimitCollection
      .where({
        identifier: deviceId,
        type: 'device',
        timestamp: db.command.gte(new Date(windowStart))
      })
      .count()
    
    const ipAttempts = ipLimitResult.total || 0
    const deviceAttempts = deviceLimitResult.total || 0
    
    // 记录本次尝试
    await rateLimitCollection.add({
      identifier: ip,
      type: 'ip',
      timestamp: new Date(),
      deviceId: deviceId
    })
    
    await rateLimitCollection.add({
      identifier: deviceId,
      type: 'device',
      timestamp: new Date(),
      ip: ip
    })
    
    // 检查是否超过限制
    if (ipAttempts >= maxAttempts || deviceAttempts >= maxAttempts) {
      const waitSeconds = Math.ceil((windowMinutes * 60) - ((now - windowStart) / 1000))
      return {
        allowed: false,
        attempts: Math.max(ipAttempts, deviceAttempts),
        maxAttempts,
        waitSeconds
      }
    }
    
    return {
      allowed: true,
      attempts: Math.max(ipAttempts, deviceAttempts),
      maxAttempts
    }
    
  } catch (error) {
    console.error('检查频率限制失败:', error)
    // 出错时允许请求，但记录错误
    return { allowed: true, attempts: 0, maxAttempts }
  }
}

// 重置速率限制（验证成功后）
async function resetRateLimit(ip, deviceId) {
  try {
    const now = Date.now()
    const resetWindow = now - (60 * 1000) // 重置1分钟内的记录
    
    await rateLimitCollection
      .where({
        identifier: ip,
        timestamp: db.command.gte(new Date(resetWindow))
      })
      .remove()
    
    await rateLimitCollection
      .where({
        identifier: deviceId,
        timestamp: db.command.gte(new Date(resetWindow))
      })
      .remove()
      
  } catch (error) {
    console.error('重置速率限制失败:', error)
  }
}

// 分析使用模式
async function analyzeUsagePattern(codeData, deviceId, ip) {
  try {
    const now = Date.now()
    const dayAgo = now - (24 * 60 * 60 * 1000)
    
    // 检查24小时内的使用记录
    const recentLogs = await db.collection('access-logs')
      .where({
        code: codeData.code,
        timestamp: db.command.gte(new Date(dayAgo)),
        status: 'success'
      })
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get()
    
    const logs = recentLogs.data || []
    
    // 分析可疑模式
    let suspicious = false
    const reasons = []
    
    // 1. 检查不同IP使用同一访问码
    const uniqueIPs = [...new Set(logs.map(log => log.ip).filter(ip => ip && ip !== 'unknown'))]
    if (uniqueIPs.length > 3) {
      suspicious = true
      reasons.push(`多个IP使用同一访问码: ${uniqueIPs.length}个IP`)
    }
    
    // 2. 检查不同设备使用同一访问码
    const uniqueDevices = [...new Set(logs.map(log => log.deviceId).filter(id => id))]
    if (uniqueDevices.length > 2) {
      suspicious = true
      reasons.push(`多个设备使用同一访问码: ${uniqueDevices.length}个设备`)
    }
    
    // 3. 检查使用频率是否过高
    if (logs.length > 20) {
      suspicious = true
      reasons.push(`24小时内使用次数过多: ${logs.length}次`)
    }
    
    // 4. 检查是否在短时间内从不同地理位置访问
    const recentDifferentIPs = logs
      .slice(0, 10)
      .map(log => log.ip)
      .filter((ip, index, arr) => arr.indexOf(ip) === index)
    
    if (recentDifferentIPs.length > 2) {
      suspicious = true
      reasons.push(`短时间内从多个IP访问: ${recentDifferentIPs.join(', ')}`)
    }
    
    return {
      suspicious,
      reasons,
      stats: {
        totalUsage: logs.length,
        uniqueIPs: uniqueIPs.length,
        uniqueDevices: uniqueDevices.length,
        recentIPs: recentDifferentIPs
      }
    }
    
  } catch (error) {
    console.error('分析使用模式失败:', error)
    return { suspicious: false, reasons: [], stats: {} }
  }
}

// 记录安全事件
async function logSecurityEvent(eventType, ip, userAgent, data) {
  try {
    await db.collection('security-logs').add({
      eventType,
      ip: ip || 'unknown',
      userAgent: userAgent || 'unknown',
      timestamp: new Date(),
      data: data || {},
      source: 'verify-access-code'
    })
  } catch (error) {
    console.error('记录安全事件失败:', error)
  }
}