/*!
 * IC Studio - 爵士和声模块
 * Jazz Harmony Advanced Module
 *
 * Copyright © 2026. All rights reserved. Igor Chen - icstudio.club
 *
 * Author: Igor Chen
 * Website: https://icstudio.club
 * Email: icstudio@fastmail.com
 */

/**
 * 爵士和声高级模块
 * 实现复杂的爵士和声概念：代理和弦、次属和弦、扩展和弦等
 */
class JazzHarmony {
    constructor(harmonyTheory) {
        this.harmonyTheory = harmonyTheory;

        // 爵士和弦扩展
        this.jazzChordTypes = {
            // 九和弦
            'major9': [0, 4, 7, 11, 14],
            'minor9': [0, 3, 7, 10, 14],
            'dominant9': [0, 4, 7, 10, 14],
            'minor9b5': [0, 3, 6, 10, 14],

            // 十一和弦
            'major11': [0, 4, 7, 11, 14, 17],
            'minor11': [0, 3, 7, 10, 14, 17],
            'dominant11': [0, 4, 7, 10, 14, 17],

            // 十三和弦
            'major13': [0, 4, 7, 11, 14, 17, 21],
            'minor13': [0, 3, 7, 10, 14, 17, 21],
            'dominant13': [0, 4, 7, 10, 14, 17, 21],

            // 变化和弦
            'dominant7alt': [0, 4, 7, 10, 13, 15],  // 属七变化和弦
            'dominant7b9': [0, 4, 7, 10, 13],       // 属七降九
            'dominant7#9': [0, 4, 7, 10, 15],       // 属七升九
            'dominant7#11': [0, 4, 7, 10, 18],      // 属七升十一
            'dominant7b13': [0, 4, 7, 10, 20],      // 属七降十三

            // 挂留和弦
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7],
            '7sus2': [0, 2, 7, 10],
            '7sus4': [0, 5, 7, 10],

            // 增减和弦
            'augmaj7': [0, 4, 8, 11],    // 增大七
            'dim7': [0, 3, 6, 9],        // 减七
            'dim9': [0, 3, 6, 9, 14]     // 减九
        };

        // 代理和弦映射（Tritone Substitution）
        this.tritoneSubstitutions = {
            'V7': 'bII7',     // V7 → bII7
            'V9': 'bII9',
            'V13': 'bII13'
        };

        // 次属和弦（Secondary Dominants）
        this.secondaryDominants = {
            major: {
                'V7/ii': { root: 'A', type: 'dominant7' },    // C大调中
                'V7/iii': { root: 'B', type: 'dominant7' },
                'V7/IV': { root: 'C', type: 'dominant7' },
                'V7/V': { root: 'D', type: 'dominant7' },
                'V7/vi': { root: 'E', type: 'dominant7' }
            },
            minor: {
                'V7/III': { root: 'G', type: 'dominant7' },   // a小调中
                'V7/iv': { root: 'A', type: 'dominant7' },
                'V7/V': { root: 'B', type: 'dominant7' },
                'V7/VI': { root: 'C', type: 'dominant7' },
                'V7/VII': { root: 'D', type: 'dominant7' }
            }
        };

        // Modal Interchange（调式互换）
        this.modalInterchange = {
            major: {
                // 从平行小调借用
                'bII': 'Db',     // 那不勒斯六和弦
                'bIII': 'Eb',    // 小调III
                'iv': 'f-minor', // 小四
                'bVI': 'Ab',     // 小六
                'bVII': 'Bb'     // 小七
            },
            minor: {
                // 从平行大调借用
                'II': 'D',       // 大二
                'III': 'E',      // 大三
                'IV': 'F',       // 大四
                'VI': 'A',       // 大六
                'VII': 'B'       // 大七
            }
        };

        // 常见爵士进行模式
        this.jazzProgressionPatterns = {
            // ii-V-I 家族
            'ii-V-I': ['iim7', 'V7', 'Imaj7'],
            'ii-V-i': ['iim7b5', 'V7', 'im7'],
            'iiø-V-i': ['iim7b5', 'V7alt', 'im7'],

            // Circle of Fifths
            'circle_major': ['vim7', 'iim7', 'V7', 'Imaj7'],
            'circle_minor': ['iim7b5', 'V7', 'im7', 'VImaj7'],

            // Giant Steps 进行
            'giant_steps': ['Imaj7', 'V7/bIII', 'bIIImaj7', 'V7/V', 'Vmaj7'],

            // Rhythm Changes
            'rhythm_a': ['Imaj7', 'vim7', 'iim7', 'V7'],
            'rhythm_b': ['IIImaj7', 'VImaj7', 'iim7', 'V7'],

            // Modal 进行
            'dorian': ['im7', 'IVmaj7', 'im7', 'IVmaj7'],
            'mixolydian': ['I7', 'bVIImaj7', 'I7', 'bVIImaj7'],
            'lydian': ['Imaj7#11', 'IImaj7', 'Imaj7#11', 'IImaj7']
        };

