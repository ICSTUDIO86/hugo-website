/**
 * 极简Drop2/Drop3 Voicing生成器
 *
 * 目的：完全重写Drop2和Drop3，消除所有复杂逻辑
 * 创建日期：2025-10-03
 * 更新日期：2025-10-03（添加转位控制）
 *
 * 核心原则：
 * 1. 从Close voicing（原位，按MIDI从低到高）开始
 * 2. 严格按照音乐理论定义操作
 * 3. 保持notes和midiNotes的对应关系
 * 4. Drop2/Drop3转位 = 基于最终低音音符
 * 5. 支持用户转位设置控制（未勾选转位 = 强制原位）
 */

class SimpleDropVoicing {
    /**
     * 音名到半音值的映射（用于转位检测）
     */
    static noteToSemitone = {
        'C': 0, 'B#': 0,
        'C#': 1, 'Db': 1,
        'D': 2,
        'D#': 3, 'Eb': 3,
        'E': 4, 'Fb': 4,
        'F': 5, 'E#': 5,
        'F#': 6, 'Gb': 6,
        'G': 7,
        'G#': 8, 'Ab': 8,
        'A': 9,
        'A#': 10, 'Bb': 10,
        'B': 11, 'Cb': 11
    };

    /**
     * 检测voicing的转位（基于最低音）
     * @param {object} voicing - voicing对象
     * @param {object} chord - 和弦对象（包含root和type）
     * @returns {number} 0=原位，1=第一转位，2=第二转位，3=第三转位
     *
     * 🔧 修复 (2025-10-03): 增强转位检测，能够识别第几转位
     */
    static detectInversion(voicing, chord) {
        if (!voicing || !voicing.midiNotes || voicing.midiNotes.length === 0) {
            return 0;
        }

        if (!chord || !chord.root) {
            console.warn('⚠️ detectInversion: 缺少和弦信息，无法准确检测转位');
            return 0;
        }

        const lowestMidi = Math.min(...voicing.midiNotes);
        const lowestPitchClass = lowestMidi % 12;
        const rootPitchClass = this.noteToSemitone[chord.root] % 12;

        // 如果最低音是根音 → 原位
        if (lowestPitchClass === rootPitchClass) {
            return 0;
        }

        // 🔧 识别第几转位（基于低音音符角色）
        // 计算三音、五音、七音的pitch class
        const chordType = chord.type || 'major';

        // 三音间隔（大三度=4半音，小三度=3半音）
        let thirdInterval = 4; // 默认大三度
        if (chordType.includes('minor') || chordType.includes('m7') || chordType.includes('dim')) {
            thirdInterval = 3; // 小三度
        }

        const thirdPitchClass = (rootPitchClass + thirdInterval) % 12;
        const fifthPitchClass = (rootPitchClass + 7) % 12; // 完全五度

        // 七音间隔（大七度=11半音，小七度=10半音，减七度=9半音）
        let seventhInterval = 11; // 默认大七度
        if (chordType.includes('7') && !chordType.includes('maj7') && !chordType.includes('major7')) {
            seventhInterval = 10; // 属七和弦、小七和弦等使用小七度
        } else if (chordType.includes('dim7')) {
            seventhInterval = 9; // 减七和弦
        }

        const seventhPitchClass = (rootPitchClass + seventhInterval) % 12;

        // 比较最低音的pitch class
        if (lowestPitchClass === thirdPitchClass) {
            return 1; // 第一转位（三音在最低）
        }
        if (lowestPitchClass === fifthPitchClass) {
            return 2; // 第二转位（五音在最低）
        }
        if (lowestPitchClass === seventhPitchClass) {
            return 3; // 第三转位（七音在最低）
        }

        // Fallback：无法识别具体转位，返回1表示非原位
        console.warn(`⚠️ 无法识别具体转位：lowestPC=${lowestPitchClass}, rootPC=${rootPitchClass}, chord=${chord.root}${chordType}`);
        return 1;
    }

