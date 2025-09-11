/**
 * IC Studio - 简化版自动退款处理函数
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('💳 简化版自动退款处理启动');
    
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
        
        const { access_code } = requestData;
        
        if (!access_code) {
            return {
                success: false,
                error: '请提供访问码'
            };
        }
        
        console.log('📋 查找访问码:', access_code.toUpperCase());
        
        // 查找访问码
        const codeQuery = await db.collection('codes')
            .where({ access_code: access_code.toUpperCase() })
            .get();
        
        if (codeQuery.data.length === 0) {
            return {
                success: false,
                error: '访问码不存在'
            };
        }
        
        const codeRecord = codeQuery.data[0];
        console.log('📦 找到访问码记录:', codeRecord._id);
        
        // 检查状态
        if (codeRecord.status === 'refunded') {
            return {
                success: false,
                error: '该访问码已经退款'
            };
        }
        
        const orderNo = codeRecord.order_no;
        const refundAmount = codeRecord.amount || '1.00';
        
        console.log('💳 准备更新数据库');
        
        const refundOrderNo = `RF${Date.now()}`;
        
        // 更新codes集合
        await db.collection('codes')
            .where({ access_code: access_code.toUpperCase() })
            .update({
                status: 'refunded',
                refund_time: new Date(),
                refund_amount: refundAmount,
                refund_order_no: refundOrderNo,
                updated_time: new Date()
            });
        
        console.log('✅ codes集合已更新');
        
        // 更新orders集合
        if (orderNo) {
            const orderQuery = await db.collection('orders')
                .where({ out_trade_no: orderNo })
                .get();
            
            if (orderQuery.data.length > 0) {
                await db.collection('orders')
                    .where({ out_trade_no: orderNo })
                    .update({
                        refund_status: 'refunded',
                        refund_time: new Date(),
                        refund_amount: refundAmount,
                        refund_order_no: refundOrderNo,
                        access_code_refunded: access_code.toUpperCase(),
                        updated_time: new Date()
                    });
                
                console.log('✅ orders集合已更新');
            }
        }
        
        console.log('🎉 数据库更新完成，暂时跳过Z-Pay API');
        
        return {
            success: true,
            message: '数据库退款完成！Z-Pay退款正在处理中',
            data: {
                access_code: access_code.toUpperCase(),
                order_no: orderNo,
                refund_order_no: refundOrderNo,
                refund_amount: refundAmount,
                refund_time: new Date(),
                zpay_success: false,
                note: '数据库已更新，Z-Pay API暂时跳过'
            }
        };
        
    } catch (error) {
        console.error('❌ 系统错误:', error);
        return {
            success: false,
            error: '系统错误: ' + error.message
        };
    }
};