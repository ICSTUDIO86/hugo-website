/**
 * CloudBase 云函数：忘记访问码查询
 * 根据支付宝账号查找对应的访问码
 */

const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const paymentOrdersCollection = db.collection('unified_payment_orders')
const licensesCollection = db.collection('licenses')
const accessLogsCollection = db.collection('unified_access_logs')

exports.main = async (event, context) => {
  try {
    console.log('🔍 忘记访问码查询函数启动')
    
    // 解析请求数据
    let data = event
    if (event.body && typeof event.body === 'string') {
      try {
        data = JSON.parse(event.body)
        console.log('✅ JSON解析成功')
      } catch (e) {
        console.log('⚠️ JSON解析失败，使用原始event')
      }
    }
    
    const alipayAccount = data.alipayAccount || data.buyerAlipayAccount || ''
    const deviceId = data.deviceId || 'unknown'
    
    console.log('📊 查询参数:', { alipayAccount: alipayAccount, deviceId })
    
    if (!alipayAccount) {
      return {
        success: false,
        message: '请输入支付宝账号'
      }
    }
    
    // 验证支付宝账号格式（简单验证）
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^1[3-9]\d{9}$/
    
    if (!emailRegex.test(alipayAccount) && !phoneRegex.test(alipayAccount)) {
      return {
        success: false,
        message: '请输入正确的支付宝账号'
      }
    }
    
    // 在 payment-orders 集合中查找匹配的支付宝账号
    console.log('🔍 查找支付记录...')
    const orderResult = await paymentOrdersCollection
      .where({ 
        alipayBuyerAccount: alipayAccount,
        status: 'PAID' // 只查找已支付的记录
      })
      .orderBy('createdAt', 'desc') // 按时间降序，最新的在前
      .limit(10) // 最多返回10条记录
      .get()
    
    if (orderResult.data.length === 0) {
      console.log('❌ 未找到匹配的支付记录:', alipayAccount)
      
      // 记录查找失败日志
      try {
        await accessLogsCollection.add({
          alipayAccount: alipayAccount,
          deviceId: deviceId,
          status: 'not_found',
          message: '支付记录未找到',
          timestamp: new Date()
        })
      } catch (logError) {
        console.log('⚠️ 记录日志失败（忽略）:', logError.message)
      }
      
      return {
        success: false,
        message: '未找到与该支付宝账号关联的订单记录\n\n请检查：\n1. 账号是否输入正确\n2. 是否使用了其他支付方式\n\n如需帮助，请联系客服'
      }
    }
    
    // 获取最新的订单记录
    const latestOrder = orderResult.data[0]
    console.log('✅ 找到订单记录:', {
      orderId: latestOrder.orderId,
      licenseId: latestOrder.licenseId,
      amount: latestOrder.amount,
      createdAt: latestOrder.createdAt
    })
    
    // 检查访问码是否仍然有效
    if (latestOrder.accessCode) {
      console.log('🔍 验证访问码有效性...')
      const codeResult = await accessCodesCollection
        .where({ code: latestOrder.accessCode })
        .get()
      
      if (codeResult.data.length > 0) {
        const codeData = codeResult.data[0]
        
        // 检查访问码状态
        if (!codeData.isActive) {
          console.log('⚠️ 访问码已被禁用')
          return {
            success: false,
            message: '找到相关订单，但访问码已被禁用\n请联系客服处理'
          }
        }
        
        if (codeData.expiresAt && new Date() > new Date(codeData.expiresAt)) {
          console.log('⚠️ 访问码已过期')
          return {
            success: false,
            message: '找到相关订单，但访问码已过期\n请联系客服处理'
          }
        }
      } else {
        console.log('⚠️ 访问码记录未找到')
        return {
          success: false,
          message: '找到支付订单，但访问码记录不存在\n请联系客服处理'
        }
      }
    } else {
      console.log('⚠️ 订单中无访问码信息')
      return {
        success: false,
        message: '找到支付记录，但无访问码信息\n请联系客服处理'
      }
    }
    
    // 记录成功查找日志
    try {
      await accessLogsCollection.add({
        alipayAccount: alipayAccount,
        deviceId: deviceId,
        accessCode: licenseKey,
        orderId: latestOrder.orderId,
        status: 'found',
        message: '访问码查找成功',
        timestamp: new Date()
      })
      console.log('📝 查找成功日志已记录')
    } catch (logError) {
      console.log('⚠️ 记录日志失败（忽略）:', logError.message)
    }
    
    // 为了安全，部分脈敏访问码（仅在生产环境中）
    let displayCode = licenseKey
    const isProduction = process.env.NODE_ENV === 'production'
    
    if (isProduction && displayCode && displayCode.length > 4) {
      // 显示前2位和后2位，中间用*代替
      displayCode = displayCode.substring(0, 2) + '*'.repeat(displayCode.length - 4) + displayCode.substring(displayCode.length - 2)
    }
    
    // 返回结果
    const response = {
      success: true,
      message: '找到了您的访问码\uff01',
      data: {
        accessCode: displayCode, // 测试环境返回完整码，生产环境部分脈敏
        fullCodeRevealed: !isProduction, // 标记是否显示完整码
        orderId: latestOrder.orderId,
        purchaseDate: latestOrder.createdAt,
        amount: latestOrder.amount,
        paymentMethod: latestOrder.paymentMethod,
        buyerName: latestOrder.alipayBuyerName || '未知',
        totalOrders: orderResult.data.length // 该账号下总订单数
      },
      securityNote: isProduction ? '出于安全考虑，访问码已部分脈敏。如需完整访问码，请联系客服。' : null,
      timestamp: new Date()
    }
    
    console.log('🎉 访问码查找完成:', {
      alipayAccount,
      accessCode: displayCode,
      orderId: latestOrder.orderId
    })
    
    return response
    
  } catch (error) {
    console.error('❌ 查找访问码时发生错误:', error)
    
    // 记录错误日志
    try {
      await db.collection('error-logs').add({
        function: 'find-access-code',
        error: error.message,
        stack: error.stack,
        event: event,
        timestamp: new Date()
      })
      console.log('📝 错误日志已记录')
    } catch (logError) {
      console.error('❌ 记录错误日志失败:', logError)
    }
    
    return {
      success: false,
      message: '系统错误，请稍后重试或联系客服'
    }
  }
}