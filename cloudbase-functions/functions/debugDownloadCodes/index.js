/**
 * 调试下载功能 - 查看数据库中的访问码
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔍 开始调试数据库中的访问码...');
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        // 查询所有codes集合的数据
        const codesQuery = await db.collection('codes').get();
        
        console.log(`📊 found ${codesQuery.data.length} codes in database`);
        
        // 显示前几个访问码的结构
        const sampleCodes = codesQuery.data.slice(0, 5).map(code => ({
            _id: code._id,
            code: code.code,
            access_code: code.access_code,
            status: code.status,
            out_trade_no: code.out_trade_no,
            // 显示所有字段名
            all_fields: Object.keys(code)
        }));
        
        // 特别查找我们的测试访问码
        const testCodes = ['DOWNLOAD001', 'DOWNLOAD002', 'TEST001'];
        const testResults = [];
        
        for (const testCode of testCodes) {
            // 尝试不同的查询方式
            const queries = [
                { field: 'code', value: testCode },
                { field: 'code', value: testCode.toUpperCase() },
                { field: 'access_code', value: testCode },
                { field: 'access_code', value: testCode.toUpperCase() }
            ];
            
            for (const query of queries) {
                const result = await db.collection('codes')
                    .where({ [query.field]: query.value })
                    .get();
                    
                if (result.data.length > 0) {
                    testResults.push({
                        search_code: testCode,
                        found_via: query,
                        record: result.data[0]
                    });
                    break;
                }
            }
        }
        
        return {
            success: true,
            data: {
                total_codes: codesQuery.data.length,
                sample_codes: sampleCodes,
                test_results: testResults,
                debug_info: {
                    message: "Check the structure of codes and see what fields are available",
                    collection_name: 'codes'
                }
            },
            timestamp: new Date()
        };
        
    } catch (error) {
        console.error('❌ 调试失败:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date()
        };
    }
};