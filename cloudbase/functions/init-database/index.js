/**
 * 初始化数据库集合
 */

const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()

exports.main = async (event, context) => {
  try {
    console.log('🚀 开始初始化数据库集合...')
    
    // 创建测试记录来初始化集合
    const collections = [
      {
        name: 'access-codes',
        testData: {
          code: 'TEST123456789',
          orderId: 'INIT-TEST',
          deviceId: 'init-device',
          paymentMethod: 'init',
          amount: 0,
          features: ['sight-reading-tool'],
          isActive: true,
          expiresAt: null,
          createdAt: new Date(),
          purchaseDate: new Date(),
          usageCount: 0,
          lastUsedAt: null,
          lastUsedDevice: null
        }
      },
      {
        name: 'payment-orders',
        testData: {
          orderId: 'INIT-TEST',
          deviceId: 'init-device',
          paymentMethod: 'init',
          amount: 0,
          merchantId: 'init',
          status: 'paid',
          accessCode: 'TEST123456789',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'access-logs',
        testData: {
          code: 'TEST123456789',
          deviceId: 'init-device',
          orderId: 'INIT-TEST',
          status: 'init',
          message: '数据库初始化',
          timestamp: new Date(),
          requestData: {
            orderId: 'INIT-TEST',
            deviceId: 'init-device',
            paymentMethod: 'init',
            amount: 0
          }
        }
      },
      {
        name: 'error-logs',
        testData: {
          function: 'init-database',
          error: 'test error',
          message: '数据库初始化测试错误',
          timestamp: new Date()
        }
      }
    ]
    
    const results = []
    
    for (const collection of collections) {
      console.log(`📝 创建集合: ${collection.name}`)
      try {
        const result = await db.collection(collection.name).add(collection.testData)
        console.log(`✅ 集合 ${collection.name} 创建成功, ID: ${result.id}`)
        results.push({
          collection: collection.name,
          success: true,
          id: result.id
        })
      } catch (error) {
        console.log(`⚠️ 集合 ${collection.name} 创建失败: ${error.message}`)
        results.push({
          collection: collection.name,
          success: false,
          error: error.message
        })
      }
    }
    
    console.log('🎉 数据库初始化完成')
    
    return {
      success: true,
      message: '数据库初始化完成',
      results: results,
      timestamp: new Date()
    }
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    return {
      success: false,
      message: '数据库初始化失败: ' + error.message
    }
  }
}