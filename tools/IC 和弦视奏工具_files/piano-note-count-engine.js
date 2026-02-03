/**
 * Piano Note-Count Engine
 * 钢琴音数生成引擎 - 基于音数选择的和声生成系统
 *
 * Copyright © 2025 Igor Chen - Cognote
 *
 * 核心功能：
 * - 基于音数选择（3-7音）生成钢琴和声
 * - 双谱号分配：低音谱号（根音）+ 高音谱号（剩余音符）
 * - 音符优先级系统：三音、七音、sus音、张力音优先
 * - 完全独立于吉他voicing系统
 */

class PianoNoteCountEngine {
    constructor(harmonyTheory) {
        if (!harmonyTheory) {
            throw new Error('PianoNoteCountEngine requires HarmonyTheory instance');
        }

        this.harmonyTheory = harmonyTheory;
        this.initialized = true;

        console.log('🎹 PianoNoteCountEngine initialized');
    }

    /**
     * 生成钢琴和声
     * @param {Object} chord - 和弦对象 {root, type, quality}
     * @param {Object} settings - 钢琴设置对象（来自window.pianoSettings）
     * @param {string} key - 调号字符串（如'C-major', 'a-minor'）
     * @param {Object} keySignature - 调号信息（用于音符拼写）
     * @param {number|null} prevBassMidi - 前一个和弦的低音MIDI值（用于Voice Leading）
     * @param {Object|null} inversionSettings - 转位设置 {includeTriadInversions: boolean, includeSeventhInversions: boolean}
     * @returns {Object} {bassClefNotes: [], trebleClefNotes: [], allNotes: []}
     */
    generatePianoChord(chord, settings, key = 'C-major', keySignature = null, prevBassMidi = null, inversionSettings = null) {
        console.log('🎹 生成钢琴和声:', { chord, key, prevBassMidi, settings: settings ? 'loaded' : 'missing' });

        // 🔍 诊断：检查和弦对象的转位信息
        console.log('🔍 和弦转位信息检查:');
        console.log(`  - chord.inversion: ${chord.inversion !== undefined ? chord.inversion : '未定义'}`);
        console.log(`  - chord.inversionReason: ${chord.inversionReason || '无'}`);
        console.log(`  - chord.forcedBassNote: ${chord.forcedBassNote || '无'}`);
        console.log(`  - inversionSettings:`, inversionSettings);

        // 验证输入
        if (!chord || !chord.root || !chord.type) {
            throw new Error('Invalid chord object');
        }

        if (!settings) {
            throw new Error('Piano settings required');
        }

        // 选择音数（从enabledNoteCounts中选择）
        console.log(`🎹 可用音数: ${settings.enabledNoteCounts.join(', ')}`);
        const noteCount = this._selectRandomNoteCount(settings.enabledNoteCounts);
        console.log(`🎹 选择音数: ${noteCount}`);

        // 🔧 新增 (2025-10-06): 在选择音符之前确定转位，使doubling策略能够感知转位
        const targetInversion = this._determineTargetInversion(chord, inversionSettings);
        console.log(`🎹 目标转位: 第${targetInversion}转位`);

        // 构建和弦音符池（传递key参数）
        const chordTones = this._buildChordTonePool(chord, key);
        console.log('🎹 和弦音符池:', chordTones);

        // 选择音符（基于优先级，传递完整settings以支持tension功能）
        // 🔧 修改 (2025-10-02): _selectNotes现在返回对象{notes, tensions}，传递chord对象以支持6/9转换
        // 🔧 修改 (2025-10-06): 传递targetInversion使doubling策略能够感知转位
        const selectionResult = this._selectNotes(chordTones, noteCount, settings, chord, targetInversion);
        const selectedNotes = selectionResult.notes;
        const addedTensions = selectionResult.tensions;
        console.log('🎹 选中音符:', selectedNotes);
        if (addedTensions.length > 0) {
            console.log(`🎵 添加的tensions: ${addedTensions.join(', ')}`);
        }

        // 🔍 验证1: _selectNotes() 是否返回了正确数量的音符
        if (selectedNotes.length !== noteCount) {
            console.error(`❌ 验证失败 [步骤1: 音符选择]`);
            console.error(`  期望: ${noteCount}个音符`);
            console.error(`  实际: ${selectedNotes.length}个音符`);
            console.error(`  音符列表: ${JSON.stringify(selectedNotes)}`);
            throw new Error(`_selectNotes() 返回音符数量不匹配: 期望${noteCount}, 实际${selectedNotes.length}`);
        }
        console.log(`✅ 验证通过 [步骤1]: _selectNotes() 返回了${selectedNotes.length}个音符`);

        // 分配到双谱号
        // 🔧 修改 (2025-10-02): 传递转位设置和和弦类型以支持转位功能
        // 🔧 修改 (2025-10-06): 传递预先确定的targetInversion
        const { bassClefNotes, trebleClefNotes } = this._distributeToClefs(
            selectedNotes,
            chord,
            settings,
            inversionSettings,
            targetInversion
        );

        // 🔍 验证2: _distributeToClefs() 是否保持了音符总数
        const totalAfterDistribute = bassClefNotes.length + trebleClefNotes.length;
        if (totalAfterDistribute !== selectedNotes.length) {
            console.error(`❌ 验证失败 [步骤2: 左右手分配]`);
            console.error(`  期望: ${selectedNotes.length}个音符 (来自_selectNotes)`);
            console.error(`  实际: ${totalAfterDistribute}个音符 (左手${bassClefNotes.length} + 右手${trebleClefNotes.length})`);
            console.error(`  左手音符: [${bassClefNotes.join(', ')}]`);
            console.error(`  右手音符: [${trebleClefNotes.join(', ')}]`);
            throw new Error(`_distributeToClefs() 音符总数不匹配: 期望${selectedNotes.length}, 实际${totalAfterDistribute}`);
        }
        console.log(`✅ 验证通过 [步骤2]: _distributeToClefs() 保持了${totalAfterDistribute}个音符`);

        // 🔍 诊断：显示分配结果（2025-10-01）
        console.log('🔍 分配到双谱号后:');
        console.log(`  - bassClefNotes: [${bassClefNotes.join(', ')}] (长度: ${bassClefNotes.length})`);
        console.log(`  - trebleClefNotes: [${trebleClefNotes.join(', ')}] (长度: ${trebleClefNotes.length})`);

        // 🎼 将音符名称转换为MIDI音高（低音使用Voice Leading智能分配）
        // 🔧 修复 (2025-10-02): 7音配置需要扩大左手音域，以容纳根音八度
        let bassRangeMin = settings.bassClefRangeMin;
        let bassRangeMax = settings.bassClefRangeMax;

        if (noteCount === 7 && bassClefNotes.length === 3) {
            // 7音配置：左手需要根音+五音+根音八度，扩大上限12半音（一个八度）
            bassRangeMax = Math.min(settings.bassClefRangeMax + 12, 72);  // 最高不超过C5
            console.log(`🎯 7音配置：扩大左手音域 ${settings.bassClefRangeMin}-${settings.bassClefRangeMax} → ${bassRangeMin}-${bassRangeMax} (${this._midiToNoteName(bassRangeMin)}-${this._midiToNoteName(bassRangeMax)})`);
        }

        // 🔧 修复 (2025-10-02 Phase 2): 使用全局优化算法（适用于多音符左手或7音配置）
        let bassClefMidi;
        const useGlobalOptimization = (
            bassClefNotes.length >= 2 ||  // 左手有2个或更多音符
            (noteCount === 7 && bassClefNotes.length === 3)  // 或者是7音配置
        );

        if (useGlobalOptimization) {
            console.log(`🎯 使用全局八度优化算法（左手${bassClefNotes.length}音）`);
            const optimizedMidi = this._findOptimalOctaveCombination(
                bassClefNotes,
                bassRangeMin,
                bassRangeMax,
                prevBassMidi,
                noteCount,
                targetInversion,  // 🔧 新增 (2025-10-06): 传递转位信息
                chord.type        // 🔧 新增 (2025-10-06): 传递和弦类型
            );

            if (optimizedMidi) {
                bassClefMidi = optimizedMidi;
                console.log(`✅ 全局优化成功: [${bassClefMidi.map(m => this._midiToNoteName(m)).join(', ')}]`);
            } else {
                // 全局优化失败，抛出错误触发降级
                console.error(`❌ 全局优化失败：无法找到符合约束的八度组合`);
                throw new Error(`左手MIDI分配失败：无法在12半音约束内为${bassClefNotes.length}个音符找到合适的八度组合`);
            }
        } else {
            // 左手只有1个音符，使用原有的Voice Leading逻辑
            console.log(`🎯 使用传统Voice Leading算法（左手1音）`);
            bassClefMidi = this._assignBassWithVoiceLeading(
                bassClefNotes,
                bassRangeMin,
                bassRangeMax,
                prevBassMidi,
                keySignature,
                noteCount
            );
        }

        // 🔧 修复 (2025-10-01): 右手转位多样性 - 传递inversionIndex参数
        // 🔧 修复 (2025-10-02): 集成功能和声转位规则
        // 新策略：不是改变音符顺序，而是改变八度分配，确保不同的"最低音"

        // 🔍 诊断日志（2025-10-01）: 追踪inversionIndex生成
        console.log(`🎯 ========== 右手转位诊断 ==========`);
        console.log(`  📊 右手音符数量: ${trebleClefNotes.length}`);
        console.log(`  📊 右手音符列表: [${trebleClefNotes.join(', ')}]`);
        console.log(`  📊 是否满足转位条件（≥3音符）: ${trebleClefNotes.length >= 3}`);

        // 🎯 功能和声转位集成（2025-10-02）
        let inversionIndex = 0;

        if (trebleClefNotes.length >= 3) {
            // 🎼 检查和弦是否已由功能和声系统设置了转位
            if (chord.inversion !== undefined && chord.inversion !== null && chord.inversion > 0) {
                // ✅ 使用功能和声系统设置的转位
                inversionIndex = Math.min(chord.inversion, trebleClefNotes.length - 1);
                console.log(`  🎼 功能和声模式：使用预设转位 inversion=${chord.inversion} → inversionIndex=${inversionIndex}`);
                console.log(`  📝 转位原因: ${chord.inversionReason || '未知'}`);
                if (chord.forcedBassNote) {
                    console.log(`  🎵 强制低音: ${chord.forcedBassNote}`);
                }
            } else {
                // 🎲 随机模式：应用转位约束和随机选择

                // 🎯 检查最大转位约束（用于第三转位约束）
                let maxAllowedInversion = trebleClefNotes.length - 1;
                if (inversionSettings && inversionSettings.maxInversion !== undefined) {
                    maxAllowedInversion = Math.min(maxAllowedInversion, inversionSettings.maxInversion);
                    console.log(`  🎯 应用最大转位约束: maxInversion=${inversionSettings.maxInversion}`);
                }

                // 随机选择转位，但不超过最大约束
                inversionIndex = Math.floor(Math.random() * (maxAllowedInversion + 1));
                console.log(`  🎲 随机模式转位: inversionIndex=${inversionIndex} (最大允许: ${maxAllowedInversion})`);
            }
        }

        console.log(`  🎯 最终inversionIndex: ${inversionIndex}`);
        if (inversionIndex > 0) {
            console.log(`  🎯 目标转位: ${trebleClefNotes[inversionIndex]} 作为最低音（第${inversionIndex}转位）`);
        } else {
            console.log(`  🎯 原位配置（第0转位）`);
        }
        console.log(`========================================\n`);

        // 🔍 验证3: _assignBassWithVoiceLeading() 是否返回了正确数量的MIDI值
        if (bassClefMidi.length !== bassClefNotes.length) {
            console.error(`❌ 验证失败 [步骤3: 低音MIDI转换]`);
            console.error(`  期望: ${bassClefNotes.length}个MIDI值 (来自bassClefNotes)`);
            console.error(`  实际: ${bassClefMidi.length}个MIDI值`);
            console.error(`  输入音符: [${bassClefNotes.join(', ')}]`);
            console.error(`  输出MIDI: [${bassClefMidi.join(', ')}]`);
            throw new Error(`_assignBassWithVoiceLeading() MIDI数量不匹配: 期望${bassClefNotes.length}, 实际${bassClefMidi.length}`);
        }
        console.log(`✅ 验证通过 [步骤3]: _assignBassWithVoiceLeading() 返回了${bassClefMidi.length}个MIDI值`);

        const trebleClefMidi = this._assignMidiPitches(
            trebleClefNotes,
            settings.trebleClefRangeMin,
            settings.trebleClefRangeMax,
            keySignature,
            settings.randomArrangement,
            inversionIndex,  // 🔧 转位参数：指定哪个音符应该是最低音
            bassClefMidi     // 🔧 新增参数 (2025-10-01): 排除左手已使用的MIDI值
        );

        // 🔍 验证4: _assignMidiPitches() 是否返回了正确数量的MIDI值
        if (trebleClefMidi.length !== trebleClefNotes.length) {
            console.error(`❌ 验证失败 [步骤4: 高音MIDI转换]`);
            console.error(`  期望: ${trebleClefNotes.length}个MIDI值 (来自trebleClefNotes)`);
            console.error(`  实际: ${trebleClefMidi.length}个MIDI值`);
            console.error(`  输入音符: [${trebleClefNotes.join(', ')}]`);
            console.error(`  输出MIDI: [${trebleClefMidi.join(', ')}]`);
            console.error(`  inversionIndex: ${inversionIndex}`);
            console.error(`  排除的左手MIDI: [${bassClefMidi.join(', ')}]`);
            throw new Error(`_assignMidiPitches() MIDI数量不匹配: 期望${trebleClefNotes.length}, 实际${trebleClefMidi.length}`);
        }
        console.log(`✅ 验证通过 [步骤4]: _assignMidiPitches() 返回了${trebleClefMidi.length}个MIDI值`);

        // 🔍 诊断：显示MIDI转换结果（2025-10-01）
        console.log('🔍 MIDI转换后:');
        console.log(`  - bassClefMidi: [${bassClefMidi.join(', ')}] (长度: ${bassClefMidi.length})`);
        console.log(`  - trebleClefMidi: [${trebleClefMidi.join(', ')}] (长度: ${trebleClefMidi.length})`);

        // 🚨 验证：检查MIDI重复（2025-10-02新增）
        const allMidiValues = [...bassClefMidi, ...trebleClefMidi];
        const uniqueMidiValues = new Set(allMidiValues);
        if (uniqueMidiValues.size !== allMidiValues.length) {
            console.error(`❌ 检测到重复的MIDI值！`);
            console.error(`  总MIDI数: ${allMidiValues.length}`);
            console.error(`  唯一MIDI数: ${uniqueMidiValues.size}`);
            console.error(`  左手MIDI: [${bassClefMidi.join(', ')}]`);
            console.error(`  右手MIDI: [${trebleClefMidi.join(', ')}]`);

            // 找出重复的MIDI值
            const duplicates = allMidiValues.filter((midi, index) => allMidiValues.indexOf(midi) !== index);
            const uniqueDuplicates = [...new Set(duplicates)];
            console.error(`  重复的MIDI值: [${uniqueDuplicates.join(', ')}]`);
            uniqueDuplicates.forEach(midi => {
                const count = allMidiValues.filter(m => m === midi).length;
                console.error(`    MIDI ${midi} (${this._midiToNoteName(midi)}) 出现了 ${count} 次`);
            });

            throw new Error(`MIDI重复错误：和弦${chord.root}${chord.type}包含重复的MIDI值，违反去重约束`);
        }
        console.log(`✅ MIDI去重验证通过：所有${allMidiValues.length}个MIDI值都是唯一的`);

        // 🎼 音乐性验证（2025-10-01新增）
        const validation = this._validateMusicality(bassClefMidi, trebleClefMidi, selectedNotes);
        if (!validation.isValid) {
            console.warn(`⚠️ 和弦${chord.root}${chord.type}的voicing存在音乐性问题，但继续生成`);
        }

        // 🎼 LIL规则验证（2025-10-01新增）
        const allNotes = [...bassClefMidi, ...trebleClefMidi];
        const lilWarnings = this._validateLIL(allNotes);
        if (lilWarnings.length > 0) {
            console.warn(`🎼 LIL规则警告 (和弦${chord.root}${chord.type}):`);
            lilWarnings.forEach(w => console.warn(`  ${w}`));
        }

        const result = {
            bassClefNotes: bassClefMidi,
            trebleClefNotes: trebleClefMidi,
            allNotes: [...bassClefMidi, ...trebleClefMidi].sort((a, b) => a - b),
            noteCount: noteCount,
            chordInfo: {
                root: chord.root,
                type: chord.type,
                quality: chord.quality,
                // 🎵 新增 (2025-10-02): 保留6/9和弦标记
                is69Voicing: chord.is69Voicing || false,
                // 🔧 新增 (2025-10-02): 6/9转换失败标记（七音已被跳过）
                failed69Conversion: chord.failed69Conversion || false,
                // 🎼 新增 (2025-10-02): 功能和声转位信息
                inversion: chord.inversion || 0,
                inversionReason: chord.inversionReason || null
            },
            // 🎯 新增 (2025-10-02): 实际使用的转位索引（用于下一个和弦的第三转位约束检查）
            inversionIndex: inversionIndex,
            // 🎵 新增 (2025-10-02): tension信息用于和弦代号显示
            tensions: addedTensions  // 添加的tension类型数组（如['9'], ['13'], ['9', '13']）
        };

        // 🎵 诊断日志 (2025-10-02): 显示6/9标记是否传递成功
        if (chord.is69Voicing) {
            console.log(`🎵 6/9和弦标记已保存到result.chordInfo: is69Voicing=${result.chordInfo.is69Voicing}`);
        }

        // 🔍 验证5: 最终结果对象验证
        const finalTotalNotes = result.bassClefNotes.length + result.trebleClefNotes.length;
        if (finalTotalNotes !== noteCount) {
            console.error(`❌ 验证失败 [步骤5: 最终结果]`);
            console.error(`  期望: ${noteCount}个音符 (用户选择的音数)`);
            console.error(`  实际: ${finalTotalNotes}个音符 (左手${result.bassClefNotes.length} + 右手${result.trebleClefNotes.length})`);
            console.error(`  result对象:`, result);
            throw new Error(`最终结果音符数量不匹配: 期望${noteCount}, 实际${finalTotalNotes}`);
        }
        console.log(`✅ 验证通过 [步骤5]: 最终结果包含${finalTotalNotes}个音符`);
        console.log(`\n🎉 ========== 所有验证通过，和弦生成成功 ==========\n`);

        console.log('🎹 钢琴和声生成完成:', result);
        return result;
    }

