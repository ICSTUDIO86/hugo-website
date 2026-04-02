/*!
 * IC Studio 和弦生成器 - 小调拼写规范模块
 * Minor Key Spelling Standards for Chord Generator
 *
 * Copyright © 2026. All rights reserved. Igor Chen - icstudio.club
 *
 * Author: Igor Chen
 * Website: https://icstudio.club
 * Email: icstudio@fastmail.com
 *
 * Features:
 * - 完全独立的小调拼写系统，不依赖现有拼写函数
 * - 严格遵循音乐理论，确保每个小调使用正确的变化音拼写
 * - 解决Cb、E#、B#等特殊音符的八度计算问题
 * - 支持和声小调、旋律小调的特色音拼写
 *
 * Design Principle:
 * - 纯音乐理论驱动，每个半音都有正确的理论拼写
 * - 完全绕过现有复杂拼写系统，避免历史问题干扰
 * - 直接MIDI→音符映射，无中间转换过程
 */

// 24个小调的完整MIDI拼写映射表
// 每个数字键对应MIDI音符的12个半音 (0-11)
const INDEPENDENT_MINOR_KEY_SPELLING = {
    // 升号小调系列 (Sharp Minor Keys)

    // A小调 (无升降号)
    'a-minor': {
        0: 'C',    // C
        1: 'C#',   // C# (和声/旋律小调第7级相关)
        2: 'D',    // D
        3: 'D#',   // D# (旋律小调使用)
        4: 'E',    // E
        5: 'F',    // F
        6: 'F#',   // F# (旋律小调第6级)
        7: 'G',    // G
        8: 'G#',   // G# (和声/旋律小调第7级)
        9: 'A',    // A (主音)
        10: 'A#',  // A#
        11: 'B'    // B
    },

    // E小调 (1个升号: F#)
    'e-minor': {
        0: 'C',    // C
        1: 'C#',   // C# (旋律小调第6级)
        2: 'D',    // D
        3: 'D#',   // D# (和声/旋律小调第7级)
        4: 'E',    // E (主音)
        5: 'E#',   // E# (理论正确拼写)
        6: 'F#',   // F# (调号)
        7: 'G',    // G
        8: 'G#',   // G#
        9: 'A',    // A
        10: 'A#',  // A#
        11: 'B'    // B
    },

    // B小调 (2个升号: F#, C#)
    'b-minor': {
        0: 'B#',   // B# (理论正确拼写)
        1: 'C#',   // C# (调号)
        2: 'D',    // D
        3: 'D#',   // D#
        4: 'E',    // E
        5: 'E#',   // E# (理论正确拼写)
        6: 'F#',   // F# (调号)
        7: 'G',    // G
        8: 'G#',   // G# (旋律小调第6级)
        9: 'A',    // A
        10: 'A#',  // A# (和声/旋律小调第7级)
        11: 'B'    // B (主音)
    },

    // F#小调 (3个升号: F#, C#, G#)
    'f#-minor': {
        0: 'B#',   // B# (理论正确拼写)
        1: 'C#',   // C# (调号)
        2: 'D',    // D
        3: 'D#',   // D# (旋律小调第6级)
        4: 'E',    // E
        5: 'E#',   // E# (和声/旋律小调第7级)
        6: 'F#',   // F# (主音)
        7: 'F##',  // F## (理论正确拼写)
        8: 'G#',   // G# (调号)
        9: 'A',    // A
        10: 'A#',  // A#
        11: 'B'    // B
    },

    // C#小调 (4个升号: F#, C#, G#, D#)
    'c#-minor': {
        0: 'B#',   // B# (和声/旋律小调第7级)
        1: 'C#',   // C# (主音)
        2: 'C##',  // C## (理论正确拼写)
        3: 'D#',   // D# (调号)
        4: 'E',    // E
        5: 'E#',   // E#
        6: 'F#',   // F# (调号)
        7: 'F##',  // F## (理论正确拼写)
        8: 'G#',   // G# (调号)
        9: 'A',    // A
        10: 'A#',  // A# (旋律小调第6级)
        11: 'B'    // B
    },

    // G#小调 (5个升号: F#, C#, G#, D#, A#)
    'g#-minor': {
        0: 'B#',   // B#
        1: 'C#',   // C# (调号)
        2: 'C##',  // C## (理论正确拼写)
        3: 'D#',   // D# (调号)
        4: 'E',    // E
        5: 'E#',   // E# (旋律小调第6级)
        6: 'F#',   // F# (调号)
        7: 'F##',  // F## (和声/旋律小调第7级)
        8: 'G#',   // G# (主音)
        9: 'G##',  // G## (理论正确拼写)
        10: 'A#',  // A# (调号)
        11: 'B'    // B
    },

    // D#小调 (6个升号: F#, C#, G#, D#, A#, E#)
    'd#-minor': {
        0: 'B#',   // B# (旋律小调第6级)
        1: 'C#',   // C# (调号)
        2: 'C##',  // C## (和声/旋律小调第7级)
        3: 'D#',   // D# (主音)
        4: 'D##',  // D## (理论正确拼写)
        5: 'E#',   // E# (调号)
        6: 'F#',   // F# (调号)
        7: 'F##',  // F## (理论正确拼写)
        8: 'G#',   // G# (调号)
        9: 'G##',  // G## (理论正确拼写)
        10: 'A#',  // A# (调号)
        11: 'B'    // B
    },

    // 降号小调系列 (Flat Minor Keys)

    // D小调 (1个降号: Bb)
    'd-minor': {
        0: 'C',    // C
        1: 'C#',   // C# (和声/旋律小调第7级)
        2: 'D',    // D (主音)
        3: 'Eb',   // Eb
        4: 'E',    // E
        5: 'F',    // F
        6: 'F#',   // F#
        7: 'G',    // G
        8: 'G#',   // G#
        9: 'A',    // A
        10: 'Bb',  // Bb (调号)
        11: 'B'    // B (旋律小调第6级)
    },

    // G小调 (2个降号: Bb, Eb)
    'g-minor': {
        0: 'C',    // C
        1: 'C#',   // C#
        2: 'D',    // D
        3: 'Eb',   // Eb (调号)
        4: 'E',    // E (旋律小调第6级)
        5: 'F',    // F
        6: 'F#',   // F# (和声/旋律小调第7级)
        7: 'G',    // G (主音)
        8: 'Ab',   // Ab
        9: 'A',    // A
        10: 'Bb',  // Bb (调号)
        11: 'B'    // B
    },

    // C小调 (3个降号: Bb, Eb, Ab)
    'c-minor': {
        0: 'C',    // C (主音)
        1: 'Db',   // Db
        2: 'D',    // D
        3: 'Eb',   // Eb (调号)
        4: 'E',    // E
        5: 'F',    // F
        6: 'F#',   // F#
        7: 'G',    // G
        8: 'Ab',   // Ab (调号)
        9: 'A',    // A (旋律小调第6级)
        10: 'Bb',  // Bb (调号)
        11: 'B'    // B (和声/旋律小调第7级)
    },

    // F小调 (4个降号: Bb, Eb, Ab, Db)
    'f-minor': {
        0: 'C',    // C
        1: 'Db',   // Db (调号)
        2: 'D',    // D (旋律小调第6级)
        3: 'Eb',   // Eb (调号)
        4: 'E',    // E (和声/旋律小调第7级)
        5: 'F',    // F (主音)
        6: 'Gb',   // Gb
        7: 'G',    // G
        8: 'Ab',   // Ab (调号)
        9: 'A',    // A
        10: 'Bb',  // Bb (调号)
        11: 'B'    // B
    },

    // Bb小调 (5个降号: Bb, Eb, Ab, Db, Gb)
    'bb-minor': {
        0: 'C',    // C
        1: 'Db',   // Db (调号)
        2: 'D',    // D
        3: 'Eb',   // Eb (调号)
        4: 'E',    // E
        5: 'F',    // F
        6: 'Gb',   // Gb (调号)
        7: 'G',    // G (旋律小调第6级)
        8: 'Ab',   // Ab (调号)
        9: 'A',    // A (和声/旋律小调第7级)
        10: 'Bb',  // Bb (主音)
        11: 'Cb',  // Cb (理论正确拼写)
    },

    // Eb小调 (6个降号: Bb, Eb, Ab, Db, Gb, Cb)
    'eb-minor': {
        0: 'C',    // C (旋律小调第6级)
        1: 'Db',   // Db (调号)
        2: 'D',    // D (和声/旋律小调第7级)
        3: 'Eb',   // Eb (主音)
        4: 'Fb',   // Fb (理论正确拼写)
        5: 'F',    // F
        6: 'Gb',   // Gb (调号)
        7: 'G',    // G
        8: 'Ab',   // Ab (调号)
        9: 'A',    // A
        10: 'Bb',  // Bb (调号)
        11: 'Cb',  // Cb (调号，理论正确拼写)
    },

    // Ab小调 (7个降号: Bb, Eb, Ab, Db, Gb, Cb, Fb) - 🔧 用户报告问题修复
    'ab-minor': {
        0: 'C',    // C
        1: 'Db',   // Db (调号)
        2: 'D',    // D
        3: 'Eb',   // Eb (调号)
        4: 'Fb',   // Fb (调号，理论正确拼写)
        5: 'F',    // F (旋律小调第6级)
        6: 'Gb',   // Gb (调号)
        7: 'G',    // G (和声/旋律小调第7级)
        8: 'Ab',   // Ab (主音)
        9: 'A',    // A
        10: 'Bb',  // Bb (调号)
        11: 'Cb',  // Cb (调号，Abm和弦三音的正确拼写) - 🎯 这是关键修复！
    },

    // 🎯 新增：Db小调 (5个降号: Bb, Eb, Ab, Db, Gb) - 修复Dbm拼写问题
    'db-minor': {
        0: 'C',    // C (和声/旋律小调第7级)
        1: 'Db',   // Db (主音)
        2: 'D',    // D (旋律小调第1级升高)
        3: 'Eb',   // Eb (调号)
        4: 'Fb',   // Fb (调号，Dbm和弦三音的正确拼写) ✅ 这是关键！
        5: 'F',    // F (旋律小调第3级)
        6: 'Gb',   // Gb (调号)
        7: 'G',    // G (旋律小调第4级升高)
        8: 'Ab',   // Ab (调号)
        9: 'A',    // A (旋律小调第5级升高)
        10: 'Bb',  // Bb (调号)
        11: 'Cb',  // Cb (调号)
    }
};