        // 和弦音阶关系
        this.chordScaleRelationships = {
            'major7': ['ionian', 'lydian'],
            'minor7': ['dorian', 'natural_minor'],
            'dominant7': ['mixolydian', 'lydian_dominant'],
            'minor7b5': ['locrian', 'locrian_natural2'], // 半减七和弦替代减七和弦
            'augmented': ['whole_tone', 'augmented']
        };
    }

    /**
     * 生成高级爵士和弦进行
     * @param {string} key - 调性
     * @param {number} numMeasures - 小节数
     * @param {Object} options - 生成选项
     * @returns {Array} 爵士和弦进行
     */
    generateAdvancedJazzProgression(key, numMeasures, options = {}) {
        const {
            includeTritoneSubstitutions = true,
            includeSecondaryDominants = true,
            includeModalInterchange = false,
            complexity = 'medium',
            pattern = null
        } = options;

        let progression = [];

        // 如果指定了模式，使用该模式
        if (pattern && this.jazzProgressionPatterns[pattern]) {
            const patternChords = this.jazzProgressionPatterns[pattern];
            // 重复模式直到达到所需长度
            while (progression.length < numMeasures) {
                progression.push(...patternChords);
            }
            progression = progression.slice(0, numMeasures);
        } else {
            // 生成基础进行
            progression = this.generateBaseJazzProgression(key, numMeasures);
        }

        // 应用高级和声技巧
        if (includeTritoneSubstitutions) {
            progression = this.applyTritoneSubstitutions(progression, key);
        }

        if (includeSecondaryDominants) {
            progression = this.addSecondaryDominants(progression, key);
        }

        if (includeModalInterchange) {
            progression = this.addModalInterchange(progression, key);
        }

        // 转换为和弦对象
        return progression.map(romanNumeral => {
            return this.romanNumeralToJazzChord(romanNumeral, key);
        });
    }

    /**
     * 生成基础爵士进行
     * @param {string} key - 调性
     * @param {number} numMeasures - 小节数
     * @returns {Array} 基础罗马数字进行
     */
    generateBaseJazzProgression(key, numMeasures) {
        const keyInfo = this.harmonyTheory.keys[key];
        const mode = keyInfo.mode;

        // 选择基础模式
        const patterns = [
            'ii-V-I',
            'circle_major',
            'rhythm_a'
        ];

        const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];
        const basePattern = this.jazzProgressionPatterns[chosenPattern];

        let progression = [];
        while (progression.length < numMeasures) {
            progression.push(...basePattern);
        }

        return progression.slice(0, numMeasures);
    }

    /**
     * 生成经典ii-V-I进行
     * @param {string} key - 调性
     * @returns {Array} ii-V-I和弦进行
     */
    generateIIVI(key) {
        const keyInfo = this.harmonyTheory.keys[key];
        if (!keyInfo) {
            throw new Error(`未知调性: ${key}`);
        }

        const scaleNotes = this.harmonyTheory.getScaleNotes(key);
        const mode = keyInfo.mode;

        let iiChord, vChord, iChord;

        if (mode === 'major') {
            // 大调中的ii-V-I
            iiChord = this.harmonyTheory.buildChord(scaleNotes[1], 'minor7', key);   // ii7
            vChord = this.harmonyTheory.buildChord(scaleNotes[4], 'dominant7', key); // V7
            iChord = this.harmonyTheory.buildChord(scaleNotes[0], 'major7', key);    // Imaj7
        } else {
            // 小调中的ii-V-i
            iiChord = this.harmonyTheory.buildChord(scaleNotes[1], 'minor7b5', key); // iiø7
            vChord = this.harmonyTheory.buildChord(scaleNotes[4], 'dominant7', key); // V7
            iChord = this.harmonyTheory.buildChord(scaleNotes[0], 'minor7', key);    // im7
        }

        return [iiChord, vChord, iChord];
    }

    /**
     * 应用三全音代理
     * @param {Array} progression - 原始进行
     * @param {string} key - 调性
     * @returns {Array} 应用代理后的进行
     */
    applyTritoneSubstitutions(progression, key) {
        return progression.map((chord, index) => {
            // 30% 概率应用三全音代理到属和弦
            if (chord.includes('V7') && Math.random() < 0.3) {
                const substitution = this.tritoneSubstitutions[chord.replace(/\/.*/, '')];
                if (substitution) {
                    return substitution;
                }
            }
            return chord;
        });
    }

    /**
     * 添加次属和弦
     * @param {Array} progression - 原始进行
     * @param {string} key - 调性
     * @returns {Array} 添加次属和弦后的进行
     */
    addSecondaryDominants(progression, key) {
        const keyInfo = this.harmonyTheory.keys[key];
        const mode = keyInfo.mode;
        const secondaries = this.secondaryDominants[mode];

        const newProgression = [];

        for (let i = 0; i < progression.length; i++) {
            const currentChord = progression[i];
            const nextChord = progression[i + 1];

            // 25% 概率在特定和弦前添加次属和弦
            if (nextChord && Math.random() < 0.25) {
                const secondaryKey = `V7/${nextChord.replace(/maj7|m7|7/, '')}`;
                if (secondaries[secondaryKey]) {
                    newProgression.push(secondaryKey);
                }
            }

            newProgression.push(currentChord);
        }

        return newProgression;
    }

    /**
     * 添加调式互换和弦
     * @param {Array} progression - 原始进行
     * @param {string} key - 调性
     * @returns {Array} 添加调式互换后的进行
     */
    addModalInterchange(progression, key) {
        const keyInfo = this.harmonyTheory.keys[key];
        const mode = keyInfo.mode;
        const interchange = this.modalInterchange[mode];

        return progression.map(chord => {
            // 15% 概率应用调式互换
            if (Math.random() < 0.15) {
                const degree = chord.replace(/maj7|m7|7|°/, '');
                if (interchange[degree]) {
                    return interchange[degree] + chord.replace(degree, '');
                }
            }
            return chord;
        });
    }

    /**
     * 将罗马数字转换为爵士和弦对象
     * @param {string} romanNumeral - 罗马数字标记
     * @param {string} key - 调性
     * @returns {Object} 爵士和弦对象
     */
    romanNumeralToJazzChord(romanNumeral, key) {
        // 处理特殊的爵士记号
        if (romanNumeral.includes('/')) {
            return this.parseSecondaryDominant(romanNumeral, key);
        }

        if (romanNumeral.startsWith('b')) {
            return this.parseModalInterchangeChord(romanNumeral, key);
        }

        // 使用基础方法，但扩展和弦类型
        const baseChord = this.harmonyTheory.romanNumeralToChord(romanNumeral, key);
        if (!baseChord) return null;

        // 为爵士和弦添加扩展
        return this.addJazzExtensions(baseChord, romanNumeral);
    }

    /**
     * 解析次属和弦
     * @param {string} romanNumeral - 包含次属的罗马数字
     * @param {string} key - 调性
     * @returns {Object} 次属和弦对象
     */
    parseSecondaryDominant(romanNumeral, key) {
        const [dominant, target] = romanNumeral.split('/');
        const keyInfo = this.harmonyTheory.keys[key];
        const scaleNotes = this.harmonyTheory.getScaleNotes(key);

        // 找到目标和弦的根音
        const targetDegree = this.parseDegree(target);
        if (targetDegree <= 0 || targetDegree > scaleNotes.length) return null;

        const targetRoot = scaleNotes[targetDegree - 1];
        const targetSemitone = this.harmonyTheory.noteToSemitone[targetRoot];

        // 属和弦在目标和弦上方五度
        const dominantSemitone = (targetSemitone + 7) % 12;
        const dominantRoot = this.harmonyTheory.semitoneToNote(dominantSemitone, keyInfo);

        return this.harmonyTheory.buildChord(dominantRoot, 'dominant7', key);
    }

    /**
     * 解析调式互换和弦
     * @param {string} romanNumeral - 包含降号的罗马数字
     * @param {string} key - 调性
     * @returns {Object} 调式互换和弦对象
     */
    parseModalInterchangeChord(romanNumeral, key) {
        // 移除降号并解析基础和弦
        const baseNumeral = romanNumeral.replace('b', '');
        const baseChord = this.harmonyTheory.romanNumeralToChord(baseNumeral, key);

        if (!baseChord) return null;

        // 将根音降低半音
        const originalSemitone = this.harmonyTheory.noteToSemitone[baseChord.root];
        const newSemitone = (originalSemitone - 1 + 12) % 12;
        const keyInfo = this.harmonyTheory.keys[key];
        const newRoot = this.harmonyTheory.semitoneToNote(newSemitone, keyInfo);

        return this.harmonyTheory.buildChord(newRoot, baseChord.type, key);
    }

    /**
     * 为和弦添加爵士扩展
     * @param {Object} chord - 基础和弦
     * @param {string} romanNumeral - 罗马数字标记
     * @returns {Object} 扩展和弦
     */
    addJazzExtensions(chord, romanNumeral) {
        // 根据罗马数字标记确定扩展
        let newType = chord.type;

        if (romanNumeral.includes('maj7')) {
            newType = 'major7';
        } else if (romanNumeral.includes('m7')) {
            newType = 'minor7';
        } else if (romanNumeral.includes('7')) {
            newType = 'dominant7';
        }

        // 添加更高级的扩展（根据复杂度）
        if (Math.random() < 0.3) {
            if (newType === 'major7') newType = 'major9';
            else if (newType === 'minor7') newType = 'minor9';
            else if (newType === 'dominant7') newType = 'dominant9';
        }

        // 重新构建和弦
        return this.harmonyTheory.buildChord(chord.root, newType, chord.key || 'C-major');
    }

    /**
     * 解析度数
     * @param {string} numeral - 罗马数字
     * @returns {number} 度数
     */
    parseDegree(numeral) {
        const degreeMap = {
            'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7,
            'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7
        };

        for (const [roman, degree] of Object.entries(degreeMap)) {
            if (numeral.startsWith(roman)) {
                return degree;
            }
        }

        return 0;
    }

    /**
     * 分析爵士和弦的张力音
     * @param {Object} chord - 爵士和弦
     * @returns {Array} 张力音分析
     */
    analyzeTensions(chord) {
        const tensions = [];
        const chordTones = [0, 2, 4, 6]; // 根音、三音、五音、七音

        chord.notes.forEach((note, index) => {
            if (index > 3) { // 九音及以上
                const intervalClass = (index * 2) % 12;
                let tensionName = '';

                switch (intervalClass) {
                    case 2: tensionName = '9th'; break;
                    case 4: tensionName = '11th'; break;
                    case 6: tensionName = '13th'; break;
                    case 1: tensionName = 'b9th'; break;
                    case 3: tensionName = '#9th'; break;
                    case 6: tensionName = '#11th'; break;
                    case 8: tensionName = 'b13th'; break;
                }

                if (tensionName) {
                    tensions.push({
                        note: note,
                        interval: tensionName,
                        function: this.getTensionFunction(tensionName, chord.type)
                    });
                }
            }
        });

        return tensions;
    }

    /**
     * 获取张力音功能
     * @param {string} tensionName - 张力音名称
     * @param {string} chordType - 和弦类型
     * @returns {string} 张力音功能
     */
    getTensionFunction(tensionName, chordType) {
        const functions = {
            '9th': chordType.includes('major') ? 'color' : 'consonant',
            '11th': chordType.includes('major') ? 'avoid' : 'consonant',
            '13th': 'color',
            'b9th': 'dissonant',
            '#9th': 'dissonant',
            '#11th': 'color',
            'b13th': 'dissonant'
        };

        return functions[tensionName] || 'neutral';
    }

    /**
     * 推荐和弦音阶
     * @param {Object} chord - 爵士和弦
     * @returns {Array} 推荐音阶列表
     */
    recommendScales(chord) {
        const chordType = chord.type;
        const relationships = this.chordScaleRelationships[chordType] || ['major'];

        return relationships.map(scale => ({
            name: scale,
            notes: this.generateScaleNotes(chord.root, scale),
            compatibility: this.calculateScaleCompatibility(chord, scale)
        }));
    }

    /**
     * 生成音阶音符
     * @param {string} root - 根音
     * @param {string} scaleName - 音阶名称
     * @returns {Array} 音阶音符
     */
    generateScaleNotes(root, scaleName) {
        const scaleIntervals = {
            'ionian': [0, 2, 4, 5, 7, 9, 11],
            'dorian': [0, 2, 3, 5, 7, 9, 10],
            'mixolydian': [0, 2, 4, 5, 7, 9, 10],
            'lydian': [0, 2, 4, 6, 7, 9, 11],
            'locrian': [0, 1, 3, 5, 6, 8, 10],
            'diminished': [0, 1, 3, 4, 6, 7, 9, 10],
            'whole_tone': [0, 2, 4, 6, 8, 10]
        };

        const intervals = scaleIntervals[scaleName] || scaleIntervals['ionian'];
        const rootSemitone = this.harmonyTheory.noteToSemitone[root];

        return intervals.map(interval => {
            const semitone = (rootSemitone + interval) % 12;
            return this.harmonyTheory.semitoneToNote(semitone, { sharps: 0, flats: 0 });
        });
    }

    /**
     * 计算音阶兼容性
     * @param {Object} chord - 和弦
     * @param {string} scaleName - 音阶名称
     * @returns {number} 兼容性评分 (0-100)
     */
    calculateScaleCompatibility(chord, scaleName) {
        // 基础兼容性评分
        const baseScores = {
            'ionian': 90,
            'dorian': 85,
            'mixolydian': 88,
            'lydian': 80,
            'locrian': 70,
            'diminished': 75,
            'whole_tone': 60
        };

        return baseScores[scaleName] || 70;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JazzHarmony;
} else {
    window.JazzHarmony = JazzHarmony;
}