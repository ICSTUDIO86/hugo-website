/**
 * IC Studio - 通过订单号找回访问码
 * 简单直接的找回方案
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('📋 通过订单号找回访问码启动');
    console.log('📨 接收参数:', JSON.stringify(event, null, 2));
    
    // 检测调用方式：HTTP还是SDK
    const isHttpCall = event.httpMethod || event.headers;
    
    // 添加CORS头部（仅HTTP调用需要）
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Request-Source',
        'Content-Type': 'application/json'
    };
    
    // 处理预检请求（仅HTTP调用）
    if (isHttpCall && event.httpMethod === 'OPTIONS') {
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
        const db = app.database();
        
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
        
        const { 
            order_no,
            zpay_trade_no 
        } = requestData;
        
        if (!order_no && !zpay_trade_no) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '请提供商家订单号或支付宝交易号',
                    examples: {
                        merchant_order: 'IC17575409482250217',
                        alipay_trade: '2025091122001480241441480505'
                    }
                })
            };
        }
        
        console.log(`🔍 搜索条件: ${order_no ? '商家订单号=' + order_no : '支付宝交易号=' + zpay_trade_no}`);
        
        let orderRecord = null;
        
        // 先在orders集合中查找
        if (order_no) {
            // 通过商家订单号查找
            const orderQuery = await db.collection('orders')
                .where({ out_trade_no: order_no })
                .get();
            
            if (orderQuery.data.length > 0) {
                orderRecord = orderQuery.data[0];
                console.log('📦 通过商家订单号找到订单');
            }
        }
        
        if (!orderRecord && zpay_trade_no) {
            // 通过支付宝交易号查找
            const orderQuery = await db.collection('orders')
                .where({ zpay_trade_no: zpay_trade_no })
                .get();
            
            if (orderQuery.data.length > 0) {
                orderRecord = orderQuery.data[0];
                console.log('💳 通过支付宝交易号找到订单');
            }
        }
        
        if (!orderRecord) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '未找到匹配的订单记录',
                    searched_for: {
                        merchant_order: order_no || null,
                        alipay_trade: zpay_trade_no || null
                    }
                })
            };
        }
        
        // 检查订单状态
        if (orderRecord.status !== 'paid') {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '订单状态异常，可能未完成支付',
                    order_status: orderRecord.status,
                    order_no: orderRecord.out_trade_no
                })
            };
        }
        
        if (orderRecord.refund_status === 'refunded') {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '此订单已退款，访问码无效',
                    order_no: orderRecord.out_trade_no,
                    refund_time: orderRecord.refund_time
                })
            };
        }
        
        // 获取访问码详情
        if (!orderRecord.access_code) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '订单记录中缺少访问码信息',
                    order_no: orderRecord.out_trade_no
                })
            };
        }
        
        // 在codes集合中查找访问码详情
        const codeQuery = await db.collection('codes')
            .where({ code: orderRecord.access_code })
            .get();
        
        if (codeQuery.data.length === 0) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '访问码记录缺失，请联系客服',
                    access_code: orderRecord.access_code
                })
            };
        }
        
        const codeRecord = codeQuery.data[0];
        
        console.log('✅ 成功找到访问码:', orderRecord.access_code);
        
        const successResult = {
            success: true,
            message: '访问码找回成功',
            result: {
                access_code: orderRecord.access_code,
                order_info: {
                    merchant_order_no: orderRecord.out_trade_no,
                    alipay_trade_no: orderRecord.zpay_trade_no,
                    product_name: orderRecord.name || codeRecord.product_name,
                    amount: orderRecord.money,
                    payment_time: orderRecord.paid_at,
                    created_time: codeRecord.created_at
                },
                usage_tip: '请保存好此访问码，可在产品页面使用'
            },
            timestamp: new Date()
        };
        
        // 根据调用方式返回不同格式
        if (isHttpCall) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(successResult)
            };
        } else {
            // SDK调用直接返回结果对象
            return successResult;
        }
        
    } catch (error) {
        console.error('❌ 订单号找回失败:', error);
        const errorResult = {
            success: false,
            error: '查找失败',
            message: error.message,
            timestamp: new Date()
        };
        
        if (isHttpCall) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify(errorResult)
            };
        } else {
            return errorResult;
        }
    }
};