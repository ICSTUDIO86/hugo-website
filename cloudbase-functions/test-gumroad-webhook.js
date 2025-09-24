/**
 * IC Studio - Gumroad Webhook 测试脚本
 * 用于测试Webhook处理功能
 */

const https = require('https');

// Webhook URL
const WEBHOOK_URL = 'https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/gumroad-webhook';

// 测试销售事件
const testSaleData = {
    type: 'sale',
    order_id: 'TEST_' + Date.now(),
    buyer_email: 'test@example.com',
    product_name: 'IC Studio 视奏工具',
    price: '48.00',
    currency: 'USD',
    product_id: 'ic-studio-sight-reading',
    timestamp: new Date().toISOString()
};

// 测试退款事件
const testRefundData = {
    type: 'refund',
    order_id: 'TEST_' + Date.now(),
    buyer_email: 'test@example.com',
    refunded_amount: '48.00',
    timestamp: new Date().toISOString()
};

/**
 * 发送测试请求
 */
async function sendTestRequest(data, testName) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);

        const options = {
            hostname: 'cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com',
            path: '/gumroad-webhook',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'X-Request-Source': 'IC-Studio-Test'
            }
        };

        console.log(`\n🧪 开始测试: ${testName}`);
        console.log('📤 发送数据:', JSON.stringify(data, null, 2));

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log(`📥 响应状态码: ${res.statusCode}`);
                console.log('📥 响应数据:', responseData);

                try {
                    const result = JSON.parse(responseData);
                    resolve({ statusCode: res.statusCode, data: result });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 请求失败:', error);
            reject(error);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('请求超时'));
        });

        req.write(postData);
        req.end();
    });
}

/**
 * 运行测试
 */
async function runTests() {
    console.log('🚀 开始测试 Gumroad Webhook 处理器');
    console.log('🔗 Webhook URL:', WEBHOOK_URL);

    try {
        // 测试1: 销售事件
        const saleResult = await sendTestRequest(testSaleData, '销售事件处理');

        if (saleResult.statusCode === 200 && saleResult.data.success) {
            console.log('✅ 销售事件测试通过');
            console.log('🎫 生成的访问码:', saleResult.data.data?.access_code);
        } else {
            console.log('❌ 销售事件测试失败');
        }

        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒

        // 测试2: 退款事件 (使用相同的订单ID)
        testRefundData.order_id = testSaleData.order_id;
        const refundResult = await sendTestRequest(testRefundData, '退款事件处理');

        if (refundResult.statusCode === 200 && refundResult.data.success) {
            console.log('✅ 退款事件测试通过');
            console.log('🔒 失效的访问码:', refundResult.data.data?.access_code);
        } else {
            console.log('❌ 退款事件测试失败');
        }

    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error);
    }

    console.log('\n🎯 测试完成！');
    console.log('\n📋 下一步配置说明:');
    console.log('1. 在Gumroad后台配置Webhook URL:');
    console.log('   ' + WEBHOOK_URL);
    console.log('2. 选择事件类型: sale, refund, dispute');
    console.log('3. 保存配置后，真实购买将自动处理');
}

// 运行测试
if (require.main === module) {
    runTests();
}

module.exports = { sendTestRequest, testSaleData, testRefundData };