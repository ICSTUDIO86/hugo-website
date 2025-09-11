/**
 * Stripe 支付收银台创建
 * API: /api/pay/checkout
 * 
 * 创建 Stripe Checkout Session 并返回支付URL
 */

const cloud = require('@cloudbase/node-sdk')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const ordersCollection = db.collection('unified_payment_orders')

exports.main = async (event, context) => {
  try {
    console.log('🚀 Stripe 收银台创建请求')
    
    // 解析请求数据
    let data = event
    if (event.body) {
      try {
        data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      } catch (e) {
        throw new Error('无效的请求数据格式')
      }
    }
    
    const {
      customerEmail,
      customerName = '',
      productName = 'IC Studio 视奏工具',
      amount = 100, // 1.00 CNY in cents
      currency = 'cny',
      successUrl,
      cancelUrl
    } = data
    
    // 参数验证
    if (!customerEmail) {
      throw new Error('客户邮箱是必填项')
    }
    
    if (!successUrl || !cancelUrl) {
      throw new Error('成功和取消回调URL是必填项')
    }
    
    console.log('📋 创建支付参数:', {
      customerEmail,
      customerName: customerName || '未提供',
      amount,
      currency
    })
    
    // 生成唯一订单ID
    const orderId = `STRIPE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    // 创建 Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: productName,
              description: 'IC Studio 专业级视奏旋律生成器 - 永久许可证',
              images: ['https://icstudio.club/images/sight-reading-tool.png']
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      
      // 客户信息
      customer_email: customerEmail,
      
      // 回调URL
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      
      // 元数据
      metadata: {
        orderId: orderId,
        customerName: customerName,
        productName: productName
      },
      
      // 支付完成后的配置
      payment_intent_data: {
        metadata: {
          orderId: orderId,
          customerEmail: customerEmail,
          customerName: customerName
        }
      },
      
      // 自动税费计算（如果需要）
      automatic_tax: { enabled: false },
      
      // 账单地址收集
      billing_address_collection: 'auto'
    })
    
    console.log('✅ Stripe Session 创建成功:', session.id)
    
    // 保存订单记录到数据库（状态为 PENDING）
    const orderData = {
      orderId: orderId,
      
      // 支付信息
      paymentProvider: 'stripe',
      paymentMethod: 'card',
      amount: amount,
      currency: currency.toUpperCase(),
      
      // Stripe 专用字段
      stripeSessionId: session.id,
      stripePaymentIntentId: null, // 将在 webhook 中更新
      stripeCustomerId: null, // 将在 webhook 中更新
      
      // 支付宝字段置空
      alipayTradeNo: null,
      alipayBuyerAccount: null,
      alipayBuyerName: null,
      
      // 客户信息
      customerEmail: customerEmail,
      customerName: customerName,
      customerPhone: '',
      
      // 订单状态
      status: 'PENDING',
      
      // 关联的许可证（将在支付成功后生成）
      licenseId: null,
      
      // 退款信息
      refundStatus: null,
      refundAmount: null,
      refundReason: null,
      refundRequestedAt: null,
      refundProcessedAt: null,
      
      // 时间信息
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: null,
      refundedAt: null
    }
    
    const orderResult = await ordersCollection.add(orderData)
    console.log('✅ 订单记录已保存:', orderResult.id)
    
    // 记录操作日志
    try {
      await db.collection('unified_access_logs').add({
        logId: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        action: 'STRIPE_CHECKOUT_CREATED',
        result: 'SUCCESS',
        
        licenseId: null,
        licenseKey: null,
        orderId: orderId,
        deviceId: null,
        
        clientIp: event.clientIP || context.clientIP || 'unknown',
        userAgent: event.headers?.['user-agent'] || 'unknown',
        platform: 'web',
        
        details: {
          message: 'Stripe 收银台创建成功',
          stripeSessionId: session.id,
          amount: amount,
          currency: currency,
          customerEmail: customerEmail
        },
        
        timestamp: new Date(),
        createdAt: new Date()
      })
    } catch (logError) {
      console.log('⚠️ 日志记录失败（非关键错误）:', logError.message)
    }
    
    // 返回支付 URL
    return {
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      orderId: orderId,
      message: 'Stripe 收银台创建成功',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
    }
    
  } catch (error) {
    console.error('❌ Stripe 收银台创建失败:', error)
    
    // 记录错误日志
    try {
      await db.collection('error-logs').add({
        function: 'stripe-checkout',
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
      message: error.message || 'Stripe 收银台创建失败',
      error: {
        type: error.type || 'unknown',
        code: error.code || 'unknown'
      }
    }
  }
}