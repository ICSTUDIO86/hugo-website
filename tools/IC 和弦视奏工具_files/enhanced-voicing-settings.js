/**
 * Cognote 增强Voicing设置系统
 * Enhanced Voicing Settings - 支持每种voicing类型的独立转位控制
 *
 * 让用户可以单独控制close、drop2、drop3、shell等每种voicing的转位行为
 *
 * @version 1.0.0
 * @author Cognote
 */

class EnhancedVoicingSettings {
    constructor() {
        this.logPrefix = '🎛️ [Enhanced Voicing Settings]';

        // 增强的voicing设置 - 每种类型独立控制
        this.voicingSettings = {
            // 全局设置
            global: {
                enableVoiceLeading: false,
                defaultOctave: 4,
                voiceRange: {
                    bass: { min: 36, max: 60 },
                    tenor: { min: 48, max: 72 },
                    alto: { min: 60, max: 84 },
                    soprano: { min: 72, max: 96 }
                }
            },

            // 每种voicing类型的独立设置
            byType: {
                close: {
                    enableInversions: false,  // 可以独立禁用close voicing转位
                    allowedInversions: [0, 1, 2, 3],
                    preferredInversion: null,
                    inversionStrategy: 'voice_leading', // voice_leading, range_optimal, user_preference
                    sevenChordInversions: false // 特别控制七和弦转位
                },

                drop2: {
                    enableInversions: true,   // drop2可以独立启用转位
                    allowedInversions: [0, 1, 2, 3],
                    preferredInversion: null,
                    inversionStrategy: 'voice_leading',
                    sevenChordInversions: true // 允许七和弦转位
                },

                drop3: {
                    enableInversions: true,   // drop3可以独立启用转位
                    allowedInversions: [0, 1, 2, 3],
                    preferredInversion: null,
                    inversionStrategy: 'voice_leading',
                    sevenChordInversions: true
                },

                shell: {
                    enableInversions: false,  // shell voicing通常不使用转位
                    allowedInversions: [0],
                    preferredInversion: 0,
                    inversionStrategy: 'fixed',
                    sevenChordInversions: false
                }
            },

            // 和弦类型特定设置
            byChordType: {
                // 七和弦特殊处理
                seventhChords: {
                    allowedTypes: ['major7', 'minor7', 'dominant7', 'minor7b5'],
                    defaultInversionBehavior: {
                        close: 'disable',  // 'disable', 'enable', 'selective'
                        drop2: 'enable',
                        drop3: 'enable',
                        shell: 'disable'
                    }
                },

                // 挂和弦处理
                susChords: {
                    allowedTypes: ['sus2', 'sus4', '7sus2', '7sus4'],
                    forceRootPosition: true, // 挂和弦强制原位
                    disableAllInversions: true
                }
            },

            // 预设模式
            presets: {
                classic: {
                    description: '经典模式 - 所有voicing启用转位',
                    settings: {
                        close: { enableInversions: true },
                        drop2: { enableInversions: true },
                        drop3: { enableInversions: true },
                        shell: { enableInversions: false }
                    }
                },

                selective: {
                    description: '选择模式 - 只有drop voicing启用转位',
                    settings: {
                        close: { enableInversions: false },
                        drop2: { enableInversions: true },
                        drop3: { enableInversions: true },
                        shell: { enableInversions: false }
                    }
                },

                minimal: {
                    description: '简约模式 - 禁用所有转位',
                    settings: {
                        close: { enableInversions: false },
                        drop2: { enableInversions: false },
                        drop3: { enableInversions: false },
                        shell: { enableInversions: false }
                    }
                }
            }
        };

        console.log(`${this.logPrefix} 增强Voicing设置系统已创建`);
    }

    /**
     * 获取指定voicing类型的设置
     */
    getVoicingTypeSettings(voicingType) {
        const typeSettings = this.voicingSettings.byType[voicingType];
        if (!typeSettings) {
            console.warn(`${this.logPrefix} 未知voicing类型: ${voicingType}`);
            return this.getDefaultVoicingSettings();
        }

        console.log(`${this.logPrefix} 获取${voicingType}设置:`, typeSettings);
        return { ...typeSettings };
    }

    /**
     * 获取指定和弦类型的转位行为
     */
    getChordTypeInversionBehavior(chordType, voicingType) {
        // 检查七和弦
        if (this.isSeventhChord(chordType)) {
            const behavior = this.voicingSettings.byChordType.seventhChords.defaultInversionBehavior[voicingType];
            console.log(`${this.logPrefix} 七和弦${chordType}在${voicingType}中的转位行为: ${behavior}`);
            return behavior;
        }

        // 检查挂和弦
        if (this.isSusChord(chordType)) {
            console.log(`${this.logPrefix} 挂和弦${chordType}强制禁用转位`);
            return 'disable';
        }

        return 'enable'; // 默认启用
    }

    /**
     * 更新指定voicing类型的设置
     */
    updateVoicingTypeSettings(voicingType, newSettings) {
        if (!this.voicingSettings.byType[voicingType]) {
            console.error(`${this.logPrefix} 无法更新未知voicing类型: ${voicingType}`);
            return false;
        }

        Object.assign(this.voicingSettings.byType[voicingType], newSettings);
        console.log(`${this.logPrefix} ${voicingType}设置已更新:`, newSettings);
        return true;
    }

