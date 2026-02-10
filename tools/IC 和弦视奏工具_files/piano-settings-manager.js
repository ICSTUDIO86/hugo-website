/**
 * IC Studio 钢琴设置管理器
 * Piano Settings Manager - 完全独立的钢琴设置系统
 *
 * 管理钢琴专用的所有配置，与吉他设置完全分离
 *
 * @version 1.0.0
 * @author IC Studio
 */

class PianoSettingsManager {
    constructor() {
        this.logPrefix = '🎹 [Piano Settings]';

        // 钢琴专用设置默认值
        this.defaultSettings = {
            // 调性设置（钢琴友好的调）
            keys: [
                'C-major', 'G-major', 'D-major', 'A-major', 'E-major',
                'F-major', 'Bb-major', 'Eb-major', 'Ab-major',
                'A-minor', 'E-minor', 'B-minor', 'F#-minor',
                'D-minor', 'G-minor', 'C-minor', 'F-minor'
            ],

            // 钢琴和弦类型偏好
            chordTypes: [
                'major', 'minor', 'diminished',           // 基础三和弦
                'major7', 'minor7', 'dominant7',          // 基础七和弦
                'major9', 'minor9', 'minor7b5'            // 扩展和弦
            ],

            // 钢琴voicing类型
            voicingTypes: [
                'close', 'open', 'rootless', 'shell'
            ],

            // 复杂度设置
            complexity: 'medium', // easy, medium, hard

            // 功能和声使用
            useFunctionalHarmony: false,

            // 钢琴特有设置
            pianoSpecific: {
                // 左右手分工
                handSeparation: true,
                leftHandRange: { min: 21, max: 60 },   // A0-C4
                rightHandRange: { min: 48, max: 108 }, // C3-C8

                // 踏板考虑
                sustainPedal: true,
                softPedal: false,
                sostenutoPedal: false,

                // 演奏风格
                playingStyle: 'classical', // classical, jazz, contemporary

                // 触键设置
                dynamics: 'medium',        // soft, medium, loud
                articulation: 'legato',    // legato, staccato, mixed

                // 音域偏好
                preferredRange: 'comfortable', // low, comfortable, high, full

                // 和弦密度
                chordDensity: 'balanced',  // sparse, balanced, dense

                // 转位偏好
                inversionPreference: 'mixed' // root, mixed, upper
            },

            // 节拍和节奏设置
            rhythmSettings: {
                timeSignatures: ['4/4', '3/4', '2/4'],
                tempoRange: { min: 60, max: 120 },
                rhythmComplexity: 'simple' // simple, moderate, complex
            },

            // 生成偏好
            generationPreferences: {
                progressionLength: 4,      // 默认4小节
                chordChanges: 'moderate',  // slow, moderate, fast
                harmonyStyle: 'traditional', // traditional, modern, experimental
                voiceLeading: 'smooth'     // smooth, dramatic, mixed
            }
        };

        // 当前设置（从默认设置复制）
        this.currentSettings = JSON.parse(JSON.stringify(this.defaultSettings));

        // 设置历史记录
        this.settingsHistory = [];

        console.log(`${this.logPrefix} 钢琴设置管理器已创建`);
    }

    /**
     * 获取当前钢琴设置
     */
    getPianoSettings() {
        return JSON.parse(JSON.stringify(this.currentSettings));
    }

    /**
     * 更新钢琴设置
     */
    updatePianoSettings(newSettings) {
        // 保存当前设置到历史
        this.settingsHistory.push(JSON.parse(JSON.stringify(this.currentSettings)));

        // 限制历史记录数量
        if (this.settingsHistory.length > 10) {
            this.settingsHistory.shift();
        }

        // 深度合并新设置
        this.currentSettings = this.deepMerge(this.currentSettings, newSettings);

        console.log(`${this.logPrefix} 设置已更新`);
        this.validateSettings();

        return this.currentSettings;
    }

    /**
     * 重置为默认设置
     */
    resetToDefaults() {
        this.currentSettings = JSON.parse(JSON.stringify(this.defaultSettings));
        console.log(`${this.logPrefix} 设置已重置为默认值`);
        return this.currentSettings;
    }

    /**
     * 撤销上一次设置更改
     */
    undoLastChange() {
        if (this.settingsHistory.length > 0) {
            this.currentSettings = this.settingsHistory.pop();
            console.log(`${this.logPrefix} 已撤销上一次设置更改`);
            return this.currentSettings;
        } else {
            console.warn(`${this.logPrefix} 没有可撤销的设置更改`);
            return this.currentSettings;
        }
    }

    /**
     * 获取钢琴演奏难度相关的设置
     */
    getDifficultySettings() {
        const complexity = this.currentSettings.complexity;

        switch (complexity) {
            case 'easy':
                return {
                    maxChordNotes: 3,
                    preferredVoicings: ['close', 'open'],
                    keyRange: 'comfortable',
                    chordTypes: ['major', 'minor', 'major7', 'minor7']
                };
            case 'medium':
                return {
                    maxChordNotes: 4,
                    preferredVoicings: ['close', 'open', 'rootless'],
                    keyRange: 'extended',
                    chordTypes: this.currentSettings.chordTypes
                };
            case 'hard':
                return {
                    maxChordNotes: 5,
                    preferredVoicings: ['rootless', 'quartal', 'cluster'],
                    keyRange: 'full',
                    chordTypes: [...this.currentSettings.chordTypes, 'altered', 'complex']
                };
            default:
                return this.getDifficultySettings.call(this, 'medium');
        }
    }

