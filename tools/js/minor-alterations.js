/*!
 * IC Studio 视奏工具 - 小调变化音处理模块
 * Minor Alterations Module - Enhanced Version
 * 
 * Copyright © 2025. All rights reserved. Igor Chen - icstudio.club
 * 
 * Author: Igor Chen
 * Website: https://icstudio.club
 * Email: service@icstudio.club
 * 
 * Features:
 * - 基于音乐理论研究，智能应用旋律小调和和声小调的变化音
 * - 严格遵循正确的音名拼写，不使用错误的等音
 * 
 * 参考：Bach, Mozart, Beethoven等古典作曲家的小调音阶使用规律
 */

// 小调变化音的正确拼写对照表
const MINOR_SCALE_ALTERATIONS = {
    // 升号小调
    'Am': {
        natural: { sixth: 'F', seventh: 'G' },
        harmonic: { sixth: 'F', seventh: 'G#' },
        melodic: { sixth: 'F#', seventh: 'G#' }
    },
    'Em': {
        natural: { sixth: 'C', seventh: 'D' },
        harmonic: { sixth: 'C', seventh: 'D#' },
        melodic: { sixth: 'C#', seventh: 'D#' }
    },
    'Bm': {
        natural: { sixth: 'G', seventh: 'A' },
        harmonic: { sixth: 'G', seventh: 'A#' },
        melodic: { sixth: 'G#', seventh: 'A#' }
    },
    'F#m': {
        natural: { sixth: 'D', seventh: 'E' },
        harmonic: { sixth: 'D', seventh: 'E#' },
        melodic: { sixth: 'D#', seventh: 'E#' }
    },
    'C#m': {
        natural: { sixth: 'A', seventh: 'B' },
        harmonic: { sixth: 'A', seventh: 'B#' },
        melodic: { sixth: 'A#', seventh: 'B#' }
    },
    'G#m': {
        natural: { sixth: 'E', seventh: 'F#' },
        harmonic: { sixth: 'E', seventh: 'F##' },
        melodic: { sixth: 'E#', seventh: 'F##' }
    },
    'D#m': {
        natural: { sixth: 'B', seventh: 'C#' },
        harmonic: { sixth: 'B', seventh: 'C##' },
        melodic: { sixth: 'B#', seventh: 'C##' }
    },
    
    // 降号小调
    'Gm': {
        natural: { sixth: 'Eb', seventh: 'F' },
        harmonic: { sixth: 'Eb', seventh: 'F#' },
        melodic: { sixth: 'E', seventh: 'F#' }
    },
    'Dm': {
        natural: { sixth: 'Bb', seventh: 'C' },
        harmonic: { sixth: 'Bb', seventh: 'C#' },
        melodic: { sixth: 'B', seventh: 'C#' }
    },
    'Cm': {
        natural: { sixth: 'Ab', seventh: 'Bb' },
        harmonic: { sixth: 'Ab', seventh: 'B' },
        melodic: { sixth: 'A', seventh: 'B' }
    },
    'Fm': {
        natural: { sixth: 'Db', seventh: 'Eb' },
        harmonic: { sixth: 'Db', seventh: 'E' },
        melodic: { sixth: 'D', seventh: 'E' }
    },
    'Bbm': {
        natural: { sixth: 'Gb', seventh: 'Ab' },
        harmonic: { sixth: 'Gb', seventh: 'A' },
        melodic: { sixth: 'G', seventh: 'A' }
    },
    'Ebm': {
        natural: { sixth: 'Cb', seventh: 'Db' },
        harmonic: { sixth: 'Cb', seventh: 'D' },
        melodic: { sixth: 'C', seventh: 'D' }
    },
    
    // 理论上的小调（如果需要）
    'A#m': {
        natural: { sixth: 'F#', seventh: 'G#' },
        harmonic: { sixth: 'F#', seventh: 'G##' },
        melodic: { sixth: 'F##', seventh: 'G##' }
    }
};

