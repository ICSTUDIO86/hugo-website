/**
 * Drop2/Drop3原位保护机制测试函数
 *
 * 用途：验证Drop2和Drop3在未勾选转位的情况下，根音保持在最低音
 *
 * 使用方法：
 * 1. 在浏览器中打开 和弦视奏生成器.html
 * 2. 打开浏览器控制台 (F12)
 * 3. 在控制台中运行: testDrop2RootPositionProtection()
 * 4. 在控制台中运行: testDrop3RootPositionProtection()
 *
 * 2025-10-02 创建 - 验证原位保护修复
 */

/**
 * 测试Drop2原位保护机制
 *
 * 测试场景：
 * - 用户未勾选转位选项
 * - 生成Drop2和弦
 * - 验证根音是否保持在最低音位置
 */
function testDrop2RootPositionProtection() {
    console.log('\n🧪 ========== Drop2原位保护机制测试 ==========\n');

    // 检查必要的对象是否存在
    if (typeof VoicingEngine === 'undefined') {
        console.error('❌ VoicingEngine未定义，请在和弦视奏生成器.html页面中运行此测试');
        return;
    }

    if (typeof HarmonyTheory === 'undefined') {
        console.error('❌ HarmonyTheory未定义，请在和弦视奏生成器.html页面中运行此测试');
        return;
    }

    console.log('✅ 环境检查通过\n');

    // 测试配置：未勾选转位
    const testSettings = {
        enableInversions: false,  // 🎯 关键：未勾选转位
        range: { min: 52, max: 76 },  // E3 to E5
        voicingTypes: ['drop2']
    };

    console.log('🎯 测试配置：');
    console.log('  - enableInversions: false (未勾选转位)');
    console.log('  - 音域范围: E3 (52) to E5 (76)');
    console.log('  - Voicing类型: Drop2\n');

    // 创建VoicingEngine实例
    const harmonyTheory = new HarmonyTheory();
    const voicingEngine = new VoicingEngine(harmonyTheory, testSettings);

    // 测试用例
    const testChords = [
        { symbol: 'Cmaj7', root: 'C', expectedRootNote: 'C' },
        { symbol: 'Fmaj7', root: 'F', expectedRootNote: 'F' },
        { symbol: 'Dm7', root: 'D', expectedRootNote: 'D' },
        { symbol: 'G7', root: 'G', expectedRootNote: 'G' },
        { symbol: 'Am7', root: 'A', expectedRootNote: 'A' }
    ];

    let passCount = 0;
    let failCount = 0;

    testChords.forEach((testChord, index) => {
        console.log(`\n📋 测试 ${index + 1}/${testChords.length}: ${testChord.symbol}`);
        console.log('─'.repeat(50));

        try {
            // 生成Drop2 voicing
            const result = voicingEngine.generateVoicings(
                testChord.symbol,
                testChord.root,
                { targetInversion: 0 }  // 请求原位
            );

            if (!result || !result.drop2) {
                console.error(`❌ 无法生成Drop2 voicing`);
                failCount++;
                return;
            }

            const drop2 = result.drop2;
            console.log(`  Drop2 MIDI: [${drop2.midiNotes.join(', ')}]`);
            console.log(`  Drop2 音符: [${drop2.notes.join(', ')}]`);

            // 找到最低音
            const lowestMidi = Math.min(...drop2.midiNotes);
            const lowestNoteIndex = drop2.midiNotes.indexOf(lowestMidi);
            const lowestNote = drop2.notes[lowestNoteIndex];
            const lowestNoteName = lowestNote.replace(/\d+/g, '');  // 移除八度数字

            console.log(`  最低音: ${lowestNote} (MIDI ${lowestMidi})`);
            console.log(`  期望根音: ${testChord.expectedRootNote}`);

            // 验证最低音是否为根音
            if (lowestNoteName === testChord.expectedRootNote) {
                console.log(`  ✅ 通过：最低音${lowestNoteName}是根音`);
                passCount++;
            } else {
                console.error(`  ❌ 失败：最低音${lowestNoteName}不是根音${testChord.expectedRootNote}`);
                console.error(`  ⚠️ 原位保护机制未生效！`);
                failCount++;
            }

        } catch (error) {
            console.error(`  ❌ 测试异常: ${error.message}`);
            failCount++;
        }
    });

    // 测试总结
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试总结');
    console.log('='.repeat(50));
    console.log(`✅ 通过: ${passCount}/${testChords.length}`);
    console.log(`❌ 失败: ${failCount}/${testChords.length}`);

    if (failCount === 0) {
        console.log('\n🎉 所有测试通过！Drop2原位保护机制工作正常。');
    } else {
        console.error('\n⚠️ 存在失败的测试，请检查voicing-engine.js中的原位保护逻辑。');
    }

    console.log('\n' + '='.repeat(50) + '\n');
}

