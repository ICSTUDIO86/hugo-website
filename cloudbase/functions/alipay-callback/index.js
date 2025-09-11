/**
 * Cloudbase 云函数：支付宝真实支付回调处理
 * 功能：处理支付宝支付成功后的回调，自动生成访问码
 */

const cloud = require('@cloudbase/node-sdk')
const crypto = require('crypto')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()

// 支付宝配置
const ALIPAY_CONFIG = {
  merchantId: '2025090607243839',
  merchantKey: 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN',
  gateway: 'https://zpayz.cn/'
}

exports.main = async (event, context) => {
  console.log('🔔 支付宝回调处理开始')
  console.log('📥 回调数据:', event)
  
  try {
    // 处理HTTP请求数据
    let callbackData = event
    if (event.body) {
      if (typeof event.body === 'string') {
        try {
          callbackData = JSON.parse(event.body)
        } catch (e) {
          // 如果是 form-urlencoded 数据
          callbackData = parseFormData(event.body)
        }
      } else {
        callbackData = event.body
      }
    }

    console.log('📋 解析后的回调数据:', callbackData)

    // 验证必要参数
    if (!callbackData.out_trade_no || !callbackData.trade_no || !callbackData.money) {
      console.error('❌ 缺少必要参数')
      return {
        statusCode: 400,
        body: 'fail'
      }
    }

    // 验证签名
    if (!verifySign(callbackData)) {
      console.error('❌ 签名验证失败')
      return {
        statusCode: 400,
        body: 'fail'
      }
    }

    console.log('✅ 签名验证通过')

    // 检查支付状态
    if (callbackData.trade_status !== 'TRADE_SUCCESS') {
      console.log('⚠️ 支付状态不是成功:', callbackData.trade_status)
      return {
        statusCode: 200,
        body: 'success' // 返回 success 避免重复通知
      }
    }

    // 生成访问码
    const accessCode = generateAccessCode()
    console.log('🎫 生成访问码:', accessCode)

    // 保存订单记录
    const orderData = {
      orderId: callbackData.out_trade_no,
      transactionId: callbackData.trade_no,
      paymentMethod: 'alipay-real',
      amount: parseFloat(callbackData.money),
      currency: 'CNY',
      status: 'completed',
      completedAt: new Date(),
      buyerInfo: callbackData.buyer_email || 'unknown',
      merchantId: ALIPAY_CONFIG.merchantId
    }

    console.log('💾 保存订单记录...')
    const orderResult = await db.collection('orders').add(orderData)
    console.log('✅ 订单记录已保存:', orderResult.id)

    // 保存访问码记录
    const accessCodeData = {
      code: accessCode,
      orderId: callbackData.out_trade_no,
      transactionId: callbackData.trade_no,
      paymentMethod: 'alipay-real',
      amount: parseFloat(callbackData.money),
      currency: 'CNY',
      purchaseDate: new Date(),
      isActive: true,
      expiresAt: null, // 永不过期
      features: ['sight-reading-tool'],
      merchantId: ALIPAY_CONFIG.merchantId,
      deviceId: 'alipay-callback',
      usageCount: 0,
      lastUsedAt: null,
      lastUsedDevice: null
    }

    console.log('💾 保存访问码记录...')
    const accessResult = await db.collection('access-codes').add(accessCodeData)
    console.log('✅ 访问码记录已保存:', accessResult.id)

    // 记录成功日志
    await db.collection('payment-logs').add({
      orderId: callbackData.out_trade_no,
      transactionId: callbackData.trade_no,
      accessCode: accessCode,
      paymentMethod: 'alipay-real',
      amount: parseFloat(callbackData.money),
      status: 'success',
      timestamp: new Date(),
      callbackData: callbackData
    })

    console.log('🎉 支付宝回调处理完成')

    // 返回成功响应
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'success'
    }

  } catch (error) {
    console.error('❌ 支付宝回调处理失败:', error)
    
    // 记录错误日志
    try {
      await db.collection('payment-logs').add({
        orderId: callbackData?.out_trade_no || 'unknown',
        paymentMethod: 'alipay-real',
        status: 'error',
        error: error.message,
        timestamp: new Date(),
        callbackData: callbackData || event
      })
    } catch (logError) {
      console.error('记录错误日志失败:', logError)
    }

    return {
      statusCode: 500,
      body: 'fail'
    }
  }
}

// 解析 form-urlencoded 数据
function parseFormData(body) {
  const params = {}
  const pairs = body.split('&')
  
  pairs.forEach(pair => {
    const [key, value] = pair.split('=')
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value)
    }
  })
  
  return params
}

// 验证签名
function verifySign(params) {
  try {
    const receivedSign = params.sign
    if (!receivedSign) return false

    // 复制参数，移除签名相关字段
    const verifyParams = { ...params }
    delete verifyParams.sign
    delete verifyParams.sign_type

    // 生成验证签名
    const expectedSign = generateSign(verifyParams)
    
    console.log('🔍 签名对比:')
    console.log('  接收签名:', receivedSign)
    console.log('  期望签名:', expectedSign)
    
    return receivedSign.toLowerCase() === expectedSign.toLowerCase()
  } catch (error) {
    console.error('签名验证异常:', error)
    return false
  }
}

// 生成签名
function generateSign(params) {
  // 排序参数
  const sortedKeys = Object.keys(params).sort()
  const signString = sortedKeys
    .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .map(key => `${key}=${params[key]}`)
    .join('&') + `&key=${ALIPAY_CONFIG.merchantKey}`
  
  console.log('🔒 签名字符串:', signString)
  
  // 生成 MD5 签名
  return crypto.createHash('md5').update(signString, 'utf8').digest('hex').toUpperCase()
}

// 生成访问码
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  
  // 生成12位随机码
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return code
}