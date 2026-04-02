/**
 * 音程视奏设置管理模块
 * 版本：5.0.0 - 全新音域管理系统
 * 负责管理所有用户设置
 */

class IntervalSettings {
    constructor() {
        console.log('📋 IntervalSettings V5.0 初始化');

        // 🎼 新的音域设置系统
        this.userSettings = this.loadUserSettings();
        this.isUpdatingUI = false; // 防止UI更新时触发循环事件
        this.lastSelectedClef = null; // 跟踪上次选择的谱号
        this.activeClef = 'treble';    // 活动谱号（作为权威来源，避免依赖全局window）

        // 兼容性：保持旧的绑定系统用于向后兼容
        this.clefRangeBindings = this.convertToOldFormat();

        console.log('🎼 已加载用户音域设置:', this.userSettings);

        // 🆕 音域验证范围常量 (A2-A6)
        this.SUPPORTED_RANGE = { min: 33, max: 93 };

        // 音程类型映射 - 匹配HTML页面中的所有音程类型
        this.intervalMapping = {
            // 传统音程命名系统
            'interval-unison': { name: 'unison', semitones: 0, displayName: '同度' },
            'interval-minor2': { name: 'minor2nd', semitones: 1, displayName: '小二度' },
            'interval-major2': { name: 'major2nd', semitones: 2, displayName: '大二度' },
            'interval-minor3': { name: 'minor3rd', semitones: 3, displayName: '小三度' },
            'interval-major3': { name: 'major3rd', semitones: 4, displayName: '大三度' },
            'interval-perfect4': { name: 'perfect4th', semitones: 5, displayName: '完全四度' },
            'interval-tritone': { name: 'tritone', semitones: 6, displayName: '三全音' },
            'interval-perfect5': { name: 'perfect5th', semitones: 7, displayName: '完全五度' },
            'interval-minor6': { name: 'minor6th', semitones: 8, displayName: '小六度' },
            'interval-major6': { name: 'major6th', semitones: 9, displayName: '大六度' },
            'interval-minor7': { name: 'minor7th', semitones: 10, displayName: '小七度' },
            'interval-major7': { name: 'major7th', semitones: 11, displayName: '大七度' },
            'interval-octave': { name: 'octave', semitones: 12, displayName: '八度' },

            // 数字音程命名系统 (用于向后兼容和特定用途)
            'interval-1': { name: 'semitone1', semitones: 1, displayName: '1半音' },
            'interval-2': { name: 'semitone2', semitones: 2, displayName: '2半音' },
            'interval-3': { name: 'semitone3', semitones: 3, displayName: '3半音' },
            'interval-4': { name: 'semitone4', semitones: 4, displayName: '4半音' },
            'interval-5': { name: 'semitone5', semitones: 5, displayName: '5半音' },
            'interval-6': { name: 'semitone6', semitones: 6, displayName: '6半音' },
            'interval-7': { name: 'semitone7', semitones: 7, displayName: '7半音' },
            'interval-8': { name: 'semitone8', semitones: 8, displayName: '8半音' },
            'interval-9': { name: 'semitone9', semitones: 9, displayName: '9半音' },
            'interval-10': { name: 'semitone10', semitones: 10, displayName: '10半音' },
            'interval-11': { name: 'semitone11', semitones: 11, displayName: '11半音' },
            'interval-12': { name: 'semitone12', semitones: 12, displayName: '12半音' }
        };
    }

    /**
     * 获取当前用户设置
     * @returns {Object} 包含所有设置的对象
     */
    getCurrentSettings() {
        const clef = this.getClef();

        // 🎼 检查谱号是否发生变化，如果是则更新UI
        if (this.lastSelectedClef !== clef) {
            console.log(`🎼 检测到谱号变化: ${this.lastSelectedClef} → ${clef}`);
            this.lastSelectedClef = clef;

            // 延迟更新UI，避免在生成过程中更新导致的问题
            setTimeout(() => {
                this.updateRangeUIForClef(clef);
            }, 50);
        }

        // 🎼 智能音域绑定：使用谱号对应的音域设置
        const smartRange = this.getSmartRangeForClef(clef);

        // 先确定拍号，再基于该拍号收集节奏，避免“拍号与节奏优化不一致”的随机问题
        const ts = this.getTimeSignature();
        const settings = {
            intervalTypes: this.getSelectedIntervalTypes(),
            keySignature: this.getKeySignature(),
            timeSignature: ts,
            tempo: this.getTempo(),
            measureCount: this.getMeasureCount(),
            measureLogicCount: this.getMeasureLogicCount(),
            practiceMode: this.getPracticeMode(),
            clef: clef,
            rangeMin: smartRange.min,
            rangeMax: smartRange.max,
            rhythms: this.getSelectedRhythms(ts) // 基于已选拍号获取节奏
        };

        console.log('📋 当前设置:', settings);
        console.log(`🎼 智能音域: ${clef} → ${this.midiToNote(smartRange.min)}-${this.midiToNote(smartRange.max)}`);
        return settings;
    }