    /**
     * 选择音符数量（2025-10-01修复：使用第一个选中的音数，确保一致性）
     * @private
     */
    _selectRandomNoteCount(enabledNoteCounts) {
        if (!enabledNoteCounts || enabledNoteCounts.length === 0) {
            throw new Error('No note counts enabled');
        }
        // 🎯 修复：使用第一个选中的音数，而非随机选择
        // 确保整个和弦进行中所有和弦的音符数量一致
        return enabledNoteCounts[0];
    }

    /**
     * 确定目标转位（在音符选择之前）
     * @private
     * @param {Object} chord - 和弦对象
     * @param {Object|null} inversionSettings - 转位设置
     * @returns {number} - 目标转位 (0-3)
     */
    _determineTargetInversion(chord, inversionSettings) {
        let targetInversion = 0;

        // 🔧 新增 (2025-10-06): 特殊和弦禁止转位
        // add2、6和弦、6/9和弦的附加音不是和弦本质音，转位会改变和弦性质
        const noInversionTypes = ['add2', 'add9', '6/9', '69'];
        const isSixthChord = chord.type === '6' || (chord.type.includes('6') && !chord.type.includes('6/9') && !chord.type.includes('69') && !chord.type.includes('7'));
        const isNoInversionChord = noInversionTypes.some(type => chord.type.includes(type)) || isSixthChord;

        if (isNoInversionChord) {
            console.log(`🚫 ${chord.root}${chord.type} 是特殊和弦（add2/6/6-9），强制使用原位`);
            return 0;  // 强制原位
        }

        // 🔧 新增 (2025-10-06): 提前确定转位，用于doubling策略
        if (chord.inversion !== undefined) {
            targetInversion = chord.inversion;
            console.log(`🎯 使用预设转位: 第${targetInversion}转位 (${chord.inversionReason || '无原因'})`);
        } else if (inversionSettings) {
            const isTriad = !chord.type.includes('7') && !chord.type.includes('9') &&
                           !chord.type.includes('11') && !chord.type.includes('13');
            const isSeventh = chord.type.includes('7') || chord.type.includes('9') ||
                             chord.type.includes('11') || chord.type.includes('13');

            console.log(`🎯 随机模式转位检测: ${chord.root}${chord.type} - ${isTriad ? '三和弦' : isSeventh ? '七和弦及扩展' : '其他'}`);

            const forceInversion = inversionSettings.forceInversion || false;
            const minInversion = inversionSettings.minInversion || 0;

            if (forceInversion) {
                console.log(`🎯 强制转位模式：minInversion=${minInversion}`);
            }

            // 根据和弦类型和转位设置决定是否使用转位
            if (isTriad && inversionSettings.includeTriadInversions) {
                // 三和弦：0-2转位
                if (forceInversion && minInversion > 0) {
                    const maxInv = 2;
                    targetInversion = minInversion + Math.floor(Math.random() * (maxInv - minInversion + 1));
                    console.log(`🎯 三和弦强制转位：选择第${targetInversion}转位（范围${minInversion}-${maxInv}）`);
                } else {
                    targetInversion = Math.floor(Math.random() * 3);
                    console.log(`🎯 三和弦随机转位：选择第${targetInversion}转位`);
                }
            } else if (isSeventh && inversionSettings.includeSeventhInversions) {
                // 七和弦：0-3转位
                if (forceInversion && minInversion > 0) {
                    const maxInv = inversionSettings.maxInversion || 3;
                    targetInversion = minInversion + Math.floor(Math.random() * (maxInv - minInversion + 1));
                    console.log(`🎯 七和弦强制转位：选择第${targetInversion}转位（范围${minInversion}-${maxInv}）`);
                } else {
                    targetInversion = Math.floor(Math.random() * 4);
                    console.log(`🎯 七和弦随机转位：选择第${targetInversion}转位`);
                }
            } else {
                console.log(`🎯 转位未启用或不适用，使用原位`);
            }
        } else {
            console.log(`🎯 未提供转位设置，默认使用原位`);
        }

        return targetInversion;
    }

    /**
     * 构建和弦音符池
     * @param {Object} chord - 和弦对象
     * @param {string} key - 调号字符串
     * @private
     */
    _buildChordTonePool(chord, key) {
        const pool = {
            root: chord.root,
            third: null,
            fifth: null,
            seventh: null,
            sus: null,
            tensions: []
        };

        // 🎹 钢琴模式修复（2025-10-01）: 使用C-major作为和弦构建上下文
        // 原因：随机模式下和弦进行可能包含不在选定调性中的和弦（如a-minor中的F#major）
        // 解决方案：始终使用C-major上下文构建和弦，避免buildChord的严格调性验证
        // 注意：这不影响音符拼写，拼写由后续的MusicXML渲染层处理
        const buildKey = 'C-major';
        console.log(`🎹 使用${buildKey}上下文构建和弦: ${chord.root}${chord.type} (原调号: ${key})`);

        const chordNotes = this.harmonyTheory.buildChord(chord.root, chord.type, buildKey);

        // 🔧 修复 (2025-10-01): buildChord()返回对象{notes: [...]}，而非数组
        if (!chordNotes || !chordNotes.notes || chordNotes.notes.length < 2) {
            throw new Error(`Failed to build chord: ${chord.root}${chord.type}`);
        }

        // 识别和弦音的功能
        pool.root = chordNotes.notes[0];  // 根音

        if (chordNotes.notes.length >= 2) {
            pool.third = chordNotes.notes[1];  // 三音（或sus音）
        }

        if (chordNotes.notes.length >= 3) {
            pool.fifth = chordNotes.notes[2];  // 五音
        }

        if (chordNotes.notes.length >= 4) {
            pool.seventh = chordNotes.notes[3];  // 七音
        }

        // 识别sus和弦
        if (chord.type.includes('sus')) {
            pool.sus = pool.third;  // sus2或sus4替代三音
            pool.third = null;
        }

        // 🎵 传统tension音（从buildChord返回的9th、11th、13th等）
        if (chordNotes.notes.length > 4) {
            pool.tensions = chordNotes.notes.slice(4);
        }

        // 🎵 添加可用tension类型信息（2025-10-01新增）
        // 基于爵士和声理论的tension规则
        const tensionRules = this._getAvailableTensions(chord.type);
        pool.availableTensions = tensionRules.available;
        pool.avoidTensions = tensionRules.avoid;

        console.log(`🎵 可用tensions: ${pool.availableTensions.join(', ')} | 避免: ${pool.avoidTensions.join(', ')}`);

        return pool;
    }