// 音名到MIDI的转换表（包括所有可能的变化音）
const NOTE_TO_MIDI = {
    'C': 0, 'C#': 1, 'C##': 2,
    'Db': 1, 'D': 2, 'D#': 3, 'D##': 4,
    'Eb': 3, 'E': 4, 'E#': 5, 'E##': 6,
    'Fb': 4, 'F': 5, 'F#': 6, 'F##': 7,
    'Gb': 6, 'G': 7, 'G#': 8, 'G##': 9,
    'Ab': 8, 'A': 9, 'A#': 10, 'A##': 11,
    'Bb': 10, 'B': 11, 'B#': 0, 'B##': 1,
    'Cb': 11
};

// MIDI到音名的转换表（用于检查和验证）
const MIDI_TO_NOTE = {
    0: ['C', 'B#', 'Dbb'],
    1: ['C#', 'Db', 'B##'],
    2: ['D', 'C##', 'Ebb'],
    3: ['D#', 'Eb', 'Fbb'],
    4: ['E', 'Fb', 'D##'],
    5: ['F', 'E#', 'Gbb'],
    6: ['F#', 'Gb', 'E##'],
    7: ['G', 'F##', 'Abb'],
    8: ['G#', 'Ab'],
    9: ['A', 'G##', 'Bbb'],
    10: ['A#', 'Bb', 'Cbb'],
    11: ['B', 'Cb', 'A##']
};

/**
 * 增强版小调变化音处理 - 基于音乐理论的智能应用
 * 
 * 核心原则（基于古典音乐理论）：
 * 1. 和声小调：主要用于和声进行，特别是V-i终止式
 * 2. 旋律小调：上行时升高第6、7级避免增二度，下行时恢复自然小调
 * 3. 导音解决：升高的第7级（导音）强烈倾向于解决到主音
 * 4. 音乐语境决定使用：不是机械地应用，而是根据音乐需要
 * 
 * @param {number} midi - 当前音符的MIDI值
 * @param {number|null} lastMidi - 前一个音符的MIDI值  
 * @param {string} direction - 旋律方向: 'ascending', 'descending', 'neutral'
 * @param {string} keySignature - 调号
 * @param {object} random - 随机数生成器
 * @param {object} rules - 生成规则
 * @param {object} context - 上下文信息（可选）
 * @returns {number} - 处理后的MIDI值
 */
