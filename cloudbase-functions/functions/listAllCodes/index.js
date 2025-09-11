/**
 * IC Studio - 列举codes集合中的所有访问码
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('📋 列举所有访问码启动');
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        console.log('🔍 查询codes集合中的所有记录');
        
        // 查询codes集合的所有记录，不设置limit限制
        const allCodesQuery = await db.collection('codes').get();
        
        const codes = allCodesQuery.data;
        console.log(`📦 找到 ${codes.length} 条访问码记录`);
        
        // 提取访问码信息
        const codeList = codes.map(record => ({
            code: record.code,
            status: record.status,
            amount: record.amount,
            out_trade_no: record.out_trade_no,
            created_time: record.created_time,
            updated_time: record.updated_time
        }));
        
        // 按状态分组统计
        const statusStats = codes.reduce((stats, record) => {
            const status = record.status || 'unknown';
            stats[status] = (stats[status] || 0) + 1;
            return stats;
        }, {});
        
        console.log('📊 状态统计:', statusStats);
        
        return {
            success: true,
            total_count: codes.length,
            status_stats: statusStats,
            codes: codeList
        };
        
    } catch (error) {
        console.error('❌ 查询错误:', error);
        return {
            success: false,
            error: '查询失败: ' + error.message
        };
    }
};