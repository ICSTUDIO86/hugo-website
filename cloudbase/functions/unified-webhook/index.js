/**
 * 统一 Webhook 处理系统
 * 支持：Stripe 支付事件、支付宝支付事件、退款事件
 * 
 * API 端点：
 * - /api/webhook/stripe - Stripe Webhook 处理
 * - /api/webhook/alipay - 支付宝 Webhook 处理（保持兼容）
 * - /api/webhook/unified - 统一 Webhook 入口
 */

const cloud = require('@cloudbase/node-sdk')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const crypto = require('crypto')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const ordersCollection = db.collection('unified_payment_orders')
const licensesCollection = db.collection('licenses')
const accessLogsCollection = db.collection('unified_access_logs')

// 调用其他云函数的辅助函数
async function callCloudFunction(functionName, data) {
  try {
    console.log(`🚀 调用云函数: ${functionName}`)
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

// 记录 Webhook 访问日志
async function logWebhookAccess(source, eventType, result, details) {
  try {
    await accessLogsCollection.add({
      logId: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action: `WEBHOOK_${source.toUpperCase()}_${eventType.toUpperCase()}`,
      result: result,
      
      licenseId: details.licenseId || null,
      licenseKey: details.licenseKey || null,
      orderId: details.orderId || null,
      deviceId: null,
      
      clientIp: details.clientIp || 'webhook',
      userAgent: `${source}-webhook`,
      platform: 'webhook',
      
      details: details.details || {},
      
      timestamp: new Date(),
      createdAt: new Date()
    })
  } catch (error) {
    console.log('⚠️ Webhook 日志记录失败:', error.message)
  }
}

exports.main = async (event, context) => {
  try {
    console.log('🔔 统一 Webhook 处理请求')
    
    // 确定 webhook 来源
    const userAgent = event.headers?.['user-agent'] || ''
    const stripeSignature = event.headers?.['stripe-signature']
    const contentType = event.headers?.['content-type'] || ''
    
    let webhookSource = 'unknown'
    
    if (stripeSignature) {
      webhookSource = 'stripe'
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      webhookSource = 'alipay'
    } else if (event.body && typeof event.body === 'string') {
      try {
        const parsedBody = JSON.parse(event.body)
        if (parsedBody.type) {
          webhookSource = 'stripe'
        }
      } catch (e) {
        // 继续使用 unknown
      }
    }
    
    console.log(`📡 检测到 webhook 来源: ${webhookSource}`)
    
    // 根据来源处理不同的 webhook
    switch (webhookSource) {
      case 'stripe':
        return await handleStripeWebhook(event, context)
        
      case 'alipay':
        return await handleAlipayWebhook(event, context)
        
      default:
        // 尝试通用处理
        return await handleGenericWebhook(event, context)
    }
    
  } catch (error) {
    console.error('❌ Webhook 处理失败:', error)
    
    // 记录错误日志
    try {
      await db.collection('error-logs').add({
        function: 'unified-webhook',
        error: error.message,
        stack: error.stack,
        event: {
          headers: event.headers,
          body: event.body?.substring(0, 1000) // 只记录前1000字符避免过大
        },
        timestamp: new Date()
      })
    } catch (logError) {
      console.error('❌ 错误日志记录失败:', logError)
    }
    
    return {
      success: false,
      message: error.message || 'Webhook 处理失败'
    }
  }
}

// 处理 Stripe Webhook
async function handleStripeWebhook(event, context) {
  console.log('💳 处理 Stripe Webhook')
  
  const sig = event.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
  
  let stripeEvent
  
  try {
    // 验证 webhook 签名
    stripeEvent = stripe.webhooks.constructEvent(
      event.body, 
      sig, 
      endpointSecret
    )
    console.log('✅ Stripe Webhook 签名验证成功')
  } catch (err) {
    console.error('❌ Stripe Webhook 签名验证失败:', err.message)
    await logWebhookAccess('stripe', 'signature_failed', 'FAILED', {
      details: { error: err.message },
      clientIp: event.clientIP || context.clientIP
    })
    throw new Error(`Webhook 签名无效: ${err.message}`)
  }
  
  console.log(`📨 Stripe 事件类型: ${stripeEvent.type}`)
  
  // 根据事件类型处理
  switch (stripeEvent.type) {
    
    case 'checkout.session.completed':
      return await handleStripePaymentSuccess(stripeEvent, context)
      
    case 'payment_intent.succeeded':
      return await handleStripePaymentConfirmed(stripeEvent, context)
      
    case 'payment_intent.payment_failed':
      return await handleStripePaymentFailed(stripeEvent, context)
      
    case 'charge.dispute.created':
      return await handleStripeDispute(stripeEvent, context)
      
    case 'invoice.payment_action_required':
      return await handleStripePaymentActionRequired(stripeEvent, context)
      
    default:
      console.log(`⚠️ 未处理的 Stripe 事件类型: ${stripeEvent.type}`)
      await logWebhookAccess('stripe', stripeEvent.type, 'IGNORED', {
        details: { message: '未处理的事件类型' },
        clientIp: event.clientIP || context.clientIP
      })
      
      return {
        success: true,
        message: `事件类型 ${stripeEvent.type} 已忽略`
      }
  }
}

// 处理 Stripe 支付成功（Checkout Session 完成）
async function handleStripePaymentSuccess(stripeEvent, context) {
  const session = stripeEvent.data.object
  console.log('✅ Stripe 支付成功:', session.id)
  
  const orderId = session.metadata?.orderId
  if (!orderId) {
    throw new Error('Checkout Session 缺少 orderId 元数据')
  }
  
  // 查找订单
  const orderResult = await ordersCollection
    .where({ orderId: orderId, stripeSessionId: session.id })
    .get()
  
  if (orderResult.data.length === 0) {
    throw new Error(`订单不存在: ${orderId}`)
  }
  
  const order = orderResult.data[0]
  
  // 检查订单是否已经处理过
  if (order.status === 'PAID' && order.licenseId) {
    console.log('⚠️ 订单已处理过，跳过重复处理')
    await logWebhookAccess('stripe', 'payment_success', 'DUPLICATE', {
      orderId: orderId,
      licenseId: order.licenseId,
      details: { message: '订单已处理，跳过重复处理' },
      clientIp: context.clientIP
    })
    
    return {
      success: true,
      message: '订单已处理过'
    }
  }
  
  // 更新订单状态
  await ordersCollection.doc(order._id).update({
    status: 'PAID',
    stripePaymentIntentId: session.payment_intent,
    stripeCustomerId: session.customer,
    paidAt: new Date(),
    updatedAt: new Date()
  })
  
  console.log('✅ 订单状态已更新为 PAID')
  
  // 生成许可证
  try {
    const licenseResult = await callCloudFunction('license-manager', {
      action: 'generate',
      paymentOrderId: orderId,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      customerPhone: order.customerPhone || '',
      maxDevices: -1 // 无限设备
    })
    
    if (!licenseResult.success) {
      throw new Error(`许可证生成失败: ${licenseResult.message}`)
    }
    
    console.log('✅ 许可证生成成功:', licenseResult.license.licenseKey)
    
    // 🔧 FIX: 为Stripe支付也创建access-codes记录，确保verify-access-code函数能验证
    try {
      const accessCodesCollection = db.collection('access-codes')
      const accessCodeData = {
        code: licenseResult.license.licenseKey, // 使用许可证密钥作为访问码
        orderId: orderId,
        deviceId: 'unknown',
        paymentMethod: 'stripe',
        amount: order.amount / 100, // Stripe金额是分，转换为元
        features: ['sight-reading-tool'],
        isActive: true,
        expiresAt: null, // 永久有效
        createdAt: new Date(),
        purchaseDate: new Date(),
        usageCount: 0,
        
        // Stripe特有字段
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        
        lastUsedAt: null,
        lastUsedDevice: null,
        lastUsedIP: null
      }
      
      await accessCodesCollection.add(accessCodeData)
      console.log('✅ Stripe访问码记录已创建到access-codes集合')
    } catch (accessCodeError) {
      console.error('⚠️ 创建Stripe访问码记录失败（非致命错误）:', accessCodeError.message)
    }
    
    // 发送许可证激活邮件
    try {
      const emailResult = await callCloudFunction('email-service', {
        action: 'send-license',
        licenseId: licenseResult.license.licenseId,
        licenseKey: licenseResult.license.licenseKey,
        customerEmail: order.customerEmail,
        customerName: order.customerName
      })
      
      console.log('✅ 许可证激活邮件发送成功')
    } catch (emailError) {
      console.error('⚠️ 许可证激活邮件发送失败（非致命错误）:', emailError.message)
    }
    
    await logWebhookAccess('stripe', 'payment_success', 'SUCCESS', {
      orderId: orderId,
      licenseId: licenseResult.license.licenseId,
      licenseKey: licenseResult.license.licenseKey,
      details: { 
        message: 'Stripe 支付成功处理完成',
        sessionId: session.id,
        paymentIntent: session.payment_intent,
        customerEmail: order.customerEmail
      },
      clientIp: context.clientIP
    })
    
    return {
      success: true,
      message: 'Stripe 支付成功处理完成',
      order: {
        orderId: orderId,
        status: 'PAID',
        licenseKey: licenseResult.license.licenseKey
      }
    }
    
  } catch (licenseError) {
    console.error('❌ 许可证生成失败:', licenseError.message)
    
    await logWebhookAccess('stripe', 'payment_success', 'FAILED', {
      orderId: orderId,
      details: { 
        message: '许可证生成失败',
        error: licenseError.message 
      },
      clientIp: context.clientIP
    })
    
    throw new Error(`支付成功但许可证生成失败: ${licenseError.message}`)
  }
}

// 处理 Stripe 支付确认
async function handleStripePaymentConfirmed(stripeEvent, context) {
  const paymentIntent = stripeEvent.data.object
  console.log('💰 Stripe 支付确认:', paymentIntent.id)
  
  // 查找关联的订单
  const orderResult = await ordersCollection
    .where({ stripePaymentIntentId: paymentIntent.id })
    .get()
  
  if (orderResult.data.length === 0) {
    console.log('⚠️ 未找到关联订单，可能已在 checkout.session.completed 中处理')
    return {
      success: true,
      message: '未找到关联订单或已处理'
    }
  }
  
  const order = orderResult.data[0]
  
  await logWebhookAccess('stripe', 'payment_confirmed', 'SUCCESS', {
    orderId: order.orderId,
    details: { 
      message: 'Stripe 支付确认',
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount
    },
    clientIp: context.clientIP
  })
  
  return {
    success: true,
    message: 'Stripe 支付确认处理完成'
  }
}

// 处理 Stripe 支付失败
async function handleStripePaymentFailed(stripeEvent, context) {
  const paymentIntent = stripeEvent.data.object
  console.log('❌ Stripe 支付失败:', paymentIntent.id)
  
  // 查找关联的订单
  const orderResult = await ordersCollection
    .where({ stripePaymentIntentId: paymentIntent.id })
    .get()
  
  if (orderResult.data.length > 0) {
    const order = orderResult.data[0]
    
    // 更新订单状态为失败
    await ordersCollection.doc(order._id).update({
      status: 'FAILED',
      updatedAt: new Date()
    })
    
    await logWebhookAccess('stripe', 'payment_failed', 'SUCCESS', {
      orderId: order.orderId,
      details: { 
        message: 'Stripe 支付失败',
        paymentIntentId: paymentIntent.id,
        failureReason: paymentIntent.last_payment_error?.message || '未知原因'
      },
      clientIp: context.clientIP
    })
  } else {
    console.log('⚠️ 未找到关联订单')
  }
  
  return {
    success: true,
    message: 'Stripe 支付失败处理完成'
  }
}

// 处理 Stripe 争议/退款
async function handleStripeDispute(stripeEvent, context) {
  const dispute = stripeEvent.data.object
  console.log('⚖️ Stripe 争议创建:', dispute.id)
  
  const chargeId = dispute.charge
  
  // 通过 charge 查找关联订单（需要扩展查找逻辑）
  // 这里简化处理，实际应用中可能需要更复杂的关联查找
  
  await logWebhookAccess('stripe', 'dispute_created', 'SUCCESS', {
    details: { 
      message: 'Stripe 争议创建',
      disputeId: dispute.id,
      chargeId: chargeId,
      amount: dispute.amount,
      reason: dispute.reason
    },
    clientIp: context.clientIP
  })
  
  return {
    success: true,
    message: 'Stripe 争议处理完成'
  }
}

// 处理 Stripe 需要付款操作
async function handleStripePaymentActionRequired(stripeEvent, context) {
  const invoice = stripeEvent.data.object
  console.log('⚠️ Stripe 需要付款操作:', invoice.id)
  
  await logWebhookAccess('stripe', 'payment_action_required', 'SUCCESS', {
    details: { 
      message: 'Stripe 需要付款操作',
      invoiceId: invoice.id
    },
    clientIp: context.clientIP
  })
  
  return {
    success: true,
    message: 'Stripe 付款操作处理完成'
  }
}

// 处理支付宝 Webhook（保持向后兼容）
async function handleAlipayWebhook(event, context) {
  console.log('💰 处理支付宝 Webhook')
  
  // 调用现有的支付宝处理逻辑
  try {
    const result = await callCloudFunction('generate-access-code', event)
    
    await logWebhookAccess('alipay', 'payment_success', 'SUCCESS', {
      details: { message: '支付宝支付成功处理' },
      clientIp: event.clientIP || context.clientIP
    })
    
    return {
      success: true,
      message: '支付宝 Webhook 处理完成',
      result: result
    }
    
  } catch (error) {
    await logWebhookAccess('alipay', 'payment_failed', 'FAILED', {
      details: { message: '支付宝 Webhook 处理失败', error: error.message },
      clientIp: event.clientIP || context.clientIP
    })
    
    throw error
  }
}

// 处理通用 Webhook
async function handleGenericWebhook(event, context) {
  console.log('🔄 处理通用 Webhook')
  
  // 解析请求体
  let data = event
  if (event.body) {
    try {
      data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    } catch (e) {
      console.log('⚠️ 无法解析请求体，使用原始数据')
    }
  }
  
  // 检查是否是测试 webhook
  if (data.test || data.type === 'test') {
    console.log('✅ 测试 Webhook 接收成功')
    
    await logWebhookAccess('generic', 'test', 'SUCCESS', {
      details: { message: '测试 Webhook' },
      clientIp: event.clientIP || context.clientIP
    })
    
    return {
      success: true,
      message: '测试 Webhook 处理成功',
      timestamp: new Date(),
      receivedData: data
    }
  }
  
  // 记录未识别的 webhook
  await logWebhookAccess('generic', 'unknown', 'WARNING', {
    details: { 
      message: '未识别的 Webhook',
      headers: event.headers,
      bodyPreview: JSON.stringify(data).substring(0, 200)
    },
    clientIp: event.clientIP || context.clientIP
  })
  
  return {
    success: true,
    message: '通用 Webhook 已记录，但未找到对应处理器',
    receivedAt: new Date()
  }
}