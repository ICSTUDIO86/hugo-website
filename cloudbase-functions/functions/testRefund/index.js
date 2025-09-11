/**
 * IC Studio - 测试退款函数
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🧪 退款功能测试启动');
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        
        // 测试访问码: FB47DHTCADW8 (来自codes集合中的active状态记录)
        const testAccessCode = 'FB47DHTCADW8';
        console.log(`🎯 测试访问码: ${testAccessCode}`);
        
        // 模拟前端请求参数格式
        const testEvent = {
            body: JSON.stringify({
                access_code: testAccessCode
            })
        };
        
        console.log('📞 调用 refundByAccessCode 函数...');
        
        // 调用 refundByAccessCode 云函数
        const result = await app.callFunction({
            name: 'refundByAccessCode',
            data: testEvent
        });
        
        console.log('📋 退款结果:', JSON.stringify(result, null, 2));
        
        return {
            success: true,
            test_access_code: testAccessCode,
            refund_result: result.result
        };
        
    } catch (error) {
        console.error('❌ 测试错误:', error);
        return {
            success: false,
            error: '测试失败: ' + error.message
        };
    }
};