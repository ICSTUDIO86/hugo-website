/**
 * IC Studio - Z-Pay API 调试功能
 * 深入分析为什么自动退款失败
 */

const cloud = require('@cloudbase/node-sdk');

// Z-Pay 配置
const ZPAY_CONFIG = {
    pid: '2025090607243839',
    key: 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN',
    api_url: 'https://zpayz.cn/api.php?act=refund'
};

/**
 * 测试Z-Pay API调用的详细函数
 */
function testZPayCall(params, testName) {
    return new Promise((resolve) => {
        const formData = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');
        
        console.log(`🔍 ${testName} 测试参数:`, formData);
        
        const https = require('https');
        
        const options = {
            hostname: 'zpayz.cn',
            path: '/api.php?act=refund',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(formData),
                'User-Agent': 'IC-Studio-Debug/1.0'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📥 ${testName} Z-Pay响应:`, data);
                try {
                    const result = JSON.parse(data);
                    resolve({
                        test_name: testName,
                        success: true,
                        params: params,
                        raw_response: data,
                        parsed_response: result
                    });
                } catch (e) {
                    resolve({
                        test_name: testName,
                        success: false,
                        params: params,
                        raw_response: data,
                        error: '响应不是有效的JSON格式'
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            console.error(`❌ ${testName} 网络错误:`, error);
            resolve({
                test_name: testName,
                success: false,
                params: params,
                error: error.message
            });
        });
        
        req.setTimeout(15000, () => {
            req.destroy();
            resolve({
                test_name: testName,
                success: false,
                params: params,
                error: '请求超时'
            });
        });
        
        req.write(formData);
        req.end();
    });
}

exports.main = async (event, context) => {
    console.log('🔍 Z-Pay API 深度调试启动');
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        // 获取一个测试访问码的完整信息
        const testAccessCode = 'CM3Q4K4QLXNG';
        
        // 查找访问码详细信息
        const codeQuery = await db.collection('codes')
            .where({ code: testAccessCode })
            .get();
        
        if (codeQuery.data.length === 0) {
            return {
                success: false,
                error: '测试访问码不存在'
            };
        }
        
        const codeRecord = codeQuery.data[0];
        console.log('📦 访问码记录:', JSON.stringify(codeRecord, null, 2));
        
        // 查找对应的订单信息
        const orderQuery = await db.collection('orders')
            .where({ out_trade_no: codeRecord.out_trade_no })
            .get();
        
        let orderRecord = null;
        if (orderQuery.data.length > 0) {
            orderRecord = orderQuery.data[0];
            console.log('📦 订单记录:', JSON.stringify(orderRecord, null, 2));
        }
        
        // 准备测试不同的参数组合
        const testCases = [];
        
        // 测试1: 使用商户订单号 (out_trade_no)
        testCases.push({
            name: '使用商户订单号',
            params: {
                pid: ZPAY_CONFIG.pid,
                key: ZPAY_CONFIG.key,
                out_trade_no: codeRecord.out_trade_no,
                money: codeRecord.amount || '1.00'
            }
        });
        
        // 测试2: 如果订单记录中有 trade_no，使用易支付订单号
        if (orderRecord && orderRecord.trade_no) {
            testCases.push({
                name: '使用易支付订单号',
                params: {
                    pid: ZPAY_CONFIG.pid,
                    key: ZPAY_CONFIG.key,
                    trade_no: orderRecord.trade_no,
                    money: codeRecord.amount || '1.00'
                }
            });
        }
        
        // 测试3: 同时使用两个订单号
        if (orderRecord && orderRecord.trade_no) {
            testCases.push({
                name: '同时使用两个订单号',
                params: {
                    pid: ZPAY_CONFIG.pid,
                    key: ZPAY_CONFIG.key,
                    trade_no: orderRecord.trade_no,
                    out_trade_no: codeRecord.out_trade_no,
                    money: codeRecord.amount || '1.00'
                }
            });
        }
        
        // 测试4: 尝试不同的金额格式
        testCases.push({
            name: '金额格式测试(两位小数)',
            params: {
                pid: ZPAY_CONFIG.pid,
                key: ZPAY_CONFIG.key,
                out_trade_no: codeRecord.out_trade_no,
                money: '1.00'
            }
        });
        
        // 测试5: 尝试最小金额
        testCases.push({
            name: '最小金额测试',
            params: {
                pid: ZPAY_CONFIG.pid,
                key: ZPAY_CONFIG.key,
                out_trade_no: codeRecord.out_trade_no,
                money: '0.01'
            }
        });
        
        console.log(`🧪 准备执行 ${testCases.length} 个测试`);
        
        // 执行所有测试
        const results = [];
        for (const testCase of testCases) {
            const result = await testZPayCall(testCase.params, testCase.name);
            results.push(result);
            
            // 每次测试之间稍作延迟
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('🎉 调试测试完成');
        
        return {
            success: true,
            test_access_code: testAccessCode,
            code_record: codeRecord,
            order_record: orderRecord,
            test_results: results,
            analysis: {
                total_tests: results.length,
                successful_calls: results.filter(r => r.success).length,
                failed_calls: results.filter(r => !r.success).length
            }
        };
        
    } catch (error) {
        console.error('❌ 调试错误:', error);
        return {
            success: false,
            error: '调试失败: ' + error.message
        };
    }
};