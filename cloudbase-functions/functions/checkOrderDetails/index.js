/**
 * IC Studio - 检查订单详细信息
 * 查看是否有支付宝账号被记录
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔍 检查订单详细信息启动');
    console.log('📨 接收参数:', JSON.stringify(event, null, 2));
    
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
            order_no = null,
            recent_count = 10,
            check_alipay = true
        } = requestData;
        
        let results = {
            total_checked: 0,
            with_alipay: 0,
            without_alipay: 0,
            orders: []
        };
        
        let query;
        if (order_no) {
            // 查询特定订单
            query = db.collection('orders').where({ out_trade_no: order_no });
        } else {
            // 查询最近的订单
            query = db.collection('orders')
                .orderBy('updated_time', 'desc')
                .limit(recent_count);
        }
        
        const ordersResult = await query.get();
        const orders = ordersResult.data || [];
        
        console.log(`📦 找到 ${orders.length} 个订单`);
        
        for (const order of orders) {
            console.log(`🔍 检查订单: ${order.out_trade_no}`);
            console.log(`📋 完整字段:`, Object.keys(order));
            
            const orderDetail = {
                out_trade_no: order.out_trade_no,
                status: order.status,
                refund_status: order.refund_status,
                access_code: order.access_code,
                money: order.money,
                amount: order.amount,
                name: order.name,
                created_time: order.created_time || order.createdAt,
                updated_time: order.updated_time || order.updatedAt,
                endtime: order.endtime,
                zpay_trade_no: order.zpay_trade_no,
                
                // 支付宝相关字段
                alipay_account: order.alipay_account || null,
                alipay_phone: order.alipay_phone || null,
                alipay_email: order.alipay_email || null,
                alipay_sync_time: order.alipay_sync_time || null,
                alipay_sync_source: order.alipay_sync_source || null,
                
                // 原始数据的所有字段
                all_fields: order
            };
            
            const hasAlipayInfo = !!(order.alipay_account);
            if (hasAlipayInfo) {
                results.with_alipay++;
                console.log(`✅ 订单 ${order.out_trade_no} 有支付宝账号: ${order.alipay_account}`);
            } else {
                results.without_alipay++;
                console.log(`❌ 订单 ${order.out_trade_no} 没有支付宝账号`);
            }
            
            results.orders.push(orderDetail);
            results.total_checked++;
        }
        
        // 同时检查对应的访问码
        if (check_alipay) {
            console.log('🔍 同时检查对应的访问码...');
            for (const orderDetail of results.orders) {
                if (orderDetail.access_code) {
                    const codeQuery = await db.collection('codes')
                        .where({ code: orderDetail.access_code })
                        .get();
                    
                    const codes = codeQuery.data || [];
                    if (codes.length > 0) {
                        const code = codes[0];
                        orderDetail.code_alipay_account = code.alipay_account || null;
                        orderDetail.code_alipay_sync_time = code.alipay_sync_time || null;
                        orderDetail.code_fields = Object.keys(code);
                        
                        if (code.alipay_account) {
                            console.log(`✅ 访问码 ${code.code} 有支付宝账号: ${code.alipay_account}`);
                        } else {
                            console.log(`❌ 访问码 ${code.code} 没有支付宝账号`);
                        }
                    }
                }
            }
        }
        
        console.log('🎉 检查完成');
        
        return {
            success: true,
            message: `检查了 ${results.total_checked} 个订单`,
            summary: {
                total_orders: results.total_checked,
                orders_with_alipay: results.with_alipay,
                orders_without_alipay: results.without_alipay,
                alipay_coverage: results.total_checked > 0 
                    ? `${((results.with_alipay / results.total_checked) * 100).toFixed(1)}%`
                    : '0%'
            },
            orders: results.orders
        };
        
    } catch (error) {
        console.error('❌ 检查错误:', error);
        return {
            success: false,
            error: '检查失败: ' + error.message
        };
    }
};