/**
 * 统一许可证管理系统
 * 支持：生成、验证、激活设备、状态管理
 * 
 * API 端点：
 * - /api/license/generate - 生成许可证（支付成功后调用）
 * - /api/license/verify - 验证许可证（网页+软件通用）
 * - /api/license/activate - 激活设备
 * - /api/license/deactivate - 停用设备
 * - /api/license/status - 查询许可证状态
 */

const cloud = require('@cloudbase/node-sdk')
const crypto = require('crypto')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const licensesCollection = db.collection('licenses')
const deviceActivationsCollection = db.collection('device_activations')
const accessLogsCollection = db.collection('unified_access_logs')

// 生成安全的许可证密钥 - 12位纯随机码
function generateLicenseKey() {
  // 格式：XXXXXXXXXXXX (12位纯随机字母数字)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomCode = ''
  for (let i = 0; i < 12; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return randomCode
}

// 生成许可证ID
function generateLicenseId() {
  return `LIC-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
}

// 记录访问日志
async function logAccess(action, result, details) {
  try {
    await accessLogsCollection.add({
      logId: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action: action,
      result: result,
      
      licenseId: details.licenseId || null,
      licenseKey: details.licenseKey || null,
      orderId: details.orderId || null,
      deviceId: details.deviceId || null,
      
      clientIp: details.clientIp || 'unknown',
      userAgent: details.userAgent || 'unknown',
      platform: details.platform || 'unknown',
      
      details: details.details || {},
      
      timestamp: new Date(),
      createdAt: new Date()
    })
  } catch (error) {
    console.log('⚠️ 访问日志记录失败:', error.message)
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
    
    const action = data.action || 'verify' // generate | verify | activate | deactivate | status
    const clientIp = event.clientIP || context.clientIP || 'unknown'
    const userAgent = event.headers?.['user-agent'] || 'unknown'
    
    console.log(`🚀 许可证管理请求: ${action}`)
    
    // 根据动作执行不同的操作
    switch (action) {
      
      case 'generate':
        return await generateLicense(data, clientIp, userAgent)
        
      case 'create_license':
        return await createMockLicense(data, clientIp, userAgent)
        
      case 'verify':
        return await verifyLicense(data, clientIp, userAgent)
        
      case 'activate':
        return await activateDevice(data, clientIp, userAgent)
        
      case 'deactivate':
        return await deactivateDevice(data, clientIp, userAgent)
        
      case 'status':
        return await getLicenseStatus(data, clientIp, userAgent)
        
      default:
        throw new Error(`未知的操作类型: ${action}`)
    }
    
  } catch (error) {
    console.error('❌ 许可证管理操作失败:', error)
    
    // 记录错误日志
    try {
      await db.collection('error-logs').add({
        function: 'license-manager',
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
      message: error.message || '许可证操作失败'
    }
  }
}

// 1. 生成许可证（支付成功后调用）
async function generateLicense(data, clientIp, userAgent) {
  const {
    paymentOrderId,
    customerEmail,
    customerName = '',
    customerPhone = '',
    maxDevices = -1 // -1 表示无限设备
  } = data
  
  if (!paymentOrderId || !customerEmail) {
    throw new Error('缺少必要参数：paymentOrderId 和 customerEmail')
  }
  
  // 检查订单是否存在且已支付
  const orderResult = await db.collection('unified_payment_orders')
    .where({ orderId: paymentOrderId, status: 'PAID' })
    .get()
  
  if (orderResult.data.length === 0) {
    throw new Error('订单不存在或未支付')
  }
  
  const order = orderResult.data[0]
  
  // 检查是否已经为此订单生成过许可证
  const existingLicenseResult = await licensesCollection
    .where({ paymentOrderId: paymentOrderId })
    .get()
  
  if (existingLicenseResult.data.length > 0) {
    const existingLicense = existingLicenseResult.data[0]
    console.log('⚠️ 订单已有许可证，返回现有许可证:', existingLicense.licenseKey)
    
    await logAccess('LICENSE_DUPLICATE_REQUEST', 'WARNING', {
      licenseId: existingLicense.licenseId,
      licenseKey: existingLicense.licenseKey,
      orderId: paymentOrderId,
      clientIp, userAgent,
      details: { message: '尝试为已有许可证的订单生成许可证' }
    })
    
    return {
      success: true,
      license: {
        licenseId: existingLicense.licenseId,
        licenseKey: existingLicense.licenseKey,
        status: existingLicense.status
      },
      message: '订单已存在有效许可证'
    }
  }
  
  // 生成新许可证
  const licenseId = generateLicenseId()
  const licenseKey = generateLicenseKey()
  
  const licenseData = {
    licenseId: licenseId,
    licenseKey: licenseKey,
    
    // 订单关联
    paymentOrderId: paymentOrderId,
    
    // 产品信息
    productName: 'IC Studio 视奏工具',
    productVersion: '1.0.0',
    features: ['sight-reading-generator', 'web-access', 'software-access'],
    
    // 许可证状态
    status: 'ACTIVE',
    
    // 客户信息
    customerEmail: customerEmail,
    customerName: customerName,
    customerPhone: customerPhone,
    
    // 设备管理
    maxDevices: maxDevices,
    activatedDevices: [],
    
    // 时间信息
    issuedAt: new Date(),
    expiresAt: null, // 永久许可证
    activatedAt: null,
    lastUsedAt: null,
    
    // 元数据
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  const licenseResult = await licensesCollection.add(licenseData)
  console.log('✅ 许可证生成成功:', licenseKey)
  
  // 更新订单，关联许可证
  await db.collection('unified_payment_orders')
    .doc(order._id)
    .update({
      licenseId: licenseId,
      updatedAt: new Date()
    })
  
  await logAccess('LICENSE_GENERATED', 'SUCCESS', {
    licenseId: licenseId,
    licenseKey: licenseKey,
    orderId: paymentOrderId,
    clientIp, userAgent,
    details: {
      message: '许可证生成成功',
      customerEmail: customerEmail,
      maxDevices: maxDevices
    }
  })
  
  return {
    success: true,
    license: {
      licenseId: licenseId,
      licenseKey: licenseKey,
      status: 'ACTIVE',
      maxDevices: maxDevices,
      activatedDevices: 0
    },
    message: '许可证生成成功'
  }
}

// 1.5. 创建模拟许可证（用于测试支付）
async function createMockLicense(data, clientIp, userAgent) {
  const {
    paymentMethod = 'unknown',
    amount = 0,
    currency = 'USD',
    customerEmail = 'test@example.com',
    customerName = '测试用户',
    orderId,
    deviceId = 'web-browser',
    deviceName = 'Web Browser'
  } = data
  
  console.log('🧪 创建模拟许可证:', { paymentMethod, amount, currency, orderId })
  
  // 生成新许可证
  const licenseId = generateLicenseId()
  const licenseKey = generateLicenseKey()
  
  const licenseData = {
    licenseId: licenseId,
    licenseKey: licenseKey,
    
    // 模拟订单信息
    paymentOrderId: orderId,
    paymentMethod: paymentMethod,
    amount: amount,
    currency: currency,
    
    // 产品信息
    productName: 'IC Studio 视奏工具',
    productVersion: '1.0.0',
    features: ['sight-reading-generator', 'web-access', 'software-access'],
    
    // 许可证状态
    status: 'ACTIVE',
    
    // 客户信息
    customerEmail: customerEmail,
    customerName: customerName,
    customerPhone: '',
    
    // 设备管理
    maxDevices: -1, // 无限设备
    activatedDevices: [],
    
    // 时间信息
    issuedAt: new Date(),
    expiresAt: null, // 永久许可证
    activatedAt: null,
    lastUsedAt: null,
    
    // 标记为模拟许可证
    isMock: true,
    mockData: {
      deviceId: deviceId,
      deviceName: deviceName,
      generatedBy: 'mock-payment'
    },
    
    // 元数据
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  const licenseResult = await licensesCollection.add(licenseData)
  console.log('✅ 模拟许可证生成成功:', licenseKey)
  
  // 记录访问日志
  await logAccess('MOCK_LICENSE_CREATED', 'SUCCESS', {
    licenseId: licenseId,
    licenseKey: licenseKey,
    orderId: orderId,
    clientIp, userAgent,
    details: {
      message: '模拟许可证生成成功',
      paymentMethod: paymentMethod,
      amount: amount,
      currency: currency
    }
  })
  
  return {
    success: true,
    licenseKey: licenseKey,
    license: {
      licenseId: licenseId,
      licenseKey: licenseKey,
      status: 'ACTIVE',
      maxDevices: -1,
      activatedDevices: 0
    },
    message: '模拟许可证生成成功'
  }
}

// 2. 验证许可证（网页+软件通用）
async function verifyLicense(data, clientIp, userAgent) {
  const { licenseKey, deviceId, platform = 'unknown' } = data
  
  if (!licenseKey) {
    throw new Error('缺少必要参数：licenseKey')
  }
  
  // 查找许可证
  const licenseResult = await licensesCollection
    .where({ licenseKey: licenseKey })
    .get()
  
  if (licenseResult.data.length === 0) {
    await logAccess('LICENSE_VERIFY', 'FAILED', {
      licenseKey: licenseKey,
      deviceId: deviceId,
      clientIp, userAgent, platform,
      details: { message: '许可证不存在' }
    })
    
    return {
      success: false,
      valid: false,
      message: '许可证不存在或无效'
    }
  }
  
  const license = licenseResult.data[0]
  
  // 检查许可证状态
  if (license.status !== 'ACTIVE') {
    await logAccess('LICENSE_VERIFY', 'FAILED', {
      licenseId: license.licenseId,
      licenseKey: licenseKey,
      deviceId: deviceId,
      clientIp, userAgent, platform,
      details: { message: `许可证状态无效: ${license.status}` }
    })
    
    return {
      success: false,
      valid: false,
      message: `许可证已${license.status === 'REVOKED' ? '吊销' : license.status === 'SUSPENDED' ? '暂停' : '失效'}`
    }
  }
  
  // 检查是否过期
  if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
    await logAccess('LICENSE_VERIFY', 'FAILED', {
      licenseId: license.licenseId,
      licenseKey: licenseKey,
      deviceId: deviceId,
      clientIp, userAgent, platform,
      details: { message: '许可证已过期' }
    })
    
    return {
      success: false,
      valid: false,
      message: '许可证已过期'
    }
  }
  
  // 更新最后使用时间
  await licensesCollection.doc(license._id).update({
    lastUsedAt: new Date(),
    updatedAt: new Date()
  })
  
  await logAccess('LICENSE_VERIFY', 'SUCCESS', {
    licenseId: license.licenseId,
    licenseKey: licenseKey,
    deviceId: deviceId,
    clientIp, userAgent, platform,
    details: { message: '许可证验证成功' }
  })
  
  return {
    success: true,
    valid: true,
    license: {
      licenseId: license.licenseId,
      licenseKey: license.licenseKey,
      status: license.status,
      customerEmail: license.customerEmail,
      customerName: license.customerName,
      features: license.features,
      maxDevices: license.maxDevices,
      activatedDevices: license.activatedDevices.length,
      issuedAt: license.issuedAt,
      expiresAt: license.expiresAt
    },
    message: '许可证有效'
  }
}

// 3. 激活设备
async function activateDevice(data, clientIp, userAgent) {
  const { 
    licenseKey, 
    deviceId, 
    deviceName = 'Unknown Device',
    platform = 'unknown',
    deviceFingerprint
  } = data
  
  if (!licenseKey || !deviceId) {
    throw new Error('缺少必要参数：licenseKey 和 deviceId')
  }
  
  // 先验证许可证
  const licenseResult = await licensesCollection
    .where({ licenseKey: licenseKey, status: 'ACTIVE' })
    .get()
  
  if (licenseResult.data.length === 0) {
    return {
      success: false,
      message: '许可证无效或已失效'
    }
  }
  
  const license = licenseResult.data[0]
  
  // 检查设备是否已激活
  const existingDevice = license.activatedDevices.find(device => device.deviceId === deviceId)
  if (existingDevice) {
    // 更新最后见到时间
    const updatedDevices = license.activatedDevices.map(device => 
      device.deviceId === deviceId 
        ? { ...device, lastSeenAt: new Date() }
        : device
    )
    
    await licensesCollection.doc(license._id).update({
      activatedDevices: updatedDevices,
      updatedAt: new Date()
    })
    
    await logAccess('DEVICE_ACTIVATE', 'SUCCESS', {
      licenseId: license.licenseId,
      licenseKey: licenseKey,
      deviceId: deviceId,
      clientIp, userAgent, platform,
      details: { message: '设备已激活，更新最后见到时间' }
    })
    
    return {
      success: true,
      message: '设备已激活',
      deviceInfo: existingDevice
    }
  }
  
  // 检查设备数限制（-1表示无限设备）
  if (license.maxDevices !== -1 && license.activatedDevices.length >= license.maxDevices) {
    await logAccess('DEVICE_ACTIVATE', 'FAILED', {
      licenseId: license.licenseId,
      licenseKey: licenseKey,
      deviceId: deviceId,
      clientIp, userAgent, platform,
      details: { 
        message: '设备数量已达上限',
        currentDevices: license.activatedDevices.length,
        maxDevices: license.maxDevices
      }
    })
    
    return {
      success: false,
      message: `设备数量已达上限（${license.maxDevices}台），请先停用其他设备`,
      currentDevices: license.activatedDevices.length,
      maxDevices: license.maxDevices
    }
  }
  
  // 激活新设备
  const newDevice = {
    deviceId: deviceId,
    deviceName: deviceName,
    deviceFingerprint: deviceFingerprint || '',
    platform: platform,
    activatedAt: new Date(),
    lastSeenAt: new Date()
  }
  
  const updatedDevices = [...license.activatedDevices, newDevice]
  
  await licensesCollection.doc(license._id).update({
    activatedDevices: updatedDevices,
    activatedAt: license.activatedAt || new Date(), // 首次激活时间
    updatedAt: new Date()
  })
  
  // 记录设备激活
  const activationId = `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`
  await deviceActivationsCollection.add({
    activationId: activationId,
    licenseId: license.licenseId,
    licenseKey: license.licenseKey,
    
    deviceId: deviceId,
    deviceName: deviceName,
    deviceFingerprint: deviceFingerprint || '',
    platform: platform,
    userAgent: userAgent,
    
    status: 'ACTIVE',
    
    activatedAt: new Date(),
    lastSeenAt: new Date(),
    deactivatedAt: null,
    
    createdAt: new Date(),
    updatedAt: new Date()
  })
  
  await logAccess('DEVICE_ACTIVATE', 'SUCCESS', {
    licenseId: license.licenseId,
    licenseKey: licenseKey,
    deviceId: deviceId,
    clientIp, userAgent, platform,
    details: { 
      message: '设备激活成功',
      deviceName: deviceName,
      totalDevices: updatedDevices.length
    }
  })
  
  return {
    success: true,
    message: '设备激活成功',
    deviceInfo: newDevice,
    totalDevices: updatedDevices.length,
    maxDevices: license.maxDevices
  }
}

// 4. 停用设备
async function deactivateDevice(data, clientIp, userAgent) {
  const { licenseKey, deviceId } = data
  
  if (!licenseKey || !deviceId) {
    throw new Error('缺少必要参数：licenseKey 和 deviceId')
  }
  
  // 查找许可证
  const licenseResult = await licensesCollection
    .where({ licenseKey: licenseKey })
    .get()
  
  if (licenseResult.data.length === 0) {
    return {
      success: false,
      message: '许可证不存在'
    }
  }
  
  const license = licenseResult.data[0]
  
  // 检查设备是否已激活
  const deviceExists = license.activatedDevices.some(device => device.deviceId === deviceId)
  if (!deviceExists) {
    return {
      success: false,
      message: '设备未激活或不存在'
    }
  }
  
  // 移除设备
  const updatedDevices = license.activatedDevices.filter(device => device.deviceId !== deviceId)
  
  await licensesCollection.doc(license._id).update({
    activatedDevices: updatedDevices,
    updatedAt: new Date()
  })
  
  // 更新设备激活记录
  const deviceActivationResult = await deviceActivationsCollection
    .where({ 
      licenseId: license.licenseId, 
      deviceId: deviceId, 
      status: 'ACTIVE' 
    })
    .get()
  
  if (deviceActivationResult.data.length > 0) {
    await deviceActivationsCollection.doc(deviceActivationResult.data[0]._id).update({
      status: 'DEACTIVATED',
      deactivatedAt: new Date(),
      updatedAt: new Date()
    })
  }
  
  await logAccess('DEVICE_DEACTIVATE', 'SUCCESS', {
    licenseId: license.licenseId,
    licenseKey: licenseKey,
    deviceId: deviceId,
    clientIp, userAgent,
    details: { 
      message: '设备停用成功',
      remainingDevices: updatedDevices.length
    }
  })
  
  return {
    success: true,
    message: '设备停用成功',
    remainingDevices: updatedDevices.length,
    maxDevices: license.maxDevices
  }
}

// 5. 查询许可证状态
async function getLicenseStatus(data, clientIp, userAgent) {
  const { licenseKey } = data
  
  if (!licenseKey) {
    throw new Error('缺少必要参数：licenseKey')
  }
  
  // 查找许可证
  const licenseResult = await licensesCollection
    .where({ licenseKey: licenseKey })
    .get()
  
  if (licenseResult.data.length === 0) {
    return {
      success: false,
      message: '许可证不存在'
    }
  }
  
  const license = licenseResult.data[0]
  
  await logAccess('LICENSE_STATUS_QUERY', 'SUCCESS', {
    licenseId: license.licenseId,
    licenseKey: licenseKey,
    clientIp, userAgent,
    details: { message: '许可证状态查询' }
  })
  
  return {
    success: true,
    license: {
      licenseId: license.licenseId,
      licenseKey: license.licenseKey,
      status: license.status,
      customerEmail: license.customerEmail,
      customerName: license.customerName,
      features: license.features,
      maxDevices: license.maxDevices,
      activatedDevices: license.activatedDevices,
      issuedAt: license.issuedAt,
      expiresAt: license.expiresAt,
      activatedAt: license.activatedAt,
      lastUsedAt: license.lastUsedAt
    },
    message: '许可证状态查询成功'
  }
}