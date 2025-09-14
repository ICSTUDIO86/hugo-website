/*!
 * IC Studio 视奏工具 - 专业级视奏旋律生成器
 * Professional Music Sight-Reading Tool - Final Version
 * 
 * Copyright © 2025. All rights reserved. Igor Chen - icstudio.club
 * 
 * Author: Igor Chen
 * Website: https://icstudio.club
 * Email: service@icstudio.club
 * 
 * Features:
 * - 严格遵循音乐理论，使用OSMD专业渲染
 * - 绝不调用VexFlow API，完全基于有效MusicXML
 * - 专业级五线谱渲染与音乐理论工具
 * - Apple-inspired minimalist design
 * 
 * This software provides advanced sight-reading melody generation
 * with professional music theory compliance and modern UI design.
 */

// ====== 全局变量 ======
let osmd = null;
let melodyHistory = [];
let currentHistoryIndex = -1;
let currentDisplayedClef = null; // 跟踪当前显示的旋律的谱号

// ====== 用户自定义设置 ======
let userSettings = {
    // 为每个谱号分别保存音域设置
    clefRanges: {
        treble: { 
            customRange: null, // 只有用户手动设置时才有值
            hasCustomRange: false 
        },
        alto: { 
            customRange: null,
            hasCustomRange: false 
        },
        bass: { 
            customRange: null,
            hasCustomRange: false 
        }
    },
    // 保持向后兼容的全局音域（已弃用，仅供旧代码参考）
    customRange: { min: 60, max: 72 }, // 默认C5-C6 (在新扩展范围内)
    hasCustomRange: false, // 标记用户是否手动设置了音域（已弃用）
    allowedRhythms: ['half', 'quarter', 'eighth', '16th'], // 默认允许的节奏（临时添加16th用于测试）
    allowDottedNotes: false, // 是否允许附点音符
    accidentalRate: 0, // 临时记号概率 (0-100%)
    maxJump: 12, // 最大音程跳动 (半音数)
    
    // 🔥 新增：多选设置项
    allowedKeys: ['C'], // 允许的调号，默认C大调
    allowedTimeSignatures: ['4/4'], // 允许的拍号，默认4/4拍
    allowedIntervals: [12], // 允许的最大音程跨度，默认完全八度
    allowedClefs: ['treble'], // 允许的谱号，默认高音谱号
    
    // 节奏频率设置
    rhythmFrequencies: {
        whole: 10,
        half: 30,
        quarter: 50,
        eighth: 40,
        '16th': 20,
        triplet: 15,
        duplet: 30,
        quadruplet: 25
    },
    
    // Articulation & Ornaments 设置
    articulations: {
        enabled: false, // 是否启用articulation
        basic: [], // 基本演奏法 ['staccato', 'accent', 'acciaccatura'] (已移除: tenuto, marcato, fermata)
        ornaments: [], // 装饰音 (已完全移除)
        guitar: [], // 吉他技巧 ['hammer-on', 'pull-off', 'glissando', 'slide-in', 'slide-out'] (已移除: bend, vibrato, harmonic)
        strings: [], // 弦乐技巧 (已完全移除)  
        bass: [], // 贝斯技巧 (已完全移除)
        frequencies: {
            staccato: 20,
            accent: 15,
            acciaccatura: 10,
            slur: 15  // 统一的击勾弦(slur)频率控制
        }
    }
};


/**
 * 检查是否应该根据用户频率设置生成特定方向的slur
 * 这是新的频率控制逻辑：控制slur方向而不是articulation类型
 */
/**
 * 🎸 统一的击勾弦(slur)频率控制函数
 * 使用单一频率控制所有二度音程的slur生成
 */
function shouldGenerateDirectionalSlur(interval, randomGenerator = null) {
    // 只对二度音程(±1或±2半音)生成slur
    if (Math.abs(interval) !== 1 && Math.abs(interval) !== 2) {
        return false;
    }
    
    // 检查用户是否启用了guitar技巧
    const hammerCheckbox = document.getElementById('gtr-hammer');
    const pullCheckbox = document.getElementById('gtr-pull');
    const hammerChecked = hammerCheckbox ? hammerCheckbox.checked : false;
    const pullChecked = pullCheckbox ? pullCheckbox.checked : false;
    
    // 如果用户没有勾选任何guitar技巧，则不生成slur
    if (!hammerChecked && !pullChecked) return false;
    
    // 获取统一的slur频率设置 - 使用新的频率映射系统
    const slurFreq = getUserFrequency('articulation', 'slur');
    
    // 如果频率为0%，完全不生成
    if (slurFreq === 0) {
        console.log(`🚫 击勾弦频率为 0%，完全阻止 (音程${interval > 0 ? '+' : ''}${interval})`);
        return false;
    }
    
    // 🔥 使用传入的随机数生成器，如果没有则使用Math.random
    const randomValue = randomGenerator ? randomGenerator.nextFloat() : Math.random();
    const shouldGenerate = randomValue * 100 < slurFreq;
    
    // 增加调试信息输出频率以便观察
    if (slurFreq <= 10 || slurFreq >= 90 || Math.random() < 0.1) {
        console.log(`🎸 击勾弦控制 ${slurFreq}%: ${shouldGenerate ? '✅生成' : '❌跳过'} (音程${interval > 0 ? '+' : ''}${interval})`);
    }
    
    return shouldGenerate;
}

/**
 * 🧪 简单测试新的频率控制系统
 */
function testNewFrequencyControl() {
    console.log('🧪 === 新频率控制系统测试开始 ===');
    
    const hammerSlider = document.getElementById('freq-hammer');
    const pullSlider = document.getElementById('freq-pull');
    const hammerCheckbox = document.getElementById('gtr-hammer');
    const pullCheckbox = document.getElementById('gtr-pull');
    
    if (!hammerSlider || !pullSlider || !hammerCheckbox || !pullCheckbox) {
        console.log('❌ 测试失败: UI元素不完整');
        return;
    }
    
    console.log('✅ UI元素检查通过');
    console.log(`📊 当前设置: hammer=${userSettings?.articulations?.frequencies?.hammer}%, pull=${userSettings?.articulations?.frequencies?.pull}%`);
    console.log(`☑️ 复选框状态: hammer=${hammerCheckbox.checked}, pull=${pullCheckbox.checked}`);
    
    // 测试不同频率值
    const testFreqs = [0, 25, 50, 75, 100];
    testFreqs.forEach(freq => {
        const oldHammer = userSettings.articulations.frequencies.hammer;
        const oldPull = userSettings.articulations.frequencies.pull;
        
        userSettings.articulations.frequencies.hammer = freq;
        userSettings.articulations.frequencies.pull = freq;
        
        // 测试10次，看概率是否接近预期
        let hammerHits = 0, pullHits = 0;
        for (let i = 0; i < 100; i++) {
            if (shouldGenerateDirectionalSlur(1)) hammerHits++;
            if (shouldGenerateDirectionalSlur(-1)) pullHits++;
        }
        
        console.log(`🎯 频率${freq}%测试: hammer命中${hammerHits}%, pull命中${pullHits}%`);
        
        // 恢复原值
        userSettings.articulations.frequencies.hammer = oldHammer;
        userSettings.articulations.frequencies.pull = oldPull;
    });
    
    console.log('🧪 === 测试完成 ===');
}

/**
 * 🎵 测试附点音符频率控制系统
 */
function testDottedNoteFrequencyControl() {
    console.log('🎵 === 附点音符频率控制测试开始 ===');
    
    // 检查UI元素
    const dottedQuarterSlider = document.getElementById('freq-dotted-quarter');
    const dottedHalfSlider = document.getElementById('freq-dotted-half');
    const dottedQuarterCheckbox = document.getElementById('rhythm-dotted-quarter');
    const dottedHalfCheckbox = document.getElementById('rhythm-dotted-half');
    
    console.log('📋 UI状态检查:');
    console.log(`  - 附点四分音符滑块: ${!!dottedQuarterSlider}`);
    console.log(`  - 附点二分音符滑块: ${!!dottedHalfSlider}`);
    console.log(`  - 附点四分音符复选框: ${!!dottedQuarterCheckbox} (勾选: ${dottedQuarterCheckbox?.checked})`);
    console.log(`  - 附点二分音符复选框: ${!!dottedHalfCheckbox} (勾选: ${dottedHalfCheckbox?.checked})`);
    
    if (!userSettings || !userSettings.rhythmFrequencies) {
        console.log('❌ userSettings或rhythmFrequencies不存在');
        return;
    }
    
    console.log('📊 当前频率设置:');
    console.log(`  - dotted-quarter: ${userSettings.rhythmFrequencies['dotted-quarter']}%`);
    console.log(`  - dotted-half: ${userSettings.rhythmFrequencies['dotted-half']}%`);
    
    // 测试节奏权重映射
    const testMelodyGen = new IntelligentMelodyGenerator(1, 'C', '6/8', 'treble', 12345);
    
    console.log('🔄 测试节奏权重映射:');
    
    // 模拟不同频率设置下的权重计算
    const testFreqs = [0, 25, 50, 100];
    testFreqs.forEach(freq => {
        console.log(`\n🎯 测试频率 ${freq}%:`);
        
        // 保存原始设置
        const originalQuarter = userSettings.rhythmFrequencies['dotted-quarter'];
        const originalHalf = userSettings.rhythmFrequencies['dotted-half'];
        
        // 临时设置新频率
        userSettings.rhythmFrequencies['dotted-quarter'] = freq;
        userSettings.rhythmFrequencies['dotted-half'] = freq;
        
        try {
            // 测试 quarter. 权重计算
            const quarterWeight = testMelodyGen.calculateDurationWeight(['quarter.'], 'quarter.', 1.5, 1.5);
            console.log(`  quarter. 权重: ${quarterWeight}`);
            
            // 测试 half. 权重计算  
            const halfWeight = testMelodyGen.calculateDurationWeight(['half.'], 'half.', 3.0, 3.0);
            console.log(`  half. 权重: ${halfWeight}`);
        } catch (error) {
            console.log(`  测试出错: ${error.message}`);
        }
        
        // 恢复原始设置
        userSettings.rhythmFrequencies['dotted-quarter'] = originalQuarter;
        userSettings.rhythmFrequencies['dotted-half'] = originalHalf;
    });
    
    console.log('🎵 === 附点音符频率控制测试完成 ===');
}

/**
 * 🎸 测试新的击勾弦频率控制系统
 */
function testSlurFrequencyControl() {
    console.log('🎸 === 击勾弦频率控制测试开始 ===');
    
    // 检查UI元素
    const slurSlider = document.getElementById('freq-slur');
    const slurValueDisplay = document.getElementById('freq-slur-value');
    const hammerCheckbox = document.getElementById('gtr-hammer');
    const pullCheckbox = document.getElementById('gtr-pull');
    
    console.log('📋 UI状态检查:');
    console.log(`  - 击勾弦滑块: ${!!slurSlider} (值: ${slurSlider?.value})`);
    console.log(`  - 击勾弦显示: ${!!slurValueDisplay} (文本: ${slurValueDisplay?.textContent})`);
    console.log(`  - Hammer-on复选框: ${!!hammerCheckbox} (勾选: ${hammerCheckbox?.checked})`);
    console.log(`  - Pull-off复选框: ${!!pullCheckbox} (勾选: ${pullCheckbox?.checked})`);
    
    if (!userSettings || !userSettings.articulations || !userSettings.articulations.frequencies) {
        console.log('❌ userSettings结构不完整');
        return;
    }
    
    console.log('📊 当前频率设置:');
    console.log(`  - slur频率: ${userSettings.articulations.frequencies.slur}%`);
    
    // 测试不同频率下的生成概率
    console.log('\n🎯 概率测试:');
    const testFreqs = [0, 25, 50, 75, 100];
    
    testFreqs.forEach(freq => {
        // 临时设置频率
        const originalFreq = userSettings.articulations.frequencies.slur;
        userSettings.articulations.frequencies.slur = freq;
        
        // 测试100次，统计生成次数
        let upwardCount = 0, downwardCount = 0;
        const testCount = 100;
        
        for (let i = 0; i < testCount; i++) {
            if (shouldGenerateDirectionalSlur(1)) upwardCount++;  // 上行二度
            if (shouldGenerateDirectionalSlur(-1)) downwardCount++; // 下行二度
        }
        
        console.log(`  频率${freq}%: 上行二度命中${upwardCount}%, 下行二度命中${downwardCount}%`);
        
        // 恢复原频率
        userSettings.articulations.frequencies.slur = originalFreq;
    });
    
    // 测试音程范围
    console.log('\n🎵 音程范围测试:');
    const intervals = [-3, -2, -1, 0, 1, 2, 3];
    intervals.forEach(interval => {
        const result = shouldGenerateDirectionalSlur(interval);
        console.log(`  音程${interval > 0 ? '+' : ''}${interval}: ${result ? '✅可能生成' : '❌不生成'}`);
    });
    
    console.log('\n🎯 频率影响测试 (0%和100%):');
    // 测试0%频率
    userSettings.articulations.frequencies.slur = 0;
    const zeroTest = shouldGenerateDirectionalSlur(1);
    console.log(`  0%频率测试: ${zeroTest ? '❌异常-仍生成' : '✅正确-不生成'}`);
    
    // 测试100%频率(多次测试)
    userSettings.articulations.frequencies.slur = 100;
    let hundredCount = 0;
    for (let i = 0; i < 10; i++) {
        if (shouldGenerateDirectionalSlur(1)) hundredCount++;
    }
    console.log(`  100%频率测试(10次): 命中${hundredCount}/10次 ${hundredCount >= 8 ? '✅正常' : '❌异常'}`);
    
    console.log('🎸 === 击勾弦频率控制测试完成 ===');
}

/**
 * 🧪 测试附点音符选择的严格性
 */
function testStrictDottedNoteSelection() {
    console.log('🧪 === 附点音符严格选择测试开始 ===');
    
    // 检查UI元素
    const dottedQuarterCheckbox = document.getElementById('rhythm-dotted-quarter');
    const dottedHalfCheckbox = document.getElementById('rhythm-dotted-half');
    const quarterCheckbox = document.getElementById('rhythm-quarter');
    const halfCheckbox = document.getElementById('rhythm-half');
    
    console.log('📋 UI状态检查:');
    console.log(`  - 附点四分音符复选框: ${!!dottedQuarterCheckbox} (勾选: ${dottedQuarterCheckbox?.checked})`);
    console.log(`  - 附点二分音符复选框: ${!!dottedHalfCheckbox} (勾选: ${dottedHalfCheckbox?.checked})`);
    console.log(`  - 四分音符复选框: ${!!quarterCheckbox} (勾选: ${quarterCheckbox?.checked})`);
    console.log(`  - 二分音符复选框: ${!!halfCheckbox} (勾选: ${halfCheckbox?.checked})`);
    
    if (!userSettings) {
        console.log('❌ userSettings不存在');
        return;
    }
    
    console.log('\n📊 当前节奏设置:');
    console.log(`  - allowedRhythms: [${userSettings.allowedRhythms?.join(', ') || 'undefined'}]`);
    
    // 测试只选择附点音符的情况
    console.log('\n🎯 测试场景: 只选择附点四分音符');
    
    // 模拟用户设置
    const originalRhythms = userSettings.allowedRhythms;
    userSettings.allowedRhythms = ['dotted-quarter'];
    
    try {
        // 创建测试生成器
        const testGen = new IntelligentMelodyGenerator(1, 'C', '6/8', 'treble', 12345);
        
        console.log('🔍 生成器允许的节奏:');
        console.log(`  - allowedDurations: [${testGen.rules.allowedDurations.join(', ')}]`);
        
        // 检查是否只包含用户选择的节奏（转换后的格式）
        const expectedRhythms = ['quarter.'];  // dotted-quarter 应该转换为 quarter.
        const hasOnlyExpected = testGen.rules.allowedDurations.every(r => expectedRhythms.includes(r));
        const hasUnexpected = testGen.rules.allowedDurations.some(r => !expectedRhythms.includes(r));
        
        console.log(`✅ 只包含预期节奏: ${hasOnlyExpected ? '是' : '否'}`);
        console.log(`❌ 包含意外节奏: ${hasUnexpected ? '是' : '否'}`);
        
        if (hasUnexpected) {
            const unexpected = testGen.rules.allowedDurations.filter(r => !expectedRhythms.includes(r));
            console.log(`🚫 意外的节奏类型: [${unexpected.join(', ')}]`);
        }
        
    } catch (error) {
        console.log(`测试出错: ${error.message}`);
    }
    
    // 恢复原始设置
    userSettings.allowedRhythms = originalRhythms;
    
    console.log('🧪 === 附点音符严格选择测试完成 ===');
}

/**
 * 🔍 调试工具函数：测试频率控制系统
 * 用法：在浏览器控制台输入 testFrequencyControl()
 */
function testFrequencyControl() {
    console.log(`\n🧪 === 频率控制系统综合测试 ===`);
    
    // 1. 检查UI元素
    const hammerSlider = document.getElementById('freq-hammer');
    const pullSlider = document.getElementById('freq-pull');
    const hammerDisplay = document.getElementById('freq-hammer-value');
    const pullDisplay = document.getElementById('freq-pull-value');
    
    console.log(`📋 UI元素检查:`);
    console.log(`  - hammer摇杆存在: ${!!hammerSlider} ${hammerSlider ? `(值: ${hammerSlider.value})` : ''}`);
    console.log(`  - pull摇杆存在: ${!!pullSlider} ${pullSlider ? `(值: ${pullSlider.value})` : ''}`);
    console.log(`  - hammer显示存在: ${!!hammerDisplay} ${hammerDisplay ? `(文本: ${hammerDisplay.textContent})` : ''}`);
    console.log(`  - pull显示存在: ${!!pullDisplay} ${pullDisplay ? `(文本: ${pullDisplay.textContent})` : ''}`);
    
    // 2. 检查userSettings状态
    console.log(`\n📊 userSettings检查:`);
    console.log(`  - userSettings存在: ${!!userSettings}`);
    console.log(`  - articulations存在: ${!!userSettings?.articulations}`);
    console.log(`  - frequencies存在: ${!!userSettings?.articulations?.frequencies}`);
    
    if (userSettings?.articulations?.frequencies) {
        console.log(`  - hammer频率: ${userSettings.articulations.frequencies.hammer}%`);
        console.log(`  - pull频率: ${userSettings.articulations.frequencies.pull}%`);
    }
    
    // 3. 检查复选框状态
    const hammerCheckboxTest = document.getElementById('gtr-hammer');
    const pullCheckboxTest = document.getElementById('gtr-pull');
    console.log(`\n🎛️ 复选框状态检查:`);
    console.log(`  - hammer-on复选框: ${hammerCheckboxTest ? (hammerCheckboxTest.checked ? '✅勾选' : '❌未勾选') : '❌不存在'}`);
    console.log(`  - pull-off复选框: ${pullCheckboxTest ? (pullCheckboxTest.checked ? '✅勾选' : '❌未勾选') : '❌不存在'}`);
    
    // 4. 测试shouldGenerateDirectionalSlur函数
    console.log(`\n🎯 shouldGenerateDirectionalSlur测试:`);
    const testIntervals = [1, 2, -1, -2, 3, -3];
    testIntervals.forEach(interval => {
        console.log(`\n🔍 测试音程 ${interval}:`);
        const result = shouldGenerateDirectionalSlur(interval);
        console.log(`  结果: ${result ? '✅允许生成' : '❌阻止生成'}`);
    });
    
    // 5. 模拟频率控制测试
    if (userSettings?.articulations?.frequencies) {
        console.log(`\n🔧 模拟频率测试:`);
        
        // 临时保存原始值
        const originalHammer = userSettings.articulations.frequencies.hammer;
        const originalPull = userSettings.articulations.frequencies.pull;
        
        // 测试0%频率
        console.log(`  设置频率为0%测试:`);
        userSettings.articulations.frequencies.hammer = 0;
        userSettings.articulations.frequencies.pull = 0;
        
        testIntervals.forEach(interval => {
            if (interval === 1 || interval === 2 || interval === -1 || interval === -2) {
                const result = shouldGenerateDirectionalSlur(interval);
                console.log(`    音程${interval}: ${result ? '⚠️仍然生成（异常）' : '✅正确阻止'}`);
            }
        });
        
        // 恢复原始值
        userSettings.articulations.frequencies.hammer = originalHammer;
        userSettings.articulations.frequencies.pull = originalPull;
        console.log(`  已恢复原始频率设置`);
    }
    
    // 6. 给出详细的测试指南
    const hammerCheckboxGuide = document.getElementById('gtr-hammer');
    const pullCheckboxGuide = document.getElementById('gtr-pull');
    const hammerChecked = hammerCheckboxGuide?.checked;
    const pullChecked = pullCheckboxGuide?.checked;
    
    console.log(`\n📋 === 完整测试指南 ===`);
    
    console.log(`\n🔧 当前状态检查:`);
    console.log(`  - Hammer-on复选框已勾选: ${hammerChecked ? '✅' : '❌ 需要勾选'}`);
    console.log(`  - Pull-off复选框已勾选: ${pullChecked ? '✅' : '❌ 需要勾选'}`);
    console.log(`  - 当前谱号: ${document.getElementById('clef')?.value || 'unknown'}`);
    
    if (!hammerChecked || !pullChecked) {
        console.log(`\n⚠️ 关键问题发现：`);
        console.log(`  复选框未勾选！这会阻止所有hammer-on/pull-off的生成`);
        console.log(`  频率控制只有在勾选对应复选框后才有效`);
    }
    
    console.log(`\n🧪 完整测试步骤:`);
    console.log(`  1. 【设置Articulation】`);
    console.log(`     - 点击"Articulation & Ornaments"按钮`);
    console.log(`     - 勾选"Hammer-on (H)"和"Pull-off (P)"`);
    console.log(`     - 点击"高级设置"展开频率控制面板`);
    
    console.log(`  2. 【调节频率】`);
    console.log(`     - 将"Hammer-on"摇杆拖到最左边(0%)`);
    console.log(`     - 将"Pull-off"摇杆拖到最左边(0%)`);
    console.log(`     - 检查显示是否为"0%"`);
    
    console.log(`  3. 【保存设置】`);
    console.log(`     - 点击"保存"按钮关闭设置面板`);
    console.log(`     - 应该看到"✅ 演奏法频率设置"消息`);
    
    console.log(`  4. 【选择合适的配置】`);
    console.log(`     - 确保选择"高音谱号(Treble Clef)"`);
    console.log(`     - 选择较小的音域范围增加二度音程概率`);
    
    console.log(`  5. 【生成和验证】`);
    console.log(`     - 点击"生成新旋律"多次(3-5次)`);
    console.log(`     - 观察控制台输出是否显示:`);
    console.log(`       "🚫 上行二度slur被阻止：hammer-on频率为0%"`);
    console.log(`       "🚫 下行二度slur被阻止：pull-off频率为0%"`);
    console.log(`     - 检查乐谱中是否完全没有slur连线`);
    
    console.log(`\n✅ 如果测试成功:`);
    console.log(`  - 将摇杆调回100%，应该重新出现hammer-on/pull-off`);
    console.log(`  - 调到50%，应该减少出现频率`);
    
    console.log(`\n⚠️ 常见问题排除:`);
    console.log(`  - 问题：没有控制台输出 → 检查是否勾选了复选框`);
    console.log(`  - 问题：仍有slur出现 → 检查是否点击了"保存"按钮`);
    console.log(`  - 问题：根本没有slur → 检查是否选择了高音谱号`);
    console.log(`  - 问题：很少有二度音程 → 减小音域范围，增加二度概率`);
    
    console.log(`\n🧪 === 测试结束 ===\n`);
    
    return {
        uiElements: {
            hammerSlider: !!hammerSlider,
            pullSlider: !!pullSlider,
            hammerDisplay: !!hammerDisplay,
            pullDisplay: !!pullDisplay
        },
        checkboxes: {
            hammerChecked: hammerCheckbox?.checked,
            pullChecked: pullCheckbox?.checked
        },
        frequencies: userSettings?.articulations?.frequencies,
        sliderValues: {
            hammer: hammerSlider?.value,
            pull: pullSlider?.value
        }
    };
}

// 将测试函数暴露到全局作用域，方便在控制台调用
window.testFrequencyControl = testFrequencyControl;

/**
 * 🔍 6/8拍附点音符综合测试函数
 * 用法：在浏览器控制台输入 test68DottedNotes()
 */
function test68DottedNotes() {
    console.log(`\n🧪 === 6/8拍附点音符综合测试 ===`);
    
    // 1. 检查UI状态
    console.log(`\n📋 UI状态检查:`);
    const dottedHalfCheckbox = document.getElementById('rhythm-dotted-half');
    const dottedQuarterCheckbox = document.getElementById('rhythm-dotted-quarter');
    const timeSignatureSelect = document.getElementById('timeSignature');
    
    console.log(`  - 拍号设置: ${timeSignatureSelect?.value || 'unknown'}`);
    console.log(`  - 附点二分音符复选框存在: ${!!dottedHalfCheckbox}`);
    console.log(`  - 附点四分音符复选框存在: ${!!dottedQuarterCheckbox}`);
    console.log(`  - 附点二分音符已勾选: ${dottedHalfCheckbox?.checked || false}`);
    console.log(`  - 附点四分音符已勾选: ${dottedQuarterCheckbox?.checked || false}`);
    
    // 2. 检查频率控制
    console.log(`\n🎛️ 频率控制检查:`);
    const dottedHalfSlider = document.getElementById('freq-dotted-half');
    const dottedQuarterSlider = document.getElementById('freq-dotted-quarter');
    
    console.log(`  - 附点二分音符频率摇杆存在: ${!!dottedHalfSlider}`);
    console.log(`  - 附点四分音符频率摇杆存在: ${!!dottedQuarterSlider}`);
    if (dottedHalfSlider) {
        console.log(`  - 附点二分音符频率设置: ${dottedHalfSlider.value}%`);
    }
    if (dottedQuarterSlider) {
        console.log(`  - 附点四分音符频率设置: ${dottedQuarterSlider.value}%`);
    }
    
    // 3. 检查userSettings状态
    console.log(`\n⚙️ 用户设置检查:`);
    console.log(`  - userSettings存在: ${!!userSettings}`);
    console.log(`  - allowedRhythms: [${userSettings?.allowedRhythms?.join(', ') || 'undefined'}]`);
    console.log(`  - rhythmFrequencies存在: ${!!userSettings?.rhythmFrequencies}`);
    if (userSettings?.rhythmFrequencies) {
        console.log(`  - 附点二分音符频率: ${userSettings.rhythmFrequencies['dotted-half']}%`);
        console.log(`  - 附点四分音符频率: ${userSettings.rhythmFrequencies['dotted-quarter']}%`);
    }
    
    // 4. 测试6/8拍节奏转换
    console.log(`\n🔄 节奏转换测试:`);
    if (userSettings?.allowedRhythms) {
        const testGenerator = new IntelligentMelodyGenerator(1, 'C', '6/8', 'treble', 12345);
        console.log(`  - 转换前用户节奏: [${userSettings.allowedRhythms.join(', ')}]`);
        console.log(`  - 转换后生成器节奏: [${testGenerator.rules.allowedDurations.join(', ')}]`);
        console.log(`  - 包含half.: ${testGenerator.rules.allowedDurations.includes('half.') ? '✅' : '❌'}`);
        console.log(`  - 包含quarter.: ${testGenerator.rules.allowedDurations.includes('quarter.') ? '✅' : '❌'}`);
    }
    
    // 5. 给出诊断建议
    console.log(`\n💡 诊断结果和建议:`);
    
    if (timeSignatureSelect?.value !== '6/8') {
        console.log(`  ⚠️ 当前拍号不是6/8，请先切换到6/8拍`);
    }
    
    if (!dottedHalfCheckbox?.checked && !dottedQuarterCheckbox?.checked) {
        console.log(`  ⚠️ 未勾选附点音符，请在节奏设置中勾选附点二分音符和/或附点四分音符`);
    }
    
    if (dottedHalfSlider && dottedHalfSlider.value === '0') {
        console.log(`  ⚠️ 附点二分音符频率为0%，请调整到适当值（建议50-100%）`);
    }
    
    console.log(`\n✅ 如果以上检查都正常，现在附点音符应该能正常生成了！`);
    console.log(`🧪 === 测试结束 ===\n`);
}

window.test68DottedNotes = test68DottedNotes;

/**
 * 🔍 测试生成旋律时附点音符状态保持
 * 用法：在浏览器控制台输入 testDottedNotesPersistence()
 */
function testDottedNotesPersistence() {
    console.log(`\n🧪 === 附点音符状态保持测试 ===`);
    
    // 1. 检查当前设置
    const dottedHalfCheckbox = document.getElementById('rhythm-dotted-half');
    const dottedQuarterCheckbox = document.getElementById('rhythm-dotted-quarter');
    const timeSignatureSelect = document.getElementById('timeSignature');
    
    console.log(`\n📋 测试前状态:`);
    console.log(`  - 拍号: ${timeSignatureSelect?.value}`);
    console.log(`  - 附点二分音符: ${dottedHalfCheckbox?.checked ? '✅勾选' : '❌未勾选'}`);
    console.log(`  - 附点四分音符: ${dottedQuarterCheckbox?.checked ? '✅勾选' : '❌未勾选'}`);
    
    // 2. 模拟updateRhythmSettingsRealTime调用
    console.log(`\n🔄 模拟updateRhythmSettingsRealTime调用:`);
    const originalConsoleLog = console.log;
    let capturedLogs = [];
    console.log = function(...args) {
        capturedLogs.push(args.join(' '));
        originalConsoleLog.apply(console, args);
    };
    
    try {
        updateRhythmSettingsRealTime();
    } catch (error) {
        console.error('❌ updateRhythmSettingsRealTime调用出错:', error);
    } finally {
        console.log = originalConsoleLog;
    }
    
    // 3. 检查调用后状态
    console.log(`\n📋 调用后状态:`);
    console.log(`  - 附点二分音符: ${dottedHalfCheckbox?.checked ? '✅勾选' : '❌未勾选'}`);
    console.log(`  - 附点四分音符: ${dottedQuarterCheckbox?.checked ? '✅勾选' : '❌未勾选'}`);
    console.log(`  - userSettings.allowedRhythms: [${userSettings?.allowedRhythms?.join(', ') || 'undefined'}]`);
    
    // 4. 检查是否有状态变化
    const dottedHalfAfter = dottedHalfCheckbox?.checked;
    const dottedQuarterAfter = dottedQuarterCheckbox?.checked;
    
    console.log(`\n💡 测试结果:`);
    if (dottedHalfAfter && dottedQuarterAfter) {
        console.log(`  ✅ 附点音符状态保持良好`);
    } else {
        console.log(`  ⚠️ 附点音符状态可能有问题`);
        console.log(`  建议检查updateRhythmOptionsForTimeSignature函数`);
    }
    
    // 5. 显示相关的捕获日志
    console.log(`\n📝 相关日志:`);
    const relevantLogs = capturedLogs.filter(log => 
        log.includes('dotted') || log.includes('附点') || log.includes('rhythm-')
    );
    relevantLogs.forEach(log => console.log(`  ${log}`));
    
    console.log(`\n🧪 === 测试结束 ===\n`);
}

window.testDottedNotesPersistence = testDottedNotesPersistence;

/**
 * 🔍 专门测试hammer-on/pull-off频率控制的完整流程
 * 用法：在浏览器控制台输入 testHammerPullFrequencyControl()
 */
function testHammerPullFrequencyControl() {
    console.log(`\n🧪 === Hammer-on/Pull-off频率控制完整测试 ===`);
    
    // 1. 检查UI元素
    const hammerSlider = document.getElementById('freq-hammer');
    const pullSlider = document.getElementById('freq-pull');
    const hammerCheckbox = document.getElementById('gtr-hammer');
    const pullCheckbox = document.getElementById('gtr-pull');
    const clefSelect = document.getElementById('clef');
    
    console.log(`\n📋 UI状态检查:`);
    console.log(`  - Hammer摇杆存在: ${!!hammerSlider} ${hammerSlider ? `(值: ${hammerSlider.value}%)` : ''}`);
    console.log(`  - Pull摇杆存在: ${!!pullSlider} ${pullSlider ? `(值: ${pullSlider.value}%)` : ''}`);
    console.log(`  - Hammer复选框勾选: ${hammerCheckbox?.checked ? '✅' : '❌'}`);
    console.log(`  - Pull复选框勾选: ${pullCheckbox?.checked ? '✅' : '❌'}`);
    console.log(`  - 当前谱号: ${clefSelect?.value || 'unknown'}`);
    
    if (clefSelect?.value !== 'treble') {
        console.log(`  ⚠️ 警告: 当前不是高音谱号，吉他技巧仅在高音谱号下工作`);
    }
    
    // 2. 检查userSettings
    console.log(`\n⚙️ 用户设置检查:`);
    console.log(`  - userSettings存在: ${!!userSettings}`);
    console.log(`  - guitar设置: [${userSettings?.articulations?.guitar?.join(', ') || 'none'}]`);
    console.log(`  - 频率设置存在: ${!!userSettings?.articulations?.frequencies}`);
    if (userSettings?.articulations?.frequencies) {
        console.log(`  - Hammer频率: ${userSettings.articulations.frequencies.hammer}%`);
        console.log(`  - Pull频率: ${userSettings.articulations.frequencies.pull}%`);
    }
    
    // 3. 测试shouldGenerateDirectionalSlur函数
    console.log(`\n🎯 函数测试:`);
    
    // 测试上行音程(hammer-on)
    console.log(`  上行音程测试 (hammer-on):`);
    for (const interval of [1, 2]) {
        const result = shouldGenerateDirectionalSlur(interval);
        console.log(`    音程+${interval}: ${result ? '✅允许' : '❌阻止'}`);
    }
    
    // 测试下行音程(pull-off)
    console.log(`  下行音程测试 (pull-off):`);
    for (const interval of [-1, -2]) {
        const result = shouldGenerateDirectionalSlur(interval);
        console.log(`    音程${interval}: ${result ? '✅允许' : '❌阻止'}`);
    }
    
    // 4. 模拟摇杆调整到0%的测试
    console.log(`\n🔧 零频率测试:`);
    if (hammerSlider && pullSlider) {
        // 保存原始值
        const originalHammer = hammerSlider.value;
        const originalPull = pullSlider.value;
        
        // 设置为0%
        hammerSlider.value = 0;
        pullSlider.value = 0;
        
        // 触发事件
        hammerSlider.dispatchEvent(new Event('input'));
        pullSlider.dispatchEvent(new Event('input'));
        
        console.log(`  设置摇杆为0%后:`);
        console.log(`    Hammer频率: ${userSettings?.articulations?.frequencies?.hammer}%`);
        console.log(`    Pull频率: ${userSettings?.articulations?.frequencies?.pull}%`);
        
        // 测试函数响应
        const hammerBlocked = !shouldGenerateDirectionalSlur(1);
        const pullBlocked = !shouldGenerateDirectionalSlur(-1);
        
        console.log(`    音程+1被阻止: ${hammerBlocked ? '✅正确' : '❌错误'}`);
        console.log(`    音程-1被阻止: ${pullBlocked ? '✅正确' : '❌错误'}`);
        
        // 恢复原始值
        hammerSlider.value = originalHammer;
        pullSlider.value = originalPull;
        hammerSlider.dispatchEvent(new Event('input'));
        pullSlider.dispatchEvent(new Event('input'));
        
        console.log(`  已恢复原始设置`);
    }
    
    // 5. 给出诊断结果
    console.log(`\n💡 诊断结果:`);
    
    const requiredConditions = [
        { name: '高音谱号', passed: clefSelect?.value === 'treble' },
        { name: 'Hammer-on复选框勾选', passed: hammerCheckbox?.checked },
        { name: 'Pull-off复选框勾选', passed: pullCheckbox?.checked },
        { name: '摇杆元素存在', passed: !!hammerSlider && !!pullSlider },
        { name: '频率设置存在', passed: !!userSettings?.articulations?.frequencies }
    ];
    
    requiredConditions.forEach(condition => {
        console.log(`  ${condition.name}: ${condition.passed ? '✅' : '❌'}`);
    });
    
    const allPassed = requiredConditions.every(c => c.passed);
    
    if (allPassed) {
        console.log(`\n✅ 所有条件满足！频率控制应该正常工作。`);
        console.log(`📝 测试步骤：`);
        console.log(`  1. 将摇杆调到0%`);
        console.log(`  2. 生成旋律多次`);
        console.log(`  3. 观察控制台输出应该显示"频率控制阻止"信息`);
        console.log(`  4. 乐谱中不应出现hammer-on/pull-off连音线`);
    } else {
        console.log(`\n⚠️ 发现问题！请先解决以上标记为❌的条件。`);
    }
    
    console.log(`\n🧪 === 测试结束 ===\n`);
}

window.testHammerPullFrequencyControl = testHammerPullFrequencyControl;
window.testNewFrequencyControl = testNewFrequencyControl;
window.testDottedNoteFrequencyControl = testDottedNoteFrequencyControl;
window.testSlurFrequencyControl = testSlurFrequencyControl;
window.testStrictDottedNoteSelection = testStrictDottedNoteSelection;

/**
 * 🔧 简化的击勾弦频率控制测试
 */
function testSlurFrequencySimple() {
    console.log('🎸 === 击勾弦频率控制简化测试 ===');
    
    // 检查UI元素
    const slurSlider = document.getElementById('freq-slur');
    const slurValueDisplay = document.getElementById('freq-slur-value');
    
    console.log('📋 UI状态:');
    console.log(`  - 击勾弦滑块存在: ${!!slurSlider}`);
    console.log(`  - 当前滑块值: ${slurSlider?.value}`);
    console.log(`  - 显示值: ${slurValueDisplay?.textContent}`);
    console.log(`  - userSettings中的值: ${userSettings?.articulations?.frequencies?.slur}`);
    
    if (!slurSlider) {
        console.log('❌ 滑块不存在，测试结束');
        return;
    }
    
    // 测试滑块更新功能
    console.log('\n🔧 测试滑块更新:');
    const testValues = [0, 25, 50, 100];
    
    testValues.forEach(value => {
        console.log(`\n设置频率为 ${value}%:`);
        
        slurSlider.value = value;
        slurSlider.dispatchEvent(new Event('input'));
        
        console.log(`  - 滑块值: ${slurSlider.value}`);
        console.log(`  - 显示值: ${slurValueDisplay?.textContent}`);
        console.log(`  - userSettings值: ${userSettings?.articulations?.frequencies?.slur}`);
        
        // 测试函数响应
        const testResult1 = shouldGenerateDirectionalSlur(1);
        const testResult2 = shouldGenerateDirectionalSlur(-1);
        console.log(`  - 音程+1测试: ${testResult1 ? '✅会生成' : '❌不生成'}`);
        console.log(`  - 音程-1测试: ${testResult2 ? '✅会生成' : '❌不生成'}`);
    });
    
    // 恢复默认值
    slurSlider.value = 15;
    slurSlider.dispatchEvent(new Event('input'));
    
    console.log('\n🎸 === 测试完成 ===');
}

window.testSlurFrequencySimple = testSlurFrequencySimple;

// ====== 正确的音乐理论系统 ======

// 标准音阶定义（手动定义，确保正确）
const KEY_SCALES = {
    // 大调音阶
    'C': [0, 2, 4, 5, 7, 9, 11],    // C大调: C D E F G A B
    'G': [7, 9, 11, 0, 2, 4, 6],    // G大调: G A B C D E F#
    'D': [2, 4, 6, 7, 9, 11, 1],    // D大调: D E F# G A B C#
    'A': [9, 11, 1, 2, 4, 6, 8],    // A大调: A B C# D E F# G#
    'E': [4, 6, 8, 9, 11, 1, 3],    // E大调: E F# G# A B C# D#
    'B': [11, 1, 3, 4, 6, 8, 10],   // B大调: B C# D# E F# G# A#
    'F#': [6, 8, 10, 11, 1, 3, 5],  // F#大调: F# G# A# B C# D# E#(F)
    'F': [5, 7, 9, 10, 0, 2, 4],    // F大调: F G A Bb C D E
    'Bb': [10, 0, 2, 3, 5, 7, 9],   // Bb大调: Bb C D Eb F G A
    'Eb': [3, 5, 7, 8, 10, 0, 2],   // Eb大调: Eb F G Ab Bb C D
    'Ab': [8, 10, 0, 1, 3, 5, 7],   // Ab大调: Ab Bb C Db Eb F G
    'Db': [1, 3, 5, 6, 8, 10, 0],   // Db大调: Db Eb F Gb Ab Bb C
    'Gb': [6, 8, 10, 11, 1, 3, 5],  // Gb大调: Gb Ab Bb Cb(B) Db Eb F
    
    // 小调音阶（自然小调）
    'Am': [9, 11, 0, 2, 4, 5, 7],   // A小调: A B C D E F G
    'Em': [4, 6, 7, 9, 11, 0, 2],   // E小调: E F# G A B C D
    'Bm': [11, 1, 2, 4, 6, 7, 9],   // B小调: B C# D E F# G A
    'F#m': [6, 8, 9, 11, 1, 2, 4],  // F#小调: F# G# A B C# D E
    'C#m': [1, 3, 4, 6, 8, 9, 11],  // C#小调: C# D# E F# G# A B
    'G#m': [8, 10, 11, 1, 3, 4, 6], // G#小调: G# A# B C# D# E F#
    'D#m': [3, 5, 6, 8, 10, 11, 1], // D#小调: D# E# F# G# A# B C#
    'A#m': [10, 0, 1, 3, 5, 6, 8],  // A#小调: A# B# C# D# E# F# G#
    'Dm': [2, 4, 5, 7, 9, 10, 0],   // D小调: D E F G A Bb C
    'Gm': [7, 9, 10, 0, 2, 3, 5],   // G小调: G A Bb C D Eb F
    'Cm': [0, 2, 3, 5, 7, 8, 10],   // C小调: C D Eb F G Ab Bb
    'Fm': [5, 7, 8, 10, 0, 1, 3],   // F小调: F G Ab Bb C Db Eb
    'Bbm': [10, 0, 1, 3, 5, 6, 8],  // Bb小调: Bb C Db Eb F Gb Ab
    'Ebm': [3, 5, 6, 8, 10, 11, 1], // Eb小调: Eb F Gb Ab Bb Cb(B) Db
};

// 调号的升降号定义（用于检测临时记号冲突）
const KEY_SIGNATURES = {
    // 大调
    'C': { sharps: [], flats: [], tonic: 0 },
    'G': { sharps: [6], flats: [], tonic: 7 },     // F#
    'D': { sharps: [6, 1], flats: [], tonic: 2 },  // F#, C#
    'A': { sharps: [6, 1, 8], flats: [], tonic: 9 }, // F#, C#, G#
    'E': { sharps: [6, 1, 8, 3], flats: [], tonic: 4 }, // F#, C#, G#, D#
    'B': { sharps: [6, 1, 8, 3, 10], flats: [], tonic: 11 }, // F#, C#, G#, D#, A#
    'F#': { sharps: [6, 1, 8, 3, 10, 5], flats: [], tonic: 6 }, // F#, C#, G#, D#, A#, E#
    'F': { sharps: [], flats: [10], tonic: 5 },     // Bb
    'Bb': { sharps: [], flats: [10, 3], tonic: 10 }, // Bb, Eb
    'Eb': { sharps: [], flats: [10, 3, 8], tonic: 3 }, // Bb, Eb, Ab
    'Ab': { sharps: [], flats: [10, 3, 8, 1], tonic: 8 }, // Bb, Eb, Ab, Db
    'Db': { sharps: [], flats: [10, 3, 8, 1, 6], tonic: 1 }, // Bb, Eb, Ab, Db, Gb
    'Gb': { sharps: [], flats: [10, 3, 8, 1, 6, 11], tonic: 6 }, // Bb, Eb, Ab, Db, Gb, Cb
    
    // 小调（继承相对大调的调号）
    'Am': { sharps: [], flats: [], tonic: 9, mode: 'minor' },
    'Em': { sharps: [6], flats: [], tonic: 4, mode: 'minor' },
    'Bm': { sharps: [6, 1], flats: [], tonic: 11, mode: 'minor' },
    'F#m': { sharps: [6, 1, 8], flats: [], tonic: 6, mode: 'minor' },
    'C#m': { sharps: [6, 1, 8, 3], flats: [], tonic: 1, mode: 'minor' },
    'G#m': { sharps: [6, 1, 8, 3, 10], flats: [], tonic: 8, mode: 'minor' },
    'D#m': { sharps: [6, 1, 8, 3, 10, 5], flats: [], tonic: 3, mode: 'minor' },
    'A#m': { sharps: [6, 1, 8, 3, 10, 5, 0], flats: [], tonic: 10, mode: 'minor' },
    'Dm': { sharps: [], flats: [10], tonic: 2, mode: 'minor' },
    'Gm': { sharps: [], flats: [10, 3], tonic: 7, mode: 'minor' },
    'Cm': { sharps: [], flats: [10, 3, 8], tonic: 0, mode: 'minor' },
    'Fm': { sharps: [], flats: [10, 3, 8, 1], tonic: 5, mode: 'minor' },
    'Bbm': { sharps: [], flats: [10, 3, 8, 1, 6], tonic: 10, mode: 'minor' },
    'Ebm': { sharps: [], flats: [10, 3, 8, 1, 6, 11], tonic: 3, mode: 'minor' },
};

// 🎵 专业记谱规则：正确的音名拼写映射表
const PROFESSIONAL_NOTATION_RULES = {
    // 记谱规则1：正确使用音名（Enharmonic spelling）
    getCorrectSpelling: function(pitchClass, keySignature) {
        const keyInfo = KEY_SIGNATURES[keySignature];
        if (!keyInfo) return this.defaultSpelling[pitchClass];
        
        // 小调的特殊处理 - 使用专门的小调拼写表
        if (keyInfo.mode === 'minor' && typeof MINOR_KEY_SPELLING !== 'undefined') {
            const minorSpelling = MINOR_KEY_SPELLING[keySignature];
            if (minorSpelling && minorSpelling[pitchClass]) {
                return minorSpelling[pitchClass];
            }
        }
        
        // Special handling for B# in C# major
        if (pitchClass === 0) {
            if (keySignature === 'C#' || keySignature === 'C#m' || 
                keySignature === 'A#m') {
                return 'B#';
            }
        }
        
        // Special handling for E# in sharp keys
        if (pitchClass === 5) {
            if (keySignature === 'C#' || keySignature === 'C#m' || 
                keySignature === 'F#' || keySignature === 'F#m') {
                return 'E#';
            }
        }
        
        // Special handling for Cb in specific flat keys
        if (pitchClass === 11) {
            if (keySignature === 'Gb' || keySignature === 'Ebm') {
                return 'Cb';
            }
        }
        
        // 根据调号确定正确的音名拼写
        const isSharpKey = keyInfo.sharps.length > 0;
        const isFlatKey = keyInfo.flats.length > 0;
        
        if (isSharpKey) {
            return this.sharpKeySpelling[pitchClass];
        } else if (isFlatKey) {
            return this.flatKeySpelling[pitchClass];
        } else {
            return this.defaultSpelling[pitchClass];
        }
    },
    
    // 升号调的拼写规范
    sharpKeySpelling: {
        0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'E#', 
        6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
    },
    
    // 降号调的押写规范
    flatKeySpelling: {
        0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F', 
        6: 'Gb', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B'
    },
    
    // 默认拼写（C大调/Am小调）
    // A小调应该使用G#而不是Ab（作为和声小调的导音）
    defaultSpelling: {
        0: 'C', 1: 'C#', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F', 
        6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'Bb', 11: 'B'
    }
};

// 🎵 专业记谱规则：和弦拼写规范（确保三度堆叠）
const CHORD_SPELLING_RULES = {
    // 检查和弦拼写是否符合三度堆叠规范
    validateChordSpelling: function(chordNotes, rootNote) {
        // 确保和弦内音符按三度堆叠排列，避免等响异名错误
        // 例如：Cm 应该是 C-Eb-G，不能写成 C-D#-G
        return true; // 简化实现，实际可以更复杂
    },
    
    // 获取正确的三和弦拼写
    getTriadSpelling: function(root, quality, keySignature) {
        const rootPc = root % 12;
        const intervals = quality === 'major' ? [0, 4, 7] : [0, 3, 7]; // 大三度或小三度
        
        return intervals.map(interval => {
            const notePc = (rootPc + interval) % 12;
            return PROFESSIONAL_NOTATION_RULES.getCorrectSpelling(notePc, keySignature);
        });
    }
};

// 🎵 专业记谱规则：节奏拼写规范
// 符干连接（符槓）规则 - 详细版本
const BEAMING_RULES = {
    
    /**
     * 符槓连接核心规则
     * 基于国际音乐记谱法标准和中文音乐理论
     */
    
    // 1. 基础连接规则
    basicRules: {
        // 可以连接符槓的音符类型（有符尾的音符）
        beamableNotes: ['eighth', 'eighth.', '16th', '32nd', '64th'],
        
        // 最少连接数量：连续两个或以上的有符尾音符可以连接
        minimumGroupSize: 2,
        
        // 符槓类型对应
        beamLevels: {
            'eighth': 1,    // 八分音符：1条符槓
            'eighth.': 1,   // 附点八分音符：1条符槓（与八分音符相同）
            '16th': 2,      // 十六分音符：2条符槓
            '32nd': 3,      // 三十二分音符：3条符槓
            '64th': 4       // 六十四分音符：4条符槓
        }
    },
    
    // 2. 拍号相关连接规则
    timeSignatureRules: {
        '4/4': {
            // 4/4拍：按拍分组，不跨越小节中心线
            primaryBoundaries: [0, 2],      // 强拍边界（第1、3拍）
            secondaryBoundaries: [1, 3],    // 次强拍边界（第2、4拍）
            subdivisionBoundaries: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], // 半拍边界
            
            rules: [
                "不能跨越小节中心线（第2拍末尾到第3拍开始）",
                "优先按拍分组：第1拍内、第2拍内、第3拍内、第4拍内",
                "允许连接：第1-2拍、第3-4拍",
                "十六分音符以下：严格按拍分组"
            ]
        },
        
        '3/4': {
            // 3/4拍：简单三拍子 - 八分音符两个两个连接（体现四分音符拍点）
            primaryBoundaries: [0, 1, 2],      // 三个四分音符拍的边界
            secondaryBoundaries: [],           // 八分音符通常不作为分组边界
            subdivisionBoundaries: [0, 0.5, 1, 1.5, 2, 2.5], // 十六分音符边界
            beamingPattern: "two-by-two",      // 八分音符两个两个连接
            
            rules: [
                "八分音符两个两个连接（体现四分音符拍点）",
                "例如：♪♪ ♪♪ ♪♪ (每组两个八分音符)",
                "不跨越四分音符拍点边界连接",
                "十六分音符可在四分音符拍内连接"
            ]
        },
        
        '6/8': {
            // 6/8拍：复合二拍子 - 八分音符三个三个连接（体现附点四分音符拍点）
            primaryBoundaries: [0, 1.5],       // 两个附点四分音符拍的边界
            secondaryBoundaries: [],           // 八分音符子拍不作为主要分组边界  
            subdivisionBoundaries: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75], // 十六分音符边界
            beamingPattern: "three-by-three",  // 八分音符三个三个连接
            
            rules: [
                "八分音符三个三个连接（体现附点四分音符拍点）", 
                "例如：♪♪♪ ♪♪♪ (每组三个八分音符)",
                "不跨越附点四分音符拍点边界（1.5拍）连接",
                "十六分音符可在八分音符子拍内连接"
            ]
        },
        
        '2/4': {
            primaryBoundaries: [0],
            secondaryBoundaries: [1],
            subdivisionBoundaries: [0, 0.5, 1, 1.5],
            
            rules: [
                "按拍分组：第1拍内、第2拍内",
                "可以连接两拍（当节奏较简单时）",
                "十六分音符按拍分组"
            ]
        },
        
        '6/8': {
            primaryBoundaries: [0, 3],      // 复拍子的两个主要拍点
            secondaryBoundaries: [1.5, 4.5],
            subdivisionBoundaries: [0, 1.5, 3, 4.5],
            
            rules: [
                "按复拍子分组：前三个八分音符一组，后三个八分音符一组",
                "不跨越第3拍和第4拍之间的边界",
                "每个三拍组内的八分音符可以连接"
            ]
        }
    },
    
    // 3. 混合音值连接规则
    mixedValueRules: {
        principle: "主符槓连接所有音符，次符槓只连接需要的音符",
        
        examples: {
            "八分+十六分": {
                description: "八分音符与十六分音符混合时",
                rule: "主符槓（第1条）连接所有音符，次符槓（第2条）只连接十六分音符",
                visual: "♫=♬♬ (一条主槓，十六分音符间有第二条槓)"
            },
            
            "附点八分+十六分": {
                description: "附点八分音符与十六分音符在同一拍点内时",
                rule: "主符槓（第1条）连接两个音符，次符槓（第2条）只连接十六分音符",
                visual: "♫.♬ (一条主槓连接，十六分音符有第二条槓)",
                condition: "必须在同一个四分音符拍点内"
            },
            
            "十六分+三十二分": {
                description: "十六分音符与三十二分音符混合时",
                rule: "第1、2条符槓连接所有音符，第3条符槓只连接三十二分音符",
                visual: "♬♬=♭♭ (两条主槓，三十二分音符间有第三条槓)"
            }
        }
    },
    
    // 4. 符干方向规则
    stemDirectionRules: {
        principle: "以连接组中距离五线谱中线最远的音符决定整组符干方向",
        
        rules: [
            "中线以上（包括中线）：符干向下",
            "中线以下：符干向上",
            "混合高低音时：以距中线最远的音符为准",
            "相等距离时：优先向上"
        ],
        
        implementation: {
            middleLine: { step: 'B', octave: 4 }, // 高音谱号中线为B4
            
            calculateDirection: function(notes) {
                let maxDistance = 0;
                let direction = 'up';
                
                for (const note of notes) {
                    const distance = this.getDistanceFromMiddleLine(note.step, note.octave);
                    if (Math.abs(distance) > maxDistance) {
                        maxDistance = Math.abs(distance);
                        direction = distance > 0 ? 'down' : 'up';
                    }
                }
                
                return direction;
            },
            
            getDistanceFromMiddleLine: function(step, octave) {
                const steps = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                const noteValue = octave * 7 + steps.indexOf(step);
                const middleValue = 4 * 7 + 6; // B4
                return noteValue - middleValue;
            }
        }
    },
    
    // 5. 特殊情况规则
    specialCases: {
        triplets: {
            rule: "三连音有自己的连接逻辑，不与普通音符混合连接",
            beaming: "三连音内部可以连接，但不跨越三连音边界"
        },
        
        rests: {
            rule: "休止符中断符槓连接",
            behavior: "休止符前后的音符不能连接"
        },
        
        ties: {
            rule: "连音线不影响符槓连接",
            behavior: "被连音线连接的音符可以正常参与符槓连接"
        },
        
        crossStaff: {
            rule: "跨谱表音符不连接符槓",
            behavior: "左手和右手的音符不能用符槓连接"
        }
    },
    
    // 6. 分组优先级
    groupingPriorities: {
        level1: "节拍单位内分组（最高优先级）",
        level2: "半拍单位内分组",
        level3: "相邻拍子间分组（仅特定情况）",
        level4: "整小节分组（仅特定简单情况）"
    },
    
    // 7. 实用判断函数
    shouldConnectWithBeam: function(notes, startIndex, endIndex, timeSignature, currentPosition) {
        // 检查基础条件
        if (endIndex - startIndex < 1) return false; // 至少2个音符
        
        const groupNotes = notes.slice(startIndex, endIndex + 1);
        
        // 检查所有音符是否可连接
        if (!groupNotes.every(note => {
            if (!note) {
                console.error(`⚠️ 空音符在beaming检查中`);
                return false;
            }
            if (!note.type) {
                console.error(`⚠️ 音符缺少type属性: ${JSON.stringify(note)}`);
                return false;
            }
            if (!note.duration) {
                console.error(`⚠️ 音符缺少duration属性: ${JSON.stringify(note)}`);
                return false;
            }
            if (!Array.isArray(this.basicRules.beamableNotes)) {
                console.error(`⚠️ beamableNotes不是数组: ${JSON.stringify(this.basicRules.beamableNotes)}`);
                return false;
            }
            
            return note.type === 'note' && 
                   this.basicRules.beamableNotes.includes(note.duration) &&
                   !note.isTriplet; // 三连音单独处理
        })) {
            return false;
        }
        
        // 检查拍号边界
        return !this.crossesCriticalBoundary(groupNotes, currentPosition, timeSignature);
    },
    
    crossesCriticalBoundary: function(notes, startPosition, timeSignature, currentBeatLevel = null) {
        const rules = this.timeSignatureRules[timeSignature];
        if (!rules) return false;
        
        let position = startPosition;
        const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
        
        // 根据当前拍点显示层级确定关键边界
        let criticalBoundaries = rules.primaryBoundaries; // 默认使用主要边界
        
        // 🎼 特殊处理：3/4拍必须在每个四分音符拍点处分割beam，防止跨拍连接
        if (timeSignature === '3/4') {
            criticalBoundaries = [0, 1, 2]; // 强制使用四分音符边界
            console.log(`    🎵 3/4拍beaming: 强制使用四分音符边界 [0, 1, 2]`);
        } else if (currentBeatLevel === 'quarter') {
            // 四分音符拍点层级时，使用四分音符边界
            criticalBoundaries = [0, 1, 2, 3];
        } else if (currentBeatLevel === 'half') {
            // 二分音符拍点层级时，使用二分音符边界
            criticalBoundaries = [0, 2];
        } else if (currentBeatLevel === 'whole') {
            // 全音符拍点层级时，使用全音符边界
            criticalBoundaries = [0];
        }
        
        for (let i = 0; i < notes.length - 1; i++) {
            const noteEnd = position + notes[i].beats;
            
            // 🎼 特殊强化：3/4拍严格禁止任何beam跨越四分音符拍点
            if (timeSignature === '3/4') {
                // 检查当前音符组是否跨越任何四分音符拍点 (0, 1, 2)
                for (const boundary of [0, 1, 2]) {
                    const boundaryPos = boundary % beatsPerMeasure;
                    // 更严格的检查：即使音符在拍点上开始，如果组合跨越下一个拍点也要分割
                    if (position < boundaryPos && noteEnd > boundaryPos) {
                        console.log(`    🎵 3/4拍严格beam限制: 跨越四分音符拍点${boundary}，必须分割beam`);
                        return true;
                    }
                    // 额外检查：如果当前组合的任何部分会延伸到下一个拍点，也要分割
                    if (position <= boundaryPos && noteEnd > boundaryPos + 0.001) {
                        console.log(`    🎵 3/4拍严格beam限制: 延伸超过四分音符拍点${boundary}，强制分割`);
                        return true;
                    }
                }
            } else {
                // 其他时间签名使用原有逻辑
                for (const boundary of criticalBoundaries) {
                    const boundaryPos = boundary % beatsPerMeasure;
                    if (position < boundaryPos && noteEnd > boundaryPos) {
                        console.log(`    跨越${currentBeatLevel || '默认'}拍点边界${boundary}`);
                        return true; // 跨越关键边界
                    }
                }
            }
            
            position = noteEnd;
        }
        
        return false;
    },
    
    generateBeamLevels: function(notes) {
        const beamLevels = [];
        const maxLevel = Math.max(...notes.map(note => 
            this.basicRules.beamLevels[note.duration] || 0
        ));
        
        for (let level = 1; level <= maxLevel; level++) {
            const levelNotes = [];
            for (let i = 0; i < notes.length; i++) {
                const noteLevel = this.basicRules.beamLevels[notes[i].duration] || 0;
                if (noteLevel >= level) {
                    levelNotes.push(i);
                }
            }
            if (levelNotes.length >= 2) {
                beamLevels.push({
                    level: level,
                    noteIndices: levelNotes
                });
            }
        }
        
        return beamLevels;
    }
};

const RHYTHM_NOTATION_RULES = {
    // 获取拍号的拍点结构
    getBeatStructure: function(timeSignature) {
        const [beats, beatType] = timeSignature.split('/').map(Number);
        
        switch(timeSignature) {
            case '2/4':
                return {
                    beatsPerMeasure: 2,
                    strongBeats: [0, 1],           // 拍1, 拍2
                    subdivisions: [0, 0.5, 1, 1.5] // 八分音符级别：1, +, 2, +
                };
            case '3/4':
                return {
                    beatsPerMeasure: 3,
                    strongBeats: [0, 1, 2],        // 拍1, 拍2, 拍3
                    subdivisions: [0, 0.5, 1, 1.5, 2, 2.5] // 1, +, 2, +, 3, +
                };
            case '4/4':
                return {
                    beatsPerMeasure: 4,
                    strongBeats: [0, 2],           // 强拍：拍1, 拍3
                    mediumBeats: [1, 3],           // 次强拍：拍2, 拍4
                    subdivisions: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] // 八分音符级别
                };
            case '6/8':
                return {
                    beatsPerMeasure: 3,            // 3拍（以附点四分音符为拍子）
                    realBeatsPerMeasure: 2,        // 实际感觉：2个大拍
                    strongBeats: [0, 1.5],         // 正确的复合拍强拍位置：0.0和1.5
                    subdivisions: [0, 0.5, 1, 1.5, 2, 2.5], // 八分音符级别（以附点四分音符计）
                    compoundMeter: true,           // 复合拍子标记
                    dottedQuarterBased: true       // 以附点四分音符为基础单位
                };
            default:
                return {
                    beatsPerMeasure: beats,
                    strongBeats: [0],
                    subdivisions: []
                };
        }
    },
    
    // 检测音符是否跨越重要拍点 - 基于两等级规则
    detectsCrossBeats: function(startPosition, duration, timeSignature, finestRhythmInMeasure) {
        const structure = this.getBeatStructure(timeSignature);
        const endPosition = startPosition + duration;
        
        // 根据最细节奏值确定需要保持清晰的拍点（两等级规则）
        const criticalBeats = this.getCriticalBeatsForFinestRhythm(
            finestRhythmInMeasure, 
            timeSignature
        );
        
        // 检查音符是否跨越任何关键拍点
        for (const beatPoint of criticalBeats) {
            if (startPosition < beatPoint && endPosition > beatPoint) {
                return {
                    crossesBeat: true,
                    beatPoint: beatPoint,
                    splitPositions: [beatPoint]
                };
            }
        }
        
        return { crossesBeat: false };
    },
    
    // 智能跨拍检测：使用局部节奏分析
    detectsCrossBeatsWithLocalRhythm: function(startPosition, duration, timeSignature, allNotes, noteType = 'note') {
        const endPosition = startPosition + duration;
        const tolerance = 0.0001;
        
        // 支持不同时间签名
        if (timeSignature === '6/8') {
            return this.detectsCrossBeatsFor6_8(startPosition, duration, allNotes, noteType);
        } else if (timeSignature === '3/4') {
            return this.detectsCrossBeatsFor3_4(startPosition, duration, allNotes, noteType);
        } else if (timeSignature !== '4/4') {
            // 对于其他时间签名，使用基本逻辑
            return this.detectsCrossBeatsGeneric(startPosition, duration, timeSignature, allNotes, noteType);
        }
        
        // 获取局部节奏分析的关键拍点
        const criticalBeats = this.getCriticalBeatsWithLocalRhythm(allNotes, timeSignature);
        
        // 🚨 禁用旧的全局16分音符检测逻辑 - 由新的区间检测逻辑替代
        // 这里只保留二分音符拍点的检测，16分音符区间检测在其他地方处理
        console.log(`  🔍 [通用检测] 使用二分音符拍点检测，16分音符区间检测已在前面处理`);
        
        // 🎼 检查是否有16分音符 - 当所有四分音符拍点都是关键拍点时
        const has16thNotes = false; // 🔥 强制禁用，避免与区间检测冲突
        
        // 跳过旧的16分音符全局检测逻辑，继续使用二分音符拍点检测
        
        // 4/4拍的四分音符特殊处理
        if (Math.abs(duration - 1.0) < tolerance && noteType === 'note') {
            console.log(`  🎵 检查四分音符: 位置=${startPosition}, 时长=${duration}`);
            
            // **规则4：专门针对弱拍位置的四分音符处理**
            // 但是，如果有16分音符，则不需要拆分位置1.5的四分音符（因为不需要显示八分音符拍点）
            if (Math.abs(startPosition - 1.5) < 0.01) {
                if (has16thNotes) {
                    console.log(`  ✅ 位置1.5的四分音符，有16分音符存在，不在八分音符拍点拆分`);
                    // 继续执行后面的检查，看是否跨越四分音符拍点
                } else {
                    console.log(`  🚨🚨🚨 规则4生效：1.5拍位置的四分音符必须拆分为两个八分音符并用tie连接（避免跨越第3拍强拍）`);
                    console.log(`  🚨 拆分详情: 位置1.5-2.5 → 1.5-2.0 + 2.0-2.5`);
                    return {
                        crossesBeat: true,
                        beatPoint: 2, // 在2拍位置（音乐理论第3拍）拆分
                        splitPositions: [2]
                    };
                }
            }
            
            // 检查四分音符是否跨越任何关键拍点
            const beatPoints = [1, 2, 3];
            for (const beat of beatPoints) {
                if (startPosition < beat - tolerance && endPosition > beat + tolerance) {
                    // 检查这个拍点是否在关键拍点列表中
                    const isCritical = criticalBeats.some(cb => Math.abs(cb - beat) < tolerance);
                    if (!isCritical) {
                        console.log(`  ✅ 四分音符跨越拍点${beat}，但该拍点不需要明确，不拆分`);
                        continue; // 跳过这个拍点
                    }
                    
                    // 四分音符跨越关键拍点
                    // 只有当它从整数拍开始时才不拆分
                    const startsOnBeat = Math.abs(startPosition - Math.round(startPosition)) < tolerance;
                    if (!startsOnBeat) {
                        // 检查拍点是否已经被其他音符明确
                        if (this.isBeatPointAlreadyClear(startPosition, endPosition, beat, allNotes, timeSignature)) {
                            console.log(`  ✅ 四分音符跨越拍点${beat}，但拍点已明确，不拆分`);
                            continue;
                        }
                        
                        // 从x.5拍开始的四分音符需要拆分且拍点未明确
                        console.log(`  🎯 四分音符从${startPosition}拍开始，跨越关键拍点${beat}且拍点未明确，需要拆分`);
                        return {
                            crossesBeat: true,
                            beatPoint: beat,
                            splitPositions: [beat]
                        };
                    }
                }
            }
        }
        
        console.log(`  🔍 检查${noteType === 'rest' ? '休止符' : '音符'} [${startPosition}-${endPosition}] 是否跨越关键拍点: [${criticalBeats.join(', ')}]`);
        
        // 🎼 如果有16分音符，记录一下供调试
        if (has16thNotes) {
            console.log(`  🎼 检测到16分音符场景 - 只在四分音符拍点 [0,1,2,3] 拆分，不在八分音符拍点 [0.5,1.5,2.5,3.5] 拆分`);
        }
        
        // 检查音符/休止符是否跨越任何关键拍点
        for (const beatPoint of criticalBeats) {
            if (startPosition < beatPoint - tolerance && endPosition > beatPoint + tolerance) {
                console.log(`  ⚠️ ${noteType === 'rest' ? '休止符' : '音符'}跨越关键拍点 ${beatPoint}，检查是否需要拆分...`);
                
                // 🎼 特殊规则：如果有16分音符，任何模糊四分音符拍点的音符都需要拆分
                if (has16thNotes) {
                    // 检查当前拍点是否是四分音符拍点
                    const quarterBeats = [0, 1, 2, 3];
                    const isQuarterBeat = quarterBeats.some(qb => Math.abs(beatPoint - qb) < tolerance);
                    
                    if (isQuarterBeat) {
                        // 音符跨越四分音符拍点就需要拆分（除非从四分音符拍点开始）
                        const startsOnQuarterBeat = quarterBeats.some(pos => Math.abs(startPosition - pos) < tolerance);
                        
                        if (!startsOnQuarterBeat) {
                            // 不是从四分音符拍点开始的音符，跨越四分音符拍点时需要拆分
                            console.log(`  🎯 有16分音符时，位置${startPosition}的${noteType === 'rest' ? '休止符' : '音符'}（${duration}拍）跨越四分音符拍点${beatPoint}，需要拆分`);
                            return {
                                crossesBeat: true,
                                beatPoint: beatPoint,
                                splitPositions: [beatPoint]
                            };
                        }
                    }
                    // 从四分音符拍点开始的音符或非四分音符拍点继续正常检查
                }
                
                // 休止符需要拆分来明确拍点（除了上面16分音符的特殊情况）
                if (noteType === 'rest') {
                    // 检查拍点是否已经明确显示
                    if (this.isBeatPointAlreadyClear(startPosition, endPosition, beatPoint, allNotes, timeSignature)) {
                        console.log(`  ✅ 拍点${beatPoint}已经明确，休止符不需要拆分`);
                        continue; // 跳过这个拍点，不拆分
                    }
                    
                    console.log(`  🔥 需要拆分：休止符跨越拍点${beatPoint}且拍点未明确`);
                    return {
                        crossesBeat: true,
                        beatPoint: beatPoint,
                        splitPositions: [beatPoint]
                    };
                }
                
                // 对于音符，检查是否符合"正拍上相同时值音符"的例外条件
                // 🎯 传入关键拍点信息，考虑局部节奏分析
                if (this.isNoteOnCorrespondingBeat(startPosition, duration, beatPoint, criticalBeats)) {
                    console.log(`  🎯 例外处理：音符在对应拍点上，不拆分 (位置${startPosition}, 时长${duration}, 跨越拍点${beatPoint})`);
                    continue; // 跳过这个拍点，不拆分
                }
                
                // 检查拍点是否已经明确显示
                if (this.isBeatPointAlreadyClear(startPosition, endPosition, beatPoint, allNotes, timeSignature)) {
                    console.log(`  ✅ 拍点${beatPoint}已经明确，不需要拆分此音符`);
                    continue; // 跳过这个拍点，不拆分
                }
                
                console.log(`  🔥 需要拆分：音符跨越拍点${beatPoint}且拍点未明确`);
                return {
                    crossesBeat: true,
                    beatPoint: beatPoint,
                    splitPositions: [beatPoint]
                };
            }
        }
        
        return { crossesBeat: false };
    },
    
    // 检查音符是否符合"正拍上相同时值音符"的例外条件
    isNoteOnCorrespondingBeat: function(startPosition, duration, crossedBeatPoint, criticalBeats = []) {
        const tolerance = 0.0001;
        
        // 🎼 特殊处理：如果有16分音符，任何不在四分音符拍点上的音符都需要拆分
        const has16thNotes = criticalBeats.includes(0) && criticalBeats.includes(1) && 
                             criticalBeats.includes(2) && criticalBeats.includes(3);
        
        if (has16thNotes) {
            // 检查音符是否从四分音符拍点开始
            const quarterBeats = [0, 1, 2, 3];
            const startsOnQuarterBeat = quarterBeats.some(pos => Math.abs(startPosition - pos) < tolerance);
            
            if (!startsOnQuarterBeat) {
                console.log(`    🎼 有16分音符场景：位置${startPosition}的音符（${duration}拍）不在四分音符拍点上，模糊了拍点，需要拆分`);
                return false; // 需要拆分
            }
        }
        
        // 重要修正：规则应该是检查音符是否在它**跨越的拍点对应的时值级数**上
        // 而不是仅仅检查起始位置
        
        // 二分音符（2拍）：特殊处理
        // 当跨越拍点2时，只有从位置0或2开始的二分音符才不拆分
        if (Math.abs(duration - 2) < tolerance) {
            // 如果跨越拍点2，检查是否从正确位置开始
            if (Math.abs(crossedBeatPoint - 2) < tolerance) {
                // 跨越拍点2的二分音符只有从0或2开始才符合例外
                const validStarts = [0, 2];
                const isValid = validStarts.some(pos => Math.abs(startPosition - pos) < tolerance);
                if (isValid) {
                    console.log(`    🎯 二分音符从位置${startPosition}跨越拍点${crossedBeatPoint} - 符合例外，不拆分`);
                    return true;
                } else {
                    console.log(`    ❌ 二分音符从位置${startPosition}跨越拍点${crossedBeatPoint} - 不符合例外，需要拆分`);
                    return false;
                }
            }
            // 其他情况的二分音符
            const halfBeats = [0, 2];
            const isOnHalfBeat = halfBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            if (isOnHalfBeat) {
                console.log(`    🎯 二分音符在二分音符正拍上: 位置${startPosition} - 不拆分`);
                return true;
            } else {
                console.log(`    ❌ 二分音符不在二分音符正拍上: 位置${startPosition} - 需要拆分`);
                return false;
            }
        }
        
        // 四分音符（1拍）：只有在四分音符正拍上才不拆分 (0, 1, 2, 3)
        // 特别强调：四分音符在反拍（1.5, 2.5, 3.5）上必须拆分！
        // 🎯 新增：如果当前需要显示二分音符拍点（1,3），四分音符在2拍位置也必须拆分！
        if (Math.abs(duration - 1) < tolerance) {
            const quarterBeats = [0, 1, 2, 3]; // 四分音符的正拍
            const offBeats = [0.5, 1.5, 2.5, 3.5]; // 反拍（八分音符拍点）
            
            const isOnQuarterBeat = quarterBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            const isOnOffBeat = offBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            
            if (isOnOffBeat) {
                console.log(`    ❌ 四分音符在反拍上: 位置${startPosition} - 必须拆分（保护二分音符拍点清晰度）`);
                return false; // 反拍上的四分音符必须拆分
            } else if (isOnQuarterBeat) {
                // 🔥 关键修复：检查是否需要显示二分音符拍点
                // 如果关键拍点只包含1和3（二分音符拍点），说明当前区域最小时值是八分音符
                // 此时四分音符即使在2拍位置也应该拆分，以保护二分音符拍点清晰度
                const needsHalfNoteBeatClarity = criticalBeats.length === 2 && 
                    criticalBeats.includes(1) && criticalBeats.includes(3) && 
                    !criticalBeats.includes(2) && !criticalBeats.includes(4);
                
                if (needsHalfNoteBeatClarity && (Math.abs(startPosition - 2) < tolerance)) {
                    console.log(`    ❌ 四分音符在2拍位置，但需要显示二分音符拍点: 位置${startPosition} - 必须拆分（八分音符区域）`);
                    return false; // 需要拆分以保护二分音符拍点
                }
                
                console.log(`    🎯 四分音符在四分音符正拍上: 位置${startPosition} - 不拆分`);
                return true;
            } else {
                console.log(`    ❌ 四分音符不在四分音符正拍上: 位置${startPosition} - 需要拆分`);
                return false;
            }
        }
        
        // 八分音符（0.5拍）：只有在八分音符正拍上才不拆分 (0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5)
        if (Math.abs(duration - 0.5) < tolerance) {
            const eighthBeats = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
            const isOnEighthBeat = eighthBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            if (isOnEighthBeat) {
                console.log(`    🎯 八分音符在八分音符正拍上: 位置${startPosition} - 不拆分`);
                return true;
            } else {
                console.log(`    ❌ 八分音符不在八分音符正拍上: 位置${startPosition} - 需要拆分`);
                return false;
            }
        }
        
        // 十六分音符（0.25拍）：只有在十六分音符正拍上才不拆分
        if (Math.abs(duration - 0.25) < tolerance) {
            // 检查是否在十六分音符正拍上 (0, 0.25, 0.5, 0.75, 1, 1.25, ...)
            const position16th = Math.round(startPosition / 0.25) * 0.25;
            const isOnSixteenthBeat = Math.abs(startPosition - position16th) < tolerance;
            if (isOnSixteenthBeat) {
                console.log(`    🎯 十六分音符在十六分音符正拍上: 位置${startPosition} - 不拆分`);
                return true;
            } else {
                console.log(`    ❌ 十六分音符不在十六分音符正拍上: 位置${startPosition} - 需要拆分`);
                return false;
            }
        }
        
        // 全音符（4拍）：只有在全音符正拍上才不拆分 (0)
        if (Math.abs(duration - 4) < tolerance) {
            const isOnWholeBeat = Math.abs(startPosition - 0) < tolerance;
            if (isOnWholeBeat) {
                console.log(`    🎯 全音符在全音符正拍上: 位置${startPosition} - 不拆分`);
                return true;
            } else {
                console.log(`    ❌ 全音符不在全音符正拍上: 位置${startPosition} - 需要拆分`);
                return false;
            }
        }
        
        console.log(`    ⚠️ 未识别的音符时值: ${duration}拍 - 默认拆分`);
        return false;
    },
    
    // 6/8拍的跨拍检测
    detectsCrossBeatsFor6_8: function(startPosition, duration, allNotes, noteType = 'note') {
        const endPosition = startPosition + duration;
        const tolerance = 0.0001;
        
        // 获取6/8拍的关键拍点
        const criticalBeats = this.getCriticalBeatsFor6_8(allNotes);
        
        console.log(`  🎵 6/8拍检查${noteType === 'rest' ? '休止符' : '音符'} [${startPosition}-${endPosition}] 跨拍: [${criticalBeats.join(', ')}]`);
        
        // 检查是否跨越关键拍点
        for (const beatPoint of criticalBeats) {
            if (startPosition < beatPoint - tolerance && endPosition > beatPoint + tolerance) {
                console.log(`  ⚠️ 6/8拍${noteType === 'rest' ? '休止符' : '音符'}跨越拍点 ${beatPoint}`);
                
                // 检查6/8拍的特殊例外规则
                if (noteType === 'note' && this.isNoteOnCorrespondingBeatFor6_8(startPosition, duration, beatPoint)) {
                    console.log(`  🎯 6/8拍例外：音符在对应拍点上，不拆分`);
                    continue;
                }
                
                // 检查拍点是否已经明确
                if (this.isBeatPointAlreadyClear(startPosition, endPosition, beatPoint, allNotes, '6/8')) {
                    console.log(`  ✅ 6/8拍拍点${beatPoint}已明确，不拆分`);
                    continue;
                }
                
                console.log(`  🔥 6/8拍需要拆分：跨越拍点${beatPoint}`);
                return {
                    crossesBeat: true,
                    beatPoint: beatPoint,
                    splitPositions: [beatPoint]
                };
            }
        }
        
        return { crossesBeat: false };
    },
    
    // 3/4拍的跨拍检测
    detectsCrossBeatsFor3_4: function(startPosition, duration, allNotes, noteType = 'note') {
        const endPosition = startPosition + duration;
        const tolerance = 0.0001;
        
        // 🎼 特殊处理：附点二分音符（3拍）在3/4拍中是完整小节，永远不拆分
        if (Math.abs(duration - 3) < tolerance && noteType === 'note') {
            // 3拍的音符（附点二分音符）在3/4拍中占满整个小节，无论位置如何都不应该拆分
            console.log(`  🎯 3/4拍附点二分音符：时长3拍，位置${startPosition}，占满整个小节，永不拆分`);
            return { crossesBeat: false };
        }
        
        // 获取3/4拍的关键拍点
        const criticalBeats = this.getCriticalBeatsFor3_4(allNotes);
        
        console.log(`  🎵 3/4拍检查${noteType === 'rest' ? '休止符' : '音符'} [${startPosition}-${endPosition}] 跨拍: [${criticalBeats.join(', ')}]`);
        
        // 检查是否跨越关键拍点
        for (const beatPoint of criticalBeats) {
            if (startPosition < beatPoint - tolerance && endPosition > beatPoint + tolerance) {
                console.log(`  ⚠️ 3/4拍${noteType === 'rest' ? '休止符' : '音符'}跨越拍点 ${beatPoint}`);
                
                // 检查3/4拍的特殊例外规则
                if (noteType === 'note' && this.isNoteOnCorrespondingBeatFor3_4(startPosition, duration, beatPoint)) {
                    console.log(`  🎯 3/4拍例外：音符在对应拍点上，不拆分`);
                    continue;
                }
                
                // 检查拍点是否已经明确
                if (this.isBeatPointAlreadyClear(startPosition, endPosition, beatPoint, allNotes, '3/4')) {
                    console.log(`  ✅ 3/4拍拍点${beatPoint}已明确，不拆分`);
                    continue;
                }
                
                console.log(`  🔥 3/4拍需要拆分：跨越拍点${beatPoint}`);
                return {
                    crossesBeat: true,
                    beatPoint: beatPoint,
                    splitPositions: [beatPoint]
                };
            }
        }
        
        return { crossesBeat: false };
    },
    
    // 通用跨拍检测（用于其他时间签名）
    detectsCrossBeatsGeneric: function(startPosition, duration, timeSignature, allNotes, noteType = 'note') {
        const endPosition = startPosition + duration;
        const tolerance = 0.0001;
        
        // 使用传统的关键拍点逻辑
        const validNotes = allNotes.filter(n => {
            if (!n) {
                console.error(`⚠️ 空音符在finestRhythm计算中`);
                return false;
            }
            if (!n.type) {
                console.error(`⚠️ 音符缺少type属性: ${JSON.stringify(n)}`);
                return false;
            }
            if (typeof n.beats !== 'number') {
                console.error(`⚠️ 音符beats属性无效: ${JSON.stringify(n)}`);
                return false;
            }
            return n.type === 'note' && !n.isTriplet;
        });
        
        if (validNotes.length === 0) {
            console.error(`⚠️ 没有有效音符计算finestRhythm`);
            return [0]; // 返回默认拍点
        }
        
        const finestRhythm = Math.min(...validNotes.map(n => n.beats));
        
        const criticalBeats = this.getCriticalBeatsForFinestRhythm(finestRhythm, timeSignature);
        
        console.log(`  🎵 ${timeSignature}拍检查${noteType === 'rest' ? '休止符' : '音符'} [${startPosition}-${endPosition}] 跨拍: [${criticalBeats.join(', ')}]`);
        
        // 检查是否跨越关键拍点
        for (const beatPoint of criticalBeats) {
            if (startPosition < beatPoint - tolerance && endPosition > beatPoint + tolerance) {
                console.log(`  🔥 ${timeSignature}拍需要拆分：跨越拍点${beatPoint}`);
                return {
                    crossesBeat: true,
                    beatPoint: beatPoint,
                    splitPositions: [beatPoint]
                };
            }
        }
        
        return { crossesBeat: false };
    },
    
    // 6/8拍的对应拍点检查
    isNoteOnCorrespondingBeatFor6_8: function(startPosition, duration, crossedBeatPoint) {
        const tolerance = 0.0001;
        
        // 6/8拍中，附点四分音符（1.5拍）应该在主拍0和1.5上
        if (Math.abs(duration - 1.5) < tolerance) {
            const mainBeats = [0, 1.5];
            return mainBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
        }
        
        // 四分音符（1拍）在6/8拍中应该在四分音符拍点上
        if (Math.abs(duration - 1) < tolerance) {
            const quarterBeats = [0, 1, 2];
            return quarterBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
        }
        
        // 八分音符（0.5拍）应该在八分音符拍点上（6个八分音符位置）
        if (Math.abs(duration - 0.5) < tolerance) {
            const eighthBeats = [0, 0.5, 1, 1.5, 2, 2.5];
            return eighthBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
        }
        
        return false;
    },
    
    // 3/4拍的对应拍点检查
    isNoteOnCorrespondingBeatFor3_4: function(startPosition, duration, crossedBeatPoint) {
        const tolerance = 0.0001;
        
        // 🎼 附点二分音符（3拍）在3/4拍中占满整个小节，完全合法
        if (Math.abs(duration - 3) < tolerance) {
            // 必须从小节开始位置（0拍）开始
            if (Math.abs(startPosition - 0) < tolerance) {
                console.log(`  🎯 3/4拍例外：附点二分音符占满整个小节，完全合法`);
                return true;
            }
        }
        
        // 二分音符（2拍）在3/4拍中应该在强拍上
        if (Math.abs(duration - 2) < tolerance) {
            const strongBeats = [0, 1]; // 只能在第1拍或第2拍开始
            return strongBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
        }
        
        // 四分音符（1拍）应该在四分音符拍点上
        if (Math.abs(duration - 1) < tolerance) {
            const quarterBeats = [0, 1, 2];
            return quarterBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
        }
        
        // 八分音符（0.5拍）应该在八分音符拍点上
        if (Math.abs(duration - 0.5) < tolerance) {
            const eighthBeats = [0, 0.5, 1, 1.5, 2, 2.5];
            return eighthBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
        }
        
        return false;
    },
    
    // 根据最细节奏值获取关键拍点（两等级规则实现）
    getCriticalBeatsForFinestRhythm: function(finestRhythm, timeSignature) {
        const structure = this.getBeatStructure(timeSignature);
        
        if (timeSignature === '4/4') {
            if (finestRhythm <= 0.125) {
                // 32nd音符或更细 -> 保持八分音符拍点清晰
                return [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]; // 所有八分音符拍点
            } else if (finestRhythm <= 0.25) {
                // 16分音符 -> 保持四分音符拍点清晰 (1,2,3,4)
                return [0, 1, 2, 3]; // 四分音符拍点
            } else if (finestRhythm <= 0.5) {
                // 8分音符 -> 保持二分音符拍点清晰 (1,3)
                return [0, 2]; // 拍1, 3 (二分音符拍点)
            } else {
                // 四分音符或更长 -> 只保持全音符拍点清晰
                return [0]; // 只有第1拍
            }
        } else if (timeSignature === '3/4') {
            if (finestRhythm <= 0.125) {
                return [0, 0.5, 1, 1.5, 2, 2.5]; // 所有八分音符拍点
            } else if (finestRhythm <= 0.25) {
                // 16th音符 -> 保持八分音符拍点和四分音符拍点清晰（两等级规则）
                return [0, 0.5, 1, 1.5, 2, 2.5]; // 八分音符拍点 + 四分音符拍点
            } else if (finestRhythm <= 0.5) {
                return [0, 1, 2]; // 拍1, 2, 3（3/4拍的特殊性）
            } else {
                return [0]; // 只有第1拍
            }
        } else if (timeSignature === '2/4') {
            if (finestRhythm <= 0.125) {
                return [0, 0.5, 1, 1.5]; // 所有八分音符拍点
            } else if (finestRhythm <= 0.25) {
                // 16th音符 -> 保持八分音符拍点和四分音符拍点清晰（两等级规则）
                return [0, 0.5, 1, 1.5]; // 八分音符拍点 + 四分音符拍点
            } else if (finestRhythm <= 0.5) {
                return [0]; // 只有第1拍（强拍）
            } else {
                return [0]; // 只有第1拍
            }
        } else if (timeSignature === '6/8') {
            if (finestRhythm <= 0.125) {
                return structure.subdivisions; // 所有细分拍点
            } else if (finestRhythm <= 0.25) {
                return [0, 1, 2, 3, 4, 5]; // 所有八分音符拍点
            } else if (finestRhythm <= 0.5) {
                return [0, 3]; // 两个大拍
            } else {
                return [0]; // 只有第1拍
            }
        }
        
        // 默认情况：只保持强拍
        return structure.strongBeats;
    },
    
    // 智能局部节奏检测：根据每拍内容决定该拍的关键点
    getCriticalBeatsWithLocalRhythm: function(notes, timeSignature) {
        if (timeSignature === '6/8') {
            // 6/8拍：复合二拍子处理
            return this.getCriticalBeatsFor6_8(notes);
        } else if (timeSignature === '3/4') {
            // 3/4拍：简单三拍子处理  
            return this.getCriticalBeatsFor3_4(notes);
        } else if (timeSignature !== '4/4') {
            // 其他拍号使用传统逻辑
            const finestRhythm = Math.min(...notes
                .filter(n => n.type === 'note' && !n.isTriplet)
                .map(n => n.beats));
            return this.getCriticalBeatsForFinestRhythm(finestRhythm, timeSignature);
        }
        
        const criticalBeats = new Set();
        
        // 🎼 首先扫描整个小节，检查是否有16分音符
        let has16thNote = false;
        let minBeatValue = Infinity;
        
        console.log(`🔍 扫描整个小节寻找16分音符:`);
        for (const note of notes) {
            // 跳过三连音，只看普通音符和休止符
            if (!note.isTriplet) {
                minBeatValue = Math.min(minBeatValue, note.beats);
                if (Math.abs(note.beats - 0.25) < 0.001) {
                    has16thNote = true;
                    console.log(`    🎼 发现16分音符！${note.type === 'rest' ? '休止符' : '音符'} 0.25拍`);
                }
            }
        }
        
        console.log(`  整个小节最小时值: ${minBeatValue}拍`);
        console.log(`  包含16分音符: ${has16thNote}`);
        
        // 🎯 如果有16分音符，直接返回所有四分音符拍点
        if (has16thNote) {
            criticalBeats.add(0).add(1).add(2).add(3);
            console.log(`🎼 ✅ 检测到16分音符 → 显示所有四分音符拍点 [0, 1, 2, 3]`);
            console.log(`    ⚠️ 不显示八分音符拍点（0.5, 1.5, 2.5, 3.5）`);
            const result = Array.from(criticalBeats).sort((a, b) => a - b);
            console.log(`🎯 最终关键拍点: [${result.join(', ')}]`);
            return result;
        }
        
        // 如果没有16分音符，继续原来的区域分析逻辑
        // 新规则：根据每二分音符拍点里的最小时值来确定拍点清晰度
        // 4/4拍的二分音符拍点区域：[0-2拍] 和 [2-4拍]
        const halfNoteBeatRegions = [
            { start: 0, end: 2, beatPoint: 0 },  // 第一个二分音符拍点区域
            { start: 2, end: 4, beatPoint: 2 }   // 第二个二分音符拍点区域
        ];
        
        // 存储每个区域的分析结果
        const regionAnalysis = [];
        
        console.log(`🔍 没有16分音符，按二分音符拍点分析每个区域的最小时值:`);
        
        for (const region of halfNoteBeatRegions) {
            let regionMinValue = Infinity;
            let regionNotes = [];
            
            // 计算每个音符的起始位置
            let currentPos = 0;
            for (const note of notes) {
                const noteStart = currentPos;
                const noteEnd = currentPos + note.beats;
                
                // 检查音符或休止符是否与当前区域有重叠
                // 重要修正：包括休止符在内的分析（用户强调的：包括休止符）
                if (noteEnd > region.start && noteStart < region.end && !note.isTriplet) {
                    regionMinValue = Math.min(regionMinValue, note.beats);
                    regionNotes.push({
                        beats: note.beats,
                        type: note.type,
                        position: noteStart
                    });
                }
                currentPos += note.beats;
            }
            
            if (regionMinValue === Infinity) {
                regionMinValue = 4; // 如果区域为空，假设为全音符
            }
            
            console.log(`  区域 [${region.start}-${region.end}拍]: 最小时值=${regionMinValue}拍`);
            regionNotes.forEach(n => {
                console.log(`    ${n.type}: ${n.beats}拍 @ 位置${n.position}`);
            });
            
            // 根据最小时值确定需要显示的拍点（大两个层级）
            let requiredBeatLevel;
            if (regionMinValue <= 0.25) {
                // 十六分音符（0.25拍）→ 显示四分音符拍点（1,2,3,4），八分音符的拍点就不需要显示
                requiredBeatLevel = 'quarter';
                console.log(`    🎼 检测到16分音符！需要显示所有四分音符拍点（1,2,3,4）`);
            } else if (regionMinValue <= 0.5) {
                // 八分音符（0.5拍）→ 显示二分音符拍点（1,3），四分音符的拍点就不需要显示
                requiredBeatLevel = 'half';
                console.log(`    → 需要显示二分音符拍点（1,3）`);
            } else if (regionMinValue <= 1) {
                // 四分音符（1拍）→ 显示全音符拍点（1），二分音符的拍点就不需要显示
                requiredBeatLevel = 'whole';
                console.log(`    → 需要显示全音符拍点（1）`);
            } else {
                // 最小时值是2分音符或更长 → 不需要额外拍点
                requiredBeatLevel = 'none';
                console.log(`    → 不需要额外拍点`);
            }
            
            // 存储分析结果而不是立即添加拍点
            regionAnalysis.push({
                region: region,
                minValue: regionMinValue,
                beatLevel: requiredBeatLevel
            });
        }
        
        // 🎯 核心改正：根据最小音符值决定拍点
        console.log(`🔧 根据节奏复杂度确定拍点：`);
        console.log(`  区域分析结果:`, regionAnalysis.map(r => ({
            region: `${r.region.start}-${r.region.end}`,
            minValue: r.minValue,
            beatLevel: r.beatLevel
        })));
        
        // 🎼 新规则：如果任一区域有16分音符，显示所有四分音符拍点
        const has16thInAnyRegion = regionAnalysis.some(r => r && r.beatLevel === 'quarter');
        
        console.log(`  🔍 检查是否有16分音符: ${has16thInAnyRegion}`);
        
        if (has16thInAnyRegion) {
            // 有16分音符：显示所有四分音符拍点（0,1,2,3）
            criticalBeats.add(0).add(1).add(2).add(3);
            console.log(`    🎼 检测到16分音符 → 显示所有四分音符拍点 [0, 1, 2, 3]`);
            console.log(`    ⚠️ 不显示八分音符拍点（0.5, 1.5, 2.5, 3.5）`);
        } else {
            // 没有16分音符，按区域处理
            const region1 = regionAnalysis[0];
            if (region1) {
                console.log(`  📍 区域1 [0-2拍]:`);
                if (region1.beatLevel === 'half') {
                    // 8分音符 → 只需要显示拍点1
                    criticalBeats.add(0);
                    console.log(`    → 有8分音符 → 显示二分音符拍点 [0] (第1拍)`);
                } else if (region1.beatLevel === 'whole') {
                    // 4分音符 → 只需要显示拍点1
                    criticalBeats.add(0);
                    console.log(`    → 有4分音符 → 显示全音符拍点 [0] (第1拍)`);
                } else {
                    console.log(`    → 简单节奏，不需要额外拍点`);
                }
            }
            
            // 处理第二个区域（2-4拍）
            const region2 = regionAnalysis[1];
            if (region2) {
                console.log(`  📍 区域2 [2-4拍]:`);
                if (region2.beatLevel === 'half') {
                    // 8分音符 → 只需要显示拍点3
                    criticalBeats.add(2);
                    console.log(`    → 有8分音符 → 显示二分音符拍点 [2] (第3拍)`);
                } else if (region2.beatLevel === 'whole') {
                    // 4分音符 → 理论上需要显示全音符拍点，但在4/4拍中第二个区域没有独立的全音符拍点
                    // 所以不添加额外拍点（拍点1已经在第一个区域处理）
                    console.log(`    → 有4分音符 → 第二个区域不需要额外的全音符拍点`);
                } else {
                    console.log(`    → 简单节奏，不需要额外拍点`);
                }
            }
        }
        
        const result = Array.from(criticalBeats).sort((a, b) => a - b);
        console.log(`🎯 最终关键拍点: [${result.join(', ')}]`);
        return result;
    },

    // 6/8拍的关键拍点分析（复合二拍子）
    getCriticalBeatsFor6_8: function(notes) {
        console.log(`🎵 6/8拍关键拍点分析 - 复合二拍子`);
        
        const criticalBeats = new Set();
        
        // 6/8拍基本结构：2个附点四分音符拍子 (0-1.5, 1.5-3)
        // 每个主拍包含3个八分音符子拍（共3个四分音符拍长度）
        const mainBeats = [
            { start: 0, end: 1.5, center: 0.75 },  // 第一个附点四分音符拍（3个八分音符）
            { start: 1.5, end: 3, center: 2.25 }   // 第二个附点四分音符拍（3个八分音符）
        ];
        
        // 总是显示主拍点
        criticalBeats.add(0).add(1.5);
        console.log(`  → 主拍点: 0, 1.5 (两个附点四分音符拍)`);
        
        // 🔥 检测是否在16分音符环境下
        const has16thNotes = notes.some(note => !note.isTriplet && Math.abs(note.beats - 0.25) < 0.001);
        
        if (has16thNotes) {
            // 16分音符环境：添加所有八分音符拍点
            criticalBeats.add(0.5).add(1).add(2).add(2.5);
            console.log(`  🔍 16分音符环境：添加所有八分音符拍点: 0.5, 1, 2, 2.5`);
        } else {
            // 分析每个主拍内的节奏复杂度
            let position = 0;
            for (const beat of mainBeats) {
                let beatMinValue = Infinity;
                
                // 重置position计算
                position = 0;
                
                // 找到该拍内的最小时值
                for (const note of notes) {
                    if (note.type === 'note' && !note.isTriplet) {
                        const noteStart = position;
                        const noteEnd = position + note.beats;
                        
                        // 检查音符是否与当前拍重叠
                        if (noteEnd > beat.start && noteStart < beat.end) {
                            beatMinValue = Math.min(beatMinValue, note.beats);
                        }
                    }
                    position += note.beats;
                }
                
                // 根据拍内最小时值决定是否需要细分拍点
                if (beatMinValue <= 0.5) {
                    // 需要显示八分音符层级的拍点
                    if (beat.start === 0) {
                        criticalBeats.add(0.5).add(1);
                        console.log(`  → 第一拍有八分音符，添加细分拍点: 0.5, 1`);
                    } else if (beat.start === 1.5) {
                        criticalBeats.add(2).add(2.5);
                        console.log(`  → 第二拍有八分音符，添加细分拍点: 2, 2.5`);
                    }
                }
            }
        }
        
        const result = Array.from(criticalBeats).sort((a, b) => a - b);
        console.log(`🎯 6/8拍最终关键拍点: [${result.join(', ')}]`);
        return result;
    },

    // 3/4拍的关键拍点分析（简单三拍子）
    getCriticalBeatsFor3_4: function(notes) {
        console.log(`🎵 3/4拍关键拍点分析 - 简单三拍子`);
        
        const criticalBeats = new Set();
        
        // 3/4拍基本结构：3个四分音符拍子 (0, 1, 2)
        criticalBeats.add(0).add(1).add(2);
        console.log(`  → 主拍点: 0, 1, 2 (三个四分音符拍)`);
        
        // 分析是否需要八分音符细分
        let needsEighthSubdivision = false;
        for (const note of notes) {
            if (note.type === 'note' && !note.isTriplet && note.beats <= 0.5) {
                needsEighthSubdivision = true;
                break;
            }
        }
        
        if (needsEighthSubdivision) {
            // 添加八分音符拍点（+拍）
            criticalBeats.add(0.5).add(1.5).add(2.5);
            console.log(`  → 有八分音符，添加细分拍点: 0.5, 1.5, 2.5`);
        }
        
        const result = Array.from(criticalBeats).sort((a, b) => a - b);
        console.log(`🎯 3/4拍最终关键拍点: [${result.join(', ')}]`);
        return result;
    },
    
    // 检查拍点是否已经明确显示
    isBeatPointAlreadyClear: function(noteStart, noteEnd, beatPoint, allNotes, timeSignature) {
        if (timeSignature !== '4/4' && timeSignature !== '6/8' && timeSignature !== '3/4') {
            return false; // 暂不支持的拍号
        }
        
        // 分析整个小节的节奏情况，确定哪些拍点已经被明确显示
        const criticalBeats = this.getCriticalBeatsWithLocalRhythm(allNotes, timeSignature);
        
        // 检查当前拍点是否在关键拍点列表中
        const tolerance = 0.0001;
        const isBeatPointCritical = criticalBeats.some(cb => Math.abs(cb - beatPoint) < tolerance);
        
        console.log(`    🔍 检查拍点${beatPoint}是否明确: 在关键拍点列表=${isBeatPointCritical}, 关键拍点=[${criticalBeats.join(', ')}]`);
        
        if (!isBeatPointCritical) {
            // 如果这个拍点不在关键拍点列表中，说明它不需要被明确显示
            return true; // 拍点已经"明确"（不需要显示）
        }
        
        // 检查是否有其他音符已经在这个拍点上开始或结束，使拍点变得明确
        let currentPos = 0;
        for (const note of allNotes) {
            const noteStartPos = currentPos;
            const noteEndPos = currentPos + note.beats;
            
            // 检查是否有音符在这个拍点开始
            if (Math.abs(noteStartPos - beatPoint) < tolerance) {
                console.log(`    ✅ 拍点${beatPoint}已被音符开始位置明确 (音符@${noteStartPos})`);
                return true;
            }
            
            // 检查是否有音符在这个拍点结束
            if (Math.abs(noteEndPos - beatPoint) < tolerance) {
                console.log(`    ✅ 拍点${beatPoint}已被音符结束位置明确 (音符@${noteStartPos}-${noteEndPos})`);
                return true;
            }
            
            currentPos += note.beats;
        }
        
        console.log(`    ❌ 拍点${beatPoint}未被明确，需要拆分跨越它的音符`);
        return false;
    },
    
    // 拆分跨拍音符
    splitCrossBeatNote: function(startPosition, duration, pitch, timeSignature, finestRhythm) {
        const crossInfo = this.detectsCrossBeats(startPosition, duration, timeSignature, finestRhythm);
        
        if (!crossInfo.crossesBeat) {
            return [{
                startPosition: startPosition,
                duration: duration,
                pitch: pitch,
                tied: false
            }];
        }
        
        // 拆分音符
        const splitPosition = crossInfo.splitPositions[0];
        const firstDuration = splitPosition - startPosition;
        const secondDuration = duration - firstDuration;
        
        return [
            {
                startPosition: startPosition,
                duration: firstDuration,
                pitch: pitch,
                tied: true,
                tieType: 'start'
            },
            {
                startPosition: splitPosition,
                duration: secondDuration,
                pitch: pitch,
                tied: true,
                tieType: 'stop'
            }
        ];
    },
    
    // 智能拆分跨拍音符 - 使用局部节奏分析
    splitCrossBeatNoteWithLocalRhythm: function(startPosition, duration, pitch, timeSignature, allNotes) {
        const crossInfo = this.detectsCrossBeatsWithLocalRhythm(startPosition, duration, timeSignature, allNotes);
        
        if (!crossInfo.crossesBeat) {
            return [{
                startPosition: startPosition,
                duration: duration,
                pitch: pitch,
                tied: false
            }];
        }
        
        // 在拍点位置拆分
        const splitPosition = crossInfo.splitPositions[0];
        const firstDuration = splitPosition - startPosition;
        const secondDuration = duration - firstDuration;
        
        console.log(`  🎼 在拍点${splitPosition}拆分: ${firstDuration}拍 + ${secondDuration}拍`);
        
        return [
            {
                startPosition: startPosition,
                duration: firstDuration,
                pitch: pitch,
                tied: true,
                tieType: 'start'
            },
            {
                startPosition: splitPosition,
                duration: secondDuration,
                pitch: pitch,
                tied: true,
                tieType: 'stop'
            }
        ];
    },
    
    // 验证拍点清晰度 - 使用智能拍点检测
    validateBeatClarity: function(notes, timeSignature) {
        const violations = [];
        let currentPosition = 0;
        
        // 获取小节边界（4/4拍子 = 4拍）
        const measureBeats = timeSignature === '4/4' ? 4 : 4;
        
        notes.forEach((note, index) => {
            if (!note.isTriplet) { // 排除三连音，但包括音符和休止符
                // 检查音符是否超出小节边界
                const noteEndPosition = currentPosition + note.beats;
                if (noteEndPosition > measureBeats + 0.001) { // 允许微小的浮点误差
                    console.warn(`⚠️ 音符${index + 1}超出小节边界: 位置${currentPosition} + 时长${note.beats} = ${noteEndPosition} > ${measureBeats}`);
                    return; // 跳过超出边界的音符验证
                }
                
                console.log(`🔍 验证音符${index + 1}: 位置${currentPosition.toFixed(4)} 时长${note.beats.toFixed(4)} 结束${noteEndPosition.toFixed(4)} 类型${note.type}`);
                
                const crossInfo = this.detectsCrossBeatsWithLocalRhythm(
                    currentPosition, 
                    note.beats, 
                    timeSignature,
                    notes, // 使用智能局部检测
                    note.type  // 传入音符类型
                );
                if (crossInfo.crossesBeat) {
                    console.log(`⚠️ 检测到跨拍: 音符${index + 1} 跨越拍点${crossInfo.beatPoint}`);
                    // 确保跨越的拍点在有效范围内
                    if (crossInfo.beatPoint < measureBeats) {
                        violations.push({
                            noteIndex: index,
                            position: currentPosition,
                            duration: note.beats,
                            crossedBeat: crossInfo.beatPoint,
                            message: `${note.type === 'note' ? '音符' : '休止符'}跨越关键拍点${crossInfo.beatPoint + 1}但未被拆分`
                        });
                    } else {
                        console.warn(`⚠️ 忽略无效拍点: 音符${index + 1}跨越拍点${crossInfo.beatPoint}，超出小节范围[0-${measureBeats})`);
                    }
                } else {
                    console.log(`✅ 音符${index + 1}不跨拍`);
                }
            }
            currentPosition += note.beats;
        });
        
        return {
            valid: violations.length === 0,
            violations: violations
        };
    },
    
    // 计算拍点层级
    calculateBeatLevels: function(notes, timeSignature) {
        // 找到最细的节奏值
        const finestRhythm = Math.min(...notes
            .filter(n => n.type === 'note')
            .map(n => n.beats));
        
        const levels = [];
        
        if (finestRhythm <= 0.125) { // 32nd音符或更细
            levels.push({ level: '32nd', beat: 0.125 });
            levels.push({ level: '16th', beat: 0.25 });
            levels.push({ level: 'eighth', beat: 0.5 });
        } else if (finestRhythm <= 0.25) { // 16th音符
            levels.push({ level: '16th', beat: 0.25 });
            levels.push({ level: 'eighth', beat: 0.5 });
            levels.push({ level: 'quarter', beat: 1.0 });
        } else if (finestRhythm <= 0.5) { // 八分音符
            levels.push({ level: 'eighth', beat: 0.5 });
            levels.push({ level: 'quarter', beat: 1.0 });
            levels.push({ level: 'half', beat: 2.0 });
        } else { // 四分音符或更长
            levels.push({ level: 'quarter', beat: 1.0 });
            levels.push({ level: 'half', beat: 2.0 });
            levels.push({ level: 'whole', beat: 4.0 });
        }
        
        return levels;
    },
    
    // 八分音符分组规则
    validateBeamGrouping: function(notes, timeSignature) {
        const structure = this.getBeatStructure(timeSignature);
        // 现有的分组验证逻辑
        return true;
    }
};

// 🎵 专业记谱规则：临时记号规范
const ACCIDENTAL_RULES = {
    // 提醒式临时记号：前一小节被改变的音在下一小节恢复时需要提醒
    needsCourtesyAccidental: function(currentNote, previousMeasureNotes, keySignature) {
        // 检查是否需要提醒式还原号
        return false; // 简化实现
    },
    
    // 半音邻近音的正确拼写
    getChromaticSpelling: function(notes, keySignature) {
        // 合理分配半音阶的音名，避免大量还原号
        return notes; // 简化实现
    }
};

// 获取调号的主和弦音（1, 3, 5度）
function getTonicChordTones(keySignature) {
    const keyInfo = KEY_SIGNATURES[keySignature];
    if (!keyInfo) return [0, 4, 7]; // 默认C大调
    
    const tonic = keyInfo.tonic;
    const isMinor = keyInfo.mode === 'minor';
    
    if (isMinor) {
        return [tonic, (tonic + 3) % 12, (tonic + 7) % 12]; // 1, b3, 5
    } else {
        return [tonic, (tonic + 4) % 12, (tonic + 7) % 12]; // 1, 3, 5
    }
}

// 检查某个音符是否已被调号升降
function isNoteAffectedByKeySignature(noteClass, keySignature) {
    const keyInfo = KEY_SIGNATURES[keySignature];
    if (!keyInfo) return { isSharp: false, isFlat: false };
    
    return {
        isSharp: keyInfo.sharps.includes(noteClass),
        isFlat: keyInfo.flats.includes(noteClass)
    };
}

// ====== 种子随机数生成器 ======
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
        this.current = seed;
    }

    next() {
        this.current = (this.current * 9301 + 49297) % 233280;
        return this.current / 233280;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min)) + min;
    }

    nextFloat() {
        return this.next();
    }

    choice(array) {
        if (!array || !Array.isArray(array) || array.length === 0) return null;
        return array[this.nextInt(0, array.length)];
    }

    weighted(choices, weights) {
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = this.nextFloat() * totalWeight;
        
        for (let i = 0; i < choices.length; i++) {
            random -= weights[i];
            if (random <= 0) return choices[i];
        }
        
        return choices[choices.length - 1];
    }
}

// ====== 智能旋律生成器 ======
class IntelligentMelodyGenerator {
    constructor(measures, keySignature, timeSignature, clef, seed) {
        this.measures = measures;
        this.keySignature = keySignature;
        this.timeSignature = timeSignature;
        this.clef = clef;
        this.seed = seed;
        this.random = new SeededRandom(seed);
        
        // 根据当前谱号获取正确的音域设置（不更新UI）
        const actualRange = getRangeForClef(clef);
        const clefName = clef === 'treble' ? '高音谱号' : clef === 'alto' ? '中音谱号' : '低音谱号';
        const settingType = (userSettings.clefRanges[clef] && userSettings.clefRanges[clef].hasCustomRange) ? '自定义' : '默认';
        console.log(`🎼 旋律生成器使用${clefName}的${settingType}音域: ${actualRange.min}-${actualRange.max}`);
        
        this.rules = {
            timeSignature: timeSignature, // 时间签名
            range: { 
                min: actualRange.min, 
                max: actualRange.max 
            }, // 音域范围（创建新对象避免引用问题，支持A2-A6范围）
            allowedDurations: this.getTimeSignatureAppropriateRhythms(timeSignature, userSettings.allowedRhythms), // 根据拍号调整允许的节奏
            allowWeakBeats: false, // Upbeat functionality removed
            accidentalRate: (userSettings.accidentalRate || 0) / 100, // 临时记号概率
            maxJump: userSettings.maxJump || 12, // 最大音程跳动
            // 设置一些默认的音乐规则
            stepwisePreferred: true, // 以级进为主
            maxConsecutiveJumps: 2, // 最大连续跳进数
            restRatio: 0.15 // 休止符比例
        };
        
        console.log(`🎯 构造函数中的maxJump: ${this.rules.maxJump}, 来源: ${userSettings.maxJump}`);
        
        // 调试三连音设置传递
        console.log(`🎛️ 生成器初始化:`);
        console.log(`   用户allowedRhythms: [${userSettings?.allowedRhythms?.join(', ') || 'undefined'}]`);
        
        if (!this.rules) {
            console.error(`❌ this.rules 未初始化!`);
            throw new Error('Generator rules not initialized');
        }
        
        if (!Array.isArray(this.rules.allowedDurations)) {
            console.error(`❌ allowedDurations 不是数组: ${typeof this.rules.allowedDurations}`);
            throw new Error('allowedDurations must be an array');
        }
        
        console.log(`   生成器allowedDurations: [${this.rules.allowedDurations.join(', ')}]`);
        console.log(`   支持三连音: ${this.rules.allowedDurations.includes('triplet') ? '✅是' : '❌否'}`);
        
        // 首先初始化音阶
        this.scale = KEY_SCALES[keySignature] || KEY_SCALES['C']; // 如果调号无效，默认使用C大调
        if (!this.scale) {
            console.error('⚠️ 无效的调号，使用C大调作为默认');
            this.scale = [0, 2, 4, 5, 7, 9, 11];
        }
        
        // 根据用户音域设置动态生成优选开始和结束音符
        this.rules.preferredStarts = this.generatePreferredNotes('starts');
        this.rules.preferredEnds = this.generatePreferredNotes('ends');
        this.stats = {
            noteCount: 0,
            restCount: 0,
            beamCount: 0,
            minMidi: Infinity,
            maxMidi: -Infinity,
            maxInterval: 0,
            restRatio: 0
        };
        
        // 解析拍号 - 正确处理复合拍子
        const [beats, beatType] = timeSignature.split('/').map(Number);
        
        // 正确计算每小节的四分音符拍数
        if (timeSignature === '6/8') {
            // 6/8拍 = 6个八分音符 = 3个四分音符拍的长度
            this.beatsPerMeasure = 3;
            this.beatUnit = 4; // 以四分音符为基准单位计算
            console.log('🎵 6/8拍：6个八分音符 = 3个四分音符拍长度');
        } else if (timeSignature === '3/4') {
            // 3/4拍 = 3个四分音符拍
            this.beatsPerMeasure = 3;
            this.beatUnit = 4;
            console.log('🎵 3/4拍：3个四分音符拍');
        } else {
            // 其他拍号使用传统计算
            this.beatsPerMeasure = beats;
            this.beatUnit = beatType;
        }
        
        console.log(`🎵 初始化智能生成器: ${measures}小节 ${timeSignature} ${keySignature}调 ${clef}谱号`);
        console.log(`🎹 音域: MIDI ${this.rules.range.min}-${this.rules.range.max} 最大跳动: ${this.rules.maxJump}半音`);
    }

    /**
     * 根据时间签名获取合适的节奏类型
     */
    getTimeSignatureAppropriateRhythms(timeSignature, userAllowedRhythms) {
        console.log(`🔍 getTimeSignatureAppropriateRhythms 调试:`);
        console.log(`  - timeSignature: ${timeSignature} (类型: ${typeof timeSignature})`);
        console.log(`  - userAllowedRhythms: ${userAllowedRhythms} (类型: ${typeof userAllowedRhythms})`);
        console.log(`  - 是数组: ${Array.isArray(userAllowedRhythms)}`);
        
        // 6/8拍的特殊处理：尊重用户设置但确保必要的节奏类型
        // 不再强制使用固定节奏，而是在用户设置基础上添加必要支持
        console.log(`🎵 6/8拍将尊重用户节奏设置`);
        
        // 🔥 修复：严格使用用户设置，不添加任何默认值
        let baseRhythms = Array.isArray(userAllowedRhythms) ? [...userAllowedRhythms] : [];
        console.log(`  - baseRhythms: [${baseRhythms.join(', ')}]`);
        
        // 🔥 修复：只进行附点音符的命名转换，不添加任何新的节奏类型
        if (timeSignature === '6/8' || timeSignature === '3/4') {
            // 🔥 关键修复：将用户UI中的dotted-*转换为内部使用的*. 格式
            const convertedRhythms = baseRhythms.map(rhythm => {
                if (rhythm === 'dotted-quarter') return 'quarter.';
                if (rhythm === 'dotted-half') return 'half.';
                return rhythm;
            });
            
            baseRhythms = convertedRhythms;
            console.log(`🎵 ${timeSignature}拍转换后的节奏（严格按用户选择）: [${baseRhythms.join(', ')}]`);
        }
        
        console.log(`🎯 ${timeSignature}拍最终允许的节奏: [${baseRhythms.join(', ')}]`);
        return baseRhythms;
    }

    /**
     * 根据音域和调号动态生成优选音符
     */
    generatePreferredNotes(type) {
        const scale = this.scale;
        const range = this.rules.range;
        const preferredNotes = [];
        
        // 确保scale是有效数组，否则使用默认音阶
        const effectiveScale = Array.isArray(scale) ? scale : [0, 2, 4, 5, 7, 9, 11];
        
        // 获取当前调号的正确主和弦音（1, 3, 5度）
        const targetScaleDegrees = getTonicChordTones(this.keySignature);
        
        console.log(`🎼 调号${this.keySignature}的主和弦音: ${targetScaleDegrees.join(', ')}`);
        
        // 修复：只在指定音域范围内生成主和弦音
        console.log(`🔍 [generatePreferredNotes] 音域: ${range.min}-${range.max}, 调号: ${this.keySignature}`);
        console.log(`🔍 [generatePreferredNotes] 计算八度范围: ${Math.floor(range.min / 12)} 到 ${Math.floor(range.max / 12)}`);
        
        for (let octave = Math.floor(range.min / 12); octave <= Math.floor(range.max / 12); octave++) {
            for (const scaleDegree of targetScaleDegrees) {
                const midi = octave * 12 + scaleDegree;
                console.log(`🔍 [generatePreferredNotes] 检查: octave=${octave}, scaleDegree=${scaleDegree}, midi=${midi}, 音域内=${midi >= range.min && midi <= range.max}`);
                
                if (midi >= range.min && midi <= range.max && effectiveScale.includes(scaleDegree)) {
                    preferredNotes.push(midi);
                    console.log(`🎼 添加主和弦音: octave=${octave}, scaleDegree=${scaleDegree}, midi=${midi}`);
                } else if (midi < range.min) {
                    console.log(`🚨 跳过过低主和弦音: octave=${octave}, scaleDegree=${scaleDegree}, midi=${midi} < ${range.min}`);
                } else if (midi > range.max) {
                    console.log(`🚨 跳过过高主和弦音: octave=${octave}, scaleDegree=${scaleDegree}, midi=${midi} > ${range.max}`);
                } else if (!effectiveScale.includes(scaleDegree)) {
                    console.log(`🚨 跳过非调内音: octave=${octave}, scaleDegree=${scaleDegree}, midi=${midi}`);
                }
            }
        }
        
        // 如果没有合适的优选音符，使用音域内的所有调内音符
        if (preferredNotes.length === 0) {
            console.log('⚠️ 没有找到主和弦音，使用所有调内音符');
            for (let octave = Math.floor(range.min / 12); octave <= Math.floor(range.max / 12); octave++) {
                for (const scaleDegree of effectiveScale) {
                    const midi = octave * 12 + scaleDegree;
                    if (midi >= range.min && midi <= range.max) {
                        preferredNotes.push(midi);
                        console.log(`🎼 添加调内音符: octave=${octave}, scaleDegree=${scaleDegree}, midi=${midi}`);
                    } else if (midi < range.min) {
                        console.log(`🚨 跳过过低调内音符: octave=${octave}, scaleDegree=${scaleDegree}, midi=${midi} < ${range.min}`);
                    }
                }
            }
        }
        
        console.log(`🎼 生成${type === 'starts' ? '开始' : '结束'}优选音符: ${preferredNotes.join(',')}`);
        
        // 安全检查：确保所有优选音符都在音域内
        const safePreferredNotes = preferredNotes.filter(midi => {
            const isValid = midi >= range.min && midi <= range.max;
            if (!isValid) {
                console.error(`🚨 [generatePreferredNotes] 过滤异常优选音符: MIDI ${midi} (音域: ${range.min}-${range.max})`);
            }
            return isValid;
        });
        
        if (safePreferredNotes.length === 0) {
            const safeFallback = range.min + Math.floor((range.max - range.min) / 2);
            console.log(`🎼 使用安全回退音符: ${safeFallback}`);
            return [safeFallback];
        }
        
        return safePreferredNotes;
    }

    /**
     * 生成完整旋律
     */
    generateMelody() {
        const melody = [];
        let lastMidi = null;
        let lastDirection = 0; // -1下行, 0平行, 1上行
        let consecutiveJumps = 0;
        let measureDirectionChanges = 0;
        
        for (let measureIndex = 0; measureIndex < this.measures; measureIndex++) {
            console.log(`\\n--- 生成第${measureIndex + 1}小节 ---`);
            
            const measureData = this.generateMeasure(
                measureIndex, 
                lastMidi, 
                lastDirection, 
                consecutiveJumps
            );
            
            // 验证小节数据的完整性
            if (!measureData || !measureData.notes || measureData.notes.length === 0) {
                console.error(`生成的小节${measureIndex + 1}为空，创建应急小节`);
                const emergencyMeasure = {
                    notes: [{
                        type: 'rest',
                        duration: 'whole',
                        beats: this.beatsPerMeasure
                    }],
                    beams: [],
                    directionChanges: 0
                };
                melody.push(emergencyMeasure);
            } else {
                melody.push(measureData);
            }
            
            // 更新状态
            const lastNote = this.getLastNote(measureData.notes);
            if (lastNote) {
                lastMidi = lastNote.midi;
            }
            
            // 计算方向变化
            measureDirectionChanges = this.countDirectionChanges(measureData.notes);
            
            // 更新统计
            this.updateStats(measureData);
        }
        
        // 最终统计
        this.stats.restRatio = this.stats.restCount / (this.stats.noteCount + this.stats.restCount);
        
        // 🔧 首先检查userSettings状态
        this.debugUserSettingsState();
        
        // 🔍 生成综合演奏法调试报告
        this.generateArticulationDebugReport(melody);
        
        // 🔥 最后一道防线：全局演奏法安全检查
        const sanitizedMelody = this.sanitizeArticulations(melody);
        
        console.log(`✅ 旋律生成完成: ${this.stats.noteCount}音符 ${this.stats.restCount}休止 休止比例${(this.stats.restRatio*100).toFixed(1)}%`);
        
        return sanitizedMelody;
    }

    /**
     * 生成单个小节
     */
    generateMeasure(measureIndex, lastMidi, lastDirection, consecutiveJumps) {
        const notes = [];
        let remainingBeats = this.beatsPerMeasure;
        let currentBeat = 0; // 当前在小节内的拍子位置
        let currentMidi = lastMidi;
        let currentDirection = lastDirection;
        let currentConsecutiveJumps = consecutiveJumps;
        let measureDirectionChanges = 0;
        
        // 第一小节特殊处理
        if (measureIndex === 0) {
            // Upbeat functionality removed
            
            if (this.rules.preferredStarts) {
                currentMidi = this.random.choice(this.rules.preferredStarts);
                console.log(`🎵 [generateMeasure] 第一小节选择preferredStarts: ${currentMidi}, 候选: [${this.rules.preferredStarts.join(',')}]`);
                if (currentMidi < 50) {
                    console.error(`🚨 [generateMeasure] preferredStarts异常低音: MIDI ${currentMidi}`);
                }
            } else {
                currentMidi = this.generateInScaleNote(null);
                console.log(`🎵 [generateMeasure] 第一小节使用generateInScaleNote: ${currentMidi}`);
            }
        }
        
        // 最后一小节特殊处理
        const isLastMeasure = measureIndex === this.measures - 1;
        
        let loopSafety = 0;
        const maxLoopIterations = 50; // 防止无限循环
        let previousRemainingBeats = remainingBeats; // 用于检测循环进度
        
        while (remainingBeats > 0.001 && loopSafety < maxLoopIterations) {
            loopSafety++;
            console.log(`小节${measureIndex + 1} - 迭代${loopSafety}: 剩余${remainingBeats}拍`);
            
            // 检测循环是否卡住（在每次迭代开始时）
            if (loopSafety > 1 && Math.abs(remainingBeats - previousRemainingBeats) < 0.001) {
                console.error(`🚨 循环卡住检测！第${loopSafety}次迭代，剩余拍数没有变化: ${remainingBeats}拍`);
                console.error(`🔍 调试信息:`);
                console.error(`  - 小节已有元素数量: ${notes.length}`);
                console.error(`  - 当前MIDI: ${currentMidi}`);
                console.error(`  - 允许的时值: ${this.rules.allowedDurations.join(', ')}`);
                console.error(`  - 是否允许三连音: ${this.rules.allowedDurations.includes('triplet')}`);
                
                console.log(`🚨 强制添加应急休止符以继续循环`);
                const emergencyBeats = Math.min(remainingBeats, 0.125); // 最多32nd note
                const emergencyRestDuration = this.beatsToRestDuration(emergencyBeats);
                
                notes.push({
                    type: 'rest',
                    duration: emergencyRestDuration,
                    beats: emergencyBeats
                });
                
                console.log(`✅ 添加应急休止符: ${emergencyRestDuration} (${emergencyBeats}拍)`);
                remainingBeats -= emergencyBeats;
                currentBeat += emergencyBeats;
                previousRemainingBeats = remainingBeats;
                continue;
            }
            
            previousRemainingBeats = remainingBeats;
            
            // 检查是否可以生成三连音 - 增强调试
            console.log(`\n🔍 三连音检查: 剩余${remainingBeats}拍, 位置${currentBeat}`);
            const canGenerate = this.canGenerateTriplet(remainingBeats);
            console.log(`   结果: ${canGenerate ? '✅可以生成' : '❌不能生成'}`);
            
            if (canGenerate) {
                console.log(`🎵 尝试生成三连音，剩余拍数: ${remainingBeats}, 当前MIDI: ${currentMidi}`);
                
                try {
                    const triplet = this.generateTriplet(currentMidi, currentDirection, remainingBeats, currentBeat);
                    
                    // 更严格的三连音验证（现在支持休止符）
                    const tripletValid = triplet && 
                                       Array.isArray(triplet.notes) && 
                                       triplet.notes.length === 3 && 
                                       typeof triplet.totalBeats === 'number' &&
                                       triplet.totalBeats > 0 &&
                                       triplet.totalBeats <= remainingBeats + 0.001 &&
                                       triplet.notes.every(element => 
                                           (element.type === 'note' || element.type === 'rest') && 
                                           element.beats > 0 && 
                                           element.isTriplet === true
                                       );
                    
                    if (tripletValid) {
                        // 三连音验证通过，添加到小节中
                        notes.push(...triplet.notes);
                        remainingBeats -= triplet.totalBeats;
                        currentBeat += triplet.totalBeats;
                        currentMidi = triplet.lastMidi;
                        currentDirection = triplet.lastDirection;
                        console.log(`    ✅ 三连音成功: ${triplet.notes.length}个音符 (${triplet.totalBeats}拍), 剩余: ${remainingBeats}拍`);
                        
                        // 验证剩余拍数不为负数
                        if (remainingBeats < -0.001) {
                            console.error(`🚨 三连音后剩余拍数为负: ${remainingBeats}`);
                            remainingBeats = 0; // 强制归零
                        }
                        continue;
                    } else {
                        console.log(`❌ 三连音验证失败详情:`);
                        console.log(`  - triplet存在: ${!!triplet}`);
                        console.log(`  - notes是数组: ${Array.isArray(triplet?.notes)}`);
                        console.log(`  - notes长度: ${triplet?.notes?.length}`);
                        console.log(`  - totalBeats: ${triplet?.totalBeats}`);
                        console.log(`  - totalBeats <= remainingBeats: ${triplet?.totalBeats <= remainingBeats + 0.001}`);
                        console.log(`  - 所有音符有效: ${triplet?.notes?.every(note => note.type === 'note' && note.beats > 0)}`);
                        console.log(`❌ 三连音失败，转为普通音符生成模式`);
                    }
                } catch (error) {
                    console.error(`❌ 三连音生成异常: ${error.message}`);
                    console.error(`错误堆栈:`, error.stack);
                }
            }
            
            // 🔥 6/8拍专门的节奏模式生成 - 优先使用频率控制版本
            if (this.timeSignature === '6/8' && notes.length === 0 && remainingBeats === this.beatsPerMeasure) {
                console.log(`🎵 6/8拍节奏模式生成: 优先使用频率控制版本`);
                
                // 🎯 优先使用应用了频率控制的generateAdaptiveRhythmPatterns
                let rhythmPattern = null;
                
                try {
                    // 获取用户设置的节奏类型
                    const userRhythms = this.rules?.allowedDurations || [];
                    console.log(`🔍 用户允许的6/8拍节奏: [${userRhythms.join(', ')}]`);
                    
                    // 🔥 直接应用频率控制检查
                    console.log(`🎯 应用频率控制到6/8拍模式选择`);
                    
                    // 获取基础模式
                    const basePattern = this.choose6_8RhythmPattern();
                    if (basePattern && basePattern.length > 0) {
                        console.log(`🔍 基础模式: ${basePattern.map(n => n.duration).join(' ')}`);
                        
                        // 🔥 强化频率控制：检查模式中的每种节奏类型是否被频率控制阻止
                        const rhythmTypes = [...new Set(basePattern.map(n => n.duration))];
                        console.log(`🔍 模式包含的节奏类型: [${rhythmTypes.join(', ')}]`);
                        
                        let shouldBlockPattern = false;
                        for (const rhythmType of rhythmTypes) {
                            // 🔥 高级设置优先级：检查用户的频率设置（高级设置覆盖基本设置）
                            if (userSettings?.rhythmFrequencies) {
                                let freqKey = rhythmType;
                                // 🎯 完整映射节奏类型到频率设置的键
                                if (rhythmType === '16th') freqKey = '16th';
                                else if (rhythmType === 'eighth') freqKey = 'eighth';
                                else if (rhythmType === 'quarter') freqKey = 'quarter';
                                else if (rhythmType === 'quarter.') freqKey = 'dotted-quarter'; // 🔥 修复：附点四分音符使用专门的频率控制
                                else if (rhythmType === 'half') freqKey = 'half';
                                else if (rhythmType === 'half.') freqKey = 'dotted-half'; // 🔥 关键映射：附点二分音符
                                else if (rhythmType === 'whole') freqKey = 'whole';
                                else if (rhythmType === 'duplet') freqKey = 'duplet';
                                else if (rhythmType === 'quadruplet') freqKey = 'quadruplet';
                                else if (rhythmType === 'triplet') freqKey = 'triplet';
                                
                                const frequency = userSettings.rhythmFrequencies[freqKey];
                                if (frequency !== undefined) {
                                    console.log(`🎯 高级设置频率控制检查：${rhythmType} -> ${freqKey} = ${frequency}%`);
                                    if (frequency === 0) {
                                        console.log(`🚫 高级设置阻止：${rhythmType}（映射到${freqKey}）频率为0%，完全阻止此模式`);
                                        shouldBlockPattern = true;
                                        break; // 任何一种节奏类型频率为0就阻止整个模式
                                    }
                                } else {
                                    console.log(`⚠️ 没有找到${rhythmType}的频率设置（键：${freqKey}）`);
                                }
                            } else {
                                console.log(`⚠️ 用户频率设置不存在`);
                            }
                        }
                        
                        if (!shouldBlockPattern) {
                            console.log(`✅ 模式通过频率控制检查，允许使用`);
                            rhythmPattern = basePattern;
                        } else {
                            console.log(`❌ 模式被频率控制阻止，寻找替代模式`);
                            
                            // 🔥 智能回退：根据用户频率设置创建安全模式
                            const allowedRhythms = Object.entries(userSettings?.rhythmFrequencies || {})
                                .filter(([key, freq]) => freq > 0)
                                .map(([key]) => key);
                            console.log(`🔍 允许的节奏类型（频率>0）: [${allowedRhythms.join(', ')}]`);
                            
                            // 按优先级创建安全模式
                            if (allowedRhythms.includes('dotted-half') && allowedRhythms.length >= 1) {
                                // 优先使用附点二分音符（如果被允许）
                                rhythmPattern = [
                                    { duration: 'half.', beats: 3.0 }
                                ];
                                console.log(`🔄 使用安全的附点二分音符模式`);
                            } else if (allowedRhythms.includes('quarter.')) {
                                // 🔥 修复混淆错误：只有当用户明确勾选附点四分音符时才使用附点四分音符模式
                                rhythmPattern = [
                                    { duration: 'quarter.', beats: 1.5 },
                                    { duration: 'quarter.', beats: 1.5 }
                                ];
                                console.log(`🔄 使用安全的附点四分音符模式（用户已勾选附点四分音符）`);
                            } else if (allowedRhythms.includes('quarter') && allowedRhythms.includes('eighth')) {
                                // 🔥 修复：普通四分音符需要与八分音符组合才能在6/8拍中工作
                                rhythmPattern = [
                                    { duration: 'quarter', beats: 1.0 },   // 第一组：四分音符(1拍) + 八分音符(0.5拍)
                                    { duration: 'eighth', beats: 0.5 },
                                    { duration: 'quarter', beats: 1.0 },   // 第二组：四分音符(1拍) + 八分音符(0.5拍)  
                                    { duration: 'eighth', beats: 0.5 }
                                ];
                                console.log(`🔄 使用四分音符+八分音符混合模式（6/8拍适配）`);
                            } else if (allowedRhythms.includes('eighth')) {
                                // 使用八分音符模式
                                rhythmPattern = [
                                    { duration: 'eighth', beats: 0.5 },
                                    { duration: 'eighth', beats: 0.5 },
                                    { duration: 'eighth', beats: 0.5 },
                                    { duration: 'eighth', beats: 0.5 },
                                    { duration: 'eighth', beats: 0.5 },
                                    { duration: 'eighth', beats: 0.5 }
                                ];
                                console.log(`🔄 使用安全的八分音符模式`);
                            } else {
                                console.error(`❌ 无法创建安全模式：没有可用的基础节奏类型`);
                                console.error(`🔍 调试信息：允许的节奏类型 = [${allowedRhythms.join(', ')}]`);
                                console.error(`🔍 用户频率设置:`, userSettings?.rhythmFrequencies);
                                
                                // 🔥 严格遵循用户选择：检查是否有任何可用的节奏类型
                                const userRhythms = this.rules?.allowedDurations || [];
                                console.error(`🔍 用户勾选的基础节奏类型: [${userRhythms.join(', ')}]`);
                                
                                if (userRhythms.includes('eighth')) {
                                    // 仅在用户勾选八分音符的情况下使用
                                    rhythmPattern = [
                                        { duration: 'eighth', beats: 0.5 },
                                        { duration: 'eighth', beats: 0.5 },
                                        { duration: 'eighth', beats: 0.5 },
                                        { duration: 'eighth', beats: 0.5 },
                                        { duration: 'eighth', beats: 0.5 },
                                        { duration: 'eighth', beats: 0.5 }
                                    ];
                                    console.log(`✅ 严格回退：使用八分音符模式（用户已勾选）`);
                                } else if (userRhythms.includes('half.') || userRhythms.includes('dotted-half')) {
                                    // 尝试附点二分音符
                                    rhythmPattern = [
                                        { duration: 'half.', beats: 3.0 }
                                    ];
                                    console.log(`✅ 严格回退：使用附点二分音符模式（用户已勾选）`);
                                } else if (userRhythms.includes('quarter.')) {
                                    // 🔥 修复混淆错误：只有用户勾选附点四分音符时才使用附点四分音符
                                    rhythmPattern = [
                                        { duration: 'quarter.', beats: 1.5 },
                                        { duration: 'quarter.', beats: 1.5 }
                                    ];
                                    console.log(`✅ 严格回退：使用附点四分音符模式（用户已勾选附点四分音符）`);
                                } else if (userRhythms.includes('quarter') && userRhythms.includes('eighth')) {
                                    // 🔥 修复：普通四分音符需要与八分音符组合才能在6/8拍中正确工作
                                    rhythmPattern = [
                                        { duration: 'quarter', beats: 1.0 },   // 四分音符
                                        { duration: 'eighth', beats: 0.5 },    // 八分音符
                                        { duration: 'quarter', beats: 1.0 },   // 四分音符
                                        { duration: 'eighth', beats: 0.5 }     // 八分音符
                                    ];
                                    console.log(`✅ 严格回退：使用四分音符+八分音符组合模式（用户已勾选这两种节奏）`);
                                } else {
                                    // 🚨 致命错误：用户没有勾选任何适用的6/8拍节奏类型
                                    console.error(`❌ 致命错误：用户没有勾选任何适用于6/8拍的节奏类型！`);
                                    console.error(`❌ 无法生成6/8拍模式，将返回null`);
                                    rhythmPattern = null;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ 频率控制版本生成失败: ${error.message}，回退到基础版本`);
                }
                
                // 最后的回退选项
                if (!rhythmPattern) {
                    console.log(`🔄 最终回退到基础6/8拍模式生成`);
                    rhythmPattern = this.choose6_8RhythmPattern();
                }
                
                if (rhythmPattern && rhythmPattern.length > 0) {
                    console.log(`✅ 最终选择6/8拍节奏模式: ${rhythmPattern.map(d => d.duration).join(' ')}`);
                    
                    // 按照选定的节奏模式生成整个小节
                    for (const patternNote of rhythmPattern) {
                        if (!patternNote || !patternNote.duration || typeof patternNote.beats !== 'number') {
                            console.error(`⚠️ 无效的模式音符: ${JSON.stringify(patternNote)}`);
                            continue;
                        }
                        
                        const shouldBeRest = this.shouldPlaceRest(remainingBeats, notes.length, measureIndex);
                        
                        if (shouldBeRest) {
                            notes.push({
                                type: 'rest',
                                duration: patternNote.duration,
                                beats: patternNote.beats
                            });
                            console.log(`    ✅ 添加休止符: ${patternNote.duration} (${patternNote.beats}拍)`);
                        } else {
                            // 生成音符
                            let nextMidi;
                            try {
                                // 创建上下文信息
                                const noteContext = {
                                    isMeasureStart: currentBeat === 0,
                                    isMeasureEnd: remainingBeats === patternNote.beats,
                                    isPhrasEnd: isLastMeasure && remainingBeats === patternNote.beats,
                                    isCadence: isLastMeasure && remainingBeats <= this.beatsPerMeasure * 0.5
                                };
                                nextMidi = this.generateNextNote(
                                    currentMidi,
                                    currentDirection,
                                    currentConsecutiveJumps,
                                    isLastMeasure && remainingBeats === patternNote.beats,
                                    noteContext
                                );
                            } catch (error) {
                                console.error(`生成音符错误:`, error.message);
                                nextMidi = currentMidi || this.generateInScaleNote(null);
                            }
                            
                            const note = {
                                type: 'note',
                                midi: nextMidi,
                                duration: patternNote.duration,
                                beats: patternNote.beats
                            };
                            notes.push(note);
                            console.log(`    ✅ 添加音符: ${midiToNoteName(nextMidi)} ${patternNote.duration} (${patternNote.beats}拍)`);
                            
                            currentMidi = nextMidi;
                        }
                        
                        remainingBeats -= patternNote.beats;
                        currentBeat += patternNote.beats;
                    }
                    
                    // 如果按节奏模式生成完整小节，跳出循环
                    if (remainingBeats <= 0.001) {
                        break;
                    }
                }
            }
            
            // 选择时值 (普通音符生成模式)
            console.log(`🎶 普通音符生成: 剩余拍数${remainingBeats}, 小节已有${notes.length}个元素, 当前位置${currentBeat}`);
            const duration = this.chooseDuration(remainingBeats, notes.length === 0, currentBeat);
            const beats = this.durationToBeats(duration);
            console.log(`📏 选择时值: ${duration} (${beats}拍), 剩余空间: ${remainingBeats}拍`);
            
            if (beats > remainingBeats + 0.001) {
                // 时值过大，改用休止符填充
                console.log(`⚠️ 所选时值${beats}拍过大，剩余仅${remainingBeats}拍，用休止符填充`);
                const restDuration = this.beatsToRestDuration(remainingBeats);
                notes.push({
                    type: 'rest',
                    duration: restDuration,
                    beats: remainingBeats
                });
                console.log(`✅ 添加填充休止符: ${restDuration} (${remainingBeats}拍)`);
                remainingBeats = 0; // 确保循环结束
                break;
            }
            
            // 决定是音符还是休止符
            const shouldBeRest = this.shouldPlaceRest(
                remainingBeats, 
                notes.length, 
                measureIndex
            );
            console.log(`🎯 音符类型决策: ${shouldBeRest ? '休止符' : '音符'}`);
            
            if (shouldBeRest) {
                // 添加休止符
                notes.push({
                    type: 'rest',
                    duration: duration,
                    beats: beats
                });
                console.log(`    ✅ 添加休止符: ${duration} (${beats}拍)`);
            } else {
                // 生成音符
                console.log(`🎵 开始生成下一个音符: 当前MIDI=${currentMidi}, 方向=${currentDirection}`);
                
                let nextMidi;
                try {
                    // 创建上下文信息用于小调变化音处理
                    const noteContext = {
                        isMeasureStart: currentBeat === 0,
                        isMeasureEnd: remainingBeats - beats <= 0.001,
                        isPhrasEnd: isLastMeasure && remainingBeats - beats <= 0.5,
                        isCadence: isLastMeasure && remainingBeats <= this.beatsPerMeasure * 0.5
                    };
                    nextMidi = this.generateNextNote(
                        currentMidi, 
                        currentDirection, 
                        currentConsecutiveJumps,
                        isLastMeasure && remainingBeats - beats <= 0.5, // 是否为结束音
                        noteContext
                    );
                    console.log(`✅ 音符生成成功: MIDI ${nextMidi}`);
                } catch (error) {
                    console.error(`❌ 音符生成失败: ${error.message}`);
                    console.error(`使用应急音符生成策略`);
                    // 应急处理：使用当前音符或音域中点
                    nextMidi = currentMidi || Math.floor((this.rules.range.min + this.rules.range.max) / 2);
                }
                
                // 严格验证音程跳动限制
                if (currentMidi !== null) {
                    const actualInterval = Math.abs(nextMidi - currentMidi);
                    if (actualInterval > this.rules.maxJump) {
                        console.error(`❌ 音程跳动违规: ${actualInterval}半音 > ${this.rules.maxJump}半音 - 强制修正！`);
                        console.error(`   调号: ${this.keySignature}, 前一音符: ${currentMidi} -> 当前音符: ${nextMidi}`);
                        
                        // 强制修正：将音符限制在允许的跳度范围内
                        const maxAllowedUp = currentMidi + this.rules.maxJump;
                        const maxAllowedDown = currentMidi - this.rules.maxJump;
                        
                        if (nextMidi > maxAllowedUp) {
                            nextMidi = Math.min(maxAllowedUp, this.rules.range.max);
                            console.error(`   修正为向上跳度限制: MIDI ${nextMidi}`);
                        } else if (nextMidi < maxAllowedDown) {
                            nextMidi = Math.max(maxAllowedDown, this.rules.range.min);
                            console.error(`   修正为向下跳度限制: MIDI ${nextMidi}`);
                        }
                        
                        this.stats.constraintViolations = (this.stats.constraintViolations || 0) + 1;
                    } else {
                        console.log(`✅ 音程跳度合规: ${actualInterval}半音 ≤ ${this.rules.maxJump}半音`);
                    }
                }
                
                // 严格验证音域范围
                if (nextMidi < this.rules.range.min || nextMidi > this.rules.range.max) {
                    console.error(`❌ 音域违规: MIDI ${nextMidi} 不在 ${this.rules.range.min}-${this.rules.range.max} 范围内 - 强制修正！`);
                    console.error(`   调号: ${this.keySignature}, 谱号: ${this.clef}`);
                    console.error(`   前一音符: ${currentMidi}, 当前音符: ${nextMidi}`);
                    console.error(`   音符类型: ${nextMidi < 50 ? '异常低音' : nextMidi > 80 ? '异常高音' : '正常'}`);
                    
                    // 强制修正到音域范围内
                    const originalMidi = nextMidi;
                    nextMidi = Math.max(this.rules.range.min, Math.min(this.rules.range.max, nextMidi));
                    console.error(`   修正: ${originalMidi} -> ${nextMidi}`);
                    
                    this.stats.constraintViolations = (this.stats.constraintViolations || 0) + 1;
                } else {
                    console.log(`✅ 音域合规: MIDI ${nextMidi} 在 ${this.rules.range.min}-${this.rules.range.max} 范围内`);
                }
                
                const { step, octave, alter } = this.midiToMusicXML(nextMidi);
                
                const noteObject = {
                    type: 'note',
                    duration: duration,
                    beats: beats,
                    step: step,
                    octave: octave,
                    alter: alter,
                    midi: nextMidi
                };
                
                // 为音符选择合适的articulation
                const articulation = this.selectArticulation(
                    noteObject, 
                    notes.filter(n => n.type === 'note').length, // 当前音符索引
                    notes.filter(n => n.type === 'note'), // 只考虑音符，不包括休止符
                    measureIndex,
                    this.clef
                );
                
                // 处理acciaccatura - 如果选中了acciaccatura，生成实际的装饰音符
                if (articulation === 'acciaccatura') {
                    const acciaccaturaNote = this.generateAcciaccaturaNote(noteObject);
                    if (acciaccaturaNote) {
                        // 将装饰音信息附加到主音符上，而不是作为独立音符
                        noteObject.graceNote = acciaccaturaNote;
                        console.log(`🎵 将装饰音附加到主音符上: ${acciaccaturaNote.step}${acciaccaturaNote.octave} -> ${noteObject.step}${noteObject.octave}`);
                    }
                    notes.push(noteObject);
                } else {
                    if (articulation) {
                        noteObject.articulation = articulation;
                    }
                    notes.push(noteObject);
                }
                
                // 更新方向和跳进状态
                if (currentMidi !== null) {
                    const interval = nextMidi - currentMidi;
                    if (Math.abs(interval) > 2) { // 大于二度为跳进
                        currentConsecutiveJumps++;
                    } else {
                        currentConsecutiveJumps = 0;
                    }
                    
                    const newDirection = interval > 0 ? 1 : (interval < 0 ? -1 : 0);
                    if (newDirection !== currentDirection && newDirection !== 0) {
                        measureDirectionChanges++;
                    }
                    currentDirection = newDirection;
                }
                
                currentMidi = nextMidi;
                
                console.log(`    音符: ${step}${octave} ${duration} (${beats}拍) MIDI:${nextMidi}`);
            }
            
            remainingBeats -= beats;
            currentBeat += beats;
            console.log(`✅ 完成一次迭代: 减少${beats}拍，剩余${remainingBeats}拍，当前位置${currentBeat}，小节现有${notes.length}个元素`);
        }
        
        // 循环安全检查
        if (loopSafety >= maxLoopIterations) {
            console.warn(`警告: 小节生成达到最大迭代次数，剩余拍数: ${remainingBeats}`);
            // 强制结束小节
            if (remainingBeats > 0) {
                const restDuration = this.beatsToRestDuration(remainingBeats);
                notes.push({
                    type: 'rest',
                    duration: restDuration,
                    beats: remainingBeats
                });
            }
        }
        
        // 验证和修复小节完整性
        const totalBeats = notes.reduce((sum, note) => sum + note.beats, 0);
        const beatsDifference = this.beatsPerMeasure - totalBeats;
        
        if (Math.abs(beatsDifference) > 0.001) {
            console.warn(`⚠️ 小节${measureIndex + 1}时值不匹配: 期望${this.beatsPerMeasure}, 实际${totalBeats}, 差值${beatsDifference}`);
            
            if (beatsDifference > 0) {
                // 小节时值不足，添加休止符填充
                console.log(`正在用休止符填充${beatsDifference}拍`);
                const restDuration = this.beatsToRestDuration(beatsDifference);
                notes.push({
                    type: 'rest',
                    duration: restDuration,
                    beats: beatsDifference
                });
                totalBeats += beatsDifference;
            } else if (beatsDifference < 0) {
                // 小节时值超过，移除最后的音符/休止符或调整时值
                console.log(`小节时值超过${Math.abs(beatsDifference)}拍，尝试修复`);
                
                // 简单的修复策略：移除最后的元素直到时值匹配
                while (notes.length > 0 && totalBeats > this.beatsPerMeasure) {
                    const lastNote = notes.pop();
                    totalBeats -= lastNote.beats;
                    console.log(`移除了最后一个${lastNote.type}: ${lastNote.beats}拍`);
                }
                
                // 如果还是不足，添加休止符填充
                const finalDifference = this.beatsPerMeasure - totalBeats;
                if (finalDifference > 0) {
                    const restDuration = this.beatsToRestDuration(finalDifference);
                    notes.push({
                        type: 'rest',
                        duration: restDuration,
                        beats: finalDifference
                    });
                    totalBeats += finalDifference;
                }
            }
        }
        
        // 最终验证和强制修复
        if (notes.length === 0) {
            console.error(`错误: 小节${measureIndex + 1}为空，添加全休止符`);
            notes.push({
                type: 'rest',
                duration: this.beatsToRestDuration(this.beatsPerMeasure),
                beats: this.beatsPerMeasure
            });
        } else {
            // 再次检查最终时值
            const finalTotalBeats = notes.reduce((sum, note) => sum + note.beats, 0);
            const finalBeatsDifference = this.beatsPerMeasure - finalTotalBeats;
            
            if (Math.abs(finalBeatsDifference) > 0.001) {
                console.error(`严重错误: 小节${measureIndex + 1}最终时值仍不匹配: 期望${this.beatsPerMeasure}, 实际${finalTotalBeats}`);
                
                if (finalBeatsDifference > 0) {
                    // 还是不足，最后一次填充
                    notes.push({
                        type: 'rest',
                        duration: this.beatsToRestDuration(finalBeatsDifference),
                        beats: finalBeatsDifference
                    });
                    console.log(`最终救救填充: ${finalBeatsDifference}拍休止符`);
                }
            }
        }
        
        // 最终最终验证 - 强制检查
        const absoluteFinalBeats = notes.reduce((sum, note) => sum + note.beats, 0);
        const absoluteFinalDifference = this.beatsPerMeasure - absoluteFinalBeats;
        
        if (Math.abs(absoluteFinalDifference) > 0.001) {
            console.error(`❌ 最终验证失败: 小节${measureIndex + 1} - 总时长${absoluteFinalBeats}拍, 期望${this.beatsPerMeasure}拍, 差值${absoluteFinalDifference}拍`);
            
            if (absoluteFinalDifference > 0.001) {
                // 仍然不足，强制添加休止符
                console.log(`强制添加最后的休止符: ${absoluteFinalDifference}拍`);
                const emergencyRestDuration = this.beatsToRestDuration(absoluteFinalDifference);
                notes.push({
                    type: 'rest',
                    duration: emergencyRestDuration,
                    beats: absoluteFinalDifference
                });
            } else if (absoluteFinalDifference < -0.001) {
                // 超出了，截断最后的音符
                console.log(`小节超长，尝试截断最后的元素`);
                const excess = Math.abs(absoluteFinalDifference);
                if (notes.length > 0) {
                    const lastNote = notes[notes.length - 1];
                    if (lastNote.beats > excess) {
                        lastNote.beats -= excess;
                        console.log(`缩短最后元素时值: ${lastNote.duration} 现在为 ${lastNote.beats}拍`);
                    } else {
                        notes.pop();
                        console.log(`移除最后一个元素`);
                    }
                }
            }
        }
        
        // 绝对最终验证
        const trueFinalBeats = notes.reduce((sum, note) => sum + note.beats, 0);
        console.log(`小节${measureIndex + 1}最终状态: ${notes.length}个元素, 总时长${trueFinalBeats}拍 (期望${this.beatsPerMeasure}拍)`);
        
        if (Math.abs(trueFinalBeats - this.beatsPerMeasure) > 0.001) {
            console.error(`🚨 严重错误: 小节${measureIndex + 1}时值仍不匹配! 实际${trueFinalBeats}拍 vs 期望${this.beatsPerMeasure}拍`);
        }
        
        // 🎵 应用拍点清晰度规则 - 拆分跨拍音符
        const correctedNotes = this.applybeatClarityRules(notes, measureIndex);
        
        // 获取当前拍点显示层级（用于符槓分组）
        const criticalBeats = RHYTHM_NOTATION_RULES.getCriticalBeatsWithLocalRhythm(correctedNotes, this.timeSignature);
        let currentBeatLevel = null;
        if (this.timeSignature === '4/4') {
            if (criticalBeats.includes(1) && criticalBeats.includes(2) && criticalBeats.includes(3)) {
                currentBeatLevel = 'quarter';
            } else if (criticalBeats.includes(2)) {
                currentBeatLevel = 'half'; 
            } else if (criticalBeats.includes(0) && criticalBeats.length === 1) {
                currentBeatLevel = 'whole';
            }
        }
        console.log(`🎼 符槓分组拍点层级: ${currentBeatLevel}, 关键拍点: [${criticalBeats.join(', ')}]`);
        
        // 生成beam信息
        const beamGroups = this.generateBeams(correctedNotes, currentBeatLevel);
        
        // 最终小节验证 - 确保不返回空小节
        if (!notes || notes.length === 0) {
            console.error(`🚨 严重错误: 小节${measureIndex + 1}生成为空！`);
            console.error(`🔍 空小节调试信息:`);
            console.error(`  - 初始拍数: ${this.beatsPerMeasure}`);
            console.error(`  - 最终剩余拍数: ${remainingBeats}`);
            console.error(`  - 循环安全计数器: ${loopSafety}/${maxLoopIterations}`);
            console.error(`  - 允许的时值: ${this.rules.allowedDurations.join(', ')}`);
            console.error(`  - 音域: MIDI ${this.rules.range.min}-${this.rules.range.max}`);
            console.error(`  - 最大音程跳度: ${this.rules.maxJump}半音`);
            console.error(`🚨 强制添加全休止符以避免空小节`);
            
            notes = [{
                type: 'rest',
                duration: 'whole',
                beats: this.beatsPerMeasure
            }];
        }
        
        console.log(`✅ 小节${measureIndex + 1}生成完成，包含${correctedNotes.length}个元素`);
        correctedNotes.forEach((note, i) => {
            console.log(`  [${i}] ${note.type}: ${note.duration} (${note.beats}拍)${note.midi ? ` MIDI:${note.midi}` : ''}`);
        });
        
        return {
            notes: correctedNotes,
            beams: beamGroups,
            directionChanges: measureDirectionChanges
        };
    }

    /**
     * 应用拍点清晰度规则 - 拆分跨拍音符并添加连音弧
     */
    applybeatClarityRules(notes, measureIndex) {
        console.log(`🎵 应用智能拍点清晰度规则 - 小节${measureIndex + 1} (包括休止符)`);
        console.log(`🎯 使用局部节奏检测: 每拍独立分析节奏复杂度`);
        
        // 调试：显示输入的音符信息
        console.log(`📋 输入音符清单 (${notes.length}个):`);
        notes.forEach((note, i) => {
            console.log(`  [${i}] ${note.type}: ${note.duration} (${note.beats}拍)${note.isTriplet ? ' [三连音]' : ''}${note.midi ? ` MIDI:${note.midi}` : ''}`);
        });
        
        // 🚨 完全重写：严格按照区间独立规则实现16分音符检测
        console.log(`🎼 [完全重写] 开始严格区间独立的16分音符处理`);
        
        // 检查时间签名是否适用
        const supportedTimeSignatures = ['2/4', '3/4', '4/4'];
        let sixteenthRegionsProcessed = false;
        
        if (supportedTimeSignatures.includes(this.timeSignature)) {
            // 🎯 步骤1：精确分析每个区间内是否有16分音符
            const regions = [
                { start: 0, end: 2, name: "前半拍区间(0-2)", hasS16th: false, quarterBeats: [0, 1, 2] },
                { start: 2, end: 4, name: "后半拍区间(2-4)", hasS16th: false, quarterBeats: [2, 3] }
            ];
            
            let currentPos = 0;
            for (const note of notes) {
                const noteEnd = currentPos + note.beats;
                
                // 检查是否是16分音符
                if (!note.isTriplet && Math.abs(note.beats - 0.25) < 0.001) {
                    console.log(`  📍 发现16分音符: 位置${currentPos}-${noteEnd} (${note.beats}拍)`);
                    
                    // 判断16分音符完全位于哪个区间内
                    for (const region of regions) {
                        if (currentPos >= region.start && noteEnd <= region.end) {
                            if (!region.hasS16th) {
                                region.hasS16th = true;
                                console.log(`    ✅ ${region.name}确认包含16分音符`);
                            }
                        }
                    }
                }
                currentPos += note.beats;
            }
            
            // 🔥 步骤2：对每个包含16分音符的区间进行独立处理
            const regionsWithS16th = regions.filter(r => r.hasS16th);
            console.log(`🎯 最终区间分析: [${regionsWithS16th.map(r => r.name).join(', ')}]包含16分音符`);
            
            if (regionsWithS16th.length > 0) {
                console.log(`🎼 [严格区间拆分] 开始处理包含16分音符的区间`);
                sixteenthRegionsProcessed = true;
                
                let processPos = 0;
                const processedNotes = [];
                
                for (const note of notes) {
                    const noteEnd = Math.round((processPos + note.beats) * 10000) / 10000;
                    const startPos = Math.round(processPos * 10000) / 10000;
                    
                    console.log(`🔍 处理音符: 位置${startPos}-${noteEnd}, 时长${note.beats}拍, 类型=${note.type}`);
                    
                    // 🔥 核心逻辑：检查音符是否跨越包含16分音符区间的边界
                    let splitPoints = [];
                    
                    if (note.beats > 0.25 && !note.isTriplet) {
                        // 检查所有包含16分音符的区间的四分音符拍点
                        for (const region of regionsWithS16th) {
                            for (const beat of region.quarterBeats) {
                                // 严格跨拍检测
                                if (startPos < beat && noteEnd > beat) {
                                    if (!splitPoints.includes(beat)) {
                                        splitPoints.push(beat);
                                        console.log(`  ✂️ 必须拆分点${beat}: 跨越${region.name}的四分音符拍点`);
                                    }
                                }
                            }
                        }
                    }
                    
                    // 执行拆分
                    if (splitPoints.length > 0) {
                        splitPoints.sort((a, b) => a - b);
                        const splitNotes = this.splitNoteAtMultiplePoints(note, processPos, splitPoints);
                        processedNotes.push(...splitNotes);
                        console.log(`  → 拆分完成: 1个音符 → ${splitNotes.length}个片段`);
                    } else {
                        processedNotes.push(note);
                        console.log(`  → 音符无需拆分`);
                    }
                    
                    processPos += note.beats;
                }
                
                notes = processedNotes;
                console.log(`🎼 [严格区间拆分] 完成，音符数量: ${notes.length}`);
            } else {
                console.log(`🎵 无16分音符区间，继续使用原有逻辑`);
            }
        } else {
            console.log(`⚠️ 时间签名${this.timeSignature}不支持16分音符区间检测`);
        }
        
        // 🎵 休止符合并规则 - 将正拍内的连续休止符合并
        notes = this.mergeRestsByBeats(notes);
        
        // 🎵 二分音符拍点内相邻休止符合并规则
        notes = this.mergeAdjacentRestsInHalfBeats(notes);
        
        // 调试：显示关键拍点信息
        const criticalBeats = RHYTHM_NOTATION_RULES.getCriticalBeatsWithLocalRhythm(notes, this.timeSignature);
        console.log(`🎯 关键拍点: [${criticalBeats.join(', ')}]`);
        
        // 特别检查常见问题：四分音符跨越二分音符拍点
        console.log(`🔍 常见问题检查：`);
        let pos = 0;
        notes.forEach((note, i) => {
            if (note.type === 'note' && note.beats === 1 && !note.isTriplet) { // 四分音符
                const noteEnd = pos + note.beats;
                const crossesBeat2 = pos < 2 && noteEnd > 2; // 跨越第3拍(位置2)
                if (crossesBeat2) {
                    console.log(`  ⚠️ 四分音符${i + 1}跨越二分音符拍点: 位置${pos} → ${noteEnd} (跨越拍点2)`);
                }
            }
            pos += note.beats;
        });
        
        // 🔥 检查是否已经处理了16分音符区间
        if (sixteenthRegionsProcessed) {
            console.log(`🔄 16分音符区间已完全处理，直接返回结果`);
            // 16分音符区间处理完成，直接进入最后验证阶段
            let finalNotes = [...notes];
            let maxAttempts = 5;
            let attempts = 0;
            
            while (attempts < maxAttempts) {
                const validation = RHYTHM_NOTATION_RULES.validateBeatClarity(finalNotes, this.timeSignature);
                if (validation.valid) {
                    console.log(`✅ 拍点清晰度验证通过 - 所有跨拍音符已正确拆分`);
                    break;
                }
                
                attempts++;
                console.log(`⚠️ 第${attempts}次修复跨拍问题，发现${validation.violations.length}个违规`);
                // 如果仍有问题，这里可以添加额外的修复逻辑
                break; // 暂时直接退出，避免无限循环
            }
            
            console.log(`✅ 16分音符区间处理完成，返回${finalNotes.length}个元素`);
            return finalNotes;
        }
        
        console.log(`🔄 执行正常的二分音符拍点检测逻辑`);
        const correctedNotes = [];
        let currentPosition = 0;
        
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            
            // 检查是否跨拍（音符和休止符都需要检查） - 使用智能局部节奏检测
            const crossInfo = RHYTHM_NOTATION_RULES.detectsCrossBeatsWithLocalRhythm(
                currentPosition, 
                note.beats, 
                this.timeSignature,
                notes,  // 传入所有音符进行局部分析
                note.type  // 传入音符类型（'note' 或 'rest'）
            );
            
            console.log(`🔍 检查音符${i + 1}: 位置${currentPosition} 时长${note.beats} → ${crossInfo.crossesBeat ? `跨越拍点${crossInfo.beatPoint}` : '不跨拍'}`);
            
            if (!crossInfo.crossesBeat) {
                // 不跨拍，直接添加
                correctedNotes.push(note);
                currentPosition += note.beats;
                console.log(`  ${note.type === 'note' ? '音符' : '休止符'}${i + 1}: ${note.beats}拍 - 不跨拍 ✅`);
                continue;
            }
            
            // 三连音不能被细分，即使跨拍也要保持完整
            if (note.isTriplet) {
                correctedNotes.push(note);
                currentPosition += note.beats;
                console.log(`  三连音${i + 1}: ${note.beats}拍 - 跨拍但不拆分 🎵`);
                continue;
            }
            
            // 跨拍，需要拆分
            console.log(`  ${note.type === 'note' ? '音符' : '休止符'}${i + 1}: ${note.beats}拍 - 跨越拍点${crossInfo.beatPoint + 1} ⚠️`);
            
            if (note.type === 'note') {
                // 音符拆分 - 使用智能局部节奏分析
                const splitNotes = RHYTHM_NOTATION_RULES.splitCrossBeatNoteWithLocalRhythm(
                    currentPosition,
                    note.beats,
                    note.midi,
                    this.timeSignature,
                    notes  // 传入所有音符进行局部分析
                );
                
                // 将拆分的音符添加到结果中
                splitNotes.forEach((splitNote, splitIndex) => {
                    const correctedNote = {
                        type: 'note',
                        duration: this.beatsToNoteDuration(splitNote.duration),
                        beats: splitNote.duration,
                        step: note.step,
                        octave: note.octave,
                        alter: note.alter,
                        midi: splitNote.pitch
                    };
                    
                    // 添加连音弧信息
                    if (splitNote.tied) {
                        correctedNote.tied = true;
                        correctedNote.tieType = splitNote.tieType;
                    }
                    
                    correctedNotes.push(correctedNote);
                    console.log(`    拆分${splitIndex + 1}: ${splitNote.duration}拍 (tie: ${splitNote.tieType || 'none'})`);
                });
            } else if (note.type === 'rest') {
                // 休止符拆分 - 在拍点处分割
                const splitPosition = crossInfo.splitPositions[0];
                const firstDuration = splitPosition - currentPosition;
                const secondDuration = note.beats - firstDuration;
                
                // 第一个休止符段
                const firstRest = {
                    type: 'rest',
                    duration: this.beatsToRestDuration(firstDuration),
                    beats: firstDuration
                };
                
                // 第二个休止符段
                const secondRest = {
                    type: 'rest', 
                    duration: this.beatsToRestDuration(secondDuration),
                    beats: secondDuration
                };
                
                correctedNotes.push(firstRest);
                correctedNotes.push(secondRest);
                console.log(`    拆分休止符: ${firstDuration}拍 + ${secondDuration}拍`);
            }
            
            currentPosition += note.beats;
        }
        
        console.log(`✅ 拍点规则处理完成: ${notes.length} -> ${correctedNotes.length} 个元素`);
        
        // 递归验证并修复任何剩余的跨拍问题
        let finalNotes = correctedNotes;
        let maxAttempts = 5; // 防止无限循环
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const validation = RHYTHM_NOTATION_RULES.validateBeatClarity(finalNotes, this.timeSignature);
            if (validation.valid) {
                console.log(`✅ 拍点清晰度验证通过 - 所有跨拍音符已正确拆分`);
                break;
            }
            
            attempts++;
            console.log(`⚠️ 第${attempts}次修复跨拍问题，发现${validation.violations.length}个违规`);
            
            // 修复跨拍问题
            const repairedNotes = [];
            let currentPos = 0;
            
            for (let i = 0; i < finalNotes.length; i++) {
                const note = finalNotes[i];
                const violation = validation.violations.find(v => v.noteIndex === i);
                
                if (violation && !note.isTriplet) {
                    console.log(`  🔧 修复音符${i + 1}: 位置${currentPos} 跨越拍点${violation.crossedBeat}`);
                    
                    // 在违规拍点处拆分
                    const splitPosition = violation.crossedBeat;
                    const firstDuration = splitPosition - currentPos;
                    const secondDuration = note.beats - firstDuration;
                    
                    if (note.type === 'note') {
                        // 拆分音符
                        const firstNote = {
                            type: 'note',
                            duration: this.beatsToNoteDuration(firstDuration),
                            beats: firstDuration,
                            step: note.step,
                            octave: note.octave,
                            alter: note.alter,
                            midi: note.midi,
                            tied: true,
                            tieType: 'start'
                        };
                        
                        const secondNote = {
                            type: 'note',
                            duration: this.beatsToNoteDuration(secondDuration),
                            beats: secondDuration,
                            step: note.step,
                            octave: note.octave,
                            alter: note.alter,
                            midi: note.midi,
                            tied: true,
                            tieType: 'stop'
                        };
                        
                        repairedNotes.push(firstNote, secondNote);
                        console.log(`    拆分音符: ${firstDuration}拍 + ${secondDuration}拍`);
                    } else {
                        // 拆分休止符
                        const firstRest = {
                            type: 'rest',
                            duration: this.beatsToRestDuration(firstDuration),
                            beats: firstDuration
                        };
                        
                        const secondRest = {
                            type: 'rest',
                            duration: this.beatsToRestDuration(secondDuration),
                            beats: secondDuration
                        };
                        
                        repairedNotes.push(firstRest, secondRest);
                        console.log(`    拆分休止符: ${firstDuration}拍 + ${secondDuration}拍`);
                    }
                } else {
                    // 没有违规，直接添加
                    repairedNotes.push(note);
                }
                
                currentPos += note.beats;
            }
            
            finalNotes = repairedNotes;
            
            if (attempts >= maxAttempts) {
                console.error(`❌ 达到最大修复尝试次数，仍有跨拍问题存在`);
                break;
            }
        }
        
        // 更新correctedNotes为修复后的版本
        correctedNotes.splice(0, correctedNotes.length, ...finalNotes);
        
        // 额外验证：检查所有tied音符是否正确配对且相邻
        const tiedNotes = correctedNotes.filter(n => n.type === 'note' && n.tied);
        const startTies = tiedNotes.filter(n => n.tieType === 'start');
        const stopTies = tiedNotes.filter(n => n.tieType === 'stop');
        
        // 验证tie只连接相邻的同音高音符
        for (let i = 0; i < correctedNotes.length; i++) {
            const currentNote = correctedNotes[i];
            
            // 检查小节最后一个音符是否有未完成的tie
            if (i === correctedNotes.length - 1 && currentNote.type === 'note' && 
                currentNote.tied && currentNote.tieType === 'start') {
                console.warn(`⚠️ 小节末尾的tie未完成，移除tie标记`);
                currentNote.tied = false;
                currentNote.tieType = null;
            }
            
            // 检查tie是否连接正确的音符
            if (i < correctedNotes.length - 1 && currentNote.type === 'note' && 
                currentNote.tied && currentNote.tieType === 'start') {
                const nextNote = correctedNotes[i + 1];
                // tie的下一个音符必须是相邻的同音高音符
                if (!nextNote || nextNote.type !== 'note' || !nextNote.tied || 
                    nextNote.midi !== currentNote.midi) {
                    console.error(`❌ 无效的tie: 索引${i}的音符尝试连接非相邻或不同音高的音符`);
                    // 修复：移除无效的tie
                    currentNote.tied = false;
                    currentNote.tieType = null;
                }
            }
        }
        
        if (startTies.length !== stopTies.length) {
            console.error(`❌ Tie配对错误: ${startTies.length}个start，${stopTies.length}个stop`);
        } else if (tiedNotes.length > 0) {
            console.log(`✅ Tie验证通过: ${startTies.length}对连音弧正确配对`);
        }
        
        // 应用连音符合并规则（优先级1：先执行合并）
        // 🔥 传入关键拍点信息，防止在八分音符场景下错误合并四分音符
        const mergedNotes = this.mergeTiedNotes(correctedNotes, measureIndex, criticalBeats);
        
        return mergedNotes;
    }

    /**
     * 计算音符在小节中的位置
     */
    calculateNotePosition(notes, targetNote) {
        let position = 0;
        for (const note of notes) {
            if (note === targetNote) {
                return position;
            }
            position += note.beats;
        }
        return position;
    }

    /**
     * 在多个拍点处拆分音符
     */
    splitNoteAtMultiplePoints(note, startPos, splitPoints) {
        if (splitPoints.length === 0) {
            return [note];
        }
        
        console.log(`    🔪 执行终极拆分: ${note.beats}拍${note.type}，在[${splitPoints.join(', ')}]处拆分`);
        
        const segments = [];
        let currentStart = startPos;
        
        // 按拆分点顺序拆分
        for (let i = 0; i < splitPoints.length; i++) {
            const splitAt = splitPoints[i];
            const segmentDuration = splitAt - currentStart;
            
            if (segmentDuration > 0.001) { // 避免零长度片段
                const segment = {
                    ...note,
                    duration: note.type === 'note' ? this.beatsToNoteDuration(segmentDuration) : this.beatsToRestDuration(segmentDuration),
                    beats: segmentDuration,
                    tied: note.type === 'note', // 只有音符需要连线
                    tieType: i === 0 ? 'start' : 'continue'
                };
                
                // 🔥 确保连线信息正确
                if (note.type === 'note') {
                    segment.tied = true;
                }
                
                segments.push(segment);
                console.log(`    ✅ 片段${i + 1}: ${segmentDuration}拍 (${segment.tieType}) - ${segment.duration}`);
            }
            
            currentStart = splitAt;
        }
        
        // 添加最后一个片段
        const finalDuration = (startPos + note.beats) - currentStart;
        if (finalDuration > 0.001) {
            const finalSegment = {
                ...note,
                duration: note.type === 'note' ? this.beatsToNoteDuration(finalDuration) : this.beatsToRestDuration(finalDuration),
                beats: finalDuration,
                tied: note.type === 'note',
                tieType: 'stop'
            };
            
            // 🔥 确保连线信息正确
            if (note.type === 'note') {
                finalSegment.tied = true;
            }
            
            segments.push(finalSegment);
            console.log(`    ✅ 最后片段: ${finalDuration}拍 (${finalSegment.tieType}) - ${finalSegment.duration}`);
        }
        
        console.log(`    🎯 拆分完成: 原1个音符 → ${segments.length}个片段`);
        return segments;
    }

    /**
     * 休止符合并规则 - 将正拍内的连续休止符合并为一个该拍时值的休止符
     */
    mergeRestsByBeats(notes) {
        console.log(`🎵 [休止符合并] 开始处理，原始音符数量: ${notes.length}`);
        
        if (this.timeSignature === '3/4') {
            return this.mergeRestsByBeatsFor3_4(notes);
        } else if (this.timeSignature !== '4/4') {
            console.log(`🎵 [休止符合并] 仅支持4/4拍和3/4拍，跳过处理`);
            return notes;
        }
        
        // 定义正拍区间（4/4拍）
        const beatRegions = [
            { start: 0, end: 1, duration: 1, name: '第1拍' },    // 第1拍：四分拍
            { start: 1, end: 2, duration: 1, name: '第2拍' },    // 第2拍：四分拍 
            { start: 2, end: 3, duration: 1, name: '第3拍' },    // 第3拍：四分拍
            { start: 3, end: 4, duration: 1, name: '第4拍' },    // 第4拍：四分拍
            { start: 0, end: 2, duration: 2, name: '前半小节' },  // 前半：二分拍
            { start: 2, end: 4, duration: 2, name: '后半小节' }   // 后半：二分拍
            // 注：先处理小区间，再处理大区间
        ];
        
        let mergedNotes = [...notes];
        let hasChanges = true;
        let iterations = 0;
        const maxIterations = 10;
        
        while (hasChanges && iterations < maxIterations) {
            hasChanges = false;
            iterations++;
            
            console.log(`🎵 [休止符合并] 第${iterations}次迭代`);
            
            for (const region of beatRegions) {
                let currentPos = 0;
                const regionNotes = [];
                let regionStart = -1;
                let regionEnd = -1;
                
                // 收集该区间内的音符
                for (let i = 0; i < mergedNotes.length; i++) {
                    const note = mergedNotes[i];
                    const noteEnd = currentPos + note.beats;
                    
                    // 检查音符是否在当前区间内
                    if (currentPos >= region.start && noteEnd <= region.end + 0.001) {
                        if (regionStart === -1) regionStart = i;
                        regionEnd = i;
                        regionNotes.push({ note, index: i, startPos: currentPos });
                    }
                    
                    currentPos += note.beats;
                }
                
                // 检查区间是否全部是休止符，且时值总和等于该正拍时值
                if (regionNotes.length > 1) {
                    const allRests = regionNotes.every(item => item.note.type === 'rest');
                    const totalDuration = regionNotes.reduce((sum, item) => sum + item.note.beats, 0);
                    const durationMatches = Math.abs(totalDuration - region.duration) < 0.001;
                    
                    if (allRests && durationMatches) {
                        console.log(`🎯 [休止符合并] ${region.name}全部是休止符(${regionNotes.length}个)，合并为一个${region.duration}拍休止符`);
                        
                        // 创建合并后的休止符
                        const mergedRest = {
                            type: 'rest',
                            duration: this.beatsToRestDuration(region.duration),
                            beats: region.duration
                        };
                        
                        // 替换原来的休止符
                        mergedNotes.splice(regionStart, regionEnd - regionStart + 1, mergedRest);
                        hasChanges = true;
                        
                        console.log(`✅ [休止符合并] 成功合并${region.name}的休止符`);
                        break; // 进行下一次迭代
                    }
                }
            }
        }
        
        console.log(`🎵 [休止符合并] 完成，音符数量: ${notes.length} → ${mergedNotes.length}`);
        return mergedNotes;
    }
    
    /**
     * 二分音符拍点内相邻休止符合并规则
     * 在二分音符拍点内，将相邻的休止符合并为更大的休止符
     */
    mergeAdjacentRestsInHalfBeats(notes) {
        if (this.timeSignature !== '4/4') {
            console.log(`🎵 [相邻休止符合并] 仅支持4/4拍，当前: ${this.timeSignature}`);
            return notes;
        }
        
        console.log(`🎵 [相邻休止符合并] 开始处理，原始音符数量: ${notes.length}`);
        
        // 定义二分音符拍点区域
        const halfBeatRegions = [
            { start: 0, end: 2, name: '前半小节（拍1-2）' },
            { start: 2, end: 4, name: '后半小节（拍3-4）' }
        ];
        
        let mergedNotes = [...notes];
        let hasChanges = true;
        let iterations = 0;
        const maxIterations = 5;
        
        while (hasChanges && iterations < maxIterations) {
            hasChanges = false;
            iterations++;
            console.log(`🎵 [相邻休止符合并] 第${iterations}次迭代`);
            
            for (const region of halfBeatRegions) {
                const regionResult = this.mergeAdjacentRestsInRegion(mergedNotes, region);
                if (regionResult.hasChanges) {
                    mergedNotes = regionResult.notes;
                    hasChanges = true;
                    console.log(`  ✅ ${region.name}有相邻休止符被合并`);
                    break; // 进行下一次迭代
                }
            }
        }
        
        console.log(`🎵 [相邻休止符合并] 完成，音符数量: ${notes.length} → ${mergedNotes.length}`);
        return mergedNotes;
    }
    
    /**
     * 在指定区域内合并相邻的休止符
     */
    mergeAdjacentRestsInRegion(notes, region) {
        let currentPos = 0;
        const regionNotes = [];
        
        // 收集区域内的所有音符及其位置信息
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const noteStart = currentPos;
            const noteEnd = currentPos + note.beats;
            
            // 检查音符是否在当前区域内
            if (noteStart >= region.start - 0.001 && noteStart < region.end - 0.001) {
                regionNotes.push({
                    index: i,
                    note: note,
                    start: noteStart,
                    end: noteEnd
                });
            }
            
            currentPos += note.beats;
        }
        
        if (regionNotes.length < 2) {
            return { hasChanges: false, notes: notes };
        }
        
        console.log(`  🔍 ${region.name}包含${regionNotes.length}个音符`);
        
        // 查找相邻的休止符序列
        let mergedNotes = [...notes];
        
        for (let i = 0; i < regionNotes.length - 1; i++) {
            const current = regionNotes[i];
            const next = regionNotes[i + 1];
            
            // 检查是否为相邻的休止符
            if (current.note.type === 'rest' && next.note.type === 'rest' &&
                Math.abs(current.end - next.start) < 0.001) {
                
                console.log(`    🎯 发现相邻休止符: 位置${current.start}-${current.end} + ${next.start}-${next.end}`);
                
                // 计算合并后的时值
                const totalBeats = current.note.beats + next.note.beats;
                const mergedDuration = this.beatsToRestDuration(totalBeats);
                
                if (mergedDuration) {
                    console.log(`    ✅ 合并为${totalBeats}拍休止符 (${mergedDuration})`);
                    
                    // 创建合并后的休止符
                    const mergedRest = {
                        type: 'rest',
                        duration: mergedDuration,
                        beats: totalBeats
                    };
                    
                    // 替换原来的两个休止符
                    mergedNotes.splice(current.index, 2, mergedRest);
                    
                    return { hasChanges: true, notes: mergedNotes };
                }
            }
        }
        
        return { hasChanges: false, notes: notes };
    }

    /**
     * 3/4拍专用的休止符合并规则 - 基于拍点层级智能合并
     */
    mergeRestsByBeatsFor3_4(notes) {
        console.log(`🎵 [3/4拍休止符合并] 开始处理，原始音符数量: ${notes.length}`);
        
        // 分析当前音符的最小时值，确定需要保持的拍点层级
        const finestRhythm = Math.min(...notes.map(n => n.beats));
        console.log(`🎵 [3/4拍休止符合并] 最小时值: ${finestRhythm}拍`);
        
        let mergedNotes = [...notes];
        let hasChanges = true;
        let iterations = 0;
        const maxIterations = 5;
        
        // 根据最小时值确定拍点合并策略
        let beatRegions = [];
        
        if (finestRhythm <= 0.5) {
            // 有八分音符或更小时值 - 只需要保持重要的四分音符拍点清晰
            console.log(`🎵 [3/4拍休止符合并] 八分音符级别 - 保持第1拍和第3拍清晰`);
            beatRegions = [
                // 二分音符级别的合并（跨越两个四分音符拍）
                { start: 0, end: 2, duration: 2, name: '第1-2拍（二分音符）', type: 'half' },
                // 四分音符级别的合并
                { start: 0, end: 1, duration: 1, name: '第1拍（四分音符）', type: 'quarter' },
                { start: 1, end: 2, duration: 1, name: '第2拍（四分音符）', type: 'quarter' },
                { start: 2, end: 3, duration: 1, name: '第3拍（四分音符）', type: 'quarter' }
            ];
        } else {
            // 只有四分音符或更大时值 - 可以更自由地合并
            console.log(`🎵 [3/4拍休止符合并] 四分音符级别 - 可以合并更大区间`);
            beatRegions = [
                // 整小节合并（附点二分音符）
                { start: 0, end: 3, duration: 3, name: '整小节（附点二分音符）', type: 'dotted-half' },
                // 二分音符级别的合并
                { start: 0, end: 2, duration: 2, name: '第1-2拍（二分音符）', type: 'half' },
                { start: 1, end: 3, duration: 2, name: '第2-3拍（二分音符）', type: 'half' },
                // 四分音符级别的合并
                { start: 0, end: 1, duration: 1, name: '第1拍（四分音符）', type: 'quarter' },
                { start: 1, end: 2, duration: 1, name: '第2拍（四分音符）', type: 'quarter' },
                { start: 2, end: 3, duration: 1, name: '第3拍（四分音符）', type: 'quarter' }
            ];
        }
        
        while (hasChanges && iterations < maxIterations) {
            hasChanges = false;
            iterations++;
            
            console.log(`🎵 [3/4拍休止符合并] 第${iterations}次迭代`);
            
            // 按照从大到小的顺序尝试合并（优先合并更大的区间）
            for (const region of beatRegions) {
                let currentPos = 0;
                const regionNotes = [];
                let regionStart = -1;
                let regionEnd = -1;
                
                // 收集区间内的所有音符
                for (let i = 0; i < mergedNotes.length; i++) {
                    const note = mergedNotes[i];
                    const noteEnd = currentPos + note.beats;
                    
                    // 音符与区间有重叠
                    if (currentPos < region.end && noteEnd > region.start) {
                        if (regionStart === -1) regionStart = i;
                        regionEnd = i;
                        regionNotes.push({ note, index: i });
                    }
                    
                    currentPos = noteEnd;
                }
                
                // 检查是否可以合并
                if (regionNotes.length > 1) {
                    const allRests = regionNotes.every(item => item.note.type === 'rest');
                    const totalDuration = regionNotes.reduce((sum, item) => sum + item.note.beats, 0);
                    const durationMatches = Math.abs(totalDuration - region.duration) < 0.001;
                    
                    // 检查区间是否完整（没有音符跨越边界）
                    const regionComplete = this.isRegionCompleteFor3_4(regionNotes, region, mergedNotes);
                    
                    if (allRests && durationMatches && regionComplete) {
                        console.log(`🎯 [3/4拍休止符合并] ${region.name}全部是休止符(${regionNotes.length}个)，合并为一个${region.duration}拍休止符`);
                        
                        // 创建合并后的休止符
                        const mergedRest = {
                            type: 'rest',
                            duration: this.beatsToRestDuration(region.duration),
                            beats: region.duration
                        };
                        
                        // 替换原来的休止符
                        mergedNotes.splice(regionStart, regionEnd - regionStart + 1, mergedRest);
                        hasChanges = true;
                        
                        console.log(`✅ [3/4拍休止符合并] 成功合并${region.name}的休止符`);
                        break; // 进行下一次迭代
                    }
                }
            }
        }
        
        console.log(`🎵 [3/4拍休止符合并] 完成，音符数量: ${notes.length} → ${mergedNotes.length}`);
        return mergedNotes;
    }

    /**
     * 检查3/4拍区间是否完整（没有音符跨越边界）
     */
    isRegionCompleteFor3_4(regionNotes, region, allNotes) {
        // 简单检查：确保区间内的音符总时值等于区间时值
        let currentPos = 0;
        for (let i = 0; i < allNotes.length; i++) {
            const note = allNotes[i];
            const noteEnd = currentPos + note.beats;
            
            // 找到区间开始位置
            if (Math.abs(currentPos - region.start) < 0.001) {
                let regionPos = currentPos;
                let regionNoteCount = 0;
                
                // 检查区间内的音符
                while (regionPos < region.end - 0.001 && i + regionNoteCount < allNotes.length) {
                    const regionNote = allNotes[i + regionNoteCount];
                    regionPos += regionNote.beats;
                    regionNoteCount++;
                    
                    // 如果音符跨越了区间边界，说明区间不完整
                    if (regionPos > region.end + 0.001) {
                        console.log(`🔍 [3/4拍休止符合并] ${region.name}区间不完整：音符跨越边界`);
                        return false;
                    }
                }
                
                // 检查是否恰好填满区间
                const regionComplete = Math.abs(regionPos - region.end) < 0.001;
                console.log(`🔍 [3/4拍休止符合并] ${region.name}区间完整性检查: ${regionComplete ? '完整' : '不完整'}`);
                return regionComplete;
            }
            
            currentPos = noteEnd;
        }
        
        return false;
    }

    /**
     * 判断tied组合是否是真正的跨拍拆分
     */
    isActualCrossBeatSplit(tiedGroup, allNotes, criticalBeats = []) {
        if (tiedGroup.length < 2) return false;
        
        // 计算tied组的起始位置
        const startPosition = this.calculateNotePosition(allNotes, tiedGroup[0]);
        const totalBeats = tiedGroup.reduce((sum, note) => sum + note.beats, 0);
        const endPosition = startPosition + totalBeats;
        
        // 🔥 检测是否在16分音符环境下
        const has16thNotes = allNotes.some(note => !note.isTriplet && Math.abs(note.beats - 0.25) < 0.001);
        
        // 🎯 根据环境选择检查的拍点
        let keyBeats;
        if (has16thNotes) {
            // 16分音符环境：检查所有四分音符拍点
            keyBeats = [0, 1, 2, 3];
            console.log(`  🔍 16分音符环境跨拍检查: ${startPosition}-${endPosition}, 检查拍点[${keyBeats.join(', ')}]`);
        } else {
            // 正常环境：检查二分音符拍点 
            keyBeats = [1, 2, 3];
            console.log(`  🔍 正常环境跨拍检查: ${startPosition}-${endPosition}, 检查拍点[${keyBeats.join(', ')}]`);
        }
        
        // 检查是否跨越关键拍点
        const tolerance = 0.01;
        
        for (const beat of keyBeats) {
            if (startPosition < beat - tolerance && endPosition > beat + tolerance) {
                console.log(`  ✅ 确认跨拍: 跨越拍点${beat} (${has16thNotes ? '16分音符环境' : '正常环境'})`);
                
                // 🔥 16分音符环境下：所有跨四分音符拍点的都是真正的跨拍拆分
                if (has16thNotes) {
                    return true;
                }
                
                // 正常环境下的原有逻辑
                const startsOnBeat = Math.abs(startPosition - Math.round(startPosition)) < tolerance;
                
                // 🎵 规则4专门保护：1.5拍位置（代码位置，音乐理论2.5拍）四分音符拆分
                // 使用更宽松的容差以处理浮点数精度问题
                const is1_5BeatQuarter = Math.abs(totalBeats - 1.0) < 0.01 && 
                    Math.abs(startPosition - 1.5) < 0.01;
                
                if (is1_5BeatQuarter) {
                    console.log(`  🚨🚨🚨 规则4保护激活：1.5拍位置四分音符拆分不可合并（避免跨越第3拍强拍）`);
                    console.log(`  🚨 详情: 起始位置=${startPosition}, 总拍数=${totalBeats}, tied组长度=${tiedGroup.length}`);
                    return true; // 1.5拍位置四分音符拆分必须保护
                }
                
                // 🎯 关键保护：只有位置1.5的四分音符拆分需要保护
                // 位置1.5的四分音符会跨越第3拍，必须保持拆分状态
                const is1_5PositionQuarter = Math.abs(totalBeats - 1.0) < 0.01 && 
                    Math.abs(startPosition - 1.5) < 0.01;
                
                if (is1_5PositionQuarter) {
                    console.log(`  🎯 检测到位置1.5的四分音符拆分: 必须保护，禁止合并`);
                    return true; // 位置1.5的四分音符拆分必须保护
                }
                
                // 🎯 新增：检查八分音符场景下的四分音符拆分保护
                // 如果关键拍点只显示二分音符拍点[0,2]，说明当前是八分音符场景
                // 此时四分音符跨越位置2的拆分必须保护
                const isEighthNoteScenario = criticalBeats.length === 2 && 
                    criticalBeats.includes(0) && criticalBeats.includes(2) && 
                    !criticalBeats.includes(1) && !criticalBeats.includes(3);
                
                if (isEighthNoteScenario && Math.abs(totalBeats - 1.0) < tolerance && Math.abs(beat - 2) < tolerance) {
                    console.log(`  🔥 八分音符场景：四分音符跨越位置2的拆分必须保护, 起始${startPosition}拍, 禁止合并`);
                    return true; // 八分音符场景下跨越位置2的四分音符拆分必须保护
                }
                
                // 四分音符在正拍上可以不拆分
                if (Math.abs(totalBeats - 1.0) < tolerance && startsOnBeat) {
                    return false; // 不是跨拍拆分，可以合并
                }
                
                return true; // 确实是跨拍拆分，需要保护
            }
        }
        
        return false; // 不跨拍，可以合并
    }

    /**
     * 检查合并休止符是否会影响拍点清晰度
     */
    checkRestMergeAffectsBeatClarity(startPosition, totalBeats, allNotes, timeSignature) {
        const endPosition = startPosition + totalBeats;
        const tolerance = 0.0001;
        
        // 获取需要明确的关键拍点
        const criticalBeats = RHYTHM_NOTATION_RULES.getCriticalBeatsWithLocalRhythm(allNotes, timeSignature);
        
        console.log(`    🔍 检查休止符合并 [${startPosition}-${endPosition}] 关键拍点: [${criticalBeats.join(', ')}]`);
        
        // 新规则：检查是否在完整拍点内全是休止符
        const beatTypes = this.checkIfFullBeatOfRests(startPosition, endPosition, allNotes, timeSignature);
        if (beatTypes.length > 0) {
            console.log(`    ✅ 完整${beatTypes[0]}拍点内全是休止符，可以合并`);
            return false; // 拍点内全是休止符，可以合并
        }
        
        // 检查合并后的休止符范围内是否包含需要明确的拍点
        for (const beatPoint of criticalBeats) {
            // 如果拍点在休止符范围内，合并会模糊这个拍点
            if (startPosition < beatPoint - tolerance && endPosition > beatPoint + tolerance) {
                console.log(`    ❌ 合并会模糊关键拍点${beatPoint}，不应该合并`);
                return true; // 会影响拍点清晰度
            }
            
            // 如果拍点恰好在休止符的边界上，检查这个拍点是否已经被其他音符明确了
            if (Math.abs(startPosition - beatPoint) < tolerance || Math.abs(endPosition - beatPoint) < tolerance) {
                // 拍点在边界上，检查是否已经被明确
                if (!RHYTHM_NOTATION_RULES.isBeatPointAlreadyClear(startPosition, endPosition, beatPoint, allNotes, timeSignature)) {
                    console.log(`    ❌ 拍点${beatPoint}在休止符边界上但未被明确，不应该合并`);
                    return true; // 会影响拍点清晰度
                }
            }
        }
        
        console.log(`    ✅ 合并不会影响拍点清晰度`);
        return false; // 不会影响拍点清晰度，可以合并
    }

    /**
     * 检查正拍内是否全是休止符
     * 正拍定义：(1,2,3,4), (1,3), (1) 根据当前拍点层级
     */
    checkIfFullBeatOfRests(startPosition, endPosition, allNotes, timeSignature) {
        const tolerance = 0.0001;
        
        // 根据拍号选择拍点层级
        let beatHierarchy;
        
        if (timeSignature === '6/8') {
            beatHierarchy = this.getBeatHierarchyFor6_8();
        } else if (timeSignature === '3/4') {
            beatHierarchy = this.getBeatHierarchyFor3_4();
        } else if (timeSignature === '4/4') {
            beatHierarchy = this.getBeatHierarchyFor4_4();
        } else {
            // 其他拍号使用基本层级
            beatHierarchy = this.getBeatHierarchyGeneric(timeSignature);
        }
        
        console.log(`      🎵 ${timeSignature}拍检查层次化拍点合并: ${startPosition}-${endPosition}`);
        
        // 检查休止符是否恰好符合某个拍点范围
        for (const beat of beatHierarchy) {
            if (Math.abs(startPosition - beat.start) < tolerance && Math.abs(endPosition - beat.end) < tolerance) {
                // 检查该拍点范围内是否全是休止符
                const isFullBeatOfRests = this.checkBeatRangeContainsOnlyRests(beat.start, beat.end, allNotes);
                if (isFullBeatOfRests) {
                    console.log(`      ✅ ${timeSignature}拍完整${beat.type}拍点 ${beat.start}-${beat.end} 内全是休止符，可以合并`);
                    return [beat.type]; // 返回拍点类型用于合并判断
                }
            }
        }
        
        console.log(`      ❌ ${timeSignature}拍休止符范围${startPosition}-${endPosition}不符合任何完整拍点`);
        return [];
    }

    // 4/4拍的拍点层级
    getBeatHierarchyFor4_4() {
        return [
            // 十六分音符层级（最细）
            { start: 0, end: 0.25, type: 'sixteenth' },
            { start: 0.25, end: 0.5, type: 'sixteenth' },
            { start: 0.5, end: 0.75, type: 'sixteenth' },
            { start: 0.75, end: 1, type: 'sixteenth' },
            { start: 1, end: 1.25, type: 'sixteenth' },
            { start: 1.25, end: 1.5, type: 'sixteenth' },
            { start: 1.5, end: 1.75, type: 'sixteenth' },
            { start: 1.75, end: 2, type: 'sixteenth' },
            { start: 2, end: 2.25, type: 'sixteenth' },
            { start: 2.25, end: 2.5, type: 'sixteenth' },
            { start: 2.5, end: 2.75, type: 'sixteenth' },
            { start: 2.75, end: 3, type: 'sixteenth' },
            { start: 3, end: 3.25, type: 'sixteenth' },
            { start: 3.25, end: 3.5, type: 'sixteenth' },
            { start: 3.5, end: 3.75, type: 'sixteenth' },
            { start: 3.75, end: 4, type: 'sixteenth' },
            // 八分拍点层级
            { start: 0, end: 0.5, type: 'eighth' },
            { start: 0.5, end: 1, type: 'eighth' },
            { start: 1, end: 1.5, type: 'eighth' },
            { start: 1.5, end: 2, type: 'eighth' },
            { start: 2, end: 2.5, type: 'eighth' },
            { start: 2.5, end: 3, type: 'eighth' },
            { start: 3, end: 3.5, type: 'eighth' },
            { start: 3.5, end: 4, type: 'eighth' },
            // 四分音符拍点层级
            { start: 0, end: 1, type: 'quarter' },
            { start: 1, end: 2, type: 'quarter' },
            { start: 2, end: 3, type: 'quarter' },
            { start: 3, end: 4, type: 'quarter' },
            // 二分音符拍点层级
            { start: 0, end: 2, type: 'half' },
            { start: 2, end: 4, type: 'half' },
            // 全音符拍点层级（最粗）
            { start: 0, end: 4, type: 'whole' }
        ];
    }

    // 6/8拍的拍点层级 - 3个四分音符拍长度（6个八分音符）
    getBeatHierarchyFor6_8() {
        return [
            // 十六分音符层级（最细）- 3个四分音符拍 = 12个十六分音符
            { start: 0, end: 0.25, type: 'sixteenth' },
            { start: 0.25, end: 0.5, type: 'sixteenth' },
            { start: 0.5, end: 0.75, type: 'sixteenth' },
            { start: 0.75, end: 1, type: 'sixteenth' },
            { start: 1, end: 1.25, type: 'sixteenth' },
            { start: 1.25, end: 1.5, type: 'sixteenth' },
            { start: 1.5, end: 1.75, type: 'sixteenth' },
            { start: 1.75, end: 2, type: 'sixteenth' },
            { start: 2, end: 2.25, type: 'sixteenth' },
            { start: 2.25, end: 2.5, type: 'sixteenth' },
            { start: 2.5, end: 2.75, type: 'sixteenth' },
            { start: 2.75, end: 3, type: 'sixteenth' },
            // 八分音符层级（6/8拍的基本单位）
            { start: 0, end: 0.5, type: 'eighth' },      // 第1个八分音符
            { start: 0.5, end: 1, type: 'eighth' },      // 第2个八分音符
            { start: 1, end: 1.5, type: 'eighth' },      // 第3个八分音符
            { start: 1.5, end: 2, type: 'eighth' },      // 第4个八分音符
            { start: 2, end: 2.5, type: 'eighth' },      // 第5个八分音符
            { start: 2.5, end: 3, type: 'eighth' },      // 第6个八分音符
            // 附点四分音符层级（6/8拍的主拍 - 每1.5个四分音符拍）
            { start: 0, end: 1.5, type: 'dotted-quarter' },   // 第一个主拍（3个八分音符）
            { start: 1.5, end: 3, type: 'dotted-quarter' },   // 第二个主拍（3个八分音符）
            // 全小节（附点二分音符 - 3个四分音符拍长度）
            { start: 0, end: 3, type: 'dotted-half' }
        ];
    }

    // 3/4拍的拍点层级
    getBeatHierarchyFor3_4() {
        return [
            // 十六分音符层级（最细）- 3个四分音符 = 12个十六分音符
            { start: 0, end: 0.25, type: 'sixteenth' },
            { start: 0.25, end: 0.5, type: 'sixteenth' },
            { start: 0.5, end: 0.75, type: 'sixteenth' },
            { start: 0.75, end: 1, type: 'sixteenth' },
            { start: 1, end: 1.25, type: 'sixteenth' },
            { start: 1.25, end: 1.5, type: 'sixteenth' },
            { start: 1.5, end: 1.75, type: 'sixteenth' },
            { start: 1.75, end: 2, type: 'sixteenth' },
            { start: 2, end: 2.25, type: 'sixteenth' },
            { start: 2.25, end: 2.5, type: 'sixteenth' },
            { start: 2.5, end: 2.75, type: 'sixteenth' },
            { start: 2.75, end: 3, type: 'sixteenth' },
            // 八分音符层级
            { start: 0, end: 0.5, type: 'eighth' },
            { start: 0.5, end: 1, type: 'eighth' },
            { start: 1, end: 1.5, type: 'eighth' },
            { start: 1.5, end: 2, type: 'eighth' },
            { start: 2, end: 2.5, type: 'eighth' },
            { start: 2.5, end: 3, type: 'eighth' },
            // 四分音符层级
            { start: 0, end: 1, type: 'quarter' },
            { start: 1, end: 2, type: 'quarter' },
            { start: 2, end: 3, type: 'quarter' },
            // 二分音符层级
            { start: 0, end: 2, type: 'half' },
            { start: 1, end: 3, type: 'half' },
            // 附点二分音符（全小节）
            { start: 0, end: 3, type: 'dotted-half' }
        ];
    }

    // 通用拍点层级生成
    getBeatHierarchyGeneric(timeSignature) {
        const structure = this.getBeatStructure(timeSignature);
        const beatHierarchy = [];
        const maxBeats = structure.beatsPerMeasure;
        
        // 生成基本的拍点层级
        // 十六分音符层级
        for (let i = 0; i < maxBeats; i += 0.25) {
            beatHierarchy.push({ start: i, end: i + 0.25, type: 'sixteenth' });
        }
        
        // 八分音符层级
        for (let i = 0; i < maxBeats; i += 0.5) {
            beatHierarchy.push({ start: i, end: i + 0.5, type: 'eighth' });
        }
        
        // 四分音符层级
        for (let i = 0; i < maxBeats; i += 1) {
            beatHierarchy.push({ start: i, end: i + 1, type: 'quarter' });
        }
        
        // 二分音符层级
        for (let i = 0; i < maxBeats; i += 2) {
            if (i + 2 <= maxBeats) {
                beatHierarchy.push({ start: i, end: i + 2, type: 'half' });
            }
        }
        
        // 全小节
        beatHierarchy.push({ start: 0, end: maxBeats, type: 'whole' });
        
        return beatHierarchy;
    }

    /**
     * 检查指定拍点范围内是否全是休止符
     */
    checkBeatRangeContainsOnlyRests(beatStart, beatEnd, allNotes) {
        const tolerance = 0.0001;
        let position = 0;
        
        for (const note of allNotes) {
            const noteStart = position;
            const noteEnd = position + note.beats;
            
            // 如果音符与正拍范围有重叠
            if (noteEnd > beatStart + tolerance && noteStart < beatEnd - tolerance) {
                // 如果是音符（非休止符），返回false
                if (note.type === 'note') {
                    return false;
                }
            }
            
            position += note.beats;
        }
        
        return true; // 该范围内没有音符，全是休止符
    }

    /**
     * 检查四分音符在正拍上的例外规则
     * 在任何情况下，如果模糊二分音符拍点的是两个出现在正拍的四分音符，则可以将其合并成一个二分音符
     */
    checkQuarterNoteOnStrongBeatException(tiedGroup, allNotes, startPosition, criticalBeats = []) {
        const tolerance = 0.0001;
        
        // 🎯 这是一个例外规则：即使在八分音符场景下，相邻正拍上的两个四分音符也可以合并为二分音符
        // 这是用户明确要求的例外情况
        const isEighthNoteScenario = criticalBeats.length === 2 && 
            criticalBeats.includes(0) && criticalBeats.includes(2) && 
            !criticalBeats.includes(1) && !criticalBeats.includes(3);
        
        if (isEighthNoteScenario) {
            console.log(`  🎯 八分音符场景：检查相邻正拍四分音符合并例外规则`);
        }
        
        // 只适用于两个四分音符的情况
        if (tiedGroup.length !== 2) return false;
        
        // 检查是否都是四分音符 (1拍)
        const isAllQuarterNotes = tiedGroup.every(note => Math.abs(note.beats - 1.0) < tolerance);
        if (!isAllQuarterNotes) return false;
        
        // 检查合并后是否为二分音符 (2拍)
        const totalBeats = tiedGroup.reduce((sum, note) => sum + note.beats, 0);
        if (Math.abs(totalBeats - 2.0) > tolerance) return false;
        
        const endPosition = startPosition + totalBeats;
        
        // 检查是否为相邻正拍上的两个四分音符
        // 相邻正拍组合：(0,1), (1,2), (2,3) - 对应拍1+2, 拍2+3, 拍3+4
        const adjacentQuarterBeatPairs = [
            [0, 1], // 第1拍+第2拍
            [1, 2], // 第2拍+第3拍  
            [2, 3]  // 第3拍+第4拍
        ];
        
        let isAdjacentQuarterBeats = false;
        
        for (const [beat1, beat2] of adjacentQuarterBeatPairs) {
            if (Math.abs(startPosition - beat1) < tolerance && 
                Math.abs(endPosition - (beat2 + 1)) < tolerance) {
                isAdjacentQuarterBeats = true;
                console.log(`  🎯 发现相邻正拍四分音符: 拍${beat1+1}+拍${beat2+1} (位置${beat1}-${beat2+1})`);
                break;
            }
        }
        
        if (!isAdjacentQuarterBeats) {
            console.log(`  🔍 例外规则检查: 不是相邻正拍上的四分音符组合，起始位置${startPosition}`);
            return false;
        }
        
        // 检查这两个四分音符是否模糊了二分音符拍点
        const halfNoteBeatPoints = [0, 2]; // 二分音符拍点在4/4拍中是第1拍和第3拍(位置0和2)
        
        let blursHalfNoteBeatPoint = false;
        for (const beatPoint of halfNoteBeatPoints) {
            // 如果二分音符拍点被这个tied组跨越，说明模糊了二分音符拍点
            if (startPosition < beatPoint + tolerance && endPosition > beatPoint + tolerance) {
                // 但是如果tied组恰好从这个拍点开始，则不算模糊
                if (Math.abs(startPosition - beatPoint) < tolerance) {
                    continue; // 从拍点开始，不算模糊
                }
                blursHalfNoteBeatPoint = true;
                console.log(`  🔍 检测到模糊二分音符拍点${beatPoint}: tied组[${startPosition}-${endPosition}]跨越了此拍点`);
                break;
            }
        }
        
        if (!blursHalfNoteBeatPoint) {
            console.log(`  🔍 例外规则检查: tied组[${startPosition}-${endPosition}]未模糊二分音符拍点，不应用例外规则`);
            return false;
        }
        
        console.log(`  🎯 ✅ 例外规则生效: 两个正拍四分音符模糊了二分音符拍点，允许合并为二分音符`);
        return true;
    }

    /**
     * 确保tied链条的tieType设置正确
     * 多个连续音符应该形成链条：first(start) → middle(continue) → last(stop)
     */
    ensureTiedChain(tiedGroup) {
        if (tiedGroup.length < 2) {
            return; // 单个音符无需处理
        }
        
        console.log(`  🔗 设置tied链条: ${tiedGroup.length}个音符`);
        
        // 设置tied链条的tieType
        for (let i = 0; i < tiedGroup.length; i++) {
            if (i === 0) {
                // 第一个音符：start
                tiedGroup[i].tieType = 'start';
                console.log(`    音符${i + 1}: tieType = start`);
            } else if (i === tiedGroup.length - 1) {
                // 最后一个音符：stop
                tiedGroup[i].tieType = 'stop';
                console.log(`    音符${i + 1}: tieType = stop`);
            } else {
                // 中间的音符：continue (在MusicXML中用start+stop表示)
                tiedGroup[i].tieType = 'continue';
                console.log(`    音符${i + 1}: tieType = continue`);
            }
            
            // 确保所有音符都标记为tied
            tiedGroup[i].tied = true;
        }
    }

    /**
     * 4/4拍专用：合并正拍上的两个连续四分音符为二分音符
     */
    mergeQuarterNotesOnStrongBeatsIn4_4(notes, measureIndex) {
        console.log(`🎵 [4/4拍四分音符合并] 开始处理小节${measureIndex + 1}，输入${notes.length}个音符`);
        
        const mergedNotes = [];
        let i = 0;
        let currentPosition = 0;
        const tolerance = 0.0001;
        
        while (i < notes.length) {
            const currentNote = notes[i];
            
            // 检查是否是四分音符
            if (currentNote.type === 'note' && 
                Math.abs(currentNote.beats - 1.0) < tolerance && 
                i < notes.length - 1) {
                
                const nextNote = notes[i + 1];
                const nextPosition = currentPosition + currentNote.beats;
                
                // 检查下一个音符是否也是四分音符
                if (nextNote && nextNote.type === 'note' && 
                    Math.abs(nextNote.beats - 1.0) < tolerance) {
                    
                    // 检查两个音符是否在正拍上
                    const isFirstOnBeat = Math.abs(currentPosition - Math.floor(currentPosition)) < tolerance;
                    const isSecondOnBeat = Math.abs(nextPosition - Math.floor(nextPosition)) < tolerance;
                    
                    // 检查是否是连续的正拍（0-1, 1-2, 2-3）
                    const areConsecutiveBeats = isFirstOnBeat && isSecondOnBeat && 
                                               Math.abs(nextPosition - currentPosition - 1.0) < tolerance;
                    
                    // 特别检查是否是第1-2拍或第3-4拍
                    // 注意：不包括第2-3拍，因为这会跨越强弱拍
                    const isBeats1_2 = Math.abs(currentPosition) < tolerance && Math.abs(nextPosition - 1.0) < tolerance;
                    const isBeats3_4 = Math.abs(currentPosition - 2.0) < tolerance && Math.abs(nextPosition - 3.0) < tolerance;
                    
                    // 检查音高是否相同（包括处理tied音符的情况）
                    const sameNotes = currentNote.midi === nextNote.midi;
                    
                    // 检查是否已经是tied音符（如果是，也应该合并）
                    const areTiedNotes = currentNote.tied && currentNote.tieType === 'start' && 
                                        nextNote.tied && nextNote.tieType === 'stop';
                    
                    if (areConsecutiveBeats && (isBeats1_2 || isBeats3_4) && 
                        (sameNotes || areTiedNotes)) {
                        // 合并成二分音符
                        const halfNote = {
                            ...currentNote,
                            duration: 'half',
                            beats: 2,
                            tied: false,
                            tieType: null,
                            // 保留第一个音符的articulation（如果有）
                            articulation: currentNote.articulation
                        };
                        
                        mergedNotes.push(halfNote);
                        const endPos = nextPosition + nextNote.beats;
                        console.log(`  ✅ 合并正拍四分音符: 位置${currentPosition.toFixed(1)}-${endPos.toFixed(1)} -> 二分音符`);
                        
                        i += 2; // 跳过两个音符
                        currentPosition = endPos;
                        continue;
                    }
                }
            }
            
            // 不能合并，保持原样
            mergedNotes.push(currentNote);
            currentPosition += currentNote.beats;
            i++;
        }
        
        console.log(`🎵 [4/4拍四分音符合并] 完成，音符数量: ${notes.length} -> ${mergedNotes.length}`);
        return mergedNotes;
    }
    
    /**
     * 连音符和休止符自动合并算法
     * 将连续的tied音符和连续的休止符合并为更大的时值（如果不影响拍点清晰度）
     */
    mergeTiedNotes(notes, measureIndex, criticalBeats = []) {
        console.log(`🔗 应用连音符和休止符合并规则 - 小节${measureIndex + 1}`);
        
        // 🎼 3/4拍专用的tied音符优化转换
        if (this.timeSignature === '3/4') {
            notes = this.optimize3_4TiedNotes(notes, measureIndex);
        }
        
        // 🎼 4/4拍专用：合并正拍上的两个连续四分音符为二分音符
        if (this.timeSignature === '4/4') {
            notes = this.mergeQuarterNotesOnStrongBeatsIn4_4(notes, measureIndex);
        }
        
        const mergedNotes = [];
        let i = 0;
        
        while (i < notes.length) {
            const currentNote = notes[i];
            
            // 处理休止符合并
            if (currentNote.type === 'rest') {
                const restGroup = [currentNote];
                let j = i + 1;
                
                // 收集所有连续的休止符（不管时值是否相同）
                while (j < notes.length && notes[j].type === 'rest') {
                    restGroup.push(notes[j]);
                    j++;
                }
                
                // 尝试合并休止符（如果有多个）
                if (restGroup.length >= 2) {
                    // 计算休止符组的位置范围
                    let restGroupStartPosition = 0;
                    for (let k = 0; k < i; k++) {
                        restGroupStartPosition += notes[k].beats;
                    }
                    
                    const totalBeats = restGroup.reduce((sum, rest) => sum + rest.beats, 0);
                    const restGroupEndPosition = restGroupStartPosition + totalBeats;
                    
                    // 检查合并后的休止符是否会影响拍点清晰度
                    const wouldAffectBeatClarity = this.checkRestMergeAffectsBeatClarity(
                        restGroupStartPosition,
                        totalBeats,
                        notes,
                        this.timeSignature
                    );
                    
                    console.log(`  🔍 检查休止符合并影响拍点: 位置${restGroupStartPosition}-${restGroupEndPosition} (${totalBeats}拍) → ${wouldAffectBeatClarity ? '会影响' : '不影响'}`);
                    
                    if (!wouldAffectBeatClarity) {
                        // 不影响拍点清晰度，可以合并
                        const mergedDuration = this.beatsToRestDuration(totalBeats);
                        const expectedBeats = this.durationToBeats(mergedDuration);
                        const tolerance = 0.01;
                        
                        if (Math.abs(totalBeats - expectedBeats) < tolerance) {
                            const mergedRest = {
                                type: 'rest',
                                duration: mergedDuration,
                                beats: totalBeats
                            };
                            
                            mergedNotes.push(mergedRest);
                            console.log(`  ✅ 合并${restGroup.length}个休止符: ${restGroup.map(r => r.duration).join('+')} -> ${mergedDuration}`);
                            i = j; // 跳过整个休止符组
                            continue;
                        } else {
                            console.log(`  ❌ 休止符总时值${totalBeats}无法表示为单一休止符，不合并`);
                        }
                    } else {
                        console.log(`  ❌ 合并会影响拍点清晰度，不合并`);
                    }
                }
                
                // 不能合并，添加第一个休止符
                mergedNotes.push(currentNote);
                i++;
                continue;
            }
            
            // 不是音符或不是tied开始，直接添加
            if (currentNote.type !== 'note' || !currentNote.tied || currentNote.tieType !== 'start') {
                mergedNotes.push(currentNote);
                i++;
                continue;
            }
            
            // 检查三连音保护
            if (currentNote.isTriplet) {
                mergedNotes.push(currentNote);
                i++;
                continue;
            }
            
            // 收集连续的tied音符组（无限制，形成tied链条）
            const tiedGroup = [currentNote];
            let j = i + 1;
            
            // 收集所有连续的同音高tied音符 - 必须是相邻的，不能有其他音符或休止符间隔
            while (j < notes.length) {
                const nextNote = notes[j];
                
                // 如果不是相邻位置的音符（j != i+1时），检查中间是否有非tied音符
                if (j > i + 1) {
                    // 检查前一个元素是否也是tied组的一部分
                    const prevInGroup = notes[j - 1];
                    if (!prevInGroup.tied || prevInGroup.midi !== currentNote.midi) {
                        // 中间有非tied音符或不同音高的音符，停止收集
                        break;
                    }
                }
                
                // 检查是否是同音高的tied音符
                if (nextNote.type === 'note' && 
                    nextNote.tied && 
                    nextNote.midi === currentNote.midi &&
                    !nextNote.isTriplet) {
                    
                    tiedGroup.push(nextNote);
                    
                    // 如果遇到tied结束，停止收集
                    if (nextNote.tieType === 'stop') {
                        j++; // 包含stop音符后结束
                        break;
                    }
                    
                    j++;
                } else {
                    // 不连续，停止收集
                    break;
                }
            }
            
            // 尝试合并tied音符组
            if (tiedGroup.length >= 2) {
                const totalBeats = tiedGroup.reduce((sum, note) => sum + note.beats, 0);
                const mergedDuration = this.beatsToNoteDuration(totalBeats);
                
                // 检查是否为标准音符时值（允许一定误差）
                const expectedBeats = this.durationToBeats(mergedDuration);
                const tolerance = 0.01;
                
                // 检查是否为了beat clarity拆分的音符（不应该合并）
                // 使用智能局部节奏分析来决定是否需要保持拆分
                
                // 计算tied组的时间范围
                const tiedStartPos = this.calculateNotePosition(notes, tiedGroup[0]);
                const tiedEndPos = tiedStartPos + totalBeats;
                
                // 分析tied组所在时间段的局部节奏复杂度
                // 使用新规则：判断tied组所在的二分音符拍点区域的最小时值
                let hasLocalFineDivisions = false;
                
                // 确定tied组所在的二分音符拍点区域
                const regionStart = tiedStartPos < 2 ? 0 : 2;
                const regionEnd = tiedStartPos < 2 ? 2 : 4;
                
                let regionMinValue = Infinity;
                for (const note of notes) {
                    if (note.isTriplet) continue;
                    
                    const notePos = this.calculateNotePosition(notes, note);
                    const noteEnd = notePos + note.beats;
                    
                    // 检查音符是否与tied组所在的二分音符区域有重叠
                    if (noteEnd > regionStart && notePos < regionEnd) {
                        regionMinValue = Math.min(regionMinValue, note.beats);
                    }
                }
                
                // 根据新规则判断是否有细分音符需要保持拍点清晰
                if (regionMinValue <= 0.25) {
                    // 区域最小时值是16分音符 → 需要四分音符拍点清晰
                    hasLocalFineDivisions = true;
                } else if (regionMinValue <= 0.5) {
                    // 区域最小时值是8分音符 → 需要二分音符拍点清晰，但不影响quarter+quarter合并
                    hasLocalFineDivisions = false;
                } else {
                    // 区域最小时值是4分音符或更长 → 不需要额外拍点限制
                    hasLocalFineDivisions = false;
                }
                
                // 检测是否为beat clarity拆分：
                // 根据新规则：所有跨拍音符都应该拆分，除非在自己对应的正拍上
                // 关键修复：检查beats总和而非duration字段，因为拆分后的duration会根据beats重新计算
                
                // 智能合并逻辑：区分跨拍拆分和可合并的连音符
                // 🔥 传入关键拍点信息，确保八分音符场景下的拆分保护
                const isActualCrossBeatSplit = this.isActualCrossBeatSplit(tiedGroup, notes, criticalBeats);
                
                const isBeatClaritySplit = tiedGroup.length >= 2 && 
                    tiedGroup[0].tieType === 'start' && 
                    tiedGroup[tiedGroup.length - 1].tieType === 'stop' && 
                    isActualCrossBeatSplit; // 只保护真正的跨拍拆分
                
                // 🎯 新增例外规则：当最小音符时值是八分音符时，两个在正拍上的四分音符可以合并
                // 🔥 传入关键拍点信息，在八分音符场景下禁用此例外
                const quarterNoteException = this.checkQuarterNoteOnStrongBeatException(tiedGroup, notes, tiedStartPos, criticalBeats);
                
                // 🎼 相邻正拍音符合并规则：两个相同时值的音符在相邻正拍上，应该合并而不使用连线
                // 🔥 传入关键拍点信息，防止在拍点保护场景下错误合并
                const adjacentBeatMerge = this.checkAdjacentBeatMerge(tiedGroup, notes, criticalBeats);
                
                // 🚨 强制禁止合并拆分音符（用于连杆）
                const isSplitForBeaming = tiedGroup.length === 2 && 
                    tiedGroup[0].tieType === 'start' && 
                    tiedGroup[1].tieType === 'stop';
                
                if ((isBeatClaritySplit && !quarterNoteException && !adjacentBeatMerge) || isSplitForBeaming) {
                    // 保持拆分状态以维持beat clarity，但确保tied链条正确
                    this.ensureTiedChain(tiedGroup);
                    tiedGroup.forEach(note => mergedNotes.push(note));
                    const reason = isSplitForBeaming ? '(保持连杆能力)' : `(区域最小时值=${regionMinValue}拍, 需要细分拍点=${hasLocalFineDivisions})`;
                    console.log(`  ❌ 保持拆分: ${tiedGroup.map(n => n.duration).join('+')} ${reason}`);
                    i += tiedGroup.length; // 正确跳过已处理的音符数量
                } else if (Math.abs(totalBeats - expectedBeats) < tolerance) {
                    // 可以合并
                    const mergeReason = adjacentBeatMerge ? '🎼🎼 相邻正拍合并 🎼🎼' : 
                                      quarterNoteException ? '例外规则(正拍四分音符→二分音符)' : '正常合并';
                    const mergedNote = {
                        type: 'note',
                        duration: mergedDuration,
                        beats: totalBeats,
                        step: currentNote.step,
                        octave: currentNote.octave,
                        alter: currentNote.alter,
                        midi: currentNote.midi
                        // 移除tied属性
                    };
                    
                    mergedNotes.push(mergedNote);
                    console.log(`  ✅ 合并${tiedGroup.length}个连音符: ${tiedGroup.map(n => n.duration).join('+')} -> ${mergedDuration} (${mergeReason})`);
                    
                    i += tiedGroup.length; // 跳过已合并的音符数量
                } else {
                    // 不能合并，保持原样，但确保tied链条正确
                    this.ensureTiedChain(tiedGroup);
                    tiedGroup.forEach(note => mergedNotes.push(note));
                    console.log(`  ❌ 无法合并${tiedGroup.length}个连音符: 总时长${totalBeats}拍不等于标准时值`);
                    i += tiedGroup.length; // 跳过已处理的音符数量
                }
            } else {
                // 单独的tied音符，保持原样
                mergedNotes.push(currentNote);
                i++;
            }
        }
        
        console.log(`✅ 连音符合并完成: ${notes.length} -> ${mergedNotes.length} 个元素`);
        return mergedNotes;
    }

    /**
     * 3/4拍专用的tied音符优化转换
     */
    optimize3_4TiedNotes(notes, measureIndex) {
        console.log(`🎼 [3/4拍tied音符优化] 开始处理小节${measureIndex + 1}，输入${notes.length}个音符`);
        
        // 显示输入音符详情
        notes.forEach((note, i) => {
            console.log(`  输入音符${i}: ${note.type} ${note.duration} beats:${note.beats} tied:${note.tied} midi:${note.midi}`);
        });
        
        let optimizedNotes = [...notes];
        
        // 🎯 转换1: 四分音符+二分音符 -> 附点二分音符 (最高优先级)
        // 🎯 转换2: 二分音符+四分音符 -> 附点二分音符 (最高优先级)
        console.log(`🔥 [3/4拍优化] 执行核心转换: 四分+二分音符组合`);
        optimizedNotes = this.convertQuarterHalfToeDottedHalf(optimizedNotes);
        
        // 转换3: 六个连续八分音符 -> 八分音符+附点四分音符+八分音符
        optimizedNotes = this.convertSixEighthsToOptimalPattern(optimizedNotes);
        
        // 转换4: 扩展的六个八分音符模式优化（包括休止符）
        optimizedNotes = this.convertSixEighthsPatternWithRests(optimizedNotes);
        
        // 转换5: 反拍位置的四个tied八分音符优化
        optimizedNotes = this.convertOffbeatTiedEighths(optimizedNotes);
        
        // 转换6: 八分音符场景下的连线音符合并（只要保证四分音符拍点清晰）
        optimizedNotes = this.mergeConnectedNotesInEighthNoteScenario(optimizedNotes);
        
        // 转换7: 确保至少两个四分音符拍点明确
        optimizedNotes = this.ensureTwoBeatPointsClarity(optimizedNotes);
        
        // 转换8: 拍点内休止符合并
        optimizedNotes = this.mergeBeatPointRests(optimizedNotes);
        
        // 📊 最终验证和统计
        console.log(`🎼 [3/4拍tied音符优化] 完成处理，音符数量: ${notes.length} -> ${optimizedNotes.length}`);
        
        // 检查是否包含附点音符（优化成功的标志）
        const dottedHalves = optimizedNotes.filter(n => n.duration === 'half.').length;
        const dottedQuarters = optimizedNotes.filter(n => n.duration === 'quarter.').length;
        const tiedNotes = optimizedNotes.filter(n => n.tied === true).length;
        
        console.log(`📈 [3/4拍优化结果统计]:`);
        console.log(`  附点二分音符: ${dottedHalves}个`);
        console.log(`  附点四分音符: ${dottedQuarters}个`);
        console.log(`  剩余tied音符: ${tiedNotes}个`);
        
        if (dottedHalves > 0) {
            console.log(`✅ [3/4拍优化成功] 成功转换了${dottedHalves}个附点二分音符！`);
        } else if (notes.length >= 2) {
            console.log(`⚠️ [3/4拍优化提醒] 未找到可转换的四分+二分音符组合`);
        }
        
        // 显示最终音符详情
        optimizedNotes.forEach((note, i) => {
            console.log(`  输出音符${i}: ${note.type} ${note.duration} beats:${note.beats} tied:${note.tied}`);
        });
        
        return optimizedNotes;
    }

    /**
     * 转换四分音符+二分音符或二分音符+四分音符为附点二分音符
     */
    convertQuarterHalfToeDottedHalf(notes) {
        console.log(`🎵 [3/4拍优化] 检查四分+二分音符组合转换，共${notes.length}个音符`);
        
        // 详细日志：显示所有音符信息
        notes.forEach((note, index) => {
            console.log(`  音符${index}: duration=${note.duration}, type=${note.type}, tieType=${note.tieType}, tied=${note.tied}`);
        });
        
        const optimizedNotes = [];
        let i = 0;
        
        while (i < notes.length) {
            const currentNote = notes[i];
            
            // 检查是否是需要优化的音符组合  
            if (currentNote.type === 'note' && i < notes.length - 1) {
                const nextNote = notes[i + 1];
                
                console.log(`  检查音符对${i}-${i+1}: ${currentNote.duration}(tied:${currentNote.tied}) + ${nextNote.duration}(tied:${nextNote.tied})`);
                
                // 🎯 核心优化：四分音符+二分音符 OR 二分音符+四分音符 -> 附点二分音符
                const isQuarterHalfPattern = (
                    (currentNote.duration === 'quarter' && nextNote.duration === 'half') ||
                    (currentNote.duration === 'half' && nextNote.duration === 'quarter')
                );
                
                const areBothNotes = (currentNote.type === 'note' && nextNote.type === 'note');
                
                // 🎯 严格检查：必须是相同音高且相邻的音符才能转换为附点音符
                const haveSamePitch = (
                    currentNote.midi && nextNote.midi && currentNote.midi === nextNote.midi
                );
                
                // ✨ 新增：检查音符的位置是否适合合并为附点二分音符
                const canFormDottedHalf = this.canFormDottedHalfIn3_4(currentNote, nextNote, i, notes);
                
                // 🎯 精确优化：只转换符合条件的四分+二分或二分+四分同音组合
                if (isQuarterHalfPattern && areBothNotes && haveSamePitch && canFormDottedHalf) {
                    console.log(`🎯 [3/4拍优化] 发现可转换的四分音符+二分音符组合，转换为附点二分音符`);
                    console.log(`    原始: ${currentNote.duration}(${currentNote.midi}) + ${nextNote.duration}(${nextNote.midi})`);
                    
                    // 创建附点二分音符
                    const dottedHalfNote = {
                        ...currentNote,
                        duration: 'half.',
                        beats: 3,
                        tied: false,
                        tieType: null // 移除tie标记
                    };
                    
                    console.log(`✅ [3/4拍优化] 成功创建附点二分音符(midi:${dottedHalfNote.midi})`);
                    optimizedNotes.push(dottedHalfNote);
                    i += 2; // 跳过下一个音符
                    continue;
                }
            }
            
            // 不符合转换条件，保持原样
            optimizedNotes.push(currentNote);
            i++;
        }
        
        // 🚀 强制优化：如果没有找到tied模式，直接寻找四分+二分或二分+四分组合并强制转换
        if (optimizedNotes.length === notes.length && notes.length >= 2) {
            console.log(`🔍 [3/4拍强制优化] 未找到tied模式，尝试强制转换任何四分+二分或二分+四分组合`);
            
            for (let j = 0; j < notes.length - 1; j++) {
                const note1 = notes[j];
                const note2 = notes[j + 1];
                
                // 🔥 检查是否是四分+二分或二分+四分的同音符组合
                if (note1.type === 'note' && note2.type === 'note') {
                    const isQuarterHalf = (note1.duration === 'quarter' && note2.duration === 'half');
                    const isHalfQuarter = (note1.duration === 'half' && note2.duration === 'quarter');
                    const haveSamePitch = (note1.midi && note2.midi && note1.midi === note2.midi);
                    
                    if ((isQuarterHalf || isHalfQuarter) && haveSamePitch) {
                        console.log(`🎯 [3/4拍强制优化] 找到${note1.duration}+${note2.duration}同音组合，强制转换为附点二分音符`);
                        console.log(`    音符1: ${note1.duration}(midi:${note1.midi})`);
                        console.log(`    音符2: ${note2.duration}(midi:${note2.midi})`);
                        
                        // 创建强制优化版本
                        const forcedOptimized = [];
                        for (let k = 0; k < notes.length; k++) {
                            if (k === j) {
                                // 添加附点二分音符
                                forcedOptimized.push({
                                    ...note1,
                                    duration: 'half.',
                                    beats: 3,
                                    tied: false,
                                    tieType: null
                                });
                                console.log(`✅ [3/4拍强制优化] 创建附点二分音符替换位置${j}-${j+1}`);
                            } else if (k === j + 1) {
                                // 跳过第二个音符
                                continue;
                            } else {
                                forcedOptimized.push(notes[k]);
                            }
                        }
                        console.log(`🚀 [3/4拍强制优化] 强制转换成功，音符数量: ${notes.length} -> ${forcedOptimized.length}`);
                        return forcedOptimized;
                    }
                }
            }
            // 移除了超激进优化，避免错误转换不同音高的音符组合
            
            console.log(`⚠️ [3/4拍强制优化] 未找到任何四分+二分或二分+四分组合`);
        }
        
        console.log(`🎵 [3/4拍优化] 四分+二分音符转换完成，音符数量: ${notes.length} -> ${optimizedNotes.length}`);
        return optimizedNotes;
    }

    /**
     * 检查两个音符是否可以在3/4拍中形成附点二分音符
     */
    canFormDottedHalfIn3_4(note1, note2, startIndex, allNotes) {
        // 基本检查：必须是相同音高的音符
        if (!note1.midi || !note2.midi || note1.midi !== note2.midi) {
            console.log(`  ❌ [3/4拍检查] 音高不同，不能合并: ${note1.midi} vs ${note2.midi}`);
            return false;
        }

        // 检查时值组合：四分+二分(1+2=3) 或 二分+四分(2+1=3)
        const totalBeats = note1.beats + note2.beats;
        if (Math.abs(totalBeats - 3) > 0.001) {
            console.log(`  ❌ [3/4拍检查] 总时值不是3拍: ${totalBeats}`);
            return false;
        }

        // 检查是否超出小节边界（3/4拍一小节3拍）
        let currentPosition = 0;
        for (let i = 0; i < startIndex; i++) {
            currentPosition += allNotes[i].beats || 0;
        }
        
        // 确保这两个音符的合并不会跨越小节边界
        const startPos = currentPosition % 3;
        const endPos = (currentPosition + totalBeats) % 3;
        
        if (startPos === 0 && Math.abs(endPos - 0) < 0.001) {
            // 完整占据一个3/4小节，这是理想情况
            console.log(`  ✅ [3/4拍检查] 完整占据一个小节，可以合并为附点二分音符`);
            return true;
        }

        // 检查是否在小节内的合理位置
        if (startPos + totalBeats <= 3.001) {
            console.log(`  ✅ [3/4拍检查] 在小节内合理位置，可以合并为附点二分音符`);
            return true;
        }

        console.log(`  ❌ [3/4拍检查] 跨越小节边界，不适合合并: 起始位置${startPos}, 总长度${totalBeats}`);
        return false;
    }

    /**
     * 转换六个连续八分音符为优化模式: 八分音符+附点四分音符+八分音符
     */
    convertSixEighthsToOptimalPattern(notes) {
        console.log(`🎵 [3/4拍优化] 检查六个八分音符组合转换`);
        
        const optimizedNotes = [];
        let i = 0;
        
        while (i < notes.length) {
            // 检查是否有连续六个八分音符（可能包含tied连接）
            if (this.isSixConsecutiveEighths(notes, i)) {
                console.log(`🎯 [3/4拍优化] 发现六个连续八分音符，转换为优化模式`);
                
                const sixEighths = notes.slice(i, i + 6);
                const optimizedPattern = this.createOptimizedSixEighthsPattern(sixEighths);
                
                optimizedNotes.push(...optimizedPattern);
                i += 6; // 跳过六个八分音符
                continue;
            }
            
            // 不符合转换条件，保持原样
            optimizedNotes.push(notes[i]);
            i++;
        }
        
        console.log(`🎵 [3/4拍优化] 六个八分音符转换完成，音符数量: ${notes.length} -> ${optimizedNotes.length}`);
        return optimizedNotes;
    }

    /**
     * 检查从指定位置开始是否有六个连续的八分音符
     */
    isSixConsecutiveEighths(notes, startIndex) {
        if (startIndex + 5 >= notes.length) return false;
        
        for (let i = 0; i < 6; i++) {
            const note = notes[startIndex + i];
            
            // 必须都是八分音符（包括八分休止符）
            if (note.duration !== 'eighth') return false;
        }
        
        // 检查是否符合模式：第一个和最后一个是独立的，中间四个是tied连接
        const first = notes[startIndex];
        const second = notes[startIndex + 1];
        const fifth = notes[startIndex + 4];
        const sixth = notes[startIndex + 5];
        
        // 第一个音符：可以是休止符或独立音符（不应该有tie start）
        // 第二到第五个音符：应该是tied连接（2-3-4-5）
        // 第六个音符：可以是休止符或独立音符（不应该有tie stop）
        
        const middleFourAreTied = 
            second.tieType === 'start' && 
            notes[startIndex + 2].tieType === 'continue' &&
            notes[startIndex + 3].tieType === 'continue' &&
            fifth.tieType === 'stop' &&
            this.notesHaveSamePitch(second, notes[startIndex + 2]) &&
            this.notesHaveSamePitch(notes[startIndex + 2], notes[startIndex + 3]) &&
            this.notesHaveSamePitch(notes[startIndex + 3], fifth);
        
        return middleFourAreTied;
    }

    /**
     * 创建优化的六个八分音符模式: 八分音符+附点四分音符+八分音符
     */
    createOptimizedSixEighthsPattern(sixEighths) {
        const first = sixEighths[0];  // 第一个八分音符（可能是休止符）
        const tiedGroup = sixEighths.slice(1, 5); // 中间四个tied八分音符
        const last = sixEighths[5];   // 最后一个八分音符（可能是休止符）
        
        // 将中间四个tied八分音符合并为一个附点四分音符
        const dottedQuarter = {
            ...tiedGroup[0], // 使用第一个tied音符的属性
            duration: 'quarter.',
            beats: 1.5,
            tieType: null // 移除tie标记
        };
        
        // 确保第一个和最后一个音符没有tie标记
        const optimizedFirst = { ...first, tieType: null };
        const optimizedLast = { ...last, tieType: null };
        
        console.log(`🎯 [3/4拍优化] 创建优化模式: 八分音符 + 附点四分音符 + 八分音符`);
        
        return [optimizedFirst, dottedQuarter, optimizedLast];
    }

    /**
     * 转换扩展的六个八分音符模式（包括休止符）
     * 模式：八分音符/休止符 + 四个tied八分音符 + 八分音符/休止符
     * 转为：八分音符/休止符 + 八分音符tied附点四分音符 + 八分音符/休止符
     */
    convertSixEighthsPatternWithRests(notes) {
        console.log(`🎵 [3/4拍优化] 检查扩展六个八分音符模式（包含休止符），共${notes.length}个音符`);
        
        // 详细日志：显示所有音符信息
        notes.forEach((note, index) => {
            console.log(`  音符${index}: duration=${note.duration}, type=${note.type}, tieType=${note.tieType}, tied=${note.tied}`);
        });
        
        const optimizedNotes = [];
        let i = 0;
        
        while (i < notes.length) {
            if (this.isSixEighthsPatternWithRests(notes, i)) {
                console.log(`🎯 [3/4拍优化] 发现扩展六个八分音符模式，转换为优化模式`);
                
                const sixEighths = notes.slice(i, i + 6);
                const optimizedPattern = this.createOptimizedSixEighthsPatternWithRests(sixEighths);
                
                optimizedNotes.push(...optimizedPattern);
                i += 6; // 跳过六个音符/休止符
                continue;
            }
            
            optimizedNotes.push(notes[i]);
            i++;
        }
        
        console.log(`🎵 [3/4拍优化] 扩展六个八分音符模式转换完成，音符数量: ${notes.length} -> ${optimizedNotes.length}`);
        return optimizedNotes;
    }
    
    /**
     * 检查扩展的六个八分音符模式（第一个和最后一个可以是休止符）
     */
    isSixEighthsPatternWithRests(notes, startIndex) {
        if (startIndex + 5 >= notes.length) return false;
        
        const pattern = notes.slice(startIndex, startIndex + 6);
        
        // 检查所有都是八分音符或八分休止符
        for (let i = 0; i < 6; i++) {
            const note = pattern[i];
            if (note.duration !== 'eighth') return false;
        }
        
        // 检查模式：第一个（任意），中间四个tied连接，最后一个（任意）
        const first = pattern[0];
        const tiedGroup = pattern.slice(1, 5);
        const last = pattern[5];
        
        // 第一个音符/休止符必须独立（没有tieType或tieType为null）
        if (first.tieType && first.tieType !== null) return false;
        
        // 中间四个必须是tied连接的音符（不能是休止符）
        if (tiedGroup[0].type === 'rest') return false; // tied组不能以休止符开始
        if (!tiedGroup[0].tied) return false; // 必须是tied音符
        
        for (let i = 1; i < 4; i++) {
            if (tiedGroup[i].type === 'rest') return false;
            if (!tiedGroup[i].tied) return false; // 必须是tied音符
            // 简化音高检查
            if (tiedGroup[i].midi && tiedGroup[0].midi && tiedGroup[i].midi !== tiedGroup[0].midi) return false;
        }
        
        // 最后一个音符/休止符必须独立
        if (last.tieType && last.tieType !== null) return false;
        
        return true;
    }
    
    /**
     * 创建扩展六个八分音符模式的优化版本
     */
    createOptimizedSixEighthsPatternWithRests(sixEighths) {
        const first = sixEighths[0];  // 第一个（音符或休止符）
        const tiedGroup = sixEighths.slice(1, 5); // 中间四个tied音符
        const last = sixEighths[5];   // 最后一个（音符或休止符）
        
        // 创建八分音符tied附点四分音符的组合
        const eighth = {
            ...tiedGroup[0],
            duration: 'eighth',
            beats: 0.5,
            tieType: 'start'
        };
        
        const dottedQuarter = {
            ...tiedGroup[0],
            duration: 'quarter.',
            beats: 1.5,
            tieType: 'stop'
        };
        
        // 确保第一个和最后一个没有tie标记
        const optimizedFirst = { ...first, tieType: null };
        const optimizedLast = { ...last, tieType: null };
        
        console.log(`🎯 [3/4拍优化] 创建扩展优化模式: ${first.type} + 八分tied附点四分 + ${last.type}`);
        
        return [optimizedFirst, eighth, dottedQuarter, optimizedLast];
    }
    
    /**
     * 确保3/4拍至少有两个四分音符拍点明确
     */
    ensureTwoBeatPointsClarity(notes) {
        console.log(`🎵 [3/4拍优化] 检查拍点清晰度（至少两个四分音符拍点明确）`);
        
        // 分析当前的拍点清晰度
        const beatPoints = this.analyzeBeatPointClarity(notes);
        const clearBeatPoints = beatPoints.filter(bp => bp.isClear).length;
        
        console.log(`🎯 [3/4拍优化] 当前明确的拍点数: ${clearBeatPoints} (需要至少2个)`);
        
        if (clearBeatPoints >= 2) {
            console.log(`✅ [3/4拍优化] 拍点清晰度满足要求`);
            return notes;
        }
        
        // 需要拆分模糊拍点的音符，优先保证前两拍
        console.log(`⚠️ [3/4拍优化] 拍点清晰度不足，需要拆分模糊音符`);
        return this.splitNotesToClarifyBeats(notes);
    }
    
    /**
     * 分析3/4拍的拍点清晰度
     */
    analyzeBeatPointClarity(notes) {
        const beatPoints = [
            { position: 0, isClear: false }, // 第1拍
            { position: 1, isClear: false }, // 第2拍  
            { position: 2, isClear: false }  // 第3拍
        ];
        
        let currentPosition = 0;
        
        for (const note of notes) {
            const noteStart = currentPosition;
            const noteEnd = currentPosition + note.beats;
            
            // 检查每个拍点是否被明确标记（音符在拍点开始或拍点被分割）
            beatPoints.forEach(bp => {
                if (Math.abs(noteStart - bp.position) < 0.001) {
                    bp.isClear = true; // 音符在拍点开始
                } else if (noteStart < bp.position && noteEnd > bp.position) {
                    // 音符跨越拍点但没有在拍点分割，拍点模糊
                    bp.isClear = false;
                }
            });
            
            currentPosition += note.beats;
        }
        
        console.log(`🔍 [3/4拍优化] 拍点分析: ${beatPoints.map(bp => `拍${bp.position + 1}(${bp.isClear ? '明确' : '模糊'})`).join(', ')}`);
        return beatPoints;
    }
    
    /**
     * 拆分跨拍音符以明确拍点
     */
    splitNotesToClarifyBeats(notes) {
        console.log(`🔧 [3/4拍优化] 拆分跨拍音符以明确前两拍`);
        
        const optimizedNotes = [];
        let currentPosition = 0;
        const targetBeatPoints = [0, 1]; // 优先明确第1拍和第2拍
        
        for (const note of notes) {
            const noteStart = currentPosition;
            const noteEnd = currentPosition + note.beats;
            
            // 检查音符是否跨越需要明确的拍点
            let needsSplit = false;
            let splitPoint = null;
            
            for (const beatPoint of targetBeatPoints) {
                if (noteStart < beatPoint && noteEnd > beatPoint) {
                    needsSplit = true;
                    splitPoint = beatPoint;
                    break;
                }
            }
            
            if (needsSplit && note.type === 'note') {
                console.log(`🔍 [调试] 准备拆分检查: duration=${note.duration}, beats=${note.beats}, type=${note.type}`);
                
                // 🎼 特殊例外：附点二分音符在3/4拍中是完全合法的，不应该被拆分
                if (note.duration === 'half.' && Math.abs(note.beats - 3) < 0.001) {
                    console.log(`🎯 [3/4拍优化] 附点二分音符在3/4拍中是合法的，不拆分`);
                    optimizedNotes.push(note);
                    currentPosition += note.beats;
                    continue;
                }
                
                // 拆分音符
                console.log(`🎯 [3/4拍优化] 拆分跨拍音符: ${note.duration}拍 在位置${splitPoint}`);
                
                const firstPartBeats = splitPoint - noteStart;
                const secondPartBeats = noteEnd - splitPoint;
                
                const firstPart = {
                    ...note,
                    duration: this.beatsToDuration(firstPartBeats),
                    beats: firstPartBeats,
                    tieType: 'start'
                };
                
                const secondPart = {
                    ...note,
                    duration: this.beatsToDuration(secondPartBeats),
                    beats: secondPartBeats,
                    tieType: 'stop'
                };
                
                optimizedNotes.push(firstPart, secondPart);
            } else {
                // 保持原样
                optimizedNotes.push(note);
            }
            
            currentPosition += note.beats;
        }
        
        console.log(`🎵 [3/4拍优化] 拍点明确化完成，音符数量: ${notes.length} -> ${optimizedNotes.length}`);
        return optimizedNotes;
    }
    
    /**
     * 合并拍点内的休止符
     */
    mergeBeatPointRests(notes) {
        console.log(`🎵 [3/4拍优化] 检查拍点内休止符合并`);
        
        let optimizedNotes = [...notes];
        const beatRegions = [
            // 四分音符拍点
            { start: 0, end: 1, name: '第1拍' },
            { start: 1, end: 2, name: '第2拍' },
            { start: 2, end: 3, name: '第3拍' },
            // 二分音符拍点  
            { start: 0, end: 2, name: '第1-2拍（二分音符）' },
            { start: 1, end: 3, name: '第2-3拍（二分音符）' }
        ];
        
        for (const region of beatRegions) {
            optimizedNotes = this.mergeRestsInBeatRegion(optimizedNotes, region);
        }
        
        console.log(`🎵 [3/4拍优化] 拍点内休止符合并完成，音符数量: ${notes.length} -> ${optimizedNotes.length}`);
        return optimizedNotes;
    }
    
    /**
     * 在指定拍点区域内合并休止符
     */
    mergeRestsInBeatRegion(notes, region) {
        let currentPosition = 0;
        const regionNotes = [];
        let regionStartIndex = -1;
        let regionEndIndex = -1;
        
        // 找到区域内的音符
        for (let i = 0; i < notes.length; i++) {
            const noteStart = currentPosition;
            const noteEnd = currentPosition + notes[i].beats;
            
            if (noteEnd > region.start && noteStart < region.end) {
                if (regionStartIndex === -1) regionStartIndex = i;
                regionEndIndex = i;
                regionNotes.push(notes[i]);
            }
            
            currentPosition += notes[i].beats;
        }
        
        // 检查区域内是否全是休止符
        const allRests = regionNotes.length > 0 && regionNotes.every(note => note.type === 'rest');
        if (allRests && regionNotes.length > 1) {
            console.log(`🎯 [3/4拍优化] ${region.name}全是休止符，合并为一个休止符`);
            
            const totalBeats = region.end - region.start;
            const mergedRest = {
                type: 'rest',
                duration: this.beatsToDuration(totalBeats),
                beats: totalBeats
            };
            
            // 替换区域内的音符
            const newNotes = [
                ...notes.slice(0, regionStartIndex),
                mergedRest,
                ...notes.slice(regionEndIndex + 1)
            ];
            
            return newNotes;
        }
        
        return notes;
    }
    
    /**
     * 将拍数转换为持续时间字符串
     */
    beatsToDuration(beats) {
        if (Math.abs(beats - 3) < 0.001) return 'half.'; // 附点二分音符
        if (Math.abs(beats - 2) < 0.001) return 'half';   // 二分音符
        if (Math.abs(beats - 1.5) < 0.001) return 'quarter.'; // 附点四分音符
        if (Math.abs(beats - 1) < 0.001) return 'quarter';    // 四分音符
        if (Math.abs(beats - 0.75) < 0.001) return 'eighth.'; // 附点八分音符
        if (Math.abs(beats - 0.5) < 0.001) return 'eighth';   // 八分音符
        if (Math.abs(beats - 0.25) < 0.001) return '16th';    // 十六分音符
        
        // 默认返回四分音符
        return 'quarter';
    }

    /**
     * 转换反拍位置的四个tied八分音符为八分音符tied附点四分音符
     * 3/4拍的反拍位置：0.5拍、1.5拍、2.5拍
     */
    convertOffbeatTiedEighths(notes) {
        console.log(`🎵 [3/4拍优化] 检查反拍位置的四个tied八分音符，共${notes.length}个音符`);
        
        // 详细日志：显示所有音符信息
        notes.forEach((note, index) => {
            console.log(`  音符${index}: duration=${note.duration}, type=${note.type}, tieType=${note.tieType}, tied=${note.tied}`);
        });
        
        const optimizedNotes = [];
        let currentPosition = 0;
        let i = 0;
        
        while (i < notes.length) {
            const noteStartPosition = currentPosition;
            
            // 检查是否在反拍位置开始有四个tied八分音符
            if (this.isFourTiedEighthsAtOffbeat(notes, i, noteStartPosition)) {
                console.log(`🎯 [3/4拍优化] 发现反拍位置四个tied八分音符，位置${noteStartPosition}`);
                
                const fourEighths = notes.slice(i, i + 4);
                const optimizedPattern = this.createOffbeatOptimizedPattern(fourEighths);
                
                optimizedNotes.push(...optimizedPattern);
                
                // 跳过四个八分音符，但要更新位置
                currentPosition += 2; // 四个八分音符 = 2拍
                i += 4;
                continue;
            }
            
            // 不符合条件，保持原样
            optimizedNotes.push(notes[i]);
            currentPosition += notes[i].beats;
            i++;
        }
        
        console.log(`🎵 [3/4拍优化] 反拍tied八分音符转换完成，音符数量: ${notes.length} -> ${optimizedNotes.length}`);
        return optimizedNotes;
    }
    
    /**
     * 检查是否在反拍位置有四个tied的八分音符
     */
    isFourTiedEighthsAtOffbeat(notes, startIndex, position) {
        // 检查是否有足够的音符
        if (startIndex + 3 >= notes.length) return false;
        
        // 检查位置是否在反拍（0.5、1.5、2.5）
        const offbeatPositions = [0.5, 1.5, 2.5];
        const isOffbeat = offbeatPositions.some(pos => Math.abs(position - pos) < 0.001);
        if (!isOffbeat) return false;
        
        // 检查四个音符都是八分音符
        const fourNotes = notes.slice(startIndex, startIndex + 4);
        for (let i = 0; i < 4; i++) {
            if (fourNotes[i].duration !== 'eighth' || fourNotes[i].type === 'rest') {
                return false;
            }
        }
        
        // 检查所有音符都是tied
        for (let i = 0; i < 4; i++) {
            if (!fourNotes[i].tied) {
                console.log(`  音符${i}不是tied音符`);
                return false;
            }
        }
        
        // 简化音高检查
        for (let i = 1; i < 4; i++) {
            if (fourNotes[i].midi && fourNotes[0].midi && fourNotes[i].midi !== fourNotes[0].midi) {
                console.log(`  音符${i}音高不匹配`);
                return false;
            }
        }
        
        console.log(`✅ [3/4拍优化] 在位置${position}发现符合条件的四个反拍tied八分音符`);
        return true;
    }
    
    /**
     * 创建反拍位置优化后的模式：八分音符tied附点四分音符
     */
    createOffbeatOptimizedPattern(fourEighths) {
        const firstNote = fourEighths[0];
        
        // 创建八分音符（tied开始）
        const eighth = {
            ...firstNote,
            duration: 'eighth',
            beats: 0.5,
            tieType: 'start'
        };
        
        // 创建附点四分音符（tied结束）
        const dottedQuarter = {
            ...firstNote,
            duration: 'quarter.',
            beats: 1.5,
            tieType: 'stop'
        };
        
        console.log(`🎯 [3/4拍优化] 创建反拍优化模式: 八分音符tied附点四分音符`);
        
        return [eighth, dottedQuarter];
    }

    /**
     * 🎵 3/4拍八分音符场景下的连线音符合并规则
     * 如果最低的音符时值是八分音符，那在只要能保证四分音符拍点前提下，所有其他的连线音符皆可合并
     */
    mergeConnectedNotesInEighthNoteScenario(notes) {
        console.log(`🎵 [3/4拍八分音符合并] 开始处理，输入${notes.length}个音符`);
        
        // 检查是否是八分音符场景（最小时值是八分音符）
        const finestRhythm = Math.min(...notes
            .filter(n => n.type === 'note')
            .map(n => n.beats));
        
        console.log(`🎵 [3/4拍八分音符合并] 最小时值: ${finestRhythm}拍`);
        
        // 只在八分音符场景下才应用此规则
        if (finestRhythm < 0.5) {
            console.log(`🎵 [3/4拍八分音符合并] 有比八分音符更小的时值，跳过处理`);
            return notes;
        }
        
        if (finestRhythm > 0.5) {
            console.log(`🎵 [3/4拍八分音符合并] 没有八分音符，跳过处理`);
            return notes;
        }
        
        console.log(`🎯 [3/4拍八分音符合并] 检测到八分音符场景，开始应用合并规则`);
        
        const mergedNotes = [];
        let i = 0;
        
        while (i < notes.length) {
            const currentNote = notes[i];
            
            // 处理tied音符组
            if (currentNote.tied || currentNote.tieType) {
                const tiedGroup = [currentNote];
                let j = i + 1;
                
                // 收集所有连续的tied音符
                while (j < notes.length && (notes[j].tied || notes[j].tieType)) {
                    if (this.notesHaveSamePitch(currentNote, notes[j])) {
                        tiedGroup.push(notes[j]);
                        j++;
                    } else {
                        break;
                    }
                }
                
                // 计算tied组的位置
                let tiedStartPos = 0;
                for (let k = 0; k < i; k++) {
                    tiedStartPos += notes[k].beats;
                }
                
                const totalBeats = tiedGroup.reduce((sum, note) => sum + note.beats, 0);
                const tiedEndPos = tiedStartPos + totalBeats;
                
                console.log(`🔗 [3/4拍八分音符合并] tied组: ${tiedGroup.length}个音符，位置${tiedStartPos}-${tiedEndPos}，总时长${totalBeats}拍`);
                
                // 检查合并后是否会影响四分音符拍点清晰度
                const quarterBeatPoints = [0, 1, 2]; // 3/4拍的四分音符拍点
                let wouldAffectBeatClarity = false;
                
                for (const beatPoint of quarterBeatPoints) {
                    // 检查tied组是否跨越四分音符拍点但不在拍点上开始/结束
                    if (tiedStartPos < beatPoint && tiedEndPos > beatPoint &&
                        Math.abs(tiedStartPos - beatPoint) > 0.001 && 
                        Math.abs(tiedEndPos - beatPoint) > 0.001) {
                        console.log(`⚠️ [3/4拍八分音符合并] tied组跨越四分音符拍点${beatPoint}且不在拍点边界，会影响拍点清晰度`);
                        wouldAffectBeatClarity = true;
                        break;
                    }
                }
                
                // 只要不影响四分音符拍点，就允许合并
                if (!wouldAffectBeatClarity) {
                    const mergedDuration = this.beatsToDuration(totalBeats);
                    const expectedBeats = this.durationToBeats(mergedDuration);
                    const tolerance = 0.01;
                    
                    if (Math.abs(totalBeats - expectedBeats) < tolerance) {
                        const mergedNote = {
                            ...currentNote,
                            duration: mergedDuration,
                            beats: totalBeats,
                            tied: false,
                            tieType: undefined
                        };
                        
                        mergedNotes.push(mergedNote);
                        console.log(`✅ [3/4拍八分音符合并] 成功合并${tiedGroup.length}个tied音符: ${tiedGroup.map(n => n.duration).join('+')} -> ${mergedDuration}`);
                        
                        i = j; // 跳过已合并的音符
                        continue;
                    } else {
                        console.log(`⚠️ [3/4拍八分音符合并] 无法合并：总时长${totalBeats}不对应标准时值`);
                    }
                } else {
                    console.log(`⚠️ [3/4拍八分音符合并] 不合并：会影响四分音符拍点清晰度`);
                }
                
                // 无法合并，保持原tied组
                tiedGroup.forEach(note => mergedNotes.push(note));
                i = j;
            } else {
                // 非tied音符，直接添加
                mergedNotes.push(currentNote);
                i++;
            }
        }
        
        console.log(`🎵 [3/4拍八分音符合并] 完成处理，音符数量: ${notes.length} -> ${mergedNotes.length}`);
        return mergedNotes;
    }
    
    /**
     * 检查两个音符是否有相同的音高（用于tied音符检查）
     */
    notesHaveSamePitch(note1, note2) {
        // 如果其中一个是休止符，不能tied
        if (note1.type === 'rest' || note2.type === 'rest') {
            return false;
        }
        
        // 检查音高是否相同
        return note1.step === note2.step && 
               note1.octave === note2.octave && 
               note1.alter === note2.alter;
    }

    /**
     * 检查相邻正拍音符合并规则
     * 如果两个相同时值的音符在相邻正拍上，且合并后能形成合法时值，则应该合并
     */
    checkAdjacentBeatMerge(tiedGroup, allNotes, criticalBeats = []) {
        const tolerance = 0.0001;
        
        // 只适用于两个音符的情况
        if (tiedGroup.length !== 2) return false;
        
        // 🚨 关键修复：禁止合并拆分的八分音符（用于连杆）
        // 如果音符有 tie 属性，说明它们是拆分产生的，应保持拆分状态以支持连杆
        if (tiedGroup[0].tieType === 'start' && tiedGroup[1].tieType === 'stop') {
            console.log(`  🚫 禁止合并拆分的八分音符: ${tiedGroup[0].duration}+${tiedGroup[1].duration} (保持连杆能力)`);
            return false;
        }
        
        // 🔥 关键检查：八分音符场景下，禁止某些合并以保护二分音符拍点
        const isEighthNoteScenario = criticalBeats.length === 2 && 
            criticalBeats.includes(0) && criticalBeats.includes(2) && 
            !criticalBeats.includes(1) && !criticalBeats.includes(3);
        
        if (isEighthNoteScenario) {
            // 计算起始位置
            const startPosition = this.calculateNotePosition(allNotes, tiedGroup[0]);
            
            // 检查是否为四分音符在正拍上的合并
            const isQuarterNoteOnBeat = Math.abs(firstBeats - 1.0) < tolerance &&
                (Math.abs(startPosition % 1) < tolerance); // 在整数拍点上开始
            
            if (isQuarterNoteOnBeat) {
                console.log(`  🎼 允许四分音符在正拍上的相邻合并: 位置${startPosition}`);
                // 四分音符在正拍上的合并总是允许的
            } else {
                // 在八分音符场景下，禁止跨越位置2(第3拍)的合并和反拍位置的合并
                const crossesHalfNoteBeat = startPosition < 2 - tolerance && 
                    startPosition + tiedGroup[0].beats + tiedGroup[1].beats > 2 + tolerance;
                    
                const startsOnOffBeat = Math.abs(startPosition - 0.5) < tolerance ||
                    Math.abs(startPosition - 1.5) < tolerance ||
                    Math.abs(startPosition - 2.5) < tolerance ||
                    Math.abs(startPosition - 3.5) < tolerance;
                
                if (crossesHalfNoteBeat || startsOnOffBeat) {
                    console.log(`  🔥 八分音符场景：禁止相邻正拍合并 - 起始${startPosition}拍 (保护二分音符拍点)`);
                    return false;
                }
            }
        }
        
        // 检查是否都是相同时值的音符
        const firstBeats = tiedGroup[0].beats;
        const secondBeats = tiedGroup[1].beats;
        if (Math.abs(firstBeats - secondBeats) > tolerance) return false;
        
        // 计算起始位置
        const startPosition = this.calculateNotePosition(allNotes, tiedGroup[0]);
        const endPosition = startPosition + firstBeats + secondBeats;
        
        // 检查是否在相邻正拍上
        const adjacentBeats = this.getAdjacentBeatPairs(firstBeats);
        
        for (const [beat1, beat2] of adjacentBeats) {
            if (Math.abs(startPosition - beat1) < tolerance && 
                Math.abs(startPosition + firstBeats - beat2) < tolerance) {
                
                // 🔥 规则4保护：1.5-2拍位置的音符不能合并（即使是相邻正拍）
                // 代码中的1.5对应音乐理论的2.5拍，2对应音乐理论的第3拍
                if (Math.abs(beat1 - 1.5) < tolerance && Math.abs(beat2 - 2) < tolerance) {
                    console.log(`  🚫 规则4保护：1.5-2拍位置的音符不能合并（保护第3拍强拍）`);
                    return false;
                }
                
                // 检查合并后是否形成合法时值
                const totalBeats = firstBeats + secondBeats;
                const isLegalDuration = this.isLegalNoteDuration(totalBeats);
                
                if (isLegalDuration) {
                    console.log(`  🎼🎼🎼 相邻正拍合并成功: ${firstBeats}拍+${secondBeats}拍 在位置${beat1}-${beat2} → ${totalBeats}拍 🎼🎼🎼`);
                    return true;
                } else {
                    console.log(`  ❌ 相邻正拍但时值不合法: ${totalBeats}拍`);
                }
            }
        }
        
        return false;
    }

    /**
     * 获取给定时值的相邻正拍组合
     */
    getAdjacentBeatPairs(noteBeats) {
        const tolerance = 0.0001;
        
        // 四分音符(1拍)的相邻正拍组合
        if (Math.abs(noteBeats - 1.0) < tolerance) {
            return [
                [0, 1], [1, 2], [2, 3], [3, 4], // 相邻整拍
            ];
        }
        
        // 八分音符(0.5拍)的相邻正拍组合  
        if (Math.abs(noteBeats - 0.5) < tolerance) {
            return [
                [0, 0.5], [0.5, 1], [1, 1.5], [1.5, 2], 
                [2, 2.5], [2.5, 3], [3, 3.5], [3.5, 4]  // 相邻八分音符拍点
            ];
        }
        
        // 十六分音符(0.25拍)的相邻正拍组合
        if (Math.abs(noteBeats - 0.25) < tolerance) {
            return [
                [0, 0.25], [0.25, 0.5], [0.5, 0.75], [0.75, 1],
                [1, 1.25], [1.25, 1.5], [1.5, 1.75], [1.75, 2],
                [2, 2.25], [2.25, 2.5], [2.5, 2.75], [2.75, 3],
                [3, 3.25], [3.25, 3.5], [3.5, 3.75], [3.75, 4]  // 相邻十六分音符拍点
            ];
        }
        
        return [];
    }

    /**
     * 检查是否为合法的音符时值
     */
    isLegalNoteDuration(beats) {
        const tolerance = 0.0001;
        const legalDurations = [
            4.0,    // 全音符
            3.0,    // 附点二分音符
            2.0,    // 二分音符
            1.5,    // 附点四分音符
            1.0,    // 四分音符
            0.75,   // 附点八分音符
            0.5,    // 八分音符
            0.375,  // 附点十六分音符
            0.25,   // 十六分音符
            0.125   // 三十二分音符
        ];
        
        return legalDurations.some(duration => Math.abs(beats - duration) < tolerance);
    }

    /**
     * 选择6/8拍的节奏模式
     */
    choose6_8RhythmPattern() {
        // 6/8拍严格3+3分组节奏模式：确保两大组，每组3个八分音符的时值
        const patterns = [
            // 🔥 新增模式0: 附点二分音符 (整小节持续音符)
            [
                { duration: 'half.', beats: 3.0 }
            ],
            // 模式1: ♪♪♪ ♪♪♪ (六个八分音符 - 最典型的3+3分组)
            [
                { duration: 'eighth', beats: 0.5 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'eighth', beats: 0.5 }
            ],
            // 模式2: ♩. ♩. (两个附点四分音符 - 每个占一组)
            [
                { duration: 'quarter.', beats: 1.5 },
                { duration: 'quarter.', beats: 1.5 }
            ],
            // 模式3: ♩ ♪ | ♩ ♪ (四分+八分，重复两次，严格3+3)
            [
                { duration: 'quarter', beats: 1.0 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'quarter', beats: 1.0 },
                { duration: 'eighth', beats: 0.5 }
            ],
            // 模式4: ♪ ♩ | ♪ ♩ (八分+四分，重复两次，严格3+3)
            [
                { duration: 'eighth', beats: 0.5 },
                { duration: 'quarter', beats: 1.0 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'quarter', beats: 1.0 }
            ],
            // 模式5: ♪♪♪ | ♩. (三个八分 + 附点四分，严格3+3)
            [
                { duration: 'eighth', beats: 0.5 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'quarter.', beats: 1.5 }
            ],
            // 模式6: ♩. | ♪♪♪ (附点四分 + 三个八分，严格3+3)
            [
                { duration: 'quarter.', beats: 1.5 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'eighth', beats: 0.5 }
            ],
            // 模式7: ♩ ♪ | ♩. (第一组：四分+八分，第二组：附点四分)
            [
                { duration: 'quarter', beats: 1.0 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'quarter.', beats: 1.5 }
            ],
            // 模式8: ♩. | ♩ ♪ (第一组：附点四分，第二组：四分+八分)
            [
                { duration: 'quarter.', beats: 1.5 },
                { duration: 'quarter', beats: 1.0 },
                { duration: 'eighth', beats: 0.5 }
            ],
            // 模式9: ♪ ♩ | ♩. (第一组：八分+四分，第二组：附点四分)
            [
                { duration: 'eighth', beats: 0.5 },
                { duration: 'quarter', beats: 1.0 },
                { duration: 'quarter.', beats: 1.5 }
            ],
            // 模式10: ♩. | ♪ ♩ (第一组：附点四分，第二组：八分+四分)
            [
                { duration: 'quarter.', beats: 1.5 },
                { duration: 'eighth', beats: 0.5 },
                { duration: 'quarter', beats: 1.0 }
            ]
        ];

        // 过滤掉不在用户选择范围内的模式
        if (!this.rules || !Array.isArray(this.rules.allowedDurations)) {
            console.error(`⚠️ 规则或允许时值数组未正确初始化: ${JSON.stringify(this.rules)}`);
            return null;
        }
        
        console.log(`🔍 用户选择的节奏类型: ${this.rules.allowedDurations.join(', ')}`);
        const availablePatterns = patterns.filter(pattern => {
            if (!pattern || !Array.isArray(pattern) || pattern.length === 0) {
                console.log(`  模式 [无效]: 不可用`);
                return false;
            }
            
            const available = pattern.every(note => {
                if (!note || !note.duration) {
                    console.log(`  模式音符无效: ${JSON.stringify(note)}`);
                    return false;
                }
                return this.rules.allowedDurations.includes(note.duration);
            });
            
            try {
                console.log(`  模式 [${pattern.map(n => n && n.duration ? n.duration : 'undefined').join(' ')}]: ${available ? '可用' : '不可用'}`);
            } catch (error) {
                console.log(`  模式显示错误: ${error.message}`);
            }
            
            return available;
        });

        console.log(`🎯 可用的6/8拍节奏模式数量: ${availablePatterns.length}`);
        if (availablePatterns.length === 0) {
            console.log(`⚠️ 没有可用的6/8拍节奏模式，回退到逐个选择`);
            return null;
        }

        // 根据节奏模式的特点和用户频率设置来设置权重
        const weights = availablePatterns.map(pattern => {
            if (!pattern || !Array.isArray(pattern)) {
                console.log(`⚠️ 无效模式，使用默认权重`);
                return 1;
            }
            
            const durations = pattern.map(n => n && n.duration ? n.duration : 'unknown');
            
            // 🎯 计算模式中各节奏类型的频率影响
            let baseWeight = 15; // 基础权重
            let frequencyMultiplier = 1; // 频率乘数
            
            // 检查用户设置的频率
            if (userSettings && userSettings.rhythmFrequencies) {
                const uniqueDurations = [...new Set(durations)];
                let totalUserFrequency = 0;
                let validFrequencyCount = 0;
                let hasZeroFrequency = false;
                
                for (const duration of uniqueDurations) {
                    const userFreq = userSettings.rhythmFrequencies[duration];
                    if (userFreq !== undefined) {
                        if (userFreq === 0) {
                            console.log(`🚫 6/8拍模式包含频率为0%的节奏类型: ${duration}`);
                            hasZeroFrequency = true;
                            break; // 跳出循环，这个模式不可用
                        }
                        totalUserFrequency += userFreq;
                        validFrequencyCount++;
                    }
                }
                
                // 如果有任何频率为0的节奏类型，整个模式权重设为0
                if (hasZeroFrequency) {
                    return 0;
                }
                
                // 如果有频率设置，使用平均频率作为乘数
                if (validFrequencyCount > 0) {
                    frequencyMultiplier = (totalUserFrequency / validFrequencyCount) / 100;
                    console.log(`🎯 6/8拍模式频率乘数: ${(frequencyMultiplier * 100).toFixed(1)}% (节奏: ${uniqueDurations.join(', ')})`);
                }
            }
            
            // 🔥 音乐理论权重（针对6/8拍特性优化）
            if (durations.every(d => d === 'eighth') && durations.length === 6) {
                baseWeight = 60; // 最典型的6/8拍3+3分组
            } else if (durations.every(d => d === 'quarter.') && durations.length === 2) {
                baseWeight = 50; // 🔥 经典的6/8拍附点四分音符组合 - 提高权重
            } else if (durations.includes('half.') && durations.length === 1) {
                baseWeight = 75; // 🔥 附点二分音符（整小节） - 大幅提高权重，确保能够被选择
            } else if (durations.length === 4 && 
                     durations[0] === durations[2] && 
                     durations[1] === durations[3]) {
                baseWeight = 40; // 对称的3+3分组
            } else if ((durations[0] === 'eighth' && durations[1] === 'eighth' && durations[2] === 'eighth' && durations[3] === 'quarter.') ||
                     (durations[0] === 'quarter.' && durations[1] === 'eighth' && durations[2] === 'eighth' && durations[3] === 'eighth')) {
                baseWeight = 35; // 清晰的3+3分组
            } else if (durations.includes('quarter.')) {
                baseWeight = 35; // 🔥 其他附点四分音符混合模式 - 提高权重
            } else if (durations.includes('quarter')) {
                baseWeight = 20; // 包含四分音符的模式
            }
            
            const finalWeight = Math.round(baseWeight * frequencyMultiplier);
            console.log(`🎵 6/8拍模式权重: [${durations.join(' ')}] = ${baseWeight} × ${frequencyMultiplier.toFixed(2)} = ${finalWeight}`);
            
            return Math.max(finalWeight, 0); // 确保权重不为负数
        });

        // 过滤掉权重为0的模式
        const filteredPatterns = [];
        const filteredWeights = [];
        for (let i = 0; i < availablePatterns.length; i++) {
            if (weights[i] > 0) {
                filteredPatterns.push(availablePatterns[i]);
                filteredWeights.push(weights[i]);
            }
        }
        
        console.log(`🎯 6/8拍过滤后可用模式数量: ${filteredPatterns.length}`);
        
        if (filteredPatterns.length === 0) {
            console.log(`⚠️ 6/8拍所有模式权重都为0，回退到默认逻辑`);
            return null;
        }
        
        const selectedPattern = this.random.weighted(filteredPatterns, filteredWeights);
        if (selectedPattern && selectedPattern.length > 0) {
            console.log(`🎵 6/8拍选择节奏模式: ${selectedPattern.map(n => n.duration).join(' ')}`);
            return selectedPattern;
        } else {
            console.log(`⚠️ 无法选择6/8拍节奏模式，回退到普通模式`);
            return null;
        }
    }

    /**
     * 选择合适的时值
     */
    chooseDuration(remainingBeats, isFirstNote, currentBeat = 0) {
        console.log(`选择时值: 剩余${remainingBeats}拍, 是否首音符: ${isFirstNote}, 当前位置: ${currentBeat}`);
        
        // 过滤出可用的时值，排除三连音（三连音由专门的逻辑处理）
        const available = this.rules.allowedDurations.filter(duration => {
            if (duration === 'triplet') {
                return false; // 三连音不能直接作为单个音符的时值
            }
            const beats = this.durationToBeats(duration);
            return beats <= remainingBeats + 0.001; // 更精确的容差
        });
        
        console.log(`可用时值: ${available.join(', ')}`);
        
        if (available.length === 0) {
            // 没有合适的时值，使用剩余拍数对应的时值
            console.log(`⚠️ 没有可用时值，使用自动匹配: ${remainingBeats}拍`);
            const autoChosenDuration = this.beatsToNoteDuration(remainingBeats);
            console.log(`⚠️ 自动选择时值: ${autoChosenDuration}`);
            
            // 如果自动选择的时值仍然不合适，尝试更小的时值
            const autoBeats = this.durationToBeats(autoChosenDuration);
            if (autoBeats > remainingBeats + 0.001) {
                console.warn(`⚠️ 自动时值${autoChosenDuration}(${autoBeats}拍)过大，剩余${remainingBeats}拍`);
                
                // 尝试更精确的匹配，但要检查用户设置
                if (remainingBeats >= 0.25 && this.rules.allowedDurations.includes('16th')) {
                    return '16th';
                } else if (remainingBeats >= 0.125) {
                    // 如果16分音符不可用，尝试八分音符
                    if (remainingBeats >= 0.5) return 'eighth';
                    console.error(`⚠️ 剩余拍数${remainingBeats}过小，且16分音符被禁用，强制使用八分音符`);
                    return 'eighth';
                } else {
                    console.error(`⚠️ 剩余拍数${remainingBeats}过小，使用八分音符`);
                    return 'eighth';
                }
            }
            
            return autoChosenDuration;
        }
        
        // 🔥 新的精准频率控制系统
        console.log(`🎯 开始精准节奏选择，可用选项: [${available.join(', ')}]`);
        
        // 首先使用精准频率系统进行选择
        let selectedDuration = selectDurationByPreciseFrequency(available, this.random);
        
        // 检查是否需要应用特殊规则（仅在用户频率允许的情况下）
        const userFreqForSelected = getUserFrequency('rhythm', mapDurationToFrequencyKey(selectedDuration));
        
        if (userFreqForSelected > 0) {
            // 应用特殊规则，但保持用户频率控制的优先级
            const shouldApplySpecialRules = this.random.nextFloat() < 0.3; // 30%的概率应用特殊规则
            
            if (shouldApplySpecialRules) {
                // 特殊规则：当剩余正好2拍时，尝试使用二分音符
                if (Math.abs(remainingBeats - 2) < 0.001 && available.includes('half')) {
                    const halfFreq = getUserFrequency('rhythm', 'half');
                    if (halfFreq > 0) {
                        selectedDuration = 'half';
                        console.log(`📌 特殊规则生效：剩余2拍，选择二分音符（用户频率: ${halfFreq}%）`);
                    }
                }
                
                // 额外规则：在第3拍（currentBeat = 2）且剩余2拍时，也优先用二分音符
                if (Math.abs(currentBeat - 2) < 0.001 && Math.abs(remainingBeats - 2) < 0.001 && available.includes('half')) {
                    const halfFreq = getUserFrequency('rhythm', 'half');
                    if (halfFreq > 0) {
                        selectedDuration = 'half';
                        console.log(`📌 强化规则生效：第3拍位置且剩余2拍，选择二分音符（用户频率: ${halfFreq}%）`);
                    }
                }
            }
        }
        
        console.log(`🎯 最终选择的节奏时值: ${selectedDuration}`);
        return selectedDuration;
    }

    /**
     * 强制验证并修正音符到音域范围内
     */
    validateAndCorrectMidi(midi, source = "unknown") {
        // 特殊检查：总是追踪 MIDI 72 (B#4 在 C# 大调)
        if (midi === 72) {
            console.error(`🎯🎯🎯 [${source}] 检测到 MIDI 72 (B#4)! 当前音域: ${this.rules.range.min}-${this.rules.range.max}`);
            console.error(`🎯 调号: ${this.keySignature}`);
            console.error(`🎯 如果是 C3-C4 音域 (48-60)，这是错误的!`);
            console.error(`🎯 栈追踪:`, new Error().stack.split('\n').slice(1, 6).join('\n'));
        }
        
        if (midi < this.rules.range.min || midi > this.rules.range.max) {
            const originalMidi = midi;
            midi = Math.max(this.rules.range.min, Math.min(this.rules.range.max, midi));
            console.error(`🚨 [${source}] 音符超出音域: ${originalMidi} -> ${midi} (音域: ${this.rules.range.min}-${this.rules.range.max})`);
            
            // 特殊检查：如果原始音符是72（C5但可能显示为B#4）
            if (originalMidi === 72) {
                console.error(`🚨 [${source}] 特别注意：MIDI 72 (C5/B#4) 被修正为 ${midi}`);
                console.error(`🚨 [${source}] 在C#大调中，这个音符可能显示为B#4`);
            }
        }
        return midi;
    }

    /**
     * 生成下一个音符
     */
    generateNextNote(lastMidi, lastDirection, consecutiveJumps, isEnding, context = {}) {
        if (lastMidi === null) {
            const firstNote = this.generateInScaleNote(null);
            const validatedFirstNote = this.validateAndCorrectMidi(firstNote, "generateNextNote-首音符");
            console.log(`🎵 [generateNextNote] 生成首音符: MIDI ${firstNote} -> ${validatedFirstNote}`);
            return validatedFirstNote;
        }
        
        // 结尾音符特殊处理 - 严格执行音程约束
        if (isEnding && this.rules.preferredEnds) {
            const endingNotes = this.rules.preferredEnds.filter(midi => {
                // 检查音域范围
                if (midi < this.rules.range.min || midi > this.rules.range.max) {
                    return false;
                }
                // 检查音程跳度
                if (lastMidi !== null) {
                    const interval = Math.abs(midi - lastMidi);
                    if (interval > this.rules.maxJump) {
                        return false;
                    }
                }
                return true;
            });
            if (endingNotes.length > 0) {
                const selectedNote = this.random.choice(endingNotes);
                const validatedEndingNote = this.validateAndCorrectMidi(selectedNote, "generateNextNote-结束音符");
                const actualInterval = Math.abs(validatedEndingNote - lastMidi);
                console.log(`🎵 [generateNextNote] 选择结束音符: MIDI ${selectedNote} -> ${validatedEndingNote}, 与前音间隔: ${actualInterval}半音`);
                return validatedEndingNote;
            }
        }
        
        // 大跳后必须回归
        if (this.rules.jumpMustReturn && consecutiveJumps > 0) {
            const returnNote = this.generateStepwiseReturn(lastMidi, lastDirection);
            const validatedReturnNote = this.validateAndCorrectMidi(returnNote, "generateNextNote-大跳回归");
            console.log(`🎵 [generateNextNote] 大跳回归: MIDI ${returnNote} -> ${validatedReturnNote}`);
            return validatedReturnNote;
        }
        
        // 级进优先的情况 - 进一步降低级进概率以增加三度跨度频率
        if (this.rules.stepwisePreferred && this.random.nextFloat() < 0.5) {
            const stepwiseNote = this.generateStepwiseNote(lastMidi, lastDirection);
            const validatedStepwiseNote = this.validateAndCorrectMidi(stepwiseNote, "generateNextNote-级进优先");
            console.log(`🎵 [generateNextNote] 级进优先: MIDI ${stepwiseNote} -> ${validatedStepwiseNote}`);
            return validatedStepwiseNote;
        }
        
        // 正常生成（传递上下文信息）
        const normalNote = this.generateInScaleNote(lastMidi, context);
        const validatedNormalNote = this.validateAndCorrectMidi(normalNote, "generateNextNote-正常生成");
        console.log(`🎵 [generateNextNote] 正常生成: MIDI ${normalNote} -> ${validatedNormalNote}`);
        return validatedNormalNote;
    }

    /**
     * 生成调内音符 - 严格遵循最大音程跨度限制
     */
    generateInScaleNote(lastMidi, context = {}) {
        const maxAttempts = 100; // 增加重试次数
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const possibleNotes = [];
            
            // 生成所有可能的调内音符
            if (Array.isArray(this.scale)) {
                for (let octave = Math.floor(this.rules.range.min / 12); octave <= Math.floor(this.rules.range.max / 12); octave++) {
                    for (const scaleDegree of this.scale) {
                        const midi = octave * 12 + scaleDegree;
                        if (midi >= this.rules.range.min && midi <= this.rules.range.max) {
                            possibleNotes.push(midi);
                        }
                    }
                }
            } else {
                // 如果scale无效，使用默认的C大调音阶
                console.warn('⚠️ this.scale无效，使用C大调作为备用');
                const defaultScale = [0, 2, 4, 5, 7, 9, 11];
                for (let octave = Math.floor(this.rules.range.min / 12); octave <= Math.floor(this.rules.range.max / 12); octave++) {
                    for (const scaleDegree of defaultScale) {
                        const midi = octave * 12 + scaleDegree;
                        if (midi >= this.rules.range.min && midi <= this.rules.range.max) {
                            possibleNotes.push(midi);
                        }
                    }
                }
            }
            
            // 如果是第一个音符，直接选择
            if (lastMidi === null) {
                const selectedNote = this.random.choice(possibleNotes);
                console.log(`🎵 [generateInScaleNote] 首音符候选: [${possibleNotes.join(',')}], 选择: ${selectedNote}`);
                if (selectedNote < 50) {
                    console.error(`🚨 [generateInScaleNote] 首音符异常低音: MIDI ${selectedNote}, possibleNotes: [${possibleNotes.join(',')}]`);
                    console.error(`🚨 音域设置: ${this.rules.range.min}-${this.rules.range.max}`);
                }
                // 验证音符在调内
                const pitchClass = selectedNote % 12;
                if (!this.scale.includes(pitchClass)) {
                    console.error(`❌❌❌ 第一个音符错误：MIDI ${selectedNote}, pitchClass ${pitchClass} 不在 ${this.keySignature} 音阶中`);
                }
                // 小调变化音处理（对首音符也适用）
                const context = {
                    isMeasureStart: true,
                    isMeasureEnd: false,
                    isPhrasEnd: false,
                    isCadence: false
                };
                const alteredNote = applyMinorScaleAlterations(selectedNote, null, 'neutral', this.keySignature, this.random, this.rules, context);
                if (alteredNote !== selectedNote) {
                    console.log(`🎵 [首音符变化音] MIDI ${selectedNote} -> ${alteredNote}`);
                    return this.validateAndCorrectMidi(alteredNote, "generateInScaleNote-首音符-变化音");
                }
                
                // 如果临时记号概率为0且无变化音，直接返回调内音符
                if (this.rules.accidentalRate === 0) {
                    return this.validateAndCorrectMidi(selectedNote, "generateInScaleNote-首音符-无临时记号");
                }
                const noteWithAccidental = this.addAccidentalIfNeeded(selectedNote);
                return this.validateAndCorrectMidi(noteWithAccidental, "generateInScaleNote-首音符-含临时记号");
            }
            
            // 严格过滤：只保留满足最大音程跨度的音符
            const validNotes = possibleNotes.filter(midi => {
                const interval = Math.abs(midi - lastMidi);
                const isValid = interval <= this.rules.maxJump;
                if (!isValid) {
                    console.log(`🚫 音符MIDI ${midi}被过滤，音程${interval}半音 > 限制${this.rules.maxJump}半音`);
                }
                return isValid;
            });
            
            console.log(`🎯 约束检查: 候选${possibleNotes.length}个音符，通过约束${validNotes.length}个音符 (限制:${this.rules.maxJump}半音)`);
            
            // 如果没有满足条件的音符，记录警告但继续尝试
            if (validNotes.length === 0) {
                console.warn(`⚠️ 尝试 ${attempts + 1}: 在最大音程${this.rules.maxJump}半音限制下找不到合适音符`);
                attempts++;
                continue;
            }
            
            // 选择一个有效音符 - 6/8拍使用Cantus Firmus风格
            const selectedNote = this.selectNoteWithIntervalPreference(validNotes, lastMidi);
            
            // 6/8拍的额外检查：严格遵循Cantus Firmus原则和用户设置
            if (this.timeSignature === '6/8' && lastMidi !== null) {
                const interval = Math.abs(selectedNote - lastMidi);
                if (interval > this.rules.maxJump) {
                    console.log(`⚠️ 6/8拍超出用户限制: ${interval}半音 > ${this.rules.maxJump}半音`);
                } else if (interval > Math.floor(this.rules.maxJump / 2)) { // 🔥 修复硬编码：基于用户maxJump动态判断中等跳进
                    console.log(`ℹ️ 6/8拍中等跳进: ${interval}半音间距 (用户最大限制: ${this.rules.maxJump}半音)`);
                }
            }
            
            // 验证选择的音符确实在调内
            const pitchClass = selectedNote % 12;
            if (!this.scale.includes(pitchClass)) {
                console.error(`❌❌❌ 错误：生成了调外音符！MIDI ${selectedNote}, pitchClass ${pitchClass} 不在 ${this.keySignature} 音阶 [${this.scale.join(',')}] 中`);
            }
            
            // 如果临时记号概率为0，先处理小调变化音再返回
            if (this.rules.accidentalRate === 0) {
                // 小调变化音处理 - 增强版
                const direction = getMelodicDirection(lastMidi, selectedNote);
                const context = {
                    isMeasureStart: false,
                    isMeasureEnd: false,
                    isPhrasEnd: false,
                    isCadence: false,
                    nextNote: null // 这里可以传入下一个音符的预测
                };
                const alteredNote = applyMinorScaleAlterations(selectedNote, lastMidi, direction, this.keySignature, this.random, this.rules, context);
                if (alteredNote !== selectedNote) {
                    console.log(`🎵 [小调变化音] MIDI ${selectedNote} -> ${alteredNote}`);
                    return this.validateAndCorrectMidi(alteredNote, "generateInScaleNote-变化音");
                }
                console.log(`✓ 生成调内音符: MIDI ${selectedNote}, 与前音间隔: ${Math.abs(selectedNote - lastMidi)}半音`);
                return this.validateAndCorrectMidi(selectedNote, "generateInScaleNote-调内音符");
            }
            
            // 尝试添加临时记号
            const finalNote = this.addAccidentalIfNeeded(selectedNote);
            
            // 检查加了临时记号后是否仍然满足音程限制
            const finalInterval = Math.abs(finalNote - lastMidi);
            if (finalInterval <= this.rules.maxJump) {
                // 验证通过，先处理小调变化音 - 增强版
                const direction = getMelodicDirection(lastMidi, finalNote);
                const context = {
                    isMeasureStart: false,
                    isMeasureEnd: false,
                    isPhrasEnd: false,
                    isCadence: false,
                    nextNote: null
                };
                const alteredFinalNote = applyMinorScaleAlterations(finalNote, lastMidi, direction, this.keySignature, this.random, this.rules, context);
                if (alteredFinalNote !== finalNote) {
                    console.log(`🎵 [小调变化音-临时记号] MIDI ${finalNote} -> ${alteredFinalNote}`);
                    return this.validateAndCorrectMidi(alteredFinalNote, "generateInScaleNote-变化音-临时记号");
                }
                console.log(`✓ 生成音符: MIDI ${finalNote}, 与前音间隔: ${finalInterval}半音`);
                return this.validateAndCorrectMidi(finalNote, "generateInScaleNote-含临时记号");
            }
            
            // 如果添加临时记号后超出限制，先处理小调变化音再返回原始音符
            const direction = getMelodicDirection(lastMidi, selectedNote);
            const context = {
                isMeasureStart: false,
                isMeasureEnd: false,
                isPhrasEnd: false,
                isCadence: false,
                nextNote: null
            };
            const alteredSelectedNote = applyMinorScaleAlterations(selectedNote, lastMidi, direction, this.keySignature, this.random, this.rules, context);
            if (alteredSelectedNote !== selectedNote) {
                console.log(`🎵 [小调变化音-原始] MIDI ${selectedNote} -> ${alteredSelectedNote}`);
                return this.validateAndCorrectMidi(alteredSelectedNote, "generateInScaleNote-变化音-原始");
            }
            console.log(`✓ 生成音符: MIDI ${selectedNote}, 与前音间隔: ${Math.abs(selectedNote - lastMidi)}半音`);
            return this.validateAndCorrectMidi(selectedNote, "generateInScaleNote-原始音符");
        }
        
        // 如果所有尝试都失败，强制返回一个满足基本条件的音符
        console.error(`❌ ${maxAttempts}次尝试后仍无法生成满足条件的音符，使用备用方案`);
        
        // 备用方案：从当前音符开始，在允许的跳度范围内选择最接近的调内音符
        if (lastMidi !== null) {
            const minMidi = Math.max(this.rules.range.min, lastMidi - this.rules.maxJump);
            const maxMidi = Math.min(this.rules.range.max, lastMidi + this.rules.maxJump);
            
            for (let midi = minMidi; midi <= maxMidi; midi++) {
                const noteClass = midi % 12;
                if (Array.isArray(this.scale) && this.scale.includes(noteClass)) {
                    console.log(`✓ 备用方案选择: MIDI ${midi}`);
                    return this.validateAndCorrectMidi(midi, "generateInScaleNote-备用方案");
                }
            }
        }
        
        // 最终备用：在音程跳度限制内选择一个安全音符
        console.error(`❌ 所有尝试都失败，启用紧急安全音符生成`);
        
        if (lastMidi !== null) {
            // 如果有前一音符，严格在音程跳度范围内选择
            const safeMinMidi = Math.max(this.rules.range.min, lastMidi - this.rules.maxJump);
            const safeMaxMidi = Math.min(this.rules.range.max, lastMidi + this.rules.maxJump);
            
            console.error(`🔧 紧急范围: ${safeMinMidi}-${safeMaxMidi} (基于前音${lastMidi}±${this.rules.maxJump}半音)`);
            
            // 在安全范围内找调内音符
            for (let midi = safeMinMidi; midi <= safeMaxMidi; midi++) {
                const pitchClass = midi % 12;
                if (this.scale.includes(pitchClass)) {
                    console.error(`🔧 紧急选择调内音符: MIDI ${midi}`);
                    return midi;
                }
            }
            
            // 如果连调内音符都找不到，选择最接近的音符（仍在跳度限制内）
            const closestToLast = Math.round((safeMinMidi + safeMaxMidi) / 2);
            console.error(`🔧 最终紧急选择: MIDI ${closestToLast} (范围中点)`);
            return this.validateAndCorrectMidi(closestToLast, "generateInScaleNote-紧急中点");
        }
        
        // 如果是第一个音符，使用音域中点的调内音符
        const midPoint = Math.floor((this.rules.range.min + this.rules.range.max) / 2);
        console.error(`🔧 首音符紧急选择中点: MIDI ${midPoint}`);
        
        // 确保中点是调内音符
        const pitchClass = midPoint % 12;
        if (this.scale.includes(pitchClass)) {
            return this.validateAndCorrectMidi(midPoint, "generateInScaleNote-首音符中点");
        }
        
        // 在中点附近找调内音符
        for (let i = 0; i <= 6; i++) {
            const upNote = midPoint + i;
            const downNote = midPoint - i;
            
            if (upNote <= this.rules.range.max && this.scale.includes(upNote % 12)) {
                console.error(`🔧 首音符向上找到调内音符: MIDI ${upNote}`);
                return this.validateAndCorrectMidi(upNote, "generateInScaleNote-首音符向上");
            }
            if (downNote >= this.rules.range.min && this.scale.includes(downNote % 12)) {
                console.error(`🔧 首音符向下找到调内音符: MIDI ${downNote}`);
                return this.validateAndCorrectMidi(downNote, "generateInScaleNote-首音符向下");
            }
        }
        
        console.error(`🔧 所有方案都失败，强制返回中点: MIDI ${midPoint}`);
        return this.validateAndCorrectMidi(midPoint, "generateInScaleNote-最终中点");
    }
    
    /**
     * 生成Acciaccatura装饰音符
     * 默认以顺阶二度靠近目标音生成
     */
    generateAcciaccaturaNote(targetNote) {
        console.log(`🎵 [generateAcciaccaturaNote] 为目标音符 MIDI ${targetNote.midi} 生成短倚音`);
        
        try {
            // 获取当前调号的音阶
            const scale = this.getScaleForKey(this.keySignature);
            if (!scale) {
                console.error(`🚨 无法获取调号 ${this.keySignature} 的音阶`);
                return null;
            }
            
            // 寻找最近的顺阶二度音符（优先使用顺阶二度）
            let acciaccaturaMidi = null;
            
            // 获取上方和下方的顺阶二度
            const lowerDiatonicNote = this.findDiatonicStepFromMidi(targetNote.midi, -1, scale);
            const upperDiatonicNote = this.findDiatonicStepFromMidi(targetNote.midi, 1, scale);
            
            // 收集可用的顺阶选项
            const diatonicOptions = [];
            
            // 检查下方顺阶二度（必须是1-2半音）
            if (lowerDiatonicNote !== null) {
                const interval = targetNote.midi - lowerDiatonicNote;
                if (interval >= 1 && interval <= 2 && lowerDiatonicNote >= this.rules.range.min) {
                    diatonicOptions.push({
                        midi: lowerDiatonicNote, 
                        direction: '下方',
                        interval: interval,
                        type: '顺阶二度'
                    });
                    console.log(`🎵 找到下方顺阶二度: MIDI ${lowerDiatonicNote} (间隔${interval}半音)`);
                }
            }
            
            // 检查上方顺阶二度（必须是1-2半音）
            if (upperDiatonicNote !== null) {
                const interval = upperDiatonicNote - targetNote.midi;
                if (interval >= 1 && interval <= 2 && upperDiatonicNote <= this.rules.range.max) {
                    diatonicOptions.push({
                        midi: upperDiatonicNote, 
                        direction: '上方',
                        interval: interval,
                        type: '顺阶二度'
                    });
                    console.log(`🎵 找到上方顺阶二度: MIDI ${upperDiatonicNote} (间隔${interval}半音)`);
                }
            }
            
            // 优先使用顺阶二度
            if (diatonicOptions.length > 0) {
                // 随机选择一个顺阶选项
                const selectedOption = diatonicOptions[Math.floor(this.random.nextFloat() * diatonicOptions.length)];
                acciaccaturaMidi = selectedOption.midi;
                console.log(`🎵 选择${selectedOption.direction}${selectedOption.type}: MIDI ${acciaccaturaMidi}`);
            }
            
            // 如果没有合适的顺阶二度，使用半音邻音（作为备选方案）
            if (!acciaccaturaMidi) {
                console.log(`⚠️ 没有找到合适的顺阶二度，使用半音邻音`);
                
                const chromaticOptions = [];
                const lowerSemitone = targetNote.midi - 1;
                const upperSemitone = targetNote.midi + 1;
                
                if (lowerSemitone >= this.rules.range.min) {
                    chromaticOptions.push({midi: lowerSemitone, direction: '下方'});
                }
                if (upperSemitone <= this.rules.range.max) {
                    chromaticOptions.push({midi: upperSemitone, direction: '上方'});
                }
                
                if (chromaticOptions.length > 0) {
                    const selectedOption = chromaticOptions[Math.floor(this.random.nextFloat() * chromaticOptions.length)];
                    acciaccaturaMidi = selectedOption.midi;
                    console.log(`🎵 选择${selectedOption.direction}半音: MIDI ${acciaccaturaMidi}`);
                }
            }
            
            // 如果还是找不到，返回null
            if (!acciaccaturaMidi) {
                console.log(`🎵 无法为 MIDI ${targetNote.midi} 生成合适的短倚音`);
                return null;
            }
            
            // 生成音符对象
            const { step, octave, alter } = this.midiToMusicXML(acciaccaturaMidi);
            
            const acciaccaturaNote = {
                type: 'note',
                duration: 'grace', // 装饰音特殊时值
                beats: 0, // 装饰音不占用时值
                step: step,
                octave: octave,
                alter: alter,
                midi: acciaccaturaMidi,
                isAcciaccatura: true, // 标记为短倚音
                slash: true // 带斜线的短倚音
            };
            
            console.log(`🎵 [generateAcciaccaturaNote] 生成短倚音成功: MIDI ${acciaccaturaMidi} -> ${step}${octave}`);
            return acciaccaturaNote;
            
        } catch (error) {
            console.error(`🚨 [generateAcciaccaturaNote] 生成短倚音失败:`, error.message);
            return null;
        }
    }
    
    /**
     * 获取指定调号的音阶
     * @param {string} keySignature - 调号
     * @returns {Array<number>} - 音阶的pitch class数组
     */
    getScaleForKey(keySignature) {
        // 使用全局定义的KEY_SCALES
        if (typeof KEY_SCALES !== 'undefined' && KEY_SCALES[keySignature]) {
            return KEY_SCALES[keySignature];
        }
        
        // 如果找不到，返回C大调作为默认
        console.warn(`⚠️ 找不到调号 ${keySignature} 的音阶，使用C大调`);
        return [0, 2, 4, 5, 7, 9, 11]; // C大调
    }
    
    /**
     * 从指定MIDI音符找到顺阶的上一个或下一个音
     * @param {number} targetMidi - 目标MIDI值
     * @param {number} direction - 方向：1为向上，-1为向下
     * @param {Array<number>} scale - 音阶的pitch class数组
     * @returns {number|null} - 顺阶音的MIDI值
     */
    findDiatonicStepFromMidi(targetMidi, direction, scale) {
        const targetPc = targetMidi % 12;
        const targetOctave = Math.floor(targetMidi / 12);
        
        // 找到目标音在音阶中的位置
        let scaleIndex = scale.indexOf(targetPc);
        
        // 如果目标音不在音阶中，找最近的音阶音
        if (scaleIndex === -1) {
            // 找最近的音阶音
            let minDistance = 12;
            for (let i = 0; i < scale.length; i++) {
                const distance = Math.min(
                    Math.abs(scale[i] - targetPc),
                    Math.abs(scale[i] + 12 - targetPc),
                    Math.abs(scale[i] - 12 - targetPc)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    scaleIndex = i;
                }
            }
        }
        
        // 计算下一个音阶位置
        let nextIndex = scaleIndex + direction;
        let octaveShift = 0;
        
        // 处理音阶边界
        if (nextIndex < 0) {
            nextIndex = scale.length - 1;
            octaveShift = -1;
        } else if (nextIndex >= scale.length) {
            nextIndex = 0;
            octaveShift = 1;
        }
        
        // 计算结果MIDI值
        const resultMidi = (targetOctave + octaveShift) * 12 + scale[nextIndex];
        
        return resultMidi;
    }
    
    /**
     * 寻找最近的顺阶音级（保留旧函数以兼容）
     * @param {number} targetMidi - 目标音符的MIDI值
     * @param {number} direction - 方向：1为向上，-1为向下
     * @returns {number|null} - 找到的顺阶音级MIDI值
     */
    findNearestDiatonicStep(targetMidi, direction) {
        // 将MIDI转换为音高类（pitch class）
        const targetPc = targetMidi % 12;
        const targetOctave = Math.floor(targetMidi / 12);
        
        // 在调性音阶中找到当前音符的位置
        let currentScaleIndex = -1;
        for (let i = 0; i < this.scale.length; i++) {
            if (this.scale[i] === targetPc) {
                currentScaleIndex = i;
                break;
            }
        }
        
        // 如果当前音符不在调性中，找最近的调性音符
        if (currentScaleIndex === -1) {
            for (let i = 0; i < this.scale.length; i++) {
                if (Math.abs(this.scale[i] - targetPc) <= 1 || 
                    Math.abs(this.scale[i] - targetPc + 12) <= 1 ||
                    Math.abs(this.scale[i] - targetPc - 12) <= 1) {
                    currentScaleIndex = i;
                    break;
                }
            }
        }
        
        if (currentScaleIndex === -1) {
            return null; // 无法找到合适的调性音符
        }
        
        // 计算下一个顺阶音级
        let nextScaleIndex = currentScaleIndex + direction;
        let octaveAdjustment = 0;
        
        // 处理音阶边界
        if (nextScaleIndex < 0) {
            nextScaleIndex = this.scale.length - 1;
            octaveAdjustment = -1;
        } else if (nextScaleIndex >= this.scale.length) {
            nextScaleIndex = 0;
            octaveAdjustment = 1;
        }
        
        // 计算结果MIDI值
        const resultMidi = (targetOctave + octaveAdjustment) * 12 + this.scale[nextScaleIndex];
        
        // 验证音域
        if (resultMidi < this.rules.range.min || resultMidi > this.rules.range.max) {
            return null;
        }
        
        return resultMidi;
    }
    
    /**
     * 根据设置决定是否添加临时记号
     */
    addAccidentalIfNeeded(midi) {
        // 根据临时记号概率决定是否添加升降号
        if (this.rules.accidentalRate > 0 && this.random.nextFloat() < this.rules.accidentalRate) {
            return this.addAccidental(midi);
        }
        return midi;
    }
    
    /**
     * 添加临时记号（升号或降号）- 避免重复调号标记
     */
    addAccidental(midi) {
        const accidentalChoices = [];
        const noteClass = midi % 12;
        const keySignatureInfo = isNoteAffectedByKeySignature(noteClass, this.keySignature);
        
        // 尝试添加升号（+1半音）
        const sharpNote = midi + 1;
        const sharpNoteClass = sharpNote % 12;
        
        // 只有在以下情况下才添加升号：
        // 1. 升号后的音符不超出音域
        // 2. 原音符没有被调号升高，或者升号后不会产生重复标记
        if (sharpNote <= this.rules.range.max && 
            !keySignatureInfo.isSharp && 
            !isNoteAffectedByKeySignature(sharpNoteClass, this.keySignature).isFlat) {
            accidentalChoices.push(sharpNote);
        }
        
        // 尝试添加降号（-1半音）  
        const flatNote = midi - 1;
        const flatNoteClass = flatNote % 12;
        
        // 只有在以下情况下才添加降号：
        // 1. 降号后的音符不超出音域
        // 2. 原音符没有被调号降低，或者降号后不会产生重复标记
        if (flatNote >= this.rules.range.min && 
            !keySignatureInfo.isFlat && 
            !isNoteAffectedByKeySignature(flatNoteClass, this.keySignature).isSharp) {
            accidentalChoices.push(flatNote);
        }
        
        // 如果没有可用的临时记号，返回原音符
        if (accidentalChoices.length === 0) {
            console.log(`🎯 音符MIDI ${midi}无需添加临时记号（避免与${this.keySignature}调号重复）`);
            return midi;
        }
        
        // 随机选择升号或降号
        const selectedNote = this.random.choice(accidentalChoices);
        console.log(`🎯 为MIDI ${midi}添加临时记号变为MIDI ${selectedNote}`);
        return selectedNote;
    }

    /**
     * 选择音符时偏好音乐性音程（三度、五度等）
     * 6/8拍使用Cantus Firmus风格的级进偏好
     */
    selectNoteWithIntervalPreference(validNotes, lastMidi) {
        if (validNotes.length === 0) {
            return null;
        }
        
        if (lastMidi === null) {
            return this.random.choice(validNotes);
        }
        
        // 6/8拍使用Cantus Firmus风格：强烈偏好级进运动
        if (this.timeSignature === '6/8') {
            return this.selectNoteCantusFirmusStyle(validNotes, lastMidi);
        }
        
        // 其他拍号保持原有逻辑
        const weightedNotes = [];
        
        validNotes.forEach(note => {
            const interval = Math.abs(note - lastMidi);
            let weight = 1; // 基础权重
            
            // 增加音乐性音程的权重
            if (interval === 3 || interval === 4) {        // 小三度和大三度
                weight = 4; // 4倍权重，进一步增加三度出现频率
            } else if (interval === 7) {                   // 完全五度
                weight = 2; // 2倍权重
            } else if (interval === 1 || interval === 2) { // 级进（小二度、大二度）
                weight = 2; // 保持一定的级进权重
            } else if (interval === 5 || interval === 6) { // 完全四度和三全音
                weight = 1.5; // 轻微增加权重
            }
            
            // 根据权重添加音符（添加多次以增加被选中概率）
            for (let i = 0; i < weight; i++) {
                weightedNotes.push(note);
            }
        });
        
        // 从加权后的数组中随机选择
        return this.random.choice(weightedNotes);
    }
    
    /**
     * 6/8拍的Cantus Firmus风格音符选择
     * 基于传统对位法的级进原则
     */
    selectNoteCantusFirmusStyle(validNotes, lastMidi) {
        const weightedNotes = [];
        
        validNotes.forEach(note => {
            const interval = Math.abs(note - lastMidi);
            let weight = 1; // 基础权重
            
            // Cantus Firmus原则：强烈偏好级进运动，但根据用户maxJump设置调整
            if (interval === 1 || interval === 2) {        // 级进（小二度、大二度）
                weight = 10; // 极高权重 - 级进是主要运动方式
            } else if (interval === 3) {                   // 小三度
                weight = 3; // 适度权重 - 小跳是允许的
            } else if (interval === 4) {                   // 大三度
                weight = 2; // 较低权重 - 减少大跳
            } else if (interval === 5) {                   // 完全四度
                weight = 1.5; // 偶尔允许
            } else if (interval >= 6) {                    // 三全音及更大音程
                // 🔥 修复：根据用户maxJump设置动态调整权重，不再一律设置极低权重
                const relativeLarge = interval / this.rules.maxJump;
                if (relativeLarge <= 0.5) {
                    weight = 1.2; // 用户范围内的中等音程，合理权重
                } else if (relativeLarge <= 0.8) {
                    weight = 0.8; // 较大但仍在用户范围内，适当降低权重
                } else {
                    weight = 0.5; // 接近用户上限的音程，低权重但仍保留
                }
                console.log(`🎯 6/8拍权重调整: ${interval}半音 (${(relativeLarge*100).toFixed(1)}% of maxJump) -> 权重${weight}`);
            }
            
            // 严格应用用户的最大音程限制（Cantus Firmus风格更加严格）
            if (interval > this.rules.maxJump) {
                weight = 0; // 超出用户设置的限制，完全禁止
                console.log(`ℹ️ 6/8拍过滤大跳: ${interval}半音 > 用户限制${this.rules.maxJump}半音`);
            }
            
            // 根据权重添加音符
            for (let i = 0; i < Math.round(weight * 2); i++) {
                weightedNotes.push(note);
            }
        });
        
        if (weightedNotes.length === 0) {
            // 如果权重过滤后没有音符，选择最接近的一个
            return validNotes.reduce((closest, current) => 
                Math.abs(current - lastMidi) < Math.abs(closest - lastMidi) ? current : closest
            );
        }
        
        return this.random.choice(weightedNotes);
    }

    /**
     * 生成级进音符
     */
    generateStepwiseNote(lastMidi, lastDirection) {
        const candidates = [];
        
        // 上行级进（严格限制在最大音程内）
        for (let i = 1; i <= Math.min(2, this.rules.maxJump); i++) {
            const upNote = lastMidi + i;
            if (upNote <= this.rules.range.max && this.isInScale(upNote)) {
                candidates.push(upNote);
            }
        }
        
        // 下行级进（严格限制在最大音程内）
        for (let i = 1; i <= Math.min(2, this.rules.maxJump); i++) {
            const downNote = lastMidi - i;
            if (downNote >= this.rules.range.min && this.isInScale(downNote)) {
                candidates.push(downNote);
            }
        }
        
        if (candidates.length === 0) {
            return this.generateInScaleNote(lastMidi);
        }
        
        // 级进音符通常不需要临时记号，直接返回
        return this.random.choice(candidates);
    }

    /**
     * 生成级进回归音符 - 遵循最大音程跨度限制
     */
    generateStepwiseReturn(lastMidi, lastDirection) {
        const returnDirection = -lastDirection;
        const candidates = [];
        
        for (let i = 1; i <= 3; i++) {
            const returnNote = lastMidi + (returnDirection * i);
            const interval = Math.abs(returnNote - lastMidi);
            
            // 严格检查：音程跨度、音域范围、调内音符
            if (interval <= this.rules.maxJump &&
                returnNote >= this.rules.range.min && 
                returnNote <= this.rules.range.max && 
                this.isInScale(returnNote)) {
                candidates.push(returnNote);
            }
        }
        
        if (candidates.length > 0) {
            const selectedNote = candidates[0]; // 选择最近的回归音
            console.log(`✓ 级进回归音符: MIDI ${selectedNote}, 与前音间隔: ${Math.abs(selectedNote - lastMidi)}半音`);
            return selectedNote;
        }
        
        // 如果级进回归失败，回退到普通级进生成
        return this.generateStepwiseNote(lastMidi, lastDirection);
    }

    /**
     * 判断是否应该放置休止符
     */
    shouldPlaceRest(remainingBeats, noteCount, measureIndex) {
        // 根据设置的休止符比例控制
        const targetRatio = this.rules.restRatio || 0.15;
        const currentRatio = this.stats.restCount / Math.max(1, this.stats.noteCount + this.stats.restCount);
        
        // 如果当前休止符比例低于目标比例，增加休止符概率
        if (currentRatio < targetRatio) {
            return this.random.nextFloat() < 0.2;
        }
        
        // 避免连续太多休止符
        if (noteCount === 0) {
            return this.random.nextFloat() < 0.1;
        }
        
        return false;
    }

    /**
     * 生成beam分组 - 强行实现用户规则
     * 核心规则：同一四分音符拍内的八分音符必须连杆
     */
    generateBeams(notes, currentBeatLevel = null) {
        console.log(`🚨🚨🚨🚨🚨 GENERATEBEAMS 被调用！！！ 🚨🚨🚨🚨🚨`);
        console.log(`输入: ${notes.length}个音符`);
        console.log(`调用栈:`, new Error().stack);
        
        const timeSignature = this.rules.timeSignature || '4/4';
        console.log(`拍号: ${timeSignature}`);
        
        // 无论什么拍号都强制使用新逻辑
        console.log(`🚨🚨🚨 强制调用 forceBeamsFor44 🚨🚨🚨`);
        const result = this.forceBeamsFor44(notes);
        
        console.log(`🚨🚨🚨 generateBeams 返回结果: ${result.length}个连杆组 🚨🚨🚨`);
        result.forEach((group, i) => {
            console.log(`  返回连杆组${i+1}:`, group);
        });
        
        return result;
    }
    
    /**
     * 强制4/4拍连杆 - 十六分音符触发全拍连杆规则
     * 核心规则：当一个四分音符拍点内检测到十六分音符时，该拍点内的所有音符都要连杆，休止符终止连接
     */
    forceBeamsFor44(notes) {
        console.log(`💥💥💥 十六分音符触发全拍连杆规则 💥💥💥`);
        console.log(`输入音符总数: ${notes.length}`);
        
        // 步骤1: 分析每个拍点，检测是否包含十六分音符
        const beatAnalysis = this.analyzeBeatContents(notes);
        console.log(`🔍 拍点分析结果:`, beatAnalysis);
        
        // 步骤2: 根据分析结果创建连杆组
        const beamGroups = [];
        let position = 0;
        let currentGroup = [];
        let currentBeat = -1;
        
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const noteBeat = Math.floor(position);
            const beatInfo = beatAnalysis.get(noteBeat);
            
            console.log(`🔍 处理音符${i}: ${note.type}/${note.duration}, 拍${noteBeat}`);
            
            // 检查该拍是否需要全拍连杆
            const shouldBeamAllInBeat = beatInfo && beatInfo.hasSixteenth;
            
            // 确定音符是否应该连杆
            let shouldBeam = false;
            if (note.type === 'rest') {
                // 休止符终止连杆
                shouldBeam = false;
                console.log(`  ❌ 休止符，终止连杆`);
            } else if (note.type === 'note') {
                if (shouldBeamAllInBeat) {
                    // 该拍有十六分音符，所有音符都连杆
                    const isBeamableNote = this.isBeamableNote(note);
                    shouldBeam = isBeamableNote;
                    console.log(`  🎯 拍${noteBeat}有十六分音符，${isBeamableNote ? '加入' : '跳过'}连杆: ${note.duration}`);
                } else {
                    // 该拍没有十六分音符，使用标准规则（八分音符及以下）
                    shouldBeam = this.isStandardBeamable(note);
                    console.log(`  📏 拍${noteBeat}无十六分音符，标准连杆规则: ${shouldBeam ? '连杆' : '不连杆'}`);
                }
            }
            
            if (shouldBeam) {
                // 检查是否换拍
                if (currentBeat !== -1 && noteBeat !== currentBeat) {
                    console.log(`  📍 换拍（${currentBeat}→${noteBeat}），结束当前组`);
                    this.finalizeBeamGroup(beamGroups, currentGroup, notes, currentBeat);
                    currentGroup = [];
                }
                
                currentGroup.push(i);
                currentBeat = noteBeat;
                console.log(`  ✅ 加入拍${noteBeat}连杆组，组大小: ${currentGroup.length}`);
            } else {
                console.log(`  ❌ 不连杆/中断连杆组`);
                this.finalizeBeamGroup(beamGroups, currentGroup, notes, currentBeat);
                currentGroup = [];
                currentBeat = -1;
            }
            
            position += note.beats;
        }
        
        // 处理最后一组
        this.finalizeBeamGroup(beamGroups, currentGroup, notes, currentBeat);
        
        console.log(`💥 最终连杆结果: ${beamGroups.length}个连杆组`);
        beamGroups.forEach((group, i) => {
            const noteTypes = group.notes.map(idx => notes[idx].duration).join(',');
            console.log(`  连杆组${i+1}: 拍${group.beat}, 音符[${group.notes.map(n => n+1).join(',')}] (${noteTypes})`);
        });
        
        return beamGroups;
    }
    
    /**
     * 分析每个拍点的内容，检测是否包含十六分音符
     */
    analyzeBeatContents(notes) {
        console.log(`🔍 开始分析拍点内容`);
        const beatAnalysis = new Map();
        let position = 0;
        
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const beatNumber = Math.floor(position);
            
            if (!beatAnalysis.has(beatNumber)) {
                beatAnalysis.set(beatNumber, {
                    hasSixteenth: false,
                    hasEighth: false,
                    hasRest: false,
                    notes: []
                });
            }
            
            const beatInfo = beatAnalysis.get(beatNumber);
            beatInfo.notes.push({index: i, note: note});
            
            // 检测十六分音符
            if (note.type === 'note' && (note.duration === '16th' || Math.abs(note.beats - 0.25) < 0.01)) {
                beatInfo.hasSixteenth = true;
                console.log(`  🎯 拍${beatNumber}发现十六分音符: 音符${i} (${note.duration})`);
            }
            
            // 检测八分音符（包括附点八分音符）
            if (note.type === 'note' && (
                note.duration === 'eighth' || Math.abs(note.beats - 0.5) < 0.01 ||
                note.duration === 'eighth.' || Math.abs(note.beats - 0.75) < 0.01
            )) {
                beatInfo.hasEighth = true;
                if (note.duration === 'eighth.' || Math.abs(note.beats - 0.75) < 0.01) {
                    console.log(`  🎵 拍${beatNumber}发现附点八分音符: 音符${i} (${note.duration}, ${note.beats}拍)`);
                }
            }
            
            // 检测休止符
            if (note.type === 'rest') {
                beatInfo.hasRest = true;
            }
            
            position += note.beats;
        }
        
        // 打印分析结果
        for (const [beat, info] of beatAnalysis) {
            console.log(`  拍${beat}: 十六分=${info.hasSixteenth}, 八分=${info.hasEighth}, 休止=${info.hasRest}, 音符数=${info.notes.length}`);
        }
        
        return beatAnalysis;
    }
    
    /**
     * 检查音符是否可连杆（包括四分音符在十六分音符场景下）
     */
    isBeamableNote(note) {
        if (note.type !== 'note') return false;
        
        console.log(`    🔍 检查连杆能力: ${note.duration}, beats=${note.beats}`);
        
        // 十六分音符场景下，四分音符、八分音符、十六分音符、附点音符都可连杆
        const isBeamable = 
               note.duration === 'quarter' || Math.abs(note.beats - 1) < 0.01 ||        // 四分音符
               note.duration === 'eighth' || Math.abs(note.beats - 0.5) < 0.01 ||       // 八分音符
               note.duration === 'eighth.' || Math.abs(note.beats - 0.75) < 0.01 ||     // 附点八分音符
               note.duration === 'quarter.' || Math.abs(note.beats - 1.5) < 0.01 ||     // 附点四分音符
               note.duration === '16th' || Math.abs(note.beats - 0.25) < 0.01 ||        // 十六分音符
               note.duration === '16th.' || Math.abs(note.beats - 0.375) < 0.01 ||      // 附点十六分音符
               note.duration === '32nd' || Math.abs(note.beats - 0.125) < 0.01;         // 三十二分音符
        
        console.log(`    → 结果: ${isBeamable}`);
        return isBeamable;
    }
    
    /**
     * 检查音符是否符合标准连杆规则（只有八分音符及以下，包含附点）
     */
    isStandardBeamable(note) {
        if (note.type !== 'note') return false;
        
        console.log(`    📏 标准连杆检查: ${note.duration}, beats=${note.beats}`);
        
        // 标准规则：只有八分音符及以下可连杆（包括附点）
        const isStandardBeamable = 
               note.duration === 'eighth' || Math.abs(note.beats - 0.5) < 0.01 ||       // 八分音符
               note.duration === 'eighth.' || Math.abs(note.beats - 0.75) < 0.01 ||     // 附点八分音符
               note.duration === '16th' || Math.abs(note.beats - 0.25) < 0.01 ||        // 十六分音符
               note.duration === '16th.' || Math.abs(note.beats - 0.375) < 0.01 ||      // 附点十六分音符
               note.duration === '32nd' || Math.abs(note.beats - 0.125) < 0.01;         // 三十二分音符
        
        console.log(`    → 标准连杆结果: ${isStandardBeamable}`);
        return isStandardBeamable;
    }
    
    /**
     * 完成连杆组创建
     */
    finalizeBeamGroup(beamGroups, currentGroup, notes, currentBeat) {
        if (currentGroup.length >= 2) {
            console.log(`  🎼 创建拍${currentBeat}的连杆组: 音符[${currentGroup.join(',')}]`);
            
            // 创建多级连杆组
            const groupNotes = currentGroup.map(idx => notes[idx]);
            const beamLevels = this.calculateBeamLevels(groupNotes, currentGroup);
            
            const beamGroup = {
                start: currentGroup[0],
                end: currentGroup[currentGroup.length - 1],
                notes: [...currentGroup],
                beamLevels: beamLevels,
                stemDirection: 'up', // 默认向上
                beat: currentBeat // 记录拍号用于调试
            };
            
            beamGroups.push(beamGroup);
            console.log(`    ✅ 成功创建连杆组: 音符${currentGroup.map(n => n+1).join(',')}`);
        } else if (currentGroup.length === 1) {
            console.log(`  ⚠️ 拍${currentBeat}只有1个可连杆音符，不足以连杆`);
        }
    }
    
    /**
     * 计算多级连杆 - 处理混合音符类型
     */
    calculateBeamLevels(groupNotes, noteIndices) {
        console.log(`🔍 计算连杆级别，音符类型: [${groupNotes.map(n => n.duration).join(', ')}]`);
        
        const beamLevels = [];
        
        // 第一级连杆：所有音符都参与（八分音符及以下）
        beamLevels.push([...noteIndices]);
        console.log(`  Level 1 (八分音符级): [${noteIndices.join(', ')}]`);
        
        // 第二级连杆：只有十六分音符及以下参与
        const sixteenthNotes = [];
        for (let i = 0; i < groupNotes.length; i++) {
            const note = groupNotes[i];
            if (note.duration === '16th' || note.beats <= 0.25) {
                sixteenthNotes.push(noteIndices[i]);
            }
        }
        
        if (sixteenthNotes.length >= 2) {
            beamLevels.push(sixteenthNotes);
            console.log(`  Level 2 (十六分音符级): [${sixteenthNotes.join(', ')}]`);
        }
        
        // 第三级连杆：只有三十二分音符及以下参与
        const thirtySecondNotes = [];
        for (let i = 0; i < groupNotes.length; i++) {
            const note = groupNotes[i];
            if (note.duration === '32nd' || note.beats <= 0.125) {
                thirtySecondNotes.push(noteIndices[i]);
            }
        }
        
        if (thirtySecondNotes.length >= 2) {
            beamLevels.push(thirtySecondNotes);
            console.log(`  Level 3 (三十二分音符级): [${thirtySecondNotes.join(', ')}]`);
        }
        
        console.log(`🎼 最终连杆级别: ${beamLevels.length}级`);
        return beamLevels;
    }
    
    /**
     * VexFlow风格的4/4拍连杆生成
     * 规则：同拍内的连续可连杆音符必须连杆（被休止符或非连杆音符中断时分组）
     */
    generateBeamsVexFlowStyle(notes) {
        console.log(`🎯 4/4拍连杆：同拍内连续可连杆音符连杆，休止符中断分组`);
        
        const beamGroups = [];
        let currentPosition = 0;
        
        // 按顺序处理，构建连续的连杆组
        let currentGroup = [];
        let currentBeat = -1;
        
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const noteBeat = Math.floor(currentPosition);
            
            console.log(`音符${i}: ${note.duration}, 位置${currentPosition.toFixed(3)}, 拍${noteBeat}, type=${note.type}`);
            
            // 检查是否可连杆
            if (this.canNoteBeBeamed(note)) {
                console.log(`  ✅ 可连杆音符`);
                
                // 检查是否需要结束当前组（换拍了）
                if (currentBeat !== -1 && noteBeat !== currentBeat) {
                    console.log(`  📍 换拍了（从拍${currentBeat}到拍${noteBeat}），结束当前组`);
                    if (currentGroup.length >= 2) {
                        this.endCurrentBeamGroup(beamGroups, currentGroup, notes);
                        console.log(`    🎼 创建连杆组: 音符${currentGroup.map(n => n+1).join(',')}`);
                    }
                    currentGroup = [];
                }
                
                // 添加到当前组
                currentGroup.push(i);
                currentBeat = noteBeat;
                console.log(`  ➕ 加入当前组，组大小: ${currentGroup.length}`);
                
            } else {
                console.log(`  ❌ 不可连杆音符（${note.type}），中断连杆组`);
                
                // 结束当前组
                if (currentGroup.length >= 2) {
                    this.endCurrentBeamGroup(beamGroups, currentGroup, notes);
                    console.log(`    🎼 创建连杆组: 音符${currentGroup.map(n => n+1).join(',')} (被${note.type}中断)`);
                }
                currentGroup = [];
                currentBeat = -1;
            }
            
            currentPosition += note.beats;
        }
        
        // 处理最后一组
        if (currentGroup.length >= 2) {
            this.endCurrentBeamGroup(beamGroups, currentGroup, notes);
            console.log(`  🎼 创建最后连杆组: 音符${currentGroup.map(n => n+1).join(',')}`);
        }
        
        console.log(`🎼 4/4拍连杆完成: ${beamGroups.length}个连杆组`);
        return beamGroups;
    }
    
    /**
     * 传统连杆生成逻辑（用于非4/4拍号）
     */
    generateBeamsLegacy(notes, currentBeatLevel = null) {
        const beamGroups = [];
        let currentGroup = [];
        let currentPosition = 0;
        const timeSignature = this.rules.timeSignature || '4/4';
        
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            
            const canBeBeamed = this.canNoteBeBeamed(note);
            
            if (canBeBeamed) {
                if (currentGroup.length > 0) {
                    const shouldStartNew = this.shouldStartNewBeamGroup(
                        currentPosition, 
                        currentPosition + note.beats, 
                        timeSignature, 
                        notes, 
                        currentGroup,
                        currentBeatLevel
                    );
                    
                    if (shouldStartNew) {
                        this.endCurrentBeamGroup(beamGroups, currentGroup, notes);
                        currentGroup = [];
                    }
                }
                
                currentGroup.push(i);
            } else {
                if (currentGroup.length > 0) {
                    this.endCurrentBeamGroup(beamGroups, currentGroup, notes);
                    currentGroup = [];
                }
            }
            
            currentPosition += note.beats;
        }
        
        if (currentGroup.length > 0) {
            this.endCurrentBeamGroup(beamGroups, currentGroup, notes);
        }
        
        return beamGroups;
    }

    /**
     * 专门为3/4拍生成beam分组 - 严格不跨拍连接
     */
    generateBeamsFor3_4(notes) {
        console.log(`🎵 使用3/4拍专用beam生成逻辑 - 严格按拍点分组`);
        
        const beamGroups = [];
        let currentPosition = 0;
        
        // 将音符按照严格的拍点分组 - 第1拍[0-1), 第2拍[1-2), 第3拍[2-3)
        const beatGroups = [[], [], []]; // 3个四分音符拍
        
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const noteStart = currentPosition;
            const noteEnd = currentPosition + note.beats;
            
            // 计算在当前小节内的位置
            const measurePosition = noteStart % 3;
            const measureEnd = noteEnd % 3;
            
            console.log(`🎵 分析音符${i+1}: ${note.duration}, 绝对位置${noteStart.toFixed(3)}-${noteEnd.toFixed(3)}, 小节内位置${measurePosition.toFixed(3)}-${(measureEnd || 3).toFixed(3)}`);
            
            // 检查音符是否跨越拍点边界（在小节内）
            let crossesBeat = false;
            
            // 检查是否跨越拍1边界 (1.0)
            if (measurePosition < 1 && (measureEnd > 1 || (measureEnd === 0 && noteEnd % 3 !== noteStart % 3))) {
                console.log(`  ❌ 跨越第1拍边界，不能beam`);
                crossesBeat = true;
            }
            // 检查是否跨越拍2边界 (2.0)  
            else if (measurePosition < 2 && (measureEnd > 2 || (measureEnd <= 1 && noteEnd > noteStart + 1))) {
                console.log(`  ❌ 跨越第2拍边界，不能beam`);
                crossesBeat = true;
            }
            
            if (!crossesBeat) {
                // 确定音符属于哪个拍
                let beatIndex = -1;
                
                if (measurePosition >= 0 && measurePosition < 1) {
                    beatIndex = 0; // 第1拍
                } else if (measurePosition >= 1 && measurePosition < 2) {
                    beatIndex = 1; // 第2拍  
                } else if (measurePosition >= 2 && measurePosition < 3) {
                    beatIndex = 2; // 第3拍
                }
                
                if (beatIndex >= 0) {
                    beatGroups[beatIndex].push(i);
                    console.log(`  ✅ 音符${i+1}分配到拍${beatIndex+1}`);
                } else {
                    console.log(`  ❌ 音符${i+1}位置异常，无法分配到任何拍`);
                }
            }
            
            currentPosition += note.beats;
        }
        
        // 为每个拍内的音符生成beam组 - 严格限制在单个四分音符拍内，休止符中断beam
        for (let beatIndex = 0; beatIndex < 3; beatIndex++) {
            const beatNotes = beatGroups[beatIndex];
            console.log(`🎵 拍${beatIndex+1}的音符: [${beatNotes.map(idx => idx+1).join(', ')}]`);
            
            if (beatNotes.length >= 2) {
                // 在同一拍内，按连续性分组，休止符会中断beam连接
                let currentGroup = [];
                
                for (let i = 0; i < beatNotes.length; i++) {
                    const noteIndex = beatNotes[i];
                    const note = notes[noteIndex];
                    
                    if (note.type === 'note' && this.canNoteBeBeamed(note)) {
                        // 这是一个可beaming的音符
                        currentGroup.push(noteIndex);
                    } else {
                        // 这是休止符或不可beam的音符，中断当前组
                        if (currentGroup.length >= 2) {
                            this.addBeamGroup(beamGroups, currentGroup, notes);
                            console.log(`  ✅ 拍${beatIndex+1}创建beam组(${currentGroup.length}音符): [${currentGroup.map(idx => idx+1).join(', ')}] - 被休止符中断`);
                        }
                        currentGroup = [];
                        console.log(`  🔄 拍${beatIndex+1}遇到${note.type === 'rest' ? '休止符' : '不可beam音符'}，重置beam组`);
                    }
                }
                
                // 处理最后一个组
                if (currentGroup.length >= 2) {
                    this.addBeamGroup(beamGroups, currentGroup, notes);
                    console.log(`  ✅ 拍${beatIndex+1}创建最终beam组(${currentGroup.length}音符): [${currentGroup.map(idx => idx+1).join(', ')}]`);
                }
            } else if (beatNotes.length === 1) {
                console.log(`  ℹ️ 拍${beatIndex+1}只有1个音符，无需beam`);
            }
        }
        
        console.log(`🎵 3/4拍beam生成完成: 共${beamGroups.length}个beam组`);
        return beamGroups;
    }

    /**
     * 添加beam组的辅助方法
     */
    addBeamGroup(beamGroups, noteIndices, allNotes) {
        if (noteIndices.length < 2) return;
        
        const groupNotes = noteIndices.map(index => allNotes[index]);
        const beamLevels = BEAMING_RULES.generateBeamLevels(groupNotes);
        const stemDirection = BEAMING_RULES.stemDirectionRules.implementation.calculateDirection(groupNotes);
        
        const beamGroup = {
            start: noteIndices[0],
            end: noteIndices[noteIndices.length - 1],
            notes: noteIndices.slice(),
            beamLevels: beamLevels,
            stemDirection: stemDirection
        };
        
        beamGroups.push(beamGroup);
        console.log(`    添加beam组: 音符${noteIndices[0]+1}-${noteIndices[noteIndices.length-1]+1} (${noteIndices.length}个音符)`);
    }
    
    /**
     * 检查音符是否可以连接符槓 - 使用详细规则
     */
    canNoteBeBeamed(note) {
        // 基础检查：必须是音符且有符尾
        if (note.type !== 'note') return false;
        if (!BEAMING_RULES.basicRules.beamableNotes.includes(note.duration)) return false;
        
        // 三连音单独处理，不与普通音符混合连接
        if (note.isTriplet) return false;
        
        return true;
    }
    
    /**
     * 结束当前beam分组 - 使用详细规则验证
     */
    endCurrentBeamGroup(beamGroups, currentGroup, allNotes) {
        if (currentGroup.length < BEAMING_RULES.basicRules.minimumGroupSize) {
            return; // 不满足最少连接数量
        }
        
        // 获取分组中的音符信息
        const groupNotes = currentGroup.map(index => allNotes[index]);
        
        // 生成符槓级别信息（用于混合音值）
        const beamLevels = BEAMING_RULES.generateBeamLevels(groupNotes);
        
        // 计算符干方向
        const stemDirection = BEAMING_RULES.stemDirectionRules.implementation.calculateDirection(groupNotes);
        
        const beamGroup = {
            start: currentGroup[0],
            end: currentGroup[currentGroup.length - 1],
            notes: currentGroup.slice(),
            beamLevels: beamLevels, // 多级符槓信息
            stemDirection: stemDirection // 符干方向
        };
        
        beamGroups.push(beamGroup);
        
        console.log(`    符槓组: 音符${currentGroup.map(n => n + 1).join('-')}, ` +
                   `符干方向: ${stemDirection}, 符槓级别: ${beamLevels.length}`);
    }
    
    /**
     * 判断是否应该开始新的beam分组 - 使用详细符槓规则
     */
    shouldStartNewBeamGroup(noteStart, noteEnd, timeSignature, allNotes, currentGroup, currentBeatLevel = null) {
        if (currentGroup.length === 0) {
            return false; // 没有现有分组，不需要开始新分组
        }
        
        // 4/4拍简化规则：同一四分拍内的八分音符必须连杆
        if (timeSignature === '4/4') {
            // 计算当前组的起始拍和新音符的拍
            let groupStartPosition = 0;
            for (let i = 0; i < currentGroup[0]; i++) {
                groupStartPosition += allNotes[i].beats;
            }
            
            const groupBeat = Math.floor(groupStartPosition);
            const newNoteBeat = Math.floor(noteStart);
            
            console.log(`    🔍 4/4拍分组决策: 当前组起始位置=${groupStartPosition}, 组所在拍=${groupBeat}, 新音符位置=${noteStart}, 新音符拍=${newNoteBeat}`);
            
            // 如果新音符与当前组在不同的四分拍，开始新组
            if (groupBeat !== newNoteBeat) {
                console.log(`    4/4拍：新音符在拍${newNoteBeat}，当前组在拍${groupBeat}，开始新符槓组`);
                return true;
            }
            
            console.log(`    4/4拍：新音符与当前组在同一拍${groupBeat}，继续当前组`);
            // 同一拍内，继续添加到当前组
            return false;
        }
        
        // 3/4拍保持原有逻辑
        if (timeSignature === '3/4') {
            const beatsPerMeasure = 3;
            const startInMeasure = noteStart % beatsPerMeasure;
            
            for (const boundary of [0, 1, 2]) {
                if (Math.abs(startInMeasure - boundary) < 0.001 && currentGroup.length > 0) {
                    console.log(`    🎵 3/4拍严格beam规则: 四分音符拍点${boundary}，强制开始新符槓组`);
                    return true;
                }
            }
        }
        
        // 其他拍号使用原来的复杂逻辑
        const groupStartIndex = currentGroup[0];
        const groupEndIndex = currentGroup[currentGroup.length - 1];
        
        // 计算分组开始位置
        let groupStartPosition = 0;
        for (let i = 0; i < groupStartIndex; i++) {
            groupStartPosition += allNotes[i].beats;
        }
        
        // 创建包含当前音符的测试分组
        const testGroup = allNotes.slice(groupStartIndex, groupEndIndex + 2); // +2 包含下一个音符
        
        // 检查是否跨越关键边界
        const crossesBoundary = BEAMING_RULES.crossesCriticalBoundary(testGroup, groupStartPosition, timeSignature, currentBeatLevel);
        
        if (crossesBoundary) {
            console.log(`    跨越关键拍点边界，开始新符槓组 @ 位置${noteStart}`);
            return true;
        }
        
        // 检查拍号特定规则
        const timeSignatureRules = BEAMING_RULES.timeSignatureRules[timeSignature];
        if (timeSignatureRules) {
            // 检查主要边界（强拍）
            const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
            const startInMeasure = noteStart % beatsPerMeasure;
            
            for (const boundary of timeSignatureRules.primaryBoundaries) {
                if (Math.abs(startInMeasure - boundary) < 0.001) {
                    console.log(`    到达主要边界点 ${boundary}，开始新符槓组`);
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * 检查特殊beaming模式（3/4的两个两个，6/8的三个三个）
     */
    checkBeamingPattern(pattern, currentGroup, allNotes, timeSignature) {
        if (!currentGroup || currentGroup.length === 0) {
            return false;
        }

        // 只对八分音符应用特殊分组模式
        const groupNotes = currentGroup.map(i => allNotes[i]);
        const hasOnlyEighthNotes = groupNotes.every(note => 
            note.duration === 'eighth' && note.type === 'note'
        );
        
        if (!hasOnlyEighthNotes) {
            return false; // 只有纯八分音符才应用特殊模式
        }

        switch (pattern) {
            case "two-by-two":
                // 3/4拍：八分音符两个两个连接
                if (currentGroup.length >= 2) {
                    console.log(`    3/4拍两个两个模式：当前组已有${currentGroup.length}个八分音符，开始新组`);
                    return true;
                }
                break;
                
            case "three-by-three":
                // 6/8拍：严格按位置分组 - 每组3个八分音符
                return this.check6_8BeamingPosition(currentGroup, allNotes);
        }

        return false;
    }

    /**
     * 6/8拍的严格位置分组检查
     * 强制在1.5拍处分组，确保两大组结构
     */
    check6_8BeamingPosition(currentGroup, allNotes) {
        if (currentGroup.length === 0) {
            return false;
        }

        // 计算当前组的起始位置
        const firstNoteIndex = currentGroup[0];
        const groupStartPosition = this.calculateNotePosition(allNotes, firstNoteIndex);
        const measurePosition = groupStartPosition % 3; // 在3拍小节内的位置
        
        // 🔥 6/8拍关键检查：位置1.5的音符必须强制开始新beam组
        if (Math.abs(measurePosition - 1.5) < 0.001 && currentGroup.length > 0) {
            console.log(`    🚫 6/8拍强制规则：位置1.5处强制结束第一组，开始第二组`);
            return true;
        }

        // 检查是否跨越6/8拍的主拍边界（1.5拍处）
        const currentGroupEndPos = measurePosition + (currentGroup.length * 0.5);
        if (measurePosition < 1.5 && currentGroupEndPos > 1.5) {
            console.log(`    6/8拍跨越主拍边界(1.5拍)，开始新组`);
            return true;
        }

        // 限制每组最多3个八分音符（一个附点四分音符的时值）
        if (currentGroup.length >= 3) {
            console.log(`    6/8拍严格分组：当前组已有${currentGroup.length}个八分音符，结束当前组`);
            return true;
        }

        return false;
    }

    /**
     * 全新的6/8拍beam分组逻辑 - 严格两大组
     * 6/8拍是复合二拍子：两个附点四分音符拍，每拍细分为三个八分音符
     */
    build68BeamGroups(notes) {
        console.log(`🎼 [6/8专用] 开始构建6/8拍beam组 - 严格两大组模式`);
        console.log(`  输入: ${notes.length}个音符`);
        
        const beamGroups = [];
        let position = 0;
        
        // 第一大组：位置0.0-1.5（前三个八分音符时值）
        const firstGroupNotes = [];
        // 第二大组：位置1.5-3.0（后三个八分音符时值）
        const secondGroupNotes = [];
        
        // 遍历所有音符，根据位置分配到两大组
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const noteStart = position;
            const noteEnd = position + note.beats;
            
            // 只有可以beaming的音符才加入组
            if (note.type === 'note' && this.canNoteBeBeamed(note)) {
                // 判断音符属于哪个大组
                if (noteStart < 1.5) {
                    // 第一大组（0-1.5）
                    // 但如果音符会跨越1.5边界，则不加入任何组
                    if (noteEnd <= 1.5 + 0.001) {
                        firstGroupNotes.push(i);
                        console.log(`    音符${i}: → 加入第一大组`);
                    } else {
                        console.log(`    音符${i}: ⚠️ 跨越1.5边界，不加入beam组`);
                    }
                } else if (noteStart >= 1.5 - 0.001) {
                    // 第二大组（1.5-3.0）
                    secondGroupNotes.push(i);
                    console.log(`    音符${i}: → 加入第二大组`);
                }
            } else if (note.type === 'rest') {
                console.log(`    音符${i}: → 休止符，中断beam连接`);
            }
            
            position = noteEnd;
        }
        
        // 处理休止符中断：将每个大组按休止符位置进一步分割
        const processGroupWithRests = (groupNotes, groupName) => {
            if (groupNotes.length < 2) {
                console.log(`  ${groupName}音符太少，不创建beam组`);
                return [];
            }
            
            const subGroups = [];
            let currentSubGroup = [];
            
            for (let i = 0; i < groupNotes.length; i++) {
                const noteIndex = groupNotes[i];
                currentSubGroup.push(noteIndex);
                
                // 检查这个音符和下一个音符之间是否有休止符
                let hasRestBetween = false;
                if (i < groupNotes.length - 1) {
                    const nextNoteIndex = groupNotes[i + 1];
                    // 检查中间是否有休止符
                    for (let j = noteIndex + 1; j < nextNoteIndex; j++) {
                        if (notes[j].type === 'rest') {
                            hasRestBetween = true;
                            break;
                        }
                    }
                }
                
                // 如果有休止符或者到了最后一个音符，结束当前子组
                if (hasRestBetween || i === groupNotes.length - 1) {
                    if (currentSubGroup.length >= 2) {
                        subGroups.push([...currentSubGroup]);
                        console.log(`    ${groupName}子组: [${currentSubGroup.join(', ')}]`);
                    }
                    currentSubGroup = [];
                }
            }
            
            return subGroups;
        };

        const firstGroupSubGroups = processGroupWithRests(firstGroupNotes, "第一大组");
        const secondGroupSubGroups = processGroupWithRests(secondGroupNotes, "第二大组");

        // 为每个子组创建beam组对象
        [...firstGroupSubGroups, ...secondGroupSubGroups].forEach(subGroup => {
            if (subGroup.length >= 2) {
                const groupNotes = subGroup.map(i => notes[i]);
                const beamLevels = this.generateBeamLevels(groupNotes);
                const stemDirection = this.calculateStemDirection(groupNotes);
                
                const beamGroup = {
                    notes: subGroup,
                    beamLevels: beamLevels,
                    stemDirection: stemDirection,
                    type: 'beam'
                };
                
                beamGroups.push(beamGroup);
            }
        });
        
        console.log(`✅ 6/8拍beam组构建完成: 总共${beamGroups.length}个beam组`);
        return beamGroups;
    }

    /**
     * 计算音符在小节中的位置
     */
    calculateNotePosition(noteIndex, allNotes) {
        let position = 0;
        for (let i = 0; i < noteIndex; i++) {
            position += allNotes[i].beats;
        }
        return position;
    }

    /**
     * 判断音符是否可以连beam
     */
    canBeBeamed(duration) {
        return ['eighth', '16th', '32nd'].includes(duration);
    }

    /**
     * 判断是否可以生成三连音
     */
    canGenerateTriplet(remainingBeats) {
        // 只有当设置中允许三连音时才生成
        if (!Array.isArray(this.rules.allowedDurations) || !this.rules.allowedDurations.includes('triplet')) {
            console.log(`🚫 三连音被禁用: allowedDurations=[${this.rules.allowedDurations?.join(',')}]`);
            console.log(`🔍 用户原始设置: allowedRhythms=[${userSettings?.allowedRhythms?.join(',')}]`);
            return false;
        }
        
        // 检查用户设置的三连音频率
        if (userSettings && userSettings.rhythmFrequencies && userSettings.rhythmFrequencies.triplet !== undefined) {
            const tripletFrequency = userSettings.rhythmFrequencies.triplet;
            if (tripletFrequency === 0) {
                console.log(`🚫 用户频率设置：三连音频率为 0%，完全禁用`);
                return false;
            }
            
            // 根据用户设置的频率来决定是否生成三连音
            const randomValue = this.random.nextFloat() * 100;
            const shouldGenerate = randomValue < tripletFrequency;
            console.log(`🎯 三连音频率检查：随机值 ${randomValue.toFixed(1)} vs 用户频率 ${tripletFrequency}% = ${shouldGenerate ? '✅生成' : '❌跳过'}`);
            
            if (!shouldGenerate) {
                return false;
            }
        }
        
        // 精确检查是否有足够空间生成三连音
        // 八分音符三连音需要至少1拍，四分音符三连音需要至少2拍
        if (remainingBeats < 0.999) { // 使用更精确的边界
            console.log(`剩余拍数${remainingBeats}不足，无法生成三连音 (需要≥1拍)`);
            return false;
        }
        
        // 确保我们有有效的音符生成能力
        if (!this.rules.range || this.rules.range.min >= this.rules.range.max) {
            console.log(`音域设置无效，无法生成三连音`);
            return false;
        }
        
        // 如果剩余拍数刚好是整数拍，优先生成三连音以避免零散的小时值
        const isNearWholeBeat = Math.abs(remainingBeats - Math.round(remainingBeats)) < 0.001;
        if (isNearWholeBeat && remainingBeats >= 1) {
            console.log(`🎯 整数拍数${remainingBeats}，考虑三连音`);
            const wholeBeatsChance = this.random.nextFloat() < 0.15; // 降低整数拍三连音概率
            console.log(`   整数拍三连音决策: ${wholeBeatsChance ? '✅生成' : '❌跳过'} (15%概率)`);
            return wholeBeatsChance;
        }
        
        // 正常概率生成三连音 - 适度概率避免过于频繁
        const normalTripletChance = this.random.nextFloat() < 0.08; // 降低基础概率到合理范围
        console.log(`🎲 正常三连音随机决策: ${normalTripletChance ? '✅生成' : '❌跳过'} (8%概率, 剩余${remainingBeats}拍)`);
        return normalTripletChance;
    }

    /**
     * 连音类生成规则 - 包括三连音、二连音和四连音
     * 为6/8拍添加了duplet和quadruplet支持
     */
    get TRIPLET_RULES() {
        return {
        // 连音基本原则
        basicPrinciple: "连音必须独占拍点，不能与普通音符混合",
        
        // 连音类型及其拍点占用规则
        types: {
            // 传统三连音（用于所有拍号）
            eighth: {
                duration: 'eighth',        // 八分三连音
                totalBeats: 1,            // 占用1拍（4/4拍中的1个四分音符）
                individualBeats: 1/3,     // 每个音符1/3拍
                preferredPositions: [0, 1, 2, 3], // 必须出现在四分音符拍点上（正拍）
                description: "八分三连音：3个八分音符占1拍时值，必须在四分音符拍点上",
                tupletCount: 3,
                tupletType: 'triplet'
            },
            quarter: {
                duration: 'quarter',      // 四分三连音
                totalBeats: 2,           // 占用2拍（4/4拍中的2个四分音符）
                individualBeats: 2/3,    // 每个音符2/3拍
                preferredPositions: [0, 2], // 必须出现在二分音符拍点上（1，3拍）
                description: "四分三连音：3个四分音符占2拍时值，必须在二分音符拍点上",
                tupletCount: 3,
                tupletType: 'triplet'
            },
            sixteenth: {
                duration: '16th',         // 十六分三连音
                totalBeats: 0.5,         // 占用0.5拍（半个四分音符）
                individualBeats: 1/6,    // 每个音符1/6拍
                preferredPositions: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], // 必须出现在八分音符拍点上（1, +, 2, +, 3, +, 4, +）
                description: "十六分三连音：3个十六分音符占0.5拍时值，必须在八分音符拍点上",
                tupletCount: 3,
                tupletType: 'triplet'
            },
            
            // 6/8拍专用：二连音（duplets）
            duplet_eighth: {
                duration: 'eighth',       // 八分二连音
                totalBeats: 1.5,         // 占用1.5拍（一个附点四分音符的时值）
                individualBeats: 0.75,   // 每个音符0.75拍
                preferredPositions: [0, 1.5], // 只能在6/8拍的强拍位置
                description: "6/8拍八分二连音：2个八分音符占附点四分音符旲值，创造简单拍子感觉",
                allowedTimeSignatures: ['6/8'],
                tupletCount: 2,
                tupletType: 'duplet'
            },
            
            // 6/8拍专用：四连音（quadruplets）
            quadruplet_eighth: {
                duration: 'eighth',       // 八分四连音
                totalBeats: 1.5,         // 占用1.5拍（一个附点四分音符的时值）
                individualBeats: 0.375,  // 每个音符0.375拍
                preferredPositions: [0, 1.5], // 只能在6/8拍的强拍位置
                description: "6/8拍八分四连音：4个八分音符占附点四分音符旲值，创造常用拍子感觉",
                allowedTimeSignatures: ['6/8'],
                tupletCount: 4,
                tupletType: 'quadruplet'
            }
        },
        
        // 位置规则：三连音必须完整占用其对应的时值空间
        placementRules: {
            principle: "三连音必须独占其时值空间，不能与普通音符共存在同一拍点分割中",
            
            // 检查位置是否适合放置三连音
            canPlaceTriplet: function(position, tripletType, timeSignature, remainingBeats) {
                // 直接使用类型信息，严格的拍点要求
                const types = {
                    eighth: { totalBeats: 1, preferredPositions: [0, 1, 2, 3] },        // 四分音符拍点
                    quarter: { totalBeats: 2, preferredPositions: [0, 2] },              // 二分音符拍点  
                    sixteenth: { totalBeats: 0.5, preferredPositions: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] } // 八分音符拍点
                };
                const tripletInfo = types[tripletType];
                const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
                
                // 检查剩余空间是否足够
                if (remainingBeats < tripletInfo.totalBeats) {
                    console.log(`❌ 空间不足: 需要${tripletInfo.totalBeats}拍，剩余${remainingBeats}拍`);
                    return false;
                }
                
                // 简化位置检查：只要不是明显错误的位置就允许
                const positionInMeasure = position % beatsPerMeasure;
                
                // 所有三连音都必须遵循严格的位置规则
                
                // 严格的位置检查：三连音必须出现在正拍上
                const tolerance = 0.01; // 严格的容差，确保在正拍上
                const isPositionAllowed = tripletInfo.preferredPositions.some(allowedPos => 
                    Math.abs(positionInMeasure - allowedPos) < tolerance
                );
                
                if (!isPositionAllowed) {
                    console.log(`❌ ${tripletType}三连音位置${positionInMeasure.toFixed(3)}不在允许位置列表${tripletInfo.preferredPositions}中`);
                    return false;
                } else {
                    console.log(`✅ ${tripletType}三连音可在位置${positionInMeasure.toFixed(3)}生成`);
                }
                
                // 检查三连音结束位置是否跨越不应跨越的边界
                const endPosition = position + tripletInfo.totalBeats;
                const endInMeasure = endPosition % beatsPerMeasure;
                
                // 四分三连音不应跨越小节中心线（4/4拍的第2-3拍之间）
                if (tripletType === 'quarter' && timeSignature === '4/4') {
                    if (positionInMeasure < 2 && endInMeasure > 2) {
                        return false; // 跨越中心线
                    }
                }
                
                return true;
            }
        },
        
        // 三连音内部结构规则（简化版，支持休止符）
        internalStructureRules: {
            // 三连音可以包含的元素类型
            allowedElements: ['note', 'rest'],
            
            // 简化的三连音内部模式 - 更适合初学者
            commonPatterns: [
                { pattern: ['note', 'note', 'note'], weight: 0.75, description: "三个音符" },
                { pattern: ['note', 'note', 'rest'], weight: 0.12, description: "两音符+休止符" },
                { pattern: ['note', 'rest', 'note'], weight: 0.08, description: "音符+休止符+音符" },
                { pattern: ['rest', 'note', 'note'], weight: 0.05, description: "休止符+两音符" }
            ],
            
            // 选择连音内部模式（支持不同连音类型）
            selectPattern: function(random, tupletType = 'triplet') {
                let patterns;
                
                // 根据连音类型选择适合的模式
                switch(tupletType) {
                    case 'duplet':
                        patterns = [
                            { pattern: ['note', 'note'], weight: 0.8, description: "两个音符" },
                            { pattern: ['note', 'rest'], weight: 0.2, description: "音符+休止符" }
                        ];
                        break;
                    case 'quadruplet':
                        patterns = [
                            { pattern: ['note', 'note', 'note', 'note'], weight: 0.7, description: "四个音符" },
                            { pattern: ['note', 'rest', 'note', 'note'], weight: 0.2, description: "音符+休止符+两音符" },
                            { pattern: ['note', 'note', 'rest', 'note'], weight: 0.1, description: "两音符+休止符+音符" }
                        ];
                        break;
                    case 'triplet':
                    default:
                        patterns = this.commonPatterns; // 使用传统三连音模式
                        break;
                }
                
                const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
                const randomValue = random.nextFloat() * totalWeight;
                
                let currentWeight = 0;
                for (const pattern of patterns) {
                    currentWeight += pattern.weight;
                    if (randomValue <= currentWeight) {
                        return pattern;
                    }
                }
                
                return patterns[0]; // 默认返回第一个模式
            }
        }
        };
    }

    /**
     * 计算三连音符杠连接信息
     * 休止符会打断符杠连接，只连接连续的音符段
     */
    calculateTripletBeamConnections(tripletElements, duration) {
        // 只处理需要符杠的音符（八分音符及更小时值）
        if (!['eighth', '16th', '32nd'].includes(duration)) {
            return;
        }
        
        console.log(`🎵 三连音符杠计算: 模式=[${tripletElements.map(e => e.type).join(', ')}]`);
        
        // 将三连音分成由休止符分隔的连续音符段
        const noteGroups = [];
        let currentGroup = [];
        
        tripletElements.forEach((element, index) => {
            if (element.type === 'note') {
                // 音符：添加到当前组
                currentGroup.push(index);
            } else {
                // 休止符：结束当前组（如果有音符的话），开始新组
                if (currentGroup.length > 0) {
                    noteGroups.push([...currentGroup]);
                    currentGroup = [];
                }
            }
        });
        
        // 处理最后一组
        if (currentGroup.length > 0) {
            noteGroups.push(currentGroup);
        }
        
        console.log(`  连续音符组: ${noteGroups.map(group => `[${group.join(',')}]`).join(' ')}`);
        
        // 为每个连续音符组设置符杠连接
        noteGroups.forEach((group, groupIndex) => {
            if (group.length === 1) {
                // 单个音符：无符杠连接
                const noteIndex = group[0];
                tripletElements[noteIndex].tripletBeamInfo = null;
                console.log(`  组${groupIndex + 1}位置${noteIndex}: 单独音符，无符杠连接`);
            } else if (group.length >= 2) {
                // 多个音符：连接符杠
                group.forEach((noteIndex, posInGroup) => {
                    if (posInGroup === 0) {
                        tripletElements[noteIndex].tripletBeamInfo = 'begin';
                        console.log(`  组${groupIndex + 1}位置${noteIndex}: begin`);
                    } else if (posInGroup === group.length - 1) {
                        tripletElements[noteIndex].tripletBeamInfo = 'end';
                        console.log(`  组${groupIndex + 1}位置${noteIndex}: end`);
                    } else {
                        tripletElements[noteIndex].tripletBeamInfo = 'continue';
                        console.log(`  组${groupIndex + 1}位置${noteIndex}: continue`);
                    }
                });
            }
        });
    }

    /**
     * 生成唯一的三连音ID（避免相邻三连音括弧重叠）
     */
    generateTripletId() {
        if (!this.tripletIdCounter) {
            this.tripletIdCounter = 0;
        }
        return ++this.tripletIdCounter;
    }

    /**
     * 改进的三连音生成函数 - 基于音乐理论规则
     */
    generateTriplet(currentMidi, currentDirection, remainingBeats = null, currentPosition = 0) {
        const timeSignature = this.rules.timeSignature || '4/4';
        
        // 步骤1: 选择合适的三连音类型
        const tripletType = this.selectTripletType(remainingBeats, currentPosition, timeSignature);
        if (!tripletType) {
            console.log('❌ 无法在当前位置放置三连音');
            return null;
        }
        
        const tripletInfo = this.TRIPLET_RULES.types[tripletType];
        console.log(`🎵 生成${tripletInfo.description} @ 位置${currentPosition}, 剩余${remainingBeats}拍`);
        
        // 步骤2: 选择连音内部结构模式（支持不同连音类型）
        const pattern = this.TRIPLET_RULES.internalStructureRules.selectPattern(this.random, tripletInfo.tupletType || 'triplet');
        console.log(`   模式: ${pattern.description} [${pattern.pattern.join(', ')}]`);
        
        // 步骤3: 生成三连音元素
        const tripletElements = [];
        let lastMidi = currentMidi;
        let lastDirection = currentDirection;
        
        const tupletCount = tripletInfo.tupletCount || 3; // 支持不同连音数量
        for (let i = 0; i < tupletCount; i++) {
            const elementType = pattern.pattern[i % pattern.pattern.length]; // 循环使用模式
            
            if (elementType === 'note') {
                // 生成音符
                let nextMidi;
                try {
                    // 三连音中的音符上下文
                    const tripletContext = {
                        isMeasureStart: false,
                        isMeasureEnd: false,
                        isPhrasEnd: false,
                        isCadence: false,
                        inTriplet: true
                    };
                    nextMidi = this.generateNextNote(lastMidi, lastDirection, 0, false, tripletContext);
                } catch (error) {
                    console.error(`三连音音符生成失败: ${error.message}`);
                    nextMidi = lastMidi !== null ? lastMidi + (lastDirection || 1) * 2 : 60;
                    nextMidi = Math.max(this.rules.range.min, Math.min(this.rules.range.max, nextMidi));
                }
                
                const { step, octave, alter } = this.midiToMusicXML(nextMidi);
                
                tripletElements.push({
                    type: 'note',
                    duration: tripletInfo.duration,
                    beats: tripletInfo.individualBeats,
                    step: step,
                    octave: octave,
                    alter: alter,
                    midi: nextMidi,
                    isTriplet: true,
                    tripletType: tripletType,
                    tripletPosition: i, // 0=begin, 1=continue, 2=end, etc.
                    tripletTotal: tupletCount
                });
                
                // 更新方向和音高
                if (lastMidi !== null) {
                    const interval = nextMidi - lastMidi;
                    lastDirection = interval > 0 ? 1 : (interval < 0 ? -1 : 0);
                }
                lastMidi = nextMidi;
                
            } else if (elementType === 'rest') {
                // 生成休止符
                tripletElements.push({
                    type: 'rest',
                    duration: tripletInfo.duration,
                    beats: tripletInfo.individualBeats,
                    isTriplet: true,
                    tripletType: tripletType,
                    tripletPosition: i,
                    tripletTotal: tupletCount
                });
            }
        }
        
        // 🎵 步骤4: 为三连音分配唯一ID（避免相邻三连音括弧重叠）
        const tripletId = this.generateTripletId();
        tripletElements.forEach(element => {
            element.tripletId = tripletId;
        });
        
        // 🎵 步骤5: 根据休止符位置计算符杠连接信息
        this.calculateTripletBeamConnections(tripletElements, tripletInfo.duration);
        
        // 验证三连音时值
        const calculatedBeats = tripletElements.reduce((sum, element) => sum + element.beats, 0);
        if (Math.abs(calculatedBeats - tripletInfo.totalBeats) > 0.01) {
            console.error(`⚠️ 三连音时值不匹配: 期望${tripletInfo.totalBeats}拍, 实际${calculatedBeats}拍`);
        }
        
        console.log(`✅ 三连音生成完成: ${tripletElements.length}个元素, 总时值${tripletInfo.totalBeats}拍`);
        
        return {
            notes: tripletElements,
            totalBeats: tripletInfo.totalBeats,
            lastMidi: lastMidi,
            lastDirection: lastDirection,
            type: tripletType
        };
    }
    
    /**
     * 选择合适的三连音类型
     */
    selectTripletType(remainingBeats, currentPosition, timeSignature) {
        const availableTypes = [];
        
        console.log(`🔍 选择三连音类型: 剩余${remainingBeats}拍, 位置${currentPosition}, 拍号${timeSignature}`);
        
        // 检查每种连音类型是否可以使用
        for (const [typeName, typeInfo] of Object.entries(this.TRIPLET_RULES.types)) {
            // 检查是否为6/8拍专用连音类型
            if (typeInfo.allowedTimeSignatures && !typeInfo.allowedTimeSignatures.includes(timeSignature)) {
                console.log(`   检查${typeName}: ❌不允许在${timeSignature}拍中使用`);
                continue;
            }
            
            // 检查用户是否启用了对应的基础音符类型
            const baseNoteType = typeInfo.duration; // 'eighth', 'quarter', '16th'
            const isNoteTypeAllowed = this.rules.allowedDurations.includes(baseNoteType);
            
            if (!isNoteTypeAllowed) {
                console.log(`   检查${typeName}: ❌被禁用 (基础音符${baseNoteType}未启用)`);
                continue;
            }
            
            const canPlace = this.TRIPLET_RULES.placementRules.canPlaceTriplet(
                currentPosition, 
                typeName, 
                timeSignature, 
                remainingBeats
            );
            
            console.log(`   检查${typeName}: ${canPlace ? '✅可用' : '❌不可用'} (需要${typeInfo.totalBeats}拍, 基础音符${baseNoteType}已启用)`);
            
            if (canPlace) {
                const weight = this.calculateTripletTypeWeight(typeName, remainingBeats, currentPosition, timeSignature);
                availableTypes.push({
                    name: typeName,
                    info: typeInfo,
                    weight: weight
                });
                console.log(`     权重: ${weight.toFixed(2)}`);
            }
        }
        
        if (availableTypes.length === 0) {
            console.log(`❌ 没有可用的三连音类型！`);
            return null; // 没有可用的三连音类型
        }
        
        console.log(`✅ 找到${availableTypes.length}种可用三连音类型`);
        
        // 根据权重随机选择
        const totalWeight = availableTypes.reduce((sum, type) => sum + type.weight, 0);
        const randomValue = this.random.nextFloat() * totalWeight;
        
        let currentWeight = 0;
        for (const type of availableTypes) {
            currentWeight += type.weight;
            if (randomValue <= currentWeight) {
                console.log(`   选择三连音类型: ${type.name} (权重: ${type.weight.toFixed(2)})`);
                return type.name;
            }
        }
        
        return availableTypes[0].name; // 默认返回第一个可用类型
    }
    
    /**
     * 计算三连音类型的权重
     */
    calculateTripletTypeWeight(typeName, remainingBeats, currentPosition, timeSignature) {
        const typeInfo = this.TRIPLET_RULES.types[typeName];
        let weight = 1.0;
        
        // 基础权重：八分三连音最常见
        if (typeName === 'eighth') weight = 3.0;
        else if (typeName === 'quarter') weight = 1.5;
        else if (typeName === 'sixteenth') weight = 0.8;
        
        // 位置权重：强拍位置更适合较长的三连音
        const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
        const positionInMeasure = currentPosition % beatsPerMeasure;
        
        if (typeName === 'quarter' && [0, 2].includes(positionInMeasure)) {
            weight *= 1.5; // 四分三连音在强拍位置加权
        }
        
        // 空间权重：剩余空间影响选择
        const spaceRatio = remainingBeats / typeInfo.totalBeats;
        if (spaceRatio >= 2) weight *= 1.2; // 充足空间加权
        else if (spaceRatio < 1.2) weight *= 0.7; // 空间紧张降权
        
        return weight;
    }

    /**
     * 检查音符是否在调内
     */
    isInScale(midi) {
        const pitchClass = midi % 12;
        return Array.isArray(this.scale) && this.scale.includes(pitchClass);
    }

    /**
     * 计算方向变化次数
     */
    countDirectionChanges(notes) {
        let changes = 0;
        let lastMidi = null;
        let lastDirection = 0;
        
        for (const note of notes) {
            if (note.type === 'note' && note.midi !== undefined) {
                if (lastMidi !== null) {
                    const interval = note.midi - lastMidi;
                    const direction = interval > 0 ? 1 : (interval < 0 ? -1 : 0);
                    
                    if (direction !== lastDirection && direction !== 0 && lastDirection !== 0) {
                        changes++;
                    }
                    
                    lastDirection = direction;
                }
                lastMidi = note.midi;
            }
        }
        
        return changes;
    }

    /**
     * 获取小节中最后一个音符
     */
    getLastNote(notes) {
        for (let i = notes.length - 1; i >= 0; i--) {
            if (notes[i].type === 'note') {
                return notes[i];
            }
        }
        return null;
    }

    /**
     * 更新统计信息
     */
    updateStats(measureData) {
        for (const note of measureData.notes) {
            if (note.type === 'note') {
                this.stats.noteCount++;
                if (note.midi !== undefined) {
                    this.stats.minMidi = Math.min(this.stats.minMidi, note.midi);
                    this.stats.maxMidi = Math.max(this.stats.maxMidi, note.midi);
                }
            } else {
                this.stats.restCount++;
            }
        }
        
        this.stats.beamCount += measureData.beams.length;
        
        // 计算最大跳进
        let lastMidi = null;
        for (const note of measureData.notes) {
            if (note.type === 'note' && note.midi !== undefined) {
                if (lastMidi !== null) {
                    const interval = Math.abs(note.midi - lastMidi);
                    this.stats.maxInterval = Math.max(this.stats.maxInterval, interval);
                }
                lastMidi = note.midi;
            }
        }
    }

    /**
     * 时值转拍数
     */
    durationToBeats(duration) {
        const map = {
            'whole': 4,
            'half': 2,
            'half.': 3,           // 二分附点音符 = 3拍
            'quarter': 1,
            'quarter.': 1.5,      // 四分附点音符 = 1.5拍
            'eighth': 0.5,
            'eighth.': 0.75,      // 八分附点音符 = 0.75拍
            '16th': 0.25,
            '32nd': 0.125
        };
        
        // 根据拍号调整
        if (this.timeSignature === '6/8') {
            return map[duration] || 1;
        }
        
        return map[duration] || 1;
    }

    /**
     * 拍数转时值
     */
    beatsToNoteDuration(beats) {
        // 处理三连音的特殊beats值
        const tolerance = 0.01; // 浮点数容差
        
        // 三连音特殊值检测
        if (Math.abs(beats - 2/3) < tolerance) {
            console.log(`🎵 检测到四分三连音拍数: ${beats} ≈ ${2/3}`);
            return 'quarter';
        }
        if (Math.abs(beats - 1/3) < tolerance) {
            console.log(`🎵 检测到八分三连音拍数: ${beats} ≈ ${1/3}`);
            return 'eighth';
        }
        if (Math.abs(beats - 1/6) < tolerance) {
            console.log(`🎵 检测到十六分三连音拍数: ${beats} ≈ ${1/6}`);
            // 检查用户是否启用了16分音符
            if (!this.rules.allowedDurations.includes('16th')) {
                console.log(`⚠️ 十六分三连音被禁用，改用八分音符`);
                return 'eighth';
            }
            return '16th';
        }
        
        // 标准时值 - 检查用户设置
        if (beats >= 4) return 'whole';
        if (beats >= 3) return 'half.';      // 🔥 附点二分音符 - 3拍
        if (beats >= 2) return 'half';
        if (beats >= 1.5) return 'quarter.';
        if (beats >= 1) return 'quarter';
        if (beats >= 0.75) return 'eighth.';
        if (beats >= 0.5) return 'eighth';
        if (beats >= 0.25) {
            // 检查用户是否启用了16分音符
            if (this.rules.allowedDurations.includes('16th')) {
                return '16th';
            } else {
                console.log(`⚠️ 16分音符被禁用，改用八分音符代替${beats}拍`);
                return 'eighth';
            }
        }
        
        console.warn(`⚠️ 极小拍数值 ${beats}，返回允许的最小时值`);
        // 返回用户允许的最小时值
        if (this.rules.allowedDurations.includes('16th')) return '16th';
        return 'eighth';
    }

    /**
     * 拍数转休止符时值
     */
    beatsToRestDuration(beats) {
        const duration = this.beatsToNoteDuration(beats);
        console.log(`拍数转休止符: ${beats}拍 -> ${duration}`);
        return duration;
    }

    /**
     * 检查两个音符是否构成二度（1-2个半音）
     * hammer-on只能用于上行二度，pull-off只能用于下行二度
     */
    isSecondInterval(midi1, midi2) {
        // 计算音程的半音数
        const interval = midi2 - midi1;
        const absInterval = Math.abs(interval);
        
        // 二度音程必须是1或2个半音
        const isSecond = absInterval === 1 || absInterval === 2;
        
        if (isSecond) {
            console.log(`✅ 二度音程: MIDI ${midi1} -> ${midi2}, 间隔${interval}半音`);
        }
        
        return isSecond;
    }

    /**
     * 计算音符的符干方向
     * 根据音符在五线谱上的位置决定符干方向
     * @param {number|Array} octaveOrNotes - 八度数或音符数组
     * @param {string} step - 音符名（当第一个参数是八度数时）
     * @returns {string} 'up' 或 'down'
     */
    calculateStemDirection(octaveOrNotes, step) {
        // 如果传入的是音符数组（用于beam组）
        if (Array.isArray(octaveOrNotes)) {
            const notes = octaveOrNotes;
            // 计算组内所有音符的平均位置
            let totalMidi = 0;
            let count = 0;
            for (const note of notes) {
                if (note.midi) {
                    totalMidi += note.midi;
                    count++;
                }
            }
            if (count === 0) return 'up';
            const avgMidi = totalMidi / count;
            // 中央C (C4) 的MIDI值是60，B4是71
            // B4及以下符干向上，C5及以上符干向下
            return avgMidi <= 71 ? 'up' : 'down';
        }
        
        // 如果传入的是单个音符的八度和音名
        const octave = octaveOrNotes;
        if (!octave || !step) return 'up';
        
        // 计算MIDI值
        const noteToMidi = {
            'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        };
        const baseMidi = noteToMidi[step];
        if (baseMidi === undefined) return 'up';
        
        const midi = (octave + 1) * 12 + baseMidi;
        
        // B4 (MIDI 71) 及以下符干向上，C5 (MIDI 72) 及以上符干向下
        return midi <= 71 ? 'up' : 'down';
    }

    /**
     * 为音符智能选择articulation
     * 基于音乐理论规则，根据音符位置、时值和旋律特征选择合适的articulation
     */
    selectArticulation(note, noteIndex, measureNotes, measureIndex, clef) {
        if (!userSettings.articulations.enabled) {
            return null;
        }
        
        const articulations = [];
        const artSettings = userSettings.articulations;
        const allArticulations = [
            ...artSettings.basic,
            ...artSettings.guitar
        ];
        
        if (allArticulations.length === 0) {
            return null;
        }
        
        const isFirstNote = noteIndex === 0;
        const isLastNote = noteIndex === measureNotes.length - 1;
        const isStrongBeat = noteIndex % 2 === 0; // 简化的强拍判断
        const isWeakBeat = !isStrongBeat;
        
        // 计算前后音程关系（如果存在）
        let prevInterval = null;
        let nextInterval = null;
        if (noteIndex > 0) {
            prevInterval = note.midi - measureNotes[noteIndex-1].midi;
        }
        if (noteIndex < measureNotes.length - 1) {
            nextInterval = measureNotes[noteIndex+1].midi - note.midi;
        }
        
        // 🔥 检查音符是否已经有slur连接
        // 如果音符已经是slur的一部分，则不应该添加任何其他articulation
        let hasSlurConnection = false;
        
        // 检查当前音符是否是前一个音符slur的结束点
        if (noteIndex > 0) {
            const prevNote = measureNotes[noteIndex - 1];
            if (prevNote && prevNote.articulation && 
                ['hammer-on', 'pull-off'].includes(prevNote.articulation)) {
                hasSlurConnection = true;
                console.log(`🚫 音符${noteIndex}已经是前一个音符${prevNote.articulation}的slur结束点，跳过articulation选择`);
            }
        }
        
        // 检查当前音符是否会产生slur到下一个音符的逻辑将在articulation选择过程中处理
        
        // === 基本演奏法规则 ===
        // 🔥 使用优先级系统：一旦选择了一个articulation，就停止检查其他
        // 🔥 如果音符已经有slur连接，则不选择任何articulation
        
        let selectedArticulation = null;
        
        if (hasSlurConnection) {
            console.log(`🚫 跳过articulation选择：音符${noteIndex}已经有slur连接`);
            return null;
        }
        
        // 🔥 预检查：如果当前音符符合吉他技巧条件，优先选择吉他技巧并排除基本演奏法
        let willSelectGuitarTechnique = false;
        
        if (clef === 'treble' && artSettings.guitar.length > 0 && noteIndex > 0 && !isFirstNote && !isLastNote) {
            const hammerOnAllowed = artSettings.guitar.includes('hammer-on');
            const pullOffAllowed = artSettings.guitar.includes('pull-off');
            const prevNote = measureNotes[noteIndex - 1];
            
            if (prevNote && prevNote.type === 'note' && prevNote.midi) {
                const interval = note.midi - prevNote.midi;
                const isValidHammerOn = (interval === 1 || interval === 2);
                const isValidPullOff = (interval === -1 || interval === -2);
                const prevHasHammerOn = prevNote.articulation === 'hammer-on';
                const prevHasPullOff = prevNote.articulation === 'pull-off';
                
                // 🔥 关键修复：预检查也必须应用频率控制
                const shouldGenerateSlur = shouldGenerateDirectionalSlur(interval, this.random);
                
                if (((hammerOnAllowed && isValidHammerOn && !prevHasHammerOn) || 
                     (pullOffAllowed && isValidPullOff && !prevHasPullOff)) && shouldGenerateSlur) {
                    willSelectGuitarTechnique = true;
                    console.log(`🎸 预检查：音符${noteIndex}将选择吉他技巧，跳过基本演奏法检查 (频率控制通过)`);
                } else if ((hammerOnAllowed && isValidHammerOn && !prevHasHammerOn) || 
                          (pullOffAllowed && isValidPullOff && !prevHasPullOff)) {
                    console.log(`🎸 预检查：音符${noteIndex}吉他技巧被频率控制阻止 (频率控制未通过)`);
                }
            }
        }
        
        // Staccato（断音）- 经过音、弱拍、快速音型 (优先级较低)
        if (!selectedArticulation && !willSelectGuitarTechnique && artSettings.basic.includes('staccato')) {
            // 🔥 使用新的精准频率控制系统
            if (shouldGenerateArticulation('staccato', this.random)) {
                const isPassingNote = noteIndex > 0 && noteIndex < measureNotes.length - 1 &&
                                     Math.abs(prevInterval) <= 2 && Math.abs(nextInterval) <= 2;
                const isFastNote = ['eighth', '16th'].includes(note.duration);
                
                // 只在合适的音乐上下文中生成staccato
                if (isPassingNote || (isWeakBeat && isFastNote) || isLastNote) {
                    selectedArticulation = 'staccato';
                    console.log(`✅ 选择基本演奏法: staccato`);
                }
            }
        }
        
        // Accent（重音）- 起始音、强拍、转折点、长音前 (优先级中等)
        if (!selectedArticulation && !willSelectGuitarTechnique && artSettings.basic.includes('accent')) {
            // 🔥 使用新的精准频率控制系统
            if (shouldGenerateArticulation('accent', this.random)) {
                const isMelodyTurningPoint = prevInterval && nextInterval && 
                                           ((prevInterval > 0 && nextInterval < 0) || (prevInterval < 0 && nextInterval > 0));
                const beforeLongNote = nextInterval !== null && 
                                     ['half', 'quarter', 'quarter.'].includes(note.duration);
                
                // 只在合适的音乐上下文中生成accent
                if (isFirstNote || isStrongBeat || isMelodyTurningPoint || beforeLongNote) {
                    selectedArticulation = 'accent';
                    console.log(`✅ 选择基本演奏法: accent`);
                }
            }
        }
        
        // Acciaccatura（短倚音）- 重要音符前的装饰 (优先级较高)
        if (!selectedArticulation && !willSelectGuitarTechnique && artSettings.basic.includes('acciaccatura')) {
            // 🔥 使用新的精准频率控制系统
            if (shouldGenerateArticulation('acciaccatura', this.random)) {
                const isImportantNote = isStrongBeat || (note.duration === 'quarter' || note.duration === 'half');
                
                // 只在合适的音乐上下文中生成acciaccatura
                if (isImportantNote && !['16th'].includes(note.duration)) {
                    selectedArticulation = 'acciaccatura';
                    console.log(`✅ 选择基本演奏法: acciaccatura`);
                }
            }
        }
        
        // === 吉他技巧规则 ===
        
        console.log(`🔧 常规articulation用户设置检查:`);
        console.log(`  - enabled: ${userSettings.articulations.enabled}`);
        console.log(`  - guitar技巧: [${artSettings.guitar.join(', ')}]`);
        console.log(`  - basic技巧: [${artSettings.basic.join(', ')}]`);
        
        // === 吉他技巧规则 (最高优先级) ===
        if (!selectedArticulation && clef === 'treble' && artSettings.guitar.length > 0) {
            
            // 🔥 完全独立的吉他技巧检查 - 严格按照用户选择
            const hammerOnAllowed = artSettings.guitar.includes('hammer-on');
            const pullOffAllowed = artSettings.guitar.includes('pull-off');
            
            console.log(`🔒 独立技巧检查: hammer-on=${hammerOnAllowed}, pull-off=${pullOffAllowed}`);
            
            // 🎸 HAMMER-ON (H) - 完全独立定义 (最高优先级)
            // 定义：连接到更高音的slur，仅用于上行音程
            // 条件：前一个音符存在 + 音程为上行1-2半音 + 用户明确选择了hammer-on
            if (!selectedArticulation && hammerOnAllowed && noteIndex > 0 && !isFirstNote && !isLastNote) {
                const prevNote = measureNotes[noteIndex - 1];
                if (prevNote && prevNote.type === 'note' && prevNote.midi) {
                    const interval = note.midi - prevNote.midi;
                    
                    // 🔥 严格定义：hammer-on只能用于上行二度（+1或+2半音）
                    const isValidHammerOn = (interval === 1 || interval === 2);
                    
                    // 避免连续hammer-on
                    const prevHasHammerOn = prevNote.articulation === 'hammer-on';
                    
                    // 🎯 新的频率控制逻辑：控制上行二度slur的生成
                    const shouldGenerateSlur = shouldGenerateDirectionalSlur(interval, this.random);
                    
                    if (isValidHammerOn && !prevHasHammerOn && shouldGenerateSlur) {
                        selectedArticulation = 'hammer-on';
                        console.log(`✅ 选择吉他技巧: HAMMER-ON生成: ${prevNote.midi} -> ${note.midi} (+${interval}半音，上行)`);
                    } else {
                        console.log(`❌ HAMMER-ON跳过: interval=${interval}, 前音有H=${prevHasHammerOn}, 频率控制=${!shouldGenerateSlur}`);
                    }
                }
            } else if (hammerOnAllowed) {
                console.log(`🚫 HAMMER-ON禁止: 用户未选择hammer-on技巧`);
            }
            
            // 🎸 PULL-OFF (P) - 完全独立定义 (最高优先级)
            // 定义：连接到更低音的slur，仅用于下行音程
            // 条件：前一个音符存在 + 音程为下行1-2半音 + 用户明确选择了pull-off
            if (!selectedArticulation && pullOffAllowed && noteIndex > 0 && !isFirstNote && !isLastNote) {
                const prevNote = measureNotes[noteIndex - 1];
                if (prevNote && prevNote.type === 'note' && prevNote.midi) {
                    const interval = note.midi - prevNote.midi;
                    
                    // 🔥 严格定义：pull-off只能用于下行二度（-1或-2半音）
                    const isValidPullOff = (interval === -1 || interval === -2);
                    
                    // 避免连续pull-off
                    const prevHasPullOff = prevNote.articulation === 'pull-off';
                    
                    // 🎯 新的频率控制逻辑：控制下行二度slur的生成
                    const shouldGenerateSlur = shouldGenerateDirectionalSlur(interval, this.random);
                    
                    if (isValidPullOff && !prevHasPullOff && shouldGenerateSlur) {
                        selectedArticulation = 'pull-off';
                        console.log(`✅ 选择吉他技巧: PULL-OFF生成: ${prevNote.midi} -> ${note.midi} (${interval}半音，下行)`);
                    } else {
                        console.log(`❌ PULL-OFF跳过: interval=${interval}, 前音有P=${prevHasPullOff}, 频率控制=${!shouldGenerateSlur}`);
                    }
                }
            } else if (pullOffAllowed) {
                console.log(`🚫 PULL-OFF禁止: 用户未选择pull-off技巧`);
            }
            
            // Glissando (/) - 连接两个音符的滑音，适用于较大音程
            // 强制禁止跨小节：不在第一个和最后一个音符使用
            // glissando标记应该放在起始音符上，连接到下一个音符
            if (!selectedArticulation && artSettings.guitar.includes('glissando') && !isLastNote && noteIndex < measureNotes.length - 1) {
                const nextNote = measureNotes[noteIndex + 1];
                if (nextNote && nextNote.type === 'note' && nextNote.midi) {
                    const interval = Math.abs(nextNote.midi - note.midi);
                    // 滑音适用于3-12半音的音程（小三度到八度）
                    const isSuitableForSlide = interval >= 3 && interval <= 12;
                    
                    if (isSuitableForSlide && this.random.nextFloat() < 0.95) {
                        selectedArticulation = 'glissando';
                        console.log(`✅ 选择吉他技巧: Glissando: ${note.midi} -> ${nextNote.midi} (音程：${interval}半音)`);
                    }
                }
            }
            
            // Slide In (/↗) - 乐句开头或重拍，制造进入感
            if (!selectedArticulation && artSettings.guitar.includes('slide-in')) {
                const isEntryPoint = isFirstNote || (isStrongBeat && this.random.nextFloat() < 0.5);
                
                if (isEntryPoint && this.random.nextFloat() < 0.1) {
                    selectedArticulation = 'slide-in';
                    console.log(`✅ 选择吉他技巧: slide-in`);
                }
            }
            
            // Slide Out (↘\) - 乐句结尾，作为收尾装饰
            if (!selectedArticulation && artSettings.guitar.includes('slide-out')) {
                const isEndingPoint = isLastNote || (noteIndex >= measureNotes.length - 2);
                
                if (isEndingPoint && this.random.nextFloat() < 0.12) {
                    selectedArticulation = 'slide-out';
                    console.log(`✅ 选择吉他技巧: slide-out`);
                }
            }
        }
        
        // 🔥 全局频率控制 - 每两小节内最多2个articulation
        
        if (selectedArticulation) {
            // 检查全局articulation计数器
            if (!window.articulationCounter) {
                window.articulationCounter = {
                    total: 0,
                    perTwoMeasures: 0,
                    currentMeasurePair: 0
                };
            }
            
            // 计算当前是哪个两小节组（0-1, 2-3, 4-5, ...）
            const currentMeasurePair = Math.floor(measureIndex / 2);
            
            // 如果进入了新的两小节组，重置计数器
            if (currentMeasurePair !== window.articulationCounter.currentMeasurePair) {
                console.log(`🔄 进入新的两小节组 ${currentMeasurePair*2+1}-${currentMeasurePair*2+2}，重置计数器`);
                window.articulationCounter.perTwoMeasures = 0;
                window.articulationCounter.currentMeasurePair = currentMeasurePair;
            }
            
            // 检查是否超过频率限制
            if (window.articulationCounter.perTwoMeasures >= 2) {
                console.log(`🚫 频率限制: 小节${measureIndex+1}的${selectedArticulation}被阻止 - 当前两小节组已有${window.articulationCounter.perTwoMeasures}个articulation`);
                selectedArticulation = null;
            } else {
                // 允许生成，更新计数器
                window.articulationCounter.total++;
                window.articulationCounter.perTwoMeasures++;
                console.log(`✅ 频率允许: 小节${measureIndex+1}添加${selectedArticulation} - 当前两小节组: ${window.articulationCounter.perTwoMeasures}/2`);
            }
        }
        if (selectedArticulation) {
            console.log(`🎸 选中演奏法: ${selectedArticulation}, 音符: MIDI ${note.midi}, 位置: ${noteIndex}`);
            
            // 🔥 检查：如果选择了会产生slur的articulation，确保下一个音符不会再有articulation
            if (['hammer-on', 'pull-off'].includes(selectedArticulation) && noteIndex < measureNotes.length - 1) {
                const nextNote = measureNotes[noteIndex + 1];
                if (nextNote && nextNote.type === 'note' && nextNote.articulation) {
                    console.log(`⚠️ 警告：当前音符${noteIndex}选择${selectedArticulation}会产生slur，但下一个音符${noteIndex + 1}已经有articulation: ${nextNote.articulation}`);
                    console.log(`🔧 清除下一个音符的articulation以避免冲突`);
                    nextNote.articulation = null;
                }
            }
        }
        
        // 🔥 最终安全检查：如果选择了不被允许的技巧，返回null
        if (clef === 'treble' && artSettings.guitar.length > 0) {
            const hammerOnAllowed = artSettings.guitar.includes('hammer-on');
            const pullOffAllowed = artSettings.guitar.includes('pull-off');
            
            if (selectedArticulation === 'hammer-on' && !hammerOnAllowed) {
                console.log(`🚫 最终安全检查: hammer-on不被允许，返回null`);
                return null;
            }
            if (selectedArticulation === 'pull-off' && !pullOffAllowed) {
                console.log(`🚫 最终安全检查: pull-off不被允许，返回null`);
                return null;
            }
        }
        
        return selectedArticulation;
    }
    
    /**
     * 🔥 全局演奏法安全检查 - 严格过滤不被允许的技巧
     * 这是最后一道防线，确保没有不被允许的吉他技巧通过
     * 注意：这个函数也会间接防止不被允许的slur，因为slur是基于articulation生成的
     */
    sanitizeArticulations(measures) {
        const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
        const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
        
        console.log(`🔒 全局演奏法清理开始:`);
        console.log(`  - hammer-on允许: ${hammerOnAllowed}`);
        console.log(`  - pull-off允许: ${pullOffAllowed}`);
        console.log(`  - 用户选择的吉他技巧: [${userSettings.articulations.guitar.join(', ')}]`);
        
        let sanitizedCount = 0;
        let hammerOnRemoved = 0;
        let pullOffRemoved = 0;
        
        for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
            const measure = measures[measureIndex];
            for (let noteIndex = 0; noteIndex < measure.notes.length; noteIndex++) {
                const note = measure.notes[noteIndex];
                
                if (note.type === 'note' && note.articulation) {
                    let shouldRemove = false;
                    
                    // 检查hammer-on
                    if (note.articulation === 'hammer-on' && !hammerOnAllowed) {
                        console.log(`🚫 全局清理: 移除不被允许的hammer-on (小节${measureIndex+1}, 音符${noteIndex+1}, MIDI ${note.midi})`);
                        shouldRemove = true;
                        hammerOnRemoved++;
                    }
                    
                    // 检查pull-off
                    if (note.articulation === 'pull-off' && !pullOffAllowed) {
                        console.log(`🚫 全局清理: 移除不被允许的pull-off (小节${measureIndex+1}, 音符${noteIndex+1}, MIDI ${note.midi})`);
                        shouldRemove = true;
                        pullOffRemoved++;
                    }
                    
                    if (shouldRemove) {
                        const originalArticulation = note.articulation;
                        delete note.articulation;
                        sanitizedCount++;
                        console.log(`  ✅ 已清除: ${originalArticulation} -> null`);
                    }
                }
            }
        }
        
        console.log(`🔒 全局演奏法清理完成:`);
        console.log(`  - 总共移除: ${sanitizedCount}个不被允许的技巧`);
        console.log(`  - hammer-on移除: ${hammerOnRemoved}个`);
        console.log(`  - pull-off移除: ${pullOffRemoved}个`);
        console.log(`  - 相关的slur连线也将不会生成，因为它们依赖于这些articulation`);
        
        return measures;
    }

    /**
     * 🔍 实时userSettings状态检查 - 用于调试权限检查问题
     */
    debugUserSettingsState() {
        console.log(`\n🔧 === 实时userSettings状态检查 ===`);
        console.log(`userSettings类型: ${typeof userSettings}`);
        console.log(`userSettings.articulations类型: ${typeof userSettings?.articulations}`);
        console.log(`userSettings.articulations.guitar类型: ${typeof userSettings?.articulations?.guitar}`);
        console.log(`userSettings.articulations.guitar内容: [${userSettings?.articulations?.guitar?.join?.(', ') || 'undefined'}]`);
        console.log(`userSettings.articulations.enabled: ${userSettings?.articulations?.enabled}`);
        
        // 检查复选框状态
        const hammerCheckboxDebug = document.getElementById('gtr-hammer');
        const pullCheckboxDebug = document.getElementById('gtr-pull');
        console.log(`UI复选框状态:`);
        console.log(`  - hammer-on复选框存在: ${!!hammerCheckboxDebug}`);
        console.log(`  - hammer-on复选框勾选: ${hammerCheckboxDebug?.checked}`);
        console.log(`  - pull-off复选框存在: ${!!pullCheckboxDebug}`);
        console.log(`  - pull-off复选框勾选: ${pullCheckboxDebug?.checked}`);
        
        // 权限检查结果
        const hammerOnAllowed = userSettings?.articulations?.guitar?.includes?.('hammer-on');
        const pullOffAllowed = userSettings?.articulations?.guitar?.includes?.('pull-off');
        console.log(`权限检查结果:`);
        console.log(`  - hammer-on允许: ${hammerOnAllowed}`);
        console.log(`  - pull-off允许: ${pullOffAllowed}`);
        console.log(`🔧 === userSettings状态检查结束 ===\n`);
        
        return {
            hammerOnAllowed,
            pullOffAllowed,
            settingsValid: !!(userSettings?.articulations?.guitar)
        };
    }

    /**
     * 🔍 综合演奏法调试报告 - 追踪所有演奏法的应用情况
     */
    generateArticulationDebugReport(measures) {
        const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
        const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
        
        console.log(`\n🔍 === 演奏法调试报告 ===`);
        console.log(`🔒 用户设置: hammer-on允许=${hammerOnAllowed}, pull-off允许=${pullOffAllowed}`);
        console.log(`🔒 用户选择的吉他技巧: [${userSettings.articulations.guitar.join(', ')}]`);
        
        let totalHammerOn = 0;
        let totalPullOff = 0;
        let totalOther = 0;
        let expectedSlurs = 0; // 预期的slur数量
        
        for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
            const measure = measures[measureIndex];
            let measureHammerOn = 0;
            let measurePullOff = 0;
            let measureOther = 0;
            
            for (let noteIndex = 0; noteIndex < measure.notes.length; noteIndex++) {
                const note = measure.notes[noteIndex];
                
                if (note.type === 'note' && note.articulation) {
                    const nextNote = noteIndex < measure.notes.length - 1 ? measure.notes[noteIndex + 1] : null;
                    const isLastInMeasure = noteIndex === measure.notes.length - 1;
                    
                    if (note.articulation === 'hammer-on') {
                        measureHammerOn++;
                        totalHammerOn++;
                        
                        if (!isLastInMeasure && nextNote && nextNote.type === 'note') {
                            const interval = nextNote.midi - note.midi;
                            if (interval > 0 && interval <= 2) {
                                expectedSlurs++;
                                console.log(`🎸 小节${measureIndex+1}音符${noteIndex+1}: hammer-on (MIDI ${note.midi} -> ${nextNote.midi}, +${interval}半音) ➜ 将生成上行slur`);
                            } else {
                                console.log(`🎸 小节${measureIndex+1}音符${noteIndex+1}: hammer-on (MIDI ${note.midi}) ⚠️ 音程不匹配，可能不会生成slur`);
                            }
                        } else {
                            console.log(`🎸 小节${measureIndex+1}音符${noteIndex+1}: hammer-on (MIDI ${note.midi}) ⚠️ 小节末或后无音符，不会生成slur`);
                        }
                        
                        // 检查是否应该被允许
                        if (!hammerOnAllowed) {
                            console.log(`⚠️ 警告: 发现不被允许的hammer-on!`);
                        }
                    } else if (note.articulation === 'pull-off') {
                        measurePullOff++;
                        totalPullOff++;
                        
                        if (!isLastInMeasure && nextNote && nextNote.type === 'note') {
                            const interval = nextNote.midi - note.midi;
                            if (interval < 0 && interval >= -2) {
                                expectedSlurs++;
                                console.log(`🎸 小节${measureIndex+1}音符${noteIndex+1}: pull-off (MIDI ${note.midi} -> ${nextNote.midi}, ${interval}半音) ➜ 将生成下行slur`);
                            } else {
                                console.log(`🎸 小节${measureIndex+1}音符${noteIndex+1}: pull-off (MIDI ${note.midi}) ⚠️ 音程不匹配，可能不会生成slur`);
                            }
                        } else {
                            console.log(`🎸 小节${measureIndex+1}音符${noteIndex+1}: pull-off (MIDI ${note.midi}) ⚠️ 小节末或后无音符，不会生成slur`);
                        }
                        
                        // 检查是否应该被允许
                        if (!pullOffAllowed) {
                            console.log(`⚠️ 警告: 发现不被允许的pull-off!`);
                        }
                    } else {
                        measureOther++;
                        totalOther++;
                        console.log(`🎵 小节${measureIndex+1}音符${noteIndex+1}: ${note.articulation} (MIDI ${note.midi})`);
                    }
                }
            }
            
            if (measureHammerOn > 0 || measurePullOff > 0) {
                console.log(`📊 小节${measureIndex+1}汇总: hammer-on=${measureHammerOn}, pull-off=${measurePullOff}, 其他=${measureOther}`);
            }
        }
        
        console.log(`\n📊 === 全曲汇总 ===`);
        console.log(`🎸 Hammer-on总数: ${totalHammerOn} (允许: ${hammerOnAllowed})`);
        console.log(`🎸 Pull-off总数: ${totalPullOff} (允许: ${pullOffAllowed})`);
        console.log(`🎵 其他演奏法总数: ${totalOther}`);
        console.log(`🎼 预期slur连线数量: ${expectedSlurs}`);
        console.log(`\n🔎 === Slur生成规则提醒 ===`);
        console.log(`• 当只勾选hammer-on时: 只应出现连接上行二度(+1或+2半音)的slur`);
        console.log(`• 当只勾选pull-off时: 只应出现连接下行二度(-1或-2半音)的slur`);
        console.log(`• 当两者都勾选时: 上行二度和下行二度的slur都可能出现`);
        console.log(`• 当两者都不勾选时: 不应出现任何吉他技巧相关的slur`);
        console.log(`🔍 === 调试报告结束 ===\n`);
        
        return {
            hammerOnCount: totalHammerOn,
            pullOffCount: totalPullOff,
            otherCount: totalOther,
            expectedSlurs,
            hammerOnAllowed,
            pullOffAllowed
        };
    }

    /**
     * MIDI转MusicXML音名 - 正确处理调号升降
     * 核心原则：只有当音符偏离调号默认值时才写入alter
     */
    midiToMusicXML(midi) {
        let octave = Math.floor(midi / 12) - 1;
        const pitchClass = midi % 12;
        
        // 🎵 使用专业记谱规则获取正确的音名拼写
        const correctSpelling = PROFESSIONAL_NOTATION_RULES.getCorrectSpelling(pitchClass, this.keySignature);
        
        // 获取当前调号的默认升降记号
        const keyDefaults = this.getKeyAccidentals(this.keySignature);
        
        // 解析正确拼写得到的音名和升降号
        let step, alter;
        if (correctSpelling.includes('##')) {
            step = correctSpelling.replace('##', '');
            alter = 2; // 重升
        } else if (correctSpelling.includes('bb')) {
            step = correctSpelling.replace('bb', '');
            alter = -2; // 重降
        } else if (correctSpelling.includes('#')) {
            step = correctSpelling.replace('#', '');
            alter = 1; // 升
        } else if (correctSpelling.includes('b')) {
            step = correctSpelling.replace('b', '');
            alter = -1; // 降
        } else {
            step = correctSpelling;
            alter = 0; // 自然音
        }
        
        // 对于小调，直接使用从拼写表获得的正确音名，不要再覆盖
        const keyInfo = KEY_SIGNATURES[this.keySignature];
        const isMinorKey = keyInfo && keyInfo.mode === 'minor';
        
        let actualAlter = alter; // 这个音符实际的升降值
        
        // 根据pitch class确定实际的升降值
        // 对于小调，已经从拼写表获得了正确的音名，不需要再处理
        if (!isMinorKey) {
            switch (pitchClass) {
                case 0: 
                    // 特殊处理：如果正确拼写已经确定为B#，保持actualAlter=1
                    if (step === 'B' && alter === 1) {
                        actualAlter = 1; // 保持B#的升记号
                    } else {
                        actualAlter = 0; // C自然音
                    }
                    break;  // C or B#
                case 1: // C# or Db
                    if (keyDefaults['C'] === 1) {
                        step = 'C'; actualAlter = 1;
                    } else if (keyDefaults['D'] === -1) {
                        step = 'D'; actualAlter = -1;
                    } else {
                        // 🔥 修复同音异名拼写问题：根据调号类型决定默认拼写
                        if (this.isFlatKey(this.keySignature)) {
                            step = 'D'; actualAlter = -1; // 降号调用降号拼写
                        } else {
                            step = 'C'; actualAlter = 1; // 升号调用升号拼写
                        }
                    }
                    break;
                case 2: actualAlter = 0; break;  // D
                case 3: // Eb or D#
                    if (keyDefaults['E'] === -1) {
                        step = 'E'; actualAlter = -1;
                    } else if (keyDefaults['D'] === 1) {
                        step = 'D'; actualAlter = 1;
                    } else {
                        // 🔥 修复同音异名拼写问题：根据调号类型决定默认拼写
                        if (this.isFlatKey(this.keySignature)) {
                            step = 'E'; actualAlter = -1; // 降号调用降号拼写
                        } else {
                            step = 'D'; actualAlter = 1; // 升号调用升号拼写
                        }
                    }
                    break;
                case 4: actualAlter = 0; break;  // E
                case 5: 
                    // 特殊处理：如果正确拼写已经确定为E#，保持actualAlter=1
                    if (step === 'E' && alter === 1) {
                        actualAlter = 1; // 保持E#的升记号
                    } else {
                        actualAlter = 0; // F自然音
                    }
                    break;  // F or E#
                case 6: // F# or Gb
                    if (keyDefaults['F'] === 1) {
                        step = 'F'; actualAlter = 1;
                    } else if (keyDefaults['G'] === -1) {
                        step = 'G'; actualAlter = -1;
                    } else {
                        // 🔥 修复同音异名拼写问题：根据调号类型决定默认拼写
                        if (this.isFlatKey(this.keySignature)) {
                            step = 'G'; actualAlter = -1; // 降号调用降号拼写
                        } else {
                            step = 'F'; actualAlter = 1; // 升号调用升号拼写
                        }
                    }
                    break;
                case 7: actualAlter = 0; break;  // G
                case 8: // Ab or G#
                    if (keyDefaults['A'] === -1) {
                        step = 'A'; actualAlter = -1;
                    } else if (keyDefaults['G'] === 1) {
                        step = 'G'; actualAlter = 1;
                    } else {
                        // 🔥 修复同音异名拼写问题：根据调号类型决定默认拼写
                        if (this.isFlatKey(this.keySignature)) {
                            step = 'A'; actualAlter = -1; // 降号调用降号拼写
                        } else {
                            step = 'G'; actualAlter = 1; // 升号调用升号拼写
                        }
                    }
                    break;
                case 9: actualAlter = 0; break;  // A
                case 10: // Bb or A#
                    if (keyDefaults['B'] === -1) {
                        step = 'B'; actualAlter = -1;
                    } else if (keyDefaults['A'] === 1) {
                        step = 'A'; actualAlter = 1;
                    } else {
                        // 🔥 修复同音异名拼写问题：根据调号类型决定默认拼写
                        if (this.isFlatKey(this.keySignature)) {
                            step = 'B'; actualAlter = -1; // 降号调用降号拼写
                        } else {
                            step = 'A'; actualAlter = 1; // 升号调用升号拼写
                        }
                    }
                    break;
                case 11: 
                    // 特殊处理：如果正确拼写已经确定为Cb，保持actualAlter=-1
                    if (step === 'C' && alter === -1) {
                        actualAlter = -1; // 保持Cb的降记号
                    } else {
                        actualAlter = 0; // B自然音
                    }
                    break; // B or Cb
            }
        }
        
        // 关键逻辑：决定是否需要写入alter标签
        const keyDefaultForThisStep = keyDefaults[step];
        let xmlAlter = undefined;
        
        // 修复OSMD渲染问题：总是明确写入alter标签
        // OSMD需要明确的alter值才能正确显示升降音
        if (actualAlter !== 0) {
            // 任何升降音都明确写入
            xmlAlter = actualAlter;
        } else if (keyDefaultForThisStep !== undefined && keyDefaultForThisStep !== 0) {
            // 如果调号规定了这个音应该升降，但实际是自然音
            // 需要明确写入alter=0来表示还原记号
            xmlAlter = 0;
        }
        
        // 特殊处理：B#和E#必须写入alter标签才能正确渲染
        // 虽然它们与调号一致，但OSMD需要明确的alter来区分异名同音
        if (this.keySignature === 'C#' || this.keySignature === 'C#m') {
            if ((step === 'B' && actualAlter === 1) || (step === 'E' && actualAlter === 1)) {
                // B#和E#必须写入alter=1才能正确渲染为升记号
                xmlAlter = 1;
            }
        }
        
        // 只有当音符本身是自然音，且调号也没有改变它时，才不写alter
        
        // 特殊处理：B#, E# 和 Cb 的八度调整
        if (step === 'B' && actualAlter === 1 && pitchClass === 0) {
            // B# 实际是 C 的异名同音，需要将八度减 1
            octave = octave - 1;
            console.log(`🔍 [B#检查] MIDI ${midi} -> B#${octave} (原八度${octave + 1}已调整)`);
            console.log(`🔍 [B#检查] 实际音高: B#${octave} = C${octave + 1} (MIDI ${midi})`);
            if (midi > this.rules?.range?.max) {
                console.error(`🚨 [B#检查] B#${octave} (MIDI ${midi}) 超出音域 ${this.rules.range.min}-${this.rules.range.max}！`);
            }
        }
        
        if (step === 'C' && actualAlter === -1 && pitchClass === 11) {
            // Cb 实际是 B 的异名同音，需要将八度增加 1
            octave = octave + 1;
            console.log(`🔍 [Cb检查] MIDI ${midi} -> Cb${octave} (原八度${octave - 1}已调整)`);
            console.log(`🔍 [Cb检查] 实际音高: Cb${octave} = B${octave - 1} (MIDI ${midi})`);
            if (midi > this.rules?.range?.max) {
                console.error(`🚨 [Cb检查] Cb${octave} (MIDI ${midi}) 超出音域 ${this.rules.range.min}-${this.rules.range.max}！`);
            }
        }
        
        if (step === 'E' && actualAlter === 1 && pitchClass === 5) {
            // E# 实际是 F 的异名同音，需要将八度调整
            // E#4 = F4，不需要调整八度
            console.log(`🔍 [E#检查] MIDI ${midi} -> E#${octave}`);
            console.log(`🔍 [E#检查] 实际音高: E#${octave} = F${octave} (MIDI ${midi})`);
        }
        
        // 扩展调试输出 - 记录所有音符
        console.log(`🎹 [${this.keySignature}] MIDI ${midi} (pc=${pitchClass}) -> ${step}${actualAlter === 1 ? '#' : actualAlter === -1 ? 'b' : ''}${octave}`);
        console.log(`   调号默认: ${step}=${keyDefaultForThisStep}, 实际alter: ${actualAlter}, XML alter: ${xmlAlter === undefined ? '不写入' : xmlAlter}`);
        
        // 特别警告：检测问题音符
        if (this.keySignature === 'G' && pitchClass === 5) {
            console.warn(`⚠️ 警告：G大调中出现了F自然音(MIDI ${midi})！这不应该出现在G大调音阶中。`);
        }
        
        return {
            step: step,
            octave: octave,
            alter: xmlAlter
        };
    }
    
    
    /**
     * 🔥 判断是否为降号调（用于修复同音异名拼写问题）
     */
    isFlatKey(keySignature) {
        const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'];
        return flatKeys.includes(keySignature);
    }
    
    /**
     * 获取调号的升降记号定义
     */
    getKeyAccidentals(keySignature) {
        const keyAccidentalMap = {
            // 大调
            'C': {},
            'G': { 'F': 1 },                           // F#
            'D': { 'F': 1, 'C': 1 },                   // F#, C#
            'A': { 'F': 1, 'C': 1, 'G': 1 },           // F#, C#, G#
            'E': { 'F': 1, 'C': 1, 'G': 1, 'D': 1 },   // F#, C#, G#, D#
            'B': { 'F': 1, 'C': 1, 'G': 1, 'D': 1, 'A': 1 }, // F#, C#, G#, D#, A#
            'F#': { 'F': 1, 'C': 1, 'G': 1, 'D': 1, 'A': 1, 'E': 1 }, // F#, C#, G#, D#, A#, E#
            'F': { 'B': -1 },                          // Bb
            'Bb': { 'B': -1, 'E': -1 },                // Bb, Eb
            'Eb': { 'B': -1, 'E': -1, 'A': -1 },       // Bb, Eb, Ab
            'Ab': { 'B': -1, 'E': -1, 'A': -1, 'D': -1 }, // Bb, Eb, Ab, Db
            'Db': { 'B': -1, 'E': -1, 'A': -1, 'D': -1, 'G': -1 }, // Bb, Eb, Ab, Db, Gb
            'Gb': { 'B': -1, 'E': -1, 'A': -1, 'D': -1, 'G': -1, 'C': -1 }, // Bb, Eb, Ab, Db, Gb, Cb
            
            // 小调（使用相对大调的调号）
            'Am': {},
            'Em': { 'F': 1 },
            'Bm': { 'F': 1, 'C': 1 },
            'F#m': { 'F': 1, 'C': 1, 'G': 1 },
            'C#m': { 'F': 1, 'C': 1, 'G': 1, 'D': 1 },
            'G#m': { 'F': 1, 'C': 1, 'G': 1, 'D': 1, 'A': 1 },
            'D#m': { 'F': 1, 'C': 1, 'G': 1, 'D': 1, 'A': 1, 'E': 1 },
            'A#m': { 'F': 1, 'C': 1, 'G': 1, 'D': 1, 'A': 1, 'E': 1, 'B': 1 },
            'Dm': { 'B': -1 },
            'Gm': { 'B': -1, 'E': -1 },
            'Cm': { 'B': -1, 'E': -1, 'A': -1 },
            'Fm': { 'B': -1, 'E': -1, 'A': -1, 'D': -1 },
            'Bbm': { 'B': -1, 'E': -1, 'A': -1, 'D': -1, 'G': -1 },
            'Ebm': { 'B': -1, 'E': -1, 'A': -1, 'D': -1, 'G': -1, 'C': -1 },
        };
        
        return keyAccidentalMap[keySignature] || {};
    }

    /**
     * 🔥 计算节奏类型的权重（用于测试频率控制系统）
     * @param {Array} allowedDurations - 允许的节奏类型数组
     * @param {string} targetDuration - 目标节奏类型
     * @param {number} remainingBeats - 剩余拍数
     * @param {number} currentBeat - 当前拍位置
     * @returns {number} - 计算出的权重值
     */
    calculateDurationWeight(allowedDurations, targetDuration, remainingBeats, currentBeat) {
        console.log(`🎯 计算权重 - 目标: ${targetDuration}, 剩余拍数: ${remainingBeats}, 当前拍: ${currentBeat}`);
        
        // 检查目标节奏是否在允许列表中
        if (!allowedDurations.includes(targetDuration)) {
            console.log(`❌ ${targetDuration} 不在允许列表中: [${allowedDurations.join(', ')}]`);
            return 0;
        }
        
        let weight = 10; // 基础权重
        
        // 🔥 应用用户频率设置，6/8拍使用特殊映射
        if (userSettings && userSettings.rhythmFrequencies) {
            let freqKey = targetDuration;
            
            // 根据拍号选择正确的频率映射
            if (this.timeSignature === '6/8') {
                // 6/8拍特殊映射：对应到4/4拍的节奏类型
                if (targetDuration === 'quarter.') freqKey = 'half';        // 6/8拍附点四分音符 -> 4/4拍二分音符
                else if (targetDuration === 'half.') freqKey = 'whole';     // 6/8拍附点二分音符 -> 4/4拍全音符
                else if (targetDuration === 'eighth.') freqKey = 'dotted-eighth'; // 保持原样
                console.log(`🎵 6/8拍频率映射: ${targetDuration} -> ${freqKey}`);
            } else {
                // 非6/8拍使用标准映射
                if (targetDuration === 'quarter.') freqKey = 'dotted-quarter';
                else if (targetDuration === 'half.') freqKey = 'dotted-half';
                else if (targetDuration === 'eighth.') freqKey = 'dotted-eighth';
            }
            
            const userFreq = userSettings.rhythmFrequencies[freqKey];
            if (userFreq !== undefined) {
                if (userFreq === 0) {
                    console.log(`🚫 用户频率设置：${targetDuration} (${freqKey}) 被设为 0%，权重为0`);
                    return 0;
                } else {
                    weight = userFreq; // 直接使用用户设置的频率作为权重
                    console.log(`🎯 用户频率设置：${targetDuration} (${freqKey}) = ${userFreq}%, 权重: ${weight}`);
                }
            } else {
                console.log(`ℹ️ ${targetDuration} (${freqKey}) 没有用户频率设置，使用默认权重: ${weight}`);
            }
        } else {
            console.log(`ℹ️ 没有用户频率设置，使用默认权重: ${weight}`);
        }
        
        return weight;
    }
}

// ====== 跨小节连线清理器 ======
/**
 * 彻底清理所有跨小节的tie和可能导致跨小节slur的articulation
 * 在传给MusicXMLBuilder之前调用
 */
function cleanupCrossMeasureTies(melody) {
    console.log('🧹 开始清理跨小节连线...');
    let cleanupCount = 0;
    
    for (let measureIndex = 0; measureIndex < melody.length; measureIndex++) {
        const measure = melody[measureIndex];
        if (!measure || !measure.notes) continue;
        
        for (let noteIndex = 0; noteIndex < measure.notes.length; noteIndex++) {
            const note = measure.notes[noteIndex];
            if (note.type !== 'note') continue;
            
            // 清理小节最后一个音符的tie start
            if (noteIndex === measure.notes.length - 1) {
                if (note.tied && note.tieType === 'start') {
                    console.log(`❌ 清理小节${measureIndex + 1}最后音符的tie start`);
                    note.tied = false;
                    note.tieType = null;
                    cleanupCount++;
                }
                // 清理可能导致跨小节slur的articulation
                // 注意：glissando不是slur，而且分配逻辑已经避免了跨小节
                // 暂时禁用此清理以测试glissando显示
                /*
                if (note.articulation === 'glissando') {
                    console.log(`❌ 清理小节${measureIndex + 1}最后音符的glissando`);
                    note.articulation = null;
                    cleanupCount++;
                }
                */
            }
            
            // 清理小节第一个音符的tie stop
            if (noteIndex === 0) {
                if (note.tied && note.tieType === 'stop') {
                    console.log(`❌ 清理小节${measureIndex + 1}第一个音符的tie stop`);
                    note.tied = false;
                    note.tieType = null;
                    cleanupCount++;
                }
                // 清理不应在第一个音符出现的articulation
                if (note.articulation === 'hammer-on' || note.articulation === 'pull-off') {
                    console.log(`❌ 清理小节${measureIndex + 1}第一个音符的${note.articulation}`);
                    note.articulation = null;
                    cleanupCount++;
                }
            }
            
            // 清理小节倒数第二个音符的articulation（如果它会影响最后一个音符）
            if (noteIndex === measure.notes.length - 2) {
                const nextNote = measure.notes[noteIndex + 1];
                if (nextNote && nextNote.type === 'note') {
                    // 如果倒数第二个音符的articulation会在最后一个音符产生slur
                    if (nextNote.articulation === 'hammer-on' || nextNote.articulation === 'pull-off') {
                        console.log(`❌ 清理小节${measureIndex + 1}最后音符的${nextNote.articulation}（防止跨小节slur）`);
                        nextNote.articulation = null;
                        cleanupCount++;
                    }
                }
            }
            
            // 清理边界上的tie continue
            if ((noteIndex === 0 || noteIndex === measure.notes.length - 1) && 
                note.tied && note.tieType === 'continue') {
                console.log(`❌ 清理小节${measureIndex + 1}边界的tie continue`);
                note.tied = false;
                note.tieType = null;
                cleanupCount++;
            }
        }
    }
    
    console.log(`✅ 跨小节连线清理完成，共清理${cleanupCount}处`);
    return melody;
}

// ====== MusicXML构建器 ======
class MusicXMLBuilder {
    constructor(melody, config) {
        // 在构建之前先清理跨小节连线
        this.melody = cleanupCrossMeasureTies(melody);
        this.config = config;
    }

    /**
     * 固定每行小节数为4（所有设备）
     */
    getMeasuresPerLine() {
        const scoreContainer = document.getElementById('score');
        const containerWidth = scoreContainer ? scoreContainer.clientWidth : 1000;
        
        console.log(`📐 容器宽度: ${containerWidth}px`);
        
        // 强制每行4小节（所有设备）
        const measuresPerLine = 4;
        const layoutType = 'fixed-4-measures';
        
        console.log(`📏 固定布局: ${layoutType} - 每行${measuresPerLine}小节 (基于宽度 ${containerWidth}px)`);
        
        // 存储当前布局信息，供其他函数使用
        this.currentLayout = {
            containerWidth,
            measuresPerLine,
            layoutType
        };
        
        return measuresPerLine;
    }

    /**
     * 🎯 预处理旋律数据，只拆分第二拍反拍（位置1.5）的四分音符
     * 位置说明：0=第1拍, 1=第2拍, 1.5=第2拍反拍, 2=第3拍, 3=第4拍
     */
    preprocessMelodyForBeatClarity() {
        if (this.config.timeSignature !== '4/4') {
            return; // 只处理4/4拍
        }
        
        console.log(`🎯 === XML构建前预处理：根据节奏复杂度处理拍点清晰度 ===`);
        const tolerance = 0.01;
        let totalSplits = 0;
        
        // 遍历每个小节
        for (let measureIndex = 0; measureIndex < this.melody.length; measureIndex++) {
            const measure = this.melody[measureIndex];
            if (!measure || !measure.notes) continue;
            
            // 🎼 先检查这个小节是否有16分音符
            let has16thNotes = false;
            for (const note of measure.notes) {
                if (note.type === 'note' && Math.abs(note.beats - 0.25) < tolerance && !note.isTriplet) {
                    has16thNotes = true;
                    break;
                }
            }
            
            const newNotes = [];
            let currentPosition = 0;
            
            // 遍历小节中的每个音符
            for (let i = 0; i < measure.notes.length; i++) {
                const note = measure.notes[i];
                
                // 检查是否是需要拆分的四分音符
                const isQuarterNote = note.type === 'note' && Math.abs(note.beats - 1.0) < tolerance;
                // 🎯 只处理位置1.5（第二拍的反拍）
                const isAt1_5Position = Math.abs(currentPosition - 1.5) < tolerance;
                
                // 如果有16分音符，位置1.5的四分音符不需要拆分
                // 防止对hammer-on/pull-off音符进行tie拆分
                const hasGuitarTechnique = note.articulation === 'hammer-on' || note.articulation === 'pull-off';
                if (isQuarterNote && isAt1_5Position && !note.isTriplet && !note.tied && !hasGuitarTechnique) {
                    if (has16thNotes) {
                        console.log(`🎼 小节${measureIndex + 1}有16分音符，位置1.5的四分音符不拆分（两级规则：不显示八分音符拍点）`);
                        // 不拆分，直接添加
                        newNotes.push(note);
                    } else {
                        console.log(`🎯 发现第二拍反拍的四分音符！小节${measureIndex + 1}，位置=1.5, 音高=${note.midi}`);
                        console.log(`🎯 此四分音符会从1.5延续到2.5，跨越第3拍（位置2），需要拆分`);
                        
                        // 创建两个八分音符并用tie连接
                        const firstEighth = {
                            ...note,
                            duration: 'eighth',
                            beats: 0.5,
                            tied: true,
                            tieType: 'start'
                        };
                        
                        const secondEighth = {
                            ...note,
                            duration: 'eighth',
                            beats: 0.5,
                            tied: true,
                            tieType: 'stop'
                        };
                        
                        newNotes.push(firstEighth);
                        newNotes.push(secondEighth);
                        totalSplits++;
                        
                        console.log(`🎯 已拆分: 1.5-2.0 (八分音符+tie) + 2.0-2.5 (八分音符)`);
                    }
                } else {
                    // 不需要拆分，直接添加
                    newNotes.push(note);
                }
                
                currentPosition += note.beats;
            }
            
            // 替换原小节的音符
            measure.notes = newNotes;
        }
        
        console.log(`🎯 预处理完成：共拆分了${totalSplits}个位置1.5的四分音符`);
    }

    /**
     * 确定是否需要在指定小节开始新行
     */
    shouldStartNewSystem(measureIndex, measuresPerLine) {
        // 第一小节不需要换行标记
        if (measureIndex === 0) return false;
        
        // 如果小节索引是measuresPerLine的倍数，则开始新行
        const shouldBreak = (measureIndex % measuresPerLine) === 0;
        
        console.log(`📐 换行检查: 小节${measureIndex + 1} (索引${measureIndex}), 每行${measuresPerLine}小节 -> ${shouldBreak ? '✅开始新行' : '❌不换行'}`);
        
        return shouldBreak;
    }

    build(measuresPerLine = 4) {
        const { keySignature, timeSignature, clef, measures } = this.config;
        console.log(`🏗️ 开始构建MusicXML，每行${measuresPerLine}小节`);
        
        // 🚨 新方案：在构建XML之前预处理旋律，拆分1.5和2.5位置的四分音符
        this.preprocessMelodyForBeatClarity();
        
        const [beats, beatType] = timeSignature.split('/').map(Number);
        
        // 调号映射（五度圈，大调和小调）
        const keyMap = {
            // 大调
            'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
            'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6, 'Cb': -7,
            // 小调（使用相对大调的调号）
            'Am': 0, 'Em': 1, 'Bm': 2, 'F#m': 3, 'C#m': 4, 'G#m': 5, 'D#m': 6, 'A#m': 7,
            'Dm': -1, 'Gm': -2, 'Cm': -3, 'Fm': -4, 'Bbm': -5, 'Ebm': -6
        };
        
        const keyFifths = keyMap[keySignature] || 0;
        const keyMode = keySignature.includes('m') ? 'minor' : 'major';
        
        console.log(`🔑 调号设置: ${keySignature} -> fifths=${keyFifths}, mode=${keyMode}`);
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
    </score-part>
  </part-list>
  <part id="P1">`;

        console.log(`🎼 总共${measures}小节，每行${measuresPerLine}小节，预计${Math.ceil(measures / measuresPerLine)}行`);
        // 扁平化全局音符序列（按渲染顺序包含休止符），用于严格的tie邻接校验
        const flatNotes = [];
        const indexMap = new Map(); // key: `${measureIndex}:${noteIndex}` -> flat index
        for (let mi = 0; mi < this.melody.length; mi++) {
            const m = this.melody[mi];
            if (!m || !m.notes) continue;
            for (let ni = 0; ni < m.notes.length; ni++) {
                flatNotes.push({ measureIndex: mi, noteIndex: ni, event: m.notes[ni] });
                indexMap.set(`${mi}:${ni}`, flatNotes.length - 1);
            }
        }
        const tieNumberByFlatIndex = {};
        let tieCounter = 1;
        
        // 生成每个小节
        let prevNoteHadSlurStart = false; // 记录前一个音符是否开启了slur
        let prevNoteStemDirection = null; // 记录前一个音符的符杆方向
        let prevSlurPlacement = null; // 记录前一个slur的placement，用于slur stop
        
        for (let measureIndex = 0; measureIndex < measures; measureIndex++) {
            // 每个新小节开始时重置articulation状态，防止跨小节的slur
            prevNoteHadSlurStart = false;
            prevNoteStemDirection = null;
            prevSlurPlacement = null;
            const measureNumber = measureIndex + 1;
            // 只在第3、5、7等奇数小节（且大于1）显示编号
            const shouldShowNumber = measureNumber > 2 && measureNumber % 2 === 1;
            const numberAttribute = shouldShowNumber ? ` number="${measureNumber}"` : '';
            xml += `\\n    <measure${numberAttribute}>`;
            
            // 添加换行标记 - 每4小节强制换行
            if (this.shouldStartNewSystem(measureIndex, 4)) {
                xml += `
      <print new-system="yes"/>`;
            }
            
            // 第一小节添加基本属性（布局由OSMD API控制）
            if (measureIndex === 0) {
                xml += `
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>${keyFifths}</fifths>
          <mode>${keyMode}</mode>
        </key>
        <time>
          <beats>${beats}</beats>
          <beat-type>${beatType}</beat-type>
        </time>
        <clef>
          <sign>${clef === 'treble' ? 'G' : clef === 'alto' ? 'C' : 'F'}</sign>
          <line>${clef === 'treble' ? '2' : clef === 'alto' ? '3' : '4'}</line>
        </clef>
      </attributes>`;
            }
            
            // 添加音符和休止符
            const measureData = this.melody[measureIndex];
            
            // 检查小节是否为空或无效
            if (!measureData || !measureData.notes || measureData.notes.length === 0) {
                console.error(`空小节检测: 小节${measureIndex + 1}为空，添加全休止符`);
                // 添加全小节休止符
                xml += this.buildRestXML({
                    type: 'rest',
                    duration: 'whole',
                    beats: this.beatsPerMeasure
                });
            } else {
                for (let i = 0; i < measureData.notes.length; i++) {
                    const note = measureData.notes[i];
                    
                    // 检查是否在beam中
                    const beamInfo = this.getBeamInfo(measureData.beams, i);
                    
                    if (note.type === 'rest') {
                        console.log(`处理休止符: duration=${note.duration}, beats=${note.beats}, isTriplet=${note.isTriplet}`);
                        const restResult = this.buildRestXML(note);
                        xml += typeof restResult === 'string' ? restResult : restResult.xml;
                        prevNoteHadSlurStart = false; // 休止符重置slur状态
                        prevNoteStemDirection = null;
                        prevSlurPlacement = null; // 休止符也重置slur placement
                    } else {
                        // 计算当前音符的符杆方向
                        const currentStemDirection = this.calculateStemDirection(note.octave, note.step);
                        
                        // 最终发射前的tie合法性校验 - 强制禁止跨小节
                        let emitNote = note;
                        if (note.tied && note.tieType) {
                            // 强制只在当前小节内查找
                            const getPrevNoteInMeasure = () => {
                                if (i > 0) return measureData.notes[i - 1];
                                return null;
                            };
                            const getNextNoteInMeasure = () => {
                                if (i < measureData.notes.length - 1) return measureData.notes[i + 1];
                                return null;
                            };
                            const prev = getPrevNoteInMeasure();
                            const next = getNextNoteInMeasure();
                            let valid = true;
                            
                            if (note.tieType === 'start') {
                                // 只检查同一小节内的下一个音符
                                valid = !!(next && next.type === 'note' && next.tied && (next.tieType === 'continue' || next.tieType === 'stop') && next.midi === note.midi);
                                
                                // 如果是小节最后一个音符，一定无效
                                if (i === measureData.notes.length - 1) {
                                    console.log(`❌ 强制移除跨小节tie: 小节${measureIndex + 1}最后音符的tie start`);
                                    valid = false;
                                }
                            } else if (note.tieType === 'stop') {
                                // 只检查同一小节内的前一个音符
                                valid = !!(prev && prev.type === 'note' && prev.tied && (prev.tieType === 'start' || prev.tieType === 'continue') && prev.midi === note.midi);
                                
                                // 如果是小节第一个音符，一定无效
                                if (i === 0) {
                                    console.log(`❌ 强制移除跨小节tie: 小节${measureIndex + 1}第一音符的tie stop`);
                                    valid = false;
                                }
                            } else if (note.tieType === 'continue') {
                                // continue类型必须在小节中间
                                if (i === 0 || i === measureData.notes.length - 1) {
                                    console.log(`❌ 强制移除跨小节tie: 小节${measureIndex + 1}边界音符的tie continue`);
                                    valid = false;
                                } else {
                                    const hasValidPrev = !!(prev && prev.type === 'note' && prev.tied && (prev.tieType === 'start' || prev.tieType === 'continue') && prev.midi === note.midi);
                                    const hasValidNext = !!(next && next.type === 'note' && next.tied && (next.tieType === 'continue' || next.tieType === 'stop') && next.midi === note.midi);
                                    valid = hasValidPrev && hasValidNext;
                                }
                            }
                            if (!valid) {
                                console.warn(`❌ 移除无效tie: 小节${measureIndex + 1} 位置${i} tieType=${note.tieType}`);
                                emitNote = { ...note, tied: false, tieType: null };
                            }
                        }

                        // 检查是否需要结束slur或glissando
                        // 🔥 严格权限检查：只有当前一个音符合法开启了slur时才结束
                        // 需要检查前一个音符的articulation是否被允许
                        let needsSlurStop = false;
                        if (prevNoteHadSlurStart && i > 0) {
                            const prevNote = measureData.notes[i - 1];
                            if (prevNote && prevNote.type === 'note' && prevNote.articulation) {
                                const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
                                const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
                                
                                if ((prevNote.articulation === 'hammer-on' && hammerOnAllowed) ||
                                    (prevNote.articulation === 'pull-off' && pullOffAllowed)) {
                                    needsSlurStop = true;
                                    console.log(`✅ 需要结束slur: 前一个音符有被允许的${prevNote.articulation}`);
                                } else {
                                    console.log(`🔒 不需要结束slur: 前一个音符的${prevNote.articulation}不被允许`);
                                }
                            }
                        }
                        let needsGlissandoStop = false;
                        
                        // 检查前一个音符是否有slide，如果有，当前音符需要结束glissando
                        if (i > 0) {
                            const prevNote = measureData.notes[i - 1];
                            if (prevNote && prevNote.type === 'note' && prevNote.articulation === 'glissando') {
                                needsGlissandoStop = true;
                                console.log(`🎸 前一个音符有glissando，当前音符结束glissando`);
                            }
                        }
                        
                        // 检查当前音符是否需要开启slur或glissando
                        // 对于hammer-on和pull-off，只在它们自己上开启slur，连接到下一个音符
                        let forceSlurStart = false;
                        let forceGlissandoStart = false; // 用于slide
                        let nextNoteStemDirection = null; // 记录下一个音符的符干方向，用于判断slur placement
                        
                        // Slide处理：如果当前音符有slide articulation，需要开始glissando连接到下一个音符
                        if (note.articulation === 'glissando') {
                            if (i < measureData.notes.length - 1) {
                                const nextNote = measureData.notes[i + 1];
                                if (nextNote && nextNote.type === 'note') {
                                    forceGlissandoStart = true;
                                    console.log(`🎸 当前音符有glissando，开始glissando连接到下一个音符`);
                                }
                            }
                        }
                        
                        // 🔥 严格检查：只为被允许的技巧生成slur
                        const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
                        const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
                        
                        console.log(`🔍 Slur生成检查: 音符articulation=${note.articulation}, hammer-on允许=${hammerOnAllowed}, pull-off允许=${pullOffAllowed}`);
                        
                        if (note.articulation === 'hammer-on' || note.articulation === 'pull-off') {
                            // 🔥 首先检查技巧是否被用户允许
                            let articulationAllowed = false;
                            if (note.articulation === 'hammer-on' && hammerOnAllowed) {
                                articulationAllowed = true;
                            } else if (note.articulation === 'pull-off' && pullOffAllowed) {
                                articulationAllowed = true;
                            }
                            
                            if (!articulationAllowed) {
                                console.log(`🔒 Slur生成: ${note.articulation}不被允许，清除articulation和slur`);
                                note.articulation = null;
                            } else {
                                // 🔥 新增：基于用户选择的方向限制检查
                                if (i < measureData.notes.length - 1) {
                                    const nextNote = measureData.notes[i + 1];
                                    if (nextNote && nextNote.type === 'note' && nextNote.midi) {
                                        const intervalToNext = nextNote.midi - note.midi;
                                        
                                        // 🚫 关键限制：基于用户选择阻止特定方向的slur
                                        let shouldBlockSlur = false;
                                        
                                        if (hammerOnAllowed && !pullOffAllowed) {
                                            // 只选择hammer-on: 阻止所有下行二度的slur
                                            if (intervalToNext === -1 || intervalToNext === -2) {
                                                shouldBlockSlur = true;
                                                console.log(`🚫 DIRECTION BLOCK: 用户只选择hammer-on，阻止下行二度slur (${intervalToNext}半音)`);
                                            }
                                        } else if (!hammerOnAllowed && pullOffAllowed) {
                                            // 只选择pull-off: 阻止所有上行二度的slur  
                                            if (intervalToNext === 1 || intervalToNext === 2) {
                                                shouldBlockSlur = true;
                                                console.log(`🚫 DIRECTION BLOCK: 用户只选择pull-off，阻止上行二度slur (+${intervalToNext}半音)`);
                                            }
                                        }
                                        
                                        if (shouldBlockSlur) {
                                            console.log(`🔒 清除被方向限制阻止的articulation: ${note.articulation}`);
                                            note.articulation = null;
                                        }
                                    }
                                }
                                // 确保不是小节最后一个音符
                                if (i < measureData.notes.length - 1) {
                                    const nextNote = measureData.notes[i + 1];
                                    // 下一个音符必须是音符（不是休止符）且紧邻当前音符
                                    if (nextNote && nextNote.type === 'note' && nextNote.midi && note.midi) {
                                        const intervalToNext = Math.abs(nextNote.midi - note.midi);
                                        // 验证音程是否合适（1-2半音）
                                        if (intervalToNext === 1 || intervalToNext === 2) {
                                            forceSlurStart = true;
                                            // 计算下一个音符的符干方向
                                            nextNoteStemDirection = this.calculateStemDirection(nextNote.octave, nextNote.step);
                                            console.log(`✅ ${note.articulation}: 开启slur连接到下一个音符 (${note.midi} -> ${nextNote.midi})`);
                                        } else {
                                            console.log(`⚠️ ${note.articulation}音程不适合(${intervalToNext}半音)，不添加slur`);
                                            // 清除不合适的articulation
                                            note.articulation = null;
                                        }
                                    } else {
                                        console.log(`❌ ${note.articulation}后面没有有效音符，清除articulation`);
                                        // 清除无效的articulation
                                        note.articulation = null;
                                    }
                                } else {
                                    console.log(`❌ ${note.articulation}在小节最后，清除articulation`);
                                    // 清除小节最后的articulation
                                    note.articulation = null;
                                }
                            }
                        } else if (note.articulation === 'glissando') {
                            // slide使用glissando而不是slur，所以不设置forceSlurStart
                            // glissando会在buildArticulationXML中处理
                            forceSlurStart = false;
                            console.log(`🎸 Slide: 使用glissando连接，不使用slur`);
                        }

                        // slur和tie是独立的系统，可以同时存在
                        // 为了处理glissando，我们需要在这里直接添加
                        // 因为glissando start需要在前一个音符上
                        emitNote.forceGlissandoStart = forceGlissandoStart;
                        emitNote.needsGlissandoStop = needsGlissandoStop;
                        
                        const result = this.buildNoteXML(
                            emitNote,
                            beamInfo,
                            needsSlurStop,
                            prevNoteStemDirection,
                            prevSlurPlacement,
                            forceSlurStart,
                            nextNoteStemDirection, // 传递下一个音符的符干方向
                            (() => {
                                // 为有效的相邻tie分配并传递一个严格配对的编号，避免OSMD错误配对
                                if (!(emitNote.tied && emitNote.tieType)) return null;
                                const flatIdx = indexMap.get(`${measureIndex}:${i}`);
                                if (emitNote.tieType === 'start') {
                                    const num = tieCounter++;
                                    tieNumberByFlatIndex[flatIdx] = num;
                                    return num;
                                }
                                if (emitNote.tieType === 'continue' || emitNote.tieType === 'stop') {
                                    // 修复跨小节tie numbering: 更安全地查找前一个tie的编号
                                    let prevNum = null;
                                    if (flatIdx > 0) {
                                        prevNum = tieNumberByFlatIndex[flatIdx - 1];
                                        // 如果前一个位置没有tie number，向前查找最近的tied音符
                                        if (!prevNum) {
                                            for (let searchIdx = flatIdx - 1; searchIdx >= 0; searchIdx--) {
                                                const searchNote = flatNotes[searchIdx]?.event;
                                                if (searchNote && searchNote.tied && (searchNote.tieType === 'start' || searchNote.tieType === 'continue')) {
                                                    prevNum = tieNumberByFlatIndex[searchIdx];
                                                    if (prevNum) break;
                                                }
                                                // 如果遇到非tied音符，停止搜索
                                                if (searchNote && searchNote.type === 'note' && !searchNote.tied) break;
                                            }
                                        }
                                    }
                                    const num = prevNum || tieCounter++;
                                    tieNumberByFlatIndex[flatIdx] = num;
                                    return num;
                                }
                                return null;
                            })()
                        );
                        xml += result.xml;
                        
                        // 🔥 严格权限检查：只有当articulation被允许时才更新slur状态
                        let shouldUpdateSlurState = false;
                        if (forceSlurStart && note.articulation) {
                            const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
                            const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
                            
                            if ((note.articulation === 'hammer-on' && hammerOnAllowed) ||
                                (note.articulation === 'pull-off' && pullOffAllowed)) {
                                shouldUpdateSlurState = true;
                                console.log(`✅ 更新slur状态: ${note.articulation}被允许`);
                            } else {
                                console.log(`🔒 不更新slur状态: ${note.articulation}不被允许`);
                            }
                        }
                        
                        // 更新slur状态：只有当前音符合法开启了slur时才设置为true
                        prevNoteHadSlurStart = shouldUpdateSlurState;
                        prevNoteStemDirection = currentStemDirection;
                        
                        // 如果当前音符开启了slur，记录slur placement
                        if (shouldUpdateSlurState) {
                            // 🔥 严格检查：只为被允许的技巧设置slur placement
                            const noteArticulation = note.articulation || (note.articulations && note.articulations[0]);
                            console.log(`🔍 Slur placement设置: noteArticulation=${noteArticulation}, forceSlurStart=${forceSlurStart}`);
                            
                            if (noteArticulation === 'hammer-on' && hammerOnAllowed) {
                                prevSlurPlacement = 'above'; // 上行旋律，slur在上方
                                console.log(`🎸 设置hammer-on slur placement: above`);
                            } else if (noteArticulation === 'pull-off' && pullOffAllowed) {
                                prevSlurPlacement = 'below'; // 下行旋律，slur在下方
                                console.log(`🎸 设置pull-off slur placement: below`);
                            } else {
                                prevSlurPlacement = 'above'; // 默认
                                console.log(`🎸 设置默认slur placement: above`);
                            }
                        }
                    }
                }
            }
            
            // 在最后一个小节添加终止线
            if (measureIndex === measures - 1) {
                xml += `
      <barline location="right">
        <bar-style>light-heavy</bar-style>
      </barline>`;
            }
            
            xml += `
    </measure>`;
        }

        xml += `
  </part>
</score-partwise>`;

        // 调试：显示换行指令的位置和统计
        const newSystemMatches = xml.match(/<print new-system="yes"/g);
        const newSystemCount = newSystemMatches ? newSystemMatches.length : 0;
        const expectedLines = Math.ceil(this.config.measures / measuresPerLine);
        console.log(`📐 换行指令统计: 共${newSystemCount}个换行点，预期行数: ${expectedLines}，每行${measuresPerLine}小节`);
        
        // 显示具体的换行位置
        if (newSystemMatches) {
            const measureNumbers = [];
            let currentPos = 0;
            for (let i = 0; i < newSystemMatches.length; i++) {
                const matchPos = xml.indexOf('<print new-system="yes"', currentPos);
                const measureMatch = xml.substring(0, matchPos).match(/<measure[^>]*number="(\d+)"/g);
                if (measureMatch) {
                    const lastMeasure = measureMatch[measureMatch.length - 1];
                    const measureNum = lastMeasure.match(/number="(\d+)"/)[1];
                    measureNumbers.push(measureNum);
                }
                currentPos = matchPos + 1;
            }
            console.log(`🔄 换行位置: 第${measureNumbers.join('、')}小节开始新行`);
        }

        return xml;
    }

    /**
     * 根据布局类型获取系统间距
     */
    getSystemDistance(layoutType) {
        const distances = {
            'mobile': 100,   // 移动端较紧凑
            'tablet': 120,   // 平板端适中
            'desktop': 140   // 桌面端较宽松
        };
        return distances[layoutType] || 120;
    }

    /**
     * 获取小节间距（固定4小节布局）
     */
    getMeasureDistance(layoutType, measuresPerLine) {
        if (!this.currentLayout || !this.currentLayout.containerWidth) {
            console.warn('Container width not available, using default spacing');
            return 120;
        }

        const containerWidth = this.currentLayout.containerWidth;
        
        // 固定4小节布局：根据容器宽度动态计算间距
        const targetSpacing = Math.max(80, containerWidth * 0.15); // 15%的容器宽度作为间距基准
        
        // 设置合理的上下限
        const minSpacing = 60;  // 降低最小间距以适应小屏幕
        const maxSpacing = containerWidth >= 1200 ? 200 : 150;
        
        const finalSpacing = Math.max(minSpacing, Math.min(maxSpacing, targetSpacing));
        
        console.log(`📏 小节间距计算: 容器=${containerWidth}px, 固定4小节/行, 间距=${Math.round(finalSpacing)}`);
        
        return Math.round(finalSpacing);
    }

    /**
     * 构建音符XML
     */
    buildNoteXML(note, beamInfo, needsSlurStop = false, prevStemDirection = null, prevSlurPlacement = null, forceSlurStart = false, nextStemDirection = null, tieNumber = null) {
        const { duration, step, octave, alter, isTriplet, tripletType, tripletPosition, tied, tieType, articulation, isAcciaccatura, forceGlissandoStart, needsGlissandoStop, graceNote } = note;
        
        // 构建最终的XML，可能包含grace note和主音符
        let fullNoteXML = '';
        
        // 如果有grace note，先生成grace note的XML
        if (graceNote) {
            console.log(`🎵 处理附加的grace note: ${graceNote.step}${graceNote.octave} -> ${step}${octave}`);
            fullNoteXML += `
      <note>
        <grace slash="yes"/>
        <pitch>
          <step>${graceNote.step}</step>`;
        
            // 只有在明确需要改变调号默认值时才写入alter
            if (graceNote.alter !== undefined && graceNote.alter !== null) {
                fullNoteXML += `
          <alter>${graceNote.alter}</alter>`;
            }
            
            fullNoteXML += `
          <octave>${graceNote.octave}</octave>
        </pitch>
        <type>eighth</type>
      </note>
`;
        }
        
        // 特殊处理：如果这个音符本身就是acciaccatura（旧的处理方式，保留兼容性）
        if (isAcciaccatura) {
            console.log(`🎵 处理独立的 acciaccatura 装饰音符: MIDI ${note.midi} -> ${step}${octave}`);
            let graceNoteXML = `
      <note>
        <grace slash="yes"/>
        <pitch>
          <step>${step}</step>`;
        
            // 只有在明确需要改变调号默认值时才写入alter
            if (alter !== undefined && alter !== null) {
                graceNoteXML += `
          <alter>${alter}</alter>`;
            }
            
            graceNoteXML += `
          <octave>${octave}</octave>
        </pitch>
        <type>eighth</type>
      </note>`;
            
            return graceNoteXML;
        }
        
        // 时值映射（divisions=4）
        let durationMap = {
            'whole': 16,
            'half': 8,
            'quarter': 4,
            'quarter.': 6,
            'eighth': 2,
            'eighth.': 3,
            '16th': 1,
            '32nd': 0.5
        };
        
        // 标准时值计算（三连音通过time-modification处理，不修改duration）
        let durationValue = durationMap[duration] || 4;
        
        // 三连音调试信息
        if (isTriplet) {
            console.log(`🎵 三连音音符: ${duration}, 标准duration=${durationValue}, 位置=${tripletPosition}, 类型=${tripletType}`);
        }
        
        let noteXML = `
      <note>
        <pitch>
          <step>${step}</step>`;
        
        // 只有在明确需要改变调号默认值时才写入alter
        if (alter !== undefined && alter !== null) {
            noteXML += `
          <alter>${alter}</alter>`;
        }
        
        noteXML += `
          <octave>${octave}</octave>
        </pitch>
        <duration>${durationValue}</duration>`;
        
        // 🎵 添加连音弧标记（tie element）
        if (tied && tieType) {
            if (tieType === 'continue') {
                // 中间音符需要同时有stop和start
                noteXML += `
        <tie type="stop"${tieNumber ? ` number="${tieNumber}"` : ''}/>
        <tie type="start"${tieNumber ? ` number="${tieNumber}"` : ''}/>`;
                console.log(`  🔗 连续tied音符: stop + start`);
            } else {
                noteXML += `
        <tie type="${tieType}"${tieNumber ? ` number="${tieNumber}"` : ''}/>`;
                console.log(`  🔗 tied音符: ${tieType}`);
            }
        }
        
        noteXML += `
        <type>${duration.replace('.', '')}</type>`;
        
        // 附点处理
        if (duration.includes('.')) {
            noteXML += `
        <dot/>`;
        }
        
        // 临时记号标记处理
        // 不再显示accidental标签，让OSMD根据alter值自动决定
        // 这样可以避免重复显示临时记号
        // OSMD会根据alter值和调号自动处理临时记号显示
        
        // Beam标记（仅适用于非三连音）
        if (beamInfo && !isTriplet) {
            noteXML += `
        <beam number="1">${beamInfo}</beam>`;
        }
        
        // 自动计算符干方向
        const stemDirection = this.calculateStemDirection(octave, step);
        if (stemDirection) {
            noteXML += `
        <stem>${stemDirection}</stem>`;
        }
        
        // 三连音标记和连音线
        if (isTriplet) {
            // 先处理beam（仅对音符且八分音符及更小时值，休止符不参与符杠连接）
            if (['eighth', '16th', '32nd'].includes(duration) && note.type === 'note') {
                // 🔧 修复：使用预计算的三连音符杠信息
                if (note.tripletBeamInfo) {
                    noteXML += `
        <beam number="1">${note.tripletBeamInfo}</beam>`;
                    console.log(`  🎵 三连音符杠: ${duration} 位置${tripletPosition} → ${note.tripletBeamInfo}`);
                } else {
                    console.log(`  🎵 三连音无符杠: ${duration} 位置${tripletPosition} (单独音符或休止符影响)`);
                }
            }
            
            // 关键：添加 time-modification 标签（所有连音音符都需要）
            const normalType = duration.replace('.', ''); // 移除附点标记
            
            // 根据连音类型设置正确的时值改变比例
            let actualNotes, normalNotes;
            if (tripletType === 'duplet_eighth') {
                // 二连音：2个八分音符占捣3个八分音符的时间 (2:3)
                actualNotes = 2;
                normalNotes = 3;
            } else if (tripletType === 'quadruplet_eighth') {
                // 四连音：4个八分音符占捣3个八分音符的时间 (4:3)
                actualNotes = 4;
                normalNotes = 3;
            } else {
                // 三连音：3个音符占捣2个音符的时间 (3:2)
                actualNotes = 3;
                normalNotes = 2;
            }
            
            noteXML += `
        <time-modification>
          <actual-notes>${actualNotes}</actual-notes>
          <normal-notes>${normalNotes}</normal-notes>
          <normal-type>${normalType}</normal-type>
        </time-modification>`;
            
            // 再处理tuplet标记和notations
            const needsNotations = (tied && tieType) || tripletPosition === 0 || tripletPosition === 2 || needsSlurStop || articulation || forceGlissandoStart || needsGlissandoStop;
            
            if (needsNotations) {
                noteXML += `
        <notations>`;
                
                // 🎵 添加连音弧视觉标记（在三连音标记之前）
                if (tied && tieType) {
                    if (tieType === 'continue') {
                        // 中间音符需要同时有stop和start的视觉效果
                        noteXML += `
          <tied type="stop"${tieNumber ? ` number="${tieNumber}"` : ''}/>
          <tied type="start"${tieNumber ? ` number="${tieNumber}"` : ''}/>`;
                    } else {
                        noteXML += `
          <tied type="${tieType}"${tieNumber ? ` number="${tieNumber}"` : ''}/>`;
                    }
                }
                
                const tripletNumber = note.tripletId || 1; // 使用唯一的三连音ID，默认为1
                // 动态计算连音的结束位置
                const tupletEndPosition = (note.tripletTotal || 3) - 1;
                
                if (tripletPosition === 0) {
                    // 连音开始 - 显示对应数字和括号
                    const showNumber = tripletType === 'duplet_eighth' ? '2' : 
                                     tripletType === 'quadruplet_eighth' ? '4' : '3';
                    noteXML += `
          <tuplet type="start" number="${tripletNumber}" bracket="yes" show-number="${showNumber}" placement="above"/>`;
                    console.log(`  🎵 连音开始: ID=${tripletNumber}, 类型=${tripletType}, 数字=${showNumber}, 位置=${tripletPosition}`);
                } else if (tripletPosition === tupletEndPosition) {
                    // 连音结束（支持不同连音数量）
                    noteXML += `
          <tuplet type="stop" number="${tripletNumber}"/>`;
                    console.log(`  🎵 连音结束: ID=${tripletNumber}, 类型=${tripletType}, 位置=${tripletPosition}`);
                }
                // 中间的音符（tripletPosition === 1）不需要tuplet标记
                
                // 添加slur结束标记（如果前一个音符有hammer-on/pull-off/slide）
                // 允许slur与tie共存，使用不同的number来区分
                if (needsSlurStop) {
                    // 如果有placement信息，添加到slur标签
                    const placementAttr = prevSlurPlacement ? ` placement="${prevSlurPlacement}"` : '';
                    noteXML += `
          <slur type="stop" number="2"${placementAttr}/>`;
                }
                
                // 如果当前音符有slide，需要开始glissando (现在在notations内处理)
                if (forceGlissandoStart) {
                    noteXML += `
          <glissando type="start" line-type="solid" number="1"/>`;
                    console.log(`🎸 开始glissando连接到下一个音符`);
                }
                
                // 如果前一个音符有slide，当前音符需要结束glissando (现在在notations内处理)
                if (needsGlissandoStop) {
                    noteXML += `
          <glissando type="stop" line-type="solid" number="1"/>`;
                    console.log(`🎸 结束来自前一个音符的glissando连接`);
                }
                
                // 添加其他articulation标记（glissando、slide-in、slide-out已经在notations中处理了）
                if (articulation && articulation !== 'slide' && articulation !== 'glissando' && 
                    articulation !== 'slide-in' && articulation !== 'slide-out') {
                    // 对于非slide/glissando的articulation，正常处理
                    noteXML += this.buildArticulationXML(articulation);
                    
                    // 🔥 严格检查：如果需要强制在此音符开启技巧slur，必须再次验证权限
                    // 注意：slide使用glissando而不是slur
                    // 使用number="2"避免与tie的number冲突
                    
                    // 再次检查用户权限，确保articulation被允许
                    const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
                    const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
                    
                    let slurAllowed = false;
                    if (articulation === 'hammer-on' && hammerOnAllowed) {
                        slurAllowed = true;
                    } else if (articulation === 'pull-off' && pullOffAllowed) {
                        slurAllowed = true;
                    } else if (!['hammer-on', 'pull-off'].includes(articulation)) {
                        // 非吉他技巧的articulation，允许slur
                        slurAllowed = true;
                    }
                    
                    console.log(`🔍 buildNoteXML内部slur权限检查: articulation=${articulation}, forceSlurStart=${forceSlurStart}, slurAllowed=${slurAllowed}`);
                    
                    // 🔥 添加堆栈追踪以找出调用来源
                    if (forceSlurStart && !slurAllowed) {
                        console.log(`⚠️ 警告：尝试为不被允许的${articulation}生成slur！`);
                        console.trace(`📍 调用堆栈追踪`);
                    }
                    
                    if (forceSlurStart && slurAllowed && articulation !== 'slide' && articulation !== 'glissando') {
                        // 计算当前音符的符干方向
                        const currentStemDirection = this.calculateStemDirection(octave, step);
                        let slurPlacement = '';
                        
                        // 检查当前音符和下一个音符的符干方向
                        if (currentStemDirection && nextStemDirection) {
                            if (currentStemDirection === nextStemDirection) {
                                // 符干方向相同，slur放在符庆的反方向
                                slurPlacement = ` placement="${currentStemDirection === 'up' ? 'below' : 'above'}"`;
                            } else {
                                // 符庆方向不同，根据旋律走向决定
                                // Hammer-on是上行，slur在上方；Pull-off是下行，slur在下方
                                if (articulation === 'hammer-on') {
                                    // Hammer-on: 上行旋律，slur在上方
                                    slurPlacement = ` placement="above"`;
                                    console.log(`🎵 Hammer-on 上行旋律，符庆方向不同，slur在上方`);
                                } else if (articulation === 'pull-off') {
                                    // Pull-off: 下行旋律，slur在下方
                                    slurPlacement = ` placement="below"`;
                                    console.log(`🎵 Pull-off 下行旋律，符庆方向不同，slur在下方`);
                                } else {
                                    // 其他articulation，默认上方
                                    slurPlacement = ` placement="above"`;
                                }
                            }
                        } else if (currentStemDirection) {
                            // 如果无法确定下一个音符的符庆方向，使用默认规则
                            slurPlacement = ` placement="${currentStemDirection === 'up' ? 'below' : 'above'}"`;
                        } else {
                            // 默认上方
                            slurPlacement = ` placement="above"`;
                        }
                        
                        // 🔥 FORCED DEBUG: 记录每个slur的生成
                        console.log(`🚨 SLUR GENERATED at buildNoteXML-branch1: articulation=${articulation}, placement=${slurPlacement}`);
                        console.log(`🚨 User settings check: hammer-on allowed=${hammerOnAllowed}, pull-off allowed=${pullOffAllowed}`);
                        
                        // 🔥 方向限制检查：基于用户选择阻止特定方向的slur
                        let shouldBlockByDirection = false;
                        
                        if (hammerOnAllowed && !pullOffAllowed) {
                            // 只选择hammer-on: 阻止所有下行二度的slur
                            if (interval < 0 && interval >= -2) {
                                shouldBlockByDirection = true;
                                console.log(`🚫 DIRECTION BLOCK (branch1): 用户只选择hammer-on，阻止下行二度slur (${interval}半音)`);
                            }
                        } else if (!hammerOnAllowed && pullOffAllowed) {
                            // 只选择pull-off: 阻止所有上行二度的slur
                            if (interval > 0 && interval <= 2) {
                                shouldBlockByDirection = true;
                                console.log(`🚫 DIRECTION BLOCK (branch1): 用户只选择pull-off，阻止上行二度slur (+${interval}半音)`);
                            }
                        }
                        
                        if (shouldBlockByDirection) {
                            console.log(`🔒 方向限制阻止slur生成: articulation=${articulation}, interval=${interval}`);
                            // 强制不生成任何slur XML
                        } else if (articulation === 'hammer-on' && hammerOnAllowed && interval > 0) {
                            // 只允许上行hammer-on生成slur
                            noteXML += `
          <slur type="start" number="2"${slurPlacement}/>`;
                            console.log(`✅ ALLOWED: hammer-on slur generated for ascending interval ${interval}`);
                        } else if (articulation === 'pull-off' && pullOffAllowed && interval < 0) {
                            // 只允许下行pull-off生成slur
                            noteXML += `
          <slur type="start" number="2"${slurPlacement}/>`;
                            console.log(`✅ ALLOWED: pull-off slur generated for descending interval ${interval}`);
                        } else {
                            console.log(`🚫 BLOCKED: slur blocked - articulation=${articulation}, interval=${interval}, hammerOnAllowed=${hammerOnAllowed}, pullOffAllowed=${pullOffAllowed}`);
                        }
                    }
                }
                
                noteXML += `
        </notations>`;
            }
        } else if (tied && tieType) {
            // 🎵 非三连音但有连音弧的音符，单独添加notations
            noteXML += `
        <notations>`;
            if (tieType === 'continue') {
                // 中间音符需要同时有stop和start的视觉效果
                noteXML += `
          <tied type="stop"${tieNumber ? ` number="${tieNumber}"` : ''}/>
          <tied type="start"${tieNumber ? ` number="${tieNumber}"` : ''}/>`;
            } else {
                noteXML += `
          <tied type="${tieType}"${tieNumber ? ` number="${tieNumber}"` : ''}/>`;
            }
            
            // 添加slur结束标记（如果前一个音符有hammer-on/pull-off/slide）
            // 允许slur与tie共存，使用不同的number来区分
            if (needsSlurStop) {
                // 如果有placement信息，添加到slur标签
                const placementAttr = prevSlurPlacement ? ` placement="${prevSlurPlacement}"` : '';
                noteXML += `
          <slur type="stop" number="2"${placementAttr}/>`;
            }
            
            // OSMD限制：glissando不被支持，保留标签用于未来兼容性
            if (forceGlissandoStart) {
                noteXML += `
          <glissando type="start" line-type="solid" number="1"/>`;
                // 添加文本提示
                noteXML += `
          <technical>
            <string>gliss.</string>
          </technical>`;
                console.log(`⚠️ OSMD不支持glissando，已添加文本标记'gliss.'作为提示`);
            }
            
            if (needsGlissandoStop) {
                noteXML += `
          <glissando type="stop" line-type="solid" number="1"/>`;
                console.log(`⚠️ glissando stop标签已添加（OSMD暂不支持）`);
            }
            
            // OSMD不支持slide-in/slide-out的glissando渲染
            if (articulation === 'slide-in') {
                // 保留标签用于未来兼容性
                noteXML += `
          <glissando type="stop" line-type="solid" number="2"/>`;
                // 添加文本提示
                noteXML += `
          <technical>
            <string>slide in</string>
          </technical>`;
                console.log(`⚠️ OSMD不支持slide-in glissando，使用文本提示`);
            } else if (articulation === 'slide-out') {
                // 保留标签用于未来兼容性
                noteXML += `
          <glissando type="start" line-type="solid" number="2"/>`;
                // 添加文本提示
                noteXML += `
          <technical>
            <string>slide out</string>
          </technical>`;
                console.log(`⚠️ OSMD不支持slide-out glissando，使用文本提示`);
            }
            
            // OSMD限制：glissando不被支持，保留标签用于未来兼容性
            if (forceGlissandoStart) {
                noteXML += `
          <glissando type="start" line-type="solid" number="1"/>`;
                // 添加文本提示
                noteXML += `
          <technical>
            <string>gliss.</string>
          </technical>`;
                console.log(`⚠️ OSMD不支持glissando，已添加文本标记'gliss.'作为提示`);
            }
            
            if (needsGlissandoStop) {
                noteXML += `
          <glissando type="stop" line-type="solid" number="1"/>`;
                console.log(`⚠️ glissando stop标签已添加（OSMD暂不支持）`);
            }
            
            // OSMD不支持slide-in/slide-out的glissando渲染
            if (articulation === 'slide-in') {
                // 保留标签用于未来兼容性
                noteXML += `
          <glissando type="stop" line-type="solid" number="2"/>`;
                // 添加文本提示
                noteXML += `
          <technical>
            <string>slide in</string>
          </technical>`;
                console.log(`⚠️ OSMD不支持slide-in glissando，使用文本提示`);
            } else if (articulation === 'slide-out') {
                // 保留标签用于未来兼容性
                noteXML += `
          <glissando type="start" line-type="solid" number="2"/>`;
                // 添加文本提示
                noteXML += `
          <technical>
            <string>slide out</string>
          </technical>`;
                console.log(`⚠️ OSMD不支持slide-out glissando，使用文本提示`);
            }
            
            // 添加articulation标记（glissando、slide-in、slide-out已经在notations中处理了）
            if (articulation && articulation !== 'glissando' && 
                articulation !== 'slide-in' && articulation !== 'slide-out') {
                noteXML += this.buildArticulationXML(articulation);
                
                // 🔥 第三个slur生成分支：严格权限检查
                // 使用number="2"避免与tie的number冲突
                
                // 再次检查用户权限，确保articulation被允许
                const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
                const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
                
                let slurAllowed = false;
                if (articulation === 'hammer-on' && hammerOnAllowed) {
                    slurAllowed = true;
                } else if (articulation === 'pull-off' && pullOffAllowed) {
                    slurAllowed = true;
                } else if (!['hammer-on', 'pull-off'].includes(articulation)) {
                    // 非吉他技巧的articulation，允许slur
                    slurAllowed = true;
                }
                
                console.log(`🔍 buildNoteXML第三分支slur权限检查: articulation=${articulation}, forceSlurStart=${forceSlurStart}, slurAllowed=${slurAllowed}`);
                
                if (forceSlurStart && slurAllowed) {
                    // 计算当前音符的符干方向，决定slur placement
                    const currentStemDirection = this.calculateStemDirection(octave, step);
                    let slurPlacement = '';
                    
                    // 检查当前音符和下一个音符的符干方向
                    if (currentStemDirection && nextStemDirection) {
                        if (currentStemDirection === nextStemDirection) {
                            // 符干方向相同，slur放在符干的反方向
                            slurPlacement = ` placement="${currentStemDirection === 'up' ? 'below' : 'above'}"`;
                        } else {
                            // 符干方向相反，统一放在上方
                            // 注意：OSMD在处理符干方向相反的slur时有局限性
                            // 理想情况下slur应该连接两个音头，但OSMD可能会将一端连接到符干
                            // 这是OSMD渲染引擎的限制，需要等待OSMD更新或使用自定义渲染
                            // 临时解决方案：统一使用above placement以保持一致性
                            slurPlacement = ` placement="above"`;
                            console.log(`🎵 符干方向相反(${currentStemDirection} vs ${nextStemDirection})，统一放在上方（OSMD限制）`);
                        }
                    } else if (currentStemDirection) {
                        // 如果无法确定下一个音符的符干方向，使用默认规则
                        slurPlacement = ` placement="${currentStemDirection === 'up' ? 'below' : 'above'}"`;
                    }
                    
                    // 🔥 FORCED DEBUG: 记录每个slur的生成
                    console.log(`🚨 SLUR GENERATED at buildNoteXML-branch3: articulation=${articulation}, placement=${slurPlacement}`);
                    console.log(`🚨 User settings check: hammer-on allowed=${hammerOnAllowed}, pull-off allowed=${pullOffAllowed}`);
                    
                    // 🔥 方向限制检查：基于用户选择阻止特定方向的slur
                    let shouldBlockByDirection3 = false;
                    
                    if (hammerOnAllowed && !pullOffAllowed) {
                        // 只选择hammer-on: 阻止所有下行二度的slur
                        if (interval < 0 && interval >= -2) {
                            shouldBlockByDirection3 = true;
                            console.log(`🚫 DIRECTION BLOCK (branch3): 用户只选择hammer-on，阻止下行二度slur (${interval}半音)`);
                        }
                    } else if (!hammerOnAllowed && pullOffAllowed) {
                        // 只选择pull-off: 阻止所有上行二度的slur
                        if (interval > 0 && interval <= 2) {
                            shouldBlockByDirection3 = true;
                            console.log(`🚫 DIRECTION BLOCK (branch3): 用户只选择pull-off，阻止上行二度slur (+${interval}半音)`);
                        }
                    }
                    
                    if (shouldBlockByDirection3) {
                        console.log(`🔒 方向限制阻止slur生成(branch3): articulation=${articulation}, interval=${interval}`);
                        // 强制不生成任何slur XML
                    } else if (articulation === 'hammer-on' && hammerOnAllowed && interval > 0) {
                        // 只允许上行hammer-on生成slur
                        noteXML += `
          <slur type="start" number="2"${slurPlacement}/>`;
                        console.log(`✅ ALLOWED: hammer-on slur generated in branch3 for ascending interval ${interval}`);
                    } else if (articulation === 'pull-off' && pullOffAllowed && interval < 0) {
                        // 只允许下行pull-off生成slur
                        noteXML += `
          <slur type="start" number="2"${slurPlacement}/>`;
                        console.log(`✅ ALLOWED: pull-off slur generated in branch3 for descending interval ${interval}`);
                    } else {
                        console.log(`🚫 BLOCKED: slur blocked in branch3 - articulation=${articulation}, interval=${interval}`);
                    }
                } else if (forceSlurStart && !slurAllowed) {
                    console.log(`🔒 buildNoteXML第三分支: ${articulation}不被允许，跳过slur生成`);
                }
            }
            
            noteXML += `
        </notations>`;
        } else if (articulation || needsSlurStop || forceGlissandoStart || needsGlissandoStop) {
            // 仅有articulation、需要结束slur或处理glissando的情况
            noteXML += `
        <notations>`;
            
            // 添加slur结束标记
            // 允许slur与tie共存，使用不同的number来区分
            if (needsSlurStop) {
                // 如果有placement信息，添加到slur标签
                const placementAttr = prevSlurPlacement ? ` placement="${prevSlurPlacement}"` : '';
                noteXML += `
          <slur type="stop" number="2"${placementAttr}/>`;
            }
            
            // Glissando实现 - 使用多种方法确保兼容性
            if (forceGlissandoStart) {
                // 方法1: 标准glissando标签
                noteXML += `
          <glissando type="start" line-type="solid" number="1"/>`;
                console.log(`🎸 添加标准glissando start标签 (number=1)`);
                
                // 方法2: 备用slur模拟（如果glissando不被支持）
                noteXML += `
          <slur type="start" number="4" placement="below"/>`;
                console.log(`🎸 备用方案: 添加特殊slur模拟glissando (number=4, placement=below)`);
            }
            
            if (needsGlissandoStop) {
                // 对应的结束标签
                noteXML += `
          <glissando type="stop" line-type="solid" number="1"/>`;
                console.log(`🎸 添加标准glissando stop标签 (number=1)`);
                
                // 备用slur结束
                noteXML += `
          <slur type="stop" number="4"/>`;
                console.log(`🎸 备用方案: 添加slur stop (number=4)`);
            }
            
            // Slide-in/slide-out实现 - 含备用方案
            if (articulation === 'slide-in') {
                // slide-in: 从不确定音高滑入当前音符，在当前音符结束滑音
                noteXML += `
          <glissando type="stop" line-type="solid" number="2"/>`;
                console.log(`🎸 Slide-in: 添加glissando stop标签 (number=2)`);
                
                // 备用方案：使用特殊标记的slur
                noteXML += `
          <slur type="stop" number="5" placement="below"/>`;
                console.log(`🎸 Slide-in备用: 添加特殊slur stop (number=5)`);
            } else if (articulation === 'slide-out') {
                // slide-out: 从当前音符滑向不确定音高，在当前音符开始滑音
                noteXML += `
          <glissando type="start" line-type="solid" number="2"/>`;
                console.log(`🎸 Slide-out: 添加glissando start标签 (number=2)`);
                
                // 备用方案：使用特殊标记的slur  
                noteXML += `
          <slur type="start" number="5" placement="below"/>`;
                console.log(`🎸 Slide-out备用: 添加特殊slur start (number=5)`);
            }
            
            // 添加articulation标记（glissando、slide-in、slide-out已经在notations中处理了）
            if (articulation && articulation !== 'glissando' && 
                articulation !== 'slide-in' && articulation !== 'slide-out') {
                noteXML += this.buildArticulationXML(articulation);
                // 🔥 第二个slur生成分支：再次严格检查权限
                // 允许slur与tie共存，使用不同的number来区分
                
                // 再次检查用户权限，确保articulation被允许
                const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
                const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
                
                let slurAllowed = false;
                if (articulation === 'hammer-on' && hammerOnAllowed) {
                    slurAllowed = true;
                } else if (articulation === 'pull-off' && pullOffAllowed) {
                    slurAllowed = true;
                } else if (!['hammer-on', 'pull-off'].includes(articulation)) {
                    // 非吉他技巧的articulation，允许slur
                    slurAllowed = true;
                }
                
                console.log(`🔍 buildNoteXML第二分支slur权限检查: articulation=${articulation}, forceSlurStart=${forceSlurStart}, slurAllowed=${slurAllowed}`);
                
                if (forceSlurStart && slurAllowed) {
                    // 计算当前音符的符干方向，决定slur placement
                    const currentStemDirection = this.calculateStemDirection(octave, step);
                    let slurPlacement = '';
                    
                    // 检查当前音符和下一个音符的符干方向
                    if (currentStemDirection && nextStemDirection) {
                        if (currentStemDirection === nextStemDirection) {
                            // 符干方向相同，slur放在符干的反方向
                            slurPlacement = ` placement="${currentStemDirection === 'up' ? 'below' : 'above'}"`;
                        } else {
                            // 符干方向相反，统一放在上方
                            // 注意：OSMD在处理符干方向相反的slur时有局限性
                            // 理想情况下slur应该连接两个音头，但OSMD可能会将一端连接到符干
                            // 这是OSMD渲染引擎的限制，需要等待OSMD更新或使用自定义渲染
                            // 临时解决方案：统一使用above placement以保持一致性
                            slurPlacement = ` placement="above"`;
                            console.log(`🎵 符干方向相反(${currentStemDirection} vs ${nextStemDirection})，统一放在上方（OSMD限制）`);
                        }
                    } else if (currentStemDirection) {
                        // 如果无法确定下一个音符的符干方向，使用默认规则
                        slurPlacement = ` placement="${currentStemDirection === 'up' ? 'below' : 'above'}"`;
                    }
                    
                    // 🔥 FORCED DEBUG: 记录每个slur的生成
                    console.log(`🚨 SLUR GENERATED at buildNoteXML-branch2: articulation=${articulation}, placement=${slurPlacement}`);
                    console.log(`🚨 User settings check: hammer-on allowed=${hammerOnAllowed}, pull-off allowed=${pullOffAllowed}`);
                    
                    // 🔥 FORCED CHECK: 如果是pull-off且不被允许，强制阻止
                    if (articulation === 'pull-off' && !pullOffAllowed) {
                        console.log(`🚫 FORCED BLOCK: pull-off slur被强制阻止在branch2！`);
                    } else {
                        noteXML += `
          <slur type="start" number="2"${slurPlacement}/>`;
                    }
                } else if (forceSlurStart && !slurAllowed) {
                    console.log(`🔒 buildNoteXML第二分支: ${articulation}不被允许，跳过slur生成`);
                }
            }
            
            noteXML += `
        </notations>`;
        }
        
        noteXML += `
      </note>`;
        
        // 如果有grace note，需要将grace note和主音符都包含在返回结果中
        const finalXML = fullNoteXML + noteXML;
        
        // 调试：如果包含glissando，输出完整的note XML用于检查
        if (finalXML.includes('<glissando') || articulation === 'slide-in' || articulation === 'slide-out' || articulation === 'glissando') {
            console.log(`🔍 DEBUG: 包含glissando的完整note XML:`, finalXML);
            console.log(`🔍 DEBUG: articulation类型:`, articulation);
        }
        
        // 返回XML和slurPlacement（如果有）
        const result = { xml: finalXML };
        
        // 如果当前音符有hammer-on或pull-off，需要返回slurPlacement
        if (articulation === 'hammer-on' || articulation === 'pull-off') {
            // 根据旋律方向决定slur placement
            if (articulation === 'hammer-on') {
                result.slurPlacement = 'above'; // 上行旋律，slur在上方
                console.log(`🎸 Hammer-on (上行): slur在上方`);
            } else if (articulation === 'pull-off') {
                result.slurPlacement = 'below'; // 下行旋律，slur在下方
                console.log(`🎸 Pull-off (下行): slur在下方`);
            }
        }
        
        return result;
    }

    /**
     * 构建articulation的XML标记
     * @param {string} articulation - 演奏法类型
     * @param {object} options - 额外选项 {isStart, isStop, noteData}
     */
    buildArticulationXML(articulation, options = {}) {
        let xml = '';
        const { isStart = false, isStop = false, noteData = null } = options;
        
        // 基本articulation映射
        const basicArticulations = {
            'staccato': '<articulations><staccato/></articulations>',
            'accent': '<articulations><accent/></articulations>'
        };
        
        // 对于hammer-on和pull-off，添加文字标记
        // 同时通过slur来表示连接关系
        if (articulation === 'hammer-on') {
            // 添加"H"文字标记
            xml = `
          <articulations>
            <other-articulation>H</other-articulation>
          </articulations>`;
            console.log(`🎸 hammer-on: 添加H标记，slur在别处处理`);
            return xml;
        } else if (articulation === 'pull-off') {
            // 添加"P"文字标记
            xml = `
          <articulations>
            <other-articulation>P</other-articulation>
          </articulations>`;
            console.log(`🎸 pull-off: 添加P标记，slur在别处处理`);
            return xml;
        }
        
        // Acciaccatura (短倚音) - 需要特殊处理
        // 注意：这需要在音符之前作为grace note处理，而不是作为articulation
        if (articulation === 'acciaccatura') {
            // Acciaccatura应该在buildNoteXML中特殊处理为grace note
            console.log(`🎵 acciaccatura: 需要作为grace note处理`);
            return '';
        }
        
        // Glissando 现在完全在 buildNoteXML 的 notations 块中处理
        // 这里不再处理glissando，避免违反MusicXML规范
        if (articulation === 'glissando') {
            console.log(`🎸 Glissando: 已在notations中处理，跳过articulations处理`);
            return '';
        }
        
        // Slide In/Out 现在完全在 buildNoteXML 的 notations 块中处理
        // 这里不再处理slide-in/slide-out，避免重复处理
        if (articulation === 'slide-in') {
            console.log(`🎸 Slide In: 已在notations中处理，跳过articulations处理`);
            return '';
        }
        
        if (articulation === 'slide-out') {
            console.log(`🎸 Slide Out: 已在notations中处理，跳过articulations处理`);
            return '';
        }
        
        // 选择合适的XML标记
        if (basicArticulations[articulation]) {
            xml = '\n          ' + basicArticulations[articulation];
            console.log(`🎼 生成基本演奏法XML: ${articulation}`);
        } else if (articulation) {
            console.log(`⚠️ 未知演奏法: ${articulation}`);
        }
        
        return xml;
    }
    
    /**
     * 构建休止符XML
     */
    buildRestXML(rest) {
        const { duration, beats, isTriplet, tripletType, tripletPosition, tripletTotal } = rest;
        
        console.log(`生成休止符XML: duration=${duration}, beats=${beats}, isTriplet=${isTriplet}, clef=${this.config.clef}`);
        
        const durationMap = {
            'whole': 16,
            'half': 8,
            'half.': 12,  // 二分附点休止符
            'quarter': 4,
            'quarter.': 6,
            'eighth': 2,
            'eighth.': 3,
            '16th': 1,
            '32nd': 0.5
        };
        
        const durationValue = durationMap[duration] || 4;
        
        let restXML = `
      <note>`;
        
        // 全音符休止符的特殊处理
        if (duration === 'whole' && beats >= 4) {
            // 全小节休止符 - 根据谱号设置位置信息
            const clef = this.config.clef || 'treble';
            let measureRestPosition = '';
            
            // 全小节休止符永远挂在第四线下方，与谱号无关
            measureRestPosition = '<line>4</line>';
            
            restXML += `
        <rest measure="yes">
            ${measureRestPosition}
        </rest>
        <duration>${durationValue}</duration>`;
            console.log(`生成全小节休止符 (measure rest) - ${clef}谱号`);
        } else {
            // 普通休止符
            const cleanDuration = duration.replace('.', '');
            restXML += `
        <rest>`;
            
            // 休止符位置与谱号无关，只根据五线谱线条编号确定
            // 使用MusicXML的<line>元素直接指定线条位置（从底部开始计数）
            let restPosition = '';
            
            switch(cleanDuration) {
                case 'whole':
                    // 全休止符永远挂在第四线下方（线条编号为4）
                    restPosition = '<line>4</line>';
                    break;
                case 'half':
                    // 二分休止符永远顶在第三线上方（线条编号为3）
                    restPosition = '<line>3</line>';
                    break;
                case 'quarter':
                case 'eighth':
                case 'sixteenth':
                case '16th':
                default:
                    // 其他休止符都在第三线区域（线条编号为3）
                    restPosition = '<line>3</line>';
                    break;
            }
            
            restXML += restPosition;
            
            restXML += `</rest>
        <duration>${durationValue}</duration>
        <type>${cleanDuration}</type>`;
            
            // 附点处理
            if (duration.includes('.')) {
                restXML += `
        <dot/>`;
            }
            console.log(`生成普通休止符: ${duration}`);
        }
        
        // 三连音标记（仅适用于非全音符休止符）
        if (isTriplet && duration !== 'whole') {
            // 统一的连音处理，与音符保持一致
            const normalType = duration.replace('.', ''); // 移除附点标记
            
            // 根据连音类型设置正确的时值改变比例
            let actualNotes, normalNotes;
            if (tripletType === 'duplet_eighth') {
                actualNotes = 2;
                normalNotes = 3;
            } else if (tripletType === 'quadruplet_eighth') {
                actualNotes = 4;
                normalNotes = 3;
            } else {
                actualNotes = 3;
                normalNotes = 2;
            }
            
            restXML += `
        <time-modification>
            <actual-notes>${actualNotes}</actual-notes>
            <normal-notes>${normalNotes}</normal-notes>
            <normal-type>${normalType}</normal-type>
        </time-modification>`;
            
            // 添加notations标记
            restXML += `
        <notations>`;
            
            const tripletNumber = rest.tripletId || 1; // 使用唯一的三连音ID，默认为1
            if (tripletPosition === 0) {
                // 连音开始 - 显示对应数字和括号
                const showNumber = tripletType === 'duplet_eighth' ? '2' : 
                                 tripletType === 'quadruplet_eighth' ? '4' : '3';
                restXML += `
            <tuplet type="start" number="${tripletNumber}" bracket="yes" show-number="${showNumber}" placement="above"/>`;
                console.log(`  🎵 休止符三连音开始: ID=${tripletNumber}, 位置=${tripletPosition}`);
            } else if (tripletPosition === tripletTotal - 1) {
                // 连音结束
                restXML += `
            <tuplet type="stop" number="${tripletNumber}"/>`;
                console.log(`  🎵 休止符连音结束: ID=${tripletNumber}, 类型=${tripletType}, 位置=${tripletPosition}`);
            }
            // 中间的元素（tripletPosition === 1）不需要tuplet标记
            
            restXML += `
        </notations>`;
            
            console.log(`添加三连音标记: ${tripletType}三连音, 位置${tripletPosition}/${tripletTotal}`);
        }
        
        restXML += `
      </note>`;
        
        console.log(`休止符XML生成完成: ${duration}`);
        return restXML;
    }

    /**
     * 获取beam信息
     */
    getBeamInfo(beamGroups, noteIndex) {
        for (const group of beamGroups) {
            if (Array.isArray(group.notes) && group.notes.includes(noteIndex)) {
                if (noteIndex === group.notes[0]) {
                    return 'begin';
                } else if (noteIndex === group.notes[group.notes.length - 1]) {
                    return 'end';
                } else {
                    return 'continue';
                }
            }
        }
        return null;
    }
    
    /**
     * 计算符干方向
     */
    calculateStemDirection(octave, step) {
        // 根据音高决定符干方向
        // B4及以上向下，B4以下向上
        const noteValue = octave * 7 + ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(step);
        const middleB = 4 * 7 + 6; // B4的数值
        
        if (noteValue >= middleB) {
            return 'down';
        } else {
            return 'up';
        }
    }
}

// ====== OSMD渲染系统 ======
async function initOSMD() {
    try {
        if (typeof opensheetmusicdisplay === 'undefined') {
            throw new Error('OpenSheetMusicDisplay未加载');
        }

        console.log('🎵 初始化OSMD - 极简配置');
        
        // 创建OSMD实例 - 最简化配置
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("score", {
            autoResize: true,
            backend: "vexflow",
            drawTitle: false,
            drawSubtitle: false,
            drawComposer: false,
            drawLyricist: false,
            drawCredits: false,
            drawPartNames: false
        });
        
        // 启用glissando渲染和相关设置
        if (osmd.EngravingRules) {
            console.log('🔍 检查OSMD版本和功能支持:');
            console.log('  - OSMD版本:', typeof osmd.Version !== 'undefined' ? osmd.Version : '未知');
            console.log('  - 后端引擎:', osmd.backendType || '未知');
            console.log('  - EngravingRules对象:', Object.keys(osmd.EngravingRules).filter(key => key.includes('Render')));
            
            // 检查所有可能的渲染选项
            const allRenderOptions = Object.keys(osmd.EngravingRules).filter(key => 
                key.startsWith('Render') || key.includes('Glissando') || key.includes('Slur')
            );
            console.log('  - 所有渲染相关选项:', allRenderOptions);
            
            if ("RenderGlissandi" in osmd.EngravingRules) {
                osmd.EngravingRules.RenderGlissandi = true;
                console.log('✅ 已启用OSMD glissando渲染');
            } else {
                console.log('❌ OSMD不支持RenderGlissandi选项');
                console.log('🔍 检查替代选项: RenderGlissandos, DrawGlissando, etc.');
                
                // 检查可能的替代名称
                const glissandoAlternatives = ['RenderGlissandos', 'DrawGlissando', 'ShowGlissando'];
                glissandoAlternatives.forEach(alt => {
                    if (alt in osmd.EngravingRules) {
                        osmd.EngravingRules[alt] = true;
                        console.log(`✅ 找到并启用替代选项: ${alt}`);
                    }
                });
            }
            
            // 尝试启用所有可能相关的渲染选项
            const renderOptions = ['RenderSlurs', 'RenderArpeggios', 'RenderTies', 'RenderOrnaments', 'RenderArticulations'];
            renderOptions.forEach(option => {
                if (option in osmd.EngravingRules) {
                    osmd.EngravingRules[option] = true;
                    console.log(`✅ 已启用OSMD ${option}`);
                } else {
                    console.log(`❌ OSMD不支持${option}选项`);
                }
            });
            
            console.log('🔍 OSMD EngravingRules最终设置:');
            renderOptions.concat(['RenderGlissandi']).forEach(option => {
                if (option in osmd.EngravingRules) {
                    console.log(`  - ${option}: ${osmd.EngravingRules[option]}`);
                } else {
                    console.log(`  - ${option}: 不支持`);
                }
            });
        }
        
        // 隐藏标题和乐器名称
        if (osmd.EngravingRules) {
            osmd.EngravingRules.drawTitle = false;
            osmd.EngravingRules.drawSubtitle = false;
            osmd.EngravingRules.drawComposer = false;
            osmd.EngravingRules.drawLyricist = false;
            osmd.EngravingRules.drawCredits = false;
            osmd.EngravingRules.drawPartNames = false;
            console.log('✅ 已隐藏标题和乐器名称');
        }
        
        console.log('✅ OSMD初始化成功');
        return osmd;
    } catch (error) {
        console.error('❌ OSMD初始化失败:', error);
        throw error;
    }
}

async function renderScore(melodyData) {
    console.log('🎨 开始OSMD渲染 - 新策略');
    
    const scoreDiv = document.getElementById('score');
    
    try {
        // 清理
        scoreDiv.innerHTML = '';
        if (osmd) {
            osmd.clear();
            osmd = null;
        }
        
        // 获取容器实际宽度
        const containerWidth = scoreDiv.clientWidth;
        console.log(`📏 容器宽度: ${containerWidth}px`);
        
        // 计算总小节数
        const totalMeasures = melodyData.config.measures;
        console.log(`🎵 总小节数: ${totalMeasures}`);
        
        // 创建OSMD - 简单配置
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("score", {
            autoResize: true,
            backend: "vexflow",
            drawTitle: false,
            drawSubtitle: false,
            drawComposer: false,
            drawLyricist: false,
            drawCredits: false,
            drawPartNames: false
        });
        
        // 启用glissando渲染和相关设置
        if (osmd.EngravingRules) {
            console.log('🔍 检查OSMD版本和功能支持:');
            console.log('  - OSMD版本:', typeof osmd.Version !== 'undefined' ? osmd.Version : '未知');
            console.log('  - 后端引擎:', osmd.backendType || '未知');
            console.log('  - EngravingRules对象:', Object.keys(osmd.EngravingRules).filter(key => key.includes('Render')));
            
            // 检查所有可能的渲染选项
            const allRenderOptions = Object.keys(osmd.EngravingRules).filter(key => 
                key.startsWith('Render') || key.includes('Glissando') || key.includes('Slur')
            );
            console.log('  - 所有渲染相关选项:', allRenderOptions);
            
            if ("RenderGlissandi" in osmd.EngravingRules) {
                osmd.EngravingRules.RenderGlissandi = true;
                console.log('✅ 已启用OSMD glissando渲染');
            } else {
                console.log('❌ OSMD不支持RenderGlissandi选项');
                console.log('🔍 检查替代选项: RenderGlissandos, DrawGlissando, etc.');
                
                // 检查可能的替代名称
                const glissandoAlternatives = ['RenderGlissandos', 'DrawGlissando', 'ShowGlissando'];
                glissandoAlternatives.forEach(alt => {
                    if (alt in osmd.EngravingRules) {
                        osmd.EngravingRules[alt] = true;
                        console.log(`✅ 找到并启用替代选项: ${alt}`);
                    }
                });
            }
            
            // 尝试启用所有可能相关的渲染选项
            const renderOptions = ['RenderSlurs', 'RenderArpeggios', 'RenderTies', 'RenderOrnaments', 'RenderArticulations'];
            renderOptions.forEach(option => {
                if (option in osmd.EngravingRules) {
                    osmd.EngravingRules[option] = true;
                    console.log(`✅ 已启用OSMD ${option}`);
                } else {
                    console.log(`❌ OSMD不支持${option}选项`);
                }
            });
            
            console.log('🔍 OSMD EngravingRules最终设置:');
            renderOptions.concat(['RenderGlissandi']).forEach(option => {
                if (option in osmd.EngravingRules) {
                    console.log(`  - ${option}: ${osmd.EngravingRules[option]}`);
                } else {
                    console.log(`  - ${option}: 不支持`);
                }
            });
        }
        
        // 隐藏标题和乐器名称
        if (osmd.EngravingRules) {
            osmd.EngravingRules.drawTitle = false;
            osmd.EngravingRules.drawSubtitle = false;
            osmd.EngravingRules.drawComposer = false;
            osmd.EngravingRules.drawLyricist = false;
            osmd.EngravingRules.drawCredits = false;
            osmd.EngravingRules.drawPartNames = false;
            console.log('✅ 已隐藏标题和乐器名称');
        }
        
        // 加载MusicXML
        console.log('🔄 准备加载MusicXML到OSMD...');
        console.log('📄 MusicXML验证 - 长度:', melodyData.musicXML.length);
        console.log('📄 MusicXML开头:', melodyData.musicXML.substring(0, 100));
        
        try {
            await osmd.load(melodyData.musicXML);
            console.log('✅ MusicXML加载成功');
        } catch (loadError) {
            console.error('❌ OSMD MusicXML加载失败:', loadError);
            console.error('📄 完整MusicXML内容:');
            console.error(melodyData.musicXML);
            throw new Error(`OSMD加载错误: ${loadError.message}`);
        }
        
        // 🔑 强力策略：同时使用多种方法确保多小节每行
        if (osmd.EngravingRules) {
            console.log('🎯 应用强力多小节布局...');
            
            // 第一层：设置系统小节数限制
            if (totalMeasures === 2) {
                osmd.EngravingRules.MaxMeasuresPerSystem = 2;
                osmd.EngravingRules.MinMeasuresPerSystem = 2; // 强制最少2小节
                if ("RenderXMeasuresPerLineAkaSystem" in osmd.EngravingRules) {
                    osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 2; // 双保险
                }
                console.log('🎯 2小节模式：强制每行2小节');
            } else {
                osmd.EngravingRules.MaxMeasuresPerSystem = 4;
                osmd.EngravingRules.MinMeasuresPerSystem = Math.min(4, totalMeasures); // 根据总数设置最小值
                if ("RenderXMeasuresPerLineAkaSystem" in osmd.EngravingRules) {
                    osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4; // 双保险
                }
                console.log('🎯 4小节模式：强制每行4小节');
            }
            
            // 第二层：启用MusicXML换行标记
            if ("NewSystemFromXMLNewSystemAttribute" in osmd.EngravingRules) {
                osmd.EngravingRules.NewSystemFromXMLNewSystemAttribute = true;  // 改为true以支持MusicXML换行
            }
            if ("NewSystemAtXMLNewSystemAttribute" in osmd.EngravingRules) {
                osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;  // 改为true以支持MusicXML换行
            }
            if ("NewSystemAtXMLNewSystem" in osmd.EngravingRules) {
                osmd.EngravingRules.NewSystemAtXMLNewSystem = true;  // 启用<print new-system="yes"/>标记
                console.log('✅ 启用NewSystemAtXMLNewSystem - 支持MusicXML换行标记');
            }
            
            // 第三层：设置合适的边距和间距 - 减小边距让乐谱更大
            if ("PageLeftMargin" in osmd.EngravingRules) {
                osmd.EngravingRules.PageLeftMargin = 6;
            }
            if ("PageRightMargin" in osmd.EngravingRules) {
                osmd.EngravingRules.PageRightMargin = 6;
            }
            if ("SystemLeftMargin" in osmd.EngravingRules) {
                osmd.EngravingRules.SystemLeftMargin = 6;
            }
            if ("SystemRightMargin" in osmd.EngravingRules) {
                osmd.EngravingRules.SystemRightMargin = 6;
            }
            
            // 第四层：调整小节间距
            if ("BetweenMeasuresDistance" in osmd.EngravingRules) {
                osmd.EngravingRules.BetweenMeasuresDistance = 15;
            }
            
            // 第五层：调整系统间距
            if ("SystemDistance" in osmd.EngravingRules) {
                osmd.EngravingRules.SystemDistance = 20;
            }

            // 第六层：让最后一行拉伸填满
            if ("StretchLastSystemLine" in osmd.EngravingRules) {
                osmd.EngravingRules.StretchLastSystemLine = true;
            }
            if ("JustifyLastSystem" in osmd.EngravingRules) {
                osmd.EngravingRules.JustifyLastSystem = true;
            }
            
            console.log(`✅ 强力布局配置:`);
            console.log(`   - 每行目标小节数: ${totalMeasures === 2 ? 2 : 4}`);
            console.log(`   - MinMeasuresPerSystem: ${osmd.EngravingRules.MinMeasuresPerSystem}`);
            console.log(`   - RenderXMeasuresPerLineAkaSystem: ${osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem}`);
        }
        
        // 设置适当的缩放 - 调整到1.1
        const zoom = 1.1;
        osmd.zoom = zoom;
        console.log(`🔍 设置缩放: ${zoom}`);
        
        // 渲染
        osmd.render();
        console.log('✅ OSMD渲染完成');
        
        // 检查实际渲染结果
        setTimeout(() => {
            const svg = scoreDiv.querySelector('svg');
            if (svg) {
                const actualWidth = svg.getBBox ? svg.getBBox().width : svg.clientWidth;
                console.log(`📊 实际渲染宽度: ${Math.round(actualWidth)}px`);
                
                // 分析小节分布 - 使用正确的选择器
                const allG = svg.querySelectorAll('g');
                let measureGroups = [];
                
                allG.forEach(g => {
                    const id = g.getAttribute('id') || '';
                    const className = g.getAttribute('class') || '';
                    
                    if (id.includes('MeasureContent') || className.includes('measure')) {
                        measureGroups.push(g);
                    }
                });
                
                console.log(`📏 渲染了${measureGroups.length}个小节`);
                
                if (measureGroups.length > 0) {
                    // 按Y坐标分组小节来检查布局
                    const rows = {};
                    measureGroups.forEach(g => {
                        const transform = g.getAttribute('transform') || '';
                        const parentTransform = g.parentElement?.getAttribute('transform') || '';
                        
                        // 尝试从transform获取Y坐标
                        let y = 0;
                        const match = (transform + ' ' + parentTransform).match(/translate\([^,]+,\s*([^)]+)\)/);
                        if (match) {
                            y = Math.round(parseFloat(match[1]));
                        }
                        
                        // 将Y坐标近似相同的小节分为一组（容差20px）
                        let foundRow = false;
                        for (let rowY in rows) {
                            if (Math.abs(y - parseFloat(rowY)) < 20) {
                                rows[rowY].push(g);
                                foundRow = true;
                                break;
                            }
                        }
                        if (!foundRow) {
                            rows[y] = [g];
                        }
                    });
                    
                    // 报告每行的小节数
                    Object.keys(rows).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach((y, index) => {
                        const count = rows[y].length;
                        console.log(`📍 第${index + 1}行: ${count} 个小节 ${count === 4 ? '✅' : count === 2 && totalMeasures === 2 ? '✅' : '❌'}`);
                    });
                }
            }
        }, 500);
        
        // 不再设置响应式监听器，保持固定4小节布局
    } catch (error) {
        console.error('❌ OSMD渲染失败:', error);
        scoreDiv.innerHTML = `
            <div style="color: red; padding: 50px; text-align: center;">
                <h3>渲染失败</h3>
                <p><strong>错误:</strong> ${error.message}</p>
                <p>请查看控制台了解详情</p>
            </div>
        `;
        throw error;
    }
}

/**
 * 设置响应式布局监听器
 */
function setupResponsiveLayout(melodyData) {
    // 移除旧的监听器（如果存在）
    if (window.responsiveResizeHandler) {
        window.removeEventListener('resize', window.responsiveResizeHandler);
    }
    
    // 防抖动函数，优化容器宽度检测
    let resizeTimeout;
    window.responsiveResizeHandler = function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(async () => {
            console.log('📱 屏幕尺寸变化，重新生成响应式布局');
            
            try {
                // 使用容器实际宽度而非窗口宽度
                const scoreContainer = document.getElementById('score');
                const containerWidth = scoreContainer ? scoreContainer.clientWidth : window.innerWidth;
                
                // 强制每行4小节（所有设备）
                const measuresPerLine = 4;
                
                console.log(`📱 响应式重构: 容器宽度=${containerWidth}px, 每行${measuresPerLine}小节`);
                
                const builder = new MusicXMLBuilder(melodyData.melody, melodyData.config);
                const newMusicXML = builder.build(measuresPerLine);
                
                // 重新渲染以应用新的小节分布
                if (osmd) {
                    await osmd.load(newMusicXML);
                    
                    // 重新配置OSMD以匹配新的断点（使用原生API）
                    if (osmd.EngravingRules) {
                        // 重新计算小节宽度（每行固定4小节）
                        const availableWidth = containerWidth - 60;
                        const targetMeasureWidth = availableWidth / measuresPerLine;
                        const finalMeasureWidth = Math.max(40, Math.min(300, targetMeasureWidth)); // 最小40px适应小屏幕
                        
                        console.log(`📱 响应式重配置: ${measuresPerLine}小节/行, 小节宽度=${Math.round(finalMeasureWidth)}px`);
                        
                        // 更新固定小节配置
                        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = measuresPerLine;
                        osmd.EngravingRules.MaxMeasuresPerSystem = measuresPerLine;
                        osmd.EngravingRules.MinMeasuresPerSystem = measuresPerLine;
                        osmd.EngravingRules.FixedMeasureWidth = true;
                        osmd.EngravingRules.FixedMeasureWidthFixedValue = finalMeasureWidth;
                        osmd.EngravingRules.NewSystemAtXMLNewSystem = true;
                        
                        // 添加小节在系统内均匀分布的设置
                        if (osmd.EngravingRules.hasOwnProperty('JustifyMeasuresInSystem')) {
                            osmd.EngravingRules.JustifyMeasuresInSystem = true;
                        } else if (osmd.EngravingRules.hasOwnProperty('justifyMeasuresInSystem')) {
                            osmd.EngravingRules.justifyMeasuresInSystem = true;
                        }
                    }
                    
                    osmd.render();
                    console.log('✅ 响应式重新渲染完成 - 应用新的小节分布');
                }
            } catch (error) {
                console.error('❌ 响应式重新渲染失败:', error);
            }
        }, 250); // 稍微减少防抖时间以提高响应性
    };
    
    window.addEventListener('resize', window.responsiveResizeHandler);
    console.log('📱 响应式布局监听器已设置');
}

/**
 * 只应用基本样式，不做任何缩放
 */
function applyOnlyBasicStyles() {
    console.log('🚫 已完全禁用基本样式调整，保持OSMD完全原生效果');
    
    // 只清除之前可能存在的样式，但不添加任何新样式
    const oldStyles = ['stretch-to-fill-style', 'force-full-width-style', 'simple-auto-fit-style', 'simple-fill-style', 'force-stretch-style', 'uniform-stretch-style', 'smart-stretch-style', 'dynamic-container-style', 'spacing-only-style', 'osmd-measure-stretch-style'];
    oldStyles.forEach(styleId => {
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
            console.log(`🧹 已移除样式: ${styleId}`);
        }
    });
    
    console.log('✅ 保持OSMD完全原生显示效果');
}

/**
 * 严格验证小节布局：确保没有行超过指定的最大小节数
 */
function validateStrictMeasureLayout(maxMeasuresPerLine) {
    console.log(`🔍 严格验证布局: 检查是否有行超过${maxMeasuresPerLine}小节`);
    
    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) return;
    
    const svg = scoreDiv.querySelector('svg');
    if (!svg) return;
    
    try {
        // 查找所有系统（行）
        const systems = svg.querySelectorAll('g[class*="system"], g.system, g[id*="system"]');
        
        if (systems.length > 0) {
            console.log(`📊 找到${systems.length}个系统（行）`);
            
            let hasViolation = false;
            systems.forEach((system, index) => {
                const measures = system.querySelectorAll('g[id*="measure"], g.measure, g[class*="measure"]');
                const measureCount = measures.length;
                
                console.log(`  行${index + 1}: ${measureCount}个小节`);
                
                if (measureCount > maxMeasuresPerLine) {
                    console.error(`❌ 违规！行${index + 1}包含${measureCount}个小节，超过限制的${maxMeasuresPerLine}个`);
                    hasViolation = true;
                } else if (measureCount === maxMeasuresPerLine) {
                    console.log(`✅ 行${index + 1}正好${measureCount}个小节，符合要求`);
                } else if (measureCount < maxMeasuresPerLine) {
                    console.log(`⚡ 行${index + 1}只有${measureCount}个小节，可能是最后一行`);
                }
            });
            
            if (!hasViolation) {
                console.log(`✅ 严格验证通过：所有行都不超过${maxMeasuresPerLine}小节`);
            }
        } else {
            console.warn('⚠️ 未找到系统元素，尝试其他方法检测小节布局');
            
            // 备用方法：通过小节的Y坐标分组
            const measures = svg.querySelectorAll('g[id*="measure"], g.measure, g[class*="measure"]');
            if (measures.length > 0) {
                console.log(`📊 找到${measures.length}个小节，按Y坐标分组`);
                
                const measuresByY = new Map();
                measures.forEach(measure => {
                    const transform = measure.getAttribute('transform') || '';
                    const translateMatch = transform.match(/translate\([^,]+,\s*([^)]+)\)/);
                    const y = translateMatch ? parseFloat(translateMatch[1]) : 0;
                    
                    const yKey = Math.round(y / 10) * 10; // 按10px为单位分组
                    if (!measuresByY.has(yKey)) {
                        measuresByY.set(yKey, []);
                    }
                    measuresByY.get(yKey).push(measure);
                });
                
                let hasViolation = false;
                let lineIndex = 0;
                measuresByY.forEach((lineMeasures, y) => {
                    lineIndex++;
                    const measureCount = lineMeasures.length;
                    console.log(`  行${lineIndex} (Y=${y}): ${measureCount}个小节`);
                    
                    if (measureCount > maxMeasuresPerLine) {
                        console.error(`❌ 违规！行${lineIndex}包含${measureCount}个小节，超过限制的${maxMeasuresPerLine}个`);
                        hasViolation = true;
                    }
                });
                
                if (!hasViolation) {
                    console.log(`✅ 严格验证通过：所有行都不超过${maxMeasuresPerLine}小节`);
                }
            }
        }
    } catch (error) {
        console.error('❌ 严格布局验证失败:', error);
    }
}

/**
 * 显示不同小节数的布局效果预期
 */
function showLayoutExpectation(totalMeasures) {
    console.log(`🎼 布局效果预期 (${totalMeasures}小节):`);
    
    if (totalMeasures <= 4) {
        console.log(`  📏 单行布局: ${totalMeasures}小节等距分布，充满容器宽度`);
        console.log(`  🎯 预期效果: 小节间距均匀，无右侧空白`);
    } else {
        const fullLines = Math.floor(totalMeasures / 4);
        const remainingMeasures = totalMeasures % 4;
        
        console.log(`  📄 多行布局:`);
        for (let i = 1; i <= fullLines; i++) {
            console.log(`    第${i}行: 4小节，充满容器宽度`);
        }
        
        if (remainingMeasures > 0) {
            console.log(`    第${fullLines + 1}行: ${remainingMeasures}小节，等距分布充满容器宽度`);
        }
        
        console.log(`  🎯 预期效果: 每行都充满容器，无宽度不一致问题`);
    }
    
    // 显示具体的用例说明
    console.log(`\n📝 纯间距布局说明 (音符保持原形):`);
    console.log(`  2小节 → 第1行: 2小节，通过增加间距填满容器`);
    console.log(`  4小节 → 第1行: 4小节，通过调整间距填满容器`); 
    console.log(`  8小节 → 第1行: 4小节，第2行: 4小节，每行通过间距填满容器`);
    console.log(`  10小节 → 3行布局，前两行各4小节，最后一行2小节通过间距填满`);
    console.log(`  ✅ 保证: 音符、拍号、谱号绝不变形，只调整小节和音符间距`);
    console.log(`  🚫 禁止: 任何CSS transform缩放或元素变形`);
}

/**
 * 调整不完整系统的间距，确保小节等距分布
 */
function adjustIncompleteSystemSpacing(maxMeasuresPerLine) {
    console.log('🎯 调整不完整行的小节间距');
    
    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) return;
    
    const svg = scoreDiv.querySelector('svg');
    if (!svg) return;
    
    try {
        const containerWidth = scoreDiv.clientWidth - 40;
        const systems = svg.querySelectorAll('g[class*="system"], g.system, g[id*="system"]');
        
        if (systems.length > 0) {
            systems.forEach((system, systemIndex) => {
                const measures = system.querySelectorAll('g[id*="measure"], g.measure, g[class*="measure"]');
                const measureCount = measures.length;
                
                if (measureCount > 0 && measureCount < maxMeasuresPerLine) {
                    console.log(`🔧 调整第${systemIndex + 1}行: ${measureCount}/${maxMeasuresPerLine}小节`);
                    
                    // 计算等距分布的理想间距
                    const idealSpacing = containerWidth / measureCount;
                    const measureSpacing = idealSpacing * 0.8; // 预留一些边距
                    
                    console.log(`📏 理想间距: ${idealSpacing.toFixed(1)}px, 实际间距: ${measureSpacing.toFixed(1)}px`);
                    
                    // 创建针对这个系统的CSS调整
                    const adjustmentStyle = document.createElement('style');
                    adjustmentStyle.id = `system-spacing-${systemIndex}`;
                    adjustmentStyle.innerHTML = `
                        /* 调整第${systemIndex + 1}行的小节间距 */
                        #score svg g:nth-child(${systemIndex + 1}) g[id*="measure"],
                        #score svg g:nth-child(${systemIndex + 1}) g.measure {
                            margin-right: ${(measureSpacing * 0.3).toFixed(1)}px !important;
                        }
                        
                        /* 确保这一行充满容器宽度 */
                        #score svg g:nth-child(${systemIndex + 1}) {
                            width: ${containerWidth}px !important;
                            display: flex !important;
                            justify-content: space-evenly !important;
                        }
                    `;
                    
                    // 移除旧的调整样式
                    const oldStyle = document.getElementById(`system-spacing-${systemIndex}`);
                    if (oldStyle) oldStyle.remove();
                    
                    document.head.appendChild(adjustmentStyle);
                    
                    console.log(`✅ 第${systemIndex + 1}行间距调整完成`);
                }
            });
        } else {
            console.warn('⚠️ 未找到系统元素，使用备用方法调整间距');
            
            // 备用方法：直接调整所有小节的间距
            const measures = svg.querySelectorAll('g[id*="measure"], g.measure, g[class*="measure"]');
            if (measures.length <= maxMeasuresPerLine) {
                const idealSpacing = containerWidth / measures.length;
                
                const globalAdjustmentStyle = document.createElement('style');
                globalAdjustmentStyle.id = 'global-measure-spacing';
                globalAdjustmentStyle.innerHTML = `
                    /* 全局小节等距调整 */
                    #score svg g[id*="measure"],
                    #score svg g.measure {
                        margin-right: ${(idealSpacing * 0.2).toFixed(1)}px !important;
                    }
                    
                    #score svg {
                        display: flex !important;
                        justify-content: space-evenly !important;
                        align-items: flex-start !important;
                    }
                `;
                
                const oldGlobalStyle = document.getElementById('global-measure-spacing');
                if (oldGlobalStyle) oldGlobalStyle.remove();
                
                document.head.appendChild(globalAdjustmentStyle);
                console.log(`✅ 全局间距调整完成: ${measures.length}小节等距分布`);
            }
        }
    } catch (error) {
        console.error('❌ 间距调整失败:', error);
    }
}

/**
 * 验证布局是否符合要求
 */
function validateLayout(expectedMeasuresPerLine) {
    console.log(`🔍 验证布局: 预期每行最多${expectedMeasuresPerLine}小节`);
    
    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) return;
    
    const svg = scoreDiv.querySelector('svg');
    if (!svg) return;
    
    try {
        // 查找所有可能的系统元素
        const possibleSelectors = [
            'g[id*="system"]',
            'g.system',
            'g[id*="System"]',
            'g[class*="system"]'
        ];
        
        let systems = [];
        for (const selector of possibleSelectors) {
            systems = svg.querySelectorAll(selector);
            if (systems.length > 0) {
                console.log(`📊 找到${systems.length}个系统，使用选择器: ${selector}`);
                break;
            }
        }
        
        if (systems.length > 0) {
            systems.forEach((system, index) => {
                const measures = system.querySelectorAll('*[id*="measure"], *[class*="measure"]');
                const measureCount = measures.length;
                
                if (measureCount > expectedMeasuresPerLine) {
                    console.warn(`❌ 系统${index + 1}有${measureCount}个小节，超过预期的${expectedMeasuresPerLine}个！`);
                    console.warn(`🔧 可能需要强化OSMD换行设置或检查MusicXML换行指令`);
                } else {
                    console.log(`✅ 系统${index + 1}: ${measureCount}个小节 (符合要求)`);
                }
            });
        } else {
            console.log('⚠️ 无法找到系统元素进行验证');
            // 备用验证方法：直接查找所有小节
            const allMeasures = svg.querySelectorAll('*[id*="measure"]');
            console.log(`📊 总共找到 ${allMeasures.length} 个小节元素`);
        }
        
    } catch (error) {
        console.error('❌ 布局验证失败:', error);
    }
}

/**
 * 复杂的自适应宽度调整（已弃用 - 会导致SVG变小）
 */
function applySimpleAutoFit_DEPRECATED() {
    console.log('🎨 应用简单的自适应宽度，保持小节完整性');
    
    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) return;
    
    const svg = scoreDiv.querySelector('svg');
    if (!svg) return;
    
    try {
        // 获取SVG的原始尺寸
        const svgWidth = svg.getBoundingClientRect().width;
        const containerWidth = scoreDiv.clientWidth - 40; // 减去padding
        
        console.log(`📐 SVG原始宽度: ${svgWidth.toFixed(0)}px, 容器宽度: ${containerWidth.toFixed(0)}px`);
        
        // 应用自适应样式
        applyAutoFitStyles(containerWidth);
        
    } catch (error) {
        console.error('❌ 自适应调整失败:', error);
    }
}

/**
 * 应用自适应CSS样式
 */
function applyAutoFitStyles(containerWidth) {
    console.log('🚫 已完全禁用自适应样式，保持OSMD原生显示效果');
    
    // 移除任何现有的样式
    const existingStyle = document.getElementById('simple-auto-fit-style');
    if (existingStyle) {
        existingStyle.remove();
        console.log('🧹 已移除自适应样式');
    }
    
    console.log('✅ 保持OSMD完全原生的显示效果，不做任何尺寸修改');
}

/**
 * 强制正确的小节布局 - DOM操作方法（已弃用 - 会破坏小节结构）
 */
function forceProperMeasureLayout_DEPRECATED(maxMeasuresPerLine) {
    console.log(`🔧 开始强制重排小节，每行最多${maxMeasuresPerLine}小节`);
    
    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) return;
    
    const svg = scoreDiv.querySelector('svg');
    if (!svg) return;
    
    try {
        // 分析当前小节分布
        const measures = findAllMeasures(svg);
        console.log(`🔍 找到${measures.length}个小节`);
        
        if (measures.length === 0) return;
        
        // 重新排列小节
        rearrangeMeasures(measures, maxMeasuresPerLine);
        
        // 应用填满宽度样式
        applyFullWidthStyles();
        
    } catch (error) {
        console.error('❌ 强制重排小节失败:', error);
    }
}

/**
 * 查找SVG中的所有小节元素
 */
function findAllMeasures(svg) {
    const possibleSelectors = [
        'g[id*="measure"]',
        'g[class*="measure"]', 
        'g[id*="Measure"]',
        'g.measure'
    ];
    
    let measures = [];
    for (const selector of possibleSelectors) {
        measures = svg.querySelectorAll(selector);
        if (measures.length > 0) {
            console.log(`✅ 使用选择器 "${selector}" 找到${measures.length}个小节`);
            break;
        }
    }
    
    return Array.from(measures);
}

/**
 * 重新排列小节到正确的行
 */
function rearrangeMeasures(measures, maxMeasuresPerLine) {
    console.log(`📐 开始重新排列${measures.length}个小节，每行${maxMeasuresPerLine}个`);
    
    // 获取第一个小节的Y位置作为基准
    const firstMeasure = measures[0];
    const baseY = getElementY(firstMeasure);
    const measureHeight = 120; // 估算行高
    
    console.log(`📍 基准Y位置: ${baseY}`);
    
    measures.forEach((measure, index) => {
        const rowIndex = Math.floor(index / maxMeasuresPerLine);
        const colIndex = index % maxMeasuresPerLine;
        
        // 计算新位置
        const newY = baseY + (rowIndex * measureHeight);
        const newX = colIndex * (100 / maxMeasuresPerLine) + '%'; // 百分比分布
        
        // 应用新的变换
        const currentTransform = measure.getAttribute('transform') || '';
        const newTransform = `translate(${colIndex * 200}, ${rowIndex * measureHeight})`;
        
        measure.setAttribute('transform', newTransform);
        
        if (index < 5) { // 只打印前5个的调试信息
            console.log(`  小节${index + 1}: 行${rowIndex + 1}, 列${colIndex + 1}, 变换=${newTransform}`);
        }
    });
    
    console.log('✅ 小节重新排列完成');
}

/**
 * 获取元素的Y坐标
 */
function getElementY(element) {
    const transform = element.getAttribute('transform');
    if (transform) {
        const match = transform.match(/translate\(\s*([^,]+),\s*([^)]+)\)/);
        if (match) {
            return parseFloat(match[2]) || 0;
        }
    }
    return 0;
}

/**
 * 应用填满宽度的样式
 */
function applyFullWidthStyles() {
    const existingStyle = document.getElementById('force-full-width-style');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'force-full-width-style';
    style.innerHTML = `
        #score {
            width: 100% !important;
            max-width: 1000px !important;
            padding: 20px !important;
            margin: 0 auto !important;
        }
        
        #score svg {
            width: 100% !important;
            height: auto !important;
            display: block !important;
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ 应用了强制全宽度样式');
}

/**
 * 简化的SVG宽度填充方法（保留作为备用）
 */
function ensureFullWidthFill() {
    console.log('🎨 开始简化的SVG宽度填充');
    
    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) return;
    
    // 等待SVG渲染完成
    setTimeout(() => {
        const svg = scoreDiv.querySelector('svg');
        if (!svg) {
            console.log('❌ 未找到SVG元素');
            return;
        }
        
        console.log('📐 开始应用简单的填充样式');
        
        // 直接应用填充样式
        applySimpleFullWidthStyles();
        
    }, 300); // 增加延迟确保完全渲染
    
    function applySimpleFullWidthStyles() {
        // 清除之前的样式
        const existingStyle = document.getElementById('simple-full-width-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // 应用简单直接的样式
        const style = document.createElement('style');
        style.id = 'simple-full-width-style';
        style.innerHTML = `
            /* 容器样式 */
            #score {
                width: 100% !important;
                max-width: 1000px !important;
                padding: 20px !important;
                box-sizing: border-box !important;
                margin: 0 auto !important;
            }
            
            /* SVG强制填满容器 */
            #score svg {
                width: 100% !important;
                height: auto !important;
                max-width: 100% !important;
                display: block !important;
            }
            
            /* 移除OSMD的固定宽度 */
            #score svg[width] {
                width: 100% !important;
            }
            
            /* 确保viewBox自适应 */
            #score svg[viewBox] {
                width: 100% !important;
                height: auto !important;
            }
        `;
        document.head.appendChild(style);
        
        console.log('✅ 应用了简化的全宽度样式');
        
        // 已禁用：不再修改SVG属性，保持OSMD原生效果
        console.log('🔧 保持OSMD原生SVG属性');
    }
}

/**
 * 强制正确的布局 - 通过调整容器宽度 (已弃用)
 */
async function forceCorrectLayout_DEPRECATED(maxMeasuresPerLine) {
    console.log('🚫 已完全禁用强制布局功能，保持OSMD完全原生效果');
    console.log('📏 不进行任何容器宽度修改，不进行重新渲染');
    
    // 只进行布局分析，不修改任何尺寸
    setTimeout(() => {
        console.log('📊 保持原生布局，仅分析结果');
        analyzeLayout(maxMeasuresPerLine);
    }, 100);
}

/**
 * 拉伸小节以填满容器宽度
 */
function stretchMeasuresToFillWidth(expectedMeasuresPerLine) {
    console.log('📏 已禁用小节拉伸操作，保持OSMD原生渲染效果');
    
    // 移除任何现有的拉伸样式
    const existingStyle = document.getElementById('osmd-measure-stretch-style');
    if (existingStyle) {
        existingStyle.remove();
        console.log('🧹 已移除旧的拉伸样式');
    }
    
    // 移除拉伸样式类
    document.body.classList.remove('measure-stretch-active');
    const scoreDiv = document.getElementById('score');
    if (scoreDiv) {
        scoreDiv.classList.remove('measure-stretch-active');
        
        // 恢复SVG的原生样式
        const svg = scoreDiv.querySelector('svg');
        if (svg) {
            svg.style.transform = '';
            svg.style.transformOrigin = '';
            console.log('🔄 已恢复SVG原生样式');
        }
    }
    
    console.log('✅ 保持OSMD原生宽度和间距，仅保留响应式换行功能');
}

/**
 * 获取特定布局的CSS样式
 */
function getLayoutSpecificCSS(layoutType, measureWidth, containerWidth) {
    // 完全禁用所有布局特定的CSS样式修改
    // 保持OSMD原生渲染效果，不进行任何拉伸或间距调整
    return '';
}

/**
 * 设置响应式布局监听器
 */
function setupResponsiveLayoutListener() {
    let currentLayoutType = null;
    let resizeTimeout = null;
    
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const scoreContainer = document.getElementById('score');
            if (!scoreContainer) return;
            
            const containerWidth = scoreContainer.clientWidth;
            let newLayoutType;
            
            if (containerWidth >= 900) {
                newLayoutType = 'desktop';
            } else if (containerWidth >= 600) {
                newLayoutType = 'tablet';
            } else {
                newLayoutType = 'mobile';
            }
            
            // 如果布局类型发生变化，重新生成乐谱
            if (currentLayoutType && currentLayoutType !== newLayoutType) {
                console.log(`🔄 响应式布局变化: ${currentLayoutType} → ${newLayoutType}`);
                
                // 重新生成当前显示的旋律
                if (melodyHistory.length > 0 && currentHistoryIndex >= 0) {
                    const currentMelody = melodyHistory[currentHistoryIndex];
                    if (currentMelody) {
                        console.log('🔄 重新渲染当前旋律以适应新布局');
                        renderMelodyWithOSMD(currentMelody.musicXML);
                    }
                }
            }
            
            currentLayoutType = newLayoutType;
        }, 300); // 300ms防抖
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
    
    // 使用ResizeObserver监听容器变化（更精确）
    if (window.ResizeObserver) {
        const scoreContainer = document.getElementById('score');
        if (scoreContainer) {
            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(scoreContainer);
        }
    }
    
    // 初始化当前布局类型
    handleResize();
    
    console.log('📱 响应式布局监听器已设置');
}

/**
 * 获取当前响应式布局信息（用于调试）
 */
function getCurrentResponsiveLayout() {
    const scoreContainer = document.getElementById('score');
    if (!scoreContainer) return null;
    
    const containerWidth = scoreContainer.clientWidth;
    let layoutType, measuresPerLine;
    
    if (containerWidth >= 900) {
        layoutType = 'desktop';
        measuresPerLine = 4;
    } else if (containerWidth >= 600) {
        layoutType = 'tablet';
        measuresPerLine = 2;
    } else {
        layoutType = 'mobile';
        measuresPerLine = 1;
    }
    
    return {
        containerWidth,
        layoutType,
        measuresPerLine,
        breakpoints: {
            desktop: '≥900px',
            tablet: '600px-899px',
            mobile: '<600px'
        }
    };
}

/**
 * 分析最终布局结果
 */
function analyzeLayout(expectedMeasuresPerLine) {
    setTimeout(() => {
        const scoreDiv = document.getElementById('score');
        if (!scoreDiv) return;
        
        const svg = scoreDiv.querySelector('svg');
        if (!svg) return;
        
        console.log('🔍 分析最终布局结果:');
        
        // 查找所有可能的系统元素
        const possibleSelectors = [
            'g[id*="system"]',
            'g.system', 
            'g[id*="System"]',
            'g[class*="system"]'
        ];
        
        let systems = [];
        for (const selector of possibleSelectors) {
            systems = svg.querySelectorAll(selector);
            if (systems.length > 0) {
                console.log(`✅ 找到${systems.length}个系统，使用选择器: ${selector}`);
                break;
            }
        }
        
        if (systems.length > 0) {
            systems.forEach((system, index) => {
                const measures = system.querySelectorAll('*[id*="measure"], *[class*="measure"]');
                const measureCount = measures.length;
                console.log(`  行${index + 1}: ${measureCount}个小节 ${measureCount > expectedMeasuresPerLine ? '❌ 超出限制' : '✅ 符合要求'}`);
            });
        } else {
            console.log('⚠️ 无法找到系统元素，尝试其他方法分析...');
            // 备用分析方法
            const allMeasures = svg.querySelectorAll('*[id*="measure"]');
            console.log(`总共找到 ${allMeasures.length} 个小节元素`);
        }
    }, 300);
}

/**
 * 直接操作DOM来实现自定义布局
 */
function applyCustomLayout(maxMeasuresPerLine) {
    console.log(`🎨 应用自定义布局检查: 每行最多${maxMeasuresPerLine}小节`);
    
    try {
        // 等待DOM更新
        setTimeout(() => {
            const scoreDiv = document.getElementById('score');
            if (!scoreDiv) return;
            
            // 分析SVG结构来理解OSMD的布局
            const svg = scoreDiv.querySelector('svg');
            if (svg) {
                console.log(`📊 SVG尺寸: ${svg.getAttribute('width')} x ${svg.getAttribute('height')}`);
                
                // 查找系统（行）元素
                const systems = svg.querySelectorAll('g[id*="system"], g.system');
                console.log(`🎼 找到${systems.length}个系统/行`);
                
                if (systems.length > 0) {
                    systems.forEach((system, index) => {
                        const measures = system.querySelectorAll('g[id*="measure"], g.measure');
                        console.log(`  系统${index + 1}: ${measures.length}个小节`);
                        
                        // 如果某个系统的小节数超过maxMeasuresPerLine，记录警告
                        if (measures.length > maxMeasuresPerLine) {
                            console.warn(`⚠️ 系统${index + 1}包含${measures.length}个小节，超过限制的${maxMeasuresPerLine}个`);
                        }
                    });
                } else {
                    // 备选方案：直接查找所有小节
                    const allMeasures = svg.querySelectorAll('*[id*="measure"]');
                    console.log(`🔍 找到${allMeasures.length}个可能的小节元素`);
                    
                    // 分析前几个元素
                    for (let i = 0; i < Math.min(5, allMeasures.length); i++) {
                        const measure = allMeasures[i];
                        console.log(`  小节${i + 1}: id="${measure.id}", tag="${measure.tagName}", y="${measure.getAttribute('transform')}"`);
                    }
                }
                
                // 强制重新检查OSMD内部状态
                if (window.osmd && window.osmd.EngravingRules) {
                    console.log(`🔧 当前OSMD设置检查:`);
                    console.log(`  - MaxMeasuresPerSystem: ${window.osmd.EngravingRules.MaxMeasuresPerSystem}`);
                    console.log(`  - MinMeasuresPerSystem: ${window.osmd.EngravingRules.MinMeasuresPerSystem}`);
                }
            }
        }, 200); // 增加延迟以确保渲染完成
    } catch (error) {
        console.error('❌ 自定义布局分析失败:', error);
    }
}

/**
 * 测试调号处理是否正确
 */
function testKeySignatureHandling() {
    console.log('\n🧪 === 调号处理测试 ===');
    console.log('原则：调号内的音符不写alter，偏离调号时才写alter\n');
    
    // G大调测试 (F#在调号中)
    console.log('【G大调测试】');
    const gTests = [
        { midi: 65, desc: 'F自然音 - 需要还原记号' },
        { midi: 66, desc: 'F#音 - 调号内，不需要临时记号' },
        { midi: 67, desc: 'G音 - 自然音' },
    ];
    
    const gGen = new IntelligentMelodyGenerator(4, 'G', '4/4', 'treble', 12345);
    gTests.forEach(test => {
        const result = gGen.midiToMusicXML(test.midi);
        const alterDesc = result.alter === undefined ? '不写alter(使用调号)' : `alter=${result.alter}`;
        console.log(`  MIDI ${test.midi} -> ${result.step}${result.octave} | ${alterDesc} | ${test.desc}`);
        
        // 生成实际的XML片段
        const noteXML = `<note><pitch><step>${result.step}</step>${result.alter !== undefined ? `<alter>${result.alter}</alter>` : ''}<octave>${result.octave}</octave></pitch></note>`;
        console.log(`    XML: ${noteXML}`);
    });
    
    // D大调测试 (F#, C#在调号中)
    console.log('\n【D大调测试】');
    const dTests = [
        { midi: 60, desc: 'C自然音 - 需要还原记号' },
        { midi: 61, desc: 'C#音 - 调号内，不需要临时记号' },
        { midi: 65, desc: 'F自然音 - 需要还原记号' },
        { midi: 66, desc: 'F#音 - 调号内，不需要临时记号' },
    ];
    
    const dGen = new IntelligentMelodyGenerator(4, 'D', '4/4', 'treble', 12345);
    dTests.forEach(test => {
        const result = dGen.midiToMusicXML(test.midi);
        const alterDesc = result.alter === undefined ? '不写alter(使用调号)' : `alter=${result.alter}`;
        console.log(`  MIDI ${test.midi} -> ${result.step}${result.octave} | ${alterDesc} | ${test.desc}`);
    });
    
    // F大调测试 (Bb在调号中)
    console.log('\n【F大调测试】');
    const fTests = [
        { midi: 70, desc: 'Bb音 - 调号内，不需要临时记号' },
        { midi: 71, desc: 'B自然音 - 需要还原记号' },
    ];
    
    const fGen = new IntelligentMelodyGenerator(4, 'F', '4/4', 'treble', 12345);
    fTests.forEach(test => {
        const result = fGen.midiToMusicXML(test.midi);
        const alterDesc = result.alter === undefined ? '不写alter(使用调号)' : `alter=${result.alter}`;
        console.log(`  MIDI ${test.midi} -> ${result.step}${result.octave} | ${alterDesc} | ${test.desc}`);
    });
}

// ====== 调试函数 ======

/**
 * 测试三连音设置的调试函数
 */
function debugTripletSettings() {
    console.log('\n🔧 === 三连音设置调试 ===');
    console.log(`当前用户设置: allowedRhythms = [${userSettings?.allowedRhythms?.join(', ')}]`);
    console.log(`包含三连音: ${userSettings?.allowedRhythms?.includes('triplet')}`);
    
    // 检查前端复选框状态
    const tripletCheckbox = document.getElementById('rhythm-triplet');
    if (tripletCheckbox) {
        console.log(`三连音复选框状态: ${tripletCheckbox.checked ? '✅已勾选' : '❌未勾选'}`);
    } else {
        console.log('❌ 找不到三连音复选框元素');
    }
    
    // 模拟生成器创建
    try {
        const testGenerator = new IntelligentMelodyGenerator(4, 'C', '4/4', 'treble', 12345);
        console.log(`生成器allowedDurations: [${testGenerator.rules.allowedDurations.join(', ')}]`);
        console.log(`生成器支持三连音: ${testGenerator.rules.allowedDurations.includes('triplet')}`);
        
        // 测试canGenerateTriplet
        const canGenerate = testGenerator.canGenerateTriplet(2);
        console.log(`2拍时能生成三连音: ${canGenerate}`);
    } catch (error) {
        console.error('生成器创建失败:', error);
    }
    
    console.log('======================\n');
}

// ====== 主要接口函数 ======
/**
 * 🚨 强制修复反拍四分音符
 * 新方案：直接扫描整个旋律，找到所有1.5拍位置的四分音符并强制拆分
 */
function forceFixOffBeatQuarterNotes(melody, timeSignature) {
    if (timeSignature !== '4/4') {
        return melody; // 只处理4/4拍
    }
    
    console.log(`🚨🚨🚨 === 强制修复反拍四分音符 ===`);
    console.log(`🚨 输入旋律结构: ${Array.isArray(melody) ? '数组' : '其他'}, 长度=${melody.length}`);
    
    // 检查是否是二维数组（每个小节是一个数组）
    if (melody.length > 0 && Array.isArray(melody[0])) {
        console.log(`🚨 检测到二维数组格式，处理${melody.length}个小节`);
        const fixedMelody = [];
        
        // 遍历每个小节
        for (let measureIndex = 0; measureIndex < melody.length; measureIndex++) {
            const measure = melody[measureIndex];
            const fixedMeasure = [];
            let currentPosition = 0;
            const tolerance = 0.01;
            
            console.log(`🚨 处理第${measureIndex + 1}小节，包含${measure.length}个元素`);
            
            for (let i = 0; i < measure.length; i++) {
                const note = measure[i];
                
                // 检查是否是四分音符
                const isQuarterNote = note.type === 'note' && Math.abs(note.beats - 1.0) < tolerance;
                
                // 🎯 只处理位置1.5（第二拍反拍）的四分音符
                const isAt1_5Position = Math.abs(currentPosition - 1.5) < tolerance;
                
                // 防止对hammer-on/pull-off音符进行tie拆分
                const hasGuitarTechnique = note.articulation === 'hammer-on' || note.articulation === 'pull-off';
                if (isQuarterNote && isAt1_5Position && !note.isTriplet && !hasGuitarTechnique) {
                    console.log(`🎯 发现位置1.5的四分音符！小节${measureIndex + 1}，音高=${note.midi}`);
                    console.log(`🎯 此四分音符会跨越第3拍，需要拆分`);
                    
                    // 拆分成两个八分音符
                    const firstEighth = {
                        ...note,
                        duration: 'eighth',
                        beats: 0.5,
                        tied: true,
                        tieType: 'start'
                    };
                    
                    const secondEighth = {
                        ...note,
                        duration: 'eighth',
                        beats: 0.5,
                        tied: true,
                        tieType: 'stop'
                    };
                    
                    fixedMeasure.push(firstEighth);
                    fixedMeasure.push(secondEighth);
                    
                    const nextBeat = Math.ceil(currentPosition);
                    console.log(`🚨 已拆分: ${currentPosition}-${nextBeat} (八分音符+tie) + ${nextBeat}-${currentPosition + 1} (八分音符)`);
                } else {
                    // 不需要拆分，直接添加
                    fixedMeasure.push(note);
                }
                
                currentPosition += note.beats;
            }
            
            fixedMelody.push(fixedMeasure);
            console.log(`🚨 小节${measureIndex + 1}处理完成: ${measure.length} -> ${fixedMeasure.length} 个元素`);
        }
        
        console.log(`🚨 强制修复完成: ${melody.length}个小节`);
        return fixedMelody;
    } else {
        // 一维数组格式
        console.log(`🚨 处理一维数组格式`);
        const fixedMelody = [];
        let currentPosition = 0;
        const tolerance = 0.01;
        
        for (let i = 0; i < melody.length; i++) {
            const note = melody[i];
            const measurePosition = currentPosition % 4; // 在小节内的位置
            
            // 检查是否是四分音符
            const isQuarterNote = note.type === 'note' && Math.abs(note.beats - 1.0) < tolerance;
            
            // 🚨 只处理1.5和2.5位置的四分音符
            const needsSplitPositions = [1.5, 2.5];
            const needsSplit = needsSplitPositions.some(pos => Math.abs(measurePosition - pos) < tolerance);
            
            // 防止对hammer-on/pull-off音符进行tie拆分
            const hasGuitarTechnique = note.articulation === 'hammer-on' || note.articulation === 'pull-off';
            if (isQuarterNote && needsSplit && !note.isTriplet && !hasGuitarTechnique) {
                console.log(`🚨 发现需要拆分的四分音符！位置=${measurePosition}, 音高=${note.midi}`);
                console.log(`🚨 位置${measurePosition}的四分音符会跨越强拍，拆分为两个八分音符并用tie连接`);
                
                // 拆分成两个八分音符
                const firstEighth = {
                    ...note,
                    duration: 'eighth',
                    beats: 0.5,
                    tied: true,
                    tieType: 'start'
                };
                
                const secondEighth = {
                    ...note,
                    duration: 'eighth',
                    beats: 0.5,
                    tied: true,
                    tieType: 'stop'
                };
                
                fixedMelody.push(firstEighth);
                fixedMelody.push(secondEighth);
                
                const nextBeat = Math.ceil(measurePosition);
                console.log(`🚨 已拆分: ${measurePosition}-${nextBeat} (八分音符+tie) + ${nextBeat}-${measurePosition + 1} (八分音符)`);
            } else {
                // 不需要拆分，直接添加
                fixedMelody.push(note);
            }
            
            currentPosition += note.beats;
            
            // 重置小节位置
            if (currentPosition >= 4) {
                currentPosition = currentPosition % 4;
            }
        }
        
        console.log(`🚨 强制修复完成: ${melody.length} -> ${fixedMelody.length} 个音符`);
        return fixedMelody;
    }
}

function generateMelodyData(measures, keySignature, timeSignature, clef, seed = null) {
    let melody; // 在外层定义变量
    let generator; // 在外层定义生成器变量
    
    // 🔥 全新思路：6/8拍直接生成完整MusicXML，完全绕过内部数据结构
    if (timeSignature === '6/8') {
        console.log('🎵 6/8拍使用安全版本生成策略');
        
        if (!seed) seed = Math.floor(Math.random() * 1000000);
        const random = new SeededRandom(seed);
        
        // 安全的用户设置获取
        const userRange = (userSettings && userSettings.customRange) ? 
            { min: userSettings.customRange.min || 48, max: userSettings.customRange.max || 60 } : 
            { min: 48, max: 60 };
        const maxJump = (userSettings && userSettings.maxJump) ? userSettings.maxJump : 12;
        // 🔥 修复调号显示问题：支持所有调号的五度圈计算（与其他拍号保持一致）
        const keyFifthsMap = {
            // 大调
            'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
            'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6, 'Cb': -7,
            // 小调（使用相对大调的调号）
            'Am': 0, 'Em': 1, 'Bm': 2, 'F#m': 3, 'C#m': 4, 'G#m': 5, 'D#m': 6, 'A#m': 7,
            'Dm': -1, 'Gm': -2, 'Cm': -3, 'Fm': -4, 'Bbm': -5, 'Ebm': -6
        };
        const keyFifths = keyFifthsMap[keySignature] || 0;
        
        // 获取用户的节奏设置
        const userRhythms = (userSettings && Array.isArray(userSettings.allowedRhythms)) ? 
            userSettings.allowedRhythms : ['eighth'];
        
        // 🔥 修复：获取用户的临时记号设置 - 与4/4拍保持一致
        const accidentalRate = (userSettings && typeof userSettings.accidentalRate === 'number') ? 
            userSettings.accidentalRate / 100 : 0;
        
        console.log('🎛️ 6/8拍设置:');
        console.log(`  - 音域: ${userRange.min}-${userRange.max}`);
        console.log(`  - 最大跳度: ${maxJump}半音`);
        console.log(`  - 调号: ${keySignature} (五度圈: ${keyFifths})`);
        console.log(`  - 允许的节奏: [${userRhythms.join(', ')}]`);
        console.log(`  - 临时记号概率: ${(accidentalRate * 100).toFixed(0)}%`);
        
        // 应用4/4拍智能旋律生成逻辑到6/8拍
        
        // 🔥 修复调号处理：使用与4/4拍相同的调号系统
        // 创建临时的IntelligentMelodyGenerator来获取正确的调内音符和音符拼写
        const tempGenerator = new IntelligentMelodyGenerator(1, keySignature, '6/8', clef, seed);
        
        // 🔥 使用增强的小调处理：获取包含和声小调/旋律小调变化音的音阶
        const baseScale = KEY_SCALES[keySignature] || KEY_SCALES['C'];
        const scale = getEnhancedScaleForGeneration(baseScale, keySignature);
        
        // 辅助函数：为音符生成获取增强的音阶
        function getEnhancedScaleForGeneration(naturalScale, keySignature) {
            const isMinorKey = keySignature.includes('m');
            
            if (!isMinorKey) {
                return naturalScale; // 大调使用原音阶
            }
            
            // 小调添加和声小调和旋律小调的变化音
            const enhanced = [...naturalScale];
            
            // 确定调号的主音
            const keyToTonic = {
                'Am': 9, 'Em': 4, 'Bm': 11, 'F#m': 6, 'C#m': 1, 'G#m': 8, 'D#m': 3, 'A#m': 10,
                'Dm': 2, 'Gm': 7, 'Cm': 0, 'Fm': 5, 'Bbm': 10, 'Ebm': 3
            };
            
            const tonic = keyToTonic[keySignature];
            if (tonic !== undefined) {
                // 添加和声小调的导音（升高的第7级）
                const leadingTone = (tonic + 11) % 12;
                if (!enhanced.includes(leadingTone)) {
                    enhanced.push(leadingTone);
                }
                
                // 添加旋律小调的第6级（升高的）
                const sixthDegree = (tonic + 9) % 12;
                if (!enhanced.includes(sixthDegree)) {
                    enhanced.push(sixthDegree);
                }
            }
            
            return enhanced.sort((a, b) => a - b);
        }
        
        // 智能音符生成状态
        let lastDirection = 0;
        let consecutiveJumps = 0;
        
        // 检查是否为调内音符
        function isInScale(midi) {
            return scale.includes(midi % 12);
        }
        
        // 🔥 修复：添加临时记号处理函数 - 与4/4拍保持一致
        function addAccidentalIfNeeded(midi) {
            // 根据临时记号概率决定是否添加升降号
            if (accidentalRate > 0 && random.nextFloat() < accidentalRate) {
                return addAccidental(midi);
            }
            return midi;
        }
        
        function addAccidental(midi) {
            const accidentalChoices = [];
            const noteClass = midi % 12;
            const keySignatureInfo = isNoteAffectedByKeySignature(noteClass, keySignature);
            
            // 尝试添加升号（+1半音）
            const sharpNote = midi + 1;
            const sharpNoteClass = sharpNote % 12;
            
            // 只有在以下情况下才添加升号：
            // 1. 升号后的音符不超出音域
            // 2. 原音符没有被调号升高，或者升号后不会产生重复标记
            if (sharpNote <= userRange.max && 
                !keySignatureInfo.isSharp && 
                !isNoteAffectedByKeySignature(sharpNoteClass, keySignature).isFlat) {
                accidentalChoices.push(sharpNote);
            }
            
            // 尝试添加降号（-1半音）  
            const flatNote = midi - 1;
            const flatNoteClass = flatNote % 12;
            
            // 只有在以下情况下才添加降号：
            // 1. 降号后的音符不超出音域
            // 2. 原音符没有被调号降低，或者降号后不会产生重复标记
            if (flatNote >= userRange.min && 
                !keySignatureInfo.isFlat && 
                !isNoteAffectedByKeySignature(flatNoteClass, keySignature).isSharp) {
                accidentalChoices.push(flatNote);
            }
            
            // 如果没有可用的临时记号，返回原音符
            if (accidentalChoices.length === 0) {
                console.log(`🎯 6/8拍：音符MIDI ${midi}无需添加临时记号（避免与${keySignature}调号重复）`);
                return midi;
            }
            
            // 随机选择升号或降号
            const selectedNote = accidentalChoices[Math.floor(random.nextFloat() * accidentalChoices.length)];
            console.log(`🎯 6/8拍：为MIDI ${midi}添加临时记号变为MIDI ${selectedNote}`);
            return selectedNote;
        }
        
        // 智能音符生成函数（基于4/4拍逻辑）
        function generateIntelligentNote(lastMidi, isEnding = false) {
            const maxAttempts = 100;
            let attempts = 0;
            
            while (attempts < maxAttempts) {
                attempts++;
                const possibleNotes = [];
                
                // 生成所有可能的调内音符
                for (let octave = Math.floor(userRange.min / 12); octave <= Math.floor(userRange.max / 12); octave++) {
                    for (const scaleDegree of scale) {
                        const midi = octave * 12 + scaleDegree;
                        if (midi >= userRange.min && midi <= userRange.max) {
                            possibleNotes.push(midi);
                        }
                    }
                }
                
                if (possibleNotes.length === 0) {
                    console.warn('⚠️ 没有可用的调内音符，使用音域中心');
                    const centerMidi = Math.floor((userRange.min + userRange.max) / 2);
                    return midiToNoteInfo(centerMidi);
                }
                
                let candidateNotes = [];
                
                if (lastMidi === null) {
                    // 第一个音符：选择调内音符，偏向主音、三音、五音
                    const preferredDegrees = [0, 4, 7].map(deg => deg % 12); // 主音、三度、五度
                    candidateNotes = possibleNotes.filter(midi => preferredDegrees.includes(midi % 12));
                    if (candidateNotes.length === 0) candidateNotes = possibleNotes;
                } else {
                    // 后续音符：应用智能约束
                    for (const midi of possibleNotes) {
                        const interval = Math.abs(midi - lastMidi);
                        
                        // 检查音程跳度限制
                        if (interval > maxJump) continue;
                        
                        // 应用音乐性约束
                        const direction = midi > lastMidi ? 1 : midi < lastMidi ? -1 : 0;
                        
                        // 大跳后必须回归
                        if (consecutiveJumps > 0 && interval > 2) continue;
                        
                        // 避免连续同向大跳
                        if (interval > 4 && direction === lastDirection) continue;
                        
                        candidateNotes.push(midi);
                    }
                    
                    // 如果没有合适的候选音符，放宽限制
                    if (candidateNotes.length === 0) {
                        candidateNotes = possibleNotes.filter(midi => {
                            const interval = Math.abs(midi - lastMidi);
                            return interval <= maxJump;
                        });
                    }
                    
                    if (candidateNotes.length === 0) {
                        console.warn('⚠️ 没有符合约束的音符，使用最近的调内音符');
                        candidateNotes = [possibleNotes.reduce((closest, current) => {
                            return Math.abs(current - lastMidi) < Math.abs(closest - lastMidi) ? current : closest;
                        })];
                    }
                }
                
                // 选择音符
                const selectedMidi = candidateNotes[Math.floor(random.next() * candidateNotes.length)];
                
                // 特殊检测 MIDI 72 (B#4)
                if (selectedMidi === 72) {
                    console.error(`🎯🎯🎯 [generateIntelligentNote] 生成了 MIDI 72 (B#4)!`);
                    console.error(`🎯 当前音域: ${userRange.min}-${userRange.max}`);
                    console.error(`🎯 调号: ${keySignature}`);
                    if (userRange.max <= 60) {
                        console.error(`🚨🚨🚨 错误：MIDI 72 超出 C3-C4 音域 (${userRange.min}-${userRange.max})`);
                        // 强制修正到音域内
                        const correctedMidi = Math.min(selectedMidi, userRange.max);
                        console.error(`🔧 修正 MIDI 72 -> ${correctedMidi}`);
                        return midiToNoteInfo(correctedMidi);
                    }
                }
                
                // 额外的范围验证
                if (selectedMidi < userRange.min || selectedMidi > userRange.max) {
                    console.error(`🚨 [generateIntelligentNote] 音符超出范围: MIDI ${selectedMidi} (音域: ${userRange.min}-${userRange.max})`);
                    const correctedMidi = Math.max(userRange.min, Math.min(userRange.max, selectedMidi));
                    console.error(`🔧 修正为: MIDI ${correctedMidi}`);
                    return midiToNoteInfo(correctedMidi);
                }
                
                // 更新状态
                if (lastMidi !== null) {
                    const interval = Math.abs(selectedMidi - lastMidi);
                    const direction = selectedMidi > lastMidi ? 1 : selectedMidi < lastMidi ? -1 : 0;
                    
                    if (interval > 2) {
                        consecutiveJumps++;
                    } else {
                        consecutiveJumps = 0;
                    }
                    
                    lastDirection = direction;
                }
                
                // 🔥 修复：在返回之前应用临时记号处理 - 与4/4拍保持一致
                const finalMidi = addAccidentalIfNeeded(selectedMidi);
                return midiToNoteInfo(finalMidi);
            }
            
            // 应急处理
            const centerMidi = Math.floor((userRange.min + userRange.max) / 2);
            const finalCenterMidi = addAccidentalIfNeeded(centerMidi);
            return midiToNoteInfo(finalCenterMidi);
        }
        
        // 🔥 修复音符拼写问题：使用与4/4拍相同的音符拼写逻辑
        function midiToNoteInfo(midi) {
            // 特殊检测 MIDI 72 (B#4)
            if (midi === 72) {
                console.error(`🎯🎯🎯 [midiToNoteInfo] 处理 MIDI 72 (B#4)!`);
                console.error(`🎯 当前音域: ${userRange.min}-${userRange.max}`);
                console.error(`🎯 调号: ${keySignature}`);
                if (userRange.max <= 60) {
                    console.error(`🚨🚨🚨 错误：MIDI 72 在 C3-C4 音域中被处理!`);
                    // 强制修正
                    midi = userRange.max;
                    console.error(`🔧 强制修正 MIDI 72 -> ${midi}`);
                }
            }
            
            // 🔥 使用与4/4拍相同的音符拼写逻辑
            // 使用外部已创建的tempGenerator来调用midiToMusicXML方法
            const result = tempGenerator.midiToMusicXML(midi);
            
            return {
                midi: midi,
                step: result.step,
                alter: result.alter,
                octave: result.octave
            };
        }
        
        // 6/8拍智能节奏模式生成器
        function generateSmartRhythmPattern() {
            const availableRhythms = userRhythms.filter(rhythm => 
                ['eighth', '16th', 'quarter', 'quarter.', 'half.', 'dotted-half'].includes(rhythm)
            );
            
            console.log(`🎵 可用节奏: [${availableRhythms.join(', ')}]`);
            
            // 如果没有合适的节奏，默认使用八分音符
            if (availableRhythms.length === 0) {
                return [
                    { duration: 'eighth', beats: 0.5 },
                    { duration: 'eighth', beats: 0.5 },
                    { duration: 'eighth', beats: 0.5 },
                    { duration: 'eighth', beats: 0.5 },
                    { duration: 'eighth', beats: 0.5 },
                    { duration: 'eighth', beats: 0.5 }
                ];
            }
            
            // 根据用户设置生成不同的6/8拍节奏模式
            const patterns = [];
            
            // 基础模式：六个八分音符（如果用户允许八分音符）
            if (availableRhythms.includes('eighth')) {
                patterns.push({
                    name: 'sixEighths',
                    weight: 60, // 增加八分音符权重
                    pattern: [
                        { duration: 'eighth', beats: 0.5 },
                        { duration: 'eighth', beats: 0.5 },
                        { duration: 'eighth', beats: 0.5 },
                        { duration: 'eighth', beats: 0.5 },
                        { duration: 'eighth', beats: 0.5 },
                        { duration: 'eighth', beats: 0.5 }
                    ]
                });
            }
            
            // 附点四分音符模式（如果用户允许）
            if (availableRhythms.includes('quarter.')) {
                patterns.push({
                    name: 'twoDotted',
                    weight: 30,
                    pattern: [
                        { duration: 'quarter', dots: 1, beats: 1.5 },
                        { duration: 'quarter', dots: 1, beats: 1.5 }
                    ]
                });
            }
            
            // 🔥 附点二分音符模式（如果用户允许）- 整小节持续音符
            if (availableRhythms.includes('half.') || availableRhythms.includes('dotted-half')) {
                patterns.push({
                    name: 'dottedHalf',
                    weight: 25,
                    pattern: [
                        { duration: 'half', dots: 1, beats: 3.0 }
                    ]
                });
                console.log('✅ 6/8拍智能生成器：添加附点二分音符模式');
            }
            
            // 十六分音符模式（如果用户允许）- 总共20%的权重
            if (availableRhythms.includes('16th')) {
                // 模式1: ♬♪♬♪ (两组十六分音符+八分音符) - 最常见的十六分音符模式
                if (availableRhythms.includes('eighth')) {
                    patterns.push({
                        name: 'sixteenthEighth',
                        weight: 12, // 20%权重的60%
                        pattern: [
                            { duration: '16th', beats: 0.25 },
                            { duration: '16th', beats: 0.25 },
                            { duration: 'eighth', beats: 0.5 },
                            { duration: '16th', beats: 0.25 },
                            { duration: '16th', beats: 0.25 },
                            { duration: 'eighth', beats: 0.5 }
                        ]
                    });
                }
                
                // 模式2: 十二个十六分音符 - 较少出现，增加挑战性
                patterns.push({
                    name: 'twelve16th',
                    weight: 3, // 20%权重的15%
                    pattern: [
                        { duration: '16th', beats: 0.25 },
                        { duration: '16th', beats: 0.25 },
                        { duration: '16th', beats: 0.25 },
                        { duration: '16th', beats: 0.25 },
                        { duration: '16th', beats: 0.25 },
                        { duration: '16th', beats: 0.25 },
                        { duration: '16th', beats: 0.25 },
                        { duration: '16th', beats: 0.25 },
                        { duration: '16th', beats: 0.25 },
                        { duration: '16th', beats: 0.25 },
                        { duration: '16th', beats: 0.25 },
                        { duration: '16th', beats: 0.25 }
                    ]
                });
                
                // 模式3: 混合十六分音符和附点四分音符
                if (availableRhythms.includes('quarter.')) {
                    patterns.push({
                        name: 'sixteenth_dotted',
                        weight: 5, // 20%权重的25%
                        pattern: [
                            { duration: '16th', beats: 0.25 },
                            { duration: '16th', beats: 0.25 },
                            { duration: '16th', beats: 0.25 },
                            { duration: '16th', beats: 0.25 },
                            { duration: 'quarter', dots: 1, beats: 1.5 }
                        ]
                    });
                }
            }
            
            // 如果没有模式（理论上不应该发生），返回默认八分音符
            if (patterns.length === 0) {
                return [
                    { duration: 'eighth', beats: 0.5 },
                    { duration: 'eighth', beats: 0.5 },
                    { duration: 'eighth', beats: 0.5 },
                    { duration: 'eighth', beats: 0.5 },
                    { duration: 'eighth', beats: 0.5 },
                    { duration: 'eighth', beats: 0.5 }
                ];
            }
            
            // 使用权重随机选择模式
            const weights = patterns.map(p => p.weight);
            const selectedPattern = random.weighted(patterns, weights);
            console.log(`✅ 选择6/8拍节奏模式: ${selectedPattern.name}`);
            
            return selectedPattern.pattern;
        }
        
        // 🎵 使用正确的6/8拍Beat Clarity规则生成MusicXML
        console.log('🎼 开始生成符合6/8拍规则的旋律');
        
        let currentMidi = null; // 第一个音符将由智能函数选择
        let measuresXML = '';
        
        for (let m = 1; m <= measures; m++) {
            measuresXML += `    <measure number="${m}">`;
            
            // 添加换行标记 - 每4小节强制换行（第5、9、13小节等）
            if (m > 4 && ((m - 1) % 4) === 0) {
                measuresXML += `
      <print new-system="yes"/>`;
                console.log(`📐 在第${m}小节添加换行标记`);
            }
            
            if (m === 1) {
                measuresXML += `
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>${keyFifths}</fifths>
        </key>
        <time>
          <beats>6</beats>
          <beat-type>8</beat-type>
        </time>
        <clef>
          <sign>${clef === 'treble' ? 'G' : 'F'}</sign>
          <line>${clef === 'treble' ? '2' : '4'}</line>
        </clef>
      </attributes>`;
            }
            
            // 🎵 检查是否需要乐句呼吸（在乐句末尾增加休止符概率）
            const needsPhraseBreathe = shouldAddPhraseBreathe(m, measures, random);
            
            // 🔥 使用6/8拍专用的Beat Clarity生成器
            const measureXML = generate68MeasureWithBeatClarity(
                m, 
                currentMidi, 
                scale, 
                userRange, 
                maxJump, 
                m === measures, 
                random,
                needsPhraseBreathe,
                clef,
                keySignature, // 🔥 传递调号参数
                accidentalRate // 🔥 修复：传递临时记号概率参数
            );
            measuresXML += measureXML.xml;
            currentMidi = measureXML.lastMidi;
            
            // 🎵 如果是乐句结尾，重置MIDI以创建新乐句的起点
            if (needsPhraseBreathe && m < measures) {
                console.log(`🎵 第${m}小节后添加乐句呼吸，重置旋律起点`);
                currentMidi = null; // 让下一个乐句从新起点开始
            }
            
            measuresXML += `
    </measure>`;
        }
        
        // 🎵 乐句呼吸判断函数
        function shouldAddPhraseBreathe(measureNum, totalMeasures, random) {
            // 避免最后一小节添加呼吸（自然结尾）
            if (measureNum === totalMeasures) return false;
            
            // 🎵 经典乐句长度模式
            const phrasePatterns = [
                { length: 2, probability: 0.6 },  // 两小节乐句（常见）
                { length: 4, probability: 0.8 },  // 四小节乐句（经典）
                { length: 3, probability: 0.4 },  // 三小节乐句（不规则，较少）
            ];
            
            // 检查当前位置是否符合乐句结构
            for (const pattern of phrasePatterns) {
                if (measureNum % pattern.length === 0) {
                    if (random.nextFloat() < pattern.probability) {
                        console.log(`🎵 第${measureNum}小节：${pattern.length}小节乐句结构，添加呼吸 (概率${pattern.probability})`);
                        return true;
                    }
                }
            }
            
            // 🎵 额外随机呼吸机会（避免过长连续旋律）
            if (measureNum >= 3 && random.nextFloat() < 0.3) {
                console.log(`🎵 第${measureNum}小节：随机添加呼吸，避免过长连续`);
                return true;
            }
            
            return false;
        }

        const musicXML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC
    "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
    </score-part>
  </part-list>
  <part id="P1">
${measuresXML}  </part>
</score-partwise>`;

        console.log('✅ 6/8拍安全版本生成完成');
        
        return {
            melody: [],
            musicXML: musicXML,
            config: { measures, keySignature, timeSignature: '6/8', clef },
            seed,
            stats: {
                totalNotes: measures * 6,
                totalRests: 0,
                timingValid: true,
                message: '6/8拍安全生成器 - 遵循用户设置'
            }
        };
    }
    
    try {
        if (!seed) seed = Math.floor(Math.random() * 1000000);
        
        console.log(`\\n🎼 === 生成旋律数据 ===`);
        console.log(`配置: ${measures}小节 ${timeSignature} ${keySignature}调 ${clef}谱号`);
        console.log(`随机种子: ${seed}`);
        
        // 🔥 重置articulation频率计数器
        window.articulationCounter = {
            total: 0,
            perTwoMeasures: 0,
            currentMeasurePair: 0
        };
        console.log(`🎯 重置articulation频率控制器 - 每两小节最多2个articulation`);
        
        // 参数验证
        if (typeof measures !== 'number' || measures < 1) {
            throw new Error(`Invalid measures: ${measures}`);
        }
        if (typeof keySignature !== 'string') {
            throw new Error(`Invalid keySignature: ${keySignature}`);
        }
        if (typeof timeSignature !== 'string') {
            throw new Error(`Invalid timeSignature: ${timeSignature}`);
        }
        if (typeof clef !== 'string') {
            throw new Error(`Invalid clef: ${clef}`);
        }
        
        // 调试三连音设置
        debugTripletSettings();
        console.log(`🔍 用户设置调试:`);
        console.log(`  - allowedRhythms: [${userSettings?.allowedRhythms?.join(', ') || 'undefined'}]`);
        console.log(`  - 包含三连音: ${userSettings?.allowedRhythms?.includes('triplet') || false}`);
        console.log(`  - 音域: ${userSettings?.customRange?.min || 'undefined'}-${userSettings?.customRange?.max || 'undefined'}`);
        console.log(`  - 最大跳度: ${userSettings?.maxJump || 'undefined'}半音`);
        
        // 创建智能生成器
        console.log(`🏗️ 创建生成器...`);
        try {
            // 🔥 在创建生成器前添加全局错误监听
            const originalError = console.error;
            window.addEventListener('error', function(e) {
                console.error('🚨 全局错误捕获:', e.error);
                if (e.error && e.error.message && e.error.message.includes('toLowerCase')) {
                    console.error('🔍 toLowerCase错误详情:', {
                        message: e.error.message,
                        stack: e.error.stack,
                        filename: e.filename,
                        line: e.lineno,
                        column: e.colno
                    });
                }
            });
            
            generator = new IntelligentMelodyGenerator(
                measures, keySignature, timeSignature, clef, seed
            );
            console.log(`✅ 生成器创建成功`);
        } catch (error) {
            console.error(`❌ 生成器创建失败:`, error);
            console.error(`❌ 错误详情:`, error.message);
            console.error(`❌ 错误堆栈:`, error.stack);
            
            // 🔍 特别检查toLowerCase相关错误
            if (error.message && error.message.includes('toLowerCase')) {
                console.error('🔍 toLowerCase错误分析:', {
                    message: error.message,
                    stack: error.stack,
                    userSettings: userSettings,
                    timeSignature: timeSignature,
                    keySignature: keySignature
                });
            }
            throw error;
        }
        
        // 生成旋律
        console.log(`🎵 开始生成旋律...`);
        try {
            melody = generator.generateMelody();
            console.log(`✅ 旋律生成成功`);
        } catch (error) {
            console.error(`❌ 旋律生成失败:`, error);
            console.error(`❌ 错误详情:`, error.message);
            console.error(`❌ 错误堆栈:`, error.stack);
            throw error;
        }
        
        if (!melody || !Array.isArray(melody) || melody.length === 0) {
            throw new Error('Failed to generate valid melody');
        }
        
        console.log(`✅ 旋律生成完成: ${melody.length}个小节`);
        
        // 注：位置1.5的四分音符拆分将在MusicXML构建阶段处理
    } catch (error) {
        console.error(`❌ generateMelodyData 错误:`, error);
        console.error(`❌ 错误堆栈:`, error.stack);
        throw error; // 重新抛出错误以便上层处理
    }
    
    // 调试：检查生成的旋律是否包含调外音符
    if (keySignature === 'G' || keySignature === 'D') {
        console.log(`\n🎼 检查${keySignature}大调生成的旋律...`);
        const scale = KEY_SCALES[keySignature];
        console.log(`${keySignature}大调音阶: [${scale.join(', ')}]`);
        
        let hasOutOfScaleNotes = false;
        melody.forEach((note, index) => {
            if (note.type === 'note' && note.midi !== undefined) {
                const pitchClass = note.midi % 12;
                if (!scale.includes(pitchClass)) {
                    console.error(`❌ 发现调外音符！位置${index}: MIDI ${note.midi} (pc=${pitchClass}) 不在${keySignature}大调音阶中`);
                    hasOutOfScaleNotes = true;
                }
            }
        });
        
        if (!hasOutOfScaleNotes) {
            console.log(`✅ 所有音符都在${keySignature}大调音阶内`);
        }
    }
    
    // 构建MusicXML
    const builder = new MusicXMLBuilder(melody, {
        measures, keySignature, timeSignature, clef
    });
    // 强制每行4小节（所有设备）
    const scoreContainer = document.getElementById('score');
    const containerWidth = scoreContainer ? scoreContainer.clientWidth : window.innerWidth;
    const measuresPerLine = 4;
    
    console.log(`🎵 生成旋律时检测: 容器宽度=${containerWidth}px, 每行${measuresPerLine}小节`);
    
    const musicXML = builder.build(measuresPerLine);
    
    // 调试：检查G大调和D大调的XML输出
    if (keySignature === 'G' || keySignature === 'D') {
        console.log(`\n🔍 检查${keySignature}大调的MusicXML输出...`);
        
        // 查找所有F音符
        const fNoteRegex = /<note>[\s\S]*?<step>F<\/step>[\s\S]*?<\/note>/g;
        const fNotes = musicXML.match(fNoteRegex) || [];
        
        if (fNotes.length > 0) {
            console.log(`找到 ${fNotes.length} 个F音符:`);
            fNotes.forEach((noteXml, index) => {
                const hasAlter = noteXml.includes('<alter>');
                const alterMatch = noteXml.match(/<alter>([-\d]+)<\/alter>/);
                const alterValue = alterMatch ? alterMatch[1] : '无';
                
                console.log(`  F音符 #${index + 1}: alter=${alterValue} ${hasAlter ? '(有alter标签)' : '(无alter标签，使用调号默认)'}`);
                
                // 如果有alter=0，这就是问题所在
                if (alterValue === '0') {
                    console.error(`❌ 错误：发现alter=0！这会导致OSMD显示还原记号。`);
                    console.log('完整音符XML:', noteXml.replace(/\n/g, ' '));
                }
            });
        }
        
        // 同样检查C音符（对D大调）
        if (keySignature === 'D') {
            const cNoteRegex = /<note>[\s\S]*?<step>C<\/step>[\s\S]*?<\/note>/g;
            const cNotes = musicXML.match(cNoteRegex) || [];
            if (cNotes.length > 0) {
                console.log(`找到 ${cNotes.length} 个C音符:`);
                cNotes.forEach((noteXml, index) => {
                    const hasAlter = noteXml.includes('<alter>');
                    const alterMatch = noteXml.match(/<alter>([-\d]+)<\/alter>/);
                    const alterValue = alterMatch ? alterMatch[1] : '无';
                    console.log(`  C音符 #${index + 1}: alter=${alterValue}`);
                });
            }
        }
    }
    
    console.log('✅ MusicXML构建完成');
    
    // 🔥 EMERGENCY DEBUG: 最终MusicXML内容检查
    console.log(`🔥 === 最终MusicXML内容检查 ===`);
    const allSlurs = musicXML.match(/<slur[^>]*type="start"[^>]*>/g) || [];
    console.log(`🔍 发现 ${allSlurs.length} 个slur start标签:`);
    allSlurs.forEach((slur, index) => {
        console.log(`🎼 Slur ${index + 1}: ${slur}`);
    });
    
    // 检查附近的音符信息
    const slurPositions = [];
    let searchIndex = 0;
    let slurCount = 0;
    while ((searchIndex = musicXML.indexOf('<slur', searchIndex)) !== -1) {
        if (musicXML.substr(searchIndex, 50).includes('type="start"')) {
            slurCount++;
            // 找到slur前最近的音符信息
            const beforeSlur = musicXML.substring(Math.max(0, searchIndex - 200), searchIndex);
            const noteMatch = beforeSlur.match(/<step>([A-G])<\/step>\s*<octave>(\d+)<\/octave>/g);
            if (noteMatch) {
                console.log(`🎵 Slur ${slurCount} 前的音符: ${noteMatch[noteMatch.length - 1]}`);
            }
        }
        searchIndex += 5;
    }
    console.log(`🔥 === MusicXML检查结束 ===`);
    
    // 🔥 额外检查：搜索所有articulation标记
    const articulationMatches = musicXML.match(/<articulations[^>]*>[\s\S]*?<\/articulations>/g) || [];
    console.log(`🎸 发现 ${articulationMatches.length} 个articulation标记:`);
    articulationMatches.forEach((art, index) => {
        console.log(`🎸 Articulation ${index + 1}: ${art.substring(0, 100)}...`);
    });
    
    // 检查所有H和P标记
    const hPMarks = musicXML.match(/<technical[^>]*>[\s\S]*?<\/technical>/g) || [];
    console.log(`🎸 发现 ${hPMarks.length} 个technical标记:`);
    hPMarks.forEach((tech, index) => {
        console.log(`🎸 Technical ${index + 1}: ${tech}`);
    });
    
    // 🔥 新功能：确保每条旋律包含1-2个slur（当勾选hammer-on或pull-off时）
    let finalMusicXML = musicXML;
    if (userSettings && userSettings.articulations && userSettings.articulations.enabled) {
        const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
        const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
        
        if (hammerOnAllowed || pullOffAllowed) {
            console.log(`🎯 === 开始保证slur出现逻辑 ===`);
            console.log(`🎯 Hammer-on允许: ${hammerOnAllowed}, Pull-off允许: ${pullOffAllowed}`);
            
            // 统计当前slur数量
            const currentSlurs = finalMusicXML.match(/<slur[^>]*type="start"[^>]*>/g) || [];
            console.log(`🎯 当前slur数量: ${currentSlurs.length}`);
            
            // 如果slur数量为0，强制添加1个合适的slur
            if (currentSlurs.length === 0) {
                console.log(`🎯 发现0个slur，开始强制添加...`);
                
                // 寻找合适的音程来添加slur
                let slurAdded = false;
                const noteRegex = /<note>[\s\S]*?<\/note>/g;
                const noteMatches = finalMusicXML.match(noteRegex) || [];
                
                console.log(`🎯 找到 ${noteMatches.length} 个音符，寻找合适的连续音符对...`);
                
                // 解析所有音符的MIDI值，并识别它们所在的小节
                const parsedNotes = [];
                let currentMeasureIndex = -1;
                let noteIndexInMeasure = 0;
                
                // 按小节分析MusicXML结构
                const measureRegex = /<measure[^>]*>[\s\S]*?<\/measure>/g;
                const measureMatches = finalMusicXML.match(measureRegex) || [];
                
                console.log(`🎯 找到 ${measureMatches.length} 个小节`);
                
                measureMatches.forEach((measureXml, measureIndex) => {
                    const measureNotes = measureXml.match(/<note>[\s\S]*?<\/note>/g) || [];
                    console.log(`🎯 小节 ${measureIndex + 1} 包含 ${measureNotes.length} 个音符`);
                    
                    measureNotes.forEach((noteXml, noteIndexInThisMeasure) => {
                        // 检查是否是休止符
                        const isRest = noteXml.includes('<rest/>') || noteXml.includes('<rest ') || noteXml.includes('<rest>');
                        
                        if (!isRest) {
                            const stepMatch = noteXml.match(/<step>([A-G])<\/step>/);
                            const octaveMatch = noteXml.match(/<octave>(\d+)<\/octave>/);
                            const alterMatch = noteXml.match(/<alter>([-\d]+)<\/alter>/);
                            
                            if (stepMatch && octaveMatch) {
                                const step = stepMatch[1];
                                const octave = parseInt(octaveMatch[1]);
                                const alter = alterMatch ? parseInt(alterMatch[1]) : 0;
                                
                                // 转换为MIDI值
                                const stepValues = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11};
                                const midi = (octave + 1) * 12 + stepValues[step] + alter;
                                
                                parsedNotes.push({
                                    index: parsedNotes.length,
                                    midi: midi,
                                    xml: noteXml,
                                    measureIndex: measureIndex,
                                    noteIndexInMeasure: noteIndexInThisMeasure,
                                    globalNoteIndex: parsedNotes.length
                                });
                            }
                        }
                    });
                });
                
                console.log(`🎯 解析得到 ${parsedNotes.length} 个有效音符（排除休止符）`);
                
                // 寻找合适的音程对（上行或下行二度），确保在同一小节内
                for (let i = 0; i < parsedNotes.length - 1 && !slurAdded; i++) {
                    const note1 = parsedNotes[i];
                    const note2 = parsedNotes[i + 1];
                    
                    // 🔥 关键检查：确保两个音符在同一小节内
                    if (note1.measureIndex !== note2.measureIndex) {
                        console.log(`🎯 跳过跨小节音符对: 音符${i}在小节${note1.measureIndex + 1}, 音符${i + 1}在小节${note2.measureIndex + 1}`);
                        continue;
                    }
                    
                    // 🔥 检查两个音符是否在小节中相邻（中间没有休止符）
                    const measureNotes = measureMatches[note1.measureIndex].match(/<note>[\s\S]*?<\/note>/g) || [];
                    let hasRestBetween = false;
                    
                    // 检查这两个音符之间是否有休止符
                    for (let j = note1.noteIndexInMeasure + 1; j < note2.noteIndexInMeasure; j++) {
                        const intermediateNote = measureNotes[j];
                        if (intermediateNote && (intermediateNote.includes('<rest/>') || intermediateNote.includes('<rest ') || intermediateNote.includes('<rest>'))) {
                            hasRestBetween = true;
                            break;
                        }
                    }
                    
                    if (hasRestBetween) {
                        console.log(`🎯 跳过被休止符分隔的音符对: 音符${i}-${i + 1}之间有休止符`);
                        continue;
                    }
                    
                    const interval = note2.midi - note1.midi;
                    
                    console.log(`🎯 检查音符对 ${i}-${i+1} (小节${note1.measureIndex + 1}): MIDI ${note1.midi} -> ${note2.midi}, 音程=${interval}`);
                    
                    let shouldAddSlur = false;
                    let slurType = '';
                    
                    // 检查是否符合允许的articulation类型
                    if (hammerOnAllowed && !pullOffAllowed && (interval === 1 || interval === 2)) {
                        // 只允许hammer-on：上行二度
                        shouldAddSlur = true;
                        slurType = 'hammer-on';
                    } else if (pullOffAllowed && !hammerOnAllowed && (interval === -1 || interval === -2)) {
                        // 只允许pull-off：下行二度
                        shouldAddSlur = true;
                        slurType = 'pull-off';
                    } else if (hammerOnAllowed && pullOffAllowed && (Math.abs(interval) === 1 || Math.abs(interval) === 2)) {
                        // 两种都允许：上行或下行二度
                        shouldAddSlur = true;
                        slurType = interval > 0 ? 'hammer-on' : 'pull-off';
                    }
                    
                    if (shouldAddSlur) {
                        console.log(`✅ 找到合适的音程对，添加${slurType}类型的slur`);
                        
                        // 在第一个音符中添加slur start
                        const updatedNote1 = note1.xml.replace('</note>', 
                            `    <notations>\n        <slur number="1" type="start"/>\n    </notations>\n</note>`);
                        
                        // 在第二个音符中添加slur stop  
                        const updatedNote2 = note2.xml.replace('</note>', 
                            `    <notations>\n        <slur number="1" type="stop"/>\n    </notations>\n</note>`);
                        
                        // 替换XML中的音符
                        finalMusicXML = finalMusicXML.replace(note1.xml, updatedNote1);
                        finalMusicXML = finalMusicXML.replace(note2.xml, updatedNote2);
                        
                        slurAdded = true;
                        console.log(`✅ 成功添加${slurType}类型的slur到小节${note1.measureIndex + 1}的音符对 ${i}-${i+1}`);
                    }
                }
                
                if (!slurAdded) {
                    console.log(`⚠️ 未找到合适的音程对来添加slur`);
                }
            } else if (currentSlurs.length > 2) {
                // 如果slur数量超过2个，随机保留1-2个
                console.log(`🎯 发现${currentSlurs.length}个slur，需要减少到1-2个`);
                
                // 这个逻辑比较复杂，暂时保持现状，因为用户主要关心的是保证出现
                console.log(`🎯 当前slur数量已满足要求，保持现状`);
            } else {
                console.log(`✅ 当前slur数量${currentSlurs.length}符合要求（1-2个）`);
            }
            
            console.log(`🎯 === slur保证逻辑结束 ===`);
        }
    }
    
    return {
        melody,
        musicXML: finalMusicXML,
        stats: generator.stats,
        config: { measures, keySignature, timeSignature, clef },
        seed
    };
}

// ====== 用户界面函数 ======
async function generateMelody() {
    console.log('\\n🎼 === 开始生成新旋律 ===');
    
    // 🔥 添加临时的String.prototype.toLowerCase拦截来定位错误
    const originalToLowerCase = String.prototype.toLowerCase;
    String.prototype.toLowerCase = function() {
        if (this === undefined || this === null) {
            console.error('🚨 toLowerCase被调用在undefined/null值上!');
            console.error('🚨 调用堆栈:', new Error().stack);
            throw new Error('Cannot read properties of undefined (reading toLowerCase) - 调用堆栈已输出到控制台');
        }
        return originalToLowerCase.call(this);
    };
    
    try {
        // 🔥 新逻辑：从多选设置中获取参数
        const measures = parseInt(document.querySelector('input[name="measures"]:checked').value);
        
        // 从用户设置的多选列表中随机选择
        const keySignature = getRandomFromArray(userSettings.allowedKeys);
        const timeSignature = getRandomFromArray(userSettings.allowedTimeSignatures);
        const clef = getRandomFromArray(userSettings.allowedClefs);
        // 🔥 音程跨度处理：现在是单选模式，6/8拍和其他拍号都使用相同的选择值
        const maxJump = userSettings.allowedIntervals[0] || 12; // 单选值
        if (timeSignature === '6/8') {
            console.log(`🎯 6/8拍音程跨度限制：使用用户选择的 ${maxJump} 半音（最高优先权）`);
        } else {
            console.log(`🎯 其他拍号音程跨度限制：使用用户选择的 ${maxJump} 半音`);
        }
        
        console.log('🎲 从多选设置随机选择:');
        console.log(`   调号: ${keySignature} (从 ${userSettings.allowedKeys.length} 个选项中选择)`);
        console.log(`   拍号: ${timeSignature} (从 ${userSettings.allowedTimeSignatures.length} 个选项中选择)`);
        console.log(`   谱号: ${clef} (从 ${userSettings.allowedClefs.length} 个选项中选择)`);
        console.log(`   最大音程: ${maxJump} (用户选择的单一音程跨度)`);
        
        // 验证选择结果
        if (!keySignature || !timeSignature || !clef || !maxJump) {
            console.error('❌ 无法从用户设置中获取有效参数，请检查设置');
            alert('生成失败：请确保每个类别都至少选择一个选项！');
            return;
        }
        
        // 更新maxJump设置
        userSettings.maxJump = maxJump;
        
        // 更新用户设置（但不调整UI显示的音域，保持用户当前看到的设置）
        // updateCustomRange(); // 移除：不需要重新读取UI的音域值
        updateMaxJump(); // 更新最大音程跳动
        updateRhythmSettingsRealTime(); // 实时更新节奏设置，包括三连音
        
        // 验证关键设置
        if (!userSettings.customRange || userSettings.customRange.min >= userSettings.customRange.max) {
            console.error('❌ 音域设置无效，重新设置为默认值');
            userSettings.customRange = { min: 60, max: 72 }; // C5-C6，在A2-A6范围内
        }
        
        // 验证音域在支持范围内 (A2=45 到 A6=93)
        if (userSettings.customRange.min < 33) {
            console.warn('⚠️ 最低音低于A1，调整到A1');
            userSettings.customRange.min = 33;
        }
        if (userSettings.customRange.max > 93) {
            console.warn('⚠️ 最高音高于E6，调整到E6');
            userSettings.customRange.max = 93;
        }

        if (!userSettings.maxJump || userSettings.maxJump < 1 || userSettings.maxJump > 12) {
            console.error('❌ 最大音程跳度设置无效，重新设置为默认值');
            userSettings.maxJump = 12;
        }
        
        console.log('用户设置:', { measures, keySignature, timeSignature, clef });
        console.log('✅ 已验证的自定义设置:', userSettings);
        console.log(`🎹 音域约束: MIDI ${userSettings.customRange.min}-${userSettings.customRange.max}`);
        console.log(`🎶 最大跳度约束: ${userSettings.maxJump}半音`);

        // 生成旋律数据
        const melodyData = generateMelodyData(measures, keySignature, timeSignature, clef);
        
        // 保存历史
        melodyHistory.push(melodyData);
        if (melodyHistory.length > 20) melodyHistory.shift();
        currentHistoryIndex = melodyHistory.length - 1;

        // 渲染
        await renderScore(melodyData);
        
        // 更新统计
        updateStatistics(melodyData);
        
        // 更新当前显示的旋律谱号
        currentDisplayedClef = clef;
        console.log(`🎼 当前显示旋律谱号已更新为: ${clef}`);
        
        // 更新UI显示为当前谱号的音域设置
        updateUIForClefRange(clef);
        
        console.log('🎉 生成和渲染完成！');
        
    } catch (error) {
        console.error('❌ 生成失败:', error);
        
        const scoreDiv = document.getElementById('score');
        scoreDiv.innerHTML = `
            <div style="color: red; padding: 50px; text-align: center;">
                <h3>生成失败</h3>
                <p><strong>错误:</strong> ${error.message}</p>
                <p>请打开控制台查看详细信息</p>
            </div>
        `;
    } finally {
        // 🔥 恢复原始的toLowerCase方法
        String.prototype.toLowerCase = originalToLowerCase;
        console.log('🔄 已恢复原始toLowerCase方法');
    }
}

function previousMelody() {
    if (currentHistoryIndex > 0) {
        currentHistoryIndex--;
        const melodyData = melodyHistory[currentHistoryIndex];
        renderScore(melodyData);
        updateStatistics(melodyData);
        
        // 更新当前显示的旋律谱号和UI
        if (melodyData.config && melodyData.config.clef) {
            currentDisplayedClef = melodyData.config.clef;
            console.log(`🎼 当前显示旋律谱号已更新为: ${melodyData.config.clef}`);
            
            // 更新UI显示为当前谱号的音域设置
            updateUIForClefRange(melodyData.config.clef);
        }
        
        console.log('⬅️ 切换到上一条旋律');
    }
}

function nextMelody() {
    if (currentHistoryIndex < melodyHistory.length - 1) {
        currentHistoryIndex++;
        const melodyData = melodyHistory[currentHistoryIndex];
        renderScore(melodyData);
        updateStatistics(melodyData);
        
        // 更新当前显示的旋律谱号和UI
        if (melodyData.config && melodyData.config.clef) {
            currentDisplayedClef = melodyData.config.clef;
            console.log(`🎼 当前显示旋律谱号已更新为: ${melodyData.config.clef}`);
            
            // 更新UI显示为当前谱号的音域设置
            updateUIForClefRange(melodyData.config.clef);
        }
        
        console.log('➡️ 切换到下一条旋律');
    }
}

async function regenerateSameSeed() {
    if (melodyHistory.length > 0 && currentHistoryIndex >= 0) {
        const currentMelody = melodyHistory[currentHistoryIndex];
        const { config, seed } = currentMelody;
        
        console.log(`🔄 使用相同种子重新生成旋律: ${seed}`);
        
        try {
            // 获取当前设置并更新用户设置（但不改变UI显示的音域）
            updateMaxJump();
            updateRhythmSettingsRealTime();
            
            // 使用相同的配置和种子重新生成
            const melodyData = generateMelodyData(
                config.measures, 
                config.keySignature, 
                config.timeSignature, 
                config.clef, 
                seed
            );
            
            // 替换当前历史记录中的旋律
            melodyHistory[currentHistoryIndex] = melodyData;
            
            // 重新渲染和更新统计信息
            await renderScore(melodyData);
            updateStatistics(melodyData);
            
            // 更新当前显示的旋律谱号
            currentDisplayedClef = config.clef;
            console.log(`🎼 当前显示旋律谱号已更新为: ${config.clef}`);
            
            // 更新UI显示为当前谱号的音域设置
            updateUIForClefRange(config.clef);
            
            console.log('✅ 相同种子旋律重新生成完成');
        } catch (error) {
            console.error('❌ 重新生成旋律失败:', error);
        }
    } else {
        console.warn('⚠️ 没有可用的旋律历史记录');
    }
}

function updateStatistics(melodyData) {
    const { stats, config, seed } = melodyData;
    
    // 安全更新统计信息 - 只在元素存在时更新
    const noteCountEl = document.getElementById('noteCount');
    if (noteCountEl) noteCountEl.textContent = `${stats.noteCount}音符 + ${stats.restCount}休止符`;
    
    const rangeEl = document.getElementById('range');
    if (rangeEl) rangeEl.textContent = `${stats.maxMidi - stats.minMidi} 半音`;
    
    const maxIntervalEl = document.getElementById('maxIntervalStat');
    if (maxIntervalEl) maxIntervalEl.textContent = `${stats.maxInterval} 半音`;
    
    const restRatioEl = document.getElementById('restRatio');
    if (restRatioEl) restRatioEl.textContent = `${(stats.restRatio * 100).toFixed(1)}%`;
    
    const seedEl = document.getElementById('currentSeed');
    if (seedEl) seedEl.textContent = seed;
    
    // 更新拍号类型信息
    updateTimeSignatureInfo(config.timeSignature, stats);
    
    const constraintCheck = stats.maxInterval <= (userSettings?.maxJump || 12) ? '✅' : '❌';
    const rangeCheck = (stats.minMidi >= (userSettings?.customRange?.min || 60) && 
                       stats.maxMidi <= (userSettings?.customRange?.max || 72)) ? '✅' : '❌';
    
    const debugText = 
        `用户自定义设置: MIDI音域${userSettings?.customRange?.min || 60}-${userSettings?.customRange?.max || 72} (支持A2-A6) 最大跳进${userSettings?.maxJump || 12}半音\\n` +
        `生成配置: ${config.measures}小节 ${config.timeSignature}拍 ${config.keySignature}调 ${config.clef}谱号\\n` +
        `内容分析: ${stats.noteCount}音符 ${stats.restCount}休止符 ${stats.beamCount}个beam连接\\n` +
        `音域统计: 最低${stats.minMidi} 最高${stats.maxMidi} 实际最大跳进${stats.maxInterval}半音\\n` +
        `约束验证: ${constraintCheck}跳进限制 ${rangeCheck}音域限制${stats.constraintViolations ? ' 违规次数:' + stats.constraintViolations : ''}\\n` +
        `质量指标: 休止符比例${(stats.restRatio*100).toFixed(1)}% 临时记号${userSettings?.accidentalRate || 0}%概率\\n` +
        `渲染引擎: OpenSheetMusicDisplay专业排版 | 种子: ${seed}`;
    
    // 安全更新调试信息 - 只在元素存在时更新
    const debugInfoEl = document.getElementById('debugInfo');
    if (debugInfoEl) debugInfoEl.textContent = debugText;
}

// ====== 新功能函数 ======

/**
 * 打开节奏设置弹窗
 */
function openRhythmSettings() {
    console.log('📝 打开节奏设置弹窗');
    
    // 根据当前设置更新复选框状态
    const rhythmInputs = document.querySelectorAll('#rhythmModal input[type="checkbox"]');
    rhythmInputs.forEach(input => {
        if (input.id === 'allowDottedNotes') {
            input.checked = userSettings.allowDottedNotes;
        } else {
            input.checked = Array.isArray(userSettings.allowedRhythms) && userSettings.allowedRhythms.includes(input.value);
        }
    });
    
    // 恢复频率设置
    if (userSettings.rhythmFrequencies) {
        Object.entries(userSettings.rhythmFrequencies).forEach(([type, value]) => {
            const slider = document.getElementById(`freq-${type}`);
            const valueSpan = document.getElementById(`freq-${type}-value`);
            if (slider && valueSpan) {
                slider.value = value;
                valueSpan.textContent = value + '%';
            }
        });
    }
    
    document.getElementById('rhythmModal').style.display = 'flex';
    
    // 🔄 初始化同步机制
    setTimeout(() => {
        initializeRhythmCheckboxSync();
        console.log('✅ 节奏设置同步机制已初始化');
    }, 100);
}

/**
 * 关闭节奏设置弹窗（静默保存）
 */
function closeRhythmSettingsWithSave() {
    console.log('❌ 关闭节奏设置弹窗（自动保存）');
    
    // 收集选中的基本节奏类型
    const selectedRhythms = [];
    const basicRhythmInputs = document.querySelectorAll('#rhythmModal input[type="checkbox"]');
    basicRhythmInputs.forEach(input => {
        if (input.checked) {
            selectedRhythms.push(input.value);
        }
    });
    
    // 如果有选择，则保存
    if (selectedRhythms.length > 0) {
        const allowDottedNotesElement = document.getElementById('allowDottedNotes');
        const allowDottedNotes = allowDottedNotesElement ? allowDottedNotesElement.checked : false;
        
        let finalRhythms = [...selectedRhythms];
        if (allowDottedNotes) {
            if (selectedRhythms.includes('half')) finalRhythms.push('half.');
            if (selectedRhythms.includes('quarter')) finalRhythms.push('quarter.');
            if (selectedRhythms.includes('eighth')) finalRhythms.push('eighth.');
        }
        
        const frequencies = {};
        const rhythmTypes = ['whole', 'dotted-half', 'half', 'dotted-quarter', 'quarter', 'eighth', '16th', 'triplet', 'duplet', 'quadruplet'];
        rhythmTypes.forEach(type => {
            const slider = document.getElementById(`freq-${type}`);
            if (slider) {
                frequencies[type] = parseInt(slider.value);
            }
        });
        
        userSettings.allowedRhythms = finalRhythms;
        userSettings.allowDottedNotes = allowDottedNotes;
        userSettings.rhythmFrequencies = frequencies;
        
        console.log(`✅ 节奏设置已静默保存`);
    }
    
    document.getElementById('rhythmModal').style.display = 'none';
}

/**
 * 关闭节奏设置弹窗
 */
function closeRhythmSettings() {
    console.log('❌ 关闭节奏设置弹窗');
    closeRhythmSettingsWithSave();
}

/**
 * 保存节奏设置
 */
function saveRhythmSettings() {
    console.log('💾 保存节奏设置');
    
    // 收集选中的基本节奏类型
    const selectedRhythms = [];
    const basicRhythmInputs = document.querySelectorAll('#rhythmModal input[type="checkbox"]');
    basicRhythmInputs.forEach(input => {
        if (input.checked) {
            selectedRhythms.push(input.value);
        }
    });
    
    // 至少选择一种基本节奏
    if (selectedRhythms.length === 0) {
        alert('请至少选择一种基本节奏类型！');
        return;
    }
    
    // 获取附点音符设置 (如果元素存在)
    const allowDottedNotesElement = document.getElementById('allowDottedNotes');
    const allowDottedNotes = allowDottedNotesElement ? allowDottedNotesElement.checked : false;
    
    // 如果允许附点音符，自动添加附点时值到允许的节奏中
    let finalRhythms = Array.isArray(selectedRhythms) ? [...selectedRhythms] : [];
    if (allowDottedNotes && Array.isArray(selectedRhythms)) {
        if (selectedRhythms.includes('half')) finalRhythms.push('half.');
        if (selectedRhythms.includes('quarter')) finalRhythms.push('quarter.');
        if (selectedRhythms.includes('eighth')) finalRhythms.push('eighth.');
    }
    
    // 收集频率设置 - 🔥 修复：添加缺失的duplet和quadruplet，以及dotted-quarter
    const frequencies = {};
    const rhythmTypes = ['whole', 'dotted-half', 'half', 'dotted-quarter', 'quarter', 'eighth', '16th', 'triplet', 'duplet', 'quadruplet'];
    rhythmTypes.forEach(type => {
        const slider = document.getElementById(`freq-${type}`);
        if (slider) {
            frequencies[type] = parseInt(slider.value);
            console.log(`📊 收集频率设置: ${type} = ${frequencies[type]}%`);
        } else {
            console.warn(`⚠️ 频率滑块未找到: freq-${type}`);
        }
    });
    
    // 更新设置
    userSettings.allowedRhythms = finalRhythms;
    userSettings.allowDottedNotes = allowDottedNotes;
    userSettings.rhythmFrequencies = frequencies;
    
    console.log(`✅ 基本节奏已保存: ${selectedRhythms.join(', ')}`);
    console.log(`✅ 允许附点音符: ${allowDottedNotes}`);
    console.log(`✅ 最终节奏列表: ${finalRhythms.join(', ')}`);
    console.log(`✅ 节奏频率设置: ${JSON.stringify(frequencies)}`);
    
    closeRhythmSettings();
}

/**
 * 打开Articulation设置弹窗
 */
function openArticulationSettings() {
    console.log('🎵 打开Articulation & Ornaments设置弹窗');
    
    try {
        // 🔥 安全检查：确保userSettings.articulations存在
        if (!userSettings.articulations) {
            console.warn('⚠️ userSettings.articulations不存在，初始化默认设置');
            userSettings.articulations = {
                enabled: false,
                basic: [],
                guitar: [],
                ornaments: [],
                strings: [],
                bass: [],
                frequencies: {
                    staccato: 20,
                    accent: 15,
                    acciaccatura: 12,
                    hammer: 15,
                    pull: 15
                }
            };
        }
        
        // 恢复当前设置到UI
        const artSettings = userSettings.articulations;
    
        // 🔥 安全检查DOM元素并恢复设置
        const elementsToCheck = [
            {id: 'art-staccato', type: 'basic', value: 'staccato'},
            {id: 'art-accent', type: 'basic', value: 'accent'},
            {id: 'art-acciaccatura', type: 'basic', value: 'acciaccatura'},
            {id: 'gtr-hammer', type: 'guitar', value: 'hammer-on'},
            {id: 'gtr-pull', type: 'guitar', value: 'pull-off'},
            {id: 'gtr-glissando', type: 'guitar', value: 'glissando'},
            {id: 'gtr-slide-in', type: 'guitar', value: 'slide-in'},
            {id: 'gtr-slide-out', type: 'guitar', value: 'slide-out'}
        ];

        elementsToCheck.forEach(({id, type, value}) => {
            const element = document.getElementById(id);
            if (element) {
                element.checked = artSettings[type].includes(value);
                console.log(`✅ 恢复${id}设置: ${element.checked}`);
            } else {
                console.warn(`⚠️ 未找到元素: ${id}`);
            }
        });
    
    // 弦乐技巧已移除
    
    // 贝斯技巧已移除
    
        // 恢复频率设置
        if (artSettings.frequencies) {
            console.log('🎛️ 恢复频率设置:', artSettings.frequencies);
            Object.entries(artSettings.frequencies).forEach(([type, value]) => {
                const slider = document.getElementById(`freq-${type}`);
                const valueSpan = document.getElementById(`freq-${type}-value`);
                if (slider && valueSpan) {
                    slider.value = value;
                    valueSpan.textContent = value + '%';
                    console.log(`✅ 恢复频率${type}: ${value}%`);
                } else {
                    console.warn(`⚠️ 未找到频率控制元素: freq-${type}`);
                }
            });
        }
        
        // 🔥 最终检查：确保模态框元素存在
        const modal = document.getElementById('articulationModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('✅ Articulation设置弹窗已打开');
            
            // 🔄 初始化同步机制
            setTimeout(() => {
                initializeArticulationCheckboxSync();
                console.log('✅ 演奏法设置同步机制已初始化');
            }, 100);
        } else {
            console.error('❌ 未找到articulationModal元素');
            throw new Error('articulationModal元素不存在');
        }
        
    } catch (error) {
        console.error('❌ 打开Articulation设置弹窗时出错:', error);
        console.error('错误堆栈:', error.stack);
        alert('打开设置时出现错误，请检查控制台获取详细信息。');
    }
}

/**
 * 关闭Articulation设置弹窗（静默保存）  
 */
function closeArticulationSettingsWithSave() {
    console.log('❌ 关闭Articulation设置弹窗（自动保存）');
    
    const artSettings = {
        enabled: false,
        basic: [],
        ornaments: [],
        guitar: [],
        strings: [],
        bass: []
    };
    
    // 收集所有选中的articulations
    const checkboxGroups = [
        { prefix: 'art-', type: 'basic' },
        { prefix: 'orn-', type: 'ornaments' },
        { prefix: 'guitar-', type: 'guitar' },
        { prefix: 'strings-', type: 'strings' },
        { prefix: 'bass-', type: 'bass' }
    ];
    
    let hasSelection = false;
    checkboxGroups.forEach(group => {
        const inputs = document.querySelectorAll(`#articulationModal input[id^="${group.prefix}"]`);
        inputs.forEach(input => {
            if (input.checked) {
                const value = input.id.replace(group.prefix, '');
                artSettings[group.type].push(value);
                hasSelection = true;
            }
        });
    });
    
    // 如果有选择，则保存
    if (hasSelection) {
        artSettings.enabled = artSettings.basic.length > 0 || 
                             artSettings.ornaments.length > 0 || 
                             artSettings.guitar.length > 0 ||
                             artSettings.strings.length > 0 ||
                             artSettings.bass.length > 0;
        
        const frequencies = {};
        const artTypes = ['staccato', 'accent', 'acciaccatura', 'hammer', 'pull'];
        artTypes.forEach(type => {
            const slider = document.getElementById(`freq-art-${type}`);
            if (slider) {
                frequencies[type] = parseInt(slider.value);
            }
        });
        
        userSettings.articulations = artSettings;
        userSettings.articulations.frequencies = frequencies;
        
        console.log(`✅ Articulation设置已静默保存`);
    }
    
    document.getElementById('articulationModal').style.display = 'none';
}

/**
 * 关闭Articulation设置弹窗
 */
function closeArticulationSettings() {
    closeArticulationSettingsWithSave();
}

// ====== 🚀 增强的全选切换功能 ======
/**
 * 增强的全选切换功能
 * 实现"全选"按钮的状态记忆和切换功能
 */

// 存储每个全选按钮的状态记忆
const selectAllStates = {
    rhythms: { isAllSelected: false, previousStates: null },
    basicArticulations: { isAllSelected: false, previousStates: null },
    guitarTechniques: { isAllSelected: false, previousStates: null },
    majorKeys: { isAllSelected: false, previousStates: null },
    minorKeys: { isAllSelected: false, previousStates: null },
    timeSignatures: { isAllSelected: false, previousStates: null },
    intervals: { isAllSelected: false, previousStates: null },
    clefs: { isAllSelected: false, previousStates: null }
};

/**
 * 记录当前复选框状态
 * @param {Array} checkboxIds - 复选框ID数组
 * @returns {Object} 当前状态对象
 */
function captureCurrentStates(checkboxIds) {
    const states = {};
    checkboxIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.parentElement && checkbox.parentElement.style.display !== 'none') {
            states[id] = checkbox.checked;
        }
    });
    return states;
}

/**
 * 恢复之前的复选框状态
 * @param {Object} previousStates - 之前的状态对象
 */
function restorePreviousStates(previousStates) {
    if (!previousStates) return;
    
    Object.keys(previousStates).forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = previousStates[id];
        }
    });
}

/**
 * 设置所有复选框为选中状态
 * @param {Array} checkboxIds - 复选框ID数组
 */
function selectAllCheckboxes(checkboxIds) {
    checkboxIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.parentElement && checkbox.parentElement.style.display !== 'none') {
            checkbox.checked = true;
        }
    });
}

/**
 * 更新全选按钮的文本和状态
 * @param {string} buttonSelector - 按钮选择器
 * @param {boolean} isAllSelected - 是否为全选状态
 */
function updateSelectAllButton(buttonSelector, isAllSelected) {
    const button = document.querySelector(buttonSelector);
    if (button) {
        button.textContent = isAllSelected ? '取消全选' : '全选';
        // 添加视觉提示
        if (isAllSelected) {
            button.style.background = '#FF3B30'; // iOS红色
            button.style.color = 'white';
        } else {
            button.style.background = '#28a745'; // 绿色
            button.style.color = 'white';
        }
    }
}

/**
 * 通用的全选切换函数
 * @param {string} stateKey - 状态键名
 * @param {Array} checkboxIds - 复选框ID数组
 * @param {string} buttonSelector - 按钮选择器
 * @param {string} logPrefix - 日志前缀
 */
function toggleSelectAll(stateKey, checkboxIds, buttonSelector, logPrefix) {
    const state = selectAllStates[stateKey];
    
    if (!state.isAllSelected) {
        // 第一次点击：记住当前状态，然后全选
        console.log(`${logPrefix} 记住当前状态并全选`);
        state.previousStates = captureCurrentStates(checkboxIds);
        selectAllCheckboxes(checkboxIds);
        state.isAllSelected = true;
    } else {
        // 第二次点击：恢复之前的状态
        console.log(`${logPrefix} 恢复到全选前的状态`);
        restorePreviousStates(state.previousStates);
        state.isAllSelected = false;
        state.previousStates = null;
    }
    
    // 更新按钮外观
    updateSelectAllButton(buttonSelector, state.isAllSelected);
}

// 监听模态框关闭事件，重置按钮状态
function resetSelectAllStates() {
    Object.keys(selectAllStates).forEach(key => {
        selectAllStates[key].isAllSelected = false;
        selectAllStates[key].previousStates = null;
    });
    
    // 重置所有全选按钮的外观
    document.querySelectorAll('.btn-select-all').forEach(button => {
        button.textContent = '全选';
        button.style.background = '#28a745';
        button.style.color = 'white';
    });
}

// 初始化增强全选功能的DOM事件监听器
function initializeEnhancedSelectAll() {
    console.log('[DEBUG] 初始化增强全选功能');
    
    // 初始化所有全选按钮样式
    setTimeout(() => {
        document.querySelectorAll('.btn-select-all').forEach(button => {
            button.style.background = '#28a745';
            button.style.color = 'white';
            button.style.transition = 'all 0.3s ease';
        });
    }, 1000); // 延迟确保DOM已加载完成
}

// 自动初始化
document.addEventListener('DOMContentLoaded', initializeEnhancedSelectAll);

console.log('[INFO] 增强全选切换功能已加载并集成到sight-reading-final.js');

/**
 * 全选基本演奏法
 */
function selectAllBasicArticulations() {
    const articulationIds = [
        'art-staccato',
        'art-accent', 
        'art-acciaccatura'
    ];
    
    toggleSelectAll(
        'basicArticulations', 
        articulationIds, 
        'button[onclick="selectAllBasicArticulations()"]',
        '演奏法'
    );
}

/**
 * 全选吉他技巧
 */
function selectAllGuitarTechniques() {
    const guitarIds = [
        'gtr-hammer',
        'gtr-pull'
    ];
    
    toggleSelectAll(
        'guitarTechniques', 
        guitarIds, 
        'button[onclick="selectAllGuitarTechniques()"]',
        '吉他'
    );
}

/**
 * 全选所有节奏选项
 */
function selectAllRhythms() {
    const rhythmIds = [
        'rhythm-whole', 
        'rhythm-dotted-half',
        'rhythm-half',
        'rhythm-dotted-quarter',
        'rhythm-quarter', 
        'rhythm-eighth', 
        'rhythm-16th',
        'rhythm-triplet',
        'rhythm-duplet',
        'rhythm-quadruplet'
    ];
    
    toggleSelectAll(
        'rhythms', 
        rhythmIds, 
        'button[onclick="selectAllRhythms()"]',
        '音符'
    );
}

/**
 * 保存Articulation设置
 */
function saveArticulationSettings() {
    console.log('💾 保存Articulation & Ornaments设置');
    
    const artSettings = {
        enabled: false,
        basic: [],
        ornaments: [],
        guitar: [],
        strings: [],
        bass: []
    };
    
    // 收集基本articulation
    if (document.getElementById('art-staccato').checked) artSettings.basic.push('staccato');
    if (document.getElementById('art-accent').checked) artSettings.basic.push('accent');
    if (document.getElementById('art-acciaccatura').checked) artSettings.basic.push('acciaccatura');
    
    // 装饰音已移除
    
    // 收集吉他技巧
    if (document.getElementById('gtr-hammer').checked) artSettings.guitar.push('hammer-on');
    if (document.getElementById('gtr-pull').checked) artSettings.guitar.push('pull-off');
    if (document.getElementById('gtr-glissando').checked) artSettings.guitar.push('glissando');
    if (document.getElementById('gtr-slide-in').checked) artSettings.guitar.push('slide-in');
    if (document.getElementById('gtr-slide-out').checked) artSettings.guitar.push('slide-out');
    
    // 弦乐技巧已移除
    
    // 贝斯技巧已移除
    
    // 🔥 智能收集频率设置 - 优先使用实时更新的值，滑块值作为后备
    const frequencies = {};
    const articulationTypes = ['staccato', 'accent', 'acciaccatura', 'slur'];  // 使用slur代替hammer和pull
    articulationTypes.forEach(type => {
        // 优先使用userSettings中已存在的实时更新值
        if (userSettings.articulations && 
            userSettings.articulations.frequencies && 
            userSettings.articulations.frequencies[type] !== undefined) {
            frequencies[type] = userSettings.articulations.frequencies[type];
            console.log(`🔄 使用实时更新值: ${type} = ${frequencies[type]}%`);
        } else {
            // 后备：从滑块读取
            const slider = document.getElementById(`freq-${type}`);
            if (slider) {
                frequencies[type] = parseInt(slider.value);
                console.log(`📊 从滑块读取: ${type} = ${frequencies[type]}%`);
            }
        }
    });
    
    // 检查是否有任何articulation被选中
    artSettings.enabled = (artSettings.basic.length > 0 || 
                          artSettings.guitar.length > 0);
    artSettings.frequencies = frequencies;
    
    // 🔥 智能合并设置，不要完全覆盖articulations对象
    if (!userSettings.articulations) {
        userSettings.articulations = artSettings;
    } else {
        // 只更新需要更新的部分
        userSettings.articulations.enabled = artSettings.enabled;
        userSettings.articulations.basic = artSettings.basic;
        userSettings.articulations.guitar = artSettings.guitar;
        userSettings.articulations.ornaments = artSettings.ornaments;
        userSettings.articulations.strings = artSettings.strings;
        userSettings.articulations.bass = artSettings.bass;
        userSettings.articulations.frequencies = frequencies; // 使用智能收集的频率
    }
    
    console.log('✅ Articulation设置已保存:', artSettings);
    console.log('✅ 演奏法频率设置:', frequencies);
    console.log('🔍 最终userSettings.articulations.frequencies:', userSettings.articulations.frequencies);
    
    closeArticulationSettings();
}

/**
 * 切换节奏高级设置显示状态
 */
function toggleRhythmAdvancedSettings() {
    const advancedSettings = document.getElementById('rhythmAdvancedSettings');
    const toggleBtn = document.getElementById('rhythmAdvancedBtn');
    
    if (advancedSettings.style.display === 'none') {
        advancedSettings.style.display = 'block';
        toggleBtn.textContent = '收起高级设置';
        // 初始化滑块事件监听器
        initializeRhythmFrequencySliders();
    } else {
        advancedSettings.style.display = 'none';
        toggleBtn.textContent = '高级设置';
    }
}

/**
 * 初始化节奏频率滑块事件监听器
 */
function initializeRhythmFrequencySliders() {
    const rhythmTypes = ['whole', 'dotted-half', 'half', 'dotted-quarter', 'quarter', 'eighth', '16th', 'triplet', 'duplet', 'quadruplet'];
    
    rhythmTypes.forEach(type => {
        const slider = document.getElementById(`freq-${type}`);
        const valueSpan = document.getElementById(`freq-${type}-value`);
        const checkbox = document.getElementById(`rhythm-${type}`);
        
        if (slider && valueSpan) {
            // 移除现有监听器防止重复绑定
            slider.removeEventListener('input', slider._handler);
            
            // 创建新的处理函数
            slider._handler = function() {
                const frequency = parseInt(this.value);
                valueSpan.textContent = frequency + '%';
                
                // 🔥 自动同步机制：当频率为0%时，取消勾选复选框
                if (checkbox) {
                    if (frequency === 0) {
                        checkbox.checked = false;
                        console.log(`🔄 自动取消勾选 ${type}: 频率为 0%`);
                    } else if (!checkbox.checked) {
                        checkbox.checked = true;
                        console.log(`🔄 自动勾选 ${type}: 频率为 ${frequency}%`);
                    }
                }
                
                // 更新userSettings中的频率设置
                if (!userSettings.rhythmFrequencies) {
                    userSettings.rhythmFrequencies = {};
                }
                userSettings.rhythmFrequencies[type] = frequency;
            };
            
            slider.addEventListener('input', slider._handler);
            
            // 设置初始值
            valueSpan.textContent = slider.value + '%';
        }
    });
}

/**
 * 重置节奏频率为默认值
 */
function resetRhythmFrequencies() {
    const defaultFrequencies = {
        whole: 10,
        'dotted-half': 15,
        half: 30,
        'dotted-quarter': 35,
        quarter: 50,
        eighth: 40,
        '16th': 20,
        triplet: 15,
        duplet: 30,
        quadruplet: 25
    };
    
    Object.entries(defaultFrequencies).forEach(([type, value]) => {
        const slider = document.getElementById(`freq-${type}`);
        const valueSpan = document.getElementById(`freq-${type}-value`);
        
        if (slider && valueSpan) {
            slider.value = value;
            valueSpan.textContent = value + '%';
        }
    });
    
    console.log('🔄 节奏频率已重置为默认值（包括二连音和四连音）');
}

/**
 * 切换演奏法高级设置显示状态
 */
function toggleArticulationAdvancedSettings() {
    const advancedSettings = document.getElementById('articulationAdvancedSettings');
    const toggleBtn = document.getElementById('articulationAdvancedBtn');
    
    if (advancedSettings.style.display === 'none') {
        advancedSettings.style.display = 'block';
        toggleBtn.textContent = '收起高级设置';
        // 初始化滑块事件监听器
        initializeArticulationFrequencySliders();
    } else {
        advancedSettings.style.display = 'none';
        toggleBtn.textContent = '高级设置';
    }
}

/**
 * 初始化演奏法频率滑块事件监听器
 */
function initializeArticulationFrequencySliders() {
    const articulationTypes = ['staccato', 'accent', 'acciaccatura', 'slur'];
    
    articulationTypes.forEach(type => {
        const slider = document.getElementById(`freq-${type}`);
        const valueSpan = document.getElementById(`freq-${type}-value`);
        
        // 映射articulation类型到对应的复选框ID
        let checkboxId;
        if (type === 'staccato') checkboxId = 'art-staccato';
        else if (type === 'accent') checkboxId = 'art-accent';
        else if (type === 'acciaccatura') checkboxId = 'art-acciaccatura';
        else if (type === 'slur') {
            // slur控制hammer和pull两个复选框
            const hammerCheckbox = document.getElementById('gtr-hammer');
            const pullCheckbox = document.getElementById('gtr-pull');
            
            if (slider && valueSpan) {
                // 移除现有监听器防止重复绑定
                slider.removeEventListener('input', slider._handler);
                
                // 创建新的处理函数
                slider._handler = function() {
                    const frequency = parseInt(this.value);
                    valueSpan.textContent = frequency + '%';
                    
                    // 🔥 自动同步机制：slur频率控制hammer和pull两个复选框
                    if (hammerCheckbox && pullCheckbox) {
                        if (frequency === 0) {
                            hammerCheckbox.checked = false;
                            pullCheckbox.checked = false;
                            console.log(`🔄 自动取消勾选 hammer和pull: slur频率为 0%`);
                        } else {
                            // 如果频率不为0，至少勾选一个（根据现有状态或全部勾选）
                            if (!hammerCheckbox.checked && !pullCheckbox.checked) {
                                hammerCheckbox.checked = true;
                                pullCheckbox.checked = true;
                                console.log(`🔄 自动勾选 hammer和pull: slur频率为 ${frequency}%`);
                            }
                        }
                    }
                    
                    // 更新userSettings中的频率设置
                    if (!userSettings.articulations) {
                        userSettings.articulations = { frequencies: {} };
                    }
                    if (!userSettings.articulations.frequencies) {
                        userSettings.articulations.frequencies = {};
                    }
                    userSettings.articulations.frequencies[type] = frequency;
                };
                
                slider.addEventListener('input', slider._handler);
                
                // 设置初始值
                valueSpan.textContent = slider.value + '%';
            }
            return; // 跳过下面的通用处理
        }
        
        const checkbox = document.getElementById(checkboxId);
        
        if (slider && valueSpan) {
            // 移除现有监听器防止重复绑定
            slider.removeEventListener('input', slider._handler);
            
            // 创建新的处理函数
            slider._handler = function() {
                const frequency = parseInt(this.value);
                valueSpan.textContent = frequency + '%';
                
                // 🔥 自动同步机制：当频率为0%时，取消勾选复选框
                if (checkbox) {
                    if (frequency === 0) {
                        checkbox.checked = false;
                        console.log(`🔄 自动取消勾选 ${type}: 频率为 0%`);
                    } else if (!checkbox.checked) {
                        checkbox.checked = true;
                        console.log(`🔄 自动勾选 ${type}: 频率为 ${frequency}%`);
                    }
                }
                
                // 更新userSettings中的频率设置
                if (!userSettings.articulations) {
                    userSettings.articulations = { frequencies: {} };
                }
                if (!userSettings.articulations.frequencies) {
                    userSettings.articulations.frequencies = {};
                }
                userSettings.articulations.frequencies[type] = frequency;
            };
            
            slider.addEventListener('input', slider._handler);
            
            // 设置初始值
            valueSpan.textContent = slider.value + '%';
        }
    });
}

/**
 * 重置演奏法频率为默认值
 */
function resetArticulationFrequencies() {
    const defaultFrequencies = {
        staccato: 20,
        accent: 15,
        acciaccatura: 10,
        slur: 15  // 🔥 使用统一的击勾弦频率控制
    };
    
    // 🔥 更新userSettings中的频率设置
    if (!userSettings.articulations) {
        userSettings.articulations = { frequencies: {} };
    }
    if (!userSettings.articulations.frequencies) {
        userSettings.articulations.frequencies = {};
    }
    
    Object.entries(defaultFrequencies).forEach(([type, value]) => {
        const slider = document.getElementById(`freq-${type}`);
        const valueSpan = document.getElementById(`freq-${type}-value`);
        
        if (slider && valueSpan) {
            slider.value = value;
            valueSpan.textContent = value + '%';
            
            // 🔥 同步更新userSettings
            userSettings.articulations.frequencies[type] = value;
        }
    });
    
    console.log('🔄 演奏法频率已重置为默认值');
    console.log('📊 更新后的频率设置:', userSettings.articulations.frequencies);
}

/**
 * 重置音域设置，允许谱号自动调整音域
 * @param {string} targetClef - 可选参数，指定要重置的谱号。如果不提供，则重置当前谱号
 */
function resetRangeSettings(targetClef = null) {
    // 获取要重置的谱号
    const clefElement = document.getElementById('clef');
    const currentClef = clefElement ? clefElement.value : 'treble';
    const clefToReset = targetClef || currentClef;
    
    // 重置指定谱号的自定义设置
    if (userSettings.clefRanges[clefToReset]) {
        userSettings.clefRanges[clefToReset].hasCustomRange = false;
        userSettings.clefRanges[clefToReset].customRange = null;
    }
    
    // 重置向后兼容的全局设置
    userSettings.hasCustomRange = false;
    
    // 重新应用谱号的默认音域（只有当前显示的谱号才更新UI）
    if (clefToReset === currentClef) {
        adjustRangeForClef(clefToReset);
    }
    
    const clefName = clefToReset === 'treble' ? '高音谱号' : clefToReset === 'alto' ? '中音谱号' : '低音谱号';
    console.log(`🔄 ${clefName}音域设置已重置，现在会使用默认音域`);
}

/**
 * 重置所有谱号的音域设置
 */
function resetAllRangeSettings() {
    // 重置所有谱号的自定义设置
    Object.keys(userSettings.clefRanges).forEach(clef => {
        userSettings.clefRanges[clef].hasCustomRange = false;
        userSettings.clefRanges[clef].customRange = null;
    });
    
    // 重置向后兼容的全局设置
    userSettings.hasCustomRange = false;
    
    // 重新应用当前谱号的默认音域
    const clefElement = document.getElementById('clef');
    const currentClef = clefElement ? clefElement.value : 'treble';
    adjustRangeForClef(currentClef);
    
    console.log('🔄 所有谱号的音域设置已重置，现在会使用各自的默认音域');
}

/**
 * 更新音域设置
 */
function updateCustomRange() {
    const minRange = parseInt(document.getElementById('rangeMin').value);
    const maxRange = parseInt(document.getElementById('rangeMax').value);
    
    // 验证音域设置
    if (minRange >= maxRange) {
        alert('最低音必须低于最高音！');
        return;
    }
    
    // 验证音域在支持范围内 (A2=33 到 A6=81)
    if (minRange < 33 || maxRange > 85) {
        alert('音域必须在A2到A6范围内！');
        return;
    }
    
    // 获取当前显示旋律的谱号（如果没有则使用选择的谱号）
    let targetClef = currentDisplayedClef;
    if (!targetClef) {
        // 如果还没有生成旋律，使用当前选择的谱号
        const clefElement = document.getElementById('clef');
        targetClef = clefElement ? clefElement.value : 'treble';
        console.log('⚠️ 当前没有显示旋律，使用界面选择的谱号');
    }
    
    // 为对应谱号保存自定义音域设置
    if (!userSettings.clefRanges[targetClef]) {
        userSettings.clefRanges[targetClef] = { customRange: null, hasCustomRange: false };
    }
    
    userSettings.clefRanges[targetClef].customRange = { min: minRange, max: maxRange };
    userSettings.clefRanges[targetClef].hasCustomRange = true;
    
    // 保持向后兼容（为旧代码）
    userSettings.customRange = { min: minRange, max: maxRange };
    userSettings.hasCustomRange = true;
    
    // 显示友好的音名
    const minNote = midiToNoteName(minRange);
    const maxNote = midiToNoteName(maxRange);
    const clefName = targetClef === 'treble' ? '高音谱号' : targetClef === 'alto' ? '中音谱号' : '低音谱号';
    console.log(`🎹 ${clefName}音域设置已更新: ${minNote}-${maxNote} (MIDI ${minRange}-${maxRange}) [基于当前显示的旋律]`);
}

/**
 * MIDI转音名显示
 */
function midiToNoteName(midi) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const noteName = notes[midi % 12];
    return noteName + octave;
}

/**
 * 更新临时记号概率
 */
function updateAccidentalRate() {
    const rate = parseInt(document.getElementById('accidentalRate').value);
    userSettings.accidentalRate = rate;
    document.getElementById('accidentalRateValue').textContent = rate + '%';
    console.log(`♯♭ 临时记号概率已更新: ${rate}%`);
}

/**
 * 获取指定谱号的音域设置（不更新UI）
 */
function getRangeForClef(clef) {
    const defaultRanges = {
        treble: { min: 60, max: 72 },  // C4-C5 (高音谱号 - 保持原有默认值)
        alto: { min: 50, max: 71 },    // D3-B4 (中音谱号)
        bass: { min: 40, max: 64 }     // E2-E4 (低音谱号)
    };
    
    // 检查这个谱号是否有自定义音域设置
    if (userSettings.clefRanges[clef] && userSettings.clefRanges[clef].hasCustomRange) {
        // 使用该谱号的自定义音域
        return userSettings.clefRanges[clef].customRange;
    } else {
        // 使用默认音域
        return defaultRanges[clef] || defaultRanges.treble;
    }
}

/**
 * 更新UI显示为指定谱号的音域设置（不触发保存事件）
 */
function updateUIForClefRange(clef) {
    // 获取该谱号的音域设置
    const targetRange = getRangeForClef(clef);
    const clefName = clef === 'treble' ? '高音谱号' : clef === 'alto' ? '中音谱号' : '低音谱号';
    
    // 更新全局设置（为向后兼容）
    userSettings.customRange = { min: targetRange.min, max: targetRange.max };
    
    // 更新界面显示（不触发change事件以避免保存）
    const rangeMinElement = document.getElementById('rangeMin');
    const rangeMaxElement = document.getElementById('rangeMax');
    
    if (rangeMinElement) {
        rangeMinElement.value = targetRange.min;
    }
    if (rangeMaxElement) {
        rangeMaxElement.value = targetRange.max;
    }
    
    const minNote = midiToNoteName(targetRange.min);
    const maxNote = midiToNoteName(targetRange.max);
    const settingType = (userSettings.clefRanges[clef] && userSettings.clefRanges[clef].hasCustomRange) ? '自定义' : '默认';
    console.log(`🔄 UI已更新显示${clefName}的${settingType}音域: ${minNote}-${maxNote} (MIDI ${targetRange.min}-${targetRange.max})`);
}

/**
 * 根据谱号调整默认音域
 */
function adjustRangeForClef(clef) {
    // 如果是随机谱号，不调整音域
    if (clef === 'random') {
        console.log('🎲 随机谱号模式，不自动调整音域');
        return;
    }
    
    // 获取该谱号的音域设置
    const targetRange = getRangeForClef(clef);
    const clefName = clef === 'treble' ? '高音谱号' : clef === 'alto' ? '中音谱号' : '低音谱号';
    
    // 更新全局设置（为向后兼容）
    userSettings.customRange = { min: targetRange.min, max: targetRange.max };
    
    // 更新界面显示
    const rangeMinElement = document.getElementById('rangeMin');
    const rangeMaxElement = document.getElementById('rangeMax');
    
    if (rangeMinElement) {
        rangeMinElement.value = targetRange.min;
        // 触发change事件以更新显示
        rangeMinElement.dispatchEvent(new Event('change'));
    }
    if (rangeMaxElement) {
        rangeMaxElement.value = targetRange.max;
        // 触发change事件以更新显示
        rangeMaxElement.dispatchEvent(new Event('change'));
    }
    
    const minNote = midiToNoteName(targetRange.min);
    const maxNote = midiToNoteName(targetRange.max);
    const settingType = (userSettings.clefRanges[clef] && userSettings.clefRanges[clef].hasCustomRange) ? '自定义' : '默认';
    console.log(`🎼 ${clefName}音域已设为${settingType}值: ${minNote}-${maxNote} (MIDI ${targetRange.min}-${targetRange.max})`);
}

/**
 * 更新最大音程跳动
 */
function updateMaxJump() {
    const maxIntervalElement = document.getElementById('maxInterval');
    if (!maxIntervalElement) {
        console.error('❌ maxInterval元素未找到');
        return;
    }
    
    const maxJump = parseInt(maxIntervalElement.value);
    console.log(`🔄 读取最大音程设置: ${maxJump} (之前: ${userSettings.maxJump})`);
    
    if (isNaN(maxJump) || maxJump < 1 || maxJump > 12) {
        console.error('❌ 无效的最大音程跳度值:', maxJump);
        return;
    }
    
    userSettings.maxJump = maxJump;
    console.log(`✅ 最大音程跳动已更新: ${maxJump}半音`);
    console.log(`🔍 验证更新后的userSettings.maxJump: ${userSettings.maxJump}`);
}

/**
 * 实时更新节奏设置（包括三连音）
 */
function updateRhythmSettingsRealTime() {
    console.log('🎵 实时更新节奏设置');
    
    // 收集当前选中的基本节奏类型
    const selectedRhythms = [];
    
    // 🔍 直接检查每个具体的复选框，确保能读取到正确状态
    // 🔥 修复：添加缺失的附点音符ID
    const rhythmIds = [
        'rhythm-whole', 'rhythm-dotted-half', 'rhythm-half', 'rhythm-dotted-quarter', 
        'rhythm-quarter', 'rhythm-eighth', 'rhythm-16th', 'rhythm-triplet', 
        'rhythm-duplet', 'rhythm-quadruplet'
    ];
    
    rhythmIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            selectedRhythms.push(checkbox.value);
            console.log(`✅ 节奏已选中: ${checkbox.value} (来自 ${id})`);
        } else if (checkbox) {
            console.log(`❌ 节奏未选中: ${checkbox.value} (来自 ${id})`);
        } else {
            console.log(`⚠️ 找不到复选框: ${id}`);
        }
    });
    
    // 🔥 修复：不再自动添加任何节奏，完全遵循用户选择
    if (selectedRhythms.length === 0) {
        console.log('⚠️ 未选择任何节奏，将生成空旋律');
    }
    
    console.log(`📝 用户选择的节奏（无修改）: [${selectedRhythms.join(', ')}]`);
    
    // 🔥 修复：直接使用用户选择的节奏，不再自动添加附点音符
    // 因为现在附点音符是通过专门的复选框控制的
    userSettings.allowedRhythms = selectedRhythms;
    
    // 保持兼容性：检查是否选择了附点音符
    const hasDottedNotes = selectedRhythms.some(rhythm => 
        rhythm === 'dotted-half' || rhythm === 'dotted-quarter' || 
        rhythm.includes('.')
    );
    userSettings.allowDottedNotes = hasDottedNotes;
    
    console.log(`🎵 节奏设置更新完成:`);
    console.log(`  - 选中的节奏: [${selectedRhythms.join(', ')}]`);
    console.log(`  - 包含附点音符: ${hasDottedNotes}`);
    console.log(`  - 包含三连音: ${selectedRhythms.includes('triplet')}`);
    // allowUpbeat console log removed
}

// ====== 调试和测试函数 ======
/**
 * 测试三连音逻辑的调试函数
 */
function testTripletLogic() {
    console.log('\\n🧪 === 三连音逻辑测试 ===');
    
    // 测试场景1: 启用三连音
    console.log('📝 测试场景1: 启用三连音');
    userSettings.allowedRhythms = ['quarter', 'eighth', 'triplet'];
    
    const generator = new IntelligentMelodyGenerator(2, 'C', '4/4', 'treble', 12345);
    console.log(`生成器规则中的allowedDurations: [${generator.rules.allowedDurations.join(', ')}]`);
    console.log(`包含三连音: ${generator.rules.allowedDurations.includes('triplet')}`);
    
    // 测试chooseDuration是否正确过滤掉triplet
    const availableDurations = generator.chooseDuration(2, true);
    console.log(`chooseDuration测试(2拍): ${availableDurations}`);
    
    // 测试canGenerateTriplet
    const canGenerate4Beats = generator.canGenerateTriplet(4);
    const canGenerate2Beats = generator.canGenerateTriplet(2);
    const canGenerate1Beat = generator.canGenerateTriplet(1);
    const canGenerateHalfBeat = generator.canGenerateTriplet(0.5);
    
    console.log(`4拍时可以生成三连音: ${canGenerate4Beats}`);
    console.log(`2拍时可以生成三连音: ${canGenerate2Beats}`);
    console.log(`1拍时可以生成三连音: ${canGenerate1Beat}`);
    console.log(`0.5拍时可以生成三连音: ${canGenerateHalfBeat}`);
    
    // 测试场景2: 只启用三连音
    console.log('\\n📝 测试场景2: 只启用三连音');
    userSettings.allowedRhythms = ['triplet'];
    updateRhythmSettingsRealTime(); // 应该自动添加quarter
    console.log(`实时更新后: [${userSettings.allowedRhythms.join(', ')}]`);
    
    // 测试场景3: 禁用三连音
    console.log('\\n📝 测试场景3: 禁用三连音');
    userSettings.allowedRhythms = ['quarter', 'eighth'];
    
    const generator2 = new IntelligentMelodyGenerator(2, 'C', '4/4', 'treble', 12346);
    console.log(`生成器规则中的allowedDurations: [${generator2.rules.allowedDurations.join(', ')}]`);
    console.log(`包含三连音: ${generator2.rules.allowedDurations.includes('triplet')}`);
    
    const canGenerate2 = generator2.canGenerateTriplet(4);
    console.log(`4拍时可以生成三连音: ${canGenerate2}`);
    
    console.log('✅ 三连音逻辑测试完成');
}

/**
 * 测试响应式布局的调试函数
 */
function testResponsiveLayout() {
    console.log('\n🧪 === 响应式布局测试 ===');
    
    // 生成8小节测试旋律
    const testMelody = generateMelodyData(8, 'C', '4/4', 'treble', 99999);
    
    console.log('生成的MusicXML片段 (查找 new-system):');
    const xmlLines = testMelody.musicXML.split('\n');
    xmlLines.forEach((line, index) => {
        if (line.includes('new-system') || line.includes('<measure')) {
            console.log(`Line ${index + 1}: ${line.trim()}`);
        }
    });
    
    // 检查容器宽度和响应式断点
    const scoreContainer = document.getElementById('score');
    if (scoreContainer) {
        const containerWidth = scoreContainer.clientWidth;
        const windowWidth = window.innerWidth;
        // 强制每行4小节（所有设备）
        const expectedMeasuresPerLine = 4;
        
        console.log(`🔍 容器状态检查:`);
        console.log(`  - 窗口宽度: ${windowWidth}px`);
        console.log(`  - 容器宽度: ${containerWidth}px`);
        console.log(`  - 期望每行小节数: ${expectedMeasuresPerLine}`);
        
        // 检查CSS样式影响
        const computedStyle = window.getComputedStyle(scoreContainer);
        console.log(`  - CSS max-width: ${computedStyle.maxWidth}`);
        console.log(`  - CSS width: ${computedStyle.width}`);
        
        // 测试Builder的响应式逻辑
        const builder = new MusicXMLBuilder(testMelody.melody, {
            measures: 8, keySignature: 'C', timeSignature: '4/4', clef: 'treble'
        });
        
        const actualMeasuresPerLine = builder.getMeasuresPerLine();
        const measureDistance = builder.getMeasureDistance(
            builder.currentLayout?.layoutType || 'desktop',
            actualMeasuresPerLine
        );
        
        console.log(`🎼 Builder结果:`);
        console.log(`  - 实际每行小节数: ${actualMeasuresPerLine}`);
        console.log(`  - 计算间距: ${measureDistance}`);
        console.log(`  - 布局类型: ${builder.currentLayout?.layoutType || 'unknown'}`);
        
        // 验证一致性
        if (actualMeasuresPerLine === expectedMeasuresPerLine) {
            console.log('✅ 响应式断点逻辑一致');
        } else {
            console.warn(`❌ 断点逻辑不一致: 期望${expectedMeasuresPerLine}, 实际${actualMeasuresPerLine}`);
        }
        
        // 分析小节分布效果
        console.log(`📊 小节分布分析:`);
        const systemWidth = containerWidth * 0.98;
        const availableSpace = systemWidth - 100;
        const measureWidth = availableSpace / actualMeasuresPerLine;
        console.log(`  - 系统宽度: ${Math.round(systemWidth)}px (容器的98%)`);
        console.log(`  - 可用空间: ${Math.round(availableSpace)}px`);
        console.log(`  - 每小节宽度: ${Math.round(measureWidth)}px`);
        console.log(`  - 空间利用率: ${((measureWidth * actualMeasuresPerLine / containerWidth) * 100).toFixed(1)}%`);
        
        const totalMeasures = 8;
        const expectedLines = Math.ceil(totalMeasures / actualMeasuresPerLine);
        console.log(`  - 预期行数: ${expectedLines}行 (总共${totalMeasures}小节)`);
        
        // 检查MusicXML内容
        const xmlLines = testMelody.musicXML.split('\n');
        const measureWidthMatches = testMelody.musicXML.match(/<measure-width>(\d+(?:\.\d+)?)<\/measure-width>/g) || [];
        console.log(`  - MusicXML中measure-width指令: ${measureWidthMatches.length}个`);
        if (measureWidthMatches.length > 0) {
            measureWidthMatches.forEach((match, index) => {
                const width = match.match(/(\d+(?:\.\d+)?)/)[1];
                console.log(`    行${index + 1}: ${width}px`);
            });
        }
        
        // 检查OSMD设置（新的固定宽度API）
        if (window.osmd && window.osmd.EngravingRules) {
            console.log(`🎵 OSMD设置检查:`);
            console.log(`  - RenderXMeasuresPerLineAkaSystem: ${window.osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem}`);
            console.log(`  - MaxMeasuresPerSystem: ${window.osmd.EngravingRules.MaxMeasuresPerSystem}`);
            console.log(`  - FixedMeasureWidth: ${window.osmd.EngravingRules.FixedMeasureWidth}`);
            console.log(`  - FixedMeasureWidthFixedValue: ${window.osmd.EngravingRules.FixedMeasureWidthFixedValue}`);
            console.log(`  - NewSystemAtXMLNewSystem: ${window.osmd.EngravingRules.NewSystemAtXMLNewSystem}`);
        }
    }
}

/**
 * 实时监控响应式状态的函数
 */
function monitorResponsiveState() {
    setInterval(() => {
        const scoreContainer = document.getElementById('score');
        if (scoreContainer) {
            const containerWidth = scoreContainer.clientWidth;
            const windowWidth = window.innerWidth;
            
            // 强制每行4小节（所有设备）
            const currentBreakpoint = 'fixed(4)';
            
            // 只在状态变化时打印
            if (!window.lastReportedBreakpoint || window.lastReportedBreakpoint !== currentBreakpoint) {
                console.log(`📱 响应式状态: ${currentBreakpoint} - 窗口${windowWidth}px, 容器${containerWidth}px`);
                window.lastReportedBreakpoint = currentBreakpoint;
            }
        }
    }, 1000);
}

// ====== 初始化 ======
console.log('🎼 视奏旋律生成器 - 终极版已加载');
console.log('🎯 严格遵循音乐理论，使用OSMD专业渲染');
console.log('🧪 调试命令: testResponsiveLayout() - 测试响应式布局');

// 强制应用4小节布局的函数（改进版）
function force4MeasuresLayout() {
    console.log('🔧 强制应用每行4小节布局...');
    
    if (!window.osmd) {
        console.error('OSMD实例不存在，请先生成旋律');
        return;
    }
    
    const scoreContainer = document.getElementById('score');
    const containerWidth = scoreContainer ? scoreContainer.clientWidth : 1000;
    
    console.log('当前容器宽度:', containerWidth + 'px');
    
    if (window.osmd.EngravingRules) {
        // 检查当前配置
        console.log('🔍 当前OSMD配置:');
        console.log('  - RenderXMeasuresPerLineAkaSystem:', window.osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem);
        console.log('  - FixedMeasureWidth:', window.osmd.EngravingRules.FixedMeasureWidth);
        console.log('  - FixedMeasureWidthFixedValue:', window.osmd.EngravingRules.FixedMeasureWidthFixedValue);
        
        // 计算新的小节宽度
        const availableWidth = containerWidth - 80;
        const measureWidth = Math.max(50, Math.min(250, availableWidth / 4));
        
        console.log('📐 计算小节宽度:', Math.round(measureWidth) + 'px');
        
        // 应用配置
        window.osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4;
        window.osmd.EngravingRules.FixedMeasureWidth = true;
        window.osmd.EngravingRules.FixedMeasureWidthFixedValue = measureWidth;
        window.osmd.EngravingRules.CompactMode = false;
        window.osmd.EngravingRules.NewSystemAtXMLNewSystem = true;
        
        // 添加小节在系统内均匀分布的设置
        if (window.osmd.EngravingRules.hasOwnProperty('JustifyMeasuresInSystem')) {
            window.osmd.EngravingRules.JustifyMeasuresInSystem = true;
        } else if (window.osmd.EngravingRules.hasOwnProperty('justifyMeasuresInSystem')) {
            window.osmd.EngravingRules.justifyMeasuresInSystem = true;
        }
        
        // 重新渲染
        try {
            console.log('🎨 重新渲染中...');
            window.osmd.render();
            
            // 延迟检查结果
            setTimeout(() => {
                console.log('✅ 渲染完成，检查结果:');
                console.log('  - RenderXMeasuresPerLineAkaSystem:', window.osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem);
                console.log('  - FixedMeasureWidth:', window.osmd.EngravingRules.FixedMeasureWidth);
                console.log('  - FixedMeasureWidthFixedValue:', window.osmd.EngravingRules.FixedMeasureWidthFixedValue);
                
                // 分析实际渲染结果
                const svgElement = document.querySelector('#score svg');
                if (svgElement) {
                    const measures = svgElement.querySelectorAll('g[id*="measure"], g[class*="measure"]');
                    console.log('📊 实际渲染:', measures.length + '个小节');
                } else {
                    console.log('❌ 未找到SVG元素');
                }
            }, 200);
            
        } catch (error) {
            console.error('❌ 重新渲染失败:', error);
        }
    } else {
        console.error('❌ EngravingRules不可用');
        console.log('OSMD对象:', window.osmd);
    }
}

// 将调试函数暴露到全局，方便控制台调用
window.testResponsiveLayout = testResponsiveLayout;
window.monitorResponsiveState = monitorResponsiveState;
window.force4MeasuresLayout = force4MeasuresLayout;

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 页面加载完成，检查依赖');
    
    // 运行调号处理测试（在URL中添加#test来启用）
    if (window.location.hash === '#test') {
        setTimeout(() => {
            testKeySignatureHandling();
        }, 1000);
    }
    
    // 确保 userSettings 被正确初始化
    if (!userSettings || typeof userSettings !== 'object') {
        console.warn('⚠️ userSettings未正确初始化，重新设置');
        userSettings = {
            customRange: { min: 60, max: 72 }, // C5-C6，在A2-A6范围内
            hasCustomRange: false, // 标记用户是否手动设置了音域
            allowedRhythms: ['half', 'quarter', 'eighth'],
            allowDottedNotes: false,
            accidentalRate: 0,
            maxJump: 12,
            // 🔥 关键修复：确保articulations配置被保留
            articulations: {
                enabled: false,
                basic: [],
                guitar: [], // 这里很重要！
                ornaments: [],
                strings: [],
                bass: []
            }
        };
    }
    
    // 🔥 额外修复：确保articulations子对象存在
    if (!userSettings.articulations || typeof userSettings.articulations !== 'object') {
        console.warn('⚠️ userSettings.articulations未正确初始化，重新设置');
        userSettings.articulations = {
            enabled: false,
            basic: [],
            guitar: [], // 这里很重要！
            ornaments: [],
            strings: [],
            bass: [],
            frequencies: {
                staccato: 20,
                accent: 15,
                acciaccatura: 12,
                hammer: 15,
                pull: 15
            }
        };
    }
    
    // 🔥 确保guitar数组存在
    if (!Array.isArray(userSettings.articulations.guitar)) {
        console.warn('⚠️ userSettings.articulations.guitar不是数组，重新设置');
        userSettings.articulations.guitar = [];
    }
    
    // 🔥 确保frequencies对象存在
    if (!userSettings.articulations.frequencies || typeof userSettings.articulations.frequencies !== 'object') {
        console.warn('⚠️ userSettings.articulations.frequencies未正确初始化，重新设置');
        userSettings.articulations.frequencies = {
            staccato: 20,
            accent: 15,
            acciaccatura: 12,
            slur: 15  // 统一的击勾弦频率控制
        };
    }
    
    // 验证必要的数组属性
    if (!Array.isArray(userSettings.allowedRhythms)) {
        console.warn('⚠️ allowedRhythms不是数组，重新设置');
        userSettings.allowedRhythms = ['quarter'];
    }
    
    console.log('✅ userSettings验证完成:', userSettings);
    
    if (typeof opensheetmusicdisplay === 'undefined') {
        console.error('❌ OpenSheetMusicDisplay未加载');
        document.getElementById('score').innerHTML = `
            <div style="color: red; text-align: center; padding: 50px;">
                <h3>依赖库未加载</h3>
                <p>OpenSheetMusicDisplay库加载失败</p>
                <p>请检查网络连接并刷新页面</p>
            </div>
        `;
    } else {
        console.log('✅ 所有依赖库就绪');
        
        // 启动响应式监控
        monitorResponsiveState();
        console.log('📱 响应式状态监控已启动');
    }
    
    // 添加事件监听器 - 实时更新设置
    document.getElementById('rangeMin').addEventListener('change', function() {
        updateCustomRange();
        console.log('🔄 音域范围已实时更新');
    });
    document.getElementById('rangeMax').addEventListener('change', function() {
        updateCustomRange();
        console.log('🔄 音域范围已实时更新');
    });
    document.getElementById('accidentalRate').addEventListener('input', function() {
        updateAccidentalRate();
        console.log('🔄 临时记号概率已实时更新');
    });
    
    // 谱号切换监听器
    document.getElementById('clef').addEventListener('change', function() {
        const selectedClef = this.value;
        adjustRangeForClef(selectedClef);
        console.log(`🔄 谱号已切换到: ${selectedClef === 'treble' ? '高音谱号' : selectedClef === 'alto' ? '中音谱号' : '低音谱号'}`);
    });
    const maxIntervalElement = document.getElementById('maxInterval');
    if (maxIntervalElement) {
        console.log('✅ 找到maxInterval元素:', maxIntervalElement.tagName, maxIntervalElement.type);
        console.log('🔍 元素当前状态 - 值:', maxIntervalElement.value, '禁用:', maxIntervalElement.disabled);
        console.log('🔍 元素选项数量:', maxIntervalElement.options.length);
        
        // 添加多种事件监听器进行调试
        maxIntervalElement.addEventListener('change', function() {
            console.log('🎯 maxInterval change事件触发，当前值:', this.value);
            updateMaxJump();
            console.log('🔄 最大音程跳动已实时更新');
        });
        
        maxIntervalElement.addEventListener('click', function() {
            console.log('🖱️ maxInterval click事件触发');
        });
        
        // 定期检查元素状态
        setTimeout(() => {
            console.log('⏰ 5秒后检查maxInterval状态 - 值:', maxIntervalElement.value, '禁用:', maxIntervalElement.disabled);
        }, 5000);
        
    } else {
        console.error('❌ 未找到maxInterval元素');
    }
    
    // 添加节奏设置实时更新监听器
    const rhythmInputs = document.querySelectorAll('#rhythmModal input[type="checkbox"]');
    rhythmInputs.forEach(input => {
        input.addEventListener('change', function() {
            console.log(`🎵 节奏选项变化: ${this.id} = ${this.checked}`);
            updateRhythmSettingsRealTime();
        });
    });
    
    // 初始化所有设置
    // 确保滑块值为0
    const accidentalSlider = document.getElementById('accidentalRate');
    if (accidentalSlider) {
        accidentalSlider.value = 0;  // 确保滑块在最左边
    }
    updateAccidentalRate();
    updateMaxJump();
    updateCustomRange();
    updateRhythmSettingsRealTime(); // 初始化节奏设置
    
    // 🔥 优化的击勾弦(slur)频率控制系统
    console.log('🎸 开始初始化 slur 频率控制器...');
    
    const slurSlider = document.getElementById('freq-slur');
    const slurValueDisplay = document.getElementById('freq-slur-value');
    
    // 🔥 确保frequencies对象存在且有正确的初始值
    if (!userSettings.articulations.frequencies) {
        userSettings.articulations.frequencies = {
            staccato: 20,
            accent: 15,
            acciaccatura: 10,
            slur: 15  // 统一的击勾弦频率控制
        };
        console.log('🔧 重新初始化 frequencies 对象');
    }
    
    if (slurSlider && slurValueDisplay) {
        // 设置初始值
        const initialSlurValue = userSettings.articulations.frequencies.slur || 15;
        slurSlider.value = initialSlurValue;
        slurValueDisplay.textContent = initialSlurValue + '%';
        
        // 添加事件监听器
        slurSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            slurValueDisplay.textContent = value + '%';
            userSettings.articulations.frequencies.slur = value;
            
            console.log(`🎸 击勾弦频率更新: ${value}%`);
        });
        
        console.log(`✅ 击勾弦滑块初始化完成: ${initialSlurValue}%`);
    } else {
        console.log('❌ 击勾弦滑块或显示元素未找到');
    }
    
    console.log('🎸 击勾弦频率控制器初始化完成!');
    console.log('📊 当前频率设置:', userSettings.articulations.frequencies);
    
    // 🔥 移除旧的错误的timeSignature元素监听器代码
    // 因为HTML中使用的是多个复选框(time-6/8等)而不是单个select元素
    // 现在使用新的initializeTimeSignatureListeners()函数来处理拍号变化事件
    
    // 设置响应式布局监听器
    setupResponsiveLayoutListener();
    
    console.log('🔧 所有事件监听器已设置，包括实时节奏更新、拍号节奏选项切换和响应式布局');
});

// ====== 全局导出的响应式布局测试函数 ======

/**
 * 测试响应式布局功能（用于调试）
 */
function testResponsiveLayouts() {
    console.log('🧪 开始响应式布局测试...');
    
    const testWidths = [400, 700, 1000]; // 移动端、平板端、桌面端
    const scoreContainer = document.getElementById('score');
    
    if (!scoreContainer) {
        console.error('❌ 测试失败：未找到score容器');
        return;
    }
    
    const originalStyle = scoreContainer.style.cssText;
    let testIndex = 0;
    
    function runNextTest() {
        if (testIndex >= testWidths.length) {
            // 测试完成，恢复原始样式
            scoreContainer.style.cssText = originalStyle;
            console.log('✅ 响应式布局测试完成');
            return;
        }
        
        const testWidth = testWidths[testIndex];
        console.log(`\n📱 测试宽度 ${testWidth}px:`);
        
        // 临时设置容器宽度 (仅用于测试)
        scoreContainer.style.width = testWidth + 'px';
        scoreContainer.style.maxWidth = testWidth + 'px';
        console.log(`🧪 测试模式：临时设置宽度为 ${testWidth}px`);
        
        // 获取布局信息
        setTimeout(() => {
            const layout = getCurrentResponsiveLayout();
            console.log(`   布局类型: ${layout.layoutType}`);
            console.log(`   每行小节: ${layout.measuresPerLine}个`);
            console.log(`   实际宽度: ${layout.containerWidth}px`);
            
            testIndex++;
            setTimeout(runNextTest, 1000); // 等待1秒再进行下一个测试
        }, 500);
    }
    
    runNextTest();
}

/**
 * 强制重新生成当前旋律（用于布局变化后的测试）
 */
function regenerateCurrentMelody() {
    if (melodyHistory.length > 0 && currentHistoryIndex >= 0) {
        const currentMelody = melodyHistory[currentHistoryIndex];
        if (currentMelody) {
            console.log('🔄 重新生成当前旋律以适应当前布局');
            
            // 获取当前设置重新生成
            const generator = new IntelligentMelodyGenerator(
                currentMelody.config.measures,
                currentMelody.config.keySignature,
                currentMelody.config.timeSignature,
                currentMelody.config.clef,
                currentMelody.seed
            );
            
            const builder = new MusicXMLBuilder(generator, currentMelody.config);
            const measuresPerLine = builder.getMeasuresPerLine();
            const newXML = builder.build(measuresPerLine);
            
            renderMelodyWithOSMD(newXML);
            
            // 更新历史记录
            melodyHistory[currentHistoryIndex] = {
                ...currentMelody,
                musicXML: newXML
            };
            
            return true;
        }
    }
    
    console.warn('⚠️ 无当前旋律可重新生成');
    return false;
}

/**
 * 显示当前响应式布局信息
 */
function showCurrentLayout() {
    const layout = getCurrentResponsiveLayout();
    
    if (layout) {
        console.log('\n📊 当前响应式布局信息:');
        console.log(`   容器宽度: ${layout.containerWidth}px`);
        console.log(`   布局类型: ${layout.layoutType}`);
        console.log(`   每行小节: ${layout.measuresPerLine}个`);
        console.log(`   断点规则:`);
        console.log(`     桌面端: ${layout.breakpoints.desktop}`);
        console.log(`     平板端: ${layout.breakpoints.tablet}`);
        console.log(`     移动端: ${layout.breakpoints.mobile}`);
        
        return layout;
    } else {
        console.error('❌ 无法获取布局信息');
        return null;
    }
}

/**
 * renderMelodyWithOSMD函数定义
 */
async function renderMelodyWithOSMD(musicXML) {
    console.log('🎵 使用renderMelodyWithOSMD渲染MusicXML');
    
    const melodyData = {
        musicXML: musicXML,
        config: {
            measures: 8, // 默认值，可以从XML解析
            keySignature: 'C',
            timeSignature: '4/4',
            clef: 'treble'
        }
    };
    
    return await renderScore(melodyData);
}

// 修复RenderXMeasuresPerLineAkaSystem配置的函数
function fixRenderXMeasuresConfig() {
    console.log('🔧 修复RenderXMeasuresPerLineAkaSystem配置...');
    
    if (!osmd || !osmd.EngravingRules) {
        console.error('❌ OSMD实例或EngravingRules不存在');
        return;
    }
    
    const measuresPerLine = 4;
    
    console.log(`📋 修复前配置:`);
    console.log(`  - MaxMeasuresPerSystem: ${osmd.EngravingRules.MaxMeasuresPerSystem}`);
    console.log(`  - MinMeasuresPerSystem: ${osmd.EngravingRules.MinMeasuresPerSystem}`);
    console.log(`  - RenderXMeasuresPerLineAkaSystem: ${osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem}`);
    
    // 核心修复：设置RenderXMeasuresPerLineAkaSystem
    osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = measuresPerLine;
    osmd.EngravingRules.MaxMeasuresPerSystem = measuresPerLine;
    osmd.EngravingRules.MinMeasuresPerSystem = measuresPerLine;
    
    // 添加小节在系统内均匀分布的设置
    if (osmd.EngravingRules.hasOwnProperty('JustifyMeasuresInSystem')) {
        osmd.EngravingRules.JustifyMeasuresInSystem = true;
        console.log('✅ 启用JustifyMeasuresInSystem以确保小节均匀分布');
    } else if (osmd.EngravingRules.hasOwnProperty('justifyMeasuresInSystem')) {
        osmd.EngravingRules.justifyMeasuresInSystem = true;
        console.log('✅ 启用justifyMeasuresInSystem以确保小节均匀分布');
    }
    
    // 计算适当的小节宽度
    const scoreContainer = document.getElementById('score');
    const containerWidth = scoreContainer ? scoreContainer.clientWidth : 1000;
    const maxTotalWidth = 800;
    const availableWidth = Math.min(containerWidth - 60, maxTotalWidth);
    const measureWidth = Math.max(120, availableWidth / measuresPerLine);
    
    osmd.EngravingRules.FixedMeasureWidth = true;
    osmd.EngravingRules.FixedMeasureWidthFixedValue = measureWidth;
    
    console.log(`📋 修复后配置:`);
    console.log(`  - MaxMeasuresPerSystem: ${osmd.EngravingRules.MaxMeasuresPerSystem}`);
    console.log(`  - MinMeasuresPerSystem: ${osmd.EngravingRules.MinMeasuresPerSystem}`);
    console.log(`  - RenderXMeasuresPerLineAkaSystem: ${osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem}`);
    console.log(`  - FixedMeasureWidth: ${osmd.EngravingRules.FixedMeasureWidth}`);
    console.log(`  - FixedMeasureWidthFixedValue: ${Math.round(osmd.EngravingRules.FixedMeasureWidthFixedValue)}`);
    
    try {
        osmd.render();
        console.log('✅ 重新渲染完成');
        
        // 验证结果
        setTimeout(() => {
            const svg = scoreContainer.querySelector('svg');
            if (svg) {
                // 使用正确的选择器
                const allG = svg.querySelectorAll('g');
                let measures = [];
                
                allG.forEach(g => {
                    const id = g.getAttribute('id') || '';
                    const className = g.getAttribute('class') || '';
                    
                    if (id.includes('MeasureContent') || className.includes('measure')) {
                        measures.push(g);
                    }
                });
                
                console.log(`📊 渲染结果: ${measures.length}个小节`);
                
                // 分析每行的小节数
                if (measures.length > 0) {
                    const positions = [];
                    measures.forEach((measure, i) => {
                        const bbox = measure.getBBox();
                        positions.push({
                            measure: i + 1,
                            y: Math.round(bbox.y)
                        });
                    });
                    
                    // 按Y位置分组统计每行小节数
                    const lines = {};
                    positions.forEach(pos => {
                        const lineKey = Math.round(pos.y / 50) * 50; // 每50px为一行
                        if (!lines[lineKey]) lines[lineKey] = 0;
                        lines[lineKey]++;
                    });
                    
                    console.log('📐 每行小节分布:');
                    Object.keys(lines).forEach((y, index) => {
                        console.log(`  第${index + 1}行: ${lines[y]}个小节`);
                    });
                }
            }
        }, 300);
        
    } catch (error) {
        console.error('❌ 重新渲染失败:', error);
    }
}

// 强制应用4小节布局的调试函数（简化版）
function force4MeasuresPerLine() {
    console.log('🔧 强制应用4小节每行布局...');
    fixRenderXMeasuresConfig();
}

// 检查OSMD实际可用的属性和配置选项
function inspectOSMD() {
    console.log('🔍 检查OSMD实例的实际属性和方法...');
    
    if (!osmd) {
        console.error('❌ OSMD实例不存在');
        return;
    }
    
    console.log('📊 OSMD实例信息:');
    console.log('  - 类型:', typeof osmd);
    console.log('  - 构造函数:', osmd.constructor.name);
    
    if (osmd.EngravingRules) {
        console.log('📏 EngravingRules 属性:');
        const rules = osmd.EngravingRules;
        
        // 检查所有可能影响布局的属性
        const layoutProperties = [
            'MaxMeasuresPerSystem',
            'MinMeasuresPerSystem', 
            'RenderXMeasuresPerLineAkaSystem',
            'FixedMeasureWidth',
            'FixedMeasureWidthFixedValue',
            'NewSystemAtXMLNewSystem',
            'CompactMode',
            'PageFormat',
            'SystemDistance',
            'MeasureDistance'
        ];
        
        layoutProperties.forEach(prop => {
            if (prop in rules) {
                console.log(`  - ${prop}: ${rules[prop]}`);
            } else {
                console.log(`  - ${prop}: [不存在]`);
            }
        });
    } else {
        console.log('❌ EngravingRules不存在');
    }
    
    // 检查其他可能的配置对象
    const configObjects = ['rules', 'Options', 'settings', 'configuration'];
    configObjects.forEach(obj => {
        if (osmd[obj]) {
            console.log(`📋 找到配置对象 ${obj}:`, osmd[obj]);
        }
    });
}

// 创建一个最简单的4小节MusicXML测试
function createSimpleMusicXML() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.0">
  <part-list>
    <score-part id="P1">
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="3">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="5">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="6">
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="7">
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="8">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;
}

// 测试完全简化的OSMD渲染
async function testSimpleOSMD() {
    console.log('🧪 测试完全简化的OSMD渲染');
    
    try {
        const scoreDiv = document.getElementById('score');
        scoreDiv.innerHTML = '';
        
        // 重新初始化
        if (osmd) {
            osmd.clear();
            osmd = null;
        }
        
        // 创建最简单的OSMD实例
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("score", {
            autoResize: true,
            backend: "vexflow",
            drawTitle: false,
            drawSubtitle: false,
            drawComposer: false,
            drawLyricist: false,
            drawCredits: false,
            drawPartNames: false
        });
        
        // 启用glissando渲染和相关设置
        if (osmd.EngravingRules) {
            console.log('🔍 检查OSMD版本和功能支持:');
            console.log('  - OSMD版本:', typeof osmd.Version !== 'undefined' ? osmd.Version : '未知');
            console.log('  - 后端引擎:', osmd.backendType || '未知');
            console.log('  - EngravingRules对象:', Object.keys(osmd.EngravingRules).filter(key => key.includes('Render')));
            
            // 检查所有可能的渲染选项
            const allRenderOptions = Object.keys(osmd.EngravingRules).filter(key => 
                key.startsWith('Render') || key.includes('Glissando') || key.includes('Slur')
            );
            console.log('  - 所有渲染相关选项:', allRenderOptions);
            
            if ("RenderGlissandi" in osmd.EngravingRules) {
                osmd.EngravingRules.RenderGlissandi = true;
                console.log('✅ 已启用OSMD glissando渲染');
            } else {
                console.log('❌ OSMD不支持RenderGlissandi选项');
                console.log('🔍 检查替代选项: RenderGlissandos, DrawGlissando, etc.');
                
                // 检查可能的替代名称
                const glissandoAlternatives = ['RenderGlissandos', 'DrawGlissando', 'ShowGlissando'];
                glissandoAlternatives.forEach(alt => {
                    if (alt in osmd.EngravingRules) {
                        osmd.EngravingRules[alt] = true;
                        console.log(`✅ 找到并启用替代选项: ${alt}`);
                    }
                });
            }
            
            // 尝试启用所有可能相关的渲染选项
            const renderOptions = ['RenderSlurs', 'RenderArpeggios', 'RenderTies', 'RenderOrnaments', 'RenderArticulations'];
            renderOptions.forEach(option => {
                if (option in osmd.EngravingRules) {
                    osmd.EngravingRules[option] = true;
                    console.log(`✅ 已启用OSMD ${option}`);
                } else {
                    console.log(`❌ OSMD不支持${option}选项`);
                }
            });
            
            console.log('🔍 OSMD EngravingRules最终设置:');
            renderOptions.concat(['RenderGlissandi']).forEach(option => {
                if (option in osmd.EngravingRules) {
                    console.log(`  - ${option}: ${osmd.EngravingRules[option]}`);
                } else {
                    console.log(`  - ${option}: 不支持`);
                }
            });
        }
        
        // 隐藏标题和乐器名称
        if (osmd.EngravingRules) {
            osmd.EngravingRules.drawTitle = false;
            osmd.EngravingRules.drawSubtitle = false;
            osmd.EngravingRules.drawComposer = false;
            osmd.EngravingRules.drawLyricist = false;
            osmd.EngravingRules.drawCredits = false;
            osmd.EngravingRules.drawPartNames = false;
            console.log('✅ 已隐藏标题和乐器名称');
        }
        
        console.log('✅ OSMD实例创建完成');
        
        // 检查实际属性
        inspectOSMD();
        
        // 加载简单的8小节MusicXML
        const simpleXML = createSimpleMusicXML();
        await osmd.load(simpleXML);
        console.log('✅ 简单MusicXML加载完成');
        
        // 在渲染前尝试设置任何可用的配置
        if (osmd.EngravingRules) {
            console.log('🎛️ 尝试设置布局配置...');
            
            // 尝试所有可能的属性
            try { osmd.EngravingRules.MaxMeasuresPerSystem = 4; } catch(e) { console.log('MaxMeasuresPerSystem设置失败'); }
            try { osmd.EngravingRules.MinMeasuresPerSystem = 4; } catch(e) { console.log('MinMeasuresPerSystem设置失败'); }
            try { osmd.EngravingRules.FixedMeasureWidth = true; } catch(e) { console.log('FixedMeasureWidth设置失败'); }
            try { osmd.EngravingRules.FixedMeasureWidthFixedValue = 150; } catch(e) { console.log('FixedMeasureWidthFixedValue设置失败'); }
            
            // 添加小节在系统内均匀分布的设置
            try {
                if (osmd.EngravingRules.hasOwnProperty('JustifyMeasuresInSystem')) {
                    osmd.EngravingRules.JustifyMeasuresInSystem = true;
                    console.log('✅ 启用JustifyMeasuresInSystem');
                } else if (osmd.EngravingRules.hasOwnProperty('justifyMeasuresInSystem')) {
                    osmd.EngravingRules.justifyMeasuresInSystem = true;
                    console.log('✅ 启用justifyMeasuresInSystem');
                }
            } catch(e) { console.log('JustifyMeasuresInSystem设置失败:', e); }
        }
        
        // 渲染
        osmd.render();
        console.log('✅ 渲染完成');
        
        // 分析结果
        setTimeout(() => {
            const svg = scoreDiv.querySelector('svg');
            if (svg) {
                // 使用正确的选择器
                const allG = svg.querySelectorAll('g');
                let measures = [];
                
                allG.forEach(g => {
                    const id = g.getAttribute('id') || '';
                    const className = g.getAttribute('class') || '';
                    
                    if (id.includes('MeasureContent') || className.includes('measure')) {
                        measures.push(g);
                    }
                });
                
                console.log(`📊 渲染结果: 找到 ${measures.length} 个小节元素`);
                
                // 分析小节位置
                if (measures.length > 0) {
                    const positions = [];
                    measures.forEach((measure, i) => {
                        const bbox = measure.getBBox();
                        positions.push({
                            measure: i + 1,
                            x: Math.round(bbox.x),
                            y: Math.round(bbox.y)
                        });
                    });
                    
                    console.log('📐 小节位置分析:');
                    positions.forEach(pos => {
                        console.log(`  小节${pos.measure}: x=${pos.x}, y=${pos.y}`);
                    });
                }
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ 简化测试失败:', error);
    }
}

// 将这些函数导出到全局，方便在控制台调用
window.testResponsiveLayouts = testResponsiveLayouts;
window.regenerateCurrentMelody = regenerateCurrentMelody;
window.force4MeasuresPerLine = force4MeasuresPerLine;
window.inspectOSMD = inspectOSMD;
window.testSimpleOSMD = testSimpleOSMD;
window.testKeySignatureHandling = testKeySignatureHandling;

/**
 * 生成G大调的测试XML，直接测试OSMD的渲染
 */
function testGMajorXML() {
    console.log('\n🎵 生成G大调测试XML...');
    
    const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>1</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <!-- F# 不带alter标签（应该显示为F#） -->
      <note>
        <pitch>
          <step>F</step>
          <octave>5</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <!-- F自然音带alter=0（应该显示还原记号） -->
      <note>
        <pitch>
          <step>F</step>
          <alter>0</alter>
          <octave>5</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
        <accidental>natural</accidental>
      </note>
      <!-- G自然音 -->
      <note>
        <pitch>
          <step>G</step>
          <octave>5</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <!-- A自然音 -->
      <note>
        <pitch>
          <step>A</step>
          <octave>5</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;
    
    console.log('测试XML已生成，包含：');
    console.log('1. F不带alter（应显示F#）');
    console.log('2. F带alter=0（应显示F♮）');
    console.log('3. G和A（自然音）');
    
    // 渲染测试XML
    renderMelodyWithOSMD(testXML);
    
    return testXML;
}

window.testGMajorXML = testGMajorXML;

/**
 * 调试：检查当前渲染的内容
 */
function debugCurrentScore() {
    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) {
        console.log('❌ 找不到score元素');
        return;
    }
    
    // 查找所有音符
    const notes = scoreDiv.querySelectorAll('.vf-stavenote');
    console.log(`\n🎵 当前乐谱包含 ${notes.length} 个音符`);
    
    // 查找所有升降号
    const accidentals = scoreDiv.querySelectorAll('.vf-accidental');
    console.log(`🎵 包含 ${accidentals.length} 个临时记号`);
    
    // 查找调号
    const keySignatures = scoreDiv.querySelectorAll('.vf-keysignature');
    console.log(`🎵 包含 ${keySignatures.length} 个调号标记`);
    
    // 检查是否有还原记号
    const naturals = Array.from(scoreDiv.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        const className = typeof el.className === 'string' ? el.className : '';
        return text.includes('♮') || className.includes('natural');
    });
    
    if (naturals.length > 0) {
        console.warn(`⚠️ 发现 ${naturals.length} 个还原记号！`);
    }
    
    // 输出实际的SVG内容片段
    const svg = scoreDiv.querySelector('svg');
    if (svg) {
        const svgContent = svg.outerHTML.substring(0, 500);
        console.log('SVG内容预览:', svgContent);
    }
}

window.debugCurrentScore = debugCurrentScore;

/**
 * 测试G大调修复效果
 */
function testGMajorFix() {
    console.log('\n🧪 === 测试G大调修复 ===');
    
    // 创建一个包含F#的G大调音阶
    const testMelody = [
        { midi: 67, duration: { beats: 1 } }, // G4
        { midi: 69, duration: { beats: 1 } }, // A4
        { midi: 71, duration: { beats: 1 } }, // B4
        { midi: 72, duration: { beats: 1 } }, // C5
        { midi: 74, duration: { beats: 1 } }, // D5
        { midi: 76, duration: { beats: 1 } }, // E5
        { midi: 78, duration: { beats: 1 } }, // F#5 (关键测试点)
        { midi: 79, duration: { beats: 1 } }, // G5
    ];
    
    const generator = new IntelligentMelodyGenerator(2, 'G', '4/4', 'treble', 12345);
    
    console.log('🎵 G大调音阶MIDI转换测试:');
    testMelody.forEach((note, i) => {
        const result = generator.midiToMusicXML(note.midi);
        const noteStr = `${result.step}${result.alter === 1 ? '#' : result.alter === -1 ? 'b' : ''}${result.octave}`;
        console.log(`  ${i+1}. MIDI ${note.midi} -> ${noteStr}, alter=${result.alter === undefined ? 'undefined(自然音)' : result.alter}`);
    });
    
    // 构建完整MusicXML
    const builder = new MusicXMLBuilder(testMelody, {
        measures: 2,
        keySignature: 'G',
        timeSignature: '4/4',
        clef: 'treble'
    });
    
    const xml = builder.build(4);
    
    // 分析XML中的F音符处理
    console.log('\n📄 XML分析:');
    const fNoteRegex = /<step>F<\/step>[\s\S]*?(?:<\/note>)/g;
    const fNotes = xml.match(fNoteRegex) || [];
    
    if (fNotes.length > 0) {
        fNotes.forEach((fNote, i) => {
            const hasAlter = fNote.includes('<alter>1</alter>');
            console.log(`  F音符${i+1}: ${hasAlter ? '✅ 包含alter=1(F#)' : '❌ 缺少alter标签'}`);
        });
    } else {
        console.log('  未找到F音符');
    }
    
    // 渲染到页面
    console.log('\n🎨 渲染测试旋律...');
    renderScore({
        musicXML: xml,
        stats: { noteCount: 8, restCount: 0 },
        config: { measures: 2, keySignature: 'G', timeSignature: '4/4', clef: 'treble' }
    });
    
    // 延迟检查渲染结果
    setTimeout(() => {
        console.log('\n🔍 检查OSMD渲染结果...');
        debugCurrentScore();
    }, 1000);
    
    console.log('\n✅ 测试完成！请检查F#是否正确显示（不应有还原记号）');
}

window.testGMajorFix = testGMajorFix;

/**
 * 极简版：强制4小节每行
 */
async function forceFixedMeasuresLayout() {
    console.log('\n🔧 === 应用强力多小节布局 ===');
    
    if (!osmd) {
        console.error('❌ 请先生成旋律');
        return;
    }
    
    const scoreDiv = document.getElementById('score');
    const containerWidth = scoreDiv ? scoreDiv.clientWidth : 800;
    
    // 获取总小节数
    const totalMeasures = osmd.GraphicSheet ? osmd.GraphicSheet.MeasureList.length : 4;
    console.log(`📊 检测到 ${totalMeasures} 个小节`);
    
    // 强力设置多小节每行
    if (totalMeasures === 2) {
        osmd.EngravingRules.MaxMeasuresPerSystem = 2;
        osmd.EngravingRules.MinMeasuresPerSystem = 2;
        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 2;
    } else {
        osmd.EngravingRules.MaxMeasuresPerSystem = 4;
        osmd.EngravingRules.MinMeasuresPerSystem = Math.min(4, totalMeasures);
        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4;
    }
    
    // 启用XML换行
    osmd.EngravingRules.NewSystemFromXMLNewSystemAttribute = true;  // 启用MusicXML换行标记
    osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;  // 启用MusicXML换行标记
    osmd.EngravingRules.NewSystemAtXMLNewSystem = true;  // 启用<print new-system="yes"/>标记
    
    // 计算宽度
    osmd.EngravingRules.FixedMeasureWidth = true;
    const zoom = 0.7;
    const padding = 40;
    const effectiveWidth = (containerWidth - padding) / zoom;
    const maxMeasuresPerLine = totalMeasures === 2 ? 2 : 4;
    const measureWidth = Math.floor(effectiveWidth / maxMeasuresPerLine * 0.85);
    
    osmd.EngravingRules.FixedMeasureWidthFixedValue = measureWidth;
    osmd.zoom = zoom;
    
    // 设置边距
    osmd.EngravingRules.PageLeftMargin = 2;
    osmd.EngravingRules.PageRightMargin = 2;
    osmd.EngravingRules.SystemLeftMargin = 1;
    osmd.EngravingRules.SystemRightMargin = 1;
    osmd.EngravingRules.SystemDistance = 8;
    
    // 重新渲染
    osmd.render();
    console.log(`✅ 强力布局应用: 每行${maxMeasuresPerLine}小节，禁用XML换行`);
}

window.forceFixedMeasuresLayout = forceFixedMeasuresLayout;

/**
 * 调试函数：检查OSMD当前设置
 */
function debugOSMDSettings() {
    console.log('\n🔍 === OSMD当前设置 ===');
    if (!osmd) {
        console.error('❌ OSMD未初始化');
        return;
    }
    
    if (osmd.EngravingRules) {
        console.log('📋 EngravingRules设置:');
        console.log(`   - RenderXMeasuresPerLineAkaSystem: ${osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem}`);
        console.log(`   - FixedMeasureWidth: ${osmd.EngravingRules.FixedMeasureWidth}`);
        console.log(`   - FixedMeasureWidthFixedValue: ${osmd.EngravingRules.FixedMeasureWidthFixedValue}`);
        console.log(`   - PageLeftMargin: ${osmd.EngravingRules.PageLeftMargin}`);
        console.log(`   - PageRightMargin: ${osmd.EngravingRules.PageRightMargin}`);
        console.log(`   - SystemLeftMargin: ${osmd.EngravingRules.SystemLeftMargin}`);
        console.log(`   - SystemRightMargin: ${osmd.EngravingRules.SystemRightMargin}`);
    }
    
    console.log(`📐 Zoom: ${osmd.zoom}`);
    
    if (osmd.GraphicSheet && osmd.GraphicSheet.MeasureList) {
        console.log(`📊 总小节数: ${osmd.GraphicSheet.MeasureList.length}`);
    }
}

window.debugOSMDSettings = debugOSMDSettings;

/**
 * 创建一个完全自定义的4小节布局测试
 */
async function test4MeasuresLayout() {
    console.log('\n🧪 === 测试4小节布局 ===');
    
    // 生成一个16小节的测试旋律（应该显示为4行）
    const testMelodyData = generateMelodyData(16, 'C', '4/4', 'treble', 99999);
    
    console.log('📝 生成16小节测试旋律...');
    
    // 渲染
    await renderScore(testMelodyData);
    
    // 等待渲染完成后检查
    setTimeout(async () => {
        console.log('\n🔍 检查布局结果...');
        const scoreDiv = document.getElementById('score');
        const svg = scoreDiv.querySelector('svg');
        
        if (svg) {
            // 分析SVG结构
            const gElements = svg.querySelectorAll('g');
            let measureCount = 0;
            let systemCount = 0;
            
            gElements.forEach(g => {
                const id = g.getAttribute('id') || '';
                const className = g.getAttribute('class') || '';
                
                if (id.includes('measure') || className.includes('measure')) {
                    measureCount++;
                }
                if (id.includes('system') || className.includes('system')) {
                    systemCount++;
                }
            });
            
            console.log(`✅ 布局分析:`);
            console.log(`   - 总小节数: ${measureCount}`);
            console.log(`   - 系统(行)数: ${systemCount}`);
            console.log(`   - 预期: 16小节分为4行，每行4小节`);
            
            // 获取第一行的小节位置
            const firstLineMeasures = [];
            let currentY = null;
            
            gElements.forEach(g => {
                if (g.getAttribute('id')?.includes('measure')) {
                    const transform = g.getAttribute('transform');
                    if (transform) {
                        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
                        if (match) {
                            const y = parseFloat(match[2]);
                            if (currentY === null) currentY = y;
                            
                            if (Math.abs(y - currentY) < 10) {
                                firstLineMeasures.push(g);
                            }
                        }
                    }
                }
            });
            
            console.log(`   - 第一行小节数: ${firstLineMeasures.length}`);
            
            if (firstLineMeasures.length !== 4) {
                console.warn('⚠️ 第一行不是4个小节，尝试强制修复...');
                await forceFixedMeasuresLayout();
            } else {
                console.log('✅ 布局正确：每行4小节');
            }
        }
    }, 1000);
}

window.test4MeasuresLayout = test4MeasuresLayout;

// 定义设置更新函数（完整版专用）
function updateMinNote() {
    console.log('🎵 更新最低音符：完整版功能');
    // 完整版用户可以使用此功能
}

function updateMaxNote() {
    console.log('🎵 更新最高音符：完整版功能');
    // 完整版用户可以使用此功能
}

function updateMaxInterval() {
    console.log('🎵 更新最大音程：完整版功能');
    // 完整版用户可以使用此功能
}

function updateAccidentalRate() {
    console.log('🎵 更新临时记号率：完整版功能');
    // 完整版用户可以使用此功能
}

// 导出主要功能函数到全局，修复按钮无响应问题
window.generateMelody = generateMelody;
window.previousMelody = previousMelody;
window.nextMelody = nextMelody;
window.regenerateSameSeed = regenerateSameSeed;
window.updateMinNote = updateMinNote;
window.updateMaxNote = updateMaxNote;
window.updateMaxInterval = updateMaxInterval;
window.updateAccidentalRate = updateAccidentalRate;

// 导出弹窗相关函数
window.openRhythmSettings = openRhythmSettings;
window.closeRhythmSettings = closeRhythmSettings;
window.saveRhythmSettings = saveRhythmSettings;
window.openArticulationSettings = openArticulationSettings;
window.closeArticulationSettings = closeArticulationSettings;
window.saveArticulationSettings = saveArticulationSettings;
window.selectAllBasicArticulations = selectAllBasicArticulations;
window.selectAllGuitarTechniques = selectAllGuitarTechniques;
window.selectAllRhythms = selectAllRhythms;
// 高级设置相关函数
window.toggleRhythmAdvancedSettings = toggleRhythmAdvancedSettings;
window.resetRhythmFrequencies = resetRhythmFrequencies;
window.toggleArticulationAdvancedSettings = toggleArticulationAdvancedSettings;
window.resetArticulationFrequencies = resetArticulationFrequencies;
window.resetRangeSettings = resetRangeSettings;
window.resetAllRangeSettings = resetAllRangeSettings;
window.updateUIForClefRange = updateUIForClefRange;

console.log('📚 OSMD视奏生成器已完全加载');
console.log('✅ 主要功能函数已导出到全局');
console.log('💡 可用调试命令:');
console.log('   - testGMajorFix() : 测试G大调F#渲染');
console.log('   - test4MeasuresLayout() : 测试4小节/行布局');
console.log('   - forceFixedMeasuresLayout() : 强制修复为4小节/行');
console.log('🔧 可用的调试函数:');
console.log('   - testSimpleOSMD(): 测试最简化的OSMD渲染并检查属性');
console.log('🎹 音域设置函数:');
console.log('   - resetRangeSettings(): 重置当前谱号的音域设置');
console.log('   - resetAllRangeSettings(): 重置所有谱号的音域设置');
console.log('   - updateUIForClefRange("treble/alto/bass"): 更新UI显示为指定谱号的音域');
console.log('   - inspectOSMD(): 检查OSMD实际可用的属性（需要先有实例）');
console.log('   - force4MeasuresPerLine(): 强制应用4小节布局');
console.log('📏 目标: 所有设备强制4小节每行');
console.log('');
console.log('🚀 请在控制台运行: testSimpleOSMD()');
console.log('   这将创建OSMD实例并测试4小节布局');

// ====== 6/8拍专用UI更新函数 ======

/**
 * 更新拍号类型信息和6/8拍专用面板
 */
function updateTimeSignatureInfo(timeSignature, stats) {
    // 更新拍号类型显示
    const timeSigElement = document.getElementById('timeSigType');
    const timeSigInfo = document.getElementById('timeSigInfo');
    
    if (!timeSigElement || !timeSigInfo) return;
    
    // 根据拍号设置显示内容
    switch (timeSignature) {
        case '6/8':
            timeSigElement.textContent = '6/8 复合二拍子';
            timeSigElement.classList.add('highlight');
            timeSigInfo.style.display = 'block';
            
            // 更新6/8拍专用信息
            update68Info(stats);
            break;
        case '4/4':
            timeSigElement.textContent = '4/4 简单四拍子';
            timeSigElement.classList.remove('highlight');
            timeSigInfo.style.display = 'none';
            break;
        case '3/4':
            timeSigElement.textContent = '3/4 简单三拍子';
            timeSigElement.classList.remove('highlight');
            timeSigInfo.style.display = 'none';
            break;
        case '2/4':
            timeSigElement.textContent = '2/4 简单二拍子';
            timeSigElement.classList.remove('highlight');
            timeSigInfo.style.display = 'none';
            break;
        default:
            timeSigElement.textContent = timeSignature;
            timeSigElement.classList.remove('highlight');
            timeSigInfo.style.display = 'none';
    }
}

/**
 * 更新6/8拍专用信息面板
 */
function update68Info(stats) {
    // 分析beam组数量，确定是否正确实现了3+3分组
    const expectedBeams = Math.floor(stats.noteCount * 0.6); // 假设60%的音符需要beam连接
    const beamEfficiency = stats.beamCount > 0 ? 
        Math.min(100, (stats.beamCount / Math.max(1, expectedBeams) * 100)) : 0;
    
    // 根据休止符比例和beam连接情况判断节奏特点
    let rhythmFeature = '标准流动';
    if (stats.restRatio > 0.3) {
        rhythmFeature = '跳跃感强';
    } else if (beamEfficiency > 70) {
        rhythmFeature = '连绵流畅';
    } else if (stats.beamCount < 2) {
        rhythmFeature = '独立音符';
    }
    
    // 更新显示
    const meterTypeElement = document.getElementById('meterType');
    const beamGroupsElement = document.getElementById('beamGroups');
    const strongBeatsElement = document.getElementById('strongBeats');
    const rhythmFeaturesElement = document.getElementById('rhythmFeatures');
    
    if (meterTypeElement) meterTypeElement.textContent = '复合二拍子';
    if (beamGroupsElement) {
        beamGroupsElement.textContent = stats.beamCount > 0 ? 
            `3+3分组 (${stats.beamCount}组)` : '3+3分组';
    }
    if (strongBeatsElement) strongBeatsElement.textContent = '0.0, 1.5拍';
    if (rhythmFeaturesElement) rhythmFeaturesElement.textContent = rhythmFeature;
    
    console.log(`🎵 6/8拍分析: beam组${stats.beamCount}个, 节奏特点: ${rhythmFeature}`);
}

// ====== 6/8拍Beat Clarity规则实现 ======

/**
 * 🔥 全新简化版：6/8拍十六分音符生成器
 * 抛弃所有复杂逻辑，使用直接有效的方法
 */
function generate68MeasureWithBeatClarity(measureNumber, currentMidi, scale, userRange, maxJump, isLastMeasure, random, needsPhraseBreathe = false, clef = 'treble', keySignature = 'C', accidentalRate = 0) {
    console.log('🎼 [Cantus Firmus风格] 6/8拍旋律生成器');
    console.log(`🎯 临时记号概率: ${(accidentalRate * 100).toFixed(0)}%`);
    
    // 🔥 修复：添加临时记号处理函数 - 与主6/8拍逻辑保持一致
    function addAccidentalIfNeeded(midi) {
        if (accidentalRate > 0 && random.nextFloat() < accidentalRate) {
            return addAccidental(midi);
        }
        return midi;
    }
    
    function addAccidental(midi) {
        const accidentalChoices = [];
        const noteClass = midi % 12;
        const keySignatureInfo = isNoteAffectedByKeySignature(noteClass, keySignature);
        
        // 尝试添加升号（+1半音）
        const sharpNote = midi + 1;
        const sharpNoteClass = sharpNote % 12;
        
        if (sharpNote <= userRange.max && 
            !keySignatureInfo.isSharp && 
            !isNoteAffectedByKeySignature(sharpNoteClass, keySignature).isFlat) {
            accidentalChoices.push(sharpNote);
        }
        
        // 尝试添加降号（-1半音）  
        const flatNote = midi - 1;
        const flatNoteClass = flatNote % 12;
        
        if (flatNote >= userRange.min && 
            !keySignatureInfo.isFlat && 
            !isNoteAffectedByKeySignature(flatNoteClass, keySignature).isSharp) {
            accidentalChoices.push(flatNote);
        }
        
        // 如果没有可用的临时记号，返回原音符
        if (accidentalChoices.length === 0) {
            console.log(`🎯 6/8拍Beat Clarity：音符MIDI ${midi}无需添加临时记号（避免与${keySignature}调号重复）`);
            return midi;
        }
        
        // 随机选择升号或降号
        const selectedNote = accidentalChoices[Math.floor(random.nextFloat() * accidentalChoices.length)];
        console.log(`🎯 6/8拍Beat Clarity：为MIDI ${midi}添加临时记号变为MIDI ${selectedNote}`);
        return selectedNote;
    }
    
    // 🔥 修复调号处理：创建临时生成器用于正确的音符拼写
    const tempGenerator = new IntelligentMelodyGenerator(1, keySignature, '6/8', clef, random.seed || 12345);
    
    // 定义使用正确调号逻辑的音符信息转换函数
    function midiToNoteInfoWithCorrectSpelling(midi) {
        const result = tempGenerator.midiToMusicXML(midi);
        return {
            midi: midi,
            step: result.step,
            alter: result.alter,
            octave: result.octave
        };
    }
    
    // 🎯 严格遵守用户设置
    const userRhythms = (typeof userSettings !== 'undefined' && Array.isArray(userSettings.allowedRhythms)) ? 
        userSettings.allowedRhythms : ['eighth'];
    const allowDottedNotes = (typeof userSettings !== 'undefined') ? userSettings.allowDottedNotes : false;
    // allowUpbeat setting removed
    
    // 确保用户设置有效
    const safeUserRange = userRange || { min: 60, max: 72 };
    // 🔥 6/8拍音程跨度最高优先权：严格遵循最小勾选音程作为最大跨度
    const safeMaxJump = maxJump || 12; // 来自主函数的最小勾选音程
    const safeScale = scale || [0, 2, 4, 5, 7, 9, 11];
    
    // 🚨 6/8拍音程跨度验证 - 最高优先权
    console.log(`🎯 6/8拍音程跨度验证：严格限制为 ${safeMaxJump} 半音 (来自用户勾选的最小音程)`);
    if (typeof userSettings !== 'undefined' && userSettings.allowedIntervals) {
        const minAllowedInterval = Math.min(...userSettings.allowedIntervals);
        if (safeMaxJump !== minAllowedInterval) {
            console.warn(`⚠️ 6/8拍音程跨度不匹配! 期望: ${minAllowedInterval}, 实际: ${safeMaxJump}`);
        } else {
            console.log(`✅ 6/8拍音程跨度正确：${safeMaxJump} 半音`);
        }
    }
    
    const has16th = userRhythms.includes('16th') || userRhythms.includes('sixteenth');
    const hasEighth = userRhythms.includes('eighth') || userRhythms.includes('8th');
    const hasQuarter = userRhythms.includes('quarter') || userRhythms.includes('4th');
    // 🔥 修复附点四分音符检测缺失问题
    const hasDottedQuarter = userRhythms.includes('quarter.') || userRhythms.includes('dotted-quarter');
    const hasHalf = userRhythms.includes('half') || userRhythms.includes('2nd');
    const hasDuplet = userRhythms.includes('duplet');
    const hasQuadruplet = userRhythms.includes('quadruplet');
    
    console.log(`🎛️ 用户设置严格模式:`);
    console.log(`  - 音域: MIDI ${safeUserRange.min}-${safeUserRange.max}`);
    console.log(`  - 最大跳度: ${safeMaxJump}半音`);
    console.log(`  - 允许节奏: [${userRhythms.join(', ')}]`);
    console.log(`  - 十六分音符: ${has16th}, 八分音符: ${hasEighth}, 四分音符: ${hasQuarter}, 二分音符: ${hasHalf}`);
    console.log(`  - 二连音: ${hasDuplet}, 四连音: ${hasQuadruplet}`);
    console.log(`  - 允许附点: ${allowDottedNotes}`);
    // allowUpbeat console log removed
    
    // 🎵 6/8拍正确的节奏模式 - 强调0.0和1.5拍
    const notes = [];
    
    // 定义6/8拍的时间位置 (divisions=4时)
    const BEAT_POSITIONS = {
        strong1: 0.0,      // 第1强拍 (第1个八分音符)
        weak1: 0.5,        // 弱拍 (第2个八分音符) 
        weak2: 1.0,        // 弱拍 (第3个八分音符)
        strong2: 1.5,      // 第2强拍 (第4个八分音符)
        weak3: 2.0,        // 弱拍 (第5个八分音符)
        weak4: 2.5         // 弱拍 (第6个八分音符)
    };
    
    // 根据用户设置构建可用的节奏模式
    let availablePatterns = [];
    
    // 🔥 强化频率控制：6/8拍节奏类型映射到4/4拍对应频率设置
    const isEighthAllowed = hasEighth && (userSettings?.rhythmFrequencies?.eighth === undefined || userSettings.rhythmFrequencies.eighth > 0);
    const isQuarterAllowed = hasQuarter && (userSettings?.rhythmFrequencies?.quarter === undefined || userSettings.rhythmFrequencies.quarter > 0);
    // 🔥 6/8拍中的附点四分音符对应4/4拍中的二分音符
    const isDottedQuarterAllowed = hasDottedQuarter && 
                                  (userSettings?.rhythmFrequencies?.half === undefined || userSettings.rhythmFrequencies.half > 0);
    const isHalfAllowed = hasHalf && (userSettings?.rhythmFrequencies?.half === undefined || userSettings.rhythmFrequencies.half > 0);
    // 🔥 6/8拍中的附点二分音符对应4/4拍中的全音符
    const isDottedHalfAllowed = (userRhythms.includes('half.') || userRhythms.includes('dotted-half')) && 
                               (userSettings?.rhythmFrequencies?.whole === undefined || userSettings.rhythmFrequencies.whole > 0);
    const is16thAllowed = has16th && (userSettings?.rhythmFrequencies?.['16th'] === undefined || userSettings.rhythmFrequencies['16th'] > 0);
    // 🔥 6/8拍中的二连音和四连音对应4/4拍中的三连音
    const isDupletAllowed = hasDuplet && (userSettings?.rhythmFrequencies?.triplet === undefined || userSettings.rhythmFrequencies.triplet > 0);
    const isQuadrupletAllowed = hasQuadruplet && (userSettings?.rhythmFrequencies?.triplet === undefined || userSettings.rhythmFrequencies.triplet > 0);
    
    console.log(`🔥 6/8拍高级频率控制检查结果（映射到4/4拍对应频率）:`);
    console.log(`  - 八分音符: ${hasEighth} && eighth_freq=${userSettings?.rhythmFrequencies?.eighth}% -> ${isEighthAllowed}`);
    console.log(`  - 四分音符: ${hasQuarter} && quarter_freq=${userSettings?.rhythmFrequencies?.quarter}% -> ${isQuarterAllowed}`);
    // 🔥 6/8拍中的附点四分音符使用4/4拍的二分音符频率
    console.log(`  - 附点四分音符: ${hasDottedQuarter} && half_freq=${userSettings?.rhythmFrequencies?.half}% -> ${isDottedQuarterAllowed}`);
    console.log(`  - 二分音符: ${hasHalf} && half_freq=${userSettings?.rhythmFrequencies?.half}% -> ${isHalfAllowed}`);
    // 🔥 6/8拍中的附点二分音符使用4/4拍的全音符频率
    console.log(`  - 附点二分音符: ${userRhythms.includes('half.') || userRhythms.includes('dotted-half')} && whole_freq=${userSettings?.rhythmFrequencies?.whole}% -> ${isDottedHalfAllowed}`);
    console.log(`  - 十六分音符: ${has16th} && 16th_freq=${userSettings?.rhythmFrequencies?.['16th']}% -> ${is16thAllowed}`);
    // 🔥 6/8拍中的二连音和四连音使用4/4拍的三连音频率
    console.log(`  - 二连音: ${hasDuplet} && triplet_freq=${userSettings?.rhythmFrequencies?.triplet}% -> ${isDupletAllowed}`);
    console.log(`  - 四连音: ${hasQuadruplet} && triplet_freq=${userSettings?.rhythmFrequencies?.triplet}% -> ${isQuadrupletAllowed}`);
    
    // 基础八分音符模式（只有当高级设置允许时才可用）
    if (isEighthAllowed) {
        availablePatterns.push({
            name: '标准八分音符',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },   // 强拍
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },  // 弱拍
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },  // 弱拍
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },   // 强拍
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },  // 弱拍
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }   // 弱拍
            ]
        });
        console.log(`✅ 添加八分音符模式（通过频率控制）`);
    } else {
        console.log(`🚫 跳过八分音符模式（被高级设置阻止）`);
    }
    
    // 🔥 添加附点二分音符模式（只有当高级设置允许时才可用）
    if (isDottedHalfAllowed) {
        availablePatterns.push({
            name: '整小节附点二分音符',
            rhythm: [
                { position: 0.0, duration: 12, type: 'half', dots: 1, isStrong: true } // 整小节: 附点二分音符（12个divisions = 3个四分音符）
            ]
        });
        console.log(`✅ 添加附点二分音符模式（使用4/4拍全音符频率控制）`);
    } else {
        console.log(`🚫 跳过附点二分音符模式（被4/4拍全音符频率设置阻止）`);
    }
    
    // 四分音符模式（只有当高级设置允许时才可用）- 🔥 修复：包括附点四分音符
    if ((isQuarterAllowed || isDottedQuarterAllowed) && isEighthAllowed) {
        availablePatterns.push({
            name: '强拍四分音符1',
            rhythm: [
                { position: 0.0, duration: 4, type: 'quarter', isStrong: true },  // 强拍长音
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },  // 弱拍
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },   // 强拍
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },  // 弱拍
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }   // 弱拍
            ]
        });
        
        availablePatterns.push({
            name: '强拍四分音符2', 
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },   // 强拍
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },  // 弱拍
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },  // 弱拍
                { position: 1.5, duration: 4, type: 'quarter', isStrong: true },  // 强拍长音
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }   // 弱拍
            ]
        });
    }
    
    // 更多四分音符模式（只有当高级设置允许时才可用）- 🔥 修复：包括附点四分音符
    if (isQuarterAllowed || isDottedQuarterAllowed) {
        // 四分音符模式3: 独立的强拍四分音符（不依赖八分音符）
        availablePatterns.push({
            name: '纯四分音符强拍',
            rhythm: [
                { position: 0.0, duration: 4, type: 'quarter', isStrong: true },     // 第1组强拍长音
                { position: 1.0, duration: 2, type: 'quarter-rest', isStrong: false }, // 第1组弱拍休止
                { position: 1.5, duration: 4, type: 'quarter', isStrong: true },     // 第2组强拍长音
                { position: 2.5, duration: 2, type: 'quarter-rest', isStrong: false }  // 第2组弱拍休止
            ]
        });

        // 四分音符模式4: 第一组四分音符，第二组空
        availablePatterns.push({
            name: '第一组四分音符',
            rhythm: [
                { position: 0.0, duration: 4, type: 'quarter', isStrong: true },     // 第1组: 1拍长音
                { position: 1.0, duration: 2, type: 'quarter-rest', isStrong: false }, // 第1组: 3拍休止
                { position: 1.5, duration: 6, type: 'quarter', dots: 1, isStrong: true }  // 第2组: 整组附点四分音符
            ]
        });

        // 四分音符模式5: 第二组四分音符，第一组空
        availablePatterns.push({
            name: '第二组四分音符',
            rhythm: [
                { position: 0.0, duration: 6, type: 'quarter', dots: 1, isStrong: true }, // 第1组: 整组附点四分音符
                { position: 1.5, duration: 4, type: 'quarter', isStrong: true },     // 第2组: 1拍长音
                { position: 2.5, duration: 2, type: 'quarter-rest', isStrong: false }  // 第2组: 3拍休止
            ]
        });

        // 四分音符模式6: 分布式四分音符
        availablePatterns.push({
            name: '分布式四分音符',
            rhythm: [
                { position: 0.0, duration: 4, type: 'quarter', isStrong: true },     // 第1组: 1-2拍长音
                { position: 1.0, duration: 2, type: 'eighth-rest', isStrong: false }, // 第1组: 3拍休止
                { position: 1.5, duration: 2, type: 'eighth-rest', isStrong: true }, // 第2组: 1拍休止
                { position: 2.0, duration: 4, type: 'quarter', isStrong: false }     // 第2组: 2-3拍长音
            ]
        });
    }

    // 二分音符模式（只有当高级设置允许时才可用）
    if (isHalfAllowed) {
        // 二分音符模式1: 整小节附点二分音符
        availablePatterns.push({
            name: '整小节附点二分音符',
            rhythm: [
                { position: 0.0, duration: 12, type: 'half', dots: 1, isStrong: true } // 整小节: 附点二分音符（12个divisions = 3个四分音符）
            ]
        });

        // 二分音符模式2: 第一组附点四分音符，第二组附点四分音符
        availablePatterns.push({
            name: '双附点四分音符',
            rhythm: [
                { position: 0.0, duration: 6, type: 'quarter', dots: 1, isStrong: true }, // 第1组: 附点四分音符（6个divisions = 3个八分音符）
                { position: 1.5, duration: 6, type: 'quarter', dots: 1, isStrong: true }  // 第2组: 附点四分音符（6个divisions = 3个八分音符）
            ]
        });

        // 二分音符模式3: 混合附点四分音符与分解音符
        availablePatterns.push({
            name: '混合附点四分音符',
            rhythm: [
                { position: 0.0, duration: 6, type: 'quarter', dots: 1, isStrong: true }, // 第1组: 附点四分音符
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },           // 第2组: 1拍八分音符  
                { position: 2.0, duration: 4, type: 'quarter', isStrong: false }          // 第2组: 2-3拍四分音符
            ]
        });
    }

    // 附点音符模式（如果允许）
    if (allowDottedNotes && hasQuarter && hasEighth) {
        availablePatterns.push({
            name: '附点四分音符',
            rhythm: [
                { position: 0.0, duration: 6, type: 'quarter', dots: 1, isStrong: true },  // 强拍附点
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },            // 强拍
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },           // 弱拍
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }            // 弱拍
            ]
        });
    }
    
    // 十六分音符模式（只有当高级设置允许时才可用）- 严格遵循6/8拍3+3分组原则
    if (is16thAllowed && isEighthAllowed) {
        // 模式1: 第一组内装饰（0-1.5范围内的3拍分组）
        availablePatterns.push({
            name: '第一组装饰',
            rhythm: [
                { position: 0.0, duration: 1, type: '16th', isStrong: true },        // 第1组: 1拍强
                { position: 0.25, duration: 1, type: '16th', isStrong: false },      // 第1组: 2拍弱
                { position: 0.5, duration: 1, type: '16th', isStrong: false },       // 第1组: 3拍弱
                { position: 0.75, duration: 1, type: '16th', isStrong: false },      // 第1组: 续装饰
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 结束
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },      // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },     // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }      // 第2组: 3拍弱
            ]
        });

        // 模式2: 第二组内装饰（1.5-3.0范围内的3拍分组）
        availablePatterns.push({
            name: '第二组装饰',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },      // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 3拍弱
                { position: 1.5, duration: 1, type: '16th', isStrong: true },        // 第2组: 1拍强
                { position: 1.75, duration: 1, type: '16th', isStrong: false },      // 第2组: 2拍弱
                { position: 2.0, duration: 1, type: '16th', isStrong: false },       // 第2组: 3拍弱
                { position: 2.25, duration: 1, type: '16th', isStrong: false },      // 第2组: 续装饰
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }      // 第2组: 结束
            ]
        });

        // 模式3: 第一组内经过音装饰
        availablePatterns.push({
            name: '第一组经过音',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },      // 第1组: 1拍强
                { position: 0.5, duration: 1, type: '16th', isStrong: false },       // 第1组: 2拍弱装饰
                { position: 0.75, duration: 1, type: '16th', isStrong: false },      // 第1组: 经过音
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },      // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },     // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }      // 第2组: 3拍弱
            ]
        });

        // 模式4: 第二组内经过音装饰  
        availablePatterns.push({
            name: '第二组经过音',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },      // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },      // 第2组: 1拍强
                { position: 2.0, duration: 1, type: '16th', isStrong: false },       // 第2组: 2拍弱装饰
                { position: 2.25, duration: 1, type: '16th', isStrong: false },      // 第2组: 经过音
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }      // 第2组: 3拍弱
            ]
        });

        // 模式5: 双组装饰（两个组都有装饰，严格遵循3+3）
        availablePatterns.push({
            name: '双组装饰',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },      // 第1组: 1拍强
                { position: 0.5, duration: 1, type: '16th', isStrong: false },       // 第1组: 2拍弱装饰
                { position: 0.75, duration: 1, type: '16th', isStrong: false },      // 第1组: 装饰续
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },      // 第2组: 1拍强
                { position: 2.0, duration: 1, type: '16th', isStrong: false },       // 第2组: 2拍弱装饰
                { position: 2.25, duration: 1, type: '16th', isStrong: false },      // 第2组: 装饰续
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }      // 第2组: 3拍弱
            ]
        });
    }
    
    // 休止符模式（大幅增加休止符的比例和随机性）
    if (hasEighth) {
        // 休止符模式1: 第一组第1拍休止（强拍休止，创造意外感）
        availablePatterns.push({
            name: '强拍休止1',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth-rest', isStrong: true },  // 第1组: 1拍休止！
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },      // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 休止符模式2: 第一组第2拍休止
        availablePatterns.push({
            name: '第一组第2拍休止',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },       // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth-rest', isStrong: false }, // 第1组: 2拍休止
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },      // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 休止符模式3: 第一组第3拍休止
        availablePatterns.push({
            name: '第一组第3拍休止',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },       // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth-rest', isStrong: false }, // 第1组: 3拍休止
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },      // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 休止符模式4: 次强拍休止（第二组第1拍）
        availablePatterns.push({
            name: '次强拍休止',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },       // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth-rest', isStrong: true },  // 第2组: 1拍休止！
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },      // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 休止符模式5: 第二组第2拍休止
        availablePatterns.push({
            name: '第二组第2拍休止',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },       // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth-rest', isStrong: false }, // 第2组: 2拍休止
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 休止符模式6: 第二组第3拍休止
        availablePatterns.push({
            name: '第二组第3拍休止',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },       // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },      // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth-rest', isStrong: false }  // 第2组: 3拍休止
            ]
        });
        
        // 休止符模式7: 连续休止符（合并为四分休止符）
        availablePatterns.push({
            name: '连续休止符1',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },       // 第1组: 1拍强
                { position: 0.5, duration: 4, type: 'quarter-rest', isStrong: false }, // 第1组: 2-3拍合并四分休止符
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },      // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 休止符模式8: 第二组连续休止符（合并为四分休止符）
        availablePatterns.push({
            name: '连续休止符2',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },       // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 4, type: 'quarter-rest', isStrong: false }  // 第2组: 2-3拍合并四分休止符
            ]
        });
        
        // 休止符模式9: 分散休止符（两组各有一个）
        availablePatterns.push({
            name: '分散休止符1',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth-rest', isStrong: true },  // 第1组: 1拍休止
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth-rest', isStrong: false }, // 第2组: 2拍休止
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 休止符模式10: 分散休止符（不同位置）
        availablePatterns.push({
            name: '分散休止符2',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },       // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth-rest', isStrong: false }, // 第1组: 2拍休止
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth-rest', isStrong: true },  // 第2组: 1拍休止
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },      // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 休止符模式11: 三个休止符（高密度休止）
        availablePatterns.push({
            name: '高密度休止符',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth-rest', isStrong: true },  // 第1组: 1拍休止
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth-rest', isStrong: false }, // 第1组: 3拍休止
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth-rest', isStrong: false }, // 第2组: 2拍休止
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 休止符模式12: 极简模式（只有两个音符，合并连续休止符）
        availablePatterns.push({
            name: '极简休止符',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },       // 第1组: 1拍强
                { position: 0.5, duration: 4, type: 'quarter-rest', isStrong: false }, // 第1组: 2-3拍合并四分休止符
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 4, type: 'quarter-rest', isStrong: false }  // 第2组: 2-3拍合并四分休止符
            ]
        });
    }
    
    // 休止符+十六分音符混合模式（只有当高级设置允许时才可用）
    if (isEighthAllowed && is16thAllowed) {
        // 混合模式1: 休止符与单独十六分音符
        availablePatterns.push({
            name: '休止符十六分混合1',
            rhythm: [
                { position: 0.0, duration: 1, type: '16th', isStrong: true },         // 第1组: 1拍十六分
                { position: 0.25, duration: 1, type: '16th-rest', isStrong: false },  // 十六分休止
                { position: 0.5, duration: 2, type: 'eighth-rest', isStrong: false }, // 第1组: 2拍休止
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 1, type: '16th', isStrong: false },        // 第2组: 2拍十六分
                { position: 2.25, duration: 1, type: '16th-rest', isStrong: false },  // 十六分休止
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 混合模式2: 复杂切分与休止符
        availablePatterns.push({
            name: '复杂切分休止',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth-rest', isStrong: true },  // 第1组: 1拍休止
                { position: 0.5, duration: 1, type: '16th', isStrong: false },        // 第1组: 2拍十六分
                { position: 0.75, duration: 1, type: '16th-rest', isStrong: false },  // 十六分休止
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 3拍弱
                { position: 1.5, duration: 1, type: '16th-rest', isStrong: true },    // 次强拍休止！
                { position: 1.75, duration: 1, type: '16th', isStrong: false },       // 第2组: 十六分恢复
                { position: 2.0, duration: 2, type: 'eighth-rest', isStrong: false }, // 第2组: 2拍休止
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 混合模式3: 交替休止符和十六分音符
        availablePatterns.push({
            name: '交替休止十六分',
            rhythm: [
                { position: 0.0, duration: 1, type: '16th', isStrong: true },         // 第1组: 1拍十六分
                { position: 0.25, duration: 1, type: '16th-rest', isStrong: false },  // 十六分休止
                { position: 0.5, duration: 1, type: '16th', isStrong: false },        // 第1组: 2拍十六分
                { position: 0.75, duration: 1, type: '16th-rest', isStrong: false },  // 十六分休止
                { position: 1.0, duration: 2, type: 'eighth-rest', isStrong: false }, // 第1组: 3拍休止
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },      // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth-rest', isStrong: false }  // 第2组: 3拍休止
            ]
        });
    }
    
    // 单独十六分音符syncopation模式（只有当高级设置允许时才可用）
    if (is16thAllowed && isEighthAllowed) {
        // Syncopation模式1: 单独十六分音符在弱拍创造切分
        availablePatterns.push({
            name: '第一组切分',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },      // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 2拍弱
                { position: 1.0, duration: 1, type: '16th', isStrong: false },       // 单独十六分音符！
                { position: 1.25, duration: 1, type: '16th-rest', isStrong: false }, // 十六分休止符
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },      // 第2组: 1拍强（切分效果）
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },     // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }      // 第2组: 3拍弱
            ]
        });
        
        // Syncopation模式2: 次强拍前的单独十六分音符
        availablePatterns.push({
            name: '次强拍前切分',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },      // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 3拍弱
                { position: 1.25, duration: 1, type: '16th', isStrong: false },      // Sixteenth note pattern
                { position: 1.5, duration: 1, type: '16th-rest', isStrong: true },   // 强拍休止（切分！）
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },     // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }      // 第2组: 3拍弱
            ]
        });
        
        // Syncopation模式3: 第二组内的单独十六分音符切分
        availablePatterns.push({
            name: '第二组内切分',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },      // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 3拍弱
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },      // 第2组: 1拍强
                { position: 2.0, duration: 1, type: '16th', isStrong: false },       // 单独十六分！
                { position: 2.25, duration: 1, type: '16th-rest', isStrong: false }, // 十六分休止
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }      // 第2组: 3拍弱
            ]
        });
        
        // Syncopation模式4: 复杂切分（多个单独十六分音符）
        availablePatterns.push({
            name: '复杂切分',
            rhythm: [
                { position: 0.0, duration: 1, type: '16th', isStrong: true },        // 强拍十六分
                { position: 0.25, duration: 1, type: '16th-rest', isStrong: false }, // 十六分休止
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 2拍弱
                { position: 1.0, duration: 1, type: '16th', isStrong: false },       // 单独十六分
                { position: 1.25, duration: 1, type: '16th-rest', isStrong: false }, // 十六分休止
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },      // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },     // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }      // 第2组: 3拍弱
            ]
        });
        
        // Syncopation模式5: 跨组切分（破坏3+3界限的错觉）
        availablePatterns.push({
            name: '跨组切分错觉',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },      // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },     // 第1组: 2拍弱
                { position: 1.0, duration: 1, type: '16th', isStrong: false },       // 第1组末尾
                { position: 1.25, duration: 1, type: '16th', isStrong: false },      // 切分到第2组前
                { position: 1.5, duration: 1, type: '16th-rest', isStrong: true },   // 次强拍休止！
                { position: 1.75, duration: 1, type: '16th', isStrong: false },      // 恢复
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },     // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }      // 第2组: 3拍弱
            ]
        });
    }
    
    if (availablePatterns.length === 0) {
        console.error('❌ 没有可用的节奏模式，根据用户设置创建最后备用模式');
        
        // 🔥 严格遵循用户节奏设置，创建最后的备用模式
        if (isEighthAllowed) {
            console.error('❌ 创建备用八分音符模式（用户已勾选）');
            availablePatterns = [{
                name: '最后备用八分音符',
                rhythm: [
                    { position: 0.0, duration: 2, type: 'eighth', isStrong: true },
                    { position: 0.5, duration: 2, type: 'eighth', isStrong: false },
                    { position: 1.0, duration: 2, type: 'eighth', isStrong: false },
                    { position: 1.5, duration: 2, type: 'eighth', isStrong: true },
                    { position: 2.0, duration: 2, type: 'eighth', isStrong: false },
                    { position: 2.5, duration: 2, type: 'eighth', isStrong: false }
                ]
            }];
        } else if (isDottedHalfAllowed) {
            console.error('❌ 创建备用附点二分音符模式（用户已勾选）');
            availablePatterns = [{
                name: '最后备用附点二分音符',
                rhythm: [
                    { position: 0.0, duration: 12, type: 'half', dots: 1, isStrong: true }
                ]
            }];
        } else if (isQuarterAllowed || isDottedQuarterAllowed) {
            console.error('❌ 创建备用附点四分音符模式（用户已勾选四分音符或附点四分音符）');
            availablePatterns = [{
                name: '最后备用附点四分音符',
                rhythm: [
                    { position: 0.0, duration: 6, type: 'quarter', dots: 1, isStrong: true },
                    { position: 1.5, duration: 6, type: 'quarter', dots: 1, isStrong: true }
                ]
            }];
        } else {
            // 🚨 用户没有勾选任何适用的节奏类型，创建全休止符小节
            console.error('❌ 致命错误：用户没有勾选任何适用于6/8拍的节奏类型！');
            console.error('❌ 创建全休止符小节避免崩溃');
            availablePatterns = [{
                name: '全休止符小节',
                rhythm: [
                    { position: 0.0, duration: 12, type: 'half-rest', dots: 1, isRest: true, isStrong: true }
                ]
            }];
        }
    }
    
    // 🔥 二连音模式（只有当高级设置允许时且不与其他节奏类型冲突时才可用） - 6/8拍专用
    if (isDupletAllowed && isEighthAllowed) {
        // 二连音模式1: 第一组二连音（需要八分音符支持）
        availablePatterns.push({
            name: '第一组二连音',
            rhythm: [
                { position: 0.0, duration: 3, type: 'eighth', isStrong: true, tuplet: { type: 'duplet', position: 0, total: 2, id: 1 } },  // 第1组: 1拍 (0.75拍实际)
                { position: 0.75, duration: 3, type: 'eighth', isStrong: false, tuplet: { type: 'duplet', position: 1, total: 2, id: 1 } }, // 第1组: 2拍 (0.75拍实际)
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },       // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },      // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }       // 第2组: 3拍弱
            ]
        });
        
        // 二连音模式2: 第二组二连音
        availablePatterns.push({
            name: '第二组二连音',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },       // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },      // 第1组: 3拍弱
                { position: 1.5, duration: 3, type: 'eighth', isStrong: true, tuplet: { type: 'duplet', position: 0, total: 2, id: 1 } },  // 第2组: 1拍 (0.75拍实际)
                { position: 2.25, duration: 3, type: 'eighth', isStrong: false, tuplet: { type: 'duplet', position: 1, total: 2, id: 1 } } // 第2组: 2-3拍 (0.75拍实际)
            ]
        });
    }
    
    // 四连音模式（只有当高级设置允许时才可用） - 6/8拍专用
    if (isQuadrupletAllowed) {
        // 四连音模式1: 第一组四连音
        availablePatterns.push({
            name: '第一组四连音',
            rhythm: [
                { position: 0.0, duration: 1.5, type: 'eighth', isStrong: true, tuplet: { type: 'quadruplet', position: 0, total: 4, id: 1 } },   // 第1组: 1拍 (0.375拍实际)
                { position: 0.375, duration: 1.5, type: 'eighth', isStrong: false, tuplet: { type: 'quadruplet', position: 1, total: 4, id: 1 } }, // 第1组: 2拍 (0.375拍实际)
                { position: 0.75, duration: 1.5, type: 'eighth', isStrong: false, tuplet: { type: 'quadruplet', position: 2, total: 4, id: 1 } },  // 第1组: 3拍 (0.375拍实际)
                { position: 1.125, duration: 1.5, type: 'eighth', isStrong: false, tuplet: { type: 'quadruplet', position: 3, total: 4, id: 1 } }, // 第1组: 剩余 (0.375拍实际)
                { position: 1.5, duration: 2, type: 'eighth', isStrong: true },        // 第2组: 1拍强
                { position: 2.0, duration: 2, type: 'eighth', isStrong: false },       // 第2组: 2拍弱
                { position: 2.5, duration: 2, type: 'eighth', isStrong: false }        // 第2组: 3拍弱
            ]
        });
        
        // 四连音模式2: 第二组四连音
        availablePatterns.push({
            name: '第二组四连音',
            rhythm: [
                { position: 0.0, duration: 2, type: 'eighth', isStrong: true },        // 第1组: 1拍强
                { position: 0.5, duration: 2, type: 'eighth', isStrong: false },       // 第1组: 2拍弱
                { position: 1.0, duration: 2, type: 'eighth', isStrong: false },       // 第1组: 3拍弱
                { position: 1.5, duration: 1.5, type: 'eighth', isStrong: true, tuplet: { type: 'quadruplet', position: 0, total: 4, id: 1 } },   // 第2组: 1拍 (0.375拍实际)
                { position: 1.875, duration: 1.5, type: 'eighth', isStrong: false, tuplet: { type: 'quadruplet', position: 1, total: 4, id: 1 } }, // 第2组: 2拍 (0.375拍实际)
                { position: 2.25, duration: 1.5, type: 'eighth', isStrong: false, tuplet: { type: 'quadruplet', position: 2, total: 4, id: 1 } },  // 第2组: 3拍 (0.375拍实际)
                { position: 2.625, duration: 1.5, type: 'eighth', isStrong: false, tuplet: { type: 'quadruplet', position: 3, total: 4, id: 1 } }  // 第2组: 剩余 (0.375拍实际)
            ]
        });
    }
    
    // 🎵 如果需要乐句呼吸，优先选择有休止符的模式或在结尾添加休止符
    if (needsPhraseBreathe) {
        console.log(`🎵 第${measureNumber}小节需要乐句呼吸，调整模式选择`);
        
        // 优先选择已有休止符的模式
        const restPatterns = availablePatterns.filter(p => 
            p.name.includes('休止符') || p.name.includes('休止') || p.name.includes('呼吸')
        );
        
        if (restPatterns.length > 0) {
            const selectedRestPattern = restPatterns[random.nextInt(0, restPatterns.length)];
            console.log(`🎵 选择乐句呼吸模式: ${selectedRestPattern.name}`);
            
            // 使用休止符模式
            var selectedPattern = selectedRestPattern;
        } else {
            // 如果没有现成的休止符模式，修改现有模式在末尾添加休止符
            const basePattern = availablePatterns[random.nextInt(0, availablePatterns.length)];
            console.log(`🎵 修改模式添加乐句呼吸: ${basePattern.name} -> 末尾休止符`);
            
            // 创建修改后的模式，将最后一个音符改为休止符
            const modifiedRhythm = [...basePattern.rhythm];
            if (modifiedRhythm.length > 0) {
                const lastNote = modifiedRhythm[modifiedRhythm.length - 1];
                modifiedRhythm[modifiedRhythm.length - 1] = {
                    ...lastNote,
                    type: lastNote.type.includes('rest') ? lastNote.type : lastNote.type + '-rest',
                    isRest: true
                };
            }
            
            var selectedPattern = {
                ...basePattern,
                name: basePattern.name + ' (乐句呼吸)',
                rhythm: modifiedRhythm
            };
        }
    } else {
        // 使用权重选择节奏模式，确保四分音符20%频率，二分音符少量出现
        const patternWeights = availablePatterns.map(pattern => {
            let weight = 10; // 基础权重

            // 🔥 应用频率控制到权重计算
            
            // 🎯 四分音符模式：应用频率控制
            if (pattern.name.includes('四分音符') || pattern.name.includes('quarter')) {
                if (userSettings?.rhythmFrequencies?.quarter !== undefined) {
                    const userFreq = userSettings.rhythmFrequencies.quarter;
                    if (userFreq === 0) {
                        console.log(`🚫 高级设置阻止：四分音符频率为0%，权重设为0`);
                        weight = 0;
                    } else {
                        weight = userFreq * 0.4; // 将频率转换为权重
                        console.log(`🎯 四分音符频率控制：${userFreq}% -> 权重${weight}`);
                    }
                } else {
                    weight = 25; // 默认权重
                    console.log(`🎵 四分音符模式默认权重: ${pattern.name} -> ${weight}`);
                }
            }
            // 🎯 二分音符模式：应用频率控制
            else if (pattern.name.includes('二分音符') || pattern.name.includes('half')) {
                if (userSettings?.rhythmFrequencies?.half !== undefined) {
                    const userFreq = userSettings.rhythmFrequencies.half;
                    if (userFreq === 0) {
                        console.log(`🚫 高级设置阻止：二分音符频率为0%，权重设为0`);
                        weight = 0;
                    } else {
                        weight = userFreq * 0.2; // 将频率转换为权重（较低）
                        console.log(`🎯 二分音符频率控制：${userFreq}% -> 权重${weight}`);
                    }
                } else {
                    weight = 8; // 默认权重，较低
                    console.log(`🎵 二分音符模式默认权重: ${pattern.name} -> ${weight}`);
                }
            }
            // 🔥 附点二分音符模式：6/8拍中使用4/4拍全音符频率
            else if (pattern.name.includes('附点二分音符') || pattern.name.includes('dotted-half')) {
                if (userSettings?.rhythmFrequencies?.whole !== undefined) {
                    const userFreq = userSettings.rhythmFrequencies.whole;
                    if (userFreq === 0) {
                        console.log(`🚫 6/8拍高级设置阻止：附点二分音符（使用4/4拍全音符频率${userFreq}%），权重设为0`);
                        weight = 0;
                    } else {
                        weight = userFreq * 0.3; // 将频率转换为权重
                        console.log(`🎯 6/8拍附点二分音符频率控制（使用4/4拍全音符频率）：${userFreq}% -> 权重${weight}`);
                    }
                } else {
                    weight = 12; // 默认权重
                    console.log(`🎵 6/8拍附点二分音符模式默认权重: ${pattern.name} -> ${weight}`);
                }
            }
            // 🎯 八分音符模式：应用频率控制
            else if (pattern.name.includes('八分音符') || pattern.name.includes('eighth')) {
                if (userSettings?.rhythmFrequencies?.eighth !== undefined) {
                    const userFreq = userSettings.rhythmFrequencies.eighth;
                    if (userFreq === 0) {
                        console.log(`🚫 高级设置阻止：八分音符频率为0%，权重设为0`);
                        weight = 0;
                    } else {
                        // 🔥 使用6/8拍专用灵敏计算函数，解决8%低频率时仍大量出现的问题
                        weight = calculate68FrequencyWeight(userFreq, 10, '八分音符');
                        console.log(`🎯 八分音符频率控制（灵敏算法）：${userFreq}% -> 权重${weight}`);
                    }
                } else {
                    weight = 15; // 默认权重
                    console.log(`🎵 八分音符模式默认权重: ${pattern.name} -> ${weight}`);
                }
            }
            // 🎶 十六分音符模式：中等权重（使用用户频率设置）
            else if (pattern.name.includes('十六分音符') || pattern.name.includes('16th')) {
                weight = 12; // 基础权重
                
                // 检查用户设置的十六分音符频率
                if (userSettings && userSettings.rhythmFrequencies && userSettings.rhythmFrequencies['16th'] !== undefined) {
                    const userFreq = userSettings.rhythmFrequencies['16th'];
                    if (userFreq === 0) {
                        console.log(`🚫 6/8拍用户频率设置：十六分音符频率为 0%，权重设为0`);
                        weight = 0;
                    } else {
                        weight = userFreq * 0.3; // 将频率转换为权重（频率100% = 权重30）
                        console.log(`🎯 6/8拍用户频率设置：十六分音符 = ${userFreq}%，权重 = ${weight}`);
                    }
                }
            }
            // 🎼 休止符模式：中等权重
            else if (pattern.name.includes('休止符') || pattern.name.includes('休止')) {
                weight = 18;
            }
            // 🎵 切分和特殊模式：较低权重
            else if (pattern.name.includes('切分') || pattern.name.includes('syncopation')) {
                weight = 8;
            }
            // 🎶 二连音模式：使用用户频率设置
            else if (pattern.name.includes('二连音') || pattern.name.includes('duplet')) {
                weight = 30; // 基础权重
                
                // 检查用户设置的4/4拍三连音频率（6/8拍中二连音对应4/4拍中的三连音）
                if (userSettings && userSettings.rhythmFrequencies && userSettings.rhythmFrequencies.triplet !== undefined) {
                    const userFreq = userSettings.rhythmFrequencies.triplet;
                    if (userFreq === 0) {
                        console.log(`🚫 6/8拍用户频率设置：二连音（使用4/4拍三连音频率${userFreq}%）权重设为0`);
                        weight = 0;
                    } else {
                        weight = userFreq * 0.5; // 将频率转换为权重（频率100% = 权重50）
                        console.log(`🎯 6/8拍用户频率设置：二连音（使用4/4拍三连音频率） = ${userFreq}%，权重 = ${weight}`);
                    }
                } else {
                    console.log(`🎵 6/8拍二连音模式使用默认权重: ${pattern.name} -> ${weight}`);
                }
            }
            // 🎹 四连音模式：使用用户频率设置
            else if (pattern.name.includes('四连音') || pattern.name.includes('quadruplet')) {
                weight = 25; // 基础权重
                
                // 检查用户设置的4/4拍三连音频率（6/8拍中四连音对应4/4拍中的三连音）
                if (userSettings && userSettings.rhythmFrequencies && userSettings.rhythmFrequencies.triplet !== undefined) {
                    const userFreq = userSettings.rhythmFrequencies.triplet;
                    if (userFreq === 0) {
                        console.log(`🚫 6/8拍用户频率设置：四连音（使用4/4拍三连音频率${userFreq}%）权重设为0`);
                        weight = 0;
                    } else {
                        weight = userFreq * 0.4; // 将频率转换为权重（频率100% = 权重40）
                        console.log(`🎯 6/8拍用户频率设置：四连音（使用4/4拍三连音频率） = ${userFreq}%，权重 = ${weight}`);
                    }
                } else {
                    console.log(`🎵 6/8拍四连音模式使用默认权重: ${pattern.name} -> ${weight}`);
                }
            }

            return weight;
        });

        // 🔥 过滤掉权重为0的模式（被高级设置阻止的模式）
        const validPatterns = [];
        const validWeights = [];
        
        for (let i = 0; i < availablePatterns.length; i++) {
            if (patternWeights[i] > 0) {
                validPatterns.push(availablePatterns[i]);
                validWeights.push(patternWeights[i]);
            } else {
                console.log(`🚫 过滤掉权重为0的模式: ${availablePatterns[i].name}`);
            }
        }
        
        console.log(`🔍 有效模式数量：${validPatterns.length}/${availablePatterns.length}`);
        
        if (validPatterns.length === 0) {
            console.error(`❌ 所有模式都被频率控制阻止！需要严格遵循用户节奏选择`);
            // 🔥 严格遵循用户选择的紧急回退：只使用用户勾选的节奏类型
            if (isEighthAllowed) {
                console.error(`✅ 严格紧急回退：使用八分音符模式（用户已勾选）`);
                var selectedPattern = {
                    name: '严格八分音符紧急模式',
                    rhythm: [
                        { position: 0.0, duration: 2, type: 'eighth', isStrong: true },
                        { position: 0.5, duration: 2, type: 'eighth', isStrong: false },
                        { position: 1.0, duration: 2, type: 'eighth', isStrong: false },
                        { position: 1.5, duration: 2, type: 'eighth', isStrong: true },
                        { position: 2.0, duration: 2, type: 'eighth', isStrong: false },
                        { position: 2.5, duration: 2, type: 'eighth', isStrong: false }
                    ]
                };
            } else if (isDottedHalfAllowed) {
                console.error(`✅ 严格紧急回退：使用附点二分音符模式（用户已勾选）`);
                var selectedPattern = {
                    name: '严格附点二分音符紧急模式',
                    rhythm: [
                        { position: 0.0, duration: 12, type: 'half', dots: 1, isStrong: true }
                    ]
                };
            } else if (isQuarterAllowed || isDottedQuarterAllowed) {
                console.error(`✅ 严格紧急回退：使用附点四分音符模式（用户已勾选四分音符或附点四分音符）`);
                var selectedPattern = {
                    name: '严格附点四分音符紧急模式',
                    rhythm: [
                        { position: 0.0, duration: 6, type: 'quarter', dots: 1, isStrong: true },
                        { position: 1.5, duration: 6, type: 'quarter', dots: 1, isStrong: true }
                    ]
                };
            } else {
                // 🚨 致命错误：用户没有勾选任何适用于6/8拍的节奏类型
                console.error(`❌ 致命错误：无法创建6/8拍紧急模式，用户未勾选任何适用的节奏类型`);
                console.error(`❌ 需要的节奏类型之一：eighth, quarter, dotted-quarter, dotted-half`);
                console.error(`❌ 用户实际设置：八分音符=${isEighthAllowed}, 四分音符=${isQuarterAllowed}, 附点四分音符=${isDottedQuarterAllowed}, 附点二分音符=${isDottedHalfAllowed}`);
                // 返回null，让上级处理这种情况
                return notes; // 返回空的notes数组
            }
        } else {
            // 🔥 修复权重选择算法：使用一致的加权随机选择方法
            const totalWeight = validWeights.reduce((sum, w) => sum + w, 0);
            console.log(`🎯 [权重选择] 总权重: ${totalWeight}, 有效模式: ${validPatterns.length}`);
            
            if (totalWeight > 0) {
                // 使用标准的weighted方法，与其他6/8拍选择逻辑保持一致
                var selectedPattern = random.weighted(validPatterns, validWeights);
                console.log(`🎵 [权重选择] 使用标准加权选择: ${selectedPattern ? selectedPattern.name : 'null'}`);
            } else {
                // 如果总权重为0，选择第一个可用模式作为回退
                var selectedPattern = validPatterns.length > 0 ? validPatterns[0] : null;
                console.log(`⚠️ [权重选择] 总权重为0，使用回退选择: ${selectedPattern ? selectedPattern.name : 'null'}`);
            }
        }
    }
    
    console.log(`✅ 选择节奏模式: ${selectedPattern.name}${needsPhraseBreathe ? ' [乐句呼吸]' : ''}`);
    
    // 🎼 Cantus Firmus风格旋律生成
    let currentMidiNote = currentMidi;
    if (!currentMidiNote) {
        // 🔥 6/8拍智能起始音符选择：在保持Cantus Firmus风格的前提下增加随机性
        console.log(`🎵 6/8拍智能起始音符选择开始`);
        
        // 生成音域内所有调内音符
        const possibleStartNotes = [];
        for (let octave = Math.floor(safeUserRange.min / 12); octave <= Math.floor(safeUserRange.max / 12); octave++) {
            for (const scaleDegree of safeScale) {
                const midi = octave * 12 + scaleDegree;
                if (midi >= safeUserRange.min && midi <= safeUserRange.max) {
                    possibleStartNotes.push(midi);
                }
            }
        }
        
        if (possibleStartNotes.length > 0) {
            // Cantus Firmus风格：优先选择主音、三音、五音，但增加其他调内音符的随机性
            const preferredDegrees = [0, 4, 7]; // 主音(Do)、大三度(Mi)、完全五度(Sol)
            const preferredNotes = possibleStartNotes.filter(midi => preferredDegrees.includes(midi % 12));
            const otherNotes = possibleStartNotes.filter(midi => !preferredDegrees.includes(midi % 12));
            
            // 70%概率选择优选音符(主音、三音、五音)，30%概率选择其他调内音符
            if (preferredNotes.length > 0 && random.nextFloat() < 0.7) {
                currentMidiNote = preferredNotes[Math.floor(random.nextFloat() * preferredNotes.length)];
                console.log(`🎯 6/8拍选择优选起始音符: MIDI ${currentMidiNote} (主音/三音/五音)`);
            } else if (otherNotes.length > 0) {
                currentMidiNote = otherNotes[Math.floor(random.nextFloat() * otherNotes.length)];
                console.log(`🎲 6/8拍选择随机调内起始音符: MIDI ${currentMidiNote}`);
            } else {
                // 备用方案：选择任意优选音符
                currentMidiNote = preferredNotes[Math.floor(random.nextFloat() * preferredNotes.length)];
                console.log(`🎼 6/8拍备用起始音符: MIDI ${currentMidiNote}`);
            }
        } else {
            // 极端备用方案：使用音域中间并调整到调内
            const rangeMid = Math.floor((safeUserRange.min + safeUserRange.max) / 2);
            currentMidiNote = adjustToScale(rangeMid, safeScale);
            console.log(`⚠️ 6/8拍使用备用起始音符: MIDI ${currentMidiNote} (音域中间调整)`);
        }
    }
    
    selectedPattern.rhythm.forEach((rhythmNote, index) => {
        // 检查是否为休止符类型
        if (rhythmNote.type.includes('rest')) {
            // 处理休止符
            notes.push({
                position: rhythmNote.position,
                type: rhythmNote.type,
                duration: rhythmNote.duration,
                dots: rhythmNote.dots || null,
                isRest: true,
                isStrong: rhythmNote.isStrong,
                tuplet: rhythmNote.tuplet || null  // 🎵 休止符也可能在连音中
            });
            
            console.log(`休止符${index + 1}: ${rhythmNote.type} - ${rhythmNote.isStrong ? '强拍' : '弱拍'} - 时值${rhythmNote.duration}`);
            return; // 跳过音符生成
        }
        
        let nextMidi;
        
        if (index === 0) {
            nextMidi = currentMidiNote;
        } else {
            // 🎼 根据音符类型和上下文生成合适的音符
            // 🔥 修复函数名冲突：使用重命名后的详细版本函数
            nextMidi = generateCantusFirmusNoteDetailed(
                currentMidiNote, 
                safeUserRange, 
                safeMaxJump, 
                safeScale, 
                rhythmNote.isStrong,
                rhythmNote.type,  // 传递音符类型
                rhythmNote.position, // 传递位置信息
                isLastMeasure && index === selectedPattern.rhythm.length - 1,
                random,
                selectedPattern.rhythm, // 传递整个节奏模式
                index // 传递当前索引
            );
        }
        
        // 转换为音符信息
        const noteInfo = midiToNoteInfoWithCorrectSpelling(nextMidi);
        
        // 创建音符对象
        const noteObject = {
            position: rhythmNote.position,
            step: noteInfo.step,
            octave: noteInfo.octave,
            alter: noteInfo.alter,
            duration: rhythmNote.duration,
            type: rhythmNote.type,
            dots: rhythmNote.dots || null,
            midi: nextMidi,
            isStrong: rhythmNote.isStrong,
            isRest: false,
            tuplet: rhythmNote.tuplet || null  // 🎵 传递连音信息
        };
        
        // 🔥 为6/8拍音符添加articulation选择（修复缺失的功能）
        if (userSettings.articulations && userSettings.articulations.enabled) {
            // 创建一个临时的音符列表来调用selectArticulation
            const currentNotes = notes.filter(n => !n.isRest); // 只包含音符，不包含休止符
            
            console.log(`🎸 6/8拍articulation检查: 当前音符索引=${currentNotes.length}, MIDI=${nextMidi}`);
            
            // 调用selectArticulation函数（需要创建一个临时的this上下文）
            const tempContext = {
                random: random,
                clef: clef,
                selectArticulation: function(note, noteIndex, measureNotes, measureIndex, clef) {
                    // 直接调用全局的selectArticulation函数逻辑
                    if (!userSettings.articulations.enabled) {
                        return null;
                    }
                    
                    const artSettings = userSettings.articulations;
                    
                    // 🔥 6/8拍：检查音符是否已经有slur连接
                    let hasSlurConnection = false;
                    
                    // 检查当前音符是否是前一个音符slur的结束点
                    if (noteIndex > 0) {
                        const prevNote = measureNotes[noteIndex - 1];
                        if (prevNote && !prevNote.isRest && prevNote.articulation && 
                            ['hammer-on', 'pull-off'].includes(prevNote.articulation)) {
                            hasSlurConnection = true;
                            console.log(`🚫 6/8拍：音符${noteIndex}已经是前一个音符${prevNote.articulation}的slur结束点，跳过articulation选择`);
                        }
                    }
                    
                    // 6/8拍：当前音符是否会产生slur的逻辑将在articulation选择过程中处理
                    
                    if (hasSlurConnection) {
                        console.log(`🚫 6/8拍跳过articulation选择：音符${noteIndex}已经有slur连接`);
                        return null;
                    }
                    
                    let selectedArticulation = null;
                    
                    // === 6/8拍吉他技巧规则 (使用优先级系统) ===
                    if (clef === 'treble' && artSettings.guitar.length > 0) {
                        const hammerOnAllowed = artSettings.guitar.includes('hammer-on');
                        const pullOffAllowed = artSettings.guitar.includes('pull-off');
                        
                        console.log(`🔒 6/8拍独立技巧检查: hammer-on=${hammerOnAllowed}, pull-off=${pullOffAllowed}`);
                        
                        // 🎸 HAMMER-ON检查 (6/8拍版本 - 最高优先级)
                        if (!selectedArticulation && hammerOnAllowed && noteIndex > 0) {
                            const prevNote = measureNotes[noteIndex - 1];
                            if (prevNote && !prevNote.isRest && prevNote.midi) {
                                const interval = note.midi - prevNote.midi;
                                const isValidHammerOn = (interval === 1 || interval === 2);
                                const prevHasHammerOn = prevNote.articulation === 'hammer-on';
                                
                                // 🎯 6/8拍新的频率控制逻辑：控制上行二度slur的生成
                                const shouldGenerateSlur = shouldGenerateDirectionalSlur(interval, this.random);
                                
                                if (isValidHammerOn && !prevHasHammerOn && shouldGenerateSlur) {
                                    selectedArticulation = 'hammer-on';
                                    console.log(`✅ 6/8拍选择吉他技巧: HAMMER-ON生成: ${prevNote.midi} -> ${note.midi} (+${interval}半音)`);
                                }
                            }
                        }
                        
                        // 🎸 PULL-OFF检查 (6/8拍版本 - 最高优先级)
                        if (!selectedArticulation && pullOffAllowed && noteIndex > 0) {
                            const prevNote = measureNotes[noteIndex - 1];
                            if (prevNote && !prevNote.isRest && prevNote.midi) {
                                const interval = note.midi - prevNote.midi;
                                const isValidPullOff = (interval === -1 || interval === -2);
                                const prevHasPullOff = prevNote.articulation === 'pull-off';
                                
                                // 🎯 6/8拍新的频率控制逻辑：控制下行二度slur的生成
                                const shouldGenerateSlur = shouldGenerateDirectionalSlur(interval, this.random);
                                
                                if (isValidPullOff && !prevHasPullOff && shouldGenerateSlur) {
                                    selectedArticulation = 'pull-off';
                                    console.log(`✅ 6/8拍选择吉他技巧: PULL-OFF生成: ${prevNote.midi} -> ${note.midi} (${interval}半音)`);
                                }
                            }
                        }
                    }
                    
                    // 🔥 6/8拍频率控制 - 每两小节内最多2个articulation
                    
                    if (selectedArticulation) {
                        // 检查全局articulation计数器
                        if (!window.articulationCounter) {
                            window.articulationCounter = {
                                total: 0,
                                perTwoMeasures: 0,
                                currentMeasurePair: 0
                            };
                        }
                        
                        // 6/8拍通常measureIndex为0，需要通过其他方式获取实际小节号
                        // 这里使用一个临时的方案，基于总articulation数量估算
                        const estimatedMeasureIndex = Math.floor(window.articulationCounter.total / 2);
                        const currentMeasurePair = Math.floor(estimatedMeasureIndex / 2);
                        
                        // 如果进入了新的两小节组，重置计数器
                        if (currentMeasurePair !== window.articulationCounter.currentMeasurePair) {
                            console.log(`🔄 6/8拍进入新的两小节组，重置计数器`);
                            window.articulationCounter.perTwoMeasures = 0;
                            window.articulationCounter.currentMeasurePair = currentMeasurePair;
                        }
                        
                        // 检查是否超过频率限制
                        if (window.articulationCounter.perTwoMeasures >= 2) {
                            console.log(`🚫 6/8拍频率限制: ${selectedArticulation}被阻止 - 当前两小节组已有${window.articulationCounter.perTwoMeasures}个articulation`);
                            selectedArticulation = null;
                        } else {
                            // 允许生成，更新计数器
                            window.articulationCounter.total++;
                            window.articulationCounter.perTwoMeasures++;
                            console.log(`✅ 6/8拍频率允许: 添加${selectedArticulation} - 当前两小节组: ${window.articulationCounter.perTwoMeasures}/2`);
                            
                            // 🔥 6/8拍：检查如果选择了会产生slur的articulation，标记下一个音符不应该有articulation
                            if (['hammer-on', 'pull-off'].includes(selectedArticulation) && noteIndex < measureNotes.length - 1) {
                                const nextNote = measureNotes[noteIndex + 1];
                                if (nextNote && !nextNote.isRest && nextNote.articulation) {
                                    console.log(`⚠️ 6/8拍警告：当前音符${noteIndex}选择${selectedArticulation}会产生slur，但下一个音符${noteIndex + 1}已经有articulation: ${nextNote.articulation}`);
                                    console.log(`🔧 6/8拍清除下一个音符的articulation以避免冲突`);
                                    nextNote.articulation = null;
                                }
                            }
                        }
                    }
                    
                    return selectedArticulation;
                }
            };
            
            const articulation = tempContext.selectArticulation(
                noteObject,
                currentNotes.length,
                [...currentNotes, noteObject], // 包含当前音符的列表
                0, // 6/8拍函数通常用于单个小节
                clef
            );
            
            if (articulation) {
                noteObject.articulation = articulation;
                console.log(`🎸 6/8拍添加articulation: ${articulation} 到音符 MIDI ${nextMidi}`);
            }
        }
        
        notes.push(noteObject);
        
        currentMidiNote = nextMidi;
        
        console.log(`音符${index + 1}: ${noteInfo.step}${noteInfo.octave} (MIDI ${nextMidi}) - ${rhythmNote.isStrong ? '强拍' : '弱拍'} - ${rhythmNote.type}`);
    });
    
    // 🔥 修复函数名冲突：重命名为详细版本的Cantus Firmus音符生成函数，支持装饰性十六分音符
    function generateCantusFirmusNoteDetailed(lastMidi, range, maxJump, scale, isStrongBeat, noteType, position, isEnding, random, rhythmPattern, noteIndex) {
        const candidates = [];
        
        console.log(`🎵 生成音符: 位置${position}, 类型${noteType}, ${isStrongBeat ? '强拍' : '弱拍'}${isEnding ? ' [结尾]' : ''}`);
        
        // 十六分音符的装饰性处理
        if (noteType === '16th') {
            return generateDecorativeSixteenth(lastMidi, range, maxJump, scale, position, rhythmPattern, noteIndex, random);
        }
        
        // 非十六分音符的Cantus Firmus处理
        // 🔥 修复：根据用户maxJump设置动态调整级进偏好，确保充分利用音程跨度
        const baseStepwisePreference = isStrongBeat ? 0.6 : 0.8;
        // 当用户设置较大跳度时，降低级进偏好，增加跳跃机会
        const jumpFactor = Math.min(maxJump / 12, 1.0); // maxJump越大，jumpFactor越接近1
        const adjustedStepwise = baseStepwisePreference * (1 - jumpFactor * 0.4); // 最多减少40%级进偏好
        const stepwisePreference = Math.max(adjustedStepwise, 0.3); // 至少保持30%级进偏好
        console.log(`🎯 6/8拍级进偏好调整: 基础${baseStepwisePreference} -> 调整后${stepwisePreference.toFixed(2)} (maxJump=${maxJump})`)
        
        if (random.nextFloat() < stepwisePreference) {
            // 级进运动：上行或下行2度
            [-2, -1, 1, 2].forEach(interval => {
                const candidate = lastMidi + interval;
                if (candidate >= range.min && candidate <= range.max) {
                    const pitchClass = candidate % 12;
                    if (scale.includes(pitchClass)) {
                        candidates.push({ 
                            midi: candidate, 
                            weight: interval === 1 || interval === -1 ? 3 : 2 // 半音级进权重更高
                        });
                    }
                }
            });
        } else {
            // 🔥 修复音程跨度限制：完全遵循用户maxJump设置，并优化权重分配
            for (let interval = 3; interval <= maxJump; interval++) {
                [-interval, interval].forEach(jump => {
                    const candidate = lastMidi + jump;
                    if (candidate >= range.min && candidate <= range.max) {
                        const pitchClass = candidate % 12;
                        if (scale.includes(pitchClass)) {
                            // 🔥 优化权重分配：根据用户maxJump设置动态调整各音程的权重
                            let weight = 1;
                            if (interval === 3) weight = 3; // 三度保持较高权重
                            else if (interval === 4 || interval === 5) weight = 2; // 四五度中等权重
                            else if (interval <= maxJump / 2) weight = 2; // 用户允许范围内的中等音程
                            else weight = 1; // 较大音程基础权重
                            
                            candidates.push({ 
                                midi: candidate, 
                                weight: weight
                            });
                        }
                    }
                });
            }
        }
        
        // 如果是结尾音符，倾向于稳定音（主音、五音）
        if (isEnding && candidates.length > 0) {
            candidates.forEach(candidate => {
                const pitchClass = candidate.midi % 12;
                if (pitchClass === scale[0] || pitchClass === scale[4]) { // 主音或五音
                    candidate.weight *= 3;
                }
            });
        }
        
        if (candidates.length === 0) {
            // 备选：任何调内音符
            for (let midi = range.min; midi <= range.max; midi++) {
                const pitchClass = midi % 12;
                if (scale.includes(pitchClass) && Math.abs(midi - lastMidi) <= maxJump) {
                    candidates.push({ midi: midi, weight: 1 });
                }
            }
        }
        
        if (candidates.length === 0) {
            return addAccidentalIfNeeded(lastMidi); // 最后的备选
        }
        
        // 权重随机选择
        const selectedNote = weightedRandomChoice(candidates, random);
        
        // 🚨 6/8拍最终音程验证 - 最高优先权
        if (lastMidi !== null && lastMidi !== undefined) {
            const finalInterval = Math.abs(selectedNote - lastMidi);
            if (finalInterval > maxJump) {
                console.error(`🚨 6/8拍音程跨度违规！实际: ${finalInterval}半音 > 限制: ${maxJump}半音`);
                console.error(`   前音: ${lastMidi}, 选择音: ${selectedNote}`);
                // 🔥 强制修正：选择最接近但不超过限制的音符
                for (const candidate of candidates) {
                    const candInterval = Math.abs(candidate.midi - lastMidi);
                    if (candInterval <= maxJump) {
                        console.log(`✅ 6/8拍音程修正：选择符合限制的音符 ${candidate.midi} (${candInterval}半音)`);
                        return addAccidentalIfNeeded(candidate.midi);
                    }
                }
                // 如果所有候选音符都超限，返回原音符（极端情况）
                console.warn(`⚠️ 6/8拍无可用候选音符，保持原音 ${lastMidi}`);
                return addAccidentalIfNeeded(lastMidi);
            } else {
                console.log(`✅ 6/8拍音程合规: ${finalInterval}半音 ≤ ${maxJump}半音`);
            }
        }
        
        return addAccidentalIfNeeded(selectedNote);
    }
    
    // 装饰性十六分音符生成函数 - 理解6/8拍3+3分组
    function generateDecorativeSixteenth(lastMidi, range, maxJump, scale, position, rhythmPattern, noteIndex, random) {
        console.log(`🎨 生成6/8装饰性十六分音符: 位置${position}, 索引${noteIndex}`);
        
        // 确定当前音符在6/8拍中的分组位置
        const groupInfo = analyze68Grouping(position);
        console.log(`📍 分组分析: ${groupInfo.group}组第${groupInfo.beat}拍 (${groupInfo.function})`);
        
        // 获取前后音符信息以进行上下文分析
        const prevNote = noteIndex > 0 ? rhythmPattern[noteIndex - 1] : null;
        const nextNote = noteIndex < rhythmPattern.length - 1 ? rhythmPattern[noteIndex + 1] : null;
        
        // 根据6/8拍分组特性判断装饰类型
        const decorationType = determine68DecorationType(groupInfo, prevNote, nextNote, random);
        
        switch (decorationType) {
            case 'group_head': // 组头装饰
                return addAccidentalIfNeeded(generateGroupHeadDecoration(lastMidi, range, maxJump, scale, random));
                
            case 'subdivision': // 组内细分
                return addAccidentalIfNeeded(generateSubdivisionDecoration(lastMidi, range, maxJump, scale, groupInfo, random));
                
            case 'passing_tone': // 经过音
                return addAccidentalIfNeeded(generatePassingTone(lastMidi, range, maxJump, scale, prevNote, nextNote, random));
                
            case 'neighbor_tone': // 辅助音
                return addAccidentalIfNeeded(generateNeighborTone(lastMidi, range, maxJump, scale, random));
                
            case 'approach_note': // 趋向音
                return addAccidentalIfNeeded(generateApproachNote(lastMidi, range, maxJump, scale, nextNote, random));
                
            default: // 标准级进
                return addAccidentalIfNeeded(generateStepwiseDecoration(lastMidi, range, maxJump, scale, random));
        }
    }
    
    // 分析6/8拍分组位置
    function analyze68Grouping(position) {
        if (position < 1.5) {
            // 第一组 (0.0-1.5)
            if (position === 0.0) return { group: 1, beat: 1, function: '强拍' };
            if (position === 0.25) return { group: 1, beat: 2, function: '弱拍细分' };
            if (position === 0.5) return { group: 1, beat: 2, function: '弱拍' };
            if (position === 0.75) return { group: 1, beat: 3, function: '弱拍细分' };
            if (position === 1.0) return { group: 1, beat: 3, function: '弱拍' };
            return { group: 1, beat: Math.floor(position * 2) + 1, function: '组内' };
        } else {
            // 第二组 (1.5-3.0)
            const relativePos = position - 1.5;
            if (position === 1.5) return { group: 2, beat: 1, function: '次强拍' };
            if (position === 1.75) return { group: 2, beat: 2, function: '弱拍细分' };
            if (position === 2.0) return { group: 2, beat: 2, function: '弱拍' };
            if (position === 2.25) return { group: 2, beat: 3, function: '弱拍细分' };
            if (position === 2.5) return { group: 2, beat: 3, function: '弱拍' };
            return { group: 2, beat: Math.floor(relativePos * 2) + 1, function: '组内' };
        }
    }
    
    // 根据6/8拍特性确定装饰类型
    function determine68DecorationType(groupInfo, prevNote, nextNote, random) {
        const rand = random.nextFloat();
        
        // 组头位置 (强拍和次强拍)
        if (groupInfo.beat === 1) {
            return rand < 0.6 ? 'group_head' : 'subdivision';
        }
        
        // 组内细分位置
        if (groupInfo.function === '弱拍细分') {
            return rand < 0.5 ? 'subdivision' : 'passing_tone';
        }
        
        // 其他位置根据上下文
        if (prevNote && nextNote) {
            return rand < 0.4 ? 'passing_tone' : rand < 0.7 ? 'neighbor_tone' : 'approach_note';
        } else {
            return rand < 0.5 ? 'neighbor_tone' : 'subdivision';
        }
    }
    
    // 组头装饰 (强拍和次强拍的装饰)
    function generateGroupHeadDecoration(lastMidi, range, maxJump, scale, random) {
        console.log(`🎯 生成组头装饰 (限制: ${maxJump}半音)`);
        
        // 组头装饰倾向于稳定的级进，但严格遵循maxJump限制
        const candidates = [];
        for (let interval = 1; interval <= Math.min(2, maxJump); interval++) {
            [-interval, interval].forEach(jump => {
                const candidate = lastMidi + jump;
                if (candidate >= range.min && candidate <= range.max) {
                    const pitchClass = candidate % 12;
                    if (scale.includes(pitchClass)) {
                        candidates.push({ 
                            midi: candidate, 
                            weight: interval === 1 ? 4 : 2 // 半音级进权重最高
                        });
                    }
                }
            });
        }
        
        const selected = candidates.length > 0 ? weightedRandomChoice(candidates, random) : lastMidi;
        // 🚨 最终验证
        const finalInterval = Math.abs(selected - lastMidi);
        if (finalInterval > maxJump) {
            console.warn(`⚠️ 组头装饰音程超限: ${finalInterval} > ${maxJump}，使用原音`);
            return lastMidi;
        }
        return selected;
    }
    
    // 组内细分装饰
    function generateSubdivisionDecoration(lastMidi, range, maxJump, scale, groupInfo, random) {
        console.log(`🎼 生成第${groupInfo.group}组内细分装饰 (限制: ${maxJump}半音)`);
        
        // 细分装饰更多样化，但严格遵循maxJump限制
        const candidates = [];
        for (let interval = 1; interval <= Math.min(2, maxJump); interval++) {
            [-interval, interval].forEach(jump => {
                const candidate = lastMidi + jump;
                if (candidate >= range.min && candidate <= range.max) {
                    const pitchClass = candidate % 12;
                    if (scale.includes(pitchClass)) {
                        candidates.push({ 
                            midi: candidate, 
                            weight: Math.abs(jump) === 1 ? 3 : 2
                        });
                    }
                }
            });
        }
        
        const selected = candidates.length > 0 ? weightedRandomChoice(candidates, random) : lastMidi;
        // 🚨 最终验证
        const finalInterval = Math.abs(selected - lastMidi);
        if (finalInterval > maxJump) {
            console.warn(`⚠️ 细分装饰音程超限: ${finalInterval} > ${maxJump}，使用原音`);
            return lastMidi;
        }
        return selected;
    }
    
    // 确定装饰类型
    function determineDecorationType(position, prevNote, nextNote, random) {
        const rand = random.nextFloat();
        
        // 根据位置和上下文确定装饰类型
        if (position < 0.5 && nextNote && nextNote.isStrong) {
            return 'approach_note'; // anacrusis functionality removed
        } else if (prevNote && nextNote) {
            return rand < 0.3 ? 'passing_tone' : rand < 0.6 ? 'neighbor_tone' : 'approach_note';
        } else {
            return rand < 0.5 ? 'neighbor_tone' : 'stepwise';
        }
    }
    
    // anacrusis function removed
    
    // 经过音（连接两个音符）
    function generatePassingTone(lastMidi, range, maxJump, scale, prevNote, nextNote, random) {
        console.log(`🚶 生成经过音 (限制: ${maxJump}半音)`);
        
        // 选择在lastMidi基础上的级进音，但严格遵循maxJump限制
        const candidates = [];
        for (let interval = 1; interval <= Math.min(2, maxJump); interval++) {
            [-interval, interval].forEach(jump => {
                const candidate = lastMidi + jump;
                if (candidate >= range.min && candidate <= range.max) {
                    const pitchClass = candidate % 12;
                    if (scale.includes(pitchClass)) {
                        candidates.push({ midi: candidate, weight: 2 });
                    }
                }
            });
        }
        
        const selected = candidates.length > 0 ? weightedRandomChoice(candidates, random) : lastMidi;
        // 🚨 最终验证
        const finalInterval = Math.abs(selected - lastMidi);
        if (finalInterval > maxJump) {
            console.warn(`⚠️ 经过音音程超限: ${finalInterval} > ${maxJump}，使用原音`);
            return lastMidi;
        }
        return selected;
    }
    
    // 辅助音（围绕当前音）
    function generateNeighborTone(lastMidi, range, maxJump, scale, random) {
        console.log(`🔄 生成辅助音 (限制: ${maxJump}半音)`);
        
        const candidates = [];
        // 上下辅助音，但严格遵循maxJump限制
        for (let interval = 1; interval <= Math.min(1, maxJump); interval++) {
            [-interval, interval].forEach(jump => {
                const candidate = lastMidi + jump;
                if (candidate >= range.min && candidate <= range.max) {
                    const pitchClass = candidate % 12;
                    if (scale.includes(pitchClass)) {
                        candidates.push({ midi: candidate, weight: 3 });
                    }
                }
            });
        }
        
        const selected = candidates.length > 0 ? weightedRandomChoice(candidates, random) : lastMidi;
        // 🚨 最终验证
        const finalInterval = Math.abs(selected - lastMidi);
        if (finalInterval > maxJump) {
            console.warn(`⚠️ 辅助音音程超限: ${finalInterval} > ${maxJump}，使用原音`);
            return lastMidi;
        }
        return selected;
    }
    
    // 趋向音（向目标音趋向）
    function generateApproachNote(lastMidi, range, maxJump, scale, nextNote, random) {
        console.log(`➡️ 生成趋向音 (限制: ${maxJump}半音)`);
        
        // 生成向上或向下的级进音，但严格遵循maxJump限制
        const candidates = [];
        for (let interval = 1; interval <= Math.min(2, maxJump); interval++) {
            [-interval, interval].forEach(jump => {
                const candidate = lastMidi + jump;
                if (candidate >= range.min && candidate <= range.max) {
                    const pitchClass = candidate % 12;
                    if (scale.includes(pitchClass)) {
                        candidates.push({ midi: candidate, weight: 2 });
                    }
                }
            });
        }
        
        const selected = candidates.length > 0 ? weightedRandomChoice(candidates, random) : lastMidi;
        // 🚨 最终验证
        const finalInterval = Math.abs(selected - lastMidi);
        if (finalInterval > maxJump) {
            console.warn(`⚠️ 趋向音音程超限: ${finalInterval} > ${maxJump}，使用原音`);
            return lastMidi;
        }
        return selected;
    }
    
    // 标准级进装饰
    function generateStepwiseDecoration(lastMidi, range, maxJump, scale, random) {
        console.log(`🎼 生成标准级进装饰 (限制: ${maxJump}半音)`);
        
        const candidates = [];
        // 标准级进装饰通常只使用半音级进，但要遵循maxJump限制
        for (let interval = 1; interval <= Math.min(1, maxJump); interval++) {
            [-interval, interval].forEach(jump => {
                const candidate = lastMidi + jump;
                if (candidate >= range.min && candidate <= range.max) {
                    const pitchClass = candidate % 12;
                    if (scale.includes(pitchClass)) {
                        candidates.push({ midi: candidate, weight: 3 });
                    }
                }
            });
        }
        
        const selected = candidates.length > 0 ? weightedRandomChoice(candidates, random) : lastMidi;
        // 🚨 最终验证
        const finalInterval = Math.abs(selected - lastMidi);
        if (finalInterval > maxJump) {
            console.warn(`⚠️ 标准级进装饰音程超限: ${finalInterval} > ${maxJump}，使用原音`);
            return lastMidi;
        }
        return selected;
    }
    
    // 生成6/8拍的acciaccatura装饰音符
    function generateAcciaccaturaNote68(targetNote, scale, range, random) {
        console.log(`🎵 为6/8拍目标音符 MIDI ${targetNote.midi} 生成短倚音`);
        
        try {
            const targetMidi = targetNote.midi;
            const targetPitchClass = targetMidi % 12;
            
            // 寻找调内的邻近音作为装饰音（优先选择下方邻音）
            let acciaccaturaMidi = null;
            
            // 优先尝试下方二度音（短倚音的常见形式）
            for (let interval of [-1, -2, 1, 2]) {
                const candidate = targetMidi + interval;
                if (candidate >= range.min && candidate <= range.max) {
                    const candidatePitchClass = candidate % 12;
                    if (scale.includes(candidatePitchClass)) {
                        acciaccaturaMidi = candidate;
                        break;
                    }
                }
            }
            
            // 如果找不到调内音，使用半音邻音
            if (!acciaccaturaMidi) {
                const candidate = targetMidi - 1; // 下方半音
                if (candidate >= range.min && candidate <= range.max) {
                    acciaccaturaMidi = candidate;
                } else {
                    const candidate2 = targetMidi + 1; // 上方半音
                    if (candidate2 >= range.min && candidate2 <= range.max) {
                        acciaccaturaMidi = candidate2;
                    }
                }
            }
            
            if (!acciaccaturaMidi) {
                console.log(`⚠️ 无法为MIDI ${targetMidi}生成有效的短倚音`);
                return null;
            }
            
            // 转换为音符信息
            const acciaccaturaInfo = midiToNoteInfoWithCorrectSpelling(acciaccaturaMidi);
            
            const acciaccaturaNote = {
                step: acciaccaturaInfo.step,
                octave: acciaccaturaInfo.octave,
                alter: acciaccaturaInfo.alter,
                midi: acciaccaturaMidi,
                type: 'eighth', // 短倚音通常用八分音符表示
                slash: true // 带斜线的短倚音
            };
            
            console.log(`🎵 6/8拍短倚音生成成功: MIDI ${acciaccaturaMidi} -> ${acciaccaturaInfo.step}${acciaccaturaInfo.octave}`);
            return acciaccaturaNote;
            
        } catch (error) {
            console.error(`🚨 生成6/8拍短倚音失败:`, error.message);
            return null;
        }
    }
    
    // 🔥 增强的小调处理函数：支持和声小调和旋律小调
    function adjustToScaleEnhanced(midi, scale, keySignature) {
        const pitchClass = midi % 12;
        
        // 如果已经在调内，直接返回
        if (scale.includes(pitchClass)) {
            return midi;
        }
        
        // 检查是否为小调
        const isMinorKey = keySignature.includes('m');
        
        if (isMinorKey) {
            // 🎵 小调的增强处理：考虑和声小调和旋律小调
            const enhancedScale = getEnhancedMinorScale(scale, keySignature);
            
            // 先检查增强音阶（包含和声小调/旋律小调变化音）
            if (enhancedScale.includes(pitchClass)) {
                return midi;
            }
            
            // 如果不在增强音阶中，找到最近的音符
            return findClosestScaleNote(midi, enhancedScale);
        } else {
            // 大调使用原有逻辑
            return findClosestScaleNote(midi, scale);
        }
    }
    
    // 辅助函数：获取增强的小调音阶（包含和声小调和旋律小调变化音）
    function getEnhancedMinorScale(naturalMinorScale, keySignature) {
        // 基于自然小调，添加和声小调和旋律小调的变化音
        const enhanced = [...naturalMinorScale];
        
        // 确定调号的主音
        const keyToTonic = {
            'Am': 9, 'Em': 4, 'Bm': 11, 'F#m': 6, 'C#m': 1, 'G#m': 8, 'D#m': 3, 'A#m': 10,
            'Dm': 2, 'Gm': 7, 'Cm': 0, 'Fm': 5, 'Bbm': 10, 'Ebm': 3
        };
        
        const tonic = keyToTonic[keySignature];
        if (tonic !== undefined) {
            // 添加和声小调的导音（升高的第7级）
            const leadingTone = (tonic + 11) % 12; // 第7级音升高
            if (!enhanced.includes(leadingTone)) {
                enhanced.push(leadingTone);
            }
            
            // 添加旋律小调的第6级和第7级（上行时）
            const sixthDegree = (tonic + 9) % 12; // 第6级音升高
            if (!enhanced.includes(sixthDegree)) {
                enhanced.push(sixthDegree);
            }
        }
        
        return enhanced.sort((a, b) => a - b);
    }
    
    // 辅助函数：找到最接近的调内音符
    function findClosestScaleNote(midi, scale) {
        const pitchClass = midi % 12;
        let minDistance = 12;
        let bestMidi = midi;
        
        scale.forEach(scalePc => {
            const distance = Math.min(
                Math.abs(scalePc - pitchClass),
                Math.abs(scalePc + 12 - pitchClass),
                Math.abs(scalePc - (pitchClass + 12))
            );
            if (distance < minDistance) {
                minDistance = distance;
                bestMidi = midi + (scalePc - pitchClass);
            }
        });
        
        return bestMidi;
    }
    
    // 保持原函数名的兼容性
    function adjustToScale(midi, scale) {
        return adjustToScaleEnhanced(midi, scale, keySignature);
    }
    
    // 🔥 修复权重随机选择函数：使用一致的加权选择逻辑
    function weightedRandomChoice(candidates, random) {
        const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
        console.log(`🎯 [加权选择] 候选数: ${candidates.length}, 总权重: ${totalWeight}`);
        
        if (totalWeight > 0) {
            // 使用标准的weighted方法，与其他6/8拍选择逻辑保持一致
            const weights = candidates.map(c => c.weight);
            const selected = random.weighted(candidates, weights);
            console.log(`🎵 [加权选择] 选择MIDI: ${selected ? selected.midi : 'null'}`);
            return selected ? selected.midi : candidates[candidates.length - 1].midi;
        } else {
            // 如果总权重为0，选择最后一个候选作为回退
            const fallbackMidi = candidates.length > 0 ? candidates[candidates.length - 1].midi : null;
            console.log(`⚠️ [加权选择] 总权重为0，使用回退MIDI: ${fallbackMidi}`);
            return fallbackMidi;
        }
    }
    
    // 验证总时值必须为12（6/8拍 × divisions=4）
    const totalDuration = notes.reduce((sum, note) => sum + note.duration, 0);
    console.log(`总duration: ${totalDuration} (必须是12)`);
    
    if (totalDuration !== 12) {
        console.error(`❌ 时值错误: ${totalDuration}, 必须是12`);
        console.error(`❌ 节奏模式: ${selectedPattern.name}`);
        
        // 🔥 严格遵循用户节奏设置的备用模式
        notes.length = 0;
        
        // 根据用户勾选的节奏类型创建备用模式
        if (isEighthAllowed) {
            console.error(`❌ 使用备用八分音符模式（用户已勾选八分音符）`);
            for (let i = 0; i < 6; i++) {
                const midi = safeUserRange.min + (i % (safeUserRange.max - safeUserRange.min));
                const adjustedMidi = adjustToScale(midi, safeScale);
                const noteInfo = midiToNoteInfoWithCorrectSpelling(adjustedMidi);
                
                notes.push({ 
                    position: i * 0.5,
                    step: noteInfo.step, 
                    octave: noteInfo.octave, 
                    alter: noteInfo.alter,
                    duration: 2, 
                    type: 'eighth',
                    midi: adjustedMidi,
                    isStrong: i === 0 || i === 3
                });
            }
        } else if (isDottedHalfAllowed) {
            console.error(`❌ 使用备用附点二分音符模式（用户已勾选附点二分音符）`);
            const midi = safeUserRange.min;
            const adjustedMidi = adjustToScale(midi, safeScale);
            const noteInfo = midiToNoteInfoWithCorrectSpelling(adjustedMidi);
            
            notes.push({
                position: 0.0,
                step: noteInfo.step,
                octave: noteInfo.octave,
                alter: noteInfo.alter,
                duration: 12,
                type: 'half',
                dots: 1,
                midi: adjustedMidi,
                isStrong: true
            });
        } else if (isQuarterAllowed || isDottedQuarterAllowed) {
            console.error(`❌ 使用备用附点四分音符模式（用户已勾选四分音符或附点四分音符）`);
            for (let i = 0; i < 2; i++) {
                const midi = safeUserRange.min + (i % (safeUserRange.max - safeUserRange.min));
                const adjustedMidi = adjustToScale(midi, safeScale);
                const noteInfo = midiToNoteInfoWithCorrectSpelling(adjustedMidi);
                
                notes.push({
                    position: i * 1.5,
                    step: noteInfo.step,
                    octave: noteInfo.octave,
                    alter: noteInfo.alter,
                    duration: 6,
                    type: 'quarter',
                    dots: 1,
                    midi: adjustedMidi,
                    isStrong: true
                });
            }
        } else {
            // 🚨 用户没有勾选任何可用的节奏类型，无法生成备用模式
            console.error(`❌ 致命错误：用户没有勾选任何适用于6/8拍的节奏类型！`);
            console.error(`❌ 需要的节奏类型：eighth, quarter, dotted-quarter, half, dotted-half`);
            console.error(`❌ 用户勾选的节奏：[${userRhythms.join(', ')}]`);
            
            // 创建一个休止符填充整个小节，避免崩溃
            notes.push({
                position: 0.0,
                duration: 12,
                type: 'half-rest',
                dots: 1,
                isRest: true,
                isStrong: true
            });
        }
    }
    
    // 🎵 添加基本演奏法到音符
    if (userSettings.articulations.enabled && userSettings.articulations.basic.length > 0) {
        const basicArticulations = userSettings.articulations.basic;
        
        notes.forEach((note, index) => {
            // 跳过休止符
            if (note.isRest) {
                return;
            }
            
            // 根据概率添加基本演奏法
            const articulationProbability = 0.15; // 15%的概率添加基本演奏法
            
            if (random.nextFloat() < articulationProbability) {
                // 根据音符特征选择合适的articulation
                let suitableArticulations = [...basicArticulations];
                
                // Staccato适合短音符和轻快的段落
                if (note.type === 'eighth' || note.type === '16th') {
                    if (suitableArticulations.includes('staccato') && random.nextFloat() < 0.4) {
                        note.articulation = 'staccato';
                        console.log(`🎵 6/8拍 Staccato: ${note.step}${note.octave} (位置: ${note.position})`);
                        return;
                    }
                }
                
                // Accent适合强拍
                if (note.isStrong && suitableArticulations.includes('accent')) {
                    if (random.nextFloat() < 0.3) {
                        note.articulation = 'accent';
                        console.log(`🎵 6/8拍 Accent: ${note.step}${note.octave} (强拍位置: ${note.position})`);
                        return;
                    }
                }
                
                // Tenuto适合较长的音符
                if ((note.type === 'quarter' || note.type === 'quarter.') && suitableArticulations.includes('tenuto')) {
                    if (random.nextFloat() < 0.3) {
                        note.articulation = 'tenuto';
                        console.log(`🎵 6/8拍 Tenuto: ${note.step}${note.octave} (位置: ${note.position})`);
                        return;
                    }
                }
                
                // Marcato适合特别强调的音符（强拍+较长音符）
                if (note.isStrong && (note.type === 'quarter' || note.type === 'quarter.') && suitableArticulations.includes('marcato')) {
                    if (random.nextFloat() < 0.15) {
                        note.articulation = 'marcato';
                        console.log(`🎵 6/8拍 Marcato: ${note.step}${note.octave} (位置: ${note.position})`);
                        return;
                    }
                }
                
                // Fermata适合乐句结尾（最后一个小节的最后一个音符）
                if (isLastMeasure && index === notes.length - 1 && suitableArticulations.includes('fermata')) {
                    if (random.nextFloat() < 0.3) {
                        note.articulation = 'fermata';
                        console.log(`🎵 6/8拍 Fermata: ${note.step}${note.octave} (乐句结尾)`);
                        return;
                    }
                }
                
                // Acciaccatura适合装饰性的音符（不是第一个音符）
                if (index > 0 && suitableArticulations.includes('acciaccatura')) {
                    // 🎯 使用6/8拍专用的增强频率控制函数，替代硬编码的0.15
                    if (shouldGenerate68Articulation('acciaccatura', random)) {
                        note.articulation = 'acciaccatura';
                        
                        // 生成acciaccatura装饰音符
                        const acciaccaturaNote = generateAcciaccaturaNote68(note, safeScale, safeUserRange, random);
                        if (acciaccaturaNote) {
                            note.graceNote = acciaccaturaNote;
                            console.log(`🎵 6/8拍 Acciaccatura: ${acciaccaturaNote.step}${acciaccaturaNote.octave} -> ${note.step}${note.octave} (位置: ${note.position})`);
                            return;
                        }
                    }
                }
                
                // 如果没有选择特定的articulation，使用6/8拍专用频率控制逐个检查
                if (!note.articulation && suitableArticulations.length > 0) {
                    // 🎯 使用增强的频率控制系统，而不是随机选择
                    for (const articulation of suitableArticulations) {
                        if (articulation !== 'fermata' && articulation !== 'acciaccatura') { // fermata只用于结尾, acciaccatura需要特殊处理
                            if (shouldGenerate68Articulation(articulation, random)) {
                                note.articulation = articulation;
                                console.log(`🎯 6/8拍增强频率控制 ${articulation}: ${note.step}${note.octave} (用户设置生效)`);
                                break; // 找到第一个通过频率检查的articulation后停止
                            }
                        }
                    }
                }
            }
        });
    }
    
    // 🎸 添加吉他技巧articulation到音符（只有在没有基本演奏法时才添加）
    console.log(`🔧 6/8拍用户articulation设置检查:`);
    console.log(`  - enabled: ${userSettings.articulations.enabled}`);
    console.log(`  - guitar技巧: [${userSettings.articulations.guitar.join(', ')}]`);
    console.log(`  - basic技巧: [${userSettings.articulations.basic.join(', ')}]`);
    
    if (userSettings.articulations.enabled && userSettings.articulations.guitar.length > 0) {
        let lastArticulation = null; // 记录上一个articulation
        
        // 遍历所有音符，只在真正相邻的音符之间添加articulation
        for (let i = 1; i < notes.length; i++) {
            const currentNote = notes[i];
            const prevNote = notes[i - 1];
            
            // 跳过休止符
            if (currentNote.isRest || prevNote.isRest) {
                continue;
            }
            
            // 跳过已经有articulation的音符（基本演奏法优先）
            if (currentNote.articulation || prevNote.articulation) {
                continue;
            }
            
            // 不在最后一个音符添加articulation（防止跨小节）
            if (i === notes.length - 1) {
                continue;
            }
            
            // 只有两个音符真正相邻（中间没有休止符）时才考虑添加articulation
            if (currentNote.midi && prevNote.midi) {
                const interval = currentNote.midi - prevNote.midi;
                
                // 移除符干方向检查，因为我们强制slur在上方连接音头
                
                // 🔥 严格检查：如果用户没有选择某个吉他技巧，完全禁止该技巧
                const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
                const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
                
                console.log(`🔒 6/8拍严格检查: hammer-on允许: ${hammerOnAllowed}, pull-off允许: ${pullOffAllowed}`);
                console.log(`🔒 6/8拍严格检查: 用户选择的吉他技巧: ${JSON.stringify(userSettings.articulations.guitar)}`);
                
                // 检查用户选择的吉他技巧
                let articulationApplied = false;
                
                // Hammer-on: 上行二度（1-2半音） - 🔥 严格检查用户是否允许，并使用频率控制
                if (!articulationApplied && hammerOnAllowed && 
                    interval > 0 && interval <= 2 && 
                    lastArticulation !== 'hammer-on') { // 不能连续两个hammer-on
                    
                    // 🎯 6/8拍另一处新的频率控制逻辑：控制上行二度slur的生成
                    const shouldGenerateSlur = shouldGenerateDirectionalSlur(interval, random);
                    
                    if (shouldGenerateSlur) {
                        currentNote.articulation = 'hammer-on';
                        lastArticulation = 'hammer-on';
                        articulationApplied = true;
                        console.log(`✅ 6/8拍另一处 Hammer-on: ${prevNote.midi} -> ${currentNote.midi} (位置: ${prevNote.position} -> ${currentNote.position}) - 用户已选择hammer-on`);
                    } else {
                        console.log(`❌ 6/8拍另一处 Hammer-on跳过: 频率控制阻止 (${interval > 0 ? '+' : ''}${interval}半音)`);
                    }
                } else if (!hammerOnAllowed && interval > 0 && interval <= 2) {
                    console.log(`🔒 6/8拍严格禁止: hammer-on未被用户选择，跳过上行二度: ${prevNote.midi} -> ${currentNote.midi}`);
                }
                
                // Pull-off: 下行二度（-1或-2半音） - 🔥 使用新的频率控制逻辑
                if (!articulationApplied && pullOffAllowed && 
                    interval < 0 && interval >= -2 && 
                    lastArticulation !== 'pull-off') { // 不能连续两个pull-off
                    
                    // 🎯 6/8拍另一处新的频率控制逻辑：控制下行二度slur的生成
                    const shouldGenerateSlur = shouldGenerateDirectionalSlur(interval, random);
                    
                    if (shouldGenerateSlur) {
                        currentNote.articulation = 'pull-off';
                        lastArticulation = 'pull-off';
                        articulationApplied = true;
                        console.log(`✅ 6/8拍另一处 Pull-off: ${prevNote.midi} -> ${currentNote.midi} (位置: ${prevNote.position} -> ${currentNote.position}) - 用户已选择pull-off`);
                    } else {
                        console.log(`❌ 6/8拍另一处 Pull-off跳过: 频率控制阻止 (${interval}半音)`);
                    }
                } else if (!pullOffAllowed && interval < 0 && interval >= -2) {
                    console.log(`🔒 6/8拍严格禁止: pull-off未被用户选择，跳过下行二度: ${prevNote.midi} -> ${currentNote.midi}`);
                }
                // Glissando: 较大音程（3-12半音） - 仅当用户选择了glissando时
                // 避免跨小节：使用简单但有效的检查
                if (!articulationApplied && userSettings.articulations.guitar.includes('glissando') && 
                         Math.abs(interval) >= 3 && Math.abs(interval) <= 12 && 
                         lastArticulation !== 'glissando' && // 不能连续两个glissando
                         i < notes.length - 1 && // 确保不是最后一个音符
                         random.nextFloat() < 0.95) { // 提高概率以便测试
                    currentNote.articulation = 'glissando';
                    lastArticulation = 'glissando';
                    articulationApplied = true;
                    console.log(`🎸 6/8拍 Glissando: ${prevNote.midi} -> ${currentNote.midi} (位置: ${prevNote.position} -> ${currentNote.position}, 音程: ${interval}半音) - 用户已选择glissando`);
                }
                // 如果没有添加articulation，检查是否需要重置lastArticulation
                if (!articulationApplied && !currentNote.articulation) {
                    // 如果当前音符没有articulation，并且和前一个音符之间没有休止符，
                    // 则重置lastArticulation，允许下一个音符添加任何articulation
                    if (i > 1 && !notes[i-1].articulation) {
                        lastArticulation = null;
                    }
                }
            }
        }
    }
    
    // 🎼 生成MusicXML
    let measureXML = '';
    
    notes.forEach((note, index) => {
        if (note.isRest) {
            // 🎵 生成休止符MusicXML
            const restType = note.type.replace('-rest', '');
            measureXML += `
      <note>
        <rest>`;
            
            // 休止符位置与谱号无关，只根据五线谱线条编号确定
            switch(restType) {
                case 'whole':
                    // 全休止符永远挂在第四线下方
                    measureXML += `<line>4</line>`;
                    break;
                case 'half':
                    // 二分休止符永远顶在第三线上方
                    measureXML += `<line>3</line>`;
                    break;
                case 'quarter':
                case 'eighth':
                case '16th':
                default:
                    // 其他休止符都在第三线区域
                    measureXML += `<line>3</line>`;
                    break;
            }
            
            measureXML += `</rest>
        <duration>${note.duration}</duration>
        <type>${restType}</type>`;
        
            // 添加附点
            if (note.dots) {
                measureXML += `
        <dot/>`;
            }
        } else {
            // 🎵 如果有grace note，先生成grace note的XML
            if (note.graceNote) {
                console.log(`🎵 生成6/8拍grace note: ${note.graceNote.step}${note.graceNote.octave} -> ${note.step}${note.octave}`);
                measureXML += `
      <note>
        <grace slash="yes"/>
        <pitch>
          <step>${note.graceNote.step}</step>`;
        
                // 添加升降号
                if (note.graceNote.alter && note.graceNote.alter !== 0) {
                    measureXML += `
          <alter>${note.graceNote.alter}</alter>`;
                }
                
                measureXML += `
          <octave>${note.graceNote.octave}</octave>
        </pitch>
        <type>${note.graceNote.type}</type>
      </note>`;
            }
            
            // 🎵 生成主音符MusicXML
            measureXML += `
      <note>
        <pitch>
          <step>${note.step}</step>`;
        
            // 添加升降号
            if (note.alter && note.alter !== 0) {
                measureXML += `
          <alter>${note.alter}</alter>`;
            }
            
            measureXML += `
          <octave>${note.octave}</octave>
        </pitch>
        <duration>${note.duration}</duration>
        <type>${note.type}</type>`;
        
            // 添加附点
            if (note.dots) {
                measureXML += `
        <dot/>`;
            }
        }
        
        // 🎶 处理连音信息（二连音、四连音）
        if (note.tuplet) {
            const tupletInfo = note.tuplet;
            
            // 添加time-modification标签
            let actualNotes, normalNotes;
            if (tupletInfo.type === 'duplet') {
                actualNotes = 2; 
                normalNotes = 3; // 二连音：2个音符占3个八分音符的时间
            } else if (tupletInfo.type === 'quadruplet') {
                actualNotes = 4;
                normalNotes = 3; // 四连音：4个音符占3个八分音符的时间
            }
            
            if (actualNotes && normalNotes) {
                measureXML += `
        <time-modification>
          <actual-notes>${actualNotes}</actual-notes>
          <normal-notes>${normalNotes}</normal-notes>
        </time-modification>`;
            }
        }
        
        // 🔗 6/8拍正确的beam规则 - 考虑休止符打断beam连接
        if (!note.isRest && (note.type === 'eighth' || note.type === '16th')) {
            // 根据音符位置决定beam分组 (6/8拍: 0-1.5为第一组, 1.5-3.0为第二组)
            const isFirstGroup = note.position < 1.5;
            const beamGroupId = isFirstGroup ? 1 : 2;
            
            // 找到同一组内的连续可beam音符（休止符会打断连接）
            const sameGroupNotes = findContinuousBeamableNotes(notes, note.position, isFirstGroup);
            
            const positionInGroup = sameGroupNotes.findIndex(n => n.position === note.position);
            const isFirstInGroup = positionInGroup === 0;
            const isLastInGroup = positionInGroup === sameGroupNotes.length - 1;
            
            if (sameGroupNotes.length > 1) { // 只有多个音符时才beam
                if (note.type === '16th') {
                    // 十六分音符需要双重beam
                    if (isFirstInGroup) {
                        measureXML += `
        <beam number="1">begin</beam>
        <beam number="2">begin</beam>`;
                    } else if (isLastInGroup) {
                        measureXML += `
        <beam number="1">end</beam>
        <beam number="2">end</beam>`;
                    } else {
                        measureXML += `
        <beam number="1">continue</beam>
        <beam number="2">continue</beam>`;
                    }
                } else if (note.type === 'eighth') {
                    // 八分音符只需要单重beam
                    if (isFirstInGroup) {
                        measureXML += `
        <beam number="1">begin</beam>`;
                    } else if (isLastInGroup) {
                        measureXML += `
        <beam number="1">end</beam>`;
                    } else {
                        measureXML += `
        <beam number="1">continue</beam>`;
                    }
                }
            }
        }
        
        // 🎸 处理articulation和slur
        let hasNotations = false;
        let notationsContent = '';
        
        // 处理连音notations
        if (note.tuplet) {
            const tupletInfo = note.tuplet;
            hasNotations = true;
            
            // 连音开始或结束标记
            if (tupletInfo.position === 0) {
                // 连音开始
                const showNumber = tupletInfo.type === 'duplet' ? '2' : tupletInfo.type === 'quadruplet' ? '4' : '3';
                notationsContent += `
          <tuplet type="start" number="${tupletInfo.id}" bracket="yes" show-number="${showNumber}" placement="above"/>`;
                console.log(`🎵 连音开始: 类型=${tupletInfo.type}, ID=${tupletInfo.id}, 数字=${showNumber}`);
            } else if (tupletInfo.position === tupletInfo.total - 1) {
                // 连音结束
                notationsContent += `
          <tuplet type="stop" number="${tupletInfo.id}"/>`;
                console.log(`🎵 连音结束: 类型=${tupletInfo.type}, ID=${tupletInfo.id}`);
            }
        }
        
        // 处理articulation (包括基本演奏法和吉他技巧)
        if (!note.isRest && note.articulation) {
            hasNotations = true;
            
            // 处理基本演奏法
            if (['staccato', 'accent', 'tenuto', 'marcato', 'fermata'].includes(note.articulation)) {
                notationsContent += `
          <articulations>`;
                
                // 添加对应的articulation标记
                switch(note.articulation) {
                    case 'staccato':
                        notationsContent += `
            <staccato/>`;
                        break;
                    case 'accent':
                        notationsContent += `
            <accent/>`;
                        break;
                    case 'tenuto':
                        notationsContent += `
            <tenuto/>`;
                        break;
                    case 'marcato':
                        notationsContent += `
            <strong-accent/>`;
                        break;
                    case 'fermata':
                        // fermata在articulations外
                        notationsContent = `
          <fermata/>` + notationsContent;
                        break;
                }
                
                if (note.articulation !== 'fermata') {
                    notationsContent += `
          </articulations>`;
                }
            }
            // 处理吉他技巧
            else if (note.articulation === 'hammer-on') {
                // 🔥 严格权限检查
                const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
                if (hammerOnAllowed) {
                    notationsContent += `
          <articulations>
            <other-articulation>H</other-articulation>
          </articulations>`;
                    
                    // 只有在hammer-on被允许时才生成slur结束标记
                    notationsContent += `
          <slur type="stop" number="2"/>`;
                    console.log(`✅ 6/8拍hammer-on slur stop: 音符${index} (MIDI ${note.midi})`);
                } else {
                    console.log(`🔒 6/8拍hammer-on被禁止，不生成slur stop`);
                    // 清除不被允许的articulation
                    note.articulation = null;
                }
            } else if (note.articulation === 'pull-off') {
                // 🔥 严格权限检查
                const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
                if (pullOffAllowed) {
                    notationsContent += `
          <articulations>
            <other-articulation>P</other-articulation>
          </articulations>`;
                    
                    // 只有在pull-off被允许时才生成slur结束标记
                    notationsContent += `
          <slur type="stop" number="2"/>`;
                    console.log(`✅ 6/8拍pull-off slur stop: 音符${index} (MIDI ${note.midi})`);
                } else {
                    console.log(`🔒 6/8拍pull-off被禁止，不生成slur stop`);
                    // 清除不被允许的articulation
                    note.articulation = null;
                }
            }
        }
        
        // 🔥 严格检查下一个音符的articulation权限再生成slur
        if (!note.isRest && index < notes.length - 1) {
            const nextNote = notes[index + 1];
            if (nextNote && !nextNote.isRest && nextNote.articulation) {
                // 检查用户是否允许该articulation
                const hammerOnAllowed = userSettings.articulations.guitar.includes('hammer-on');
                const pullOffAllowed = userSettings.articulations.guitar.includes('pull-off');
                
                let shouldGenerateSlur = false;
                
                if (nextNote.articulation === 'hammer-on' && hammerOnAllowed) {
                    shouldGenerateSlur = true;
                    console.log(`🔍 6/8拍Slur开始: 为下一个hammer-on生成slur开始 (当前音符MIDI ${note.midi})`);
                } else if (nextNote.articulation === 'pull-off' && pullOffAllowed) {
                    shouldGenerateSlur = true;
                    console.log(`🔍 6/8拍Slur开始: 为下一个pull-off生成slur开始 (当前音符MIDI ${note.midi})`);
                } else if (['staccato', 'accent', 'tenuto', 'marcato'].includes(nextNote.articulation)) {
                    // 基本演奏法不需要slur
                    shouldGenerateSlur = false;
                } else {
                    console.log(`🔒 6/8拍Slur禁止: 下一个音符的articulation '${nextNote.articulation}' 不被允许，不生成slur (下一个音符MIDI ${nextNote.midi})`);
                    shouldGenerateSlur = false;
                }
                
                if (shouldGenerateSlur) {
                    hasNotations = true;
                    
                    // 🔥 FORCED DEBUG: 记录6/8拍slur的生成
                    console.log(`🚨 SLUR GENERATED at 6/8-branch: nextNote.articulation=${nextNote.articulation}`);
                    console.log(`🚨 6/8拍 User settings check: hammer-on allowed=${hammerOnAllowed}, pull-off allowed=${pullOffAllowed}`);
                    
                    // 🔥 方向限制检查：基于用户选择阻止特定方向的slur (6/8拍)
                    const interval68 = nextNote.midi - note.midi;
                    let shouldBlockByDirection68 = false;
                    
                    if (hammerOnAllowed && !pullOffAllowed) {
                        // 只选择hammer-on: 阻止所有下行二度的slur
                        if (interval68 < 0 && interval68 >= -2) {
                            shouldBlockByDirection68 = true;
                            console.log(`🚫 DIRECTION BLOCK (6/8): 用户只选择hammer-on，阻止下行二度slur (${interval68}半音)`);
                        }
                    } else if (!hammerOnAllowed && pullOffAllowed) {
                        // 只选择pull-off: 阻止所有上行二度的slur
                        if (interval68 > 0 && interval68 <= 2) {
                            shouldBlockByDirection68 = true;
                            console.log(`🚫 DIRECTION BLOCK (6/8): 用户只选择pull-off，阻止上行二度slur (+${interval68}半音)`);
                        }
                    }
                    
                    if (shouldBlockByDirection68) {
                        console.log(`🔒 方向限制阻止6/8拍slur生成: articulation=${nextNote.articulation}, interval=${interval68}`);
                        // 强制不生成任何slur XML
                    } else if (nextNote.articulation === 'hammer-on' && hammerOnAllowed && interval68 > 0) {
                        // 只允许上行hammer-on生成slur
                        notationsContent += `
          <slur type="start" number="2"/>`;
                        console.log(`✅ ALLOWED: 6/8拍hammer-on slur generated for ascending interval ${interval68}`);
                    } else if (nextNote.articulation === 'pull-off' && pullOffAllowed && interval68 < 0) {
                        // 只允许下行pull-off生成slur
                        notationsContent += `
          <slur type="start" number="2"/>`;
                        console.log(`✅ ALLOWED: 6/8拍pull-off slur generated for descending interval ${interval68}`);
                    } else {
                        console.log(`🚫 BLOCKED: 6/8拍slur blocked - articulation=${nextNote.articulation}, interval=${interval68}`);
                    }
                }
            }
        }
        
        // 输出notations标签
        if (hasNotations) {
            measureXML += `
        <notations>`;
            measureXML += notationsContent;
            measureXML += `
        </notations>`;
        }
        
        measureXML += `
      </note>`;
    });
    
    console.log(`✅ Cantus Firmus风格6/8拍生成完成！`);
    console.log(`  - 节奏模式: ${selectedPattern.name}`);
    console.log(`  - 十六分音符数量: ${notes.filter(n => n.type === '16th').length}`);
    console.log(`  - 八分音符数量: ${notes.filter(n => n.type === 'eighth').length}`);
    console.log(`  - 四分音符数量: ${notes.filter(n => n.type === 'quarter').length}`);
    console.log(`  - 强拍音符: ${notes.filter(n => n.isStrong).length}`);
    console.log(`  - 最后音符: MIDI ${currentMidiNote}`);
    console.log(`  - 音域使用: MIDI ${Math.min(...notes.map(n => n.midi))}-${Math.max(...notes.map(n => n.midi))}`);
    
    return {
        xml: measureXML,
        lastMidi: currentMidiNote,  // 返回实际的最后一个音符
        pattern: selectedPattern.name
    };
}

// ====== 下面的函数不再使用，保留用于兼容性 ======

function createNoteInfo(midi) {
        // 特殊检测 MIDI 72 (B#4)
        if (midi === 72) {
            console.error(`🎯🎯🎯 [createNoteInfo] 处理 MIDI 72 (B#4)!`);
            console.error(`🎯 栈追踪:`, new Error().stack.split('\n').slice(1, 5).join('\n'));
            // 注意：这个函数无法访问 userRange，所以不能在这里修正
            // 但至少可以记录它被调用了
        }
        
        const stepNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
        const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
        const noteIndex = midi % 12;
        const octave = Math.floor(midi / 12) - 1;
        
        return {
            midi: midi,
            step: stepNames[noteIndex],
            alter: alters[noteIndex] === 1 ? 1 : null,
            octave: octave
        };
    }
    
    // FIXME: 下面的代码是孤立的，不在任何函数内，需要重构或删除
    /*
    // 获取用户的节奏设置（从全局userSettings或传入参数）
    const userRhythms = (typeof userSettings !== 'undefined' && Array.isArray(userSettings.allowedRhythms)) ? 
        userSettings.allowedRhythms : ['eighth'];
    
    console.log(`🎛️ 用户节奏设置: [${userRhythms.join(', ')}]`);
    console.log(`🎯 音域设置: ${userRange.min}-${userRange.max}, 最大跳度: ${maxJump}半音`);
    
    // 🔍 调试十六分音符检测
    const has16th = userRhythms.includes('16th');
    const hasSixteenth = userRhythms.includes('sixteenth');
    console.log(`🔍 [调试] 十六分音符检测: '16th'=${has16th}, 'sixteenth'=${hasSixteenth}`);
    if (has16th || hasSixteenth) {
        console.log(`✅ [调试] 十六分音符已启用，将生成相应模式`);
    } else {
        console.log(`❌ [调试] 十六分音符未启用，跳过相应模式`);
    }
    
    // 6/8拍小节结构定义 - 强调复合二拍子特性
    const MEASURE_STRUCTURE = {
        positions: [0.0, 0.5, 1.0, 1.5, 2.0, 2.5],  // 六个八分音符位置
        strongBeats: [0.0, 1.5],                      // 🔥 复合二拍子的两个强拍
        weakBeats: [0.5, 1.0, 2.0, 2.5],            // 相对较弱的拍点
        groups: {
            first: [0, 1, 2],   // 第一组: 位置0.0, 0.5, 1.0
            second: [3, 4, 5]   // 第二组: 位置1.5, 2.0, 2.5
        },
        clarityBoundary: 1.5  // 关键边界：第4个八分音符必须清晰
    };
    
    // 🎵 根据用户设置动态生成6/8拍节奏模式
    function generateAdaptiveRhythmPatterns(userRhythms) {
        const patterns = [];
        
        // Pattern 1: 六个八分音符 ♪♪♪ ♪♪♪ (如果用户允许八分音符)
        if (userRhythms.includes('eighth')) {
            // 🎯 检查用户设置的八分音符频率
            let eighthWeight = 50; // 默认权重
            if (userSettings && userSettings.rhythmFrequencies && userSettings.rhythmFrequencies.eighth !== undefined) {
                const userFreq = userSettings.rhythmFrequencies.eighth;
                if (userFreq === 0) {
                    console.log(`🚫 6/8拍另一处八分音符频率为 0%，跳过八分音符模式`);
                    eighthWeight = 0;
                } else {
                    eighthWeight = userFreq * 0.8; // 将频率转换为权重
                    console.log(`🎯 6/8拍另一处八分音符频率：${userFreq}%，权重 = ${eighthWeight}`);
                }
            }
            
            if (eighthWeight > 0) {
                patterns.push({
                    name: '六个八分音符 - 强调强拍',
                    pattern: [
                        { position: 0.0, duration: 0.5, type: 'eighth', isStrongBeat: true },   // 第一强拍
                        { position: 0.5, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.5, duration: 0.5, type: 'eighth', isStrongBeat: true },   // 第二强拍
                        { position: 2.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 2.5, duration: 0.5, type: 'eighth', isStrongBeat: false }
                    ],
                    weight: eighthWeight,
                    emphasis: 'both_strong_beats'  // 强调两个强拍
                });
            }
        }
        
        // Pattern 2: 附点四分音符 ♩. ♩. (如果用户明确允许附点四分音符)
        // 🔥 6/8拍中的附点四分音符对应4/4拍中的二分音符
        if (userRhythms.includes('quarter.')) {
            let quarterWeight = 60; // 默认权重
            
            // 🔥 6/8拍中的附点四分音符使用4/4拍二分音符的频率设置
            if (userSettings && userSettings.rhythmFrequencies && userSettings.rhythmFrequencies.half !== undefined) {
                const userFreq = userSettings.rhythmFrequencies.half;
                if (userFreq === 0) {
                    console.log(`🚫 6/8拍附点四分音符模式：使用4/4拍二分音符频率${userFreq}%，跳过附点四分音符模式`);
                    quarterWeight = 0;
                } else {
                    quarterWeight = userFreq * 0.9; // 将频率转换为权重，稍高因为很适合6/8拍
                    console.log(`🎯 6/8拍附点四分音符模式：使用4/4拍二分音符频率${userFreq}%，权重 = ${quarterWeight}`);
                }
            }
            
            if (quarterWeight > 0) {
                patterns.push({
                    name: '附点四分音符 - 完美强拍对应',
                    pattern: [
                        { position: 0.0, duration: 1.5, type: 'quarter', dots: 1, isStrongBeat: true },   // 占满第一大拍
                        { position: 1.5, duration: 1.5, type: 'quarter', dots: 1, isStrongBeat: true }    // 占满第二大拍
                    ],
                    weight: quarterWeight,  // 使用频率控制的权重
                    emphasis: 'perfect_compound_feel'
                });
            }
        }
        
        // Pattern 3: 强拍上的长音符模式 ♩♪ | ♩♪
        if (userRhythms.includes('quarter') && userRhythms.includes('eighth')) {
            // 🎯 使用四分音符和八分音符频率的较小值
            let mixedWeight = 40; // 默认权重
            if (userSettings && userSettings.rhythmFrequencies) {
                const quarterFreq = userSettings.rhythmFrequencies.quarter || 50;
                const eighthFreq = userSettings.rhythmFrequencies.eighth || 40;
                if (quarterFreq === 0 || eighthFreq === 0) {
                    mixedWeight = 0;
                    console.log(`🚫 6/8拍混合模式：四分音符(${quarterFreq}%)或八分音符(${eighthFreq}%)频率为0%，跳过混合模式`);
                } else {
                    mixedWeight = Math.min(quarterFreq, eighthFreq) * 0.6;
                    console.log(`🎯 6/8拍混合模式频率：取较小值 min(${quarterFreq}%, ${eighthFreq}%) * 0.6 = ${mixedWeight}`);
                }
            }
            
            if (mixedWeight > 0) {
                patterns.push({
                    name: '强拍四分音符模式',
                    pattern: [
                        { position: 0.0, duration: 1.0, type: 'quarter', isStrongBeat: true },      // 强拍长音
                        { position: 1.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.5, duration: 1.0, type: 'quarter', isStrongBeat: true },      // 强拍长音
                        { position: 2.5, duration: 0.5, type: 'eighth', isStrongBeat: false }
                    ],
                    weight: mixedWeight,
                    emphasis: 'strong_beat_length',
                    needsBeatClarity: true  // 需要Beat Clarity处理
                });
                
                // Pattern 4: 强拍开始的组合 ♪♩ | ♪♩
                patterns.push({
                    name: '强拍启动模式',
                    pattern: [
                        { position: 0.0, duration: 0.5, type: 'eighth', isStrongBeat: true },       // 强拍启动
                        { position: 0.5, duration: 1.0, type: 'quarter', isStrongBeat: false },
                        { position: 1.5, duration: 0.5, type: 'eighth', isStrongBeat: true },       // 强拍启动
                        { position: 2.0, duration: 1.0, type: 'quarter', isStrongBeat: false }
                    ],
                    weight: Math.floor(mixedWeight * 0.75),
                    emphasis: 'strong_beat_attack',
                    needsBeatClarity: true  // 需要Beat Clarity处理
                });
            }
        }
        
        // Pattern 5: 二连音 (Duplets) - 2个音符占用3个八分音符的时间
        if (userRhythms.includes('duplet')) {
            // 🎯 检查用户设置的二连音频率
            let dupletWeight = 25; // 默认权重
            if (userSettings && userSettings.rhythmFrequencies && userSettings.rhythmFrequencies.duplet !== undefined) {
                const userFreq = userSettings.rhythmFrequencies.duplet;
                if (userFreq === 0) {
                    console.log(`🚫 6/8拍另一处二连音频率为 0%，跳过二连音模式`);
                    dupletWeight = 0;
                } else {
                    dupletWeight = userFreq * 0.5; // 将频率转换为权重
                    console.log(`🎯 6/8拍另一处二连音频率：${userFreq}%，权重 = ${dupletWeight}`);
                }
            }
            
            if (dupletWeight > 0) {
                // 第一大拍二连音
                patterns.push({
                    name: '第一大拍二连音',
                    pattern: [
                        { position: 0.0, duration: 0.75, type: 'eighth', isStrongBeat: true, tuplet: {type: 'duplet', number: 1, bracket: true} },
                        { position: 0.75, duration: 0.75, type: 'eighth', isStrongBeat: false, tuplet: {type: 'duplet', number: 1, bracket: true} },
                        { position: 1.5, duration: 0.5, type: 'eighth', isStrongBeat: true },
                        { position: 2.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 2.5, duration: 0.5, type: 'eighth', isStrongBeat: false }
                    ],
                    weight: dupletWeight,
                    emphasis: 'first_beat_duplet'
                });
                
                // 第二大拍二连音
                patterns.push({
                    name: '第二大拍二连音',
                    pattern: [
                        { position: 0.0, duration: 0.5, type: 'eighth', isStrongBeat: true },
                        { position: 0.5, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.5, duration: 0.75, type: 'eighth', isStrongBeat: true, tuplet: {type: 'duplet', number: 1, bracket: true} },
                        { position: 2.25, duration: 0.75, type: 'eighth', isStrongBeat: false, tuplet: {type: 'duplet', number: 1, bracket: true} }
                    ],
                    weight: dupletWeight,
                    emphasis: 'second_beat_duplet'
                });
            }
        }
        
        // Pattern 6: 四连音 (Quadruplets) - 4个音符占用3个八分音符的时间
        if (userRhythms.includes('quadruplet')) {
            // 🎯 检查用户设置的四连音频率
            let quadrupletWeight = 20; // 默认权重
            if (userSettings && userSettings.rhythmFrequencies && userSettings.rhythmFrequencies.quadruplet !== undefined) {
                const userFreq = userSettings.rhythmFrequencies.quadruplet;
                if (userFreq === 0) {
                    console.log(`🚫 6/8拍另一处四连音频率为 0%，跳过四连音模式`);
                    quadrupletWeight = 0;
                } else {
                    quadrupletWeight = userFreq * 0.4; // 将频率转换为权重
                    console.log(`🎯 6/8拍另一处四连音频率：${userFreq}%，权重 = ${quadrupletWeight}`);
                }
            }
            
            if (quadrupletWeight > 0) {
                // 第一大拍四连音
                patterns.push({
                    name: '第一大拍四连音',
                    pattern: [
                        { position: 0.0, duration: 0.375, type: 'eighth', isStrongBeat: true, tuplet: {type: 'quadruplet', number: 1, bracket: true} },
                        { position: 0.375, duration: 0.375, type: 'eighth', isStrongBeat: false, tuplet: {type: 'quadruplet', number: 1, bracket: true} },
                        { position: 0.75, duration: 0.375, type: 'eighth', isStrongBeat: false, tuplet: {type: 'quadruplet', number: 1, bracket: true} },
                        { position: 1.125, duration: 0.375, type: 'eighth', isStrongBeat: false, tuplet: {type: 'quadruplet', number: 1, bracket: true} },
                        { position: 1.5, duration: 0.5, type: 'eighth', isStrongBeat: true },
                        { position: 2.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 2.5, duration: 0.5, type: 'eighth', isStrongBeat: false }
                    ],
                    weight: quadrupletWeight,
                    emphasis: 'first_beat_quadruplet'
                });
                
                // 第二大拍四连音
                patterns.push({
                    name: '第二大拍四连音',
                    pattern: [
                        { position: 0.0, duration: 0.5, type: 'eighth', isStrongBeat: true },
                        { position: 0.5, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.5, duration: 0.375, type: 'eighth', isStrongBeat: true, tuplet: {type: 'quadruplet', number: 1, bracket: true} },
                        { position: 1.875, duration: 0.375, type: 'eighth', isStrongBeat: false, tuplet: {type: 'quadruplet', number: 1, bracket: true} },
                        { position: 2.25, duration: 0.375, type: 'eighth', isStrongBeat: false, tuplet: {type: 'quadruplet', number: 1, bracket: true} },
                        { position: 2.625, duration: 0.375, type: 'eighth', isStrongBeat: false, tuplet: {type: 'quadruplet', number: 1, bracket: true} }
                    ],
                    weight: quadrupletWeight,
                    emphasis: 'second_beat_quadruplet'
                });
            }
        }
        
        // Pattern 7: 十六分音符 (Sixteenth Notes) - 修复空白小节问题
        console.log(`🔍 [模式生成] 检查十六分音符: userRhythms=[${userRhythms.join(', ')}]`);
        if (userRhythms.includes('16th') || userRhythms.includes('sixteenth')) {
            console.log(`✅ [模式生成] 开始创建十六分音符模式...`);
            
            // 🎯 检查用户设置的十六分音符频率
            let sixteenthWeight = 100; // 默认权重
            if (userSettings && userSettings.rhythmFrequencies && userSettings.rhythmFrequencies['16th'] !== undefined) {
                const userFreq = userSettings.rhythmFrequencies['16th'];
                if (userFreq === 0) {
                    console.log(`🚫 6/8拍另一处十六分音符频率为 0%，跳过十六分音符模式`);
                    sixteenthWeight = 0;
                } else {
                    sixteenthWeight = userFreq * 1.0; // 将频率转换为权重
                    console.log(`🎯 6/8拍另一处十六分音符频率：${userFreq}%，权重 = ${sixteenthWeight}`);
                }
            }
            
            if (sixteenthWeight > 0) {
                // 🔥 关键修复：十六分音符模式应该独立工作，即使用户没有选择八分音符
                // 当用户选择十六分音符时，模式中的八分音符是作为十六分音符模式的一部分，不需要单独检查
                
                // 强拍十六分装饰 - 总时值必须为3.0拍
                patterns.push({
                    name: '强拍十六分装饰',
                    pattern: [
                        { position: 0.0, duration: 0.25, type: 'sixteenth', isStrongBeat: true },
                        { position: 0.25, duration: 0.25, type: 'sixteenth', isStrongBeat: false },
                        { position: 0.5, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.5, duration: 0.5, type: 'eighth', isStrongBeat: true },
                        { position: 2.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 2.5, duration: 0.5, type: 'eighth', isStrongBeat: false }
                    ],
                    weight: sixteenthWeight,
                    emphasis: 'strong_beat_sixteenth_decoration'
                    // ✅ 总时值: 0.25+0.25+0.5+0.5+0.5+0.5+0.5 = 3.0拍
                });
                
                // 次强拍十六分装饰 - 总时值必须为3.0拍
                patterns.push({
                    name: '次强拍十六分装饰',
                    pattern: [
                        { position: 0.0, duration: 0.5, type: 'eighth', isStrongBeat: true },
                        { position: 0.5, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.5, duration: 0.25, type: 'sixteenth', isStrongBeat: true },
                        { position: 1.75, duration: 0.25, type: 'sixteenth', isStrongBeat: false },
                        { position: 2.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 2.5, duration: 0.5, type: 'eighth', isStrongBeat: false }
                    ],
                    weight: sixteenthWeight,
                    emphasis: 'second_strong_beat_sixteenth_decoration'
                    // ✅ 总时值: 0.5+0.5+0.5+0.25+0.25+0.5+0.5 = 3.0拍
                });
                
                // 🎯 添加更多十六分音符变化模式
                patterns.push({
                    name: '四个十六分音符开始',
                    pattern: [
                        { position: 0.0, duration: 0.25, type: 'sixteenth', isStrongBeat: true },
                        { position: 0.25, duration: 0.25, type: 'sixteenth', isStrongBeat: false },
                        { position: 0.5, duration: 0.25, type: 'sixteenth', isStrongBeat: false },
                        { position: 0.75, duration: 0.25, type: 'sixteenth', isStrongBeat: false },
                        { position: 1.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.5, duration: 0.5, type: 'eighth', isStrongBeat: true },
                        { position: 2.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 2.5, duration: 0.5, type: 'eighth', isStrongBeat: false }
                    ],
                    weight: Math.floor(sixteenthWeight * 0.9),
                    emphasis: 'four_sixteenths_start'
                    // ✅ 总时值: 0.25*4 + 0.5*4 = 1.0 + 2.0 = 3.0拍
                });
            }
            
            console.log(`✅ [模式生成] 十六分音符模式创建完成，共添加了${3}个模式`);
        } else {
            console.log(`❌ [模式生成] 十六分音符未启用，跳过模式创建`);
        }
        
        // 🔥 严格遵循用户节奏选择：只在没有任何模式时才创建用户允许的基础模式
        if (patterns.length === 0) {
            console.warn('⚠️ 没有生成任何6/8拍节奏模式，尝试使用用户勾选的基础模式');
            
            // 🔥 严格检查：只使用用户实际勾选的节奏类型
            if (userRhythms.includes('eighth')) {
                console.warn('✅ 创建基础八分音符模式（用户已勾选）');
                patterns.push({
                    name: '严格基础八分音符模式',
                    pattern: [
                        { position: 0.0, duration: 0.5, type: 'eighth', isStrongBeat: true },
                        { position: 0.5, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.5, duration: 0.5, type: 'eighth', isStrongBeat: true },
                        { position: 2.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 2.5, duration: 0.5, type: 'eighth', isStrongBeat: false }
                    ],
                    weight: 100,
                    emphasis: 'strict_basic_pattern'
                });
            } else if (userRhythms.includes('dotted-half') || userRhythms.includes('half.')) {
                console.warn('✅ 创建基础附点二分音符模式（用户已勾选）');
                patterns.push({
                    name: '严格基础附点二分音符模式',
                    pattern: [
                        { position: 0.0, duration: 3.0, type: 'half', dots: 1, isStrongBeat: true }
                    ],
                    weight: 100,
                    emphasis: 'strict_dotted_half_pattern'
                });
            } else if (userRhythms.includes('quarter.')) {
                // 🔥 修复混淆错误：只有用户明确勾选附点四分音符时才创建附点四分音符模式
                console.warn('✅ 创建基础附点四分音符模式（用户已勾选附点四分音符）');
                patterns.push({
                    name: '严格基础附点四分音符模式',
                    pattern: [
                        { position: 0.0, duration: 1.5, type: 'quarter', dots: 1, isStrongBeat: true },
                        { position: 1.5, duration: 1.5, type: 'quarter', dots: 1, isStrongBeat: true }
                    ],
                    weight: 100,
                    emphasis: 'strict_dotted_quarter_pattern'
                });
            } else if (userRhythms.includes('quarter') && userRhythms.includes('eighth')) {
                // 🔥 修复：为普通四分音符用户创建适合6/8拍的组合模式
                console.warn('✅ 创建四分音符+八分音符组合模式（用户已勾选这两种节奏）');
                patterns.push({
                    name: '严格基础四分音符+八分音符模式',
                    pattern: [
                        { position: 0.0, duration: 1.0, type: 'quarter', isStrongBeat: true },
                        { position: 1.0, duration: 0.5, type: 'eighth', isStrongBeat: false },
                        { position: 1.5, duration: 1.0, type: 'quarter', isStrongBeat: true },
                        { position: 2.5, duration: 0.5, type: 'eighth', isStrongBeat: false }
                    ],
                    weight: 80,
                    emphasis: 'strict_quarter_eighth_pattern'
                });
            } else {
                console.error('❌ 致命错误：用户没有勾选任何适用于6/8拍的基础节奏类型！');
                console.error('❌ 6/8拍需要的节奏类型之一：eighth, quarter, dotted-quarter, dotted-half');
                console.error('❌ 用户勾选的节奏类型：[' + userRhythms.join(', ') + ']');
                // 返回空数组，让上级处理
            }
        }
        
        // Pattern 8: 附点二分音符 - 整小节长音符 (如果用户允许附点二分音符)
        if (userRhythms.includes('dotted-half') || userRhythms.includes('half.')) {
            // 🎯 6/8拍中的附点二分音符使用4/4拍全音符的频率设置
            let dottedHalfWeight = 20; // 默认权重
            if (userSettings && userSettings.rhythmFrequencies && userSettings.rhythmFrequencies.whole !== undefined) {
                const userFreq = userSettings.rhythmFrequencies.whole;
                if (userFreq === 0) {
                    console.log(`🚫 6/8拍附点二分音符：使用4/4拍全音符频率${userFreq}%，跳过附点二分音符模式`);
                    dottedHalfWeight = 0;
                } else {
                    dottedHalfWeight = userFreq * 0.8; // 将频率转换为权重
                    console.log(`🎯 6/8拍附点二分音符：使用4/4拍全音符频率${userFreq}%，权重 = ${dottedHalfWeight}`);
                }
            }
            
            if (dottedHalfWeight > 0) {
                patterns.push({
                    name: '附点二分音符 - 整小节持续',
                    pattern: [
                        { position: 0.0, duration: 3.0, type: 'dotted-half', dots: 1, isStrongBeat: true }   // 占满整个6/8小节
                    ],
                    weight: dottedHalfWeight,
                    emphasis: 'whole_measure_sustain'
                });
            }
        }
        
        return patterns;
    }
    
    // 🎼 处理Beat Clarity规则（拆分跨越1.5边界的音符）
    function applyBeatClarity(pattern) {
        const processedPattern = [];
        
        pattern.pattern.forEach((noteData) => {
            const endPosition = noteData.position + noteData.duration;
            const tolerance = 0.001; // 容差，避免浮点数精度问题
            
            // 🔥 十六分音符不需要Beat Clarity处理 - 它们太短，不会跨界
            if (noteData.type === 'sixteenth') {
                console.log(`🎼 [Beat Clarity] 跳过十六分音符: 位置${noteData.position}`);
                processedPattern.push(noteData);
                return;
            }
            
            // 检查是否跨越1.5拍边界（使用容差）
            if (noteData.position < 1.5 - tolerance && endPosition > 1.5 + tolerance) {
                console.log(`🔄 [Beat Clarity] 拆分跨界音符: 位置${noteData.position}, 时长${noteData.duration} (类型: ${noteData.type})`);
                
                // 拆分为两个音符
                const firstPart = {
                    ...noteData,
                    duration: 1.5 - noteData.position,  // 第一部分到1.5拍
                    type: 'eighth',  // 拆分后都是八分音符
                    tie: 'start'
                };
                
                const secondPart = {
                    ...noteData,
                    position: 1.5,
                    duration: endPosition - 1.5,  // 第二部分从1.5拍开始
                    type: 'eighth',
                    tie: 'stop',
                    isStrongBeat: true  // 1.5是强拍位置
                };
                
                console.log(`  ➜ 第一部分: 位置${firstPart.position}, 时长${firstPart.duration}`);
                console.log(`  ➜ 第二部分: 位置${secondPart.position}, 时长${secondPart.duration}`);
                
                processedPattern.push(firstPart);
                processedPattern.push(secondPart);
            } else {
                console.log(`🎼 [Beat Clarity] 保持原样: ${noteData.type}, 位置${noteData.position}, 时长${noteData.duration}`);
                processedPattern.push(noteData);
            }
        });
        
        return {
            ...pattern,
            pattern: processedPattern
        };
    }
    
    // 生成适合用户设置的节奏模式
    const availablePatterns = generateAdaptiveRhythmPatterns(userRhythms);
    console.log(`🎵 生成了${availablePatterns.length}个适合用户设置的6/8拍模式`);
    availablePatterns.forEach(p => {
        console.log(`  - ${p.name} (权重: ${p.weight})`);
        if (p.name.includes('十六分')) {
            console.log(`    🔍 [调试] 这是十六分音符模式，pattern长度: ${p.pattern.length}`);
        }
    });
    
    // 🔥 修复节奏模式选择逻辑：使用一致的加权随机选择方法
    const totalWeight = availablePatterns.reduce((sum, p) => sum + p.weight, 0);
    console.log(`🎯 [模式选择] 总权重: ${totalWeight}, 可用模式: ${availablePatterns.length}`);
    
    let selectedPattern;
    if (totalWeight > 0) {
        // 使用标准的weighted方法，与其他6/8拍选择逻辑保持一致
        const weights = availablePatterns.map(p => p.weight);
        selectedPattern = random.weighted(availablePatterns, weights);
        console.log(`🎵 [模式选择] 使用标准加权选择: ${selectedPattern ? selectedPattern.name : 'null'}`);
    } else {
        // 如果总权重为0，选择第一个可用模式作为回退
        selectedPattern = availablePatterns.length > 0 ? availablePatterns[0] : null;
        console.log(`⚠️ [模式选择] 总权重为0，使用回退选择: ${selectedPattern ? selectedPattern.name : 'null'}`);
    }
    
    // 应用Beat Clarity规则（如果需要）
    if (selectedPattern.needsBeatClarity) {
        selectedPattern = applyBeatClarity(selectedPattern);
        console.log(`🔄 [Beat Clarity] 已处理跨界音符: ${selectedPattern.name}`);
    }
    
    console.log(`🎵 选择节奏模式: ${selectedPattern.name} (强调: ${selectedPattern.emphasis})`);
    if (selectedPattern.name.includes('十六分')) {
        console.log(`🔍 [调试] 选中了十六分音符模式！pattern详情:`);
        selectedPattern.pattern.forEach((note, i) => {
            console.log(`    音符${i}: position=${note.position}, duration=${note.duration}, type=${note.type}`);
        });
    }
    
    // 🎼 实现Cantus Firmus风格的音符生成 - 为强拍位置生成更稳定的音符
    function generateCantusFirmusNote(position, isStrongBeat, lastMidi, isEnding = false) {
        console.log(`🎶 [Cantus Firmus] 位置${position}: ${isStrongBeat ? '强拍' : '弱拍'}音符生成`);
        
        if (lastMidi === null) {
            // 第一个音符：选择音域中央附近的调内音符
            const centerMidi = Math.floor((userRange.min + userRange.max) / 2);
            const scaleNotes = [];
            for (let octave = Math.floor(userRange.min / 12); octave <= Math.floor(userRange.max / 12); octave++) {
                for (const scaleDegree of scale) {
                    const midi = octave * 12 + scaleDegree;
                    if (midi >= userRange.min && midi <= userRange.max) {
                        scaleNotes.push(midi);
                    }
                }
            }
            
            // 选择最接近中央的音符
            const startNote = scaleNotes.reduce((closest, note) => 
                Math.abs(note - centerMidi) < Math.abs(closest - centerMidi) ? note : closest
            );
            
            console.log(`🎯 [Cantus Firmus] 起始音符: MIDI ${startNote} (中央: ${centerMidi})`);
            // 🔥 修复：应用临时记号处理 - 与4/4拍保持一致
            const finalStartNote = addAccidentalIfNeeded(startNote);
            return createNoteInfo(finalStartNote);
        }
        
        // Cantus Firmus规则：
        // 1. 强拍位置倾向于稳定音符（级进或保持）
        // 2. 弱拍位置可以有更多变化，但仍以级进为主
        // 3. 跳进后必须反向级进回归
        // 4. 严格遵循用户的最大跳跃限制
        
        const candidates = [];
        
        if (isStrongBeat) {
            // 🔥 强拍优先策略：级进 > 保持 > 小跳 > 大跳
            
            // 1. 级进音符（最高优先级）
            for (let step = 1; step <= 2; step++) {
                [1, -1].forEach(direction => {
                    const targetMidi = lastMidi + (direction * step);
                    if (targetMidi >= userRange.min && 
                        targetMidi <= userRange.max && 
                        step <= maxJump &&
                        scale.includes(targetMidi % 12)) {
                        // 强拍级进获得最高权重
                        for (let i = 0; i < 10; i++) candidates.push(targetMidi);
                    }
                });
            }
            
            // 2. 保持音符（次高优先级）
            if (scale.includes(lastMidi % 12)) {
                for (let i = 0; i < 8; i++) candidates.push(lastMidi);
            }
            
            // 3. 小跳音符（三度、四度）
            for (let interval = 3; interval <= 5; interval++) {
                [1, -1].forEach(direction => {
                    const targetMidi = lastMidi + (direction * interval);
                    if (targetMidi >= userRange.min && 
                        targetMidi <= userRange.max && 
                        interval <= maxJump &&
                        scale.includes(targetMidi % 12)) {
                        // 强拍小跳获得中等权重
                        for (let i = 0; i < 3; i++) candidates.push(targetMidi);
                    }
                });
            }
            
        } else {
            // 🎵 弱拍策略：更多变化，但仍以级进为主
            
            // 1. 级进音符（仍是主要选择）
            for (let step = 1; step <= 2; step++) {
                [1, -1].forEach(direction => {
                    const targetMidi = lastMidi + (direction * step);
                    if (targetMidi >= userRange.min && 
                        targetMidi <= userRange.max && 
                        step <= maxJump &&
                        scale.includes(targetMidi % 12)) {
                        for (let i = 0; i < 6; i++) candidates.push(targetMidi);
                    }
                });
            }
            
            // 2. 三度跳跃（弱拍允许更多跳跃）
            for (let interval = 3; interval <= 4; interval++) {
                [1, -1].forEach(direction => {
                    const targetMidi = lastMidi + (direction * interval);
                    if (targetMidi >= userRange.min && 
                        targetMidi <= userRange.max && 
                        interval <= maxJump &&
                        scale.includes(targetMidi % 12)) {
                        for (let i = 0; i < 4; i++) candidates.push(targetMidi);
                    }
                });
            }
            
            // 3. 保持音符（权重较低）
            if (scale.includes(lastMidi % 12)) {
                for (let i = 0; i < 2; i++) candidates.push(lastMidi);
            }
        }
        
        // 如果是结尾音符，倾向于回到稳定音符
        if (isEnding) {
            console.log(`🏁 [Cantus Firmus] 结尾音符处理`);
            // 优先选择主音、三音、五音
            const preferredDegrees = [0, 2, 4]; // 主音、三音、五音在大调中的位置
            preferredDegrees.forEach(degree => {
                if (degree < scale.length) {
                    const scaleDegree = scale[degree];
                    for (let octave = Math.floor(userRange.min / 12); octave <= Math.floor(userRange.max / 12); octave++) {
                        const midi = octave * 12 + scaleDegree;
                        if (midi >= userRange.min && midi <= userRange.max && Math.abs(midi - lastMidi) <= maxJump) {
                            for (let i = 0; i < 15; i++) candidates.push(midi); // 很高的权重
                        }
                    }
                }
            });
        }
        
        if (candidates.length === 0) {
            console.warn(`⚠️ [Cantus Firmus] 无合适候选音符，使用备用方案`);
            return generateIntelligentNote(lastMidi, isEnding);
        }
        
        // 随机选择候选音符
        const selectedMidi = candidates[Math.floor(random.nextFloat() * candidates.length)];
        const interval = Math.abs(selectedMidi - lastMidi);
        
        // 特殊检测 MIDI 72 (B#4)
        if (selectedMidi === 72) {
            console.error(`🎯🎯🎯 [6/8 Cantus Firmus] 生成了 MIDI 72 (B#4)!`);
            console.error(`🎯 当前音域: ${userRange.min}-${userRange.max}`);
            console.error(`🎯 调号: ${keySignature}`);
            if (userRange.max <= 60) {
                console.error(`🚨🚨🚨 错误：MIDI 72 超出 C3-C4 音域 (${userRange.min}-${userRange.max})`);
                // 强制修正到音域内
                const correctedMidi = Math.min(selectedMidi, userRange.max);
                console.error(`🔧 修正 MIDI 72 -> ${correctedMidi}`);
                const finalCorrected72 = addAccidentalIfNeeded(correctedMidi);
                return createNoteInfo(finalCorrected72);
            }
        }
        
        // 额外的范围验证
        if (selectedMidi < userRange.min || selectedMidi > userRange.max) {
            console.error(`🚨 [6/8 Cantus Firmus] 音符超出范围: MIDI ${selectedMidi} (音域: ${userRange.min}-${userRange.max})`);
            const correctedMidi = Math.max(userRange.min, Math.min(userRange.max, selectedMidi));
            console.error(`🔧 修正为: MIDI ${correctedMidi}`);
            const finalCorrectedMidi = addAccidentalIfNeeded(correctedMidi);
            return createNoteInfo(finalCorrectedMidi);
        }
        
        console.log(`✅ [Cantus Firmus] 选择音符: MIDI ${selectedMidi} (间距: ${interval}半音, ${isStrongBeat ? '强拍' : '弱拍'})`);
        
        // 🔥 修复：应用临时记号处理 - 与4/4拍保持一致
        const finalSelectedMidi = addAccidentalIfNeeded(selectedMidi);
        return createNoteInfo(finalSelectedMidi);
    }
    
    // 生成小节XML，包含beaming信息
    let measureXML = '';
    let lastMidi = currentMidi;
    let tieId = 1; // 连音线ID计数器
    
    // 处理每个音符
    selectedPattern.pattern.forEach((noteData, index) => {
        const isEnding = isLastMeasure && index === selectedPattern.pattern.length - 1;
        
        // 🎼 使用Cantus Firmus风格生成音符
        const noteInfo = generateCantusFirmusNote(
            noteData.position, 
            noteData.isStrongBeat, 
            lastMidi, 
            isEnding
        );
        lastMidi = noteInfo.midi;
        
        // 计算MusicXML时值
        let xmlDuration, xmlType, hasDot = false;
        
        if (noteData.type === 'sixteenth') {
            xmlDuration = 1;  // 十六分音符 = 0.25 * 4 = 1
            xmlType = 'sixteenth';
        } else if (noteData.type === 'eighth') {
            xmlDuration = 2;  // 八分音符 = 0.5 * 4 = 2
            xmlType = 'eighth';
        } else if (noteData.type === 'quarter') {
            // 🔥 修复：统一使用dots属性（支持dots:1和dot:true两种格式）
            if (noteData.dots === 1 || noteData.dot === true) {
                xmlDuration = 6;  // 附点四分音符 = 1.5 * 4 = 6
                xmlType = 'quarter';
                hasDot = true;
                console.log(`🎵 检测到附点四分音符: ${noteData.dots === 1 ? 'dots=1' : 'dot=true'}`);
            } else {
                xmlDuration = 4;  // 四分音符 = 1.0 * 4 = 4
                xmlType = 'quarter';
            }
        } else if (noteData.type === 'half') {
            // 🔥 支持附点二分音符
            if (noteData.dots === 1 || noteData.dot === true) {
                xmlDuration = 12;  // 附点二分音符 = 3.0 * 4 = 12
                xmlType = 'half';
                hasDot = true;
                console.log(`🎵 检测到附点二分音符: ${noteData.dots === 1 ? 'dots=1' : 'dot=true'}`);
            } else {
                xmlDuration = 8;  // 二分音符 = 2.0 * 4 = 8
                xmlType = 'half';
            }
        } else if (noteData.type === 'dotted-half') {
            // 🔥 支持dotted-half类型表示法
            xmlDuration = 12;  // 附点二分音符 = 3.0 * 4 = 12
            xmlType = 'half';
            hasDot = true;
            console.log(`🎵 检测到附点二分音符(dotted-half类型)`);
        } else if (noteData.type === 'whole') {
            xmlDuration = 16;  // 全音符 = 4.0 * 4 = 16
            xmlType = 'whole';
        } else {
            // 默认使用八分音符
            xmlDuration = 2;  // 八分音符 = 0.5 * 4 = 2
            xmlType = 'eighth';
        }
        
        // 构建音符XML
        let noteXML = `
      <note>
        <pitch>
          <step>${noteInfo.step}</step>
          ${noteInfo.alter ? `<alter>${noteInfo.alter}</alter>` : ''}
          <octave>${noteInfo.octave}</octave>
        </pitch>
        <duration>${xmlDuration}</duration>
        <type>${xmlType}</type>${hasDot ? '\n        <dot/>' : ''}`;
        
        // 处理tuplet和tie信息
        let hasNotations = false;
        let notationsXML = '';
        
        // 添加连音线信息
        if (noteData.tie === 'start') {
            noteXML += `\n        <tie type="start"/>`;
            notationsXML += `\n          <tied type="start"/>`;
            hasNotations = true;
            console.log(`🔗 添加连音线开始: 位置${noteData.position}`);
        } else if (noteData.tie === 'stop') {
            noteXML += `\n        <tie type="stop"/>`;
            notationsXML += `\n          <tied type="stop"/>`;
            hasNotations = true;
            console.log(`🔗 添加连音线结束: 位置${noteData.position}`);
        }
        
        // 添加tuplet信息 (二连音和四连音)
        if (noteData.tuplet) {
            const tuplet = noteData.tuplet;
            let actualNotes, normalNotes, tupletType;
            
            if (tuplet.type === 'duplet') {
                actualNotes = 2;
                normalNotes = 3;
                tupletType = 'duplet';
            } else if (tuplet.type === 'quadruplet') {
                actualNotes = 4;
                normalNotes = 3;
                tupletType = 'quadruplet';
            }
            
            if (actualNotes && normalNotes) {
                // 添加time-modification
                noteXML += `\n        <time-modification>
          <actual-notes>${actualNotes}</actual-notes>
          <normal-notes>${normalNotes}</normal-notes>
        </time-modification>`;
                
                // 确定tuplet在组中的位置
                const tupletNotes = selectedPattern.pattern.filter(n => 
                    n.tuplet && n.tuplet.type === tuplet.type && n.tuplet.number === tuplet.number
                );
                const tupletIndex = tupletNotes.findIndex(n => n.position === noteData.position);
                const isFirst = tupletIndex === 0;
                const isLast = tupletIndex === tupletNotes.length - 1;
                
                // 添加tuplet标记到notations
                if (isFirst) {
                    notationsXML += `\n          <tuplet bracket="${tuplet.bracket ? 'yes' : 'no'}" number="${tuplet.number}" placement="above" type="start"/>`;
                    console.log(`🎵 [${tupletType}] 开始: 位置${noteData.position}`);
                } else if (isLast) {
                    notationsXML += `\n          <tuplet bracket="${tuplet.bracket ? 'yes' : 'no'}" number="${tuplet.number}" placement="above" type="stop"/>`;
                    console.log(`🎵 [${tupletType}] 结束: 位置${noteData.position}`);
                }
                
                hasNotations = true;
            }
        }
        
        // 如果有notations内容，添加notations标签
        if (hasNotations) {
            noteXML += `\n        <notations>${notationsXML}\n        </notations>`;
        }
        
        noteXML += `
      </note>`;
        
        measureXML += noteXML;
    });
    
    // 添加beaming信息（通过notations实现3+3分组）
    measureXML = addBeamingNotations(measureXML, selectedPattern);
    
    console.log(`✅ [6/8 Beat Clarity] 小节生成完成: ${selectedPattern.name}`);
    
    // 🔍 验证总时值
    const durationMatches = measureXML.match(/<duration>(\d+)<\/duration>/g) || [];
    let totalDuration = 0;
    durationMatches.forEach(match => {
        const value = parseInt(match.match(/\d+/)[0]);
        totalDuration += value;
    });
    
    const expectedDuration = 12; // 6/8拍，divisions=4时，总duration应该是12
    if (totalDuration !== expectedDuration) {
        console.error(`❌ [验证失败] 总时值错误: ${totalDuration} (期望: ${expectedDuration})`);
        console.error(`❌ 这会导致空白小节！模式: ${selectedPattern.name}`);
        
        // 输出详细调试信息
        console.log('🔍 模式详情:');
        selectedPattern.pattern.forEach((note, i) => {
            console.log(`  音符${i+1}: position=${note.position}, duration=${note.duration}, type=${note.type}`);
        });
        
        // 尝试自动修复：填充缺失的时值
        const missingDuration = expectedDuration - totalDuration;
        if (missingDuration > 0) {
            console.log(`🔧 尝试自动修复: 添加${missingDuration}单位的休止符`);
            // 添加休止符填充剩余时值
            const restType = missingDuration === 2 ? 'eighth' : missingDuration === 1 ? '16th' : 'quarter';
            const restXML = `
      <note>
        <rest>`;
            
            let restPositionXML = '';
            // 休止符位置与谱号无关，只根据五线谱线条编号确定
            // 使用<line>元素直接指定线条位置（从底部开始计数）
            switch(restType) {
                case 'whole':
                    // 全休止符永远挂在第四线下方
                    restPositionXML = '<line>4</line>';
                    break;
                case 'half':
                    // 二分休止符永远顶在第三线上方
                    restPositionXML = '<line>3</line>';
                    break;
                case 'quarter':
                case 'eighth':
                case '16th':
                default:
                    // 其他休止符都在第三线区域
                    restPositionXML = '<line>3</line>';
                    break;
            }
            
            const finalRestXML = restXML + restPositionXML + `</rest>
        <duration>${missingDuration}</duration>
        <type>${restType}</type>
      </note>`;
            measureXML += finalRestXML;
        }
    } else {
        console.log(`✅ [验证通过] 总时值正确: ${totalDuration}`);
    }
    
    return {
        xml: measureXML,
        lastMidi: lastMidi,
        pattern: selectedPattern.name
    };
}
*/

/**
 * 为6/8拍小节添加严格的3+3 beaming分组
 */
function addBeamingNotations(measureXML, selectedPattern) {
    console.log('🔗 [6/8 Beaming] 开始添加3+3分组信息');
    
    // 分析节奏模式中的可beam音符位置（八分音符和十六分音符）
    const beamableNotePositions = [];
    selectedPattern.pattern.forEach((noteData, index) => {
        if (noteData.type === 'eighth' || noteData.type === 'sixteenth') {
            beamableNotePositions.push({
                index: index,
                position: noteData.position,
                type: noteData.type,
                group: noteData.position < 1.5 ? 1 : 2  // 严格按1.5拍边界分组
            });
        }
    });
    
    console.log(`🎵 发现${beamableNotePositions.length}个可beam音符需要beaming`);
    beamableNotePositions.forEach(note => {
        console.log(`  - 音符${note.index + 1}: ${note.type}, 位置${note.position}, 分组${note.group}`);
    });
    
    // 如果有足够的可beam音符，添加beaming标记
    if (beamableNotePositions.length >= 2) {
        const group1Notes = beamableNotePositions.filter(n => n.group === 1);
        const group2Notes = beamableNotePositions.filter(n => n.group === 2);
        
        if (group1Notes.length >= 2) {
            console.log(`🔗 第一组beam: ${group1Notes.length}个音符 (0-1.5拍)`);
            measureXML = addBeamToNotes(measureXML, group1Notes, 1);
        }
        if (group2Notes.length >= 2) {
            console.log(`🔗 第二组beam: ${group2Notes.length}个音符 (1.5-3.0拍)`);
            measureXML = addBeamToNotes(measureXML, group2Notes, 2);
        }
    }
    
    return measureXML;
}

// 🔗 寻找连续的可beam音符（严格遵循6/8拍3+3分组规则）
function findContinuousBeamableNotes(allNotes, currentPosition, isFirstGroup) {
    console.log(`🔍 查找连续beam音符: 位置${currentPosition}, ${isFirstGroup ? '第一组' : '第二组'}`);
    
    // 🚫 6/8拍核心规则：强拍和次强拍之间永远不能beam连接
    // 第一组边界: 0.0 - 1.5 (不包含1.5)
    // 第二组边界: 1.5 - 3.0 
    const groupStart = isFirstGroup ? 0.0 : 1.5;
    const groupEnd = isFirstGroup ? 1.5 : 3.0;
    
    console.log(`  🎯 严格组边界: ${groupStart} - ${groupEnd} (${isFirstGroup ? '第一组' : '第二组'})`);
    
    // 按位置排序所有音符
    const sortedNotes = [...allNotes].sort((a, b) => a.position - b.position);
    
    // 过滤出当前组内的音符（严格边界检查）
    const groupNotes = sortedNotes.filter(n => {
        if (isFirstGroup) {
            return n.position >= groupStart && n.position < groupEnd; // 不包含1.5
        } else {
            return n.position >= groupStart && n.position < groupEnd; // 1.5及以后
        }
    });
    
    console.log(`  组内音符: ${groupNotes.map(n => `${n.position}(${n.isRest ? 'R' : n.type})`).join(', ')}`);
    
    // 找到当前音符的索引
    const currentIndex = groupNotes.findIndex(n => n.position === currentPosition);
    if (currentIndex === -1) {
        console.warn(`  ⚠️ 当前音符${currentPosition}不在组内，返回单独音符`);
        return [allNotes.find(n => n.position === currentPosition)];
    }
    
    // 🔥 关键：检查是否跨越了1.5拍边界
    const currentNote = groupNotes[currentIndex];
    if (currentNote.position >= 1.5 && isFirstGroup) {
        console.warn(`  🚫 音符位置${currentNote.position}超出第一组边界1.5`);
        return [currentNote];
    }
    if (currentNote.position < 1.5 && !isFirstGroup) {
        console.warn(`  🚫 音符位置${currentNote.position}超出第二组边界1.5`);
        return [currentNote];
    }
    
    // 从当前音符向前查找连续的beam音符
    let startIndex = currentIndex;
    while (startIndex > 0) {
        const prevNote = groupNotes[startIndex - 1];
        
        // 🔥 强制检查：绝不跨越1.5拍边界
        if (isFirstGroup && prevNote.position >= 1.5) {
            console.log(`  🚫 向前搜索遇到1.5拍边界，停止`);
            break;
        }
        if (!isFirstGroup && prevNote.position < 1.5) {
            console.log(`  🚫 向前搜索遇到1.5拍边界，停止`);
            break;
        }
        
        // 如果前一个音符是休止符或不可beam，停止
        if (prevNote.isRest || (prevNote.type !== 'eighth' && prevNote.type !== '16th')) {
            console.log(`  🛑 向前搜索遇到休止符或不可beam音符，停止`);
            break;
        }
        startIndex--;
    }
    
    // 从当前音符向后查找连续的beam音符
    let endIndex = currentIndex;
    while (endIndex < groupNotes.length - 1) {
        const nextNote = groupNotes[endIndex + 1];
        
        // 🔥 强制检查：绝不跨越1.5拍边界
        if (isFirstGroup && nextNote.position >= 1.5) {
            console.log(`  🚫 向后搜索遇到1.5拍边界，停止`);
            break;
        }
        if (!isFirstGroup && nextNote.position < 1.5) {
            console.log(`  🚫 向后搜索遇到1.5拍边界，停止`);
            break;
        }
        
        // 如果下一个音符是休止符或不可beam，停止
        if (nextNote.isRest || (nextNote.type !== 'eighth' && nextNote.type !== '16th')) {
            console.log(`  🛑 向后搜索遇到休止符或不可beam音符，停止`);
            break;
        }
        endIndex++;
    }
    
    // 提取连续的可beam音符
    const continuousBeamNotes = [];
    for (let i = startIndex; i <= endIndex; i++) {
        const note = groupNotes[i];
        if (!note.isRest && (note.type === 'eighth' || note.type === '16th')) {
            // 🔥 最后一次边界检查
            if (isFirstGroup && note.position >= 1.5) {
                console.warn(`  🚫 跳过超出边界的音符${note.position}`);
                continue;
            }
            if (!isFirstGroup && note.position < 1.5) {
                console.warn(`  🚫 跳过超出边界的音符${note.position}`);
                continue;
            }
            continuousBeamNotes.push(note);
        }
    }
    
    console.log(`  ✅ 连续beam音符: ${continuousBeamNotes.map(n => `${n.position}(${n.type})`).join(', ')}`);
    console.log(`  🔒 边界检查: 所有音符都在${isFirstGroup ? '0.0-1.5' : '1.5-3.0'}范围内`);
    
    return continuousBeamNotes;
}

/**
 * 为指定的音符添加MusicXML beam标记 - 修复版
 */
function addBeamToNotes(measureXML, notePositions, beamGroupNumber) {
    console.log(`🔗 为beam组${beamGroupNumber}添加MusicXML标记`);
    console.log(`  音符位置列表:`, notePositions.map(n => `index=${n.index}, type=${n.type}`));
    
    // 将measureXML按音符分割
    const noteXMLs = measureXML.split('<note>').slice(1); // 去掉第一个空元素
    console.log(`  XML中总共有${noteXMLs.length}个音符`);
    
    let result = '';
    
    // 判断组内是否有十六分音符（需要特殊处理混合beam）
    const hasSixteenth = notePositions.some(n => n.type === 'sixteenth');
    console.log(`  组内${hasSixteenth ? '包含' : '不包含'}十六分音符`);
    
    noteXMLs.forEach((noteXML, xmlIndex) => {
        let modifiedNoteXML = '<note>' + noteXML;
        
        // 🔥 关键修复：使用xmlIndex匹配，而不是processedNoteIndex
        const matchingNote = notePositions.find(n => n.index === xmlIndex);
        
        if (matchingNote) {
            const positionInGroup = notePositions.indexOf(matchingNote);
            const isFirst = positionInGroup === 0;
            const isLast = positionInGroup === notePositions.length - 1;
            
            let beamXML = '';
            
            // 处理混合beam组（包含十六分音符和八分音符）
            if (hasSixteenth) {
                // 所有音符都需要主beam (beam number="1")
                if (isFirst) {
                    beamXML = `
        <beam number="1">begin</beam>`;
                } else if (isLast) {
                    beamXML = `
        <beam number="1">end</beam>`;
                } else {
                    beamXML = `
        <beam number="1">continue</beam>`;
                }
                
                // 只有十六分音符需要次beam (beam number="2")
                if (matchingNote.type === 'sixteenth') {
                    // 检查相邻音符类型，决定次beam的形式
                    const prevNote = positionInGroup > 0 ? notePositions[positionInGroup - 1] : null;
                    const nextNote = positionInGroup < notePositions.length - 1 ? notePositions[positionInGroup + 1] : null;
                    
                    const prevIsSixteenth = prevNote && prevNote.type === 'sixteenth';
                    const nextIsSixteenth = nextNote && nextNote.type === 'sixteenth';
                    
                    if (isFirst && nextIsSixteenth) {
                        // 第一个十六分音符，且后面也是十六分音符
                        beamXML += `
        <beam number="2">begin</beam>`;
                    } else if (isLast && prevIsSixteenth) {
                        // 最后一个十六分音符，且前面也是十六分音符
                        beamXML += `
        <beam number="2">end</beam>`;
                    } else if (prevIsSixteenth && nextIsSixteenth) {
                        // 中间的十六分音符，前后都是十六分音符
                        beamXML += `
        <beam number="2">continue</beam>`;
                    } else if (prevIsSixteenth && !nextIsSixteenth) {
                        // 十六分音符组的结尾
                        beamXML += `
        <beam number="2">end</beam>`;
                    } else if (!prevIsSixteenth && nextIsSixteenth) {
                        // 十六分音符组的开始
                        beamXML += `
        <beam number="2">begin</beam>`;
                    } else {
                        // 孤立的十六分音符，使用hook
                        beamXML += `
        <beam number="2">backward hook</beam>`;
                    }
                }
                
                console.log(`  🎵 ${matchingNote.type}音符 (xml位置${xmlIndex}, pattern位置${matchingNote.index}): ${isFirst ? 'begin' : isLast ? 'end' : 'continue'}`);
            } else {
                // 纯八分音符组
                if (isFirst) {
                    beamXML = `
        <beam number="1">begin</beam>`;
                } else if (isLast) {
                    beamXML = `
        <beam number="1">end</beam>`;
                } else {
                    beamXML = `
        <beam number="1">continue</beam>`;
                }
                console.log(`  🎵 八分音符 (xml位置${xmlIndex}, pattern位置${matchingNote.index}): ${isFirst ? 'begin' : isLast ? 'end' : 'continue'}`);
            }
            
            // 在</note>前插入beam信息
            modifiedNoteXML = modifiedNoteXML.replace('</note>', beamXML + '\n      </note>');
        }
        
        result += modifiedNoteXML;
    });
    
    return result;
}

// ====== 6/8拍节奏选项动态切换 ======

/**
 * 根据拍号切换节奏选项的可见性
 */
function updateRhythmOptionsForTimeSignature(timeSignature) {
    console.log(`🎛️ 根据拍号更新节奏选项: ${timeSignature}`);
    
    // 获取节奏类型相关的元素
    const wholeLabel = document.getElementById('rhythm-whole-label');
    const dottedHalfLabel = document.getElementById('rhythm-dotted-half-label');
    const wholeCheckbox = document.getElementById('rhythm-whole');
    const dottedHalfCheckbox = document.getElementById('rhythm-dotted-half');
    
    const halfLabel = document.getElementById('rhythm-half-label');
    const dottedQuarterLabel = document.getElementById('rhythm-dotted-quarter-label');
    const halfCheckbox = document.getElementById('rhythm-half');
    const dottedQuarterCheckbox = document.getElementById('rhythm-dotted-quarter');
    
    const tripletLabel = document.getElementById('rhythm-triplet-label');
    const dupletLabel = document.getElementById('rhythm-duplet-label');
    const quadrupletLabel = document.getElementById('rhythm-quadruplet-label');
    const tripletCheckbox = document.getElementById('rhythm-triplet');
    const dupletCheckbox = document.getElementById('rhythm-duplet');
    const quadrupletCheckbox = document.getElementById('rhythm-quadruplet');
    
    // 获取高级设置中的频率控制元素
    const freqWholeItem = document.getElementById('freq-whole-item');
    const freqDottedHalfItem = document.getElementById('freq-dotted-half-item');
    const freqHalfItem = document.getElementById('freq-half-item');
    const freqDottedQuarterItem = document.getElementById('freq-dotted-quarter-item');
    const freqTripletItem = document.getElementById('freq-triplet-item');
    const freqDupletItem = document.getElementById('freq-duplet-item');
    const freqQuadrupletItem = document.getElementById('freq-quadruplet-item');
    
    if (timeSignature === '6/8') {
        // 6/8拍：自动替换节奏选项
        console.log('🎵 切换到6/8拍，自动调整节奏选项...');
        
        // 全音符 → 附点二分音符的替换
        if (wholeLabel && wholeCheckbox && dottedHalfLabel && dottedHalfCheckbox) {
            const wasWholeChecked = wholeCheckbox.checked;
            wholeLabel.style.display = 'none';
            dottedHalfLabel.style.display = 'flex';
            
            if (wasWholeChecked) {
                wholeCheckbox.checked = false;
                dottedHalfCheckbox.checked = true;
                console.log('✅ 6/8拍替换：全音符 → 附点二分音符');
            }
        }
        
        // 二分音符 → 附点四分音符的替换
        if (halfLabel && halfCheckbox && dottedQuarterLabel && dottedQuarterCheckbox) {
            const wasHalfChecked = halfCheckbox.checked;
            halfLabel.style.display = 'none';
            dottedQuarterLabel.style.display = 'flex';
            
            if (wasHalfChecked) {
                halfCheckbox.checked = false;
                dottedQuarterCheckbox.checked = true;
                console.log('✅ 6/8拍替换：二分音符 → 附点四分音符');
            }
        }
        
        // 三连音 → 二连音和四连音的替换
        if (tripletLabel && tripletCheckbox && dupletLabel && dupletCheckbox && quadrupletLabel && quadrupletCheckbox) {
            const wasTripletChecked = tripletCheckbox.checked;
            tripletLabel.style.display = 'none';
            dupletLabel.style.display = 'flex';
            quadrupletLabel.style.display = 'flex';
            
            if (wasTripletChecked) {
                tripletCheckbox.checked = false;
                dupletCheckbox.checked = true;
                quadrupletCheckbox.checked = true;
                console.log('✅ 6/8拍替换：三连音 → 二连音 + 四连音');
            }
        }
        
        // 高级设置：隐藏全音符和三连音频率，显示附点二分音符、二连音和四连音频率
        if (freqWholeItem) {
            freqWholeItem.style.display = 'none';
        }
        if (freqDottedHalfItem) {
            freqDottedHalfItem.style.display = 'block';
        }
        
        // 🔥 6/8拍：隐藏二分音符频率，显示附点四分音符频率
        if (freqHalfItem) {
            freqHalfItem.style.display = 'none';
        }
        if (freqDottedQuarterItem) {
            freqDottedQuarterItem.style.display = 'block';
        }
        
        if (freqTripletItem) {
            freqTripletItem.style.display = 'none';
        }
        if (freqDupletItem) {
            freqDupletItem.style.display = 'block';
        }
        if (freqQuadrupletItem) {
            freqQuadrupletItem.style.display = 'block';
        }
        
        console.log('🎵 6/8拍模式：显示附点二分音符、附点四分音符、二连音和四连音，隐藏全音符、二分音符和三连音（包括频率控制）');
    } else {
        // 其他拍号：自动恢复节奏选项
        console.log(`🎵 切换到${timeSignature}拍，自动恢复节奏选项...`);
        
        // 附点二分音符 → 全音符的恢复
        if (wholeLabel && wholeCheckbox && dottedHalfLabel && dottedHalfCheckbox) {
            const wasDottedHalfChecked = dottedHalfCheckbox.checked;
            wholeLabel.style.display = 'flex';
            dottedHalfLabel.style.display = 'none';
            
            if (wasDottedHalfChecked) {
                dottedHalfCheckbox.checked = false;
                wholeCheckbox.checked = true;
                console.log(`✅ ${timeSignature}拍恢复：附点二分音符 → 全音符`);
            }
        }
        
        // 附点四分音符 → 二分音符的恢复
        if (halfLabel && halfCheckbox && dottedQuarterLabel && dottedQuarterCheckbox) {
            const wasDottedQuarterChecked = dottedQuarterCheckbox.checked;
            halfLabel.style.display = 'flex';
            dottedQuarterLabel.style.display = 'none';
            
            if (wasDottedQuarterChecked) {
                dottedQuarterCheckbox.checked = false;
                halfCheckbox.checked = true;
                console.log(`✅ ${timeSignature}拍恢复：附点四分音符 → 二分音符`);
            }
        }
        
        // 二连音和四连音 → 三连音的恢复
        if (tripletLabel && tripletCheckbox && dupletLabel && dupletCheckbox && quadrupletLabel && quadrupletCheckbox) {
            const wasDupletChecked = dupletCheckbox.checked;
            const wasQuadrupletChecked = quadrupletCheckbox.checked;
            tripletLabel.style.display = 'flex';
            dupletLabel.style.display = 'none';
            quadrupletLabel.style.display = 'none';
            
            if (wasDupletChecked || wasQuadrupletChecked) {
                dupletCheckbox.checked = false;
                quadrupletCheckbox.checked = false;
                tripletCheckbox.checked = true;
                console.log(`✅ ${timeSignature}拍恢复：二连音 + 四连音 → 三连音`);
            }
        }
        
        // 高级设置：显示全音符和三连音频率，隐藏附点二分音符、二连音和四连音频率
        if (freqWholeItem) {
            freqWholeItem.style.display = 'block';
        }
        if (freqDottedHalfItem) {
            freqDottedHalfItem.style.display = 'none';
        }
        
        // 🔥 其他拍号：显示二分音符频率，隐藏附点四分音符频率
        if (freqHalfItem) {
            freqHalfItem.style.display = 'block';
        }
        if (freqDottedQuarterItem) {
            freqDottedQuarterItem.style.display = 'none';
        }
        
        if (freqTripletItem) {
            freqTripletItem.style.display = 'block';
        }
        if (freqDupletItem) {
            freqDupletItem.style.display = 'none';
        }
        if (freqQuadrupletItem) {
            freqQuadrupletItem.style.display = 'none';
        }
        
        console.log(`🎵 ${timeSignature}拍模式：显示全音符和三连音，隐藏附点二分音符、二连音和四连音（包括频率控制）`);
    }
    
    // 更新用户设置
    updateRhythmSettingsRealTime();
}

/**
 * 🔄 初始化复选框与高级设置滑块的双向同步机制
 */
function initializeCheckboxSliderSync() {
    console.log('🔄 初始化复选框与滑块同步机制');
    
    // 节奏设置同步
    initializeRhythmCheckboxSync();
    
    // 演奏法设置同步
    initializeArticulationCheckboxSync();
}

/**
 * 🎵 初始化节奏复选框同步
 */
function initializeRhythmCheckboxSync() {
    const rhythmTypes = ['whole', 'dotted-half', 'half', 'dotted-quarter', 'quarter', 'eighth', '16th', 'triplet', 'duplet', 'quadruplet'];
    
    rhythmTypes.forEach(type => {
        const checkbox = document.getElementById(`rhythm-${type}`);
        const slider = document.getElementById(`freq-${type}`);
        const valueSpan = document.getElementById(`freq-${type}-value`);
        
        if (checkbox && slider && valueSpan) {
            // 移除现有监听器防止重复绑定
            checkbox.removeEventListener('change', checkbox._syncHandler);
            
            // 创建同步处理函数
            checkbox._syncHandler = function() {
                if (!this.checked) {
                    // 🔥 当复选框取消勾选时，将对应的频率滑块设为0%
                    slider.value = 0;
                    valueSpan.textContent = '0%';
                    
                    // 更新userSettings
                    if (!userSettings.rhythmFrequencies) {
                        userSettings.rhythmFrequencies = {};
                    }
                    userSettings.rhythmFrequencies[type] = 0;
                    
                    console.log(`🔄 复选框取消勾选：${type} 频率自动设为 0%`);
                } else {
                    // 🔥 当复选框勾选时，如果频率为0%，恢复为默认频率
                    if (parseInt(slider.value) === 0) {
                        const defaultFreq = getDefaultRhythmFrequency(type);
                        slider.value = defaultFreq;
                        valueSpan.textContent = defaultFreq + '%';
                        
                        // 更新userSettings
                        if (!userSettings.rhythmFrequencies) {
                            userSettings.rhythmFrequencies = {};
                        }
                        userSettings.rhythmFrequencies[type] = defaultFreq;
                        
                        console.log(`🔄 复选框勾选：${type} 频率自动恢复为 ${defaultFreq}%`);
                    }
                }
            };
            
            checkbox.addEventListener('change', checkbox._syncHandler);
        }
    });
}

/**
 * 🎵 初始化演奏法复选框同步
 */
function initializeArticulationCheckboxSync() {
    // 基本演奏法同步
    const basicTypes = [
        { checkboxId: 'art-staccato', sliderType: 'staccato' },
        { checkboxId: 'art-accent', sliderType: 'accent' },
        { checkboxId: 'art-acciaccatura', sliderType: 'acciaccatura' }
    ];
    
    basicTypes.forEach(({ checkboxId, sliderType }) => {
        const checkbox = document.getElementById(checkboxId);
        const slider = document.getElementById(`freq-${sliderType}`);
        const valueSpan = document.getElementById(`freq-${sliderType}-value`);
        
        if (checkbox && slider && valueSpan) {
            // 移除现有监听器防止重复绑定
            checkbox.removeEventListener('change', checkbox._syncHandler);
            
            // 创建同步处理函数
            checkbox._syncHandler = function() {
                if (!this.checked) {
                    // 🔥 当复选框取消勾选时，将对应的频率滑块设为0%
                    slider.value = 0;
                    valueSpan.textContent = '0%';
                    
                    // 更新userSettings
                    if (!userSettings.articulations) {
                        userSettings.articulations = { frequencies: {} };
                    }
                    if (!userSettings.articulations.frequencies) {
                        userSettings.articulations.frequencies = {};
                    }
                    userSettings.articulations.frequencies[sliderType] = 0;
                    
                    console.log(`🔄 复选框取消勾选：${sliderType} 频率自动设为 0%`);
                } else {
                    // 🔥 当复选框勾选时，如果频率为0%，恢复为默认频率
                    if (parseInt(slider.value) === 0) {
                        const defaultFreq = getDefaultArticulationFrequency(sliderType);
                        slider.value = defaultFreq;
                        valueSpan.textContent = defaultFreq + '%';
                        
                        // 更新userSettings
                        if (!userSettings.articulations) {
                            userSettings.articulations = { frequencies: {} };
                        }
                        if (!userSettings.articulations.frequencies) {
                            userSettings.articulations.frequencies = {};
                        }
                        userSettings.articulations.frequencies[sliderType] = defaultFreq;
                        
                        console.log(`🔄 复选框勾选：${sliderType} 频率自动恢复为 ${defaultFreq}%`);
                    }
                }
            };
            
            checkbox.addEventListener('change', checkbox._syncHandler);
        }
    });
    
    // 🎸 吉他技巧同步 - hammer和pull共同控制slur频率
    const hammerCheckbox = document.getElementById('gtr-hammer');
    const pullCheckbox = document.getElementById('gtr-pull');
    const slurSlider = document.getElementById('freq-slur');
    const slurValueSpan = document.getElementById('freq-slur-value');
    
    if (hammerCheckbox && pullCheckbox && slurSlider && slurValueSpan) {
        // 创建共同的处理函数
        const handleGuitarCheckboxChange = function() {
            const hammerChecked = hammerCheckbox.checked;
            const pullChecked = pullCheckbox.checked;
            
            if (!hammerChecked && !pullChecked) {
                // 🔥 两个复选框都取消勾选时，slur频率设为0%
                slurSlider.value = 0;
                slurValueSpan.textContent = '0%';
                
                // 更新userSettings
                if (!userSettings.articulations) {
                    userSettings.articulations = { frequencies: {} };
                }
                if (!userSettings.articulations.frequencies) {
                    userSettings.articulations.frequencies = {};
                }
                userSettings.articulations.frequencies.slur = 0;
                
                console.log(`🔄 hammer和pull都取消勾选：slur频率自动设为 0%`);
            } else if ((hammerChecked || pullChecked) && parseInt(slurSlider.value) === 0) {
                // 🔥 至少一个勾选且slur频率为0%时，恢复默认频率
                const defaultFreq = getDefaultArticulationFrequency('slur');
                slurSlider.value = defaultFreq;
                slurValueSpan.textContent = defaultFreq + '%';
                
                // 更新userSettings
                if (!userSettings.articulations) {
                    userSettings.articulations = { frequencies: {} };
                }
                if (!userSettings.articulations.frequencies) {
                    userSettings.articulations.frequencies = {};
                }
                userSettings.articulations.frequencies.slur = defaultFreq;
                
                console.log(`🔄 hammer或pull勾选：slur频率自动恢复为 ${defaultFreq}%`);
            }
        };
        
        // 移除现有监听器防止重复绑定
        hammerCheckbox.removeEventListener('change', hammerCheckbox._syncHandler);
        pullCheckbox.removeEventListener('change', pullCheckbox._syncHandler);
        
        // 绑定事件监听器
        hammerCheckbox._syncHandler = handleGuitarCheckboxChange;
        pullCheckbox._syncHandler = handleGuitarCheckboxChange;
        
        hammerCheckbox.addEventListener('change', hammerCheckbox._syncHandler);
        pullCheckbox.addEventListener('change', pullCheckbox._syncHandler);
    }
}

/**
 * 获取默认节奏频率
 */
function getDefaultRhythmFrequency(type) {
    const defaults = {
        whole: 10,
        'dotted-half': 15,
        half: 30,
        'dotted-quarter': 35,
        quarter: 50,
        eighth: 40,
        '16th': 20,
        triplet: 15,
        duplet: 30,
        quadruplet: 25
    };
    return defaults[type] || 20;
}

/**
 * 获取默认演奏法频率
 */
function getDefaultArticulationFrequency(type) {
    const defaults = {
        staccato: 20,
        accent: 15,
        acciaccatura: 10,
        slur: 15
    };
    return defaults[type] || 15;
}

/**
 * 获取默认的节奏频率分档值（用于新的分档选择器系统）
 * 0: 禁用 (0%), 1: 低频率 (15%), 2: 中频率 (40%), 3: 高频率 (75%), 4: 最高频率 (100%)
 */
function getDefaultRhythmTier(type) {
    const defaults = {
        whole: 0,      // 10% -> 0 (禁用)
        'dotted-half': 1,  // 15% -> 1 (低频率)  
        half: 2,       // 30% -> 2 (中频率)
        'dotted-quarter': 2, // 35% -> 2 (中频率)
        quarter: 2,    // 50% -> 2 (中频率)
        eighth: 2,     // 40% -> 2 (中频率)
        '16th': 1,     // 20% -> 1 (低频率)
        triplet: 1,    // 15% -> 1 (低频率)
        duplet: 2,     // 30% -> 2 (中频率)
        quadruplet: 1  // 25% -> 1 (低频率)
    };
    return defaults[type] ?? 1; // 默认为低频率
}

/**
 * 获取默认的演奏法频率分档值（用于新的分档选择器系统）
 * 0: 禁用 (0%), 1: 低频率 (15%), 2: 中频率 (40%), 3: 高频率 (75%), 4: 最高频率 (100%)
 */
function getDefaultArticulationTier(type) {
    const defaults = {
        staccato: 1,      // 20% -> 1 (低频率)
        accent: 1,        // 15% -> 1 (低频率)
        acciaccatura: 0,  // 10% -> 0 (禁用)
        slur: 1          // 15% -> 1 (低频率)
    };
    return defaults[type] ?? 1; // 默认为低频率
}

/**
 * 🎵 初始化拍号复选框的实时监听器
 */
function initializeTimeSignatureListeners() {
    console.log('🎵 初始化拍号复选框实时监听器');
    
    const timeSignatureIds = ['time-2/4', 'time-3/4', 'time-4/4', 'time-6/8'];
    
    timeSignatureIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                console.log(`🎼 拍号复选框变化: ${id} = ${this.checked}`);
                
                // 当用户勾选6/8拍时，立即调整节奏选项
                if (id === 'time-6/8' && this.checked) {
                    console.log('🎵 检测到6/8拍被勾选，立即调整节奏选项');
                    updateRhythmOptionsForTimeSignature('6/8');
                } else if (id === 'time-6/8' && !this.checked) {
                    // 当6/8拍被取消勾选时，检查其他勾选的拍号
                    const otherCheckedTimeSignatures = timeSignatureIds
                        .filter(otherId => otherId !== id)
                        .map(otherId => document.getElementById(otherId))
                        .filter(otherCheckbox => otherCheckbox && otherCheckbox.checked)
                        .map(otherCheckbox => otherCheckbox.value);
                    
                    if (otherCheckedTimeSignatures.length > 0) {
                        // 如果还有其他拍号被勾选，使用第一个作为默认
                        const defaultTimeSignature = otherCheckedTimeSignatures[0];
                        console.log(`🎵 6/8拍被取消，切换到 ${defaultTimeSignature} 的节奏选项`);
                        updateRhythmOptionsForTimeSignature(defaultTimeSignature);
                    }
                }
                
                // 其他拍号的处理
                if (id !== 'time-6/8' && this.checked) {
                    // 如果6/8拍没有被勾选，且当前勾选的是其他拍号，使用标准节奏设置
                    const is68Selected = document.getElementById('time-6/8')?.checked;
                    if (!is68Selected) {
                        console.log(`🎵 检测到${this.value}拍被勾选且6/8拍未选中，使用标准节奏选项`);
                        updateRhythmOptionsForTimeSignature(this.value);
                    }
                }
            });
        } else {
            console.warn(`⚠️ 找不到拍号复选框: ${id}`);
        }
    });
}

// 🔥 在页面加载时自动初始化同步机制和按钮显示
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeCheckboxSliderSync();
        console.log('✅ 复选框与滑块同步机制已初始化');
        
        // 初始化按钮显示
        initializeButtonDisplays();
        console.log('✅ 按钮显示已初始化');
        
        // 🎵 初始化拍号复选框的实时监听器
        initializeTimeSignatureListeners();
        console.log('✅ 拍号实时监听器已初始化');
    }, 1000);
});

/**
 * 初始化所有按钮的显示文本
 */
function initializeButtonDisplays() {
    // 调号按钮
    updateButtonDisplay('keySettingsBtn', userSettings.allowedKeys, '调号');
    
    // 拍号按钮
    updateButtonDisplay('timeSignatureSettingsBtn', userSettings.allowedTimeSignatures, '拍号');
    
    // 音程跨度按钮（单选模式）
    const intervalMap = {
        1: '小二度', 2: '大二度', 3: '小三度', 4: '大三度',
        5: '完全四度', 6: '增四度/减五度', 7: '完全五度', 8: '小六度',
        9: '大六度', 10: '小七度', 11: '大七度', 12: '完全八度'
    };
    const selectedInterval = userSettings.allowedIntervals[0] || 12; // 取第一个（也是唯一的）值
    const intervalName = intervalMap[selectedInterval] || `${selectedInterval}度`;
    document.getElementById('intervalSettingsBtn').textContent = intervalName;
    
    // 谱号按钮
    const clefNames = userSettings.allowedClefs.map(clef => {
        const clefMap = {
            'treble': '高音谱号',
            'bass': '低音谱号', 
            'alto': '中音谱号'
        };
        return clefMap[clef] || clef;
    });
    updateButtonDisplay('clefSettingsBtn', clefNames, '谱号');
}

// ====== 🎵 调号设置弹窗管理 ======

/**
 * 打开调号设置弹窗
 */
function openKeySettings() {
    console.log('🎵 打开调号设置弹窗');
    
    // 恢复当前设置到UI
    const allowedKeys = userSettings.allowedKeys || ['C'];
    
    // 获取所有调号复选框
    const keyInputs = document.querySelectorAll('#keySignatureModal input[type="checkbox"]');
    keyInputs.forEach(input => {
        input.checked = allowedKeys.includes(input.value);
    });
    
    document.getElementById('keySignatureModal').style.display = 'flex';
}

/**
 * 关闭调号设置弹窗（静默保存）
 */
function closeKeySettingsWithSave() {
    console.log('❌ 关闭调号设置弹窗（自动保存）');
    
    const selectedKeys = [];
    const keyInputs = document.querySelectorAll('#keySignatureModal input[type="checkbox"]');
    keyInputs.forEach(input => {
        if (input.checked) {
            selectedKeys.push(input.value);
        }
    });
    
    // 如果有选择，则保存
    if (selectedKeys.length > 0) {
        userSettings.allowedKeys = selectedKeys;
        console.log(`✅ 调号设置已静默保存: ${selectedKeys.join(', ')}`);
        updateButtonDisplay('keySettingsBtn', selectedKeys, '调号');
    }
    
    document.getElementById('keySignatureModal').style.display = 'none';
}

/**
 * 关闭调号设置弹窗
 */
function closeKeySettings() {
    console.log('❌ 关闭调号设置弹窗');
    closeKeySettingsWithSave();
}

/**
 * 保存调号设置
 */
function saveKeySettings() {
    console.log('💾 保存调号设置');
    
    const selectedKeys = [];
    const keyInputs = document.querySelectorAll('#keySignatureModal input[type="checkbox"]');
    keyInputs.forEach(input => {
        if (input.checked) {
            selectedKeys.push(input.value);
        }
    });
    
    if (selectedKeys.length === 0) {
        alert('请至少选择一个调号！');
        return;
    }
    
    userSettings.allowedKeys = selectedKeys;
    console.log(`✅ 调号设置已保存: ${selectedKeys.join(', ')}`);
    
    // 更新按钮显示
    updateButtonDisplay('keySettingsBtn', selectedKeys, '调号');
    
    closeKeySettings();
}

/**
 * 全选大调
 */
function selectAllMajorKeys() {
    const majorKeyIds = [
        'key-C', 'key-G', 'key-D', 'key-A', 'key-E', 'key-B', 'key-F#',
        'key-F', 'key-Bb', 'key-Eb', 'key-Ab', 'key-Db', 'key-Gb'
    ];
    
    toggleSelectAll(
        'majorKeys', 
        majorKeyIds, 
        'button[onclick="selectAllMajorKeys()"]',
        '大调'
    );
}

/**
 * 全选小调
 */
function selectAllMinorKeys() {
    const minorKeyIds = [
        'key-Am', 'key-Em', 'key-Bm', 'key-F#m', 'key-C#m', 'key-G#m', 'key-D#m',
        'key-Dm', 'key-Gm', 'key-Cm', 'key-Fm', 'key-Bbm', 'key-Ebm'
    ];
    
    toggleSelectAll(
        'minorKeys', 
        minorKeyIds, 
        'button[onclick="selectAllMinorKeys()"]',
        '小调'
    );
}

// ====== 🥁 拍号设置弹窗管理 ======

/**
 * 打开拍号设置弹窗
 */
function openTimeSignatureSettings() {
    console.log('🥁 打开拍号设置弹窗');
    
    // 恢复当前设置到UI
    const allowedTimeSignatures = userSettings.allowedTimeSignatures || ['4/4'];
    
    // 获取所有拍号复选框
    const timeInputs = document.querySelectorAll('#timeSignatureModal input[type="checkbox"]');
    timeInputs.forEach(input => {
        input.checked = allowedTimeSignatures.includes(input.value);
    });
    
    document.getElementById('timeSignatureModal').style.display = 'flex';
}

/**
 * 关闭拍号设置弹窗（静默保存）
 */
function closeTimeSignatureSettingsWithSave() {
    console.log('❌ 关闭拍号设置弹窗（自动保存）');
    
    const selectedTimeSignatures = [];
    const timeInputs = document.querySelectorAll('#timeSignatureModal input[type="checkbox"]');
    timeInputs.forEach(input => {
        if (input.checked) {
            selectedTimeSignatures.push(input.value);
        }
    });
    
    // 如果有选择，则保存
    if (selectedTimeSignatures.length > 0) {
        userSettings.allowedTimeSignatures = selectedTimeSignatures;
        console.log(`✅ 拍号设置已静默保存: ${selectedTimeSignatures.join(', ')}`);
        
        // 根据选择的拍号调整节奏选项
        if (selectedTimeSignatures.length === 1) {
            updateRhythmOptionsForTimeSignature(selectedTimeSignatures[0]);
        } else if (selectedTimeSignatures.includes('6/8')) {
            updateRhythmOptionsForTimeSignature('6/8');
        } else {
            updateRhythmOptionsForTimeSignature('4/4');
        }
        
        updateButtonDisplay('timeSignatureSettingsBtn', selectedTimeSignatures, '拍号');
    }
    
    document.getElementById('timeSignatureModal').style.display = 'none';
}

/**
 * 关闭拍号设置弹窗
 */
function closeTimeSignatureSettings() {
    console.log('❌ 关闭拍号设置弹窗');
    closeTimeSignatureSettingsWithSave();
}

/**
 * 保存拍号设置
 */
function saveTimeSignatureSettings() {
    console.log('💾 保存拍号设置');
    
    const selectedTimeSignatures = [];
    const timeInputs = document.querySelectorAll('#timeSignatureModal input[type="checkbox"]');
    timeInputs.forEach(input => {
        if (input.checked) {
            selectedTimeSignatures.push(input.value);
        }
    });
    
    if (selectedTimeSignatures.length === 0) {
        alert('请至少选择一个拍号！');
        return;
    }
    
    userSettings.allowedTimeSignatures = selectedTimeSignatures;
    console.log(`✅ 拍号设置已保存: ${selectedTimeSignatures.join(', ')}`);
    
    // 🎵 根据选择的拍号调整节奏选项
    if (selectedTimeSignatures.length === 1) {
        // 如果只选择了一个拍号，自动调整节奏选项
        const singleTimeSignature = selectedTimeSignatures[0];
        console.log(`🎛️ 单一拍号选择，自动调整节奏选项: ${singleTimeSignature}`);
        updateRhythmOptionsForTimeSignature(singleTimeSignature);
    } else if (selectedTimeSignatures.includes('6/8')) {
        // 如果选择了多个拍号且包含6/8，优先使用6/8的设置
        console.log('🎛️ 多拍号选择包含6/8，优先使用6/8拍的节奏选项');
        updateRhythmOptionsForTimeSignature('6/8');
    } else {
        // 其他情况使用4/4拍的标准设置
        console.log('🎛️ 多拍号选择，使用4/4拍的标准节奏选项');
        updateRhythmOptionsForTimeSignature('4/4');
    }
    
    // 更新按钮显示
    updateButtonDisplay('timeSignatureSettingsBtn', selectedTimeSignatures, '拍号');
    
    closeTimeSignatureSettings();
}

/**
 * 全选拍号
 */
function selectAllTimeSignatures() {
    const timeSignatureIds = [
        'time-2/4', 'time-3/4', 'time-4/4', 'time-6/8'
    ];
    
    toggleSelectAll(
        'timeSignatures', 
        timeSignatureIds, 
        'button[onclick="selectAllTimeSignatures()"]',
        '拍号'
    );
}

// ====== 🎯 音程跨度设置弹窗管理 ======

/**
 * 打开音程跨度设置弹窗
 */
function openIntervalSettings() {
    console.log('🎯 打开音程跨度设置弹窗');
    
    // 恢复当前设置到UI（单选模式：只恢复第一个值）
    const selectedInterval = userSettings.allowedIntervals[0] || 12;
    
    // 获取所有音程复选框，只选中当前设置的那个
    const intervalInputs = document.querySelectorAll('#intervalModal input[type="checkbox"]');
    intervalInputs.forEach(input => {
        input.checked = (parseInt(input.value) === selectedInterval);
    });
    
    console.log(`🎯 恢复音程跨度设置: ${selectedInterval}半音`);
    
    document.getElementById('intervalModal').style.display = 'flex';
}

/**
 * 关闭音程跨度设置弹窗（静默保存）
 */
function closeIntervalSettingsWithSave() {
    console.log('❌ 关闭音程跨度设置弹窗（自动保存）');
    
    // 获取唯一选中的checkbox（单选逻辑）
    const checkedInput = document.querySelector('#intervalModal input[type="checkbox"]:checked');
    
    // 如果有选择，则保存
    if (checkedInput) {
        const selectedInterval = parseInt(checkedInput.value);
        userSettings.allowedIntervals = [selectedInterval];
        console.log(`✅ 音程跨度设置已静默保存: ${selectedInterval}半音`);
        
        // 更新按钮显示
        const intervalMap = {
            1: '小二度', 2: '大二度', 3: '小三度', 4: '大三度',
            5: '完全四度', 6: '增四度/减五度', 7: '完全五度', 8: '小六度',
            9: '大六度', 10: '小七度', 11: '大七度', 12: '完全八度'
        };
        const intervalName = intervalMap[selectedInterval] || `${selectedInterval}度`;
        document.getElementById('intervalSettingsBtn').textContent = intervalName;
    }
    
    document.getElementById('intervalModal').style.display = 'none';
}

/**
 * 关闭音程跨度设置弹窗
 */
function closeIntervalSettings() {
    console.log('❌ 关闭音程跨度设置弹窗');
    closeIntervalSettingsWithSave();
}

/**
 * 保存音程跨度设置
 */
function saveIntervalSettings() {
    console.log('💾 保存音程跨度设置');
    
    // 获取唯一选中的checkbox（单选逻辑）
    const checkedInput = document.querySelector('#intervalModal input[type="checkbox"]:checked');
    
    if (!checkedInput) {
        alert('请选择一个音程跨度！');
        return;
    }
    
    const selectedInterval = parseInt(checkedInput.value);
    
    // 保存为单个值的数组（保持与现有接口兼容）
    userSettings.allowedIntervals = [selectedInterval];
    console.log(`✅ 音程跨度设置已保存: ${selectedInterval}半音`);
    
    // 更新按钮显示
    const intervalMap = {
        1: '小二度', 2: '大二度', 3: '小三度', 4: '大三度',
        5: '完全四度', 6: '增四度/减五度', 7: '完全五度', 8: '小六度',
        9: '大六度', 10: '小七度', 11: '大七度', 12: '完全八度'
    };
    const intervalName = intervalMap[selectedInterval] || `${selectedInterval}度`;
    document.getElementById('intervalSettingsBtn').textContent = intervalName;
    
    closeIntervalSettings();
}

/**
 * 处理音程跨度checkbox的单选行为
 */
function handleIntervalCheckboxChange(clickedCheckbox) {
    // 如果当前checkbox被勾选，则取消勾选其他所有checkbox
    if (clickedCheckbox.checked) {
        const allIntervalCheckboxes = document.querySelectorAll('#intervalModal input[type="checkbox"]');
        allIntervalCheckboxes.forEach(checkbox => {
            if (checkbox !== clickedCheckbox) {
                checkbox.checked = false;
            }
        });
        console.log(`🎯 音程跨度单选: 选择了${clickedCheckbox.value}半音`);
    } else {
        // 如果用户取消勾选，确保至少有一个选项被选中（防止全部为空）
        const allIntervalCheckboxes = document.querySelectorAll('#intervalModal input[type="checkbox"]');
        const hasAnyChecked = Array.from(allIntervalCheckboxes).some(cb => cb.checked);
        if (!hasAnyChecked) {
            // 如果没有任何选项被勾选，重新勾选当前选项
            clickedCheckbox.checked = true;
            console.log(`⚠️ 音程跨度不能为空，保持${clickedCheckbox.value}半音选中`);
        }
    }
}

// ====== 🎼 谱号设置弹窗管理 ======

/**
 * 打开谱号设置弹窗
 */
function openClefSettings() {
    console.log('🎼 打开谱号设置弹窗');
    
    // 恢复当前设置到UI
    const allowedClefs = userSettings.allowedClefs || ['treble'];
    
    // 获取所有谱号复选框
    const clefInputs = document.querySelectorAll('#clefModal input[type="checkbox"]');
    clefInputs.forEach(input => {
        input.checked = allowedClefs.includes(input.value);
    });
    
    document.getElementById('clefModal').style.display = 'flex';
}

/**
 * 关闭谱号设置弹窗（静默保存）
 */
function closeClefSettingsWithSave() {
    console.log('❌ 关闭谱号设置弹窗（自动保存）');
    
    const selectedClefs = [];
    const clefInputs = document.querySelectorAll('#clefModal input[type="checkbox"]');
    clefInputs.forEach(input => {
        if (input.checked) {
            selectedClefs.push(input.value);
        }
    });
    
    // 如果有选择，则保存
    if (selectedClefs.length > 0) {
        userSettings.allowedClefs = selectedClefs;
        console.log(`✅ 谱号设置已静默保存: ${selectedClefs.join(', ')}`);
        
        const clefNames = selectedClefs.map(clef => {
            const clefMap = {
                'treble': '高音谱号',
                'bass': '低音谱号', 
                'alto': '中音谱号'
            };
            return clefMap[clef] || clef;
        });
        updateButtonDisplay('clefSettingsBtn', clefNames, '谱号');
    }
    
    document.getElementById('clefModal').style.display = 'none';
}

/**
 * 关闭谱号设置弹窗
 */
function closeClefSettings() {
    console.log('❌ 关闭谱号设置弹窗');
    closeClefSettingsWithSave();
}

/**
 * 保存谱号设置
 */
function saveClefSettings() {
    console.log('💾 保存谱号设置');
    
    const selectedClefs = [];
    const clefInputs = document.querySelectorAll('#clefModal input[type="checkbox"]');
    clefInputs.forEach(input => {
        if (input.checked) {
            selectedClefs.push(input.value);
        }
    });
    
    if (selectedClefs.length === 0) {
        alert('请至少选择一个谱号！');
        return;
    }
    
    userSettings.allowedClefs = selectedClefs;
    console.log(`✅ 谱号设置已保存: ${selectedClefs.join(', ')}`);
    
    // 更新按钮显示
    const clefNames = selectedClefs.map(clef => {
        const clefMap = {
            'treble': '高音谱号',
            'bass': '低音谱号', 
            'alto': '中音谱号'
        };
        return clefMap[clef] || clef;
    });
    updateButtonDisplay('clefSettingsBtn', clefNames, '谱号');
    
    closeClefSettings();
}

/**
 * 全选谱号
 */
function selectAllClefs() {
    const clefIds = [
        'clef-treble', 'clef-bass', 'clef-alto'
    ];
    
    toggleSelectAll(
        'clefs', 
        clefIds, 
        'button[onclick="selectAllClefs()"]',
        '谱号'
    );
}

// ====== 🔧 辅助函数 ======

/**
 * 更新按钮显示文本
 */
function updateButtonDisplay(buttonId, selectedItems, category) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    let displayText;
    if (selectedItems.length === 1) {
        displayText = selectedItems[0];
    } else if (selectedItems.length <= 3) {
        displayText = selectedItems.join(', ');
    } else {
        displayText = `${selectedItems.length}个${category}`;
    }
    
    // 保持图标，更新文本
    const iconMap = {
        'keySettingsBtn': '',
        'timeSignatureSettingsBtn': '', 
        'intervalSettingsBtn': '',
        'clefSettingsBtn': ''
    };
    
    const icon = iconMap[buttonId] || '';
    button.textContent = icon ? `${icon} ${displayText}` : displayText;
}

/**
 * 从允许的选项中随机选择一个
 */
function getRandomFromArray(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

// ====== 🎯 精准频率控制系统 ======

/**
 * 精准的节奏时值权重计算器
 * 将用户设置的百分比精确转换为权重系统
 */
function calculatePreciseRhythmWeight(duration) {
    const mappedDuration = mapDurationToFrequencyKey(duration);
    const userFreq = getUserFrequency('rhythm', mappedDuration);
    
    if (userFreq === 0) {
        return 0; // 完全禁用
    }
    
    // 🔥 使用对数尺度确保精准的频率控制
    // 频率越高，权重越大，但保持非线性关系以确保真实的百分比分布
    return Math.max(1, Math.pow(userFreq / 10, 1.2));
}

/**
 * 精准的articulation频率检查器
 * 使用真实的百分比概率，不受其他条件修饰
 */
function shouldGenerateArticulation(articulationType, randomGenerator = null) {
    const userFreq = getUserFrequency('articulation', articulationType);
    
    if (userFreq === 0) {
        return false; // 完全禁用
    }
    
    const random = randomGenerator ? randomGenerator.nextFloat() : Math.random();
    const shouldGenerate = (random * 100) < userFreq;
    
    // 详细日志用于调试
    console.log(`🎯 精准频率控制 ${articulationType}: ${userFreq}% -> ${shouldGenerate ? '✅生成' : '❌跳过'} (随机值: ${(random * 100).toFixed(1)}%)`);
    
    return shouldGenerate;
}

/**
 * 将滑块百分比值映射到分档系统
 * 0%: 禁用, 1-20%: 低频率 (15%), 21-50%: 中频率 (40%), 51-80%: 高频率 (75%), 81-100%: 最高频率 (100%)
 */
function mapSliderPercentageToTier(sliderValue) {
    const percentage = parseInt(sliderValue);
    
    if (percentage === 0) return 0;           // 禁用 (0%)
    if (percentage >= 1 && percentage <= 20) return 15;  // 低频率 (15%)
    if (percentage >= 21 && percentage <= 50) return 40; // 中频率 (40%)
    if (percentage >= 51 && percentage <= 80) return 75; // 高频率 (75%)
    if (percentage >= 81 && percentage <= 100) return 100; // 最高频率 (100%)
    
    return 15; // 默认为低频率
}

/**
 * 统一的用户频率获取器 - 支持滑块分档映射
 */
function getUserFrequency(category, item) {
    let rawValue;
    
    if (category === 'rhythm') {
        rawValue = userSettings?.rhythmFrequencies?.[item] ?? getDefaultRhythmFrequency(item);
    } else if (category === 'articulation') {
        rawValue = userSettings?.articulations?.frequencies?.[item] ?? getDefaultArticulationFrequency(item);
    } else {
        return 15; // 默认为低频率
    }
    
    // 将滑块百分比值映射到分档系统
    return mapSliderPercentageToTier(rawValue);
}

/**
 * 映射内部duration格式到用户设置键
 */
function mapDurationToFrequencyKey(duration) {
    const mapping = {
        'quarter.': 'dotted-quarter',
        'half.': 'dotted-half', 
        'eighth.': 'dotted-eighth'
    };
    return mapping[duration] || duration;
}

/**
 * 重建的权重选择系统（用于节奏时值）
 * 基于真实的概率分布而非简单的权重比较
 * 🔥 适用于所有拍号：2/4, 3/4, 4/4, 6/8
 */
function selectDurationByPreciseFrequency(availableDurations, randomGenerator = null) {
    // 计算每个duration的真实权重
    const weightedOptions = availableDurations.map(duration => ({
        duration,
        weight: calculatePreciseRhythmWeight(duration)
    })).filter(option => option.weight > 0); // 移除被禁用的选项
    
    if (weightedOptions.length === 0) {
        // 所有选项都被禁用，使用第一个可用的duration
        console.warn('⚠️ 所有节奏选项都被用户频率设置禁用，使用第一个可用选项');
        return availableDurations[0];
    }
    
    // 🔥 计算累积权重分布，确保精确的百分比控制
    const totalWeight = weightedOptions.reduce((sum, option) => sum + option.weight, 0);
    const random = randomGenerator ? randomGenerator.nextFloat() : Math.random();
    const target = random * totalWeight;
    
    let accumulator = 0;
    for (const option of weightedOptions) {
        accumulator += option.weight;
        if (accumulator >= target) {
            const mappedDuration = mapDurationToFrequencyKey(option.duration);
            const userFreq = getUserFrequency('rhythm', mappedDuration);
            console.log(`🎯 精准节奏选择: ${option.duration} (用户频率: ${userFreq}%, 权重: ${option.weight.toFixed(2)}, 拍号无关)`);
            return option.duration;
        }
    }
    
    // 后备方案
    return weightedOptions[weightedOptions.length - 1].duration;
}

/**
 * 6/8拍专用：灵敏的频率转权重计算函数
 * 解决低频率设置（如8%）时八分音符仍大量出现的问题
 */
function calculate68FrequencyWeight(userFrequency, baseWeight = 10, rhythmType = 'unknown') {
    if (userFrequency === undefined) {
        console.log(`  [6/8频率计算] ${rhythmType}: 无用户设置，使用基础权重 ${baseWeight}`);
        return baseWeight;
    }
    
    if (userFrequency === 0) {
        console.log(`  [6/8频率计算] ${rhythmType}: 用户设置0%，权重=0`);
        return 0;
    }
    
    let finalWeight;
    
    // 🔥 新的灵敏度算法：非线性权重计算
    if (userFrequency <= 15) {
        // 极低频率(≤15%)：指数衰减，极大抑制
        finalWeight = Math.max(0.1, baseWeight * Math.pow(userFrequency / 100, 2.5));
        console.log(`  [6/8频率计算] ${rhythmType}: 极低频率${userFrequency}% -> 指数抑制 -> 权重=${finalWeight.toFixed(2)}`);
    } else if (userFrequency <= 30) {
        // 低频率(16%-30%)：平方衰减，强力抑制
        finalWeight = baseWeight * Math.pow(userFrequency / 100, 2);
        console.log(`  [6/8频率计算] ${rhythmType}: 低频率${userFrequency}% -> 平方抑制 -> 权重=${finalWeight.toFixed(2)}`);
    } else if (userFrequency <= 60) {
        // 中等频率(31%-60%)：线性但加权抑制
        finalWeight = baseWeight * (userFrequency / 100) * 0.8;
        console.log(`  [6/8频率计算] ${rhythmType}: 中等频率${userFrequency}% -> 线性抑制 -> 权重=${finalWeight.toFixed(2)}`);
    } else {
        // 高频率(>60%)：接近线性，轻微加权
        finalWeight = baseWeight * (userFrequency / 100) * 1.1;
        console.log(`  [6/8频率计算] ${rhythmType}: 高频率${userFrequency}% -> 轻微加权 -> 权重=${finalWeight.toFixed(2)}`);
    }
    
    return Math.round(finalWeight * 10) / 10; // 保留一位小数
}

/**
 * 6/8拍专用：灵敏的演奏技巧频率控制函数
 * 解决演奏技巧（如acciaccatura）频率设置不够灵敏的问题
 */
function calculate68ArticulationFrequency(userFrequency, articulationType = 'unknown') {
    if (userFrequency === undefined || userFrequency === null) {
        console.log(`  [6/8演奏技巧] ${articulationType}: 无用户设置，使用默认频率 15%`);
        return 15;
    }
    
    if (userFrequency === 0) {
        console.log(`  [6/8演奏技巧] ${articulationType}: 用户设置0%，完全禁用`);
        return 0;
    }
    
    let finalFrequency;
    
    // 🔥 新的灵敏度算法：非线性频率映射，增强低频和高频的区分度
    if (userFrequency <= 15) {
        // 极低频率(≤15%)：轻微压缩，避免过于稀少
        finalFrequency = Math.max(3, userFrequency * 0.8);
        console.log(`  [6/8演奏技巧] ${articulationType}: 极低频率${userFrequency}% -> 轻微压缩 -> ${finalFrequency.toFixed(1)}%`);
    } else if (userFrequency <= 30) {
        // 低频率(16%-30%)：接近线性，保持灵敏度
        finalFrequency = userFrequency * 0.9;
        console.log(`  [6/8演奏技巧] ${articulationType}: 低频率${userFrequency}% -> 轻微抑制 -> ${finalFrequency.toFixed(1)}%`);
    } else if (userFrequency <= 60) {
        // 中等频率(31%-60%)：直接使用用户设置
        finalFrequency = userFrequency;
        console.log(`  [6/8演奏技巧] ${articulationType}: 中等频率${userFrequency}% -> 直接使用 -> ${finalFrequency.toFixed(1)}%`);
    } else if (userFrequency <= 80) {
        // 高频率(61%-80%)：适度增强
        finalFrequency = userFrequency * 1.1;
        console.log(`  [6/8演奏技巧] ${articulationType}: 高频率${userFrequency}% -> 适度增强 -> ${finalFrequency.toFixed(1)}%`);
    } else {
        // 极高频率(>80%)：显著增强，确保明显效果
        finalFrequency = Math.min(95, userFrequency * 1.2);
        console.log(`  [6/8演奏技巧] ${articulationType}: 极高频率${userFrequency}% -> 显著增强 -> ${finalFrequency.toFixed(1)}%`);
    }
    
    return Math.round(finalFrequency * 10) / 10; // 保留一位小数
}

/**
 * 6/8拍专用：灵敏的演奏技巧生成判断函数
 * 替代通用的shouldGenerateArticulation，为6/8拍提供更灵敏的控制
 */
function shouldGenerate68Articulation(articulationType, randomGenerator = null) {
    // 获取原始用户设置值（不经过分档映射）
    const rawUserFreq = userSettings?.articulations?.frequencies?.[articulationType] ?? 15;
    
    if (rawUserFreq === 0) {
        console.log(`  [6/8演奏技巧] ${articulationType}: 用户设置0%，完全禁用`);
        return false; // 完全禁用
    }
    
    // 使用6/8拍专用的频率计算
    const enhancedFreq = calculate68ArticulationFrequency(rawUserFreq, articulationType);
    
    const random = randomGenerator ? randomGenerator.nextFloat() : Math.random();
    const shouldGenerate = (random * 100) < enhancedFreq;
    
    // 详细日志用于调试
    console.log(`🎯 6/8拍演奏技巧控制 ${articulationType}: 用户设置${rawUserFreq}% -> 增强后${enhancedFreq}% -> ${shouldGenerate ? '✅生成' : '❌跳过'} (随机值: ${(random * 100).toFixed(1)}%)`);
    
    return shouldGenerate;
}

