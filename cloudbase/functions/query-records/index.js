/**
 * 查询数据库记录 - 验证数据写入
 */

const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const accessCodesCollection = db.collection('access-codes')
const ordersCollection = db.collection('payment-orders')

exports.main = async (event, context) => {
  try {
    console.log('🔍 查询数据库记录...')
    
    // 查询最近的访问码记录
    console.log('📋 查询访问码记录...')
    const accessCodesResult = await accessCodesCollection
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
    
    console.log(`✅ 找到 ${accessCodesResult.data.length} 条访问码记录`)
    
    // 查询最近的订单记录
    console.log('📋 查询订单记录...')
    const ordersResult = await ordersCollection
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
    
    console.log(`✅ 找到 ${ordersResult.data.length} 条订单记录`)
    
    // 查询特定访问码的记录
    const targetCodes = ['J71YRYSV9K6W', 'QX8V5RB9J1X3', 'TENI4NAB00XT']
    const specificRecords = []
    
    for (const code of targetCodes) {
      console.log(`🎯 查询访问码: ${code}`)
      const codeResult = await accessCodesCollection
        .where({ code: code })
        .get()
      
      if (codeResult.data.length > 0) {
        console.log(`✅ 找到访问码 ${code} 的记录`)
        specificRecords.push({
          code: code,
          found: true,
          record: codeResult.data[0]
        })
      } else {
        console.log(`⚠️ 未找到访问码 ${code} 的记录`)
        specificRecords.push({
          code: code,
          found: false
        })
      }
    }
    
    const result = {
      success: true,
      message: '数据库查询完成',
      summary: {
        totalAccessCodes: accessCodesResult.data.length,
        totalOrders: ordersResult.data.length,
        specificCodesFound: specificRecords.filter(r => r.found).length
      },
      latestAccessCodes: accessCodesResult.data.map(item => ({
        code: item.code,
        orderId: item.orderId,
        createdAt: item.createdAt,
        amount: item.amount,
        paymentMethod: item.paymentMethod
      })),
      latestOrders: ordersResult.data.map(item => ({
        orderId: item.orderId,
        accessCode: item.accessCode,
        amount: item.amount,
        status: item.status,
        createdAt: item.createdAt
      })),
      specificRecords: specificRecords,
      timestamp: new Date()
    }
    
    console.log('🎉 查询完成:', result)
    return result
    
  } catch (error) {
    console.error('❌ 查询失败:', error)
    return {
      success: false,
      message: '查询失败: ' + error.message
    }
  }
}