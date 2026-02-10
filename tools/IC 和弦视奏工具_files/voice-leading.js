/*!
 * IC Studio - Voice Leading 分析器
 * Voice Leading Analyzer
 *
 * Copyright © 2025. All rights reserved. Igor Chen - icstudio.club
 *
 * Author: Igor Chen
 * Website: https://icstudio.club
 * Email: icstudio@fastmail.com
 */

/**
 * Voice Leading 专业分析器
 * 实现高级声部进行分析和优化
 */
class VoiceLeadingAnalyzer {
    constructor(harmonyTheory) {
        this.harmonyTheory = harmonyTheory;

        // Voice leading规则权重
        this.rules = {
            stepwiseMotion: 3,      // 级进运动权重
            commonTones: 5,         // 共同音权重
            smoothBass: 4,          // 低音平滑权重
            avoidParallels: 4,      // 避免平行权重
            contraryMotion: 2,      // 反向运动权重
            rangeConstraints: 3     // 音域限制权重
        };

        // Voice leading设置
        this.settings = {
            enableInversions: false  // 是否允许转位
        };

        // 音程质量定义
        this.intervalQualities = {
            0: 'unison',     // 同度
            1: 'minor2nd',   // 小二度
            2: 'major2nd',   // 大二度
            3: 'minor3rd',   // 小三度
            4: 'major3rd',   // 大三度
            5: 'perfect4th', // 纯四度
            6: 'tritone',    // 三全音
            7: 'perfect5th', // 纯五度
            8: 'minor6th',   // 小六度
            9: 'major6th',   // 大六度
            10: 'minor7th',  // 小七度
            11: 'major7th'   // 大七度
        };
    }

    /**
     * 更新设置
     * @param {Object} newSettings - 新的设置
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * 分析两个voicing之间的voice leading
     * @param {Object} voicing1 - 第一个voicing
     * @param {Object} voicing2 - 第二个voicing
     * @returns {Object} 分析结果
     */
    analyzeVoiceLeading(voicing1, voicing2) {
        if (!voicing1 || !voicing2 || !voicing1.midiNotes || !voicing2.midiNotes) {
            return null;
        }

        const analysis = {
            movements: this.calculateVoiceMovements(voicing1, voicing2),
            quality: 0,
            commonTones: this.findCommonTones(voicing1, voicing2),
            stepwiseMotion: this.countStepwiseMotion(voicing1, voicing2),
            leaps: this.identifyLeaps(voicing1, voicing2),
            parallels: this.detectParallels(voicing1, voicing2),
            contraryMotion: this.analyzeMotionTypes(voicing1, voicing2),
            suggestions: []
        };

        // 计算整体质量分数
        analysis.quality = this.calculateQualityScore(analysis);

        // 生成改进建议
        analysis.suggestions = this.generateSuggestions(analysis);

        return analysis;
    }

    /**
     * 计算声部移动
     * @param {Object} voicing1 - 第一个voicing
     * @param {Object} voicing2 - 第二个voicing
     * @returns {Array} 声部移动数组
     */
    calculateVoiceMovements(voicing1, voicing2) {
        const notes1 = this.alignVoices(voicing1.midiNotes);
        const notes2 = this.alignVoices(voicing2.midiNotes);

        const movements = [];
        const maxVoices = Math.max(notes1.length, notes2.length);

        for (let i = 0; i < maxVoices; i++) {
            const note1 = notes1[i] || notes1[notes1.length - 1];
            const note2 = notes2[i] || notes2[notes2.length - 1];

            const movement = {
                voice: i,
                from: note1,
                to: note2,
                interval: note2 - note1,
                intervalName: this.getIntervalName(Math.abs(note2 - note1)),
                direction: note2 > note1 ? 'up' : note2 < note1 ? 'down' : 'same',
                isStepwise: Math.abs(note2 - note1) <= 2,
                isLeap: Math.abs(note2 - note1) > 2 && Math.abs(note2 - note1) <= 7,
                isLargeLeap: Math.abs(note2 - note1) > 7
            };

            movements.push(movement);
        }

        return movements;
    }

    /**
     * 对齐声部（确保声部数量一致）
     * @param {Array} midiNotes - MIDI音符数组
     * @returns {Array} 对齐后的音符数组
     */
    alignVoices(midiNotes) {
        return [...midiNotes].sort((a, b) => a - b);
    }

