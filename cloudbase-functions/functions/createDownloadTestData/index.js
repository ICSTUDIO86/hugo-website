/**
 * 创建下载功能测试数据
 * 为测试下载功能创建有效的访问码和订单记录
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('📦 开始创建下载测试数据...');
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        // 创建多个测试访问码
        const testCodes = [
            'DOWNLOAD001',
            'DOWNLOAD002', 
            'DOWNLOAD003',
            'TEST001',
            'DEMO001'
        ];
        
        const results = [];
        
        for (const code of testCodes) {
            const testOrderNo = 'ORDER-DOWNLOAD-' + code + '-' + Date.now();
            
            console.log(`📝 创建测试订单: ${testOrderNo}`);
            console.log(`📝 创建测试访问码: ${code}`);
            
            try {
                // 1. 创建测试订单
                await db.collection('orders').add({
                    data: {
                        out_trade_no: testOrderNo,
                        zpay_order_id: testOrderNo,
                        name: 'IC Studio 视奏工具 - 下载测试',
                        money: '19.90',
                        type: 'alipay',
                        status: 'paid',  // 已支付状态
                        payment_method: 'test_download',
                        created_at: new Date(),
                        updated_time: new Date(),
                        refund_status: null  // 未退款
                    }
                });
                
                // 2. 创建对应的访问码记录
                await db.collection('codes').add({
                    data: {
                        code: code,  // 注意这里用的是 'code' 字段
                        access_code: code,
                        out_trade_no: testOrderNo,
                        device_id: 'test-device-download',
                        payment_method: 'test_download',
                        amount: '19.90',
                        features: ['sight-reading-tool', 'premium-download'],
                        status: 'active',
                        expires_at: null,
                        created_at: new Date(),
                        purchase_date: new Date(),
                        usage_count: 0,
                        last_used_at: null,
                        last_used_device: null,
                        product_name: 'IC Studio 视奏工具'
                    }
                });
                
                results.push({
                    access_code: code,
                    order_no: testOrderNo,
                    status: 'created'
                });
                
                console.log(`✅ 测试数据 ${code} 创建成功`);
                
            } catch (codeError) {
                console.warn(`⚠️ 访问码 ${code} 可能已存在，跳过创建`);
                results.push({
                    access_code: code,
                    status: 'already_exists'
                });
            }
        }
        
        // 返回创建结果
        const result = {
            success: true,
            message: '下载测试数据创建完成',
            data: {
                created_codes: results,
                test_instructions: {
                    step1: '使用以下任一访问码测试下载功能',
                    codes: testCodes,
                    test_url: 'https://icstudio.club/sight-reading-tool/',
                    api_test: `curl -X POST https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/downloadInstaller -H "Content-Type: application/json" -d '{"access_code": "DOWNLOAD001", "platform": "macos-arm64-zip"}'`
                }
            },
            timestamp: new Date()
        };
        
        console.log('🎉 下载测试数据创建完成');
        return result;
        
    } catch (error) {
        console.error('❌ 创建下载测试数据失败:', error);
        return {
            success: false,
            error: '创建下载测试数据失败',
            message: error.message,
            timestamp: new Date()
        };
    }
};