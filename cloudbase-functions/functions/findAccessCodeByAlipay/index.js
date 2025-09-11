const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔍 通过支付宝账号查找访问码启动');
    console.log('📨 接收参数:', JSON.stringify(event, null, 2));
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
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
        
        const { alipay_account } = requestData;
        
        if (!alipay_account) {
            return {
                success: false,
                error: '请提供支付宝账号'
            };
        }
        
        const isValidPhone = /^1[3-9]\d{9}$/.test(alipay_account);
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alipay_account);
        
        if (!isValidPhone && !isValidEmail) {
            return {
                success: false,
                error: '请输入有效的支付宝账号（手机号或邮箱）'
            };
        }
        
        console.log('🎯 查找支付宝账号:', alipay_account);
        
        const codesQuery = await db.collection('codes')
            .where({ alipay_account: alipay_account })
            .get();
        
        const ordersQuery = await db.collection('orders')
            .where({ alipay_account: alipay_account })
            .get();
        
        let userAccountsQuery = { data: [] };
        try {
            userAccountsQuery = await db.collection('user_accounts')
                .where({ alipay_account: alipay_account })
                .get();
        } catch (e) {
            console.log('⚠️ user_accounts集合不存在，跳过查询');
        }
        
        const foundCodes = codesQuery.data || [];
        const foundOrders = ordersQuery.data || [];
        const foundUserAccounts = userAccountsQuery.data || [];
        
        console.log(`📦 找到 ${foundCodes.length} 个访问码记录`);
        console.log(`📦 找到 ${foundOrders.length} 个订单记录`);
        console.log(`📦 找到 ${foundUserAccounts.length} 个用户账号记录`);
        
        if (foundCodes.length === 0 && foundOrders.length === 0 && foundUserAccounts.length === 0) {
            return {
                success: false,
                error: '未找到与该支付宝账号关联的访问码记录'
            };
        }
        
        const results = [];
        
        foundCodes.forEach(code => {
            results.push({
                source: 'codes',
                access_code: code.code,
                status: code.status,
                product_name: code.product_name || 'IC Studio 视奏工具',
                amount: code.amount,
                created_time: code.created_at || code.created_time,
                out_trade_no: code.out_trade_no,
                order_id: code.order_id
            });
        });
        
        foundOrders.forEach(order => {
            const existingCode = results.find(r => r.out_trade_no === order.out_trade_no);
            if (!existingCode) {
                results.push({
                    source: 'orders',
                    access_code: order.access_code,
                    status: order.status,
                    product_name: order.name || 'IC Studio 视奏工具',
                    amount: order.money,
                    created_time: order.created_at || order.created_time,
                    out_trade_no: order.out_trade_no,
                    order_id: order._id,
                    zpay_trade_no: order.zpay_trade_no
                });
            }
        });
        
        foundUserAccounts.forEach(userAccount => {
            if (userAccount.access_code) {
                const existingCode = results.find(r => r.access_code === userAccount.access_code);
                if (!existingCode) {
                    results.push({
                        source: 'user_accounts',
                        access_code: userAccount.access_code,
                        status: userAccount.status || 'active',
                        product_name: 'IC Studio 视奏工具',
                        amount: null,
                        created_time: userAccount.collected_at || userAccount.created_at,
                        out_trade_no: userAccount.order_no,
                        order_id: userAccount.order_no,
                        phone: userAccount.phone,
                        email: userAccount.email
                    });
                }
            }
        });
        
        results.sort((a, b) => {
            const timeA = new Date(a.created_time || 0);
            const timeB = new Date(b.created_time || 0);
            return timeB - timeA;
        });
        
        console.log('🎉 查找完成');
        
        return {
            success: true,
            message: `找到 ${results.length} 个相关记录`,
            alipay_account: alipay_account,
            total_count: results.length,
            results: results
        };
        
    } catch (error) {
        console.error('❌ 查找错误:', error);
        return {
            success: false,
            error: '查找失败: ' + error.message
        };
    }
};