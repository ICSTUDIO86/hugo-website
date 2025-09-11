/**
 * IC Studio - 全自动退款系统主控接口
 * 整合所有退款功能，提供统一的API接口
 */

const cloud = require('@cloudbase/node-sdk');
const crypto = require('crypto');
const https = require('https');

exports.main = async (event, context) => {
    console.log('🤖 自动退款系统启动:', JSON.stringify(event, null, 2));
    
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
                return {
                    success: false,
                    error: '请求格式错误',
                    code: 'INVALID_JSON_FORMAT'
                };
            }
        } else {
            requestData = event;
        }
        
        const { action, ...params } = requestData;
        
        switch (action) {
            case 'refund':
                return await processRefund(db, params, context);
            case 'batch_refund':
                return await processBatchRefund(db, params, context);
            case 'check_status':
                return await checkRefundStatus(db, params);
            case 'retry_failed':
                return await retryFailedRefunds(db, params);
            case 'stats':
                return await getRefundStats(db, params);
            default:
                return {
                    success: false,
                    error: '未知操作类型',
                    code: 'UNKNOWN_ACTION',
                    available_actions: ['refund', 'batch_refund', 'check_status', 'retry_failed', 'stats']
                };
        }
        
    } catch (error) {
        console.error('❌ 自动退款系统错误:', error);
        return {
            success: false,
            error: '系统错误',
            code: 'SYSTEM_ERROR',
            details: error.message
        };
    }
};

// 单个退款处理
async function processRefund(db, params, context) {
    const { access_code, order_no, reason, notify_user = true, auto_retry = true } = params;
    
    console.log('🔄 开始处理单个退款申请');
    
    if (!access_code && !order_no) {
        return {
            success: false,
            error: '请提供访问码或订单号',
            code: 'MISSING_PARAMETERS'
        };
    }
    
    try {
        // 1. 查找订单和访问码信息
        let order, codes = [];
        
        if (access_code) {
            const codeQuery = await db.collection('codes')
                .where({ code: access_code.toUpperCase() })
                .get();
            
            if (codeQuery.data.length === 0) {
                return {
                    success: false,
                    error: '访问码不存在',
                    code: 'ACCESS_CODE_NOT_FOUND'
                };
            }
            
            codes = codeQuery.data;
            const orderQuery = await db.collection('orders')
                .where({ out_trade_no: codes[0].out_trade_no })
                .get();
            
            if (orderQuery.data.length === 0) {
                return {
                    success: false,
                    error: '订单不存在',
                    code: 'ORDER_NOT_FOUND'
                };
            }
            
            order = orderQuery.data[0];
        } else {
            const orderQuery = await db.collection('orders')
                .where({ out_trade_no: order_no })
                .get();
            
            if (orderQuery.data.length === 0) {
                return {
                    success: false,
                    error: '订单不存在',
                    code: 'ORDER_NOT_FOUND'
                };
            }
            
            order = orderQuery.data[0];
            const codeQuery = await db.collection('codes')
                .where({ out_trade_no: order_no })
                .get();
            codes = codeQuery.data;
        }
        
        // 2. 检查订单状态
        if (order.refund_status === 'refunded') {
            return {
                success: false,
                error: '订单已退款',
                code: 'ALREADY_REFUNDED'
            };
        }
        
        if (order.status !== 'paid') {
            return {
                success: false,
                error: '订单状态不允许退款',
                code: 'INVALID_ORDER_STATUS'
            };
        }
        
        // 3. 记录退款请求
        const refundRequest = {
            request_id: generateRequestId(),
            order_no: order.out_trade_no,
            access_codes: codes.map(c => c.code),
            amount: order.money || '1.00',
            reason: reason || '用户申请退款',
            status: 'processing',
            created_at: new Date(),
            retry_count: 0,
            auto_retry: auto_retry,
            notify_user: notify_user,
            context: {
                request_ip: context.requestId,
                user_agent: 'AutoRefundSystem'
            }
        };
        
        await db.collection('refund_requests').add({ data: refundRequest });
        
        // 4. 执行Z-Pay退款
        const zpayResult = await callZPayRefund(order.out_trade_no, order.money || '1.00');
        
        if (zpayResult.code === 1) {
            // 退款成功
            console.log('✅ Z-Pay退款成功');
            
            // 更新订单状态
            await db.collection('orders')
                .where({ out_trade_no: order.out_trade_no })
                .update({
                    refund_status: 'refunded',
                    refund_time: new Date(),
                    refund_amount: order.money || '1.00',
                    refund_method: 'auto_zpay_api',
                    refund_reason: reason || '用户申请退款',
                    zpay_refund_response: zpayResult
                });
            
            // 更新访问码状态
            for (const code of codes) {
                await db.collection('codes')
                    .where({ code: code.code })
                    .update({
                        status: 'refunded',
                        refund_time: new Date(),
                        refund_reason: reason || '用户申请退款'
                    });
            }
            
            // 更新退款请求状态
            await db.collection('refund_requests')
                .where({ request_id: refundRequest.request_id })
                .update({
                    status: 'completed',
                    completed_at: new Date(),
                    zpay_response: zpayResult
                });
            
            // 发送通知
            if (notify_user) {
                await sendRefundNotification(order, codes, 'success');
            }
            
            return {
                success: true,
                message: '退款处理成功',
                data: {
                    request_id: refundRequest.request_id,
                    order_no: order.out_trade_no,
                    access_codes: codes.map(c => c.code),
                    refund_amount: order.money || '1.00',
                    refund_time: new Date(),
                    zpay_status: zpayResult
                }
            };
            
        } else {
            // Z-Pay退款失败
            console.log('❌ Z-Pay退款失败:', zpayResult);
            
            // 更新退款请求状态
            await db.collection('refund_requests')
                .where({ request_id: refundRequest.request_id })
                .update({
                    status: 'failed',
                    failed_at: new Date(),
                    error_message: zpayResult.msg || '退款失败',
                    zpay_response: zpayResult
                });
            
            // 如果启用自动重试
            if (auto_retry) {
                console.log('🔄 启动自动重试机制');
                // 可以在这里实现延时重试逻辑
            }
            
            return {
                success: false,
                error: 'Z-Pay退款失败',
                code: 'ZPAY_REFUND_FAILED',
                details: zpayResult.msg || '未知错误',
                request_id: refundRequest.request_id,
                can_retry: true
            };
        }
        
    } catch (error) {
        console.error('❌ 退款处理失败:', error);
        return {
            success: false,
            error: '退款处理失败',
            code: 'REFUND_PROCESSING_ERROR',
            details: error.message
        };
    }
}