    /**
     * 应用预设模式
     */
    applyPreset(presetName) {
        const preset = this.voicingSettings.presets[presetName];
        if (!preset) {
            console.error(`${this.logPrefix} 未知预设: ${presetName}`);
            return false;
        }

        console.log(`${this.logPrefix} 应用预设: ${presetName} - ${preset.description}`);

        Object.keys(preset.settings).forEach(voicingType => {
            this.updateVoicingTypeSettings(voicingType, preset.settings[voicingType]);
        });

        return true;
    }

    /**
     * 创建针对特定和弦的voicing选项
     */
    createVoicingOptionsForChord(chord, voicingTypes) {
        const options = {
            global: { ...this.voicingSettings.global },
            byType: {}
        };

        voicingTypes.forEach(voicingType => {
            // 获取基础设置
            const baseSettings = this.getVoicingTypeSettings(voicingType);

            // 根据和弦类型调整设置
            const chordBehavior = this.getChordTypeInversionBehavior(chord.type, voicingType);

            // 应用和弦特定的转位行为
            if (chordBehavior === 'disable') {
                baseSettings.enableInversions = false;
                baseSettings.allowedInversions = [0];
            } else if (chordBehavior === 'selective') {
                // 对七和弦的选择性处理
                if (this.isSeventhChord(chord.type) && !baseSettings.sevenChordInversions) {
                    baseSettings.enableInversions = false;
                }
            }

            options.byType[voicingType] = baseSettings;

            console.log(`${this.logPrefix} ${chord.root}${chord.type}的${voicingType}设置:`, baseSettings);
        });

        return options;
    }

    /**
     * 检查是否为七和弦
     */
    isSeventhChord(chordType) {
        const seventhChordTypes = this.voicingSettings.byChordType.seventhChords.allowedTypes;
        return seventhChordTypes.some(type => chordType.includes(type.replace('7', '')) && chordType.includes('7'));
    }

    /**
     * 检查是否为挂和弦
     */
    isSusChord(chordType) {
        const susChordTypes = this.voicingSettings.byChordType.susChords.allowedTypes;
        return susChordTypes.some(type => chordType.includes('sus'));
    }

    /**
     * 获取默认设置
     */
    getDefaultVoicingSettings() {
        return {
            enableInversions: true,
            allowedInversions: [0, 1, 2, 3],
            preferredInversion: null,
            inversionStrategy: 'voice_leading',
            sevenChordInversions: true
        };
    }

    /**
     * 导出当前设置
     */
    exportSettings() {
        return JSON.stringify(this.voicingSettings, null, 2);
    }

    /**
     * 导入设置
     */
    importSettings(settingsJson) {
        try {
            const importedSettings = JSON.parse(settingsJson);
            this.voicingSettings = { ...this.voicingSettings, ...importedSettings };
            console.log(`${this.logPrefix} 设置导入成功`);
            return true;
        } catch (error) {
            console.error(`${this.logPrefix} 设置导入失败:`, error);
            return false;
        }
    }

    /**
     * 获取设置摘要
     */
    getSettingsSummary() {
        const summary = {
            global: this.voicingSettings.global,
            voicingTypes: {}
        };

        Object.keys(this.voicingSettings.byType).forEach(type => {
            const settings = this.voicingSettings.byType[type];
            summary.voicingTypes[type] = {
                转位启用: settings.enableInversions,
                允许转位: settings.allowedInversions,
                七和弦转位: settings.sevenChordInversions
            };
        });

        return summary;
    }
}

// 全局实例
let enhancedVoicingSettings = null;

/**
 * 获取增强Voicing设置管理器实例
 */
function getEnhancedVoicingSettings() {
    if (!enhancedVoicingSettings) {
        enhancedVoicingSettings = new EnhancedVoicingSettings();
        console.log('🎛️ 增强Voicing设置管理器初始化完成');
    }
    return enhancedVoicingSettings;
}

/**
 * 快捷函数：禁用Close Voicing的七和弦转位
 */
function disableCloseVoicingSeventhChordInversions() {
    const settings = getEnhancedVoicingSettings();
    settings.updateVoicingTypeSettings('close', {
        sevenChordInversions: false,
        enableInversions: false // 完全禁用close voicing转位
    });
    console.log('🚫 Close Voicing的七和弦转位已禁用');
}

/**
 * 快捷函数：启用Drop2和Drop3的独立转位
 */
function enableDropVoicingIndependentInversions() {
    const settings = getEnhancedVoicingSettings();

    settings.updateVoicingTypeSettings('drop2', {
        enableInversions: true,
        sevenChordInversions: true
    });

    settings.updateVoicingTypeSettings('drop3', {
        enableInversions: true,
        sevenChordInversions: true
    });

    console.log('✅ Drop2和Drop3的独立转位已启用');
}

// ⚠️ 增强设置系统已禁用自动初始化，避免意外干扰原系统
// 如需使用增强功能，请手动调用 getEnhancedVoicingSettings()
console.log('🎛️ 增强Voicing设置系统已加载（待激活状态）');
console.log('💡 手动启用：getEnhancedVoicingSettings()');

// 自动初始化已禁用
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', getEnhancedVoicingSettings);
// } else {
//     getEnhancedVoicingSettings();
// }