    /**
     * 找到共同音
     * @param {Object} voicing1 - 第一个voicing
     * @param {Object} voicing2 - 第二个voicing
     * @returns {Array} 共同音数组
     */
    findCommonTones(voicing1, voicing2) {
        const notes1 = voicing1.midiNotes.map(midi => midi % 12);
        const notes2 = voicing2.midiNotes.map(midi => midi % 12);

        const commonTones = [];
        notes1.forEach((note, index) => {
            if (notes2.includes(note)) {
                commonTones.push({
                    pitchClass: note,
                    voice: index,
                    noteName: this.midiToNoteName(note)
                });
            }
        });

        return commonTones;
    }

    /**
     * 计算级进运动数量
     * @param {Object} voicing1 - 第一个voicing
     * @param {Object} voicing2 - 第二个voicing
     * @returns {number} 级进运动数量
     */
    countStepwiseMotion(voicing1, voicing2) {
        const movements = this.calculateVoiceMovements(voicing1, voicing2);
        return movements.filter(movement => movement.isStepwise && movement.interval !== 0).length;
    }

    /**
     * 识别跳跃
     * @param {Object} voicing1 - 第一个voicing
     * @param {Object} voicing2 - 第二个voicing
     * @returns {Array} 跳跃数组
     */
    identifyLeaps(voicing1, voicing2) {
        const movements = this.calculateVoiceMovements(voicing1, voicing2);
        return movements.filter(movement => movement.isLeap || movement.isLargeLeap);
    }

    /**
     * 检测平行运动
     * @param {Object} voicing1 - 第一个voicing
     * @param {Object} voicing2 - 第二个voicing
     * @returns {Array} 平行运动数组
     */
    detectParallels(voicing1, voicing2) {
        const movements = this.calculateVoiceMovements(voicing1, voicing2);
        const parallels = [];

        for (let i = 0; i < movements.length - 1; i++) {
            for (let j = i + 1; j < movements.length; j++) {
                const voice1 = movements[i];
                const voice2 = movements[j];

                // 检查是否为平行运动
                if (voice1.direction === voice2.direction &&
                    voice1.direction !== 'same' &&
                    Math.abs(voice1.interval) === Math.abs(voice2.interval)) {

                    // 计算两声部间的音程
                    const interval1 = Math.abs(voice1.from - voice2.from) % 12;
                    const interval2 = Math.abs(voice1.to - voice2.to) % 12;

                    // 检查是否为禁止的平行（五度、八度）
                    if ((interval1 === 7 && interval2 === 7) ||
                        (interval1 === 0 && interval2 === 0)) {
                        parallels.push({
                            voices: [i, j],
                            intervalType: interval1 === 7 ? 'fifths' : 'octaves',
                            severity: interval1 === 0 ? 'high' : 'medium'
                        });
                    }
                }
            }
        }

        return parallels;
    }

    /**
     * 分析运动类型
     * @param {Object} voicing1 - 第一个voicing
     * @param {Object} voicing2 - 第二个voicing
     * @returns {Object} 运动类型分析
     */
    analyzeMotionTypes(voicing1, voicing2) {
        const movements = this.calculateVoiceMovements(voicing1, voicing2);
        const motionTypes = {
            parallel: 0,
            similar: 0,
            contrary: 0,
            oblique: 0
        };

        for (let i = 0; i < movements.length - 1; i++) {
            for (let j = i + 1; j < movements.length; j++) {
                const voice1 = movements[i];
                const voice2 = movements[j];

                if (voice1.direction === voice2.direction) {
                    if (Math.abs(voice1.interval) === Math.abs(voice2.interval)) {
                        motionTypes.parallel++;
                    } else {
                        motionTypes.similar++;
                    }
                } else if ((voice1.direction === 'up' && voice2.direction === 'down') ||
                          (voice1.direction === 'down' && voice2.direction === 'up')) {
                    motionTypes.contrary++;
                } else if (voice1.direction === 'same' || voice2.direction === 'same') {
                    motionTypes.oblique++;
                }
            }
        }

        return motionTypes;
    }