    /**
     * 获取选中的音程类型
     * @returns {Array} 包含音程信息的数组
     */
    getSelectedIntervalTypes() {
        const selectedTypes = [];

        // 获取所有选中的复选框
        const checkboxes = document.querySelectorAll('#intervalTypeModal input[type="checkbox"]:checked');

        checkboxes.forEach(checkbox => {
            const mapping = this.intervalMapping[checkbox.id];
            if (mapping) {
                selectedTypes.push({
                    id: checkbox.id,
                    name: mapping.name,
                    semitones: mapping.semitones,
                    displayName: mapping.displayName
                });
            }
        });

        // 如果没有选择任何音程，使用默认值
        if (selectedTypes.length === 0) {
            console.warn('⚠️ 没有选择音程，使用默认值：小三度和大三度');
            selectedTypes.push(
                { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                { name: 'major3rd', semitones: 4, displayName: '大三度' }
            );
        }

        console.log('✅ 选中的音程类型:', selectedTypes.map(t => `${t.displayName}(${t.semitones}半音)`).join(', '));
        return selectedTypes;
    }

    /**
     * 获取调号设置
     * @returns {string[]} 调号数组
     */
    getKeySignature() {
        const checkedKeys = [];
        const keyCheckboxes = document.querySelectorAll('[id^="key-"]:checked');

        keyCheckboxes.forEach(checkbox => {
            checkedKeys.push(checkbox.value);
        });

        // 如果没有选择任何调号，默认使用C大调
        if (checkedKeys.length === 0) {
            checkedKeys.push('C');
        }

        return checkedKeys;
    }

    /**
     * 获取音域设置 - 最低音
     * @returns {number} MIDI音符号
     */
    getRangeMin() {
        const select = document.getElementById('rangeMin');
        if (select && select.value) {
            return parseInt(select.value);
        }
        return 60; // 默认C4
    }

    /**
     * 获取音域设置 - 最高音
     * @returns {number} MIDI音符号
     */
    getRangeMax() {
        const select = document.getElementById('rangeMax');
        if (select && select.value) {
            return parseInt(select.value);
        }
        return 71; // 默认B4
    }

    /**
     * 获取拍号设置
     * @returns {Object} 拍号对象
     */
    getTimeSignature() {
        // 查找timeSignatureModal中选中的拍号复选框
        const checkboxes = document.querySelectorAll('#timeSignatureModal input[type="checkbox"]:checked');

        if (checkboxes.length > 0) {
            // 🎲 随机从用户勾选的拍号中选择（不再强制优先6/8）
            const randomIndex = Math.floor(Math.random() * checkboxes.length);
            const value = checkboxes[randomIndex].value;
            console.log(`🎼 从${checkboxes.length}个选中的拍号中随机选择: ${value}`);

            if (value && value.includes('/')) {
                const [beats, beatType] = value.split('/');
                return {
                    beats: parseInt(beats),
                    beatType: parseInt(beatType)
                };
            }
        }

        console.log('🎼 使用默认拍号: 4/4拍');
        return { beats: 4, beatType: 4 }; // 默认4/4拍
    }

    /**
     * 获取速度设置
     * @returns {number} BPM值
     */
    getTempo() {
        // 优先使用节拍器输入框的值
        const headerInput = document.getElementById('headerMetronomeBpm');
        if (headerInput && headerInput.value) {
            const tempo = parseInt(headerInput.value);
            if (tempo >= 1 && tempo <= 999) {
                return tempo;
            }
        }

        // 尝试使用全局变量
        if (typeof window.metronomeTempo !== 'undefined' && window.metronomeTempo) {
            const tempo = parseInt(window.metronomeTempo);
            if (tempo >= 1 && tempo <= 999) {
                return tempo;
            }
        }

        // 备用：查找其他可能的tempo输入
        const input = document.getElementById('tempo');
        if (input && input.value) {
            const tempo = parseInt(input.value);
            if (tempo >= 1 && tempo <= 999) {
                return tempo;
            }
        }

        return 60; // 默认60 BPM
    }

    /**
     * 获取小节数设置
     * @returns {number} 小节数
     */
    getMeasureCount() {
        if (typeof window !== 'undefined' && typeof window.getSelectedMeasureConfig === 'function') {
            const config = window.getSelectedMeasureConfig();
            if (config && Number.isFinite(config.actual) && config.actual >= 1 && config.actual <= 32) {
                return config.actual;
            }
        }
        const radios = document.getElementsByName('measures');
        for (const radio of radios) {
            if (radio.checked) {
                const count = parseInt(radio.value);
                if (count >= 1 && count <= 32) {
                    return count;
                }
            }
        }
        return 4; // 默认4小节
    }

    getMeasureLogicCount() {
        if (typeof window !== 'undefined' && typeof window.getSelectedMeasureConfig === 'function') {
            const config = window.getSelectedMeasureConfig();
            if (config && Number.isFinite(config.logic)) {
                return config.logic;
            }
        }
        return this.getMeasureCount();
    }

    /**
     * 获取练习模式
     * @returns {string} 练习模式
     */
    getPracticeMode() {
        const radios = document.getElementsByName('practice-mode');
        for (const radio of radios) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return 'harmonic'; // 默认和声音程
    }

    /**
     * 获取谱号设置
     * @returns {string} 谱号
     */
    getClef() {
        // 查找clefModal中选中的谱号复选框
        const checkboxes = document.querySelectorAll('#clefModal input[type="checkbox"]:checked');

        if (checkboxes.length > 0) {
            // 🎯 修复：从所有选中的谱号中随机选择一个，而不是总是使用第一个
            const randomIndex = Math.floor(Math.random() * checkboxes.length);
            const selectedClef = checkboxes[randomIndex].value;
            console.log(`🎼 从${checkboxes.length}个选中的谱号中随机选择: ${selectedClef}`);
            // 设为活动谱号
            this.activeClef = selectedClef;
            try { if (typeof window !== 'undefined') window.currentActiveClef = selectedClef; } catch (e) {}
            return selectedClef;
        }

        // 备用：查找其他可能的谱号设置
        const select = document.getElementById('clef');
        if (select && select.value) {
            return select.value;
        }

        this.activeClef = 'treble';
        try { if (typeof window !== 'undefined') window.currentActiveClef = 'treble'; } catch (e) {}
        return 'treble'; // 默认高音谱号
    }

    /**
     * 验证设置有效性
     * @param {Object} settings - 要验证的设置
     * @returns {Object} 验证结果
     */
    validateSettings(settings) {
        const errors = [];
        const warnings = [];

        // 验证音程类型
        if (!settings.intervalTypes || settings.intervalTypes.length === 0) {
            errors.push('至少需要选择一个音程类型');
        }

        // 验证调号
        const validKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
                          'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'];

        if (Array.isArray(settings.keySignature)) {
            // 新格式：调号数组
            const invalidKeys = settings.keySignature.filter(key => !validKeys.includes(key));
            if (invalidKeys.length > 0) {
                warnings.push(`不支持的调号: ${invalidKeys.join(', ')}，已过滤`);
                settings.keySignature = settings.keySignature.filter(key => validKeys.includes(key));
            }
            if (settings.keySignature.length === 0) {
                warnings.push('没有有效的调号，使用C大调');
                settings.keySignature = ['C'];
            }
        } else {
            // 旧格式：单个调号，转换为数组
            if (!validKeys.includes(settings.keySignature)) {
                warnings.push(`不支持的调号: ${settings.keySignature}，使用C大调`);
                settings.keySignature = ['C'];
            } else {
                settings.keySignature = [settings.keySignature];
            }
        }

        // 验证速度
        if (settings.tempo < 40 || settings.tempo > 200) {
            warnings.push(`速度超出范围: ${settings.tempo}，使用默认60 BPM`);
            settings.tempo = 60;
        }

        // 验证小节数
        if (settings.measureCount < 1 || settings.measureCount > 32) {
            warnings.push(`小节数超出范围: ${settings.measureCount}，使用默认4小节`);
            settings.measureCount = 4;
        }

        // 验证音域设定
        if (settings.rangeMin < 21 || settings.rangeMin > 108) {
            warnings.push(`最低音超出范围: ${settings.rangeMin}，使用默认C4`);
            settings.rangeMin = 60;
        }

        if (settings.rangeMax < 21 || settings.rangeMax > 108) {
            warnings.push(`最高音超出范围: ${settings.rangeMax}，使用默认B4`);
            settings.rangeMax = 71;
        }

        if (settings.rangeMin >= settings.rangeMax) {
            warnings.push(`音域设定无效(最低音≥最高音)，使用默认范围C4-B4`);
            settings.rangeMin = 60;
            settings.rangeMax = 71;
        }

        // 验证6/8拍特殊要求
        if (this.is68Time(settings.timeSignature)) {
            this.validate68TimeSignature(settings, errors, warnings);
        }

        const isValid = errors.length === 0;

        if (errors.length > 0) {
            console.error('❌ 设置验证失败:', errors);
        }
        if (warnings.length > 0) {
            console.warn('⚠️ 设置警告:', warnings);
        }

        return {
            isValid,
            errors,
            warnings,
            settings
        };
    }

