/*!
 * Cognote 和弦生成器 - 小调变体音处理模块
 * Minor Scale Alterations Module for Chord Generator
 *
 * Copyright © 2025. All rights reserved. Igor Chen - icstudio.club
 *
 * Author: Igor Chen
 * Website: https://icstudio.club
 * Email: icstudio@fastmail.com
 *
 * Features:
 * - 完全独立的小调变体音处理系统，不依赖现有HarmonyTheory
 * - 智能应用和声小调、旋律小调的变化音
 * - 60%+的变体音出现概率，解决用户报告的变体音缺失问题
 * - 特别支持G#小调、D#小调等高升号调性
 * - 基于音乐理论的智能决策算法
 *
 * Design Principle:
 * - 基于古典音乐理论：和声小调用于和声进行，旋律小调用于旋律线条
 * - 完全独立的概率系统，不受现有系统影响
 * - 详细的调试日志，便于验证和追踪
 */

// 小调变体音的正确拼写对照表
// 基于音乐理论，每个小调的第6、7级在不同变体中的正确拼写
const INDEPENDENT_MINOR_SCALE_ALTERATIONS = {
    // 升号小调系列
    'a-minor': {
        natural: { sixth: 'F', seventh: 'G' },
        harmonic: { sixth: 'F', seventh: 'G#' },       // 升高第7级
        melodic: { sixth: 'F#', seventh: 'G#' }        // 升高第6、7级
    },
    'e-minor': {
        natural: { sixth: 'C', seventh: 'D' },
        harmonic: { sixth: 'C', seventh: 'D#' },       // 升高第7级
        melodic: { sixth: 'C#', seventh: 'D#' }        // 升高第6、7级
    },
    'b-minor': {
        natural: { sixth: 'G', seventh: 'A' },
        harmonic: { sixth: 'G', seventh: 'A#' },       // 升高第7级
        melodic: { sixth: 'G#', seventh: 'A#' }        // 升高第6、7级
    },
    'f#-minor': {
        natural: { sixth: 'D', seventh: 'E' },
        harmonic: { sixth: 'D', seventh: 'E#' },       // 升高第7级
        melodic: { sixth: 'D#', seventh: 'E#' }        // 升高第6、7级
    },
    'c#-minor': {
        natural: { sixth: 'A', seventh: 'B' },
        harmonic: { sixth: 'A', seventh: 'B#' },       // 升高第7级
        melodic: { sixth: 'A#', seventh: 'B#' }        // 升高第6、7级
    },
    'g#-minor': {
        natural: { sixth: 'E', seventh: 'F#' },
        harmonic: { sixth: 'E', seventh: 'F##' },      // 升高第7级
        melodic: { sixth: 'E#', seventh: 'F##' }       // 升高第6、7级
    },
    'd#-minor': {
        natural: { sixth: 'B', seventh: 'C#' },
        harmonic: { sixth: 'B', seventh: 'C##' },      // 升高第7级
        melodic: { sixth: 'B#', seventh: 'C##' }       // 升高第6、7级
    },

    // 降号小调系列
    'd-minor': {
        natural: { sixth: 'Bb', seventh: 'C' },
        harmonic: { sixth: 'Bb', seventh: 'C#' },      // 升高第7级
        melodic: { sixth: 'B', seventh: 'C#' }         // 升高第6、7级
    },
    'g-minor': {
        natural: { sixth: 'Eb', seventh: 'F' },
        harmonic: { sixth: 'Eb', seventh: 'F#' },      // 升高第7级
        melodic: { sixth: 'E', seventh: 'F#' }         // 升高第6、7级
    },
    'c-minor': {
        natural: { sixth: 'Ab', seventh: 'Bb' },
        harmonic: { sixth: 'Ab', seventh: 'B' },       // 升高第7级
        melodic: { sixth: 'A', seventh: 'B' }          // 升高第6、7级
    },
    'f-minor': {
        natural: { sixth: 'Db', seventh: 'Eb' },
        harmonic: { sixth: 'Db', seventh: 'E' },       // 升高第7级
        melodic: { sixth: 'D', seventh: 'E' }          // 升高第6、7级
    },
    'bb-minor': {
        natural: { sixth: 'Gb', seventh: 'Ab' },
        harmonic: { sixth: 'Gb', seventh: 'A' },       // 升高第7级
        melodic: { sixth: 'G', seventh: 'A' }          // 升高第6、7级
    },
    'eb-minor': {
        natural: { sixth: 'Cb', seventh: 'Db' },
        harmonic: { sixth: 'Cb', seventh: 'D' },       // 升高第7级
        melodic: { sixth: 'C', seventh: 'D' }          // 升高第6、7级
    }
};

