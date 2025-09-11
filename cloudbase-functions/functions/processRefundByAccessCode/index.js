/**
 * 基于Z-Pay官方API的完整退款处理系统
 * 当访问码被输入到弹窗时，执行三个动作：
 * 1. Z-Pay自动退款（官方API）
 * 2. 在"codes"集合更新status为refunded
 * 3. 在"orders"集合添加退款信息
 */

const cloud = require('@cloudbase/node-sdk');
const crypto = require('crypto');

exports.main = async (event, context) => {
    console.log('🔄 开始处理访问码退款请求...');
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
        
        const { access_code } = requestData;
        
        if (!access_code) {
            return {
                success: false,
                error: '请提供访问码',
                usage: '{"access_code": "WTHVEWWR36BM"}'
            };
        }
        
        const accessCodeUpper = access_code.toUpperCase();
        console.log(`📝 处理访问码: ${accessCodeUpper}`);
        
        // Z-Pay配置
        const ZPAY_PID = process.env.ZPAY_PID || '2025090607243839';
        const ZPAY_KEY = process.env.ZPAY_KEY || 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN';
        
        console.log('🔧 Z-Pay配置加载完成');
        
        // 步骤1: 查找访问码对应的订单信息
        console.log('🔍 查找访问码对应的订单信息...');
        const codeQuery = await db.collection('codes')
            .where({ code: accessCodeUpper })
            .get();
        
        if (codeQuery.data.length === 0) {
            return {
                success: false,
                error: '访问码不存在或已被使用',
                access_code: accessCodeUpper
            };
        }
        
        const codeRecord = codeQuery.data[0];
        const orderNo = codeRecord.out_trade_no;
        
        console.log(`📦 找到对应订单: ${orderNo}`);
        console.log(`📋 当前状态: ${codeRecord.status}`);
        
        // 检查是否已经退款
        if (codeRecord.status === 'refunded') {
            return {
                success: false,
                error: '该访问码已经申请过退款',
                access_code: accessCodeUpper,
                order_no: orderNo,
                status: 'already_refunded'
            };
        }
        
        // 查询订单详情以获取退款金额
        console.log('💰 查询订单详情...');
        const orderQuery = await db.collection('orders')
            .where({ out_trade_no: orderNo })
            .get();
        
        if (orderQuery.data.length === 0) {
            return {
                success: false,
                error: '未找到对应的订单信息',
                access_code: accessCodeUpper,
                order_no: orderNo
            };
        }
        
        const orderRecord = orderQuery.data[0];
        const refundAmount = orderRecord.total_fee || orderRecord.amount || 0;
        
        // 检查7天退款期限
        const paymentTime = orderRecord.paid_at || orderRecord.payment_time;
        if (paymentTime) {
            const paymentDate = new Date(paymentTime);
            const currentDate = new Date();
            const daysDifference = Math.floor((currentDate - paymentDate) / (1000 * 60 * 60 * 24));
            
            console.log(`💰 支付时间: ${paymentTime}, 已过天数: ${daysDifference}`);
            
            if (daysDifference > 7) {
                return {
                    success: false,
                    error: '退款申请已超过7天期限，无法处理退款',
                    access_code: accessCodeUpper,
                    order_no: orderNo,
                    payment_time: paymentTime,
                    days_since_payment: daysDifference,
                    refund_deadline_exceeded: true
                };
            }
        }
        
        console.log(`💰 退款金额: ${refundAmount} 元`);
        
        // 步骤2: 调用Z-Pay官方退款API
        console.log('📡 调用Z-Pay官方退款API...');
        const zpayRefundResult = await callZPayRefundAPI(orderNo, refundAmount, ZPAY_PID, ZPAY_KEY);
        
        if (!zpayRefundResult.success) {
            return {
                success: false,
                error: 'Z-Pay退款失败',
                zpay_error: zpayRefundResult.error,
                access_code: accessCodeUpper,
                order_no: orderNo
            };
        }
        
        console.log('✅ Z-Pay退款成功');
        
        // 步骤3: 更新"codes"集合状态
        const refundTime = new Date();
        
        console.log('🔄 更新codes集合状态...');
        const codesUpdateResult = await db.collection('codes')
            .where({ code: accessCodeUpper })
            .update({
                status: 'refunded',
                refund_time: refundTime,
                refund_reason: '用户通过退款弹窗申请退款',
                updated_time: refundTime,
                zpay_refund_response: zpayRefundResult.response,
                refund_method: 'zpay_official_api'
            });
        
        console.log(`✅ codes集合更新: ${codesUpdateResult.updated} 条记录`);
        
        // 步骤4: 更新"orders"集合退款信息
        console.log('🔄 更新orders集合退款信息...');
        const ordersUpdateResult = await db.collection('orders')
            .doc(orderRecord._id)
            .update({
                refund_status: 'refunded',
                refund_time: refundTime,
                refund_amount: refundAmount,
                refund_method: 'zpay_official_api',
                refund_reason: '用户通过退款弹窗申请退款',
                refund_detail: {
                    refund_time: refundTime,
                    refund_amount: refundAmount,
                    zpay_response: zpayRefundResult.response,
                    processed_by: 'processRefundByAccessCode'
                },
                updated_time: refundTime
            });
        
        console.log('✅ orders集合退款信息已更新');
        
        // 记录退款日志
        try {
            await db.collection('refund_logs').add({
                data: {
                    operation_type: 'user_refund_request',
                    access_code: accessCodeUpper,
                    order_no: orderNo,
                    refund_amount: refundAmount,
                    zpay_response: zpayRefundResult.response,
                    codes_updated: codesUpdateResult.updated,
                    orders_updated: 1,
                    performed_by: 'user_via_refund_popup',
                    performed_at: refundTime,
                    request_id: context.requestId
                }
            });
            
            console.log('📝 退款日志已记录');
        } catch (logError) {
            console.warn('⚠️ 记录退款日志失败:', logError);
        }
        
        console.log('\n🎉 退款处理完成');
        console.log(`📊 处理结果: 访问码${accessCodeUpper}，订单${orderNo}，金额${refundAmount}元`);
        
        return {
            success: true,
            message: '退款申请处理成功',
            data: {
                access_code: accessCodeUpper,
                order_no: orderNo,
                refund_amount: refundAmount,
                refund_time: refundTime,
                zpay_response: zpayRefundResult.response
            },
            timestamp: refundTime
        };
        
    } catch (error) {
        console.error('❌ 退款处理失败:', error);
        return {
            success: false,
            error: '退款处理失败',
            message: error.message,
            timestamp: new Date()
        };
    }
};

