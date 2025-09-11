/**
 * IC Studio - 恢复测试访问码数据
 * 将指定的访问码从refunded状态恢复到active状态
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔄 数据恢复功能启动');
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        const _ = db.command;
        
        // 需要恢复的测试访问码
        const testAccessCodes = ['CM3Q4K4QLXNG', 'CJXD45JAZ6J9', 'LSUPH8UEBR73'];
        
        console.log('🎯 恢复以下访问码:', testAccessCodes);
        
        const results = [];
        
        for (const accessCode of testAccessCodes) {
            console.log(`📋 处理访问码: ${accessCode}`);
            
            // 1. 查找访问码记录
            const codeQuery = await db.collection('codes')
                .where({ code: accessCode })
                .get();
            
            if (codeQuery.data.length === 0) {
                console.log(`⚠️ 访问码 ${accessCode} 不存在`);
                results.push({
                    access_code: accessCode,
                    status: 'not_found',
                    message: '访问码不存在'
                });
                continue;
            }
            
            const codeRecord = codeQuery.data[0];
            const orderNo = codeRecord.out_trade_no;
            
            // 2. 恢复codes集合状态
            await db.collection('codes')
                .where({ code: accessCode })
                .update({
                    status: 'active',
                    refund_time: _.remove(),
                    refund_amount: _.remove(),
                    refund_order_no: _.remove(),
                    zpay_result: _.remove(),
                    zpay_refund_response: _.remove(),
                    access_code_refunded: _.remove(),
                    updated_time: new Date()
                });
            
            console.log(`✅ codes集合已恢复: ${accessCode}`);
            
            // 3. 恢复orders集合状态
            if (orderNo) {
                const orderQuery = await db.collection('orders')
                    .where({ out_trade_no: orderNo })
                    .get();
                
                if (orderQuery.data.length > 0) {
                    await db.collection('orders')
                        .where({ out_trade_no: orderNo })
                        .update({
                            refund_status: 'none',
                            refund_time: _.remove(),
                            refund_amount: _.remove(),
                            refund_order_no: _.remove(),
                            access_code_refunded: _.remove(),
                            zpay_refund_response: _.remove(),
                            updated_time: new Date()
                        });
                    
                    console.log(`✅ orders集合已恢复: ${orderNo}`);
                }
            }
            
            results.push({
                access_code: accessCode,
                order_no: orderNo,
                status: 'restored',
                message: '数据已恢复到active状态'
            });
        }
        
        // 记录恢复日志
        try {
            await db.collection('restore_logs').add({
                data: {
                    restored_codes: testAccessCodes,
                    results: results,
                    restore_time: new Date(),
                    request_id: context.requestId,
                    operator: 'system_restore'
                }
            });
        } catch (logError) {
            console.warn('⚠️ 恢复日志记录失败:', logError);
        }
        
        console.log('🎉 数据恢复完成');
        
        return {
            success: true,
            message: '测试访问码数据恢复完成',
            restored_codes: testAccessCodes,
            results: results
        };
        
    } catch (error) {
        console.error('❌ 恢复错误:', error);
        return {
            success: false,
            error: '恢复失败: ' + error.message
        };
    }
};