    /**
     * 计算质量分数
     * @param {Object} analysis - 分析结果
     * @returns {number} 质量分数 (0-100)
     */
    calculateQualityScore(analysis) {
        let score = 50; // 基础分数

        // 共同音加分
        score += analysis.commonTones.length * this.rules.commonTones;

        // 级进运动加分
        score += analysis.stepwiseMotion * this.rules.stepwiseMotion;

        // 反向运动加分
        score += analysis.contraryMotion.contrary * this.rules.contraryMotion;

        // 平行运动扣分
        score -= analysis.parallels.length * this.rules.avoidParallels * 2;

        // 大跳跃扣分
        const largeLeaps = analysis.leaps.filter(leap => leap.isLargeLeap).length;
        score -= largeLeaps * 5;

        // 过多小跳跃扣分
        const smallLeaps = analysis.leaps.filter(leap => leap.isLeap && !leap.isLargeLeap).length;
        if (smallLeaps > 2) {
            score -= (smallLeaps - 2) * 2;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * 生成改进建议
     * @param {Object} analysis - 分析结果
     * @returns {Array} 建议数组
     */
    generateSuggestions(analysis) {
        const suggestions = [];

        // 平行运动建议
        if (analysis.parallels.length > 0) {
            const parallelTypes = analysis.parallels.map(p => p.intervalType).join(', ');
            suggestions.push({
                type: 'error',
                message: `避免平行${parallelTypes}`,
                priority: 'high'
            });
        }

        // 过多跳跃建议
        const largeLeaps = analysis.leaps.filter(leap => leap.isLargeLeap).length;
        if (largeLeaps > 1) {
            suggestions.push({
                type: 'warning',
                message: '尝试减少大跳跃，使用更多级进运动',
                priority: 'medium'
            });
        }

        // 共同音建议
        if (analysis.commonTones.length === 0) {
            suggestions.push({
                type: 'tip',
                message: '考虑保持共同音以创造更平滑的连接',
                priority: 'low'
            });
        }

        // 反向运动建议
        if (analysis.contraryMotion.contrary === 0 && analysis.movements.length > 2) {
            suggestions.push({
                type: 'tip',
                message: '添加一些反向运动可以增强声部独立性',
                priority: 'low'
            });
        }

        return suggestions;
    }

    /**
     * 优化voicing序列的voice leading
     * @param {Array} voicingSequence - voicing序列
     * @returns {Array} 优化后的序列
     */
    optimizeVoicingSequence(voicingSequence) {
        if (!voicingSequence || voicingSequence.length < 2) {
            return voicingSequence;
        }

        const optimized = [voicingSequence[0]]; // 保持第一个voicing

        for (let i = 1; i < voicingSequence.length; i++) {
            const previousVoicing = optimized[i - 1];
            const currentVoicing = voicingSequence[i];

            // 为当前和弦生成多个voicing选项
            const voicingOptions = this.generateVoicingAlternatives(currentVoicing);

            // 选择voice leading最佳的选项
            let bestOption = currentVoicing;
            let bestScore = 0;

            voicingOptions.forEach(option => {
                const analysis = this.analyzeVoiceLeading(previousVoicing, option);
                if (analysis && analysis.quality > bestScore) {
                    bestScore = analysis.quality;
                    bestOption = option;
                }
            });

            optimized.push(bestOption);
        }

        return optimized;
    }

    /**
     * 生成voicing的替代选项
     * @param {Object} voicing - 原始voicing
     * @returns {Array} 替代选项数组
     */
    generateVoicingAlternatives(voicing) {
        const alternatives = [voicing];

        // 只有在启用转位的情况下才生成转位
        if (this.settings.enableInversions) {
            const inversions = this.generateInversions(voicing);
            alternatives.push(...inversions);
        }

        // 生成八度移位版本
        const octaveShifts = this.generateOctaveShifts(voicing);
        alternatives.push(...octaveShifts);

        return alternatives;
    }

    /**
     * 生成转位
     * @param {Object} voicing - 原始voicing
     * @returns {Array} 转位数组
     */
    generateInversions(voicing) {
        // Shell voicing不能生成转位，因为会破坏其特定的吉他和声结构
        if (voicing.type === 'shell') {
            console.log(`🚫 Voice leading转位生成：跳过Shell voicing的转位生成，保持原始排列`);
            return []; // 返回空数组，不生成任何转位
        }

        const inversions = [];
        const notes = [...voicing.midiNotes];

        for (let i = 1; i < notes.length; i++) {
            const inversion = {
                ...voicing,
                midiNotes: [...notes]
            };

            // 将底部的i个音符移动到高八度
            for (let j = 0; j < i; j++) {
                inversion.midiNotes[j] += 12;
            }

            // 重新排序
            inversion.midiNotes.sort((a, b) => a - b);
            inversions.push(inversion);
        }

        return inversions;
    }

    /**
     * 生成八度移位版本
     * @param {Object} voicing - 原始voicing
     * @returns {Array} 八度移位数组
     */
    generateOctaveShifts(voicing) {
        const shifts = [];

        // 向上一个八度
        const upShift = {
            ...voicing,
            midiNotes: voicing.midiNotes.map(note => note + 12)
        };
        shifts.push(upShift);

        // 向下一个八度
        const downShift = {
            ...voicing,
            midiNotes: voicing.midiNotes.map(note => note - 12)
        };
        shifts.push(downShift);

        return shifts;
    }

    /**
     * 获取音程名称
     * @param {number} semitones - 半音数
     * @returns {string} 音程名称
     */
    getIntervalName(semitones) {
        return this.intervalQualities[semitones % 12] || 'unknown';
    }

    /**
     * 🎵 MIDI音符转音符名称（调号感知版）
     * @param {number} midi - MIDI音符值
     * @param {string} key - 调性（如 'B-major', 'F#-major'），默认为C大调
     * @returns {string} 正确拼写的音符名称
     */
    midiToNoteName(midi, key = 'C-major') {
        // 🔧 修复：使用统一调号感知接口替代硬编码数组
        if (this.harmonyTheory && typeof this.harmonyTheory.getConsistentNoteSpelling === 'function') {
            const semitone = midi % 12;
            return this.harmonyTheory.getConsistentNoteSpelling(semitone, key);
        } else {
            // 🔧 修复：降级处理也尽量考虑调号
            console.warn('🚨 VoiceLeadingAnalyzer: harmonyTheory不可用，使用降级音符拼写');
            const semitone = midi % 12;

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
     * 生成voice leading报告
     * @param {Array} voicingSequence - voicing序列
     * @returns {Object} 详细报告
     */
    generateReport(voicingSequence) {
        if (!voicingSequence || voicingSequence.length < 2) {
            return null;
        }

        const report = {
            overallQuality: 0,
            analyses: [],
            summary: {
                totalCommonTones: 0,
                totalStepwiseMotion: 0,
                totalParallels: 0,
                averageQuality: 0
            },
            recommendations: []
        };

        let totalQuality = 0;

        // 分析每个连接
        for (let i = 0; i < voicingSequence.length - 1; i++) {
            const analysis = this.analyzeVoiceLeading(voicingSequence[i], voicingSequence[i + 1]);
            if (analysis) {
                report.analyses.push(analysis);
                totalQuality += analysis.quality;

                report.summary.totalCommonTones += analysis.commonTones.length;
                report.summary.totalStepwiseMotion += analysis.stepwiseMotion;
                report.summary.totalParallels += analysis.parallels.length;
            }
        }

        // 计算平均质量
        if (report.analyses.length > 0) {
            report.summary.averageQuality = totalQuality / report.analyses.length;
            report.overallQuality = report.summary.averageQuality;
        }

        // 生成整体建议
        report.recommendations = this.generateOverallRecommendations(report.summary);

        return report;
    }

    /**
     * 生成整体建议
     * @param {Object} summary - 统计摘要
     * @returns {Array} 建议数组
     */
    generateOverallRecommendations(summary) {
        const recommendations = [];

        if (summary.averageQuality < 60) {
            recommendations.push({
                type: 'warning',
                message: '整体voice leading质量需要改进',
                priority: 'high'
            });
        }

        if (summary.totalParallels > 0) {
            recommendations.push({
                type: 'error',
                message: `发现${summary.totalParallels}处平行运动，需要修正`,
                priority: 'high'
            });
        }

        if (summary.totalStepwiseMotion === 0) {
            recommendations.push({
                type: 'tip',
                message: '增加级进运动可以改善连接的平滑度',
                priority: 'medium'
            });
        }

        if (summary.totalCommonTones === 0) {
            recommendations.push({
                type: 'tip',
                message: '保持一些共同音可以增强和声连续性',
                priority: 'medium'
            });
        }

        return recommendations;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceLeadingAnalyzer;
} else {
    window.VoiceLeadingAnalyzer = VoiceLeadingAnalyzer;
}