function applyMinorScaleAlterations(midi, lastMidi, direction, keySignature, random, rules, context = {}) {
    // 检查是否为小调且在对照表中
    if (!MINOR_SCALE_ALTERATIONS[keySignature]) {
        return midi; // 非小调或不支持的调号，直接返回
    }
    
    const alterations = MINOR_SCALE_ALTERATIONS[keySignature];
    const keyInfo = KEY_SIGNATURES[keySignature];
    const tonic = keyInfo.tonic;
    const pitchClass = midi % 12;
    const octave = Math.floor(midi / 12);
    
    // 计算音阶级数（相对于主音）
    let scaleDegree = (pitchClass - tonic + 12) % 12;
    const scaleSteps = [0, 2, 3, 5, 7, 8, 10]; // 自然小调音阶级数
    const degreeIndex = scaleSteps.indexOf(scaleDegree);
    
    if (degreeIndex === -1) {
        return midi; // 不在小调音阶中，不处理
    }
    
    const actualDegree = degreeIndex + 1; // 1-7级
    
    // 智能概率系统：基于音乐理论和上下文
    const baseAlterationRate = 0.25; // 提高基础概率，更频繁地使用变化音
    let alterationRate = baseAlterationRate;
    
    // 1. 方向性调整（基于旋律小调的传统用法）
    if (direction === 'ascending') {
        alterationRate *= 2.0; // 上行时显著增加概率（旋律小调的典型用法）
    } else if (direction === 'descending') {
        alterationRate *= 0.2; // 下行时降低概率（通常使用自然小调）
    }
    
    // 2. 位置调整（小节末尾和乐句末尾更容易使用和声小调）
    if (context.isPhrasEnd || context.isMeasureEnd) {
        alterationRate *= 1.5; // 在结构点增加使用概率
    }
    
    // 3. 音程关系调整（避免增二度）
    const wouldCreateAugmentedSecond = checkForAugmentedSecond(midi, lastMidi, keySignature);
    if (wouldCreateAugmentedSecond) {
        alterationRate *= 3.0; // 大幅增加使用旋律小调的概率以避免增二度
    }
    
    // 音乐理论驱动的变化音处理
    
    // 1. 导音解决模式（V-i终止式的核心）
    if (lastMidi && isLeadingToneResolutionBySpelling(lastMidi, midi, keySignature)) {
        console.log(`🎵 [导音解决] 检测到导音解决: MIDI ${lastMidi} -> ${midi}`);
        return midi; // 主音保持不变，这是正确的解决
    }
    
    // 2. 检查是否需要创建导音（为了后续解决到主音）
    if (isApproachingTonic(midi, keySignature) && random.nextFloat() < 0.7) {
        // 如果接近主音，70%概率使用和声小调的导音
        const harmonicSeventh = alterations.harmonic.seventh;
        const alteredMidi = getAlteredNoteMidi(harmonicSeventh, octave, keySignature);
        if (alteredMidi && alteredMidi <= rules.range.max) {
            console.log(`🎵 [和声小调-导音准备] 创建导音以解决到主音`);
            return alteredMidi;
        }
    }
    
    // 3. 第7级（导音）的智能处理
    if (actualDegree === 7) {
        // a) 上行旋律线：优先使用旋律小调
        if (direction === 'ascending') {
            // 检查是否也需要升高第6级（完整的旋律小调）
            if (lastMidi && getScaleDegree(lastMidi, keySignature) === 6) {
                // 从第6级上行到第7级，两者都应该升高（旋律小调）
                const melodicSeventh = alterations.melodic.seventh;
                const alteredMidi = getAlteredNoteMidi(melodicSeventh, octave, keySignature);
                if (alteredMidi && alteredMidi <= rules.range.max && random.nextFloat() < alterationRate * 2.5) {
                    console.log(`🎵 [旋律小调-完整] 6→7上行，使用${melodicSeventh}`);
                    return alteredMidi;
                }
            } else if (random.nextFloat() < alterationRate * 2) {
                // 其他上行情况
                const harmonicSeventh = alterations.harmonic.seventh;
                const alteredMidi = getAlteredNoteMidi(harmonicSeventh, octave, keySignature);
                if (alteredMidi && alteredMidi <= rules.range.max) {
                    console.log(`🎵 [和声小调-上行] 使用${harmonicSeventh}`);
                    return alteredMidi;
                }
            }
        }
        
        // b) 和声语境：V-i进行必须使用和声小调
        if (lastMidi && isDominantToTonicProgressionBySpelling(lastMidi, midi, keySignature)) {
            const harmonicSeventh = alterations.harmonic.seventh;
            const alteredMidi = getAlteredNoteMidi(harmonicSeventh, octave, keySignature);
            if (alteredMidi && alteredMidi <= rules.range.max) {
                console.log(`🎵 [和声小调-V-i] 属到主进行，必须使用${harmonicSeventh}`);
                return alteredMidi;
            }
        }
        
        // c) 终止式位置：倾向使用和声小调
        if (context.isCadence || context.isPhrasEnd) {
            if (random.nextFloat() < 0.8) { // 80%概率在终止式使用
                const harmonicSeventh = alterations.harmonic.seventh;
                const alteredMidi = getAlteredNoteMidi(harmonicSeventh, octave, keySignature);
                if (alteredMidi && alteredMidi <= rules.range.max) {
                    console.log(`🎵 [和声小调-终止] 终止式位置使用${harmonicSeventh}`);
                    return alteredMidi;
                }
            }
        }
    }
    
    // 4. 第6级的智能处理（旋律小调的关键）
    if (actualDegree === 6) {
        // a) 上行到第7级：必须使用旋律小调避免增二度
        const nextNote = context.nextNote;
        if (direction === 'ascending' && nextNote) {
            const nextDegree = getScaleDegree(nextNote, keySignature);
            if (nextDegree === 7) {
                // 6→7的上行，两者都必须升高（完整旋律小调）
                const melodicSixth = alterations.melodic.sixth;
                const alteredMidi = getAlteredNoteMidi(melodicSixth, octave, keySignature);
                if (alteredMidi && alteredMidi <= rules.range.max) {
                    console.log(`🎵 [旋律小调-必须] 6→7上行，必须使用${melodicSixth}避免增二度`);
                    return alteredMidi;
                }
            }
        }
        
        // b) 一般上行情况：根据概率使用旋律小调
        if (direction === 'ascending' && random.nextFloat() < alterationRate * 1.5) {
            const melodicSixth = alterations.melodic.sixth;
            const alteredMidi = getAlteredNoteMidi(melodicSixth, octave, keySignature);
            if (alteredMidi && alteredMidi <= rules.range.max) {
                console.log(`🎵 [旋律小调-上行] 使用${melodicSixth}`);
                return alteredMidi;
            }
        }
        
        // c) 下行时：通常使用自然小调（不升高）
        if (direction === 'descending') {
            console.log(`🎵 [自然小调] 下行保持第6级不变`);
            return midi; // 保持自然小调形式
        }
    }
    
    // 5. 特殊模式：完整的旋律小调音阶片段
    if (actualDegree >= 5 && actualDegree <= 8 && direction === 'ascending') {
        // 在音阶的上半部分上行时，考虑使用完整的旋律小调
        if (random.nextFloat() < alterationRate * 0.8) {
            const alteredMidi = applyMelodicMinorPattern(midi, actualDegree, octave, alterations, keySignature);
            if (alteredMidi && alteredMidi !== midi && alteredMidi <= rules.range.max) {
                console.log(`🎵 [旋律小调-模式] 应用旋律小调模式`);
                return alteredMidi;
            }
        }
    }
    
    return midi; // 无变化
}

