/**
 * 重置退款状态云函数 - 用于修复数据不一致问题
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔄 重置退款状态请求:', JSON.stringify(event, null, 2));
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        const order_no = event.order_no;
        const access_code = event.access_code;
        const reason = event.reason;
        
        if (!order_no && !access_code) {
            return {
                success: false,
                error: '请提供订单号或访问码'
            };
        }
        
        let targetOrderNo = order_no;
        
        // 如果提供访问码，先查找订单号
        if (access_code && !order_no) {
            const { data: codes } = await db.collection('codes')
                .where({ code: access_code.toUpperCase() })
                .get();
                
            if (codes.length === 0) {
                return {
                    success: false,
                    error: '未找到访问码对应的记录'
                };
            }
            
            targetOrderNo = codes[0].out_trade_no;
            console.log(`通过访问码${access_code}找到订单号: ${targetOrderNo}`);
        }
        
        console.log(`🔄 开始重置订单 ${targetOrderNo} 的退款状态`);
        
        // 重置orders集合
        const orderResult = await db.collection('orders')
            .where({ out_trade_no: targetOrderNo })
            .update({
                refund_status: null,
                refund_time: null,
                reset_time: new Date(),
                reset_reason: reason || '重置退款状态',
                reset_by: 'resetRefundStatus_function'
            });
        
        console.log(`✅ orders集合重置完成，影响记录: ${orderResult.updated}`);
        
        // 重置codes集合
        const codeResult = await db.collection('codes')
            .where({ out_trade_no: targetOrderNo })
            .update({
                status: 'active',
                refund_time: null,
                reset_time: new Date(),
                reset_reason: reason || '重置退款状态'
            });
        
        console.log(`✅ codes集合重置完成，影响记录: ${codeResult.updated}`);
        
        // 验证重置结果
        const { data: verifyOrder } = await db.collection('orders')
            .where({ out_trade_no: targetOrderNo })
            .get();
        const { data: verifyCodes } = await db.collection('codes')
            .where({ out_trade_no: targetOrderNo })
            .get();
        
        return {
            success: true,
            message: `订单 ${targetOrderNo} 退款状态已重置`,
            data: {
                order_no: targetOrderNo,
                access_codes: verifyCodes.map(c => c.code),
                reset_time: new Date(),
                verification: {
                    order_refund_status: verifyOrder[0]?.refund_status,
                    codes_status: verifyCodes.map(c => ({code: c.code, status: c.status}))
                }
            }
        };
        
    } catch (error) {
        console.error('❌ 重置失败:', error);
        return {
            success: false,
            error: '重置失败',
            details: error.message
        };
    }
};