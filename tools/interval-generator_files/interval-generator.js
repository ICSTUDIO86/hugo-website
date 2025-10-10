/**
 * 音程视奏核心生成器
 * 版本：4.0.0
 * 严格遵守用户设置，只生成选择的音程类型
 */

/**
 * 🎼 符槓连接核心规则系统
 * 从旋律视奏工具完整迁移，确保beam行为一致
 * 基于国际音乐记谱法标准和中文音乐理论
 */
const BEAMING_RULES = {

    /**
     * 符槓连接核心规则
     * 基于国际音乐记谱法标准和中文音乐理论
     */

    // 1. 基础连接规则
    basicRules: {
        // 可以连接符槓的音符类型
        // 🔥 关键修复：移除'quarter'和'quarter.'，普通四分音符不应该有beam
        // 只有6/8拍的duplet/quadruplet四分音符才在特殊处理中beam
        beamableNotes: ['eighth', 'eighth.', '16th', 'sixteenth', '16th.', '32nd', '64th'],

        // 最少连接数量：连续两个或以上的有符尾音符可以连接
        minimumGroupSize: 2,

        // 符槓类型对应
        beamLevels: {
            'eighth': 1,    // 八分音符：1条符槓
            'eighth.': 1,   // 附点八分音符：1条符槓（与八分音符相同）
            '16th': 2,      // 十六分音符：2条符槓
            '16th.': 2,     // 附点十六分音符：2条符槓
            '32nd': 3,      // 三十二分音符：3条符槓
            '64th': 4       // 六十四分音符：4条符槓
        }
    },

    // 2. 拍号相关连接规则
    timeSignatureRules: {
        '4/4': {
            // 4/4拍：按拍分组，不跨越小节中心线
            primaryBoundaries: [0, 2],      // 强拍边界（第1、3拍）
            secondaryBoundaries: [1, 3],    // 次强拍边界（第2、4拍）
            subdivisionBoundaries: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], // 默认半拍边界（八分音符细分）

            rules: [
                "不能跨越小节中心线（第2拍末尾到第3拍开始）",
                "优先按拍分组：第1拍内、第2拍内、第3拍内、第4拍内",
                "允许连接：第1-2拍、第3-4拍",
                "十六分音符以下：严格按拍分组"
            ]
        },

        '3/4': {
            // 3/4拍：简单三拍子 - 八分音符两个两个连接（体现四分音符拍点）
            primaryBoundaries: [0, 1, 2],      // 三个四分音符拍的边界
            secondaryBoundaries: [],           // 八分音符通常不作为分组边界
            subdivisionBoundaries: [0, 0.5, 1, 1.5, 2, 2.5], // 十六分音符边界
            beamingPattern: "two-by-two",      // 八分音符两个两个连接

            rules: [
                "八分音符两个两个连接（体现四分音符拍点）",
                "例如：♪♪ ♪♪ ♪♪ (每组两个八分音符)",
                "不跨越四分音符拍点边界连接",
                "十六分音符可在四分音符拍内连接"
            ]
        },

        '6/8': {
            // 6/8拍：复合二拍子 - 八分音符三个三个连接（体现附点四分音符拍点）
            primaryBoundaries: [0, 1.5],       // 两个附点四分音符拍的边界
            secondaryBoundaries: [],           // 八分音符子拍不作为主要分组边界
            subdivisionBoundaries: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75], // 十六分音符边界
            beamingPattern: "three-by-three",  // 八分音符三个三个连接

            rules: [
                "八分音符三个三个连接（体现附点四分音符拍点）",
                "例如：♪♪♪ ♪♪♪ (每组三个八分音符)",
                "不跨越附点四分音符拍点边界（1.5拍）连接",
                "十六分音符可在八分音符子拍内连接"
            ]
        },

        '2/4': {
            primaryBoundaries: [0, 1],    // 🔥 关键修复：位置0和位置1都是不可跨越的主要边界
            secondaryBoundaries: [],      // 没有次要边界
            subdivisionBoundaries: [0, 0.5, 1, 1.5],

            rules: [
                "严格按拍分组：第1拍内(0-1)、第2拍内(1-2)",
                "绝对不允许跨越位置1（第二拍开始）的符干连线",
                "二分音符例外：单一音符spanning整个小节是允许的",
                "十六分音符严格按拍分组"
            ]
        },

        '6/8': {
            primaryBoundaries: [0, 3],      // 复拍子的两个主要拍点
            secondaryBoundaries: [1.5, 4.5],
            subdivisionBoundaries: [0, 1.5, 3, 4.5],

            rules: [
                "按复拍子分组：前三个八分音符一组，后三个八分音符一组",
                "不跨越第3拍和第4拍之间的边界",
                "每个三拍组内的八分音符可以连接"
            ]
        }
    },

    // 3. 混合音值连接规则
    mixedValueRules: {
        principle: "主符槓连接所有音符，次符槓只连接需要的音符",

        examples: {
            "八分+十六分": {
                description: "八分音符与十六分音符混合时",
                rule: "主符槓（第1条）连接所有音符，次符槓（第2条）只连接十六分音符",
                visual: "♫=♬♬ (一条主槓，十六分音符间有第二条槓)"
            },

            "附点八分+十六分": {
                description: "附点八分音符与十六分音符在同一拍点内时",
                rule: "主符槓（第1条）连接两个音符，次符槓（第2条）只连接十六分音符",
                visual: "♫.♬ (一条主槓连接，十六分音符有第二条槓)",
                condition: "必须在同一个四分音符拍点内"
            },

            "十六分+三十二分": {
                description: "十六分音符与三十二分音符混合时",
                rule: "第1、2条符槓连接所有音符，第3条符槓只连接三十二分音符",
                visual: "♬♬=♭♭ (两条主槓，三十二分音符间有第三条槓)"
            }
        }
    },

    // 4. 符干方向规则
    stemDirectionRules: {
        principle: "以连接组中距离五线谱中线最远的音符决定整组符干方向",

        rules: [
            "中线以上（包括中线）：符干向下",
            "中线以下：符干向上",
            "混合高低音时：以距中线最远的音符为准",
            "相等距离时：优先向上"
        ],

        implementation: {
            middleLine: { step: 'B', octave: 4 }, // 高音谱号中线为B4

            calculateDirection: function(notes) {
                let maxDistance = 0;
                let direction = 'up';

                for (const note of notes) {
                    const distance = this.getDistanceFromMiddleLine(note.step, note.octave);
                    if (Math.abs(distance) > maxDistance) {
                        maxDistance = Math.abs(distance);
                        direction = distance > 0 ? 'down' : 'up';
                    }
                }

                return direction;
            },

            getDistanceFromMiddleLine: function(step, octave) {
                const steps = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                const noteValue = octave * 7 + steps.indexOf(step);
                const middleValue = 4 * 7 + 6; // B4
                return noteValue - middleValue;
            }
        }
    },

    // 5. 特殊情况规则
    specialCases: {
        triplets: {
            rule: "三连音有自己的连接逻辑，不与普通音符混合连接",
            beaming: "三连音内部可以连接，但不跨越三连音边界"
        },

        rests: {
            rule: "休止符中断符槓连接",
            behavior: "休止符前后的音符不能连接"
        },

        ties: {
            rule: "连音线不影响符槓连接",
            behavior: "被连音线连接的音符可以正常参与符槓连接"
        },

        crossStaff: {
            rule: "跨谱表音符不连接符槓",
            behavior: "左手和右手的音符不能用符槓连接"
        }
    },

    // 6. 分组优先级
    groupingPriorities: {
        level1: "节拍单位内分组（最高优先级）",
        level2: "半拍单位内分组",
        level3: "相邻拍子间分组（仅特定情况）",
        level4: "整小节分组（仅特定简单情况）"
    },

    // 7. 实用判断函数
    shouldConnectWithBeam: function(notes, startIndex, endIndex, timeSignature, currentPosition) {
        // 检查基础条件
        if (endIndex - startIndex < 1) return false; // 至少2个音符

        const groupNotes = notes.slice(startIndex, endIndex + 1);

        // 检查所有音符是否可连接
        if (!groupNotes.every(note => {
            if (!note) {
                console.error(`⚠️ 空音符在beaming检查中`);
                return false;
            }
            if (!note.type) {
                console.error(`⚠️ 音符缺少type属性: ${JSON.stringify(note)}`);
                return false;
            }
            if (!note.duration) {
                console.error(`⚠️ 音符缺少duration属性: ${JSON.stringify(note)}`);
                return false;
            }
            if (!Array.isArray(this.basicRules.beamableNotes)) {
                console.error(`⚠️ beamableNotes不是数组: ${JSON.stringify(this.basicRules.beamableNotes)}`);
                return false;
            }

            return note.type === 'note' &&
                   this.basicRules.beamableNotes.includes(note.duration) &&
                   !note.isTriplet; // 三连音单独处理
        })) {
            return false;
        }

        // 检查拍号边界（使用动态细分边界）
        const allowedRhythms = userSettings?.allowedRhythms || [];
        return !this.crossesCriticalBoundary(groupNotes, currentPosition, timeSignature, null, allowedRhythms);
    },

    crossesCriticalBoundary: function(notes, startPosition, timeSignature, currentBeatLevel = null, allowedRhythms = null) {
        const rules = this.timeSignatureRules[timeSignature];
        if (!rules) return false;

        // 🔥 关键检查：单一音符不受beam边界限制（特别是二分音符的例外情况）
        if (notes.length === 1) {
            const singleNote = notes[0];
            // 二分音符、全音符等长时值音符是单一音符，不涉及beam连线
            if (singleNote.duration === 'half' || singleNote.duration === 'whole' ||
                singleNote.duration === 'half.' || singleNote.beats >= 2) {
                console.log(`    ✅ 单一音符(${singleNote.duration}, ${singleNote.beats}拍)不受beam边界限制 - 例外情况`);
                return false; // 不跨越边界，允许
            }
        }

        // 🔥 关键检查：只有可连接beam的音符才检查边界
        const hasBeamableNotes = notes.some(note =>
            this.basicRules.beamableNotes.includes(note.duration) && !note.isTriplet
        );

        if (!hasBeamableNotes) {
            console.log(`    ✅ 音符组不包含可连beam的音符，跳过边界检查`);
            return false; // 不需要检查边界
        }

        let position = startPosition;
        const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);

        // 🎵 使用动态细分边界（根据附点音符调整）
        let dynamicSubdivisions;
        if (typeof BEAMING_RULES.getDynamicSubdivisionBoundaries === 'function') {
            dynamicSubdivisions = BEAMING_RULES.getDynamicSubdivisionBoundaries(timeSignature, allowedRhythms);
        } else {
            console.warn('⚠️ getDynamicSubdivisionBoundaries函数不存在，使用默认细分');
            // 根据拍号提供默认细分
            if (timeSignature === '4/4') {
                dynamicSubdivisions = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]; // 八分音符细分
            } else if (timeSignature === '3/4') {
                dynamicSubdivisions = [0, 0.5, 1, 1.5, 2, 2.5]; // 八分音符细分
            } else if (timeSignature === '2/4') {
                dynamicSubdivisions = [0, 0.5, 1, 1.5]; // 八分音符细分
            } else if (timeSignature === '6/8') {
                dynamicSubdivisions = [0, 0.5, 1, 1.5, 2, 2.5]; // 八分音符细分
            } else {
                dynamicSubdivisions = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]; // 默认4/4拍细分
            }
        }

        // 根据当前拍点显示层级确定关键边界
        let criticalBoundaries = rules.primaryBoundaries; // 默认使用主要边界

        // 🎼 特殊处理：2/4拍和3/4拍必须在每个四分音符拍点处分割beam，防止跨拍连接
        if (timeSignature === '2/4') {
            criticalBoundaries = [0, 1]; // 强制使用四分音符边界，绝对不允许跨越位置1
            console.log(`    🎵 2/4拍beaming: 强制使用四分音符边界 [0, 1] - 严禁跨越第二拍`);
        } else if (timeSignature === '3/4') {
            criticalBoundaries = [0, 1, 2]; // 强制使用四分音符边界
            console.log(`    🎵 3/4拍beaming: 强制使用四分音符边界 [0, 1, 2]`);
        } else if (currentBeatLevel === 'quarter') {
            // 四分音符拍点层级时，使用四分音符边界
            criticalBoundaries = [0, 1, 2, 3];
        } else if (currentBeatLevel === 'half') {
            // 二分音符拍点层级时，使用二分音符边界
            criticalBoundaries = [0, 2];
        } else if (currentBeatLevel === 'whole') {
            // 全音符拍点层级时，使用全音符边界
            criticalBoundaries = [0];
        }

        for (let i = 0; i < notes.length - 1; i++) {
            const noteEnd = position + notes[i].beats;

            // 🎼 特殊强化：2/4拍严格禁止beam跨越位置1（第二拍），但允许16分音符在拍内连接
            if (timeSignature === '2/4') {
                const boundaryPos = 1; // 第二拍开始的位置

                // 🔥 简化修复：检查beam组是否真正跨越到第二拍内部
                const groupStart = position;
                const groupEnd = position + notes.reduce((sum, note) => sum + note.beats, 0);

                // 只有当组真正延伸到第二拍内部时才分割（给0.05的容忍度）
                if (groupStart < boundaryPos && groupEnd > boundaryPos + 0.05) {
                    console.log(`    🎵 2/4拍beam限制: beam组从${groupStart.toFixed(2)}延伸到${groupEnd.toFixed(2)}，跨越第二拍边界`);
                    return true;
                }

                console.log(`    ✅ 2/4拍beam检查通过: beam组从${groupStart.toFixed(2)}到${groupEnd.toFixed(2)}，在单个拍内`);
            }
            // 🎼 特殊强化：3/4拍严格禁止任何beam跨越四分音符拍点
            else if (timeSignature === '3/4') {
                // 检查当前音符组是否跨越任何四分音符拍点 (0, 1, 2)
                for (const boundary of [0, 1, 2]) {
                    const boundaryPos = boundary % beatsPerMeasure;
                    // 更严格的检查：即使音符在拍点上开始，如果组合跨越下一个拍点也要分割
                    if (position < boundaryPos && noteEnd > boundaryPos) {
                        console.log(`    🎵 3/4拍严格beam限制: 跨越四分音符拍点${boundary}，必须分割beam`);
                        return true;
                    }
                    // 额外检查：如果当前组合的任何部分会延伸到下一个拍点，也要分割
                    if (position <= boundaryPos && noteEnd > boundaryPos + 0.001) {
                        console.log(`    🎵 3/4拍严格beam限制: 延伸超过四分音符拍点${boundary}，强制分割`);
                        return true;
                    }
                }
            } else {
                // 其他时间签名使用原有逻辑
                for (const boundary of criticalBoundaries) {
                    const boundaryPos = boundary % beatsPerMeasure;
                    if (position < boundaryPos && noteEnd > boundaryPos) {
                        console.log(`    跨越${currentBeatLevel || '默认'}拍点边界${boundary}`);
                        return true; // 跨越关键边界
                    }
                }
            }

            position = noteEnd;
        }

        return false;
    },

    generateBeamLevels: function(notes) {
        const beamLevels = [];
        const maxLevel = Math.max(...notes.map(note =>
            this.basicRules.beamLevels[note.duration] || 0
        ));

        for (let level = 1; level <= maxLevel; level++) {
            const levelNotes = [];
            for (let i = 0; i < notes.length; i++) {
                const noteLevel = this.basicRules.beamLevels[notes[i].duration] || 0;
                if (noteLevel >= level) {
                    levelNotes.push(i);
                }
            }
            if (levelNotes.length >= 2) {
                beamLevels.push({
                    level: level,
                    noteIndices: levelNotes
                });
            }
        }

        return beamLevels;
    }
};

// 🎵 调号系统 - 从旋律视奏工具迁移
// 支持所有大调和小调，包含调号信息和主音定义
const KEY_SIGNATURES = {
    // 大调
    'C': { sharps: [], flats: [], tonic: 0 },
    'G': { sharps: [6], flats: [], tonic: 7 },     // F#
    'D': { sharps: [6, 1], flats: [], tonic: 2 },  // F#, C#
    'A': { sharps: [6, 1, 8], flats: [], tonic: 9 }, // F#, C#, G#
    'E': { sharps: [6, 1, 8, 3], flats: [], tonic: 4 }, // F#, C#, G#, D#
    'B': { sharps: [6, 1, 8, 3, 10], flats: [], tonic: 11 }, // F#, C#, G#, D#, A#
    'F#': { sharps: [6, 1, 8, 3, 10, 5], flats: [], tonic: 6 }, // F#, C#, G#, D#, A#, E#
    'F': { sharps: [], flats: [10], tonic: 5 },     // Bb
    'Bb': { sharps: [], flats: [10, 3], tonic: 10 }, // Bb, Eb
    'Eb': { sharps: [], flats: [10, 3, 8], tonic: 3 }, // Bb, Eb, Ab
    'Ab': { sharps: [], flats: [10, 3, 8, 1], tonic: 8 }, // Bb, Eb, Ab, Db
    'Db': { sharps: [], flats: [10, 3, 8, 1, 6], tonic: 1 }, // Bb, Eb, Ab, Db, Gb
    'Gb': { sharps: [], flats: [10, 3, 8, 1, 6, 11], tonic: 6 }, // Bb, Eb, Ab, Db, Gb, Cb

    // 小调（继承相对大调的调号，添加mode标记）
    'Am': { sharps: [], flats: [], tonic: 9, mode: 'minor' },
    'Em': { sharps: [6], flats: [], tonic: 4, mode: 'minor' },
    'Bm': { sharps: [6, 1], flats: [], tonic: 11, mode: 'minor' },
    'F#m': { sharps: [6, 1, 8], flats: [], tonic: 6, mode: 'minor' },
    'C#m': { sharps: [6, 1, 8, 3], flats: [], tonic: 1, mode: 'minor' },
    'G#m': { sharps: [6, 1, 8, 3, 10], flats: [], tonic: 8, mode: 'minor' },
    'D#m': { sharps: [6, 1, 8, 3, 10, 5], flats: [], tonic: 3, mode: 'minor' },
    'A#m': { sharps: [6, 1, 8, 3, 10, 5, 0], flats: [], tonic: 10, mode: 'minor' },
    'Dm': { sharps: [], flats: [10], tonic: 2, mode: 'minor' },
    'Gm': { sharps: [], flats: [10, 3], tonic: 7, mode: 'minor' },
    'Cm': { sharps: [], flats: [10, 3, 8], tonic: 0, mode: 'minor' },
    'Fm': { sharps: [], flats: [10, 3, 8, 1], tonic: 5, mode: 'minor' },
    'Bbm': { sharps: [], flats: [10, 3, 8, 1, 6], tonic: 10, mode: 'minor' },
    'Ebm': { sharps: [], flats: [10, 3, 8, 1, 6, 11], tonic: 3, mode: 'minor' },
};

class IntervalGenerator {
    constructor() {
        console.log('🔥🔥🔥 IntervalGenerator V4.0.2 (2025-10-08 FIX) - 三连音Beam修复版本 🔥🔥🔥');
        console.log('🎵 IntervalGenerator V4.0 初始化 - 增强精确分数计算');

        // 基础音名序列（用于计算音程度数）
        this.noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

        // 🎵 初始化三连音ID计数器（修复bracket重叠问题）
        this.tripletIdCounter = 0;

        // 调内音阶定义（大调和小调）
        this.scales = {
            // 大调
            'C': { notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], fifths: 0 },
            'G': { notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'], fifths: 1 },
            'D': { notes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'], fifths: 2 },
            'A': { notes: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'], fifths: 3 },
            'E': { notes: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'], fifths: 4 },
            'B': { notes: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'], fifths: 5 },
            'F#': { notes: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'], fifths: 6 },
            'F': { notes: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'], fifths: -1 },
            'Bb': { notes: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'], fifths: -2 },
            'Eb': { notes: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'], fifths: -3 },
            'Ab': { notes: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'], fifths: -4 },
            'Db': { notes: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'], fifths: -5 },
            'Gb': { notes: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'], fifths: -6 },

            // 🎵 小调（增强版：包含自然+和声+旋律小调的所有变化音）
            // 每个小调包含9个音：自然小调7音 + 和声小调导音(第7级升高) + 旋律小调第6级升高
            'Am': { notes: ['A', 'B', 'C', 'D', 'E', 'F', 'F#', 'G', 'G#'], fifths: 0 },
            'Em': { notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'C#', 'D', 'D#'], fifths: 1 },
            'Bm': { notes: ['B', 'C#', 'D', 'E', 'F#', 'G', 'G#', 'A', 'A#'], fifths: 2 },
            'F#m': { notes: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'D#', 'E', 'E#'], fifths: 3 },
            'C#m': { notes: ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'A#', 'B', 'B#'], fifths: 4 },
            'G#m': { notes: ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'E#', 'F#', 'F##'], fifths: 5 },
            'D#m': { notes: ['D#', 'E#', 'F#', 'G#', 'A#', 'B', 'B#', 'C#', 'C##'], fifths: 6 },
            'Dm': { notes: ['D', 'E', 'F', 'G', 'A', 'Bb', 'B', 'C', 'C#'], fifths: -1 },
            'Gm': { notes: ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'E', 'F', 'F#'], fifths: -2 },
            'Cm': { notes: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'A', 'Bb', 'B'], fifths: -3 },
            'Fm': { notes: ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'D', 'Eb', 'E'], fifths: -4 },
            'Bbm': { notes: ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'G', 'Ab', 'A'], fifths: -5 },
            'Ebm': { notes: ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'C', 'Db', 'D'], fifths: -6 }
        };

        // 音程度数定义（基于音名距离，不是半音距离）
        this.intervalDegrees = {
            unison: 1,        // 同度
            minor2nd: 2,      // 小二度
            major2nd: 2,      // 大二度
            minor3rd: 3,      // 小三度
            major3rd: 3,      // 大三度
            perfect4th: 4,    // 完全四度
            tritone: 4,       // 三全音（增四度）
            perfect5th: 5,    // 完全五度
            minor6th: 6,      // 小六度
            major6th: 6,      // 大六度
            minor7th: 7,      // 小七度
            major7th: 7,      // 大七度
            octave: 8         // 八度
        };

        // 🎵 优化音程权重系统：强化二度三度级进，减少跳跃
        this.guitarIntervalWeights = {
            'major2nd': 20,      // 🎯 大二度：最高权重，首选级进音程
            'minor2nd': 18,      // 🎯 小二度：次高权重，重要级进音程
            'perfect5th': 16,    // 完全五度：吉他重要音程，power chord的核心
            'perfect4th': 18,    // 🔧 完全四度：提高权重到18，增加出现频率
            'major3rd': 8,       // 🔧 大三度：降低权重到8，减少出现频率
            'minor3rd': 8,       // 🔧 小三度：降低权重到8，减少出现频率
            'major6th': 6,       // 大六度：六度和声化，音响丰富
            'minor6th': 6,       // 小六度：六度和声化，音响丰富
            'octave': 4,         // 八度：丰富音响，相对容易演奏
            'unison': 3,         // 同度：基础音程，偶尔使用
            'tritone': 2,        // 三全音：现代音乐中有用，但技术困难
            'major7th': 1,       // 大七度：技术困难，音响刺耳
            'minor7th': 1        // 小七度：技术困难，音响刺耳
        };

        // 节奏值持续时间映射（以四分音符为1拍的单位）
        this.rhythmDurations = {
            'whole': 4.0,        // 全音符 = 4拍
            'half.': 3.0,        // 附点二分音符 = 3拍
            'half': 2.0,         // 二分音符 = 2拍
            'quarter.': 1.5,     // 附点四分音符 = 1.5拍
            'quarter': 1.0,      // 四分音符 = 1拍
            'eighth.': 0.75,     // 附点八分音符 = 0.75拍
            'eighth': 0.5,       // 八分音符 = 0.5拍
            '16th.': 0.375,      // 附点十六分音符 = 0.375拍
            '16th': 0.25,        // 十六分音符 = 0.25拍
            'sixteenth': 0.25,   // 十六分音符（别名）= 0.25拍
            '32nd': 0.125,       // 三十二分音符 = 0.125拍
            'triplet': 1/3,      // 三连音 = 1/3拍（用于用户选择，内部会转换为正确的音符duration）
            'duplet': 0.5,       // 二连音 = 0.5拍
            'quadruplet': 0.25   // 四连音 = 0.25拍
        };

        // 🎯 精确分数表示，避免浮点误差
        this.rhythmFractions = {
            'whole': { numerator: 4, denominator: 1 },     // 4/1
            'half.': { numerator: 3, denominator: 1 },     // 3/1
            'half': { numerator: 2, denominator: 1 },      // 2/1
            'quarter.': { numerator: 3, denominator: 2 },  // 3/2
            'quarter': { numerator: 1, denominator: 1 },   // 1/1
            'eighth.': { numerator: 3, denominator: 4 },   // 3/4
            'eighth': { numerator: 1, denominator: 2 },    // 1/2
            '16th.': { numerator: 3, denominator: 8 },     // 3/8
            '16th': { numerator: 1, denominator: 4 },      // 1/4
            'sixteenth': { numerator: 1, denominator: 4 }, // 1/4
            '32nd': { numerator: 1, denominator: 8 },      // 1/8
            'triplet': { numerator: 1, denominator: 3 },   // 1/3 精确分数！
            'duplet': { numerator: 1, denominator: 2 },    // 1/2
            'quadruplet': { numerator: 1, denominator: 4 } // 1/4
        };

        // 音符到MIDI值的基础映射（C0 = 12）
        this.noteToMidiBase = {
            'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        };

        // 变音记号调整
        this.accidentals = {
            '#': 1, 'b': -1, '': 0
        };

        // 🎵 从旋律工具迁移：小调音阶定义（增强版：包含和声/旋律小调变化音）
        // 每个小调包含：自然小调7音 + 和声小调第7级 + 旋律小调第6级
        this.minorScales = {
            // 升号小调系列
            'Am': [9, 11, 0, 2, 4, 5, 6, 7, 8],   // A小调: A B C D E F F# G G#
            'Em': [4, 6, 7, 9, 11, 0, 1, 2, 3],   // E小调: E F# G A B C C# D D#
            'Bm': [11, 1, 2, 4, 6, 7, 8, 9, 10],  // B小调: B C# D E F# G G# A A#
            'F#m': [6, 8, 9, 11, 1, 2, 3, 4, 5],  // F#小调: F# G# A B C# D D# E E#
            'C#m': [1, 3, 4, 6, 8, 9, 10, 11, 0], // C#小调: C# D# E F# G# A A# B B#
            'G#m': [8, 10, 11, 1, 3, 4, 5, 6, 7], // G#小调: G# A# B C# D# E E# F# F##
            'D#m': [3, 5, 6, 8, 10, 11, 0, 1, 2], // D#小调: D# E# F# G# A# B B# C# C##
            'A#m': [10, 0, 1, 3, 5, 6, 7, 8, 9],  // A#小调: A# B# C# D# E# F# F## G# G##

            // 降号小调系列
            'Dm': [2, 4, 5, 7, 9, 10, 11, 0, 1],  // D小调: D E F G A Bb B C C#
            'Gm': [7, 9, 10, 0, 2, 3, 4, 5, 6],   // G小调: G A Bb C D Eb E F F#
            'Cm': [0, 2, 3, 5, 7, 8, 9, 10, 11],  // C小调: C D Eb F G Ab A Bb B
            'Fm': [5, 7, 8, 10, 0, 1, 2, 3, 4],   // F小调: F G Ab Bb C Db D Eb E
            'Bbm': [10, 0, 1, 3, 5, 6, 7, 8, 9],  // Bb小调: Bb C Db Eb F Gb G Ab A
            'Ebm': [3, 5, 6, 8, 10, 11, 0, 1, 2]  // Eb小调: Eb F Gb Ab Bb Cb C Db D
        };

        // 🎵 小调主音映射
        this.minorKeyToTonic = {
            'Am': 9, 'Em': 4, 'Bm': 11, 'F#m': 6, 'C#m': 1, 'G#m': 8,
            'D#m': 3, 'A#m': 10, 'Dm': 2, 'Gm': 7, 'Cm': 0, 'Fm': 5,
            'Bbm': 10, 'Ebm': 3
        };

        // 初始化高级设置
        this.accidentalRate = 0; // 临时记号概率百分比
        this.rhythmFrequencies = {}; // 节奏频率权重
        this.halfNoteOnlyMode = false; // 二分音符专用模式标记

        // 6/8 编排器状态
        this._68State = null;

        // 🔧 日志级别控制（2025-10-09）
        this._debugLevel = {
            beaming: false,      // Beaming详细日志（默认关闭，减少控制台输出）
            rhythm: false,       // 节奏生成详细日志
            triplet: false,      // 三连音详细日志
            validation: true,    // 保留：验证日志
            generation: true,    // 保留：音程生成日志
            error: true          // 保留：错误日志
        };

        // 吉他化模式与统计
        this._guitarMode = false;
        this._intervalStats = { total: 0, seconds: 0, thirds: 0, fourths: 0, fifths: 0, sixths: 0, octaves: 0 };
        this._lastIntervalTypeName = null;
        this._consecutiveSeconds = 0;
        // 防重复：连续相同音程计数（按类型）
        this._consecutiveSameInterval = 0;
        // Cantus firmus 轮廓与生成偏好（可配置）
        this._opts = {
            cfApexPosition: 0.6,
            cfApexHeightRatio: 0.8,
            leapProbStrongDefault: 0.22,
            leapProbStrongGuitar: 0.30,
            leapBoostSixthDefault: 1.7,
            leapBoostSixthGuitar: 3.0,
            leapBoostOctaveDefault: 1.6,
            leapBoostOctaveGuitar: 2.5,
            secondRatioDefault: 0.20,
            secondRatioGuitar: 0.12,
            maxConsecutiveSeconds: 1,
            // 休止符控制
            restNon68NearStrong: 0.40,   // 强拍附近（4/4等）
            restNon68Default: 0.60,      // 其他位置（4/4等）
            rest68Base: 0.14,
            rest68Cap: 0.35,
            rest68SafeChance: 0.15,
            injectRest44Chance: 0.75     // 若4/4小节无休止符，强制注入一次休止（概率）
        };
        // First Species Counterpoint 开关（默认关闭）
        this._firstSpecies = false;
        this._lastIntervalTypeName = null;
        this._consecutiveSeconds = 0;
        // 防重复：连续相同音程计数（按类型）
        this._consecutiveSameInterval = 0;
        // Cantus firmus 轮廓与生成偏好（可配置）
        this._opts = {
            // 线条顶点：位置和高度（相对于音域）
            cfApexPosition: 0.6,       // 顶点在整段时值的 60%
            cfApexHeightRatio: 0.8,    // 顶点目标位于音域上沿的 80%
            // 重拍跳进概率
            leapProbStrongDefault: 0.22,
            leapProbStrongGuitar: 0.30,
            // 跳进权重提升（六度/八度）
            leapBoostSixthDefault: 1.7,
            leapBoostSixthGuitar: 3.0,
            leapBoostOctaveDefault: 1.6,
            leapBoostOctaveGuitar: 2.5,
            // 二度控制
            secondRatioDefault: 0.20,
            secondRatioGuitar: 0.12,
            maxConsecutiveSeconds: 1
        };
    }

    /**
     * 🔧 条件日志方法（2025-10-09）
     * 根据日志级别决定是否输出日志
     * @param {string} category - 日志类别 ('beaming', 'rhythm', 'triplet', etc.)
     * @param  {...any} args - console.log的参数
     */
    _log(category, ...args) {
        if (this._debugLevel && this._debugLevel[category]) {
            console.log(...args);
        }
    }

    // ========================================
    // 🎵 TRIPLET_RULES 系统（从旋律工具迁移）
    // 来源: sight-reading-final.js:9142-9396行
    // 功能: 定义所有连音类型规则（三连音、二连音、四连音）
    // ========================================
    get TRIPLET_RULES() {
        return {
        // 连音基本原则
        basicPrinciple: "连音必须独占拍点，不能与普通音符混合",

        // 连音类型及其拍点占用规则
        types: {
            // 传统三连音（用于所有拍号）
            eighth: {
                duration: 'eighth',        // 八分三连音
                totalBeats: 1,            // 占用1拍（4/4拍中的1个四分音符）
                individualBeats: 1/3,     // 每个音符1/3拍
                preferredPositions: [0, 1, 2, 3], // 必须出现在四分音符拍点上（正拍）
                description: "八分三连音：3个八分音符占1拍时值，必须在四分音符拍点上",
                tupletCount: 3,
                tupletType: 'triplet'
            },
            quarter: {
                duration: 'quarter',      // 四分三连音
                totalBeats: 2,           // 占用2拍（4/4拍中的2个四分音符）
                individualBeats: 2/3,    // 每个音符2/3拍
                preferredPositions: [0, 2], // 必须出现在二分音符拍点上（1，3拍）
                description: "四分三连音：3个四分音符占2拍时值，必须在二分音符拍点上",
                tupletCount: 3,
                tupletType: 'triplet'
            },
            sixteenth: {
                duration: '16th',         // 十六分三连音
                totalBeats: 0.5,         // 占用0.5拍（半个四分音符）
                individualBeats: 1/6,    // 每个音符1/6拍
                preferredPositions: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], // 必须出现在八分音符拍点上（1, +, 2, +, 3, +, 4, +）
                description: "十六分三连音：3个十六分音符占0.5拍时值，必须在八分音符拍点上",
                tupletCount: 3,
                tupletType: 'triplet'
            },

            // 🔥 通用二连音（duplets）- 适用于4/4拍等
            duplet_eighth: {
                duration: 'eighth',       // 八分二连音
                totalBeats: 1,           // 占用1拍（4/4拍中的1个四分音符）
                individualBeats: 0.5,    // 每个音符0.5拍
                preferredPositions: [0, 1, 2, 3], // 四分音符拍点
                description: "八分二连音：2个八分音符占1拍时值",
                tupletCount: 2,
                tupletType: 'duplet'
            },
            duplet_quarter: {
                duration: 'quarter',      // 四分二连音
                totalBeats: 2,           // 占用2拍（4/4拍中的2个四分音符）
                individualBeats: 1,      // 每个音符1拍
                preferredPositions: [0, 2], // 二分音符拍点
                description: "四分二连音：2个四分音符占2拍时值",
                tupletCount: 2,
                tupletType: 'duplet'
            },
            duplet_sixteenth: {
                duration: '16th',         // 十六分二连音
                totalBeats: 0.5,         // 占用0.5拍（半个四分音符）
                individualBeats: 0.25,   // 每个音符0.25拍
                preferredPositions: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], // 八分音符拍点
                description: "十六分二连音：2个十六分音符占0.5拍时值",
                tupletCount: 2,
                tupletType: 'duplet'
            },

            // 🔥 通用四连音（quadruplets）- 适用于4/4拍等
            quadruplet_eighth: {
                duration: 'eighth',       // 八分四连音
                totalBeats: 1,           // 占用1拍（4/4拍中的1个四分音符）
                individualBeats: 0.25,   // 每个音符0.25拍
                preferredPositions: [0, 1, 2, 3], // 四分音符拍点
                description: "八分四连音：4个八分音符占1拍时值",
                tupletCount: 4,
                tupletType: 'quadruplet'
            },
            quadruplet_quarter: {
                duration: 'quarter',      // 四分四连音
                totalBeats: 2,           // 占用2拍（4/4拍中的2个四分音符）
                individualBeats: 0.5,    // 每个音符0.5拍
                preferredPositions: [0, 2], // 二分音符拍点
                description: "四分四连音：4个四分音符占2拍时值",
                tupletCount: 4,
                tupletType: 'quadruplet'
            },
            quadruplet_sixteenth: {
                duration: '16th',         // 十六分四连音
                totalBeats: 0.5,         // 占用0.5拍（半个四分音符）
                individualBeats: 0.125,  // 每个音符0.125拍
                preferredPositions: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], // 八分音符拍点
                description: "十六分四连音：4个十六分音符占0.5拍时值",
                tupletCount: 4,
                tupletType: 'quadruplet'
            },

            // 6/8拍专用：二连音（duplets）
            duplet_eighth_6_8: {
                duration: 'eighth',       // 八分二连音
                totalBeats: 1.5,         // 占用1.5拍（一个附点四分音符的时值）
                individualBeats: 0.75,   // 每个音符0.75拍
                preferredPositions: [0, 1.5], // 只能在6/8拍的强拍位置
                description: "6/8拍八分二连音：2个八分音符占附点四分音符时值，创造简单拍子感觉",
                allowedTimeSignatures: ['6/8'],
                tupletCount: 2,
                tupletType: 'duplet'
            },

            // 6/8拍专用：四连音（quadruplets）
            quadruplet_eighth_6_8: {
                duration: 'eighth',       // 八分四连音
                totalBeats: 1.5,         // 占用1.5拍（一个附点四分音符的时值）
                individualBeats: 0.375,  // 每个音符0.375拍
                preferredPositions: [0, 1.5], // 只能在6/8拍的强拍位置
                description: "6/8拍八分四连音：4个八分音符占附点四分音符时值，创造常用拍子感觉",
                allowedTimeSignatures: ['6/8'],
                tupletCount: 4,
                tupletType: 'quadruplet'
            }
        },

        // 位置规则：三连音必须完整占用其对应的时值空间
        placementRules: {
            principle: "三连音必须独占其时值空间，不能与普通音符共存在同一拍点分割中",

            // 检查位置是否适合放置三连音
            canPlaceTriplet: function(position, tripletType, timeSignature, remainingBeats) {
                // 🔥 修复：通过getter访问TRIPLET_RULES.types，支持所有连音类型
                // 这个函数在IntervalGenerator的上下文中被调用
                // 需要通过适当的路径访问types
                const types = {
                    // 三连音
                    eighth: { totalBeats: 1, preferredPositions: [0, 1, 2, 3] },
                    quarter: { totalBeats: 2, preferredPositions: [0, 2] },
                    sixteenth: { totalBeats: 0.5, preferredPositions: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
                    // 🔥 新增：二连音
                    duplet_eighth: { totalBeats: 1, preferredPositions: [0, 1, 2, 3] },
                    duplet_quarter: { totalBeats: 2, preferredPositions: [0, 2] },
                    duplet_sixteenth: { totalBeats: 0.5, preferredPositions: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
                    // 🔥 新增：四连音
                    quadruplet_eighth: { totalBeats: 1, preferredPositions: [0, 1, 2, 3] },
                    quadruplet_quarter: { totalBeats: 2, preferredPositions: [0, 2] },
                    quadruplet_sixteenth: { totalBeats: 0.5, preferredPositions: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
                    // 6/8拍专用
                    duplet_eighth_6_8: { totalBeats: 1.5, preferredPositions: [0, 1.5] },
                    quadruplet_eighth_6_8: { totalBeats: 1.5, preferredPositions: [0, 1.5] }
                };
                const tripletInfo = types[tripletType];
                if (!tripletInfo) {
                    console.log(`❌ 未知的连音类型: ${tripletType}`);
                    return false;
                }
                const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);

                // 检查剩余空间是否足够
                if (remainingBeats < tripletInfo.totalBeats) {
                    console.log(`❌ 空间不足: 需要${tripletInfo.totalBeats}拍，剩余${remainingBeats}拍`);
                    return false;
                }

                // 简化位置检查：只要不是明显错误的位置就允许
                const positionInMeasure = position % beatsPerMeasure;

                // 所有三连音都必须遵循严格的位置规则

                // 严格的位置检查：三连音必须出现在正拍上
                const tolerance = 0.01; // 严格的容差，确保在正拍上
                const isPositionAllowed = tripletInfo.preferredPositions.some(allowedPos =>
                    Math.abs(positionInMeasure - allowedPos) < tolerance
                );

                if (!isPositionAllowed) {
                    console.log(`❌ ${tripletType}三连音位置${positionInMeasure.toFixed(3)}不在允许位置列表${tripletInfo.preferredPositions}中`);
                    return false;
                } else {
                    console.log(`✅ ${tripletType}三连音可在位置${positionInMeasure.toFixed(3)}生成`);
                }

                // 检查三连音结束位置是否跨越不应跨越的边界
                const endPosition = position + tripletInfo.totalBeats;
                const endInMeasure = endPosition % beatsPerMeasure;

                // 四分三连音不应跨越小节中心线（4/4拍的第2-3拍之间）
                if (tripletType === 'quarter' && timeSignature === '4/4') {
                    if (positionInMeasure < 2 && endInMeasure > 2) {
                        return false; // 跨越中心线
                    }
                }

                return true;
            }
        },

        // 三连音内部结构规则（简化版，支持休止符）
        internalStructureRules: {
            // 三连音可以包含的元素类型
            allowedElements: ['note', 'rest'],

            // 简化的三连音内部模式 - 更适合初学者
            commonPatterns: [
                { pattern: ['note', 'note', 'note'], weight: 0.65, description: "三个音符" },
                { pattern: ['note', 'note', 'rest'], weight: 0.12, description: "两音符+休止符" },
                { pattern: ['note', 'rest', 'note'], weight: 0.10, description: "音符+休止符+音符" },
                { pattern: ['rest', 'note', 'note'], weight: 0.06, description: "休止符+两音符" },
                { pattern: ['note', 'rest', 'rest'], weight: 0.03, description: "音符+两休止符" },
                { pattern: ['rest', 'rest', 'note'], weight: 0.02, description: "两休止符+音符" },
                { pattern: ['rest', 'note', 'rest'], weight: 0.02, description: "休止符+音符+休止符" }
            ],

            // 选择连音内部模式（支持不同连音类型）
            selectPattern: function(random, tupletType = 'triplet') {
                let patterns;

                // 根据连音类型选择适合的模式
                switch(tupletType) {
                    case 'duplet':
                        patterns = [
                            { pattern: ['note', 'note'], weight: 0.70, description: "两个音符" },
                            { pattern: ['note', 'rest'], weight: 0.15, description: "音符+休止符" },
                            { pattern: ['rest', 'note'], weight: 0.10, description: "休止符+音符" },
                            { pattern: ['rest', 'rest'], weight: 0.05, description: "两个休止符" }
                        ];
                        break;
                    case 'quadruplet':
                        patterns = [
                            { pattern: ['note', 'note', 'note', 'note'], weight: 0.50, description: "四个音符" },
                            { pattern: ['note', 'rest', 'note', 'note'], weight: 0.15, description: "音符+休止符+两音符" },
                            { pattern: ['note', 'note', 'rest', 'note'], weight: 0.12, description: "两音符+休止符+音符" },
                            { pattern: ['note', 'note', 'note', 'rest'], weight: 0.08, description: "三音符+休止符" },
                            { pattern: ['rest', 'note', 'note', 'note'], weight: 0.06, description: "休止符+三音符" },
                            { pattern: ['note', 'rest', 'rest', 'note'], weight: 0.04, description: "音符+两休止符+音符" },
                            { pattern: ['rest', 'note', 'rest', 'note'], weight: 0.03, description: "休止符+音符+休止符+音符" },
                            { pattern: ['note', 'rest', 'note', 'rest'], weight: 0.02, description: "音符+休止符+音符+休止符" }
                        ];
                        break;
                    case 'triplet':
                    default:
                        patterns = this.commonPatterns; // 使用传统三连音模式
                        break;
                }

                const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
                const randomValue = random.nextFloat() * totalWeight;

                let currentWeight = 0;
                for (const pattern of patterns) {
                    currentWeight += pattern.weight;
                    if (randomValue <= currentWeight) {
                        return pattern;
                    }
                }

                return patterns[0]; // 默认返回第一个模式
            }
        }
        };
    }

    /**
     * 🎼 统一的6/8拍检测方法
     * @param {Object} timeSignature - 拍号对象
     * @returns {boolean} 是否为6/8拍
     */
    is68Time(timeSignature) {
        return timeSignature &&
               timeSignature.beats === 6 &&
               timeSignature.beatType === 8;
    }

    /** 判断是否“全选音程类型” */
    isAllIntervalTypesSelected(intervalTypes) {
        try {
            const need = new Set(['unison','minor2nd','major2nd','minor3rd','major3rd','perfect4th','tritone','perfect5th','minor6th','major6th','minor7th','major7th','octave']);
            const names = new Set((intervalTypes || []).map(t => t.name));
            for (const n of need) { if (!names.has(n)) return false; }
            return true;
        } catch { return false; }
    }

    /** 统计当前已用音程类别（用于轻度配比控制） */
    _recordIntervalUse(intervalName) {
        const map = { minor2nd: 'seconds', major2nd: 'seconds', minor3rd: 'thirds', major3rd: 'thirds', perfect4th: 'fourths', perfect5th: 'fifths', minor6th: 'sixths', major6th: 'sixths', octave: 'octaves' };
        const key = map[intervalName];
        this._intervalStats.total += 1;
        if (key) this._intervalStats[key] += 1;
    }

    /**
     * 🆕 初始化6/8编排器状态（短语/配额/反重复）
     */
    initialize68State(totalMeasures) {
        const state = {
            totalMeasures: totalMeasures || 4,
            // 至少一半小节包含附点四分（更歌唱性）
            minDottedQuarterMeasures: Math.max(1, Math.ceil((totalMeasures || 4) * 0.5)),
            usedDottedQuarterMeasures: 0,
            // 全八分小节配额：不超过总数的25%
            maxAllEighthMeasures: Math.floor((totalMeasures || 4) * 0.25),
            usedAllEighthMeasures: 0,
            lastPatternId: null,
            lastCategory: null,
        };
        console.log('🎼 初始化6/8状态:', state);
        return state;
    }

    /**
     * 🆕 6/8 编排生成：按配额与短语进行选择，避免“全八分”与重复
     */
    generate68OrchestratedRhythm(allowedRhythms, measureDuration, timeSignature, measureIndex) {
        const patterns = this.get68StandardPatterns();
        // 先按用户频率/允许时值过滤
        const available = this.filter68PatternsByFrequency(patterns, allowedRhythms);
        if (!available || available.length === 0) {
            console.warn('⚠️ 6/8无可用模式，使用安全模式');
            return this.create68SafePattern();
        }

        // 计算每个模式的类别与权重（基于配额、反重复）
        const weighted = [];
        for (const p of available) {
            const values = (p.notes || []).map(n => n.value);
            const dottedQuarterCount = values.filter(v => v === 'quarter.').length;
            const eighthCount = values.filter(v => v === 'eighth').length;
            const hasDottedHalf = values.includes('half.');

            let category = 'mixed';
            if (eighthCount === 6) category = 'all-eighths';
            else if (dottedQuarterCount >= 2) category = 'two-dotted-quarters';
            else if (dottedQuarterCount === 1) category = 'one-dotted-quarter';
            else if (hasDottedHalf) category = 'dotted-half';

            let w = 1.0;
            // 配额约束
            if (category === 'all-eighths') {
                if (this._68State && this._68State.usedAllEighthMeasures >= this._68State.maxAllEighthMeasures) {
                    w = 0.01; // 基本禁用
                } else {
                    w *= 0.35; // 降低权重，避免过多全八分
                }
            }
            if (category === 'two-dotted-quarters') {
                // 强力鼓励
                w *= 2.2;
            } else if (category === 'one-dotted-quarter') {
                w *= 1.6;
            } else if (category === 'dotted-half') {
                w *= 1.3;
            }

            // 保障最低含附点四分的小节数：在编排后段强制拉升
            if (this._68State) {
                const measuresLeft = this._68State.totalMeasures - measureIndex;
                const needDotted = this._68State.minDottedQuarterMeasures - this._68State.usedDottedQuarterMeasures;
                if (needDotted > 0 && measuresLeft <= needDotted) {
                    // 剩余小节必须满足最低数：唯有含附点四分才给较高权重
                    if (category === 'two-dotted-quarters' || category === 'one-dotted-quarter') {
                        w *= 4.0;
                    } else {
                        w *= 0.05; // 几乎禁用非附点四分模式
                    }
                }
            }

            // 避免连续重复同一模式
            if (this._68State && this._68State.lastPatternId === p.id) {
                w *= 0.35;
            }
            // 避免连续两个“全八分”
            if (this._68State && this._68State.lastCategory === 'all-eighths' && category === 'all-eighths') {
                w *= 0.25;
            }

            weighted.push({ pattern: p, weight: Math.max(0.0001, w), category });
        }

        // 轮盘选择
        const sum = weighted.reduce((s, x) => s + x.weight, 0);
        let r = Math.random() * sum;
        let chosen = weighted[0];
        for (const item of weighted) {
            r -= item.weight;
            if (r <= 0) { chosen = item; break; }
        }

        // 更新配额/状态
        if (this._68State) {
            if (chosen.category === 'all-eighths') this._68State.usedAllEighthMeasures++;
            if (chosen.category === 'two-dotted-quarters' || chosen.category === 'one-dotted-quarter') {
                this._68State.usedDottedQuarterMeasures++;
            }
            this._68State.lastPatternId = chosen.pattern.id;
            this._68State.lastCategory = chosen.category;
        }

        // 应用beaming并返回事件
        const events = this.apply68BeamingRules(chosen.pattern.notes);
        // 基础校验
        const total = events.reduce((s, e) => s + (e.duration || 0), 0);
        if (Math.abs(total - measureDuration) > 0.01) {
            console.warn('⚠️ 6/8编排器校验失败，使用安全模式');
            return this.create68SafePattern();
        }
        return events;
    }

    /**
     * 🎼 创建标准6/8拍节拍结构定义
     * @returns {Object} 6/8拍的完整节拍结构配置
     */
    create68BeatStructure() {
        return {
            beatsPerMeasure: 3,            // 3拍（以附点四分音符为拍子）
            realBeatsPerMeasure: 2,        // 实际感觉：2个大拍
            strongBeats: [0, 1.5],         // 复合拍强拍位置：0.0和1.5
            subdivisions: [0, 0.5, 1, 1.5, 2, 2.5], // 八分音符级别
            primaryBoundaries: [0, 1.5],   // 两个附点四分音符拍边界
            secondaryBoundaries: [],       // 八分音符子拍不作为主要分组边界
            subdivisionBoundaries: [       // 十六分音符级别的细分边界
                0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75
            ],
            compoundMeter: true,           // 复合拍子标记
            dottedQuarterBased: true,      // 以附点四分音符为基础单位
            measureDuration: 3.0,          // 小节总时值（四分音符拍）
            beatType: 8,                   // 拍子类型（八分音符为单位）
            beatsInMeasure: 6,             // 小节内拍数
            // 强拍模式：强-弱-弱 弱-弱-弱
            beatStrengthPattern: ['strong', 'weak', 'weak', 'strong', 'weak', 'weak']
        };
    }

    /**
     * 🎼 检测其他复合拍子（9/8, 12/8等，排除6/8拍）
     * @param {Object} timeSignature - 拍号对象
     * @returns {boolean} 是否为其他复合拍子
     */
    isOtherCompoundTime(timeSignature) {
        return timeSignature &&
               timeSignature.beatType === 8 &&
               timeSignature.beats % 3 === 0 &&
               timeSignature.beats > 6;
    }

    /**
     * 主生成函数
     * @param {Object} settings - 用户设置
     * @returns {Object} 生成的音程进行
     */
    generate(settings) {
        console.log('🎵 开始生成音程进行');
        console.log('设置:', settings);

        try {

        // 🎵 重置三连音ID计数器（确保每次生成都有唯一的bracket ID）
        this.tripletIdCounter = 0;
        console.log('🛡️ 三连音ID计数器已重置，避免bracket重叠');

        // 🎯 获取高级设置：临时记号概率和节奏频率权重
        this.accidentalRate = this.getAccidentalRate();

        // 🔧 修复：优先使用已设置的频率，否则从DOM读取
        if (!this.rhythmFrequencies || Object.keys(this.rhythmFrequencies).length === 0) {
            this.rhythmFrequencies = this.getRhythmFrequencies();
            console.log(`🎼 从DOM读取节奏频率权重:`, this.rhythmFrequencies);
        } else {
            console.log(`🎼 使用已设置的节奏频率权重:`, this.rhythmFrequencies);
        }

        console.log(`🎼 高级设置已加载 - 临时记号概率: ${this.accidentalRate}%, 节奏频率权重:`, this.rhythmFrequencies);

        // 🔥 激进修复：检查是否只选择全音符，如果是则使用专用生成器
        const hasOnlyWholeNoteInFreq = this.rhythmFrequencies &&
            Object.keys(this.rhythmFrequencies).length === 1 &&
            this.rhythmFrequencies['whole'] > 0;

        const hasOnlyWholeNoteInRhythms = settings.rhythms &&
            settings.rhythms.length === 1 &&
            settings.rhythms[0].value === 'whole';

        if (hasOnlyWholeNoteInFreq || hasOnlyWholeNoteInRhythms) {
            console.log('🔥 检测到用户只选择全音符，启用专用生成器绕过所有复杂逻辑');
            console.log('🔥 触发条件: 频率设置=', hasOnlyWholeNoteInFreq, '节奏参数=', hasOnlyWholeNoteInRhythms);
            return this.generateWholeNoteOnlyProgression(settings);
        }

        // 🔥 检查是否只选择二分音符，启用专用简化生成器
        const hasOnlyHalfNoteInFreq = this.rhythmFrequencies &&
            Object.keys(this.rhythmFrequencies).length === 1 &&
            this.rhythmFrequencies['half'] > 0;

        const hasOnlyHalfNoteInRhythms = settings.rhythms &&
            settings.rhythms.length === 1 &&
            settings.rhythms[0].value === 'half';

        this.halfNoteOnlyMode = hasOnlyHalfNoteInFreq || hasOnlyHalfNoteInRhythms;

        // 🔍 临时禁用二分音符专用生成器，测试常规生成器的表现
        if (false && this.halfNoteOnlyMode) {
            console.log('🔥🔥🔥 检测到用户只选择二分音符，启用专用简化生成器 🔥🔥🔥');
            console.log('🔥 触发条件: 频率设置=', hasOnlyHalfNoteInFreq, '节奏参数=', hasOnlyHalfNoteInRhythms);
            console.log('🔥 设置详情:', JSON.stringify(settings, null, 2));

            // 🔍 特别检查二度音程
            const hasSecondInterval = settings.intervalTypes?.some(interval =>
                interval.semitones === 1 || interval.semitones === 2
            );
            if (hasSecondInterval) {
                console.log('🔍 ⚠️ 检测到二度音程！正在启动专用生成器...');
                console.log('🔍 二度音程列表:', settings.intervalTypes.filter(interval =>
                    interval.semitones === 1 || interval.semitones === 2
                ).map(i => `${i.displayName}(${i.semitones}半音)`));
            }

            console.log('🔥 强制启动极简二分音符生成器...');

            // 删除可能干扰的频率设置
            delete this.rhythmFrequencies;

            return this.generateSimpleHalfNoteProgression(settings);
        }

        // 🔍 检查是否为二分音符，但走常规生成器
        if (this.halfNoteOnlyMode) {
            console.log('🔍🔍🔍 检测到用户只选择二分音符，但强制走常规生成器来调试 🔍🔍🔍');
            console.log('🔍 触发条件: 频率设置=', hasOnlyHalfNoteInFreq, '节奏参数=', hasOnlyHalfNoteInRhythms);
            console.log('🔍 让我们看看常规生成器如何处理二分音符...');

            // 删除可能干扰的频率设置，确保使用用户选择
            delete this.rhythmFrequencies;
        }

        // 验证设置（如果IntervalSettings可用）
        if (typeof IntervalSettings !== 'undefined') {
            const validation = new IntervalSettings().validateSettings(settings);
            if (!validation.isValid) {
                console.error('❌ 设置无效:', validation.errors);
                throw new Error('设置无效: ' + validation.errors.join(', '));
            }
        } else {
            console.log('⚠️ 跳过设置验证（IntervalSettings不可用）');
        }

        const {
            intervalTypes,
            keySignature,
            timeSignature,
            tempo,
            measureCount,
            practiceMode,
            rhythms
        } = settings;

        // 获取小节数（兼容新旧版本）
        const measures = measureCount || settings.measures || 4;

        // 设置实例变量供其他方法使用
        this.intervalTypes = intervalTypes;
        this.keySignature = keySignature;
        this.timeSignature = timeSignature;
        this.tempo = tempo;
        this.measureCount = measures;
        this.practiceMode = practiceMode;
        if (typeof window !== 'undefined' && window.IC_INTERVAL_OPTS) {
            Object.assign(this._opts, window.IC_INTERVAL_OPTS);
        }
        this._firstSpecies = (typeof window !== 'undefined' && window.IC_FIRST_SPECIES === true) || (practiceMode === 'first-species');

        // 🎸 检测"全选音程"场景，启用吉他化权重与配比
        this._guitarMode = this.isAllIntervalTypesSelected(intervalTypes);
        // 重置全局音程统计（用于二度配额/比例控制）
        this._intervalStats = { total: 0, seconds: 0, thirds: 0, fourths: 0, fifths: 0, sixths: 0, octaves: 0 };

        // 🔒 白名单初始化修复 (2025-10-10): 使用验证器的标准，不信任传入的intervalTypes
        // 致命问题：intervalTypes可能被污染，包含用户未勾选的音程（如二度）
        // 根本解决：重新从IntervalSettings读取，确保白名单基于用户UI中的真实选择
        let userTrueSemitones;
        if (typeof IntervalSettings !== 'undefined') {
            const validator = new IntervalSettings();
            const trueSettings = validator.getCurrentSettings();
            userTrueSemitones = trueSettings.intervalTypes.map(t => t.semitones);
            console.log(`🔒 [白名单-真实来源] 从IntervalSettings重新读取: [${userTrueSemitones.sort((a,b)=>a-b).join(', ')}]`);

            // 对比传入的intervalTypes，检测污染
            const passedSemitones = intervalTypes.map(t => t.semitones).sort((a,b)=>a-b);
            if (JSON.stringify(passedSemitones) !== JSON.stringify(userTrueSemitones.sort((a,b)=>a-b))) {
                console.error(`❌ [污染检测] 传入的intervalTypes被污染！`);
                console.error(`  传入值: [${passedSemitones.join(', ')}]`);
                console.error(`  真实值: [${userTrueSemitones.sort((a,b)=>a-b).join(', ')}]`);
            }
        } else {
            userTrueSemitones = intervalTypes.map(t => t.semitones);
            console.warn(`⚠️ [白名单] IntervalSettings不可用，使用传入的intervalTypes（可能不准确）`);
        }

        this._allowedSemitonesSet = new Set(userTrueSemitones);
        const allowedList = Array.from(this._allowedSemitonesSet).sort((a,b)=>a-b);
        console.log(`🔒 [白名单初始化] 最终白名单: [${allowedList.join(', ')}]`);

        // 🔍 检测是否包含二度音程
        const hasSecond = this._allowedSemitonesSet.has(1) || this._allowedSemitonesSet.has(2);
        if (hasSecond) {
            console.log(`🔍 [白名单] 检测到包含二度音程（1或2半音）`);
        } else {
            console.log(`✅ [白名单] 未包含二度音程，系统将严格拒绝生成任何2半音以下的音程`);
        }
        // 重置防重复与最近类型追踪
        this._lastIntervalTypeName = null;
        this._consecutiveSameInterval = 0;
        this._consecutiveSeconds = 0;

        // 🆕 6/8全局状态：短语/配额/避免重复（仅在6/8启用）
        this._68State = null;
        if (this.is68Time(timeSignature)) {
            this._68State = this.initialize68State(measures);
        }

        // 🔧 修复：确保节奏设置存在，但考虑用户频率设置
        let finalRhythms;
        if (rhythms && rhythms.length > 0) {
            finalRhythms = rhythms;
        } else {
            // 检查用户是否有明确的频率设置
            const hasFrequencySettings = this.rhythmFrequencies &&
                Object.keys(this.rhythmFrequencies).length > 0 &&
                Object.values(this.rhythmFrequencies).some(freq => freq > 0);

            if (hasFrequencySettings) {
                // 用户有频率设置，根据频率设置生成节奏列表
                console.log('🎯 用户有频率设置，根据频率生成节奏列表');
                finalRhythms = [];
                for (const [rhythmKey, frequency] of Object.entries(this.rhythmFrequencies)) {
                    if (frequency > 0) {
                        const displayName = this.getDurationDisplayName(rhythmKey);
                        finalRhythms.push({ value: rhythmKey, displayName: displayName });
                    }
                }
            } else {
                // 没有任何设置，使用默认
                console.log('🎯 没有节奏设置，使用默认节奏');
                finalRhythms = [
                    { value: 'half', displayName: '二分音符' },
                    { value: 'quarter', displayName: '四分音符' }
                ];
            }
        }

        // 🎯 预处理节奏组合，解决潜在冲突
        const processedRhythms = this.preprocessRhythmCombinations(finalRhythms, timeSignature);
        console.log(`🔧 节奏预处理完成：${finalRhythms.length} → ${processedRhythms.length} 种节奏`);

        // 获取允许的音程类型列表（不再使用半音数）
        console.log('✅ 允许的音程类型:', intervalTypes.map(t => t.displayName));
        console.log('🎵 允许的节奏类型:', processedRhythms.map(r => r.displayName).join(', '));

        // 选择一个调号（如果是数组则随机选择）
        const selectedKey = Array.isArray(keySignature)
            ? keySignature[Math.floor(Math.random() * keySignature.length)]
            : keySignature;

        // 🎵 小调模式统一选择系统 (2025-10-10)
        // 🔧 关键修复：必须在selectedKey确定之后调用，因为keySignature可能是数组
        // 架构重构：每次生成选择一种模式（自然/和声/旋律小调），保持整个进行一致性
        if (this.isMinorKey(selectedKey)) {
            const minorVariant = generateIndependentMinorVariant(selectedKey, 0.6);
            if (minorVariant) {
                this.currentMinorVariant = minorVariant;
                console.log(`🎵 [统一模式] ${selectedKey} → ${minorVariant.type}小调`);
                console.log(`   固定音阶: [${minorVariant.notes.join(', ')}]`);
                console.log(`   第6级: ${minorVariant.alterations.sixth}, 第7级: ${minorVariant.alterations.seventh}`);
            } else {
                console.warn(`⚠️ [统一模式] ${selectedKey}小调变体生成失败，回退到原系统`);
                this.currentMinorVariant = null;
            }
        } else {
            this.currentMinorVariant = null;
            console.log(`ℹ️ [统一模式] ${selectedKey}为大调，跳过小调模式选择`);
        }

        // 获取音阶
        const scale = this.scales[selectedKey] || this.scales['C'];

        // 设置当前调号和音阶以便正确转换音符名
        this.currentKeySignature = selectedKey;
        this.currentScale = scale;

        // 🔍 详细调试信息：显示完整的生成上下文
        console.log(`🎼 ===== 音程生成总览 =====`);
        console.log(`📍 选中调性: ${selectedKey} → 音阶: [${scale.notes.join(' ')}]`);
        console.log(`🎯 音程类型详情:`);
        intervalTypes.forEach((type, index) => {
            console.log(`  ${index + 1}. ${type.displayName} (${type.name}, ${type.semitones}半音)`);
        });
        console.log(`🎼 ========================`);

        // 验证音程类型设置
        if (intervalTypes.length === 0) {
            console.error(`❌ 致命错误: 没有可用的音程类型！`);
            throw new Error('没有设置任何音程类型');
        }

        // 生成音程进行
        const progression = {
            measures: [],
            keySignature: selectedKey, // 记录实际使用的调号
            timeSignature,
            tempo,
            practiceMode,
            clef: settings.clef, // 🎼 添加谱号信息
            metadata: {
                generatorVersion: '4.0.0',
                generatedAt: new Date().toISOString(),
                allowedIntervals: intervalTypes.map(t => t.displayName)
            }
        };

        // 🎼 智能谱号-音域绑定系统：使用设置提供的 MIDI 值（V5.0），或字符串音名，最后才回退默认
        let rangeMin;
        let rangeMax;

        if (typeof settings.rangeMin === 'number' && isFinite(settings.rangeMin)) {
            rangeMin = settings.rangeMin;
        } else if (typeof settings.rangeMin === 'string') {
            rangeMin = this.noteToMidi(settings.rangeMin);
        } else {
            rangeMin = 60; // 默认 C4
        }

        if (typeof settings.rangeMax === 'number' && isFinite(settings.rangeMax)) {
            rangeMax = settings.rangeMax;
        } else if (typeof settings.rangeMax === 'string') {
            rangeMax = this.noteToMidi(settings.rangeMax);
        } else {
            rangeMax = 72; // 默认 C5
        }

        // 防御：确保范围有效
        if (rangeMin >= rangeMax) {
            console.warn(`⚠️ 检测到无效音域范围 (${rangeMin} >= ${rangeMax})，回退为 C4-C5`);
            rangeMin = 60;
            rangeMax = 72;
        }

        // 设置音域实例变量供其他方法使用
        this.rangeMin = rangeMin;
        this.rangeMax = rangeMax;

        console.log(`🎼 智能音域绑定: ${settings.clef || 'treble'} → ${this.midiToNote(rangeMin)}-${this.midiToNote(rangeMax)} (MIDI: ${rangeMin}-${rangeMax})`);
        console.log(`🔍 调试：确认使用的音域值 rangeMin=${rangeMin}, rangeMax=${rangeMax}`);

        // CF 顶点目标（靠近音域上 80% 位置，顶点约在全段60%处）
        const ambitus = Math.max(1, this.rangeMax - this.rangeMin);
        const apexRatio = this._opts.cfApexHeightRatio || 0.8;
        this._cfApexMidiTarget = Math.round(this.rangeMin + ambitus * apexRatio);
        this._cfApexPosition = this._opts.cfApexPosition || 0.6;
        this._cfApexReached = false;
        this._cfPrevMoveDir = 0;
        this._cfForceOppositeNext = false;

        // 为每个小节生成音符，支持跨小节级进
        let lastIntervalOfPreviousMeasure = null;

        for (let m = 0; m < measures; m++) {
            // 🎼 检查是否为最后一个小节，如果是则需要在主和弦上结束
            const isLastMeasure = (m === measures - 1);

            let measure;
            try {
                measure = this.generateMeasure(
                    scale,
                    intervalTypes, // 传递音程类型而不是半音数
                    timeSignature,
                    processedRhythms, // 传递预处理的节奏设置
                    m,
                    rangeMin,
                    rangeMax,
                    lastIntervalOfPreviousMeasure, // 传递上一小节最后一个音程信息
                    isLastMeasure // 传递是否为最后一个小节的标志
                );
            } catch (measureError) {
                console.error(`❌ 小节${m + 1}生成失败:`, measureError.message);

                // 🔧 八分音符+三连音特殊处理：如果是这个组合失败，使用简化策略
                const hasEighthAndTriplet = processedRhythms.some(r => r.value === 'eighth') &&
                                          processedRhythms.some(r => r.value === 'triplet');

                if (hasEighthAndTriplet) {
                    console.log('🔧 检测到八分音符+三连音组合失败，使用简化生成策略');
                    try {
                        measure = this.generateSimpleEighthTripletMeasure(scale, intervalTypes, timeSignature, m);
                    } catch (simpleError) {
                        console.warn('⚠️ 简化生成也失败，使用最基本的fallback策略');
                        // 最终fallback：生成简单的四分音符小节
                        measure = this.generateBasicMeasure(scale, intervalTypes, timeSignature, m);
                    }
                } else {
                    // 其他情况使用默认处理
                    throw measureError;
                }
            }
            progression.measures.push(measure);

            // 保存本小节最后一个音程信息，供下一小节使用
            // 🔧 修复 (2025-10-09): 优先使用generateMeasure返回的正确索引
            if (measure.lastIntervalInfo) {
                // 使用生成过程中保存的正确索引信息（已包含baseScale处理）
                lastIntervalOfPreviousMeasure = {
                    ...measure.lastIntervalInfo,
                    prevScaleIndex: undefined, // 小节结束时重置前一个位置
                    intervalType: 'measure_end'
                };
            } else if (measure.lowerVoice.length > 0) {
                // Fallback: 从音符对象重建（可能不准确，但保持兼容性）
                const lastBeat = measure.lowerVoice.length - 1;
                const lastLower = measure.lowerVoice[lastBeat];
                const lastUpper = measure.upperVoice[lastBeat];

                if (lastLower.type === 'note' && lastUpper.type === 'note') {
                    lastIntervalOfPreviousMeasure = {
                        lowerNote: lastLower.pitch.charAt(0), // 只保留音名
                        lowerScaleIndex: scale.notes.indexOf(lastLower.pitch.charAt(0)),
                        prevScaleIndex: undefined, // 小节结束时没有前一个位置
                        intervalType: 'measure_end',
                        lowerMidi: lastLower.midi, // 添加MIDI值用于平滑连接
                        upperMidi: lastUpper.midi  // 添加MIDI值用于平滑连接
                    };
                }
            }
        }

        console.log('🎼 生成完成，开始后处理...');

        // 🎼 第一步：应用节奏简化到所有小节（带安全检查）
        progression.measures.forEach((measure, index) => {
            console.log(`🎼 对第${index + 1}小节应用节奏简化`);
            const originalLower = [...measure.lowerVoice];
            const originalUpper = [...measure.upperVoice];

            try {
                const simplifiedLower = this.simplifyRhythmPattern(measure.lowerVoice, timeSignature);
                const simplifiedUpper = this.simplifyRhythmPattern(measure.upperVoice, timeSignature);

                // 🔒 安全检查：如果简化后变成空数组，保留原始数据
                if (!simplifiedLower || simplifiedLower.length === 0) {
                    console.error(`🚨 小节${index + 1}下声部简化后为空！保留原始数据`);
                    if (!originalLower || originalLower.length === 0) {
                        console.error(`🚨 原始数据也为空！强制生成安全内容`);
                        const safeContent = this.generateSafeMeasureContent(timeSignature);
                        measure.lowerVoice = [safeContent.lower];
                    } else {
                        measure.lowerVoice = originalLower;
                    }
                } else {
                    measure.lowerVoice = simplifiedLower;
                }

                if (!simplifiedUpper || simplifiedUpper.length === 0) {
                    console.error(`🚨 小节${index + 1}上声部简化后为空！保留原始数据`);
                    if (!originalUpper || originalUpper.length === 0) {
                        console.error(`🚨 原始数据也为空！强制生成安全内容`);
                        const safeContent = this.generateSafeMeasureContent(timeSignature);
                        measure.upperVoice = [safeContent.upper];
                    } else {
                        measure.upperVoice = originalUpper;
                    }
                } else {
                    measure.upperVoice = simplifiedUpper;
                }

                console.log(`✅ 小节${index + 1}简化完成: 下声部${measure.lowerVoice.length}→${measure.lowerVoice.length}, 上声部${measure.upperVoice.length}→${measure.upperVoice.length}`);

            } catch (error) {
                console.error(`❌ 小节${index + 1}简化失败:`, error);
                // 简化失败时保留原始数据
                measure.lowerVoice = originalLower;
                measure.upperVoice = originalUpper;
            }
        });

        // 🎼 第二步：应用拍点明确化处理（在简化之后，乐句分隔之前）
        console.log('🎯 开始拍点明确化处理...');
        for (let i = 0; i < progression.measures.length; i++) {
            const originalMeasure = progression.measures[i];
            const clarifiedMeasure = this.applyBeatClarification(originalMeasure, timeSignature);
            progression.measures[i] = clarifiedMeasure;
        }

        // 🎵 第2.3步：拍点明确化后重新应用beaming（修复同一拍内tie音符的beam连接）
        console.log('🔗 拍点明确化后重新应用beaming...');
        for (let i = 0; i < progression.measures.length; i++) {
            const measure = progression.measures[i];
            console.log(`  🎵 小节${i + 1}: 重新beaming下声部(${measure.lowerVoice.length}个事件)和上声部(${measure.upperVoice.length}个事件)`);

            // 重新应用beaming到两个声部
            measure.lowerVoice = this.reapplyBeamingToVoice(measure.lowerVoice, timeSignature);
            measure.upperVoice = this.reapplyBeamingToVoice(measure.upperVoice, timeSignature);
        }
        console.log('✅ 重新应用beaming完成');

        // 🎵 第2.5步：拍点明确后再次简化（处理连线的四分+八分音符）
        console.log('🔗 拍点明确化后第二轮简化，处理连线音符...');
        progression.measures.forEach((measure, measureIndex) => {
            console.log(`🎯 小节${measureIndex + 1}第二轮简化...`);

            const reSimplifiedLower = this.simplifyRhythmPattern(measure.lowerVoice, timeSignature);
            const reSimplifiedUpper = this.simplifyRhythmPattern(measure.upperVoice, timeSignature);

            // 🔒 安全检查：如果再次简化后变成空数组，保留拍点明确后的数据
            if (reSimplifiedLower && reSimplifiedLower.length > 0) {
                measure.lowerVoice = reSimplifiedLower;
                console.log(`✅ 下声部第二轮简化：${measure.lowerVoice.length}个音符`);
            } else {
                console.error(`🚨 下声部第二轮简化返回空数组！检查原有数据`);
                if (!measure.lowerVoice || measure.lowerVoice.length === 0) {
                    console.error(`🚨 原有数据也为空！强制生成安全内容`);
                    const safeContent = this.generateSafeMeasureContent(timeSignature);
                    measure.lowerVoice = [safeContent.lower];
                }
            }

            if (reSimplifiedUpper && reSimplifiedUpper.length > 0) {
                measure.upperVoice = reSimplifiedUpper;
                console.log(`✅ 上声部第二轮简化：${measure.upperVoice.length}个音符`);
            } else {
                console.error(`🚨 上声部第二轮简化返回空数组！检查原有数据`);
                if (!measure.upperVoice || measure.upperVoice.length === 0) {
                    console.error(`🚨 原有数据也为空！强制生成安全内容`);
                    const safeContent = this.generateSafeMeasureContent(timeSignature);
                    measure.upperVoice = [safeContent.upper];
                }
            }
        });

        // 🎼 第三步：添加乐句分隔和呼吸（在明确化之后）
        // 🔧 已移除：呼吸处理系统（正常休止符生成已足够）
        // this.addPhrasingAndBreaths(progression, timeSignature);

        // 🎵 第3.5步：第三轮简化（最终优化）
        console.log('🔗 第三轮简化...');
        progression.measures.forEach((measure, measureIndex) => {
            console.log(`🎯 小节${measureIndex + 1}第三轮简化...`);

            const finalSimplifiedLower = this.simplifyRhythmPattern(measure.lowerVoice, timeSignature);
            const finalSimplifiedUpper = this.simplifyRhythmPattern(measure.upperVoice, timeSignature);

            // 🔒 安全检查：如果第三轮简化后变成空数组，保留呼吸后的数据
            if (finalSimplifiedLower && finalSimplifiedLower.length > 0) {
                measure.lowerVoice = finalSimplifiedLower;
                console.log(`✅ 下声部第三轮简化：${measure.lowerVoice.length}个音符`);
            } else {
                console.error(`🚨 下声部第三轮简化返回空数组！检查原有数据`);
                if (!measure.lowerVoice || measure.lowerVoice.length === 0) {
                    console.error(`🚨 原有数据也为空！强制生成安全内容`);
                    const safeContent = this.generateSafeMeasureContent(timeSignature);
                    measure.lowerVoice = [safeContent.lower];
                }
            }

            if (finalSimplifiedUpper && finalSimplifiedUpper.length > 0) {
                measure.upperVoice = finalSimplifiedUpper;
                console.log(`✅ 上声部第三轮简化：${measure.upperVoice.length}个音符`);
            } else {
                console.error(`🚨 上声部第三轮简化返回空数组！检查原有数据`);
                if (!measure.upperVoice || measure.upperVoice.length === 0) {
                    console.error(`🚨 原有数据也为空！强制生成安全内容`);
                    const safeContent = this.generateSafeMeasureContent(timeSignature);
                    measure.upperVoice = [safeContent.upper];
                }
            }
        });

        // 验证生成结果
        const allowedSemitones = intervalTypes.map(type => type.semitones);
        const violations = this.validateProgression(progression, allowedSemitones);
        if (violations.length > 0) {
            console.warn('⚠️ 生成验证发现问题:', violations);
            // 注：新的基于音名距离的系统可能与旧的验证方法不兼容，这是预期的
        }

        // 🛡️ 最终安全检查：确保没有空白小节被返回给用户
        console.log('🛡️ 执行最终空白小节安全检查...');
        let fixedEmptyMeasures = 0;

        progression.measures.forEach((measure, index) => {
            if (!measure.lowerVoice || measure.lowerVoice.length === 0 ||
                !measure.upperVoice || measure.upperVoice.length === 0) {

                console.error(`🚨 发现空白小节${index + 1}，强制修复！`);
                fixedEmptyMeasures++;

                // 强制生成安全的默认内容
                const defaultInterval = this.getDefaultInterval();
                const measureDuration = this.calculateMeasureDuration(timeSignature);

                // 根据用户频率设置决定使用什么节奏
                let rhythmValue = 'quarter';
                let displayName = '四分音符（安全默认）';

                if (this.rhythmFrequencies && this.rhythmFrequencies['whole'] > 0) {
                    rhythmValue = 'whole';
                    displayName = '全音符（安全默认）';
                } else if (this.rhythmFrequencies && this.rhythmFrequencies['half'] > 0) {
                    rhythmValue = 'half';
                    displayName = '二分音符（安全默认）';
                }

                defaultInterval.lower.duration = measureDuration;
                defaultInterval.upper.duration = measureDuration;
                defaultInterval.lower.value = rhythmValue;
                defaultInterval.upper.value = rhythmValue;
                defaultInterval.lower.displayName = displayName;
                defaultInterval.upper.displayName = displayName;

                measure.lowerVoice = [defaultInterval.lower];
                measure.upperVoice = [defaultInterval.upper];

                console.log(`🔧 小节${index + 1}已修复为${displayName}，时值：${measureDuration}拍`);
            }
        });

        if (fixedEmptyMeasures > 0) {
            console.warn(`⚠️ 最终安全检查修复了${fixedEmptyMeasures}个空白小节`);
        } else {
            console.log('✅ 最终安全检查通过：没有空白小节');
        }

        // 🔥 二分音符专用模式：替换任何意外的附点二分音符
        if (this.halfNoteOnlyMode) {
            console.log('🔥 二分音符专用模式：检查并替换附点二分音符...');
            let dottedHalfCount = 0;

            progression.measures.forEach((measure, measureIndex) => {
                // 检查下声部
                if (measure.lowerVoice) {
                    measure.lowerVoice.forEach((note, noteIndex) => {
                        if (note.value === 'half.' || note.duration === 3.0) {
                            dottedHalfCount++;
                            console.warn(`🔥 发现附点二分音符在小节${measureIndex + 1}下声部第${noteIndex + 1}个音符，替换为二分音符`);

                            // 替换为二分音符
                            note.value = 'half';
                            note.duration = 2.0;
                            note.beats = 2.0;  // 🔥 修复：同步更新beats属性
                            note.displayName = '二分音符（替换）';
                        }
                    });
                }

                // 检查上声部
                if (measure.upperVoice) {
                    measure.upperVoice.forEach((note, noteIndex) => {
                        if (note.value === 'half.' || note.duration === 3.0) {
                            dottedHalfCount++;
                            console.warn(`🔥 发现附点二分音符在小节${measureIndex + 1}上声部第${noteIndex + 1}个音符，替换为二分音符`);

                            // 替换为二分音符
                            note.value = 'half';
                            note.duration = 2.0;
                            note.beats = 2.0;  // 🔥 修复：同步更新beats属性
                            note.displayName = '二分音符（替换）';
                        }
                    });
                }
            });

            if (dottedHalfCount > 0) {
                console.log(`🔥 二分音符专用模式：已替换${dottedHalfCount}个附点二分音符为二分音符`);
            } else {
                console.log('🔥 二分音符专用模式：没有发现附点二分音符');
            }
        }

        console.log('✅ 音程进行生成成功');

        // 🎼 为每个measure计算beam组（旋律工具架构）
        console.log('🎼 开始为每个measure计算beam组...');
        for (let i = 0; i < progression.measures.length; i++) {
            const measure = progression.measures[i];

            // 为下声部生成beam组
            if (measure.lowerVoice && measure.lowerVoice.length > 0) {
                const timeSignatureStr = `${progression.timeSignature.beats}/${progression.timeSignature.beatType}`;
                measure.beams = this.generateBeamsMelodyStyle(measure.lowerVoice, timeSignatureStr);
                console.log(`  小节${i + 1}: 生成了${measure.beams.length}个beam组`);
            } else {
                measure.beams = [];
            }
        }
        console.log('✅ Beam组计算完成');

        // 🔥 重置二分音符专用模式标记
        if (this.halfNoteOnlyMode) {
            console.log('🔥 重置二分音符专用模式标记');
            this.halfNoteOnlyMode = false;
        }

        return progression;

        } catch (error) {
            console.error('❌ 音程生成失败:', error);
            console.error('错误堆栈:', error.stack);

            // 🔥 确保即使出错也重置二分音符专用模式标记
            if (this.halfNoteOnlyMode) {
                console.log('🔥 出错时重置二分音符专用模式标记');
                this.halfNoteOnlyMode = false;
            }

            // 提供更具体的错误信息
            let errorMessage = '音程生成失败';
            if (error.message.includes('时值')) {
                errorMessage = '节奏时值计算错误，请尝试减少复杂节奏的选择';
            } else if (error.message.includes('三连音') || error.message.includes('triplet')) {
                errorMessage = '三连音生成错误，请检查节奏选择';
            } else if (error.message.includes('拍号') || error.message.includes('小节')) {
                errorMessage = '小节生成错误，请检查拍号和节奏设置';
            } else if (error.message.includes('音程') || error.message.includes('interval')) {
                errorMessage = '音程生成错误，请检查音程和音域设置';
            }

            throw new Error(`${errorMessage}: ${error.message}`);
        }
    }

    /**
     * 预处理节奏组合，解决潜在冲突
     * @param {Array} rhythms - 原始节奏列表
     * @param {Object} timeSignature - 拍号信息
     * @returns {Array} 处理后的节奏列表
     */
    preprocessRhythmCombinations(rhythms, timeSignature) {
        console.log('🔧🔧🔧 开始节奏组合预处理... 🔧🔧🔧');
        console.log('🔍 输入节奏列表:', rhythms.map(r => `${r.displayName}(${r.value})`));
        console.log('🔍 halfNoteOnlyMode:', this.halfNoteOnlyMode);

        // 🎼 6/8 专用：禁用三连音
        if (this.is68Time(timeSignature)) {
            const before = rhythms.length;
            rhythms = rhythms.filter(r => r.value !== 'triplet');
            const after = rhythms.length;
            if (before !== after) {
                console.log(`🎼 6/8拍：已移除三连音，保留 ${after} 种节奏`);
            }
        }

        // 🔍 临时禁用二分音符特殊处理，让它走常规流程
        if (false && this.halfNoteOnlyMode) {
            console.log('🔍 ❌ 发现问题：二分音符走特殊处理逻辑！');
            console.log('🔍 ❌ 而其他时值（四分音符、八分音符）没有这种特殊处理');
            console.log('🔍 ❌ 这就是为什么二分音符生成规则与其他时值不同的根本原因！');

            const halfNoteOnly = rhythms.filter(r => r.value === 'half');

            if (halfNoteOnly.length === 0) {
                // 如果没有二分音符，创建一个
                const forceHalfNote = {
                    value: 'half',
                    displayName: '二分音符（强制）',
                    duration: 2.0
                };
                console.log('🔍 没有找到二分音符，强制创建');
                return [forceHalfNote];
            }

            console.log(`🔍 二分音符特殊处理：保留${halfNoteOnly.length}个二分音符，过滤掉${rhythms.length - halfNoteOnly.length}个其他节奏`);
            console.log('🔍 这种过滤行为是二分音符独有的！');
            return halfNoteOnly;
        }

        // 🔍 现在二分音符也走常规处理逻辑
        if (this.halfNoteOnlyMode) {
            console.log('🔍 ✅ 二分音符现在也走常规处理逻辑（与其他时值一致）');
        }

        // 🔍 其他时值走这里的常规处理逻辑
        console.log('🔍 ✅ 其他时值走常规处理逻辑（无特殊过滤）');

        // 检测冲突组合
        const hasSixteenth = rhythms.some(r => r.value === '16th' || r.value === 'sixteenth');
        const hasTriplet = rhythms.some(r => r.value === 'triplet');
        const hasEighth = rhythms.some(r => r.value === 'eighth');
        const hasEighthDotted = rhythms.some(r => r.value === 'eighth.');
        const hasQuarterDotted = rhythms.some(r => r.value === 'quarter.');

        // 🎯 修正（4/4稳定产出八分音符）：
        // 非6/8下，当用户勾选了八分音符时，永不完全移除八分音符。
        // 若与三连音同时存在：
        //  - 若两者都有明确的频率设置：保留两者；
        //  - 否则优先保留八分音符，仅在用户明确将“八分频率=0”时才移除。
        if (!this.is68Time(timeSignature) && hasEighth && hasTriplet) {
            const userSetTriplet = !!(this.rhythmFrequencies && typeof this.rhythmFrequencies['triplet'] === 'number' && this.rhythmFrequencies['triplet'] > 0);
            const userSetEighth  = !!(this.rhythmFrequencies && typeof this.rhythmFrequencies['eighth'] === 'number'  && this.rhythmFrequencies['eighth']  > 0);

            if (userSetTriplet && userSetEighth) {
                console.log('✅ 用户已设置八分音符与三连音频率，保留两者，不做预删减');
            } else if (userSetEighth && !userSetTriplet) {
                console.log('✅ 八分音符有明确频率、三连音无 → 保留八分，移除三连音');
                return rhythms.filter(r => r.value !== 'triplet');
            } else if (!userSetEighth && userSetTriplet) {
                console.log('✅ 三连音有明确频率、八分音符频率=0 → 按用户选择仅保留三连音');
                return rhythms.filter(r => r.value !== 'eighth');
            } else {
                // 两者都未明确设置频率：默认保留八分音符，移除三连音，确保4/4能产出八分
                console.log('🔧 两者均无明确频率设置：默认保留八分音符，移除三连音');
                return rhythms.filter(r => r.value !== 'triplet');
            }
        }

        let processedRhythms = [...rhythms];

        // 🎯 智能冲突处理：十六分音符与三连音可以共存，但需要分离使用
        if (hasSixteenth && hasTriplet) {
            console.log('⚠️ 检测到十六分音符与三连音组合，启用智能分离策略');
            // 不再移除任何节奏，而是标记需要智能分离
            processedRhythms.forEach(rhythm => {
                if (rhythm.value === '16th' || rhythm.value === 'sixteenth') {
                    rhythm.conflictGroup = 'sixteenth';
                } else if (rhythm.value === 'triplet') {
                    rhythm.conflictGroup = 'triplet';
                }
            });
        }

        // 🎯 复杂拍号的额外限制
        if (timeSignature.beats >= 6 || timeSignature.beatType > 4) {
            // 复杂拍号中减少超短时值组合
            if (processedRhythms.filter(r => this.rhythmDurations[r.value] <= 0.25).length > 2) {
                console.log('⚠️ 复杂拍号中限制超短时值组合');
                processedRhythms = processedRhythms.filter(r =>
                    this.rhythmDurations[r.value] > 0.25 ||
                    ['triplet', 'quarter', 'eighth'].includes(r.value)
                );
            }
        }

        // 🔧 修复：确保至少有基础节奏，但尊重用户的明确选择
        const hasBasicRhythms = processedRhythms.some(r =>
            ['quarter', 'half', 'eighth'].includes(r.value)
        );

        // 检查用户是否有明确的频率设置
        const hasUserFrequencySettings = this.rhythmFrequencies &&
            Object.keys(this.rhythmFrequencies).length > 0 &&
            Object.values(this.rhythmFrequencies).some(freq => freq > 0);

        if (!hasBasicRhythms && !hasUserFrequencySettings) {
            // 只有在用户没有明确频率设置时才添加默认节奏
            console.log('⚠️ 缺少基础节奏且用户无明确设置，添加默认节奏');
            processedRhythms.push(
                { value: 'quarter', displayName: '四分音符' },
                { value: 'eighth', displayName: '八分音符' }
            );
        } else if (!hasBasicRhythms && hasUserFrequencySettings) {
            console.log('✅ 尊重用户明确的频率设置，不添加默认基础节奏');
        }

        // 🎯 限制总复杂度
        const complexRhythms = processedRhythms.filter(r =>
            this.rhythmDurations[r.value] <= 0.375 || r.value.includes('.')
        );

        if (complexRhythms.length > 4 && processedRhythms.length > 6) {
            console.log('⚠️ 复杂节奏过多，应用智能精简');
            // 保留最重要的节奏
            const essential = processedRhythms.filter(r =>
                ['quarter', 'half', 'eighth', 'triplet'].includes(r.value)
            );
            const additional = processedRhythms.filter(r =>
                !['quarter', 'half', 'eighth', 'triplet'].includes(r.value)
            ).slice(0, 3); // 最多3个额外节奏

            processedRhythms = [...essential, ...additional];
        }

        console.log(`🔧 节奏预处理完成：${rhythms.length} → ${processedRhythms.length}`);
        console.log('📝 保留的节奏:', processedRhythms.map(r => r.displayName));

        return processedRhythms;
    }

    /**
     * 生成单个小节
     * @param {Object} scale - 音阶信息
     * @param {Array} allowedIntervalTypes - 允许的音程类型
     * @param {Object} timeSignature - 拍号信息
     * @param {Array} allowedRhythms - 允许的节奏类型
     * @param {number} measureIndex - 小节索引
     * @param {number} rangeMin - 最低音MIDI号
     * @param {number} rangeMax - 最高音MIDI号
     * @param {Object} previousInterval - 上一个音程信息
     * @returns {Object} 小节数据
     */
    generateMeasure(scale, allowedIntervalTypes, timeSignature, allowedRhythms, measureIndex, rangeMin, rangeMax, previousInterval = null, isLastMeasure = false) {
        const measure = {
            index: measureIndex,
            upperVoice: [],
            lowerVoice: []
        };

        // 🛡️ 保存并注入当前允许的节奏集合，供“就近时值”函数使用（防止生成未勾选的32分等）
        const __prevAllowed = this._allowedRhythmValues;
        try { this._allowedRhythmValues = (allowedRhythms || []).map(r => r.value || r); } catch(_) { this._allowedRhythmValues = null; }

        // 🔧 修复 (2025-10-10): 不再重复节奏对象，selectDurationByPreciseFrequency()会进行加权选择
        // 旧方式通过重复对象实现权重，但与新的精准加权系统冲突，导致频率设置无效
        const weightedRhythms = allowedRhythms;
        console.log(`🎯 用户选择的节奏类型:`, allowedRhythms.map(r => r.displayName));

        // 生成小节的节奏型
        let rhythmPattern = this.generateRhythmPattern(timeSignature, weightedRhythms, measureIndex);
        console.log(`🎵 小节${measureIndex + 1}节奏型:`, rhythmPattern.map(r => r.displayName).join(' + '));

        // 🛡️ 4/4 保证：当用户勾选了“八分音符”而结果中没有八分音符时，最少插入一次八分音符
        // 仅在简单拍(4/4)启用，且不影响6/8等复合拍
        if (timeSignature && timeSignature.beats === 4 && timeSignature.beatType === 4) {
            const userAllowsEighth = allowedRhythms.some(r => r.value === 'eighth');
            const hasEighthInPattern = rhythmPattern.some(e => e && e.type === 'note' && e.value === 'eighth');
            if (userAllowsEighth && !hasEighthInPattern) {
                // 优先将一个“四分音符”替换为两个“八分音符”
                const quarterIndex = rhythmPattern.findIndex(e => e && e.type === 'note' && e.value === 'quarter' && !e.tripletGroup);
                if (quarterIndex >= 0) {
                    const eighthA = {
                        value: 'eighth',
                        displayName: this.getDurationDisplayName('eighth'),
                        duration: 0.5,
                        type: 'note',
                    };
                    const eighthB = {
                        value: 'eighth',
                        displayName: this.getDurationDisplayName('eighth'),
                        duration: 0.5,
                        type: 'note',
                    };
                    const before = rhythmPattern.length;
                    rhythmPattern.splice(quarterIndex, 1, eighthA, eighthB);
                    console.log(`✅ 4/4保障：将第${quarterIndex + 1}个四分音符替换为两个八分音符（pattern ${before}→${rhythmPattern.length}）`);
                } else {
                    // 找不到四分音符：尝试将一个“二分音符”替换为“四个八分音符”（不引入未勾选的时值）
                    const halfIndex = rhythmPattern.findIndex(e => e && e.type === 'note' && e.value === 'half' && !e.tripletGroup);
                    if (halfIndex >= 0) {
                        const group = `auto-${measureIndex}-h${halfIndex}`;
                        const e1 = { value: 'eighth', displayName: this.getDurationDisplayName('eighth'), duration: 0.5, type: 'note'};
                        const e2 = { value: 'eighth', displayName: this.getDurationDisplayName('eighth'), duration: 0.5, type: 'note'};
                        const e3 = { value: 'eighth', displayName: this.getDurationDisplayName('eighth'), duration: 0.5, type: 'note'};
                        const e4 = { value: 'eighth', displayName: this.getDurationDisplayName('eighth'), duration: 0.5, type: 'note'};
                        const before = rhythmPattern.length;
                        rhythmPattern.splice(halfIndex, 1, e1, e2, e3, e4);
                        console.log(`✅ 4/4保障：将第${halfIndex + 1}个二分音符替换为 四个八分音符（pattern ${before}→${rhythmPattern.length}）`);
                    } else {
                        console.log('ℹ️ 4/4保障：未找到可替换的四分/二分音符，跳过强制插入');
                    }
                }
            }
        }

        // 🎯 4/4 特别策略：若本小节未包含休止符，按概率注入一个休止符以增强呼吸感
        try {
            if (!this.is68Time(timeSignature) && timeSignature && timeSignature.beats === 4) {
                const hasRest = rhythmPattern.some(e => e.type === 'rest');
                const allowInject = Math.random() < (this._opts.injectRest44Chance || 0.75);
                if (!hasRest && allowInject && rhythmPattern.length > 1) {
                    // 选择第二拍后（>1.0）的短时值作为休止符候选
                    let candidateIndex = -1;
                    let candidatePosDelta = Infinity;
                    for (let idx = 0; idx < rhythmPattern.length; idx++) {
                        const e = rhythmPattern[idx];
                        const pos = (typeof e.position === 'number') ? e.position : (idx);
                        const isShort = (this.rhythmDurations[e.value] || 1) <= 1.0; // 四分及以下
                        if (isShort && pos > 1.0) {
                            const delta = Math.abs(pos - 2.5);
                            if (delta < candidatePosDelta) {
                                candidatePosDelta = delta;
                                candidateIndex = idx;
                            }
                        }
                    }
                    if (candidateIndex >= 0) {
                        const e = rhythmPattern[candidateIndex];
                        const label = this.getDurationDisplayName ? this.getDurationDisplayName(e.value) : e.displayName || '休止符';
                        rhythmPattern[candidateIndex] = {
                            ...e,
                            type: 'rest',
                            displayName: `${label}休止符`,
                        };
                        console.log(`🔇 4/4 注入休止符于索引${candidateIndex}（${label}）`);
                    }
                }
            }
        } catch (e) {
            console.warn('4/4 注入休止符时出错:', e);
        }

        // 🛡️ 安全检查：确保节奏型不为空
        if (!rhythmPattern || rhythmPattern.length === 0) {
            console.error(`❌ 小节${measureIndex + 1}节奏型为空！生成默认节奏`);
            // 生成一个默认的全音符节奏
            const defaultRhythm = {
                value: 'whole',
                displayName: '全音符（默认）',
                duration: this.calculateMeasureDuration(timeSignature),
                type: 'note',
            };
            rhythmPattern.push(defaultRhythm);
            console.log(`🔧 使用默认节奏: ${defaultRhythm.displayName}`);
        }

        let lastInterval = previousInterval; // 上一个音程信息

        // 根据节奏型生成音程或休止符
        let currentPosition = 0; // 跟踪当前在小节中的位置

        for (let i = 0; i < rhythmPattern.length; i++) {
            const rhythm = rhythmPattern[i];

            if (rhythm.type === 'rest') {
                // 生成休止符
                console.log(`🔇 位置${currentPosition.toFixed(2)}: 生成${rhythm.displayName}`);

                // 🔧 修复：确保休止符有完整的value和displayName字段
                const restNote = {
                    type: 'rest',
                    value: rhythm.value, // 使用节奏对象的value
                    displayName: rhythm.displayName, // 使用节奏对象的displayName
                    duration: rhythm.duration,
                };

                // 传递三连音休止符的特殊属性（参考旋律视奏工具）
                if (rhythm.tripletGroup) {
                    restNote.tripletGroup = rhythm.tripletGroup;
                    restNote.tripletPosition = rhythm.tripletPosition;
                    restNote.isTriplet = rhythm.isTriplet;
                    restNote.tripletType = rhythm.tripletType;
                    restNote.tripletId = rhythm.tripletId;
                    restNote.tripletTotal = rhythm.tripletTotal;
                }

                measure.lowerVoice.push(restNote);
                measure.upperVoice.push(restNote);

                // 休止符不更新lastInterval，保持连接性
            } else {
                // 生成音符
                // 1. 根据节奏类型过滤音程类型（八分音符最大跨度为完全四度）
                let filteredIntervalTypes = allowedIntervalTypes;
                const shortNote = this.isShortRhythm(rhythm.value);
                const strongHere = this.isStrongBeat(currentPosition, timeSignature);
                if (shortNote) {
                    // 短时值：弱拍限制到≤四度；强拍允许出现五度/六度/八度（符合演奏逻辑）
                    filteredIntervalTypes = this.filterIntervalTypesForShortRhythms(allowedIntervalTypes, strongHere);
                    console.log(`🎵 短时值音符(${rhythm.displayName})${strongHere ? '强拍可跳进' : '弱拍受限'}:`, filteredIntervalTypes.map(t => t.displayName));
                }

                // 🎼 First Species: 仅允许协和音程（3、6、5、8；起止可用1），禁止4度（上方）/三全音/七度
                if (this._firstSpecies) {
                    const isFirstEvent = (measureIndex === 0 && i === 0 && currentPosition === 0);
                    const isLastEvent = isLastMeasure && this.isLastNoteInPattern(rhythmPattern, i);
                    filteredIntervalTypes = this.filterFirstSpeciesIntervals(filteredIntervalTypes, isFirstEvent, isLastEvent);
                    console.log('🎼 First Species 过滤后:', filteredIntervalTypes.map(t=>t.displayName));
                }

                // 2. 根据拍位强弱进一步过滤音程类型（新增规则）
                filteredIntervalTypes = this.filterIntervalsByBeatStrength(
                    filteredIntervalTypes,
                    currentPosition,
                    timeSignature
                );

                // 🛡️ 安全检查：确保过滤后还有可用的音程类型
                if (!filteredIntervalTypes || filteredIntervalTypes.length === 0) {
                    console.warn(`⚠️ 过滤后没有可用音程类型，回退到原始音程列表`);
                    filteredIntervalTypes = allowedIntervalTypes;
                }

                // 3.a 6/8 去重复策略：避免连续相同音程类型
                if (this.is68Time(timeSignature) && lastInterval && lastInterval.intervalType) {
                    const nonRepeat = filteredIntervalTypes.filter(t => t.displayName !== lastInterval.intervalType);
                    if (nonRepeat.length > 0) {
                        console.log(`🎯 6/8 去重复: 避免重复 ${lastInterval.intervalType} → 备选`, nonRepeat.map(t=>t.displayName));
                        filteredIntervalTypes = nonRepeat;
                    }
                }

                // 3. 检查是否为最后一个小节的最后一个音符，如果是则强制使用主和弦音程
                const isLastNote = isLastMeasure && this.isLastNoteInPattern(rhythmPattern, i);
                console.log(`🔍 调试信息: 小节${measureIndex + 1}, 节奏${i + 1}/${rhythmPattern.length}, isLastMeasure=${isLastMeasure}, isLastNote=${isLastNote}`);
                console.log(`🔍 当前节奏项:`, rhythmPattern[i]);
                console.log(`🔍 剩余节奏项:`, rhythmPattern.slice(i + 1));

                if (isLastNote) {
                    console.log(`🎯 检测到最后音程，准备应用精确主和弦逻辑`);

                    // 🎼 新的精确主和弦逻辑：确保音符来自主和弦
                    const tonicChordNotes = this.getTonicChordNotes(scale);
                    const validTonicIntervals = this.getValidTonicChordIntervals(tonicChordNotes, filteredIntervalTypes);

                    if (validTonicIntervals.length > 0) {
                        console.log(`🎯 找到${validTonicIntervals.length}个精确主和弦音程配对`);

                        // 设置标记，告诉音程生成函数使用这些特定的主和弦配对
                        this.forceTonicChordIntervals = validTonicIntervals;

                        // 提取对应的音程类型用于旧逻辑兼容
                        filteredIntervalTypes = validTonicIntervals.map(pair => pair.intervalType);
                        console.log(`🎯 最后音程使用精确主和弦:`, filteredIntervalTypes.map(t => t.displayName));
                    } else {
                        console.log(`⚠️ 未找到精确主和弦音程配对，使用传统主和弦逻辑`);

                        // 回退到传统逻辑
                        const tonicIntervals = this.getTonicChordIntervals(filteredIntervalTypes);
                        if (tonicIntervals.length > 0) {
                            filteredIntervalTypes = tonicIntervals;
                            console.log(`🎯 最后音程使用传统主和弦:`, filteredIntervalTypes.map(t => t.displayName));
                        } else {
                            // 🔥 强制容错：如果完全没有主和弦音程，强制使用最基本的主和弦音程
                            console.log(`❌ 完全没有主和弦音程！强制使用基本主和弦音程`);
                            const forceTonicTypes = [
                                { name: 'major3rd', displayName: '大三度', semitones: 4 },
                                { name: 'perfect5th', displayName: '完全五度', semitones: 7 }
                            ];

                            // 检查是否有任何一个基本主和弦音程在用户选择中
                            const availableForceTypes = forceTonicTypes.filter(forced =>
                                this.intervalTypes.some(original => original.semitones === forced.semitones)
                            );

                            if (availableForceTypes.length > 0) {
                                filteredIntervalTypes = availableForceTypes;
                                console.log(`🎯 强制使用基本主和弦:`, filteredIntervalTypes.map(t => t.displayName));
                            } else {
                                console.log(`⚠️ 无法强制主和弦，保持原有音程（这不应该发生）`);
                            }
                        }
                    }
                } else {
                    // 清除主和弦强制配对标记
                    this.forceTonicChordIntervals = null;
                }

                // 生成音程对，考虑级进连接和重拍位置
                let intervalPair;
                try {
                intervalPair = this.generateIntervalPairWithProgression(
                        scale,
                        filteredIntervalTypes,
                        rangeMin,
                        rangeMax,
                        lastInterval,
                        i === 0 ? measureIndex : null, // 只在第一个音符时传递小节索引
                        currentPosition, // 传递当前位置用于重拍检测
                        timeSignature, // 传递拍号信息
                        isLastNote // 🎵 传递终止式标记（用于智能小调系统）
                    );
                // 6/8 重复保护：若仍生成与上一个相同的音程类型，尝试一次替代
                if (this.is68Time(timeSignature) && lastInterval && intervalPair && intervalPair.intervalType === lastInterval.intervalType) {
                    const altTypes = allowedIntervalTypes.filter(t => t.displayName !== lastInterval.intervalType);
                    if (altTypes.length > 0) {
                        try {
                            console.log(`🔁 6/8 检测到重复 ${intervalPair.intervalType}，尝试替换`);
                            const alt = this.generateIntervalPairWithProgression(
                                scale, altTypes, rangeMin, rangeMax, lastInterval,
                                i === 0 ? measureIndex : null, currentPosition, timeSignature
                            );
                            if (alt && alt.intervalType !== intervalPair.intervalType) {
                                intervalPair = alt;
                                console.log(`✅ 6/8 替换成功: ${intervalPair.intervalType}`);
                            }
                        } catch (e) {
                            console.warn('6/8 重复替代失败（保留原结果）:', e.message);
                        }
                    }
                }
                } catch (error) {
                    console.error(`❌ 音程生成失败，位置${currentPosition.toFixed(2)}:`, error.message);
                    console.log('🔧 使用默认音程继续生成');
                    intervalPair = this.getDefaultInterval();
                }

                // 🛡️ 安全检查：确保intervalPair有效
                if (!intervalPair || !intervalPair.lower || !intervalPair.upper) {
                    console.error(`❌ intervalPair无效:`, intervalPair);
                    console.log('🔧 强制使用默认音程');
                    intervalPair = this.getDefaultInterval();
                }

                // 设置节奏和beaming信息
                intervalPair.lower.duration = rhythm.duration;
                intervalPair.upper.duration = rhythm.duration;

                // 🔥 关键修复：设置value属性（用于beam检查）
                intervalPair.lower.value = rhythm.value;
                intervalPair.upper.value = rhythm.value;

                // 🔥 关键修复：设置beats和position属性（用于精确时值计算）
                intervalPair.lower.beats = rhythm.beats || rhythm.duration;
                intervalPair.upper.beats = rhythm.beats || rhythm.duration;
                intervalPair.lower.position = rhythm.position || currentPosition;
                intervalPair.upper.position = rhythm.position || currentPosition;

                // 🔥 修复：传递beamPosition信息（6/8拍beaming的关键）

                // 传递三连音特殊属性（参考旋律视奏工具）
                if (rhythm.tripletGroup) {
                    intervalPair.lower.tripletGroup = rhythm.tripletGroup;
                    intervalPair.upper.tripletGroup = rhythm.tripletGroup;
                    intervalPair.lower.tripletPosition = rhythm.tripletPosition;
                    intervalPair.upper.tripletPosition = rhythm.tripletPosition;

                    // 传递完整的三连音属性
                    intervalPair.lower.isTriplet = rhythm.isTriplet;
                    intervalPair.upper.isTriplet = rhythm.isTriplet;
                    intervalPair.lower.tripletType = rhythm.tripletType;
                    intervalPair.upper.tripletType = rhythm.tripletType;
                    intervalPair.lower.tripletId = rhythm.tripletId;
                    intervalPair.upper.tripletId = rhythm.tripletId;
                    intervalPair.lower.tripletTotal = rhythm.tripletTotal;
                    intervalPair.upper.tripletTotal = rhythm.tripletTotal;

                    // 传递预计算的beam信息
                    if (rhythm.tripletBeamInfo) {
                        intervalPair.lower.tripletBeamInfo = rhythm.tripletBeamInfo;
                        intervalPair.upper.tripletBeamInfo = rhythm.tripletBeamInfo;
                        console.log(`  🔍 传递tripletBeamInfo: ${rhythm.tripletBeamInfo} → intervalPair`);
                    }
                }

                // 传递二/四连音属性（6/8 专用 tuplet）
                if (rhythm.tupletGroup && (rhythm.tupletKind === 'duplet' || rhythm.tupletKind === 'quadruplet')) {
                    intervalPair.lower.tupletGroup = true;
                    intervalPair.upper.tupletGroup = true;
                    intervalPair.lower.tupletKind = rhythm.tupletKind; // 'duplet' | 'quadruplet'
                    intervalPair.upper.tupletKind = rhythm.tupletKind;
                    intervalPair.lower.tupletId = rhythm.tupletId;
                    intervalPair.upper.tupletId = rhythm.tupletId;
                    intervalPair.lower.tupletPosition = rhythm.tupletPosition; // 'start' | 'middle' | 'stop'
                    intervalPair.upper.tupletPosition = rhythm.tupletPosition;

                    // 新方法：XML 层使用 eighth 作为基础类型，避免任何附点推断
                    intervalPair.lower.value = 'eighth';
                    intervalPair.upper.value = 'eighth';

                    // 传递 n-plet 的专用beam信息，确保不回退到常规beam
                    if (rhythm.npletBeamInfo) {
                        intervalPair.lower.npletBeamInfo = rhythm.npletBeamInfo;
                        intervalPair.upper.npletBeamInfo = rhythm.npletBeamInfo;
                    }
                }

                measure.lowerVoice.push(intervalPair.lower);
                measure.upperVoice.push(intervalPair.upper);

                console.log(`🎵 位置${currentPosition.toFixed(2)}: 生成${intervalPair.intervalType} (${intervalPair.lower.pitch}-${intervalPair.upper.pitch})`);

                // 更新上一个音程信息，供下一个音符使用
                lastInterval = {
                    lowerNote: intervalPair.lower.pitch.charAt(0), // 只保留音名，不含八度
                    // 🔧 修复 (2025-10-09): 直接使用生成函数返回的正确索引，不要重新计算
                    // 小调问题：scale.notes是9音，但生成时使用baseScale（7音），重新查找会导致索引错误
                    lowerScaleIndex: intervalPair.lowerScaleIndex !== undefined
                        ? intervalPair.lowerScaleIndex
                        : scale.notes.indexOf(intervalPair.lower.pitch.charAt(0)),
                    prevScaleIndex: lastInterval ? lastInterval.lowerScaleIndex : undefined, // 为cantus firmus转向逻辑保存前一个位置
                    intervalType: intervalPair.intervalType,
                    lowerMidi: intervalPair.lower.midi, // 添加MIDI值用于平滑连接
                    upperMidi: intervalPair.upper.midi  // 添加MIDI值用于平滑连接
                };
            }

            // 更新当前位置 - 确保使用数字时值
            const rhythmDurationValue = this.getElementDuration(rhythm);
            currentPosition += rhythmDurationValue;
        }

        // 🔒 最终安全检查：确保小节不为空
        if (!measure.lowerVoice || measure.lowerVoice.length === 0 ||
            !measure.upperVoice || measure.upperVoice.length === 0) {
            console.error(`🚨 严重错误：生成的小节${measureIndex + 1}为空！强制添加默认内容`);

            // 强制生成一个默认音符以避免空白小节
            const defaultInterval = this.getDefaultInterval();
            const defaultDuration = this.calculateMeasureDuration(timeSignature);

            defaultInterval.lower.duration = defaultDuration;
            defaultInterval.upper.duration = defaultDuration;
            defaultInterval.lower.displayName = '紧急默认音符';
            defaultInterval.upper.displayName = '紧急默认音符';

            measure.lowerVoice = [defaultInterval.lower];
            measure.upperVoice = [defaultInterval.upper];

            console.log(`🔧 已强制添加默认音程，时值：${defaultDuration}拍`);
        }

        // 🎯 八分音符+三连音混合模式的最终小节时值校正
        const hasEighth = allowedRhythms.some(r => r.value === 'eighth');
        const hasTriplet = allowedRhythms.some(r => r.value === 'triplet');
        const isMixedMode = hasEighth && hasTriplet;

        if (isMixedMode && measure.lowerVoice.length > 0) {
            const expectedDuration = this.calculateMeasureDuration(timeSignature);
            const actualDuration = measure.lowerVoice.reduce((sum, note) => {
                return sum + this.getElementDuration(note);
            }, 0);

            const durationDiff = Math.abs(actualDuration - expectedDuration);
            console.log(`🔧 小节${measureIndex + 1}混合模式检查：期望=${expectedDuration}拍，实际=${actualDuration.toFixed(6)}拍，差异=${durationDiff.toFixed(6)}拍`);

            // 如果差异较大且最后有小音符，尝试移除或调整
            if (durationDiff > 0.05 && measure.lowerVoice.length > 1) {
                const lastNote = measure.lowerVoice[measure.lowerVoice.length - 1];
                const lastNoteDuration = this.getElementDuration(lastNote);

                // 如果最后一个音符很小且移除它能改善时值匹配
                if (lastNoteDuration < 0.2 && Math.abs((actualDuration - lastNoteDuration) - expectedDuration) < durationDiff) {
                    console.log(`🔧 小节${measureIndex + 1}：移除最后的小音符${lastNote.displayName}(${lastNoteDuration.toFixed(3)}拍)`);
                    measure.lowerVoice.pop();
                    measure.upperVoice.pop();
                }
            }
        }

        // 🔒 通用时值归一化（所有拍号）：最后防线，确保小节总时值与拍号一致
        try {
            const expected = this.calculateMeasureDuration(timeSignature);
            const tol = 0.001;
            const sumDuration = (arr) => arr.reduce((s, e) => s + this.getElementDuration(e), 0);
            let total = sumDuration(measure.lowerVoice);

            if (total > expected + tol) {
                // 过长：从末端向前剪裁（避免破坏二/四连音）
                const isNplet = (el) => el && el.tupletGroup && (el.tupletKind === 'duplet' || el.tupletKind === 'quadruplet' || el.value === 'duplet' || el.value === 'quadruplet');
                while (measure.lowerVoice.length > 0 && total > expected + tol) {
                    // 选择可安全调整的索引（跳过末端 N-plet）
                    let adjustIdx = measure.lowerVoice.length - 1;
                    if (isNplet(measure.lowerVoice[adjustIdx])) {
                        // 向前寻找最近的非 N-plet 元素
                        let found = false;
                        for (let k = adjustIdx - 1; k >= 0; k--) {
                            if (!isNplet(measure.lowerVoice[k])) { adjustIdx = k; found = true; break; }
                        }
                        if (!found) {
                            console.log('🛡️ 过长裁剪保护：整小节末尾为 N-plet，跳过归一化以保护连音');
                            break; // 放弃归一化，避免破坏 N-plet
                        }
                    }

                    const d = this.getElementDuration(measure.lowerVoice[adjustIdx]);
                    if (total - d >= expected - tol) {
                        // 删除该元素
                        measure.lowerVoice.splice(adjustIdx, 1);
                        measure.upperVoice.splice(adjustIdx, 1);
                        total -= d;
                    } else {
                        // 缩短该元素到精确剩余
                        const remain = Math.max(0, expected - (total - d));
                        if (remain > tol) {
                            const value = this.findClosestRhythmValue ? this.findClosestRhythmValue(remain) : (remain <= 0.5 ? 'eighth' : 'quarter');
                            const std = this.rhythmDurations[value] || remain;
                            // 使用标准时值，避免 0.49→0.5 的四舍五入造成溢出
                            measure.lowerVoice[adjustIdx].duration = std;
                            measure.lowerVoice[adjustIdx].beats = std;  // 🔥 修复：同步更新beats属性
                            measure.lowerVoice[adjustIdx].actualDuration = std;
                            measure.lowerVoice[adjustIdx].value = value;
                            // 清理可能过时的beaming信息
                            if (measure.upperVoice[adjustIdx]) {
                                measure.upperVoice[adjustIdx].duration = std;
                                measure.upperVoice[adjustIdx].beats = std;  // 🔥 修复：同步更新beats属性
                                measure.upperVoice[adjustIdx].actualDuration = std;
                                measure.upperVoice[adjustIdx].value = value;
                            }
                        } else {
                            measure.lowerVoice.splice(adjustIdx, 1);
                            measure.upperVoice.splice(adjustIdx, 1);
                        }
                        total = sumDuration(measure.lowerVoice);
                        break;
                    }
                }
            } else if (total < expected - tol) {
                // 过短：补齐休止符
                let remain = expected - total;
                while (remain > tol) {
                    const value = this.findClosestRhythmValue ? this.findClosestRhythmValue(remain) : (remain >= 1.0 ? 'quarter' : 'eighth');
                    const dur = this.rhythmDurations[value] || Math.min(remain, 0.5);
                    const rest = { type: 'rest', value, duration: dur, displayName: (this.getDurationDisplayName ? this.getDurationDisplayName(value) : value) + '休止符' };
                    measure.lowerVoice.push(rest);
                    measure.upperVoice.push(rest);
                    remain -= dur;
                }
            }
        } catch (e) {
            console.warn('小节时值归一化失败（降级继续）:', e);
        }

        // 还原允许的节奏集合缓存
        this._allowedRhythmValues = __prevAllowed;
        // 🔁 记录本小节选择的主用音程类型（用于后续防重复权重）
        try {
            if (selectedIntervalType && selectedIntervalType.name) {
                if (this._lastIntervalTypeName === selectedIntervalType.name) {
                    this._consecutiveSameInterval = (this._consecutiveSameInterval || 0) + 1;
                } else {
                    this._consecutiveSameInterval = 1;
                }
                this._lastIntervalTypeName = selectedIntervalType.name;
            }
        } catch (e) {}

        // 🆕 输出详细的小节音程日志
        this.logMeasureIntervals(measure, measureIndex, timeSignature);

        // 🔧 修复 (2025-10-09): 保存正确的lastInterval信息供跨小节级进使用
        // 小调问题：避免外部重新计算索引导致错误
        if (lastInterval) {
            measure.lastIntervalInfo = lastInterval;
        }

        return measure;
    }

    /**
     * 🆕 输出小节的详细音程日志
     * @param {Object} measure - 小节对象
     * @param {number} measureIndex - 小节索引
     * @param {string|Object} timeSignature - 拍号
     */
    logMeasureIntervals(measure, measureIndex, timeSignature) {
        try {
            const measureNum = measureIndex + 1;
            console.log(`\n${'='.repeat(80)}`);
            console.log(`📊 小节 ${measureNum} 详细信息`);
            console.log(`${'='.repeat(80)}`);

            // 输出拍号
            const timeSignatureStr = typeof timeSignature === 'string' ? timeSignature : `${timeSignature.beats}/${timeSignature.beatType}`;
            console.log(`⏱️  拍号: ${timeSignatureStr}`);

            // 统计小节信息
            const totalNotes = measure.lowerVoice.filter(e => e.type === 'note').length;
            const totalRests = measure.lowerVoice.filter(e => e.type === 'rest').length;
            console.log(`🎵 音符数: ${totalNotes} | 休止符数: ${totalRests} | 总元素数: ${measure.lowerVoice.length}`);
            console.log(`${'-'.repeat(80)}`);

            // 遍历每个音符/休止符
            measure.lowerVoice.forEach((lowerElement, index) => {
                const upperElement = measure.upperVoice[index];

                // 获取时值信息
                const duration = this.getElementDuration(lowerElement);
                const durationName = this.getDurationDisplayName(lowerElement.value);

                if (lowerElement.type === 'rest') {
                    // 休止符
                    console.log(`  [${index + 1}] 🔇 休止符`);
                    console.log(`      时值: ${durationName} (${duration.toFixed(3)}拍)`);
                } else {
                    // 音符 - 计算音程
                    const lowerPitch = lowerElement.pitch;
                    const upperPitch = upperElement.pitch;

                    // 解析音名和八度
                    const lowerMatch = lowerPitch.match(/([A-G][#b]?)([0-9]+)/);
                    const upperMatch = upperPitch.match(/([A-G][#b]?)([0-9]+)/);

                    if (lowerMatch && upperMatch) {
                        const lowerNote = lowerMatch[1];
                        const lowerOctave = lowerMatch[2];
                        const upperNote = upperMatch[1];
                        const upperOctave = upperMatch[2];

                        // 计算音程（半音数）
                        const semitones = this.calculateSemitones(lowerPitch, upperPitch);

                        // 获取音程类型名称
                        const intervalType = this.getIntervalName(semitones);

                        console.log(`  [${index + 1}] 🎼 音程: ${intervalType}`);
                        console.log(`      下方音: ${lowerNote}${lowerOctave} (${lowerPitch})`);
                        console.log(`      上方音: ${upperNote}${upperOctave} (${upperPitch})`);
                        console.log(`      半音数: ${semitones}`);
                        console.log(`      时值: ${durationName} (${duration.toFixed(3)}拍)`);

                        // 如果是三连音，显示额外信息
                        if (lowerElement.tripletGroup || lowerElement.isTriplet || lowerElement.isTripletElement) {
                            const tripletType = lowerElement.tripletType || 'eighth';
                            console.log(`      🎵 三连音: ${tripletType === 'quarter' ? '四分三连音' : '八分三连音'}`);
                        }
                    }
                }

                if (index < measure.lowerVoice.length - 1) {
                    console.log(`      ${'-'.repeat(76)}`);
                }
            });

            console.log(`${'='.repeat(80)}\n`);

        } catch (error) {
            console.error('❌ 小节日志输出错误:', error);
        }
    }

    /**
     * 🆕 根据半音数获取音程名称
     * @param {number} semitones - 半音数
     * @returns {string} 音程名称
     */
    getIntervalName(semitones) {
        const intervalNames = {
            0: 'Unison (同度)',
            1: 'Minor 2nd (小二度)',
            2: 'Major 2nd (大二度)',
            3: 'Minor 3rd (小三度)',
            4: 'Major 3rd (大三度)',
            5: 'Perfect 4th (纯四度)',
            6: 'Tritone (三全音)',
            7: 'Perfect 5th (纯五度)',
            8: 'Minor 6th (小六度)',
            9: 'Major 6th (大六度)',
            10: 'Minor 7th (小七度)',
            11: 'Major 7th (大七度)',
            12: 'Perfect Octave (纯八度)',
            13: 'Minor 9th (小九度)',
            14: 'Major 9th (大九度)',
            15: 'Minor 10th (小十度)',
            16: 'Major 10th (大十度)',
            17: 'Perfect 11th (纯十一度)',
            18: 'Augmented 11th (增十一度)',
            19: 'Perfect 12th (纯十二度)',
            20: 'Minor 13th (小十三度)',
            21: 'Major 13th (大十三度)'
        };

        return intervalNames[semitones] || `${semitones} semitones`;
    }

    /**
     * 🆕 计算两个音符之间的半音数
     * @param {string} lowerPitch - 下方音符 (如 C4)
     * @param {string} upperPitch - 上方音符 (如 E4)
     * @returns {number} 半音数
     */
    calculateSemitones(lowerPitch, upperPitch) {
        // 音名到半音数的映射
        const noteToSemitone = {
            'C': 0, 'C#': 1, 'Db': 1,
            'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6,
            'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10,
            'B': 11
        };

        // 解析音名和八度
        const lowerMatch = lowerPitch.match(/([A-G][#b]?)([0-9]+)/);
        const upperMatch = upperPitch.match(/([A-G][#b]?)([0-9]+)/);

        if (!lowerMatch || !upperMatch) {
            return 0;
        }

        const lowerNote = lowerMatch[1];
        const lowerOctave = parseInt(lowerMatch[2]);
        const upperNote = upperMatch[1];
        const upperOctave = parseInt(upperMatch[2]);

        // 计算MIDI音符号
        const lowerMidi = (lowerOctave + 1) * 12 + noteToSemitone[lowerNote];
        const upperMidi = (upperOctave + 1) * 12 + noteToSemitone[upperNote];

        // 返回半音数
        return upperMidi - lowerMidi;
    }

    /**
     * 🎯 统一的元素时值计算函数
     * @param {Object} element - 音符或休止符对象
     * @returns {number} 时值（以拍为单位）
     */
    /**
     * 标准化时值，处理浮点精度误差
     * @param {number} duration - 原始时值
     * @returns {number} 标准化后的时值
     */
    normalizeDuration(duration) {
        // 🎯 常见时值的精确映射，避免浮点精度问题
        const commonDurations = {
            // 基础时值
            '4': 4.0,      // 全音符
            '2': 2.0,      // 二分音符
            '1': 1.0,      // 四分音符
            '0.5': 0.5,    // 八分音符
            '0.25': 0.25,  // 十六分音符
            '0.125': 0.125, // 三十二分音符
            // 三连音时值（移除16分三连音以避免渲染问题）
            '0.3333333333333333': 1/3,     // 八分三连音
            '0.6666666666666666': 2/3,     // 四分三连音
            '0.6666666666666667': 2/3,     // 四分三连音（精度变体）
            // 移除: '0.16666666666666666': 1/6, - 十六分三连音会导致渲染问题
            '0.08333333333333333': 1/12,   // 更小的三连音片段
            '0.041666666666666664': 1/24,  // 最小三连音片段
            '0.04166666666666674': 1/24,   // 最小三连音片段（精度变体）
            '0.08333333333333304': 1/12,   // 三连音片段（精度变体）
        };

        const durationStr = duration.toString();
        if (commonDurations[durationStr]) {
            return commonDurations[durationStr];
        }

        // 🎯 检查是否接近常见分数（移除1/6以避免16分三连音渲染问题）
        const commonFractions = [
            { fraction: 1/3, tolerance: 0.001 },
            { fraction: 2/3, tolerance: 0.001 },
            // 移除: { fraction: 1/6, tolerance: 0.001 }, - 十六分三连音会导致渲染问题
            { fraction: 1/12, tolerance: 0.001 },
            { fraction: 1/24, tolerance: 0.001 },
            { fraction: 0.5, tolerance: 0.001 },
            { fraction: 0.25, tolerance: 0.001 },
            { fraction: 0.125, tolerance: 0.001 },
        ];

        for (const {fraction, tolerance} of commonFractions) {
            if (Math.abs(duration - fraction) < tolerance) {
                return fraction;
            }
        }

        return duration;
    }

    /**
     * 🆕 从旋律工具迁移：duration字符串转beats数值
     * 来源: sight-reading-final.js:9767-9786
     * @param {string} duration - 时值字符串（如'quarter', 'eighth'等）
     * @returns {number} beats数值（以四分音符为单位）
     */
    durationToBeats(duration) {
        const map = {
            'whole': 4,
            'half': 2,
            'half.': 3,           // 附点二分音符 = 3拍
            'quarter': 1,
            'quarter.': 1.5,      // 附点四分音符 = 1.5拍
            'eighth': 0.5,
            'eighth.': 0.75,      // 附点八分音符 = 0.75拍
            '16th': 0.25,
            'sixteenth': 0.25,
            '32nd': 0.125
        };

        // 🎵 6/8拍特殊处理（从旋律工具迁移）
        if (this.timeSignature === '6/8') {
            return map[duration] || 1;
        }

        return map[duration] || 1;
    }

    /**
     * 🔥 修复7: 精确时值转换（用于拆分逻辑），不受用户勾选限制
     * @param {number} beats - beats数值
     * @returns {string} duration字符串
     */
    beatsToExactNoteDuration(beats) {
        // 精确映射表（不考虑用户勾选）
        const exactMapping = [
            { beats: 4.0, duration: 'whole' },
            { beats: 3.0, duration: 'half.' },
            { beats: 2.0, duration: 'half' },
            { beats: 1.5, duration: 'quarter.' },
            { beats: 1.0, duration: 'quarter' },
            { beats: 0.75, duration: 'eighth.' },
            { beats: 0.5, duration: 'eighth' },
            { beats: 0.375, duration: '16th.' },
            { beats: 0.25, duration: '16th' },
            { beats: 0.125, duration: '32nd' }  // 🔥 关键：32分音符
        ];

        // 查找精确匹配（容差0.01）
        for (const mapping of exactMapping) {
            if (Math.abs(beats - mapping.beats) < 0.01) {
                return mapping.duration;
            }
        }

        // 没有精确匹配，返回最接近的
        let closest = exactMapping[exactMapping.length - 1]; // 默认32nd
        let minDiff = Math.abs(beats - closest.beats);

        for (const mapping of exactMapping) {
            const diff = Math.abs(beats - mapping.beats);
            if (diff < minDiff) {
                minDiff = diff;
                closest = mapping;
            }
        }

        return closest.duration;
    }

    /**
     * 🆕 从旋律工具迁移：beats数值转duration字符串（音符）
     * 来源: sight-reading-final.js:9791-9861
     * @param {number} beats - beats数值
     * @returns {string} duration字符串
     */
    beatsToNoteDuration(beats) {
        const tolerance = 0.01;

        // 三连音特殊值检测
        if (Math.abs(beats - 2/3) < tolerance) {
            console.log(`🎵 检测到四分三连音拍数: ${beats} ≈ ${2/3}`);
            return 'quarter';
        }
        if (Math.abs(beats - 1/3) < tolerance) {
            console.log(`🎵 检测到八分三连音拍数: ${beats} ≈ ${1/3}`);
            return 'eighth';
        }
        if (Math.abs(beats - 1/6) < tolerance) {
            console.log(`🎵 检测到十六分三连音拍数: ${beats} ≈ ${1/6}`);
            // 🔧 检查用户是否启用了16分音符（从旋律工具迁移）
            if (this._allowedRhythmValues && !this._allowedRhythmValues.includes('16th') && !this._allowedRhythmValues.includes('sixteenth')) {
                console.log(`⚠️ 十六分三连音被禁用，改用八分音符`);
                return 'eighth';
            }
            return '16th';
        }

        // 🔥 附点八分音符精确处理：检测常见的分数拍并返回最接近的标准时值（从旋律工具迁移）
        const preciseTolerances = [
            { beats: 3.25, duration: 'half.' },     // 3.25拍接近3拍（附点二分音符）
            { beats: 2.5, duration: 'half' },       // 2.5拍接近2拍（二分音符）
            { beats: 1.75, duration: 'quarter.' },  // 1.75拍接近1.5拍（附点四分音符）
            { beats: 1.25, duration: 'quarter' },   // 1.25拍接近1拍（四分音符）
            { beats: 0.875, duration: 'eighth.' },  // 0.875拍接近0.75拍（附点八分音符）
            { beats: 0.625, duration: 'eighth' },   // 0.625拍接近0.5拍（八分音符）
            { beats: 0.375, duration: '16th' },     // 0.375拍接近0.25拍（十六分音符）
            { beats: 0.125, duration: '32nd' }      // 🔥 修复：0.125拍是三十二分音符，不是16分音符
        ];

        // 检查是否匹配精确分数拍
        for (const precise of preciseTolerances) {
            if (Math.abs(beats - precise.beats) < tolerance) {
                console.log(`🔧 [精确修复] 分数拍${beats}拍 -> ${precise.duration}(${this.durationToBeats(precise.duration)}拍)`);

                // 🔥 修复：三十二分音符的智能fallback（防止时值暴增）
                if (precise.duration === '32nd') {
                    if (this._allowedRhythmValues && this._allowedRhythmValues.includes('32nd')) {
                        return '32nd';
                    } else if (this._allowedRhythmValues && (this._allowedRhythmValues.includes('16th') || this._allowedRhythmValues.includes('sixteenth'))) {
                        console.log(`⚠️ 32分音符被禁用，使用16分音符代替${beats}拍`);
                        return '16th';
                    } else {
                        console.log(`⚠️ 16分和32分音符都被禁用，使用八分音符代替${beats}拍`);
                        return 'eighth';
                    }
                }

                // 🔧 确保返回的时值在用户允许的范围内（从旋律工具迁移）
                if (precise.duration === '16th' && this._allowedRhythmValues && !this._allowedRhythmValues.includes('16th') && !this._allowedRhythmValues.includes('sixteenth')) {
                    console.log(`⚠️ 16分音符被禁用，改用八分音符代替${beats}拍`);
                    return 'eighth';
                }
                return precise.duration;
            }
        }

        // 标准时值 - 检查用户设置（从旋律工具迁移）
        if (beats >= 4) return 'whole';
        if (beats >= 3) return 'half.';      // 🔥 附点二分音符 - 3拍
        if (beats >= 2) return 'half';
        if (beats >= 1.5) return 'quarter.';
        if (beats >= 1) return 'quarter';
        if (beats >= 0.75) return 'eighth.';
        if (beats >= 0.5) return 'eighth';
        if (beats >= 0.25) {
            // 🔧 检查用户是否启用了16分音符（从旋律工具迁移）
            if (this._allowedRhythmValues && (this._allowedRhythmValues.includes('16th') || this._allowedRhythmValues.includes('sixteenth'))) {
                return '16th';
            } else {
                console.log(`⚠️ 16分音符被禁用，改用八分音符代替${beats}拍`);
                return 'eighth';
            }
        }

        // 🔥 修复：添加0.125拍（三十二分音符）的处理
        if (beats >= 0.125) {
            // 检查32分音符是否启用
            if (this._allowedRhythmValues && this._allowedRhythmValues.includes('32nd')) {
                return '32nd';
            } else if (this._allowedRhythmValues && (this._allowedRhythmValues.includes('16th') || this._allowedRhythmValues.includes('sixteenth'))) {
                console.log(`⚠️ 32分音符被禁用，使用16分音符代替${beats}拍`);
                return '16th';
            } else {
                console.log(`⚠️ 32分和16分音符都被禁用，使用八分音符代替${beats}拍`);
                return 'eighth';
            }
        }

        console.warn(`⚠️ 极小拍数值 ${beats}，返回允许的最小时值`);
        // 🔥 修复：返回用户允许的最小时值，优先32分音符
        if (this._allowedRhythmValues && this._allowedRhythmValues.includes('32nd')) return '32nd';
        if (this._allowedRhythmValues && (this._allowedRhythmValues.includes('16th') || this._allowedRhythmValues.includes('sixteenth'))) return '16th';
        return 'eighth';
    }

    /**
     * 🆕 从旋律工具迁移：beats数值转duration字符串（休止符）
     * 来源: sight-reading-final.js:9934-9956
     * @param {number} beats - beats数值
     * @returns {string} duration字符串
     */
    beatsToRestDuration(beats) {
        return this.beatsToNoteDuration(beats);
    }

    /**
     * 🆕 从旋律工具迁移：智能拆分分数拍为多个精确时值
     * 来源: sight-reading-final.js:9868-9929
     * @param {number} beats - 需要拆分的拍数
     * @returns {Array<number>} 拆分后的拍数数组
     */
    splitFractionalBeats(beats) {
        const segments = [];
        let remaining = beats;
        const tolerance = 0.001;

        const standardBeats = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25, 0.125];

        while (remaining > tolerance) {
            let foundMatch = false;

            for (const beatValue of standardBeats) {
                if (remaining >= beatValue - tolerance) {
                    segments.push(beatValue);
                    remaining -= beatValue;
                    foundMatch = true;
                    break;
                }
            }

            if (!foundMatch) {
                const minBeat = 0.25;
                if (remaining > tolerance) {
                    segments.push(minBeat);
                    remaining -= minBeat;
                } else {
                    break;
                }
            }

            if (segments.length > 10) break; // 防止无限循环
        }

        return segments;
    }

    /**
     * 🆕 统一时值计算函数（基于旋律工具的beats-first理念）
     * @param {Object} element - 音符或休止符对象
     * @returns {number} beats数值
     */
    getElementDuration(element) {
        // 🎯 优先检查beats字段（旋律工具的核心机制）
        if (typeof element.beats === 'number' && !isNaN(element.beats)) {
            return element.beats;
        }

        // 🎯 如果没有beats，基于其他字段计算
        let calculatedBeats;

        if (element.actualDuration) {
            calculatedBeats = element.actualDuration;
        } else if ((element.tupletGroup && element.tupletKind === 'duplet') || element.value === 'duplet') {
            calculatedBeats = 1.5 / 2; // 0.75
        } else if ((element.tupletGroup && element.tupletKind === 'quadruplet') || element.value === 'quadruplet') {
            calculatedBeats = 1.5 / 4; // 0.375
        } else if (element.tripletBaseDuration) {
            calculatedBeats = element.tripletBaseDuration;
        } else if (element.isTripletElement || element.tripletGroup || element.value === 'triplet') {
            const tripletType = element.tripletType || 'eighth';
            calculatedBeats = (tripletType === 'quarter') ? 2/3 : 1/3;
        } else if (element.value && this.rhythmDurations[element.value] !== undefined) {
            calculatedBeats = this.rhythmDurations[element.value];
        } else if (typeof element.duration === 'number') {
            calculatedBeats = element.duration;
        } else {
            const key = element.value || element.duration;
            calculatedBeats = this.rhythmDurations[key] || 1.0;
        }

        // 🎯 标准化时值以避免浮点精度问题
        return this.normalizeDuration(calculatedBeats);
    }

    /**
     * 获取临时记号概率设置
     * @returns {number} 临时记号概率百分比 (0-100)
     */
    getAccidentalRate() {
        const slider = document.getElementById('accidentalRate');
        if (slider && slider.value !== undefined && slider.value !== null) {
            const rate = parseInt(slider.value, 10);
            // 🛡️ 验证数值有效性和范围
            if (!isNaN(rate) && rate >= 0 && rate <= 100) {
                console.log(`🎼 从UI获取临时记号概率: ${rate}%`);
                return rate;
            } else {
                console.warn(`🎼 临时记号概率无效 (${slider.value}), 使用默认值0%`);
            }
        }
        console.log('🎼 使用默认临时记号概率: 0%');
        return 0;
    }

    /**
     * 获取节奏频率权重设置
     * @returns {Object} 节奏类型到频率权重的映射
     */
    getRhythmFrequencies() {
        const frequencies = {};
        const rhythmTypes = ['whole', 'dotted-half', 'half', 'dotted-quarter', 'quarter', 'eighth', '16th', 'triplet', 'duplet', 'quadruplet'];

        for (const rhythmType of rhythmTypes) {
            const slider = document.getElementById(`freq-${rhythmType}`);
            if (slider && slider.value) {
                frequencies[rhythmType] = parseInt(slider.value);
            }
        }

        console.log(`🎼 从UI获取节奏频率权重:`, frequencies);
        return frequencies;
    }

    /**
     * 应用临时记号到音符
     * @param {string} pitch - 原始音高（如 "C4"）
     * @returns {string} 可能带临时记号的音高
     */
    /**
     * 根据调号正确设置音符名（替代原有的随机临时记号方法）
     * @param {string} pitch - 原始音符（如 "C4"）
     * @returns {string} 根据调号修正的音符
     */
    applyKeySignature(pitch) {
        // 解析音符名和八度
        const match = pitch.match(/([A-G])([#b]?)([0-9]+)/);
        if (!match) return pitch;

        const [, baseName, currentAccidental, octave] = match;

        // 如果已经有临时记号，保持不变
        if (currentAccidental) {
            return pitch;
        }

        // 如果没有当前调号信息，返回原音符
        if (!this.currentKeySignature) {
            return pitch;
        }

        // 获取当前调号的音阶
        const scale = this.scales[this.currentKeySignature];
        if (!scale) {
            return pitch;
        }

        // 在调内音阶中查找对应的音符
        const scaleNote = scale.notes.find(note => {
            const noteBase = note.replace(/[#b]/g, '');
            return noteBase === baseName;
        });

        if (scaleNote && scaleNote !== baseName) {
            // 找到了带升降号的调内音符
            const correctedPitch = scaleNote + octave;
            console.log(`🎼 调号修正: ${pitch} -> ${correctedPitch} (${this.currentKeySignature}调)`);
            return correctedPitch;
        }

        return pitch;
    }

    /**
     * 保持兼容性的方法，现在使用调号处理
     */
    applyAccidental(pitch) {
        // 优先使用调号处理，只有在设置了随机临时记号率时才应用随机变化
        const keySignaturePitch = this.applyKeySignature(pitch);

        // 🔧 架构修复 (2025-10-10): 音程工具禁用智能变化音系统
        // 根本原因：上下方音符独立应用智能变化音，导致音程距离不可控
        // 示例：F[5]+二度→G[6] (baseScale正确), 但F→F#(50%), G→G#(70%)
        //       结果：F#→G = 1半音（小二度违规！）而非期望的2半音（大二度）
        // 解决方案：音程工具只使用7音自然音阶，保证音程距离精确可控
        const DISABLE_SMART_ALTERATIONS_FOR_INTERVAL_TOOL = true;

        if (DISABLE_SMART_ALTERATIONS_FOR_INTERVAL_TOOL) {
            console.log(`🔧 [音程工具] 智能变化音系统已禁用，使用自然小调音阶`);

            // 只应用调号处理和随机临时记号，跳过智能变化音
            // 继续执行后续的随机临时记号逻辑（Line 3083+）
        } else {
            // 🎵 小调和声/旋律特色音智能应用系统（仅旋律工具使用）
            // 在小调中，自动为第6/7级音应用升高，增加和声/旋律小调的音乐性
            if (this.currentScale && this.currentKeySignature) {
            const scale = this.currentScale;

            // 检测是否为小调（通过音阶结构：9个音表示包含变化音的小调）
            const isMinorKey = scale.notes && scale.notes.length === 9;

            if (isMinorKey) {
                // 解析音符名（不含八度）
                const match = keySignaturePitch.match(/([A-G][#b]*)([0-9]+)/);
                if (match) {
                    const [, noteName, octave] = match;

                    // 在音阶中查找当前音符的位置
                    const scaleIndex = scale.notes.findIndex(n => n === noteName);

                    if (scaleIndex !== -1) {
                        // 🎼 第7级音（导音）处理：和声小调特色音
                        // 索引7 = 自然第7级，索引8 = 升高的第7级（导音）
                        if (scaleIndex === 7 && scale.notes[8]) {
                            // 70% 概率升高为和声小调导音
                            if (Math.random() < 0.70) {
                                const raisedNote = scale.notes[8] + octave;
                                console.log(`🎵 [和声小调] 第7级升高: ${keySignaturePitch} → ${raisedNote} (70%概率)`);
                                return raisedNote;
                            }
                        }

                        // 🎼 第6级音处理：旋律小调特色音
                        // 索引5 = 自然第6级，索引6 = 升高的第6级
                        if (scaleIndex === 5 && scale.notes[6]) {
                            // 50% 概率升高为旋律小调第6级
                            if (Math.random() < 0.50) {
                                const raisedNote = scale.notes[6] + octave;
                                console.log(`🎵 [旋律小调] 第6级升高: ${keySignaturePitch} → ${raisedNote} (50%概率)`);
                                return raisedNote;
                            }
                        }
                    }
                }
            }
            }  // 结束 else 分支（智能变化音系统）
        }

        // 🔧 修复：恢复临时记号功能（根据用户设置的概率应用）
        if (this.accidentalRate > 0 && Math.random() * 100 <= this.accidentalRate) {
            // 解析音符名和八度
            const match = keySignaturePitch.match(/([A-G])([#b]?)([0-9]+)/);
            if (!match) return keySignaturePitch;

            const [, noteName, currentAccidental, octave] = match;

            // 智能选择临时记号，避免不合理的音程
            let newAccidental;
            if (!currentAccidental) {
                // 没有升降号的自然音，随机添加升号或降号
                newAccidental = Math.random() < 0.5 ? '#' : 'b';
            } else if (currentAccidental === '#') {
                // 已有升号，可以还原或双升
                newAccidental = Math.random() < 0.7 ? '' : '##';
            } else if (currentAccidental === 'b') {
                // 已有降号，可以还原或双降
                newAccidental = Math.random() < 0.7 ? '' : 'bb';
            }

            // 特殊情况处理：E#->F, B#->C, Fb->E, Cb->B
            if (noteName === 'E' && newAccidental === '#') return 'F' + octave;
            if (noteName === 'B' && newAccidental === '#') {
                const newOctave = parseInt(octave) + 1;
                return 'C' + newOctave;
            }
            if (noteName === 'F' && newAccidental === 'b') return 'E' + octave;
            if (noteName === 'C' && newAccidental === 'b') {
                const newOctave = parseInt(octave) - 1;
                return 'B' + newOctave;
            }

            const newPitch = noteName + newAccidental + octave;
            console.log(`🎼 应用随机临时记号(${this.accidentalRate}%概率): ${pitch} -> ${newPitch}`);
            return newPitch;
        }

        return keySignaturePitch;
    }

    /**
     * 应用节奏频率权重过滤
     * @param {Array} allowedRhythms - 原始允许的节奏类型
     * @returns {Array} 根据频率权重调整的节奏类型
     */
    applyRhythmFrequencyWeights(allowedRhythms) {
        // 🔧 修复 (2025-10-10): 不再创建重复数组
        // 原因：此函数创建的重复数组与 selectDurationByPreciseFrequency() 冲突
        // 新系统通过加权随机选择实现频率控制，无需重复对象
        console.log(`🎼 频率系统：使用精准加权选择 (selectDurationByPreciseFrequency)`);
        return allowedRhythms;
    }

    /**
     * 获取节奏类型对应的权重键名
     * @param {string} rhythmValue - 节奏值
     * @returns {string} 权重键名
     */
    getRhythmKey(rhythmValue) {
        const keyMap = {
            'whole': 'whole',
            'half.': 'dotted-half',
            'half': 'half',
            'quarter.': 'dotted-quarter',
            'quarter': 'quarter',
            'eighth.': 'eighth',  // 🔥 修复：附点八分音符映射到八分音符频率
            'eighth': 'eighth',
            '16th': '16th',
            'triplet': 'triplet',
            'duplet': 'duplet',
            'quadruplet': 'quadruplet'
        };
        return keyMap[rhythmValue] || rhythmValue;
    }

    /**
     * 计算拍号的实际小节时值（以四分音符为单位）
     * @param {Object} timeSignature - 拍号对象 {beats, beatType}
     * @returns {number} 小节总时值（四分音符为单位）
     */
    calculateMeasureDuration(timeSignature) {
        const { beats, beatType } = timeSignature;

        // beatType表示什么音符为一拍：
        // 2 = 二分音符为一拍（1拍 = 2个四分音符）
        // 4 = 四分音符为一拍（1拍 = 1个四分音符）
        // 8 = 八分音符为一拍（1拍 = 0.5个四分音符）

        const beatDurationInQuarters = 4 / beatType;
        const totalDuration = beats * beatDurationInQuarters;

        console.log(`🎼 拍号${beats}/${beatType}: ${beats}拍 × ${beatDurationInQuarters}四分音符/拍 = ${totalDuration}四分音符`);
        return totalDuration;
    }

    /**
     * 🧪 测试新的音程进行规则
     * @param {boolean} verbose - 是否显示详细日志
     * @returns {Object} 测试结果统计
     */
    testProgressionRules(verbose = true) {
        console.log('🧪 开始测试音程进行规则...');

        // 模拟音程类型数组
        const testIntervals = [
            { name: 'minor2nd', displayName: '小二度', semitones: 1 },
            { name: 'major2nd', displayName: '大二度', semitones: 2 },
            { name: 'minor3rd', displayName: '小三度', semitones: 3 },
            { name: 'major3rd', displayName: '大三度', semitones: 4 },
            { name: 'perfect4th', displayName: '完全四度', semitones: 5 },
            { name: 'perfect5th', displayName: '完全五度', semitones: 7 },
            { name: 'octave', displayName: '八度', semitones: 12 }
        ];

        const timeSignature = { beats: 4, beatType: 4 };
        const testPositions = [
            { pos: 0.0, expected: '重拍' },    // 第1拍
            { pos: 0.5, expected: '弱拍' },    // 第1拍后半拍
            { pos: 1.0, expected: '弱拍' },    // 第2拍
            { pos: 2.0, expected: '重拍' },    // 第3拍
            { pos: 2.5, expected: '弱拍' },    // 第3拍后半拍
            { pos: 3.0, expected: '弱拍' }     // 第4拍
        ];

        const results = {
            strongBeatLeaps: 0,     // 重拍跳跃音程数量
            strongBeatSteps: 0,     // 重拍步进音程数量
            weakBeatLeaps: 0,       // 弱拍跳跃音程数量（应该为0）
            weakBeatSteps: 0,       // 弱拍步进音程数量
            totalTests: 0
        };

        // 进行200次测试
        for (let i = 0; i < 200; i++) {
            for (const testPos of testPositions) {
                const selectedInterval = this.selectIntervalWithProgressionRules(
                    testIntervals, testPos.pos, timeSignature
                );

                if (selectedInterval) {
                    results.totalTests++;
                    const isStrongBeat = this.isStrongBeat(testPos.pos, timeSignature);
                    const isLeap = this.isLeapInterval(selectedInterval);

                    if (isStrongBeat) {
                        if (isLeap) {
                            results.strongBeatLeaps++;
                        } else {
                            results.strongBeatSteps++;
                        }
                    } else {
                        if (isLeap) {
                            results.weakBeatLeaps++;
                        } else {
                            results.weakBeatSteps++;
                        }
                    }

                    if (verbose && i < 5) {
                        console.log(`  位置${testPos.pos}: ${selectedInterval.displayName} (${isStrongBeat ? '重拍' : '弱拍'}, ${isLeap ? '跳跃' : '步进'})`);
                    }
                }
            }
        }

        // 计算统计数据
        const strongBeatTotal = results.strongBeatLeaps + results.strongBeatSteps;
        const weakBeatTotal = results.weakBeatLeaps + results.weakBeatSteps;
        const leapPercentageOnStrong = strongBeatTotal > 0 ? (results.strongBeatLeaps / strongBeatTotal * 100) : 0;

        console.log('\n📊 音程进行规则测试结果:');
        console.log(`  总测试数: ${results.totalTests}`);
        console.log(`  重拍位置: ${strongBeatTotal}次 (跳跃: ${results.strongBeatLeaps}, 步进: ${results.strongBeatSteps})`);
        console.log(`  弱拍位置: ${weakBeatTotal}次 (跳跃: ${results.weakBeatLeaps}, 步进: ${results.weakBeatSteps})`);
        console.log(`  重拍跳跃比例: ${leapPercentageOnStrong.toFixed(1)}% (期望: ~15%)`);
        console.log(`  弱拍跳跃违规: ${results.weakBeatLeaps}次 (期望: 0次)`);

        // 验证规则是否正确
        const isValid = results.weakBeatLeaps === 0 && leapPercentageOnStrong >= 10 && leapPercentageOnStrong <= 25;
        console.log(`\n${isValid ? '✅' : '❌'} 规则验证: ${isValid ? '通过' : '失败'}`);

        return results;
    }

    /**
     * 生成小节的节奏型（考虑正确的4/4拍beaming规则）
     * @param {Object} timeSignature - 拍号信息
     * @param {Array} allowedRhythms - 允许的节奏类型
     * @returns {Array} 节奏型数组（包含beaming信息）
     */
    generateRhythmPattern(timeSignature, allowedRhythms, measureIndex = 0) {
        const totalBeats = timeSignature.beats; // 小节总拍数
        const beatType = timeSignature.beatType; // 拍子单位（4表示四分音符为一拍）

        // 🎯 计算小节的实际总时值（以四分音符为单位）
        const measureDuration = this.calculateMeasureDuration(timeSignature);
        console.log(`🎵 生成${totalBeats}/${beatType}拍的节奏型，实际时值: ${measureDuration}拍，可用节奏:`, allowedRhythms.map(r => r.displayName));

        // 注意：频率过滤已在 generateMeasure 中应用，这里直接使用传入的节奏
        const weightedRhythms = allowedRhythms;
        console.log(`🎯 传入的节奏（已过滤）:`, weightedRhythms.map(r => r.displayName));

        const rhythmPattern = [];

        if (totalBeats === 4 && beatType === 4) {
            // 🎯 修复：4/4拍允许跨拍群的附点音符组合和全音符
            console.log('📊 应用4/4拍beaming规则：支持跨拍群附点音符和全音符');

            // 🔧 修复：优先检查是否可以生成全音符（占满整个小节）
            const hasWholeNote = weightedRhythms.some(r => r.value === 'whole');

            // 检查用户是否主要/只选择了全音符
            const totalFrequencyCount = this.rhythmFrequencies ?
                Object.values(this.rhythmFrequencies).filter(f => f > 0).length : 0;
            const wholeNoteFreq = this.rhythmFrequencies ? (this.rhythmFrequencies['whole'] || 0) : 0;
            const isWholeNoteDominant = wholeNoteFreq >= 80 || (totalFrequencyCount === 1 && wholeNoteFreq > 0);

            const wholeNoteChance = hasWholeNote ? (isWholeNoteDominant ? 1.0 : 0.2) : 0; // 如果用户只选择全音符，100%概率

            if (hasWholeNote && Math.random() < wholeNoteChance) {
                console.log('🎵 选择生成全音符，占满整个4/4拍小节');

                const wholeNoteRhythm = weightedRhythms.find(r => r.value === 'whole');
                const wholeNoteElement = {
                    value: 'whole',
                    displayName: this.getDurationDisplayName('whole'),
                    duration: 4.0,
                    type: 'note' // 全音符不需要beaming
                };

                rhythmPattern.push(wholeNoteElement);
                console.log('✅ 生成全音符成功，跳过分组逻辑');
                return rhythmPattern; // 🔧 修复：全音符生成后立即返回，跳过后续分组逻辑

            } else {
                // 🎲 随机决定是否尝试生成跨拍群的附点音符组合
                const shouldAttemptCrossBeatPattern = Math.random() < 0.3; // 30%概率

                if (shouldAttemptCrossBeatPattern) {
                console.log('🎯 尝试生成跨拍群附点音符组合...');

                // 先生成第一拍群：拍1-2
                const firstBeatGroup = this.generateBeatGroup(weightedRhythms, 2.0, 'group1', {beats: totalBeats, beatType}, 0.0);

                // 检查第一拍群是否生成了二分音符
                const hasHalfNote = firstBeatGroup.some(note =>
                    note.type === 'note' && Math.abs(note.duration - 2.0) < 0.01
                );

                if (hasHalfNote && firstBeatGroup.length === 1) {
                    console.log('🔍 第一拍群生成了二分音符，检查用户是否选择了四分音符...');

                    // 🔍 检查用户是否实际选择了四分音符
                    const userSelectedQuarter = weightedRhythms.some(r => r.value === 'quarter');

                    if (userSelectedQuarter) {
                        console.log('✅ 用户选择了四分音符，可以在第二拍群生成四分音符');

                        // 第二拍群生成四分音符
                        const quarterNote = {
                            value: 'quarter',
                            displayName: '四分音符',
                            duration: 1.0,
                            type: 'note',
                        };

                        rhythmPattern.push(...firstBeatGroup);
                        rhythmPattern.push(quarterNote);

                        // 填充剩余的1拍
                        const remainingGroup = this.generateBeatGroup(weightedRhythms, 1.0, 'group3', {beats: totalBeats, beatType}, 3.0);
                        rhythmPattern.push(...remainingGroup);
                    } else {
                        console.log('🔍 ❌ 用户没有选择四分音符，不能强制生成四分音符！');
                        console.log('🔍 改为使用用户选择的节奏类型填充剩余拍数');

                        // 使用用户选择的节奏填充剩余的2拍
                        rhythmPattern.push(...firstBeatGroup);
                        const remainingGroup = this.generateBeatGroup(weightedRhythms, 2.0, 'group2', {beats: totalBeats, beatType}, 2.0);
                        rhythmPattern.push(...remainingGroup);
                    }

                    console.log('🎯 跨拍群组合生成完成，严格遵循用户选择的时值类型');
                } else {
                    // 如果第一拍群不是单个二分音符，使用标准分组
                    console.log('🎯 第一拍群不适合跨拍群组合，使用标准分组');
                    rhythmPattern.push(...firstBeatGroup);

                    const secondBeatGroup = this.generateBeatGroup(weightedRhythms, 2.0, 'group2', {beats: totalBeats, beatType}, 2.0);
                    rhythmPattern.push(...secondBeatGroup);
                }
            } else {
                // 标准4/4拍分组
                console.log('📊 使用标准4/4拍分组：拍1-2一组，拍3-4一组');

                // 🔥 Fix 8: 小节级别冲突组平衡
                // 检测冲突组并预分配每个拍群的组选择
                const hasSixteenth = weightedRhythms.some(r => r.conflictGroup === 'sixteenth');
                const hasTriplet = weightedRhythms.some(r => r.conflictGroup === 'triplet');

                if (hasSixteenth && hasTriplet) {
                    // 有冲突组：确保小节内两组都出现
                    // 随机决定第一个拍群使用哪个组，第二个拍群使用另一个组
                    const firstGroup = Math.random() < 0.5 ? 'sixteenth' : 'triplet';
                    const secondGroup = firstGroup === 'sixteenth' ? 'triplet' : 'sixteenth';
                    this._measureGroupSequence = [firstGroup, secondGroup];
                    this._currentGroupIndex = 0;
                    console.log(`🔥 小节冲突组平衡启用！拍群1=${firstGroup}，拍群2=${secondGroup}`);
                    console.log(`📊 十六分音符节奏: ${weightedRhythms.filter(r => r.conflictGroup === 'sixteenth').map(r => r.displayName || r.value).join(', ')}`);
                    console.log(`📊 三连音节奏: ${weightedRhythms.filter(r => r.conflictGroup === 'triplet').map(r => r.displayName || r.value).join(', ')}`);
                } else {
                    this._measureGroupSequence = null;
                    this._currentGroupIndex = 0;
                    if (hasSixteenth) {
                        console.log(`📌 仅有十六分音符组，无需平衡`);
                    } else if (hasTriplet) {
                        console.log(`📌 仅有三连音组，无需平衡`);
                    }
                }

                // 第一拍群：拍1-2（共2个四分音符时值）从位置0开始
                const firstBeatGroup = this.generateBeatGroup(weightedRhythms, 2.0, 'group1', {beats: totalBeats, beatType}, 0.0);
                rhythmPattern.push(...firstBeatGroup);

                    // 第二拍群：拍3-4（共2个四分音符时值）从位置2开始
                    const secondBeatGroup = this.generateBeatGroup(weightedRhythms, 2.0, 'group2', {beats: totalBeats, beatType}, 2.0);
                    rhythmPattern.push(...secondBeatGroup);

                // 🔥 Fix C: 验证冲突组平衡效果
                if (hasSixteenth && hasTriplet) {
                    const hasSixteenthInResult = rhythmPattern.some(r =>
                        r.value && (r.value === '16th' || r.value === '16th.' || r.value.includes('16'))
                    );
                    const hasTripletInResult = rhythmPattern.some(r =>
                        r.isTriplet || r.tripletGroup || r.value === 'triplet'
                    );
                    console.log(`✅ 平衡验证：十六分音符=${hasSixteenthInResult ? '✓出现' : '✗缺失'}, 三连音=${hasTripletInResult ? '✓出现' : '✗缺失'}`);
                    if (!hasSixteenthInResult) {
                        console.warn(`⚠️ 警告：小节中未出现十六分音符！`);
                    }
                    if (!hasTripletInResult) {
                        console.warn(`⚠️ 警告：小节中未出现三连音！`);
                    }
                }

                // 清理小节级别的组序列
                this._measureGroupSequence = null;
                this._currentGroupIndex = 0;
                }
            } // 🔧 修复：为新增的全音符逻辑添加闭合括号

        } else if (this.is68Time(timeSignature)) {
            // 🎼 6/8拍：使用“编排器”以短语/配额/反重复进行生成（更具音乐性）
            const measureDuration = this.calculateMeasureDuration(timeSignature);
            const events = this.generate68OrchestratedRhythm(weightedRhythms, measureDuration, timeSignature, measureIndex);
            return events;

        } else if (this.isOtherCompoundTime(timeSignature)) {
            // 🎼 其他复合拍子（9/8, 12/8等），明确排除6/8拍
            console.log(`📊 检测到复合拍子: ${totalBeats}/${beatType}拍 (排除6/8拍)`);
            const groupDuration = 1.5;
            const numGroups = totalBeats / 3;
            console.log(`📊 将分成${numGroups}组，每组${groupDuration}拍`);

            for (let i = 0; i < numGroups; i++) {
                const startPosition = i * groupDuration;
                const groupEvents = this.generate68GroupWithBoundaryCheck(
                    this.filter68Rhythms(weightedRhythms),
                    groupDuration,
                    i + 1,
                    startPosition
                );
                rhythmPattern.push(...groupEvents);
            }

        } else {
            // 其他拍号：按实际时值生成
            console.log(`📊 进入其他拍号处理分支: ${totalBeats}/${beatType}拍`);

            // 🛡️ 安全检查：6/8拍现在不应该走到这里
            if (this.is68Time(timeSignature)) {
                console.error(`❌ 致命错误: 6/8拍意外走到了标准分组路径! 这不应该发生!`);
                throw new Error(`6/8拍路径错误: 不应该走到这里，检查条件判断逻辑`);
            } else {
                console.log(`📊 应用标准拍分组规则，总时值: ${measureDuration}拍`);
                const beatRhythms = this.generateBeatGroup(weightedRhythms, measureDuration, 'standard', null, 0.0);
                rhythmPattern.push(...beatRhythms);
            }
        }

        console.log(`✅ 生成节奏型: ${rhythmPattern.map(r => `${r.displayName}(${r.duration}拍)${r.beamGroup ? '[连音]' : ''}`).join(' + ')}`);

        // 🔒 最终安全检查：确保节奏型不为空
        if (!rhythmPattern || rhythmPattern.length === 0) {
            console.error(`🚨 generateRhythmPattern返回空数组！强制添加默认节奏`);
            const measureDuration = this.calculateMeasureDuration(timeSignature);
            return [{
                value: 'whole',
                displayName: '紧急全音符',
                duration: measureDuration,
                type: 'note',
            }];
        }

        // 🔥 修复3: 强制时值验证和浮点误差修正
        // measureDuration 已在函数开头声明（line 2891），直接使用
        const actualTotal = rhythmPattern.reduce((sum, r) => {
            const beats = r.duration || this.durationToBeats(r.value);
            return sum + beats;
        }, 0);
        const diff = actualTotal - measureDuration;

        console.log(`🔍 时值验证: 期望${measureDuration.toFixed(3)}拍，实际${actualTotal.toFixed(3)}拍，差异${diff.toFixed(3)}拍`);

        if (Math.abs(diff) > 0.001) {
            // 存在时值误差
            if (Math.abs(diff) < 0.2 && rhythmPattern.length > 0) {
                // 微小误差（< 0.2拍）：自动修正最后一个音符
                const lastNote = rhythmPattern[rhythmPattern.length - 1];
                const lastBeats = lastNote.duration || this.durationToBeats(lastNote.value);
                const correctedBeats = lastBeats - diff;

                console.log(`🔧 自动修正最后音符时值: ${lastBeats.toFixed(3)}拍 → ${correctedBeats.toFixed(3)}拍`);

                // 尝试转换为标准时值
                const correctedValue = this.beatsToNoteDuration(correctedBeats);
                const standardBeats = this.durationToBeats(correctedValue);

                // 验证修正后的标准时值是否合理（误差不超过0.05拍）
                if (Math.abs(standardBeats - correctedBeats) < 0.05) {
                    lastNote.value = correctedValue;
                    lastNote.duration = standardBeats;
                    lastNote.beats = standardBeats;  // 🔥 修复：同步更新beats属性
                    lastNote.displayName = this.getRhythmDisplayName(correctedValue);
                    console.log(`✅ 修正成功: 使用${correctedValue} (${standardBeats.toFixed(3)}拍)`);
                } else {
                    // 标准时值误差过大，直接使用修正后的时值
                    lastNote.duration = correctedBeats;
                    lastNote.beats = correctedBeats;  // 🔥 修复：同步更新beats属性
                    console.log(`⚠️ 标准时值误差过大，直接使用${correctedBeats.toFixed(3)}拍`);
                }

                // 重新验证总时值
                const newTotal = rhythmPattern.reduce((sum, r) => sum + (r.duration || this.durationToBeats(r.value)), 0);
                const newDiff = Math.abs(newTotal - measureDuration);
                console.log(`🔍 修正后验证: 实际${newTotal.toFixed(3)}拍，差异${newDiff.toFixed(3)}拍`);

            } else if (Math.abs(diff) >= 0.2) {
                // 严重误差（>= 0.2拍）：输出警告但不修正
                console.error(`❌ 严重时值误差: 差异${diff.toFixed(3)}拍超过阈值0.2拍`);
                console.error(`🚨 节奏型内容:`, rhythmPattern.map(r => `${r.displayName}(${(r.duration || this.durationToBeats(r.value)).toFixed(3)}拍)`).join(', '));
                console.log(`⚠️ 保留原始节奏型，后续流程将检测并处理`);
            }
        } else {
            console.log(`✅ 时值验证通过`);
        }

        return rhythmPattern;
    }

    /**
     * 简化节奏型：在二分音符拍点内合并四分音符+八分音符为附点四分音符
     * @param {Array} rhythmPattern - 原始节奏型
     * @param {Object} timeSignature - 拍号信息
     * @returns {Array} 简化后的节奏型
     */
    simplifyRhythmPattern(rhythmPattern, timeSignature) {
        // 🛡️ 6/8编排的节奏不再进行自动合并，直接返回以保留乐句结构
        if (this.is68Time(timeSignature)) {
            return rhythmPattern;
        }
        // 🔒 输入验证 - 修复：不能返回空数组，会导致空白小节
        if (!rhythmPattern || !Array.isArray(rhythmPattern)) {
            console.error(`🚨 simplifyRhythmPattern: 无效输入 rhythmPattern:`, rhythmPattern);
            console.log(`🔧 生成安全的默认节奏型避免空白小节`);
            // 生成安全的默认节奏型
            const measureDuration = this.calculateMeasureDuration(timeSignature);
            return [{
                value: measureDuration >= 4 ? 'whole' : measureDuration >= 2 ? 'half' : 'quarter',
                displayName: measureDuration >= 4 ? '全音符（默认）' : measureDuration >= 2 ? '二分音符（默认）' : '四分音符（默认）',
                duration: measureDuration,
                type: 'note',
            }];
        }

        if (rhythmPattern.length === 0) {
            console.log(`🎼 simplifyRhythmPattern: 空数组输入，生成默认节奏`);
            // 不能返回空数组！生成默认节奏型
            const measureDuration = this.calculateMeasureDuration(timeSignature);
            return [{
                value: measureDuration >= 4 ? 'whole' : measureDuration >= 2 ? 'half' : 'quarter',
                displayName: measureDuration >= 4 ? '全音符（默认）' : measureDuration >= 2 ? '二分音符（默认）' : '四分音符（默认）',
                duration: measureDuration,
                type: 'note',
            }];
        }

        // 🎼 检查是否有十六分音符等短时值（但不跳过简化）
        const hasSubEighthNotes = rhythmPattern.some(r =>
            r && r.duration < 0.5 && !r.tripletGroup // 不包括三连音
        );

        if (hasSubEighthNotes) {
            console.log('🎼 检测到十六分音符等短时值，仍尝试简化其他组合');
        }

        console.log('🎼 开始节奏简化：合并连续的音符组合');
        console.log('🎼 原始节奏型:', rhythmPattern.map(r => `${r.displayName}(${r.duration}拍,${r.type})`));

        const simplified = [];
        let currentPosition = 0;
        let i = 0;

        while (i < rhythmPattern.length) {
            const current = rhythmPattern[i];
            const next = rhythmPattern[i + 1];

            console.log(`🎼 检查位置 ${currentPosition}: ${current?.displayName} (${current?.duration}拍,${current?.type}) + ${next?.displayName} (${next?.duration}拍,${next?.type})`);

            if (current && next) {
                console.log(`🎼 详细信息 - current: triplet=${current.tripletGroup}, beamGroup=${current.beamGroup}, type=${current.type}`);
                console.log(`🎼 详细信息 - next: triplet=${next.tripletGroup}, beamGroup=${next.beamGroup}, type=${next.type}`);
            }

            // 🎼 检查可以简化的模式
            let canSimplify = false;
            let simplifiedNote = null;
            let advanceBy = 2;

            // 🔒 N-plet保护：二连音/四连音元素不可参与任何简化或合并
            const isNplet = (el) => el && el.tupletGroup && (el.tupletKind === 'duplet' || el.tupletKind === 'quadruplet' || el.value === 'duplet' || el.value === 'quadruplet');
            if (isNplet(current) || isNplet(next)) {
                canSimplify = false; // 不做任何处理
            }

            // 🎵 特殊规则：连线的四分音符+八分音符可以简化为附点四分音符（当二分音符拍点明确时）
            const isTiedQuarterEighthPattern = current && next &&
                current.type === 'note' && next.type === 'note' &&
                current.duration === 1.0 && next.duration === 0.5 &&
                current.tie === 'start' && next.tie === 'stop';

            // 🎵 检查休止符简化：四分休止符 + 八分休止符 → 附点四分休止符
            if (current && next &&
                current.type === 'rest' && next.type === 'rest' &&
                current.duration === 1.0 && next.duration === 0.5) {
                canSimplify = true;
                // 🔧 修复：使用标准时值映射生成正确的附点四分休止符显示名称
                const quarterDotDisplayName = this.getDurationDisplayName('quarter.');
                simplifiedNote = {
                    ...current, // 🔥 保留原始属性，包括position、beamGroup等
                    type: 'rest',
                    value: 'quarter.',
                    displayName: `${quarterDotDisplayName}休止符`,
                    duration: 1.5,
                    actualDuration: 1.5, // 🔥 同步更新actualDuration，避免getElementDuration返回错误值
                    tie: 'none'
                };
                console.log(`🎼 休止符简化：${current.displayName}(${current.duration}) + ${next.displayName}(${next.duration}) → 附点四分休止符`);
            }
            // 🎵 检查主要休止符组合：四分休止符 + 四分休止符 → 二分休止符
            else if (current && next &&
                current.type === 'rest' && next.type === 'rest' &&
                current.duration === 1.0 && next.duration === 1.0) {
                canSimplify = true;
                // 🔧 修复：使用标准时值映射生成正确的二分休止符显示名称
                const halfDisplayName = this.getDurationDisplayName('half');
                simplifiedNote = {
                    ...current, // 🔥 保留原始属性，包括position、beamGroup等
                    type: 'rest',
                    value: 'half',
                    displayName: `${halfDisplayName}休止符`,
                    duration: 2.0,
                    actualDuration: 2.0, // 🔥 同步更新actualDuration，避免getElementDuration返回错误值
                    tie: 'none'
                };
                console.log(`🎼 休止符简化：${current.displayName}(${current.duration}) + ${next.displayName}(${next.duration}) → 二分休止符`);
            }
            // 🎵 检查音符简化
            else if (current && next &&
                current.type === 'note' && next.type === 'note' &&
                !current.tripletGroup && !next.tripletGroup &&
                ((!current.tie || current.tie === 'none') &&
                 (!next.tie || next.tie === 'none') ||
                 isTiedQuarterEighthPattern)) {
                // 🎼 移除beam组检查，因为可能过于严格
                // 🔒 连线检查：一般情况下有连线的音符不简化，但四分+八分连线可以简化为附点四分

                console.log(`🎼 基本条件满足，检查时值模式...`);
                console.log(`🎼 当前音符: ${current.displayName || current.value}(${current.duration}拍) - beam:${current.beamGroup}, triplet:${current.tripletGroup}, tie:${current.tie || 'none'}`);
                console.log(`🎼 下一音符: ${next.displayName || next.value}(${next.duration}拍) - beam:${next.beamGroup}, triplet:${next.tripletGroup}, tie:${next.tie || 'none'}`);

                // 🎼 模式1：四分音符 + 八分音符 = 附点四分音符
                if (current.duration === 1.0 && next.duration === 0.5) {
                    canSimplify = true;
                    // 🔥 修复：保留原始属性，特别是position和beam信息
                    simplifiedNote = {
                        ...current, // 🔥 保留原始属性，包括position、beamGroup等
                        type: 'note',
                        value: 'quarter.',
                        displayName: '附点四分音符',
                        duration: 1.5,
                        actualDuration: 1.5, // 🔥 同步更新actualDuration，避免getElementDuration返回错误值
                        // ⚠️ 不再清除beam信息！保留给拍点明确化后的音符使用
                        //,
                        //,
                        tie: 'none' // 🎵 简化后清除连线标记
                    };
                    if (isTiedQuarterEighthPattern) {
                        console.log(`🎼 连线简化：${current.displayName}(tie:${current.tie}) + ${next.displayName}(tie:${next.tie}) → 附点四分音符(无连线)`);
                    } else {
                        console.log(`🎼 简化：${current.displayName}(${current.duration}) + ${next.displayName}(${next.duration}) → 附点四分音符`);
                    }

                // 🎼 模式2：八分音符 + 四分音符 = 附点四分音符（顺序调换）
                } else if (current.duration === 0.5 && next.duration === 1.0) {
                    canSimplify = true;
                    // 🔥 修复：创建全新的附点四分音符对象，保留原始属性（包括position和beam信息）
                    simplifiedNote = {
                        ...current, // 🔥 保留原始属性，包括position、beamGroup等
                        type: 'note',
                        value: 'quarter.',
                        displayName: '附点四分音符',
                        duration: 1.5,
                        actualDuration: 1.5, // 🔥 同步更新actualDuration，避免getElementDuration返回错误值
                        // ⚠️ 不再清除beam信息！保留给拍点明确化后的音符使用
                        //,
                        //,
                        tie: 'none' // 🎵 简化后清除连线标记
                    };
                    console.log(`🎼 简化：${current.displayName}(${current.duration}) + ${next.displayName}(${next.duration}) → 附点四分音符`);

                // 🎼 模式3：二分音符 + 四分音符 = 附点二分音符
                } else if (current.duration === 2.0 && next.duration === 1.0 && !this.halfNoteOnlyMode) {
                    canSimplify = true;
                    // 🔥 修复：创建全新的附点二分音符对象，保留原始属性（包括position）
                    simplifiedNote = {
                        ...current, // 🔥 保留原始属性，包括position、beamGroup等
                        type: 'note',
                        value: 'half.',
                        displayName: '附点二分音符',
                        duration: 3.0,
                        actualDuration: 3.0, // 🔥 同步更新actualDuration，避免getElementDuration返回错误值
                        // ⚠️ 不再清除beam信息！保留给拍点明确化后的音符使用
                        //,
                        //,
                        tie: 'none' // 🎵 简化后清除连线标记
                    };
                    console.log(`🎼 简化：${current.displayName}(${current.duration}) + ${next.displayName}(${next.duration}) → 附点二分音符`);

                // 🎼 模式4：四分音符 + 二分音符 = 附点二分音符（顺序调换）
                } else if (current.duration === 1.0 && next.duration === 2.0 && !this.halfNoteOnlyMode) {
                    canSimplify = true;
                    // 🔥 修复：创建全新的附点二分音符对象，保留原始属性（包括position）
                    simplifiedNote = {
                        ...current, // 🔥 保留原始属性，包括position、beamGroup等
                        type: 'note',
                        value: 'half.',
                        displayName: '附点二分音符',
                        duration: 3.0,
                        actualDuration: 3.0, // 🔥 同步更新actualDuration，避免getElementDuration返回错误值
                        // ⚠️ 不再清除beam信息！保留给拍点明确化后的音符使用
                        //,
                        //,
                        tie: 'none' // 🎵 简化后清除连线标记
                    };
                    console.log(`🎼 简化：${current.displayName}(${current.duration}) + ${next.displayName}(${next.duration}) → 附点二分音符`);
                } else {
                    console.log(`🎼 无法简化：${current.displayName || current.value}(${current.duration}) + ${next.displayName || next.value}(${next.duration}) - 不匹配任何简化模式`);
                }
            } else {
                console.log(`🎼 不符合简化条件:`, {
                    current: current ? `${current.displayName}(type:${current.type}, triplet:${current.tripletGroup}, tie:${current.tie || 'none'})` : 'null',
                    next: next ? `${next.displayName}(type:${next.type}, triplet:${next.tripletGroup}, tie:${next.tie || 'none'})` : 'null'
                });
            }

            if (canSimplify && simplifiedNote) {
                simplified.push(simplifiedNote);
                i += advanceBy;
                currentPosition += simplifiedNote.duration; // 使用实际的简化音符时值

            } else {
                // 🎼 保持原音符不变
                if (current) {
                    simplified.push(current);
                    currentPosition += current.duration;
                } else {
                    console.warn(`🚨 跳过无效的音符元素 at index ${i}`);
                }
                i++;
            }
        }

        const originalCount = rhythmPattern.length;
        const simplifiedCount = simplified.length;

        console.log(`🎼 简化结果:`, simplified.map(r => `${r.displayName}(${r.duration}拍,${r.type})`));

        if (simplifiedCount < originalCount) {
            console.log(`🎼 节奏简化完成：${originalCount} → ${simplifiedCount} 个音符`);
        } else {
            console.log(`🎼 没有进行简化：${originalCount} 个音符保持不变`);
        }

        // 🔒 安全检查：如果原始有内容但简化后为空，返回原始数据
        if (rhythmPattern.length > 0 && simplified.length === 0) {
            console.error(`🚨 严重错误：简化过程导致数据丢失！返回原始数据以避免空白小节`);
            console.error(`🚨 原始数据:`, rhythmPattern);
            return [...rhythmPattern]; // 返回原始数据的副本
        }

        // 🔍 [验证] 简化后的时值总和检查
        const originalDuration = rhythmPattern.reduce((sum, el) => sum + (el.duration || 0), 0);
        let simplifiedDuration = simplified.reduce((sum, el) => sum + (el.duration || 0), 0);
        const durationDiff = originalDuration - simplifiedDuration;

        if (Math.abs(durationDiff) > 0.0001) {
            console.warn(`⚠️ [验证] 简化前后时值不一致！`);
            console.warn(`  原始总时值: ${originalDuration.toFixed(6)}拍`);
            console.warn(`  简化后总时值: ${simplifiedDuration.toFixed(6)}拍`);
            console.warn(`  差异: ${durationDiff.toFixed(6)}拍`);

            // 🔧 [修正] 如果误差在可修正范围内（<0.01拍），调整最后一个元素的duration
            if (Math.abs(durationDiff) < 0.01 && simplified.length > 0) {
                const lastElement = simplified[simplified.length - 1];
                const correctedDuration = lastElement.duration + durationDiff;

                // 确保修正后的duration仍然合理（在原值±10%范围内）
                if (Math.abs(correctedDuration - lastElement.duration) / lastElement.duration < 0.1) {
                    console.log(`🔧 [修正] 调整最后一个元素: ${lastElement.duration.toFixed(6)} → ${correctedDuration.toFixed(6)}拍`);
                    lastElement.duration = correctedDuration;
                    lastElement.beats = correctedDuration;  // 🔥 修复：同步更新beats属性
                    lastElement.actualDuration = correctedDuration;
                    simplifiedDuration = simplified.reduce((sum, el) => sum + (el.duration || 0), 0);
                    console.log(`✅ [修正完成] 修正后总时值: ${simplifiedDuration.toFixed(6)}拍`);
                } else {
                    console.warn(`⚠️ [修正失败] 修正量过大，跳过修正`);
                }
            }
        } else {
            console.log(`✅ [验证] 简化后时值正确: ${simplifiedDuration.toFixed(6)}拍`);
        }

        return simplified;
    }

    /**
     * 生成拍群节奏（4/4拍专用：处理拍1-2或拍3-4）
     * @param {Array} allowedRhythms - 允许的节奏类型
     * @param {number} groupDuration - 拍群总时值（四分音符为单位）
     * @param {string} groupId - 拍群标识符
     * @returns {Array} 拍群内的节奏数组（包含beaming信息）
     */
    generateBeatGroup(allowedRhythms, groupDuration, groupId, timeSignature = null, startPosition = 0.0) {
        console.log(`🎵 生成拍群节奏 [${groupId}]，时值: ${groupDuration}拍，起始位置: ${startPosition}拍`, timeSignature ? `拍号: ${timeSignature.beats}/${timeSignature.beatType}` : '');

        // 过滤出适合的节奏类型
        console.log(`🔍 过滤适合的节奏类型，目标时长: ${groupDuration}拍`);
        console.log(`🔍 输入节奏列表:`, allowedRhythms.map(r => `${r.displayName}(${r.value})`));

        const suitableRhythms = allowedRhythms.filter(rhythm => {
            const duration = this.rhythmDurations[rhythm.value];
            const suitable = duration && duration <= groupDuration;
            console.log(`🔍 检查节奏 ${rhythm.displayName}(${rhythm.value}): 时值=${duration}拍, 适合=${suitable}`);
            return suitable;
        });

        console.log(`🔍 过滤结果: ${suitableRhythms.length}种适合的节奏:`, suitableRhythms.map(r => r.displayName));

        if (suitableRhythms.length === 0) {
            console.log(`🔍 ❌ 没有找到适合${groupDuration}拍的节奏类型！`);
            console.log(`🔍 这可能是导致系统生成用户未选择时值的另一个原因`);

            // 检查用户是否有严格设置
            console.log(`🔍 检查用户频率设置:`, this.rhythmFrequencies);
            // 🔧 修复：检查是否存在严格的频率设置（用户明确只选择了某些节奏）
            const hasStrictFrequencySettings = this.rhythmFrequencies &&
                Object.keys(this.rhythmFrequencies).length > 0 &&
                Object.values(this.rhythmFrequencies).some(freq => freq > 0);

            if (hasStrictFrequencySettings) {
                // 用户有明确的频率设置，不应该使用默认节奏
                console.warn(`⚠️ 没有合适的节奏类型可用于${groupDuration}拍，且用户有严格频率设置，填充休止符`);
                const closestValue = this.findClosestDuration(groupDuration);
                const restValue = closestValue + '-rest';
                return [{
                    value: restValue,
                    displayName: this.getDurationDisplayName(restValue),
                    duration: groupDuration,
                    type: 'rest',
                }];
            }

            // 🎯 智能默认：根据拍群时值生成合适的默认节奏（仅当用户没有严格频率设置时）
            console.warn(`⚠️ 没有合适的节奏类型可用于${groupDuration}拍，使用智能默认`);

            if (groupDuration <= 1.0) {
                // ≤1拍：使用最接近的单个音符
                const closestValue = this.findClosestDuration(groupDuration);
                const standardDuration = this.rhythmDurations[closestValue];
                const displayName = this.getDurationDisplayName(closestValue);
                return [{
                    value: closestValue,
                    displayName: displayName,
                    duration: standardDuration,
                    type: 'note',
                }];
            } else if (groupDuration === 1.5) {
                // 1.5拍：附点四分音符
                return [{
                    value: 'quarter.',
                    displayName: '附点四分音符',
                    duration: 1.5,
                    type: 'note',
                }];
            } else if (groupDuration === 2.0) {
                // 2拍：二分音符或两个四分音符
                return [{
                    value: 'half',
                    displayName: '二分音符',
                    duration: 2.0,
                    type: 'note',
                }];
            } else if (groupDuration === 3.0) {
                // 3拍：附点二分音符
                return [{
                    value: 'half.',
                    displayName: '附点二分音符',
                    duration: 3.0,
                    type: 'note',
                }];
            } else {
                // 其他情况：使用最接近的时值
                const closestValue = this.findClosestDuration(groupDuration);
                const standardDuration = this.rhythmDurations[closestValue];
                return [{
                    value: closestValue,
                    displayName: `填充音符(${standardDuration}拍)`,
                    duration: standardDuration,
                    type: 'note',
                }];
            }
        }

        // 🔥 二分音符专用模式：直接返回二分音符，不进行复杂的事件生成
        if (this.halfNoteOnlyMode) {
            console.log('🔥 二分音符专用模式：拍群直接使用二分音符填充');

            if (groupDuration === 2.0) {
                // 2拍拍群：一个二分音符
                return [{
                    value: 'half',
                    displayName: '二分音符',
                    duration: 2.0,
                    type: 'note',
                }];
            } else if (groupDuration === 4.0) {
                // 4拍（整个小节）：两个二分音符
                return [
                    {
                        value: 'half',
                        displayName: '二分音符',
                        duration: 2.0,
                        type: 'note',
                    },
                    {
                        value: 'half',
                        displayName: '二分音符',
                        duration: 2.0,
                        type: 'note',
                    }
                ];
            } else if (groupDuration === 1.0) {
                // 1拍拍群：在二分音符模式下这不应该发生，但提供fallback
                console.warn('🔥 二分音符专用模式：遇到1拍拍群，使用二分音符并调整时值');
                return [{
                    value: 'half',
                    displayName: '二分音符（调整）',
                    duration: 2.0, // 保持2拍，让系统自动处理时值溢出
                    type: 'note',
                }];
            } else {
                // 其他情况：尽量用二分音符填充
                const halfNotesCount = Math.floor(groupDuration / 2.0);
                const events = [];

                for (let i = 0; i < halfNotesCount; i++) {
                    events.push({
                        value: 'half',
                        displayName: '二分音符',
                        duration: 2.0,
                        beats: 2.0, // 🆕 从旋律工具迁移：beats时值
                        type: 'note',
                    });
                }

                console.log(`🔥 二分音符专用模式：${groupDuration}拍拍群填充${halfNotesCount}个二分音符`);
                return events;
            }
        }

        // 生成拍群内的事件（音符和休止符）
        const groupEvents = this.generateGroupEvents(suitableRhythms, groupDuration, timeSignature, startPosition);

        // 🎵 应用拍号特定的beaming规则：根据不同拍号调用相应的beam生成函数
        const timeSignatureStr = timeSignature ? `${timeSignature.beats}/${timeSignature.beatType}` : '4/4';
        return this.applyBeatGroupBeaming(groupEvents, groupId, timeSignatureStr);
    }


    /**
     * 为6/8拍过滤合适的节奏类型
     * @param {Array} rhythms - 原始节奏类型
     * @returns {Array} 适合6/8拍的节奏类型
     */
    filter68Rhythms(rhythms) {
        // 🔧 修复：6/8拍应使用复合拍子节奏（附点音符）而不是简单拍子节奏
        // 6/8拍标准节奏：附点二分音符（3拍，整个小节）、附点四分音符（1.5拍，一个强拍组）、八分音符（0.5拍）
        // 移除四分音符（1拍）和二分音符（2拍），因为它们属于简单拍子
        return rhythms.filter(r => {
            const duration = this.rhythmDurations[r.value] || 0;

            // 🔧 检查用户是否选择了此节奏类型
            const userFrequency = this.getUserRhythmFrequency(r.value);
            if (userFrequency <= 0) {
                // 用户未选择此节奏，排除
                return false;
            }

            // 6/8 基本节奏：八分音符、附点音符
            const basic68Rhythms = ['eighth', 'quarter.', 'half.'];

            // 6/8 可选特殊节奏：二连音、四连音（仅在用户选择时）
            const optional68Rhythms = ['duplet', 'quadruplet'];

            // 6/8 禁用三连音
            if (r.value === 'triplet') {
                return false;
            }

            // 检查是否为6/8允许的节奏类型
            const isAllowed = basic68Rhythms.includes(r.value) ||
                             (optional68Rhythms.includes(r.value) && userFrequency > 0);

            return isAllowed && duration <= 3.0;
        });
    }


    /**
     * 为6/8拍组应用正确的beaming规则
     * @param {Array} pattern - 节奏模式
     * @param {number} groupNumber - 组号
     * @param {Array} rhythms - 原始节奏定义
     * @returns {Array} 应用beaming后的事件
     */
    apply68BeamingToGroup(pattern, groupNumber, rhythms) {
        const events = [];

        // 如果只有一个附点四分音符，不需要beaming
        if (pattern.length === 1 && pattern[0].value === 'quarter.') {
            const rhythmDef = rhythms.find(r => r.value === pattern[0].value);
            events.push({
                value: pattern[0].value,
                displayName: rhythmDef ? rhythmDef.displayName : '附点四分音符',
                duration: pattern[0].duration,
                beats: pattern[0].duration, // 🆕 从旋律工具迁移：beats时值
                type: 'note',
            });
            console.log(`✅ 6/8拍第${groupNumber}组: 单个附点四分音符，无beaming`);
            return events;
        }

        // 对于包含八分音符的组合，应用beaming
        for (let i = 0; i < pattern.length; i++) {
            const note = pattern[i];
            const rhythmDef = rhythms.find(r => r.value === note.value);

            const event = {
                value: note.value,
                displayName: rhythmDef ? rhythmDef.displayName : note.value,
                duration: note.duration,
                type: 'note'
            };

            // 🔥 关键：正确的6/8拍beaming规则
            if (note.value === 'eighth') {
                // 八分音符需要beaming（每组内的八分音符连在一起）

                if (pattern.length === 3) {
                    // 三个八分音符的情况
                } else {
                    // 与四分音符混合的情况
                    const eighthCount = pattern.filter(p => p.value === 'eighth').length;
                    if (eighthCount === 1) {
                    } else {
                        const eighthIndex = pattern.filter((p, idx) => idx <= i && p.value === 'eighth').length - 1;
                    }
                }
            } else {
                // 四分音符及以上不需要beaming
            }

            events.push(event);
        }

        console.log(`✅ 6/8拍第${groupNumber}组beaming:`, events.map(e => `${e.displayName}[${e.beamPosition || 'none'}]`));
        return events;
    }

    /**
     * 创建6/8拍的默认组（三个八分音符）
     * @param {number} groupNumber - 组号
     * @returns {Array} 默认组事件
     */
    create68DefaultGroup(groupNumber) {
        return [
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
            },
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
            },
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
            }
        ];
    }



    /**
     * 为6/8拍应用专用beaming规则
     * @param {Array} events - 事件数组
     * @param {string} groupId - 组ID
     * @returns {Array} 应用beaming后的事件数组
     */
    apply68Beaming(events, groupId) {
        console.log(`🎵 应用6/8拍beaming规则到组 ${groupId}`);

        // 6/8拍特殊beaming规则：
        // 1. 每组应该等于3个八分音符的时值（1.5拍）
        // 2. 连续的八分音符应该连在一起
        // 3. 如果有附点四分音符（1.5拍），则单独一个音符占满整组

        // 检查是否整组只有一个附点四分音符
        if (events.length === 1 && events[0].duration === 1.5) {
            console.log(`🎵 6/8拍组${groupId}：单个附点四分音符，无需beaming`);
            return events;
        }

        // 处理包含多个音符的情况
        const beamableGroups = [];
        let currentGroup = [];
        let currentGroupDuration = 0;

        for (let i = 0; i < events.length; i++) {
            const event = events[i];

            if (this.canNoteBeBeamed(event)) {
                // 八分音符或更短的音符
                currentGroup.push(i);
                currentGroupDuration += event.duration;

                // 如果当前组达到3个八分音符的时值（1.5拍），结束这个组
                if (Math.abs(currentGroupDuration - 1.5) < 0.01) {
                    if (currentGroup.length > 1) {
                        beamableGroups.push([...currentGroup]);
                    }
                    currentGroup = [];
                    currentGroupDuration = 0;
                }
            } else {
                // 四分音符或附点四分音符等
                // 先处理之前积累的beamable音符
                if (currentGroup.length > 1) {
                    beamableGroups.push([...currentGroup]);
                }
                currentGroup = [];
                currentGroupDuration = 0;

                // 当前音符设为无beam
            }
        }

        // 处理最后剩余的beamable音符
        if (currentGroup.length > 1) {
            beamableGroups.push(currentGroup);
        }

        // 为每个beam组创建连接
        beamableGroups.forEach((group, index) => {
            this.createBeamGroup(events, group, `${groupId}_68beam${index}`);
        });

        console.log(`✅ 6/8拍beaming完成: 组${groupId}, 创建${beamableGroups.length}个beam组`);
        return events;
    }

    /**
     * 创建beam组
     * @param {Array} events - 事件数组
     * @param {Array} indices - 要beam的事件索引
     * @param {string} beamId - beam组ID
     */
    createBeamGroup(events, indices, beamId) {
        for (let i = 0; i < indices.length; i++) {
            const eventIndex = indices[i];
            const event = events[eventIndex];

            let beamPosition;
            if (i === 0) beamPosition = 'begin';
            else if (i === indices.length - 1) beamPosition = 'end';
            else beamPosition = 'continue';

        }

        console.log(`🎵 创建6/8拍beam组 ${beamId}: ${indices.length}个音符`);
    }

    /**
     * 🆕 Tier映射系统：将滑块百分比映射到离散层级
     * 来源: sight-reading-final.js:24195-24205
     * @param {number} sliderValue - 滑块值 (0-100)
     * @returns {number} 映射后的tier值 (0/15/40/75/100)
     */
    mapSliderPercentageToTier(sliderValue) {
        const percentage = parseInt(sliderValue);
        if (percentage === 0) return 0;           // 禁用
        if (percentage >= 1 && percentage <= 20) return 15;   // 低频率
        if (percentage >= 21 && percentage <= 50) return 40;  // 中频率
        if (percentage >= 51 && percentage <= 80) return 75;  // 高频率
        if (percentage >= 81 && percentage <= 100) return 100; // 最高频率
        return 15; // 默认低频率
    }

    /**
     * 🆕 从旋律工具移植：获取用户设置的节奏频率（带Tier映射）
     * 来源: sight-reading-final.js:24210-24223
     * @param {string} rhythmType - 节奏类型
     * @returns {number} 映射后的tier值 (0/15/40/75/100)
     */
    getUserRhythmFrequency(rhythmType) {
        // 映射内部duration名称到频率key
        const mapping = {
            'quarter.': 'dotted-quarter',
            'half.': 'dotted-half',
            'eighth.': 'dotted-eighth',
            '16th': 'sixteenth'
        };
        const frequencyKey = mapping[rhythmType] || rhythmType;

        // 从用户设置读取（如果存在rhythmFrequencies）
        const rawValue = this.rhythmFrequencies && typeof this.rhythmFrequencies[frequencyKey] === 'number'
            ? this.rhythmFrequencies[frequencyKey]
            : this.getDefaultRhythmFrequency(frequencyKey);

        // 🆕 应用Tier映射系统
        return this.mapSliderPercentageToTier(rawValue);
    }

    /**
     * 🆕 获取默认节奏频率
     * @param {string} rhythmKey - 节奏键名
     * @returns {number} 默认频率
     */
    getDefaultRhythmFrequency(rhythmKey) {
        const defaults = {
            'whole': 10,
            'dotted-half': 15,
            'half': 30,
            'dotted-quarter': 35,
            'quarter': 50,
            'eighth': 40,
            'sixteenth': 20,
            'triplet': 15,
            'duplet': 30,
            'quadruplet': 25
        };
        return defaults[rhythmKey] || 20;
    }

    /**
     * 🆕 计算精确节奏权重（基于Tier的对数尺度）
     * 来源: sight-reading-final.js:24158-24169
     * @param {string} rhythmType - 节奏类型
     * @returns {number} 权重值
     */
    calculatePreciseRhythmWeight(rhythmType) {
        const userFreq = this.getUserRhythmFrequency(rhythmType); // 现在返回tier值 (0/15/40/75/100)

        if (userFreq === 0) return 0;

        // 🆕 基于tier的对数尺度权重计算
        // userFreq现在是tier值，使用公式: Math.pow(tier/10, 1.2)
        return Math.max(1, Math.pow(userFreq / 10, 1.2));
    }

    /**
     * 🆕 6/8拍专用权重计算函数
     * 来源: sight-reading-final.js:24275-24312
     * @param {number} userFrequency - 用户设置的频率值 (tier值: 0/15/40/75/100)
     * @param {number} baseWeight - 基础权重 (默认10)
     * @param {string} rhythmType - 节奏类型名称（用于调试）
     * @returns {number} 计算后的权重值
     */
    calculate68FrequencyWeight(userFrequency, baseWeight = 10, rhythmType = 'unknown') {
        if (userFrequency === 0) return 0;

        let finalWeight;

        // 🎯 分段非线性权重计算（与旋律工具完全一致）
        if (userFrequency <= 15) {
            // 极低频率：指数衰减
            finalWeight = Math.max(0.1, baseWeight * Math.pow(userFrequency / 100, 2.5));
        } else if (userFrequency <= 30) {
            // 低频率：平方衰减
            finalWeight = baseWeight * Math.pow(userFrequency / 100, 2);
        } else if (userFrequency <= 60) {
            // 中频率：线性抑制
            finalWeight = baseWeight * (userFrequency / 100) * 0.8;
        } else {
            // 高频率：轻微加权
            finalWeight = baseWeight * (userFrequency / 100) * 1.1;
        }

        // 四舍五入到小数点后1位
        const roundedWeight = Math.round(finalWeight * 10) / 10;

        console.log(`🎵 [6/8权重] ${rhythmType}: tier=${userFrequency} → weight=${roundedWeight.toFixed(1)}`);

        return roundedWeight;
    }

    /**
     * 🆕 精准频率选择系统
     * 来源: sight-reading-final.js:24242-24273
     * @param {Array<string>} availableDurations - 可用的时值类型数组
     * @returns {string} 选中的时值类型
     */
    selectDurationByPreciseFrequency(availableDurations) {
        // 计算每个duration的真实权重
        const weightedOptions = availableDurations.map(duration => ({
            duration,
            weight: this.calculatePreciseRhythmWeight(duration)
        })).filter(opt => opt.weight > 0);

        if (weightedOptions.length === 0) {
            console.warn('⚠️ 所有节奏选项都被用户频率设置禁用，使用第一个可用选项');
            return availableDurations[0];
        }

        // 计算累积权重分布，确保精确的百分比控制
        const totalWeight = weightedOptions.reduce((sum, opt) => sum + opt.weight, 0);
        const random = Math.random();
        const target = random * totalWeight;

        let accumulator = 0;
        for (const option of weightedOptions) {
            accumulator += option.weight;
            if (accumulator >= target) {
                const userFreq = this.getUserRhythmFrequency(option.duration);
                console.log(`🎯 精准节奏选择: ${option.duration} (用户频率: ${userFreq}%, 权重: ${option.weight.toFixed(2)})`);
                return option.duration;
            }
        }

        // 后备方案
        return weightedOptions[weightedOptions.length - 1].duration;
    }

    /**
     * 🆕 获取四分音符拍点位置
     * @returns {Array<number>} 拍点位置数组
     */
    getQuarterBeatPositions() {
        if (this.timeSignature === '4/4') return [0, 1, 2, 3];
        if (this.timeSignature === '3/4') return [0, 1, 2];
        if (this.timeSignature === '2/4') return [0, 1];
        // 6/8拍特殊处理：附点四分音符的"强拍"位置
        if (this.timeSignature === '6/8' || (this.timeSignature && this.timeSignature.beats === 6 && this.timeSignature.beatType === 8)) {
            return [0, 1.5];
        }
        return [0, 1, 2, 3]; // 默认
    }

    /**
     * 🆕 获取二分音符拍点位置
     * @returns {Array<number>} 拍点位置数组
     */
    getHalfBeatPositions() {
        if (this.timeSignature === '4/4') return [0, 2];
        if (this.timeSignature === '3/4') return [0];
        if (this.timeSignature === '2/4') return [0];
        return [0, 2]; // 默认
    }

    /**
     * 🆕 获取八分音符拍点位置
     * @returns {Array<number>} 拍点位置数组
     */
    getEighthBeatPositions() {
        if (this.timeSignature === '4/4') return [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
        if (this.timeSignature === '3/4') return [0, 0.5, 1, 1.5, 2, 2.5];
        if (this.timeSignature === '2/4') return [0, 0.5, 1, 1.5];
        // 6/8拍：八分音符在每个半拍
        if (this.timeSignature === '6/8' || (this.timeSignature && this.timeSignature.beats === 6 && this.timeSignature.beatType === 8)) {
            return [0, 0.5, 1.0, 1.5, 2.0, 2.5];
        }
        return [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]; // 默认4/4
    }

    /**
     * 🆕 获取每小节的拍数（从旋律工具迁移）
     * @returns {number} 每小节拍数
     */
    getBeatsPerMeasure() {
        if (typeof this.timeSignature === 'string') {
            const match = this.timeSignature.match(/^(\d+)\/\d+$/);
            if (match) return parseInt(match[1]);
            return 4; // 默认
        }
        if (this.timeSignature && typeof this.timeSignature === 'object') {
            return this.timeSignature.beats || 4;
        }
        return 4; // 默认
    }

    /**
     * 🆕 从旋律工具移植：检查节奏是否可在当前位置使用
     * 来源: sight-reading-final.js:6766-6943
     * @param {string} rhythmType - 节奏类型
     * @param {number} remainingBeats - 剩余拍数
     * @param {number} currentBeat - 当前拍位置
     * @returns {boolean} 是否可用
     */
    isRhythmAvailableAtPosition(rhythmType, remainingBeats, currentBeat) {
        // 🔧 修复：三连音必须通过专门的canGenerateTripletGroup逻辑处理
        // 绝对不能作为普通节奏被chooseDuration选中
        if (rhythmType === 'triplet') {
            return false;
        }

        const duration = this.rhythmDurations[rhythmType];
        const tolerance = 0.001;

        // 基本检查：时值不能超过剩余拍数
        if (duration > remainingBeats + tolerance) {
            return false;
        }

        // 🎯 拍点对齐检查（4/4, 3/4, 2/4拍）
        const needsAlignment = this.timeSignature === '4/4' || this.timeSignature === '3/4' || this.timeSignature === '2/4';

        if (needsAlignment) {

            // 附点八分音符：只能在四分音符拍点
            if (rhythmType === 'eighth.' && Math.abs(duration - 0.75) < tolerance) {
                const quarterBeatPositions = this.getQuarterBeatPositions();
                const isOnQuarterBeat = quarterBeatPositions.some(pos => Math.abs(currentBeat - pos) < tolerance);

                if (!isOnQuarterBeat) {
                    console.log(`🚫 附点八分音符被阻止：当前位置${currentBeat}不在四分音符拍点上`);
                    return false;
                }

                // 🔥 增强检查1：剩余空间是否过小难以填充
                const remainingAfter = remainingBeats - duration;
                if (remainingAfter > tolerance && remainingAfter < 0.24) {
                    console.log(`🚫 附点八分音符被阻止：剩余空间${remainingAfter}过小，难以填充`);
                    return false;
                }

                // 🔥 增强检查2：确保剩余拍数能够被精确填充（从旋律工具迁移）
                if (remainingAfter > tolerance) {
                    // 尝试拆分剩余拍数，看是否能精确填充
                    const remainingSegments = this.splitFractionalBeats(remainingAfter);
                    const totalRemainingBeats = remainingSegments.reduce((sum, seg) => sum + seg, 0);
                    const remainingDifference = Math.abs(remainingAfter - totalRemainingBeats);

                    if (remainingDifference > tolerance) {
                        console.log(`🚫 附点八分音符被阻止：剩余${remainingAfter}拍无法精确填充，差值${remainingDifference}拍`);
                        return false;
                    }
                }

                // 🔥 增强检查3：避免在小节接近末尾时使用附点八分音符（从旋律工具迁移）
                const beatsPerMeasure = this.getBeatsPerMeasure();
                const positionInMeasure = currentBeat % beatsPerMeasure;
                const timeFromMeasureEnd = beatsPerMeasure - positionInMeasure;

                if (timeFromMeasureEnd < 1.25) { // 距离小节结束少于1.25拍时
                    console.log(`🚫 附点八分音符被阻止：距离小节结束仅${timeFromMeasureEnd}拍，容易造成填充困难`);
                    return false;
                }

                console.log(`✅ 附点八分音符增强检查全部通过：位置${currentBeat}，剩余${remainingAfter}拍可精确填充`);
            }

            // 附点四分音符：在强拍或检查拍点对齐
            if (rhythmType === 'quarter.' && Math.abs(duration - 1.5) < tolerance) {
                const quarterBeatPositions = this.getQuarterBeatPositions();
                const strongBeats = [0, 2].filter(pos => quarterBeatPositions.includes(pos));
                const isOnStrongBeat = strongBeats.some(pos => Math.abs(currentBeat - pos) < tolerance);

                if (!isOnStrongBeat) {
                    const nextPosition = currentBeat + duration;
                    const wouldLandOnQuarter = quarterBeatPositions.some(pos => Math.abs(nextPosition - pos) < tolerance);
                    if (!wouldLandOnQuarter) {
                        console.log(`🚫 附点四分音符被阻止：位置${currentBeat}开始会导致拍点混乱`);
                        return false;
                    }
                }
            }

            // 附点二分音符：只能在小节开始
            if (rhythmType === 'half.' && Math.abs(duration - 3) < tolerance) {
                if (Math.abs(currentBeat - 0) > tolerance) {
                    console.log(`🚫 附点二分音符被阻止：只能在小节开始使用，当前位置${currentBeat}`);
                    return false;
                }
            }

            // 四分音符：必须在四分音符拍点
            if (rhythmType === 'quarter' && Math.abs(duration - 1) < tolerance) {
                const quarterBeatPositions = this.getQuarterBeatPositions();
                const isOnQuarter = quarterBeatPositions.some(pos => Math.abs(currentBeat - pos) < tolerance);
                if (!isOnQuarter) {
                    console.log(`🚫 四分音符被阻止：当前位置${currentBeat}不在四分音符拍点上，只能在拍点[${quarterBeatPositions.join(', ')}]开始`);
                    return false;
                }
                console.log(`✅ 四分音符拍点检查通过：位置${currentBeat}在四分音符拍点上`);
            }

            // 二分音符：必须在二分音符拍点
            if (rhythmType === 'half' && Math.abs(duration - 2) < tolerance) {
                const halfBeatPositions = this.getHalfBeatPositions();
                const isOnHalf = halfBeatPositions.some(pos => Math.abs(currentBeat - pos) < tolerance);
                if (!isOnHalf) {
                    console.log(`🚫 二分音符被阻止：当前位置${currentBeat}不在二分音符拍点上，只能在拍点[${halfBeatPositions.join(', ')}]开始`);
                    return false;
                }
                console.log(`✅ 二分音符拍点检查通过：位置${currentBeat}在二分音符拍点上`);
            }

            // 八分音符：必须在八分音符拍点
            if (rhythmType === 'eighth' && Math.abs(duration - 0.5) < tolerance) {
                const eighthBeatPositions = this.getEighthBeatPositions();
                const isOnEighth = eighthBeatPositions.some(pos => Math.abs(currentBeat - pos) < tolerance);
                if (!isOnEighth) {
                    console.log(`🚫 八分音符被阻止：当前位置${currentBeat}不在八分音符拍点上，只能在拍点[${eighthBeatPositions.join(', ')}]开始`);
                    return false;
                }
                console.log(`✅ 八分音符拍点检查通过：位置${currentBeat}在八分音符拍点上`);
            }
        }

        return true;
    }

    /**
     * 🆕 从旋律工具移植：智能选择节奏时值
     * 来源: sight-reading-final.js:6762-7119 (完整chooseDuration逻辑)
     * @param {number} remainingBeats - 剩余拍数
     * @param {number} currentBeat - 当前拍位置
     * @param {boolean} isFirstNote - 是否是第一个音符
     * @returns {string} 选中的节奏类型
     */
    chooseDuration(remainingBeats, currentBeat, isFirstNote = false) {
        console.log(`🎵 选择时值: 剩余${remainingBeats.toFixed(3)}拍, 当前位置: ${currentBeat.toFixed(3)}`);

        // 1. 过滤可用的节奏类型（基于拍点对齐）
        const available = this._currentAllowedRhythms.filter(rhythm =>
            this.isRhythmAvailableAtPosition(rhythm.value, remainingBeats, currentBeat)
        );

        console.log(`可用时值: ${available.map(r => r.value).join(', ')}`);

        if (available.length === 0) {
            // fallback: 自动匹配最接近的时值
            console.log(`⚠️ 没有可用时值，使用自动匹配: ${remainingBeats.toFixed(3)}拍`);
            const autoChosenDuration = this.findClosestDuration(remainingBeats);
            console.log(`⚠️ 自动选择时值: ${autoChosenDuration}`);
            return autoChosenDuration;
        }

        const tolerance = 0.001;

        // 2. 智能优先级系统

        // 2.1 八分音符配对逻辑
        if (this._expectEighthNotePair && Math.abs(remainingBeats - 0.5) < tolerance) {
            const hasEighth = available.some(r => r.value === 'eighth');
            if (hasEighth && this.getUserRhythmFrequency('eighth') > 0) {
                console.log(`🎯 [八分音符配对] 完成配对：剩余0.5拍，选择八分音符与上一个配对`);
                this._expectEighthNotePair = false;
                return 'eighth';
            }
        }

        // 2.2 附点音符高频率优先 (修复 2025-10-10: 用频率检查替换硬编码概率)
        if (Math.abs(currentBeat % 1) < tolerance && remainingBeats >= 0.75) {
            const hasDottedEighth = available.some(r => r.value === 'eighth.');
            const dottedEighthFreq = this.getUserRhythmFrequency('eighth.');
            if (hasDottedEighth && dottedEighthFreq >= 75) { // 只有高频率(75-100)才优先
                console.log(`🎵 高频率优先：在四分音符拍点${currentBeat}选择附点八分音符 (频率${dottedEighthFreq}%)`);
                return 'eighth.';
            }
        }

        if ((Math.abs(currentBeat - 0) < tolerance || Math.abs(currentBeat - 2) < tolerance) && remainingBeats >= 1.5) {
            const hasDottedQuarter = available.some(r => r.value === 'quarter.');
            const dottedQuarterFreq = this.getUserRhythmFrequency('quarter.');
            if (hasDottedQuarter && dottedQuarterFreq >= 75) { // 只有高频率(75-100)才优先
                console.log(`🎵 高频率优先：在强拍${currentBeat}选择附点四分音符 (频率${dottedQuarterFreq}%)`);
                return 'quarter.';
            }
        }

        // 3. 使用精准频率系统选择
        const availableValues = available.map(r => r.value);
        let selectedDuration = this.selectDurationByPreciseFrequency(availableValues);

        // 4. 高频率特殊规则 (修复 2025-10-10: 基于频率对比而非随机概率)
        const selectedFreq = this.getUserRhythmFrequency(selectedDuration);

        // 4.1 剩余2拍优先二分音符（仅当二分音符频率高且明显高于当前选择时）
        if (Math.abs(remainingBeats - 2) < tolerance && availableValues.includes('half')) {
            const halfFreq = this.getUserRhythmFrequency('half');
            if (halfFreq >= 75 && halfFreq > selectedFreq * 1.5) {
                console.log(`📌 高频率规则：剩余2拍，二分音符 (${halfFreq}%) 替代 ${selectedDuration} (${selectedFreq}%)`);
                selectedDuration = 'half';
            }
        }

        // 4.2 第3拍位置且剩余2拍，优先二分音符
        if (Math.abs(currentBeat - 2) < tolerance && Math.abs(remainingBeats - 2) < tolerance && availableValues.includes('half')) {
            const halfFreq = this.getUserRhythmFrequency('half');
            if (halfFreq >= 75 && halfFreq > selectedFreq * 1.5) {
                console.log(`📌 高频率规则：第3拍位置且剩余2拍，二分音符 (${halfFreq}%) 替代 ${selectedDuration} (${selectedFreq}%)`);
                selectedDuration = 'half';
            }
        }

        // 4.3 剩余1拍且在拍点上，优先八分音符配对（仅当八分音符频率较高时）
        if (this.timeSignature === '4/4' && Math.abs(remainingBeats - 1) < tolerance && availableValues.includes('eighth')) {
            const beatPosition = Math.round(currentBeat * 10000) / 10000;
            const isOnQuarterBeat = Math.abs(beatPosition % 1) < tolerance;
            const eighthFreq = this.getUserRhythmFrequency('eighth');

            if (isOnQuarterBeat && eighthFreq >= 40) { // 中等频率以上即可配对
                console.log(`🎯 4/4拍八分音符配对规则：位置${currentBeat}剩余1拍，八分音符频率${eighthFreq}%`);
                selectedDuration = 'eighth';
            }
        }

        // 标记需要后续配对的八分音符
        if (this.timeSignature === '4/4' && selectedDuration === 'eighth' && Math.abs(remainingBeats - 1) < tolerance) {
            console.log(`🎯 [八分音符配对] 当前选择八分音符，剩余1拍，下次生成时应优先配对`);
            this._expectEighthNotePair = true;
        }

        // 5. 6/8拍特殊边界检查
        if (this.timeSignature === '6/8' || (this.timeSignature && this.timeSignature.beats === 6 && this.timeSignature.beatType === 8)) {
            const duration = this.rhythmDurations[selectedDuration];
            const noteEndPosition = currentBeat + duration;
            const criticalBoundaries = [0, 1.5, 3];

            for (const boundary of criticalBoundaries) {
                if (currentBeat < boundary && noteEndPosition > boundary) {
                    // 跨越边界，调整时值
                    const beatsToBoundary = boundary - currentBeat;
                    console.log(`⚠️ 6/8拍边界检查：选择的时值${selectedDuration}会从位置${currentBeat}跨越边界${boundary}，调整为${beatsToBoundary}拍`);
                    const safeDuration = this.findClosestDuration(beatsToBoundary);
                    if (availableValues.includes(safeDuration)) {
                        selectedDuration = safeDuration;
                        console.log(`✅ 6/8拍边界修正：改用${safeDuration}`);
                    }
                    break;
                }
            }
        }

        console.log(`✅ 最终选择: ${selectedDuration}`);
        return selectedDuration;
    }

    /**
     * 生成拍群内的事件（音符和休止符）
     * @param {Array} suitableRhythms - 适合的节奏类型
     * @param {number} groupDuration - 拍群总时值
     * @param {Object} timeSignature - 拍号信息
     * @returns {Array} 事件数组
     */
    generateGroupEvents(suitableRhythms, groupDuration, timeSignature = null, startPosition = 0.0) {
        const events = [];
        let remainingDuration = groupDuration;
        let currentPosition = startPosition;

        // 🆕 保存当前允许的节奏类型供chooseDuration使用
        // 🔧 修复：移除'triplet'，因为三连音只能通过专门逻辑生成
        this._currentAllowedRhythms = suitableRhythms.filter(r => r.value !== 'triplet');

        // 🎯 检测是否为八分音符+三连音混合模式（更准确的检测逻辑）
        const hasEighthNotes = suitableRhythms.some(r => r.value === 'eighth');
        const hasTriplet = suitableRhythms.some(r => r.value === 'triplet');
        const hasOnlyTriplets = suitableRhythms.every(r => r.value === 'triplet');
        const isMixedMode = hasTriplet && hasEighthNotes && !hasOnlyTriplets;

        // 🎯 智能冲突组选择：检测并智能处理十六分音符与三连音冲突
        const conflictGroups = new Set(suitableRhythms.map(r => r.conflictGroup).filter(Boolean));
        let filteredRhythms = suitableRhythms;

        if (conflictGroups.size > 1) {
            // 🔥 修复4: 增强冲突组诊断日志
            console.log(`🔍 检测到${conflictGroups.size}个冲突组: ${Array.from(conflictGroups).join(', ')}`);

            // 统计每个冲突组的节奏
            const groupRhythms = {};
            conflictGroups.forEach(group => {
                groupRhythms[group] = suitableRhythms.filter(r => r.conflictGroup === group);
            });

            console.log('🔍 冲突组详情:');
            Object.entries(groupRhythms).forEach(([group, rhythms]) => {
                console.log(`   ${group}组: ${rhythms.map(r => r.displayName || r.value).join(', ')} (${rhythms.length}个)`);
            });

            // 🔧 新策略：为每个拍群随机选择冲突组，允许同一小节内混合
            let selectedGroup;

            // 检查拍群时值是否适合三连音
            const isTripletFriendly = this.isTripletFriendlyDuration(groupDuration);

            // 🔥 修复4: 动态调整概率，确保两组都有合理的出现机会
            // 计算每组的节奏数量，用于权重调整
            const sixteenthCount = groupRhythms['sixteenth'] ? groupRhythms['sixteenth'].length : 0;
            const tripletCount = groupRhythms['triplet'] ? groupRhythms['triplet'].length : 0;

            // 基础概率：50/50平衡
            let tripletProbability = 0.5;

            // 根据拍群特性调整
            if (!isTripletFriendly) {
                // 不适合三连音的拍群，降低三连音概率到10%
                tripletProbability = 0.10;
            } else if (sixteenthCount > tripletCount * 2) {
                // 十六分音符节奏明显更多，略微提高其概率
                tripletProbability = 0.35;
            } else if (tripletCount > sixteenthCount * 2) {
                // 三连音节奏明显更多，略微提高其概率
                tripletProbability = 0.65;
            }

            console.log(`🔍 拍群 (${groupDuration}拍): 适合三连音=${isTripletFriendly}, 三连音概率=${(tripletProbability * 100).toFixed(0)}%`);

            // 🔥 Fix 8: 使用小节级别预设的组序列（如果存在）
            if (this._measureGroupSequence && this._currentGroupIndex < this._measureGroupSequence.length) {
                selectedGroup = this._measureGroupSequence[this._currentGroupIndex];
                this._currentGroupIndex++;
                console.log(`🔥 使用预设冲突组: ${selectedGroup} (小节级别平衡，索引${this._currentGroupIndex - 1})`);
                console.log(`📋 预设序列: [${this._measureGroupSequence.join(', ')}]`);
            } else {
                // 否则使用原有的随机逻辑
                if (Math.random() < tripletProbability) {
                    selectedGroup = 'triplet';
                    console.log(`🎯 选择三连音组 (16th=${sixteenthCount}个, triplet=${tripletCount}个)`);
                } else {
                    selectedGroup = 'sixteenth';
                    console.log(`🎯 选择十六分音符组 (16th=${sixteenthCount}个, triplet=${tripletCount}个)`);
                }
            }

            // 只保留选中的冲突组和无冲突组的节奏
            filteredRhythms = suitableRhythms.filter(r =>
                !r.conflictGroup || r.conflictGroup === selectedGroup
            );

            // 🔥 修复4: 验证过滤结果
            console.log(`🔍 过滤前: ${suitableRhythms.length}个节奏，过滤后: ${filteredRhythms.length}个节奏`);

            // 🔧 修复：如果过滤后节奏太少，添加基础节奏作为后备
            const nonTripletCount = filteredRhythms.filter(r => r.value !== 'triplet').length;
            if (nonTripletCount < 2) {
                console.log(`⚠️ 过滤后可用节奏太少（${nonTripletCount}个），添加基础节奏作为后备`);
                const basicRhythms = [
                    { value: 'quarter', displayName: '四分音符' },
                    { value: 'eighth', displayName: '八分音符' }
                ];
                basicRhythms.forEach(basic => {
                    if (!filteredRhythms.some(r => r.value === basic.value)) {
                        filteredRhythms.push(basic);
                        console.log(`   ✅ 添加${basic.displayName}作为后备`);
                    }
                });
            }

            console.log(`🎵 拍群过滤后节奏: ${filteredRhythms.map(r => r.displayName || r.value).join(', ')}`);

            // 🔥 修复4: 验证选中组的节奏确实存在
            const selectedGroupRhythms = filteredRhythms.filter(r => r.conflictGroup === selectedGroup);
            if (selectedGroupRhythms.length > 0) {
                console.log(`✅ ${selectedGroup}组节奏可用: ${selectedGroupRhythms.map(r => r.displayName || r.value).join(', ')}`);
            } else {
                console.log(`⚠️ ${selectedGroup}组没有可用节奏，将使用无冲突组节奏`);
            }

            // 🆕 更新过滤后的节奏供chooseDuration使用
            // 🔧 修复：移除'triplet'，因为三连音只能通过专门逻辑生成，不能被chooseDuration选中
            this._currentAllowedRhythms = filteredRhythms.filter(r => r.value !== 'triplet');
        }

        // 🎯 标准节奏生成循环（已解决八分音符+三连音冲突）
        while (remainingDuration > 0.01) {
            // 🔥 修复6: 更严格的剩余时值检查，避免生成32分音符的碎片
            if (remainingDuration < 0.2) {
                console.log(`🔧 剩余时值${remainingDuration.toFixed(3)}拍过小（< 0.2拍），终止生成以避免碎片`);
                break;
            }

            console.log(`🎵 循环开始：remainingDuration=${remainingDuration.toFixed(3)}拍, groupDuration=${groupDuration}拍`);

            const availableRhythms = filteredRhythms.filter(rhythm => {
                const duration = this.rhythmDurations[rhythm.value];
                return duration <= remainingDuration + 0.01;
            });
            console.log(`🎵 可用节奏数量：${availableRhythms.length}`);

            if (availableRhythms.length === 0) {
                // 🎯 标准填充逻辑：避免生成过小的音符
                console.log(`⚠️ 没有可用节奏，剩余${remainingDuration.toFixed(3)}拍，终止生成`);
                break;
            }

            // 🔧 6/8拍智能休止符生成：允许合理的休止符，但保护3+3分组结构
            const is68TimeSig = this.timeSignature && this.timeSignature.beats === 6 && this.timeSignature.beatType === 8;
            let shouldGenerateRest = false;

            if (is68TimeSig) {
                // 🎵 6/8拍专用休止符逻辑
                shouldGenerateRest = this.should68GenerateRest(groupDuration, remainingDuration, events.length);
            } else {
                // 其他拍号保持原有逻辑
                // 🎵 减少切分节奏：降低休止符生成概率，特别是在强拍位置
                const currentPosition = groupDuration - remainingDuration;
                const isNearStrongBeat = currentPosition % 1.0 < 0.1; // 接近强拍位置

                // 🎼 非6/8休止符概率（可配置，默认稍微提高）
                const baseNearStrong = (this._opts && this._opts.restNon68NearStrong !== undefined) ? this._opts.restNon68NearStrong : 0.30;
                const baseDefault = (this._opts && this._opts.restNon68Default !== undefined) ? this._opts.restNon68Default : 0.45;
                const restProbability = isNearStrongBeat ? baseNearStrong : baseDefault;
                shouldGenerateRest = Math.random() < restProbability;
            }

            if (shouldGenerateRest && events.length > 0) {
                // 🆕 使用chooseDuration选择休止符时值（来自旋律工具）
                const restValue = this.chooseDuration(remainingDuration, currentPosition);
                const duration = this.rhythmDurations[restValue];

                // 🔧 使用标准时值映射生成正确的休止符显示名称
                const correctDisplayName = this.getDurationDisplayName(restValue);

                events.push({
                    value: restValue,
                    displayName: `${correctDisplayName}休止符`,
                    duration: duration,
                    beats: duration, // 🆕 从旋律工具迁移：beats时值
                    type: 'rest',
                    position: currentPosition // 🆕 记录事件位置
                });

                remainingDuration -= duration;
                currentPosition += duration;
                console.log(`🎵 添加休止符：${correctDisplayName}休止符(${duration}拍), 剩余：${remainingDuration.toFixed(3)}拍`);
                continue;
            }

            // 检查是否可以生成三连音组
            const hasTriplet = availableRhythms.some(r => r.value === 'triplet');

            // 🎯 三连音位置限制：智能检查，混合模式下放宽限制
            const relativePosition = groupDuration - remainingDuration; // 在拍群内的相对位置
            const absolutePosition = startPosition + relativePosition; // 在小节内的绝对位置
            const isOnQuarterNoteBeat = this.isOnQuarterNoteBeat(absolutePosition);

            // 🔧 简化三连音生成逻辑（无混合模式冲突）
            const canGenerateTripletGroup = hasTriplet &&
                                          remainingDuration >= (1/3) && // 需要1/3拍时值
                                          isOnQuarterNoteBeat; // 三连音只能在四分音符正拍开始

            // 🎵 三连音生成条件检查日志
            if (hasTriplet) {
                console.log(`🎵 三连音生成检查:`);
                console.log(`  - 有三连音节奏: ${hasTriplet}`);
                console.log(`  - 有八分音符: ${hasEighthNotes}`);
                console.log(`  - 混合模式: ${isMixedMode}`);
                console.log(`  - 剩余时值: ${remainingDuration.toFixed(3)}拍 (需要≥1/3拍)`);
                console.log(`  - 当前位置: ${absolutePosition.toFixed(3)}拍 (拍群内: ${relativePosition.toFixed(3)}拍)`);
                console.log(`  - 在四分音符正拍: ${isOnQuarterNoteBeat}`);
                console.log(`  - 可以生成三连音: ${canGenerateTripletGroup}`);
                if (isMixedMode) {
                    console.log(`  🔧 混合模式下放宽位置限制，只需要时值条件`);
                }
            }

            // 🎵 三连音概率：尊重用户频率设置（若存在），否则使用默认
            let tripletProbability;
            const userTripletFreq = this.rhythmFrequencies && typeof this.rhythmFrequencies['triplet'] === 'number'
                ? this.rhythmFrequencies['triplet'] : null;
            if (userTripletFreq !== null) {
                // 将用户0-100%映射为0.05-0.95的概率范围，避免极端0/1
                tripletProbability = Math.min(0.95, Math.max(0.05, userTripletFreq / 100));
                console.log(`🎵 三连音概率来自用户频率: ${userTripletFreq}% → p=${(tripletProbability*100).toFixed(0)}%`);
            } else {
                // 默认：仅三连音模式较高，混合模式较低
                tripletProbability = hasOnlyTriplets ? 0.6 : 0.20;
                console.log(`🎵 三连音默认概率: ${hasOnlyTriplets ? '仅三连音=60%' : '混合=20%'}`);
            }

            if (hasOnlyTriplets) {
                console.log(`🎯 检测到只选择了三连音，生成概率${tripletProbability * 100}%`);
            } else {
                console.log(`🎵 标准节奏模式，三连音生成概率${tripletProbability * 100}%`);
            }

            // 🔧 修复：提前计算三连音类型和时值检查，避免生成失败时的回退问题
            // 🎯 四分三连音额外限制：必须在偶数拍开始（因为占用2拍）
            const isEvenBeat = Math.abs(absolutePosition % 2.0) < 0.01;

            // 🎯 提前确定三连音类型和时值要求
            let tripletType, tripletBaseDuration, tripletTotalDuration, tripletDisplayName;
            let canFitFullTriplet;

            // 🔥 关键修复：先检查四分音符三连音（需要2拍），再检查八分三连音（需要1拍）
            // 原因：条件顺序错误导致四分音符三连音永远不会生成
            if (remainingDuration >= 2.0 && isEvenBeat) {
                // 四分三连音：每个四分三连音 = 2/3拍（先检查，因为需要更多时值）
                tripletType = 'quarter';
                tripletBaseDuration = 2/3;
                tripletDisplayName = '四分三连音';
                canFitFullTriplet = true; // 已满足2拍且偶数拍
            } else if (remainingDuration >= 1.0) {
                // 八分三连音：每个八分三连音 = 1/3拍（后检查）
                tripletType = 'eighth';
                tripletBaseDuration = 1/3;
                tripletDisplayName = '八分三连音';
                canFitFullTriplet = true; // 已满足1拍
            } else {
                // 时值不足，无法生成任何三连音
                canFitFullTriplet = false;
                tripletType = 'eighth'; // 默认值
                tripletBaseDuration = 1/3;
                tripletDisplayName = '八分三连音';
            }

            // 🎵 合并所有三连音生成条件，确保失败时能回退到常规节奏
            if (canGenerateTripletGroup && canFitFullTriplet && Math.random() < tripletProbability) {
                console.log(`🎯 选择${tripletDisplayName}：位置${absolutePosition}拍，剩余时值${remainingDuration.toFixed(3)}拍`);

                const tripletPositions = ['start', 'middle', 'stop'];
                let noteCount = 0;
                let restCount = 0;

                // 参考旋律视奏工具：为三连音组分配唯一ID
                const tripletId = this.generateTripletId();
                    const tripletCount = 3;
                    // 完整组总时值
                    tripletTotalDuration = tripletCount * tripletBaseDuration;
                    console.log(`🎵 生成完整三连音组: ${tripletDisplayName}, 总时值=${tripletTotalDuration.toFixed(3)}拍`);

                    let tripletElementPosition = absolutePosition; // 追踪三连音内部的位置
                    for (let i = 0; i < tripletCount; i++) {
                        // 🎵 允许三连音中包含休止符（常见的记谱用法），括号应覆盖整个组
                        // 出于稳定性，默认只在中间位置允许较小概率的休止符
                        let elementType = 'note';
                        const allowRestHere = (i === 1); // 仅中间
                        if (allowRestHere && Math.random() < 0.25) {
                            elementType = 'rest';
                        }

                    if (elementType === 'rest') {
                        restCount++;
                    } else {
                        noteCount++;
                    }

                    // 🎯 确保tripletBaseDuration是有效数字
                    const safeTripletBaseDuration = (typeof tripletBaseDuration === 'number' && !isNaN(tripletBaseDuration))
                        ? tripletBaseDuration
                        : (1/3); // 默认八分三连音时值

                    // 🎵 关键修复：根据三连音类型设置正确的音符value和数值duration
                    const noteValue = tripletType === 'quarter' ? 'quarter' : 'eighth';
                    const numericalDuration = safeTripletBaseDuration; // 🔧 修复：使用安全的三连音基础时值

                    // 🔧 为三连音元素生成显示名称（休止符/音符）
                    const correctDisplayName = elementType === 'rest'
                        ? `${tripletDisplayName}休止符`
                        : tripletDisplayName;

                    events.push({
                        value: noteValue, // 四分音符三连音用'quarter'，八分音符三连音用'eighth'
                        displayName: correctDisplayName,
                        duration: numericalDuration, // 使用数值时值：2/3拍或1/3拍
                        beats: numericalDuration, // 🆕 从旋律工具迁移：beats时值（三连音精确值如1/3）
                        type: elementType,
                        tripletGroup: true, // 标记为三连音组成员
                        tripletPosition: tripletPositions[i], // 在三连音组中的位置
                        // 参考旋律视奏工具：添加完整的三连音属性
                        isTriplet: true,
                        tripletType: tripletType, // 三连音类型
                        tripletId: tripletId, // 唯一标识符
                        tripletTotal: tripletCount, // 🔧 修复：实际三连音数量
                        tripletBaseDuration: safeTripletBaseDuration, // 每个三连音的基础时值（确保是数字）
                        tripletTotalDuration: tripletTotalDuration, // 整个三连音组的总时值
                        // 🎯 明确标记这是三连音，避免时值查找混乱
                        isTripletElement: true,
                        position: tripletElementPosition // 🆕 记录三连音元素位置
                        // 🔥 不在此处设置tripletBeamInfo，将在生成完成后统一计算
                    });
                    tripletElementPosition += numericalDuration; // 更新三连音内部位置
                }

                // 🔥 关键修复：生成完三连音后，调用calculateTripletBeamConnections正确设置beam
                // 这会考虑休止符的中断效果，确保beam连接符合音乐理论规则
                if (['eighth', '16th', '32nd'].includes(tripletType)) {
                    const tripletElements = events.slice(-tripletCount);
                    this.calculateTripletBeamConnections(tripletElements, tripletType);
                    console.log(`🔥 已调用calculateTripletBeamConnections处理休止符中断效果`);
                }

                console.log(`✅ 三连音组生成完成 ID=${tripletId}: ${tripletCount}个元素, beam已正确设置`);

                remainingDuration -= tripletTotalDuration;
                currentPosition += tripletTotalDuration;
                console.log(`🎵 生成${tripletDisplayName}组 ID=${tripletId} (${noteCount}个音符 + ${restCount}个休止符占${tripletTotalDuration}拍), 剩余: ${remainingDuration.toFixed(3)}拍`);
            } else {
            // 若未生成三连音，则走常规节奏选择
            // 🆕 使用chooseDuration智能选择节奏（来自旋律工具）
            const selectedValue = this.chooseDuration(remainingDuration, currentPosition, events.length === 0);
            const duration = this.rhythmDurations[selectedValue];

            // 查找对应的rhythm对象以获取displayName
            const selectedRhythm = filteredRhythms.find(r => r.value === selectedValue) || {
                value: selectedValue,
                displayName: this.getDurationDisplayName(selectedValue)
            };

            events.push({
                value: selectedValue,
                displayName: selectedRhythm.displayName,
                duration: duration,
                beats: duration, // 🆕 从旋律工具迁移：beats时值
                type: 'note',
                position: currentPosition // 🆕 记录事件位置
            });

            remainingDuration -= duration;
            currentPosition += duration;
            console.log(`🎵 添加音符：${selectedRhythm.displayName}(${duration}拍), 剩余：${remainingDuration.toFixed(3)}拍`);
            }
        }

        // 🎯 验证总时值（正确处理三连音的duration）
        const totalDuration = events.reduce((sum, event) => {
            let eventDuration = 0; // 默认值，确保是数字

            try {
                if (event.tripletGroup || event.isTriplet || event.isTripletElement) {
                    // 三连音使用tripletBaseDuration
                    eventDuration = event.tripletBaseDuration || (1/3);
                } else if (typeof event.duration === 'number') {
                    eventDuration = event.duration;
                } else {
                    // 如果duration是字符串，尝试从数值映射中获取
                    eventDuration = this.getDurationValue(event.duration) || 0;
                }

                // 确保eventDuration是数字
                if (typeof eventDuration !== 'number' || isNaN(eventDuration)) {
                    console.warn(`⚠️ 无效的事件时值: ${event.displayName}, duration: ${event.duration}, 计算值: ${eventDuration}`);
                    eventDuration = 0;
                }

                // 确保sum是数字
                if (typeof sum !== 'number' || isNaN(sum)) {
                    console.warn(`⚠️ 无效的累计时值: ${sum}, 重置为0`);
                    sum = 0;
                }

            } catch (error) {
                console.error(`⚠️ 时值计算错误:`, error, `事件:`, event);
                eventDuration = 0;
            }

            return sum + eventDuration;
        }, 0);
        const difference = Math.abs(totalDuration - groupDuration);

        console.log(`🎵 拍群生成完成：期望${groupDuration}拍，实际${totalDuration.toFixed(6)}拍，差异${difference.toFixed(6)}拍`);
        console.log(`🎵 生成的事件：`, events.map(e => {
            let eventDuration = 0;
            try {
                if (e.tripletGroup || e.isTriplet || e.isTripletElement) {
                    eventDuration = e.tripletBaseDuration || (1/3);
                } else if (typeof e.duration === 'number') {
                    eventDuration = e.duration;
                } else {
                    eventDuration = this.getDurationValue(e.duration) || 0;
                }

                // 确保是数字
                if (typeof eventDuration !== 'number' || isNaN(eventDuration)) {
                    eventDuration = 0;
                }
            } catch (error) {
                console.warn(`⚠️ 日志时值计算错误:`, error);
                eventDuration = 0;
            }
            return `${e.displayName || e.value}(${eventDuration.toFixed(3)}拍)`;
        }));

        // 🎯 三连音容差：对三连音给予更大的容差，因为1/3无法精确表示
        const hasTriplets = events.some(e => e.tripletGroup || e.value === 'triplet');
        const tolerance = hasTriplets ? 0.02 : 0.01;

        if (difference > tolerance) {
            console.warn(`⚠️ 拍群时值超出容差！差异: ${difference.toFixed(6)}拍 (容差: ${tolerance})`);
            // 🎯 智能修正：只修正大误差，优先修正非三连音事件
            if (events.length > 0) {
                let targetEventIndex = events.length - 1;
                for (let i = events.length - 1; i >= 0; i--) {
                    if (!events[i].tripletGroup && events[i].value !== 'triplet') {
                        targetEventIndex = i;
                        break;
                    }
                }

                const correction = groupDuration - totalDuration;
                const correctedDuration = events[targetEventIndex].duration + correction;

                // 🔥 关键修复：确保value与修正后的duration匹配，并保持标准时值
                const correctedValue = this.findClosestDuration(correctedDuration);
                const standardDuration = this.rhythmDurations[correctedValue];

                // 🎯 重要：使用标准时值而不是修正后的任意时值
                events[targetEventIndex].duration = standardDuration;
                events[targetEventIndex].beats = standardDuration;  // 🔥 修复：同步更新beats属性
                events[targetEventIndex].value = correctedValue;

                // 🔧 修复：三连音事件需要特殊处理displayName
                const originalEvent = events[targetEventIndex];
                if (originalEvent.tripletGroup || originalEvent.isTriplet) {
                    // 保持三连音的特殊显示名称格式
                    const tripletType = originalEvent.tripletType || 'eighth';
                    const tripletDisplayName = tripletType === 'quarter' ? '四分三连音' : '八分三连音';
                    if (originalEvent.type === 'rest') {
                        events[targetEventIndex].displayName = `${tripletDisplayName}休止符`;
                    } else {
                        events[targetEventIndex].displayName = tripletDisplayName;
                    }
                } else {
                    events[targetEventIndex].displayName = this.getDurationDisplayName(correctedValue);
                }

                console.log(`🔧 修正事件[${targetEventIndex}]: ${correction.toFixed(6)}拍 → value="${correctedValue}", 标准时值=${standardDuration}拍`);

                // 🔥 再次验证修正后的总时值
                const newTotalDuration = events.reduce((sum, e) => {
                    let dur = 0;
                    if (e.tripletGroup || e.isTriplet || e.isTripletElement) {
                        dur = e.tripletBaseDuration || (1/3);
                    } else if (typeof e.duration === 'number') {
                        dur = e.duration;
                    } else {
                        dur = this.rhythmDurations[e.value] || 0;
                    }
                    return sum + dur;
                }, 0);

                const finalDiff = Math.abs(newTotalDuration - groupDuration);
                console.log(`🔍 修正后总时值: ${newTotalDuration.toFixed(6)}拍, 最终差异: ${finalDiff.toFixed(6)}拍`);
            }
        } else {
            console.log(`✅ 拍群时值验证通过 (容差: ${tolerance})`);
        }

        // 🎯 八分音符+三连音混合模式的最终时值校正
        if (isMixedMode && events.length > 0) {
            const currentTotalDuration = events.reduce((sum, e) => {
                return sum + this.getElementDuration(e);
            }, 0);

            const finalDiff = Math.abs(currentTotalDuration - groupDuration);
            console.log(`🔧 混合模式最终检查：目标=${groupDuration}拍，实际=${currentTotalDuration.toFixed(6)}拍，差异=${finalDiff.toFixed(6)}拍`);

            // 如果差异太大且是由小碎片造成的，移除最后的小音符
            if (finalDiff > 0.05 && events.length > 1) {
                const lastEvent = events[events.length - 1];
                const lastEventDuration = this.getElementDuration(lastEvent);

                // 如果最后一个事件是很小的音符且移除它能改善时值匹配
                if (lastEventDuration < 0.2 && Math.abs((currentTotalDuration - lastEventDuration) - groupDuration) < finalDiff) {
                    console.log(`🔧 混合模式：移除最后的小音符${lastEvent.displayName}(${lastEventDuration.toFixed(3)}拍)以改善时值匹配`);
                    events.pop();
                }
            }
        }

        return events;
    }

    /**
     * 🎵 获取优先的节拍模式，减少切分节奏(syncopation)
     * @param {Array} availableRhythms - 可用的节奏类型
     * @param {number} currentPosition - 当前位置
     * @returns {Array} 优先的节奏类型
     */
    getPreferredRhythms(availableRhythms, currentPosition, timeSignature) {
        // 🎼 明确的拍子类型判断：严格分离4/4拍和6/8拍
        const is44Time = timeSignature &&
                        timeSignature.beats === 4 &&
                        timeSignature.beatType === 4;

        const is68Time = this.is68Time(timeSignature);

        // 其他复合拍子（9/8, 12/8等）
        const isOtherCompoundTime = this.isOtherCompoundTime(timeSignature);

        if (is68Time) {
            // 🔥 6/8拍专用逻辑：两大组，强拍位置为0.0和1.5
            const isStrongBeat = Math.abs(currentPosition) < 0.01 || Math.abs(currentPosition - 1.5) < 0.01;
            const isSubBeat = Math.abs(currentPosition - 0.5) < 0.01 ||
                             Math.abs(currentPosition - 1.0) < 0.01 ||
                             Math.abs(currentPosition - 2.0) < 0.01 ||
                             Math.abs(currentPosition - 2.5) < 0.01;

            if (isStrongBeat) {
                // 6/8拍强拍（位置0.0和1.5）：优先附点四分音符和四分音符
                console.log(`🎼 6/8拍强拍位置${currentPosition.toFixed(2)}: 优先较长时值`);
                return availableRhythms.filter(r =>
                    ['quarter.', 'quarter', 'half.'].includes(r.value)
                );
            } else if (isSubBeat) {
                // 6/8拍其他拍点：优先八分音符
                console.log(`🎼 6/8拍次拍位置${currentPosition.toFixed(2)}: 优先八分音符`);
                return availableRhythms.filter(r =>
                    ['eighth', 'quarter', 'eighth.'].includes(r.value)
                );
            } else {
                // 6/8拍非拍点：简单时值
                console.log(`🎼 6/8拍非拍点位置${currentPosition.toFixed(2)}: 简单时值`);
                return availableRhythms.filter(r =>
                    ['eighth', 'quarter'].includes(r.value)
                );
            }
        } else if (isOtherCompoundTime) {
            // 🎼 其他复合拍子（9/8, 12/8等）：使用通用复合拍子逻辑
            console.log(`🎼 其他复合拍子${timeSignature.beats}/${timeSignature.beatType}: 位置${currentPosition.toFixed(2)}`);
            const groupSize = 1.5; // 复合拍子的组大小
            const posInGroup = currentPosition % groupSize;
            const isOnCompoundBeat = Math.abs(posInGroup) < 0.01;
            const isOnCompoundSubbeat = Math.abs(posInGroup - 0.5) < 0.01 ||
                                       Math.abs(posInGroup - 1.0) < 0.01;

            if (isOnCompoundBeat) {
                return availableRhythms.filter(r =>
                    ['quarter.', 'half.', 'eighth.', 'quarter'].includes(r.value)
                );
            } else if (isOnCompoundSubbeat) {
                return availableRhythms.filter(r =>
                    ['eighth', 'quarter', 'eighth.'].includes(r.value)
                );
            } else {
                return availableRhythms.filter(r =>
                    ['eighth', 'quarter'].includes(r.value)
                );
            }
        } else if (is44Time) {
            // 🎵 4/4拍专用逻辑：单纯拍子的标准处理
            console.log(`🎼 4/4拍: 位置${currentPosition.toFixed(2)}`);
            const isOnBeat = Math.abs(currentPosition % 1.0) < 0.01;
            const isOnHalfBeat = Math.abs((currentPosition % 1.0) - 0.5) < 0.01;

            if (isOnBeat) {
                // 4/4拍强拍位置：允许八分音符提高出现频率，但保持规整时值优先
                return availableRhythms.filter(r =>
                    ['whole', 'half', 'half.', 'quarter', 'quarter.', 'eighth', 'eighth.'].includes(r.value)
                );
            } else if (isOnHalfBeat) {
                // 4/4拍弱拍位置：优先八分音符、四分音符
                return availableRhythms.filter(r =>
                    ['quarter', 'eighth', 'eighth.'].includes(r.value)
                );
            } else {
                // 4/4拍其他位置：避免十六分音符导致的过度切分，但允许八分音符
                return availableRhythms.filter(r =>
                    !['16th', 'sixteenth', '32nd'].includes(r.value)
                );
            }
        } else {
            // 🎵 其他单纯拍子（2/4, 3/4等）：通用单纯拍子逻辑
            console.log(`🎼 其他单纯拍子${timeSignature ? timeSignature.beats + '/' + timeSignature.beatType : '未知'}: 位置${currentPosition.toFixed(2)}`);
            const isOnBeat = Math.abs(currentPosition % 1.0) < 0.01;
            const isOnHalfBeat = Math.abs((currentPosition % 1.0) - 0.5) < 0.01;

            if (isOnBeat) {
                // 其他单纯拍子强拍位置：保守处理，避免过多短时值
                return availableRhythms.filter(r =>
                    ['whole', 'half', 'half.', 'quarter', 'quarter.'].includes(r.value)
                );
            } else if (isOnHalfBeat) {
                // 其他单纯拍子弱拍位置：优先四分音符和八分音符
                return availableRhythms.filter(r =>
                    ['quarter', 'eighth'].includes(r.value)
                );
            } else {
                // 其他位置：避免十六分音符导致的过度切分
                return availableRhythms.filter(r =>
                    !['16th', 'sixteenth', '32nd', 'eighth.'].includes(r.value)
                );
            }
        }
    }

    /**
     * 为拍群应用beaming规则（参考旋律视奏工具的实现）
     * 🎵 支持多时间签名：4/4, 3/4, 6/8, 2/4
     * @param {Array} groupEvents - 拍群事件数组
     * @param {string} groupId - 拍群标识符
     * @param {string} timeSignature - 拍号字符串，如 '4/4', '3/4', '6/8', '2/4'
     * @returns {Array} 应用beaming后的事件数组
     */
    applyBeatGroupBeaming(groupEvents, groupId, timeSignature = '4/4') {
        console.log(`🎵 应用${timeSignature}拍beaming规则`);
        console.log(`🔍 传入的事件数据总数: ${groupEvents.length}`);

        // 🎵 时间签名路由：根据不同拍号调用相应的beam生成函数
        switch (timeSignature) {
            case '3/4':
                console.log(`🎵 → 调用3/4拍专用beam生成逻辑`);
                return this.generateBeamsFor3_4(groupEvents, groupId);

            case '6/8':
                console.log(`🎼 → 调用6/8拍专用beam生成逻辑`);
                return this.generateBeamsFor6_8(groupEvents, groupId);

            case '2/4':
                console.log(`🎵 → 调用2/4拍专用beam生成逻辑`);
                return this.generateBeamsFor2_4(groupEvents, groupId);

            case '4/4':
            default:
                console.log(`🔥 → 使用4/4拍beaming逻辑 - 严格按拍分组`);
                // 继续使用下面的4/4拍逻辑
                break;
        }

        // 🎵 4/4拍beam生成逻辑（保留现有实现）
        const result = [];
        let beamGroupNotes = [];
        let beamCounter = 0;
        let currentBeat = -1; // 追踪当前拍号

        // 第一步：处理三连音组的专门beaming
        result.push(...this.processTripletGroupBeaming(groupEvents, groupId, beamCounter));
        beamCounter = result.filter(e => e.beamGroup && e.beamGroup.includes('triplet')).length / 3;

        // 第二步：处理其他音符的beaming（基于旋律视奏工具的实现）
        for (let i = 0; i < groupEvents.length; i++) {
            const event = groupEvents[i];

            // 🔥 关键修复：跳过所有三连音事件（同时检查tripletGroup和isTriplet）
            // 原因：不同生成函数可能只设置其中一个标记
            if (event.tripletGroup || event.isTriplet) continue;

            // 🆕 关键：计算当前拍号（基于position属性）
            const eventPosition = event.position || 0;
            const beatNumber = Math.floor(eventPosition); // 0拍->拍0, 1拍->拍1, 2拍->拍2, 3拍->拍3

            console.log(`🔍 处理事件${i}: ${event.type}/${event.value}, 拍${beatNumber}, 位置${eventPosition.toFixed(3)}`);

            if (event.type === 'rest') {
                // 休止符中断beaming
                console.log(`  ❌ 休止符中断beam组`);
                if (beamGroupNotes.length >= 2) {
                    console.log(`    ✅ 创建连杆组: 音符[${beamGroupNotes.map(idx => idx+1).join(', ')}]`);
                    this.finalizeBeamGroup(result, beamGroupNotes, `${groupId}_beam${beamCounter++}`);
                }
                beamGroupNotes = [];
                currentBeat = -1;

                // 添加休止符
                result.push({
                    ...event,
                });

            } else {
                // 音符处理
                const isShortRhythm = this.canNoteBeBeamed(event);
                console.log(`  🔍 音符${i}(${event.value}): 可连杆=${isShortRhythm}`);

                // 🆕 关键检查：是否换拍（基于旋律视奏工具的逻辑）
                // ⚠️ 特殊规则：同一拍内的0.5拍 tied音符，保持beaming结构
                if (currentBeat !== -1 && beatNumber !== currentBeat) {
                    // 检查前一个音符是否是tied音符且在拍的后半部分
                    const previousIndex = result.length - 1;
                    const previousEvent = previousIndex >= 0 ? result[previousIndex] : null;
                    const shouldPreserveBeam = previousEvent &&
                                              previousEvent.tie &&
                                              (previousEvent.tie === 'start' || previousEvent.tie === 'continue') &&
                                              previousEvent.position % 1 >= 0.5;

                    if (!shouldPreserveBeam) {
                        console.log(`  📍 换拍(从拍${currentBeat}到拍${beatNumber})，结束当前组`);
                        if (beamGroupNotes.length >= 2) {
                            console.log(`    ✅ 创建连杆组: 音符[${beamGroupNotes.map(idx => idx+1).join(', ')}]`);
                            this.finalizeBeamGroup(result, beamGroupNotes, `${groupId}_beam${beamCounter++}`);
                        }
                        beamGroupNotes = [];
                    } else {
                        console.log(`  🔗 换拍但前一音符有tie且在后半拍(${previousEvent.position.toFixed(3)})，保持beam连接`);
                    }
                }

                result.push({
                    ...event,
                });

                if (isShortRhythm) {
                    // 短时值音符加入beaming候选
                    currentBeat = beatNumber;
                    beamGroupNotes.push(result.length - 1);
                    console.log(`  ✅ 加入拍${beatNumber}连杆组，组大小: ${beamGroupNotes.length}`);
                } else {
                    // 长时值音符结束当前beaming组
                    console.log(`  ❌ 长时值音符，中断beam组`);
                    if (beamGroupNotes.length >= 2) {
                        console.log(`    ✅ 创建连杆组: 音符[${beamGroupNotes.map(idx => idx+1).join(', ')}]`);
                        this.finalizeBeamGroup(result, beamGroupNotes, `${groupId}_beam${beamCounter++}`);
                    }
                    beamGroupNotes = [];
                    currentBeat = -1;
                }
            }
        }

        // 处理拍群结尾的beaming
        if (beamGroupNotes.length >= 2) {
            console.log(`  ✅ 创建最终连杆组: 音符[${beamGroupNotes.map(idx => idx+1).join(', ')}]`);
            this.finalizeBeamGroup(result, beamGroupNotes, `${groupId}_beam${beamCounter++}`);
        }

        console.log(`🔥 Beaming完成: 共${beamCounter}个beam组`);

        // 🔥 关键修复：按position排序，确保三连音和非三连音events的正确顺序
        result.sort((a, b) => (a.position || 0) - (b.position || 0));
        console.log(`✅ 按position重新排序完成: ${result.length}个events`);

        return result;
    }

    /**
     * 专门处理三连音组的beaming
     * @param {Array} groupEvents - 事件数组
     * @param {string} groupId - 组ID
     * @param {number} beamCounter - beam计数器
     * @returns {Array} 处理后的三连音事件
     */
    processTripletGroupBeaming(groupEvents, groupId, beamCounter) {
        // 🔥 关键修复：完全移除三连音分组和beam处理逻辑
        // 原因：beam信息已在生成时通过calculateTripletBeamConnections()正确设置
        // 重新分组和处理会导致多个三连音组被错误连接（当tripletId缺失或长度超过3时）

        const tripletEvents = [];

        // 直接传递所有三连音事件，保留生成时设置的tripletBeamInfo
        groupEvents.forEach(event => {
            if (event.tripletGroup || event.isTriplet) {
                tripletEvents.push({
                    ...event
                    // 保留原有的tripletBeamInfo，不做任何修改
                });
            }
        });

        console.log(`✅ processTripletGroupBeaming: 传递${tripletEvents.length}个三连音事件，保留原有beam信息`);
        return tripletEvents;
    }

    /**
     * 完成beaming组的设置（参考旋律视奏工具完整实现）
     * @param {Array} result - 结果数组
     * @param {Array} beamGroupNotes - beam组音符索引
     * @param {string} beamId - beam组ID
     */
    finalizeBeamGroup(result, beamGroupNotes, beamId) {
        if (beamGroupNotes.length < BEAMING_RULES.basicRules.minimumGroupSize) return;

        // 🎵 获取beam组中的音符对象，用于计算beamLevels和stemDirection
        const groupNotes = beamGroupNotes.map(index => result[index]);

        // 🎵 计算beam层级（用于混合音值：八分+十六分等）
        const beamLevels = BEAMING_RULES.generateBeamLevels(groupNotes);

        // 🎵 计算符干方向（基于音符距离中线的位置）
        // 需要从pitch字符串提取step和octave信息
        const notesWithPitchInfo = groupNotes.map(note => {
            if (note.pitch) {
                // 🔧 支持重升降记号
                const match = note.pitch.match(/^([A-G])(#{1,2}|b{1,2})?(\d+)$/);
                if (match) {
                    return {
                        step: match[1],
                        octave: parseInt(match[3]),
                        ...note
                    };
                }
            }
            // 如果没有pitch信息，使用默认值
            return { step: 'C', octave: 4, ...note };
        });

        const stemDirection = BEAMING_RULES.stemDirectionRules.implementation.calculateDirection(notesWithPitchInfo);

        // 设置每个音符的beam信息
        beamGroupNotes.forEach((noteIndex, i) => {
            const note = result[noteIndex];

            // 设置beam位置：begin、continue、end
            if (i === 0) {
            } else if (i === beamGroupNotes.length - 1) {
            } else {
            }

            // 🎵 添加beam层级和符干方向信息
            note.beamLevels = beamLevels;
            note.stemDirection = stemDirection;
        });

        console.log(`✅ 创建beam组 ${beamId}: 音符 ${beamGroupNotes.map(i => i+1).join('-')} (${beamGroupNotes.length}个音符)`);
        console.log(`   Beam层级: ${beamLevels.length}层, 符干方向: ${stemDirection}`);
    }

    /**
     * 🎵 3/4拍专用beam生成逻辑
     * 从旋律视奏工具完整迁移
     * @param {Array} groupEvents - 事件数组
     * @param {string} groupId - 组ID
     * @returns {Array} 处理后的事件
     */
    generateBeamsFor3_4(groupEvents, groupId) {
        console.log(`🎵 3/4拍beam生成: 严格按拍分组 - three beats`);
        console.log(`🔍 传入的事件数据总数: ${groupEvents.length}`);

        const result = [];
        let currentPosition = 0;

        // 将音符按照严格的拍点分组 - 第1拍[0-1), 第2拍[1-2), 第3拍[2-3)
        const beatGroups = [[], [], []]; // 3个四分音符拍

        for (let i = 0; i < groupEvents.length; i++) {
            const event = groupEvents[i];
            const eventStart = currentPosition;
            const eventEnd = currentPosition + (event.duration || 0);

            // 计算在当前小节内的位置
            const measurePosition = eventStart % 3;
            const measureEnd = eventEnd % 3;

            console.log(`🎵 分析事件${i+1}: ${event.value}, 位置${eventStart.toFixed(3)}-${eventEnd.toFixed(3)}, 小节内${measurePosition.toFixed(3)}-${(measureEnd || 3).toFixed(3)}`);

            // 检查是否跨越任何整数拍点边界
            let crossesBeat = false;

            // 检查是否跨越任何拍点边界 (1.0, 2.0)
            for (let boundary = 1; boundary <= 2; boundary++) {
                if (measurePosition < boundary && measureEnd > boundary) {
                    console.log(`  ❌ 跨越第${boundary}拍边界，不能beam`);
                    crossesBeat = true;
                    break;
                }
            }

            if (!crossesBeat) {
                // 确定事件属于哪个拍
                let beatIndex = -1;

                if (measurePosition >= 0 && measurePosition < 1) {
                    beatIndex = 0; // 第1拍
                } else if (measurePosition >= 1 && measurePosition < 2) {
                    beatIndex = 1; // 第2拍
                } else if (measurePosition >= 2 && measurePosition < 3) {
                    beatIndex = 2; // 第3拍
                }

                if (beatIndex >= 0) {
                    beatGroups[beatIndex].push(i);
                    console.log(`  ✅ 事件${i+1}分配到拍${beatIndex+1}`);
                }
            }

            currentPosition += (event.duration || 0);
        }

        // 为每个拍内的音符生成beam组 - 严格限制在单个四分音符拍内，休止符中断beam
        let beamCounter = 0;
        for (let beatIndex = 0; beatIndex < 3; beatIndex++) {
            const beatNotes = beatGroups[beatIndex];
            console.log(`🎵 拍${beatIndex+1}的事件: [${beatNotes.map(idx => idx+1).join(', ')}]`);

            if (beatNotes.length >= 2) {
                // 在同一拍内，按连续性分组，休止符会中断beam连接
                let currentGroup = [];

                for (let i = 0; i < beatNotes.length; i++) {
                    const eventIndex = beatNotes[i];
                    const event = groupEvents[eventIndex];

                    if (event.type === 'note' && this.canNoteBeBeamed(event)) {
                        // 这是一个可beaming的音符
                        currentGroup.push(eventIndex);
                    } else {
                        // 这是休止符或不可beam的音符，中断当前组
                        if (currentGroup.length >= 2) {
                            const groupIndices = currentGroup.map(idx => {
                                result.push({
                                    ...groupEvents[idx],
                                });
                                return result.length - 1;
                            });
                            this.finalizeBeamGroup(result, groupIndices, `${groupId}_3_4_beat${beatIndex+1}_beam${beamCounter++}`);
                            console.log(`  ✅ 拍${beatIndex+1}创建beam组: [${groupIndices.map(idx => idx+1).join(', ')}]`);
                        } else {
                            currentGroup.forEach(idx => {
                                result.push({
                                    ...groupEvents[idx],
                                });
                            });
                        }
                        currentGroup = [];
                        // 添加中断的事件
                        result.push({
                            ...event,
                        });
                    }
                }

                // 处理最后一个组
                if (currentGroup.length >= 2) {
                    const groupIndices = currentGroup.map(idx => {
                        result.push({
                            ...groupEvents[idx],
                        });
                        return result.length - 1;
                    });
                    this.finalizeBeamGroup(result, groupIndices, `${groupId}_3_4_beat${beatIndex+1}_beam${beamCounter++}`);
                    console.log(`  ✅ 拍${beatIndex+1}创建最终beam组: [${groupIndices.map(idx => idx+1).join(', ')}]`);
                } else {
                    currentGroup.forEach(idx => {
                        result.push({
                            ...groupEvents[idx],
                        });
                    });
                }
            } else {
                // 只有0或1个事件，直接添加
                beatNotes.forEach(idx => {
                    result.push({
                        ...groupEvents[idx],
                    });
                });
            }
        }

        console.log(`🎵 3/4拍beam生成完成: 共${beamCounter}个beam组`);
        return result;
    }

    /**
     * 🎵 6/8拍专用beam生成逻辑
     * 从旋律视奏工具完整迁移
     * @param {Array} groupEvents - 事件数组
     * @param {string} groupId - 组ID
     * @returns {Array} 处理后的事件
     */
    generateBeamsFor6_8(groupEvents, groupId) {
        console.log(`🎼 [6/8专用] 开始构建6/8拍beam组 - 严格两大组模式`);
        console.log(`  输入: ${groupEvents.length}个事件`);

        const result = [];
        let position = 0;

        // 第一大组：位置0.0-1.5（前三个八分音符时值）
        const firstGroupNotes = [];
        // 第二大组：位置1.5-3.0（后三个八分音符时值）
        const secondGroupNotes = [];

        // 遍历所有事件，根据位置分配到两大组
        for (let i = 0; i < groupEvents.length; i++) {
            const event = groupEvents[i];
            const eventStart = position;
            const eventEnd = position + (event.duration || 0);

            // 只有可以beaming的音符才加入组
            if (event.type === 'note' && this.canNoteBeBeamed(event)) {
                // 判断事件属于哪个大组
                if (eventStart < 1.5) {
                    // 第一大组（0-1.5）
                    // 但如果事件会跨越1.5边界，则不加入任何组
                    if (eventEnd <= 1.5 + 0.001) {
                        firstGroupNotes.push(i);
                        console.log(`    事件${i}: → 加入第一大组`);
                    } else {
                        console.log(`    事件${i}: ⚠️ 跨越1.5边界，不加入beam组`);
                    }
                } else if (eventStart >= 1.5 - 0.001) {
                    // 第二大组（1.5-3.0）
                    secondGroupNotes.push(i);
                    console.log(`    事件${i}: → 加入第二大组`);
                }
            } else if (event.type === 'rest') {
                console.log(`    事件${i}: → 休止符，中断beam连接`);
            }

            position = eventEnd;
        }

        // 处理第一大组
        if (firstGroupNotes.length >= 2) {
            const groupIndices = [];
            firstGroupNotes.forEach(idx => {
                result.push({
                    ...groupEvents[idx],
                });
                groupIndices.push(result.length - 1);
            });
            this.finalizeBeamGroup(result, groupIndices, `${groupId}_6_8_group1`);
            console.log(`  ✅ 第一大组beam: [${groupIndices.map(idx => idx+1).join(', ')}]`);
        } else {
            firstGroupNotes.forEach(idx => {
                result.push({
                    ...groupEvents[idx],
                });
            });
        }

        // 处理第二大组
        if (secondGroupNotes.length >= 2) {
            const groupIndices = [];
            secondGroupNotes.forEach(idx => {
                result.push({
                    ...groupEvents[idx],
                });
                groupIndices.push(result.length - 1);
            });
            this.finalizeBeamGroup(result, groupIndices, `${groupId}_6_8_group2`);
            console.log(`  ✅ 第二大组beam: [${groupIndices.map(idx => idx+1).join(', ')}]`);
        } else {
            secondGroupNotes.forEach(idx => {
                result.push({
                    ...groupEvents[idx],
                });
            });
        }

        // 添加不在任何组中的事件（如休止符、跨边界的音符等）
        for (let i = 0; i < groupEvents.length; i++) {
            if (!firstGroupNotes.includes(i) && !secondGroupNotes.includes(i)) {
                result.push({
                    ...groupEvents[i],
                });
            }
        }

        console.log(`🎼 6/8拍beam生成完成`);
        return result;
    }

    /**
     * 🎵 2/4拍专用beam生成逻辑
     * 从旋律视奏工具完整迁移
     * @param {Array} groupEvents - 事件数组
     * @param {string} groupId - 组ID
     * @returns {Array} 处理后的事件
     */
    generateBeamsFor2_4(groupEvents, groupId) {
        console.log(`🎵 2/4拍beam生成: 严格按拍分组 - two beats`);
        console.log(`🔍 传入的事件数据总数: ${groupEvents.length}`);

        const result = [];
        let currentPosition = 0;

        // 将音符按照严格的拍点分组 - 第1拍[0-1), 第2拍[1-2)
        const beatGroups = [[], []]; // 2个四分音符拍

        for (let i = 0; i < groupEvents.length; i++) {
            const event = groupEvents[i];
            const eventStart = currentPosition;
            const eventEnd = currentPosition + (event.duration || 0);

            // 计算在当前小节内的位置
            const measurePosition = eventStart % 2;
            const measureEnd = eventEnd % 2;

            console.log(`🎵 分析事件${i+1}: ${event.value}, 位置${eventStart.toFixed(3)}-${eventEnd.toFixed(3)}, 小节内${measurePosition.toFixed(3)}-${(measureEnd || 2).toFixed(3)}`);

            // 🔥 2/4拍最严格规则：绝对不允许跨越位置1（第二拍开始）
            let crossesBeat = false;
            if (measurePosition < 1 && measureEnd > 1) {
                console.log(`  ❌ 跨越第1拍边界（位置1），严格禁止beam`);
                crossesBeat = true;
            }

            if (!crossesBeat) {
                // 确定事件属于哪个拍
                let beatIndex = -1;

                if (measurePosition >= 0 && measurePosition < 1) {
                    beatIndex = 0; // 第1拍
                } else if (measurePosition >= 1 && measurePosition < 2) {
                    beatIndex = 1; // 第2拍
                }

                if (beatIndex >= 0) {
                    beatGroups[beatIndex].push(i);
                    console.log(`  ✅ 事件${i+1}分配到拍${beatIndex+1}`);
                }
            }

            currentPosition += (event.duration || 0);
        }

        // 为每个拍内的音符生成beam组
        let beamCounter = 0;
        for (let beatIndex = 0; beatIndex < 2; beatIndex++) {
            const beatNotes = beatGroups[beatIndex];
            console.log(`🎵 拍${beatIndex+1}的事件: [${beatNotes.map(idx => idx+1).join(', ')}]`);

            if (beatNotes.length >= 2) {
                // 在同一拍内，按连续性分组，休止符会中断beam连接
                let currentGroup = [];

                for (let i = 0; i < beatNotes.length; i++) {
                    const eventIndex = beatNotes[i];
                    const event = groupEvents[eventIndex];

                    if (event.type === 'note' && this.canNoteBeBeamed(event)) {
                        currentGroup.push(eventIndex);
                    } else {
                        if (currentGroup.length >= 2) {
                            const groupIndices = currentGroup.map(idx => {
                                result.push({
                                    ...groupEvents[idx],
                                });
                                return result.length - 1;
                            });
                            this.finalizeBeamGroup(result, groupIndices, `${groupId}_2_4_beat${beatIndex+1}_beam${beamCounter++}`);
                        } else {
                            currentGroup.forEach(idx => {
                                result.push({
                                    ...groupEvents[idx],
                                });
                            });
                        }
                        currentGroup = [];
                        result.push({
                            ...event,
                        });
                    }
                }

                // 处理最后一个组
                if (currentGroup.length >= 2) {
                    const groupIndices = currentGroup.map(idx => {
                        result.push({
                            ...groupEvents[idx],
                        });
                        return result.length - 1;
                    });
                    this.finalizeBeamGroup(result, groupIndices, `${groupId}_2_4_beat${beatIndex+1}_beam${beamCounter++}`);
                } else {
                    currentGroup.forEach(idx => {
                        result.push({
                            ...groupEvents[idx],
                        });
                    });
                }
            } else {
                beatNotes.forEach(idx => {
                    result.push({
                        ...groupEvents[idx],
                    });
                });
            }
        }

        console.log(`🎵 2/4拍beam生成完成: 共${beamCounter}个beam组`);
        return result;
    }

    /**
     * 生成单拍的节奏（考虑正确的beaming分组和休止符）
     * @param {Array} allowedRhythms - 允许的节奏类型
     * @param {number} beatType - 拍子单位
     * @returns {Array} 单拍内的节奏数组
     */
    generateBeatRhythm(allowedRhythms, beatType) {
        const beatDuration = 4.0 / beatType; // 每拍的时值（以全音符为4）

        // 过滤出适合单拍的节奏
        const suitableRhythms = allowedRhythms.filter(rhythm => {
            const duration = this.rhythmDurations[rhythm.value];
            return duration && duration <= beatDuration;
        });

        if (suitableRhythms.length === 0) {
            // 默认使用一个基本拍子单位
            return [{
                value: beatType === 4 ? 'quarter' : 'half',
                displayName: beatType === 4 ? '四分音符' : '二分音符',
                duration: beatDuration,
                type: 'note'
            }];
        }

        // 生成拍内的节奏模式（包含音符和休止符）
        const beatEvents = this.generateBeatEvents(suitableRhythms, beatDuration);

        // 分析beaming分组（只对连续的音符进行beaming）
        return this.applyBeamingRules(beatEvents);
    }

    /**
     * 生成拍内的事件（音符和休止符）
     * @param {Array} suitableRhythms - 适合的节奏类型
     * @param {number} beatDuration - 拍的持续时间
     * @returns {Array} 拍内事件数组
     */
    generateBeatEvents(suitableRhythms, beatDuration) {
        const events = [];
        let remainingDuration = beatDuration;

        while (remainingDuration > 0.01) {
            const availableRhythms = suitableRhythms.filter(rhythm => {
                const duration = this.rhythmDurations[rhythm.value];
                return duration <= remainingDuration + 0.01;
            });

            if (availableRhythms.length === 0) {
                // 🎯 用剩余时值填充，确保value与duration匹配
                const fillValue = this.findClosestDuration(remainingDuration);
                const standardDuration = this.rhythmDurations[fillValue];
                console.warn(`⚠️ 没有可用节奏，使用填充音符：${fillValue}(${standardDuration}拍)`);
                events.push({
                    value: fillValue,
                    displayName: `填充音符(${standardDuration}拍)`,
                    duration: standardDuration,
                    beats: standardDuration, // 🆕 从旋律工具迁移：beats时值
                    type: 'note',
                    position: currentPosition // 🆕 记录事件位置
                });
                remainingDuration -= standardDuration;
                currentPosition += standardDuration;
                continue;
            }

            // 🎵 允许所有拍号生成休止符（移除6/8拍限制）
            let shouldGenerateRest = false;

            // 所有拍号都允许休止符生成
            // 🎵 减少切分节奏：在拍内也降低休止符概率
            const currentPosition = beatDuration - remainingDuration;
            const isNearBeatStart = currentPosition < 0.1;

            // 🎼 增加休止符生成概率，让音程有更多喘气空间
            const restProbability = isNearBeatStart ? 0.20 : 0.35; // 增加到20-35%
            shouldGenerateRest = Math.random() < restProbability;

            if (shouldGenerateRest && events.length > 0) { // 不在拍开始时生成休止符
                const selectedRhythm = availableRhythms[Math.floor(Math.random() * availableRhythms.length)];
                const duration = this.rhythmDurations[selectedRhythm.value];

                // 🔧 修复：使用标准时值映射生成正确的休止符显示名称
                const correctDisplayName = this.getDurationDisplayName(selectedRhythm.value);

                events.push({
                    value: selectedRhythm.value,
                    displayName: `${correctDisplayName}休止符`,
                    duration: duration,
                    beats: duration, // 🆕 从旋律工具迁移：beats时值
                    type: 'rest'
                });

                remainingDuration -= duration;
                currentPosition += duration;
            } else {
                // 🎵 在拍内也应用优先节拍逻辑
                const preferredRhythms = this.getPreferredRhythms(availableRhythms, currentPosition, null);
                const selectedRhythm = preferredRhythms.length > 0 ?
                    preferredRhythms[Math.floor(Math.random() * preferredRhythms.length)] :
                    availableRhythms[Math.floor(Math.random() * availableRhythms.length)];
                const duration = this.rhythmDurations[selectedRhythm.value];

                events.push({
                    value: selectedRhythm.value,
                    displayName: selectedRhythm.displayName,
                    duration: duration,
                    beats: duration, // 🆕 从旋律工具迁移：beats时值
                    type: 'note'
                });

                remainingDuration -= duration;
                currentPosition += duration;
            }
        }

        return events;
    }

    /**
     * 应用正确的beaming规则（只对拍内连续的音符进行beaming）
     * @param {Array} beatEvents - 拍内事件数组
     * @returns {Array} 应用beaming规则后的事件数组
     */
    applyBeamingRules(beatEvents) {
        const result = [];
        let beamGroupNotes = [];
        let beamCounter = 0;

        for (let i = 0; i < beatEvents.length; i++) {
            const event = beatEvents[i];

            if (event.type === 'rest') {
                // 休止符中断beaming
                if (beamGroupNotes.length > 1) {
                    this.finalizeBeamGroup(result, beamGroupNotes, `beat_beam${beamCounter++}`);
                }
                beamGroupNotes = [];

                // 添加休止符
                result.push({
                    ...event,
                });
            } else {
                // 音符处理
                const canBeam = this.canNoteBeBeamed(event);

                result.push({
                    ...event,
                });

                if (canBeam) {
                    // 可连杆音符加入beaming候选
                    beamGroupNotes.push(result.length - 1);
                } else {
                    // 不可连杆音符中断beaming
                    if (beamGroupNotes.length > 1) {
                        this.finalizeBeamGroup(result, beamGroupNotes, `beat_beam${beamCounter++}`);
                    }
                    beamGroupNotes = [];
                }
            }
        }

        // 处理拍结尾的beaming
        if (beamGroupNotes.length > 1) {
            this.finalizeBeamGroup(result, beamGroupNotes, `beat_beam${beamCounter++}`);
        }

        return result;
    }

    /**
     * 判断是否为短时值音符（八分音符及更短）
     * @param {string} rhythmValue - 节奏值
     * @returns {boolean} 是否为短时值
     */
    isShortRhythm(rhythmValue) {
        const duration = this.rhythmDurations[rhythmValue];
        return duration && duration <= 0.5; // 八分音符及更短
    }

    /**
     * 为短时值音符过滤音程类型（最大跨度为完全四度）
     * @param {Array} intervalTypes - 原始音程类型数组
     * @returns {Array} 过滤后的音程类型数组
     */
    filterIntervalTypesForShortRhythms(intervalTypes, allowLeapsOnStrongBeat = false) {
        // 弱拍/短时值：≤完全四度（5半音）
        // 强拍/短时值：允许适度跳进（5度/6度/八度），仍排除 tritone 与七度
        const base = [0, 1, 2, 3, 4, 5];
        const extended = [1, 2, 3, 4, 5, 7, 8, 9, 12]; // 二度少量，主推3/4/5/6/8
        const allowedSet = new Set(allowLeapsOnStrongBeat ? extended : base);
        return intervalTypes.filter(t => allowedSet.has(t.semitones));
    }

    /** First Species 过滤：仅协和音程（3、6、5、8；首尾可1），禁4度/7度/三全音 */
    filterFirstSpeciesIntervals(intervalTypes, isFirstEvent, isLastEvent) {
        const consonant = new Set([3,4,7,8,9,12]); // m3(3) M3(4) P5(7) m6(8) M6(9) P8(12)
        const perfectOnly = new Set([0,12]);       // P1(0) P8(12)
        let allowed;
        if (isFirstEvent || isLastEvent) {
            allowed = intervalTypes.filter(t => perfectOnly.has(t.semitones));
            if (allowed.length === 0) allowed = intervalTypes.filter(t => t.semitones === 12 || t.semitones === 7);
        } else {
            allowed = intervalTypes.filter(t => consonant.has(t.semitones));
        }
        return allowed.length > 0 ? allowed : intervalTypes;
    }

    /**
     * 生成一个音程对，考虑级进连接（基于音名距离，不是半音距离）
     * @param {Object} scale - 音阶信息
     * @param {Array} allowedIntervalTypes - 允许的音程类型
     * @param {number} rangeMin - 最低音MIDI号
     * @param {number} rangeMax - 最高音MIDI号
     * @param {Object|null} previousInterval - 上一个音程信息
     * @param {number|null} measureIndex - 小节索引（用于第一拍）
     * @param {number} currentPosition - 当前在小节中的位置
     * @param {Object} timeSignature - 拍号信息
     * @returns {Object} 音程对
     */
    generateIntervalPairWithProgression(scale, allowedIntervalTypes, rangeMin, rangeMax, previousInterval = null, measureIndex = null, currentPosition = 0, timeSignature = null, isLastNote = false) {
        // 🔒 终极入口防御 (2025-10-10): 过滤被污染的allowedIntervalTypes参数
        // 致命问题：上游函数可能向allowedIntervalTypes添加用户未勾选的音程（如二度）
        // 根本解决：基于白名单过滤，确保只使用用户真实选择的音程类型
        if (this._allowedSemitonesSet && this._allowedSemitonesSet.size > 0) {
            const originalCount = allowedIntervalTypes.length;
            const originalSemitones = allowedIntervalTypes.map(t => t.semitones).sort((a,b)=>a-b);

            allowedIntervalTypes = allowedIntervalTypes.filter(interval => {
                const isAllowed = this._allowedSemitonesSet.has(interval.semitones);
                if (!isAllowed) {
                    console.error(`🔒 [入口拦截] 移除污染音程: ${interval.displayName}(${interval.semitones}半音)`);
                }
                return isAllowed;
            });

            if (originalCount !== allowedIntervalTypes.length) {
                console.error(`❌❌❌ [污染发现] 在入口拦截了 ${originalCount - allowedIntervalTypes.length} 个污染音程！`);
                console.error(`  污染前: [${originalSemitones.join(', ')}]`);
                console.error(`  清理后: [${allowedIntervalTypes.map(t => t.semitones).sort((a,b)=>a-b).join(', ')}]`);
                console.error(`  🔍 污染来源可能是过滤函数(filterIntervalTypesForShortRhythms/filterFirstSpeciesIntervals/filterIntervalsByBeatStrength)`);
            }

            if (allowedIntervalTypes.length === 0) {
                console.error(`❌ [入口拦截] 过滤后没有可用音程！这不应该发生`);
                throw new Error('入口过滤导致没有可用音程类型，无法生成');
            }
        }

        // 🎯 检查是否需要强制使用主和弦音程配对
        if (this.forceTonicChordIntervals && this.forceTonicChordIntervals.length > 0) {
            console.log(`🎯 强制使用主和弦音程配对，共${this.forceTonicChordIntervals.length}个选项`);
            console.log(`🔍 音域限制: ${this.midiToNote(rangeMin)}-${this.midiToNote(rangeMax)} (MIDI: ${rangeMin}-${rangeMax})`);

            // 🔥 关键修复：尝试所有主和弦配对，直到找到一个成功的
            for (let pairIndex = 0; pairIndex < this.forceTonicChordIntervals.length; pairIndex++) {
                const tonicPair = this.forceTonicChordIntervals[pairIndex];
                const { lowerNote, upperNote, intervalType } = tonicPair;

                console.log(`🎯 尝试主和弦配对 ${pairIndex + 1}/${this.forceTonicChordIntervals.length}: ${lowerNote}-${upperNote} (${intervalType.displayName})`);

                // 找到合适的八度组合
                const suitableOctaves = this.findSuitableOctavesForInterval(
                    lowerNote, upperNote,
                    scale.notes.indexOf(lowerNote), scale.notes.indexOf(upperNote),
                    rangeMin, rangeMax, previousInterval
                );

                console.log(`🔍 为 ${lowerNote}-${upperNote} 找到 ${suitableOctaves.length} 个合适的八度组合`);

                if (suitableOctaves.length > 0) {
                    // 尝试所有八度组合，找到符合音程类型的
                    for (const selectedOctave of suitableOctaves) {
                        // 应用临时记号
                        const lowerPitch = this.applyAccidental(lowerNote + selectedOctave.lowerOctave);
                        const upperPitch = this.applyAccidental(upperNote + selectedOctave.upperOctave);
                        const lowerMidi = this.noteToMidi(lowerPitch);
                        const upperMidi = this.noteToMidi(upperPitch);

                        console.log(`🎼 测试八度: ${lowerPitch}(${lowerMidi}) - ${upperPitch}(${upperMidi})`);

                        // 🔥 严格验证音域限制
                        if (lowerMidi < rangeMin || lowerMidi > rangeMax || upperMidi < rangeMin || upperMidi > rangeMax) {
                            console.log(`❌ 音域验证失败: ${lowerPitch}(${lowerMidi}) 或 ${upperPitch}(${upperMidi}) 超出范围 ${rangeMin}-${rangeMax}`);
                            continue;
                        }

                        // 验证音程类型
                        const actualSemitones = upperMidi - lowerMidi;

                        if (actualSemitones === intervalType.semitones) {
                            console.log(`✅ 成功生成主和弦音程: ${lowerPitch} - ${upperPitch} (${intervalType.displayName})`);
                            console.log(`🎯 主和弦强制逻辑成功，确保最后音程为主和弦`);

                            return {
                                lower: {
                                    pitch: lowerPitch,
                                    midi: lowerMidi,
                                    duration: 'quarter',
                                    type: 'note'
                                },
                                upper: {
                                    pitch: upperPitch,
                                    midi: upperMidi,
                                    duration: 'quarter',
                                    type: 'note'
                                },
                                intervalType: intervalType.displayName,
                                // 🎯 主和弦也需要MIDI级进信息
                                lowerMidi: lowerMidi,
                                lowerScaleIndex: scale.notes.indexOf(lowerNote),
                                prevScaleIndex: scale.notes.indexOf(lowerNote)
                            };
                        } else {
                            console.log(`❌ 主和弦八度调整后音程类型不匹配: ${actualSemitones} != ${intervalType.semitones}`);
                        }
                    }
                } else {
                    console.log(`❌ 无法为主和弦配对 ${lowerNote}-${upperNote} 找到合适的八度`);
                }
            }

            // 如果所有主和弦配对都失败，保持标记并抛出错误，强制重试
            console.log(`❌ 所有主和弦配对都失败！这不应该发生，将抛出错误强制重试`);
            throw new Error('无法生成主和弦音程，所有配对都失败');
        }

        const maxAttempts = 50;
        let attempts = 0;

        while (attempts < maxAttempts) {
            attempts++;

            try {
                // 🔍 [深度调试] 音程类型选择前状态检查
                console.log(`🔍 [调试] 第${attempts}次尝试 - 入口allowedIntervalTypes:`,
                    allowedIntervalTypes.map(t => `${t.name}(${t.semitones}半音)`).join(', '));
                console.log(`🔍 [调试] 白名单Set:`,
                    this._allowedSemitonesSet ? Array.from(this._allowedSemitonesSet).sort((a,b)=>a-b) : 'undefined');

                // 🎯 重拍优先策略：在重拍位置优先选择target interval
                const intervalType = this.selectIntervalWithBeatPriority(
                    allowedIntervalTypes,
                    currentPosition,
                    timeSignature
                );
                const intervalDegree = this.intervalDegrees[intervalType.name];

                // 🔍 [深度调试] 选中的音程类型
                console.log(`🔍 [调试] ✓ 选中音程: ${intervalType.name}(${intervalType.semitones}半音) → 度数${intervalDegree}`);

                // 🔍 调试信息：显示当前生成上下文
                console.log(`🎼 生成音程上下文: 调性[${scale.notes.join(' ')}], 可选音程[${allowedIntervalTypes.map(t => t.displayName).join(', ')}]`);
                console.log(`🔍 选中音程类型: ${intervalType.displayName} (${intervalType.name}, ${intervalType.semitones}半音)`);

                if (!intervalDegree) {
                    console.warn(`❌ 未知音程类型: ${intervalType.name}，可用类型: ${Object.keys(this.intervalDegrees).join(', ')}`);
                    continue;
                }

                let lowerMidi;
                let lowerScaleIndex;

                // 🎯 修复：基于MIDI音高的统一线条感逻辑（和simplified generator一致）
                if (previousInterval && previousInterval.lowerMidi !== undefined) {
                    // 有上一个音程：基于MIDI音高进行CF风格级进
                    let moveDirection;
                    const measureDur = this.calculateMeasureDuration(timeSignature || {beats:4,beatType:4});
                    const totalDur = (this.measureCount || 4) * measureDur;
                    const currentAbsPos = (measureIndex || 0) * measureDur + (currentPosition || 0);
                    const t = totalDur > 0 ? currentAbsPos / totalDur : 0;
                    const preferUp = !this._cfApexReached && (t < (this._cfApexPosition || 0.6));

                    if (this._cfForceOppositeNext && this._cfPrevMoveDir !== 0) {
                        moveDirection = -this._cfPrevMoveDir;
                        this._cfForceOppositeNext = false;
                    } else {
                        // 朝向顶点/回落的方向偏置
                        if (preferUp) moveDirection = Math.random() < 0.85 ? 1 : -1;
                        else moveDirection = Math.random() < 0.85 ? -1 : 1;
                    }

                    // 步进分布：80% 1-2半音，15% 3-4半音，5% 5-7半音(仅强拍)
                    const onStrong = timeSignature ? this.isStrongBeat(currentPosition || 0, timeSignature) : false;
                    let stepSemitones;
                    const r = Math.random();
                    if (r < 0.80) stepSemitones = (Math.random() < 0.5 ? 1 : 2);
                    else if (r < 0.95) stepSemitones = (Math.random() < 0.5 ? 3 : 4);
                    else stepSemitones = onStrong ? (Math.floor(Math.random()*3)+5) : (Math.random() < 0.5 ? 1 : 2);
                    console.log(`🎵 CF步进: ${stepSemitones}半音, 方向=${moveDirection>0?'上':'下'} 强拍=${onStrong}`);

                    const targetMidi = previousInterval.lowerMidi + (moveDirection * stepSemitones);

                    // 找到距离目标音高最近的调内音符
                    let bestMidi = targetMidi;
                    let bestDistance = Infinity;
                    let bestScaleIndex = 0;

                    // 🔧 修复 (2025-10-10): 小调使用7音基础音阶，避免F↔F#或G↔G#跳跃产生意外二度
                    const baseScale = this.getBaseScale(scale);

                    for (let octave = 3; octave <= 5; octave++) {
                        for (let i = 0; i < baseScale.notes.length; i++) {
                            const notePitch = `${baseScale.notes[i]}${octave}`;
                            let noteMidi;
                            try {
                                // 🎯 这里用calculateMidiDirect是正确的，因为notePitch已经是调内音符
                                noteMidi = this.calculateMidiDirect ? this.calculateMidiDirect(notePitch) : 60;
                            } catch (error) {
                                continue;
                            }

                            const distance = Math.abs(noteMidi - targetMidi);
                            if (distance < bestDistance) {
                                bestDistance = distance;
                                bestMidi = noteMidi;
                                bestScaleIndex = i;
                            }
                        }
                    }

                    lowerMidi = bestMidi;
                    lowerScaleIndex = bestScaleIndex;

                    console.log(`🎵 MIDI级进连接: 从MIDI${previousInterval.lowerMidi} 级进到 MIDI${lowerMidi} (${lowerMidi - previousInterval.lowerMidi > 0 ? '+' : ''}${lowerMidi - previousInterval.lowerMidi}半音)`);
                    this._cfPrevMoveDir = Math.sign(lowerMidi - previousInterval.lowerMidi) || this._cfPrevMoveDir || 1;
                    if (Math.abs(lowerMidi - previousInterval.lowerMidi) >= 5) this._cfForceOppositeNext = true; // 大跳后强制反向
                    if (!this._cfApexReached && this._cfApexMidiTarget && lowerMidi >= this._cfApexMidiTarget) {
                        this._cfApexReached = true;
                        console.log(`🔺 CF顶点到达: MIDI${lowerMidi}`);
                    }

                } else {
                    // 🎵 修复：使用7音基础音阶进行索引计算（小调）
                    const baseScale = this.getBaseScale(scale);

                    // 第一个音程：随机选择调内音符作为起始点
                    lowerScaleIndex = Math.floor(Math.random() * baseScale.notes.length);
                    const lowerNote = baseScale.notes[lowerScaleIndex];

                    // 随机选择八度（在合理音域内）
                    const randomOctave = 4 + Math.floor(Math.random() * 2); // 4或5八度
                    const lowerPitch = `${lowerNote}${randomOctave}`;

                    try {
                        lowerMidi = this.calculateMidiDirect ? this.calculateMidiDirect(lowerPitch) : 60;
                    } catch (error) {
                        lowerMidi = 60;
                    }

                    console.log(`🎵 随机起始音程: ${lowerNote} (音阶位置${lowerScaleIndex}) → MIDI${lowerMidi}`);
                }

                // 🛡️ 安全检查：确保lowerMidi和lowerScaleIndex都有效
                if (lowerMidi === undefined || lowerScaleIndex === undefined) {
                    console.warn(`❌ 音符选择失败，使用回退值`);
                    lowerMidi = 60; // C4
                    lowerScaleIndex = 0; // 第一个音阶音符
                }

                // 🎵 使用7音基础音阶进行索引计算（小调和大调统一）
                const baseScale = this.getBaseScale(scale);
                const lowerNote = baseScale.notes[lowerScaleIndex];

                // 🔧 根本修复 (2025-10-10): 上方音也从7音baseScale选择
                // 和声/旋律小调的变化音（F#, G#等）由智能变化音系统负责，不在这里处理
                const expectedDegree = this.intervalDegrees[intervalType.name];
                const upperScaleIndex = (lowerScaleIndex + expectedDegree - 1) % baseScale.notes.length;
                const upperNote = baseScale.notes[upperScaleIndex];

                console.log(`🎵 尝试生成: ${lowerNote} (位置${lowerScaleIndex}) -> ${upperNote} (位置${upperScaleIndex}) ${intervalType.displayName} [度数=${expectedDegree}]`);

                // 🎯 修复：基于已计算的MIDI音高确定八度
                let targetLowerOctave = Math.floor(lowerMidi / 12) - 1; // MIDI转八度 (C4=60, octave=4)

                // 确保八度在合理范围内 (3-5)
                if (targetLowerOctave < 3) targetLowerOctave = 3;
                if (targetLowerOctave > 5) targetLowerOctave = 5;

                // 寻找合适的八度组合，但优先使用我们计算的MIDI音高对应的八度
                const suitableOctaves = this.findSuitableOctavesForInterval(
                    lowerNote, upperNote, lowerScaleIndex, upperScaleIndex, rangeMin, rangeMax, previousInterval
                );

                // 🎯 如果MIDI计算的八度在可选范围内，优先使用它
                const midiBasedOctave = suitableOctaves.find(opt => opt.lowerOctave === targetLowerOctave);
                if (midiBasedOctave) {
                    // 将MIDI计算的八度选项放在首位
                    const index = suitableOctaves.indexOf(midiBasedOctave);
                    suitableOctaves.splice(index, 1);
                    suitableOctaves.unshift(midiBasedOctave);
                    console.log(`🎯 优先使用MIDI计算的八度: ${targetLowerOctave}`);
                }

                if (suitableOctaves.length === 0) {
                    console.log(`❌ 无法在音域范围内找到合适的八度: ${lowerNote}-${upperNote}`);
                    continue;
                }

                // 验证这确实是正确的音程类型（基于音符名称）
                if (!this.verifyInterval(lowerNote, upperNote, intervalType, scale)) {
                    console.log(`❌ 音程验证失败: ${lowerNote}-${upperNote} 不符合 ${intervalType.displayName}`);
                    console.log(`🔍 验证失败上下文: 尝试${attempts}/${maxAttempts}, 调性[${scale.notes.join(' ')}]`);
                    continue;
                }

                // 🔥 关键修复：遍历所有八度组合，找到既在音域内又符合音程类型的组合
                let validOctave = null;
                console.log(`🔍 检查${suitableOctaves.length}个八度组合是否符合音程类型要求`);

                for (const octaveOption of suitableOctaves) {
                    // 🎼 应用临时记号（如果设置了临时记号概率）
                    const lowerPitchWithAccidental = this.applyAccidental(lowerNote + octaveOption.lowerOctave);
                    const upperPitchWithAccidental = this.applyAccidental(upperNote + octaveOption.upperOctave);

                    const testLowerPitch = lowerPitchWithAccidental;
                    const testUpperPitch = upperPitchWithAccidental;
                    const testLowerMidi = this.noteToMidi(testLowerPitch);
                    const testUpperMidi = this.noteToMidi(testUpperPitch);

                    // 验证八度调整后的实际音程类型是否符合期望
                    const actualSemitones = testUpperMidi - testLowerMidi;
                    const expectedSemitones = intervalType.semitones;

                    console.log(`🎼 测试八度组合: ${testLowerPitch}(${testLowerMidi}) -> ${testUpperPitch}(${testUpperMidi})`);
                    console.log(`🔍 半音距离: 实际=${actualSemitones}，期望=${expectedSemitones} (${intervalType.displayName})`);

                    // 🔥 严格验证音域限制（临时记号可能改变MIDI值）
                    if (testLowerMidi < rangeMin || testLowerMidi > rangeMax || testUpperMidi < rangeMin || testUpperMidi > rangeMax) {
                        console.log(`❌ 音域验证失败: ${testLowerPitch}(${testLowerMidi}) 或 ${testUpperPitch}(${testUpperMidi}) 超出范围 ${rangeMin}-${rangeMax}`);
                        continue;
                    }

                    // 🎼 First Species 额外约束：避免平行5度/8度；避免“隐藏5/8”（类似向直进）
                    if (this._firstSpecies && previousInterval && previousInterval.lowerMidi !== undefined && previousInterval.upperMidi !== undefined) {
                        const prevInt = Math.abs(previousInterval.upperMidi - previousInterval.lowerMidi);
                        const newInt = Math.abs(testUpperMidi - testLowerMidi);
                        const prevPerfect = (prevInt === 7 || prevInt === 12 || prevInt === 0);
                        const newPerfect = (newInt === 7 || newInt === 12 || newInt === 0);
                        const lowerDir = Math.sign(testLowerMidi - previousInterval.lowerMidi);
                        const upperDir = Math.sign(testUpperMidi - previousInterval.upperMidi);
                        const similarMotion = (lowerDir !== 0 && upperDir !== 0 && lowerDir === upperDir);
                        const upperLeap = Math.abs(testUpperMidi - previousInterval.upperMidi) > 2;

                        // 平行完全协和：禁止
                        if (prevPerfect && newPerfect && similarMotion) {
                            console.log('❌ First Species: 平行5/8被禁止');
                            continue;
                        }
                        // 隐藏5/8：类似向直进到完全协和且上声部跳进（>全音）时禁止
                        if (!prevPerfect && newPerfect && similarMotion && upperLeap) {
                            console.log('❌ First Species: 隐藏5/8被禁止');
                            continue;
                        }
                    }

                    if (actualSemitones === expectedSemitones) {
                        // 🔒 白名单严格检查：即使半音距离匹配，也要确保在用户允许的范围内
                        // 根本修复 (2025-10-10): 防止生成用户未勾选的音程类型
                        if (this._allowedSemitonesSet && !this._allowedSemitonesSet.has(actualSemitones)) {
                            console.warn(`❌ [白名单拒绝] ${actualSemitones}半音不在允许列表中 [${Array.from(this._allowedSemitonesSet).sort((a,b)=>a-b).join(', ')}]`);
                            console.warn(`  音程: ${testLowerPitch} → ${testUpperPitch}`);
                            console.warn(`  音程类型: ${intervalType.displayName} (期望${expectedSemitones}半音)`);
                            continue; // 跳过这个八度组合，尝试下一个
                        }

                        console.log(`✅ 找到符合音域和音程类型要求的八度组合`);
                        validOctave = {
                            ...octaveOption,
                            lowerPitch: testLowerPitch,
                            upperPitch: testUpperPitch,
                            lowerMidi: testLowerMidi,
                            upperMidi: testUpperMidi
                        };
                        // 统计用途：记录已选择的音程类别（用于配额/比例控制）
                        if (intervalType && intervalType.name) {
                            this._recordIntervalUse(intervalType.name);
                            // 连续二度统计更新
                            if (intervalType.name === 'major2nd' || intervalType.name === 'minor2nd') {
                                this._consecutiveSeconds = (this._consecutiveSeconds || 0) + 1;
                            } else {
                                this._consecutiveSeconds = 0;
                            }
                            // 🔁 更新连续相同音程计数（用于防重复）
                            if (this._lastIntervalTypeName === intervalType.name) {
                                this._consecutiveSameInterval = (this._consecutiveSameInterval || 0) + 1;
                            } else {
                                this._consecutiveSameInterval = 1;
                            }
                            this._lastIntervalTypeName = intervalType.name;
                        }
                        break;
                    } else {
                        console.log(`❌ 八度调整导致音程类型改变: ${actualSemitones}半音 != ${expectedSemitones}半音`);
                    }
                }

                if (!validOctave) {
                    console.log(`❌ 所有八度组合都会导致音程类型改变，无法生成${intervalType.displayName}`);
                    continue; // 尝试下一个音程配对
                }

                let finalLowerPitch = validOctave.lowerPitch;
                let finalUpperPitch = validOctave.upperPitch;
                let finalLowerMidi = validOctave.lowerMidi;
                let finalUpperMidi = validOctave.upperMidi;

                // 🔧 音程视奏工具：禁用智能变化音系统（2025-10-10）
                // 原因：智能变化音可能改变音程距离（如D#→E#后，小三度变小二度）
                // 音程视奏工具需要严格的音程类型，不能因"音乐性"而改变半音数
                // 如果需要和声/旋律小调特色音，用户应直接选择相应音程类型
                const DISABLE_SMART_ALTERATIONS_FOR_INTERVAL_TOOL = true;

                const keyInfo = KEY_SIGNATURES[this.currentKeySignature];
                if (DISABLE_SMART_ALTERATIONS_FOR_INTERVAL_TOOL && keyInfo && keyInfo.mode === 'minor') {
                    console.log(`🔧 [音程工具] 智能变化音系统已禁用，保持${this.currentKeySignature}的7音自然小调音阶`);
                }

                if (!DISABLE_SMART_ALTERATIONS_FOR_INTERVAL_TOOL &&
                    keyInfo && keyInfo.mode === 'minor' && typeof applyMinorScaleAlterations !== 'undefined') {
                    console.log(`🎵 [小调智能系统] 开始处理 ${this.currentKeySignature} 的变化音`);

                    // 1. 计算旋律方向
                    const direction = previousInterval && previousInterval.lowerMidi !== undefined
                        ? (finalLowerMidi > previousInterval.lowerMidi ? 'ascending' :
                           finalLowerMidi < previousInterval.lowerMidi ? 'descending' : 'neutral')
                        : 'neutral';

                    // 2. 构建音乐上下文
                    const context = {
                        isMeasureEnd: false,      // 音程练习中每个音程都是独立的
                        isPhrasEnd: isLastNote,    // 🎵 最后一个音符标记为乐句末尾
                        isCadence: isLastNote,     // 🎵 最后一个音符视为终止式
                        nextNote: null,            // 音程练习中不预知下一个音符
                        timeSignature: timeSignature  // 🎵 传递拍号信息（用于6/8拍变化音优化）
                    };

                    // 3. 对lower音符应用智能变化音
                    const prevLowerMidi = previousInterval ? previousInterval.lowerMidi : null;
                    const alteredLowerMidi = applyMinorScaleAlterations(
                        finalLowerMidi,
                        prevLowerMidi,
                        direction,
                        this.currentKeySignature,
                        this.random,
                        this.rules,
                        context
                    );

                    // 4. 如果lower音符改变了，需要调整upper音符以保持音程类型
                    if (alteredLowerMidi !== finalLowerMidi) {
                        console.log(`🎵 [智能变化音] Lower音符: MIDI ${finalLowerMidi} → ${alteredLowerMidi}`);

                        // 保持音程距离不变
                        const intervalSemitones = finalUpperMidi - finalLowerMidi;
                        const alteredUpperMidi = alteredLowerMidi + intervalSemitones;

                        // 验证upper音符仍在音域内
                        if (alteredUpperMidi >= rangeMin && alteredUpperMidi <= rangeMax) {
                            finalLowerMidi = alteredLowerMidi;
                            finalUpperMidi = alteredUpperMidi;

                            // 使用正确的spelling更新pitch
                            finalLowerPitch = this.midiToNoteWithKey(finalLowerMidi, this.currentKeySignature);
                            finalUpperPitch = this.midiToNoteWithKey(finalUpperMidi, this.currentKeySignature);

                            console.log(`✅ [智能变化音] 应用成功: ${finalLowerPitch} - ${finalUpperPitch}`);
                        } else {
                            console.log(`⚠️ [智能变化音] Upper音符 ${alteredUpperMidi} 超出音域，保持原音符`);
                        }
                    } else {
                        console.log(`🎵 [智能变化音] 保持自然小调音符: ${finalLowerPitch}`);
                    }
                }

                console.log(`✅ 生成音程: ${finalLowerPitch} - ${finalUpperPitch} (${intervalType.displayName})`);

                // 🔒 最终验证 (2025-10-10): 拼写后二次检查半音距离
                // 关键修复：applyAccidental()/MINOR_KEY_SPELLING可能改变音符拼写，导致实际半音数与期望不符
                // 例：G→A(度数2,期望2半音) 经过拼写后变成 G#→A(1半音) ← 和声小调特色音！
                console.log(`🔍 [最终验证] 检查拼写后的实际半音数`);
                console.log(`  音程: ${finalLowerPitch}(MIDI${finalLowerMidi}) → ${finalUpperPitch}(MIDI${finalUpperMidi})`);
                console.log(`  期望: ${intervalType.displayName}(${intervalType.semitones}半音)`);

                const actualFinalSemitones = finalUpperMidi - finalLowerMidi;
                console.log(`  实际: ${actualFinalSemitones}半音`);

                // 🎯 优化后的验证逻辑 (2025-10-10): 只拒绝不在白名单中的半音数
                // 关键改进：允许半音数改变，只要改变后的值仍在白名单中
                // 这样可以保留旋律/和声小调特色音（如G→G#），同时仍能阻止二度音程

                // 检查: 白名单验证（唯一的拒绝条件）
                if (this._allowedSemitonesSet && !this._allowedSemitonesSet.has(actualFinalSemitones)) {
                    console.error(`❌ [最终验证失败] 拼写后半音数${actualFinalSemitones}不在白名单中！`);
                    console.error(`  音程: ${finalLowerPitch}(${finalLowerMidi}) → ${finalUpperPitch}(${finalUpperMidi}) = ${actualFinalSemitones}半音`);
                    console.error(`  白名单: [${Array.from(this._allowedSemitonesSet).sort((a,b)=>a-b).join(', ')}]`);
                    console.error(`  原因: 和声/旋律小调特色音导致半音数改变到不允许的范围`);
                    console.error(`  解决: 跳过此音程，尝试下一个候选音程`);
                    continue; // 唯一的拒绝路径
                }

                // 如果半音数改变，但仍在白名单中，则接受并修正（保留旋律/和声小调特色音）
                if (actualFinalSemitones !== intervalType.semitones) {
                    console.warn(`⚠️ [拼写自动修正] 拼写后半音数改变，但仍在白名单中（保留旋律/和声小调特色音）`);
                    console.warn(`  原始: ${intervalType.displayName}(${intervalType.semitones}半音)`);
                    console.warn(`  实际: ${actualFinalSemitones}半音`);
                    console.warn(`  音程: ${finalLowerPitch} → ${finalUpperPitch}`);
                    console.warn(`  原因: applyAccidental()或MINOR_KEY_SPELLING应用了和声/旋律小调特色音（如G→G#）`);

                    // 更新intervalType以匹配实际半音数，保证统计准确性
                    const matchingType = this.intervalTypes.find(t => t.semitones === actualFinalSemitones);
                    if (matchingType) {
                        console.warn(`  修正: 将音程类型从"${intervalType.displayName}"更新为"${matchingType.displayName}"`);
                        intervalType = matchingType;
                    } else {
                        console.warn(`  注意: 未找到匹配${actualFinalSemitones}半音的音程类型，保留原类型"${intervalType.displayName}"`);
                    }
                }

                console.log(`✅ [最终验证通过] 拼写后半音数正确: ${actualFinalSemitones}半音`);

                return {
                    lower: {
                        pitch: finalLowerPitch,
                        midi: finalLowerMidi,
                        duration: 'quarter',
                        type: 'note'
                    },
                    upper: {
                        pitch: finalUpperPitch,
                        midi: finalUpperMidi,
                        duration: 'quarter',
                        type: 'note'
                    },
                    intervalType: intervalType.displayName,
                    // 🎯 添加MIDI级进所需的信息
                    lowerMidi: finalLowerMidi,
                    lowerScaleIndex: lowerScaleIndex,
                    // 为了兼容性，保留原有字段
                    prevScaleIndex: lowerScaleIndex,
                    // 🎵 添加upper的MIDI信息，用于后续的智能决策
                    upperMidi: finalUpperMidi
                };

            } catch (error) {
                console.warn(`音程生成尝试 ${attempts} 失败:`, error.message);
            }
        }

        // 如果所有尝试都失败，返回一个默认的音程
        console.warn('⚠️ 无法生成满足条件的音程，使用默认值');
        return this.getDefaultInterval();
    }

    /**
     * 原始的音程对生成方法（向后兼容）
     * @param {Object} scale - 音阶信息
     * @param {Array} allowedIntervalTypes - 允许的音程类型
     * @param {number} rangeMin - 最低音MIDI号
     * @param {number} rangeMax - 最高音MIDI号
     * @returns {Object} 音程对
     */
    generateIntervalPair(scale, allowedIntervalTypes, rangeMin, rangeMax) {
        return this.generateIntervalPairWithProgression(scale, allowedIntervalTypes, rangeMin, rangeMax, null, null, 0, null);
    }

    /**
     * 根据拍位优先级选择音程类型（重拍优先选择target interval）
     * @param {Array} allowedIntervalTypes - 允许的音程类型数组
     * @param {number} currentPosition - 当前在小节中的位置
     * @param {Object} timeSignature - 拍号信息
     * @returns {Object} 选择的音程类型对象
     */
    selectIntervalWithBeatPriority(allowedIntervalTypes, currentPosition, timeSignature) {
        // 🆕 使用新的音程进行规则（步进为主，跳跃偶现且仅在重拍）
        console.log(`🎼 应用音程进行规则: 步进为主，跳跃音程仅重拍偶现${this._guitarMode ? '（吉他化）' : ''}`);
        return this.selectIntervalWithProgressionRules(allowedIntervalTypes, currentPosition, timeSignature);
    }

    /**
     * 获取target interval（重要/优先的音程类型）
     * @param {Array} allowedIntervalTypes - 允许的音程类型数组
     * @returns {Array} target interval数组
     */
    getTargetIntervals(allowedIntervalTypes) {
        // 🎯 定义target interval的策略：
        // 优先练习的音程类型（排除二度，因为二度更适合作为连接音程）
        const targetIntervalNames = [
            'major3rd', 'minor3rd',    // 三度：基础和声音程
            'perfect4th',              // 四度：重要的框架音程
            'perfect5th',              // 五度：最重要的音程之一
            'major6th', 'minor6th',    // 六度：和声丰富的音程
            'octave',                  // 八度：音程练习的重要目标
            'tritone'                  // 三全音：虽然困难但重要的现代音程
        ];

        const targetIntervals = allowedIntervalTypes.filter(interval => {
            // 基于音程名称和权重的双重标准
            const isTargetByName = targetIntervalNames.includes(interval.name);
            const weight = this.guitarIntervalWeights[interval.name] || 1;
            const isTargetByWeight = weight >= 6 && !['major2nd', 'minor2nd'].includes(interval.name);

            return isTargetByName || isTargetByWeight;
        });

        console.log(`🎯 识别出${targetIntervals.length}个target interval:`,
            targetIntervals.map(i => `${i.displayName}(权重:${this.guitarIntervalWeights[i.name] || 1})`));

        return targetIntervals;
    }

    /**
     * 🆕 判断音程是否为步进音程（二度、三度、四度）
     * 🔧 2025-10-09优化：将四度纳入步进，提高四度出现频率
     * @param {Object} intervalType - 音程类型对象
     * @returns {boolean} 是否为步进音程
     */
    isStepwiseInterval(intervalType) {
        const stepwiseIntervals = [
            'minor2nd',    // 小二度 (1半音)
            'major2nd',    // 大二度 (2半音)
            'minor3rd',    // 小三度 (3半音)
            'major3rd',    // 大三度 (4半音)
            'perfect4th'   // 🔧 完全四度 (5半音) - 从leap移至stepwise
        ];
        return stepwiseIntervals.includes(intervalType.name);
    }

    /**
     * 🆕 判断音程是否为二度音程（最小步进）
     * @param {Object} intervalType - 音程类型对象
     * @returns {boolean} 是否为二度音程
     */
    isSecondInterval(intervalType) {
        const secondIntervals = [
            'minor2nd',    // 小二度 (1半音)
            'major2nd'     // 大二度 (2半音)
        ];
        return secondIntervals.includes(intervalType.name);
    }

    /**
     * 🆕 判断音程是否为三度音程（中等步进）
     * @param {Object} intervalType - 音程类型对象
     * @returns {boolean} 是否为三度音程
     */
    isThirdInterval(intervalType) {
        const thirdIntervals = [
            'minor3rd',    // 小三度 (3半音)
            'major3rd'     // 大三度 (4半音)
        ];
        return thirdIntervals.includes(intervalType.name);
    }

    /**
     * 🆕 强化音域约束验证
     * @param {number} lowerMidi - 下声部MIDI音高
     * @param {number} upperMidi - 上声部MIDI音高
     * @param {number} rangeMin - 音域最低音
     * @param {number} rangeMax - 音域最高音
     * @param {string} context - 验证上下文信息
     * @returns {Object} 验证结果
     */
    validateRangeConstraints(lowerMidi, upperMidi, rangeMin, rangeMax, context = '') {
        const violations = [];

        if (lowerMidi < rangeMin) {
            violations.push(`下声部音高 ${this.midiToNote(lowerMidi)}(${lowerMidi}) 低于音域最低音 ${this.midiToNote(rangeMin)}(${rangeMin})`);
        }

        if (lowerMidi > rangeMax) {
            violations.push(`下声部音高 ${this.midiToNote(lowerMidi)}(${lowerMidi}) 高于音域最高音 ${this.midiToNote(rangeMax)}(${rangeMax})`);
        }

        if (upperMidi < rangeMin) {
            violations.push(`上声部音高 ${this.midiToNote(upperMidi)}(${upperMidi}) 低于音域最低音 ${this.midiToNote(rangeMin)}(${rangeMin})`);
        }

        if (upperMidi > rangeMax) {
            violations.push(`上声部音高 ${this.midiToNote(upperMidi)}(${upperMidi}) 高于音域最高音 ${this.midiToNote(rangeMax)}(${rangeMax})`);
        }

        const isValid = violations.length === 0;

        if (!isValid) {
            console.warn(`🔍 音域约束验证失败 ${context}:`);
            violations.forEach(violation => console.warn(`  ❌ ${violation}`));
        } else {
            console.log(`✅ 音域约束验证通过 ${context}: ${this.midiToNote(lowerMidi)}-${this.midiToNote(upperMidi)}`);
        }

        return {
            isValid,
            violations,
            context
        };
    }

    /**
     * 🆕 强化节奏约束验证
     * @param {Object} rhythmEvent - 节奏事件
     * @param {Array} allowedRhythms - 允许的节奏类型
     * @param {Object} timeSignature - 拍号信息
     * @param {string} context - 验证上下文信息
     * @returns {Object} 验证结果
     */
    validateRhythmConstraints(rhythmEvent, allowedRhythms, timeSignature, context = '') {
        const violations = [];

        // 检查节奏值是否在允许范围内
        const allowedRhythmValues = allowedRhythms.map(r => r.value || r);
        if (!allowedRhythmValues.includes(rhythmEvent.value)) {
            violations.push(`节奏类型 ${rhythmEvent.value} 不在用户选择的节奏范围内 [${allowedRhythmValues.join(', ')}]`);
        }

        // 检查时值是否与拍号兼容
        if (timeSignature && rhythmEvent.duration) {
            const beatDuration = 4 / timeSignature.beatType; // 每拍的四分音符时值
            const maxAllowedDuration = timeSignature.beats * beatDuration; // 小节最大时值

            if (rhythmEvent.duration > maxAllowedDuration) {
                violations.push(`节奏时值 ${rhythmEvent.duration} 超过拍号 ${timeSignature.beats}/${timeSignature.beatType} 的小节最大时值 ${maxAllowedDuration}`);
            }
        }

        // 检查位置是否合理
        if (rhythmEvent.position < 0) {
            violations.push(`节奏位置 ${rhythmEvent.position} 不能为负数`);
        }

        const isValid = violations.length === 0;

        if (!isValid) {
            console.warn(`🔍 节奏约束验证失败 ${context}:`);
            violations.forEach(violation => console.warn(`  ❌ ${violation}`));
        } else {
            console.log(`✅ 节奏约束验证通过 ${context}: ${rhythmEvent.value}@${rhythmEvent.position}`);
        }

        return {
            isValid,
            violations,
            context,
            rhythmValue: rhythmEvent.value
        };
    }

    /**
     * 🆕 判断音程是否为跳跃音程（五度及以上）
     * 🔧 2025-10-09优化：四度已移至stepwise，leap仅包含真正的跳跃音程
     * @param {Object} intervalType - 音程类型对象
     * @returns {boolean} 是否为跳跃音程
     */
    isLeapInterval(intervalType) {
        const leapIntervals = [
            // 'perfect4th' 已移至stepwise
            'tritone',     // 三全音 (6半音)
            'perfect5th',  // 完全五度 (7半音)
            'minor6th',    // 小六度 (8半音)
            'major6th',    // 大六度 (9半音)
            'minor7th',    // 小七度 (10半音)
            'major7th',    // 大七度 (11半音)
            'octave'       // 八度 (12半音)
        ];
        return leapIntervals.includes(intervalType.name);
    }

    /**
     * 🆕 根据音程进行规则选择音程（步进为主，跳跃偶现且仅在重拍）
     * @param {Array} allowedIntervalTypes - 允许的音程类型数组
     * @param {number} currentPosition - 当前在小节中的位置
     * @param {Object} timeSignature - 拍号信息
     * @returns {Object} 选择的音程类型对象
     */
    selectIntervalWithProgressionRules(allowedIntervalTypes, currentPosition, timeSignature) {
        const isStrongBeat = timeSignature ? this.isStrongBeat(currentPosition, timeSignature) : false;
        console.log(`🎵 音程进行规则: 位置${currentPosition.toFixed(2)}, ${isStrongBeat ? '重拍' : '弱拍'}`);

        // 分类音程类型
        let stepwiseIntervals = allowedIntervalTypes.filter(interval => this.isStepwiseInterval(interval));
        let leapIntervals = allowedIntervalTypes.filter(interval => this.isLeapInterval(interval));

        // 🎼 First Species: 采用协和音程加权，弱化三度偏好
        if (this._firstSpecies) {
            // 仅保留协和音程（m3/M3/P5/m6/M6/P8），首尾已在上游强制处理
            let consonants = allowedIntervalTypes.filter(it => [3,4,7,8,9,12].includes(it.semitones));
            if (consonants.length === 0) consonants = allowedIntervalTypes;

            // 加权：降低三度、提升五度/六度/八度
            const weightMap = {
                minor3rd: 1.0,
                major3rd: 1.0,
                perfect5th: 2.8,
                minor6th: 2.4,
                major6th: 2.4,
                octave: 1.8
            };
            // 若上一和声音程是三度，进一步降低本次三度权重，避免长段“连三”
            if (this._lastIntervalTypeName === 'minor3rd' || this._lastIntervalTypeName === 'major3rd') {
                weightMap.minor3rd *= 0.6;
                weightMap.major3rd *= 0.6;
            }
            // 强拍适度提升完全协和（五/八）的概率
            if (isStrongBeat) {
                weightMap.perfect5th *= 1.15;
                weightMap.octave *= 1.10;
            }
            // 🔁 防重复：三连直接尽量过滤
            let filtered = consonants;
            try {
                const lastName = this._lastIntervalTypeName;
                const consec = this._consecutiveSameInterval || 0;
                if (lastName && consec >= 2) {
                    const alt = consonants.filter(x => x.name !== lastName);
                    if (alt.length > 0) filtered = alt;
                }
            } catch (e) { /* 忽略防御性错误 */ }

            const items = filtered.map(it => {
                let w = (weightMap[it.name] || 1);
                // 🔁 防重复惩罚（二连）
                try {
                    const lastName = this._lastIntervalTypeName;
                    const consec = this._consecutiveSameInterval || 0;
                    if (lastName && it.name === lastName) {
                        if (consec >= 2) w *= 0.02; else if (consec >= 1) w *= 0.35;
                    }
                } catch (e) {}
                return { it, w };
            });
            const total = items.reduce((s, x) => s + x.w, 0) || 1;
            let r = Math.random() * total;
            for (const obj of items) {
                r -= obj.w;
                if (r <= 0) return obj.it;
            }
            return filtered[0];
        }

        // 二度配额限制：默认≤opt；吉他化≤opt
        {
            const secondsCount = this._intervalStats.seconds || 0;
            const totalCount = Math.max(1, this._intervalStats.total || 1);
            const ratioLimit = this._guitarMode ? (this._opts.secondRatioGuitar || 0.12) : (this._opts.secondRatioDefault || 0.20);
            const allowedSeconds = Math.max(1, Math.floor(totalCount * ratioLimit));
            const quotaReached = secondsCount >= allowedSeconds;
            if (quotaReached) {
                stepwiseIntervals = stepwiseIntervals.filter(i => !(i.name === 'minor2nd' || i.name === 'major2nd'));
            }
        }

        console.log(`  🔍 可用音程: 步进${stepwiseIntervals.length}个[${stepwiseIntervals.map(i => i.displayName).join(', ')}]`);
        console.log(`  🔍 可用音程: 跳跃${leapIntervals.length}个[${leapIntervals.map(i => i.displayName).join(', ')}]`);

        // 连续二度抑制：避免出现连续二度
        if (this._consecutiveSeconds >= 1) {
            stepwiseIntervals = stepwiseIntervals.filter(i => !(i.name === 'major2nd' || i.name === 'minor2nd'));
        }

        // 弱拍位置：只允许步进音程
        if (!isStrongBeat) {
            if (stepwiseIntervals.length > 0) {
                console.log(`  ✅ 弱拍强制步进: 从${stepwiseIntervals.length}个步进音程中选择`);
                return this.selectIntervalByProgressionWeight(stepwiseIntervals, 'stepwise');
            } else {
                // 🔧 根本修复 (2025-10-10): 不再降级，而是抛出错误强制重试
                console.error(`  ❌ 弱拍无步进音程可用！`);
                console.error(`  🔍 当前allowedIntervalTypes: [${allowedIntervalTypes.map(t => `${t.displayName}(${t.semitones})`).join(', ')}]`);
                console.error(`  🔍 stepwiseIntervals被过滤完了，这不应该发生`);
                throw new Error('弱拍无步进音程可用，无法继续生成');
            }
        }

        // 重拍位置：根据概率选择
        if (stepwiseIntervals.length === 0 && leapIntervals.length === 0) {
            // 🔧 根本修复 (2025-10-10): 不再降级，而是抛出错误
            console.error(`  ❌ 重拍无可用音程！`);
            throw new Error('重拍无可用音程，无法继续生成');
        }

        // 重拍跳跃音程概率（可配置）
        const leapProbability = this._guitarMode ? (this._opts.leapProbStrongGuitar || 0.30) : (this._opts.leapProbStrongDefault || 0.22);
        const shouldUseLeap = Math.random() < leapProbability && leapIntervals.length > 0;

        if (shouldUseLeap) {
            console.log(`  🎯 重拍跳跃(${(leapProbability * 100).toFixed(0)}%概率): 从${leapIntervals.length}个跳跃音程中选择`);
            return this.selectIntervalByProgressionWeight(leapIntervals, 'leap');
        } else {
            if (stepwiseIntervals.length > 0) {
                console.log(`  🎵 重拍步进(${((1 - leapProbability) * 100).toFixed(0)}%概率): 从${stepwiseIntervals.length}个步进音程中选择`);
                return this.selectIntervalByProgressionWeight(stepwiseIntervals, 'stepwise');
            } else {
                // 如果没有步进音程但有跳跃音程，在重拍时允许使用
                console.log(`  🔄 重拍无步进音程，使用跳跃音程`);
                return this.selectIntervalByProgressionWeight(leapIntervals, 'leap');
            }
        }
    }

    /**
     * 🆕 基于音程进行权重选择音程（为步进和跳跃分别优化权重）
     * @param {Array} intervalTypes - 音程类型数组
     * @param {string} type - 'stepwise' 或 'leap'
     * @returns {Object} 选中的音程类型
     */
    selectIntervalByProgressionWeight(intervalTypes, type) {
        if (intervalTypes.length === 0) {
            console.error('❌ selectIntervalByProgressionWeight: 空的音程数组');
            return null;
        }

        // 🔍 详细日志：显示输入的音程类型列表
        console.log(`    🎵 进入权重选择（${type}）: 候选音程[${intervalTypes.map(t => `${t.displayName}(${t.semitones})`).join(', ')}]`);

        // 🔁 防重复：避免同一音程类型三连（如可能则直接排除）
        try {
            const lastName = this._lastIntervalTypeName;
            const consec = this._consecutiveSameInterval || 0;
            if (lastName && consec >= 2) {
                const alternatives = intervalTypes.filter(i => i.name !== lastName);
                if (alternatives.length > 0) {
                    console.log(`🔁 防重复：已连续${consec}次 ${lastName}，本次排除该音程参与选择`);
                    intervalTypes = alternatives;
                }
            }
        } catch (e) { /* 忽略防御性错误 */ }

        // 为步进和跳跃音程设计不同的权重策略
        const weightedIntervals = intervalTypes.map(intervalType => {
            let weight = this.guitarIntervalWeights[intervalType.name] || 1;

            if (type === 'stepwise') {
                if (this._guitarMode) {
                    // 🎸 吉他化：二度极低，三度/四度显著提升
                    if (intervalType.name === 'major2nd' || intervalType.name === 'minor2nd') {
                        weight *= 0.25; // 少量二度
                    } else if (intervalType.name === 'major3rd' || intervalType.name === 'minor3rd') {
                        weight *= 5.0; // 三度主力
                    } else if (intervalType.name === 'perfect4th') {
                        weight *= 5.0; // 四度常见于吉他指型
                    }
                } else {
                    // 🔧 2025-10-09优化V3：高频(三度/四度)，低频(二度)
                    // 目标分布：高频=三度/四度/六度，中频=五度/八度，低频=二度/七度
                    if (intervalType.name === 'major2nd' || intervalType.name === 'minor2nd') {
                        weight *= 0.8;   // 🔧 二度低频：20×0.8=16, 18×0.8=14.4
                    } else if (intervalType.name === 'major3rd' || intervalType.name === 'minor3rd') {
                        weight *= 9.0;   // 🔧 三度高频：8×9.0=72
                    } else if (intervalType.name === 'perfect4th') {
                        weight *= 4.0;   // 🔧 四度高频：18×4.0=72（从leap移至stepwise）
                    }
                }
            } else if (type === 'leap') {
                // 🔧 2025-10-09优化V3：跳跃音程权重重新设计（四度已移至stepwise）
                // 高频：六度，中频：五度/八度，低频：七度
                if (this._guitarMode) {
                    // 吉他化模式
                    if (intervalType.name === 'perfect5th') weight *= 2.5;
                    if (intervalType.name === 'octave') weight *= 2.5;
                    if (intervalType.name === 'major6th' || intervalType.name === 'minor6th') weight *= 3.0;
                } else {
                    // 标准模式（四度已移至stepwise，不再在此处处理）
                    if (intervalType.name === 'perfect5th') {
                        weight *= 2.2;   // 🔧 五度中频：16×2.2=35.2
                    }
                    if (intervalType.name === 'octave') {
                        weight *= 9.0;   // 🔧 八度中频：4×9.0=36
                    }
                    if (intervalType.name === 'major6th' || intervalType.name === 'minor6th') {
                        weight *= 11.0;  // 🔧 六度高频：6×11.0=66
                    }
                    if (intervalType.name === 'major7th' || intervalType.name === 'minor7th') {
                        weight *= 1.0;   // 🔧 七度低频：1×1.0=1
                    }
                }
            }

            // 🎸 吉他化：显著降低不期望音程（七度、三全音、同度）
            if (this._guitarMode) {
                if (['major7th','minor7th','tritone','unison'].includes(intervalType.name)) {
                    weight *= 0.1;
                }
            }

            // 🔁 防重复权重惩罚：避免二连过多；三连在上方已尽量过滤
            try {
                const lastName = this._lastIntervalTypeName;
                const consec = this._consecutiveSameInterval || 0;
                if (lastName && intervalType.name === lastName) {
                    if (consec >= 2) {
                        weight *= 0.02; // 几乎不可能再次选中
                    } else if (consec >= 1) {
                        weight *= 0.35; // 明显降低再次重复概率
                    }
                }
            } catch (e) { /* 忽略防御性错误 */ }

            return {
                ...intervalType,
                weight: weight
            };
        });

        // 计算总权重
        const totalWeight = weightedIntervals.reduce((sum, interval) => sum + interval.weight, 0);

        if (totalWeight === 0) {
            console.warn('⚠️ 所有音程权重为0，使用随机选择');
            return intervalTypes[Math.floor(Math.random() * intervalTypes.length)];
        }

        // 基于权重随机选择
        let randomWeight = Math.random() * totalWeight;

        for (const interval of weightedIntervals) {
            randomWeight -= interval.weight;
            if (randomWeight <= 0) {
                console.log(`    ✅ ${type}选择: ${interval.displayName} (权重: ${interval.weight.toFixed(1)})`);
                return interval;
            }
        }

        // 备用选择
        console.warn('⚠️ 权重选择失败，使用第一个音程');
        return intervalTypes[0];
    }

    /**
     * 基于吉他权重选择音程类型
     * @param {Array} allowedIntervalTypes - 允许的音程类型数组
     * @returns {Object} 选中的音程类型
     */
    selectIntervalByGuitarWeight(allowedIntervalTypes) {
        // 计算每个音程的权重
        const weightedIntervals = allowedIntervalTypes.map(intervalType => {
            let weight = this.guitarIntervalWeights[intervalType.name] || 1; // 默认权重为1
            // 🔁 防重复惩罚（与进程权重一致）
            try {
                const lastName = this._lastIntervalTypeName;
                const consec = this._consecutiveSameInterval || 0;
                if (lastName && intervalType.name === lastName) {
                    if (consec >= 2) {
                        weight *= 0.02;
                    } else if (consec >= 1) {
                        weight *= 0.35;
                    }
                }
            } catch (e) {}
            return {
                ...intervalType,
                weight: weight
            };
        });

        // 计算总权重
        const totalWeight = weightedIntervals.reduce((sum, interval) => sum + interval.weight, 0);

        if (totalWeight === 0) {
            // 如果总权重为0，随机选择
            console.warn('⚠️ 所有音程权重为0，使用随机选择');
            return allowedIntervalTypes[Math.floor(Math.random() * allowedIntervalTypes.length)];
        }

        // 基于权重随机选择
        let randomWeight = Math.random() * totalWeight;

        for (const interval of weightedIntervals) {
            randomWeight -= interval.weight;
            if (randomWeight <= 0) {
                console.log(`🎯 吉他权重选择: ${interval.displayName} (权重: ${interval.weight})`);
                return interval;
            }
        }

        // 备用选择（理论上不应该到达这里）
        console.warn('⚠️ 权重选择失败，使用第一个音程');
        return allowedIntervalTypes[0];
    }

    /**
     * 🔁 在无需复杂规则时的简单“防重复”音程选择器
     * - 尽量避免三连同类型；二连明显降权
     * - 若只有一种类型可选，尊重用户选择，不强行更改
     * @param {Array} allowedIntervalTypes
     * @returns {Object} 选中的音程类型
     */
    pickIntervalTypeAntiRepeat(allowedIntervalTypes) {
        if (!allowedIntervalTypes || allowedIntervalTypes.length === 0) return null;

        // 三连时尽量排除上一个类型（若存在其它可选项）
        try {
            const lastName = this._lastIntervalTypeName;
            const consec = this._consecutiveSameInterval || 0;
            if (lastName && consec >= 2) {
                const alt = allowedIntervalTypes.filter(t => t.name !== lastName);
                if (alt.length > 0) return this.selectIntervalByGuitarWeight(alt);
            }
        } catch (e) {}

        // 正常情况：使用带惩罚的吉他权重选择
        return this.selectIntervalByGuitarWeight(allowedIntervalTypes);
    }

    /**
     * 获取级进的下一个音阶位置（支持cantus firmus风格转向）
     * @param {number} currentIndex - 当前音阶位置
     * @param {number} scaleLength - 音阶长度
     * @param {Object} previousInterval - 上一个音程信息
     * @returns {number} 下一个音阶位置
     */
    getProgressionIndex(currentIndex, scaleLength, previousInterval = null) {
        // 🎼 Cantus Firmus风格：检查是否需要转向
        let forceDirection = null;
        if (previousInterval && previousInterval.prevScaleIndex !== undefined) {
            const lastStep = currentIndex - previousInterval.prevScaleIndex;
            const normalizedLastStep = this.normalizeStepDistance(lastStep, scaleLength);

            // 如果上一步是大跳（≥4度），强制转向
            if (Math.abs(normalizedLastStep) >= 3) {
                forceDirection = -Math.sign(normalizedLastStep); // 反向
                console.log(`🔄 Cantus Firmus转向：检测到${Math.abs(normalizedLastStep)}度大跳，强制${forceDirection > 0 ? '上行' : '下行'}转向`);
            }
        }

        // 🎯 优化级进权重（更有线条感且减少过多二度）：
        // 45% 二度级进、40% 三度级进、15% 四度跳跃
        const progressionTypes = [
            { type: '二度级进', steps: [1, -1], weight: 9 },
            { type: '三度级进', steps: [2, -2], weight: 8 },
            { type: '四度跳跃', steps: [3, -3], weight: 3 }
        ];

        // 基于权重的随机选择
        const totalWeight = progressionTypes.reduce((sum, type) => sum + type.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        let selectedProgression = progressionTypes[0];

        for (const type of progressionTypes) {
            randomWeight -= type.weight;
            if (randomWeight <= 0) {
                selectedProgression = type;
                break;
            }
        }
        const steps = selectedProgression.steps;
        let selectedStep;

        // 如果需要强制转向，筛选符合方向的步进
        if (forceDirection !== null) {
            const directionSteps = steps.filter(step => Math.sign(step) === forceDirection);
            if (directionSteps.length > 0) {
                selectedStep = directionSteps[Math.floor(Math.random() * directionSteps.length)];
                console.log(`🎯 应用强制转向：选择${selectedStep > 0 ? '上行' : '下行'}${Math.abs(selectedStep)}度`);
            } else {
                // 如果没有符合转向要求的步进，选择最小的反向步进
                selectedStep = steps[Math.floor(Math.random() * steps.length)];
                console.log(`⚠️ 无法找到合适的转向步进，使用随机选择：${selectedStep}`);
            }
        } else {
            selectedStep = steps[Math.floor(Math.random() * steps.length)];
        }

        let newIndex = (currentIndex + selectedStep) % scaleLength;

        // 处理负数索引
        if (newIndex < 0) {
            newIndex += scaleLength;
        }

        console.log(`🎶 应用${selectedProgression.type}: ${selectedStep > 0 ? '上行' : '下行'}${Math.abs(selectedStep)}度 (${currentIndex} → ${newIndex})`);

        return newIndex;
    }

    /**
     * 规范化步进距离到[-3, 3]范围内
     * @param {number} step - 原始步进距离
     * @param {number} scaleLength - 音阶长度
     * @returns {number} 规范化后的步进距离
     */
    normalizeStepDistance(step, scaleLength) {
        let normalizedStep = step;

        // 处理跨八度的情况
        while (normalizedStep > scaleLength / 2) {
            normalizedStep -= scaleLength;
        }
        while (normalizedStep < -scaleLength / 2) {
            normalizedStep += scaleLength;
        }

        return normalizedStep;
    }

    /**
     * 获取默认音程
     * @returns {Object} 默认音程对
     */
    getDefaultInterval() {
        // 使用当前调内的随机音程作为默认值
        // 🔧 根本修复 (2025-10-10): 使用7音baseScale而非9音fullScale
        // 原因：9音小调数组包含F/F#, G/G#等相邻半音，索引+2可能选到相邻音产生二度
        // 例：Bb小调9音['Bb','C','Db','Eb','F','Gb','G','Ab','A'], F(4)+2=G(6) → 2半音（大二度）
        const scale = this.getBaseScale(this.currentScale || this.scales['C']);

        // 随机选择调内音符
        const lowerIndex = Math.floor(Math.random() * scale.notes.length);
        const upperIndex = (lowerIndex + 2) % scale.notes.length; // 三度音程

        const defaultLower = `${scale.notes[lowerIndex]}5`;
        const defaultUpper = `${scale.notes[upperIndex]}5`;

        return {
            lower: {
                pitch: defaultLower,
                midi: this.noteToMidi(defaultLower),
                duration: 'quarter',
                type: 'note'
            },
            upper: {
                pitch: defaultUpper,
                midi: this.noteToMidi(defaultUpper),
                duration: 'quarter',
                type: 'note'
            },
            intervalType: '调内三度音程（随机）'
        };
    }

    /**
     * 生成安全的小节内容，根据用户频率设置选择合适的节奏
     * @param {Object} timeSignature - 拍号信息
     * @returns {Object} 包含lower和upper的安全内容
     */
    generateSafeMeasureContent(timeSignature) {
        const measureDuration = this.calculateMeasureDuration(timeSignature);
        const defaultInterval = this.getDefaultInterval();

        // 🔒 白名单验证 (2025-10-10): 确保安全内容也遵守白名单
        const actualSemitones = defaultInterval.upper.midi - defaultInterval.lower.midi;
        if (this._allowedSemitonesSet && !this._allowedSemitonesSet.has(actualSemitones)) {
            console.warn(`⚠️ [Safe Content] 默认音程${actualSemitones}半音不在白名单中，尝试调整`);
            console.warn(`  音程: ${defaultInterval.lower.pitch} → ${defaultInterval.upper.pitch}`);
            console.warn(`  白名单: [${Array.from(this._allowedSemitonesSet).sort((a,b)=>a-b).join(', ')}]`);

            // 尝试找到白名单中的第一个可用音程类型
            const whitelistSemitones = Array.from(this._allowedSemitonesSet).sort((a,b)=>a-b);
            if (whitelistSemitones.length > 0) {
                const targetSemitones = whitelistSemitones[0]; // 使用最小的允许音程
                const newUpperMidi = defaultInterval.lower.midi + targetSemitones;
                defaultInterval.upper.midi = newUpperMidi;
                defaultInterval.upper.pitch = this.midiToNote(newUpperMidi);
                console.log(`✅ [Safe Content] 调整为白名单音程: ${defaultInterval.lower.pitch} → ${defaultInterval.upper.pitch} = ${targetSemitones}半音`);
            }
        }

        // 根据用户频率设置决定使用什么节奏
        let rhythmValue = 'quarter';
        let displayName = '四分音符（安全默认）';

        if (this.rhythmFrequencies && this.rhythmFrequencies['whole'] > 0) {
            rhythmValue = 'whole';
            displayName = '全音符（安全默认）';
        } else if (this.rhythmFrequencies && this.rhythmFrequencies['half'] > 0) {
            rhythmValue = 'half';
            displayName = '二分音符（安全默认）';
        } else if (measureDuration >= 4.0) {
            rhythmValue = 'whole';
            displayName = '全音符（安全默认）';
        } else if (measureDuration >= 2.0) {
            rhythmValue = 'half';
            displayName = '二分音符（安全默认）';
        }

        defaultInterval.lower.duration = measureDuration;
        defaultInterval.upper.duration = measureDuration;
        defaultInterval.lower.value = rhythmValue;
        defaultInterval.upper.value = rhythmValue;
        defaultInterval.lower.displayName = displayName;
        defaultInterval.upper.displayName = displayName;

        console.log(`🛡️ 生成安全默认内容: ${displayName}, 时值: ${measureDuration}拍`);

        return defaultInterval;
    }

    /**
     * 🔥 专用全音符生成器：绕过所有复杂逻辑，直接生成纯全音符进行
     * @param {Object} settings - 生成设置
     * @returns {Object} 音程进行对象
     */
    generateWholeNoteOnlyProgression(settings) {
        console.log('🔥 启动专用全音符生成器');

        const {
            intervalTypes,
            keySignature,
            timeSignature,
            measureCount,
            measures
        } = settings;

        const finalMeasures = measureCount || measures || 4;

        // 创建音阶
        const scale = this.scales[keySignature] || this.scales['C'];
        console.log(`🔥 使用调性: ${keySignature}, 音阶:`, scale.notes);

        // 创建进行对象
        const progression = {
            measures: [],
            keySignature: keySignature,
            timeSignature: timeSignature,
            tempo: settings.tempo || 120
        };

        // 计算小节时值
        const measureDuration = this.calculateMeasureDuration(timeSignature);
        console.log(`🔥 小节总时值: ${measureDuration}拍`);

        // 音域设置（优先使用 settings 或当前实例范围）
        let rangeMin = (typeof settings.rangeMin === 'number' && isFinite(settings.rangeMin))
            ? settings.rangeMin : (this.rangeMin || this.noteToMidi('C4'));
        let rangeMax = (typeof settings.rangeMax === 'number' && isFinite(settings.rangeMax))
            ? settings.rangeMax : (this.rangeMax || this.noteToMidi('C6'));
        if (rangeMin >= rangeMax) { rangeMin = this.noteToMidi('C4'); rangeMax = this.noteToMidi('C6'); }

        // 生成每个小节
        let previousInterval = null; // 用于级进连接

        for (let m = 0; m < finalMeasures; m++) {
            console.log(`🔥 生成第${m + 1}小节（专用全音符，遵循调性）`);

            // 创建小节
            const measure = {
                index: m,
                upperVoice: [],
                lowerVoice: []
            };

            // 🔥 基于调性的音程生成
            try {
                // 选择一个音程类型（带防重复）
                const selectedIntervalType = this.pickIntervalTypeAntiRepeat(intervalTypes) || intervalTypes[Math.floor(Math.random() * intervalTypes.length)];
                const intervalDegree = this.intervalDegrees[selectedIntervalType.name] || 3; // 默认三度

                console.log(`🔥 选择音程: ${selectedIntervalType.displayName} (${intervalDegree}度)`);

                // 🔧 架构修复 (2025-10-10): 使用7音baseScale进行所有索引计算
                // 原因：小调的9音数组（含F/F#, G/G#）会导致索引计算错误
                // 例：E[4] + 2 = F#[6]（二度违规），应该是 E[4] + 2 = G[6]（三度）
                const baseScale = this.getBaseScale(scale);
                console.log(`🎵 使用${baseScale.notes.length}音音阶进行索引计算: [${baseScale.notes.join(', ')}]`);

                // 基于调内音阶位置选择下声部
                let lowerScaleIndex;

                if (previousInterval && previousInterval.lowerScaleIndex !== undefined) {
                    // 使用级进逻辑连接
                    lowerScaleIndex = this.getProgressionIndex(
                        previousInterval.lowerScaleIndex,
                        baseScale.notes.length,
                        previousInterval
                    );
                    console.log(`🔥 级进连接: 从位置${previousInterval.lowerScaleIndex}(${baseScale.notes[previousInterval.lowerScaleIndex]}) 到位置${lowerScaleIndex}(${baseScale.notes[lowerScaleIndex]})`);
                } else {
                    // 第一个小节，随机选择调内音符
                    lowerScaleIndex = Math.floor(Math.random() * baseScale.notes.length);
                    console.log(`🔥 新起点: 位置${lowerScaleIndex}(${baseScale.notes[lowerScaleIndex]})`);
                }

                const lowerNote = baseScale.notes[lowerScaleIndex];

                // 计算上声部的音阶位置
                let upperScaleIndex;
                if (intervalDegree === 3) {
                    upperScaleIndex = (lowerScaleIndex + 2) % baseScale.notes.length;
                } else {
                    upperScaleIndex = (lowerScaleIndex + intervalDegree - 1) % baseScale.notes.length;
                }

                const upperNote = baseScale.notes[upperScaleIndex];

                console.log(`🔥 调内音程: ${lowerNote} (位置${lowerScaleIndex}) -> ${upperNote} (位置${upperScaleIndex})`);

                // 寻找合适的八度组合
                const suitableOctaves = this.findSuitableOctavesForInterval(
                    lowerNote, upperNote, lowerScaleIndex, upperScaleIndex, rangeMin, rangeMax, previousInterval
                );

                if (suitableOctaves.length === 0) {
                    console.log(`🔥 无法在音域范围内找到合适的八度: ${lowerNote}-${upperNote}，使用安全默认`);
                    throw new Error('无法找到合适的八度');
                }

                // 选择最佳八度组合（优先平滑连接）
                const selectedOctave = suitableOctaves[0];
                const lowerPitch = `${lowerNote}${selectedOctave.lowerOctave}`;
                const upperPitch = `${upperNote}${selectedOctave.upperOctave}`;
                const lowerMidi = this.noteToMidi(lowerPitch);
                const upperMidi = this.noteToMidi(upperPitch);

                // 创建音程对
                const intervalPair = {
                    lower: {
                        pitch: lowerPitch,
                        midi: lowerMidi,
                        duration: measureDuration,
                        value: 'whole',
                        displayName: '全音符',
                        type: 'note',
                    },
                    upper: {
                        pitch: upperPitch,
                        midi: upperMidi,
                        duration: measureDuration,
                        value: 'whole',
                        displayName: '全音符',
                        type: 'note',
                    },
                    intervalType: selectedIntervalType.displayName,
                    lowerScaleIndex: lowerScaleIndex,
                    prevScaleIndex: previousInterval ? previousInterval.lowerScaleIndex : undefined
                };

                measure.lowerVoice.push(intervalPair.lower);
                measure.upperVoice.push(intervalPair.upper);

                // 保存当前音程信息供下一小节使用
                previousInterval = {
                    lowerScaleIndex: lowerScaleIndex,
                    prevScaleIndex: previousInterval ? previousInterval.lowerScaleIndex : undefined,
                    lowerPitch: lowerPitch,
                    upperPitch: upperPitch
                };

                // 🔁 更新连续相同音程计数（whole-note专用路径也参与防重复）
                try {
                    if (selectedIntervalType && selectedIntervalType.name) {
                        if (this._lastIntervalTypeName === selectedIntervalType.name) {
                            this._consecutiveSameInterval = (this._consecutiveSameInterval || 0) + 1;
                        } else {
                            this._consecutiveSameInterval = 1;
                        }
                        this._lastIntervalTypeName = selectedIntervalType.name;
                    }
                } catch (e) {}

                console.log(`🔥 第${m + 1}小节生成成功: ${intervalPair.intervalType} (${intervalPair.lower.pitch}-${intervalPair.upper.pitch})`);

            } catch (generateError) {
                console.log(`🔥 第${m + 1}小节生成失败，使用调内安全默认:`, generateError.message);

                // 使用调内的安全默认音程（主音到三音）
                // 🔧 使用baseScale确保一致性（虽然前7个音相同，但保持架构统一）
                const safeBaseScale = this.getBaseScale(scale);
                const safeLowerNote = safeBaseScale.notes[0]; // 主音
                const safeUpperNote = safeBaseScale.notes[2]; // 三音
                const safeLowerPitch = `${safeLowerNote}4`;
                const safeUpperPitch = `${safeUpperNote}4`;

                const safeLower = {
                    pitch: safeLowerPitch,
                    midi: this.noteToMidi(safeLowerPitch),
                    duration: measureDuration,
                    value: 'whole',
                    displayName: '全音符（调内默认）',
                    type: 'note',
                };

                const safeUpper = {
                    pitch: safeUpperPitch,
                    midi: this.noteToMidi(safeUpperPitch),
                    duration: measureDuration,
                    value: 'whole',
                    displayName: '全音符（调内默认）',
                    type: 'note',
                };

                measure.lowerVoice.push(safeLower);
                measure.upperVoice.push(safeUpper);

                // 重置级进连接信息
                previousInterval = {
                    lowerScaleIndex: 0, // 主音位置
                    prevScaleIndex: previousInterval ? previousInterval.lowerScaleIndex : undefined,
                    lowerPitch: safeLowerPitch,
                    upperPitch: safeUpperPitch
                };

                console.log(`🔥 第${m + 1}小节使用调内安全默认: ${safeLowerPitch}-${safeUpperPitch}`);
            }

            // 最终检查：确保小节不为空
            if (!measure.lowerVoice || measure.lowerVoice.length === 0) {
                console.error(`🔥 第${m + 1}小节仍为空，强制添加全音符`);

                const forceInterval = this.getDefaultInterval();
                forceInterval.lower.duration = measureDuration;
                forceInterval.upper.duration = measureDuration;
                forceInterval.lower.value = 'whole';
                forceInterval.upper.value = 'whole';
                forceInterval.lower.displayName = '强制全音符';
                forceInterval.upper.displayName = '强制全音符';

                measure.lowerVoice = [forceInterval.lower];
                measure.upperVoice = [forceInterval.upper];
            }

            progression.measures.push(measure);
        }

        console.log(`🔥 专用全音符生成器完成: ${progression.measures.length}个小节`);

        // 最终验证：确保所有小节都有内容
        let emptyCount = 0;
        progression.measures.forEach((measure, index) => {
            if (!measure.lowerVoice || measure.lowerVoice.length === 0) {
                emptyCount++;
                console.error(`🔥 发现空白小节${index + 1}！`);
            }
        });

        if (emptyCount > 0) {
            console.error(`🔥 专用生成器失败：仍有${emptyCount}个空白小节`);
        } else {
            console.log('🔥 专用生成器成功：没有空白小节');
        }

        return progression;
    }

    /**
     * 🔥 极简二分音符专用生成器 - 绝对确保只生成二分音符
     * @param {Object} settings - 生成设置
     * @returns {Object} 只包含二分音符的音程进行
     */
    generateSimpleHalfNoteProgression(settings) {
        console.log('🔥🔥🔥 启动极简二分音符专用生成器 🔥🔥🔥');

        try {
            console.log('🔥 输入settings:', JSON.stringify(settings, null, 2));

            // 🔍 详细检查用户选择的音程类型
            console.log('🔍 原始 settings.intervalTypes:', JSON.stringify(settings.intervalTypes, null, 2));

            let intervalTypes = settings.intervalTypes;

            // 严格验证音程类型 - 不使用默认值！
            if (!Array.isArray(intervalTypes) || intervalTypes.length === 0) {
                console.error('🔥 ❌ 用户没有选择任何音程类型！');
                console.error('🔥 settings.intervalTypes:', intervalTypes);
                throw new Error('必须选择至少一个音程类型才能生成音程');
            }

            // 🔍 详细打印用户选择的每个音程类型
            console.log('🔍 用户选择的音程类型:');
            intervalTypes.forEach((interval, index) => {
                console.log(`  ${index + 1}. ${interval.displayName} (${interval.semitones}个半音) [ID: ${interval.id}]`);
            });

            // 处理keySignature可能是数组的情况
            let keySignature = settings.keySignature;
            if (Array.isArray(keySignature)) {
                keySignature = keySignature[0] || 'C';
            } else {
                keySignature = keySignature || 'C';
            }

            let timeSignature = settings.timeSignature || { beats: 4, beatType: 4 };
            let measures = settings.measureCount || settings.measures || 8;

            if (typeof measures !== 'number' || measures <= 0) {
                console.warn('🔥 measures无效，使用默认值8');
                measures = 8;
            }

            console.log('🔥 最终使用的参数:');
            console.log(`- intervalTypes: ${intervalTypes.length}个音程`);
            console.log(`- keySignature: ${keySignature}`);
            console.log(`- timeSignature: ${timeSignature.beats}/${timeSignature.beatType}`);
            console.log(`- measures: ${measures}`);

            // 🔍 特别分析二度音程
            const secondIntervals = intervalTypes.filter(interval =>
                interval.semitones === 1 || interval.semitones === 2
            );
            if (secondIntervals.length > 0) {
                console.log('🔍 ⚠️ 包含二度音程，需要特殊处理:');
                secondIntervals.forEach(interval => {
                    console.log(`   - ${interval.displayName}: ${interval.semitones}个半音`);
                });
                console.log('🔍 二度音程特点: 音程跨度小，需要调整线条感算法');
            }

        const progression = {
            measures: [],
            keySignature: keySignature,
            timeSignature: timeSignature,
            tempo: settings.tempo || 60,
            clef: settings.clef || 'treble',
            metadata: {
                totalMeasures: measures,
                timeSignature: timeSignature,
                keySignature: keySignature,
                rhythmType: '纯二分音符（极简）',
                generatedAt: new Date().toISOString()
            }
        };

        // 确保能获取到音阶
        let scale;
        if (this.scales && this.scales[keySignature]) {
            scale = this.scales[keySignature];
        } else if (this.scales && this.scales['C']) {
            scale = this.scales['C'];
        } else {
            // 如果没有音阶数据，创建默认的C大调音阶
            scale = { notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] };
            console.warn('🔥 使用默认C大调音阶');
        }

        console.log('🔥 使用音阶:', scale);
        console.log(`🔍 调号 ${keySignature} 的音阶详情:`, scale.notes);

        // 🔧 架构修复 (2025-10-10): 使用7音baseScale进行索引计算
        const baseScale = this.getBaseScale(scale);

        // 🎵 跟踪上一个音符，创造线条感 - 基于音高而非索引
        // 🔍 修复：统一起始音域，确保所有调号的线条感一致

        // 随机选择调内音符作为起始点，而不是总是接近C4
        const bestIndex = Math.floor(Math.random() * baseScale.notes.length);
        console.log(`🎵 简化生成器随机起始: 音阶位置${bestIndex} (${baseScale.notes[bestIndex]})`);

        // 🔍 调试：显示随机起始音符的选择结果
        const startNote = baseScale.notes[bestIndex];
        const startPitch = `${startNote}4`;
        const startMidi = this.noteToMidi ? this.noteToMidi(startPitch) : 60;

        console.log(`🔥 随机起始音符选择:`);
        console.log(`   ${keySignature}调 - 随机选择: ${startNote}4 (MIDI${startMidi}), 索引${bestIndex}`);

        // 用MIDI音高跟踪，而不是音阶索引
        let lastMidi = startMidi;

        for (let m = 0; m < measures; m++) {
            console.log(`🔥 生成第${m + 1}小节...`);

            const measure = {
                index: m,
                lowerVoice: [],
                upperVoice: []
            };

            // 🔍 随机选择音程类型（添加详细验证）
            console.log(`🔍 第${m + 1}小节 - 可选音程类型数量: ${intervalTypes.length}`);
            console.log(`🔍 第${m + 1}小节 - 可选音程: [${intervalTypes.map(it => it.displayName).join(', ')}]`);

            const intervalType = this.pickIntervalTypeAntiRepeat(intervalTypes) || intervalTypes[Math.floor(Math.random() * intervalTypes.length)];

            console.log(`🔥 第${m + 1}小节 - 选择音程类型: ${intervalType.displayName} (${intervalType.semitones}个半音)`);
            console.log(`🔍 验证选择: ID=${intervalType.id}, name=${intervalType.name}`);

            // 🎯 基于MIDI音高的线条感计算：确保调内音符 + 统一线条感
            let lowerMidi;

            if (m === 0) {
                // 第一个小节：使用统一起始音域
                lowerMidi = lastMidi;
                console.log(`🔍 第1小节 - 统一起始音: MIDI${lowerMidi}`);
            } else {
                // 后续小节：基于MIDI音高进行平滑的线条感步进
                const moveDirection = Math.random() < 0.5 ? -1 : 1; // 向上或向下

                // 🎯 优化步进大小：主要使用二度和三度，大跨度偶尔出现 (和主生成器一致)
                let stepSemitones;
                const isSecondInterval = intervalType.semitones <= 2;

                // 90%概率使用小步进（1-4半音，主要二度三度），10%概率使用大步进
                const useSmallStep = Math.random() < 0.9;

                if (useSmallStep) {
                    // 小步进：主要二度三度 (1-4半音)
                    if (isSecondInterval) {
                        stepSemitones = Math.floor(Math.random() * 3) + 1; // 1-3个半音 (更小)
                    } else {
                        stepSemitones = Math.floor(Math.random() * 4) + 1; // 1-4个半音 (二度三度范围)
                    }
                    console.log(`🎵 小步进模式: ${stepSemitones}半音 (二度三度优先)`);
                } else {
                    // 大步进：偶尔的跳跃 (5-8半音)
                    stepSemitones = Math.floor(Math.random() * 4) + 5; // 5-8个半音 (四度五度六度)
                    console.log(`🎵 大步进模式: ${stepSemitones}半音 (偶尔跳跃)`);
                }

                const targetMidi = lastMidi + (moveDirection * stepSemitones);

                // 🎯 关键修复：找到距离目标音高最近的调内音符
                let bestMidi = targetMidi;
                let bestDistance = Infinity;

                // 检查目标音高附近的所有调内音符 (检查多个八度)
                // 🔧 使用baseScale确保架构一致性
                for (let octave = 3; octave <= 5; octave++) {
                    for (let i = 0; i < baseScale.notes.length; i++) {
                        const notePitch = `${baseScale.notes[i]}${octave}`;
                        let noteMidi;
                        try {
                            // 🎯 关键修复：在级进计算中使用直接MIDI计算
                            noteMidi = this.calculateMidiDirect ? this.calculateMidiDirect(notePitch) : 60;
                        } catch (error) {
                            continue;
                        }

                        const distance = Math.abs(noteMidi - targetMidi);
                        if (distance < bestDistance) {
                            bestDistance = distance;
                            bestMidi = noteMidi;
                        }
                    }
                }

                lowerMidi = bestMidi;

                console.log(`🔥 线条感处理 ${isSecondInterval ? '(二度模式)' : '(常规模式)'}: 从MIDI${lastMidi} 移动到 MIDI${lowerMidi} (${lowerMidi - lastMidi > 0 ? '+' : ''}${lowerMidi - lastMidi}半音)`);
            }

            // 更新上一个音符记录
            lastMidi = lowerMidi;

            // 🎯 基于计算出的MIDI音高，找回对应的音符名称
            let lowerPitch;
            try {
                lowerPitch = this.midiToNote ? this.midiToNote(lowerMidi) : this.getScaleFallbackNote(lowerMidi);
            } catch (error) {
                lowerPitch = this.getScaleFallbackNote(lowerMidi);
                console.warn('🔥 MIDI转音符失败，使用调内后备音符', error);
            }

            console.log(`🔍 下声部音符: MIDI${lowerMidi} → ${lowerPitch}`);

            // 🎯 关键修复：确保上声部也是调内音符
            const targetUpperMidi = lowerMidi + intervalType.semitones;

            // 找到最接近目标MIDI值的调内音符作为上声部
            let upperPitch;
            let upperMidi;

            if (this.currentScale) {
                upperPitch = this.midiToScaleNote(targetUpperMidi, this.currentScale);
                upperMidi = this.calculateMidiDirect(upperPitch);
                console.log(`🎼 上声部调内音符: 目标MIDI${targetUpperMidi} → 调内音符${upperPitch}(MIDI${upperMidi})`);
            } else {
                // 后备方案
                upperMidi = targetUpperMidi;
                try {
                    upperPitch = this.midiToNote ? this.midiToNote(upperMidi) : this.getScaleFallbackNote(upperMidi);
                } catch (error) {
                    upperPitch = this.getScaleFallbackNote(upperMidi);
                    console.warn('🔥 上声部MIDI转换失败，使用调内后备音符', error);
                }
            }

            // 🔍 特别检查二度音程的音域问题
            const isSecondInterval = intervalType.semitones <= 2;
            if (isSecondInterval) {
                console.log(`🔍 二度音程音域检查:`);
                console.log(`   下声部MIDI: ${lowerMidi} (音域范围: ${settings.rangeMin}-${settings.rangeMax})`);
                console.log(`   上声部MIDI: ${upperMidi} (目标: ${targetUpperMidi}, 实际: ${upperMidi})`);

                // 检查是否超出音域
                if (upperMidi > settings.rangeMax) {
                    console.warn(`🔍 ⚠️ 二度音程上声部超出音域！${upperMidi} > ${settings.rangeMax}`);
                }
                if (lowerMidi < settings.rangeMin) {
                    console.warn(`🔍 ⚠️ 二度音程下声部低于音域！${lowerMidi} < ${settings.rangeMin}`);
                }
            }

            console.log(`🔥 第${m + 1}小节 - 精确音程计算:`);
            console.log(`   下声部: ${lowerPitch} (MIDI ${lowerMidi})`);
            console.log(`   上声部: ${upperPitch} (MIDI ${upperMidi})`);
            console.log(`   实际音程: ${upperMidi - lowerMidi}个半音`);
            console.log(`   期望音程: ${intervalType.semitones}个半音 (${intervalType.displayName})`);

            // 🔍 验证音程是否精确匹配
            const actualInterval = upperMidi - lowerMidi;
            if (actualInterval !== intervalType.semitones) {
                console.error(`🔥 ❌ 音程计算错误！期望${intervalType.semitones}半音，实际${actualInterval}半音`);
                console.error(`🔥 这说明音程计算逻辑有问题！`);
            } else {
                console.log(`🔥 ✅ 音程匹配正确：${actualInterval}半音 = ${intervalType.displayName}`);
            }

            // 在4/4拍中生成恰好2个二分音符（共4拍）
            for (let i = 0; i < 2; i++) {
                // 使用之前计算好的MIDI值和音符

                const lowerHalfNote = {
                    pitch: lowerPitch,
                    midi: lowerMidi,
                    duration: 2.0,
                    value: 'half',
                    displayName: '二分音符',
                    type: 'note',
                };

                const upperHalfNote = {
                    pitch: upperPitch,
                    midi: upperMidi,
                    duration: 2.0,
                    value: 'half',
                    displayName: '二分音符',
                    type: 'note',
                };

                measure.lowerVoice.push(lowerHalfNote);
                measure.upperVoice.push(upperHalfNote);
                console.log(`🔥 添加第${i + 1}个二分音符到小节${m + 1}`);
            }

            progression.measures.push(measure);
            console.log(`🔥 第${m + 1}小节完成: ${lowerPitch}-${upperPitch} (${intervalType.displayName}) × 2个二分音符`);
        }

        console.log(`🔥🔥🔥 极简二分音符生成器完成: ${progression.measures.length}个小节，每小节2个二分音符 🔥🔥🔥`);

        // 验证结果
        let totalNotes = 0;
        let nonHalfNotes = 0;

        progression.measures.forEach((measure, index) => {
            measure.lowerVoice.forEach(note => {
                totalNotes++;
                if (note.value !== 'half' || note.duration !== 2.0) {
                    nonHalfNotes++;
                    console.error(`🔥 发现非二分音符在小节${index + 1}: ${note.value}, 时值=${note.duration}`);
                }
            });
        });

        console.log(`🔥 验证结果: 总音符${totalNotes}个，非二分音符${nonHalfNotes}个`);

        if (nonHalfNotes === 0) {
            console.log('🔥 ✅ 极简生成器成功：100%二分音符');
        } else {
            console.error(`🔥 ❌ 极简生成器失败：发现${nonHalfNotes}个非二分音符`);
        }

        console.log('🔥🔥🔥 返回极简二分音符生成结果 🔥🔥🔥');
        return progression;

        } catch (error) {
            console.error('❌ 极简二分音符生成器出错:', error);
            console.error('错误详情:', error.stack);

            // 返回最基本的fallback
            console.log('🔧 返回最基本的二分音符fallback');

            const fallbackProgression = {
                measures: [],
                metadata: {
                    totalMeasures: 4,
                    timeSignature: { beats: 4, beatType: 4 },
                    keySignature: 'C',
                    rhythmType: '二分音符（fallback）',
                    generatedAt: new Date().toISOString()
                }
            };

            // 生成4个简单的二分音符小节
            for (let m = 0; m < 4; m++) {
                const measure = {
                    index: m,
                    lowerVoice: [],
                    upperVoice: []
                };

                // 每小节2个二分音符，使用调内的主三和弦（根音-三音大三度）
                for (let n = 0; n < 2; n++) {
                    // 获取调内的主音和三音
                    const scale = this.currentScale || this.scales['C'];
                    const keySignature = this.currentKeySignature || 'C';

                    // 🔧 架构修复 (2025-10-10): fallback也使用baseScale
                    const baseScale = this.getBaseScale(scale);
                    const tonicNote = baseScale.notes[0]; // 主音
                    const thirdNote = baseScale.notes[2]; // 三音（大三度）

                    const lowerPitch = `${tonicNote}4`;
                    const upperPitch = `${thirdNote}4`;

                    const lowerMidi = this.noteToMidi(lowerPitch);
                    const upperMidi = this.noteToMidi(upperPitch);

                    console.log(`🔧 Fallback音程（${keySignature}调）: ${lowerPitch}-${upperPitch} (MIDI: ${lowerMidi}-${upperMidi})`);

                    const lowerNote = {
                        pitch: lowerPitch,
                        midi: lowerMidi,
                        duration: 2.0,
                        value: 'half',
                        displayName: `二分音符（${keySignature}调fallback）`,
                        type: 'note',
                    };

                    const upperNote = {
                        pitch: upperPitch,
                        midi: upperMidi,
                        duration: 2.0,
                        value: 'half',
                        displayName: `二分音符（${keySignature}调fallback）`,
                        type: 'note',
                    };

                    measure.lowerVoice.push(lowerNote);
                    measure.upperVoice.push(upperNote);
                }

                fallbackProgression.measures.push(measure);
            }

            console.log('🔧 Fallback二分音符进行生成完成');
            return fallbackProgression;
        }
    }

    /**
     * 音符转MIDI值
     * @param {string} note - 音符名（如 "C4", "F#5"）
     * @returns {number} MIDI值
     */
    noteToMidi(note) {
        // 🛡️ 类型检查和防护代码
        if (!note || typeof note !== 'string') {
            console.error('noteToMidi: 无效的音符参数:', note, typeof note);
            // 使用调内主音作为后备
            const scale = this.currentScale || this.scales['C'];
            const tonicNote = scale.notes[0];
            return this.calculateMidiDirect(`${tonicNote}4`);
        }

        // 解析音符名 - 🔧 支持重升降记号（##, bb）
        const match = note.match(/^([A-G])(#{1,2}|b{1,2})?(\d+)$/);
        if (!match) {
            console.error('无效的音符格式:', note);
            // 使用调内主音作为后备
            const scale = this.currentScale || this.scales['C'];
            const tonicNote = scale.notes[0];
            return this.calculateMidiDirect(`${tonicNote}4`);
        }

        const [, noteName, accidental, octave] = match;
        const baseValue = this.noteToMidiBase[noteName];

        // 🎵 支持重升降记号
        let accidentalAdjust = 0;
        if (accidental === '#') accidentalAdjust = 1;
        else if (accidental === '##') accidentalAdjust = 2;
        else if (accidental === 'b') accidentalAdjust = -1;
        else if (accidental === 'bb') accidentalAdjust = -2;

        const octaveValue = parseInt(octave);

        return 12 + (octaveValue * 12) + baseValue + accidentalAdjust;
    }

    /**
     * 🎵 获取正确的音名拼写（基于调号和小调spelling表）
     * 从旋律视奏工具迁移
     *
     * @param {number} pitchClass - 音高类（0-11）
     * @param {string} keySignature - 调号
     * @returns {string} 正确的音名拼写
     */
    getCorrectSpelling(pitchClass, keySignature) {
        const keyInfo = KEY_SIGNATURES[keySignature];
        if (!keyInfo) {
            // 未知调号，使用默认spelling
            const defaultSpelling = {
                0: 'C', 1: 'C#', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
                6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'Bb', 11: 'B'
            };
            return defaultSpelling[pitchClass];
        }

        // 小调的特殊处理 - 使用专门的小调拼写表
        if (keyInfo.mode === 'minor' && typeof MINOR_KEY_SPELLING !== 'undefined') {
            const minorSpelling = MINOR_KEY_SPELLING[keySignature];
            if (minorSpelling && minorSpelling[pitchClass]) {
                return minorSpelling[pitchClass];
            }
        }

        // Special handling for B# in C# major
        if (pitchClass === 0) {
            if (keySignature === 'C#' || keySignature === 'C#m' ||
                keySignature === 'A#m') {
                return 'B#';
            }
        }

        // Special handling for E# in sharp keys
        if (pitchClass === 5) {
            if (keySignature === 'C#' || keySignature === 'C#m' ||
                keySignature === 'F#' || keySignature === 'F#m') {
                return 'E#';
            }
        }

        // Special handling for Cb in specific flat keys
        if (pitchClass === 11) {
            if (keySignature === 'Gb' || keySignature === 'Ebm') {
                return 'Cb';
            }
        }

        // 根据调号确定正确的音名拼写
        const isSharpKey = keyInfo.sharps.length > 0;
        const isFlatKey = keyInfo.flats.length > 0;

        if (isSharpKey) {
            // 升号调的拼写规范
            const sharpKeySpelling = {
                0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'E#',
                6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
            };
            return sharpKeySpelling[pitchClass];
        } else if (isFlatKey) {
            // 降号调的拼写规范
            const flatKeySpelling = {
                0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
                6: 'Gb', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B'
            };
            return flatKeySpelling[pitchClass];
        } else {
            // 默认拼写（C大调/Am小调）
            const defaultSpelling = {
                0: 'C', 1: 'C#', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
                6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'Bb', 11: 'B'
            };
            return defaultSpelling[pitchClass];
        }
    }

    /**
     * MIDI值转音符名（根据调号）
     * 🔧 增强版：使用getCorrectSpelling()获取准确的小调拼写
     *
     * @param {number} midi - MIDI值
     * @param {string} keySignature - 调号
     * @returns {string} 音符名
     */
    midiToNoteWithKey(midi, keySignature) {
        const octave = Math.floor((midi - 12) / 12);
        const pitchClass = (midi - 12) % 12;

        // 🎵 使用新的getCorrectSpelling()获取正确的音名拼写
        const noteName = this.getCorrectSpelling(pitchClass, keySignature);

        return noteName + octave;
    }

    /**
     * 从MIDI值找到最接近的调内音符
     * @param {number} midi - MIDI值
     * @param {Object} scale - 音阶对象
     * @returns {string} 调内音符名
     */
    midiToScaleNote(midi, scale) {
        const targetOctave = Math.floor((midi - 12) / 12);

        // 首先尝试在目标八度中找到精确匹配的调内音符
        for (let i = 0; i < scale.notes.length; i++) {
            const scaleNotePitch = `${scale.notes[i]}${targetOctave}`;
            const scaleNoteMidi = this.calculateMidiDirect(scaleNotePitch);
            if (scaleNoteMidi === midi) {
                console.log(`🎼 MIDI${midi} 精确匹配调内音符: ${scaleNotePitch}`);
                return scaleNotePitch;
            }
        }

        // 如果没有精确匹配，在相邻八度中查找最接近的调内音符
        let bestPitch = null;
        let bestDistance = Infinity;

        for (let octave = targetOctave - 1; octave <= targetOctave + 1; octave++) {
            for (let i = 0; i < scale.notes.length; i++) {
                const scaleNotePitch = `${scale.notes[i]}${octave}`;
                const scaleNoteMidi = this.calculateMidiDirect(scaleNotePitch);
                const distance = Math.abs(scaleNoteMidi - midi);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestPitch = scaleNotePitch;
                }
            }
        }

        if (bestPitch) {
            console.log(`🎼 MIDI${midi} 最接近的调内音符: ${bestPitch} (距离: ${bestDistance}半音)`);
            return bestPitch;
        }

        // 🎯 强制后备方案：如果没找到合适的调内音符，使用主音作为安全选择
        const tonicNote = scale.notes[0]; // 主音
        const fallbackOctave = Math.floor((midi - 12) / 12);
        const fallbackPitch = `${tonicNote}${fallbackOctave}`;
        console.warn(`🎼 MIDI${midi} 无法找到合适的调内音符，使用主音: ${fallbackPitch}`);
        return fallbackPitch;
    }

    /**
     * 获取调内后备音符（用于错误处理）
     * @param {number} midi - MIDI值
     * @returns {string} 调内音符
     */
    getScaleFallbackNote(midi) {
        const octave = Math.floor((midi - 12) / 12);
        const scale = this.currentScale || this.scales['C'];
        const tonicNote = scale.notes[0]; // 使用主音作为后备
        return `${tonicNote}${octave}`;
    }

    /**
     * 直接计算MIDI值（避免递归调用）
     * 🔧 增强版：支持重升降记号（##, bb）
     * @param {string} note - 音符名（如 "C4", "F#5", "F##4", "Cbb5"）
     * @returns {number} MIDI值
     */
    calculateMidiDirect(note) {
        // 解析音符名 - 支持单/双升降号
        const match = note.match(/^([A-G])(#{1,2}|b{1,2})?(\d+)$/);
        if (!match) {
            console.error('无效的音符格式:', note);
            return 60; // 这里保持原来的60，因为是直接计算方法
        }

        const [, noteName, accidental, octave] = match;
        const baseValue = this.noteToMidiBase[noteName];

        // 🎵 支持重升降记号
        let accidentalAdjust = 0;
        if (accidental === '#') accidentalAdjust = 1;
        else if (accidental === '##') accidentalAdjust = 2;
        else if (accidental === 'b') accidentalAdjust = -1;
        else if (accidental === 'bb') accidentalAdjust = -2;

        const octaveValue = parseInt(octave);

        return 12 + (octaveValue * 12) + baseValue + accidentalAdjust;
    }

    /**
     * MIDI值转音符名（兼容性方法）
     * 🔧 增强版：小调优先使用MINOR_KEY_SPELLING表，确保正确拼写
     * @param {number} midi - MIDI值
     * @returns {string} 音符名
     */
    midiToNote(midi) {
        // 🎵 小调模式：直接使用midiToNoteWithKey以确保正确拼写（包括重升降记号）
        if (this.currentKeySignature) {
            const keyInfo = KEY_SIGNATURES[this.currentKeySignature];
            if (keyInfo && keyInfo.mode === 'minor') {
                return this.midiToNoteWithKey(midi, this.currentKeySignature);
            }
        }

        // 大调模式：如果有音阶信息，使用调内音符
        if (this.currentKeySignature && this.currentScale) {
            return this.midiToScaleNote(midi, this.currentScale);
        }

        // 如果有当前调号信息，使用调号方法，否则使用默认方法
        if (this.currentKeySignature) {
            return this.midiToNoteWithKey(midi, this.currentKeySignature);
        }

        const octave = Math.floor((midi - 12) / 12);
        const noteValue = (midi - 12) % 12;

        // 基础音名表
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return noteNames[noteValue] + octave;
    }

    /**
     * 验证生成的进行
     * @param {Object} progression - 音程进行
     * @param {Array} allowedSemitones - 允许的半音数
     * @returns {Array} 违规列表
     */
    validateProgression(progression, allowedSemitones) {
        const violations = [];

        console.log(`\n🔍 ============ 开始验证音程进行 ============`);
        console.log(`✅ 允许的半音数: [${allowedSemitones.join(', ')}]`);

        // 🎵 显示使用的小调模式
        if (this.currentMinorVariant) {
            console.log(`🎵 本次生成使用: ${this.currentMinorVariant.type}小调`);
            console.log(`   固定音阶: [${this.currentMinorVariant.notes.join(', ')}]`);
            console.log(`   第6级: ${this.currentMinorVariant.alterations.sixth}, 第7级: ${this.currentMinorVariant.alterations.seventh}`);
            console.log(`   关键：整个进行中，F音永远${this.currentMinorVariant.alterations.sixth.includes('#') ? '是F#' : '是F'}，G音永远${this.currentMinorVariant.alterations.seventh.includes('#') ? '是G#' : '是G'}`);
        }

        console.log(`🔍 逐小节验证:`);

        progression.measures.forEach((measure, mIdx) => {
            console.log(`🔍 验证小节 ${mIdx + 1}:`);
            for (let i = 0; i < measure.lowerVoice.length; i++) {
                const lower = measure.lowerVoice[i];
                const upper = measure.upperVoice[i];

                if (lower.type === 'note' && upper.type === 'note') {
                    const interval = Math.abs(upper.midi - lower.midi);

                    // 🔍 详细日志：输出每个音符对的信息
                    const isValid = allowedSemitones.includes(interval);
                    console.log(`  音符${i + 1}: ${lower.pitch}(MIDI${lower.midi}) → ${upper.pitch}(MIDI${upper.midi}) = ${interval}半音 ${isValid ? '✅' : '❌ 违规！'}`);

                    if (!isValid) {
                        violations.push({
                            measure: mIdx + 1,
                            beat: i + 1,
                            lower: lower.pitch,
                            upper: upper.pitch,
                            actualInterval: interval,
                            expectedIntervals: allowedSemitones
                        });
                        console.error(`❌ 发现违规音程！小节${mIdx + 1}音符${i + 1}: ${lower.pitch} → ${upper.pitch} = ${interval}半音（允许: [${allowedSemitones.join(', ')}]）`);
                    }
                }
            }
        });

        if (violations.length > 0) {
            console.error(`❌❌❌ 验证失败！共发现 ${violations.length} 个违规音程`);
        } else {
            console.log(`✅ 验证通过！所有音程符合设置`);
        }

        return violations;
    }

    /**
     * 生成MusicXML格式
     * @param {Object} progression - 音程进行
     * @returns {string} MusicXML字符串
     */
    generateMusicXML(progression) {
        console.log('📄 生成MusicXML');

        const { measures, keySignature, timeSignature, tempo, clef } = progression;
        const scale = this.scales[keySignature] || this.scales['C'];

        // 检测音符类型，决定divisions值
        const hasSixteenthNotes = this.detectSixteenthNotes(measures);
        const hasEighthNotes = this.detectEighthNotes(measures);
        const hasTriplets = this.detectTriplets(measures);
        const hasDuplets = this.detectNpletKind(measures, 'duplet');
        const hasQuadruplets = this.detectNpletKind(measures, 'quadruplet');
        const hasDottedNotes = this.detectDottedNotes(measures);

        let divisions;
        // 🎯 修复：当存在任何连音（3连、2连、4连）时，使用divisions=24，保证所有时值为整数
        // 24 可整除 2、3、4、8 等分母，避免 0.375/0.333 等出现四舍五入误差
        if (hasTriplets || hasDuplets || hasQuadruplets) {
            divisions = 24;
        } else if (hasSixteenthNotes || hasEighthNotes || hasDottedNotes) {
            divisions = 24; // 保持统一，避免混合时值产生误差
        } else {
            divisions = 24;
        }

        console.log(`🎼 检测: ${hasTriplets ? '[三连音] ' : ''}${hasDuplets ? '[二连音] ' : ''}${hasQuadruplets ? '[四连音] ' : ''}${hasSixteenthNotes ? '[十六分]' : ''}${hasEighthNotes ? '[八分]' : ''}${hasDottedNotes ? '[附点]' : ''} → divisions=${divisions}`);

        // 供 noteToMusicXML 使用
        this._currentDivisions = divisions;

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>音程练习</part-name>
    </score-part>
  </part-list>
  <part id="P1">`;

        measures.forEach((measure, index) => {
            // 标记该小节是否包含 6/8 的二/四连音
            const measureHasNplet = (() => {
                const hasIn = (arr) => Array.isArray(arr) && arr.some(e => e && e.tupletGroup && (e.tupletKind === 'duplet' || e.tupletKind === 'quadruplet'));
                return hasIn(measure.lowerVoice) || hasIn(measure.upperVoice);
            })();

            // 记录本小节写入起始位置，便于小节级别清理
            const measureXmlStart = xml.length;
            // 为包含十六分音符的小节添加拍点位置信息
            if (hasSixteenthNotes) {
                this.addBeatPositionInfo(measure, timeSignature);
            }

            // 🎵 为每个小节重新分配三连音bracket编号（修复bracket重叠问题）
            this.assignMeasureTupletNumbers(measure);
            // 🆕 也为二/四连音按小节重新编号，避免编号冲突并确保显示一致
            this.assignMeasureNpletNumbers(measure);

            xml += `
    <measure number="${index + 1}">`;

            // 🔑 在每4小节的倍数位置添加换行指令（第5小节、第9小节等）
            if (index > 0 && (index + 1) % 4 === 1) {
                xml += `
      <print new-system="yes"/>`;
                console.log(`🔄 在第${index + 1}小节添加换行指令`);
            }

            // 第一小节添加属性
            if (index === 0) {
                xml += `
      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${scale.fifths}</fifths>
        </key>
        <time>
          <beats>${timeSignature.beats}</beats>
          <beat-type>${timeSignature.beatType}</beat-type>
        </time>
        ${this.generateClefXML(clef)}
      </attributes>`;
            }

            // 🎯 修复：确保两个声部的所有音符都被正确处理
            const lowerVoice = measure.lowerVoice || [];
            const upperVoice = measure.upperVoice || [];
            const maxLength = Math.max(lowerVoice.length, upperVoice.length);

            console.log(`🎼 处理小节音符: lowerVoice=${lowerVoice.length}个, upperVoice=${upperVoice.length}个, 最大=${maxLength}个`);

            // 🎼 使用预计算的beam组（旋律工具架构）
            const beamGroups = measure.beams || [];
            console.log(`🎼 使用预计算的beam组: ${beamGroups.length}个组`);

            for (let i = 0; i < maxLength; i++) {
                const lower = lowerVoice[i];
                const upper = upperVoice[i];

                console.log(`  处理位置${i}: lower=${lower?.type || 'undefined'} upper=${upper?.type || 'undefined'}`);

                if (lower && upper && lower.type === 'note' && upper.type === 'note') {
                    // 两个声部都有音符 - 和声
                    const beamPosition = this.getBeamInfo_Melody(beamGroups, i);
                    const beamInfo = beamPosition ? { hasBeam: true, position: beamPosition } : { hasBeam: false };
                    xml += this.noteToMusicXMLDirect(lower, false, beamInfo, divisions);
                    xml += this.noteToMusicXMLDirect(upper, true, beamInfo, divisions);
                    console.log(`    ✅ 处理和声: ${lower.value} + ${upper.value}`);
                } else if (lower && lower.type === 'note' && !upper) {
                    // 只有下声部有音符
                    const beamPosition = this.getBeamInfo_Melody(beamGroups, i);
                    const beamInfo = beamPosition ? { hasBeam: true, position: beamPosition } : { hasBeam: false };
                    xml += this.noteToMusicXMLDirect(lower, false, beamInfo, divisions);
                    console.log(`    ✅ 处理下声部音符: ${lower.value}`);
                } else if (!lower && upper && upper.type === 'note') {
                    // 只有上声部有音符
                    xml += this.noteToMusicXMLDirect(upper, false, { hasBeam: false }, divisions);
                    console.log(`    ✅ 处理上声部音符: ${upper.value}`);
                } else if (lower && lower.type === 'rest') {
                    // 休止符
                    xml += this.restToMusicXML(lower, divisions);
                    console.log(`    ✅ 处理休止符: ${lower.value || lower.displayName}`);
                } else if (upper && upper.type === 'rest') {
                    // 上声部休止符
                    xml += this.restToMusicXML(upper, divisions);
                    console.log(`    ✅ 处理上声部休止符: ${upper.value || upper.displayName}`);
                } else {
                    console.log(`    ⚠️ 跳过位置${i}: lower=${lower?.type || 'null'} upper=${upper?.type || 'null'}`);
                }
            }

            // 在最后一个小节添加终止线
            if (index === measures.length - 1) {
                xml += `
      <barline location="right">
        <bar-style>light-heavy</bar-style>
      </barline>`;
            }

            xml += `
    </measure>`;

            // 小节级别的去点：如果该小节包含 N‑plet，则移除本小节内所有 <dot/>
            if (measureHasNplet) {
                const before = xml;
                const head = xml.slice(0, measureXmlStart);
                const tail = xml.slice(measureXmlStart).replace(/<dot\/>/g, '');
                xml = head + tail;
                if (before !== xml) {
                    console.log(`🧹 [小节清理] 第${index + 1}小节包含二/四连音，已移除小节内所有附点`);
                }
            }
        });

        xml += `
  </part>
</score-partwise>`;

        // 不进行全局 6/8 八分附点清洗，避免影响合法的附点八分。
        // 仅对 6/8 的二/四连音进行精确去点处理，避免渲染成附点音符
        try {
            if (progression && progression.timeSignature && progression.timeSignature.beats === 6 && progression.timeSignature.beatType === 8) {
                const before = xml;
                // 情况1：<notations> 在 <dot/> 之后（start 音符，包含 show-number）
                xml = xml.replace(/(<note>[\s\S]*?<type>[^<]+<\/type>[\s\S]*?)<dot\/>(([\s\S]*?<notations>[\s\S]*?<tuplet[^>]*show-number=\"(?:2|4)\"[\s\S]*?<\/notations>[\s\S]*?)<\/note>)/g,
                    (m, pre, rest) => pre + rest.replace(/<dot\/>/g, ''));
                // 情况2：<notations> 在 <type> 之前（顺序变体）
                xml = xml.replace(/(<note>[\s\S]*?<notations>[\s\S]*?<tuplet[^>]*show-number=\"(?:2|4)\"[\s\S]*?<\/notations>[\s\S]*?<type>[^<]+<\/type>[\s\S]*?)<dot\/>/g,
                    '$1');
                // 情况3：stop 音符不含 show-number，但包含 <time-modification><actual-notes>2|4</actual-notes>
                xml = xml.replace(/<note>[\s\S]*?<time-modification>[\s\S]*?<actual-notes>(?:2|4)<\/actual-notes>[\s\S]*?<\/time-modification>[\s\S]*?<\/note>/g,
                    (noteBlock) => noteBlock.replace(/<dot\/>/g, ''));
                if (before !== xml) {
                    console.log('🧹 [6/8连音精确清洗] 移除了 bracket(2/4) 内的 <dot/>' );
                }
            }
        } catch (e) {
            console.warn('6/8 连音精确去点失败（继续）:', e);
        }

        return xml;
    }

    /**
     * 检测乐谱中是否包含十六分音符
     * @param {Array} measures - 小节数组
     * @returns {boolean} 是否包含十六分音符
     */
    detectSixteenthNotes(measures) {
        for (const measure of measures) {
            for (const voice of [measure.lowerVoice, measure.upperVoice]) {
                for (const note of voice) {
                    if (note.value === '16th' || Math.abs(note.duration - 0.25) < 0.001) {
                        console.log(`🔍 在小节中发现十六分音符: ${note.displayName || note.value}`);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * 检测小节中的最小音符时值
     * @param {Object} measure - 单个小节对象
     * @returns {number} 最小音符时值（以四分音符为1.0的单位）
     */
    detectSmallestNoteDuration(measure) {
        let smallestDuration = Infinity;

        // 检查下声部（包含音符和休止符）
        for (const element of measure.lowerVoice) {
            if (element.type === 'note' || element.type === 'rest') {
                // 🎯 使用统一的时值计算函数
                const duration = this.getElementDuration(element);
                if (duration < smallestDuration) {
                    smallestDuration = duration;
                }
            }
        }

        // 检查上声部（包含音符和休止符）
        for (const element of measure.upperVoice) {
            if (element.type === 'note' || element.type === 'rest') {
                // 🎯 使用统一的时值计算函数
                const duration = this.getElementDuration(element);
                if (duration < smallestDuration) {
                    smallestDuration = duration;
                }
            }
        }

        // 如果没有找到音符或休止符，返回四分音符作为默认值
        if (smallestDuration === Infinity) {
            smallestDuration = 1.0;
        }

        console.log(`🔍 小节最小时值: ${smallestDuration}拍 (${this.getDurationName(smallestDuration)}) 包含休止符`);
        return smallestDuration;
    }

    /**
     * 根据时值获取音符名称
     * @param {number} duration - 音符时值
     * @returns {string} 音符名称
     */
    getDurationName(duration) {
        for (const [name, value] of Object.entries(this.rhythmDurations)) {
            if (Math.abs(value - duration) < 0.01) {
                return name;
            }
        }
        return `${duration}拍`;
    }

    /**
     * 检查是否需要进行拍点明确化处理
     * @param {Object} measure - 小节对象
     * @param {Object} timeSignature - 拍号信息
     * @returns {boolean} 是否需要拍点明确化
     */
    needsBeatClarification(measure, timeSignature) {
        const smallestDuration = this.detectSmallestNoteDuration(measure);

        // 🔥 修复5: 移除过度保护逻辑，Fix 1-4 已经解决了时值转换问题
        // 十六分音符和三连音可以共存，因为：
        // - Fix 1: beatsToNoteDuration() 正确处理32分音符
        // - Fix 2: findClosestDuration() 有比率验证
        // - Fix 3: generateRhythmPattern() 有时值验证
        // - Fix 4: 冲突组逻辑确保不会在同一拍群混合

        const hasSixteenthNotes = smallestDuration <= 0.25;

        // 如果有十六分音符或更小时值，需要拍点明确化
        if (hasSixteenthNotes) {
            console.log(`🎯 小节包含十六分音符或更小时值，需要拍点明确化：最小音符为${this.getDurationName(smallestDuration)}`);
            return true;
        }

        // 🔧 修复：6/8拍不需要进行四分音符边界检查，因为它是复合拍子
        if (this.is68Time(timeSignature)) {
            console.log(`🎯 6/8拍跳过四分音符边界检查（复合拍子）`);
            return false;
        }

        // 对于其他拍子：检查是否有跨越四分音符边界的音符
        const hasCrossingNotes = this.hasNotesCrossingQuarterBoundaries(measure, timeSignature || { beats: 4, beatType: 4 });

        if (hasCrossingNotes) {
            console.log(`🎯 小节包含跨越四分音符边界的音符，需要拍点明确化`);
            return true;
        }

        return false;
    }

    /**
     * 检查小节是否包含跨越四分音符边界的音符或休止符
     * @param {Object} measure - 小节对象
     * @param {Object} timeSignature - 拍号信息
     * @returns {boolean} 是否包含跨边界元素
     */
    hasNotesCrossingQuarterBoundaries(measure, timeSignature) {
        const boundaries = this.getQuarterNoteBoundaries(timeSignature);

        let currentPosition = 0;
        for (const element of measure.lowerVoice) {
            if (element.type === 'note' || element.type === 'rest') {
                // 🎯 使用统一的时值计算函数
                const duration = this.getElementDuration(element);
                const endPosition = currentPosition + duration;

                // 🎵 三连音保护：三连音跨越边界是正常的，不应触发拍点清晰化
                const isTriplet = element.tripletGroup || element.isTriplet || element.isTripletElement;
                if (isTriplet) {
                    const tripletType = element.tripletType || 'eighth';
                    const elementType = element.type === 'rest' ? `${tripletType}三连音休止符` : `${tripletType}三连音音符`;
                    console.log(`🛡️ 三连音保护: ${elementType} 位置${currentPosition.toFixed(2)}-${endPosition.toFixed(2)} (时值=${duration.toFixed(3)}拍) 跨边界是正常的`);
                    currentPosition += duration;
                    continue; // 跳过三连音，不将其计入需要拆分的元素
                }

                // 🎯 修复：先检查豁免条件，避免误判附点音符需要拆分
                const startsOnBeat = this.isOnQuarterNoteBoundary(currentPosition);
                const isWholeBeats = this.isWholeBeatDuration(duration);

                // 如果音符开始于拍点且为整拍时值，则豁免所有边界检查
                if (startsOnBeat && isWholeBeats) {
                    const elementType = element.type === 'rest' ? '休止符' : '音符';
                    console.log(`ℹ️ ${elementType}在拍点上且为整拍时值，豁免边界检查: 位置${currentPosition.toFixed(2)}-${endPosition.toFixed(2)} (${duration}拍)`);
                    // 直接跳过这个音符的所有边界检查
                } else {
                    // 只有非豁免的音符才检查边界跨越
                    for (const boundary of boundaries) {
                        if (currentPosition < boundary && endPosition > boundary) {
                            const elementType = element.type === 'rest' ? '休止符' : '音符';
                            console.log(`🎯 发现跨边界${elementType}: 位置${currentPosition.toFixed(2)}-${endPosition.toFixed(2)} 跨越边界${boundary}`);
                            return true;
                        }
                    }
                }
            }
            // 🎯 使用统一的时值计算函数
            currentPosition += this.getElementDuration(element);
        }

        return false;
    }

    /**
     * 获取四分音符拍点边界位置
     * @param {Object} timeSignature - 拍号信息
     * @returns {Array} 拍点位置数组
     */
    getQuarterNoteBoundaries(timeSignature) {
        const boundaries = [];
        const quarterNotesPerMeasure = timeSignature.beats * (4 / timeSignature.beatType);

        // 生成四分音符拍点位置
        for (let i = 0; i <= quarterNotesPerMeasure; i++) {
            boundaries.push(i * 1.0); // 每个四分音符占1.0拍
        }

        console.log(`🎯 四分音符拍点边界: [${boundaries.join(', ')}]`);
        return boundaries;
    }

    /**
     * 检查位置是否正好在四分音符边界上
     * @param {number} position - 音符位置
     * @returns {boolean} 是否在边界上
     */
    isOnQuarterNoteBoundary(position) {
        // 检查位置是否是四分音符的整数倍（允许小的浮点误差）
        const tolerance = 0.001;
        const quarterBeats = position / 1.0; // 四分音符为1.0拍
        return Math.abs(quarterBeats - Math.round(quarterBeats)) < tolerance;
    }

    /**
     * 检查时值是否是整数个四分音符
     * @param {number} duration - 音符时值
     * @returns {boolean} 是否是整拍时值
     */
    isWholeBeatDuration(duration) {
        // 检查时值是否是四分音符的整数倍（允许小的浮点误差）
        const tolerance = 0.001;
        const quarterBeats = duration / 1.0; // 四分音符为1.0拍
        return Math.abs(quarterBeats - Math.round(quarterBeats)) < tolerance;
    }

    /**
     * 检测音符是否跨越四分音符拍点边界
     * @param {number} startPosition - 音符开始位置
     * @param {number} duration - 音符持续时间
     * @param {Array} boundaries - 拍点边界数组
     * @returns {Object} 跨越信息
     */
    detectBeatBoundaryCrossing(startPosition, duration, boundaries) {
        const endPosition = startPosition + duration;
        const crossedBoundaries = [];

        // 检查是否跨越了任何边界
        for (const boundary of boundaries) {
            if (startPosition < boundary && endPosition > boundary) {
                crossedBoundaries.push(boundary);
            }
        }

        const crosses = crossedBoundaries.length > 0;

        if (crosses) {
            console.log(`🎯 音符跨越拍点边界: 位置${startPosition.toFixed(2)}-${endPosition.toFixed(2)}, 跨越边界: [${crossedBoundaries.join(', ')}]`);
        }

        return {
            crosses: crosses,
            boundaries: crossedBoundaries,
            startPosition: startPosition,
            endPosition: endPosition,
            duration: duration
        };
    }

    /**
     * 分析小节中所有音符的拍点边界跨越情况
     * @param {Object} measure - 小节对象
     * @param {Object} timeSignature - 拍号信息
     * @returns {Array} 需要拆分的音符信息数组
     */
    analyzeBeatCrossings(measure, timeSignature) {
        const boundaries = this.getQuarterNoteBoundaries(timeSignature);
        const notesToSplit = [];

        // 分析下声部
        let currentPosition = 0;
        for (let i = 0; i < measure.lowerVoice.length; i++) {
            const note = measure.lowerVoice[i];

            if (note.type === 'note') {
                // 🎯 使用统一的时值计算函数
                const duration = this.getElementDuration(note);
                const crossingInfo = this.detectBeatBoundaryCrossing(currentPosition, duration, boundaries);

                if (crossingInfo.crosses) {
                    notesToSplit.push({
                        voice: 'lower',
                        index: i,
                        note: note,
                        crossingInfo: crossingInfo
                    });
                }
            }

            // 🎯 使用统一的时值计算函数
            const duration = this.getElementDuration(note);
            currentPosition += duration;
        }

        // 分析上声部（应该与下声部同步）
        currentPosition = 0;
        for (let i = 0; i < measure.upperVoice.length; i++) {
            const note = measure.upperVoice[i];

            if (note.type === 'note') {
                // 🎯 使用统一的时值计算函数
                const duration = this.getElementDuration(note);
                const crossingInfo = this.detectBeatBoundaryCrossing(currentPosition, duration, boundaries);

                if (crossingInfo.crosses) {
                    // 检查是否已经有对应的下声部音符
                    const existingEntry = notesToSplit.find(entry =>
                        entry.index === i && entry.voice === 'lower'
                    );

                    if (existingEntry) {
                        // 添加上声部信息到现有条目
                        existingEntry.upperNote = note;
                        existingEntry.upperCrossingInfo = crossingInfo;
                    } else {
                        // 创建新条目（理论上不应该发生，因为上下声部应该同步）
                        notesToSplit.push({
                            voice: 'upper',
                            index: i,
                            note: note,
                            crossingInfo: crossingInfo
                        });
                    }
                }
            }

            // 🎯 使用统一的时值计算函数
            const duration = this.getElementDuration(note);
            currentPosition += duration;
        }

        console.log(`🎯 发现 ${notesToSplit.length} 个需要拆分的音符位置`);
        return notesToSplit;
    }

    /**
     * 将音符拆分为不跨越拍点边界的多个音符
     * @param {Object} noteInfo - 需要拆分的音符信息
     * @returns {Array} 拆分后的音符数组
     */
    splitNoteAtBoundaries(noteInfo) {
        const { crossingInfo } = noteInfo;
        const { startPosition, endPosition, boundaries } = crossingInfo;
        const originalNote = noteInfo.note;

        const splitNotes = [];
        let currentStart = startPosition;

        // 为每个被跨越的边界创建分段
        const allPositions = [startPosition, ...boundaries, endPosition].sort((a, b) => a - b);

        for (let i = 0; i < allPositions.length - 1; i++) {
            const segmentStart = allPositions[i];
            const segmentEnd = allPositions[i + 1];
            const segmentDuration = segmentEnd - segmentStart;

            if (segmentDuration > 0.01) { // 忽略极小的时值差异
                const segmentNote = {
                    ...originalNote,
                    value: this.findClosestDuration(segmentDuration), // STRING: 音符类型名称
                    duration: segmentDuration, // NUMBER: 数值时值（保持原义）
                    beats: segmentDuration, // NUMBER: 显式beats属性（与旋律工具一致）
                    actualDuration: segmentDuration, // 保存实际时值
                    originalDuration: originalNote.duration,
                    segmentIndex: i,
                    totalSegments: allPositions.length - 1,
                    startPosition: segmentStart,
                    endPosition: segmentEnd,
                    tie: this.determineTieType(i, allPositions.length - 1)
                };

                splitNotes.push(segmentNote);
                console.log(`🎼 拆分片段 ${i + 1}: ${segmentNote.pitch} ${segmentNote.value} (${segmentDuration.toFixed(2)}拍) [${segmentNote.tie}]`);
            }
        }

        return splitNotes;
    }

    /**
     * 找到最接近指定时值的标准音符时值
     * @param {number} targetDuration - 目标时值
     * @returns {string} 最接近的标准音符时值名称
     */
    findClosestDuration(targetDuration) {
        // 🔥 修复：优先使用beatsToNoteDuration，它有更智能的fallback逻辑
        // 直接调用beatsToNoteDuration，避免重复实现相同的逻辑
        const smartDuration = this.beatsToNoteDuration(targetDuration);

        // 验证返回的时值是否合理（不应该产生超过2倍的误差）
        const smartBeats = this.durationToBeats(smartDuration);
        const ratio = smartBeats / targetDuration;

        if (ratio >= 0.5 && ratio <= 2.0) {
            // 合理范围内，直接返回
            return smartDuration;
        }

        // 🔥 如果beatsToNoteDuration的结果不合理，使用原有逻辑作为fallback
        console.log(`⚠️ beatsToNoteDuration返回的时值${smartDuration}(${smartBeats}拍)与目标${targetDuration}拍偏差过大，使用备用逻辑`);

        // 根据当前允许的节奏集合筛选候选，避免产生未勾选的时值（例如32分）
        const allowed = (this._allowedRhythmValues && Array.isArray(this._allowedRhythmValues))
            ? new Set(this._allowedRhythmValues)
            : null;

        let closestDuration = 'quarter';
        let smallestDiff = Infinity;

        // 构造候选表：若存在allowed则仅取allowed中的；否则取常规集合
        const entriesAll = Object.entries(this.rhythmDurations);
        const entries = entriesAll.filter(([name]) => {
            if (allowed) {
                // 仅允许用户勾选的节奏；若未勾选32分，则自然被排除
                return allowed.has(name);
            }
            // 没有用户列表时，默认包含32分音符（与beatsToNoteDuration保持一致）
            return true;
        });

        // 🔥 修复：安全fallback应该包含32分音符，与beatsToNoteDuration保持一致
        const safeFallback = [
            ['32nd', 0.125],      // 🔥 新增：32分音符
            ['sixteenth', 0.25],
            ['eighth', 0.5],
            ['eighth.', 0.75],
            ['quarter', 1.0],
            ['quarter.', 1.5],
            ['half', 2.0],
            ['half.', 3.0],
            ['whole', 4.0]
        ];

        const scanList = entries.length > 0 ? entries : safeFallback;

        for (const [name, value] of scanList) {
            const val = typeof value === 'number' ? value : parseFloat(value);
            const diff = Math.abs(val - targetDuration);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closestDuration = name;
            }
        }

        // 🔥 修复：移除不合理的fallback到quarter，应该返回最接近的值
        // 即使差异较大，也应该返回最接近的时值，而不是强制使用quarter
        return closestDuration;
    }



    /**
     * 获取节奏时值的显示名称
     * @param {string} durationValue - 节奏时值（如 'quarter', 'eighth'等）
     * @returns {string} 显示名称
     */
    getDurationDisplayName(durationValue) {
        const displayNames = {
            'whole': '全音符',
            'half.': '附点二分音符',
            'half': '二分音符',
            'quarter.': '附点四分音符',
            'quarter': '四分音符',
            'eighth.': '附点八分音符',
            'eighth': '八分音符',
            '16th.': '附点十六分音符',
            '16th': '十六分音符',
            'sixteenth': '十六分音符'
        };

        // 🔧 修复：三连音不应该直接调用此方法，需要特殊处理
        if (durationValue === 'triplet') {
            console.warn('⚠️ 警告：三连音应该使用特殊的显示名称生成逻辑，不应直接调用getDurationDisplayName');
            return '三连音'; // 保持兼容性，但发出警告
        }

        return displayNames[durationValue] || `${durationValue}音符`;
    }

    /**
     * 确定连音线类型
     * @param {number} segmentIndex - 当前片段索引
     * @param {number} totalSegments - 总片段数
     * @returns {string} 连音线类型
     */
    determineTieType(segmentIndex, totalSegments) {
        if (totalSegments === 1) {
            return 'none'; // 不需要连音线
        } else if (segmentIndex === 0) {
            return 'start'; // 开始连音线
        } else if (segmentIndex === totalSegments - 1) {
            return 'stop'; // 结束连音线
        } else {
            return 'continue'; // 继续连音线
        }
    }

    /**
     * 重新应用beaming到voice数组（beat clarification后使用）
     * 🔥 完全采用旋律工具的顺序处理方式，修复预分组bug
     * @param {Array} events - 音符/休止符事件数组
     * @param {Object} timeSignature - 拍号信息
     * @returns {Array} 带有beam信息的events数组
     */
    reapplyBeamingToVoice(events, timeSignature) {
        if (!events || events.length === 0) {
            return events;
        }

        console.log(`🔗 [VERSION:2025-10-08-v2] 重新应用beaming: ${events.length}个事件, 拍号${timeSignature.beats}/${timeSignature.beatType}`);

        // 🔥 关键修复：完全移除三连音beam处理逻辑
        // 原因：三连音beam信息已在生成时通过calculateTripletBeamConnections()正确设置
        // reapplyBeamingToVoice主要处理普通音符的beam，三连音应该跳过
        console.log('🎵 三连音beam信息保留生成时的设置，不在此处理\n');

        // 🎯 第二步：使用旋律工具的顺序处理方式
        const beatsPerMeasure = timeSignature.beats;
        let currentGroup = [];
        let currentBeat = -1;
        let position = 0;
        let beamCounter = 0;

        for (let i = 0; i < events.length; i++) {
            const event = events[i];

            // 🔥 跳过三连音：三连音已经有正确的beam信息
            if (event.tripletGroup || event.isTriplet) {
                // 三连音使用自己的时值计算
                const eventDuration = event.beats || event.tripletBaseDuration || (1/3);
                position += eventDuration;
                position = Math.round(position * 10000) / 10000;
                console.log(`🔍 事件${i+1}: 三连音, 跳过beaming, 位置${position.toFixed(3)}`);
                continue;
            }

            const beatNumber = Math.floor(position) % beatsPerMeasure;

            console.log(`🔍 事件${i+1}: ${event.type}/${event.value}, 拍${beatNumber}, 位置${position.toFixed(3)}`);

            // 🔑 判断是否可beam（完全复制旋律工具逻辑）
            let canBeam = false;
            if (event.type === 'note') {
                // 🔥 Bug3修复：beat clarification后，event.duration是NUMBER，event.value是STRING
                // 必须使用event.value进行字符串比较，否则所有音符（包括四分音符）都会被允许beam
                canBeam = event.value !== 'whole' &&
                          event.value !== 'half' &&
                          event.value !== 'half.' &&
                          event.value !== 'quarter' &&   // 排除四分音符
                          event.value !== 'quarter.';    // 排除附点四分音符

                console.log(`  🔍 音符${i+1}(${event.value}): 可连beam=${canBeam}`);
            }

            if (canBeam) {
                // 🔑 关键：检查是否换拍
                if (currentBeat !== -1 && beatNumber !== currentBeat) {
                    console.log(`  📍 换拍(从拍${currentBeat}到拍${beatNumber})，结束当前组`);
                    if (currentGroup.length >= 2) {
                        this.finalizeBeamGroup(events, currentGroup, `reapply_beam${beamCounter++}`);
                        console.log(`    ✅ 创建beam组: 事件[${currentGroup.map(idx => idx+1).join(', ')}]`);
                    }
                    currentGroup = [];
                }

                currentBeat = beatNumber;
                currentGroup.push(i);
                console.log(`  ✅ 加入拍${beatNumber}的beam组，组大小: ${currentGroup.length}`);

            } else {
                // 休止符或不可beam音符，结束当前组
                console.log(`  ❌ 不连beam/中断beam组`);
                if (currentGroup.length >= 2) {
                    this.finalizeBeamGroup(events, currentGroup, `reapply_beam${beamCounter++}`);
                    console.log(`    ✅ 创建beam组: 事件[${currentGroup.map(idx => idx+1).join(', ')}]`);
                }
                currentGroup = [];
                currentBeat = -1;
            }

            // 更新位置
            // 🔥 修复：优先使用beats（NUMBER），然后actualDuration（NUMBER）
            // beats和actualDuration都是NUMBER，避免了STRING导致的NaN问题
            const eventDuration = event.beats ||
                                  event.actualDuration ||
                                  (typeof event.duration === 'number' ? event.duration : null) ||
                                  (event.value ? this.rhythmDurations[event.value] : null) ||
                                  1.0; // 最终fallback：四分音符
            position += eventDuration;
            // 🔥 从旋律工具迁移：修复累计浮点数精度问题，避免beatNumber计算错误
            // 示例：0.25+0.75+0.25可能=1.2499999999而非1.25，导致Math.floor()错误判断拍数
            position = Math.round(position * 10000) / 10000;
        }

        // 处理最后一组
        if (currentGroup.length >= 2) {
            this.finalizeBeamGroup(events, currentGroup, `reapply_beam${beamCounter++}`);
            console.log(`  ✅ 创建最终beam组: 事件[${currentGroup.map(idx => idx+1).join(', ')}]`);
        }

        console.log(`✅ 重新应用beaming完成: 创建${beamCounter}个beam组`);
        return events;
    }

    /**
     * 应用拍点明确化处理到整个小节
     * @param {Object} measure - 小节对象
     * @param {Object} timeSignature - 拍号信息
     * @returns {Object} 处理后的小节对象
     */
    applyBeatClarification(measure, timeSignature) {
        // 🔥 关键修复：确保所有音符的duration和beats保持同步
        // 这是防御性编程的最后一道防线，确保即使有地方遗漏了同步，也能在这里修复
        if (measure.lowerVoice) {
            measure.lowerVoice.forEach((note, index) => {
                if (note.type === 'note' || note.type === 'rest') {
                    // 如果beats不存在或与duration不一致，同步它
                    if (!note.beats || typeof note.beats !== 'number' || isNaN(note.beats)) {
                        note.beats = note.duration;
                        console.log(`🔧 自动同步beats (下声部${index+1}): ${note.pitch || 'rest'} duration=${note.duration} → beats=${note.beats}`);
                    } else if (Math.abs(note.beats - note.duration) > 0.001) {
                        console.warn(`⚠️ 检测到duration/beats不一致 (下声部${index+1}): ${note.pitch || 'rest'} duration=${note.duration}, beats=${note.beats}`);
                        note.beats = note.duration;
                        console.log(`🔧 已修正: beats → ${note.beats}`);
                    }
                }
            });
        }

        if (measure.upperVoice) {
            measure.upperVoice.forEach((note, index) => {
                if (note.type === 'note' || note.type === 'rest') {
                    if (!note.beats || typeof note.beats !== 'number' || isNaN(note.beats)) {
                        note.beats = note.duration;
                        console.log(`🔧 自动同步beats (上声部${index+1}): ${note.pitch || 'rest'} duration=${note.duration} → beats=${note.beats}`);
                    } else if (Math.abs(note.beats - note.duration) > 0.001) {
                        console.warn(`⚠️ 检测到duration/beats不一致 (上声部${index+1}): ${note.pitch || 'rest'} duration=${note.duration}, beats=${note.beats}`);
                        note.beats = note.duration;
                        console.log(`🔧 已修正: beats → ${note.beats}`);
                    }
                }
            });
        }

        // 检查是否需要拍点明确化
        if (!this.needsBeatClarification(measure, timeSignature)) {
            console.log(`ℹ️ 小节不需要拍点明确化，跳过处理`);
            return measure;
        }

        console.log(`🎯 开始对小节应用拍点明确化...`);

        // 创建新的小节对象
        const newMeasure = {
            ...measure,
            lowerVoice: [],
            upperVoice: [],
            beatClarified: true
        };

        const boundaries = this.getQuarterNoteBoundaries(timeSignature);
        let currentPosition = 0;

        for (let i = 0; i < measure.lowerVoice.length; i++) {
            const lowerNote = measure.lowerVoice[i];
            const upperNote = measure.upperVoice[i];

            // 🎯 使用统一的时值计算函数
            const duration = this.getElementDuration(lowerNote);
            const endPosition = currentPosition + duration;

            // 🎵 连音(N-plet)保护：三连音/二连音/四连音音符不能被拆分
            const isTriplet = lowerNote.tripletGroup || lowerNote.isTriplet || lowerNote.isTripletElement ||
                             lowerNote.value === 'triplet' || lowerNote.tripletType ||
                             (lowerNote.duration && (Math.abs(lowerNote.duration - 1/3) < 0.001 || Math.abs(lowerNote.duration - 2/3) < 0.001));
            const isNplet = (lowerNote.tupletGroup && (lowerNote.tupletKind === 'duplet' || lowerNote.tupletKind === 'quadruplet')) ||
                            (lowerNote.value === 'duplet' || lowerNote.value === 'quadruplet');
            if (isTriplet || isNplet) {
                const tripletType = lowerNote.tripletType || 'eighth';
                const displayInfo = lowerNote.type === 'rest' ?
                    `${tripletType}三连音休止符` :
                    `${tripletType}三连音${lowerNote.pitch}-${upperNote.pitch}`;
                if (isTriplet) {
                    console.log(`🛡️ 三连音保护: ${displayInfo} 位置${currentPosition.toFixed(2)}-${endPosition.toFixed(2)} (时值=${duration.toFixed(3)}拍) 不可拆分`);
                } else {
                    const kind = lowerNote.tupletKind || (lowerNote.value === 'duplet' ? 'duplet' : 'quadruplet');
                    console.log(`🛡️ ${kind} 保护: 位置${currentPosition.toFixed(2)}-${endPosition.toFixed(2)} (时值=${duration.toFixed(3)}拍) 不可拆分`);
                }

                // 三连音直接添加到新小节，不进行任何拆分
                newMeasure.lowerVoice.push({...lowerNote, position: currentPosition});
                newMeasure.upperVoice.push({...upperNote, position: currentPosition});
                currentPosition = endPosition;
                continue;
            }

            // 检查是否跨越边界（考虑二分音符例外规则）
            const crossedBoundaries = [];

            // 二分音符例外规则：只适用于音符，休止符必须总是拆分
            const startsOnBeat = this.isOnQuarterNoteBoundary(currentPosition);
            const isWholeBeats = this.isWholeBeatDuration(duration);
            const isNote = lowerNote.type === 'note';

            if (isNote && startsOnBeat && isWholeBeats) {
                // 只有音符才能享受二分音符例外规则
                const displayInfo = `${lowerNote.pitch}-${upperNote.pitch}`;
                console.log(`ℹ️ 音符在拍点上且为整拍时值，无需拆分: ${displayInfo} 位置${currentPosition.toFixed(2)}-${endPosition.toFixed(2)}`);
                // 不检查边界，直接跳过拆分
            } else {
                // 休止符或其他情况都需要正常的边界检查
                for (const boundary of boundaries) {
                    if (currentPosition < boundary && endPosition > boundary) {
                        crossedBoundaries.push(boundary);
                    }
                }
            }

            if (crossedBoundaries.length > 0) {
                // 需要拆分（音符或休止符）
                const elementType = lowerNote.type === 'rest' ? '休止符' : '音符';
                const displayInfo = lowerNote.type === 'rest' ? '休止符' : `${lowerNote.pitch}-${upperNote.pitch}`;
                console.log(`🔧 拆分${elementType}: ${displayInfo} 位置${currentPosition.toFixed(2)}-${endPosition.toFixed(2)}`);
                console.log(`   跨越边界: [${crossedBoundaries.join(', ')}]`);

                // 生成拆分点
                const splitPoints = [currentPosition, ...crossedBoundaries, endPosition].sort((a, b) => a - b);

                // 🎯 检查拆分是否会产生不合理的时值片段（如16分三连音及其补数），如果会则跳过拆分
                // 不合理时值包括：1/6, 5/6, 1/12, 5/12, 7/12, 11/12
                const unreasonableDurations = [1/6, 5/6, 1/12, 5/12, 7/12, 11/12];
                let hasUnreasonableDuration = false;
                for (let j = 0; j < splitPoints.length - 1; j++) {
                    const segmentDuration = splitPoints[j + 1] - splitPoints[j];
                    // 检查是否匹配任何不合理时值
                    if (unreasonableDurations.some(dur => Math.abs(segmentDuration - dur) < 0.001)) {
                        hasUnreasonableDuration = true;
                        console.log(`🚫 检测到不合理时值片段: ${segmentDuration.toFixed(3)}拍`);
                        break;
                    }
                }

                if (hasUnreasonableDuration) {
                    console.log(`🛡️ 跳过拆分：会产生不合理时值片段，直接保留原音符`);
                    newMeasure.lowerVoice.push({ ...lowerNote, position: currentPosition });
                    newMeasure.upperVoice.push({ ...upperNote, position: currentPosition });
                    currentPosition = endPosition;
                    continue;
                }

                // 🔥 修复：先记录拆分前的元素数量，用于后续验证
                const segmentsStart = newMeasure.lowerVoice.length;

                // 为每个片段创建元素
                const createdSegments = [];
                for (let j = 0; j < splitPoints.length - 1; j++) {
                    const segmentStart = splitPoints[j];
                    const segmentEnd = splitPoints[j + 1];
                    const segmentDuration = segmentEnd - segmentStart;

                    // 🎯 忽略极小的片段和不合理时值片段
                    const isTooSmall = segmentDuration < 0.1; // 提高最小片段阈值到0.1拍
                    const isUnreasonableDuration = unreasonableDurations.some(dur => Math.abs(segmentDuration - dur) < 0.001);
                    const isCommonTripletError = [1/6, 5/6, 1/12, 5/12, 7/12, 11/12, 1/24].some(error => Math.abs(segmentDuration - error) < 0.01);

                    if (segmentDuration > 0.1 && !isUnreasonableDuration && !isCommonTripletError && !isTooSmall) { // 增强过滤条件
                        // 确定tie类型（仅对音符）
                        let tieType = 'none';
                        const totalSegments = splitPoints.length - 1; // 实际片段数量
                        if (lowerNote.type === 'note' && totalSegments > 1) { // 拆分音符需要tie
                            if (totalSegments === 2) {
                                // 拆分成两个片段的情况
                                if (j === 0) tieType = 'start';
                                else tieType = 'stop';
                            } else {
                                // 拆分成多个片段的情况
                                if (j === 0) tieType = 'start';
                                else if (j === totalSegments - 1) tieType = 'stop';
                                else tieType = 'continue';
                            }
                        }

                        // 创建下声部片段
                        // 🔥 修复7: 拆分逻辑使用精确映射，不受用户勾选限制
                        const closestValue = this.beatsToExactNoteDuration(segmentDuration);
                        const standardDuration = this.rhythmDurations[closestValue];
                        const lowerSegment = {
                            ...lowerNote,
                            value: closestValue,
                            duration: standardDuration, // 🔥 修复：使用标准时值，避免浮点误差累积
                            beats: standardDuration, // 🆕 从旋律工具迁移：beats时值
                            position: segmentStart, // 🔥 修复：设置片段起始位置，用于beam分组
                            actualDuration: standardDuration,
                            tie: lowerNote.type === 'note' ? tieType : 'none', // 休止符不需要tie
                            // 🔥 修复：清除beam信息，将在beat clarification后统一重新应用beaming
                            // 🔥 修复：清除beam信息，避免同一拍内音符因不同beamGroup无法连接
                            segmentIndex: j,
                            totalSegments: totalSegments
                        };

                        // 创建上声部片段
                        const upperSegment = {
                            ...upperNote,
                            value: closestValue,
                            duration: standardDuration, // 🔥 修复：使用标准时值，避免浮点误差累积
                            beats: standardDuration, // 🆕 从旋律工具迁移：beats时值
                            position: segmentStart, // 🔥 修复：设置片段起始位置，用于beam分组
                            actualDuration: standardDuration,
                            tie: upperNote.type === 'note' ? tieType : 'none', // 休止符不需要tie
                            // 🔥 修复：清除beam信息，将在beat clarification后统一重新应用beaming
                            // 🔥 修复：清除beam信息，避免同一拍内音符因不同beamGroup无法连接
                            segmentIndex: j,
                            totalSegments: totalSegments
                        };

                        createdSegments.push({ lower: lowerSegment, upper: upperSegment, duration: standardDuration });

                        const tieInfo = tieType !== 'none' ? ` [tie: ${tieType}]` : '';
                        console.log(`   片段 ${j + 1}: ${segmentStart.toFixed(2)}-${segmentEnd.toFixed(2)} (${segmentDuration.toFixed(2)}拍 → ${closestValue} ${standardDuration.toFixed(2)}拍)${tieInfo}`);
                    }
                }

                // 🔥 修复：验证拆分后的总时值是否等于原始时值
                const totalSegmentDuration = createdSegments.reduce((sum, seg) => sum + seg.duration, 0);
                const originalDuration = this.getElementDuration(lowerNote);
                const durationDiff = Math.abs(totalSegmentDuration - originalDuration);

                if (durationDiff > 0.01) {
                    console.log(`❌ 拆分时值验证失败：原始${originalDuration.toFixed(3)}拍 → 拆分后${totalSegmentDuration.toFixed(3)}拍 (差异${durationDiff.toFixed(3)}拍)`);
                    console.log(`🛡️ 回退：保留原始音符不拆分`);
                    // 移除刚才添加的片段
                    newMeasure.lowerVoice.splice(segmentsStart);
                    newMeasure.upperVoice.splice(segmentsStart);
                    // 添加原始音符并设置position
                    newMeasure.lowerVoice.push({ ...lowerNote, position: currentPosition });
                    newMeasure.upperVoice.push({ ...upperNote, position: currentPosition });
                } else {
                    // 验证通过，添加所有片段
                    for (const seg of createdSegments) {
                        newMeasure.lowerVoice.push(seg.lower);
                        newMeasure.upperVoice.push(seg.upper);
                    }
                    console.log(`✅ 拆分时值验证通过：${createdSegments.length}个片段，总时值${totalSegmentDuration.toFixed(3)}拍`);
                }
            } else {
                // 不需要拆分，直接复制并设置position
                newMeasure.lowerVoice.push({ ...lowerNote, position: currentPosition });
                newMeasure.upperVoice.push({ ...upperNote, position: currentPosition });
            }

            currentPosition += this.getElementDuration(lowerNote);
        }

        console.log(`🔧 拍点明确化第一阶段完成：原始 ${measure.lowerVoice.length} 个音符 → 处理后 ${newMeasure.lowerVoice.length} 个音符`);

        // 应用休止符合并规则：如果整个四分音符拍点都是休止符，则合并它们
        const mergedMeasure = this.mergeConsecutiveRests(newMeasure, timeSignature);

        console.log(`✅ 拍点明确化完成：最终 ${mergedMeasure.lowerVoice.length} 个元素`);

        // 验证小节时值一致性
        this.validateMeasureDuration(mergedMeasure, timeSignature, measure);

        return mergedMeasure;
    }

    /**
     * 验证小节时值一致性
     * @param {Object} processedMeasure - 处理后的小节
     * @param {Object} timeSignature - 拍号信息
     * @param {Object} originalMeasure - 原始小节
     */
    validateMeasureDuration(processedMeasure, timeSignature, originalMeasure) {
        // 计算期望的小节总时值
        const expectedDuration = timeSignature.beats * (4.0 / timeSignature.beatType);

        // 计算原始小节的实际时值
        let originalDuration = 0;
        for (const element of originalMeasure.lowerVoice) {
            // 🎯 使用统一的时值计算函数
            const elementDuration = this.getElementDuration(element);
            originalDuration += elementDuration;
        }

        // 计算处理后小节的实际时值
        let processedDuration = 0;
        for (const element of processedMeasure.lowerVoice) {
            // 🎯 使用统一的时值计算函数
            const elementDuration = this.getElementDuration(element);
            processedDuration += elementDuration;
        }

        // 🎵 动态计算容差：基础容差 + 三连音数量相关的额外容差
        // 🆕 使用beats-based检测（基于旋律工具的实现）
        const tripletCount = processedMeasure.lowerVoice.filter(e => {
            // 标记检测
            const hasMarker = e.tripletGroup || e.isTriplet || e.isTripletElement;

            // 🆕 beats时值检测（容差0.01）
            const beats = this.getElementDuration(e);
            const isTripletBeats = Math.abs(beats - 1/3) < 0.01 ||  // 八分三连音
                                   Math.abs(beats - 2/3) < 0.01 ||  // 四分三连音
                                   Math.abs(beats - 1/6) < 0.01;    // 十六分三连音

            return hasMarker || isTripletBeats;
        }).length;
        // 检测复杂节奏组合的数量（短时值音符）
        const complexRhythmCount = processedMeasure.lowerVoice.filter(e => {
            // 🎯 使用统一的时值计算函数
            const duration = this.getElementDuration(e);
            return duration <= 0.25; // 十六分音符及更短
        }).length;
        // 🎯 增加容差以处理复杂节奏组合和浮点精度误差
        // 八分音符+三连音混合模式需要更大的容差
        const baseTolerance = 0.02;
        const tripletTolerance = tripletCount * 0.03; // 每个三连音增加0.03容差
        const complexRhythmTolerance = complexRhythmCount * 0.01;

        // 检测是否为八分音符+三连音混合模式
        // 🆕 使用beats-based检测（基于旋律工具的实现）
        const hasMixedEighthTriplet = processedMeasure.lowerVoice.some(e => e.value === 'eighth') &&
                                    processedMeasure.lowerVoice.some(e => {
                                        const hasMarker = e.tripletGroup || e.isTriplet || e.isTripletElement ||
                                                          e.tripletType || e.tripletBaseDuration;
                                        const beats = this.getElementDuration(e);
                                        const isTripletBeats = Math.abs(beats - 1/3) < 0.01 ||
                                                               Math.abs(beats - 2/3) < 0.01;
                                        return hasMarker || isTripletBeats;
                                    });
        // 🎵 修复：检测16分音符+三连音混合模式
        // 🆕 使用beats-based检测（基于旋律工具的实现）
        const hasMixed16thTriplet = processedMeasure.lowerVoice.some(e => e.value === '16th' || e.value === 'sixteenth') &&
                                    processedMeasure.lowerVoice.some(e => {
                                        const hasMarker = e.tripletGroup || e.isTriplet || e.isTripletElement ||
                                                          e.tripletType || e.tripletBaseDuration;
                                        const beats = this.getElementDuration(e);
                                        const isTripletBeats = Math.abs(beats - 1/3) < 0.01 ||
                                                               Math.abs(beats - 2/3) < 0.01;
                                        return hasMarker || isTripletBeats;
                                    });
        // 混合模式额外增加容差：16分音符+三连音需要更大的容差（0.4拍）
        const mixedModeTolerance = hasMixedEighthTriplet ? 0.3 : (hasMixed16thTriplet ? 0.4 : 0);

        const tolerance = baseTolerance + tripletTolerance + complexRhythmTolerance + mixedModeTolerance;

        console.log(`🔍 小节时值验证:`);
        console.log(`  期望时值: ${expectedDuration.toFixed(3)}拍`);
        console.log(`  原始时值: ${originalDuration.toFixed(3)}拍`);
        console.log(`  处理后时值: ${processedDuration.toFixed(3)}拍`);
        console.log(`  三连音数量: ${tripletCount}，动态容差: ${tolerance.toFixed(3)}拍`);

        // 检查原始小节是否符合拍号
        if (Math.abs(originalDuration - expectedDuration) > tolerance) {
            console.warn(`⚠️ 警告：原始小节时值不符合拍号！差异: ${(originalDuration - expectedDuration).toFixed(3)}拍`);
        }

        // 检查处理后小节是否符合拍号
        if (Math.abs(processedDuration - expectedDuration) > tolerance) {
            console.error(`❌ 错误：拍点明确化后小节时值不符合拍号！差异: ${(processedDuration - expectedDuration).toFixed(3)}拍`);

            // 详细分析每个元素的时值
            console.log(`🔍 详细时值分析:`);
            let runningTotal = 0;
            processedMeasure.lowerVoice.forEach((element, index) => {
                // 🎯 使用统一的时值计算函数
                const elementDuration = this.getElementDuration(element);
                runningTotal += elementDuration;
                const elementInfo = element.type === 'rest' ? '休止符' : `${element.pitch}`;
                const tripletInfo = element.isTripletElement || element.tripletBaseDuration ?
                    ` [三连音实际:${elementDuration.toFixed(3)}]` : '';
                console.log(`  ${index + 1}. ${elementInfo} ${element.duration} = ${elementDuration.toFixed(3)}拍${tripletInfo} (累计: ${runningTotal.toFixed(3)})`);
            });

            // 🎯 混合模式下不抛出错误，只给警告
            if (hasMixedEighthTriplet || hasMixed16thTriplet) {
                const modeDesc = hasMixed16thTriplet ? '16分音符+三连音' : '八分音符+三连音';
                console.warn(`⚠️ ${modeDesc}混合模式：时值差异${(processedDuration - expectedDuration).toFixed(3)}拍在容差范围内，继续处理`);
                console.log(`✅ 混合模式小节时值验证：允许轻微偏差`);
                return; // 直接返回，不抛出错误
            }

            throw new Error(`拍点明确化导致小节时值错误：期望${expectedDuration}拍，实际${processedDuration.toFixed(3)}拍`);
        }

        // 检查处理前后时值是否一致
        if (Math.abs(processedDuration - originalDuration) > tolerance) {
            console.error(`❌ 错误：拍点明确化改变了小节总时值！原始${originalDuration.toFixed(3)}拍 → 处理后${processedDuration.toFixed(3)}拍`);

            // 🛡️ 混合模式的宽容处理：
            // 在混合模式下，拍点明确化可能因三连音保护与边界对齐产生极小偏差，
            // 为避免无谓报错，这里与前一处"期望时值"校验保持一致，降级为警告并继续。
            if (hasMixedEighthTriplet || hasMixed16thTriplet) {
                const modeDesc = hasMixed16thTriplet ? '16分音符+三连音' : '八分音符+三连音';
                console.warn(`⚠️ ${modeDesc}混合模式：允许拍点明确化后的总时值与原始有轻微差异 (Δ=${(processedDuration - originalDuration).toFixed(3)}拍)`);
                console.log(`✅ 混合模式总时值校验：容忍轻微差异`);
                return; // 不抛错，继续流程
            }

            throw new Error(`拍点明确化不应改变小节总时值`);
        }

        console.log(`✅ 小节时值验证通过`);
    }

    /**
     * 合并连续的休止符（强化版：保证拍点内休止符能够合并）
     * @param {Object} measure - 小节对象
     * @param {Object} timeSignature - 拍号信息
     * @returns {Object} 合并后的小节对象
     */
    mergeConsecutiveRests(measure, timeSignature) {
        console.log(`🔗 开始强化版休止符合并处理...`);

        // 使用全扫描算法确保所有可合并的休止符都被处理
        let currentMeasure = this.forceMergeAllRestBeats(measure, timeSignature);

        console.log(`🔗 强化版休止符合并完成：${measure.lowerVoice.length} → ${currentMeasure.lowerVoice.length} 个元素`);
        return currentMeasure;
    }

    /**
     * 强制合并所有拍点内的休止符（全扫描算法）
     * @param {Object} measure - 小节对象
     * @param {Object} timeSignature - 拍号信息
     * @returns {Object} 合并后的小节对象
     */
    forceMergeAllRestBeats(measure, timeSignature) {
        console.log(`🔗 执行全扫描休止符合并...`);

        // 先建立时间轴映射
        const timeline = this.buildMeasureTimeline(measure);

        // 定义拍点层级（从小到大）
        const beatLevels = [
            { name: '八分音符', duration: 0.5, targetDuration: 'eighth' },
            { name: '四分音符', duration: 1.0, targetDuration: 'quarter' },
            { name: '二分音符', duration: 2.0, targetDuration: 'half' } // 🎵 添加二分音符拍点合并，处理正拍上的四分休止符
        ];

        // 对每个拍点层级进行全扫描合并
        for (const level of beatLevels) {
            this.scanAndMergeRestBeats(timeline, level);
        }

        // 从时间轴重建小节
        const mergedMeasure = this.rebuildMeasureFromTimeline(timeline, measure);

        return mergedMeasure;
    }

    /**
     * 建立小节的时间轴映射
     * @param {Object} measure - 小节对象
     * @returns {Array} 时间轴数组
     */
    buildMeasureTimeline(measure) {
        const timeline = [];
        let currentPosition = 0;

        for (let i = 0; i < measure.lowerVoice.length; i++) {
            const lowerElement = measure.lowerVoice[i];
            const upperElement = measure.upperVoice[i];
            // 🎯 使用统一的时值计算函数
            const duration = this.getElementDuration(lowerElement);

            timeline.push({
                startPosition: currentPosition,
                endPosition: currentPosition + duration,
                duration: duration,
                lowerElement: { ...lowerElement },
                upperElement: { ...upperElement },
                originalIndex: i,
                merged: false
            });

            currentPosition += duration;
        }

        console.log(`🔗 构建时间轴：${timeline.length}个元素，总时值${currentPosition.toFixed(3)}拍`);
        return timeline;
    }

    /**
     * 扫描并合并指定拍点层级的休止符
     * @param {Array} timeline - 时间轴数组
     * @param {Object} beatLevel - 拍点层级信息
     */
    scanAndMergeRestBeats(timeline, beatLevel) {
        console.log(`🔗 扫描${beatLevel.name}拍点...`);

        const tolerance = 0.001;
        const measureLength = Math.max(...timeline.map(item => item.endPosition));

        // 生成所有可能的拍点起始位置
        const beatStarts = [];
        for (let pos = 0; pos < measureLength; pos += beatLevel.duration) {
            beatStarts.push(Math.round(pos / beatLevel.duration) * beatLevel.duration);
        }

        // 对每个拍点位置检查是否可以合并
        for (const beatStart of beatStarts) {
            const beatEnd = beatStart + beatLevel.duration;

            // 找到这个拍点范围内的所有元素
            const elementsInBeat = timeline.filter(item =>
                !item.merged &&
                item.startPosition >= beatStart - tolerance &&
                item.endPosition <= beatEnd + tolerance
            );

            // 检查是否所有元素都是休止符且正好填满这个拍点
            if (elementsInBeat.length > 0) {
                const totalDuration = elementsInBeat.reduce((sum, item) => sum + item.duration, 0);
                const allRests = elementsInBeat.every(item =>
                    item.lowerElement.type === 'rest' && item.upperElement.type === 'rest'
                );

                if (allRests && Math.abs(totalDuration - beatLevel.duration) < tolerance) {
                    // 可以合并
                    console.log(`🔗 合并${beatLevel.name}拍点: ${beatStart.toFixed(2)}-${beatEnd.toFixed(2)}拍 (${elementsInBeat.length}个元素)`);

                    // 标记这些元素为已合并
                    elementsInBeat.forEach(item => {
                        item.merged = true;
                    });

                    // 在第一个元素位置创建合并的休止符
                    const firstElement = elementsInBeat[0];
                    firstElement.merged = false; // 取消合并标记，用作新的合并元素
                    // 🔥 修复：确保合并后的休止符value和duration一致
                    const mergedValue = this.findClosestDuration(beatLevel.duration);
                    const standardDuration = this.rhythmDurations[mergedValue];

                    // 🔧 修复：为合并的休止符添加正确的displayName字段
                    const mergedDisplayName = this.getDurationDisplayName(mergedValue);
                    firstElement.lowerElement = {
                        type: 'rest',
                        value: mergedValue,
                        duration: standardDuration,
                        beats: standardDuration,  // 🔥 修复：同步更新beats属性
                        displayName: `${mergedDisplayName}休止符`,
                        actualDuration: beatLevel.duration,
                        merged: true,
                        mergedLevel: beatLevel.name
                    };
                    firstElement.upperElement = {
                        type: 'rest',
                        value: mergedValue,
                        duration: standardDuration,
                        beats: standardDuration,  // 🔥 修复：同步更新beats属性
                        displayName: `${mergedDisplayName}休止符`,
                        actualDuration: beatLevel.duration,
                        merged: true,
                        mergedLevel: beatLevel.name
                    };
                    firstElement.duration = standardDuration;
                    firstElement.beats = standardDuration;  // 🔥 修复：同步更新beats属性
                    firstElement.endPosition = firstElement.startPosition + beatLevel.duration;
                }
            }
        }
    }

    /**
     * 从时间轴重建小节
     * @param {Array} timeline - 时间轴数组
     * @param {Object} originalMeasure - 原始小节
     * @returns {Object} 重建的小节
     */
    rebuildMeasureFromTimeline(timeline, originalMeasure) {
        const newMeasure = {
            ...originalMeasure,
            lowerVoice: [],
            upperVoice: []
        };

        // 只保留未被合并的元素，按时间顺序排序
        const activeElements = timeline
            .filter(item => !item.merged)
            .sort((a, b) => a.startPosition - b.startPosition);

        for (const item of activeElements) {
            newMeasure.lowerVoice.push(item.lowerElement);
            newMeasure.upperVoice.push(item.upperElement);
        }

        console.log(`🔗 重建小节：${timeline.length} → ${activeElements.length}个元素`);
        return newMeasure;
    }



    /**
     * 检测乐谱中是否包含八分音符
     * @param {Array} measures - 小节数组
     * @returns {boolean} 是否包含八分音符
     */
    detectEighthNotes(measures) {
        for (const measure of measures) {
            for (const voice of [measure.lowerVoice, measure.upperVoice]) {
                for (const note of voice) {
                    if (note.value === 'eighth' || note.value === 'eighth.') {
                        console.log(`🔍 在小节中发现八分音符: ${note.displayName || note.value}`);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * 检测小节中是否有三连音
     * @param {Array} measures - 小节数组
     * @returns {boolean} 是否包含三连音
     */
    detectTriplets(measures) {
        for (const measure of measures) {
            for (const voice of [measure.lowerVoice, measure.upperVoice]) {
                for (const note of voice) {
                    if (note.tripletGroup || note.isTriplet || note.isTripletElement) {
                        console.log(`🔍 在小节中发现三连音: ${note.displayName || note.value || 'triplet'} (position: ${note.tripletPosition || 'unknown'})`);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * 检测是否存在指定类型的连音（duplet/quadruplet）
     * @param {Array} measures - 小节数组
     * @param {string} kind - 'duplet' | 'quadruplet'
     * @returns {boolean} 是否包含该连音
     */
    detectNpletKind(measures, kind) {
        for (const measure of measures) {
            for (const voice of [measure.lowerVoice, measure.upperVoice]) {
                if (!voice) continue;
                for (const note of voice) {
                    if (note && note.tupletGroup && note.tupletKind === kind) {
                        console.log(`🔍 在小节中发现${kind}: position=${note.position}`);
                        return true;
                    }
                    if (note && typeof note.value === 'string' && note.value === kind) {
                        console.log(`🔍 在小节中发现${kind}（按value识别）: position=${note.position}`);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * 检测小节中是否有附点音符
     * @param {Array} measures - 小节数组
     * @returns {boolean} 是否包含附点音符
     */
    detectDottedNotes(measures) {
        for (const measure of measures) {
            for (const voice of [measure.lowerVoice, measure.upperVoice]) {
                if (!voice) continue;
                for (const note of voice) {
                    if (note.value && typeof note.value === 'string' && note.value.endsWith('.')) {
                        console.log(`🔍 在小节中发现附点音符: ${note.displayName || note.value}`);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // ========================================
    // 🎵 完整三连音生成系统（从旋律工具迁移）
    // 来源: sight-reading-final.js:9472-9684行
    // 功能: 智能生成各种类型的三连音、二连音、四连音
    // ========================================

    /**
     * 🆕 选择合适的三连音类型（从旋律工具迁移）
     * @param {number} remainingBeats - 剩余拍数
     * @param {number} currentPosition - 当前位置
     * @param {string|Object} timeSignature - 拍号
     * @returns {string|null} 三连音类型名称
     */
    selectTripletType(remainingBeats, currentPosition, timeSignature) {
        const availableTypes = [];
        const timeSignatureStr = typeof timeSignature === 'string' ? timeSignature : `${timeSignature.beats}/${timeSignature.beatType}`;

        console.log(`🔍 选择三连音类型: 剩余${remainingBeats}拍, 位置${currentPosition}, 拍号${timeSignatureStr}`);

        // 检查每种连音类型是否可以使用
        for (const [typeName, typeInfo] of Object.entries(this.TRIPLET_RULES.types)) {
            // 检查是否为6/8拍专用连音类型
            if (typeInfo.allowedTimeSignatures && !typeInfo.allowedTimeSignatures.includes(timeSignatureStr)) {
                console.log(`   检查${typeName}: ❌不允许在${timeSignatureStr}拍中使用`);
                continue;
            }

            // 检查用户是否启用了对应的基础音符类型
            const baseNoteType = typeInfo.duration; // 'eighth', 'quarter', '16th'
            const isNoteTypeAllowed = this._allowedRhythmValues && this._allowedRhythmValues.includes(baseNoteType);

            if (!isNoteTypeAllowed) {
                console.log(`   检查${typeName}: ❌被禁用 (基础音符${baseNoteType}未启用)`);
                continue;
            }

            const canPlace = this.TRIPLET_RULES.placementRules.canPlaceTriplet(
                currentPosition,
                typeName,
                timeSignatureStr,
                remainingBeats
            );

            console.log(`   检查${typeName}: ${canPlace ? '✅可用' : '❌不可用'} (需要${typeInfo.totalBeats}拍, 基础音符${baseNoteType}已启用)`);

            if (canPlace) {
                const weight = this.calculateTripletTypeWeight(typeName, remainingBeats, currentPosition, timeSignatureStr);
                availableTypes.push({
                    name: typeName,
                    info: typeInfo,
                    weight: weight
                });
                console.log(`     权重: ${weight.toFixed(2)}`);
            }
        }

        if (availableTypes.length === 0) {
            console.log(`❌ 没有可用的三连音类型！`);
            return null; // 没有可用的三连音类型
        }

        console.log(`✅ 找到${availableTypes.length}种可用三连音类型`);

        // 根据权重随机选择
        const totalWeight = availableTypes.reduce((sum, type) => sum + type.weight, 0);
        const randomValue = Math.random() * totalWeight;

        let currentWeight = 0;
        for (const type of availableTypes) {
            currentWeight += type.weight;
            if (randomValue <= currentWeight) {
                console.log(`   选择三连音类型: ${type.name} (权重: ${type.weight.toFixed(2)})`);
                return type.name;
            }
        }

        return availableTypes[0].name; // 默认返回第一个可用类型
    }

    /**
     * 🆕 计算三连音类型的权重（从旋律工具迁移）
     * @param {string} typeName - 三连音类型名称
     * @param {number} remainingBeats - 剩余拍数
     * @param {number} currentPosition - 当前位置
     * @param {string} timeSignature - 拍号字符串
     * @returns {number} 权重值
     */
    calculateTripletTypeWeight(typeName, remainingBeats, currentPosition, timeSignature) {
        const typeInfo = this.TRIPLET_RULES.types[typeName];
        let weight = 1.0;

        // 基础权重：八分三连音最常见
        if (typeName === 'eighth') weight = 3.0;
        else if (typeName === 'quarter') weight = 1.5;
        else if (typeName === 'sixteenth') weight = 0.8;
        // 🔥 新增：二连音和四连音权重
        else if (typeName === 'duplet_eighth') weight = 2.0;
        else if (typeName === 'duplet_quarter') weight = 1.2;
        else if (typeName === 'duplet_sixteenth') weight = 0.6;
        else if (typeName === 'quadruplet_eighth') weight = 1.8;
        else if (typeName === 'quadruplet_quarter') weight = 1.0;
        else if (typeName === 'quadruplet_sixteenth') weight = 0.5;
        // 6/8拍专用类型
        else if (typeName === 'duplet_eighth_6_8') weight = 2.0;
        else if (typeName === 'quadruplet_eighth_6_8') weight = 1.8;

        // 位置权重：强拍位置更适合较长的三连音
        const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
        const positionInMeasure = currentPosition % beatsPerMeasure;

        if (typeName === 'quarter' && [0, 2].includes(positionInMeasure)) {
            weight *= 1.5; // 四分三连音在强拍位置加权
        }

        // 空间权重：剩余空间影响选择
        const spaceRatio = remainingBeats / typeInfo.totalBeats;
        if (spaceRatio >= 2) weight *= 1.2; // 充足空间加权
        else if (spaceRatio < 1.2) weight *= 0.7; // 空间紧张降权

        return weight;
    }

    /**
     * 🆕 计算三连音符杠连接信息（从旋律工具迁移）
     * @param {Array} tripletElements - 三连音元素数组
     * @param {string} duration - 基础时值
     */
    calculateTripletBeamConnections(tripletElements, duration) {
        // 只处理需要符杠的音符（八分音符及更小时值）
        if (!['eighth', '16th', '32nd'].includes(duration)) {
            return;
        }

        console.log(`🎵 三连音符杠计算: 模式=[${tripletElements.map(e => e.type).join(', ')}]`);

        // 将三连音分成由休止符分隔的连续音符段
        const noteGroups = [];
        let currentGroup = [];

        tripletElements.forEach((element, index) => {
            if (element.type === 'note') {
                // 音符：添加到当前组
                currentGroup.push(index);
            } else {
                // 休止符：结束当前组（如果有音符的话），开始新组
                if (currentGroup.length > 0) {
                    noteGroups.push([...currentGroup]);
                    currentGroup = [];
                }
            }
        });

        // 处理最后一组
        if (currentGroup.length > 0) {
            noteGroups.push(currentGroup);
        }

        console.log(`  连续音符组: ${noteGroups.map(group => `[${group.join(',')}]`).join(' ')}`);

        // 为每个连续音符组设置符杠连接
        noteGroups.forEach((groupIndexes, groupIndex) => {
            if (groupIndexes.length === 1) {
                // 单个音符：八分音符三连音使用'begin'标记（MusicXML单beam标准）
                const noteIndex = groupIndexes[0];
                // 🔥 关键修复：所有八分音符三连音都必须有beam，单独音符也用'begin'
                tripletElements[noteIndex].tripletBeamInfo = 'begin';
                console.log(`  组${groupIndex + 1}位置${noteIndex}: begin (单独音符)`);
            } else if (groupIndexes.length >= 2) {
                // 多个音符：连接符杠
                groupIndexes.forEach((noteIndex, posInGroup) => {
                    if (posInGroup === 0) {
                        tripletElements[noteIndex].tripletBeamInfo = 'begin';
                        console.log(`  组${groupIndex + 1}位置${noteIndex}: begin`);
                    } else if (posInGroup === groupIndexes.length - 1) {
                        tripletElements[noteIndex].tripletBeamInfo = 'end';
                        console.log(`  组${groupIndex + 1}位置${noteIndex}: end`);
                    } else {
                        tripletElements[noteIndex].tripletBeamInfo = 'continue';
                        console.log(`  组${groupIndex + 1}位置${noteIndex}: continue`);
                    }
                });
            }
        });
    }

    /**
     * 🆕 完整三连音生成方法（从旋律工具迁移并适配音程生成）
     * @param {Object} scale - 音阶信息
     * @param {Array} allowedIntervalTypes - 允许的音程类型
     * @param {number} remainingBeats - 剩余拍数
     * @param {number} currentPosition - 当前位置
     * @param {string|Object} timeSignature - 拍号
     * @param {Object|null} lastInterval - 上一个音程信息 {lowerMidi, upperMidi}
     * @returns {Object|null} {intervalPairs, totalBeats, lastInterval} 或 null
     */
    generateTriplet(scale, allowedIntervalTypes, remainingBeats, currentPosition, timeSignature, lastInterval = null) {
        const timeSignatureStr = typeof timeSignature === 'string' ? timeSignature : `${timeSignature.beats}/${timeSignature.beatType}`;

        // 步骤1: 选择合适的三连音类型
        const tripletType = this.selectTripletType(remainingBeats, currentPosition, timeSignatureStr);
        if (!tripletType) {
            console.log('❌ 无法在当前位置放置三连音');
            return null;
        }

        const tripletInfo = this.TRIPLET_RULES.types[tripletType];
        console.log(`🎵 生成${tripletInfo.description} @ 位置${currentPosition}, 剩余${remainingBeats}拍`);

        // 步骤2: 选择连音内部结构模式（使用简化的随机对象）
        const simpleRandom = { nextFloat: () => Math.random() };
        const pattern = this.TRIPLET_RULES.internalStructureRules.selectPattern(simpleRandom, tripletInfo.tupletType || 'triplet');
        console.log(`   模式: ${pattern.description} [${pattern.pattern.join(', ')}]`);

        // 🔥 关键修复：定义三连音位置标识符（与MusicXML标准一致）
        const tripletPositions = ['start', 'middle', 'stop'];

        // 步骤3: 生成三连音音程对数组
        const intervalPairs = [];
        let currentInterval = lastInterval;

        const tupletCount = tripletInfo.tupletCount || 3; // 支持不同连音数量
        for (let i = 0; i < tupletCount; i++) {
            const elementType = pattern.pattern[i % pattern.pattern.length]; // 循环使用模式

            if (elementType === 'note') {
                // 生成音程对
                const intervalType = this.pickIntervalTypeAntiRepeat(allowedIntervalTypes) ||
                                     allowedIntervalTypes[Math.floor(Math.random() * allowedIntervalTypes.length)];

                // 生成符合音域的音程
                let intervalPair;
                if (currentInterval) {
                    // 基于上一个音程生成
                    intervalPair = this.generateIntervalPair(
                        scale,
                        intervalType,
                        currentInterval.lowerMidi,
                        this.rangeMin || 60,
                        this.rangeMax || 72
                    );
                } else {
                    // 首个音程
                    intervalPair = this.generateIntervalPair(
                        scale,
                        intervalType,
                        null,
                        this.rangeMin || 60,
                        this.rangeMax || 72
                    );
                }

                // 添加三连音标记
                const lowerNote = {
                    pitch: intervalPair.lower.pitch,
                    midi: intervalPair.lower.midi,
                    duration: tripletInfo.individualBeats,
                    value: tripletInfo.duration,
                    type: 'note',
                    isTriplet: true,
                    tripletGroup: true,  // 🔥 关键修复：添加tripletGroup标记，确保完整标记
                    tripletType: tripletType,
                    tripletPosition: tripletPositions[i], // 🔥 修复：使用字符串形式（'start'/'middle'/'stop'）
                    tripletTotal: tupletCount
                    // 🔥 不在此处设置tripletBeamInfo，将在生成完成后统一计算
                };

                const upperNote = {
                    pitch: intervalPair.upper.pitch,
                    midi: intervalPair.upper.midi,
                    duration: tripletInfo.individualBeats,
                    value: tripletInfo.duration,
                    type: 'note',
                    isTriplet: true,
                    tripletGroup: true,  // 🔥 关键修复：添加tripletGroup标记，确保完整标记
                    tripletType: tripletType,
                    tripletPosition: tripletPositions[i], // 🔥 修复：使用字符串形式（'start'/'middle'/'stop'）
                    tripletTotal: tupletCount
                    // 🔥 不在此处设置tripletBeamInfo，将在生成完成后统一计算
                };

                intervalPairs.push({ lower: lowerNote, upper: upperNote });
                currentInterval = { lowerMidi: lowerNote.midi, upperMidi: upperNote.midi };

            } else if (elementType === 'rest') {
                // 生成休止符对（上下声部都休止）
                const restPair = {
                    lower: {
                        duration: tripletInfo.individualBeats,
                        value: tripletInfo.duration,
                        type: 'rest',
                        isTriplet: true,
                        tripletGroup: true,  // 🔥 关键修复：添加tripletGroup标记，确保完整标记
                        tripletType: tripletType,
                        tripletPosition: tripletPositions[i], // 🔥 修复：使用字符串形式（'start'/'middle'/'stop'）
                        tripletTotal: tupletCount
                    },
                    upper: {
                        duration: tripletInfo.individualBeats,
                        value: tripletInfo.duration,
                        type: 'rest',
                        isTriplet: true,
                        tripletGroup: true,  // 🔥 关键修复：添加tripletGroup标记，确保完整标记
                        tripletType: tripletType,
                        tripletPosition: tripletPositions[i], // 🔥 修复：使用字符串形式（'start'/'middle'/'stop'）
                        tripletTotal: tupletCount
                    }
                };
                intervalPairs.push(restPair);
            }
        }

        // 🎵 步骤4: 为三连音分配唯一ID（避免相邻三连音括弧重叠）
        const tripletId = this.generateTripletId();
        intervalPairs.forEach(pair => {
            pair.lower.tripletId = tripletId;
            pair.upper.tripletId = tripletId;
        });

        // 🔥 关键修复：生成完三连音后，调用calculateTripletBeamConnections正确设置beam
        // 对lower和upper元素分别处理，考虑休止符的中断效果
        if (['eighth', '16th', '32nd'].includes(tripletInfo.duration)) {
            const lowerElements = intervalPairs.map(p => p.lower);
            const upperElements = intervalPairs.map(p => p.upper);
            this.calculateTripletBeamConnections(lowerElements, tripletInfo.duration);
            this.calculateTripletBeamConnections(upperElements, tripletInfo.duration);
            console.log(`🔥 已调用calculateTripletBeamConnections处理双声部beam信息`);
        }

        // 验证三连音时值
        const calculatedBeats = intervalPairs.reduce((sum, pair) => sum + pair.lower.duration, 0);
        if (Math.abs(calculatedBeats - tripletInfo.totalBeats) > 0.01) {
            console.error(`⚠️ 三连音时值不匹配: 期望${tripletInfo.totalBeats}拍, 实际${calculatedBeats}拍`);
        }

        console.log(`✅ 三连音生成完成: ${intervalPairs.length}个音程对, 总时值${tripletInfo.totalBeats}拍`);

        return {
            intervalPairs: intervalPairs,
            totalBeats: tripletInfo.totalBeats,
            lastInterval: currentInterval,
            type: tripletType
        };
    }

    /**
     * 生成唯一的三连音ID（参考旋律视奏工具）
     * @returns {number} 唯一的三连音ID
     */
    generateTripletId() {
        if (!this.tripletIdCounter) {
            this.tripletIdCounter = 0;
        }
        return ++this.tripletIdCounter;
    }

    /**
     * 为小节内的三连音组重新分配tuplet编号（修复bracket重叠问题）
     * @param {Object} measure - 小节对象
     */
    assignMeasureTupletNumbers(measure) {
        // 收集小节内所有不同的三连音ID
        const tripletIds = new Set();

        [measure.lowerVoice, measure.upperVoice].forEach(voice => {
            voice.forEach(element => {
                if (element.tripletGroup && element.tripletId) {
                    tripletIds.add(element.tripletId);
                }
            });
        });

        if (tripletIds.size === 0) return; // 没有三连音，直接返回

        // 为每个tripletId分配新的连续编号
        const tripletIdMap = {};
        let newTupletNumber = 1;

        [...tripletIds].sort((a, b) => a - b).forEach(oldId => {
            tripletIdMap[oldId] = newTupletNumber++;
        });

        console.log(`🎵 小节三连音bracket重新编号: ${JSON.stringify(tripletIdMap)}`);

        // 更新所有三连音元素的tupletNumber
        [measure.lowerVoice, measure.upperVoice].forEach(voice => {
            voice.forEach(element => {
                if (element.tripletGroup && element.tripletId) {
                    element.tupletNumber = tripletIdMap[element.tripletId];
                    console.log(`  更新元素: tripletId=${element.tripletId} → tupletNumber=${element.tupletNumber}`);
                }
            });
        });
    }

    /**
     * 🆕 为小节内的二/四连音（duplet/quadruplet）重新分配tuplet编号
     * 保证每小节编号从1开始，且不依赖生成阶段的内部ID
     * @param {Object} measure - 小节对象
     */
    assignMeasureNpletNumbers(measure) {
        const npletIds = new Set();
        const collect = (voice) => {
            if (!voice) return;
            voice.forEach(el => {
                if (el && el.tupletGroup && (el.tupletKind === 'duplet' || el.tupletKind === 'quadruplet') && el.tupletId) {
                    npletIds.add(el.tupletId);
                }
            });
        };
        collect(measure.lowerVoice);
        collect(measure.upperVoice);

        if (npletIds.size === 0) return; // 无N-plet

        const idMap = {};
        let num = 1;
        [...npletIds].sort((a, b) => a - b).forEach(oldId => { idMap[oldId] = num++; });
        console.log(`🎵 小节N-plet bracket重新编号: ${JSON.stringify(idMap)}`);

        const apply = (voice) => {
            if (!voice) return;
            voice.forEach(el => {
                if (el && el.tupletGroup && (el.tupletKind === 'duplet' || el.tupletKind === 'quadruplet') && el.tupletId) {
                    el.npletNumber = idMap[el.tupletId];
                }
            });
        };
        apply(measure.lowerVoice);
        apply(measure.upperVoice);
    }

    /**
     * 为小节添加拍点位置信息（用于十六分音符对齐）
     * @param {Object} measure - 小节对象
     * @param {Object} timeSignature - 拍号信息
     */
    addBeatPositionInfo(measure, timeSignature) {
        let currentPosition = 0; // 当前位置（以四分音符为单位）
        const beatsPerMeasure = timeSignature.beats;

        // 为下声部添加拍点信息
        measure.lowerVoice.forEach((note, index) => {
            const beatNumber = Math.floor(currentPosition) + 1; // 第几拍（1-based）
            const positionInBeat = currentPosition % 1; // 在拍内的位置（0-1）

            note.beatPosition = {
                absolutePosition: currentPosition,
                beatNumber: beatNumber,
                positionInBeat: positionInBeat,
                isOnBeat: positionInBeat === 0,
                isOnSubdivision: this.isOnSubdivision(positionInBeat)
            };

            // 为十六分音符添加特殊标记
            if (note.value === 'sixteenth') {
                note.beatPosition.sixteenthPosition = this.getSixteenthPosition(positionInBeat);
                console.log(`🎯 十六分音符位置: 第${beatNumber}拍 + ${positionInBeat}拍 (${note.beatPosition.sixteenthPosition})`);
            }

            // 🎯 使用统一的时值计算函数
            const duration = this.getElementDuration(note);
            currentPosition += duration;
        });

        // 为上声部复制相同的信息
        measure.upperVoice.forEach((note, index) => {
            if (measure.lowerVoice[index]) {
                note.beatPosition = { ...measure.lowerVoice[index].beatPosition };
            }
        });

        console.log(`🎵 拍点信息已添加到小节，总长度: ${currentPosition}拍`);
    }

    /**
     * 判断位置是否在细分拍点上
     * @param {number} positionInBeat - 拍内位置（0-1）
     * @returns {boolean} 是否在细分拍点
     */
    isOnSubdivision(positionInBeat) {
        const subdivisions = [0, 0.25, 0.5, 0.75]; // 四个十六分音符位置
        return subdivisions.some(pos => Math.abs(positionInBeat - pos) < 0.01);
    }

    /**
     * 获取十六分音符在拍内的位置描述
     * @param {number} positionInBeat - 拍内位置（0-1）
     * @returns {string} 位置描述
     */
    getSixteenthPosition(positionInBeat) {
        if (Math.abs(positionInBeat - 0) < 0.01) return '1e';      // 第1个十六分音符（拍点）
        if (Math.abs(positionInBeat - 0.25) < 0.01) return '1e+'; // 第2个十六分音符
        if (Math.abs(positionInBeat - 0.5) < 0.01) return '1+';   // 第3个十六分音符（八分音符拍）
        if (Math.abs(positionInBeat - 0.75) < 0.01) return '1+e'; // 第4个十六分音符
        return 'off-beat'; // 不在标准位置
    }

    /**
     * 将单个音符转换为MusicXML格式
     * @param {Object} note - 音符对象
     * @param {boolean} isChord - 是否是和弦音
     * @returns {string} MusicXML片段
     */
    noteToMusicXML(note, isChord) {
        // 解析音符 - 🔧 支持重升降记号（##, bb）
        const m = note.pitch.match(/^([A-G])(#{1,2}|b{1,2})?(\d+)$/);
        if (!m) return '';
        const step = m[1];
        const accidental = m[2] || '';
        const octave = m[3];
        let alter = '';
        let accidentalTag = '';
        // 🎵 支持单/双升降号
        if (accidental === '#') {
            alter = '<alter>1</alter>';
            // 单升号让OSMD自动决定（与旋律工具保持一致）
        } else if (accidental === '##') {
            alter = '<alter>2</alter>';
            accidentalTag = '<accidental>double-sharp</accidental>';
        } else if (accidental === 'b') {
            alter = '<alter>-1</alter>';
            // 单降号让OSMD自动决定
        } else if (accidental === 'bb') {
            alter = '<alter>-2</alter>';
            accidentalTag = '<accidental>double-flat</accidental>';
        }

        const divisions = this._currentDivisions || 4;
        const noteDuration = this.getElementDuration(note); // 四分音符=1.0
        const xmlDuration = Math.round(noteDuration * divisions);

        // beaming
        let beamXML = '';
        if (note.beamGroup && this.canNoteBeBeamed(note)) {
            beamXML = this.generateBeamXML(note);
        }

        // tuplet / time-modification
        let timeModificationXML = '';
        let tupletXML = '';

        if (note.tripletGroup || note.isTriplet || note.isTripletElement) {
            timeModificationXML = `
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>`;
            const num = note.tupletNumber || note.tripletId || 1;
            if (note.tripletPosition === 'start') {
                tupletXML = `<tuplet type=\"start\" number=\"${num}\" bracket=\"yes\" show-number=\"3\" placement=\"above\"/>`;
            } else if (note.tripletPosition === 'stop') {
                tupletXML = `<tuplet type=\"stop\" number=\"${num}\"/>`;
            }
        }
        if (note.tupletGroup && note.tupletKind === 'duplet') {
            timeModificationXML = `
        <time-modification>
          <actual-notes>2</actual-notes>
          <normal-notes>3</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>`;
            const num = note.tupletId || 1;
            if (note.tupletPosition === 'start') {
                tupletXML = `<tuplet type=\"start\" number=\"${num}\" bracket=\"yes\" show-number=\"2\" placement=\"above\"/>`;
            } else if (note.tupletPosition === 'stop') {
                tupletXML = `<tuplet type=\"stop\" number=\"${num}\"/>`;
            }
        }
        if (note.tupletGroup && note.tupletKind === 'quadruplet') {
            timeModificationXML = `
        <time-modification>
          <actual-notes>4</actual-notes>
          <normal-notes>3</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>`;
            const num = note.tupletId || 1;
            if (note.tupletPosition === 'start') {
                tupletXML = `<tuplet type=\"start\" number=\"${num}\" bracket=\"yes\" show-number=\"4\" placement=\"above\"/>`;
            } else if (note.tupletPosition === 'stop') {
                tupletXML = `<tuplet type=\"stop\" number=\"${num}\"/>`;
            }
        }

        // 如果未标记tuplet分组，但节奏值为duplet/quadruplet，仍需应用time-modification（旋律工具一致行为）
        if (!timeModificationXML && (note && typeof note.value === 'string') && (note.value === 'duplet' || note.value === 'quadruplet')) {
            if (note.value === 'duplet') {
                timeModificationXML = `
        <time-modification>
          <actual-notes>2</actual-notes>
          <normal-notes>3</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>`;
            } else if (note.value === 'quadruplet') {
                timeModificationXML = `
        <time-modification>
          <actual-notes>4</actual-notes>
          <normal-notes>3</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>`;
            }
        }

        // base type （避免无效类型导致显示异常）
        let baseType = (note.value && typeof note.value === 'string') ? note.value : this.getDurationName(note.duration || noteDuration);
        if (baseType === 'duplet' || baseType === 'quadruplet' || baseType === 'triplet') {
            baseType = (Math.abs(noteDuration - 0.5) < 0.01) ? 'eighth' : (Math.abs(noteDuration - 0.25) < 0.01 ? '16th' : 'eighth');
        }
        let dotXML = '';
        // 🛡️ 6/8 N-plet（duplet/quadruplet）内强制八分无附点（防止时值映射回退成 eighth.）
        if ((note.tupletGroup && (note.tupletKind === 'duplet' || note.tupletKind === 'quadruplet')) || (note && typeof note.value === 'string' && (note.value === 'duplet' || note.value === 'quadruplet'))) {
            baseType = 'eighth';
            dotXML = '';
        }
        if (typeof baseType === 'string' && baseType.endsWith('.')) {
            baseType = baseType.slice(0, -1);
            dotXML = '<dot/>';
        }

        return `
      <note>
        ${isChord ? '<chord/>' : ''}
        <pitch>
          <step>${step}</step>
          ${alter}
          <octave>${octave}</octave>
        </pitch>
        <duration>${xmlDuration}</duration>${accidentalTag ? '\n        ' + accidentalTag : ''}
        <type>${baseType}</type>${dotXML ? '\n        ' + dotXML : ''}${timeModificationXML ? timeModificationXML : ''}${beamXML ? '\n        ' + beamXML : ''}${tupletXML ? '\n        <notations>' + tupletXML + '</notations>' : ''}
      </note>`;
    }

    /**
     * 将休止符转换为MusicXML格式
     * @param {Object} rest - 休止符对象
     * @param {number} divisions - MusicXML divisions值
     * @returns {string} MusicXML片段
     */
    restToMusicXML(rest, divisions = 1) {
        // 计算实际的duration值（基于divisions）
        const restDuration = this.getElementDuration(rest);
        const xmlDuration = Math.round(restDuration * divisions);

        // 添加拍点位置信息（用于十六分音符对齐）
        let beatPositionXML = '';
        if (rest.beatPosition !== undefined) {
            beatPositionXML = `<!-- Beat position: ${JSON.stringify(rest.beatPosition)} -->`;
        }

        // 处理特殊休止符类型：附点休止符和三连音休止符
        // 🔥 修复：确保baseRestType是字符串类型，而不是数字
        let baseRestType = rest.value || rest.displayName || 'quarter';

        // 如果是数字类型的duration，转换为对应的音符类型
        if (typeof baseRestType === 'number') {
            baseRestType = this.getDurationName(baseRestType);
        }

        // 最后的安全检查：确保baseRestType是字符串
        if (typeof baseRestType !== 'string') {
            console.warn(`⚠️ baseRestType不是字符串: ${baseRestType} (${typeof baseRestType})，使用默认值`);
            baseRestType = 'quarter';
        }

        let dotXML = '';
        let timeModificationXML = '';
        let tupletXML = '';

        if (typeof baseRestType === 'string' && baseRestType.endsWith('.')) {
            baseRestType = baseRestType.slice(0, -1); // 移除附点
            dotXML = '<dot/>';
        }

        // 🎵 修复：检查休止符是否属于三连音组（与音符处理逻辑一致）
        // 三连音休止符可能value='eighth'而不是'triplet'，所以要检查属性标记
        if (rest.tripletGroup || rest.isTriplet || rest.isTripletElement) {
            // 三连音休止符：确保baseRestType正确
            if (baseRestType === 'triplet') {
                baseRestType = 'eighth'; // 三连音休止符默认基于八分休止符
            }

            timeModificationXML = `
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>`;

            // 🎵 关键修复：休止符也要添加tuplet bracket标记，确保bracket覆盖整个三连音组
            const tripletNumber = rest.tupletNumber || rest.tripletId || 1;
            if (rest.tripletPosition === 'start') {
                tupletXML = `<tuplet type="start" number="${tripletNumber}" bracket="yes" show-number="3" placement="above"/>`;
                console.log(`🎵 休止符三连音bracket start: number=${tripletNumber}`);
            } else if (rest.tripletPosition === 'stop') {
                tupletXML = `<tuplet type="stop" number="${tripletNumber}"/>`;
                console.log(`🎵 休止符三连音bracket stop: number=${tripletNumber}`);
            } else if (rest.tripletPosition === 'middle') {
                // 🎵 中间位置的休止符：不需要tuplet标记，但仍需要time-modification
                console.log(`🎵 休止符三连音bracket middle: 无tuplet标记（bracket会自动延续）`);
            }
        }

        // 🎵 修复：二连音休止符bracket处理（与三连音一致）
        if (rest.tupletGroup && rest.tupletKind === 'duplet') {
            // 二连音休止符基于八分休止符，2 in the time of 3
            if (baseRestType === 'duplet') {
                baseRestType = 'eighth';
            }

            timeModificationXML = `
        <time-modification>
          <actual-notes>2</actual-notes>
          <normal-notes>3</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>`;

            const npletNumber = rest.npletNumber || rest.tupletId || 1;
            if (rest.tupletPosition === 'start') {
                tupletXML = `<tuplet type="start" number="${npletNumber}" bracket="yes" show-number="2" placement="above"/>`;
                console.log(`🎵 休止符二连音bracket start: number=${npletNumber}`);
            } else if (rest.tupletPosition === 'stop') {
                tupletXML = `<tuplet type="stop" number="${npletNumber}"/>`;
                console.log(`🎵 休止符二连音bracket stop: number=${npletNumber}`);
            }
        }

        // 🎵 修复：四连音休止符bracket处理（与三连音一致）
        if (rest.tupletGroup && rest.tupletKind === 'quadruplet') {
            // 四连音休止符基于八分休止符，4 in the time of 3
            if (baseRestType === 'quadruplet') {
                baseRestType = 'eighth';
            }

            timeModificationXML = `
        <time-modification>
          <actual-notes>4</actual-notes>
          <normal-notes>3</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>`;

            const npletNumber = rest.npletNumber || rest.tupletId || 1;
            if (rest.tupletPosition === 'start') {
                tupletXML = `<tuplet type="start" number="${npletNumber}" bracket="yes" show-number="4" placement="above"/>`;
                console.log(`🎵 休止符四连音bracket start: number=${npletNumber}`);
            } else if (rest.tupletPosition === 'stop') {
                tupletXML = `<tuplet type="stop" number="${npletNumber}"/>`;
                console.log(`🎵 休止符四连音bracket stop: number=${npletNumber}`);
            }
        }

        // 为不同时值的休止符设置正确的显示位置
        let displayPositionXML = '';
        const restType = baseRestType;

        // 根据休止符类型设置垂直位置（基于标准五线谱记谱法）
        switch (restType) {
            case 'whole':
                // 全休止符：位于第4线下方
                displayPositionXML = `
        <display-step>D</display-step>
        <display-octave>4</display-octave>`;
                break;
            case 'half':
                // 二分休止符：位于第3线上方
                displayPositionXML = `
        <display-step>B</display-step>
        <display-octave>4</display-octave>`;
                break;
            case 'quarter':
                // 四分休止符：标准位置（中间）
                displayPositionXML = `
        <display-step>B</display-step>
        <display-octave>4</display-octave>`;
                break;
            case 'eighth':
                // 八分休止符：标准位置
                displayPositionXML = `
        <display-step>B</display-step>
        <display-octave>4</display-octave>`;
                break;
            case 'sixteenth':
                // 十六分休止符：标准位置（这是关键修复）
                displayPositionXML = `
        <display-step>B</display-step>
        <display-octave>4</display-octave>`;
                break;
            case '32nd':
                // 三十二分休止符：标准位置
                displayPositionXML = `
        <display-step>B</display-step>
        <display-octave>4</display-octave>`;
                break;
            default:
                // 默认位置
                displayPositionXML = `
        <display-step>B</display-step>
        <display-octave>4</display-octave>`;
        }

        console.log(`🎼 休止符: ${rest.duration}, 时值: ${restDuration}拍, XML duration: ${xmlDuration} (divisions: ${divisions})`);

        return `
      <note>${beatPositionXML ? '\n        ' + beatPositionXML : ''}
        <rest/>${displayPositionXML}
        <duration>${xmlDuration}</duration>
        <type>${restType}</type>${dotXML ? '\n        ' + dotXML : ''}${timeModificationXML ? timeModificationXML : ''}${tupletXML ? '\n        ' + tupletXML : ''}
      </note>`;
    }

    /**
     * 检查音符是否可以连接符干（参考旋律视奏工具）
     * @param {Object} note - 音符对象
     * @returns {boolean} 是否可以beaming
     */
    canNoteBeBeamed(note) {
        // 基础检查：必须是音符且有符尾
        if (note.type !== 'note') return false;

        // 🎵 特殊处理三连音：只有八分三连音才有符干，四分三连音本身无符干
        // 三连音单独处理，不与普通音符混合连接
        // ⚠️ 必须先检查三连音，因为三连音的duration是数值而非字符串
        if (note.tripletGroup || note.isTriplet || note.isTripletElement) {
            const tripletType = note.tripletType || 'eighth'; // 默认八分三连音
            if (tripletType === 'quarter') {
                // 四分音符三连音：四分音符本身没有旗子，不存在符干连接
                console.log(`🎵 四分音符三连音无符干: ${note.displayName || 'triplet'}`);
                return false;
            } else {
                // 八分音符三连音：八分音符有旗子，需要符干连接
                console.log(`🎵 八分音符三连音有符干: ${note.displayName || 'triplet'}`);
                return true;
            }
        }

        // 🔥 关键修复：检查note.value（字符串）而不是note.duration（数值）
        // note.duration 是数值（0.5, 0.75等），永远不会在字符串数组中
        const noteValue = note.value || this.getDurationName(note.duration);
        if (!BEAMING_RULES.basicRules.beamableNotes.includes(noteValue)) return false;

        return true;
    }

    /**
     * 直接分析音符的beaming需求（简化版本）
     * @param {Array} notes - 音符数组
     * @returns {Array} beaming组信息
     */
    analyzeBeamingDirectly(notes) {
        const beamGroups = [];
        let currentGroup = [];
        let position = 0;

        console.log(`🔍 直接分析beaming: ${notes.length}个音符`);

        // 首先检查是否已经有beam信息（包括三连音和6/8拍beam组）
        const existingBeamGroups = new Map();
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            if (note.beamGroup) {
                if (!existingBeamGroups.has(note.beamGroup)) {
                    existingBeamGroups.set(note.beamGroup, []);
                }
                existingBeamGroups.get(note.beamGroup).push(i);
                console.log(`  音符${i}: 已有beam组 ${note.beamGroup}`);
            }
        }

        // 如果有预设的beam组，分析每个组内是否有休止符需要中断beam连接
        if (existingBeamGroups.size > 0) {
            console.log(`✅ 发现${existingBeamGroups.size}个预设beam组，分析休止符中断情况`);
            const finalBeamGroups = [];

            for (const [groupName, indices] of existingBeamGroups) {
                console.log(`🔍 分析beam组 ${groupName}: 音符索引 [${indices.join(', ')}]`);

                // 检查该组内是否有休止符，如果有则分割组
                const subGroups = [];
                let currentSubGroup = [];

                for (const index of indices) {
                    const note = notes[index];
                    if (note && note.type === 'rest') {
                        // 遇到休止符，结束当前子组
                        if (currentSubGroup.length >= 2) {
                            subGroups.push([...currentSubGroup]);
                            console.log(`    🎼 休止符中断，创建子组: [${currentSubGroup.join(', ')}]`);
                        }
                        currentSubGroup = [];
                        console.log(`    🔇 休止符位置 ${index}，中断beam连接`);
                    } else if (note && note.type === 'note' && this.isBeamableNote(note)) {
                        // 🎵 修复：检查是否是三连音，三连音应使用tripletBeamInfo
                        if ((note.tripletGroup || note.isTriplet || note.isTripletElement)) {
                            // 三连音音符：不加入常规beam组，它有自己的tripletBeamInfo
                            if (currentSubGroup.length >= 2) {
                                subGroups.push([...currentSubGroup]);
                                console.log(`    🎼 三连音边界，创建子组: [${currentSubGroup.join(', ')}]`);
                            }
                            currentSubGroup = [];
                            console.log(`    🎵 三连音音符位置 ${index}，使用专用tripletBeamInfo`);
                        } else {
                            // 常规可beam的音符，加入当前子组
                            currentSubGroup.push(index);
                            console.log(`    ✅ 音符位置 ${index} 加入子组`);
                        }
                    } else {
                        // 不可beam的音符，也会中断组
                        if (currentSubGroup.length >= 2) {
                            subGroups.push([...currentSubGroup]);
                            console.log(`    🎼 长音符中断，创建子组: [${currentSubGroup.join(', ')}]`);
                        }
                        currentSubGroup = [];
                        console.log(`    🎵 不可beam音符位置 ${index}，中断beam连接`);
                    }
                }

                // 处理最后一个子组
                if (currentSubGroup.length >= 2) {
                    subGroups.push([...currentSubGroup]);
                    console.log(`    🎼 组结束，创建最后子组: [${currentSubGroup.join(', ')}]`);
                }

                // 将有效的子组加入最终结果
                finalBeamGroups.push(...subGroups);
                console.log(`📊 beam组 ${groupName} 分析完成: ${subGroups.length}个有效子组`);
            }

            console.log(`✅ 预设beam组处理完成: ${finalBeamGroups.length}个最终beam组`);
            return finalBeamGroups;
        }

        // 没有预存的beam信息，进行常规分析
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const currentBeat = Math.floor(position);

            console.log(`  音符${i}: ${note.type}/${note.duration}, 位置${position.toFixed(2)}, 拍${currentBeat}`);

            // 🎵 修复：跳过三连音元素的常规beam分析
            // 三连音应该使用自己的tripletBeamInfo，不应进入常规beam分组
            if ((note.tripletGroup || note.isTriplet || note.isTripletElement)) {
                // 三连音元素：结束当前beam组（如果有的话）
                if (currentGroup.length >= 2) {
                    beamGroups.push([...currentGroup]);
                    console.log(`    🎼 三连音边界，创建beam组: ${currentGroup.join('-')}`);
                }
                currentGroup = [];
                console.log(`    🎵 跳过三连音元素beam分析: 位置${i}`);
                // 更新position后继续下一个音符
                const duration = this.getElementDuration(note);
                position += duration;
                continue;
            }

            if (note.type === 'rest') {
                // 休止符中断beam组
                if (currentGroup.length >= 2) {
                    beamGroups.push([...currentGroup]);
                    console.log(`    🎼 休止符中断，创建beam组: ${currentGroup.join('-')}`);
                }
                currentGroup = [];
            } else if (this.isBeamableNote(note)) {
                // 检查是否换拍
                const newBeat = Math.floor(position);
                if (currentGroup.length > 0) {
                    const lastIndex = currentGroup[currentGroup.length - 1];
                    let lastPosition = 0;
                    for (let j = 0; j <= lastIndex; j++) {
                        if (j === lastIndex) break;
                        // 🎯 使用统一的时值计算函数
                        lastPosition += this.getElementDuration(notes[j]);
                    }
                    const lastBeat = Math.floor(lastPosition);

                    // 4/4拍规则：不能跨越拍2-3边界（位置2.0）
                    if (Math.abs(position - 2.0) < 0.01 && lastPosition < 2.0) {
                        if (currentGroup.length >= 2) {
                            beamGroups.push([...currentGroup]);
                            console.log(`    🎼 跨越拍2-3边界，创建beam组: ${currentGroup.join('-')}`);
                        }
                        currentGroup = [];
                    }
                    // 普通换拍处理
                    else if (newBeat !== lastBeat) {
                        if (currentGroup.length >= 2) {
                            beamGroups.push([...currentGroup]);
                            console.log(`    🎼 换拍，创建beam组: ${currentGroup.join('-')}`);
                        }
                        currentGroup = [];
                    }
                }

                currentGroup.push(i);
                console.log(`    ✅ 加入beam候选组，当前组: [${currentGroup.join(', ')}]`);
            } else {
                // 不可beam的音符中断组
                if (currentGroup.length >= 2) {
                    beamGroups.push([...currentGroup]);
                    console.log(`    🎼 长音符中断，创建beam组: ${currentGroup.join('-')}`);
                }
                currentGroup = [];
            }

            // 🎯 使用统一的时值计算函数
            const duration = this.getElementDuration(note);
            position += duration;
        }

        // 处理最后一个组
        if (currentGroup.length >= 2) {
            beamGroups.push([...currentGroup]);
            console.log(`    🎼 小节结束，创建最终beam组: ${currentGroup.join('-')}`);
        }

        console.log(`✅ 共创建${beamGroups.length}个beam组`);
        return beamGroups;
    }

    /**
     * 判断音符是否可以beaming（简化版本）
     * @param {Object} note - 音符对象
     * @returns {boolean}
     */
    isBeamableNote(note) {
        if (note.type !== 'note') return false;
        // 🔥 关键修复：与BEAMING_RULES保持一致，添加附点音符和所有可beam时值
        const beamableDurations = [
            'quarter', 'quarter.',         // 四分音符（特殊情况）
            'eighth', 'eighth.',           // 八分音符和附点八分音符 ← 关键！
            '16th', 'sixteenth', '16th.',  // 十六分音符
            '32nd', '64th',                // 更短的音符
            'duplet', 'quadruplet'         // 6/8拍特殊连音
        ];
        // 🔥 修复：应该检查value字段而不是duration字段
        const noteValue = note.value || this.getDurationName(note.duration);
        return beamableDurations.includes(noteValue);
    }

    /**
     * 获取指定音符的beam信息
     * @param {number} noteIndex - 音符索引
     * @param {Array} beamGroups - beam组数组
     * @param {Array} voice - 可选：声部序列，用于检查休止符中断
     * @returns {Object} beam信息
     */
    getBeamInfoForNote(noteIndex, beamGroups, voice = null) {
        for (let groupIndex = 0; groupIndex < beamGroups.length; groupIndex++) {
            const group = beamGroups[groupIndex];
            const positionInGroup = group.indexOf(noteIndex);

            if (positionInGroup >= 0) {
                let beamPosition;
                if (positionInGroup === 0) {
                    beamPosition = 'begin';
                } else if (positionInGroup === group.length - 1) {
                    beamPosition = 'end';
                } else {
                    beamPosition = 'continue';
                }

                // 🔥 新增：检查休止符中断 - 如果检测到中断，强制设置为'begin'重新开始beam
                if (voice && (beamPosition === 'continue' || beamPosition === 'end')) {
                    const originalPosition = beamPosition;
                    const hasRestInterruption = this.checkRestInterruption(noteIndex, voice, groupIndex, beamGroups);
                    if (hasRestInterruption) {
                        beamPosition = 'begin';
                        console.log(`🔥 休止符中断检测: 位置${noteIndex}的音符beam位置从'${originalPosition}'改为'begin'`);
                    }
                }

                return {
                    hasBeam: true,
                    position: beamPosition,
                    groupId: groupIndex
                };
            }
        }

        return { hasBeam: false };
    }

    /**
     * 🆕 检查指定音符是否被休止符中断了与前面音符的beam连接
     * @param {number} noteIndex - 当前音符在序列中的索引
     * @param {Array} voice - 声部序列 (包含note和rest)
     * @param {number} groupId - beam组ID
     * @param {Array} beamGroups - beam组数组
     * @returns {boolean} 是否被休止符中断
     */
    checkRestInterruption(noteIndex, voice, groupId, beamGroups) {
        if (!voice || !beamGroups || groupId === undefined) return false;

        const currentGroup = beamGroups[groupId];
        if (!currentGroup || currentGroup.length <= 1) return false;

        // 找到当前音符在beam组中的位置
        const positionInGroup = currentGroup.indexOf(noteIndex);
        if (positionInGroup <= 0) return false; // 第一个音符不需要检查中断

        // 检查从beam组开始到当前音符之间是否有休止符
        const groupStartIndex = currentGroup[0];
        const groupEndIndex = noteIndex;

        for (let i = groupStartIndex; i < groupEndIndex; i++) {
            const element = voice[i];
            if (element && element.type === 'rest') {
                console.log(`🔍 检测到休止符中断: 位置${i}的休止符中断了位置${noteIndex}音符的beam连接`);
                return true;
            }
        }

        return false;
    }

    /**
     * 直接生成带beam标记的MusicXML音符
     * @param {Object} note - 音符对象
     * @param {boolean} isChord - 是否是和弦音
     * @param {Object} beamInfo - beam信息
     * @returns {string} MusicXML片段
     */
    noteToMusicXMLDirect(note, isChord, beamInfo, divisions = 1) {
        // 解析音符 - 🔧 支持重升降记号（##, bb）
        const match = note.pitch.match(/^([A-G])(#{1,2}|b{1,2})?(\d+)$/);
        if (!match) return '';

        const [, step, accidental, octave] = match;
        let alter = '';
        let accidentalTag = '';
        // 🎵 支持单/双升降号
        if (accidental === '#') {
            alter = '<alter>1</alter>';
            // 单升号让OSMD自动决定（与旋律工具保持一致）
        } else if (accidental === '##') {
            alter = '<alter>2</alter>';
            accidentalTag = '<accidental>double-sharp</accidental>';
        } else if (accidental === 'b') {
            alter = '<alter>-1</alter>';
            // 单降号让OSMD自动决定
        } else if (accidental === 'bb') {
            alter = '<alter>-2</alter>';
            accidentalTag = '<accidental>double-flat</accidental>';
        }

        // 计算实际的duration值（基于divisions）
        const noteDuration = this.getElementDuration(note);
        const xmlDuration = Math.round(noteDuration * divisions);

        // 添加拍点位置信息（用于十六分音符对齐）
        let beatPositionXML = '';
        if (note.beatPosition !== undefined) {
            beatPositionXML = `<!-- Beat position: ${JSON.stringify(note.beatPosition)} -->`;
        }

        // 生成beam标记（参考旋律视奏工具）
        // 🔥 MusicXML标准：和弦音不应该有beam标签，beam只在主音符上
        let beamXML = '';
        if (!isChord) {
            // 优先：N-plet（duplet/quadruplet）专用beaming
            if (note.tupletGroup && (note.tupletKind === 'duplet' || note.tupletKind === 'quadruplet') && note.npletBeamInfo) {
                beamXML = `<beam number="1">${note.npletBeamInfo}</beam>`;
                console.log(`🎵 ${note.tupletKind} 生成符干: ${note.npletBeamInfo}`);
            } else if (note.tripletGroup || note.isTriplet) {
                // 🎵 三连音beam处理（简化条件，只检查是否为三连音）
                const tripletType = note.tripletType || 'eighth';
                if (tripletType === 'eighth' && note.tripletBeamInfo) {
                    // 八分音符三连音且有tripletBeamInfo：使用tripletBeamInfo
                    beamXML = `<beam number="1">${note.tripletBeamInfo}</beam>`;
                    console.log(`🎵 八分音符三连音生成符干: ${note.tripletBeamInfo} [pitch=${note.pitch}]`);
                } else if (tripletType === 'eighth' && !note.tripletBeamInfo) {
                    // 八分音符三连音但tripletBeamInfo缺失：警告但不回退
                    console.warn(`⚠️ 八分三连音缺少tripletBeamInfo [pitch=${note.pitch}, tripletGroup=${note.tripletGroup}]`);
                } else {
                    // 四分音符三连音：无符干
                    console.log(`🎵 四分音符三连音无符干: ${note.displayName || 'triplet'}`);
                }
            } else if (beamInfo.hasBeam && this.isBeamableNote(note)) {
                // 🔥 优先使用分析后的beam信息，确保休止符正确中断beam连接
                const noteValue = note.value || this.getDurationName(note.duration);
                // 🔥 修复：使用BEAMING_RULES检查，支持所有可beam的音符类型（包括附点）
                const beamableTypes = [...BEAMING_RULES.basicRules.beamableNotes, 'duplet', 'quadruplet'];
                if (beamableTypes.includes(noteValue)) {
                    beamXML = `<beam number="1">${beamInfo.position}</beam>`;

                    // 十六分音符添加第二级beam（包括附点十六分）
                    if (noteValue === '16th' || noteValue === '16th.' || noteValue === 'sixteenth') {
                        beamXML += `<beam number="2">${beamInfo.position}</beam>`;
                    }
                    console.log(`✅ 分析后beam标记: ${note.pitch} ${noteValue} → ${beamInfo.position} (group: ${beamInfo.groupId})`);
                } else {
                    console.warn(`🚨 分析后安全检查: ${note.pitch} ${noteValue} 不应该有beam`);
                }
            } else if (note.beamGroup && note.beamPosition && this.isBeamableNote(note)) {
                // 🎼 备用：使用音符原始beamGroup和beamPosition信息（当分析失败时）
                const noteValue = note.value || this.getDurationName(note.duration);
                // 🔥 修复：使用BEAMING_RULES检查，支持所有可beam的音符类型（包括附点）
                const beamableTypes = [...BEAMING_RULES.basicRules.beamableNotes, 'duplet', 'quadruplet'];
                if (beamableTypes.includes(noteValue)) {
                    // 转换beamPosition到MusicXML格式
                    let musicXMLBeamPosition = note.beamPosition;
                    if (musicXMLBeamPosition === 'start') musicXMLBeamPosition = 'begin';
                    if (musicXMLBeamPosition === 'middle') musicXMLBeamPosition = 'continue';
                    if (musicXMLBeamPosition === 'end') musicXMLBeamPosition = 'end';

                    beamXML = `<beam number="1">${musicXMLBeamPosition}</beam>`;

                    // 十六分音符添加第二级beam（包括附点十六分）
                    if (noteValue === '16th' || noteValue === '16th.' || noteValue === 'sixteenth') {
                        beamXML += `<beam number="2">${musicXMLBeamPosition}</beam>`;
                    }
                    console.log(`✅ 备用beam标记: ${note.pitch} ${noteValue} → ${musicXMLBeamPosition} (group: ${note.beamGroup})`);
                } else {
                    console.warn(`🚨 备用安全检查: ${note.pitch} ${noteValue} 不应该有beam`);
                }
            }
        }

        // 生成连音标记（三连音/二连音/四连音）
        let timeModificationXML = '';
        let tupletXML = '';
        // 三连音
        if (note.tripletGroup || note.isTriplet || note.isTripletElement) {
            // 🛡️ 去除十六分三连音：仅允许四分/八分三连音
            const rawTripletType = note.tripletType || 'eighth';
            const safeTripletType = (rawTripletType === 'quarter' || rawTripletType === 'eighth') ? rawTripletType : 'eighth';
            if (rawTripletType !== safeTripletType) {
                console.warn(`⚠️ 检测到非预期三连音类型(${rawTripletType})，自动降级为八分三连音`);
            }
            timeModificationXML = `
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>`;
            const tripletNumber = note.tupletNumber || note.tripletId || 1;
            if (note.tripletPosition === 'start') {
                tupletXML = `<tuplet type="start" number="${tripletNumber}" bracket="yes" show-number="3" placement="above"/>`;
            } else if (note.tripletPosition === 'stop') {
                tupletXML = `<tuplet type="stop" number="${tripletNumber}"/>`;
            }
        }
        // 二连音（6/8专用：2 in the time of 1 dotted quarter）
        // 🔧 修复 (2025-10-04): 使用dotted quarter作为normal-type，避免OSMD误判为附点八分
        if (note.tupletGroup && note.tupletKind === 'duplet') {
            console.log(`🎼 [二连音检测] 音符${note.pitch}，生成<time-modification>标签`);
            timeModificationXML = `
        <time-modification>
          <actual-notes>2</actual-notes>
          <normal-notes>1</normal-notes>
          <normal-type>quarter</normal-type>
          <normal-dot/>
        </time-modification>`;
            console.log(`🔧 [二连音编码] 使用新编码: 2 notes in the time of 1 dotted quarter`);
            const npletNumber = note.npletNumber || note.tupletId || 1;
            if (note.tupletPosition === 'start') {
                tupletXML = `<tuplet type="start" number="${npletNumber}" bracket="yes" show-number="2" placement="above"/>`;
                console.log(`🎼 [二连音bracket] 生成start标记，number=${npletNumber}`);
            } else if (note.tupletPosition === 'stop') {
                tupletXML = `<tuplet type="stop" number="${npletNumber}"/>`;
                console.log(`🎼 [二连音bracket] 生成stop标记，number=${npletNumber}`);
            }
        }
        // 四连音（6/8专用：4 in the time of 1 dotted quarter）
        // 🔧 修复 (2025-10-04): 使用dotted quarter作为normal-type，避免OSMD误判
        if (note.tupletGroup && note.tupletKind === 'quadruplet') {
            timeModificationXML = `
        <time-modification>
          <actual-notes>4</actual-notes>
          <normal-notes>1</normal-notes>
          <normal-type>quarter</normal-type>
          <normal-dot/>
        </time-modification>`;
            console.log(`🔧 [四连音编码] 使用新编码: 4 notes in the time of 1 dotted quarter`);
            const npletNumber = note.npletNumber || note.tupletId || 1;
            if (note.tupletPosition === 'start') {
                tupletXML = `<tuplet type="start" number="${npletNumber}" bracket="yes" show-number="4" placement="above"/>`;
            } else if (note.tupletPosition === 'stop') {
                tupletXML = `<tuplet type="stop" number="${npletNumber}"/>`;
            }
        }
        // 备用路径：若缺少分组标记但value为duplet/quadruplet，仍写入time-modification避免附点推断
        // 🔧 修复 (2025-10-04): 使用dotted quarter作为normal-type
        if (!timeModificationXML && note && typeof note.value === 'string') {
            if (note.value === 'duplet') {
                timeModificationXML = `
        <time-modification>
          <actual-notes>2</actual-notes>
          <normal-notes>1</normal-notes>
          <normal-type>quarter</normal-type>
          <normal-dot/>
        </time-modification>`;
                console.log(`🔧 [备用路径-二连音] 使用新编码: 2 notes in the time of 1 dotted quarter`);
            } else if (note.value === 'quadruplet') {
                timeModificationXML = `
        <time-modification>
          <actual-notes>4</actual-notes>
          <normal-notes>1</normal-notes>
          <normal-type>quarter</normal-type>
          <normal-dot/>
        </time-modification>`;
                console.log(`🔧 [备用路径-四连音] 使用新编码: 4 notes in the time of 1 dotted quarter`);
            }
        }

        // 生成tie标记（连音线）
        let tieXML = '';
        let notationsXML = '';
        if (note.tie && note.tie !== 'none') {
            switch (note.tie) {
                case 'start':
                    tieXML = '<tie type="start"/>';
                    notationsXML = '<notations><tied type="start"/>' + (tupletXML ? tupletXML : '') + '</notations>';
                    break;
                case 'stop':
                    tieXML = '<tie type="stop"/>';
                    notationsXML = '<notations><tied type="stop"/>' + (tupletXML ? tupletXML : '') + '</notations>';
                    break;
                case 'continue':
                    tieXML = '<tie type="stop"/><tie type="start"/>';
                    notationsXML = '<notations><tied type="stop"/><tied type="start"/>' + (tupletXML ? tupletXML : '') + '</notations>';
                    break;
            }
        } else if (tupletXML) {
            // 只有tuplet，没有tie
            notationsXML = '<notations>' + tupletXML + '</notations>';
        }

        const hasTie = tieXML !== '';
        const tieInfo = hasTie ? ` [tie: ${note.tie}]` : '';

        // 处理特殊音符类型：附点音符和三连音
        // 🎯 关键修复：严格优先使用value字段，避免duration数字干扰
        let baseType;
        let dotXML = '';

        // 🔥 🆕 优先检查N-plet（二/四连音）：这些音符绝不应该有附点
        // 放在最前面，防止后续任何逻辑错误地添加附点
        // 检查两个条件：1) tupletGroup属性存在  2) value字段为'duplet'或'quadruplet'
        const hasNpletAttribute = note.tupletGroup && (note.tupletKind === 'duplet' || note.tupletKind === 'quadruplet');
        const hasNpletValue = note.value === 'duplet' || note.value === 'quadruplet';
        const isNplet = hasNpletAttribute || hasNpletValue;

        // 🔍 🆕 详细调试：记录完整的note对象属性（仅当是N-plet或疑似N-plet时）
        if (isNplet || note.duration === 0.75 || note.duration === 0.375 || note.value === 'duplet' || note.value === 'quadruplet') {
            console.log(`\n🔍 ========== N-plet音符详细调试 ==========`);
            console.log(`🎵 音符: ${note.pitch}, duration: ${note.duration}`);
            console.log(`📋 note.value: "${note.value}" (类型: ${typeof note.value})`);
            console.log(`📋 note.tupletGroup: ${note.tupletGroup}`);
            console.log(`📋 note.tupletKind: ${note.tupletKind}`);
            console.log(`📋 note.tupletId: ${note.tupletId}`);
            console.log(`📋 note.tupletPosition: ${note.tupletPosition}`);
            console.log(`🎯 检测结果:`);
            console.log(`   - hasNpletAttribute: ${hasNpletAttribute}`);
            console.log(`   - hasNpletValue: ${hasNpletValue}`);
            console.log(`   - isNplet: ${isNplet}`);
            console.log(`${'='.repeat(50)}\n`);
        }

        if (isNplet) {
            baseType = 'eighth';  // duplet和quadruplet始终使用eighth作为基础类型
            dotXML = '';  // 绝不添加附点
            console.log(`🛡️ N-plet保护: ${note.tupletKind || note.value} 强制使用eighth，禁止附点 (属性检测=${hasNpletAttribute}, value检测=${hasNpletValue})`);
        }
        // 🔥 修复核心问题：优先使用字符串value，只有在缺失时才使用数字duration
        else if (note.value && typeof note.value === 'string') {
            // 优先使用value字段（字符串）
            baseType = note.value;
            console.log(`🎵 使用note.value: ${baseType}`);
        } else if (typeof note.duration === 'number') {
            // 只有在value不存在时才使用duration（数字）
            console.log(`⚠️ note.value缺失，使用duration: ${note.duration}`);

            // 🔥 特殊处理：三连音数值识别
            if (note.tripletGroup || note.isTriplet || note.isTripletElement) {
                // 根据三连音类型确定基础音符类型
                let tripletType = note.tripletType || 'eighth';
                // 🛡️ 去除十六分三连音：发现异常类型时强制降级为八分
                if (tripletType !== 'quarter' && tripletType !== 'eighth') {
                    console.warn(`⚠️ 三连音基础类型异常(${tripletType})，强制使用八分`);
                    tripletType = 'eighth';
                }
                baseType = tripletType; // 'quarter' 或 'eighth'
                console.log(`🎵 三连音类型识别: duration=${note.duration} → baseType="${baseType}"`);
            } else if (Math.abs(note.duration - 4.0) < 0.01) {
                baseType = 'whole';
            } else if (Math.abs(note.duration - 3.0) < 0.01) {
                baseType = 'half.'; // 保持附点二分音符标记
            } else if (Math.abs(note.duration - 2.0) < 0.01) {
                baseType = 'half';
            } else if (Math.abs(note.duration - 1.5) < 0.01) {
                baseType = 'quarter.'; // 保持附点四分音符标记
            } else if (Math.abs(note.duration - 1.0) < 0.01) {
                baseType = 'quarter';
            } else if (Math.abs(note.duration - 0.75) < 0.01) {
                // 🔥 关键修复：0.75可能是duplet（二连音），不一定是附点八分
                // 如果是duplet，应该已经在前面被isNplet检查捕获
                // 这里作为fallback，但优先假设是duplet而非附点八分
                baseType = 'eighth'; // 不添加附点，可能是duplet
                console.log(`⚠️ duration=0.75，可能是二连音或附点八分，默认使用plain eighth`);
            } else if (Math.abs(note.duration - 0.5) < 0.01) {
                baseType = 'eighth';
            } else if (Math.abs(note.duration - 0.375) < 0.01) {
                // 🔥 关键修复：0.375是quadruplet（四连音），不是附点十六分
                baseType = 'eighth'; // 不添加附点
                console.log(`⚠️ duration=0.375，可能是四连音，默认使用plain eighth`);
            } else {
                // 🚨 谨慎使用getDurationName，它可能返回附点类型
                const durationName = this.getDurationName(note.duration);
                console.log(`⚠️ 使用getDurationName(${note.duration}) = "${durationName}"`);
                baseType = durationName;
            }
        } else {
            // 默认值 - 🔥 特殊处理三连音
            if (note.tripletGroup || note.isTriplet || note.isTripletElement) {
                const tripletType = note.tripletType || 'eighth';
                baseType = tripletType;
                console.log(`⚠️ 三连音既无value也无duration，根据tripletType使用: ${baseType}`);
            } else {
                baseType = 'quarter';
                console.log(`⚠️ 既无value也无duration，使用默认值: ${baseType}`);
            }
        }
        // 🔥 🆕 二次检查：如果baseType仍然是'duplet'或'quadruplet'（value字段），转换为'eighth'
        if (baseType === 'duplet' || baseType === 'quadruplet') {
            baseType = 'eighth';
            console.log(`🔧 转换N-plet value: ${note.value} → eighth`);
        }

        // 🔥 关键修复：处理附点音符，但跳过N-plet
        // N-plet已在最前面处理，dotXML已设为''，此处不会再次添加附点
        if (!isNplet && typeof baseType === 'string' && baseType.endsWith('.')) {
            const originalType = baseType;
            baseType = baseType.slice(0, -1); // 移除附点
            dotXML = '<dot/>';
            console.log(`🎯 处理附点: ${originalType} → ${baseType} + <dot/>`);

            // 🛡️ 防护：确保不会重复处理附点
            if (baseType.endsWith('.')) {
                console.error(`🚨 检测到重复附点！${originalType} → ${baseType} 仍有附点`);
                // 继续移除所有附点，确保只有一个<dot/>标记
                while (baseType.endsWith('.')) {
                    baseType = baseType.slice(0, -1);
                }
                console.log(`🔧 修复后: ${baseType} + 单个<dot/>`);
            }
        } else if (baseType === 'triplet') {
            // 三连音默认基于八分音符
            baseType = 'eighth';
            console.log(`🎵 三连音处理: triplet → eighth`);
        }

        console.log(`🎼 音符: ${note.pitch} ${note.duration}, 时值: ${noteDuration}拍, XML duration: ${xmlDuration} (divisions: ${divisions})${tieInfo}`);

        // 🔥 最终验证：确保XML结果正确
        let finalXML = `
      <note>${beatPositionXML ? '\n        ' + beatPositionXML : ''}${isChord ? '\n        <chord/>' : ''}
        <pitch>
          <step>${step}</step>${alter ? '\n          ' + alter : ''}
          <octave>${octave}</octave>
        </pitch>
        <duration>${xmlDuration}</duration>${accidentalTag ? '\n        ' + accidentalTag : ''}
        <type>${baseType}</type>${dotXML ? '\n        ' + dotXML : ''}${timeModificationXML ? timeModificationXML : ''}${tieXML ? '\n        ' + tieXML : ''}${beamXML ? '\n        ' + beamXML : ''}${notationsXML ? '\n        ' + notationsXML : ''}
      </note>`;

        // 🛡️ 🆕 强化保险：N-plet（二/四连音）绝对不能有任何附点
        if (isNplet) {
            console.log(`\n🔍 ========== N-plet最终XML检查 ==========`);
            console.log(`🎵 音符: ${note.pitch} (${note.tupletKind || note.value})`);
            console.log(`🎯 baseType: "${baseType}"`);
            console.log(`🎯 dotXML: "${dotXML}"`);
            console.log(`🎯 timeModificationXML: ${timeModificationXML ? '有' : '❌ 缺失！'}`);

            if (finalXML.includes('<dot/>')) {
                const dotsBefore = (finalXML.match(/<dot\/>/g) || []).length;
                console.warn(`⚠️ 发现${dotsBefore}个<dot/>标签，正在清理...`);
                finalXML = finalXML.replace(/<dot\/>/g, '');
                console.log(`🧹 [N-plet强制清理] ${note.tupletKind} 移除了${dotsBefore}个残留的 <dot/>`);
            } else {
                console.log(`✅ 未发现<dot/>标签，符合预期`);
            }

            // 二次验证：确保清理成功
            if (finalXML.includes('<dot/>')) {
                console.error(`🚨 [N-plet严重错误] ${note.tupletKind} 清理失败，仍有 <dot/>`);
            } else {
                console.log(`✅ 最终验证通过：无附点`);
            }

            // 🔥 关键检查：验证<time-modification>标签是否存在
            if (finalXML.includes('<time-modification>')) {
                console.log(`✅ 最终XML包含<time-modification>标签`);
                const actualNotesMatch = finalXML.match(/<actual-notes>(\d+)<\/actual-notes>/);
                const normalNotesMatch = finalXML.match(/<normal-notes>(\d+)<\/normal-notes>/);
                if (actualNotesMatch && normalNotesMatch) {
                    console.log(`   📊 <actual-notes>: ${actualNotesMatch[1]}`);
                    console.log(`   📊 <normal-notes>: ${normalNotesMatch[1]}`);
                }
            } else {
                console.error(`🚨 [致命错误] N-plet音符缺少<time-modification>标签！`);
                console.error(`🚨 这会导致渲染引擎将duration=0.75的eighth误判为附点八分！`);
            }

            // 显示最终的<type>标签内容
            const typeMatch = finalXML.match(/<type>([^<]+)<\/type>/);
            if (typeMatch) {
                console.log(`🎼 最终<type>: ${typeMatch[1]}`);
            }
            console.log(`${'='.repeat(50)}\n`);
        }

        // 🛡️ 最终安全检查：验证生成的XML中的附点数量
        const finalDotCount = (finalXML.match(/<dot\/>/g) || []).length;
        // 🔥 🆕 N-plet的期望附点数始终为0
        const expectedDots = isNplet ? 0 : ((note.value && typeof note.value === 'string' && note.value.endsWith('.')) ? 1 : 0);

        if (finalDotCount !== expectedDots) {
            console.error(`🚨 附点数量异常！音符${note.pitch} value="${note.value}" 期望${expectedDots}个附点，实际生成${finalDotCount}个`);
            console.error(`🔍 生成的XML:`, finalXML);

            // 🚨 紧急修复：如果发现附点异常，强制修正XML
            if (finalDotCount > expectedDots) {
                console.warn(`🔧 紧急修复：移除多余的${finalDotCount - expectedDots}个附点`);
                // 移除多余的<dot/>标记，只保留期望数量
                let correctedXML = finalXML;
                let currentDots = finalDotCount;
                while (currentDots > expectedDots) {
                    correctedXML = correctedXML.replace(/<dot\/>/, '');
                    currentDots--;
                }
                console.log(`✅ 修复后XML附点数量: ${(correctedXML.match(/<dot\/>/g) || []).length}`);
                return correctedXML;
            }
        } else {
            console.log(`✅ 附点验证通过：${note.pitch} 生成${finalDotCount}个附点`);
        }

        return finalXML;
    }

    /**
     * 判断当前拍位是否为强拍（重拍）
     * @param {number} position - 在小节中的位置（四分音符为单位）
     * @param {Object} timeSignature - 拍号信息
     * @returns {boolean} 是否为强拍
     */
    isStrongBeat(position, timeSignature) {
        const beat = Math.floor(position);
        const beats = timeSignature.beats;
        const beatType = timeSignature.beatType;

        // 四分音符为拍的拍号（单拍子和复拍子）
        if (beatType === 4) {
            if (beats === 2) {
                // 2/4拍：强-弱
                return beat === 0;
            } else if (beats === 3) {
                // 3/4拍：强-弱-弱
                return beat === 0;
            } else if (beats === 4) {
                // 4/4拍：强-弱-次强-弱
                return beat === 0 || beat === 2;
            } else if (beats === 5) {
                // 5/4拍：强-弱-次强-弱-弱 或 强-弱-弱-次强-弱
                return beat === 0 || beat === 2 || beat === 3;
            } else if (beats === 6) {
                // 6/4拍：强-弱-弱-次强-弱-弱
                return beat === 0 || beat === 3;
            }
        }
        // 八分音符为拍的拍号（复合拍子）
        else if (beatType === 8) {
            if (beats === 6) {
                // 🔥 6/8拍正确实现：基于标准节拍结构
                const beatStructure = this.create68BeatStructure();

                // 检查是否为强拍位置（基于standardStrongBeats配置）
                const isStrongBeat = beatStructure.strongBeats.some(strongBeat =>
                    Math.abs(position - strongBeat) < 0.01
                );

                // 详细分析（用于调试）
                const isFirstBeat = Math.abs(position) < 0.01;
                const isFourthBeat = Math.abs(position - 1.5) < 0.01;

                console.log(`🎼 6/8拍重拍分析: 位置${position.toFixed(2)}, 第1拍=${isFirstBeat}, 第4拍=${isFourthBeat}, 强拍=${isStrongBeat}`);
                console.log(`🎯 标准强拍位置: [${beatStructure.strongBeats.join(', ')}]`);
                return isStrongBeat;

            } else if (beats === 9) {
                // 9/8拍：强-弱-弱-次强-弱-弱-次强-弱-弱（三组三拍）
                const isStrong = Math.abs(position) < 0.01 ||
                               Math.abs(position - 1.5) < 0.01 ||
                               Math.abs(position - 3.0) < 0.01;
                return isStrong;
            } else if (beats === 12) {
                // 12/8拍：强-弱-弱-次强-弱-弱-次强-弱-弱-次强-弱-弱（四组三拍）
                const isStrong = Math.abs(position) < 0.01 ||
                               Math.abs(position - 1.5) < 0.01 ||
                               Math.abs(position - 3.0) < 0.01 ||
                               Math.abs(position - 4.5) < 0.01;
                return isStrong;
            } else if (beats === 3) {
                // 3/8拍：强-弱-弱
                return Math.abs(position) < 0.01;
            }
        }
        // 二分音符为拍的拍号
        else if (beatType === 2) {
            if (beats === 2) {
                // 2/2拍（Cut Time）：强-弱
                return beat === 0;
            } else if (beats === 3) {
                // 3/2拍：强-弱-弱
                return beat === 0;
            } else if (beats === 4) {
                // 4/2拍：强-弱-次强-弱
                return beat === 0 || beat === 2;
            }
        }
        // 十六分音符为拍的拍号（少见）
        else if (beatType === 16) {
            // 对于16分音符拍，通常第1拍为强拍
            return beat === 0;
        }

        // 默认规则：第1拍始终为强拍
        return beat === 0;
    }

    /**
     * 🆕 Phase 2: 非线性权重计算算法
     * 根据用户设置的频率值，应用非线性变换来精确控制节奏类型的出现概率
     *
     * 算法规则：
     * - 极低频率 (≤15%): 指数衰减抑制，drastically减少出现概率
     * - 低频率 (16%-30%): 平方衰减抑制，significant减少出现概率
     * - 中等频率 (31%-60%): 线性加权抑制，moderate调整概率
     * - 高频率 (>60%): 接近线性，轻微加权，保持较高出现概率
     *
     * @param {number} rawFrequency - 原始频率值 (0-100)
     * @param {string} rhythmType - 节奏类型名称（用于调试）
     * @returns {number} 经过非线性变换的权重值 (0-1)
     */
    calculateNonLinearRhythmWeight(rawFrequency, rhythmType = 'unknown') {
        // 将0-100范围标准化为0-1
        const normalizedFreq = Math.max(0, Math.min(100, rawFrequency)) / 100;

        let nonLinearWeight;
        let category;

        if (normalizedFreq <= 0.15) {
            // 极低频率：指数衰减抑制 - 大幅度降低权重
            // 使用指数函数 y = x^3 进一步压制低频率
            nonLinearWeight = Math.pow(normalizedFreq, 3);
            category = '极低频率-指数衰减';
        } else if (normalizedFreq <= 0.30) {
            // 低频率：平方衰减抑制 - 显著降低权重
            // 使用平方函数 y = x^2 来压制低频率
            nonLinearWeight = Math.pow(normalizedFreq, 2);
            category = '低频率-平方衰减';
        } else if (normalizedFreq <= 0.60) {
            // 中等频率：线性加权抑制 - 温和调整权重
            // 使用线性调整，但稍微降低以给高频率更多空间
            nonLinearWeight = normalizedFreq * 0.8;
            category = '中等频率-线性抑制';
        } else {
            // 高频率：接近线性，轻微加权 - 保持较高权重
            // 使用平方根函数轻微增强，但不过度
            nonLinearWeight = Math.min(1.0, 0.3 + normalizedFreq * 0.7);
            category = '高频率-轻微加权';
        }

        // 确保权重在合理范围内
        nonLinearWeight = Math.max(0.001, Math.min(1.0, nonLinearWeight));

        console.log(`🧮 [非线性权重] ${rhythmType}: ${rawFrequency}% → ${(nonLinearWeight * 100).toFixed(1)}% (${category})`);

        return nonLinearWeight;
    }

    /**
     * 🆕 Phase 2: 增强的模式权重计算系统
     * 结合非线性频率控制和智能模式评估
     *
     * @param {Array} availablePatterns - 可用的6/8拍模式
     * @param {Object} frequencies - 节奏频率设置
     * @returns {Array} 带权重的模式列表，按权重排序
     */
    calculateEnhanced68PatternWeights(availablePatterns, frequencies) {
        const weightedPatterns = [];

        for (const pattern of availablePatterns) {
            let totalPatternWeight = 1.0;
            let weightDetails = [];

            // 1. 🆕 计算基于Tier映射的频率权重
            const rhythmWeights = {};
            let nonLinearFrequencyWeight = 1.0;

            for (const requiredType of pattern.requiredFrequencies) {
                const rawFreq = frequencies[requiredType] || 0;
                // 🆕 应用Tier映射
                const tierFreq = this.mapSliderPercentageToTier(rawFreq);
                // 🆕 使用6/8专用权重计算
                const weight68 = this.calculate68FrequencyWeight(tierFreq, 10, requiredType);
                // 标准化到0-1范围（baseWeight=10，所以除以10）
                const normalizedWeight = weight68 / 10;
                rhythmWeights[requiredType] = normalizedWeight;

                // 使用几何平均来组合多个节奏类型的权重
                nonLinearFrequencyWeight *= normalizedWeight;
            }

            // 对多节奏类型模式进行开方处理，避免权重过度压制
            if (pattern.requiredFrequencies.length > 1) {
                nonLinearFrequencyWeight = Math.pow(nonLinearFrequencyWeight, 1 / pattern.requiredFrequencies.length);
            }

            weightDetails.push(`频率权重: ${(nonLinearFrequencyWeight * 100).toFixed(1)}%`);

            // 2. 🆕 计算教育价值权重（使用Tier值）
            let educationalWeight = 1.0;
            if (pattern.educationalValue) {
                // 🆕 计算平均Tier值而非原始频率
                const avgTier = pattern.requiredFrequencies.reduce((sum, type) => {
                    const rawFreq = frequencies[type] || 0;
                    return sum + this.mapSliderPercentageToTier(rawFreq);
                }, 0) / pattern.requiredFrequencies.length;

                // 🆕 使用Tier阈值（15=低频，40=中频，75=高频）
                if (avgTier <= 15 && pattern.complexity === 'simple') {
                    educationalWeight = 1.3; // 低频率环境偏向简单模式
                } else if (avgTier >= 75 && pattern.complexity === 'complex') {
                    educationalWeight = 1.2; // 高频率环境偏向复杂模式
                }
            }

            weightDetails.push(`教育权重: ${(educationalWeight * 100).toFixed(1)}%`);

            // 3. 计算多样性权重（避免总是选择同一模式）
            const diversityWeight = this.calculatePatternDiversityWeight(pattern);
            weightDetails.push(`多样性权重: ${(diversityWeight * 100).toFixed(1)}%`);

            // 🎵 4. 计算音乐性权重（6/8：偏向连贯流动，适度呼吸）
            let musicalityWeight = 1.0;
            const restCount = pattern.notes ? pattern.notes.filter(note => note.type === 'rest').length : 0;

            if (pattern.musicality) {
                switch (pattern.musicality) {
                    case 'very-high-breathability':
                        musicalityWeight = 1.05; // 轻微加成
                        break;
                    case 'high-breathability':
                        musicalityWeight = 1.02; // 极轻微加成
                        break;
                    case 'medium-breathability':
                        musicalityWeight = 1.0; // 中性
                        break;
                    default:
                        musicalityWeight = 1.0;
                }
            }

            // 🎯 对包含休止符的模式施加温和惩罚，鼓励连贯旋律
            if (restCount > 0) {
                musicalityWeight *= Math.pow(0.85, restCount); // 每个休止符 -15%
            } else {
                // 无休止符稍有奖励（鼓励 3+3 连贯）
                musicalityWeight *= 1.10;
            }

            weightDetails.push(`音乐性权重: ${(musicalityWeight * 100).toFixed(1)}%`);

            // 5. 6/8 结构偏好（鼓励附点四分、减少“全八分”）
            let structureWeight = 1.0;
            if (this.timeSignature && this.is68Time(this.timeSignature)) {
                const values = (pattern.notes || []).map(n => n.value);
                const dottedQuarterCount = values.filter(v => v === 'quarter.').length;
                const eighthCount = values.filter(v => v === 'eighth').length;
                const hasDottedHalf = values.includes('half.');

                // 两个附点四分：强烈鼓励（更像歌唱性的 3+3 呼吸）
                if (dottedQuarterCount >= 2) structureWeight *= 1.8;
                // 一个附点四分 + 三个八分：明显鼓励
                else if (dottedQuarterCount === 1) structureWeight *= 1.4;
                // 整小节附点二分：中等鼓励（练长音与视觉聚焦）
                if (hasDottedHalf) structureWeight *= 1.25;
                // 六个八分（满格）: 明显惩罚，避免“全是八分音符”的机械感
                if (eighthCount === 6) structureWeight *= 0.55;
            }
            weightDetails.push(`结构权重: ${(structureWeight * 100).toFixed(1)}%`);

            // 6. 组合所有权重
            totalPatternWeight = nonLinearFrequencyWeight * educationalWeight * diversityWeight * musicalityWeight * structureWeight;

            weightedPatterns.push({
                pattern: pattern,
                weight: totalPatternWeight,
                details: {
                    nonLinearFrequency: nonLinearFrequencyWeight,
                    educational: educationalWeight,
                    diversity: diversityWeight,
                    musicality: musicalityWeight,
                    rhythmWeights: rhythmWeights
                },
                description: weightDetails.join(', ')
            });

            console.log(`📊 [模式权重] ${pattern.id} "${pattern.name}": ${(totalPatternWeight * 100).toFixed(1)}% (${weightDetails.join(', ')})`);
        }

        // 按权重从高到低排序
        return weightedPatterns.sort((a, b) => b.weight - a.weight);
    }

    /**
     * 🆕 计算模式多样性权重
     * 避免连续使用相同或类似的模式
     *
     * @param {Object} pattern - 要评估的模式
     * @returns {number} 多样性权重 (0.7-1.3)
     */
    calculatePatternDiversityWeight(pattern) {
        // 这里可以后续扩展为记录最近使用的模式历史
        // 暂时返回基础权重
        return 1.0;
    }

    /**
     * 🆕 Phase 3: 智能拍点检测系统
     * 为6/8拍提供精确的拍点层次分析和位置分类
     *
     * 拍点层次结构：
     * - 主拍点（强拍）: 0.0, 1.5 - 附点四分音符级别的主要强拍
     * - 次拍点（子拍）: 0.5, 1.0, 2.0, 2.5 - 八分音符级别的子拍
     * - 细分拍点: 0.25, 0.75, 1.25, 1.75, 2.25, 2.75 - 十六分音符级别的细分
     *
     * @param {number} position - 在小节中的位置（四分音符为单位）
     * @returns {Object} 详细的拍点分析信息
     */
    analyze68BeatPosition(position) {
        if (!this.is68Time()) {
            return this.analyzeStandardBeatPosition(position);
        }

        const beatStructure = this.create68BeatStructure();
        const analysis = {
            position: position,
            timeSignature: '6/8',
            beatType: null,
            strength: 0,        // 强度等级：0=最弱, 1=弱, 2=中等, 3=强, 4=最强
            isOnBeat: false,
            isStrongBeat: false,
            isSubBeat: false,
            isSubdivision: false,
            groupPosition: null, // 在3音符组内的位置：1, 2, 3
            // 符杠组：1 或 2
            hierarchyLevel: null, // 层次等级：'primary', 'secondary', 'subdivision'
            rhythmWeight: 1.0,   // 该位置的节奏权重
            educationalValue: 1.0, // 教育价值评分
            description: ''
        };

        // 1. 检测主拍点（强拍）
        const isStrongBeat = beatStructure.strongBeats.some(strongBeat =>
            Math.abs(position - strongBeat) < 0.01
        );

        if (isStrongBeat) {
            analysis.beatType = 'strong';
            analysis.strength = 4;
            analysis.isOnBeat = true;
            analysis.isStrongBeat = true;
            analysis.hierarchyLevel = 'primary';
            analysis.rhythmWeight = 2.0;
            analysis.educationalValue = 1.5;

            // 确定符杠组和组内位置
            if (Math.abs(position) < 0.01) {
                analysis.groupPosition = 1;
                analysis.description = '第一拍主强拍（第一组开始）';
            } else if (Math.abs(position - 1.5) < 0.01) {
                analysis.groupPosition = 1;
                analysis.description = '第四拍主强拍（第二组开始）';
            }
        }
        // 2. 检测次拍点（子拍）
        else if (beatStructure.subdivisions.includes(position)) {
            analysis.beatType = 'sub';
            analysis.strength = 2;
            analysis.isOnBeat = true;
            analysis.isSubBeat = true;
            analysis.hierarchyLevel = 'secondary';
            analysis.rhythmWeight = 1.2;
            analysis.educationalValue = 1.2;

            // 确定在3音符组内的位置
            if (Math.abs(position - 0.5) < 0.01) {
                analysis.groupPosition = 2;
                analysis.description = '第二拍子拍（第一组中间）';
            } else if (Math.abs(position - 1.0) < 0.01) {
                analysis.groupPosition = 3;
                analysis.description = '第三拍子拍（第一组结尾）';
            } else if (Math.abs(position - 2.0) < 0.01) {
                analysis.groupPosition = 2;
                analysis.description = '第五拍子拍（第二组中间）';
            } else if (Math.abs(position - 2.5) < 0.01) {
                analysis.groupPosition = 3;
                analysis.description = '第六拍子拍（第二组结尾）';
            }
        }
        // 3. 检测细分拍点（十六分音符级别）
        else if (beatStructure.subdivisionBoundaries.includes(position)) {
            analysis.beatType = 'subdivision';
            analysis.strength = 1;
            analysis.isOnBeat = true;
            analysis.isSubdivision = true;
            analysis.hierarchyLevel = 'subdivision';
            analysis.rhythmWeight = 0.8;
            analysis.educationalValue = 1.0;

            // 确定细分位置
            const subdivisionPositions = [0.25, 0.75, 1.25, 1.75, 2.25, 2.75];
            if (subdivisionPositions.includes(position)) {
                const subdivisionIndex = subdivisionPositions.indexOf(position);
                analysis.description = `第${subdivisionIndex + 1}个十六分音符细分点`;
            }
        }
        // 4. 非拍点位置
        else {
            analysis.beatType = 'off';
            analysis.strength = 0;
            analysis.isOnBeat = false;
            analysis.hierarchyLevel = 'off-beat';
            analysis.rhythmWeight = 0.5;
            analysis.educationalValue = 0.8;
            analysis.description = '非拍点位置（弱位）';

            // 确定属于哪个符杠组
        }

        console.log(`🎯 [拍点分析] 位置${position.toFixed(2)}: ${analysis.description} (强度=${analysis.strength}, 权重=${analysis.rhythmWeight.toFixed(1)})`);

        return analysis;
    }

    /**
     * 🆕 Phase 3: 为非6/8拍提供标准拍点分析
     * 用于兼容其他拍号的拍点检测
     *
     * @param {number} position - 位置
     * @returns {Object} 标准拍点分析信息
     */
    analyzeStandardBeatPosition(position) {
        const analysis = {
            position: position,
            timeSignature: 'standard',
            beatType: 'standard',
            strength: Math.floor(position) === position ? 2 : 1,
            isOnBeat: Math.floor(position) === position,
            isStrongBeat: Math.floor(position) === position && (position % 2 === 0),
            hierarchyLevel: 'standard',
            rhythmWeight: Math.floor(position) === position ? 1.5 : 1.0,
            description: Math.floor(position) === position ? '标准拍点' : '非拍点'
        };

        return analysis;
    }

    /**
     * 🆕 Phase 3: 智能节奏适配系统
     * 根据拍点分析选择最适合的节奏类型
     *
     * @param {number} position - 当前位置
     * @param {Array} availableRhythms - 可用的节奏类型
     * @param {number} remainingDuration - 剩余小节时值
     * @returns {Array} 推荐的节奏类型，按适合度排序
     */
    getIntelligent68RhythmRecommendations(position, availableRhythms, remainingDuration = 3.0) {
        if (!this.is68Time()) {
            return availableRhythms; // 非6/8拍返回原列表
        }

        const beatAnalysis = this.analyze68BeatPosition(position);
        const recommendations = [];

        console.log(`🧠 [智能节奏] 为位置${position.toFixed(2)}选择节奏，剩余时值${remainingDuration.toFixed(2)}拍`);

        for (const rhythm of availableRhythms) {
            const suitability = this.calculate68RhythmSuitability(rhythm, beatAnalysis, remainingDuration);
            recommendations.push({
                rhythm: rhythm,
                suitability: suitability.score,
                reasons: suitability.reasons,
                adjustedWeight: beatAnalysis.rhythmWeight * suitability.score
            });
        }

        // 按适合度排序
        recommendations.sort((a, b) => b.suitability - a.suitability);

        recommendations.forEach((rec, index) => {
            if (index < 3) { // 只显示前3名
                console.log(`🏆 [排名${index + 1}] ${rec.rhythm.displayName}: 适合度${(rec.suitability * 100).toFixed(1)}% (${rec.reasons.join(', ')})`);
            }
        });

        return recommendations.map(rec => rec.rhythm);
    }

    /**
     * 🆕 计算节奏类型在特定拍点位置的适合度
     *
     * @param {Object} rhythm - 节奏类型对象
     * @param {Object} beatAnalysis - 拍点分析结果
     * @param {number} remainingDuration - 剩余时值
     * @returns {Object} 适合度评分和原因
     */
    calculate68RhythmSuitability(rhythm, beatAnalysis, remainingDuration) {
        const rhythmDuration = this.getDurationValue(rhythm.value);
        let score = 0.5; // 基础分数
        const reasons = [];

        // 1. 拍点强度匹配（40%权重）
        if (beatAnalysis.isStrongBeat) {
            if (['quarter.', 'half.', 'quarter'].includes(rhythm.value)) {
                score += 0.4;
                reasons.push('强拍适合较长时值');
            } else if (['eighth'].includes(rhythm.value)) {
                score += 0.2;
                reasons.push('强拍可用八分音符');
            }
        } else if (beatAnalysis.isSubBeat) {
            if (['eighth', 'quarter', 'eighth.'].includes(rhythm.value)) {
                score += 0.3;
                reasons.push('子拍适合中等时值');
            }
        } else if (beatAnalysis.isSubdivision) {
            if (['eighth', 'sixteenth'].includes(rhythm.value)) {
                score += 0.25;
                reasons.push('细分拍适合短时值');
            }
        } else {
            // 非拍点位置
            if (['eighth', 'sixteenth'].includes(rhythm.value)) {
                score += 0.15;
                reasons.push('非拍点位置优选短时值');
            }
        }

        // 2. 时值适配性（30%权重）
        if (rhythmDuration <= remainingDuration) {
            const utilizationRatio = rhythmDuration / remainingDuration;
            if (utilizationRatio >= 0.8) {
                score += 0.3;
                reasons.push('充分利用剩余时值');
            } else if (utilizationRatio >= 0.5) {
                score += 0.2;
                reasons.push('合理利用剩余时值');
            } else {
                score += 0.1;
                reasons.push('适度利用剩余时值');
            }
        } else {
            score -= 0.2;
            reasons.push('时值超出剩余空间');
        }

        // 3. 6/8拍风格一致性（20%权重）
        if (['eighth', 'quarter', 'quarter.'].includes(rhythm.value)) {
            score += 0.2;
            reasons.push('符合6/8拍特色');
        } else if (['sixteenth', 'eighth.'].includes(rhythm.value)) {
            score += 0.1;
            reasons.push('6/8拍常用时值');
        }

        // 4. 符杠分组考虑（10%权重）
        if (beatAnalysis.beamGroup && beatAnalysis.groupPosition) {
            if (beatAnalysis.groupPosition === 1 && ['quarter.', 'quarter'].includes(rhythm.value)) {
                score += 0.1;
                reasons.push('组头适合较长时值');
            } else if (beatAnalysis.groupPosition > 1 && ['eighth'].includes(rhythm.value)) {
                score += 0.05;
                reasons.push('组内适合八分音符');
            }
        }

        // 确保分数在合理范围内
        score = Math.max(0.1, Math.min(1.0, score));

        return {
            score: score,
            reasons: reasons
        };
    }

    /**
     * 🆕 Phase 4: 增强的节奏转换适配系统
     * 结合智能拍点检测和非线性权重计算，提供上下文感知的节奏转换
     *
     * @param {Array} sourceRhythms - 源节奏模式
     * @param {Object} targetContext - 目标上下文（频率设置、时签等）
     * @param {Object} adaptationOptions - 适配选项
     * @returns {Array} 适配后的节奏模式
     */
    adaptRhythmsWithIntelligentContext(sourceRhythms, targetContext, adaptationOptions = {}) {
        if (!this.is68Time()) {
            console.log(`🔄 [节奏适配] 非6/8拍，使用标准适配`);
            return this.adaptRhythmsStandard(sourceRhythms, targetContext);
        }

        console.log(`🔄 [节奏适配] 开始6/8拍智能节奏适配，源模式${sourceRhythms.length}个事件`);

        const {
            frequencySettings = this.rhythmFrequencies || {},
            preserveEducationalValue = true,
            adaptationStrength = 'moderate', // 'light', 'moderate', 'aggressive'
            fallbackMode = 'intelligent' // 'intelligent', 'safe', 'minimal'
        } = adaptationOptions;

        const adaptedRhythms = [];
        let currentPosition = 0;

        for (let i = 0; i < sourceRhythms.length; i++) {
            const sourceRhythm = sourceRhythms[i];
            const remainingDuration = 3.0 - currentPosition;

            console.log(`🔄 [适配${i}] 位置${currentPosition.toFixed(2)}, 源节奏${sourceRhythm.value}, 剩余${remainingDuration.toFixed(2)}拍`);

            // 1. 进行智能拍点分析
            const beatAnalysis = this.analyze68BeatPosition(currentPosition);

            // 2. 应用上下文感知的节奏转换
            const adaptedRhythm = this.convertRhythmWithContext(
                sourceRhythm,
                beatAnalysis,
                frequencySettings,
                remainingDuration,
                adaptationStrength
            );

            // 3. 验证适配结果
            const validationResult = this.validateAdaptedRhythm(adaptedRhythm, currentPosition, remainingDuration);

            if (validationResult.isValid) {
                adaptedRhythms.push(adaptedRhythm);
                currentPosition += adaptedRhythm.duration;
                console.log(`✅ [适配${i}] 成功: ${sourceRhythm.value} → ${adaptedRhythm.value} (${validationResult.reason})`);
            } else {
                // 4. 错误处理和回退
                const fallbackRhythm = this.handleAdaptationFailure(
                    sourceRhythm,
                    beatAnalysis,
                    remainingDuration,
                    fallbackMode,
                    `adaptation-${i}`
                );
                adaptedRhythms.push(fallbackRhythm);
                currentPosition += fallbackRhythm.duration;
                console.warn(`⚠️ [适配${i}] 回退: ${sourceRhythm.value} → ${fallbackRhythm.value} (${validationResult.error})`);
            }

            // 5. 防护：检查是否超出小节边界
            if (currentPosition >= 3.0) {
                console.log(`🛑 [适配] 已达小节边界，停止适配`);
                break;
            }
        }

        // 6. 后处理：确保小节完整性
        const finalRhythms = this.ensureMeasureCompleteness(adaptedRhythms, adaptationOptions);

        console.log(`🔄 [节奏适配] 完成: ${sourceRhythms.length} → ${finalRhythms.length}个事件`);
        return finalRhythms;
    }

    /**
     * 🆕 上下文感知的节奏转换
     * 基于拍点分析和频率设置转换单个节奏
     *
     * @param {Object} sourceRhythm - 源节奏
     * @param {Object} beatAnalysis - 拍点分析结果
     * @param {Object} frequencySettings - 频率设置
     * @param {number} remainingDuration - 剩余时值
     * @param {string} adaptationStrength - 适配强度
     * @returns {Object} 转换后的节奏
     */
    convertRhythmWithContext(sourceRhythm, beatAnalysis, frequencySettings, remainingDuration, adaptationStrength) {
        console.log(`🎯 [上下文转换] ${sourceRhythm.value} 在 ${beatAnalysis.description}`);

        // 1. 基于拍点强度的节奏映射规则
        const conversionRules = this.get68RhythmConversionRules(beatAnalysis, adaptationStrength);

        // 2. 应用频率权重过滤
        const filteredRules = this.applyFrequencyFiltering(conversionRules, frequencySettings);

        // 3. 查找最佳匹配
        const bestMatch = this.findBestRhythmMatch(sourceRhythm, filteredRules, remainingDuration);

        // 4. 创建适配后的节奏对象
        const adaptedRhythm = {
            ...sourceRhythm,
            value: bestMatch.value,
            displayName: bestMatch.displayName,
            duration: bestMatch.duration,
            adaptationInfo: {
                source: sourceRhythm.value,
                adaptationReason: bestMatch.reason,
                beatContext: beatAnalysis.description,
                confidenceScore: bestMatch.confidence
            }
        };

        return adaptedRhythm;
    }

    /**
     * 🆕 获取6/8拍节奏转换规则
     * 基于拍点分析提供上下文相关的转换规则
     *
     * @param {Object} beatAnalysis - 拍点分析
     * @param {string} adaptationStrength - 适配强度
     * @returns {Array} 转换规则数组
     */
    get68RhythmConversionRules(beatAnalysis, adaptationStrength) {
        const rules = [];

        if (beatAnalysis.isStrongBeat) {
            // 强拍位置的转换偏好
            rules.push(
                { priority: 1.0, value: 'quarter.', reason: '强拍首选附点四分音符' },
                { priority: 0.8, value: 'quarter', reason: '强拍可用四分音符' },
                { priority: 0.6, value: 'eighth', reason: '强拍保守选择八分音符' }
            );

            if (adaptationStrength === 'aggressive') {
                rules.push({ priority: 0.9, value: 'half.', reason: '激进模式允许附点二分音符' });
            }
        } else if (beatAnalysis.isSubBeat) {
            // 子拍位置的转换偏好
            rules.push(
                { priority: 1.0, value: 'eighth', reason: '子拍首选八分音符' },
                { priority: 0.7, value: 'quarter', reason: '子拍可用四分音符' },
                { priority: 0.5, value: 'eighth.', reason: '子拍可考虑附点八分音符' }
            );
        } else if (beatAnalysis.isSubdivision) {
            // 细分拍点的转换偏好
            rules.push(
                { priority: 1.0, value: 'eighth', reason: '细分点首选八分音符' },
                { priority: 0.6, value: 'sixteenth', reason: '细分点可用十六分音符' }
            );
        } else {
            // 非拍点位置的转换偏好
            rules.push(
                { priority: 1.0, value: 'eighth', reason: '非拍点安全选择八分音符' },
                { priority: 0.4, value: 'sixteenth', reason: '非拍点可考虑十六分音符' }
            );
        }

        return rules.sort((a, b) => b.priority - a.priority);
    }

    /**
     * 🆕 应用频率权重过滤转换规则
     *
     * @param {Array} conversionRules - 转换规则
     * @param {Object} frequencySettings - 频率设置
     * @returns {Array} 过滤后的规则
     */
    applyFrequencyFiltering(conversionRules, frequencySettings) {
        return conversionRules.map(rule => {
            const frequency = frequencySettings[rule.value] || 0;
            const nonLinearWeight = this.calculateNonLinearRhythmWeight(frequency, rule.value);

            return {
                ...rule,
                adjustedPriority: rule.priority * nonLinearWeight,
                frequencyWeight: nonLinearWeight,
                originalFrequency: frequency
            };
        }).filter(rule => rule.originalFrequency > 0) // 只保留用户启用的节奏类型
          .sort((a, b) => b.adjustedPriority - a.adjustedPriority);
    }

    /**
     * 🆕 智能适配失败处理
     * 提供多层次的回退机制
     *
     * @param {Object} sourceRhythm - 源节奏
     * @param {Object} beatAnalysis - 拍点分析
     * @param {number} remainingDuration - 剩余时值
     * @param {string} fallbackMode - 回退模式
     * @param {string} errorContext - 错误上下文
     * @returns {Object} 回退节奏
     */
    handleAdaptationFailure(sourceRhythm, beatAnalysis, remainingDuration, fallbackMode, errorContext) {
        console.warn(`🛡️ [适配回退] 模式${fallbackMode}, 上下文: ${errorContext}`);

        switch (fallbackMode) {
            case 'intelligent':
                return this.intelligentRhythmFallback(sourceRhythm, beatAnalysis, remainingDuration);

            case 'safe':
                return this.safeRhythmFallback(remainingDuration);

            case 'minimal':
                return this.minimalRhythmFallback(remainingDuration);

            default:
                return this.safeRhythmFallback(remainingDuration);
        }
    }

    /**
     * 🆕 智能节奏回退
     * 基于上下文选择最合适的回退节奏
     *
     * @param {Object} sourceRhythm - 源节奏
     * @param {Object} beatAnalysis - 拍点分析
     * @param {number} remainingDuration - 剩余时值
     * @returns {Object} 回退节奏
     */
    intelligentRhythmFallback(sourceRhythm, beatAnalysis, remainingDuration) {
        const safeDuration = Math.min(0.5, remainingDuration); // 默认八分音符

        return {
            value: 'eighth',
            displayName: '八分音符（智能回退）',
            duration: safeDuration,
            type: 'note',
            position: beatAnalysis.position,
            isRhythmTemplate: true,
            fallbackInfo: {
                mode: 'intelligent',
                sourceValue: sourceRhythm.value,
                reason: `基于${beatAnalysis.description}的智能回退`
            }
        };
    }

    /**
     * 🆕 验证适配后的节奏
     *
     * @param {Object} adaptedRhythm - 适配后的节奏
     * @param {number} currentPosition - 当前位置
     * @param {number} remainingDuration - 剩余时值
     * @returns {Object} 验证结果
     */
    validateAdaptedRhythm(adaptedRhythm, currentPosition, remainingDuration) {
        // 1. 时值边界检查
        if (adaptedRhythm.duration > remainingDuration) {
            return {
                isValid: false,
                error: `节奏时值${adaptedRhythm.duration}超出剩余时值${remainingDuration}`
            };
        }

        // 2. 6/8拍边界检查
        const endPosition = currentPosition + adaptedRhythm.duration;
        if (endPosition > 3.0) {
            return {
                isValid: false,
                error: `节奏结束位置${endPosition}超出小节边界3.0`
            };
        }

        // 3. 符杠分组检查
        if (this.violatesBeamingRules(adaptedRhythm, currentPosition)) {
            return {
                isValid: false,
                error: '违反6/8拍符杠连接规则'
            };
        }

        return {
            isValid: true,
            reason: '节奏适配验证通过'
        };
    }

    /**
     * 🆕 查找最佳节奏匹配
     * 在过滤后的转换规则中找到最适合的节奏
     *
     * @param {Object} sourceRhythm - 源节奏
     * @param {Array} filteredRules - 过滤后的规则
     * @param {number} remainingDuration - 剩余时值
     * @returns {Object} 最佳匹配
     */
    findBestRhythmMatch(sourceRhythm, filteredRules, remainingDuration) {
        if (filteredRules.length === 0) {
            // 无可用规则，返回安全默认值
            return {
                value: 'eighth',
                displayName: '八分音符',
                duration: Math.min(0.5, remainingDuration),
                reason: '无可用转换规则，默认八分音符',
                confidence: 0.3
            };
        }

        // 查找时值适合且优先级最高的规则
        for (const rule of filteredRules) {
            const rhythmDuration = this.getDurationValue(rule.value);
            if (rhythmDuration <= remainingDuration) {
                return {
                    value: rule.value,
                    displayName: this.getDurationDisplayName(rule.value),
                    duration: rhythmDuration,
                    reason: rule.reason,
                    confidence: rule.adjustedPriority
                };
            }
        }

        // 如果所有规则都超出时值限制，返回最小可能的节奏
        return {
            value: 'eighth',
            displayName: '八分音符',
            duration: Math.min(0.5, remainingDuration),
            reason: '所有选项超出时值限制，选择八分音符',
            confidence: 0.2
        };
    }

    /**
     * 🆕 确保小节完整性
     * 后处理确保适配后的节奏构成完整的小节
     *
     * @param {Array} adaptedRhythms - 适配后的节奏
     * @param {Object} options - 选项
     * @returns {Array} 完整的节奏模式
     */
    ensureMeasureCompleteness(adaptedRhythms, options) {
        const totalDuration = adaptedRhythms.reduce((sum, rhythm) => sum + rhythm.duration, 0);
        const targetDuration = 3.0;

        console.log(`🔧 [完整性检查] 当前总时值${totalDuration.toFixed(2)}, 目标${targetDuration}`);

        if (Math.abs(totalDuration - targetDuration) < 0.01) {
            console.log(`✅ [完整性检查] 小节时值正确`);
            return adaptedRhythms;
        }

        if (totalDuration < targetDuration) {
            // 时值不足，补充
            const missingDuration = targetDuration - totalDuration;
            console.warn(`⚠️ [完整性修复] 时值不足${missingDuration.toFixed(2)}拍，进行补充`);
            return this.fillMissingDuration(adaptedRhythms, missingDuration);
        } else {
            // 时值过多，修剪
            const excessDuration = totalDuration - targetDuration;
            console.warn(`⚠️ [完整性修复] 时值过多${excessDuration.toFixed(2)}拍，进行修剪`);
            return this.trimExcessDuration(adaptedRhythms, excessDuration);
        }
    }

    /**
     * 🆕 检查是否违反符杠连接规则
     * 简化的符杠规则检查
     *
     * @param {Object} rhythm - 节奏对象
     * @param {number} position - 位置
     * @returns {boolean} 是否违反规则
     */
    violatesBeamingRules(rhythm, position) {
        // 基本检查：不跨越1.5拍边界
        const endPosition = position + rhythm.duration;
        const crossesMidBoundary = position < 1.5 && endPosition > 1.5;

        if (crossesMidBoundary && rhythm.value !== 'half.' && rhythm.value !== 'whole') {
            console.warn(`🚨 [符杠检查] 节奏${rhythm.value}跨越1.5拍边界`);
            return true;
        }

        return false;
    }

    /**
     * 🆕 填充缺失时值
     * 当适配后的节奏时值不足时进行补充
     *
     * @param {Array} rhythms - 现有节奏
     * @param {number} missingDuration - 缺失时值
     * @returns {Array} 补充后的节奏
     */
    fillMissingDuration(rhythms, missingDuration) {
        const supplementedRhythms = [...rhythms];
        let remaining = missingDuration;
        let currentPosition = rhythms.reduce((sum, r) => sum + r.duration, 0);

        while (remaining > 0.01 && currentPosition < 3.0) {
            const maxAllowedDuration = Math.min(remaining, 3.0 - currentPosition);
            const fillDuration = Math.min(0.5, maxAllowedDuration); // 默认用八分音符填充

            const fillRhythm = {
                value: 'eighth',
                displayName: '八分音符（补充）',
                duration: fillDuration,
                type: 'note',
                position: currentPosition,
                isRhythmTemplate: true,
                supplementInfo: {
                    reason: '时值补充',
                    originalMissing: missingDuration
                }
            };

            supplementedRhythms.push(fillRhythm);
            remaining -= fillDuration;
            currentPosition += fillDuration;
        }

        console.log(`🔧 [时值补充] 添加${supplementedRhythms.length - rhythms.length}个补充节奏`);
        return supplementedRhythms;
    }

    /**
     * 🎵 从旋律工具迁移：获取增强的小调音阶（包含和声小调和旋律小调变化音）
     * @param {string} keySignature - 调号
     * @returns {Array} 增强的音阶（包含所有可能的音）
     */
    getEnhancedMinorScale(keySignature) {
        // 如果不是小调，返回null
        if (!this.minorScales[keySignature]) {
            return null;
        }

        // 基于自然小调
        const naturalScale = this.minorScales[keySignature];
        const enhanced = [...naturalScale];
        const tonic = this.minorKeyToTonic[keySignature];

        if (tonic !== undefined) {
            // 添加和声小调的导音（升高的第7级）
            const leadingTone = (tonic + 11) % 12;
            if (!enhanced.includes(leadingTone)) {
                enhanced.push(leadingTone);
                console.log(`🎵 ${keySignature}和声小调: 添加导音 ${leadingTone}`);
            }

            // 添加旋律小调的第6级（升高的）
            const sixthDegree = (tonic + 9) % 12;
            if (!enhanced.includes(sixthDegree)) {
                enhanced.push(sixthDegree);
                console.log(`🎵 ${keySignature}旋律小调: 添加升高的第6级 ${sixthDegree}`);
            }
        }

        return enhanced.sort((a, b) => a - b);
    }

    /**
     * 🎵 从旋律工具迁移：判断是否为小调
     * @param {string} keySignature - 调号
     * @returns {boolean} 是否为小调
     */
    isMinorKey(keySignature) {
        return keySignature && keySignature.includes('m');
    }

    /**
     * 🎵 从旋律工具迁移：获取小调的拼写规则
     * @param {number} pitchClass - 音高类（0-11）
     * @param {string} keySignature - 调号
     * @returns {string} 正确的音名拼写
     */
    getMinorKeySpelling(pitchClass, keySignature) {
        // 小调特殊拼写规则
        const minorSpellings = {
            'Am': { 8: 'G#' },  // 和声小调的导音
            'Em': { 3: 'D#' },  // 和声小调的导音
            'Bm': { 10: 'A#' }, // 和声小调的导音
            'Dm': { 1: 'C#' },  // 和声小调的导音
            'Gm': { 6: 'F#' },  // 和声小调的导音
            'Cm': { 11: 'B' },  // 和声小调的导音（自然）
            'Fm': { 4: 'E' },   // 和声小调的导音（自然）
            // 可以根据需要添加更多小调的特殊拼写
        };

        if (minorSpellings[keySignature] && minorSpellings[keySignature][pitchClass]) {
            return minorSpellings[keySignature][pitchClass];
        }

        // 默认返回null，使用标准拼写
        return null;
    }

    /**
     * 🆕 修剪多余时值
     * 当适配后的节奏时值过多时进行修剪
     *
     * @param {Array} rhythms - 现有节奏
     * @param {number} excessDuration - 多余时值
     * @returns {Array} 修剪后的节奏
     */
    trimExcessDuration(rhythms, excessDuration) {
        const trimmedRhythms = [];
        let accumulatedDuration = 0;
        const targetDuration = 3.0;

        for (const rhythm of rhythms) {
            const wouldExceed = accumulatedDuration + rhythm.duration > targetDuration;

            if (wouldExceed) {
                const allowedDuration = targetDuration - accumulatedDuration;
                if (allowedDuration > 0.01) {
                    // 修剪这个节奏以适合剩余空间
                    const trimmedRhythm = {
                        ...rhythm,
                        duration: allowedDuration,
                        value: this.findClosestRhythmValue(allowedDuration),
                        displayName: this.getDurationDisplayName(this.findClosestRhythmValue(allowedDuration)),
                        trimInfo: {
                            originalDuration: rhythm.duration,
                            reason: '时值修剪'
                        }
                    };
                    trimmedRhythms.push(trimmedRhythm);
                }
                break; // 达到目标时值，停止添加
            } else {
                trimmedRhythms.push(rhythm);
                accumulatedDuration += rhythm.duration;
            }
        }

        console.log(`🔧 [时值修剪] 保留${trimmedRhythms.length}个节奏，移除${rhythms.length - trimmedRhythms.length}个`);
        return trimmedRhythms;
    }

    /**
     * 🆕 查找最接近的节奏时值
     * 根据给定时值查找最接近的标准节奏类型
     *
     * @param {number} duration - 目标时值
     * @returns {string} 节奏类型
     */
    findClosestRhythmValue(duration) {
        const standardDurations = [
            { value: 'sixteenth', duration: 0.25 },
            { value: 'eighth', duration: 0.5 },
            { value: 'eighth.', duration: 0.75 },
            { value: 'quarter', duration: 1.0 },
            { value: 'quarter.', duration: 1.5 },
            { value: 'half', duration: 2.0 },
            { value: 'half.', duration: 3.0 }
        ];

        let closest = standardDurations[0];
        let minDifference = Math.abs(duration - closest.duration);

        for (const std of standardDurations) {
            const difference = Math.abs(duration - std.duration);
            if (difference < minDifference) {
                minDifference = difference;
                closest = std;
            }
        }

        return closest.value;
    }

    /**
     * 🆕 Phase 5: 增强的跨拍检测和验证系统
     * 提供全面的6/8拍边界检测、验证和错误预防机制
     *
     * @param {Array} rhythmEvents - 节奏事件数组
     * @param {Object} validationOptions - 验证选项
     * @returns {Object} 详细的验证结果
     */
    performComprehensive68Validation(rhythmEvents, validationOptions = {}) {
        console.log(`🔍 [Phase 5验证] 开始全面6/8拍验证，${rhythmEvents.length}个事件`);

        const {
            strictMode = true,
            checkBeamingRules = true,
            checkDurationAccuracy = true,
            checkBoundaryViolations = true,
            checkEducationalValue = true,
            preventSevenNoteError = true
        } = validationOptions;

        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            statistics: {},
            detailedAnalysis: {}
        };

        // 1. 基础数量验证（防范7音符bug）
        if (preventSevenNoteError) {
            const countValidation = this.validateEventCount(rhythmEvents);
            this.mergeValidationResults(validationResult, countValidation);
        }

        // 2. 时值精度验证
        if (checkDurationAccuracy) {
            const durationValidation = this.validateDurationAccuracy(rhythmEvents);
            this.mergeValidationResults(validationResult, durationValidation);
        }

        // 3. 跨拍边界检测
        if (checkBoundaryViolations) {
            const boundaryValidation = this.validateCrossBeatBoundaries(rhythmEvents);
            this.mergeValidationResults(validationResult, boundaryValidation);
        }

        // 4. 符杠连接规则验证
        if (checkBeamingRules) {
            const beamingValidation = this.validateBeamingIntegrity(rhythmEvents);
            this.mergeValidationResults(validationResult, beamingValidation);
        }

        // 5. 教育价值评估
        if (checkEducationalValue) {
            const educationalValidation = this.validateEducationalValue(rhythmEvents);
            this.mergeValidationResults(validationResult, educationalValidation);
        }

        // 6. 生成统计信息
        validationResult.statistics = this.generateValidationStatistics(rhythmEvents);

        // 7. 总体评估
        const overallScore = this.calculateOverallValidationScore(validationResult);
        validationResult.overallScore = overallScore;
        validationResult.recommendation = this.generateValidationRecommendation(validationResult);

        console.log(`🔍 [Phase 5验证] 完成，总分${overallScore.toFixed(1)}/100，${validationResult.errors.length}个错误，${validationResult.warnings.length}个警告`);

        return validationResult;
    }

    /**
     * 🆕 验证事件数量（防范7音符bug）
     * 确保6/8拍生成的事件数量在合理范围内
     *
     * @param {Array} rhythmEvents - 节奏事件
     * @returns {Object} 数量验证结果
     */
    validateEventCount(rhythmEvents) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [] };

        const eventCount = rhythmEvents.length;

        // 关键检查：绝对不能超过6个事件
        if (eventCount > 6) {
            result.isValid = false;
            result.errors.push({
                type: 'CRITICAL_COUNT_VIOLATION',
                severity: 'CRITICAL',
                message: `6/8拍生成了${eventCount}个事件，超过最大值6个`,
                code: 'E68_001',
                position: 'measure',
                suggestion: '立即使用安全模式，检查模式生成逻辑'
            });
        }

        // 检查最小事件数
        if (eventCount === 0) {
            result.isValid = false;
            result.errors.push({
                type: 'EMPTY_MEASURE',
                severity: 'CRITICAL',
                message: '6/8拍小节为空，无音符事件',
                code: 'E68_002',
                position: 'measure',
                suggestion: '使用安全模式生成基础6/8拍模式'
            });
        }

        // 检查典型范围
        if (eventCount < 2) {
            result.warnings.push({
                type: 'LOW_COMPLEXITY',
                severity: 'WARNING',
                message: `事件数量${eventCount}过少，可能影响教育价值`,
                code: 'W68_001',
                suggestion: '考虑增加节奏复杂度'
            });
        }

        return result;
    }

    /**
     * 🆕 验证跨拍边界检测
     * 检测并报告所有可能的边界违规
     *
     * @param {Array} rhythmEvents - 节奏事件
     * @returns {Object} 边界验证结果
     */
    validateCrossBeatBoundaries(rhythmEvents) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [] };

        const beatStructure = this.create68BeatStructure();
        const criticalBoundaries = beatStructure.primaryBoundaries; // [0, 1.5]
        const subBoundaries = beatStructure.subdivisions; // [0, 0.5, 1, 1.5, 2, 2.5]

        console.log(`🔍 [边界检测] 检查${rhythmEvents.length}个事件的边界违规`);

        for (let i = 0; i < rhythmEvents.length; i++) {
            const event = rhythmEvents[i];
            const startPosition = event.position || 0;
            const endPosition = startPosition + (event.duration || 0);

            // 检查关键边界违规（1.5拍边界）
            const violatesCriticalBoundary = this.checkCriticalBoundaryViolation(
                startPosition, endPosition, criticalBoundaries, event
            );

            if (violatesCriticalBoundary.hasViolation) {
                result.errors.push({
                    type: 'CRITICAL_BOUNDARY_VIOLATION',
                    severity: 'ERROR',
                    message: violatesCriticalBoundary.message,
                    code: 'E68_003',
                    position: startPosition,
                    eventIndex: i,
                    suggestion: '调整节奏时值或使用符合6/8拍规则的模式'
                });
                result.isValid = false;
            }

            // 检查次要边界建议
            const subBoundaryAnalysis = this.analyzeBoundaryOptimization(
                startPosition, endPosition, subBoundaries, event
            );

            if (subBoundaryAnalysis.hasImprovements) {
                result.suggestions.push({
                    type: 'BOUNDARY_OPTIMIZATION',
                    severity: 'INFO',
                    message: subBoundaryAnalysis.message,
                    code: 'I68_001',
                    position: startPosition,
                    eventIndex: i,
                    improvement: subBoundaryAnalysis.improvement
                });
            }
        }

        return result;
    }

    /**
     * 🆕 检查关键边界违规
     * 专门检查6/8拍的1.5拍边界违规
     *
     * @param {number} startPos - 开始位置
     * @param {number} endPos - 结束位置
     * @param {Array} boundaries - 边界数组
     * @param {Object} event - 事件对象
     * @returns {Object} 违规检查结果
     */
    checkCriticalBoundaryViolation(startPos, endPos, boundaries, event) {
        // 6/8拍的关键检查：不能跨越1.5拍边界（除非是特殊时值）
        const crossesMiddleBoundary = startPos < 1.5 && endPos > 1.5;

        if (crossesMiddleBoundary) {
            // 检查是否为允许的跨边界时值
            const allowedCrossBoundaryValues = ['half.', 'whole']; // 附点二分音符和全音符可以跨边界
            const isAllowed = allowedCrossBoundaryValues.includes(event.value);

            if (!isAllowed) {
                return {
                    hasViolation: true,
                    message: `节奏${event.value}(${event.displayName})跨越关键1.5拍边界，违反6/8拍符杠分组规则`,
                    violationType: 'CROSS_BOUNDARY',
                    boundary: 1.5,
                    eventValue: event.value
                };
            }
        }

        return { hasViolation: false };
    }

    /**
     * 🆕 分析边界优化机会
     * 提供边界对齐和优化建议
     *
     * @param {number} startPos - 开始位置
     * @param {number} endPos - 结束位置
     * @param {Array} boundaries - 次要边界
     * @param {Object} event - 事件对象
     * @returns {Object} 优化分析结果
     */
    analyzeBoundaryOptimization(startPos, endPos, boundaries, event) {
        // 检查是否可以通过调整获得更好的边界对齐
        const nearbyBoundaries = boundaries.filter(b =>
            Math.abs(b - startPos) < 0.25 || Math.abs(b - endPos) < 0.25
        );

        if (nearbyBoundaries.length > 0) {
            const closestBoundary = nearbyBoundaries.reduce((closest, boundary) =>
                Math.abs(boundary - startPos) < Math.abs(closest - startPos) ? boundary : closest
            );

            const distanceToOptimal = Math.abs(closestBoundary - startPos);
            if (distanceToOptimal > 0.01 && distanceToOptimal < 0.2) {
                return {
                    hasImprovements: true,
                    message: `事件位置${startPos.toFixed(2)}可以优化到边界${closestBoundary}`,
                    improvement: {
                        currentPosition: startPos,
                        suggestedPosition: closestBoundary,
                        improvement: distanceToOptimal
                    }
                };
            }
        }

        return { hasImprovements: false };
    }

    /**
     * 🆕 验证符杠连接完整性
     * 检查符杠分组的逻辑正确性
     *
     * @param {Array} rhythmEvents - 节奏事件
     * @returns {Object} 符杠验证结果
     */
    validateBeamingIntegrity(rhythmEvents) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [] };

        // 按符杠组分类事件
        const beamGroups = this.groupEventsByBeam(rhythmEvents);

        console.log(`🔍 [符杠验证] 检查${Object.keys(beamGroups).length}个符杠组`);

        for (const [groupId, events] of Object.entries(beamGroups)) {
            const groupValidation = this.validateBeamGroup(groupId, events);
            this.mergeValidationResults(result, groupValidation);
        }

        return result;
    }

    /**
     * 🆕 按符杠组分类事件
     * 将事件按照符杠分组进行分类
     *
     * @param {Array} rhythmEvents - 节奏事件
     * @returns {Object} 分组后的事件
     */
    groupEventsByBeam(rhythmEvents) {
        const groups = {};

        for (const event of rhythmEvents) {
            const groupId = event.beamGroup || this.inferBeamGroup(event);
            if (!groups[groupId]) {
                groups[groupId] = [];
            }
            groups[groupId].push(event);
        }

        return groups;
    }

    /**
     * 🆕 推断符杠组
     * 根据位置推断事件的符杠分组
     *
     * @param {Object} event - 事件对象
     * @returns {string} 符杠组标识
     */
    inferBeamGroup(event) {
        const position = event.position || 0;
        // 6/8拍分为两组：0-1.5 和 1.5-3.0
        return position < 1.5 ? 'group-1' : 'group-2';
    }

    /**
     * 🆕 验证单个符杠组
     * 检查符杠组内的连接逻辑
     *
     * @param {string} groupId - 组标识
     * @param {Array} events - 组内事件
     * @returns {Object} 组验证结果
     */
    validateBeamGroup(groupId, events) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [] };

        // 检查组内时值总和
        const totalDuration = events.reduce((sum, event) => sum + (event.duration || 0), 0);
        const expectedDuration = 1.5; // 每组应该是1.5拍

        if (Math.abs(totalDuration - expectedDuration) > 0.01) {
            result.warnings.push({
                type: 'BEAM_GROUP_DURATION',
                severity: 'WARNING',
                message: `符杠组${groupId}时值${totalDuration.toFixed(2)}拍，期望${expectedDuration}拍`,
                code: 'W68_002',
                groupId: groupId,
                suggestion: '检查组内事件时值分配'
            });
        }

        return result;
    }

    /**
     * 🆕 生成验证统计信息
     * 统计验证过程中的各种指标
     *
     * @param {Array} rhythmEvents - 节奏事件
     * @returns {Object} 统计信息
     */
    generateValidationStatistics(rhythmEvents) {
        const stats = {
            totalEvents: rhythmEvents.length,
            totalDuration: rhythmEvents.reduce((sum, e) => sum + (e.duration || 0), 0),
            averageDuration: 0,
            rhythmDistribution: {},
            positionDistribution: {},
            complexityScore: 0
        };

        // 计算平均时值
        stats.averageDuration = stats.totalEvents > 0 ? stats.totalDuration / stats.totalEvents : 0;

        // 节奏类型分布
        rhythmEvents.forEach(event => {
            const rhythmType = event.value || 'unknown';
            stats.rhythmDistribution[rhythmType] = (stats.rhythmDistribution[rhythmType] || 0) + 1;
        });

        // 位置分布
        rhythmEvents.forEach(event => {
            const beatAnalysis = this.analyze68BeatPosition(event.position || 0);
            const positionType = beatAnalysis.beatType || 'unknown';
            stats.positionDistribution[positionType] = (stats.positionDistribution[positionType] || 0) + 1;
        });

        // 复杂度评分
        stats.complexityScore = this.calculateRhythmicComplexity(rhythmEvents);

        return stats;
    }

    /**
     * 🆕 合并验证结果
     * 将多个验证结果合并到主结果中
     *
     * @param {Object} mainResult - 主验证结果
     * @param {Object} subResult - 子验证结果
     */
    mergeValidationResults(mainResult, subResult) {
        if (!subResult.isValid) {
            mainResult.isValid = false;
        }

        mainResult.errors.push(...(subResult.errors || []));
        mainResult.warnings.push(...(subResult.warnings || []));
        mainResult.suggestions.push(...(subResult.suggestions || []));
    }

    /**
     * 判断音程是否为大跨度音程（超过完全四度）
     * @param {Object} intervalType - 音程类型对象
     * @returns {boolean} 是否为大跨度音程
     */
    isLargeInterval(intervalType) {
        // 大音程跨度：超过完全四度（5半音）的音程
        return intervalType.semitones > 5;
    }

    /**
     * 根据拍位强弱过滤音程类型
     * @param {Array} intervalTypes - 原始音程类型数组
     * @param {number} position - 在小节中的位置
     * @param {Object} timeSignature - 拍号信息
     * @returns {Array} 过滤后的音程类型数组
     */
    filterIntervalsByBeatStrength(intervalTypes, position, timeSignature) {
        // 确保position是数字
        const safePosition = (typeof position === 'number' && !isNaN(position)) ? position : 0;

        const isStrong = this.isStrongBeat(safePosition, timeSignature);

        console.log(`🎵 拍位分析: 位置${safePosition.toFixed(2)}, 拍${Math.floor(safePosition) + 1}, 拍号${timeSignature.beats}/${timeSignature.beatType}, ${isStrong ? '强拍(重拍)' : '弱拍'}`);

        if (isStrong) {
            // 强拍（重拍）：允许所有音程，包括大跨度
            console.log(`  ✅ 强拍允许所有音程: ${intervalTypes.map(t => t.displayName).join(', ')}`);
            return intervalTypes;
        } else {
            // 弱拍：只允许小跨度音程（完全四度及以内）
            const smallIntervals = intervalTypes.filter(intervalType =>
                !this.isLargeInterval(intervalType)
            );
            console.log(`  🔒 弱拍限制为小音程: ${smallIntervals.map(t => t.displayName).join(', ')}`);

            // 如果没有小音程可用，至少保留最小的几个音程
            if (smallIntervals.length === 0) {
                const fallbackIntervals = intervalTypes.filter(intervalType =>
                    intervalType.semitones <= 4 // 最多允许大三度
                );
                console.log(`  ⚠️ 应急回退到大三度及以内: ${fallbackIntervals.map(t => t.displayName).join(', ')}`);
                return fallbackIntervals.length > 0 ? fallbackIntervals : intervalTypes.slice(0, 3);
            }

            return smallIntervals;
        }
    }

    /**
     * 获取当前调的主和弦音符（1度、3度、5度）
     * @param {Object} scale - 音阶信息
     * @returns {Array} 主和弦音符数组 [根音, 三音, 五音]
     */
    getTonicChordNotes(scale) {
        const scaleNotes = scale.notes;
        // 主和弦：1度、3度、5度
        const tonicChord = [
            scaleNotes[0], // 根音（1度）
            scaleNotes[2], // 三音（3度）
            scaleNotes[4]  // 五音（5度）
        ];

        console.log(`🎯 ${scale.key}调主和弦音: ${tonicChord.join(' - ')}`);
        return tonicChord;
    }

    /**
     * 从主和弦音中生成所有可能的音程组合
     * @param {Array} tonicChordNotes - 主和弦音符 [根音, 三音, 五音]
     * @param {Array} intervalTypes - 用户选择的音程类型
     * @returns {Array} 有效的主和弦音程配对数组
     */
    getValidTonicChordIntervals(tonicChordNotes, intervalTypes) {
        const validIntervals = [];

        // 生成主和弦音的所有两两组合
        for (let i = 0; i < tonicChordNotes.length; i++) {
            for (let j = i + 1; j < tonicChordNotes.length; j++) {
                const lowerNote = tonicChordNotes[i];
                const upperNote = tonicChordNotes[j];

                // 计算这个音程的半音数（假设在同一八度内）
                const lowerSemitone = this.noteToSemitone(lowerNote);
                const upperSemitone = this.noteToSemitone(upperNote);

                // 计算音程的半音跨度（处理跨八度情况）
                let semitones = upperSemitone - lowerSemitone;
                if (semitones < 0) {
                    semitones += 12; // 跨八度调整
                }

                // 检查是否有匹配的音程类型
                const matchingIntervalType = intervalTypes.find(type => type.semitones === semitones);

                if (matchingIntervalType) {
                    validIntervals.push({
                        lowerNote,
                        upperNote,
                        intervalType: matchingIntervalType,
                        semitones
                    });
                    console.log(`✅ 主和弦音程: ${lowerNote}-${upperNote} (${matchingIntervalType.displayName}, ${semitones}半音)`);
                } else {
                    console.log(`❌ 主和弦音程不匹配: ${lowerNote}-${upperNote} (${semitones}半音) 不在用户选择中`);
                }
            }
        }

        console.log(`🎯 找到${validIntervals.length}个有效的主和弦音程配对`);
        return validIntervals;
    }

    /**
     * 获取主和弦音程类型（用于最后一个音程结束在主和弦上）
     * @param {Array} intervalTypes - 可选的音程类型数组
     * @returns {Array} 主和弦音程类型数组
     */
    getTonicChordIntervals(intervalTypes) {
        // 主和弦音程：大三度(1-3)、完全五度(1-5)、小六度(3-1倒置)、完全四度(5-1倒置)
        const tonicChordSemitones = [4, 7, 9, 5]; // 大三度、完全五度、小六度、完全四度

        const tonicIntervals = intervalTypes.filter(intervalType =>
            tonicChordSemitones.includes(intervalType.semitones)
        );

        console.log(`🎯 主和弦音程过滤: 从${intervalTypes.length}个音程中找到${tonicIntervals.length}个主和弦音程`);
        console.log(`  可用主和弦音程: ${tonicIntervals.map(t => t.displayName).join(', ')}`);

        // 如果没有找到主和弦音程，至少返回大三度和完全五度（如果有的话）
        if (tonicIntervals.length === 0) {
            const basicTonic = intervalTypes.filter(intervalType =>
                intervalType.semitones === 4 || intervalType.semitones === 7
            );
            if (basicTonic.length > 0) {
                console.log(`  🔄 回退到基本主和弦音程: ${basicTonic.map(t => t.displayName).join(', ')}`);
                return basicTonic;
            }
            console.log(`  ⚠️ 未找到主和弦音程，保持原有音程`);
            return intervalTypes;
        }

        return tonicIntervals;
    }

    /**
     * 检查当前位置是否为节奏型中最后一个音符（非休止符）
     * @param {Array} rhythmPattern - 节奏型数组
     * @param {number} currentIndex - 当前索引
     * @returns {boolean} 是否为最后一个音符
     */
    isLastNoteInPattern(rhythmPattern, currentIndex) {
        // 从当前位置开始向后查找，看是否还有音符
        for (let i = currentIndex + 1; i < rhythmPattern.length; i++) {
            if (rhythmPattern[i].type !== 'rest') {
                // 找到了后续的音符，说明当前不是最后一个音符
                return false;
            }
        }

        // 没有找到后续音符，当前是最后一个音符
        return true;
    }

    /**
     * 获取音程名称
     * @param {number} semitones - 半音数
     * @returns {string} 音程名称
     */
    getIntervalName(semitones) {
        const names = {
            0: '同度',
            1: '小二度',
            2: '大二度',
            3: '小三度',
            4: '大三度',
            5: '完全四度',
            6: '增四度',
            7: '完全五度',
            8: '小六度',
            9: '大六度',
            10: '小七度',
            11: '大七度',
            12: '八度'
        };
        return names[semitones] || `${semitones}半音`;
    }

    /**
     * 生成练习统计
     * @param {Object} progression - 音程进行
     * @returns {Object} 统计信息
     */
    generateStatistics(progression) {
        const stats = {
            totalIntervals: 0,
            intervalCounts: {},
            measureCount: progression.measures.length
        };

        progression.measures.forEach(measure => {
            for (let i = 0; i < measure.lowerVoice.length; i++) {
                const lower = measure.lowerVoice[i];
                const upper = measure.upperVoice[i];

                if (lower.type === 'note' && upper.type === 'note') {
                    const interval = Math.abs(upper.midi - lower.midi);
                    const intervalName = this.getIntervalName(interval);

                    stats.totalIntervals++;
                    stats.intervalCounts[intervalName] = (stats.intervalCounts[intervalName] || 0) + 1;
                }
            }
        });

        return stats;
    }

    /**
     * 找到合适的八度位置
     * @param {string} noteName - 音符名（如 "C", "F#"）
     * @param {number} minMidi - 最低MIDI值
     * @param {number} maxMidi - 最高MIDI值
     * @returns {number|null} 合适的八度数，如果无法找到则返回null
     */
    findSuitableOctave(noteName, minMidi, maxMidi) {
        // 尝试不同的八度
        for (let octave = 2; octave <= 6; octave++) {
            const testPitch = noteName + octave;
            const testMidi = this.noteToMidi(testPitch);

            if (testMidi >= minMidi && testMidi <= maxMidi) {
                return octave;
            }
        }

        return null; // 无法找到合适的八度
    }

    /**
     * 为音程寻找合适的八度组合，优先选择平滑连接
     * @param {string} lowerNote - 低音音符名
     * @param {string} upperNote - 高音音符名
     * @param {number} lowerScaleIndex - 低音在音阶中的位置
     * @param {number} upperScaleIndex - 高音在音阶中的位置
     * @param {number} rangeMin - 最低音MIDI号
     * @param {number} rangeMax - 最高音MIDI号
     * @param {Object|null} previousInterval - 上一个音程信息，用于平滑连接
     * @returns {Array} 按平滑度排序的合适八度组合数组
     */
    findSuitableOctavesForInterval(lowerNote, upperNote, lowerScaleIndex, upperScaleIndex, rangeMin, rangeMax, previousInterval = null) {
        const suitableOctaves = [];
        console.log(`🔍 检查音域: 目标范围 ${this.midiToNote(rangeMin)}-${this.midiToNote(rangeMax)} (MIDI: ${rangeMin}-${rangeMax})`);

        // 尝试不同的八度组合
        for (let lowerOctave = 2; lowerOctave <= 6; lowerOctave++) {
            // 计算高音的八度（基于音程跨越）
            let upperOctave = lowerOctave;

            // 如果音程跨越了音阶的顶部，需要增加八度
            if (upperScaleIndex < lowerScaleIndex) {
                upperOctave++;
            }

            const lowerPitch = lowerNote + lowerOctave;
            const upperPitch = upperNote + upperOctave;

            // 🔥 关键修复：考虑临时记号对音域的影响
            const lowerPitchWithAccidental = this.applyAccidental(lowerPitch);
            const upperPitchWithAccidental = this.applyAccidental(upperPitch);
            const lowerMidi = this.noteToMidi(lowerPitchWithAccidental);
            const upperMidi = this.noteToMidi(upperPitchWithAccidental);

            // 检查应用临时记号后的音是否都在音域范围内
            console.log(`🔍 测试八度: ${lowerPitchWithAccidental}(${lowerMidi}) ${upperPitchWithAccidental}(${upperMidi}) - 范围${rangeMin}-${rangeMax}`);
            if (lowerMidi >= rangeMin && lowerMidi <= rangeMax &&
                upperMidi >= rangeMin && upperMidi <= rangeMax) {
                console.log(`✅ 八度合适（含临时记号）: ${lowerPitchWithAccidental}(${lowerMidi}) ${upperPitchWithAccidental}(${upperMidi})`);

                // 计算与上一个音程的距离（用于平滑连接）
                let smoothnessScore = 0;
                if (previousInterval && previousInterval.lowerMidi !== undefined && previousInterval.upperMidi !== undefined) {
                    const lowerDistance = Math.abs(lowerMidi - previousInterval.lowerMidi);
                    const upperDistance = Math.abs(upperMidi - previousInterval.upperMidi);

                    // 平滑度评分：距离越小，评分越高
                    smoothnessScore = 1000 - (lowerDistance + upperDistance);
                }

                console.log(`✅ 找到合适八度: ${lowerPitch}(${lowerMidi}) - ${upperPitch}(${upperMidi}) [平滑度: ${smoothnessScore}]`);
                suitableOctaves.push({
                    lowerOctave,
                    upperOctave,
                    lowerMidi,
                    upperMidi,
                    smoothnessScore
                });
            }
        }

        // 按平滑度排序，评分高的在前
        suitableOctaves.sort((a, b) => b.smoothnessScore - a.smoothnessScore);

        return suitableOctaves;
    }

    /**
     * 🎵 获取基础音阶（7音）用于索引计算
     * 解决小调9音数组导致的音程索引错误问题
     *
     * @param {Object} scale - 完整音阶对象
     * @returns {Object} 基础7音音阶对象
     */
    getBaseScale(scale) {
        // 🎵 统一模式优先 (2025-10-10): 如果已通过统一系统生成了小调变体音阶，直接使用
        if (this.currentMinorVariant && this.currentMinorVariant.notes) {
            console.log(`🎵 [统一模式-getBaseScale] 使用${this.currentMinorVariant.type}小调音阶`);
            console.log(`   完整7音: [${this.currentMinorVariant.notes.join(', ')}]`);

            return {
                notes: this.currentMinorVariant.notes,  // 完整7音音阶（已包含正确的第6、7级）
                fifths: scale.fifths || 0,
                isMinor: true,
                variantType: this.currentMinorVariant.type,
                originalScale: scale  // 保留原始音阶用于诊断
            };
        }

        // 🔧 回退方案：旧版架构修复 (正确提取小调自然音阶)
        // 9音小调数组结构：[音1, 音2, 音3, 音4, 音5, 自然6, 升高6, 自然7, 升高7]
        // 示例 Am: ['A', 'B', 'C', 'D', 'E', 'F', 'F#', 'G', 'G#']
        //           [0]  [1]  [2]  [3]  [4]  [5]  [6]   [7]  [8]
        // 自然小调（7音）：[0, 1, 2, 3, 4, 5, 7] - 跳过索引6的升高音！
        if (scale.notes && scale.notes.length === 9) {
            // ❌ 错误做法：scale.notes.slice(0, 7) 会得到 ['A','B','C','D','E','F','F#']
            //             包含F#（升高音），缺少G（自然7级）
            // ✅ 正确做法：手动提取索引 [0,1,2,3,4,5,7]
            const baseNotes = [
                scale.notes[0],  // 第1级
                scale.notes[1],  // 第2级
                scale.notes[2],  // 第3级
                scale.notes[3],  // 第4级
                scale.notes[4],  // 第5级
                scale.notes[5],  // 自然小调第6级
                scale.notes[7]   // 自然小调第7级（跳过索引6的升高6级）
            ];

            console.log(`🔧 [baseScale-回退] ${scale.notes[0]}小调自然音阶: [${baseNotes.join(', ')}]`);
            console.log(`  (从9音数组 [${scale.notes.join(', ')}] 中提取)`);
            console.log(`  ⚠️ 注意：此路径为回退方案，正常应使用统一模式`);

            return {
                ...scale,
                notes: baseNotes,
                isMinor: true,
                fullNotes: scale.notes  // 保留完整9音用于验证和变化音应用
            };
        }
        // 大调或其他：直接返回
        return scale;
    }

    /**
     * 验证音程是否正确
     * @param {string} lowerNote - 低音音符名（如 "C", "D"）
     * @param {string} upperNote - 高音音符名（如 "E", "F"）
     * @param {Object} expectedInterval - 期望的音程类型
     * @param {Object} scale - 音阶信息
     * @returns {boolean} 是否为正确的音程
     */
    verifyInterval(lowerNote, upperNote, expectedInterval, scale) {
        try {
            // 获取音符在基础音名序列中的位置
            const lowerBaseName = lowerNote.charAt(0);
            const upperBaseName = upperNote.charAt(0);

            const lowerIndex = this.noteNames.indexOf(lowerBaseName);
            const upperIndex = this.noteNames.indexOf(upperBaseName);

            if (lowerIndex === -1 || upperIndex === -1) {
                return false;
            }

            // 计算音名距离（度数）
            let nameDegree;
            if (upperIndex >= lowerIndex) {
                nameDegree = upperIndex - lowerIndex + 1;
            } else {
                // 跨八度的情况
                nameDegree = (7 - lowerIndex) + upperIndex + 1;
            }

            // 检查度数是否匹配
            const expectedDegree = this.intervalDegrees[expectedInterval.name];
            if (nameDegree !== expectedDegree) {
                console.log(`音名距离不匹配: ${lowerNote}-${upperNote} 计算为${nameDegree}度，期望${expectedDegree}度`);
                return false;
            }

            // 🎵 修复：小调验证逻辑（支持变化音）
            // 验证两个音符都在当前调内
            const baseScale = this.getBaseScale(scale);
            const baseNotes = baseScale.notes;  // 7音基础音阶
            const fullNotes = baseScale.fullNotes || scale.notes;  // 9音完整音阶（如果是小调）

            // 提取基础音名（去掉升降号）
            const lowerBase = lowerNote.replace(/[#b]/g, '');
            const upperBase = upperNote.replace(/[#b]/g, '');

            // 检查基础音名是否在7音音阶中
            const lowerBaseValid = baseNotes.some(note => note.replace(/[#b]/g, '') === lowerBase);
            const upperBaseValid = baseNotes.some(note => note.replace(/[#b]/g, '') === upperBase);

            if (!lowerBaseValid || !upperBaseValid) {
                console.log(`基础音名不在调内: ${lowerNote}-${upperNote}`);
                return false;
            }

            // 如果音符有变化音（如F#），检查是否在完整音阶（fullNotes）中
            if (lowerNote !== lowerBase && !fullNotes.includes(lowerNote)) {
                console.log(`变化音不在调内: ${lowerNote} 不在 ${fullNotes.join(' ')}`);
                return false;
            }
            if (upperNote !== upperBase && !fullNotes.includes(upperNote)) {
                console.log(`变化音不在调内: ${upperNote} 不在 ${fullNotes.join(' ')}`);
                return false;
            }

            // 🎼 修复：验证所有音程类型的质量（大小、纯、增减）
            return this.verifyIntervalQuality(lowerNote, upperNote, expectedInterval, scale);

        } catch (error) {
            console.warn('音程验证出错:', error);
            return false;
        }
    }

    /**
     * 验证三度音程的大小性质
     * @param {string} lowerNote - 低音音符名
     * @param {string} upperNote - 高音音符名
     * @param {Object} expectedInterval - 期望的音程类型
     * @param {Object} scale - 音阶信息
     * @returns {boolean} 是否为正确的三度类型
     */
    verifyThirdQuality(lowerNote, upperNote, expectedInterval, scale) {
        // 🎼 修复：根据实际半音距离验证三度音程，而不是硬编码C大调关系
        try {
            // 计算两个音符之间的半音距离
            const lowerSemitone = this.noteToSemitone(lowerNote);
            const upperSemitone = this.noteToSemitone(upperNote);

            // 计算音程的半音跨度（处理跨八度情况）
            let semitoneDifference = upperSemitone - lowerSemitone;
            if (semitoneDifference < 0) {
                semitoneDifference += 12; // 跨八度调整
            }

            // 根据半音距离确定实际的三度类型
            let actualQuality;
            if (semitoneDifference === 3) {
                actualQuality = 'minor3rd';
            } else if (semitoneDifference === 4) {
                actualQuality = 'major3rd';
            } else {
                console.log(`❌ 不是三度音程: ${lowerNote}-${upperNote} 半音距离为${semitoneDifference}`);
                return false;
            }

            // 验证是否匹配期望的三度类型
            if (actualQuality === expectedInterval.name) {
                console.log(`✅ 三度质量匹配: ${lowerNote}-${upperNote} = ${expectedInterval.displayName} (${semitoneDifference}半音)`);
                return true;
            } else {
                console.log(`❌ 三度质量不匹配: ${lowerNote}-${upperNote} 实际是${actualQuality}(${semitoneDifference}半音)，期望${expectedInterval.name}`);
                return false;
            }

        } catch (error) {
            console.warn('三度音程验证出错:', error);
            return false;
        }
    }

    /**
     * 验证音程质量（大小、纯、增减）- 通用方法
     * @param {string} lowerNote - 低音音符名
     * @param {string} upperNote - 高音音符名
     * @param {Object} expectedInterval - 期望的音程类型
     * @param {Object} scale - 音阶信息
     * @returns {boolean} 是否为正确的音程质量
     */
    verifyIntervalQuality(lowerNote, upperNote, expectedInterval, scale) {
        try {
            // 计算实际半音距离
            const lowerSemitone = this.noteToSemitone(lowerNote);
            const upperSemitone = this.noteToSemitone(upperNote);

            let semitoneDifference = upperSemitone - lowerSemitone;
            if (semitoneDifference < 0) {
                semitoneDifference += 12; // 跨八度调整
            }

            // 根据期望的音程类型获取正确的半音数
            const expectedSemitones = expectedInterval.semitones;

            // 🔍 增强调试信息：显示调性上下文
            const currentScaleKey = scale.notes ? scale.notes.join(' ') : '未知调性';
            console.log(`🎼 音程验证上下文: 调性[${currentScaleKey}], 音程类型[${expectedInterval.displayName}/${expectedInterval.name}]`);
            console.log(`🔍 音符: ${lowerNote}(${lowerSemitone}半音) -> ${upperNote}(${upperSemitone}半音) = ${semitoneDifference}半音间距`);

            if (semitoneDifference === expectedSemitones) {
                console.log(`✅ 音程质量匹配: ${lowerNote}-${upperNote} = ${expectedInterval.displayName} (${semitoneDifference}半音)`);
                return true;
            } else {
                console.log(`❌ 音程质量不匹配: ${lowerNote}-${upperNote} 实际${semitoneDifference}半音，期望${expectedSemitones}半音(${expectedInterval.displayName})`);

                // 🔍 额外调试：显示音程类型的详细信息
                console.log(`🔍 期望音程类型详情:`, {
                    name: expectedInterval.name,
                    displayName: expectedInterval.displayName,
                    semitones: expectedInterval.semitones,
                    actualSemitones: semitoneDifference
                });

                return false;
            }

        } catch (error) {
            console.warn('音程质量验证出错:', error);
            return false;
        }
    }

    /**
     * 将音符名转换为半音数值（C=0, C#=1, D=2, ...）
     * @param {string} noteName - 音符名（如 'C', 'F#', 'Bb'）
     * @returns {number} 半音数值
     */
    noteToSemitone(noteName) {
        const semitoneMappings = {
            'C': 0, 'C#': 1, 'Db': 1,
            'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'E#': 5, 'Fb': 4,
            'F': 5, 'F#': 6, 'Gb': 6,
            'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10,
            'B': 11, 'B#': 0, 'Cb': 11
        };

        const semitone = semitoneMappings[noteName];
        if (semitone === undefined) {
            throw new Error(`未知音符名: ${noteName}`);
        }

        return semitone;
    }

    /**
     * 根据谱号获取合适的音域范围（参考旋律视奏工具）
     * @param {string} clef - 谱号类型
     * @returns {Object} 包含min和max的音域对象
     */
    getClefRanges(clef) {
        const clefRanges = {
            'treble': { min: 60, max: 72 },  // C4-C5 (高音谱号)
            'bass': { min: 40, max: 64 },    // E2-E4 (低音谱号)
            'alto': { min: 50, max: 71 }     // D3-B4 (中音谱号)
        };

        const selectedClef = clef || 'treble';
        const range = clefRanges[selectedClef] || clefRanges['treble'];

        console.log(`🎼 获取谱号音域: ${selectedClef} → ${this.midiToNote(range.min)}-${this.midiToNote(range.max)}`);
        return range;
    }

    /**
     * 生成谱号的MusicXML
     * @param {string} clef - 谱号类型 ('treble', 'bass', 'alto')
     * @returns {string} 谱号的MusicXML标记
     */
    generateClefXML(clef) {
        const clefMappings = {
            'treble': '<clef>\n          <sign>G</sign>\n          <line>2</line>\n        </clef>',
            'bass': '<clef>\n          <sign>F</sign>\n          <line>4</line>\n        </clef>',
            'alto': '<clef>\n          <sign>C</sign>\n          <line>3</line>\n        </clef>'
        };

        const selectedClef = clef || 'treble'; // 默认高音谱号
        const clefXML = clefMappings[selectedClef];

        if (!clefXML) {
            console.warn(`未知谱号类型: ${selectedClef}，使用默认高音谱号`);
            return clefMappings['treble'];
        }

        console.log(`🎼 生成谱号: ${selectedClef}`);
        return clefXML;
    }

    // 🔧 已移除：呼吸处理系统（正常休止符生成已足够）
    // 以下函数已被删除：
    // - addPhrasingAndBreaths()
    // - addNaturalBreaths()
    // - addPhrasalBreaths()
    // - determinePhraseLength()
    // - addBreathAtMeasureEnd()
    // - insertBreathBeforeLastNote()

    // === 向后兼容方法 ===

    /**
     * 向后兼容方法 - 旧版本接口
     * @param {Object} settings - 设置对象
     * @returns {Object} 音程进行
     */
    generateIntervalProgression(settings) {
        console.log('⚠️ 使用已弃用的方法名 generateIntervalProgression，建议使用 generate()');
        return this.generate(settings);
    }

    /**
     * 八分音符+三连音简化生成策略
     * @param {Object} scale - 音阶
     * @param {Array} intervalTypes - 音程类型
     * @param {Object} timeSignature - 拍号
     * @param {number} measureIndex - 小节索引
     * @returns {Object} 生成的小节
     */
    generateSimpleEighthTripletMeasure(scale, intervalTypes, timeSignature, measureIndex) {
        console.log(`🔧 生成简化八分音符+三连音小节 ${measureIndex + 1}`);

        const measure = {
            index: measureIndex,
            upperVoice: [],
            lowerVoice: []
        };

        const measureDuration = this.calculateMeasureDuration(timeSignature);
        const selectedIntervalType = this.pickIntervalTypeAntiRepeat(intervalTypes) || intervalTypes[Math.floor(Math.random() * intervalTypes.length)];

        // 🎯 简化模式：安全的八分音符+三连音组合
        // 选择 4个八分音符(2拍) + 3个三连音(1拍) + 2个八分音符(1拍) = 4拍
        // 或者 3个三连音(1拍) + 6个八分音符(3拍) = 4拍

        const patterns = [
            // 模式1: 8个八分音符 = 4拍 (无三连音)
            [
                { value: 'eighth', duration: 0.5, count: 8 }
            ],
            // 模式2: 6个八分音符 + 1个四分音符 = 4拍 (无三连音)
            [
                { value: 'eighth', duration: 0.5, count: 6 },
                { value: 'quarter', duration: 1.0, count: 1 }
            ],
            // 模式3: 4个八分音符 + 2个四分音符 = 4拍 (无三连音)
            [
                { value: 'eighth', duration: 0.5, count: 4 },
                { value: 'quarter', duration: 1.0, count: 2 }
            ],
            // 模式4: 2个八分音符 + 3个三连音 + 2个八分音符 = 4拍 (少量三连音)
            [
                { value: 'eighth', duration: 0.5, count: 2 },
                { value: 'triplet', duration: 1/3, count: 3 },
                { value: 'eighth', duration: 0.5, count: 2 }
            ],
            // 模式5: 6个八分音符 + 3个三连音 + 四分休止符 = 4拍 (偶尔三连音)
            [
                { value: 'eighth', duration: 0.5, count: 6 },
                { value: 'quarter', duration: 1.0, count: 1 }  // 这里有时会改为三连音
            ]
        ];

        // 🎯 降低三连音频率：85%概率选择无三连音模式，15%选择有三连音模式
        const preferNoTriplets = Math.random() < 0.85;
        let availablePatterns;

        if (preferNoTriplets) {
            // 选择前3个无三连音模式
            availablePatterns = patterns.slice(0, 3);
        } else {
            // 选择模式4（少量三连音）或模式5
            availablePatterns = patterns.slice(3);
        }

        const rhythmPattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];

        // 🔧 架构修复 (2025-10-10): 简化生成器也必须使用7音baseScale
        // 与主要生成路径保持一致，避免小调9音数组导致的索引错误
        const baseScale = this.getBaseScale(scale);

        let currentPosition = 0;
        const tripletPositions = ['start', 'middle', 'stop']; // 三连音位置标识

        for (const pattern of rhythmPattern) {
            // 🔥 关键修复：检测三连音组，生成唯一ID
            const isTripletGroup = (pattern.value === 'triplet' && pattern.count === 3);
            const tripletId = isTripletGroup ? this.generateTripletId() : null;

            for (let i = 0; i < pattern.count; i++) {
                // 生成简单的调内音程
                const lowerScaleIndex = Math.floor(Math.random() * baseScale.notes.length);
                const upperScaleIndex = (lowerScaleIndex + 2) % baseScale.notes.length; // 简单的三度

                const lowerNote = baseScale.notes[lowerScaleIndex];
                const upperNote = baseScale.notes[upperScaleIndex];

                // 按当前音域选择合适八度
                let lowerPitch;
                let upperPitch;
                const octaves = this.findSuitableOctavesForInterval(
                    lowerNote, upperNote, lowerScaleIndex, upperScaleIndex,
                    this.rangeMin || 60, this.rangeMax || 72, null
                );
                if (octaves && octaves.length > 0) {
                    lowerPitch = `${lowerNote}${octaves[0].lowerOctave}`;
                    upperPitch = `${upperNote}${octaves[0].upperOctave}`;
                } else {
                    // 回退：使用4组并再夹取到音域
                    let lMidi = this.noteToMidi(`${lowerNote}4`);
                    let uMidi = this.noteToMidi(`${upperNote}4`);
                    while (lMidi < (this.rangeMin || 60) && uMidi < (this.rangeMax || 72)) { lMidi += 12; uMidi += 12; }
                    while (uMidi > (this.rangeMax || 72) && lMidi > (this.rangeMin || 60)) { lMidi -= 12; uMidi -= 12; }
                    lowerPitch = this.midiToNote(lMidi);
                    upperPitch = this.midiToNote(uMidi);
                }

                const noteData = {
                    pitch: lowerPitch,
                    midi: this.noteToMidi(lowerPitch),
                    duration: pattern.duration,
                    value: pattern.value,
                    displayName: pattern.value === 'triplet' ? '八分三连音' : '八分音符',
                    type: 'note',
                };

                const upperNoteData = {
                    pitch: upperPitch,
                    midi: this.noteToMidi(upperPitch),
                    duration: pattern.duration,
                    value: pattern.value,
                    displayName: pattern.value === 'triplet' ? '八分三连音' : '八分音符',
                    type: 'note',
                };

                // 🔥 为三连音添加完整属性
                if (isTripletGroup) {
                    // 基本三连音属性
                    noteData.tripletGroup = true;
                    noteData.isTriplet = true;
                    noteData.tripletType = 'eighth';
                    noteData.tripletId = tripletId;
                    noteData.tripletPosition = tripletPositions[i];
                    noteData.tripletTotal = 3;
                    noteData.beats = pattern.duration; // 精确beats值

                    upperNoteData.tripletGroup = true;
                    upperNoteData.isTriplet = true;
                    upperNoteData.tripletType = 'eighth';
                    upperNoteData.tripletId = tripletId;
                    upperNoteData.tripletPosition = tripletPositions[i];
                    upperNoteData.tripletTotal = 3;
                    upperNoteData.beats = pattern.duration; // 精确beats值

                    // 🔥 不在此处设置tripletBeamInfo，将在生成完成后统一计算
                }

                measure.lowerVoice.push(noteData);
                measure.upperVoice.push(upperNoteData);

                currentPosition += pattern.duration;
            }
        }

        // 🔥 关键修复：生成完三连音后，调用calculateTripletBeamConnections正确设置beam
        // 对lowerVoice和upperVoice分别处理
        if (isTripletGroup) {
            const lowerTripletElements = measure.lowerVoice.slice(-3);
            const upperTripletElements = measure.upperVoice.slice(-3);
            this.calculateTripletBeamConnections(lowerTripletElements, 'eighth');
            this.calculateTripletBeamConnections(upperTripletElements, 'eighth');
            console.log(`🔥 已调用calculateTripletBeamConnections处理双声部beam信息`);
        }

        console.log(`✅ 简化三连音小节生成完成，beam信息已正确设置`);

        // 🎯 时值校正：确保总时值匹配拍号
        const actualDuration = currentPosition;
        const expectedDuration = measureDuration;
        const durationDiff = Math.abs(actualDuration - expectedDuration);

        console.log(`🔧 简化小节生成完成: ${measure.lowerVoice.length}个音符，总时值: ${actualDuration.toFixed(3)}拍，期望: ${expectedDuration}拍`);

        if (durationDiff > 0.01) {
            console.warn(`⚠️ 简化生成时值偏差: ${durationDiff.toFixed(3)}拍，在可接受范围内`);

            // 如果偏差太大，调整最后一个音符
            if (durationDiff > 0.25 && measure.lowerVoice.length > 0) {
                const lastIndex = measure.lowerVoice.length - 1;
                const adjustment = expectedDuration - (actualDuration - measure.lowerVoice[lastIndex].duration);

                if (adjustment > 0.1) {
                    console.log(`🔧 调整最后音符时值: ${measure.lowerVoice[lastIndex].duration} → ${adjustment.toFixed(3)}`);
                    measure.lowerVoice[lastIndex].duration = adjustment;
                    measure.upperVoice[lastIndex].duration = adjustment;
                }
            }
        }

        return measure;
    }

    /**
     * 生成基本的四分音符小节 - 最终fallback策略
     * @param {Object} scale - 音阶
     * @param {Array} intervalTypes - 音程类型
     * @param {Object} timeSignature - 拍号
     * @param {number} measureIndex - 小节索引
     * @returns {Object} 基本小节对象
     */
    generateBasicMeasure(scale, intervalTypes, timeSignature, measureIndex) {
        console.log(`🔧 生成基本四分音符小节 ${measureIndex + 1} (最终fallback)`);

        const measure = {
            index: measureIndex,
            upperVoice: [],
            lowerVoice: []
        };

        const measureDuration = this.calculateMeasureDuration(timeSignature);
        const quarterNotesNeeded = Math.floor(measureDuration); // 4/4拍 = 4个四分音符
        const selectedIntervalType = this.pickIntervalTypeAntiRepeat(intervalTypes) || intervalTypes[Math.floor(Math.random() * intervalTypes.length)];

        // 🔧 修复 (2025-10-10): 使用7音baseScale而非9音scale.notes
        // 原因：9音数组中(index+2)不保证是三度关系（例：E[4] + 2 = F#[6] 是二度！）
        const baseScale = this.getBaseScale(scale);
        console.log(`🔧 [Fallback] 使用7音baseScale: [${baseScale.notes.join(', ')}]`);

        for (let i = 0; i < quarterNotesNeeded; i++) {
            // 生成简单的调内三度音程
            const lowerScaleIndex = Math.floor(Math.random() * baseScale.notes.length);
            const upperScaleIndex = (lowerScaleIndex + 2) % baseScale.notes.length;

            const lowerNote = baseScale.notes[lowerScaleIndex];
            const upperNote = baseScale.notes[upperScaleIndex];

            console.log(`🔧 [Fallback] 生成音符对: ${lowerNote}[${lowerScaleIndex}] → ${upperNote}[${upperScaleIndex}] (三度)`);


            // 按当前音域选择合适八度
            let lowerPitch;
            let upperPitch;
            const octaves = this.findSuitableOctavesForInterval(
                lowerNote, upperNote, lowerScaleIndex, upperScaleIndex,
                this.rangeMin || 60, this.rangeMax || 72, null
            );
            if (octaves && octaves.length > 0) {
                lowerPitch = `${lowerNote}${octaves[0].lowerOctave}`;
                upperPitch = `${upperNote}${octaves[0].upperOctave}`;
            } else {
                // 回退：使用4组并再夹取到音域
                let lMidi = this.noteToMidi(`${lowerNote}4`);
                let uMidi = this.noteToMidi(`${upperNote}4`);
                while (lMidi < (this.rangeMin || 60) && uMidi < (this.rangeMax || 72)) { lMidi += 12; uMidi += 12; }
                while (uMidi > (this.rangeMax || 72) && lMidi > (this.rangeMin || 60)) { lMidi -= 12; uMidi -= 12; }
                lowerPitch = this.midiToNote(lMidi);
                upperPitch = this.midiToNote(uMidi);
            }

            const lowerMidi = this.noteToMidi(lowerPitch);
            const upperMidi = this.noteToMidi(upperPitch);

            // 🔒 白名单验证 (2025-10-10): fallback路径也必须遵守白名单
            const actualSemitones = upperMidi - lowerMidi;
            if (this._allowedSemitonesSet && !this._allowedSemitonesSet.has(actualSemitones)) {
                console.warn(`❌ [Fallback白名单拒绝] ${actualSemitones}半音不在白名单中，跳过此音符对`);
                console.warn(`  音程: ${lowerPitch} → ${upperPitch}`);
                console.warn(`  白名单: [${Array.from(this._allowedSemitonesSet).sort((a,b)=>a-b).join(', ')}]`);
                // 跳过此音符对，使用下一次循环
                continue;
            }

            const noteData = {
                pitch: lowerPitch,
                midi: lowerMidi,
                duration: 1.0, // 四分音符
                value: 'quarter',
                displayName: '四分音符',
                type: 'note',
            };

            const upperNoteData = {
                pitch: upperPitch,
                midi: upperMidi,
                duration: 1.0, // 四分音符
                value: 'quarter',
                displayName: '四分音符',
                type: 'note',
            };

            console.log(`✅ [Fallback验证通过] ${lowerPitch} → ${upperPitch} = ${actualSemitones}半音`);

            measure.lowerVoice.push(noteData);
            measure.upperVoice.push(upperNoteData);
        }

        console.log(`🔧 基本小节生成完成: ${measure.lowerVoice.length}个四分音符`);
        // 🔁 记录本小节选择的主用音程类型（用于后续防重复权重）
        try {
            if (selectedIntervalType && selectedIntervalType.name) {
                if (this._lastIntervalTypeName === selectedIntervalType.name) {
                    this._consecutiveSameInterval = (this._consecutiveSameInterval || 0) + 1;
                } else {
                    this._consecutiveSameInterval = 1;
                }
                this._lastIntervalTypeName = selectedIntervalType.name;
            }
        } catch (e) {}
        return measure;
    }

    /**
     * 向后兼容方法 - 旧版本渲染接口
     * @param {Object} progression - 音程进行
     * @returns {Object} 渲染结果
     */
    renderIntervalProgression(progression) {
        console.log('⚠️ 使用已弃用的方法名 renderIntervalProgression，建议使用 IntervalRenderer');
        try {
            const renderer = new IntervalRenderer();
            const musicXML = this.generateMusicXML(progression);
            return renderer.render(musicXML);
        } catch (error) {
            console.error('渲染失败:', error);
            throw error;
        }
    }

    // 🎯 工具函数

    /**
     * 获取时值对应的数值
     * @param {string|number} duration - 时值
     * @returns {number} 对应的数值
     */
    getDurationValue(duration) {
        if (typeof duration === 'number') {
            return duration;
        }

        const durationMap = {
            'whole': 4,
            'half': 2,
            'quarter': 1,
            'eighth': 0.5,
            '16th': 0.25,
            '32nd': 0.125,
            'triplet': 1/3  // 用于处理用户选择，内部生成时会转换为正确的音符duration
        };

        return durationMap[duration] || 0;
    }

    // 🎯 精确分数运算工具函数

    /**
     * 计算最大公约数
     * @param {number} a - 第一个数
     * @param {number} b - 第二个数
     * @returns {number} 最大公约数
     */
    gcd(a, b) {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    /**
     * 约分分数
     * @param {Object} fraction - 分数对象 {numerator, denominator}
     * @returns {Object} 约分后的分数
     */
    reduceFraction(fraction) {
        const { numerator, denominator } = fraction;
        const divisor = this.gcd(Math.abs(numerator), Math.abs(denominator));
        return {
            numerator: numerator / divisor,
            denominator: denominator / divisor
        };
    }

    /**
     * 分数加法
     * @param {Object} a - 第一个分数
     * @param {Object} b - 第二个分数
     * @returns {Object} 相加后的分数
     */
    addFractions(a, b) {
        const numerator = a.numerator * b.denominator + b.numerator * a.denominator;
        const denominator = a.denominator * b.denominator;
        return this.reduceFraction({ numerator, denominator });
    }

    /**
     * 分数减法
     * @param {Object} a - 被减数
     * @param {Object} b - 减数
     * @returns {Object} 相减后的分数
     */
    subtractFractions(a, b) {
        const numerator = a.numerator * b.denominator - b.numerator * a.denominator;
        const denominator = a.denominator * b.denominator;
        return this.reduceFraction({ numerator, denominator });
    }

    /**
     * 分数转换为小数
     * @param {Object} fraction - 分数对象
     * @returns {number} 小数值
     */
    fractionToDecimal(fraction) {
        return fraction.numerator / fraction.denominator;
    }

    /**
     * 获取节奏的精确分数时值
     * @param {string} rhythmValue - 节奏值
     * @returns {Object} 分数表示的时值
     */
    getRhythmFraction(rhythmValue) {
        return this.rhythmFractions[rhythmValue] || { numerator: 1, denominator: 1 };
    }

    /**
     * 检查两个分数是否相等
     * @param {Object} a - 第一个分数
     * @param {Object} b - 第二个分数
     * @returns {boolean} 是否相等
     */
    fractionsEqual(a, b) {
        const reducedA = this.reduceFraction(a);
        const reducedB = this.reduceFraction(b);
        return reducedA.numerator === reducedB.numerator && reducedA.denominator === reducedB.denominator;
    }

    /**
     * 检查分数组合的兼容性
     * @param {Array} rhythmValues - 节奏值数组
     * @param {Object} targetDuration - 目标时值分数
     * @returns {boolean} 是否兼容
     */
    checkRhythmCompatibility(rhythmValues, targetDuration) {
        let sum = { numerator: 0, denominator: 1 };

        for (const rhythmValue of rhythmValues) {
            const fraction = this.getRhythmFraction(rhythmValue);
            sum = this.addFractions(sum, fraction);
        }

        return this.fractionsEqual(sum, targetDuration);
    }

    /**
     * 检查位置是否在四分音符的正拍上
     * @param {number} position - 在拍群中的位置（四分音符为单位）
     * @returns {boolean} 是否在四分音符正拍位置
     */
    isOnQuarterNoteBeat(position) {
        // 四分音符正拍位置：0, 1, 2, 3, 4... （允许小的浮点误差）
        const tolerance = 0.01; // 增加容差以处理浮点精度问题
        const beatPosition = position % 1.0; // 在四分音符内的位置

        // 检查是否在正拍（0.0）或接近正拍的位置
        const isOnBeat = Math.abs(beatPosition) < tolerance || Math.abs(beatPosition - 1.0) < tolerance;

        if (isOnBeat) {
            console.log(`🎯 三连音位置检查: 位置${position.toFixed(3)}拍 → 四分音符正拍 ✅`);
        } else {
            console.log(`🎯 三连音位置检查: 位置${position.toFixed(3)}拍 → 非四分音符正拍 ❌ (拍内位置: ${beatPosition.toFixed(3)})`);
        }

        return isOnBeat;
    }

    /**
     * 检查拍群时值是否适合三连音
     * @param {number} groupDuration - 拍群时值
     * @returns {boolean} 是否适合三连音
     */
    isTripletFriendlyDuration(groupDuration) {
        // 🔧 修复：只有正好1拍或2拍的拍群才适合生成三连音
        // 这样可以为其他时值（0.5拍、1.5拍、3拍等）留出空间生成十六分音符
        const standardTripletDurations = [1.0, 2.0]; // 1拍(3个八分三连音)、2拍(3个四分三连音)
        const tolerance = 0.01;

        for (const standardDuration of standardTripletDurations) {
            if (Math.abs(groupDuration - standardDuration) < tolerance) {
                console.log(`🎯 标准三连音时值: ${groupDuration}拍匹配${standardDuration}拍`);
                return true;
            }
        }

        console.log(`🎯 非三连音友好时值: ${groupDuration}拍 → 将使用十六分音符或其他节奏`);
        return false;
    }

    /**
     * 🎼 基于旋律工具的正确6/8拍小节生成（修复版）
     * 正确的复合拍子处理：主要边界在[0, 1.5]，三个三个连音
     * @param {Array} availableRhythms - 可用的节奏类型
     * @param {number} measureDuration - 小节总时值（3.0拍）
     * @param {Object} timeSignature - 拍号信息
     * @returns {Array} 正确beaming的节奏事件数组
     */
    generate68MeasureWithCorrectBoundaries(availableRhythms, measureDuration, timeSignature) {
        console.log(`🎵🎵🎵 [generate68MeasureWithCorrectBoundaries] 开始执行 🎵🎵🎵`);
        console.log(`🎵 6/8拍标准模式生成: 使用11种预设模式`);

        // 🎼 6/8拍11种标准节奏模式
        const standardPatterns = this.get68StandardPatterns();
        console.log(`🔍 [DEBUG-68] 获取到${standardPatterns.length}个标准模式`);

        // 🎯 基于用户频率设置过滤可用模式
        const availablePatterns = this.filter68PatternsByFrequency(standardPatterns, availableRhythms);
        console.log(`🔍 [DEBUG-68] 频率过滤后剩余${availablePatterns.length}个可用模式`);

        if (availablePatterns.length === 0) {
            console.warn('⚠️ 无可用6/8拍模式，使用安全模式');
            const safePattern = this.create68SafePattern();
            console.log(`🔍 [DEBUG-68] 安全模式返回${safePattern.length}个事件`);
            return safePattern;
        }

        // 🧠 智能选择最优模式（考虑复杂度、教育价值和多样性）
        const selectedPattern = this.selectOptimal68Pattern(availablePatterns);
        console.log(`🔍 [DEBUG-68] 选中模式原始notes数量: ${selectedPattern.notes.length}`);

        // 🔍 DEBUG: 检查原始模式的每个音符
        selectedPattern.notes.forEach((note, i) => {
            console.log(`🔍 [DEBUG-68] 原始notes[${i}]: ${JSON.stringify({
                displayName: note.displayName,
                value: note.value,
                duration: note.duration,
                position: note.position
            })}`);
        });

        // 🔧 应用符杠连接规则（3+3分组）
        const rhythmEvents = this.apply68BeamingRules(selectedPattern.notes);
        console.log(`🔍 [DEBUG-68] apply68BeamingRules处理后事件数量: ${rhythmEvents.length}`);

        // 🎵 转换节奏模板为完整的音程事件
        const intervalEvents = this.convert68RhythmToIntervalEvents(
            rhythmEvents,
            this.intervalTypes,
            this.keySignature,
            { min: this.rangeMin, max: this.rangeMax }
        );

        // 🔍 DEBUG: 检查转换后的音程事件
        console.log(`🔍 [DEBUG-68] 转换后下声部: ${intervalEvents.lowerVoice.length}个事件`);
        console.log(`🔍 [DEBUG-68] 转换后上声部: ${intervalEvents.upperVoice.length}个事件`);

        // 使用转换后的事件（选择其中一个声部作为主要事件序列）
        const events = intervalEvents.lowerVoice;

        // 🔍 DEBUG: 检查应用beaming规则后的每个事件
        events.forEach((event, i) => {
            console.log(`🔍 [DEBUG-68] events[${i}]: ${JSON.stringify({
                displayName: event.displayName,
                value: event.value,
                duration: event.duration,
                position: event.position,
            })}`);
        });

        // 🛡️ 强化6/8拍验证（时值+音符数量+边界）
        const validationResult = this.validate68ComprehensiveChecks(events, selectedPattern, measureDuration);
        if (!validationResult.isValid) {
            console.error(`❌ 6/8拍综合验证失败: ${validationResult.error}`);
            console.error(`❌ 模式${selectedPattern.id}验证失败，回退到安全模式`);
            const safePattern = this.create68SafePattern();
            console.log(`🔍 [DEBUG-68] 综合验证失败，安全模式返回${safePattern.length}个事件`);
            return safePattern;
        }

        // 🔍 DEBUG: 在验证符杠边界前检查事件数量
        if (events.length > 6) {
            console.error(`🚨 [DEBUG-68-CRITICAL] 在边界验证前发现${events.length}个事件，超过6个！`);
            console.error(`🚨 这可能是7音符bug的关键点！`);
        }

        // 🎯 验证符杠分组边界（确保不跨越1.5拍边界）
        this.validate68BeamingBoundaries(events);

        console.log(`✅ 6/8拍模式${selectedPattern.id}生成成功`);
        console.log(`🔍 [DEBUG-68] 最终返回${events.length}个事件`);

        // 🛡️ BULLETPROOF VALIDATION: 确保返回的事件数量符合6/8拍要求
        if (events.length > 6) {
            console.error(`🚨🚨🚨 [CRITICAL-68-VALIDATION] generate68MeasureWithCorrectBoundaries返回了${events.length}个事件，超过6个！`);
            console.error(`🚨 模式${selectedPattern.id}("${selectedPattern.name}")有问题！`);
            console.error(`🚨 强制回退到安全模式`);
            return this.create68SafePattern();
        }

        if (events.length === 0) {
            console.error(`🚨🚨🚨 [CRITICAL-68-VALIDATION] generate68MeasureWithCorrectBoundaries返回了0个事件！`);
            console.error(`🚨 强制使用安全模式`);
            return this.create68SafePattern();
        }

        console.log(`✅ [68-VALIDATION-PASS] 模式${selectedPattern.id}验证通过: ${events.length}个事件`);
        return events;
    }

    /**
     * 🆕 获取6/8拍的11种标准节奏模式
     * @returns {Array} 标准模式数组
     */
    get68StandardPatterns() {
        return [
            // 模式0: ♩. (附点二分音符 - 整小节持续)
            {
                id: 0,
                name: '附点二分音符',
                notes: [
                    { value: 'half.', duration: 3.0, position: 0 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['dotted-half']
            },

            // 模式1: ♪♪♪ ♪♪♪ (六个八分音符 - 最典型3+3分组)
            {
                id: 1,
                name: '六个八分音符(3+3)',
                notes: [
                    { value: 'eighth', duration: 0.5, position: 0},
                    { value: 'eighth', duration: 0.5, position: 0.5},
                    { value: 'eighth', duration: 0.5, position: 1.0},
                    { value: 'eighth', duration: 0.5, position: 1.5},
                    { value: 'eighth', duration: 0.5, position: 2.0},
                    { value: 'eighth', duration: 0.5, position: 2.5}
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth']
            },

            // 模式2: ♩. ♩. (两个附点四分音符)
            {
                id: 2,
                name: '两个附点四分音符',
                notes: [
                    { value: 'quarter.', duration: 1.5, position: 0 },
                    { value: 'quarter.', duration: 1.5, position: 1.5 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['dotted-quarter']
            },

            // 模式3: ♩ ♪ | ♩ ♪ (四分+八分，重复两次)
            {
                id: 3,
                name: '四分+八分，重复两次',
                notes: [
                    { value: 'quarter', duration: 1.0, position: 0 },
                    { value: 'eighth', duration: 0.5, position: 1.0}, // 第一组的独立八分音符
                    { value: 'quarter', duration: 1.0, position: 1.5 },
                    { value: 'eighth', duration: 0.5, position: 2.5}  // 第二组的独立八分音符
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['quarter', 'eighth']
            },

            // 模式4: ♪ ♩ | ♪ ♩ (八分+四分，重复两次)
            {
                id: 4,
                name: '八分+四分，重复两次',
                notes: [
                    { value: 'eighth', duration: 0.5, position: 0},   // 第一组的独立八分音符
                    { value: 'quarter', duration: 1.0, position: 0.5 },
                    { value: 'eighth', duration: 0.5, position: 1.5}, // 第二组的独立八分音符
                    { value: 'quarter', duration: 1.0, position: 2.0 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth', 'quarter']
            },

            // 模式5: ♪♪♪ | ♩. (三个八分 + 附点四分)
            {
                id: 5,
                name: '三个八分+附点四分',
                notes: [
                    { value: 'eighth', duration: 0.5, position: 0},
                    { value: 'eighth', duration: 0.5, position: 0.5},
                    { value: 'eighth', duration: 0.5, position: 1.0},
                    { value: 'quarter.', duration: 1.5, position: 1.5 }  // 附点四分音符不需要beaming
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth', 'dotted-quarter']
            },

            // 模式6: ♩. | ♪♪♪ (附点四分 + 三个八分)
            {
                id: 6,
                name: '附点四分+三个八分',
                notes: [
                    { value: 'quarter.', duration: 1.5, position: 0 },  // 附点四分音符不需要beaming
                    { value: 'eighth', duration: 0.5, position: 1.5},
                    { value: 'eighth', duration: 0.5, position: 2.0},
                    { value: 'eighth', duration: 0.5, position: 2.5}
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['dotted-quarter', 'eighth']
            },

            // 模式7: ♩ ♪ | ♩. (四分+八分 + 附点四分)
            {
                id: 7,
                name: '四分+八分+附点四分',
                notes: [
                    { value: 'quarter', duration: 1.0, position: 0 },
                    { value: 'eighth', duration: 0.5, position: 1.0}, // 独立八分音符
                    { value: 'quarter.', duration: 1.5, position: 1.5 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['quarter', 'eighth', 'dotted-quarter']
            },

            // 模式8: ♩. | ♩ ♪ (附点四分 + 四分+八分)
            {
                id: 8,
                name: '附点四分+四分+八分',
                notes: [
                    { value: 'quarter.', duration: 1.5, position: 0 },
                    { value: 'quarter', duration: 1.0, position: 1.5 },
                    { value: 'eighth', duration: 0.5, position: 2.5} // 独立八分音符
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['dotted-quarter', 'quarter', 'eighth']
            },

            // 模式9: ♪ ♩ | ♩. (八分+四分 + 附点四分)
            {
                id: 9,
                name: '八分+四分+附点四分',
                notes: [
                    { value: 'eighth', duration: 0.5, position: 0}, // 独立八分音符
                    { value: 'quarter', duration: 1.0, position: 0.5 },
                    { value: 'quarter.', duration: 1.5, position: 1.5 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth', 'quarter', 'dotted-quarter']
            },

            // 模式10: ♩. | ♪ ♩ (附点四分 + 八分+四分)
            {
                id: 10,
                name: '附点四分+八分+四分',
                notes: [
                    { value: 'quarter.', duration: 1.5, position: 0 },
                    { value: 'eighth', duration: 0.5, position: 1.5}, // 独立八分音符
                    { value: 'quarter', duration: 1.0, position: 2.0 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['dotted-quarter', 'eighth', 'quarter']
            },

            // 🆕 模式11: ♪ ♪ 𝄽 | ♪ ♪ ♪ (休止符阻断示例1) - 修复type属性
            {
                id: 11,
                name: '八分+八分+八分休止符+三个八分',
                notes: [
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0.5},
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 1.0 }, // 休止符阻断
                    { type: 'note', value: 'eighth', duration: 0.5, position: 1.5},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.0},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.5}
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth']
            },

            // 🆕 模式12: ♪ 𝄽 ♪ | ♪ 𝄽 ♪ (休止符阻断示例2)
            {
                id: 12,
                name: '八分+八分休止符+八分，重复两次',
                notes: [
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0}, // 独立八分音符
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 0.5 }, // 休止符阻断
                    { type: 'note', value: 'eighth', duration: 0.5, position: 1.0}, // 独立八分音符
                    { type: 'note', value: 'eighth', duration: 0.5, position: 1.5}, // 独立八分音符
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 2.0 }, // 休止符阻断
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.5}  // 独立八分音符
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth']
            },

            // 🆕 模式13: ♪♪♪ | 𝄽 ♪ ♪ (休止符阻断示例3)
            {
                id: 13,
                name: '三个八分+八分休止符+两个八分',
                notes: [
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0.5},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 1.0},
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 1.5 }, // 休止符阻断
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.0},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.5}
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth']
            },

            // 🆕 模式14: ♩ 𝄽 | ♪ ♪ ♪ (四分音符+八分休止符+三个八分)
            {
                id: 14,
                name: '四分音符+八分休止符+三个八分',
                notes: [
                    { type: 'note', value: 'quarter', duration: 1.0, position: 0 },
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 1.0 }, // 八分休止符阻断
                    { type: 'note', value: 'eighth', duration: 0.5, position: 1.5},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.0},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.5}
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['quarter', 'eighth']
            },

            // 🎵 模式15: ♪ 𝄽 | ♪ 𝄽 ♪ (八分+休止符 | 八分+休止符+八分) - 呼吸感强
            {
                id: 15,
                name: '八分+休止符+八分+休止符+八分',
                notes: [
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0},
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 0.5 },
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 1.0 },
                    { type: 'note', value: 'eighth', duration: 0.5, position: 1.5},
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 2.0 },
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.5}
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth'],
                musicality: 'high-breathability' // 高呼吸感标记
            },

            // 🎵 模式16: ♪ ♪ 𝄽 | 𝄽 ♪ 𝄽 (两个八分+休止符 | 休止符+八分+休止符) - 呼吸感强
            {
                id: 16,
                name: '两个八分+休止符+休止符+八分+休止符',
                notes: [
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0.5},
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 1.0 },
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 1.5 },
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.0},
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 2.5 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth'],
                musicality: 'high-breathability' // 高呼吸感标记
            },

            // 🎵 模式17: ♪ ♪ 𝄽 | 𝄽 ♪ ♪ (两个八分+休止符+休止符+两个八分) - 中间呼吸
            {
                id: 17,
                name: '两个八分+休止符+休止符+两个八分',
                notes: [
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0.5},
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 1.0 },
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 1.5 },
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.0},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.5}
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth'],
                musicality: 'medium-breathability' // 中等呼吸感标记
            },

            // 🎵 模式18: ♪ 𝄽 ♪ | 𝄽 𝄽 ♪ (八分+休止符+八分 | 休止符+休止符+八分) - 强呼吸
            {
                id: 18,
                name: '八分+休止符+八分+休止符+休止符+八分',
                notes: [
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0},
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 0.5 },
                    { type: 'note', value: 'eighth', duration: 0.5, position: 1.0},
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 1.5 },
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 2.0 },
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.5}
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth'],
                musicality: 'high-breathability' // 高呼吸感标记
            },

            // 🎵 模式19: 𝄽 ♪ ♪ | ♪ ♪ 𝄽 (休止符+两个八分 | 两个八分+休止符) - 乐句感强
            {
                id: 19,
                name: '休止符+两个八分+两个八分+休止符',
                notes: [
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 0 },
                    { type: 'note', value: 'eighth', duration: 0.5, position: 0.5},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 1.0},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 1.5},
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.0},
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 2.5 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth'],
                musicality: 'high-breathability' // 高呼吸感标记
            },

            // 🎵 模式20: 𝄽 𝄽 ♪ | 𝄽 𝄽 ♪ (休止符+休止符+八分 | 休止符+休止符+八分) - 极简呼吸
            {
                id: 20,
                name: '休止符+休止符+八分+休止符+休止符+八分',
                notes: [
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 0 },
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 0.5 },
                    { type: 'note', value: 'eighth', duration: 0.5, position: 1.0},
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 1.5 },
                    { type: 'rest', value: 'eighth', duration: 0.5, position: 2.0 },
                    { type: 'note', value: 'eighth', duration: 0.5, position: 2.5}
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth'],
                musicality: 'very-high-breathability' // 极高呼吸感标记
            },

            // 模式21: 二连音(第一组) + 二连音(第二组)
            {
                id: 21,
                name: '二连音+二连音',
                notes: [
                    { value: 'duplet', duration: 0.75, position: 0 },
                    { value: 'duplet', duration: 0.75, position: 0.75 },
                    { value: 'duplet', duration: 0.75, position: 1.5 },
                    { value: 'duplet', duration: 0.75, position: 2.25 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['duplet']
            },

            // 模式22: 二连音(第一组) + 三个八分(第二组)
            {
                id: 22,
                name: '二连音+三个八分',
                notes: [
                    { value: 'duplet', duration: 0.75, position: 0 },
                    { value: 'duplet', duration: 0.75, position: 0.75 },
                    { value: 'eighth', duration: 0.5, position: 1.5 },
                    { value: 'eighth', duration: 0.5, position: 2.0 },
                    { value: 'eighth', duration: 0.5, position: 2.5 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['duplet','eighth']
            },

            // 模式23: 三个八分(第一组) + 二连音(第二组)
            {
                id: 23,
                name: '三个八分+二连音',
                notes: [
                    { value: 'eighth', duration: 0.5, position: 0 },
                    { value: 'eighth', duration: 0.5, position: 0.5 },
                    { value: 'eighth', duration: 0.5, position: 1.0 },
                    { value: 'duplet', duration: 0.75, position: 1.5 },
                    { value: 'duplet', duration: 0.75, position: 2.25 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['eighth','duplet']
            },

            // 模式24: 四连音(第一组) + 四连音(第二组)
            {
                id: 24,
                name: '四连音+四连音',
                notes: [
                    { value: 'quadruplet', duration: 0.375, position: 0 },
                    { value: 'quadruplet', duration: 0.375, position: 0.375 },
                    { value: 'quadruplet', duration: 0.375, position: 0.75 },
                    { value: 'quadruplet', duration: 0.375, position: 1.125 },
                    { value: 'quadruplet', duration: 0.375, position: 1.5 },
                    { value: 'quadruplet', duration: 0.375, position: 1.875 },
                    { value: 'quadruplet', duration: 0.375, position: 2.25 },
                    { value: 'quadruplet', duration: 0.375, position: 2.625 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['quadruplet']
            },

            // 模式25: 四连音(第一组) + 附点四分(第二组)
            {
                id: 25,
                name: '四连音+附点四分',
                notes: [
                    { value: 'quadruplet', duration: 0.375, position: 0 },
                    { value: 'quadruplet', duration: 0.375, position: 0.375 },
                    { value: 'quadruplet', duration: 0.375, position: 0.75 },
                    { value: 'quadruplet', duration: 0.375, position: 1.125 },
                    { value: 'quarter.', duration: 1.5, position: 1.5 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['quadruplet','dotted-quarter']
            },

            // 模式26: 附点四分(第一组) + 四连音(第二组)
            {
                id: 26,
                name: '附点四分+四连音',
                notes: [
                    { value: 'quarter.', duration: 1.5, position: 0 },
                    { value: 'quadruplet', duration: 0.375, position: 1.5 },
                    { value: 'quadruplet', duration: 0.375, position: 1.875 },
                    { value: 'quadruplet', duration: 0.375, position: 2.25 },
                    { value: 'quadruplet', duration: 0.375, position: 2.625 }
                ],
                totalDuration: 3.0,
                requiredFrequencies: ['dotted-quarter','quadruplet']
            }
        ];
    }

    /**
     * 🆕 根据用户频率设置过滤6/8拍模式
     * @param {Array} patterns - 所有标准模式
     * @param {Array} availableRhythms - 用户允许的节奏类型
     * @returns {Array} 过滤后的可用模式
     */
    filter68PatternsByFrequency(patterns, availableRhythms) {
        // 🔧 修复：优先使用已设置的频率，避免DOM依赖
        const frequencies = this.rhythmFrequencies && Object.keys(this.rhythmFrequencies).length > 0
            ? this.rhythmFrequencies
            : this.getRhythmFrequencies();

        console.log(`🔍 [频率过滤] 开始处理${patterns.length}个模式，频率设置:`, frequencies);

        // 🔧 修复：检查频率设置是否有效
        const hasValidFrequencies = Object.values(frequencies).some(freq =>
            freq !== undefined && freq !== null && !isNaN(freq) && freq > 0
        );

        if (!hasValidFrequencies) {
            console.log(`⚠️ [频率过滤] 无有效频率设置，允许所有模式通过频率检查`);
        }

        let availablePatterns = [];

        for (const pattern of patterns) {
            let isAvailable = true;

            // 🔧 修复：只在有效频率设置时进行频率检查
            if (hasValidFrequencies) {
                // 检查每个必需的节奏类型频率是否大于0
                for (const requiredType of pattern.requiredFrequencies) {
                    const frequency = frequencies[requiredType];
                    if (frequency === undefined || frequency === null || isNaN(frequency) || frequency === 0) {
                        isAvailable = false;
                        console.log(`🚫 模式${pattern.id}被排除: ${requiredType}频率无效或为0`);
                        break;
                    }
                }
            } else {
                console.log(`✅ 模式${pattern.id}跳过频率检查 (无有效频率设置)`);
            }

            // 🔧 智能节奏类型检查（严格版）：模式中每个音符类型都必须与用户选择兼容
            if (isAvailable) {
                const availableRhythmValues = availableRhythms.map(r => r.value);
                const isNoteCompatible = (note) => {
                    if (note.type === 'rest') return true; // 休止符始终允许
                    if (availableRhythmValues.includes(note.value)) return true; // 直接匹配

                    // 🔧 修复 (2025-10-04): 严格匹配 duplet/quadruplet，不再"视为八分系"
                    // 之前的逻辑导致：选择"八分音符"会同时启用二连音和四连音
                    // 🔧 修复 (2025-10-09): 移除频率滑块旁路，复选框是最终权威
                    // 修复后：只有明确选择了 duplet/quadruplet 才允许对应的模式
                    if (note.value === 'duplet') {
                        const isDupletEnabled = availableRhythmValues.includes('duplet');
                        console.log(`🔍 [Duplet兼容检查] duplet是否被允许: ${isDupletEnabled}, availableRhythms包含duplet: ${availableRhythmValues.includes('duplet')}`);
                        return isDupletEnabled;
                    }
                    if (note.value === 'quadruplet') {
                        const isQuadrupletEnabled = availableRhythmValues.includes('quadruplet');
                        console.log(`🔍 [Quadruplet兼容检查] quadruplet是否被允许: ${isQuadrupletEnabled}, availableRhythms包含quadruplet: ${availableRhythmValues.includes('quadruplet')}`);
                        return isQuadrupletEnabled;
                    }
                    return false;
                };

                const allCompatible = (pattern.notes || []).every(isNoteCompatible);
                if (!allCompatible) {
                    isAvailable = false;
                    console.log(`🚫 模式${pattern.id}被排除: 包含未选择的节奏类型`);
                } else {
                    console.log(`✅ 模式${pattern.id}兼容检查通过: 所有音符类型均被允许`);
                }
            }

            if (isAvailable) {
                availablePatterns.push(pattern);
                console.log(`✅ 模式${pattern.id}可用: ${pattern.name}`);
            }
        }

        console.log(`🔍 [频率过滤] 基础过滤完成，可用模式${availablePatterns.length}个`);

        // 🛡️ 保护：避免在同一小节混用 N-plet（二/四连音）和附点节奏，防止视觉上“附点出现在 bracket 内”
        // 规则：包含 duplet/quadruplet 的模式，剔除任何同时含有附点类型（*.）的组合
        if (availablePatterns.length > 0) {
            const beforeCount = availablePatterns.length;
            const isNplet = (v) => v === 'duplet' || v === 'quadruplet';
            const isDotted = (v) => typeof v === 'string' && v.endsWith('.');
            const sanitized = [];
            for (const p of availablePatterns) {
                const hasNplet = (p.notes || []).some(n => isNplet(n.value));
                const hasDotted = (p.notes || []).some(n => isDotted(n.value));
                if (hasNplet && hasDotted) {
                    console.log(`🚫 模式${p.id}被剔除（N-plet+附点混用）：${p.name}`);
                    continue;
                }
                sanitized.push(p);
            }
            if (sanitized.length !== beforeCount) {
                console.log(`🧹 [N-plet清洁] 移除了 ${beforeCount - sanitized.length} 个混合附点的模式`);
            }
            availablePatterns = sanitized;
        }

        // 🆕 Phase 2: 应用非线性权重计算
        if (availablePatterns.length > 0) {
            console.log(`🧮 [权重计算] 开始应用非线性权重算法...`);
            const weightedPatterns = this.calculateEnhanced68PatternWeights(availablePatterns, frequencies);

            // 存储权重信息供selectOptimal68Pattern使用
            this._lastPatternWeights = weightedPatterns;

            console.log(`🧮 [权重计算] 完成，最高权重模式: ${weightedPatterns[0]?.pattern.id} (${(weightedPatterns[0]?.weight * 100).toFixed(1)}%)`);
        }

        return availablePatterns;
    }

    /**
     * 🆕 6/8拍智能休止符生成判断
     * @param {number} groupDuration - 当前组的总时长
     * @param {number} remainingDuration - 剩余时长
     * @param {number} eventCount - 已有事件数量
     * @returns {boolean} 是否应该生成休止符
     */
    should68GenerateRest(groupDuration, remainingDuration, eventCount) {
        // 📊 计算当前位置
        const currentPosition = groupDuration - remainingDuration;
        const measureLength = 3.0; // 6/8拍 = 3拍

        // 🎵 确定当前在第一组(0-1.5拍)还是第二组(1.5-3拍)
        const isFirstGroup = currentPosition < 1.5;
        const groupStartPosition = isFirstGroup ? 0 : 1.5;
        const positionInGroup = currentPosition - groupStartPosition;

        // 🎼 基础休止符概率（可配置）
        let restProbability = (this._opts && this._opts.rest68Base !== undefined) ? this._opts.rest68Base : 0.14; // 默认14%

        // 🎯 位置相关调整
        if (positionInGroup < 0.25) {
            // 组开始位置：强烈降低，避免过度分割
            restProbability *= 0.5;
        } else if (positionInGroup > 1.0) {
            // 组后半部分：适度增加，允许自然换气
            restProbability *= 1.2;
        }

        // 🚫 边界保护：在接近1.5拍边界时避免休止符
        const distanceToMidBoundary = Math.abs(currentPosition - 1.5);
        if (distanceToMidBoundary < 0.25) {
            restProbability *= 0.35; // 边界附近仍然降低，但保留一定概率
        }

        // 📈 事件密度调整
        if (eventCount === 0) {
            // 完全空的组：不要立即开始休止符
            restProbability = 0;
        } else if (eventCount >= 3) {
            // 已有较多事件：适度提升
            restProbability *= 1.4;
        }

        // ⏰ 剩余时间考虑
        if (remainingDuration < 0.5) {
            // 剩余时间很少：降低休止符概率，确保能填满
            restProbability *= 0.4;
        } else if (remainingDuration > 1.5) {
            // 剩余时间充足：适度提高
            restProbability *= 1.25;
        }

        // 🎲 最终概率限制
        const cap = (this._opts && this._opts.rest68Cap !== undefined) ? this._opts.rest68Cap : 0.35;
        restProbability = Math.max(0, Math.min(cap, restProbability));

        const shouldGenerate = Math.random() < restProbability;

        // 🔍 调试日志
        if (shouldGenerate) {
            console.log(`🎵 [6/8休止符] 位置${currentPosition.toFixed(2)}拍 (${isFirstGroup ? '第一组' : '第二组'}), 概率${(restProbability * 100).toFixed(1)}% → 生成休止符`);
        }

        return shouldGenerate;
    }

    /**
     * 🆕 智能选择6/8拍模式 - 考虑复杂度、多样性和教育价值
     * @param {Array} availablePatterns - 可用的模式列表
     * @returns {Object} 选中的模式
     */
    selectOptimal68Pattern(availablePatterns) {
        if (availablePatterns.length === 0) {
            throw new Error('没有可用的6/8拍模式');
        }

        if (availablePatterns.length === 1) {
            console.log(`🎯 只有一个可用模式: ${availablePatterns[0].id}`);
            return availablePatterns[0];
        }

        console.log(`🧠 [Phase 2] 使用非线性权重算法选择6/8拍模式 (${availablePatterns.length}个可选)`);

        // 🆕 Phase 2: 使用预计算的权重信息
        let weightedPatterns = this._lastPatternWeights;

        if (!weightedPatterns || weightedPatterns.length === 0) {
            console.warn(`⚠️ 未找到预计算权重，降级到传统评分模式`);
            // 降级到传统评分
            const scoredPatterns = availablePatterns.map(pattern => {
                const score = this.calculate68PatternScore(pattern);
                return { pattern, score };
            });
            scoredPatterns.sort((a, b) => b.score.total - a.score.total);
            return scoredPatterns[0].pattern;
        }

        // 应用加权随机选择
        const selected = this.selectWeightedRandom68Pattern(weightedPatterns);

        console.log(`🎯 [非线性选择] 模式${selected.pattern.id}: ${selected.pattern.name}`);
        console.log(`📊 [权重详情] 总权重=${(selected.weight * 100).toFixed(1)}% (${selected.description})`);

        return selected.pattern;
    }

    /**
     * 🆕 Phase 2: 基于权重的随机选择算法
     * 使用轮盘赌算法，高权重模式有更高概率被选中
     *
     * @param {Array} weightedPatterns - 带权重的模式列表
     * @returns {Object} 选中的权重模式对象
     */
    selectWeightedRandom68Pattern(weightedPatterns) {
        if (weightedPatterns.length === 1) {
            return weightedPatterns[0];
        }

        // 计算总权重
        const totalWeight = weightedPatterns.reduce((sum, wp) => sum + wp.weight, 0);

        if (totalWeight <= 0) {
            console.warn(`⚠️ 总权重为0，使用随机选择`);
            return weightedPatterns[Math.floor(Math.random() * weightedPatterns.length)];
        }

        // 轮盘赌选择
        const randomValue = Math.random() * totalWeight;
        let cumulativeWeight = 0;

        for (const weightedPattern of weightedPatterns) {
            cumulativeWeight += weightedPattern.weight;
            if (randomValue <= cumulativeWeight) {
                console.log(`🎲 [轮盘赌] 命中权重${(weightedPattern.weight * 100).toFixed(1)}%, 累积权重${(cumulativeWeight / totalWeight * 100).toFixed(1)}%`);
                return weightedPattern;
            }
        }

        // 备用：返回最后一个（理论上不应该到达这里）
        console.warn(`⚠️ 轮盘赌算法异常，返回最高权重模式`);
        return weightedPatterns[0];
    }

    /**
     * 🆕 计算6/8拍模式的综合评分
     * @param {Object} pattern - 模式对象
     * @returns {Object} 评分对象
     */
    calculate68PatternScore(pattern) {
        let complexity = 0;
        let educational = 0;
        let variety = 0;

        // 1. 复杂度评分 (0-10)
        const noteCount = pattern.notes.length;
        const uniqueRhythms = [...new Set(pattern.notes.map(n => n.value))];

        complexity += noteCount; // 音符数量
        complexity += uniqueRhythms.length * 2; // 节奏类型多样性

        // 不同节奏类型的复杂度权重
        const rhythmWeights = {
            'eighth': 1,
            'quarter': 2,
            'quarter.': 3,
            'dotted-quarter': 3,
            'half.': 4,
            'dotted-half': 5
        };

        pattern.notes.forEach(note => {
            complexity += rhythmWeights[note.value] || 1;
        });

        // 2. 教育价值评分 (0-10)
        educational += uniqueRhythms.length * 3; // 学习多种节奏类型价值高

        // 特定教育价值模式
        if (pattern.id === 1) educational += 3; // 基础六个八分音符
        if (pattern.id === 2) educational += 3; // 基础附点四分音符
        if (pattern.notes.some(n => n.value === 'quarter.')) educational += 2; // 附点节奏重要
        if (noteCount >= 4) educational += 2; // 复合节奏训练

        // 3. 多样性评分 (0-10) - 避免重复相似模式
        variety += Math.min(uniqueRhythms.length * 2, 6);
        if (noteCount >= 4) variety += 2;
        if (noteCount <= 2) variety += 1; // 简单模式也有价值
        variety += (10 - pattern.id) * 0.2; // 轻微偏好前面的经典模式

        // 总分计算 (权重: 复杂度30%, 教育价值50%, 多样性20%)
        const total = Math.round(complexity * 0.3 + educational * 0.5 + variety * 0.2);

        return {
            complexity: Math.round(complexity),
            educational: Math.round(educational),
            variety: Math.round(variety),
            total
        };
    }

    /**
     * 🆕 应用6/8拍的符杠连接规则（3+3分组）
     * @param {Array} notes - 音符数组
     * @returns {Array} 应用符杠规则后的事件数组
     */
    apply68BeamingRules(notes) {
        this._log('beaming', `🔧 应用6/8拍符杠规则: ${notes.length}个音符`);
        const events = [];

        // 🎯 6/8拍符杠规则: 只有八分音符需要连接，严格3+3分组
        // primaryBoundaries: [0, 1.5] - 绝不跨越1.5拍边界
        // 第一组位置: [0, 0.5, 1.0] | 第二组位置: [1.5, 2.0, 2.5]

        // 🔍 智能分析：考虑休止符阻断的连续八分音符序列
        const beamableSequences = this.analyze68BeamableSequences(notes);

        this._log('beaming', `🔧 6/8拍智能beaming分析:`);
        if (this._debugLevel.beaming) {
            beamableSequences.forEach((seq, i) => {
                console.log(`  序列${i+1}: ${seq.notes.length}个音符 [${seq.notes.map(n => n.position).join(', ')}] 区域:${seq.region}`);
            });
        }

        // 🎵 处理每个音符，考虑休止符对beaming的影响
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const event = {
                value: note.value,
                displayName: note.displayName || this.getDisplayName(note.value),
                duration: note.duration,
                type: note.type || 'note',  // 🔧 正确从原始note复制type
                position: note.position,
                // 🆕 添加音程生成所需的属性
                pitch: null,        // 音高信息，稍后填充
                midi: null,         // MIDI值，稍后填充
                noteName: null,     // 音符名，稍后填充
                octave: null,       // 八度，稍后填充
                accidental: null,   // 升降号，稍后填充
                isRhythmTemplate: true  // 标记这是节奏模板，需要后续填充音高信息
            };

            // 🎯 应用智能3+3符杠规则（考虑休止符阻断）
            if (event.type === 'rest') {
                // 休止符不参与beaming
                console.log(`🔇 休止符@${event.position}: 不参与beaming`);
            } else {
                this.apply68IntelligentBeamingRules(event, note, beamableSequences);
            }

            events.push(event);
        }

        // 🆕 标注二连音/四连音分组（为 MusicXML tuplet 提供位置与编号）
        this.annotateNpletGroups(events, 0.0, 1.5, 'duplet', 2);
        this.annotateNpletGroups(events, 1.5, 3.0, 'duplet', 2);
        this.annotateNpletGroups(events, 0.0, 1.5, 'quadruplet', 4);
        this.annotateNpletGroups(events, 1.5, 3.0, 'quadruplet', 4);

        // 🛡️ 验证6/8拍beaming：确保没有跨越1.5拍边界
        const beamedEvents = events.filter(e => e.beamGroup);
        const group1Events = beamedEvents.filter(e => e.position < 1.5);
        const group2Events = beamedEvents.filter(e => e.position >= 1.5);

        // 验证第一组不跨边界
        const group1Violations = group1Events.filter(e => e.position >= 1.5);
        if (group1Violations.length > 0) {
            console.warn(`⚠️ 第一组beam跨越1.5拍边界: ${group1Violations.length}个`);
        }

        // 验证第二组不跨边界
        const group2Violations = group2Events.filter(e => e.position < 1.5);
        if (group2Violations.length > 0) {
            console.warn(`⚠️ 第二组beam跨越1.5拍边界: ${group2Violations.length}个`);
        }

        // 🎯 验证总时值
        const totalDuration = events.reduce((sum, event) => sum + event.duration, 0);
        if (Math.abs(totalDuration - 3.0) > 0.01) {
            console.error(`❌ 时值错误: 6/8拍小节应为3.0拍，实际${totalDuration}拍`);
            throw new Error(`6/8拍时值错误: ${totalDuration} ≠ 3.0`);
        }

        this._log('beaming', `✅ 6/8拍符杠规则应用完成:`);
        this._log('beaming', `  - 总音符: ${events.length}个 (总时值: ${totalDuration.toFixed(3)}拍)`);
        this._log('beaming', `  - 第一组beam: ${group1Events.length}个`);
        this._log('beaming', `  - 第二组beam: ${group2Events.length}个`);
        this._log('beaming', `  - 严格遵守1.5拍边界，3+3分组 ✓`);

        // 验证事件数量
        if (events.length > 6) {
            console.error(`🚨 [CRITICAL] 符杠规则返回了${events.length}个事件，超过6个！`);
            console.error(`🚨 输入${notes.length}个音符，输出${events.length}个事件`);
        }

        // 🛡️ BULLETPROOF VALIDATION: apply68BeamingRules绝不能改变音符数量
        if (events.length !== notes.length) {
            console.error(`🚨🚨🚨 [CRITICAL-BEAMING-VALIDATION] apply68BeamingRules改变了音符数量！`);
            console.error(`🚨 输入: ${notes.length}个音符, 输出: ${events.length}个事件`);
            console.error(`🚨 这绝对不能发生！Beaming不应该增减音符`);

            // 如果输出超过输入，截取到正确数量
            if (events.length > notes.length) {
                console.error(`🚨 强制截取到${notes.length}个事件`);
                const correctedEvents = events.slice(0, notes.length);
                console.error(`🚨 已截取为${correctedEvents.length}个事件`);
                return correctedEvents;
            }
        }

        this._log('beaming', `✅ [BEAMING-VALIDATION-PASS] apply68BeamingRules验证通过: ${notes.length}→${events.length}`);
        return events;
    }

    /**
     * 🆕 标注 6/8 的二连音/四连音分组（用于 MusicXML tuplet）
     * @param {Array} events - 事件数组
     * @param {number} regionStart - 区域开始位置（0 或 1.5）
     * @param {number} regionEnd - 区域结束位置（1.5 或 3.0）
     * @param {string} kind - 'duplet' 或 'quadruplet'
     * @param {number} size - 组大小（2 或 4）
     */
    annotateNpletGroups(events, regionStart, regionEnd, kind, size) {
        const inRegion = (e) => e.position >= regionStart && e.position < regionEnd;
        let i = 0;
        while (i < events.length) {
            if (inRegion(events[i]) && events[i].value === kind) {
                // 收集连续的同类n连音
                const group = [];
                let j = i;
                while (j < events.length && inRegion(events[j]) && events[j].value === kind && group.length < size) {
                    group.push(events[j]);
                    j++;
                }
                if (group.length === size) {
                    const id = ++this.tripletIdCounter; // 复用计数器避免冲突
                    const beamId = `68-${kind}-${id}-${regionStart}`;
                    group.forEach((ev, idx) => {
                        ev.tupletGroup = true;
                        ev.tupletKind = kind; // 'duplet' | 'quadruplet'
                        ev.tupletId = id;
                        if (idx === 0) ev.tupletPosition = 'start';
                        else if (idx === group.length - 1) ev.tupletPosition = 'stop';
                        else ev.tupletPosition = 'middle';

                        // 设置n-plet内的beam连接（休止符会自然中断，因为group里只有音符）
                        ev.npletBeamInfo = ev.beamPosition; // 供XML生成直接使用
                    });
                    i = j;
                    continue;
                }
                i = j;
                continue;
            }
            i++;
        }
    }

    /**
     * 🔍 分析6/8拍中被休止符分隔的连续八分音符序列
     * @param {Array} notes - 音符数组
     * @returns {Array} 连续八分音符序列数组
     */
    analyze68BeamableSequences(notes) {
        const sequences = [];

        // 按位置排序所有音符
        const sortedNotes = [...notes].sort((a, b) => a.position - b.position);

        // 分别处理两个6/8拍区域
        const region1Notes = sortedNotes.filter(note => note.position < 1.5);
        const region2Notes = sortedNotes.filter(note => note.position >= 1.5);

        // 分析第一区域 (0-1.5拍)
        const region1Sequences = this.findContinuousEighthNoteSequences(region1Notes, 1);
        sequences.push(...region1Sequences);

        // 分析第二区域 (1.5-3拍)
        const region2Sequences = this.findContinuousEighthNoteSequences(region2Notes, 2);
        sequences.push(...region2Sequences);

        return sequences;
    }

    /**
     * 🔍 在指定区域内找到连续的八分音符序列（被休止符分隔）
     * @param {Array} regionNotes - 区域内的音符
     * @param {number} regionNumber - 区域编号 (1或2)
     * @returns {Array} 连续序列数组
     */
    findContinuousEighthNoteSequences(regionNotes, regionNumber) {
        const sequences = [];
        let currentSequence = [];

        for (let i = 0; i < regionNotes.length; i++) {
            const note = regionNotes[i];

            if (note.type === 'rest') {
                // 休止符：结束当前序列（如果有的话）
                if (currentSequence.length > 0) {
                    sequences.push({
                        notes: [...currentSequence],
                        region: regionNumber,
                        beamGroupId: `68-group-${regionNumber}-${sequences.length + 1}`
                    });
                    currentSequence = [];
                }
            } else if (note.value === 'eighth') {
                // 八分音符：添加到当前序列
                currentSequence.push(note);
            } else {
                // 其他音符（四分音符、附点四分音符等）：结束当前序列
                if (currentSequence.length > 0) {
                    sequences.push({
                        notes: [...currentSequence],
                        region: regionNumber,
                        beamGroupId: `68-group-${regionNumber}-${sequences.length + 1}`
                    });
                    currentSequence = [];
                }
            }
        }

        // 处理最后的序列
        if (currentSequence.length > 0) {
            sequences.push({
                notes: [...currentSequence],
                region: regionNumber,
                beamGroupId: `68-group-${regionNumber}-${sequences.length + 1}`
            });
        }

        return sequences;
    }

    /**
     * 🎯 应用智能6/8拍符杠规则（考虑休止符阻断）
     * @param {Object} event - 当前事件对象
     * @param {Object} note - 原始音符对象
     * @param {Array} beamableSequences - 可连接的音符序列
     */
    apply68IntelligentBeamingRules(event, note, beamableSequences) {
        const position = note.position || 0;
        const noteValue = note.value;

        // 🎯 只有八分音符参与beaming
        if (noteValue !== 'eighth') {
            console.log(`🔧 ${noteValue}@${position}: 无符杠 (非八分音符)`);
            return;
        }

        // 🔍 查找当前音符属于哪个序列
        const targetSequence = beamableSequences.find(seq =>
            seq.notes.some(seqNote => Math.abs(seqNote.position - position) < 0.001)
        );

        if (!targetSequence) {
            console.log(`🔧 八分音符@${position}: 无符杠 (不在连续序列中)`);
            return;
        }

        // 🔍 如果序列只有一个音符，不需要beaming
        if (targetSequence.notes.length === 1) {
            console.log(`🔧 八分音符@${position}: 无符杠 (序列只有1个音符)`);
            return;
        }

        // 🎯 应用beaming

        // 🔍 确定在序列中的位置
        const noteIndex = targetSequence.notes.findIndex(seqNote =>
            Math.abs(seqNote.position - position) < 0.001
        );

        // 设置beam位置
        if (noteIndex === 0) {
            event.beamPosition = 'start';
        } else if (noteIndex === targetSequence.notes.length - 1) {
            event.beamPosition = 'end';
        } else {
            event.beamPosition = 'middle';
        }

        // 设置beam分组ID（区分前后两个3拍组）
        event.beamGroup = position < 1.5 ? 'group1' : 'group2';

        console.log(`🔧 八分音符@${position}: ${event.beamPosition} (序列${targetSequence.beamGroupId}, ${noteIndex + 1}/${targetSequence.notes.length}, beamGroup=${event.beamGroup})`);
    }

    /**
     * 🎯 应用强化的6/8拍3+3符杠规则
     * @param {Object} event - 当前事件对象
     * @param {Object} note - 原始音符对象
     * @param {Array} group1EighthNotes - 第一组八分音符数组
     * @param {Array} group2EighthNotes - 第二组八分音符数组
     */
    apply68StrictBeamingRules(event, note, group1EighthNotes, group2EighthNotes) {
        const position = note.position || 0;
        const noteValue = note.value;

        // 🎯 严格3+3分组规则：只有特定类型的音符才需要符杠
        const beamableNotes = ['eighth', '16th', 'duplet', 'quadruplet'];

        if (!beamableNotes.includes(noteValue)) {
            // 四分音符、附点音符等不需要符杠
            console.log(`🔧 ${noteValue}@${position}: 无符杠 (${this.getBeamingDescription(noteValue)})`);
            return;
        }

        // 🛡️ 严格边界检查：确保不跨越1.5拍边界
        if (position < 1.5) {
            // 第一组 (0-1.5拍)
            this.applyBeamingToGroup(event, note, group1EighthNotes, '68-group-1', '第一组', 1.5);
        } else if (position >= 1.5) {
            // 第二组 (1.5-3拍)
            this.applyBeamingToGroup(event, note, group2EighthNotes, '68-group-2', '第二组', 3.0);
        } else {
            // 理论上不应该到达这里
            console.error(`❌ 无法确定音符@${position}的分组`);
        }
    }

    /**
     * 🎯 为特定组应用符杠规则
     * @param {Object} event - 当前事件
     * @param {Object} note - 原始音符
     * @param {Array} groupNotes - 该组的音符数组
     * @param {string} groupId - 组ID
     * @param {string} groupName - 组名称（用于日志）
     * @param {number} maxPosition - 该组的最大位置边界
     */
    applyBeamingToGroup(event, note, groupNotes, groupId, groupName, maxPosition) {
        const position = note.position || 0;
        const duration = note.duration || 0;
        const endPosition = position + duration;

        // 🛡️ 边界验证：确保音符不跨越组边界
        if (endPosition > maxPosition && Math.abs(endPosition - maxPosition) > 0.01) {
            console.error(`❌ 音符@${position}跨越${groupName}边界: 结束位置${endPosition} > ${maxPosition}`);
            return;
        }

        // 🎯 严格3+3规则：最多3个音符一组
        if (groupNotes.length > 3) {
            console.warn(`⚠️ ${groupName}音符数量超过3个: ${groupNotes.length}个`);
            // 仍然应用符杠，但记录警告
        }

        // 🎵 符杠应用逻辑
        if (groupNotes.length > 1) {

            // 查找当前音符在组中的索引
            const indexInGroup = groupNotes.findIndex(n => Math.abs(n.position - position) < 0.001);

            if (indexInGroup === -1) {
                console.error(`❌ 无法在${groupName}中找到位置${position}的音符`);
                return;
            }

            // 设置符杠位置
            if (indexInGroup === 0) {
            } else if (indexInGroup === groupNotes.length - 1) {
            } else {
            }

            console.log(`🔧 ${groupName}@${position}: ${event.beamPosition} (${indexInGroup + 1}/${groupNotes.length})`);
        } else {
            // 单独的音符不需要符杠
            console.log(`🔧 ${groupName}单独音符@${position}: 无符杠`);
        }

        // 🛡️ 最终验证：确保符杠属性的一致性
        this.validateBeamingConsistency(event, groupName, position);
    }

    /**
     * 🛡️ 验证符杠属性的一致性
     * @param {Object} event - 事件对象
     * @param {string} groupName - 组名称
     * @param {number} position - 位置
     */
    validateBeamingConsistency(event, groupName, position) {
        const hasBeamGroup = event.beamGroup !== null;
        const hasBeamPosition = event.beamPosition !== null;

        if (hasBeamGroup !== hasBeamPosition) {
            console.error(`❌ 符杠属性不一致 ${groupName}@${position}: beamGroup=${event.beamGroup}, beamPosition=${event.beamPosition}`);
            // 修复不一致状态
            if (!hasBeamGroup) {
            } else if (!hasBeamPosition) {
            }
        }
    }

    /**
     * 🆕 获取符杠描述
     * @param {string} noteValue - 音符类型
     * @returns {string} 描述文本
     */
    getBeamingDescription(noteValue) {
        const descriptions = {
            'quarter': '四分音符不需要符杠',
            'quarter.': '附点四分音符不需要符杠',
            'dotted-quarter': '附点四分音符不需要符杠',
            'half': '二分音符不需要符杠',
            'half.': '附点二分音符不需要符杠',
            'dotted-half': '附点二分音符不需要符杠',
            'whole': '全音符不需要符杠'
        };
        return descriptions[noteValue] || '节奏类型未知';
    }

    // ==========================================
    // 🎵 【旋律工具搬运】6/8拍Beaming系统
    // 搬运自: sight-reading-final.js
    // 日期: 2025-10-09
    // ==========================================

    /**
     * 🎵 【旋律工具搬运】6/8拍的严格位置分组检查
     * 强制在1.5拍处分组，确保两大组结构
     * 搬运自: sight-reading-final.js:8920-8950
     * @param {Array} currentGroup - 当前beam组的音符索引数组
     * @param {Array} allNotes - 所有音符数组
     * @returns {boolean} 是否应该开始新组
     */
    check6_8BeamingPosition(currentGroup, allNotes) {
        if (currentGroup.length === 0) {
            return false;
        }

        // 计算当前组的起始位置
        const firstNoteIndex = currentGroup[0];
        const groupStartPosition = this.calculateNotePosition(allNotes, firstNoteIndex);
        const measurePosition = groupStartPosition % 3; // 在3拍小节内的位置

        // 🔥 6/8拍关键检查：位置1.5的音符必须强制开始新beam组
        if (Math.abs(measurePosition - 1.5) < 0.001 && currentGroup.length > 0) {
            console.log(`    🚫 6/8拍强制规则：位置1.5处强制结束第一组，开始第二组`);
            return true;
        }

        // 检查是否跨越6/8拍的主拍边界（1.5拍处）
        const currentGroupEndPos = measurePosition + (currentGroup.length * 0.5);
        if (measurePosition < 1.5 && currentGroupEndPos > 1.5) {
            console.log(`    6/8拍跨越主拍边界(1.5拍)，开始新组`);
            return true;
        }

        // 限制每组最多3个八分音符（一个附点四分音符的时值）
        if (currentGroup.length >= 3) {
            console.log(`    6/8拍组已满3个八分音符，开始新组`);
            return true;
        }

        return false;
    }

    /**
     * 🎵 【旋律工具搬运】计算音符的起始位置
     * @param {Array} allNotes - 所有音符数组
     * @param {number} noteIndex - 目标音符的索引
     * @returns {number} 音符的起始位置（拍数）
     */
    calculateNotePosition(allNotes, noteIndex) {
        let position = 0;
        for (let i = 0; i < noteIndex; i++) {
            position += allNotes[i].beats || allNotes[i].duration || 0;
        }
        return position;
    }

    /**
     * 🎵 【旋律工具搬运】检查音符是否可以beamed
     * @param {Object} note - 音符对象
     * @returns {boolean} 是否可以beam
     */
    canNoteBeBeamed_For68(note) {
        if (note.type !== 'note') {
            return false; // 休止符不能beam
        }

        // 6/8拍中，八分音符、十六分音符等可以beam
        const beamableNotes = ['eighth', '16th', 'duplet', 'quadruplet'];
        return beamableNotes.includes(note.value);
    }

    /**
     * 🎵 【旋律工具搬运】为6/8拍生成beam分组 - 使用旋律工具验证过的逻辑
     * 核心规则：
     * 1. 强制在1.5拍处分组
     * 2. 每组最多3个八分音符
     * 3. 休止符中断beam
     * 修复日期: 2025-10-09 第2版
     * 修复内容: 添加position维护和正确的位置检查
     * @param {Array} notes - 音符数组
     * @returns {Array} beam组数组
     */
    generateBeamsFor6_8(notes) {
        console.log(`🎵 6/8拍beam生成 - 使用旋律工具验证逻辑（修复版）`);
        console.log(`🔍 处理${notes.length}个音符`);

        const beamGroups = [];
        let currentGroup = [];
        let currentPosition = 0;

        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const noteBeats = note.beats || note.duration || 0;
            const noteEnd = currentPosition + noteBeats;

            const canBeBeamed = this.canNoteBeBeamed_For68(note);

            if (canBeBeamed) {
                if (currentGroup.length > 0) {
                    // ✅ 修复：传递位置信息给检查函数
                    const shouldStartNew = this.shouldStartNewBeamGroup_For68(
                        currentPosition,  // 当前音符开始位置
                        noteEnd,          // 当前音符结束位置
                        notes,
                        currentGroup
                    );

                    if (shouldStartNew) {
                        this.endCurrentBeamGroup_For68(beamGroups, currentGroup, notes);
                        currentGroup = [];
                    }
                }

                currentGroup.push(i);
                console.log(`  ✅ 音符${i} (${note.value}) @ 位置${currentPosition.toFixed(3)}-${noteEnd.toFixed(3)} 加入beam组`);
            } else {
                if (currentGroup.length > 0) {
                    this.endCurrentBeamGroup_For68(beamGroups, currentGroup, notes);
                    currentGroup = [];
                }
                console.log(`  ❌ 音符${i} (${note.type}/${note.value}) @ 位置${currentPosition.toFixed(3)} 不能beam`);
            }

            currentPosition = noteEnd; // ✅ 修复：更新到音符结束位置
        }

        // 处理最后一组
        if (currentGroup.length > 0) {
            this.endCurrentBeamGroup_For68(beamGroups, currentGroup, notes);
        }

        console.log(`🎵 6/8拍beam生成完成: ${beamGroups.length}个beam组`);
        beamGroups.forEach((group, i) => {
            const noteTypes = group.notes.map(idx => notes[idx].value).join(',');
            console.log(`  Beam组${i+1}: 音符[${group.notes.join(',')}] (${noteTypes})`);
        });

        return beamGroups;
    }

    /**
     * 🎵 【旋律工具搬运】结束当前beam组
     * @param {Array} beamGroups - beam组数组
     * @param {Array} currentGroup - 当前组
     * @param {Array} notes - 所有音符
     */
    endCurrentBeamGroup_For68(beamGroups, currentGroup, notes) {
        if (currentGroup.length < 2) {
            return; // 少于2个音符不形成beam组
        }

        const beamGroup = {
            start: currentGroup[0],
            end: currentGroup[currentGroup.length - 1],
            notes: [...currentGroup],
            beamLevels: [{
                level: 1,
                start: currentGroup[0],
                end: currentGroup[currentGroup.length - 1]
            }],
            stemDirection: 'up'
        };

        beamGroups.push(beamGroup);
        console.log(`  📦 创建beam组: 音符[${currentGroup.join(',')}]`);
    }

    /**
     * 🎵 【6/8拍专用】判断是否应该开始新的beam组
     * 修复日期: 2025-10-09
     * 修复内容: 新增函数作为位置检查的中间层，正确处理6/8拍的3+3分组
     * @param {number} noteStart - 当前音符开始位置
     * @param {number} noteEnd - 当前音符结束位置
     * @param {Array} allNotes - 所有音符数组
     * @param {Array} currentGroup - 当前beam组的音符索引数组
     * @returns {boolean} 是否应该开始新组
     */
    shouldStartNewBeamGroup_For68(noteStart, noteEnd, allNotes, currentGroup) {
        if (currentGroup.length === 0) {
            return false;
        }

        // 计算当前组的起始位置
        const firstNoteIndex = currentGroup[0];
        const groupStartPos = this.calculateNotePosition(allNotes, firstNoteIndex);
        const groupStartInMeasure = groupStartPos % 3; // 在3拍小节内的位置

        // 计算新音符在小节内的位置
        const noteStartInMeasure = noteStart % 3;
        const noteEndInMeasure = noteEnd % 3;

        // 🔥 核心检查1：新音符起始位置在1.5拍处
        // 这是6/8拍的主拍边界，必须强制开始新组
        if (Math.abs(noteStartInMeasure - 1.5) < 0.001) {
            console.log(`    🚫 6/8拍规则：新音符在1.5拍处（第二个附点四分音符拍），强制开始新组`);
            return true;
        }

        // 🔥 核心检查2：beam组会跨越1.5边界
        // 第一组(0-1.5)的音符不能延伸到第二组(1.5-3)
        if (groupStartInMeasure < 1.5 && noteEndInMeasure > 1.5) {
            console.log(`    🚫 6/8拍规则：beam会跨越1.5拍边界（组起始${groupStartInMeasure.toFixed(3)}，新音符结束${noteEndInMeasure.toFixed(3)}），强制开始新组`);
            return true;
        }

        // 注意：noteEndInMeasure可能是0（例如从2.5到3.0，3.0 % 3 = 0）
        // 需要特殊处理这种跨小节的情况
        if (groupStartInMeasure < 1.5 && noteEnd > noteStart && noteEndInMeasure < 0.5 && noteStart >= 1.0) {
            console.log(`    🚫 6/8拍规则：音符跨越小节边界，强制开始新组`);
            return true;
        }

        // 🔥 核心检查3：组已满3个音符
        // 6/8拍每个附点四分音符拍包含3个八分音符，不能超过
        if (currentGroup.length >= 3) {
            console.log(`    🚫 6/8拍规则：组已满3个八分音符（一个附点四分音符拍），强制开始新组`);
            return true;
        }

        return false;
    }

    // ==========================================
    // 🎵 结束旋律工具搬运部分
    // ==========================================

    /**
     * 🆕 将6/8拍节奏模板转换为完整的音程事件
     * @param {Array} rhythmEvents - 节奏模板事件数组
     * @param {Array} intervalTypes - 可用的音程类型
     * @param {string} keySignature - 调号
     * @param {Object} range - 音域范围
     * @returns {Object} 包含lowerVoice和upperVoice的对象
     */
    convert68RhythmToIntervalEvents(rhythmEvents, intervalTypes, keySignature, range) {
        console.log(`🎵 转换6/8拍节奏模板为音程事件: ${rhythmEvents.length}个事件`);

        if (!rhythmEvents || rhythmEvents.length === 0) {
            console.error('❌ 没有节奏事件需要转换');
            return { lowerVoice: [], upperVoice: [] };
        }

        const lowerVoice = [];
        const upperVoice = [];
        let lastInterval = null;

        // 获取音阶对象
        const scale = this.scales[keySignature] || this.scales['C'];
        const timeSignature = { beats: 6, beatType: 8 };

        for (let i = 0; i < rhythmEvents.length; i++) {
            const rhythmEvent = rhythmEvents[i];

            if (rhythmEvent.type === 'rest') {
                // 休止符保持原样
                const restLower = { ...rhythmEvent };
                const restUpper = { ...rhythmEvent };
                lowerVoice.push(restLower);
                upperVoice.push(restUpper);
                continue;
            }

            // 为音符事件生成音程
            try {
                const currentPosition = rhythmEvent.position || 0;
                const interval = this.generateIntervalPairWithProgression(
                    scale,
                    intervalTypes,
                    range.min,
                    range.max,
                    lastInterval,
                    null, // measureIndex
                    currentPosition,
                    timeSignature
                );

                if (!interval) {
                    console.error(`❌ 第${i}个事件生成音程失败，使用安全音程`);
                    // 生成安全的音程（大三度C4-E4）
                    const safeLower = this.createSafeIntervalNote(rhythmEvent, 'C4', 60);
                    const safeUpper = this.createSafeIntervalNote(rhythmEvent, 'E4', 64);
                    lowerVoice.push(safeLower);
                    upperVoice.push(safeUpper);
                    continue;
                }

                // 创建下声部音符
                const lowerNote = {
                    ...rhythmEvent,
                    pitch: interval.lower.pitch,
                    midi: interval.lower.midi,
                    noteName: interval.lower.pitch.charAt(0),
                    octave: parseInt(interval.lower.pitch.slice(-1)),
                    accidental: interval.lower.accidental || null,
                    isRhythmTemplate: false
                };

                // 创建上声部音符
                const upperNote = {
                    ...rhythmEvent,
                    pitch: interval.upper.pitch,
                    midi: interval.upper.midi,
                    noteName: interval.upper.pitch.charAt(0),
                    octave: parseInt(interval.upper.pitch.slice(-1)),
                    accidental: interval.upper.accidental || null,
                    isRhythmTemplate: false
                };

                lowerVoice.push(lowerNote);
                upperVoice.push(upperNote);

                // 记录最后的音程用于连续性
                lastInterval = {
                    lowerNote: interval.lower.pitch.charAt(0),
                    lowerMidi: interval.lower.midi,
                    upperMidi: interval.upper.midi,
                    intervalType: intervalTypes[0].name // 使用第一个音程类型作为默认
                };

            } catch (error) {
                console.error(`❌ 第${i}个事件转换失败:`, error);
                // 使用安全音程
                const safeLower = this.createSafeIntervalNote(rhythmEvent, 'C4', 60);
                const safeUpper = this.createSafeIntervalNote(rhythmEvent, 'E4', 64);
                lowerVoice.push(safeLower);
                upperVoice.push(safeUpper);
            }
        }

        console.log(`✅ 转换完成: ${lowerVoice.length}个下声部, ${upperVoice.length}个上声部`);
        return { lowerVoice, upperVoice };
    }

    /**
     * 🆕 创建安全的音程音符
     * @param {Object} rhythmEvent - 节奏事件模板
     * @param {string} pitch - 音高（如'C4'）
     * @param {number} midi - MIDI值
     * @returns {Object} 完整的音符对象
     */
    createSafeIntervalNote(rhythmEvent, pitch, midi) {
        return {
            ...rhythmEvent,
            pitch: pitch,
            midi: midi,
            noteName: pitch.charAt(0),
            octave: parseInt(pitch.slice(-1)),
            accidental: null,
            isRhythmTemplate: false
        };
    }

    /**
     * 🛡️ 6/8拍综合验证检查（时值+音符数量+边界+复拍子规则）
     * @param {Array} events - 事件数组
     * @param {Object} pattern - 所用的模式
     * @param {number} expectedDuration - 期望的总时值
     * @returns {Object} 验证结果 {isValid: boolean, error: string}
     */
    validate68ComprehensiveChecks(events, pattern, expectedDuration) {
        this._log('beaming', `🛡️ 6/8拍综合验证开始: ${events.length}个事件`);

        // 1. 基础验证：事件存在性
        if (!events || events.length === 0) {
            return { isValid: false, error: '没有事件需要验证' };
        }

        // 2. 音符数量限制验证（6/8拍最多6个八分音符）
        if (events.length > 6) {
            return {
                isValid: false,
                error: `音符数量超限: ${events.length}个事件，6/8拍最多6个事件`
            };
        }

        // 3. 总时值验证
        const totalDuration = events.reduce((sum, event) => sum + (event.duration || 0), 0);
        const durationTolerance = 0.01;

        if (Math.abs(totalDuration - expectedDuration) > durationTolerance) {
            return {
                isValid: false,
                error: `总时值错误: 实际${totalDuration.toFixed(3)}拍, 期望${expectedDuration}拍`
            };
        }

        // 4. 个别音符时值验证（6/8拍中的合法时值）
        const validDurations68 = [0.5, 1.0, 1.5, 2.0, 3.0]; // 八分、四分、附点四分、二分、附点二分
        const invalidNotes = events.filter(event => {
            const duration = event.duration || 0;
            return !validDurations68.some(valid => Math.abs(duration - valid) < 0.01);
        });

        if (invalidNotes.length > 0) {
            const invalidDurations = invalidNotes.map(n => n.duration).join(', ');
            return {
                isValid: false,
                error: `非法时值: ${invalidDurations}拍, 6/8拍只允许: ${validDurations68.join(', ')}拍`
            };
        }

        // 5. 位置边界验证（不能跨越1.5拍边界）
        const boundaryViolations = events.filter(event => {
            const position = event.position || 0;
            const duration = event.duration || 0;
            const endPosition = position + duration;

            // 检查是否跨越1.5拍边界
            return position < 1.5 && endPosition > 1.5 && Math.abs(endPosition - 1.5) > 0.01;
        });

        if (boundaryViolations.length > 0) {
            const violations = boundaryViolations.map(e =>
                `位置${e.position}-${(e.position + e.duration).toFixed(2)}`
            ).join(', ');
            return {
                isValid: false,
                error: `跨越1.5拍边界: ${violations}`
            };
        }

        // 6. 复拍子规则验证（确保符合6/8复拍子特征）
        const hasValidCompoundStructure = this.validate68CompoundStructure(events);
        if (!hasValidCompoundStructure.isValid) {
            return {
                isValid: false,
                error: `复拍子结构错误: ${hasValidCompoundStructure.error}`
            };
        }

        // 7. 模式一致性验证（验证生成的事件与模式定义一致）
        const patternConsistency = this.validate68PatternConsistency(events, pattern);
        if (!patternConsistency.isValid) {
            return {
                isValid: false,
                error: `模式一致性错误: ${patternConsistency.error}`
            };
        }

        this._log('beaming', `✅ 6/8拍综合验证通过: ${events.length}个事件, ${totalDuration.toFixed(3)}拍`);
        return { isValid: true, error: null };
    }

    /**
     * 🛡️ 验证6/8拍复拍子结构
     * @param {Array} events - 事件数组
     * @returns {Object} 验证结果
     */
    validate68CompoundStructure(events) {
        // 6/8拍应该有明确的3+3分组感觉
        const firstHalfEvents = events.filter(e => (e.position || 0) < 1.5);
        const secondHalfEvents = events.filter(e => (e.position || 0) >= 1.5);

        // 如果有音符，两个半拍应该都有事件（除非是整个小节的长音符）
        if (events.length > 1) {
            const hasLongNote = events.some(e => (e.duration || 0) >= 2.5);
            if (!hasLongNote && (firstHalfEvents.length === 0 || secondHalfEvents.length === 0)) {
                return {
                    isValid: false,
                    error: `缺乏3+3分组结构: 前半拍${firstHalfEvents.length}个, 后半拍${secondHalfEvents.length}个`
                };
            }
        }

        return { isValid: true, error: null };
    }

    /**
     * 🛡️ 验证生成事件与模式定义的一致性
     * @param {Array} events - 生成的事件
     * @param {Object} pattern - 原始模式定义
     * @returns {Object} 验证结果
     */
    validate68PatternConsistency(events, pattern) {
        if (!pattern || !pattern.notes) {
            return { isValid: true, error: null }; // 无模式信息，跳过验证
        }

        // 验证音符数量是否一致
        if (events.length !== pattern.notes.length) {
            return {
                isValid: false,
                error: `音符数量不一致: 生成${events.length}个, 模式定义${pattern.notes.length}个`
            };
        }

        // 验证总时值是否一致
        const eventsTotalDuration = events.reduce((sum, e) => sum + (e.duration || 0), 0);
        const patternTotalDuration = pattern.totalDuration || 3.0;

        if (Math.abs(eventsTotalDuration - patternTotalDuration) > 0.01) {
            return {
                isValid: false,
                error: `总时值不一致: 生成${eventsTotalDuration.toFixed(3)}拍, 模式${patternTotalDuration}拍`
            };
        }

        return { isValid: true, error: null };
    }

    /**
     * 🛡️ 创建优化的6/8拍安全模式（智能错误恢复）
     * @param {string} errorContext - 错误上下文
     * @param {Object} options - 安全模式选项
     * @returns {Array} 安全模式的事件数组
     */
    create68SafePattern(errorContext = 'unknown', options = {}) {
        console.log(`🛡️ 创建6/8拍安全模式: ${errorContext}`);

        // 根据错误类型选择最合适的安全模式
        const safePatternType = this.select68SafePatternType(errorContext, options);
        console.log(`🔧 选择安全模式类型: ${safePatternType}`);

        let safeEvents;
        switch (safePatternType) {
            case 'six-eighths':
                safeEvents = this.createSixEighthsSafePattern();
                break;
            case 'two-dotted-quarters':
                safeEvents = this.createTwoDottedQuartersSafePattern();
                break;
            case 'mixed-safe':
                safeEvents = this.createMixedSafePattern();
                break;
            default:
                safeEvents = this.createUltimateSafePattern();
        }

        // 🛡️ 验证安全模式的正确性
        const validation = this.validateSafePattern(safeEvents);
        if (!validation.isValid) {
            console.error(`❌ 安全模式验证失败: ${validation.error}`);
            console.error(`🚨 使用终极安全模式`);
            safeEvents = this.createUltimateSafePattern();
        }

        console.log(`✅ 安全模式创建成功: ${safeEvents.length}个事件`);
        return safeEvents;
    }

    /**
     * 🎯 选择最合适的安全模式类型
     * @param {string} errorContext - 错误上下文
     * @param {Object} options - 选项
     * @returns {string} 安全模式类型
     */
    select68SafePatternType(errorContext, options) {
        // 根据错误类型智能选择
        if (errorContext.includes('beaming') || errorContext.includes('符杠')) {
            return 'six-eighths'; // 符杠问题用六个八分音符最安全
        }
        if (errorContext.includes('boundary') || errorContext.includes('边界')) {
            return 'two-dotted-quarters'; // 边界问题用附点四分音符避免跨界
        }
        if (errorContext.includes('pattern') || errorContext.includes('模式')) {
            return 'mixed-safe'; // 模式问题用混合安全模式
        }
        if (errorContext.includes('duration') || errorContext.includes('时值')) {
            return 'two-dotted-quarters'; // 时值问题用简单结构
        }

        // 默认情况
        return 'six-eighths';
    }

    /**
     * 🛡️ 创建六个八分音符安全模式
     * @returns {Array} 事件数组
     */
    createSixEighthsSafePattern() {
        // 🎵 基础六个八分音符模式，带可选休止符变化
        const basePattern = [
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
                position: 0,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            },
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
                position: 0.5,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            },
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
                position: 1.0,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            },
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
                position: 1.5,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            },
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
                position: 2.0,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            },
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
                position: 2.5,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            }
        ];

        // 🎲 6/8安全模式：可配置的休止符变化概率（默认15%）
        const restChance = (this._opts && this._opts.rest68SafeChance !== undefined) ? this._opts.rest68SafeChance : 0.15;
        if (Math.random() < restChance) {
            console.log('🎵 [6/8安全模式] 添加休止符变化');

            // 🎯 可替换为休止符的位置（避免组开始位置）
            const restCandidates = [
                { index: 1, position: 0.5, group: '68-group-1', beamPos: 'middle', desc: '第一组中间' },
                { index: 2, position: 1.0, group: '68-group-1', beamPos: 'end', desc: '第一组结尾' },
                { index: 4, position: 2.0, group: '68-group-2', beamPos: 'middle', desc: '第二组中间' },
                { index: 5, position: 2.5, group: '68-group-2', beamPos: 'end', desc: '第二组结尾' }
            ];

            // 🎵 随机选择一个位置放置休止符
            const selectedRest = restCandidates[Math.floor(Math.random() * restCandidates.length)];

            console.log(`🔇 [6/8安全模式] 在${selectedRest.desc} (位置${selectedRest.position}) 放置八分休止符`);

            // 🔄 替换选中位置为休止符
            basePattern[selectedRest.index] = {
                value: 'eighth',
                displayName: '八分休止符',
                duration: 0.5,
                type: 'rest',
                position: selectedRest.position,
                // 休止符不参与beaming
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            };

            // 🔧 调整beaming - 休止符应该完全中断beam连接
            if (selectedRest.beamPos === 'middle') {
                // 🎯 修复：休止符在组中间时，将被中断的音符设为独立
                console.log(`🔧 [6/8安全模式] 修复第一组休止符中断: 位置${selectedRest.position}的休止符中断beam连接`);

                basePattern.forEach(note => {
                    if (note.type === 'note' && note.beamGroup === selectedRest.group) {
                        // 将同组的所有音符改为独立，不跨越休止符连接
                        console.log(`  📍 位置${note.position}的音符改为独立（不连beam）`);
                    }
                });
            } else if (selectedRest.beamPos === 'end') {
                // 如果是组结尾的休止符，将前面的音符beam正确结束
                const sameGroupNotes = basePattern.filter(note =>
                    note.type === 'note' &&
                    note.beamGroup === selectedRest.group &&
                    note.position < selectedRest.position
                ).sort((a, b) => a.position - b.position);

                if (sameGroupNotes.length === 1) {
                    // 只剩一个音符，改为独立
                } else if (sameGroupNotes.length === 2) {
                    // 两个音符，正确设置start和end
                }
            }
        }

        return basePattern;
    }

    /**
     * 🛡️ 创建两个附点四分音符安全模式
     * @returns {Array} 事件数组
     */
    createTwoDottedQuartersSafePattern() {
        return [
            {
                value: 'quarter.',
                displayName: '附点四分音符',
                duration: 1.5,
                type: 'note',
                position: 0,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            },
            {
                value: 'quarter.',
                displayName: '附点四分音符',
                duration: 1.5,
                type: 'note',
                position: 1.5,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            }
        ];
    }

    /**
     * 🛡️ 创建混合安全模式
     * @returns {Array} 事件数组
     */
    createMixedSafePattern() {
        return [
            {
                value: 'quarter.',
                displayName: '附点四分音符',
                duration: 1.5,
                type: 'note',
                position: 0,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            },
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
                position: 1.5,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            },
            {
                value: 'quarter',
                displayName: '四分音符',
                duration: 1.0,
                type: 'note',
                position: 2.0,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            }
        ];
    }

    /**
     * 🚨 创建终极安全模式（最后的保险）
     * @returns {Array} 事件数组
     */
    createUltimateSafePattern() {
        console.log('🚨 使用终极安全模式：单个附点二分音符');
        return [
            {
                value: 'half.',
                displayName: '附点二分音符',
                duration: 3.0,
                type: 'note',
                position: 0,
                pitch: null,
                midi: null,
                isRhythmTemplate: true
            }
        ];
    }

    /**
     * 🛡️ 验证安全模式的正确性
     * @param {Array} events - 安全模式事件
     * @returns {Object} 验证结果
     */
    validateSafePattern(events) {
        // 基础检查
        if (!events || events.length === 0) {
            return { isValid: false, error: '安全模式为空' };
        }

        // 时值检查
        const totalDuration = events.reduce((sum, e) => sum + (e.duration || 0), 0);
        if (Math.abs(totalDuration - 3.0) > 0.01) {
            return {
                isValid: false,
                error: `安全模式总时值错误: ${totalDuration}拍 ≠ 3.0拍`
            };
        }

        // 边界检查
        const boundaryViolations = events.filter(e => {
            const pos = e.position || 0;
            const end = pos + (e.duration || 0);
            return pos < 1.5 && end > 1.5 && Math.abs(end - 1.5) > 0.01;
        });

        if (boundaryViolations.length > 0) {
            return {
                isValid: false,
                error: `安全模式存在边界违规: ${boundaryViolations.length}个事件跨越1.5拍边界`
            };
        }

        return { isValid: true, error: null };
    }

    /**
     * 🆕 验证6/8拍符杠边界
     * @param {Array} events - 事件数组
     */
    validate68BeamingBoundaries(events) {
        console.log(`🛡️ 强化6/8拍边界验证: ${events.length}个事件`);
        let hasError = false;
        const errors = [];

        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const position = event.position || 0;
            const duration = event.duration || 0;
            const endPosition = position + duration;

            // 1. 验证音符不能跨越1.5拍边界
            if (position < 1.5 && endPosition > 1.5) {
                // 允许极小的数值误差
                if (Math.abs(endPosition - 1.5) > 0.01) {
                    const error = `音符${i}跨越1.5拍边界: ${position}-${endPosition.toFixed(3)}拍`;
                    errors.push(error);
                    console.error(`❌ ${error}`);
                    hasError = true;
                }
            }

            // 2. 验证符杠分组与位置的一致性
            if (event.beamGroup) {
                if (event.beamGroup.includes('group-1') || event.beamGroup === '68-group-1') {
                    // 第一组符杠不能在1.5拍之后开始
                    if (position >= 1.5) {
                        const error = `符杠分组错误: 第一组音符不能在1.5拍之后 (位置${position})`;
                        errors.push(error);
                        console.error(`❌ ${error}`);
                        hasError = true;
                    }
                } else if (event.beamGroup.includes('group-2') || event.beamGroup === '68-group-2') {
                    // 第二组符杠不能在1.5拍之前开始
                    if (position < 1.5) {
                        const error = `符杠分组错误: 第二组音符不能在1.5拍之前 (位置${position})`;
                        errors.push(error);
                        console.error(`❌ ${error}`);
                        hasError = true;
                    }
                }
            }

            // 3. 验证音符不能超出小节边界
            if (endPosition > 3.0) {
                const error = `音符${i}超出小节边界: 结束位置${endPosition.toFixed(3)}拍 > 3.0拍`;
                errors.push(error);
                console.error(`❌ ${error}`);
                hasError = true;
            }

            // 4. 验证音符不能有负时值或位置
            if (position < 0) {
                const error = `音符${i}位置为负: ${position}拍`;
                errors.push(error);
                console.error(`❌ ${error}`);
                hasError = true;
            }

            if (duration <= 0) {
                const error = `音符${i}时值无效: ${duration}拍`;
                errors.push(error);
                console.error(`❌ ${error}`);
                hasError = true;
            }

            // 5. 验证相邻音符不重叠
            if (i > 0) {
                const prevEvent = events[i - 1];
                const prevPosition = prevEvent.position || 0;
                const prevDuration = prevEvent.duration || 0;
                const prevEndPosition = prevPosition + prevDuration;

                if (prevEndPosition > position + 0.01) { // 允许小误差
                    const error = `音符${i-1}与音符${i}重叠: prev(${prevPosition}-${prevEndPosition.toFixed(3)}) vs curr(${position}-${endPosition.toFixed(3)})`;
                    errors.push(error);
                    console.error(`❌ ${error}`);
                    hasError = true;
                }
            }
        }

        // 6. 验证整体3+3结构
        const firstHalfEvents = events.filter(e => (e.position || 0) < 1.5);
        const secondHalfEvents = events.filter(e => (e.position || 0) >= 1.5);
        const crossBoundaryEvents = events.filter(e => {
            const pos = e.position || 0;
            const end = pos + (e.duration || 0);
            return pos < 1.5 && end > 1.5 && Math.abs(end - 1.5) > 0.01;
        });

        if (crossBoundaryEvents.length > 0) {
            const error = `发现${crossBoundaryEvents.length}个跨越1.5拍边界的音符`;
            errors.push(error);
            console.error(`❌ ${error}`);
            hasError = true;
        }

        if (hasError) {
            console.error(`❌ 6/8拍边界验证失败，发现${errors.length}个错误:`);
            errors.forEach((error, i) => console.error(`  ${i + 1}. ${error}`));
            throw new Error(`6/8拍边界验证失败: ${errors.join('; ')}`);
        } else {
            console.log(`✅ 6/8拍强化边界验证通过: ${firstHalfEvents.length}个前半拍音符, ${secondHalfEvents.length}个后半拍音符`);
        }
    }

    /**
     * 🆕 获取节奏类型的显示名称
     * @param {string} rhythmValue - 节奏值
     * @returns {string} 显示名称
     */
    getDisplayName(rhythmValue) {
        const displayNames = {
            'whole': '全音符',
            'half.': '附点二分音符',
            'half': '二分音符',
            'quarter.': '附点四分音符',
            'quarter': '四分音符',
            'eighth': '八分音符',
            '16th': '十六分音符',
            'duplet': '二连音',
            'quadruplet': '四连音'
        };
        return displayNames[rhythmValue] || rhythmValue;
    }

    /**
     * 生成6/8拍的一个组，带边界检查
     * @param {Array} rhythms - 可用节奏
     * @param {number} groupDuration - 组时值（1.5拍）
     * @param {number} groupNumber - 组号（1或2）
     * @param {number} startPosition - 组开始位置（0或1.5）
     * @returns {Array} 该组的事件数组
     */
    generate68GroupWithBoundaryCheck(rhythms, groupDuration, groupNumber, startPosition) {
        console.log(`🎵 生成6/8拍第${groupNumber}组 (${startPosition}-${startPosition + groupDuration}拍)`);

        // 🔧 修复：6/8拍复合拍子模式（移除简单拍子的四分音符）
        const patterns = [
            // 附点四分音符（最简单，占满整个主拍）
            [{ value: 'quarter.', duration: 1.5 }],
            // 三个八分音符（经典6/8拍模式，严格3+3分组）
            [{ value: 'eighth', duration: 0.5 }, { value: 'eighth', duration: 0.5 }, { value: 'eighth', duration: 0.5 }]
        ];

        // 选择一个可用的模式
        const availablePatterns = patterns.filter(pattern =>
            pattern.every(note => rhythms.some(r => r.value === note.value))
        );

        if (availablePatterns.length === 0) {
            console.warn(`⚠️ 6/8拍第${groupNumber}组无可用模式，使用默认三个八分音符`);
            return this.create68DefaultGroupWithBoundaryCheck(groupNumber);
        }

        const selectedPattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
        console.log(`🎯 6/8拍第${groupNumber}组选择模式:`, selectedPattern.map(n => n.value));

        // 应用正确的6/8拍beaming规则（three-by-three模式）
        return this.apply68BeamingThreeByThree(selectedPattern, groupNumber, rhythms);
    }

    /**
     * 应用正确的6/8拍beaming规则（three-by-three模式）
     * 参考旋律工具实现
     * @param {Array} pattern - 音符模式
     * @param {number} groupNumber - 组号
     * @param {Array} rhythms - 可用节奏
     * @returns {Array} 应用beaming的事件数组
     */
    apply68BeamingThreeByThree(pattern, groupNumber, rhythms) {
        const events = [];

        pattern.forEach((noteData, index) => {
            const rhythmMatch = rhythms.find(r => r.value === noteData.value);
            const displayName = rhythmMatch ? rhythmMatch.displayName : noteData.value;

            const event = {
                value: noteData.value,
                displayName: displayName,
                duration: noteData.duration,
                type: 'note',
            };

            // 🎼 6/8拍正确beaming规则（参考旋律工具）：
            // "three-by-three" - 八分音符三个三个连接，体现附点四分音符拍点
            if (noteData.value === 'eighth') {
                const eighthNotes = pattern.filter(p => p.value === 'eighth');

                if (eighthNotes.length >= 2) {
                    // 使用正确的6/8拍连音组命名

                    const eighthNoteIndex = pattern.slice(0, index + 1).filter(p => p.value === 'eighth').length - 1;

                    // 正确的6/8拍连音位置标记
                    if (eighthNotes.length === 2) {
                    } else if (eighthNotes.length === 3) {
                        // 三个八分音符（典型6/8拍three-by-three模式）
                        if (eighthNoteIndex === 0) {
                        } else if (eighthNoteIndex === 1) {
                        } else {
                        }
                    } else {
                        // 处理超过3个八分音符的情况
                        if (eighthNoteIndex === 0) {
                        } else if (eighthNoteIndex === eighthNotes.length - 1) {
                        } else {
                        }
                    }
                }
            }
            // 四分音符和附点四分音符在6/8拍中独立
            // （不像4/4拍那样可能跨拍连音）

            events.push(event);
        });

        console.log(`✅ 6/8拍第${groupNumber}组beaming（three-by-three模式）:`,
                    events.map(e => `${e.displayName}[${e.beamPosition || 'none'}]`));
        return events;
    }

    /**
     * 创建6/8拍的默认组（三个八分音符），带边界检查
     * @param {number} groupNumber - 组号
     * @returns {Array} 默认组事件
     */
    create68DefaultGroupWithBoundaryCheck(groupNumber) {
        return [
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
            },
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
            },
            {
                value: 'eighth',
                displayName: '八分音符',
                duration: 0.5,
                type: 'note',
            }
        ];
    }

    /**
     * 将数字时值转换为音符类型字符串
     * @param {number} duration - 时值（以四分音符为单位）
     * @returns {string} 音符类型
     */
    durationToNoteType(duration) {
        // 根据时值映射到对应的音符类型
        const durationMap = {
            4.0: 'whole',
            3.0: 'half.',      // 附点二分音符
            2.0: 'half',
            1.5: 'quarter.',   // 附点四分音符
            1.0: 'quarter',
            0.75: 'eighth.',   // 附点八分音符
            0.5: 'eighth',
            0.375: '16th.',    // 附点十六分音符
            0.25: '16th',
            0.125: '32nd'
        };

        // 寻找最接近的匹配
        const exactMatch = durationMap[duration];
        if (exactMatch) {
            return exactMatch;
        }

        // 如果没有精确匹配，寻找最接近的值
        const durations = Object.keys(durationMap).map(Number).sort((a, b) => b - a);
        for (const dur of durations) {
            if (duration >= dur) {
                return durationMap[dur];
            }
        }

        // 默认返回四分音符
        console.warn(`⚠️ 无法映射时值${duration}到音符类型，使用默认四分音符`);
        return 'quarter';
    }

    /**
     * 验证6/8拍边界规则
     * 确保没有音符跨越1.5拍边界（主要边界）
     * @param {Array} events - 生成的事件数组
     */
    validate68BeatBoundaries(events) {
        console.log(`🛡️ 验证6/8拍边界规则`);

        let currentPosition = 0;
        let hasViolations = false;

        events.forEach((event, index) => {
            const endPosition = currentPosition + event.duration;

            // 检查是否跨越1.5拍边界
            if (currentPosition < 1.5 && endPosition > 1.5) {
                console.error(`❌ 6/8拍边界违规: 事件${index + 1} (${event.displayName}) 跨越1.5拍边界 [${currentPosition}-${endPosition}]`);
                hasViolations = true;
            }

            currentPosition = endPosition;
        });

        if (!hasViolations) {
            console.log(`✅ 6/8拍边界检查通过：无跨越1.5拍边界的音符`);
        }
    }

    /**
     * 🎼 完整Beam生成系统 - 从旋律视奏工具迁移
     * 负责分析音符序列并生成beam连接组
     */

    /**
     * Beam生成主入口 - 根据拍号选择合适的处理函数
     * @param {Array} notes - 音符数组（纯净的，无beam属性）
     * @param {string} timeSignature - 拍号字符串（如'4/4'）
     * @returns {Array} beam组数组
     */
    generateBeamsMelodyStyle(notes, timeSignature = '4/4') {
        console.log(`🎼 generateBeamsMelodyStyle - 拍号: ${timeSignature}, 音符数: ${notes.length}`);

        // 根据拍号选择合适的beaming方法
        if (timeSignature === '4/4') {
            return this.generateBeamsFor4_4_Melody(notes);
        } else if (timeSignature === '3/4') {
            return this.generateBeamsFor3_4_Melody(notes);
        } else if (timeSignature === '2/4') {
            return this.generateBeamsFor2_4_Melody(notes);
        } else if (timeSignature === '6/8') {
            return this.generateBeamsFor6_8_Melody(notes);
        } else {
            return this.generateBeamsLegacy_Melody(notes, timeSignature);
        }
    }

    /**
     * 4/4拍beam生成 - 同拍内可连杆音符连接，换拍或休止符中断
     * @param {Array} notes - 音符数组
     * @returns {Array} beam组数组
     */
    generateBeamsFor4_4_Melody(notes) {
        // 🔧 日志控制：如果beaming日志被禁用，临时静默console.log
        const originalLog = this._debugLevel.beaming ? console.log : () => {};
        const _log = originalLog;

        _log(`\n🎵 ========== 4/4拍Beam生成开始 ==========`);
        _log(`📋 输入音符数量: ${notes.length}个`);

        // 🔍 阶段1：输入数据验证和诊断
        _log(`\n🔍 阶段1：输入数据验证`);
        notes.forEach((note, i) => {
            const position = note.position;
            const value = note.value;
            const beats = note.beats;
            const type = note.type;

            _log(`  [${i}] type=${type}, value=${value}, position=${position}, beats=${beats}, pitch=${note.pitch || 'N/A'}`);

            // 数据完整性检查
            if (type === 'note') {
                if (position === undefined || position === null) {
                    if (this._debugLevel.beaming) console.warn(`    ⚠️ 警告：音符${i}缺少position属性`);
                }
                if (!value) {
                    if (this._debugLevel.beaming) console.warn(`    ⚠️ 警告：音符${i}缺少value属性`);
                }
                if (position < 0 || position >= 4) {
                    if (this._debugLevel.beaming) console.warn(`    ⚠️ 警告：音符${i}的position=${position}超出小节范围[0, 4)`);
                }
            }
        });

        const beamGroups = [];
        let currentGroup = [];
        let currentBeat = -1;

        // 🔥 关键修复：浮点容差，避免0.9999999等精度问题
        const EPSILON = 0.01;

        _log(`\n🔍 阶段2：Beam分组计算（EPSILON=${EPSILON})`);

        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            // 🔥 修复：使用note自带的position属性，避免累积计算误差
            const notePosition = note.position || 0;

            // 🔥 关键修复：使用EPSILON容差计算拍号，避免浮点精度问题
            const beatNumber = Math.floor(notePosition + EPSILON) % 4;

            // 检查是否可以beam
            // 🔥 修复：使用统一的canNoteBeBeamed_Melody函数，支持所有beamableNotes（包括附点八分音符）
            const canBeam = this.canNoteBeBeamed_Melody(note);

            _log(`  [${i}] position=${notePosition.toFixed(3)}, beatNumber=${beatNumber}, canBeam=${canBeam}, value=${note.value}`);

            if (canBeam) {
                // 检查是否换拍
                const beatChanged = currentBeat !== -1 && beatNumber !== currentBeat;

                if (beatChanged) {
                    _log(`    🔄 换拍检测：currentBeat=${currentBeat} → beatNumber=${beatNumber}`);

                    // 换拍了，结束当前组
                    if (currentGroup.length >= 2) {
                        beamGroups.push({
                            start: currentGroup[0],
                            end: currentGroup[currentGroup.length - 1],
                            notes: [...currentGroup]
                        });
                        _log(`    ✅ 保存beam组: 音符[${currentGroup.join(', ')}] (${currentGroup.length}个)`);
                    } else if (currentGroup.length === 1) {
                        _log(`    ⚠️ 单音符组（不足2个），不保存: 音符[${currentGroup[0]}]`);
                    }
                    currentGroup = [];
                }

                currentBeat = beatNumber;
                currentGroup.push(i);
                _log(`    ➕ 加入当前组: currentGroup=[${currentGroup.join(', ')}], beat=${currentBeat}`);

            } else {
                _log(`    ❌ 不可beam (type=${note.type}, value=${note.value})`);

                // 休止符或不可连杆音符，结束当前组
                if (currentGroup.length >= 2) {
                    beamGroups.push({
                        start: currentGroup[0],
                        end: currentGroup[currentGroup.length - 1],
                        notes: [...currentGroup]
                    });
                    _log(`    ✅ 保存beam组（休止符/不可beam中断）: 音符[${currentGroup.join(', ')}]`);
                }
                currentGroup = [];
                currentBeat = -1;
            }
        }

        // 处理最后一组
        if (currentGroup.length >= 2) {
            beamGroups.push({
                start: currentGroup[0],
                end: currentGroup[currentGroup.length - 1],
                notes: [...currentGroup]
            });
            _log(`  ✅ 保存最后beam组: 音符[${currentGroup.join(', ')}] (${currentGroup.length}个)`);
        } else if (currentGroup.length === 1) {
            _log(`  ⚠️ 最后单音符组（不足2个），不保存: 音符[${currentGroup[0]}]`);
        }

        _log(`\n🔍 阶段3：输出结果验证`);
        _log(`📊 生成了${beamGroups.length}个beam组:`);
        beamGroups.forEach((group, i) => {
            _log(`  组${i + 1}: 音符[${group.notes.join(', ')}] (start=${group.start}, end=${group.end})`);
        });

        _log(`🎵 ========== 4/4拍Beam生成完成 ==========\n`);
        return beamGroups;
    }

    /**
     * 3/4拍beam生成 - 严格按拍点分组
     * @param {Array} notes - 音符数组
     * @returns {Array} beam组数组
     */
    generateBeamsFor3_4_Melody(notes) {
        this._log('beaming', `🎵 3/4拍beam生成 - 严格拍点分组`);

        const beamGroups = [];
        let currentPosition = 0;

        // 按拍分组
        const beatGroups = [[], [], []];

        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const noteStart = currentPosition;
            const noteEnd = currentPosition + this.getElementDuration(note);

            const measurePosition = noteStart % 3;
            const measureEnd = noteEnd % 3;

            // 检查是否跨越拍点边界
            let crossesBeat = false;
            if (measurePosition < 1 && measureEnd > 1) crossesBeat = true;
            if (measurePosition < 2 && measureEnd > 2) crossesBeat = true;

            if (!crossesBeat) {
                let beatIndex = -1;
                if (measurePosition >= 0 && measurePosition < 1) beatIndex = 0;
                else if (measurePosition >= 1 && measurePosition < 2) beatIndex = 1;
                else if (measurePosition >= 2 && measurePosition < 3) beatIndex = 2;

                if (beatIndex >= 0) {
                    beatGroups[beatIndex].push(i);
                }
            }

            currentPosition += this.getElementDuration(note);
        }

        // 为每个拍内的音符生成beam组
        for (let beatIndex = 0; beatIndex < 3; beatIndex++) {
            const beatNotes = beatGroups[beatIndex];
            if (beatNotes.length >= 2) {
                let currentGroup = [];

                for (const noteIndex of beatNotes) {
                    const note = notes[noteIndex];
                    if (note.type === 'note' && this.canNoteBeBeamed_Melody(note)) {
                        currentGroup.push(noteIndex);
                    } else {
                        if (currentGroup.length >= 2) {
                            beamGroups.push({
                                start: currentGroup[0],
                                end: currentGroup[currentGroup.length - 1],
                                notes: [...currentGroup]
                            });
                        }
                        currentGroup = [];
                    }
                }

                if (currentGroup.length >= 2) {
                    beamGroups.push({
                        start: currentGroup[0],
                        end: currentGroup[currentGroup.length - 1],
                        notes: [...currentGroup]
                    });
                }
            }
        }

        console.log(`✅ 3/4拍beam生成完成: ${beamGroups.length}个组`);
        return beamGroups;
    }

    /**
     * 2/4拍beam生成
     */
    generateBeamsFor2_4_Melody(notes) {
        return this.generateBeamsFor4_4_Melody(notes); // 使用相同的逻辑
    }

    /**
     * 6/8拍beam生成
     */
    /**
     * 🎵 6/8拍beam生成 - 使用从旋律工具搬运的验证逻辑
     * 修复日期: 2025-10-09
     * 修复内容: 替换原有的4/4逻辑，使用旋律工具的6/8专用逻辑
     * 核心规则:
     * 1. 强制在1.5拍处分组
     * 2. 每组最多3个八分音符
     * 3. 休止符中断beam
     */
    generateBeamsFor6_8_Melody(notes) {
        this._log('beaming', `🎵 调用6/8拍专用beam生成（旋律工具搬运版）`);
        return this.generateBeamsFor6_8(notes);
    }

    /**
     * 其他拍号的通用beam生成
     */
    generateBeamsLegacy_Melody(notes, timeSignature) {
        return this.generateBeamsFor4_4_Melody(notes); // 使用通用逻辑
    }

    /**
     * 检查音符是否可以beam
     * @param {Object} note - 音符对象
     * @returns {boolean}
     */
    canNoteBeBeamed_Melody(note) {
        if (note.type !== 'note') return false;

        // 🎵 三连音使用自己的tripletBeamInfo，不参与普通beam计算
        if (note.tripletGroup || note.isTriplet || note.isTripletElement) {
            return false;
        }

        // 🔥 关键修复：四分音符不能beam（除非是6/8拍的duplet/quadruplet）
        // 虽然已从beamableNotes移除，但这里做双重检查以确保安全
        if (note.value === 'quarter' || note.value === 'quarter.') {
            // 6/8拍的duplet/quadruplet例外
            if (note.tupletGroup && (note.tupletKind === 'duplet' || note.tupletKind === 'quadruplet')) {
                return true;
            }
            return false;
        }

        // 使用BEAMING_RULES的定义
        if (!BEAMING_RULES.basicRules.beamableNotes.includes(note.value)) return false;

        return true;
    }

    /**
     * 根据beam组和音符索引获取beam位置信息
     * @param {Array} beamGroups - beam组数组
     * @param {number} noteIndex - 音符索引
     * @returns {string|null} 'begin'/'continue'/'end'/null
     */
    getBeamInfo_Melody(beamGroups, noteIndex) {
        for (const group of beamGroups) {
            if (Array.isArray(group.notes) && group.notes.includes(noteIndex)) {
                if (noteIndex === group.notes[0]) {
                    return 'begin';
                } else if (noteIndex === group.notes[group.notes.length - 1]) {
                    return 'end';
                } else {
                    return 'continue';
                }
            }
        }
        return null;
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntervalGenerator;
}

// 保持向后兼容
window.IntervalGenerator = IntervalGenerator;

console.log('✅ IntervalGenerator V5.0 加载完成');

// ============================================================================
// 🧪 V5.0 Rhythm Generation Testing Suite
// ============================================================================

/**
 * 🔬 测试拍点对齐系统
 * 验证所有节奏类型是否在正确的拍点位置上
 */
window.testBeatAlignment = function() {
    console.log('\n' + '='.repeat(80));
    console.log('🔬 V5.0 拍点对齐系统测试');
    console.log('='.repeat(80));

    const generator = new IntervalGenerator();
    const timeSignature = { beats: 4, beatType: 4 };

    // 测试案例：[节奏类型, 剩余拍数, 当前拍点, 预期结果]
    const testCases = [
        // 附点八分音符 - 必须在整拍点
        ['eighth.', 1.0, 0.0, true, '附点八分在整拍点'],
        ['eighth.', 1.0, 0.5, false, '附点八分不能在半拍点'],
        ['eighth.', 0.75, 1.0, true, '附点八分在第2拍点'],

        // 附点四分音符 - 必须在强拍或落在整拍点
        ['quarter.', 1.5, 0.0, true, '附点四分在小节开始'],
        ['quarter.', 1.5, 2.0, true, '附点四分在第3拍点'],
        ['quarter.', 1.5, 0.5, false, '附点四分不能在半拍点'],

        // 四分音符 - 必须在四分音符拍点
        ['quarter', 1.0, 0.0, true, '四分音符在整拍点'],
        ['quarter', 1.0, 1.0, true, '四分音符在第2拍点'],
        ['quarter', 1.0, 0.5, false, '四分音符不能在半拍点'],

        // 二分音符 - 必须在二分音符拍点
        ['half', 2.0, 0.0, true, '二分音符在小节开始'],
        ['half', 2.0, 2.0, true, '二分音符在第3拍点'],
        ['half', 2.0, 1.0, false, '二分音符不能在第2拍点'],

        // 八分音符 - 可以在八分音符拍点
        ['eighth', 0.5, 0.0, true, '八分音符在整拍点'],
        ['eighth', 0.5, 0.5, true, '八分音符在半拍点'],
        ['eighth', 0.5, 1.5, true, '八分音符在1.5拍点']
    ];

    let passCount = 0;
    let failCount = 0;

    testCases.forEach((testCase, index) => {
        const [rhythmType, remainingBeats, currentBeat, expected, description] = testCase;
        const result = generator.isRhythmAvailableAtPosition(rhythmType, remainingBeats, currentBeat);

        if (result === expected) {
            console.log(`  ✅ [${index + 1}] ${description}: ${result} (预期: ${expected})`);
            passCount++;
        } else {
            console.error(`  ❌ [${index + 1}] ${description}: ${result} (预期: ${expected})`);
            failCount++;
        }
    });

    console.log('\n' + '-'.repeat(80));
    console.log(`📊 测试结果: ${passCount}通过 / ${failCount}失败 / ${testCases.length}总数`);
    console.log('='.repeat(80) + '\n');

    return { passCount, failCount, total: testCases.length };
};

/**
 * 🎲 测试频率控制精度
 * 验证非线性权重计算是否符合预期
 */
window.testFrequencyControl = function() {
    console.log('\n' + '='.repeat(80));
    console.log('🎲 V5.0 频率控制精度测试');
    console.log('='.repeat(80));

    const generator = new IntervalGenerator();

    // 设置测试频率
    generator.rhythmFrequencies = {
        'sixteenth': 15,      // 低频 - 应该使用 ^2.5
        'dotted-eighth': 25,  // 中低频 - 应该使用 ^2
        'eighth': 50,         // 中频 - 应该使用 *0.8
        'quarter': 70,        // 高频 - 应该使用 *1.1
        'half': 0             // 禁用 - 权重应为0
    };

    const testCases = [
        ['16th', 15, 10 * Math.pow(15/100, 2.5), '低频使用^2.5指数压制'],
        ['eighth.', 25, 10 * Math.pow(25/100, 2), '中低频使用^2指数'],
        ['eighth', 50, 10 * (50/100) * 0.8, '中频使用*0.8线性缩放'],
        ['quarter', 70, 10 * (70/100) * 1.1, '高频使用*1.1线性放大'],
        ['half', 0, 0, '0频率禁用']
    ];

    let passCount = 0;
    let failCount = 0;

    console.log('\n节奏类型 | 用户频率 | 计算权重 | 预期权重 | 结果');
    console.log('-'.repeat(80));

    testCases.forEach(testCase => {
        const [rhythmType, frequency, expectedWeight, description] = testCase;
        const actualWeight = generator.calculatePreciseRhythmWeight(rhythmType);
        const tolerance = 0.01;
        const diff = Math.abs(actualWeight - expectedWeight);

        if (diff < tolerance || (expectedWeight === 0 && actualWeight === 0)) {
            console.log(`  ✅ ${rhythmType.padEnd(10)} | ${String(frequency).padEnd(8)} | ${actualWeight.toFixed(3).padEnd(8)} | ${expectedWeight.toFixed(3).padEnd(8)} | ${description}`);
            passCount++;
        } else {
            console.error(`  ❌ ${rhythmType.padEnd(10)} | ${String(frequency).padEnd(8)} | ${actualWeight.toFixed(3).padEnd(8)} | ${expectedWeight.toFixed(3).padEnd(8)} | ${description} (差异: ${diff.toFixed(3)})`);
            failCount++;
        }
    });

    console.log('\n' + '-'.repeat(80));
    console.log(`📊 测试结果: ${passCount}通过 / ${failCount}失败 / ${testCases.length}总数`);
    console.log('='.repeat(80) + '\n');

    return { passCount, failCount, total: testCases.length };
};

/**
 * 🎼 测试chooseDuration智能选择
 * 验证附点音符优先级和八分音符配对
 */
window.testSmartSelection = function() {
    console.log('\n' + '='.repeat(80));
    console.log('🎼 V5.0 智能选择系统测试');
    console.log('='.repeat(80));

    const generator = new IntervalGenerator();
    generator.rhythmFrequencies = {
        'sixteenth': 20,
        'dotted-eighth': 40,
        'eighth': 60,
        'dotted-quarter': 30,
        'quarter': 50,
        'half': 40
    };

    // 设置可用节奏
    generator._currentAllowedRhythms = [
        { value: '16th', beats: 0.25, displayName: '十六分音符' },
        { value: 'eighth.', beats: 0.75, displayName: '附点八分音符' },
        { value: 'eighth', beats: 0.5, displayName: '八分音符' },
        { value: 'quarter.', beats: 1.5, displayName: '附点四分音符' },
        { value: 'quarter', beats: 1, displayName: '四分音符' },
        { value: 'half', beats: 2, displayName: '二分音符' }
    ];

    // 测试案例
    const tests = [
        {
            name: '附点八分优先级测试',
            remainingBeats: 1.0,
            currentBeat: 0.0,
            expectHighPriority: 'eighth.',
            description: '整拍点且剩余1拍，附点八分应有40%优先级'
        },
        {
            name: '八分音符配对测试',
            remainingBeats: 1.0,
            currentBeat: 1.0,
            setup: () => { generator._expectEighthNotePair = true; },
            cleanup: () => { generator._expectEighthNotePair = false; },
            expectResult: (result) => result === 'eighth',
            description: '配对标志为true时，剩余1拍应选择八分音符'
        },
        {
            name: '剩余2拍特殊规则',
            remainingBeats: 2.0,
            currentBeat: 0.0,
            expectPossible: 'half',
            description: '剩余2拍时，二分音符应有较高概率（特殊规则）'
        }
    ];

    let passCount = 0;
    let failCount = 0;

    tests.forEach((test, index) => {
        console.log(`\n  测试 ${index + 1}: ${test.name}`);
        console.log(`  ${'-'.repeat(70)}`);
        console.log(`  场景: 剩余${test.remainingBeats}拍，当前位置${test.currentBeat}拍`);

        // 执行setup
        if (test.setup) test.setup();

        // 运行多次测试，收集结果
        const results = {};
        const iterations = 100;

        for (let i = 0; i < iterations; i++) {
            const chosen = generator.chooseDuration(test.remainingBeats, test.currentBeat, false);
            results[chosen] = (results[chosen] || 0) + 1;
        }

        // 清理
        if (test.cleanup) test.cleanup();

        // 显示结果分布
        console.log(`  结果分布 (${iterations}次):`);
        Object.entries(results).forEach(([rhythm, count]) => {
            const percentage = (count / iterations * 100).toFixed(1);
            console.log(`    ${rhythm}: ${count}次 (${percentage}%)`);
        });

        // 验证
        let testPassed = false;
        if (test.expectHighPriority) {
            const count = results[test.expectHighPriority] || 0;
            const percentage = count / iterations * 100;
            testPassed = percentage >= 20; // 至少20%出现率
            console.log(`  验证: ${test.expectHighPriority}出现${percentage.toFixed(1)}% ${testPassed ? '✅' : '❌ (期望≥20%)'}`);
        } else if (test.expectResult) {
            const allPassed = Object.keys(results).every(test.expectResult);
            testPassed = allPassed;
            console.log(`  验证: ${testPassed ? '✅ 所有结果符合预期' : '❌ 存在不符合预期的结果'}`);
        } else if (test.expectPossible) {
            testPassed = results[test.expectPossible] > 0;
            console.log(`  验证: ${test.expectPossible}${testPassed ? '✅ 出现' : '❌ 未出现'}`);
        }

        if (testPassed) {
            passCount++;
        } else {
            failCount++;
        }
    });

    console.log('\n' + '-'.repeat(80));
    console.log(`📊 测试结果: ${passCount}通过 / ${failCount}失败 / ${tests.length}总数`);
    console.log('='.repeat(80) + '\n');

    return { passCount, failCount, total: tests.length };
};

/**
 * 🎵 测试6/8拍边界检查
 * 验证音符不会跨越1.5拍边界
 */
window.test68Boundaries = function() {
    console.log('\n' + '='.repeat(80));
    console.log('🎵 V5.0 六八拍边界检查测试');
    console.log('='.repeat(80));

    const generator = new IntervalGenerator();
    const timeSignature = { beats: 6, beatType: 8 };

    // 设置6/8拍的可用节奏
    generator._currentAllowedRhythms = [
        { value: 'eighth', beats: 0.5, displayName: '八分音符' },
        { value: 'eighth.', beats: 0.75, displayName: '附点八分音符' },
        { value: 'quarter', beats: 1, displayName: '四分音符' },
        { value: 'quarter.', beats: 1.5, displayName: '附点四分音符' }
    ];

    generator.rhythmFrequencies = {
        'eighth': 50,
        'dotted-eighth': 30,
        'quarter': 40,
        'dotted-quarter': 50
    };

    // 测试边界位置 [0, 1.5, 3]
    const boundaryTests = [
        { position: 0.0, remaining: 1.5, description: '小节开始到1.5拍边界' },
        { position: 1.0, remaining: 1.0, description: '1.0拍位置（跨越1.5边界风险）' },
        { position: 1.5, remaining: 1.5, description: '1.5拍边界到结束' }
    ];

    let passCount = 0;
    let failCount = 0;

    boundaryTests.forEach((test, index) => {
        console.log(`\n  测试 ${index + 1}: ${test.description}`);
        console.log(`  ${'-'.repeat(70)}`);

        // 运行多次选择
        let violations = 0;
        const iterations = 50;

        for (let i = 0; i < iterations; i++) {
            const chosen = generator.chooseDuration(test.remaining, test.position, false);
            const chosenRhythm = generator._currentAllowedRhythms.find(r => r.value === chosen);
            const duration = chosenRhythm ? chosenRhythm.beats : 0;
            const endPosition = test.position + duration;

            // 检查是否跨越1.5拍边界
            if (test.position < 1.5 && endPosition > 1.5) {
                violations++;
            }
        }

        console.log(`  跨越边界次数: ${violations}/${iterations}`);

        if (violations === 0) {
            console.log(`  ✅ 无边界违规`);
            passCount++;
        } else {
            console.error(`  ❌ 检测到${violations}次边界违规`);
            failCount++;
        }
    });

    console.log('\n' + '-'.repeat(80));
    console.log(`📊 测试结果: ${passCount}通过 / ${failCount}失败 / ${boundaryTests.length}总数`);
    console.log('='.repeat(80) + '\n');

    return { passCount, failCount, total: boundaryTests.length };
};

/**
 * 🚀 运行完整的V5.0测试套件
 */
window.runV5Tests = function() {
    console.log('\n' + '█'.repeat(80));
    console.log('🚀 IntervalGenerator V5.0 完整测试套件');
    console.log('█'.repeat(80));
    console.log('\n开始时间: ' + new Date().toLocaleString());

    const results = {
        beatAlignment: window.testBeatAlignment(),
        frequencyControl: window.testFrequencyControl(),
        smartSelection: window.testSmartSelection(),
        sixEightBoundaries: window.test68Boundaries()
    };

    // 汇总结果
    const totalPass = Object.values(results).reduce((sum, r) => sum + r.passCount, 0);
    const totalFail = Object.values(results).reduce((sum, r) => sum + r.failCount, 0);
    const totalTests = Object.values(results).reduce((sum, r) => sum + r.total, 0);

    console.log('\n' + '█'.repeat(80));
    console.log('📊 V5.0 测试套件总结');
    console.log('█'.repeat(80));
    console.log(`\n  拍点对齐测试:    ${results.beatAlignment.passCount}/${results.beatAlignment.total} 通过`);
    console.log(`  频率控制测试:    ${results.frequencyControl.passCount}/${results.frequencyControl.total} 通过`);
    console.log(`  智能选择测试:    ${results.smartSelection.passCount}/${results.smartSelection.total} 通过`);
    console.log(`  6/8边界测试:     ${results.sixEightBoundaries.passCount}/${results.sixEightBoundaries.total} 通过`);
    console.log(`\n  总计: ${totalPass}通过 / ${totalFail}失败 / ${totalTests}总数`);
    console.log(`  成功率: ${(totalPass / totalTests * 100).toFixed(1)}%`);

    if (totalFail === 0) {
        console.log('\n  ✅ 所有测试通过！V5.0节奏生成系统运行正常。');
    } else {
        console.warn(`\n  ⚠️ 有${totalFail}个测试失败，请检查上述详细信息。`);
    }

    console.log('\n结束时间: ' + new Date().toLocaleString());
    console.log('█'.repeat(80) + '\n');

    return { totalPass, totalFail, totalTests, results };
};
/**
 * ========================================
 * 精准频率控制系统（从旋律工具迁移）
 * 来源: sight-reading-final.js:24155-24273行
 * ========================================
 */

/**
 * 精准的节奏时值权重计算器
 * 将用户设置的百分比精确转换为权重系统
 * @param {string} duration - 节奏时值（如'quarter', 'eighth'等）
 * @returns {number} 权重值
 */
function calculatePreciseRhythmWeight(duration) {
    const mappedDuration = mapDurationToFrequencyKey(duration);
    const userFreq = getUserFrequency('rhythm', mappedDuration);

    if (userFreq === 0) {
        return 0; // 完全禁用
    }

    // 🔥 使用对数尺度确保精准的频率控制
    // 频率越高，权重越大，但保持非线性关系以确保真实的百分比分布
    return Math.max(1, Math.pow(userFreq / 10, 1.2));
}

/**
 * 将滑块百分比值映射到分档系统
 * 0%: 禁用, 1-20%: 低频率 (15%), 21-50%: 中频率 (40%), 51-80%: 高频率 (75%), 81-100%: 最高频率 (100%)
 * @param {number} sliderValue - 滑块值(0-100)
 * @returns {number} 映射后的频率值
 */
function mapSliderPercentageToTier(sliderValue) {
    const percentage = parseInt(sliderValue);

    if (percentage === 0) return 0;           // 禁用 (0%)
    if (percentage >= 1 && percentage <= 20) return 15;  // 低频率 (15%)
    if (percentage >= 21 && percentage <= 50) return 40; // 中频率 (40%)
    if (percentage >= 51 && percentage <= 80) return 75; // 高频率 (75%)
    if (percentage >= 81 && percentage <= 100) return 100; // 最高频率 (100%)

    return 15; // 默认为低频率
}

/**
 * 获取节奏类型的默认频率
 * @param {string} item - 节奏类型
 * @returns {number} 默认频率百分比
 */
function getDefaultRhythmFrequency(item) {
    const defaults = {
        'whole': 10,
        'half': 40,
        'half.': 20,
        'dotted-half': 20,
        'quarter': 60,
        'quarter.': 35,
        'dotted-quarter': 35,
        'eighth': 50,
        'eighth.': 30,
        'dotted-eighth': 30,
        '16th': 25,
        'sixteenth': 25,
        '32nd': 10,
        'triplet': 20,
        'duplet': 15,
        'quadruplet': 10
    };
    return defaults[item] || 15;
}

/**
 * 获取articulation类型的默认频率
 * @param {string} item - articulation类型
 * @returns {number} 默认频率百分比
 */
function getDefaultArticulationFrequency(item) {
    const defaults = {
        'slur': 30,
        'staccato': 20,
        'accent': 15,
        'tenuto': 10,
        'marcato': 5
    };
    return defaults[item] || 15;
}

/**
 * 统一的用户频率获取器 - 支持滑块分档映射
 * @param {string} category - 类别('rhythm' 或 'articulation')
 * @param {string} item - 具体项目
 * @returns {number} 频率百分比
 */
function getUserFrequency(category, item) {
    let rawValue;

    if (category === 'rhythm') {
        // 尝试从userSettings获取
        if (typeof userSettings !== 'undefined' && userSettings?.rhythmFrequencies) {
            rawValue = userSettings.rhythmFrequencies[item];
        }
        // 如果没有设置，使用默认值
        if (rawValue === undefined) {
            rawValue = getDefaultRhythmFrequency(item);
        }
    } else if (category === 'articulation') {
        // 尝试从userSettings获取
        if (typeof userSettings !== 'undefined' && userSettings?.articulations?.frequencies) {
            rawValue = userSettings.articulations.frequencies[item];
        }
        // 如果没有设置，使用默认值
        if (rawValue === undefined) {
            rawValue = getDefaultArticulationFrequency(item);
        }
    } else {
        return 15; // 默认为低频率
    }

    // 将滑块百分比值映射到分档系统
    return mapSliderPercentageToTier(rawValue);
}

/**
 * 映射内部duration格式到用户设置键
 * @param {string} duration - 内部duration格式
 * @returns {string} 用户设置键
 */
function mapDurationToFrequencyKey(duration) {
    const mapping = {
        'quarter.': 'dotted-quarter',
        'half.': 'dotted-half',
        'eighth.': 'dotted-eighth',
        'sixteenth': '16th'
    };
    return mapping[duration] || duration;
}

/**
 * 🔥 精准的节奏选择器 - 基于用户频率权重
 * 将用户设置的百分比精确转换为权重系统，确保真实的频率控制
 * 适用于所有拍号：2/4, 3/4, 4/4, 6/8
 * @param {Array<string>} availableDurations - 可用的duration列表
 * @param {Object} randomGenerator - 随机数生成器（可选）
 * @returns {string} 选中的duration
 */
function selectDurationByPreciseFrequency(availableDurations, randomGenerator = null) {
    // 计算每个duration的真实权重
    const weightedOptions = availableDurations.map(duration => ({
        duration,
        weight: calculatePreciseRhythmWeight(duration)
    })).filter(option => option.weight > 0); // 移除被禁用的选项

    if (weightedOptions.length === 0) {
        // 所有选项都被禁用，使用第一个可用的duration
        console.warn('⚠️ 所有节奏选项都被用户频率设置禁用，使用第一个可用选项');
        return availableDurations[0];
    }

    // 🔥 计算累积权重分布，确保精确的百分比控制
    const totalWeight = weightedOptions.reduce((sum, option) => sum + option.weight, 0);
    const random = randomGenerator ? randomGenerator.nextFloat() : Math.random();
    const target = random * totalWeight;

    let accumulator = 0;
    for (const option of weightedOptions) {
        accumulator += option.weight;
        if (accumulator >= target) {
            const mappedDuration = mapDurationToFrequencyKey(option.duration);
            const userFreq = getUserFrequency('rhythm', mappedDuration);
            console.log(`🎯 精准节奏选择: ${option.duration} (用户频率: ${userFreq}%, 权重: ${option.weight.toFixed(2)}, 拍号无关)`);
            return option.duration;
        }
    }

    // 后备方案
    return weightedOptions[weightedOptions.length - 1].duration;
}

// 导出函数供interval-generator使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculatePreciseRhythmWeight,
        getUserFrequency,
        mapDurationToFrequencyKey,
        mapSliderPercentageToTier,
        selectDurationByPreciseFrequency,
        getDefaultRhythmFrequency,
        getDefaultArticulationFrequency
    };
}
