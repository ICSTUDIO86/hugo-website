/**
 * IC Studio 钢琴和声生成器
 * Piano Chord Generator for IC Studio
 *
 * 专门为钢琴演奏设计的和声生成系统
 * Piano-specific harmonic generation system
 *
 * @version 1.0.0
 * @author IC Studio
 */

class PianoChordGenerator {
    constructor() {
        this.instrumentType = 'piano';
        this.isInitialized = false;

        // 钢琴特定的配置
        this.pianoConfig = {
            // 钢琴音域范围 (MIDI notes)
            range: {
                min: 21,  // A0
                max: 108  // C8
            },

            // 钢琴特定的voicing偏好
            voicingPreferences: {
                // 钢琴更适合密集排列和开放排列的混合
                defaultTypes: ['close', 'open', 'block'],
                // 钢琴可以轻松演奏的最大音程跨度
                maxSpread: 24, // 两个八度
                // 左右手分工
                leftHandRange: { min: 21, max: 60 }, // A0-C4
                rightHandRange: { min: 48, max: 108 } // C3-C8
            },

            // 钢琴和声理论设置
            harmonyRules: {
                // 钢琴更倾向于使用复杂和弦
                preferComplexChords: true,
                // 支持更多的转位
                allowAllInversions: true,
                // 钢琴特有的voicing技巧
                enableBlockChords: true,
                enableSpreadVoicings: true
            }
        };

        // 日志前缀
        this.logPrefix = '🎹 [Piano Generator]';

        console.log(`${this.logPrefix} 钢琴和声生成器已创建`);
    }

