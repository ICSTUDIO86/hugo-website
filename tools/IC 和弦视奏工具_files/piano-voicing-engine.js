/**
 * Cognote 钢琴Voicing引擎
 * Piano Voicing Engine - 完全独立的钢琴voicing生成系统
 *
 * 专门为钢琴演奏优化的voicing算法，与吉他系统完全分离
 *
 * @version 1.0.0
 * @author Cognote
 */

class PianoVoicingEngine {
    constructor() {
        this.logPrefix = '🎹 [Piano Voicing]';

        // 钢琴voicing配置
        this.pianoVoicingConfig = {
            // 钢琴音域范围
            range: {
                min: 21,    // A0
                max: 108,   // C8
                comfortable: { min: 36, max: 84 } // 舒适演奏范围 C2-C6
            },

            // 钢琴特有的voicing类型
            voicingTypes: {
                // 古典钢琴voicing
                close: 'close',           // 密集排列
                open: 'open',             // 开放排列
                spread: 'spread',         // 分散排列

                // 爵士钢琴voicing
                rootless: 'rootless',     // 无根音voicing
                shell: 'shell',           // Shell voicing (简化版)
                block: 'block',           // Block chords

                // 现代钢琴voicing
                quartal: 'quartal',       // 四度叠置
                cluster: 'cluster',       // 音簇
                hybrid: 'hybrid'          // 混合voicing
            },

            // 钢琴左右手分工
            handSeparation: {
                leftHand: { min: 21, max: 60 },   // A0-C4
                rightHand: { min: 48, max: 108 }  // C3-C8
            }
        };

        console.log(`${this.logPrefix} 钢琴Voicing引擎已创建`);
    }

    /**
     * 生成钢琴voicing（主入口）
     */
    generatePianoVoicings(chord, options = {}) {
        console.log(`${this.logPrefix} 开始生成钢琴voicing: ${chord.root}${chord.type}`);

        const voicings = {};
        const enabledTypes = options.voicingTypes || ['close', 'open', 'rootless'];

        console.log(`${this.logPrefix} 启用的voicing类型: ${enabledTypes.join(', ')}`);

        // 生成各种类型的钢琴voicing
        enabledTypes.forEach(type => {
            try {
                let voicing = null;

                switch (type) {
                    case 'close':
                        voicing = this.generatePianoCloseVoicing(chord, options);
                        break;
                    case 'open':
                        voicing = this.generatePianoOpenVoicing(chord, options);
                        break;
                    case 'spread':
                        voicing = this.generatePianoSpreadVoicing(chord, options);
                        break;
                    case 'rootless':
                        voicing = this.generatePianoRootlessVoicing(chord, options);
                        break;
                    case 'shell':
                        voicing = this.generatePianoShellVoicing(chord, options);
                        break;
                    case 'block':
                        voicing = this.generatePianoBlockVoicing(chord, options);
                        break;
                    case 'quartal':
                        voicing = this.generatePianoQuartalVoicing(chord, options);
                        break;
                    default:
                        console.warn(`${this.logPrefix} 未知voicing类型: ${type}`);
                }

                if (voicing) {
                    voicings[type] = voicing;
                    console.log(`${this.logPrefix} ✅ 生成了${type} voicing: ${voicing.notes.join('-')}`);
                } else {
                    console.log(`${this.logPrefix} ❌ ${type} voicing生成失败`);
                }

            } catch (error) {
                console.error(`${this.logPrefix} ${type} voicing生成错误:`, error);
            }
        });

        console.log(`${this.logPrefix} 生成完成，共${Object.keys(voicings).length}种voicing`);
        return voicings;
    }

    /**
     * 钢琴密集排列voicing
     */
    generatePianoCloseVoicing(chord, options = {}) {
        console.log(`${this.logPrefix} 生成钢琴密集排列voicing`);

        const baseOctave = options.baseOctave || 4;
        const midiNotes = this.convertToMidi(chord.notes, baseOctave);

        // 钢琴密集排列：音符紧密相邻，适合钢琴演奏
        const closeNotes = [...midiNotes].sort((a, b) => a - b);

        return {
            type: 'close',
            notes: this.convertFromMidi(closeNotes),
            midiNotes: closeNotes,
            range: { min: Math.min(...closeNotes), max: Math.max(...closeNotes) },
            instrument: 'piano',
            playability: this.evaluatePianoPlayability(closeNotes)
        };
    }

