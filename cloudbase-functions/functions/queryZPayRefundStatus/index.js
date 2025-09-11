/**
 * 查询Z-Pay平台真实退款状态
 * 用于确认哪些订单在Z-Pay中确实已退款
 */

const cloud = require('@cloudbase/node-sdk');
const crypto = require('crypto');

exports.main = async (event, context) => {
    console.log('🔍 开始查询Z-Pay真实退款状态...');
    console.log('📋 请求参数:', JSON.stringify(event, null, 2));
    
    try {
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
        
        const { order_numbers, access_codes } = requestData;
        
        // Z-Pay配置
        const ZPAY_PID = process.env.ZPAY_PID || '2025090607243839';
        const ZPAY_KEY = process.env.ZPAY_KEY || 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN';
        
        console.log('🔧 Z-Pay环境变量检查完成');
        
        let targetOrders = [];
        
        if (order_numbers && Array.isArray(order_numbers)) {
            targetOrders = order_numbers;
        } else if (access_codes && Array.isArray(access_codes)) {
            // 通过访问码查找对应的订单号
            const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
            const db = app.database();
            
            console.log('📋 通过访问码查找订单号...');
            const codesQuery = await db.collection('codes')
                .where({
                    code: db.command.in(access_codes.map(code => code.toUpperCase()))
                })
                .get();
            
            targetOrders = codesQuery.data.map(record => record.out_trade_no);
            console.log(`📊 找到 ${targetOrders.length} 个对应订单号`);
            
        } else {
            return {
                success: false,
                error: '请提供订单号列表或访问码列表',
                usage: {
                    by_orders: '{"order_numbers": ["IC175741234567", "IC175741234568"]}',
                    by_codes: '{"access_codes": ["WTHVEWWR36BM", "BCSS44XZAQ5C"]}'
                }
            };
        }
        
        if (targetOrders.length === 0) {
            return {
                success: true,
                message: '没有找到需要查询的订单',
                results: []
            };
        }
        
        console.log(`🔍 准备查询 ${targetOrders.length} 个订单的Z-Pay状态`);
        
        const results = [];
        
        // 逐个查询订单状态（避免API频率限制）
        for (const orderNo of targetOrders) {
            console.log(`\n📡 查询订单: ${orderNo}`);
            
            try {
                const zpayResult = await queryZPayOrderStatus(orderNo, ZPAY_PID, ZPAY_KEY);
                
                results.push({
                    order_no: orderNo,
                    zpay_status: zpayResult.status,
                    is_refunded: zpayResult.is_refunded,
                    refund_info: zpayResult.refund_info,
                    raw_response: zpayResult.raw_response
                });
                
                console.log(`✅ 订单 ${orderNo} 查询完成: ${zpayResult.is_refunded ? '已退款' : '未退款'}`);
                
                // API调用间隔，避免频率限制
                if (targetOrders.indexOf(orderNo) < targetOrders.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (error) {
                console.error(`❌ 查询订单 ${orderNo} 失败:`, error);
                results.push({
                    order_no: orderNo,
                    zpay_status: 'error',
                    is_refunded: false,
                    error: error.message
                });
            }
        }
        
        // 统计结果
        const summary = {
            total_queried: results.length,
            refunded_count: results.filter(r => r.is_refunded).length,
            active_count: results.filter(r => !r.is_refunded && r.zpay_status !== 'error').length,
            error_count: results.filter(r => r.zpay_status === 'error').length
        };
        
        console.log('\n📊 查询统计:');
        console.log(`- 总查询数: ${summary.total_queried}`);
        console.log(`- 已退款: ${summary.refunded_count}`);
        console.log(`- 未退款: ${summary.active_count}`);
        console.log(`- 查询错误: ${summary.error_count}`);
        
        return {
            success: true,
            message: 'Z-Pay状态查询完成',
            summary,
            results,
            timestamp: new Date()
        };
        
    } catch (error) {
        console.error('❌ 查询Z-Pay状态失败:', error);
        return {
            success: false,
            error: '查询失败',
            message: error.message,
            timestamp: new Date()
        };
    }
};

/**
 * 查询单个订单的Z-Pay状态
 */
async function queryZPayOrderStatus(orderNo, pid, key) {
    console.log(`📡 调用Z-Pay查询API: ${orderNo}`);
    
    try {
        // 构建查询参数
        const params = {
            pid: pid,
            out_trade_no: orderNo
        };
        
        console.log(`🔧 查询参数:`, params);
        
        // 生成签名（与zpayRefundMonitor一致）
        const sortedKeys = Object.keys(params).sort();
        let signStr = '';
        
        for (const k of sortedKeys) {
            if (k !== 'sign' && k !== 'sign_type' && params[k] !== '') {
                signStr += k + '=' + params[k] + '&';
            }
        }
        
        signStr = signStr.slice(0, -1) + key;
        const sign = crypto.createHash('md5').update(signStr).digest('hex');
        
        console.log(`🔐 查询字符串: ${signStr.slice(0, -key.length)}`);
        console.log(`🔐 签名字符串: ${signStr}`);
        console.log(`🔐 生成签名: ${sign}`);
        
        // 调用Z-Pay查询API
        const fetch = require('node-fetch');
        const response = await fetch('https://z-pay.cn/api.php?act=query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'ICStudio-RefundSync/1.0'
            },
            body: new URLSearchParams({
                ...params,
                sign: sign
            })
        });
        
        const responseText = await response.text();
        console.log(`📥 Z-Pay响应长度: ${responseText.length}`);
        console.log(`📥 Z-Pay响应状态: ${response.status} ${response.statusText}`);
        console.log(`📥 Z-Pay响应头:`, JSON.stringify([...response.headers.entries()]));
        console.log(`📥 Z-Pay完整响应 (${orderNo}):`, responseText);
        
        if (!responseText || responseText.trim() === '') {
            console.warn(`⚠️ Z-Pay返回空响应，订单: ${orderNo}`);
            return {
                status: 'error',
                is_refunded: false,
                refund_info: {},
                raw_response: { error: 'Empty response from Z-Pay' }
            };
        }
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            // 如果不是JSON，可能是其他格式
            console.log(`📝 非JSON响应，解析为文本: ${parseError.message}`);
            responseData = { raw: responseText };
        }
        
        // 分析响应判断是否已退款
        const isRefunded = analyzeZPayRefundStatus(responseData, responseText);
        
        return {
            status: response.ok ? 'success' : 'error',
            is_refunded: isRefunded,
            refund_info: extractRefundInfo(responseData, responseText),
            raw_response: responseData
        };
        
    } catch (error) {
        console.error(`❌ Z-Pay API调用失败 (${orderNo}):`, error);
        throw new Error(`Z-Pay查询失败: ${error.message}`);
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
 * 提取退款信息
 */
function extractRefundInfo(responseData, responseText) {
    const refundInfo = {};
    
    if (responseData.refund_time) {
        refundInfo.refund_time = responseData.refund_time;
    }
    
    if (responseData.refund_amount) {
        refundInfo.refund_amount = responseData.refund_amount;
    }
    
    if (responseData.refund_reason) {
        refundInfo.refund_reason = responseData.refund_reason;
    }
    
    return refundInfo;
}