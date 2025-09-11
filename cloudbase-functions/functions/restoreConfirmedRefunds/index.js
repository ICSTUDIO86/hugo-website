/**
 * 恢复确认已退款的访问码状态
 * 根据用户确认，这三个访问码在Z-Pay后台确实已退款
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔄 开始恢复确认已退款的访问码状态...');
    console.log('📋 请求参数:', JSON.stringify(event, null, 2));
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        // 用户确认在Z-Pay后台已退款的访问码
        const confirmedRefundedCodes = [
            'WTHVEWWR36BM',  // IC17574228166341776
            'BCSS44XZAQ5C',  // IC17574296389486978
            'KXM35LY8BBS6'   // IC17574470147244941
        ];
        
        console.log(`📋 需要恢复 ${confirmedRefundedCodes.length} 个确认已退款的访问码`);
        
        const results = {
            processed: 0,
            restored: 0,
            errors: 0,
            details: []
        };
        
        const restoreTime = new Date();
        
        for (const accessCode of confirmedRefundedCodes) {
            console.log(`\n🔄 恢复访问码: ${accessCode}`);
            
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
                console.log(`📦 对应订单号: ${codeRecord.out_trade_no}`);
                
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
                console.log(`📦 订单状态: ${orderRecord.status || '未知'}`);
                
                // 3. 恢复codes集合为退款状态
                console.log('🔄 恢复codes集合为退款状态...');
                const codesUpdateResult = await db.collection('codes')
                    .where({ code: accessCode })
                    .update({
                        status: 'refunded',
                        refund_time: restoreTime,
                        refund_reason: '用户确认Z-Pay后台已退款，恢复正确状态',
                        updated_time: restoreTime,
                        restoration_timestamp: restoreTime,
                        restoration_reason: '纠正错误回滚，用户确认Z-Pay中实际已退款',
                        restored_by: 'status_correction_system'
                    });
                
                // 4. 恢复orders集合为退款状态
                console.log('🔄 恢复orders集合为退款状态...');
                const ordersUpdateResult = await db.collection('orders')
                    .doc(orderRecord._id)
                    .update({
                        refund_detail: '用户确认Z-Pay后台已退款',
                        refund_method: 'zpay_confirmed_refund',
                        refund_reason: '用户确认Z-Pay后台已退款，恢复正确状态',
                        refund_status: 'refunded',
                        refund_time: restoreTime,
                        updated_time: restoreTime,
                        restoration_timestamp: restoreTime,
                        restoration_reason: '纠正错误回滚，用户确认Z-Pay中实际已退款',
                        restored_by: 'status_correction_system'
                    });
                
                console.log(`✅ 访问码 ${accessCode} 状态已恢复为退款状态`);
                console.log(`   - codes集合更新: ${codesUpdateResult.updated} 条记录`);
                console.log(`   - orders集合更新: 1 条记录`);
                
                results.details.push({
                    access_code: accessCode,
                    order_no: orderRecord.out_trade_no,
                    status: 'restored',
                    message: '状态已恢复为退款状态（用户确认Z-Pay中实际已退款）',
                    codes_updated: codesUpdateResult.updated,
                    orders_updated: 1,
                    restore_time: restoreTime
                });
                
                results.restored++;
                results.processed++;
                
            } catch (error) {
                console.error(`❌ 恢复访问码 ${accessCode} 时发生错误:`, error);
                results.details.push({
                    access_code: accessCode,
                    status: 'error',
                    message: `恢复错误: ${error.message}`
                });
                results.errors++;
            }
        }
        
        // 记录恢复日志
        try {
            await db.collection('refund_logs').add({
                data: {
                    operation_type: 'status_restoration',
                    total_processed: results.processed,
                    total_restored: results.restored,
                    total_errors: results.errors,
                    target_codes: confirmedRefundedCodes,
                    results_summary: results,
                    performed_by: 'status_correction_system',
                    performed_at: restoreTime,
                    restoration_reason: '纠正错误回滚，用户确认Z-Pay中实际已退款',
                    request_id: context.requestId
                }
            });
            
            console.log('📝 状态恢复日志已记录');
        } catch (logError) {
            console.warn('⚠️ 记录恢复日志失败:', logError);
        }
        
        console.log('\n🎉 状态恢复完成');
        console.log(`📊 恢复统计: 总计${results.processed}个，成功${results.restored}个，错误${results.errors}个`);
        
        return {
            success: true,
            message: '确认已退款访问码状态恢复完成',
            statistics: {
                processed: results.processed,
                restored: results.restored,
                errors: results.errors
            },
            details: results.details,
            timestamp: restoreTime
        };
        
    } catch (error) {
        console.error('❌ 状态恢复操作失败:', error);
        return {
            success: false,
            error: '状态恢复操作失败',
            message: error.message,
            timestamp: new Date()
        };
    }
};