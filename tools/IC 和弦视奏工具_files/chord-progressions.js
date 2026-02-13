/*!
 * IC Studio - 和弦进行生成器
 * Chord Progressions Generator with Markov Chains
 *
 * Copyright © 2026. All rights reserved. Igor Chen - icstudio.club
 *
 * Author: Igor Chen
 * Website: https://icstudio.club
 * Email: icstudio@fastmail.com
 */

/**
 * 和弦进行生成器类
 * 基于马尔可夫链和音乐理论规则生成合理的和弦进行
 */
class ChordProgressionGenerator {
    constructor(harmonyTheory) {
        this.harmonyTheory = harmonyTheory;

        // 经典和弦进行模板
        this.classicalProgressions = {
            major: [
                ['I', 'vi', 'IV', 'V'],          // 卡农进行
                ['I', 'V', 'vi', 'IV'],          // 流行进行
                ['I', 'IV', 'V', 'I'],           // 基本进行
                ['vi', 'IV', 'I', 'V'],          // 相对小调开始
                ['I', 'vi', 'ii', 'V'],          // 终止进行
                ['I', 'iii', 'vi', 'IV'],        // 变化进行
                ['IV', 'V', 'I', 'vi'],          // 下属开始
                ['I', 'ii', 'V', 'I']            // 完全终止
            ],
            minor: [
                ['i', 'VI', 'IV', 'V'],          // 小调标准
                ['i', 'v', 'VI', 'IV'],          // 哀愁进行
                ['i', 'III', 'VI', 'VII'],       // 自然小调
                ['i', 'iv', 'V', 'i'],           // 小调终止
                ['VI', 'VII', 'i', 'i'],         // 属-主进行
                ['i', 'ii°', 'V', 'i'],          // 和声小调
                ['i', 'VII', 'VI', 'VII'],       // 下行进行
                ['iv', 'i', 'V', 'i']            // 下属小调
            ]
        };

        // 爵士和弦进行模板
        this.jazzProgressions = {
            major: [
                ['Imaj7', 'vim7', 'iim7', 'V7'],        // ii-V-I 准备
                ['Imaj7', 'V7/ii', 'iim7', 'V7'],       // 次属和弦
                ['Imaj7', 'vim7', 'IVmaj7', 'V7'],      // 标准爵士
                ['iim7', 'V7', 'Imaj7', 'vim7'],        // ii-V-I 循环
                ['Imaj7', 'I7', 'IVmaj7', 'V7'],        // 属和弦变化
                ['vim7', 'ii7', 'V7', 'Imaj7'],         // 相对小调开始
                ['IVmaj7', 'V7', 'Imaj7', 'vim7'],      // 下属大调
                ['Imaj7', 'IIImaj7', 'VImaj7', 'iim7']  // 三度循环
            ],
            minor: [
                ['im7', 'iim7b5', 'V7', 'im7'],         // 小调 ii-V-i
                ['im7', 'iv7', 'VII7', 'VImaj7'],       // 模态进行
                ['im7', 'VImaj7', 'iim7b5', 'V7'],      // 小调标准
                ['VImaj7', 'VII7', 'im7', 'im7'],       // 自然小调爵士
                ['im7', 'V7/iv', 'iv7', 'VII7'],        // 次属小调
                ['iim7b5', 'V7', 'im7', 'VImaj7'],      // 和声小调爵士
                ['iv7', 'VII7', 'VImaj7', 'iim7b5'],    // 下行小调
                ['im7', 'IIImaj7', 'VImaj7', 'iim7b5']  // 三度小调
            ]
        };

        // 马尔可夫转移概率矩阵（基于巴赫作品分析）
        this.transitionMatrix = {
            major: {
                'I': { 'I': 0.15, 'ii': 0.12, 'iii': 0.08, 'IV': 0.25, 'V': 0.30, 'vi': 0.10 },
                'ii': { 'I': 0.05, 'ii': 0.10, 'iii': 0.05, 'IV': 0.15, 'V': 0.55, 'vi': 0.10 },
                'iii': { 'I': 0.20, 'ii': 0.10, 'iii': 0.05, 'IV': 0.35, 'V': 0.15, 'vi': 0.15 },
                'IV': { 'I': 0.35, 'ii': 0.15, 'iii': 0.05, 'IV': 0.10, 'V': 0.25, 'vi': 0.10 },
                'V': { 'I': 0.60, 'ii': 0.05, 'iii': 0.10, 'IV': 0.05, 'V': 0.10, 'vi': 0.10 },
                'vi': { 'I': 0.15, 'ii': 0.20, 'iii': 0.10, 'IV': 0.30, 'V': 0.15, 'vi': 0.10 }
            },
            minor: {
                'i': { 'i': 0.20, 'ii°': 0.10, 'III': 0.15, 'iv': 0.20, 'V': 0.25, 'VI': 0.10 },
                'ii°': { 'i': 0.10, 'ii°': 0.05, 'III': 0.10, 'iv': 0.15, 'V': 0.50, 'VI': 0.10 },
                'III': { 'i': 0.25, 'ii°': 0.05, 'III': 0.10, 'iv': 0.15, 'V': 0.20, 'VI': 0.25 },
                'iv': { 'i': 0.30, 'ii°': 0.15, 'III': 0.10, 'iv': 0.10, 'V': 0.25, 'VI': 0.10 },
                'V': { 'i': 0.55, 'ii°': 0.05, 'III': 0.10, 'iv': 0.10, 'V': 0.10, 'VI': 0.10 },
                'VI': { 'i': 0.20, 'ii°': 0.10, 'III': 0.15, 'iv': 0.25, 'V': 0.20, 'VI': 0.10 }
            }
        };

        // 爵士转移概率（更复杂的和声）
        this.jazzTransitionMatrix = {
            major: {
                'Imaj7': { 'Imaj7': 0.10, 'iim7': 0.20, 'iiim7': 0.10, 'IVmaj7': 0.20, 'V7': 0.25, 'vim7': 0.15 },
                'iim7': { 'Imaj7': 0.15, 'iim7': 0.05, 'iiim7': 0.05, 'IVmaj7': 0.10, 'V7': 0.55, 'vim7': 0.10 },
                'iiim7': { 'Imaj7': 0.20, 'iim7': 0.10, 'iiim7': 0.05, 'IVmaj7': 0.25, 'V7': 0.25, 'vim7': 0.15 },
                'IVmaj7': { 'Imaj7': 0.25, 'iim7': 0.15, 'iiim7': 0.10, 'IVmaj7': 0.10, 'V7': 0.30, 'vim7': 0.10 },
                'V7': { 'Imaj7': 0.50, 'iim7': 0.10, 'iiim7': 0.10, 'IVmaj7': 0.05, 'V7': 0.10, 'vim7': 0.15 },
                'vim7': { 'Imaj7': 0.15, 'iim7': 0.25, 'iiim7': 0.10, 'IVmaj7': 0.25, 'V7': 0.15, 'vim7': 0.10 }
            },
            minor: {
                'im7': { 'im7': 0.15, 'iim7b5': 0.20, 'IIImaj7': 0.15, 'iv7': 0.20, 'V7': 0.20, 'VImaj7': 0.10 },
                'iim7b5': { 'im7': 0.20, 'iim7b5': 0.05, 'IIImaj7': 0.10, 'iv7': 0.15, 'V7': 0.40, 'VImaj7': 0.10 },
                'IIImaj7': { 'im7': 0.25, 'iim7b5': 0.10, 'IIImaj7': 0.10, 'iv7': 0.20, 'V7': 0.20, 'VImaj7': 0.15 },
                'iv7': { 'im7': 0.30, 'iim7b5': 0.15, 'IIImaj7': 0.10, 'iv7': 0.10, 'V7': 0.25, 'VImaj7': 0.10 },
                'V7': { 'im7': 0.50, 'iim7b5': 0.10, 'IIImaj7': 0.10, 'iv7': 0.10, 'V7': 0.10, 'VImaj7': 0.10 },
                'VImaj7': { 'im7': 0.20, 'iim7b5': 0.15, 'IIImaj7': 0.15, 'iv7': 0.20, 'V7': 0.20, 'VImaj7': 0.10 }
            }
        };
    }

