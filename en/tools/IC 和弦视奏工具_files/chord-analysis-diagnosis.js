/**
 * 和弦代号诊断工具
 *
 * 用途：分析给定的音符排列，诊断根音、和弦类型、转位
 * 创建时间: 2025-10-02
 */

/**
 * 音符名称到半音值的映射（C=0）
 */
const NOTE_TO_SEMITONE = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4,
    'F': 5, 'E#': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11, 'B#': 0
};

/**
 * 半音值到音符名称的映射
 */
const SEMITONE_TO_NOTE = {
    0: 'C', 1: 'C#/Db', 2: 'D', 3: 'D#/Eb',
    4: 'E', 5: 'F', 6: 'F#/Gb', 7: 'G',
    8: 'G#/Ab', 9: 'A', 10: 'A#/Bb', 11: 'B'
};

/**
 * 和弦类型的音程模式（半音）
 */
const CHORD_PATTERNS = {
    // 三和弦
    'major': [0, 4, 7],              // 大三和弦
    'minor': [0, 3, 7],              // 小三和弦
    'diminished': [0, 3, 6],         // 减三和弦
    'augmented': [0, 4, 8],          // 增三和弦

    // 七和弦
    'major7': [0, 4, 7, 11],         // 大七和弦
    'minor7': [0, 3, 7, 10],         // 小七和弦
    'dominant7': [0, 4, 7, 10],      // 属七和弦
    'minor7b5': [0, 3, 6, 10],       // 半减七和弦
    'diminished7': [0, 3, 6, 9],     // 减七和弦
    'augmented7': [0, 4, 8, 10],     // 增七和弦
    'minorMaj7': [0, 3, 7, 11],      // 小大七和弦

    // Sus和弦
    'sus2': [0, 2, 7],               // sus2
    'sus4': [0, 5, 7],               // sus4
    '7sus4': [0, 5, 7, 10]           // 7sus4
};

/**
 * 和弦类型的显示名称
 */
const CHORD_TYPE_NAMES = {
    'major': '',
    'minor': 'm',
    'diminished': 'dim',
    'augmented': 'aug',
    'major7': 'maj7',
    'minor7': 'm7',
    'dominant7': '7',
    'minor7b5': 'm7b5',
    'diminished7': 'dim7',
    'augmented7': 'aug7',
    'minorMaj7': 'mMaj7',
    'sus2': 'sus2',
    'sus4': 'sus4',
    '7sus4': '7sus4'
};

/**
 * 将音符名称转换为半音值（0-11）
 */
function noteToSemitone(noteName) {
    const cleanNote = noteName.replace(/\d+/g, '').trim();
    return NOTE_TO_SEMITONE[cleanNote];
}

/**
 * 分析音符排列，识别根音和和弦类型
 * @param {Array} notes - 音符数组，如 ['E', 'A', 'C', 'G']
 * @returns {Object} - 分析结果
 */
function analyzeChord(notes) {
    console.log(`\n🔍 ========== 和弦分析诊断 ==========`);
    console.log(`输入音符: ${notes.join('-')}`);

    // 将音符转换为半音值
    const semitones = notes.map(n => noteToSemitone(n));
    console.log(`半音值: ${semitones.join(', ')}`);

    // 去重并排序（获取音高类）
    const uniqueSemitones = [...new Set(semitones)].sort((a, b) => a - b);
    console.log(`去重后的半音类: ${uniqueSemitones.join(', ')}`);
    console.log(`音符类: ${uniqueSemitones.map(s => SEMITONE_TO_NOTE[s]).join(', ')}`);

    // 尝试所有可能的根音
    const results = [];

    for (let rootSemitone of uniqueSemitones) {
        console.log(`\n🎯 尝试根音: ${SEMITONE_TO_NOTE[rootSemitone]}`);

        // 将所有音符转换为相对于根音的音程
        const intervals = uniqueSemitones.map(s => (s - rootSemitone + 12) % 12).sort((a, b) => a - b);
        console.log(`  相对音程: ${intervals.join(', ')}`);

        // 匹配和弦模式
        for (let [chordType, pattern] of Object.entries(CHORD_PATTERNS)) {
            if (arraysEqual(intervals, pattern)) {
                const rootNote = SEMITONE_TO_NOTE[rootSemitone];
                const chordSymbol = rootNote + CHORD_TYPE_NAMES[chordType];

                console.log(`  ✅ 匹配: ${chordType} → ${chordSymbol}`);

                // 检测转位
                const lowestSemitone = semitones[0];
                const inversion = intervals.indexOf((lowestSemitone - rootSemitone + 12) % 12);
                const inversionNames = ['原位', '第一转位', '第二转位', '第三转位'];
                const inversionName = inversionNames[inversion] || `第${inversion}转位`;

                console.log(`  转位: ${inversionName} (最低音: ${notes[0]})`);

                // 构建完整和弦代号
                let fullSymbol = chordSymbol;
                if (inversion > 0) {
                    fullSymbol += '/' + notes[0];
                }

                results.push({
                    root: rootNote,
                    type: chordType,
                    symbol: chordSymbol,
                    fullSymbol: fullSymbol,
                    inversion: inversion,
                    inversionName: inversionName,
                    bass: notes[0],
                    confidence: 'high'
                });
            }
        }
    }

    console.log(`\n📊 分析结果: 找到${results.length}个匹配`);

    if (results.length === 0) {
        console.warn(`⚠️ 无法识别和弦类型`);
        return null;
    }

    // 选择最佳结果（第一个匹配）
    const best = results[0];
    console.log(`\n✅ 最佳匹配:`);
    console.log(`  根音: ${best.root}`);
    console.log(`  类型: ${best.type}`);
    console.log(`  和弦代号: ${best.symbol}`);
    console.log(`  完整代号: ${best.fullSymbol}`);
    console.log(`  转位: ${best.inversionName}`);
    console.log(`  低音: ${best.bass}`);

    console.log(`\n🔍 如果有多个匹配，其他可能:`);
    results.slice(1).forEach((r, i) => {
        console.log(`  ${i + 2}. ${r.fullSymbol} (${r.inversionName})`);
    });

    return best;
}

