/**
 * IC Studio - 根据订单号获取订单信息
 * 用于支付成功回调时获取完整订单信息
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('📦 获取订单信息服务启动');
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

        const { order_no, out_trade_no } = requestData;
        const orderNumber = order_no || out_trade_no;

        if (!orderNumber) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '请提供订单号'
                })
            };
        }

        console.log(`🔍 查询订单: ${orderNumber}`);

        // 首先从codes集合查询（主要数据源）
        let orderRecord = null;

        // 尝试从codes集合查询
        const codesQuery = await db.collection('codes')
            .where(db.command.or([
                { out_trade_no: orderNumber },
                { order_no: orderNumber },
                { order_id: orderNumber }
            ]))
            .limit(1)
            .get();

        if (codesQuery.data && codesQuery.data.length > 0) {
            orderRecord = codesQuery.data[0];
            console.log('✅ 从codes集合找到订单');
        }

        // 如果codes集合没找到，尝试从ic_studio_orders集合查询
        if (!orderRecord) {
            const ordersQuery = await db.collection('ic_studio_orders')
                .where(db.command.or([
                    { order_id: orderNumber },
                    { out_trade_no: orderNumber }
                ]))
                .limit(1)
                .get();

            if (ordersQuery.data && ordersQuery.data.length > 0) {
                orderRecord = ordersQuery.data[0];
                console.log('✅ 从ic_studio_orders集合找到订单');

                // 如果找到订单但codes集合没有，同步到codes集合
                if (orderRecord.access_code || orderRecord.code) {
                    const accessCode = orderRecord.access_code || orderRecord.code;
                    try {
                        await db.collection('codes').add({
                            code: accessCode.toUpperCase(),
                            access_code: accessCode.toUpperCase(),
                            out_trade_no: orderRecord.order_id || orderNumber,
                            order_no: orderRecord.order_id || orderNumber,
                            status: 'active',
                            created_at: orderRecord.created_at || new Date(),
                            payment_time: orderRecord.payment_time || orderRecord.created_at || new Date(),
                            amount: orderRecord.amount,
                            product_name: orderRecord.product_name || 'IC Studio 视奏工具',
                            source: orderRecord.source || 'zpay',
                            zpay_trade_no: orderRecord.transaction_id
                        });
                        console.log('✅ 已同步订单到codes集合');
                    } catch (syncError) {
                        console.warn('⚠️ 同步到codes集合失败:', syncError);
                    }
                }
            }
        }

        // 如果还是没找到，尝试从orders集合查询（兼容旧数据）
        if (!orderRecord) {
            const oldOrdersQuery = await db.collection('orders')
                .where(db.command.or([
                    { out_trade_no: orderNumber },
                    { order_no: orderNumber },
                    { orderId: orderNumber }
                ]))
                .limit(1)
                .get();

            if (oldOrdersQuery.data && oldOrdersQuery.data.length > 0) {
                orderRecord = oldOrdersQuery.data[0];
                console.log('✅ 从orders集合找到订单（旧数据）');
            }
        }

        if (!orderRecord) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '订单不存在',
                    message: '未找到该订单号对应的订单信息'
                })
            };
        }

        // 检查订单状态
        if (orderRecord.status !== 'paid' && orderRecord.status !== 'active') {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '订单状态异常',
                    message: `订单状态: ${orderRecord.status}`,
                    data: {
                        status: orderRecord.status,
                        order_no: orderNumber
                    }
                })
            };
        }

        // 准备返回数据
        const responseData = {
            access_code: orderRecord.access_code || orderRecord.code,
            code: orderRecord.access_code || orderRecord.code,
            out_trade_no: orderRecord.out_trade_no || orderRecord.order_id || orderNumber,
            order_no: orderRecord.order_no || orderRecord.order_id || orderNumber,
            amount: orderRecord.amount,
            status: orderRecord.status,
            payment_time: orderRecord.payment_time || orderRecord.created_at,
            product_name: orderRecord.product_name || 'IC Studio 视奏工具',
            source: orderRecord.source || 'zpay',
            transaction_id: orderRecord.transaction_id || orderRecord.zpay_trade_no
        };

        console.log('🎉 订单信息获取成功');

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: '订单信息获取成功',
                data: responseData
            })
        };

    } catch (error) {
        console.error('❌ 获取订单信息错误:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: '服务器错误',
                message: error.message
            })
        };
    }
};