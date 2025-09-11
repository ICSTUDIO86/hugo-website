/**
 * 验证并纠正退款状态 - 扫描所有最近标记为退款的访问码
 * 通过Z-Pay API验证真实状态，纠正错误的标记
 */

const cloud = require('@cloudbase/node-sdk');
const crypto = require('crypto');

exports.main = async (event, context) => {
    console.log('🔍 开始验证并纠正退款状态...');
    console.log('📋 请求参数:', JSON.stringify(event, null, 2));
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        // Z-Pay配置
        const ZPAY_PID = process.env.ZPAY_PID || '2025090607243839';
        const ZPAY_KEY = process.env.ZPAY_KEY || 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN';
        
        console.log('🔧 Z-Pay配置完成');
        
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
        
        const { hours_back = 24 } = requestData;
        
        // 查找最近被标记为退款的所有访问码
        const cutoffTime = new Date(Date.now() - hours_back * 60 * 60 * 1000);
        console.log(`🔍 查找 ${hours_back} 小时内标记为退款的访问码...`);
        console.log(`📅 截止时间: ${cutoffTime.toISOString()}`);
        
        const recentlyRefundedCodes = await db.collection('codes')
            .where({
                status: 'refunded',
                refund_time: db.command.gte(cutoffTime)
            })
            .get();
        
        console.log(`📊 找到 ${recentlyRefundedCodes.data.length} 个最近标记为退款的访问码需要验证`);
        
        if (recentlyRefundedCodes.data.length === 0) {
            return {
                success: true,
                message: '没有找到需要验证的最近退款访问码',
                statistics: { 
                    verified: 0, 
                    correct: 0, 
                    incorrect_rolled_back: 0, 
                    errors: 0 
                },
                timestamp: new Date()
            };
        }
        
        const results = {
            verified: 0,
            correct: 0,
            incorrect_rolled_back: 0,
            errors: 0,
            details: []
        };
        
        // 批量验证（限制并发数避免API限制）
        const batchSize = 3;
        for (let i = 0; i < recentlyRefundedCodes.data.length; i += batchSize) {
            const batch = recentlyRefundedCodes.data.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (codeRecord) => {
                try {
                    const result = await verifyAndCorrectSingleCode(
                        codeRecord, 
                        db, 
                        ZPAY_PID, 
                        ZPAY_KEY
                    );
                    
                    results.verified++;
                    if (result.action === 'correct') {
                        results.correct++;
                    } else if (result.action === 'rolled_back') {
                        results.incorrect_rolled_back++;
                    }
                    results.details.push(result);
                    
                } catch (error) {
                    console.error(`❌ 验证访问码 ${codeRecord.code} 失败:`, error);
                    results.errors++;
                    results.details.push({
                        access_code: codeRecord.code,
                        status: 'error',
                        message: error.message
                    });
                }
            }));
            
            // 批次间延迟
            if (i + batchSize < recentlyRefundedCodes.data.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // 记录验证日志
        try {
            await db.collection('refund_logs').add({
                data: {
                    operation_type: 'refund_status_verification',
                    verified_count: results.verified,
                    correct_count: results.correct,
                    rolled_back_count: results.incorrect_rolled_back,
                    error_count: results.errors,
                    hours_back: hours_back,
                    cutoff_time: cutoffTime,
                    results_summary: results,
                    performed_by: 'verification_system',
                    performed_at: new Date(),
                    request_id: context.requestId
                }
            });
            
            console.log('📝 验证日志已记录');
        } catch (logError) {
            console.warn('⚠️ 记录验证日志失败:', logError);
        }
        
        console.log('\n🎉 验证纠正完成');
        console.log(`📊 验证统计: 总计${results.verified}个，正确${results.correct}个，回滚${results.incorrect_rolled_back}个，错误${results.errors}个`);
        
        return {
            success: true,
            message: '退款状态验证纠正完成',
            statistics: {
                verified: results.verified,
                correct: results.correct,
                incorrect_rolled_back: results.incorrect_rolled_back,
                errors: results.errors
            },
            details: results.details,
            timestamp: new Date()
        };
        
    } catch (error) {
        console.error('❌ 验证纠正操作失败:', error);
        return {
            success: false,
            error: '验证纠正操作失败',
            message: error.message,
            timestamp: new Date()
        };
    }
};

/**
 * 验证并纠正单个访问码
 */