/**
 * 调用Z-Pay官方退款API
 * 基于官方文档: https://zpayz.cn/api.php?act=refund
 */
async function callZPayRefundAPI(orderNo, refundAmount, pid, key) {
    console.log(`📡 调用Z-Pay官方退款API: 订单=${orderNo}, 金额=${refundAmount}`);
    
    try {
        const fetch = require('node-fetch');
        const { URLSearchParams } = require('url');
        
        // 构建退款参数（基于官方文档）
        const refundParams = new URLSearchParams({
            pid: pid,
            key: key,
            out_trade_no: orderNo,
            money: refundAmount.toString()
        });
        
        console.log('🔧 退款参数:', {
            pid: pid,
            out_trade_no: orderNo,
            money: refundAmount.toString()
        });
        
        // 调用官方退款API
        const response = await fetch('https://zpayz.cn/api.php?act=refund', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'ICStudio-RefundSystem/1.0'
            },
            body: refundParams
        });
        
        const responseText = await response.text();
        console.log(`📥 Z-Pay API响应:`, responseText);
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            // 如果不是JSON格式，视为文本响应
            responseData = { raw_response: responseText };
        }
        
        // 分析响应结果
        const isSuccess = analyzeRefundResponse(responseData, responseText);
        
        return {
            success: isSuccess,
            response: responseData,
            raw_response: responseText
        };
        
    } catch (error) {
        console.error(`❌ Z-Pay API调用失败:`, error);
        return {
            success: false,
            error: error.message,
            response: null
        };
    }
}

/**
 * 分析Z-Pay退款响应
 */
function analyzeRefundResponse(responseData, responseText) {
    // 检查成功标识
    if (responseData && responseData.code === 1) {
        console.log('✅ Z-Pay API返回成功标识');
        return true;
    }
    
    // 检查响应文本中的成功标识
    const successIndicators = [
        '退款成功',
        '成功',
        'success',
        'TRADE_SUCCESS'
    ];
    
    const text = responseText.toLowerCase();
    for (const indicator of successIndicators) {
        if (text.includes(indicator.toLowerCase())) {
            console.log(`✅ 检测到成功标识: ${indicator}`);
            return true;
        }
    }
    
    console.log('⚠️ 未检测到成功标识，可能退款失败');
    return false;
}