/**
 * V4.0 音程生成器集成
 * 将新的V4.0系统集成到现有的HTML页面中
 */

(function() {
    console.log('🔄 V4.0 音程生成器集成');

    // 保存原始的generateIntervals函数（如果存在）
    const originalGenerateIntervals = window.generateIntervals;

    /**
     * 新的generateIntervals函数
     * 使用V4.0系统生成音程
     */
    window.generateIntervals = async function() {
        console.log('🎵 使用V4.0生成器生成音程');

        try {
            // 显示加载状态
            const scoreContainer = document.getElementById('score');
            if (scoreContainer) {
                scoreContainer.innerHTML = `
                    <div style="text-align: center; padding: 50px; color: #666;">
                        <div style="font-size: 48px; animation: spin 1s linear infinite;">🎵</div>
                        <div style="margin-top: 20px; font-size: 18px;">正在生成音程...</div>
                    </div>
                    <style>
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    </style>
                `;
            }

            // 初始化V4.0模块
            if (typeof IntervalSettings === 'undefined' ||
                typeof IntervalGenerator === 'undefined' ||
                typeof IntervalRenderer === 'undefined') {
                throw new Error('V4.0模块未加载，请确保已引入所有必要的脚本文件');
            }

            // 创建实例
            const settings = new IntervalSettings();
            const generator = new IntervalGenerator();
            const renderer = new IntervalRenderer();

            // 获取用户设置
            console.log('📋 获取用户设置...');
            const userSettings = settings.getCurrentSettings();

            // 验证设置
            const validation = settings.validateSettings(userSettings);
            if (!validation.isValid) {
                throw new Error('设置无效: ' + validation.errors.join(', '));
            }

            // 显示设置摘要
            console.log('📊 设置摘要:', settings.getSettingsSummary(userSettings));

            // 生成音程进行
            console.log('🎵 生成音程进行...');
            const progression = generator.generate(userSettings);

            // 验证生成结果
            const allowedSemitones = userSettings.intervalTypes.map(t => t.semitones);
            const violations = generator.validateProgression(progression, allowedSemitones);

            if (violations.length > 0) {
                console.error('❌ 发现违规音程:', violations);
                // 显示错误信息但继续渲染
                alert(`警告：生成的音程中发现${violations.length}个违规音程。请检查设置。`);
            }

            // 生成MusicXML
            console.log('📄 生成MusicXML...');
            const musicXML = generator.generateMusicXML(progression);

            // 🎵 保存播放数据（修复播放功能）
            console.log('🎵 保存音程进行数据供播放使用...');
            window.currentIntervalProgression = progression;
            console.log('🎵 播放数据已保存:', {
                measures: progression.measures.length,
                clef: progression.clef,
                tempo: progression.tempo,
                keySignature: progression.keySignature
            });

            // 🎼 生成完成后，使用 IntervalSettings 中保存的音域同步 UI（不重置为默认）
            const generatedClef = progression.clef;
            console.log(`🎼 音程生成完成，使用的谱号: ${generatedClef}`);
            try {
                if (window.intervalSettings && typeof window.intervalSettings.updateRangeUIForClef === 'function') {
                    window.intervalSettings.updateRangeUIForClef(generatedClef);
                    window.currentGeneratedClef = generatedClef;
                    window.currentActiveClef = generatedClef;
                    console.log(`✅ 已根据已保存的 ${generatedClef} 谱号音域同步 UI`);
                } else if (typeof window.switchToClefRange === 'function') {
                    // 退路：保留旧API，但switchToClefRange内部也将改为读取已保存音域
                    window.switchToClefRange(generatedClef);
                    window.currentGeneratedClef = generatedClef;
                    window.currentActiveClef = generatedClef;
                }
            } catch (e) {
                console.warn('⚠️ 同步已保存音域到UI时出错:', e);
            }

            // 渲染乐谱
            console.log('🎨 渲染乐谱...');
            await renderer.render(musicXML);

            // 生成统计信息
            const stats = generator.generateStatistics(progression);
            console.log('📊 练习统计:', stats);

            // 保存到历史记录
            if (!window.intervalHistory) {
                window.intervalHistory = [];
            }
            window.intervalHistory.push({
                timestamp: new Date(),
                settings: userSettings,
                progression: progression,
                stats: stats,
                violations: violations
            });

            // 触发成功事件
            const event = new CustomEvent('intervalGenerated', {
                detail: {
                    progression,
                    stats,
                    violations
                }
            });
            document.dispatchEvent(event);

            console.log('✅ 音程生成完成');

            // 返回生成结果
            return {
                success: true,
                progression,
                stats,
                violations
            };

        } catch (error) {
            console.error('❌ 生成失败:', error);

            // 显示错误信息
            const scoreContainer = document.getElementById('score');
            if (scoreContainer) {
                scoreContainer.innerHTML = `
                    <div style="text-align: center; padding: 50px; color: #dc3545;">
                        <div style="font-size: 48px;">❌</div>
                        <div style="margin-top: 20px; font-size: 18px;">生成失败</div>
                        <div style="margin-top: 10px; font-size: 14px; color: #666;">${error.message}</div>
                        <button onclick="window.generateIntervals()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            重试
                        </button>
                    </div>
                `;
            }

            // 如果新版本失败，尝试使用旧版本
            if (originalGenerateIntervals && typeof originalGenerateIntervals === 'function') {
                console.warn('⚠️ 尝试使用旧版生成器...');
                try {
                    return originalGenerateIntervals();
                } catch (oldError) {
                    console.error('❌ 旧版生成器也失败:', oldError);
                }
            }

            throw error;
        }
    };

    /**
     * 使用旧版生成器（备份功能）
     */
    window.useOriginalGenerator = function() {
        if (originalGenerateIntervals) {
            window.generateIntervals = originalGenerateIntervals;
            console.log('✅ 已切换到原始生成器');
            return true;
        } else {
            console.warn('⚠️ 没有找到原始生成器');
            return false;
        }
    };

    /**
     * 使用V4.0生成器
     */
    window.useV4Generator = function() {
        window.generateIntervals = window.generateIntervals; // 使用上面定义的新函数
        console.log('✅ 已切换到V4.0生成器');
        return true;
    };

    // 轻量级自愈：保存节奏弹窗的初始模板，第二次打开前若结构被破坏则恢复
    (function setupRhythmModalSelfHeal() {
        try {
            const modal = document.getElementById('rhythmModal');
            if (!modal) return;
            if (!window.__icRhythmModalTemplate) {
                window.__icRhythmModalTemplate = modal.innerHTML;
                console.log('🧩 已保存节奏弹窗模板');
            }

            const originalOpen = window.openRhythmSettings;
            window.openRhythmSettings = function() {
                try {
                    const m = document.getElementById('rhythmModal');
                    if (m) {
                        const hasContent = !!m.querySelector('.modal-content');
                        if (!hasContent) {
                            m.innerHTML = window.__icRhythmModalTemplate;
                            console.log('🛠️ 恢复节奏弹窗DOM结构');
                        }
                    }
                } catch (e) { console.warn('节奏弹窗自愈失败:', e); }

                if (typeof originalOpen === 'function') return originalOpen();
                const m2 = document.getElementById('rhythmModal');
                if (m2) m2.style.display = 'flex';
            };

            // 包装保存函数：避免外部点击触发时将整个Modal替换成“已保存”文本
            const originalSave = window.saveRhythmSettings;
            window.saveRhythmSettings = function() {
                try {
                    // 1) 收集设置（与原函数一致）
                    const rhythmSettings = {};
                    const frequencySettings = {};
                    document.querySelectorAll('#rhythmModal input[type="checkbox"]').forEach(checkbox => {
                        if (checkbox.id && checkbox.id.startsWith('rhythm-')) {
                            rhythmSettings[checkbox.id] = checkbox.checked;
                        }
                    });
                    document.querySelectorAll('#rhythmModal input[type="range"][id^="freq-"]').forEach(slider => {
                        frequencySettings[slider.id] = parseInt(slider.value);
                    });
                    console.log('🎼 保存节奏设置:', rhythmSettings);
                    console.log('🎼 保存频率设置:', frequencySettings);

                    // 3) 关闭弹窗
                    if (typeof window.closeRhythmSettings === 'function') {
                        window.closeRhythmSettings();
                    } else {
                        const m = document.getElementById('rhythmModal');
                        if (m) m.style.display = 'none';
                    }

                } catch (e) {
                    console.warn('⚠️ 安全保存节奏设置失败，回退到原函数:', e);
                    if (typeof originalSave === 'function') return originalSave();
                }
            };
        } catch (e) {
            console.warn('节奏弹窗自愈初始化失败:', e);
        }
    })();

    // （已回滚）移除节奏设置弹窗的强制兜底样式与包装，恢复原页面样式与函数行为

    // 监听设置变化
    document.addEventListener('DOMContentLoaded', () => {
        // （已回滚）不再注入/包装 rhythmModal，交由页面原逻辑处理

        // 额外保护：拦截“点击背景自动保存”导致的文本覆盖问题
        try {
            const modal = document.getElementById('rhythmModal');
            if (modal) {
                // 捕获阶段拦截，防止冒泡到页面里触发 saveRhythmSettings()
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        // 仅关闭，不执行保存，避免 event.target=modal 时把整个容器改成“已保存”文本
                        if (typeof window.closeRhythmSettings === 'function') {
                            window.closeRhythmSettings();
                        } else {
                            modal.style.display = 'none';
                        }
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }, true); // 捕获阶段

                // 修正保存按钮反馈：若页面函数仍依赖 event.target，包一层仅修改真正的保存按钮
                if (typeof window.saveRhythmSettings === 'function') {
                    const originalSave = window.saveRhythmSettings;
                    window.saveRhythmSettings = function() {
                        try {
                            // 调用原始保存逻辑之前确保按钮安全反馈
                            const saveBtn = document.querySelector('#rhythmModal .modal-buttons .btn-primary');
                            const revert = () => {
                                if (saveBtn) {
                                    const t = (saveBtn.getAttribute('data-original-text') || '保存设置');
                                    saveBtn.textContent = t;
                                    saveBtn.style.background = '';
                                    saveBtn.removeAttribute('data-original-text');
                                }
                            };
                        } catch (_) {}
                        return originalSave.apply(this, arguments);
                    };
                }
            }
        } catch (e) {
            console.warn('节奏弹窗保护处理失败:', e);
        }

        // 监听音程类型复选框变化
        const checkboxes = document.querySelectorAll('#intervalTypeModal input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                console.log(`📝 音程类型变化: ${checkbox.id} = ${checkbox.checked}`);
            });
        });

        // 监听生成按钮点击
        const generateButton = document.querySelector('button[onclick*="generateIntervals"]');
        if (generateButton) {
            console.log('✅ 找到生成按钮，V4.0系统已接管');
        }
    });

    // 添加快捷键支持
    document.addEventListener('keydown', (e) => {
        // Ctrl+G 或 Cmd+G 生成新音程
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            window.generateIntervals();
        }

        // Ctrl+R 或 Cmd+R 清空乐谱
        if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey) {
            e.preventDefault();
            const renderer = new IntervalRenderer();
            renderer.clear();
            console.log('🧹 乐谱已清空');
        }
    });

    // 新增：音程理论测试功能
    window.testIntervalTheory = function() {
        console.log('🧪 测试音程理论修复');

        if (!window.intervalSettings || !window.intervalGenerator) {
            console.error('❌ V4.0实例不存在');
            return;
        }

        try {
            const settings = window.intervalSettings;
            const generator = window.intervalGenerator;

            // 强制设置为C大调，只选择小三度和大三度
            const testSettings = {
                intervalTypes: [
                    { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                    { name: 'major3rd', semitones: 4, displayName: '大三度' }
                ],
                keySignature: ['C'], // 强制C大调
                timeSignature: { beats: 4, beatType: 4 },
                tempo: 60,
                measureCount: 2,
                practiceMode: 'harmonic',
                clef: 'treble',
                rangeMin: 60, // C4
                rangeMax: 71  // B4
            };

            console.log('📋 测试设置:', testSettings);

            // 生成音程
            console.log('\n🎵 开始生成音程...');
            const result = generator.generate(testSettings);
            console.log('🎵 生成结果:', result);

            // 验证每个音程
            console.log('🔍 验证生成的音程:');
            result.measures.forEach((measure, mIndex) => {
                console.log(`\n📊 小节 ${mIndex + 1}:`);

                for (let i = 0; i < measure.lowerVoice.length; i++) {
                    const lower = measure.lowerVoice[i];
                    const upper = measure.upperVoice[i];

                    console.log(`  拍 ${i + 1}: ${lower.pitch} - ${upper.pitch}`);

                    // 检查是否为C大调音符
                    const cMajorNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                    const lowerNote = lower.pitch.charAt(0);
                    const upperNote = upper.pitch.charAt(0);

                    const lowerInKey = cMajorNotes.includes(lowerNote);
                    const upperInKey = cMajorNotes.includes(upperNote);

                    if (!lowerInKey || !upperInKey) {
                        console.error(`    ❌ 调外音符: ${lower.pitch}-${upper.pitch}`);
                    } else {
                        console.log(`    ✅ 调内音符: ${lower.pitch}-${upper.pitch}`);
                    }

                    // 检查音程度数
                    const lowerIndex = cMajorNotes.indexOf(lowerNote);
                    const upperIndex = cMajorNotes.indexOf(upperNote);

                    let degree;
                    if (upperIndex >= lowerIndex) {
                        degree = upperIndex - lowerIndex + 1;
                    } else {
                        degree = (7 - lowerIndex) + upperIndex + 1;
                    }

                    if (degree === 3) {
                        console.log(`    ✅ 正确的三度音程: ${lower.pitch}-${upper.pitch} (${degree}度)`);
                    } else {
                        console.error(`    ❌ 错误的音程度数: ${lower.pitch}-${upper.pitch} (${degree}度，应该是3度)`);
                    }
                }
            });

            console.log('\n🎉 音程理论测试完成！');

        } catch (error) {
            console.error('❌ 音程理论测试失败:', error);
            console.error('详细错误:', error.stack);
        }
    };

    // 设置测试功能
    window.testV4Settings = function() {
        console.log('🧪 V4.0设置读取测试');

        if (!window.intervalSettings) {
            console.error('❌ intervalSettings 实例不存在');
            return;
        }

        try {
            const settings = window.intervalSettings;

            console.log('📋 音程类型设置:');
            const intervalTypes = settings.getSelectedIntervalTypes();
            intervalTypes.forEach(type => {
                console.log(`  ✅ ${type.displayName} (${type.semitones}半音)`);
            });

            console.log('🎼 调号设置:');
            const keySignatures = settings.getKeySignature();
            console.log(`  ✅ ${Array.isArray(keySignatures) ? keySignatures.join(', ') : keySignatures}`);

            console.log('📐 音域设置:');
            const rangeMin = settings.getRangeMin();
            const rangeMax = settings.getRangeMax();
            console.log(`  ✅ ${settings.midiToNote(rangeMin)} - ${settings.midiToNote(rangeMax)} (MIDI: ${rangeMin}-${rangeMax})`);

            console.log('🎵 拍号设置:');
            const timeSignature = settings.getTimeSignature();
            console.log(`  ✅ ${timeSignature.beats}/${timeSignature.beatType}`);

            console.log('⏱️ 速度设置:');
            const tempo = settings.getTempo();
            console.log(`  ✅ ${tempo} BPM`);

            console.log('🎼 谱号设置:');
            const clef = settings.getClef();
            console.log(`  ✅ ${clef}`);

            console.log('📊 小节数设置:');
            const measureCount = settings.getMeasureCount();
            console.log(`  ✅ ${measureCount}小节`);

            console.log('📋 完整设置摘要:');
            const fullSettings = settings.getCurrentSettings();
            console.log(`  ${settings.getSettingsSummary(fullSettings)}`);

            console.log('✅ 设置读取测试完成！');

        } catch (error) {
            console.error('❌ 设置读取测试失败:', error);
        }
    };

    // 确保全局实例可用（向后兼容）
    setTimeout(() => {
        try {
            if (typeof IntervalSettings !== 'undefined' && !window.intervalSettings) {
                window.intervalSettings = new IntervalSettings();
                console.log('✅ 创建全局 intervalSettings 实例');
            }

            if (typeof IntervalGenerator !== 'undefined' && !window.intervalGenerator) {
                window.intervalGenerator = new IntervalGenerator();
                console.log('✅ 创建全局 intervalGenerator 实例');
            }

            if (typeof IntervalRenderer !== 'undefined' && !window.intervalRenderer) {
                window.intervalRenderer = new IntervalRenderer();
                console.log('✅ 创建全局 intervalRenderer 实例');
            }

            // 为V2兼容性创建别名
            if (window.intervalRenderer && !window.currentIntervalRenderer) {
                window.currentIntervalRenderer = window.intervalRenderer;
                console.log('✅ 创建 currentIntervalRenderer 别名');
            }

        } catch (error) {
            console.warn('创建全局实例时出错:', error);
        }
    }, 100);

    // 音程级进测试功能
    window.testIntervalProgression = function() {
        console.log('🧪 测试音程级进连接');

        if (!window.intervalGenerator) {
            console.error('❌ intervalGenerator 不存在');
            return;
        }

        try {
            // 强制设置为只选择小三度和大三度，音域为C4-C5
            const testSettings = {
                intervalTypes: [
                    { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                    { name: 'major3rd', semitones: 4, displayName: '大三度' }
                ],
                keySignature: ['C'],
                timeSignature: { beats: 4, beatType: 4 },
                tempo: 60,
                measureCount: 3, // 增加小节数来更好地测试级进
                practiceMode: 'harmonic',
                clef: 'treble',
                rangeMin: 60, // C4
                rangeMax: 72  // C5
            };

            console.log('🎵 测试级进连接（二度级进或三度级进）:');
            console.log('音域: C4(60) - C5(72)');

            const progression = window.intervalGenerator.generate(testSettings);

            // 分析级进连接
            const allIntervals = [];
            const progressions = [];

            progression.measures.forEach((measure, mIndex) => {
                console.log(`\n📊 小节 ${mIndex + 1}:`);

                for (let beat = 0; beat < measure.lowerVoice.length; beat++) {
                    const lower = measure.lowerVoice[beat];
                    const upper = measure.upperVoice[beat];

                    if (lower.type === 'note' && upper.type === 'note') {
                        const intervalStr = `${lower.pitch}-${upper.pitch}`;
                        const lowerNote = lower.pitch.charAt(0);

                        allIntervals.push({
                            measure: mIndex + 1,
                            beat: beat + 1,
                            interval: intervalStr,
                            lowerNote: lowerNote,
                            lowerIndex: ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(lowerNote),
                            lowerMidi: lower.midi,
                            upperMidi: upper.midi
                        });

                        console.log(`  拍 ${beat + 1}: ${intervalStr} (根音: ${lowerNote})`);
                    }
                }
            });

            // 分析级进关系和大跳检测
            console.log('\n🎶 级进分析:');
            const largeLeaps = [];

            for (let i = 1; i < allIntervals.length; i++) {
                const prev = allIntervals[i - 1];
                const curr = allIntervals[i];

                // 分析根音级进
                let stepDistance = curr.lowerIndex - prev.lowerIndex;
                if (stepDistance > 3) stepDistance -= 7;
                if (stepDistance < -3) stepDistance += 7;

                const absStep = Math.abs(stepDistance);
                const direction = stepDistance > 0 ? '上行' : stepDistance < 0 ? '下行' : '同音';

                let progressionType = '';
                if (absStep === 1) progressionType = '二度级进';
                else if (absStep === 2) progressionType = '三度级进';
                else if (absStep === 0) progressionType = '同音重复';
                else progressionType = `${absStep}度跳进`;

                progressions.push(progressionType);

                // 检测大跳（MIDI值差距）
                const lowerJump = Math.abs(curr.lowerMidi - prev.lowerMidi);
                const upperJump = Math.abs(curr.upperMidi - prev.upperMidi);
                const maxJump = Math.max(lowerJump, upperJump);

                let jumpWarning = '';
                if (maxJump > 7) { // 大于完全五度的跳跃
                    jumpWarning = ` ⚠️大跳(${maxJump}半音)`;
                    largeLeaps.push({
                        from: prev.interval,
                        to: curr.interval,
                        jumpSize: maxJump,
                        voice: lowerJump > upperJump ? '低音' : '高音'
                    });
                }

                console.log(`  ${prev.interval} → ${curr.interval}: ${direction}${progressionType} (${prev.lowerNote}→${curr.lowerNote})${jumpWarning}`);
            }

            // 大跳统计
            if (largeLeaps.length > 0) {
                console.log('\n⚠️ 大跳检测:');
                largeLeaps.forEach(leap => {
                    console.log(`  ${leap.from} → ${leap.to}: ${leap.voice}声部跳跃${leap.jumpSize}半音`);
                });
                console.log(`\n📊 大跳比例: ${largeLeaps.length}/${progressions.length} (${((largeLeaps.length/progressions.length)*100).toFixed(1)}%)`);
            } else {
                console.log('\n✅ 未检测到大跳（>7半音）');
            }

            // 统计级进类型
            const progressionCount = {};
            progressions.forEach(prog => {
                progressionCount[prog] = (progressionCount[prog] || 0) + 1;
            });

            console.log('\n📈 级进统计:');
            Object.entries(progressionCount).forEach(([type, count]) => {
                console.log(`  ${type}: ${count}次`);
            });

            const stepwiseCount = (progressionCount['二度级进'] || 0) + (progressionCount['三度级进'] || 0);
            const totalProgressions = progressions.length;
            const stepwisePercentage = totalProgressions > 0 ? ((stepwiseCount / totalProgressions) * 100).toFixed(1) : 0;
            const largeLeapPercentage = totalProgressions > 0 ? ((largeLeaps.length / totalProgressions) * 100).toFixed(1) : 0;

            console.log(`\n🎯 级进比例: ${stepwiseCount}/${totalProgressions} (${stepwisePercentage}%)`);
            console.log(`🎯 大跳比例: ${largeLeaps.length}/${totalProgressions} (${largeLeapPercentage}%)`);

            if (stepwisePercentage >= 70 && largeLeapPercentage <= 20) {
                console.log('🎉 平滑连接测试通过！主要使用级进连接，大跳较少');
            } else if (stepwisePercentage >= 70) {
                console.log('⚠️ 级进比例良好，但大跳偏多，需要优化平滑度');
            } else {
                console.log('⚠️ 级进比例偏低，需要优化算法');
            }

        } catch (error) {
            console.error('❌ 测试失败:', error);
        }
    };

    // 保留原有的多样性测试（简化版本）
    window.testIntervalVariety = function() {
        console.log('🧪 测试音程生成多样性');

        if (!window.intervalGenerator) {
            console.error('❌ intervalGenerator 不存在');
            return;
        }

        try {
            const testSettings = {
                intervalTypes: [
                    { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                    { name: 'major3rd', semitones: 4, displayName: '大三度' }
                ],
                keySignature: ['C'],
                timeSignature: { beats: 4, beatType: 4 },
                tempo: 60,
                measureCount: 2,
                practiceMode: 'harmonic',
                clef: 'treble',
                rangeMin: 60,
                rangeMax: 72
            };

            const progression = window.intervalGenerator.generate(testSettings);
            const allIntervals = new Set();

            progression.measures.forEach((measure) => {
                measure.lowerVoice.forEach((lower, beat) => {
                    const upper = measure.upperVoice[beat];
                    if (lower.type === 'note' && upper.type === 'note') {
                        allIntervals.add(`${lower.pitch}-${upper.pitch}`);
                    }
                });
            });

            console.log(`📊 生成了 ${allIntervals.size} 种不同的音程组合:`);
            Array.from(allIntervals).forEach(interval => {
                console.log(`  ✅ ${interval}`);
            });

        } catch (error) {
            console.error('❌ 测试失败:', error);
        }
    };

    // 节奏生成测试功能
    window.testRhythmGeneration = function() {
        console.log('🧪 测试节奏生成功能');

        if (!window.intervalGenerator) {
            console.error('❌ intervalGenerator 不存在');
            return;
        }

        try {
            // 测试设置：包含多种节奏类型
            const testSettings = {
                intervalTypes: [
                    { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                    { name: 'major3rd', semitones: 4, displayName: '大三度' }
                ],
                keySignature: ['C'],
                timeSignature: { beats: 4, beatType: 4 },
                tempo: 60,
                measureCount: 3,
                practiceMode: 'harmonic',
                clef: 'treble',
                rangeMin: 60,
                rangeMax: 72,
                rhythms: [
                    { value: 'whole', displayName: '全音符' },
                    { value: 'half', displayName: '二分音符' },
                    { value: 'quarter', displayName: '四分音符' },
                    { value: 'eighth', displayName: '八分音符' }
                ]
            };

            console.log('🎵 测试多样化节奏生成:');
            console.log('可用节奏:', testSettings.rhythms.map(r => r.displayName).join(', '));

            const progression = window.intervalGenerator.generate(testSettings);

            // 分析节奏多样性
            const allRhythms = new Set();
            const rhythmStats = {};

            progression.measures.forEach((measure, mIndex) => {
                console.log(`\n📊 小节 ${mIndex + 1}:`);

                measure.lowerVoice.forEach((note, beatIndex) => {
                    const rhythm = note.duration;
                    allRhythms.add(rhythm);
                    rhythmStats[rhythm] = (rhythmStats[rhythm] || 0) + 1;

                    const upper = measure.upperVoice[beatIndex];
                    console.log(`  音符 ${beatIndex + 1}: ${note.pitch}-${upper.pitch} (${rhythm})`);
                });
            });

            console.log('\n📈 节奏统计:');
            Object.entries(rhythmStats).forEach(([rhythm, count]) => {
                console.log(`  ${rhythm}: ${count}次`);
            });

            console.log(`\n📊 总共使用了 ${allRhythms.size} 种不同节奏:`);
            Array.from(allRhythms).forEach(rhythm => {
                console.log(`  ✅ ${rhythm}`);
            });

            // 验证节奏型的拍数
            let totalValid = true;
            progression.measures.forEach((measure, mIndex) => {
                let beatSum = 0;
                measure.lowerVoice.forEach(note => {
                    const duration = window.intervalGenerator.rhythmDurations[note.duration] || 1.0;
                    beatSum += duration;
                });

                const expectedBeats = testSettings.timeSignature.beats;
                const tolerance = 0.01; // 允许小误差

                if (Math.abs(beatSum - expectedBeats) > tolerance) {
                    console.error(`❌ 小节 ${mIndex + 1} 拍数错误: ${beatSum}拍，期望${expectedBeats}拍`);
                    totalValid = false;
                } else {
                    console.log(`✅ 小节 ${mIndex + 1} 拍数正确: ${beatSum}拍`);
                }
            });

            if (allRhythms.size >= 2 && totalValid) {
                console.log('🎉 节奏生成测试通过！生成了多样化的节奏，且拍数正确');
            } else if (!totalValid) {
                console.log('❌ 节奏生成测试失败：拍数不正确');
            } else {
                console.log('⚠️ 节奏多样性不足，建议增加节奏选项');
            }

        } catch (error) {
            console.error('❌ 节奏测试失败:', error);
        }
    };

    // 音乐记谱规则测试功能
    window.testNotationRules = function() {
        console.log('🧪 测试音乐记谱规则（beaming + 八分音符跨度限制）');

        if (!window.intervalGenerator) {
            console.error('❌ intervalGenerator 不存在');
            return;
        }

        try {
            // 测试设置：包含八分音符和大跨度音程
            const testSettings = {
                intervalTypes: [
                    { name: 'minor2nd', semitones: 1, displayName: '小二度' },
                    { name: 'major2nd', semitones: 2, displayName: '大二度' },
                    { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                    { name: 'major3rd', semitones: 4, displayName: '大三度' },
                    { name: 'perfect4th', semitones: 5, displayName: '完全四度' },
                    { name: 'perfect5th', semitones: 7, displayName: '完全五度' }, // 应该被八分音符过滤
                    { name: 'octave', semitones: 12, displayName: '八度' } // 应该被八分音符过滤
                ],
                keySignature: ['C'],
                timeSignature: { beats: 4, beatType: 4 },
                tempo: 120,
                measureCount: 2,
                practiceMode: 'harmonic',
                clef: 'treble',
                rangeMin: 60,
                rangeMax: 72,
                rhythms: [
                    { value: 'quarter', displayName: '四分音符' },
                    { value: 'eighth', displayName: '八分音符' },
                    { value: '16th', displayName: '十六分音符' }
                ]
            };

            console.log('🎵 测试音乐记谱规则:');
            console.log('可用音程:', testSettings.intervalTypes.map(t => t.displayName).join(', '));
            console.log('可用节奏:', testSettings.rhythms.map(r => r.displayName).join(', '));

            const progression = window.intervalGenerator.generate(testSettings);

            // 检查beaming和跨度限制
            let beamingFound = false;
            let shortRhythmViolations = [];
            let beamingGroups = new Set();

            progression.measures.forEach((measure, mIndex) => {
                console.log(`\n📊 小节 ${mIndex + 1}:`);

                measure.lowerVoice.forEach((note, beatIndex) => {
                    const upper = measure.upperVoice[beatIndex];
                    const rhythm = note.duration;
                    const beamGroup = note.beamGroup;

                    // 检查beaming
                    if (beamGroup) {
                        beamingFound = true;
                        beamingGroups.add(beamGroup);
                        console.log(`  音符 ${beatIndex + 1}: ${note.pitch}-${upper.pitch} (${rhythm}) [连音组: ${beamGroup}]`);
                    } else {
                        console.log(`  音符 ${beatIndex + 1}: ${note.pitch}-${upper.pitch} (${rhythm})`);
                    }

                    // 检查短时值音符的跨度限制
                    const isShortRhythm = window.intervalGenerator.isShortRhythm(rhythm);
                    if (isShortRhythm) {
                        const lowerMidi = note.midi;
                        const upperMidi = upper.midi;
                        const semitoneSpan = Math.abs(upperMidi - lowerMidi);

                        if (semitoneSpan > 5) { // 大于完全四度
                            shortRhythmViolations.push({
                                measure: mIndex + 1,
                                beat: beatIndex + 1,
                                interval: `${note.pitch}-${upper.pitch}`,
                                rhythm: rhythm,
                                span: semitoneSpan
                            });
                        }

                        console.log(`    ✅ 短时值检查: ${rhythm} 跨度${semitoneSpan}半音 ${semitoneSpan <= 5 ? '✓' : '✗'}`);
                    }
                });
            });

            // 验证结果
            console.log('\n📈 记谱规则验证:');

            if (beamingFound) {
                console.log(`✅ Beaming检测: 发现${beamingGroups.size}个连音组`);
                beamingGroups.forEach(group => {
                    console.log(`  - 连音组: ${group}`);
                });
            } else {
                console.log('ℹ️ Beaming检测: 未发现短时值音符分组（可能全为长时值）');
            }

            if (shortRhythmViolations.length === 0) {
                console.log('✅ 跨度限制检查: 所有短时值音符都符合≤完全四度的规则');
            } else {
                console.log(`❌ 跨度限制违规: 发现${shortRhythmViolations.length}个违规:`);
                shortRhythmViolations.forEach(violation => {
                    console.log(`  - 小节${violation.measure}拍${violation.beat}: ${violation.interval} (${violation.rhythm}, ${violation.span}半音)`);
                });
            }

            // 总体评估
            const rulesValid = shortRhythmViolations.length === 0;
            if (rulesValid) {
                console.log('🎉 音乐记谱规则测试通过！');
            } else {
                console.log('⚠️ 音乐记谱规则需要进一步优化');
            }

        } catch (error) {
            console.error('❌ 记谱规则测试失败:', error);
        }
    };

    // 休止符和beaming规则综合测试
    window.testRestsAndBeaming = function() {
        console.log('🧪 测试休止符生成和beaming规则修正');

        if (!window.intervalGenerator) {
            console.error('❌ intervalGenerator 不存在');
            return;
        }

        try {
            // 专门测试休止符和beaming的设置
            const testSettings = {
                intervalTypes: [
                    { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                    { name: 'major3rd', semitones: 4, displayName: '大三度' }
                ],
                keySignature: ['C'],
                timeSignature: { beats: 4, beatType: 4 },
                tempo: 120,
                measureCount: 3,
                practiceMode: 'harmonic',
                clef: 'treble',
                rangeMin: 60,
                rangeMax: 72,
                rhythms: [
                    { value: 'quarter', displayName: '四分音符' },
                    { value: 'eighth', displayName: '八分音符' }
                ]
            };

            console.log('🎵 生成包含休止符的测试序列...');
            const progression = window.intervalGenerator.generate(testSettings);

            let totalRests = 0;
            let beamingGroups = new Map();
            let beamInterruptions = 0;

            progression.measures.forEach((measure, mIndex) => {
                console.log(`\n📊 小节 ${mIndex + 1}:`);

                let currentBeamGroup = null;
                let beamGroupNotes = [];

                measure.lowerVoice.forEach((note, beatIndex) => {
                    const upper = measure.upperVoice[beatIndex];

                    if (note.type === 'rest') {
                        // 检测到休止符
                        totalRests++;

                        // 检查是否中断了beaming
                        if (currentBeamGroup && beamGroupNotes.length > 0) {
                            beamInterruptions++;
                            console.log(`  🔇 拍 ${beatIndex + 1}: ${note.duration}休止符 [中断beaming组: ${currentBeamGroup}]`);
                        } else {
                            console.log(`  🔇 拍 ${beatIndex + 1}: ${note.duration}休止符`);
                        }

                        // 重置beaming组追踪
                        if (beamGroupNotes.length > 1) {
                            beamingGroups.set(currentBeamGroup, beamGroupNotes.length);
                        }
                        currentBeamGroup = null;
                        beamGroupNotes = [];

                    } else {
                        // 音符处理
                        const beamGroup = note.beamGroup;

                        if (beamGroup) {
                            if (currentBeamGroup !== beamGroup) {
                                // 新的beaming组开始
                                if (beamGroupNotes.length > 1) {
                                    beamingGroups.set(currentBeamGroup, beamGroupNotes.length);
                                }
                                currentBeamGroup = beamGroup;
                                beamGroupNotes = [note];
                                console.log(`  🎵 拍 ${beatIndex + 1}: ${note.pitch}-${upper.pitch} (${note.duration}) [新beaming组: ${beamGroup}]`);
                            } else {
                                // beaming组继续
                                beamGroupNotes.push(note);
                                console.log(`  🎵 拍 ${beatIndex + 1}: ${note.pitch}-${upper.pitch} (${note.duration}) [beaming组继续: ${beamGroup}]`);
                            }
                        } else {
                            // 独立音符，结束当前beaming组
                            if (beamGroupNotes.length > 1) {
                                beamingGroups.set(currentBeamGroup, beamGroupNotes.length);
                            }
                            currentBeamGroup = null;
                            beamGroupNotes = [];
                            console.log(`  🎵 拍 ${beatIndex + 1}: ${note.pitch}-${upper.pitch} (${note.duration}) [独立音符]`);
                        }
                    }
                });

                // 处理小节结尾的beaming组
                if (beamGroupNotes.length > 1) {
                    beamingGroups.set(currentBeamGroup, beamGroupNotes.length);
                }
            });

            // 测试MusicXML生成
            console.log('\n📄 测试MusicXML生成中的休止符处理...');
            const musicXML = window.intervalGenerator.generateMusicXML(progression);

            const restMatches = musicXML.match(/<rest\/>/g);
            const xmlRestCount = restMatches ? restMatches.length : 0;

            const durationMatches = musicXML.match(/<duration>(\d+)<\/duration>/g);
            const typeMatches = musicXML.match(/<type>([^<]+)<\/type>/g);

            console.log('\n📊 测试结果统计:');
            console.log(`✅ 生成的休止符总数: ${totalRests}`);
            console.log(`✅ MusicXML中的休止符: ${xmlRestCount}`);
            console.log(`✅ beaming组数量: ${beamingGroups.size}`);
            console.log(`✅ 休止符中断beaming次数: ${beamInterruptions}`);

            if (beamingGroups.size > 0) {
                console.log('📝 beaming组详情:');
                beamingGroups.forEach((noteCount, groupId) => {
                    console.log(`  组 ${groupId}: ${noteCount}个音符`);
                });
            }

            // 验证规则
            const rulesValid = totalRests > 0 && xmlRestCount === totalRests;

            if (rulesValid) {
                console.log('🎉 休止符和beaming规则测试通过！');
            } else {
                console.log('⚠️ 休止符处理或beaming规则需要进一步检查');
            }

            return {
                restCount: totalRests,
                xmlRestCount: xmlRestCount,
                beamingGroupCount: beamingGroups.size,
                beamInterruptions: beamInterruptions,
                progression: progression,
                musicXML: musicXML
            };

        } catch (error) {
            console.error('❌ 休止符和beaming测试失败:', error);
            throw error;
        }
    };

    // 测试新的4/4拍beaming规则
    window.testNewBeamingRules = function() {
        console.log('🧪 测试新的4/4拍beaming规则（拍群1-2和3-4）');

        if (!window.intervalGenerator) {
            console.error('❌ intervalGenerator 不存在');
            return;
        }

        try {
            const testSettings = {
                intervalTypes: [
                    { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                    { name: 'major3rd', semitones: 4, displayName: '大三度' }
                ],
                keySignature: ['C'],
                timeSignature: { beats: 4, beatType: 4 }, // 明确指定4/4拍
                tempo: 120,
                measureCount: 2,
                practiceMode: 'harmonic',
                clef: 'treble',
                rangeMin: 60,
                rangeMax: 72,
                rhythms: [
                    { value: 'quarter', displayName: '四分音符' },
                    { value: 'eighth', displayName: '八分音符' },
                    { value: '16th', displayName: '十六分音符' }
                ]
            };

            console.log('🎵 生成4/4拍测试序列...');
            const progression = window.intervalGenerator.generate(testSettings);

            let beatGroup1Events = [];
            let beatGroup2Events = [];
            let totalRests = 0;
            let beamingGroups = new Set();

            progression.measures.forEach((measure, mIndex) => {
                console.log(`\n📊 小节 ${mIndex + 1}:`);

                // 分析拍群结构
                let currentPosition = 0;
                let currentBeatGroup = 1;

                measure.lowerVoice.forEach((note, noteIndex) => {
                    const upper = measure.upperVoice[noteIndex];
                    const eventInfo = {
                        position: currentPosition,
                        note: note,
                        upper: upper,
                        beatGroup: currentBeatGroup
                    };

                    if (note.type === 'rest') {
                        totalRests++;
                        console.log(`  🔇 位置 ${currentPosition.toFixed(1)}: ${note.duration}休止符 [拍群${currentBeatGroup}]`);
                    } else {
                        const beamInfo = note.beamGroup ? ` [连音: ${note.beamGroup}]` : ' [独立]';
                        console.log(`  🎵 位置 ${currentPosition.toFixed(1)}: ${note.pitch}-${upper.pitch} (${note.duration})${beamInfo} [拍群${currentBeatGroup}]`);

                        if (note.beamGroup) {
                            beamingGroups.add(note.beamGroup);
                        }
                    }

                    // 更新位置和拍群
                    currentPosition += note.duration || this.rhythmDurations[note.value] || 1.0;

                    // 确定拍群：0-2.0为拍群1，2.0-4.0为拍群2
                    if (currentPosition >= 2.0 && currentBeatGroup === 1) {
                        currentBeatGroup = 2;
                    }

                    // 分类到对应拍群
                    if (currentBeatGroup === 1) {
                        beatGroup1Events.push(eventInfo);
                    } else {
                        beatGroup2Events.push(eventInfo);
                    }
                });
            });

            // 验证beaming规则
            console.log('\n📊 beaming规则验证:');

            // 检查是否有跨拍群beaming（这是错误的）
            let crossGroupBeaming = false;
            beamingGroups.forEach(beamGroup => {
                const group1HasBeam = beatGroup1Events.some(e => e.note.beamGroup === beamGroup);
                const group2HasBeam = beatGroup2Events.some(e => e.note.beamGroup === beamGroup);

                if (group1HasBeam && group2HasBeam) {
                    crossGroupBeaming = true;
                    console.log(`❌ 错误: beaming组 ${beamGroup} 跨越了拍群1-2和3-4`);
                }
            });

            console.log('\n📈 测试结果统计:');
            console.log(`✅ 拍群1事件数: ${beatGroup1Events.length}`);
            console.log(`✅ 拍群2事件数: ${beatGroup2Events.length}`);
            console.log(`✅ 总休止符数: ${totalRests}`);
            console.log(`✅ beaming组数: ${beamingGroups.size}`);
            console.log(`✅ 跨拍群beaming: ${crossGroupBeaming ? '❌ 发现错误' : '✅ 正确分组'}`);

            // 生成MusicXML并检查
            const musicXML = window.intervalGenerator.generateMusicXML(progression);
            const restMatches = musicXML.match(/<rest\/>/g);
            const xmlRestCount = restMatches ? restMatches.length : 0;

            console.log(`✅ MusicXML休止符数: ${xmlRestCount}`);

            if (!crossGroupBeaming && xmlRestCount === totalRests) {
                console.log('🎉 新的4/4拍beaming规则测试通过！');
            } else {
                console.log('⚠️ 需要进一步检查beaming实现');
            }

            return {
                crossGroupBeaming: crossGroupBeaming,
                restCount: totalRests,
                xmlRestCount: xmlRestCount,
                beamingGroupCount: beamingGroups.size,
                progression: progression
            };

        } catch (error) {
            console.error('❌ 4/4拍beaming规则测试失败:', error);
            throw error;
        }
    };

    // 测试参考旋律工具的beaming实现
    window.testMelodyStyleBeaming = function() {
        console.log('🧪 测试参考旋律视奏工具的beaming实现');

        if (!window.intervalGenerator) {
            console.error('❌ intervalGenerator 不存在');
            return;
        }

        try {
            const testSettings = {
                intervalTypes: [
                    { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                    { name: 'major3rd', semitones: 4, displayName: '大三度' }
                ],
                keySignature: ['C'],
                timeSignature: { beats: 4, beatType: 4 },
                tempo: 120,
                measureCount: 2,
                practiceMode: 'harmonic',
                clef: 'treble',
                rangeMin: 60,
                rangeMax: 72,
                rhythms: [
                    { value: 'quarter', displayName: '四分音符' },
                    { value: 'eighth', displayName: '八分音符' },
                    { value: '16th', displayName: '十六分音符' }
                ]
            };

            console.log('🎵 生成带有正确beaming的测试序列...');
            const progression = window.intervalGenerator.generate(testSettings);

            let beamGroups = new Set();
            let beamingDetails = [];
            let xmlBeamCount = 0;

            progression.measures.forEach((measure, mIndex) => {
                console.log(`\n📊 小节 ${mIndex + 1} beaming分析:`);

                measure.lowerVoice.forEach((note, noteIndex) => {
                    const upper = measure.upperVoice[noteIndex];

                    if (note.type === 'note' && note.beamGroup) {
                        beamGroups.add(note.beamGroup);

                        const beamDetail = {
                            measure: mIndex + 1,
                            note: noteIndex + 1,
                            duration: note.duration,
                            beamGroup: note.beamGroup,
                            beamPosition: note.beamPosition || '未设置',
                            canBeBeamed: window.intervalGenerator.canNoteBeBeamed(note)
                        };
                        beamingDetails.push(beamDetail);

                        console.log(`  音符 ${noteIndex + 1}: ${note.pitch}-${upper.pitch} (${note.duration})`);
                        console.log(`    beamGroup: ${note.beamGroup}`);
                        console.log(`    beamPosition: ${note.beamPosition}`);
                        console.log(`    canBeBeamed: ${beamDetail.canBeBeamed}`);
                    } else if (note.type === 'rest') {
                        console.log(`  音符 ${noteIndex + 1}: 🔇 ${note.duration}休止符 (中断beaming)`);
                    } else {
                        console.log(`  音符 ${noteIndex + 1}: ${note.pitch}-${upper.pitch} (${note.duration}) [无beaming]`);
                    }
                });
            });

            // 测试MusicXML生成中的beam标记
            console.log('\n📄 测试MusicXML中的beam标记...');
            const musicXML = window.intervalGenerator.generateMusicXML(progression);

            const beamMatches = musicXML.match(/<beam number="1">/g);
            xmlBeamCount = beamMatches ? beamMatches.length : 0;

            // 检查是否包含正确的beam位置
            const beginBeams = (musicXML.match(/<beam number="1">begin<\/beam>/g) || []).length;
            const continueBeams = (musicXML.match(/<beam number="1">continue<\/beam>/g) || []).length;
            const endBeams = (musicXML.match(/<beam number="1">end<\/beam>/g) || []).length;

            console.log('\n📊 beaming测试结果:');
            console.log(`✅ beaming组总数: ${beamGroups.size}`);
            console.log(`✅ 有beam标记的音符数: ${beamingDetails.length}`);
            console.log(`✅ MusicXML中的beam标记: ${xmlBeamCount}`);
            console.log(`✅ begin beam: ${beginBeams}个`);
            console.log(`✅ continue beam: ${continueBeams}个`);
            console.log(`✅ end beam: ${endBeams}个`);

            // 验证beam平衡性（begin和end应该相等）
            const beamBalance = beginBeams === endBeams;
            console.log(`✅ beam平衡性: ${beamBalance ? '✅ 平衡' : '❌ 不平衡'}`);

            // 详细显示beam组信息
            if (beamingDetails.length > 0) {
                console.log('\n📝 beaming详情:');
                beamGroups.forEach(groupId => {
                    const groupNotes = beamingDetails.filter(d => d.beamGroup === groupId);
                    console.log(`  组 ${groupId}: ${groupNotes.length}个音符`);
                    groupNotes.forEach(detail => {
                        console.log(`    小节${detail.measure}音符${detail.note}: ${detail.duration} (${detail.beamPosition})`);
                    });
                });
            }

            if (beamGroups.size > 0 && xmlBeamCount > 0 && beamBalance) {
                console.log('🎉 旋律风格beaming测试通过！');
            } else {
                console.log('⚠️ beaming实现需要进一步检查');
            }

            return {
                beamGroupCount: beamGroups.size,
                beamedNoteCount: beamingDetails.length,
                xmlBeamCount: xmlBeamCount,
                beamBalance: beamBalance,
                progression: progression,
                musicXML: musicXML
            };

        } catch (error) {
            console.error('❌ 旋律风格beaming测试失败:', error);
            throw error;
        }
    };

    // 测试直接的MusicXML beaming实现
    window.testDirectBeaming = function() {
        console.log('🧪 测试直接的MusicXML beaming实现');

        if (!window.intervalGenerator) {
            console.error('❌ intervalGenerator 不存在');
            return;
        }

        try {
            const testSettings = {
                intervalTypes: [
                    { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                    { name: 'major3rd', semitones: 4, displayName: '大三度' }
                ],
                keySignature: ['C'],
                timeSignature: { beats: 4, beatType: 4 },
                tempo: 120,
                measureCount: 2,
                practiceMode: 'harmonic',
                clef: 'treble',
                rangeMin: 60,
                rangeMax: 72,
                rhythms: [
                    { value: 'eighth', displayName: '八分音符' },
                    { value: '16th', displayName: '十六分音符' }
                ]
            };

            console.log('🎵 生成包含八分音符和十六分音符的测试序列...');
            const progression = window.intervalGenerator.generate(testSettings);

            // 生成MusicXML并分析beam标记
            console.log('\n📄 生成MusicXML并检查beam标记...');
            const musicXML = window.intervalGenerator.generateMusicXML(progression);

            // 统计各种beam标记
            const beginBeams = (musicXML.match(/<beam number="1">begin<\/beam>/g) || []).length;
            const continueBeams = (musicXML.match(/<beam number="1">continue<\/beam>/g) || []).length;
            const endBeams = (musicXML.match(/<beam number="1">end<\/beam>/g) || []).length;
            const beam2Marks = (musicXML.match(/<beam number="2">/g) || []).length;

            // 检查beam标记总数
            const totalBeamMarks = beginBeams + continueBeams + endBeams;

            console.log('\n📊 MusicXML beam标记分析:');
            console.log(`✅ begin beam标记: ${beginBeams}个`);
            console.log(`✅ continue beam标记: ${continueBeams}个`);
            console.log(`✅ end beam标记: ${endBeams}个`);
            console.log(`✅ 第二级beam标记: ${beam2Marks}个`);
            console.log(`✅ beam标记总数: ${totalBeamMarks}个`);

            // 验证beam平衡性
            const beamBalance = beginBeams === endBeams;
            console.log(`✅ beam平衡性: ${beamBalance ? '✅ 平衡' : '❌ 不平衡'}`);

            // 显示MusicXML片段（包含beam的部分）
            console.log('\n📋 MusicXML beam标记示例:');
            const beamSamples = musicXML.match(/<beam number="1">[^<]+<\/beam>/g);
            if (beamSamples) {
                beamSamples.slice(0, 5).forEach((sample, i) => {
                    console.log(`  ${i + 1}: ${sample}`);
                });
            }

            // 检查是否有错误的XML格式
            const hasProperXML = musicXML.includes('<?xml') && musicXML.includes('</score-partwise>');

            // 验证结果
            const success = totalBeamMarks > 0 && beamBalance && hasProperXML;

            if (success) {
                console.log('🎉 直接beaming实现测试通过！');
                console.log('✅ MusicXML包含正确的beam标记');
                console.log('✅ beam标记平衡且格式正确');
            } else {
                console.log('⚠️ beaming实现仍需改进');
                if (totalBeamMarks === 0) {
                    console.log('❌ 没有发现beam标记');
                }
                if (!beamBalance) {
                    console.log('❌ beam标记不平衡');
                }
                if (!hasProperXML) {
                    console.log('❌ XML格式错误');
                }
            }

            return {
                totalBeamMarks: totalBeamMarks,
                beginBeams: beginBeams,
                continueBeams: continueBeams,
                endBeams: endBeams,
                beamBalance: beamBalance,
                hasBeam2: beam2Marks > 0,
                success: success,
                musicXML: musicXML
            };

        } catch (error) {
            console.error('❌ 直接beaming测试失败:', error);
            throw error;
        }
    };

    // 测试重拍大音程规则
    window.testStrongBeatLargeIntervals = function() {
        console.log('🧪 测试重拍大音程规则');

        if (!window.intervalGenerator) {
            console.error('❌ intervalGenerator 不存在');
            return;
        }

        try {
            const testSettings = {
                intervalTypes: [
                    // 小音程（≤5半音）
                    { name: 'unison', semitones: 0, displayName: '同度' },
                    { name: 'minor2nd', semitones: 1, displayName: '小二度' },
                    { name: 'major2nd', semitones: 2, displayName: '大二度' },
                    { name: 'minor3rd', semitones: 3, displayName: '小三度' },
                    { name: 'major3rd', semitones: 4, displayName: '大三度' },
                    { name: 'perfect4th', semitones: 5, displayName: '完全四度' },
                    // 大音程（>5半音）
                    { name: 'perfect5th', semitones: 7, displayName: '完全五度' },
                    { name: 'minor6th', semitones: 8, displayName: '小六度' },
                    { name: 'major6th', semitones: 9, displayName: '大六度' },
                    { name: 'octave', semitones: 12, displayName: '八度' }
                ],
                keySignature: ['C'],
                timeSignature: { beats: 4, beatType: 4 }, // 4/4拍测试
                tempo: 120,
                measureCount: 3,
                practiceMode: 'harmonic',
                clef: 'treble',
                rangeMin: 60,
                rangeMax: 72,
                rhythms: [
                    { value: 'quarter', displayName: '四分音符' },
                    { value: 'eighth', displayName: '八分音符' }
                ]
            };

            console.log('🎵 生成包含大小音程的测试序列（4/4拍）...');
            const progression = window.intervalGenerator.generate(testSettings);

            let strongBeatAnalysis = [];
            let weakBeatAnalysis = [];
            let violations = [];

            progression.measures.forEach((measure, mIndex) => {
                console.log(`\n📊 小节 ${mIndex + 1} 拍位强弱分析:`);

                let position = 0;
                measure.lowerVoice.forEach((note, noteIndex) => {
                    const upper = measure.upperVoice[noteIndex];

                    if (note.type === 'note') {
                        const beat = Math.floor(position) + 1; // 拍号（1-4）
                        const isStrong = window.intervalGenerator.isStrongBeat(position, testSettings.timeSignature);

                        // 计算实际音程跨度
                        const semitones = Math.abs(upper.midi - note.midi);
                        const isLargeInterval = semitones > 5;

                        const analysis = {
                            measure: mIndex + 1,
                            note: noteIndex + 1,
                            position: position,
                            beat: beat,
                            isStrong: isStrong,
                            interval: `${note.pitch}-${upper.pitch}`,
                            semitones: semitones,
                            isLarge: isLargeInterval,
                            intervalName: window.intervalGenerator.getIntervalName(semitones)
                        };

                        console.log(`  音符${noteIndex + 1}: 位置${position.toFixed(1)}, 拍${beat}, ${isStrong ? '强拍' : '弱拍'}`);
                        console.log(`    音程: ${analysis.interval} (${analysis.intervalName}, ${semitones}半音) ${isLargeInterval ? '[大音程]' : '[小音程]'}`);

                        if (isStrong) {
                            strongBeatAnalysis.push(analysis);
                        } else {
                            weakBeatAnalysis.push(analysis);
                            // 检查弱拍是否出现了大音程（这是违规的）
                            if (isLargeInterval) {
                                violations.push(analysis);
                                console.log(`    ⚠️ 违规: 弱拍出现大音程 ${analysis.intervalName}`);
                            }
                        }
                    }

                    // 更新位置
                    const duration = window.intervalGenerator.rhythmDurations[note.duration] || 1.0;
                    position += duration;
                });
            });

            // 统计结果
            console.log('\n📈 拍位强弱音程统计:');
            console.log(`✅ 强拍音符总数: ${strongBeatAnalysis.length}`);
            console.log(`✅ 弱拍音符总数: ${weakBeatAnalysis.length}`);

            const strongBeatLarge = strongBeatAnalysis.filter(a => a.isLarge).length;
            const strongBeatSmall = strongBeatAnalysis.filter(a => !a.isLarge).length;
            const weakBeatLarge = weakBeatAnalysis.filter(a => a.isLarge).length;
            const weakBeatSmall = weakBeatAnalysis.filter(a => !a.isLarge).length;

            console.log(`✅ 强拍大音程: ${strongBeatLarge}个`);
            console.log(`✅ 强拍小音程: ${strongBeatSmall}个`);
            console.log(`✅ 弱拍大音程: ${weakBeatLarge}个 ${weakBeatLarge > 0 ? '❌' : '✅'}`);
            console.log(`✅ 弱拍小音程: ${weakBeatSmall}个`);

            console.log('\n📊 4/4拍强拍弱拍验证:');
            console.log('应该的规律: 拍1(强) - 拍2(弱) - 拍3(次强) - 拍4(弱)');

            // 按拍分组统计
            for (let beat = 1; beat <= 4; beat++) {
                const beatNotes = [...strongBeatAnalysis, ...weakBeatAnalysis].filter(a => a.beat === beat);
                const isStrongBeatExpected = beat === 1 || beat === 3;

                if (beatNotes.length > 0) {
                    const actuallyStrong = beatNotes[0].isStrong;
                    const status = isStrongBeatExpected === actuallyStrong ? '✅' : '❌';
                    console.log(`  拍${beat}: ${actuallyStrong ? '强拍' : '弱拍'} (预期: ${isStrongBeatExpected ? '强拍' : '弱拍'}) ${status}`);
                }
            }

            // 违规详情
            if (violations.length > 0) {
                console.log('\n❌ 发现违规情况:');
                violations.forEach(v => {
                    console.log(`  小节${v.measure}拍${v.beat}: ${v.interval} (${v.intervalName}) 在弱拍出现`);
                });
            }

            // 验证规则实现
            const ruleCompliance = violations.length === 0;

            if (ruleCompliance) {
                console.log('🎉 重拍大音程规则测试通过！');
                console.log('✅ 所有大音程都正确出现在强拍');
                console.log('✅ 弱拍只包含小音程');
            } else {
                console.log('⚠️ 重拍大音程规则需要进一步优化');
                console.log(`❌ 发现${violations.length}个违规情况`);
            }

            return {
                strongBeatCount: strongBeatAnalysis.length,
                weakBeatCount: weakBeatAnalysis.length,
                strongBeatLargeIntervals: strongBeatLarge,
                weakBeatLargeIntervals: weakBeatLarge,
                violations: violations.length,
                ruleCompliance: ruleCompliance,
                progression: progression
            };

        } catch (error) {
            console.error('❌ 重拍大音程规则测试失败:', error);
            throw error;
        }
    };

    console.log('✅ V4.0 音程生成器集成完成');
    console.log('📌 提示: 使用 Ctrl+G 快速生成，Ctrl+R 清空乐谱');
    console.log('🧪 测试: 使用 testIntervalProgression() 测试级进连接');
    console.log('🧪 测试: 使用 testIntervalVariety() 测试音程多样性');
    console.log('🧪 测试: 使用 testRhythmGeneration() 测试节奏生成');
    console.log('🧪 测试: 使用 testNotationRules() 测试记谱规则');
    console.log('🧪 测试: 使用 testRestsAndBeaming() 测试休止符和beaming');
    console.log('🧪 测试: 使用 testNewBeamingRules() 测试新4/4拍beaming规则');
    console.log('🧪 测试: 使用 testMelodyStyleBeaming() 测试旋律风格beaming');
    console.log('🧪 测试: 使用 testDirectBeaming() 测试直接beaming实现');
    console.log('🧪 测试: 使用 testStrongBeatLargeIntervals() 测试重拍大音程规则');
})();
