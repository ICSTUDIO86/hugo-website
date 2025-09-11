/**
 * IC Studio - 增强的访问码验证云函数
 * 确保同时检查 codes 和 orders 集合的状态，防止已退款访问码通过验证
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔍 增强验证请求:', JSON.stringify(event, null, 2));
    
    try {
        // 初始化云开发
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
                console.error('JSON 解析失败:', parseError);
                return {
                    success: false,
                    error: '请求格式错误',
                    code: 'INVALID_JSON_FORMAT'
                };
            }
        } else {
            requestData = event;
        }
        
        const { code, access_code } = requestData;
        const accessCode = (code || access_code || '').toUpperCase();
        
        if (!accessCode) {
            return {
                success: false,
                error: '请提供访问码',
                code: 'MISSING_ACCESS_CODE'
            };
        }
        
        console.log(`🔎 验证访问码: ${accessCode}`);
        
        // 第1步：查询 codes 集合
        console.log('📋 步骤1: 查询 codes 集合...');
        const { data: codes } = await db.collection('codes')
            .where({ code: accessCode })
            .limit(1)
            .get();
        
        if (codes.length === 0) {
            console.log('❌ 在 codes 集合中未找到访问码');
            return {
                success: false,
                error: '访问码无效或已过期',
                code: 'INVALID_ACCESS_CODE'
            };
        }
        
        const codeRecord = codes[0];
        console.log('✅ 在 codes 集合中找到访问码:', {
            code: codeRecord.code,
            status: codeRecord.status,
            out_trade_no: codeRecord.out_trade_no
        });
        
        // 检查 codes 集合中的状态
        if (codeRecord.status !== 'active') {
            console.log(`❌ codes 集合中访问码状态无效: ${codeRecord.status}`);
            return {
                success: false,
                error: '访问码无效或已过期',
                code: 'CODE_STATUS_INVALID',
                details: {
                    codes_status: codeRecord.status,
                    reason: 'codes集合中状态非active'
                }
            };
        }
        
        // 第2步：查询对应的订单
        console.log('📋 步骤2: 查询对应订单...');
        const { data: orders } = await db.collection('orders')
            .where({ out_trade_no: codeRecord.out_trade_no })
            .limit(1)
            .get();
        
        if (orders.length === 0) {
            console.log('❌ 未找到对应的订单记录');
            return {
                success: false,
                error: '订单记录不存在',
                code: 'ORDER_NOT_FOUND'
            };
        }
        
        const order = orders[0];
        console.log('✅ 找到对应订单:', {
            out_trade_no: order.out_trade_no,
            status: order.status,
            refund_status: order.refund_status
        });
        
        // 第3步：关键检查 - 订单退款状态
        if (order.refund_status === 'refunded') {
            console.log('❌ 订单已退款，访问码应失效');
            
            // 自动同步 codes 集合状态
            console.log('🔄 自动同步: 更新 codes 集合状态为 refunded');
            await db.collection('codes')
                .where({ code: accessCode })
                .update({
                    status: 'refunded',
                    refund_time: order.refund_time || new Date(),
                    auto_sync_time: new Date(),
                    sync_reason: 'auto_sync_refund_status'
                });
            
            return {
                success: false,
                error: '访问码无效或已过期',
                code: 'ACCESS_CODE_REFUNDED',
                details: {
                    codes_status: codeRecord.status,
                    order_refund_status: order.refund_status,
                    reason: '订单已退款，访问码自动失效',
                    auto_synced: true,
                    refund_time: order.refund_time
                }
            };
        }
        
        // 第4步：检查订单支付状态
        if (order.status !== 'paid') {
            console.log(`❌ 订单状态无效: ${order.status}`);
            return {
                success: false,
                error: '订单状态无效',
                code: 'INVALID_ORDER_STATUS',
                details: {
                    order_status: order.status,
                    required: 'paid'
                }
            };
        }
        
        // 第5步：验证通过
        console.log('✅ 访问码验证通过');
        
        return {
            success: true,
            data: {
                access_code: accessCode,
                order_info: {
                    out_trade_no: order.out_trade_no,
                    status: order.status,
                    refund_status: order.refund_status || 'none',
                    amount: order.money || order.real_price,
                    created_at: order.endtime || order.created_at
                },
                code_info: {
                    status: codeRecord.status,
                    created_at: codeRecord.createdAt || codeRecord.created_at
                },
                verification_time: new Date(),
                enhanced_check: true
            },
            message: '访问码验证成功',
            code: 'VERIFICATION_SUCCESS'
        };
        
    } catch (error) {
        console.error('❌ 验证失败:', error);
        return {
            success: false,
            error: '系统错误',
            code: 'INTERNAL_ERROR',
            details: error.message
        };
    }
};