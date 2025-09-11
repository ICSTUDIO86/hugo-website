/**
 * 初始化manual_refunds集合
 * 只运行一次，创建集合并添加一个样例记录
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  console.log('🔧 开始初始化manual_refunds集合...');
  
  try {
    // 初始化云开发
    const app = cloud.init({
      env: cloud.SYMBOL_CURRENT_ENV
    });
    
    const db = app.database();
    
    // 创建集合并添加一个示例记录
    const result = await db.collection('manual_refunds').add({
      data: {
        _id: 'init_record_delete_me',
        access_code: 'INIT_RECORD',
        order_id: 'init',
        out_trade_no: 'INIT_RECORD_DELETE_ME',
        refund_amount: '0.01',
        refund_reason: '初始化集合的示例记录，可以删除',
        refund_detail: '这是一个用于初始化集合的示例记录',
        refund_method: 'initialization',
        status: 'completed',
        error_details: null,
        client_ip: 'system',
        user_agent: 'system-init',
        created_time: new Date(),
        request_id: 'init-' + context.requestId
      }
    });
    
    console.log('✅ manual_refunds集合初始化成功:', result);
    
    return {
      success: true,
      message: 'manual_refunds集合初始化成功',
      data: {
        collection: 'manual_refunds',
        record_id: result.id,
        note: '集合已创建，示例记录已添加，可以在控制台中删除示例记录'
      }
    };
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    
    return {
      success: false,
      error: error.message,
      note: '如果集合已存在，这个错误是正常的'
    };
  }
};