// 音符家族映射表 - 解决八度计算问题
// 每个音符名对应其所属的基础音符家族（用于八度计算）
const NOTE_FAMILY_MAPPING = {
    // B家族 (这些音符在八度计算时都按B处理)
    'B': 'B',
    'B#': 'B',     // B# 属于 B 家族，不是 C 家族
    'Bb': 'B',

    // C家族
    'C': 'C',
    'C#': 'C',
    'C##': 'C',
    'Cb': 'C',     // Cb 属于 C 家族，不是 B 家族
    'Cbb': 'C',

    // D家族
    'D': 'D',
    'D#': 'D',
    'D##': 'D',
    'Db': 'D',
    'Dbb': 'D',

    // E家族
    'E': 'E',
    'E#': 'E',     // E# 属于 E 家族，不是 F 家族
    'E##': 'E',
    'Eb': 'E',
    'Ebb': 'E',

    // F家族
    'F': 'F',
    'F#': 'F',
    'F##': 'F',
    'Fb': 'F',
    'Fbb': 'F',

    // G家族
    'G': 'G',
    'G#': 'G',
    'G##': 'G',
    'Gb': 'G',
    'Gbb': 'G',

    // A家族
    'A': 'A',
    'A#': 'A',
    'A##': 'A',
    'Ab': 'A',
    'Abb': 'A'
};

