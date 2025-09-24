/**
 * 退款管理系统
 * 支持：申请退款、处理退款、7天限制规则
 * 
 * API 端点：
 * - /api/refund/request - 申请退款
 * - /api/refund/process - 处理退款（内部使用）
 * - /api/refund/check-eligibility - 检查退款资格
 */

const cloud = require('@cloudbase/node-sdk')
const { checkRefundTimeLimit, formatRefundTimeError } = require('../../../cloudbase-functions/utils/refundTimeChecker')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const ordersCollection = db.collection('unified_payment_orders')
const licensesCollection = db.collection('licenses')
const refundRequestsCollection = db.collection('refund_requests')
const accessLogsCollection = db.collection('unified_access_logs')

// 7天退款期限（毫秒）
const REFUND_PERIOD_DAYS = 7
const REFUND_PERIOD_MS = REFUND_PERIOD_DAYS * 24 * 60 * 60 * 1000

// 调用其他云函数的辅助函数
async function callCloudFunction(functionName, data) {
  try {
    const result = await cloud.callFunction({
      name: functionName,
      data: data
    })
    return result.result
  } catch (error) {
    console.error(`❌ 调用云函数 ${functionName} 失败:`, error)
    throw error
  }
}

// 记录退款日志
async function logRefundAction(action, result, details) {
  try {
    await accessLogsCollection.add({
      logId: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action: `REFUND_${action.toUpperCase()}`,
      result: result,
      
      licenseId: details.licenseId || null,
      licenseKey: details.licenseKey || null,
      orderId: details.orderId || null,
      deviceId: null,
      
      clientIp: details.clientIp || 'system',
      userAgent: details.userAgent || 'refund-manager',
      platform: 'system',
      
      details: details.details || {},
      
      timestamp: new Date(),
      createdAt: new Date()
    })
  } catch (error) {
    console.log('⚠️ 退款日志记录失败:', error.message)
  }
}

exports.main = async (event, context) => {
  try {
    // 解析请求数据
    let data = event
    if (event.body) {
      try {
        data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      } catch (e) {
        throw new Error('无效的请求数据格式')
      }
    }
    
    const action = data.action || 'request' // request | process | check-eligibility
    const clientIp = event.clientIP || context.clientIP || 'unknown'
    const userAgent = event.headers?.['user-agent'] || 'unknown'
    
    console.log(`🔄 退款管理请求: ${action}`)
    
    // 根据动作执行不同的操作
    switch (action) {
      
      case 'request':
        return await requestRefund(data, clientIp, userAgent)
        
      case 'process':
        return await processRefund(data, clientIp, userAgent)
        
      case 'check-eligibility':
        return await checkRefundEligibility(data, clientIp, userAgent)
        
      default:
        throw new Error(`未知的操作类型: ${action}`)
    }
    
  } catch (error) {
    console.error('❌ 退款管理操作失败:', error)
    
    // 记录错误日志
    try {
      await db.collection('error-logs').add({
        function: 'refund-manager',
        error: error.message,
        stack: error.stack,
        event: event,
        timestamp: new Date()
      })
    } catch (logError) {
      console.error('❌ 错误日志记录失败:', logError)
    }
    
    return {
      success: false,
      message: error.message || '退款操作失败'
    }
  }
}

