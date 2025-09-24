/**
 * 修正后的时间边界测试 - 验证7天计算的准确性
 */

const { checkRefundTimeLimit } = require('./cloudbase-functions/utils/refundTimeChecker');

// 测试边界条件
function testCorrectedBoundaryConditions() {
    console.log('🧪 测试修正后的时间边界条件\n');

    const testCases = [
        { name: '购买当天（0小时后）', hoursAgo: 0, expectValid: true },
        { name: '购买后1天（24小时后）', hoursAgo: 24, expectValid: true },
        { name: '购买后6天（144小时后）', hoursAgo: 6 * 24, expectValid: true },
        { name: '购买后6天23小时（167小时后）', hoursAgo: 6 * 24 + 23, expectValid: true },
        { name: '购买后7天（168小时后）', hoursAgo: 7 * 24, expectValid: false },
        { name: '购买后7天1小时（169小时后）', hoursAgo: 7 * 24 + 1, expectValid: false },
        { name: '购买后8天（192小时后）', hoursAgo: 8 * 24, expectValid: false },
    ];

    let allPassed = true;
    const currentTime = new Date();

    testCases.forEach(testCase => {
        // 创建过去的购买时间
        const purchaseTime = new Date(currentTime.getTime() - testCase.hoursAgo * 60 * 60 * 1000);
        const orderRecord = {
            paid_at: purchaseTime
        };

        const result = checkRefundTimeLimit(orderRecord);
        const isCorrect = result.valid === testCase.expectValid;
        const status = isCorrect ? '✅' : '❌';

        console.log(`${status} ${testCase.name}:`);
        console.log(`   购买时间: ${purchaseTime.toLocaleString('zh-CN')}`);
        console.log(`   结果: ${result.days_passed}天 -> ${result.valid ? '允许' : '拒绝'}`);
        console.log(`   期望: ${testCase.expectValid ? '允许' : '拒绝'}`);

        if (!isCorrect) {
            console.log(`   ❌ 不符合预期！`);
            allPassed = false;
        }
        console.log('');
    });

    console.log('📋 测试结论:');
    if (allPassed) {
        console.log('✅ 所有边界条件测试通过！7天退款期限已严格执行。');
        console.log('✅ 用户现在只有7天（第0-6天）的退款期，不是8天。');
    } else {
        console.log('❌ 发现边界条件问题，需要进一步修复！');
    }

    console.log('\n💡 政策说明：购买后严格7天内可申请退款（不包括第7天）');
}

// 运行测试
testCorrectedBoundaryConditions();