    /**
     * 基于优先级选择音符（2025-10-01重新设计）
     * 优先级顺序：根音 → 三音 → 七音 → sus音 → 五音 → tension音 → double(五音 > 根音 > 三音)
     * @private
     */
    _selectNotes(chordTones, noteCount, settings, chord = null, targetInversion = 0) {
        const selected = [];
        const enableTensions = settings?.enableTensions || false;

        console.log(`🎼 开始选择${noteCount}个音符，Tension: ${enableTensions ? '启用' : '禁用'}，目标转位: 第${targetInversion}转位`);

        // 🔍 诊断日志：显示chord对象详情
        if (chord) {
            console.log(`  🔍 和弦对象详情: root="${chord.root}", type="${chord.type}", quality="${chord.quality || 'N/A'}"`);
        } else {
            console.log(`  ⚠️ 警告：chord对象为null`);
        }

        // 🎵 新增 (2025-10-02): 6/9和弦转换系统
        // 当maj7和弦开启tension时，有一定概率转换为6/9和弦
        let use69Voicing = false;
        if (enableTensions && chord && (chord.type === 'major7' || chord.type === 'maj7')) {
            const probability69 = 0.25;  // 25%概率转换为6/9（平衡：maj7占75%，6/9占25%）
            use69Voicing = Math.random() < probability69;

            if (use69Voicing) {
                console.log(`  🎵 6/9和弦转换: ${chord.root}maj7 → ${chord.root}6/9 (概率: ${(probability69 * 100).toFixed(0)}%)`);
                // 标记和弦对象为6/9变体（用于MusicXML代号显示）
                if (chord) {
                    chord.is69Voicing = true;
                }
            } else {
                console.log(`  🎵 6/9和弦转换概率检查: ${(probability69 * 100).toFixed(0)}% - 本次保持maj7`);
            }
        } else if (enableTensions && chord) {
            console.log(`  🔍 不满足6/9转换条件: type="${chord.type}" (需要major7或maj7)`);
        } else if (enableTensions) {
            console.log(`  🔍 不满足6/9转换条件: chord对象不存在`);
        } else {
            console.log(`  ❌ Tension功能未启用: enableTensions=${enableTensions}`);
        }

        // ========== 阶段1：必须包含根音（低音谱号） ==========
        selected.push({ note: chordTones.root, role: 'root', priority: 'required' });
        console.log(`  ✅ 阶段1 - 根音: ${chordTones.root}`);

        // ========== 阶段2：和弦特征音（定义和弦性质） ==========
        // 2.1 三音（major/minor的核心区别，最高优先级）
        if (selected.length < noteCount && chordTones.third) {
            selected.push({ note: chordTones.third, role: 'third', priority: 'characteristic' });
            console.log(`  ✅ 阶段2.1 - 三音: ${chordTones.third}`);
        }

        // 2.2 七音（扩展和弦的重要音）
        // 🎵 6/9和弦特殊处理：跳过七音（6/9和弦用6度和9度替代7度）
        if (selected.length < noteCount && chordTones.seventh && !use69Voicing) {
            selected.push({ note: chordTones.seventh, role: 'seventh', priority: 'characteristic' });
            console.log(`  ✅ 阶段2.2 - 七音: ${chordTones.seventh}`);
        } else if (use69Voicing && chordTones.seventh) {
            console.log(`  ⏭️  阶段2.2 - 跳过七音（6/9和弦使用6度+9度替代）`);
        }

        // 2.3 sus音（如果是sus和弦，已包含在pool中，优先级高）
        if (selected.length < noteCount && chordTones.sus) {
            selected.push({ note: chordTones.sus, role: 'sus', priority: 'characteristic' });
            console.log(`  ✅ 阶段2.3 - sus音: ${chordTones.sus}`);
        }

        // ========== 阶段3：稳定音（完全五度） ==========
        if (selected.length < noteCount && chordTones.fifth) {
            selected.push({ note: chordTones.fifth, role: 'fifth', priority: 'stable' });
            console.log(`  ✅ 阶段3 - 五音: ${chordTones.fifth}`);
        }

        // ========== 阶段4：🎵 智能Tension系统（2025-10-01新增，2025-10-02扩展支持三和弦+6/9和弦） ==========
        // 启用条件：
        // 1. Tension开关启用
        // 2. 音数为4-7
        // 3. 已包含三音或sus音（2025-10-02修改：不再强制要求七音，支持三和弦add2/6和弦）
        if (enableTensions && noteCount >= 4 && noteCount <= 7 && selected.length < noteCount) {
            console.log(`  🎵 阶段4 - 检查Tension条件...`);

            // 检查是否满足tension条件
            const hasThird = selected.some(n => n.role === 'third');
            const hasSeventh = selected.some(n => n.role === 'seventh');
            const hasSus = selected.some(n => n.role === 'sus');

            // 🔧 2025-10-02修改：只要有三音或sus音即可，不强制要求七音
            // 原条件：(hasThird && hasSeventh) || hasSus
            // 新条件：hasThird || hasSus （支持三和弦生成add2/6和弦）
            if (hasThird || hasSus) {
                console.log(`  ✅ 满足tension条件 (3音:${hasThird}, 7音:${hasSeventh}, sus:${hasSus})`);

                // 🎵 6/9和弦特殊处理：强制添加9th和13th
                if (use69Voicing) {
                    console.log(`  🎵 6/9和弦模式：强制添加9th和13th`);

                    // 强制添加9th
                    const ninth = this._calculateTensionNote(chordTones.root, '9');
                    if (selected.length < noteCount && ninth) {
                        selected.push({ note: ninth, role: 'tension', priority: 'color', type: '9' });
                        console.log(`    ✅ 强制添加9th: ${ninth}`);
                    }

                    // 强制添加13th（大六度）
                    const thirteenth = this._calculateTensionNote(chordTones.root, '13');
                    if (selected.length < noteCount && thirteenth) {
                        selected.push({ note: thirteenth, role: 'tension', priority: 'color', type: '13' });
                        console.log(`    ✅ 强制添加13th(6度): ${thirteenth}`);
                    }

                    // 🔧 修复 (2025-10-02): 验证6/9和弦完整性
                    // 6/9和弦必须同时包含9th和13th，否则只是add2/add9和弦
                    const has9th = selected.some(n => n.role === 'tension' && n.type === '9');
                    const has13th = selected.some(n => n.role === 'tension' && n.type === '13');

                    if (!has9th || !has13th) {
                        // 如果没有同时添加9th和13th，撤销6/9标记
                        console.warn(`    ⚠️ 6/9和弦验证失败：9th=${has9th}, 13th=${has13th}`);
                        console.warn(`    ⚠️ 音符数量不足，无法形成完整6/9和弦（需要5音：根+3+5+6+9）`);
                        console.warn(`    ⚠️ 撤销6/9标记，保持为${chord.type}（可能带add2/add9）`);
                        if (chord) {
                            chord.is69Voicing = false;
                            // 🔧 新增标记：6/9转换失败，七音已被跳过
                            chord.failed69Conversion = true;
                        }
                        use69Voicing = false;  // 也重置本地标记
                    } else {
                        console.log(`    ✅ 6/9和弦验证成功：同时包含9th和13th`);
                    }
                } else {
                    // 🎲 标准Tension概率控制（2025-10-02新增）：区分三和弦和七和弦
                    // 三和弦tension概率较低（偶尔出现add2/6），七和弦tension概率较高
                    const isTriad = !chord.type.includes('7') &&
                                   !chord.type.includes('9') &&
                                   !chord.type.includes('11') &&
                                   !chord.type.includes('13');
                    const tensionProbability = isTriad ? 0.15 : 0.35;  // 三和弦15%，七和弦35%
                    const shouldAddTension = Math.random() < tensionProbability;

                    if (!shouldAddTension) {
                        console.log(`  🎲 Tension概率检查: ${(tensionProbability * 100).toFixed(0)}% - 本次不添加tension`);
                    } else {
                        console.log(`  🎲 Tension概率检查: ${(tensionProbability * 100).toFixed(0)}% - 本次添加tension ✅`);

                        // 遍历可用tensions
                        if (chordTones.availableTensions && chordTones.availableTensions.length > 0) {
                            // 🎯 随机打乱tensions顺序，避免总是优先选择9th
                            const shuffledTensions = [...chordTones.availableTensions].sort(() => Math.random() - 0.5);

                            for (const tensionType of shuffledTensions) {
                                if (selected.length >= noteCount) break;

                                // 计算tension音符名称
                                const tensionNote = this._calculateTensionNote(chordTones.root, tensionType);
                                console.log(`    🔍 尝试tension: ${tensionType} → ${tensionNote}`);

                                // 检查小九度冲突
                                let hasConflict = false;
                                for (const existing of selected) {
                                    if (this._hasMinorNinthConflict(tensionNote, existing.note)) {
                                        console.log(`      ❌ 小九度冲突: ${tensionNote} 与 ${existing.note} (${existing.role})`);
                                        hasConflict = true;
                                        break;
                                    }
                                }

                                if (!hasConflict) {
                                    selected.push({ note: tensionNote, role: 'tension', priority: 'color', type: tensionType });
                                    console.log(`      ✅ 添加tension: ${tensionNote} (${tensionType})`);
                                    break;  // 🔧 只添加一个tension，然后退出循环
                                }
                            }
                        } else {
                            console.log(`  ⚠️ 此和弦类型没有可用tensions`);
                        }
                    }
                }
            } else {
                console.log(`  ⚠️ 不满足tension条件，跳过阶段4`);
            }
        } else if (enableTensions && (noteCount < 4 || noteCount > 7)) {
            console.log(`  ⚠️ 音数${noteCount}不在4-7范围，跳过tension`);
        }

        // ========== 阶段5：智能double系统（2025-10-01重构：Close Voicing优先） ==========
        // 🎯 新策略：根据音数和Close Voicing需求，智能选择doubling
        //    - 4音配置：优先double根音（保持Close Voicing）
        //    - 5音及以上：优先double五音（稳定性）
        //    - 避免doubling: 三音（特征音）
        //    - 绝不double: 七音、sus、tension（特征音）

        if (selected.length < noteCount) {
            console.log(`  🔄 阶段5 - 需要额外${noteCount - selected.length}个音符，开始智能doubling`);

            // 🎯 根据音数配置选择doubling策略
            const doublingQueue = [];

            if (noteCount === 4) {
                // 🎹 4音配置：优先double根音（Close Voicing考虑）
                // 原因：G-B-D + G → G4-B4-D5 (紧凑7半音)
                //      G-B-D + D → D4-B4-D5 (跨度12半音，间距大)
                console.log(`  🎯 4音配置，使用Close Voicing优先策略`);

                // 根音最优先（Close Voicing最紧凑）
                if (chordTones.root) {
                    doublingQueue.push({ note: chordTones.root, role: 'root', priority: 'double-root-close' });
                }

                // 三音次优先（如果没有根音可用）
                if (chordTones.third) {
                    doublingQueue.push({ note: chordTones.third, role: 'third', priority: 'double-third' });
                }

                // 五音最后（容易产生跨度）
                if (chordTones.fifth) {
                    doublingQueue.push({ note: chordTones.fifth, role: 'fifth', priority: 'double-fifth' });
                }
            } else if (noteCount === 5) {
                // 🎹 5音配置：左手2音（根音八度优先），右手3音紧凑
                // 🔧 修复 (2025-10-01): 优先double根音2次，避免五音double导致右手跨度大
                console.log(`  🎯 5音配置，使用左手2音+右手3音策略`);

                // 优先double根音2次（左手八度 + 右手保持基础和弦）
                // 原因：G-B-D + G + G → 左手G-G，右手G-B-D（紧凑）
                //      G-B-D + G + D → 左手G-G，右手D-B-D（跨度大）❌
                if (chordTones.root) {
                    doublingQueue.push({ note: chordTones.root, role: 'root', priority: 'double-root-octave-1' });
                    doublingQueue.push({ note: chordTones.root, role: 'root', priority: 'double-root-octave-2' });
                }

                // 如果没有足够的根音（sus和弦等），才考虑double五音
                if (chordTones.fifth) {
                    doublingQueue.push({ note: chordTones.fifth, role: 'fifth', priority: 'double-fifth' });
                }

                // 最后才考虑三音
                if (chordTones.third) {
                    doublingQueue.push({ note: chordTones.third, role: 'third', priority: 'double-third' });
                }
            } else if (noteCount === 7) {
                // 🎹 7音配置特殊策略：左手根音+五音+根音八度，右手4音
                // 用户明确要求：左手3音（根音、五音、根音八度）+ 右手4音
                console.log(`  🎯 7音配置，使用特殊doubling策略（左手根音+五音+根音八度，右手4音）`);

                // 🔧 修复 (2025-10-06): 检测七和弦，使用特殊doubling策略
                const isSeventhChord = selected.some(n => n.role === 'seventh');

                if (isSeventhChord) {
                    // 🔧 新增 (2025-10-06): 转位感知的doubling策略
                    if (targetInversion === 2) {
                        // 🎵 第二转位7音配置：需要3个五音，使左手能够配置为5-1-5
                        // 目标配置：root, third, fifth, seventh + fifth(octave) + fifth + root
                        // 左手：fifth, root, fifth(octave) (5-1-5配置)
                        // 右手：third, fifth, seventh, root (close voicing)
                        console.log(`  🎵 7音七和弦第二转位：使用5-1-5左手配置策略`);
                        console.log(`  📊 Doubling策略: 2× fifth + 1× root = 3 fifths + 2 roots total`);

                        // Double五音2次（左手五音八度 + 右手close voicing）
                        if (chordTones.fifth) {
                            doublingQueue.push({ note: chordTones.fifth, role: 'fifth', priority: 'double-fifth-octave' });
                            doublingQueue.push({ note: chordTones.fifth, role: 'fifth', priority: 'double-fifth-close' });
                        }

                        // Double根音1次（左手中间位置）
                        if (chordTones.root) {
                            doublingQueue.push({ note: chordTones.root, role: 'root', priority: 'double-root-middle' });
                        }
                    } else {
                        // 🎵 原位/第一转位/第三转位7音配置：root, third, fifth, seventh + root(octave) + root + fifth
                        // 左手：root, fifth, root(octave) 或 seventh, fifth, root (第三转位)
                        // 右手：root, third, fifth, seventh (close voicing)
                        console.log(`  🎵 7音七和弦（转位${targetInversion}）：使用传统Close Voicing策略`);
                        console.log(`  📊 Doubling策略: 2× root + 1× fifth = 3 roots + 2 fifths total`);

                        // Double根音2次（左手八度 + 右手close voicing）
                        if (chordTones.root) {
                            doublingQueue.push({ note: chordTones.root, role: 'root', priority: 'double-root-octave' });
                            doublingQueue.push({ note: chordTones.root, role: 'root', priority: 'double-root-close' });
                        }

                        // Double五音1次
                        if (chordTones.fifth) {
                            doublingQueue.push({ note: chordTones.fifth, role: 'fifth', priority: 'double-fifth' });
                        }
                    }
                } else {
                    // 🎹 三和弦7音配置：原有逻辑
                    console.log(`  🎹 7音三和弦：使用原有doubling策略`);

                    // 只double根音一次（用于左手根音八度）
                    if (chordTones.root) {
                        doublingQueue.push({ note: chordTones.root, role: 'root', priority: 'double-root-octave' });
                    }

                    // 如果开启了tension且有tension音符，优先使用tension填充右手
                    if (enableTensions && chordTones.tensions && chordTones.tensions.length > 0) {
                        console.log(`  🎵 7音配置启用tension音符:`, chordTones.tensions);
                        // Tension音符在阶段4已经添加，这里只需要double根音即可
                    }

                    // 如果需要更多音符（没有tension或tension不够），double其他音
                    if (chordTones.fifth) {
                        doublingQueue.push({ note: chordTones.fifth, role: 'fifth', priority: 'double-fifth' });
                    }
                    if (chordTones.third) {
                        doublingQueue.push({ note: chordTones.third, role: 'third', priority: 'double-third' });
                    }
                }
            } else {
                // 🎹 6音及以上（非7音）：传统优先级（五音 > 根音 > 三音）
                console.log(`  🎯 ${noteCount}音配置，使用传统doubling策略`);

                // 🔧 修复 (2025-10-06): 检测七和弦，使用特殊doubling策略
                const isSeventhChord = selected.some(n => n.role === 'seventh');

                if (noteCount === 6 && isSeventhChord) {
                    // 🎵 六和弦6音配置：root, third, fifth, seventh + root(octave) + fifth
                    // 左手：root, fifth, root(octave)
                    // 右手：third, fifth, seventh (upper structure)
                    console.log(`  🎵 6音七和弦：使用Upper Structure策略`);

                    // Double根音1次（左手八度）
                    if (chordTones.root) {
                        doublingQueue.push({ note: chordTones.root, role: 'root', priority: 'double-root-octave' });
                    }

                    // Double五音1次（左手中间位置）
                    if (chordTones.fifth) {
                        doublingQueue.push({ note: chordTones.fifth, role: 'fifth', priority: 'double-fifth' });
                    }
                } else {
                    // 🎹 三和弦或其他配置：原有逻辑
                    console.log(`  🎹 三和弦或其他：使用传统doubling策略`);

                    // 五音优先（可以double多次，声音最稳定和谐）
                    if (chordTones.fifth) {
                        doublingQueue.push({ note: chordTones.fifth, role: 'fifth', priority: 'double-fifth' });
                        doublingQueue.push({ note: chordTones.fifth, role: 'fifth', priority: 'double-fifth' });
                    }

                    // 根音次优先（可以double多次，增强基础）
                    if (chordTones.root) {
                        doublingQueue.push({ note: chordTones.root, role: 'root', priority: 'double-root' });
                        doublingQueue.push({ note: chordTones.root, role: 'root', priority: 'double-root' });
                    }

                    // 三音最后（避免过度强调，仅作为最后手段）
                    if (chordTones.third) {
                        doublingQueue.push({ note: chordTones.third, role: 'third', priority: 'double-third' });
                    }
                }
            }

            // 循环使用doubling队列，直到达到目标音数
            let doublingIndex = 0;
            while (selected.length < noteCount && doublingQueue.length > 0) {
                const toDouble = doublingQueue[doublingIndex % doublingQueue.length];
                selected.push(toDouble);
                console.log(`  ✅ 阶段5.${doublingIndex + 1} - ${toDouble.priority}: ${toDouble.note}`);
                doublingIndex++;
            }

            // 安全检查：如果队列为空（理论上不应该发生）
            if (doublingQueue.length === 0 && selected.length < noteCount) {
                console.warn(`⚠️ 没有可用的doubling音符，使用根音作为fallback`);
                while (selected.length < noteCount) {
                    selected.push({ note: chordTones.root, role: 'root', priority: 'fallback-root' });
                }
            }
        }

        let result = selected.slice(0, noteCount);
        console.log(`🎼 最终选择${result.length}个音符:`, result.map(n => `${n.note}(${n.role})`).join(', '));

        // 🔧 修复 (2025-10-02 尝试4): 7音配置强制验证和修正
        if (noteCount === 7) {
            const rootCount = result.filter(n => n.role === 'root').length;
            const fifthCount = result.filter(n => n.role === 'fifth').length;

            console.log(`🔍 7音配置验证: 根音×${rootCount}, 五音×${fifthCount}`);

            // 必须至少有2个根音（一个用于左手第1位，一个用于左手第3位根音八度）
            if (rootCount < 2) {
                console.warn(`⚠️ 7音配置修正：根音数量不足（${rootCount}/2），强制添加根音八度`);
                // 如果已经有7个音符，替换优先级最低的音符
                if (result.length >= 7) {
                    // 找到非必需音符（doubling或tension）并替换
                    const replaceIndex = result.findIndex(n =>
                        n.priority && (n.priority.includes('double') || n.role === 'tension')
                    );
                    if (replaceIndex !== -1) {
                        console.log(`  🔄 替换索引${replaceIndex}的音符: ${result[replaceIndex].note}(${result[replaceIndex].role})`);
                        result[replaceIndex] = { note: chordTones.root, role: 'root', priority: 'forced-root-octave' };
                    } else {
                        console.warn(`  ⚠️ 无法找到可替换的音符，追加根音（总数将>7）`);
                        result.push({ note: chordTones.root, role: 'root', priority: 'forced-root-octave' });
                    }
                } else {
                    result.push({ note: chordTones.root, role: 'root', priority: 'forced-root-octave' });
                }
                console.log(`  ✅ 修正后: 根音×${result.filter(n => n.role === 'root').length}`);
            }

            // 必须至少有1个五音（用于左手第2位）
            if (fifthCount < 1 && chordTones.fifth) {
                console.warn(`⚠️ 7音配置修正：缺少五音（${fifthCount}/1），强制添加`);
                // 如果已经有7个音符且缺少五音，替换非必需音符
                if (result.length >= 7) {
                    const replaceIndex = result.findIndex(n =>
                        n.priority && (n.priority.includes('double') || n.role === 'tension')
                    );
                    if (replaceIndex !== -1) {
                        console.log(`  🔄 替换索引${replaceIndex}的音符: ${result[replaceIndex].note}(${result[replaceIndex].role})`);
                        result[replaceIndex] = { note: chordTones.fifth, role: 'fifth', priority: 'forced-fifth' };
                    } else {
                        console.warn(`  ⚠️ 无法找到可替换的音符，追加五音（总数将>7）`);
                        result.push({ note: chordTones.fifth, role: 'fifth', priority: 'forced-fifth' });
                    }
                } else {
                    result.push({ note: chordTones.fifth, role: 'fifth', priority: 'forced-fifth' });
                }
                console.log(`  ✅ 修正后: 五音×${result.filter(n => n.role === 'fifth').length}`);
            }

            // 确保修正后仍然是7个音符（如果超过，移除多余的）
            if (result.length > 7) {
                console.warn(`⚠️ 修正后音符数量超过7（${result.length}），移除多余音符`);
                result = result.slice(0, 7);
            }

            console.log(`🎼 7音配置修正完成:`, result.map(n => `${n.note}(${n.role})`).join(', '));
        }

        // 🎵 提取tension信息（2025-10-02新增：用于和弦代号显示）
        const tensions = result
            .filter(n => n.role === 'tension' && n.type)
            .map(n => n.type);  // 提取tension类型（如'9', '13'）

        if (tensions.length > 0) {
            console.log(`🎵 检测到tensions: ${tensions.join(', ')}`);
        }

        // 返回对象包含音符列表和tensions信息
        return {
            notes: result,
            tensions: tensions  // 添加的tension类型数组
        };
    }