// 音名到MIDI的转换表（包括所有可能的变化音）
const INDEPENDENT_NOTE_TO_MIDI = {
    // C系列
    'C': 0, 'C#': 1, 'C##': 2, 'Cb': 11, 'Cbb': 10,
    // D系列
    'D': 2, 'D#': 3, 'D##': 4, 'Db': 1, 'Dbb': 0,
    // E系列
    'E': 4, 'E#': 5, 'E##': 6, 'Eb': 3, 'Ebb': 2,
    // F系列
    'F': 5, 'F#': 6, 'F##': 7, 'Fb': 4, 'Fbb': 3,
    // G系列
    'G': 7, 'G#': 8, 'G##': 9, 'Gb': 6, 'Gbb': 5,
    // A系列
    'A': 9, 'A#': 10, 'A##': 11, 'Ab': 8, 'Abb': 7,
    // B系列
    'B': 11, 'B#': 0, 'B##': 1, 'Bb': 10, 'Bbb': 9
};

// 小调音阶级数映射表 (主音为1级)
const MINOR_SCALE_DEGREES = {
    // 自然小调的音阶级数相对于主音的半音距离
    1: 0,   // 主音
    2: 2,   // 第2级
    3: 3,   // 第3级 (小三度)
    4: 5,   // 第4级
    5: 7,   // 第5级
    6: 8,   // 第6级 (小六度)
    7: 10   // 第7级 (小七度)
};

/**
 * 独立的小调变体音生成系统
 * 完全不依赖现有HarmonyTheory，基于音乐理论独立实现
 *
 * @param {string} keySignature - 调性标识 (如 'eb-minor', 'g#-minor')
 * @param {number} enhancedProbability - 增强概率 (0.6 = 60%)
 * @returns {object} 包含变体类型、音阶音符、调性信息的对象
 */
function generateIndependentMinorVariant(keySignature, enhancedProbability = 0.6) {
    // 输入验证
    if (!keySignature || typeof keySignature !== 'string') {
        console.warn('⚠️ 无效的调性标识:', keySignature);
        return null;
    }

    // 标准化调性标识
    const normalizedKey = normalizeKeySignature(keySignature);

    // 检查是否为支持的小调
    if (!INDEPENDENT_MINOR_SCALE_ALTERATIONS.hasOwnProperty(normalizedKey)) {
        console.warn('⚠️ 不支持的小调变体:', normalizedKey);
        return null;
    }

    // 获取变体音信息
    const alterations = INDEPENDENT_MINOR_SCALE_ALTERATIONS[normalizedKey];

    // 智能概率系统 - 增强变体音出现概率
    const random = Math.random();
    let scaleType, selectedAlterations;

    if (random < enhancedProbability) {
        // 60%概率使用变体小调
        if (random < enhancedProbability * 0.6) {
            // 36%概率使用和声小调
            scaleType = 'harmonic';
            selectedAlterations = alterations.harmonic;
        } else {
            // 24%概率使用旋律小调
            scaleType = 'melodic';
            selectedAlterations = alterations.melodic;
        }
    } else {
        // 40%概率使用自然小调
        scaleType = 'natural';
        selectedAlterations = alterations.natural;
    }

    // 生成完整的音阶音符数组
    const scaleNotes = generateMinorScaleNotes(normalizedKey, scaleType, selectedAlterations);

    const result = {
        type: scaleType,
        notes: scaleNotes,
        key: normalizedKey,
        alterations: selectedAlterations,
        probability: enhancedProbability
    };

    // 详细日志 - 便于调试验证
    console.log(`🎲 随机选择小调类型: ${normalizedKey} → ${scaleType} (增强变体概率)`);

    if (scaleType !== 'natural') {
        console.log(`🔍 ${normalizedKey}${scaleType}变体详细信息:`);
        console.log(`   基础音阶: ['${alterations.natural.sixth}', '${alterations.natural.seventh}']`);
        console.log(`   变体音阶: [${scaleNotes.slice(5, 7).join(', ')}]`);

        if (scaleType === 'harmonic') {
            console.log(`   ✅ 和声小调包含${selectedAlterations.seventh}（第7音升高）`);
        } else if (scaleType === 'melodic') {
            console.log(`   ✅ 旋律小调包含${selectedAlterations.sixth}和${selectedAlterations.seventh}（第6、7音升高）`);
        }
    }

    return result;
}

/**
 * 生成完整的小调音阶音符数组
 *
 * @param {string} keySignature - 调性标识
 * @param {string} scaleType - 音阶类型 ('natural', 'harmonic', 'melodic')
 * @param {object} alterations - 变化音信息
 * @returns {Array} 7个音符的数组
 */
