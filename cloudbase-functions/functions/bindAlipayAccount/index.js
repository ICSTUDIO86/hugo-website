/**
 * IC Studio - 绑定支付宝账号到现有访问码
 * 允许用户将支付宝账号关联到已有的访问码和订单
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔗 绑定支付宝账号功能启动');
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
        
        const { access_code, alipay_account } = requestData;
        
        if (!access_code || !alipay_account) {
            return {
                success: false,
                error: '请提供访问码和支付宝账号'
            };
        }
        
        // 验证支付宝账号格式（手机号或邮箱）
        const isValidPhone = /^1[3-9]\d{9}$/.test(alipay_account);
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alipay_account);
        
        if (!isValidPhone && !isValidEmail) {
            return {
                success: false,
                error: '请输入有效的支付宝账号（手机号或邮箱）'
            };
        }
        
        console.log('🎯 绑定访问码:', access_code, '到支付宝账号:', alipay_account);
        
        // 首先查找访问码是否存在
        const codeQuery = await db.collection('codes')
            .where({ code: access_code })
            .get();
        
        const orderQuery = await db.collection('orders')
            .where({ access_code: access_code })
            .get();
        
        const foundCodes = codeQuery.data || [];
        const foundOrders = orderQuery.data || [];
        
        if (foundCodes.length === 0 && foundOrders.length === 0) {
            return {
                success: false,
                error: '访问码不存在'
            };
        }
        
        let updateResults = [];
        
        // 更新codes集合中的记录
        for (const code of foundCodes) {
            if (code.alipay_account && code.alipay_account !== alipay_account) {
                return {
                    success: false,
                    error: `访问码已绑定到其他支付宝账号`
                };
            }
            
            if (!code.alipay_account) {
                await db.collection('codes').doc(code._id).update({
                    data: {
                        alipay_account: alipay_account,
                        alipay_bind_time: new Date(),
                        alipay_bind_ip: event.requestContext?.sourceIP || 'unknown'
                    }
                });
                
                updateResults.push({
                    collection: 'codes',
                    id: code._id,
                    status: 'updated'
                });
                
                console.log('✅ 更新codes记录:', code._id);
            } else {
                updateResults.push({
                    collection: 'codes',
                    id: code._id,
                    status: 'already_bound'
                });
            }
        }
        
        // 更新orders集合中的记录
        for (const order of foundOrders) {
            if (order.alipay_account && order.alipay_account !== alipay_account) {
                return {
                    success: false,
                    error: `订单已绑定到其他支付宝账号`
                };
            }
            
            if (!order.alipay_account) {
                await db.collection('orders').doc(order._id).update({
                    data: {
                        alipay_account: alipay_account,
                        alipay_bind_time: new Date(),
                        alipay_bind_ip: event.requestContext?.sourceIP || 'unknown'
                    }
                });
                
                updateResults.push({
                    collection: 'orders',
                    id: order._id,
                    status: 'updated'
                });
                
                console.log('✅ 更新orders记录:', order._id);
            } else {
                updateResults.push({
                    collection: 'orders',
                    id: order._id,
                    status: 'already_bound'
                });
            }
        }
        
        // 记录绑定日志
        try {
            await db.collection('alipay_bind_logs').add({
                data: {
                    access_code: access_code,
                    alipay_account: alipay_account,
                    bind_time: new Date(),
                    request_id: context.requestId,
                    ip: event.requestContext?.sourceIP || 'unknown',
                    update_results: updateResults
                }
            });
        } catch (logError) {
            console.warn('⚠️ 绑定日志记录失败:', logError);
        }
        
        const updatedCount = updateResults.filter(r => r.status === 'updated').length;
        const alreadyBoundCount = updateResults.filter(r => r.status === 'already_bound').length;
        
        console.log('🎉 绑定完成');
        
        return {
            success: true,
            message: updatedCount > 0 
                ? `成功绑定 ${updatedCount} 条记录到支付宝账号`
                : '访问码已绑定到该支付宝账号',
            access_code: access_code,
            alipay_account: alipay_account,
            updated_count: updatedCount,
            already_bound_count: alreadyBoundCount,
            update_results: updateResults
        };
        
    } catch (error) {
        console.error('❌ 绑定错误:', error);
        return {
            success: false,
            error: '绑定失败: ' + error.message
        };
    }
};