    /**
     * 获取默认设置
     * @returns {Object} 默认设置
     */
    getDefaultSettings() {
        return {
            intervalTypes: [
                { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                { name: 'major3rd', semitones: 4, displayName: '大三度' }
            ],
            keySignature: 'C',
            timeSignature: { beats: 4, beatType: 4 },
            tempo: 60,
            measureCount: 4,
            practiceMode: 'harmonic',
            clef: 'treble'
        };
    }

    /**
     * 获取设置摘要
     * @param {Object} settings - 设置对象
     * @returns {string} 设置摘要文本
     */
    getSettingsSummary(settings) {
        const intervalNames = settings.intervalTypes.map(t => t.displayName).join(', ');
        const keyNames = Array.isArray(settings.keySignature)
            ? settings.keySignature.join(', ')
            : settings.keySignature;
        const rangeInfo = `${this.midiToNote(settings.rangeMin)}-${this.midiToNote(settings.rangeMax)}`;

        return `音程: ${intervalNames} | 调号: ${keyNames} | 音域: ${rangeInfo} | 拍号: ${settings.timeSignature.beats}/${settings.timeSignature.beatType} | 速度: ${settings.tempo} BPM | ${settings.measureCount}小节`;
    }

    /**
     * MIDI音符号转音符名（支持调号）
     * @param {number} midi - MIDI音符号
     * @param {string} keySignature - 调号（可选）
     * @returns {string} 音符名
     */
    midiToNote(midi, keySignature = null) {
        const octave = Math.floor(midi / 12) - 1;
        const noteValue = midi % 12;

        // 根据调号选择合适的音符名表
        let noteNames;
        if (keySignature) {
            const sharpKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m'];
            const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'];

            if (sharpKeys.includes(keySignature)) {
                // 升号调使用升号音名
                noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            } else if (flatKeys.includes(keySignature)) {
                // 降号调使用降号音名
                noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
            } else {
                // 默认使用升号音名
                noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            }
        } else {
            // 没有指定调号时使用升号音名（保持向后兼容）
            noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        }

        const note = noteNames[noteValue];
        return `${note}${octave}`;
    }

    // 向后兼容旧版本方法（已弃用）
    getSelectedKeySignatures() {
        console.warn('⚠️ getSelectedKeySignatures已弃用，请使用getKeySignature');
        return [this.getKeySignature()];
    }

    getSelectedTimeSignatures() {
        console.warn('⚠️ getSelectedTimeSignatures已弃用，请使用getTimeSignature');
        const ts = this.getTimeSignature();
        return [`${ts.beats}/${ts.beatType}`];
    }

    getSelectedClefs() {
        console.warn('⚠️ getSelectedClefs已弃用，请使用getClef');
        return [this.getClef()];
    }

    /**
     * 获取选中的节奏类型
     * @returns {Array} 选中的节奏类型数组
     */
    getSelectedRhythms(currentTs = null) {
        const selectedRhythms = [];

        // 获取所有选中的节奏复选框
        const rhythmCheckboxes = document.querySelectorAll('#rhythmModal input[type="checkbox"]:checked');

        rhythmCheckboxes.forEach(checkbox => {
            selectedRhythms.push({
                value: checkbox.value,
                displayName: this.getRhythmDisplayName(checkbox.value)
            });
        });

        // 6/8 默认优化：仅四分+八分（移除二分与附点类型），若缺少八分则补充
        try {
            // 使用调用方已经选定的拍号，避免再次随机选择造成不一致
            const ts = currentTs || (this.getTimeSignature ? this.getTimeSignature() : null);
            const is68 = ts && ts.beats === 6 && ts.beatType === 8;
            if (is68) {
                // 过滤不适合6/8默认的类型
                let filtered = selectedRhythms.filter(r => r.value !== 'half' && r.value !== 'half.');
                // 6/8 优先拍是附点四分（quarter.），确保存在
                const hasDottedQuarter = filtered.some(r => r.value === 'quarter.');
                const hasEighth = filtered.some(r => r.value === 'eighth');
                if (!hasDottedQuarter) filtered.push({ value: 'quarter.', displayName: this.getRhythmDisplayName('quarter.') });
                if (!hasEighth) filtered.push({ value: 'eighth', displayName: this.getRhythmDisplayName('eighth') });
                console.log('🎼 6/8默认节奏优化:', filtered.map(r => r.value));
                return filtered;
            }
        } catch (e) {
            console.warn('6/8默认节奏优化失败，使用原选择:', e);
        }

        // 如果没有选择任何节奏，使用默认值
        if (selectedRhythms.length === 0) {
            console.warn('⚠️ 没有选择节奏，使用默认值：二分音符和四分音符');
            selectedRhythms.push(
                { value: 'half', displayName: '二分音符' },
                { value: 'quarter', displayName: '四分音符' }
            );
        }

        console.log('✅ 选中的节奏类型:', selectedRhythms.map(r => r.displayName).join(', '));
        return selectedRhythms;
    }

    /**
     * 获取节奏类型的显示名称
     * @param {string} rhythmValue - 节奏值
     * @returns {string} 显示名称
     */
    getRhythmDisplayName(rhythmValue) {
        const rhythmNames = {
            'whole': '全音符',
            'half.': '附点二分音符',
            'half': '二分音符',
            'quarter.': '附点四分音符',
            'quarter': '四分音符',
            'eighth': '八分音符',
            '16th': '十六分音符',
            'triplet': '三连音',
            'duplet': '二连音',
            'quadruplet': '四连音'
        };
        return rhythmNames[rhythmValue] || rhythmValue;
    }

    getSelectedArticulations() {
        return [];
    }

    getLowestNote() {
        return 'C3';
    }

    getHighestNote() {
        return 'C6';
    }

    getAccidentalFrequency() {
        return 0;
    }

    getMaxInterval() {
        return 12;
    }

    getSelectedMeasures() {
        return this.getMeasureCount();
    }

    /**
     * 获取谱号对应的推荐音域（参考旋律视奏工具）
     * @param {string} clef - 谱号类型
     * @returns {Object} 包含min和max的音域对象
     */
    /**
     * 获取谱号对应的默认音域设置
     * @param {string} clef - 谱号类型
     * @returns {Object} 包含min和max的音域对象
     */
    getClefDefaultRange(clef) {
        const fallback = {
            'treble': { min: 60, max: 81 },  // C4-A5
            'alto': { min: 50, max: 71 },    // D3-B4
            'bass': { min: 40, max: 64 }     // E2-E4
        };
        const selectedClef = clef || 'treble';
        // 优先使用会话内保存的默认范围
        if (this.userSettings && this.userSettings.defaultRanges && this.userSettings.defaultRanges[selectedClef]) {
            return this.userSettings.defaultRanges[selectedClef];
        }
        return fallback[selectedClef] || fallback['treble'];
    }

    /**
     * @deprecated 使用 getClefDefaultRange 代替
     */
    getClefRecommendedRange(clef) {
        console.warn('⚠️ getClefRecommendedRange已弃用，请使用getClefDefaultRange');
        return this.getClefDefaultRange(clef);
    }

    /**
     * 🎼 谱号-音域智能绑定系统方法
     */

    /**
     * 加载谱号音域绑定数据
     * @returns {Object} 谱号音域绑定对象
     */
    /**
     * 🆕 加载新的用户设置格式
     * @returns {Object} 用户设置对象
     */
    loadUserSettings() {
        // 🎯 页面刷新时总是从默认音域开始，但保持会话内音域记忆功能
        console.log('🔄 页面加载：重置为默认音域设置');
        return this.getDefaultUserSettings();
    }

    /**
     * 🆕 从localStorage加载历史设置（如果需要的话）
     * @returns {Object} 用户设置对象
     */
    loadUserSettingsFromStorage() {
        try {
            const saved = localStorage.getItem('intervalUserSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                console.log('📂 从localStorage加载历史设置:', settings);
                // 验证和升级设置格式
                return this.validateUserSettings(settings);
            }
        } catch (error) {
            console.warn('⚠️ 加载用户设置失败:', error);
        }

        // 返回默认设置
        return this.getDefaultUserSettings();
    }

    /**
     * 🆕 获取默认用户设置
     * @returns {Object} 默认设置对象
     */
    getDefaultUserSettings() {
        return {
            // 当前音域（会话内可变）
            clefRanges: {
                treble: { customRange: null, hasCustomRange: false },
                alto: { customRange: null, hasCustomRange: false },
                bass: { customRange: null, hasCustomRange: false }
            },
            // 作为"默认音域"的持久映射（会话内更新，作为新的默认）
            defaultRanges: {
                treble: { min: 60, max: 81 }, // C4–A5
                alto: { min: 50, max: 71 },   // D3–B4
                bass: { min: 40, max: 64 }    // E2–E4
            },
            customRange: { min: 60, max: 72 }, // 向后兼容的全局设置
            version: '5.1'  // 升级版本以重置默认音域为 C4-A5
        };
    }

    /**
     * 🆕 验证和升级用户设置格式
     * @param {Object} settings - 待验证的设置
     * @returns {Object} 验证后的设置
     */
    validateUserSettings(settings) {
        const defaultSettings = this.getDefaultUserSettings();

        // 确保必要的结构存在
        if (!settings.clefRanges) {
            settings.clefRanges = defaultSettings.clefRanges;
        }

        // 确保所有谱号都有设置
        ['treble', 'alto', 'bass'].forEach(clef => {
            if (!settings.clefRanges[clef]) {
                settings.clefRanges[clef] = { customRange: null, hasCustomRange: false };
            }
        });

        // 确保向后兼容的全局设置存在
        if (!settings.customRange) {
            settings.customRange = defaultSettings.customRange;
        }

        // 确保默认范围存在
        if (!settings.defaultRanges) {
            settings.defaultRanges = defaultSettings.defaultRanges;
        }
        // 校验默认范围有效性
        ['treble','alto','bass'].forEach(clef => {
            const dr = settings.defaultRanges[clef] || defaultSettings.defaultRanges[clef];
            if (!dr || typeof dr.min !== 'number' || typeof dr.max !== 'number' || dr.min >= dr.max) {
                settings.defaultRanges[clef] = defaultSettings.defaultRanges[clef];
            } else {
                // 夹取到支持范围
                dr.min = Math.max(33, Math.min(93, dr.min));
                dr.max = Math.max(33, Math.min(93, dr.max));
                settings.defaultRanges[clef] = dr;
            }
        });

        // 验证音域范围 (A2-A6: MIDI 33-93)
        if (settings.customRange.min < 33 || settings.customRange.min > 93) {
            settings.customRange.min = 60;
        }
        if (settings.customRange.max < 33 || settings.customRange.max > 93) {
            settings.customRange.max = 72;
        }

        settings.version = '5.0';
        return settings;
    }

    /**
     * @deprecated 使用新的 loadUserSettings 代替
     */
    loadClefRangeBindings() {
        console.warn('⚠️ loadClefRangeBindings已弃用，使用新的userSettings系统');
        return this.convertToOldFormat();
    }

    /**
     * 🆕 保存用户设置到 localStorage（持久化）
     */
    saveUserSettings() {
        // 保存到 localStorage，刷新后保留用户设置
        try {
            localStorage.setItem('intervalUserSettings', JSON.stringify(this.userSettings));
            console.log('💾 用户音域设置已保存到 localStorage');
            console.log('📋 当前音域设置:', JSON.stringify(this.userSettings, null, 2));
        } catch (error) {
            console.warn('⚠️ 设置保存失败:', error);
        }
    }

    /**
     * 🆕 为向后兼容转换为旧格式
     * @returns {Object} 旧格式的绑定对象
     */
    convertToOldFormat() {
        const oldFormat = {};

        ['treble', 'alto', 'bass'].forEach(clef => {
            const clefSetting = this.userSettings.clefRanges[clef];
            if (clefSetting.hasCustomRange && clefSetting.customRange) {
                oldFormat[clef] = {
                    min: clefSetting.customRange.min,
                    max: clefSetting.customRange.max,
                    isCustom: true
                };
            } else {
                const defaultRange = this.getClefDefaultRange(clef);
                oldFormat[clef] = {
                    min: defaultRange.min,
                    max: defaultRange.max,
                    isCustom: false
                };
            }
        });

        return oldFormat;
    }

    /**
     * @deprecated 使用新的 saveUserSettings 代替
     */
    saveClefRangeBindings() {
        console.warn('⚠️ saveClefRangeBindings已弃用，使用新的saveUserSettings');
        this.saveUserSettings();
    }

    /**
     * 🆕 获取指定谱号的当前音域设置
     * @param {string} clef - 谱号类型
     * @returns {Object} 音域对象 {min, max}
     */
    getClefCurrentRange(clef) {
        const selectedClef = clef || 'treble';
        const clefSetting = this.userSettings.clefRanges[selectedClef];

        if (clefSetting && clefSetting.hasCustomRange && clefSetting.customRange) {
            console.log(`🎼 获取谱号 ${selectedClef} 自定义音域: ${this.midiToNote(clefSetting.customRange.min)}-${this.midiToNote(clefSetting.customRange.max)}`);
            return {
                min: clefSetting.customRange.min,
                max: clefSetting.customRange.max
            };
        }

        // 使用默认音域
        const defaultRange = this.getClefDefaultRange(selectedClef);
        console.log(`🎼 使用谱号 ${selectedClef} 默认音域: ${this.midiToNote(defaultRange.min)}-${this.midiToNote(defaultRange.max)}`);
        return defaultRange;
    }

    /**
     * 🆕 为指定谱号设置自定义音域
     * @param {string} clef - 谱号类型
     * @param {number} min - 最低音MIDI值
     * @param {number} max - 最高音MIDI值
     */
    setClefRange(clef, min, max) {
        const selectedClef = clef || 'treble';

        // 验证音域范围 (A2-A6: MIDI 33-93)
        const validatedMin = Math.max(33, Math.min(93, min));
        const validatedMax = Math.max(33, Math.min(93, max));

        // 确保最低音小于最高音
        if (validatedMin >= validatedMax) {
            console.warn(`⚠️ 音域设置无效: min(${validatedMin}) >= max(${validatedMax})`);
            return;
        }

        // 设置当前音域
        this.userSettings.clefRanges[selectedClef] = {
            customRange: {
                min: validatedMin,
                max: validatedMax
            },
            hasCustomRange: true
        };

        // 同时更新“默认音域”为新的值（作为新的默认）
        if (!this.userSettings.defaultRanges) this.userSettings.defaultRanges = {};
        this.userSettings.defaultRanges[selectedClef] = { min: validatedMin, max: validatedMax };

        // 更新向后兼容的绑定系统
        this.clefRangeBindings = this.convertToOldFormat();

        console.log(`🎼 设置谱号 ${selectedClef} 自定义音域: ${this.midiToNote(validatedMin)}-${this.midiToNote(validatedMax)}`);
        this.saveUserSettings();
    }

    /**
     * 🆕 重置指定谱号到默认音域
     * @param {string} clef - 谱号类型
     */
    resetClefRange(clef) {
        const selectedClef = clef || 'treble';

        // 重置为无自定义音域状态
        this.userSettings.clefRanges[selectedClef] = {
            customRange: null,
            hasCustomRange: false
        };

        // 更新向后兼容的绑定系统
        this.clefRangeBindings = this.convertToOldFormat();

        const defaultRange = this.getClefDefaultRange(selectedClef);
        console.log(`🎼 重置谱号 ${selectedClef} 到默认音域: ${this.midiToNote(defaultRange.min)}-${this.midiToNote(defaultRange.max)}`);
        this.saveUserSettings();
    }

    /**
     * 🆕 验证音符是否在支持的音域内
     * @param {number} midiNote - MIDI音符值
     * @returns {boolean} 是否在支持范围内
     */
    isNoteInSupportedRange(midiNote) {
        return midiNote >= this.SUPPORTED_RANGE.min && midiNote <= this.SUPPORTED_RANGE.max;
    }

    /**
     * 🆕 将音符强制修正到音域边界
     * @param {number} midiNote - MIDI音符值
     * @param {Object} range - 音域对象 {min, max}
     * @returns {number} 修正后的MIDI音符值
     */
    clampNoteToRange(midiNote, range) {
        const clampedNote = Math.max(range.min, Math.min(range.max, midiNote));

        if (clampedNote !== midiNote) {
            console.log(`🎯 音符越界修正: MIDI ${midiNote} → ${clampedNote} (音域: ${range.min}-${range.max})`);
        }

        return clampedNote;
    }

    /**
     * 🆕 验证音域是否有效
     * @param {number} min - 最低音MIDI值
     * @param {number} max - 最高音MIDI值
     * @returns {boolean} 音域是否有效
     */
    isValidRange(min, max) {
        return (
            this.isNoteInSupportedRange(min) &&
            this.isNoteInSupportedRange(max) &&
            min < max &&
            (max - min) >= 12 // 至少一个八度
        );
    }

    /**
     * 获取音域设置时自动应用谱号绑定
     * @returns {number} 最低音MIDI值
     */
    getRangeMinWithBinding() {
        // 🔧 修复：优先读取UI控件的当前值，确保实时同步
        const uiValue = this.getRangeMin();
        if (uiValue !== undefined && uiValue !== null) {
            console.log(`🔍 使用UI控件的最低音值: ${uiValue}`);
            return uiValue;
        }

        // 回退到谱号绑定值
        const currentClef = this.getClef();
        const range = this.getClefCurrentRange(currentClef);
        console.log(`🔍 回退到谱号绑定的最低音值: ${range.min}`);
        return range.min;
    }

    /**
     * 获取音域设置时自动应用谱号绑定
     * @returns {number} 最高音MIDI值
     */
    getRangeMaxWithBinding() {
        // 🔧 修复：优先读取UI控件的当前值，确保实时同步
        const uiValue = this.getRangeMax();
        if (uiValue !== undefined && uiValue !== null) {
            console.log(`🔍 使用UI控件的最高音值: ${uiValue}`);
            return uiValue;
        }

        // 回退到谱号绑定值
        const currentClef = this.getClef();
        const range = this.getClefCurrentRange(currentClef);
        console.log(`🔍 回退到谱号绑定的最高音值: ${range.max}`);
        return range.max;
    }

    /**
     * 🎼 智能音域获取方法 - 为指定谱号获取合适的音域
     * @param {string} clef - 谱号类型
     * @returns {Object} 音域对象 {min, max}
     */
    getSmartRangeForClef(clef) {
        const selectedClef = clef || 'treble';

        // 获取谱号对应的当前音域设置
        const range = this.getClefCurrentRange(selectedClef);

        console.log(`🎼 智能音域获取: ${selectedClef} → ${this.midiToNote(range.min)}-${this.midiToNote(range.max)}`);
        return range;
    }

    /**
     * 设置活动谱号并同步UI（不触发保存）
     */
    setActiveClef(clef) {
        const target = clef || 'treble';
        try {
            if (typeof window !== 'undefined') {
                window.currentActiveClef = target;
                window.currentGeneratedClef = target;
            }
        } catch (e) {}
        this.activeClef = target;
        this.updateRangeUIForClef(target);
        console.log(`🎼 已设置活动谱号: ${target}`);
    }

    /**
     * 🎼 更新UI控件中的音域显示
     * @param {string} clef - 谱号类型
     */
    updateRangeUIForClef(clef) {
        const range = this.getClefCurrentRange(clef);

        // 设置更新标志，防止循环事件
        this.isUpdatingUI = true;

        // 更新UI控件
        const rangeMinSelect = document.getElementById('rangeMin');
        const rangeMaxSelect = document.getElementById('rangeMax');

        console.log(`🔍 开始更新UI音域: ${clef} → ${this.midiToNote(range.min)}-${this.midiToNote(range.max)} (MIDI: ${range.min}-${range.max})`);

        if (rangeMinSelect) {
            console.log(`🔍 找到rangeMin选择器，当前值: ${rangeMinSelect.value}，设置为: ${range.min}`);

            // 检查选项是否存在
            const minOption = rangeMinSelect.querySelector(`option[value="${range.min}"]`);
            if (minOption) {
                rangeMinSelect.value = range.min.toString();
                console.log(`🔍 设置后rangeMin值: ${rangeMinSelect.value}`);
            } else {
                console.error(`❌ rangeMin选择器中没有值为${range.min}的选项`);
                console.log(`🔍 可用选项:`, Array.from(rangeMinSelect.options).map(opt => opt.value));
            }
        } else {
            console.error('❌ 未找到rangeMin选择器');
        }

        if (rangeMaxSelect) {
            console.log(`🔍 找到rangeMax选择器，当前值: ${rangeMaxSelect.value}，设置为: ${range.max}`);

            // 检查选项是否存在
            const maxOption = rangeMaxSelect.querySelector(`option[value="${range.max}"]`);
            if (maxOption) {
                rangeMaxSelect.value = range.max.toString();
                console.log(`🔍 设置后rangeMax值: ${rangeMaxSelect.value}`);
            } else {
                console.error(`❌ rangeMax选择器中没有值为${range.max}的选项`);
                console.log(`🔍 可用选项:`, Array.from(rangeMaxSelect.options).map(opt => opt.value));
            }
        } else {
            console.error('❌ 未找到rangeMax选择器');
        }

        // 重置更新标志
        this.isUpdatingUI = false;

        console.log(`🎼 UI音域已更新: ${clef} → ${this.midiToNote(range.min)}-${this.midiToNote(range.max)}`);
    }

    /**
     * 🎼 谱号变化处理器 - 当用户选择不同谱号时调用
     * @param {string} newClef - 新选择的谱号
     */
    onClefChange(newClef) {
        console.log(`🎼 谱号变化处理开始: → ${newClef}`);

        // 保存当前音域设置到之前的谱号
        // 注意：此时应该保存到所有谱号，因为我们无法确定之前是哪个谱号
        // 更好的方案是在用户修改音域时实时保存

        // 直接更新UI为新谱号的音域
        console.log(`🎼 更新UI到新谱号: ${newClef}`);
        this.updateRangeUIForClef(newClef);
    }

    /**
     * 🎼 从UI获取当前选中的谱号
     * @returns {string} 当前谱号
     */
    getCurrentClefFromUI() {
        const clefCheckboxes = document.querySelectorAll('#clefModal input[type="checkbox"]:checked');
        if (clefCheckboxes.length > 0) {
            return clefCheckboxes[0].value;
        }
        return 'treble'; // 默认值
    }

    /**
     * 🎼 音域变化处理器 - 当用户手动更改音域时调用
     */
    onRangeChange() {
        // 如果正在更新UI，忽略change事件以防止循环
        if (this.isUpdatingUI) {
            console.log(`🔍 忽略UI更新期间的change事件`);
            return;
        }

        // 明确确定目标谱号：优先使用 currentActiveClef；否则仅当 UI 明确单选时使用该谱号；否则中止，避免串扰
        let currentClef = this.activeClef || null;
        try {
            if (!currentClef && typeof window !== 'undefined' && window.currentActiveClef) {
                currentClef = window.currentActiveClef;
            }
        } catch (e) {}
        if (!currentClef) {
            try {
                const checked = document.querySelectorAll('#clefModal input[type="checkbox"]:checked');
                if (checked && checked.length === 1) currentClef = checked[0].value;
            } catch (e) {}
        }
        if (!currentClef) {
            console.warn('⚠️ 未能确定目标谱号，已放弃保存音域（请先选定活动谱号）');
            return;
        }

        const newMin = this.getRangeMin();
        const newMax = this.getRangeMax();

        // 保存到当前谱号，并将默认音域同步更新
        this.setClefRange(currentClef, newMin, newMax);

        console.log(`🎼 音域变化已保存: ${currentClef} → ${this.midiToNote(newMin)}-${this.midiToNote(newMax)}`);
    }

    /**
     * 🎼 保存当前UI音域设置到指定谱号
     * @param {string} targetClef - 目标谱号，如果不提供则使用当前谱号
     */
    saveCurrentRangeToClef(targetClef = null) {
        let clef = targetClef;
        if (!clef) {
            try { if (typeof window !== 'undefined' && window.currentActiveClef) clef = window.currentActiveClef; } catch (e) {}
        }
        if (!clef) {
            try {
                const checked = document.querySelectorAll('#clefModal input[type="checkbox"]:checked');
                if (checked && checked.length === 1) clef = checked[0].value;
            } catch (e) {}
        }
        if (!clef) {
            console.warn('⚠️ 未能确定目标谱号，已放弃保存音域');
            return;
        }
        const currentMin = this.getRangeMin();
        const currentMax = this.getRangeMax();

        if (currentMin && currentMax && currentMin < currentMax) {
            this.setClefRange(clef, currentMin, currentMax);
            console.log(`🎼 保存音域到谱号 ${clef}: ${this.midiToNote(currentMin)}-${this.midiToNote(currentMax)}`);
        } else {
            console.warn(`🎼 音域设置无效，无法保存到谱号 ${clef}: min=${currentMin}, max=${currentMax}`);
        }
    }

    /**
     * 检测是否为6/8拍时间签名
     * @param {Object} timeSignature - 时间签名对象
     * @returns {boolean} 是否为6/8拍
     */
    is68Time(timeSignature) {
        return timeSignature &&
               timeSignature.beats === 6 &&
               timeSignature.beatType === 8;
    }

    /**
     * 验证6/8拍特殊要求
     * @param {Object} settings - 设置对象
     * @param {Array} errors - 错误数组
     * @param {Array} warnings - 警告数组
     */
    validate68TimeSignature(settings, errors, warnings) {
        console.log('🛡️ 执行6/8拍输入验证...');

        // 验证节奏类型是否适合6/8复拍子
        if (settings.rhythmTypes && settings.rhythmTypes.length > 0) {
            const invalidRhythms = settings.rhythmTypes.filter(rhythm => {
                // 6/8拍中不应该使用简单拍子的节奏
                return rhythm === 'quarter' && !rhythm.includes('.');
            });

            if (invalidRhythms.length > 0) {
                warnings.push(`6/8拍建议使用复拍子节奏类型，发现简单拍子节奏: ${invalidRhythms.join(', ')}`);
            }

            // 确保有合适的6/8节奏类型
            const valid68Rhythms = settings.rhythmTypes.filter(rhythm =>
                rhythm === 'eighth' || rhythm === 'quarter.' || rhythm === 'dotted-quarter'
            );

            if (valid68Rhythms.length === 0) {
                errors.push('6/8拍必须至少选择一种适合的复拍子节奏类型（八分音符、附点四分音符等）');
            }
        }

        // 验证频率设置
        if (settings.rhythmFrequencies) {
            const hasActiveFrequencies = Object.values(settings.rhythmFrequencies).some(freq => freq > 0);
            if (!hasActiveFrequencies) {
                warnings.push('6/8拍检测到所有节奏频率都为0，将使用默认频率设置');
            }

            // 检查是否启用了不适合6/8拍的长音符
            if (settings.rhythmFrequencies['whole'] > 0 || settings.rhythmFrequencies['half'] > 0) {
                warnings.push('6/8拍不建议使用全音符或二分音符，可能导致渲染问题');
            }
        }

        // 验证小节数设置（6/8拍生成相对复杂，建议适中的小节数）
        if (settings.measures > 8) {
            warnings.push('6/8拍生成较为复杂，建议小节数不超过8以确保稳定性');
        }

        console.log(`✅ 6/8拍验证完成，发现${errors.length}个错误，${warnings.length}个警告`);
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntervalSettings;
}

console.log('✅ IntervalSettings V5.0 加载完成 - 全新音域管理系统');
