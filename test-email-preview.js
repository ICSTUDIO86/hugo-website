/**
 * IC Studio - 邮件预览测试脚本
 * 发送测试邮件到指定邮箱以预览邮件效果
 */

const https = require('https');

// 测试数据 - 发送到您自己的邮箱
const testEmailData = {
    type: 'sale',
    order_id: 'PREVIEW_TEST_' + Date.now(),
    buyer_email: 'icstudio@fastmail.com', // 改为您想要接收测试邮件的邮箱
    product_name: 'IC Studio 视奏工具',
    price: '6.90',
    currency: 'USD',
    product_id: 'ic-studio-sight-reading',
    timestamp: new Date().toISOString()
};

const WEBHOOK_URL = 'https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/gumroad-webhook';

/**
 * 发送测试邮件请求
 */
async function sendEmailPreviewTest() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(testEmailData);

        const options = {
            hostname: 'cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com',
            path: '/gumroad-webhook',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'X-Request-Source': 'Email-Preview-Test'
            }
        };

        console.log('\n📧 发送邮件预览测试...');
        console.log('📤 测试数据:', JSON.stringify(testEmailData, null, 2));
        console.log('📨 邮件将发送到:', testEmailData.buyer_email);

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log(`\n📥 响应状态码: ${res.statusCode}`);
                console.log('📥 响应数据:', responseData);

                try {
                    const result = JSON.parse(responseData);
                    if (result.success) {
                        console.log('\n✅ 邮件预览测试成功！');
                        console.log('🎫 生成的测试访问码:', result.data?.access_code);
                        console.log('📧 请检查您的邮箱:', testEmailData.buyer_email);
                        console.log('\n🔍 查看方式：');
                        console.log('1. 检查邮箱收件箱');
                        console.log('2. 检查垃圾邮件文件夹');
                        console.log('3. 在 Fastmail 已发送文件夹查看发送记录');
                    } else {
                        console.log('❌ 邮件预览测试失败:', result.error || result.message);
                    }
                    resolve(result);
                } catch (e) {
                    resolve({ statusCode: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 请求失败:', error);
            reject(error);
        });

        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('请求超时'));
        });

        req.write(postData);
        req.end();
    });
}

/**
 * 运行邮件预览测试
 */
async function runEmailPreviewTest() {
    console.log('🧪 开始邮件预览测试');
    console.log('🔗 Webhook URL:', WEBHOOK_URL);
    console.log('📧 目标邮箱:', testEmailData.buyer_email);
    console.log('\n⚠️  注意：请确保已在腾讯云配置 Fastmail 环境变量');

    try {
        await sendEmailPreviewTest();
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error);
    }

    console.log('\n📋 测试完成！');
    console.log('\n🔍 如何查看邮件效果：');
    console.log('1. 登录 Fastmail 网页版');
    console.log('2. 进入 "Sent" 已发送文件夹');
    console.log('3. 查找主题为 "🎉 您的 IC Studio 视奏工具访问码" 的邮件');
    console.log('4. 点击查看完整的邮件内容和样式');
}

// 运行测试
if (require.main === module) {
    runEmailPreviewTest();
}

module.exports = { runEmailPreviewTest, testEmailData };