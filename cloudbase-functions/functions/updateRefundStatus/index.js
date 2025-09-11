const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔧 手动更新退款状态请求:', JSON.stringify(event, null, 2));
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        const { access_code, order_no, force_update = false } = event;
        
        if (!access_code && !order_no) {
            return {
                success: false,
                error: '请提供访问码或订单号',
                code: 'MISSING_PARAMETERS'
            };
        }
        
        let query = {};
        let identifier = '';
        
        if (order_no) {
            query.out_trade_no = order_no;
            identifier = `订单号: ${order_no}`;
        } else {
            // 通过访问码查找订单
            const { data: codes } = await db.collection('codes').where({
                code: access_code.toUpperCase()
            }).get();
            
            if (codes.length === 0) {
                return {
                    success: false,
                    error: '未找到对应的访问码',
                    code: 'ACCESS_CODE_NOT_FOUND'
                };
            }
            
            query.out_trade_no = codes[0].out_trade_no;
            identifier = `访问码: ${access_code} -> 订单号: ${codes[0].out_trade_no}`;
        }
        
        console.log(`🔎 查询条件: ${identifier}`);
        
        // 查询订单
        const { data: orders } = await db.collection('orders').where(query).get();
        
        if (orders.length === 0) {
            return {
                success: false,
                error: '未找到对应的订单',
                code: 'ORDER_NOT_FOUND'
            };
        }
        
        const order = orders[0];
        console.log(`✅ 找到订单: ${order.out_trade_no}, 当前状态: ${order.status || order.pay_status}`);
        
        // 检查是否已经退款
        if (order.refund_status === 'refunded' && !force_update) {
            return {
                success: false,
                error: '订单已经是退款状态',
                code: 'ALREADY_REFUNDED',
                data: {
                    order_no: order.out_trade_no,
                    current_status: order.refund_status,
                    refund_time: order.refund_time
                }
            };
        }
        
        // 更新订单状态
        const updateData = {
            refund_status: 'refunded',
            refund_time: new Date(),
            refund_reason: '手动修复退款状态',
            refund_method: 'manual_status_fix',
            updated_time: new Date(),
            manual_fix_by: 'system_admin',
            fix_timestamp: new Date()
        };
        
        await db.collection('orders').doc(order._id).update(updateData);
        console.log('✅ 订单退款状态已更新');
        
        // 更新codes集合中的状态
        if (access_code) {
            await db.collection('codes').where({
                code: access_code.toUpperCase()
            }).update({
                status: 'refunded',
                refund_time: new Date(),
                updated_time: new Date()
            });
            console.log('✅ 访问码状态已更新');
        }
        
        // 记录修复日志
        try {
            await db.collection('refund_fix_logs').add({
                data: {
                    order_id: order._id,
                    order_no: order.out_trade_no,
                    access_code: access_code ? access_code.toUpperCase() : null,
                    action: 'manual_refund_status_fix',
                    reason: '修复Z-Pay已退款但本地状态未更新的问题',
                    previous_status: order.refund_status || 'none',
                    new_status: 'refunded',
                    timestamp: new Date(),
                    request_id: context.requestId
                }
            });
            console.log('📝 修复日志已记录');
        } catch (logError) {
            console.warn('⚠️ 记录修复日志失败:', logError);
        }
        
        return {
            success: true,
            message: `${identifier} 的退款状态已成功修复`,
            data: {
                order_no: order.out_trade_no,
                access_code: access_code ? access_code.toUpperCase() : null,
                previous_status: order.refund_status || 'none',
                new_status: 'refunded',
                fix_time: new Date()
            }
        };
        
    } catch (error) {
        console.error('❌ 更新退款状态失败:', error);
        return {
            success: false,
            error: '系统错误',
            code: 'INTERNAL_ERROR',
            details: error.message
        };
    }
};