/**
 * 测试Drop3原位保护机制
 *
 * 测试场景：
 * - 用户未勾选转位选项
 * - 生成Drop3和弦
 * - 验证根音是否保持在最低音位置
 */
function testDrop3RootPositionProtection() {
    console.log('\n🧪 ========== Drop3原位保护机制测试 ==========\n');

    // 检查必要的对象是否存在
    if (typeof VoicingEngine === 'undefined') {
        console.error('❌ VoicingEngine未定义，请在和弦视奏生成器.html页面中运行此测试');
        return;
    }

    if (typeof HarmonyTheory === 'undefined') {
        console.error('❌ HarmonyTheory未定义，请在和弦视奏生成器.html页面中运行此测试');
        return;
    }

    console.log('✅ 环境检查通过\n');

    // 测试配置：未勾选转位
    const testSettings = {
        enableInversions: false,  // 🎯 关键：未勾选转位
        range: { min: 52, max: 76 },  // E3 to E5
        voicingTypes: ['drop3']
    };

    console.log('🎯 测试配置：');
    console.log('  - enableInversions: false (未勾选转位)');
    console.log('  - 音域范围: E3 (52) to E5 (76)');
    console.log('  - Voicing类型: Drop3\n');

    // 创建VoicingEngine实例
    const harmonyTheory = new HarmonyTheory();
    const voicingEngine = new VoicingEngine(harmonyTheory, testSettings);

    // 测试用例
    const testChords = [
        { symbol: 'Cmaj7', root: 'C', expectedRootNote: 'C' },
        { symbol: 'Fmaj7', root: 'F', expectedRootNote: 'F' },
        { symbol: 'Dm7', root: 'D', expectedRootNote: 'D' },
        { symbol: 'G7', root: 'G', expectedRootNote: 'G' },
        { symbol: 'Am7', root: 'A', expectedRootNote: 'A' }
    ];

    let passCount = 0;
    let failCount = 0;

    testChords.forEach((testChord, index) => {
        console.log(`\n📋 测试 ${index + 1}/${testChords.length}: ${testChord.symbol}`);
        console.log('─'.repeat(50));

        try {
            // 生成Drop3 voicing
            const result = voicingEngine.generateVoicings(
                testChord.symbol,
                testChord.root,
                { targetInversion: 0 }  // 请求原位
            );

            if (!result || !result.drop3) {
                console.error(`❌ 无法生成Drop3 voicing`);
                failCount++;
                return;
            }

            const drop3 = result.drop3;
            console.log(`  Drop3 MIDI: [${drop3.midiNotes.join(', ')}]`);
            console.log(`  Drop3 音符: [${drop3.notes.join(', ')}]`);

            // 找到最低音
            const lowestMidi = Math.min(...drop3.midiNotes);
            const lowestNoteIndex = drop3.midiNotes.indexOf(lowestMidi);
            const lowestNote = drop3.notes[lowestNoteIndex];
            const lowestNoteName = lowestNote.replace(/\d+/g, '');  // 移除八度数字

            console.log(`  最低音: ${lowestNote} (MIDI ${lowestMidi})`);
            console.log(`  期望根音: ${testChord.expectedRootNote}`);

            // 验证最低音是否为根音
            if (lowestNoteName === testChord.expectedRootNote) {
                console.log(`  ✅ 通过：最低音${lowestNoteName}是根音`);
                passCount++;
            } else {
                console.error(`  ❌ 失败：最低音${lowestNoteName}不是根音${testChord.expectedRootNote}`);
                console.error(`  ⚠️ 原位保护机制未生效！`);
                failCount++;
            }

        } catch (error) {
            console.error(`  ❌ 测试异常: ${error.message}`);
            failCount++;
        }
    });

    // 测试总结
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试总结');
    console.log('='.repeat(50));
    console.log(`✅ 通过: ${passCount}/${testChords.length}`);
    console.log(`❌ 失败: ${failCount}/${testChords.length}`);

    if (failCount === 0) {
        console.log('\n🎉 所有测试通过！Drop3原位保护机制工作正常。');
    } else {
        console.error('\n⚠️ 存在失败的测试，请检查voicing-engine.js中的原位保护逻辑。');
    }

    console.log('\n' + '='.repeat(50) + '\n');
}