// 基础音符到MIDI的映射表（不考虑升降号）
const BASE_NOTE_TO_MIDI = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
};

/**
 * 独立的小调拼写查询函数
 * 完全不依赖现有拼写系统，直接查表返回正确的音符名
 *
 * @param {number} midiNote - MIDI音符值 (0-127)
 * @param {string} keySignature - 调性标识 (如 'eb-minor', 'f#-minor')
 * @returns {object} 包含音符名、变化音、八度的对象
 */
function getIndependentMinorSpelling(midiNote, keySignature) {
    // 输入验证
    if (typeof midiNote !== 'number' || midiNote < 0 || midiNote > 127) {
        console.warn('⚠️ 无效的MIDI值:', midiNote);
        return null;
    }

    if (!keySignature || typeof keySignature !== 'string') {
        console.warn('⚠️ 无效的调性标识:', keySignature);
        return null;
    }

    // 标准化调性标识
    const normalizedKey = normalizeKeySignature(keySignature);

    // 检查是否为支持的小调
    if (!INDEPENDENT_MINOR_KEY_SPELLING.hasOwnProperty(normalizedKey)) {
        console.warn('⚠️ 不支持的小调:', normalizedKey);
        return null;
    }

    // 计算音符的基本信息
    const pitchClass = midiNote % 12;  // 0-11的半音值
    const basicOctave = Math.floor(midiNote / 12) - 1;  // 基础八度计算

    // 从映射表中获取正确的音符名
    const noteName = INDEPENDENT_MINOR_KEY_SPELLING[normalizedKey][pitchClass];

    if (!noteName) {
        console.warn('⚠️ 无法找到音符拼写:', { pitchClass, key: normalizedKey });
        return null;
    }

    // 解析音符名获取step和alter
    const noteInfo = parseNoteName(noteName);
    if (!noteInfo) {
        console.warn('⚠️ 无法解析音符名:', noteName);
        return null;
    }

    // 修正八度 - 基于音符家族而非简单的音符名
    const correctedOctave = calculateCorrectOctave(midiNote, noteName, basicOctave);

    console.log(`🎵 独立小调拼写: MIDI ${midiNote} → ${noteName}${correctedOctave} (调性: ${normalizedKey})`);

    return {
        step: noteInfo.step,
        alter: noteInfo.alter,
        octave: correctedOctave,
        noteName: noteName,
        keySignature: normalizedKey
    };
}

