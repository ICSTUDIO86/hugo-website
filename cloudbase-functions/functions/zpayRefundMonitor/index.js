/**
 * Z-Pay 退款监控服务
 * 检测数据库中的退款标记并执行实际退款
 * 通过定时触发器定期运行
 */

const cloud = require('@cloudbase/node-sdk');
const crypto = require('crypto');

// Z-Pay API 配置
const ZPAY_CONFIG = {
    pid: process.env.ZPAY_PID || '2025090607243839',
    key: process.env.ZPAY_KEY || 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN',
    refundUrl: 'https://xorpay.com/api/refund/v2/refund'
};

// 生成MD5签名
function generateMD5Sign(params, key) {
    const sortedKeys = Object.keys(params).sort();
    let signStr = '';
    
    for (const k of sortedKeys) {
        if (k !== 'sign' && k !== 'sign_type' && params[k] !== '') {
            signStr += k + '=' + params[k] + '&';
        }
    }
    
    signStr = signStr.slice(0, -1) + key;
    return crypto.createHash('md5').update(signStr).digest('hex');
}

// 调用Z-Pay退款API
async function callZPayRefund(orderNo, amount, reason) {
    console.log(`📡 调用Z-Pay API退款: 订单号=${orderNo}, 金额=${amount}`);
    
    const params = {
        pid: ZPAY_CONFIG.pid,
        out_trade_no: orderNo,
        refund_fee: amount
    };
    
    params.sign = generateMD5Sign(params, ZPAY_CONFIG.key);
    params.sign_type = 'MD5';
    
    try {
        const https = require('https');
        const querystring = require('querystring');
        
        return new Promise((resolve, reject) => {
            const postData = querystring.stringify(params);
            
            const options = {
                hostname: 'xorpay.com',
                port: 443,
                path: '/api/refund/v2/refund',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        console.log('Z-Pay响应:', result);
                        resolve(result);
                    } catch (e) {
                        reject(new Error('Z-Pay响应解析失败: ' + data));
                    }
                });
            });
            
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    } catch (error) {
        console.error('Z-Pay API调用失败:', error);
        throw error;
    }
}

// 处理单个退款记录
async function processPendingRefund(db, order, codes) {
    const startTime = Date.now();
    console.log(`\n🔄 处理退款: ${order.out_trade_no}`);
    
    try {
        // 更新状态为处理中
        await db.collection('orders')
            .where({ out_trade_no: order.out_trade_no })
            .update({
                refund_status: 'processing',
                refund_process_start: new Date()
            });
        
        // 调用Z-Pay API
        const zpayResult = await callZPayRefund(
            order.out_trade_no,
            order.refund_amount || order.money || '1.00',
            order.refund_reason || '用户申请退款'
        );
        
        if (zpayResult.status === 200) {
            // 退款成功
            console.log(`✅ 退款成功: ${order.out_trade_no}`);
            
            // 更新订单状态
            await db.collection('orders')
                .where({ out_trade_no: order.out_trade_no })
                .update({
                    refund_status: 'refunded',
                    refund_success_time: new Date(),
                    refund_transaction_id: zpayResult.refund_id,
                    zpay_monitor_pending: false,
                    zpay_response: zpayResult,
                    process_duration: Date.now() - startTime
                });
            
            // 更新所有相关访问码状态
            for (const code of codes) {
                await db.collection('codes')
                    .where({ access_code: code.access_code })
                    .update({
                        zpay_monitor_pending: false,
                        refund_completed_time: new Date(),
                        refund_transaction_id: zpayResult.refund_id
                    });
            }
            
            // 记录成功日志
            await db.collection('refund_logs').add({
                data: {
                    type: 'zpay_monitor_success',
                    order_no: order.out_trade_no,
                    access_codes: codes.map(c => c.access_code),
                    amount: order.refund_amount || order.money,
                    transaction_id: zpayResult.refund_id,
                    process_time: new Date(),
                    duration_ms: Date.now() - startTime,
                    zpay_response: zpayResult
                }
            });
            
            return {
                success: true,
                order_no: order.out_trade_no,
                transaction_id: zpayResult.refund_id
            };
            
        } else {
            // 退款失败
            console.error(`❌ 退款失败: ${order.out_trade_no}`, zpayResult);
            
            // 更新为失败状态
            await db.collection('orders')
                .where({ out_trade_no: order.out_trade_no })
                .update({
                    refund_status: 'failed',
                    refund_fail_time: new Date(),
                    refund_fail_reason: zpayResult.msg || '退款处理失败',
                    zpay_monitor_pending: false,
                    zpay_error_response: zpayResult,
                    retry_count: (order.retry_count || 0) + 1
                });
            
            // 记录失败日志
            await db.collection('refund_logs').add({
                data: {
                    type: 'zpay_monitor_failed',
                    order_no: order.out_trade_no,
                    access_codes: codes.map(c => c.access_code),
                    amount: order.refund_amount || order.money,
                    error: zpayResult.msg || '退款处理失败',
                    process_time: new Date(),
                    duration_ms: Date.now() - startTime,
                    zpay_response: zpayResult,
                    retry_count: (order.retry_count || 0) + 1
                }
            });
            
            return {
                success: false,
                order_no: order.out_trade_no,
                error: zpayResult.msg || '退款处理失败'
            };
        }
        
    } catch (error) {
        console.error(`💥 处理退款异常: ${order.out_trade_no}`, error);
        
        // 更新为错误状态
        await db.collection('orders')
            .where({ out_trade_no: order.out_trade_no })
            .update({
                refund_status: 'error',
                refund_error_time: new Date(),
                refund_error_message: error.message,
                zpay_monitor_pending: false,
                retry_count: (order.retry_count || 0) + 1
            });
        
        // 记录错误日志
        await db.collection('refund_logs').add({
            data: {
                type: 'zpay_monitor_error',
                order_no: order.out_trade_no,
                error: error.message,
                error_stack: error.stack,
                process_time: new Date(),
                duration_ms: Date.now() - startTime
            }
        });
        
        return {
            success: false,
            order_no: order.out_trade_no,
            error: error.message
        };
    }
}