/**
 * 综合测试：对比有无转位的情况
 *
 * 验证：
 * 1. enableInversions=false时，根音在最低音
 * 2. enableInversions=true时，允许转位（最低音可能不是根音）
 */
function testInversionToggleEffect() {
    console.log('\n🧪 ========== 转位开关对比测试 ==========\n');

    if (typeof VoicingEngine === 'undefined' || typeof HarmonyTheory === 'undefined') {
        console.error('❌ 环境检查失败，请在和弦视奏生成器.html页面中运行此测试');
        return;
    }

    const harmonyTheory = new HarmonyTheory();
    const testChord = { symbol: 'Cmaj7', root: 'C' };

    console.log(`📋 测试和弦: ${testChord.symbol}\n`);

    // 测试1: 未勾选转位
    console.log('─'.repeat(50));
    console.log('🎯 测试1: enableInversions = false (未勾选转位)');
    console.log('─'.repeat(50));

    const settings1 = {
        enableInversions: false,
        range: { min: 52, max: 76 },
        voicingTypes: ['drop2']
    };

    const engine1 = new VoicingEngine(harmonyTheory, settings1);
    const result1 = engine1.generateVoicings(testChord.symbol, testChord.root, { targetInversion: 0 });

    if (result1 && result1.drop2) {
        const lowestMidi1 = Math.min(...result1.drop2.midiNotes);
        const lowestIndex1 = result1.drop2.midiNotes.indexOf(lowestMidi1);
        const lowestNote1 = result1.drop2.notes[lowestIndex1].replace(/\d+/g, '');

        console.log(`  Drop2 MIDI: [${result1.drop2.midiNotes.join(', ')}]`);
        console.log(`  Drop2 音符: [${result1.drop2.notes.join(', ')}]`);
        console.log(`  最低音: ${lowestNote1}`);

        if (lowestNote1 === testChord.root) {
            console.log(`  ✅ 验证通过：最低音${lowestNote1}是根音`);
        } else {
            console.error(`  ❌ 验证失败：最低音${lowestNote1}不是根音${testChord.root}`);
        }
    }

    // 测试2: 勾选转位
    console.log('\n' + '─'.repeat(50));
    console.log('🎯 测试2: enableInversions = true (勾选转位)');
    console.log('─'.repeat(50));

    const settings2 = {
        enableInversions: true,
        range: { min: 52, max: 76 },
        voicingTypes: ['drop2']
    };

    const engine2 = new VoicingEngine(harmonyTheory, settings2);
    const result2 = engine2.generateVoicings(testChord.symbol, testChord.root, { targetInversion: 1 });  // 请求一转

    if (result2 && result2.drop2) {
        const lowestMidi2 = Math.min(...result2.drop2.midiNotes);
        const lowestIndex2 = result2.drop2.midiNotes.indexOf(lowestMidi2);
        const lowestNote2 = result2.drop2.notes[lowestIndex2].replace(/\d+/g, '');

        console.log(`  Drop2 MIDI: [${result2.drop2.midiNotes.join(', ')}]`);
        console.log(`  Drop2 音符: [${result2.drop2.notes.join(', ')}]`);
        console.log(`  最低音: ${lowestNote2}`);

        if (lowestNote2 !== testChord.root) {
            console.log(`  ✅ 验证通过：最低音${lowestNote2}不是根音（允许转位）`);
        } else {
            console.log(`  ℹ️ 最低音${lowestNote2}是根音（这也是合法的）`);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 对比测试完成');
    console.log('='.repeat(50) + '\n');
}

// 全部测试运行函数
function runAllDropTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 Drop2/Drop3原位保护 - 完整测试套件');
    console.log('='.repeat(60));

    testDrop2RootPositionProtection();
    testDrop3RootPositionProtection();
    testInversionToggleEffect();

    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试执行完毕');
    console.log('='.repeat(60) + '\n');
}

// 导出测试函数（在浏览器控制台中可直接调用）
if (typeof window !== 'undefined') {
    window.testDrop2RootPositionProtection = testDrop2RootPositionProtection;
    window.testDrop3RootPositionProtection = testDrop3RootPositionProtection;
    window.testInversionToggleEffect = testInversionToggleEffect;
    window.runAllDropTests = runAllDropTests;

    console.log('✅ Drop2/Drop3测试函数已加载');
    console.log('📝 可用函数:');
    console.log('  - testDrop2RootPositionProtection()');
    console.log('  - testDrop3RootPositionProtection()');
    console.log('  - testInversionToggleEffect()');
    console.log('  - runAllDropTests() - 运行全部测试');
}
