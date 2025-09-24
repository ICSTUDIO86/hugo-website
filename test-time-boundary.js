/**
 * 时间边界测试 - 验证7天计算的准确性
 */

// 模拟我的新逻辑
function newLogic(purchaseTime, now) {
    const timeDiff = now.getTime() - purchaseTime.getTime();
    const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const within7Days = daysPassed <= 7;
    return { daysPassed, within7Days, logic: 'new' };
}

// 模拟现有的旧逻辑
function oldLogic(purchaseTime, now) {
    const daysDifference = Math.floor((now - purchaseTime) / (1000 * 60 * 60 * 24));
    const within7Days = daysDifference <= 7; // 注意：旧代码用的是 > 7，所以这里反过来
    return { daysPassed: daysDifference, within7Days, logic: 'old' };
}

// 测试边界条件
function testBoundaryConditions() {
    console.log('🧪 测试时间边界条件\n');

    const testCases = [
        { name: '购买当天', hours: 0 },
        { name: '购买后1天', hours: 24 },
        { name: '购买后2天', hours: 48 },
        { name: '购买后7天', hours: 7 * 24 },
        { name: '购买后7天1小时', hours: 7 * 24 + 1 },
        { name: '购买后8天', hours: 8 * 24 },
        { name: '购买后8天1小时', hours: 8 * 24 + 1 },
    ];

    testCases.forEach(testCase => {
        const purchaseTime = new Date('2025-01-01 10:00:00');
        const now = new Date(purchaseTime.getTime() + testCase.hours * 60 * 60 * 1000);

        const newResult = newLogic(purchaseTime, now);
        const oldResult = oldLogic(purchaseTime, now);

        const consistent = newResult.within7Days === oldResult.within7Days;
        const status = consistent ? '✅' : '❌';

        console.log(`${status} ${testCase.name} (${testCase.hours}小时后):`);
        console.log(`   新逻辑: ${newResult.daysPassed}天 -> ${newResult.within7Days ? '允许' : '拒绝'}`);
        console.log(`   旧逻辑: ${oldResult.daysPassed}天 -> ${oldResult.within7Days ? '允许' : '拒绝'}`);

        if (!consistent) {
            console.log(`   ❌ 不一致！`);
        }
        console.log('');
    });
}

// 运行测试
testBoundaryConditions();

console.log('📋 结论分析:');
console.log('如果出现不一致的结果，说明不同的退款入口点会对同一订单给出不同的退款决定！');
console.log('这会导致用户困惑和系统行为不可预测。');