/**
 * 根据音名计算变化音的MIDI值
 * @param {string} noteName - 音名（如 'G#', 'F##', 'Bb' 等）
 * @param {number} octave - 八度
 * @param {string} keySignature - 调号（用于八度调整）
 * @returns {number|null} - MIDI值或null（如果无效）
 */
function getAlteredNoteMidi(noteName, octave, keySignature) {
    if (!NOTE_TO_MIDI.hasOwnProperty(noteName)) {
        console.warn(`⚠️ 未知的音名: ${noteName}`);
        return null;
    }
    
    const pitchClass = NOTE_TO_MIDI[noteName];
    let resultMidi = octave * 12 + pitchClass;
    
    // 处理跨八度情况（如B#在下一八度）
    if (noteName.includes('B#') || noteName.includes('B##')) {
        // B# 和 B## 实际在下一八度
        resultMidi += 12;
    } else if (noteName.includes('Cb')) {
        // Cb 实际在上一八度
        resultMidi += 12;
    }
    
    return resultMidi;
}

/**
 * 检查是否为导音解决到主音（基于正确拼写）
 */
function isLeadingToneResolutionBySpelling(lastMidi, currentMidi, keySignature) {
    if (!MINOR_SCALE_ALTERATIONS[keySignature]) return false;
    
    const keyInfo = KEY_SIGNATURES[keySignature];
    const tonic = keyInfo.tonic;
    const lastPitchClass = lastMidi % 12;
    const currentPitchClass = currentMidi % 12;
    
    // 检查是否为升高第7级解决到主音
    const harmonicSeventh = MINOR_SCALE_ALTERATIONS[keySignature].harmonic.seventh;
    const harmonicSeventhPitch = NOTE_TO_MIDI[harmonicSeventh] % 12;
    
    return lastPitchClass === harmonicSeventhPitch && currentPitchClass === tonic;
}

/**
 * 检查是否为V-i进行（基于正确拼写）
 */
function isDominantToTonicProgressionBySpelling(lastMidi, currentMidi, keySignature) {
    if (!MINOR_SCALE_ALTERATIONS[keySignature]) return false;
    
    const keyInfo = KEY_SIGNATURES[keySignature];
    const tonic = keyInfo.tonic;
    const lastPitchClass = lastMidi % 12;
    const currentPitchClass = currentMidi % 12;
    const dominant = (tonic + 7) % 12; // 第5级
    
    return lastPitchClass === dominant && currentPitchClass === tonic;
}

