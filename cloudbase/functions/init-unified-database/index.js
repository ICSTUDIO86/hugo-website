/**
 * 初始化统一授权系统数据库
 * 支持 Stripe + 支付宝 + 统一许可证系统
 */

const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()

exports.main = async (event, context) => {
  try {
    console.log('🚀 初始化统一授权系统数据库...')
    
    // 新的统一数据库架构
    const collections = [
      
      // 1. 核心许可证系统 - 统一管理所有授权
      {
        name: 'licenses',
        testData: {
          licenseId: 'LIC-TEST-123456',
          licenseKey: 'IC-SIGHT-READING-TEST123',  // 12位格式，网页和软件通用
          
          // 订单关联
          paymentOrderId: 'PAY-TEST-123',
          
          // 产品信息
          productName: 'IC Studio 视奏工具',
          productVersion: '1.0.0',
          features: ['sight-reading-generator', 'web-access', 'software-access'],
          
          // 许可证状态
          status: 'ACTIVE',  // ACTIVE | REVOKED | SUSPENDED | EXPIRED
          
          // 客户信息
          customerEmail: 'test@example.com',
          customerName: 'Test User',
          customerPhone: '',
          
          // 设备管理
          maxDevices: -1, // -1 = 无限设备
          activatedDevices: [],  // [{ deviceId, deviceName, activatedAt, lastSeenAt }]
          
          // 时间信息
          issuedAt: new Date(),
          expiresAt: null,  // null = 永久许可证
          activatedAt: null,
          lastUsedAt: null,
          
          // 元数据
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      
      // 2. 扩展的支付订单系统 - 支持 Stripe + 支付宝
      {
        name: 'unified_payment_orders',
        testData: {
          orderId: 'PAY-TEST-123',
          
          // 支付信息
          paymentProvider: 'stripe',  // 'stripe' | 'alipay'
          paymentMethod: 'card',
          amount: 4800,  // 分为单位
          currency: 'CNY',
          
          // Stripe 专用字段
          stripeSessionId: 'cs_test_123456',
          stripePaymentIntentId: 'pi_test_123456',
          stripeCustomerId: 'cus_test_123456',
          
          // 支付宝专用字段
          alipayTradeNo: null,
          alipayBuyerAccount: null,
          alipayBuyerName: null,
          
          // 客户信息
          customerEmail: 'test@example.com',
          customerName: 'Test User',
          customerPhone: '',
          
          // 订单状态
          status: 'PAID',  // PENDING | PAID | REFUNDED | FAILED | CANCELLED
          
          // 关联的许可证
          licenseId: 'LIC-TEST-123456',
          
          // 退款信息
          refundStatus: null,  // null | REQUESTED | PROCESSING | COMPLETED | REJECTED
          refundAmount: null,
          refundReason: null,
          refundRequestedAt: null,
          refundProcessedAt: null,
          
          // 时间信息
          createdAt: new Date(),
          updatedAt: new Date(),
          paidAt: new Date(),
          refundedAt: null
        }
      },
      
      // 3. 设备激活记录
      {
        name: 'device_activations',
        testData: {
          activationId: 'ACT-TEST-123456',
          licenseId: 'LIC-TEST-123456',
          licenseKey: 'IC-SIGHT-READING-TEST123',
          
          // 设备信息
          deviceId: 'device-test-12345',
          deviceName: 'Test Device',
          deviceFingerprint: 'fp_test_123',
          platform: 'web',  // 'web' | 'windows' | 'macos' | 'linux'
          userAgent: 'Mozilla/5.0...',
          
          // 激活状态
          status: 'ACTIVE',  // ACTIVE | DEACTIVATED
          
          // 时间信息
          activatedAt: new Date(),
          lastSeenAt: new Date(),
          deactivatedAt: null,
          
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      
      // 4. 邮件发送记录
      {
        name: 'email_logs',
        testData: {
          emailId: 'EMAIL-TEST-123456',
          
          // 邮件信息
          recipientEmail: 'test@example.com',
          recipientName: 'Test User',
          subject: 'IC Studio 视奏工具 - 您的许可证已激活',
          template: 'license-activated',
          
          // 邮件内容数据
          templateData: {
            customerName: 'Test User',
            licenseKey: 'IC-SIGHT-READING-TEST123',
            downloadLinks: {
              windows: 'https://download.icstudio.club/windows',
              macos: 'https://download.icstudio.club/macos',
              linux: 'https://download.icstudio.club/linux'
            }
          },
          
          // 发送状态
          status: 'SENT',  // PENDING | SENT | FAILED | BOUNCED
          
          // 关联信息
          licenseId: 'LIC-TEST-123456',
          orderId: 'PAY-TEST-123',
          
          // 时间信息
          sentAt: new Date(),
          createdAt: new Date()
        }
      },
      
      // 5. 退款申请记录
      {
        name: 'refund_requests',
        testData: {
          refundRequestId: 'REF-REQ-123456',
          
          // 关联信息
          orderId: 'PAY-TEST-123',
          licenseId: 'LIC-TEST-123456',
          
          // 客户信息
          customerEmail: 'test@example.com',
          customerName: 'Test User',
          
          // 退款信息
          reason: '不满意软件功能',
          reasonCategory: 'DISSATISFACTION',  // DISSATISFACTION | BUG | OTHER
          description: '软件功能与描述不符',
          
          // 申请状态
          status: 'PENDING',  // PENDING | APPROVED | REJECTED | PROCESSING | COMPLETED
          
          // 处理信息
          processedBy: null,
          processedAt: null,
          processorNotes: null,
          
          // 时间信息
          requestedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      
      // 6. 软件下载文件管理
      {
        name: 'software_downloads',
        testData: {
          downloadId: 'DL-TEST-123456',
          
          // 文件信息
          fileName: 'ic-sight-reading-v1.0.0-windows.exe',
          filePath: '/software/windows/ic-sight-reading-v1.0.0-windows.exe',
          fileSize: 25600000,  // 字节
          fileHash: 'sha256:abc123...',
          
          // 版本信息
          version: '1.0.0',
          platform: 'windows',  // 'windows' | 'macos' | 'linux'
          architecture: 'x64',
          
          // 状态
          isActive: true,
          isLatest: true,
          
          // 下载统计
          downloadCount: 0,
          
          // 时间信息
          uploadedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      
      // 7. 扩展的访问日志 - 统一记录所有操作
      {
        name: 'unified_access_logs',
        testData: {
          logId: 'LOG-TEST-123456',
          
          // 操作信息
          action: 'LICENSE_VERIFY',  // LICENSE_VERIFY | DEVICE_ACTIVATE | PAYMENT_SUCCESS | REFUND_REQUEST 等
          result: 'SUCCESS',  // SUCCESS | FAILED | ERROR
          
          // 关联信息
          licenseId: 'LIC-TEST-123456',
          licenseKey: 'IC-SIGHT-READING-TEST123',
          orderId: 'PAY-TEST-123',
          deviceId: 'device-test-12345',
          
          // 请求信息
          clientIp: '127.0.0.1',
          userAgent: 'Mozilla/5.0...',
          platform: 'web',
          
          // 详细信息
          details: {
            message: '许可证验证成功',
            requestData: {},
            responseData: {}
          },
          
          // 时间信息
          timestamp: new Date(),
          createdAt: new Date()
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
    
    console.log('🎉 统一授权系统数据库初始化完成')
    
    return {
      success: true,
      message: '统一授权系统数据库初始化完成',
      results: results,
      architecture: {
        coreSystem: 'licenses - 核心许可证管理',
        paymentSystem: 'unified_payment_orders - 统一支付（Stripe + 支付宝）',
        deviceManagement: 'device_activations - 设备激活管理',
        emailSystem: 'email_logs - 邮件系统',
        refundSystem: 'refund_requests - 退款系统',
        downloadSystem: 'software_downloads - 软件下载管理',
        loggingSystem: 'unified_access_logs - 统一访问日志'
      },
      timestamp: new Date()
    }
    
  } catch (error) {
    console.error('❌ 统一授权系统数据库初始化失败:', error)
    return {
      success: false,
      message: '统一授权系统数据库初始化失败: ' + error.message
    }
  }
}