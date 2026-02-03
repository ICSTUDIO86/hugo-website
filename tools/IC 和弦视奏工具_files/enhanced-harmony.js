/*!
 * Cognote - 增强功能和声系统
 * Enhanced Functional Harmony System
 *
 * Copyright © 2025. All rights reserved. Igor Chen - icstudio.club
 */

/**
 * 增强功能和声系统
 * 基于经典功能和声理论，提供更深入的和弦功能分析和生成
 */
class EnhancedHarmony {
    constructor(harmonyTheory) {
        this.harmonyTheory = harmonyTheory;

        // 和弦功能定义
        this.chordFunctions = {
            major: {
                'I': { function: 'Tonic', stability: 'stable', tension: 0 },
                'ii': { function: 'Subdominant', stability: 'moderate', tension: 3 },
                'iii': { function: 'Tonic', stability: 'weak', tension: 2 },
                'IV': { function: 'Subdominant', stability: 'stable', tension: 2 },
                'V': { function: 'Dominant', stability: 'unstable', tension: 5 },
                'vi': { function: 'Tonic', stability: 'moderate', tension: 1 },
                'vii°': { function: 'Dominant', stability: 'unstable', tension: 4 }
            },
            minor: {
                'i': { function: 'Tonic', stability: 'stable', tension: 0 },
                'ii°': { function: 'Subdominant', stability: 'weak', tension: 4 },
                'III': { function: 'Tonic', stability: 'moderate', tension: 1 },
                'iv': { function: 'Subdominant', stability: 'stable', tension: 2 },
                'v': { function: 'Dominant', stability: 'moderate', tension: 3 },
                'V': { function: 'Dominant', stability: 'unstable', tension: 5 },
                'VI': { function: 'Subdominant', stability: 'moderate', tension: 2 },
                'VII': { function: 'Subtonic', stability: 'moderate', tension: 3 }
            }
        };

        // 常见进行模式（基于实际音乐文献）
        this.commonProgressions = {
            // 流行音乐进行
            pop: [
                {
                    name: "Vi-IV-I-V (6-4-1-5)",
                    pattern: ['vi', 'IV', 'I', 'V'],
                    description: "最流行的进行，温暖而开放",
                    examples: ["Don't Stop Believin'", "With or Without You"]
                },
                {
                    name: "I-V-vi-IV (1-5-6-4)",
                    pattern: ['I', 'V', 'vi', 'IV'],
                    description: "轴心进行，强烈的情感起伏",
                    examples: ["Let It Be", "Don't Stop Believin'"]
                },
                {
                    name: "vi-IV-I-V (Canon Progression)",
                    pattern: ['vi', 'IV', 'I', 'V'],
                    description: "卡农进行，经典而优美",
                    examples: ["Canon in D", "Basket Case"]
                },
                {
                    name: "I-vi-IV-V (50s Progression)",
                    pattern: ['I', 'vi', 'IV', 'V'],
                    description: "50年代经典，怀旧感强",
                    examples: ["Stand by Me", "Blue Moon"]
                }
            ],

            // 古典音乐进行
            classical: [
                {
                    name: "I-IV-V-I (Plagal Cadence)",
                    pattern: ['I', 'IV', 'V', 'I'],
                    description: "正格终止，庄重有力",
                    examples: ["贝多芬第九交响曲", "巴赫众赞歌"]
                },
                {
                    name: "ii-V-I (Perfect Cadence)",
                    pattern: ['ii', 'V', 'I'],
                    description: "完全终止，最强的解决感",
                    examples: ["莫扎特奏鸣曲", "巴赫赋格"]
                },
                {
                    name: "I-vi-ii-V (Circle of Fifths)",
                    pattern: ['I', 'vi', 'ii', 'V'],
                    description: "五度圈进行，逻辑性强",
                    examples: ["巴赫平均律", "贝多芬奏鸣曲"]
                }
            ],

            // 爵士进行
            jazz: [
                {
                    name: "ii-V-I (Jazz Cadence)",
                    pattern: ['iim7', 'V7', 'Imaj7'],
                    description: "爵士核心进行，无处不在",
                    examples: ["Autumn Leaves", "All of Me"]
                },
                {
                    name: "I-vi-ii-V (Rhythm Changes)",
                    pattern: ['Imaj7', 'vim7', 'iim7', 'V7'],
                    description: "节奏变化，爵士标准",
                    examples: ["I Got Rhythm", "Oleo"]
                },
                {
                    name: "iii-vi-ii-V (Minor ii-V)",
                    pattern: ['iiim7', 'VI7', 'iim7', 'V7'],
                    description: "小调ii-V，丰富色彩",
                    examples: ["Fly Me to the Moon", "Girl from Ipanema"]
                }
            ],

            // 小调进行
            minor: [
                {
                    name: "i-VI-VII-i (Natural Minor)",
                    pattern: ['i', 'VI', 'VII', 'i'],
                    description: "自然小调进行，柔和忧郁",
                    examples: ["House of the Rising Sun", "Stairway to Heaven"]
                },
                {
                    name: "i-iv-V-i (Harmonic Minor)",
                    pattern: ['i', 'iv', 'V', 'i'],
                    description: "和声小调，戏剧性强",
                    examples: ["Bach Inventions", "Classical Pieces"]
                },
                {
                    name: "i-III-VI-VII (Dorian)",
                    pattern: ['i', 'III', 'VI', 'VII'],
                    description: "多利亚调式，现代感",
                    examples: ["Eleanor Rigby", "Scarborough Fair"]
                }
            ],

            // 浪漫主义风格
            romantic: [
                {
                    name: "I-vi-iii-vi (Cycle of Thirds)",
                    pattern: ['I', 'vi', 'iii', 'vi'],
                    description: "三度循环，浪漫而抒情",
                    examples: ["舒伯特歌曲", "肖邦夜曲"]
                },
                {
                    name: "I-III-vi-IV (Chromatic Mediant)",
                    pattern: ['I', 'III', 'vi', 'IV'],
                    description: "色彩中音关系，戏剧性",
                    examples: ["李斯特匈牙利狂想曲", "瓦格纳歌剧"]
                },
                {
                    name: "I-bVII-bVI-bVII (Modal Mixture)",
                    pattern: ['I', 'bVII', 'bVI', 'bVII'],
                    description: "调式混合，忧郁色彩",
                    examples: ["勃拉姆斯间奏曲", "门德尔松无词歌"]
                }
            ],

            // 现代和声
            modern: [
                {
                    name: "I-bII-bIII-IV (Chromatic Descent)",
                    pattern: ['I', 'bII', 'bIII', 'IV'],
                    description: "色彩下行，现代感强",
                    examples: ["德彪西印象派", "拉威尔"]
                },
                {
                    name: "Imaj7-IVmaj7-bVIImaj7-bIIImaj7 (Quartal)",
                    pattern: ['Imaj7', 'IVmaj7', 'bVIImaj7', 'bIIImaj7'],
                    description: "四度叠置，现代爵士",
                    examples: ["比尔·艾文斯", "现代爵士钢琴"]
                },
                {
                    name: "Im-bVImaj7-bVmaj7-IVm (Neo-Soul)",
                    pattern: ['Im', 'bVImaj7', 'bVmaj7', 'IVm'],
                    description: "新灵魂乐，丰富色彩",
                    examples: ["D'Angelo", "Erykah Badu"]
                }
            ],

            // 巴洛克风格
            baroque: [
                {
                    name: "I-V-vi-iii-IV-I-V-I (Circle of Fifths)",
                    pattern: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'V', 'I'],
                    description: "五度循环，巴洛克序列",
                    examples: ["巴赫平均律", "韦瓦尔第四季"]
                },
                {
                    name: "I-IV-vii°-iii-vi-ii-V-I (Descending Sequence)",
                    pattern: ['I', 'IV', 'vii°', 'iii', 'vi', 'ii', 'V', 'I'],
                    description: "下行序列进行",
                    examples: ["巴赫创意曲", "亨德尔组曲"]
                },
                {
                    name: "I-ii6-V7-I (Baroque Cadence)",
                    pattern: ['I', 'ii6', 'V7', 'I'],
                    description: "巴洛克终止式，优雅",
                    examples: ["巴赫赋格", "泰勒曼奏鸣曲"]
                }
            ]
        };