// 1. 申请退款
async function requestRefund(data, clientIp, userAgent) {
  const {
    orderId,
    customerEmail,
    refundReason = '7天内无理由退款'
  } = data
  
  if (!orderId || !customerEmail) {
    throw new Error('缺少必要参数：orderId 和 customerEmail')
  }
  
  // 查找订单
  const orderResult = await ordersCollection
    .where({ orderId: orderId, customerEmail: customerEmail, status: 'PAID' })
    .get()
  
  if (orderResult.data.length === 0) {
    throw new Error('订单不存在或未支付')
  }
  
  const order = orderResult.data[0]
  
  // 检查退款资格
  const eligibilityResult = await checkRefundEligibility({
    orderId: orderId,
    customerEmail: customerEmail
  }, clientIp, userAgent)
  
  if (!eligibilityResult.success || !eligibilityResult.eligible) {
    return {
      success: false,
      message: eligibilityResult.message,
      reason: eligibilityResult.reason
    }
  }
  
  // 检查是否已经申请过退款
  const existingRequestResult = await refundRequestsCollection
    .where({ orderId: orderId })
    .get()
  
  if (existingRequestResult.data.length > 0) {
    const existingRequest = existingRequestResult.data[0]
    return {
      success: false,
      message: '该订单已经提交过退款申请',
      existingRequest: {
        refundRequestId: existingRequest.refundRequestId,
        status: existingRequest.status,
        requestedAt: existingRequest.requestedAt
      }
    }
  }
  
  // 创建退款申请记录
  const refundRequestId = `REF-REQ-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
  
  const refundRequestData = {
    refundRequestId: refundRequestId,
    
    // 关联信息
    orderId: orderId,
    licenseId: order.licenseId,
    
    // 客户信息
    customerEmail: customerEmail,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    
    // 退款信息
    refundAmount: order.amount,
    refundReason: refundReason,
    
    // 状态管理
    status: 'REQUESTED', // REQUESTED | PROCESSING | COMPLETED | REJECTED
    
    // 时间信息
    requestedAt: new Date(),
    processedAt: null,
    completedAt: null,
    
    // 支付信息
    paymentProvider: order.paymentProvider,
    paymentMethod: order.paymentMethod,
    stripePaymentIntentId: order.stripePaymentIntentId,
    alipayTradeNo: order.alipayTradeNo,
    
    // 处理信息
    processedBy: null,
    adminNotes: null,
    
    // 元数据
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  const refundRequestResult = await refundRequestsCollection.add(refundRequestData)
  console.log('✅ 退款申请记录已创建:', refundRequestId)
  
  // 更新订单状态
  await ordersCollection.doc(order._id).update({
    refundStatus: 'REQUESTED',
    refundRequestedAt: new Date(),
    updatedAt: new Date()
  })
  
  await logRefundAction('REQUEST_CREATED', 'SUCCESS', {
    orderId: orderId,
    licenseId: order.licenseId,
    clientIp, userAgent,
    details: {
      message: '退款申请已提交',
      refundRequestId: refundRequestId,
      refundAmount: order.amount,
      refundReason: refundReason
    }
  })
  
  return {
    success: true,
    message: '退款申请已提交成功',
    refundRequest: {
      refundRequestId: refundRequestId,
      orderId: orderId,
      refundAmount: order.amount,
      status: 'REQUESTED',
      requestedAt: new Date(),
      expectedProcessingTime: '1-3个工作日'
    }
  }
}

// 2. 检查退款资格
async function checkRefundEligibility(data, clientIp, userAgent) {
  const { orderId, customerEmail } = data
  
  if (!orderId || !customerEmail) {
    throw new Error('缺少必要参数：orderId 和 customerEmail')
  }
  
  // 查找订单
  const orderResult = await ordersCollection
    .where({ orderId: orderId, customerEmail: customerEmail })
    .get()
  
  if (orderResult.data.length === 0) {
    return {
      success: false,
      eligible: false,
      message: '订单不存在或不属于该用户',
      reason: 'ORDER_NOT_FOUND'
    }
  }
  
  const order = orderResult.data[0]
  
  // 检查订单状态
  if (order.status !== 'PAID') {
    return {
      success: false,
      eligible: false,
      message: `订单状态为 ${order.status}，不符合退款条件`,
      reason: 'ORDER_NOT_PAID'
    }
  }
  
  // 检查是否已经退款
  if (order.refundStatus === 'COMPLETED') {
    return {
      success: false,
      eligible: false,
      message: '该订单已经退款完成',
      reason: 'ALREADY_REFUNDED'
    }
  }
  
  // 🕐 检查退款时间期限（7天内）- 使用统一时间检查器
  const orderRecord = {
    paid_at: order.paidAt,
    paidAt: order.paidAt // 兼容不同字段名
  };

  const timeCheck = checkRefundTimeLimit(orderRecord);

  if (!timeCheck.valid) {
    return {
      success: false,
      eligible: false,
      message: timeCheck.message,
      reason: 'REFUND_PERIOD_EXPIRED',
      purchaseDate: timeCheck.purchase_time_str,
      daysSincePurchase: timeCheck.days_passed,
      refundDeadline: new Date(new Date(order.paidAt).getTime() + REFUND_PERIOD_MS).toLocaleDateString('zh-CN')
    }
  }

  const daysSincePurchase = timeCheck.days_passed;
  
  await logRefundAction('ELIGIBILITY_CHECK', 'SUCCESS', {
    orderId: orderId,
    licenseId: order.licenseId,
    clientIp, userAgent,
    details: {
      message: '退款资格检查',
      eligible: true,
      daysSincePurchase: daysSincePurchase
    }
  })
  
  return {
    success: true,
    eligible: true,
    message: '符合退款条件',
    order: {
      orderId: orderId,
      amount: order.amount,
      purchaseDate: paidAt.toLocaleDateString('zh-CN'),
      daysSincePurchase: daysSincePurchase,
      daysRemaining: REFUND_PERIOD_DAYS - daysSincePurchase
    }
  }
}

// 3. 处理退款（管理员或系统调用）
async function processRefund(data, clientIp, userAgent) {
  const {
    refundRequestId,
    status, // PROCESSING | COMPLETED | REJECTED
    adminNotes = '',
    processedBy = 'system'
  } = data
  
  if (!refundRequestId || !status) {
    throw new Error('缺少必要参数：refundRequestId 和 status')
  }
  
  // 查找退款申请
  const refundRequestResult = await refundRequestsCollection
    .where({ refundRequestId: refundRequestId })
    .get()
  
  if (refundRequestResult.data.length === 0) {
    throw new Error('退款申请不存在')
  }
  
  const refundRequest = refundRequestResult.data[0]
  
  // 查找关联订单
  const orderResult = await ordersCollection
    .where({ orderId: refundRequest.orderId })
    .get()
  
  if (orderResult.data.length === 0) {
    throw new Error('关联订单不存在')
  }
  
  const order = orderResult.data[0]
  
  // 更新退款申请状态
  const updateData = {
    status: status,
    processedBy: processedBy,
    processedAt: new Date(),
    adminNotes: adminNotes,
    updatedAt: new Date()
  }
  
  if (status === 'COMPLETED') {
    updateData.completedAt = new Date()
  }
  
  await refundRequestsCollection.doc(refundRequest._id).update(updateData)
  
  // 更新订单状态
  const orderUpdateData = {
    refundStatus: status,
    refundProcessedAt: new Date(),
    updatedAt: new Date()
  }
  
  if (status === 'COMPLETED') {
    orderUpdateData.status = 'REFUNDED'
    orderUpdateData.refundedAt = new Date()
    orderUpdateData.refundAmount = refundRequest.refundAmount
    orderUpdateData.refundReason = refundRequest.refundReason
  }
  
  await ordersCollection.doc(order._id).update(orderUpdateData)
  
  // 如果退款完成，吊销许可证
  if (status === 'COMPLETED' && order.licenseId) {
    try {
      const licenseResult = await licensesCollection
        .where({ licenseId: order.licenseId })
        .get()
      
      if (licenseResult.data.length > 0) {
        await licensesCollection.doc(licenseResult.data[0]._id).update({
          status: 'REVOKED',
          revokedAt: new Date(),
          revokeReason: '退款完成，许可证自动吊销',
          updatedAt: new Date()
        })
        
        console.log('✅ 许可证已吊销:', order.licenseId)
      }
    } catch (licenseError) {
      console.error('⚠️ 许可证吊销失败（非致命错误）:', licenseError.message)
    }
  }
  
  // 发送退款通知邮件
  if (status === 'COMPLETED') {
    try {
      await callCloudFunction('email-service', {
        action: 'refund-notification',
        orderId: order.orderId,
        licenseKey: order.licenseId,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        refundAmount: refundRequest.refundAmount,
        refundReason: refundRequest.refundReason,
        refundProcessedAt: new Date()
      })
      
      console.log('✅ 退款通知邮件发送成功')
    } catch (emailError) {
      console.error('⚠️ 退款通知邮件发送失败（非致命错误）:', emailError.message)
    }
  }
  
  await logRefundAction('PROCESSED', 'SUCCESS', {
    orderId: order.orderId,
    licenseId: order.licenseId,
    clientIp, userAgent,
    details: {
      message: `退款申请已处理：${status}`,
      refundRequestId: refundRequestId,
      refundAmount: refundRequest.refundAmount,
      processedBy: processedBy
    }
  })
  
  return {
    success: true,
    message: `退款申请处理完成：${status}`,
    refundRequest: {
      refundRequestId: refundRequestId,
      orderId: order.orderId,
      status: status,
      processedAt: new Date(),
      refundAmount: status === 'COMPLETED' ? refundRequest.refundAmount : 0
    }
  }
}