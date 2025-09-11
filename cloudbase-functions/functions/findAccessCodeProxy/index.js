/**
 * IC Studio - 订单号查找访问码代理函数
 * 提供HTTP访问接口
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔗 代理函数启动');
    console.log('📨 接收参数:', JSON.stringify(event, null, 2));
    
    // CORS头部
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Request-Source',
        'Content-Type': 'application/json'
    };
    
    // 处理预检请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        
        // 解析请求参数
        let requestData = {};
        if (event.body) {
            try {
                requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            } catch (e) {
                requestData = event;
            }
        } else {
            requestData = event;
        }
        
        console.log('🎯 调用内部函数 findAccessCodeByOrderNo');
        
        // 调用内部云函数
        const result = await app.callFunction({
            name: 'findAccessCodeByOrderNo',
            data: requestData
        });
        
        console.log('📥 内部函数返回:', result);
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result.result || result)
        };
        
    } catch (error) {
        console.error('❌ 代理调用失败:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: '代理调用失败',
                message: error.message
            })
        };
    }
};