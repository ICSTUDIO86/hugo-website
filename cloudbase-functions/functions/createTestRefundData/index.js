/**
 * 创建退款流程测试数据
 * 确保 orders 集合和 codes 集合中有匹配的记录
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔧 开始创建测试数据...');
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        const testOrderNo = 'TEST-REFUND-' + Date.now();
        const testAccessCode = 'REFUND' + Math.random().toString(36).substr(2, 8).toUpperCase();
        
        console.log(`📝 创建测试订单: ${testOrderNo}`);
        console.log(`📝 创建测试访问码: ${testAccessCode}`);
        
        // 1. 创建测试订单
        const orderResult = await db.collection('orders').add({
            data: {
                out_trade_no: testOrderNo,
                zpay_order_id: testOrderNo,
                name: 'IC Studio 测试授权 - 退款流程',
                money: '0.01',  // 最小金额用于测试
                type: 'alipay',
                status: 'paid',  // 必须是已支付状态才能退款
                payment_method: 'test_api',
                created_at: new Date(),
                updated_time: new Date()
            }
        });
        
        console.log('✅ 测试订单创建成功');
        
        // 2. 创建对应的访问码记录
        const accessCodeResult = await db.collection('codes').add({
            data: {
                access_code: testAccessCode,
                order_no: testOrderNo,  // 匹配订单号
                device_id: 'test-device-refund',
                payment_method: 'test',
                amount: '0.01',
                features: ['sight-reading-tool'],
                status: 'active',  // 活跃状态
                expires_at: null,
                created_at: new Date(),
                purchase_date: new Date(),
                usage_count: 0,
                last_used_at: null,
                last_used_device: null
            }
        });
        
        console.log('✅ 测试访问码创建成功');
        
        // 3. 返回测试数据信息
        const result = {
            success: true,
            message: '测试数据创建成功',
            data: {
                order_no: testOrderNo,
                access_code: testAccessCode,
                test_instructions: {
                    step1: `使用访问码 ${testAccessCode} 调用 markRefund 函数`,
                    step2: '等待 zpayRefundMonitor 检测并处理',
                    step3: '检查退款日志记录',
                    curl_example: `curl -X POST https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/markRefund -H "Content-Type: application/json" -d '{"access_code": "${testAccessCode}", "reason": "测试退款流程"}'`
                }
            },
            timestamp: new Date()
        };
        
        console.log('🎉 测试数据创建完成:', JSON.stringify(result, null, 2));
        return result;
        
    } catch (error) {
        console.error('❌ 创建测试数据失败:', error);
        return {
            success: false,
            error: '创建测试数据失败',
            message: error.message,
            timestamp: new Date()
        };
    }
};