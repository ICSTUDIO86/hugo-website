/**
 * IC Studio - 初始化测试数据云函数
 * 为orders集合添加测试订单数据，包含访问码
 */

const cloud = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
});

const db = app.database();

// 生成随机访问码
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成随机订单号
function generateOrderNo() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `IC${timestamp}${random}`;
}

exports.main = async (event, context) => {
  console.log('🚀 开始初始化测试数据...');
  
  try {
    // 创建测试订单数据
    const testOrders = [
      {
        out_trade_no: generateOrderNo(),
        access_code: generateAccessCode(),
        status: 'paid',
        amount: '1.00',
        product_name: 'IC Studio 视奏工具',
        buyer_account: 'test1@example.com',
        buyer_email: 'test1@example.com',
        buyer_phone: '13800138001',
        alipay_account: 'test1@example.com',
        created_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
        pay_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updated_time: new Date()
      },
      {
        out_trade_no: generateOrderNo(),
        access_code: generateAccessCode(),
        status: 'paid',
        amount: '1.00',
        product_name: 'IC Studio 视奏工具',
        buyer_account: '13912345678',
        buyer_email: 'test2@qq.com',
        buyer_phone: '13912345678',
        alipay_account: '13912345678',
        created_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
        pay_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updated_time: new Date()
      },
      {
        out_trade_no: generateOrderNo(),
        access_code: generateAccessCode(),
        status: 'paid',
        amount: '1.00',
        product_name: 'IC Studio 视奏工具',
        buyer_account: 'demo@icstudio.com',
        buyer_email: 'demo@icstudio.com',
        buyer_phone: '13999999999',
        alipay_account: 'demo@icstudio.com',
        payment_info: {
          buyer_account: 'demo@icstudio.com'
        },
        created_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
        pay_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updated_time: new Date()
      }
    ];
    
    const createdOrders = [];
    
    // 批量添加测试数据
    for (const order of testOrders) {
      console.log('📝 创建订单:', order.out_trade_no, '访问码:', order.access_code);
      
      const result = await db.collection('orders').add(order);
      createdOrders.push({
        id: result.id,
        out_trade_no: order.out_trade_no,
        access_code: order.access_code,
        buyer_account: order.buyer_account
      });
    }
    
    console.log('✅ 测试数据创建完成');
    
    return {
      success: true,
      message: '测试数据初始化成功',
      data: {
        created_count: createdOrders.length,
        orders: createdOrders
      }
    };
    
  } catch (error) {
    console.error('❌ 初始化测试数据失败:', error);
    
    return {
      success: false,
      error: '初始化失败',
      details: error.message
    };
  }
};