    /**
     * 分配音符到双谱号（2025-10-01重构：灵活的3-7音配置）
     * 🔧 修改 (2025-10-02): 支持转位功能 - 根据转位设置选择低音音符
     * 🔧 修改 (2025-10-06): 接收预先确定的targetInversion，避免重复计算
     * 左手：1-3音（根音为主，可能包含五音，或转位音）
     * 右手：剩余音符（特征音、张力音）
     * @param {Array} selectedNotes - 选中的音符列表 [{note, role}, ...]
     * @param {Object} chord - 和弦对象 {root, type, quality}
     * @param {Object} settings - 钢琴设置
     * @param {Object|null} inversionSettings - 转位设置 {includeTriadInversions, includeSeventhInversions}
     * @param {number} targetInversion - 预先确定的目标转位 (0-3)
     * @private
     */
    _distributeToClefs(selectedNotes, chord, settings, inversionSettings = null, targetInversion = 0) {
        const totalNotes = selectedNotes.length;
        const rootNote = chord.root;  // 提取根音，保持兼容性

        console.log(`🎹 开始分配${totalNotes}音到左右手，使用转位${targetInversion}`);

        // 🔧 修改 (2025-10-06): 使用预先确定的targetInversion，避免重复计算
        let bassNoteRole = 'root';  // 默认低音是根音
        let forcedBassNote = chord.forcedBassNote || null;  // 功能和声可能强制指定的低音音符

        // 根据转位决定低音音符的role
        if (targetInversion === 1) {
            bassNoteRole = 'third';
            console.log(`  🎵 第一转位：三音在低音`);
        } else if (targetInversion === 2) {
            bassNoteRole = 'fifth';
            console.log(`  🎵 第二转位：五音在低音`);
        } else if (targetInversion === 3) {
            bassNoteRole = 'seventh';
            console.log(`  🎵 第三转位：七音在低音`);
        } else {
            console.log(`  🎵 原位：根音在低音`);
        }

        // 🎯 灵活的左手音符数量配置（符合用户手册）
        // 🔧 优化 (2025-10-01): 右手人体工学优化 - 确保右手≤3音，避免拥挤
        let leftHandCount;
        let fiveNoteOption = null;  // 记录5音配置的选项
        if (totalNotes === 3) {
            leftHandCount = 1;  // 3音：左手1音（根音） + 右手2音
        } else if (totalNotes === 4) {
            leftHandCount = 1;  // 4音：左手1音（根音） + 右手3音
        } else if (totalNotes === 5) {
            // 🔧 优化 (2025-10-01): 强制方案A，确保右手只有3音（舒适）
            // 原方案B（左手1+右手4）会导致右手4音在10半音内过于拥挤
            leftHandCount = 2;  // 左手2音（根音+五音） + 右手3音
            console.log(`  🎯 5音配置：左手2音 + 右手3音（人体工学优化）`);
        } else if (totalNotes === 6) {
            // 🔧 优化 (2025-10-01): 强制左手3音，确保右手只有3音
            // 原随机方案中"左手2+右手4"会导致右手过于拥挤
            leftHandCount = 3;  // 左手3音 + 右手3音（最平衡配置）
            console.log(`  🎯 6音配置：左手3音 + 右手3音（人体工学优化）`);
        } else if (totalNotes === 7) {
            // 🔧 优化 (2025-10-01): 7音固定配置 - 用户明确要求
            // 左手3音：根音 + 五音 + 根音八度（高八度）
            // 右手4音：其他和弦音（三音、七音、可能的tension音）
            leftHandCount = 3;
            console.log(`  🎯 7音配置：左手3音（根音+五音+根音八度） + 右手4音（用户特定要求）`);
        } else {
            // fallback逻辑（理论上不应该到这里，因为只支持3-7音）
            leftHandCount = Math.min(3, Math.max(1, Math.floor(totalNotes / 3)));
        }

        console.log(`  📊 配置: ${totalNotes}音 → 左手${leftHandCount}音, 右手${totalNotes - leftHandCount}音`);

        // 🎹 左手音符选择策略：使用索引追踪，优先选择稳定音（根音、五音）
        const bassClefNotes = [];
        const leftHandIndices = new Set();  // 追踪哪些音符索引被左手使用

        // 🎯 步骤1：选择低音音符（根据转位设置）
        // 🔧 修改 (2025-10-02): 支持转位 - 不总是根音，可能是三音/五音/七音
        let bassNoteIndex = -1;

        // 查找具有目标role的音符
        for (let i = 0; i < selectedNotes.length; i++) {
            if (selectedNotes[i].role === bassNoteRole) {
                bassNoteIndex = i;
                break;
            }
        }

        // 如果找不到目标role（理论上不应该发生），回退到根音
        if (bassNoteIndex === -1) {
            console.warn(`⚠️ 警告：未找到role=${bassNoteRole}的音符，回退到根音`);
            bassNoteIndex = 0;  // 第一个音符通常是根音
        }

        bassClefNotes.push(selectedNotes[bassNoteIndex].note);
        leftHandIndices.add(bassNoteIndex);
        console.log(`  ✅ 左手音符1: ${selectedNotes[bassNoteIndex].note} (${selectedNotes[bassNoteIndex].role}) - ${targetInversion === 0 ? '原位' : `第${targetInversion}转位`}`);

        // 🎯 步骤2：如果需要更多左手音符，优先添加五音或根音八度
        // 🔧 修复 (2025-10-01 第十次): 左手只选择根音或五音，支持根音八度
        // 🔧 优化 (2025-10-01): 7音配置特殊处理 - 固定左手为根音+五音+根音八度
        // 🔧 修改 (2025-10-02): 使用实际选中的低音音符，而不是假设selectedNotes[0]
        if (leftHandCount >= 2) {
            // 已分配的音符名称（用于避免重复）
            const usedNoteNames = new Set([selectedNotes[bassNoteIndex].note]);

            if ((totalNotes === 6 || totalNotes === 7) && leftHandCount === 3) {
                // 🎵 6音/7音配置特殊逻辑：根据转位智能选择左手配置
                // 🔧 新增 (2025-10-06): 转位智能左手配置优化

                if (targetInversion === 2) {
                    // 🎵 第二转位（五音在低音）：五音 + 根音 + 五音八度
                    console.log(`  🎵 ${totalNotes}音第二转位：左手配置为五音+根音+五音八度`);

                    // 步骤1：已有五音作为低音（bassClefNotes[0]）

                    // 步骤2：添加根音
                    for (let i = 1; i < selectedNotes.length && bassClefNotes.length < 2; i++) {
                        const note = selectedNotes[i];
                        if (note.role === 'root' && !leftHandIndices.has(i)) {
                            bassClefNotes.push(note.note);
                            leftHandIndices.add(i);
                            usedNoteNames.add(note.note);
                            console.log(`  ✅ 左手音符2: ${note.note} (根音)`);
                            break;
                        }
                    }

                    // 步骤3：添加五音八度（允许五音名称重复）
                    if (bassClefNotes.length >= 2) {
                        for (let i = 1; i < selectedNotes.length && bassClefNotes.length < 3; i++) {
                            const note = selectedNotes[i];
                            if (note.role === 'fifth' && !leftHandIndices.has(i)) {
                                bassClefNotes.push(note.note);
                                leftHandIndices.add(i);
                                console.log(`  ✅ 左手音符3: ${note.note} (五音八度)`);
                                break;
                            }
                        }
                    }

                    if (bassClefNotes.length < 3) {
                        console.error(`❌ ${totalNotes}音第二转位配置错误：左手无法找到完整的五音+根音+五音八度`);
                        console.error(`  已选择: ${bassClefNotes.length}音`);
                        console.error(`  selectedNotes角色:`, selectedNotes.map(n => `${n.note}(${n.role})`));
                        throw new Error(`${totalNotes}音第二转位失败：左手只找到${bassClefNotes.length}个音符，需要3个（五音+根音+五音八度）`);
                    }

                } else if (targetInversion === 3) {
                    // 🎵 第三转位（七音在低音）：七音 + 五音 + 根音
                    console.log(`  🎵 ${totalNotes}音第三转位：左手配置为七音+五音+根音（避免低音区太挤）`);

                    // 步骤1：已有七音作为低音（bassClefNotes[0]）

                    // 步骤2：添加五音
                    for (let i = 1; i < selectedNotes.length && bassClefNotes.length < 2; i++) {
                        const note = selectedNotes[i];
                        if (note.role === 'fifth' && !leftHandIndices.has(i)) {
                            bassClefNotes.push(note.note);
                            leftHandIndices.add(i);
                            usedNoteNames.add(note.note);
                            console.log(`  ✅ 左手音符2: ${note.note} (五音)`);
                            break;
                        }
                    }

                    // 步骤3：添加根音
                    if (bassClefNotes.length >= 2) {
                        for (let i = 1; i < selectedNotes.length && bassClefNotes.length < 3; i++) {
                            const note = selectedNotes[i];
                            if (note.role === 'root' && !leftHandIndices.has(i)) {
                                bassClefNotes.push(note.note);
                                leftHandIndices.add(i);
                                usedNoteNames.add(note.note);
                                console.log(`  ✅ 左手音符3: ${note.note} (根音)`);
                                break;
                            }
                        }
                    }

                    if (bassClefNotes.length < 3) {
                        console.error(`❌ ${totalNotes}音第三转位配置错误：左手无法找到完整的七音+五音+根音`);
                        console.error(`  已选择: ${bassClefNotes.length}音`);
                        console.error(`  selectedNotes角色:`, selectedNotes.map(n => `${n.note}(${n.role})`));
                        throw new Error(`${totalNotes}音第三转位失败：左手只找到${bassClefNotes.length}个音符，需要3个（七音+五音+根音）`);
                    }

                } else {
                    // 🎵 原位/第一转位：保持原有配置（根音+五音+根音八度 或 三音+五音+根音）
                    const inversionName = targetInversion === 0 ? '原位' : targetInversion === 1 ? '第一转位' : '未知转位';
                    console.log(`  🎵 ${totalNotes}音${inversionName}：左手使用标准配置`);

                    // 第一步：找五音
                    for (let i = 1; i < selectedNotes.length && bassClefNotes.length < 2; i++) {
                        const note = selectedNotes[i];
                        if (note.role === 'fifth' && !leftHandIndices.has(i)) {
                            bassClefNotes.push(note.note);
                            leftHandIndices.add(i);
                            usedNoteNames.add(note.note);
                            console.log(`  ✅ 左手音符2: ${note.note} (五音)`);
                            break;
                        }
                    }

                    // 第二步：找根音八度（允许根音名称重复）
                    if (bassClefNotes.length >= 2) {
                        for (let i = 1; i < selectedNotes.length && bassClefNotes.length < 3; i++) {
                            const note = selectedNotes[i];
                            if (note.role === 'root' && !leftHandIndices.has(i)) {
                                bassClefNotes.push(note.note);
                                leftHandIndices.add(i);
                                console.log(`  ✅ 左手音符3: ${note.note} (根音八度)`);
                                break;
                            }
                        }
                    }

                    if (bassClefNotes.length < 3) {
                        console.error(`❌ ${totalNotes}音${inversionName}配置错误：左手无法找到完整配置`);
                        console.error(`  已选择: ${bassClefNotes.length}音`);
                        console.error(`  selectedNotes角色:`, selectedNotes.map(n => `${n.note}(${n.role})`));
                        console.error(`  根音数量: ${selectedNotes.filter(n => n.role === 'root').length}`);
                        console.error(`  五音数量: ${selectedNotes.filter(n => n.role === 'fifth').length}`);
                        console.error(`  💡 这通常意味着 _selectNotes() 的验证逻辑失败`);
                        throw new Error(`${totalNotes}音${inversionName}失败：左手只找到${bassClefNotes.length}个音符，需要3个`);
                    }
                }
            } else {
                // 其他配置：使用原有逻辑
                // 🔧 新增 (2025-10-06): 5音配置第三转位特殊处理
                const is5NoteConfig = totalNotes === 5 && leftHandCount === 2;
                const isThirdInversion = targetInversion === 3;

                if (is5NoteConfig && isThirdInversion) {
                    // 🎵 5音配置第三转位：七音 + 五音（固定配置）
                    console.log(`  🎵 5音配置第三转位：左手配置为七音+五音`);

                    // 步骤1：已有七音作为低音（bassClefNotes[0]）

                    // 步骤2：添加五音
                    for (let i = 1; i < selectedNotes.length && bassClefNotes.length < 2; i++) {
                        const note = selectedNotes[i];
                        if (note.role === 'fifth' && !leftHandIndices.has(i)) {
                            bassClefNotes.push(note.note);
                            leftHandIndices.add(i);
                            usedNoteNames.add(note.note);
                            console.log(`  ✅ 左手音符2: ${note.note} (五音)`);
                            break;
                        }
                    }

                    if (bassClefNotes.length < 2) {
                        console.error(`❌ 5音第三转位配置错误：左手无法找到五音`);
                        console.error(`  已选择: ${bassClefNotes.length}音`);
                        console.error(`  selectedNotes角色:`, selectedNotes.map(n => `${n.note}(${n.role})`));
                        throw new Error(`5音第三转位失败：左手只找到${bassClefNotes.length}个音符，需要2个（七音+五音）`);
                    }

                } else {
                    // 原有逻辑：非第三转位的其他配置
                    // 🔧 新增 (2025-10-02): 5音配置增加变化性 - 50%选择五音，50%选择根音八度
                    const preferRootOctave = is5NoteConfig && Math.random() < 0.5;

                    if (preferRootOctave) {
                        // 🎵 5音配置：优先选择根音八度（增加低音线条变化）
                        console.log(`  🎲 5音配置：随机选择根音八度作为左手第2音`);
                        for (let i = 1; i < selectedNotes.length && bassClefNotes.length < leftHandCount; i++) {
                            const note = selectedNotes[i];
                            // 选择根音八度
                            if (note.role === 'root' && !leftHandIndices.has(i)) {
                                bassClefNotes.push(note.note);
                                leftHandIndices.add(i);
                                usedNoteNames.add(note.note);
                                console.log(`  ✅ 左手音符${bassClefNotes.length}: ${note.note} (根音八度)`);
                            }
                        }

                        // Fallback: 如果没有根音八度，选择五音
                        if (bassClefNotes.length < leftHandCount) {
                            console.log(`  🔄 根音八度不可用，回退到五音`);
                            for (let i = 1; i < selectedNotes.length && bassClefNotes.length < leftHandCount; i++) {
                                const note = selectedNotes[i];
                                if (note.role === 'fifth' && !usedNoteNames.has(note.note) && !leftHandIndices.has(i)) {
                                    bassClefNotes.push(note.note);
                                    leftHandIndices.add(i);
                                    usedNoteNames.add(note.note);
                                    console.log(`  ✅ 左手音符${bassClefNotes.length}: ${note.note} (五音)`);
                                }
                            }
                        }
                    } else {
                        // 第一优先级：选择五音（稳定音，且通常不会与根音重名）
                        if (is5NoteConfig) {
                            console.log(`  🎲 5音配置：随机选择五音作为左手第2音`);
                        }
                        for (let i = 1; i < selectedNotes.length && bassClefNotes.length < leftHandCount; i++) {
                            const note = selectedNotes[i];
                            // 只选择五音，且避免重复音符名称，且必须是未被选择的索引
                            if (note.role === 'fifth' && !usedNoteNames.has(note.note) && !leftHandIndices.has(i)) {
                                bassClefNotes.push(note.note);
                                leftHandIndices.add(i);
                                usedNoteNames.add(note.note);
                                console.log(`  ✅ 左手音符${bassClefNotes.length}: ${note.note} (${note.role})`);
                            }
                        }

                        // 第二优先级：如果五音不够，优先选择根音八度（允许重复根音名称）
                        if (bassClefNotes.length < leftHandCount) {
                            console.log(`  🔄 五音不够，优先选择根音八度`);
                            // 先选择根音八度
                            for (let i = 1; i < selectedNotes.length && bassClefNotes.length < leftHandCount; i++) {
                                const note = selectedNotes[i];
                                // 只选择根音，且必须是未被选择的索引
                                if (note.role === 'root' && !leftHandIndices.has(i)) {
                                    bassClefNotes.push(note.note);
                                    leftHandIndices.add(i);
                                    usedNoteNames.add(note.note);
                                    console.log(`  ✅ 左手音符${bassClefNotes.length}: ${note.note} (${note.role} - 根音八度)`);
                                }
                            }
                        }

                        // 第三优先级：如果根音也不够，才选择额外的五音
                        if (bassClefNotes.length < leftHandCount) {
                            console.log(`  🔄 根音不够，选择额外五音`);
                            for (let i = 1; i < selectedNotes.length && bassClefNotes.length < leftHandCount; i++) {
                                const note = selectedNotes[i];
                                // 选择五音，且必须是未被选择的索引
                                if (note.role === 'fifth' && !leftHandIndices.has(i)) {
                                    bassClefNotes.push(note.note);
                                    leftHandIndices.add(i);
                                    usedNoteNames.add(note.note);
                                    console.log(`  ✅ 左手音符${bassClefNotes.length}: ${note.note} (${note.role} - 额外五音)`);
                                }
                            }
                        }

                        // 第四优先级：如果仍不够（理论上不应该发生），记录警告
                        if (bassClefNotes.length < leftHandCount) {
                            console.warn(`⚠️ 警告：左手需要${leftHandCount}音，但只找到${bassClefNotes.length}音（根音+五音）`);
                            console.warn(`  selectedNotes角色分布:`, selectedNotes.map(n => n.role));
                        }
                    }
                }
            }
        }

        // 🎯 步骤3已并入步骤2，不再需要

        // 🎼 右手音符：所有未被左手使用的音符（特征音、张力音）
        const trebleClefNotes = [];
        const trebleClefRoles = [];  // 🔧 新增：追踪每个右手音符的role
        for (let i = 0; i < selectedNotes.length; i++) {
            if (!leftHandIndices.has(i)) {
                trebleClefNotes.push(selectedNotes[i].note);
                trebleClefRoles.push(selectedNotes[i].role);  // 🔧 新增：记录role
                console.log(`  ✅ 右手音符${trebleClefNotes.length}: ${selectedNotes[i].note} (${selectedNotes[i].role})`);
            }
        }

        // 🔧 修复 (2025-10-01): 重新排序为原位和弦顺序 (root-third-fifth-seventh-tension-sus)
        // 这确保rotation系统从一致的原位基础开始
        const roleOrder = { 'root': 0, 'third': 1, 'fifth': 2, 'seventh': 3, 'tension': 4, 'sus': 5 };
        const paired = trebleClefNotes.map((note, i) => ({
            note,
            role: trebleClefRoles[i],
            order: roleOrder[trebleClefRoles[i]] !== undefined ? roleOrder[trebleClefRoles[i]] : 99
        }));
        paired.sort((a, b) => a.order - b.order);
        const sortedTrebleNotes = paired.map(p => p.note);

        if (sortedTrebleNotes.join(',') !== trebleClefNotes.join(',')) {
            console.log(`  🔄 重新排序为原位: [${trebleClefNotes.join(', ')}] → [${sortedTrebleNotes.join(', ')}]`);
        } else {
            console.log(`  ✅ 音符已是原位顺序: [${sortedTrebleNotes.join(', ')}]`);
        }

        console.log(`  📊 最终分配: 左手${bassClefNotes.length}音 [${bassClefNotes.join(', ')}] | 右手${trebleClefNotes.length}音 [${sortedTrebleNotes.join(', ')}]`);

        // 验证右手最少音符数
        const minTrebleNotes = 2;  // 右手至少2音
        if (sortedTrebleNotes.length < minTrebleNotes) {
            console.warn(`⚠️ 右手音符数(${sortedTrebleNotes.length})少于最小要求(${minTrebleNotes})`);
        }

        return {
            bassClefNotes,
            trebleClefNotes: sortedTrebleNotes  // 🔧 修复：返回排序后的原位和弦
            // 🔧 移除 (2025-10-06): targetInversion已由外部传入，不再返回
        };
    }

