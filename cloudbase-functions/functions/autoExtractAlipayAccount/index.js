/**
 * IC Studio - 自动提取支付宝账号
 * 从支付回调数据中尝试提取支付宝账号信息
 */

const cloud = require('@cloudbase/node-sdk');
const crypto = require('crypto');

exports.main = async (event, context) => {
    console.log('🔍 自动提取支付宝账号启动');
    console.log('📨 接收参数:', JSON.stringify(event, null, 2));
    
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
            } catch (e) {
                requestData = event;
            }
        } else {
            requestData = event;
        }
        
        const { 
            order_no,
            access_code,
            zpay_trade_no,
            callback_data 
        } = requestData;
        
        if (!order_no && !access_code) {
            return {
                success: false,
                error: '请提供订单号或访问码'
            };
        }
        
        console.log('🎯 开始分析支付数据...');
        
        // 1. 查找订单记录
        let orderRecord = null;
        if (order_no) {
            const orderQuery = await db.collection('orders')
                .where({ out_trade_no: order_no })
                .get();
            orderRecord = orderQuery.data[0];
        } else if (access_code) {
            const orderQuery = await db.collection('orders')
                .where({ access_code: access_code.toUpperCase() })
                .get();
            orderRecord = orderQuery.data[0];
        }
        
        if (!orderRecord) {
            return {
                success: false,
                error: '未找到订单记录'
            };
        }
        
        console.log('📦 找到订单记录:', orderRecord.out_trade_no);
        
        // 2. 分析回调数据
        let callbackInfo = {};
        try {
            if (orderRecord.callback_data) {
                callbackInfo = typeof orderRecord.callback_data === 'string' 
                    ? JSON.parse(orderRecord.callback_data) 
                    : orderRecord.callback_data;
            }
        } catch (e) {
            console.log('⚠️ 回调数据解析失败');
        }
        
        console.log('📋 回调数据分析:', Object.keys(callbackInfo));
        
        // 3. 尝试多种方式提取支付宝账号
        let extractedAccount = null;
        let extractionMethod = null;
        
        // 方法1: 从交易号推断支付宝账号模式
        if (callbackInfo.trade_no || orderRecord.zpay_trade_no) {
            const tradeNo = callbackInfo.trade_no || orderRecord.zpay_trade_no;
            console.log('🔍 分析交易号:', tradeNo);
            
            // 支付宝交易号通常包含时间戳等信息，但不包含账号
            // 这里我们记录交易号，以备将来扩展
        }
        
        // 方法2: 从支付URL中提取（如果支付宝返回了用户信息）
        if (orderRecord.callback_data) {
            // Z-Pay的回调通常不包含买家账号，但我们可以尝试解析
            console.log('📋 检查回调数据中的可能账号信息...');
        }
        
        // 方法3: 使用支付时间和金额创建虚拟标识
        const paymentTime = orderRecord.paid_at || orderRecord.created_at;
        const amount = orderRecord.money;
        const virtualId = crypto.createHash('md5')
            .update(`${orderRecord.out_trade_no}_${paymentTime}_${amount}`)
            .digest('hex')
            .substring(0, 8);
        
        // 由于标准Z-Pay回调不包含支付宝账号，我们采用以下策略：
        // 1. 记录支付特征信息，等待用户主动关联
        // 2. 在FAQ页面提供"找回访问码"功能，让用户输入支付宝账号关联
        
        const analysisResult = {
            order_no: orderRecord.out_trade_no,
            access_code: orderRecord.access_code,
            zpay_trade_no: callbackInfo.trade_no || orderRecord.zpay_trade_no,
            payment_time: paymentTime,
            amount: amount,
            virtual_payment_id: virtualId,
            extraction_attempted: true,
            extraction_time: new Date(),
            available_fields: Object.keys(callbackInfo),
            status: 'analysis_completed'
        };
        
        // 记录分析结果到数据库，以备用户关联时使用
        try {
            await db.collection('payment_analysis').add({
                data: analysisResult
            });
            console.log('✅ 支付分析结果已记录');
        } catch (error) {
            console.log('⚠️ 分析结果记录失败:', error.message);
        }
        
        console.log('🎉 支付宝账号提取分析完成');
        
        return {
            success: true,
            message: '支付数据分析完成',
            analysis: {
                order_no: orderRecord.out_trade_no,
                access_code: orderRecord.access_code,
                virtual_payment_id: virtualId,
                has_callback_data: !!orderRecord.callback_data,
                available_fields: Object.keys(callbackInfo),
                extraction_method: 'analysis_only',
                recommendation: '建议通过FAQ页面的找回功能让用户主动关联支付宝账号'
            }
        };
        
    } catch (error) {
        console.error('❌ 自动提取失败:', error);
        return {
            success: false,
            error: '自动提取失败: ' + error.message
        };
    }
};