/**
 * Cognote 钢琴和弦进行生成器
 * Piano Chord Progression Generator - 完全独立的钢琴和弦进行生成系统
 *
 * 专门为钢琴设计的和弦进行生成器，与吉他系统完全分离
 *
 * @version 1.0.0
 * @author Cognote
 */

class PianoChordProgressionGenerator {
    constructor() {
        this.logPrefix = '🎹 [Piano Progression]';

        // 钢琴特有的和弦进行模式
        this.pianoProgressionPatterns = {
            // 古典钢琴进行
            classical: {
                4: [
                    ['I', 'vi', 'IV', 'V'],
                    ['I', 'V', 'vi', 'IV'],
                    ['vi', 'IV', 'I', 'V'],
                    ['I', 'iii', 'vi', 'IV'],
                    ['I', 'vi', 'ii', 'V7']
                ],
                2: [
                    ['I', 'V'],
                    ['vi', 'IV'],
                    ['ii', 'V7'],
                    ['I', 'vi']
                ]
            },

            // 爵士钢琴进行
            jazz: {
                4: [
                    ['Imaj7', 'vi7', 'ii7', 'V7'],
                    ['Imaj7', 'VImaj7', 'ii7', 'V7'],
                    ['vi7', 'ii7', 'V7', 'Imaj7'],
                    ['Imaj7', 'V7/vi', 'vi7', 'V7'],
                    ['ii7', 'V7', 'Imaj7', 'VImaj7']
                ],
                2: [
                    ['ii7', 'V7'],
                    ['Imaj7', 'VImaj7'],
                    ['vi7', 'ii7']
                ]
            },

            // 现代钢琴进行
            contemporary: {
                4: [
                    ['Iadd9', 'vsus4', 'VIsus2', 'IVadd9'],
                    ['Imaj9', 'vii7b5', 'VImaj7', 'V7sus4'],
                    ['vi9', 'IVmaj7', 'Isus2', 'V7alt'],
                    ['Imaj7#11', 'vi7', 'IVmaj9', 'V13']
                ],
                2: [
                    ['Iadd9', 'Vsus4'],
                    ['vi9', 'IVmaj7'],
                    ['ii11', 'V7alt']
                ]
            }
        };

        // 钢琴权重配置（钢琴演奏友好性）
        this.pianoChordWeights = {
            // 基础三和弦 - 钢琴表现最佳
            'major': 8,
            'minor': 8,
            'diminished': 4,
            'augmented': 2,

            // 七和弦 - 钢琴经典声音
            'major7': 7,
            'minor7': 7,
            'dominant7': 6,
            'minor7b5': 4,

            // 扩展和弦 - 钢琴表现力丰富
            'major9': 5,
            'minor9': 5,
            'major11': 3,
            'minor11': 3,
            'major13': 4,
            'minor13': 4,

            // 挂和弦 - 钢琴声色效果好
            'sus2': 3,
            'sus4': 4,
            '7sus2': 3,
            '7sus4': 4,

            // 变化和弦 - 钢琴高级技巧
            'add9': 4,
            'add11': 2,
            'altered': 2,
            '7#11': 3,
            '7b5': 2
        };

        console.log(`${this.logPrefix} 钢琴和弦进行生成器已创建`);
    }

    /**
     * 生成钢琴和弦进行（主入口）
     */
    generatePianoProgression(key, measures, options = {}) {
        console.log(`${this.logPrefix} 开始生成钢琴和弦进行 - ${key}, ${measures}小节`);

        const style = options.style || 'classical';
        const useFunctionalHarmony = options.useFunctionalHarmony || false;

        let progression;

        if (useFunctionalHarmony) {
            progression = this.generateFunctionalProgression(key, measures, style);
        } else {
            progression = this.generateRandomProgression(key, measures, options);
        }

        // 应用钢琴特有的和弦处理
        progression = this.applyPianoProcessing(progression, key, options);

        console.log(`${this.logPrefix} 生成完成，共${progression.length}个和弦`);
        return progression;
    }

