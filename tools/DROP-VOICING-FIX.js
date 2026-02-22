/**
 * Drop2/Drop3 Voicing 正确实现
 *
 * 基于标准定义：
 * - Drop2: 从Close特定转位开始，下移第二高音
 * - Drop3: 从Close特定转位开始，下移第三高音
 *
 * 创建时间: 2025-10-02
 */

/**
 * 生成Close voicing的特定转位
 * @param {Array} notes - 原位音符数组，如 ['C', 'E', 'G', 'B']
 * @param {Array} midiNotes - 原位MIDI数组
 * @param {number} targetInversion - 目标转位 (0=原位, 1=第一转位, 2=第二转位, 3=第三转位)
 * @returns {Object} - 转位后的voicing
 */
function generateCloseInversion(notes, midiNotes, targetInversion) {
    const numNotes = notes.length;

    if (targetInversion === 0 || targetInversion === undefined) {
        // 原位，直接返回
        return {
            notes: [...notes],
            midiNotes: [...midiNotes]
        };
    }

    // 转位：将最低的n个音提升八度
    const rotatedNotes = [...notes];
    const rotatedMidi = [...midiNotes];

    for (let i = 0; i < targetInversion; i++) {
        // 提升最低音八度
        rotatedMidi[i] += 12;
    }

    // 重新排序（按MIDI值从低到高）
    const pairs = rotatedNotes.map((note, i) => ({
        note,
        midi: rotatedMidi[i]
    }));
    pairs.sort((a, b) => a.midi - b.midi);

    return {
        notes: pairs.map(p => p.note),
        midiNotes: pairs.map(p => p.midi)
    };
}

/**
 * 正确的Drop2生成函数
 * @param {Object} closeRootPosition - Close原位voicing
 * @param {number} targetInversion - 目标转位 (0-3)
 * @returns {Object} - Drop2 voicing
 */
function generateDrop2Correct(closeRootPosition, targetInversion = 0) {
    console.log(`\n🎯 === 正确的Drop2生成 ===`);
    console.log(`  目标转位: ${targetInversion}`);
    console.log(`  Close原位: ${closeRootPosition.notes.join('-')}`);

    // Drop2转位映射：要得到某个转位，需要从特定的Close转位开始
    const sourceInversionMap = {
        0: 2,  // 要Drop2原位 → 从Close第二转位开始
        1: 3,  // 要Drop2第一转位 → 从Close第三转位开始
        2: 0,  // 要Drop2第二转位 → 从Close原位开始
        3: 1   // 要Drop2第三转位 → 从Close第一转位开始
    };

    const sourceInversion = sourceInversionMap[targetInversion];
    console.log(`  映射：要Drop2第${targetInversion}转位 → 从Close第${sourceInversion}转位开始`);

    // 生成源Close转位
    const sourceClose = generateCloseInversion(
        closeRootPosition.notes,
        closeRootPosition.midiNotes,
        sourceInversion
    );

    console.log(`  源Close第${sourceInversion}转位: ${sourceClose.notes.join('-')}`);
    console.log(`  源Close MIDI: ${sourceClose.midiNotes.join(', ')}`);

    // 按MIDI值从高到低排序
    const sortedIndices = sourceClose.midiNotes
        .map((midi, index) => ({ midi, index, note: sourceClose.notes[index] }))
        .sort((a, b) => b.midi - a.midi);

    // 第二高音
    const secondHighest = sortedIndices[1];
    console.log(`  第二高音: ${secondHighest.note} (MIDI ${secondHighest.midi}, 索引${secondHighest.index})`);

    // 执行Drop2变换：将第二高音降低八度
    const drop2Notes = [...sourceClose.notes];
    const drop2Midi = [...sourceClose.midiNotes];
    drop2Midi[secondHighest.index] -= 12;

    console.log(`  Drop2变换: ${secondHighest.note} MIDI ${secondHighest.midi} → ${drop2Midi[secondHighest.index]}`);

    // 重新排序结果（按MIDI值从低到高）
    const resultPairs = drop2Notes.map((note, i) => ({
        note,
        midi: drop2Midi[i]
    }));
    resultPairs.sort((a, b) => a.midi - b.midi);

    const result = {
        type: 'drop2',
        notes: resultPairs.map(p => p.note),
        midiNotes: resultPairs.map(p => p.midi),
        inversion: targetInversion
    };

    console.log(`  ✅ Drop2结果: ${result.notes.join('-')}`);
    console.log(`  ✅ MIDI: ${result.midiNotes.join(', ')}`);
    console.log(`  ✅ 低音: ${result.notes[0]} (转位=${targetInversion})`);

    return result;
}

/**
 * 正确的Drop3生成函数
 * @param {Object} closeRootPosition - Close原位voicing
 * @param {number} targetInversion - 目标转位 (0-3)
 * @returns {Object} - Drop3 voicing
 */
