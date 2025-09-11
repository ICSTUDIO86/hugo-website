/**
 * Cloudbase 云函数：生成访问码 - 完整版本
 * 包含数据库写入功能
 */

const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const accessCodesCollection = db.collection('access-codes')
const ordersCollection = db.collection('payment-orders')
const accessLogsCollection = db.collection('access-logs')

exports.main = async (event, context) => {
  try {
    console.log('🚀 生成访问码函数启动')
    
    // 基础数据提取
    let data = event
    if (event.body && typeof event.body === 'string') {
      try {
        data = JSON.parse(event.body)
        console.log('✅ JSON解析成功')
      } catch (e) {
        console.log('⚠️ JSON解析失败，使用原始event')
      }
    }
    
    // 提取参数
    const orderId = data.orderId || 'unknown'
    const deviceId = data.deviceId || 'unknown'
    const paymentMethod = data.paymentMethod || 'unknown'
    const amount = data.amount || 0
    const merchantId = data.merchantId || 'unknown'
    const timestamp = data.timestamp || Date.now()
    
    // 新增：客户信息参数
    const buyerAlipayName = data.buyerAlipayName || data.buyer_name || ''
    const buyerAlipayAccount = data.buyerAlipayAccount || data.buyer_account || ''
    const buyerPhone = data.buyerPhone || data.buyer_phone || ''
    const buyerEmail = data.buyerEmail || data.buyer_email || ''
    
    console.log('📊 提取参数:', { 
      orderId, 
      deviceId, 
      paymentMethod, 
      amount, 
      buyerAlipayName: buyerAlipayName ? buyerAlipayName.substring(0, 2) + '***' : '未提供',
      buyerAlipayAccount: buyerAlipayAccount ? buyerAlipayAccount.substring(0, 3) + '***' : '未提供'
    })
    
    // 生成访问码
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let accessCode = ''
    for (let i = 0; i < 12; i++) {
      accessCode += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    console.log('🎫 生成访问码:', accessCode)
    
    // 保存订单记录到数据库
    const orderData = {
      orderId: orderId,
      deviceId: deviceId,
      paymentMethod: paymentMethod,
      amount: amount,
      merchantId: merchantId,
      status: 'paid',
      accessCode: accessCode,
      
      // 新增：客户信息字段
      buyerAlipayName: buyerAlipayName,
      buyerAlipayAccount: buyerAlipayAccount,
      buyerPhone: buyerPhone,
      buyerEmail: buyerEmail,
      
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    console.log('💾 保存订单记录到数据库...')
    const orderResult = await ordersCollection.add(orderData)
    console.log('✅ 订单记录已保存:', orderResult.id)
    
    // 保存访问码记录到数据库
    const accessCodeData = {
      code: accessCode,
      orderId: orderId,
      deviceId: deviceId,
      paymentMethod: paymentMethod,
      amount: amount,
      features: ['sight-reading-tool'],
      isActive: true,
      expiresAt: null, // 永久有效
      createdAt: new Date(),
      purchaseDate: new Date(),
      usageCount: 0,
      lastUsedAt: null,
      lastUsedDevice: null
    }
    
    console.log('💾 保存访问码记录到数据库...')
    const accessResult = await accessCodesCollection.add(accessCodeData)
    console.log('✅ 访问码记录已保存:', accessResult.id)
    
    // 尝试记录访问码生成日志（如果集合存在）
    try {
      const logData = {
        code: accessCode,
        deviceId: deviceId,
        orderId: orderId,
        status: 'generated',
        message: '访问码生成成功',
        timestamp: new Date(),
        requestData: {
          orderId,
          deviceId,
          paymentMethod,
          amount
        }
      }
      
      console.log('📝 尝试记录生成日志...')
      await accessLogsCollection.add(logData)
      console.log('✅ 生成日志已记录')
    } catch (logError) {
      console.log('⚠️ 记录日志失败（忽略）:', logError.message)
    }
    
    // 返回成功结果
    const result = {
      success: true,
      accessCode: accessCode,
      message: '访问码生成成功',
      debug: {
        hasBody: !!event.body,
        orderId: orderId,
        deviceId: deviceId,
        orderRecordId: orderResult.id,
        accessRecordId: accessResult.id,
        timestamp: new Date().toISOString()
      }
    }
    
    console.log('🎉 访问码生成完成:', result)
    return result
    
  } catch (error) {
    console.error('❌ 生成访问码时发生错误:', error)
    
    // 记录错误日志
    try {
      await db.collection('error-logs').add({
        function: 'generate-access-code',
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
      message: '生成失败: ' + error.message
    }
  }
}