    /**
     * 生成功能和声进行
     */
    generateFunctionalProgression(key, measures, style = 'classical') {
        console.log(`${this.logPrefix} 生成功能和声进行 - ${style}风格`);

        const patterns = this.pianoProgressionPatterns[style];
        if (!patterns || !patterns[measures]) {
            console.warn(`${this.logPrefix} 未找到${style}风格的${measures}小节模式，使用古典风格`);
            return this.generateFunctionalProgression(key, measures, 'classical');
        }

        const availablePatterns = patterns[measures];
        const selectedPattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];

        console.log(`${this.logPrefix} 选择模式: ${selectedPattern.join(' - ')}`);

        const progression = [];
        const keyInfo = this.parseKey(key);

        selectedPattern.forEach((romanNumeral, index) => {
            const chord = this.buildChordFromRoman(romanNumeral, keyInfo, style);
            if (chord) {
                progression.push(chord);
                console.log(`${this.logPrefix} 和弦${index + 1}: ${chord.root}${chord.type}`);
            }
        });

        // 🔧 新增 (2025-10-03): 应用功能和声转位规则
        // 让钢琴模式遵守与吉他模式相同的音乐理论规则（7种转位规则）
        const shouldApplyInversions = this.checkInversionSettings();

        if (shouldApplyInversions && typeof applyFunctionalInversions === 'function') {
            console.log(`${this.logPrefix} 应用功能和声转位规则...`);

            // 获取完整的 keyInfo（包含 sharps, flats）
            const fullKeyInfo = this.getFullKeyInfo(key);

            if (fullKeyInfo) {
                const progressionWithInversions = applyFunctionalInversions(progression, fullKeyInfo);
                console.log(`${this.logPrefix} 功能和声转位规则应用完成`);
                return progressionWithInversions;
            } else {
                console.warn(`${this.logPrefix} 无法获取完整 keyInfo，跳过转位规则`);
            }
        } else {
            console.log(`${this.logPrefix} 转位规则未启用或函数不可用，保持原位`);
        }