    /**
     * 生成和弦进行
     * @param {string} key - 调性
     * @param {number} numMeasures - 小节数
     * @param {Object} options - 生成选项
     * @returns {Array} 和弦进行数组
     */
    generateProgression(key, numMeasures, options = {}) {
        const {
            style = 'classical',        // 风格：'classical' 或 'jazz'
            includeInversions = false,  // 是否包含转位
            complexity = 'medium'       // 复杂度：'simple', 'medium', 'complex'
        } = options;

        const keyInfo = this.harmonyTheory.keys[key];
        if (!keyInfo) {
            throw new Error(`Unknown key: ${key}`);
        }

        let progression = [];

        // 根据风格选择生成方法
        if (style === 'jazz') {
            progression = this.generateJazzProgression(key, numMeasures, complexity);
        } else {
            progression = this.generateClassicalProgression(key, numMeasures, complexity);
        }

        // 转换为和弦对象
        const chordProgression = progression.map(romanNumeral => {
            const chord = this.harmonyTheory.romanNumeralToChord(romanNumeral, key);
            if (includeInversions && Math.random() < 0.3) {
                return this.addInversion(chord);
            }
            return chord;
        }).filter(chord => chord !== null);

        // 验证和弦进行的合理性
        if (!this.harmonyTheory.isValidProgression(chordProgression, key)) {
            console.warn('Generated progression may not follow traditional harmony rules');
        }

        return chordProgression;
    }