    /**
     * 初始化钢琴生成器
     * 使用完全独立的钢琴组件
     */
    initialize() {
        try {
            // 检查钢琴专用依赖项
            if (typeof getPianoChordProgressionGenerator === 'undefined') {
                throw new Error('钢琴和弦进行生成器未加载');
            }

            if (typeof getPianoVoicingEngine === 'undefined') {
                throw new Error('钢琴Voicing引擎未加载');
            }

            if (typeof getPianoSettingsManager === 'undefined') {
                throw new Error('钢琴设置管理器未加载');
            }

            // 初始化钢琴专用组件
            this.pianoProgressionGenerator = getPianoChordProgressionGenerator();
            this.pianoVoicingEngine = getPianoVoicingEngine();
            this.pianoSettingsManager = getPianoSettingsManager();

            this.isInitialized = true;
            console.log(`${this.logPrefix} 初始化完成 - 使用独立钢琴组件`);
            return true;

        } catch (error) {
            console.error(`${this.logPrefix} 初始化失败:`, error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * 生成钢琴和弦
     * 主生成入口函数
     */
    generatePianoChords() {
        console.log(`${this.logPrefix} 开始生成钢琴和弦...`);

        if (!this.isInitialized) {
            console.error(`${this.logPrefix} 生成器未初始化`);
            alert('钢琴和声生成器正在初始化，请稍后再试');
            return;
        }

        try {
            // 获取用户设置（使用钢琴专用设置）
            const measures = parseInt(document.querySelector('input[name="measures"]:checked')?.value || '4');
            const pianoSettings = this.pianoSettingsManager.getPianoSettings();
            const selectedKey = pianoSettings.keys[Math.floor(Math.random() * pianoSettings.keys.length)];

            console.log(`${this.logPrefix} 生成参数: ${measures}小节, 调性: ${selectedKey}`);

            // 钢琴特定的生成选项
            const pianoOptions = this.createPianoOptions(pianoSettings);

            console.log(`${this.logPrefix} 钢琴选项:`, pianoOptions);

            // 使用钢琴专用生成器生成和弦进行
            let chordProgression;

            if (pianoSettings.useFunctionalHarmony) {
                console.log(`${this.logPrefix} 使用钢琴功能和声模式`);
                chordProgression = this.pianoProgressionGenerator.generateFunctionalProgression(
                    selectedKey, measures, pianoSettings.pianoSpecific.playingStyle
                );
            } else {
                console.log(`${this.logPrefix} 使用钢琴随机和声模式`);
                chordProgression = this.pianoProgressionGenerator.generateRandomProgression(
                    selectedKey, measures, {
                        chordTypes: pianoSettings.chordTypes,
                        style: pianoSettings.pianoSpecific.playingStyle
                    }
                );
            }

            // 应用钢琴特定的voicing处理
            const processedProgression = this.processPianoProgression(chordProgression, pianoSettings);

            // 继续使用现有的渲染和播放系统
            this.renderAndDisplay(processedProgression, selectedKey);

        } catch (error) {
            console.error(`${this.logPrefix} 生成失败:`, error);
            alert('钢琴和弦生成失败，请重试');
        }
    }

    /**
     * 创建钢琴特定的生成选项
     */
    createPianoOptions(pianoSettings) {
        // 使用钢琴专用设置
        const baseOptions = {
            includeInversions: false,
            complexity: pianoSettings.complexity,
            chordTypes: pianoSettings.chordTypes,
            voicingTypes: pianoSettings.voicingTypes,
            // 钢琴特有的参数
            instrument: 'piano',
            preferredRange: this.pianoConfig.range,
            voicingStyle: pianoSettings.pianoSpecific.playingStyle,
            handSeparation: pianoSettings.pianoSpecific.handSeparation,
            pedalConsideration: pianoSettings.pianoSpecific.sustainPedal
        };

        console.log(`${this.logPrefix} 钢琴专用选项创建完成`);
        return baseOptions;
    }

    /**
     * 处理钢琴特定的和弦进行
     * 应用钢琴演奏技巧和voicing
     */
    processPianoProgression(progression, pianoSettings) {
        console.log(`${this.logPrefix} 开始处理钢琴和弦进行...`);

        if (!progression || progression.length === 0) {
            console.warn(`${this.logPrefix} 空的和弦进行`);
            return progression;
        }

        // 为每个和弦生成钢琴voicing
        const processedProgression = progression.map((chord, index) => {
            console.log(`${this.logPrefix} 处理和弦 ${index + 1}: ${chord.root}${chord.type}`);

            // 使用钢琴voicing引擎生成voicing
            const voicingOptions = {
                voicingTypes: pianoSettings.voicingTypes,
                baseOctave: 4,
                handSeparation: pianoSettings.pianoSpecific.handSeparation
            };

            const voicings = this.pianoVoicingEngine.generatePianoVoicings(chord, voicingOptions);

            // 选择最适合的voicing
            const selectedVoicing = this.selectBestPianoVoicing(voicings, pianoSettings);

            return {
                ...chord,
                pianoVoicing: selectedVoicing,
                voicingOptions: Object.keys(voicings),
                pianoMetadata: chord.pianoMetadata || {}
            };
        });

        console.log(`${this.logPrefix} 钢琴和弦进行处理完成，共${processedProgression.length}个和弦`);
        return processedProgression;
    }

    /**
     * 渲染和显示钢琴和弦
     * 复用现有的显示系统
     */
    renderAndDisplay(progression, key) {
        console.log(`${this.logPrefix} 开始渲染和显示...`);

        try {
            // 设置全局变量以供现有系统使用
            window.currentChords = progression;
            window.currentKey = key;

            // 调用现有的乐谱渲染函数
            if (typeof renderScore === 'function') {
                renderScore(progression, key);
                console.log(`${this.logPrefix} 乐谱渲染完成`);
            } else {
                console.warn(`${this.logPrefix} renderScore函数未找到`);
            }

            // 调用现有的分析面板更新
            if (typeof updateAnalysisPanel === 'function') {
                updateAnalysisPanel(progression);
                console.log(`${this.logPrefix} 分析面板更新完成`);
            }

        } catch (error) {
            console.error(`${this.logPrefix} 渲染失败:`, error);
        }
    }

    /**
     * 获取钢琴特定的voicing类型
     * 未来将实现钢琴专用的voicing
     */
    getPianoVoicingTypes() {
        // 目前返回现有类型，未来将扩展
        return ['close', 'open', 'block', 'spread'];
    }

    /**
     * 检查当前是否为钢琴模式
     */
    isPianoMode() {
        const toggle = document.getElementById('instrumentModeToggle');
        return toggle ? toggle.checked : false;
    }

    /**
     * 获取生成器状态信息
     */
    getStatus() {
        return {
            instrument: this.instrumentType,
            initialized: this.isInitialized,
            config: this.pianoConfig,
            isActive: this.isPianoMode()
        };
    }

    /**
     * 选择最适合的钢琴voicing
     */
    selectBestPianoVoicing(voicings, pianoSettings) {
        const voicingTypes = Object.keys(voicings);

        if (voicingTypes.length === 0) {
            console.warn(`${this.logPrefix} 没有可用的voicing`);
            return null;
        }

        // 根据钢琴设置选择voicing优先级
        const preferredTypes = pianoSettings.voicingTypes;

        for (const preferredType of preferredTypes) {
            if (voicings[preferredType]) {
                console.log(`${this.logPrefix} 选择${preferredType} voicing`);
                return voicings[preferredType];
            }
        }

        // 如果没有匹配的偏好，选择第一个可用的
        const firstAvailable = voicingTypes[0];
        console.log(`${this.logPrefix} 使用回退voicing: ${firstAvailable}`);
        return voicings[firstAvailable];
    }
}

// 创建全局钢琴生成器实例
let pianoChordGenerator = null;

/**
 * 初始化钢琴和声生成器
 * 在页面加载完成后调用
 */
function initializePianoChordGenerator() {
    try {
        pianoChordGenerator = new PianoChordGenerator();

        // 等待钢琴专用依赖项加载完成后再初始化
        const initInterval = setInterval(() => {
            if (typeof getPianoChordProgressionGenerator !== 'undefined' &&
                typeof getPianoVoicingEngine !== 'undefined' &&
                typeof getPianoSettingsManager !== 'undefined') {

                clearInterval(initInterval);

                if (pianoChordGenerator.initialize()) {
                    console.log('🎹 钢琴和声生成器初始化成功（完全独立）');
                } else {
                    console.error('🎹 钢琴和声生成器初始化失败');
                }
            }
        }, 100);

        // 超时保护
        setTimeout(() => {
            clearInterval(initInterval);
        }, 5000);

    } catch (error) {
        console.error('🎹 钢琴和声生成器创建失败:', error);
    }
}

/**
 * 智能生成函数 - 根据当前乐器模式选择对应的生成器
 */
function generateChordsIntelligent() {
    const toggle = document.getElementById('instrumentModeToggle');
    const isPianoMode = toggle ? toggle.checked : false;

    if (isPianoMode) {
        console.log('🎹 使用钢琴和声生成器');
        if (pianoChordGenerator && pianoChordGenerator.isInitialized) {
            pianoChordGenerator.generatePianoChords();
        } else {
            console.error('🎹 钢琴生成器未准备好，使用默认生成器');
            // 回退到默认生成器
            if (typeof generateChords === 'function') {
                generateChords();
            }
        }
    } else {
        console.log('🎸 使用吉他和声生成器');
        // 调用原始的吉他生成器
        if (typeof generateChords === 'function') {
            generateChords();
        } else {
            console.error('🎸 吉他生成器未找到');
        }
    }
}

// 在页面加载完成后初始化钢琴生成器
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePianoChordGenerator);
} else {
    initializePianoChordGenerator();
}