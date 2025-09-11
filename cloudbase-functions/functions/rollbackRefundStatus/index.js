/**
 * 回滚错误的退款状态 - 将错误标记为退款的订单恢复为活跃状态
 * 用于修复因未经Z-Pay验证就标记退款的错误操作
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔙 开始回滚错误的退款状态...');
    console.log('📋 请求参数:', JSON.stringify(event, null, 2));
    
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
            } catch (parseError) {
                requestData = event;
            }
        } else {
            requestData = event;
        }
        
        const { access_codes } = requestData;
        
        if (!access_codes || !Array.isArray(access_codes)) {
            return {
                success: false,
                error: '请提供访问码列表',
                usage: {
                    example: '{"access_codes": ["WTHVEWWR36BM", "BCSS44XZAQ5C"]}'
                }
            };
        }
        
        const results = {
            processed: 0,
            rolled_back: 0,
            errors: 0,
            details: []
        };
        
        const rollbackTime = new Date();
        
        for (const accessCode of access_codes) {
            console.log(`\n🔙 回滚访问码: ${accessCode}`);
            
            try {
                // 1. 查询codes集合
                const codeQuery = await db.collection('codes')
                    .where({ code: accessCode })
                    .get();
                
                if (codeQuery.data.length === 0) {
                    console.log(`❌ 访问码 ${accessCode} 不存在`);
                    results.details.push({
                        access_code: accessCode,
                        status: 'not_found',
                        message: '访问码不存在'
                    });
                    results.errors++;
                    continue;
                }
                
                const codeRecord = codeQuery.data[0];
                console.log(`📋 当前codes状态: ${codeRecord.status}`);
                
                // 2. 查询对应的订单
                const orderQuery = await db.collection('orders')
                    .where({ out_trade_no: codeRecord.out_trade_no })
                    .get();
                
                if (orderQuery.data.length === 0) {
                    console.log(`❌ 订单 ${codeRecord.out_trade_no} 不存在`);
                    results.details.push({
                        access_code: accessCode,
                        status: 'order_not_found',
                        message: `对应订单 ${codeRecord.out_trade_no} 不存在`
                    });
                    results.errors++;
                    continue;
                }
                
                const orderRecord = orderQuery.data[0];
                console.log(`📦 订单号: ${orderRecord.out_trade_no}, 当前状态: ${orderRecord.status}`);
                
                // 3. 回滚codes集合状态
                console.log('🔄 回滚codes集合状态...');
                const codesRollbackResult = await db.collection('codes')
                    .where({ code: accessCode })
                    .update({
                        status: 'active',
                        refund_time: db.command.remove(),
                        refund_reason: db.command.remove(),
                        updated_time: rollbackTime,
                        rollback_timestamp: rollbackTime,
                        rollback_reason: '回滚错误的退款标记（Z-Pay中未实际退款）',
                        rollback_by: 'status_correction_system'
                    });
                
                // 4. 回滚orders集合状态  
                console.log('🔄 回滚orders集合状态...');
                const ordersRollbackResult = await db.collection('orders')
                    .doc(orderRecord._id)
                    .update({
                        refund_detail: db.command.remove(),
                        refund_method: db.command.remove(),
                        refund_reason: db.command.remove(),
                        refund_status: db.command.remove(),
                        refund_time: db.command.remove(),
                        updated_time: rollbackTime,
                        rollback_timestamp: rollbackTime,
                        rollback_reason: '回滚错误的退款标记（Z-Pay中未实际退款）',
                        rollback_by: 'status_correction_system'
                    });
                
                console.log(`✅ 访问码 ${accessCode} 状态回滚完成`);
                console.log(`   - codes集合回滚: ${codesRollbackResult.updated} 条记录`);
                console.log(`   - orders集合回滚: 1 条记录`);
                
                results.details.push({
                    access_code: accessCode,
                    order_no: orderRecord.out_trade_no,
                    status: 'rolled_back',
                    message: '状态已回滚为活跃状态',
                    codes_updated: codesRollbackResult.updated,
                    orders_updated: 1,
                    rollback_time: rollbackTime
                });
                
                results.rolled_back++;
                results.processed++;
                
            } catch (error) {
                console.error(`❌ 回滚访问码 ${accessCode} 时发生错误:`, error);
                results.details.push({
                    access_code: accessCode,
                    status: 'error',
                    message: `回滚错误: ${error.message}`
                });
                results.errors++;
            }
        }
        
        // 记录回滚日志
        try {
            await db.collection('refund_logs').add({
                data: {
                    operation_type: 'status_rollback',
                    total_processed: results.processed,
                    total_rolled_back: results.rolled_back,
                    total_errors: results.errors,
                    target_codes: access_codes,
                    results_summary: results,
                    performed_by: 'status_correction_system',
                    performed_at: rollbackTime,
                    rollback_reason: 'Z-Pay验证发现状态错误，执行回滚操作',
                    request_id: context.requestId
                }
            });
            
            console.log('📝 回滚操作日志已记录');
        } catch (logError) {
            console.warn('⚠️ 记录回滚日志失败:', logError);
        }
        
        console.log('\n🎉 状态回滚完成');
        console.log(`📊 回滚统计: 总计${results.processed}个，成功${results.rolled_back}个，错误${results.errors}个`);
        
        return {
            success: true,
            message: '错误退款状态回滚完成',
            statistics: {
                processed: results.processed,
                rolled_back: results.rolled_back,
                errors: results.errors
            },
            details: results.details,
            timestamp: rollbackTime
        };
        
    } catch (error) {
        console.error('❌ 回滚操作失败:', error);
        return {
            success: false,
            error: '回滚操作失败',
            message: error.message,
            timestamp: new Date()
        };
    }
};