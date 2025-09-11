/**
 * IC Studio - 列出所有未退款的访问码和订单
 * 显示当前有效的记录
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('📋 查询未退款记录启动');
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
            include_codes = true,
            include_orders = true,
            include_user_accounts = true,
            limit = 100
        } = requestData;
        
        let results = {
            active_codes: [],
            active_orders: [],
            user_accounts: [],
            summary: {
                total_active_codes: 0,
                total_active_orders: 0,
                total_user_accounts: 0,
                codes_with_alipay: 0,
                orders_with_alipay: 0
            }
        };
        
        // 查询未退款的访问码
        if (include_codes) {
            console.log('🔍 查询codes集合中的未退款记录...');
            
            const codesQuery = await db.collection('codes')
                .where({
                    status: db.command.neq('refunded')
                })
                .orderBy('created_at', 'desc')
                .limit(limit)
                .get();
            
            results.active_codes = (codesQuery.data || []).map(code => ({
                id: code._id,
                code: code.code,
                status: code.status,
                amount: code.amount,
                out_trade_no: code.out_trade_no,
                product_name: code.product_name,
                created_at: code.created_at || code.createdAt,
                alipay_account: code.alipay_account || null,
                alipay_phone: code.alipay_phone || null,
                alipay_sync_time: code.alipay_sync_time || null,
                has_alipay_info: !!(code.alipay_account)
            }));
            
            results.summary.total_active_codes = results.active_codes.length;
            results.summary.codes_with_alipay = results.active_codes.filter(c => c.has_alipay_info).length;
            
            console.log(`✅ 找到 ${results.summary.total_active_codes} 个未退款的访问码`);
            console.log(`📱 其中 ${results.summary.codes_with_alipay} 个有支付宝账号信息`);
        }
        
        // 查询未退款的订单
        if (include_orders) {
            console.log('🔍 查询orders集合中的未退款记录...');
            
            const ordersQuery = await db.collection('orders')
                .where({
                    refund_status: db.command.neq('refunded')
                })
                .orderBy('created_at', 'desc')
                .limit(limit)
                .get();
            
            results.active_orders = (ordersQuery.data || []).map(order => ({
                id: order._id,
                out_trade_no: order.out_trade_no,
                access_code: order.access_code,
                status: order.status,
                refund_status: order.refund_status,
                money: order.money,
                name: order.name,
                created_at: order.created_at || order.createdAt,
                endtime: order.endtime,
                zpay_trade_no: order.zpay_trade_no,
                alipay_account: order.alipay_account || null,
                alipay_phone: order.alipay_phone || null,
                alipay_sync_time: order.alipay_sync_time || null,
                has_alipay_info: !!(order.alipay_account)
            }));
            
            results.summary.total_active_orders = results.active_orders.length;
            results.summary.orders_with_alipay = results.active_orders.filter(o => o.has_alipay_info).length;
            
            console.log(`✅ 找到 ${results.summary.total_active_orders} 个未退款的订单`);
            console.log(`📱 其中 ${results.summary.orders_with_alipay} 个有支付宝账号信息`);
        }
        
        // 查询用户账号记录
        if (include_user_accounts) {
            console.log('🔍 查询user_accounts集合...');
            
            try {
                const userAccountsQuery = await db.collection('user_accounts')
                    .where({
                        status: db.command.neq('deleted')
                    })
                    .orderBy('collected_at', 'desc')
                    .limit(limit)
                    .get();
                
                results.user_accounts = (userAccountsQuery.data || []).map(account => ({
                    id: account._id,
                    access_code: account.access_code,
                    order_no: account.order_no,
                    alipay_account: account.alipay_account,
                    phone: account.phone,
                    email: account.email,
                    collected_at: account.collected_at,
                    status: account.status,
                    source: account.source
                }));
                
                results.summary.total_user_accounts = results.user_accounts.length;
                
                console.log(`✅ 找到 ${results.summary.total_user_accounts} 个用户账号记录`);
            } catch (userAccountError) {
                console.log('⚠️ user_accounts集合不存在，跳过查询');
                results.user_accounts = [];
                results.summary.total_user_accounts = 0;
            }
        }
        
        // 生成详细报告
        const report = {
            timestamp: new Date().toISOString(),
            summary: results.summary,
            details: {
                active_codes_sample: results.active_codes.slice(0, 10),
                active_orders_sample: results.active_orders.slice(0, 10),
                user_accounts_sample: results.user_accounts.slice(0, 10)
            },
            alipay_coverage: {
                codes_coverage: results.summary.total_active_codes > 0 
                    ? `${((results.summary.codes_with_alipay / results.summary.total_active_codes) * 100).toFixed(1)}%`
                    : '0%',
                orders_coverage: results.summary.total_active_orders > 0 
                    ? `${((results.summary.orders_with_alipay / results.summary.total_active_orders) * 100).toFixed(1)}%`
                    : '0%'
            }
        };
        
        console.log('🎉 查询完成');
        
        return {
            success: true,
            message: '未退款记录查询成功',
            data: results,
            report: report
        };
        
    } catch (error) {
        console.error('❌ 查询错误:', error);
        return {
            success: false,
            error: '查询失败: ' + error.message
        };
    }
};