    // 🔧 修复 (2025-10-03): adjustToRootPosition函数已删除
    // 原因：该函数的算法错误，会将Drop2/Drop3转换回Close voicing
    // 新方案：使用Option C - 调整起始Close voicing的转位（在voicing-engine.js中实现）
    /**
     * 生成Drop2 voicing
     * @param {object} closeVoicing - Close voicing对象（必须是原位，按MIDI从低到高排列）
     * @param {object} chord - 原始和弦对象（包含root和type）
     * @param {object} options - 可选配置
     * @param {boolean} options.forceRootPosition - 是否强制原位（根音在最低）
     * @param {string} options.key - 调性（如'C-major', 'A-minor'）用于正确拼写
     * @param {object} options.keySignature - 调号对象（包含sharps/flats信息）
     * @returns {object} Drop2 voicing对象
     */
    static generateDrop2(closeVoicing, chord, options = {}) {
        console.log('\n🎵 ===== 极简Drop2生成 =====');
        console.log('📍 输入:', closeVoicing?.notes?.join('-'), '| MIDI:', closeVoicing?.midiNotes?.join(', '));
        console.log('📌 和弦:', chord?.root + chord?.type);
        console.log('🎵 调性:', options.key || '默认C大调');
        if (options.forceRootPosition) {
            console.log('🔒 原位约束: 启用（用户未勾选转位）');
        }

        // 1. 验证输入
        if (!closeVoicing || !closeVoicing.midiNotes || closeVoicing.midiNotes.length < 3) {
            console.log('❌ Drop2失败：需要至少3个音符');
            return null;
        }

        // 2. 复制voicing（不修改原对象）
        let result = {
            type: 'drop2',
            notes: [...closeVoicing.notes],
            midiNotes: [...closeVoicing.midiNotes],
            root: chord.root,        // 📌 使用原始和弦根音
            chordType: chord.type,   // 📌 使用原始和弦类型
            shouldSkipInversionAdjustment: true  // 📌 跳过转位调整（使用原始root/type）
        };

        // 3. 找出第2高音（按MIDI从高到低排序）
        const indexed = result.midiNotes
            .map((midi, index) => ({ midi, index }))
            .sort((a, b) => b.midi - a.midi);  // 降序

        console.log('🔍 MIDI排序（高→低）:');
        indexed.forEach((item, i) => {
            const label = i === 0 ? '最高' : i === 1 ? '第2高⬅️' : i === 2 ? '第3高' : `第${i+1}高`;
            console.log(`  ${label}: ${result.notes[item.index]} (MIDI ${item.midi})`);
        });

        // 4. Drop2变换：第2高音降8度
        const secondHighest = indexed[1];
        const oldMidi = result.midiNotes[secondHighest.index];
        const newMidi = oldMidi - 12;

        console.log(`\n🎯 Drop2变换: ${result.notes[secondHighest.index]} MIDI ${oldMidi} → ${newMidi}`);
        result.midiNotes[secondHighest.index] = newMidi;

        // 5. 重新排序（保持notes和midiNotes对应关系）
        const sorted = result.notes
            .map((note, i) => ({ note, midi: result.midiNotes[i] }))
            .sort((a, b) => a.midi - b.midi);

        result.notes = sorted.map(p => p.note);
        result.midiNotes = sorted.map(p => p.midi);

        // 🔧 修复 (2025-10-03): 根据调号重新生成正确的音符拼写
        // 问题：Drop2变换后音符降了8度，但notes仍是原来的字符串，可能不符合调号
        // 解决：根据新的MIDI值和调号重新生成音符名称
        if (options.key && typeof window !== 'undefined' && window.harmonyTheory) {
            console.log(`🔧 根据调号${options.key}重新生成音符拼写...`);

            const keySignature = window.harmonyTheory.keys && window.harmonyTheory.keys[options.key]
                || options.keySignature
                || null;

            const respelledNotes = result.midiNotes.map((midi, index) => {
                const noteIndex = midi % 12;  // 半音索引 (0-11)
                const octave = Math.floor(midi / 12) - 1;  // MIDI八度

                // 使用getCorrectEnharmonic函数重新拼写（如果可用）
                if (typeof getCorrectEnharmonic === 'function') {
                    // 🔧 修复 (2025-10-05 v26): 增强chordContext，添加完整信息
                    const chordContext = {
                        root: chord.root,
                        type: chord.type,
                        notes: result.notes,          // ✅ 添加notes数组（优先级1分支需要）
                        midiNotes: result.midiNotes,  // ✅ 添加midiNotes数组
                        key: options.key || chord.key || 'C-major'  // ✅ 添加key属性
                    };

                    // 🔧 修复 (2025-10-05 v27): 智能调性推断（根据和弦类型）
                    // 问题：v26总是推断major key，导致Cm和弦的Eb被拼成D#
                    // 解决：根据和弦类型推断正确的major/minor调性
                    let effectiveKeySignature = keySignature;
                    if (!keySignature || (keySignature.tonic === 'C' && keySignature.mode === 'major' && chord.root !== 'C')) {
                        // 🔧 修复 (2025-10-05 v30): 增和弦使用升号系统
                        // 原因：增和弦（augmented）的增五音应该用升号拼写（C-E-G#, A-C#-E#等）
                        const isAugmentedChord = chord.type.includes('aug') || chord.type === 'augmented';

                        if (isAugmentedChord) {
                            // 增和弦统一使用大调的升号系统
                            // 🔧 修复 (2025-10-05 v32→v33): 大调保持大写
                            // harmony-theory.js key命名规则：
                            // - 大调：首字母大写（'Ab-major', 'Eb-major', 'Db-major'）
                            // - 小调：首字母小写（'bb-minor', 'eb-minor', 'ab-minor'）
                            const inferredKey = `${chord.root}-major`; // ✅ 大调保持大写
                            if (window.harmonyTheory.keys && window.harmonyTheory.keys[inferredKey]) {
                                effectiveKeySignature = window.harmonyTheory.keys[inferredKey];
                                console.log(`  🎲 音符${index+1} 推断调性: ${inferredKey} (增和弦使用升号系统)`);
                            }
                        } else {
                            // 根据和弦类型判断使用major还是minor调性
                            const minorChordTypes = ['minor', 'minor7', 'minor9', 'minor11', 'minor13',
                                                     'minorMaj7', 'minor7b5', 'diminished', 'diminished7'];
                            const isMinorChord = minorChordTypes.some(type => chord.type.includes(type));

                            const inferredMode = isMinorChord ? 'minor' : 'major';
                            // 🔧 修复 (2025-10-05 v32→v33): 区分大调/小调的大小写
                            // 小调：转换小写（'bb-minor', 'eb-minor'）
                            // 大调：保持大写（'Ab-major', 'Eb-major'）
                            const inferredKey = inferredMode === 'minor'
                                ? `${chord.root.toLowerCase()}-minor`  // 小调小写
                                : `${chord.root}-major`;                // 大调大写

                            if (window.harmonyTheory.keys && window.harmonyTheory.keys[inferredKey]) {
                                effectiveKeySignature = window.harmonyTheory.keys[inferredKey];
                                console.log(`  🎲 音符${index+1} 推断调性: ${inferredKey} (${isMinorChord ? '小调和弦' : '大调和弦'})`);
                            }
                        }
                    }

                    const spellingResult = getCorrectEnharmonic(noteIndex, chordContext, octave, effectiveKeySignature);

                    if (spellingResult && spellingResult.step) {
                        const alter = spellingResult.alter || 0;
                        const alterStr = alter < 0 ? 'b'.repeat(-alter) : alter > 0 ? '#'.repeat(alter) : '';
                        const newNote = spellingResult.step + alterStr;
                        console.log(`  音符${index+1}: MIDI ${midi} → ${newNote} (原: ${result.notes[index]})`);
                        return newNote;
                    }
                }

                // Fallback：保持原音符名称
                return result.notes[index];
            });

            result.notes = respelledNotes;
            console.log(`✅ 拼写更新完成:`, result.notes.join('-'));
        }

        // 6. 计算跨度
        result.range = Math.max(...result.midiNotes) - Math.min(...result.midiNotes);

        console.log('✅ Drop2结果:', result.notes.join('-'));
        console.log('   MIDI:', result.midiNotes.join(', '), `| 跨度: ${result.range}半音`);
        console.log('   和弦:', result.root + result.chordType);

        // 🔧 修复 (2025-10-03): 移除错误的转位调整逻辑
        // 新方案已在voicing-engine.js实现：使用第二转位Close voicing作为起点
        // Drop2变换后自然产生原位，无需后处理调整

        console.log('===========================\n');

        return result;
    }