// 批量退款处理
async function processBatchRefund(db, params) {
    const { refund_list, reason, admin_key } = params;
    
    // 验证管理员权限
    if (!admin_key || admin_key !== process.env.ADMIN_REFUND_KEY) {
        return {
            success: false,
            error: '权限不足',
            code: 'INSUFFICIENT_PERMISSION'
        };
    }
    
    if (!refund_list || !Array.isArray(refund_list)) {
        return {
            success: false,
            error: '退款列表格式错误',
            code: 'INVALID_REFUND_LIST'
        };
    }
    
    console.log(`🔄 开始批量退款，共 ${refund_list.length} 个订单`);
    
    const results = [];
    
    for (const item of refund_list) {
        try {
            const result = await processRefund(db, {
                ...item,
                reason: reason || '管理员批量退款',
                notify_user: item.notify_user !== false,
                auto_retry: false
            });
            
            results.push({
                identifier: item.access_code || item.order_no,
                success: result.success,
                message: result.message || result.error,
                data: result.data
            });
            
            // 避免过快请求
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            results.push({
                identifier: item.access_code || item.order_no,
                success: false,
                message: '处理失败: ' + error.message
            });
        }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    return {
        success: true,
        message: `批量退款完成：成功 ${successCount}，失败 ${failCount}`,
        data: {
            total: results.length,
            success_count: successCount,
            fail_count: failCount,
            details: results
        }
    };
}

// 检查退款状态
async function checkRefundStatus(db, params) {
    const { request_id, order_no, access_code } = params;
    
    let query;
    if (request_id) {
        query = { request_id };
    } else if (order_no) {
        query = { order_no };
    } else if (access_code) {
        query = { access_codes: access_code.toUpperCase() };
    } else {
        return {
            success: false,
            error: '请提供查询条件',
            code: 'MISSING_QUERY_PARAMS'
        };
    }
    
    const { data: requests } = await db.collection('refund_requests')
        .where(query)
        .orderBy('created_at', 'desc')
        .limit(10)
        .get();
    
    return {
        success: true,
        data: {
            refund_requests: requests,
            count: requests.length
        }
    };
}

// 重试失败的退款
async function retryFailedRefunds(db, params) {
    const { request_ids, admin_key } = params;
    
    // 验证管理员权限
    if (!admin_key || admin_key !== process.env.ADMIN_REFUND_KEY) {
        return {
            success: false,
            error: '权限不足',
            code: 'INSUFFICIENT_PERMISSION'
        };
    }
    
    const { data: failedRequests } = await db.collection('refund_requests')
        .where({
            status: 'failed',
            ...(request_ids ? { request_id: db.command.in(request_ids) } : {})
        })
        .get();
    
    console.log(`🔄 重试 ${failedRequests.length} 个失败的退款请求`);
    
    const results = [];
    
    for (const request of failedRequests) {
        try {
            const result = await processRefund(db, {
                order_no: request.order_no,
                reason: '自动重试: ' + request.reason,
                notify_user: request.notify_user,
                auto_retry: false
            });
            
            results.push({
                request_id: request.request_id,
                order_no: request.order_no,
                success: result.success,
                message: result.message || result.error
            });
            
        } catch (error) {
            results.push({
                request_id: request.request_id,
                order_no: request.order_no,
                success: false,
                message: '重试失败: ' + error.message
            });
        }
    }
    
    return {
        success: true,
        message: `重试完成`,
        data: {
            retry_count: results.length,
            results: results
        }
    };
}

// 获取退款统计
async function getRefundStats(db, params) {
    const { start_date, end_date } = params;
    
    let dateFilter = {};
    if (start_date && end_date) {
        dateFilter = {
            created_at: db.command.gte(new Date(start_date))
                       .and(db.command.lte(new Date(end_date)))
        };
    }
    
    const [
        totalRequests,
        completedRequests,
        failedRequests,
        processingRequests
    ] = await Promise.all([
        db.collection('refund_requests').where(dateFilter).count(),
        db.collection('refund_requests').where({...dateFilter, status: 'completed'}).count(),
        db.collection('refund_requests').where({...dateFilter, status: 'failed'}).count(),
        db.collection('refund_requests').where({...dateFilter, status: 'processing'}).count()
    ]);
    
    return {
        success: true,
        data: {
            period: { start_date, end_date },
            stats: {
                total_requests: totalRequests.total,
                completed: completedRequests.total,
                failed: failedRequests.total,
                processing: processingRequests.total,
                success_rate: totalRequests.total > 0 ? 
                    ((completedRequests.total / totalRequests.total) * 100).toFixed(2) + '%' : '0%'
            }
        }
    };
}

// Z-Pay退款API调用
async function callZPayRefund(orderNo, amount) {
    const key = process.env.ZPAY_KEY;
    const pid = process.env.ZPAY_PID;
    
    if (!key || !pid) {
        throw new Error('Z-Pay配置缺失');
    }
    
    const refundParams = {
        pid: pid,
        key: key,
        out_trade_no: orderNo,
        money: amount
    };
    
    return new Promise((resolve, reject) => {
        const formData = new (require('url').URLSearchParams)();
        Object.keys(refundParams).forEach(key => {
            formData.append(key, refundParams[key]);
        });
        
        const postData = formData.toString();
        
        const options = {
            hostname: 'zpayz.cn',
            path: '/api.php?act=refund',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'IC-Studio-AutoRefund/2.0'
            },
            timeout: 30000
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (parseError) {
                    reject(new Error('Z-Pay响应格式错误: ' + data));
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('请求超时')));
        req.write(postData);
        req.end();
    });
}

// 发送退款通知
async function sendRefundNotification(order, codes, status) {
    // 这里可以集成邮件/短信服务
    console.log(`📧 发送退款通知: 订单 ${order.out_trade_no}, 状态: ${status}`);
    // TODO: 实现实际的通知发送逻辑
}

// 生成请求ID
function generateRequestId() {
    return 'REF_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
}