/**
 * 检查数据库中所有集合的详细信息
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔍 开始检查所有数据库集合...');
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        // 已知的可能集合名称
        const possibleCollections = [
            'codes',
            'access-codes', 
            'orders',
            'refund_logs',
            'users',
            'payments',
            'manual_refunds'
        ];
        
        const results = {};
        
        for (const collectionName of possibleCollections) {
            try {
                console.log(`🔍 检查集合: ${collectionName}`);
                
                // 尝试查询集合
                const queryResult = await db.collection(collectionName)
                    .limit(3)
                    .get();
                
                results[collectionName] = {
                    exists: true,
                    count: queryResult.data.length,
                    sample: queryResult.data
                };
                
                console.log(`✅ ${collectionName}: 存在，包含 ${queryResult.data.length} 条记录（限制3条）`);
                
            } catch (error) {
                console.log(`❌ ${collectionName}: 不存在或查询失败`);
                results[collectionName] = {
                    exists: false,
                    error: error.message
                };
            }
        }
        
        return {
            success: true,
            data: results,
            timestamp: new Date()
        };
        
    } catch (error) {
        console.error('❌ 检查集合失败:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date()
        };
    }
};