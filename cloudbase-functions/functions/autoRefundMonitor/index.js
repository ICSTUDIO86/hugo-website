/**
 * 自动退款监控系统 - 定期检查并同步Z-Pay与数据库的退款状态
 * 设计用于定时器触发，自动化修复状态不一致问题
 */

const cloud = require('@cloudbase/node-sdk');
const crypto = require('crypto');

exports.main = async (event, context) => {
    console.log('🔍 自动退款监控系统启动...');
    console.log('📋 触发事件:', JSON.stringify(event, null, 2));
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        // 环境变量检查
        const ZPAY_PID = process.env.ZPAY_PID;
        const ZPAY_KEY = process.env.ZPAY_KEY;
        
        if (!ZPAY_PID || !ZPAY_KEY) {
            throw new Error('Z-Pay环境变量未配置');
        }
        
        console.log('🔧 环境变量检查完成');
        
        // 1. 查找所有活跃状态的访问码
        console.log('🔍 查找活跃状态的访问码...');
        const activeCodes = await db.collection('codes')
            .where({ status: 'active' })
            .get();
        
        console.log(`📊 找到 ${activeCodes.data.length} 个活跃访问码需要检查`);
        
        if (activeCodes.data.length === 0) {
            return {
                success: true,
                message: '没有需要检查的活跃访问码',
                statistics: { checked: 0, fixed: 0, errors: 0 },
                timestamp: new Date()
            };
        }
        
        const results = {
            checked: 0,
            fixed: 0,
            errors: 0,
            details: []
        };
        
        // 2. 批量检查Z-Pay退款状态（限制并发数）
        const batchSize = 5; // 避免API频繁调用
        for (let i = 0; i < activeCodes.data.length; i += batchSize) {
            const batch = activeCodes.data.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (codeRecord) => {
                try {
                    const result = await checkAndFixRefundStatus(
                        codeRecord, 
                        db, 
                        ZPAY_PID, 
                        ZPAY_KEY
                    );
                    
                    results.checked++;
                    if (result.fixed) {
                        results.fixed++;
                    }
                    results.details.push(result);
                    
                } catch (error) {
                    console.error(`❌ 检查访问码 ${codeRecord.code} 失败:`, error);
                    results.errors++;
                    results.details.push({
                        access_code: codeRecord.code,
                        status: 'error',
                        message: error.message
                    });
                }
            }));
            
            // 批次间延迟，避免API限制
            if (i + batchSize < activeCodes.data.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // 3. 记录监控日志
        try {
            await db.collection('refund_logs').add({
                data: {
                    operation_type: 'auto_refund_monitor',
                    checked_count: results.checked,
                    fixed_count: results.fixed,
                    error_count: results.errors,
                    results_summary: results,
                    performed_by: 'auto_monitor_system',
                    performed_at: new Date(),
                    trigger_type: event.Type || 'manual',
                    request_id: context.requestId
                }
            });
            
            console.log('📝 监控日志已记录');
        } catch (logError) {
            console.warn('⚠️ 记录监控日志失败:', logError);
        }
        
        console.log('\n🎉 自动监控完成');
        console.log(`📊 检查统计: 总计${results.checked}个，修复${results.fixed}个，错误${results.errors}个`);
        
        return {
            success: true,
            message: '自动退款监控完成',
            statistics: {
                checked: results.checked,
                fixed: results.fixed,
                errors: results.errors
            },
            details: results.details,
            timestamp: new Date()
        };
        
    } catch (error) {
        console.error('❌ 自动退款监控失败:', error);
        return {
            success: false,
            error: '自动监控失败',
            message: error.message,
            timestamp: new Date()
        };
    }
};

/**
 * 检查单个访问码的Z-Pay退款状态并修复数据库
 */
async function checkAndFixRefundStatus(codeRecord, db, zpayPid, zpayKey) {
    const accessCode = codeRecord.code;
    const orderNo = codeRecord.out_trade_no;
    
    console.log(`🔍 检查访问码: ${accessCode} (订单: ${orderNo})`);
    
    try {
        // 调用Z-Pay查询接口检查订单状态
        const zpayStatus = await queryZPayOrderStatus(orderNo, zpayPid, zpayKey);
        
        // 如果Z-Pay中订单已退款，但数据库中仍为active状态
        if (zpayStatus.isRefunded && codeRecord.status === 'active') {
            console.log(`🔧 发现状态不一致，开始修复: ${accessCode}`);
            
            const fixTime = new Date();
            
            // 更新codes集合
            await db.collection('codes')
                .where({ code: accessCode })
                .update({
                    status: 'refunded',
                    refund_time: fixTime,
                    refund_reason: 'Z-Pay自动检测退款',
                    updated_time: fixTime,
                    auto_sync_timestamp: fixTime,
                    synced_by: 'auto_monitor'
                });
            
            // 查询并更新对应的orders集合
            const orderQuery = await db.collection('orders')
                .where({ out_trade_no: orderNo })
                .get();
            
            if (orderQuery.data.length > 0) {
                const order = orderQuery.data[0];
                await db.collection('orders')
                    .doc(order._id)
                    .update({
                        refund_detail: '',
                        refund_method: 'zpay_auto_sync',
                        refund_reason: 'Z-Pay自动检测退款',
                        refund_status: 'refunded',
                        refund_time: fixTime,
                        updated_time: fixTime,
                        auto_sync_timestamp: fixTime,
                        synced_by: 'auto_monitor'
                    });
            }
            
            console.log(`✅ 访问码 ${accessCode} 状态已自动修复`);
            
            return {
                access_code: accessCode,
                order_no: orderNo,
                status: 'auto_fixed',
                message: '检测到Z-Pay退款，已自动修复数据库状态',
                fix_time: fixTime,
                fixed: true
            };
            
        } else {
            return {
                access_code: accessCode,
                order_no: orderNo,
                status: 'no_change',
                message: '状态一致，无需修复',
                fixed: false
            };
        }
        
    } catch (error) {
        console.error(`❌ 处理访问码 ${accessCode} 时发生错误:`, error);
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
                'User-Agent': 'ICStudio-AutoMonitor/1.0'
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
            zpay_response: responseData
        };
        
    } catch (error) {
        console.error(`❌ 查询Z-Pay状态失败: ${orderNo}`, error);
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

/**
 * 生成Z-Pay签名
 */
function generateZPaySign(params, key) {
    const sortedKeys = Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== null && params[k] !== undefined)
        .sort();
    
    const queryString = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
    const signString = queryString + key;
    
    return crypto.createHash('md5').update(signString).digest('hex').toLowerCase();
}