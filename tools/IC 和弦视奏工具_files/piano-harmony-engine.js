/**
 * Cognote 钢琴和声引擎
 * Piano Harmony Engine - 完全独立的钢琴和声生成系统
 *
 * 与吉他系统完全隔离，专门为钢琴演奏设计
 *
 * @version 1.0.0
 * @author Cognote
 */

class PianoHarmonyEngine {
    constructor() {
        this.logPrefix = '🎹 [Piano Harmony]';

        // 钢琴专用和声理论
        this.pianoHarmonyTheory = {
            // 钢琴音域和键位理论
            keyboardLayout: {
                octaveRange: 8,
                totalKeys: 88,
                midiRange: { min: 21, max: 108 }
            },

            // 钢琴特有的调性偏好
            keyPreferences: {
                easy: ['C-major', 'G-major', 'D-major', 'A-major', 'F-major'],
                medium: ['E-major', 'B-major', 'Bb-major', 'Eb-major'],
                advanced: ['Db-major', 'Ab-major', 'F#-major', 'C#-major']
            },

            // 钢琴和弦类型偏好（适合钢琴演奏的）
            preferredChordTypes: {
                basic: ['major', 'minor', 'diminished'],
                seventh: ['major7', 'minor7', 'dominant7', 'minor7b5'],
                extended: ['major9', 'minor9', 'dominant9', 'minor11'],
                jazz: ['major13', 'minor13', 'dominant13', 'altered']
            },

            // 钢琴特有的voicing偏好
            voicingStyles: {
                classical: ['close', 'open'],
                jazz: ['rootless', 'quartal', 'clusters'],
                contemporary: ['spread', 'hybrid', 'layered']
            }
        };

        // 钢琴专用设置
        this.pianoSettings = {
            keys: ['C-major', 'G-major', 'D-major', 'A-major', 'F-major', 'Bb-major', 'Eb-major'],
            chordTypes: ['major', 'minor', 'major7', 'minor7', 'dominant7'],
            complexity: 'medium',
            useFunctionalHarmony: false,
            voicingStyle: 'classical',
            handSeparation: true, // 钢琴特有：左右手分工
            pedalConsideration: true // 钢琴特有：踏板考虑
        };

        console.log(`${this.logPrefix} 钢琴和声引擎已创建`);
    }

    /**
     * 钢琴专用：生成功能和声进行
     */
    generatePianoFunctionalProgression(key, measures) {
        console.log(`${this.logPrefix} 生成钢琴功能和声进行 - ${key}, ${measures}小节`);

        const progression = [];
        const keyInfo = this.parseKey(key);

        // 钢琴功能和声模式（与吉他不同的进行偏好）
        const pianoProgressionPatterns = {
            4: [
                ['I', 'vi', 'IV', 'V'],      // 经典流行进行
                ['I', 'V', 'vi', 'IV'],     // 变体
                ['vi', 'IV', 'I', 'V'],     // 小调开始
                ['I', 'iii', 'vi', 'IV'],   // 温和进行
                ['I', 'vi', 'ii', 'V']      // 爵士倾向
            ],
            2: [
                ['I', 'V'],
                ['vi', 'IV'],
                ['ii', 'V']
            ]
        };

        const patterns = pianoProgressionPatterns[measures] || pianoProgressionPatterns[4];
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];

        console.log(`${this.logPrefix} 选择进行模式: ${selectedPattern.join(' - ')}`);

        // 生成和弦
        selectedPattern.forEach((romanNumeral, index) => {
            const chord = this.buildPianoChordFromRoman(romanNumeral, keyInfo);
            if (chord) {
                progression.push(chord);
                console.log(`${this.logPrefix} 生成和弦 ${index + 1}: ${chord.root}${chord.type}`);
            }
        });