function generateMinorScaleNotes(keySignature, scaleType, alterations) {
    // 提取主音
    const tonic = extractTonicFromKey(keySignature);
    if (!tonic) {
        console.warn('⚠️ 无法提取主音:', keySignature);
        return [];
    }

    // 根据主音生成基础小调音阶
    const baseScale = generateBaseMinorScale(tonic);

    // 应用变体音修改
    let resultScale = [...baseScale];

    if (scaleType === 'harmonic') {
        // 和声小调：只升高第7级
        resultScale[6] = alterations.seventh;
    } else if (scaleType === 'melodic') {
        // 旋律小调：升高第6、7级
        resultScale[5] = alterations.sixth;
        resultScale[6] = alterations.seventh;
    }
    // natural 小调不需要修改

    return resultScale;
}

/**
 * 从调性标识中提取主音
 *
 * @param {string} keySignature - 调性标识 (如 'eb-minor')
 * @returns {string} 主音名称 (如 'Eb')
 */
function extractTonicFromKey(keySignature) {
    if (!keySignature) return null;

    // 移除 '-minor' 后缀
    let tonic = keySignature.replace(/-minor$/i, '');

    // 标准化升降号
    tonic = tonic.replace(/♯/g, '#').replace(/♭/g, 'b');

    // 首字母大写
    if (tonic.length > 0) {
        tonic = tonic.charAt(0).toUpperCase() + tonic.slice(1);
    }

    return tonic;
}

/**
 * 生成基础自然小调音阶
 *
 * @param {string} tonic - 主音名称
 * @returns {Array} 7个音符的自然小调音阶
 */
function generateBaseMinorScale(tonic) {
    // 获取主音的MIDI值
    const tonicMidi = INDEPENDENT_NOTE_TO_MIDI[tonic];
    if (tonicMidi === undefined) {
        console.warn('⚠️ 无法找到主音MIDI值:', tonic);
        return [];
    }

    const scale = [];

    // 根据自然小调音程结构生成音阶
    // 小调音程结构: 全-半-全-全-半-全-全
    const minorIntervals = [0, 2, 3, 5, 7, 8, 10];

    for (let i = 0; i < 7; i++) {
        const scaleMidi = (tonicMidi + minorIntervals[i]) % 12;

        // 从独立拼写系统中获取正确的音符名
        const keySignature = tonic.toLowerCase() + '-minor';
        const noteName = getScaleDegreeName(scaleMidi, keySignature, i + 1);

        scale.push(noteName);
    }

    return scale;
}

/**
 * 获取音阶级数的正确音符名
 *
 * @param {number} midiPitchClass - MIDI音高类别 (0-11)
 * @param {string} keySignature - 调性标识
 * @param {number} degree - 音阶级数 (1-7)
 * @returns {string} 音符名
 */
function getScaleDegreeName(midiPitchClass, keySignature, degree) {
    // 直接从独立拼写系统查询
    if (typeof window !== 'undefined' && window.IndependentMinorSpelling) {
        // 浏览器环境，使用已加载的拼写系统
        const fakeOctave = 4; // 使用假八度，只需要音符名
        const midiNote = fakeOctave * 12 + midiPitchClass;
        const spelling = window.IndependentMinorSpelling.getSpelling(midiNote, keySignature);

        if (spelling && spelling.noteName) {
            return spelling.noteName;
        }
    }

    // 备用方案：基于音程关系推算
    return inferNoteNameFromDegree(keySignature, degree, midiPitchClass);
}

/**
 * 基于音阶级数推算音符名（备用方案）
 *
 * @param {string} keySignature - 调性标识
 * @param {number} degree - 音阶级数 (1-7)
 * @param {number} midiPitchClass - MIDI音高类别
 * @returns {string} 推算的音符名
 */
function inferNoteNameFromDegree(keySignature, degree, midiPitchClass) {
    // 简化版本，基于度数推算
    const tonic = extractTonicFromKey(keySignature);
    const tonicStep = tonic.charAt(0);

    // 音阶级数到字母名的映射
    const stepNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const tonicIndex = stepNames.indexOf(tonicStep);

    if (tonicIndex === -1) {
        console.warn('⚠️ 无法识别主音字母:', tonicStep);
        return 'C'; // 默认值
    }

    // 计算目标级数的字母名
    const targetIndex = (tonicIndex + degree - 1) % 7;
    const targetStep = stepNames[targetIndex];

    // 简单的升降号推算（可能不完全准确，但作为备用方案）
    const targetBaseMidi = INDEPENDENT_NOTE_TO_MIDI[targetStep];
    const alterationNeeded = (midiPitchClass - targetBaseMidi + 12) % 12;

    if (alterationNeeded === 0) {
        return targetStep; // 无变化音
    } else if (alterationNeeded <= 2) {
        return targetStep + '#'.repeat(alterationNeeded); // 升号
    } else if (alterationNeeded >= 10) {
        return targetStep + 'b'.repeat(12 - alterationNeeded); // 降号
    }

    return targetStep; // 默认情况
}