async function verifyAndCorrectSingleCode(codeRecord, db, zpayPid, zpayKey) {
    const accessCode = codeRecord.code;
    const orderNo = codeRecord.out_trade_no;
    
    console.log(`\n🔍 验证访问码: ${accessCode} (订单: ${orderNo})`);
    
    try {
        // 调用Z-Pay查询接口验证实际状态
        const zpayStatus = await queryZPayOrderStatus(orderNo, zpayPid, zpayKey);
        
        if (zpayStatus.isRefunded) {
            // Z-Pay中确实已退款，状态正确
            console.log(`✅ 访问码 ${accessCode} 状态正确 - Z-Pay中已退款`);
            return {
                access_code: accessCode,
                order_no: orderNo,
                action: 'correct',
                message: 'Z-Pay中确实已退款，数据库状态正确',
                zpay_refunded: true
            };
        } else {
            // Z-Pay中未退款，需要回滚数据库状态
            console.log(`⚠️ 访问码 ${accessCode} 状态错误 - Z-Pay中未退款，需要回滚`);
            
            const rollbackTime = new Date();
            
            // 回滚codes集合
            await db.collection('codes')
                .where({ code: accessCode })
                .update({
                    status: 'active',
                    refund_time: db.command.remove(),
                    refund_reason: db.command.remove(),
                    updated_time: rollbackTime,
                    auto_rollback_timestamp: rollbackTime,
                    auto_rollback_reason: 'Z-Pay验证发现未实际退款，自动回滚',
                    auto_rollback_by: 'verification_system'
                });
            
            // 查询并回滚对应的orders集合
            const orderQuery = await db.collection('orders')
                .where({ out_trade_no: orderNo })
                .get();
            
            if (orderQuery.data.length > 0) {
                const order = orderQuery.data[0];
                await db.collection('orders')
                    .doc(order._id)
                    .update({
                        refund_detail: db.command.remove(),
                        refund_method: db.command.remove(),
                        refund_reason: db.command.remove(),
                        refund_status: db.command.remove(),
                        refund_time: db.command.remove(),
                        updated_time: rollbackTime,
                        auto_rollback_timestamp: rollbackTime,
                        auto_rollback_reason: 'Z-Pay验证发现未实际退款，自动回滚',
                        auto_rollback_by: 'verification_system'
                    });
            }
            
            console.log(`🔙 访问码 ${accessCode} 已自动回滚为活跃状态`);
            
            return {
                access_code: accessCode,
                order_no: orderNo,
                action: 'rolled_back',
                message: 'Z-Pay中未实际退款，已自动回滚为活跃状态',
                zpay_refunded: false,
                rollback_time: rollbackTime
            };
        }
        
    } catch (error) {
        console.error(`❌ 验证访问码 ${accessCode} 时发生错误:`, error);
        throw error;
    }
}

/**
 * 查询Z-Pay订单状态
 */
async function queryZPayOrderStatus(orderNo, pid, key) {
    console.log(`📡 查询Z-Pay订单状态: ${orderNo}`);
    
    try {
        // 构建查询参数
        const params = {
            pid: pid,
            out_trade_no: orderNo
        };
        
        // 生成签名
        const sortedKeys = Object.keys(params)
            .filter(k => params[k] !== '' && params[k] !== null && params[k] !== undefined)
            .sort();
        
        const queryString = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
        const signString = queryString + key;
        const sign = crypto.createHash('md5').update(signString).digest('hex').toLowerCase();
        
        // 调用Z-Pay查询API
        const fetch = require('node-fetch');
        const response = await fetch('https://z-pay.cn/api.php?act=query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'ICStudio-VerificationSystem/1.0'
            },
            body: new URLSearchParams({
                ...params,
                sign: sign
            })
        });
        
        const responseText = await response.text();
        console.log(`📥 Z-Pay响应 (${orderNo}):`, responseText.substring(0, 100) + '...');
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            responseData = { raw: responseText };
        }
        
        // 分析响应判断是否已退款
        const isRefunded = analyzeZPayRefundStatus(responseData, responseText);
        
        return {
            isRefunded: isRefunded,
            raw_response: responseData
        };
        
    } catch (error) {
        console.error(`❌ Z-Pay API调用失败 (${orderNo}):`, error);
        return {
            isRefunded: false,
            error: error.message
        };
    }
}

/**
 * 分析Z-Pay响应判断是否已退款
 */
function analyzeZPayRefundStatus(responseData, responseText) {
    // 检查各种可能的退款标识
    const refundIndicators = [
        '已全额退款',
        '退款成功', 
        'refunded',
        'refund_success',
        'status.*refund',
        'trade_status.*refund'
    ];
    
    const text = responseText.toLowerCase();
    const dataStr = JSON.stringify(responseData).toLowerCase();
    
    for (const indicator of refundIndicators) {
        if (text.includes(indicator) || dataStr.includes(indicator)) {
            return true;
        }
    }
    
    // 检查具体的状态字段
    if (responseData.trade_status === 'TRADE_REFUND' || 
        responseData.status === 'refunded' ||
        responseData.refund_status === 'success') {
        return true;
    }
    
    return false;
}