        return progression;
    }

    /**
     * 钢琴专用：生成多样化和声进行
     */
    generatePianoDiverseProgression(key, measures) {
        console.log(`${this.logPrefix} 生成钢琴多样化进行 - ${key}, ${measures}小节`);

        const progression = [];
        const keyInfo = this.parseKey(key);
        const scaleNotes = this.getScaleNotes(key);

        console.log(`${this.logPrefix} ${key} 音阶: ${scaleNotes.join(', ')}`);

        // 钢琴偏好的和弦类型分布
        const pianoChordTypes = this.getPianoChordTypeDistribution();

        for (let i = 0; i < measures; i++) {
            // 随机选择根音
            const rootNote = scaleNotes[Math.floor(Math.random() * scaleNotes.length)];

            // 根据钢琴特性选择和弦类型
            const chordType = this.selectPianoChordType(pianoChordTypes, rootNote, keyInfo);

            // 构建和弦
            const chord = this.buildPianoChord(rootNote, chordType, keyInfo);

            if (chord) {
                progression.push(chord);
                console.log(`${this.logPrefix} 生成和弦 ${i + 1}: ${chord.root}${chord.type}`);
            }
        }

        return progression;
    }

    /**
     * 解析调性信息
     */
    parseKey(key) {
        const parts = key.split('-');
        return {
            root: parts[0],
            mode: parts[1] || 'major'
        };
    }

    /**
     * 获取调性音阶
     */
    getScaleNotes(key) {
        const keyInfo = this.parseKey(key);
        const root = keyInfo.root;
        const mode = keyInfo.mode;

        // 🔧 修复：使用调号感知的音阶生成
        if (this.harmonyTheory && typeof this.harmonyTheory.getNoteArrayForKey === 'function') {
            const standardKey = `${root}-${mode}`;
            const chromaticForKey = this.harmonyTheory.getNoteArrayForKey(standardKey);
            const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
            const minorIntervals = [0, 2, 3, 5, 7, 8, 10];

            const rootIndex = chromaticForKey.indexOf(root);
            const intervals = mode === 'major' ? majorIntervals : minorIntervals;

            return intervals.map(interval => {
                const noteIndex = (rootIndex + interval) % 12;
                return chromaticForKey[noteIndex];
            });
        } else {
            // 🔧 修复：降级处理也尽量考虑调号
            console.warn(`${this.logPrefix} harmonyTheory不可用，使用降级音阶生成`);

            // 根据调性选择合适的半音阶
            const keyString = `${root}-${mode}`;
            const useFlats = keyString.includes('b') || keyString.includes('♭') ||
                           ['F-major', 'Bb-major', 'Eb-major', 'Ab-major', 'Db-major', 'Gb-major',
                            'd-minor', 'g-minor', 'c-minor', 'f-minor', 'bb-minor', 'eb-minor'].includes(keyString);

            const chromatic = useFlats ?
                ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] :
                ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

            const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
            const minorIntervals = [0, 2, 3, 5, 7, 8, 10];

            const rootIndex = chromatic.indexOf(root);
            const intervals = mode === 'major' ? majorIntervals : minorIntervals;

            return intervals.map(interval => {
                const noteIndex = (rootIndex + interval) % 12;
                return chromatic[noteIndex];
            });
        }
    }

    /**
     * 获取钢琴偏好的和弦类型分布
     */
    getPianoChordTypeDistribution() {
        // 钢琴演奏友好的和弦类型权重
        return [
            ...Array(3).fill('major'),      // 大三和弦：钢琴最自然
            ...Array(3).fill('minor'),      // 小三和弦：钢琴最自然
            ...Array(2).fill('major7'),     // 大七和弦：钢琴表现优秀
            ...Array(2).fill('minor7'),     // 小七和弦：钢琴表现优秀
            ...Array(2).fill('dominant7'),  // 属七和弦：钢琴经典
            'diminished',                   // 减和弦：钢琴可以很好表现
            'minor7b5',                     // 半减七：爵士钢琴常用
            'major9',                       // 大九和弦：钢琴扩展和声
            'minor9'                        // 小九和弦：钢琴扩展和声
        ];
    }

    /**
     * 选择钢琴适合的和弦类型
     */
    selectPianoChordType(typePool, rootNote, keyInfo) {
        // 根据根音和调性智能选择适合钢琴的和弦类型
        const randomType = typePool[Math.floor(Math.random() * typePool.length)];

        // 钢琴特有的和弦选择逻辑
        if (keyInfo.mode === 'minor') {
            // 小调中优先使用小和弦
            if (rootNote === keyInfo.root && Math.random() < 0.8) {
                return Math.random() < 0.5 ? 'minor' : 'minor7';
            }
        } else {
            // 大调中在主音优先使用大和弦
            if (rootNote === keyInfo.root && Math.random() < 0.8) {
                return Math.random() < 0.5 ? 'major' : 'major7';
            }
        }

        return randomType;
    }

    /**
     * 构建钢琴和弦
     */
    buildPianoChord(root, type, keyInfo) {
        // 钢琴专用的和弦构建逻辑
        const chordDefinitions = {
            'major': [0, 4, 7],
            'minor': [0, 3, 7],
            'diminished': [0, 3, 6],
            'augmented': [0, 4, 8],
            'major7': [0, 4, 7, 11],
            'minor7': [0, 3, 7, 10],
            'dominant7': [0, 4, 7, 10],
            'minor7b5': [0, 3, 6, 10],
            'major9': [0, 4, 7, 11, 14],
            'minor9': [0, 3, 7, 10, 14]
        };

        const intervals = chordDefinitions[type];
        if (!intervals) {
            console.warn(`${this.logPrefix} 未知和弦类型: ${type}`);
            return null;
        }

        // 🔧 修复：生成调号感知的音符
        let notes;
        if (this.harmonyTheory && typeof this.harmonyTheory.getNoteArrayForKey === 'function') {
            const standardKey = `${keyInfo.root}-${keyInfo.mode}`;
            const chromaticForKey = this.harmonyTheory.getNoteArrayForKey(standardKey);
            const rootIndex = chromaticForKey.indexOf(root);

            notes = intervals.map(interval => {
                const noteIndex = (rootIndex + interval) % 12;
                return chromaticForKey[noteIndex];
            });
        } else {
            // 🔧 修复：降级处理也尽量考虑调号
            console.warn(`${this.logPrefix} harmonyTheory不可用，使用降级和弦生成`);

            // 根据调性选择合适的半音阶
            const keyString = `${keyInfo.root}-${keyInfo.mode}`;
            const useFlats = keyString.includes('b') || keyString.includes('♭') ||
                           ['F-major', 'Bb-major', 'Eb-major', 'Ab-major', 'Db-major', 'Gb-major',
                            'd-minor', 'g-minor', 'c-minor', 'f-minor', 'bb-minor', 'eb-minor'].includes(keyString);

            const chromatic = useFlats ?
                ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] :
                ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

            const rootIndex = chromatic.indexOf(root);

            notes = intervals.map(interval => {
                const noteIndex = (rootIndex + interval) % 12;
                return chromatic[noteIndex];
            });
        }

        return {
            root: root,
            type: type,
            notes: notes,
            intervals: intervals,
            instrument: 'piano' // 标识这是钢琴和弦
        };
    }

    /**
     * 从罗马数字构建钢琴和弦
     */
    buildPianoChordFromRoman(romanNumeral, keyInfo) {
        // 钢琴功能和声的罗马数字解析
        const romanMap = {
            'I': { degree: 0, type: 'major' },
            'ii': { degree: 1, type: 'minor' },
            'iii': { degree: 2, type: 'minor' },
            'IV': { degree: 3, type: 'major' },
            'V': { degree: 4, type: 'major' },
            'vi': { degree: 5, type: 'minor' },
            'vii°': { degree: 6, type: 'diminished' }
        };

        const chordInfo = romanMap[romanNumeral];
        if (!chordInfo) {
            console.warn(`${this.logPrefix} 未知罗马数字: ${romanNumeral}`);
            return null;
        }

        const scaleNotes = this.getScaleNotes(`${keyInfo.root}-${keyInfo.mode}`);
        const root = scaleNotes[chordInfo.degree];

        // 钢琴倾向于使用七和弦
        let chordType = chordInfo.type;
        if (Math.random() < 0.4) { // 40%概率使用七和弦
            chordType = chordType === 'major' ? 'major7' :
                       chordType === 'minor' ? 'minor7' :
                       chordType === 'diminished' ? 'minor7b5' : chordType;
        }

        return this.buildPianoChord(root, chordType, keyInfo);
    }

    /**
     * 更新钢琴设置
     */
    updatePianoSettings(newSettings) {
        Object.assign(this.pianoSettings, newSettings);
        console.log(`${this.logPrefix} 设置已更新:`, this.pianoSettings);
    }

    /**
     * 获取钢琴设置
     */
    getPianoSettings() {
        return { ...this.pianoSettings };
    }
}