    /**
     * 检查和弦是否完全在调内
     * @param {Object} chord - 和弦对象
     * @param {string} key - 调性
     * @returns {boolean} 是否在调内
     */
    isChordInKey(chord, key) {
        if (!chord || !chord.notes) return false;
        const scaleNotes = this.harmonyTheory.getScaleNotes(key);
        return chord.notes.every(note => scaleNotes.includes(note));
    }


    /**
     * 生成经典风格和弦进行
     * @param {string} key - 调性
     * @param {number} numMeasures - 小节数
     * @param {string} complexity - 复杂度
     * @returns {Array} 罗马数字进行
     */
    generateClassicalProgression(key, numMeasures, complexity) {
        const keyInfo = this.harmonyTheory.keys[key];
        const mode = keyInfo.mode;
        const templates = this.classicalProgressions[mode];

        if (numMeasures <= 4) {
            // 短进行：选择模板
            const template = templates[Math.floor(Math.random() * templates.length)];
            return template.slice(0, numMeasures);
        } else {
            // 长进行：使用马尔可夫链
            return this.generateWithMarkovChain(mode, numMeasures, false);
        }
    }

    /**
     * 生成爵士风格和弦进行
     * @param {string} key - 调性
     * @param {number} numMeasures - 小节数
     * @param {string} complexity - 复杂度
     * @returns {Array} 罗马数字进行
     */
    generateJazzProgression(key, numMeasures, complexity) {
        const keyInfo = this.harmonyTheory.keys[key];
        const mode = keyInfo.mode;
        const templates = this.jazzProgressions[mode];

        if (numMeasures <= 4) {
            // 短进行：选择爵士模板
            const template = templates[Math.floor(Math.random() * templates.length)];
            return template.slice(0, numMeasures);
        } else {
            // 长进行：使用爵士马尔可夫链
            return this.generateWithMarkovChain(mode, numMeasures, true);
        }
    }

    /**
     * 使用马尔可夫链生成和弦进行
     * @param {string} mode - 调式 ('major' 或 'minor')
     * @param {number} numMeasures - 小节数
     * @param {boolean} isJazz - 是否为爵士风格
     * @returns {Array} 罗马数字进行
     */
    generateWithMarkovChain(mode, numMeasures, isJazz = false) {
        const matrix = isJazz ? this.jazzTransitionMatrix[mode] : this.transitionMatrix[mode];
        const chords = Object.keys(matrix);

        // 从主和弦开始
        let currentChord = mode === 'major' ? (isJazz ? 'Imaj7' : 'I') : (isJazz ? 'im7' : 'i');
        const progression = [currentChord];

        for (let i = 1; i < numMeasures; i++) {
            const probabilities = matrix[currentChord];
            if (!probabilities) {
                // 如果没有转移概率，回到主和弦
                currentChord = mode === 'major' ? (isJazz ? 'Imaj7' : 'I') : (isJazz ? 'im7' : 'i');
            } else {
                currentChord = this.weightedRandomChoice(probabilities);
            }
            progression.push(currentChord);
        }

        // 确保以主和弦结束
        if (progression[progression.length - 1] !== (mode === 'major' ? (isJazz ? 'Imaj7' : 'I') : (isJazz ? 'im7' : 'i'))) {
            progression[progression.length - 1] = mode === 'major' ? (isJazz ? 'Imaj7' : 'I') : (isJazz ? 'im7' : 'i');
        }

        return progression;
    }

    /**
     * 加权随机选择
     * @param {Object} probabilities - 概率分布对象
     * @returns {string} 选中的项
     */
    weightedRandomChoice(probabilities) {
        const random = Math.random();
        let cumulative = 0;

        for (const [item, probability] of Object.entries(probabilities)) {
            cumulative += probability;
            if (random <= cumulative) {
                return item;
            }
        }

        // 如果没有选中任何项，返回第一个
        return Object.keys(probabilities)[0];
    }

