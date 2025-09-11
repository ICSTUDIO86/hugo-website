/**
 * 初始化user_accounts集合
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🚀 初始化user_accounts集合');
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        // 创建一条测试记录来初始化集合
        const testRecord = {
            access_code: 'INIT_TEST',
            order_no: 'INIT_ORDER',
            alipay_account: 'init@test.com',
            collected_at: new Date(),
            status: 'test',
            source: 'init_collection'
        };
        
        console.log('📝 插入测试记录以创建集合...');
        const result = await db.collection('user_accounts').add(testRecord);
        console.log('✅ 测试记录插入成功:', result.id);
        
        // 删除测试记录
        console.log('🗑️ 删除测试记录...');
        await db.collection('user_accounts').doc(result.id).remove();
        console.log('✅ 测试记录已删除');
        
        return {
            success: true,
            message: 'user_accounts集合初始化成功',
            collection_created: true
        };
        
    } catch (error) {
        console.error('❌ 初始化失败:', error);
        return {
            success: false,
            error: '初始化失败: ' + error.message
        };
    }
};