    /**
     * 音乐性验证（2025-10-01新增）
     * 验证和弦voicing的可演奏性和音乐合理性
     * @private
     */
    _validateMusicality(bassClefMidi, trebleClefMidi, selectedNotes) {
        console.log(`🎼 开始音乐性验证...`);
        let isValid = true;
        const warnings = [];

        // 验证1: 右手音符数量（至少2音）
        if (trebleClefMidi.length < 2) {
            warnings.push(`⚠️ 右手音符过少 (${trebleClefMidi.length}音)`);
            isValid = false;
        }

        // 验证2: 左手手距（跨度不超过12半音 = 八度，用户硬性要求）
        if (bassClefMidi.length >= 2) {
            const bassMin = Math.min(...bassClefMidi);
            const bassMax = Math.max(...bassClefMidi);
            const bassSpan = bassMax - bassMin;
            if (bassSpan > 12) {
                warnings.push(`⚠️ 左手跨度过大 (${bassSpan}半音 > 12半音/八度)`);
                isValid = false;
            } else {
                console.log(`  ✅ 左手跨度合理: ${bassSpan}半音 ≤ 12半音（八度）`);
            }
        }

        // 验证3: 右手手距（跨度不超过12半音 = 八度，用户硬性要求）
        if (trebleClefMidi.length >= 2) {
            const trebleMin = Math.min(...trebleClefMidi);
            const trebleMax = Math.max(...trebleClefMidi);
            const trebleSpan = trebleMax - trebleMin;
            if (trebleSpan > 12) {
                warnings.push(`⚠️ 右手跨度过大 (${trebleSpan}半音 > 12半音/八度)`);
                isValid = false;
            } else {
                console.log(`  ✅ 右手跨度合理: ${trebleSpan}半音 ≤ 12半音（八度）`);
            }
        }

        // 验证4: 特征音应该在右手（三音、七音优先在高音区）
        const characteristicRoles = ['third', 'seventh', 'sus'];
        const leftHandRoles = selectedNotes.slice(0, bassClefMidi.length).map(n => n.role);
        const characteristicInBass = leftHandRoles.filter(r => characteristicRoles.includes(r));
        if (characteristicInBass.length > 1) {
            warnings.push(`⚠️ 过多特征音在左手 (${characteristicInBass.join(', ')})`);
            // 这不是致命错误，只是警告
        } else {
            console.log(`  ✅ 特征音分配合理`);
        }

        // 验证5: 音符间距检查（相邻音符不应该过于紧密在低音区）
        if (bassClefMidi.length >= 2) {
            const sortedBass = [...bassClefMidi].sort((a, b) => a - b);
            for (let i = 1; i < sortedBass.length; i++) {
                const interval = sortedBass[i] - sortedBass[i - 1];
                if (interval < 3 && sortedBass[i] < 48) {  // 小三度间隔，且在C3以下
                    warnings.push(`⚠️ 左手低音区音符过于紧密 (间隔${interval}半音)`);
                }
            }
        }

        // 输出验证结果
        if (warnings.length > 0) {
            warnings.forEach(w => console.warn(w));
        }

        if (isValid) {
            console.log(`  ✅ 音乐性验证通过`);
        } else {
            console.log(`  ⚠️ 音乐性验证有警告（可能影响可演奏性）`);
        }

        return {
            isValid,
            warnings
        };
    }