    /**
     * 为和弦添加转位
     * @param {Object} chord - 和弦对象
     * @returns {Object} 转位和弦
     */
    addInversion(chord) {
        if (!chord || !chord.notes || chord.notes.length < 3) {
            return chord;
        }

        // 挂和弦（sus2/sus4/7sus2/7sus4）不能使用转位，因为会改变挂留音特征
        if (chord.type && chord.type.includes('sus')) {
            console.log(`🚫 和弦进行生成器：跳过挂和弦 ${chord.root}${chord.type} 的转位处理`);
            return chord; // 挂和弦保持原位
        }

        const inversionType = Math.random() < 0.7 ? 1 : 2; // 70% 一转位，30% 二转位
        const notes = [...chord.notes];

        for (let i = 0; i < inversionType && i < notes.length - 1; i++) {
            const note = notes.shift();
            notes.push(note);
        }

        return {
            ...chord,
            notes: notes,
            inversion: inversionType,
            symbol: chord.root + chord.type + '/' + notes[0]
        };
    }

    /**
     * 分析和弦进行的和声功能
     * @param {Array} progression - 和弦进行
     * @param {string} key - 调性
     * @returns {Array} 功能分析结果
     */
    analyzeProgression(progression, key) {
        return progression.map((chord, index) => {
            const harmonicFunction = this.harmonyTheory.getHarmonicFunction(chord.romanNumeral, key);
            return {
                measure: index + 1,
                chord: chord,
                function: harmonicFunction,
                quality: this.getChordQuality(chord),
                voice_leading: index > 0 ? this.analyzeVoiceLeading(progression[index - 1], chord) : null
            };
        });
    }

    /**
     * 获取和弦性质
     * @param {Object} chord - 和弦对象
     * @returns {string} 和弦性质
     */
    getChordQuality(chord) {
        if (chord.type.includes('major')) return 'major';
        if (chord.type.includes('minor')) return 'minor';
        if (chord.type.includes('diminished')) return 'diminished';
        if (chord.type.includes('augmented')) return 'augmented';
        return 'unknown';
    }

    /**
     * 分析声部进行
     * @param {Object} chord1 - 第一个和弦
     * @param {Object} chord2 - 第二个和弦
     * @returns {Object} 声部进行分析
     */
    analyzeVoiceLeading(chord1, chord2) {
        // 计算根音运动
        const root1 = this.harmonyTheory.noteToSemitone[chord1.root];
        const root2 = this.harmonyTheory.noteToSemitone[chord2.root];
        const rootMotion = (root2 - root1 + 12) % 12;

        let motionType = 'other';
        if (rootMotion === 7) motionType = 'perfect_fifth_down';
        else if (rootMotion === 5) motionType = 'perfect_fourth_down';
        else if (rootMotion === 2) motionType = 'second_up';
        else if (rootMotion === 10) motionType = 'second_down';

        return {
            root_motion: rootMotion,
            motion_type: motionType,
            quality: this.evaluateVoiceLeading(motionType)
        };
    }

    /**
     * 评估声部进行质量
     * @param {string} motionType - 运动类型
     * @returns {string} 评估结果
     */
    evaluateVoiceLeading(motionType) {
        const strong = ['perfect_fifth_down', 'perfect_fourth_down'];
        const good = ['second_up', 'second_down'];

        if (strong.includes(motionType)) return 'strong';
        if (good.includes(motionType)) return 'good';
        return 'weak';
    }

    /**
     * 获取推荐的下一个和弦
     * @param {Object} currentChord - 当前和弦
     * @param {string} key - 调性
     * @param {string} style - 风格
     * @returns {Array} 推荐和弦数组
     */
    getRecommendedNextChords(currentChord, key, style = 'classical') {
        const keyInfo = this.harmonyTheory.keys[key];
        const mode = keyInfo.mode;
        const isJazz = style === 'jazz';

        const matrix = isJazz ? this.jazzTransitionMatrix[mode] : this.transitionMatrix[mode];
        const probabilities = matrix[currentChord.romanNumeral];

        if (!probabilities) return [];

        // 排序并返回前三个最可能的和弦
        const sortedChords = Object.entries(probabilities)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([romanNumeral, probability]) => ({
                chord: this.harmonyTheory.romanNumeralToChord(romanNumeral, key),
                probability: probability
            }));

        return sortedChords;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChordProgressionGenerator;
} else {
    window.ChordProgressionGenerator = ChordProgressionGenerator;
}