/**
 * IC Studio - 列举orders集合中的所有订单
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('📋 列举所有订单启动');
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        console.log('🔍 查询orders集合中的所有记录');
        
        // 查询orders集合的所有记录，不设置limit限制
        const allOrdersQuery = await db.collection('orders').get();
        
        const orders = allOrdersQuery.data;
        console.log(`📦 找到 ${orders.length} 条订单记录`);
        
        // 提取订单信息
        const orderList = orders.map(record => ({
            out_trade_no: record.out_trade_no,
            amount: record.amount,
            status: record.status,
            refund_status: record.refund_status || 'none',
            refund_time: record.refund_time,
            refund_amount: record.refund_amount,
            refund_order_no: record.refund_order_no,
            access_code_refunded: record.access_code_refunded,
            created_time: record.created_time,
            updated_time: record.updated_time
        }));
        
        // 按退款状态分组统计
        const refundStats = orders.reduce((stats, record) => {
            const refundStatus = record.refund_status || 'none';
            stats[refundStatus] = (stats[refundStatus] || 0) + 1;
            return stats;
        }, {});
        
        // 按订单状态分组统计
        const orderStats = orders.reduce((stats, record) => {
            const status = record.status || 'unknown';
            stats[status] = (stats[status] || 0) + 1;
            return stats;
        }, {});
        
        console.log('📊 订单状态统计:', orderStats);
        console.log('💰 退款状态统计:', refundStats);
        
        return {
            success: true,
            total_count: orders.length,
            order_status_stats: orderStats,
            refund_status_stats: refundStats,
            orders: orderList
        };
        
    } catch (error) {
        console.error('❌ 查询错误:', error);
        return {
            success: false,
            error: '查询失败: ' + error.message
        };
    }
};