    /**
     * 生成Drop3 voicing
     * @param {object} closeVoicing - Close voicing对象
     * @param {object} chord - 原始和弦对象
     * @param {object} options - 可选配置
     * @param {boolean} options.forceRootPosition - 是否强制原位（根音在最低）
     * @param {string} options.key - 调性（如'C-major', 'A-minor'）用于正确拼写
     * @param {object} options.keySignature - 调号对象（包含sharps/flats信息）
     * @returns {object} Drop3 voicing对象
     */
    static generateDrop3(closeVoicing, chord, options = {}) {
        console.log('\n🎵 ===== 极简Drop3生成 =====');
        console.log('📍 输入:', closeVoicing?.notes?.join('-'), '| MIDI:', closeVoicing?.midiNotes?.join(', '));
        console.log('📌 和弦:', chord?.root + chord?.type);
        console.log('🎵 调性:', options.key || '默认C大调');
        if (options.forceRootPosition) {
            console.log('🔒 原位约束: 启用（用户未勾选转位）');
        }

        // 1. 验证输入（Drop3需要至少4个音符）
        if (!closeVoicing || !closeVoicing.midiNotes || closeVoicing.midiNotes.length < 4) {
            console.log('❌ Drop3失败：需要至少4个音符（当前' + (closeVoicing?.midiNotes?.length || 0) + '个）');
            return null;
        }

        // 2. 复制voicing
        let result = {
            type: 'drop3',
            notes: [...closeVoicing.notes],
            midiNotes: [...closeVoicing.midiNotes],
            root: chord.root,        // 📌 使用原始和弦根音
            chordType: chord.type,   // 📌 使用原始和弦类型
            shouldSkipInversionAdjustment: true  // 📌 跳过转位调整（使用原始root/type）
        };

        // 3. 找出第3高音
        const indexed = result.midiNotes
            .map((midi, index) => ({ midi, index }))
            .sort((a, b) => b.midi - a.midi);  // 降序

        console.log('🔍 MIDI排序（高→低）:');
        indexed.forEach((item, i) => {
            const label = i === 0 ? '最高' : i === 1 ? '第2高' : i === 2 ? '第3高⬅️' : `第${i+1}高`;
            console.log(`  ${label}: ${result.notes[item.index]} (MIDI ${item.midi})`);
        });

        // 4. Drop3变换：第3高音降8度
        const thirdHighest = indexed[2];
        const oldMidi = result.midiNotes[thirdHighest.index];
        const newMidi = oldMidi - 12;

        console.log(`\n🎯 Drop3变换: ${result.notes[thirdHighest.index]} MIDI ${oldMidi} → ${newMidi}`);
        result.midiNotes[thirdHighest.index] = newMidi;

        // 5. 重新排序
        const sorted = result.notes
            .map((note, i) => ({ note, midi: result.midiNotes[i] }))
            .sort((a, b) => a.midi - b.midi);

        result.notes = sorted.map(p => p.note);
        result.midiNotes = sorted.map(p => p.midi);

        // 🔧 修复 (2025-10-03): 根据调号重新生成正确的音符拼写
        // 问题：Drop3变换后音符降了8度，但notes仍是原来的字符串，可能不符合调号
        // 解决：根据新的MIDI值和调号重新生成音符名称
        if (options.key && typeof window !== 'undefined' && window.harmonyTheory) {
            console.log(`🔧 根据调号${options.key}重新生成音符拼写...`);

            const keySignature = window.harmonyTheory.keys && window.harmonyTheory.keys[options.key]
                || options.keySignature
                || null;

            const respelledNotes = result.midiNotes.map((midi, index) => {
                const noteIndex = midi % 12;  // 半音索引 (0-11)
                const octave = Math.floor(midi / 12) - 1;  // MIDI八度

                // 使用getCorrectEnharmonic函数重新拼写（如果可用）
                if (typeof getCorrectEnharmonic === 'function') {
                    // 🔧 修复 (2025-10-05 v26): 增强chordContext，添加完整信息
                    const chordContext = {
                        root: chord.root,
                        type: chord.type,
                        notes: result.notes,          // ✅ 添加notes数组（优先级1分支需要）
                        midiNotes: result.midiNotes,  // ✅ 添加midiNotes数组
                        key: options.key || chord.key || 'C-major'  // ✅ 添加key属性
                    };

                    // 🔧 修复 (2025-10-05 v27): 智能调性推断（根据和弦类型）
                    // 问题：v26总是推断major key，导致Cm和弦的Eb被拼成D#
                    // 解决：根据和弦类型推断正确的major/minor调性
                    let effectiveKeySignature = keySignature;
                    if (!keySignature || (keySignature.tonic === 'C' && keySignature.mode === 'major' && chord.root !== 'C')) {
                        // 🔧 修复 (2025-10-05 v30): 增和弦使用升号系统
                        // 原因：增和弦（augmented）的增五音应该用升号拼写（C-E-G#, A-C#-E#等）
                        const isAugmentedChord = chord.type.includes('aug') || chord.type === 'augmented';

                        if (isAugmentedChord) {
                            // 增和弦统一使用大调的升号系统
                            // 🔧 修复 (2025-10-05 v32→v33): 大调保持大写
                            // harmony-theory.js key命名规则：
                            // - 大调：首字母大写（'Ab-major', 'Eb-major', 'Db-major'）
                            // - 小调：首字母小写（'bb-minor', 'eb-minor', 'ab-minor'）
                            const inferredKey = `${chord.root}-major`; // ✅ 大调保持大写
                            if (window.harmonyTheory.keys && window.harmonyTheory.keys[inferredKey]) {
                                effectiveKeySignature = window.harmonyTheory.keys[inferredKey];
                                console.log(`  🎲 音符${index+1} 推断调性: ${inferredKey} (增和弦使用升号系统)`);
                            }
                        } else {
                            // 根据和弦类型判断使用major还是minor调性
                            const minorChordTypes = ['minor', 'minor7', 'minor9', 'minor11', 'minor13',
                                                     'minorMaj7', 'minor7b5', 'diminished', 'diminished7'];
                            const isMinorChord = minorChordTypes.some(type => chord.type.includes(type));

                            const inferredMode = isMinorChord ? 'minor' : 'major';
                            // 🔧 修复 (2025-10-05 v32→v33): 区分大调/小调的大小写
                            // 小调：转换小写（'bb-minor', 'eb-minor'）
                            // 大调：保持大写（'Ab-major', 'Eb-major'）
                            const inferredKey = inferredMode === 'minor'
                                ? `${chord.root.toLowerCase()}-minor`  // 小调小写
                                : `${chord.root}-major`;                // 大调大写

                            if (window.harmonyTheory.keys && window.harmonyTheory.keys[inferredKey]) {
                                effectiveKeySignature = window.harmonyTheory.keys[inferredKey];
                                console.log(`  🎲 音符${index+1} 推断调性: ${inferredKey} (${isMinorChord ? '小调和弦' : '大调和弦'})`);
                            }
                        }
                    }

                    const spellingResult = getCorrectEnharmonic(noteIndex, chordContext, octave, effectiveKeySignature);

                    if (spellingResult && spellingResult.step) {
                        const alter = spellingResult.alter || 0;
                        const alterStr = alter < 0 ? 'b'.repeat(-alter) : alter > 0 ? '#'.repeat(alter) : '';
                        const newNote = spellingResult.step + alterStr;
                        console.log(`  音符${index+1}: MIDI ${midi} → ${newNote} (原: ${result.notes[index]})`);
                        return newNote;
                    }
                }

                // Fallback：保持原音符名称
                return result.notes[index];
            });

            result.notes = respelledNotes;
            console.log(`✅ 拼写更新完成:`, result.notes.join('-'));
        }

        // 6. 计算跨度
        result.range = Math.max(...result.midiNotes) - Math.min(...result.midiNotes);

        console.log('✅ Drop3结果:', result.notes.join('-'));
        console.log('   MIDI:', result.midiNotes.join(', '), `| 跨度: ${result.range}半音`);
        console.log('   和弦:', result.root + result.chordType);

        // 🔧 修复 (2025-10-03): 移除错误的转位调整逻辑
        // 新方案已在voicing-engine.js实现：使用第三转位Close voicing作为起点
        // Drop3变换后自然产生原位，无需后处理调整

        console.log('===========================\n');

        return result;
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.SimpleDropVoicing = SimpleDropVoicing;
    console.log('✅ 极简Drop Voicing系统已加载');
}