function generateDrop3Correct(closeRootPosition, targetInversion = 0) {
    console.log(`\n🎯 === 正确的Drop3生成 ===`);
    console.log(`  目标转位: ${targetInversion}`);
    console.log(`  Close原位: ${closeRootPosition.notes.join('-')}`);

    // Drop3转位映射
    const sourceInversionMap = {
        0: 3,  // 要Drop3原位 → 从Close第三转位开始
        1: 0,  // 要Drop3第一转位 → 从Close原位开始
        2: 1,  // 要Drop3第二转位 → 从Close第一转位开始
        3: 2   // 要Drop3第三转位 → 从Close第二转位开始
    };

    const sourceInversion = sourceInversionMap[targetInversion];
    console.log(`  映射：要Drop3第${targetInversion}转位 → 从Close第${sourceInversion}转位开始`);

    // 生成源Close转位
    const sourceClose = generateCloseInversion(
        closeRootPosition.notes,
        closeRootPosition.midiNotes,
        sourceInversion
    );

    console.log(`  源Close第${sourceInversion}转位: ${sourceClose.notes.join('-')}`);
    console.log(`  源Close MIDI: ${sourceClose.midiNotes.join(', ')}`);

    // 按MIDI值从高到低排序
    const sortedIndices = sourceClose.midiNotes
        .map((midi, index) => ({ midi, index, note: sourceClose.notes[index] }))
        .sort((a, b) => b.midi - a.midi);

    // 第三高音
    const thirdHighest = sortedIndices[2];
    console.log(`  第三高音: ${thirdHighest.note} (MIDI ${thirdHighest.midi}, 索引${thirdHighest.index})`);

    // 执行Drop3变换：将第三高音降低八度
    const drop3Notes = [...sourceClose.notes];
    const drop3Midi = [...sourceClose.midiNotes];
    drop3Midi[thirdHighest.index] -= 12;

    console.log(`  Drop3变换: ${thirdHighest.note} MIDI ${thirdHighest.midi} → ${drop3Midi[thirdHighest.index]}`);

    // 重新排序结果（按MIDI值从低到高）
    const resultPairs = drop3Notes.map((note, i) => ({
        note,
        midi: drop3Midi[i]
    }));
    resultPairs.sort((a, b) => a.midi - b.midi);

    const result = {
        type: 'drop3',
        notes: resultPairs.map(p => p.note),
        midiNotes: resultPairs.map(p => p.midi),
        inversion: targetInversion
    };

    console.log(`  ✅ Drop3结果: ${result.notes.join('-')}`);
    console.log(`  ✅ MIDI: ${result.midiNotes.join(', ')}`);
    console.log(`  ✅ 低音: ${result.notes[0]} (转位=${targetInversion})`);

    return result;
}

/**
 * 测试函数：验证所有转位
 */
function testAllDropVoicings() {
    console.log('\n🧪 ========== Drop2/Drop3 完整测试 ==========\n');

    // 测试数据：Cmaj7 Close原位
    const closeRoot = {
        notes: ['C', 'E', 'G', 'B'],
        midiNotes: [60, 64, 67, 71]  // C4, E4, G4, B4
    };

    console.log('📋 测试和弦: Cmaj7');
    console.log(`Close原位: ${closeRoot.notes.join('-')} (MIDI: ${closeRoot.midiNotes.join(', ')})\n`);

    // 测试Drop2所有转位
    console.log('═'.repeat(50));
    console.log('Drop2 测试');
    console.log('═'.repeat(50));

    for (let inv = 0; inv <= 3; inv++) {
        const drop2 = generateDrop2Correct(closeRoot, inv);

        // 验证低音
        const lowestNote = drop2.notes[0];
        const expectedBass = ['C', 'E', 'G', 'B'][inv];
        const match = lowestNote === expectedBass ? '✅' : '❌';

        console.log(`\n【Drop2 第${inv}转位】`);
        console.log(`  音符: ${drop2.notes.join('-')}`);
        console.log(`  MIDI: ${drop2.midiNotes.join(', ')}`);
        console.log(`  低音: ${lowestNote} ${match} (期望: ${expectedBass})`);
    }

    // 测试Drop3所有转位
    console.log('\n' + '═'.repeat(50));
    console.log('Drop3 测试');
    console.log('═'.repeat(50));

    for (let inv = 0; inv <= 3; inv++) {
        const drop3 = generateDrop3Correct(closeRoot, inv);

        // 验证低音
        const lowestNote = drop3.notes[0];
        const expectedBass = ['C', 'E', 'G', 'B'][inv];
        const match = lowestNote === expectedBass ? '✅' : '❌';

        console.log(`\n【Drop3 第${inv}转位】`);
        console.log(`  音符: ${drop3.notes.join('-')}`);
        console.log(`  MIDI: ${drop3.midiNotes.join(', ')}`);
        console.log(`  低音: ${lowestNote} ${match} (期望: ${expectedBass})`);
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ 测试完成');
    console.log('═'.repeat(50) + '\n');
}

// 导出函数（如果在浏览器环境中）
if (typeof window !== 'undefined') {
    window.generateDrop2Correct = generateDrop2Correct;
    window.generateDrop3Correct = generateDrop3Correct;
    window.testAllDropVoicings = testAllDropVoicings;

    console.log('✅ Drop Voicing 修复函数已加载');
    console.log('📝 可用函数:');
    console.log('  - generateDrop2Correct(closeRoot, targetInversion)');
    console.log('  - generateDrop3Correct(closeRoot, targetInversion)');
    console.log('  - testAllDropVoicings() - 运行完整测试');
}

// 如果在Node.js环境中
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateDrop2Correct,
        generateDrop3Correct,
        generateCloseInversion,
        testAllDropVoicings
    };
}