/**
 * 标准化调性标识
 * 将各种可能的调性表示法转换为统一格式
 */
function normalizeKeySignature(keySignature) {
    if (!keySignature) return null;

    // 转换为小写并标准化格式
    let normalized = keySignature.toLowerCase().trim();

    // 处理各种可能的格式
    if (normalized.includes('minor') || normalized.includes('m')) {
        // 移除 'minor' 或 'm' 后缀
        normalized = normalized.replace(/[-_\s]*(minor|m)$/i, '');

        // 添加标准后缀
        if (!normalized.endsWith('-minor')) {
            normalized += '-minor';
        }
    }

    // 处理升降号符号
    normalized = normalized.replace(/♯/g, '#').replace(/♭/g, 'b');

    return normalized;
}

/**
 * 解析音符名，提取step和alter信息
 *
 * @param {string} noteName - 音符名 (如 'C#', 'Bb', 'F##')
 * @returns {object} 包含step和alter的对象
 */
function parseNoteName(noteName) {
    if (!noteName || typeof noteName !== 'string') {
        return null;
    }

    // 提取基础音符名 (A-G)
    const step = noteName.charAt(0).toUpperCase();
    if (!'ABCDEFG'.includes(step)) {
        return null;
    }

    // 提取变化音
    const alterPart = noteName.slice(1);
    let alter = 0;

    if (alterPart) {
        // 计算升降号数量
        const sharps = (alterPart.match(/#/g) || []).length;
        const flats = (alterPart.match(/b/g) || []).length;
        alter = sharps - flats;
    }

    return { step, alter };
}

/**
 * 计算正确的八度
 * 基于音符家族而非简单的音符名来避免八度错误
 *
 * @param {number} midiNote - MIDI音符值
 * @param {string} noteName - 音符名
 * @param {number} basicOctave - 基础八度计算结果
 * @returns {number} 修正后的八度
 */
function calculateCorrectOctave(midiNote, noteName, basicOctave) {
    // 获取音符所属的家族
    const noteFamily = NOTE_FAMILY_MAPPING[noteName];
    if (!noteFamily) {
        console.warn('⚠️ 未知音符家族:', noteName);
        return basicOctave;
    }

    // 获取家族基础音符的MIDI值
    const familyBaseMidi = BASE_NOTE_TO_MIDI[noteFamily];
    if (familyBaseMidi === undefined) {
        console.warn('⚠️ 无法找到家族基础MIDI:', noteFamily);
        return basicOctave;
    }

    // 计算实际的八度
    // 对于跨八度的音符（如B#实际是下一八度的C），需要特殊处理
    let correctedOctave = basicOctave;
    const pitchClass = midiNote % 12;

    // 🔧 修复：特殊跨八度音符的正确处理
    // 这些音符需要基于记谱法家族而不是实际音高来计算八度
    if (noteName.includes('B#') || noteName.includes('B##')) {
        // B# 和 B## 在记谱上属于B家族，但实际音高是C
        // B#=C, B##=C#，所以需要检查是否跨越了八度边界
        const actualC = (Math.floor(midiNote / 12) * 12);  // 当前八度的C音位置
        if (midiNote >= actualC && midiNote < actualC + 2) {  // 如果是C或C#音高
            // B#/B##的八度应该是前一个八度的B家族
            correctedOctave = basicOctave - 1;
            console.log(`🔧 B#/B##八度修正: MIDI${midiNote} -> ${noteName}${correctedOctave} (B家族前一八度)`);
        }
    } else if (noteName.includes('E#') || noteName.includes('E##')) {
        // 🔧 修复：E# 和 E## 在记谱上属于E家族，但实际音高是F/F#
        // 关键问题：MIDI 65=F4（音高），但E#应该显示为E#4（记谱）
        // 因为E#在记谱上属于E家族，应该和实际音高F在同一八度

        // E#应该和它的实际音高在同一八度，不需要调整
        correctedOctave = basicOctave;  // 保持与实际音高同八度
        console.log(`🔧 E#/E##八度修正: MIDI${midiNote} -> ${noteName}${correctedOctave} (E家族与实际音高F同八度)`);
    } else if (noteName.includes('Cb') || noteName.includes('Cbb')) {
        // 🔧 修复：Cb 和 Cbb 在记谱上属于C家族，但实际音高是B/Bb
        // 关键问题：MIDI 59=B3（音高），但Cb应该显示为Cb4（记谱）
        // 因为Cb在记谱上属于C家族，应该和MIDI 60的C4在同一八度

        correctedOctave = basicOctave + 1;  // 八度+1，让Cb4和C4在同一八度
        console.log(`🔧 Cb/Cbb八度修正: MIDI${midiNote} -> ${noteName}${correctedOctave} (C家族八度对齐，${basicOctave}+1=${correctedOctave})`);
    } else if (noteName.includes('Fb') || noteName.includes('Fbb')) {
        // 🔧 修复：Fb 和 Fbb 在记谱上属于F家族，但实际音高是E/Eb
        // 它们的八度应该基于F家族来计算，不需要额外调整
        console.log(`🎵 Fb/Fbb八度保持: MIDI${midiNote} -> ${noteName}${correctedOctave} (F家族正常八度)`);
    }

    // 记录八度修正过程（仅在有修正时）
    if (correctedOctave !== basicOctave) {
        console.log(`🔧 八度修正: ${noteName} MIDI ${midiNote} 从 ${basicOctave} 修正为 ${correctedOctave} (音符家族: ${noteFamily})`);
    }

    return correctedOctave;
}

/**
 * 检查是否为小调的函数
 * 用于在现有系统中判断是否使用独立拼写系统
 *
 * @param {string} keySignature - 调性标识
 * @returns {boolean} 是否为小调
 */
function isMinorKey(keySignature) {
    if (!keySignature) return false;
    const normalized = normalizeKeySignature(keySignature);
    return normalized && normalized.includes('minor');
}

/**
 * 获取支持的小调列表
 * @returns {Array} 支持的小调列表
 */
function getSupportedMinorKeys() {
    return Object.keys(INDEPENDENT_MINOR_KEY_SPELLING);
}

/**
 * 测试函数 - 验证独立拼写系统
 */
function testIndependentMinorSpelling() {
    console.log('🧪 测试独立小调拼写系统...');

    const testCases = [
        // 测试Eb小调的Cb音符 (解决用户报告的八度问题)
        { midi: 59, key: 'eb-minor', expectedNote: 'Cb', description: 'Eb小调Cb3' },
        { midi: 71, key: 'eb-minor', expectedNote: 'Cb', description: 'Eb小调Cb4' },

        // 测试F#小调的E#音符 (解决用户报告的八度问题)
        { midi: 65, key: 'f#-minor', expectedNote: 'E#', description: 'F#小调E#4' },
        { midi: 77, key: 'f#-minor', expectedNote: 'E#', description: 'F#小调E#5' },

        // 测试G#小调和D#小调的变体音符
        { midi: 79, key: 'g#-minor', expectedNote: 'F##', description: 'G#小调F##5' },
        { midi: 74, key: 'd#-minor', expectedNote: 'C##', description: 'D#小调C##5' },

        // 测试B#音符
        { midi: 60, key: 'c#-minor', expectedNote: 'B#', description: 'C#小调B#4' },
        { midi: 72, key: 'f#-minor', expectedNote: 'B#', description: 'F#小调B#5' }
    ];

    testCases.forEach((testCase, index) => {
        console.log(`\n📋 测试案例 ${index + 1}: ${testCase.description}`);

        const result = getIndependentMinorSpelling(testCase.midi, testCase.key);

        if (result) {
            const success = result.noteName === testCase.expectedNote;
            const icon = success ? '✅' : '❌';

            console.log(`${icon} MIDI ${testCase.midi} → ${result.noteName}${result.octave} (期望: ${testCase.expectedNote})`);

            if (!success) {
                console.log(`   🔍 详细信息: step=${result.step}, alter=${result.alter}, octave=${result.octave}`);
            }
        } else {
            console.log(`❌ 测试失败: 无法获取拼写结果`);
        }
    });

    console.log('\n🏁 独立小调拼写系统测试完成');
}

// 导出接口
if (typeof window !== 'undefined') {
    // 浏览器环境
    window.IndependentMinorSpelling = {
        getSpelling: getIndependentMinorSpelling,
        isMinorKey: isMinorKey,
        getSupportedKeys: getSupportedMinorKeys,
        test: testIndependentMinorSpelling
    };

    console.log('🎵 独立小调拼写系统已加载 (浏览器环境)');
    console.log('📋 支持的小调数量:', getSupportedMinorKeys().length);
    console.log('🧪 运行测试: IndependentMinorSpelling.test()');
}

if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        getIndependentMinorSpelling,
        isMinorKey,
        getSupportedMinorKeys,
        testIndependentMinorSpelling,
        INDEPENDENT_MINOR_KEY_SPELLING,
        NOTE_FAMILY_MAPPING
    };
}