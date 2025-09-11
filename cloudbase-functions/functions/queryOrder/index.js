const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔍 查询订单请求:', JSON.stringify(event, null, 2));
    
    try {
        // 初始化云开发
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        const { order_no, access_code } = event;
        
        if (!order_no && !access_code) {
            return {
                success: false,
                error: '请提供订单号或访问码',
                code: 'MISSING_PARAMETERS'
            };
        }
        
        let order = null;
        let queryType = '';
        
        if (access_code) {
            queryType = '访问码';
            console.log(`🔎 查询访问码: ${access_code}`);
            
            // 通过访问码查找订单
            const { data: codes } = await db.collection('codes')
                .where({ code: access_code.toUpperCase() })
                .limit(1)
                .get();
                
            if (codes.length === 0) {
                return {
                    success: false,
                    error: '未找到该访问码',
                    code: 'ACCESS_CODE_NOT_FOUND'
                };
            }
            
            const orderNo = codes[0].out_trade_no;
            console.log(`✅ 访问码对应订单号: ${orderNo}`);
            
            // 查询对应订单
            const { data: orders } = await db.collection('orders')
                .where({ out_trade_no: orderNo })
                .limit(1)
                .get();
                
            if (orders.length === 0) {
                return {
                    success: false,
                    error: '访问码对应的订单不存在',
                    code: 'ORDER_NOT_FOUND_FOR_CODE'
                };
            }
            
            order = orders[0];
        } else {
            queryType = '订单号';
            console.log(`🔎 查询订单号: ${order_no}`);
            
            // 直接查询订单
            const { data: orders } = await db.collection('orders')
                .where({ out_trade_no: order_no })
                .limit(1)
                .get();
            
            if (orders.length === 0) {
                return {
                    success: false,
                    error: '未找到该订单号',
                    code: 'ORDER_NOT_FOUND'
                };
            }
            
            order = orders[0];
        }
        
        console.log('✅ 找到订单:', order.out_trade_no);
        
        // 2. 查找对应的访问码
        let accessCodes = [];
        
        if (order.alipayAccount) {
            // 方法1: 通过支付宝账号查找
            const { data: codesByAlipay } = await db.collection('codes')
                .where({ alipayAccount: order.alipayAccount })
                .get();
            
            console.log(`通过支付宝账号找到 ${codesByAlipay.length} 个访问码`);
            accessCodes = codesByAlipay;
        }
        
        // 方法2: 直接通过订单号查找
        const { data: codesByOrder } = await db.collection('codes')
            .where({ out_trade_no: order_no })
            .get();
        
        console.log(`通过订单号找到 ${codesByOrder.length} 个访问码`);
        
        // 合并结果并去重
        const allCodes = [...accessCodes, ...codesByOrder];
        const uniqueCodes = allCodes.filter((code, index, self) => 
            index === self.findIndex(c => c.code === code.code)
        );
        
        return {
            success: true,
            data: {
                order: {
                    out_trade_no: order.out_trade_no,
                    alipayAccount: order.alipayAccount,
                    money: order.money || order.real_price,
                    status: order.status || order.pay_status,
                    refund_status: order.refund_status,
                    endtime: order.endtime,
                    name: order.name
                },
                access_codes: uniqueCodes.map(code => ({
                    code: code.code,
                    status: code.status,
                    createdAt: code.createdAt || code.created_at,
                    alipayAccount: code.alipayAccount
                }))
            },
            message: `通过${queryType}找到订单 ${order.out_trade_no}，共 ${uniqueCodes.length} 个访问码`
        };
        
    } catch (error) {
        console.error('❌ 查询失败:', error);
        return {
            success: false,
            error: '查询失败',
            code: 'QUERY_ERROR',
            details: error.message
        };
    }
};