    /**
     * 钢琴开放排列voicing
     */
    generatePianoOpenVoicing(chord, options = {}) {
        console.log(`${this.logPrefix} 生成钢琴开放排列voicing`);

        const baseOctave = options.baseOctave || 4;
        const midiNotes = this.convertToMidi(chord.notes, baseOctave);

        // 钢琴开放排列：将最高音提高一个八度
        const openNotes = [...midiNotes];
        if (openNotes.length >= 3) {
            const highestNote = Math.max(...openNotes);
            const highestIndex = openNotes.indexOf(highestNote);
            openNotes[highestIndex] += 12; // 提高一个八度
        }

        openNotes.sort((a, b) => a - b);

        return {
            type: 'open',
            notes: this.convertFromMidi(openNotes),
            midiNotes: openNotes,
            range: { min: Math.min(...openNotes), max: Math.max(...openNotes) },
            instrument: 'piano',
            playability: this.evaluatePianoPlayability(openNotes)
        };
    }

    /**
     * 钢琴分散排列voicing
     */
    generatePianoSpreadVoicing(chord, options = {}) {
        console.log(`${this.logPrefix} 生成钢琴分散排列voicing`);

        const baseOctave = options.baseOctave || 4;
        const midiNotes = this.convertToMidi(chord.notes, baseOctave);

        // 钢琴分散排列：音符分布在更宽的音域
        const spreadNotes = midiNotes.map((note, index) => {
            if (index === 0) return note - 12; // 根音降低一个八度
            if (index === midiNotes.length - 1) return note + 12; // 最高音提高一个八度
            return note;
        });

        spreadNotes.sort((a, b) => a - b);

        return {
            type: 'spread',
            notes: this.convertFromMidi(spreadNotes),
            midiNotes: spreadNotes,
            range: { min: Math.min(...spreadNotes), max: Math.max(...spreadNotes) },
            instrument: 'piano',
            playability: this.evaluatePianoPlayability(spreadNotes)
        };
    }

    /**
     * 钢琴无根音voicing (爵士钢琴常用)
     */
    generatePianoRootlessVoicing(chord, options = {}) {
        console.log(`${this.logPrefix} 生成钢琴无根音voicing`);

        const baseOctave = options.baseOctave || 4;
        const allNotes = this.convertToMidi(chord.notes, baseOctave);

        // 移除根音，保留其他重要音符
        const rootNote = allNotes[0];
        const rootlessNotes = allNotes.filter(note => (note % 12) !== (rootNote % 12));

        if (rootlessNotes.length < 2) {
            console.warn(`${this.logPrefix} 无根音voicing需要至少3个音符的和弦`);
            return null;
        }

        return {
            type: 'rootless',
            notes: this.convertFromMidi(rootlessNotes),
            midiNotes: rootlessNotes,
            range: { min: Math.min(...rootlessNotes), max: Math.max(...rootlessNotes) },
            instrument: 'piano',
            playability: this.evaluatePianoPlayability(rootlessNotes),
            guideTones: true // 突出导向音
        };
    }

    /**
     * 钢琴Shell voicing
     */
    generatePianoShellVoicing(chord, options = {}) {
        console.log(`${this.logPrefix} 生成钢琴Shell voicing`);

        const baseOctave = options.baseOctave || 4;

        // 钢琴Shell voicing：只使用最重要的音符（根音、三音、七音）
        const shellIntervals = [0]; // 根音

        // 添加三音
        if (chord.type.includes('minor') || chord.type.includes('m')) {
            shellIntervals.push(3); // 小三度
        } else {
            shellIntervals.push(4); // 大三度
        }

        // 添加七音（如果是七和弦）
        if (chord.type.includes('7')) {
            if (chord.type.includes('major7') || chord.type.includes('maj7')) {
                shellIntervals.push(11); // 大七度
            } else {
                shellIntervals.push(10); // 小七度
            }
        }

        const shellNotes = this.intervalsToMidi(chord.root, shellIntervals, baseOctave);

        return {
            type: 'shell',
            notes: this.convertFromMidi(shellNotes),
            midiNotes: shellNotes,
            range: { min: Math.min(...shellNotes), max: Math.max(...shellNotes) },
            instrument: 'piano',
            playability: this.evaluatePianoPlayability(shellNotes),
            essential: true // 标识为核心音符
        };
    }

    /**
     * 钢琴Block voicing
     */
    generatePianoBlockVoicing(chord, options = {}) {
        console.log(`${this.logPrefix} 生成钢琴Block voicing`);

        const baseOctave = options.baseOctave || 4;
        const midiNotes = this.convertToMidi(chord.notes, baseOctave);

        // Block voicing：旋律音符在最高声部，其他音符在下方密集排列
        const melody = Math.max(...midiNotes);
        const accompaniment = midiNotes.filter(note => note !== melody);

        // 将伴奏音符排列在较低音域
        const blockNotes = [
            ...accompaniment.map(note => note - 12), // 伴奏降低一个八度
            melody // 旋律保持在高音
        ].sort((a, b) => a - b);

        return {
            type: 'block',
            notes: this.convertFromMidi(blockNotes),
            midiNotes: blockNotes,
            range: { min: Math.min(...blockNotes), max: Math.max(...blockNotes) },
            instrument: 'piano',
            playability: this.evaluatePianoPlayability(blockNotes),
            melody: this.noteToName(melody) // 标识旋律音
        };
    }