    /**
     * 将音符名称转换为MIDI音高并分配到指定音域（2025-10-01重构：紧凑voicing优先）
     * @param {Array} excludedMidi - 左手已使用的MIDI值，右手需要避免重复 (2025-10-01新增)
     * @private
     */
    _assignMidiPitches(noteNames, rangeMin, rangeMax, keySignature, randomize = false, inversionIndex = 0, excludedMidi = []) {
        if (!noteNames || noteNames.length === 0) {
            return [];
        }

        console.log(`🎹 开始分配MIDI音高 - 音域: ${rangeMin}-${rangeMax} (${this._midiToNoteName(rangeMin)}-${this._midiToNoteName(rangeMax)})`);

        // 🔧 修复 (2025-10-01 第二次): 移除randomize依赖

        // 🔧 修复 (2025-10-01): 基于最低音的八度分配策略
        // 关键洞察：转位的本质不是改变音符顺序，而是改变哪个音符在最低音
        // inversionIndex指定哪个音符应该是最低音（0=原位，1=第一转位，2=第二转位...）
        // 🔧 修复 (2025-10-01 第二次): 移除randomize依赖，总是应用转位约束
        if (inversionIndex > 0) {
            console.log(`  🎯 转位模式: inversion ${inversionIndex} (${noteNames[inversionIndex]} 作为最低音)`);
        }

        const midiNotes = [];
        console.log(`  📊 原始音符: ${noteNames.join(', ')} (${noteNames.length}个音符)`);

        // 🎯 使用紧凑度评估算法找到最佳八度组合
        const pitchClasses = noteNames.map(name => this._noteToPitchClass(name));

        console.log(`  🔍 评估音符: ${noteNames.join(', ')}`);
        console.log(`    音高类别: ${pitchClasses.join(', ')}`);

        // 🎯 策略: 为每个音符生成所有可能的八度候选
        // 🔧 修复 (2025-10-01): 排除左手已使用的MIDI值
        const excludedSet = new Set(excludedMidi);  // 转换为Set提高查找效率

        const allCandidates = pitchClasses.map(pc => {
            const candidates = [];
            for (let octave = 0; octave <= 8; octave++) {
                const midi = octave * 12 + pc;
                // 排除已被左手使用的MIDI值
                if (midi >= rangeMin && midi <= rangeMax && !excludedSet.has(midi)) {
                    candidates.push(midi);
                }
            }
            return candidates;
        });

        console.log(`    🔍 每个音符的可选八度 (排除左手MIDI ${excludedMidi.join(', ')}):`);
        allCandidates.forEach((candidates, i) => {
            const candidateStr = candidates.length > 0
                ? candidates.map(m => this._midiToNoteName(m)).join(', ')
                : '⚠️ 无可用八度（全被左手占用）';
            console.log(`      ${noteNames[i]}: ${candidateStr}`);
        });

        // 🔧 紧急检查：在生成组合前检测空候选（2025-10-02修复：禁止与左手共享MIDI）
        const emptyCandidates = allCandidates.filter(c => c.length === 0);
        if (emptyCandidates.length > 0) {
            console.error(`  ❌ 检测到 ${emptyCandidates.length} 个音符没有可用八度（被左手MIDI完全占用）`);
            allCandidates.forEach((candidates, i) => {
                if (candidates.length === 0) {
                    console.error(`    ❌ ${noteNames[i]}: 无可用八度（左手占用: ${excludedMidi.filter(m => m % 12 === pitchClasses[i]).join(', ')}）`);
                }
            });

            // 🚨 修复 (2025-10-02): 不允许与左手共享MIDI值，直接抛出错误
            // 原因：共享MIDI会导致"两个一样的音"问题
            // 解决：触发降级策略，尝试更少的音数配置
            console.error(`  ❌ 无法为右手分配MIDI值（避免与左手重复）`);
            console.error(`  💡 建议：触发降级策略，减少音符数量`);
            throw new Error(`右手MIDI分配失败：音域过窄或左手占用过多音高，无法避免重复MIDI`);
        }

        // 🎯 策略4: 智能组合生成：避免重复MIDI（包括与左手重复），找到最紧凑的组合
        // 🔧 修复 (2025-10-02): 在组合生成时也检查excludedMidi，确保右手不与左手重复
        function generateCombinations(index, currentVoicing) {
            if (index === pitchClasses.length) {
                return [currentVoicing];
            }

            const results = [];
            const candidates = allCandidates[index];

            for (const midi of candidates) {
                // 🔧 修复 (2025-10-02): 双重检查 - 既不与右手内部重复，也不与左手重复
                if (!currentVoicing.includes(midi) && !excludedSet.has(midi)) {
                    results.push(...generateCombinations(index + 1, [...currentVoicing, midi]));
                }
            }

            return results;
        }

        const allCombinations = generateCombinations(0, []);
        console.log(`    📊 生成 ${allCombinations.length} 种可能的八度组合`);

        // 🔍 诊断日志（2025-10-01）: 显示部分组合示例
        console.log(`🔍 ========== 组合生成诊断 ==========`);
        console.log(`  📊 总组合数: ${allCombinations.length}`)
        if (allCombinations.length > 0 && allCombinations.length <= 10) {
            console.log(`  📊 所有组合:`);
            allCombinations.forEach((combo, i) => {
                const noteNames = combo.map(m => this._midiToNoteName(m));
                console.log(`    ${i}: [${noteNames.join(', ')}] MIDI: [${combo.join(', ')}]`);
            });
        } else if (allCombinations.length > 10) {
            console.log(`  📊 前5个组合示例:`);
            allCombinations.slice(0, 5).forEach((combo, i) => {
                const noteNames = combo.map(m => this._midiToNoteName(m));
                console.log(`    ${i}: [${noteNames.join(', ')}] MIDI: [${combo.join(', ')}]`);
            });
        }
        console.log(`=======================================\n`);

        // 🎯 性能保护
        const MAX_COMBINATIONS = 500;
        const combinationsToTest = allCombinations.length > MAX_COMBINATIONS
            ? allCombinations.slice(0, MAX_COMBINATIONS)
            : allCombinations;

        if (allCombinations.length > MAX_COMBINATIONS) {
            console.warn(`    ⚠️ 组合数过多，只评估前${MAX_COMBINATIONS}个组合`);
        }

        // 🎯 策略5: 评估所有组合，找到最紧凑的voicing
        let bestVoicing = null;
        let bestCompactness = Infinity;
        let bestVoicingGlobal = null;
        let bestCompactnessGlobal = Infinity;

        // 🔍 诊断计数器（2025-10-01）
        let totalCombinations = 0;
        let filteredByInversion = 0;
        let filteredByHandSpan = 0;  // 🔧 新增：跨度过滤计数
        let passedCombinations = 0;

        // 🔧 修复 (2025-10-06): 自适应手距约束 - 根据右手音符数量动态调整
        // 问题根源：6/7音配置需要大量doubling，10半音过严，导致七和弦无法生成
        // 策略：
        //   - 右手2-3音: 10半音（大七度）- 保持紧凑voicing
        //   - 右手4音:   12半音（纯八度）- 允许七和弦+doubles适配
        // 用户反馈：12半音跨度（八度）已被左右手验证逻辑接受，符合可弹性要求
        const MAX_HAND_SPAN = noteNames.length >= 4 ? 12 : 10;  // 自适应手距

        for (const testVoicing of combinationsToTest) {
            totalCombinations++;
            const sorted = [...testVoicing].sort((a, b) => a - b);
            const span = sorted[sorted.length - 1] - sorted[0];

            // 🔧 硬性跨度约束：直接过滤掉跨度过大的组合
            if (span > MAX_HAND_SPAN) {
                filteredByHandSpan++;
                continue;  // 跳过此组合
            }

            let intervalSum = 0;
            let maxInterval = 0;
            let hasLargeGap = false;

            for (let i = 1; i < sorted.length; i++) {
                const interval = sorted[i] - sorted[i-1];
                intervalSum += interval;
                maxInterval = Math.max(maxInterval, interval);
                if (interval > 12) {
                    hasLargeGap = true;
                }
            }

            const avgInterval = sorted.length > 1 ? intervalSum / (sorted.length - 1) : 0;

            // 🔧 修复 (2025-10-01): 转位约束 - 确保inversionIndex对应的音符是最低音
            // 🔧 修复 (2025-10-01 第二次): 移除randomize依赖，总是应用转位约束
            if (inversionIndex > 0) {
                const lowestMidi = sorted[0];  // sorted已经是从低到高排序
                const inversionMidi = testVoicing[inversionIndex];  // 应该是最低音的MIDI

                if (inversionMidi !== lowestMidi) {
                    // 该组合不满足转位约束，跳过
                    filteredByInversion++;  // 🔍 诊断计数
                    continue;
                }
            }

            // 🔍 诊断：通过转位约束检查
            passedCombinations++;

            // 🎵 紧凑度评分算法（2025-10-01优化：强烈偏好close voicing）
            // 用户要求：优先选择跨度小的close voicing，只在必要时使用较大跨度
            let compactness;
            if (span <= 7) {
                // 🎵 真正的close voicing（≤完全五度）：最高优先级
                // 评分最低，强烈偏好
                compactness = span * 0.3 + maxInterval * 0.5 + avgInterval * 0.2;
            } else if (span <= 10) {
                // 🎵 中等紧凑（小/大六度、大七度）：次优选择
                // 评分中等，可接受
                compactness = span * 0.8 + maxInterval * 1.0 + avgInterval * 0.5;
            } else if (span <= 12) {
                // 🎵 八度内但较宽松：降低优先级
                // 评分较高，只在必要时使用
                compactness = span * 1.5 + maxInterval * 2.0 + avgInterval * 1.0;
            } else {
                // 🚨 超过八度：违反用户要求，大幅惩罚
                // 理论上不应该出现（已被手距约束过滤）
                compactness = span * 5.0 + maxInterval * 5.0 + avgInterval * 3.0;
                if (hasLargeGap) {
                    compactness += 50;  // 额外惩罚大间隙
                }
            }

            if (compactness < bestCompactness) {
                bestCompactness = compactness;
                bestVoicing = testVoicing;
            }
        }

        // 🔍 诊断日志（2025-10-01）: 过滤统计
        console.log(`🔍 ========== 组合过滤统计 ==========`);
        console.log(`  📊 总组合数: ${totalCombinations}`);
        console.log(`  ❌ 被手距约束过滤 (>${MAX_HAND_SPAN}半音): ${filteredByHandSpan}`);
        console.log(`  ❌ 被转位约束过滤: ${filteredByInversion}`);
        console.log(`  ✅ 通过所有约束: ${passedCombinations}`);
        console.log(`  📊 总过滤率: ${totalCombinations > 0 ? ((filteredByHandSpan + filteredByInversion) / totalCombinations * 100).toFixed(1) : 0}%`);
        if (inversionIndex > 0) {
            console.log(`  🎯 转位要求: noteNames[${inversionIndex}] = ${noteNames[inversionIndex]} 必须是最低音`);
        } else {
            console.log(`  📊 原位模式: 无转位约束`);
        }
        console.log(`==========================================\n`);

        // 🔧 修复 (2025-10-01): 智能回退机制 - 转位失败时降级到原位
        if (!bestVoicing && inversionIndex > 0) {
            console.warn(`⚠️ 转位 ${inversionIndex} 无法找到有效组合，回退到原位 (inversionIndex=0)`);
            console.log(`🔄 ========== 重新评估：使用原位配置 ==========`);

            // 重新评估所有组合，不应用转位约束
            let fallbackBestVoicing = null;
            let fallbackBestCompactness = Infinity;

            for (const testVoicing of combinationsToTest) {
                const sorted = [...testVoicing].sort((a, b) => a - b);
                const span = sorted[sorted.length - 1] - sorted[0];

                // 🔧 回退时也应用手距约束
                if (span > MAX_HAND_SPAN) {
                    continue;
                }

                let intervalSum = 0;
                let maxInterval = 0;
                let hasLargeGap = false;

                for (let i = 1; i < sorted.length; i++) {
                    const interval = sorted[i] - sorted[i-1];
                    intervalSum += interval;
                    maxInterval = Math.max(maxInterval, interval);
                    if (interval > 12) {
                        hasLargeGap = true;
                    }
                }

                const avgInterval = sorted.length > 1 ? intervalSum / (sorted.length - 1) : 0;

                // 🎵 回退时也使用相同的close voicing优先评分算法
                let compactness;
                if (span <= 7) {
                    compactness = span * 0.3 + maxInterval * 0.5 + avgInterval * 0.2;
                } else if (span <= 10) {
                    compactness = span * 0.8 + maxInterval * 1.0 + avgInterval * 0.5;
                } else if (span <= 12) {
                    compactness = span * 1.5 + maxInterval * 2.0 + avgInterval * 1.0;
                } else {
                    compactness = span * 5.0 + maxInterval * 5.0 + avgInterval * 3.0;
                    if (hasLargeGap) {
                        compactness += 50;
                    }
                }

                if (compactness < fallbackBestCompactness) {
                    fallbackBestCompactness = compactness;
                    fallbackBestVoicing = testVoicing;
                }
            }

            if (fallbackBestVoicing) {
                bestVoicing = fallbackBestVoicing;
                bestCompactness = fallbackBestCompactness;
                console.log(`  ✅ 回退成功: 使用原位voicing [${fallbackBestVoicing.map(m => this._midiToNoteName(m)).join(', ')}]`);
            } else {
                console.error(`  ❌ 回退原位失败: ${MAX_HAND_SPAN}半音约束下无法找到voicing`);
                console.log(`  🔄 尝试第二层回退: 放宽手距到12半音（八度 - 用户硬性上限）...`);

                // 🔧 第二层回退：放宽手距到12半音（八度）- 用户明确要求不超过八度
                for (const testVoicing of combinationsToTest) {
                    const sorted = [...testVoicing].sort((a, b) => a - b);
                    const span = sorted[sorted.length - 1] - sorted[0];

                    if (span > 12) {  // 12半音是用户硬性上限，绝对不能超过
                        continue;
                    }

                    let intervalSum = 0;
                    let maxInterval = 0;
                    for (let i = 1; i < sorted.length; i++) {
                        intervalSum += sorted[i] - sorted[i-1];
                        maxInterval = Math.max(maxInterval, sorted[i] - sorted[i-1]);
                    }
                    const avgInterval = sorted.length > 1 ? intervalSum / (sorted.length - 1) : 0;

                    // 🎵 第二层回退也使用close voicing优先评分算法
                    let compactness;
                    if (span <= 7) {
                        compactness = span * 0.3 + maxInterval * 0.5 + avgInterval * 0.2;
                    } else if (span <= 10) {
                        compactness = span * 0.8 + maxInterval * 1.0 + avgInterval * 0.5;
                    } else if (span <= 12) {
                        compactness = span * 1.5 + maxInterval * 2.0 + avgInterval * 1.0;
                    } else {
                        compactness = span * 5.0 + maxInterval * 5.0 + avgInterval * 3.0;
                    }

                    if (compactness < fallbackBestCompactness) {
                        fallbackBestCompactness = compactness;
                        fallbackBestVoicing = testVoicing;
                    }
                }

                if (fallbackBestVoicing) {
                    bestVoicing = fallbackBestVoicing;
                    bestCompactness = fallbackBestCompactness;
                    const span = Math.max(...fallbackBestVoicing) - Math.min(...fallbackBestVoicing);
                    console.log(`  ✅ 第二层回退成功: 使用12半音约束（八度上限）[${fallbackBestVoicing.map(m => this._midiToNoteName(m)).join(', ')}] (跨度${span}半音)`);
                } else {
                    console.error(`  ❌ 第二层回退失败: 12半音约束下仍无法找到voicing`);
                    console.error(`  ⚠️ 用户要求右手最多不超过八度，无法生成此和弦的voicing`);
                    console.error(`  💡 建议: 跳过此和弦或减少音符数量`);
                }
            }
            console.log(`===============================================\n`);
        }

        // 直接使用找到的最佳voicing（包括回退后的voicing）
        if (bestVoicing) {
            const span = Math.max(...bestVoicing) - Math.min(...bestVoicing);
            console.log(`    ✅ 最佳voicing: [${bestVoicing.map(m => this._midiToNoteName(m)).join(', ')}] (span: ${span}, 评分: ${bestCompactness.toFixed(1)})`);
            bestVoicingGlobal = bestVoicing;
            bestCompactnessGlobal = bestCompactness;
        }

        // 🎯 应用最佳voicing
        // 🔧 修复 (2025-10-01): 检查数组长度，空数组表示无法在约束下生成voicing
        if (bestVoicingGlobal && bestVoicingGlobal.length > 0) {
            const span = Math.max(...bestVoicingGlobal) - Math.min(...bestVoicingGlobal);

            // 🎵 显示紧凑度级别（2025-10-01新增）
            let compactnessLevel;
            if (span <= 7) {
                compactnessLevel = '🎵 真正close voicing（≤完全五度）';
            } else if (span <= 10) {
                compactnessLevel = '🎵 中等紧凑（小/大六度、大七度）';
            } else if (span <= 12) {
                compactnessLevel = '⚠️ 较宽松（八度内）';
            } else {
                compactnessLevel = '❌ 超过八度（违反要求）';
            }

            console.log(`\n  ✅ 最紧凑voicing: [${bestVoicingGlobal.map(m => this._midiToNoteName(m)).join(', ')}]`);
            console.log(`  ✅ 跨度: ${span}半音 ${compactnessLevel}`);
            console.log(`  ✅ 紧凑度评分: ${bestCompactnessGlobal.toFixed(1)}（分数越低越紧凑）`);
            midiNotes.push(...bestVoicingGlobal);

            // 🔍 诊断日志（2025-10-01）: 验证最终voicing是否符合转位要求
            // 🔧 修复 (2025-10-01 第二次): 移除randomize依赖
            if (inversionIndex > 0) {
                const sortedFinal = [...bestVoicingGlobal].sort((a, b) => a - b);
                const lowestMidiFinal = sortedFinal[0];
                const inversionMidiFinal = bestVoicingGlobal[inversionIndex];
                const isCorrectInversion = inversionMidiFinal === lowestMidiFinal;

                console.log(`\n🔍 ========== 最终转位验证 ==========`);
                console.log(`  🎯 目标转位: inversionIndex = ${inversionIndex}`);
                console.log(`  🎯 目标音符: noteNames[${inversionIndex}] = ${noteNames[inversionIndex]}`);
                console.log(`  📊 最终MIDI顺序（按noteNames）: [${bestVoicingGlobal.join(', ')}]`);
                console.log(`  📊 最终音符顺序（按noteNames）: [${bestVoicingGlobal.map(m => this._midiToNoteName(m)).join(', ')}]`);
                console.log(`  📊 排序后MIDI: [${sortedFinal.join(', ')}]`);
                console.log(`  📊 排序后音符: [${sortedFinal.map(m => this._midiToNoteName(m)).join(', ')}]`);
                console.log(`  🔍 inversionMidi (bestVoicingGlobal[${inversionIndex}]): ${inversionMidiFinal} (${this._midiToNoteName(inversionMidiFinal)})`);
                console.log(`  🔍 lowestMidi (sorted[0]): ${lowestMidiFinal} (${this._midiToNoteName(lowestMidiFinal)})`);
                console.log(`  ${isCorrectInversion ? '✅' : '❌'} 转位验证: ${isCorrectInversion ? '正确' : '错误'}`);
                console.log(`========================================\n`);
            }
        } else {
            // 🔧 修复 (2025-10-01 第四次): 保底简单voicing生成器
            console.warn(`\n⚠️ ========== 所有约束下无法找到voicing，启动保底方案 ==========`);
            console.warn(`  🎵 音符: [${noteNames.join(', ')}]`);
            console.warn(`  📊 inversionIndex: ${inversionIndex}`);
            console.warn(`  📊 音域: ${rangeMin}-${rangeMax} (${this._midiToNoteName(rangeMin)}-${this._midiToNoteName(rangeMax)})`);
            console.warn(`  📊 排除的左手MIDI: [${excludedMidi.join(', ')}]`);
            console.warn(`  📊 总候选组合数: ${allCombinations.length}`);
            console.warn(`  📊 被手距约束过滤: ${filteredByHandSpan}个`);
            console.warn(`  📊 被转位约束过滤: ${filteredByInversion}个`);
            console.warn(`  📊 通过所有约束: ${passedCombinations}个`);
            console.warn(`  🔄 启动保底方案：忽略所有约束，生成简单voicing`);

            // 🎯 保底策略：从音域中点开始，依次向上分配
            const midpointMidi = Math.floor((rangeMin + rangeMax) / 2);
            const fallbackVoicing = [];
            const usedMidi = new Set();

            for (let i = 0; i < pitchClasses.length; i++) {
                const pc = pitchClasses[i];
                let midi = null;

                // 从音域中点开始向上搜索可用八度
                for (let octave = Math.floor(midpointMidi / 12); octave <= 8; octave++) {
                    const candidate = octave * 12 + pc;
                    if (candidate >= rangeMin && candidate <= rangeMax && !usedMidi.has(candidate)) {
                        midi = candidate;
                        break;
                    }
                }

                // 如果向上找不到，向下搜索
                if (midi === null) {
                    for (let octave = Math.floor(midpointMidi / 12) - 1; octave >= 0; octave--) {
                        const candidate = octave * 12 + pc;
                        if (candidate >= rangeMin && candidate <= rangeMax && !usedMidi.has(candidate)) {
                            midi = candidate;
                            break;
                        }
                    }
                }

                // 如果还是找不到，允许与已有MIDI重复（最后的回退）
                if (midi === null) {
                    console.warn(`  ⚠️ ${noteNames[i]}: 无可用八度，允许重复MIDI`);
                    for (let octave = 0; octave <= 8; octave++) {
                        const candidate = octave * 12 + pc;
                        if (candidate >= rangeMin && candidate <= rangeMax) {
                            midi = candidate;
                            break;
                        }
                    }
                }

                if (midi !== null) {
                    fallbackVoicing.push(midi);
                    usedMidi.add(midi);
                    console.warn(`  ✅ ${noteNames[i]}: ${this._midiToNoteName(midi)} (MIDI ${midi})`);
                } else {
                    console.error(`  ❌ ${noteNames[i]}: 完全无法分配MIDI值（音域可能过窄）`);
                }
            }

            if (fallbackVoicing.length === pitchClasses.length) {
                const span = Math.max(...fallbackVoicing) - Math.min(...fallbackVoicing);
                console.warn(`  📊 保底voicing候选: [${fallbackVoicing.map(m => this._midiToNoteName(m)).join(', ')}] (跨度${span}半音)`);

                // 🚨 严格验证：如果保底方案也超过12半音，拒绝此voicing
                const MAX_ACCEPTABLE_SPAN = 12;  // 用户硬性上限
                if (span > MAX_ACCEPTABLE_SPAN) {
                    console.error(`  ❌ 保底voicing被拒绝: 跨度${span}半音 > ${MAX_ACCEPTABLE_SPAN}半音（用户硬性上限）`);
                    console.error(`  ⚠️ 此和弦在当前音域和12半音约束下无法生成`);
                    console.error(`  💡 建议: 跳过此和弦或减少音符数量`);
                    bestVoicingGlobal = [];  // 返回空数组，表示无法生成
                    bestCompactnessGlobal = Infinity;
                } else {
                    bestVoicingGlobal = fallbackVoicing;
                    bestCompactnessGlobal = 999;  // 保底方案的评分设为999（最差）
                    console.warn(`  ✅ 保底voicing生成成功: [${fallbackVoicing.map(m => this._midiToNoteName(m)).join(', ')}] (跨度${span}半音 ≤ ${MAX_ACCEPTABLE_SPAN}半音)`);
                }
                console.warn(`========================================================\n`);
            } else {
                console.error(`  ❌ 保底voicing生成失败：只分配了${fallbackVoicing.length}/${pitchClasses.length}个音符`);
                console.error(`========================================================\n`);
                bestVoicingGlobal = [];  // 返回空数组
                bestCompactnessGlobal = Infinity;
            }
        }

        // 🎯 计算最终跨度并验证合理性（2025-10-01优化：用户硬性上限12半音）
        if (midiNotes.length >= 2) {
            const finalMin = Math.min(...midiNotes);
            const finalMax = Math.max(...midiNotes);
            const finalSpan = finalMax - finalMin;

            let spanStatus;
            if (finalSpan <= 10) {
                spanStatus = '✅ 舒适手距（≤10半音/大七度）';
            } else if (finalSpan <= 12) {
                spanStatus = '✅ 可接受手距（≤12半音/八度 - 用户上限）';
            } else {
                // 🚨 超过12半音是不应该出现的，违反了用户硬性要求
                spanStatus = '❌ 超出上限（>12半音/八度 - 违反用户要求！）';
            }

            console.log(`  🎯 最终跨度: ${finalSpan}半音 (${this._midiToNoteName(finalMin)} 到 ${this._midiToNoteName(finalMax)}) ${spanStatus}`);

            // 如果超过12半音，记录严重警告
            if (finalSpan > 12) {
                console.error(`  🚨 严重警告: 右手跨度${finalSpan}半音超过用户硬性上限（12半音/八度）！`);
                console.error(`  🚨 此和弦配置不符合用户要求，应该被过滤或调整`);
            }
        }

        // 🔧 修复 (2025-10-01): 保持rotation顺序，不要自动排序
        // 原因：排序会破坏rotation的转位效果（例如rotation 1: B-D-G 会被排序为 D-B-G）
        if (randomize) {
            const sorted = [...midiNotes].sort((a, b) => a - b);
            const shuffled = this._shuffleArray(midiNotes);
            console.log(`  🔀 随机排列: ${sorted.map(m => this._midiToNoteName(m)).join(', ')} → ${shuffled.map(m => this._midiToNoteName(m)).join(', ')}`);
            return shuffled;
        }

        // 🔧 修复 (2025-10-01): 钢琴高音谱号排序修复
        // 问题：音符按和弦音角色顺序（根-三-五-七）返回，导致跳跃式排列（中-高-低）
        // 解决：对MIDI从低到高排序，确保音符连续排列，方便单手演奏
        // 注意：转位系统只关心"哪个音符MIDI值最低"，不关心数组顺序，所以排序不影响转位
        const sortedMidi = [...midiNotes].sort((a, b) => a - b);
        console.log(`  📊 排序前（按和弦音角色）: [${midiNotes.join(', ')}] = ${midiNotes.map(m => this._midiToNoteName(m)).join(', ')}`);
        console.log(`  📊 排序后（按音高）: [${sortedMidi.join(', ')}] = ${sortedMidi.map(m => this._midiToNoteName(m)).join(', ')}`);
        return sortedMidi;
    }