// 钢琴专用全局函数（独立于吉他系统）
let pianoHarmonyEngine = null;

/**
 * 初始化钢琴和声引擎
 */
function initializePianoHarmonyEngine() {
    if (!pianoHarmonyEngine) {
        pianoHarmonyEngine = new PianoHarmonyEngine();
        console.log('🎹 钢琴和声引擎初始化完成');
    }
    return pianoHarmonyEngine;
}

/**
 * 钢琴专用：生成功能和声进行（独立函数）
 */
function generatePianoFunctionalProgression(key, measures) {
    const engine = pianoHarmonyEngine || initializePianoHarmonyEngine();
    return engine.generatePianoFunctionalProgression(key, measures);
}

/**
 * 钢琴专用：生成多样化进行（独立函数）
 */
function generatePianoDiverseProgression(key, measures) {
    const engine = pianoHarmonyEngine || initializePianoHarmonyEngine();
    return engine.generatePianoDiverseProgression(key, measures);
}

/**
 * 获取钢琴设置
 */
function getPianoSettings() {
    const engine = pianoHarmonyEngine || initializePianoHarmonyEngine();
    return engine.getPianoSettings();
}

/**
 * 更新钢琴设置
 */
function updatePianoSettings(newSettings) {
    const engine = pianoHarmonyEngine || initializePianoHarmonyEngine();
    return engine.updatePianoSettings(newSettings);
}

// 在页面加载时自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePianoHarmonyEngine);
} else {
    initializePianoHarmonyEngine();
}