    /**
     * 根据演奏风格调整设置
     */
    applyPlayingStyle(style) {
        const styleSettings = {
            classical: {
                voicingTypes: ['close', 'open', 'spread'],
                chordTypes: ['major', 'minor', 'major7', 'minor7', 'diminished'],
                useFunctionalHarmony: true,
                pianoSpecific: {
                    playingStyle: 'classical',
                    articulation: 'legato',
                    dynamics: 'medium'
                }
            },
            jazz: {
                voicingTypes: ['rootless', 'shell', 'block'],
                chordTypes: ['major7', 'minor7', 'dominant7', 'major9', 'minor9', 'altered'],
                useFunctionalHarmony: false,
                pianoSpecific: {
                    playingStyle: 'jazz',
                    articulation: 'mixed',
                    dynamics: 'varied'
                }
            },
            contemporary: {
                voicingTypes: ['quartal', 'cluster', 'hybrid'],
                chordTypes: ['major9', 'minor11', 'add9', 'sus2', 'sus4'],
                useFunctionalHarmony: false,
                pianoSpecific: {
                    playingStyle: 'contemporary',
                    articulation: 'mixed',
                    dynamics: 'dynamic'
                }
            }
        };

        if (styleSettings[style]) {
            this.updatePianoSettings(styleSettings[style]);
            console.log(`${this.logPrefix} 已应用${style}演奏风格设置`);
        } else {
            console.warn(`${this.logPrefix} 未知演奏风格: ${style}`);
        }

        return this.currentSettings;
    }

    /**
     * 验证设置的有效性
     */
    validateSettings() {
        let isValid = true;
        const issues = [];

        // 检查必需的数组是否为空
        if (!this.currentSettings.keys || this.currentSettings.keys.length === 0) {
            issues.push('调性列表不能为空');
            isValid = false;
        }

        if (!this.currentSettings.chordTypes || this.currentSettings.chordTypes.length === 0) {
            issues.push('和弦类型列表不能为空');
            isValid = false;
        }

        if (!this.currentSettings.voicingTypes || this.currentSettings.voicingTypes.length === 0) {
            issues.push('Voicing类型列表不能为空');
            isValid = false;
        }

        // 检查音域设置
        const leftRange = this.currentSettings.pianoSpecific.leftHandRange;
        const rightRange = this.currentSettings.pianoSpecific.rightHandRange;

        if (leftRange.min >= leftRange.max) {
            issues.push('左手音域设置无效');
            isValid = false;
        }

        if (rightRange.min >= rightRange.max) {
            issues.push('右手音域设置无效');
            isValid = false;
        }

        if (issues.length > 0) {
            console.warn(`${this.logPrefix} 设置验证发现问题:`, issues);
        } else {
            console.log(`${this.logPrefix} 设置验证通过`);
        }

        return { isValid, issues };
    }

    /**
     * 导出设置为JSON
     */
    exportSettings() {
        const exportData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            settings: this.currentSettings
        };

        console.log(`${this.logPrefix} 设置已导出`);
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 从JSON导入设置
     */
    importSettings(jsonString) {
        try {
            const importData = JSON.parse(jsonString);

            if (importData.settings) {
                this.updatePianoSettings(importData.settings);
                console.log(`${this.logPrefix} 设置已从JSON导入`);
                return true;
            } else {
                console.error(`${this.logPrefix} JSON格式无效`);
                return false;
            }
        } catch (error) {
            console.error(`${this.logPrefix} JSON解析失败:`, error);
            return false;
        }
    }

    /**
     * 深度合并对象
     */
    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * 获取设置摘要信息
     */
    getSettingsSummary() {
        const settings = this.currentSettings;

        return {
            调性数量: settings.keys.length,
            和弦类型数量: settings.chordTypes.length,
            Voicing类型数量: settings.voicingTypes.length,
            复杂度: settings.complexity,
            演奏风格: settings.pianoSpecific.playingStyle,
            功能和声: settings.useFunctionalHarmony ? '启用' : '禁用',
            左右手分工: settings.pianoSpecific.handSeparation ? '启用' : '禁用'
        };
    }
}

// 全局钢琴设置管理器实例
let pianoSettingsManager = null;

/**
 * 初始化钢琴设置管理器
 */
function initializePianoSettingsManager() {
    if (!pianoSettingsManager) {
        pianoSettingsManager = new PianoSettingsManager();
        console.log('🎹 钢琴设置管理器初始化完成');
    }
    return pianoSettingsManager;
}

/**
 * 获取钢琴设置管理器实例
 */
function getPianoSettingsManager() {
    return pianoSettingsManager || initializePianoSettingsManager();
}

/**
 * 获取当前钢琴设置（便捷函数）
 */
function getPianoSettings() {
    const manager = getPianoSettingsManager();
    return manager.getPianoSettings();
}

/**
 * 更新钢琴设置（便捷函数）
 */
function updatePianoSettings(newSettings) {
    const manager = getPianoSettingsManager();
    return manager.updatePianoSettings(newSettings);
}

// 在页面加载时自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePianoSettingsManager);
} else {
    initializePianoSettingsManager();
}