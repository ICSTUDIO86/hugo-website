/**
 * 批量修复退款状态 - 同步Z-Pay已退款但数据库未更新的访问码
 * 处理由于之前数据库同步问题导致的状态不一致
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔧 开始批量修复退款状态...');
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
        
        const { access_codes, fix_all_pending = false } = requestData;
        
        let targetCodes = [];
        
        if (fix_all_pending) {
            // 查找所有可能需要修复的访问码
            console.log('🔍 查找所有可能需要修复的访问码...');
            const pendingCodes = await db.collection('codes')
                .where({ status: 'active' })
                .get();
            
            targetCodes = pendingCodes.data.map(code => code.code);
            console.log(`📊 找到 ${targetCodes.length} 个活跃状态的访问码需要检查`);
            
        } else if (access_codes && Array.isArray(access_codes)) {
            targetCodes = access_codes.map(code => code.toUpperCase());
            console.log(`📋 指定修复 ${targetCodes.length} 个访问码:`, targetCodes);
        } else {
            return {
                success: false,
                error: '请提供访问码列表或设置fix_all_pending=true',
                usage: {
                    specific_codes: '{"access_codes": ["WTHVEWWR36BM", "BCSS44XZAQ5C"]}',
                    fix_all: '{"fix_all_pending": true}'
                }
            };
        }
        
        const results = {
            processed: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
            details: []
        };
        
        const fixTime = new Date();
        
        for (const accessCode of targetCodes) {
            console.log(`\n🔍 处理访问码: ${accessCode}`);
            
            try {
                // 1. 查询codes集合
                const codeQuery = await db.collection('codes')
                    .where({ code: accessCode })
                    .get();
                
                if (codeQuery.data.length === 0) {
                    console.log(`❌ 访问码 ${accessCode} 在codes集合中不存在`);
                    results.details.push({
                        access_code: accessCode,
                        status: 'not_found',
                        message: '访问码在codes集合中不存在'
                    });
                    results.errors++;
                    continue;
                }
                
                const codeRecord = codeQuery.data[0];
                console.log(`📋 当前codes状态: ${codeRecord.status}`);
                
                // 如果已经是refunded状态，跳过
                if (codeRecord.status === 'refunded') {
                    console.log(`⏭️ 访问码 ${accessCode} 已经是退款状态，跳过`);
                    results.details.push({
                        access_code: accessCode,
                        status: 'already_refunded',
                        message: '已经是退款状态，无需处理'
                    });
                    results.skipped++;
                    continue;
                }
                
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
                
                // 3. 更新codes集合
                console.log('🔄 更新codes集合状态...');
                const codesUpdateResult = await db.collection('codes')
                    .where({ code: accessCode })
                    .update({
                        status: 'refunded',
                        refund_time: fixTime,
                        refund_reason: '手动修复退款状态',
                        updated_time: fixTime,
                        fix_timestamp: fixTime,
                        manual_fix_by: 'batch_status_fix'
                    });
                
                // 4. 更新orders集合
                console.log('🔄 更新orders集合状态...');
                const ordersUpdateResult = await db.collection('orders')
                    .doc(orderRecord._id)
                    .update({
                        refund_detail: '',
                        refund_method: 'manual_status_fix',
                        refund_reason: '手动修复退款状态',
                        refund_status: 'refunded',
                        refund_time: fixTime,
                        updated_time: fixTime,
                        fix_timestamp: fixTime,
                        manual_fix_by: 'system_admin'
                    });
                
                console.log(`✅ 访问码 ${accessCode} 状态修复完成`);
                console.log(`   - codes集合更新: ${codesUpdateResult.updated} 条记录`);
                console.log(`   - orders集合更新: 1 条记录`);
                
                results.details.push({
                    access_code: accessCode,
                    order_no: orderRecord.out_trade_no,
                    status: 'fixed',
                    message: '状态修复成功',
                    codes_updated: codesUpdateResult.updated,
                    orders_updated: 1,
                    fix_time: fixTime
                });
                
                results.updated++;
                results.processed++;
                
            } catch (error) {
                console.error(`❌ 处理访问码 ${accessCode} 时发生错误:`, error);
                results.details.push({
                    access_code: accessCode,
                    status: 'error',
                    message: `处理错误: ${error.message}`
                });
                results.errors++;
            }
        }
        
        // 记录修复日志
        try {
            await db.collection('refund_logs').add({
                data: {
                    operation_type: 'batch_status_fix',
                    total_processed: results.processed,
                    total_updated: results.updated,
                    total_skipped: results.skipped,
                    total_errors: results.errors,
                    target_codes: targetCodes,
                    results_summary: results,
                    performed_by: 'system_admin',
                    performed_at: fixTime,
                    request_id: context.requestId
                }
            });
            
            console.log('📝 批量修复日志已记录');
        } catch (logError) {
            console.warn('⚠️ 记录修复日志失败:', logError);
        }
        
        console.log('\n🎉 批量修复完成');
        console.log(`📊 处理统计: 总计${results.processed}个，成功${results.updated}个，跳过${results.skipped}个，错误${results.errors}个`);
        
        return {
            success: true,
            message: '批量退款状态修复完成',
            statistics: {
                processed: results.processed,
                updated: results.updated,
                skipped: results.skipped,
                errors: results.errors
            },
            details: results.details,
            timestamp: fixTime
        };
        
    } catch (error) {
        console.error('❌ 批量修复退款状态失败:', error);
        return {
            success: false,
            error: '批量修复失败',
            message: error.message,
            timestamp: new Date()
        };
    }
};