        return progression;
    }

    /**
     * 生成随机和弦进行
     */
    generateRandomProgression(key, measures, options = {}) {
        console.log(`${this.logPrefix} 生成随机和弦进行`);

        const progression = [];
        const keyInfo = this.parseKey(key);
        const scaleNotes = this.getScaleNotes(key);
        const allowedChordTypes = options.chordTypes || ['major', 'minor', 'major7', 'minor7'];

        console.log(`${this.logPrefix} 调性: ${key}, 音阶: ${scaleNotes.join(', ')}`);

        for (let i = 0; i < measures; i++) {
            // 选择根音
            const rootNote = this.selectPianoFriendlyRoot(scaleNotes, progression, i);

            // 选择和弦类型
            const chordType = this.selectPianoChordType(allowedChordTypes, rootNote, keyInfo, i);

            // 构建和弦
            const chord = this.buildPianoChord(rootNote, chordType, keyInfo);

            if (chord) {
                progression.push(chord);
                console.log(`${this.logPrefix} 和弦${i + 1}: ${chord.root}${chord.type}`);
            }
        }

        return progression;
    }

    /**
     * 选择钢琴友好的根音
     */
    selectPianoFriendlyRoot(scaleNotes, existingProgression, position) {
        // 钢琴演奏中，某些根音在特定位置更常见
        if (position === 0) {
            // 第一个和弦倾向于使用主音或属音
            const preferredRoots = [scaleNotes[0], scaleNotes[4]]; // I和V
            return preferredRoots[Math.floor(Math.random() * preferredRoots.length)];
        }

        if (position === existingProgression.length - 1) {
            // 最后一个和弦倾向于回到主音
            return Math.random() < 0.7 ? scaleNotes[0] : scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
        }

        // 中间位置随机选择
        return scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
    }

    /**
     * 选择钢琴适合的和弦类型
     */
    selectPianoChordType(allowedTypes, rootNote, keyInfo, position) {
        // 基于钢琴权重选择和弦类型
        const weightedTypes = [];

        allowedTypes.forEach(type => {
            const weight = this.pianoChordWeights[type] || 1;
            for (let i = 0; i < weight; i++) {
                weightedTypes.push(type);
            }
        });

        // 根据调性和位置调整选择
        let selectedType = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];

        // 钢琴特有的和弦选择逻辑
        if (keyInfo.mode === 'minor') {
            if (rootNote === keyInfo.root && selectedType === 'major') {
                selectedType = Math.random() < 0.8 ? 'minor' : 'minor7';
            }
        }

        return selectedType;
    }

    /**
     * 构建钢琴和弦
     */
    buildPianoChord(root, type, keyInfo) {
        // 钢琴和弦定义（更丰富的扩展和弦）
        const chordDefinitions = {
            // 基础三和弦
            'major': [0, 4, 7],
            'minor': [0, 3, 7],
            'diminished': [0, 3, 6],
            'augmented': [0, 4, 8],

            // 七和弦
            'major7': [0, 4, 7, 11],
            'minor7': [0, 3, 7, 10],
            'dominant7': [0, 4, 7, 10],
            'minor7b5': [0, 3, 6, 10],

            // 九和弦
            'major9': [0, 4, 7, 11, 14],
            'minor9': [0, 3, 7, 10, 14],
            'dominant9': [0, 4, 7, 10, 14],

            // 十一和弦
            'major11': [0, 4, 7, 11, 14, 17],
            'minor11': [0, 3, 7, 10, 14, 17],

            // 十三和弦
            'major13': [0, 4, 7, 11, 14, 21],
            'minor13': [0, 3, 7, 10, 14, 21],

            // 挂和弦
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7],
            '7sus2': [0, 2, 7, 10],
            '7sus4': [0, 5, 7, 10],

            // 加音和弦
            'add9': [0, 4, 7, 14],
            'add11': [0, 4, 7, 17],

            // 变化和弦
            'altered': [0, 4, 6, 10, 13, 15],
            '7#11': [0, 4, 7, 10, 18],
            '7b5': [0, 4, 6, 10]
        };

        const intervals = chordDefinitions[type];
        if (!intervals) {
            console.warn(`${this.logPrefix} 未知和弦类型: ${type}`);
            return null;
        }

        // 🔧 修复：根据调号选择合适的半音阶拼写
        const keyString = `${keyInfo.root}-${keyInfo.mode}`;
        const useFlats = keyString.includes('b') || keyString.includes('♭') ||
                       ['F-major', 'Bb-major', 'Eb-major', 'Ab-major', 'Db-major', 'Gb-major',
                        'd-minor', 'g-minor', 'c-minor', 'f-minor', 'bb-minor', 'eb-minor'].includes(keyString);

        const chromatic = useFlats ?
            ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] :
            ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const rootIndex = chromatic.indexOf(root);

        const notes = intervals.map(interval => {
            const noteIndex = (rootIndex + interval) % 12;
            return chromatic[noteIndex];
        });

        return {
            root: root,
            type: type,
            notes: notes,
            intervals: intervals,
            instrument: 'piano',
            complexity: this.calculateChordComplexity(intervals),
            pianoFriendly: this.evaluatePianoFriendliness(intervals)
        };
    }

    /**
     * 从罗马数字构建和弦
     */
    buildChordFromRoman(romanNumeral, keyInfo, style = 'classical') {
        // 解析罗马数字
        const romanData = this.parseRomanNumeral(romanNumeral);
        if (!romanData) return null;

        const scaleNotes = this.getScaleNotes(`${keyInfo.root}-${keyInfo.mode}`);
        const root = scaleNotes[romanData.degree];

        return this.buildPianoChord(root, romanData.chordType, keyInfo);
    }

    /**
     * 解析罗马数字
     */
    parseRomanNumeral(romanNumeral) {
        // 钢琴扩展的罗马数字解析
        const romanMap = {
            // 基础罗马数字
            'I': { degree: 0, chordType: 'major' },
            'ii': { degree: 1, chordType: 'minor' },
            'iii': { degree: 2, chordType: 'minor' },
            'IV': { degree: 3, chordType: 'major' },
            'V': { degree: 4, chordType: 'major' },
            'vi': { degree: 5, chordType: 'minor' },
            'vii°': { degree: 6, chordType: 'diminished' },

            // 七和弦
            'Imaj7': { degree: 0, chordType: 'major7' },
            'ii7': { degree: 1, chordType: 'minor7' },
            'iii7': { degree: 2, chordType: 'minor7' },
            'IVmaj7': { degree: 3, chordType: 'major7' },
            'V7': { degree: 4, chordType: 'dominant7' },
            'vi7': { degree: 5, chordType: 'minor7' },
            'vii7b5': { degree: 6, chordType: 'minor7b5' },

            // 扩展和弦
            'Imaj9': { degree: 0, chordType: 'major9' },
            'ii9': { degree: 1, chordType: 'minor9' },
            'V9': { degree: 4, chordType: 'dominant9' },

            // 挂和弦
            'Isus4': { degree: 0, chordType: 'sus4' },
            'Vsus4': { degree: 4, chordType: 'sus4' },
            'V7sus4': { degree: 4, chordType: '7sus4' },

            // 加音和弦
            'Iadd9': { degree: 0, chordType: 'add9' },
            'IVadd9': { degree: 3, chordType: 'add9' }
        };

        return romanMap[romanNumeral] || null;
    }

    /**
     * 应用钢琴特有的处理
     */
    applyPianoProcessing(progression, key, options = {}) {
        console.log(`${this.logPrefix} 应用钢琴特有处理`);

        // 添加钢琴特有的元数据
        return progression.map((chord, index) => {
            return {
                ...chord,
                position: index,
                pianoMetadata: {
                    handSeparation: this.suggestHandSeparation(chord),
                    pedalRecommendation: this.suggestPedalUse(chord, index, progression.length),
                    voicingPriority: this.suggestVoicingPriority(chord, index),
                    dynamicSuggestion: this.suggestDynamics(chord, index, progression.length)
                }
            };
        });
    }

    /**
     * 建议左右手分工
     */
    suggestHandSeparation(chord) {
        if (chord.notes.length <= 3) {
            return { leftHand: [chord.notes[0]], rightHand: chord.notes.slice(1) };
        } else {
            const mid = Math.floor(chord.notes.length / 2);
            return {
                leftHand: chord.notes.slice(0, mid),
                rightHand: chord.notes.slice(mid)
            };
        }
    }

    /**
     * 建议踏板使用
     */
    suggestPedalUse(chord, position, totalChords) {
        return {
            sustain: true,
            soft: position === 0 || position === totalChords - 1,
            sostenuto: chord.complexity > 4
        };
    }

    /**
     * 建议voicing优先级
     */
    suggestVoicingPriority(chord, position) {
        if (position === 0 || position === 3) {
            return ['close', 'open']; // 开始和结束位置使用稳定voicing
        } else {
            return ['rootless', 'shell']; // 中间位置可以使用更有色彩的voicing
        }
    }

    /**
     * 建议力度变化
     */
    suggestDynamics(chord, position, totalChords) {
        if (position === 0) return 'mp'; // 中弱开始
        if (position === totalChords - 1) return 'mf'; // 中强结束
        return ['mp', 'mf', 'f'][Math.floor(Math.random() * 3)]; // 中间随机变化
    }

    /**
     * 计算和弦复杂度
     */
    calculateChordComplexity(intervals) {
        return intervals.length + (intervals.some(i => i > 12) ? 2 : 0);
    }

    /**
     * 评估钢琴友好度
     */
    evaluatePianoFriendliness(intervals) {
        const span = Math.max(...intervals) - Math.min(...intervals);
        return {
            friendly: span <= 24, // 两个八度内
            span: span,
            recommendation: span <= 12 ? 'excellent' : span <= 24 ? 'good' : 'challenging'
        };
    }

    /**
     * 解析调性
     */
    parseKey(key) {
        const parts = key.split('-');
        return { root: parts[0], mode: parts[1] || 'major' };
    }

    /**
     * 获取音阶音符
     */
    getScaleNotes(key) {
        const keyInfo = this.parseKey(key);

        // 🔧 修复：根据调号选择合适的半音阶拼写
        const useFlats = key.includes('b') || key.includes('♭') ||
                       ['F-major', 'Bb-major', 'Eb-major', 'Ab-major', 'Db-major', 'Gb-major',
                        'd-minor', 'g-minor', 'c-minor', 'f-minor', 'bb-minor', 'eb-minor'].includes(key);

        const chromatic = useFlats ?
            ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] :
            ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
        const minorIntervals = [0, 2, 3, 5, 7, 8, 10];

        const rootIndex = chromatic.indexOf(keyInfo.root);
        const intervals = keyInfo.mode === 'major' ? majorIntervals : minorIntervals;

        return intervals.map(interval => {
            const noteIndex = (rootIndex + interval) % 12;
            return chromatic[noteIndex];
        });
    }

    /**
     * 检查用户是否启用转位设置
     * 🔧 新增 (2025-10-03): 支持功能和声转位规则
     */
    checkInversionSettings() {
        // 检查用户是否勾选了转位（三和弦转位或七和弦转位）
        const triadInversionCheckbox = document.getElementById('triad-inversion');
        const seventhInversionCheckbox = document.getElementById('seventh-inversion');

        const triadInversionEnabled = triadInversionCheckbox && triadInversionCheckbox.checked;
        const seventhInversionEnabled = seventhInversionCheckbox && seventhInversionCheckbox.checked;

        const inversionEnabled = triadInversionEnabled || seventhInversionEnabled;

        console.log(`${this.logPrefix} 转位设置检查: 三和弦=${triadInversionEnabled}, 七和弦=${seventhInversionEnabled}`);

        return inversionEnabled;
    }

    /**
     * 获取完整的 keyInfo（包含 sharps, flats）
     * 🔧 新增 (2025-10-03): 为 applyFunctionalInversions 提供正确格式
     */
    getFullKeyInfo(key) {
        // 方法1: 尝试使用 window.harmonyTheory.keys
        if (window.harmonyTheory && window.harmonyTheory.keys && window.harmonyTheory.keys[key]) {
            const fullKeyInfo = window.harmonyTheory.keys[key];
            console.log(`${this.logPrefix} 使用 harmonyTheory.keys 获取 keyInfo:`, fullKeyInfo);
            return fullKeyInfo;
        }

        // 方法2: 手动构建 keyInfo
        const keyInfo = this.parseKey(key);
        console.log(`${this.logPrefix} 手动构建 keyInfo for ${key}`);

        // 简单的 sharps/flats 映射（基于调号理论）
        const sharpKeys = {
            'G-major': 1, 'e-minor': 1,
            'D-major': 2, 'b-minor': 2,
            'A-major': 3, 'f#-minor': 3,
            'E-major': 4, 'c#-minor': 4,
            'B-major': 5, 'g#-minor': 5,
            'F#-major': 6, 'd#-minor': 6,
            'C#-major': 7, 'a#-minor': 7
        };

        const flatKeys = {
            'F-major': 1, 'd-minor': 1,
            'Bb-major': 2, 'g-minor': 2,
            'Eb-major': 3, 'c-minor': 3,
            'Ab-major': 4, 'f-minor': 4,
            'Db-major': 5, 'bb-minor': 5,
            'Gb-major': 6, 'eb-minor': 6,
            'Cb-major': 7, 'ab-minor': 7
        };

        const sharps = sharpKeys[key] || 0;
        const flats = flatKeys[key] || 0;

        return {
            tonic: keyInfo.root,
            mode: keyInfo.mode,
            sharps: sharps,
            flats: flats
        };
    }
}

// 全局钢琴和弦进行生成器实例
let pianoChordProgressionGenerator = null;

/**
 * 初始化钢琴和弦进行生成器
 */
function initializePianoChordProgressionGenerator() {
    if (!pianoChordProgressionGenerator) {
        pianoChordProgressionGenerator = new PianoChordProgressionGenerator();
        console.log('🎹 钢琴和弦进行生成器初始化完成');
    }
    return pianoChordProgressionGenerator;
}

/**
 * 获取钢琴和弦进行生成器实例
 */
function getPianoChordProgressionGenerator() {
    return pianoChordProgressionGenerator || initializePianoChordProgressionGenerator();
}

// 在页面加载时自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePianoChordProgressionGenerator);
} else {
    initializePianoChordProgressionGenerator();
}