/**
 * 辅助函数：比较两个数组是否相等
 */
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

/**
 * 批量测试函数
 */
function testChordAnalysis() {
    console.log('\n🧪 ========== 和弦分析批量测试 ==========\n');

    const testCases = [
        { notes: ['E', 'A', 'C', 'G'], expected: 'Am7/E', description: '用户报告的错误案例' },
        { notes: ['C', 'E', 'G', 'B'], expected: 'Cmaj7', description: 'Cmaj7原位' },
        { notes: ['E', 'G', 'B', 'C'], expected: 'Cmaj7/E', description: 'Cmaj7第一转位' },
        { notes: ['G', 'B', 'C', 'E'], expected: 'Cmaj7/G', description: 'Cmaj7第二转位' },
        { notes: ['B', 'C', 'E', 'G'], expected: 'Cmaj7/B', description: 'Cmaj7第三转位' },
        { notes: ['D', 'F', 'A', 'C'], expected: 'Dm7', description: 'Dm7原位' },
        { notes: ['G', 'C', 'E', 'B'], expected: 'Cmaj7/G', description: 'Drop2从Close原位' },
        { notes: ['C', 'G', 'B', 'E'], expected: 'Cmaj7', description: 'Drop2从Close第二转位' }
    ];

    let passCount = 0;
    let failCount = 0;

    testCases.forEach((testCase, index) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`测试 ${index + 1}/${testCases.length}: ${testCase.description}`);
        console.log(`音符: ${testCase.notes.join('-')}`);
        console.log(`期望: ${testCase.expected}`);
        console.log('='.repeat(60));

        const result = analyzeChord(testCase.notes);

        if (result && result.fullSymbol === testCase.expected) {
            console.log(`\n✅ 测试通过！`);
            passCount++;
        } else {
            console.log(`\n❌ 测试失败！`);
            console.log(`  期望: ${testCase.expected}`);
            console.log(`  实际: ${result ? result.fullSymbol : '无法识别'}`);
            failCount++;
        }
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 测试总结`);
    console.log('='.repeat(60));
    console.log(`✅ 通过: ${passCount}/${testCases.length}`);
    console.log(`❌ 失败: ${failCount}/${testCases.length}`);
    console.log('='.repeat(60) + '\n');
}

/**
 * 诊断当前系统生成的和弦
 */
function diagnoseCurrentChord() {
    console.log('\n🔍 ========== 诊断当前系统和弦 ==========\n');

    // 尝试从DOM获取当前显示的和弦信息
    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) {
        console.error('❌ 找不到score元素');
        return;
    }

    console.log('✅ 找到score元素');
    console.log('📝 请手动提供音符信息进行诊断');
    console.log('');
    console.log('使用方法:');
    console.log('  analyzeChord(["E", "A", "C", "G"])');
    console.log('');
    console.log('或运行批量测试:');
    console.log('  testChordAnalysis()');
}

// 导出到window对象
if (typeof window !== 'undefined') {
    window.analyzeChord = analyzeChord;
    window.testChordAnalysis = testChordAnalysis;
    window.diagnoseCurrentChord = diagnoseCurrentChord;

    console.log('✅ 和弦分析诊断工具已加载');
    console.log('📝 可用函数:');
    console.log('  - analyzeChord(["E", "A", "C", "G"]) - 分析指定音符');
    console.log('  - testChordAnalysis() - 运行批量测试');
    console.log('  - diagnoseCurrentChord() - 诊断当前和弦');
}