    /**
     * 钢琴四度叠置voicing
     */
    generatePianoQuartalVoicing(chord, options = {}) {
        console.log(`${this.logPrefix} 生成钢琴四度叠置voicing`);

        const baseOctave = options.baseOctave || 4;
        const rootMidi = this.noteToMidi(chord.root, baseOctave);

        // 四度叠置：以四度音程为基础构建voicing
        const quartalNotes = [
            rootMidi,           // 根音
            rootMidi + 5,       // 四度
            rootMidi + 10,      // 大七度
            rootMidi + 15       // 十一度
        ];

        return {
            type: 'quartal',
            notes: this.convertFromMidi(quartalNotes),
            midiNotes: quartalNotes,
            range: { min: Math.min(...quartalNotes), max: Math.max(...quartalNotes) },
            instrument: 'piano',
            playability: this.evaluatePianoPlayability(quartalNotes),
            modern: true // 标识为现代和声
        };
    }

    /**
     * 评估钢琴演奏可行性
     */
    evaluatePianoPlayability(midiNotes) {
        const range = Math.max(...midiNotes) - Math.min(...midiNotes);
        const intervals = [];

        // 计算相邻音程
        for (let i = 1; i < midiNotes.length; i++) {
            intervals.push(midiNotes[i] - midiNotes[i - 1]);
        }

        // 钢琴演奏难度评估
        let difficulty = 'easy';

        if (range > 24) difficulty = 'hard';        // 超过两个八度
        else if (range > 15) difficulty = 'medium'; // 超过一个八度

        // 检查是否有困难的音程
        const hasWideIntervals = intervals.some(interval => interval > 12);
        if (hasWideIntervals) difficulty = 'hard';

        return {
            difficulty: difficulty,
            range: range,
            intervals: intervals,
            playable: difficulty !== 'impossible'
        };
    }

    /**
     * 音符名称转MIDI
     */
    noteToMidi(noteName, octave = 4) {
        const noteMap = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
            'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };

        return (octave + 1) * 12 + (noteMap[noteName] || 0);
    }

    /**
     * 🎵 MIDI转音符名称（调号感知版）
     * @param {number} midiNote - MIDI音符号
     * @param {string} key - 调性（如 'B-major', 'F#-major'），默认为C大调
     * @returns {string} 正确拼写的音符名称
     */
    noteToName(midiNote, key = 'C-major') {
        // 🔧 修复：使用统一调号感知接口替代硬编码数组
        if (this.harmonyTheory && typeof this.harmonyTheory.getConsistentNoteSpelling === 'function') {
            const semitone = midiNote % 12;
            return this.harmonyTheory.getConsistentNoteSpelling(semitone, key);
        } else {
            // 🔧 修复：降级处理也尽量考虑调号
            console.warn('🚨 PianoVoicingEngine: harmonyTheory不可用，使用降级音符拼写');
            const semitone = midiNote % 12;

            // 简单的调号检测：如果是降号调，使用降号拼写
            if (key && (key.includes('b') || key.includes('♭'))) {
                const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
                return flatNames[semitone];
            } else {
                // 默认使用升号拼写
                const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                return sharpNames[semitone];
            }
        }
    }

    /**
     * 和弦音符转MIDI数组
     */
    convertToMidi(noteNames, baseOctave = 4) {
        return noteNames.map((noteName, index) => {
            const octave = baseOctave + Math.floor(index / 7); // 避免音符太密集
            return this.noteToMidi(noteName, octave);
        });
    }

    /**
     * MIDI数组转音符名称
     */
    convertFromMidi(midiNotes) {
        return midiNotes.map(midi => this.noteToName(midi));
    }

    /**
     * 音程转MIDI数组
     */
    intervalsToMidi(rootNote, intervals, baseOctave = 4) {
        const rootMidi = this.noteToMidi(rootNote, baseOctave);
        return intervals.map(interval => rootMidi + interval);
    }
}

// 钢琴voicing引擎全局实例
let pianoVoicingEngine = null;

/**
 * 初始化钢琴voicing引擎
 */
function initializePianoVoicingEngine() {
    if (!pianoVoicingEngine) {
        pianoVoicingEngine = new PianoVoicingEngine();
        console.log('🎹 钢琴Voicing引擎初始化完成');
    }
    return pianoVoicingEngine;
}

/**
 * 获取钢琴voicing引擎实例
 */
function getPianoVoicingEngine() {
    return pianoVoicingEngine || initializePianoVoicingEngine();
}

// 在页面加载时自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePianoVoicingEngine);
} else {
    initializePianoVoicingEngine();
}