    /**
     * MIDI转音符名称（用于日志显示）
     * @private
     */
    _midiToNoteName(midi) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        const noteIndex = midi % 12;
        return `${noteNames[noteIndex]}${octave}`;
    }

    /**
     * 音符名称转音高类别（0-11）
     * 🔧 修复 (2025-10-01): 添加双降、双升记号支持
     * 问题：Ebminor7b5的减五音Bbb无法识别，被错误映射为C (pitch class 0)
     * 解决：完整支持所有可能的同音异名拼写，包括双降双升
     * @private
     */
    _noteToPitchClass(noteName) {
        const noteMap = {
            // 自然音
            'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11,

            // 单升号
            'C#': 1, 'D#': 3, 'E#': 5, 'F#': 6, 'G#': 8, 'A#': 10, 'B#': 0,

            // 单降号
            'Db': 1, 'Eb': 3, 'Fb': 4, 'Gb': 6, 'Ab': 8, 'Bb': 10, 'Cb': 11,

            // 双升号 (##)
            'C##': 2, 'D##': 4, 'E##': 6, 'F##': 7, 'G##': 9, 'A##': 11, 'B##': 1,

            // 双降号 (bb) - ✅ 修复核心：Bbb = A (pitch class 9)
            'Cbb': 10, 'Dbb': 0, 'Ebb': 2, 'Fbb': 3, 'Gbb': 5, 'Abb': 7, 'Bbb': 9
        };

        const pitchClass = noteMap[noteName];

        // 🔍 诊断日志：记录未知音符名称
        if (pitchClass === undefined) {
            console.error(`❌ 未知音符名称: "${noteName}" → 默认映射为 C (pitch class 0)`);
            console.error(`   可能原因：三重升降号或其他非标准拼写`);
            return 0;  // fallback
        }

        return pitchClass;
    }

    /**
     * 音符名称转MIDI（保留向后兼容）
     * @deprecated 使用 _noteToPitchClass 和 _assignMidiPitches 替代
     * @private
     */
    _noteNameToMidi(noteName) {
        // 默认八度为4（中央C = C4 = MIDI 60）
        const baseOctave = 4;
        const pitchClass = this._noteToPitchClass(noteName);

        return (baseOctave + 1) * 12 + pitchClass;
    }

    /**
     * 🎯 全局八度选择优化算法（2025-10-02 Phase 2新增）
     * 枚举所有可能的八度组合，选择最优解（跨度最小+Voice Leading最佳）
     * @param {Array} noteNames - 低音音符名称数组
     * @param {number} rangeMin - 最低MIDI值
     * @param {number} rangeMax - 最高MIDI值
     * @param {number|null} prevBassMidi - 前一个和弦的低音MIDI值
     * @param {number} totalNoteCount - 总音符数量
     * @returns {Array|null} 最优MIDI组合，如果无解返回null
     * @private
     */
    _findOptimalOctaveCombination(noteNames, rangeMin, rangeMax, prevBassMidi, totalNoteCount, targetInversion = 0, chordType = '') {
        console.log(`\n🎯 ========== 全局八度优化算法 ==========`);
        console.log(`  音符数量: ${noteNames.length}`);
        console.log(`  音符: [${noteNames.join(', ')}]`);
        console.log(`  音域: ${rangeMin}-${rangeMax} (${this._midiToNoteName(rangeMin)}-${this._midiToNoteName(rangeMax)})`);
        console.log(`  前和弦低音: ${prevBassMidi ? this._midiToNoteName(prevBassMidi) : 'N/A'}`);
        console.log(`  转位: 第${targetInversion}转位`);
        console.log(`  和弦类型: ${chordType || 'N/A'}`);

        // 🔧 新增 (2025-10-06): 基于七音类型和转位的智能跨度限制
        const is67NoteConfigWith3LeftHand =
            (totalNoteCount === 6 || totalNoteCount === 7) && noteNames.length === 3;
        const isThirdInversion = targetInversion === 3;

        let MAX_BASS_SPAN;

        if (is67NoteConfigWith3LeftHand && isThirdInversion) {
            // 🎵 第三转位：根据七音类型决定跨度
            // 小七度七和弦（属七、小七、半减七）vs 大七度七和弦（大七）
            const isMinorSeventhChord =
                chordType === '7' ||           // 属七和弦
                chordType === 'dominant7' ||
                chordType === 'm7' ||          // 小七和弦
                chordType === 'minor7' ||
                chordType === 'm7b5' ||        // 半减七和弦
                chordType === 'half-diminished7' ||
                chordType.includes('m7') ||    // 包含m7的其他类型
                (chordType.includes('7') && !chordType.includes('maj'));  // 7但不含maj

            const isMajorSeventhChord =
                chordType === 'maj7' ||
                chordType === 'major7' ||
                chordType.includes('maj7');

            if (isMinorSeventhChord) {
                MAX_BASS_SPAN = 14;  // 小七度七和弦：允许大九度
                console.log(`  🎯 小七度七和弦第三转位：允许大九度（14半音）`);
                console.log(`     和弦类型: ${chordType} → 七音是小七度（降七度）`);
            } else if (isMajorSeventhChord) {
                MAX_BASS_SPAN = 13;  // 大七度七和弦：允许小九度
                console.log(`  🎯 大七度七和弦第三转位：允许小九度（13半音）`);
                console.log(`     和弦类型: ${chordType} → 七音是大七度`);
            } else {
                // 未识别的七和弦类型，默认使用更保守的限制
                MAX_BASS_SPAN = 13;
                console.warn(`  ⚠️ 未识别的七和弦类型: ${chordType}，使用13半音限制`);
            }
        } else if (is67NoteConfigWith3LeftHand) {
            MAX_BASS_SPAN = 13;  // 6/7音其他转位：八度+小二度
            console.log(`  🎯 6/7音配置（非第三转位）：允许13半音`);
        } else {
            MAX_BASS_SPAN = 12;  // 其他配置：标准八度
        }

        console.log(`  最终跨度上限: ${MAX_BASS_SPAN}半音`);

        // 步骤1: 收集每个音符的所有候选八度
        const allCandidates = noteNames.map((noteName, idx) => {
            const pitchClass = this._noteToPitchClass(noteName);
            const candidates = [];
            for (let octave = 0; octave <= 8; octave++) {
                const midi = octave * 12 + pitchClass;
                if (midi >= rangeMin && midi <= rangeMax) {
                    candidates.push(midi);
                }
            }
            console.log(`  音符${idx+1} ${noteName}: 候选 [${candidates.map(m => this._midiToNoteName(m)).join(', ')}]`);
            return candidates;
        });

        // 检查是否所有音符都有候选
        if (allCandidates.some(c => c.length === 0)) {
            console.error(`❌ 某些音符在音域内没有任何候选八度`);
            return null;
        }

        // 步骤2: 枚举所有可能的组合
        const validCombinations = [];
        const attemptedCombinations = [];

        function enumerate(index, currentCombination) {
            if (index === noteNames.length) {
                // 完整组合，检查约束
                attemptedCombinations.push([...currentCombination]);

                // 约束1: 无MIDI重复
                const uniqueSet = new Set(currentCombination);
                if (uniqueSet.size !== currentCombination.length) {
                    return; // 有重复，跳过
                }

                // 约束2: 跨度≤12半音
                const minMidi = Math.min(...currentCombination);
                const maxMidi = Math.max(...currentCombination);
                const span = maxMidi - minMidi;
                if (span > MAX_BASS_SPAN) {
                    return; // 跨度太大，跳过
                }

                // 约束3: 第一个音符必须是最低音（防止转位）
                // 🔧 新增 (2025-10-06): 第三转位例外 - 七音可以不是最低音
                if (!isThirdInversion && currentCombination[0] !== minMidi) {
                    return; // 不是第三转位且第一个音符不是最低音，跳过
                }

                // 约束4 (6/7音配置特殊)：第3个音符的音名约束
                // 🔧 修改 (2025-10-06): 根据转位类型应用不同的约束
                if (is67NoteConfigWith3LeftHand && noteNames.length === 3) {
                    if (targetInversion === 0 || targetInversion === 1) {
                        // 原位/第一转位：第3个音符必须是根音八度
                        const rootPitchClass = currentCombination[0] % 12;
                        const thirdNotePitchClass = currentCombination[2] % 12;
                        if (rootPitchClass !== thirdNotePitchClass) {
                            return; // 不是根音八度，跳过
                        }
                        // 确保第3个音符高于第1个音符
                        if (currentCombination[2] <= currentCombination[0]) {
                            return; // 第3个音符不是更高的八度，跳过
                        }
                    } else if (targetInversion === 2) {
                        // 第二转位：第3个音符必须是五音八度
                        // 根据_distributeToClefs逻辑：五音 + 根音 + 五音八度
                        // noteNames[0]应该是五音，noteNames[2]也应该是五音八度
                        const firstNotePitchClass = currentCombination[0] % 12;
                        const thirdNotePitchClass = currentCombination[2] % 12;
                        if (firstNotePitchClass !== thirdNotePitchClass) {
                            return; // 第3个音符不是五音八度，跳过
                        }
                        if (currentCombination[2] <= currentCombination[0]) {
                            return; // 第3个音符不是更高的八度，跳过
                        }
                    }
                    // 第三转位：无特殊约束（七音 + 五音 + 根音，三个不同的音名）
                }

                // 计算评分：跨度*2 + Voice Leading距离*0.5
                const voiceLeadingDistance = prevBassMidi ? Math.abs(currentCombination[0] - prevBassMidi) : 0;
                const score = span * 2 + voiceLeadingDistance * 0.5;

                validCombinations.push({
                    combination: [...currentCombination],
                    span,
                    voiceLeadingDistance,
                    score
                });
                return;
            }

            // 递归枚举
            for (const candidate of allCandidates[index]) {
                currentCombination.push(candidate);
                enumerate(index + 1, currentCombination);
                currentCombination.pop();
            }
        }

        enumerate(0, []);

        console.log(`  🔍 总尝试组合数: ${attemptedCombinations.length}`);
        console.log(`  ✅ 有效组合数: ${validCombinations.length}`);

        // 步骤3: 如果没有有效组合，返回null
        if (validCombinations.length === 0) {
            console.error(`❌ 无法找到符合所有约束的八度组合`);
            console.error(`  约束: 无MIDI重复 + 跨度≤${MAX_BASS_SPAN}半音 + 根音最低`);
            if (is7NoteConfig) {
                console.error(`  7音特殊约束: 第3个音符必须是根音八度（高于第1个音符）`);
            }

            // 显示部分尝试的组合（调试用）
            if (attemptedCombinations.length > 0) {
                console.error(`  部分尝试的组合:`);
                attemptedCombinations.slice(0, 5).forEach((combo, idx) => {
                    const span = Math.max(...combo) - Math.min(...combo);
                    const hasDuplicate = new Set(combo).size !== combo.length;
                    const rootNotLowest = combo[0] !== Math.min(...combo);
                    console.error(`    组合${idx+1}: [${combo.map(m => this._midiToNoteName(m)).join(', ')}] - 跨度${span}半音 ${hasDuplicate ? '(有重复❌)' : ''} ${rootNotLowest ? '(根音非最低❌)' : ''}`);
                });
            }

            return null;
        }

        // 步骤4: 按评分排序，选择最优组合
        validCombinations.sort((a, b) => a.score - b.score);
        const best = validCombinations[0];

        console.log(`  🏆 最优组合:`);
        console.log(`    MIDI: [${best.combination.join(', ')}]`);
        console.log(`    音符: [${best.combination.map(m => this._midiToNoteName(m)).join(', ')}]`);
        console.log(`    跨度: ${best.span}半音`);
        console.log(`    Voice Leading距离: ${best.voiceLeadingDistance}半音`);
        console.log(`    评分: ${best.score.toFixed(1)} (越低越好)`);

        // 显示前3个候选（如果有多个）
        if (validCombinations.length > 1) {
            console.log(`  📊 其他候选组合:`);
            validCombinations.slice(1, 4).forEach((combo, idx) => {
                console.log(`    候选${idx+2}: [${combo.combination.map(m => this._midiToNoteName(m)).join(', ')}] - 跨度${combo.span}半音, VL距离${combo.voiceLeadingDistance}半音, 评分${combo.score.toFixed(1)}`);
            });
        }

        console.log(`========== 全局优化完成 ==========\n`);

        return best.combination;
    }

    /**
     * 🎼 智能低音声部进行分配（2025-10-01新增）
     * 选择最佳八度，平衡线条平滑性和音域约束
     * @param {Array} noteNames - 低音音符名称（通常只有1个根音）
     * @param {number} rangeMin - 最低MIDI值
     * @param {number} rangeMax - 最高MIDI值
     * @param {number|null} prevBassMidi - 前一个和弦的低音MIDI值
     * @param {Object} keySignature - 调号信息
     * @param {number} totalNoteCount - 总音符数量（用于检测7音配置）
     * @returns {Array} MIDI音高数组
     * @private
     */
    _assignBassWithVoiceLeading(noteNames, rangeMin, rangeMax, prevBassMidi, keySignature, totalNoteCount = null) {
        if (!noteNames || noteNames.length === 0) {
            return [];
        }

        const midiNotes = [];
        // 🔧 修复 (2025-10-01 第六次): 移除usedMidi约束
        // 问题：当左手有[F, F]（根音+根音八度）时，usedMidi会阻止第二个F的分配
        // 原因：F2和F3是不同的MIDI值（29和41），应该都允许
        // 解决：移除usedMidi Set，允许同音符名称的不同八度

        // 追踪每个音符已选择的MIDI值，用于后续音符避免选择完全相同的MIDI
        const selectedMidiValues = [];

        for (let i = 0; i < noteNames.length; i++) {
            const noteName = noteNames[i];
            const pitchClass = this._noteToPitchClass(noteName);

            // 🎯 生成所有在音域内的候选八度
            const candidates = [];
            for (let octave = 0; octave <= 8; octave++) {
                const midi = octave * 12 + pitchClass;
                if (midi >= rangeMin && midi <= rangeMax) {
                    candidates.push(midi);
                }
            }

            if (candidates.length === 0) {
                console.error(`❌ 音符 ${noteName} 在音域 ${rangeMin}-${rangeMax} 内没有任何可用八度`);
                continue;
            }

            let selectedMidi;

            if (i === 0) {
                // 🎼 和弦内第一个音符：区分第一个和弦vs后续和弦
                // 🔧 修复 (2025-10-02 尝试2): 7音配置下，第一个根音强制选择低八度
                // 原因：为根音八度留出高八度的空间，避免MIDI重复
                const is7NoteConfig = totalNoteCount === 7 && noteNames.length === 3;

                if (prevBassMidi === null || prevBassMidi === undefined) {
                    // 第一个和弦：使用音域中点策略（7音配置除外）
                    if (is7NoteConfig) {
                        // 7音配置：强制选择最低的候选八度
                        selectedMidi = Math.min(...candidates);
                        console.log(`🎼 低音第${i+1}音 [7音配置-低八度策略]: ${noteName} -> MIDI ${selectedMidi} (${this._midiToNoteName(selectedMidi)}) 选择最低八度`);
                    } else {
                        const midpoint = (rangeMin + rangeMax) / 2;
                        selectedMidi = candidates.reduce((closest, curr) =>
                            Math.abs(curr - midpoint) < Math.abs(closest - midpoint) ? curr : closest
                        );
                        console.log(`🎼 低音第${i+1}音 [第一个和弦]: ${noteName} -> MIDI ${selectedMidi} (${this._midiToNoteName(selectedMidi)}) 音域中点策略`);
                    }
                } else {
                    // 后续和弦：使用Voice Leading（距离前一个和弦的低音最近）
                    // 7音配置：仍使用Voice Leading，但倾向于选择较低八度
                    if (is7NoteConfig && candidates.length > 1) {
                        // 7音配置：在Voice Leading和低八度之间平衡
                        // 策略：如果最低八度距离prevBassMidi不超过7半音（完全五度），优先选择低八度
                        const lowestCandidate = Math.min(...candidates);
                        const distanceToLowest = Math.abs(lowestCandidate - prevBassMidi);

                        if (distanceToLowest <= 7) {
                            selectedMidi = lowestCandidate;
                            console.log(`🎼 低音第${i+1}音 [7音配置-Voice Leading优化]: ${noteName} -> MIDI ${selectedMidi} (${this._midiToNoteName(selectedMidi)}) 选择低八度（距离前和弦${distanceToLowest}半音）`);
                        } else {
                            selectedMidi = candidates.reduce((closest, curr) =>
                                Math.abs(curr - prevBassMidi) < Math.abs(closest - prevBassMidi) ? curr : closest
                            );
                            console.log(`🎼 低音第${i+1}音 [7音配置-Voice Leading]: ${noteName} -> MIDI ${selectedMidi} (${this._midiToNoteName(selectedMidi)}) Voice Leading优先`);
                        }
                    } else {
                        selectedMidi = candidates.reduce((closest, curr) =>
                            Math.abs(curr - prevBassMidi) < Math.abs(closest - prevBassMidi) ? curr : closest
                        );
                        const interval = Math.abs(selectedMidi - prevBassMidi);
                        console.log(`🎼 低音第${i+1}音 [Voice Leading]: ${noteName} -> MIDI ${selectedMidi} (${this._midiToNoteName(selectedMidi)}) 距离前和弦低音${interval}半音`);
                    }
                }
            } else {
                // 🎼 和弦内后续音符：必须选择与所有已选MIDI不同的值，且必须≥根音MIDI（防止转位）
                const prevMidi = selectedMidiValues[selectedMidiValues.length - 1];
                const rootMidi = selectedMidiValues[0];  // 第一个音符总是根音

                // 🔧 修复 (2025-10-01 第十三次): 强制要求与所有已选MIDI不同，且≥根音MIDI
                // 🔧 优化 (2025-10-01): 添加手距约束 - 总跨度不超过12半音（八度）
                const MAX_BASS_SPAN = 12;  // 用户要求：一只手最多八度
                const differentCandidates = candidates.filter(c => {
                    // 条件1: 不同于所有已选MIDI
                    if (selectedMidiValues.includes(c)) return false;
                    // 条件2: ≥根音MIDI（防止转位）
                    if (c < rootMidi) return false;
                    // 条件3: 加入后总跨度≤12半音（用户硬性要求）
                    const currentMin = Math.min(...selectedMidiValues);
                    const currentMax = Math.max(...selectedMidiValues);
                    const newMin = Math.min(currentMin, c);
                    const newMax = Math.max(currentMax, c);
                    const newSpan = newMax - newMin;
                    if (newSpan > MAX_BASS_SPAN) {
                        console.log(`    ⚠️ 候选${c} (${this._midiToNoteName(c)}) 会导致跨度${newSpan}半音 > ${MAX_BASS_SPAN}半音，过滤`);
                        return false;
                    }
                    return true;
                });

                console.log(`    不同于所有已选且≥根音且跨度≤${MAX_BASS_SPAN}半音的候选: [${differentCandidates.join(', ')}]`);

                if (differentCandidates.length === 0) {
                    // 第二层回退：放宽≥根音约束，但保持跨度约束
                    const differentWithSpanCandidates = candidates.filter(c => {
                        if (selectedMidiValues.includes(c)) return false;
                        const currentMin = Math.min(...selectedMidiValues);
                        const currentMax = Math.max(...selectedMidiValues);
                        const newMin = Math.min(currentMin, c);
                        const newMax = Math.max(currentMax, c);
                        const newSpan = newMax - newMin;
                        return newSpan <= MAX_BASS_SPAN;
                    });
                    console.warn(`⚠️ 没有同时满足不同且≥根音且跨度约束的候选，回退到只要求不同MIDI+跨度约束`);
                    console.warn(`    候选: [${differentWithSpanCandidates.join(', ')}]`);

                    if (differentWithSpanCandidates.length === 0) {
                        // 🔧 修复 (2025-10-02 Phase 1): 移除跨度放宽，绝对不允许超过12半音
                        // 原问题：第三层回退放宽跨度约束，导致左手可能跨度18-20半音，演奏不友好
                        // 新策略：如果无法在12半音内找到候选，直接抛出错误，触发降级策略
                        console.error(`❌ 左手MIDI分配失败：无法在${MAX_BASS_SPAN}半音约束内找到音符 ${noteName} 的合适八度`);
                        console.error(`  候选MIDI: [${candidates.join(', ')}] → [${candidates.map(m => this._midiToNoteName(m)).join(', ')}]`);
                        console.error(`  已使用MIDI: [${selectedMidiValues.join(', ')}] → [${selectedMidiValues.map(m => this._midiToNoteName(m)).join(', ')}]`);
                        console.error(`  当前跨度: ${Math.max(...selectedMidiValues) - Math.min(...selectedMidiValues)}半音`);
                        console.error(`  音符${noteName}的所有候选都会导致跨度>${MAX_BASS_SPAN}半音`);
                        console.error(`  💡 系统将自动降级到更少音符数量`);
                        throw new Error(`左手MIDI分配失败：无法在${MAX_BASS_SPAN}半音约束内为音符${noteName}找到合适八度`);
                    } else {
                        selectedMidi = differentWithSpanCandidates.reduce((closest, curr) =>
                            Math.abs(curr - prevMidi) < Math.abs(closest - prevMidi) ? curr : closest
                        );
                        console.log(`    ✅ 找到满足跨度约束的候选（但可能<根音）`);
                    }
                } else {
                    selectedMidi = differentCandidates.reduce((closest, curr) =>
                        Math.abs(curr - prevMidi) < Math.abs(closest - prevMidi) ? curr : closest
                    );
                }

                const interval = Math.abs(selectedMidi - prevMidi);
                console.log(`🎼 低音第${i+1}音 [和弦内]: ${noteName} -> MIDI ${selectedMidi} (${this._midiToNoteName(selectedMidi)}) 距离前音${interval}半音, 相对根音${selectedMidi >= rootMidi ? '✅高于或等于' : '❌低于'}`);
            }

            midiNotes.push(selectedMidi);
            selectedMidiValues.push(selectedMidi);
        }

        // 🚨 验证：检查左手MIDI重复（2025-10-02新增）
        const uniqueBassMidi = new Set(midiNotes);
        if (uniqueBassMidi.size !== midiNotes.length) {
            console.error(`❌ 左手检测到重复的MIDI值！`);
            console.error(`  总MIDI数: ${midiNotes.length}`);
            console.error(`  唯一MIDI数: ${uniqueBassMidi.size}`);
            console.error(`  左手MIDI: [${midiNotes.join(', ')}]`);
            console.error(`  左手音符名: [${noteNames.join(', ')}]`);

            // 找出重复的MIDI值
            const duplicates = midiNotes.filter((midi, index) => midiNotes.indexOf(midi) !== index);
            const uniqueDuplicates = [...new Set(duplicates)];
            console.error(`  重复的MIDI值: [${uniqueDuplicates.join(', ')}]`);
            uniqueDuplicates.forEach(midi => {
                const count = midiNotes.filter(m => m === midi).length;
                console.error(`    MIDI ${midi} (${this._midiToNoteName(midi)}) 出现了 ${count} 次`);
            });

            throw new Error(`左手MIDI重复错误：左手包含重复的MIDI值，违反去重约束`);
        }
        console.log(`✅ 左手MIDI去重验证通过：所有${midiNotes.length}个MIDI值都是唯一的`);

        // 🔧 修复 (2025-10-01 第十一次): 不排序，保持原始顺序
        // 低音谱号第一个音符总是根音（由_distributeToClefs确保），排序会破坏这个顺序
        console.log(`🎼 低音谱号最终MIDI（未排序，保持根音第一）: [${midiNotes.join(', ')}]`);
        console.log(`🎼 低音谱号最终音符: [${midiNotes.map(m => this._midiToNoteName(m)).join(', ')}]`);
        return midiNotes;
    }

    /**
     * 数组随机排列
     * @private
     */
    _shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * 🎵 获取和弦类型的可用tension音符（2025-10-01新增）
     * 基于爵士和声理论和chord-scale理论
     * @private
     */
    _getAvailableTensions(chordType) {
        const tensions = {
            // 🎵 三和弦tensions（2025-10-02新增：支持add2和6和弦）
            'major': { available: ['9', '13'], avoid: [] },        // Cadd2, C6
            'minor': { available: ['9', '13'], avoid: [] },        // Cmadd2, Cm6
            'diminished': { available: ['9'], avoid: ['13'] },     // Cdim(add2)
            'augmented': { available: ['9'], avoid: ['13'] },      // Caug(add2)

            // Maj7: 可用9、#11、13；避免11
            'major7': { available: ['9', '#11', '13'], avoid: ['11'] },
            'maj7': { available: ['9', '#11', '13'], avoid: ['11'] },

            // m7: 可用9、11；13条件可用（Dorian）
            'minor7': { available: ['9', '11', '13'], avoid: [] },
            'm7': { available: ['9', '11', '13'], avoid: [] },

            // 7 (属七): 可用9、13；避免11
            'dominant7': { available: ['9', '13'], avoid: ['11'] },
            '7': { available: ['9', '13'], avoid: ['11'] },

            // 7alt: 可用♭9、#9、#11、♭13
            '7alt': { available: ['b9', '#9', '#11', 'b13'], avoid: ['9', '13'] },

            // m7♭5: 可用11、♭13
            'minor7b5': { available: ['11', 'b13'], avoid: ['13'] },
            'm7b5': { available: ['11', 'b13'], avoid: ['13'] },

            // sus4: 可用9、13；11已在核心
            'sus4': { available: ['9', '13'], avoid: ['3'] },
            'sus2': { available: ['9', '13'], avoid: ['3'] },
            '7sus4': { available: ['9', '13'], avoid: ['3'] },

            // diminished7
            'diminished7': { available: ['9', '11'], avoid: [] },
            'dim7': { available: ['9', '11'], avoid: [] },

            // augmented7
            'augmented7': { available: ['9', '#11'], avoid: [] },
            'aug7': { available: ['9', '#11'], avoid: [] }
        };

        return tensions[chordType] || { available: [], avoid: [] };
    }

    /**
     * 🎵 检测小九度冲突（半音冲突）（2025-10-01新增）
     * 返回true表示有冲突，应避免
     * @private
     */
    _hasMinorNinthConflict(note1Name, note2Name) {
        const pitchClass1 = this._noteToPitchClass(note1Name);
        const pitchClass2 = this._noteToPitchClass(note2Name);
        const interval = Math.abs(pitchClass1 - pitchClass2);

        // 小九度 = 1半音 或 11半音（八度+半音）
        return interval === 1 || interval === 11;
    }

    /**
     * 🎵 计算tension音符名称（2025-10-01新增）
     * @private
     */
    _calculateTensionNote(rootName, tensionType) {
        const intervals = {
            '9': 2,      // 大二度 = 2半音
            'b9': 1,     // 小二度 = 1半音
            '#9': 3,     // 增二度 = 3半音
            '11': 5,     // 纯四度 = 5半音
            '#11': 6,    // 增四度 = 6半音
            '13': 9,     // 大六度 = 9半音
            'b13': 8     // 小六度 = 8半音
        };

        const rootPitch = this._noteToPitchClass(rootName);
        const tensionPitch = (rootPitch + intervals[tensionType]) % 12;

        // 转换回音符名称（考虑升降号）
        return this._pitchClassToNoteName(tensionPitch, tensionType.includes('b'));
    }

    /**
     * 🎵 Pitch class转音符名称（2025-10-01新增）
     * @private
     */
    _pitchClassToNoteName(pitchClass, preferFlat = false) {
        const sharpNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const flatNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

        return preferFlat ? flatNotes[pitchClass] : sharpNotes[pitchClass];
    }

    /**
     * 🎼 LIL规则验证（Low Interval Limit）（2025-10-01新增）
     * 检查不同音区的音符间距是否合理
     * @private
     */
    _validateLIL(midiNotes) {
        const warnings = [];

        if (midiNotes.length < 2) {
            return warnings; // 只有一个音符，无需检查间距
        }

        // 按MIDI值排序
        const sorted = [...midiNotes].sort((a, b) => a - b);

        console.log(`🎼 LIL规则验证: 检查${sorted.length}个音符的间距...`);

        for (let i = 1; i < sorted.length; i++) {
            const note1 = sorted[i - 1];
            const note2 = sorted[i];
            const interval = note2 - note1;

            // 低音区（C2-B2, MIDI 36-47）：间距≥纯五度(7半音)
            if (note1 >= 36 && note1 <= 47) {
                if (interval < 7) {
                    warnings.push(`⚠️ 低音区间距过小: ${this._midiToNoteName(note1)}-${this._midiToNoteName(note2)} (${interval}半音 < 7半音纯五度)`);
                } else {
                    console.log(`  ✅ 低音区间距合理: ${this._midiToNoteName(note1)}-${this._midiToNoteName(note2)} (${interval}半音)`);
                }
            }
            // 中音区（C3-B3, MIDI 48-59）：间距≥大三度(4半音)
            else if (note1 >= 48 && note1 <= 59) {
                if (interval < 4) {
                    warnings.push(`⚠️ 中音区间距过小: ${this._midiToNoteName(note1)}-${this._midiToNoteName(note2)} (${interval}半音 < 4半音大三度)`);
                } else {
                    console.log(`  ✅ 中音区间距合理: ${this._midiToNoteName(note1)}-${this._midiToNoteName(note2)} (${interval}半音)`);
                }
            }
            // 高音区（C4+, MIDI 60+）：可以使用close voicing，不限制
            else if (note1 >= 60) {
                console.log(`  ✅ 高音区（C4+）: ${this._midiToNoteName(note1)}-${this._midiToNoteName(note2)} (${interval}半音) 无限制`);
            }
        }

        // 特殊检查：低音区不应有超过2个音符
        const lowRegisterNotes = sorted.filter(midi => midi >= 36 && midi <= 47);
        if (lowRegisterNotes.length > 2) {
            warnings.push(`⚠️ 低音区(C2-B2)音符过多: ${lowRegisterNotes.length}个 (建议≤2个)`);
        }

        if (warnings.length > 0) {
            console.log(`  ⚠️ LIL规则发现${warnings.length}个问题`);
        } else {
            console.log(`  ✅ LIL规则验证通过`);
        }

        return warnings;
    }

    /**
     * 验证生成结果
     */
    validateResult(result, settings) {
        const errors = [];

        // 验证音符数量
        const totalNotes = result.bassClefNotes.length + result.trebleClefNotes.length;
        if (totalNotes !== result.noteCount) {
            errors.push(`音符总数不匹配: 期望${result.noteCount}, 实际${totalNotes}`);
        }

        // 验证低音谱号有根音
        if (result.bassClefNotes.length === 0) {
            errors.push('低音谱号缺少根音');
        }

        // 验证高音谱号最少音符数
        const minTrebleNotes = settings.noteDistribution.trebleClefMinNotes || 2;
        if (result.trebleClefNotes.length < minTrebleNotes) {
            errors.push(`高音谱号音符数(${result.trebleClefNotes.length})少于最小要求(${minTrebleNotes})`);
        }

        // 验证音域范围
        const bassOutOfRange = result.bassClefNotes.some(
            midi => midi < settings.bassClefRangeMin || midi > settings.bassClefRangeMax
        );
        if (bassOutOfRange) {
            errors.push('低音谱号音符超出音域范围');
        }

        const trebleOutOfRange = result.trebleClefNotes.some(
            midi => midi < settings.trebleClefRangeMin || midi > settings.trebleClefRangeMax
        );
        if (trebleOutOfRange) {
            errors.push('高音谱号音符超出音域范围');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// 导出给浏览器环境使用
if (typeof window !== 'undefined') {
    window.PianoNoteCountEngine = PianoNoteCountEngine;
    console.log('✅ PianoNoteCountEngine已加载到window对象');
}