        // 和弦替代表
        this.substitutions = {
            major: {
                'I': ['iii', 'vi'],           // 主功能组
                'ii': ['IV'],                 // 下属功能组
                'iii': ['I', 'vi'],          // 主功能组
                'IV': ['ii', 'vi'],          // 下属功能组
                'V': ['vii°', 'iii'],        // 属功能组
                'vi': ['I', 'iii', 'IV'],    // 主功能组
                'vii°': ['V']                // 属功能组
            },
            minor: {
                'i': ['III', 'VI'],          // 主功能组
                'ii°': ['iv'],               // 下属功能组
                'III': ['i', 'VI'],          // 主功能组
                'iv': ['ii°', 'VI'],         // 下属功能组
                'v': ['VII'],                // 属功能组（自然小调）
                'V': ['vii°'],               // 属功能组（和声小调）
                'VI': ['i', 'III', 'iv'],    // 主功能组
                'VII': ['v', 'V']            // 属功能组
            }
        };

        // 调式色彩和弦
        this.modalHarmony = {
            dorian: {
                characteristic: ['ii', 'IV'],  // 特征和弦
                avoid: ['VII'],                 // 避免和弦
                color: "现代、爵士感"
            },
            phrygian: {
                characteristic: ['bII', 'bVI'],
                avoid: ['V'],
                color: "西班牙、神秘感"
            },
            lydian: {
                characteristic: ['#IV', 'VII'],
                avoid: ['iv'],
                color: "梦幻、电影感"
            },
            mixolydian: {
                characteristic: ['bVII', 'v'],
                avoid: ['vii°'],
                color: "蓝调、摇滚感"
            }
        };
    }

    /**
     * 分析和弦进行的功能性
     * @param {Array} progression - 和弦进行（罗马数字）
     * @param {string} key - 调性
     * @returns {Object} 功能分析结果
     */
    analyzeProgression(progression, key) {
        const keyInfo = this.harmonyTheory.keys[key];
        const mode = keyInfo?.mode || 'major';
        const functions = this.chordFunctions[mode];

        const analysis = progression.map((chord, index) => {
            const func = functions[chord] || { function: 'Unknown', stability: 'unknown', tension: 0 };

            return {
                measure: index + 1,
                chord: chord,
                function: func.function,
                stability: func.stability,
                tension: func.tension,
                movement: this.analyzeMovement(progression, index),
                quality: this.getChordQuality(chord, mode)
            };
        });

        return {
            progression: progression,
            key: key,
            mode: mode,
            analysis: analysis,
            strength: this.calculateProgressionStrength(analysis),
            genre: this.identifyGenre(progression),
            suggestions: this.suggestImprovements(progression, mode)
        };
    }

    /**
     * 生成基于功能的和弦进行
     * @param {string} key - 调性
     * @param {number} length - 长度
     * @param {string} style - 风格
     * @returns {Array} 生成的进行
     */
    generateFunctionalProgression(key, length, style = 'pop', options = {}) {
        const templates = this.commonProgressions[style] || this.commonProgressions.pop;
        const template = templates[Math.floor(Math.random() * templates.length)];

        let progression = [];
        const pattern = template.pattern;

        // 扩展或截取到指定长度
        while (progression.length < length) {
            const remaining = length - progression.length;
            if (remaining >= pattern.length) {
                progression = progression.concat(pattern);
            } else {
                progression = progression.concat(pattern.slice(0, remaining));
            }
        }

        // 根据用户的和弦类型设置过滤和转换罗马数字
        if (options.chordTypes) {
            console.log('🎯 应用和弦类型过滤器:', options.chordTypes);
            progression = this.filterProgressionByChordTypes(progression, key, options.chordTypes);
        }

        // 添加一些变化
        if (Math.random() < 0.3) {
            progression = this.addVariations(progression, key);
        }

        return {
            progression: progression,
            analysis: this.analyzeProgression(progression, key),
            template: template
        };
    }

    /**
     * 根据用户选择的和弦类型过滤罗马数字进行
     * @param {Array} progression - 罗马数字进行
     * @param {string} key - 调性
     * @param {Array} chordTypes - 用户选择的和弦类型
     * @returns {Array} 过滤后的罗马数字进行
     */
    filterProgressionByChordTypes(progression, key, chordTypes) {
        const hasTriads = chordTypes.some(type => ['major', 'minor', 'diminished', 'augmented'].includes(type));
        const hasSevenths = chordTypes.some(type => type.includes('7'));

        return progression.map(romanNumeral => {
            const isSeventhChord = romanNumeral.includes('7');

            if (isSeventhChord && !hasSevenths) {
                // 如果是七和弦但用户没选择七和弦类型，转换为三和弦
                let newRoman = romanNumeral.replace(/7/g, '');
                console.log(`🔄 转换七和弦罗马数字: ${romanNumeral} -> ${newRoman}`);
                return newRoman;
            }

            if (!isSeventhChord && !hasTriads) {
                // 如果是三和弦但用户没选择三和弦类型，转换为七和弦
                // 根据功能添加合适的七和弦
                if (romanNumeral === 'V') {
                    console.log(`🔄 转换三和弦为七和弦: ${romanNumeral} -> V7`);
                    return 'V7';
                } else if (romanNumeral.toLowerCase() === romanNumeral) {
                    // 小调和弦加minor7
                    console.log(`🔄 转换三和弦为七和弦: ${romanNumeral} -> ${romanNumeral}7`);
                    return romanNumeral + '7';
                } else {
                    // 大调和弦加major7
                    console.log(`🔄 转换三和弦为七和弦: ${romanNumeral} -> ${romanNumeral}maj7`);
                    return romanNumeral + 'maj7';
                }
            }

            return romanNumeral;
        });
    }

    /**
     * 添加和弦替代
     * @param {Array} progression - 原进行
     * @param {string} key - 调性
     * @returns {Array} 带替代的进行
     */
    addSubstitutions(progression, key) {
        const keyInfo = this.harmonyTheory.keys[key];
        const mode = keyInfo?.mode || 'major';
        const substitutions = this.substitutions[mode];

        return progression.map(chord => {
            // 30% 概率进行替代
            if (Math.random() < 0.3 && substitutions[chord]) {
                const alternatives = substitutions[chord];
                return alternatives[Math.floor(Math.random() * alternatives.length)];
            }
            return chord;
        });
    }

    /**
     * 分析和弦间的运动
     * @param {Array} progression - 进行
     * @param {number} index - 当前位置
     * @returns {string} 运动类型
     */
    analyzeMovement(progression, index) {
        if (index === 0) return 'start';

        const current = progression[index];
        const previous = progression[index - 1];

        // 根据根音关系分析运动
        const currentRoot = this.getRootDegree(current);
        const previousRoot = this.getRootDegree(previous);

        const interval = (currentRoot - previousRoot + 7) % 7;

        switch (interval) {
            case 1: return 'step_up';      // 上行二度
            case 2: return 'third_up';     // 上行三度
            case 3: return 'fourth_up';    // 上行四度
            case 4: return 'fifth_up';     // 上行五度（强进行）
            case 6: return 'step_down';    // 下行二度
            case 5: return 'third_down';   // 下行三度
            case 4: return 'fourth_down';  // 下行四度
            case 3: return 'fifth_down';   // 下行五度（强进行）
            default: return 'unison';
        }
    }

    /**
     * 获取和弦的根音级数
     * @param {string} romanNumeral - 罗马数字
     * @returns {number} 级数 (1-7)
     */
    getRootDegree(romanNumeral) {
        const cleanChord = romanNumeral.replace(/[^IVX]/g, '');
        const degreeMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7 };

        for (const [roman, degree] of Object.entries(degreeMap)) {
            if (cleanChord.includes(roman)) {
                return degree;
            }
        }
        return 1;
    }

    /**
     * 获取和弦性质
     * @param {string} chord - 和弦
     * @param {string} mode - 调式
     * @returns {string} 性质描述
     */
    getChordQuality(chord, mode) {
        if (chord.includes('°')) return 'diminished';
        if (chord.includes('+')) return 'augmented';
        if (chord.includes('7')) return 'seventh';
        if (chord.includes('maj7')) return 'major_seventh';

        // 根据调式和级数判断大小调性
        const degree = this.getRootDegree(chord);
        if (mode === 'major') {
            return [1, 4, 5].includes(degree) ? 'major' : 'minor';
        } else {
            return [3, 6, 7].includes(degree) ? 'major' : 'minor';
        }
    }

    /**
     * 计算进行的和声强度
     * @param {Array} analysis - 分析结果
     * @returns {number} 强度分数 (0-10)
     */
    calculateProgressionStrength(analysis) {
        let strength = 0;
        let movements = 0;

        for (let i = 1; i < analysis.length; i++) {
            const current = analysis[i];
            const previous = analysis[i - 1];

            // 强进行加分
            if (current.movement === 'fifth_up' || current.movement === 'fourth_up') {
                strength += 3;
            }

            // 功能逻辑加分
            if (this.isLogicalProgression(previous.function, current.function)) {
                strength += 2;
            }

            movements++;
        }

        return Math.min(10, strength / Math.max(1, movements) * 2);
    }

    /**
     * 判断功能进行是否逻辑合理
     * @param {string} from - 起始功能
     * @param {string} to - 目标功能
     * @returns {boolean} 是否合理
     */
    isLogicalProgression(from, to) {
        const logicalMoves = {
            'Tonic': ['Subdominant', 'Dominant'],
            'Subdominant': ['Dominant', 'Tonic'],
            'Dominant': ['Tonic'],
            'Subtonic': ['Tonic']
        };

        return logicalMoves[from]?.includes(to) || false;
    }

    /**
     * 识别进行的风格类型
     * @param {Array} progression - 进行
     * @returns {string} 风格类型
     */
    identifyGenre(progression) {
        const progStr = progression.join('-');

        // 检查常见模式
        if (progStr.includes('vi-IV-I-V') || progStr.includes('I-V-vi-IV')) {
            return 'Pop/Rock';
        }
        if (progStr.includes('ii-V-I')) {
            return 'Jazz';
        }
        if (progStr.includes('I-IV-V-I')) {
            return 'Classical';
        }
        if (progStr.includes('i-VI-VII')) {
            return 'Folk/Modal';
        }

        return 'Contemporary';
    }

    /**
     * 建议改进
     * @param {Array} progression - 进行
     * @param {string} mode - 调式
     * @returns {Array} 建议列表
     */
    suggestImprovements(progression, mode) {
        const suggestions = [];

        // 检查是否缺少强进行
        const hasStrongProgression = progression.some((chord, i) =>
            i > 0 && this.analyzeMovement(progression, i).includes('fifth')
        );

        if (!hasStrongProgression) {
            suggestions.push({
                type: 'harmony',
                description: '考虑添加V-I或ii-V进行来增强和声驱动力',
                example: mode === 'major' ? ['V', 'I'] : ['V', 'i']
            });
        }

        // 检查功能平衡
        const functions = progression.map(chord =>
            this.chordFunctions[mode][chord]?.function
        );

        const hasAllFunctions = ['Tonic', 'Subdominant', 'Dominant'].every(func =>
            functions.includes(func)
        );

        if (!hasAllFunctions) {
            suggestions.push({
                type: 'function',
                description: '进行缺少某些基本功能，考虑添加主、下属、属功能的平衡',
                missing: ['Tonic', 'Subdominant', 'Dominant'].filter(func =>
                    !functions.includes(func)
                )
            });
        }

        return suggestions;
    }

    /**
     * 添加变化到进行中
     * @param {Array} progression - 原进行
     * @param {string} key - 调性
     * @returns {Array} 变化后的进行
     */
    addVariations(progression, key) {
        const variations = [...progression];
        const keyInfo = this.harmonyTheory.keys[key];
        const mode = keyInfo?.mode || 'major';

        // 随机添加一些变化
        for (let i = 0; i < variations.length; i++) {
            if (Math.random() < 0.2) {
                // 添加七和弦
                if (!variations[i].includes('7')) {
                    const degree = this.getRootDegree(variations[i]);
                    if (mode === 'major' && [1, 4, 6].includes(degree)) {
                        variations[i] += 'maj7';
                    } else if ([2, 3, 5, 7].includes(degree)) {
                        variations[i] += '7';
                    }
                }
            }
        }

        return variations;
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedHarmony;
} else if (typeof window !== 'undefined') {
    window.EnhancedHarmony = EnhancedHarmony;
}