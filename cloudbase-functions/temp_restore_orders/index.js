const tcb = require('@cloudbase/node-sdk');

// 初始化 Cloudbase
const app = tcb.init({
  env: 'cloud1-4g1r5ho01a0cfd85',
  secretId: process.env.SECRET_ID,
  secretKey: process.env.SECRET_KEY
});

const db = app.database();

async function restoreRefundedOrders() {
  console.log('🔄 开始恢复退款状态的订单到active状态...');
  
  try {
    // 查找已退款的订单（使用正确的集合名称）
    const refundedOrders = await db
      .collection('unified_payment_orders')
      .where({
        refundStatus: 'refunded'
      })
      .limit(4)
      .get();
      
    console.log(`📋 找到 ${refundedOrders.data.length} 个已退款的订单`);
    
    const restoredOrders = [];
    
    for (const order of refundedOrders.data) {
      console.log(`🔄 恢复订单: ${order.orderId}`);
      
      // 更新订单状态为PAID
      await db.collection('unified_payment_orders')
        .doc(order._id)
        .update({
          status: 'PAID',
          refundStatus: null,
          refundAmount: null,
          refundReason: null,
          refundRequestedAt: null,
          refundProcessedAt: null,
          updatedAt: new Date()
        });
        
      // 如果有对应的访问码，也恢复访问码状态
      if (order.licenseId) {
        // 暂时跳过访问码更新，专注于订单恢复
        console.log(`📝 跳过访问码 ${order.licenseId} 的更新`);
      }
      
      restoredOrders.push({
        orderId: order.orderId,
        accessCode: order.licenseId,
        status: 'restored_to_active'
      });
      
      console.log(`✅ 订单 ${order.orderId} 已恢复为active状态`);
    }
    
    console.log('🎉 订单恢复完成');
    console.log('恢复的订单:', restoredOrders);
    
    return {
      success: true,
      restoredCount: restoredOrders.length,
      restoredOrders: restoredOrders
    };
    
  } catch (error) {
    console.error('❌ 恢复过程中出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 导出函数
exports.main = restoreRefundedOrders;

// 如果直接运行
if (require.main === module) {
  restoreRefundedOrders()
    .then(result => {
      console.log('最终结果:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('执行失败:', error);
      process.exit(1);
    });
}