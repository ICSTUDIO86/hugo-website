/**
 * IC Studio - 查询退款记录云函数
 * 用于查看所有退款申请记录
 */

const cloud = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  console.log('🔍 查询退款记录请求:', JSON.stringify(event, null, 2));
  
  try {
    // 查询退款日志
    const refundLogs = await db.collection('refund_logs')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
    
    console.log('📊 找到退款记录数量:', refundLogs.data.length);
    
    // 查询已退款的订单
    const refundedOrders = await db.collection('orders')
      .where({
        refund_status: 'refunded'
      })
      .orderBy('refund_time', 'desc')
      .limit(20)
      .get();
    
    console.log('📦 找到已退款订单数量:', refundedOrders.data.length);
    
    return {
      success: true,
      data: {
        refund_logs: refundLogs.data,
        refunded_orders: refundedOrders.data,
        summary: {
          total_refund_logs: refundLogs.data.length,
          total_refunded_orders: refundedOrders.data.length,
          query_time: new Date()
        }
      }
    };
    
  } catch (error) {
    console.error('❌ 查询退款记录失败:', error);
    
    return {
      success: false,
      error: '查询失败：' + error.message
    };
  }
};