/**
 * 检查是否为导音解决到主音（兼容旧版本）
 */
function isLeadingToneResolution(lastMidi, currentMidi, tonic) {
    const lastPitchClass = lastMidi % 12;
    const currentPitchClass = currentMidi % 12;
    const leadingTone = (tonic - 1 + 12) % 12;
    
    return lastPitchClass === leadingTone && currentPitchClass === tonic;
}

/**
 * 检查是否为V-i进行（兼容旧版本）
 */
function isDominantToTonicProgression(lastMidi, currentMidi, tonic) {
    const lastPitchClass = lastMidi % 12;
    const currentPitchClass = currentMidi % 12;
    const dominant = (tonic + 7) % 12; // 第5级
    
    return lastPitchClass === dominant && currentPitchClass === tonic;
}

/**
 * 判断旋律方向
 */
function getMelodicDirection(lastMidi, currentMidi) {
    if (!lastMidi) return 'neutral';
    if (currentMidi > lastMidi) return 'ascending';
    if (currentMidi < lastMidi) return 'descending';
    return 'neutral';
}

/**
 * 检查是否会产生增二度音程
 * @param {number} midi - 当前音符
 * @param {number} lastMidi - 前一个音符
 * @param {string} keySignature - 调号
 * @returns {boolean} - 是否会产生增二度
 */
function checkForAugmentedSecond(midi, lastMidi, keySignature) {
    if (!lastMidi || !MINOR_SCALE_ALTERATIONS[keySignature]) return false;
    
    const interval = Math.abs(midi - lastMidi);
    // 增二度是3个半音
    if (interval !== 3) return false;
    
    // 检查是否在第6和第7级之间
    const keyInfo = KEY_SIGNATURES[keySignature];
    const tonic = keyInfo.tonic;
    const lastDegree = getScaleDegree(lastMidi, keySignature);
    const currentDegree = getScaleDegree(midi, keySignature);
    
    // 在和声小调中，第6级到升高的第7级会产生增二度
    return (lastDegree === 6 && currentDegree === 7) || 
           (lastDegree === 7 && currentDegree === 6);
}

/**
 * 获取音符在音阶中的级数（1-7）
 * @param {number} midi - MIDI值
 * @param {string} keySignature - 调号
 * @returns {number|null} - 音阶级数（1-7）或null
 */
function getScaleDegree(midi, keySignature) {
    if (!midi || !KEY_SIGNATURES[keySignature]) return null;
    
    const keyInfo = KEY_SIGNATURES[keySignature];
    const tonic = keyInfo.tonic;
    const pitchClass = midi % 12;
    
    // 计算相对于主音的音阶级数
    let scaleDegree = (pitchClass - tonic + 12) % 12;
    const scaleSteps = [0, 2, 3, 5, 7, 8, 10]; // 自然小调音阶级数
    const degreeIndex = scaleSteps.indexOf(scaleDegree);
    
    return degreeIndex !== -1 ? degreeIndex + 1 : null;
}

/**
 * 检查是否接近主音（用于决定是否使用导音）
 * @param {number} midi - 当前音符
 * @param {string} keySignature - 调号
 * @returns {boolean} - 是否接近主音
 */
function isApproachingTonic(midi, keySignature) {
    const degree = getScaleDegree(midi, keySignature);
    // 第7级或第2级接近主音
    return degree === 7 || degree === 2;
}

/**
 * 应用完整的旋律小调模式
 * @param {number} midi - 当前音符
 * @param {number} degree - 音阶级数
 * @param {number} octave - 八度
 * @param {object} alterations - 变化音对照表
 * @param {string} keySignature - 调号
 * @returns {number|null} - 变化后的MIDI值或null
 */
function applyMelodicMinorPattern(midi, degree, octave, alterations, keySignature) {
    if (degree === 6) {
        const melodicSixth = alterations.melodic.sixth;
        return getAlteredNoteMidi(melodicSixth, octave, keySignature);
    } else if (degree === 7) {
        const melodicSeventh = alterations.melodic.seventh;
        return getAlteredNoteMidi(melodicSeventh, octave, keySignature);
    }
    return midi;
}