exports.main = async (event, context) => {
    console.log('🚀 Z-Pay退款监控服务启动');
    console.log('⏰ 执行时间:', new Date().toISOString());
    
    const startTime = Date.now();
    const results = {
        success: [],
        failed: [],
        error: [],
        total: 0
    };
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        // 查找所有待处理的退款记录
        console.log('🔍 扫描待处理的退款标记...');
        
        const pendingOrders = await db.collection('orders')
            .where({
                zpay_monitor_pending: true,
                refund_status: 'pending'
            })
            .limit(50)  // 每次最多处理50个
            .get();
        
        results.total = pendingOrders.data.length;
        console.log(`📊 发现 ${results.total} 个待处理退款`);
        
        if (results.total === 0) {
            console.log('✨ 没有待处理的退款');
            return {
                success: true,
                message: '没有待处理的退款',
                timestamp: new Date(),
                results
            };
        }
        
        // 处理每个退款
        for (const order of pendingOrders.data) {
            // 查找相关访问码
            const codesQuery = await db.collection('codes')
                .where({ order_no: order.out_trade_no })
                .get();
            
            const result = await processPendingRefund(db, order, codesQuery.data);
            
            if (result.success) {
                results.success.push(result);
            } else if (result.error) {
                results.failed.push(result);
            }
            
            // 避免频繁调用API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 处理失败重试（最多重试3次的记录）
        console.log('\n🔄 检查需要重试的退款...');
        
        const retryOrders = await db.collection('orders')
            .where({
                refund_status: 'failed',
                retry_count: db.command.lt(3)
            })
            .limit(10)
            .get();
        
        if (retryOrders.data.length > 0) {
            console.log(`🔁 发现 ${retryOrders.data.length} 个需要重试的退款`);
            
            for (const order of retryOrders.data) {
                // 重置为pending状态以便重试
                await db.collection('orders')
                    .where({ out_trade_no: order.out_trade_no })
                    .update({
                        refund_status: 'pending',
                        zpay_monitor_pending: true,
                        retry_time: new Date()
                    });
            }
        }
        
        // 生成监控报告
        const duration = Date.now() - startTime;
        const report = {
            success: true,
            message: '监控任务完成',
            timestamp: new Date(),
            duration_ms: duration,
            results: {
                total_processed: results.total,
                success_count: results.success.length,
                failed_count: results.failed.length,
                error_count: results.error.length,
                success_orders: results.success.map(r => r.order_no),
                failed_orders: results.failed.map(r => ({
                    order_no: r.order_no,
                    error: r.error
                })),
                retry_scheduled: retryOrders.data.length
            }
        };
        
        console.log('\n📈 监控报告:', JSON.stringify(report, null, 2));
        
        // 记录监控日志
        await db.collection('refund_logs').add({
            data: {
                type: 'monitor_report',
                ...report
            }
        });
        
        return report;
        
    } catch (error) {
        console.error('💥 监控服务异常:', error);
        
        const errorReport = {
            success: false,
            error: '监控服务执行失败',
            message: error.message,
            timestamp: new Date(),
            duration_ms: Date.now() - startTime,
            results
        };
        
        // 尝试记录错误日志
        try {
            const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
            await app.database().collection('refund_logs').add({
                data: {
                    type: 'monitor_error',
                    ...errorReport,
                    error_stack: error.stack
                }
            });
        } catch (logError) {
            console.error('记录日志失败:', logError);
        }
        
        return errorReport;
    }
};