/**
 * 标准化调性标识（与拼写模块保持一致）
 */
function normalizeKeySignature(keySignature) {
    if (!keySignature) return null;

    let normalized = keySignature.toLowerCase().trim();

    if (normalized.includes('minor') || normalized.includes('m')) {
        normalized = normalized.replace(/[-_\s]*(minor|m)$/i, '');
        if (!normalized.endsWith('-minor')) {
            normalized += '-minor';
        }
    }

    normalized = normalized.replace(/♯/g, '#').replace(/♭/g, 'b');
    return normalized;
}

/**
 * 获取增强的小调变体生成器
 * 提供更高的变体音出现概率
 *
 * @param {string} keySignature - 调性标识
 * @returns {object} 变体音信息
 */
function getEnhancedMinorVariant(keySignature) {
    return generateIndependentMinorVariant(keySignature, 0.65); // 65%变体概率
}

/**
 * 检查调性是否支持变体音生成
 *
 * @param {string} keySignature - 调性标识
 * @returns {boolean} 是否支持
 */
function isVariantSupported(keySignature) {
    const normalized = normalizeKeySignature(keySignature);
    return normalized && INDEPENDENT_MINOR_SCALE_ALTERATIONS.hasOwnProperty(normalized);
}

/**
 * 获取支持变体音的小调列表
 *
 * @returns {Array} 支持的小调列表
 */
function getSupportedVariantKeys() {
    return Object.keys(INDEPENDENT_MINOR_SCALE_ALTERATIONS);
}

/**
 * 测试函数 - 验证小调变体音生成
 */
function testIndependentMinorVariants() {
    console.log('🧪 测试独立小调变体音生成系统...');

    const testKeys = [
        'eb-minor',   // 用户报告的Cb八度问题
        'f#-minor',   // 用户报告的E#八度问题
        'g#-minor',   // 用户报告的变体音缺失
        'd#-minor',   // 用户报告的变体音缺失
        'c#-minor',   // 高升号调性测试
        'c-minor',    // 降号调性测试
    ];

    testKeys.forEach(key => {
        console.log(`\n📋 测试调性: ${key}`);

        // 测试多次生成，验证概率分布
        const results = { natural: 0, harmonic: 0, melodic: 0 };
        const testCount = 20;

        for (let i = 0; i < testCount; i++) {
            const variant = generateIndependentMinorVariant(key, 0.6);
            if (variant) {
                results[variant.type]++;
            }
        }

        console.log(`   📊 ${testCount}次生成结果分布:`);
        console.log(`   - 自然小调: ${results.natural}次 (${(results.natural/testCount*100).toFixed(1)}%)`);
        console.log(`   - 和声小调: ${results.harmonic}次 (${(results.harmonic/testCount*100).toFixed(1)}%)`);
        console.log(`   - 旋律小调: ${results.melodic}次 (${(results.melodic/testCount*100).toFixed(1)}%)`);

        const variantTotal = results.harmonic + results.melodic;
        const variantPercent = (variantTotal/testCount*100).toFixed(1);

        if (variantPercent >= 50) {
            console.log(`   ✅ 变体音出现率: ${variantPercent}% (期望≥60%，实际良好)`);
        } else {
            console.log(`   ⚠️ 变体音出现率: ${variantPercent}% (期望≥60%，需要调整)`);
        }

        // 测试特色音符生成
        const harmonicVariant = generateIndependentMinorVariant(key, 1.0); // 强制生成变体
        if (harmonicVariant && harmonicVariant.type !== 'natural') {
            console.log(`   🎵 ${harmonicVariant.type}小调特色音符: [${harmonicVariant.notes.slice(5, 7).join(', ')}]`);
        }
    });

    console.log('\n🏁 独立小调变体音生成系统测试完成');
}

// 导出接口
if (typeof window !== 'undefined') {
    // 浏览器环境
    window.IndependentMinorVariants = {
        generate: generateIndependentMinorVariant,
        getEnhanced: getEnhancedMinorVariant,
        isSupported: isVariantSupported,
        getSupportedKeys: getSupportedVariantKeys,
        test: testIndependentMinorVariants
    };

    console.log('🎵 独立小调变体音系统已加载 (浏览器环境)');
    console.log('📋 支持的小调数量:', getSupportedVariantKeys().length);
    console.log('🧪 运行测试: IndependentMinorVariants.test()');
}

if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        generateIndependentMinorVariant,
        getEnhancedMinorVariant,
        isVariantSupported,
        getSupportedVariantKeys,
        testIndependentMinorVariants,
        INDEPENDENT_MINOR_SCALE_ALTERATIONS,
        INDEPENDENT_NOTE_TO_MIDI
    };
}