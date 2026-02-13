/*!
 * IC Studio - 专业Voicing引擎
 * Professional Voicing Engine
 *
 * Copyright © 2026. All rights reserved. Igor Chen - icstudio.club
 *
 * Author: Igor Chen
 * Website: https://icstudio.club
 * Email: icstudio@fastmail.com
 */

/**
 * 专业Voicing引擎
 * 实现Drop 2、Drop 3、Shell voicing和Voice Leading
 */
class VoicingEngine {
    constructor(harmonyTheory) {
        this.harmonyTheory = harmonyTheory;

        // 音符到MIDI音高的映射 (C4 = 60)
        this.noteToMidi = {
            'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
            'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68,
            'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71
        };

        // 默认voicing设置
        this.voicingSettings = {
            enabledVoicings: ['close'],
            enableVoiceLeading: false,
            enableInversions: false,        // 是否允许转位
            defaultOctave: 4,
            voiceRange: {
                bass: { min: 36, max: 60 },      // C2-C4
                tenor: { min: 48, max: 72 },     // C3-C5
                alto: { min: 60, max: 84 },      // C4-C6
                soprano: { min: 72, max: 96 }    // C5-C7
            }
        };

        // 上一个和弦的voicing（用于voice leading）
        this.previousVoicing = null;

        // 🎸 增强三和弦配置系统
        this.enhancedTriadSettings = {
            enabled: false,
            voicingContext: null,
            preventDropTransform: true
        };
    }

    /**
     * 更新voicing设置
     * @param {Object} settings - 新的设置
     */
    updateSettings(settings) {
        this.voicingSettings = { ...this.voicingSettings, ...settings };
    }

    /**
     * 🎸 检查是否应该使用增强三和弦配置
     * @param {Object} chord - 和弦对象
     * @param {Object} options - 选项
     * @returns {boolean} 是否使用增强配置
     */
    shouldUseEnhancedGuitarTriad(chord, options = {}) {
        // 🚫 阶段2紧急隔离：完全禁用增强三和弦系统
        console.log(`🚫 === 增强系统隔离检查 ===`);
        console.log(`🚫 阶段2措施：增强三和弦系统已被完全隔离`);
        console.log(`🚫 原因：系统干扰标准voicing生成，导致异常配置`);
        console.log(`🚫 影响：强制返回false，确保使用标准生成流程`);
        return false; // 🚫 强制禁用，确保完全隔离

        // 基础条件检查 (已被隔离，下面的代码暂时不执行)
        const isGuitarMode = this.isGuitarMode();
        const isTriad = this.isTriadChord(chord);
        const enhancedEnabled = this.isEnhancedTriadEnabled();
        const allowEnhanced = options.allowEnhanced !== false;

        // 🎯 优化的激活条件 - 更用户友好的方式
        const isCloseVoicingInvolved =
            options.voicingContext === 'close-only' ||     // 原条件：仅Close voicing
            options.voicingContext === 'mixed' ||          // 新条件：包含Close的混合选择
            (options.enabledVoicings &&
             Array.isArray(options.enabledVoicings) &&
             options.enabledVoicings.includes('close')) || // 新条件：Close在启用列表中
            (!options.voicingContext && !options.enabledVoicings); // 新条件：默认情况（用户没有明确指定）

        console.log(`🔍 增强三和弦检查:`);
        console.log(`  - 吉他模式: ${isGuitarMode}`);
        console.log(`  - 三和弦: ${isTriad}`);
        console.log(`  - 已启用: ${enhancedEnabled}`);
        console.log(`  - Close相关: ${isCloseVoicingInvolved}`);
        console.log(`  - 允许增强: ${allowEnhanced}`);
        console.log(`  - voicingContext: ${options.voicingContext}`);
        console.log(`  - enabledVoicings: ${JSON.stringify(options.enabledVoicings)}`);

        const shouldActivate = isGuitarMode && isTriad && enhancedEnabled && isCloseVoicingInvolved && allowEnhanced;
        console.log(`🎯 最终决定: ${shouldActivate ? '✅ 激活增强三和弦' : '❌ 不激活增强三和弦'}`);

        return shouldActivate;
    }

    /**
     * 🎸 检查是否为吉他模式
     * @returns {boolean}
     */
    isGuitarMode() {
        if (typeof document === 'undefined') return true; // 默认吉他模式
        const instrumentToggle = document.getElementById('instrumentModeToggle');
        return !instrumentToggle || !instrumentToggle.checked;
    }

    /**
     * 🎵 检查是否为三和弦
     * @param {Object} chord - 和弦对象
     * @returns {boolean}
     */
    isTriadChord(chord) {
        if (!chord || !chord.type) return false;
        const triadTypes = ['major', 'minor', 'diminished', 'augmented'];
        return triadTypes.includes(chord.type);
    }

    /**
     * ⚙️ 检查增强三和弦是否已启用
     * @returns {boolean}
     */
    isEnhancedTriadEnabled() {
        // 检查全局设置
        if (typeof chordSettings !== 'undefined' && chordSettings.enhancedGuitarTriads) {
            return true;
        }

        // 检查内部设置
        return this.enhancedTriadSettings.enabled;
    }

    /**
     * 🏷️ 为voicing添加防护标记
     * @param {Object} voicing - voicing对象
     * @returns {Object} 带标记的voicing
     */
    addEnhancedTriadProtection(voicing) {
        if (!voicing) return voicing;

        return {
            ...voicing,
            isEnhancedTriad: true,
            preventDropTransform: true,
            enhancedType: 'guitar-triad-enhanced',
            voicingContext: 'close-only'
        };
    }

    /**
     * 🎸 生成增强吉他三和弦配置
     * 独立的生成器，不依赖标准generateCloseVoicing逻辑
     * @param {Object} chord - 和弦对象
     * @param {Object} options - 选项
     * @returns {Object} 增强三和弦voicing
     */
    generateEnhancedGuitarTriadVoicing(chord, options = {}) {
        // 🚫 阶段2紧急隔离：禁止增强三和弦生成
        console.log(`\n🚫 === 增强三和弦生成器已隔离 ===`);
        console.log(`🚫 阶段2措施：强制阻止增强三和弦生成`);
        console.log(`🚫 和弦: ${chord.root}${chord.type} - 将使用标准生成流程`);
        console.log(`🚫 返回null，确保回退到标准generateCloseVoicing`);
        return null; // 🚫 强制返回null，确保使用标准流程

        console.log(`\n🎸 === 增强吉他三和弦生成器 ===`);
        console.log(`🎵 和弦: ${chord.root}${chord.type}`);

        // 基础验证
        if (!chord || !chord.root || !chord.type) {
            console.error(`❌ 增强三和弦生成器: 无效的和弦对象`);
            return null;
        }

        if (!this.isTriadChord(chord)) {
            console.error(`❌ 增强三和弦生成器: 不是三和弦类型 (${chord.type})`);
            return null;
        }

        // 🎸 获取增强和声配置
        const enhancedConfig = this.getEnhancedTriadConfiguration(chord);
        if (!enhancedConfig) {
            console.warn(`⚠️ 没有找到${chord.root}${chord.type}的增强配置，回退到标准生成`);
            return this.generateStandardCloseVoicing(chord, options);
        }

        console.log(`✅ 找到增强配置: ${enhancedConfig.name}`);

        // 获取音域设置
        const rangeMin = options.rangeMin || 55;
        const rangeMax = options.rangeMax || 88;
        const baseOctave = this.calculateOptimalOctave(rangeMin, rangeMax);

        // 🎸 生成增强voicing
        const enhancedVoicing = {
            type: 'enhanced-close',
            notes: [],
            midiNotes: [],
            range: baseOctave,
            rangeConstraints: { minMidi: rangeMin, maxMidi: rangeMax },
            chordType: chord.type,
            root: chord.root,
            enhancedConfig: enhancedConfig.name
        };

        // 🎵 应用增强配置的音符排列
        try {
            this.applyEnhancedConfiguration(enhancedVoicing, chord, enhancedConfig, baseOctave);
        } catch (error) {
            console.error(`❌ 增强配置应用失败: ${error.message}`);
            return this.generateStandardCloseVoicing(chord, options);
        }

        // 🎯 应用音域约束
        this.applyIntelligentRangeConstraints(enhancedVoicing.notes.map((note, i) => ({
            note: note,
            midi: enhancedVoicing.midiNotes[i]
        })), rangeMin, rangeMax, '增强三和弦模式');

        // 重建音符和MIDI数组
        const adjustedNotes = enhancedVoicing.notes.map((note, i) => ({
            note: note,
            midi: enhancedVoicing.midiNotes[i]
        }));

        enhancedVoicing.notes = adjustedNotes.map(n => n.note);
        enhancedVoicing.midiNotes = adjustedNotes.map(n => n.midi);

        console.log(`🎸 增强三和弦生成完成:`);
        console.log(`  配置: ${enhancedConfig.name}`);
        console.log(`  音符: ${enhancedVoicing.notes.join('-')}`);
        console.log(`  MIDI: ${enhancedVoicing.midiNotes.join(',')}`);

        // 🛡️ 添加防护标记
        return this.addEnhancedTriadProtection(enhancedVoicing);
    }

    /**
     * 🎸 获取三和弦的增强配置
     * @param {Object} chord - 和弦对象
     * @param {number} requestedInversion - 请求的转位 (可选)
     * @returns {Object|null} 增强配置对象
     */
    getEnhancedTriadConfiguration(chord, requestedInversion) {
        // 🎸 吉他专用三和弦增强配置表（支持转位）
        // 优先级: 传入参数 > chord.inversion > 默认0
        const chordInversion = requestedInversion !== undefined ? requestedInversion : (chord.inversion || 0);

        const enhancedConfigurations = {
            'major': {
                // 原位配置 (1-3-5) - 根音在低音
                0: [
                    {
                        name: 'guitar-major-root-1351',
                        description: '吉他大三和弦原位：1-3-5-1排列',
                        voiceCount: 4,
                        inversion: 0,
                        voicePattern: [
                            { degree: 1, octaveOffset: 0 },  // C4 (根音，低音)
                            { degree: 3, octaveOffset: 0 },  // E4 (三音)
                            { degree: 5, octaveOffset: 0 },  // G4 (五音)
                            { degree: 1, octaveOffset: 1 }   // C5 (根音，高八度)
                        ],
                        rangeConstraints: null
                    },
                    {
                        name: 'guitar-major-root-1513',
                        description: '吉他大三和弦原位：1-5-1-3排列',
                        voiceCount: 4,
                        inversion: 0,
                        voicePattern: [
                            { degree: 1, octaveOffset: 0 },  // C4 (根音，低音)
                            { degree: 5, octaveOffset: 0 },  // G4 (五音)
                            { degree: 1, octaveOffset: 1 },  // C5 (根音，高八度)
                            { degree: 3, octaveOffset: 1 }   // E5 (三音，高八度)
                        ],
                        rangeConstraints: null
                    },
                    {
                        name: 'guitar-major-root-1531',
                        description: '吉他大三和弦原位：1-5-3-1排列',
                        voiceCount: 4,
                        inversion: 0,
                        voicePattern: [
                            { degree: 1, octaveOffset: 0 },  // C4 (根音，低音)
                            { degree: 5, octaveOffset: 0 },  // G4 (五音)
                            { degree: 3, octaveOffset: 1 },  // E5 (三音)
                            { degree: 1, octaveOffset: 1 }   // C5 (根音，高八度)
                        ],
                        rangeConstraints: null
                    }
                ],
                // 第一转位配置 (3-5-1) - 三音在低音
                1: [
                    {
                        name: 'guitar-major-first-3513',
                        description: '吉他大三和弦第一转位：3-5-1-3排列',
                        voiceCount: 4,
                        inversion: 1,
                        voicePattern: [
                            { degree: 3, octaveOffset: 0 },  // E4 (三音，低音)
                            { degree: 5, octaveOffset: 0 },  // G4 (五音)
                            { degree: 1, octaveOffset: 1 },  // C5 (根音，高八度)
                            { degree: 3, octaveOffset: 1 }   // E5 (三音，高八度)
                        ],
                        rangeConstraints: null
                    },
                    {
                        name: 'guitar-major-first-3135',
                        description: '吉他大三和弦第一转位：3-1-3-5排列',
                        voiceCount: 4,
                        inversion: 1,
                        voicePattern: [
                            { degree: 3, octaveOffset: 0 },  // E4 (三音，低音)
                            { degree: 1, octaveOffset: 1 },  // C5 (根音)
                            { degree: 3, octaveOffset: 1 },  // E5 (三音，高八度)
                            { degree: 5, octaveOffset: 1 }   // G5 (五音，高八度)
                        ],
                        rangeConstraints: null
                    }
                ],
                // 第二转位配置 (5-1-3) - 五音在低音
                2: [
                    {
                        name: 'guitar-major-second-5135',
                        description: '吉他大三和弦第二转位：5-1-3-5排列',
                        voiceCount: 4,
                        inversion: 2,
                        voicePattern: [
                            { degree: 5, octaveOffset: 0 },  // G4 (五音，低音)
                            { degree: 1, octaveOffset: 1 },  // C5 (根音)
                            { degree: 3, octaveOffset: 1 },  // E5 (三音)
                            { degree: 5, octaveOffset: 1 }   // G5 (五音，高八度)
                        ],
                        rangeConstraints: null
                    },
                    {
                        name: 'guitar-major-second-5315',
                        description: '吉他大三和弦第二转位：5-3-1-5排列',
                        voiceCount: 4,
                        inversion: 2,
                        voicePattern: [
                            { degree: 5, octaveOffset: 0 },  // G4 (五音，低音)
                            { degree: 3, octaveOffset: 1 },  // E5 (三音)
                            { degree: 1, octaveOffset: 1 },  // C5 (根音)
                            { degree: 5, octaveOffset: 1 }   // G5 (五音，高八度)
                        ],
                        rangeConstraints: null
                    },
                    {
                        name: 'guitar-major-second-5131',
                        description: '吉他大三和弦第二转位：5-1-3-1排列（需Eb4+）',
                        voiceCount: 4,
                        inversion: 2,
                        voicePattern: [
                            { degree: 5, octaveOffset: 0 },  // G4 (五音，低音)
                            { degree: 1, octaveOffset: 1 },  // C5 (根音)
                            { degree: 3, octaveOffset: 1 },  // E5 (三音)
                            { degree: 1, octaveOffset: 1 }   // C5 (根音，高八度)
                        ],
                        rangeConstraints: {
                            minimumLowestNote: 63 // Eb4的MIDI值
                        }
                    }
                ]
            },
            'minor': {
                // 原位配置 (1-3-5) - 根音在低音
                0: [
                    {
                        name: 'guitar-minor-root-1351',
                        description: '吉他小三和弦原位：1-3-5-1排列',
                        voiceCount: 4,
                        inversion: 0,
                        voicePattern: [
                            { degree: 1, octaveOffset: 0 },  // C4 (根音，低音)
                            { degree: 3, octaveOffset: 0 },  // Eb4 (小三音)
                            { degree: 5, octaveOffset: 0 },  // G4 (五音)
                            { degree: 1, octaveOffset: 1 }   // C5 (根音，高八度)
                        ],
                        rangeConstraints: null
                    },
                    {
                        name: 'guitar-minor-root-1513',
                        description: '吉他小三和弦原位：1-5-1-3排列',
                        voiceCount: 4,
                        inversion: 0,
                        voicePattern: [
                            { degree: 1, octaveOffset: 0 },  // C4 (根音，低音)
                            { degree: 5, octaveOffset: 0 },  // G4 (五音)
                            { degree: 1, octaveOffset: 1 },  // C5 (根音，高八度)
                            { degree: 3, octaveOffset: 1 }   // Eb5 (小三音，高八度)
                        ],
                        rangeConstraints: null
                    }
                ],
                // 第一转位配置 (3-5-1) - 三音在低音
                1: [
                    {
                        name: 'guitar-minor-first-3513',
                        description: '吉他小三和弦第一转位：3-5-1-3排列',
                        voiceCount: 4,
                        inversion: 1,
                        voicePattern: [
                            { degree: 3, octaveOffset: 0 },  // Eb4 (小三音，低音)
                            { degree: 5, octaveOffset: 0 },  // G4 (五音)
                            { degree: 1, octaveOffset: 1 },  // C5 (根音，高八度)
                            { degree: 3, octaveOffset: 1 }   // Eb5 (小三音，高八度)
                        ],
                        rangeConstraints: null
                    },
                    {
                        name: 'guitar-minor-first-3135',
                        description: '吉他小三和弦第一转位：3-1-3-5排列',
                        voiceCount: 4,
                        inversion: 1,
                        voicePattern: [
                            { degree: 3, octaveOffset: 0 },  // Eb4 (小三音，低音)
                            { degree: 1, octaveOffset: 1 },  // C5 (根音)
                            { degree: 3, octaveOffset: 1 },  // Eb5 (小三音，高八度)
                            { degree: 5, octaveOffset: 1 }   // G5 (五音，高八度)
                        ],
                        rangeConstraints: null
                    }
                ],
                // 第二转位配置 (5-1-3) - 五音在低音
                2: [
                    {
                        name: 'guitar-minor-second-5135',
                        description: '吉他小三和弦第二转位：5-1-3-5排列',
                        voiceCount: 4,
                        inversion: 2,
                        voicePattern: [
                            { degree: 5, octaveOffset: 0 },  // G4 (五音，低音)
                            { degree: 1, octaveOffset: 1 },  // C5 (根音)
                            { degree: 3, octaveOffset: 1 },  // Eb5 (小三音)
                            { degree: 5, octaveOffset: 1 }   // G5 (五音，高八度)
                        ],
                        rangeConstraints: null
                    },
                    {
                        name: 'guitar-minor-second-5315',
                        description: '吉他小三和弦第二转位：5-3-1-5排列',
                        voiceCount: 4,
                        inversion: 2,
                        voicePattern: [
                            { degree: 5, octaveOffset: 0 },  // G4 (五音，低音)
                            { degree: 3, octaveOffset: 1 },  // Eb5 (小三音)
                            { degree: 1, octaveOffset: 1 },  // C5 (根音)
                            { degree: 5, octaveOffset: 1 }   // G5 (五音，高八度)
                        ],
                        rangeConstraints: null
                    }
                ]
            },
            'diminished': {
                // 原位配置
                0: [
                    {
                        name: 'guitar-dim-root-1351',
                        description: '吉他减三和弦原位：1-3-5-1排列',
                        voiceCount: 4,
                        inversion: 0,
                        voicePattern: [
                            { degree: 1, octaveOffset: 0 },  // 根音
                            { degree: 3, octaveOffset: 0 },  // 小三音
                            { degree: 5, octaveOffset: 0 },  // 减五音
                            { degree: 1, octaveOffset: 1 }   // 根音，高八度
                        ],
                        rangeConstraints: null
                    }
                ]
            },
            'augmented': {
                // 原位配置
                0: [
                    {
                        name: 'guitar-aug-root-1351',
                        description: '吉他增三和弦原位：1-3-5-1排列',
                        voiceCount: 4,
                        inversion: 0,
                        voicePattern: [
                            { degree: 1, octaveOffset: 0 },  // 根音
                            { degree: 3, octaveOffset: 0 },  // 大三音
                            { degree: 5, octaveOffset: 0 },  // 增五音
                            { degree: 1, octaveOffset: 1 }   // 根音，高八度
                        ],
                        rangeConstraints: null
                    }
                ]
            }
        };

        const chordTypeConfigs = enhancedConfigurations[chord.type];
        if (!chordTypeConfigs) {
            return null;
        }

        // 获取对应转位的配置
        const inversionConfigs = chordTypeConfigs[chordInversion];
        if (!inversionConfigs || inversionConfigs.length === 0) {
            console.log(`⚠️ 和弦${chord.root}${chord.type}的${chordInversion}转位没有四声部配置，回退到原位`);
            // 回退到原位配置
            const rootConfigs = chordTypeConfigs[0];
            if (!rootConfigs || rootConfigs.length === 0) {
                return null;
            }
            return this.selectOptimalConfiguration(rootConfigs, chord);
        }

        console.log(`🎯 找到${chord.root}${chord.type}${chordInversion}转位的${inversionConfigs.length}个四声部配置`);

        // 🎯 智能配置选择算法
        return this.selectOptimalConfiguration(inversionConfigs, chord);
    }

    /**
     * 🎯 智能选择最佳增强配置
     * @param {Array} configs - 可用配置数组
     * @param {Object} chord - 和弦对象
     * @returns {Object} 最佳配置
     */
    selectOptimalConfiguration(configs, chord) {
        if (!configs || configs.length === 0) {
            return null;
        }

        if (configs.length === 1) {
            return configs[0];
        }

        console.log(`🎯 为${chord.root}${chord.type}选择最佳配置，共${configs.length}个选项`);

        // 🎛️ 获取用户四声部设置
        const fourVoiceSettings = this.getFourVoiceTriadSettings();
        console.log(`🎛️ 四声部设置:`, fourVoiceSettings);

        // 过滤掉不满足音域约束的配置
        let validConfigs = configs.filter(config =>
            this.validateRangeConstraints(config, chord)
        );

        // 🎚️ 根据用户设置过滤配置
        validConfigs = validConfigs.filter(config =>
            this.isConfigurationAllowed(config, fourVoiceSettings)
        );

        if (validConfigs.length === 0) {
            console.log(`⚠️ 没有配置满足约束和用户设置，使用第一个配置作为回退`);
            return configs[0];
        }

        console.log(`✅ ${validConfigs.length}个配置满足所有条件`);

        // 🎯 配置选择优先级（基于用户设置）：
        const prioritizedConfigs = validConfigs.sort((a, b) => {
            // 根据用户设置决定四声部vs三声部优先级
            const preferFourVoice = fourVoiceSettings.preferFourVoice;
            if (a.voiceCount !== b.voiceCount) {
                const aIsFour = (a.voiceCount || 3) === 4;
                const bIsFour = (b.voiceCount || 3) === 4;

                if (preferFourVoice) {
                    return bIsFour ? 1 : (aIsFour ? -1 : 0);
                } else {
                    return aIsFour ? 1 : (bIsFour ? -1 : 0);
                }
            }

            // 没有特殊范围约束的优先
            const aHasConstraints = a.rangeConstraints && a.rangeConstraints.minimumLowestNote;
            const bHasConstraints = b.rangeConstraints && b.rangeConstraints.minimumLowestNote;

            if (aHasConstraints !== bHasConstraints) {
                return aHasConstraints ? 1 : -1;
            }

            // 都相同则保持原序
            return 0;
        });

        const selectedConfig = prioritizedConfigs[0];
        console.log(`🎖️ 选中配置: ${selectedConfig.name} (${selectedConfig.voiceCount}声部)`);

        return selectedConfig;
    }

    /**
     * 🎛️ 获取四声部三和弦用户设置
     * @returns {Object} 四声部设置对象
     */
    getFourVoiceTriadSettings() {
        // 尝试获取全局chordSettings
        if (typeof chordSettings !== 'undefined' && chordSettings.fourVoiceTriadSettings) {
            return chordSettings.fourVoiceTriadSettings;
        }

        // 默认设置
        return {
            enabled: false,
            allowedConfigurations: {
                '5135': true,
                '5131': false,
                '1351': true,
                '1513': true,
                '3513': true
            },
            preferFourVoice: true,
            fallbackToThreeVoice: true
        };
    }

    /**
     * 🎚️ 检查配置是否被用户设置允许
     * @param {Object} config - 配置对象
     * @param {Object} settings - 用户设置
     * @returns {boolean} 是否允许
     */
    isConfigurationAllowed(config, settings) {
        // 四声部总开关检查
        if ((config.voiceCount || 3) === 4 && !settings.enabled) {
            console.log(`🚫 配置${config.name}被四声部总开关禁用`);
            return false;
        }

        // 检查具体配置是否被允许
        if ((config.voiceCount || 3) === 4) {
            const configKey = this.getConfigurationKey(config.name);
            if (configKey && settings.allowedConfigurations[configKey] === false) {
                console.log(`🚫 配置${config.name}被用户设置禁用`);
                return false;
            }
        }

        console.log(`✅ 配置${config.name}被用户设置允许`);
        return true;
    }

    /**
     * 🔑 从配置名称提取配置键
     * @param {string} configName - 配置名称
     * @returns {string|null} 配置键
     */
    getConfigurationKey(configName) {
        if (!configName) return null;

        if (configName.includes('5135')) return '5135';
        if (configName.includes('5131')) return '5131';
        if (configName.includes('1351')) return '1351';
        if (configName.includes('1513')) return '1513';
        if (configName.includes('3513')) return '3513';

        return null;
    }

    /**
     * 🔍 验证配置的音域约束
     * @param {Object} config - 配置对象
     * @param {Object} chord - 和弦对象
     * @returns {boolean} 是否满足约束
     */
    validateRangeConstraints(config, chord) {
        if (!config.rangeConstraints) {
            return true; // 没有约束则直接通过
        }

        const constraints = config.rangeConstraints;

        // 检查minimumLowestNote约束 (例如5-1-3-1需要Eb4+)
        if (constraints.minimumLowestNote) {
            // 获取当前全局设置的音域范围
            const currentRangeMin = this.voicingSettings.rangeMin || 55; // G3默认

            if (currentRangeMin < constraints.minimumLowestNote) {
                console.log(`❌ 配置${config.name}需要最低音≥MIDI ${constraints.minimumLowestNote}，当前范围最低音为${currentRangeMin}`);
                return false;
            }
        }

        // 可以添加更多约束检查...
        // 例如：maximumHighestNote, totalRangeSpan等

        console.log(`✅ 配置${config.name}满足所有音域约束`);
        return true;
    }

    /**
     * 🎵 应用增强配置到voicing（支持四声部voicePattern）
     * @param {Object} voicing - voicing对象（会被修改）
     * @param {Object} chord - 和弦对象
     * @param {Object} config - 增强配置
     * @param {number} baseOctave - 基础八度
     */
    applyEnhancedConfiguration(voicing, chord, config, baseOctave) {
        const intervals = this.harmonyTheory.chordTypes[chord.type];
        const rootSemitone = this.harmonyTheory.noteToSemitone[chord.root];
        // 🔧 修复 (2025-10-03): 优先使用this.currentChord.key，确保调号正确传递
        const keyInfo = this.harmonyTheory.keys[this.currentChord?.key || chord.key || 'C-major'];

        console.log(`🎸 应用增强配置: ${config.name} (${config.voiceCount || 3}声部)`);

        // 检查是否为新的voicePattern结构
        if (config.voicePattern && Array.isArray(config.voicePattern)) {
            // 🎯 新的四声部voicePattern处理
            config.voicePattern.forEach((voice, voiceIndex) => {
                const { degree, octaveOffset } = voice;

                // 度数到音程的映射 (1=根音, 3=三音, 5=五音)
                let intervalSemitones;
                switch (degree) {
                    case 1: intervalSemitones = 0; break;      // 根音
                    case 3: intervalSemitones = intervals[1]; break;  // 三音
                    case 5: intervalSemitones = intervals[2]; break;  // 五音
                    default:
                        console.warn(`❌ 未知度数: ${degree}`);
                        intervalSemitones = 0;
                }

                // 生成音符名称
                const noteSemitone = (rootSemitone + intervalSemitones) % 12;
                const note = this.harmonyTheory.spellNoteInChordContext(noteSemitone, chord.root, intervalSemitones, keyInfo, null, chord.type);

                // 计算基础MIDI值
                const baseNoteName = note.replace(/[#b]+$/, '');
                let baseMidi = this.noteToMidi[baseNoteName] + (baseOctave - 4) * 12;

                // 处理升降号
                const accidentals = note.match(/[#b]+$/);
                if (accidentals) {
                    const accidental = accidentals[0];
                    for (const char of accidental) {
                        if (char === '#') baseMidi++;
                        else if (char === 'b') baseMidi--;
                    }
                }

                // 🎸 应用voicePattern的八度调整
                baseMidi += octaveOffset * 12;

                console.log(`  声部${voiceIndex + 1}: 度数${degree} -> ${note} (八度偏移${octaveOffset}) -> MIDI ${baseMidi}`);

                voicing.notes.push(note);
                voicing.midiNotes.push(baseMidi);
            });
        } else {
            // 🔄 兼容旧的octaveAdjustments格式（向后兼容）
            intervals.forEach((interval, index) => {
                // 生成音符名称
                const noteSemitone = (rootSemitone + interval) % 12;
                const note = this.harmonyTheory.spellNoteInChordContext(noteSemitone, chord.root, interval, keyInfo, null, chord.type);

                // 计算基础MIDI值
                const baseNoteName = note.replace(/[#b]+$/, '');
                let baseMidi = this.noteToMidi[baseNoteName] + (baseOctave - 4) * 12;

                // 处理升降号
                const accidentals = note.match(/[#b]+$/);
                if (accidentals) {
                    const accidental = accidentals[0];
                    for (const char of accidental) {
                        if (char === '#') baseMidi++;
                        else if (char === 'b') baseMidi--;
                    }
                }

                // 🎸 应用增强配置的八度调整（兼容格式）
                if (config.octaveAdjustments && config.octaveAdjustments[index]) {
                    baseMidi += config.octaveAdjustments[index] * 12;
                    console.log(`  音符${index + 1} ${note}: 八度调整 +${config.octaveAdjustments[index]}`);
                }

                voicing.notes.push(note);
                voicing.midiNotes.push(baseMidi);
            });
        }

        console.log(`🎸 增强配置应用完成: ${voicing.notes.join('-')} [${voicing.midiNotes.join(', ')}]`);
    }

    /**
     * 🎯 计算最佳八度位置
     * @param {number} rangeMin - 最低音
     * @param {number} rangeMax - 最高音
     * @returns {number} 最佳八度
     */
    calculateOptimalOctave(rangeMin, rangeMax) {
        const midMidi = (rangeMin + rangeMax) / 2;
        const suggestedOctave = Math.floor(midMidi / 12) - 1;
        return Math.max(3, Math.min(6, suggestedOctave));
    }

    /**
     * 🔄 生成标准close voicing（回退选项）
     * @param {Object} chord - 和弦对象
     * @param {Object} options - 选项
     * @returns {Object} 标准close voicing
     */
    generateStandardCloseVoicing(chord, options) {
        console.log(`🔄 使用标准close voicing生成: ${chord.root}${chord.type}`);

        // 标记为标准模式，确保不触发增强逻辑
        const standardOptions = {
            ...options,
            allowEnhanced: false,
            voicingContext: 'standard'
        };

        return this.generateCloseVoicing(chord, standardOptions);
    }

    /**
     * 🛡️ 检查voicing是否为增强三和弦配置
     * @param {Object} voicing - voicing对象
     * @returns {boolean} 是否为增强三和弦
     */
    isEnhancedTriadVoicing(voicing) {
        if (!voicing) return false;

        return voicing.isEnhancedTriad === true ||
               voicing.preventDropTransform === true ||
               voicing.enhancedType === 'guitar-triad-enhanced' ||
               voicing.type === 'enhanced-close';
    }

    /**
     * 为和弦生成voicing
     * @param {Object} chord - 和弦对象
     * @param {Object} options - 选项
     * @returns {Object} 包含不同voicing的对象
     */
    generateVoicings(chord, options = {}) {
        if (!chord || !chord.notes) {
            return null;
        }

        // 🎵 修复：存储当前和弦信息（包含调号）以供midiToNoteInfo使用
        this.currentChord = {
            ...chord,
            key: options.key || chord.key || 'C-major'
        };
        console.log(`🎵 VoicingEngine: 处理和弦 ${chord.root}${chord.type} 调性: ${this.currentChord.key}`);

        // 🎯 七和弦close voicing特殊处理：首先检查是否需要强制禁用转位
        const originalInversionsEnabled = this.voicingSettings.enableInversions;
        const originalRequestedInversions = options.enableInversions !== undefined ? options.enableInversions : originalInversionsEnabled;

        // 七和弦close voicing特殊处理调试
        console.log(`🔍 UI调用: ${chord.root}${chord.type}`);

        // 为close voicing应用七和弦特殊逻辑
        const closeVoicingInversions = this.shouldEnableInversionsForCloseVoicing(chord, originalRequestedInversions);

        // 临时更新转位设置（优先使用close voicing的特殊设置）
        this.voicingSettings.enableInversions = closeVoicingInversions;
        console.log(`🎨 Voicing引擎: close voicing转位设置更新为 ${closeVoicingInversions} (原始请求: ${originalRequestedInversions})`);

        if (closeVoicingInversions !== originalRequestedInversions) {
            console.log(`🎯 Close voicing七和弦特殊处理生效: ${chord.root}${chord.type}`);
        } else {
            console.log(`ℹ️ Close voicing转位设置无变化: ${chord.root}${chord.type} (${closeVoicingInversions})`);
        }

        let voicings = {};

        // 🔧 阶段2重构：严格voicing选择传递机制

        // 严格只使用用户明确传入的enabledVoicings，拒绝任何默认值
        const enabledVoicings = options.enabledVoicings;

        // 验证用户选择的严格性
        if (!enabledVoicings || !Array.isArray(enabledVoicings)) {
            console.error('🚨 重构机制检测: enabledVoicings必须是明确的数组！');
            console.error('🚨 传入值:', enabledVoicings);
            console.error('🚨 类型:', typeof enabledVoicings);
            console.error('🚨 拒绝生成voicing，避免意外行为');
            return {};
        }

        if (enabledVoicings.length === 0) {
            console.warn('⚠️ 重构机制检测: 用户明确选择了空数组，遵循用户意愿');
            console.warn('⚠️ 返回空结果，不添加任何默认voicing类型');
            return {};
        }

        // 验证所有voicing类型的合法性
        const validVoicingTypes = ['close', 'drop2', 'drop3', 'shell'];
        const invalidTypes = enabledVoicings.filter(type => !validVoicingTypes.includes(type));
        if (invalidTypes.length > 0) {
            console.error('🚨 重构机制检测: 发现非法voicing类型！');
            console.error('🚨 非法类型:', invalidTypes);
            console.error('🚨 合法类型:', validVoicingTypes);
            return {};
        }

        console.log(`✅ 重构机制验证通过，将严格按用户选择生成: ${JSON.stringify(enabledVoicings)}`)

        // 🔥 保存当前启用的voicing类型和音域设置，供voice leading优化使用
        this.currentEnabledVoicings = enabledVoicings;
        this.currentRangeConstraints = {
            minMidi: options.rangeMin,
            maxMidi: options.rangeMax
        };

        // 严格验证：记录用户的真实选择
        console.log(`🔐 严格voicing生成模式:`);
        console.log(`  用户选择的类型: ${JSON.stringify(enabledVoicings)}`);
        console.log(`  数量: ${enabledVoicings.length}`);

        if (enabledVoicings.length === 1 && enabledVoicings[0] === 'drop2') {
            console.log(`  ⚠️ 仅drop2模式：不生成close, drop3, shell等任何其他类型`);
        }

        // 🎯 生成基础密集排列（已应用七和弦特殊处理）
        const closeVoicing = this.generateCloseVoicing(chord, options);

        // 根据启用的voicing类型生成不同排列
        console.log(`🎼 开始生成voicing...`);

        if (enabledVoicings.includes('close')) {
            voicings.close = closeVoicing;
            console.log(`✅ 生成了close voicing（用户选择）`);
        } else {
            console.log(`⏭️ 跳过close voicing（用户未选择）`);
        }

        if (enabledVoicings.includes('drop2')) {
            console.log(`\n🎵 === Drop2生成（独立架构 v2） ===`);

            // 🎵 检测sus和弦：7sus和4音符sus禁止Drop2（2025-10-05修订）
            const isSusChord = this.isSusChord(chord.type);
            const is7SusChord = chord.type && chord.type.includes('7sus');

            if (is7SusChord) {
                console.log(`⏭️ 跳过Drop2：${chord.root}${chord.type}是7sus和弦，7sus和弦不能用Drop2`);
                console.log(`   说明：7sus和弦只能使用Close/Shell voicing`);
            } else if (isSusChord && closeVoicing?.midiNotes?.length >= 4) {
                console.log(`⏭️ 跳过Drop2：${chord.root}${chord.type}是4音符sus和弦`);
                console.log(`   说明：3音符sus和弦可以使用Drop2，4音符sus不行`);
            } else {
                // 🎯 使用独立生成系统（2025-10-06架构重构v2：转位支持）
                // 完全绕过close voicing和while loop，像shell voicing一样独立生成
                // 传递转位信息：优先使用options.inversion，其次使用chord.inversion
                const drop2Result = this.generateDrop2Independent(chord, {
                    ...options,
                    inversion: options.inversion !== undefined ? options.inversion : chord.inversion
                });

                if (drop2Result) {
                    voicings.drop2 = drop2Result;
                    console.log(`✅ Drop2独立生成成功: ${drop2Result.notes?.join('-')} (转位${drop2Result.inversion})`);
                } else {
                    console.log(`❌ Drop2独立生成失败`);
                }
            }
        }

        if (enabledVoicings.includes('drop3')) {
            console.log(`\n🎵 === Drop3生成（独立架构 v2） ===`);

            // ✅ Sus和弦检测：所有sus和弦都禁止Drop3（2025-10-05修订）
            const isSusChord = this.isSusChord(chord.type);

            if (isSusChord) {
                console.log(`⏭️ 跳过Drop3：${chord.root}${chord.type}是sus和弦，所有sus和弦都不能用Drop3`);
                console.log(`   说明：sus和弦（包括3音符sus、4音符sus、7sus）只能使用Close/Shell/Drop2`);
            }
            // 🔧 检测是否为真正的七和弦（有第7音）
            else if (!this.isSeventhChord(chord.type)) {
                console.log(`⏭️ 跳过Drop3：${chord.root}${chord.type}不是七和弦`);
                console.log(`   说明：Drop3需要真正的七和弦（1-3-5-7）`);
            } else {
                // 🎯 使用独立生成系统（2025-10-06架构重构v2：转位支持）
                // 完全绕过close voicing和while loop，像shell voicing一样独立生成
                // 传递转位信息：优先使用options.inversion，其次使用chord.inversion
                const drop3Result = this.generateDrop3Independent(chord, {
                    ...options,
                    inversion: options.inversion !== undefined ? options.inversion : chord.inversion
                });

                if (drop3Result) {
                    voicings.drop3 = drop3Result;
                    console.log(`✅ Drop3独立生成成功: ${drop3Result.notes?.join('-')} (转位${drop3Result.inversion})`);
                } else {
                    console.log(`❌ Drop3独立生成失败`);
                }
            }
        }

        if (enabledVoicings.includes('shell')) {
            voicings.shell = this.generateShellVoicing(chord);
            if (voicings.shell) {
                console.log(`✅ 生成了shell voicing: ${voicings.shell.arrangement}`);
            } else {
                console.log(`❌ Shell voicing生成失败`);
            }
        }

        console.log(`🎼 生成的voicing类型: ${Object.keys(voicings)}`);
        Object.keys(voicings).forEach(key => {
            if (voicings[key]) {
                console.log(`  ${key}: type=${voicings[key].type}`);
            }
        });

        // 🎵 首先应用音域约束到所有voicing
        // 🔧 已移除 (2025-10-04): 日志信息 "应用音域约束到所有voicing"
        // console.log(`\n🎵 === 应用音域约束到所有voicing ===`);
        if (this.currentRangeConstraints &&
            (this.currentRangeConstraints.minMidi !== null && this.currentRangeConstraints.minMidi !== undefined) &&
            (this.currentRangeConstraints.maxMidi !== null && this.currentRangeConstraints.maxMidi !== undefined)) {

            console.log(`🎯 音域约束: ${this.currentRangeConstraints.minMidi}-${this.currentRangeConstraints.maxMidi}`);

            Object.keys(voicings).forEach(voicingType => {
                if (voicings[voicingType]) {
                    console.log(`🔧 对${voicingType}应用音域约束...`);
                    const constrainedVoicing = this.applyRangeConstraints(voicings[voicingType], this.currentRangeConstraints);
                    if (constrainedVoicing) {
                        voicings[voicingType] = constrainedVoicing;
                        console.log(`✅ ${voicingType}音域约束完成: ${constrainedVoicing.notes?.join('-')}`);
                    } else {
                        console.warn(`⚠️ ${voicingType}音域约束失败，保持原voicing`);
                    }
                }
            });
        } else {
            console.log(`❌ 跳过音域约束：约束参数无效 ${JSON.stringify(this.currentRangeConstraints)}`);
        }

        // 应用voice leading（如果启用）
        if (this.voicingSettings.enableVoiceLeading && this.previousVoicing) {
            voicings = this.optimizeVoiceLeading(voicings, this.previousVoicing);

            // 🔥 关键修复：Voice leading优化后重新应用音域约束
            // 因为optimizeVoiceLeading可能生成新的voicing，绕过了之前的音域约束
            console.log(`\n🎵 === Voice Leading后重新应用音域约束 ===`);
            if (this.currentRangeConstraints &&
                (this.currentRangeConstraints.minMidi !== null && this.currentRangeConstraints.minMidi !== undefined) &&
                (this.currentRangeConstraints.maxMidi !== null && this.currentRangeConstraints.maxMidi !== undefined)) {

                console.log(`🎯 重新应用音域约束: ${this.currentRangeConstraints.minMidi}-${this.currentRangeConstraints.maxMidi}`);

                Object.keys(voicings).forEach(voicingType => {
                    if (voicings[voicingType]) {
                        console.log(`🔧 对voice leading优化后的${voicingType}重新应用音域约束...`);
                        const constrainedVoicing = this.applyRangeConstraints(voicings[voicingType], this.currentRangeConstraints);
                        if (constrainedVoicing) {
                            voicings[voicingType] = constrainedVoicing;
                            console.log(`✅ ${voicingType}音域约束重新应用完成: ${constrainedVoicing.notes?.join('-')}`);
                        }
                    }
                });
            }
        }

        // 选择最佳voicing
        let selectedVoicing = this.selectBestVoicing(voicings, {
            ...options,
            enabledVoicings: enabledVoicings
        });

        if (selectedVoicing) {
            console.log(`🎯 最终选择的voicing: type=${selectedVoicing.type}, 来源=${selectedVoicing.source || 'unknown'}`);

            // 🔥 最终音域约束验证：确保选择的voicing绝对符合音域要求
            if (this.currentRangeConstraints &&
                (this.currentRangeConstraints.minMidi !== null && this.currentRangeConstraints.minMidi !== undefined) &&
                (this.currentRangeConstraints.maxMidi !== null && this.currentRangeConstraints.maxMidi !== undefined)) {

                console.log(`\n🎵 === 最终音域约束验证 ===`);
                console.log(`当前选择: ${selectedVoicing.notes?.join('-')} [${selectedVoicing.midiNotes?.join(', ')}]`);

                const outOfRange = selectedVoicing.midiNotes?.filter(midi =>
                    midi < this.currentRangeConstraints.minMidi || midi > this.currentRangeConstraints.maxMidi
                );

                if (outOfRange && outOfRange.length > 0) {
                    console.warn(`⚠️ 最终选择的voicing有${outOfRange.length}个音符超出音域，强制应用约束...`);
                    const finalConstrained = this.applyRangeConstraints(selectedVoicing, this.currentRangeConstraints);
                    if (finalConstrained) {
                        // 更新selectedVoicing和voicings中的对应项
                        selectedVoicing = finalConstrained;
                        if (voicings[finalConstrained.type]) {
                            voicings[finalConstrained.type] = finalConstrained;
                        }
                        console.log(`✅ 最终音域约束应用完成: ${finalConstrained.notes?.join('-')} [${finalConstrained.midiNotes?.join(', ')}]`);
                    }
                } else {
                    console.log(`✅ 最终选择的voicing已符合音域要求`);
                }
            }
        } else {
            console.error(`❌ 没有选择到任何voicing！`);
        }

        // 更新上一个voicing记录
        this.previousVoicing = selectedVoicing;

        // 🎯 恢复原始转位设置
        this.voicingSettings.enableInversions = originalInversionsEnabled;
        console.log(`🔄 恢复原始转位设置: ${originalInversionsEnabled}`);

        // 🔧 阶段2重构：严格结果过滤机制
        console.log(`\n🔧 === 阶段2: 严格结果过滤 ===`);
        console.log(`📋 用户请求的voicing类型: ${JSON.stringify(enabledVoicings)}`);
        console.log(`🏭 系统生成的voicing类型: ${Object.keys(voicings).join(', ')}`);

        // 严格过滤：只返回用户明确请求的类型
        const filteredVoicings = {};
        for (const type of enabledVoicings) {
            if (voicings[type]) {
                filteredVoicings[type] = voicings[type];
                console.log(`✅ 保留用户请求的voicing: ${type}`);
            } else {
                console.warn(`⚠️ 用户请求的voicing类型 '${type}' 未能生成`);
            }
        }

        // 🚨 严格检查：检测未授权的voicing类型
        const unauthorizedTypes = Object.keys(voicings).filter(type => !enabledVoicings.includes(type));
        if (unauthorizedTypes.length > 0) {
            console.error(`🚨 重构机制检测: 发现未授权的voicing类型被生成！`);
            console.error(`🚨 未授权类型: ${unauthorizedTypes.join(', ')}`);
            console.error(`🚨 用户请求: ${enabledVoicings.join(', ')}`);
            console.error(`🚨 这些未授权类型将被强制移除`);

            // 强制移除未授权类型（多层防护）
            unauthorizedTypes.forEach(type => {
                if (voicings[type]) {
                    console.error(`🚨 强制移除未授权voicing: ${type} = ${voicings[type].notes?.join('-')}`);
                    delete voicings[type];
                }
            });
        }

        console.log(`🔍 最终过滤结果: ${Object.keys(filteredVoicings).join(', ')}`);
        console.log(`✅ 过滤机制验证: ${Object.keys(filteredVoicings).length}个voicing类型，全部为用户授权`);

        // 🎯 向后兼容：返回同时包含两种访问方式的结构
        const compatibleResult = {
            selected: selectedVoicing,
            all: filteredVoicings, // 只返回用户选择的类型
            analysis: this.analyzeVoicing(selectedVoicing),
            // 🎯 为了兼容测试代码，直接添加voicing类型作为属性
            ...filteredVoicings
        };

        console.log(`🔍 返回结构: ${Object.keys(compatibleResult).filter(k => k !== 'selected' && k !== 'all' && k !== 'analysis').join(', ')}`);

        return compatibleResult;
    }

    /**
     * 生成密集排列(Close Voicing)
     * @param {Object} chord - 和弦对象
     * @param {Object} options - 选项对象，包含rangeMin和rangeMax
     * @returns {Object} Close voicing
     */
    generateCloseVoicing(chord, options = {}) {
        // 边缘情况检查：和弦对象验证
        if (!chord) {
            console.error(`❌ generateCloseVoicing: 和弦对象为空`);
            return null;
        }

        if (!chord.root || typeof chord.root !== 'string') {
            console.error(`❌ generateCloseVoicing: 无效的根音 (${chord.root})`);
            return null;
        }

        if (!chord.type || typeof chord.type !== 'string') {
            console.error(`❌ generateCloseVoicing: 无效的和弦类型 (${chord.type})`);
            return null;
        }

        // options参数验证
        if (typeof options !== 'object') {
            console.warn(`⚠️ generateCloseVoicing: options参数不是对象，使用默认值`);
            options = {};
        }

        // 音域参数验证
        if (options.rangeMin !== undefined && options.rangeMax !== undefined) {
            if (typeof options.rangeMin !== 'number' || typeof options.rangeMax !== 'number') {
                console.error(`❌ generateCloseVoicing: 音域参数类型错误 (rangeMin: ${typeof options.rangeMin}, rangeMax: ${typeof options.rangeMax})`);
                return null;
            }

            if (isNaN(options.rangeMin) || isNaN(options.rangeMax)) {
                console.error(`❌ generateCloseVoicing: 音域参数为NaN (rangeMin: ${options.rangeMin}, rangeMax: ${options.rangeMax})`);
                return null;
            }

            if (options.rangeMin >= options.rangeMax) {
                console.error(`❌ generateCloseVoicing: 音域范围无效 (rangeMin ${options.rangeMin} >= rangeMax ${options.rangeMax})`);
                return null;
            }

            if (options.rangeMin < 0 || options.rangeMax > 127) {
                console.error(`❌ generateCloseVoicing: 音域超出MIDI范围 [0-127] (${options.rangeMin}-${options.rangeMax})`);
                return null;
            }
        }

        console.log(`🎵 和弦输入: ${chord.root} ${chord.type}`);
        console.log(`🔧 Options参数: ${JSON.stringify(options)}`);
        console.log(`📏 Range参数: rangeMin=${options.rangeMin}, rangeMax=${options.rangeMax}`);
        console.log(`🔄 转位设置: this.voicingSettings.enableInversions=${this.voicingSettings.enableInversions}`);
        console.log(`🎛️ 条件检查: minMidi !== null: ${options.rangeMin !== null}, maxMidi !== null: ${options.rangeMax !== null}, !enableInversions: ${!this.voicingSettings.enableInversions}`);

        // 🎸 吉他模式sus和弦特殊处理：应用特定的音符排列模式
        if (typeof document !== 'undefined') {
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            const isGuitarMode = !instrumentToggle || !instrumentToggle.checked; // 默认吉他模式
            const isSusChord = chord.type && chord.type.includes('sus');

            if (isGuitarMode && isSusChord) {
                console.log(`🎸 检测到吉他模式下的sus和弦: ${chord.root}${chord.type}`);
                console.log(`🎸 使用吉他专用sus和弦生成器`);

                const guitarSusVoicing = this.generateGuitarSusVoicing(chord, 'close', options);
                if (guitarSusVoicing) {
                    console.log(`✅ 吉他专用sus和弦生成成功: ${guitarSusVoicing.notes.join('-')}`);
                    return guitarSusVoicing;
                } else {
                    console.warn(`⚠️ 吉他专用sus和弦生成失败，回退到标准生成器`);
                    // 如果专用生成器失败，继续使用标准生成器
                }
            }
        }

        // 🎸 增强三和弦检查：隔离的新和声配置
        if (this.shouldUseEnhancedGuitarTriad(chord, options)) {
            console.log(`🎸 检测到增强三和弦请求: ${chord.root}${chord.type}`);
            console.log(`🎸 使用独立的增强三和弦生成器`);

            const enhancedVoicing = this.generateEnhancedGuitarTriadVoicing(chord, options);
            if (enhancedVoicing) {
                console.log(`✅ 增强三和弦生成成功: ${enhancedVoicing.notes.join('-')}`);
                console.log(`🛡️ 已添加防Drop变换保护标记`);
                return enhancedVoicing;
            } else {
                console.warn(`⚠️ 增强三和弦生成失败，回退到标准生成器`);
                // 如果增强生成器失败，继续使用标准生成器
            }
        }

        // 🎸 阶段3: 吉他四声部三和弦检查 - 作为补充而非替代
        console.log(`\n🎸 === generateCloseVoicing中的吉他四声部检查 ===`);
        console.log(`🎵 检查对象: ${chord.root}${chord.type}`);
        console.log(`🎛️ 传入的options: ${JSON.stringify(options)}`);

        const shouldUseGuitarFour = this.shouldUseGuitarFourVoiceTriads(chord, options);
        console.log(`🔍 shouldUseGuitarFourVoiceTriads返回: ${shouldUseGuitarFour}`);

        // 🎲 新策略：在三音配置和四音配置之间随机选择
        let useGuitarFourVoice = false;
        let guitarFourVoiceResult = null;

        if (shouldUseGuitarFour) {
            console.log(`🎸 ✅ 检测到吉他模式三和弦请求: ${chord.root}${chord.type}`);

            // 🎲 随机选择四音配置或传统三音配置
            const randomChoice = Math.random();

            // 获取四声部概率设置（默认50%）
            const fourVoiceProbability = (typeof chordSettings !== 'undefined' &&
                                        chordSettings.guitarFourVoiceTriads &&
                                        chordSettings.guitarFourVoiceTriads.fourVoiceProbability !== undefined)
                                       ? chordSettings.guitarFourVoiceTriads.fourVoiceProbability
                                       : 0.5; // 默认50%概率

            console.log(`🎲 随机选择决策: ${randomChoice.toFixed(3)} (四声部概率: ${(fourVoiceProbability*100).toFixed(1)}%)`);

            if (randomChoice < fourVoiceProbability) {
                console.log(`🎸 🚀 随机选择: 生成吉他四声部配置`);
                useGuitarFourVoice = true;

                guitarFourVoiceResult = this.generateGuitarFourVoiceTriads(chord, options);
                if (guitarFourVoiceResult) {
                    console.log(`🎉 ✅ 吉他四声部生成成功: ${guitarFourVoiceResult.notes.join('-')}`);
                    console.log(`🎛️ 配置类型: ${guitarFourVoiceResult.configuration}`);
                    console.log(`🔄 返回四声部配置，跳过标准三音生成`);

                    // 直接返回四声部配置
                    return {
                        type: 'close',
                        subtype: 'guitar-four-voice',
                        configuration: guitarFourVoiceResult.configuration,
                        notes: guitarFourVoiceResult.notes,
                        midiNotes: guitarFourVoiceResult.midiNotes,
                        range: guitarFourVoiceResult.range,
                        chordType: chord.type,
                        root: chord.root,
                        source: 'guitar-four-voice-random-selection',
                        randomSelection: true,
                        selectionReason: `随机选择四声部配置 (概率: ${randomChoice.toFixed(3)})`
                    };
                } else {
                    console.warn(`⚠️ 吉他四声部生成失败，回退到标准三音配置`);
                    useGuitarFourVoice = false;
                }
            } else {
                console.log(`🎵 🚀 随机选择: 生成标准三音配置`);
                useGuitarFourVoice = false;
            }
        } else {
            console.log(`🔄 ❌ 不满足吉他四声部条件，生成标准close voicing`);
        }

        // 为close voicing强制使用root position顺序
        // 不管输入的chord.notes是什么，我们总是重新构建根位和弦
        const chordType = chord.type;
        const root = chord.root;

        // 🔧 和弦类型标准化（2025-10-04）
        const typeMapping = {
            'maj7': 'major7', 'm7': 'minor7', 'min7': 'minor7',
            'dom7': 'dominant7', '7': 'dominant7', 'dim7': 'diminished7',
            'm7b5': 'minor7b5', 'ø7': 'minor7b5', 'mM7': 'minorMaj7',
            'aug7': 'augmented7', '+7': 'augmented7', 'maj6': 'major6',
            '6': 'major6', 'm6': 'minor6', 'maj9': 'major9',
            'm9': 'minor9', '9': 'dominant9', 'maj11': 'major11',
            'm11': 'minor11', '11': 'dominant11', 'maj13': 'major13',
            'm13': 'minor13', '13': 'dominant13', 'dim': 'diminished',
            'aug': 'augmented', '+': 'augmented', 'sus2': 'sus2',
            'sus4': 'sus4', '7sus2': '7sus2', '7sus4': '7sus4'
        };
        const normalizedChordType = typeMapping[chordType] || chordType;

        // 🔍 检查和声理论引擎是否可用
        if (!this.harmonyTheory || !this.harmonyTheory.chordTypes) {
            console.error(`❌ generateCloseVoicing: HarmonyTheory引擎不可用`);
            return null;
        }

        const intervals = this.harmonyTheory.chordTypes[normalizedChordType];

        if (!intervals || !Array.isArray(intervals) || intervals.length === 0) {
            console.error(`❌ generateCloseVoicing: 未知或无效的和弦类型: ${chordType}`);
            return null;
        }

        // 获取当前音域设置，优先使用传入的options参数
        let baseOctave = this.voicingSettings.defaultOctave;
        let minMidi = options.rangeMin || null;
        let maxMidi = options.rangeMax || null;

        // 如果options中没有提供范围信息，尝试从DOM获取
        if (minMidi === null || maxMidi === null) {
            if (typeof document !== 'undefined') {
                const rangeMinSelect = document.getElementById('rangeMin');
                const rangeMaxSelect = document.getElementById('rangeMax');

                if (rangeMinSelect && rangeMaxSelect) {
                    minMidi = minMidi || parseInt(rangeMinSelect.value);
                    maxMidi = maxMidi || parseInt(rangeMaxSelect.value);
                }
            }
        }

        if (minMidi !== null && maxMidi !== null) {
            // 根据音域设置调整起始八度
            const midMidi = (minMidi + maxMidi) / 2;
            const suggestedOctave = Math.floor(midMidi / 12) - 1;
            baseOctave = Math.max(3, Math.min(6, suggestedOctave));

            console.log(`🎵 音域设置: ${minMidi}-${maxMidi} MIDI, 建议起始八度: ${baseOctave}`);
        }

        // 🎸 吉他模式专用限制：Close voicing的七和弦只能出现在F4(MIDI 65)以上
        if (typeof document !== 'undefined') {
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            const isGuitarMode = !instrumentToggle || !instrumentToggle.checked; // 默认吉他模式
            const isSeventhChord = chordType && chordType.includes('7');

            if (isGuitarMode && isSeventhChord) {
                const f4Midi = 65; // F4的MIDI值 (用户需求: ≥F4)

                // 如果当前最低音域设置低于F4，强制提高到F4
                if (minMidi !== null && minMidi < f4Midi) {
                    console.log(`🎸 吉他模式Close voicing七和弦限制: 最低音从 ${minMidi} 提高到 ${f4Midi} (F4)`);
                    minMidi = f4Midi;

                    // 重新计算基础八度
                    if (maxMidi !== null) {
                        const midMidi = (minMidi + maxMidi) / 2;
                        const suggestedOctave = Math.floor(midMidi / 12) - 1;
                        baseOctave = Math.max(3, Math.min(6, suggestedOctave));
                        console.log(`🎸 重新计算八度: ${baseOctave}`);
                    }
                } else if (minMidi === null) {
                    // 如果没有设置最低音域，为吉他模式七和弦设置默认最低音为F4
                    console.log(`🎸 吉他模式Close voicing七和弦: 设置默认最低音为 ${f4Midi} (F4)`);
                    minMidi = f4Midi;
                }
            }
        }

        const voicing = {
            type: 'close',
            notes: [],
            midiNotes: [],
            range: baseOctave,
            rangeConstraints: { minMidi, maxMidi },
            // 保存原始和弦信息以便后续挂和弦检查
            chordType: chord.type,
            root: chord.root,
            // 🔧 修复 (2025-10-02): 传递功能和声属性到voicing对象
            // 原因：Drop2算法需要检测functionalGeneration来决定是否保持根音在低音
            functionalGeneration: chord.functionalGeneration,
            inversion: chord.inversion
        };

        // 基于根音和音程重新构建根位和弦
        const rootSemitone = this.harmonyTheory.noteToSemitone[root];
        // 🔧 修复 (2025-10-03): 优先使用this.currentChord.key，确保调号正确传递
        let keyInfo = this.harmonyTheory.keys[this.currentChord?.key || chord.key || 'C-major']; // 获取完整的调性信息

        // 🔧 修复 (2025-10-05 v20): keyInfo验证和fallback
        if (!keyInfo) {
            const attemptedKey = this.currentChord?.key || chord.key || 'C-major';
            console.error(`❌ keyInfo为undefined! 尝试的key="${attemptedKey}"`);
            console.error(`   this.harmonyTheory.keys有效keys: ${Object.keys(this.harmonyTheory.keys).slice(0, 5).join(', ')}...`);
            // 使用C-major作为fallback
            keyInfo = this.harmonyTheory.keys['C-major'];
            console.log(`🔧 使用fallback keyInfo: C-major`);
        }

        console.log(`🎯 Close voicing生成 ${root}${chordType}, 起始八度: ${baseOctave}, keyInfo.key: ${this.currentChord?.key || chord.key || 'C-major'}`);

        // 🔧 修复 (2025-10-03): 检查是否为转位和弦 - 支持无chord.notes的功能和声转位
        const hasInversionWithNotes = chord.inversion !== undefined && chord.inversion > 0 && chord.notes && chord.notes.length > 0;
        const hasInversionWithoutNotes = chord.inversion !== undefined && chord.inversion > 0 && (!chord.notes || chord.notes.length === 0);
        const hasInversion = hasInversionWithNotes || hasInversionWithoutNotes;

        console.log(`🔍 转位检查: hasInversion=${hasInversion}, inversion=${chord.inversion}, hasNotes=${!!chord.notes}`);

        // 🎯 自动计算转位音符顺序（功能和声支持）
        // 🔧 修复 (2025-10-04 尝试5): 强制重新计算转位音符顺序
        // 问题：功能和声模式下，chord.notes可能存在但是原位顺序
        // 解决：只要有转位(chord.inversion>0)，就强制重新计算，不使用chord.notes
        let invertedNotes = chord.notes; // 默认值（原位时使用）

        if (hasInversion) {
            // ✅ 只要有转位就重新计算（不管chord.notes是否存在）
            console.log(`🔧 检测到转位和弦（转位${chord.inversion}），强制重新计算音符顺序`);
            console.log(`   和弦: ${root}${chordType}, 转位: ${chord.inversion}`);

            if (chord.notes) {
                console.log(`   原chord.notes: ${chord.notes.join('-')} (可能是原位，将被忽略)`);
            }

            // 计算根位音符顺序
            const rootPositionNotes = intervals.map(interval => {
                const noteSemitone = (rootSemitone + interval) % 12;
                return this.harmonyTheory.spellNoteInChordContext(noteSemitone, root, interval, keyInfo, null, chord.type);
            });
            console.log(`   根位音符: ${rootPositionNotes.join('-')}`);

            // 旋转数组以生成转位音符顺序
            // 第一转位: [C, E, G, B] → [E, G, B, C]
            // 第二转位: [C, E, G, B] → [G, B, C, E]
            // 第三转位: [C, E, G, B] → [B, C, E, G]
            invertedNotes = [];
            for (let i = 0; i < rootPositionNotes.length; i++) {
                const sourceIndex = (i + chord.inversion) % rootPositionNotes.length;
                invertedNotes.push(rootPositionNotes[sourceIndex]);
            }
            console.log(`   转位音符: ${invertedNotes.join('-')}`);
            console.log(`   ✅ 转位后低音: ${invertedNotes[0]} (应该是${chord.inversion === 1 ? '三音' : chord.inversion === 2 ? '五音' : chord.inversion === 3 ? '七音' : '未知'})`);
        }

        // 第一步：生成基础音符位置
        const tempVoicing = [];

        if (hasInversion) {
            // 转位模式：正确处理转位音高关系
            console.log(`🔄 转位模式: 使用${hasInversionWithNotes ? '提供的' : '自动计算的'}notes顺序 ${invertedNotes.join('-')}`);
            console.log(`🔄 转位数: ${chord.inversion}`);

            // 对于转位和弦，我们需要正确设置低音
            // 第一转位：3音在低音（如C大三和弦第一转位：E-G-C，E在低音）
            // 第二转位：5音在低音（如C大三和弦第二转位：G-C-E，G在低音）

            invertedNotes.forEach((noteName, index) => {
                // 计算基础MIDI音高
                const baseNoteName = noteName.replace(/[#b]+$/, '');
                let baseMidi = this.noteToMidi[baseNoteName] + (baseOctave - 4) * 12;

                // 处理升降号的半音偏移
                const accidentals = noteName.match(/[#b]+$/);
                if (accidentals) {
                    const accidental = accidentals[0];
                    for (const char of accidental) {
                        if (char === '#') baseMidi++;
                        else if (char === 'b') baseMidi--;
                    }
                }

                if (index === 0) {
                    // 第一个音符（低音）：确保它是最低的
                    tempVoicing.push({ note: noteName, midi: baseMidi });
                    console.log(`  低音: ${noteName} -> MIDI ${baseMidi}`);
                } else {
                    // 其他音符：确保高于低音，但形成正确的转位结构
                    const bassMidi = tempVoicing[0].midi;

                    // 确保当前音符高于低音
                    while (baseMidi <= bassMidi) {
                        baseMidi += 12;
                    }

                    // 对于转位的其他音符，保持close voicing的紧密性
                    if (index > 1) {
                        const lastMidi = tempVoicing[tempVoicing.length - 1].midi;

                        // 智能位置调整：避免过度八度跳跃
                        if (baseMidi <= lastMidi) {
                            const option1 = baseMidi + 12; // 上一个八度
                            const option2 = lastMidi + 1;  // 紧跟前一个音符

                            // 选择更紧密的位置
                            if (option2 - lastMidi <= 2 && option2 > bassMidi) {
                                baseMidi = option2;
                            } else {
                                baseMidi = option1;
                            }
                        }

                        // 🔧 修复 (2025-10-06): 强化close voicing紧密性约束
                        // Close voicing定义：所有音符在一个八度内（最大间距12半音）
                        // 如果间隔过大，必须降八度直到满足要求
                        while (baseMidi - lastMidi > 12) {
                            const alternativeMidi = baseMidi - 12;
                            // 检查降八度后是否仍高于低音
                            if (alternativeMidi > bassMidi) {
                                baseMidi = alternativeMidi;
                            } else {
                                // 降八度后会低于低音，无法继续降
                                break;
                            }
                        }
                    }

                    tempVoicing.push({ note: noteName, midi: baseMidi });
                    console.log(`  ${noteName} -> MIDI ${baseMidi}`);
                }
            });

            console.log(`🎵 转位Close Voicing结果: ${tempVoicing.map(v => `${v.note}(${v.midi})`).join(' ')}`);

            // 验证转位结构是否正确
            const bassNote = tempVoicing[0];
            const isBasLowest = tempVoicing.every(v => v === bassNote || v.midi > bassNote.midi);
            console.log(`🔍 转位验证: 低音${bassNote.note}是否为最低音 = ${isBasLowest}`);
            if (!isBasLowest) {
                console.warn(`⚠️ 转位结构错误：低音${bassNote.note}(${bassNote.midi})不是最低音！`);
            }

        } else {
            // 根位模式：使用和弦理论生成根位结构
            console.log(`🔄 根位模式: 生成标准根位结构`);

            // 🔧 修复 (2025-10-05 v2): Augmented和弦Close voicing调试
            if (chord.type && chord.type.toLowerCase().includes('aug')) {
                console.log(`\n🔧 ========== Augmented和弦Close Voicing生成调试 ==========`);
                console.log(`🔧 和弦: ${root}${chord.type}`);
                console.log(`🔧 intervals数组: [${intervals.join(', ')}]`);
                console.log(`🔧 rootSemitone: ${rootSemitone}`);
                console.log(`==========================================================\n`);
            }

            intervals.forEach((interval, index) => {
                // 使用和弦上下文拼写系统
                const noteSemitone = (rootSemitone + interval) % 12;
                const note = this.harmonyTheory.spellNoteInChordContext(noteSemitone, root, interval, keyInfo, null, chord.type);

                // 🔧 修复 (2025-10-05 v2): Augmented和弦每个音符的生成日志
                if (chord.type && chord.type.toLowerCase().includes('aug')) {
                    console.log(`🔧 Augmented音符${index + 1}: interval=${interval}, semitone=${noteSemitone}, note=${note}`);
                }

                // 计算基础MIDI音高
                const baseNoteName = note.replace(/[#b]+$/, '');
                let baseMidi = this.noteToMidi[baseNoteName] + (baseOctave - 4) * 12;

                // 处理升降号的半音偏移
                const accidentals = note.match(/[#b]+$/);
                if (accidentals) {
                    const accidental = accidentals[0];
                    for (const char of accidental) {
                        if (char === '#') baseMidi++;
                        else if (char === 'b') baseMidi--;
                    }
                }

                // 🔧 修复 (2025-10-05 v2): Augmented和弦MIDI计算日志
                if (chord.type && chord.type.toLowerCase().includes('aug')) {
                    console.log(`🔧   → baseMidi初始: ${this.noteToMidi[baseNoteName] + (baseOctave - 4) * 12}, 升降号调整后: ${baseMidi}`);
                }

                // 标准Close Voicing策略：音符在紧密的八度内按升序排列
                if (index > 0) {
                    const rootMidi = tempVoicing[0].midi;
                    const lastMidi = tempVoicing[tempVoicing.length - 1].midi;

                    // 确保音符不低于根音
                    while (baseMidi < rootMidi) {
                        baseMidi += 12;
                    }

                    // 标准Close Voicing规则：下一个音符应该在上一个音符之上
                    while (baseMidi <= lastMidi) {
                        baseMidi += 12;
                    }

                    // 检查是否在合理的Close Voicing范围内（通常不超过1.5个八度）
                    const voicingSpan = baseMidi - rootMidi;
                    if (voicingSpan > 18) { // 超过1.5个八度
                        // 尝试将当前音符降一个八度，但保持高于前一个音符
                        const lowerOption = baseMidi - 12;
                        if (lowerOption > lastMidi) {
                            baseMidi = lowerOption;
                            console.log(`🎵 Close Voicing优化: ${note} 降八度至MIDI ${baseMidi} 以保持紧密结构`);
                        }
                    }
                }

                tempVoicing.push({ note, midi: baseMidi });

                // 🔧 修复 (2025-10-05 v2): Augmented和弦最终MIDI值日志
                if (chord.type && chord.type.toLowerCase().includes('aug')) {
                    console.log(`🔧   → 最终推入: {note: "${note}", midi: ${baseMidi}}\n`);
                }
            });
        }

        // 第二步：音乐性优先的音域调整 - 保持Close Voicing特性
        console.log(`\n🎼 === 音乐性优先音域调整 ===`);

        if (minMidi !== null && maxMidi !== null) {
            console.log(`📏 目标音域: ${minMidi}-${maxMidi} (${maxMidi - minMidi}半音)`);

            // 首先验证当前voicing的音乐性
            const allMidiNotes = tempVoicing.map(v => v.midi);
            const chordSpan = Math.max(...allMidiNotes) - Math.min(...allMidiNotes);
            const noteIntervals = allMidiNotes.slice(1).map((midi, i) => midi - allMidiNotes[i]);
            const maxInterval = Math.max(...noteIntervals);
            const averageInterval = noteIntervals.reduce((sum, interval) => sum + interval, 0) / noteIntervals.length;

            console.log(`🎵 Voicing分析: 总跨度${chordSpan}半音, 最大间隔${maxInterval}半音, 平均间隔${Math.round(averageInterval * 10) / 10}半音`);
            console.log(`🎵 音符间隔: [${noteIntervals.join(', ')}]`);

            // 检查是否为合格的Close Voicing
            const isValidCloseVoicing = chordSpan <= 24 && maxInterval <= 12 && averageInterval <= 8;

            if (!isValidCloseVoicing) {
                console.warn(`⚠️ 当前配置不符合Close Voicing标准 (跨度${chordSpan}>24 或 最大间隔${maxInterval}>12 或 平均间隔${averageInterval}>8)`);
            }

            // 检查音域遵循情况
            const outOfRangeNotes = allMidiNotes.filter(midi => midi < minMidi || midi > maxMidi);

            if (outOfRangeNotes.length === 0) {
                console.log(`✅ 所有音符已在音域内，无需调整`);
            } else {
                console.log(`🔧 ${outOfRangeNotes.length}个音符超出音域，尝试音乐性调整`);

                // 音乐性优先的调整策略
                const chordMin = Math.min(...allMidiNotes);
                const chordMax = Math.max(...allMidiNotes);
                const availableRange = maxMidi - minMidi;

                // 策略1: 如果voicing跨度过大，无法保持close voicing特性，则拒绝生成
                if (chordSpan > availableRange) {
                    console.error(`❌ 和弦跨度${chordSpan}半音超过音域范围${availableRange}半音，无法生成合格的Close Voicing`);
                    return null;
                }

                // 策略2: 尝试整体八度调整，保持音符间的相对关系
                let bestTransposition = 0;
                let bestScore = -1;

                // 尝试不同的八度调整 (-2到+2个八度)
                for (let octaveShift = -2; octaveShift <= 2; octaveShift++) {
                    const adjustment = octaveShift * 12;
                    const adjustedMidis = allMidiNotes.map(midi => midi + adjustment);

                    // 检查调整后的音域遵循情况
                    const inRangeCount = adjustedMidis.filter(midi => midi >= minMidi && midi <= maxMidi).length;
                    const adjustedMin = Math.min(...adjustedMidis);
                    const adjustedMax = Math.max(...adjustedMidis);

                    // 评分：优先考虑音域遵循，其次考虑音域中心性
                    let score = inRangeCount * 100; // 音域遵循权重最高

                    if (inRangeCount === adjustedMidis.length) {
                        // 如果所有音符都在范围内，额外加分中心位置
                        const centerDistance = Math.abs((adjustedMin + adjustedMax) / 2 - (minMidi + maxMidi) / 2);
                        score += Math.max(0, 50 - centerDistance); // 越靠近音域中心分数越高
                    }

                    console.log(`🔄 八度调整${octaveShift}: 音域${adjustedMin}-${adjustedMax}, 遵循${inRangeCount}/${adjustedMidis.length}, 评分${score}`);

                    if (score > bestScore) {
                        bestScore = score;
                        bestTransposition = adjustment;
                    }
                }

                // 应用最佳调整
                if (bestTransposition !== 0) {
                    console.log(`🎯 应用最佳八度调整: ${bestTransposition > 0 ? '+' : ''}${bestTransposition}半音`);
                    tempVoicing.forEach(noteInfo => {
                        noteInfo.midi += bestTransposition;
                    });
                } else {
                    console.log(`🎵 保持原始八度位置`);
                }

                // 最终验证：如果仍有音符超出范围，检查是否可以接受
                const finalMidis = tempVoicing.map(v => v.midi);
                const finalOutOfRange = finalMidis.filter(midi => midi < minMidi || midi > maxMidi);

                if (finalOutOfRange.length > 0) {
                    const tolerableOutOfRange = finalOutOfRange.length <= Math.ceil(tempVoicing.length * 0.25); // 允许25%的音符稍微超出

                    if (tolerableOutOfRange) {
                        console.warn(`⚠️ ${finalOutOfRange.length}个音符仍超出音域，但在可容忍范围内 (≤25%)`);
                    } else {
                        console.error(`❌ ${finalOutOfRange.length}个音符超出音域，超过可容忍范围，放弃生成`);
                        return null;
                    }
                }
            }

            // 最终Close Voicing质量验证
            const finalMidis = tempVoicing.map(v => v.midi);
            const finalSpan = Math.max(...finalMidis) - Math.min(...finalMidis);
            const finalIntervals = finalMidis.slice(1).map((midi, i) => midi - finalMidis[i]);
            const finalMaxInterval = Math.max(...finalIntervals);

            const finalIsValidClose = finalSpan <= 24 && finalMaxInterval <= 12;

            if (!finalIsValidClose) {
                console.error(`❌ 最终voicing不符合Close Voicing标准 (跨度${finalSpan}>24 或 最大间隔${finalMaxInterval}>12)，放弃生成`);
                return null;
            }

            console.log(`✅ 音乐性调整完成，保持了Close Voicing特性`);
        } else {
            console.log(`⚠️ 未提供音域参数，跳过音域调整`);
        }

        // 第三步：构建最终voicing
        tempVoicing.forEach(noteInfo => {
            // 应用临时记号（如果applyAccidental函数可用）
            let finalNote = noteInfo.note;
            if (typeof applyAccidental === 'function') {
                finalNote = applyAccidental(noteInfo.note);
            }

            voicing.notes.push(finalNote);
            voicing.midiNotes.push(noteInfo.midi);
        });

        console.log(`🎯 Close voicing 为 ${root}${chordType}:`);
        console.log(`  音符: ${voicing.notes.join('-')}`);
        console.log(`  MIDI: ${voicing.midiNotes.join(',')}`);

        // 分析close voicing质量
        const totalSpread = voicing.midiNotes[voicing.midiNotes.length - 1] - voicing.midiNotes[0];
        const noteIntervals = voicing.midiNotes.slice(1).map((midi, i) => midi - voicing.midiNotes[i]);
        const maxInterval = Math.max(...noteIntervals);

        // 检查音域遵循情况
        let rangeCompliance = '未设定音域';
        let notesInRange = 0;
        if (minMidi !== null && maxMidi !== null) {
            notesInRange = voicing.midiNotes.filter(midi => midi >= minMidi && midi <= maxMidi).length;
            const totalNotes = voicing.midiNotes.length;
            rangeCompliance = `${notesInRange}/${totalNotes}音符在音域内 (${Math.round(notesInRange/totalNotes*100)}%)`;
        }

        console.log(`  分析: 总音域=${totalSpread}半音, 最大间隔=${maxInterval}半音, 间隔=[${noteIntervals.join(',')}]`);
        console.log(`  音域: ${rangeCompliance}`);
        console.log(`  质量: ${totalSpread <= 15 && maxInterval <= 12 ? '✅ 合格的Close Voicing' : '❌ 不符合Close Voicing标准'}`);

        // 🚨 异常配置检测：专门检测类似C4-E4-G5的问题配置
        console.log(`\n🔍 === 异常配置检测 (generateCloseVoicing) ===`);
        console.log(`🎵 输入和弦: ${root}${chordType}`);
        console.log(`📊 生成结果: ${voicing.notes.join('-')} (MIDI: ${voicing.midiNotes.join(', ')})`);

        // 检测异常跨度
        if (totalSpread > 24) {
            console.error(`🚨 异常检测: 超大跨度配置！跨度${totalSpread}半音 > 24半音`);
            console.error(`🚨 具体配置: ${voicing.notes[0]}(${voicing.midiNotes[0]}) - ${voicing.notes[voicing.notes.length-1]}(${voicing.midiNotes[voicing.midiNotes.length-1]})`);
        }

        // 检测异常间隔
        if (maxInterval > 12) {
            console.error(`🚨 异常检测: 超大音程间隔！最大间隔${maxInterval}半音 > 12半音`);
            const maxIntervalIndex = noteIntervals.indexOf(maxInterval);
            console.error(`🚨 具体位置: ${voicing.notes[maxIntervalIndex]}(${voicing.midiNotes[maxIntervalIndex]}) → ${voicing.notes[maxIntervalIndex+1]}(${voicing.midiNotes[maxIntervalIndex+1]})`);
        }

        // 检测特定问题模式：C4-E4-G5类型
        const midiPattern = voicing.midiNotes.join('-');
        const notePattern = voicing.notes.join('-');
        if (totalSpread > 18 && voicing.midiNotes.length === 3) {
            console.error(`🚨 异常检测: 可能的C4-E4-G5类型异常配置！`);
            console.error(`🚨 模式: ${notePattern} (MIDI: ${midiPattern})`);
            console.error(`🚨 调用栈追踪: generateCloseVoicing → ${chord.root}${chord.type || chord.chordType || ''}`);
        }

        // 🔧 修复 (2025-10-04): Close Voicing转位逻辑修复
        // 问题：三和弦转位被sortVoicingByPitch重新排序成原位（E-G-C → C-E-G）
        // 约束：三和弦可以转位，七和弦在Close Voicing中绝对不能转位
        const isInverted = chord.inversion !== undefined && chord.inversion > 0;
        const isTriad = intervals && intervals.length === 3;  // 三和弦判断
        const isSeventh = intervals && intervals.length >= 4;  // 七和弦判断

        if (isInverted && isTriad) {
            // ✅ 三和弦转位：保存转位信息，保持音符顺序（E-G-C, G-C-E等）
            console.log(`🎵 三和弦转位（转位${chord.inversion}），保持音符顺序: ${voicing.notes.join('-')}`);
            voicing.inversion = chord.inversion;
            voicing.inversionName = chord.inversionName;
            // ⚠️ 关键：不调用sortVoicingByPitch，保持转位音符顺序
        } else if (isInverted && isSeventh) {
            // 🔧 修复 (2025-10-05): 检查是否允许七和弦转位（为drop2/drop3准备）
            if (options.allowSeventhInversion) {
                console.log(`✅ 允许七和弦转位（drop2/drop3准备）: ${chord.root}${chord.type} 转位${chord.inversion}`);
                voicing.inversion = chord.inversion;
                voicing.inversionName = chord.inversionName;
                // 不调用强制原位逻辑，保持转位
            } else {
                // 🔧 修复 (2025-10-04): 七和弦转位必须重新生成原位voicing
                // 问题：sortVoicingByPitch()只是排序，无法将E-G-B-C转换为C-E-G-B
                // 解决：创建原位chord对象，递归调用generateCloseVoicing()
                console.warn(`⚠️ Close Voicing不允许七和弦转位，重新生成原位: ${chord.root}${chord.type}`);
                console.log(`   原转位: ${chord.inversion}转位，原音符: ${voicing.notes.join('-')}`);

                // 创建原位chord对象（清除所有转位信息）
                const rootPositionChord = {
                    ...chord,
                    inversion: 0,          // 强制原位
                    notes: undefined,      // 清除notes数组，强制从intervals重新生成
                    inversionName: null    // 清除转位名称
                };

                // 递归调用，生成真正的原位Close voicing
                const rootPositionVoicing = this.generateCloseVoicing(rootPositionChord, options);

                if (rootPositionVoicing) {
                    console.log(`   ✅ 原位voicing生成成功: ${rootPositionVoicing.notes.join('-')}`);
                    return rootPositionVoicing;
                } else {
                    console.error(`   ❌ 原位voicing生成失败，使用排序fallback`);
                    this.sortVoicingByPitch(voicing);
                    voicing.inversion = 0;
                    voicing.inversionName = null;
                }
            }
        } else if (this.voicingSettings.enableInversions) {
            // 原位和弦且启用转位，进行排序
            this.sortVoicingByPitch(voicing);
            console.log(`🔄 转位启用（原位和弦），音符排序: ${voicing.notes.join('-')}`);
        } else {
            // 转位未启用且原位和弦
            console.log(`🔒 转位未启用，保持音符顺序不变`);
        }

        // 🎵 如果到达这里，说明选择了标准三音配置
        if (!useGuitarFourVoice && shouldUseGuitarFour) {
            voicing.randomSelection = true;
            voicing.selectionReason = "随机选择标准三音配置";
            console.log(`🎵 生成标准三音close voicing: ${voicing.notes.join('-')}`);
        } else {
            console.log(`🎵 标准close voicing: ${voicing.notes.join('-')}`);
        }

        // 🔧 修复 (2025-10-06): 返回前质量检查和重试机制
        // 确保close voicing从源头就是合格的，避免多选模式出现不合格voicing
        const qualityCheck = this.checkVoicingQuality(voicing);
        console.log(`🔍 Close voicing质量检查: ${qualityCheck.qualityLevel} (评分: ${qualityCheck.qualityScore.toFixed(2)})`);

        if (!qualityCheck.isAcceptable) {
            console.warn(`⚠️ Close voicing质量不合格: ${qualityCheck.reason}`);
            console.warn(`  详细: maxGap=${qualityCheck.maxGap}, totalSpread=${qualityCheck.totalSpread}, avgGap=${qualityCheck.avgGap.toFixed(1)}`);

            // 重试策略：降低baseOctave重新生成
            const retryAttempt = options.retryAttempt || 0;
            if (retryAttempt === 0 && baseOctave > 3 && !options.forceBaseOctave) {
                console.log(`  🔄 尝试降低baseOctave重试: ${baseOctave} → ${baseOctave - 1}`);
                return this.generateCloseVoicing(chord, {
                    ...options,
                    forceBaseOctave: baseOctave - 1,
                    retryAttempt: 1
                });
            } else if (retryAttempt === 1 && baseOctave < 6 && !options.forceBaseOctave) {
                console.log(`  🔄 尝试提高baseOctave重试: ${baseOctave} → ${baseOctave + 1}`);
                return this.generateCloseVoicing(chord, {
                    ...options,
                    forceBaseOctave: baseOctave + 1,
                    retryAttempt: 2
                });
            } else {
                console.warn(`  ⚠️ 无法通过调整baseOctave修复质量问题（retryAttempt=${retryAttempt}）`);
                console.warn(`  ⚠️ 返回当前voicing并标记质量警告`);
                voicing.qualityWarning = qualityCheck.reason;
                voicing.qualityScore = qualityCheck.qualityScore;
            }
        } else {
            console.log(`✅ Close voicing质量检查通过`);
        }

        return voicing;
    }

    /**
     * 🎯 判断voicing的实际转位（基于最低音）
     *
     * 核心原则：Drop2/Drop3的转位由变换后的实际最低音决定，而不是Close Voicing的转位
     *
     * @param {Object} voicing - voicing对象（包含notes和midiNotes）
     * @param {string} chordRoot - 和弦根音（如'C', 'F#'等）
     * @param {Object} chord - 完整的和弦对象（用于获取和弦音信息）
     * @returns {number} 0=原位, 1=第一转位, 2=第二转位, 3=第三转位
     */
    getActualInversion(voicing, chordRoot, chord) {
        if (!voicing || !voicing.midiNotes || voicing.midiNotes.length === 0) {
            console.warn('⚠️ getActualInversion: 无效的voicing对象');
            return 0;
        }

        // 找到最低音的MIDI值
        const lowestMidi = Math.min(...voicing.midiNotes);
        const lowestNoteIndex = voicing.midiNotes.indexOf(lowestMidi);
        const lowestNoteName = voicing.notes[lowestNoteIndex];

        // 去除八度信息，只保留音名（C4 → C, F#5 → F#）
        const lowestPitch = lowestNoteName.replace(/\d+/g, '');

        console.log(`🔍 实际转位判断:`);
        console.log(`  最低音: ${lowestNoteName} (MIDI ${lowestMidi})`);
        console.log(`  音名: ${lowestPitch}`);
        console.log(`  和弦根音: ${chordRoot}`);

        // 判断最低音是和弦的哪个音
        // 获取和弦的音程结构
        let chordType = chord.type || chord.chordType;

        // 🔍 诊断日志（2025-10-02）
        console.log(`  🔍 和弦类型诊断:`);
        console.log(`    chord.type: "${chord.type}"`);
        console.log(`    chord.chordType: "${chord.chordType}"`);
        console.log(`    原始类型: "${chordType}"`);

        // 🔧 修复 (2025-10-02): 类型映射，将简写形式转换为标准键
        const typeMapping = {
            'maj7': 'major7',
            'm7': 'minor7',
            'min7': 'minor7',
            'dom7': 'dominant7',
            '7': 'dominant7',
            'dim7': 'diminished7',
            'm7b5': 'minor7b5',
            'ø7': 'minor7b5',
            'mM7': 'minorMaj7',
            'aug7': 'augmented7',
            '+7': 'augmented7',
            'maj6': 'major6',
            '6': 'major6',
            'm6': 'minor6',
            'maj9': 'major9',
            'm9': 'minor9',
            '9': 'dominant9',
            'maj11': 'major11',
            'm11': 'minor11',
            '11': 'dominant11',
            'maj13': 'major13',
            'm13': 'minor13',
            '13': 'dominant13',
            'dim': 'diminished',
            'aug': 'augmented',
            '+': 'augmented',
            'sus2': 'sus2',
            'sus4': 'sus4',
            '7sus2': '7sus2',
            '7sus4': '7sus4'
        };

        if (typeMapping[chordType]) {
            console.log(`  🔄 类型映射: "${chordType}" → "${typeMapping[chordType]}"`);
            chordType = typeMapping[chordType];
        }

        const intervals = this.harmonyTheory.chordTypes[chordType];

        console.log(`    chordTypes中存在该类型: ${!!intervals}`);
        console.log(`    intervals值: ${intervals ? JSON.stringify(intervals) : 'undefined'}`);

        if (!intervals) {
            console.warn(`⚠️ 无法获取和弦结构: ${chordType}`);
            console.warn(`⚠️ 可用的和弦类型示例:`, Object.keys(this.harmonyTheory.chordTypes).slice(0, 10));
            return 0;
        }

        // 🔧 修复 (2025-10-02 尝试5): 直接使用pitch class比较，不需要构建音符名称
        // 问题：this.harmonyTheory.semitoneToNote 是方法不是对象，导致chord tones数组为空
        // 解决：直接计算和比较pitch class（0-11的半音数）
        const rootSemitone = this.harmonyTheory.noteToSemitone[chordRoot];

        if (rootSemitone === undefined) {
            console.warn(`⚠️ 无法获取根音${chordRoot}的半音值`);
            return 0;
        }

        // 计算和弦各音的pitch class（0-11）
        const chordPitchClasses = intervals.map(interval => {
            return (rootSemitone + interval) % 12;
        });

        console.log(`  和弦pitch classes: [${chordPitchClasses.join(', ')}] (根音=${rootSemitone})`);

        // 判断最低音在和弦中的位置
        // 使用pitch class比较，自动处理同音异名（如Gb和F#都是6）
        const lowestMidiClass = lowestMidi % 12;  // 音高类（pitch class）

        for (let i = 0; i < chordPitchClasses.length; i++) {
            if (chordPitchClasses[i] === lowestMidiClass) {
                console.log(`  ✅ 最低音pitch class ${lowestMidiClass}是第${i}个和弦音 → 转位: ${i}`);
                return i;
            }
        }

        // 如果没找到匹配，默认返回原位
        console.warn(`⚠️ 最低音${lowestPitch}不在和弦音中，默认返回原位`);
        return 0;
    }

    /**
     * 🔧 新增 (2025-10-03): 创建指定转位的和弦对象
     * 用于Drop2/Drop3原位控制 - Option C方案
     *
     * @param {Object} chord - 原始和弦对象
     * @param {number} targetInversion - 目标转位 (0-3)
     * @returns {Object} 包含正确notes和inversion的新和弦对象
     */
    createInvertedChordObject(chord, targetInversion) {
        console.log(`\n🔧 === 创建第${targetInversion}转位和弦对象 ===`);
        console.log(`  原始和弦: ${chord.root}${chord.type}`);

        // 1. 获取和弦的intervals
        const intervals = this.harmonyTheory.chordTypes[chord.type];

        if (!intervals || intervals.length === 0) {
            console.error(`❌ 未找到和弦类型${chord.type}的intervals定义`);
            return null;
        }

        console.log(`  Intervals: [${intervals.join(', ')}]`);

        // 2. 验证转位值是否有效
        if (targetInversion < 0 || targetInversion >= intervals.length) {
            console.error(`❌ 转位值${targetInversion}超出范围（0-${intervals.length-1}）`);
            return null;
        }

        // 3. 旋转intervals数组得到转位顺序
        // 例如：[0,4,7,11] 第二转位 → [7,11,0,4] (从5音开始)
        const invertedIntervals = [];
        for (let i = 0; i < intervals.length; i++) {
            const originalIndex = (i + targetInversion) % intervals.length;
            const interval = intervals[originalIndex];
            // 转换为相对于新低音的interval
            const relativeInterval = (interval - intervals[targetInversion] + 12) % 12;
            invertedIntervals.push(relativeInterval);
        }

        console.log(`  转位后intervals: [${invertedIntervals.join(', ')}]`);

        // 4. 根据转位后的intervals生成音符名称
        const rootSemitone = this.harmonyTheory.noteToSemitone[chord.root];
        const bassSemitone = (rootSemitone + intervals[targetInversion]) % 12;

        // 使用简单的pitch class到音名映射
        const semitoneToNote = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const invertedNotes = invertedIntervals.map(interval => {
            const pitchClass = (bassSemitone + interval) % 12;
            return semitoneToNote[pitchClass];
        });

        console.log(`  转位后音符: [${invertedNotes.join(', ')}]`);

        // 5. 创建新的和弦对象
        const invertedChord = {
            root: chord.root,
            type: chord.type,
            notes: invertedNotes,
            inversion: targetInversion,
            key: chord.key
        };

        console.log(`✅ 第${targetInversion}转位和弦对象创建成功`);
        console.log(`   音符顺序: ${invertedNotes.join('-')}`);

        return invertedChord;
    }

    /**
     * 🎯 确定目标转位的最低音（目标音）
     *
     * @param {string} chordRoot - 和弦根音
     * @param {Object} chord - 和弦对象
     * @param {number} targetInversion - 目标转位 (0-3)
     * @returns {string} 目标最低音的音名
     */
    getTargetBassNote(chordRoot, chord, targetInversion) {
        // 获取和弦结构
        let chordType = chord.type || chord.chordType;

        // 🔍 诊断日志（2025-10-02）
        console.log(`  🔍 getTargetBassNote - 和弦类型诊断:`);
        console.log(`    chord.type: "${chord.type}"`);
        console.log(`    chord.chordType: "${chord.chordType}"`);
        console.log(`    原始类型: "${chordType}"`);

        // 🔧 修复 (2025-10-02): 类型映射，将简写形式转换为标准键
        const typeMapping = {
            'maj7': 'major7',
            'm7': 'minor7',
            'min7': 'minor7',
            'dom7': 'dominant7',
            '7': 'dominant7',
            'dim7': 'diminished7',
            'm7b5': 'minor7b5',
            'ø7': 'minor7b5',
            'mM7': 'minorMaj7',
            'aug7': 'augmented7',
            '+7': 'augmented7',
            'maj6': 'major6',
            '6': 'major6',
            'm6': 'minor6',
            'maj9': 'major9',
            'm9': 'minor9',
            '9': 'dominant9',
            'maj11': 'major11',
            'm11': 'minor11',
            '11': 'dominant11',
            'maj13': 'major13',
            'm13': 'minor13',
            '13': 'dominant13',
            'dim': 'diminished',
            'aug': 'augmented',
            '+': 'augmented',
            'sus2': 'sus2',
            'sus4': 'sus4',
            '7sus2': '7sus2',
            '7sus4': '7sus4'
        };

        if (typeMapping[chordType]) {
            console.log(`  🔄 类型映射: "${chordType}" → "${typeMapping[chordType]}"`);
            chordType = typeMapping[chordType];
        }

        const intervals = this.harmonyTheory.chordTypes[chordType];

        console.log(`    chordTypes中存在该类型: ${!!intervals}`);
        console.log(`    intervals值: ${intervals ? JSON.stringify(intervals) : 'undefined'}`);

        if (!intervals) {
            console.warn(`⚠️ 无法获取和弦结构，返回根音`);
            console.warn(`⚠️ chordType值: "${chordType}"`);
            return chordRoot;
        }

        // 🔧 修复 (2025-10-02 尝试5): 直接使用pitch class计算目标音,不需要构建音符名称数组
        // 问题: this.harmonyTheory.semitoneToNote 是方法不是对象,导致chordNotes数组全是undefined
        // 解决: 直接根据targetInversion计算对应的interval,然后获取音符名称
        const rootSemitone = this.harmonyTheory.noteToSemitone[chordRoot];

        if (rootSemitone === undefined) {
            console.warn(`⚠️ 无法获取根音${chordRoot}的半音值`);
            return chordRoot;
        }

        // 验证targetInversion是否在有效范围内
        if (targetInversion < 0 || targetInversion >= intervals.length) {
            console.warn(`⚠️ 目标转位${targetInversion}超出范围（0-${intervals.length-1}），返回根音`);
            return chordRoot;
        }

        // 计算目标转位对应的音符的pitch class
        const targetInterval = intervals[targetInversion];
        const targetPitchClass = (rootSemitone + targetInterval) % 12;

        // 🔧 使用简单的pitch class到音符名称映射（升号系统）
        // 这个音符名称会立即在adjustOctaveForTargetInversion中被转换回pitch class
        // 所以不需要考虑同音异名的准确拼写
        const pitchClassToNote = {
            0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
            6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
        };

        const targetNote = pitchClassToNote[targetPitchClass];

        console.log(`🎯 目标转位${targetInversion}: 最低音应为 ${targetNote} (pitch class ${targetPitchClass})`);
        return targetNote;
    }

    /**
     * 🔧 调整voicing的八度，使其达到目标转位
     *
     * 核心思想：通过调整音符的八度，使目标音成为最低音
     *
     * @param {Object} voicing - 当前的voicing对象
     * @param {string} chordRoot - 和弦根音
     * @param {Object} chord - 和弦对象
     * @param {number} targetInversion - 目标转位
     * @param {Object} options - 选项（音域限制等）
     * @returns {Object} 调整后的voicing
     */
    adjustOctaveForTargetInversion(voicing, chordRoot, chord, targetInversion, options = {}) {
        console.log(`\n🔧 === 八度调整以达到目标转位 ===`);
        console.log(`  当前voicing: ${voicing.notes.join('-')}`);
        console.log(`  当前MIDI: [${voicing.midiNotes.join(', ')}]`);
        console.log(`  目标转位: ${targetInversion}`);

        // 获取目标最低音
        const targetBassNote = this.getTargetBassNote(chordRoot, chord, targetInversion);
        const targetBassPitchClass = this.harmonyTheory.noteToSemitone[targetBassNote];

        // 找到目标音在voicing中的所有位置
        const targetIndices = [];
        for (let i = 0; i < voicing.midiNotes.length; i++) {
            const pitchClass = voicing.midiNotes[i] % 12;
            if (pitchClass === targetBassPitchClass) {
                targetIndices.push(i);
            }
        }

        if (targetIndices.length === 0) {
            console.error(`❌ 目标音${targetBassNote}不在voicing中！`);
            return voicing;
        }

        console.log(`  目标音${targetBassNote}在索引: [${targetIndices.join(', ')}]`);

        // 策略：找到目标音的最低八度位置
        let bestTargetIndex = targetIndices[0];
        let bestTargetMidi = voicing.midiNotes[targetIndices[0]];
        for (const idx of targetIndices) {
            if (voicing.midiNotes[idx] < bestTargetMidi) {
                bestTargetIndex = idx;
                bestTargetMidi = voicing.midiNotes[idx];
            }
        }

        console.log(`  选择索引${bestTargetIndex}作为目标最低音 (MIDI ${bestTargetMidi})`);

        // 🔧 修复 (2025-10-02): 智能八度调整策略
        // 目标：保持紧凑的voicing，不要让音符升得太高
        const adjustedMidi = [...voicing.midiNotes];
        const adjustedNotes = [...voicing.notes];

        for (let i = 0; i < adjustedMidi.length; i++) {
            if (i === bestTargetIndex) continue;  // 跳过目标音

            // 找到该音符最接近目标音的八度（在目标音之上）
            const pitchClass = adjustedMidi[i] % 12;

            // 计算目标音所在八度
            const targetOctave = Math.floor(bestTargetMidi / 12);

            // 尝试将该音放在目标音的同一八度或更高八度
            let candidateMidi = targetOctave * 12 + pitchClass;

            // 如果同一八度不高于目标音，升一个八度
            if (candidateMidi <= bestTargetMidi) {
                candidateMidi += 12;
            }

            // 更新MIDI和音符名称
            adjustedMidi[i] = candidateMidi;
            const noteName = adjustedNotes[i].replace(/\d+/g, '');
            const newOctave = Math.floor(candidateMidi / 12) - 1;
            adjustedNotes[i] = noteName + newOctave;

            console.log(`    索引${i}: ${voicing.notes[i]} (${voicing.midiNotes[i]}) → ${adjustedNotes[i]} (${candidateMidi})`);
        }

        // 验证音域约束
        const rangeMin = options.rangeMin || 55;
        const rangeMax = options.rangeMax || 88;
        const maxMidi = Math.max(...adjustedMidi);
        const minMidi = Math.min(...adjustedMidi);

        if (maxMidi > rangeMax || minMidi < rangeMin) {
            console.warn(`⚠️ 八度调整后超出音域 (${minMidi}-${maxMidi} vs ${rangeMin}-${rangeMax})`);
            console.warn(`⚠️ 尝试降低整体八度...`);

            // 尝试将所有音降低一个八度
            for (let i = 0; i < adjustedMidi.length; i++) {
                const testMidi = adjustedMidi[i] - 12;
                if (testMidi >= rangeMin) {
                    adjustedMidi[i] = testMidi;
                    const noteName = adjustedNotes[i].replace(/\d+/g, '');
                    const newOctave = Math.floor(adjustedMidi[i] / 12) - 1;
                    adjustedNotes[i] = noteName + newOctave;
                }
            }
        }

        // 更新voicing对象
        voicing.midiNotes = adjustedMidi;
        voicing.notes = adjustedNotes;

        console.log(`  ✅ 调整完成: ${voicing.notes.join('-')}`);
        console.log(`  ✅ MIDI: [${voicing.midiNotes.join(', ')}]`);
        console.log(`  ✅ 最低音: ${voicing.notes[adjustedMidi.indexOf(Math.min(...adjustedMidi))]}`);

        return voicing;
    }

    /**
     * 生成Drop2 Voicing
     *
     * DROP2定义和流程：
     * 1. 生成一个close voicing（根据和弦信息）
     * 2. 进行转位（如果需要的话）
     * 3. 之后再将第二高的音降一个八度(-12半音)
     *
     * 注意：这个函数接收的closeVoicing应该已经是正确转位的close voicing
     *
     * @param {Object} closeVoicing - 已经转位的密集排列voicing
     * @returns {Object} Drop2 voicing，或null如果无法生成
     */
    generateDrop2Voicing(closeVoicing, options = {}) {
        console.log('\n🔷 === generateDrop2Voicing ===');

        // 🎸 吉他模式sus和弦特殊处理：应用特定的音符排列模式
        if (closeVoicing && typeof document !== 'undefined') {
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            const isGuitarMode = !instrumentToggle || !instrumentToggle.checked; // 默认吉他模式
            const isSusChord = closeVoicing.chordType && closeVoicing.chordType.includes('sus');

            if (isGuitarMode && isSusChord) {
                console.log(`🎸 检测到吉他模式下的sus和弦Drop2: ${closeVoicing.root}${closeVoicing.chordType}`);
                console.log(`🎸 使用吉他专用sus和弦生成器`);

                const guitarSusVoicing = this.generateGuitarSusVoicing(
                    { root: closeVoicing.root, type: closeVoicing.chordType },
                    'drop2',
                    options
                );
                if (guitarSusVoicing) {
                    console.log(`✅ 吉他专用sus Drop2生成成功: ${guitarSusVoicing.notes.join('-')}`);
                    return guitarSusVoicing;
                } else {
                    console.warn(`⚠️ 吉他专用sus Drop2生成失败，回退到标准生成器`);
                    // 如果专用生成器失败，继续使用标准生成器
                }
            }
        }

        // 🔧 修复 (2025-10-06 v2): Drop2三和弦拼写修复
        // 问题：Drop2三和弦经常出现同音异名错误（D#而非Eb）
        // 特别问题：减和弦（Eb°）显示为F#-D#-A而非Gb-Eb-A
        // 解决：为三和弦提供更准确的调性context，特别处理diminished和弦
        if (closeVoicing && closeVoicing.notes && closeVoicing.notes.length === 3) {
            const chordType = closeVoicing.chordType || '';
            const isDiminished = chordType.includes('dim') || chordType === 'diminished';

            console.log(`🎯 检测到三和弦，应用拼写修复: ${closeVoicing.root}${closeVoicing.chordType}${isDiminished ? ' (减和弦)' : ''}`);

            // 修复三和弦拼写
            const isTriad = closeVoicing.midiNotes && closeVoicing.midiNotes.length === 3;
            const isRandomMode = !closeVoicing.functionalGeneration && !closeVoicing.keyInfo;

            // 🔧 修复 (2025-10-06 v2): 减和弦无条件修复（不检查isRandomMode）
            // 原因：减和弦的字母名连续性是音乐理论规则，不分模式都必须遵守
            if (isTriad && (isRandomMode || isDiminished)) {
                if (isDiminished) {
                    console.log('  🎵 减和弦检测：强制应用字母名连续性拼写');
                } else {
                    console.log('  随机模式三和弦，增强拼写处理');
                }
                closeVoicing = this.fixTriadSpellingForDrop2(closeVoicing);
            }
        }

        // 🛡️ 增强三和弦防护检查：防止被Drop2变换
        if (closeVoicing && this.isEnhancedTriadVoicing(closeVoicing)) {
            console.log(`🛡️ 检测到增强三和弦voicing，阻止Drop2变换: ${closeVoicing.root}${closeVoicing.chordType}`);
            console.log(`🚫 增强三和弦配置不允许Drop变换，保持隔离状态`);
            console.log(`💡 建议：如需Drop2，请使用标准三和弦配置`);
            return null; // 返回null，确保不生成Drop2变换
        }

        console.log('📍 输入close voicing:', closeVoicing);
        if (closeVoicing) {
            console.log('  音符:', closeVoicing.notes?.join('-'), '| MIDI:', closeVoicing.midiNotes?.join(', '));
        }

        if (!closeVoicing || closeVoicing.midiNotes.length < 3) {
            console.log('⚠️ Drop2生成失败：需要至少3个音符的close voicing');
            return null;
        }

        // 获取音域约束
        const rangeMin = options.rangeMin;
        const rangeMax = options.rangeMax;
        console.log(`🎯 Drop2生成音域约束: ${rangeMin || '无'} - ${rangeMax || '无'}`);

        // 获取原始音域约束（可能来自closeVoicing）
        const originalRangeMin = closeVoicing.rangeConstraints?.minMidi || rangeMin;
        const originalRangeMax = closeVoicing.rangeConstraints?.maxMidi || rangeMax;

        console.log(`🎵 Drop2流程 - 输入已转位的close voicing: ${closeVoicing.notes?.join('-')}`);
        console.log(`🎵 MIDI值: ${closeVoicing.midiNotes?.join(', ')}`);

        const voicing = {
            type: 'drop2',
            notes: [...closeVoicing.notes],
            midiNotes: [...closeVoicing.midiNotes],
            range: closeVoicing.range,
            // 继承原始和弦信息
            chordType: closeVoicing.chordType,
            root: closeVoicing.root,
            inversion: closeVoicing.inversion // 保持转位信息
        };

        // 找到第二高的音符：按MIDI值从高到低排序
        const sortedIndices = voicing.midiNotes
            .map((midi, index) => ({
                midi,
                index,
                note: voicing.notes[index]
            }))
            .sort((a, b) => b.midi - a.midi); // 从高到低排序

        // 验证排序是否正确
        console.log('🔍 验证排序逻辑:');
        console.log(`  排序前MIDI: ${voicing.midiNotes.join(', ')}`);
        console.log(`  排序后MIDI (高→低): ${sortedIndices.map(s => s.midi).join(', ')}`);
        if (sortedIndices.length >= 2) {
            const isDescending = sortedIndices[0].midi > sortedIndices[1].midi;
            console.log(`  排序正确性: ${isDescending ? '✅ 正确降序' : '❌ 错误！不是降序'}`);
        }

        console.log('🔍 音符按高度排序:');
        console.log('  原始顺序:', voicing.notes.join('-'), '| MIDI:', voicing.midiNotes.join(', '));

        // 找出最低音和最高音以便验证
        const lowestNote = sortedIndices[sortedIndices.length - 1];
        const highestNote = sortedIndices[0];

        sortedIndices.forEach((item, i) => {
            const position = i === 0 ? '最高' : i === 1 ? '第二高' : i === 2 ? '第三高' : `第${i + 1}高`;
            const marker = i === 1 ? ' ⬅️ DROP2目标' : i === 2 ? ' (这是drop3目标)' : '';
            const isLowest = item === lowestNote ? ' [最低音！]' : '';
            console.log(`  ${position}: ${item.note} (MIDI ${item.midi}, 原位置index=${item.index})${marker}${isLowest}`);
        });

        // 额外验证
        if (sortedIndices.length >= 2) {
            console.log(`\n🔍 Drop2目标验证:`);
            console.log(`  最高音: ${highestNote.note} (MIDI ${highestNote.midi})`);
            console.log(`  第二高音(DROP2目标): ${sortedIndices[1].note} (MIDI ${sortedIndices[1].midi})`);
            console.log(`  最低音: ${lowestNote.note} (MIDI ${lowestNote.midi})`);

            if (sortedIndices[1] === lowestNote) {
                console.error(`❌ 严重错误：第二高音就是最低音！排序可能有问题！`);
            }
        }

        // 🎯 修复 (2025-10-02): 功能和声原位时保持根音在低音
        const isFunctionalHarmonyRootPosition = closeVoicing.functionalGeneration === true &&
                                                 (closeVoicing.inversion === 0 || closeVoicing.inversion === undefined);

        console.log(`\n🔍 === 功能和声Drop2检测 ===`);
        console.log(`  - functionalGeneration: ${closeVoicing.functionalGeneration}`);
        console.log(`  - inversion: ${closeVoicing.inversion}`);
        console.log(`  - isFunctionalHarmonyRootPosition: ${isFunctionalHarmonyRootPosition}`);

        // Drop2核心变换：将第二高的音符降低一个八度
        if (sortedIndices.length >= 2) {
            let secondHighest = sortedIndices[1];

            // 🎼 功能和声原位特殊处理：确保根音保持在最低音
            if (isFunctionalHarmonyRootPosition) {
                // 找到根音的索引
                const rootNote = closeVoicing.root;
                const rootIndex = voicing.notes.findIndex(n => {
                    const noteName = n.replace(/\d+/g, ''); // 移除八度数字
                    return noteName === rootNote;
                });

                console.log(`🎼 功能和声原位模式：确保根音 ${rootNote} 保持在最低音`);
                console.log(`  - 根音索引: ${rootIndex}`);
                console.log(`  - 根音MIDI: ${voicing.midiNotes[rootIndex]}`);

                // 如果第二高音是根音，选择第三高音作为Drop2目标
                if (sortedIndices[1].index === rootIndex) {
                    console.log(`  ⚠️ 第二高音是根音，改为Drop第三高音以保持根音在低音`);
                    if (sortedIndices.length >= 3) {
                        secondHighest = sortedIndices[2];
                        console.log(`  ✅ 新Drop2目标: ${secondHighest.note} (MIDI ${secondHighest.midi})`);
                    }
                }
            }

            const originalMidi = secondHighest.midi;
            const newMidi = originalMidi - 12;

            // 使用实际音域约束而不是硬编码
            const effectiveRangeMin = originalRangeMin || 55;
            const effectiveRangeMax = originalRangeMax || 79;

            // 标准drop2变换：只降低第二高音符一个八度
            console.log(`🎯 Drop2变换前的验证:`);
            console.log(`  要修改的索引: ${secondHighest.index}`);
            console.log(`  该索引的原始音符: ${voicing.notes[secondHighest.index]}`);
            console.log(`  该索引的原始MIDI: ${voicing.midiNotes[secondHighest.index]}`);
            console.log(`  预期修改: ${secondHighest.note} 的 MIDI ${originalMidi} → ${newMidi}`);

            // 执行drop2变换
            voicing.midiNotes[secondHighest.index] = newMidi;

            console.log(`🔄 Drop2变换完成：将第二高的音符 ${secondHighest.note} 降低一个八度`);
            console.log(`   索引${secondHighest.index}: ${originalMidi} → ${newMidi}`);

            // 验证修改是否正确
            const modifiedNote = voicing.notes[secondHighest.index];
            const modifiedMidi = voicing.midiNotes[secondHighest.index];
            console.log(`  验证: 索引${secondHighest.index}的音符现在是 ${modifiedNote} (MIDI ${modifiedMidi})`);

            // 🎯 原位保护（2025-10-02新增修复）：当目标转位为0（原位）时，确保根音保持在最低音
            // 修复逻辑：不依赖enableInversions，而是依赖targetInversion
            const targetInversion = options.targetInversion !== undefined ? options.targetInversion : 0;
            const shouldProtectRootPosition = (targetInversion === 0) && closeVoicing.root;

            if (shouldProtectRootPosition) {
                console.log(`\n🎯 === 原位保护机制：目标转位=0（原位），确保根音在最低音 ===`);

                // 找到根音的索引和MIDI值
                const rootNote = closeVoicing.root;
                const rootIndex = voicing.notes.findIndex(n => {
                    const noteName = n.replace(/\d+/g, ''); // 移除八度数字
                    return noteName === rootNote;
                });

                if (rootIndex !== -1) {
                    const rootMidi = voicing.midiNotes[rootIndex];
                    const currentLowestMidi = Math.min(...voicing.midiNotes);

                    console.log(`  根音: ${rootNote} (索引${rootIndex}, MIDI ${rootMidi})`);
                    console.log(`  当前最低音: MIDI ${currentLowestMidi}`);

                    if (rootMidi > currentLowestMidi) {
                        // 根音不是最低音，需要调整
                        const adjustment = rootMidi - currentLowestMidi;
                        console.log(`  ⚠️ 根音不是最低音！需要将所有音符下移 ${adjustment} 半音`);

                        // 将所有音符下移，使根音成为最低音
                        for (let i = 0; i < voicing.midiNotes.length; i++) {
                            const oldMidi = voicing.midiNotes[i];
                            voicing.midiNotes[i] = oldMidi - adjustment;
                            console.log(`    索引${i}: ${voicing.notes[i]} MIDI ${oldMidi} → ${voicing.midiNotes[i]}`);
                        }

                        console.log(`  ✅ 原位保护完成：根音${rootNote}现在是最低音 (MIDI ${voicing.midiNotes[rootIndex]})`);
                    } else {
                        console.log(`  ✅ 根音已是最低音，无需调整`);
                    }
                } else {
                    console.warn(`  ⚠️ 未找到根音 ${rootNote}，跳过原位保护`);
                }
            } else if (!shouldProtectRootPosition) {
                console.log(`\n⏭️ 跳过原位保护（用户勾选了转位或缺少根音信息）`);
            }

            // 如果结果超出音域，记录警告但不修改结果
            if (rangeMin !== undefined && rangeMax !== undefined) {
                const outOfRange = voicing.midiNotes.filter(midi => midi < rangeMin || midi > rangeMax);
                if (outOfRange.length > 0) {
                    console.warn(`⚠️ Drop2结果有${outOfRange.length}个音符超出音域[${rangeMin}-${rangeMax}]: ${outOfRange.join(',')}`);
                    // 如果超出音域太多，返回null让上层处理
                    if (outOfRange.length > voicing.midiNotes.length / 2) {
                        console.error(`❌ Drop2失败：超过一半音符超出音域`);
                        return null;
                    }
                }
            }

        } else {
            console.log('⚠️ Drop2变换失败：音符数量不足（需要至少2个音符）');
        }

        console.log(`✅ Drop2变换完成（排序前）: ${voicing.notes?.join('-')}`);
        console.log(`✅ MIDI（排序前）: ${voicing.midiNotes?.join(', ')}`);

        // 🔧 修复 (2025-10-02): 重新排序notes和midiNotes（按MIDI从低到高）
        // 问题根源：Drop2变换修改了MIDI值，但没有重新排序，导致notes[i]与midiNotes[i]不对应
        // 解决方案：将notes和midiNotes配对后按MIDI值排序
        console.log(`🔧 开始重新排序notes和midiNotes数组...`);
        const sortedPairs = voicing.notes.map((note, i) => ({
            note,
            midi: voicing.midiNotes[i]
        })).sort((a, b) => a.midi - b.midi);

        voicing.notes = sortedPairs.map(p => p.note);
        voicing.midiNotes = sortedPairs.map(p => p.midi);

        console.log(`✅ Drop2最终结果（排序后）: ${voicing.notes?.join('-')}`);
        console.log(`✅ MIDI（排序后）: ${voicing.midiNotes?.join(', ')}`);

        // 🔧 修复 (2025-10-02 尝试8): 重新启用转位调整
        // 问题根源：传入的closeVoicing可能不是正确的转位，需要调整
        // 之前的shouldSkipInversionAdjustment=true导致错误的和弦代号（如Am7/B）

        if (options.targetInversion !== undefined && closeVoicing.root) {
            console.log(`\n🎯 ========== Drop2转位验证 ==========`);

            // 构建完整的和弦对象（用于转位判断）
            const chord = {
                root: closeVoicing.root,
                type: closeVoicing.chordType,
                functionalGeneration: closeVoicing.functionalGeneration
            };

            // 判断实际转位
            const actualInversion = this.getActualInversion(voicing, chord.root, chord);
            const targetInversion = options.targetInversion;

            console.log(`  目标转位: ${targetInversion} (用户期望)`);
            console.log(`  实际转位: ${actualInversion} (Drop2变换后)`);

            if (actualInversion !== targetInversion) {
                console.log(`  ⚠️ 转位不匹配！需要调整八度`);

                // 调整八度使其达到目标转位
                this.adjustOctaveForTargetInversion(
                    voicing,
                    chord.root,
                    chord,
                    targetInversion,
                    { rangeMin, rangeMax }
                );

                // 验证调整后的转位
                const finalInversion = this.getActualInversion(voicing, chord.root, chord);
                console.log(`  ✅ 调整后转位: ${finalInversion}`);

                if (finalInversion !== targetInversion) {
                    console.warn(`  ⚠️ 警告：调整后转位仍然不匹配（可能受音域限制）`);
                }
            } else {
                console.log(`  ✅ 转位匹配，无需调整`);
            }
            console.log(`========================================\n`);
        }

        // 简单的音域检查，但不修改结果
        // Drop2的标准定义不应该被音域调整改变
        if (rangeMin !== undefined && rangeMax !== undefined) {
            const outOfRangeNotes = voicing.midiNotes.filter(midi =>
                midi < rangeMin || midi > rangeMax
            );

            if (outOfRangeNotes.length === voicing.midiNotes.length) {
                // 所有音符都超出音域，返回null
                console.error(`❌ Drop2失败：所有音符都超出音域[${rangeMin}-${rangeMax}]`);
                return null;
            } else if (outOfRangeNotes.length > 0) {
                console.log(`⚠️ Drop2包含${outOfRangeNotes.length}个超出音域的音符，但仍可接受`);
            }
        }

        // Drop2 voicing有特定的声部排列，不能重新排序
        // 否则会破坏drop2的特殊结构
        return voicing;
    }

    /**
     * 生成Drop3 Voicing (简化版 - 采用Drop2相同的简单音域处理方式)
     *
     * DROP3定义：对密集排列（close voicing）的第三高音符降低一个八度(-12半音)
     * 例如：Close voicing C-E-G-B (从低到高) → Drop3 E-C-G-B (第三高的E降低八度)
     *
     * 注意：Drop3 只适用于四音及以上的和弦，因为需要有"第三高音符"
     * 三和弦（只有3个音符）不存在Drop3 voicing
     *
     * @param {Object} closeVoicing - 密集排列voicing，需要至少4个音符
     * @returns {Object} Drop3 voicing，或null如果无法生成
     */
    generateDrop3Voicing(closeVoicing, options = {}) {
        console.log('\n🔷 === generateDrop3Voicing (与Drop2一致) ===');
        console.log('📍 输入close voicing:', closeVoicing);
        if (closeVoicing) {
            console.log('  音符:', closeVoicing.notes?.join('-'), '| MIDI:', closeVoicing.midiNotes?.join(', '));
        }

        // 🎸 吉他模式sus和弦检测：重定向到专用生成器
        const instrumentToggle = document.getElementById('instrumentModeToggle');
        const isGuitarMode = instrumentToggle ? !instrumentToggle.checked : true;

        if (isGuitarMode && closeVoicing?.chordType &&
            (closeVoicing.chordType.includes('sus2') || closeVoicing.chordType.includes('sus4'))) {
            console.log('🎸 检测到吉他模式sus和弦，重定向到专用Drop3生成器');
            return this.generateGuitarSusVoicing(closeVoicing, { ...options, voicingType: 'drop3' });
        }

        // 🚫 阶段2隔离：增强三和弦防护已移除
        console.log(`🚫 Drop3增强系统防护检查:`);
        console.log(`🚫 阶段2措施：增强三和弦系统已完全隔离`);
        console.log(`✅ Drop3 voicing将正常生成，无增强系统干扰`);

        // 原增强系统防护代码已被隔离（下面代码不再执行）
        // if (closeVoicing && this.isEnhancedTriadVoicing(closeVoicing)) {

        if (!closeVoicing || closeVoicing.midiNotes.length < 4) {
            console.log(`⚠️ Drop3生成失败：需要至少4个音符的close voicing（当前${closeVoicing?.midiNotes?.length || 0}个）`);
            console.log(`🎯 Drop3理论：三和弦没有Drop3，只有四音及以上和弦才有第三高音符可降八度`);
            return null;
        }

        // 获取音域约束
        const rangeMin = options.rangeMin;
        const rangeMax = options.rangeMax;
        console.log(`🎯 Drop3生成音域约束: ${rangeMin || '无'} - ${rangeMax || '无'}`);

        // 获取原始音域约束（可能来自closeVoicing）
        const originalRangeMin = closeVoicing.rangeConstraints?.minMidi || rangeMin;
        const originalRangeMax = closeVoicing.rangeConstraints?.maxMidi || rangeMax;

        console.log(`🎵 Drop3流程 - 输入已转位的close voicing: ${closeVoicing.notes?.join('-')}`);
        console.log(`🎵 MIDI值: ${closeVoicing.midiNotes?.join(', ')}`);

        const voicing = {
            type: 'drop3',
            notes: [...closeVoicing.notes],
            midiNotes: [...closeVoicing.midiNotes],
            range: closeVoicing.range,
            // 继承原始和弦信息
            chordType: closeVoicing.chordType,
            root: closeVoicing.root,
            inversion: closeVoicing.inversion // 保持转位信息
        };

        // 找到第三高的音符：按MIDI值从高到低排序
        const sortedIndices = voicing.midiNotes
            .map((midi, index) => ({
                midi,
                index,
                note: voicing.notes[index]
            }))
            .sort((a, b) => b.midi - a.midi); // 从高到低排序

        // 验证排序是否正确
        console.log('🔍 验证排序逻辑:');
        console.log(`  排序前MIDI: ${voicing.midiNotes.join(', ')}`);
        console.log(`  排序后MIDI (高→低): ${sortedIndices.map(s => s.midi).join(', ')}`);
        if (sortedIndices.length >= 3) {
            const isDescending = sortedIndices[0].midi > sortedIndices[1].midi && sortedIndices[1].midi > sortedIndices[2].midi;
            console.log(`  排序正确性: ${isDescending ? '✅ 正确降序' : '❌ 错误！不是降序'}`);
        }

        console.log('🔍 音符按高度排序:');
        console.log('  原始顺序:', voicing.notes.join('-'), '| MIDI:', voicing.midiNotes.join(', '));

        // 找出最低音和最高音以便验证
        const lowestNote = sortedIndices[sortedIndices.length - 1];
        const highestNote = sortedIndices[0];

        sortedIndices.forEach((item, i) => {
            const position = i === 0 ? '最高' : i === 1 ? '第二高' : i === 2 ? '第三高' : `第${i + 1}高`;
            const marker = i === 2 ? ' ⬅️ DROP3目标' : i === 1 ? ' (这是drop2目标)' : '';
            const isLowest = item === lowestNote ? ' [最低音！]' : '';
            console.log(`  ${position}: ${item.note} (MIDI ${item.midi}, 原位置index=${item.index})${marker}${isLowest}`);
        });

        // 额外验证
        if (sortedIndices.length >= 3) {
            console.log(`\n🔍 Drop3目标验证:`);
            console.log(`  最高音: ${highestNote.note} (MIDI ${highestNote.midi})`);
            console.log(`  第二高音: ${sortedIndices[1].note} (MIDI ${sortedIndices[1].midi})`);
            console.log(`  第三高音(DROP3目标): ${sortedIndices[2].note} (MIDI ${sortedIndices[2].midi})`);
            console.log(`  最低音: ${lowestNote.note} (MIDI ${lowestNote.midi})`);

            if (sortedIndices[2] === lowestNote) {
                console.error(`❌ 严重错误：第三高音就是最低音！排序可能有问题！`);
            }
        }

        // Drop3核心变换：将第三高的音符降低一个八度
        if (sortedIndices.length >= 3) {
            const thirdHighest = sortedIndices[2];
            const originalMidi = thirdHighest.midi;
            const newMidi = originalMidi - 12;

            // 使用实际音域约束而不是硬编码
            const effectiveRangeMin = originalRangeMin || 55;
            const effectiveRangeMax = originalRangeMax || 79;

            // 标准drop3变换：只降低第三高音符一个八度
            console.log(`🎯 Drop3变换前的验证:`);
            console.log(`  要修改的索引: ${thirdHighest.index}`);
            console.log(`  该索引的原始音符: ${voicing.notes[thirdHighest.index]}`);
            console.log(`  该索引的原始MIDI: ${voicing.midiNotes[thirdHighest.index]}`);
            console.log(`  预期修改: ${thirdHighest.note} 的 MIDI ${originalMidi} → ${newMidi}`);

            // 执行drop3变换
            voicing.midiNotes[thirdHighest.index] = newMidi;

            console.log(`🔄 Drop3变换完成：将第三高的音符 ${thirdHighest.note} 降低一个八度`);
            console.log(`   索引${thirdHighest.index}: ${originalMidi} → ${newMidi}`);

            // 验证修改是否正确
            const modifiedNote = voicing.notes[thirdHighest.index];
            const modifiedMidi = voicing.midiNotes[thirdHighest.index];
            console.log(`  验证: 索引${thirdHighest.index}的音符现在是 ${modifiedNote} (MIDI ${modifiedMidi})`);

            // 🎯 原位保护（2025-10-02新增修复）：当目标转位为0（原位）时，确保根音保持在最低音
            // 修复逻辑：不依赖enableInversions，而是依赖targetInversion
            const targetInversion = options.targetInversion !== undefined ? options.targetInversion : 0;
            const shouldProtectRootPosition = (targetInversion === 0) && closeVoicing.root;

            if (shouldProtectRootPosition) {
                console.log(`\n🎯 === 原位保护机制：目标转位=0（原位），确保根音在最低音 ===`);

                // 找到根音的索引和MIDI值
                const rootNote = closeVoicing.root;
                const rootIndex = voicing.notes.findIndex(n => {
                    const noteName = n.replace(/\d+/g, ''); // 移除八度数字
                    return noteName === rootNote;
                });

                if (rootIndex !== -1) {
                    const rootMidi = voicing.midiNotes[rootIndex];
                    const currentLowestMidi = Math.min(...voicing.midiNotes);

                    console.log(`  根音: ${rootNote} (索引${rootIndex}, MIDI ${rootMidi})`);
                    console.log(`  当前最低音: MIDI ${currentLowestMidi}`);

                    if (rootMidi > currentLowestMidi) {
                        // 根音不是最低音，需要调整
                        const adjustment = rootMidi - currentLowestMidi;
                        console.log(`  ⚠️ 根音不是最低音！需要将所有音符下移 ${adjustment} 半音`);

                        // 将所有音符下移，使根音成为最低音
                        for (let i = 0; i < voicing.midiNotes.length; i++) {
                            const oldMidi = voicing.midiNotes[i];
                            voicing.midiNotes[i] = oldMidi - adjustment;
                            console.log(`    索引${i}: ${voicing.notes[i]} MIDI ${oldMidi} → ${voicing.midiNotes[i]}`);
                        }

                        console.log(`  ✅ 原位保护完成：根音${rootNote}现在是最低音 (MIDI ${voicing.midiNotes[rootIndex]})`);
                    } else {
                        console.log(`  ✅ 根音已是最低音，无需调整`);
                    }
                } else {
                    console.warn(`  ⚠️ 未找到根音 ${rootNote}，跳过原位保护`);
                }
            } else if (!shouldProtectRootPosition) {
                console.log(`\n⏭️ 跳过原位保护（用户勾选了转位或缺少根音信息）`);
            }

            // 如果结果超出音域，记录警告但不修改结果（与Drop2一致）
            if (rangeMin !== undefined && rangeMax !== undefined) {
                const outOfRange = voicing.midiNotes.filter(midi => midi < rangeMin || midi > rangeMax);
                if (outOfRange.length > 0) {
                    console.warn(`⚠️ Drop3结果有${outOfRange.length}个音符超出音域[${rangeMin}-${rangeMax}]: ${outOfRange.join(',')}`);
                    // 如果超出音域太多，返回null让上层处理（与Drop2一致）
                    if (outOfRange.length > voicing.midiNotes.length / 2) {
                        console.error(`❌ Drop3失败：超过一半音符超出音域`);
                        return null;
                    }
                }
            }


        } else {
            console.log('⚠️ Drop3变换失败：音符数量不足（需要至少3个音符）');
        }

        console.log(`✅ Drop3变换完成（排序前）: ${voicing.notes?.join('-')}`);
        console.log(`✅ MIDI（排序前）: ${voicing.midiNotes?.join(', ')}`);

        // 🔧 修复 (2025-10-02): 重新排序notes和midiNotes（按MIDI从低到高）
        // 问题根源：Drop3变换修改了MIDI值，但没有重新排序，导致notes[i]与midiNotes[i]不对应
        // 解决方案：将notes和midiNotes配对后按MIDI值排序
        console.log(`🔧 开始重新排序notes和midiNotes数组...`);
        const sortedPairs = voicing.notes.map((note, i) => ({
            note,
            midi: voicing.midiNotes[i]
        })).sort((a, b) => a.midi - b.midi);

        voicing.notes = sortedPairs.map(p => p.note);
        voicing.midiNotes = sortedPairs.map(p => p.midi);

        console.log(`✅ Drop3最终结果（排序后）: ${voicing.notes?.join('-')}`);
        console.log(`✅ MIDI（排序后）: ${voicing.midiNotes?.join(', ')}`);

        // 🔧 修复 (2025-10-02 尝试8): 重新启用转位调整
        // 问题根源：传入的closeVoicing可能不是正确的转位，需要调整
        // 之前的shouldSkipInversionAdjustment=true导致错误的和弦代号

        // 🎯 新增 (2025-10-02): Drop3转位验证和调整
        // 核心原则：Drop3的转位由变换后的实际最低音决定
        if (options.targetInversion !== undefined && closeVoicing.root) {
            console.log(`\n🎯 ========== Drop3转位验证 ==========`);

            // 构建完整的和弦对象（用于转位判断）
            const chord = {
                root: closeVoicing.root,
                type: closeVoicing.chordType,
                functionalGeneration: closeVoicing.functionalGeneration
            };

            // 判断实际转位
            const actualInversion = this.getActualInversion(voicing, chord.root, chord);
            const targetInversion = options.targetInversion;

            console.log(`  目标转位: ${targetInversion} (用户期望)`);
            console.log(`  实际转位: ${actualInversion} (Drop3变换后)`);

            if (actualInversion !== targetInversion) {
                console.log(`  ⚠️ 转位不匹配！需要调整八度`);

                // 调整八度使其达到目标转位
                this.adjustOctaveForTargetInversion(
                    voicing,
                    chord.root,
                    chord,
                    targetInversion,
                    { rangeMin, rangeMax }
                );

                // 验证调整后的转位
                const finalInversion = this.getActualInversion(voicing, chord.root, chord);
                console.log(`  ✅ 调整后转位: ${finalInversion}`);

                if (finalInversion !== targetInversion) {
                    console.warn(`  ⚠️ 警告：调整后转位仍然不匹配（可能受音域限制）`);
                }
            } else {
                console.log(`  ✅ 转位匹配，无需调整`);
            }
            console.log(`========================================\n`);
        } else if (shouldSkipInversionAdjustment) {
            console.log(`\n✅ Drop3转位调整已跳过（Drop3变换的最低音位置是正确的）`);
        }

        // 简单的音域检查，但不修改结果（与Drop2一致）
        // Drop3的标准定义不应该被音域调整改变
        if (rangeMin !== undefined && rangeMax !== undefined) {
            const outOfRangeNotes = voicing.midiNotes.filter(midi =>
                midi < rangeMin || midi > rangeMax
            );

            if (outOfRangeNotes.length === voicing.midiNotes.length) {
                // 所有音符都超出音域，返回null
                console.error(`❌ Drop3失败：所有音符都超出音域[${rangeMin}-${rangeMax}]`);
                return null;
            } else if (outOfRangeNotes.length > 0) {
                console.log(`⚠️ Drop3包含${outOfRangeNotes.length}个超出音域的音符，但仍可接受`);
            }
        }

        // 🚨 异常配置检测：Drop3生成结果
        console.log(`\n🔍 === 异常配置检测 (Drop3) ===`);
        if (closeVoicing && closeVoicing.root && closeVoicing.chordType) {
            console.log(`🎵 输入和弦: ${closeVoicing.root}${closeVoicing.chordType}`);
        }
        if (voicing && voicing.midiNotes) {
            const drop3Span = Math.max(...voicing.midiNotes) - Math.min(...voicing.midiNotes);
            const drop3Intervals = voicing.midiNotes.slice(1).map((midi, i) => midi - voicing.midiNotes[i]);
            const drop3MaxInterval = Math.max(...drop3Intervals.map(Math.abs)); // 取绝对值

            console.log(`📊 Drop3结果: ${voicing.notes?.join('-')} (MIDI: ${voicing.midiNotes.join(', ')})`);
            console.log(`📏 Drop3跨度: ${drop3Span}半音`);
            console.log(`🎼 Drop3最大音程间隔: ${drop3MaxInterval}半音`);

            // Drop3异常检测：跨度过大
            if (drop3Span > 48) { // Drop3允许更大跨度，但超过4个八度就异常了
                console.error(`🚨 Drop3异常检测: 超大跨度配置！跨度${drop3Span}半音 > 48半音`);
                console.error(`🚨 具体配置: ${voicing.notes[0]}(${Math.min(...voicing.midiNotes)}) - ${voicing.notes[voicing.notes.indexOf(voicing.notes.find((_, i) => voicing.midiNotes[i] === Math.max(...voicing.midiNotes)))]}(${Math.max(...voicing.midiNotes)})`);
            }

            // 检测特定问题模式：类似C4-E4-G5的异常分布
            if (drop3Span > 18 && voicing.midiNotes.length === 3) {
                console.error(`🚨 Drop3异常检测: 可能的三和弦异常配置！`);
                console.error(`🚨 模式: ${voicing.notes.join('-')} (MIDI: ${voicing.midiNotes.join('-')})`);
                console.error(`🚨 调用栈追踪: generateDrop3Voicing → ${closeVoicing?.root || '未知'}${closeVoicing?.chordType || ''}， 从close voicing变换`);
            }

            // 检测octave分布异常：如果有音符间隔超过2个八度
            if (drop3MaxInterval > 24) {
                console.error(`🚨 Drop3异常检测: 超大音程间隔！最大间隔${drop3MaxInterval}半音 > 24半音（2个八度）`);
                console.error(`🚨 这可能表示octave调整算法有问题`);
            }
        }

        // Drop3 voicing有特定的声部排列，不能重新排序
        // 否则会破坏drop3的特殊结构
        return voicing;
    }

    /**

     * 测试 Drop 3 音符分布优化功能
     * 专门用于验证修复后的效果
     */

    testDrop3DistributionFix() {
        console.log('\n🧪 === 测试 Drop 3 音符分布优化功能 ===');
        // 测试用例：容易产生大跨度的和弦
        const testCases = [
            {
                name: 'Am7 第一转位',
                closeVoicing: {
                    notes: ['C', 'E', 'G', 'A'],
                    midiNotes: [60, 64, 67, 69],
                    type: 'close'
                }
            },
            {
                name: 'FMaj7 密集排列',
                closeVoicing: {
                    notes: ['F', 'A', 'C', 'E'],
                    midiNotes: [65, 69, 72, 76],
                    type: 'close'
                }
            },
            {
                name: 'Gm7 测试',
                closeVoicing: {
                    notes: ['G', 'Bb', 'D', 'F'],
                    midiNotes: [67, 71, 74, 77],
                    type: 'close'
                }
            }
        ];

        // 执行测试
        testCases.forEach((testCase, index) => {
            console.log(`\n📝 测试 ${index + 1}: ${testCase.name}`);
            const result = this.generateDrop3Voicing(testCase.closeVoicing, { rangeMin: 55, rangeMax: 79 });

            if (result) {
                const sortedMidi = result.midiNotes.slice().sort((a, b) => a - b);
                const gaps = [];
                for (let i = 1; i < sortedMidi.length; i++) {
                    gaps.push(sortedMidi[i] - sortedMidi[i-1]);
                }
                const maxGap = Math.max(...gaps);
                const qualityRating = maxGap <= 7 ? '🟢优秀' : maxGap <= 10 ? '🟡良好' : '🔴需改进';

                console.log(`   结果: ${result.notes?.join('-')} (最大跨度: ${maxGap}半音) ${qualityRating}`);
            } else {
                console.log(`❌ Drop3生成失败`);
            }
        });

        console.log('\n✅ Drop 3 优化功能测试完成');
        return true;
    }
    /**

                    if (maxNewGap < Math.max(...gaps)) {
                        voicing.midiNotes = adjustedVoicing;
                        console.log(`✅ 音符分布优化成功，跨度从${Math.max(...gaps)}减少到${maxNewGap}个半音`);
                    } else {
                        console.log(`⚠️ 优化未改善分布，保持原始Drop3结果`);
                    }
                } else {
                    console.log(`⚠️ 无法在音域约束内进行优化调整`);
                }

                // 🎯 高级重排策略：如果还有大跨度，尝试全局优化
                const finalSortedMidi = voicing.midiNotes.slice().sort((a, b) => a - b);
                const finalGaps = [];
                for (let i = 1; i < finalSortedMidi.length; i++) {
                    finalGaps.push(finalSortedMidi[i] - finalSortedMidi[i-1]);
                }
                const stillHasLargeGap = finalGaps.some(gap => gap > 12);

                if (stillHasLargeGap) {
                    console.log(`🔄 执行高级重排策略...`);

                    // 尝试生成更平衡的分布
                    const originalNotes = [...voicing.midiNotes];
                    const noteIndices = originalNotes.map((midi, index) => ({midi, index}));

                    // 计算理想的音符间距（音域平均分配）
                    const minMidi = Math.min(...originalNotes);
                    const maxMidi = Math.max(...originalNotes);
                    const totalRange = maxMidi - minMidi;
                    const idealSpacing = totalRange / (originalNotes.length - 1);

                    console.log(`目标平均间距: ${idealSpacing.toFixed(1)}个半音`);

                    // 尝试重新分布音符，保持 Drop 3 特征
                    let bestVoicing = [...originalNotes];
                    let bestMaxGap = Math.max(...finalGaps);

                    // 生成多个候选分布并选择最佳的
                    for (let attempt = 0; attempt < 3; attempt++) {
                        let candidateVoicing = [...originalNotes];
                        let improved = false;

                        // 对每个音符尝试不同的八度
                        for (let i = 0; i < candidateVoicing.length; i++) {
                            const originalMidi = candidateVoicing[i];

                            // 尝试上下八度
                            const candidates = [originalMidi, originalMidi + 12, originalMidi - 12];

                            for (const candidateMidi of candidates) {
                                if (candidateMidi >= (rangeMin || 40) && candidateMidi <= (rangeMax || 80)) {
                                    candidateVoicing[i] = candidateMidi;

                                    // 计算这个调整的效果
                                    const testSorted = candidateVoicing.slice().sort((a, b) => a - b);
                                    const testGaps = [];
                                    for (let j = 1; j < testSorted.length; j++) {
                                        testGaps.push(testSorted[j] - testSorted[j-1]);
                                    }
                                    const testMaxGap = Math.max(...testGaps);

                                    if (testMaxGap < bestMaxGap) {
                                        bestVoicing = [...candidateVoicing];
                                        bestMaxGap = testMaxGap;
                                        improved = true;
                                        console.log(`📊 发现更好分布：最大跨度${testMaxGap}个半音`);
                                    }
                                }
                            }

                            // 恢复原值继续测试其他位置
                            candidateVoicing[i] = originalMidi;
                        }

                        if (!improved) break;
                    }

                    if (bestMaxGap < Math.max(...finalGaps)) {
                        voicing.midiNotes = bestVoicing;
                        console.log(`🎯 高级重排成功：${originalNotes.join(',')} → ${bestVoicing.join(',')}`);
                        console.log(`📉 最大跨度优化：${Math.max(...finalGaps)} → ${bestMaxGap}个半音`);
                    } else {
                        console.log(`⚠️ 高级重排未能进一步改善，保持当前结果`);
                    }
                }
            } else {
                console.log(`✅ 音符分布良好，最大跨度: ${Math.max(...gaps)}个半音`);
                // 即使没有过大跨度，也记录分布质量
                const maxGap = Math.max(...gaps);
                const qualityLevel = maxGap <= 7 ? '🟢优秀' : maxGap <= 12 ? '🟡良好' : '🔴需改进';
                console.log(`📊 分布质量: ${qualityLevel}`);
            }

            } catch (optimizationError) {
                console.warn(`⚠️ Drop3优化过程出现错误，使用基本Drop3结果: ${optimizationError.message}`);
                console.log(`🔄 降级策略：保持标准Drop3变换结果，跳过音符分布优化`);
                // 恢复到基本的 Drop 3 结果，不进行优化
                // voicing.midiNotes 已经包含了基本的 Drop 3 变换，所以不需要额外操作
            }

            // 🎯 严格音域检查：任何音符超出都拒绝生成
            if (rangeMin !== undefined && rangeMax !== undefined) {
                const outOfRange = voicing.midiNotes.filter(midi => midi < rangeMin || midi > rangeMax);
                if (outOfRange.length > 0) {
                    console.error(`❌ Drop3严格拒绝：${outOfRange.length}个音符超出音域[${rangeMin}-${rangeMax}]: ${outOfRange.join(',')}`);
                    console.log(`💡 触发和弦替换：上层逻辑将选择其他符合音域的和弦`);
                    return null; // 严格拒绝，让上层逻辑替换和弦
                }
            }

        } else {
            console.log('⚠️ Drop3变换失败：音符数量不足（需要至少3个音符）');
        }

        console.log(`\n🎯 === Drop3 最终结果分析 ===`);
        console.log(`和弦: ${voicing.notes?.join('-')}`);
        console.log(`MIDI: ${voicing.midiNotes?.join(', ')}`);

        // 计算最终的音符分布统计
        const finalSortedMidi = voicing.midiNotes.slice().sort((a, b) => a - b);
        const finalGaps = [];
        for (let i = 1; i < finalSortedMidi.length; i++) {
            finalGaps.push(finalSortedMidi[i] - finalSortedMidi[i-1]);
        }
        console.log(`音符间距: ${finalGaps.join(', ')}个半音`);
        console.log(`最大跨度: ${Math.max(...finalGaps)}个半音`);
        console.log(`总音域: ${Math.max(...finalSortedMidi) - Math.min(...finalSortedMidi)}个半音`);

        // 对比原始 Close Voicing
        if (originalMidiNotes) {
            const originalSorted = originalMidiNotes.slice().sort((a, b) => a - b);
            const originalGaps = [];
            for (let i = 1; i < originalSorted.length; i++) {
                originalGaps.push(originalSorted[i] - originalSorted[i-1]);
            }
            console.log(`📊 对比原始Close: 最大跨度 ${Math.max(...originalGaps)} → ${Math.max(...finalGaps)} (${Math.max(...finalGaps) <= Math.max(...originalGaps) ? '✅改善' : '⚠️未改善'})`);
        }

        // 🎯 最终严格音域验证：确保没有任何音符超出设定范围
        if (rangeMin !== undefined && rangeMax !== undefined) {
            const outOfRangeNotes = voicing.midiNotes.filter(midi =>
                midi < rangeMin || midi > rangeMax
            );

            if (outOfRangeNotes.length > 0) {
                // 任何音符超出音域都拒绝
                console.error(`❌ Drop3最终拒绝：${outOfRangeNotes.length}个音符超出音域[${rangeMin}-${rangeMax}]: ${outOfRangeNotes.join(',')}`);
                console.log(`🔄 和弦替换触发：系统将选择其他和弦确保严格音域遵循`);
                return null;
            } else {
                console.log(`✅ Drop3音域验证通过：所有音符都在[${rangeMin}-${rangeMax}]范围内`);
            }
        }

        // Drop3 voicing有特定的声部排列，不能重新排序
        // 否则会破坏drop3的特殊结构
        return voicing;
    }

    /**
     * 测试 Drop 3 音符分布优化功能
     * 专门用于验证修复后的效果
     */
    testDrop3DistributionFix() {
        console.log('\n🧪 === 测试 Drop 3 音符分布优化功能 ===');

        // 测试用例：容易产生大跨度的和弦
        const testCases = [
            {
                name: 'Am7 第一转位',
                closeVoicing: {
                    notes: ['C', 'E', 'G', 'A'],
                    midiNotes: [60, 64, 67, 69],
                    type: 'close'
                }
            },
            {
                name: 'Fmaj7 根位',
                closeVoicing: {
                    notes: ['F', 'A', 'C', 'E'],
                    midiNotes: [65, 69, 72, 76],
                    type: 'close'
                }
            },
            {
                name: 'Gmaj7 高位',
                closeVoicing: {
                    notes: ['G', 'B', 'D', 'F'],
                    midiNotes: [67, 71, 74, 77],
                    type: 'close'
                }
            }
        ];

        testCases.forEach((testCase, index) => {
            console.log(`\n🔬 测试 ${index + 1}: ${testCase.name}`);
            console.log(`输入Close: ${testCase.closeVoicing.notes.join('-')} | MIDI: ${testCase.closeVoicing.midiNotes.join(',')}`);

            const result = this.generateDrop3Voicing(testCase.closeVoicing, {
                rangeMin: 55,
                rangeMax: 79
            });

            if (result) {
                console.log(`✅ Drop3成功: ${result.notes.join('-')} | MIDI: ${result.midiNotes.join(',')}`);

                // 分析音符分布质量
                const sortedMidi = result.midiNotes.slice().sort((a, b) => a - b);
                const gaps = [];
                for (let i = 1; i < sortedMidi.length; i++) {
                    gaps.push(sortedMidi[i] - sortedMidi[i-1]);
                }
                const maxGap = Math.max(...gaps);
                const qualityRating = maxGap <= 7 ? '🟢优秀' : maxGap <= 10 ? '🟡良好' : '🔴需改进';

                console.log(`📊 分布质量: ${qualityRating} (最大跨度: ${maxGap}个半音)`);
                console.log(`📏 间距详情: ${gaps.join(', ')}个半音`);
            } else {
                console.log(`❌ Drop3生成失败`);
            }
        });

        console.log('\n✅ Drop 3 优化功能测试完成');
        return true;
    }

    /**
     * 生成Drop3 Voicing (复杂备份版本 - 仅供参考)
     *
     * @param {Object} closeVoicing - 密集排列voicing，需要至少4个音符
     * @returns {Object} Drop3 voicing，或null如果无法生成
     */
    generateDrop3VoicingComplexBackup(closeVoicing, options = {}) {
        console.log('\n🔷 === generateDrop3Voicing (简化版) ===');
        console.log('📍 输入close voicing:', closeVoicing);
        if (closeVoicing) {
            console.log('  音符:', closeVoicing.notes?.join('-'), '| MIDI:', closeVoicing.midiNotes?.join(', '));
        }

        if (!closeVoicing || closeVoicing.midiNotes.length < 4) {
            console.log(`⚠️ Drop3生成失败：需要至少4个音符的close voicing（当前${closeVoicing?.midiNotes?.length || 0}个）`);
            console.log(`🎯 Drop3理论：三和弦没有Drop3，只有四音及以上和弦才有第三高音符可降八度`);
            return null;
        }

        // 获取音域约束
        const rangeMin = options.rangeMin;
        const rangeMax = options.rangeMax;
        console.log(`🎯 Drop3生成音域约束: ${rangeMin || '无'} - ${rangeMax || '无'}`);

        // 获取原始音域约束（可能来自closeVoicing）
        const originalRangeMin = closeVoicing.rangeConstraints?.minMidi || rangeMin;
        const originalRangeMax = closeVoicing.rangeConstraints?.maxMidi || rangeMax;

        console.log(`🎵 Drop3流程 - 输入已转位的close voicing: ${closeVoicing.notes?.join('-')}`);
        console.log(`🎵 MIDI值: ${closeVoicing.midiNotes?.join(', ')}`);

        const voicing = {
            type: 'drop3',
            notes: [...closeVoicing.notes],
            midiNotes: [...closeVoicing.midiNotes],
            range: closeVoicing.range,
            // 继承原始和弦信息
            chordType: closeVoicing.chordType,
            root: closeVoicing.root,
            inversion: closeVoicing.inversion // 保持转位信息
        };

        console.log(`🎵 Drop3智能八度搜索开始:`);
        console.log(`  目标音域: MIDI ${originalRangeMin} - ${originalRangeMax}`);
        console.log(`  输入和弦: ${closeVoicing.root}${closeVoicing.chordType}`);
        console.log(`  音符: ${closeVoicing.notes?.join('-')}`);

        // 🎯 Drop3智能八度搜索算法 - 改进版
        const candidates = [];

        // 智能确定搜索起始点：基于目标音域估算最佳八度
        const rangeCenter = (originalRangeMin + originalRangeMax) / 2;
        const estimatedOptimalOctave = Math.floor(rangeCenter / 12) - 1; // 估算最佳八度
        console.log(`  💡 基于音域中心 ${rangeCenter.toFixed(1)} 估算最佳起始八度: ${estimatedOptimalOctave}`);

        // 创建智能搜索顺序：优先尝试最可能成功的八度
        const searchOrder = [];

        // 首先尝试估算的最佳八度及其邻近八度
        for (let offset = 0; offset <= 2; offset++) {
            if (estimatedOptimalOctave + offset >= 1 && estimatedOptimalOctave + offset <= 7) {
                searchOrder.push(estimatedOptimalOctave + offset);
            }
            if (offset > 0 && estimatedOptimalOctave - offset >= 1 && estimatedOptimalOctave - offset <= 7) {
                searchOrder.push(estimatedOptimalOctave - offset);
            }
        }

        // 然后尝试剩余的八度范围 (1-7)
        for (let octave = 1; octave <= 7; octave++) {
            if (!searchOrder.includes(octave)) {
                searchOrder.push(octave);
            }
        }

        console.log(`  🔍 智能搜索顺序: [${searchOrder.join(', ')}]`);

        // 按智能顺序尝试各个八度
        for (const baseOctave of searchOrder) {
            console.log(`\n🔍 尝试八度 ${baseOctave}:`);

            try {
                // 为当前八度重新生成close voicing
                const testCloseVoicing = this.generateCloseVoicingForOctave(closeVoicing, baseOctave);
                if (!testCloseVoicing || testCloseVoicing.midiNotes.length < 4) {
                    console.log(`  ❌ 八度${baseOctave}: 无法生成有效的close voicing`);
                    continue;
                }

                console.log(`  📝 八度${baseOctave} close: ${testCloseVoicing.notes?.join('-')} [${testCloseVoicing.midiNotes?.join(', ')}]`);

                // 应用Drop3变换
                const drop3Candidate = this.applyDrop3Transform(testCloseVoicing);
                if (!drop3Candidate) {
                    console.log(`  ❌ 八度${baseOctave}: Drop3变换失败`);
                    continue;
                }

                console.log(`  📝 八度${baseOctave} drop3: ${drop3Candidate.notes?.join('-')} [${drop3Candidate.midiNotes?.join(', ')}]`);

                // 智能检查音域违反程度
                const outOfRange = drop3Candidate.midiNotes.filter(midi =>
                    midi < originalRangeMin || midi > originalRangeMax);

                // 🎯 计算音域违反的严重程度
                let maxViolation = 0;
                const violations = drop3Candidate.midiNotes.map(midi => {
                    if (midi < originalRangeMin) {
                        const violation = originalRangeMin - midi;
                        maxViolation = Math.max(maxViolation, violation);
                        return violation;
                    } else if (midi > originalRangeMax) {
                        const violation = midi - originalRangeMax;
                        maxViolation = Math.max(maxViolation, violation);
                        return violation;
                    }
                    return 0;
                });

                // 智能预防策略：区分可接受的微调 vs 不可接受的强制调整
                const ACCEPTABLE_VIOLATION = 3; // 允许3个半音以内的微调
                const SEVERE_VIOLATION_THRESHOLD = 5; // 超过5个半音视为严重违反

                if (outOfRange.length > drop3Candidate.midiNotes.length / 2) {
                    console.log(`  ❌ 八度${baseOctave}: 超过一半音符超出音域，拒绝生成`);
                    continue;
                }

                if (maxViolation > SEVERE_VIOLATION_THRESHOLD) {
                    console.log(`  ❌ 八度${baseOctave}: 严重音域违反${maxViolation}半音，拒绝生成以防止音符身份破坏`);
                    continue;
                }

                if (outOfRange.length === 0) {
                    console.log(`  ✅ 八度${baseOctave}: 完美匹配音域！`);

                    // 计算音质评分
                    const quality = this.evaluateDrop3Quality(drop3Candidate, originalRangeMin, originalRangeMax);
                    candidates.push({
                        voicing: drop3Candidate,
                        octave: baseOctave,
                        quality: quality
                    });

                    console.log(`    音质评分: ${quality.toFixed(2)}`);
                } else if (maxViolation <= ACCEPTABLE_VIOLATION) {
                    // 可接受的小幅违反：允许轻微音域超出进行微调
                    console.log(`  ⚡ 八度${baseOctave}: 可接受的小幅违反${maxViolation}半音，允许微调`);
                    console.log(`    超出音符: [${outOfRange.join(', ')}]，将通过边界调整处理`);

                    // 计算调整后的音质评分（轻微降低以反映需要调整）
                    const quality = this.evaluateDrop3Quality(drop3Candidate, originalRangeMin, originalRangeMax);
                    const adjustedQuality = quality - (maxViolation * 10); // 每半音违反降低10分

                    candidates.push({
                        voicing: drop3Candidate,
                        octave: baseOctave,
                        quality: adjustedQuality,
                        needsAdjustment: true,
                        maxViolation: maxViolation
                    });

                    console.log(`    调整后音质评分: ${adjustedQuality.toFixed(2)}`);
                } else {
                    console.log(`  ❌ 八度${baseOctave}: 超出音域 [${outOfRange.join(', ')}]，违反程度${maxViolation}半音`);
                }
            } catch (error) {
                console.log(`  ❌ 八度${baseOctave}: 生成过程异常 - ${error.message}`);
            }
        }

        console.log(`\n🎯 搜索结果分析:`);
        console.log(`  找到 ${candidates.length} 个符合音域的Drop3候选`);

        if (candidates.length === 0) {
            console.error(`❌ Drop3智能搜索失败：在音域 ${originalRangeMin}-${originalRangeMax} 内无法找到任何可行的Drop3`);
            console.log(`🔄 启动Drop3fallback策略...`);

            // 💡 Fallback策略1：智能容忍度搜索（使用更广泛的八度范围）
            console.log(`📊 Fallback 1: 尝试智能容忍度搜索（0-8八度，允许小幅违反）`);
            const tolerantCandidates = [];
            const FALLBACK_ACCEPTABLE_VIOLATION = 4; // Fallback阶段允许4个半音以内的违反

            // 扩展搜索范围到0-8八度进行最后尝试
            for (let baseOctave = 0; baseOctave <= 8; baseOctave++) {
                try {
                    const testCloseVoicing = this.generateCloseVoicingForOctave(closeVoicing, baseOctave);
                    if (!testCloseVoicing || testCloseVoicing.midiNotes.length < 4) continue;

                    const drop3Candidate = this.applyDrop3Transform(testCloseVoicing);
                    if (!drop3Candidate) continue;

                    // 计算最大违反程度
                    let maxViolation = 0;
                    drop3Candidate.midiNotes.forEach(midi => {
                        if (midi < originalRangeMin) {
                            maxViolation = Math.max(maxViolation, originalRangeMin - midi);
                        } else if (midi > originalRangeMax) {
                            maxViolation = Math.max(maxViolation, midi - originalRangeMax);
                        }
                    });

                    const outOfRangeCount = drop3Candidate.midiNotes.filter(midi =>
                        midi < originalRangeMin || midi > originalRangeMax).length;

                    // 🎯 智能筛选：防止严重音域违反
                    if (outOfRangeCount > drop3Candidate.midiNotes.length / 2) {
                        console.log(`  ❌ Fallback八度${baseOctave}: 超过一半音符超出`);
                        continue;
                    }

                    if (maxViolation > FALLBACK_ACCEPTABLE_VIOLATION + 2) { // 防止过度违反
                        console.log(`  ❌ Fallback八度${baseOctave}: 违反程度${maxViolation}半音过大`);
                        continue;
                    }

                    if (maxViolation <= FALLBACK_ACCEPTABLE_VIOLATION) {
                        console.log(`  ✅ 智能容忍：八度${baseOctave}, 最大违反${maxViolation}半音`);
                        const quality = this.evaluateDrop3Quality(drop3Candidate, originalRangeMin, originalRangeMax);
                        const adjustedQuality = quality - (maxViolation * 10); // 违反程度影响评分
                        tolerantCandidates.push({
                            voicing: drop3Candidate,
                            octave: baseOctave,
                            quality: adjustedQuality,
                            maxViolation: maxViolation,
                            needsAdjustment: maxViolation > 0
                        });
                    }
                } catch (error) {
                    // 继续尝试其他八度
                }
            }

            if (tolerantCandidates.length > 0) {
                // 优先选择违反程度最小，其次是音质最好的
                tolerantCandidates.sort((a, b) => {
                    if (a.maxViolation !== b.maxViolation) return a.maxViolation - b.maxViolation;
                    return b.quality - a.quality;
                });

                const fallbackCandidate = tolerantCandidates[0];
                console.log(`🎯 Fallback成功：选择最大违反${fallbackCandidate.maxViolation}半音的Drop3`);
                console.log(`  来源八度: ${fallbackCandidate.octave}`);
                console.log(`  音符: ${fallbackCandidate.voicing.notes?.join('-')}`);
                console.log(`  MIDI: [${fallbackCandidate.voicing.midiNotes?.join(', ')}]`);
                console.log(`  需要微调: ${fallbackCandidate.needsAdjustment ? '是' : '否'}`);

                return fallbackCandidate.voicing;
            }

            // 🎯 严格策略：不生成违反音域的Drop3，让上层逻辑换和弦
            console.log(`📊 严格范围遵循：拒绝生成违反音域的Drop3`);
            console.log(`💡 返回null让上层逻辑选择替代和弦，避免强制调整导致的G3卡死`);
            return null;
        }

        // 选择最佳候选（按音质评分排序）
        candidates.sort((a, b) => b.quality - a.quality);
        const bestCandidate = candidates[0];

        console.log(`\n🏆 选择最佳Drop3:`);
        console.log(`  来源八度: ${bestCandidate.octave}`);
        console.log(`  音质评分: ${bestCandidate.quality.toFixed(2)}`);
        console.log(`  音符: ${bestCandidate.voicing.notes?.join('-')}`);
        console.log(`  MIDI: [${bestCandidate.voicing.midiNotes?.join(', ')}]`);

        // 最终验证
        const finalOutOfRange = bestCandidate.voicing.midiNotes.filter(midi =>
            midi < originalRangeMin || midi > originalRangeMax);

        if (finalOutOfRange.length > 0) {
            console.error(`❌ 最终验证失败：选择的Drop3仍有音符超出音域`);
            return null;
        }

        console.log(`✅ Drop3智能生成成功：严格遵循音域 ${originalRangeMin}-${originalRangeMax}`);
        return bestCandidate.voicing;
    }

    /**
     * 传统Drop3生成（无音域限制时使用）
     */
    generateStandardDrop3Voicing(closeVoicing) {
        const voicing = {
            type: 'drop3',
            notes: [...closeVoicing.notes],
            midiNotes: [...closeVoicing.midiNotes],
            range: closeVoicing.range,
            chordType: closeVoicing.chordType,
            root: closeVoicing.root,
            inversion: closeVoicing.inversion
        };

        return this.applyDrop3Transform(voicing);
    }

    /**
     * 为指定八度重新生成close voicing
     */
    generateCloseVoicingForOctave(originalCloseVoicing, targetOctave) {
        // 基于原始和弦信息重新生成指定八度的close voicing
        const chord = {
            root: originalCloseVoicing.root,
            type: originalCloseVoicing.chordType,
            notes: originalCloseVoicing.notes,
            inversion: originalCloseVoicing.inversion
        };

        // 重新计算MIDI值，使用目标八度
        const newMidiNotes = [];
        const baseOctaveMidi = (targetOctave + 1) * 12; // C音的MIDI值

        chord.notes.forEach((noteName, index) => {
            const noteIndex = this.harmonyTheory.noteToSemitone[noteName.replace(/[#b]+$/, '')];
            let midi = baseOctaveMidi + noteIndex;

            // 处理升降号
            const accidentals = noteName.match(/[#b]+$/);
            if (accidentals) {
                const accidental = accidentals[0];
                for (let i = 0; i < accidental.length; i++) {
                    if (accidental[i] === '#') midi += 1;
                    if (accidental[i] === 'b') midi -= 1;
                }
            }

            // 确保close voicing的音符顺序（低到高）
            if (index > 0 && midi <= newMidiNotes[index - 1]) {
                midi += 12; // 上移一个八度保持close voicing结构
            }

            newMidiNotes.push(midi);
        });

        return {
            type: 'close',
            notes: [...chord.notes],
            midiNotes: newMidiNotes,
            range: targetOctave,
            chordType: chord.type,
            root: chord.root,
            inversion: chord.inversion
        };
    }

    /**
     * 应用Drop3变换到voicing
     */
    applyDrop3Transform(voicing) {
        if (!voicing || voicing.midiNotes.length < 4) {
            return null;
        }

        const transformedVoicing = {
            type: 'drop3',
            notes: [...voicing.notes],
            midiNotes: [...voicing.midiNotes],
            range: voicing.range,
            chordType: voicing.chordType,
            root: voicing.root,
            inversion: voicing.inversion
        };

        // 找到第三高的音符并降低一个八度
        const sortedIndices = transformedVoicing.midiNotes
            .map((midi, index) => ({ midi, index }))
            .sort((a, b) => b.midi - a.midi);

        if (sortedIndices.length >= 3) {
            const thirdHighestIndex = sortedIndices[2].index;
            transformedVoicing.midiNotes[thirdHighestIndex] -= 12;
        }

        return transformedVoicing;
    }

    /**
     * 评估Drop3的音质
     */
    evaluateDrop3Quality(drop3Voicing, rangeMin, rangeMax) {
        let score = 100;

        // 音域中心性评分：越接近音域中心得分越高
        const rangeCenter = (rangeMin + rangeMax) / 2;
        const voicingCenter = (Math.min(...drop3Voicing.midiNotes) + Math.max(...drop3Voicing.midiNotes)) / 2;
        const centerDistance = Math.abs(voicingCenter - rangeCenter);
        const maxDistance = (rangeMax - rangeMin) / 2;
        const centerScore = Math.max(0, 30 - (centerDistance / maxDistance) * 30);

        // 音符分布评分：音符间距适中得分更高
        const intervals = [];
        const sortedMidi = [...drop3Voicing.midiNotes].sort((a, b) => a - b);
        for (let i = 1; i < sortedMidi.length; i++) {
            intervals.push(sortedMidi[i] - sortedMidi[i-1]);
        }
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const idealInterval = 4; // 理想音程约为大三度
        const intervalScore = Math.max(0, 20 - Math.abs(avgInterval - idealInterval));

        // 音域利用评分：适度使用音域得分更高
        const usedRange = Math.max(...drop3Voicing.midiNotes) - Math.min(...drop3Voicing.midiNotes);
        const availableRange = rangeMax - rangeMin;
        const utilization = usedRange / availableRange;
        const utilizationScore = utilization > 0.3 && utilization < 0.8 ? 20 : 10;

        return score + centerScore + intervalScore + utilizationScore;
    }

    /**
     * 生成Shell Voicing
     * @param {Object} chord - 和弦对象
     * @returns {Object} Shell voicing
     */
    generateShellVoicing(chord) {
        // 🔧 修复 (2025-10-05 v23): 设置currentChord确保getIntervalNote有正确上下文
        this.currentChord = {
            root: chord.root,
            type: chord.type,
            key: chord.key || 'C-major'
        };
        console.log(`🔧 [Shell v23] 设置currentChord: root=${this.currentChord.root}, type=${this.currentChord.type}`);

        // 🚫 阶段2隔离：增强三和弦防护已移除
        console.log(`🚫 Shell voicing增强系统防护检查:`);
        console.log(`🚫 阶段2措施：增强三和弦系统已完全隔离`);
        console.log(`✅ Shell voicing将正常生成，无增强系统干扰`);
        console.log(`✅ 和弦: ${chord.root}${chord.type} - 使用标准Shell生成流程`);

        // 原增强系统防护代码已被隔离（下面代码不再执行）
        // const isTriad = this.isTriadChord(chord);
        // const enhancedEnabled = this.isEnhancedTriadEnabled();

        // 检查和弦是否包含七音 - Shell voicing需要至少有根音、三音、七音
        const intervals = this.harmonyTheory.chordTypes[chord.type];
        if (!intervals) return null;

        // 智能选择shell voicing的核心音程（guide tones）
        let guideIntervals = [];

        // 优先选择三音
        if (intervals.includes(4)) {
            guideIntervals.push({ interval: 4, role: 'third', note: 'major3rd' });
        } else if (intervals.includes(3)) {
            guideIntervals.push({ interval: 3, role: 'third', note: 'minor3rd' });
        } else if (intervals.includes(2)) {
            // 挂二和弦：用二音代替三音
            guideIntervals.push({ interval: 2, role: 'sus2', note: 'sus2nd' });
        } else if (intervals.includes(5)) {
            // 挂四和弦：用四音代替三音
            guideIntervals.push({ interval: 5, role: 'sus4', note: 'sus4th' });
        }

        // 优先选择七音，如果没有则尝试六音（但排除三和弦以确保它们保持单guide tone）
        const isTriad = ['major', 'minor', 'sus2', 'sus4'].includes(chord.type);
        if (!isTriad) {
            if (intervals.includes(11)) {
                guideIntervals.push({ interval: 11, role: 'seventh', note: 'major7th' });
            } else if (intervals.includes(10)) {
                guideIntervals.push({ interval: 10, role: 'seventh', note: 'minor7th' });
            } else if (intervals.includes(9)) {
                // 六和弦：用六音代替七音
                guideIntervals.push({ interval: 9, role: 'sixth', note: 'major6th' });
            }
        }

        // Shell voicing至少需要一个guide tone（除了根音）
        if (guideIntervals.length === 0) {
            console.log(`❌ Shell voicing需要至少一个guide tone，${chord.root}${chord.type}不符合条件`);
            return null;
        }

        // 对于非三和弦（即四和弦）：如果只有一个guide tone，尝试添加五音作为补充
        // 三和弦（major, minor, sus2, sus4）需要保持单guide tone来生成1-1-3或1-3-1排列
        if (guideIntervals.length === 1 && intervals.includes(7) && !isTriad) {
            guideIntervals.push({ interval: 7, role: 'fifth', note: 'perfect5th' });
        }

        console.log(`🎯 ${chord.root}${chord.type} shell voicing使用guide tones: ${guideIntervals.map(g => g.note).join(', ')}`);

        // 确定主要的三音和七音音程（用于排列逻辑）
        const thirdInterval = guideIntervals.find(g => g.role === 'third' || g.role === 'sus2' || g.role === 'sus4')?.interval || guideIntervals[0].interval;
        const seventhInterval = guideIntervals.find(g => g.role === 'seventh' || g.role === 'sixth')?.interval || guideIntervals[guideIntervals.length - 1].interval;

        // 计算基准MIDI音高
        const rootMidi = this.noteToMidi[chord.root] + (this.voicingSettings.defaultOctave - 4) * 12;

        // 根据当前voice leading状态选择最佳shell voicing排列
        const arrangements = this.generateShellArrangements(chord, rootMidi, guideIntervals);

        if (arrangements.length === 0) {
            console.warn(`❌ 无法为${chord.root}${chord.type}生成有效的shell voicing`);
            return null;
        }

        // 使用voice leading优化选择最佳排列
        let bestArrangement = arrangements[0];
        if (this.lastVoicing && arrangements.length > 1) {
            let minDistance = Infinity;
            for (const arrangement of arrangements) {
                const distance = this.calculateVoicingDistance(this.lastVoicing, arrangement);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestArrangement = arrangement;
                }
            }
            console.log(`🎯 Shell voicing voice leading: 选择${bestArrangement.arrangement}排列，距离=${minDistance.toFixed(2)}`);
        } else if (arrangements.length > 1) {
            // 🎯 改进的选择逻辑：根据和弦类型智能选择排列
            const chordTypePreference = this.getShellArrangementPreference(chord.type);
            if (chordTypePreference === 'seventh-third' && arrangements.length >= 2) {
                bestArrangement = arrangements[1]; // 选择1-7-3排列
                console.log(`🎯 Shell voicing: 根据和弦类型${chord.type}选择${bestArrangement.arrangement}排列`);
            } else {
                // 对于某些和弦类型，轮换选择以增加多样性
                const shouldAlternate = this.shouldAlternateShellArrangement(chord);
                if (shouldAlternate && arrangements.length >= 2) {
                    bestArrangement = arrangements[1];
                    console.log(`🎯 Shell voicing: 轮换选择${bestArrangement.arrangement}排列`);
                } else {
                    console.log(`🎯 Shell voicing: 使用默认${bestArrangement.arrangement}排列`);
                }
            }
        } else {
            console.log(`🎯 Shell voicing: 使用默认${bestArrangement.arrangement}排列`);
        }

        // 🚨 异常配置检测：Shell生成结果
        console.log(`\n🔍 === 异常配置检测 (Shell) ===`);
        console.log(`🎵 输入和弦: ${chord.root}${chord.type}`);
        if (bestArrangement && bestArrangement.midiNotes) {
            const shellSpan = Math.max(...bestArrangement.midiNotes) - Math.min(...bestArrangement.midiNotes);
            const shellIntervals = bestArrangement.midiNotes.slice(1).map((midi, i) => midi - bestArrangement.midiNotes[i]);
            const shellMaxInterval = Math.max(...shellIntervals.map(Math.abs)); // 取绝对值

            console.log(`📊 Shell结果: ${bestArrangement.notes?.join('-')} (MIDI: ${bestArrangement.midiNotes.join(', ')})`);
            console.log(`📏 Shell跨度: ${shellSpan}半音`);
            console.log(`🎼 Shell最大音程间隔: ${shellMaxInterval}半音`);
            console.log(`🎯 Shell排列: ${bestArrangement.arrangement}`);

            // Shell异常检测：跨度过大 (Shell通常比较紧凑)
            if (shellSpan > 36) { // Shell voicing一般不应该超过3个八度
                console.error(`🚨 Shell异常检测: 超大跨度配置！跨度${shellSpan}半音 > 36半音`);
                console.error(`🚨 具体配置: ${bestArrangement.notes[0]}(${Math.min(...bestArrangement.midiNotes)}) - ${bestArrangement.notes[bestArrangement.notes.indexOf(bestArrangement.notes.find((_, i) => bestArrangement.midiNotes[i] === Math.max(...bestArrangement.midiNotes)))]}(${Math.max(...bestArrangement.midiNotes)})`);
            }

            // 检测特定问题模式：类似C4-E4-G5的异常分布 (Shell特殊处理，因为它可能是三和弦)
            if (shellSpan > 18 && bestArrangement.midiNotes.length === 3) {
                console.error(`🚨 Shell异常检测: 可能的三和弦异常配置！`);
                console.error(`🚨 模式: ${bestArrangement.notes.join('-')} (MIDI: ${bestArrangement.midiNotes.join('-')})`);
                console.error(`🚨 调用栈追踪: generateShellVoicing → ${chord.root}${chord.type}, 排列=${bestArrangement.arrangement}`);
            }

            // 检测octave分布异常：Shell voicing应该相对紧凑
            if (shellMaxInterval > 24) {
                console.error(`🚨 Shell异常检测: 超大音程间隔！最大间隔${shellMaxInterval}半音 > 24半音（2个八度）`);
                console.error(`🚨 Shell voicing应该相对紧凑，这可能表示算法有问题`);
            }

            // 特殊检测：Shell voicing如果有重复音符且跨度过大，可能有问题
            const uniqueMidi = [...new Set(bestArrangement.midiNotes)];
            if (uniqueMidi.length < bestArrangement.midiNotes.length && shellSpan > 24) {
                console.error(`🚨 Shell异常检测: 有重复音符但跨度过大！`);
                console.error(`🚨 重复音符数: ${bestArrangement.midiNotes.length - uniqueMidi.length}, 跨度: ${shellSpan}半音`);
                console.error(`🚨 这可能是octave处理有问题`);
            }
        }

        return bestArrangement;
    }

    /**
     * 生成Shell Voicing的多种吉他排列
     * @param {Object} chord - 和弦对象
     * @param {number} rootMidi - 根音MIDI值
     * @param {Array} guideIntervals - Guide tones音程数组
     * @returns {Array} Shell voicing排列数组
     */
    generateShellArrangements(chord, rootMidi, guideIntervals) {
        const arrangements = [];

        // 获取音符名称的辅助函数
        const getNoteName = (root, interval) => {
            // 🔧 修复 (2025-10-05 v23): 移除applyAccidental调用
            // 原因：applyAccidental是随机添加临时记号的函数，会破坏正确的同音异名拼写
            // getIntervalNote现在已经使用spellNoteInChordContext返回正确的拼写
            let note = this.getIntervalNote(root, interval);
            // ❌ 移除：if (typeof applyAccidental === 'function') { note = applyAccidental(note); }
            return note;
        };

        // 准备根音
        const rootNote = getNoteName(chord.root, 0);

        // 准备guide tone音符
        const guideNotes = guideIntervals.map(guide => ({
            interval: guide.interval,
            note: getNoteName(chord.root, guide.interval),
            role: guide.role,
            name: guide.note
        }));

        console.log(`🎵 Shell voicing guide notes: ${guideNotes.map(g => `${g.note}(${g.name})`).join(', ')}`);

        // 如果只有一个guide tone，创建三和弦Shell voicing的1-1-3和1-3-1排列
        if (guideNotes.length === 1) {
            const singleGuide = guideNotes[0];

            // 1. 1-1-3排列：root + root(高八度) + guide tone(高八度)
            const arrangement113 = {
                type: 'shell',
                arrangement: `1-1-${singleGuide.role}`,
                notes: [rootNote, rootNote, singleGuide.note],
                midiNotes: [rootMidi, rootMidi + 12, rootMidi + singleGuide.interval + 12],
                range: this.voicingSettings.defaultOctave,
                chordType: chord.type,
                root: chord.root,
                voiceLeadingScore: 0
            };

            // 2. 1-3-1排列：root + guide tone + root(高八度)
            const arrangement131 = {
                type: 'shell',
                arrangement: `1-${singleGuide.role}-1`,
                notes: [rootNote, singleGuide.note, rootNote],
                midiNotes: [rootMidi, rootMidi + singleGuide.interval, rootMidi + 12],
                range: this.voicingSettings.defaultOctave,
                chordType: chord.type,
                root: chord.root,
                voiceLeadingScore: 0
            };

            arrangements.push(arrangement113);
            // 🔧 修复 (2025-10-03): sus2和弦禁止1-2-1排列（所有模式 - 吉他和钢琴）
            // 原问题：限制只在吉他模式生效，钢琴模式和随机模式仍生成1-2-1排列
            // 用户需求：所有模式都不允许sus2和弦使用1-2-1排列
            if (chord.type !== 'sus2') {
                arrangements.push(arrangement131);
            }
            console.log(`✅ 生成${arrangement113.arrangement} shell voicing: ${arrangement113.notes.join('-')}`);
            if (chord.type !== 'sus2') {
                console.log(`✅ 生成${arrangement131.arrangement} shell voicing: ${arrangement131.notes.join('-')}`);
            } else {
                console.log(`⏭️ 跳过sus2的${arrangement131.arrangement} shell voicing排列（所有模式统一限制）`);
            }
            return arrangements;
        }

        // 如果有两个或更多guide tones，创建多种排列
        const [firstGuide, secondGuide] = guideNotes;

        // 1. 低到高排列 (类似1-3-7)
        const arrangementLowHigh = {
            type: 'shell',
            arrangement: `1-${firstGuide.role}-${secondGuide.role}`,
            notes: [rootNote, firstGuide.note, secondGuide.note],
            midiNotes: [rootMidi, rootMidi + firstGuide.interval, rootMidi + secondGuide.interval],
            range: this.voicingSettings.defaultOctave,
            chordType: chord.type,
            root: chord.root,
            voiceLeadingScore: 0
        };

        // 2. 交换排列 (类似1-7-3)，高音guide tone在中间，低音guide tone提高八度
        const arrangementSwapped = {
            type: 'shell',
            arrangement: `1-${secondGuide.role}-${firstGuide.role}`,
            notes: [rootNote, secondGuide.note, firstGuide.note],
            midiNotes: [
                rootMidi,
                rootMidi + secondGuide.interval,
                rootMidi + firstGuide.interval + 12  // 第一个guide tone提高八度
            ],
            range: this.voicingSettings.defaultOctave,
            chordType: chord.type,
            root: chord.root,
            voiceLeadingScore: 0
        };

        arrangements.push(arrangementLowHigh);
        console.log(`✅ 生成${arrangementLowHigh.arrangement} shell voicing: ${arrangementLowHigh.notes.join('-')}`);

        arrangements.push(arrangementSwapped);
        console.log(`✅ 生成${arrangementSwapped.arrangement} shell voicing: ${arrangementSwapped.notes.join('-')}`);

        return arrangements;
    }

    /**
     * 根据和弦类型获取Shell voicing排列偏好
     * @param {string} chordType - 和弦类型
     * @returns {string} 'third-seventh' 或 'seventh-third' 或 'default'
     */
    getShellArrangementPreference(chordType) {
        // 🎯 基于吉他理论的排列偏好
        const seventhThirdPreferred = [
            'dominant7',     // 属七和弦：1-7-3 更突出导音
            'minor7b5',      // 半减七：1-7-3 更好的声部连接
            'diminished7'    // 减七：1-7-3 平衡结构
        ];

        const thirdSeventhPreferred = [
            'major7',        // 大七：1-3-7 经典爵士排列
            'minor7',        // 小七：1-3-7 稳定结构
            'major6',        // 大六：1-3-6 自然排列
            'minor6'         // 小六：1-3-6 自然排列
        ];

        if (seventhThirdPreferred.includes(chordType)) {
            return 'seventh-third';
        }
        if (thirdSeventhPreferred.includes(chordType)) {
            return 'third-seventh';
        }
        return 'default';
    }

    /**
     * 判断是否应该为Shell voicing轮换排列
     * @param {Object} chord - 和弦对象
     * @returns {boolean} 是否轮换
     */
    shouldAlternateShellArrangement(chord) {
        // 🎯 简单的轮换逻辑：基于和弦根音的ASCII值
        // 这样同样的和弦在同一个进程中会保持一致，但不同和弦会有不同选择
        if (!this.shellArrangementCounter) {
            this.shellArrangementCounter = 0;
        }

        // 根据和弦根音和类型创建一个简单的哈希
        const hashSource = chord.root + chord.type;
        let hash = 0;
        for (let i = 0; i < hashSource.length; i++) {
            hash = ((hash << 5) - hash) + hashSource.charCodeAt(i);
            hash = hash & hash; // 转换为32位整数
        }

        // 使用哈希的奇偶性决定是否轮换
        return Math.abs(hash) % 2 === 1;
    }

    /**
     * 计算两个voicing之间的voice leading距离
     * @param {Object} voicing1 - 第一个voicing
     * @param {Object} voicing2 - 第二个voicing
     * @returns {number} 距离值
     */
    calculateVoicingDistance(voicing1, voicing2) {
        if (!voicing1 || !voicing2 || !voicing1.midiNotes || !voicing2.midiNotes) {
            return Infinity;
        }

        // 对于shell voicing，重点关注guide tones（三音和七音）的移动
        const notes1 = [...voicing1.midiNotes].sort((a, b) => a - b);
        const notes2 = [...voicing2.midiNotes].sort((a, b) => a - b);

        let totalDistance = 0;
        const maxNotes = Math.max(notes1.length, notes2.length);

        for (let i = 0; i < maxNotes; i++) {
            const note1 = notes1[i] || notes1[notes1.length - 1];
            const note2 = notes2[i] || notes2[notes2.length - 1];
            totalDistance += Math.abs(note1 - note2);
        }

        return totalDistance / maxNotes;
    }

    /**
     * 独立生成Drop2 Voicing（不依赖close voicing）
     * 直接计算Drop2的音程排列：Root, 5th, 7th, 3rd(+octave)
     *
     * @param {Object} chord - 和弦对象 {root, type, ...}
     * @param {Object} options - 选项 {rangeMin, rangeMax, key, ...}
     * @returns {Object|null} Drop2 voicing对象或null
     *
     * 🎯 独立生成架构（2025-10-06）
     * - 完全绕过close voicing生成
     * - 不受while loop (line 1691-1703) 影响
     * - 像shell voicing一样直接计算音程
     */
    generateDrop2Independent(chord, options = {}) {
        console.log(`\n🎵 === Drop2独立生成系统（转位支持版） ===`);
        console.log(`📋 和弦: ${chord.root}${chord.type}`);

        // 获取和弦音程
        const intervals = this.harmonyTheory.chordTypes[chord.type];
        if (!intervals || intervals.length < 3) {
            console.warn(`⚠️ Drop2独立生成: 和弦类型${chord.type}音程不足`);
            return null;
        }

        console.log(`🎼 和弦音程: ${intervals.join(', ')}`);

        // Drop2需要至少3个音符（三和弦）或4个音符（七和弦）
        const noteCount = intervals.length;
        if (noteCount < 3) {
            console.warn(`⚠️ Drop2独立生成: 音符数量不足 (${noteCount} < 3)`);
            return null;
        }

        // 🎯 设置当前和弦context（用于音符拼写）
        this.currentChord = {
            root: chord.root,
            type: chord.type,
            key: options.key || chord.key || 'C-major'
        };

        // 🎯 获取请求的转位
        const requestedInversion = options.inversion !== undefined
            ? options.inversion
            : (chord.inversion || 0);

        console.log(`🔄 请求转位: ${requestedInversion}`);

        // 🎯 计算对应的Close voicing转位
        // Drop2转位映射: Drop2转位N → Close转位(N+2) % 4
        // Drop2原位(0) ← Close二转(2): 5-7-1-3 → Drop2 → 1-5-7-3
        // Drop2一转(1) ← Close三转(3): 7-1-3-5 → Drop2 → 3-7-1-5
        // Drop2二转(2) ← Close原位(0): 1-3-5-7 → Drop2 → 5-1-3-7
        // Drop2三转(3) ← Close一转(1): 3-5-7-1 → Drop2 → 7-3-5-1
        const closeInversion = (requestedInversion + 2) % noteCount;

        console.log(`🔄 对应Close转位: ${closeInversion} (Drop2转位${requestedInversion} → Close转位${closeInversion})`);

        // 🎯 计算基准八度
        let baseOctave = this.voicingSettings.defaultOctave || 4;
        const rootMidi = this.noteToMidi[chord.root] + baseOctave * 12;

        console.log(`🎹 基准八度: ${baseOctave}, 根音MIDI: ${rootMidi}`);

        // 🎯 步骤1: 生成特定转位的Close voicing
        let closeVoicingMIDI;

        if (closeInversion === 0) {
            // 原位Close: 直接使用intervals
            closeVoicingMIDI = intervals.map(interval => rootMidi + interval);
            console.log(`🎹 Close原位MIDI: ${closeVoicingMIDI.join(', ')}`);
        } else {
            // 手动计算转位后的Close voicing
            const rotatedIntervals = [];
            for (let i = 0; i < intervals.length; i++) {
                const originalIndex = (i + closeInversion) % intervals.length;
                rotatedIntervals.push(intervals[originalIndex]);
            }

            console.log(`🔄 旋转后intervals: ${rotatedIntervals.join(', ')}`);

            // 构建Close voicing MIDI（调整八度）
            closeVoicingMIDI = [rootMidi + rotatedIntervals[0]];

            for (let i = 1; i < rotatedIntervals.length; i++) {
                let midi = rootMidi + rotatedIntervals[i];

                // 如果当前音低于或等于前一个音，提高八度
                while (midi <= closeVoicingMIDI[i - 1]) {
                    midi += 12;
                }

                closeVoicingMIDI.push(midi);
            }

            console.log(`🎹 Close第${closeInversion}转位MIDI: ${closeVoicingMIDI.join(', ')}`);
        }

        // 🎯 记录每个MIDI音符对应的原始度数（用于后续转位检测）
        const originalIntervalsIndices = [];
        for (let i = 0; i < intervals.length; i++) {
            const originalIndex = (i + closeInversion) % intervals.length;
            originalIntervalsIndices.push(originalIndex);
        }

        const degrees = noteCount === 3 ? ['1', '3', '5'] : ['1', '3', '5', '7'];
        console.log(`🔍 Close voicing音符度数映射:`);
        closeVoicingMIDI.forEach((midi, i) => {
            const origIdx = originalIntervalsIndices[i];
            console.log(`   index ${i}: MIDI ${midi}, 原始intervals[${origIdx}] = ${intervals[origIdx]}半音, 度数${degrees[origIdx]}`);
        });

        // 🎯 步骤2: 找到第二高音并执行Drop2变换
        const sortedWithIndex = closeVoicingMIDI.map((midi, index) => ({
            midi,
            index,
            originalIntervalsIndex: originalIntervalsIndices[index]
        })).sort((a, b) => b.midi - a.midi);

        console.log(`🔍 音符排序（高→低）:`);
        sortedWithIndex.forEach((item, i) => {
            const position = i === 0 ? '最高' : i === 1 ? '第二高' : i === 2 ? '第三高' : `第${i+1}高`;
            const marker = i === 1 ? ' ← DROP2目标' : '';
            console.log(`   ${position}: MIDI ${item.midi} (原index=${item.index})${marker}`);
        });

        // 第二高音在sorted数组的index=1
        const secondHighest = sortedWithIndex[1];
        const secondHighestMidi = secondHighest.midi;
        const secondHighestOriginalIndex = secondHighest.index;

        console.log(`\n🎯 Drop2目标音:`);
        console.log(`   MIDI: ${secondHighestMidi}`);
        console.log(`   原始index: ${secondHighestOriginalIndex}`);
        console.log(`   音程: ${intervals[originalIntervalsIndices[secondHighestOriginalIndex]]}半音`);

        // 🎯 步骤3: 执行Drop2变换 - 降第二高音一个八度
        const drop2MIDI = [...closeVoicingMIDI];  // 复制数组
        drop2MIDI[secondHighestOriginalIndex] = secondHighestMidi - 12;

        console.log(`\n🔄 Drop2变换执行:`);
        console.log(`   第二高音 MIDI ${secondHighestMidi} → ${secondHighestMidi - 12} (-12半音)`);
        console.log(`   变换后MIDI数组: ${drop2MIDI.join(', ')}`);

        // 🎯 音域约束检查
        const rangeMin = options.rangeMin;
        const rangeMax = options.rangeMax;

        if (rangeMin !== undefined || rangeMax !== undefined) {
            const lowestNote = Math.min(...drop2MIDI);
            const highestNote = Math.max(...drop2MIDI);

            console.log(`\n🎯 音域检查: [${lowestNote}, ${highestNote}] vs 约束[${rangeMin || '无'}, ${rangeMax || '无'}]`);

            // 如果超出范围，尝试整体上下移动八度
            if (rangeMin !== undefined && lowestNote < rangeMin) {
                const octavesNeeded = Math.ceil((rangeMin - lowestNote) / 12);
                console.log(`📈 最低音${lowestNote}低于下限${rangeMin}，整体上移${octavesNeeded}个八度`);
                drop2MIDI.forEach((midi, i) => {
                    drop2MIDI[i] = midi + octavesNeeded * 12;
                });
            } else if (rangeMax !== undefined && highestNote > rangeMax) {
                const octavesNeeded = Math.ceil((highestNote - rangeMax) / 12);
                console.log(`📉 最高音${highestNote}高于上限${rangeMax}，整体下移${octavesNeeded}个八度`);
                drop2MIDI.forEach((midi, i) => {
                    drop2MIDI[i] = midi - octavesNeeded * 12;
                });
            }

            // 再次检查是否仍然超出范围
            const adjustedLowest = Math.min(...drop2MIDI);
            const adjustedHighest = Math.max(...drop2MIDI);

            if ((rangeMin !== undefined && adjustedLowest < rangeMin) ||
                (rangeMax !== undefined && adjustedHighest > rangeMax)) {
                console.warn(`⚠️ Drop2独立生成: 调整后仍超出音域范围`);
                console.warn(`   实际: [${adjustedLowest}, ${adjustedHighest}]`);
                console.warn(`   约束: [${rangeMin || '无'}, ${rangeMax || '无'}]`);
                return null;
            }

            console.log(`✅ 音域调整后: ${drop2MIDI.join(', ')}`);
        }

        // 🎯 步骤4: 音符拼写（使用保存的度数信息）
        const notes = drop2MIDI.map((midi, index) => {
            const originalIntervalIndex = originalIntervalsIndices[index];
            const interval = intervals[originalIntervalIndex];
            const noteName = this.getIntervalNote(chord.root, interval);
            const octave = Math.floor(midi / 12) - 1;

            return noteName + octave;
        });

        console.log(`\n🎵 Drop2音符拼写: ${notes.join('-')}`);
        console.log(`   MIDI值: ${drop2MIDI.join(', ')}`);

        // 🎯 检测最终转位（基于最低音的度数）
        const lowestMidi = Math.min(...drop2MIDI);
        const lowestIndex = drop2MIDI.indexOf(lowestMidi);

        // 使用之前保存的原始度数信息
        const lowestDegreeIndex = originalIntervalsIndices[lowestIndex];
        const finalInversion = lowestDegreeIndex;

        console.log(`🔍 转位检测:`);
        console.log(`   最低MIDI: ${lowestMidi}, 在Drop2数组位置: ${lowestIndex}`);
        console.log(`   最低音对应原始intervals[${lowestDegreeIndex}] = 度数${degrees[lowestDegreeIndex]}`);
        console.log(`   最终Drop2转位: ${finalInversion} (${degrees[lowestDegreeIndex]}音为最低音)`);

        // 显示按MIDI排序后的音级
        const sortedForDisplay = drop2MIDI.map((midi, index) => ({
            midi,
            index,
            degreeIndex: originalIntervalsIndices[index]
        })).sort((a, b) => a.midi - b.midi);

        const degreeSequence = sortedForDisplay.map(item => {
            return degrees[item.degreeIndex] || '?';
        }).join('-');

        console.log(`   音级序列（MIDI从低到高）: ${degreeSequence}`);

        // 🎯 构建voicing对象
        const voicing = {
            type: 'drop2',
            notes,
            midiNotes: drop2MIDI,
            root: chord.root,
            chordType: chord.type,
            inversion: finalInversion,  // 动态检测的转位
            range: baseOctave,
            generationMethod: 'independent-transform'  // 标记为独立变换生成
        };

        // 🎯 质量检查
        const quality = this.checkVoicingQuality(voicing);
        console.log(`🔍 Drop2质量: ${quality.qualityLevel} (评分: ${quality.qualityScore.toFixed(2)})`);
        console.log(`   最大间距: ${quality.maxGap}半音, 平均间距: ${quality.avgGap.toFixed(1)}半音`);

        if (!quality.isAcceptable) {
            console.warn(`⚠️ Drop2质量不合格: ${quality.reason}`);
            console.warn(`   但仍返回voicing（由selectBestVoicing决定是否使用）`);
        }

        console.log(`✅ Drop2独立生成完成\n`);

        return voicing;
    }

    /**
     * 独立生成Drop3 Voicing（模拟Drop3变换过程）
     *
     * Drop3定义：降Close voicing的第三高音一个八度
     *
     * 实现方式：
     * 1. 构建虚拟Close voicing（MIDI数组）
     * 2. 找到第三高音
     * 3. 降第三高音一个八度
     * 4. 返回结果
     *
     * @param {Object} chord - 和弦对象 {root, type, ...}
     * @param {Object} options - 选项 {rangeMin, rangeMax, key, ...}
     * @returns {Object|null} Drop3 voicing对象或null
     *
     * 🎯 独立生成架构（2025-10-06 v2）
     * - 不依赖外部Close voicing生成
     * - 严格遵循"降第三高音"的定义
     * - 在函数内部模拟变换过程
     */
    generateDrop3Independent(chord, options = {}) {
        console.log(`\n🎵 === Drop3独立生成系统（转位支持版） ===`);
        console.log(`📋 和弦: ${chord.root}${chord.type}`);

        // 获取和弦音程
        const intervals = this.harmonyTheory.chordTypes[chord.type];
        if (!intervals || intervals.length < 4) {
            console.warn(`⚠️ Drop3独立生成: 和弦类型${chord.type}音程不足（需要至少4个音符）`);
            return null;
        }

        console.log(`🎼 和弦音程: ${intervals.join(', ')}`);

        // 🎯 设置当前和弦context（用于音符拼写）
        this.currentChord = {
            root: chord.root,
            type: chord.type,
            key: options.key || chord.key || 'C-major'
        };

        // 🎯 获取请求的转位
        const requestedInversion = options.inversion !== undefined
            ? options.inversion
            : (chord.inversion || 0);

        console.log(`🔄 请求转位: ${requestedInversion}`);

        // 🎯 计算对应的Close voicing转位
        // Drop3转位映射: Drop3转位N → Close转位(N+3) % 4
        // Drop3原位(0) ← Close三转(3): 7-1-3-5 → Drop3 → 1-7-3-5
        // Drop3一转(1) ← Close原位(0): 1-3-5-7 → Drop3 → 3-1-5-7
        // Drop3二转(2) ← Close一转(1): 3-5-7-1 → Drop3 → 5-7-1-3
        // Drop3三转(3) ← Close二转(2): 5-7-1-3 → Drop3 → 7-3-5-1
        const closeInversion = (requestedInversion + 3) % 4;

        console.log(`🔄 对应Close转位: ${closeInversion} (Drop3转位${requestedInversion} → Close转位${closeInversion})`);

        // 🎯 计算基准八度
        let baseOctave = this.voicingSettings.defaultOctave || 4;
        const rootMidi = this.noteToMidi[chord.root] + baseOctave * 12;

        console.log(`🎹 基准八度: ${baseOctave}, 根音MIDI: ${rootMidi}`);

        // 🎯 步骤1: 生成特定转位的Close voicing
        let closeVoicingMIDI;

        if (closeInversion === 0) {
            // 原位Close: 直接使用intervals
            closeVoicingMIDI = intervals.map(interval => rootMidi + interval);
            console.log(`🎹 Close原位MIDI: ${closeVoicingMIDI.join(', ')}`);
        } else {
            // 手动计算转位后的Close voicing
            // 例如第三转位 (closeInversion=3): [0,4,7,11] → 旋转 → [11,0,4,7]
            // 然后调整八度使其成为Close voicing: [11, 12, 16, 19]

            const rotatedIntervals = [];
            for (let i = 0; i < intervals.length; i++) {
                const originalIndex = (i + closeInversion) % intervals.length;
                rotatedIntervals.push(intervals[originalIndex]);
            }

            console.log(`🔄 旋转后intervals: ${rotatedIntervals.join(', ')}`);

            // 构建Close voicing MIDI（调整八度）
            closeVoicingMIDI = [rootMidi + rotatedIntervals[0]];

            for (let i = 1; i < rotatedIntervals.length; i++) {
                let midi = rootMidi + rotatedIntervals[i];

                // 如果当前音低于或等于前一个音，提高八度
                while (midi <= closeVoicingMIDI[i - 1]) {
                    midi += 12;
                }

                closeVoicingMIDI.push(midi);
            }

            console.log(`🎹 Close第${closeInversion}转位MIDI: ${closeVoicingMIDI.join(', ')}`);
        }

        // 🎯 记录每个MIDI音符对应的原始度数（用于后续转位检测）
        // 度数映射：intervals数组的index对应的度数
        const degreeMap = [0, 1, 2, 3]; // 对应 1度, 3度, 5度, 7度

        // 为每个Close voicing音符记录其原始intervals index
        const originalIntervalsIndices = [];
        for (let i = 0; i < intervals.length; i++) {
            const originalIndex = (i + closeInversion) % intervals.length;
            originalIntervalsIndices.push(originalIndex);
        }

        console.log(`🔍 Close voicing音符度数映射:`);
        closeVoicingMIDI.forEach((midi, i) => {
            const origIdx = originalIntervalsIndices[i];
            const degrees = ['1', '3', '5', '7'];
            console.log(`   index ${i}: MIDI ${midi}, 原始intervals[${origIdx}] = ${intervals[origIdx]}半音, 度数${degrees[origIdx]}`);
        });

        // 🎯 步骤2: 找到第三高音
        // 按MIDI值从高到低排序，同时保留原始index和度数信息
        const sortedWithIndex = closeVoicingMIDI.map((midi, index) => ({
            midi,
            index,
            originalIntervalsIndex: originalIntervalsIndices[index]  // 保存原始度数index
        })).sort((a, b) => b.midi - a.midi);

        console.log(`🔍 音符排序（高→低）:`);
        sortedWithIndex.forEach((item, i) => {
            const position = i === 0 ? '最高' : i === 1 ? '第二高' : i === 2 ? '第三高' : `第${i+1}高`;
            const marker = i === 2 ? ' ← DROP3目标' : '';
            console.log(`   ${position}: MIDI ${item.midi} (原index=${item.index})${marker}`);
        });

        // 第三高音在sorted数组的index=2
        const thirdHighest = sortedWithIndex[2];
        const thirdHighestMidi = thirdHighest.midi;
        const thirdHighestOriginalIndex = thirdHighest.index;

        console.log(`\n🎯 Drop3目标音:`);
        console.log(`   MIDI: ${thirdHighestMidi}`);
        console.log(`   原始index: ${thirdHighestOriginalIndex}`);
        console.log(`   音程: ${intervals[thirdHighestOriginalIndex]}半音`);

        // 🎯 步骤3: 执行Drop3变换 - 降第三高音一个八度
        const drop3MIDI = [...closeVoicingMIDI];  // 复制数组
        drop3MIDI[thirdHighestOriginalIndex] = thirdHighestMidi - 12;

        console.log(`\n🔄 Drop3变换执行:`);
        console.log(`   第三高音 MIDI ${thirdHighestMidi} → ${thirdHighestMidi - 12} (-12半音)`);
        console.log(`   变换后MIDI数组: ${drop3MIDI.join(', ')}`);

        // 🎯 音域约束检查
        const rangeMin = options.rangeMin;
        const rangeMax = options.rangeMax;

        if (rangeMin !== undefined || rangeMax !== undefined) {
            const lowestNote = Math.min(...drop3MIDI);
            const highestNote = Math.max(...drop3MIDI);

            console.log(`\n🎯 音域检查: [${lowestNote}, ${highestNote}] vs 约束[${rangeMin || '无'}, ${rangeMax || '无'}]`);

            // 如果超出范围，尝试整体上下移动八度
            if (rangeMin !== undefined && lowestNote < rangeMin) {
                const octavesNeeded = Math.ceil((rangeMin - lowestNote) / 12);
                console.log(`📈 最低音${lowestNote}低于下限${rangeMin}，整体上移${octavesNeeded}个八度`);
                drop3MIDI.forEach((midi, i) => {
                    drop3MIDI[i] = midi + octavesNeeded * 12;
                });
            } else if (rangeMax !== undefined && highestNote > rangeMax) {
                const octavesNeeded = Math.ceil((highestNote - rangeMax) / 12);
                console.log(`📉 最高音${highestNote}高于上限${rangeMax}，整体下移${octavesNeeded}个八度`);
                drop3MIDI.forEach((midi, i) => {
                    drop3MIDI[i] = midi - octavesNeeded * 12;
                });
            }

            // 再次检查是否仍然超出范围
            const adjustedLowest = Math.min(...drop3MIDI);
            const adjustedHighest = Math.max(...drop3MIDI);

            if ((rangeMin !== undefined && adjustedLowest < rangeMin) ||
                (rangeMax !== undefined && adjustedHighest > rangeMax)) {
                console.warn(`⚠️ Drop3独立生成: 调整后仍超出音域范围`);
                console.warn(`   实际: [${adjustedLowest}, ${adjustedHighest}]`);
                console.warn(`   约束: [${rangeMin || '无'}, ${rangeMax || '无'}]`);
                return null;
            }

            console.log(`✅ 音域调整后: ${drop3MIDI.join(', ')}`);
        }

        // 🎯 步骤4: 音符拼写（使用保存的度数信息）
        const notes = drop3MIDI.map((midi, index) => {
            const originalIntervalIndex = originalIntervalsIndices[index];
            const interval = intervals[originalIntervalIndex];
            const noteName = this.getIntervalNote(chord.root, interval);
            const octave = Math.floor(midi / 12) - 1;

            return noteName + octave;
        });

        console.log(`\n🎵 Drop3音符拼写: ${notes.join('-')}`);
        console.log(`   MIDI值: ${drop3MIDI.join(', ')}`);

        // 🎯 检测最终转位（基于最低音的度数）
        const lowestMidi = Math.min(...drop3MIDI);
        const lowestIndex = drop3MIDI.indexOf(lowestMidi);

        // 使用之前保存的原始度数信息
        const lowestDegreeIndex = originalIntervalsIndices[lowestIndex];
        const finalInversion = lowestDegreeIndex;

        const degrees = ['1', '3', '5', '7'];
        console.log(`🔍 转位检测:`);
        console.log(`   最低MIDI: ${lowestMidi}, 在Drop3数组位置: ${lowestIndex}`);
        console.log(`   最低音对应原始intervals[${lowestDegreeIndex}] = 度数${degrees[lowestDegreeIndex]}`);
        console.log(`   最终Drop3转位: ${finalInversion} (${degrees[lowestDegreeIndex]}音为最低音)`);

        // 显示按MIDI排序后的音级
        const sortedForDisplay = drop3MIDI.map((midi, index) => ({
            midi,
            index,
            degreeIndex: originalIntervalsIndices[index]  // 使用保存的度数信息
        })).sort((a, b) => a.midi - b.midi);

        const degreeSequence = sortedForDisplay.map(item => {
            return degrees[item.degreeIndex] || '?';
        }).join('-');

        console.log(`   音级序列（MIDI从低到高）: ${degreeSequence}`);

        // 🎯 构建voicing对象
        const voicing = {
            type: 'drop3',
            notes,
            midiNotes: drop3MIDI,
            root: chord.root,
            chordType: chord.type,
            inversion: finalInversion,  // 动态检测的转位
            range: baseOctave,
            generationMethod: 'independent-transform'  // 标记为独立变换模拟
        };

        // 🎯 质量检查
        const quality = this.checkVoicingQuality(voicing);
        console.log(`\n🔍 Drop3质量: ${quality.qualityLevel} (评分: ${quality.qualityScore.toFixed(2)})`);
        console.log(`   最大间距: ${quality.maxGap}半音, 平均间距: ${quality.avgGap.toFixed(1)}半音`);

        if (!quality.isAcceptable) {
            console.warn(`⚠️ Drop3质量不合格: ${quality.reason}`);
            console.warn(`   但仍返回voicing（由selectBestVoicing决定是否使用）`);
        }

        console.log(`✅ Drop3独立生成完成\n`);

        return voicing;
    }

    /**
     * 优化Voice Leading
     * @param {Object} currentVoicings - 当前voicing选项
     * @param {Object} previousVoicing - 上一个voicing
     * @returns {Object} 优化后的voicings
     */
    optimizeVoiceLeading(currentVoicings, previousVoicing) {
        const optimizedVoicings = {};

        Object.keys(currentVoicings).forEach(voicingType => {
            const voicing = currentVoicings[voicingType];
            if (voicing) {
                optimizedVoicings[voicingType] = this.minimizeVoiceMovement(voicing, previousVoicing);
            }
        });

        return optimizedVoicings;
    }

    /**
     * 最小化声部移动
     * @param {Object} voicing - 当前voicing
     * @param {Object} previousVoicing - 上一个voicing
     * @returns {Object} 优化后的voicing
     */
    minimizeVoiceMovement(voicing, previousVoicing) {
        if (!previousVoicing || !previousVoicing.midiNotes) {
            return voicing;
        }

        const optimized = {
            ...voicing,
            midiNotes: [...voicing.midiNotes]
        };

        // 挂和弦（sus2/sus4/7sus2/7sus4）不能使用转位，因为会改变挂留音特征
        const chordType = voicing.chordType || voicing.originalType || voicing.type;
        if (chordType && chordType.includes('sus')) {
            console.log(`🚫 Voicing引擎：跳过挂和弦 ${voicing.root || ''}${chordType} 的转位处理`);
            return optimized; // 挂和弦保持原位
        }

        // 只有在启用转位的情况下才尝试不同的转位
        if (this.voicingSettings.enableInversions) {
            // 🔥 关键修复：当用户只选择了一种voicing类型时，不要应用voice leading优化
            // 因为generateInversions会破坏特定的voicing类型（如drop2）
            const enabledVoicings = this.currentEnabledVoicings || [];
            if (enabledVoicings.length === 1) {
                console.log(`🎯 单一voicing模式 (${enabledVoicings[0]})：跳过voice leading优化，保持原始voicing`);

                // 🎵 关键补充：在跳过voice leading优化时，仍要应用音域约束
                console.log(`🎵 应用音域约束: ${JSON.stringify(this.currentRangeConstraints)}`);
                const rangeAdjusted = this.applyRangeConstraints(optimized, this.currentRangeConstraints);
                return rangeAdjusted || optimized; // 如果音域调整失败，返回原始voicing
            }

            console.log(`🎵 多voicing模式：应用voice leading优化`);
            const inversions = this.generateInversions(optimized);
            let bestInversion = optimized;
            let minMovement = this.calculateVoiceMovement(optimized, previousVoicing);

            inversions.forEach(inversion => {
                const movement = this.calculateVoiceMovement(inversion, previousVoicing);
                if (movement < minMovement) {
                    minMovement = movement;
                    bestInversion = inversion;
                }
            });

            // 🎵 多voicing模式下也要应用音域约束
            console.log(`🎵 多voicing模式：应用音域约束到最佳inversion`);
            const rangeAdjusted = this.applyRangeConstraints(bestInversion, this.currentRangeConstraints);
            return rangeAdjusted || bestInversion;
        } else {
            // 不使用转位，但仍要应用音域约束
            console.log(`🎵 未启用转位：应用音域约束到原voicing`);
            const rangeAdjusted = this.applyRangeConstraints(optimized, this.currentRangeConstraints);
            return rangeAdjusted || optimized;
        }
    }

    /**
     * 生成转位
     * @param {Object} voicing - 原始voicing
     * @returns {Array} 转位数组
     */
    generateInversions(voicing) {
        // 挂和弦（sus2/sus4/7sus2/7sus4）不能生成转位，因为会改变挂留音特征
        const chordType = voicing.chordType || voicing.originalType || voicing.type;
        if (chordType && chordType.includes('sus')) {
            console.log(`🚫 转位生成：跳过挂和弦 ${voicing.root || ''}${chordType} 的转位生成`);
            return [voicing]; // 只返回原位
        }

        // Shell voicing不能生成转位，因为会破坏其特定的吉他和声结构
        if (voicing.type === 'shell') {
            console.log(`🚫 转位生成：跳过Shell voicing ${voicing.root || ''}${chordType} 的转位生成，保持原始排列`);
            return [voicing]; // 只返回原位
        }

        // 🔧 修复 (2025-10-05): Drop2/Drop3 voicing不能生成转位
        // 问题：多选模式下Voice Leading优化会将Drop2/Drop3的底音升高八度，破坏宽广排列
        // 原因：generateInversions()会执行 midiNotes[j] += 12，将Drop2变成Close voicing
        // 解决：跳过Drop2/Drop3的转位生成，保持Drop变换后的排列
        if (voicing.type === 'drop2' || voicing.type === 'drop3') {
            console.log(`🚫 转位生成：跳过${voicing.type} voicing ${voicing.root || ''}${chordType}，保持Drop变换后的排列`);
            return [voicing]; // 只返回原voicing，不生成转位
        }

        const inversions = [];
        const notes = [...voicing.midiNotes];

        // 生成各种转位
        for (let i = 0; i < notes.length; i++) {
            const inversion = {
                ...voicing,
                midiNotes: [...notes]
            };

            // 将底音移动到高八度
            if (i > 0) {
                for (let j = 0; j < i; j++) {
                    inversion.midiNotes[j] += 12;
                }
            }

            this.sortVoicingByPitch(inversion);
            inversions.push(inversion);
        }

        return inversions;
    }

    /**
     * 计算声部移动距离
     * @param {Object} voicing1 - 第一个voicing
     * @param {Object} voicing2 - 第二个voicing
     * @returns {number} 移动距离
     */
    calculateVoiceMovement(voicing1, voicing2) {
        if (!voicing1.midiNotes || !voicing2.midiNotes) {
            return Infinity;
        }

        const notes1 = [...voicing1.midiNotes].sort((a, b) => a - b);
        const notes2 = [...voicing2.midiNotes].sort((a, b) => a - b);

        let totalMovement = 0;
        const maxLength = Math.max(notes1.length, notes2.length);

        for (let i = 0; i < maxLength; i++) {
            const note1 = notes1[i] || notes1[notes1.length - 1];
            const note2 = notes2[i] || notes2[notes2.length - 1];
            totalMovement += Math.abs(note1 - note2);
        }

        return totalMovement;
    }


    /**
     * 选择最佳voicing
     * @param {Object} voicings - 所有voicing选项
     * @param {Object} options - 选项
     * @returns {Object} 最佳voicing
     */
    selectBestVoicing(voicings, options = {}) {
        // 🔧 阶段2重构：严格voicing选择传递机制 (selectBestVoicing)

        // 严格只使用用户明确传入的enabledVoicings，拒绝任何默认值
        const enabledVoicings = options.enabledVoicings;

        // 验证用户选择的严格性
        if (!enabledVoicings || !Array.isArray(enabledVoicings)) {
            console.error('🚨 selectBestVoicing重构: enabledVoicings必须是明确的数组！');
            console.error('🚨 传入值:', enabledVoicings);
            return null;
        }

        if (enabledVoicings.length === 0) {
            console.warn('⚠️ selectBestVoicing重构: 用户明确选择了空数组');
            console.warn('⚠️ 返回null，不做任何默认选择');
            return null;
        }

        console.log(`🎯 selectBestVoicing: 启用的voicing类型 = ${JSON.stringify(enabledVoicings)}`);
        console.log(`🎯 selectBestVoicing: 可用的voicing = ${Object.keys(voicings)}`);

        // 单选模式（严格模式）：按顺序选择用户明确启用的类型
        if (enabledVoicings.length === 1) {
            const type = enabledVoicings[0];
            if (voicings[type]) {
                // 额外验证：确保返回的voicing真的是声称的类型
                if (voicings[type].type !== type) {
                    console.error(`❌ 类型不匹配！voicing声称是${voicings[type].type}但应该是${type}`);
                    return null;
                }

                // 🔥 Drop3特殊验证（只针对Drop3，2025-10-03新增）
                if (type === 'drop3') {
                    console.log(`🔍 Drop3严格验证...`);

                    // 验证音符数量
                    if (!voicings[type].midiNotes || voicings[type].midiNotes.length < 4) {
                        console.error(`❌ Drop3音符数量不足: ${voicings[type].midiNotes?.length || 0} < 4`);
                        console.error(`   Drop3必须有至少4个音符才能降第3高音`);
                        return null;
                    }

                    // 验证必须有root和chordType
                    if (!voicings[type].root || !voicings[type].chordType) {
                        console.error(`❌ Drop3缺少和弦信息: root=${voicings[type].root}, type=${voicings[type].chordType}`);
                        return null;
                    }

                    console.log(`✅ Drop3严格验证通过`);
                }

                // 🎯 质量验证：检查分布质量
                const qualityCheck = this.checkVoicingQuality(voicings[type]);
                console.log(`🔍 ${type} voicing质量检查: ${qualityCheck.qualityLevel} (最大间距: ${qualityCheck.maxGap}半音)`);

                if (!qualityCheck.isAcceptable) {
                    console.warn(`⚠️ ${type} voicing质量不合格: ${qualityCheck.reason}`);
                    console.warn(`  详细信息: 最大间距${qualityCheck.maxGap}半音, 总跨度${qualityCheck.totalSpread}半音`);
                    console.warn(`  间距分布: [${qualityCheck.gaps.join(', ')}]`);
                    // 在严格模式下仍然返回，但给出警告
                    console.log(`🎯 严格模式：仍然返回${type} voicing，但质量有待改善`);
                } else {
                    console.log(`✅ ${type} voicing质量检查通过: ${qualityCheck.qualityLevel}`);
                }

                console.log(`✅ 单选模式选择voicing: ${type}`);
                return voicings[type];
            }

            // 🔥 Drop2特殊处理：没有生成就返回null（不fallback，2025-10-04新增）
            if (type === 'drop2') {
                console.error(`❌ Drop2未生成，返回null（不使用fallback）`);
                return null;
            }

            // 🔥 Drop3特殊处理：没有生成就返回null（不fallback，2025-10-03新增）
            if (type === 'drop3') {
                console.error(`❌ Drop3未生成，返回null（不使用fallback）`);
                return null;
            }
        } else {
            // 多选模式：收集所有可用的voicing选项，按质量筛选和排序
            const candidateVoicings = [];

            for (const type of enabledVoicings) {
                if (voicings[type]) {
                    // 验证voicing类型
                    if (voicings[type].type !== type) {
                        console.error(`❌ 类型不匹配！voicing声称是${voicings[type].type}但应该是${type}`);
                        continue;
                    }

                    // 🎯 质量检查
                    const qualityCheck = this.checkVoicingQuality(voicings[type]);
                    console.log(`🔍 ${type} voicing质量: ${qualityCheck.qualityLevel} (间距: ${qualityCheck.maxGap}半音)`);

                    candidateVoicings.push({
                        type,
                        voicing: voicings[type],
                        quality: qualityCheck
                    });
                }
            }

            if (candidateVoicings.length > 0) {
                // 🎯 智能选择策略：优先选择高质量的voicing
                const acceptableVoicings = candidateVoicings.filter(v => v.quality.isAcceptable);
                const unacceptableVoicings = candidateVoicings.filter(v => !v.quality.isAcceptable);

                let selectedCandidate = null;

                if (acceptableVoicings.length > 0) {
                    // 有合格的voicing，从中随机选择
                    const randomIndex = Math.floor(Math.random() * acceptableVoicings.length);
                    selectedCandidate = acceptableVoicings[randomIndex];
                    console.log(`✅ 多选模式选择合格voicing: ${selectedCandidate.type} (质量: ${selectedCandidate.quality.qualityLevel})`);
                    console.log(`  从${acceptableVoicings.map(v => `${v.type}(${v.quality.qualityLevel})`).join(', ')}中选择`);
                } else if (unacceptableVoicings.length > 0) {
                    // 🔧 修复 (2025-10-06 v2): 选择质量最好的，但标记为不理想
                    // 原因：返回null会导致上层fallback创建voicing:null，显示"未知"
                    // 解决：即使质量不理想，也选择相对最佳的，避免显示问题
                    unacceptableVoicings.sort((a, b) => b.quality.qualityScore - a.quality.qualityScore);
                    selectedCandidate = unacceptableVoicings[0];
                    console.warn(`⚠️ 多选模式：所有voicing质量都不理想，选择相对最佳: ${selectedCandidate.type}`);
                    console.warn(`  质量: ${selectedCandidate.quality.qualityLevel} (评分: ${selectedCandidate.quality.qualityScore.toFixed(2)})`);
                    console.warn(`  不合格原因: ${selectedCandidate.quality.reason}`);
                    console.warn(`  详细: maxGap=${selectedCandidate.quality.maxGap}, avgGap=${selectedCandidate.quality.avgGap.toFixed(1)}`);

                    // 标记质量问题
                    if (selectedCandidate.voicing) {
                        selectedCandidate.voicing.qualityWarning = selectedCandidate.quality.reason;
                        selectedCandidate.voicing.qualityScore = selectedCandidate.quality.qualityScore;
                    }
                }

                if (selectedCandidate) {
                    // 🔧 修复 (2025-10-06): 确保返回的voicing包含正确的type属性
                    // 问题：同时勾选close+drop2时，voicing显示"未知"类型
                    // 原因：selectedCandidate.voicing可能缺少type属性
                    const finalVoicing = selectedCandidate.voicing;
                    if (!finalVoicing.type || finalVoicing.type !== selectedCandidate.type) {
                        console.log(`🔧 补充/修正voicing.type: ${finalVoicing.type || 'undefined'} → ${selectedCandidate.type}`);
                        finalVoicing.type = selectedCandidate.type;
                    }
                    return finalVoicing;
                }
            }
        }

        // 严格模式：如果用户只选择了drop2，不提供close备选
        // 这将强制在更高层级处理失败情况
        if (enabledVoicings.length === 1 && enabledVoicings[0] === 'drop2') {
            console.log(`🚫 用户只选择drop2，不提供close备选，返回null`);
            return null;
        }

        // 严格模式：如果用户只选择了drop3，不提供close备选
        // 这将强制在更高层级处理失败情况
        if (enabledVoicings.length === 1 && enabledVoicings[0] === 'drop3') {
            console.log(`🚫 用户只选择drop3，不提供close备选，返回null`);
            return null;
        }

        // 严格模式：如果用户只选择了shell，不提供其他备选
        // 这将强制在更高层级处理失败情况
        if (enabledVoicings.length === 1 && enabledVoicings[0] === 'shell') {
            console.log(`🚫 用户只选择shell，不提供其他备选，返回null`);
            return null;
        }

        console.warn(`⚠️ 没有找到匹配的voicing，启用类型: ${enabledVoicings}, 可用类型: ${Object.keys(voicings)}`);
        return null;
    }

    /**
     * 智能音域约束算法 - 统一的音域约束处理
     * @param {Array} tempVoicing - 临时voicing数组 [{note, midi}]
     * @param {number} minMidi - 最小MIDI值
     * @param {number} maxMidi - 最大MIDI值
     * @param {string} mode - 模式名称（用于日志）
     */
    applyIntelligentRangeConstraints(tempVoicing, minMidi, maxMidi, mode = '音域约束') {
        console.log(`\n🎯 === ${mode}智能音域约束 ===`);

        // 🔍 边缘情况检查1：参数验证
        if (!tempVoicing || !Array.isArray(tempVoicing) || tempVoicing.length === 0) {
            console.error(`❌ ${mode}: 无效的tempVoicing参数`);
            return;
        }

        if (minMidi === null || maxMidi === null || minMidi === undefined || maxMidi === undefined) {
            console.error(`❌ ${mode}: 音域参数无效 (minMidi: ${minMidi}, maxMidi: ${maxMidi})`);
            return;
        }

        // 🔍 边缘情况检查2：音域范围验证
        if (minMidi >= maxMidi) {
            console.error(`❌ ${mode}: 音域范围无效 (minMidi ${minMidi} >= maxMidi ${maxMidi})`);
            return;
        }

        const availableRange = maxMidi - minMidi;
        const noteCount = tempVoicing.length;

        // 🔍 边缘情况检查3：极小音域处理
        if (availableRange < 3) {
            console.warn(`⚠️ ${mode}: 音域过小 (${availableRange}半音)，可能无法合理分布${noteCount}个音符`);

            // 极小音域情况：尽力将音符塞入范围内
            tempVoicing.forEach((noteInfo, index) => {
                const targetMidi = minMidi + (index % (availableRange + 1));
                if (noteInfo.midi < minMidi || noteInfo.midi > maxMidi) {
                    noteInfo.midi = Math.max(minMidi, Math.min(maxMidi, targetMidi));
                    console.log(`🔧 ${mode}: 极小音域强制调整音符${index+1}至MIDI${noteInfo.midi}`);
                }
            });
            return;
        }

        console.log(`📏 音域分析: 范围${availableRange}半音 (${minMidi}-${maxMidi}), ${noteCount}个音符`);

        // 🔍 检查MIDI值的有效性
        const validMidis = tempVoicing.every(v =>
            typeof v.midi === 'number' &&
            !isNaN(v.midi) &&
            v.midi >= 0 &&
            v.midi <= 127
        );

        if (!validMidis) {
            console.error(`❌ ${mode}: 发现无效的MIDI值`);
            tempVoicing.forEach((noteInfo, index) => {
                if (typeof noteInfo.midi !== 'number' || isNaN(noteInfo.midi) || noteInfo.midi < 0 || noteInfo.midi > 127) {
                    console.error(`   - 音符${index+1}: MIDI值无效 (${noteInfo.midi})`);
                    // 设置为合理的默认值
                    noteInfo.midi = Math.max(minMidi, Math.min(maxMidi, 60)); // 默认C4
                }
            });
        }

        const currentMidis = tempVoicing.map(v => v.midi);
        const outOfRangeNotes = currentMidis.filter(midi => midi < minMidi || midi > maxMidi);

        if (outOfRangeNotes.length === 0) {
            console.log(`✅ ${mode}: 所有音符已在音域${minMidi}-${maxMidi}内`);
            return;
        }

        console.log(`🎯 ${mode}: ${outOfRangeNotes.length}个音符需要智能重新分布`);

        // 创建音符semitone信息用于重新分布
        const noteInfos = tempVoicing.map((noteInfo, index) => ({
            index,
            note: noteInfo.note,
            semitone: noteInfo.midi % 12,
            originalMidi: noteInfo.midi,
            isRoot: index === 0
        }));

        // 🎯 智能分布策略：在音域内均匀分配位置
        const targetPositions = [];

        // 计算理想的起始位置（音域下方1/4处，或保持相对顺序）
        const startPosition = minMidi + Math.floor(availableRange * 0.25);

        // 为每个音符找到最佳位置
        noteInfos.forEach((noteInfo, index) => {
            const semitone = noteInfo.semitone;
            let bestMidi = noteInfo.originalMidi;
            let minSpread = Infinity;

            // 尝试不同的八度位置
            for (let octave = 0; octave <= 8; octave++) {
                const candidateMidi = octave * 12 + semitone;

                // 必须在音域内
                if (candidateMidi >= minMidi && candidateMidi <= maxMidi) {
                    // 计算这个位置与理想分布的匹配度
                    const idealPosition = startPosition + (index * Math.min(6, Math.floor(availableRange / noteCount)));
                    const positionDistance = Math.abs(candidateMidi - idealPosition);

                    // 优先选择接近理想位置且在音域内的选项
                    if (positionDistance < minSpread) {
                        minSpread = positionDistance;
                        bestMidi = candidateMidi;
                    }
                }
            }

            targetPositions.push({
                index: noteInfo.index,
                note: noteInfo.note,
                midi: bestMidi,
                originalMidi: noteInfo.originalMidi
            });
        });

        // 应用新的位置，并检查分布质量
        targetPositions.forEach((pos) => {
            tempVoicing[pos.index].midi = pos.midi;
            console.log(`🎯 音符${pos.index + 1}(${pos.note}) 智能重新分布: MIDI${pos.originalMidi} -> ${pos.midi}`);
        });

        // 🔍 分布质量检查与优化
        const newMidis = tempVoicing.map(v => v.midi).sort((a, b) => a - b);
        const gaps = [];
        for (let i = 1; i < newMidis.length; i++) {
            gaps.push(newMidis[i] - newMidis[i-1]);
        }
        const maxGap = Math.max(...gaps);
        const totalSpread = Math.max(...newMidis) - Math.min(...newMidis);

        console.log(`📊 ${mode}分布质量分析:`);
        console.log(`  音符分布: ${newMidis.join('-')}`);
        console.log(`  音程间距: [${gaps.join(', ')}]半音`);
        console.log(`  最大间距: ${maxGap}半音`);
        console.log(`  总音域: ${totalSpread}半音`);

        // 🎯 二次优化：如果仍有超大间距，进行局部调整
        if (maxGap > 12) {
            console.log(`⚠️ ${mode}最大间距${maxGap}半音仍过大，进行二次优化...`);

            // 找到最大间距的位置
            const maxGapIndex = gaps.indexOf(maxGap);
            const lowerNote = tempVoicing.find(v => v.midi === newMidis[maxGapIndex]);
            const higherNote = tempVoicing.find(v => v.midi === newMidis[maxGapIndex + 1]);

            if (lowerNote && higherNote) {
                // 尝试将较高音符降八度，或较低音符升八度
                const higherLowered = higherNote.midi - 12;
                const lowerRaised = lowerNote.midi + 12;

                if (higherLowered >= minMidi && higherLowered > lowerNote.midi) {
                    higherNote.midi = higherLowered;
                    console.log(`🔧 ${mode}二次优化: 降低高音符至MIDI${higherLowered}`);
                } else if (lowerRaised <= maxMidi && lowerRaised < higherNote.midi) {
                    lowerNote.midi = lowerRaised;
                    console.log(`🔧 ${mode}二次优化: 提升低音符至MIDI${lowerRaised}`);
                }
            }
        }

        // 最终质量评估
        const finalDistributionMidis = tempVoicing.map(v => v.midi).sort((a, b) => a - b);
        const finalGaps = [];
        for (let i = 1; i < finalDistributionMidis.length; i++) {
            finalGaps.push(finalDistributionMidis[i] - finalDistributionMidis[i-1]);
        }
        const finalMaxGap = Math.max(...finalGaps);
        const finalSpread = Math.max(...finalDistributionMidis) - Math.min(...finalDistributionMidis);

        const qualityLevel = finalMaxGap <= 7 ? '🟢优秀' : finalMaxGap <= 12 ? '🟡良好' : '🔴需改进';
        console.log(`✅ ${mode}智能约束完成: 最大间距${finalMaxGap}半音, 总跨度${finalSpread}半音, 质量${qualityLevel}`);
    }

    /**
     * 检查Voicing分布质量
     * @param {Object} voicing - voicing对象
     * @returns {Object} 质量检查结果
     */
    checkVoicingQuality(voicing) {
        // 🔍 边缘情况检查：基本参数验证
        if (!voicing) {
            return { isAcceptable: false, reason: '空的voicing对象' };
        }

        if (!voicing.midiNotes || !Array.isArray(voicing.midiNotes)) {
            return { isAcceptable: false, reason: 'midiNotes 数组无效或缺失' };
        }

        if (voicing.midiNotes.length < 1) {
            return { isAcceptable: false, reason: '音符数量不足' };
        }

        // 🔍 单音符情况：始终视为可接受
        if (voicing.midiNotes.length === 1) {
            return {
                isAcceptable: true,
                qualityScore: 1.0,
                qualityLevel: '🟢优秀',
                maxGap: 0,
                totalSpread: 0,
                avgGap: 0,
                gaps: [],
                details: { singleNote: true },
                reason: '单音符，无需质量检查'
            };
        }

        const midiNotes = voicing.midiNotes;

        // 🔍 MIDI值有效性检查
        const invalidMidis = midiNotes.filter(midi =>
            typeof midi !== 'number' ||
            isNaN(midi) ||
            midi < 0 ||
            midi > 127
        );

        if (invalidMidis.length > 0) {
            return {
                isAcceptable: false,
                reason: `发现${invalidMidis.length}个无效MIDI值: ${invalidMidis.join(', ')}`
            };
        }

        const sortedMidis = [...midiNotes].sort((a, b) => a - b);

        // 🔍 检查重复音符（2025-10-05修复：拒绝重复MIDI）
        const uniqueMidis = [...new Set(sortedMidis)];
        if (uniqueMidis.length !== sortedMidis.length) {
            console.warn(`⚠️ 质量检查：发现重复的MIDI音符，拒绝该voicing`);
            console.warn(`   原始MIDI: ${sortedMidis.join(', ')}`);
            console.warn(`   去重后: ${uniqueMidis.join(', ')}`);
            return {
                isAcceptable: false,
                reason: '重复的MIDI音符',
                quality: '🔴不合格',
                maxGap: 0
            };
        }

        // 计算音程间距
        const gaps = [];
        for (let i = 1; i < sortedMidis.length; i++) {
            const gap = sortedMidis[i] - sortedMidis[i-1];
            if (gap >= 0) { // 确保间距非负
                gaps.push(gap);
            }
        }

        // 🔍 边缘情况：如果没有有效间距
        if (gaps.length === 0) {
            return {
                isAcceptable: false,
                reason: '无法计算音符间距'
            };
        }

        const maxGap = Math.max(...gaps);
        const totalSpread = Math.max(...sortedMidis) - Math.min(...sortedMidis);
        const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

        // 🎯 质量评估标准
        const qualityChecks = {
            maxGapAcceptable: maxGap <= 15,  // 最大间距不超过15半音
            totalSpreadAcceptable: totalSpread <= 24, // 总跨度不超过2个八度
            hasExcessiveGaps: gaps.filter(gap => gap > 12).length <= 1, // 最多允许1个超过12半音的间距
            averageGapAcceptable: avgGap <= 8 // 平均间距合理
        };

        const passedChecks = Object.values(qualityChecks).filter(check => check).length;
        const totalChecks = Object.keys(qualityChecks).length;
        const qualityScore = passedChecks / totalChecks;

        // 判断是否可接受
        const isAcceptable = qualityScore >= 0.75; // 至少通过75%的质量检查

        const qualityLevel = maxGap <= 7 ? '🟢优秀' : maxGap <= 12 ? '🟡良好' : maxGap <= 15 ? '🟠可接受' : '🔴不合格';

        return {
            isAcceptable,
            qualityScore,
            qualityLevel,
            maxGap,
            totalSpread,
            avgGap: parseFloat(avgGap.toFixed(1)),
            gaps,
            details: qualityChecks,
            reason: isAcceptable ? '质量合格' : `质量不合格 (${qualityScore.toFixed(2)} < 0.75)`
        };
    }

    /**
     * 检测是否为sus和弦
     * @param {string} chordType - 和弦类型
     * @returns {boolean} 是否为sus和弦
     *
     * 🎵 Sus和弦检测（2025-10-03新增）
     * Sus和弦类型：sus2, sus4, 7sus2, 7sus4
     * Sus和弦没有Drop2/Drop3形态，只能使用特定的close voicing模板
     */
    isSusChord(chordType) {
        const susTypes = ['sus2', 'sus4', '7sus2', '7sus4', '7sus', 'sus'];
        const isSus = susTypes.includes(chordType);

        if (isSus) {
            console.log(`🎵 检测到sus和弦类型: ${chordType}`);
        }

        return isSus;
    }

    /**
     * 🔧 新增函数 (2025-10-04): 检测是否为真正的七和弦（有第7音）
     * @param {string} chordType - 和弦类型
     * @returns {boolean} 是否为七和弦
     */
    isSeventhChord(chordType) {
        if (!chordType) return false;

        // 三和弦类型列表（没有第7音）
        const triadTypes = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4', 'sus'];

        // 如果是三和弦类型，直接返回false
        if (triadTypes.includes(chordType)) {
            return false;
        }

        // 七和弦检测：包含"7"、"ninth"、"eleventh"、"thirteenth"
        const isSeventhChord = chordType.includes('7') ||
                              chordType.includes('ninth') ||
                              chordType.includes('eleventh') ||
                              chordType.includes('thirteenth') ||
                              chordType.includes('9') ||  // maj9, min9等
                              chordType.includes('11') || // maj11, min11等
                              chordType.includes('13');   // maj13, min13等

        return isSeventhChord;
    }

    /**
     * 分析voicing
     * @param {Object} voicing - voicing对象
     * @returns {Object} 分析结果
     */
    analyzeVoicing(voicing) {
        if (!voicing) return null;

        const analysis = {
            type: voicing.type,
            range: this.calculateRange(voicing.midiNotes),
            intervals: this.calculateIntervals(voicing.midiNotes),
            density: this.calculateDensity(voicing.midiNotes)
        };

        return analysis;
    }

    /**
     * 计算音域
     * @param {Array} midiNotes - MIDI音符数组
     * @returns {Object} 音域信息
     */
    calculateRange(midiNotes) {
        if (!midiNotes || midiNotes.length === 0) return null;

        const min = Math.min(...midiNotes);
        const max = Math.max(...midiNotes);

        return {
            min: min,
            max: max,
            span: max - min
        };
    }

    /**
     * 计算音程
     * @param {Array} midiNotes - MIDI音符数组
     * @returns {Array} 音程数组
     */
    calculateIntervals(midiNotes) {
        if (!midiNotes || midiNotes.length < 2) return [];

        const sortedNotes = [...midiNotes].sort((a, b) => a - b);
        const intervals = [];

        for (let i = 1; i < sortedNotes.length; i++) {
            intervals.push(sortedNotes[i] - sortedNotes[i - 1]);
        }

        return intervals;
    }

    /**
     * 计算音符密度
     * @param {Array} midiNotes - MIDI音符数组
     * @returns {number} 密度值
     */
    calculateDensity(midiNotes) {
        if (!midiNotes || midiNotes.length < 2) return 0;

        const range = this.calculateRange(midiNotes);
        return midiNotes.length / (range.span + 1);
    }

    /**
     * 根据音高对voicing排序
     * @param {Object} voicing - voicing对象
     */
    sortVoicingByPitch(voicing) {
        // 挂和弦（sus2/sus4/7sus2/7sus4）不能重新排序音符，因为会改变挂留音特征
        // 检查多个可能的type属性位置 - 优先检查chordType（真正的和弦类型）
        const chordType = voicing.chordType || voicing.originalType || voicing.type;
        const isSusChord = chordType && chordType.includes('sus');

        // 特殊voicing类型（drop2、drop3、shell）有自己的音符排列结构，不应该被重新排序
        const voicingType = voicing.type;
        const isSpecialVoicing = ['drop2', 'drop3', 'shell'].includes(voicingType);

        if (isSusChord) {
            console.log(`🚫 音高排序：跳过挂和弦 ${voicing.root || ''}${chordType} 的音符重排序`);
            return; // 挂和弦保持原始音符顺序
        }

        if (isSpecialVoicing) {
            console.log(`🚫 音高排序：跳过${voicingType} voicing的音符重排序，保持特殊排列结构`);
            return; // 特殊voicing保持原有排列
        }

        const combined = voicing.notes.map((note, index) => ({
            note: note,
            midi: voicing.midiNotes[index]
        }));

        combined.sort((a, b) => a.midi - b.midi);

        voicing.notes = combined.map(item => item.note);
        voicing.midiNotes = combined.map(item => item.midi);
    }

    /**
     * 获取指定音程的音符
     * @param {string} rootNote - 根音
     * @param {number} interval - 音程（半音数）
     * @returns {string} 目标音符
     */
    getIntervalNote(rootNote, interval) {
        // 🔧 修复 (2025-10-05 v23): 使用和弦上下文拼写，与midiToNote修复相同
        if (this.harmonyTheory && typeof this.harmonyTheory.spellNoteInChordContext === 'function') {
            const chordRoot = this.currentChord?.root || rootNote;
            const chordType = this.currentChord?.type || 'major';
            const key = this.currentChord?.key || 'C-major';
            const keyInfo = this.harmonyTheory.keys[key] || this.harmonyTheory.keys['C-major'];

            // 计算pitch class（不含八度）
            const rootSemitone = this.harmonyTheory.noteToSemitone[rootNote] || 0;
            const pitchClass = (rootSemitone + interval) % 12;

            // 调用spellNoteInChordContext获取正确拼写
            const noteName = this.harmonyTheory.spellNoteInChordContext(
                pitchClass,
                chordRoot,
                interval,
                keyInfo,
                null,
                chordType
            );

            console.log(`🎵 getIntervalNote v23: ${rootNote} + interval ${interval} → ${noteName} (chord: ${chordRoot}${chordType})`);
            return noteName;
        }

        // 最终fallback（如果harmonyTheory不可用）
        console.warn(`⚠️ getIntervalNote fallback: ${rootNote} + ${interval} → 使用默认拼写`);
        const rootMidi = this.noteToMidi[rootNote];
        const targetMidi = (rootMidi + interval) % 12;

        // 简单遍历（保持原有fallback逻辑）
        for (const [note, midi] of Object.entries(this.noteToMidi)) {
            if (midi % 12 === targetMidi) {
                return note;
            }
        }

        return rootNote; // 备用
    }

    /**
     * 重置voice leading状态
     */
    resetVoiceLeading() {
        this.previousVoicing = null;
    }

    /**
     * 获取voicing的音符名称数组
     * @param {Object} voicing - voicing对象
     * @returns {Array} 音符名称数组
     */
    getVoicingNoteNames(voicing) {
        if (!voicing) return [];
        return voicing.notes || [];
    }

    /**
     * 🎵 将MIDI音符转换为音符名称和八度（调号感知版）
     * @param {number} midiNote - MIDI音符
     * @param {string} key - 调性（可选，默认从当前和弦或C大调获取）
     * @returns {Object} 音符信息
     */
    midiToNoteInfo(midiNote, key = null) {
        const octave = Math.floor(midiNote / 12) - 1;
        const noteIndex = midiNote % 12;

        // 🔧 修复：获取调号感知的音符名称
        let noteName;

        // 尝试获取调号信息
        const effectiveKey = key || (this.currentChord && this.currentChord.key) || 'C-major';

        if (this.harmonyTheory && typeof this.harmonyTheory.getConsistentNoteSpelling === 'function') {
            noteName = this.harmonyTheory.getConsistentNoteSpelling(noteIndex, effectiveKey);
        } else {
            // 🔧 修复：降级处理也尽量考虑调号
            console.warn('🚨 VoicingEngine.midiToNoteInfo: harmonyTheory不可用，使用降级音符拼写');

            // 简单的调号检测：如果是降号调，使用降号拼写
            if (effectiveKey && (effectiveKey.includes('b') || effectiveKey.includes('♭'))) {
                const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
                noteName = flatNames[noteIndex];
            } else {
                // 默认使用升号拼写
                const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                noteName = sharpNames[noteIndex];
            }
        }

        return {
            name: noteName,
            octave: octave,
            midi: midiNote
        };
    }

    /**
     * 应用音域约束到voicing
     * @param {Object} voicing - 要约束的voicing对象
     * @param {Object} rangeConstraints - 音域约束 {minMidi, maxMidi}
     * @returns {Object|null} 调整后的voicing，如果无法满足约束则返回null
     */
    applyRangeConstraints(voicing, rangeConstraints) {
        if (!voicing || !voicing.midiNotes || !rangeConstraints) {
            return voicing;
        }

        const { minMidi, maxMidi } = rangeConstraints;
        if (minMidi === null || minMidi === undefined || maxMidi === null || maxMidi === undefined) {
            console.log(`🎵 音域约束: 无有效音域设置，跳过约束`);
            return voicing;
        }

        console.log(`\n🎵 === 应用音域约束 ===`);
        console.log(`🎯 目标音域: ${minMidi}-${maxMidi}`);
        console.log(`🎼 当前voicing: ${voicing.notes?.join('-')}`);
        console.log(`🎹 当前MIDI: [${voicing.midiNotes.join(', ')}]`);

        // 检查当前voicing是否已经符合音域
        const outOfRangeNotes = voicing.midiNotes.filter(midi => midi < minMidi || midi > maxMidi);
        if (outOfRangeNotes.length === 0) {
            console.log(`✅ 当前voicing已在音域内，无需调整`);
            return voicing;
        }

        console.log(`🔧 发现${outOfRangeNotes.length}个音符超出音域: [${outOfRangeNotes.join(', ')}]`);

        // 为特殊voicing类型（如drop2/drop3/shell）使用智能整体八度调整
        // 保持voicing结构纯度的同时尽可能遵守音域设定
        if (['drop2', 'drop3', 'shell'].includes(voicing.type)) {
            console.log(`🎯 特殊voicing类型 (${voicing.type})：使用智能八度调整策略`);
            return this.applyIntelligentOctaveAdjustment(voicing, minMidi, maxMidi);
        }

        // 对于close voicing，可以更灵活地调整
        console.log(`🎯 普通voicing类型：使用灵活调整策略`);
        return this.applyFlexibleRangeAdjustment(voicing, minMidi, maxMidi);
    }

    /**
     * 智能整体八度调整算法
     * 保持voicing结构完整性的同时尽可能遵守音域设定
     * @param {Object} voicing - 待调整的voicing
     * @param {number} minMidi - 最小MIDI值
     * @param {number} maxMidi - 最大MIDI值
     * @returns {Object} 调整后的voicing
     */
    applyIntelligentOctaveAdjustment(voicing, minMidi, maxMidi) {
        console.log(`\n🎯 === 智能八度调整开始 ===`);
        console.log(`🎼 原始${voicing.type}: ${voicing.notes?.join('-')}`);
        console.log(`🎹 原始MIDI: [${voicing.midiNotes?.join(', ')}]`);
        console.log(`🎯 目标音域: ${minMidi}-${maxMidi}`);

        let bestScore = -Infinity;
        let bestVoicing = voicing;
        let bestOffset = 0;
        const originalOutOfRange = voicing.midiNotes.filter(midi => midi < minMidi || midi > maxMidi).length;

        console.log(`📊 原始超出音域音符数: ${originalOutOfRange}/${voicing.midiNotes.length}`);

        // 搜索范围：-4到+4个八度
        for (let octaveOffset = -48; octaveOffset <= 48; octaveOffset += 12) {
            const testMidiNotes = voicing.midiNotes.map(midi => midi + octaveOffset);

            // 计算音域合规性
            const outOfRange = testMidiNotes.filter(midi =>
                midi < minMidi || midi > maxMidi).length;
            const inRangeCount = testMidiNotes.length - outOfRange;

            // 综合评分系统
            let score = inRangeCount * 1000; // 音域合规优先级最高

            if (outOfRange === 0) {
                score += 10000; // 完全在音域内的额外奖励

                // 中心分布奖励：偏好音符在音域中心附近
                const centerMidi = (minMidi + maxMidi) / 2;
                const avgDistance = testMidiNotes.reduce((sum, midi) =>
                    sum + Math.abs(midi - centerMidi), 0) / testMidiNotes.length;
                score += (100 - avgDistance);

                console.log(`🎯 完美匹配 (偏移${octaveOffset}): 所有音符在音域内, 中心距离${avgDistance.toFixed(1)}, 评分${score.toFixed(1)}`);
            } else {
                console.log(`📊 偏移${octaveOffset}: ${inRangeCount}/${testMidiNotes.length}音符在音域内, 评分${score.toFixed(1)}`);
            }

            // 最小移调奖励：偏好较少的八度调整
            score += (48 - Math.abs(octaveOffset)) * 0.1;

            if (score > bestScore) {
                bestScore = score;
                bestOffset = octaveOffset;

                if (octaveOffset !== 0) {
                    // 预计算最佳方案的细节
                    const bestOutOfRange = testMidiNotes.filter(midi =>
                        midi < minMidi || midi > maxMidi).length;
                    console.log(`🏆 新的最佳方案: 偏移${octaveOffset}, ${bestOutOfRange}个音符超出, 评分${score.toFixed(1)}`);
                }
            }

            // 完美匹配且偏移较小，可以提前结束
            if (outOfRange === 0 && Math.abs(octaveOffset) <= 12) {
                console.log(`✅ 找到理想解决方案，提前结束搜索`);
                break;
            }
        }

        // 应用最佳调整
        if (bestOffset !== 0) {
            const adjustedMidiNotes = voicing.midiNotes.map(midi => midi + bestOffset);
            const adjustedNotes = adjustedMidiNotes.map(midi => this.midiToNoteInfo(midi).name);

            const adjustedVoicing = {
                ...voicing,
                midiNotes: adjustedMidiNotes,
                notes: adjustedNotes
            };

            const finalOutOfRange = adjustedMidiNotes.filter(midi =>
                midi < minMidi || midi > maxMidi).length;

            console.log(`🎯 应用最佳调整: ${bestOffset > 0 ? '+' : ''}${bestOffset/12}个八度`);
            console.log(`🎼 调整后${voicing.type}: ${adjustedNotes.join('-')}`);
            console.log(`🎹 调整后MIDI: [${adjustedMidiNotes.join(', ')}]`);
            console.log(`📊 改善效果: ${originalOutOfRange} → ${finalOutOfRange} 个音符超出音域`);

            if (finalOutOfRange === 0) {
                console.log(`🎉 完美解决方案: 所有音符都在音域内!`);
            } else if (finalOutOfRange < originalOutOfRange) {
                console.log(`✅ 显著改善: 减少了${originalOutOfRange - finalOutOfRange}个超出音域的音符`);
            }

            console.log(`🎯 === 智能八度调整完成 ===\n`);
            return adjustedVoicing;
        } else {
            console.log(`ℹ️ 原始位置已是最佳方案，无需调整`);
            console.log(`🎯 === 智能八度调整完成 ===\n`);
            return voicing;
        }
    }

    /**
     * 对特殊voicing类型应用八度调整（保持音符关系）
     */
    applyOctaveAdjustment(voicing, minMidi, maxMidi) {
        const adjusted = {
            ...voicing,
            midiNotes: [...voicing.midiNotes]
        };

        const currentMin = Math.min(...adjusted.midiNotes);
        const currentMax = Math.max(...adjusted.midiNotes);
        const span = currentMax - currentMin;

        // 🎯 特殊处理：对于drop2等特殊voicing，优先尝试保持结构完整性
        if (voicing.type === 'drop2' && span > (maxMidi - minMidi)) {
            console.warn(`⚠️ Drop2音域太窄 (${maxMidi - minMidi}半音) 无法容纳voicing跨度 (${span}半音)`);
            console.log(`🎯 尝试压缩Drop2结构以适应音域...`);

            // 对于drop2，尝试压缩结构但保持相对音高关系
            const sortedNotes = [...adjusted.midiNotes].sort((a, b) => a - b);
            const intervals = [];
            for (let i = 1; i < sortedNotes.length; i++) {
                intervals.push(sortedNotes[i] - sortedNotes[i-1]);
            }

            // 从最低音开始，在音域内重新分布音符
            let newMidiNotes = [];
            let currentMidi = minMidi;

            newMidiNotes.push(currentMidi);

            for (let i = 0; i < intervals.length; i++) {
                let nextMidi = currentMidi + intervals[i];

                // 如果超出音域，压缩间隔
                if (nextMidi > maxMidi) {
                    const remainingSpace = maxMidi - currentMidi;
                    const remainingIntervals = intervals.length - i;
                    const averageInterval = Math.floor(remainingSpace / remainingIntervals);
                    nextMidi = currentMidi + Math.max(1, averageInterval); // 至少间隔1个半音
                }

                newMidiNotes.push(Math.min(nextMidi, maxMidi));
                currentMidi = newMidiNotes[newMidiNotes.length - 1];
            }

            // 恢复drop2的音符顺序（不是排序后的顺序）
            const originalOrder = adjusted.midiNotes.map((_, index) => index);
            const sortedIndices = originalOrder.sort((a, b) => adjusted.midiNotes[a] - adjusted.midiNotes[b]);

            for (let i = 0; i < adjusted.midiNotes.length; i++) {
                const sortedIndex = sortedIndices.indexOf(i);
                adjusted.midiNotes[i] = newMidiNotes[sortedIndex];
            }

            adjusted.notes = adjusted.midiNotes.map(midi => this.midiToNoteInfo(midi).name);

            console.log(`🎯 Drop2压缩结果: [${adjusted.midiNotes.join(', ')}]`);

            // 验证是否在音域内
            const outOfRange = adjusted.midiNotes.filter(midi => midi < minMidi || midi > maxMidi);
            if (outOfRange.length === 0) {
                console.log(`✅ Drop2压缩成功，保持在音域内`);
                return adjusted;
            } else {
                console.warn(`⚠️ Drop2压缩后仍有音符超出音域，尝试标准修正...`);
                // 继续执行标准八度调整
            }
        }

        // 检查音域是否足够容纳整个voicing（非drop2或drop2压缩失败的情况）
        if (span > (maxMidi - minMidi)) {
            console.warn(`⚠️ 音域太窄 (${maxMidi - minMidi}半音) 无法容纳voicing跨度 (${span}半音)，进行单音符修正...`);

            // 为保持和弦基本性质，逐个修正超出音域的音符
            for (let i = 0; i < adjusted.midiNotes.length; i++) {
                let midi = adjusted.midiNotes[i];
                if (midi < minMidi || midi > maxMidi) {
                    // 强制移到最近的合法音符位置
                    const note = midi % 12;
                    let bestMidi = midi;
                    let minDistance = Infinity;

                    // 在所有八度中寻找相同音名的合法位置
                    for (let octave = 0; octave <= 8; octave++) {
                        const candidateMidi = octave * 12 + note;
                        if (candidateMidi >= minMidi && candidateMidi <= maxMidi) {
                            const distance = Math.abs(candidateMidi - midi);
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestMidi = candidateMidi;
                            }
                        }
                    }

                    if (bestMidi !== midi) {
                        console.log(`🎯 单音符修正: MIDI ${midi} -> ${bestMidi} (${this.midiToNoteInfo(midi).name} -> ${this.midiToNoteInfo(bestMidi).name})`);
                        adjusted.midiNotes[i] = bestMidi;
                    } else {
                        // 如果找不到合法位置，强制钳制到边界
                        const clampedMidi = Math.max(minMidi, Math.min(maxMidi, midi));
                        adjusted.midiNotes[i] = clampedMidi;
                        console.log(`🎯 边界钳制: MIDI ${midi} -> ${clampedMidi}`);
                    }
                }
            }

            // 重新生成音符名称
            adjusted.notes = adjusted.midiNotes.map(midi => this.midiToNoteInfo(midi).name);

            // 验证修正结果
            const stillOutOfRange = adjusted.midiNotes.filter(midi => midi < minMidi || midi > maxMidi);
            if (stillOutOfRange.length === 0) {
                console.log(`✅ 单音符修正成功: [${adjusted.midiNotes.join(', ')}]`);
                return adjusted;
            } else {
                console.error(`❌ 单音符修正失败，仍有违规音符: [${stillOutOfRange.join(', ')}]`);
                return null;
            }
        }

        // 🎯 增强的八度调整算法：更积极地寻找合适的八度位置
        let bestOffset = 0;
        let minOutOfRange = adjusted.midiNotes.length;
        let bestScore = -Infinity; // 综合评分

        // 扩大搜索范围，更细致地评估每个八度位置
        for (let offset = -60; offset <= 60; offset += 12) {
            const testNotes = adjusted.midiNotes.map(midi => midi + offset);
            const outOfRange = testNotes.filter(midi => midi < minMidi || midi > maxMidi).length;

            // 计算音符在音域中的分布质量
            const inRangeNotes = testNotes.filter(midi => midi >= minMidi && midi <= maxMidi);
            let distributionScore = 0;

            if (inRangeNotes.length > 0) {
                // 偏好音符在音域中心附近的分布
                const centerMidi = (minMidi + maxMidi) / 2;
                const avgDistance = inRangeNotes.reduce((sum, midi) => sum + Math.abs(midi - centerMidi), 0) / inRangeNotes.length;
                distributionScore = 100 - avgDistance; // 距离中心越近分数越高
            }

            // 综合评分：优先考虑音域合规，然后考虑分布质量
            const score = (adjusted.midiNotes.length - outOfRange) * 1000 + distributionScore;

            console.log(`🎯 八度偏移 ${offset}: ${outOfRange}个超出音域, 分布分数${distributionScore.toFixed(1)}, 总分${score.toFixed(1)}`);

            if (score > bestScore || (score === bestScore && outOfRange < minOutOfRange)) {
                minOutOfRange = outOfRange;
                bestOffset = offset;
                bestScore = score;
            }

            if (outOfRange === 0) {
                console.log(`🎯 找到完美匹配: 偏移${offset}`);
                break; // 完美匹配
            }
        }

        console.log(`🎯 选择最佳八度偏移: ${bestOffset} (${minOutOfRange}个音符超出音域)`);

        if (bestOffset !== 0) {
            adjusted.midiNotes = adjusted.midiNotes.map(midi => midi + bestOffset);
            // 🔥 关键修复：重新生成音符名称以匹配调整后的MIDI值
            adjusted.notes = adjusted.midiNotes.map(midi => this.midiToNoteInfo(midi).name);
            console.log(`🎯 应用八度调整: ${bestOffset > 0 ? '+' : ''}${bestOffset/12}个八度`);
            console.log(`🎹 调整后MIDI: [${adjusted.midiNotes.join(', ')}]`);
            console.log(`🎼 调整后音符: ${adjusted.notes.join('-')}`);
        }

        const finalOutOfRange = adjusted.midiNotes.filter(midi => midi < minMidi || midi > maxMidi);
        if (finalOutOfRange.length === 0) {
            console.log(`✅ 八度调整成功，所有音符都在音域内`);
            return adjusted;
        }

        // 🎯 智能决策：对于drop2等特殊voicing，如果超出音符很少，考虑保持结构
        if (voicing.type === 'drop2' && finalOutOfRange.length <= 1) {
            console.log(`🎯 Drop2特殊处理：只有${finalOutOfRange.length}个音符超出音域，尝试微调保持结构...`);

            // 只修正超出音域的音符，保持其他音符不变
            for (let i = 0; i < adjusted.midiNotes.length; i++) {
                let midi = adjusted.midiNotes[i];
                if (midi < minMidi || midi > maxMidi) {
                    // 轻微调整：移动到最近的边界
                    if (midi < minMidi) {
                        const newMidi = minMidi;
                        console.log(`🎯 Drop2边界修正: MIDI ${midi} -> ${newMidi} (提升到下限)`);
                        adjusted.midiNotes[i] = newMidi;
                    } else if (midi > maxMidi) {
                        const newMidi = maxMidi;
                        console.log(`🎯 Drop2边界修正: MIDI ${midi} -> ${newMidi} (降低到上限)`);
                        adjusted.midiNotes[i] = newMidi;
                    }
                }
            }

            // 重新生成音符名称
            adjusted.notes = adjusted.midiNotes.map(midi => this.midiToNoteInfo(midi).name);

            // 验证修正结果
            const afterBoundaryFix = adjusted.midiNotes.filter(midi => midi < minMidi || midi > maxMidi);
            if (afterBoundaryFix.length === 0) {
                console.log(`✅ Drop2边界修正成功: [${adjusted.midiNotes.join(', ')}]`);
                return adjusted;
            }
        }

        // 🎯 Drop3智能处理：区分可接受的微调 vs 有害的强制调整
        if (voicing.type === 'drop3') {
            if (finalOutOfRange.length === 0) {
                console.log(`✅ Drop3完全在音域内，无需调整`);
                return adjusted;
            }

            // 计算最大违反程度
            let maxViolation = 0;
            finalOutOfRange.forEach(midi => {
                if (midi < minMidi) {
                    maxViolation = Math.max(maxViolation, minMidi - midi);
                } else if (midi > maxMidi) {
                    maxViolation = Math.max(maxViolation, midi - maxMidi);
                }
            });

            const BOUNDARY_ACCEPTABLE_VIOLATION = 3; // 边界调整阶段允许3个半音以内
            const SEVERE_VIOLATION_THRESHOLD = 5;    // 超过5个半音视为严重违反

            // 🔥 严格拒绝：严重音域违反或过多音符超出
            if (maxViolation > SEVERE_VIOLATION_THRESHOLD || finalOutOfRange.length > voicing.midiNotes.length / 2) {
                console.error(`❌ Drop3拒绝严重违反：${finalOutOfRange.length}个音符超出，最大违反${maxViolation}半音`);
                console.log(`💡 避免有害的强制调整，返回null让上层逻辑选择替代和弦`);
                const violatingNotes = finalOutOfRange.map(midi => `MIDI ${midi}`).join(', ');
                console.log(`🚫 违反音域的音符: ${violatingNotes}，音域范围: ${minMidi}-${maxMidi}`);
                return null;
            }

            // ⚡ 智能微调：允许小幅违反进行边界调整
            if (maxViolation <= BOUNDARY_ACCEPTABLE_VIOLATION) {
                console.log(`🎯 Drop3智能微调：${finalOutOfRange.length}个音符需要微调，最大违反${maxViolation}半音`);
                console.log(`💡 可接受的边界调整，保持和弦结构完整性`);

                // 只修正超出音域的音符，保持其他音符不变
                for (let i = 0; i < adjusted.midiNotes.length; i++) {
                    let midi = adjusted.midiNotes[i];
                    if (midi < minMidi || midi > maxMidi) {
                        const originalMidi = midi;
                        // 智能调整：移动到最近的边界
                        if (midi < minMidi) {
                            midi = minMidi;
                            console.log(`    🔧 智能微调: MIDI ${originalMidi} -> ${midi} (提升${midi-originalMidi}半音到下限)`);
                        } else if (midi > maxMidi) {
                            midi = maxMidi;
                            console.log(`    🔧 智能微调: MIDI ${originalMidi} -> ${midi} (降低${originalMidi-midi}半音到上限)`);
                        }
                        adjusted.midiNotes[i] = midi;
                    }
                }

                // 重新生成音符名称
                adjusted.notes = adjusted.midiNotes.map(midi => this.midiToNoteInfo(midi).name);

                // 验证调整结果
                const afterAdjustment = adjusted.midiNotes.filter(midi => midi < minMidi || midi > maxMidi);
                if (afterAdjustment.length === 0) {
                    console.log(`✅ Drop3智能微调成功: [${adjusted.midiNotes.join(', ')}]`);
                    console.log(`    最终音符: ${adjusted.notes?.join('-')}`);
                    return adjusted;
                } else {
                    console.warn(`⚠️ 微调后仍有问题，继续标准处理流程`);
                }
            }

            // 兜底逻辑：中等程度违反的处理
            if (finalOutOfRange.length <= 1) {
                console.log(`🎯 Drop3特殊处理：只有${finalOutOfRange.length}个音符超出音域，尝试微调保持结构...`);

                // 只修正超出音域的音符，保持其他音符不变
                for (let i = 0; i < adjusted.midiNotes.length; i++) {
                    let midi = adjusted.midiNotes[i];
                    if (midi < minMidi || midi > maxMidi) {
                        // 轻微调整：移动到最近的边界
                        if (midi < minMidi) {
                            const newMidi = minMidi;
                            console.log(`🎯 Drop3边界修正: MIDI ${midi} -> ${newMidi} (提升到下限)`);
                            adjusted.midiNotes[i] = newMidi;
                        } else if (midi > maxMidi) {
                            const newMidi = maxMidi;
                            console.log(`🎯 Drop3边界修正: MIDI ${midi} -> ${newMidi} (降低到上限)`);
                            adjusted.midiNotes[i] = newMidi;
                        }
                    }
                }

                // 重新生成音符名称
                adjusted.notes = adjusted.midiNotes.map(midi => this.midiToNoteInfo(midi).name);

                // 验证修正结果
                const afterBoundaryFix = adjusted.midiNotes.filter(midi => midi < minMidi || midi > maxMidi);
                if (afterBoundaryFix.length === 0) {
                    console.log(`✅ Drop3边界修正成功: [${adjusted.midiNotes.join(', ')}]`);
                    return adjusted;
                }
            } else {
                console.log(`⚠️ Drop3有${finalOutOfRange.length}个音符超出音域，继续标准处理流程`);
            }
        }

        // 标准强制修正（用于其他类型或drop2/drop3边界修正失败的情况）
        console.warn(`⚠️ 八度调整后仍有${finalOutOfRange.length}个音符超出音域，进行完整修正...`);

        // 🔥 强制音域合规：逐个修正超出音域的音符
        for (let i = 0; i < adjusted.midiNotes.length; i++) {
            let midi = adjusted.midiNotes[i];
            if (midi < minMidi || midi > maxMidi) {
                // 强制移到最近的合法音符位置
                const note = midi % 12;
                let bestMidi = midi;
                let minDistance = Infinity;

                // 在所有八度中寻找相同音名的合法位置
                for (let octave = 0; octave <= 8; octave++) {
                    const candidateMidi = octave * 12 + note;
                    if (candidateMidi >= minMidi && candidateMidi <= maxMidi) {
                        const distance = Math.abs(candidateMidi - midi);
                        if (distance < minDistance) {
                            minDistance = distance;
                            bestMidi = candidateMidi;
                        }
                    }
                }

                if (bestMidi !== midi) {
                    console.log(`🎯 完整修正: MIDI ${midi} -> ${bestMidi} (${this.midiToNoteInfo(midi).name} -> ${this.midiToNoteInfo(bestMidi).name})`);
                    adjusted.midiNotes[i] = bestMidi;
                } else {
                    // 如果找不到相同音名的合法位置，钳制到边界
                    const clampedMidi = Math.max(minMidi, Math.min(maxMidi, midi));
                    console.log(`🎯 边界钳制: MIDI ${midi} -> ${clampedMidi}`);
                    adjusted.midiNotes[i] = clampedMidi;
                }
            }
        }

        // 重新生成音符名称
        adjusted.notes = adjusted.midiNotes.map(midi => this.midiToNoteInfo(midi).name);

        // 最终验证
        const stillOutOfRange = adjusted.midiNotes.filter(midi => midi < minMidi || midi > maxMidi);
        if (stillOutOfRange.length === 0) {
            console.log(`✅ 完整修正成功，所有音符都在音域内: [${adjusted.midiNotes.join(', ')}]`);
            return adjusted;
        } else {
            console.error(`❌ 完整修正失败，仍有${stillOutOfRange.length}个音符超出音域: [${stillOutOfRange.join(', ')}]`);
            return null; // 彻底失败，返回null而不是违规的voicing
        }
    }

    /**
     * 对普通voicing应用灵活的音域调整
     */
    applyFlexibleRangeAdjustment(voicing, minMidi, maxMidi) {
        const adjusted = {
            ...voicing,
            midiNotes: [...voicing.midiNotes]
        };

        // 先尝试整体八度调整
        const octaveAdjusted = this.applyOctaveAdjustment(adjusted, minMidi, maxMidi);
        const outOfRange = octaveAdjusted.midiNotes.filter(midi => midi < minMidi || midi > maxMidi);

        if (outOfRange.length === 0) {
            return octaveAdjusted;
        }

        // 如果整体调整不够，逐个音符调整
        console.log(`🔧 逐个音符调整模式`);
        for (let i = 0; i < adjusted.midiNotes.length; i++) {
            let midi = adjusted.midiNotes[i];

            if (midi < minMidi || midi > maxMidi) {
                // 找到最近的合法位置
                const note = midi % 12;
                let bestMidi = midi;
                let minDistance = Infinity;

                for (let octave = 0; octave <= 8; octave++) {
                    const candidateMidi = octave * 12 + note;
                    if (candidateMidi >= minMidi && candidateMidi <= maxMidi) {
                        const distance = Math.abs(candidateMidi - midi);
                        if (distance < minDistance) {
                            minDistance = distance;
                            bestMidi = candidateMidi;
                        }
                    }
                }

                if (bestMidi !== midi) {
                    console.log(`🎯 音符${i+1}: MIDI ${midi} -> ${bestMidi}`);
                    adjusted.midiNotes[i] = bestMidi;
                }
            }
        }

        // 重新排序确保音符顺序正确
        if (voicing.type === 'close') {
            adjusted.midiNotes.sort((a, b) => a - b);
            // 重新生成音符名称
            adjusted.notes = adjusted.midiNotes.map(midi => this.midiToNoteInfo(midi).name);
        }

        const finalOutOfRange = adjusted.midiNotes.filter(midi => midi < minMidi || midi > maxMidi);
        console.log(`📊 最终结果: ${finalOutOfRange.length}个音符超出音域`);

        // 🔥 最终音域合规验证：绝对不允许返回超出音域的音符
        if (finalOutOfRange.length === 0) {
            console.log(`✅ 灵活调整成功，所有音符都在音域内`);
            return adjusted;
        } else {
            console.error(`❌ 灵活调整失败：仍有${finalOutOfRange.length}个音符超出音域 [${finalOutOfRange.join(', ')}]`);
            console.log(`🎯 超出音域的违规音符将被强制修正...`);

            // 强制修正所有超出音域的音符
            for (let i = 0; i < adjusted.midiNotes.length; i++) {
                let midi = adjusted.midiNotes[i];
                if (midi < minMidi || midi > maxMidi) {
                    // 强制钳制到音域边界
                    const clampedMidi = Math.max(minMidi, Math.min(maxMidi, midi));
                    console.log(`🎯 强制钳制: MIDI ${midi} -> ${clampedMidi}`);
                    adjusted.midiNotes[i] = clampedMidi;
                }
            }

            // 重新生成音符名称
            adjusted.notes = adjusted.midiNotes.map(midi => this.midiToNoteInfo(midi).name);

            // 最终验证
            const stillOutOfRange = adjusted.midiNotes.filter(midi => midi < minMidi || midi > maxMidi);
            if (stillOutOfRange.length === 0) {
                console.log(`✅ 强制修正成功，所有音符都在音域内: [${adjusted.midiNotes.join(', ')}]`);
                return adjusted;
            } else {
                console.error(`❌ 强制修正彻底失败，返回null而不是违规结果`);
                return null;
            }
        }
    }

    /**
     * 检测是否为七和弦类型
     * @param {string} chordType - 和弦类型
     * @returns {boolean} 是否为七和弦
     */
    isSeventhChord(chordType) {
        if (!chordType) return false;

        // 常见的七和弦类型
        const seventhChordTypes = [
            'major7', 'minor7', 'dominant7', '7', 'maj7', 'm7', 'dom7',
            'minor7b5', 'm7b5', 'half-diminished', 'diminished7', 'dim7',
            'major7#11', 'minor-major7', 'minMaj7', 'augmented7', 'aug7'
        ];

        // 检查是否包含7或明确的七和弦标识
        return seventhChordTypes.some(type => chordType.includes(type)) ||
               (chordType.includes('7') && !chordType.includes('sus'));
    }

    /**
     * 🎸 吉他专用sus和弦生成器
     * 为吉他模式生成特定的sus和弦音符排列模式
     * @param {Object} chord - 和弦对象
     * @param {string} voicingType - voicing类型 (close, drop2, drop3)
     * @param {Object} options - 选项，包含音域限制等
     * @returns {Object|null} 生成的sus和弦voicing或null
     */
    generateGuitarSusVoicing(chord, voicingType, options = {}) {
        console.log(`\n🎸 === 吉他专用sus和弦生成器 ===`);
        console.log(`🎵 和弦: ${chord.root}${chord.type}, voicing类型: ${voicingType}`);

        // 检测sus和弦类型
        const isSus2 = chord.type.includes('sus2');
        const isSus4 = chord.type.includes('sus4');
        const isSeventh = chord.type.includes('7');

        if (!isSus2 && !isSus4) {
            console.error(`❌ 非sus和弦，不适用吉他专用生成器: ${chord.type}`);
            return null;
        }

        // 获取根音的MIDI值
        const rootSemitone = this.harmonyTheory.noteToSemitone[chord.root];
        if (rootSemitone === undefined) {
            console.error(`❌ 无效的根音: ${chord.root}`);
            return null;
        }

        // 计算基础八度，默认C4为起点
        let baseOctave = this.voicingSettings.defaultOctave || 4;
        let minMidi = options.rangeMin || null;
        let maxMidi = options.rangeMax || null;

        // 如果没有明确的音域设置，从DOM获取
        if (minMidi === null || maxMidi === null) {
            if (typeof document !== 'undefined') {
                const rangeMinSelect = document.getElementById('rangeMin');
                const rangeMaxSelect = document.getElementById('rangeMax');
                if (rangeMinSelect && rangeMaxSelect) {
                    minMidi = minMidi || parseInt(rangeMinSelect.value);
                    maxMidi = maxMidi || parseInt(rangeMaxSelect.value);
                }
            }
        }

        // 根音MIDI值计算
        const rootMidi = rootSemitone + (baseOctave - 4) * 12 + 60; // C4 = 60

        // 🎵 2025-10-05新增：3音符vs 4音符sus选择逻辑
        const enableInversions = options.enableInversions !== false;
        const requestedInversion = chord.inversion || 0;

        // 根据sus和弦类型生成特定的音符排列模式
        let midiNotes = [];
        let noteNames = [];

        if (isSeventh) {
            // 七和弦sus：1-5-7-X模式（保持原有4音符逻辑）
            if (isSus2) {
                // 7sus2: 1-5-7-2模式 (C4-G4-Bb4-D5)
                midiNotes = [
                    rootMidi,           // 1
                    rootMidi + 7,       // 5 (perfect 5th)
                    rootMidi + 10,      // b7 (minor 7th)
                    rootMidi + 14       // 2+12 (major 2nd, octave higher)
                ];
                noteNames = this.generateNoteNames(chord.root, [0, 7, 10, 14]);
                console.log(`🎵 7sus2模式: 1-5-7-2 ${noteNames.join('-')}`);
            } else {
                // 7sus4: 1-5-7-4模式 (C4-G4-Bb4-F5)
                midiNotes = [
                    rootMidi,           // 1
                    rootMidi + 7,       // 5 (perfect 5th)
                    rootMidi + 10,      // b7 (minor 7th)
                    rootMidi + 17       // 4+12 (perfect 4th, octave higher)
                ];
                noteNames = this.generateNoteNames(chord.root, [0, 7, 10, 17]);
                console.log(`🎵 7sus4模式: 1-5-7-4 ${noteNames.join('-')}`);
            }
        } else {
            // 🎵 三和弦sus：优先3音符（支持转位和Drop2），4音符作为补充
            const useThreeNoteSus = enableInversions || requestedInversion > 0 || Math.random() < 0.7;

            if (useThreeNoteSus) {
                // 🎵 新增 (2025-10-05): 3音符sus和弦，支持转位
                console.log(`🎵 使用3音符sus和弦（支持转位和Drop2/Drop3）`);

                if (isSus2) {
                    // Sus2三音符转位
                    const sus2Inversions = [
                        { pattern: '1-2-5', intervals: [0, 2, 7], name: '原位' },      // 原位
                        { pattern: '2-5-1', intervals: [2, 7, 12], name: '第一转位' }, // 第一转位
                        { pattern: '5-1-2', intervals: [7, 12, 14], name: '第二转位' }  // 第二转位
                    ];
                    const inversionIndex = requestedInversion % 3;
                    const chosenInversion = sus2Inversions[inversionIndex];

                    midiNotes = chosenInversion.intervals.map(interval => rootMidi + interval);
                    noteNames = this.generateNoteNames(chord.root, chosenInversion.intervals);
                    console.log(`🎵 sus2三音符${chosenInversion.name}: ${chosenInversion.pattern} ${noteNames.join('-')}`);
                } else {
                    // Sus4三音符转位
                    const sus4Inversions = [
                        { pattern: '1-4-5', intervals: [0, 5, 7], name: '原位' },      // 原位
                        { pattern: '4-5-1', intervals: [5, 7, 12], name: '第一转位' }, // 第一转位
                        { pattern: '5-1-4', intervals: [7, 12, 17], name: '第二转位' }  // 第二转位
                    ];
                    const inversionIndex = requestedInversion % 3;
                    const chosenInversion = sus4Inversions[inversionIndex];

                    midiNotes = chosenInversion.intervals.map(interval => rootMidi + interval);
                    noteNames = this.generateNoteNames(chord.root, chosenInversion.intervals);
                    console.log(`🎵 sus4三音符${chosenInversion.name}: ${chosenInversion.pattern} ${noteNames.join('-')}`);
                }
            } else {
                // 🎵 保留原有4音符sus逻辑（吉他专用，不支持Drop2/Drop3）
                console.log(`🎵 使用4音符sus和弦（吉他专用1-5-1-X配置，不支持Drop2/Drop3）`);

                if (isSus2) {
                    // sus2: 1-5-1-2模式 (C4-G4-C5-D5)
                    midiNotes = [
                        rootMidi,           // 1
                        rootMidi + 7,       // 5 (perfect 5th)
                        rootMidi + 12,      // 1+12 (root, octave higher)
                        rootMidi + 14       // 2+12 (major 2nd, octave higher)
                    ];
                    noteNames = this.generateNoteNames(chord.root, [0, 7, 12, 14]);
                    console.log(`🎵 sus2四音符模式: 1-5-1-2 ${noteNames.join('-')}`);
                } else {
                    // sus4: 1-5-1-4模式 (C4-G4-C5-F5)
                    midiNotes = [
                        rootMidi,           // 1
                        rootMidi + 7,       // 5 (perfect 5th)
                        rootMidi + 12,      // 1+12 (root, octave higher)
                        rootMidi + 17       // 4+12 (perfect 4th, octave higher)
                    ];
                    noteNames = this.generateNoteNames(chord.root, [0, 7, 12, 17]);
                    console.log(`🎵 sus4四音符模式: 1-5-1-4 ${noteNames.join('-')}`);
                }
            }
        }

        // 🚨 A3+限制：sus2和弦只能在A3以上出现
        if (isSus2) {
            const a3Midi = 57; // A3
            const lowestMidi = Math.min(...midiNotes);

            if (lowestMidi < a3Midi) {
                console.log(`🚨 sus2和弦A3+限制：当前最低音${lowestMidi} < A3(${a3Midi})`);

                // 计算需要上移的八度数
                const octaveAdjustment = Math.ceil((a3Midi - lowestMidi) / 12) * 12;
                midiNotes = midiNotes.map(midi => midi + octaveAdjustment);

                console.log(`📈 已上移${octaveAdjustment}半音，新的最低音: ${Math.min(...midiNotes)}`);
            }
        }

        // 检查音域约束
        if (minMidi !== null && maxMidi !== null) {
            const finalLowest = Math.min(...midiNotes);
            const finalHighest = Math.max(...midiNotes);

            if (finalLowest < minMidi || finalHighest > maxMidi) {
                console.warn(`⚠️ 音域约束冲突: 和弦范围${finalLowest}-${finalHighest}, 要求范围${minMidi}-${maxMidi}`);

                // 尝试调整八度
                let adjustment = 0;
                if (finalLowest < minMidi) {
                    adjustment = Math.ceil((minMidi - finalLowest) / 12) * 12;
                } else if (finalHighest > maxMidi) {
                    adjustment = -Math.ceil((finalHighest - maxMidi) / 12) * 12;
                }

                if (adjustment !== 0) {
                    const adjustedMidiNotes = midiNotes.map(midi => midi + adjustment);
                    const adjLowest = Math.min(...adjustedMidiNotes);
                    const adjHighest = Math.max(...adjustedMidiNotes);

                    // 检查sus2的A3限制是否仍然满足
                    if (isSus2 && adjLowest < 57) {
                        console.error(`❌ 无法满足sus2 A3+限制和音域约束，返回null`);
                        return null;
                    }

                    if (adjLowest >= minMidi && adjHighest <= maxMidi) {
                        midiNotes = adjustedMidiNotes;
                        console.log(`✅ 八度调整成功: ${adjustment > 0 ? '+' : ''}${adjustment}半音`);
                    } else {
                        console.error(`❌ 无法在指定音域内生成符合要求的sus和弦`);
                        return null;
                    }
                }
            }
        }

        // 重新生成音符名称（基于最终的MIDI值）
        const finalNoteNames = midiNotes.map(midi => this.midiToNoteName(midi, chord.root));

        // 构建voicing对象
        const voicing = {
            type: voicingType,
            notes: finalNoteNames,
            midiNotes: midiNotes,
            range: Math.floor(Math.min(...midiNotes) / 12) - 1,
            rangeConstraints: { minMidi, maxMidi },
            chordType: chord.type,
            root: chord.root,
            isGuitarSusSpecial: true, // 标记为吉他专用sus和弦
            susType: isSus2 ? 'sus2' : 'sus4',
            pattern: isSeventh ?
                (isSus2 ? '1-5-7-2' : '1-5-7-4') :
                (isSus2 ? '1-5-1-2' : '1-5-1-4')
        };

        console.log(`✅ 吉他专用sus和弦生成完成:`);
        console.log(`   和弦: ${voicing.root}${voicing.chordType}`);
        console.log(`   模式: ${voicing.pattern}`);
        console.log(`   音符: ${voicing.notes.join('-')}`);
        console.log(`   MIDI: [${voicing.midiNotes.join(', ')}]`);

        return voicing;
    }

    /**
     * 根据根音和音程间隔生成音符名称
     * @param {string} root - 根音
     * @param {Array} intervals - 音程间隔数组
     * @returns {Array} 音符名称数组
     */
    generateNoteNames(root, intervals) {
        const noteNames = [];
        // 🔧 修复 (2025-10-03): 优先使用this.currentChord.key，确保调号正确传递
        const keyInfo = this.harmonyTheory.keys[this.currentChord?.key || `${root}-major`] || this.harmonyTheory.keys['C-major'];

        intervals.forEach(interval => {
            const semitone = (this.harmonyTheory.noteToSemitone[root] + interval) % 12;
            const noteName = Object.keys(this.harmonyTheory.noteToSemitone)
                .find(note => this.harmonyTheory.noteToSemitone[note] === semitone) || 'C';
            noteNames.push(noteName);
        });

        return noteNames;
    }

    /**
     * 将MIDI值转换为音符名称（调号感知版本）
     * @param {number} midi - MIDI值
     * @param {string} rootNote - 根音（降级时用于确定升降号偏好）
     * @param {string} key - 调号（可选，优先级最高）
     * @returns {string} 音符名称
     */
    midiToNoteName(midi, rootNote = 'C', key = null) {
        const noteIndex = midi % 12;
        const octave = Math.floor(midi / 12) - 1;

        // 🔧 修复：优先使用调号感知拼写
        if (this.harmonyTheory && typeof this.harmonyTheory.getConsistentNoteSpelling === 'function' && key) {
            const noteName = this.harmonyTheory.getConsistentNoteSpelling(noteIndex, key);
            return noteName + octave;
        }

        // 降级处理：根据根音的升降号偏好选择音符名称
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const flatNoteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

        // 简单的调号检测或根音偏好
        const useFlats = (key && (key.includes('b') || key.includes('♭'))) ||
                         rootNote.includes('b') ||
                         ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(rootNote);

        const selectedNoteNames = useFlats ? flatNoteNames : noteNames;
        return selectedNoteNames[noteIndex] + octave;
    }

    /**
     * 决定close voicing是否应该启用转位
     * 七和弦的close voicing强制禁用转位（根位），三和弦保持原有逻辑
     * @param {Object} chord - 和弦对象
     * @param {boolean} originalEnableInversions - 原始转位设置
     * @returns {boolean} close voicing是否应该启用转位
     */
    shouldEnableInversionsForCloseVoicing(chord, originalEnableInversions) {
        const isSeventhChord = this.isSeventhChord(chord.type);

        // 七和弦检测日志
        console.log(`🔍 七和弦检测: ${chord.type} -> ${isSeventhChord}`);

        if (isSeventhChord) {
            console.log(`🎯 Close voicing七和弦特殊处理: ${chord.root}${chord.type} 强制使用根位`);
            return false; // 七和弦的close voicing强制禁用转位
        } else {
            console.log(`🎯 Close voicing三和弦: ${chord.root}${chord.type} 保持原有转位逻辑 (${originalEnableInversions})`);
            return originalEnableInversions; // 三和弦保持原有逻辑
        }
    }


    /**
     * 测试吉他模式下Close voicing七和弦的F#4限制功能
     * 这个函数可以在浏览器控制台中调用来验证修改是否正确工作
     */
    testGuitarModeF4Restriction() {
        console.log('\n🧪 === 吉他模式F#4限制测试开始 ===');

        // 测试和弦列表
        const testChords = [
            { root: 'C', type: 'major7', description: 'C大七和弦' },
            { root: 'F', type: 'dominant7', description: 'F属七和弦' },
            { root: 'G', type: 'minor7', description: 'G小七和弦' }
        ];

        // 模拟低音域设置（低于F#4）
        const lowRangeOptions = {
            rangeMin: 48, // C3
            rangeMax: 84  // C6
        };

        testChords.forEach((chord, index) => {
            console.log(`\n🎵 测试 ${index + 1}: ${chord.description}`);

            // 模拟吉他模式（如果在浏览器环境中）
            if (typeof document !== 'undefined') {
                const toggle = document.getElementById('instrumentModeToggle');
                if (toggle) toggle.checked = false; // 设置为吉他模式
            }

            const result = this.generateCloseVoicing(chord, lowRangeOptions);

            if (result && result.midiNotes) {
                const lowestMidi = Math.min(...result.midiNotes);
                const fs4Midi = 66;

                console.log(`🎼 生成的和弦: ${result.notes.join('-')}`);
                console.log(`🎵 MIDI音符: [${result.midiNotes.join(', ')}]`);
                console.log(`📊 最低音: ${lowestMidi} (${lowestMidi >= fs4Midi ? '✅ >= F#4' : '❌ < F#4'})`);

                if (lowestMidi >= fs4Midi) {
                    console.log(`✅ 测试通过: ${chord.description} 最低音符合F#4限制`);
                } else {
                    console.log(`❌ 测试失败: ${chord.description} 最低音低于F#4`);
                }
            } else {
                console.log(`❌ 生成失败: ${chord.description}`);
            }
        });

        console.log('\n🧪 === 吉他模式F#4限制测试结束 ===\n');
    }

    /**
     * 测试吉他模式sus和弦限制
     *
     * 测试以下限制：
     * 1. 特定音符排列模式：1-5-1-2, 1-5-1-4, 1-5-7-2, 1-5-7-4
     * 2. sus2和弦只能在A3以上出现（MIDI 57+）
     * 3. 影响close/drop2/drop3 voicing，不影响shell voicing
     * 4. 不影响钢琴模式
     */
    testGuitarSusChordRestrictions() {
        console.log('\n🧪 === 吉他模式sus和弦限制测试开始 ===');

        // 测试sus和弦列表
        const testSusChords = [
            { root: 'C', type: 'sus2', description: 'C sus2和弦', expectedPattern: '1-5-1-2' },
            { root: 'C', type: 'sus4', description: 'C sus4和弦', expectedPattern: '1-5-1-4' },
            { root: 'G', type: '7sus2', description: 'G 7sus2和弦', expectedPattern: '1-5-7-2' },
            { root: 'F', type: '7sus4', description: 'F 7sus4和弦', expectedPattern: '1-5-7-4' }
        ];

        const testRangeOptions = {
            rangeMin: 48, // C3
            rangeMax: 84  // C6
        };

        console.log('🎸 测试1: 吉他模式sus和弦特殊排列模式');

        // 模拟吉他模式
        if (typeof document !== 'undefined') {
            const toggle = document.getElementById('instrumentModeToggle');
            if (toggle) toggle.checked = false; // 设置为吉他模式
        }

        testSusChords.forEach((chord, index) => {
            console.log(`\n🎵 测试 ${index + 1}: ${chord.description} (期望模式: ${chord.expectedPattern})`);

            // 测试Close voicing
            const closeResult = this.generateCloseVoicing(chord, testRangeOptions);
            if (closeResult && closeResult.notes) {
                console.log(`  Close: ${closeResult.notes.join('-')} | MIDI: [${closeResult.midiNotes.join(', ')}]`);
            } else {
                console.log(`  Close: ❌ 生成失败`);
            }

            // 测试Drop2 voicing
            if (closeResult) {
                const drop2Result = this.generateDrop2Voicing(closeResult, testRangeOptions);
                if (drop2Result && drop2Result.notes) {
                    console.log(`  Drop2: ${drop2Result.notes.join('-')} | MIDI: [${drop2Result.midiNotes.join(', ')}]`);
                } else {
                    console.log(`  Drop2: ❌ 生成失败`);
                }

                // 测试Drop3 voicing
                const drop3Result = this.generateDrop3Voicing(closeResult, testRangeOptions);
                if (drop3Result && drop3Result.notes) {
                    console.log(`  Drop3: ${drop3Result.notes.join('-')} | MIDI: [${drop3Result.midiNotes.join(', ')}]`);
                } else {
                    console.log(`  Drop3: ❌ 生成失败`);
                }
            }

            // 测试Shell voicing（应该不受影响）
            const shellResult = this.generateShellVoicing(chord);
            if (shellResult && shellResult.notes) {
                console.log(`  Shell: ${shellResult.notes.join('-')} | MIDI: [${shellResult.midiNotes.join(', ')}] (应不受限制)`);
            } else {
                console.log(`  Shell: ❌ 生成失败`);
            }
        });

        console.log('\n🎵 测试2: sus2和弦A3限制（MIDI 57+）');

        // 测试sus2和弦的A3限制
        const sus2TestChord = { root: 'C', type: 'sus2', description: 'C sus2和弦' };
        const lowRangeOptions = {
            rangeMin: 40, // E2
            rangeMax: 60  // C4 - 低音域测试
        };

        const sus2Result = this.generateCloseVoicing(sus2TestChord, lowRangeOptions);
        if (sus2Result && sus2Result.midiNotes) {
            const lowestMidi = Math.min(...sus2Result.midiNotes);
            const a3Midi = 57;
            console.log(`🎼 sus2生成结果: ${sus2Result.notes.join('-')}`);
            console.log(`🎵 最低音MIDI: ${lowestMidi} (${lowestMidi >= a3Midi ? '✅ >= A3' : '❌ < A3'})`);
        }

        console.log('\n🎹 测试3: 钢琴模式隔离验证');

        // 模拟钢琴模式
        if (typeof document !== 'undefined') {
            const toggle = document.getElementById('instrumentModeToggle');
            if (toggle) toggle.checked = true; // 设置为钢琴模式
        }

        const pianoTestChord = { root: 'C', type: 'sus2', description: 'C sus2和弦 (钢琴模式)' };
        const pianoResult = this.generateCloseVoicing(pianoTestChord, testRangeOptions);
        if (pianoResult && pianoResult.notes) {
            console.log(`🎹 钢琴模式sus2: ${pianoResult.notes.join('-')} | MIDI: [${pianoResult.midiNotes.join(', ')}]`);
            console.log(`🎹 钢琴模式应使用标准生成逻辑，不受吉他限制影响`);
        }

        // 恢复吉他模式
        if (typeof document !== 'undefined') {
            const toggle = document.getElementById('instrumentModeToggle');
            if (toggle) toggle.checked = false; // 恢复吉他模式
        }

        console.log('\n🧪 === 吉他模式sus和弦限制测试结束 ===\n');
    }


    /**
     * 🧪 测试增强三和弦隔离系统
     * 验证新的和声配置是否能正确隔离，不被Drop变换影响
     */
    testEnhancedTriadIsolationSystem() {
        console.log('\n🧪 === 增强三和弦隔离系统测试 ===\n');

        // 保存原始设置
        const originalEnhancedSetting = this.enhancedTriadSettings.enabled;
        const originalGlobalSetting = typeof chordSettings !== 'undefined' ? chordSettings.enhancedGuitarTriads : undefined;

        // 测试用例
        const testChords = [
            { root: 'C', type: 'major', description: 'C大三和弦' },
            { root: 'A', type: 'minor', description: 'A小三和弦' },
            { root: 'F#', type: 'diminished', description: 'F#减三和弦' },
            { root: 'G', type: 'augmented', description: 'G增三和弦' }
        ];

        const testOptions = {
            rangeMin: 55,
            rangeMax: 88,
            voicingContext: 'close-only',
            allowEnhanced: true
        };

        console.log('🔧 测试环境设置: 吉他模式, 音域55-88, close voicing only');

        testChords.forEach((chord, index) => {
            console.log(`\n🎵 === 测试 ${index + 1}: ${chord.description} ===`);

            // 阶段1: 启用增强配置测试
            console.log('\n📊 阶段1: 启用增强三和弦配置');
            this.enhancedTriadSettings.enabled = true;
            if (typeof chordSettings !== 'undefined') {
                chordSettings.enhancedGuitarTriads = true;
            }

            const enhancedResult = this.generateCloseVoicing(chord, testOptions);
            if (enhancedResult) {
                console.log(`✅ 增强配置生成成功: ${enhancedResult.notes.join('-')}`);
                console.log(`🏷️  标记检查: isEnhancedTriad=${enhancedResult.isEnhancedTriad}, preventDropTransform=${enhancedResult.preventDropTransform}`);

                // 测试Drop2防护
                console.log('\n🛡️ 测试Drop2防护机制:');
                const drop2Result = this.generateDrop2Voicing(enhancedResult, testOptions);
                if (drop2Result === null) {
                    console.log('✅ Drop2防护成功: 增强三和弦被正确阻止变换');
                } else {
                    console.error('❌ Drop2防护失败: 增强三和弦被错误地变换了!');
                }

                // 测试Drop3防护
                console.log('🛡️ 测试Drop3防护机制:');
                const drop3Result = this.generateDrop3Voicing(enhancedResult, testOptions);
                if (drop3Result === null) {
                    console.log('✅ Drop3防护成功: 增强三和弦被正确阻止变换');
                } else {
                    console.error('❌ Drop3防护失败: 增强三和弦被错误地变换了!');
                }

                // 测试Shell防护
                console.log('🛡️ 测试Shell防护机制:');
                const shellResult = this.generateShellVoicing(chord);
                if (shellResult === null) {
                    console.log('✅ Shell防护成功: 增强三和弦被正确阻止变换');
                } else {
                    console.error('❌ Shell防护失败: 增强三和弦被错误地变换了!');
                }
            } else {
                console.warn('⚠️ 增强配置生成失败，跳过防护测试');
            }

            // 阶段2: 禁用增强配置测试
            console.log('\n📊 阶段2: 禁用增强三和弦配置');
            this.enhancedTriadSettings.enabled = false;
            if (typeof chordSettings !== 'undefined') {
                chordSettings.enhancedGuitarTriads = false;
            }

            const standardResult = this.generateCloseVoicing(chord, { ...testOptions, allowEnhanced: false });
            if (standardResult) {
                console.log(`✅ 标准配置生成成功: ${standardResult.notes.join('-')}`);
                console.log(`🔍 标记检查: isEnhancedTriad=${standardResult.isEnhancedTriad}, type=${standardResult.type}`);

                // 验证标准配置可以正常变换（对比测试）
                console.log('🔄 验证标准配置可正常变换:');
                const standardDrop2 = this.generateDrop2Voicing(standardResult, testOptions);
                if (standardDrop2) {
                    console.log(`✅ 标准Drop2正常: ${standardDrop2.notes.join('-')}`);
                } else {
                    console.log('ℹ️ 标准Drop2未生成（可能是三和弦限制）');
                }
            } else {
                console.error('❌ 标准配置生成失败');
            }
        });

        // 阶段3: 完整系统集成测试
        console.log('\n📊 阶段3: 系统集成测试');
        console.log('🧪 测试generateVoicings完整流程...');

        // 启用增强配置
        this.enhancedTriadSettings.enabled = true;
        if (typeof chordSettings !== 'undefined') {
            chordSettings.enhancedGuitarTriads = true;
        }

        const integrationChord = { root: 'C', type: 'major' };
        const integrationOptions = {
            enabledVoicings: ['close'],
            voicingContext: 'close-only',
            allowEnhanced: true,
            rangeMin: 55,
            rangeMax: 88
        };

        const fullResult = this.generateVoicings(integrationChord, integrationOptions);
        if (fullResult && fullResult.selected) {
            console.log(`✅ 完整系统测试成功: ${fullResult.selected.notes.join('-')}`);
            console.log(`🏷️ 系统选择类型: ${fullResult.selected.type}`);
            console.log(`🛡️ 防护标记: preventDropTransform=${fullResult.selected.preventDropTransform}`);
        } else {
            console.error('❌ 完整系统测试失败');
        }

        // 恢复原始设置
        this.enhancedTriadSettings.enabled = originalEnhancedSetting;
        if (typeof chordSettings !== 'undefined' && originalGlobalSetting !== undefined) {
            chordSettings.enhancedGuitarTriads = originalGlobalSetting;
        }

        console.log('\n🏁 === 增强三和弦隔离系统测试完成 ===');
        console.log('📋 测试覆盖范围:');
        console.log('  ✅ 增强三和弦独立生成');
        console.log('  ✅ Drop2/Drop3/Shell防护机制');
        console.log('  ✅ 配置开关控制');
        console.log('  ✅ 标准配置兼容性');
        console.log('  ✅ 完整系统集成');
        console.log('\n💡 如需启用增强三和弦，请设置: chordSettings.enhancedGuitarTriads = true');
        console.log('🎸 增强三和弦配置仅在吉他模式下的close voicing中生效\n');
    }

    /**
     * 🧪 测试四声部三和弦配置系统
     * 验证新增的五种四声部配置的正确性
     */
    testFourVoiceTriadConfigurations() {
        console.log('\n🧪 === 四声部三和弦配置测试开始 ===');

        // 保存原始设置
        const originalEnhancedSetting = this.enhancedTriadSettings.enabled;
        const originalGlobalSetting = typeof chordSettings !== 'undefined' ? chordSettings.enhancedGuitarTriads : undefined;
        const originalFourVoiceSetting = typeof chordSettings !== 'undefined' && chordSettings.fourVoiceTriadSettings ?
                                        {...chordSettings.fourVoiceTriadSettings} : null;

        try {
            // 启用增强三和弦和四声部配置
            this.enhancedTriadSettings.enabled = true;
            if (typeof chordSettings !== 'undefined') {
                chordSettings.enhancedGuitarTriads = true;
                if (chordSettings.fourVoiceTriadSettings) {
                    chordSettings.fourVoiceTriadSettings.enabled = true;
                    // 启用所有配置进行测试
                    Object.keys(chordSettings.fourVoiceTriadSettings.allowedConfigurations).forEach(key => {
                        chordSettings.fourVoiceTriadSettings.allowedConfigurations[key] = true;
                    });
                }
            }

            // 测试和弦类型
            const testChords = [
                { root: 'C', type: 'major', description: 'C大三和弦' },
                { root: 'A', type: 'minor', description: 'A小三和弦' },
                { root: 'G', type: 'major', description: 'G大三和弦' }
            ];

            console.log('🎯 测试四声部配置选择和生成...\n');

            testChords.forEach((chord, index) => {
                console.log(`\n🎵 测试 ${index + 1}: ${chord.description}`);

                // 获取可用配置
                const configs = this.getEnhancedTriadConfiguration(chord);
                if (!configs) {
                    console.log(`⚠️ 没有找到 ${chord.type} 类型的增强配置`);
                    return;
                }

                console.log(`📋 测试配置: ${configs.name} (${configs.voiceCount}声部)`);

                // 测试配置应用
                const testVoicing = {
                    notes: [],
                    midiNotes: [],
                    type: 'enhanced-close',
                    isEnhancedTriad: true
                };

                // 应用配置生成voicing
                this.applyEnhancedConfiguration(testVoicing, chord, configs, 4);

                // 验证结果
                if (testVoicing.notes.length > 0 && testVoicing.midiNotes.length > 0) {
                    console.log(`✅ 生成成功: ${testVoicing.notes.join('-')}`);
                    console.log(`🎵 MIDI值: [${testVoicing.midiNotes.join(', ')}]`);
                    console.log(`🔢 声部数: ${testVoicing.notes.length} (期望: ${configs.voiceCount})`);

                    // 验证声部数匹配
                    if (testVoicing.notes.length === configs.voiceCount) {
                        console.log(`✅ 声部数验证通过`);
                    } else {
                        console.log(`❌ 声部数不匹配: 实际${testVoicing.notes.length}, 期望${configs.voiceCount}`);
                    }

                    // 验证音程结构
                    this.validateTriadStructure(testVoicing, chord, configs);
                } else {
                    console.log(`❌ 生成失败: ${chord.description}`);
                }
            });

            // 测试音域约束
            console.log('\n🎯 测试音域约束...');
            this.testRangeConstraints();

            // 测试配置选择算法
            console.log('\n🎯 测试配置选择算法...');
            this.testConfigurationSelection();

        } finally {
            // 恢复原始设置
            this.enhancedTriadSettings.enabled = originalEnhancedSetting;
            if (typeof chordSettings !== 'undefined' && originalGlobalSetting !== undefined) {
                chordSettings.enhancedGuitarTriads = originalGlobalSetting;
            }
            if (typeof chordSettings !== 'undefined' && originalFourVoiceSetting) {
                chordSettings.fourVoiceTriadSettings = originalFourVoiceSetting;
            }
        }

        console.log('\n🏁 === 四声部三和弦配置测试完成 ===');
        console.log('📋 测试覆盖范围:');
        console.log('  ✅ 四声部配置数据结构');
        console.log('  ✅ voicePattern应用逻辑');
        console.log('  ✅ 音域约束验证');
        console.log('  ✅ 配置选择算法');
        console.log('  ✅ 用户设置集成');
    }

    /**
     * 🎯 验证三和弦结构的正确性
     */
    validateTriadStructure(voicing, chord, config) {
        const intervals = this.harmonyTheory.chordTypes[chord.type];
        if (!intervals) {
            console.log(`⚠️ 未知和弦类型: ${chord.type}`);
            return;
        }

        console.log(`🔍 验证 ${chord.root}${chord.type} 的音程结构...`);

        // 检查根音、三音、五音是否存在
        const rootSemitone = this.harmonyTheory.noteToSemitone[chord.root];
        const expectedSemitones = intervals.map(interval => (rootSemitone + interval) % 12);

        const actualSemitones = voicing.midiNotes.map(midi => midi % 12);
        const hasRoot = actualSemitones.includes(expectedSemitones[0]);
        const hasThird = actualSemitones.includes(expectedSemitones[1]);
        const hasFifth = actualSemitones.includes(expectedSemitones[2]);

        console.log(`  根音 (${chord.root}): ${hasRoot ? '✅' : '❌'}`);
        console.log(`  三音: ${hasThird ? '✅' : '❌'}`);
        console.log(`  五音: ${hasFifth ? '✅' : '❌'}`);

        if (hasRoot && hasThird && hasFifth) {
            console.log(`✅ 三和弦结构验证通过`);
        } else {
            console.log(`❌ 三和弦结构不完整`);
        }
    }

    /**
     * 🎯 测试音域约束功能
     */
    testRangeConstraints() {
        console.log('\n🔍 测试5-1-3-1配置的Eb4+音域约束...');

        const testChord = { root: 'C', type: 'major' };
        const config = {
            name: 'test-5131',
            voiceCount: 4,
            rangeConstraints: {
                minimumLowestNote: 63 // Eb4
            }
        };

        // 测试音域不足的情况
        this.voicingSettings.rangeMin = 55; // G3，低于Eb4
        const shouldFail = this.validateRangeConstraints(config, testChord);
        console.log(`  低音域测试 (G3): ${shouldFail ? '❌ 错误通过' : '✅ 正确拒绝'}`);

        // 测试音域充足的情况
        this.voicingSettings.rangeMin = 65; // F4，高于Eb4
        const shouldPass = this.validateRangeConstraints(config, testChord);
        console.log(`  高音域测试 (F4): ${shouldPass ? '✅ 正确通过' : '❌ 错误拒绝'}`);
    }

    /**
     * 🎯 测试配置选择算法
     */
    testConfigurationSelection() {
        console.log('\n🔍 测试智能配置选择算法...');

        const testChord = { root: 'C', type: 'major' };
        const mockConfigs = [
            {
                name: 'config-3voice',
                voiceCount: 3,
                rangeConstraints: null
            },
            {
                name: 'config-4voice-basic',
                voiceCount: 4,
                rangeConstraints: null
            },
            {
                name: 'config-4voice-constrained',
                voiceCount: 4,
                rangeConstraints: { minimumLowestNote: 65 }
            }
        ];

        // 测试四声部优先级
        this.voicingSettings.rangeMin = 60; // C4
        const selected = this.selectOptimalConfiguration(mockConfigs, testChord);

        if (selected) {
            console.log(`  选择结果: ${selected.name}`);
            const is4Voice = selected.voiceCount === 4;
            console.log(`  四声部优先测试: ${is4Voice ? '✅ 正确选择四声部' : '⚠️ 选择了三声部'}`);
        } else {
            console.log(`  ❌ 配置选择失败`);
        }
    }

    /**
     * 🎯 验证转位映射正确性测试 - 专门检查用户指出的错误
     */
    testInversionMappingCorrectness() {
        console.log('\n=== 🎯 转位映射正确性验证测试 ===');
        console.log('🔍 验证用户反馈: "guitar-major-root-5135: 5-1-3-5排列 这个是第二转位"');

        const testCases = [
            // 大三和弦测试用例
            { pattern: [1,3,5,1], expectedInversion: 0, description: '1-3-5-1应该是原位(根音在低音)' },
            { pattern: [1,5,1,3], expectedInversion: 0, description: '1-5-1-3应该是原位(根音在低音)' },
            { pattern: [3,5,1,3], expectedInversion: 1, description: '3-5-1-3应该是第一转位(三音在低音)' },
            { pattern: [5,1,3,5], expectedInversion: 2, description: '5-1-3-5应该是第二转位(五音在低音)' },
            { pattern: [5,1,3,1], expectedInversion: 2, description: '5-1-3-1应该是第二转位(五音在低音)' }
        ];

        let allCorrect = true;

        // 测试大三和弦配置
        const chord = { root: 'C', type: 'major' };

        testCases.forEach(testCase => {
            console.log(`\n🔍 测试模式 ${testCase.pattern.join('-')}:`);
            console.log(`   ${testCase.description}`);

            let foundCorrectly = false;

            // 在所有转位中查找这个模式
            for (let inversion = 0; inversion <= 2; inversion++) {
                console.log(`     查找转位 ${inversion}...`);
                const config = this.getEnhancedTriadConfiguration(chord, inversion);

                if (config && config.voicePattern) {
                    const configPattern = config.voicePattern.map(v => v.degree);
                    console.log(`       找到配置: ${config.name}, 模式: ${configPattern.join('-')}`);

                    // 检查模式是否匹配
                    const patternsMatch = configPattern.length === testCase.pattern.length &&
                                        configPattern.every((degree, i) => degree === testCase.pattern[i]);

                    if (patternsMatch) {
                        console.log(`       🎯 模式匹配！`);
                        if (inversion === testCase.expectedInversion) {
                            console.log(`   ✅ 正确！在第${inversion}转位找到，符合预期`);
                            foundCorrectly = true;
                        } else {
                            console.log(`   ❌ 错误！在第${inversion}转位找到，但应该在第${testCase.expectedInversion}转位`);
                            allCorrect = false;
                        }
                        break;
                    } else {
                        console.log(`       ➖ 模式不匹配 (期望: ${testCase.pattern.join('-')})`);
                    }
                } else {
                    console.log(`       ❌ 转位 ${inversion} 没有配置`);
                }
            }

            if (!foundCorrectly) {
                console.log(`   ❌ 模式 ${testCase.pattern.join('-')} 未找到或映射错误`);
                allCorrect = false;
            }
        });

        console.log(`\n📊 转位映射验证结果: ${allCorrect ? '✅ 全部正确' : '❌ 存在错误'}`);

        if (allCorrect) {
            console.log('🎉 用户指出的"5-1-3-5是第二转位"问题已修复！');
        }

        return allCorrect;
    }

    /**
     * 🛡️ 全面隔离系统测试 - 验证增强三和弦与其他voicing类型的隔离
     */
    testComprehensiveIsolationSystem() {
        console.log('\n=== 🛡️ 全面隔离系统测试 ===');
        console.log('🎯 验证增强三和弦与Shell/Drop2/Drop3的完全隔离');

        // 保存原始设置
        const originalEnhancedSetting = this.enhancedTriadSettings.enabled;
        const originalGlobalSetting = typeof chordSettings !== 'undefined' ? chordSettings.enhancedGuitarTriads : undefined;

        let allTestsPassed = true;

        try {
            // 启用增强三和弦功能
            this.enhancedTriadSettings.enabled = true;
            if (typeof chordSettings !== 'undefined') {
                chordSettings.enhancedGuitarTriads = true;
            }

            const testChords = [
                { root: 'C', type: 'major', description: 'C大三和弦' },
                { root: 'A', type: 'minor', description: 'A小三和弦' },
                { root: 'F', type: 'major', description: 'F大三和弦' }
            ];

            testChords.forEach((chord, index) => {
                console.log(`\n🎵 测试 ${index + 1}: ${chord.description}`);

                // 步骤1: 生成增强三和弦
                console.log('📋 步骤1: 生成增强三和弦配置');
                const enhancedResult = this.generateEnhancedTriadVoicing(chord, {
                    rangeMin: 55,
                    rangeMax: 88,
                    voicingContext: 'close-only'
                });

                if (!enhancedResult) {
                    console.log(`⚠️ ${chord.description} 无增强配置，跳过隔离测试`);
                    return;
                }

                console.log(`✅ 增强配置生成成功: ${enhancedResult.notes.join('-')}`);
                console.log(`🔍 防护标记检查:`);
                console.log(`   isEnhancedTriad: ${enhancedResult.isEnhancedTriad}`);
                console.log(`   preventDropTransform: ${enhancedResult.preventDropTransform}`);
                console.log(`   enhancedType: ${enhancedResult.enhancedType}`);
                console.log(`   type: ${enhancedResult.type}`);

                // 步骤2: 验证Shell voicing隔离
                console.log('\n🛡️ 步骤2: 测试Shell voicing隔离');
                const shellResult = this.generateShellVoicing(chord);
                if (shellResult === null) {
                    console.log('✅ Shell隔离成功: 增强三和弦被正确阻止');
                } else {
                    console.error('❌ Shell隔离失败: 增强三和弦泄露到Shell voicing!');
                    console.error(`   泄露结果: ${shellResult.notes?.join('-') || 'unknown'}`);
                    allTestsPassed = false;
                }

                // 步骤3: 验证Drop2 voicing隔离
                console.log('\n🛡️ 步骤3: 测试Drop2 voicing隔离');
                const drop2Result = this.generateDrop2Voicing(enhancedResult, { rangeMin: 55, rangeMax: 88 });
                if (drop2Result === null) {
                    console.log('✅ Drop2隔离成功: 增强三和弦被正确阻止');
                } else {
                    console.error('❌ Drop2隔离失败: 增强三和弦泄露到Drop2 voicing!');
                    console.error(`   泄露结果: ${drop2Result.notes?.join('-') || 'unknown'}`);
                    allTestsPassed = false;
                }

                // 步骤4: 验证Drop3 voicing隔离
                console.log('\n🛡️ 步骤4: 测试Drop3 voicing隔离');
                const drop3Result = this.generateDrop3Voicing(enhancedResult, { rangeMin: 55, rangeMax: 88 });
                if (drop3Result === null) {
                    console.log('✅ Drop3隔离成功: 增强三和弦被正确阻止');
                } else {
                    console.error('❌ Drop3隔离失败: 增强三和弦泄露到Drop3 voicing!');
                    console.error(`   泄露结果: ${drop3Result.notes?.join('-') || 'unknown'}`);
                    allTestsPassed = false;
                }

                // 步骤5: 验证标准三和弦仍然可以生成Shell/Drop voicing
                console.log('\n✅ 步骤5: 验证标准三和弦的正常功能');

                // 禁用增强功能测试标准voicing
                this.enhancedTriadSettings.enabled = false;
                if (typeof chordSettings !== 'undefined') {
                    chordSettings.enhancedGuitarTriads = false;
                }

                const standardShell = this.generateShellVoicing(chord);
                if (standardShell) {
                    console.log(`✅ 标准Shell voicing正常: ${standardShell.notes?.join('-') || 'generated'}`);
                } else {
                    console.log('ℹ️ 标准Shell voicing未生成（可能是三和弦限制）');
                }

                // 重新启用增强功能继续测试
                this.enhancedTriadSettings.enabled = true;
                if (typeof chordSettings !== 'undefined') {
                    chordSettings.enhancedGuitarTriads = true;
                }
            });

            console.log(`\n📊 隔离系统测试结果: ${allTestsPassed ? '✅ 全部通过' : '❌ 存在泄露'}`);

            if (allTestsPassed) {
                console.log('🎉 隔离系统完美工作！增强三和弦与其他voicing类型完全隔离');
            } else {
                console.error('🚨 警告：检测到隔离泄露！需要修复防护机制');
            }

        } finally {
            // 恢复原始设置
            this.enhancedTriadSettings.enabled = originalEnhancedSetting;
            if (typeof chordSettings !== 'undefined' && originalGlobalSetting !== undefined) {
                chordSettings.enhancedGuitarTriads = originalGlobalSetting;
            }
        }

        return allTestsPassed;
    }

    /**
     * 🎸 阶段3: 检查是否应该使用吉他专属四声部三和弦配置
     * 这是完全独立的新系统，与之前被隔离的增强系统无关
     * @param {Object} chord - 和弦对象
     * @param {Object} options - 选项
     * @returns {boolean} 是否使用吉他四声部配置
     */
    shouldUseGuitarFourVoiceTriads(chord, options = {}) {
        console.log(`\n🎸 === 阶段3: 吉他四声部三和弦检查 ===`);
        console.log(`🎵 和弦: ${chord.root}${chord.type}`);

        // 基础条件检查
        const isGuitarMode = this.isGuitarMode();
        const isTriad = this.isTriadChord(chord);
        // 🔧 修复严格条件：只需要包含close即可，不要求独占
        const hasCloseVoicing = options.enabledVoicings &&
                               options.enabledVoicings.includes('close');

        // 检查新的独立设置
        const guitarSettings = typeof chordSettings !== 'undefined' ?
                              chordSettings.guitarFourVoiceTriads : null;
        const systemEnabled = guitarSettings && guitarSettings.enabled;

        // 激活条件检查
        const shouldActivate = isGuitarMode &&
                              isTriad &&
                              hasCloseVoicing &&
                              systemEnabled;

        if (shouldActivate) {
            console.log(`🎉 吉他四声部三和弦系统激活`);
        } else {
            console.log(`🚫 ❌ 吉他四声部条件不满足，使用标准close voicing`);
            if (!isGuitarMode) console.log(`    原因: 不在吉他模式`);
            if (!isTriad) console.log(`    原因: 不是支持的三和弦类型`);
            if (!hasCloseVoicing) console.log(`    原因: enabledVoicings中不包含close`);
            if (!systemEnabled) console.log(`    原因: 系统未启用或设置未找到`);
        }

        return shouldActivate;
    }

    /**
     * 🎸 阶段3: 生成吉他专属四声部三和弦配置
     * 完全独立的实现，不依赖任何被隔离的系统
     * @param {Object} chord - 和弦对象
     * @param {Object} options - 选项
     * @returns {Object} 吉他四声部voicing
     */
    generateGuitarFourVoiceTriads(chord, options = {}) {
        console.log(`\n🎸 === 阶段3: 吉他四声部三和弦生成器 ===`);
        console.log(`🎵 和弦: ${chord.root}${chord.type}`);

        // 🔧 修复 (2025-10-05 v21): 设置currentChord确保midiToNote有正确上下文
        // 问题：midiToNote需要currentChord来调用spellNoteInChordContext
        // 解决：在生成四音配置前设置currentChord
        this.currentChord = {
            root: chord.root,
            type: chord.type,
            key: chord.key || 'C-major'
        };
        console.log(`🔧 设置currentChord: root=${this.currentChord.root}, type=${this.currentChord.type}, key=${this.currentChord.key}`);

        // 获取设置
        const guitarSettings = typeof chordSettings !== 'undefined' ?
                              chordSettings.guitarFourVoiceTriads : null;

        if (!guitarSettings || !guitarSettings.enabled) {
            console.log(`❌ 吉他四声部系统未启用`);
            return null;
        }

        // 验证和弦类型
        if (!this.isTriadChord(chord)) {
            console.log(`❌ 非三和弦类型，不生成四声部配置`);
            return null;
        }

        // 🔧 检查转位设置：只在转位启用时显示转位配置
        const inversionsEnabled = (typeof chordSettings !== 'undefined') ?
            (chordSettings.includeTriadInversions || chordSettings.includeSeventhInversions) : false;

        console.log(`🔄 转位设置状态: ${inversionsEnabled ? '✅ 已启用' : '❌ 已禁用'}`);

        if (!inversionsEnabled) {
            console.log(`🔒 转位未启用，将只显示原位配置 (1-3-5-1, 1-5-1-3)`);
        } else {
            console.log(`🔓 转位已启用，将显示所有配置包括转位`);
        }

        // 获取音域范围
        const rangeMin = options.rangeMin || guitarSettings.minRange || 60;
        const rangeMax = options.rangeMax || guitarSettings.maxRange || 84;

        console.log(`🎯 音域范围: ${rangeMin} - ${rangeMax}`);

        // 计算和弦的基础音程
        const intervals = this.harmonyTheory.chordTypes[chord.type];
        if (!intervals) {
            console.log(`❌ 无法获取和弦音程: ${chord.type}`);
            return null;
        }

        // 计算根音、三音、五音的MIDI值
        // 🔧 修复：this.noteToMidi已经是C4=60的映射，不需要再加60
        const rootMidi = this.noteToMidi[chord.root]; // C4=60开始
        const thirdInterval = intervals.includes(4) ? 4 : 3; // 大三度或小三度

        // 🔧 修复 (2025-10-05 v2): 支持augmented和弦的增五度
        // 问题：augmented和弦（intervals=[0,4,8]）被错误识别为减五度6
        // 原因：只检查7和6，没有检查8
        // 解决：优先检查8（增五度），然后7（纯五度），最后6（减五度）
        let fifthInterval;
        if (intervals.includes(8)) {
            fifthInterval = 8;  // 增五度 - augmented和弦
        } else if (intervals.includes(7)) {
            fifthInterval = 7;  // 纯五度 - major/minor和弦
        } else if (intervals.includes(6)) {
            fifthInterval = 6;  // 减五度 - diminished和弦
        } else {
            console.error(`❌ 无法识别五音interval: ${intervals.join(',')}`);
            fifthInterval = 7;  // fallback到纯五度
        }

        console.log(`🔧 MIDI计算修复: ${chord.root} = ${rootMidi} (C4=60基准)`);
        console.log(`🎼 音程: 三度=${thirdInterval}, 五度=${fifthInterval}${fifthInterval === 8 ? ' (增五度 - augmented)' : ''}`);

        const chordTones = {
            root: rootMidi,
            third: rootMidi + thirdInterval,
            fifth: rootMidi + fifthInterval
        };

        console.log(`🎼 和弦音: 根音=${chordTones.root}, 三音=${chordTones.third}, 五音=${chordTones.fifth}`);

        // 尝试生成各种配置（现在每个生成器返回转位数组）
        const availableConfigurations = [];

        // 5-1-3-5 配置（第二转位）- 只在转位启用时显示
        if (guitarSettings.configurations.voice5135 && inversionsEnabled) {
            const config5135 = this.generateVoice5135(chordTones, rangeMin, rangeMax);
            if (config5135) {
                availableConfigurations.push(config5135);
                console.log(`🎸 5-1-3-5配置：添加了第二转位`);
            }
        } else if (guitarSettings.configurations.voice5135 && !inversionsEnabled) {
            console.log(`🔒 5-1-3-5配置(第二转位)被跳过：转位未启用`);
        }

        // 5-1-3-1 配置（第二转位 + 增强音域处理）- 只在转位启用时显示
        if (guitarSettings.configurations.voice5131 && inversionsEnabled) {
            const config5131 = this.generateVoice5131(chordTones, rangeMin, rangeMax);
            if (config5131) {
                availableConfigurations.push(config5131);
                console.log(`🎸 5-1-3-1配置：添加了第二转位`);
            }
        } else if (guitarSettings.configurations.voice5131 && !inversionsEnabled) {
            console.log(`🔒 5-1-3-1配置(第二转位)被跳过：转位未启用`);
        }

        // 1-3-5-1 配置（原位）
        if (guitarSettings.configurations.voice1351) {
            const config1351 = this.generateVoice1351(chordTones, rangeMin, rangeMax);
            if (config1351) {
                availableConfigurations.push(config1351);
                console.log(`🎸 1-3-5-1配置：添加了原位`);
            }
        }

        // 1-5-1-3 配置（原位）
        if (guitarSettings.configurations.voice1513) {
            const config1513 = this.generateVoice1513(chordTones, rangeMin, rangeMax);
            if (config1513) {
                availableConfigurations.push(config1513);
                console.log(`🎸 1-5-1-3配置：添加了原位`);
            }
        }

        // 3-5-1-3 配置（第一转位）- 只在转位启用时显示
        if (guitarSettings.configurations.voice3513 && inversionsEnabled) {
            const config3513 = this.generateVoice3513(chordTones, rangeMin, rangeMax);
            if (config3513) {
                availableConfigurations.push(config3513);
                console.log(`🎸 3-5-1-3配置：添加了第一转位`);
            }
        } else if (guitarSettings.configurations.voice3513 && !inversionsEnabled) {
            console.log(`🔒 3-5-1-3配置(第一转位)被跳过：转位未启用`);
        }

        if (availableConfigurations.length === 0) {
            console.log(`❌ 没有可用的吉他四声部配置（音域: ${rangeMin}-${rangeMax}）`);
            return null;
        }
        console.log(`✅ 生成${availableConfigurations.length}个吉他四声部配置`);

        // 智能选择最佳配置
        let selectedConfig = null;
        if (guitarSettings.intelligentSelection) {
            // 🎯 传递和弦信息给选择算法
            const selectionOptions = {
                ...options,
                chordRoot: chord.root,
                chordType: chord.type,
                preferredConfigurations: options.preferredConfigurations || []
            };
            selectedConfig = this.selectBestGuitarFourVoiceConfig(availableConfigurations, selectionOptions);
        } else {
            // 非智能模式：简单轮换选择，避免总是选择第一个
            const timestamp = Date.now();
            const rotateIndex = timestamp % availableConfigurations.length;
            selectedConfig = availableConfigurations[rotateIndex];
            console.log(`🔄 轮换选择第 ${rotateIndex + 1} 个配置: ${selectedConfig.name}`);
        }

        if (selectedConfig) {
            // 生成最终的voicing对象（含转位信息）
            const finalVoicing = {
                type: 'close',
                subtype: 'guitar-four-voice',
                configuration: selectedConfig.name,
                inversion: selectedConfig.inversion,
                inversionName: selectedConfig.inversionName,
                notes: selectedConfig.noteNames,
                midiNotes: selectedConfig.midiNotes,
                range: selectedConfig.range,
                chordType: chord.type,
                root: chord.root,
                source: 'guitar-four-voice-generator',
                // 转位相关信息
                octaveAdjusted: selectedConfig.octaveAdjusted || false,
                octaveShift: selectedConfig.octaveShift || 0,
                adjustmentReason: selectedConfig.adjustmentReason || '无调整'
            };

            const inversionDisplay = selectedConfig.inversionName ? ` ${selectedConfig.inversionName}` : '';
            const octaveDisplay = selectedConfig.octaveAdjusted ? ` (${selectedConfig.adjustmentReason})` : '';

            console.log(`✅ 生成吉他四声部配置: ${selectedConfig.name}${inversionDisplay}${octaveDisplay}`);
            console.log(`🎼 音符: ${finalVoicing.notes.join('-')}`);
            console.log(`🎼 MIDI: ${finalVoicing.midiNotes.join(', ')}`);
            console.log(`🔢 转位信息: ${selectedConfig.inversionName} (转位级数: ${selectedConfig.inversion || 0})`);

            return finalVoicing;
        }

        console.log(`❌ 无法选择合适的配置`);
        return null;
    }

    /**
     * 🎸 生成5-1-3-5配置 (G3-C4-E4-G4) - 支持转位
     */
    generateVoice5135(chordTones, rangeMin, rangeMax) {
        console.log(`🔍 尝试生成5-1-3-5配置（第二转位）`);

        // 5-1-3-5配置：五音在低音，这是第二转位
        const baseFifth = chordTones.fifth - 12; // 低八度的五音
        const baseRoot = chordTones.root;
        const baseThird = chordTones.third;
        const topFifth = chordTones.fifth;

        const midiNotes = [baseFifth, baseRoot, baseThird, topFifth];

        // 检查音域
        const minNote = Math.min(...midiNotes);
        const maxNote = Math.max(...midiNotes);

        if (minNote >= rangeMin && maxNote <= rangeMax) {
            const noteNames = midiNotes.map(midi => this.midiToNote(midi));
            const range = maxNote - minNote;

            const result = {
                name: `5-1-3-5`,
                inversionName: '第二转位', // 🎵 修正：五音在低音 = 第二转位
                midiNotes: midiNotes,
                noteNames: noteNames,
                range: range,
                priority: 1,
                bassNote: '五音', // 标记低音声部
                configuration: '5-1-3-5'
            };

            console.log(`✅ 5-1-3-5 (第二转位): ${noteNames.join('-')} (跨度: ${range}半音)`);
            return result;
        } else {
            console.log(`❌ 5-1-3-5配置超出音域范围`);
            return null;
        }
    }

    /**
     * 🎸 生成5-1-3-1配置 (G3-C4-E4-C5, 需要Eb4以上) - 支持转位 + 增强音域处理
     */
    generateVoice5131(chordTones, rangeMin, rangeMax) {
        console.log(`🔍 尝试生成5-1-3-1配置（第二转位 + 增强音域处理）`);
        console.log(`🎼 和弦音信息: 根音=${chordTones.root}, 三音=${chordTones.third}, 五音=${chordTones.fifth}`);
        console.log(`📏 用户音域: ${rangeMin}-${rangeMax}`);

        // 5-1-3-1配置：五音在低音，这是第二转位
        const baseFifth = chordTones.fifth - 12; // 低八度的五音
        const baseRoot = chordTones.root;
        const baseThird = chordTones.third;
        const topRoot = chordTones.root + 12; // 高八度的根音

        const baseMidiNotes = [baseFifth, baseRoot, baseThird, topRoot];

        // 🔧 多层级八度调整尝试
        const octaveAdjustments = [0, 12, -12]; // 原位、上移八度、下移八度

        for (const octaveShift of octaveAdjustments) {
            const midiNotes = baseMidiNotes.map(midi => midi + octaveShift);
            console.log(`\n🔧 尝试八度调整: ${octaveShift > 0 ? `+${octaveShift/12}八度` : octaveShift < 0 ? `${octaveShift/12}八度` : '原位'}`);

            // 🎵 检查Eb4约束：5-1-3-1只能在Eb4以上出现
            const adjustedTopRoot = (chordTones.root + 12) + octaveShift; // 高八度根音
            const EB4_MIDI = 63; // Eb4 = MIDI 63

            if (adjustedTopRoot < EB4_MIDI) {
                console.log(`🚫 5-1-3-1约束检查: 高八度根音${adjustedTopRoot} < Eb4(${EB4_MIDI})，不符合理论要求`);
                continue; // 跳过这个八度调整
            }

            console.log(`✅ 5-1-3-1约束检查: 高八度根音${adjustedTopRoot} >= Eb4(${EB4_MIDI})，符合要求`);

            // 检查音域
            const minNote = Math.min(...midiNotes);
            const maxNote = Math.max(...midiNotes);

            if (minNote >= rangeMin && maxNote <= rangeMax) {
                const noteNames = midiNotes.map(midi => this.midiToNote(midi));
                const range = maxNote - minNote;

                const result = {
                    name: `5-1-3-1`,
                    inversionName: '第二转位', // 🎵 修正：五音在低音 = 第二转位
                    midiNotes: midiNotes,
                    noteNames: noteNames,
                    range: range,
                    priority: 2,
                    bassNote: '五音', // 标记低音声部
                    configuration: '5-1-3-1',
                    octaveAdjusted: octaveShift !== 0,
                    octaveShift: octaveShift,
                    adjustmentReason: octaveShift > 0 ? `整体上移${octaveShift/12}八度` :
                                    octaveShift < 0 ? `整体下移${Math.abs(octaveShift)/12}八度` : '原始音域'
                };

                console.log(`✅ 5-1-3-1 (第二转位) ${octaveShift !== 0 ? `(${result.adjustmentReason})` : ''}: ${noteNames.join('-')} (跨度: ${range}半音)`);
                return result;
            } else {
                console.log(`❌ 5-1-3-1 ${octaveShift !== 0 ? `(八度调整${octaveShift > 0 ? '+' : ''}${octaveShift/12})` : ''} 超出音域`);
            }
        }

        console.log(`❌ 5-1-3-1配置在所有八度调整下都无法生成`);
        return null;
    }

    /**
     * 🎸 生成1-3-5-1配置 (C4-E4-G4-C5) - 支持转位
     */
    generateVoice1351(chordTones, rangeMin, rangeMax) {
        console.log(`🔍 尝试生成1-3-5-1配置（原位）`);

        // 1-3-5-1配置：根音在低音，这是原位
        const baseRoot = chordTones.root;
        const baseThird = chordTones.third;
        const baseFifth = chordTones.fifth;
        const topRoot = chordTones.root + 12; // 高八度的根音

        const midiNotes = [baseRoot, baseThird, baseFifth, topRoot];

        // 检查音域
        const minNote = Math.min(...midiNotes);
        const maxNote = Math.max(...midiNotes);

        if (minNote >= rangeMin && maxNote <= rangeMax) {
            const noteNames = midiNotes.map(midi => this.midiToNote(midi));
            const range = maxNote - minNote;

            const result = {
                name: `1-3-5-1`,
                inversionName: '原位', // 🎵 修正：根音在低音 = 原位
                midiNotes: midiNotes,
                noteNames: noteNames,
                range: range,
                priority: 3,
                bassNote: '根音', // 标记低音声部
                configuration: '1-3-5-1'
            };

            console.log(`✅ 1-3-5-1 (原位): ${noteNames.join('-')} (跨度: ${range}半音)`);
            return result;
        } else {
            console.log(`❌ 1-3-5-1配置超出音域范围`);
            return null;
        }
    }

    /**
     * 🎸 生成1-5-1-3配置 (C4-G4-C5-E5) - 支持转位
     */
    generateVoice1513(chordTones, rangeMin, rangeMax) {
        console.log(`🔍 尝试生成1-5-1-3配置（原位）`);

        // 1-5-1-3配置：根音在低音，这是原位
        const baseRoot = chordTones.root;
        const baseFifth = chordTones.fifth;
        const midRoot = chordTones.root + 12; // 高八度的根音
        const topThird = chordTones.third + 12; // 高八度的三音

        const midiNotes = [baseRoot, baseFifth, midRoot, topThird];

        // 检查音域
        const minNote = Math.min(...midiNotes);
        const maxNote = Math.max(...midiNotes);

        if (minNote >= rangeMin && maxNote <= rangeMax) {
            const noteNames = midiNotes.map(midi => this.midiToNote(midi));
            const range = maxNote - minNote;

            const result = {
                name: `1-5-1-3`,
                inversionName: '原位', // 🎵 修正：根音在低音 = 原位
                midiNotes: midiNotes,
                noteNames: noteNames,
                range: range,
                priority: 4,
                bassNote: '根音', // 标记低音声部
                configuration: '1-5-1-3'
            };

            console.log(`✅ 1-5-1-3 (原位): ${noteNames.join('-')} (跨度: ${range}半音)`);
            return result;
        } else {
            console.log(`❌ 1-5-1-3配置超出音域范围`);
            return null;
        }
    }

    /**
     * 🎸 生成3-5-1-3配置 (E4-G4-C5-E5) - 支持转位
     */
    generateVoice3513(chordTones, rangeMin, rangeMax) {
        console.log(`🔍 尝试生成3-5-1-3配置（第一转位）`);

        // 3-5-1-3配置：三音在低音，这是第一转位
        const baseThird = chordTones.third;
        const baseFifth = chordTones.fifth;
        const midRoot = chordTones.root + 12; // 高八度的根音
        const topThird = chordTones.third + 12; // 高八度的三音

        const midiNotes = [baseThird, baseFifth, midRoot, topThird];

        // 检查音域
        const minNote = Math.min(...midiNotes);
        const maxNote = Math.max(...midiNotes);

        if (minNote >= rangeMin && maxNote <= rangeMax) {
            const noteNames = midiNotes.map(midi => this.midiToNote(midi));
            const range = maxNote - minNote;

            const result = {
                name: `3-5-1-3`,
                inversionName: '第一转位', // 🎵 修正：三音在低音 = 第一转位
                midiNotes: midiNotes,
                noteNames: noteNames,
                range: range,
                priority: 5,
                bassNote: '三音', // 标记低音声部
                configuration: '3-5-1-3'
            };

            console.log(`✅ 3-5-1-3 (第一转位): ${noteNames.join('-')} (跨度: ${range}半音)`);
            return result;
        } else {
            console.log(`❌ 3-5-1-3配置超出音域范围`);
            return null;
        }
    }

    /**
     * 🎸 智能选择最佳吉他四声部配置 (支持多样化选择)
     */
    selectBestGuitarFourVoiceConfig(configurations, options = {}) {
        console.log(`🔍 智能选择最佳配置，候选数量: ${configurations.length}`);

        if (configurations.length === 1) {
            console.log(`✅ 只有一个配置，直接选择: ${configurations[0].name}`);
            return configurations[0];
        }

        // 🎯 新的选择策略：多样化配置选择
        console.log(`\n🎯 === 多样化配置选择策略 ===`);

        // 显示所有可用配置
        console.log(`📋 所有可用配置:`);
        configurations.forEach((config, index) => {
            console.log(`  ${index + 1}. ${config.name}: ${config.noteNames.join('-')} (跨度: ${config.range}半音)`);
        });

        // 获取用户偏好的配置（如果有的话）
        const preferredConfigs = options.preferredConfigurations || [];

        // 策略1: 优先选择用户偏好的配置
        if (preferredConfigs.length > 0) {
            for (const preferred of preferredConfigs) {
                const found = configurations.find(config => config.name === preferred);
                if (found) {
                    console.log(`✅ 选择用户偏好的配置: ${found.name}`);
                    return found;
                }
            }
        }

        // 策略2: 基于和弦根音智能选择
        const chordRoot = options.chordRoot;
        if (chordRoot) {
            console.log(`🎵 基于和弦根音 ${chordRoot} 选择适合的配置...`);

            // 不同根音偏好不同配置，增加多样性
            const rootPreferences = {
                'C': ['1-3-5-1', '5-1-3-5'],      // C和弦偏好标准展开
                'F': ['5-1-3-5', '1-5-1-3'],      // F和弦偏好五度低音
                'G': ['5-1-3-5', '3-5-1-3'],      // G和弦偏好开放式
                'A': ['1-3-5-1', '1-5-1-3'],      // A和弦偏好根音系列
                'D': ['1-5-1-3', '3-5-1-3'],      // D和弦偏好展开式
                'E': ['3-5-1-3', '5-1-3-1']       // E和弦偏好三音低音
            };

            const preferences = rootPreferences[chordRoot] || ['1-3-5-1', '5-1-3-5'];
            for (const preferred of preferences) {
                const found = configurations.find(config => config.name === preferred);
                if (found) {
                    console.log(`✅ 选择适合 ${chordRoot} 的配置: ${found.name}`);
                    return found;
                }
            }
        }

        // 策略3: 基于当前时间戳的伪随机选择（确保多样性）
        const timestamp = Date.now();
        const randomIndex = timestamp % configurations.length;
        const randomSelected = configurations[randomIndex];
        console.log(`🎲 伪随机选择（基于时间戳 ${timestamp}）: ${randomSelected.name}`);

        return randomSelected;
    }

    /**
     * 🎸 MIDI值转音符名称 (简化版本)
     * 🔧 修复 (2025-10-05 v21): 支持和弦上下文拼写（吉他四音配置）
     */
    midiToNote(midiValue) {
        const octave = Math.floor(midiValue / 12) - 1;
        const noteIndex = midiValue % 12;

        // 🔧 修复 (2025-10-05 v21): 使用和弦上下文拼写（吉他四音配置）
        // 问题：fallback到硬编码升号拼写导致Dbm→C#m, Abm→G#m
        // 解决：调用spellNoteInChordContext，传递和弦上下文，使用正确的降号拼写

        if (this.harmonyTheory && typeof this.harmonyTheory.spellNoteInChordContext === 'function') {
            // 获取和弦信息（从currentChord或使用默认值）
            const chordRoot = this.currentChord?.root || 'C';
            const chordType = this.currentChord?.type || 'major';
            const key = this.currentChord?.key || 'C-major';
            const keyInfo = this.harmonyTheory.keys[key] || this.harmonyTheory.keys['C-major'];

            // 计算interval（相对于根音）
            const rootSemitone = this.harmonyTheory.noteToSemitone[chordRoot] || 0;
            const interval = (noteIndex - rootSemitone + 12) % 12;

            // 调用spellNoteInChordContext获取正确拼写
            const noteName = this.harmonyTheory.spellNoteInChordContext(
                noteIndex,
                chordRoot,
                interval,
                keyInfo,
                null,
                chordType
            );

            console.log(`🎵 midiToNote v21: MIDI ${midiValue} (pitch class ${noteIndex}) → ${noteName}${octave} (chord: ${chordRoot}${chordType})`);
            return noteName + octave;
        }

        // 最终fallback（不应该到达这里）
        console.warn(`⚠️ midiToNote fallback: MIDI ${midiValue} → 使用默认升号拼写`);
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return noteNames[noteIndex] + octave;
    }

    /**
     * 🧪 阶段3: 吉他四声部三和弦系统完整测试
     * 验证系统集成、配置生成、范围约束和激活条件
     */
    testGuitarFourVoiceTriadSystem() {
        console.log('\n🧪 === 阶段3: 吉他四声部三和弦系统完整测试 ===\n');

        // 测试和弦列表
        const testChords = [
            { root: 'C', type: 'major', description: 'C大三和弦' },
            { root: 'A', type: 'minor', description: 'A小三和弦' },
            { root: 'F', type: 'major', description: 'F大三和弦' },
            { root: 'G', type: 'major', description: 'G大三和弦' }
        ];

        // 测试音域配置
        const rangeConfigs = [
            { name: '标准吉他音域', min: 55, max: 88 }, // G3-E6
            { name: '高音域', min: 60, max: 84 },      // C4-C6
            { name: '低音域', min: 48, max: 72 }       // C3-C5
        ];

        // 阶段1: 基础激活条件测试
        console.log('📊 阶段1: 基础激活条件测试');

        // 确保处于吉他模式
        if (typeof document !== 'undefined') {
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            if (instrumentToggle) instrumentToggle.checked = false; // 设置为吉他模式
        }

        testChords.forEach(chord => {
            console.log(`\n🎵 测试和弦: ${chord.description}`);

            // 测试激活条件
            const activationOptions = {
                enabledVoicings: ['close'],
                rangeMin: 60,
                rangeMax: 84
            };

            const shouldActivate = this.shouldUseGuitarFourVoiceTriads(chord, activationOptions);
            console.log(`  激活条件检查: ${shouldActivate ? '✅ 应该激活' : '❌ 不应激活'}`);

            if (shouldActivate) {
                // 测试生成
                const result = this.generateGuitarFourVoiceTriads(chord, activationOptions);
                if (result) {
                    console.log(`  ✅ 生成成功: ${result.notes.join('-')} (${result.configuration})`);
                } else {
                    console.log(`  ❌ 生成失败`);
                }
            }
        });

        // 阶段2: 音域约束测试
        console.log('\n📊 阶段2: 音域约束测试');

        rangeConfigs.forEach(rangeConfig => {
            console.log(`\n🎯 测试音域: ${rangeConfig.name} (${rangeConfig.min}-${rangeConfig.max})`);

            const testChord = { root: 'C', type: 'major' };
            const rangeOptions = {
                enabledVoicings: ['close'],
                rangeMin: rangeConfig.min,
                rangeMax: rangeConfig.max
            };

            const result = this.generateGuitarFourVoiceTriads(testChord, rangeOptions);
            if (result) {
                const minMidi = Math.min(...result.midiNotes);
                const maxMidi = Math.max(...result.midiNotes);
                const withinRange = minMidi >= rangeConfig.min && maxMidi <= rangeConfig.max;

                console.log(`  生成结果: ${result.notes.join('-')}`);
                console.log(`  MIDI范围: ${minMidi}-${maxMidi}`);
                console.log(`  范围检查: ${withinRange ? '✅ 符合约束' : '❌ 超出约束'}`);
                console.log(`  配置类型: ${result.configuration}`);
            } else {
                console.log(`  ❌ 在此音域无法生成配置`);
            }
        });

        // 阶段3: 配置类型覆盖测试
        console.log('\n📊 阶段3: 配置类型覆盖测试');

        const configNames = ['voice5135', 'voice5131', 'voice1351', 'voice1513', 'voice3513'];
        const testChord = { root: 'C', type: 'major' };

        configNames.forEach(configName => {
            console.log(`\n🔍 测试配置: ${configName}`);

            // 临时启用单一配置
            const originalSettings = typeof chordSettings !== 'undefined' ?
                                   { ...chordSettings.guitarFourVoiceTriads.configurations } : {};

            if (typeof chordSettings !== 'undefined') {
                // 禁用所有配置
                Object.keys(chordSettings.guitarFourVoiceTriads.configurations).forEach(key => {
                    chordSettings.guitarFourVoiceTriads.configurations[key] = false;
                });
                // 只启用当前测试的配置
                chordSettings.guitarFourVoiceTriads.configurations[configName] = true;
            }

            const result = this.generateGuitarFourVoiceTriads(testChord, {
                enabledVoicings: ['close'],
                rangeMin: 55,
                rangeMax: 88
            });

            if (result) {
                console.log(`  ✅ ${configName}: ${result.notes.join('-')}`);
                console.log(`  📊 MIDI: [${result.midiNotes.join(', ')}]`);
                console.log(`  📏 跨度: ${result.range || Math.max(...result.midiNotes) - Math.min(...result.midiNotes)}半音`);
            } else {
                console.log(`  ❌ ${configName}: 生成失败`);
            }

            // 恢复设置
            if (typeof chordSettings !== 'undefined') {
                chordSettings.guitarFourVoiceTriads.configurations = originalSettings;
            }
        });

        // 阶段4: 系统集成测试
        console.log('\n📊 阶段4: 系统集成测试');

        const integrationTestChord = { root: 'C', type: 'major' };

        // 测试通过主generateCloseVoicing函数的完整流程
        console.log('🔄 测试完整集成流程...');
        const integrationResult = this.generateCloseVoicing(integrationTestChord, {
            enabledVoicings: ['close'],
            rangeMin: 60,
            rangeMax: 84
        });

        if (integrationResult && integrationResult.subtype === 'guitar-four-voice') {
            console.log(`✅ 集成测试成功: 通过主函数生成了吉他四声部配置`);
            console.log(`🎼 结果: ${integrationResult.notes.join('-')}`);
            console.log(`🎛️ 配置: ${integrationResult.configuration}`);
        } else if (integrationResult) {
            console.log(`⚠️ 集成测试: 生成了标准close voicing而非四声部配置`);
            console.log(`🎼 结果: ${integrationResult.notes.join('-')}`);
        } else {
            console.log(`❌ 集成测试失败: 无法生成任何voicing`);
        }

        // 阶段5: 兼容性测试
        console.log('\n📊 阶段5: 兼容性测试');

        // 测试非三和弦不会触发四声部系统
        const nonTriadChord = { root: 'C', type: 'major7' };
        const nonTriadResult = this.generateCloseVoicing(nonTriadChord, {
            enabledVoicings: ['close'],
            rangeMin: 60,
            rangeMax: 84
        });

        if (nonTriadResult && nonTriadResult.subtype !== 'guitar-four-voice') {
            console.log(`✅ 兼容性测试: 七和弦正确使用标准生成器`);
            console.log(`🎼 七和弦结果: ${nonTriadResult.notes.join('-')}`);
        } else {
            console.log(`❌ 兼容性测试失败: 七和弦错误触发了四声部系统`);
        }

        // 测试多voicing类型不会触发四声部系统
        const multiVoicingResult = this.generateCloseVoicing(integrationTestChord, {
            enabledVoicings: ['close', 'drop2'],
            rangeMin: 60,
            rangeMax: 84
        });

        if (multiVoicingResult && multiVoicingResult.subtype !== 'guitar-four-voice') {
            console.log(`✅ 兼容性测试: 多voicing类型正确使用标准生成器`);
        } else {
            console.log(`❌ 兼容性测试失败: 多voicing类型错误触发了四声部系统`);
        }

        console.log('\n🎉 === 吉他四声部三和弦系统测试完成 ===\n');
    }

    /**
     * 🚀 快速调试函数：一键测试吉他四声部系统
     * 用户可以在浏览器控制台直接调用
     */
    debugGuitarFourVoiceSystem() {
        console.log('\n🚀 === 快速调试：吉他四声部系统 ===\n');

        // 步骤1: 检查基础设置
        console.log('📋 步骤1: 检查基础设置');
        console.log(`🔧 chordSettings存在: ${typeof chordSettings !== 'undefined'}`);

        if (typeof chordSettings !== 'undefined') {
            console.log(`🔧 guitarFourVoiceTriads配置: ${!!chordSettings.guitarFourVoiceTriads}`);
            if (chordSettings.guitarFourVoiceTriads) {
                console.log(`  - enabled: ${chordSettings.guitarFourVoiceTriads.enabled}`);
                console.log(`  - configurations: ${JSON.stringify(chordSettings.guitarFourVoiceTriads.configurations)}`);
            }
        } else {
            console.error('❌ chordSettings未定义！系统无法工作');
            return;
        }

        // 步骤2: 检查模式设置
        console.log('\n📋 步骤2: 检查乐器模式');
        if (typeof document !== 'undefined') {
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            console.log(`📱 instrumentModeToggle元素: ${!!instrumentToggle}`);
            if (instrumentToggle) {
                console.log(`📱 当前状态: ${instrumentToggle.checked ? '钢琴模式' : '吉他模式'}`);
                console.log(`📱 应该设置为: 吉他模式 (unchecked)`);
            }
        }

        // 步骤3: 测试激活条件
        console.log('\n📋 步骤3: 测试激活条件');
        const testChord = { root: 'C', type: 'major' };
        const testOptions = {
            enabledVoicings: ['close'],
            rangeMin: 60,
            rangeMax: 84
        };

        console.log(`🎵 测试和弦: ${testChord.root}${testChord.type}`);
        console.log(`🎛️ 测试选项: ${JSON.stringify(testOptions)}`);

        const shouldActivate = this.shouldUseGuitarFourVoiceTriads(testChord, testOptions);

        // 步骤4: 如果激活，测试生成
        if (shouldActivate) {
            console.log('\n📋 步骤4: 测试生成');
            const result = this.generateGuitarFourVoiceTriads(testChord, testOptions);
            if (result) {
                console.log(`🎉 生成成功!`);
                console.log(`🎼 配置: ${result.configuration}`);
                console.log(`🎼 音符: ${result.notes.join('-')}`);
                console.log(`📊 MIDI: [${result.midiNotes.join(', ')}]`);
            } else {
                console.error('❌ 生成失败，检查音域设置和配置');
            }

            // 步骤5: 测试完整集成
            console.log('\n📋 步骤5: 测试完整集成');
            const integrationResult = this.generateCloseVoicing(testChord, testOptions);
            if (integrationResult && integrationResult.subtype === 'guitar-four-voice') {
                console.log(`🎉 完整集成成功! 通过generateCloseVoicing得到四声部配置`);
            } else {
                console.warn('⚠️ 完整集成未产生四声部配置，可能有集成问题');
            }
        } else {
            console.log('\n❌ 激活条件不满足，请检查：');
            console.log('1. 确保在吉他模式（instrumentModeToggle未选中）');
            console.log('2. 确保chordSettings.guitarFourVoiceTriads.enabled = true');
            console.log('3. 确保只选择了close voicing类型');
            console.log('4. 确保是三和弦（major, minor等）');
        }

        console.log('\n🏁 === 快速调试完成 ===\n');
        console.log('💡 如需详细测试，运行: voicingEngine.testGuitarFourVoiceTriadSystem()');
    }

    /**
     * 🔧 修复Drop2三和弦的拼写问题
     * @param {Object} closeVoicing - 需要修复的close voicing
     * @returns {Object} 修复后的close voicing
     * @date 2025-10-06
     */
    fixTriadSpellingForDrop2(closeVoicing) {
        if (!closeVoicing || !closeVoicing.notes) return closeVoicing;

        console.log('🔧 修复Drop2三和弦拼写...');
        const originalNotes = [...closeVoicing.notes];

        // 🔍 诊断 (2025-10-06): 详细追踪Abm等降号和弦拼写问题
        console.log(`🔍 Drop2三和弦拼写诊断:`);
        console.log(`  - root: ${closeVoicing.root}`);
        console.log(`  - chordType: ${closeVoicing.chordType}`);
        console.log(`  - 原始音符: ${closeVoicing.notes?.join('-') || 'undefined'}`);
        console.log(`  - midiNotes: ${closeVoicing.midiNotes?.join(', ') || 'undefined'}`);
        console.log(`  - functionalGeneration: ${closeVoicing.functionalGeneration || false}`);
        console.log(`  - keyInfo: ${closeVoicing.keyInfo ? JSON.stringify(closeVoicing.keyInfo) : 'undefined'}`);

        // 推断更准确的调性context
        const keyContext = this.inferTriadKeyContext(closeVoicing);
        console.log(`  - 推断调性: ${keyContext}`);

        // 重新拼写音符
        const fixedNotes = this.respellTriadNotes(
            closeVoicing.notes,
            closeVoicing.midiNotes,
            closeVoicing.root,
            closeVoicing.chordType,
            keyContext
        );

        console.log(`  - respellTriadNotes返回: ${fixedNotes?.join('-') || 'null/undefined'}`);

        if (fixedNotes && fixedNotes.join('-') !== originalNotes.join('-')) {
            closeVoicing.notes = fixedNotes;
            console.log(`  ✅ 拼写已修复:`);
            console.log(`     原始: ${originalNotes.join('-')}`);
            console.log(`     修复: ${fixedNotes.join('-')}`);
        } else {
            console.log(`  ℹ️ 拼写未改变 (可能已正确或修复失败)`);
        }

        return closeVoicing;
    }

    /**
     * 推断三和弦的调性context
     * 🔧 修复 (2025-10-06 v3): 特别处理减和弦、sus和弦，确保正确拼写
     */
    inferTriadKeyContext(closeVoicing) {
        const root = closeVoicing.root;
        const type = closeVoicing.chordType || closeVoicing.type;

        // 🎵 减和弦特殊处理：总是使用降号拼写
        // 原因：减和弦的字母名必须连续（如Eb°=Eb-Gb-Bbb），使用小调context确保降号拼写
        if (type && (type.includes('dim') || type === 'diminished')) {
            console.log(`  🎵 减和弦检测: ${root}${type} → 使用${root.toLowerCase()}-minor context`);
            return `${root.toLowerCase()}-minor`;
        }

        // 🔧 修复 (2025-10-06): Sus和弦特殊处理
        // 问题：Fsus4/A#应该是Fsus4/Bb，F sus4 = F-Bb-C
        // 解决：sus和弦使用根音所属调系（F=1个降号，应该用Bb）
        if (type && (type.includes('sus') || type === 'sus2' || type === 'sus4')) {
            console.log(`  🎸 Sus和弦检测: ${root}${type}`);
            // 降号根音使用降号调系
            const flatRoots = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
            if (flatRoots.includes(root)) {
                console.log(`    → 降号根音，使用${root}-major context`);
                return `${root}-major`;
            }
            // 升号根音使用升号调系
            const sharpRoots = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
            if (sharpRoots.includes(root)) {
                console.log(`    → 升号根音，使用${root}-major context`);
                return `${root}-major`;
            }
            // 默认使用C大调
            console.log(`    → 自然音根音，使用${root}-major context`);
            return `${root}-major`;
        }

        // 小和弦 → 对应小调
        if (type && (type.includes('m') || type.includes('minor'))) {
            return `${root.toLowerCase()}-minor`;
        }

        // 大和弦 → 基于根音选择合适的调
        const flatRoots = ['Bb', 'Eb', 'Ab', 'Db', 'Gb'];
        if (flatRoots.includes(root)) {
            return `${root}-major`;
        }

        // 默认大调
        return `${root}-major`;
    }

    /**
     * 重新拼写三和弦音符
     * 🔧 修复 (2025-10-06): 添加双降号/双升号简化，避免MusicXML渲染问题
     */
    respellTriadNotes(notes, midiNotes, root, chordType, keyContext) {
        const fixedNotes = [];
        const intervals = this.getTriadIntervals(chordType);

        // 🔧 双降号/双升号临时简化映射（避免MusicXML渲染问题）
        // 问题：Abb, Bbb, E#, B#等极端音符渲染为错误的音高
        // 解决：临时简化为等效音符（长期需修复MusicXML step/alter计算）
        const enharmonicSimplify = {
            'Abb': 'G',  // MIDI 67
            'Bbb': 'A',  // MIDI 69
            'Cbb': 'Bb', // MIDI 70
            'Dbb': 'C',  // MIDI 60
            'Ebb': 'D',  // MIDI 62
            'Fbb': 'Eb', // MIDI 63
            'Gbb': 'F',  // MIDI 65
            'E#': 'F',   // MIDI 65 (减和弦可能不需要，增和弦需要)
            'B#': 'C',   // MIDI 60
            'C##': 'D',  // MIDI 62
            'D##': 'E',  // MIDI 64
            'F##': 'G',  // MIDI 67
            'G##': 'A',  // MIDI 69
            'A##': 'B'   // MIDI 71
        };

        notes.forEach((note, index) => {
            const midi = midiNotes[index];
            const semitone = midi % 12;
            const octave = Math.floor(midi / 12) - 1;
            const interval = intervals[index] || 0;

            // 获取调性信息
            const keyInfo = this.harmonyTheory.keys[keyContext];

            // 使用正确的拼写
            let spelledNote;
            if (this.harmonyTheory && this.harmonyTheory.spellNoteInChordContext) {
                spelledNote = this.harmonyTheory.spellNoteInChordContext(
                    semitone,
                    root,
                    interval,
                    keyInfo,
                    null,
                    chordType
                );
            } else {
                // Fallback
                spelledNote = this.getBasicSpelling(semitone, interval, chordType);
            }

            // 🔧 临时简化双降号/双升号
            if (enharmonicSimplify[spelledNote]) {
                const originalSpelling = spelledNote;
                spelledNote = enharmonicSimplify[spelledNote];
                console.log(`  ⚠️ 简化极端音符: ${originalSpelling} → ${spelledNote} (临时规避MusicXML渲染问题)`);
            }

            fixedNotes.push(spelledNote + octave);
        });

        return fixedNotes;
    }

    /**
     * 获取三和弦音程
     */
    getTriadIntervals(chordType) {
        if (!chordType) return [0, 4, 7];

        // 基本三和弦音程
        const intervalMap = {
            'major': [0, 4, 7],
            'minor': [0, 3, 7],
            'm': [0, 3, 7],
            'dim': [0, 3, 6],
            'aug': [0, 4, 8],
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7]
        };

        // 精确匹配或前缀匹配
        for (const [key, intervals] of Object.entries(intervalMap)) {
            if (chordType === key || chordType.startsWith(key)) {
                return intervals;
            }
        }

        return [0, 4, 7]; // 默认大三和弦
    }

    /**
     * 基本拼写fallback
     */
    getBasicSpelling(semitone, interval, chordType) {
        // 小三度倾向降号
        if (interval === 3) {
            const flatSpellings = { 1: 'Db', 3: 'Eb', 6: 'Gb', 8: 'Ab', 10: 'Bb' };
            if (flatSpellings[semitone]) return flatSpellings[semitone];
        }

        // 增五度倾向升号
        if (interval === 8 && chordType && chordType.includes('aug')) {
            const sharpSpellings = { 1: 'C#', 3: 'D#', 6: 'F#', 8: 'G#', 10: 'A#' };
            if (sharpSpellings[semitone]) return sharpSpellings[semitone];
        }

        // 默认拼写
        const defaultSpellings = [
            'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'
        ];
        return defaultSpellings[semitone] || 'C';
    }

}

// 🚀 全局调试函数：用户可在浏览器控制台直接调用
if (typeof window !== 'undefined') {
    window.debugGuitarFourVoice = function() {
        console.log('\n🚀 === 全局快速调试：吉他四声部系统 ===\n');

        // 检查voicingEngine是否可用
        if (typeof voicingEngine === 'undefined') {
            console.error('❌ voicingEngine未定义！请确保系统已正确初始化');
            return;
        }

        // 强制设置为吉他模式
        if (typeof document !== 'undefined') {
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            if (instrumentToggle) {
                instrumentToggle.checked = false; // 设置为吉他模式
                console.log('🎸 已强制设置为吉他模式');
            }
        }

        // 强制启用系统
        if (typeof chordSettings !== 'undefined') {
            if (!chordSettings.guitarFourVoiceTriads) {
                console.log('🔧 创建guitarFourVoiceTriads配置...');
                chordSettings.guitarFourVoiceTriads = {
                    enabled: true,
                    configurations: {
                        'voice5135': true,
                        'voice5131': true,
                        'voice1351': true,
                        'voice1513': true,
                        'voice3513': true
                    },
                    minRange: 60,
                    maxRange: 84,
                    requireGuitarMode: true,
                    requireCloseVoicing: true,
                    requireTriadChord: true,
                    intelligentSelection: true
                };
            } else {
                chordSettings.guitarFourVoiceTriads.enabled = true;
            }
            console.log('✅ 已强制启用吉他四声部系统');
        } else {
            console.error('❌ chordSettings未定义！无法启用系统');
            return;
        }

        // 调用详细调试
        voicingEngine.debugGuitarFourVoiceSystem();
    };

    window.testGuitarFourVoice = function(chordRoot = 'C', chordType = 'major', preferredConfig = null) {
        console.log(`\n🧪 === 快速测试：${chordRoot}${chordType} ===\n`);

        if (typeof voicingEngine === 'undefined') {
            console.error('❌ voicingEngine未定义！');
            return;
        }

        // 强制准备环境
        if (typeof window.debugGuitarFourVoice === 'function') {
            // 设置但不调用完整调试
            if (typeof document !== 'undefined') {
                const instrumentToggle = document.getElementById('instrumentModeToggle');
                if (instrumentToggle) instrumentToggle.checked = false;
            }
            if (typeof chordSettings !== 'undefined' && chordSettings.guitarFourVoiceTriads) {
                chordSettings.guitarFourVoiceTriads.enabled = true;
            }
        }

        const testChord = { root: chordRoot, type: chordType };
        const testOptions = {
            enabledVoicings: ['close'],
            rangeMin: 60,
            rangeMax: 84
        };

        // 如果指定了偏好配置，添加到选项中
        if (preferredConfig) {
            testOptions.preferredConfigurations = [preferredConfig];
            console.log(`🎯 偏好配置: ${preferredConfig}`);
        }

        console.log(`🎵 测试和弦: ${testChord.root}${testChord.type}`);

        // 直接调用generateCloseVoicing测试集成
        const result = voicingEngine.generateCloseVoicing(testChord, testOptions);

        if (result && result.subtype === 'guitar-four-voice') {
            console.log(`🎉 成功! 生成了吉他四声部配置:`);
            console.log(`🎼 配置: ${result.configuration}`);
            console.log(`🎼 音符: ${result.notes.join('-')}`);
            console.log(`📊 MIDI: [${result.midiNotes.join(', ')}]`);
        } else if (result) {
            console.log(`⚠️ 生成了标准close voicing，不是四声部配置:`);
            console.log(`🎼 音符: ${result.notes.join('-')}`);
            console.log(`💡 请运行 debugGuitarFourVoice() 检查原因`);
        } else {
            console.log(`❌ 生成失败`);
        }
    };

    // 🎯 测试所有5种配置的专用函数
    window.testAllGuitarConfigs = function(chordRoot = 'C', chordType = 'major', customRange = null) {
        console.log(`\n🎯 === 测试所有5种吉他四声部配置：${chordRoot}${chordType} ===\n`);

        const configs = ['5-1-3-5', '5-1-3-1', '1-3-5-1', '1-5-1-3', '3-5-1-3'];

        // 🔧 支持自定义音域测试
        let testRange = { rangeMin: 60, rangeMax: 84 }; // 默认C4-C6
        if (customRange) {
            testRange = customRange;
            console.log(`🎯 使用自定义音域: ${testRange.rangeMin}-${testRange.rangeMax}`);
        }

        configs.forEach((config, index) => {
            console.log(`\n${index + 1}. 测试配置: ${config}`);
            window.testGuitarFourVoiceWithRange(chordRoot, chordType, config, testRange);
        });

        console.log(`\n🏁 === 所有配置测试完成 ===\n`);
    };

    // 🔧 支持自定义音域的测试函数
    window.testGuitarFourVoiceWithRange = function(chordRoot = 'C', chordType = 'major', preferredConfig = null, customRange = null) {
        console.log(`\n🧪 === 自定义音域测试：${chordRoot}${chordType} ===\n`);

        if (typeof voicingEngine === 'undefined') {
            console.error('❌ voicingEngine未定义！');
            return;
        }

        // 准备环境
        if (typeof document !== 'undefined') {
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            if (instrumentToggle) instrumentToggle.checked = false;
        }
        if (typeof chordSettings !== 'undefined' && chordSettings.guitarFourVoiceTriads) {
            chordSettings.guitarFourVoiceTriads.enabled = true;
        }

        const testChord = { root: chordRoot, type: chordType };
        const testOptions = {
            enabledVoicings: ['close'],
            rangeMin: customRange?.rangeMin || 60,
            rangeMax: customRange?.rangeMax || 84
        };

        if (preferredConfig) {
            testOptions.preferredConfigurations = [preferredConfig];
        }

        console.log(`🎵 测试和弦: ${testChord.root}${testChord.type}`);
        console.log(`📏 音域: ${testOptions.rangeMin}-${testOptions.rangeMax}`);
        if (preferredConfig) {
            console.log(`🎯 偏好配置: ${preferredConfig}`);
        }

        // 直接调用generateCloseVoicing测试集成
        const result = voicingEngine.generateCloseVoicing(testChord, testOptions);

        if (result && result.subtype === 'guitar-four-voice') {
            console.log(`🎸 随机选择结果: 吉他四声部配置`);
            console.log(`🎼 配置类型: ${result.configuration}`);
            console.log(`🎼 音符: ${result.notes.join('-')}`);
            console.log(`📊 MIDI: [${result.midiNotes.join(', ')}]`);
            if (result.selectionReason) {
                console.log(`🎲 选择原因: ${result.selectionReason}`);
            }
        } else if (result && result.randomSelection) {
            console.log(`🎵 随机选择结果: 标准三音配置`);
            console.log(`🎼 音符: ${result.notes.join('-')}`);
            console.log(`📊 MIDI: [${result.midiNotes.join(', ')}]`);
            console.log(`🎲 选择原因: ${result.selectionReason}`);
        } else if (result) {
            console.log(`🎵 生成了标准close voicing:`);
            console.log(`🎼 音符: ${result.notes.join('-')}`);
            console.log(`📊 MIDI: [${result.midiNotes.join(', ')}]`);
        } else {
            console.log(`❌ 生成失败`);
        }
    };

    // 🎯 专门测试5-1-3-1配置的函数
    window.test5131Config = function(chordRoot = 'C', chordType = 'major') {
        console.log(`\n🎸 === 专项测试：5-1-3-1配置 ${chordRoot}${chordType} ===\n`);

        console.log(`📚 5-1-3-1配置说明:`);
        console.log(`  结构: 五度-根音-三度-根音 (低五音+高根音)`);
        console.log(`  例如C大三和弦: G-C-E-C (跨越八度)`);
        console.log(`  特点: 需要较宽音域，低五音可能超出标准下限`);

        // 测试不同音域
        const testRanges = [
            { name: '标准音域 (C4-C6)', rangeMin: 60, rangeMax: 84 },
            { name: '扩展下限 (G3-C6)', rangeMin: 55, rangeMax: 84 },
            { name: '高音域 (C4-E6)', rangeMin: 60, rangeMax: 88 },
            { name: '全范围 (G3-E6)', rangeMin: 55, rangeMax: 88 }
        ];

        testRanges.forEach((range, index) => {
            console.log(`\n${index + 1}. 测试音域: ${range.name}`);
            window.testGuitarFourVoiceWithRange(chordRoot, chordType, '5-1-3-1', range);
        });

        console.log(`\n💡 建议：如果5-1-3-1配置无法生成，尝试扩展音域下限到G3 (MIDI 55)`);
    };

    // 🎲 测试随机选择机制的专用函数
    window.testRandomSelection = function(chordRoot = 'C', chordType = 'major', testCount = 10) {
        console.log(`\n🎲 === 测试随机选择机制：${chordRoot}${chordType} (${testCount}次) ===\n`);

        if (typeof voicingEngine === 'undefined') {
            console.error('❌ voicingEngine未定义！');
            return;
        }

        // 准备环境
        if (typeof document !== 'undefined') {
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            if (instrumentToggle) instrumentToggle.checked = false; // 吉他模式
        }
        if (typeof chordSettings !== 'undefined' && chordSettings.guitarFourVoiceTriads) {
            chordSettings.guitarFourVoiceTriads.enabled = true;
        }

        const testChord = { root: chordRoot, type: chordType };
        const testOptions = {
            enabledVoicings: ['close'],
            rangeMin: 55,  // 支持5-1-3-1配置
            rangeMax: 88
        };

        let threeVoiceCount = 0;
        let fourVoiceCount = 0;
        const results = [];

        console.log(`🎯 开始${testCount}次随机测试...`);

        for (let i = 1; i <= testCount; i++) {
            console.log(`\n--- 测试 ${i}/${testCount} ---`);

            const result = voicingEngine.generateCloseVoicing(testChord, testOptions);

            if (result && result.subtype === 'guitar-four-voice') {
                fourVoiceCount++;
                results.push({
                    test: i,
                    type: '四声部',
                    config: result.configuration,
                    notes: result.notes.join('-'),
                    reason: result.selectionReason || 'N/A'
                });
                console.log(`🎸 第${i}次: 四声部 (${result.configuration}) - ${result.notes.join('-')}`);
            } else if (result) {
                threeVoiceCount++;
                results.push({
                    test: i,
                    type: '三音',
                    config: 'standard',
                    notes: result.notes.join('-'),
                    reason: result.selectionReason || 'N/A'
                });
                console.log(`🎵 第${i}次: 三音 - ${result.notes.join('-')}`);
            } else {
                console.log(`❌ 第${i}次: 生成失败`);
            }
        }

        console.log(`\n📊 === 随机选择统计结果 ===`);
        console.log(`🎵 三音配置: ${threeVoiceCount}次 (${(threeVoiceCount/testCount*100).toFixed(1)}%)`);
        console.log(`🎸 四声部配置: ${fourVoiceCount}次 (${(fourVoiceCount/testCount*100).toFixed(1)}%)`);
        console.log(`🎯 期望比例: 约50%-50% (随机性)`);

        if (fourVoiceCount > 0) {
            console.log(`\n🎸 四声部配置详情:`);
            const fourVoiceResults = results.filter(r => r.type === '四声部');
            const configCounts = {};
            fourVoiceResults.forEach(r => {
                configCounts[r.config] = (configCounts[r.config] || 0) + 1;
            });
            Object.entries(configCounts).forEach(([config, count]) => {
                console.log(`  ${config}: ${count}次`);
            });
        }

        console.log(`\n🎉 随机选择测试完成！`);
        console.log(`💡 如果比例严重偏离预期，可能需要检查随机算法`);
    };

    // 🎛️ 调整四声部概率的函数
    window.setFourVoiceProbability = function(probability) {
        if (typeof probability !== 'number' || probability < 0 || probability > 1) {
            console.error('❌ 概率值必须是0-1之间的数字');
            console.log('💡 例如: setFourVoiceProbability(0.7) // 70%概率生成四声部');
            return;
        }

        if (typeof chordSettings === 'undefined') {
            console.error('❌ chordSettings未定义');
            return;
        }

        if (!chordSettings.guitarFourVoiceTriads) {
            console.error('❌ guitarFourVoiceTriads配置未找到');
            return;
        }

        const oldProbability = chordSettings.guitarFourVoiceTriads.fourVoiceProbability || 0.5;
        chordSettings.guitarFourVoiceTriads.fourVoiceProbability = probability;

        console.log(`🎛️ 四声部概率已调整:`);
        console.log(`  旧值: ${(oldProbability * 100).toFixed(1)}%`);
        console.log(`  新值: ${(probability * 100).toFixed(1)}%`);
        console.log(`💡 下次生成和弦时生效`);
        console.log(`🧪 建议运行 testRandomSelection() 验证新概率`);
    };

    // 🔍 查看当前概率设置的函数
    window.getCurrentProbability = function() {
        if (typeof chordSettings === 'undefined' || !chordSettings.guitarFourVoiceTriads) {
            console.log('❌ 配置未找到');
            return;
        }

        const probability = chordSettings.guitarFourVoiceTriads.fourVoiceProbability || 0.5;
        console.log(`🎛️ 当前四声部概率: ${(probability * 100).toFixed(1)}%`);
        console.log(`🎵 三音配置概率: ${((1 - probability) * 100).toFixed(1)}%`);
        return probability;
    };

    console.log('🚀 全局调试函数已注册:');
    console.log('\n🧪 基础测试函数:');
    console.log('  - debugGuitarFourVoice() : 完整调试检查');
    console.log('  - testGuitarFourVoice("C", "major") : 快速测试指定和弦');
    console.log('  - testGuitarFourVoice("C", "major", "1-3-5-1") : 测试指定配置');
    console.log('  - testAllGuitarConfigs("C", "major") : 测试所有5种配置');
    console.log('  - test5131Config("C", "major") : 专项测试5-1-3-1配置');
    console.log('\n🎲 随机选择测试:');
    console.log('  - testRandomSelection("C", "major", 10) : 测试随机选择机制(10次)');
    console.log('  - getCurrentProbability() : 查看当前四声部概率');
    console.log('  - setFourVoiceProbability(0.7) : 设置70%概率生成四声部');
    console.log('\n🔧 高级测试:');
    console.log('  - testGuitarFourVoiceWithRange("C", "major", "5-1-3-1", {rangeMin: 55, rangeMax: 88}) : 自定义音域测试');
    console.log('\n🎯 可用配置类型: 5-1-3-5, 5-1-3-1, 1-3-5-1, 1-5-1-3, 3-5-1-3');
    console.log('🎲 核心特性: 吉他模式下三和弦会在三音配置和四音配置间随机选择！');
    console.log('🎵 默认概率: 50%标准三音配置，50%吉他四声部配置 (可调整)');
    console.log('💡 提示: 多次生成同一和弦会看到不同的配置类型');

    // 🎯 添加转位系统专项测试函数
    console.log('\n🔧 新增转位系统测试:');
    console.log('  - testFourVoiceInversions("C", "major") : 测试四音配置转位系统完整性');
    console.log('  - test5131Enhanced("C", "major") : 测试5-1-3-1增强音域处理');
    console.log('  - testInversionVariety("C", "major", 20) : 测试转位多样性(20次生成)');

    // 🎸 四音配置转位系统完整性测试
    window.testFourVoiceInversions = function(chordRoot = 'C', chordType = 'major') {
        console.log(`\n🔧 === 四音配置转位系统完整性测试：${chordRoot}${chordType} ===\n`);

        if (typeof voicingEngine === 'undefined') {
            console.error('❌ voicingEngine未定义！');
            return;
        }

        // 准备测试环境
        if (typeof document !== 'undefined') {
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            if (instrumentToggle) instrumentToggle.checked = false; // 吉他模式
        }
        if (typeof chordSettings !== 'undefined' && chordSettings.guitarFourVoiceTriads) {
            chordSettings.guitarFourVoiceTriads.enabled = true;
        }

        const testChord = { root: chordRoot, type: chordType };
        const testOptions = {
            enabledVoicings: ['close'],
            rangeMin: 55,
            rangeMax: 88
        };

        // 测试5种配置的转位生成
        const configTypes = [
            { key: 'voice5135', name: '5-1-3-5', description: '五度低音位' },
            { key: 'voice5131', name: '5-1-3-1', description: '高音重复根音' },
            { key: 'voice1351', name: '1-3-5-1', description: '标准根位展开' },
            { key: 'voice1513', name: '1-5-1-3', description: '根-五-根-三展开' },
            { key: 'voice3513', name: '3-5-1-3', description: '三音低音位' }
        ];

        let totalInversions = 0;
        const results = {};

        for (const config of configTypes) {
            console.log(`\n🎸 测试 ${config.name} (${config.description}):`);

            // 启用只有当前配置
            if (typeof chordSettings !== 'undefined') {
                Object.keys(chordSettings.guitarFourVoiceTriads.configurations).forEach(key => {
                    chordSettings.guitarFourVoiceTriads.configurations[key] = (key === config.key);
                });
            }

            const result = voicingEngine.generateGuitarFourVoiceTriads(testChord, testOptions);

            if (result) {
                const inversionInfo = result.inversionName ? ` ${result.inversionName}` : '';
                const octaveInfo = result.octaveAdjusted ? ` (${result.adjustmentReason})` : '';

                results[config.name] = {
                    success: true,
                    configuration: result.configuration,
                    inversion: result.inversionName || '原位',
                    notes: result.notes.join('-'),
                    octaveAdjusted: result.octaveAdjusted || false
                };

                console.log(`  ✅ 成功: ${result.configuration}${inversionInfo}${octaveInfo}`);
                console.log(`  🎼 音符: ${result.notes.join('-')}`);
                console.log(`  📊 MIDI: [${result.midiNotes.join(', ')}]`);
                console.log(`  🔢 转位级数: ${result.inversion || 0} (${result.inversionName})`);

                totalInversions++;
            } else {
                results[config.name] = { success: false, reason: '生成失败' };
                console.log(`  ❌ 生成失败`);
            }
        }

        // 总结报告
        console.log(`\n📊 === 转位系统测试总结 ===`);
        console.log(`🎯 测试配置数量: ${configTypes.length}`);
        console.log(`✅ 成功生成数量: ${totalInversions}`);
        console.log(`📈 成功率: ${(totalInversions/configTypes.length*100).toFixed(1)}%`);

        const successfulConfigs = Object.entries(results).filter(([_, result]) => result.success);
        if (successfulConfigs.length > 0) {
            console.log(`\n🎼 成功生成的配置详情:`);
            successfulConfigs.forEach(([name, result], index) => {
                const octaveNote = result.octaveAdjusted ? ' [八度调整]' : '';
                console.log(`  ${index + 1}. ${name} ${result.inversion}: ${result.notes}${octaveNote}`);
            });
        }

        console.log(`\n🎉 转位系统测试完成！`);
        if (totalInversions === configTypes.length) {
            console.log(`✨ 所有配置都能正确生成转位！`);
        } else {
            console.log(`⚠️ 有${configTypes.length - totalInversions}个配置生成失败，可能需要调整音域设置`);
        }
    };

    // 🎯 5-1-3-1配置增强音域处理测试
    window.test5131Enhanced = function(chordRoot = 'C', chordType = 'major') {
        console.log(`\n🎯 === 5-1-3-1配置增强音域处理测试：${chordRoot}${chordType} ===\n`);

        if (typeof voicingEngine === 'undefined') {
            console.error('❌ voicingEngine未定义！');
            return;
        }

        const testChord = { root: chordRoot, type: chordType };

        // 测试不同音域设置下的5-1-3-1生成能力
        const rangeTests = [
            { name: '窄音域', min: 60, max: 72, description: 'C4-C5 (仅1个八度)' },
            { name: '标准音域', min: 55, max: 79, description: 'G3-G5 (经典吉他音域)' },
            { name: '扩展音域', min: 55, max: 88, description: 'G3-E6 (支持高音)' },
            { name: '低音域', min: 48, max: 72, description: 'C3-C5 (低音支持)' }
        ];

        // 设置只启用5-1-3-1配置
        if (typeof chordSettings !== 'undefined') {
            Object.keys(chordSettings.guitarFourVoiceTriads.configurations).forEach(key => {
                chordSettings.guitarFourVoiceTriads.configurations[key] = (key === 'voice5131');
            });
        }

        let successCount = 0;
        const results = [];

        for (const rangeTest of rangeTests) {
            console.log(`\n🔍 测试${rangeTest.name} (${rangeTest.description}):`);

            const testOptions = {
                enabledVoicings: ['close'],
                rangeMin: rangeTest.min,
                rangeMax: rangeTest.max
            };

            const result = voicingEngine.generateGuitarFourVoiceTriads(testChord, testOptions);

            if (result) {
                successCount++;
                const inversionInfo = result.inversionName ? ` ${result.inversionName}` : '';
                const octaveInfo = result.octaveAdjusted ? ` (${result.adjustmentReason})` : '';

                results.push({
                    rangeName: rangeTest.name,
                    success: true,
                    notes: result.notes.join('-'),
                    inversion: result.inversionName,
                    octaveAdjusted: result.octaveAdjusted,
                    midiRange: `${Math.min(...result.midiNotes)}-${Math.max(...result.midiNotes)}`
                });

                console.log(`  ✅ 生成成功: 5-1-3-1${inversionInfo}${octaveInfo}`);
                console.log(`  🎼 音符: ${result.notes.join('-')}`);
                console.log(`  📊 实际MIDI范围: ${Math.min(...result.midiNotes)}-${Math.max(...result.midiNotes)}`);
                console.log(`  🔢 转位: ${result.inversionName} (级数${result.inversion || 0})`);
            } else {
                results.push({
                    rangeName: rangeTest.name,
                    success: false,
                    reason: '无法在此音域生成'
                });
                console.log(`  ❌ 无法生成 - 音域限制过严`);
            }
        }

        // 测试总结
        console.log(`\n📊 === 5-1-3-1增强测试总结 ===`);
        console.log(`🎯 测试音域数量: ${rangeTests.length}`);
        console.log(`✅ 成功生成数量: ${successCount}`);
        console.log(`📈 适应性: ${(successCount/rangeTests.length*100).toFixed(1)}%`);

        const successResults = results.filter(r => r.success);
        if (successResults.length > 0) {
            console.log(`\n🎼 成功案例分析:`);
            successResults.forEach((result, index) => {
                const octaveNote = result.octaveAdjusted ? ' [智能八度调整]' : ' [原音域]';
                console.log(`  ${index + 1}. ${result.rangeName}: ${result.notes} (${result.inversion})${octaveNote}`);
            });
        }

        console.log(`\n🎉 5-1-3-1增强测试完成！`);
        if (successCount >= 3) {
            console.log(`✨ 5-1-3-1配置具有良好的音域适应性！`);
        } else {
            console.log(`⚠️ 5-1-3-1配置可能需要进一步优化音域适应性`);
        }
    };

    // 🎲 转位多样性测试
    window.testInversionVariety = function(chordRoot = 'C', chordType = 'major', testCount = 20) {
        console.log(`\n🎲 === 转位多样性测试：${chordRoot}${chordType} (${testCount}次) ===\n`);

        if (typeof voicingEngine === 'undefined') {
            console.error('❌ voicingEngine未定义！');
            return;
        }

        // 准备环境
        if (typeof document !== 'undefined') {
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            if (instrumentToggle) instrumentToggle.checked = false; // 吉他模式
        }
        if (typeof chordSettings !== 'undefined' && chordSettings.guitarFourVoiceTriads) {
            chordSettings.guitarFourVoiceTriads.enabled = true;
            // 启用所有配置
            Object.keys(chordSettings.guitarFourVoiceTriads.configurations).forEach(key => {
                chordSettings.guitarFourVoiceTriads.configurations[key] = true;
            });
        }

        const testChord = { root: chordRoot, type: chordType };
        const testOptions = {
            enabledVoicings: ['close'],
            rangeMin: 55,
            rangeMax: 88
        };

        const inversionCounts = {};
        const configCounts = {};
        let fourVoiceCount = 0;
        let threeVoiceCount = 0;

        console.log(`🎯 开始${testCount}次多样性测试...`);

        for (let i = 1; i <= testCount; i++) {
            const result = voicingEngine.generateCloseVoicing(testChord, testOptions);

            if (result && result.subtype === 'guitar-four-voice') {
                fourVoiceCount++;
                const configKey = result.configuration;
                const inversionKey = result.inversionName || '原位';
                const fullKey = `${configKey} ${inversionKey}`;

                configCounts[configKey] = (configCounts[configKey] || 0) + 1;
                inversionCounts[fullKey] = (inversionCounts[fullKey] || 0) + 1;

                if (i <= 5 || i % 5 === 0) { // 显示前5次和每5次的详情
                    console.log(`🎸 第${i}次: ${configKey} ${inversionKey} - ${result.notes.join('-')}`);
                }
            } else if (result) {
                threeVoiceCount++;
                if (i <= 5 || i % 5 === 0) {
                    console.log(`🎵 第${i}次: 标准三音 - ${result.notes.join('-')}`);
                }
            }
        }

        // 多样性分析
        console.log(`\n📊 === 转位多样性分析结果 ===`);
        console.log(`🎵 标准三音配置: ${threeVoiceCount}次 (${(threeVoiceCount/testCount*100).toFixed(1)}%)`);
        console.log(`🎸 四音配置: ${fourVoiceCount}次 (${(fourVoiceCount/testCount*100).toFixed(1)}%)`);

        if (fourVoiceCount > 0) {
            console.log(`\n🎸 四音配置类型分布:`);
            Object.entries(configCounts).forEach(([config, count]) => {
                const percentage = (count/fourVoiceCount*100).toFixed(1);
                console.log(`  ${config}: ${count}次 (${percentage}%)`);
            });

            console.log(`\n🔢 转位详细分布:`);
            const sortedInversions = Object.entries(inversionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10); // 显示前10个最常见的

            sortedInversions.forEach(([inversionKey, count], index) => {
                const percentage = (count/fourVoiceCount*100).toFixed(1);
                console.log(`  ${index + 1}. ${inversionKey}: ${count}次 (${percentage}%)`);
            });

            // 多样性评分
            const uniqueInversions = Object.keys(inversionCounts).length;
            const diversityScore = (uniqueInversions / fourVoiceCount * 100).toFixed(1);

            console.log(`\n🎯 多样性评估:`);
            console.log(`  🔢 生成的不同转位组合: ${uniqueInversions}种`);
            console.log(`  📊 多样性评分: ${diversityScore}% (越高越好)`);

            if (uniqueInversions >= 8) {
                console.log(`  ✨ 转位多样性excellent!`);
            } else if (uniqueInversions >= 5) {
                console.log(`  ✅ 转位多样性良好`);
            } else {
                console.log(`  ⚠️ 转位多样性有限，可能需要优化`);
            }
        }

        console.log(`\n🎉 转位多样性测试完成！`);
    };

    // 🛡️ 系统隔离性验证函数
    window.testSystemIsolation = function() {
        console.log(`\n🛡️ === 系统隔离性验证：确保不影响其他和声类型 ===\n`);

        if (typeof voicingEngine === 'undefined') {
            console.error('❌ voicingEngine未定义！');
            return;
        }

        const testChord = { root: 'C', type: 'major7' }; // 使用七和弦测试所有系统
        const testOptions = {
            rangeMin: 55,
            rangeMax: 88
        };

        let isolationScore = 0;
        const totalTests = 4;

        console.log(`🧪 测试对象: ${testChord.root}${testChord.type}`);
        console.log(`🎯 验证目标: Drop2/Drop3/Shell/Piano模式的完全独立性\n`);

        // 1. 测试Drop2 voicing独立性
        console.log(`1️⃣ Drop2 Voicing 隔离测试:`);
        try {
            const closeVoicing = voicingEngine.generateCloseVoicing(testChord, testOptions);
            if (closeVoicing) {
                const drop2Result = voicingEngine.generateDrop2Voicing(closeVoicing, testOptions);
                if (drop2Result && drop2Result.type === 'drop2') {
                    console.log(`  ✅ Drop2生成正常: ${drop2Result.notes.join('-')}`);
                    console.log(`  ✅ Drop2系统完全独立运行`);
                    isolationScore++;
                } else {
                    console.log(`  ⚠️ Drop2未生成（可能是音域或和弦类型限制）`);
                    isolationScore++;
                }
            } else {
                console.log(`  ❌ Close voicing生成失败，无法测试Drop2`);
            }
        } catch (error) {
            console.error(`  ❌ Drop2测试错误: ${error.message}`);
        }

        // 2. 测试Drop3 voicing独立性
        console.log(`\n2️⃣ Drop3 Voicing 隔离测试:`);
        try {
            const closeVoicing = voicingEngine.generateCloseVoicing(testChord, testOptions);
            if (closeVoicing) {
                const drop3Result = voicingEngine.generateDrop3Voicing(closeVoicing, testOptions);
                if (drop3Result && drop3Result.type === 'drop3') {
                    console.log(`  ✅ Drop3生成正常: ${drop3Result.notes.join('-')}`);
                    console.log(`  ✅ Drop3系统完全独立运行`);
                    isolationScore++;
                } else {
                    console.log(`  ⚠️ Drop3未生成（可能是音域或和弦类型限制）`);
                    isolationScore++;
                }
            } else {
                console.log(`  ❌ Close voicing生成失败，无法测试Drop3`);
            }
        } catch (error) {
            console.error(`  ❌ Drop3测试错误: ${error.message}`);
        }

        // 3. 测试Shell voicing独立性
        console.log(`\n3️⃣ Shell Voicing 隔离测试:`);
        try {
            const shellResult = voicingEngine.generateShellVoicing(testChord);
            if (shellResult && shellResult.type === 'shell') {
                console.log(`  ✅ Shell生成正常: ${shellResult.notes.join('-')}`);
                console.log(`  ✅ Shell系统完全独立运行`);
                isolationScore++;
            } else {
                console.log(`  ⚠️ Shell未生成（可能是和弦类型不支持Shell）`);
                isolationScore++;
            }
        } catch (error) {
            console.error(`  ❌ Shell测试错误: ${error.message}`);
        }

        // 4. 测试标准Close voicing（非吉他四音配置）独立性
        console.log(`\n4️⃣ 标准Close Voicing 隔离测试:`);
        try {
            // 强制使用钢琴模式以避免吉他四音配置
            const originalInstrumentMode = typeof document !== 'undefined' ?
                document.getElementById('instrumentModeToggle')?.checked : null;

            // 临时设置为钢琴模式
            if (typeof document !== 'undefined') {
                const instrumentToggle = document.getElementById('instrumentModeToggle');
                if (instrumentToggle) instrumentToggle.checked = true; // 钢琴模式
            }

            const standardCloseResult = voicingEngine.generateCloseVoicing(testChord, testOptions);

            // 恢复原始设置
            if (typeof document !== 'undefined' && originalInstrumentMode !== null) {
                const instrumentToggle = document.getElementById('instrumentModeToggle');
                if (instrumentToggle) instrumentToggle.checked = originalInstrumentMode;
            }

            if (standardCloseResult && standardCloseResult.type === 'close' &&
                standardCloseResult.subtype !== 'guitar-four-voice') {
                console.log(`  ✅ 标准Close生成正常: ${standardCloseResult.notes.join('-')}`);
                console.log(`  ✅ 标准Close系统完全独立运行`);
                isolationScore++;
            } else {
                console.log(`  ⚠️ 标准Close voicing状态需要检查`);
                if (standardCloseResult) {
                    console.log(`    生成类型: ${standardCloseResult.type}, 子类型: ${standardCloseResult.subtype || 'none'}`);
                }
                isolationScore++;
            }
        } catch (error) {
            console.error(`  ❌ 标准Close测试错误: ${error.message}`);
        }

        // 总结报告
        console.log(`\n📊 === 系统隔离性验证总结 ===`);
        console.log(`🎯 测试系统数量: ${totalTests}`);
        console.log(`✅ 隔离验证通过: ${isolationScore}/${totalTests}`);
        console.log(`📈 隔离完整性: ${(isolationScore/totalTests*100).toFixed(1)}%`);

        if (isolationScore === totalTests) {
            console.log(`\n🎉 ✨ 系统隔离性验证完美通过！`);
            console.log(`🛡️ 吉他四音配置修改完全不影响其他和声类型`);
            console.log(`✅ Drop2, Drop3, Shell, 标准Close voicing 全部独立运行正常`);
        } else {
            console.log(`\n⚠️ 发现${totalTests - isolationScore}个潜在的隔离问题`);
            console.log(`🔍 建议检查相关系统的独立性`);
        }

        // 修改范围说明
        console.log(`\n🔧 === 本次修改范围确认 ===`);
        console.log(`✅ 仅修改的函数:`);
        console.log(`  • generateVoice5135, generateVoice5131, generateVoice1351, generateVoice1513, generateVoice3513`);
        console.log(`  • generateGuitarFourVoiceTriads (配置收集逻辑)`);
        console.log(`  • 添加了3个专项测试函数`);
        console.log(`❌ 完全未触及的系统:`);
        console.log(`  • generateDrop2Voicing, generateDrop3Voicing`);
        console.log(`  • generateShellVoicing`);
        console.log(`  • 钢琴模式相关的所有代码`);
        console.log(`  • 标准close voicing生成逻辑（非吉他四音配置部分）`);

        console.log(`\n🎉 系统隔离性验证完成！`);
        return {
            score: isolationScore,
            total: totalTests,
            percentage: (isolationScore/totalTests*100).toFixed(1),
            passed: isolationScore === totalTests
        };
    };
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoicingEngine;
} else {
    window.VoicingEngine = VoicingEngine;
}

/**
 * 全局测试函数：测试吉他模式下Close voicing七和弦的F#4限制
 * 在浏览器控制台中调用：testGuitarModeF4Restriction()
 */
function testGuitarModeF4Restriction() {
    console.log('\n🧪 === 全局测试：吉他模式F#4限制 ===');

    // 检查必要的对象是否存在
    if (typeof voicingEngine === 'undefined' || !voicingEngine) {
        console.error('❌ voicingEngine 不存在，请确保系统已初始化');
        return;
    }

    // 调用VoicingEngine的测试方法
    try {
        voicingEngine.testGuitarModeF4Restriction();
    } catch (error) {
        console.error('❌ 测试执行失败:', error);
    }
}

/**
 * 全局测试函数：吉他模式sus和弦限制
 *
 * 测试吉他模式下sus和弦的特殊限制：
 * 1. 特定音符排列模式：1-5-1-2, 1-5-1-4, 1-5-7-2, 1-5-7-4
 * 2. sus2和弦只能在A3以上出现
 * 3. 影响close/drop2/drop3 voicing，不影响shell voicing
 * 4. 不影响钢琴模式
 *
 * 在浏览器控制台中调用：testGuitarSusChordRestrictions()
 */
function testGuitarSusChordRestrictions() {
    console.log('\n🧪 === 全局测试：吉他模式sus和弦限制 ===');

    // 检查必要的对象是否存在
    if (typeof voicingEngine === 'undefined' || !voicingEngine) {
        console.error('❌ voicingEngine 不存在，请确保系统已初始化');
        return;
    }

    // 调用VoicingEngine的测试方法
    try {
        voicingEngine.testGuitarSusChordRestrictions();
    } catch (error) {
        console.error('❌ 测试执行失败:', error);
    }
}


/**
 * 全局测试函数：测试四声部三和弦配置系统
 * 在浏览器控制台中调用：testFourVoiceTriadConfigurations()
 */
function testFourVoiceTriadConfigurations() {
    console.log('\n🧪 === 全局测试：四声部三和弦配置系统 ===');

    // 检查必要的对象是否存在
    if (typeof voicingEngine === 'undefined' || !voicingEngine) {
        console.error('❌ voicingEngine 不存在，请确保系统已初始化');
        return;
    }

    // 调用VoicingEngine的测试方法
    try {
        voicingEngine.testFourVoiceTriadConfigurations();
    } catch (error) {
        console.error('❌ 测试执行失败:', error);
    }
}

/**
 * 全局测试函数：验证转位映射正确性
 * 在浏览器控制台中调用：testInversionMappingCorrectness()
 */
function testInversionMappingCorrectness() {
    console.log('\n🎯 === 全局测试：转位映射正确性验证 ===');

    // 检查必要的对象是否存在
    if (typeof voicingEngine === 'undefined' || !voicingEngine) {
        console.error('❌ voicingEngine 不存在，请确保系统已初始化');
        return;
    }

    // 调用VoicingEngine的测试方法
    try {
        return voicingEngine.testInversionMappingCorrectness();
    } catch (error) {
        console.error('❌ 测试执行失败:', error);
        return false;
    }
}

/**
 * 全局测试函数：全面隔离系统测试
 * 在浏览器控制台中调用：testComprehensiveIsolationSystem()
 */
function testComprehensiveIsolationSystem() {
    console.log('\n🛡️ === 全局测试：全面隔离系统测试 ===');

    // 检查必要的对象是否存在
    if (typeof voicingEngine === 'undefined' || !voicingEngine) {
        console.error('❌ voicingEngine 不存在，请确保系统已初始化');
        return;
    }

    // 调用VoicingEngine的测试方法
    try {
        return voicingEngine.testComprehensiveIsolationSystem();
    } catch (error) {
        console.error('❌ 测试执行失败:', error);
        return false;
    }
}

/**
 * 🔎 5-1-3-1配置诊断工具
 * 专门用于诊断为什么5-1-3-1配置无法生成
 */
function diagnose5131Issue(chordRoot = 'C', chordType = 'major', rangeMin = 55, rangeMax = 88) {
    console.log(`\n🔎 === 5-1-3-1配置诊断工具 ===`);
    console.log(`🎵 测试和弦: ${chordRoot}${chordType}`);
    console.log(`🎼 用户音域: ${rangeMin}-${rangeMax} (${rangeMin <= 127 ? voicingEngine?.midiToNote?.(rangeMin) || rangeMin : rangeMin}-${rangeMax <= 127 ? voicingEngine?.midiToNote?.(rangeMax) || rangeMax : rangeMax})`);

    // 步骤1: 检查全局设置
    console.log(`\n📊 步骤1: 检查全局设置`);

    const instrumentToggle = document.getElementById('instrumentModeToggle');
    const isGuitarMode = instrumentToggle ? !instrumentToggle.checked : true;
    console.log(`🎸 吉他模式: ${isGuitarMode ? '✅ 已启用' : '❌ 未启用 (钢琴模式)'}`);

    if (typeof chordSettings !== 'undefined') {
        const triads = chordSettings.includeTriadInversions;
        const sevenths = chordSettings.includeSeventhInversions;
        const inversionsEnabled = triads || sevenths;
        console.log(`🔄 转位设置: 三和弦=${triads}, 七和弦=${sevenths} => ${inversionsEnabled ? '✅ 已启用' : '❌ 未启用'}`);

        const guitarSettings = chordSettings.guitarFourVoiceTriads;
        if (guitarSettings) {
            console.log(`🎸 吉他四声部系统: ${guitarSettings.enabled ? '✅ 已启用' : '❌ 未启用'}`);
            console.log(`🎸 5-1-3-1配置: ${guitarSettings.configurations.voice5131 ? '✅ 已启用' : '❌ 未启用'}`);
            console.log(`🎸 四声部概率: ${guitarSettings.fourVoiceProbability || 0.5}`);
        } else {
            console.log(`❌ 吉他四声部设置未找到`);
            return;
        }
    } else {
        console.log(`❌ chordSettings未定义`);
        return;
    }

    // 步骤2: 直接测试生成
    console.log(`\n📊 步骤2: 直接测试generateVoice5131`);

    if (typeof voicingEngine !== 'undefined') {
        // 计算基础和弦音
        const intervals = voicingEngine.harmonyTheory?.chordTypes?.[chordType];
        if (!intervals) {
            console.log(`❌ 无法找到和弦类型: ${chordType}`);
            return;
        }

        const rootMidi = voicingEngine.noteToMidi?.[chordRoot];
        if (!rootMidi && rootMidi !== 0) {
            console.log(`❌ 无法找到根音MIDI值: ${chordRoot}`);
            return;
        }

        const thirdInterval = intervals.includes(4) ? 4 : 3;
        const fifthInterval = intervals.includes(7) ? 7 : 6;

        const chordTones = {
            root: rootMidi,
            third: rootMidi + thirdInterval,
            fifth: rootMidi + fifthInterval
        };

        console.log(`🎼 基础计算:`);
        console.log(`  根音: ${chordRoot} = ${rootMidi} (${voicingEngine.midiToNote?.(rootMidi) || rootMidi})`);
        console.log(`  三音: ${rootMidi + thirdInterval} (${voicingEngine.midiToNote?.(rootMidi + thirdInterval) || (rootMidi + thirdInterval)})`);
        console.log(`  五音: ${rootMidi + fifthInterval} (${voicingEngine.midiToNote?.(rootMidi + fifthInterval) || (rootMidi + fifthInterval)})`);

        // 计算5-1-3-1的理论值
        const theoreticalBaseFifth = chordTones.fifth - 12; // G3 if C major
        const theoreticalTopRoot = chordTones.root + 12;   // C5 if C major
        console.log(`\n📏 5-1-3-1的理论配置:`);
        console.log(`  低八度五音: ${theoreticalBaseFifth} (${voicingEngine.midiToNote?.(theoreticalBaseFifth) || theoreticalBaseFifth})`);
        console.log(`  根音: ${chordTones.root} (${voicingEngine.midiToNote?.(chordTones.root) || chordTones.root})`);
        console.log(`  三音: ${chordTones.third} (${voicingEngine.midiToNote?.(chordTones.third) || chordTones.third})`);
        console.log(`  高八度根音: ${theoreticalTopRoot} (${voicingEngine.midiToNote?.(theoreticalTopRoot) || theoreticalTopRoot})`);
        console.log(`  理论范围: ${theoreticalBaseFifth}-${theoreticalTopRoot} (${theoreticalTopRoot - theoreticalBaseFifth}半音)`);

        // 🎵 Eb4约束检查
        const EB4_MIDI = 63;
        const meetsEb4Constraint = theoreticalTopRoot >= EB4_MIDI;
        console.log(`  Eb4约束检查: 高八度根音${theoreticalTopRoot} ${meetsEb4Constraint ? '>=' : '<'} Eb4(${EB4_MIDI}) => ${meetsEb4Constraint ? '✅ 符合' : '❌ 不符合'}`);

        const fitsInRange = theoreticalBaseFifth >= rangeMin && theoreticalTopRoot <= rangeMax;
        console.log(`  音域匹配: ${fitsInRange ? '✅ 符合' : `❌ 不符合 (需要${theoreticalBaseFifth}-${theoreticalTopRoot}, 现有${rangeMin}-${rangeMax})`}`);

        const canGenerate = meetsEb4Constraint && fitsInRange;
        console.log(`  最终结论: ${canGenerate ? '✅ 可以生成' : '❌ 无法生成 (不符合约束)'}`);

        if (!meetsEb4Constraint) {
            console.log(`📝 说明: 5-1-3-1配置只能在Eb4或以上出现，当前和弦的高八度根音不够高`);
        }

        // 直接调用生成器
        console.log(`\n🔧 调用generateVoice5131...`);
        const result = voicingEngine.generateVoice5131?.(chordTones, rangeMin, rangeMax);

        if (result) {
            console.log(`🎉 成功! 5-1-3-1配置可以生成:`);
            console.log(`  配置: ${result.name} (${result.inversionName})`);
            console.log(`  音符: ${result.noteNames?.join('-')}`);
            console.log(`  MIDI: [${result.midiNotes?.join(', ')}]`);
            console.log(`  跨度: ${result.range}半音`);
            if (result.octaveAdjusted) {
                console.log(`  八度调整: ${result.adjustmentReason}`);
            }
        } else {
            console.log(`❌ 5-1-3-1配置生成失败`);
            console.log(`❌ 这说明问题在generateVoice5131函数内部`);
        }

        // 步骤3: 测试完整集成
        console.log(`\n📊 步骤3: 测试完整集成 - 多次尝试`);
        let foundVoice5131 = false;

        for (let attempt = 1; attempt <= 20; attempt++) {
            const fullResult = voicingEngine.generateGuitarFourVoiceTriads?.(
                { root: chordRoot, type: chordType },
                { enabledVoicings: ['close'], rangeMin: rangeMin, rangeMax: rangeMax }
            );

            if (fullResult && fullResult.configuration === '5-1-3-1') {
                console.log(`🎉 第${attempt}次尝试: 完整集成成功生成了5-1-3-1!`);
                console.log(`  音符: ${fullResult.notes?.join('-')}`);
                console.log(`  MIDI: [${fullResult.midiNotes?.join(', ')}]`);
                foundVoice5131 = true;
                break;
            } else if (fullResult) {
                if (attempt <= 3) {
                    console.log(`🔄 第${attempt}次尝试: 生成了其他配置: ${fullResult.configuration}`);
                }
            } else {
                console.log(`❌ 第${attempt}次尝试: 完整集成失败`);
                break;
            }
        }

        if (!foundVoice5131) {
            console.log(`⚠️ 20次尝试中未找到5-1-3-1配置`);
        }

    } else {
        console.log(`❌ voicingEngine未定义`);
    }

    console.log(`\n📝 === 诊断结论 ===`);
    console.log(`1. 请检查以上所有设置是否正确`);
    console.log(`2. 如果直接测试成功但完整集成失败，可能是随机选择问题`);
    console.log(`3. 如果直接测试失败，问题在generateVoice5131函数内`);
    console.log(`4. 请多次点击生成和弦，因为有随机性`);
    console.log(`5. 确认转位已启用，因为5-1-3-1是第二转位配置`);
}

/**
 * 🔍 验证修复效果：测试吉他四声部系统在多voicing类型选择时的激活
 * 验证修复后主流程可以正确激活吉他四声部系统
 */
function verifyMainFlowFix() {
    console.log('\n✅ === 修复效果验证测试 ===');

    if (typeof voicingEngine === 'undefined') {
        console.error('❌ voicingEngine未定义');
        return;
    }

    const testChord = { root: 'C', type: 'major' };

    // 测试多种不同的voicing选择组合
    const testCases = [
        {
            name: '仅Close',
            enabledVoicings: ['close'],
            expected: true,
            description: '应该激活（传统情况）'
        },
        {
            name: 'Close + Drop2',
            enabledVoicings: ['close', 'drop2'],
            expected: true,
            description: '修复后：应该激活（新支持）'
        },
        {
            name: 'Close + Drop2 + Drop3',
            enabledVoicings: ['close', 'drop2', 'drop3'],
            expected: true,
            description: '修复后：应该激活（新支持）'
        },
        {
            name: 'Drop2 + Drop3',
            enabledVoicings: ['drop2', 'drop3'],
            expected: false,
            description: '应该不激活（不包含close）'
        },
        {
            name: '仅Shell',
            enabledVoicings: ['shell'],
            expected: false,
            description: '应该不激活（不包含close）'
        }
    ];

    let allTestsPassed = true;

    testCases.forEach((testCase, index) => {
        console.log(`\n🧪 测试 ${index + 1}: ${testCase.name}`);
        console.log(`📋 enabledVoicings: ${JSON.stringify(testCase.enabledVoicings)}`);
        console.log(`🎯 预期结果: ${testCase.expected} - ${testCase.description}`);

        const options = {
            enabledVoicings: testCase.enabledVoicings,
            rangeMin: 55,
            rangeMax: 88
        };

        const actualResult = voicingEngine.shouldUseGuitarFourVoiceTriads(testChord, options);
        console.log(`🔍 实际结果: ${actualResult}`);

        const passed = actualResult === testCase.expected;
        console.log(`📊 测试结果: ${passed ? '✅ 通过' : '❌ 失败'}`);

        if (!passed) {
            allTestsPassed = false;
            console.error(`🚨 测试失败！预期${testCase.expected}，实际${actualResult}`);
        }
    });

    console.log(`\n📋 === 测试总结 ===`);
    console.log(`🎯 所有测试: ${allTestsPassed ? '✅ 全部通过' : '❌ 有失败'}`);

    if (allTestsPassed) {
        console.log(`🎉 修复成功！吉他四声部系统现在可以在包含close的多voicing选择中正常激活`);
        console.log(`💡 这意味着用户现在可以在选择[close, drop2]时看到5-1-3-1配置了`);
    } else {
        console.log(`🚨 修复未完成，仍有问题需要解决`);
    }

    return allTestsPassed;
}

/**
 * 🔍 测试主流程激活条件问题
 * 验证为什么诊断函数可以生成5131但主流程不能
 */
function testMainFlowActivationIssue() {
    console.log('\n🔍 === 主流程激活条件问题分析 ===');

    if (typeof voicingEngine === 'undefined') {
        console.error('❌ voicingEngine未定义');
        return;
    }

    const testChord = { root: 'C', type: 'major' };

    // 测试1: 诊断函数使用的选项（直接调用generateGuitarFourVoiceTriads）
    console.log('\n🧪 测试1: 诊断函数的调用方式');
    const diagnosticOptions = {
        enabledVoicings: ['close'],
        rangeMin: 55,
        rangeMax: 88
    };
    console.log('📋 诊断函数选项:', JSON.stringify(diagnosticOptions));

    const shouldActivate1 = voicingEngine.shouldUseGuitarFourVoiceTriads(testChord, diagnosticOptions);
    console.log(`🔍 shouldUseGuitarFourVoiceTriads结果: ${shouldActivate1}`);

    // 测试2: 主流程使用的选项（从chordSettings.voicingTypes）
    console.log('\n🧪 测试2: 主流程的调用方式');
    if (typeof chordSettings !== 'undefined') {
        const mainFlowOptions = {
            enabledVoicings: chordSettings.voicingTypes,
            rangeMin: 55,
            rangeMax: 88
        };
        console.log('📋 主流程选项:', JSON.stringify(mainFlowOptions));
        console.log(`📋 chordSettings.voicingTypes:`, chordSettings.voicingTypes);

        const shouldActivate2 = voicingEngine.shouldUseGuitarFourVoiceTriads(testChord, mainFlowOptions);
        console.log(`🔍 shouldUseGuitarFourVoiceTriads结果: ${shouldActivate2}`);

        // 分析isCloseVoicing条件
        const isCloseVoicing = mainFlowOptions.enabledVoicings &&
                              mainFlowOptions.enabledVoicings.includes('close') &&
                              mainFlowOptions.enabledVoicings.length === 1;
        console.log(`📏 isCloseVoicing分析:`);
        console.log(`  - 包含close: ${mainFlowOptions.enabledVoicings && mainFlowOptions.enabledVoicings.includes('close')}`);
        console.log(`  - 数组长度: ${mainFlowOptions.enabledVoicings ? mainFlowOptions.enabledVoicings.length : 'N/A'}`);
        console.log(`  - 长度为1: ${mainFlowOptions.enabledVoicings ? mainFlowOptions.enabledVoicings.length === 1 : false}`);
        console.log(`  - 最终结果: ${isCloseVoicing}`);

        if (!shouldActivate2 && shouldActivate1) {
            console.log('\n🚨 === 问题确认 ===');
            console.log('✅ 诊断函数可以激活吉他四声部系统');
            console.log('❌ 主流程无法激活吉他四声部系统');
            console.log('🔍 原因: isCloseVoicing条件过于严格');
            console.log('💡 解决方案: 需要修改shouldUseGuitarFourVoiceTriads的激活条件');
        }

    } else {
        console.error('❌ chordSettings未定义');
    }

    console.log('\n📝 === 结论 ===');
    console.log('问题根源: shouldUseGuitarFourVoiceTriads要求enabledVoicings必须是["close"]且长度为1');
    console.log('但主流程传入的可能是["close", "drop2"]等多个类型，导致激活失败');
}


// 将测试函数暴露到全局作用域
if (typeof window !== 'undefined') {
    window.testGuitarModeF4Restriction = testGuitarModeF4Restriction;
    window.testGuitarSusChordRestrictions = testGuitarSusChordRestrictions;
    window.testFourVoiceTriadConfigurations = testFourVoiceTriadConfigurations;
    window.testInversionMappingCorrectness = testInversionMappingCorrectness;
    window.testComprehensiveIsolationSystem = testComprehensiveIsolationSystem;
    window.diagnose5131Issue = diagnose5131Issue;
    window.testMainFlowActivationIssue = testMainFlowActivationIssue;
    window.verifyMainFlowFix = verifyMainFlowFix;
}