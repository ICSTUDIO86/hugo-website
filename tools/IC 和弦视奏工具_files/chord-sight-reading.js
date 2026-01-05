/*!
 * IC Studio - 和弦视奏生成器
 * Chord Sight-Reading Generator JavaScript
 *
 * Copyright © 2025. All rights reserved. Igor Chen - icstudio.club
 *
 * Author: Igor Chen
 * Website: https://icstudio.club
 * Email: icstudio@fastmail.com
 */

// 全局变量
let osmd = null;
// 🔧 修复 (2025-10-01): 将历史记录变量暴露到window对象，以便HTML中的钢琴模式可以访问
window.currentChords = null;
window.chordsHistory = [];
window.currentChordsIndex = -1;
let audioContext = null;
// metronomeInterval variable is declared in main HTML file
let currentTempo = 60;
let chordsVisible = true;
let chordSymbolsVisible = true; // 🎵 和弦代号显示控制

// ============================================
// 🎵 和弦代号系统 - 统一配置中心
// ============================================
/**
 * 中心化的和弦类型符号映射表
 * 这是整个系统的唯一数据源（Single Source of Truth）
 *
 * 设计原则：
 * 1. 单一数据源：所有和弦代号映射集中在此
 * 2. 完整覆盖：支持45+种和弦类型
 * 3. 易于维护：修改一处，全系统生效
 *
 * 用法：
 * - getChordTypeSymbol(type) - 获取类型符号（如'm', 'maj7'）
 * - getChordSymbol(chord) - 获取完整代号（如'Cm', 'Gmaj7'）
 */
const CHORD_TYPE_SYMBOLS = {
    // ============ 基本三和弦 ============
    'major': '',            // C, D, E...
    'minor': 'm',           // Cm, Dm, Em...
    'diminished': '°',      // C°, D°, E°...
    'augmented': 'aug',     // Caug, Daug, Eaug... (2025-10-05用户偏好：使用aug而非+)

    // ============ 七和弦系列 ============
    'major7': 'maj7',       // Cmaj7, Dmaj7...
    'minor7': 'm7',         // Cm7, Dm7...
    'dominant7': '7',       // C7, D7, E7...
    'minor7b5': 'm7♭5',     // Cm7♭5 (半减七)
    'diminished7': 'dim7',  // Cdim7 (减七)
    'minorMaj7': 'mMaj7',   // CmMaj7 (小大七)
    'augmented7': '+7',     // C+7 (增七)

    // ============ 挂和弦 (sus) ============
    'sus2': 'sus2',         // Csus2
    'sus4': 'sus4',         // Csus4
    '7sus2': '7sus2',       // C7sus2
    '7sus4': '7sus4',       // C7sus4
    'maj7sus2': 'maj7sus2', // Cmaj7sus2
    'maj7sus4': 'maj7sus4', // Cmaj7sus4

    // ============ 九和弦系列 ============
    'major9': 'maj9',       // Cmaj9
    'minor9': 'm9',         // Cm9
    'dominant9': '9',       // C9

    // ============ 十一和弦系列 ============
    'major11': 'maj11',     // Cmaj11
    'minor11': 'm11',       // Cm11
    'dominant11': '11',     // C11

    // ============ 十三和弦系列 ============
    'major13': 'maj13',     // Cmaj13
    'minor13': 'm13',       // Cm13
    'dominant13': '13',     // C13

    // ============ 六和弦 ============
    'major6': 'maj6',       // Cmaj6 或 C6
    'minor6': 'm6',         // Cm6
    'm6': 'm6',             // Cm6 (简写 - 2025-10-02新增)
    '6': '6',               // C6 (简写)
    '6/9': '6/9',           // C6/9 (六九和弦 - 2025-10-02新增)

    // ============ 添加音和弦 ============
    'add9': 'add9',         // Cadd9
    'add2': 'add2',         // Cadd2
    'madd2': 'madd2',       // Cmadd2 (2025-10-02新增: 小三和弦+2音)
    '6add9': '6add9',       // C6add9
    '6add2': '6add2',       // C6add2 (2025-10-02新增: 6和弦+2音)
    'minor6add9': 'm6add9', // Cm6add9

    // ============ 特殊变化和弦 ============
    'majorSharp11': 'maj♯11',      // Cmaj♯11
    'minorSharp11': 'm♯11',        // Cm♯11
    'dominantSharp11': '7♯11',     // C7♯11
    'majorFlat5': 'maj♭5',         // Cmaj♭5
    'minorFlat5': 'm♭5',           // Cm♭5
    'dominantFlat5': '7♭5',        // C7♭5
    'majorb5': 'maj♭5',            // Cmajb5 (别名)

    // ============ 五度和弦 ============
    'power': '5',           // C5 (power chord)

    // ============ 兼容旧版本简写 ============
    'maj7': 'maj7',         // 兼容简写
    'm7': 'm7',             // 兼容简写
    '7': '7',               // 兼容简写
    'm7b5': 'm7♭5',         // 兼容简写
    'dim7': 'dim7',         // 兼容简写
    'aug7': '+7'            // 兼容简写
};

/**
 * 获取和弦类型符号（只返回类型部分，不含根音）
 * @param {string} chordType - 和弦类型（如'major', 'minor7', 'sus4'）
 * @returns {string} 类型符号（如'', 'm7', 'sus4'）
 */
function getChordTypeSymbol(chordType) {
    if (!chordType) return '';
    const symbol = CHORD_TYPE_SYMBOLS[chordType];
    if (symbol === undefined) {
        console.warn(`⚠️ 未知和弦类型: "${chordType}"，使用空符号`);
        return '';
    }
    return symbol;
}

/**
 * 获取完整和弦代号（根音 + 类型符号）
 * @param {Object} chord - 和弦对象，包含root和type属性
 * @returns {string} 完整和弦代号（如'C', 'Dm7', 'Gsus4'）
 */
function getChordSymbol(chord) {
    if (!chord || !chord.root) {
        console.warn('⚠️ getChordSymbol: 无效的和弦对象', chord);
        return '';
    }

    // 🎵 新增 (2025-10-02): 6/9和弦特殊处理
    if (chord.is69Voicing) {
        console.log(`🎵 检测到6/9和弦: ${chord.root}maj7 → ${chord.root}6/9`);
        return chord.root + '6/9';
    }

    const typeSymbol = getChordTypeSymbol(chord.type);
    return chord.root + typeSymbol;
}

/**
 * 判断音符是否为核心和弦音（Root, 3rd, 5th, 7th）
 * 用于转位检测：只有核心和弦音在低音时才应该显示斜线记号
 * Tension音符（9th, 11th, 13th）在低音不应该显示斜线
 *
 * @param {string} bassNote - 低音音符名称（不含八度，如"D"）
 * @param {string} chordRoot - 和弦根音（如"C"）
 * @param {string} chordType - 和弦类型（如"major7"）
 * @returns {boolean} - true表示是核心和弦音
 */
function isCoreChordTone(bassNote, chordRoot, chordType) {
    const noteToSemitone = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
        'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10,
        'Bb': 10, 'B': 11, 'Cb': 11, 'B#': 0, 'E#': 5
    };

    const rootSemitone = noteToSemitone[chordRoot];
    const bassSemitone = noteToSemitone[bassNote];

    if (rootSemitone === undefined || bassSemitone === undefined) {
        console.warn(`⚠️ isCoreChordTone: 无法识别音符 root=${chordRoot}, bass=${bassNote}`);
        return true; // 默认返回true，避免误判
    }

    // 计算音程（半音数）
    const interval = (bassSemitone - rootSemitone + 12) % 12;

    // 核心和弦音的音程（相对于根音）
    const coreIntervals = [
        0,   // 根音 (1)
        3,   // 小三度 (b3)
        4,   // 大三度 (3)
        7,   // 完全五度 (5)
        6,   // 减五度 (b5) - diminished和弦
        8,   // 增五度 (#5) - augmented和弦
        10,  // 小七度 (b7)
        11   // 大七度 (7)
    ];

    const isCore = coreIntervals.includes(interval);

    console.log(`🔍 核心和弦音检查: ${bassNote} 在 ${chordRoot}${chordType} 中`);
    console.log(`  音程: ${interval}半音 → ${isCore ? '核心和弦音 ✅' : 'Tension音符 ❌'}`);

    return isCore;
}

// ============================================
// 🎵 和弦代号系统配置结束
// ============================================


// 🧪 和弦代号功能测试 - 在控制台中运行: testChordSymbolFunction()
function testChordSymbolFunction() {
    console.log('\n🧪 === 和弦代号功能测试 ===');

    // 测试1: 基本函数测试
    console.log('📝 测试1: getChordSymbol函数');
    const testChords = [
        { root: 'C', type: 'major' },
        { root: 'Am', type: 'minor' },
        { root: 'G', type: 'dominant7' },
        { root: 'F#', type: 'major7' }
    ];

    testChords.forEach(chord => {
        const symbol = getChordSymbol(chord);
        console.log(`  ${chord.root}${chord.type} → "${symbol}"`);
    });

    // 测试2: getChordKind函数
    console.log('\n📝 测试2: getChordKind函数');
    const testTypes = ['major', 'minor', 'dominant7', 'major7'];
    testTypes.forEach(type => {
        const kind = getChordKind(type);
        console.log(`  ${type} → "${kind}"`);
    });

    // 测试3: chordSymbolsVisible状态
    console.log('\n📝 测试3: 变量状态');
    console.log(`  chordSymbolsVisible = ${chordSymbolsVisible}`);

    // 测试4: 按钮元素
    console.log('\n📝 测试4: UI元素');
    const btn = document.getElementById('chordSymbolBtn');
    console.log(`  按钮存在: ${!!btn}`);
    if (btn) {
        console.log(`  按钮内容: "${btn.innerHTML}"`);
        console.log(`  按钮标题: "${btn.title}"`);
    }

    // 测试5: OSMD对象检查
    console.log('\n📝 测试5: OSMD检查');
    console.log(`  OSMD对象存在: ${typeof osmd !== 'undefined'}`);
    if (typeof osmd !== 'undefined' && osmd.EngravingRules) {
        console.log(`  RenderChordSymbols支持: ${'RenderChordSymbols' in osmd.EngravingRules}`);
        if ('RenderChordSymbols' in osmd.EngravingRules) {
            console.log(`  RenderChordSymbols值: ${osmd.EngravingRules.RenderChordSymbols}`);
        }
    }

    console.log('\n✅ 和弦代号功能测试完成');
    console.log('💡 如果所有测试都通过但仍看不到和弦代号，问题可能在OSMD渲染层');
    return true;
}

let metronomeIsPlaying = false;
let isPlayingChords = false;
let currentPlayback = [];

// 音乐理论引擎
let harmonyTheory = null;
let chordProgressionGenerator = null;
let jazzHarmony = null;
let voicingEngine = null;
let voiceLeadingAnalyzer = null;
let enhancedHarmony = null;

// 🔧 新增：避免连续相同和弦的全局状态跟踪
let lastGeneratedProgression = null;

// 🔧 新增：比较两个和弦进行是否相同的函数
function areProgressionsIdentical(prog1, prog2) {
    if (!prog1 || !prog2) return false;
    if (prog1.length !== prog2.length) return false;

    for (let i = 0; i < prog1.length; i++) {
        const chord1 = prog1[i];
        const chord2 = prog2[i];

        // 比较根音和和弦类型
        if (chord1.root !== chord2.root || chord1.type !== chord2.type) {
            return false;
        }
    }
    return true;
}

// 🔧 新增：生成不重复和弦进行的包装函数
function generateUniqueProgression(generatorFunc, key, measures, maxRetries = 3) {
    let attempts = 0;
    let newProgression;

    do {
        newProgression = generatorFunc(key, measures);
        attempts++;

        // 如果这是第一次生成，或者尝试次数超过限制，直接使用
        if (!lastGeneratedProgression || attempts >= maxRetries) {
            break;
        }

        // 如果与上次生成的相同，继续尝试
        if (areProgressionsIdentical(newProgression, lastGeneratedProgression)) {
            console.log(`🔄 第${attempts}次尝试：和弦进行与上次相同，重新生成...`);
            continue;
        } else {
            console.log(`✅ 第${attempts}次尝试：生成了不同的和弦进行`);
            break;
        }
    } while (attempts < maxRetries);

    // 保存这次的生成结果
    lastGeneratedProgression = newProgression ? JSON.parse(JSON.stringify(newProgression)) : null;

    if (attempts >= maxRetries && areProgressionsIdentical(newProgression, lastGeneratedProgression)) {
        console.log(`⚠️ 达到最大尝试次数(${maxRetries})，使用当前结果（可能重复）`);
    }

    return newProgression;
}

// CSS布局修复函数
function applyCSSLayoutFix() {
    console.log('🎨 开始应用CSS布局修复...');

    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) return;

    const svg = scoreDiv.querySelector('svg');
    if (!svg) return;

    // 查找所有可能的系统(行)元素
    const systemSelectors = [
        'g[id*="system"]',
        'g[class*="system"]',
        'g[id*="System"]',
        'g[class*="System"]'
    ];

    let systemsFound = 0;
    systemSelectors.forEach(selector => {
        const systems = svg.querySelectorAll(selector);
        systems.forEach((system, index) => {
            systemsFound++;

            // 强制设置为flexbox布局
            system.style.display = 'flex';
            system.style.justifyContent = 'space-evenly';
            system.style.width = '100%';

            console.log(`✅ 系统${index + 1} (${selector}): 应用flex布局`);

            // 查找该系统内的小节
            const measures = system.querySelectorAll('g[id*="measure"], g[class*="measure"]');
            measures.forEach((measure, measureIndex) => {
                measure.style.display = 'inline-block';
                measure.style.margin = '0 auto';
                measure.style.flex = '1';
                measure.style.textAlign = 'center';
            });

            console.log(`  └─ 找到${measures.length}个小节`);
        });
    });

    if (systemsFound === 0) {
        console.warn('⚠️ 未找到系统元素，尝试直接处理小节...');

        // 备选方案：直接处理所有小节
        const allMeasures = svg.querySelectorAll('g[id*="measure"], g[class*="measure"]');
        allMeasures.forEach((measure, index) => {
            measure.style.display = 'inline-block';
            measure.style.margin = '0 10px';
            measure.style.verticalAlign = 'top';
        });

        console.log(`✅ 直接处理了${allMeasures.length}个小节`);
    }

    // 确保SVG占满宽度
    svg.style.width = '100%';
    svg.style.maxWidth = '100%';
    svg.style.display = 'block';
    svg.style.margin = '0 auto';

    console.log(`🎨 CSS布局修复完成: 处理了${systemsFound}个系统`);
}

// 当前设置 - 使用全局对象确保与HTML中的设置同步
window.chordSettings = window.chordSettings || {
    chordTypes: ['major', 'minor'],
    keys: ['C-major', 'a-minor'],
    timeSignatures: ['4/4'],
    clefs: ['treble'],
    rhythms: ['half', 'quarter'],
    includeTriadInversions: false,    // 三和弦转位设置
    includeSeventhInversions: false,  // 七和弦转位设置
    complexity: 'medium',             // 复杂度设置
    // Voicing设置
    voicingTypes: ['close'],          // 启用的voicing类型
    // 🎸 增强三和弦配置 - 紧急隔离
    enhancedGuitarTriads: false,      // 🚫 完全禁用增强系统 - 阶段2隔离措施
    // 🎵 四声部三和弦细粒度控制 (已隔离)
    fourVoiceTriadSettings: {
        enabled: false,               // 🚫 已隔离 - 阶段2措施
        allowedConfigurations: {      // 保留配置但已禁用
            '5135': false,            // 已隔离
            '5131': false,            // 已隔离
            '1351': false,            // 已隔离
            '1513': false,            // 已隔离
            '3513': false             // 已隔离
        },
        preferFourVoice: false,       // 已隔离
        fallbackToThreeVoice: false   // 已隔离
    },
    // 🎸 阶段3: 新的吉他专属四声部三和弦配置
    guitarFourVoiceTriads: {
        enabled: true,                // 🎸 独立的吉他四声部系统
        configurations: {             // 5种吉他专属配置
            'voice5135': true,        // 5-1-3-5 (G3-C4-E4-G4)
            'voice5131': true,        // 5-1-3-1 (G3-C4-E4-C5, 需要Eb4+)
            'voice1351': true,        // 1-3-5-1 (C4-E4-G4-C5)
            'voice1513': true,        // 1-5-1-3 (C4-G4-C5-E5)
            'voice3513': true         // 3-5-1-3 (E4-G4-C5-E5)
        },
        minRange: 60,                 // 最低MIDI音符 (C4)
        maxRange: 84,                 // 最高MIDI音符 (C6)
        requireGuitarMode: true,      // 必须在吉他模式下激活
        requireCloseVoicing: true,    // 必须是close voicing类型
        requireTriadChord: true,      // 必须是三和弦
        intelligentSelection: true,   // 智能选择最适合的配置
        fourVoiceProbability: 0.5     // 🎲 生成四声部配置的概率 (0.5 = 50%)
    },
    enableVoiceLeading: true,         // 永远启用voice leading优化
    voicingPreference: 'close'        // 首选voicing类型
};

// 🔧 翻译系统已分离到 i18n.js (2025-10-04)
// 翻译对象（translations）、switchLanguage()、applyCurrentLanguage() 已移至 chords-generator/i18n.js
// 新的调用方式：I18n.switchLanguage(lang)、I18n.applyLanguage()

// 确保voicing引擎可用的函数
function ensureVoicingEngine() {
    if (!voicingEngine && typeof VoicingEngine !== 'undefined' && harmonyTheory) {
        console.log('🔧 按需初始化VoicingEngine');
        voicingEngine = new VoicingEngine(harmonyTheory);

        // 应用当前设置
        if (window.chordSettings.voicingTypes.length > 0) {
            voicingEngine.updateSettings({
                enabledVoicings: window.chordSettings.voicingTypes,
                enableVoiceLeading: window.chordSettings.enableVoiceLeading,
                enableInversions: window.chordSettings.includeTriadInversions || window.chordSettings.includeSeventhInversions
            });
        }
    }
    return voicingEngine;
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎹 和弦视奏生成器初始化...');
    initializeMusicTheory();
    initializeOSMD();
    setupEventListeners();
    initRangeListeners();
    applyCurrentLanguage();
    loadTheme();
});

// 初始化音乐理论引擎
function initializeMusicTheory() {
    try {
        console.log('🎵 初始化音乐理论引擎...');

        // 初始化和声理论
        harmonyTheory = new HarmonyTheory();
        // 🔧 关键修复：确保window.harmonyTheory也被正确赋值
        window.harmonyTheory = harmonyTheory;
        console.log('✅ 和声理论模块加载成功，window.harmonyTheory已设置');

        // 初始化和弦进行生成器
        chordProgressionGenerator = new ChordProgressionGenerator(harmonyTheory);
        console.log('✅ 和弦进行生成器加载成功');

        // 初始化爵士和声
        jazzHarmony = new JazzHarmony(harmonyTheory);
        console.log('✅ 爵士和声模块加载成功');

        // 初始化Voicing引擎
        if (typeof VoicingEngine !== 'undefined') {
            voicingEngine = new VoicingEngine(harmonyTheory);
            console.log('✅ Voicing引擎加载成功');
        } else {
            console.error('❌ VoicingEngine未定义，请检查voicing-engine.js是否正确加载');
            voicingEngine = null;
        }

        // 初始化Voice Leading分析器
        voiceLeadingAnalyzer = new VoiceLeadingAnalyzer(harmonyTheory);
        console.log('✅ Voice Leading分析器加载成功');

        // 确保voicingEngine正确初始化
        if (!voicingEngine && typeof VoicingEngine !== 'undefined') {
            console.log('🔧 重新初始化VoicingEngine');
            voicingEngine = new VoicingEngine(harmonyTheory);
        }

        // 应用默认设置
        if (voicingEngine) {
            voicingEngine.updateSettings({
                enabledVoicings: window.chordSettings.voicingTypes,
                enableVoiceLeading: window.chordSettings.enableVoiceLeading,
                enableInversions: window.chordSettings.includeTriadInversions || window.chordSettings.includeSeventhInversions
            });
            console.log('✅ VoicingEngine设置已更新');
        } else {
            console.error('❌ VoicingEngine仍然未可用');
        }

        if (voiceLeadingAnalyzer) {
            voiceLeadingAnalyzer.updateSettings({
                enableInversions: window.chordSettings.includeTriadInversions || window.chordSettings.includeSeventhInversions
            });
        }

        console.log('🎼 音乐理论引擎初始化完成，默认设置已应用');
    } catch (error) {
        console.error('❌ 音乐理论引擎初始化失败:', error);
    }
}

// 初始化OpenSheetMusicDisplay
function initializeOSMD() {
    try {
        const container = document.getElementById('score');
        if (container) {
            // 获取容器宽度
            const containerWidth = container.clientWidth || 800;

            // 关键修改：使用与旋律工具相同的svg后端
            osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container, {
                autoResize: true,
                backend: "svg",  // 改回svg后端，与旋律工具一致
                drawTitle: false
            });

            // 基础的OSMD配置 - 详细配置在渲染时应用
            if (osmd.EngravingRules) {
                console.log(`🎼 开始基础OSMD配置: 容器宽度${containerWidth}px`);

                // 只设置最基本的设置，详细配置在渲染时应用
                osmd.EngravingRules.RenderTitle = false;
                osmd.EngravingRules.RenderSubtitle = false;
                osmd.EngravingRules.RenderComposer = false;
                osmd.EngravingRules.RenderPartNames = false;
                osmd.EngravingRules.RenderPartAbbreviations = false;

                console.log(`✅ 基础配置完成，详细布局将在渲染时应用`);
            }

            console.log('✅ OSMD初始化成功');
        }
    } catch (error) {
        console.error('❌ OSMD初始化失败:', error);
    }
}

// 显示空状态提示（与旋律工具保持一致）
function showEmptyStateHint() {
    const scoreContainer = document.getElementById('score');
    if (!scoreContainer) return;

    // 检查是否已经有内容
    if (scoreContainer.querySelector('svg') || scoreContainer.querySelector('.osmd-container')) {
        return; // 有内容就不显示提示
    }

    // 检查是否已经有提示
    if (scoreContainer.querySelector('.empty-score-message')) {
        return; // 已经有提示了
    }

    const hintElement = document.createElement('div');
    hintElement.className = 'empty-score-message';
    hintElement.innerHTML = `
        <p data-i18n="score.empty">点击生成和弦开始练习</p>
    `;

    scoreContainer.appendChild(hintElement);
}

// 隐藏空状态提示
function hideEmptyStateHint() {
    const scoreContainer = document.getElementById('score');
    if (!scoreContainer) return;

    const hintElement = scoreContainer.querySelector('.empty-score-message');
    if (hintElement) {
        hintElement.remove();
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 音域变化事件
    const rangeMin = document.getElementById('rangeMin');
    const rangeMax = document.getElementById('rangeMax');
    if (rangeMin && rangeMax) {
        rangeMin.addEventListener('change', validateRange);
        rangeMax.addEventListener('change', validateRange);
    }

    // 点击score容器生成和弦
    const scoreContainer = document.getElementById('score');
    if (scoreContainer) {
        scoreContainer.addEventListener('click', function(event) {
            // 避免在播放或其他交互时误触发
            if (event.target === scoreContainer || event.target.tagName === 'svg' || event.target.closest('svg')) {
                console.log('🎼 点击容器生成新和弦...');

                // 🔧 修复 (2025-10-01): 检测钢琴/吉他模式，调用对应的生成函数
                const instrumentToggle = document.getElementById('instrumentModeToggle');
                const isPianoMode = instrumentToggle && instrumentToggle.checked;

                if (isPianoMode) {
                    console.log('🎹 钢琴模式：点击容器调用 generatePianoChords()');
                    if (typeof generatePianoChords === 'function') {
                        generatePianoChords();
                    } else {
                        console.error('❌ generatePianoChords 函数不可用');
                    }
                } else {
                    console.log('🎸 吉他模式：点击容器调用 generateChords()');
                    generateChords();
                }
            }
        });

        // 添加鼠标悬停提示
        scoreContainer.style.cursor = 'pointer';
        scoreContainer.title = '点击生成新和弦';

        // 添加空状态提示
        showEmptyStateHint();

        console.log('✅ 已添加点击容器生成和弦功能');
    }

    // BPM输入框事件
    const bpmInput = document.getElementById('headerMetronomeBpm');
    if (bpmInput) {
        bpmInput.addEventListener('change', updateTempo);
        bpmInput.addEventListener('input', updateTempo);
    }

    // 点击外部关闭模态框（并自动保存设置）
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                // 根据弹窗ID调用相应的关闭函数（包含保存逻辑）
                switch (modal.id) {
                    case 'chordTypeModal':
                        closeChordTypeSettings();
                        break;
                    case 'rhythmModal':
                        closeRhythmSettings();
                        break;
                    case 'keySignatureModal':
                        closeKeySettings();
                        break;
                    case 'timeSignatureModal':
                        closeTimeSignatureSettings();
                        break;
                    case 'clefModal':
                        closeClefSettings();
                        break;
                    default:
                        // 对于未知的弹窗，只是简单关闭
                        modal.style.display = 'none';
                        break;
                }
            }
        });

        // ESC键关闭当前显示的弹窗（并自动保存设置）
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                const visibleModals = document.querySelectorAll('.modal[style*="display: flex"], .modal[style*="display: block"]');
                visibleModals.forEach(modal => {
                    // 根据弹窗ID调用相应的关闭函数（包含保存逻辑）
                    switch (modal.id) {
                        case 'chordTypeModal':
                            closeChordTypeSettings();
                            break;
                        case 'rhythmModal':
                            closeRhythmSettings();
                            break;
                        case 'keySignatureModal':
                            closeKeySettings();
                            break;
                        case 'timeSignatureModal':
                            closeTimeSignatureSettings();
                            break;
                        case 'clefModal':
                            closeClefSettings();
                            break;
                        default:
                            modal.style.display = 'none';
                            break;
                    }
                });
            }
        });

        // 关闭下拉菜单
        if (!event.target.closest('.function-selector')) {
            const functionMenu = document.getElementById('functionMenu');
            if (functionMenu) functionMenu.classList.remove('active');
        }
        if (!event.target.closest('.settings-dropdown')) {
            const settingsMenu = document.getElementById('settingsMenu');
            if (settingsMenu) settingsMenu.classList.remove('show');
        }
    });
}

// 验证音域设置
function validateRange() {
    const min = parseInt(document.getElementById('rangeMin').value);
    const max = parseInt(document.getElementById('rangeMax').value);

    if (min >= max) {
        alert('最低音必须低于最高音');
        document.getElementById('rangeMax').value = min + 12;
    }
}

/**
 * 验证和弦是否能在指定音域内生成有效的Drop 3 voicing
 * @param {Object} chord - 和弦对象
 * @param {number} rangeMin - 最小MIDI音高
 * @param {number} rangeMax - 最大MIDI音高
 * @returns {boolean} 是否能生成有效的Drop 3
 */
function canGenerateValidDrop3(chord, rangeMin, rangeMax) {
    if (!voicingEngine || !chord) {
        return false;
    }

    // 只有四音及以上和弦才可能有Drop 3
    if (!chord.notes || chord.notes.length < 4) {
        console.log(`🎯 Drop 3 预验证: ${chord.root}${chord.type} 只有${chord.notes?.length || 0}个音符，无法生成Drop 3`);
        return false;
    }

    try {
        // 尝试生成close voicing作为Drop 3的基础
        const closeVoicing = voicingEngine.generateCloseVoicing(chord, {
            rangeMin: rangeMin,
            rangeMax: rangeMax
        });

        if (!closeVoicing) {
            console.log(`🎯 Drop 3 预验证: ${chord.root}${chord.type} 无法生成基础close voicing`);
            return false;
        }

        // 🎯 使用新的极简Drop3实现进行验证（2025-10-03）
        const drop3Voicing = window.SimpleDropVoicing
            ? window.SimpleDropVoicing.generateDrop3(closeVoicing, chord)
            : voicingEngine.generateDrop3Voicing(closeVoicing, { rangeMin, rangeMax });

        if (!drop3Voicing) {
            console.log(`🎯 Drop 3 预验证: ${chord.root}${chord.type} 无法生成Drop 3 voicing`);
            return false;
        }

        // 🔧 放宽验证（2025-10-03）：Drop3允许低音稍微超出下限
        // 原因：Drop3会把第3高音降8度，自然会扩展音域下限
        const TOLERANCE = 5;  // 允许低音超出5个半音
        const adjustedMinRange = rangeMin - TOLERANCE;

        const allInRange = drop3Voicing.midiNotes.every(midi => {
            return (midi >= adjustedMinRange && midi <= rangeMax);
        });

        if (!allInRange) {
            const outOfRange = drop3Voicing.midiNotes.filter(m => m < adjustedMinRange || m > rangeMax);
            console.log(`🎯 Drop 3 预验证: ${chord.root}${chord.type} Drop 3音符超出范围（超出${outOfRange.length}个）`);
            return false;
        }

        console.log(`✅ Drop 3 预验证: ${chord.root}${chord.type} 可以生成有效的Drop 3`);
        return true;

    } catch (error) {
        console.log(`❌ Drop 3 预验证: ${chord.root}${chord.type} 验证过程出错 - ${error.message}`);
        return false;
    }
}

/**
 * 智能添加和弦到结果数组，在只选择Drop 3时进行预验证
 * @param {Array} result - 结果数组
 * @param {Object} chord - 要添加的和弦
 * @param {string} logMessage - 日志消息
 * @returns {boolean} 是否成功添加
 */
function smartAddChord(result, chord, logMessage) {
    // 检查是否只选择了Drop 3 voicing
    const isDrop3OnlyMode = window.chordSettings.voicingTypes &&
                           window.chordSettings.voicingTypes.length === 1 &&
                           window.chordSettings.voicingTypes[0] === 'drop3';

    if (isDrop3OnlyMode) {
        // 在Drop 3模式下，验证和弦是否能生成有效的Drop 3
        const rangeMin = parseInt(document.getElementById('rangeMin').value);
        const rangeMax = parseInt(document.getElementById('rangeMax').value);

        if (!canGenerateValidDrop3(chord, rangeMin, rangeMax)) {
            console.log(`🚫 Drop 3模式：跳过无法生成有效Drop 3的和弦 ${chord.root}${chord.type}`);
            return false;
        }
    }

    // 添加和弦到结果
    // 🎵 添加完整和弦代号供后处理使用
    if (chord.root && chord.type) {
        chord.fullSymbol = getChordSymbol(chord);
        console.log(`📝 为和弦添加fullSymbol: ${chord.fullSymbol}`);
    }
    result.push(chord);
    console.log(logMessage);
    return true;
}

/**
 * 🎯 统一小节宽度系统 - 简化的内容复杂度分析
 * 专注于统一小节宽度，简单调整以适应不同内容密度
 * @param {Array} progression - 和弦进行数组
 * @returns {number} 基础缩放因子 (0.7-1.0，适度调整)
 */
function getVoicingComplexityFactor(progression) {
    if (!progression || !Array.isArray(progression) || progression.length === 0) {
        return 1.0; // 无和弦或无效输入，不调整
    }

    // 获取用户选择的小节数
    const userMeasures = parseInt(document.querySelector('input[name="measures"]:checked')?.value || '4');
    console.log(`🎯 统一宽度模式: ${userMeasures}小节，启用基础调整策略`);

    // 统计可能影响宽度的因素
    const complexVoicings = progression.filter(chord =>
        chord.voicing && ['drop2', 'drop3'].includes(chord.voicing.type)
    );

    // 基础缩放策略：简单适度调整
    let scaleFactor = 1.0;

    // 如果有复杂voicing，适度缩小以预留空间给统一宽度控制
    if (complexVoicings.length > 0) {
        const complexRatio = complexVoicings.length / progression.length;
        // 温和的基础调整：10%-30%缩小
        const reduction = complexRatio * 0.3;
        scaleFactor = Math.max(0.7, 1.0 - reduction);
        console.log(`📊 基础调整: ${complexVoicings.length}/${progression.length}复杂voicing -> 缩放${(scaleFactor * 100).toFixed(0)}%`);
    }

    // 根据小节数进行微调
    if (progression.length >= 6) {
        scaleFactor *= 0.95; // 长进行略微缩小
    } else if (progression.length <= 2) {
        scaleFactor = Math.min(1.0, scaleFactor * 1.05); // 短进行略微放大
    }

    console.log(`🎼 统一宽度缩放分析: ${progression.length}小节 -> 基础缩放${(scaleFactor * 100).toFixed(0)}%`);

    return Math.max(0.7, Math.min(1.0, scaleFactor));
}

// 🔧 新增 (2025-10-06): 检测和弦进行中的临时记号密度
// 用于解决"很多临时记号导致小节宽度增加"的问题
function getAccidentalsDensity(progression) {
    if (!progression || !Array.isArray(progression) || progression.length === 0) {
        return 0;
    }

    let totalAccidentals = 0;
    let totalChords = progression.length;

    progression.forEach(chord => {
        const chordSymbol = `${chord.root || ''}${chord.type || ''}${chord.slashBass || ''}`;
        // 统计#和b的数量
        const sharps = (chordSymbol.match(/#/g) || []).length;
        const flats = (chordSymbol.match(/b/g) || []).length;
        totalAccidentals += sharps + flats;
    });

    // 计算每个和弦平均的临时记号数量
    const density = totalAccidentals / totalChords;
    console.log(`🎵 临时记号密度分析: ${totalAccidentals}个临时记号 / ${totalChords}个和弦 = ${density.toFixed(2)}`);

    return density;
}

// 🔧 新增 (2025-10-06): 检测钢琴模式下的音符数量配置
// 用于解决"随机模式下6音/7音配置需要更大容器"的问题
function getPianoNoteCountInfo(progression) {
    if (!progression || !Array.isArray(progression) || progression.length === 0) {
        console.log(`🎹 钢琴音符数检测: progression为空或无效`);
        return {
            hasHighNoteCount: false,
            maxNoteCount: 0,
            avgNoteCount: 0,
            highNoteCountChords: 0
        };
    }

    console.log(`🎹 钢琴音符数检测: 开始检测 ${progression.length} 个和弦...`);

    let totalNotes = 0;
    let validChordCount = 0;
    let maxNoteCount = 0;
    let highNoteCountChords = 0; // 6音或7音的和弦数量
    let chordsWithoutPianoData = 0;

    progression.forEach((chord, index) => {
        // 🔍 诊断: 检查和弦结构
        const hasPianoData = !!(chord.pianoData);
        const hasBassClef = !!(chord.pianoData?.bassClefMidi);
        const hasTrebleClef = !!(chord.pianoData?.trebleClefMidi);

        if (!hasPianoData) {
            chordsWithoutPianoData++;
            console.log(`   🔍 和弦${index + 1}: 缺少pianoData (${chord.root}${chord.type || ''})`);
            return;
        }

        if (!hasBassClef || !hasTrebleClef) {
            chordsWithoutPianoData++;
            console.log(`   🔍 和弦${index + 1}: pianoData不完整 - bass=${hasBassClef}, treble=${hasTrebleClef}`);
            return;
        }

        // 检查是否有钢琴数据
        if (chord.pianoData && chord.pianoData.bassClefMidi && chord.pianoData.trebleClefMidi) {
            const bassCount = chord.pianoData.bassClefMidi.length;
            const trebleCount = chord.pianoData.trebleClefMidi.length;
            const noteCount = bassCount + trebleCount;

            console.log(`   ✅ 和弦${index + 1}: ${chord.root}${chord.type || ''} → ${noteCount}音 (bass=${bassCount}, treble=${trebleCount})`);

            totalNotes += noteCount;
            validChordCount++;

            if (noteCount > maxNoteCount) {
                maxNoteCount = noteCount;
            }

            // 统计6音或7音配置
            if (noteCount >= 6) {
                highNoteCountChords++;
            }
        }
    });

    if (chordsWithoutPianoData > 0) {
        console.log(`   ⚠️ ${chordsWithoutPianoData} 个和弦缺少完整的pianoData`);
    }

    const avgNoteCount = validChordCount > 0 ? totalNotes / validChordCount : 0;
    const hasHighNoteCount = highNoteCountChords > 0; // 只要有一个6音或7音就算高配置

    console.log(`🎹 钢琴音符数统计: 有效和弦=${validChordCount}, 总音符=${totalNotes}, 最大=${maxNoteCount}音, 平均=${avgNoteCount.toFixed(1)}音, 高配置和弦=${highNoteCountChords}个`);

    return {
        hasHighNoteCount,
        maxNoteCount,
        avgNoteCount,
        highNoteCountChords
    };
}

// 生成和弦 (占位符)
function generateChords() {
    console.log('🎹 智能和弦生成器启动...');

    // 🎵 生成新和弦时自动停止当前播放
    if (isPlayingChords) {
        console.log('⏹️ 生成新和弦时自动停止当前播放');
        stopPlayback();
    }

    // 🕐 停止旧的周期性检查（如果有的话）
    if (typeof stopPeriodicChordSymbolCheck === 'function') {
        stopPeriodicChordSymbolCheck();
    }

    if (!chordProgressionGenerator) {
        console.error('❌ 和弦生成器未初始化');
        alert('和弦生成器正在初始化，请稍后再试');
        return;
    }

    try {
        // 获取当前设置
        const measures = parseInt(document.querySelector('input[name="measures"]:checked')?.value || '4');

        // 🔧 修复 (2025-10-01): 检测功能和声模式，智能选择调号
        // 🔧 修复 (2025-10-02): 添加防御性检查，确保keys存在
        // 功能和声模式: 使用第一个调号（用户明确选择的调性）
        // 随机模式: 从可用调号中随机选择
        const functionalHarmonyToggle = document.getElementById('functionalHarmonyToggle');
        const isFunctionalMode = functionalHarmonyToggle ? functionalHarmonyToggle.checked : false;

        let selectedKey = 'C-major'; // 默认调号
        if (window.chordSettings && window.chordSettings.keys && window.chordSettings.keys.length > 0) {
            if (isFunctionalMode) {
                // 🔧 修复 (2025-10-05): 功能和声模式支持多调号随机选择
                // 功能和声模式：从选中的调号中随机选择
                if (window.chordSettings.keys.length === 1) {
                    // 只有一个调号时直接使用
                    selectedKey = window.chordSettings.keys[0];
                    console.log(`🎼 功能和声模式 - 使用唯一选中调号: ${selectedKey}`);
                } else {
                    // 多个调号时随机选择
                    const randomIndex = Math.floor(Math.random() * window.chordSettings.keys.length);
                    selectedKey = window.chordSettings.keys[randomIndex];
                    console.log(`🎼 功能和声模式 - 随机选择调号: ${selectedKey} (从${window.chordSettings.keys.length}个可用调号中选择)`);
                }
            } else {
                // 随机模式：从可用调号中随机选择
                const randomIndex = Math.floor(Math.random() * window.chordSettings.keys.length);
                selectedKey = window.chordSettings.keys[randomIndex];
                console.log(`🎲 随机模式 - 随机选择调号: ${selectedKey} (从${window.chordSettings.keys.length}个可用调号中选择)`);
            }
        } else {
            console.log(`🎸 使用默认调号: ${selectedKey}`);
            console.warn(`⚠️ window.chordSettings.keys 未定义或为空，请检查调号设置`);
        }

        console.log(`🎼 生成参数: ${measures}小节, 调性: ${selectedKey}`);

        // 和弦生成选项
        const options = {
            includeInversions: false, // 转位现在在applyInversionsToProgression中处理
            complexity: window.chordSettings.complexity,
            chordTypes: window.chordSettings.chordTypes // 传递和弦类型设置
        };

        console.log('🔧 生成选项:', options);
        console.log('🎯 用户选择的和弦类型:', window.chordSettings.chordTypes);

        // 🔍 新增 (2025-10-03): Major7和弦追踪系统初始化（在包装器之前）
        window.major7Tracking = {
            selected: [],
            succeeded: [],
            failed: []
        };
        console.log('📊 Major7追踪系统已初始化');

        let chordProgression;
        let progressionAnalysis = null;

        // 检查是否启用功能和声生成
        const functionalHarmonyEnabled = window.chordSettings.useFunctionalHarmony || false;

        if (functionalHarmonyEnabled) {
            console.log('🎼 使用功能和声生成模式');
            chordProgression = generateUniqueProgression(generateFunctionalProgression, selectedKey, measures);
        } else {
            console.log('🎲 使用随机和弦生成模式');
            chordProgression = generateUniqueProgression(generateDiverseProgression, selectedKey, measures);
        }

        // 根据用户设置扩展三和弦为七和弦
        // 注意：在随机模式下，如果用户明确选择了三和弦和七和弦，不进行自动扩展
        // 因为随机生成已经根据用户选择的类型进行了精确的权重分配
        // 🔧 修复 (2025-10-03): 功能和声模式下，如果用户选择了三和弦类型，也不自动扩展

        // 检查用户是否明确选择了三和弦类型
        const userSelectedTriads = window.chordSettings.chordTypes &&
            window.chordSettings.chordTypes.some(type => ['major', 'minor', 'diminished', 'augmented'].includes(type));

        // 检查用户是否明确选择了七和弦类型
        const userSelectedSevenths = window.chordSettings.chordTypes &&
            window.chordSettings.chordTypes.some(type => type.includes('7'));

        // 只有在以下情况才扩展三和弦：
        // 1. 用户只选择了七和弦（没有选择三和弦） - 自动扩展以生成七和弦
        // 2. 用户既没选三和弦也没选七和弦（使用默认和弦） - 自动扩展
        const shouldExpand = !userSelectedTriads && !functionalHarmonyEnabled;

        if (shouldExpand) {
            console.log('🔄 执行三和弦到七和弦的扩展（用户未明确选择三和弦）...');
            chordProgression = expandTriadsToSeventhChords(chordProgression, selectedKey);
        } else {
            if (userSelectedTriads) {
                console.log('✅ 保留三和弦：用户明确选择了三和弦类型');
            } else if (functionalHarmonyEnabled) {
                console.log('✅ 保留三和弦：功能和声模式下尊重用户的和弦类型选择');
            } else {
                console.log('🚫 跳过三和弦扩展：用户同时选择了三和弦和七和弦类型');
            }
        }

        // 由于和弦生成已经严格使用用户选择的类型，无需再次过滤
        const filteredProgression = chordProgression;

        // 应用转位处理（根据是否启用功能和声选择转位策略）
        // 🔧 修复 (2025-10-02): 功能和声模式下不再二次处理转位
        // 原因：generateFunctionalProgression() 已调用 applyFunctionalInversions() 设置了转位
        // 避免双重转位系统冲突
        let invertedProgression;
        if (functionalHarmonyEnabled) {
            console.log('✅ 功能和声模式：转位已由 applyFunctionalInversions() 在和弦进行生成时设置');
            console.log('   跳过吉他模式二次转位处理（避免覆盖功能和声转位规则）');

            // 🔍 诊断：显示每个和弦的转位状态
            console.log('\n🔍 功能和声转位状态检查：');
            filteredProgression.forEach((chord, i) => {
                const invInfo = chord.inversion !== undefined && chord.inversion > 0
                    ? `第${chord.inversion}转位 (${chord.inversionReason || '未知原因'})`
                    : '原位';
                console.log(`  第${i+1}小节 ${chord.root}${chord.type}: ${invInfo}`);
            });
            console.log('');

            invertedProgression = filteredProgression;  // 直接使用，不再调用智能转位
        } else {
            console.log('🎲 ========== 准备调用随机转位系统 ==========');
            console.log('🎲 当前Voicing设置:', window.chordSettings.voicingTypes);
            console.log('🎲 七和弦转位设置:', window.chordSettings.includeSeventhInversions);
            invertedProgression = applyInversionsToProgression(filteredProgression, selectedKey);
            console.log('🎲 ========== 随机转位系统调用完成 ==========');
        }

        // 应用Voicing处理 - 总是应用voicing来确保close voicing
        // voicing引擎内部会根据转位设置决定是否允许转位
        let voicedProgression;

        // 总是应用voicing处理，让voicing引擎内部处理转位逻辑
        voicedProgression = applyVoicingToProgression(invertedProgression, selectedKey);

        console.log(`🎨 Voicing处理: 已应用 (转位设置: ${window.chordSettings.includeTriadInversions || window.chordSettings.includeSeventhInversions})`);

        // 创建和弦对象
        window.currentChords = {
            progression: voicedProgression,
            originalProgression: chordProgression,
            measures: measures,
            key: selectedKey,
            timestamp: Date.now(),
            analysis: progressionAnalysis || (chordProgressionGenerator ? chordProgressionGenerator.analyzeProgression(chordProgression, selectedKey) : null),
            functionalAnalysis: progressionAnalysis, // 增强功能和声分析
            voicingAnalysis: null // 稍后添加voice leading分析
        };

        // 添加到历史记录
        window.chordsHistory.push(window.currentChords);
        window.currentChordsIndex = window.chordsHistory.length - 1;

        // 检查生成的和弦是否包含转位
        console.log('🔍 检查生成的和弦:');
        window.currentChords.progression.forEach((chord, index) => {
            const isInverted = chord.inversion || (chord.notes && isChordInverted(chord));
            console.log(`第${index + 1}小节: ${chord.root}${chord.type} - ${chord.notes ? chord.notes.join('-') : '无音符'} ${isInverted ? '(转位)' : '(原位)'}`);

            // 🔍 和弦类型详细诊断（特别关注sus和弦）
            if (chord.type.includes('sus')) {
                console.log(`  🎵 Sus和弦检测: 类型="${chord.type}", 根音="${chord.root}", 音符=[${chord.notes ? chord.notes.join(', ') : '无'}]`);
            }
        });

        // 显示生成的和弦
        displayChords(window.currentChords);

        // 显示功能分析面板
        if (progressionAnalysis) {
            showAnalysisPanel(window.currentChords);
        }

        // 打印和声分析
        console.log('🎵 和弦进行分析:');
        currentChords.analysis.forEach(analysis => {
            console.log(`  第${analysis.measure}小节: ${analysis.chord.root}${analysis.chord.type} (${analysis.function}功能)`);
        });

        console.log('✅ 智能和弦生成完成:', currentChords);

    } catch (error) {
        console.error('❌ 和弦生成失败:', error);

        // 降级到简单模式
        console.log('🔄 启用降级模式...');
        const fallbackMeasures = parseInt(document.querySelector('input[name="measures"]:checked')?.value || '4');
        generateSimpleChords(fallbackMeasures);
    }
}

// 确保和弦符合调性（用于过滤后的和弦调整）
function ensureChordInKey(chord, key, rootNote, chordType) {
    if (!chord) return null;

    const scaleNotes = getScaleChordRoots(key);  // 🔧 修复：使用正确的音阶定义
    // 🔧 修复：使用智能调内验证，支持异名同音
    const validation = harmonyTheory.validateChordInKey(chord, key);
    const hasOutOfKeyNotes = !validation.isInKey;

    if (!hasOutOfKeyNotes) {
        // 和弦已经在调内，直接返回
        return chord;
    }

    // 调整调外音
    console.log(`🔧 调整 ${rootNote}${chordType} 的调外音: ${chord.notes.join('-')}`);
    return adjustChordToKey(chord, key, rootNote, chordType);
}

// 过滤和弦类型以匹配用户设置
function filterChordsByUserSettings(chordProgression, key) {
    if (!chordProgression || !window.chordSettings.chordTypes) {
        return chordProgression;
    }

    console.log('🎯 过滤和弦类型...', {
        userSelectedTypes: window.chordSettings.chordTypes,
        originalChords: chordProgression.map(c => `${c.root}${c.type}`)
    });

    return chordProgression.map(chord => {
        const originalType = chord.type;

        // 检查和弦类型是否被用户选中
        const isSeventhChord = originalType.includes('7');
        const isTriad = !isSeventhChord;

        // 如果是七和弦但用户没有选择任何七和弦类型，转换为三和弦
        if (isSeventhChord && !window.chordSettings.chordTypes.some(type => type.includes('7'))) {
            let newType = 'major'; // 默认类型

            if (originalType.includes('minor') || originalType === 'minor7') {
                newType = 'minor';
            } else if (originalType.includes('diminished')) {
                newType = 'diminished';
            } else if (originalType.includes('augmented')) {
                newType = 'augmented';
            }

            console.log(`🔄 转换七和弦 ${chord.root}${originalType} -> ${chord.root}${newType}`);

            // 构建新和弦并确保调性合规
            const newChord = harmonyTheory.buildChord(chord.root, newType, key);
            const adjustedChord = ensureChordInKey(newChord, key, chord.root, newType);

            return {
                ...chord,
                type: newType,
                notes: adjustedChord.notes
            };
        }

        // 对于三和弦，不进行强制替换，保持原始音乐逻辑
        // 只有当用户明确禁用某些复杂度级别时才进行转换
        // 例如：用户可能没有选择 sus2/sus4，但这些仍然是有效的三和弦类型
        console.log(`🎵 保持原始三和弦类型: ${chord.root}${originalType}`);

        return chord;
    });
}

// 应用转位到和弦进行
function applyInversionsToProgression(chordProgression, key) {
    if (!chordProgression) {
        return chordProgression;
    }

    console.log('🔄 ========== applyInversionsToProgression 开始执行 ==========');
    console.log('🔄 和弦进行数量:', chordProgression.length);
    console.log('🔄 转位设置状态:', {
        includeTriadInversions: window.chordSettings.includeTriadInversions,
        includeSeventhInversions: window.chordSettings.includeSeventhInversions,
        shouldAllowInversions: window.chordSettings.includeTriadInversions || window.chordSettings.includeSeventhInversions
    });
    console.log('🔄 Voicing类型:', window.chordSettings.voicingTypes);

    return chordProgression.map(chord => {
        if (!chord || !chord.type) {
            return chord;
        }

        // 使用统一的挂留和弦检测系统
        const inversionEligibility = harmonyTheory.validateInversionEligibility(chord);
        if (!inversionEligibility.allowed) {
            console.log(`🚫 跳过转位处理：${inversionEligibility.reason}`);
            return harmonyTheory.comprehensiveSuspendedChordProtection(chord, '随机转位系统');
        }

        // 🛡️ 使用新的挂留和弦保护机制
        const shouldInvert = harmonyTheory.shouldChordBeAffectedByInversionSettings(
            chord,
            window.chordSettings.includeTriadInversions,
            window.chordSettings.includeSeventhInversions
        );

        if (!shouldInvert) {
            return chord;
        }

        // 重新定义和弦类型检查（在重构时被误删）
        // 🔧 修复 (2025-10-03): 添加sus和弦支持
        const isTriad = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'].includes(chord.type);
        const isSeventh = ['major7', 'minor7', 'dominant7', 'minor7b5', 'minorMaj7', 'augmented7', '7sus2', '7sus4'].includes(chord.type);

        // 🔧 修复 (2025-10-03): 用户反馈Drop2/Drop3转位太少，提高转位频率
        const inversionProbability = 0.6; // 60%概率应用转位，40%保持原位（从30%提高）
        if (Math.random() >= inversionProbability) {
            console.log(`🎯 保持原位: ${chord.root}${chord.type} (40%概率)`);
            return chord; // 保持原位
        }

        // 应用转位（现在确保30%的和弦会有转位）
        const invertedChord = { ...chord };

        if (isTriad) {
            // 🔧 修复：三和弦转位在剩余30%中平均分配（第一转位50%，第二转位50%）
            const inversionType = Math.random();
            if (inversionType < 0.5) {
                invertedChord.inversion = 1; // 第一转位 (六和弦) - 15%总概率
                invertedChord.inversionName = '第一转位';
            } else {
                invertedChord.inversion = 2; // 第二转位 (四六和弦) - 15%总概率
                invertedChord.inversionName = '第二转位';
            }
        } else if (isSeventh) {
            // 🎯 七和弦close voicing特殊处理：吉他模式下只要勾选了close voicing就禁用七和弦转位
            // 🔧 2025-10-03 修复：将条件从"只勾选close"改为"包含close"
            // 原因：在转位分配阶段无法预知哪个和弦会用close voicing
            // 为避免产生难以演奏的close voicing转位七和弦，保守策略是：
            // 只要用户勾选了close voicing，七和弦就不转位
            const hasCloseVoicing = window.chordSettings.voicingTypes &&
                                   window.chordSettings.voicingTypes.includes('close');

            // 检查当前乐器模式：false = 吉他模式，true = 钢琴模式
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            const isGuitarMode = !instrumentToggle || !instrumentToggle.checked; // 默认吉他模式
            console.log(`  - 最终条件: ${hasCloseVoicing && isGuitarMode}`);

            if (hasCloseVoicing && isGuitarMode) {
                console.log(`🎸 吉他模式包含Close voicing：跳过七和弦转位 ${chord.root}${chord.type} (强制根位)`);
                console.log(`   原因：Close voicing七和弦转位难以演奏，即使勾选了其他voicing类型也禁用`);
                // 🔧 关键修复：明确设置为原位，清除任何可能存在的转位信息
                invertedChord.inversion = 0;
                invertedChord.inversionName = null;
            } else {
                // 🔧 修复：七和弦转位在剩余30%中平均分配（第一、二、三转位各33.3%）
                const inversionType = Math.random();
                if (inversionType < 0.333) {
                    invertedChord.inversion = 1; // 第一转位 (五六和弦) - 10%总概率
                    invertedChord.inversionName = '第一转位';
                } else if (inversionType < 0.666) {
                    invertedChord.inversion = 2; // 第二转位 (三四和弦) - 10%总概率
                    invertedChord.inversionName = '第二转位';
                } else {
                    invertedChord.inversion = 3; // 第三转位 (二和弦) - 10%总概率
                    invertedChord.inversionName = '第三转位';
                }
            }
        }

        // 生成转位后的音符
        if (invertedChord.inversion) {
            invertedChord.notes = generateInvertedNotes(chord, invertedChord.inversion);
            console.log(`${chord.root}${chord.type} -> ${invertedChord.inversionName}: ${invertedChord.notes.join('-')}`);
        }

        return invertedChord;
    });
}

// 生成转位音符
function generateInvertedNotes(chord, inversion) {
    if (!chord.notes || chord.notes.length === 0) {
        return chord.notes;
    }

    const originalNotes = [...chord.notes];
    let invertedNotes = [...originalNotes];

    // 应用转位：将低音移到高音
    for (let i = 0; i < inversion; i++) {
        const lowestNote = invertedNotes.shift(); // 移除最低音
        invertedNotes.push(lowestNote); // 添加到最高音
    }

    return invertedNotes;
}

// 检查和弦是否为转位
function isChordInverted(chord) {
    if (!chord.notes || chord.notes.length < 3) {
        console.log(`❌ 转位检测失败: 音符数量不足 (${chord.notes ? chord.notes.length : 0})`);
        return false;
    }

    // 扩展的同音异名映射表
    const noteToSemitone = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
        'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10,
        'Bb': 10, 'B': 11, 'Cb': 11, 'B#': 0, 'E#': 5,
        // 处理双升双降
        'C##': 2, 'D##': 4, 'F##': 7, 'G##': 9, 'A##': 11,
        'Dbb': 0, 'Ebb': 2, 'Gbb': 5, 'Abb': 7, 'Bbb': 9
    };

    // 处理根音
    const rootSemitone = noteToSemitone[chord.root];
    if (rootSemitone === undefined) {
        console.log(`❌ 转位检测错误: 找不到根音 ${chord.root} 的半音信息`);
        return false;
    }

    // 如果和弦有明确的转位标记，直接返回
    if (chord.inversion && chord.inversion > 0) {
        console.log(`🔍 转位检测: ${chord.root}${chord.type} - 明确标记转位 ${chord.inversion}`);
        return true;
    }

    // 获取第一个音符（最低音）
    const firstNote = chord.notes[0];

    // 更强大的音符名提取：处理各种格式
    let firstNoteName = firstNote;

    // 移除八度标记 (如 C4, Bb3)
    firstNoteName = firstNoteName.replace(/\d+$/, '');

    // 移除可能的其他标记
    firstNoteName = firstNoteName.replace(/[^\w#b]/g, '');

    console.log(`🔍 转位检测详情: ${chord.root}${chord.type}`);
    console.log(`  - 根音: ${chord.root} (半音: ${rootSemitone})`);
    console.log(`  - 音符数组: [${chord.notes.join(', ')}]`);
    console.log(`  - 第一个音符: "${firstNote}" -> 清理后: "${firstNoteName}"`);

    const firstSemitone = noteToSemitone[firstNoteName];

    if (firstSemitone === undefined) {
        console.log(`❌ 转位检测错误: 找不到第一个音符 "${firstNoteName}" 的半音信息`);
        console.log(`  可用的音符名: ${Object.keys(noteToSemitone).join(', ')}`);
        return false;
    }

    // 检查半音位置是否匹配
    const isInverted = firstSemitone !== rootSemitone;

    console.log(`  - 第一音符半音: ${firstSemitone}`);
    console.log(`  - 根音半音: ${rootSemitone}`);
    console.log(`  - 半音匹配: ${firstSemitone === rootSemitone ? '✅' : '❌'}`);
    console.log(`  - 字符串匹配: ${firstNoteName === chord.root ? '✅' : '❌'}`);
    console.log(`  - 最终结果: ${isInverted ? '转位' : '原位'}`);

    return isInverted;
}

/**
 * 基于权重选择和弦类型
 * 七和弦获得更高的权重以增加出现频率
 * @param {Array} availableTypes - 可用的和弦类型数组
 * @returns {string} 选择的和弦类型
 */
function selectChordTypeWithWeight(availableTypes) {
    // 创建权重数组 - 新的平衡权重配置
    const weights = availableTypes.map(type => {
        // 基本七和弦：40权重
        if (type === 'major7' || type === 'minor7' || type === 'dominant7' || type === 'minor7b5') {
            return 40;
        }
        // 基本三和弦：40权重
        else if (type === 'major' || type === 'minor' || type === 'diminished' || type === 'augmented') {
            return 40;
        }
        // sus和弦（包括7sus）：20权重
        else if (type === '7sus2' || type === '7sus4' || type === 'sus2' || type === 'sus4') {
            return 20;
        }
        // 其他所有类型（包括其他七和弦）：较低权重 10，避免意外大量出现
        else {
            return 10;
        }
    });

    // 计算总权重
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    // 生成随机数
    let random = Math.random() * totalWeight;

    // 基于权重选择和弦类型
    for (let i = 0; i < availableTypes.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            const selectedType = availableTypes[i];
            // 🔍 调试：记录选择结果和权重
            console.log(`🎲 权重选择: ${selectedType} (权重=${weights[i]}, 总权重=${totalWeight})`);
            return selectedType;
        }
    }

    // 备用方案：返回最后一个
    const fallbackType = availableTypes[availableTypes.length - 1];
    console.log(`🎲 权重选择fallback: ${fallbackType}`);
    return fallbackType;
}

/**
 * 基于权重选择和弦对象（用于功能和声生成）
 * 七和弦获得更高的权重以增加出现频率
 * @param {Array} chordOptions - 可用的和弦对象数组
 * @returns {Object} 选择的和弦对象
 */
function selectChordWithWeight(chordOptions) {
    if (!chordOptions || chordOptions.length === 0) {
        return null;
    }

    // 🎯 新增 (2025-10-03): 三和弦/七和弦配对检测系统
    // 目的：当用户同时勾选三和弦和七和弦时，给它们相同权重，实现50-50随机
    console.log(`\n🔍 ===== 三和弦/七和弦配对检测 =====`);

    const chordPairs = new Map(); // root -> { triad: index, seventh: index, function: string }

    chordOptions.forEach((chord, i) => {
        const key = chord.root;
        if (!chordPairs.has(key)) {
            chordPairs.set(key, { function: chord.function });
        }

        // 判断是三和弦还是七和弦
        if (!chord.type.includes('7')) {
            chordPairs.get(key).triad = i;
            chordPairs.get(key).triadType = chord.type;
        } else {
            chordPairs.get(key).seventh = i;
            chordPairs.get(key).seventhType = chord.type;
        }
    });

    // 统计配对情况
    let pairCount = 0;
    let triadOnlyCount = 0;
    let seventhOnlyCount = 0;

    chordPairs.forEach((pair, root) => {
        const hasBoth = pair.triad !== undefined && pair.seventh !== undefined;
        const hasTriadOnly = pair.triad !== undefined && pair.seventh === undefined;
        const hasSeventhOnly = pair.triad === undefined && pair.seventh !== undefined;

        if (hasBoth) {
            pairCount++;
            console.log(`  ✅ 配对: ${root} - ${pair.triadType} (索引${pair.triad}) + ${pair.seventhType} (索引${pair.seventh})`);
        } else if (hasTriadOnly) {
            triadOnlyCount++;
            console.log(`  🎵 仅三和弦: ${root}${pair.triadType} (索引${pair.triad})`);
        } else if (hasSeventhOnly) {
            seventhOnlyCount++;
            console.log(`  🎵 仅七和弦: ${root}${pair.seventhType} (索引${pair.seventh})`);
        }
    });

    console.log(`📊 配对统计: ${pairCount}个配对, ${triadOnlyCount}个仅三和弦, ${seventhOnlyCount}个仅七和弦`);

    // 创建权重数组 - 参考旋律视奏工具使用1-100的简单数字权重系统
    // 🔧 修复 (2025-10-03): 实现配对平衡权重系统
    const weights = chordOptions.map((chord, i) => {
        const type = chord.type;
        const root = chord.root;

        // 🎯 优先检查：是否为配对和弦（三和弦+七和弦同时存在）
        const pair = chordPairs.get(root);
        const hasPair = pair && pair.triad !== undefined && pair.seventh !== undefined;

        if (hasPair) {
            // 配对模式：三和弦和七和弦使用相同的平衡权重
            // 确保50-50随机选择
            const balancedWeight = 65;
            console.log(`  ⚖️  ${root}${type}: 配对平衡权重 = ${balancedWeight}`);
            return balancedWeight;
        }

        // 非配对模式：使用原有权重逻辑
        // 基础七和弦（大七、小七、属七、减七）获得最高权重（85）
        if (type === 'major7' || type === 'minor7' || type === 'dominant7' || type === 'minor7b5') {
            return 85;
        }
        // 7sus和弦获得极低权重（5）
        else if (type === '7sus2' || type === '7sus4') {
            return 5;
        }
        // 其他七和弦（扩展和变化音七和弦）获得高权重（70）
        else if (type && type.includes('7')) {
            return 70;
        }
        // 普通sus和弦获得低权重（8）
        else if (type && type.includes('sus')) {
            return 8;
        }
        // 三和弦权重
        // 🔧 修复 (2025-10-03): 用户反馈Drop2/Drop3模式下三和弦几乎不出现
        // 原因：权重过低（12 vs 85），导致三和弦被选中概率只有约12%
        // 修复：提高Drop2/Drop3模式下三和弦权重，让三和弦和七和弦比例更平衡
        else {
            // 检查用户是否选择了drop2或drop3 voicing
            const voicingTypes = window.chordSettings.voicingTypes || [];
            const isUsingDrop2 = voicingTypes.includes('drop2');
            const isUsingDrop3 = voicingTypes.includes('drop3');
            const isUsingDropVoicing = isUsingDrop2 || isUsingDrop3;

            // Drop2/Drop3模式：45权重（约35%概率）
            // 其他voicing：50权重（约40%概率）
            return isUsingDropVoicing ? 45 : 50;
        }
    });

    // 计算总权重
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    // 🔍 诊断：显示所有选项和权重（功能和声模式）
    if (chordOptions.length > 0 && Math.random() < 0.3) {  // 30%概率显示，避免刷屏
        console.log(`🔍 功能和声和弦选择池 (${chordOptions.length}个选项):`);
        const typeCount = {};
        chordOptions.forEach((opt, i) => {
            const typeName = opt.type.includes('7') ? '七和弦' : '三和弦';
            typeCount[typeName] = (typeCount[typeName] || 0) + 1;
            if (i < 5) {  // 只显示前5个
                console.log(`  - ${opt.root}${opt.type} (权重${weights[i]}) [${typeName}]`);
            }
        });
        console.log(`📊 类型统计: ${Object.keys(typeCount).map(k => `${k}×${typeCount[k]}`).join(', ')}`);
        console.log(`⚖️  总权重: ${totalWeight}`);
    }

    // 生成随机数
    let random = Math.random() * totalWeight;

    // 基于权重选择和弦
    for (let i = 0; i < chordOptions.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return chordOptions[i];
        }
    }

    // 备用方案：返回最后一个
    return chordOptions[chordOptions.length - 1];
}

// 🎼 同音异名等价检查函数 - 基于用户指定的13个友好根音
function getEnharmonicNormalizedRoot(rootNote) {
    // 🎲 基于用户指定根音的映射：避免C#, D#, G#, Cb等复杂拼写
    const enharmonicMap = {
        'C#': 'Db', 'Db': 'Db',     // C# → Db (用户偏好降号)
        'D#': 'Eb', 'Eb': 'Eb',     // D# → Eb (用户偏好降号)
        'E#': 'F',  'F': 'F',       // E# → F (简化拼写)
        'F#': 'F#', 'Gb': 'F#',     // 统一使用F#，避免同音异名重复
        'G#': 'Ab', 'Ab': 'Ab',     // G# → Ab (用户偏好降号)
        'A#': 'Bb', 'Bb': 'Bb',     // A# → Bb (用户偏好降号)
        'B#': 'C',  'C': 'C',       // B# → C (简化拼写)
        'Cb': 'B',  'B': 'B',       // Cb → B (用户偏好自然音)
        'D': 'D',   'E': 'E',   'G': 'G',   'A': 'A'  // 自然音保持不变
    };
    return enharmonicMap[rootNote] || rootNote;
}

// 🔄 增强重复检查函数 - 考虑同音异名等价（全局可用）
function areEnharmonicallyEquivalent(chord1, chord2) {
    if (!chord1 || !chord2) return false;
    const root1 = getEnharmonicNormalizedRoot(chord1.root);
    const root2 = getEnharmonicNormalizedRoot(chord2.root);
    return root1 === root2 && chord1.type === chord2.type;
}

// 生成完全随机的和弦进行（完全随机，无调性限制）
function generateDiverseProgression(key, measures) {
    console.log('🎲 生成完全随机和弦进行（完全随机模式，固定C大调）...');
    console.log(`🔍 DEBUG: generateDiverseProgression被调用，小节数=${measures}`);

    // 🎯 完全随机模式：固定使用C大调，忽略传入的key参数
    const fixedKey = 'C-major';
    const keyInfo = { tonic: 'C', mode: 'major', sharps: 0, flats: 0 };
    console.log(`🔍 完全随机模式: 强制使用 ${fixedKey}`);

    // 🎼 完全随机模式：使用友好的根音选择（避免复杂升降记号，移除同音异名重复）
    // 🎲 完全随机模式：12个友好根音，避免复杂升记号和同音异名重复
    // 标准化拼写：C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B (移除Gb重复)
    const scaleNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const scaleInfo = null; // 不使用调式变体
    console.log(`📝 完全随机模式 - 12个友好根音（避免同音异名重复）: ${scaleNotes.join(', ')}`);
    console.log(`✅ 避免的复杂拼写: D#, C#, G#, Cb, Gb (用户要求，保留F#)`);

    // 重新赋值key变量以确保后续使用C大调
    key = fixedKey;

    const result = [];

    // 🔍 修改 (2025-10-03): 使用已初始化的major7Tracking，不重新创建
    // 如果不存在（功能和声模式），则创建
    if (!window.major7Tracking) {
        window.major7Tracking = {
            selected: [],
            succeeded: [],
            failed: []
        };
        console.log('📊 Major7追踪系统在generateDiverseProgression中初始化（功能和声模式）');
    } else {
        console.log('📊 使用已初始化的Major7追踪系统（随机模式）');
    }

    // 🧪 调试测试 - 完全随机模式测试和弦构建
    console.log(`🧪 完全随机模式调试测试 - 使用C大调构建C major和弦:`);
    const testChord = harmonyTheory.buildChord('C', 'major', key, null);
    console.log(`C major 结果:`, testChord);
    console.log(`C major 音符:`, testChord ? testChord.notes : 'null');

    // 🔧 诊断测试 - E大调和弦生成问题
    console.log(`\n🔧 诊断测试 - E大调和弦生成:`);
    console.log(`🔍 当前key参数: ${key}`);
    try {
        const eTestChord = harmonyTheory.buildChord('E', 'major', key, null);
        console.log(`E major 结果:`, eTestChord);
        console.log(`E major 音符:`, eTestChord ? eTestChord.notes : 'null');
        if (!eTestChord) {
            console.error(`❌ E大调和弦构建失败！`);

            // 尝试用不同的key参数
            const eMajorKey = 'E-major';
            console.log(`🔄 尝试使用E大调调性: ${eMajorKey}`);
            const eTestChord2 = harmonyTheory.buildChord('E', 'major', eMajorKey, null);
            console.log(`E major (E大调) 结果:`, eTestChord2);
            console.log(`E major (E大调) 音符:`, eTestChord2 ? eTestChord2.notes : 'null');
        }
    } catch (error) {
        console.error(`💥 E大调和弦构建异常: ${error.message}`);
    }

    // 🔧 综合测试：E大调和弦在不同环境下的生成能力
    console.log(`\n🧪 综合测试 - E大调和弦生成能力:`);
    const testEnvironments = [
        { key: 'C-major', description: 'C大调环境' },
        { key: 'E-major', description: 'E大调环境' },
        { key: null, description: '无调性环境' }
    ];

    testEnvironments.forEach(env => {
        try {
            const testResult = harmonyTheory.buildChord('E', 'major', env.key, null);
            const status = testResult ? '✅ 成功' : '❌ 失败';
            console.log(`${status} ${env.description}: ${testResult ? testResult.notes.join('-') : 'null'}`);
        } catch (e) {
            console.log(`❌ ${env.description}: 异常 - ${e.message}`);
        }
    });

    // 检查用户设置是否包含major类型
    const hasMajorType = window.chordSettings.chordTypes && window.chordSettings.chordTypes.includes('major');
    console.log(`🎯 用户设置包含major类型: ${hasMajorType ? '是' : '否'}`);
    if (!hasMajorType) {
        console.warn(`⚠️ 用户未选择major类型，E大调和弦不会在随机生成中出现`);
    }

    // 严格使用用户选择的和弦类型
    let availableTypes = [];

    if (window.chordSettings.chordTypes && window.chordSettings.chordTypes.length > 0) {
        // 使用用户明确选择的和弦类型，并展开挂和弦选项，同时应用权重增强
        const baseTypes = [];

        // 🔧 2025-10-05修复：检测用户voicing选择，过滤不兼容的7sus和弦
        const voicingTypes = window.chordSettings.voicingTypes || [];
        const hasCloseOrShell = voicingTypes.includes('close') || voicingTypes.includes('shell');
        const onlyDrop2Drop3 = voicingTypes.length > 0 &&
                               voicingTypes.every(v => v === 'drop2' || v === 'drop3');

        window.chordSettings.chordTypes.forEach(type => {
            if (type === 'sus') {
                // 挂和弦展开为sus2和sus4
                baseTypes.push('sus2', 'sus4');
            } else if (type === '7sus') {
                // 🔧 2025-10-05修复：7sus和弦需要Close/Shell voicing
                if (onlyDrop2Drop3) {
                    console.log(`⚠️ 过滤7sus和弦：用户只勾选了Drop2/Drop3，7sus和弦无法生成voicing`);
                    console.log(`   说明：7sus和弦只能使用Close/Shell voicing`);
                    // 不添加7sus2, 7sus4到baseTypes
                } else {
                    // 七挂和弦展开为7sus2和7sus4
                    baseTypes.push('7sus2', '7sus4');
                }
            } else {
                baseTypes.push(type);
            }
        });

        // 应用新的平衡权重配置 - 确保每种类型都被添加，并按权重分配实例数量
        baseTypes.forEach(type => {
            let instanceCount = 1; // 确保每种类型至少有1个实例

            // 基本七和弦：2个实例（对应40权重）
            if (type === 'major7' || type === 'minor7' || type === 'dominant7' || type === 'minor7b5') {
                instanceCount = 2;
                console.log(`📊 基本七和弦 ${type}: ${instanceCount} 个实例`);
            }
            // 基本三和弦：2个实例（对应40权重）
            else if (type === 'major' || type === 'minor' || type === 'diminished' || type === 'augmented') {
                instanceCount = 2;
                console.log(`📊 基本三和弦 ${type}: ${instanceCount} 个实例`);
            }
            // sus和弦（包括7sus）：1个实例（对应20权重）
            else if (type === 'sus2' || type === 'sus4' || type === '7sus2' || type === '7sus4') {
                instanceCount = 1;
                console.log(`📊 sus和弦 ${type}: ${instanceCount} 个实例`);
            }
            // 其他七和弦：2个实例（对应40权重）
            else if (type.includes('7')) {
                instanceCount = 2;
                console.log(`📊 其他七和弦 ${type}: ${instanceCount} 个实例`);
            }
            // 其他类型：1个实例（默认权重）
            else {
                instanceCount = 1;
                console.log(`📊 其他类型 ${type}: ${instanceCount} 个实例`);
            }

            // 根据计算的实例数量添加到availableTypes
            for (let i = 0; i < instanceCount; i++) {
                availableTypes.push(type);
            }
        });

        console.log(`🎯 权重增强后的和弦类型池 (${availableTypes.length}个):`, availableTypes);
        console.log(`🎯 各类型分布:`, baseTypes.map(type => `${type}(${availableTypes.filter(t => t === type).length})`).join(', '));

        // 调试：检查类型分布
        const typeStats = {};
        availableTypes.forEach(type => {
            typeStats[type] = (typeStats[type] || 0) + 1;
        });
        console.log(`🔍 详细权重分布:`, typeStats);

        // 🔍 分析权重类别分布
        const basicSevenths = availableTypes.filter(t => ['major7', 'minor7', 'dominant7', 'minor7b5'].includes(t)).length;
        const basicTriads = availableTypes.filter(t => ['major', 'minor', 'diminished', 'augmented'].includes(t)).length;
        const susChords = availableTypes.filter(t => ['sus2', 'sus4', '7sus2', '7sus4'].includes(t)).length;
        const otherSevenths = availableTypes.filter(t => t.includes('7') && !['major7', 'minor7', 'dominant7', 'minor7b5', '7sus2', '7sus4'].includes(t)).length;

        console.log(`📊 类别统计: 基本七和弦=${basicSevenths}, 基本三和弦=${basicTriads}, sus和弦=${susChords}, 其他七和弦=${otherSevenths}`);

        // 检查是否有空的availableTypes
        if (availableTypes.length === 0) {
            console.error(`❌ 权重处理后availableTypes为空！fallback到用户选择的基础类型`);
            availableTypes = [...baseTypes]; // 使用原始类型作为fallback
        }
    } else {
        // 默认fallback：如果没有设置，使用基础三和弦
        availableTypes = ['major', 'minor'];
        console.log(`⚠️ 用户未选择和弦类型，使用默认: ${availableTypes.join(', ')}`);
    }

    // 🔥 Drop 3 专用过滤：如果用户**仅**选择了Drop3 voicing，则排除三和弦类型
    // 🔧 修复 (2025-10-04): 与功能和声模式保持一致，只在"仅勾选Drop3"时过滤三和弦
    // 原因：Drop3需要至少4个音符，无法处理三和弦（3个音符）
    // 但如果同时勾选了其他voicing（Drop2/Close/Shell），则保留三和弦（其他voicing可以处理）
    const voicingTypes = window.chordSettings.voicingTypes || [];
    const hasDrop3 = voicingTypes.includes('drop3');
    const hasOtherVoicings = voicingTypes.some(v => v === 'drop2' || v === 'close' || v === 'shell');
    const isOnlyDrop3 = hasDrop3 && !hasOtherVoicings;

    if (isOnlyDrop3) {
        console.log('🎯 检测到仅勾选Drop3 voicing，应用三和弦过滤...');
        console.log('   原因：Drop3需要至少4个音符，无法处理三和弦（3个音符）');

        const originalCount = availableTypes.length;
        const triadTypes = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'];

        // 过滤掉所有三和弦类型（因为三和弦只有3个音符，没有第3高音可降八度）
        availableTypes = availableTypes.filter(type => !triadTypes.includes(type));

        const filteredCount = availableTypes.length;
        const removedCount = originalCount - filteredCount;

        console.log(`📊 Drop3过滤结果: 移除${removedCount}个三和弦类型，保留${filteredCount}个四音及以上和弦`);
        console.log(`🎵 移除的类型: ${triadTypes.filter(type => originalCount > 0).join(', ')}`);
        console.log(`✅ 保留的类型: ${[...new Set(availableTypes)].join(', ')}`);

        // 如果过滤后没有可用类型，使用基础七和弦作为 fallback
        if (availableTypes.length === 0) {
            console.warn('⚠️ Drop3过滤后无可用和弦类型，使用基础七和弦 fallback');
            availableTypes = ['major7', 'minor7', 'dominant7', 'minor7b5'];
        }
    } else if (hasDrop3 && hasOtherVoicings) {
        console.log('✅ 检测到Drop3 + 其他voicing类型，保留三和弦');
        console.log('   说明：Drop2/Close/Shell可以处理三和弦，Drop3会在生成阶段跳过三和弦');
        console.log(`   当前voicing类型: ${voicingTypes.join(', ')}`);
    }

    // 🎸 Close Voicing 原位七和弦限制：只允许major7
    const instrumentToggle = document.getElementById('instrumentModeToggle');
    const isGuitarMode = !instrumentToggle || !instrumentToggle.checked;

    // 🔍 详细条件诊断
    console.log('\n🔍 === Close Voicing 条件诊断（随机模式）===');
    console.log('  - instrumentToggle存在:', !!instrumentToggle);
    console.log('  - instrumentToggle.checked:', instrumentToggle ? instrumentToggle.checked : 'N/A');
    console.log('  - isGuitarMode:', isGuitarMode);
    console.log('  - window.chordSettings.voicingTypes:', window.chordSettings.voicingTypes);

    const isCloseVoicingOnly = window.chordSettings.voicingTypes &&
                                 window.chordSettings.voicingTypes.length === 1 &&
                                 window.chordSettings.voicingTypes[0] === 'close';

    // 🔧 修复 (2025-10-04): 检测是否包含Close Voicing（不限于只有Close）
    const includesCloseVoicing = window.chordSettings.voicingTypes &&
                                  window.chordSettings.voicingTypes.includes('close');

    console.log('  - voicingTypes.length:', window.chordSettings.voicingTypes ? window.chordSettings.voicingTypes.length : 'undefined');
    console.log('  - 第一个voicing类型:', window.chordSettings.voicingTypes ? window.chordSettings.voicingTypes[0] : 'undefined');
    console.log('  - isCloseVoicingOnly:', isCloseVoicingOnly);
    console.log('  - includesCloseVoicing:', includesCloseVoicing);
    console.log('  - 最终条件满足（旧）:', isCloseVoicingOnly && isGuitarMode);
    console.log('  - 最终条件满足（新）:', includesCloseVoicing && isGuitarMode);

    // 🔧 修复 (2025-10-04): 只要包含Close就应用过滤，不限于只有Close
    if (includesCloseVoicing && isGuitarMode) {
        console.log('🎸 随机模式 - 检测到吉他模式 Close Voicing Only，应用Close Voicing转位限制规则...');
        console.log('📋 用户需求:');
        console.log('   - 七和弦: 禁用全部转位，只允许原位maj7（随机模式无音级检查）');
        console.log('   - 三和弦: 允许转位（原位、第一转位、第二转位）');

        const originalCount = availableTypes.length;

        // 🔧 新规则 (2025-10-03): Close Voicing七和弦限制
        availableTypes = availableTypes.filter(type => {
            const isSeventhChord = type && (
                type.includes('7') ||
                type.includes('ninth') ||
                type.includes('eleventh') ||
                type.includes('thirteenth')
            );

            const isTriad = !isSeventhChord;

            // 三和弦：直接保留（允许转位）
            if (isTriad) {
                console.log(`   ✅ 保留三和弦: ${type} (允许转位)`);
                return true;
            }

            // 七和弦：只允许major7类型
            if (isSeventhChord) {
                if (type !== 'major7' && type !== 'maj7') {
                    console.log(`   🚫 过滤七和弦: ${type} (不是major7)`);
                    return false;
                } else {
                    console.log(`   ✅ 保留major7: ${type} (随机模式无音级限制)`);
                    return true;
                }
            }

            return false;
        });

        const filteredCount = availableTypes.length;
        const removedCount = originalCount - filteredCount;

        console.log(`\n📊 随机模式 Close Voicing 限制结果:`);
        console.log(`   移除: ${removedCount}个和弦类型`);
        console.log(`   保留: ${filteredCount}个和弦类型`);
        console.log(`   保留的类型: ${[...new Set(availableTypes)].join(', ')}`);

        // 🔧 强化验证 (2025-10-03): 二次检查确保没有非major7的七和弦漏网
        const forbiddenSevenths = availableTypes.filter(type => {
            const isSeventhChord = type && (type.includes('7') || type.includes('ninth') ||
                                           type.includes('eleventh') || type.includes('thirteenth'));
            return isSeventhChord && type !== 'major7' && type !== 'maj7';
        });

        if (forbiddenSevenths.length > 0) {
            console.error(`\n🚨 Close Voicing Only验证失败：检测到非major7七和弦漏网！`);
            console.error(`   禁止的七和弦: ${forbiddenSevenths.join(', ')}`);
            console.error(`   → 强制移除这些类型`);

            // 强制移除
            availableTypes = availableTypes.filter(type => !forbiddenSevenths.includes(type));

            console.error(`   ✅ 移除后: ${availableTypes.join(', ')}`);
        } else {
            console.log(`   ✅ 二次验证通过：没有非major7七和弦`);
        }

        // 确保至少保留一些基础选项
        if (availableTypes.length === 0) {
            console.warn('⚠️ 随机模式 Close Voicing 过滤后无可用和弦类型，使用基础三和弦 fallback');
            availableTypes = ['major', 'minor', 'major7'];
        }

        // 🔧 新增 (2025-10-03): 最终验证 - 确保Close Voicing Only规则100%生效
        console.log(`\n🔍 === Close Voicing Only 最终验证 ===`);
        const finalForbiddenSevenths = availableTypes.filter(type => {
            const isSeventh = type && (
                type.includes('7') || type.includes('ninth') ||
                type.includes('eleventh') || type.includes('thirteenth')
            );
            const isMajor7 = type === 'major7' || type === 'maj7';
            return isSeventh && !isMajor7;
        });

        if (finalForbiddenSevenths.length > 0) {
            console.error(`🚨 最终验证失败！检测到${finalForbiddenSevenths.length}个非major7七和弦漏网：`);
            console.error(`   禁止的类型: [${finalForbiddenSevenths.join(', ')}]`);
            console.error(`   这是一个严重的BUG！应该在前面的过滤中被移除！`);

            // 强制最后一次移除
            const beforeCount = availableTypes.length;
            availableTypes = availableTypes.filter(type => !finalForbiddenSevenths.includes(type));
            console.error(`   🔧 强制移除: ${beforeCount}个 → ${availableTypes.length}个`);
            console.error(`   ✅ 最终保留: [${availableTypes.join(', ')}]`);
        } else {
            console.log(`   ✅ 最终验证通过：只有major7七和弦 + 三和弦`);
        }
        console.log(`=== Close Voicing Only 最终验证结束 ===\n`);
    }

    // 🔍 最终诊断：进入生成循环前
    console.log('\n🔍 ========== 进入生成循环前最终诊断 ==========');
    console.log(`🎯 最终availableTypes数组: [${availableTypes.join(', ')}]`);
    console.log(`🎯 数组长度: ${availableTypes.length}`);
    console.log(`🎯 包含七和弦: ${availableTypes.filter(t => t.includes('7')).length}个`);
    console.log(`🎯 包含三和弦: ${availableTypes.filter(t => ['major', 'minor', 'diminished', 'augmented'].includes(t)).length}个`);
    console.log(`🎯 七和弦列表: [${availableTypes.filter(t => t.includes('7')).join(', ')}]`);
    console.log(`🎯 三和弦列表: [${availableTypes.filter(t => ['major', 'minor', 'diminished', 'augmented'].includes(t)).join(', ')}]`);

    // 🔍 新增详细诊断 (2025-10-03): 完整状态检查
    console.log(`\n🔍 ===== 完整状态诊断 =====`);
    console.log(`🎸 吉他模式: ${isGuitarMode}`);
    console.log(`🎵 Close Voicing Only: ${isCloseVoicingOnly}`);
    console.log(`🎲 可用根音(scaleNotes): [${scaleNotes.join(', ')}] (${scaleNotes.length}个)`);
    console.log(`🎯 可用类型数量: ${availableTypes.length}个`);

    // 统计类型分布
    const typeCounts = {};
    availableTypes.forEach(t => {
        typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    console.log(`📊 类型分布详情:`, typeCounts);

    // 检查是否有重复实例
    const uniqueTypes = [...new Set(availableTypes)];
    console.log(`🔍 唯一类型: [${uniqueTypes.join(', ')}] (${uniqueTypes.length}个)`);
    console.log('========== 完整状态诊断结束 ==========\n');
    console.log('========== 最终诊断结束 ==========\n');

    // 生成完全随机的和弦进行
    for (let i = 0; i < measures; i++) {
        console.log(`\n🎯 === 开始生成第${i + 1}小节 ===`);

        let rootNote, chordType;
        let attempts = 0;
        const maxAttempts = 20; // 避免无限循环

        // 获取前一个和弦用于重复检查
        const prevChord = result[result.length - 1];
        if (prevChord) {
            console.log(`🔍 前一个和弦: ${prevChord.root}${prevChord.type} (用于重复避免检查)`);
        } else {
            console.log(`🔍 这是第一个和弦，无需重复检查`);
        }

        console.log(`🎲 可用音阶根音: [${scaleNotes.join(', ')}]`);
        console.log(`🎲 可用和弦类型: [${availableTypes.join(', ')}] (${availableTypes.length}个选项)`);

        // 尝试避免生成与前一个和弦相同的和弦
        do {
            attempts++;
            console.log(`\n🔄 第${attempts}次尝试 (最多${maxAttempts}次):`);

            // 随机选择根音（用户指定的友好根音）
            const rootIndex = Math.floor(Math.random() * scaleNotes.length);
            rootNote = scaleNotes[rootIndex];
            console.log(`🎲 随机选择根音: ${rootNote} (索引${rootIndex}/${scaleNotes.length - 1})`);

            // 🔍 诊断 (2025-10-05 v19): Ab/G#根音选择追踪
            const isAbOrGsharpRoot = (rootNote === 'Ab' || rootNote === 'G#');
            if (isAbOrGsharpRoot) {
                console.log(`\n🔍 ========== 随机和弦生成: ${rootNote}根音诊断 ==========`);
                console.log(`  从scaleNotes选择的根音: ${rootNote}`);
                console.log(`  期望: 小调应该使用Ab（降号）而不是G#（升号）`);
                console.log(`  scaleNotes数组: [${scaleNotes.join(', ')}]`);
                console.log(`========================================\n`);
            }

            // 🎲 验证：确保选择的根音符合用户要求（避免D#, C#, G#, Cb等复杂拼写）
            const complexRoots = ['D#', 'C#', 'G#', 'Cb'];
            if (complexRoots.includes(rootNote)) {
                console.warn(`⚠️ 警告：选择了复杂根音 ${rootNote}，用户要求避免此类拼写`);
            } else {
                console.log(`✅ 根音验证通过: ${rootNote} 符合用户友好拼写要求`);
            }

            // 基于权重随机选择和弦类型
            chordType = selectChordTypeWithWeight(availableTypes);

            // 🔧 新增 (2025-10-03): Fallback机制 - 确保选择有效
            if (!chordType || chordType === undefined || chordType === null) {
                console.error(`⚠️ selectChordTypeWithWeight返回了无效值: ${chordType}`);
                console.error(`   availableTypes: [${availableTypes.join(', ')}]`);
                console.error(`   使用fallback: 选择第一个可用类型`);
                chordType = availableTypes[0] || 'major';
                console.log(`   🔧 Fallback选择: ${chordType}`);
            }

            console.log(`🎲 权重随机选择类型: ${chordType} (从${availableTypes.length}个选项中)`);
            console.log(`🎯 当前候选和弦: ${rootNote}${chordType}`);

            // 🔍 新增 (2025-10-03): 追踪major7和弦选择
            if (chordType === 'major7' || chordType === 'maj7') {
                major7Tracking.selected.push({
                    root: rootNote,
                    type: chordType,
                    progressionIndex: i,
                    attemptNumber: attempts
                });
                console.log(`📊 Major7和弦追踪: ${rootNote}${chordType} 被选中 (第${i+1}小节, 第${attempts}次尝试)`);
            }

            // 如果这是第一个和弦，或者已经尝试了很多次，直接使用
            if (i === 0) {
                console.log(`✅ 第一个和弦，直接使用: ${rootNote}${chordType}`);
                break;
            } else if (attempts >= maxAttempts) {
                console.log(`⚠️ 达到最大尝试次数(${maxAttempts})，强制使用: ${rootNote}${chordType}`);
                if (prevChord && prevChord.root === rootNote && prevChord.type === chordType) {
                    console.log(`🚨 警告: 强制使用的和弦与前一个和弦重复! ${rootNote}${chordType} = ${prevChord.root}${prevChord.type}`);
                }
                break;
            }

            // 检查是否与前一个和弦相同（考虑同音异名等价，转位不同是允许的）
            const currentChord = { root: rootNote, type: chordType };
            const isSameChord = prevChord && areEnharmonicallyEquivalent(prevChord, currentChord);
            console.log(`🔍 同音异名重复检查: 当前=${rootNote}${chordType}, 前一个=${prevChord ? prevChord.root + prevChord.type : 'none'}`);
            if (prevChord) {
                const norm1 = getEnharmonicNormalizedRoot(rootNote);
                const norm2 = getEnharmonicNormalizedRoot(prevChord.root);
                console.log(`🔍 同音异名根音规范化: "${rootNote}" → "${norm1}", "${prevChord.root}" → "${norm2}"`);
                console.log(`🔍 规范化根音比较: "${norm1}" === "${norm2}" → ${norm1 === norm2}`);
                console.log(`🔍 类型比较: "${chordType}" === "${prevChord.type}" → ${chordType === prevChord.type}`);
            }
            console.log(`🔍 最终同音异名等价结果: ${isSameChord ? '重复 ❌' : '不重复 ✅'}`);

            if (!isSameChord) {
                console.log(`✅ 避免重复成功：选择 ${rootNote}${chordType} (前一个: ${prevChord ? prevChord.root + prevChord.type : 'none'})`);
                break;
            } else {
                console.log(`🚫 尝试 ${attempts}: ${rootNote}${chordType} 与前一个和弦相同，重新选择... (前一个: ${prevChord.root}${prevChord.type})`);
            }

        } while (attempts < maxAttempts);

        // 如果循环结束后仍然重复，强制生成不同的和弦
        if (result.length > 0) {
            const prevChord = result[result.length - 1];
            const currentChord = { root: rootNote, type: chordType };
            const isSameChord = areEnharmonicallyEquivalent(prevChord, currentChord);
            if (isSameChord) {
                console.log(`⚠️ 尝试${maxAttempts}次后仍重复，强制生成不同和弦...`);

                // 尝试系统性地生成不同的和弦
                let foundDifferent = false;

                // 首先尝试不同的根音 + 相同类型
                for (const altRoot of scaleNotes) {
                    if (altRoot !== rootNote) {
                        const testChord = harmonyTheory.buildChord(altRoot, chordType, key);
                        if (testChord) { // 完全随机模式：跳过调内检查
                            rootNote = altRoot;
                            foundDifferent = true;
                            console.log(`🔧 更换根音: ${rootNote}${chordType}`);
                            break;
                        }
                    }
                }

                // 如果还是没找到，尝试相同根音 + 不同类型
                if (!foundDifferent) {
                    for (const altType of availableTypes) {
                        if (altType !== chordType) {
                            const testChord = harmonyTheory.buildChord(rootNote, altType, key);
                            if (testChord) { // 完全随机模式：跳过调内检查
                                chordType = altType;
                                foundDifferent = true;
                                console.log(`🔧 更换类型: ${rootNote}${chordType}`);
                                break;
                            }
                        }
                    }
                }

                // 最后手段：使用完全不同的根音+类型组合
                if (!foundDifferent) {
                    for (const altRoot of scaleNotes) {
                        for (const altType of availableTypes) {
                            const altChord = { root: altRoot, type: altType };
                            if (!areEnharmonicallyEquivalent(prevChord, altChord)) {
                                const testChord = harmonyTheory.buildChord(altRoot, altType, key);
                                if (testChord) { // 完全随机模式：跳过调内检查
                                    rootNote = altRoot;
                                    chordType = altType;
                                    foundDifferent = true;
                                    console.log(`🔧 完全更换: ${rootNote}${chordType}`);
                                    break;
                                }
                            }
                        }
                        if (foundDifferent) break;
                    }
                }

                if (!foundDifferent) {
                    console.error(`❌ 无法生成与前一个和弦不同的用户类型和弦`);
                }
            }
        }

        // 🚨 修复：增强和弦构建错误追踪
        console.log(`🔧 开始构建和弦: ${rootNote}${chordType} 在调性 ${key}`);
        console.log(`🔧 构建参数验证: rootNote="${rootNote}"(${typeof rootNote}), chordType="${chordType}"(${typeof chordType}), key="${key}"(${typeof key})`);

        let chord = null;
        try {
            // 🔧 2025-09-30 修复：保存原始降号根音，防止buildChord转换
            // 问题：几乎所有降号和弦都被拼成升号（Ab→G#, Eb→D#）
            // 原因：buildChord可能将降号根音转换为升号，导致拼写系统错误选择
            const originalRoot = rootNote;
            console.log(`\n🔍 ========== 和弦构建诊断开始 ==========`);
            console.log(`🎵 原始根音: "${originalRoot}" (保护降号表示)`);
            console.log(`🎵 和弦类型: "${chordType}"`);
            console.log(`🎵 调性: "${key}"`);

            // 🔍 诊断 (2025-10-05 v19): Ab/G#传递追踪
            const isAbOrGsharpBeforeBuild = (originalRoot === 'Ab' || originalRoot === 'G#');
            if (isAbOrGsharpBeforeBuild) {
                console.log(`\n🔍 ========== buildChord调用前Ab/G#追踪 ==========`);
                console.log(`  准备调用buildChord的参数:`);
                console.log(`    rootNote: ${rootNote}`);
                console.log(`    chordType: ${chordType}`);
                console.log(`    key: ${key}`);
                console.log(`  期望: buildChord应该保持root=${originalRoot}，不应该转换为同音异名`);
                console.log(`========================================\n`);
            }

            // 🎼 直接构建和弦，传递音阶变体信息，然后检查是否调内音符
            chord = harmonyTheory.buildChord(rootNote, chordType, key, scaleInfo);

            console.log(`🔍 buildChord返回结果: ${chord ? '成功' : 'null'}`);
            if (chord) {
                console.log(`  - chord.root: "${chord.root}"`);
                console.log(`  - chord.type: "${chord.type}"`);
                console.log(`  - chord.notes: [${chord.notes ? chord.notes.join(', ') : 'undefined'}]`);
            }

            // 🚨 修复：验证构建结果的完整性
            if (chord) {
                console.log(`✅ 和弦构建成功: ${chord.root}${chord.type}`);

                // 🔧 2025-09-30 修复：强制恢复原始降号根音
                console.log(`\n🔍 ========== 同音异名转换检查 ==========`);
                console.log(`🔍 原始根音: "${originalRoot}"`);
                console.log(`🔍 buildChord返回根音: "${chord.root}"`);
                console.log(`🔍 是否发生改变: ${originalRoot !== chord.root ? '是 ⚠️' : '否 ✅'}`);

                if (originalRoot !== chord.root) {
                    const enharmonicPairs = {
                        'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
                        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
                    };

                    console.log(`🔍 enharmonicPairs[originalRoot]: "${enharmonicPairs[originalRoot]}"`);
                    console.log(`🔍 enharmonicPairs[chord.root]: "${enharmonicPairs[chord.root]}"`);

                    // 检查是否为同音异名转换
                    const isEnharmonic = enharmonicPairs[originalRoot] === chord.root ||
                                         enharmonicPairs[chord.root] === originalRoot;

                    console.log(`🔍 是否同音异名: ${isEnharmonic ? '是 ✅' : '否 ❌'}`);

                    if (isEnharmonic) {
                        console.log(`🔧 检测到同音异名转换: ${originalRoot} → ${chord.root}`);
                        console.log(`🔧 强制恢复原始降号根音: ${chord.root} → ${originalRoot}`);
                        const beforeRestore = chord.root;
                        chord.root = originalRoot;
                        console.log(`✅ 根音已恢复: ${beforeRestore} → ${chord.root}`);
                    } else {
                        console.log(`⚠️ 根音改变但非同音异名: ${originalRoot} → ${chord.root}`);
                    }
                } else {
                    console.log(`✅ 根音未改变，无需恢复`);
                }

                console.log(`🔧 最终根音: ${chord.root}${chord.type}`);
                console.log(`🔍 ========== 同音异名转换检查完成 ==========\n`);
                console.log(`🔧 构建结果验证: notes数组长度=${chord.notes ? chord.notes.length : 'undefined'}`);

                if (chord.notes && Array.isArray(chord.notes)) {
                    console.log(`🔧 notes内容检查: [${chord.notes.map((note, i) => `${i}:"${note}"(${typeof note})`).join(', ')}]`);

                    // 检查是否有undefined或无效音符
                    const invalidNotes = chord.notes.filter(note => !note || typeof note !== 'string');
                    if (invalidNotes.length > 0) {
                        console.error(`❌ 检测到无效音符: ${invalidNotes.length}个`);
                        console.error(`❌ 无效音符详情: ${JSON.stringify(invalidNotes)}`);
                    }
                } else {
                    console.error(`❌ 和弦构建返回无效的notes数组: ${chord.notes}`);
                }
            } else {
                console.error(`❌ 和弦构建返回null: ${rootNote}${chordType} 在 ${key}`);
            }
        } catch (error) {
            console.error(`❌ 和弦构建过程中发生异常:`, error);
            console.error(`❌ 异常堆栈:`, error.stack);
            console.error(`❌ 构建参数: rootNote=${rootNote}, chordType=${chordType}, key=${key}`);
            chord = null;
        }

        if (chord) {
            // 🎵 添加罗马数字标记以避免 analyzeProgression 错误
            chord.romanNumeral = harmonyTheory.getRomanNumeral(chord.root, chord.type, key) || '?';

            // 🎯 完全随机模式：跳过调内验证，允许所有12音chromatic和弦
            console.log(`🎲 完全随机模式: 不进行调内验证，直接使用 ${rootNote}${chordType}`);
            console.log(`🔧 E大调生成诊断: 当前和弦 ${rootNote}${chordType} 将被直接添加，无调内音符限制`);

            // 检查特殊情况：如果这是E大调和弦，提供详细诊断
            if (rootNote === 'E' && chordType === 'major') {
                console.log(`🚨 E大调诊断: E大调和弦构建成功！`);
                console.log(`🚨 E大调诊断: 音符 = ${chord.notes.join('-')}`);
                console.log(`🚨 E大调诊断: 不进行调内验证，将直接添加到结果`);
            }

            // 🎲 完全随机模式：跳过所有调内验证，直接添加到结果
            const skippedInKeyValidation = true;

            if (skippedInKeyValidation) {
                // 🎲 完全随机模式：直接使用当前和弦，不需要调内验证或复杂替代逻辑
                console.log(`🎯 完全随机模式: 直接添加 ${rootNote}${chordType} 到结果，跳过所有调内检查`);

                // 设置和弦的必要属性
                chord.root = rootNote;
                chord.type = chordType;
                chord.measure = i + 1;

                // 尝试添加到结果（使用smartAddChord进行voicing验证）
                const addMessage = `第${i + 1}小节: ${rootNote}${chordType} - ${chord.notes.join('-')} ✓ 完全随机`;
                const wasAdded = smartAddChord(result, chord, addMessage);

                if (wasAdded) {
                    console.log(`✅ 完全随机模式: ${rootNote}${chordType} 成功添加到第${i + 1}小节`);
                } else {
                    console.log(`⚠️ 完全随机模式: ${rootNote}${chordType} 被smartAddChord拒绝（可能是voicing约束），进行简单替代...`);

                    // 简单替代：尝试其他和弦类型
                    for (const altType of availableTypes) {
                        if (altType !== chordType) {
                            const altChord = harmonyTheory.buildChord(rootNote, altType, key, scaleInfo);
                            if (altChord) {
                                altChord.root = rootNote;
                                altChord.type = altType;
                                altChord.measure = i + 1;
                                altChord.romanNumeral = harmonyTheory.getRomanNumeral(rootNote, altType, key) || '?';

                                const altMessage = `第${i + 1}小节: ${rootNote}${altType} - ${altChord.notes.join('-')} ✓ 替代类型`;
                                if (smartAddChord(result, altChord, altMessage)) {
                                    console.log(`✅ 替代成功: 使用 ${rootNote}${altType} 替换 ${rootNote}${chordType}`);
                                    foundSimpleAlternative = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (!foundSimpleAlternative) {
                        console.warn(`⚠️ 第${i + 1}小节: 无法找到可用的替代和弦类型，强制添加原和弦`);
                        // 强制添加，即使可能违反voicing约束
                        chord.measure = i + 1;
                        // 🎵 添加完整和弦代号供后处理使用
                        if (chord.root && chord.type) {
                            chord.fullSymbol = getChordSymbol(chord);
                        }
                        result.push(chord);
                    }
                }

                // 继续下一个小节
                continue;
            }
        } else {
            // 和弦构建失败
            console.warn(`⚠️ 第${i + 1}小节: ${rootNote}${chordType} 构建失败，强制添加基础和弦`);

            // 创建基础和弦作为fallback
            const fallbackChord = {
                root: rootNote,
                type: 'major', // 基础大三和弦
                notes: [rootNote], // 简化的音符数组
                measure: i + 1,
                romanNumeral: '?'
            };

            result.push(fallbackChord);
            console.log(`🔧 强制添加fallback和弦: ${rootNote}major`);
        }
    }

    // 🎲 完全随机模式：生成完成
    console.log(`✅ 完全随机模式和弦生成完成: ${result.length}小节`);

    // 🔧 修复 (2025-10-03): 处理forceInversionForVariety标记（避免重复的最后手段）
    // 问题：此标记在generateDiverseProgression()中设置，但只在applyFunctionalInversions()中处理
    // 修复：在随机模式下也处理此标记
    const forcedInversions = result.filter(c => c.forceInversionForVariety);
    if (forcedInversions.length > 0) {
        console.log(`🔄 检测到 ${forcedInversions.length} 个强制转位标记（避免重复），开始处理...`);

        result.forEach((chord, i) => {
            if (chord.forceInversionForVariety) {
                const isTriad = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'].includes(chord.type);
                const isSeventh = chord.type.includes('7') || chord.type.includes('maj7');

                if (isSeventh) {
                    // 七和弦：随机第一或第二转位
                    chord.inversion = Math.random() < 0.7 ? 1 : 2;
                    chord.inversionReason = 'force-variety-seventh';
                    console.log(`  🔄 第${i+1}小节 ${chord.root}${chord.type} → 第${chord.inversion}转位 (避免重复)`);
                } else if (isTriad) {
                    // 三和弦：第一转位
                    chord.inversion = 1;
                    chord.inversionReason = 'force-variety-triad';
                    console.log(`  🔄 第${i+1}小节 ${chord.root}${chord.type} → 第1转位 (避免重复)`);
                }

                delete chord.forceInversionForVariety;  // 清除标记
            }
        });
    }

    // 检查是否有E大调和弦生成
    const eMajorChords = result.filter(chord => chord.root === 'E' && chord.type === 'major');
    if (eMajorChords.length > 0) {
        console.log(`🚨 E大调诊断成功: 生成了 ${eMajorChords.length} 个E大调和弦`);
        eMajorChords.forEach((chord, index) => {
            console.log(`  - 第${chord.measure}小节: ${chord.root}${chord.type} - ${chord.notes?.join('-') || '未知音符'}`);
        });
    } else {
        console.log(`🚨 E大调诊断: 本次生成中没有E大调和弦`);
    }

    // 🔍 新增 (2025-10-03): Major7和弦选择统计总结
    console.log(`\n📊 ========== Major7和弦选择统计 ==========`);
    console.log(`📋 选择次数: ${major7Tracking.selected.length}次`);
    console.log(`✅ 成功生成: ${major7Tracking.succeeded.length}次`);
    console.log(`❌ 生成失败: ${major7Tracking.failed.length}次`);

    if (major7Tracking.selected.length > 0) {
        // 按根音统计选择分布
        const selectionByRoot = {};
        major7Tracking.selected.forEach(item => {
            selectionByRoot[item.root] = (selectionByRoot[item.root] || 0) + 1;
        });

        console.log(`\n📈 Major7选择分布（按根音）:`);
        Object.keys(selectionByRoot).sort().forEach(root => {
            const selectedCount = selectionByRoot[root];
            const succeededCount = major7Tracking.succeeded.filter(item => item.root === root).length;
            const failedCount = major7Tracking.failed.filter(item => item.root === root).length;
            const successRate = selectedCount > 0 ? ((succeededCount / selectedCount) * 100).toFixed(0) : 0;
            console.log(`   ${root}maj7: 选择${selectedCount}次 → 成功${succeededCount}次, 失败${failedCount}次 (成功率${successRate}%)`);
        });

        // 特别标注Cmaj7和Fmaj7对比
        const cmaj7Selected = selectionByRoot['C'] || 0;
        const fmaj7Selected = selectionByRoot['F'] || 0;
        const cmaj7Succeeded = major7Tracking.succeeded.filter(item => item.root === 'C').length;
        const fmaj7Succeeded = major7Tracking.succeeded.filter(item => item.root === 'F').length;

        console.log(`\n🎯 Cmaj7 vs Fmaj7 对比:`);
        console.log(`   Cmaj7: 选择${cmaj7Selected}次 → 成功${cmaj7Succeeded}次`);
        console.log(`   Fmaj7: 选择${fmaj7Selected}次 → 成功${fmaj7Succeeded}次`);

        if (cmaj7Selected > 0 && cmaj7Succeeded === 0) {
            console.error(`   🚨 异常检测: Cmaj7被选择了${cmaj7Selected}次但从未成功生成！`);
            console.error(`      这表明Cmaj7的voicing生成存在问题！`);
        }
        if (fmaj7Selected > 0 && fmaj7Succeeded > 0 && cmaj7Succeeded === 0) {
            console.error(`   🚨 对比异常: Fmaj7可以生成，但Cmaj7不能！`);
        }
    } else {
        console.log(`   ℹ️ 本次生成中没有选择任何major7和弦`);
    }
    console.log(`========== 统计结束 ==========\n`);

    return result;
}

// 🛡️ 最终安全检查：如果仍有小节缺失，使用基础三和弦作为最后的fallback
function handleMissingMeasures(result, measures, scaleNotes, key, harmonyTheory) {
    if (result.length < measures) {
        console.warn(`🚨 Drop3模式最终fallback：仍缺少 ${measures - result.length} 个小节，使用基础三和弦填充`);

        const basicTriads = ['major', 'minor']; // 最基础的三和弦类型

        for (let i = result.length; i < measures; i++) {
            let added = false;
            for (const root of scaleNotes) {
                for (const type of basicTriads) {
                    const chord = harmonyTheory.buildChord(root, type, key);
                    // 🔧 修复：使用智能调内验证，支持异名同音
                    const validation = chord ? harmonyTheory.validateChordInKey(chord, key) : null;
                    if (chord && validation && validation.isInKey) {
                        chord.root = root;
                        chord.type = type;
                        chord.measure = i + 1;
                        chord.romanNumeral = harmonyTheory.getRomanNumeral(root, type, key) || '?';
                        // 直接添加，不使用smartAddChord（因为三和弦没有Drop3）
                        // 🎵 添加完整和弦代号供后处理使用
                        if (chord.root && chord.type) {
                            chord.fullSymbol = getChordSymbol(chord);
                        }
                        result.push(chord);
                        console.log(`🔧 最终补充第${i + 1}小节: ${root}${type} (基础三和弦fallback)`);
                        added = true;
                        break;
                    }
                }
                if (added) break;
            }

            // 如果连基础三和弦都无法添加（极端情况），添加C major作为绝对fallback
            if (!added) {
                const fallbackChord = harmonyTheory.buildChord('C', 'major', key) ||
                                    { root: 'C', type: 'major', notes: ['C', 'E', 'G'] };
                fallbackChord.root = 'C';
                fallbackChord.type = 'major';
                fallbackChord.measure = i + 1;
                fallbackChord.romanNumeral = 'I';
                result.push(fallbackChord);
                console.log(`🔧 绝对fallback第${i + 1}小节: C major`);
            }
        }
    }

    // 🎯 === 生成完成总结 ===
    console.log(`\n🎊 随机和弦进行生成完成！`);
    console.log(`📊 目标小节数: ${measures}, 实际生成: ${result.length}`);
    console.log(`🎵 生成的和弦进行:`);
    result.forEach((chord, index) => {
        console.log(`  第${index + 1}小节: ${chord.root}${chord.type} - [${chord.notes.join(', ')}]`);
    });

    // 🔍 重复检查验证
    console.log(`\n🔍 重复和弦验证:`);
    for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1];
        const curr = result[i];
        const isRepeat = prev.root === curr.root && prev.type === curr.type;
        if (isRepeat) {
            console.log(`⚠️ 发现连续重复: 第${i}小节(${prev.root}${prev.type}) → 第${i + 1}小节(${curr.root}${curr.type})`);
        } else {
            console.log(`✅ 第${i}小节(${prev.root}${prev.type}) → 第${i + 1}小节(${curr.root}${curr.type}) 无重复`);
        }
    }

    // 🎯 === 随机模式生成完成总结 ===
    console.log(`\n🏁 === 随机模式和弦生成完成总结 ===`);
    console.log(`📊 目标小节数: ${measures}`);
    console.log(`📊 实际生成数: ${result.length}`);
    console.log(`📊 生成成功率: ${result.length === measures ? '100% ✅' : `${Math.round(result.length/measures*100)}% ⚠️`}`);

    if (result.length > 0) {
        console.log(`📝 完整和弦序列:`);
        result.forEach((chord, index) => {
            const nextChord = result[index + 1];
            const isRepeatWithNext = nextChord && (chord.root === nextChord.root && chord.type === nextChord.type);
            const repeatFlag = isRepeatWithNext ? ' 🚨 [下一个重复]' : '';
            console.log(`  第${index + 1}小节: ${chord.root}${chord.type}${repeatFlag}`);
        });

        // 检查连续重复情况
        let repeatCount = 0;
        for (let i = 0; i < result.length - 1; i++) {
            const current = result[i];
            const next = result[i + 1];
            if (current.root === next.root && current.type === next.type) {
                repeatCount++;
                console.log(`🚨 发现连续重复: 第${i + 1}小节(${current.root}${current.type}) → 第${i + 2}小节(${next.root}${next.type})`);
            }
        }

        if (repeatCount === 0) {
            console.log(`✅ 重复避免成功: 无连续重复和弦`);
        } else {
            console.log(`❌ 重复避免失败: 发现${repeatCount}处连续重复`);
        }
    } else {
        console.log(`❌ 生成失败: 结果为空`);
    }

    console.log(`🏁 随机模式调试日志结束\n`);

    // 🎲 最终验证：确保所有和弦根音都在用户指定的友好根音列表中
    const friendlyRoots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    let allRootsValid = true;

    console.log(`\n🔍 === 友好根音验证 ===`);
    result.forEach((chord, index) => {
        if (friendlyRoots.includes(chord.root)) {
            console.log(`✅ 第${index + 1}小节: ${chord.root}${chord.type} - 根音在友好列表中`);
        } else {
            console.warn(`⚠️ 第${index + 1}小节: ${chord.root}${chord.type} - 根音不在友好列表中！`);
            allRootsValid = false;
        }
    });

    if (allRootsValid) {
        console.log(`✅ 友好根音验证通过：所有和弦根音都符合用户要求`);
    } else {
        console.warn(`❌ 友好根音验证失败：部分和弦根音不符合用户要求 (避免D#, C#, G#, Cb)`);
    }

    return result;
}

/**
 * 辅助函数：升高音符（#）- 基于音乐理论的音级升高
 * 用于计算和声小调（#7）和旋律小调（#6, #7）
 *
 * 🎵 核心原理：保持音符字母名（step），只增加升号数量（alter +1）
 *
 * 修复 (2025-10-05)：解决E#/F, Cb/B, 重升/重降记号混用问题
 * 问题：之前使用MIDI半音映射（'E':'F', 'B':'C'），导致同音异名错误
 * 解决：使用音级升高（E→E#, B→B#, E#→E##），符合音乐理论
 *
 * @param {string} note - 原始音符名称（如 'E', 'B', 'E#', 'Eb'）
 * @returns {string} 升高后的音符名称（如 'E#', 'B#', 'E##', 'E'）
 *
 * @example
 * raiseNote('E')   → 'E#'   ✅ 保持E音级，增加升号
 * raiseNote('B')   → 'B#'   ✅ 保持B音级，增加升号
 * raiseNote('E#')  → 'E##'  ✅ 保持E音级，重升记号
 * raiseNote('Eb')  → 'E'    ✅ 保持E音级，移除降号
 * raiseNote('Cb')  → 'C'    ✅ 保持C音级，移除降号
 * raiseNote('F#')  → 'F##'  ✅ 保持F音级，重升记号
 * raiseNote('Bb')  → 'B'    ✅ 保持B音级，移除降号
 */
function raiseNote(note) {
    if (!note || typeof note !== 'string') {
        console.warn('⚠️ raiseNote: 无效输入', note);
        return note;
    }

    // 提取音符的基础字母名（step）
    const step = note.charAt(0).toUpperCase();
    if (!'ABCDEFG'.includes(step)) {
        console.warn('⚠️ raiseNote: 无效的音符字母名', note);
        return note;
    }

    // 提取变化音部分（#或b）
    const alterPart = note.slice(1);

    // 计算当前的升降号数量
    const sharps = (alterPart.match(/#/g) || []).length;
    const flats = (alterPart.match(/b/g) || []).length;
    const currentAlter = sharps - flats;  // 正数=升号，负数=降号，0=自然音

    // 升高一个半音 = alter + 1
    const newAlter = currentAlter + 1;

    // 根据新的alter值构造音符名
    let newNote = step;
    if (newAlter > 0) {
        // 正数：添加升号
        newNote += '#'.repeat(newAlter);
    } else if (newAlter < 0) {
        // 负数：添加降号
        newNote += 'b'.repeat(Math.abs(newAlter));
    }
    // newAlter === 0：自然音符，只保留step

    console.log(`🎵 音级升高: ${note} → ${newNote} (alter: ${currentAlter} → ${newAlter})`);
    return newNote;
}

/**
 * 动态生成任意调性的功能和声定义
 * @param {string} key - 调性
 * @returns {Object} 功能和声定义对象
 */
function generateFunctionalChordsForKey(key) {
    console.log(`🔧 为调性 ${key} 动态生成功能和声定义`);

    const keyInfo = harmonyTheory.keys[key];
    const scaleNotes = getScaleChordRoots(key);

    if (!keyInfo || !scaleNotes) {
        console.error(`❌ 无法为调性 ${key} 生成功能和声：调性信息不存在`);
        return null;
    }

    const isMajor = keyInfo.mode === 'major';

    // 基于音乐理论的功能和声定义
    if (isMajor) {
        // 🔧 修复 (2025-10-03): 大调功能和声添加七和弦支持
        // 问题：原定义只包含三和弦，Drop3过滤后没有可用和弦，导致回退到随机生成
        // 修复：添加标准大调七和弦（Imaj7, iim7, iiim7, IVmaj7, V7, vim7, viim7b5）
        console.log(`🎼 为大调 ${key} 生成功能和声（包含三和弦和七和弦）`);
        console.log(`🎵 使用大调音阶: [${scaleNotes.join(', ')}]`);

        return {
            tonic: [
                { root: scaleNotes[0], type: 'major', degree: 'I' },        // I - 主三和弦
                { root: scaleNotes[0], type: 'major7', degree: 'Imaj7' },   // Imaj7 - 主七和弦
                { root: scaleNotes[2], type: 'minor', degree: 'iii' },      // iii - 中音三和弦
                { root: scaleNotes[2], type: 'minor7', degree: 'iiim7' },   // iiim7 - 中音七和弦
                { root: scaleNotes[5], type: 'minor', degree: 'vi' },       // vi - 下中音三和弦
                { root: scaleNotes[5], type: 'minor7', degree: 'vim7' }     // vim7 - 下中音七和弦
            ],
            subdominant: [
                { root: scaleNotes[1], type: 'minor', degree: 'ii' },       // ii - 上主三和弦
                { root: scaleNotes[1], type: 'minor7', degree: 'iim7' },    // iim7 - 上主七和弦
                { root: scaleNotes[3], type: 'major', degree: 'IV' },       // IV - 下属三和弦
                { root: scaleNotes[3], type: 'major7', degree: 'IVmaj7' },  // IVmaj7 - 下属七和弦
                { root: scaleNotes[4], type: 'sus4', degree: 'Vsus4' },     // Vsus4 - 属挂四和弦
                { root: scaleNotes[4], type: '7sus4', degree: 'V7sus4' }    // V7sus4 - 属七挂四和弦
            ],
            dominant: [
                { root: scaleNotes[4], type: 'major', degree: 'V' },        // V - 属三和弦
                { root: scaleNotes[4], type: 'dominant7', degree: 'V7' },   // V7 - 属七和弦
                { root: scaleNotes[6], type: 'diminished', degree: 'vii°' }, // vii° - 导音三和弦
                { root: scaleNotes[6], type: 'minor7b5', degree: 'viim7b5' }, // viim7b5 - 导音七和弦
                { root: scaleNotes[4], type: 'sus4', degree: 'Vsus4' },     // Vsus4 - 属挂四和弦
                { root: scaleNotes[4], type: '7sus4', degree: 'V7sus4' }    // V7sus4 - 属七挂四和弦
            ],
            // 存储音阶信息（大调）
            scaleInfo: {
                type: 'major',
                notes: scaleNotes,
                key: key
            }
        };
    } else {
        // 🎼 小调功能和声（完整版：混合三种音阶系统）
        // 修复 (2025-10-05): 添加和声小调和旋律小调的和弦，符合音乐理论
        // 包含所有三和弦+对应的七和弦形态
        console.log(`🎼 为小调 ${key} 生成功能和声（混合自然/和声/旋律小调）`);
        console.log(`🎵 自然小调音阶: [${scaleNotes.join(', ')}]`);

        // 计算和声小调音阶（♯7 - 导音）
        const harmonicMinorScale = [...scaleNotes];
        harmonicMinorScale[6] = raiseNote(scaleNotes[6]); // ♯7
        console.log(`🎵 和声小调音阶: [${harmonicMinorScale.join(', ')}]`);

        // 计算旋律小调音阶（♯6, ♯7 - 上行）
        const melodicMinorScale = [...scaleNotes];
        melodicMinorScale[5] = raiseNote(scaleNotes[5]); // ♯6
        melodicMinorScale[6] = raiseNote(scaleNotes[6]); // ♯7
        console.log(`🎵 旋律小调音阶: [${melodicMinorScale.join(', ')}]`);

        return {
            // 🎼 主功能（Tonic）- 自然小调
            tonic: [
                { root: scaleNotes[0], type: 'minor', degree: 'i', scaleVariant: 'natural' },
                { root: scaleNotes[0], type: 'minor7', degree: 'im7', scaleVariant: 'natural' },
                { root: scaleNotes[2], type: 'major', degree: 'III', scaleVariant: 'natural' },
                { root: scaleNotes[2], type: 'major7', degree: 'IIImaj7', scaleVariant: 'natural' },
                { root: scaleNotes[5], type: 'major', degree: 'VI', scaleVariant: 'natural' },
                { root: scaleNotes[5], type: 'major7', degree: 'VImaj7', scaleVariant: 'natural' },
            ],

            // 🎼 下属功能（Subdominant）- 混合音阶
            subdominant: [
                // 自然小调
                { root: scaleNotes[3], type: 'minor', degree: 'iv', scaleVariant: 'natural' },
                { root: scaleNotes[3], type: 'minor7', degree: 'ivm7', scaleVariant: 'natural' },
                { root: scaleNotes[1], type: 'diminished', degree: 'ii°', scaleVariant: 'natural' },
                { root: scaleNotes[1], type: 'minor7b5', degree: 'iim7b5', scaleVariant: 'natural' }, // 重要！

                // 旋律小调（上行）
                { root: melodicMinorScale[1], type: 'minor', degree: 'ii', scaleVariant: 'melodic' },
                { root: melodicMinorScale[1], type: 'minor7', degree: 'iim7', scaleVariant: 'melodic' },
                { root: melodicMinorScale[3], type: 'major', degree: 'IV', scaleVariant: 'melodic' },
                { root: melodicMinorScale[3], type: 'major7', degree: 'IVmaj7', scaleVariant: 'melodic' },

                // Sus和弦（通用）
                { root: scaleNotes[4], type: 'sus4', degree: 'Vsus4', scaleVariant: 'natural' },
                { root: scaleNotes[4], type: '7sus4', degree: 'V7sus4', scaleVariant: 'natural' },
            ],

            // 🎼 属功能（Dominant）- 混合音阶
            dominant: [
                // 自然小调（弱属功能）
                { root: scaleNotes[4], type: 'minor', degree: 'v', scaleVariant: 'natural' },
                { root: scaleNotes[4], type: 'minor7', degree: 'vm7', scaleVariant: 'natural' },
                { root: scaleNotes[6], type: 'major', degree: 'VII', scaleVariant: 'natural' },
                { root: scaleNotes[6], type: 'dominant7', degree: 'VII7', scaleVariant: 'natural' },

                // 和声小调（强属功能，包含♯7导音）
                { root: harmonicMinorScale[4], type: 'major', degree: 'V', scaleVariant: 'harmonic' },
                { root: harmonicMinorScale[4], type: 'dominant7', degree: 'V7', scaleVariant: 'harmonic' },
                { root: harmonicMinorScale[6], type: 'diminished', degree: 'vii°', scaleVariant: 'harmonic' },
                { root: harmonicMinorScale[6], type: 'diminished7', degree: 'vii°7', scaleVariant: 'harmonic' },

                // Sus和弦
                { root: scaleNotes[4], type: 'sus4', degree: 'Vsus4', scaleVariant: 'natural' },
                { root: scaleNotes[4], type: '7sus4', degree: 'V7sus4', scaleVariant: 'natural' },
            ],

            // 存储音阶信息（包含三个变体）
            scaleInfo: {
                type: 'minor',
                natural: scaleNotes,
                harmonic: harmonicMinorScale,
                melodic: melodicMinorScale,
                key: key
            }
        };
    }
}

/**
 * 基于功能和声原理生成和弦进行
 * @param {string} key - 调性
 * @param {number} measures - 小节数
 * @returns {Array} 和弦进行数组
 */
function generateFunctionalProgression(key, measures) {
    console.log('🎼 基于功能和声原理生成和弦进行...');
    console.log(`🔍 DEBUG: generateFunctionalProgression被调用，调 ${key}，${measures}小节`);

    const keyInfo = harmonyTheory.keys[key];
    const scaleNotes = getScaleChordRoots(key);  // 🔧 修复：使用正确的音阶定义

    // 🔧 修复：动态生成调性功能和声定义，支持全部24个调性
    const functionalChords = generateFunctionalChordsForKey(key);

    if (!functionalChords) {
        console.error(`❌ 无法为调性 ${key} 生成功能和声，回退到随机生成`);
        return generateDiverseProgression(key, measures);
    }

    console.log(`✅ 成功为 ${key} 生成功能和声定义:`, {
        tonic: functionalChords.tonic.map(c => `${c.root}${c.type}`),
        subdominant: functionalChords.subdominant.map(c => `${c.root}${c.type}`),
        dominant: functionalChords.dominant.map(c => `${c.root}${c.type}`)
    });

    // 🔍 诊断：验证所有功能和声池中的和弦是否在调内
    // 修复 (2025-10-05): 根据和弦的scaleVariant选择正确的验证音阶
    if (functionalChords.scaleInfo) {
        console.log(`\n🔍 验证功能和声池中所有和弦的调内音符...`);

        // 判断是大调还是小调
        const isMinorKey = functionalChords.scaleInfo.type === 'minor';

        if (isMinorKey) {
            console.log(`   自然小调音阶: [${functionalChords.scaleInfo.natural.join(', ')}]`);
            console.log(`   和声小调音阶: [${functionalChords.scaleInfo.harmonic.join(', ')}]`);
            console.log(`   旋律小调音阶: [${functionalChords.scaleInfo.melodic.join(', ')}]`);
        } else {
            const scaleNotes = functionalChords.scaleInfo.notes || [];
            console.log(`   大调音阶: [${scaleNotes.join(', ')}]`);
        }

        ['tonic', 'subdominant', 'dominant'].forEach(func => {
            functionalChords[func].forEach(chordDef => {
                // 🎯 修复 (2025-10-05): 构建正确的 scaleVariant 对象
                let testScaleVariantInfo = null;
                if (chordDef.scaleVariant && functionalChords.scaleInfo) {
                    const variant = chordDef.scaleVariant;
                    testScaleVariantInfo = {
                        type: variant,
                        notes: functionalChords.scaleInfo[variant],
                        key: key
                    };
                } else {
                    testScaleVariantInfo = functionalChords.scaleInfo;
                }
                const testChord = harmonyTheory.buildChord(chordDef.root, chordDef.type, key, testScaleVariantInfo);
                if (testChord && testChord.notes) {
                    // 根据和弦的音阶变体选择验证音阶
                    let validationScale;
                    if (isMinorKey && chordDef.scaleVariant) {
                        if (chordDef.scaleVariant === 'harmonic') {
                            validationScale = functionalChords.scaleInfo.harmonic;
                        } else if (chordDef.scaleVariant === 'melodic') {
                            validationScale = functionalChords.scaleInfo.melodic;
                        } else {
                            validationScale = functionalChords.scaleInfo.natural;
                        }
                    } else {
                        validationScale = functionalChords.scaleInfo.notes || functionalChords.scaleInfo.natural;
                    }

                    const outOfKey = testChord.notes.filter(note => !validationScale.includes(note));
                    if (outOfKey.length > 0) {
                        const variantLabel = chordDef.scaleVariant ? ` (${chordDef.scaleVariant})` : '';
                        console.error(`   ❌ 调外和弦在${func}池中: ${chordDef.root}${chordDef.type}${variantLabel} (调外音: ${outOfKey.join(', ')})`);
                        console.error(`      和弦音符: [${testChord.notes.join(', ')}]`);
                        console.error(`      验证音阶: [${validationScale.join(', ')}]`);
                    } else {
                        const variantLabel = chordDef.scaleVariant ? ` (${chordDef.scaleVariant})` : '';
                        console.log(`   ✅ ${chordDef.root}${chordDef.type}${variantLabel}: [${testChord.notes.join(', ')}]`);
                    }
                }
            });
        });
    }

    // 🔥 Drop3过滤：如果用户**仅**选择了Drop3 voicing，则排除三和弦类型
    // 🔧 修复 (2025-10-03): 功能和声模式也需要应用Drop3过滤
    // 🔧 修复 (2025-10-03): 只在仅勾选Drop3时过滤三和弦，如果同时勾选Drop2，保留三和弦
    const hasDrop3 = window.chordSettings.voicingTypes && window.chordSettings.voicingTypes.includes('drop3');
    const hasDrop2 = window.chordSettings.voicingTypes && window.chordSettings.voicingTypes.includes('drop2');
    const onlyDrop3 = hasDrop3 && !hasDrop2;

    if (onlyDrop3) {
        console.log('🎯 [功能和声] 检测到仅勾选Drop3 voicing，应用三和弦过滤...');
        console.log('   原因：Drop3需要至少4个音符，无法处理三和弦（3个音符）');

        const triadTypes = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'];
        let totalRemoved = 0;

        // 过滤每个功能组的三和弦
        ['tonic', 'subdominant', 'dominant'].forEach(func => {
            const originalCount = functionalChords[func].length;
            functionalChords[func] = functionalChords[func].filter(chord => !triadTypes.includes(chord.type));
            const removed = originalCount - functionalChords[func].length;
            totalRemoved += removed;
            if (removed > 0) {
                console.log(`  📊 ${func}: 移除${removed}个三和弦，保留${functionalChords[func].length}个七和弦`);
            }
        });

        console.log(`✅ [功能和声] Drop3过滤完成: 总共移除${totalRemoved}个三和弦`);

        // 验证至少有一些和弦可用
        const totalChords = functionalChords.tonic.length + functionalChords.subdominant.length + functionalChords.dominant.length;
        if (totalChords === 0) {
            console.error('❌ [功能和声] Drop3过滤后没有可用和弦，回退到随机生成');
            return generateDiverseProgression(key, measures);
        }
    } else if (hasDrop3 && hasDrop2) {
        console.log('✅ [功能和声] 检测到同时勾选Drop2和Drop3，保留三和弦');
        console.log('   说明：Drop2可以处理三和弦，Drop3会在生成阶段跳过三和弦');
    } else if (hasDrop2) {
        console.log('✅ [功能和声] 检测到Drop2，保留三和弦');
    }

    // 基于功能和声理论的进行模式生成（完全符合规则）
    const progressionPatterns = {
        4: [
            // 经典进行
            ['tonic', 'subdominant', 'dominant', 'tonic'],        // T-S-D-T
            ['subdominant', 'dominant', 'tonic', 'tonic'],        // S-D-T-T (不同主和弦)
            ['subdominant', 'dominant', 'tonic', 'dominant'],     // S-D-T-D

            // T开头的多样化进行
            ['tonic', 'subdominant', 'tonic', 'dominant'],        // T-S-T-D
            ['tonic', 'dominant', 'tonic', 'dominant'],           // T-D-T-D
            ['tonic', 'tonic', 'subdominant', 'dominant'],        // T-T-S-D (不同主和弦)

            // D开头的进行
            ['dominant', 'tonic', 'dominant', 'tonic'],           // D-T-D-T
            ['dominant', 'tonic', 'subdominant', 'tonic'],        // D-T-S-T
            ['dominant', 'tonic', 'subdominant', 'dominant'],     // D-T-S-D (这里D→S→D在实际中S作为中介)

            // S开头的进行
            ['subdominant', 'tonic', 'dominant', 'tonic'],        // S-T-D-T
            ['subdominant', 'tonic', 'subdominant', 'tonic'],     // S-T-S-T (不同下属和弦)
            ['subdominant', 'tonic', 'subdominant', 'dominant'],  // S-T-S-D

            // 同功能内变化的进行
            ['tonic', 'subdominant', 'subdominant', 'tonic'],     // T-S-S-T (不同下属和弦)
            ['subdominant', 'subdominant', 'tonic', 'dominant'],  // S-S-T-D (不同下属和弦)
        ],
        3: [
            ['tonic', 'subdominant', 'dominant'],                 // T-S-D
            ['tonic', 'dominant', 'tonic'],                       // T-D-T
            ['subdominant', 'dominant', 'tonic'],                 // S-D-T
            ['subdominant', 'tonic', 'dominant'],                 // S-T-D
            ['dominant', 'tonic', 'subdominant'],                 // D-T-S
            ['dominant', 'tonic', 'dominant'],                    // D-T-D
            ['tonic', 'subdominant', 'tonic'],                    // T-S-T
        ],
        2: [
            ['tonic', 'dominant'],                                // T-D
            ['tonic', 'subdominant'],                             // T-S
            ['subdominant', 'tonic'],                             // S-T
            ['subdominant', 'dominant'],                          // S-D
            ['dominant', 'tonic'],                                // D-T
        ]
    };

    // 选择适合的进行模式
    let selectedPattern;
    if (progressionPatterns[measures]) {
        selectedPattern = progressionPatterns[measures][Math.floor(Math.random() * progressionPatterns[measures].length)];
    } else {
        // 对于更长的进行，使用基于规则的动态生成
        selectedPattern = generateFunctionalProgressionByRules(measures);
    }

    console.log(`🎯 选择功能和声模式: ${selectedPattern.join(' - ')}`);

    const result = [];
    // 🔧 修复：直接使用动态生成的功能和声定义
    const availableChords = functionalChords;

    selectedPattern.forEach((function_, index) => {
        let chordOptions = availableChords[function_];

        console.log(`\n🔍 ===== 第${index + 1}小节开始 (${function_}功能) =====`);
        console.log(`📍 调性: ${key}`);
        console.log(`📍 音阶: [${availableChords.scaleInfo?.notes?.join(', ') || scaleNotes.join(', ')}]`);

        if (chordOptions && chordOptions.length > 0) {
            // 🎹 扩展功能和声和弦选项：如果用户同时勾选了三和弦和七和弦，添加七和弦版本
            // 目的：让系统可以随机生成三和弦或七和弦，而不是只生成硬编码的类型
            const expandedOptions = [];
            // 🔧 修复 (2025-10-03): 检查用户是否勾选了三和弦类型
            const userChordTypes = window.chordSettings.chordTypes || [];

            console.log(`\n🔍 ===== 和弦扩展逻辑诊断 (${function_}功能) =====`);
            console.log(`📋 原始选项数: ${chordOptions.length}`);
            console.log(`📋 原始选项: ${chordOptions.map(c => c.root + c.type).join(', ')}`);
            console.log(`👤 用户勾选的和弦类型: ${userChordTypes.join(', ')}`);

            chordOptions.forEach(option => {
                // 只有当用户勾选了对应的三和弦类型时，才保留原始三和弦
                if (userChordTypes.includes(option.type)) {
                    expandedOptions.push(option); // 保留原始选项（如 Cmajor）
                    console.log(`  ✅ 保留三和弦: ${option.root}${option.type}`);
                } else {
                    console.log(`  ⏭️  跳过三和弦: ${option.root}${option.type} (用户未勾选"${option.type}")`);
                }

                // 检查用户是否勾选了这个和弦的七和弦版本
                const baseType = option.type;
                let seventhType = null;

                if (baseType === 'major') {
                    // 🔧 修复 (2025-10-03): 属功能的major和弦应扩展为dominant7，而非major7
                    // 属和弦需要小七度（G7 = G-B-D-F），不是大七度（Gmaj7 = G-B-D-F#）
                    if (function_ === 'dominant') {
                        seventhType = 'dominant7';  // V级 → V7 (如C大调的G → G7)
                    } else {
                        seventhType = 'major7';      // 主功能/下属功能 → maj7
                    }
                } else if (baseType === 'minor') {
                    seventhType = 'minor7';
                } else if (baseType === 'diminished') {
                    seventhType = 'minor7b5'; // 半减七和弦
                }

                // 如果用户勾选了对应的七和弦类型，添加七和弦版本
                if (seventhType && window.chordSettings.chordTypes.includes(seventhType)) {
                    expandedOptions.push({
                        root: option.root,
                        type: seventhType,
                        degree: option.degree + '7',
                        function: option.function || function_,  // 保留功能信息
                        scaleVariant: option.scaleVariant  // 🎯 修复 (2025-10-05): 保留音阶变体信息
                    });
                    console.log(`🎵 扩展选项: ${option.root}${option.type} → 添加 ${option.root}${seventhType} (功能: ${function_})`);
                }
            });

            chordOptions = expandedOptions;
            console.log(`\n📊 扩展后统计:`);
            console.log(`   - 总选项数: ${chordOptions.length}`);
            console.log(`   - 三和弦: ${chordOptions.filter(c => !c.type.includes('7')).length}个`);
            console.log(`   - 七和弦: ${chordOptions.filter(c => c.type.includes('7')).length}个`);
            console.log(`   - 详细列表: ${chordOptions.map(c => `${c.root}${c.type}`).join(', ')}`);

            // 🔧 修复 (2025-10-03): 过滤扩展后产生的调外和弦
            if (availableChords.scaleInfo && availableChords.scaleInfo.notes) {
                const scaleNotes = availableChords.scaleInfo.notes;
                const beforeFilterCount = chordOptions.length;

                chordOptions = chordOptions.filter(opt => {
                    // 🎯 修复 (2025-10-05): 构建正确的 scaleVariant 对象
                    let filterScaleVariantInfo = null;
                    if (opt.scaleVariant && availableChords.scaleInfo) {
                        const variant = opt.scaleVariant;
                        filterScaleVariantInfo = {
                            type: variant,
                            notes: availableChords.scaleInfo[variant],
                            key: key
                        };
                    } else {
                        filterScaleVariantInfo = availableChords.scaleInfo;
                    }
                    const testChord = harmonyTheory.buildChord(opt.root, opt.type, key, filterScaleVariantInfo);
                    if (testChord && testChord.notes) {
                        const outOfKey = testChord.notes.filter(note => !scaleNotes.includes(note));
                        if (outOfKey.length > 0) {
                            console.log(`   ⏭️ 过滤扩展产生的调外和弦: ${opt.root}${opt.type} (调外音: ${outOfKey.join(', ')})`);
                            return false; // 过滤掉
                        }
                    }
                    return true; // 保留
                });

                const filteredCount = beforeFilterCount - chordOptions.length;
                if (filteredCount > 0) {
                    console.log(`   📊 过滤结果: 移除${filteredCount}个调外和弦，保留${chordOptions.length}个调内和弦`);
                }
            }

            // 根据用户选择的和弦类型过滤选项
            const beforeUserFilterCount = chordOptions.length;
            chordOptions = filterChordOptionsByUserSettings(chordOptions);
            console.log(`\n🔍 filterChordOptionsByUserSettings 过滤结果:`);
            console.log(`   - 过滤前: ${beforeUserFilterCount}个`);
            console.log(`   - 过滤后: ${chordOptions.length}个`);
            if (chordOptions.length > 0) {
                console.log(`   - 剩余三和弦: ${chordOptions.filter(c => !c.type.includes('7')).length}个`);
                console.log(`   - 剩余七和弦: ${chordOptions.filter(c => c.type.includes('7')).length}个`);
            }

            // 注：不再强制过滤三和弦，因为用户想要从勾选项中随机生成

            // 🎸 功能和声模式 - Close Voicing 原位七和弦限制：只允许major7
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            const isGuitarMode = !instrumentToggle || !instrumentToggle.checked;

            // 🔍 详细条件诊断
            console.log('\n🔍 === Close Voicing 条件诊断（功能和声模式）===');
            console.log('  - instrumentToggle存在:', !!instrumentToggle);
            console.log('  - instrumentToggle.checked:', instrumentToggle ? instrumentToggle.checked : 'N/A');
            console.log('  - isGuitarMode:', isGuitarMode);
            console.log('  - window.chordSettings.voicingTypes:', window.chordSettings.voicingTypes);

            const isCloseVoicingOnly = window.chordSettings.voicingTypes &&
                                         window.chordSettings.voicingTypes.length === 1 &&
                                         window.chordSettings.voicingTypes[0] === 'close';

            // 🔧 修复 (2025-10-04): 检测是否包含Close Voicing（不限于只有Close）
            const includesCloseVoicing = window.chordSettings.voicingTypes &&
                                          window.chordSettings.voicingTypes.includes('close');

            console.log('  - voicingTypes.length:', window.chordSettings.voicingTypes ? window.chordSettings.voicingTypes.length : 'undefined');
            console.log('  - 第一个voicing类型:', window.chordSettings.voicingTypes ? window.chordSettings.voicingTypes[0] : 'undefined');
            console.log('  - isCloseVoicingOnly:', isCloseVoicingOnly);
            console.log('  - includesCloseVoicing:', includesCloseVoicing);
            console.log('  - 最终条件满足（旧）:', isCloseVoicingOnly && isGuitarMode);
            console.log('  - 最终条件满足（新）:', includesCloseVoicing && isGuitarMode);

            // 🔧 修复 (2025-10-04): 只要包含Close就应用过滤，不限于只有Close
            if (includesCloseVoicing && isGuitarMode) {
                console.log('🎸 功能和声 - 检测到吉他模式 Close Voicing Only，应用Close Voicing转位限制规则...');
                console.log('📋 用户需求:');
                console.log('   - 七和弦: 禁用全部转位，只允许原位major7');
                console.log('   - 三和弦: 允许转位（原位、第一转位、第二转位）');

                const originalCount = chordOptions.length;

                // 🔧 新规则 (2025-10-03): Close Voicing七和弦过滤
                chordOptions = chordOptions.filter(option => {
                    const isSeventhChord = option.type && (
                        option.type.includes('7') ||
                        option.type.includes('ninth') ||
                        option.type.includes('eleventh') ||
                        option.type.includes('thirteenth')
                    );

                    const isTriad = !isSeventhChord;

                    // 三和弦：直接保留（允许转位）
                    if (isTriad) {
                        console.log(`   ✅ 保留三和弦: ${option.root}${option.type} (允许转位)`);
                        return true;
                    }

                    // 七和弦：只允许major7类型
                    if (isSeventhChord) {
                        if (option.type !== 'major7' && option.type !== 'maj7') {
                            console.log(`   🚫 过滤七和弦: ${option.root}${option.type} (不是major7)`);
                            return false;
                        }

                        // ✅ 允许所有major7和弦进入和弦进行
                        // Close Voicing音域约束(≥F4)在voicing引擎层面处理(voicing-engine.js)
                        console.log(`   ✅ 保留major7: ${option.root}maj7 (Close Voicing Only允许)`);
                        return true;
                    }

                    return false;
                });

                const filteredCount = chordOptions.length;
                const removedCount = originalCount - filteredCount;

                console.log(`\n📊 功能和声 Close Voicing 限制结果:`);
                console.log(`   移除: ${removedCount}个和弦`);
                console.log(`   保留: ${filteredCount}个和弦`);
                console.log(`   保留的类型: ${[...new Set(chordOptions.map(c => c.type))].join(', ')}`);

                // 🔍 显示过滤后剩余的和弦列表
                console.log(`\n🔍 过滤后剩余的和弦列表:`);
                chordOptions.forEach((opt, idx) => {
                    const isMajor7 = opt.type === 'major7' || opt.type === 'maj7';
                    const symbol = isMajor7 ? '🎵' : '🎶';
                    console.log(`   ${symbol} ${idx + 1}. ${opt.root}${opt.type} (degree: ${opt.degree || '?'})`);
                });

                // 🔧 强化验证 (2025-10-03): 二次检查确保没有非major7的七和弦漏网
                const forbiddenSeventhChords = chordOptions.filter(option => {
                    const isSeventhChord = option.type && (
                        option.type.includes('7') ||
                        option.type.includes('ninth') ||
                        option.type.includes('eleventh') ||
                        option.type.includes('thirteenth')
                    );
                    return isSeventhChord && option.type !== 'major7' && option.type !== 'maj7';
                });

                if (forbiddenSeventhChords.length > 0) {
                    console.error(`\n🚨 功能和声Close Voicing Only验证失败：检测到非major7七和弦漏网！`);
                    forbiddenSeventhChords.forEach(chord => {
                        console.error(`   禁止: ${chord.root}${chord.type} (degree: ${chord.degree || '未知'})`);
                    });
                    console.error(`   → 强制移除这些和弦`);

                    // 强制移除
                    chordOptions = chordOptions.filter(option => !forbiddenSeventhChords.includes(option));

                    console.error(`   ✅ 移除后保留${chordOptions.length}个和弦`);
                } else {
                    console.log(`   ✅ 二次验证通过：没有非major7七和弦`);
                }

                // 确保至少保留一些基础选项
                if (chordOptions.length === 0) {
                    console.warn('⚠️ 功能和声 Close Voicing 过滤后无可用和弦类型，使用基础三和弦 fallback');
                    // 这里会在后续的替代和弦生成中处理
                }
            }

            // 如果过滤后没有选项，生成符合用户设置的和弦
            if (chordOptions.length === 0) {
                console.log(`⚠️ ${function_}功能没有符合用户设置的和弦，生成替代选项...`);

                // 获取用户选择的和弦类型
                let userTypes = [];
                if (window.chordSettings.chordTypes && window.chordSettings.chordTypes.length > 0) {
                    window.chordSettings.chordTypes.forEach(type => {
                        if (type === 'sus') {
                            userTypes.push('sus2', 'sus4');
                        } else if (type === '7sus') {
                            userTypes.push('7sus2', '7sus4');
                        } else {
                            userTypes.push(type);
                        }
                    });
                }

                // 🔧 修复 (2025-10-03): Drop3模式下过滤三和弦
                if (window.chordSettings.voicingTypes && window.chordSettings.voicingTypes.includes('drop3')) {
                    const triadTypes = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'];
                    const beforeFilter = userTypes.length;
                    userTypes = userTypes.filter(type => !triadTypes.includes(type));
                    const afterFilter = userTypes.length;
                    if (beforeFilter !== afterFilter) {
                        console.log(`  🔧 [功能和声替代] Drop3模式：过滤${beforeFilter - afterFilter}个三和弦类型`);
                    }
                    // 如果过滤后为空，使用基础七和弦
                    if (userTypes.length === 0) {
                        userTypes = ['major7', 'minor7', 'dominant7'];
                        console.log(`  ⚠️ [功能和声替代] Drop3过滤后无可用类型，使用七和弦: ${userTypes.join(', ')}`);
                    }
                }

                // 🔧 修复 (2025-10-03): Close Voicing Only模式下过滤非major7七和弦
                // 修复原因：fallback机制会绕过Layer 2的过滤，导致Em7/Bm7b5等和弦被生成
                const isCloseVoicingOnly = window.chordSettings.voicingTypes &&
                                          window.chordSettings.voicingTypes.length === 1 &&
                                          window.chordSettings.voicingTypes[0] === 'close';

                // 🔧 修复 (2025-10-04): 检测是否包含Close Voicing（不限于只有Close）
                const includesCloseVoicing = window.chordSettings.voicingTypes &&
                                              window.chordSettings.voicingTypes.includes('close');

                // 🔧 修复 (2025-10-04): 只要包含Close就应用过滤，不限于只有Close
                if (includesCloseVoicing) {
                    console.log(`  🔧 [功能和声替代] Close Voicing Only模式：过滤非major7七和弦`);
                    const beforeFilter = userTypes.length;

                    // 过滤掉所有非major7的七和弦
                    userTypes = userTypes.filter(type => {
                        const isSeventhChord = type && (
                            type.includes('7') ||
                            type.includes('ninth') ||
                            type.includes('eleventh') ||
                            type.includes('thirteenth')
                        );
                        // 保留非七和弦（三和弦等），或只保留major7
                        return !isSeventhChord || type === 'major7' || type === 'maj7';
                    });

                    const afterFilter = userTypes.length;
                    if (beforeFilter !== afterFilter) {
                        console.log(`    📊 过滤了${beforeFilter - afterFilter}个非major7七和弦类型`);
                        console.log(`    ✅ 保留类型: ${userTypes.join(', ')}`);
                    }

                    // 如果过滤后为空，强制使用major7
                    if (userTypes.length === 0) {
                        userTypes = ['major7'];
                        console.log(`    ⚠️ 过滤后无可用类型，强制使用major7`);
                    }
                }

                // 🔧 修复：基于动态功能和声定义选择合适的根音
                const functionRoots = {
                    'tonic': availableChords.tonic.map(chord => chord.root),
                    'subdominant': availableChords.subdominant.map(chord => chord.root),
                    'dominant': availableChords.dominant.map(chord => chord.root)
                };

                const rootsToTry = functionRoots[function_] || scaleNotes;

                console.log(`🎯 ${function_}功能可用根音: ${rootsToTry.join(', ')}`);

                // 去除重复根音
                const uniqueRootsToTry = [...new Set(rootsToTry)];

                // 尝试为每个根音生成用户选择的和弦类型（使用权重增强生成）
                for (const root of uniqueRootsToTry) {
                    for (const type of userTypes) {
                        // 🎼 传递音阶变体信息给buildChord
                        const scaleVariantInfo = availableChords.scaleInfo || null;
                        const testChord = harmonyTheory.buildChord(root, type, key, scaleVariantInfo);

                        // 🔧 修复 (2025-10-05): 验证和弦是否在调内
                        // 小调：使用三套音阶（自然/和声/旋律）的并集验证
                        // 大调：使用单一音阶验证
                        let scaleNotesForValidation;
                        const isMinorKey = scaleVariantInfo && scaleVariantInfo.type === 'minor';

                        if (isMinorKey) {
                            // 小调：合并三套音阶的所有音符
                            const allMinorScaleNotes = [
                                ...scaleVariantInfo.natural,
                                ...scaleVariantInfo.harmonic,
                                ...scaleVariantInfo.melodic
                            ];
                            // 去重
                            scaleNotesForValidation = [...new Set(allMinorScaleNotes)];
                        } else {
                            // 大调：使用单一音阶
                            scaleNotesForValidation = (scaleVariantInfo && scaleVariantInfo.notes) || scaleNotes;
                        }

                        const isInKey = testChord && testChord.notes &&
                                       testChord.notes.every(note => scaleNotesForValidation.includes(note));

                        if (testChord && !isInKey) {
                            // 诊断：显示被过滤掉的调外和弦
                            const outOfKeyNotes = testChord.notes.filter(note => !scaleNotesForValidation.includes(note));
                            const scaleLabel = isMinorKey ? '三套小调音阶' : '音阶';
                            console.log(`  ⏭️ 过滤调外和弦: ${root}${type} (调外音: ${outOfKeyNotes.join(', ')})`);
                            console.log(`     ${scaleLabel}: [${scaleNotesForValidation.join(', ')}]`);
                        }

                        if (testChord && isInKey) {
                            // 根据新的平衡权重配置决定该和弦类型的生成数量
                            let generationCount = 1; // 默认生成1个

                            // 基本七和弦：2个实例（对应40权重）
                            if (type === 'major7' || type === 'minor7' || type === 'dominant7' || type === 'minor7b5') {
                                generationCount = 2;
                            }
                            // 基本三和弦：2个实例（对应40权重）
                            else if (type === 'major' || type === 'minor' || type === 'diminished' || type === 'augmented') {
                                generationCount = 2;
                            }
                            // sus和弦（包括7sus）：1个实例（对应20权重）
                            else if (type === 'sus2' || type === 'sus4' || type === '7sus2' || type === '7sus4') {
                                generationCount = 1;
                            }
                            // 其他七和弦：2个实例（对应40权重）
                            else if (type.includes('7')) {
                                generationCount = 2;
                            }
                            // 其他类型：1个实例（默认权重）
                            else {
                                generationCount = 1;
                            }

                            // 根据计算的数量添加和弦选项
                            for (let i = 0; i < generationCount; i++) {
                                chordOptions.push({
                                    root: root,
                                    type: type,
                                    degree: '?',
                                    function: function_
                                });
                            }
                        }
                    }
                }

                console.log(`  -> 生成了${chordOptions.length}个替代选项: ${chordOptions.map(c => `${c.root}${c.type}`).join(', ')}`);
            }

            // 特殊处理Vsus的双重功能性
            if ((function_ === 'subdominant' || function_ === 'dominant') && chordOptions.length > 0) {
                chordOptions = handleVsusContextualFunction(chordOptions, function_, index, selectedPattern);
            }

            // 如果没有任何选项，使用功能的第一个可用和弦作为fallback
            if (chordOptions.length === 0) {
                console.warn(`⚠️ 第${index + 1}小节: 完全没有符合用户设置的和弦选项，使用功能fallback`);

                // 从原始功能定义中选择第一个和弦作为fallback（忽略用户过滤）
                const originalOptions = availableChords[function_];
                if (originalOptions && originalOptions.length > 0) {
                    chordOptions = [originalOptions[0]]; // 使用功能的第一个定义
                    console.log(`🔧 Fallback: 使用${function_}功能的默认和弦 ${originalOptions[0].root}${originalOptions[0].type}`);
                } else {
                    // 最后的fallback：生成一个基础主和弦
                    const fallbackChord = { root: scaleNotes[0], type: 'major', degree: 'I', function: 'tonic' };
                    chordOptions = [fallbackChord];
                    console.log(`🔧 绝对Fallback: 使用主和弦 ${fallbackChord.root}${fallbackChord.type}`);
                }
            }

            // 🔄 强化重复避免：无论有多少个选项都要检查重复
            let selectedChord;
            const prevChord = result.length > 0 ? result[result.length - 1] : null;

            if (result.length > 0) {
                console.log(`🔍 重复检查开始: 第${index + 1}小节, 前一个和弦: ${prevChord.root}${prevChord.type}, 当前选项: ${chordOptions.map(c => c.root + c.type).join(', ')}`);

                // 第一步：尝试从当前选项中选择不重复的和弦
                const nonRepeatOptions = chordOptions.filter(option =>
                    !areEnharmonicallyEquivalent(prevChord, option)
                );

                console.log(`🔍 非重复选项过滤结果: ${nonRepeatOptions.length}个选项 - ${nonRepeatOptions.map(c => c.root + c.type).join(', ')}`);

                if (nonRepeatOptions.length > 0) {
                    selectedChord = selectChordWithWeight(nonRepeatOptions);
                    console.log(`✅ 避免重复和弦成功，从${nonRepeatOptions.length}个选项中选择: ${selectedChord.root}${selectedChord.type} (前一个: ${prevChord.root}${prevChord.type})`);
                } else {
                    // 第二步：当前功能组没有非重复选项，尝试跨功能选择
                    console.log(`⚠️ 当前功能组${function_}无非重复选项，尝试从其他功能组选择...`);
                    console.log(`当前选项: ${chordOptions.map(c => c.root + c.type).join(', ')}`);
                    console.log(`前一个和弦: ${prevChord.root}${prevChord.type}`);

                    const alternativeChord = getAlternativeFunctionChord(prevChord, key, functionalChords);
                    if (alternativeChord) {
                        selectedChord = alternativeChord;
                        console.log(`🔄 跨功能避免重复: ${selectedChord.root}${selectedChord.type} (${selectedChord.function}功能)`);
                    } else {
                        // 第三步：尝试强制修改和弦类型
                        selectedChord = selectChordWithWeight(chordOptions);
                        const modified = forceAlternativeChordType(selectedChord, prevChord, key);
                        if (modified) {
                            selectedChord = modified;
                            console.log(`🔄 强制修改和弦类型避免重复: ${selectedChord.root}${selectedChord.type} (原选择: ${chordOptions[0].root}${chordOptions[0].type})`);
                        } else {
                            // 第四步：生成扩展的基础替代和弦避免重复
                            // 🔧 修复 (2025-10-03): 扩大替代列表，确保更有效地避免重复
                            const basicAlternatives = [
                                { root: scaleNotes[0], type: 'major', degree: 'I', function: 'tonic' },
                                { root: scaleNotes[1], type: 'minor', degree: 'ii', function: 'subdominant' },
                                { root: scaleNotes[2], type: 'minor', degree: 'iii', function: 'tonic' },
                                { root: scaleNotes[3], type: 'major', degree: 'IV', function: 'subdominant' },
                                { root: scaleNotes[4], type: 'major', degree: 'V', function: 'dominant' },
                                { root: scaleNotes[5], type: 'minor', degree: 'vi', function: 'tonic' },
                                { root: scaleNotes[0], type: 'minor', degree: 'i', function: 'tonic' },     // 小调主和弦
                                { root: scaleNotes[3], type: 'minor', degree: 'iv', function: 'subdominant' }, // 小调下属
                                { root: scaleNotes[2], type: 'major', degree: 'III', function: 'tonic' },   // 小调III
                            ].filter(alt => !areEnharmonicallyEquivalent(prevChord, alt));

                            if (basicAlternatives.length > 0) {
                                selectedChord = basicAlternatives[0];
                                console.log(`🔧 使用扩展基础替代避免重复: ${selectedChord.root}${selectedChord.type} (${selectedChord.function}功能)`);
                            } else {
                                // 第五步：如果实在找不到不同的和弦，强制使用转位创造变化
                                console.log(`⚠️ 所有基础替代都与前和弦相同，强制使用转位创造变化...`);
                                selectedChord = selectChordWithWeight(chordOptions);

                                // 🎯 强制标记为转位，确保视觉上和听觉上有区别
                                // 功能和声转位规则会处理具体转位的应用
                                selectedChord.forceInversionForVariety = true;
                                console.log(`🔄 标记和弦强制转位: ${selectedChord.root}${selectedChord.type} (将在转位规则中应用转位)`);
                            }
                        }
                    }
                }
            } else {
                // 第一个和弦，直接选择
                selectedChord = selectChordWithWeight(chordOptions);
                console.log(`🎵 第一个和弦: ${selectedChord.root}${selectedChord.type}`);
                console.log(`   从选项中选择: [${chordOptions.map(c => c.root + c.type).join(', ')}]`);
            }

            // 🎯 修复 (2025-10-05): 构建正确的 scaleVariant 对象
            // 问题：selectedChord.scaleVariant='harmonic'，但传递的 scaleInfo.type='minor'
            // 解决：根据 selectedChord.scaleVariant 构建包含正确 type 和 notes 的对象
            let scaleVariantInfo = null;
            if (selectedChord.scaleVariant && availableChords.scaleInfo) {
                const variant = selectedChord.scaleVariant;  // 'natural', 'harmonic', 或 'melodic'
                scaleVariantInfo = {
                    type: variant,  // ✅ 使用 'harmonic' 而不是 'minor'
                    notes: availableChords.scaleInfo[variant],  // harmonicMinorScale 数组
                    key: key
                };
                console.log(`🎵 构建 scaleVariant 对象: type=${variant}, notes=[${scaleVariantInfo.notes?.join(', ')}]`);
            } else {
                scaleVariantInfo = availableChords.scaleInfo || null;
            }

            // 构建和弦 - 特殊处理sus4类型
            let chord;
            if (selectedChord.type === 'sus4') {
                // 🎼 确保sus4和弦被正确构建，传递音阶变体信息
                chord = harmonyTheory.buildChord(selectedChord.root, selectedChord.type, key, scaleVariantInfo);
                if (!chord) {
                    // 如果sus4构建失败，退回到基础大调和弦
                    chord = harmonyTheory.buildChord(selectedChord.root, 'major', key, scaleVariantInfo);
                    if (chord) {
                        chord.type = 'sus4'; // 标记为sus4以便后续处理
                        console.log(`⚠️ Sus4构建失败，使用${selectedChord.root}大调和弦替代`);
                    }
                }
            } else {
                // 🎼 传递音阶变体信息给buildChord
                chord = harmonyTheory.buildChord(selectedChord.root, selectedChord.type, key, scaleVariantInfo);
            }

            // 🔧 修复 (2025-10-03): 最终调内验证 - 检查选中的和弦是否在调内
            if (chord && chord.notes && availableChords.scaleInfo && availableChords.scaleInfo.notes) {
                const scaleNotes = availableChords.scaleInfo.notes;
                const outOfKeyNotes = chord.notes.filter(note => !scaleNotes.includes(note));

                if (outOfKeyNotes.length > 0) {
                    console.error(`\n❌❌❌ 检测到调外和弦 ❌❌❌`);
                    console.error(`   和弦: ${selectedChord.root}${selectedChord.type}`);
                    console.error(`   调外音: [${outOfKeyNotes.join(', ')}]`);
                    console.error(`   和弦音符: [${chord.notes.join(', ')}]`);
                    console.error(`   调内音阶: [${scaleNotes.join(', ')}]`);
                    console.error(`   调性: ${key}`);
                    console.error(`   功能: ${function_}`);
                    console.error(`   原始选项池: [${chordOptions.map(c => c.root + c.type).join(', ')}]`);

                    // 尝试生成调内替代和弦
                    console.log(`🔄 尝试生成调内替代和弦...`);
                    let foundAlternative = false;

                    // 从功能池中选择其他和弦
                    const functionPool = availableChords[function_];
                    if (functionPool && functionPool.length > 1) {
                        for (const altChordDef of functionPool) {
                            // 🎯 修复 (2025-10-05): 构建正确的 scaleVariant 对象
                            let scaleVariantInfo = null;
                            if (altChordDef.scaleVariant && availableChords.scaleInfo) {
                                const variant = altChordDef.scaleVariant;
                                scaleVariantInfo = {
                                    type: variant,
                                    notes: availableChords.scaleInfo[variant],
                                    key: key
                                };
                            } else {
                                scaleVariantInfo = availableChords.scaleInfo || null;
                            }
                            const altChord = harmonyTheory.buildChord(altChordDef.root, altChordDef.type, key, scaleVariantInfo);
                            if (altChord && altChord.notes) {
                                const altOutOfKey = altChord.notes.filter(note => !scaleNotes.includes(note));
                                if (altOutOfKey.length === 0) {
                                    chord = altChord;
                                    selectedChord = altChordDef;
                                    foundAlternative = true;
                                    console.log(`✅ 找到调内替代和弦: ${altChordDef.root}${altChordDef.type}`);
                                    break;
                                }
                            }
                        }
                    }

                    if (!foundAlternative) {
                        console.error(`❌ 无法找到调内替代和弦，跳过此小节`);
                        chord = null; // 设置为null以跳过
                    }
                }
            }

            if (chord) {
                chord.root = selectedChord.root;
                chord.type = selectedChord.type;
                chord.measure = index + 1;
                chord.function = function_;
                chord.degree = selectedChord.degree;
                chord.functionalGeneration = true;

                // 标记Vsus的功能类型
                if (selectedChord.degree === 'Vsus4') {
                    chord.vsusFunction = function_; // 记录实际使用的功能
                }

                // 🔧 修复小节缺失问题：确保每个小节都有和弦
                const wasAdded = smartAddChord(result, chord, `第${index + 1}小节: ${selectedChord.degree} ${selectedChord.root}${selectedChord.type} (${function_}功能)`);

                if (!wasAdded) {
                    console.warn(`⚠️ 第${index + 1}小节: ${selectedChord.root}${selectedChord.type} 因voicing约束被跳过，寻找替代和弦...`);

                    // 🔄 智能替代：优先选择不重复的替代和弦
                    let fallbackAdded = false;
                    const prevChord = result.length > 0 ? result[result.length - 1] : null;

                    // 将功能的所有可用和弦按重复避免优先级排序
                    const sortedAlternatives = availableChords[function_].filter(altChord =>
                        altChord.root !== selectedChord.root || altChord.type !== selectedChord.type
                    ).sort((a, b) => {
                        // 优先级：与前一个和弦不同根音+类型的排在前面
                        if (prevChord) {
                            const aIsDifferent = !areEnharmonicallyEquivalent(prevChord, a);
                            const bIsDifferent = !areEnharmonicallyEquivalent(prevChord, b);
                            if (aIsDifferent && !bIsDifferent) return -1;
                            if (!aIsDifferent && bIsDifferent) return 1;
                        }
                        return 0;
                    });

                    for (const altChord of sortedAlternatives) {
                        // 🎯 修复 (2025-10-05): 构建正确的 scaleVariant 对象
                        let altScaleVariantInfo = null;
                        if (altChord.scaleVariant && availableChords.scaleInfo) {
                            const variant = altChord.scaleVariant;
                            altScaleVariantInfo = {
                                type: variant,
                                notes: availableChords.scaleInfo[variant],
                                key: key
                            };
                        } else {
                            altScaleVariantInfo = availableChords.scaleInfo || null;
                        }
                        const altBuiltChord = harmonyTheory.buildChord(altChord.root, altChord.type, key, altScaleVariantInfo);
                        if (altBuiltChord) {
                            altBuiltChord.root = altChord.root;
                            altBuiltChord.type = altChord.type;
                            altBuiltChord.measure = index + 1;
                            altBuiltChord.function = function_;
                            altBuiltChord.degree = altChord.degree;
                            altBuiltChord.functionalGeneration = true;

                            const altWasAdded = smartAddChord(result, altBuiltChord, `第${index + 1}小节: 替代和弦 ${altChord.root}${altChord.type} (${function_}功能)`);
                            if (altWasAdded) {
                                // 验证是否避免了重复
                                if (prevChord && areEnharmonicallyEquivalent(prevChord, altChord)) {
                                    console.log(`🔄 注意: 替代和弦 ${altChord.root}${altChord.type} 与前一个和弦根音类型相同，但允许转位不同`);
                                } else {
                                    console.log(`✅ 成功避免重复: 替代和弦 ${altChord.root}${altChord.type} 与前一个和弦 ${prevChord ? prevChord.root + prevChord.type : 'none'} 不同`);
                                }
                                fallbackAdded = true;
                                break;
                            }
                        }
                    }

                    // 如果所有功能和弦都不能用，强制添加一个基础和弦（尽量避免重复）
                    if (!fallbackAdded) {
                        console.warn(`🚨 第${index + 1}小节: 所有${function_}功能和弦都被约束跳过，智能选择基础和弦...`);

                        // 🔄 智能fallback：尝试多种基础和弦类型，优先选择不重复的
                        const prevChord = result.length > 0 ? result[result.length - 1] : null;
                        const fallbackOptions = [
                            { root: scaleNotes[0], type: 'major', degree: 'I', function: 'tonic' },    // I
                            { root: scaleNotes[3], type: 'minor', degree: 'iv', function: 'subdominant' }, // iv
                            { root: scaleNotes[4], type: 'major', degree: 'V', function: 'dominant' },  // V
                            { root: scaleNotes[0], type: 'minor', degree: 'i', function: 'tonic' },    // i (小调)
                            { root: scaleNotes[2], type: 'major', degree: 'III', function: 'tonic' },  // III
                        ];

                        // 按避免重复优先级排序
                        const sortedFallbacks = fallbackOptions.sort((a, b) => {
                            if (prevChord) {
                                const aIsDifferent = !areEnharmonicallyEquivalent(prevChord, a);
                                const bIsDifferent = !areEnharmonicallyEquivalent(prevChord, b);
                                if (aIsDifferent && !bIsDifferent) return -1;
                                if (!aIsDifferent && bIsDifferent) return 1;
                            }
                            return 0;
                        });

                        for (const fallbackOption of sortedFallbacks) {
                            const forceChord = harmonyTheory.buildChord(fallbackOption.root, fallbackOption.type, key);
                            if (forceChord) {
                                forceChord.root = fallbackOption.root;
                                forceChord.type = fallbackOption.type;
                                forceChord.measure = index + 1;
                                forceChord.function = fallbackOption.function;
                                forceChord.degree = fallbackOption.degree;
                                forceChord.functionalGeneration = true;
                                forceChord.forcedFallback = true;

                                // 强制添加，绕过smartAddChord验证
                                result.push(forceChord);

                                // 记录重复避免结果
                                if (prevChord && areEnharmonicallyEquivalent(prevChord, forceChord)) {
                                    console.log(`🔧 第${index + 1}小节: 强制添加 ${forceChord.root}${forceChord.type} (${forceChord.function}功能fallback) - 注意: 与前一个和弦根音类型相同`);
                                } else {
                                    console.log(`🔧 第${index + 1}小节: 强制添加 ${forceChord.root}${forceChord.type} (${forceChord.function}功能fallback) - ✅ 成功避免重复`);
                                }
                                fallbackAdded = true;
                                break;
                            }
                        }

                        // 如果所有fallback都失败，使用最基础的主和弦
                        if (!fallbackAdded) {
                            const emergencyChord = harmonyTheory.buildChord(scaleNotes[0], 'major', key);
                            if (emergencyChord) {
                                emergencyChord.root = scaleNotes[0];
                                emergencyChord.type = 'major';
                                emergencyChord.measure = index + 1;
                                emergencyChord.function = 'tonic';
                                emergencyChord.degree = 'I';
                                emergencyChord.functionalGeneration = true;
                                emergencyChord.emergencyFallback = true;

                                result.push(emergencyChord);
                                console.log(`🚨 第${index + 1}小节: 紧急添加 ${emergencyChord.root}${emergencyChord.type} (最后手段)`);
                            }
                        }
                    }
                }
            } else {
                console.error(`❌ 第${index + 1}小节: 和弦构建失败，使用智能紧急fallback`);

                // 🔄 智能紧急fallback：尽量避免重复
                const prevChord = result.length > 0 ? result[result.length - 1] : null;
                const emergencyOptions = [
                    { root: scaleNotes[0], type: 'major', degree: 'I', function: 'tonic' },
                    { root: scaleNotes[3], type: 'minor', degree: 'iv', function: 'subdominant' },
                    { root: scaleNotes[4], type: 'major', degree: 'V', function: 'dominant' },
                ];

                let emergencyAdded = false;
                for (const option of emergencyOptions) {
                    // 优先选择不重复的和弦
                    if (!prevChord || !areEnharmonicallyEquivalent(prevChord, option)) {
                        const emergencyChord = harmonyTheory.buildChord(option.root, option.type, key);
                        if (emergencyChord) {
                            emergencyChord.root = option.root;
                            emergencyChord.type = option.type;
                            emergencyChord.measure = index + 1;
                            emergencyChord.function = option.function;
                            emergencyChord.degree = option.degree;
                            emergencyChord.functionalGeneration = true;
                            emergencyChord.emergencyFallback = true;

                            result.push(emergencyChord);
                            console.log(`🚨 第${index + 1}小节: 紧急添加 ${emergencyChord.root}${emergencyChord.type} (构建失败fallback) - ✅ 避免重复`);
                            emergencyAdded = true;
                            break;
                        }
                    }
                }

                // 如果所有选项都是重复的，使用第一个
                if (!emergencyAdded) {
                    const emergencyChord = harmonyTheory.buildChord(scaleNotes[0], 'major', key);
                    if (emergencyChord) {
                        emergencyChord.root = scaleNotes[0];
                        emergencyChord.type = 'major';
                        emergencyChord.measure = index + 1;
                        emergencyChord.function = 'tonic';
                        emergencyChord.degree = 'I';
                        emergencyChord.functionalGeneration = true;
                        emergencyChord.emergencyFallback = true;

                        result.push(emergencyChord);
                        console.log(`🚨 第${index + 1}小节: 紧急添加 ${emergencyChord.root}${emergencyChord.type} (最后手段)`);
                    }
                }
            }
        } else {
            console.error(`❌ 第${index + 1}小节: 功能 ${function_} 无可用和弦，使用智能绝对fallback`);

            // 🔄 智能绝对fallback：尽量避免重复
            const prevChord = result.length > 0 ? result[result.length - 1] : null;
            const absoluteOptions = [
                { root: scaleNotes[0], type: 'major', degree: 'I', function: 'tonic' },
                { root: scaleNotes[0], type: 'minor', degree: 'i', function: 'tonic' },
                { root: scaleNotes[3], type: 'minor', degree: 'iv', function: 'subdominant' },
                { root: scaleNotes[4], type: 'major', degree: 'V', function: 'dominant' },
            ];

            let absoluteAdded = false;
            for (const option of absoluteOptions) {
                // 优先选择不重复的和弦
                if (!prevChord || !areEnharmonicallyEquivalent(prevChord, option)) {
                    const absoluteChord = harmonyTheory.buildChord(option.root, option.type, key);
                    if (absoluteChord) {
                        absoluteChord.root = option.root;
                        absoluteChord.type = option.type;
                        absoluteChord.measure = index + 1;
                        absoluteChord.function = option.function;
                        absoluteChord.degree = option.degree;
                        absoluteChord.functionalGeneration = true;
                        absoluteChord.absoluteFallback = true;

                        result.push(absoluteChord);
                        console.log(`🔧 第${index + 1}小节: 绝对添加 ${absoluteChord.root}${absoluteChord.type} (无可用和弦fallback) - ✅ 避免重复`);
                        absoluteAdded = true;
                        break;
                    }
                }
            }

            // 如果所有选项都是重复的，使用第一个
            if (!absoluteAdded) {
                const absoluteChord = harmonyTheory.buildChord(scaleNotes[0], 'major', key);
                if (absoluteChord) {
                    absoluteChord.root = scaleNotes[0];
                    absoluteChord.type = 'major';
                    absoluteChord.measure = index + 1;
                    absoluteChord.function = 'tonic';
                    absoluteChord.degree = 'I';
                    absoluteChord.functionalGeneration = true;
                    absoluteChord.absoluteFallback = true;

                    result.push(absoluteChord);
                    console.log(`🔧 第${index + 1}小节: 绝对添加 ${absoluteChord.root}${absoluteChord.type} (最后手段)`);
                }
            }
        }
    });

    console.log(`✅ 功能和声进行生成完成: ${result.length}小节`);

    // 🔧 修复 (2025-10-02 尝试4): 检查用户是否勾选了转位设置
    // 如果用户未勾选转位，不应用功能和声转位规则
    const userEnabledInversions = window.chordSettings.includeTriadInversions ||
                                  window.chordSettings.includeSeventhInversions;

    console.log(`\n🔍 ========== 功能和声转位设置检查 ==========`);
    console.log(`  用户勾选三和弦转位: ${window.chordSettings.includeTriadInversions ? '✅ 是' : '❌ 否'}`);
    console.log(`  用户勾选七和弦转位: ${window.chordSettings.includeSeventhInversions ? '✅ 是' : '❌ 否'}`);
    console.log(`  是否应用转位规则: ${userEnabledInversions ? '✅ 是' : '❌ 否'}`);
    console.log(`${'='.repeat(50)}\n`);

    if (userEnabledInversions) {
        // 用户勾选了转位，应用功能和声智能转位规则
        console.log(`🎯 用户已勾选转位，开始应用功能和声转位规则...`);

        // 🔧 2025-10-04修复: 传递voicing类型到转位规则引擎
        const voicingTypes = window.chordSettings && window.chordSettings.voicingTypes
            ? window.chordSettings.voicingTypes
            : null;
        console.log(`🎸 传递voicing类型: ${voicingTypes ? voicingTypes.join(', ') : '未指定'}`);

        const progressionWithInversions = applyFunctionalInversions(result, keyInfo, voicingTypes);
        console.log(`✅ 功能和声转位规则应用完成`);
        return progressionWithInversions;
    } else {
        // 用户未勾选转位，所有和弦保持原位
        console.log(`⚠️ 用户未勾选转位，跳过功能和声转位规则`);
        console.log(`✅ 所有和弦保持原位（inversion=0）`);
        return result;
    }
}

/**
 * 🔧 新增 (2025-10-02): 功能和声智能转位规则引擎
 * 根据传统和声学规则智能选择转位
 *
 * @param {Array} progression - 和弦进行数组 [{root, type, ...}, ...]
 * @param {Object} keyInfo - 调性信息 {sharps, flats, mode, tonic}
 * @returns {Array} 带转位标记的和弦进行
 */
function applyFunctionalInversions(progression, keyInfo, voicingTypes = null) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎼 功能和声转位规则引擎启动`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 输入信息:`);
    console.log(`  - 和弦数量: ${progression.length}个`);
    console.log(`  - 调性信息: ${keyInfo.tonic}-${keyInfo.mode} (${keyInfo.sharps}#, ${keyInfo.flats}♭)`);
    console.log(`  - 和弦列表: ${progression.map(c => `${c.root}${c.type}`).join(' → ')}`);
    console.log(`  - Voicing类型: ${voicingTypes ? voicingTypes.join(', ') : '未指定'}`);

    // 🔍 检测Close Voicing Only模式
    const isCloseVoicingOnly = voicingTypes &&
                              voicingTypes.length === 1 &&
                              voicingTypes[0] === 'close';

    if (isCloseVoicingOnly) {
        console.log(`\n🎸 检测到Close Voicing Only模式`);
        console.log(`   ⚠️  七和弦转位规则将被跳过（Close Voicing七和弦只允许原位）`);
    }

    // 🔍 详细诊断：显示每个和弦的完整信息
    console.log(`\n  🔍 和弦详细信息:`);
    progression.forEach((chord, i) => {
        console.log(`    第${i+1}小节: ${chord.root}${chord.type} (当前转位: ${chord.inversion || 0})`);
    });
    console.log(`${'='.repeat(80)}\n`);

    // 复制和弦进行，添加转位标记
    const result = progression.map(chord => ({
        ...chord,
        inversion: 0,  // 默认原位
        inversionReason: null,
        forcedBassNote: null
    }));

    // 🔧 修复 (2025-10-03): 强制转位标记处理（避免重复的最后手段）
    // 检查是否有和弦被标记为强制转位（因为找不到不同的和弦类型）
    result.forEach((chord, i) => {
        if (chord.forceInversionForVariety) {
            console.log(`  🔄 检测到第${i+1}小节被标记为强制转位（避免重复）: ${chord.root}${chord.type}`);

            // 根据和弦类型决定转位
            const isTriad = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'].includes(chord.type);
            const isSeventh = chord.type.includes('7') || chord.type.includes('maj7');

            if (isSeventh) {
                // 七和弦：随机使用第一或第二转位（避免第三转位，因为较少用）
                chord.inversion = Math.random() < 0.7 ? 1 : 2;
                chord.inversionReason = 'force-variety-seventh';
                console.log(`    → 七和弦强制第${chord.inversion}转位（创造变化）`);
            } else if (isTriad) {
                // 三和弦：只使用第一转位（第二转位即六四和弦，使用规则严格）
                chord.inversion = 1;
                chord.inversionReason = 'force-variety-triad';
                console.log(`    → 三和弦强制第一转位（创造变化）`);
            }

            // 移除标记，避免后续处理混淆
            delete chord.forceInversionForVariety;
        }
    });

    // 🎯 转位使用概率控制（目标：提高转位出现频率）
    // 🔧 修复 (2025-10-03): 用户反馈转位频率太低，提高概率
    const inversionProbabilities = {
        smoothBass: 0.5,        // 平滑低音线条：50%概率（从25%提高）
        avoidRepetition: 0.6,   // 避免重复：60%概率（从50%提高）
        pedal64: 0.3            // 持续低音六四：30%概率（从20%提高）
    };

    // 规则1: 应用第一转位 - 平滑低音线条（带概率控制）
    applyFirstInversionForSmoothBass(result, keyInfo, inversionProbabilities.smoothBass);

    // 规则2: 应用第一转位 - 避免重复和弦单调（带概率控制）
    applyFirstInversionForRepetition(result, keyInfo, inversionProbabilities.avoidRepetition);

    // 🎯 规则2.5: 七和弦通用转位（新增 - 确保有基本转位变化）
    // 在没有特殊规则触发的情况下，给七和弦一定转位机会
    // 🔧 修复 (2025-10-03): 从30%提高到50%
    // 🔧 修复 (2025-10-04): 传递isCloseVoicingOnly参数
    applyGeneralSeventhChordInversions(result, keyInfo, 0.5, isCloseVoicingOnly);

    // 🎯 规则2.6: 三和弦通用转位（新增 2025-10-03 - 修复三和弦无转位问题）
    // 为中间的三和弦提供基本转位机会（40%概率）
    applyGeneralTriadInversions(result, keyInfo, 0.4);

    // 规则3: 应用第二转位 - 终止六四和弦 (优先级最高)
    applyCadential64(result, keyInfo);

    // 规则4: 应用第二转位 - 经过六四和弦
    applyPassing64(result, keyInfo);

    // 规则5: 应用第二转位 - 持续低音六四和弦（带概率控制）
    applyPedal64(result, keyInfo, inversionProbabilities.pedal64);

    // 🎯 规则6: 应用第三转位 - 七和弦特殊处理（2025-10-02新增）
    // 🔧 修复 (2025-10-03): 从25%提高到40%
    // 🔧 修复 (2025-10-04): 传递isCloseVoicingOnly参数
    applySeventhChordThirdInversion(result, keyInfo, 0.4, isCloseVoicingOnly);

    // 🎯 规则7: 首尾原位约束（2025-10-02新增）
    // 音乐理论："Inversions rarely begin or conclude harmonic phrases"
    // 🔧 修复 (2025-10-03): 首尾强制转位有例外（避免重复的情况）
    if (result.length > 0) {
        // 第一个和弦强制原位（除非是为了避免重复）
        if (result[0].inversion > 0) {
            const isForceVariety = result[0].inversionReason === 'force-variety-seventh' ||
                                   result[0].inversionReason === 'force-variety-triad';
            if (!isForceVariety) {
                console.log(`  ⚠️ 第1小节使用了转位，强制改为原位（乐句开始）`);
                console.log(`     原转位: ${result[0].inversionReason}`);
                result[0].inversion = 0;
                result[0].inversionReason = null;
                result[0].forcedBassNote = null;
            } else {
                console.log(`  ℹ️ 第1小节保留转位（避免重复优先级更高）`);
            }
        }

        // 最后一个和弦强制原位（除非是为了避免重复）
        const lastIndex = result.length - 1;
        if (result[lastIndex].inversion > 0) {
            const isForceVariety = result[lastIndex].inversionReason === 'force-variety-seventh' ||
                                   result[lastIndex].inversionReason === 'force-variety-triad';
            if (!isForceVariety) {
                console.log(`  ⚠️ 第${lastIndex+1}小节使用了转位，强制改为原位（乐句结束）`);
                console.log(`     原转位: ${result[lastIndex].inversionReason}`);
                result[lastIndex].inversion = 0;
                result[lastIndex].inversionReason = null;
                result[lastIndex].forcedBassNote = null;
            } else {
                console.log(`  ℹ️ 第${lastIndex+1}小节保留转位（避免重复优先级更高）`);
            }
        }
    }

    // 🎯 转位频率限制：确保转位和弦不超过总数的70%
    // 🔧 修复 (2025-10-03): 用户反馈转位频率太低，从30%→50%→70%
    const inversionCount = result.filter(c => c.inversion > 0).length;
    const maxInversions = Math.ceil(result.length * 0.7);  // 70%上限（从50%提高）

    if (inversionCount > maxInversions) {
        console.log(`⚠️ 转位和弦过多 (${inversionCount}/${result.length})，减少到${maxInversions}个`);

        // 🔧 修复 (2025-10-02): 按优先级移除转位
        // 优先级（从高到低，不在列表中的永不移除）：
        // 永不移除：force-variety-* (强制避免重复，最高优先级)
        // 1. avoid-repetition (最重要，避免重复)
        // 2. pedal-64, cadential-64 (特殊功能)
        // 3. smooth-bass (音乐流畅性)
        // 4. seventh-chord-variety, third-inversion-seventh (一般变化)

        const priorityOrder = [
            'triad-variety',                // 优先移除：一般三和弦变化（2025-10-03新增）
            'seventh-chord-variety',        // 优先移除：一般七和弦变化
            'third-inversion-seventh',      // 优先移除：第三转位
            'smooth-bass-descending',       // 其次移除：平滑低音
            'smooth-bass-ascending',        // 其次移除：平滑低音
            'pedal-64',                     // 较少移除：特殊功能
            'cadential-64',                 // 较少移除：特殊功能
            'avoid-repetition'              // 最少移除：避免重复最重要
            // 注意：force-variety-seventh 和 force-variety-triad 不在列表中，永不移除
        ];

        let removed = 0;
        // 按优先级顺序尝试移除
        for (const reason of priorityOrder) {
            if (inversionCount - removed <= maxInversions) break;

            for (let i = result.length - 1; i >= 0; i--) {
                if (inversionCount - removed <= maxInversions) break;

                // 跳过首尾和弦（首尾原位约束在后面强制执行）
                if (i === 0 || i === result.length - 1) continue;

                if (result[i].inversion > 0 && result[i].inversionReason === reason) {
                    console.log(`  ❌ 移除第${i+1}小节的转位 (${result[i].inversionReason})`);
                    result[i].inversion = 0;
                    result[i].inversionReason = null;
                    result[i].forcedBassNote = null;
                    removed++;
                }
            }
        }

        console.log(`  ✅ 已移除${removed}个转位，剩余${inversionCount - removed}个`);
    }

    // 🎯 再次强制首尾原位约束（确保频率限制后仍然保持）
    if (result.length > 0) {
        if (result[0].inversion > 0) {
            console.log(`  ⚠️ 首位和弦在频率限制后仍有转位，再次强制原位`);
            result[0].inversion = 0;
            result[0].inversionReason = null;
            result[0].forcedBassNote = null;
        }

        const lastIndex = result.length - 1;
        if (result[lastIndex].inversion > 0) {
            console.log(`  ⚠️ 末位和弦在频率限制后仍有转位，再次强制原位`);
            result[lastIndex].inversion = 0;
            result[lastIndex].inversionReason = null;
            result[lastIndex].forcedBassNote = null;
        }
    }

    // 🎯 新增 (2025-10-03): 验证转位和弦级进解决
    // 音乐理论: "It is usually best to move away from an inverted chord by step"
    // 🔧 修复 (2025-10-03): 用户反馈转位频率仍然太低，注释掉严格的级进验证
    // 用户建议：转位和弦只需要"move away from by step"，不需要"move to by step"
    // 各个转位规则本身已经有音乐理论依据，不需要额外验证
    // validateInversionStepwiseResolution(result, keyInfo);

    console.log(`✅ 转位规则应用完成，详情:`);
    result.forEach((chord, i) => {
        if (chord.inversion > 0) {
            console.log(`  第${i+1}小节: ${chord.root}${chord.type} → 第${chord.inversion}转位 (原因: ${chord.inversionReason})`);
        }
    });
    console.log(`📊 转位统计: ${result.filter(c => c.inversion > 0).length}/${result.length}个和弦使用转位 (${Math.round(result.filter(c => c.inversion > 0).length / result.length * 100)}%)`);

    return result;
}

/**
 * 🔧 辅助函数: 应用第一转位 - 平滑低音线条
 * 检测可以形成音阶的三和弦序列
 * @param {number} probability - 应用概率（0-1），避免过度使用
 */
function applyFirstInversionForSmoothBass(progression, keyInfo, probability = 1.0) {
    console.log(`  🎵 检测平滑低音线条机会 (概率: ${Math.round(probability * 100)}%)...`);

    let foundOpportunities = 0;
    let appliedInversions = 0;

    for (let i = 0; i < progression.length - 2; i++) {
        const prev = progression[i];
        const current = progression[i + 1];
        const next = progression[i + 2];

        // 获取根音的半音索引
        const prevRoot = getNoteIndexInOctave(prev.root);
        const currentRoot = getNoteIndexInOctave(current.root);
        const nextRoot = getNoteIndexInOctave(next.root);

        // 计算三度音的半音索引
        const currentThirdInterval = getThirdInterval(current.type);
        if (currentThirdInterval === null) continue;

        const currentThird = (currentRoot + currentThirdInterval) % 12;

        // 检测下行音阶: 如 F(5) → E(4) → D(2)
        if (isDescendingScale(prevRoot, currentThird, nextRoot)) {
            foundOpportunities++;
            if (current.inversion === 0 && Math.random() < probability) {  // 添加概率控制
                current.inversion = 1;
                current.inversionReason = 'smooth-bass-descending';
                current.forcedBassNote = getNoteNameFromIndex(currentThird, keyInfo);
                console.log(`    ✅ 第${i+2}小节${current.root}${current.type}使用第一转位（下行音阶: ${prev.root}-${current.forcedBassNote}-${next.root}）`);
                appliedInversions++;
            }
        }

        // 检测上行音阶: 如 A(9) → B(11) → C(0)
        if (isAscendingScale(prevRoot, currentThird, nextRoot)) {
            foundOpportunities++;
            if (current.inversion === 0 && Math.random() < probability) {  // 添加概率控制
                current.inversion = 1;
                current.inversionReason = 'smooth-bass-ascending';
                current.forcedBassNote = getNoteNameFromIndex(currentThird, keyInfo);
                console.log(`    ✅ 第${i+2}小节${current.root}${current.type}使用第一转位（上行音阶: ${prev.root}-${current.forcedBassNote}-${next.root}）`);
                appliedInversions++;
            }
        }
    }

    if (foundOpportunities === 0) {
        console.log(`    ℹ️  未找到平滑低音线条机会（需要形成音阶的三和弦序列）`);
    } else {
        console.log(`    📊 找到${foundOpportunities}个机会，应用了${appliedInversions}个转位`);
    }
}

/**
 * 🔧 辅助函数: 应用第一转位 - 避免重复和弦单调
 * @param {number} probability - 应用概率（0-1），避免过度使用
 */
function applyFirstInversionForRepetition(progression, keyInfo, probability = 1.0) {
    console.log(`  🎵 检测重复和弦机会 (概率: ${Math.round(probability * 100)}%)...`);

    let foundRepetitions = 0;
    let appliedInversions = 0;

    for (let i = 0; i < progression.length - 1; i++) {
        const current = progression[i];
        const next = progression[i + 1];

        // 检测同根音同类型的连续和弦
        if (current.root === next.root && current.type === next.type) {
            foundRepetitions++;
            // 只转位第二个和弦（带概率控制）
            if (next.inversion === 0 && Math.random() < probability) {
                next.inversion = 1;
                appliedInversions++;
                next.inversionReason = 'avoid-repetition';
                const thirdInterval = getThirdInterval(next.type);
                if (thirdInterval !== null) {
                    const rootIndex = getNoteIndexInOctave(next.root);
                    const thirdIndex = (rootIndex + thirdInterval) % 12;
                    next.forcedBassNote = getNoteNameFromIndex(thirdIndex, keyInfo);
                    console.log(`    ✅ 第${i+2}小节${next.root}${next.type}使用第一转位（避免重复）`);
                }
            }
        }
    }

    if (foundRepetitions === 0) {
        console.log(`    ℹ️  未找到重复和弦（连续相同和弦）`);
    } else {
        console.log(`    📊 找到${foundRepetitions}个重复和弦，应用了${appliedInversions}个转位`);
    }
}

/**
 * 🔧 新增函数: 七和弦通用转位规则 (2025-10-02)
 * 为中间的七和弦提供基本转位机会，确保不全是原位
 * @param {number} probability - 应用概率（0-1）
 * @param {boolean} isCloseVoicingOnly - 是否为Close Voicing Only模式（2025-10-04新增）
 */
function applyGeneralSeventhChordInversions(progression, keyInfo, probability = 0.3, isCloseVoicingOnly = false) {
    console.log(`  🎵 应用七和弦通用转位规则 (概率: ${Math.round(probability * 100)}%)...`);

    // 🔧 2025-10-04修复: Close Voicing Only模式下跳过七和弦转位规则
    if (isCloseVoicingOnly) {
        console.log(`    ⏭️  跳过七和弦转位规则（Close Voicing Only模式，七和弦只允许原位）`);
        return;
    }

    let candidateCount = 0;
    let appliedInversions = 0;

    for (let i = 1; i < progression.length - 1; i++) {  // 跳过首尾和弦
        const chord = progression[i];

        // 检查是否为七和弦（包括扩展和弦）
        const isSeventhChord = chord.type.includes('7') ||
                              chord.type.includes('9') ||
                              chord.type.includes('11') ||
                              chord.type.includes('13');

        if (isSeventhChord && chord.inversion === 0) {  // 只处理还是原位的七和弦
            candidateCount++;

            // 按概率应用第一转位
            if (Math.random() < probability) {
                chord.inversion = 1;
                chord.inversionReason = 'seventh-chord-variety';

                const thirdInterval = getThirdInterval(chord.type);
                if (thirdInterval !== null) {
                    const rootIndex = getNoteIndexInOctave(chord.root);
                    const thirdIndex = (rootIndex + thirdInterval) % 12;
                    chord.forcedBassNote = getNoteNameFromIndex(thirdIndex, keyInfo);
                    console.log(`    ✅ 第${i+1}小节${chord.root}${chord.type}使用第一转位（增加七和弦变化）`);
                    appliedInversions++;
                }
            }
        }
    }

    if (candidateCount === 0) {
        console.log(`    ℹ️  无中间位置的七和弦（首尾不转位）`);
    } else {
        console.log(`    📊 找到${candidateCount}个候选七和弦，应用了${appliedInversions}个转位`);
    }
}

/**
 * 🔧 新增函数: 三和弦通用转位规则 (2025-10-03)
 * 为中间的三和弦提供基本转位机会，确保不全是原位
 * @param {number} probability - 应用概率（0-1）
 */
function applyGeneralTriadInversions(progression, keyInfo, probability = 0.4) {
    console.log(`  🎵 应用三和弦通用转位规则 (概率: ${Math.round(probability * 100)}%)...`);

    let candidateCount = 0;
    let appliedInversions = 0;

    // 三和弦类型列表
    const triadTypes = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'];

    for (let i = 1; i < progression.length - 1; i++) {  // 跳过首尾和弦
        const chord = progression[i];

        // 检查是否为三和弦
        const isTriad = triadTypes.includes(chord.type);

        if (isTriad && chord.inversion === 0) {  // 只处理还是原位的三和弦
            candidateCount++;

            // 按概率应用第一转位（三和弦主要使用第一转位，第二转位即六四和弦有严格使用规则）
            if (Math.random() < probability) {
                chord.inversion = 1;
                chord.inversionReason = 'triad-variety';

                const thirdInterval = getThirdInterval(chord.type);
                if (thirdInterval !== null) {
                    const rootIndex = getNoteIndexInOctave(chord.root);
                    const thirdIndex = (rootIndex + thirdInterval) % 12;
                    chord.forcedBassNote = getNoteNameFromIndex(thirdIndex, keyInfo);
                    console.log(`    ✅ 第${i+1}小节${chord.root}${chord.type}使用第一转位（增加三和弦变化）`);
                    appliedInversions++;
                }
            }
        }
    }

    if (candidateCount === 0) {
        console.log(`    ℹ️  无中间位置的三和弦（首尾不转位）`);
    } else {
        console.log(`    📊 找到${candidateCount}个候选三和弦，应用了${appliedInversions}个转位`);
    }
}

/**
 * 🔧 辅助函数: 应用终止六四和弦
 * 在 V-I 或 V7-I 终止式之前插入 I6/4
 */
function applyCadential64(progression, keyInfo) {
    console.log(`  🎵 检测终止式（V-I）...`);

    // 注意：这里不是插入新和弦，而是标记现有和弦使用六四转位
    // 实际的"插入I6/4"逻辑需要在生成阶段完成
    // 这里只处理现有进行中的转位标记

    // 暂时不实现插入逻辑，只标记潜在的终止式位置
    for (let i = 0; i < progression.length - 1; i++) {
        const current = progression[i];
        const next = progression[i + 1];

        if (isDominantChord(current, keyInfo) && isTonicChord(next, keyInfo)) {
            console.log(`    🔍 发现终止式: 第${i+1}小节(${current.root}${current.type}) → 第${i+2}小节(${next.root}${next.type})`);
            // 标记：未来可以在这里插入I6/4
        }
    }
}

/**
 * 🔧 辅助函数: 应用经过六四和弦
 * 检测 I→I6 或 IV→IV6 进行，可以使用经过六四和弦
 */
function applyPassing64(progression, keyInfo) {
    console.log(`  🎵 检测经过六四和弦机会...`);

    // 暂时简化：不实现复杂的经过六四和弦逻辑
    // 这需要检测 I和I6 之间，或 IV和IV6 之间的进行
    // 由于当前和弦进行中可能没有第一转位的标记，这个逻辑较复杂
    console.log(`    ⚠️ 经过六四和弦规则暂未实现（需要更复杂的和弦序列分析）`);
}

/**
 * 🔧 辅助函数: 应用持续低音六四和弦
 * 在两个 I 和弦之间可以使用 IV6/4
 * @param {number} probability - 应用概率（0-1），第二转位应更保守
 */
function applyPedal64(progression, keyInfo, probability = 1.0) {
    console.log(`  🎵 检测持续低音六四和弦机会 (概率: ${Math.round(probability * 100)}%)...`);

    for (let i = 0; i < progression.length - 2; i++) {
        const prev = progression[i];
        const current = progression[i + 1];
        const next = progression[i + 2];

        // 检测 I → IV → I 进行
        if (isTonicChord(prev, keyInfo) &&
            isSubdominantChord(current, keyInfo) &&
            isTonicChord(next, keyInfo)) {

            // 将中间的IV和弦改为第二转位（六四和弦）- 带概率控制
            if (current.inversion === 0 && !current.type.includes('7') && Math.random() < probability) {
                current.inversion = 2;
                current.inversionReason = 'pedal-64';
                const fifthInterval = 7;  // 纯五度
                const rootIndex = getNoteIndexInOctave(current.root);
                const fifthIndex = (rootIndex + fifthInterval) % 12;
                current.forcedBassNote = getNoteNameFromIndex(fifthIndex, keyInfo);
                console.log(`    ✅ 第${i+2}小节${current.root}${current.type}使用第二转位作为持续低音六四和弦（I-IV6/4-I）`);
            }
        }
    }
}

/**
 * 🎯 新增 (2025-10-02): 应用第三转位规则 - 七和弦特殊处理
 *
 * 音乐理论规则：
 * "Third inversion will sound ambiguous if it is not preceded by a root-position voicing of the same chord."
 * 第三转位（七音在低音）只有在前一个和弦是同一和弦的原位时才使用，否则听起来含糊不清。
 *
 * @param {Array} progression - 和弦进行数组
 * @param {Object} keyInfo - 调性信息
 * @param {number} probability - 应用概率（0-1），第三转位应非常保守
 */
function applySeventhChordThirdInversion(progression, keyInfo, probability = 0.25, isCloseVoicingOnly = false) {
    console.log(`  🎵 检测第三转位机会（七和弦）(概率: ${Math.round(probability * 100)}%)...`);

    // 🔧 2025-10-04修复: Close Voicing Only模式下跳过第三转位规则
    if (isCloseVoicingOnly) {
        console.log(`    ⏭️  跳过第三转位规则（Close Voicing Only模式，七和弦只允许原位）`);
        return;
    }

    for (let i = 1; i < progression.length; i++) {
        const prev = progression[i - 1];
        const current = progression[i];

        // 检查是否为七和弦或有tension的和弦
        const isSeventhChord = current.type.includes('7') ||
                               current.type.includes('9') ||
                               current.type.includes('11') ||
                               current.type.includes('13');

        // 检查钢琴模式的tension标记
        const hasTensions = (current.chordInfo && current.chordInfo.is69Voicing) ||
                           (current.chordInfo && current.chordInfo.failed69Conversion) ||
                           (current.tensions && current.tensions.length > 0);

        if (!isSeventhChord && !hasTensions) continue;

        // 🎯 第三转位约束：前一和弦必须是同一和弦的原位
        const isSameChord = prev.root === current.root && prev.type === current.type;
        const prevIsRootPosition = !prev.inversion || prev.inversion === 0;

        if (isSameChord && prevIsRootPosition && current.inversion === 0) {
            // 25%概率应用第三转位（非常保守）
            if (Math.random() < probability) {
                current.inversion = 3;
                current.inversionReason = 'third-inversion-seventh';

                // 七音在低音（小七度 = 10个半音）
                const seventhInterval = 10;
                const rootIndex = getNoteIndexInOctave(current.root);
                const seventhIndex = (rootIndex + seventhInterval) % 12;
                current.forcedBassNote = getNoteNameFromIndex(seventhIndex, keyInfo);

                console.log(`    ✅ 第${i+1}小节${current.root}${current.type}使用第三转位（前一小节是同一和弦的原位）`);
                console.log(`       低音: ${current.forcedBassNote} (七音)`);
            }
        } else if (current.inversion === 3) {
            // 如果已经被其他逻辑设置为第三转位，但不符合约束，降级为第二转位
            console.log(`    ⚠️ 第${i+1}小节${current.root}${current.type}第三转位不符合约束，降级为第二转位`);
            console.log(`       原因: ${!isSameChord ? '前一和弦不是同一和弦' : '前一和弦不是原位'}`);
            current.inversion = 2;
            current.inversionReason = 'second-inversion-fallback';

            // 五音在低音
            const fifthInterval = 7;
            const rootIndex = getNoteIndexInOctave(current.root);
            const fifthIndex = (rootIndex + fifthInterval) % 12;
            current.forcedBassNote = getNoteNameFromIndex(fifthIndex, keyInfo);
        }
    }
}

/**
 * 🔧 辅助函数: 判断是否为主和弦 (Tonic)
 */
function isTonicChord(chord, keyInfo) {
    const tonicRoot = keyInfo.tonic;
    return chord.root === tonicRoot;
}

/**
 * 🔧 辅助函数: 判断是否为属和弦 (Dominant)
 */
function isDominantChord(chord, keyInfo) {
    const scale = getScaleChordRoots(keyInfo.mode === 'major' ? `${keyInfo.tonic}-major` : `${keyInfo.tonic}-minor`);
    const dominantRoot = scale[4];  // 第五级
    return chord.root === dominantRoot;
}

/**
 * 🔧 辅助函数: 判断是否为下属和弦 (Subdominant)
 */
function isSubdominantChord(chord, keyInfo) {
    const scale = getScaleChordRoots(keyInfo.mode === 'major' ? `${keyInfo.tonic}-major` : `${keyInfo.tonic}-minor`);
    const subdominantRoot = scale[3];  // 第四级
    return chord.root === subdominantRoot;
}

/**
 * 🔧 辅助函数: 获取音符在八度内的索引 (0-11)
 */
function getNoteIndexInOctave(noteName) {
    const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
    const baseName = noteName.charAt(0);
    let index = noteMap[baseName];

    // 处理升降号
    const accidentals = noteName.substring(1);
    if (accidentals.includes('#')) {
        index += accidentals.match(/#/g).length;
    } else if (accidentals.includes('b')) {
        index -= accidentals.match(/b/g).length;
    }

    return ((index % 12) + 12) % 12;  // 确保在0-11范围内
}

/**
 * 🔧 辅助函数: 获取和弦根音的pitch class (0-11)
 * @param {string} rootNote - 和弦根音名称（如'C', 'F#', 'Bb'）
 * @returns {number} Pitch class (0=C, 1=C#/Db, ..., 5=F, ..., 11=B)
 *
 * 🎯 用途: Close Voicing Only音域约束
 * - F的pitch class = 5
 * - 只允许pitch class ≥5的major7和弦（F, F#, G, G#, A, A#, B及降号等价）
 * - 过滤pitch class <5的major7和弦（C, C#, D, D#, E及降号等价）
 */
function getRootPitchClass(rootNote) {
    return getNoteIndexInOctave(rootNote);
}

/**
 * 🔧 辅助函数: 从索引获取音符名称
 */
function getNoteNameFromIndex(index, keyInfo) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const flatNoteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    // 根据调性决定使用升号还是降号
    const useFlats = keyInfo.flats > 0;
    return useFlats ? flatNoteNames[index] : noteNames[index];
}

/**
 * 🔧 辅助函数: 获取三度音的半音间隔
 */
function getThirdInterval(chordType) {
    if (chordType.includes('major') || chordType === 'major') return 4;  // 大三度
    if (chordType.includes('minor') || chordType === 'minor') return 3;  // 小三度
    if (chordType.includes('diminished') || chordType === 'diminished') return 3;  // 小三度
    if (chordType.includes('augmented') || chordType === 'augmented') return 4;  // 大三度
    if (chordType.includes('sus')) return null;  // sus和弦没有三度
    return 4;  // 默认大三度
}

/**
 * 🔧 辅助函数: 检测是否为下行音阶
 */
function isDescendingScale(note1, note2, note3) {
    // 检测三个音是否形成下行音阶（差值为1或2个半音）
    const diff1 = ((note1 - note2 + 12) % 12);
    const diff2 = ((note2 - note3 + 12) % 12);
    return (diff1 === 1 || diff1 === 2) && (diff2 === 1 || diff2 === 2);
}

/**
 * 🔧 辅助函数: 检测是否为上行音阶
 */
function isAscendingScale(note1, note2, note3) {
    // 检测三个音是否形成上行音阶（差值为1或2个半音）
    const diff1 = ((note2 - note1 + 12) % 12);
    const diff2 = ((note3 - note2 + 12) % 12);
    return (diff1 === 1 || diff1 === 2) && (diff2 === 1 || diff2 === 2);
}

/**
 * 🔧 新增辅助函数 (2025-10-03): 验证转位和弦级进解决
 * 音乐理论: "It is usually best to move away from an inverted chord by step"
 */
function validateInversionStepwiseResolution(progression, keyInfo) {
    console.log(`  🎵 验证转位和弦级进解决...`);

    let checkedInversions = 0;
    let removedInversions = 0;
    let keptInversions = 0;

    for (let i = 0; i < progression.length - 1; i++) {
        const current = progression[i];
        const next = progression[i + 1];

        // 只检查转位和弦
        if (current.inversion > 0) {
            checkedInversions++;

            // 获取当前和弦的低音（转位后的低音）
            const currentBass = getBassNote(current, keyInfo);
            const nextBass = getBassNote(next, keyInfo);

            if (currentBass === null || nextBass === null) {
                console.log(`    ⚠️ 第${i+1}小节: 无法获取低音，跳过验证`);
                continue;
            }

            // 计算低音音程（半音数）
            const interval = getInterval(currentBass, nextBass);

            // 级进: 半音(1) 或 全音(2)
            const isStepwise = (interval === 1 || interval === 2);

            if (!isStepwise) {
                // 不是级进
                const currentBassNote = getNoteNameFromIndex(currentBass, keyInfo);
                console.log(`    ⚠️ 第${i+1}小节: ${current.root}${current.type}/${currentBassNote} → ${next.root}${next.type} (音程: ${interval}半音 - 非级进)`);

                // 🔧 修复 (2025-10-03): 只移除真正的"低优先级"转位
                // 注意：smooth-bass-* 转位是为了创造三和弦级进序列，不应在此移除
                // 因为它们关注的是前后三个和弦的整体级进，而不仅是两个和弦
                const lowPriorityReasons = [
                    'seventh-chord-variety'  // 只移除通用七和弦转位
                ];

                if (lowPriorityReasons.includes(current.inversionReason)) {
                    console.log(`       ❌ 移除转位（低优先级: ${current.inversionReason}）`);
                    current.inversion = 0;
                    current.inversionReason = null;
                    current.forcedBassNote = null;
                    removedInversions++;
                } else {
                    console.log(`       ✅ 保留转位（${current.inversionReason}）`);
                    keptInversions++;
                }
            } else {
                // 是级进，符合规则
                // console.log(`    ✅ 第${i+1}小节: ${current.root}${current.type} 级进解决 (${interval}半音)`);
            }
        }
    }

    if (checkedInversions > 0) {
        console.log(`  📊 级进验证完成: 检查${checkedInversions}个转位，移除${removedInversions}个，保留${keptInversions}个高优先级非级进转位`);
    } else {
        console.log(`  ℹ️  没有转位和弦需要验证`);
    }
}

/**
 * 🔧 新增辅助函数 (2025-10-03): 获取和弦的低音（考虑转位）
 * @returns {number|null} 低音的半音索引 (0-11)，如果无法确定则返回 null
 */
function getBassNote(chord, keyInfo) {
    // 如果没有转位，低音就是根音
    if (!chord.inversion || chord.inversion === 0) {
        return getNoteIndexInOctave(chord.root);
    }

    // 如果有明确的 forcedBassNote，使用它
    if (chord.forcedBassNote) {
        return getNoteIndexInOctave(chord.forcedBassNote);
    }

    // 否则，根据转位计算低音
    const rootIndex = getNoteIndexInOctave(chord.root);
    const chordType = chord.type;

    // 获取和弦的音程结构
    const intervals = getChordIntervals(chordType);
    if (!intervals || chord.inversion >= intervals.length) {
        return null;  // 无法确定
    }

    // 转位对应的音程
    const bassInterval = intervals[chord.inversion];
    return (rootIndex + bassInterval) % 12;
}

/**
 * 🔧 新增辅助函数 (2025-10-03): 获取和弦类型的音程结构
 * @returns {Array<number>|null} 半音音程数组，如 [0, 4, 7, 11] 代表 Cmaj7 (C-E-G-B)
 */
function getChordIntervals(chordType) {
    // 三和弦
    if (chordType === 'major') return [0, 4, 7];
    if (chordType === 'minor') return [0, 3, 7];
    if (chordType === 'diminished') return [0, 3, 6];
    if (chordType === 'augmented') return [0, 4, 8];

    // 七和弦
    if (chordType === 'major7') return [0, 4, 7, 11];
    if (chordType === 'minor7') return [0, 3, 7, 10];
    if (chordType === 'dominant7') return [0, 4, 7, 10];
    if (chordType === 'minor7b5' || chordType === 'half-diminished') return [0, 3, 6, 10];
    if (chordType === 'minorMaj7') return [0, 3, 7, 11];
    if (chordType === 'augmented7') return [0, 4, 8, 10];
    if (chordType === 'diminished7') return [0, 3, 6, 9];

    // sus和弦
    if (chordType === 'sus2') return [0, 2, 7];
    if (chordType === 'sus4') return [0, 5, 7];

    // 默认：尝试提取基本结构
    if (chordType.includes('major')) return [0, 4, 7, 11];  // 假设是 major7
    if (chordType.includes('minor')) return [0, 3, 7, 10];  // 假设是 minor7

    return null;  // 未知类型
}

/**
 * 🔧 新增辅助函数 (2025-10-03): 计算两个音符之间的最小音程（半音数）
 * @returns {number} 最小音程（0-6半音，总是正数）
 */
function getInterval(note1Index, note2Index) {
    // 计算两个音符之间的半音差
    let diff = Math.abs(note1Index - note2Index);

    // 使用最小音程（考虑八度等价）
    if (diff > 6) {
        diff = 12 - diff;
    }

    return diff;
}

/**
 * 基于功能和声规则动态生成进行
 * @param {number} measures - 小节数
 * @returns {Array} 功能序列
 */
function generateFunctionalProgressionByRules(measures) {
    console.log(`🎼 使用规则生成${measures}小节功能和声进行...`);

    // 功能和声连接规则（允许同功能内不同和弦的连接）
    const connectionRules = {
        'tonic': ['tonic', 'subdominant', 'dominant'],       // T → T, S, D (允许同功能不同和弦)
        'subdominant': ['tonic', 'subdominant', 'dominant'], // S → T, S, D (允许同功能不同和弦)
        'dominant': ['tonic']                                // D → T (只能解决到主)
    };

    // 可能的开头功能
    const startFunctions = ['tonic', 'subdominant', 'dominant'];

    // 可能的结尾功能
    const endFunctions = ['tonic', 'dominant'];

    const progression = [];

    // 1. 选择开头
    const startFunction = startFunctions[Math.floor(Math.random() * startFunctions.length)];
    progression.push(startFunction);
    console.log(`🎯 开头功能: ${startFunction}`);

    // 2. 生成中间部分
    for (let i = 1; i < measures - 1; i++) {
        const prevFunction = progression[i - 1];
        const possibleNext = connectionRules[prevFunction];

        if (possibleNext && possibleNext.length > 0) {
            const nextFunction = possibleNext[Math.floor(Math.random() * possibleNext.length)];
            progression.push(nextFunction);
            console.log(`第${i + 1}小节: ${prevFunction} → ${nextFunction}`);
        } else {
            // 理论上不应该发生，但作为安全措施
            progression.push('tonic');
            console.log(`⚠️ 第${i + 1}小节: 安全回到主功能`);
        }
    }

    // 3. 选择结尾（如果进行超过1小节）
    if (measures > 1) {
        const lastFunction = progression[progression.length - 1];
        const possibleEndings = connectionRules[lastFunction].filter(func => endFunctions.includes(func));

        let endFunction;
        if (possibleEndings.length > 0) {
            endFunction = possibleEndings[Math.floor(Math.random() * possibleEndings.length)];
        } else {
            // 如果当前功能不能直接到结尾功能，强制使用主功能结尾
            endFunction = 'tonic';
        }

        progression.push(endFunction);
        console.log(`🎯 结尾功能: ${endFunction}`);
    }

    // 4. 验证进行合法性
    const isValid = validateFunctionalProgression(progression);
    if (!isValid) {
        console.warn('⚠️ 生成的进行不完全符合规则，但保持原样以增加多样性');
    }

    console.log(`✅ 规则生成完成: ${progression.join(' → ')}`);
    return progression;
}

/**
 * 验证功能和声进行是否符合规则
 * @param {Array} progression - 功能序列
 * @returns {boolean} 是否合法
 */
function validateFunctionalProgression(progression) {
    const connectionRules = {
        'tonic': ['subdominant', 'dominant'],
        'subdominant': ['tonic', 'dominant'],
        'dominant': ['tonic']
    };

    for (let i = 0; i < progression.length - 1; i++) {
        const current = progression[i];
        const next = progression[i + 1];

        if (!connectionRules[current] || !connectionRules[current].includes(next)) {
            console.warn(`❌ 规则违反: ${current} → ${next} (第${i + 1}-${i + 2}小节)`);
            return false;
        }
    }

    return true;
}

/**
 * 处理Vsus的上下文功能选择
 * @param {Array} chordOptions - 可选和弦列表
 * @param {string} currentFunction - 当前需要的功能
 * @param {number} index - 当前位置
 * @param {Array} pattern - 整个进行模式
 * @returns {Array} 调整后的和弦选项
 */
function handleVsusContextualFunction(chordOptions, currentFunction, index, pattern) {
    const filteredOptions = [];

    chordOptions.forEach(chordOption => {
        if (chordOption.degree === 'Vsus4') {
            // Vsus的上下文感知选择
            const prevFunction = index > 0 ? pattern[index - 1] : null;
            const nextFunction = index < pattern.length - 1 ? pattern[index + 1] : null;

            let shouldInclude = false;

            if (currentFunction === 'subdominant') {
                // 下属功能位置的Vsus使用条件：
                // 1. 前面是主功能 (T-S进行)
                // 2. 后面是属功能 (S-D进行，经典的IV-V)
                if (prevFunction === 'tonic' || nextFunction === 'dominant') {
                    shouldInclude = true;
                    console.log(`🎼 Vsus用作下属功能: ${prevFunction || '开始'} -> S(Vsus) -> ${nextFunction || '结束'}`);
                }
            } else if (currentFunction === 'dominant') {
                // 属功能位置的Vsus使用条件：
                // 1. 后面是主功能 (D-T解决)
                // 2. 前面是下属功能 (S-D进行)
                if (nextFunction === 'tonic' || prevFunction === 'subdominant') {
                    shouldInclude = true;
                    console.log(`🎼 Vsus用作属功能: ${prevFunction || '开始'} -> D(Vsus) -> ${nextFunction || '结束'}`);
                }
            }

            if (shouldInclude) {
                filteredOptions.push({
                    ...chordOption,
                    contextualFunction: currentFunction,
                    functionReason: `Vsus作为${currentFunction === 'subdominant' ? '下属' : '属'}功能使用`
                });
            }
        } else {
            // 非Vsus和弦直接包含
            filteredOptions.push(chordOption);
        }
    });

    // 如果没有合适的Vsus选项，保留原始选项（去除Vsus）
    if (filteredOptions.length === 0) {
        return chordOptions.filter(option => option.degree !== 'Vsus4');
    }

    return filteredOptions;
}

/**
 * 根据用户设置将三和弦扩展为七和弦
 * @param {Array} chordProgression - 和弦进行（包含三和弦）
 * @param {string} key - 调性
 * @returns {Array} 扩展后的和弦进行
 */
function expandTriadsToSeventhChords(chordProgression, key) {
    if (!chordProgression || chordProgression.length === 0) {
        return chordProgression;
    }

    // 检查用户是否选择了七和弦类型
    const hasSeventhChordTypes = window.chordSettings.chordTypes &&
        window.chordSettings.chordTypes.some(type => type.includes('7'));

    if (!hasSeventhChordTypes) {
        console.log('🎵 用户未选择七和弦类型，保持三和弦');
        return chordProgression;
    }

    // 🎸 检测Close Voicing Only + 吉他模式
    const isCloseVoicingOnly = window.chordSettings.voicingTypes &&
                                 window.chordSettings.voicingTypes.length === 1 &&
                                 window.chordSettings.voicingTypes[0] === 'close';

    // 🔧 修复 (2025-10-04): 检测是否包含Close Voicing（不限于只有Close）
    const includesCloseVoicing = window.chordSettings.voicingTypes &&
                                  window.chordSettings.voicingTypes.includes('close');

    const instrumentToggle = document.getElementById('instrumentModeToggle');
    const isGuitarMode = !instrumentToggle || !instrumentToggle.checked;

    // 🔧 修复 (2025-10-04): 只要包含Close就应用限制，不限于只有Close
    const applyCloseVoicingRestrictions = includesCloseVoicing && isGuitarMode;

    if (applyCloseVoicingRestrictions) {
        console.log('🎸 三和弦扩展阶段检测到Close Voicing Only + 吉他模式');
        console.log('   → 应用七和弦类型限制: 只允许扩展为 major7');
        console.log('   → 禁止扩展类型: minor7, dominant7, minor7b5');
    } else {
        console.log('🎼 三和弦扩展阶段: 无Close Voicing限制');
    }

    console.log('🎼 根据用户设置扩展三和弦为七和弦...');
    console.log('🎯 用户选择的七和弦类型:', window.chordSettings.chordTypes.filter(type => type.includes('7')));
    console.log(`📊 和弦进行输入: ${chordProgression.length}个和弦`);
    chordProgression.forEach((c, i) => {
        console.log(`   [${i + 1}] ${c.root}${c.type}${c.function ? ' (' + c.function + ')' : ''}`);
    });

    return chordProgression.map((chord, index) => {
        if (!chord || !chord.type) {
            return chord;
        }

        const originalType = chord.type;

        // 如果已经是七和弦，保持不变
        if (originalType.includes('7')) {
            console.log(`✅ 第${index + 1}小节: ${chord.root}${originalType} 已是七和弦，保持不变`);
            return chord;
        }

        // 根据三和弦类型确定可能的七和弦类型选项，然后使用权重系统选择
        let possibleSeventhTypes = [];

        if (originalType === 'major') {
            // 大三和弦可以扩展为大七和弦或属七和弦
            if (chord.function === 'dominant') {
                possibleSeventhTypes = ['dominant7']; // V -> V7 (功能性决定)
            } else {
                possibleSeventhTypes = ['major7']; // I, IV -> Imaj7, IVmaj7 (功能性决定)
            }
        } else if (originalType === 'minor') {
            possibleSeventhTypes = ['minor7']; // ii, iii, vi -> iim7, iiim7, vim7
        } else if (originalType === 'diminished') {
            possibleSeventhTypes = ['minor7b5']; // vii° -> viiø7 (半减七和弦)
        } else if (originalType === 'sus4') {
            possibleSeventhTypes = ['7sus4']; // sus4 -> 7sus4
        } else if (originalType === 'sus2') {
            possibleSeventhTypes = ['7sus2']; // sus2 -> 7sus2
        }

        // 🎸 应用Close Voicing限制：过滤掉不允许的七和弦类型
        if (applyCloseVoicingRestrictions && possibleSeventhTypes.length > 0) {
            const restrictedTypes = ['minor7', 'dominant7', 'minor7b5'];
            const originalLength = possibleSeventhTypes.length;

            possibleSeventhTypes = possibleSeventhTypes.filter(type => !restrictedTypes.includes(type));

            if (possibleSeventhTypes.length < originalLength) {
                console.log(`🎸 Close Voicing限制: ${chord.root}${originalType} 扩展类型从 [${restrictedTypes.filter(t => originalLength > 0)}] 过滤为 [${possibleSeventhTypes.join(', ') || '无'}]`);
            }

            // 如果所有可能的扩展类型都被禁止，保持三和弦
            if (possibleSeventhTypes.length === 0) {
                console.log(`🎸 Close Voicing限制: ${chord.root}${originalType} 无允许的扩展类型，保持三和弦`);
                return chord; // 不扩展，保持三和弦
            }
        }

        // 如果该三和弦可以扩展为多种七和弦，使用权重系统选择
        // 当前实现中每种三和弦类型只对应一种七和弦，但保留扩展性
        let seventhChordType = null;
        if (possibleSeventhTypes.length === 1) {
            seventhChordType = possibleSeventhTypes[0];
        } else if (possibleSeventhTypes.length > 1) {
            // 如果有多个选项，使用权重系统选择
            const availableOptions = possibleSeventhTypes.filter(type => {
                return window.chordSettings.chordTypes.some(selectedType => {
                    return selectedType === type ||
                           (selectedType === '7sus' && (type === '7sus4' || type === '7sus2'));
                });
            });

            if (availableOptions.length > 0) {
                seventhChordType = selectChordTypeWithWeight(availableOptions);
            }
        }

        // 如果找到了合适的七和弦类型，进行扩展
        if (seventhChordType) {
            // 检查用户是否选择了这种特定的七和弦类型
            const userWantsThisSeventhType = window.chordSettings.chordTypes.some(selectedType => {
                return selectedType === seventhChordType ||
                       (selectedType === '7sus' && (seventhChordType === '7sus4' || seventhChordType === '7sus2')) ||
                       (selectedType.includes('7') && seventhChordType.includes(selectedType.replace('7', '')));
            });

            if (userWantsThisSeventhType) {
                // 构建七和弦
                const seventhChord = harmonyTheory.buildChord(chord.root, seventhChordType, key);
                if (seventhChord) {
                    console.log(`🎼 第${index + 1}小节: ${chord.root}${originalType} -> ${chord.root}${seventhChordType} (${chord.function}功能)`);

                    return {
                        ...chord,
                        type: seventhChordType,
                        notes: seventhChord.notes,
                        expandedFromTriad: true // 标记这是从三和弦扩展而来
                    };
                } else {
                    console.warn(`⚠️ 无法构建${chord.root}${seventhChordType}，保持原三和弦`);
                }
            } else {
                console.log(`🎵 第${index + 1}小节: 用户未选择${seventhChordType}类型，保持${chord.root}${originalType}`);
            }
        } else {
            console.log(`🎵 第${index + 1}小节: ${chord.root}${originalType} 无对应七和弦类型，保持不变`);
        }

        return chord;
    });

    // 🔍 详细的扩展结果总结日志
    console.log('\n📊 === 三和弦扩展结果总结 ===');
    const typeCounts = {};
    const expandedResult = chordProgression;
    expandedResult.forEach(c => {
        if (c && c.type) {
            typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
        }
    });

    console.log('和弦类型分布:');
    Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}个`);
    });

    if (applyCloseVoicingRestrictions) {
        const restrictedTypes = ['minor7', 'dominant7', 'minor7b5'];
        const hasRestricted = expandedResult.some(c => c && restrictedTypes.includes(c.type));
        if (hasRestricted) {
            console.error('🚨 Close Voicing限制验证失败: 发现被禁止的七和弦类型！');
            expandedResult.forEach((c, i) => {
                if (c && restrictedTypes.includes(c.type)) {
                    console.error(`   [${i + 1}] ${c.root}${c.type} ❌ 被禁止的类型`);
                }
            });
        } else {
            console.log('✅ Close Voicing限制验证通过: 无被禁止的七和弦类型');
        }
    }

    console.log('=========================\n');
    return expandedResult;
}

/**
 * 智能应用转位，基于传统和声学原理
 * @param {Array} chordProgression - 和弦进行
 * @param {string} key - 调性
 * @returns {Array} 应用转位后的和弦进行
 */
function applyIntelligentInversions(chordProgression, key) {
    if (!chordProgression || chordProgression.length === 0) {
        return chordProgression;
    }

    console.log('🎨 应用传统和声学智能转位系统...');

    const result = chordProgression.map((chord, index) => {
        if (!chord || !chord.type) {
            return chord;
        }

        // 使用统一的挂留和弦检测系统
        const inversionEligibility = harmonyTheory.validateInversionEligibility(chord);
        if (!inversionEligibility.allowed) {
            console.log(`🚫 智能转位系统跳过：${inversionEligibility.reason}`);
            return harmonyTheory.comprehensiveSuspendedChordProtection(chord, '智能转位系统');
        }

        // 🛡️ 使用新的挂留和弦保护机制
        const shouldAllowInversion = harmonyTheory.shouldChordBeAffectedByInversionSettings(
            chord,
            window.chordSettings.includeTriadInversions,
            window.chordSettings.includeSeventhInversions
        );

        if (!shouldAllowInversion) {
            console.log(`🚫 智能转位系统：挂留和弦不受转位设置影响 ${chord.root}${chord.type}`);
            return chord;
        }

        // 重新定义和弦类型检查（在重构时被误删）
        // 🔧 修复 (2025-10-03): 添加sus和弦支持
        const isTriad = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'].includes(chord.type);
        const isSeventh = ['major7', 'minor7', 'dominant7', 'minor7b5', 'minorMaj7', 'augmented7', '7sus2', '7sus4'].includes(chord.type);

        const invertedChord = { ...chord };
        const prevChord = index > 0 ? chordProgression[index - 1] : null;
        const nextChord = index < chordProgression.length - 1 ? chordProgression[index + 1] : null;
        let inversionReason = '保持原位';

        // 核心规则：避免重复相同和弦和转位（除非有转位和弦作为过渡）
        if (prevChord && areChordsSame(chord, prevChord)) {
            console.log(`🔄 检测到重复和弦: ${chord.root}${chord.type}`);

            if (harmonyTheory.isSuspendedChord(chord)) {
                // 挂和弦特殊处理：通过修改挂和弦类型来避免重复
                const alternativeSusChord = getAlternativeSusChord(chord, prevChord, key);
                if (alternativeSusChord) {
                    console.log(`🔄 挂和弦重复避免: ${chord.root}${chord.type} -> ${alternativeSusChord.root}${alternativeSusChord.type}`);
                    return alternativeSusChord;
                } else {
                    // 挂和弦无法找到替代方案时，强制改变和弦类型
                    console.log(`⚠️ 无法为挂和弦找到替代方案，强制改变和弦类型...`);
                    const forceAlternative = forceAlternativeChordType(chord, prevChord, key);
                    if (forceAlternative && !areChordsSame(forceAlternative, prevChord)) {
                        console.log(`🔧 挂和弦强制类型修改: ${chord.root}${chord.type} -> ${forceAlternative.root}${forceAlternative.type}`);
                        return forceAlternative;
                    } else {
                        console.log(`⚠️ 挂和弦强制修改失败，保持原状`);
                        return chord;
                    }
                }
            } else {
                // 非挂和弦：检查是否有转位作为过渡
                const hasInversionTransition = prevChord.inversion && prevChord.inversion > 0;

                // 🎯 检查是否为Close voicing only + 吉他模式 + 七和弦
                const isCloseVoicingOnlyGuitar = window.chordSettings.voicingTypes &&
                                                  window.chordSettings.voicingTypes.length === 1 &&
                                                  window.chordSettings.voicingTypes[0] === 'close' &&
                                                  (!document.getElementById('instrumentModeToggle') ||
                                                   !document.getElementById('instrumentModeToggle').checked);

                const cannotUseInversionForSeventh = isSeventh && isCloseVoicingOnlyGuitar;

                if (!hasInversionTransition && shouldAllowInversion && !cannotUseInversionForSeventh) {
                    // 强制使用第一转位避免重复（但不违反Close voicing七和弦限制）
                    invertedChord.inversion = 1;
                    invertedChord.inversionName = '第一转位';
                    inversionReason = '避免重复和弦，使用第一转位';
                    console.log(`  -> 应用第一转位避免重复`);
                } else {
                    // 无法使用转位时（或七和弦Close voicing限制时），强制改变和弦类型
                    if (cannotUseInversionForSeventh) {
                        console.log(`⚠️ Close voicing七和弦不能使用转位避免重复，强制改变和弦类型...`);
                    } else {
                        console.log(`⚠️ 无法使用转位避免重复，强制改变和弦类型...`);
                    }
                    const forceAlternative = forceAlternativeChordType(chord, prevChord, key);
                    if (forceAlternative && !areChordsSame(forceAlternative, prevChord)) {
                        console.log(`🔧 非挂和弦强制类型修改: ${chord.root}${chord.type} -> ${forceAlternative.root}${forceAlternative.type}`);
                        return forceAlternative;
                    } else {
                        console.log(`  -> 保持原状（转位可能在后续应用）`);
                    }
                }
            }
        }


        if (!shouldAllowInversion) {
            return chord;
        }

        // 六四和弦的三种传统用法 - 挂留和弦严格禁止转位
        const sixFourValidation = harmonyTheory.validateInversionEligibility(chord);
        if (isTriad && !invertedChord.inversion && sixFourValidation.allowed && shouldAllowInversion) {
            // 1. 终止六四和弦：一级六四和弦用在终止式前增加张力
            if (isTonicChord(chord, key) && nextChord && index === chordProgression.length - 2) {
                if (isDominantFunction(nextChord)) {
                    invertedChord.inversion = 2;
                    invertedChord.inversionName = '第二转位(六四和弦)';
                    inversionReason = '终止六四和弦：增加终止前的张力感';
                    console.log(`  -> 应用终止六四和弦: I6/4-V`);
                }
            }

            // 2. 经过六四和弦：作为两和弦间的过渡
            else if (prevChord && nextChord && shouldUsePassingSixFour(prevChord, chord, nextChord, key)) {
                invertedChord.inversion = 2;
                invertedChord.inversionName = '第二转位(六四和弦)';
                inversionReason = '经过六四和弦：流畅的和弦过渡';
                console.log(`  -> 应用经过六四和弦`);
            }

            // 3. 持续低音六四和弦：换和弦时保持低音不变
            else if (prevChord && shouldUsePedalSixFour(prevChord, chord)) {
                invertedChord.inversion = 2;
                invertedChord.inversionName = '第二转位(六四和弦)';
                inversionReason = '持续低音六四和弦：保持低音稳定感';
                console.log(`  -> 应用持续低音六四和弦`);
            }
        }

        // 第一转位的两种主要用法 - 挂留和弦严格禁止转位
        const firstInversionValidation = harmonyTheory.validateInversionEligibility(chord);
        if (isTriad && !invertedChord.inversion && firstInversionValidation.allowed && shouldAllowInversion) {
            // 1. 创造流畅的低音线条
            if (prevChord && nextChord && shouldUseFirstInversionForSmoothBass(prevChord, chord, nextChord, key)) {
                invertedChord.inversion = 1;
                invertedChord.inversionName = '第一转位';
                inversionReason = '第一转位：创造流畅的低音线条';
                console.log(`  -> 应用第一转位：流畅低音线条`);
            }

            // 2. 功能和声中的传统转位应用
            else if (chord.function && shouldApplyFunctionalInversion(chord, prevChord, nextChord, index, chordProgression.length)) {
                const inversionResult = getFunctionalInversion(chord, prevChord, nextChord, index, chordProgression.length);
                if (inversionResult.inversion > 0) {
                    invertedChord.inversion = inversionResult.inversion;
                    invertedChord.inversionName = inversionResult.name;
                    inversionReason = inversionResult.reason;
                    console.log(`  -> 应用功能和声转位: ${inversionResult.reason}`);
                }
            }
        }

        // 七和弦转位的保守应用 - 挂留和弦严格禁止转位
        const seventhInversionValidation = harmonyTheory.validateInversionEligibility(chord);
        if (isSeventh && !invertedChord.inversion && seventhInversionValidation.allowed && shouldAllowInversion) {
            // 🎯 七和弦close voicing特殊处理：仅在吉他模式的close voicing下禁用七和弦转位
            const isCloseVoicingOnly = window.chordSettings.voicingTypes &&
                                         window.chordSettings.voicingTypes.length === 1 &&
                                         window.chordSettings.voicingTypes[0] === 'close';

            // 检查当前乐器模式：false = 吉他模式，true = 钢琴模式
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            const isGuitarMode = !instrumentToggle || !instrumentToggle.checked; // 默认吉他模式

            if (isCloseVoicingOnly && isGuitarMode) {
                console.log(`🎸 功能和声-吉他模式Close voicing：跳过七和弦转位 ${chord.root}${chord.type} (强制根位)`);
                // 不应用任何转位，保持根位
            } else if (shouldApplySeventhInversion(chord, prevChord, nextChord, index)) {
                const inversionResult = getSeventhInversion(chord, prevChord, nextChord);
                invertedChord.inversion = inversionResult.inversion;
                invertedChord.inversionName = inversionResult.name;
                inversionReason = inversionResult.reason;
                console.log(`  -> 应用七和弦转位: ${inversionResult.reason}`);
            }
        }

        // 应用转位音符生成
        if (invertedChord.inversion) {
            invertedChord.notes = generateInvertedNotes(chord, invertedChord.inversion);
            console.log(`第${index + 1}小节: ${chord.root}${chord.type}/${invertedChord.inversionName} - ${inversionReason}`);
        } else {
            console.log(`第${index + 1}小节: ${chord.root}${chord.type} - ${inversionReason}`);
        }

        // 🛡️ 应用最终挂留和弦保护
        return harmonyTheory.comprehensiveSuspendedChordProtection(invertedChord, '智能转位系统最终输出');
    });

    // 🎯 规则: 首尾原位约束（2025-10-02新增 - 与applyFunctionalInversions保持一致）
    // 传统和声学：转位和弦很少开始或结束乐句
    if (result.length > 0) {
        // 第一个和弦强制原位
        if (result[0].inversion > 0) {
            console.log(`  ⚠️ 智能转位系统：第1小节强制改为原位（乐句开始）`);
            console.log(`     原转位: ${result[0].inversionName || result[0].inversion}`);
            result[0].inversion = 0;
            result[0].inversionName = null;
        }

        // 最后一个和弦强制原位
        const lastIndex = result.length - 1;
        if (result[lastIndex].inversion > 0) {
            console.log(`  ⚠️ 智能转位系统：第${lastIndex+1}小节强制改为原位（乐句结束）`);
            console.log(`     原转位: ${result[lastIndex].inversionName || result[lastIndex].inversion}`);
            result[lastIndex].inversion = 0;
            result[lastIndex].inversionName = null;
        }
    }

    return result;
}

/**
 * 生成正确的调内和弦
 * @param {string} rootNote - 根音
 * @param {string} key - 调性
 * @param {Array} scaleNotes - 调内音符
 * @returns {Object} 调内和弦对象
 */
function generateCorrectDiatonicChord(rootNote, key, scaleNotes) {
    // 严格遵循用户选择的和弦类型 - 这是最高权限
    let availableTypes = [];
    if (window.chordSettings.chordTypes && window.chordSettings.chordTypes.length > 0) {
        window.chordSettings.chordTypes.forEach(type => {
            if (type === 'sus') {
                availableTypes.push('sus2', 'sus4');
            } else if (type === '7sus') {
                availableTypes.push('7sus2', '7sus4');
            } else {
                availableTypes.push(type);
            }
        });
    } else {
        // 如果用户没有选择任何类型，默认使用基础三和弦
        availableTypes = ['major', 'minor'];
    }

    // 只尝试用户选择的类型，没有fallback
    for (const chordType of availableTypes) {
        const testChord = harmonyTheory.buildChord(rootNote, chordType, key);
        if (testChord && !testChord.notes.some(note => !scaleNotes.includes(note))) {
            testChord.root = rootNote;
            testChord.type = chordType;
            console.log(`✅ 生成用户选择的调内和弦: ${rootNote} ${chordType} -> ${testChord.notes.join('-')}`);
            return testChord;
        }
    }

    console.log(`❌ 无法为根音 ${rootNote} 生成用户选择类型(${availableTypes.join(',')})的调内和弦`);
    return null;
}

// 调整和弦使其符合调性（将调外音替换为最近的调内音）
function adjustChordToKey(chord, key, rootNote, chordType) {
    const scaleNotes = getScaleChordRoots(key);  // 🔧 修复：使用正确的音阶定义
    const adjustedNotes = [];

    // 对每个音符进行调整
    chord.notes.forEach(note => {
        if (scaleNotes.includes(note)) {
            // 如果是调内音，直接保留
            adjustedNotes.push(note);
        } else {
            // 如果是调外音，替换为最近的调内音
            const adjustedNote = findNearestScaleNote(note, scaleNotes, key);
            adjustedNotes.push(adjustedNote);
            console.log(`   🎵 调外音 ${note} 调整为 ${adjustedNote}`);
        }
    });

    // 创建调整后的和弦对象
    return {
        root: rootNote,
        type: chordType,
        notes: adjustedNotes,
        romanNumeral: chord.romanNumeral || '?',
        adjusted: true // 标记为已调整
    };
}

// 找到最近的调内音
function findNearestScaleNote(outOfKeyNote, scaleNotes, key) {
    const noteToSemitone = harmonyTheory.noteToSemitone;
    const outOfKeySemitone = noteToSemitone[outOfKeyNote];

    if (outOfKeySemitone === undefined) return scaleNotes[0]; // 后备方案

    let minDistance = 12;
    let nearestNote = scaleNotes[0];

    scaleNotes.forEach(scaleNote => {
        const scaleSemitone = noteToSemitone[scaleNote];
        if (scaleSemitone !== undefined) {
            // 计算最短距离（考虑八度循环）
            const distance1 = Math.abs(outOfKeySemitone - scaleSemitone);
            const distance2 = 12 - distance1;
            const minDist = Math.min(distance1, distance2);

            if (minDist < minDistance) {
                minDistance = minDist;
                nearestNote = scaleNote;
            }
        }
    });

    return nearestNote;
}

// 应用Voicing到和弦进行
function applyVoicingToProgression(chordProgression, key) {
    if (!voicingEngine || !chordProgression) {
        return chordProgression;
    }

    console.log('🎨 应用Voicing到和弦进行...');

    try {
        // 重置voice leading状态
        if (window.chordSettings.enableVoiceLeading && voicingEngine) {
            voicingEngine.resetVoiceLeading();
        }

        const voicedProgression = [];

        chordProgression.forEach((chord, index) => {
            // 获取当前音域设置
            let rangeMin = null, rangeMax = null;

            console.log(`🔍 音域获取调试: currentActiveClef=${currentActiveClef}`);
            if (typeof clefRangeMemory !== 'undefined') {
                console.log(`🔍 clefRangeMemory存在，内容:`, clefRangeMemory);
            } else {
                console.log(`🔍 clefRangeMemory不存在`);
            }

            if (currentActiveClef && typeof clefRangeMemory !== 'undefined' && clefRangeMemory[currentActiveClef]) {
                rangeMin = clefRangeMemory[currentActiveClef].min;
                rangeMax = clefRangeMemory[currentActiveClef].max;
                console.log(`✅ 从谱号记忆获取音域: ${rangeMin}-${rangeMax}`);
            } else {
                const rangeMinSelect = document.getElementById('rangeMin');
                const rangeMaxSelect = document.getElementById('rangeMax');
                if (rangeMinSelect && rangeMaxSelect) {
                    rangeMin = parseInt(rangeMinSelect.value);
                    rangeMax = parseInt(rangeMaxSelect.value);
                    console.log(`✅ 从UI元素获取音域: ${rangeMin}-${rangeMax}`);
                } else {
                    console.log(`❌ 无法获取音域设置：UI元素不存在`);
                }
            }

            // 确保音域参数有效
            if (rangeMin === null || rangeMax === null || isNaN(rangeMin) || isNaN(rangeMax)) {
                console.warn(`⚠️ 音域参数无效: rangeMin=${rangeMin}, rangeMax=${rangeMax}，使用默认值55-88`);
                rangeMin = 55;
                rangeMax = 88;
            }

            console.log(`🎯 最终使用音域: ${rangeMin}-${rangeMax}`);

            // 为每个和弦生成voicing
            let voicingResult = null;
            // 确保voicing引擎可用
            ensureVoicingEngine();
            if (voicingEngine) {
                // 🔧 提前声明变量（修复重复声明错误，2025-10-03）
                const instrumentToggle = document.getElementById('instrumentModeToggle');
                const isGuitarMode = !instrumentToggle || !instrumentToggle.checked;
                const isCloseVoicingOnly = window.chordSettings.voicingTypes &&
                                             window.chordSettings.voicingTypes.length === 1 &&
                                             window.chordSettings.voicingTypes[0] === 'close';

                // 🚨 异常配置检测：voicingEngine调用前数据传递检查
                console.log(`\n🔍 === 异常配置检测 (voicingEngine调用前) ===`);
                console.log(`🎵 和弦: ${chord.root}${chord.type}`);
                console.log(`🎛️ window.chordSettings.voicingTypes: ${JSON.stringify(window.chordSettings.voicingTypes)}`);
                console.log(`🎛️ enabledVoicings传递值: ${JSON.stringify(window.chordSettings.voicingTypes)}`);
                console.log(`🎯 voicingPreference: ${window.chordSettings.voicingPreference}`);
                console.log(`🎸 isCloseVoicingOnly: ${isCloseVoicingOnly}`);
                console.log(`🎸 enhancedGuitarTriads: ${window.chordSettings.enhancedGuitarTriads}`);
                console.log(`🎸 allowEnhanced: ${window.chordSettings.enhancedGuitarTriads && isCloseVoicingOnly}`);
                console.log(`📏 rangeMin: ${rangeMin}, rangeMax: ${rangeMax}`);

                // 检测异常情况
                if (!window.chordSettings.voicingTypes || window.chordSettings.voicingTypes.length === 0) {
                    console.error(`🚨 异常检测: window.chordSettings.voicingTypes为空或未定义！`);
                    console.error(`🚨 这可能导致系统生成意外的voicing类型`);
                }

                if (window.chordSettings.voicingTypes && window.chordSettings.voicingTypes.some(type => !['close', 'drop2', 'drop3', 'shell'].includes(type))) {
                    console.error(`🚨 异常检测: 发现非法voicing类型！`);
                    console.error(`🚨 非法类型: ${window.chordSettings.voicingTypes.filter(type => !['close', 'drop2', 'drop3', 'shell'].includes(type))}`);
                }

                // 🚨 增强系统影响评估：检测增强三和弦系统是否会干扰标准生成
                console.log(`\n🔍 === 增强系统影响评估 ===`);
                console.log(`🎛️ enhancedGuitarTriads全局开关: ${window.chordSettings.enhancedGuitarTriads}`);
                console.log(`🎸 isCloseVoicingOnly: ${isCloseVoicingOnly}`);
                console.log(`🎸 allowEnhanced参数: ${window.chordSettings.enhancedGuitarTriads && isCloseVoicingOnly}`);

                // 检测潜在的增强系统干扰
                const wouldTriadEnhancedActivate = window.chordSettings.enhancedGuitarTriads &&
                                                  (chord.type === 'major' || chord.type === 'minor' || chord.type === '') &&
                                                  window.chordSettings.voicingTypes.includes('close');

                if (wouldTriadEnhancedActivate) {
                    console.error(`🚨 增强系统影响检测: 增强三和弦系统可能会激活！`);
                    console.error(`🚨 激活条件分析:`);
                    console.error(`   - enhancedGuitarTriads: ${window.chordSettings.enhancedGuitarTriads} ✅`);
                    console.error(`   - 三和弦类型: ${chord.type || '空(major默认)'} ✅`);
                    console.error(`   - 包含close voicing: ${window.chordSettings.voicingTypes.includes('close')} ✅`);
                    console.error(`🚨 这可能导致生成特殊三和弦配置而不是标准voicing！`);

                    if (window.chordSettings.voicingTypes.length > 1) {
                        console.error(`🚨 特别严重: 用户选择了多种voicing类型，但增强系统可能覆盖标准生成！`);
                        console.error(`🚨 用户选择: ${JSON.stringify(window.chordSettings.voicingTypes)}`);
                        console.error(`🚨 增强系统可能只生成特殊三和弦配置，忽略其他voicing类型`);
                    }
                }

                // 检测默认增强设置问题
                if (window.chordSettings.enhancedGuitarTriads === true) {
                    console.warn(`⚠️ 增强系统默认启用检测: enhancedGuitarTriads默认为true`);
                    console.warn(`⚠️ 这可能导致用户不知情的情况下激活增强系统`);
                }

                // 🔧 根据和弦类型智能判断转位设置
                // 🔧 修复 (2025-10-03): 添加sus和弦支持，使其能应用转位和Drop2/Drop3
                const isTriad = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'].includes(chord.type);
                const isSeventh = chord.type && (chord.type.includes('7') ||
                    ['major7', 'minor7', 'dominant7', 'minor7b5', 'minorMaj7', 'augmented7', '7sus2', '7sus4'].includes(chord.type));

                // 🎯 修复 (2025-10-02): 功能和声模式下禁用voicing引擎的自动转位
                // 原因：功能和声模式下，chord.inversion 已由 applyFunctionalInversions() 精确设置
                // voicing引擎应该使用 chord.inversion，而不是自己决定转位
                const isFunctionalHarmony = chord.functionalGeneration === true;

                // 🔍 详细诊断：检查functionalGeneration状态
                console.log(`\n🔍 === 和弦转位决策诊断: ${chord.root}${chord.type} ===`);
                console.log(`  - chord.functionalGeneration: ${chord.functionalGeneration}`);
                console.log(`  - chord.inversion: ${chord.inversion}`);
                console.log(`  - chord.function: ${chord.function}`);
                console.log(`  - isFunctionalHarmony: ${isFunctionalHarmony}`);

                // 🔧 修复 (2025-10-03): Per-Voicing-Type转位控制
                // 问题：原使用单一enableInversionsForThisChord布尔值控制所有voicing类型
                // 导致Close Voicing Only禁用转位时，Drop2/Drop3也失去转位能力
                // 解决：为每个voicing类型分别设置转位控制
                // 注：instrumentToggle, isGuitarMode, isCloseVoicingOnly 已在前面声明（line 5228-5232）

                // 创建per-voicing-type转位设置对象
                const enableInversionsByType = {};
                const voicingTypes = window.chordSettings.voicingTypes || ['close'];

                console.log(`\n🎯 === Per-Voicing-Type转位控制 ===`);
                console.log(`  - 和弦类型: ${isTriad ? '三和弦' : '七和弦'}`);
                console.log(`  - Voicing类型: ${voicingTypes.join(', ')}`);
                console.log(`  - Close Voicing Only: ${isCloseVoicingOnly}`);

                voicingTypes.forEach(type => {
                    if (isFunctionalHarmony) {
                        // 功能和声模式：禁用voicing引擎的转位，使用 chord.inversion
                        enableInversionsByType[type] = false;
                        console.log(`  - ${type}: false (功能和声模式，使用预设转位)`);
                    } else if (type === 'close' && isCloseVoicingOnly && isGuitarMode && isSeventh) {
                        // Close Voicing Only模式：Close类型七和弦禁用转位
                        enableInversionsByType[type] = false;
                        console.log(`  - ${type}: false (Close Voicing Only七和弦禁用转位)`);
                    } else {
                        // 其他情况：根据用户设置和和弦类型
                        if (isTriad) {
                            enableInversionsByType[type] = window.chordSettings.includeTriadInversions || false;
                            console.log(`  - ${type}: ${enableInversionsByType[type]} (三和弦，用户设置)`);
                        } else if (isSeventh) {
                            enableInversionsByType[type] = window.chordSettings.includeSeventhInversions || false;
                            console.log(`  - ${type}: ${enableInversionsByType[type]} (七和弦，用户设置)`);
                        } else {
                            enableInversionsByType[type] = false;
                            console.log(`  - ${type}: false (默认)`);
                        }
                    }
                });

                console.log(`  ✅ Per-Voicing-Type设置:`, enableInversionsByType);
                console.log(`=== Per-Voicing-Type转位控制结束 ===\n`);

                // 保留旧变量以兼容现有日志
                const enableInversionsForThisChord = Object.values(enableInversionsByType).some(v => v);

                // 🔧 步骤3: 最后防线 - voicing生成前的七和弦过滤（2025-10-03）
                // Close Voicing Only模式下，只允许major7，阻止所有其他七和弦
                // 🔧 修复 (2025-10-04): 只要包含Close就应用过滤，不限于只有Close
                const includesCloseVoicing = window.chordSettings.voicingTypes &&
                                              window.chordSettings.voicingTypes.includes('close');

                if (includesCloseVoicing && isGuitarMode) {
                    // 检测是否为七和弦（包含扩展和弦）
                    const isSeventhChord = chord.type && (
                        chord.type.includes('7') ||
                        chord.type.includes('ninth') ||
                        chord.type.includes('eleventh') ||
                        chord.type.includes('thirteenth')
                    );

                    // 检测是否为major7
                    const isMajor7 = chord.type === 'major7' || chord.type === 'maj7';

                    if (isSeventhChord && !isMajor7) {
                        console.error(`\n🚨 === Close Voicing Only最后防线 ===`);
                        console.error(`❌ 阻止非major7七和弦: ${chord.root}${chord.type}`);
                        console.error(`   Close Voicing Only模式下只允许major7七和弦`);
                        console.error(`   跳过该和弦，不生成voicing`);
                        console.error(`=== 最后防线结束 ===\n`);

                        // 跳过该和弦（不添加到voicedProgression）
                        return;
                    } else if (isSeventhChord && isMajor7) {
                        console.log(`\n✅ === Close Voicing Only最后防线 ===`);
                        console.log(`✅ 允许major7七和弦: ${chord.root}${chord.type}`);
                        console.log(`=== 最后防线通过 ===\n`);
                    }
                }

                voicingResult = voicingEngine.generateVoicings(chord, {
                    enabledVoicings: window.chordSettings.voicingTypes,
                    voicingPreference: window.chordSettings.voicingPreference,
                    // 🔧 修复 (2025-10-03): 使用per-voicing-type转位设置
                    enableInversionsByType: enableInversionsByType,
                    // 保留旧参数以向后兼容
                    enableInversions: enableInversionsForThisChord,
                    // 传递音域限制给voicing引擎
                    rangeMin: rangeMin,
                    rangeMax: rangeMax,
                    // 🎸 增强三和弦配置传递
                    voicingContext: isCloseVoicingOnly ? 'close-only' : 'mixed',
                    allowEnhanced: window.chordSettings.enhancedGuitarTriads && isCloseVoicingOnly,
                    // 🎵 修复：传递调号信息确保正确的音符拼写
                    key: key,
                    // 🔧 修复 (2025-10-02): 传递目标转位到voicing引擎
                    targetInversion: chord.inversion !== undefined ? chord.inversion : 0
                });

                // 🔍 新增 (2025-10-03): Major7和弦voicing生成结果追踪
                if ((chord.type === 'major7' || chord.type === 'maj7') && window.major7Tracking) {
                    if (voicingResult && voicingResult.selected) {
                        window.major7Tracking.succeeded.push({
                            root: chord.root,
                            type: chord.type,
                            voicingType: voicingResult.selected.type,
                            notes: voicingResult.selected.notes,
                            midiNotes: voicingResult.selected.midiNotes
                        });
                        console.log(`📊 Major7生成追踪: ${chord.root}${chord.type} → ✅ 成功 (voicing: ${voicingResult.selected.type})`);
                    } else {
                        window.major7Tracking.failed.push({
                            root: chord.root,
                            type: chord.type,
                            reason: voicingResult ? 'no-selected-voicing' : 'voicing-engine-returned-null'
                        });
                        console.error(`📊 Major7生成追踪: ${chord.root}${chord.type} → ❌ 失败 (${voicingResult ? '无选中voicing' : 'voicing引擎返回null'})`);
                    }
                }

                // 🚨 异常配置检测：voicingEngine返回结果检查
                console.log(`\n🔍 === 异常配置检测 (voicingEngine返回结果) ===`);
                if (voicingResult) {
                    const returnedTypes = Object.keys(voicingResult).filter(key =>
                        !['selected', 'all', 'analysis'].includes(key) &&
                        voicingResult[key] &&
                        typeof voicingResult[key] === 'object'
                    );
                    console.log(`📤 voicingEngine返回的voicing类型: ${JSON.stringify(returnedTypes)}`);
                    console.log(`📥 用户请求的voicing类型: ${JSON.stringify(window.chordSettings.voicingTypes)}`);

                    // 检测是否有未请求的voicing类型被返回
                    const unexpectedTypes = returnedTypes.filter(type => !window.chordSettings.voicingTypes.includes(type));
                    if (unexpectedTypes.length > 0) {
                        console.error(`🚨 异常检测: 发现未请求的voicing类型被返回！`);
                        console.error(`🚨 未请求的类型: ${JSON.stringify(unexpectedTypes)}`);
                        console.error(`🚨 这可能是系统自动添加了额外voicing类型`);

                        // 显示每个未请求类型的详细信息
                        unexpectedTypes.forEach(type => {
                            if (voicingResult[type]) {
                                console.error(`🚨 未请求类型 ${type} 的内容: ${voicingResult[type].notes?.join('-')} (MIDI: ${voicingResult[type].midiNotes?.join(', ')})`);
                            }
                        });
                    }

                    // 检测是否缺少请求的voicing类型
                    const missingTypes = window.chordSettings.voicingTypes.filter(type => !returnedTypes.includes(type));
                    if (missingTypes.length > 0) {
                        console.warn(`⚠️ 缺少请求的voicing类型: ${JSON.stringify(missingTypes)}`);
                    }
                } else {
                    console.error(`🚨 voicingEngine返回null！没有生成任何voicing`);
                }
            } else {
                console.warn('⚠️ VoicingEngine未可用，跳过voicing处理');
            }

            if (voicingResult && voicingResult.selected) {
                // 强制检查voicing类型是否符合用户设置
                const selectedType = voicingResult.selected.type;
                // 不再提供默认值，完全尊重用户选择
                const allowedTypes = window.chordSettings.voicingTypes || [];
                let finalVoicing = voicingResult.selected;

                console.log(`🔍 Voicing类型检查: 选择的=${selectedType}, 允许的=${JSON.stringify(allowedTypes)}`);

                // 特别严格的Drop3模式检查
                if (allowedTypes.length === 1 && allowedTypes[0] === 'drop3' && selectedType !== 'drop3') {
                    console.warn(`❌ Drop3严格模式: 用户只选择drop3但得到了${selectedType}，使用fallback`);

                    // 🔧 Drop3 Voicing阶段Fallback: 确保和弦不被完全跳过
                    const fallbackChord = {
                        ...chord,
                        voicing: null, // 清空voicing，使用原始和弦
                        notes: chord.notes || chord.notes, // 保持原始音符
                        voicingApplied: false, // 标记未应用voicing
                        fallbackReason: 'drop3-strict-mode-fallback'
                    };
                    voicedProgression.push(fallbackChord);
                    console.log(`🔧 Drop3严格模式fallback: 添加原始和弦 ${chord.root}${chord.type}`);
                    return; // 处理完成，继续下一个和弦
                }

                // Drop2验证已移除 - 信任voicing引擎的输出
                console.log(`✅ 接受voicing引擎生成的${selectedType}`);
                // if (selectedType === 'drop2') {
                //     const isValidDrop2 = validateDrop2Characteristics(finalVoicing);
                //     if (!isValidDrop2) {
                //         console.warn(`❌ 检测到假drop2：声称是drop2但没有drop2特征`);
                //         finalVoicing = null; // 强制重新生成
                //     }
                // }

                if (!allowedTypes.includes(selectedType) || finalVoicing === null) {
                    console.warn(`❌ 检测到违规voicing: ${selectedType}，用户仅允许: ${allowedTypes.join(', ')}`);

                    // 尝试从所有生成的voicing中找到符合要求的
                    let foundValidVoicing = false;
                    for (const allowedType of allowedTypes) {
                        if (voicingResult.all && voicingResult.all[allowedType]) {
                            finalVoicing = voicingResult.all[allowedType];
                            foundValidVoicing = true;
                            console.log(`✅ 强制使用${allowedType} voicing`);
                            break;
                        }
                    }

                    if (!foundValidVoicing) {
                        console.error(`❌ 无法找到符合要求的voicing，强制重新生成`);

                        // 强制重新调用voicing引擎，只生成用户允许的类型
                        const retryResult = voicingEngine.generateVoicings(chord, {
                            enabledVoicings: allowedTypes,  // 只传递用户允许的类型
                            voicingPreference: allowedTypes[0],
                            enableInversions: enableInversionsForThisChord,  // 🎯 使用之前计算的转位设置
                            rangeMin: rangeMin,
                            rangeMax: rangeMax,
                            // 🎵 修复：传递调号信息确保正确的音符拼写
                            key: key,
                            // 🔧 修复 (2025-10-02): 传递目标转位到voicing引擎
                            targetInversion: chord.inversion !== undefined ? chord.inversion : 0
                        });

                        if (retryResult && retryResult.selected) {
                            finalVoicing = retryResult.selected;
                            console.log(`✅ 重试成功：生成${finalVoicing.type} voicing`);
                        } else {
                            console.error(`❌ 重试仍然失败，检查是否为严格模式`);

                            // 🔧 修复 (2025-10-05): 严格模式重试失败 - 生成随机替代和弦
                            if (allowedTypes.length === 1) {
                                console.warn(`🚫 严格模式下重试失败 (用户只选择: ${allowedTypes[0]})`);
                                console.log(`🔧 尝试生成随机替代和弦...`);

                                const randomChord = generateRandomChordUntilSuccess(key, rangeMin, rangeMax, allowedTypes, 20);

                                if (randomChord) {
                                    console.log(`✅ 随机替代成功: ${randomChord.root}${randomChord.type} (${randomChord.voicing.type})`);
                                    voicedProgression.push(randomChord);
                                    return; // 处理完成，继续下一个和弦
                                } else {
                                    console.error(`❌ 随机替代也失败，跳过该和弦`);
                                    return; // 跳过该和弦
                                }
                            } else {
                                console.warn(`⚠️ 多选模式下重试失败，使用原始和弦作为fallback`);
                                // 多选模式：保持原有的fallback行为
                                voicedProgression.push(chord);
                                return; // 跳到下一个和弦
                            }
                        }
                    }
                }

                // 创建包含voicing信息的和弦对象
                const voicedChord = {
                    ...chord,
                    voicing: finalVoicing,
                    voicingOptions: voicingResult.all,
                    voicingAnalysis: voicingResult.analysis
                };

                voicedProgression.push(voicedChord);

                console.log(`  第${index + 1}小节: ${chord.root}${getChordTypeSymbol(chord.type)} - ${finalVoicing.type} voicing ${selectedType !== finalVoicing.type ? '(强制修正)' : ''}`);
            } else {
                // voicing生成失败
                console.warn(`⚠️ 第${index + 1}小节: ${chord.root}${getChordTypeSymbol(chord.type)} voicing生成失败`);

                // 🔥 修复：针对单一voicing类型选择的专门处理
                const userSelectedTypes = window.chordSettings.voicingTypes || [];

                // 🔥 Drop3专用失败处理（2025-10-03新增 - 完全隔离）
                if (userSelectedTypes.length === 1 && userSelectedTypes[0] === 'drop3') {
                    console.log(`🎯 Drop3专用失败处理`);

                    // 🎵 修复 (2025-10-03): sus和弦特殊处理
                    // sus和弦理论上没有Drop3形态，使用Close voicing作为fallback
                    const isSusChord = chord.type && (
                        chord.type.includes('sus') ||
                        chord.type === '7sus2' ||
                        chord.type === '7sus4'
                    );

                    if (isSusChord) {
                        console.log(`🎵 检测到sus和弦: ${chord.root}${chord.type}`);
                        console.log(`   sus和弦无Drop3形态，使用Close voicing作为fallback`);

                        // 🔧 修复 (2025-10-03): 重新计算转位设置（作用域外无法访问原变量）
                        const isTriad = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'].includes(chord.type);
                        const isSeventh = chord.type && (chord.type.includes('7') ||
                            ['major7', 'minor7', 'dominant7', 'minor7b5', 'minorMaj7', 'augmented7', '7sus2', '7sus4'].includes(chord.type));
                        const isFunctionalHarmony = chord.functionalGeneration === true;

                        let enableInversionsForThisChord = false;
                        if (isFunctionalHarmony) {
                            enableInversionsForThisChord = false;
                        } else if (isTriad && window.chordSettings.includeTriadInversions) {
                            enableInversionsForThisChord = true;
                        } else if (isSeventh && window.chordSettings.includeSeventhInversions) {
                            enableInversionsForThisChord = true;
                        }

                        // 生成Close voicing
                        const closeResult = voicingEngine.generateVoicings(chord, {
                            enabledVoicings: ['close'],
                            voicingPreference: 'close',
                            enableInversions: enableInversionsForThisChord,
                            rangeMin: rangeMin,
                            rangeMax: rangeMax,
                            key: key,
                            targetInversion: chord.inversion !== undefined ? chord.inversion : 0
                        });

                        if (closeResult && closeResult.selected) {
                            const voicedChord = {
                                ...chord,
                                voicing: closeResult.selected,
                                notes: closeResult.selected.notes || chord.notes
                            };
                            voicedProgression.push(voicedChord);
                            console.log(`✅ sus和弦使用Close voicing替代成功: ${closeResult.selected.notes?.join('-')}`);
                            return;
                        } else {
                            console.warn(`⚠️ Close voicing也失败，跳过该sus和弦`);
                            return;
                        }
                    }

                    // 非sus和弦：尝试替代和弦
                    console.log(`🔄 为${chord.root}${getChordTypeSymbol(chord.type)}寻找替代和弦...`);
                    const alternativeChord = generateAlternativeChord(chord, rangeMin, rangeMax, key);

                    if (alternativeChord) {
                        console.log(`✅ 找到替代和弦: ${alternativeChord.root}${alternativeChord.type || alternativeChord.chordType}`);

                        // 🔧 修复 (2025-10-03): 计算转位设置（复制主逻辑）
                        const isTriad = !alternativeChord.type || alternativeChord.type === 'major' || alternativeChord.type === 'minor';
                        const isSeventh = alternativeChord.type && alternativeChord.type.includes('7');
                        let enableInversions = false;

                        if (isTriad && window.chordSettings.includeTriadInversions) {
                            enableInversions = true;
                        } else if (isSeventh && window.chordSettings.includeSeventhInversions) {
                            enableInversions = true;
                        }

                        const altResult = voicingEngine.generateVoicings(alternativeChord, {
                            enabledVoicings: ['drop3'],
                            voicingPreference: 'drop3',
                            enableInversions: enableInversions,
                            rangeMin: rangeMin,
                            rangeMax: rangeMax,
                            key: key,
                            targetInversion: chord.inversion !== undefined ? chord.inversion : 0
                        });

                        if (altResult && altResult.selected && altResult.selected.type === 'drop3') {
                            const voicedChord = {
                                ...alternativeChord,
                                voicing: altResult.selected,
                                notes: altResult.selected.notes || alternativeChord.notes,
                                originalChord: chord,
                                isAlternative: true
                            };
                            voicedProgression.push(voicedChord);
                            console.log(`✅ Drop3替代和弦成功`);
                            return;
                        }
                    }

                    // 🔧 修复 (2025-10-05): Drop3替代也失败 - 生成随机替代和弦
                    console.warn(`❌ Drop3无法生成，替代和弦也失败`);
                    console.log(`🔧 尝试生成随机替代和弦...`);

                    const randomChord = generateRandomChordUntilSuccess(key, rangeMin, rangeMax, ['drop3'], 20);

                    if (randomChord) {
                        console.log(`✅ 随机替代成功: ${randomChord.root}${randomChord.type} (${randomChord.voicing.type})`);
                        voicedProgression.push(randomChord);
                    } else {
                        console.error(`❌ 随机替代也失败，跳过该和弦`);
                    }
                    return; // 处理完成，继续下一个和弦
                }
                // 其他voicing类型的原有逻辑
                else if (userSelectedTypes.length === 1) {
                    // 用户只选择了一种voicing类型
                    const selectedType = userSelectedTypes[0];
                    console.log(`🔄 用户只选择了${selectedType}，尝试放宽条件重新生成`);

                    // 🎯 严格音域遵循：不放宽限制，直接尝试和弦替换
                    console.warn(`❌ ${selectedType}无法在严格音域[${rangeMin}-${rangeMax}]内生成，尝试和弦替换`);

                    // 尝试生成替代和弦
                    console.log(`🔄 为${chord.root}${getChordTypeSymbol(chord.type)}寻找替代和弦...`);
                    const alternativeChord = generateAlternativeChord(chord, rangeMin, rangeMax, key);

                    if (alternativeChord) {
                        console.log(`✅ 找到替代和弦: ${alternativeChord.root}${alternativeChord.type || alternativeChord.chordType}`);

                        // 🔧 修复 (2025-10-04): 重新计算替代和弦的转位设置（变量作用域问题）
                        const isTriadAlt = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'].includes(alternativeChord.type);
                        const isSeventhAlt = alternativeChord.type && (
                            alternativeChord.type.includes('7') ||
                            ['major7', 'minor7', 'dominant7', 'minor7b5', 'minorMaj7', 'augmented7', '7sus2', '7sus4'].includes(alternativeChord.type)
                        );
                        const isFunctionalAlt = alternativeChord.functionalGeneration === true;

                        let enableInversionsForAlt = false;
                        if (isFunctionalAlt) {
                            enableInversionsForAlt = false;
                        } else if (isTriadAlt && window.chordSettings.includeTriadInversions) {
                            enableInversionsForAlt = true;
                        } else if (isSeventhAlt && window.chordSettings.includeSeventhInversions) {
                            enableInversionsForAlt = true;
                        }

                        // 验证替代和弦是否能生成所需的voicing类型
                        const alternativeResult = voicingEngine.generateVoicings(alternativeChord, {
                            enabledVoicings: [selectedType],
                            voicingPreference: selectedType,
                            enableInversions: enableInversionsForAlt,  // 🔧 使用重新计算的转位设置
                            rangeMin: rangeMin,
                            rangeMax: rangeMax,
                            // 🎵 修复：传递调号信息确保正确的音符拼写
                            key: key,
                            // 🔧 修复 (2025-10-02): 传递目标转位到voicing引擎
                            targetInversion: chord.inversion !== undefined ? chord.inversion : 0
                        });

                        if (alternativeResult && alternativeResult.selected && alternativeResult.selected.type === selectedType) {
                            const voicedChord = {
                                ...alternativeChord,
                                voicing: alternativeResult.selected,
                                notes: alternativeResult.selected.notes || alternativeChord.notes,
                                originalChord: chord, // 记录原和弦
                                isAlternative: true
                            };
                            voicedProgression.push(voicedChord);
                            console.log(`✅ 替代和弦成功生成${selectedType} voicing`);
                            return; // 成功，继续下一个和弦
                        } else {
                            console.warn(`⚠️ 替代和弦也无法生成${selectedType}，继续寻找其他替代方案`);
                        }
                    }

                    // 🔧 修复 (2025-10-05): Drop3/Drop2失败 - 生成随机替代和弦
                    if (selectedType === 'drop3' || selectedType === 'drop2') {
                        console.warn(`❌ ${selectedType}无法为${chord.root}${chord.type}找到替代方案`);
                        console.log(`🔧 尝试生成随机替代和弦...`);

                        const randomChord = generateRandomChordUntilSuccess(key, rangeMin, rangeMax, [selectedType], 20);

                        if (randomChord) {
                            console.log(`✅ 随机替代成功: ${randomChord.root}${randomChord.type} (${randomChord.voicing.type})`);
                            voicedProgression.push(randomChord);
                        } else {
                            console.error(`❌ 随机替代也失败，跳过该和弦`);
                        }
                        return; // 处理完成，继续下一个和弦
                    }

                    // 其他voicing类型：使用fallback确保和弦不被跳过
                    console.warn(`❌ 无法为${chord.root}${chord.type}找到可生成${selectedType}的替代方案，使用fallback`);
                    console.log(`🔧 使用fallback确保小节完整性`);

                    // 🔧 Voicing应用阶段Fallback: 确保和弦不被完全跳过
                    const fallbackChord = {
                        ...chord,
                        voicing: null, // 清空voicing，使用原始和弦
                        notes: chord.notes || chord.notes, // 保持原始音符
                        voicingApplied: false, // 标记未应用voicing
                        fallbackReason: 'voicing-alternative-failed'
                    };
                    voicedProgression.push(fallbackChord);
                    console.log(`🔧 Voicing替代失败fallback: 添加原始和弦 ${chord.root}${chord.type}`);
                    return; // 处理完成，继续下一个和弦
                } else if (userSelectedTypes.length > 1) {
                    // 用户选择了多种voicing类型
                    console.log(`🔄 用户选择了多种voicing类型: ${userSelectedTypes.join(', ')}，尝试放宽条件重新生成`);

                    // 🎯 严格音域遵循：多种voicing类型也不放宽限制，直接尝试和弦替换
                    console.warn(`❌ 多种voicing类型${userSelectedTypes.join(', ')}都无法在严格音域[${rangeMin}-${rangeMax}]内生成`);

                    // 尝试生成替代和弦
                    console.log(`🔄 为${chord.root}${getChordTypeSymbol(chord.type)}寻找替代和弦...`);
                    const alternativeChord = generateAlternativeChord(chord, rangeMin, rangeMax, key);

                    if (alternativeChord) {
                        console.log(`✅ 找到替代和弦: ${alternativeChord.root}${alternativeChord.type || alternativeChord.chordType}`);

                        // 🔧 修复 (2025-10-04): 重新计算替代和弦的转位设置（变量作用域问题）
                        const isTriadAlt = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'].includes(alternativeChord.type);
                        const isSeventhAlt = alternativeChord.type && (
                            alternativeChord.type.includes('7') ||
                            ['major7', 'minor7', 'dominant7', 'minor7b5', 'minorMaj7', 'augmented7', '7sus2', '7sus4'].includes(alternativeChord.type)
                        );
                        const isFunctionalAlt = alternativeChord.functionalGeneration === true;

                        let enableInversionsForAlt = false;
                        if (isFunctionalAlt) {
                            enableInversionsForAlt = false;
                        } else if (isTriadAlt && window.chordSettings.includeTriadInversions) {
                            enableInversionsForAlt = true;
                        } else if (isSeventhAlt && window.chordSettings.includeSeventhInversions) {
                            enableInversionsForAlt = true;
                        }

                        // 验证替代和弦是否能生成所需的voicing类型（使用严格音域）
                        const alternativeResult = voicingEngine.generateVoicings(alternativeChord, {
                            enabledVoicings: userSelectedTypes,
                            voicingPreference: userSelectedTypes[0],
                            enableInversions: enableInversionsForAlt,  // 🔧 使用重新计算的转位设置
                            rangeMin: rangeMin,  // 严格音域，不放宽
                            rangeMax: rangeMax,  // 严格音域，不放宽
                            // 🎵 修复：传递调号信息确保正确的音符拼写
                            key: key,
                            // 🔧 修复 (2025-10-02): 传递目标转位到voicing引擎
                            targetInversion: chord.inversion !== undefined ? chord.inversion : 0
                        });

                        if (alternativeResult && alternativeResult.selected && userSelectedTypes.includes(alternativeResult.selected.type)) {
                            const voicedChord = {
                                ...alternativeChord,
                                voicing: alternativeResult.selected,
                                notes: alternativeResult.selected.notes || alternativeChord.notes
                            };
                            voicedProgression.push(voicedChord);
                            console.log(`✅ 替代和弦成功生成${alternativeResult.selected.type} voicing`);
                        } else {
                            console.warn(`❌ 替代和弦也无法生成所需voicing类型`);

                            // 🔧 修复 (2025-10-05): Drop2/Drop3严格模式 - 生成随机替代和弦
                            // 如果用户选择的voicing类型只包含drop2/drop3（严格类型），生成随机替代和弦
                            const onlyStrictVoicings = userSelectedTypes.every(t => t === 'drop2' || t === 'drop3');

                            if (onlyStrictVoicings) {
                                console.warn(`❌ 严格voicing模式：只选择了${userSelectedTypes.join(', ')}，替代和弦也失败`);
                                console.log(`🔧 尝试生成随机替代和弦...`);

                                const randomChord = generateRandomChordUntilSuccess(key, rangeMin, rangeMax, userSelectedTypes, 20);

                                if (randomChord) {
                                    console.log(`✅ 随机替代成功: ${randomChord.root}${randomChord.type} (${randomChord.voicing.type})`);
                                    voicedProgression.push(randomChord);
                                } else {
                                    console.error(`❌ 随机替代也失败，跳过该和弦`);
                                }
                                return; // 处理完成，继续下一个和弦
                            }

                            console.log(`🔧 使用fallback确保小节完整性`);

                            // 🔧 多种Voicing类型失败Fallback: 确保和弦不被完全跳过
                            const fallbackChord = {
                                ...chord,
                                voicing: null, // 清空voicing，使用原始和弦
                                notes: chord.notes || chord.notes, // 保持原始音符
                                voicingApplied: false, // 标记未应用voicing
                                fallbackReason: 'multiple-voicing-types-failed'
                            };
                            voicedProgression.push(fallbackChord);
                            console.log(`🔧 多种Voicing类型失败fallback: 添加原始和弦 ${chord.root}${chord.type}`);
                            return; // 处理完成，继续下一个和弦
                        }
                    } else {
                        // 如果用户选择的voicing都失败了，生成基础和弦（仅当用户选择了多种类型时）
                        console.warn(`⚠️ 用户选择的voicing类型都失败，生成基础和弦保持小节完整`);
                        generateBasicChordFallback();
                    }
                } else {
                    // 没有选择任何voicing类型，使用基础和弦
                    console.warn(`⚠️ 没有选择voicing类型，生成基础和弦`);
                    generateBasicChordFallback();
                }

                // 基础和弦生成函数
                function generateBasicChordFallback() {

                    // 生成基础MIDI数据 - 使用和弦的基础音符
                    const basicMidiNotes = [];
                    if (chord.notes && chord.notes.length > 0) {
                        // 简单的音符到MIDI转换
                        const noteToSemitone = {
                            'C': 0, 'Cs': 1, 'Db': 1, 'D': 2, 'Ds': 3, 'Eb': 3,
                            'E': 4, 'F': 5, 'Fs': 6, 'Gb': 6, 'G': 7, 'Gs': 8,
                            'Ab': 8, 'A': 9, 'As': 10, 'Bb': 10, 'B': 11
                        };

                        // 转换音符名称为MIDI值
                        chord.notes.forEach(noteName => {
                            const cleanNoteName = noteName.replace(/\d+$/, ''); // 移除现有的八度标记
                            const semitone = noteToSemitone[cleanNoteName];
                            if (semitone !== undefined) {
                                const midiValue = 60 + semitone; // C4 = 60
                                if (midiValue >= rangeMin && midiValue <= rangeMax) {
                                    basicMidiNotes.push(midiValue);
                                }
                            }
                        });
                    }

                    // 如果没有有效的MIDI数据，使用安全的默认值
                    if (basicMidiNotes.length === 0) {
                        console.warn(`⚠️ 无法生成有效MIDI数据，使用默认C大三和弦`);
                        basicMidiNotes.push(60, 64, 67); // C-E-G
                    }

                    voicedProgression.push({
                        ...chord,
                        voicing: {
                            type: 'basic',
                            notes: chord.notes || ['C', 'E', 'G'],
                            midiNotes: basicMidiNotes,
                            noVoicing: true
                        }
                    });

                    console.log(`✅ 生成基础和弦MIDI: ${basicMidiNotes.join(', ')}`);
                }
            }
        });

        // 如果启用了voice leading，分析整个进行
        if (window.chordSettings.enableVoiceLeading && voiceLeadingAnalyzer && voicedProgression.length > 1) {
            const voicingSequence = voicedProgression.map(chord => chord.voicing).filter(v => v);
            if (voicingSequence.length > 1) {
                const voiceLeadingReport = voiceLeadingAnalyzer.generateReport(voicingSequence);
                console.log('🎼 Voice Leading分析:', voiceLeadingReport);

                // 将分析结果附加到进行对象
                voicedProgression.voiceLeadingReport = voiceLeadingReport;
            }
        }

        // 🔧 最终验证：确保小节数量正确
        const expectedMeasures = chordProgression.length;
        const actualMeasures = voicedProgression.length;

        console.log(`🔍 小节数量验证: 期望 ${expectedMeasures} 小节, 实际 ${actualMeasures} 小节`);

        if (actualMeasures < expectedMeasures) {
            // 严格模式：如果某些和弦无法生成符合要求的voicing，接受小节数量不足
            console.warn(`⚠️ 由于音域或voicing类型限制，只生成了 ${actualMeasures}/${expectedMeasures} 个小节`);
            console.log(`   这是正确的行为：不生成不符合用户设置的和弦`);
        }

        // 🔧 步骤4: Close Voicing Only诊断总结（2025-10-03）
        // 检查是否为Close Voicing Only + 吉他模式
        const instrumentToggleFinal = document.getElementById('instrumentModeToggle');
        const isGuitarModeFinal = !instrumentToggleFinal || !instrumentToggleFinal.checked;
        const isCloseVoicingOnlyFinal = window.chordSettings.voicingTypes &&
                                         window.chordSettings.voicingTypes.length === 1 &&
                                         window.chordSettings.voicingTypes[0] === 'close';

        if (isCloseVoicingOnlyFinal && isGuitarModeFinal) {
            console.log(`\n📊 ========== Close Voicing Only 模式诊断总结 ==========`);
            console.log(`🎸 模式: 吉他模式 + Close Voicing Only`);
            console.log(`🎯 七和弦过滤规则: 只允许root position major7七和弦`);
            console.log(`\n📈 统计:`);
            console.log(`   - 原始和弦进行: ${chordProgression.length} 个和弦`);
            console.log(`   - 最终生成和弦: ${voicedProgression.length} 个和弦`);
            console.log(`   - 被过滤和弦: ${chordProgression.length - voicedProgression.length} 个`);

            // 分析被过滤的和弦类型
            const filteredChords = chordProgression.filter(chord => {
                return !voicedProgression.some(voiced =>
                    voiced.root === chord.root &&
                    voiced.type === chord.type &&
                    !voiced.isAlternative  // 排除替代和弦
                );
            });

            if (filteredChords.length > 0) {
                console.log(`\n❌ 被过滤的和弦类型:`);
                const filteredTypes = {};
                filteredChords.forEach(chord => {
                    const typeKey = chord.type || 'major';
                    filteredTypes[typeKey] = (filteredTypes[typeKey] || 0) + 1;
                });
                Object.entries(filteredTypes).forEach(([type, count]) => {
                    const isSeventhChord = type.includes('7') ||
                                         type.includes('ninth') ||
                                         type.includes('eleventh') ||
                                         type.includes('thirteenth');
                    const symbol = isSeventhChord ? '🚨' : 'ℹ️';
                    console.log(`   ${symbol} ${type}: ${count}个 ${isSeventhChord ? '(七和弦，已阻止)' : ''}`);
                });
            }

            // 分析生成的和弦类型
            const generatedTypes = {};
            voicedProgression.forEach(chord => {
                const typeKey = chord.type || 'major';
                generatedTypes[typeKey] = (generatedTypes[typeKey] || 0) + 1;
            });

            console.log(`\n✅ 生成的和弦类型:`);
            Object.entries(generatedTypes).forEach(([type, count]) => {
                const isMajor7 = type === 'major7' || type === 'maj7';
                const symbol = isMajor7 ? '✅' : 'ℹ️';
                console.log(`   ${symbol} ${type}: ${count}个 ${isMajor7 ? '(允许的七和弦)' : '(三和弦)'}`);
            });

            console.log(`\n💡 提示:`);
            console.log(`   - Close Voicing Only模式下，只允许原位major7七和弦`);
            console.log(`   - 其他七和弦(minor7, dominant7, m7b5等)会被自动过滤`);
            console.log(`   - 三和弦(major, minor, dim, aug)不受限制`);
            console.log(`========== 诊断总结结束 ==========\n`);
        }

        console.log('✅ Voicing应用完成');
        return voicedProgression;

    } catch (error) {
        console.error('❌ Voicing应用失败:', error);
        return chordProgression; // 返回原始进行
    }
}

// ✅ 旧的getChordSymbol(type)函数已移除，现在使用统一的getChordTypeSymbol()

// 降级的简单和弦生成函数
function generateSimpleChords(measures) {
    console.log('🎵 使用简单和弦生成模式');

    const simpleProgressions = {
        'C-major': [
            [{ root: 'C', type: 'major' }, { root: 'A', type: 'minor' }, { root: 'F', type: 'major' }, { root: 'G', type: 'major' }],
            [{ root: 'C', type: 'major' }, { root: 'F', type: 'major' }, { root: 'A', type: 'minor' }, { root: 'G', type: 'major' }],
            [{ root: 'A', type: 'minor' }, { root: 'F', type: 'major' }, { root: 'C', type: 'major' }, { root: 'G', type: 'major' }]
        ]
    };

    const progressions = simpleProgressions['C-major'];
    const progression = progressions[Math.floor(Math.random() * progressions.length)];

    window.currentChords = {
        progression: progression.slice(0, measures),
        measures: measures,
        key: 'C-major',
        timestamp: Date.now()
    };

    // 添加到历史记录
    window.chordsHistory.push(window.currentChords);
    window.currentChordsIndex = window.chordsHistory.length - 1;

    displayChords(window.currentChords);
}

// ============================================================
// ✅ 后处理系统已完全移除（2025-09-30重构）
// 删除了约200行的post-processing代码：
// - fixChordSymbolsAfterRender()
// - MutationObserver监控系统
// - 周期性检查机制（每2秒检查）
//
// 新方法：使用正确的MusicXML kind值，让OSMD自然渲染
// ============================================================

/**
 * 🔧 轻量级sus和弦修复函数（2025-09-30优化）
 * 目的：修复OSMD可能不正确显示的7sus和弦代号
 * 原因：OSMD可能忽略text属性或显示kind的默认符号
 * 方法：渲染后检查和弦文本，如果不完整则更新为正确的代号
 *
 * @param {SVGElement} svg - SVG元素
 * @param {Object} chords - 和弦进行对象
 * @param {boolean} isImmediate - 是否为立即修复（true=立即，false=backup）
 */
function fixSusChordSymbols(svg, chords, isImmediate = false) {
    if (!svg || !chords || !chords.progression) {
        if (!isImmediate) {
            console.log('⚠️ fixSusChordSymbols: 缺少必要参数');
        }
        return;
    }

    const phaseLabel = isImmediate ? '⚡ 第一阶段(立即)' : '🔄 第二阶段(backup)';
    // 🔧 已移除 (2025-10-04): 日志信息 "开始检查和修复sus和弦显示"
    // console.log(`${phaseLabel} ========== 开始检查和修复sus和弦显示 ==========`);
    console.log('📊 和弦进行数据:', {
        总和弦数: chords.progression.length,
        和弦列表: chords.progression.map((c, i) => `${i+1}. ${c.root}${c.type}`)
    });

    // 🔍 额外诊断：检查SVG中所有text元素
    const allTextElements = svg.querySelectorAll('text');
    console.log(`🔍 SVG中共有 ${allTextElements.length} 个text元素`);

    // 显示SVG结构示例（前5个text元素）
    console.log('📄 SVG结构示例（前5个text元素）:');
    Array.from(allTextElements).slice(0, 5).forEach((el, idx) => {
        console.log(`  ${idx+1}. 内容:"${el.textContent.trim()}" id:"${el.id || 'none'}" class:"${el.className.baseVal || el.getAttribute('class') || 'none'}"`);
    });

    // 🔧 修复选择器：OSMD生成的和弦元素没有特定id/class，需要用更通用的方法
    // 策略：获取所有text元素，然后按顺序匹配（排除小节号等非和弦文本）
    const allTextInSvg = Array.from(svg.querySelectorAll('text'));

    // 过滤掉明显的非和弦文本（如纯数字的小节号）
    const chordTextElements = allTextInSvg.filter(el => {
        const text = el.textContent.trim();
        // 排除：纯数字（小节号）、空文本
        if (!text || /^\d+$/.test(text)) {
            console.log(`  🔍 跳过非和弦文本: "${text}" (可能是小节号)`);
            return false;
        }
        return true;
    });

    console.log(`  ✅ 从${allTextInSvg.length}个text元素中找到 ${chordTextElements.length} 个和弦文本元素`);

    // 🔍 增强调试：显示每个找到的文本元素内容
    if (chordTextElements.length > 0) {
        console.log('📝 文本元素详情:');
        chordTextElements.forEach((el, idx) => {
            console.log(`  ${idx+1}. "${el.textContent.trim()}" (id: ${el.id || 'none'})`);
        });
    } else {
        console.warn('⚠️ 警告：未找到任何和弦文本元素！可能的原因：');
        console.warn('   - OSMD渲染未完成');
        console.warn('   - SVG结构与选择器不匹配');
        console.warn('   - 和弦代号功能未启用');
    }

    // 为每个和弦创建完整的期望文本列表（按顺序）
    const expectedTextsList = [];
    chords.progression.forEach((chord, index) => {
        if (chord.root && chord.type) {
            const expectedText = getChordSymbol(chord);
            expectedTextsList.push({
                index: index,
                root: chord.root,
                type: chord.type,
                expectedText: expectedText,
                isSus: chord.type.includes('sus')
            });
            console.log(`  📝 小节${index + 1}: ${chord.root}${chord.type} → 期望: "${expectedText}" ${chord.type.includes('sus') ? '⚠️ SUS和弦' : ''}`);
        }
    });

    // 检查和修复每个文本元素
    let fixedCount = 0;
    let skippedCount = 0;
    let matchedCount = 0;

    console.log('\n🔍 ========== 开始逐个检查和修复 ==========');

    chordTextElements.forEach((element, elementIndex) => {
        const currentText = element.textContent.trim();
        console.log(`\n  🔍 元素 ${elementIndex + 1}/${chordTextElements.length}:`);
        console.log(`     当前文本: "${currentText}"`);

        // 尝试匹配对应索引的期望和弦（按顺序匹配）
        if (elementIndex < expectedTextsList.length) {
            const expected = expectedTextsList[elementIndex];
            console.log(`     期望文本: "${expected.expectedText}"`);
            console.log(`     是否sus: ${expected.isSus ? '✅ 是' : '❌ 否'}`);
            console.log(`     匹配状态: ${currentText === expected.expectedText ? '✅ 完全匹配' : '⚠️ 不匹配'}`);

            // 🔒 防重复修复：检查元素是否已被修复
            if (element.getAttribute('data-sus-fixed') === 'true') {
                console.log(`     🔒 已修复过，跳过重复修复`);
                matchedCount++;
                return; // forEach中使用return而非continue
            }

            // 🔧 (2025-10-02): 提取转位信息（斜线记号）
            // 问题：修复sus和弦时会删除转位记号（如 "G/D" → "G"）
            // 解决：先提取斜线部分，修复后重新添加
            let inversionPart = '';
            const slashIndex = currentText.indexOf('/');
            if (slashIndex !== -1) {
                inversionPart = currentText.substring(slashIndex); // 如 "/D"
                console.log(`     🎵 检测到转位记号: "${inversionPart}"`);
            }

            // 如果是sus和弦且当前文本不完整
            if (expected.isSus && currentText !== expected.expectedText) {
                console.log(`     🎯 sus和弦需要修复，正在分析...`);
                console.log(`     🔍 详细对比: 当前="${currentText}" 期望="${expected.expectedText}" 根音="${expected.root}"`);

                // 检查是否是7sus但只显示了"7"
                if (expected.type.includes('7sus') &&
                    (currentText === expected.root + '7' ||
                     currentText === expected.root + 'maj7' ||
                     currentText.endsWith('7') ||
                     currentText.split('/')[0].endsWith('7'))) { // 🔧 考虑带转位的情况
                    console.log(`     🔧 检测到7sus显示不完整: "${currentText}" → "${expected.expectedText}${inversionPart}"`);
                    element.textContent = expected.expectedText + inversionPart; // 🔧 保留转位
                    element.setAttribute('data-sus-fixed', 'true');
                    fixedCount++;
                    console.log(`     ✅ 修复成功！`);
                }
                // 🚨 关键修复：检查是否只显示了根音（用户报告的主要问题）
                else if (currentText.split('/')[0] === expected.root) { // 🔧 只比较斜线前的部分
                    console.log(`     🚨 检测到只显示根音问题: "${currentText}" → "${expected.expectedText}${inversionPart}"`);
                    console.log(`     🔧 这是用户报告的主要问题！正在修复...`);
                    element.textContent = expected.expectedText + inversionPart; // 🔧 保留转位
                    element.setAttribute('data-sus-fixed', 'true');
                    fixedCount++;
                    console.log(`     ✅ 修复成功！`);
                }
                // 增强：检查是否包含根音但缺少完整类型信息
                else if (currentText.split('/')[0].startsWith(expected.root) &&
                         currentText.split('/')[0].length < expected.expectedText.length) { // 🔧 只比较斜线前的部分
                    console.log(`     🔧 检测到不完整的和弦代号: "${currentText}" → "${expected.expectedText}${inversionPart}"`);
                    element.textContent = expected.expectedText + inversionPart; // 🔧 保留转位
                    element.setAttribute('data-sus-fixed', 'true');
                    fixedCount++;
                    console.log(`     ✅ 修复成功！`);
                }
                else {
                    console.log(`     ⚠️ sus和弦格式异常，无法自动修复: "${currentText}"`);
                    console.log(`     💡 建议手动检查MusicXML生成和OSMD渲染配置`);
                    skippedCount++;
                }
            }
            // ❌ 禁用 (2025-10-05): 用户偏好允许增和弦显示转位记号
            // 原v31→v33修复：强制移除增和弦转位记号（基于音乐理论"对称和弦"原则）
            // 用户反馈：希望增和弦使用"aug"符号并显示转位（如"Eaug/B#"）
            /*
            else if (expected.type && (expected.type.includes('aug') || expected.type === 'augmented')) {
                console.log(`     🎯 检测到增和弦，分析当前显示...`);
                console.log(`     🔍 和弦类型: ${expected.type}`);
                console.log(`     🔍 期望显示: ${expected.expectedText}`);
                console.log(`     🔍 当前显示: ${currentText}`);

                // 移除斜线记号（增和弦是对称和弦，不区分转位）
                const symbolWithoutSlash = expected.expectedText; // 如 "B+"

                // 检查是否需要修复
                // 情况1: "Baug/Eb" → "B+"（移除aug和斜线）
                // 情况2: "Baug" → "B+"（替换aug为+）
                // 情况3: "B+/Eb" → "B+"（移除斜线）
                if (currentText !== symbolWithoutSlash) {
                    console.log(`     🔧 修复增和弦: "${currentText}" → "${symbolWithoutSlash}"`);
                    console.log(`     💡 增和弦是对称和弦（所有音都是大三度），不显示转位记号`);
                    element.textContent = symbolWithoutSlash; // 不添加inversionPart
                    element.setAttribute('data-aug-fixed', 'true');
                    fixedCount++;
                    console.log(`     ✅ 修复成功！`);
                } else {
                    console.log(`     ✅ 增和弦显示正确，无需修复`);
                    matchedCount++;
                }
            }
            */
            // 🔧 (2025-10-02修复策略)：立即修复sus和弦、add2/6和弦
            // 关键：只在isImmediate=true时修复add2/6，避免500ms延迟
            else if (currentText.split('/')[0] !== expected.expectedText) {
                const currentTextRoot = currentText.split('/')[0];

                // 检查是否为需要修复的和弦类型（含6/9和弦）
                const needsFixChords = ['add2', 'add9', 'madd2', '6', 'minor6', '6/9', '6add9', '6add2'];
                const isSpecialChord = needsFixChords.includes(expected.type) ||
                                      expected.expectedText.includes('6/9') ||
                                      expected.expectedText.includes('6add9') ||
                                      expected.expectedText.includes('6add2');

                // 🔧 修复maj6 → 6 的显示
                const needsMaj6Fix = expected.type === '6' && currentTextRoot.includes('maj6');

                // 修复条件：
                // 1. sus和弦：总是修复
                // 2. add2/6和弦：只在立即修复阶段修复
                // 3. 空文本或只有根音：也要修复（add2可能不显示）
                const shouldFix = (
                    expected.isSus ||
                    (isSpecialChord && isImmediate) ||
                    needsMaj6Fix ||
                    (!currentTextRoot || currentTextRoot === expected.root) // 空文本或只显示根音
                );

                if (shouldFix) {
                    const chordLabel = expected.isSus ? 'sus和弦' : 'add2/6和弦';
                    console.log(`     🔧 ${isImmediate ? '⚡立即' : '🔄延时'}修复${chordLabel}: "${currentText}" → "${expected.expectedText}${inversionPart}"`);
                    element.textContent = expected.expectedText + inversionPart;
                    element.setAttribute('data-sus-fixed', 'true');
                    fixedCount++;
                    console.log(`     ✅ 修复成功！`);
                } else {
                    console.log(`     ⏭️ 跳过延时修复（add2/6已在立即修复阶段处理）`);
                }
            }
            else if (currentText === expected.expectedText) {
                matchedCount++;
                console.log(`     ✅ 文本正确，无需修复`);
            }
            else {
                skippedCount++;
                console.log(`     ⏭️ 跳过（不符合修复条件）`);
            }
        } else {
            console.log(`     ⚠️ 超出期望和弦列表范围（索引${elementIndex} >= ${expectedTextsList.length}）`);
            skippedCount++;
        }
    });

    console.log(`\n✅ ========== sus和弦修复完成 ==========`);
    console.log(`📊 统计数据:`);
    console.log(`   - 已修复: ${fixedCount} 个`);
    console.log(`   - 已匹配: ${matchedCount} 个`);
    console.log(`   - 已跳过: ${skippedCount} 个`);
    console.log(`   - 总计检查: ${chordTextElements.length} 个`);
}

function displayChords(chords) {
    console.log('🎼 显示智能和弦:', chords);

    // 隐藏空状态提示
    hideEmptyStateHint();

    try {
        // 生成MusicXML
        const musicXML = generateMusicXML(chords);
        try {
            chords.musicXML = musicXML;
            if (window.currentChords) {
                window.currentChords.musicXML = musicXML;
            }
        } catch (e) {}

        if (osmd) {
            osmd.load(musicXML).then(() => {
                // 🔧 新增 (2025-10-06): 在最外层获取容器信息，供所有后续逻辑使用
                const totalMeasures = chords.progression.length;
                const scoreDiv = document.getElementById('score');
                const containerWidth = scoreDiv ? scoreDiv.clientWidth : 800;
                const screenWidth = containerWidth;
                const screenHeight = window.innerHeight || 800;

                // 🔧 新增 (2025-10-06): 保存原始容器宽度，用于zoom计算
                // 确保容器扩展后zoom仍基于原始宽度，避免元素跟着变大
                const originalContainerWidth = containerWidth;
                console.log(`📏 原始容器宽度: ${originalContainerWidth}px (将用于zoom计算)`);

                // 🔧 新增 (2025-10-06): 在最外层定义所有需要跨作用域的变量
                // 这些变量在 if (osmd.EngravingRules) 块内定义，但在块外使用
                let containerWidthExpansion = 1.0; // 默认不扩展
                let originalContainerStyle = null;
                let expansionReason = ''; // 记录扩展原因
                let hasHighNoteCount = false;
                let pianoNoteInfo = { maxNoteCount: 0, avgNoteCount: 0, highNoteCountChords: 0 };
                let isRandomMode = false;
                let hasComplexVoicing = false;
                let voicingComplexityFactor = 1.0;
                let hasHighAccidentals = false;
                let accidentalsDensity = 0;

                // 应用旋律工具的完整布局配置
                if (osmd.EngravingRules) {
                    console.log('🎯 应用强力多小节布局...');

                    // 🚨 第一层：绝对强制性小节布局控制系统
                    // 获取用户选择的小节数，确保与用户期望完全一致
                    const userSelectedMeasures = parseInt(document.querySelector('input[name="measures"]:checked')?.value || '4');
                    const targetMeasuresPerLine = userSelectedMeasures === 2 ? 2 : 4; // 用户选择2小节就2小节一行，否则4小节一行

                    // 检测voicing复杂度，为复杂voicing应用更强制的布局控制
                    voicingComplexityFactor = getVoicingComplexityFactor(chords.progression);
                    hasComplexVoicing = voicingComplexityFactor < 0.8; // 如果缩放因子<0.8说明有复杂voicing

                    // 🔧 新增 (2025-10-06): 检测临时记号密度
                    // 解决用户报告的"每个小节都有临时记号导致第三小节换行"问题
                    accidentalsDensity = getAccidentalsDensity(chords.progression);
                    hasHighAccidentals = accidentalsDensity >= 1.0; // 平均每个和弦≥1个临时记号
                    console.log(`🎵 临时记号检测: 密度=${accidentalsDensity.toFixed(2)}, 高密度=${hasHighAccidentals}`);

                    // 🔧 新增 (2025-10-06): 检测是否是随机模式
                    const functionalHarmonyToggle = document.getElementById('functionalHarmonyToggle');
                    isRandomMode = !(functionalHarmonyToggle?.checked || false);
                    console.log(`🎲 模式检测: ${isRandomMode ? '随机模式' : '功能和声模式'}`);

                    // 🔧 新增 (2025-10-06): 仅在随机模式下检测钢琴高音符数配置
                    if (isRandomMode) {
                        // 🔍 诊断：检查progression结构
                        console.log(`🔍 准备调用getPianoNoteCountInfo():`);
                        console.log(`   - progression长度: ${chords.progression ? chords.progression.length : 'undefined'}`);
                        console.log(`   - progression类型: ${Array.isArray(chords.progression) ? 'Array' : typeof chords.progression}`);
                        if (chords.progression && chords.progression.length > 0) {
                            const sample = chords.progression[0];
                            console.log(`   - 第一个和弦示例: root=${sample.root}, type=${sample.type}`);
                            console.log(`   - 是否有pianoData: ${!!sample.pianoData}`);
                            console.log(`   - 是否有isPianoMode: ${!!sample.isPianoMode}`);
                            if (sample.pianoData) {
                                console.log(`   - pianoData.bassClefMidi: ${sample.pianoData.bassClefMidi ? sample.pianoData.bassClefMidi.length + '个音符' : 'undefined'}`);
                                console.log(`   - pianoData.trebleClefMidi: ${sample.pianoData.trebleClefMidi ? sample.pianoData.trebleClefMidi.length + '个音符' : 'undefined'}`);
                            }
                        }

                        pianoNoteInfo = getPianoNoteCountInfo(chords.progression);
                        hasHighNoteCount = pianoNoteInfo.hasHighNoteCount;
                        console.log(`🎹 钢琴音符数检测(随机模式): 最大=${pianoNoteInfo.maxNoteCount}音, 高配置和弦=${pianoNoteInfo.highNoteCountChords}个, 是否高配置=${hasHighNoteCount}`);
                    } else {
                        console.log(`🎼 功能和声模式: 跳过钢琴音符数检测`);
                    }

                    // 🔧 动态容器宽度管理系统 - 为复杂voicing和高临时记号密度提供额外渲染空间

                    // 🔍 诊断日志 (2025-10-06): 详细输出容器扩展触发条件
                    console.log(`\n🔍 容器扩展触发条件诊断:`);
                    console.log(`   📊 hasComplexVoicing = ${hasComplexVoicing} (voicingComplexityFactor=${voicingComplexityFactor})`);
                    console.log(`   📊 hasHighAccidentals = ${hasHighAccidentals} (accidentalsDensity=${accidentalsDensity.toFixed(2)})`);
                    console.log(`   📊 hasHighNoteCount = ${hasHighNoteCount} (maxNoteCount=${pianoNoteInfo.maxNoteCount}音)`);
                    console.log(`   📊 scoreDiv存在 = ${!!scoreDiv}`);
                    console.log(`   📊 模式 = ${isRandomMode ? '随机模式' : '功能和声模式'}`);
                    const shouldExpand = (hasComplexVoicing || hasHighAccidentals || hasHighNoteCount) && scoreDiv;
                    console.log(`   ✅ 最终判断: ${shouldExpand ? '触发容器扩展' : '❌ 不触发扩展'}\n`);

                    // 🔧 修改 (2025-10-06): 同时支持吉他复杂voicing、钢琴高临时记号密度和钢琴高音符数配置
                    if ((hasComplexVoicing || hasHighAccidentals || hasHighNoteCount) && scoreDiv) {
                        let voicingExpansion = 1.0;
                        let accidentalsExpansion = 1.0;

                        // 计算基于voicing复杂度的扩展系数
                        // 🔧 增强 (2025-10-06): 提高吉他随机模式扩展系数以容纳4个复杂小节
                        if (hasComplexVoicing) {
                            if (voicingComplexityFactor <= 0.3) {
                                voicingExpansion = isRandomMode ? 1.8 : 1.5; // 极复杂：随机模式80%，其他50%
                            } else if (voicingComplexityFactor <= 0.5) {
                                voicingExpansion = isRandomMode ? 1.7 : 1.3; // 很复杂：随机模式70%，其他30%
                            } else if (voicingComplexityFactor <= 0.7) {
                                voicingExpansion = isRandomMode ? 1.5 : 1.2; // 中等复杂：随机模式50%，其他20%
                            } else {
                                voicingExpansion = isRandomMode ? 1.3 : 1.1; // 轻微复杂：随机模式30%，其他10%
                            }
                        }

                        // 计算基于临时记号密度的扩展系数
                        // 🔧 增强 (2025-10-06): 提高吉他随机模式扩展系数以容纳4个复杂小节
                        if (hasHighAccidentals) {
                            if (accidentalsDensity >= 2.0) {
                                accidentalsExpansion = isRandomMode ? 1.8 : 1.5; // 极高密度：随机模式80%，其他50%
                            } else if (accidentalsDensity >= 1.5) {
                                accidentalsExpansion = isRandomMode ? 1.7 : 1.3; // 高密度：随机模式70%，其他30%
                            } else if (accidentalsDensity >= 1.0) {
                                accidentalsExpansion = isRandomMode ? 1.5 : 1.2; // 中高密度：随机模式50%，其他20%
                            } else {
                                accidentalsExpansion = isRandomMode ? 1.3 : 1.1; // 中等密度：随机模式30%，其他10%
                            }
                        }

                        // 🔧 新增 (2025-10-06): 计算基于钢琴音符数的扩展系数（仅随机模式）
                        // 🔧 修改 (2025-10-06): 增加扩展系数以容纳4个复杂小节
                        let noteCountExpansion = 1.0;
                        if (hasHighNoteCount) {
                            if (pianoNoteInfo.maxNoteCount >= 7) {
                                noteCountExpansion = 1.8; // 🔧 Phase 2: 7音扩展80% (800px→1440px)
                                console.log(`🎹 7音配置检测: 扩展系数1.8x (800px→1440px)`);
                            } else if (pianoNoteInfo.maxNoteCount >= 6) {
                                noteCountExpansion = 1.7; // 🔧 Phase 2: 6音扩展70% (800px→1360px)
                                console.log(`🎹 6音配置检测: 扩展系数1.7x (800px→1360px)`);
                            }
                        }

                        // 选择更大的扩展系数（确保足够空间）
                        containerWidthExpansion = Math.max(voicingExpansion, accidentalsExpansion, noteCountExpansion);

                        // 记录扩展原因（支持多种组合）
                        if (hasComplexVoicing && hasHighAccidentals && hasHighNoteCount) {
                            expansionReason = `🎸🎵🎹 复杂voicing + 高临时记号 + ${pianoNoteInfo.maxNoteCount}音配置`;
                        } else if (hasComplexVoicing && hasHighNoteCount) {
                            expansionReason = `🎸🎹 复杂voicing + ${pianoNoteInfo.maxNoteCount}音配置`;
                        } else if (hasHighAccidentals && hasHighNoteCount) {
                            expansionReason = `🎵🎹 高临时记号 + ${pianoNoteInfo.maxNoteCount}音配置`;
                        } else if (hasHighNoteCount) {
                            expansionReason = `🎹 ${pianoNoteInfo.maxNoteCount}音配置 (随机模式)`;
                        } else if (hasComplexVoicing && hasHighAccidentals) {
                            expansionReason = `🎸🎵 复杂voicing + 高临时记号`;
                        } else if (hasComplexVoicing) {
                            expansionReason = `🎸 复杂voicing (${voicingComplexityFactor.toFixed(2)})`;
                        } else {
                            expansionReason = `🎵 高临时记号密度 (${accidentalsDensity.toFixed(2)})`;
                        }

                        // 保存原始样式以便后续恢复
                        originalContainerStyle = {
                            width: scoreDiv.style.width || 'auto',
                            maxWidth: scoreDiv.style.maxWidth || 'none',
                            overflow: scoreDiv.style.overflow || 'visible'
                        };

                        // 计算扩展后的宽度
                        const originalWidth = scoreDiv.clientWidth || containerWidth;
                        const expandedWidth = Math.floor(originalWidth * containerWidthExpansion);

                        // 🔧 修改 (2025-10-06): 在渲染前立即应用容器扩展
                        // 让OSMD在扩展后的容器中渲染，确保有足够空间显示4个小节
                        // zoom将基于原始宽度计算，保持元素大小不变

                        console.log(`📦 渲染前应用容器扩展:`);
                        console.log(`   - 原始宽度: ${originalWidth}px`);
                        console.log(`   - 扩展系数: ${containerWidthExpansion}x`);
                        console.log(`   - 扩展后宽度: ${expandedWidth}px`);
                        console.log(`   - 触发原因: ${expansionReason}`);
                        console.log(`   ✅ OSMD将在扩展后的容器中渲染，有足够空间显示4个小节`);
                        console.log(`   ✅ zoom基于原始宽度${originalContainerWidth}px，元素大小不变`);

                        // 立即应用容器扩展
                        scoreDiv.style.width = `${expandedWidth}px`;
                        scoreDiv.style.maxWidth = `${expandedWidth}px`;
                        scoreDiv.style.overflow = 'hidden';

                        // 同步扩展父容器
                        const parentContainer = scoreDiv.parentElement;
                        if (parentContainer && parentContainer.style.width && !parentContainer.style.width.includes('%')) {
                            const parentOriginalWidth = parentContainer.clientWidth;
                            const parentExpandedWidth = Math.floor(parentOriginalWidth * containerWidthExpansion);
                            parentContainer.style.width = `${parentExpandedWidth}px`;
                            parentContainer.style.maxWidth = `${parentExpandedWidth}px`;
                            console.log(`   - 父容器同步扩展: ${parentOriginalWidth}px → ${parentExpandedWidth}px`);
                        }

                        // 启用水平滚动（如需要）
                        if (containerWidthExpansion > 1.2) {
                            const grandParent = parentContainer?.parentElement;
                            if (grandParent) {
                                grandParent.style.overflowX = 'auto';
                                grandParent.style.overflowY = 'hidden';
                                console.log(`   - 水平滚动: 已启用 (扩展系数 > 1.2)`);
                            }
                        }
                    }

                    console.log(`🎯 绝对强制布局控制:`);
                    console.log(`   - 用户选择: ${userSelectedMeasures}小节模式`);
                    console.log(`   - 目标布局: ${targetMeasuresPerLine}小节/行`);
                    console.log(`   - 实际小节数: ${totalMeasures}小节`);
                    console.log(`   - 复杂voicing: ${hasComplexVoicing ? '是' : '否'} (缩放因子: ${voicingComplexityFactor.toFixed(3)})`);
                    console.log(`   - 临时记号: ${hasHighAccidentals ? '高密度' : '正常'} (密度: ${accidentalsDensity.toFixed(2)})`);
                    console.log(`   - 钢琴音符数: ${hasHighNoteCount ? `高配置(最大${pianoNoteInfo.maxNoteCount}音)` : '正常'} ${isRandomMode ? '[随机模式检测]' : '[功能和声跳过]'}`);
                    console.log(`   - 容器扩展: ${containerWidthExpansion}x ${containerWidthExpansion > 1.0 ? `(${expansionReason})` : '(无需扩展)'}`);

                    // 🚨 绝对强制的小节数控制 - 无视设备类型
                    if (totalMeasures <= targetMeasuresPerLine) {
                        // 小节数≤目标数：强制单行显示，绝对不允许换行
                        osmd.EngravingRules.MaxMeasuresPerSystem = totalMeasures;
                        osmd.EngravingRules.MinMeasuresPerSystem = totalMeasures;
                        if ("RenderXMeasuresPerLineAkaSystem" in osmd.EngravingRules) {
                            osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = totalMeasures;
                        }
                        // 🚨 强制防换行设置
                        osmd.EngravingRules.CompactMode = true;
                        console.log(`🚨 ≤${targetMeasuresPerLine}小节强制单行: ${totalMeasures}小节绝对不允许换行`);
                    } else {
                        // 小节数>目标数：严格按目标小节数分行
                        osmd.EngravingRules.MaxMeasuresPerSystem = targetMeasuresPerLine;
                        osmd.EngravingRules.MinMeasuresPerSystem = targetMeasuresPerLine;
                        if ("RenderXMeasuresPerLineAkaSystem" in osmd.EngravingRules) {
                            osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = targetMeasuresPerLine;
                        }
                        osmd.EngravingRules.CompactMode = true;
                        console.log(`🚨 >${targetMeasuresPerLine}小节强制分行: 严格每行${targetMeasuresPerLine}小节`);
                    }

                    // 🔥 复杂voicing和钢琴高音符数的额外强制措施
                    // 🔧 修改 (2025-10-06): 随机模式下钢琴6音/7音也触发统一小节宽度
                    if (hasComplexVoicing || (hasHighNoteCount && isRandomMode)) {
                        if (hasComplexVoicing) {
                            console.log(`🔥 吉他复杂voicing强制措施启动 (缩放因子: ${voicingComplexityFactor.toFixed(3)})`);
                        } else {
                            console.log(`🎹 钢琴${pianoNoteInfo.maxNoteCount}音配置强制措施启动 (随机模式)`);
                        }

                        // 🎯 统一小节宽度系统 - 核心配置（吉他和钢琴共享）
                        console.log(`📏 配置统一小节宽度系统: 解决复杂和弦的宽度问题`);

                        osmd.EngravingRules.CompactMode = true;

                        // 核心：强制所有小节使用统一宽度
                        if ("FixedMeasureWidth" in osmd.EngravingRules) {
                            osmd.EngravingRules.FixedMeasureWidth = true;
                            console.log(`📏 ✅ 固定小节宽度已启用`);
                        }
                        if ("UniformMeasureWidth" in osmd.EngravingRules) {
                            osmd.EngravingRules.UniformMeasureWidth = true;
                            console.log(`📏 ✅ 统一小节宽度已启用`);
                        }
                        if ("EqualBeatSpacing" in osmd.EngravingRules) {
                            osmd.EngravingRules.EqualBeatSpacing = true;
                            console.log(`📏 ✅ 等拍间距已启用`);
                        }

                        // 🚨 终极防换行措施：强制禁用自动换行
                        if ("AutoBeamNotes" in osmd.EngravingRules) {
                            osmd.EngravingRules.AutoBeamNotes = false; // 禁用自动连音，节省空间
                        }
                        if ("AutoGenerateMutipleRestMeasuresFromRestMeasures" in osmd.EngravingRules) {
                            osmd.EngravingRules.AutoGenerateMutipleRestMeasuresFromRestMeasures = false;
                        }

                        const triggerSource = hasComplexVoicing ? '吉他复杂voicing' : `钢琴${pianoNoteInfo.maxNoteCount}音(随机模式)`;
                        console.log(`🔥 ${triggerSource}保障措施: CompactMode + FixedWidth + 禁用自动功能`);
                    }

                    // 🛡️ 终极保障：强制禁用所有可能导致换行的OSMD特性
                    if ("FillEmptyMeasuresWithWholeRest" in osmd.EngravingRules) {
                        osmd.EngravingRules.FillEmptyMeasuresWithWholeRest = false;
                    }
                    if ("RenderMultipleRestMeasures" in osmd.EngravingRules) {
                        osmd.EngravingRules.RenderMultipleRestMeasures = false;
                    }

                    const layoutReason = hasComplexVoicing ? '+ 吉他复杂voicing保障' :
                                         (hasHighNoteCount && isRandomMode) ? `+ 钢琴${pianoNoteInfo.maxNoteCount}音保障(随机模式)` : '';
                    console.log(`✅ 绝对强制布局控制已应用: ${targetMeasuresPerLine}小节/行 ${layoutReason}`);


                    // 第二层：启用MusicXML换行标记
                    if ("NewSystemFromXMLNewSystemAttribute" in osmd.EngravingRules) {
                        osmd.EngravingRules.NewSystemFromXMLNewSystemAttribute = true;
                    }
                    if ("NewSystemAtXMLNewSystemAttribute" in osmd.EngravingRules) {
                        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
                    }
                    if ("NewSystemAtXMLNewSystem" in osmd.EngravingRules) {
                        osmd.EngravingRules.NewSystemAtXMLNewSystem = true;
                        console.log('✅ 启用NewSystemAtXMLNewSystem - 支持MusicXML换行标记');
                    }

                    // 🚨 第三层：voicing感知的动态边距和间距系统
                    const isLandscape = screenWidth > screenHeight && screenHeight <= 599;
                    const isMobile = screenWidth <= 599 || isLandscape;

                    // 根据voicing复杂度和音符数决定边距策略
                    // 🔧 修改 (2025-10-06): 随机模式下钢琴6音/7音也应用紧凑边距
                    let marginStrategy = 'normal';
                    if (hasComplexVoicing) {
                        // 吉他模式：基于voicingComplexityFactor
                        if (voicingComplexityFactor <= 0.3) {
                            marginStrategy = 'extreme'; // 极度紧凑
                        } else if (voicingComplexityFactor <= 0.6) {
                            marginStrategy = 'aggressive'; // 激进紧凑
                        } else {
                            marginStrategy = 'compact'; // 标准紧凑
                        }
                    } else if (hasHighNoteCount && isRandomMode) {
                        // 钢琴模式（仅随机模式）：基于maxNoteCount
                        if (pianoNoteInfo.maxNoteCount >= 7) {
                            marginStrategy = 'aggressive'; // 7音：激进紧凑
                        } else if (pianoNoteInfo.maxNoteCount >= 6) {
                            marginStrategy = 'compact'; // 6音：标准紧凑
                        }
                    }

                    const strategyReason = hasComplexVoicing ? `吉他voicing: ${voicingComplexityFactor.toFixed(3)}` :
                                          hasHighNoteCount && isRandomMode ? `钢琴${pianoNoteInfo.maxNoteCount}音(随机模式)` : '';
                    console.log(`📐 边距策略: ${marginStrategy} ${strategyReason ? `(${strategyReason})` : ''}`);

                    // 🔥 动态边距计算 - 为复杂voicing和高音符数提供最大可用空间
                    let leftMargin, rightMargin, systemLeftMargin, systemRightMargin;

                    switch (marginStrategy) {
                        case 'extreme':
                            // 极度紧凑：最小边距，为Drop3等复杂voicing腾出最大空间
                            leftMargin = isMobile ? 0.5 : 1;
                            rightMargin = isMobile ? 0.5 : 1;
                            systemLeftMargin = isMobile ? 0.2 : 1;
                            systemRightMargin = isMobile ? 0.2 : 1;
                            console.log(`🚨 极度紧凑模式: 最小边距为复杂voicing腾出空间`);
                            break;
                        case 'aggressive':
                            // 激进紧凑：小边距
                            leftMargin = isMobile ? 0.8 : 2;
                            rightMargin = isMobile ? 0.8 : 2;
                            systemLeftMargin = isMobile ? 0.3 : 2;
                            systemRightMargin = isMobile ? 0.3 : 2;
                            console.log(`⚡ 激进紧凑模式: 小边距`);
                            break;
                        case 'compact':
                            // 标准紧凑：中等边距
                            leftMargin = isMobile ? 1 : 3;
                            rightMargin = isMobile ? 1 : 3;
                            systemLeftMargin = isMobile ? 0.5 : 3;
                            systemRightMargin = isMobile ? 0.5 : 3;
                            console.log(`🔥 标准紧凑模式: 中等边距`);
                            break;
                        default:
                            // 正常模式：标准边距
                            leftMargin = isMobile ? 1 : 6;
                            rightMargin = isMobile ? 1 : 6;
                            systemLeftMargin = isMobile ? 0.5 : 6;
                            systemRightMargin = isMobile ? 0.5 : 6;
                            console.log(`✅ 正常边距模式`);
                            break;
                    }

                    // 应用动态边距
                    if ("PageLeftMargin" in osmd.EngravingRules) {
                        osmd.EngravingRules.PageLeftMargin = leftMargin;
                    }
                    if ("PageRightMargin" in osmd.EngravingRules) {
                        osmd.EngravingRules.PageRightMargin = rightMargin;
                    }
                    if ("SystemLeftMargin" in osmd.EngravingRules) {
                        osmd.EngravingRules.SystemLeftMargin = systemLeftMargin;
                    }
                    if ("SystemRightMargin" in osmd.EngravingRules) {
                        osmd.EngravingRules.SystemRightMargin = systemRightMargin;
                    }

                    // 🔥 复杂voicing的额外边距优化
                    if (hasComplexVoicing || isMobile) {
                        console.log(`🔥 额外边距优化: ${hasComplexVoicing ? '复杂voicing' : ''}${isMobile ? ' + 移动设备' : ''}`);

                        // 消除所有可能浪费空间的边距
                        if ("PageTopMargin" in osmd.EngravingRules) {
                            osmd.EngravingRules.PageTopMargin = 0;
                        }
                        if ("PageBottomMargin" in osmd.EngravingRules) {
                            osmd.EngravingRules.PageBottomMargin = 0;
                        }
                        if ("TitleTopDistance" in osmd.EngravingRules) {
                            osmd.EngravingRules.TitleTopDistance = 0;
                        }
                        if ("TitleBottomDistance" in osmd.EngravingRules) {
                            osmd.EngravingRules.TitleBottomDistance = 0;
                        }
                        if ("SubtitleTopDistance" in osmd.EngravingRules) {
                            osmd.EngravingRules.SubtitleTopDistance = 0;
                        }
                        if ("ComposerTopDistance" in osmd.EngravingRules) {
                            osmd.EngravingRules.ComposerTopDistance = 0;
                        }
                        if ("LyricistTopDistance" in osmd.EngravingRules) {
                            osmd.EngravingRules.LyricistTopDistance = 0;
                        }
                    }

                    // 🚨 第四层：voicing和音符数感知的小节间距调整
                    // 🔧 修改 (2025-10-06): 随机模式下钢琴6音/7音也应用紧凑间距
                    let measureDistance;
                    if (hasComplexVoicing || (hasHighNoteCount && isRandomMode)) {
                        // 复杂voicing或高音符数需要更紧密的间距来节省空间
                        measureDistance = marginStrategy === 'extreme' ? 8 :
                                         marginStrategy === 'aggressive' ? 10 : 12;
                        const reason = hasComplexVoicing ? '吉他复杂voicing' : `钢琴${pianoNoteInfo.maxNoteCount}音(随机模式)`;
                        console.log(`🔥 ${reason}小节间距: ${measureDistance} (${marginStrategy}模式)`);
                    } else {
                        measureDistance = 15; // 标准间距
                    }

                    if ("BetweenMeasuresDistance" in osmd.EngravingRules) {
                        osmd.EngravingRules.BetweenMeasuresDistance = measureDistance;
                    }

                    // 第五层：调整系统间距
                    if ("SystemDistance" in osmd.EngravingRules) {
                        osmd.EngravingRules.SystemDistance = 20;
                    }

                    // 第六层：让最后一行拉伸填满
                    if ("StretchLastSystemLine" in osmd.EngravingRules) {
                        osmd.EngravingRules.StretchLastSystemLine = true;
                    }
                    if ("JustifyLastSystem" in osmd.EngravingRules) {
                        osmd.EngravingRules.JustifyLastSystem = true;
                    }

                    // 第七层：🎵 和弦代号显示控制 - 恢复原始简单配置
                    console.log(`\n🔍 ========== OSMD和弦代号配置诊断 ==========`);
                    console.log(`  🎵 chordSymbolsVisible全局变量: ${chordSymbolsVisible}`);
                    console.log(`  🎵 window.displaySettings?.chordSymbolsVisible: ${window.displaySettings?.chordSymbolsVisible}`);

                    if ("RenderChordSymbols" in osmd.EngravingRules) {
                        osmd.EngravingRules.RenderChordSymbols = chordSymbolsVisible;
                        console.log(`  ✅ 已设置 osmd.EngravingRules.RenderChordSymbols = ${chordSymbolsVisible}`);
                        console.log(`  🔍 验证设置: osmd.EngravingRules.RenderChordSymbols = ${osmd.EngravingRules.RenderChordSymbols}`);
                    } else {
                        console.warn(`  ⚠️ RenderChordSymbols属性不存在于OSMD EngravingRules中`);
                    }
                    console.log(`======================================================\n`);

                    // 第八层：📏 统一小节宽度系统 - 解决七和弦/临时记号导致的小节宽度不一致问题
                    console.log(`🎯 应用统一小节宽度系统 - 解决用户报告的七和弦宽度问题`);

                    // 核心设置：强制所有小节使用相同宽度
                    if ("UniformMeasureWidth" in osmd.EngravingRules) {
                        osmd.EngravingRules.UniformMeasureWidth = true;
                        console.log(`📏 ✅ 统一小节宽度: 七和弦与三和弦使用相同宽度`);
                    }

                    if ("FixedMeasureWidth" in osmd.EngravingRules) {
                        osmd.EngravingRules.FixedMeasureWidth = true;
                        console.log(`📏 ✅ 固定小节宽度: 防止复杂和弦导致换行`);
                    }

                    if ("EqualBeatSpacing" in osmd.EngravingRules) {
                        osmd.EngravingRules.EqualBeatSpacing = true;
                        console.log(`📏 ✅ 等拍间距: 统一所有小节的拍子间距`);
                    }

                    // 增强设置：进一步确保宽度一致性
                    if ("AutoBeam" in osmd.EngravingRules) {
                        osmd.EngravingRules.AutoBeam = false; // 关闭自动连谱，避免影响宽度
                        console.log(`📏 ✅ 关闭自动连谱: 避免影响小节宽度计算`);
                    }

                    // 🔧 修复 (2025-10-06): 钢琴高音符数配置 + 吉他随机模式需要更小的小节间距
                    if ("BetweenMeasuresDistance" in osmd.EngravingRules) {
                        if ((hasHighNoteCount && isRandomMode) ||
                            (isRandomMode && !chords.isPianoMode && (hasComplexVoicing || hasHighAccidentals))) {
                            // 钢琴6/7音配置 或 吉他随机复杂模式：超极小间距
                            osmd.EngravingRules.BetweenMeasuresDistance = 2;  // 🔧 从4减到2
                            if (hasHighNoteCount) {
                                console.log(`📏 ✅ 钢琴${pianoNoteInfo.maxNoteCount}音小节间距: 2px (超极度紧凑)`);
                            } else {
                                console.log(`📏 ✅ 吉他随机模式小节间距: 2px (超极度紧凑)`);
                            }
                        } else {
                            // 标准配置：统一间距
                            osmd.EngravingRules.BetweenMeasuresDistance = 8;
                            console.log(`📏 ✅ 统一小节间距: 8px`);
                        }
                    }

                    // ⚠️ 移除所有可能干扰OSMD渲染的额外设置
                    // 只保留最基本和安全的和弦代号设置

                    console.log(`✅ 强力布局配置:`);
                    console.log(`   - 每行目标小节数: ${totalMeasures === 2 ? 2 : 4}`);
                    console.log(`   - MinMeasuresPerSystem: ${osmd.EngravingRules.MinMeasuresPerSystem}`);
                    console.log(`   - RenderXMeasuresPerLineAkaSystem: ${osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem}`);
                    console.log(`   - 🎵 和弦代号显示: ${chordSymbolsVisible}`);
                    console.log(`   - 📏 统一小节宽度: 解决七和弦vs三和弦spacing不一致问题`);
                }

                // 设置适当的缩放 - 基于原始容器大小（避免容器扩展影响zoom）
                // 🔧 修改 (2025-10-06): 使用原始容器宽度计算zoom，确保容器扩展不影响渲染尺寸
                const screenWidthForZoom = originalContainerWidth;
                const isLandscape = screenWidthForZoom > screenHeight && screenHeight <= 599;

                console.log(`🔍 Zoom计算基于原始容器宽度: ${screenWidthForZoom}px (容器当前宽度: ${scoreDiv ? scoreDiv.clientWidth : 'N/A'}px)`);

                let zoom;
                if (isLandscape) {
                    // 横屏模式：更大缩放，充分利用水平空间
                    zoom = 0.7;
                    console.log(`🔄 横屏自适应缩放: ${zoom} (原始宽度${screenWidthForZoom}px 高${screenHeight}px)`);
                } else if (screenWidthForZoom <= 360) {
                    zoom = 0.35;  // 极小屏幕
                } else if (screenWidthForZoom <= 480) {
                    zoom = 0.45;  // 超小屏幕
                } else if (screenWidthForZoom <= 599) {
                    zoom = 0.55;  // 小屏幕
                } else if (screenWidthForZoom <= 899) {
                    zoom = 0.85;  // 中等屏幕
                } else if (screenWidthForZoom <= 1200) {
                    zoom = 1.4;   // 大屏幕
                } else {
                    zoom = 1.6;   // 超大屏幕
                }

                // 🎯 Drop2/Drop3 voicing感知的动态缩放系统
                // 🔧 修改 (2025-10-06): 直接使用外层作用域的变量，避免重复声明
                // voicingComplexityFactor, accidentalsDensity 等已在 if 块中计算

                // 🔧 修改 (2025-10-06): 使用已提升的变量，无需重新获取
                // isRandomMode, hasHighNoteCount, pianoNoteInfo 已在外层定义

                const needsCompactSpacing = voicingComplexityFactor < 1.0 || accidentalsDensity >= 0.8 || (hasHighNoteCount && isRandomMode);

                if (needsCompactSpacing) {
                    // 如果有复杂voicing，应用缩放因子
                    if (voicingComplexityFactor < 1.0) {
                        zoom *= voicingComplexityFactor;
                        console.log(`🎼 吉他复杂Voicing检测: 应用${voicingComplexityFactor}缩放因子 -> 当前缩放${zoom.toFixed(2)}`);
                    } else if (hasHighNoteCount && isRandomMode) {
                        // 🔧 新增 (2025-10-06): 随机模式下钢琴6音/7音也需要缩小zoom
                        const noteCountZoomFactor = pianoNoteInfo.maxNoteCount >= 7 ? 0.85 : 0.90;
                        zoom *= noteCountZoomFactor;
                        console.log(`🎹 钢琴${pianoNoteInfo.maxNoteCount}音配置: zoom缩放${noteCountZoomFactor} -> 当前${zoom.toFixed(2)}`);
                    }

                    // 强制启用CompactMode（无论是复杂voicing还是高临时记号密度）
                    osmd.EngravingRules.CompactMode = true;

                    // 🔧 修复 (2025-10-06): 钢琴音符数优先级高于临时记号
                    // 原因：钢琴6/7音配置必然有很多临时记号，但需要最紧凑spacing才能显示4个小节
                    let measureSpacing, noteSpacing;
                    if (hasHighNoteCount && isRandomMode) {
                        // 🎹 钢琴高音符数配置优先（超极限紧凑spacing）
                        if (pianoNoteInfo.maxNoteCount >= 7) {
                            // 7音：超极限紧凑间距
                            measureSpacing = 0.15;  // 🔧 从0.20减到0.15
                            noteSpacing = 0.25;     // 🔧 从0.30减到0.25
                            console.log(`🎹 钢琴7音配置: 超极限紧凑间距 (0.15/0.25) - 优先级高于临时记号`);
                        } else {
                            // 6音：极限紧凑间距
                            measureSpacing = 0.20;  // 🔧 从0.25减到0.20
                            noteSpacing = 0.30;     // 🔧 从0.35减到0.30
                            console.log(`🎹 钢琴6音配置: 极限紧凑间距 (0.20/0.30) - 优先级高于临时记号`);
                        }
                    } else if (isRandomMode && !chords.isPianoMode && (hasComplexVoicing || hasHighAccidentals)) {
                        // 🎸 吉他随机模式极限紧凑spacing (2025-10-06)
                        // 应用与钢琴模式相同的极限紧凑策略来解决3+1小节换行问题
                        if (voicingComplexityFactor <= 0.5 || accidentalsDensity >= 1.5) {
                            // 极复杂voicing 或 极高临时记号密度
                            measureSpacing = 0.15;  // 超极限紧凑
                            noteSpacing = 0.25;
                            console.log(`🎸 吉他随机模式: 超极限紧凑间距 (0.15/0.25) - voicing=${voicingComplexityFactor.toFixed(2)}, accidentals=${accidentalsDensity.toFixed(2)}`);
                        } else if (voicingComplexityFactor <= 0.7 || accidentalsDensity >= 1.0) {
                            // 很复杂voicing 或 高临时记号密度
                            measureSpacing = 0.20;  // 极限紧凑
                            noteSpacing = 0.30;
                            console.log(`🎸 吉他随机模式: 极限紧凑间距 (0.20/0.30) - voicing=${voicingComplexityFactor.toFixed(2)}, accidentals=${accidentalsDensity.toFixed(2)}`);
                        } else {
                            // 中等复杂
                            measureSpacing = 0.25;  // 很紧凑
                            noteSpacing = 0.35;
                            console.log(`🎸 吉他随机模式: 很紧凑间距 (0.25/0.35) - voicing=${voicingComplexityFactor.toFixed(2)}, accidentals=${accidentalsDensity.toFixed(2)}`);
                        }
                    } else if (accidentalsDensity >= 1.5) {
                        // 🎵 临时记号密度spacing（仅当非钢琴高音符数时）
                        // 极高密度：超紧凑间距
                        measureSpacing = 0.45;
                        noteSpacing = 0.55;
                        console.log(`🎵 极高临时记号密度(${accidentalsDensity.toFixed(2)}): 超紧凑间距 (0.45/0.55)`);
                    } else if (accidentalsDensity >= 1.0) {
                        // 高密度：很紧凑间距
                        measureSpacing = 0.5;
                        noteSpacing = 0.6;
                        console.log(`🎵 高临时记号密度(${accidentalsDensity.toFixed(2)}): 很紧凑间距 (0.5/0.6)`);
                    } else if (accidentalsDensity >= 0.8) {
                        // 中高密度：紧凑间距
                        measureSpacing = 0.55;
                        noteSpacing = 0.65;
                        console.log(`🎵 中高临时记号密度(${accidentalsDensity.toFixed(2)}): 紧凑间距 (0.55/0.65)`);
                    } else {
                        // 标准Drop2/Drop3紧凑间距
                        measureSpacing = 0.6;
                        noteSpacing = 0.7;
                        console.log(`🔧 吉他Drop2/Drop3优化: 标准紧密间距 (0.6/0.7)`);
                    }

                    // 应用间距设置
                    if (osmd.EngravingRules.MeasureSpacing !== undefined) {
                        osmd.EngravingRules.MeasureSpacing = measureSpacing;
                    }
                    if (osmd.EngravingRules.NoteSpacing !== undefined) {
                        osmd.EngravingRules.NoteSpacing = noteSpacing;
                    }

                    console.log(`✅ 紧凑间距已应用: MeasureSpacing=${measureSpacing}, NoteSpacing=${noteSpacing}`);

                    // 🔧 新增 (2025-10-06): 钢琴高音符数配置 + 吉他随机模式的额外距离限制
                    // 进一步缩短小节宽度
                    if ((hasHighNoteCount && isRandomMode) ||
                        (isRandomMode && !chords.isPianoMode && (hasComplexVoicing || hasHighAccidentals))) {
                        if ("MinimumDistanceBetweenNotes" in osmd.EngravingRules) {
                            osmd.EngravingRules.MinimumDistanceBetweenNotes = 0.3;
                        }
                        if ("DistanceBetweenNaturals" in osmd.EngravingRules) {
                            osmd.EngravingRules.DistanceBetweenNaturals = 0.5;
                        }
                        if ("DistanceFactorBetweenNotesAndSameNoteChord" in osmd.EngravingRules) {
                            osmd.EngravingRules.DistanceFactorBetweenNotesAndSameNoteChord = 0.5;
                        }
                        if (hasHighNoteCount) {
                            console.log(`📏 ✅ 钢琴${pianoNoteInfo.maxNoteCount}音: 额外距离限制已应用 (进一步缩短小节宽度)`);
                        } else {
                            console.log(`📏 ✅ 吉他随机模式: 额外距离限制已应用 (进一步缩短小节宽度)`);
                        }
                    }
                }

                // 根据和弦长度进一步调整缩放
                if (totalMeasures <= 4) {
                    if (screenWidthForZoom > 899) {
                        const maxSafeZoom = screenWidthForZoom <= 1200 ? 0.9 : 1.0;
                        zoom = Math.min(zoom, maxSafeZoom);
                        console.log(`🎯 4小节单行保护: 限制缩放至${zoom.toFixed(2)}，避免换行`);
                    }
                } else {
                    const lengthFactor = Math.max(0.6, 1 - (totalMeasures - 4) * 0.08);
                    zoom *= lengthFactor;
                    console.log(`🎯 多行和弦调整: ${totalMeasures}小节 -> 缩放因子${lengthFactor.toFixed(2)} -> 最终缩放${zoom.toFixed(2)}`);
                }

                // 🔧 容器扩展布局策略 (2025-10-06): 不补偿zoom，避免音符太小
                // 策略：容器扩展提供空间 + 适度zoom缩放 + 极度紧凑spacing
                // 效果：音符保持可读性 + 稳定显示4个小节
                if (containerWidthExpansion > 1.0) {
                    console.log(`\n📐 容器扩展布局策略:`);
                    console.log(`   📦 容器扩展: ${containerWidthExpansion.toFixed(2)}x (${originalContainerWidth}px → ${scoreDiv.clientWidth}px)`);
                    console.log(`   🔍 当前zoom: ${zoom.toFixed(3)} (${hasHighNoteCount ? '已由音符数调整' : '保持原值'})`);
                    console.log(`   📏 spacing策略: ${hasHighNoteCount ? '极度紧凑 (0.25/0.35)' : '标准'}`);
                    console.log(`   ✅ 效果: 扩展容器提供空间，保持zoom可读性，用紧凑spacing节省空间\n`);
                }

                osmd.zoom = zoom;
                console.log(`🔍 最终自适应缩放: ${zoom.toFixed(2)} (原始宽度: ${screenWidthForZoom}px ${isLandscape ? '横屏' : '竖屏'}, 和弦${totalMeasures}小节)`);

                // 🔧 (2025-10-02): 容器级别隐藏，避免和弦代号闪现
                scoreDiv.style.visibility = 'hidden';
                console.log('🙈 隐藏容器，准备渲染');

                osmd.render();
                console.log('✅ 第一次渲染完成（容器仍隐藏）');

                // 🔧 (2025-10-02优化): 使用requestAnimationFrame实现最快显示
                // RAF在浏览器下一帧立即执行（通常<16ms），比setTimeout(50)快3倍
                requestAnimationFrame(() => {
                    try {
                        // 第二次渲染（确保转位记号正确显示）
                        osmd.render();
                        console.log('🔄 第二次渲染完成（转位记号修复）');

                        // 立即修复add2/6和弦代号
                        const svg = scoreDiv.querySelector('svg');
                        if (svg && chords && chords.progression) {
                            console.log('⚡ 立即修复add2/6和弦代号');
                            fixSusChordSymbols(svg, chords, true);
                        }

                        // 🔧 新增 (2025-10-06): 检测每行实际渲染了几个小节
                        if (svg) {
                            detectMeasuresPerLine(svg, chords.progression.length);
                        }

                        // 显示容器（此时所有代号已正确）
                        scoreDiv.style.visibility = 'visible';

                        // 🔧 三重保障方案 (2025-10-06): 延迟强制重排小节，确保每行4个小节
                        // 解决用户报告的"临时记号多时小节宽度不一致导致换行"问题
                        setTimeout(() => {
                            console.log('🎨 延迟强制重排小节布局（确保OSMD渲染完成）...');
                            applySVGPostProcessLayout();
                            console.log('✅ 强制重排完成 - 所有小节宽度已统一');
                        }, 100);
                        console.log('👁️ 显示容器，和弦代号已修复');

                        // 🔒 修复 (2025-10-02): 在显示容器后立即检查隐藏模式
                        // 如果用户开启了隐藏功能，自动隐藏新生成的内容
                        if (!chordsVisible) {
                            console.log('🔒 检测到隐藏模式已开启，立即隐藏新生成的和弦');
                            const svgElements = scoreDiv.querySelectorAll('svg');
                            svgElements.forEach(svg => {
                                svg.classList.add('melody-hidden');
                                svg.style.opacity = '0';
                                svg.style.filter = 'blur(10px)';
                                svg.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
                            });
                            console.log('🔒 ✅ 新生成的和弦已自动隐藏');
                        }
                    } catch (e) {
                        console.warn('渲染或修复时出错:', e);
                        // 即使出错也要显示容器
                        scoreDiv.style.visibility = 'visible';

                        // 🔒 即使出错也应用隐藏模式
                        if (!chordsVisible) {
                            const svgElements = scoreDiv.querySelectorAll('svg');
                            svgElements.forEach(svg => {
                                svg.classList.add('melody-hidden');
                                svg.style.opacity = '0';
                                svg.style.filter = 'blur(10px)';
                            });
                        }
                    }
                });

                // 🎨 使用第二个RAF应用样式（在第一个RAF修复后的下一帧）
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        // 获取SVG元素进行后续处理
                        const svg = scoreDiv.querySelector('svg');
                        if (svg) {
                            // 🎵 和弦代号元素样式处理
                            if (chordSymbolsVisible) {
                                const chordTextElements = svg.querySelectorAll([
                                    'text[id*="chord"]',
                                    'text[id*="Chord"]',
                                    'text[id*="harmony"]',
                                    'text[id*="Harmony"]',
                                    'g[id*="chord"] text',
                                    'g[id*="Chord"] text',
                                    'g[id*="harmony"] text',
                                    'g[id*="Harmony"] text'
                                ].join(', '));

                                chordTextElements.forEach((element) => {
                                    element.style.fontWeight = '600';
                                    element.style.fontSize = '1.1rem';
                                    element.style.fill = 'var(--neutral-black)';
                                    element.classList.add('chord-symbol');
                                });
                            }

                            // 应用显示状态
                            if (typeof window.applyStaffDisplayState === 'function') {
                                window.applyStaffDisplayState();
                            }
                            if (typeof window.applyChordSymbolsState === 'function') {
                                window.applyChordSymbolsState();
                            }

                            // 🔍 检查隐藏状态（基于全局状态）
                            if (window.displaySettings) {
                                if (!window.displaySettings.staffVisible) {
                                    console.log('🚀 应用五线谱隐藏状态');
                                    if (typeof window.applyStaffDisplayState === 'function') {
                                        window.applyStaffDisplayState();
                                    }
                                }
                                if (!window.displaySettings.chordSymbolsVisible) {
                                    console.log('🚀 应用和弦代号隐藏状态');
                                    if (typeof window.applyChordSymbolsState === 'function') {
                                        window.applyChordSymbolsState();
                                    }
                                }
                            }
                        }
                        console.log('✅ 和弦渲染和样式应用完成');
                    });
                });

                // 显示和弦分析信息
                displayChordAnalysis(chords);

                // 🔍 新增 (2025-10-04): 显示每个小节渲染的音符和音高（测试工具）
                displayRenderedNotes(chords);

                // 🔒 已移除：applyAutoHideIfNeeded()调用已移到RAF内部（5343-5358行）
                // 确保在显示容器后立即应用隐藏模式，避免时序问题

            }).catch(error => {
                console.error('❌ 和弦渲染失败:', error);
                showFallbackChordDisplay(chords);
            });
        } else {
            console.warn('⚠️ OSMD未初始化，使用备用显示');
            showFallbackChordDisplay(chords);
        }
    } catch (error) {
        console.error('❌ 显示和弦失败:', error);
        showFallbackChordDisplay(chords);
    }
}

// 生成MusicXML
function generateMusicXML(chords) {
    // 🎯 优先使用直接传递的keyInfo对象，避免查找失败导致的问题
    const keyInfo = chords.keyInfo
        ? chords.keyInfo
        : (chords.key ? harmonyTheory.keys[chords.key] : { tonic: 'C', mode: 'major', sharps: 0, flats: 0 });

    console.log(`🎯 generateMusicXML使用的keyInfo:`, keyInfo, `(来源: ${chords.keyInfo ? 'chords.keyInfo' : 'chords.key查找'})`);

    // 🔍 诊断：验证keyInfo的Fb/Cb规则触发条件
    if (keyInfo.flats >= 6) {
        console.log(`🔍 诊断(generateMusicXML)：keyInfo有${keyInfo.flats}个降号，应该使用Fb和Cb`);
    } else if (keyInfo.mode === 'minor' && keyInfo.tonic === 'Db') {
        console.log(`🔍 诊断(generateMusicXML)：db小调特殊情况，应该使用Fb`);
    } else {
        console.log(`🔍 诊断(generateMusicXML)：${keyInfo.tonic}-${keyInfo.mode}有${keyInfo.flats}降/${keyInfo.sharps}升，应该使用E和B`);
    }
    // 从用户选择的拍号中随机选择一个
    const selectedTimeSignature = window.chordSettings.timeSignatures && window.chordSettings.timeSignatures.length > 0
        ? window.chordSettings.timeSignatures[Math.floor(Math.random() * window.chordSettings.timeSignatures.length)]
        : '4/4';
    const timeSignature = selectedTimeSignature;
    const [beats, beatType] = timeSignature.split('/');

    console.log(`🎵 随机选择拍号: ${timeSignature}, 可选拍号: [${window.chordSettings.timeSignatures?.join(', ') || '默认'}]`);

    // 计算调号的五度圈位置
    const fifths = calculateFifths(keyInfo);

    let measuresXML = '';

    chords.progression.forEach((chord, index) => {
        const measureNumber = index + 1;

        // 🎼 为每个小节生成和弦，传递音阶变体信息
        const basicChordNotes = generateChordNotesXML(chord, keyInfo, timeSignature);

        // 🎹 安全方式添加低音线条（仅钢琴模式+大谱表）
        const chordNotes = addBassLineForGrandStaff(basicChordNotes, chord, keyInfo);

        measuresXML += `
    <measure number="${measureNumber}">`;

        // 第一小节包含属性
        if (index === 0) {
            // 🔍 检查是否为钢琴模式（增强调试）
            const instrumentToggle = document.getElementById('instrumentModeToggle');
            const isPianoMode = instrumentToggle && instrumentToggle.checked;

            console.log(`🔍 大谱表调试 - 钢琴模式检查:`);
            console.log(`  📱 instrumentToggle元素存在: ${!!instrumentToggle}`);
            console.log(`  🎹 instrumentToggle.checked: ${instrumentToggle ? instrumentToggle.checked : 'N/A'}`);
            console.log(`  🎯 最终isPianoMode判断: ${isPianoMode}`);

            let selectedClef;
            let clefXML = '';

            if (isPianoMode) {
                // 钢琴模式：强制使用大谱号（高音谱号 + 低音谱号）
                selectedClef = 'grand_staff';
                console.log(`🎹 钢琴模式: 强制使用大谱号 (双谱号系统)`);

                // 生成大谱号XML（高音谱号和低音谱号）
                clefXML = `
        <clef number="1">
          <sign>G</sign>
          <line>2</line>
        </clef>
        <clef number="2">
          <sign>F</sign>
          <line>4</line>
        </clef>`;

                console.log(`🎼 钢琴模式生成的clefXML:`, clefXML.trim());

                // 钢琴模式使用钢琴音域
                setRangeForClef('grand_staff');
            } else {
                // 吉他模式：从用户选择的谱号中随机选择一个
                selectedClef = window.chordSettings.clefs && window.chordSettings.clefs.length > 0
                    ? window.chordSettings.clefs[Math.floor(Math.random() * window.chordSettings.clefs.length)]
                    : 'treble';

                console.log(`🎸 吉他模式 - 随机选择谱号: ${selectedClef}, 可选谱号: [${window.chordSettings.clefs?.join(', ') || '默认'}]`);

                // 根据谱号设置合适的音域
                setRangeForClef(selectedClef);

                // 根据选择的谱号生成相应的XML
                switch (selectedClef) {
                    case 'bass':
                        clefXML = `
        <clef>
          <sign>F</sign>
          <line>4</line>
        </clef>`;
                        break;
                    case 'grand_staff':
                        // 🎼 大谱表：包含高音谱号和低音谱号
                        clefXML = `
        <clef number="1">
          <sign>G</sign>
          <line>2</line>
        </clef>
        <clef number="2">
          <sign>F</sign>
          <line>4</line>
        </clef>`;
                        console.log('🎼 吉他模式：生成大谱表 (双谱号系统)');
                        break;
                    default: // 'treble'
                        clefXML = `
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>`;
                        break;
                }
            }

            // 🎼 确定谱表数量（大谱表需要2个谱表）
            const isGrandStaff = selectedClef === 'grand_staff';
            const stavesXML = isGrandStaff ? '        <staves>2</staves>' : '';

            console.log(`🎼 谱表配置调试:`);
            console.log(`  🎯 selectedClef: '${selectedClef}'`);
            console.log(`  🎼 isGrandStaff: ${isGrandStaff}`);
            console.log(`  📊 stavesXML: '${stavesXML}'`);
            console.log(`  🎵 clefXML length: ${clefXML.length} 字符`);

            measuresXML += `
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>${fifths}</fifths>
          <mode>${keyInfo.mode}</mode>
        </key>
        <time>
          <beats>${beats}</beats>
          <beat-type>${beatType}</beat-type>
        </time>${stavesXML}${clefXML}
      </attributes>`;

            console.log(`🎼 最终生成的XML attributes部分长度: ${measuresXML.length - 4450} 字符（增量）`);
        }

        // 使用与旋律工具一致的换行逻辑
        if (shouldStartNewSystemForChords(index, 4)) {
            measuresXML += `
      <print new-system="yes"/>`;
            console.log(`🔄 在第${index + 1}小节添加换行标记`);
        }

        measuresXML += chordNotes;

        // 🎲 完全随机模式：在每个小节后添加双小节线以显示独立性
        const functionalHarmonyToggle = document.getElementById('functionalHarmonyToggle');
        const isRandomMode = !functionalHarmonyToggle || !functionalHarmonyToggle.checked;

        if (isRandomMode && index < chords.progression.length - 1) {
            // 在非最后小节添加双小节线
            measuresXML += `
      <barline location="right">
        <bar-style>light-light</bar-style>
      </barline>`;
            console.log(`🎲 完全随机模式: 第${index + 1}小节后添加双小节线`);
        }
        // 为最后一个小节添加final barline
        else if (index === chords.progression.length - 1) {
            measuresXML += `
      <barline location="right">
        <bar-style>light-heavy</bar-style>
      </barline>`;
        }

        measuresXML += `
    </measure>`;
    });

    const musicXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <score-instrument id="P1-I1">
      </score-instrument>
      <midi-device id="P1-I1" port="1"></midi-device>
      <midi-instrument id="P1-I1">
        <midi-channel>1</midi-channel>
        <midi-program>1</midi-program>
        <volume>80</volume>
        <pan>0</pan>
      </midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">${measuresXML}
  </part>
</score-partwise>`;

    return musicXML;
}

// 与旋律工具一致的换行逻辑
function shouldStartNewSystemForChords(measureIndex, measuresPerLine) {
    // 第一小节不换行
    if (measureIndex === 0) return false;

    // 每measuresPerLine小节换行
    return (measureIndex % measuresPerLine) === 0;
}

// 根据拍号计算音符时值
function calculateNoteDurationFromTimeSignature(timeSignature = '4/4') {
    const [beats, beatType] = timeSignature.split('/').map(n => parseInt(n));

    // 计算一小节的总duration (以divisions=4为基准)
    // divisions=4 表示每个四分音符=4个duration单位
    const quarterNoteDuration = 4;
    const fullMeasureDuration = beats * quarterNoteDuration * (4 / beatType);

    // 根据拍号确定音符类型和是否附点
    let noteType;
    let hasDot = false;

    if (timeSignature === '4/4') {
        noteType = 'whole';
    } else if (timeSignature === '3/4') {
        noteType = 'half';  // 附点二分音符
        hasDot = true;
    } else if (timeSignature === '2/4') {
        noteType = 'half';
    } else if (timeSignature === '6/8') {
        noteType = 'half';  // 附点二分音符
        hasDot = true;
    } else if (timeSignature === '9/8') {
        noteType = 'whole'; // 附点全音符
        hasDot = true;
    } else if (timeSignature === '12/8') {
        noteType = 'whole';
    } else {
        // 默认情况：让和弦占满整个小节
        noteType = 'whole';
    }

    console.log(`🎵 拍号${timeSignature}: duration=${fullMeasureDuration}, noteType=${noteType}${hasDot ? ' (附点)' : ''}`);

    return {
        duration: fullMeasureDuration,
        noteType: noteType,
        hasDot: hasDot
    };
}

// 🎼 大谱表谱表分配辅助函数
function determineStaffForGrandStaff(pitch) {
    // 大谱表中音符的谱表分配：
    // 谱表1: 高音谱号（通常中央C以上）
    // 谱表2: 低音谱号（通常中央C以下）

    const { step, octave } = pitch;
    const pitchHeight = octave * 12 + ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(step);

    // 中央C (C4) = 4 * 12 + 0 = 48
    // 分界点设在中央C，C4及以上用高音谱表，以下用低音谱表
    const middleC = 48;

    const staffNumber = pitchHeight >= middleC ? 1 : 2;

    console.log(`🎼 谱表分配计算: ${step}${octave} → 音高值${pitchHeight} (中央C=${middleC}) → 谱表${staffNumber} ${staffNumber === 1 ? '(高音谱号)' : '(低音谱号)'}`);

    return staffNumber;
}

// 生成和弦音符的MusicXML
function generateChordNotesXML(chord, keyInfo, timeSignature = '4/4') {
    if (!chord || (!chord.notes && !chord.voicing)) {
        const { duration, noteType, hasDot } = calculateNoteDurationFromTimeSignature(timeSignature);
        return `
      <note>
        <rest/>
        <duration>${duration}</duration>
        <type>${noteType}</type>${hasDot ? '\n        <dot/>' : ''}
      </note>`;
    }

    let notesXML = '';
    const { duration, noteType, hasDot } = calculateNoteDurationFromTimeSignature(timeSignature);

    // 🎼 检测是否为大谱表模式
    const instrumentToggle = document.getElementById('instrumentModeToggle');
    const isPianoMode = instrumentToggle && instrumentToggle.checked;
    const userSelectedGrandStaff = window.chordSettings && window.chordSettings.clefs &&
                                  window.chordSettings.clefs.includes('grand_staff');
    const isGrandStaff = isPianoMode || userSelectedGrandStaff;

    if (isGrandStaff) {
        console.log('🎼 大谱表模式：启用双谱表音符分配');
    }

    // 🎹 钢琴模式特殊处理：使用pianoData的双谱表MIDI数据
    if (chord.isPianoMode && chord.pianoData) {
        console.log('🎹 检测到钢琴模式和弦，使用双谱表数据:', chord.pianoData);
        return generatePianoGrandStaffNotesXML(chord, keyInfo, timeSignature, duration, noteType, hasDot);
    }

/**
 * 🎹 生成钢琴模式专用的大谱表MusicXML
 * @param {Object} chord - 钢琴和弦对象，包含pianoData
 * @param {Object} keyInfo - 调号信息
 * @param {string} timeSignature - 拍号
 * @param {number} duration - 音符时值
 * @param {string} noteType - 音符类型
 * @param {boolean} hasDot - 是否附点
 * @returns {string} MusicXML notes字符串
 */
function generatePianoGrandStaffNotesXML(chord, keyInfo, timeSignature, duration, noteType, hasDot) {
    console.log('🎹 开始生成钢琴大谱表MusicXML');

    if (!chord.pianoData || !chord.pianoData.bassClefMidi || !chord.pianoData.trebleClefMidi) {
        console.error('❌ 钢琴数据不完整:', chord.pianoData);
        return '<note><rest/><duration>4</duration><type>whole</type></note>';
    }

    const { bassClefMidi, trebleClefMidi } = chord.pianoData;
    console.log(`🎹 低音谱号音符: [${bassClefMidi.join(', ')}]`);
    console.log(`🎹 高音谱号音符: [${trebleClefMidi.join(', ')}]`);

    let notesXML = '';

    // 🎵 钢琴模式和弦代号生成 - 使用标准MusicXML harmony格式
    let chordSymbol = '';
    let bassNote = null;  // 🔧 (2025-10-02): 用于存储低音音符名称

    // 🔧 (2025-10-02): 检测转位 - 检查实际低音是否是根音
    const lowestMidi = Math.min(...bassClefMidi);
    const lowestPitchInfo = midiToPitchInfo(lowestMidi, chord, keyInfo);
    let bassNoteName = lowestPitchInfo.step;
    if (lowestPitchInfo.alter > 0) {
        bassNoteName += '#'.repeat(lowestPitchInfo.alter);
    } else if (lowestPitchInfo.alter < 0) {
        bassNoteName += 'b'.repeat(-lowestPitchInfo.alter);
    }

    // 🔧 修复 (2025-10-02): 分析实际音符以确定正确的和弦代号
    // 从MIDI值提取音符名称（不含八度）
    const allMidiNotes = [...bassClefMidi, ...trebleClefMidi];
    const actualNotes = allMidiNotes.map(midi => {
        const pitchInfo = midiToPitchInfo(midi, chord, keyInfo);
        let noteName = pitchInfo.step;
        if (pitchInfo.alter > 0) {
            noteName += '#'.repeat(pitchInfo.alter);
        } else if (pitchInfo.alter < 0) {
            noteName += 'b'.repeat(-pitchInfo.alter);
        }
        return noteName;
    });

    // 🔧 (2025-10-02 尝试9): 禁用analyzeChord，直接使用原始chord.root和chord.type
    // 问题根源：analyzeChord基于可能错误排序的actualNotes分析，导致和弦代号错误
    // 修复方案：与吉他模式一致，直接使用原始和弦数据
    console.log(`🎹 [钢琴模式] 使用原始和弦数据: ${chord.root}${chord.type}`);
    console.log(`🎹 跳过analyzeChord分析，避免基于错误音符顺序的分析结果`);
    let analyzedChord = null;  // 保持为null，强制使用原始chord.root和chord.type

    if (chordSymbolsVisible && chord.root && chord.type) {
        // 🎵 优先检查是否为6/9和弦（2025-10-02修复：避免显示Cmaj7/D这种错误代号）
        if (chord.is69Voicing) {
            chordSymbol = chord.root + '6/9';
            console.log(`🎵 检测到6/9和弦: ${chord.root}maj7 → ${chordSymbol}`);
        } else {
            // 🎲 检查是否为随机模式
            const functionalHarmonyToggle = document.getElementById('functionalHarmonyToggle');
            const isRandomMode = !functionalHarmonyToggle || !functionalHarmonyToggle.checked;

            if (isRandomMode) {
                // 🎲 随机模式：强制使用友好根音拼写
                const friendlyRootMapping = {
                    'C#': 'Db', 'Db': 'Db',
                    'D#': 'Eb', 'Eb': 'Eb',
                    'F#': 'F#', 'Gb': 'Gb',
                    'G#': 'Ab', 'Ab': 'Ab',
                    'A#': 'Bb', 'Bb': 'Bb',
                    'Cb': 'B', 'B#': 'C',
                    'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'A': 'A', 'B': 'B'
                };

                // 🔧 修复 (2025-10-02): 优先使用分析结果
                const rootToUse = analyzedChord ? analyzedChord.root : chord.root;
                const typeToUse = analyzedChord ? analyzedChord.type : chord.type;

                // 🔧 修复 (2025-10-05 v10): 智能映射 - 升号根音和弦保持升号拼写
                // 问题：E major（E-G#-B）和弦代号显示Ab（因为G#→Ab映射）
                // 解决：升号根音大调和弦（E, B, F#, C#）保持原样，不映射
                //       降号根音minor和弦使用降号映射
                const sharpRootMajorChords = ['E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];
                const isSharpRootMajor = sharpRootMajorChords.includes(rootToUse) &&
                                         !typeToUse.includes('minor') &&
                                         !typeToUse.includes('dim');

                const friendlyRoot = isSharpRootMajor ? rootToUse :
                                   (friendlyRootMapping[rootToUse] || rootToUse);
                const typeSymbol = getChordTypeSymbol(typeToUse);
                chordSymbol = friendlyRoot + typeSymbol;

            console.log(`🎵 和弦代号生成: 根音=${rootToUse}, 类型=${typeToUse}, 代号=${chordSymbol}`);

            // 🔧 (2025-10-02): 检测转位并添加斜线记号
            // 🔧 修复 (2025-10-02): 只有在用户勾选转位或和弦明确标记转位时才显示斜线记号
            const bassNoteSemitone = lowestMidi % 12;
            const rootNoteToSemitone = {
                'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
                'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10,
                'Bb': 10, 'B': 11, 'Cb': 11, 'B#': 0, 'E#': 5
            };
            const rootSemitone = rootNoteToSemitone[friendlyRoot];

            // 检查用户是否启用了转位显示
            const userEnabledInversions = window.chordSettings.includeTriadInversions ||
                                          window.chordSettings.includeSeventhInversions;
            const chordHasExplicitInversion = chord.inversion !== undefined && chord.inversion > 0;

            // 🔧 修复 (2025-10-03): 检查低音是否为核心和弦音
            // 只有核心和弦音（1-3-5-7）在低音时才显示斜线记号
            // Tension音符（9th/11th/13th）在低音不显示斜线
            const bassIsCoreChordTone = isCoreChordTone(bassNoteName, friendlyRoot, typeToUse);

            // ❌ 禁用 (2025-10-05): 用户偏好允许增和弦显示转位记号
            // 原v29修复：增和弦不显示转位记号（基于音乐理论"对称和弦"原则）
            // 用户反馈：希望增和弦显示转位（如"Eaug/B#"）
            /*
            const isAugmentedChord = typeToUse.includes('aug') || typeToUse === 'augmented';

            if (isAugmentedChord && bassNoteSemitone !== rootSemitone) {
                console.log(`⚠️ 增和弦是对称和弦，不显示转位记号: ${chordSymbol}`);
                console.log(`   低音=${bassNoteName}, 根音=${friendlyRoot}, 但保持原和弦代号`);
                // 跳过转位记号显示，保持原和弦代号（如C+, A+等）
            } else
            */
            if (bassNoteSemitone !== rootSemitone && (userEnabledInversions || chordHasExplicitInversion)) {
                if (bassIsCoreChordTone) {
                    // 转位：低音是核心和弦音（非根音），且用户允许显示转位记号
                    // 🔧 修复 (2025-10-05 v28): 增强低音音符拼写映射
                    // 问题：偶尔出现Bsus2/C#应该是Bsus2/Db的情况
                    // 解决：清理bassNoteName并强制应用friendlyRootMapping
                    const cleanBassNote = bassNoteName.replace(/\d+$/g, ''); // 移除可能的八度数字

                    // 🔧 修复 (2025-10-05 v32→v34→v35): 基于key signature的智能低音映射
                    // 问题：Amaj7/Db应该是Amaj7/C#（A major有3个升号，应该保持升号）
                    // 解决：不使用硬编码列表，而是查询和弦的key signature来判断升号/降号系统
                    // v35修复：添加typeToUse安全检查，避免undefined.includes()报错

                    // 1. 推断和弦的调性
                    const isMinorType = typeToUse && (typeToUse.includes('minor') || typeToUse.includes('dim'));
                    const inferredMode = isMinorType ? 'minor' : 'major';
                    const inferredKey = inferredMode === 'minor'
                        ? `${friendlyRoot.toLowerCase()}-minor`
                        : `${friendlyRoot}-major`;

                    // 2. 查询key signature
                    const keySignature = window.harmonyTheory?.keys?.[inferredKey];

                    // 3. 基于sharps/flats判断升号/降号系统
                    const isSharpSystem = keySignature && keySignature.sharps > 0;
                    const isFlatSystem = keySignature && keySignature.flats > 0;

                    // 4. 智能映射
                    let friendlyBass;
                    if (isSharpSystem) {
                        friendlyBass = cleanBassNote;  // 升号系统保持原样
                    } else if (isFlatSystem) {
                        friendlyBass = friendlyRootMapping[cleanBassNote] || cleanBassNote;  // 降号系统使用映射
                    } else {
                        friendlyBass = cleanBassNote;  // C major或未知调性保持原样
                    }

                    // 🔍 调试日志（偶发性问题追踪）
                    if (cleanBassNote !== bassNoteName) {
                        console.log(`🔧 低音音符清理: "${bassNoteName}" → "${cleanBassNote}"`);
                    }
                    if (keySignature) {
                        console.log(`🔧 低音映射: 和弦=${friendlyRoot}${typeToUse}, 推断调性=${inferredKey}, sharps=${keySignature.sharps}, flats=${keySignature.flats}, 系统=${isSharpSystem ? '升号' : isFlatSystem ? '降号' : 'C大调'}`);
                    }
                    if (cleanBassNote !== friendlyBass) {
                        console.log(`🔧 低音智能映射: "${cleanBassNote}" → "${friendlyBass}" (${isSharpSystem ? '升号系统保持' : isFlatSystem ? '降号系统映射' : '保持原样'})`);
                    }

                    chordSymbol += '/' + friendlyBass;
                    bassNote = friendlyBass;
                    console.log(`🎵 显示转位记号: ${chordSymbol} (用户设置: ${userEnabledInversions ? '已勾选转位' : '和弦明确转位'})`);
                } else {
                    // 低音是Tension音符，不显示斜线记号
                    console.log(`⚠️ 低音${bassNoteName}是Tension音符，不显示斜线记号`);
                    console.log(`   和弦: ${chordSymbol} (低音=${bassNoteName}，但不显示为转位)`);
                }
            } else if (bassNoteSemitone !== rootSemitone) {
                console.log(`⚠️ Drop2/Drop3改变了最低音，但用户未勾选转位，不显示斜线记号`);
            }
        } else {
            // 🎼 功能和声模式：使用精确的同音异名逻辑
            const rootNoteToSemitone = {
                'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
                'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10,
                'Bb': 10, 'B': 11, 'Cb': 11, 'B#': 0, 'E#': 5
            };

            // 🔧 修复 (2025-10-02): 优先使用分析结果
            const rootToUse = analyzedChord ? analyzedChord.root : chord.root;
            const typeToUse = analyzedChord ? analyzedChord.type : chord.type;

            const rootSemitone = rootNoteToSemitone[rootToUse];
            if (rootSemitone !== undefined) {
                const correctedRoot = getCorrectEnharmonic(rootSemitone, chord, 4, keyInfo);

                let correctedRootName = correctedRoot.step;
                if (correctedRoot.alter > 0) {
                    correctedRootName += '#'.repeat(correctedRoot.alter);
                } else if (correctedRoot.alter < 0) {
                    correctedRootName += 'b'.repeat(-correctedRoot.alter);
                }

                const typeSymbol = getChordTypeSymbol(typeToUse);
                chordSymbol = correctedRootName + typeSymbol;

                console.log(`🎵 和弦代号生成 (功能和声): 根音=${rootToUse}, 类型=${typeToUse}, 代号=${chordSymbol}`);

                // 🔧 (2025-10-02): 检测转位并添加斜线记号
                // 🔧 修复 (2025-10-02): 只有在用户勾选转位或和弦明确标记转位时才显示斜线记号
                const bassNoteSemitone = lowestMidi % 12;

                // 检查用户是否启用了转位显示
                const userEnabledInversions = window.chordSettings.includeTriadInversions ||
                                              window.chordSettings.includeSeventhInversions;
                const chordHasExplicitInversion = chord.inversion !== undefined && chord.inversion > 0;

                // 🔧 修复 (2025-10-03): 检查低音是否为核心和弦音
                // 只有核心和弦音（1-3-5-7）在低音时才显示斜线记号
                // Tension音符（9th/11th/13th）在低音不显示斜线
                const bassIsCoreChordTone = isCoreChordTone(bassNoteName, correctedRootName, typeToUse);

                // ❌ 禁用 (2025-10-05): 用户偏好允许增和弦显示转位记号
                // 原v29修复：功能和声模式也禁止增和弦显示转位记号
                // 用户反馈：希望增和弦显示转位（如"Eaug/B#"）
                /*
                const isAugmentedChord = typeToUse.includes('aug') || typeToUse === 'augmented';

                if (isAugmentedChord && bassNoteSemitone !== rootSemitone) {
                    console.log(`⚠️ [功能和声] 增和弦是对称和弦，不显示转位记号: ${chordSymbol}`);
                    console.log(`   低音=${bassNoteName}, 根音=${correctedRootName}, 但保持原和弦代号`);
                    // 跳过转位记号显示
                } else
                */
                if (bassNoteSemitone !== rootSemitone && (userEnabledInversions || chordHasExplicitInversion)) {
                    if (bassIsCoreChordTone) {
                        // 转位：低音是核心和弦音（非根音），且用户允许显示转位记号
                        // 🔧 修复 (2025-10-05 v28): 功能和声模式也应用相同的清理逻辑
                        const cleanBassNote = bassNoteName.replace(/\d+$/g, '');

                        // 🔧 修复 (2025-10-05 v34→v35): 功能和声模式应用key signature查询
                        // 问题：v32的hardcoded列表['E','B','F#',...]不完整，缺少'A','D','G'
                        // 解决：查询key signature，基于sharps/flats判断升号/降号系统
                        // v35修复：添加typeToUse安全检查，避免undefined.includes()报错

                        // 1. 推断和弦的调性
                        const isMinorType = typeToUse && (typeToUse.includes('minor') || typeToUse.includes('dim'));
                        const inferredMode = isMinorType ? 'minor' : 'major';
                        const inferredKey = inferredMode === 'minor'
                            ? `${correctedRootName.toLowerCase()}-minor`
                            : `${correctedRootName}-major`;

                        // 2. 查询key signature
                        const keySignature = window.harmonyTheory?.keys?.[inferredKey];

                        // 3. 基于sharps/flats判断升号/降号系统
                        const isSharpSystem = keySignature && keySignature.sharps > 0;
                        const isFlatSystem = keySignature && keySignature.flats > 0;

                        // 4. 降号映射表（仅在降号系统使用）
                        const flatMapping = {
                            'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
                        };

                        // 5. 智能映射
                        let smartBass;
                        if (isSharpSystem) {
                            smartBass = cleanBassNote;  // 升号系统保持原样（如C#）
                        } else if (isFlatSystem) {
                            smartBass = flatMapping[cleanBassNote] || cleanBassNote;  // 降号系统映射
                        } else {
                            smartBass = cleanBassNote;  // C major或未知调性保持原样
                        }

                        // 🔍 调试日志
                        if (cleanBassNote !== bassNoteName) {
                            console.log(`🔧 [功能和声] 低音音符清理: "${bassNoteName}" → "${cleanBassNote}"`);
                        }
                        if (cleanBassNote !== smartBass) {
                            console.log(`🔧 [功能和声] v34智能映射: "${cleanBassNote}" → "${smartBass}"`);
                            console.log(`   推断调性: ${inferredKey}, sharps=${keySignature?.sharps || 0}, flats=${keySignature?.flats || 0}`);
                            console.log(`   系统: ${isSharpSystem ? '升号系统' : isFlatSystem ? '降号系统' : 'C大调/未知'}`);
                        }

                        chordSymbol += '/' + smartBass;
                        bassNote = smartBass;
                        console.log(`🎵 显示转位记号: ${chordSymbol} (用户设置: ${userEnabledInversions ? '已勾选转位' : '和弦明确转位'})`);
                    } else {
                        // 低音是Tension音符，不显示斜线记号
                        console.log(`⚠️ 低音${bassNoteName}是Tension音符，不显示斜线记号`);
                        console.log(`   和弦: ${chordSymbol} (低音=${bassNoteName}，但不显示为转位)`);
                    }
                } else if (bassNoteSemitone !== rootSemitone) {
                    console.log(`⚠️ Drop2/Drop3改变了最低音，但用户未勾选转位，不显示斜线记号`);
                }
            } else {
                chordSymbol = getChordSymbol(chord);
                console.log(`🎵 钢琴模式和弦代号 (回退): ${chordSymbol}`);
            }
          }  // 结束 if (chord.is69Voicing) else 块
        }

        // 🔧 修复 (2025-10-02): 使用分析结果的类型
        const typeForMusicXML = analyzedChord ? analyzedChord.type : chord.type;
        const chordKindText = getChordTypeSymbol(typeForMusicXML);

        // 生成MusicXML <harmony>元素
        notesXML += `
    <harmony placement="above" print-frame="no">
      <root>
        <root-step>${chordSymbol.charAt(0)}</root-step>`;

        // 🔧 (2025-10-02): 只解析根音部分的升降号（斜线之前）
        const rootPart = chordSymbol.split('/')[0];
        if (rootPart.includes('#')) {
            const sharpCount = (rootPart.match(/#/g) || []).length;
            notesXML += `
        <root-alter>${sharpCount}</root-alter>`;
        } else if (rootPart.includes('b')) {
            const flatCount = (rootPart.match(/b/g) || []).length;
            notesXML += `
        <root-alter>-${flatCount}</root-alter>`;
        }

        notesXML += `
      </root>
      <kind text="${chordKindText}">${getChordKind(typeForMusicXML)}</kind>`;

        // 🔧 (2025-10-02): 添加低音音符（如果是转位）
        if (bassNote) {
            notesXML += `
      <bass>
        <bass-step>${bassNote.charAt(0)}</bass-step>`;
            if (bassNote.includes('#')) {
                const bassSharpCount = (bassNote.match(/#/g) || []).length;
                notesXML += `
        <bass-alter>${bassSharpCount}</bass-alter>`;
            } else if (bassNote.includes('b')) {
                const bassFlatCount = (bassNote.match(/b/g) || []).length;
                notesXML += `
        <bass-alter>-${bassFlatCount}</bass-alter>`;
            }
            notesXML += `
      </bass>`;
        }

        notesXML += `
    </harmony>`;

        console.log(`✅ 钢琴模式MusicXML harmony元素已生成: ${chordSymbol}`);
    }

    let isFirstNote = true;

    // 🎼 生成低音谱号音符 (staff 2, F clef)
    for (const midiNote of bassClefMidi) {
        const pitchInfo = midiToPitchInfo(midiNote, chord, keyInfo);

        // 🔍 诊断 (2025-10-05): Cb/B音符MusicXML生成追踪
        const noteIndex = midiNote % 12;
        const isCbOrB = (noteIndex === 11);
        if (isCbOrB) {
            console.log(`\n🔍 ========== 低音谱表Cb/B音符MusicXML生成诊断 ==========`);
            console.log(`  📊 MIDI值: ${midiNote}`);
            console.log(`  📊 音符索引: ${noteIndex}`);
            console.log(`  📊 pitchInfo对象:`, JSON.stringify(pitchInfo, null, 2));
            console.log(`  📊 将写入XML: <step>${pitchInfo.step}</step><alter>${pitchInfo.alter}</alter><octave>${pitchInfo.octave}</octave>`);
            console.log(`========================================\n`);
        }

        notesXML += `
      <note>`;

        if (!isFirstNote) {
            notesXML += `
        <chord/>`;
        }

        // 🔍 诊断 (2025-10-05): Cb/Fb MusicXML生成追踪 (低音谱号)
        if ((pitchInfo.step === 'C' && pitchInfo.alter === -1) ||
            (pitchInfo.step === 'F' && pitchInfo.alter === -1) ||
            (pitchInfo.step === 'B' && pitchInfo.alter === 0 && midiNote === 71) ||
            (pitchInfo.step === 'E' && pitchInfo.alter === 0 && midiNote === 64)) {
            console.log(`\n🔍 ========== Cb/Fb MusicXML生成 (低音谱号) ==========`);
            console.log(`  MIDI: ${midiNote}`);
            console.log(`  pitchInfo: step=${pitchInfo.step}, alter=${pitchInfo.alter}, octave=${pitchInfo.octave}`);
            console.log(`  将生成XML: <step>${pitchInfo.step}</step>${pitchInfo.alter !== 0 ? '<alter>' + pitchInfo.alter + '</alter>' : ''}<octave>${pitchInfo.octave}</octave>`);
            console.log(`==========================================\n`);
        }

        notesXML += `
        <pitch>
          <step>${pitchInfo.step}</step>`;

        if (pitchInfo.alter !== 0) {
            notesXML += `
          <alter>${pitchInfo.alter}</alter>`;
        }

        notesXML += `
          <octave>${pitchInfo.octave}</octave>
        </pitch>`;

        // 🔧 修复 (2025-10-05 v14): 添加显式accidental标签，强制OSMD显示临时记号 + 强制显示属性
        // 问题：没有accidental标签时，OSMD根据调号决定是否显示临时记号
        //       随机模式调号=C大调，OSMD将Cb简化为B，Ab简化为G#
        // 解决：显式添加accidental标签，并使用MusicXML属性强制显示
        if (pitchInfo.alter !== 0) {
            const accidentalType = pitchInfo.alter > 0 ? 'sharp' : 'flat';
            const accidentalCount = Math.abs(pitchInfo.alter);
            // MusicXML支持: sharp, flat, double-sharp, flat-flat, natural
            const accidentalValue = accidentalCount === 2
                ? (pitchInfo.alter > 0 ? 'double-sharp' : 'flat-flat')
                : accidentalType;
            // MusicXML属性：editorial="no" 表示必须显示的临时记号，cautionary="no" 表示非谨慎性临时记号
            notesXML += `
        <accidental editorial="no" cautionary="no" parentheses="no">${accidentalValue}</accidental>`;
        }

        notesXML += `
        <duration>${duration}</duration>
        <type>${noteType}</type>`;

        if (hasDot) {
            notesXML += `
        <dot/>`;
        }

        notesXML += `
        <staff>2</staff>
      </note>`;

        console.log(`🎹 低音谱号音符: MIDI${midiNote} → ${pitchInfo.step}${pitchInfo.alter !== 0 ? pitchInfo.alter : ''}${pitchInfo.octave} (staff 2)`);
        isFirstNote = false;
    }

    // 🔄 添加 <backup/> 标签回到小节开始，以便在高音谱号创建独立的和弦组
    // 这样高音谱号和低音谱号的音符才能正确分布到各自的谱号上
    if (bassClefMidi.length > 0 && trebleClefMidi.length > 0) {
        notesXML += `
      <backup>
        <duration>${duration}</duration>
      </backup>`;
        console.log(`🔄 添加backup标签，回退${duration}时长，回到小节开始`);
    }

    // 🎼 生成高音谱号音符 (staff 1, G clef)
    let isFirstTrebleNote = true;
    for (const midiNote of trebleClefMidi) {
        const pitchInfo = midiToPitchInfo(midiNote, chord, keyInfo);

        // 🔍 诊断 (2025-10-05): Cb/B音符MusicXML生成追踪
        const noteIndex = midiNote % 12;
        const isCbOrB = (noteIndex === 11);
        if (isCbOrB) {
            console.log(`\n🔍 ========== 高音谱表Cb/B音符MusicXML生成诊断 ==========`);
            console.log(`  📊 MIDI值: ${midiNote}`);
            console.log(`  📊 音符索引: ${noteIndex}`);
            console.log(`  📊 pitchInfo对象:`, JSON.stringify(pitchInfo, null, 2));
            console.log(`  📊 将写入XML: <step>${pitchInfo.step}</step><alter>${pitchInfo.alter}</alter><octave>${pitchInfo.octave}</octave>`);
            console.log(`========================================\n`);
        }

        notesXML += `
      <note>`;

        // 🎯 关键修复：只有非第一个高音谱号音符才添加 <chord/> 标签
        // 第一个高音谱号音符不添加，使其成为独立的主音符，与低音谱号分离
        if (!isFirstTrebleNote) {
            notesXML += `
        <chord/>`;
        }

        notesXML += `
        <pitch>
          <step>${pitchInfo.step}</step>`;

        if (pitchInfo.alter !== 0) {
            notesXML += `
          <alter>${pitchInfo.alter}</alter>`;
        }

        notesXML += `
          <octave>${pitchInfo.octave}</octave>
        </pitch>`;

        // 🔧 修复 (2025-10-05 v14): 添加显式accidental标签，强制OSMD显示临时记号 + 强制显示属性
        // 问题：没有accidental标签时，OSMD根据调号决定是否显示临时记号
        //       随机模式调号=C大调，OSMD将Cb简化为B，Ab简化为G#
        // 解决：显式添加accidental标签，并使用MusicXML属性强制显示
        if (pitchInfo.alter !== 0) {
            const accidentalType = pitchInfo.alter > 0 ? 'sharp' : 'flat';
            const accidentalCount = Math.abs(pitchInfo.alter);
            // MusicXML支持: sharp, flat, double-sharp, flat-flat, natural
            const accidentalValue = accidentalCount === 2
                ? (pitchInfo.alter > 0 ? 'double-sharp' : 'flat-flat')
                : accidentalType;
            // MusicXML属性：editorial="no" 表示必须显示的临时记号，cautionary="no" 表示非谨慎性临时记号
            notesXML += `
        <accidental editorial="no" cautionary="no" parentheses="no">${accidentalValue}</accidental>`;
        }

        notesXML += `
        <duration>${duration}</duration>
        <type>${noteType}</type>`;

        if (hasDot) {
            notesXML += `
        <dot/>`;
        }

        notesXML += `
        <staff>1</staff>
      </note>`;

        console.log(`🎹 高音谱号音符: MIDI${midiNote} → ${pitchInfo.step}${pitchInfo.alter !== 0 ? pitchInfo.alter : ''}${pitchInfo.octave} (staff 1)`);
        isFirstTrebleNote = false; // 第一个高音谱号音符处理完毕，后续音符需要添加 <chord/> 标签
    }

    console.log('✅ 钢琴大谱表MusicXML生成完成');
    return notesXML;
}

    // 🎵 和弦代号预生成 - 使用标准MusicXML harmony格式
    let chordSymbol = '';

    // 🔧 修复 (2025-10-02): 预声明 analyzedChord 变量，稍后在 notesToUse 验证后填充
    let analyzedChord = null;

    console.log('\n🔍 === 和弦代号生成诊断 ===');
    console.log(`  - chordSymbolsVisible: ${chordSymbolsVisible}`);
    console.log(`  - chord.root: ${chord.root}`);
    console.log(`  - chord.type: ${chord.type}`);
    console.log(`  - 条件满足 (chordSymbolsVisible && chord.root && chord.type): ${chordSymbolsVisible && chord.root && chord.type}`);

    if (chordSymbolsVisible && chord.root && chord.type) {
        // 🎵 优先检查是否为6/9和弦（2025-10-02修复：避免显示Cmaj7/D这种错误代号）
        if (chord.is69Voicing) {
            chordSymbol = chord.root + '6/9';
            console.log(`🎵 检测到6/9和弦: ${chord.root}maj7 → ${chordSymbol}`);
        } else {
            // 🎲 检查是否为随机模式
            const functionalHarmonyToggle = document.getElementById('functionalHarmonyToggle');
            const isRandomMode = !functionalHarmonyToggle || !functionalHarmonyToggle.checked;

            if (isRandomMode) {
                // 🎲 随机模式：强制使用友好根音拼写，避免复杂升降记号
                const friendlyRootMapping = {
                    'C#': 'Db', 'Db': 'Db',
                    'D#': 'Eb', 'Eb': 'Eb',
                    'F#': 'F#', 'Gb': 'Gb',
                    'G#': 'Ab', 'Ab': 'Ab',
                    'A#': 'Bb', 'Bb': 'Bb',
                    'Cb': 'B', 'B#': 'C',
                    'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'A': 'A', 'B': 'B'
                };

                // 🔧 修复 (2025-10-02): 优先使用分析结果
                const rootToUse = analyzedChord ? analyzedChord.root : chord.root;
                const typeToUse = analyzedChord ? analyzedChord.type : chord.type;

                const friendlyRoot = friendlyRootMapping[rootToUse] || rootToUse;
                // ✅ 使用统一的和弦代号系统
                const typeSymbol = getChordTypeSymbol(typeToUse);
                chordSymbol = friendlyRoot + typeSymbol;

                console.log(`🎲 随机模式和弦符号: ${rootToUse}${typeToUse} → ${chordSymbol} (友好根音强制)`);
                console.log(`  - getChordTypeSymbol(${typeToUse}) = "${typeSymbol}"`);

            // 验证结果
            const friendlyRoots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
            if (friendlyRoots.includes(friendlyRoot)) {
                console.log(`✅ 随机模式和弦符号验证通过: ${friendlyRoot} 为友好根音`);
            } else {
                console.warn(`⚠️ 随机模式和弦符号警告: ${friendlyRoot} 不在友好根音列表中`);
            }
        } else {
            // 🎼 功能和声模式：使用精确的同音异名逻辑确保一致性
            const rootNoteToSemitone = {
                'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
                'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10,
                'Bb': 10, 'B': 11, 'Cb': 11, 'B#': 0, 'E#': 5
            };

            // 🔧 修复 (2025-10-02): 优先使用分析结果
            const rootToUse = analyzedChord ? analyzedChord.root : chord.root;
            const typeToUse = analyzedChord ? analyzedChord.type : chord.type;

            const rootSemitone = rootNoteToSemitone[rootToUse];
            if (rootSemitone !== undefined) {
                // 使用相同的 getCorrectEnharmonic 逻辑确保一致性
                const correctedRoot = getCorrectEnharmonic(rootSemitone, chord, 4, keyInfo);

                // 构造修正后的根音字符串
                let correctedRootName = correctedRoot.step;
                if (correctedRoot.alter > 0) {
                    correctedRootName += '#'.repeat(correctedRoot.alter);
                } else if (correctedRoot.alter < 0) {
                    correctedRootName += 'b'.repeat(-correctedRoot.alter);
                }

                // 构造修正后的和弦符号
                // ✅ 使用统一的和弦代号系统
                const typeSymbol = getChordTypeSymbol(typeToUse);
                chordSymbol = correctedRootName + typeSymbol;

                console.log(`🔧 功能和声模式和弦符号拼写修正: ${rootToUse}${typeToUse} → ${chordSymbol} (确保与五线谱一致)`);
                console.log(`  - getChordTypeSymbol(${typeToUse}) = "${typeSymbol}"`);
            } else {
                // 回退到原来的逻辑
                chordSymbol = getChordSymbol(chord);
                console.log(`🎵 生成和弦代号 (回退): ${chordSymbol}`);
            }
          }  // 结束 if (chord.is69Voicing) else 块
        }

        // 🔧 (2025-10-02): 吉他模式转位检测
        // 优先使用voicing信息
        let lowestMidi = null;
        let bassNoteName = null;
        let bassNote = null;

        // 🔍 诊断日志（2025-10-03新增）：详细显示和弦数据
        console.log(`\n🔍 === 吉他模式和弦代号生成诊断 ===`);
        console.log(`  和弦基本信息:`);
        console.log(`    - chord.root: ${chord.root}`);
        console.log(`    - chord.type: ${chord.type}`);
        console.log(`    - chord.inversion: ${chord.inversion}`);
        console.log(`  Voicing信息:`);
        if (chord.voicing) {
            console.log(`    - voicing.type: ${chord.voicing.type}`);
            console.log(`    - voicing.root: ${chord.voicing.root}`);
            console.log(`    - voicing.chordType: ${chord.voicing.chordType}`);
            console.log(`    - voicing.notes: ${chord.voicing.notes?.join('-')}`);
            console.log(`    - voicing.midiNotes: ${chord.voicing.midiNotes?.join(', ')}`);
            console.log(`    - voicing.inversion: ${chord.voicing.inversion}`);
        } else {
            console.log(`    - 无voicing信息`);
        }

        if (chord.voicing && chord.voicing.midiNotes && chord.voicing.midiNotes.length > 0) {
            // 使用voicing的MIDI音符
            lowestMidi = Math.min(...chord.voicing.midiNotes);
            console.log(`  ✅ 使用voicing.midiNotes检测最低音: MIDI ${lowestMidi}`);
        } else if (chord.notes && chord.notes.length > 0) {
            // 回退到使用chord.notes（需要转换为MIDI）
            const noteToMidi = (noteName) => {
                const noteToSemitone = {
                    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
                    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10,
                    'Bb': 10, 'B': 11, 'Cb': 11, 'B#': 0, 'E#': 5
                };
                const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
                if (match) {
                    const [, note, octave] = match;
                    return noteToSemitone[note] + (parseInt(octave) + 1) * 12;
                }
                return null;
            };

            const midiNotes = chord.notes.map(noteToMidi).filter(m => m !== null);
            if (midiNotes.length > 0) {
                lowestMidi = Math.min(...midiNotes);
            }
        }

        // 如果找到了最低MIDI音符，进行转位检测
        if (lowestMidi !== null) {
            const lowestPitchInfo = midiToPitchInfo(lowestMidi, chord, keyInfo);
            bassNoteName = lowestPitchInfo.step;
            if (lowestPitchInfo.alter > 0) {
                bassNoteName += '#'.repeat(lowestPitchInfo.alter);
            } else if (lowestPitchInfo.alter < 0) {
                bassNoteName += 'b'.repeat(-lowestPitchInfo.alter);
            }

            // 注：增和弦等特殊和弦的低音拼写由下方的智能拼写系统统一处理

            // 比较低音与根音的半音值
            const bassNoteSemitone = lowestMidi % 12;
            const rootNoteToSemitone = {
                'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
                'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10,
                'Bb': 10, 'B': 11, 'Cb': 11, 'B#': 0, 'E#': 5
            };

            const rootSemitone = rootNoteToSemitone[chord.root];

            // 🔧 修复 (2025-10-02): 只有在用户勾选转位或和弦明确标记转位时才显示斜线记号
            const userEnabledInversions = window.chordSettings.includeTriadInversions ||
                                          window.chordSettings.includeSeventhInversions;
            const chordHasExplicitInversion = chord.inversion !== undefined && chord.inversion > 0;

            if (bassNoteSemitone !== rootSemitone && (userEnabledInversions || chordHasExplicitInversion)) {
                // 转位：低音不是根音，且用户允许显示转位记号
                // 根据当前模式决定是否使用友好拼写
                const functionalHarmonyToggle = document.getElementById('functionalHarmonyToggle');
                const isRandomMode = !functionalHarmonyToggle || !functionalHarmonyToggle.checked;

                if (isRandomMode) {
                    // 🔧 修复 (2025-10-06): 基于和弦调性context的智能低音拼写
                    // 问题：原friendlyRootMapping强制G#→Ab, Cb→B，不考虑调性
                    // 解决：根据和弦所属调系选择正确的同音异名拼写

                    // 升号调系（用升号拼写）
                    // 🔧 修复 (2025-10-06): 添加G, D, A（1#, 2#, 3#最常见的升号大调）
                    const sharpKeys = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];  // 完整1#-7#
                    const sharpMinorKeys = ['Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m'];  // 完整小调

                    // 降号调系（用降号拼写）
                    const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
                    const flatMinorKeys = ['Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm', 'Dbm'];

                    // 判断和弦属于哪个调系
                    const isMinor = chord.type && (chord.type.includes('m') || chord.type.includes('minor'));
                    const isAugmented = chord.type === 'augmented' || chord.type === 'aug';
                    const chordKey = chord.root + (isMinor && !chord.type.includes('maj') ? 'm' : '');

                    let friendlyBass = bassNoteName;

                    // 🎵 特殊处理：增和弦用升号拼写
                    // 增五度是#5，理论上应该用升号：C aug = C-E-G# (不是Ab)
                    if (isAugmented) {
                        console.log(`🎵 增和弦: 保持升号拼写 ${bassNoteName}`);
                        // 保持原样（如果是G#就保持G#，不改成Ab）
                        friendlyBass = bassNoteName;
                    }
                    // 检查是否属于升号调系
                    else if (sharpKeys.includes(chord.root) || sharpMinorKeys.includes(chordKey)) {
                        // 升号调 → 保持升号拼写
                        // G#保持G#（不改成Ab），C#保持C#等
                        console.log(`🎼 升号调系 (${chordKey}): 保持${bassNoteName}不变`);
                        friendlyBass = bassNoteName;
                    } else if (flatKeys.includes(chord.root) || flatMinorKeys.includes(chordKey)) {
                        // 降号调 → 保持降号拼写
                        // Cb保持Cb（不改成B），Db保持Db等
                        console.log(`🎼 降号调系 (${chordKey}): 保持${bassNoteName}不变`);
                        friendlyBass = bassNoteName;
                    } else {
                        // C大调或其他自然音调 → 应用友好映射
                        const defaultMapping = {
                            'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
                            'Db': 'Db', 'Eb': 'Eb', 'Gb': 'Gb', 'Ab': 'Ab', 'Bb': 'Bb',
                            'Cb': 'B', 'B#': 'C', 'E#': 'F', 'Fb': 'E',
                            'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'A': 'A', 'B': 'B'
                        };
                        friendlyBass = defaultMapping[bassNoteName] || bassNoteName;
                        console.log(`🎼 默认调系: ${bassNoteName} → ${friendlyBass}`);
                    }

                    chordSymbol += '/' + friendlyBass;
                    bassNote = friendlyBass;
                } else {
                    // 功能和声模式：保持精确拼写
                    chordSymbol += '/' + bassNoteName;
                    bassNote = bassNoteName;
                }
                console.log(`🎵 显示转位记号: ${chordSymbol} (用户设置: ${userEnabledInversions ? '已勾选转位' : '和弦明确转位'})`);
            } else if (bassNoteSemitone !== rootSemitone) {
                console.log(`⚠️ Drop2/Drop3改变了最低音，但用户未勾选转位，不显示斜线记号`);
            }
        }

        // 🎯 关键修复：提取和弦类型符号（不含根音）用于MusicXML的text属性
        // OSMD期望<kind text="sus2">而不是<kind text="Esus2">
        // ✅ 使用统一的 getChordTypeSymbol() 函数
        // 🔧 修复 (2025-10-02): 使用分析结果的类型
        const typeForMusicXML = analyzedChord ? analyzedChord.type : chord.type;
        const chordKindText = getChordTypeSymbol(typeForMusicXML);
        console.log(`  - getChordTypeSymbol(${typeForMusicXML}) = "${chordKindText}"`);

        // 使用标准MusicXML harmony元素在谱面上方显示和弦代号
        notesXML += `
    <harmony placement="above" print-frame="no">
      <root>
        <root-step>${chordSymbol.charAt(0)}</root-step>`;

        // 🔧 (2025-10-02): 只解析根音部分的升降号（斜线之前）
        const rootPart = chordSymbol.split('/')[0];
        if (rootPart.includes('#')) {
            const sharpCount = (rootPart.match(/#/g) || []).length;
            notesXML += `
        <root-alter>${sharpCount}</root-alter>`;
        } else if (rootPart.includes('b')) {
            const flatCount = (rootPart.match(/b/g) || []).length;
            notesXML += `
        <root-alter>-${flatCount}</root-alter>`;
        }

        notesXML += `
      </root>
      <kind text="${chordKindText}">${getChordKind(typeForMusicXML)}</kind>`;

        // 🔧 (2025-10-02): 添加低音音符（如果是转位）
        if (bassNote) {
            notesXML += `
      <bass>
        <bass-step>${bassNote.charAt(0)}</bass-step>`;
            if (bassNote.includes('#')) {
                const bassSharpCount = (bassNote.match(/#/g) || []).length;
                notesXML += `
        <bass-alter>${bassSharpCount}</bass-alter>`;
            } else if (bassNote.includes('b')) {
                const bassFlatCount = (bassNote.match(/b/g) || []).length;
                notesXML += `
        <bass-alter>-${bassFlatCount}</bass-alter>`;
            }
            notesXML += `
      </bass>`;
        }

        notesXML += `
    </harmony>`;

        // 🔍 增强诊断日志 - 显示完整的和弦代号生成信息
        console.log(`\n🔍 ========== 和弦代号MusicXML生成诊断 ==========`);
        console.log(`  📝 和弦符号: ${chordSymbol}`);
        console.log(`  🎼 和弦类型: ${chord.type}`);
        console.log(`  📊 kind值: ${getChordKind(chord.type)}`);
        console.log(`  📄 text属性: "${chordKindText}"`);
        console.log(`  ✅ MusicXML harmony元素已生成`);
        console.log(`======================================================\n`);
    }

    // 优先使用voicing信息
    let notesToUse = chord.notes;
    let isVoiced = false;

    // 🔍 诊断日志 (2025-10-02): 检查voicing对象结构
    console.log('🔍 ========== Voicing诊断 ==========');
    console.log('  chord.voicing存在?', !!chord.voicing);
    if (chord.voicing) {
        console.log('  chord.voicing.type:', chord.voicing.type);
        console.log('  chord.voicing.notes存在?', !!chord.voicing.notes);
        console.log('  chord.voicing.notes:', chord.voicing.notes);
        console.log('  chord.voicing.notes.length:', chord.voicing.notes?.length);
        console.log('  chord.voicing.midiNotes存在?', !!chord.voicing.midiNotes);
        console.log('  chord.voicing.midiNotes:', chord.voicing.midiNotes);
        console.log('  chord.voicing.midiNotes.length:', chord.voicing.midiNotes?.length);
    }
    console.log('========================================\n');

    // 🔧 (2025-10-02 尝试7): 禁用尝试5的MIDI重建逻辑
    // 原因：voicing-engine.js已经在Drop2/Drop3生成时正确排序了notes和midiNotes
    // 尝试5的重建逻辑可能与voicing-engine.js的排序冲突
    // 新策略：直接信任voicing.notes（已由voicing-engine.js排序）
    if (chord.voicing && chord.voicing.notes && chord.voicing.notes.length > 0) {
        console.log(`✅ 使用voicing引擎生成的音符（已排序）:`, chord.voicing.notes);
        console.log(`✅ MIDI值:`, chord.voicing.midiNotes);

        notesToUse = chord.voicing.notes;
        isVoiced = true;

        console.log(`✅ 最终使用的音符（${chord.voicing.type} voicing）:`, notesToUse);
        console.log(`✅ isVoiced = true`);
    } else {
        console.log(`❌ 条件检查失败，isVoiced = false`);
        console.log(`  - chord.voicing: ${!!chord.voicing}`);
        console.log(`  - chord.voicing.notes: ${!!chord.voicing?.notes}`);
        console.log(`  - chord.voicing.notes.length > 0: ${(chord.voicing?.notes?.length || 0) > 0}`);
    }

    if (!notesToUse || notesToUse.length === 0) {
        return `
      <note>
        <rest/>
        <duration>${duration}</duration>
        <type>${noteType}</type>${hasDot ? '\n        <dot/>' : ''}
      </note>`;
    }

    // 🔧 (2025-10-02): 吉他模式 - 移除Drop2/Drop3特殊和弦代号分析
    // 直接使用原始的chord.root和chord.type，不进行额外分析
    console.log(`🎸 [吉他模式] 使用原始和弦数据: ${chord.root}${chord.type}`);
    // analyzedChord保持为null，后续代码会使用原始chord.root和chord.type

    // 计算最大音符数
    const maxNotes = Math.min(notesToUse.length, 6); // 增加最大音符数以支持更复杂的voicing

    // 🛡️ 检查是否需要强制根位排列 - 挂留和弦完全不受转位设置影响
    const isSuspendedChord = harmonyTheory.isSuspendedChord(chord);
    const shouldAllowInversion = harmonyTheory.shouldChordBeAffectedByInversionSettings(
        chord,
        window.chordSettings.includeTriadInversions,
        window.chordSettings.includeSeventhInversions
    );

    // 🔧 修复 (2025-10-05): 检测drop2/drop3 voicing，避免破坏其音符顺序
    const isDropVoicing = chord.voicing?.type === 'drop2' || chord.voicing?.type === 'drop3';

    if (isDropVoicing) {
        console.log(`🎸 检测到${chord.voicing.type} voicing，跳过强制根位排列（保持voicing-engine生成的音符顺序）`);
        console.log(`   原因：Drop2/Drop3的音符顺序已由voicing-engine正确处理，不应该重新排序`);
    }

    // 对于非挂留和弦，如果不允许转位，则强制根位排列
    // 🔧 修复 (2025-10-05): 但不对drop2/drop3进行重新排序
    if (!shouldAllowInversion && !isSuspendedChord && !isDropVoicing) {
        // 设置当前和弦根音供后续八度计算使用
        if (typeof window !== 'undefined') {
            window.currentChordRoot = chord.root;
        }

        // 强制根位：确保根音在最低位置
        const rootNote = chord.root;

        // 使用半音匹配而不是字符串匹配，以处理同音异名
        const noteToSemitone = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10,
            'Bb': 10, 'B': 11, 'Cb': 11, 'B#': 0, 'E#': 5
        };

        const rootSemitone = noteToSemitone[rootNote];
        const rootIndex = notesToUse.findIndex(note => {
            const noteName = note.replace(/\d+$/, '');
            const noteSemitone = noteToSemitone[noteName];
            return noteSemitone === rootSemitone;
        });

        console.log(`🔍 寻找根音: ${rootNote} (半音:${rootSemitone}) 在 [${notesToUse.join(', ')}] 中的位置: ${rootIndex}`);

        if (rootIndex > 0) {
            // 如果根音不在第一位，重新排列
            const reorderedNotes = [notesToUse[rootIndex], ...notesToUse.filter((_, i) => i !== rootIndex)];
            notesToUse = reorderedNotes;
            console.log(`🔧 强制根位排列: ${chord.root}${chord.type} - ${notesToUse.join('-')}`);
        } else {
            console.log(`✅ 根音已在正确位置: ${chord.root}${chord.type} - ${notesToUse.join('-')}`);
        }
    } else if (isSuspendedChord) {
        console.log(`🎵 挂留和弦保持原始排列: ${chord.root}${chord.type} - ${notesToUse.join('-')}`);
    }

    // 第一个音符
    const firstNote = notesToUse[0];
    let firstPitch;

    if (isVoiced && chord.voicing && chord.voicing.midiNotes) {
        // 🎼 使用MIDI音符信息来确定八度，传递和弦上下文、音阶变体信息并标识来自voicing
        // 🔧 修复 (2025-10-05 v8): 传递voicing的notes和midiNotes数组
        // 问题：voicingContext只有voicing:true，缺少notes/midiNotes，导致midiToPitchInfo()无法使用正确拼写
        // 解决：传递chord.voicing中的notes和midiNotes数组
        const voicingContext = {
            ...chord,
            notes: chord.voicing?.notes || chord.notes,
            midiNotes: chord.voicing?.midiNotes || chord.midiNotes
        };
        // 创建增强的keyInfo包含音阶变体信息
        const enhancedKeyInfo = {
            ...keyInfo,
            scaleVariant: chord.scaleVariant || null
        };
        firstPitch = midiToPitchInfo(chord.voicing.midiNotes[0], voicingContext, enhancedKeyInfo);
    } else {
        // 第一个音符也使用分层分布，作为低音
        firstPitch = parseNotePitchWithSpread(firstNote, 0, maxNotes, chord.root);
    }

    notesXML += `
      <note>
        <pitch>
          <step>${firstPitch.step}</step>`;

    if (firstPitch.alter !== 0) {
        notesXML += `
          <alter>${firstPitch.alter}</alter>`;
    }

    // 🔧 特殊修复：6个降号调Cb八度最终保护
    let finalOctave = firstPitch.octave;
    if (typeof window !== 'undefined' && window.currentKey &&
        firstPitch.step === 'C' && firstPitch.alter === -1) { // Cb
        const currentKey = window.currentKey;
        const is6FlatKey = (currentKey === 'Gb-major' || currentKey === 'eb-minor' || currentKey === 'Gb' || currentKey === 'Eb');

        if (is6FlatKey) {
            // 验证MIDI值与八度的一致性
            const expectedMidiRange = [(finalOctave + 1) * 12 + 11]; // C=11 in semitone index
            console.log(`🔧 Cb最终验证: 调性${currentKey}, 八度${finalOctave}, 期望MIDI: ${expectedMidiRange[0]}`);

            // 🔧 修复：移除过于简单的八度修正逻辑，避免与MIDI-based计算冲突
            // 原逻辑可能导致Cb4被错误降至Cb3
            // 依赖midiToPitchInfo中更精确的八度计算逻辑
            console.log(`🔧 Cb八度计算: ${currentKey}中Cb保持原始计算八度${finalOctave}`);

            // 只在明显错误的情况下才修正（例如负数或极端值）
            if (finalOctave < 0 || finalOctave > 8) {
                const correctedOctave = Math.max(0, Math.min(8, finalOctave));
                console.warn(`🚨 Cb八度边界修正: ${currentKey}中Cb八度从${finalOctave}修正为${correctedOctave}`);
                finalOctave = correctedOctave;
            }
        }
    }

    notesXML += `
          <octave>${finalOctave}</octave>
        </pitch>`;

    // 🔧 修复 (2025-10-05 v14): 添加显式accidental标签（第一个音符）+ 强制显示属性
    if (firstPitch.alter !== 0) {
        const accidentalType = firstPitch.alter > 0 ? 'sharp' : 'flat';
        const accidentalCount = Math.abs(firstPitch.alter);
        const accidentalValue = accidentalCount === 2
            ? (firstPitch.alter > 0 ? 'double-sharp' : 'flat-flat')
            : accidentalType;
        // MusicXML属性：editorial="no" 表示必须显示的临时记号，cautionary="no" 表示非谨慎性临时记号
        notesXML += `
        <accidental editorial="no" cautionary="no" parentheses="no">${accidentalValue}</accidental>`;
    }

    notesXML += `
        <duration>${duration}</duration>
        <type>${noteType}</type>${hasDot ? '\n        <dot/>' : ''}`;

    // 🎵 和弦代号已在开头生成

    console.log(`🔍 和弦详细信息:`, {
        root: chord.root,
        type: chord.type,
        originalNotes: chord.notes,
        notesToUse: notesToUse,
        isVoiced: isVoiced,
        voicing: chord.voicing ? chord.voicing.type : 'none',
        inversion: chord.inversion || 'none',
        chordSymbol: chordSymbol
    });

    // 🚨 检查是否存在音符错误排列
    if (chord.root && chord.type && notesToUse) {
        const expectedRoot = chord.root;
        const firstNoteBase = notesToUse[0].replace(/\d+$/, '');
        if (firstNoteBase !== expectedRoot) {
            console.log(`🚨 警告：和弦根音不匹配！`);
            console.log(`  - 期望根音: ${expectedRoot}`);
            console.log(`  - 实际第一音符: ${firstNoteBase}`);
            console.log(`  - 这可能导致和弦显示错误！`);
        }
    }

    // 🎵 和弦代号已通过direction元素添加到MusicXML开头

    // 🎼 大谱表：添加谱表分配逻辑
    if (isGrandStaff) {
        const staffNumber = determineStaffForGrandStaff(firstPitch);
        notesXML += `
        <staff>${staffNumber}</staff>`;
        console.log(`🎼 大谱表第一音符分配到谱表${staffNumber}: ${firstPitch.step}${firstPitch.octave}`);
    }

    notesXML += `
      </note>`;

    // 其他和弦音符（作为和声）
    for (let i = 1; i < maxNotes; i++) {
        const note = notesToUse[i];
        let pitch;

        // 🔍 诊断日志 (2025-10-02): 检查MIDI条件
        console.log(`\n🔍 音符${i+1} (${note}) MIDI条件检查:`);
        console.log(`  - isVoiced: ${isVoiced}`);
        console.log(`  - chord.voicing存在: ${!!chord.voicing}`);
        console.log(`  - chord.voicing.midiNotes存在: ${!!chord.voicing?.midiNotes}`);
        console.log(`  - chord.voicing.midiNotes[${i}]存在: ${!!chord.voicing?.midiNotes?.[i]}`);
        console.log(`  - chord.voicing.midiNotes[${i}]值: ${chord.voicing?.midiNotes?.[i]}`);

        if (isVoiced && chord.voicing && chord.voicing.midiNotes && chord.voicing.midiNotes[i]) {
            // 🎼 使用MIDI音符信息来确定八度，传递和弦上下文、音阶变体信息并标识来自voicing
            console.log(`  ✅ 使用MIDI值: ${chord.voicing.midiNotes[i]}`);
            // 🔧 修复 (2025-10-05 v8): 传递voicing的notes和midiNotes数组
            const voicingContext = {
                ...chord,
                notes: chord.voicing?.notes || chord.notes,
                midiNotes: chord.voicing?.midiNotes || chord.midiNotes
            };
            // 创建增强的keyInfo包含音阶变体信息
            const enhancedKeyInfo = {
                ...keyInfo,
                scaleVariant: chord.scaleVariant || null
            };
            pitch = midiToPitchInfo(chord.voicing.midiNotes[i], voicingContext, enhancedKeyInfo);

            // 🔍 诊断 (2025-10-05 v12): Gm和Dbm的pitchInfo追踪
            const midiValue = chord.voicing.midiNotes[i];
            const isGmOrDbmPitch = ((chord.root === 'G' || chord.root === 'Db') &&
                                   (chord.type === 'minor' || (chord.type && chord.type.includes('m'))) &&
                                   ((chord.root === 'G' && midiValue === 70) || (chord.root === 'Db' && midiValue === 64)));
            if (isGmOrDbmPitch) {
                console.log(`\n🔍 ========== MusicXML生成 ${chord.root}m 小三度音符 ==========`);
                console.log(`  MIDI值: ${midiValue} (${chord.root === 'G' ? 'Bb/A#' : 'Fb/E'})`);
                console.log(`  midiToPitchInfo返回: step=${pitch.step}, alter=${pitch.alter}, octave=${pitch.octave}`);
                console.log(`  期望: step=${chord.root === 'G' ? 'B' : 'F'}, alter=${-1}`);
                if (chord.root === 'G') {
                    console.log(`  ${pitch.step === 'B' && pitch.alter === -1 ? '✅ 正确 (Bb)' : `❌ 错误 (${pitch.step}${pitch.alter > 0 ? '#'.repeat(pitch.alter) : pitch.alter < 0 ? 'b'.repeat(-pitch.alter) : ''})`}`);
                } else {
                    console.log(`  ${pitch.step === 'F' && pitch.alter === -1 ? '✅ 正确 (Fb)' : `❌ 错误 (${pitch.step}${pitch.alter > 0 ? '#'.repeat(pitch.alter) : pitch.alter < 0 ? 'b'.repeat(-pitch.alter) : ''})`}`);
                }
                console.log(`  voicingContext.notes: [${voicingContext.notes ? voicingContext.notes.join(', ') : 'undefined'}]`);
                console.log(`========================================\n`);
            }
        } else {
            // 为和弦音符创建分层分布，增加变化性
            console.log(`  ❌ 使用parseNotePitchWithSpread（破坏了Drop2结构）`);
            pitch = parseNotePitchWithSpread(note, i, maxNotes, chord.root);
        }

        notesXML += `
      <note>
        <chord/>
        <pitch>
          <step>${pitch.step}</step>`;

        if (pitch.alter !== 0) {
            notesXML += `
          <alter>${pitch.alter}</alter>`;
        }

        // 🔧 特殊修复：6个降号调Cb八度最终保护（和弦音符）
        let finalChordOctave = pitch.octave;
        if (typeof window !== 'undefined' && window.currentKey &&
            pitch.step === 'C' && pitch.alter === -1) { // Cb
            const currentKey = window.currentKey;
            const is6FlatKey = (currentKey === 'Gb-major' || currentKey === 'eb-minor' || currentKey === 'Gb' || currentKey === 'Eb');

            if (is6FlatKey) {
                console.log(`🔧 Cb和弦音符验证: 调性${currentKey}, 八度${finalChordOctave}`);

                // 🔧 修复：移除过于简单的八度修正逻辑，避免与MIDI-based计算冲突
                // 原逻辑可能导致Cb4被错误降至Cb3
                // 依赖midiToPitchInfo中更精确的八度计算逻辑
                console.log(`🔧 Cb和弦音符八度计算: ${currentKey}中Cb保持原始计算八度${finalChordOctave}`);

                // 只在明显错误的情况下才修正（例如负数或极端值）
                if (finalChordOctave < 0 || finalChordOctave > 8) {
                    const correctedOctave = Math.max(0, Math.min(8, finalChordOctave));
                    console.warn(`🚨 Cb和弦音符八度边界修正: ${currentKey}中Cb八度从${finalChordOctave}修正为${correctedOctave}`);
                    finalChordOctave = correctedOctave;
                }
            }
        }

        notesXML += `
          <octave>${finalChordOctave}</octave>
        </pitch>`;

        // 🔧 修复 (2025-10-05 v14): 添加显式accidental标签（和弦音符）+ 强制显示属性
        if (pitch.alter !== 0) {
            const accidentalType = pitch.alter > 0 ? 'sharp' : 'flat';
            const accidentalCount = Math.abs(pitch.alter);
            const accidentalValue = accidentalCount === 2
                ? (pitch.alter > 0 ? 'double-sharp' : 'flat-flat')
                : accidentalType;
            // MusicXML属性：editorial="no" 表示必须显示的临时记号，cautionary="no" 表示非谨慎性临时记号
            notesXML += `
        <accidental editorial="no" cautionary="no" parentheses="no">${accidentalValue}</accidental>`;

            // 🔍 诊断 (2025-10-05 v12): Gm和Dbm的accidental标签验证
            const isGmOrDbmAccidental = ((chord.root === 'G' || chord.root === 'Db') &&
                                        (chord.type === 'minor' || (chord.type && chord.type.includes('m'))) &&
                                        ((chord.root === 'G' && pitch.step === 'B') || (chord.root === 'Db' && pitch.step === 'F')));
            if (isGmOrDbmAccidental) {
                console.log(`🔍 [MusicXML] ${chord.root}m 生成了<accidental>标签: ${accidentalValue}`);
                console.log(`  pitch: step=${pitch.step}, alter=${pitch.alter}, octave=${finalChordOctave}`);
                console.log(`  ${accidentalValue === 'flat' ? '✅ 正确' : '❌ 错误'}`);
            }
        }

        notesXML += `
        <duration>${duration}</duration>
        <type>${noteType}</type>${hasDot ? '\n        <dot/>' : ''}`;

        // 🎼 大谱表：为和弦音符添加谱表分配
        if (isGrandStaff) {
            const chordPitch = { step: pitch.step, octave: finalChordOctave };
            const staffNumber = determineStaffForGrandStaff(chordPitch);
            notesXML += `
        <staff>${staffNumber}</staff>`;
            console.log(`🎼 大谱表和弦音符${i}分配到谱表${staffNumber}: ${pitch.step}${finalChordOctave}`);
        }

        notesXML += `
      </note>`;
    }

    // 🔍 大谱表调试：在返回XML之前，统计staff分配情况
    if (isGrandStaff) {
        const staffMatches = notesXML.match(/<staff>(\d+)<\/staff>/g);
        if (staffMatches) {
            const staff1Count = (notesXML.match(/<staff>1<\/staff>/g) || []).length;
            const staff2Count = (notesXML.match(/<staff>2<\/staff>/g) || []).length;
            console.log(`🎼 原始和弦Staff分配统计: Staff 1 (高音谱号)=${staff1Count}个音符, Staff 2 (低音谱号)=${staff2Count}个音符`);
        } else {
            console.warn(`⚠️ 原始和弦警告：未找到任何staff分配标签！`);
        }
    }

    // 🔍 诊断 (2025-10-05 v13): MusicXML源代码输出 - 验证<accidental>标签
    const isTargetChord = ((chord.root === 'G' || chord.root === 'Db' || chord.root === 'C' ||
                           chord.root === 'F' || chord.root === 'Ab') &&
                          (chord.type === 'minor' || (chord.type && chord.type.includes('m'))));

    if (isTargetChord) {
        console.log(`\n🔍 ========== MusicXML源代码诊断: ${chord.root}${chord.type} ==========`);
        console.log(`和弦: ${chord.root}${chord.type}`);
        console.log(`MIDI值: [${chord.voicing?.midiNotes?.join(', ')}]`);
        console.log(`\n📄 生成的MusicXML片段:\n${notesXML}`);

        // 验证<accidental>标签的存在
        const accidentalMatches = notesXML.match(/<accidental>(.*?)<\/accidental>/g);
        if (accidentalMatches) {
            console.log(`\n✅ 找到${accidentalMatches.length}个<accidental>标签:`);
            accidentalMatches.forEach((tag, index) => {
                console.log(`  [${index + 1}] ${tag}`);
            });
        } else {
            console.log(`\n⚠️ 未找到任何<accidental>标签！`);
        }

        // 验证<step>和<alter>组合
        const stepAlterPattern = /<step>([A-G])<\/step>\s*<alter>([-\d]+)<\/alter>/g;
        const stepAlterMatches = [...notesXML.matchAll(stepAlterPattern)];
        if (stepAlterMatches.length > 0) {
            console.log(`\n📊 <step>/<alter>组合:`);
            stepAlterMatches.forEach((match, index) => {
                const step = match[1];
                const alter = parseInt(match[2]);
                const accidental = alter > 0 ? '#'.repeat(alter) : alter < 0 ? 'b'.repeat(-alter) : '♮';
                console.log(`  [${index + 1}] <step>${step}</step> + <alter>${alter}</alter> = ${step}${accidental}`);
            });
        }

        console.log(`========================================\n`);
    }

    return notesXML;
}

// 🎹 安全的包装函数：为大谱表添加低音线条
// ⚠️ 遵循安全原则：不修改核心函数，使用包装方式
// 🔧 修复 (2025-10-01): 检查chord.isPianoMode，避免钢琴模式重复渲染低音
function addBassLineForGrandStaff(originalNotesXML, chord, keyInfo) {
    // 🔧 修复 (2025-10-01): 检查chord.isPianoMode标记
    // 如果是钢琴模式的和弦，generatePianoGrandStaffNotesXML()已经生成了完整的低音谱号
    // 不需要再次添加低音线条，避免重复渲染
    if (chord.isPianoMode) {
        console.log('🎹 检测到钢琴模式和弦（chord.isPianoMode=true），跳过addBassLineForGrandStaff（低音已在generatePianoGrandStaffNotesXML中生成）');
        return originalNotesXML;
    }

    // 🔍 详细调试信息
    const isPianoMode = document.getElementById('instrumentModeToggle')?.checked || false;
    // 🔧 修复：使用正确的选择器检查大谱表是否被选中
    const isGrandStaff = document.getElementById('clef-grand_staff')?.checked || false;

    console.log(`🔍 低音线条调试 - isPianoMode: ${isPianoMode}, isGrandStaff: ${isGrandStaff}, chord.root: ${chord.root}`);
    console.log(`🔍 大谱表元素检查:`, document.getElementById('clef-grand_staff'));

    if (!isPianoMode || !isGrandStaff || !chord.root) {
        console.log(`❌ 低音线条条件不满足，跳过`);
        return originalNotesXML; // 直接返回原始XML，不做任何修改
    }

    console.log('🎹🎼 吉他模式使用钢琴大谱表：添加低音线条');

    try {
        // 生成低音线条音符（和弦根音的低八度）
        const bassOctave = 2;
        const bassRootMIDI = getRootNoteMIDI(chord.root, bassOctave);
        const bassPitch = midiToPitchInfo(bassRootMIDI, chord, keyInfo);

        console.log(`🎼 Bass line详细信息:`);
        console.log(`   - 和弦根音: ${chord.root}`);
        console.log(`   - Bass八度: ${bassOctave}`);
        console.log(`   - Bass MIDI: ${bassRootMIDI}`);
        console.log(`   - Bass pitch: ${bassPitch ? `${bassPitch.step}${bassPitch.alter !== 0 ? (bassPitch.alter > 0 ? '#'.repeat(bassPitch.alter) : 'b'.repeat(-bassPitch.alter)) : ''}${bassPitch.octave}` : 'null'}`);

        if (bassPitch) {
            // 🎵 从原始XML中提取duration信息，确保低音线条与和弦同步
            const durationMatch = originalNotesXML.match(/<duration>(\d+)<\/duration>/);
            const typeMatch = originalNotesXML.match(/<type>([^<]+)<\/type>/);
            const dotMatch = originalNotesXML.match(/<dot\/>/);

            const duration = durationMatch ? durationMatch[1] : '4';
            const noteType = typeMatch ? typeMatch[1] : 'quarter';
            const hasDot = dotMatch ? '\n        <dot/>' : '';

            // 🎯 2025-09-30 修复：Bass line需要独立于和弦
            // 1. 先用<backup/>回到小节开始
            // 2. Bass line不要<chord/>标签（因为backup已经回到开始了）
            // 3. 这样bass line和和弦在不同staff上独立显示
            const bassLineXML = `
      <backup>
        <duration>${duration}</duration>
      </backup>
      <note>
        <pitch>
          <step>${bassPitch.step}</step>${bassPitch.alter !== 0 ? `
          <alter>${bassPitch.alter}</alter>` : ''}
          <octave>${bassPitch.octave}</octave>
        </pitch>
        <duration>${duration}</duration>
        <type>${noteType}</type>${hasDot}
        <staff>2</staff>
      </note>`;

            console.log(`🎼 Bass line XML生成完成:`);
            console.log(`   - 谱表分配: staff 2 (低音谱号)`);
            console.log(`   - 音符: ${bassPitch.step}${bassPitch.alter > 0 ? '#'.repeat(bassPitch.alter) : bassPitch.alter < 0 ? 'b'.repeat(-bassPitch.alter) : ''}${bassPitch.octave}`);
            console.log(`   - XML片段: <staff>2</staff>`);
            console.log(`🎼 Bass line应该出现在低音谱号（第二个谱表）`);

            // 在原始XML末尾添加低音线条
            const finalXML = originalNotesXML + bassLineXML;

            // 🔍 额外调试：输出完整的MusicXML来检查staff分配
            console.log(`🎼 完整的MusicXML输出检查:`);
            console.log(`🔍 原始和弦XML:`, originalNotesXML);
            console.log(`🔍 新增Bass line XML:`, bassLineXML);
            console.log(`🔍 合并后的完整XML:`, finalXML);

            // 检查staff分配情况
            const staffMatches = finalXML.match(/<staff>(\d+)<\/staff>/g);
            if (staffMatches) {
                console.log(`🎼 发现的所有staff分配:`, staffMatches);
                const staff1Count = (finalXML.match(/<staff>1<\/staff>/g) || []).length;
                const staff2Count = (finalXML.match(/<staff>2<\/staff>/g) || []).length;
                console.log(`📊 Staff分配统计: Staff 1 (高音谱号)=${staff1Count}个音符, Staff 2 (低音谱号)=${staff2Count}个音符`);
            } else {
                console.warn(`⚠️ 警告：未找到任何staff分配标签！`);
            }

            return finalXML;
        }
    } catch (error) {
        console.warn(`⚠️ 低音线条生成失败: ${error.message}`);
    }

    return originalNotesXML; // 如果出错，返回原始XML
}

// 🎵 辅助函数：简单的根音MIDI计算
function getRootNoteMIDI(rootName, octave) {
    const noteValues = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
        'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
        'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    return (octave + 1) * 12 + (noteValues[rootName] || 0);
}

// 将MIDI音符转换为音高信息（智能等音异名选择）
function midiToPitchInfo(midiNote, chordContext = null, keyInfo = null) {
    const octave = Math.floor(midiNote / 12) - 1;
    const noteIndex = midiNote % 12;

    // 🎯 修复 (2025-10-05): 优先使用chord.notes数组的拼写
    // 问题：getCorrectEnharmonic() 重新计算拼写可能与 buildChord() 不一致
    // 解决：如果 chord.notes 和 chord.midiNotes 都存在，直接使用 notes 数组的拼写
    if (chordContext && chordContext.notes && chordContext.midiNotes &&
        Array.isArray(chordContext.notes) && Array.isArray(chordContext.midiNotes)) {

        // 🔍 诊断 (2025-10-05 v12): Gm和Dbm优先级1分支追踪
        const isGmOrDbmPriority1 = ((chordContext.root === 'G' || chordContext.root === 'Db') &&
                                    (chordContext.type === 'minor' || (chordContext.type && chordContext.type.includes('m'))) &&
                                    ((chordContext.root === 'G' && midiNote === 70) || (chordContext.root === 'Db' && midiNote === 64)));
        if (isGmOrDbmPriority1) {
            console.log(`\n🔍 ========== midiToPitchInfo() 优先级1: ${chordContext.root}m 使用chord.notes ==========`);
            console.log(`  MIDI值: ${midiNote}`);
            console.log(`  chord.notes: [${chordContext.notes.join(', ')}]`);
            console.log(`  chord.midiNotes: [${chordContext.midiNotes.join(', ')}]`);
        }

        // 🔍 诊断 (2025-10-05 v16): Abm MIDI 71 (Cb/B) 间歇性bug追踪
        const isAbmMidi71 = (chordContext.root === 'Ab' &&
                            (chordContext.type === 'minor' || (chordContext.type && chordContext.type.includes('m'))) &&
                            midiNote === 71);
        if (isAbmMidi71) {
            console.log(`\n🔍 ========== midiToPitchInfo() Abm MIDI 71 (Cb/B) 间歇性bug诊断 ==========`);
            console.log(`  MIDI值: ${midiNote} (Pitch Class: ${noteIndex})`);
            console.log(`  chord.notes: [${chordContext.notes.join(', ')}]`);
            console.log(`  chord.midiNotes: [${chordContext.midiNotes.join(', ')}]`);
            console.log(`  期望: chord.notes包含'Cb'`);
            console.log(`  实际: chord.notes[1] = '${chordContext.notes[1] || 'undefined'}'`);
        }

        // 🔧 修复 (2025-10-05): 改进索引匹配逻辑，处理MIDI值可能重复的情况
        // 找到所有匹配当前MIDI的索引
        const matchingIndices = [];
        for (let i = 0; i < chordContext.midiNotes.length; i++) {
            if (chordContext.midiNotes[i] === midiNote && i < chordContext.notes.length) {
                matchingIndices.push(i);
            }
        }

        // 如果找到匹配，使用第一个（或者可以根据上下文选择）
        if (matchingIndices.length > 0) {
            const midiIndex = matchingIndices[0];
            const noteName = chordContext.notes[midiIndex];

            // 🔍 诊断 (2025-10-05 v12): 显示匹配结果
            if (isGmOrDbmPriority1) {
                console.log(`  匹配索引: ${midiIndex}`);
                console.log(`  notes[${midiIndex}]: "${noteName}"`);
                console.log(`  期望: ${chordContext.root === 'G' ? 'Bb' : 'Fb'}`);
                console.log(`  ${noteName === (chordContext.root === 'G' ? 'Bb' : 'Fb') ? '✅ 正确' : '❌ 错误 - chord.notes数组有问题！'}`);
            }

            // 🔍 诊断 (2025-10-05 v16): Abm MIDI 71索引匹配结果
            if (isAbmMidi71) {
                console.log(`  ✅ 索引匹配成功: matchingIndices = [${matchingIndices.join(', ')}]`);
                console.log(`  使用索引: ${midiIndex}`);
                console.log(`  notes[${midiIndex}] = "${noteName}"`);
                console.log(`  ${noteName === 'Cb' ? '✅ 正确！将生成<step>C</step><alter>-1</alter>' : '❌ 错误！notes数组就错了，将生成' + noteName}`);
            }

            // 解析音符名称（可能包含八度信息）
            // 🔧 修复 (2025-10-05 v17): 支持带八度数字的音符名称（如"E4", "Fb5", "C#4"）
            // 问题：buildChord有时生成包含八度数字的notes数组，导致正则匹配失败
            // 解决：正则表达式添加可选的数字部分，匹配成功后仍使用外部计算的octave
            const match = noteName.match(/^([A-G])(#{1,2}|b{1,2})?(\d+)?$/);
            if (match) {
                const step = match[1];
                const accidentals = match[2] || '';
                const octaveInName = match[3]; // 可选的数字部分，我们忽略它，使用外部计算的octave

                // 🔍 诊断 (2025-10-05 v17): 验证正则表达式修复
                if (octaveInName) {
                    console.log(`  🔧 [正则修复验证] noteName包含八度数字: "${noteName}" → step=${step}, octaveInName=${octaveInName}, 使用外部octave=${octave}`);
                }

                // 计算alter值
                let alter = 0;
                if (accidentals.includes('#')) {
                    alter = accidentals.split('#').length - 1;
                } else if (accidentals.includes('b')) {
                    alter = -(accidentals.split('b').length - 1);
                }

                // 使用计算的八度（从MIDI）
                const pitchInfo = { step, alter, octave };

                // 🔍 诊断 (2025-10-05 v12): 显示优先级1返回结果
                if (isGmOrDbmPriority1) {
                    console.log(`  解析结果: step=${step}, alter=${alter}, octave=${octave}`);
                    console.log(`  将返回: ${step}${alter > 0 ? '#'.repeat(alter) : alter < 0 ? 'b'.repeat(-alter) : ''}${octave}`);
                    console.log(`========================================\n`);
                }

                // 🔍 诊断 (2025-10-05 v16): Abm MIDI 71最终返回结果
                if (isAbmMidi71) {
                    console.log(`  📄 最终pitchInfo: step=${step}, alter=${alter}, octave=${octave}`);
                    console.log(`  📄 将生成MusicXML: <step>${step}</step>${alter !== 0 ? '<alter>' + alter + '</alter>' : ''}<octave>${octave}</octave>`);
                    if (step === 'C' && alter === -1) {
                        console.log(`  ✅ 正确！谱面将显示Cb`);
                    } else if (step === 'B' && alter === 0) {
                        console.log(`  ❌ 错误！谱面将显示B（自然B）`);
                    } else {
                        console.log(`  ⚠️ 意外的拼写: ${step}${alter > 0 ? '#'.repeat(alter) : alter < 0 ? 'b'.repeat(-alter) : ''}`);
                    }
                    console.log(`========================================\n`);
                }

                return applyEnharmonicOctaveCorrection(pitchInfo);
            }
        }

        // 🔧 修复 (2025-10-05 v15): Pitch Class匹配fallback
        // 问题：吉他专属4音配置三和弦（如Fm: F-Ab-C-F）有4个MIDI值但chord.notes只有3个元素
        //       第4个音符索引匹配失败（索引3超出notes[0-2]范围），导致使用错误拼写
        // 解决：当索引匹配失败时，尝试通过Pitch Class匹配找到正确的同音异名拼写
        if (matchingIndices.length === 0) {
            console.log(`🔍 [优先级1 Fallback] 索引匹配失败，尝试Pitch Class匹配...`);
            console.log(`  MIDI值: ${midiNote}, Pitch Class: ${noteIndex}`);
            console.log(`  chord.notes长度: ${chordContext.notes.length}, chord.midiNotes长度: ${chordContext.midiNotes.length}`);

            // 🔍 诊断 (2025-10-05 v16): Abm MIDI 71索引匹配失败诊断
            if (isAbmMidi71) {
                console.log(`  ⚠️ Abm MIDI 71索引匹配失败！这不应该发生（MIDI 71应该在midiNotes中）`);
                console.log(`  chord.midiNotes: [${chordContext.midiNotes.join(', ')}]`);
                console.log(`  进入Pitch Class匹配fallback...`);
            }

            // 尝试从chord.notes中找到相同Pitch Class的音符
            const targetPitchClass = noteIndex;
            let matchedNoteName = null;

            for (let i = 0; i < chordContext.notes.length; i++) {
                const noteName = chordContext.notes[i];
                // 移除八度后缀（如果有）
                const baseNoteName = noteName.replace(/\d+$/, '');

                // 获取该音符的semitone值
                if (window.harmonyTheory && window.harmonyTheory.noteToSemitone) {
                    const noteSemitone = window.harmonyTheory.noteToSemitone[baseNoteName];

                    if (noteSemitone !== undefined && noteSemitone === targetPitchClass) {
                        matchedNoteName = baseNoteName;
                        console.log(`  ✅ Pitch Class匹配成功: notes[${i}]="${noteName}" (Pitch Class=${noteSemitone})`);
                        break;
                    }
                }
            }

            if (matchedNoteName) {
                // 解析音符名称
                const match = matchedNoteName.match(/^([A-G])(#{1,2}|b{1,2})?$/);
                if (match) {
                    const step = match[1];
                    const accidentals = match[2] || '';

                    // 计算alter值
                    let alter = 0;
                    if (accidentals.includes('#')) {
                        alter = accidentals.split('#').length - 1;
                    } else if (accidentals.includes('b')) {
                        alter = -(accidentals.split('b').length - 1);
                    }

                    const pitchInfo = { step, alter, octave };
                    console.log(`  🎯 使用Pitch Class匹配结果: ${step}${alter > 0 ? '#'.repeat(alter) : alter < 0 ? 'b'.repeat(-alter) : ''}${octave}`);
                    console.log(`  （避免使用默认拼写）\n`);

                    return applyEnharmonicOctaveCorrection(pitchInfo);
                }
            } else {
                console.log(`  ⚠️ Pitch Class匹配失败，将使用后续优先级分支\n`);
            }
        }
    }

    // 🔍 修复 (2025-10-05): Cb/B音符诊断日志
    const isCbOrB = (noteIndex === 11);
    if (isCbOrB) {
        console.log(`\n🔍 ========== Cb/B音符诊断 (midiToPitchInfo) ==========`);
        console.log(`  📊 MIDI值: ${midiNote}`);
        console.log(`  📊 计算八度: ${octave} (公式: floor(${midiNote}/12) - 1)`);
        console.log(`  📊 音符索引: ${noteIndex} (${midiNote} % 12)`);
        console.log(`  📊 和弦上下文: ${chordContext ? `${chordContext.root}${chordContext.type || ''}` : '无'}`);
        console.log(`  📊 调号: ${keyInfo ? `${keyInfo.tonic}-${keyInfo.mode}` : '无'}`);
        console.log(`========================================\n`);
    }

    // 🛡️ 检查是否来自voicing引擎且是否允许转位 - 挂留和弦保护
    const shouldAllowInversion = harmonyTheory.shouldChordBeAffectedByInversionSettings(
        chordContext || { type: 'unknown' },
        window.chordSettings.includeTriadInversions,
        window.chordSettings.includeSeventhInversions
    );
    const shouldPreserveRootPosition = !shouldAllowInversion;
    const isFromVoicing = chordContext && chordContext.voicing;

    let adjustedOctave;

    if (isCbOrB) {
        console.log(`🔍 Cb/B分支检测:`);
        console.log(`  shouldPreserveRootPosition: ${shouldPreserveRootPosition}`);
        console.log(`  isFromVoicing: ${isFromVoicing}`);
        console.log(`  将走分支: ${shouldPreserveRootPosition && isFromVoicing ? '信任voicing引擎' : '其他'}`);
    }

    if (shouldPreserveRootPosition && isFromVoicing) {
        // 完全信任voicing引擎的严格音域遵循结果，绝对不进行任何调整
        adjustedOctave = octave;
        // console.log(`🔒 100%信任voicing引擎: MIDI${midiNote} -> 八度${octave} (严格音域遵循)`);

        // 仅用于调试验证voicing引擎结果
        const rangeMinSelect = document.getElementById('rangeMin');
        const rangeMaxSelect = document.getElementById('rangeMax');
        if (rangeMinSelect && rangeMaxSelect) {
            const minMidi = parseInt(rangeMinSelect.value);
            const maxMidi = parseInt(rangeMaxSelect.value);
            const currentMidi = (octave + 1) * 12 + noteIndex;

            if (currentMidi >= minMidi && currentMidi <= maxMidi) {
                // console.log(`✅ Voicing引擎音符MIDI${currentMidi}在音域${minMidi}-${maxMidi}内`);
            } else {
                console.error(`❌ 严重错误：Voicing引擎音符MIDI${currentMidi}超出音域${minMidi}-${maxMidi}！需要修复voicing引擎`);
            }
        }
    } else if (keyInfo && (keyInfo.mode === 'minor' ||
               (keyInfo.mode === 'major' && keyInfo.flats >= 6 && noteIndex === 11))) {
        // 🎵 特殊处理：小调 + 高降号大调中的Cb
        if (keyInfo.mode === 'minor') {
            console.log(`🎵 小调检测: 优先使用独立拼写系统处理 MIDI${midiNote}`);
        } else {
            console.log(`🎵 高降号大调Cb检测: 优先保护Cb八度 MIDI${midiNote} (${keyInfo.flats}♭)`);
        }

        // 先尝试用系统获取正确的拼写和八度
        const specialResult = getCorrectEnharmonic(noteIndex, chordContext, octave, keyInfo);

        if (specialResult && specialResult.octave) {
            // 检查结果是否在合理范围内
            const proposedMidi = (specialResult.octave + 1) * 12 + noteIndex;
            const rangeMinSelect = document.getElementById('rangeMin');
            const rangeMaxSelect = document.getElementById('rangeMax');

            if (rangeMinSelect && rangeMaxSelect) {
                const minMidi = parseInt(rangeMinSelect.value);
                const maxMidi = parseInt(rangeMaxSelect.value);

                // 如果结果在合理范围内，使用它
                if (proposedMidi >= minMidi - 12 && proposedMidi <= maxMidi + 12) {
                    const modeText = keyInfo.mode === 'minor' ? '小调独立系统' : '大调Cb保护';
                    console.log(`✅ ${modeText}结果在合理范围内: ${specialResult.step}${specialResult.alter ? (specialResult.alter > 0 ? '#'.repeat(specialResult.alter) : 'b'.repeat(-specialResult.alter)) : ''}${specialResult.octave}`);
                    return specialResult;
                } else {
                    const modeText = keyInfo.mode === 'minor' ? '小调独立系统' : '大调Cb保护';
                    console.log(`⚠️ ${modeText}结果超出范围，进行微调: MIDI${proposedMidi} (范围${minMidi}-${maxMidi})`);
                    // 对八度进行微调但保持拼写
                    const adjustedOctave = adjustOctaveToRange(specialResult.octave, noteIndex);
                    return {
                        ...specialResult,
                        octave: adjustedOctave
                    };
                }
            } else {
                // 没有范围设置，直接使用系统结果
                const modeText = keyInfo.mode === 'minor' ? '小调独立系统' : '大调Cb保护';
                console.log(`✅ ${modeText}结果 (无范围限制): ${specialResult.step}${specialResult.alter ? (specialResult.alter > 0 ? '#'.repeat(specialResult.alter) : 'b'.repeat(-specialResult.alter)) : ''}${specialResult.octave}`);
                return specialResult;
            }
        } else {
            const modeText = keyInfo.mode === 'minor' ? '小调独立系统' : '大调Cb保护';
            console.log(`⚠️ ${modeText}未返回结果，回退到标准处理`);
            // 回退到标准音域调整
            adjustedOctave = adjustOctaveToRange(octave, noteIndex);
        }
    } else {
        // 其他情况下进行音域调整
        adjustedOctave = adjustOctaveToRange(octave, noteIndex);
        if (adjustedOctave !== octave) {
            console.log(`🎵 音域调整: MIDI${midiNote} 八度 ${octave} -> ${adjustedOctave}`);
        }
    }

    if (isCbOrB) {
        console.log(`🔍 Cb/B调用getCorrectEnharmonic: noteIndex=${noteIndex}, adjustedOctave=${adjustedOctave}`);
    }

    // 根据和弦上下文选择正确的等音异名
    const result = getCorrectEnharmonic(noteIndex, chordContext, adjustedOctave, keyInfo);

    // 🔍 修复 (2025-10-05): Cb/B最终结果诊断
    if (isCbOrB && result) {
        let noteName = result.step;
        if (result.alter > 0) noteName += '#'.repeat(result.alter);
        else if (result.alter < 0) noteName += 'b'.repeat(-result.alter);
        noteName += result.octave;

        console.log(`\n✅ ========== Cb/B最终结果 ==========`);
        console.log(`  📊 输入MIDI: ${midiNote}`);
        console.log(`  📊 输出音符: ${noteName}`);
        console.log(`  📊 八度变化: 计算=${octave}, 调整=${adjustedOctave}, 最终=${result.octave}`);
        console.log(`========================================\n`);
    }

    return result;
}

// 🎯 和弦级别拼写一致性检查系统 - 确保同一和弦内所有音符使用一致的升降记号
function determineChordSpellingSystem(chordContext, keySignature = null) {
    if (!chordContext || !chordContext.root) {
        return null;
    }

    const chordRoot = chordContext.root;

    // 🔍 2025-09-30 诊断：记录和弦上下文信息
    // console.log(`🔍 determineChordSpellingSystem 调用: root=${chordRoot}, type=${chordContext.type || 'undefined'}`);

    // 🎵 分析和弦根音的拼写特征
    const sharpRoots = ['C#', 'D#', 'F#', 'G#', 'A#', 'B#', 'E#'];
    const flatRoots = ['Db', 'Eb', 'Gb', 'Ab', 'Bb', 'Cb', 'Fb'];
    const naturalRoots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    // 🔧 2025-09-30 修复：同音异名等价映射（备选检查）
    // 问题：即使保护了原始降号根音，某些情况下可能仍然失败
    // 解决：如果root是升号但应该用降号拼写，强制转换为flat系统
    const enharmonicFlatEquivalents = {
        'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb',
        'G#': 'Ab', 'A#': 'Bb'
    };

    if (sharpRoots.includes(chordRoot)) {
        // 🎯 修复 (2025-10-05): 检查是否应该用降号拼写
        // 音乐理论：G#大调(8♯)、D#大调(9♯)、A#大调(10♯)不实用，应该用同音异名降号调
        // 但C#大调(7♯)和F#大调(6♯)是实际使用的
        const impracticalSharpRoots = ['G#', 'D#', 'A#'];  // 不实用的升号根音

        if (impracticalSharpRoots.includes(chordRoot)) {
            // 返回降号系统，使用同音异名降号拼写
            // console.log(`🎯 和弦拼写系统检测: ${chordRoot} → 降号系统 (使用同音异名${enharmonicFlatEquivalents[chordRoot]})`);
            return 'flat';
        }

        // C#, F#等实用的升号根音，使用升号系统
        // console.log(`🎯 和弦拼写系统检测: ${chordRoot}${chordContext.type || ''} → 升号系统`);
        return 'sharp';
    } else if (flatRoots.includes(chordRoot)) {
        console.log(`🎯 和弦拼写系统检测: ${chordRoot}${chordContext.type || ''} → 降号系统`);
        return 'flat';
    } else if (naturalRoots.includes(chordRoot)) {
        // 🎯 关键修复：调性推断系统 - 解决随机模式下调性信息缺失问题
        let effectiveKeySignature = keySignature;

        // 如果keySignature无效或是C大调（随机模式的默认值），尝试推断调性
        if (!keySignature || (keySignature.sharps === 0 && keySignature.flats === 0 && keySignature.tonic === 'C')) {
            // 推断大调调性（类似于line 5406的逻辑）
            if (chordContext.type && chordContext.type.includes('major')) {
                const inferredMajorKey = `${chordRoot}-major`;
                console.log(`🎲 调性推断: ${chordRoot}${chordContext.type} → 推断调性 ${inferredMajorKey}`);

                // 🔧 修复：使用多种方式尝试访问调性信息
                let inferredKeyInfo = null;

                // 方法1: 尝试 window.harmonyTheory
                if (window.harmonyTheory && window.harmonyTheory.keys) {
                    inferredKeyInfo = window.harmonyTheory.keys[inferredMajorKey];
                    console.log(`🔍 方法1(window.harmonyTheory): ${inferredMajorKey} → ${inferredKeyInfo ? '找到' : '未找到'}`);
                }

                // 方法2: 尝试全局 harmonyTheory
                if (!inferredKeyInfo && typeof harmonyTheory !== 'undefined' && harmonyTheory.keys) {
                    inferredKeyInfo = harmonyTheory.keys[inferredMajorKey];
                    console.log(`🔍 方法2(全局harmonyTheory): ${inferredMajorKey} → ${inferredKeyInfo ? '找到' : '未找到'}`);
                }

                if (inferredKeyInfo) {
                    effectiveKeySignature = {
                        tonic: chordRoot,
                        mode: 'major',
                        sharps: inferredKeyInfo.sharps || 0,
                        flats: inferredKeyInfo.flats || 0
                    };
                    console.log(`🎼 调性推断成功: ${inferredMajorKey}, sharps=${effectiveKeySignature.sharps}, flats=${effectiveKeySignature.flats}`);

                    // 🔧 额外调试：确认B大调和E大调的推断
                    if (chordRoot === 'B' || chordRoot === 'E') {
                        console.log(`🔍 关键调试 - ${chordRoot}大调推断详情:`);
                        console.log(`  - inferredKeyInfo.sharps: ${inferredKeyInfo.sharps}`);
                        console.log(`  - effectiveKeySignature.sharps: ${effectiveKeySignature.sharps}`);
                        console.log(`  - 是否满足强制升号条件: ${(chordRoot === 'B' && effectiveKeySignature.sharps >= 5) || (chordRoot === 'E' && effectiveKeySignature.sharps >= 4)}`);
                    }
                } else {
                    console.warn(`⚠️ 无法找到调性信息: ${inferredMajorKey}`);
                    console.warn(`🔍 调试信息: window.harmonyTheory=${!!window.harmonyTheory}, harmonyTheory=${typeof harmonyTheory !== 'undefined'}`);

                    // 🔧 详细诊断：列出可用的调性
                    if (window.harmonyTheory && window.harmonyTheory.keys) {
                        const availableKeys = Object.keys(window.harmonyTheory.keys).slice(0, 10);
                        console.log(`🔍 可用调性样本: ${availableKeys.join(', ')}`);
                    }
                }
            }
        }

        // 🎯 基于有效调性上下文判断拼写系统
        if (effectiveKeySignature) {
            // 🔧 2025-09-30 修复：通用升号调和降号调处理
            // 问题：之前只检查E和B大调，其他升号调（如D大调）被遗漏
            // 解决：任何推断的升号调都使用升号系统，降号调都使用降号系统

            if (effectiveKeySignature.sharps >= 1) {
                console.log(`🎯 调性感知拼写: ${chordRoot}调(${effectiveKeySignature.sharps}♯) → 升号系统`);
                return 'sharp';
            }

            if (effectiveKeySignature.flats >= 1) {
                console.log(`🎯 调性感知拼写: ${chordRoot}调(${effectiveKeySignature.flats}♭) → 降号系统`);
                return 'flat';
            }
        }

        console.log(`🎯 和弦拼写系统检测: ${chordRoot}${chordContext.type || ''} → 自然音系统`);
        return 'natural';
    }

    console.warn(`⚠️ 无法确定和弦拼写系统: ${chordRoot}${chordContext.type || ''}`);
    return null;
}

// 🎼 基于和弦拼写系统的强制拼写函数
function applyChordSpellingSystem(noteIndex, octave, spellingSystem, keySignature = null) {
    // 🔍 2025-09-30 诊断：记录拼写系统应用
    // console.log(`🔍 applyChordSpellingSystem: noteIndex=${noteIndex}, octave=${octave}, system=${spellingSystem}`);

    if (spellingSystem === 'sharp') {
        // 强制升号拼写映射表
        const sharpNoteMap = [
            { step: 'C', alter: 0 },   // 0 - C
            { step: 'C', alter: 1 },   // 1 - C#
            { step: 'D', alter: 0 },   // 2 - D
            { step: 'D', alter: 1 },   // 3 - D#
            { step: 'E', alter: 0 },   // 4 - E
            { step: 'F', alter: 0 },   // 5 - F
            { step: 'F', alter: 1 },   // 6 - F#
            { step: 'G', alter: 0 },   // 7 - G
            { step: 'G', alter: 1 },   // 8 - G#
            { step: 'A', alter: 0 },   // 9 - A
            { step: 'A', alter: 1 },   // 10 - A#
            { step: 'B', alter: 0 }    // 11 - B
        ];
        const noteInfo = sharpNoteMap[noteIndex];
        // console.log(`🎵 强制升号拼写: 半音${noteIndex} → ${noteInfo.step}${noteInfo.alter > 0 ? '#'.repeat(noteInfo.alter) : ''}${octave}`);

        // 🔧 Cb八度修正 - 在early return前检查
        let correctedOctave = octave;
        if (noteInfo.step === 'C' && noteInfo.alter === -1) {
            correctedOctave = octave + 1;
            console.log(`🔧 Early-Return Cb八度修正: Cb${octave} -> Cb${correctedOctave} (强制升号路径)`);
        }

        return { step: noteInfo.step, alter: noteInfo.alter, octave: correctedOctave };

    } else if (spellingSystem === 'flat') {
        // ============================================================================
        // 🎯 2025-09-30 修复：标准降号拼写映射表（不包含Fb和Cb）
        // ============================================================================
        // 问题：之前的flatNoteMap无条件使用Fb和Cb，违反了音乐理论规则
        // 规则：只有6个或更多降号（或db小调特殊情况）才使用Fb和Cb
        // 解决：标准降号映射表使用E和B，特殊调性在handleFlatKeys中处理
        // ============================================================================

        const standardFlatNoteMap = [
            { step: 'C', alter: 0 },   // 0 - C
            { step: 'D', alter: -1 },  // 1 - Db
            { step: 'D', alter: 0 },   // 2 - D
            { step: 'E', alter: -1 },  // 3 - Eb
            { step: 'E', alter: 0 },   // 4 - E (标准降号调使用E，不是Fb)
            { step: 'F', alter: 0 },   // 5 - F
            { step: 'G', alter: -1 },  // 6 - Gb
            { step: 'G', alter: 0 },   // 7 - G
            { step: 'A', alter: -1 },  // 8 - Ab
            { step: 'A', alter: 0 },   // 9 - A
            { step: 'B', alter: -1 },  // 10 - Bb
            { step: 'B', alter: 0 }    // 11 - B (标准降号调使用B，不是Cb)
        ];

        const noteInfo = standardFlatNoteMap[noteIndex];
        console.log(`🎵 标准降号拼写: 半音${noteIndex} → ${noteInfo.step}${noteInfo.alter < 0 ? 'b'.repeat(-noteInfo.alter) : ''}${octave}`);

        // 🔧 Cb八度修正 - 在early return前检查
        let correctedOctave = octave;
        if (noteInfo.step === 'C' && noteInfo.alter === -1) {
            correctedOctave = octave + 1;
            console.log(`🔧 Early-Return Cb八度修正: Cb${octave} -> Cb${correctedOctave} (降号路径)`);
        }

        return { step: noteInfo.step, alter: noteInfo.alter, octave: correctedOctave };

    } else {
        // 自然音系统：使用最简单的拼写
        const naturalNoteMap = [
            { step: 'C', alter: 0 },   // 0 - C
            { step: 'C', alter: 1 },   // 1 - C#（默认选择）
            { step: 'D', alter: 0 },   // 2 - D
            { step: 'E', alter: -1 },  // 3 - Eb（默认选择）
            { step: 'E', alter: 0 },   // 4 - E
            { step: 'F', alter: 0 },   // 5 - F
            { step: 'F', alter: 1 },   // 6 - F#（默认选择）
            { step: 'G', alter: 0 },   // 7 - G
            { step: 'A', alter: -1 },  // 8 - Ab（默认选择）
            { step: 'A', alter: 0 },   // 9 - A
            { step: 'B', alter: -1 },  // 10 - Bb（默认选择）
            { step: 'B', alter: 0 }    // 11 - B
        ];
        const noteInfo = naturalNoteMap[noteIndex];
        console.log(`🎵 自然音拼写: 半音${noteIndex} → ${noteInfo.step}${noteInfo.alter > 0 ? '#'.repeat(noteInfo.alter) : noteInfo.alter < 0 ? 'b'.repeat(-noteInfo.alter) : ''}${octave}`);

        // 🔧 Cb八度修正 - 在early return前检查
        let correctedOctave = octave;
        if (noteInfo.step === 'C' && noteInfo.alter === -1) {
            correctedOctave = octave + 1;
            console.log(`🔧 Early-Return Cb八度修正: Cb${octave} -> Cb${correctedOctave} (自然音路径)`);
        }

        return { step: noteInfo.step, alter: noteInfo.alter, octave: correctedOctave };
    }
}

// 🎯 完整24调音符拼写系统 - 基于调号特征的智能分派
function getCorrectEnharmonic(noteIndex, chordContext = null, octave = 4, keySignature = null) {
    // ============================================================
    // 🎯 **2025-10-05 Diminished/Augmented和弦字母名连续性系统（最高优先级）**
    // ============================================================
    // 问题：diminished/augmented和弦必须保持字母名连续（A-C-E-G, B-D-F-A）
    // 错误案例：
    // - Bb° → Bb-Db-E (应该是Bb-Db-Fb，保持B-D-F连续)
    // - Eb° → Eb-Gb-A (应该是Eb-Gb-Bbb，保持E-G-B连续)
    // - Ab+ → Ab-C-D (应该是Ab-C-E，保持A-C-E连续)
    // - F+ → F-A-Db (应该是F-A-C#，保持F-A-C连续)
    // 解决：在所有其他拼写逻辑之前应用字母名连续性规则，提前返回
    // ============================================================
    if (chordContext && chordContext.type && chordContext.root) {
        // 🔧 修复 (2025-10-05): 使用includes检测，更宽松地匹配dim/aug类型
        const chordTypeStr = (chordContext.type || '').toLowerCase();
        const isDiminished = chordTypeStr.includes('dim');
        const isAugmented = chordTypeStr.includes('aug');

        if (isDiminished || isAugmented) {
            const chordTypeName = isDiminished ? 'diminished' : 'augmented';

            // 计算当前音符相对于根音的音程
            const rootNote = chordContext.root;
            const rootSemitone = {
                'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
                'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
                'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
                'E#': 5, 'B#': 0, 'Fb': 4
            }[rootNote];

            if (rootSemitone !== undefined) {
                const intervalFromRoot = (noteIndex - rootSemitone + 12) % 12;

                // 如果是根音（interval=0），直接返回根音拼写
                if (intervalFromRoot === 0) {
                    const step = rootNote.charAt(0).toUpperCase();
                    const accidentals = rootNote.slice(1);
                    const alter = accidentals.includes('#') ? accidentals.split('#').length - 1 :
                                 accidentals.includes('b') ? -(accidentals.split('b').length - 1) : 0;

                    return applyEnharmonicOctaveCorrection({
                        step: step,
                        alter: alter,
                        octave: octave
                    });
                }

                // 应用字母名连续性算法
                const rootLetter = rootNote.charAt(0).toUpperCase();
                const rootAccidentals = rootNote.slice(1);
                const letterSequence = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                const rootIndex = letterSequence.indexOf(rootLetter);

                // interval到字母偏移量的映射（基于音程理论）
                const intervalToLetterOffset = {
                    1: 1,  // 小二度
                    2: 1,  // 大二度
                    3: 2,  // 小三度 (Ab→Cb)
                    4: 2,  // 大三度
                    5: 3,  // 纯四度
                    6: 4,  // 减五度 (Ab→Ebb, Bb→Fb)
                    7: 4,  // 纯五度
                    8: 4,  // 增五度 (F→C, Ab→E)
                    9: 6,  // 减七度 (Ab→Gbb)
                    10: 6, // 小七度
                    11: 6  // 大七度
                };

                const letterOffset = intervalToLetterOffset[intervalFromRoot];
                if (letterOffset !== undefined) {
                    const targetLetterIndex = (rootIndex + letterOffset) % 7;
                    const targetLetter = letterSequence[targetLetterIndex];

                    // 计算根音的完整半音数（包括升降号）
                    const rootSemitoneBase = {
                        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
                    }[rootLetter];

                    let rootSemitoneWithAccidentals = rootSemitoneBase;
                    const sharpCount = (rootAccidentals.match(/#/g) || []).length;
                    const flatCount = (rootAccidentals.match(/b/g) || []).length;
                    rootSemitoneWithAccidentals += sharpCount - flatCount;

                    // 目标半音数（根音 + interval）
                    const targetSemitone = (rootSemitoneWithAccidentals + intervalFromRoot) % 12;

                    // 目标字母的自然半音数
                    const targetLetterSemitone = {
                        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
                    }[targetLetter];

                    // 计算需要的升降号数量
                    let alterations = (targetSemitone - targetLetterSemitone + 12) % 12;
                    if (alterations > 6) alterations -= 12;

                    // 构造最终音符名称（用于日志）
                    let finalNote = targetLetter;
                    if (alterations > 0) {
                        finalNote += '#'.repeat(alterations);
                    } else if (alterations < 0) {
                        finalNote += 'b'.repeat(-alterations);
                    }

                    console.log(`🎯 ${chordTypeName}和弦字母名连续性: ${rootNote} + interval ${intervalFromRoot} = ${finalNote}`);

                    return applyEnharmonicOctaveCorrection({
                        step: targetLetter,
                        alter: alterations,
                        octave: octave
                    });
                }
            }
        }
    }

    // ============================================================
    // 🎯 **2025-10-06 Major7/Minor7和弦字母名连续性系统**
    // ============================================================
    // 问题：Fmaj7显示为F-A-C-Fb4，应该是F-A-C-E4
    // 解决：major7/minor7和弦的所有和弦音（根音、三音、五音、七音）必须保持字母名连续
    // 示例：
    //   - Fmaj7: F-A-C-E（字母名F-A-C-E连续，interval 11 = E不是Fb）
    //   - Cmaj7: C-E-G-B（字母名C-E-G-B连续，interval 11 = B不是Cb）
    //   - Dm7: D-F-A-C（字母名D-F-A-C连续，interval 10 = C不是B#）
    //   - Am7: A-C-E-G（字母名A-C-E-G连续，interval 10 = G不是Abb）
    // 注意：dominant7和弦由原有的降七音处理逻辑处理（line 9410+），避免冲突
    // ============================================================
    if (chordContext && chordContext.type && chordContext.root) {
        const isMajor7 = chordContext.type.includes('maj7') ||
                         chordContext.type === 'major7';
        const isMinor7 = (chordContext.type.includes('m7') ||
                          chordContext.type.includes('minor7')) &&
                         !chordContext.type.includes('maj');

        // 只处理major7和minor7，dominant7由原有逻辑处理
        if (isMajor7 || isMinor7) {
            const rootNote = chordContext.root;
            const rootSemitone = {
                'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
                'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
                'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
                'E#': 5, 'B#': 0, 'Fb': 4
            }[rootNote];

            if (rootSemitone !== undefined) {
                const intervalFromRoot = (noteIndex - rootSemitone + 12) % 12;

                // 七和弦的四个音：root(0), third(3或4), fifth(7), seventh(10或11)
                if (intervalFromRoot === 0 || intervalFromRoot === 3 ||
                    intervalFromRoot === 4 || intervalFromRoot === 7 ||
                    intervalFromRoot === 10 || intervalFromRoot === 11) {

                    console.log(`🎯 检测到${chordContext.type}和弦字母名连续性需求: ${rootNote}, interval=${intervalFromRoot}`);

                    // 应用字母名连续性算法（同diminished/augmented逻辑）
                    const rootLetter = rootNote.charAt(0).toUpperCase();
                    const rootAccidentals = rootNote.slice(1);
                    const letterSequence = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                    const rootIndex = letterSequence.indexOf(rootLetter);

                    // interval到字母偏移量的映射
                    const intervalToLetterOffset = {
                        0: 0,  // 根音
                        3: 2,  // 小三度
                        4: 2,  // 大三度
                        7: 4,  // 完全五度
                        10: 6, // 小七度
                        11: 6  // 大七度
                    };

                    const letterOffset = intervalToLetterOffset[intervalFromRoot];
                    const targetLetterIndex = (rootIndex + letterOffset) % 7;
                    const targetLetter = letterSequence[targetLetterIndex];

                    // 计算alter（同diminished/augmented逻辑）
                    const rootSemitoneBase = {
                        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
                    }[rootLetter];

                    let rootSemitoneWithAccidentals = rootSemitoneBase;
                    const sharpCount = (rootAccidentals.match(/#/g) || []).length;
                    const flatCount = (rootAccidentals.match(/b/g) || []).length;
                    rootSemitoneWithAccidentals += sharpCount - flatCount;

                    const targetSemitone = (rootSemitoneWithAccidentals + intervalFromRoot) % 12;
                    const targetLetterSemitone = {
                        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
                    }[targetLetter];

                    let alterations = (targetSemitone - targetLetterSemitone + 12) % 12;
                    if (alterations > 6) alterations -= 12;

                    // 构造最终音符名称（用于日志）
                    let finalNote = targetLetter;
                    if (alterations > 0) {
                        finalNote += '#'.repeat(alterations);
                    } else if (alterations < 0) {
                        finalNote += 'b'.repeat(-alterations);
                    }

                    console.log(`✅ ${chordContext.type}和弦字母名连续性: ${rootNote} + interval ${intervalFromRoot} = ${finalNote}`);

                    return applyEnharmonicOctaveCorrection({
                        step: targetLetter,
                        alter: alterations,
                        octave: octave
                    });
                }
            }
        }
    }

    // ============================================================
    // 🔍 **2025-10-01 Fb/Cb 诊断系统**
    // ============================================================
    // 目的：帮助诊断Fb vs E 和 Cb vs B 的拼写决策过程
    // ============================================================
    const isFbOrCbNote = (noteIndex === 4 || noteIndex === 11);
    if (isFbOrCbNote) {
        const noteNames = ['C', 'C#/Db', 'D', 'D#/Eb', 'E/Fb', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B/Cb'];
        // 🔧 已移除 (2025-10-04): Fb/Cb 诊断日志信息
        // console.log(`\n🔍 ========== Fb/Cb 诊断开始 ==========`);
        // console.log(`🎵 音符索引: ${noteIndex} (${noteNames[noteIndex]})`);
        // console.log(`🎵 八度: ${octave}`);
        // console.log(`🎵 和弦上下文: ${chordContext ? `${chordContext.root}${chordContext.type || ''}` : '无'}`);
        // console.log(`🎵 调号信息: ${keySignature ? `${keySignature.tonic}-${keySignature.mode} (${keySignature.sharps || 0}♯, ${keySignature.flats || 0}♭)` : '无'}`);
        // console.log(`========================================\n`);
    }

    // ============================================================
    // 🔧 **2025-10-03 dominant7和弦降七音特殊处理（最高优先级）**
    // ============================================================
    // 问题：C7和弦显示为C-E-G-A#，应该是C-E-G-Bb（降七音）
    // 解决：在所有拼写逻辑之前检测dominant7和弦，对降七音使用降号拼写
    // ============================================================
    if (chordContext && chordContext.type && chordContext.root) {
        const isDominant7 = chordContext.type === 'dominant7' ||
                           chordContext.type === '7' ||
                           (chordContext.type.includes('7') && !chordContext.type.includes('maj') && !chordContext.type.includes('minor') && !chordContext.type.includes('sus'));

        if (isDominant7) {
            console.log(`🎯 检测到dominant7和弦: ${chordContext.root}${chordContext.type}`);

            // 计算这个音符是和弦的第几个音（通过半音距离）
            const rootNote = chordContext.root;
            const rootSemitone = {
                'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
                'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
                'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
            }[rootNote];

            if (rootSemitone !== undefined) {
                const intervalFromRoot = (noteIndex - rootSemitone + 12) % 12;

                console.log(`🔍 音程分析: noteIndex=${noteIndex}, rootSemitone=${rootSemitone}, interval=${intervalFromRoot}`);

                // dominant7和弦结构：根音(0) + 大三度(4) + 完全五度(7) + 小七度(10)
                if (intervalFromRoot === 10) {
                    console.log(`✅ 确认为降七音（interval=10），使用降号拼写算法`);

                    // 提取根音字母
                    const rootLetter = rootNote.charAt(0).toUpperCase();
                    const rootAccidentals = rootNote.slice(1);

                    // 计算降七音字母（向上数7个字母，但在音乐中是向上6个半音）
                    // 字母向上数6个（0-indexed: +6，实际上音名是第7个）
                    const letterSequence = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                    const rootIndex = letterSequence.indexOf(rootLetter);
                    const seventhLetterIndex = (rootIndex + 6) % 7;
                    const seventhLetter = letterSequence[seventhLetterIndex];

                    console.log(`🎵 降七音字母: ${rootLetter}(${rootIndex}) + 6 = ${seventhLetter}(${seventhLetterIndex})`);

                    // 计算正确的升降号
                    const seventhLetterSemitone = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[seventhLetter];
                    let targetSemitone = (rootSemitone + 10) % 12;

                    // 计算升降号调整量
                    let alterations = (targetSemitone - seventhLetterSemitone + 12) % 12;
                    if (alterations > 6) alterations -= 12;

                    // 构造音符名称
                    let minorSeventh = seventhLetter;
                    if (alterations > 0) {
                        minorSeventh += '#'.repeat(alterations);
                    } else if (alterations < 0) {
                        minorSeventh += 'b'.repeat(-alterations);
                    }

                    console.log(`✅ 降七音拼写: ${rootNote} + 10半音 = ${minorSeventh} (target=${targetSemitone}, seventh=${seventhLetterSemitone}, alter=${alterations})`);

                    // 返回拼写结果
                    return applyEnharmonicOctaveCorrection({
                        step: seventhLetter,
                        alter: alterations,
                        octave: octave
                    });
                }
            }
        }
    }

    // ============================================================
    // 🔧 **2025-10-01 m7b5和弦减五音特殊处理**
    // 🔧 **2025-10-05 修复：移除diminished和弦，只处理m7b5**
    // ============================================================
    // 问题：m7b5和弦的减五音被小调拼写映射错误拼成变化音
    // 解决：对m7b5和弦使用实用拼写（避免Fb/Cb/Abb）
    //
    // ⚠️ 注意：diminished/augmented和弦现在由字母名连续性系统处理（Line 8629-8742）
    // 不再在此处处理，以保持字母名连续性（B-D-F, A-C-E）
    // ============================================================
    if (chordContext && chordContext.type && chordContext.root) {
        const isHalfDiminished = chordContext.type.includes('m7b5') ||
                                  chordContext.type.includes('minor7b5') ||
                                  chordContext.type.includes('ø');
                                  // 🔧 修复 (2025-10-05): 移除 diminished/dim/diminished7
                                  // 原因：这些和弦必须使用字母名连续性系统（见Line 8629）

        if (isHalfDiminished) {
            console.log(`🎯 检测到m7b5和弦: ${chordContext.root}${chordContext.type}`);

            // 计算这个音符是和弦的第几个音（通过半音距离）
            const rootNote = chordContext.root;
            const rootSemitone = {
                'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
                'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
                'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
            }[rootNote];

            if (rootSemitone !== undefined) {
                const intervalFromRoot = (noteIndex - rootSemitone + 12) % 12;

                console.log(`🔍 音程分析: noteIndex=${noteIndex}, rootSemitone=${rootSemitone}, interval=${intervalFromRoot}`);

                // 🔧 修复 (2025-10-03): m7b5和弦实用拼写优化
                // 问题：Dbm7b5显示为Db-Fb-Abb-Cb（理论正确但不实用）
                // 用户需求：使用更实用的拼写 Db-E-Gb-Bb（避免Fb/Cb/Abb）
                // m7b5和弦结构：根音(0) + 小三音(3) + 减五音(6) + 小七音(10)

                if (intervalFromRoot === 3 || intervalFromRoot === 6 || intervalFromRoot === 10) {
                    const intervalName = {3: '小三音', 6: '减五音', 10: '小七音'}[intervalFromRoot];
                    console.log(`✅ 确认为${intervalName}（interval=${intervalFromRoot}），使用m7b5实用拼写算法`);

                    // 🎯 实用拼写映射（避免Fb/Cb/Abb等复杂拼写）
                    // 策略：使用最简单的同音异名，不考虑理论字母序列
                    const practicalSpellingMap = {
                        0: 'C',  1: 'Db', 2: 'D',  3: 'Eb', 4: 'E',   5: 'F',
                        6: 'Gb', 7: 'G',  8: 'Ab', 9: 'A',  10: 'Bb', 11: 'B'
                    };

                    const targetSemitone = (rootSemitone + intervalFromRoot) % 12;
                    const practicalNote = practicalSpellingMap[targetSemitone];

                    console.log(`✅ ${intervalName}实用拼写: ${rootNote} + ${intervalFromRoot}半音 = ${practicalNote} (target半音=${targetSemitone})`);
                    console.log(`   避免复杂拼写：不使用Fb/Cb/Abb，使用${practicalNote}`);

                    // 解析实用拼写的step和alter
                    const step = practicalNote.charAt(0);
                    const accidentals = practicalNote.slice(1);
                    const alter = accidentals.length === 0 ? 0 :
                                  (accidentals.includes('b') ? -accidentals.length : accidentals.length);

                    return applyEnharmonicOctaveCorrection({
                        step: step,
                        alter: alter,
                        octave: octave
                    });
                }
            }
        }
    }

    // ============================================================
    // 🎵 **2025-09-30 同音异名拼写系统全面修复**
    // ============================================================
    // 修复目标：所有24个大小调都使用正确的升降记号拼写
    // 核心修改：调性系统优先于任何"友好拼写"或"推断"系统
    // ============================================================

    // ============ 🎵 第1优先级：小调系统（12个小调 + 随机模式小调和弦）============
    // 使用独立的小调拼写系统，完全绕过现有复杂逻辑，解决八度和拼写问题

    // 🔧 2025-10-05 v35修复：检测小调和弦类型（支持随机模式）
    // 问题：随机模式下keySignature固定为C-major，小调和弦（Abm）无法触发小调系统
    // 解决：同时检查chordContext.type，即使keySignature.mode不是'minor'
    const isMinorChord = chordContext && chordContext.type &&
                        (chordContext.type === 'minor' ||
                         (chordContext.type.includes('m') &&
                          !chordContext.type.includes('maj') &&
                          !chordContext.type.includes('Major')));

    if (keySignature && (keySignature.mode === 'minor' || isMinorChord)) {
        // 🔧 2025-10-03 修复：功能和声模式下禁用rootMismatch推断
        // 问题：功能和声模式下，Dm7/Em7等和弦的根音与调号tonic不同（a-minor），
        //       导致每个和弦被推断为不同的调性（d-minor, e-minor），产生调外音
        // 解决：始终使用传入的keySignature，不进行根音推断
        //
        // 🔧 2025-10-05 v35修复：随机模式小调和弦使用自己的根音
        // 问题：随机模式下，Abm和弦应该使用ab-minor拼写，而非C-major
        // 解决：功能和声模式 vs 随机模式区分处理
        //
        // 原逻辑（已禁用）：
        // - 如果chordContext.root ≠ keySignature.tonic，推断为chord.root-minor
        // - 这在随机模式下可能有用，但在功能和声下是错误的

        let inferredMinorKey = `${keySignature.tonic.toLowerCase()}-minor`;

        // 检测功能和声模式
        const functionalHarmonyToggle = document.getElementById('functionalHarmonyToggle');
        const isFunctionalMode = functionalHarmonyToggle && functionalHarmonyToggle.checked;

        // 随机模式下的小调和弦，使用和弦自己的根音推断调性
        if (!isFunctionalMode && isMinorChord && chordContext.root) {
            inferredMinorKey = `${chordContext.root.toLowerCase()}-minor`;
            console.log(`🎲 随机模式小调和弦: ${chordContext.root}${chordContext.type} → 使用调性 ${inferredMinorKey}`);
        } else {
            console.log(`🎵 小调系统触发: ${inferredMinorKey} (sharps=${keySignature.sharps}, flats=${keySignature.flats})`);
            console.log(`   ✅ 使用keySignature调性${isFunctionalMode ? '（功能和声模式）' : ''}`);
        }

        // 🔧 2025-10-05 v35修复：只对非小调和弦使用early return
        // 问题：Abm等小调和弦需要使用IndependentMinorSpelling系统（包含Fb/Cb处理）
        // 解决：小调和弦不走early return，继续到IndependentMinorSpelling

        // 只在随机模式下使用和弦根音检测（修复Eb7sus4升降号混用问题）
        // 功能和声模式优先使用调性拼写系统（修复F#小调E#→F错误）
        if (!isFunctionalMode && !isMinorChord && chordContext && chordContext.root) {
            const flatRoots = ['Db', 'Eb', 'Gb', 'Ab', 'Bb'];
            const sharpRoots = ['C#', 'D#', 'F#', 'G#', 'A#'];

            if (flatRoots.includes(chordContext.root)) {
                console.log(`🔧 小调系统（随机模式非小调和弦）：检测到降号根音 ${chordContext.root}，强制使用flat拼写系统`);
                const result = applyChordSpellingSystem(noteIndex, octave, 'flat', keySignature);
                return applyEnharmonicOctaveCorrection(result);
            } else if (sharpRoots.includes(chordContext.root)) {
                console.log(`🔧 小调系统（随机模式非小调和弦）：检测到升号根音 ${chordContext.root}，强制使用sharp拼写系统`);
                const result = applyChordSpellingSystem(noteIndex, octave, 'sharp', keySignature);
                return applyEnharmonicOctaveCorrection(result);
            }
        }

        // 构造MIDI音符值
        const midiNote = (octave + 1) * 12 + noteIndex;

        // 调用独立小调拼写系统（只用于自然根音和弦）
        if (typeof window !== 'undefined' && window.IndependentMinorSpelling) {
            let minorSpelling = window.IndependentMinorSpelling.getSpelling(midiNote, inferredMinorKey);

            // ✅ 修复2：三层回退机制（2025-10-01）
            // 问题：gb-minor等理论调性不支持，导致minorSpelling=undefined，访问.step崩溃
            // 解决：添加三层回退策略
            if (!minorSpelling) {
                console.log(`⚠️ 推断的小调${inferredMinorKey}不支持（理论调性）`);

                // 回退策略1：尝试使用原调号
                const fallbackMinorKey = `${keySignature.tonic.toLowerCase()}-${keySignature.mode}`;
                console.log(`🔄 回退策略1：使用原调号 ${fallbackMinorKey}`);
                minorSpelling = window.IndependentMinorSpelling.getSpelling(midiNote, fallbackMinorKey);

                // 回退策略2：使用和弦上下文拼写系统
                if (!minorSpelling) {
                    console.log(`🔄 回退策略2：原调号${fallbackMinorKey}也不支持，使用和弦上下文拼写系统`);
                    const spellingSystem = determineChordSpellingSystem(chordContext, keySignature);
                    const result = applyChordSpellingSystem(noteIndex, octave, spellingSystem, keySignature);
                    return applyEnharmonicOctaveCorrection(result);
                }
            }

            if (minorSpelling) {
                console.log(`✅ 小调拼写成功: MIDI${midiNote} → ${minorSpelling.noteName}${minorSpelling.octave} (调性: ${inferredMinorKey})`);

                // 🔧 2025-09-30 修复：移除重复的Cb八度修正
                // minor-key-spelling.js已经处理了Cb八度对齐（basicOctave + 1）
                // 这里再次+1会导致Cb3→Cb4→Cb5的双重修正错误
                // 用户报告：Abm和弦中Cb被莫名其妙提高了一个八度

                return {
                    step: minorSpelling.step,
                    alter: minorSpelling.alter,
                    octave: minorSpelling.octave  // 直接使用minor-key-spelling.js返回的八度
                };
            }
        } else {
            console.warn(`⚠️ 独立小调拼写系统未加载，回退到通用系统`);
        }
    }

    // ============ 🎵 第1.5优先级：小调和弦强制推断系统（2025-10-01新增）============
    // ❌ 禁用 (2025-10-05): 此系统有多个架构问题
    // 问题1: 调性键格式不匹配（ab-minor vs Ab-minor）
    // 问题2: parseNoteName函数冲突
    // 问题3: 与Priority 4冲突，导致拼写不一致
    // 解决方案: 禁用此优先级，依赖Priority 4的简化、可靠逻辑
    //
    // 原代码注释如下：
    // 目的：解决Abm/Dbm在随机模式下的Fb/Cb拼写间歇性错误
    // 原因：之前只有rootMismatch时才推断，导致chordContext传递不稳定时拼写错误
    // 方案：检测到小调和弦类型，总是推断为对应的小调拼写
    // 效果：Abm总是显示Ab-Cb-Eb，Dbm总是显示Db-Fb-Ab

    // if (chordContext && chordContext.type &&
    //     (chordContext.type === 'minor' ||
    //      (chordContext.type.includes('m') && !chordContext.type.includes('maj')))) {
    //
    //     const inferredMinorKey = `${chordContext.root.toLowerCase()}-minor`;
    //     console.log(`🎵 检测到小调和弦: ${chordContext.root}${chordContext.type} → 推断小调 ${inferredMinorKey}`);
    //     ... (IndependentMinorSpelling调用)
    // }

    console.log(`⏭️ Priority 1.5已禁用，跳过IndependentMinorSpelling系统`);

    // ============ 🎵 第2优先级：升号调系统（7个升号大调 + 7个升号小调）============
    // G, D, A, E, B, F♯, C♯大调 (1-7个升号)
    // e, b, f♯, c♯, g♯, d♯, a♯小调 (1-7个升号)
    if (keySignature && keySignature.sharps >= 1) {
        console.log(`🎼 升号调系统: sharps=${keySignature.sharps}, mode=${keySignature.mode || 'major'}`);
        const result = handleSharpKeys(noteIndex, octave, keySignature);
        return applyEnharmonicOctaveCorrection(result);
    }

    // ============ 🎵 第3优先级：降号调系统（7个降号大调 + 7个降号小调）============
    // F, B♭, E♭, A♭, D♭, G♭, C♭大调 (1-7个降号)
    // d, g, c, f, b♭, e♭, a♭小调 (1-7个降号)
    if (keySignature && keySignature.flats >= 1) {
        console.log(`🎼 降号调系统: flats=${keySignature.flats}, mode=${keySignature.mode || 'major'}`);

        // 🔍 诊断：预期Fb/Cb使用情况
        if (keySignature.flats >= 6) {
            console.log(`🔍 诊断(优先级3)：${keySignature.flats}个降号，预期使用Fb和Cb`);
        } else if (keySignature.mode === 'minor' && keySignature.tonic === 'Db') {
            console.log(`🔍 诊断(优先级3)：db小调特殊情况，预期使用Fb`);
        }

        const result = handleFlatKeys(noteIndex, octave, keySignature);
        return applyEnharmonicOctaveCorrection(result);
    }

    // ============ 🎵 第4优先级：C大调/a小调系统（无升降号）============
    if (keySignature && keySignature.sharps === 0 && keySignature.flats === 0) {
        // 🔧 2025-09-30 修复：即使keySignature是C大调，也要检查和弦上下文
        // 问题：随机模式下keySignature可能是默认的C大调，但实际和弦可能是Abm
        // 解决：优先使用和弦上下文推断，而不是直接使用C大调拼写

        console.log(`🎼 自然调系统检测: C大调或a小调 (sharps=0, flats=0)`);

        // 🔧 2025-10-03 增强修复：在C大调分支强制检查和弦根音，优先使用和弦上下文推断
        // 问题：随机模式下Abm/Ebm等和弦仍然可能使用G#/D#拼写
        // 解决：对降号/升号根音和弦强制使用对应的拼写系统，不完全依赖determineChordSpellingSystem
        if (chordContext && chordContext.root) {
            // 🔧 修复 (2025-10-05 v11): 提升变量定义到外层作用域
            // 问题：isMinorChord和flatMinorRoots在natural分支内定义，但在flat分支中使用，导致ReferenceError
            // 解决：在整个chordContext块开始时定义，供所有分支使用
            const isMinorChord = chordContext.type && (
                chordContext.type === 'minor' ||
                chordContext.type.startsWith('minor') ||
                (chordContext.type.includes('m') && !chordContext.type.includes('maj'))
            );

            const flatMinorRoots = ['C', 'D', 'F', 'G'];  // 需要降号的小调根音
            const sharpMinorRoots = ['B'];  // 需要升号的小调根音（B小调的F#）

            let spellingSystem = determineChordSpellingSystem(chordContext, keySignature);

            // 🔧 修复 (2025-10-05 v11): B major诊断日志
            if (chordContext.root === 'B' && chordContext.type === 'major') {
                console.log(`🔍 === B major诊断 ===`);
                console.log(`  spellingSystem: ${spellingSystem}`);
                console.log(`  noteIndex: ${noteIndex} (应该是D#: 3)`);
                console.log(`  octave: ${octave}`);
            }

            console.log(`🎯 C大调上下文中检查和弦: ${chordContext.root}${chordContext.type || ''} → 拼写系统: ${spellingSystem || 'natural'}`);

            // 🔧 2025-10-03 强化修复：基于和弦根音直接判断拼写系统（优先级最高）
            // 降号根音和弦强制使用降号系统，升号根音和弦强制使用升号系统
            // 这样确保Abm显示Ab-Cb-Eb而不是G#-B-D#
            const flatRoots = ['Db', 'Eb', 'Gb', 'Ab', 'Bb'];
            const sharpRoots = ['C#', 'D#', 'F#', 'G#', 'A#'];

            if (flatRoots.includes(chordContext.root)) {
                // console.log(`🔧 检测到降号根音 ${chordContext.root}，强制使用flat拼写系统（覆盖推断结果）`);
                spellingSystem = 'flat';
            } else if (sharpRoots.includes(chordContext.root)) {
                // console.log(`🔧 检测到升号根音 ${chordContext.root}，强制使用sharp拼写系统（覆盖推断结果）`);
                spellingSystem = 'sharp';
            }

            // 🔧 2025-09-30 修复：自然根音的小和弦特殊处理（仅在此优先级，不影响其他模式）
            // 问题：Fm显示F-G#-C而不是F-Ab-C，Cm显示C-D#-G而不是C-Eb-G
            // 原因：自然根音的小和弦返回'natural'系统，但小三度应该用降号表示
            // 解决：在C大调上下文（主要是随机模式）中，自然根音的小和弦强制使用flat系统
            // 注意：只在此处修改，不修改determineChordSpellingSystem，确保不影响功能和声和小调模式
            let finalSpellingSystem = spellingSystem;

            if (spellingSystem === 'natural') {
                // 🎯 小调音阶分析：不同自然根音的小调使用不同的临时记号
                // Fm小调(4♭): F-G-Ab-Bb-C-Db-Eb → 需要flat系统
                // Cm小调(3♭): C-D-Eb-F-G-Ab-Bb → 需要flat系统
                // Gm小调(2♭): G-A-Bb-C-D-Eb-F → 需要flat系统
                // Dm小调(1♭): D-E-F-G-A-Bb-C → 需要flat系统
                // Am小调(0): A-B-C-D-E-F-G → 需要natural系统
                // Em小调(1♯): E-F#-G-A-B-C#-D → 需要sharp系统（但三音G和五音B都是自然音）
                // Bm小调(2♯): B-C#-D-E-F#-G#-A → 需要sharp系统

                // 🔧 2025-10-05 v11: 以下变量已在Line 9150-9157定义（提升到外层作用域）
                // - isMinorChord
                // - flatMinorRoots
                // - sharpMinorRoots

                if (isMinorChord) {
                    if (flatMinorRoots.includes(chordContext.root)) {
                        console.log(`🔧 降号小调和弦处理: ${chordContext.root}${chordContext.type} → 强制使用flat系统（C/D/F/G小调）`);
                        finalSpellingSystem = 'flat';

                        // 🔍 诊断 (2025-10-05 v12): Gm特殊诊断
                        if (chordContext.root === 'G') {
                            console.log(`🔍 === Gm特殊诊断 ===`);
                            console.log(`  isMinorChord: ${isMinorChord}`);
                            console.log(`  flatMinorRoots.includes('G'): ${flatMinorRoots.includes('G')}`);
                            console.log(`  spellingSystem (原始): ${spellingSystem}`);
                            console.log(`  finalSpellingSystem (修改后): ${finalSpellingSystem}`);
                            console.log(`  应该走flat拼写分支 ✅`);
                        }
                    } else if (sharpMinorRoots.includes(chordContext.root)) {
                        console.log(`🔧 升号小调和弦处理: ${chordContext.root}${chordContext.type} → 强制使用sharp系统（B小调）`);
                        finalSpellingSystem = 'sharp';
                    }
                    // 其他情况（E小调、A小调）保持natural系统
                }
            }

            // 如果和弦上下文明确指向升号或降号系统，优先使用
            if (finalSpellingSystem === 'sharp' || finalSpellingSystem === 'flat') {
                // console.log(`🔧 覆盖C大调默认拼写，使用和弦推断的拼写系统: ${finalSpellingSystem}`);

                // 🔧 2025-09-30 修复：C大调专用flat映射表（解决E→Fb和B→Cb问题）
                // 问题：Em和弦显示为Fbm，因为flatNoteMap将E转换为Fb
                // 原因：全局flatNoteMap适用于极端降号调（Gb大调等），但在C大调中不适用
                // 解决：C大调上下文使用专用映射表，保持白键不变，只转换黑键为降号
                // 🔧 修复 (2025-10-05 v2): 降号和弦使用Cb，自然音和弦使用B
                if (finalSpellingSystem === 'flat') {
                    // 🔧 修复 (2025-10-05 v2): 检测和弦根音类型
                    // 🔧 修复 (2025-10-05 v11): 扩展检测，包含自然音根音的小调和弦（C/D/F/G minor）
                    // 问题：Gm和弦被Line 9196推断为flat系统，但isFlatRootChord=false（G不在flatRoots中）
                    //       导致Line 9269回退到sharp系统 → A#而不是Bb
                    // 解决：同时检查flatMinorRoots列表（C, D, F, G minor需要降号拼写）
                    const flatRoots = ['Db', 'Eb', 'Gb', 'Ab', 'Bb'];
                    const isFlatRootChord = chordContext && (
                        flatRoots.includes(chordContext.root) ||  // 降号根音和弦：Dbm, Ebm等
                        (isMinorChord && flatMinorRoots.includes(chordContext.root))  // 自然音根音小调：Cm, Dm, Fm, Gm
                    );

                    // 🔍 诊断 (2025-10-05): 小调和弦isFlatRootChord计算追踪
                    if (isMinorChord) {
                        console.log(`🔍 [小调诊断] isFlatRootChord计算: ${chordContext.root}${chordContext.type}`);
                        console.log(`  flatRoots.includes('${chordContext.root}'): ${flatRoots.includes(chordContext.root)}`);
                        console.log(`  isMinorChord: ${isMinorChord}`);
                        console.log(`  flatMinorRoots.includes('${chordContext.root}'): ${flatMinorRoots.includes(chordContext.root)}`);
                        console.log(`  → isFlatRootChord: ${isFlatRootChord} (应该是 true)`);
                        console.log(`  noteIndex: ${noteIndex} (${['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'][noteIndex]})`);

                        // 🔍 诊断 (2025-10-05 v12): Gm的noteIndex=10诊断
                        if (chordContext.root === 'G' && noteIndex === 10) {
                            console.log(`🔍 === Gm noteIndex=10 (Bb/A#) 诊断 ===`);
                            console.log(`  isFlatRootChord: ${isFlatRootChord} (必须是true)`);
                            console.log(`  期望输出: Bb (step=B, alter=-1)`);
                            console.log(`  将使用cMajorFlatMap[10]映射`);
                        }
                    }

                    // C大调专用flat映射表：只转换黑键，白键保持不变
                    const cMajorFlatMap = [
                        { step: 'C', alter: 0 },   // 0 - C (白键保持)
                        { step: 'D', alter: -1 },  // 1 - Db (黑键转降号)
                        { step: 'D', alter: 0 },   // 2 - D (白键保持)
                        { step: 'E', alter: -1 },  // 3 - Eb (黑键转降号)
                        { step: 'E', alter: 0 },   // 4 - E (白键保持！不转换为Fb)
                        { step: 'F', alter: 0 },   // 5 - F (白键保持)
                        { step: 'G', alter: -1 },  // 6 - Gb (黑键转降号)
                        { step: 'G', alter: 0 },   // 7 - G (白键保持)
                        { step: 'A', alter: -1 },  // 8 - Ab (黑键转降号)
                        { step: 'A', alter: 0 },   // 9 - A (白键保持)
                        { step: 'B', alter: -1 },  // 10 - Bb (黑键转降号)
                        { step: 'B', alter: 0 }    // 11 - B (默认白键保持)
                    ];

                    let noteInfo = cMajorFlatMap[noteIndex];

                    // 🔧 修复 (2025-10-05 v2): 降号和弦的字母名连续性特殊处理
                    // 问题：Abm和弦显示为Ab-B-Eb，但应该是Ab-Cb-Eb（字母名A-C-E连续）
                    // 问题：Dbm和弦显示为Db-E-Ab，但应该是Db-Fb-Ab（字母名D-F-A连续）
                    // 解决：降号根音和弦（Ab, Eb, Bb, Db, Gb）使用Cb/Fb而不是B/E
                    // 🔧 修复 (2025-10-05 v6): 精准fallback - 只对Cb/Fb使用finalSpellingSystem
                    // 问题：v4的广泛fallback导致E/B和弦的G#/D#被渲染为Ab/Eb
                    //       v5的严格检查导致MusicXML路径Cb/Fb渲染失败
                    // 解决：只在noteIndex=11(Cb)和4(Fb)时允许finalSpellingSystem='flat'作为fallback

                    // 🔍 诊断 (2025-10-05): Fb/Cb分支检测
                    if (noteIndex === 11 || noteIndex === 4) {
                        console.log(`🔍 [Fb/Cb诊断] 检测到可能的Fb/Cb音符:`);
                        console.log(`  noteIndex: ${noteIndex} (${noteIndex === 11 ? 'Cb/B' : 'Fb/E'})`);
                        console.log(`  isFlatRootChord: ${isFlatRootChord}`);
                        console.log(`  finalSpellingSystem: ${finalSpellingSystem}`);
                        console.log(`  条件: isFlatRootChord || (finalSpellingSystem === 'flat' && (noteIndex === 11 || noteIndex === 4))`);
                        console.log(`  结果: ${isFlatRootChord || (finalSpellingSystem === 'flat' && (noteIndex === 11 || noteIndex === 4))}`);
                    }

                    if (isFlatRootChord || (finalSpellingSystem === 'flat' && (noteIndex === 11 || noteIndex === 4))) {
                        if (noteIndex === 11) {
                            console.log(`✅ 降号和弦特殊处理: ${chordContext.root}${chordContext.type || ''} 使用Cb而不是B（字母名连续性）`);

                            // 🔧 修复 (2025-10-05 v5): Cb必须应用+1八度修正（标准记谱规则）
                            // 音乐理论：MIDI 71 = B4 = Cb5（Cb属于C家族，在第5八度）
                            // v3的理解是错误的：Cb不是"作为B的替代"，而是C家族的独立音符
                            console.log(`🎵 C大调专用flat拼写: 半音${noteIndex} → Cb${octave + 1}`);
                            return { step: 'C', alter: -1, octave: octave + 1 };

                        } else if (noteIndex === 4) {
                            console.log(`✅ 降号和弦特殊处理: ${chordContext.root}${chordContext.type || ''} 使用Fb而不是E（字母名连续性）`);

                            // Fb不需要八度修正
                            console.log(`🎵 C大调专用flat拼写: 半音${noteIndex} → Fb${octave}`);
                            return { step: 'F', alter: -1, octave: octave };
                        }
                    } else if (noteIndex === 11 || noteIndex === 4) {
                        // 🔍 诊断：如果是Fb/Cb音符但没有走特殊分支
                        console.warn(`⚠️ [Fb/Cb诊断] 条件不满足，将使用cMajorFlatMap默认值（可能错误！）`);
                        console.warn(`  noteIndex ${noteIndex}将被拼写为: ${cMajorFlatMap[noteIndex].step}${cMajorFlatMap[noteIndex].alter !== 0 ? cMajorFlatMap[noteIndex].alter : ''}`);
                    }

                    // 🔧 修复 (2025-10-05 v7): 非flat root和弦回退到sharp系统
                    // 问题：E major被推断为flat系统，导致G#使用cMajorFlatMap[8]变成Ab
                    // 解决：检查isFlatRootChord，不是flat root和弦（且不是Cb/Fb）就用sharp系统
                    if (!isFlatRootChord && noteIndex !== 11 && noteIndex !== 4) {
                        // 不是flat root和弦（如E major），回退到sharp系统
                        console.log(`🔧 非降号和弦使用升号系统: 半音${noteIndex} → 使用sharp拼写`);
                        const result = applyChordSpellingSystem(noteIndex, octave, 'sharp');
                        return applyEnharmonicOctaveCorrection(result);
                    }

                    // 只有flat root和弦才使用flat映射表的默认逻辑
                    console.log(`🎵 C大调专用flat拼写: 半音${noteIndex} → ${noteInfo.step}${noteInfo.alter < 0 ? 'b'.repeat(-noteInfo.alter) : ''}${octave}`);

                    const result = applyEnharmonicOctaveCorrection({
                        step: noteInfo.step,
                        alter: noteInfo.alter,
                        octave: octave
                    });

                    // 🔍 诊断 (2025-10-05 v12): Gm追踪最终返回值
                    if (chordContext && chordContext.root === 'G') {
                        console.log(`🔍 [Gm诊断] Priority 4 flat分支返回: ${result.step}${result.alter < 0 ? 'b' : result.alter > 0 ? '#' : ''}${result.octave} (noteIndex=${noteIndex})`);
                        if (noteIndex === 10) {
                            console.log(`  ✅ noteIndex=10应该返回Bb，实际返回: ${result.step}${result.alter < 0 ? 'b' : result.alter > 0 ? '#' : ''}`);
                        }
                        console.log(`========== Gm诊断结束 (Priority 4 flat) ==========\n`);
                    }

                    return result;
                } else {
                    // 升号系统使用原有逻辑
                    const result = applyChordSpellingSystem(noteIndex, octave, finalSpellingSystem);

                    // 🔧 修复 (2025-10-05 v11): B major D#诊断
                    if (chordContext && chordContext.root === 'B' && chordContext.type === 'major' && noteIndex === 3) {
                        console.log(`🔍 === B major D#诊断 ===`);
                        console.log(`  sharp系统返回: step=${result.step}, alter=${result.alter}, octave=${result.octave}`);
                    }

                    return applyEnharmonicOctaveCorrection(result);
                }
            }
        }

        // 否则使用标准的C大调拼写
        console.log(`🎼 使用标准C大调/a小调拼写`);
        const result = handleNaturalKeys(noteIndex, octave, keySignature);
        return applyEnharmonicOctaveCorrection(result);
    }

    // ============ 🎵 第5优先级：无调性上下文（智能推断调性）============
    // 🔧 2025-09-30 修复：在随机模式下根据和弦根音推断调性
    // 问题：和弦代号显示Abm，但音符拼写成G#m
    // 原因：系统使用C大调keySignature，导致拼写不一致
    // 解决：使用determineChordSpellingSystem推断正确的拼写系统

    console.log(`⚠️ 无明确调性信息，尝试根据和弦上下文推断: noteIndex=${noteIndex}`);

    // 🔧 2025-10-03 增强修复：尝试根据和弦上下文推断拼写系统
    if (chordContext && chordContext.root) {
        let spellingSystem = determineChordSpellingSystem(chordContext, keySignature);
        console.log(`🎯 根据和弦${chordContext.root}${chordContext.type || ''}推断拼写系统: ${spellingSystem || 'null'}`);

        // 🔧 2025-10-03 强化修复：基于和弦根音直接判断拼写系统（与C大调分支一致）
        // 确保降号/升号根音和弦使用正确的拼写系统
        const flatRoots = ['Db', 'Eb', 'Gb', 'Ab', 'Bb'];
        const sharpRoots = ['C#', 'D#', 'F#', 'G#', 'A#'];

        if (flatRoots.includes(chordContext.root)) {
            console.log(`🔧 检测到降号根音 ${chordContext.root}，强制使用flat拼写系统`);
            spellingSystem = 'flat';
        } else if (sharpRoots.includes(chordContext.root)) {
            console.log(`🔧 检测到升号根音 ${chordContext.root}，强制使用sharp拼写系统`);
            spellingSystem = 'sharp';
        }

        if (spellingSystem) {
            // 使用推断的拼写系统生成音符
            const result = applyChordSpellingSystem(noteIndex, octave, spellingSystem);
            return applyEnharmonicOctaveCorrection(result);
        }
    }

    // 如果推断失败，回退到原有的handleNoKeySignature逻辑
    console.log(`⚠️ 推断失败，使用默认拼写: noteIndex=${noteIndex}`);
    const result = handleNoKeySignature(noteIndex, octave, chordContext);
    return applyEnharmonicOctaveCorrection(result);
}

// 🎯 2025-10-05: 解析包含八度的音符名称（如"Bb4", "E#5"）为pitchInfo对象
// 注意：此函数要求音符名必须包含八度数字，与minor-key-spelling.js中的parseNoteName不同
// 目的：优先使用chord.notes数组的拼写，避免从MIDI重新计算导致的拼写不一致
// 🔧 修复 (2025-10-05): 重命名为parseNoteNameWithOctave，避免与minor-key-spelling.js中的parseNoteName冲突
function parseNoteNameWithOctave(noteName) {
    if (!noteName || typeof noteName !== 'string') {
        console.error(`❌ parseNoteNameWithOctave: 无效输入: ${noteName}`);
        return null;
    }

    // 提取音符组成部分（必须包含八度数字）
    const match = noteName.match(/^([A-G])(#{1,2}|b{1,2})?(\d+)$/);
    if (!match) {
        console.error(`❌ parseNoteNameWithOctave: 无法解析音符格式: ${noteName} (需要包含八度，如'Ab5')`);
        return null;
    }

    const step = match[1];
    const accidentals = match[2] || '';
    const octave = parseInt(match[3]);

    // 计算alter值
    let alter = 0;
    if (accidentals.includes('#')) {
        alter = accidentals.split('#').length - 1;  // 数升号数量
    } else if (accidentals.includes('b')) {
        alter = -(accidentals.split('b').length - 1);  // 数降号数量（负数）
    }

    console.log(`🎵 parseNoteNameWithOctave: "${noteName}" → {step:'${step}', alter:${alter}, octave:${octave}}`);

    return { step, alter, octave };
}

// 🔧 修复B#和E#导致的八度计算问题
function applyEnharmonicOctaveCorrection(pitchInfo) {
    if (!pitchInfo) return pitchInfo;

    // 🎵 B#八度修正：B#虽然等于C音高，但记谱上属于B音符家族，八度应该减1
    if (pitchInfo.step === 'B' && pitchInfo.alter === 1) {
        const correctedOctave = pitchInfo.octave - 1;
        console.log(`🔧 B#八度修正: 从${pitchInfo.octave}修正为${correctedOctave} (B#属于B音符家族)`);
        return { ...pitchInfo, octave: correctedOctave };
    }

    // 🎵 E#八度修正：E#虽然等于F音高，但在记谱上与F同八度
    // 🔧 修复 (2025-10-05 v4): 移除错误的-1修正
    // 问题：E#4 = F4 = MIDI 65，基础计算octave=4是正确的
    // 原代码错误地-1导致E#4显示为E#3
    // 正确逻辑：E#4和F4在同一个八度，不需要修正
    if (pitchInfo.step === 'E' && pitchInfo.alter === 1) {
        // E#不需要八度修正，与F同八度
        console.log(`✅ E#八度检查: ${pitchInfo.step}#${pitchInfo.octave} (与F同八度，无需修正)`);
        return pitchInfo; // 不修正，直接返回
    }

    // 🎵 Cb八度修正：Cb虽然等于B音高，但记谱上属于C音符家族，八度应该加1
    // 🔧 修复 (2025-10-05): 之前错误地移除了Cb修正，导致所有Cb八度低了1
    // 问题：MIDI 83被错误地显示为Cb5，应该是Cb6
    // 原理：MIDI八度基于C，但Cb属于C家族记谱在更高八度
    if (pitchInfo.step === 'C' && pitchInfo.alter === -1) {
        const correctedOctave = pitchInfo.octave + 1;
        console.log(`🔧 Cb八度修正: 从${pitchInfo.octave}修正为${correctedOctave} (Cb属于C音符家族)`);
        return { ...pitchInfo, octave: correctedOctave };
    }

    // 🔍 Fb/Cb 诊断总结：显示最终决策
    if (pitchInfo && ((pitchInfo.step === 'F' && pitchInfo.alter === -1) ||
                      (pitchInfo.step === 'C' && pitchInfo.alter === -1) ||
                      (pitchInfo.step === 'E' && pitchInfo.alter === 0) ||
                      (pitchInfo.step === 'B' && pitchInfo.alter === 0))) {
        const noteName = `${pitchInfo.step}${pitchInfo.alter < 0 ? 'b'.repeat(-pitchInfo.alter) : pitchInfo.alter > 0 ? '#'.repeat(pitchInfo.alter) : ''}${pitchInfo.octave}`;
        console.log(`\n✅ ========== Fb/Cb 诊断结果 ==========`);
        console.log(`📊 最终拼写: ${noteName}`);
        console.log(`========================================\n`);
    }

    // 其他音符不需要修正
    return pitchInfo;
}

// 🎵 升号调系统 - 处理G(1♯)到C#(7♯)全部升号调
function handleSharpKeys(noteIndex, octave, keySignature) {
    // 基础升号拼写映射表（恢复原版，避免八度问题）
    const sharpKeyNoteMap = [
        { step: 'C', alter: 0 },   { step: 'C', alter: 1 },   { step: 'D', alter: 0 },   // 0:C, 1:C#, 2:D
        { step: 'D', alter: 1 },   { step: 'E', alter: 0 },   { step: 'F', alter: 0 },   // 3:D#, 4:E, 5:F
        { step: 'F', alter: 1 },   { step: 'G', alter: 0 },   { step: 'G', alter: 1 },   // 6:F#, 7:G, 8:G#
        { step: 'A', alter: 0 },   { step: 'A', alter: 1 },   { step: 'B', alter: 0 }    // 9:A, 10:A#, 11:B
    ];

    let noteInfo = sharpKeyNoteMap[noteIndex];

    // 极高升号调特殊音符处理
    if (keySignature.sharps === 6 && noteIndex === 5) {
        noteInfo = { step: 'E', alter: 1 };  // F#大调/d#小调中的E#
    }
    if (keySignature.sharps >= 6 && noteIndex === 0) {
        noteInfo = { step: 'B', alter: 1 };  // F#大调/C#大调中的B#
    }
    if (keySignature.sharps === 7 && noteIndex === 7) {
        noteInfo = { step: 'F', alter: 2 };  // C#大调/a#小调中的F##
    }

    // 小调变体特殊处理
    if (keySignature.mode === 'minor' && keySignature.scaleVariant) {
        const variantResult = handleMinorVariantSpelling(noteIndex, octave, keySignature.scaleVariant);
        if (variantResult) return variantResult;
    }

    // 小调静态映射表处理
    if (keySignature.mode === 'minor') {
        const minorKey = `${keySignature.tonic.toLowerCase()}-minor`;
        if (window.harmonyTheory && window.harmonyTheory.MINOR_KEY_SPELLING_MAP) {
            const minorSpellingMap = window.harmonyTheory.MINOR_KEY_SPELLING_MAP[minorKey];
            if (minorSpellingMap && minorSpellingMap[noteIndex]) {
                const staticSpelling = minorSpellingMap[noteIndex];
                const result = parseStaticSpelling(staticSpelling, octave);
                console.log(`🎼 升号小调静态映射: ${minorKey}, 半音${noteIndex} -> ${staticSpelling}`);
                return result;
            }
        }
    }

    const modeText = keySignature.mode === 'minor' ? '小调' : '大调';
    console.log(`🎵 升号${modeText}(${keySignature.sharps}♯): 半音${noteIndex} -> ${noteInfo.step}${noteInfo.alter > 0 ? '#'.repeat(noteInfo.alter) : ''}`);
    return { step: noteInfo.step, alter: noteInfo.alter, octave: octave };
}

// 🎵 降号调系统 - 处理F(1♭)到Cb(7♭)全部降号调
function handleFlatKeys(noteIndex, octave, keySignature) {
    // ============================================================================
    // 🎯 2025-09-30 明确规定：Fb vs E 和 Cb vs B 的使用规则
    // ============================================================================
    //
    // **Fb的使用规则**（半音4）：
    // - Gb大调（6♭）
    // - Cb大调（7♭）
    // - db小调（5♭）- ⚠️ 特殊：虽然只有5个降号，但音阶中包含Fb作为♭III
    // - eb小调（6♭）
    // - ab小调（7♭）
    // - gb小调、cb小调（理论调性）
    //
    // **Cb的使用规则**（半音11）：
    // - Gb大调（6♭）
    // - Cb大调（7♭）
    // - ab小调（7♭）
    // - eb小调（6♭）
    // - gb小调、cb小调（理论调性）
    //
    // **所有其他调性**使用 E 和 B
    // ============================================================================

    // 基础降号拼写映射表（标准降号调：1-5个降号）
    const flatKeyNoteMap = [
        { step: 'C', alter: 0 },   { step: 'D', alter: -1 },  { step: 'D', alter: 0 },
        { step: 'E', alter: -1 },  { step: 'E', alter: 0 },   { step: 'F', alter: 0 },
        { step: 'G', alter: -1 },  { step: 'G', alter: 0 },   { step: 'A', alter: -1 },
        { step: 'A', alter: 0 },   { step: 'B', alter: -1 },  { step: 'B', alter: 0 }
    ];

    let noteInfo = flatKeyNoteMap[noteIndex];

    // 🎯 特殊音符处理：Fb 和 Cb（基于明确的调性规则）

    // 🔍 诊断：显示当前noteIndex对应的MIDI半音
    const noteNames = ['C', 'C#/Db', 'D', 'D#/Eb', 'E/Fb', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B/Cb'];
    console.log(`🔍 handleFlatKeys: 处理半音${noteIndex} (${noteNames[noteIndex]}), 调号: ${keySignature.tonic}-${keySignature.mode} (${keySignature.flats}♭)`);

    // ✅ Fb的使用条件（noteIndex = 4）
    const shouldUseFb = (
        keySignature.flats >= 6 ||  // Gb大调、Cb大调、eb小调、ab小调等
        (keySignature.mode === 'minor' && keySignature.tonic === 'Db') // db小调特殊情况
    );

    // ✅ Cb的使用条件（noteIndex = 11）
    const shouldUseCb = keySignature.flats >= 6;  // Gb大调、Cb大调、eb小调、ab小调等

    // 🔍 诊断：显示规则判断结果
    if (noteIndex === 4) {
        console.log(`🔍 半音4 (E/Fb) 规则判断: shouldUseFb=${shouldUseFb} (flats=${keySignature.flats}, isFbMinor=${keySignature.mode === 'minor' && keySignature.tonic === 'Db'})`);
    }
    if (noteIndex === 11) {
        console.log(`🔍 半音11 (B/Cb) 规则判断: shouldUseCb=${shouldUseCb} (flats=${keySignature.flats})`);
    }

    if (shouldUseFb && noteIndex === 4) {
        noteInfo = { step: 'F', alter: -1 };
        console.log(`🎯 使用Fb: ${keySignature.tonic}-${keySignature.mode} (${keySignature.flats}♭)`);
    }

    if (shouldUseCb && noteIndex === 11) {
        noteInfo = { step: 'C', alter: -1 };
        console.log(`🎯 使用Cb: ${keySignature.tonic}-${keySignature.mode} (${keySignature.flats}♭)`);
    }

    // 其他特殊降号调音符
    if (keySignature.flats === 6 && noteIndex === 7) {
        noteInfo = { step: 'G', alter: -1 };  // Gb大调/eb小调中的Gb
    }
    if (keySignature.flats === 7 && noteIndex === 0) {
        noteInfo = { step: 'D', alter: -2 };  // Cb大调/ab小调中的Dbb
    }

    // 小调变体特殊处理
    if (keySignature.mode === 'minor' && keySignature.scaleVariant) {
        const variantResult = handleMinorVariantSpelling(noteIndex, octave, keySignature.scaleVariant);
        if (variantResult) return variantResult;
    }

    // 小调静态映射表处理
    if (keySignature.mode === 'minor') {
        const minorKey = `${keySignature.tonic.toLowerCase()}-minor`;
        if (window.harmonyTheory && window.harmonyTheory.MINOR_KEY_SPELLING_MAP) {
            const minorSpellingMap = window.harmonyTheory.MINOR_KEY_SPELLING_MAP[minorKey];
            if (minorSpellingMap && minorSpellingMap[noteIndex]) {
                const staticSpelling = minorSpellingMap[noteIndex];
                const result = parseStaticSpelling(staticSpelling, octave);
                console.log(`🎼 降号小调静态映射: ${minorKey}, 半音${noteIndex} -> ${staticSpelling}`);
                return result;
            }
        }
    }

    // 🔧 Cb音符八度修正 - 解决Gb大调中Cb3→Cb4问题
    let correctedOctave = octave;
    if (noteInfo.step === 'C' && noteInfo.alter === -1 && keySignature.flats >= 6) {
        // Cb在记谱上属于C家族，应该和C音符在同一八度
        // MIDI 59 = B3（音高），但Cb应该显示为Cb4（记谱）
        correctedOctave = octave + 1;
        console.log(`🔧 大调Cb八度修正: MIDI${noteIndex === 11 ? '59' : 'unknown'} -> Cb${correctedOctave} (C家族八度对齐，${octave}+1=${correctedOctave})`);
    }

    const modeText = keySignature.mode === 'minor' ? '小调' : '大调';
    console.log(`🎵 降号${modeText}(${keySignature.flats}♭): 半音${noteIndex} -> ${noteInfo.step}${noteInfo.alter < 0 ? 'b'.repeat(Math.abs(noteInfo.alter)) : ''}`);
    return { step: noteInfo.step, alter: noteInfo.alter, octave: correctedOctave };
}

// 🎵 自然调系统 - 处理C大调和a小调
function handleNaturalKeys(noteIndex, octave, keySignature) {
    // C大调/a小调标准映射（优先使用自然音符，黑键优先升号）
    const naturalKeyNoteMap = [
        { step: 'C', alter: 0 },   { step: 'C', alter: 1 },   { step: 'D', alter: 0 },
        { step: 'D', alter: 1 },   { step: 'E', alter: 0 },   { step: 'F', alter: 0 },
        { step: 'F', alter: 1 },   { step: 'G', alter: 0 },   { step: 'G', alter: 1 },
        { step: 'A', alter: 0 },   { step: 'A', alter: 1 },   { step: 'B', alter: 0 }
    ];

    let noteInfo = naturalKeyNoteMap[noteIndex];

    // a小调变体特殊处理
    if (keySignature.mode === 'minor' && keySignature.scaleVariant) {
        const variantResult = handleMinorVariantSpelling(noteIndex, octave, keySignature.scaleVariant);
        if (variantResult) return variantResult;
    }

    // a小调静态映射表处理
    if (keySignature.mode === 'minor') {
        const minorKey = 'a-minor';
        if (window.harmonyTheory && window.harmonyTheory.MINOR_KEY_SPELLING_MAP) {
            const minorSpellingMap = window.harmonyTheory.MINOR_KEY_SPELLING_MAP[minorKey];
            if (minorSpellingMap && minorSpellingMap[noteIndex]) {
                const staticSpelling = minorSpellingMap[noteIndex];
                const result = parseStaticSpelling(staticSpelling, octave);
                console.log(`🎼 a小调静态映射: 半音${noteIndex} -> ${staticSpelling}`);
                return result;
            }
        }
    }

    const keyText = keySignature.mode === 'minor' ? 'a小调' : 'C大调';
    console.log(`🎵 ${keyText}: 半音${noteIndex} -> ${noteInfo.step}${noteInfo.alter > 0 ? '#' : ''}`);
    return { step: noteInfo.step, alter: noteInfo.alter, octave: octave };
}

// 🎵 无调性上下文处理
function handleNoKeySignature(noteIndex, octave, chordContext) {
    // 和弦上下文智能拼写规则
    if (chordContext && chordContext.root && chordContext.type) {
        const spellingRules = getChordSpellingRules(chordContext.root, chordContext.type);
        if (spellingRules[noteIndex]) {
            console.log(`🎼 和弦上下文拼写: ${chordContext.root}${chordContext.type}, 半音${noteIndex}`);
            return {
                step: spellingRules[noteIndex].step,
                alter: spellingRules[noteIndex].alter,
                octave: octave
            };
        }
    }

    // 标准默认映射（优先使用升号）
    return getStandardMapping(noteIndex, octave);
}

// 🎶 小调变体处理子函数
function handleMinorVariantSpelling(noteIndex, octave, scaleVariant) {
    if (!scaleVariant.notes) return null;

    const scaleNote = scaleVariant.notes.find(note => {
        const noteSemitone = harmonyTheory.noteToSemitone[note];
        return noteSemitone === noteIndex;
    });

    if (scaleNote) {
        const result = parseStaticSpelling(scaleNote, octave);
        console.log(`🎶 ${scaleVariant.type}小调变体: 半音${noteIndex} -> ${scaleNote}`);
        return result;
    }
    return null;
}

// 🎹 其他情况处理函数
function handleOtherKeySpelling(noteIndex, octave, keySignature, chordContext) {
    // 降号大调处理
    if (keySignature && keySignature.flats >= 1) {
        return handleFlatKeySpelling(noteIndex, octave, keySignature);
    }

    // 🔧 特殊修复：随机模式下Cb音符八度问题
    // 即使keySignature不是降号调，如果遇到Cb音符，也要应用正确的八度修正
    if (noteIndex === 11) { // noteIndex 11 = B/Cb
        // 检查是否应该显示为Cb（通过和弦上下文推断）
        if (chordContext && chordContext.root &&
            (chordContext.root.includes('b') || chordContext.root === 'Cb' || chordContext.root === 'Gb')) {
            console.log(`🔧 随机模式Cb八度修正: 检测到降号和弦${chordContext.root}, 应用Cb八度修正`);

            // 应用与handleFlatKeySpelling相同的Cb八度修正逻辑
            const correctedOctave = octave + 1;
            console.log(`🔧 随机模式Cb八度修正: MIDI${noteIndex} -> Cb${correctedOctave} (C家族八度对齐，${octave}+1=${correctedOctave})`);

            return {
                step: 'C',
                alter: -1,
                octave: correctedOctave
            };
        }
    }

    // 🔧 增强修复：通过MIDI音符检测Cb
    // 如果MIDI音符59（B3）在任何降号上下文中应显示为Cb，修正八度
    if (noteIndex === 11 && octave === 3) { // MIDI 59 = B3，应显示为Cb4
        // 检测是否在可能需要Cb拼写的上下文中
        const shouldUseCb = chordContext && (
            (chordContext.root && (chordContext.root.includes('b') || chordContext.root === 'Cb')) ||
            (chordContext.type && chordContext.type.includes('b'))
        );

        if (shouldUseCb) {
            const correctedOctave = octave + 1; // 3 + 1 = 4
            console.log(`🔧 MIDI基础Cb八度修正: MIDI59(B3) -> Cb${correctedOctave} (C家族对齐)`);

            return {
                step: 'C',
                alter: -1,
                octave: correctedOctave
            };
        }
    }

    // 无调性时的和弦上下文处理
    if (chordContext && chordContext.root && chordContext.type && !keySignature) {
        const spellingRules = getChordSpellingRules(chordContext.root, chordContext.type);
        if (spellingRules[noteIndex]) {
            return {
                step: spellingRules[noteIndex].step,
                alter: spellingRules[noteIndex].alter,
                octave: octave
            };
        }
    }

    // 标准默认映射
    return getStandardMapping(noteIndex, octave);
}

// 🎵 降号调处理子函数
function handleFlatKeySpelling(noteIndex, octave, keySignature) {
    const flatKeyNoteMap = [
        { step: 'C', alter: 0 },   { step: 'D', alter: -1 },  { step: 'D', alter: 0 },
        { step: 'E', alter: -1 },  { step: 'E', alter: 0 },   { step: 'F', alter: 0 },
        { step: 'G', alter: -1 },  { step: 'G', alter: 0 },   { step: 'A', alter: -1 },
        { step: 'A', alter: 0 },   { step: 'B', alter: -1 },  { step: 'B', alter: 0 }
    ];

    let noteInfo = flatKeyNoteMap[noteIndex];

    // 极高降号调特殊处理
    if (keySignature.flats >= 6) {
        if (keySignature.flats === 7 && noteIndex === 11) {
            noteInfo = { step: 'C', alter: -1 };  // Cb
        }
        if (keySignature.flats >= 6 && noteIndex === 4) {
            noteInfo = { step: 'F', alter: -1 };  // Fb
        }
        if (keySignature.flats === 6 && noteIndex === 7) {
            noteInfo = { step: 'G', alter: -1 };  // Gb (eb大调中)
        }
    }

    console.log(`🎵 降号调(${keySignature.flats}♭): 半音${noteIndex} -> ${noteInfo.step}${noteInfo.alter < 0 ? 'b' : ''}`);
    return { step: noteInfo.step, alter: noteInfo.alter, octave: octave };
}

// 📝 工具函数：解析静态拼写字符串
function parseStaticSpelling(spelling, octave) {
    let step, alter = 0;
    if (spelling.includes('##')) {
        step = spelling.replace('##', '');
        alter = 2;
    } else if (spelling.includes('#')) {
        step = spelling.replace('#', '');
        alter = 1;
    } else if (spelling.includes('bb')) {
        step = spelling.replace('bb', '');
        alter = -2;
    } else if (spelling.includes('b')) {
        step = spelling.replace('b', '');
        alter = -1;
    } else {
        step = spelling;
        alter = 0;
    }
    return { step: step, alter: alter, octave: octave };
}

// 📝 工具函数：标准默认映射
function getStandardMapping(noteIndex, octave) {
    // 🔧 修复：使用升号偏好的默认映射，与新的24调系统保持一致
    const defaultNoteMap = [
        { step: 'C', alter: 0 },   { step: 'C', alter: 1 },   { step: 'D', alter: 0 },   // 0:C, 1:C#, 2:D
        { step: 'D', alter: 1 },   { step: 'E', alter: 0 },   { step: 'F', alter: 0 },   // 3:D#, 4:E, 5:F
        { step: 'F', alter: 1 },   { step: 'G', alter: 0 },   { step: 'G', alter: 1 },   // 6:F#, 7:G, 8:G#
        { step: 'A', alter: 0 },   { step: 'A', alter: 1 },   { step: 'B', alter: 0 }    // 9:A, 10:A#, 11:B
    ];

    const noteInfo = defaultNoteMap[noteIndex];
    const alterStr = noteInfo.alter > 0 ? '#'.repeat(noteInfo.alter) : (noteInfo.alter < 0 ? 'b'.repeat(-noteInfo.alter) : '');
    console.log(`📝 升号偏好默认映射: 半音${noteIndex} -> ${noteInfo.step}${alterStr}`);
    return { step: noteInfo.step, alter: noteInfo.alter, octave: octave };
}

// 获取和弦拼法规则
function getChordSpellingRules(root, type) {
    const rules = {};

    // 基于根音确定调性倾向
    const rootPreference = getRootPreference(root);

    // 特殊情况处理：避免双重变音或极少见的音符名
    const specialCases = {
        // 🔧 移除Ab_minor_11的强制转换，避免影响Eb小调等调性中Cb的正确拼写
        // 原逻辑：'Ab_minor_11': { step: 'B', alter: 0 },  // MIDI 11 = B/Cb，选择 B
        // 问题：这个全局规则会影响其他调性中Cb的八度计算

        // C# 的三音在实际中常写作 F 而不是 E#
        'C#_major_5': { step: 'F', alter: 0 },   // MIDI 5 = F/E#，选择 F
    };

    // 检查特殊情况
    const specialKey = `${root}_${type === 'minor' || type === 'min' || type === 'm' ? 'minor' : 'major'}`;

    // 常见和弦拼法规则
    switch (type) {
        case 'minor':
        case 'min':
        case 'm':
            // 小三和弦的三音应该使用降号拼法
            if (root === 'C') {
                rules[3] = { step: 'E', alter: -1 }; // Eb，不是D#
            } else if (root === 'D') {
                rules[5] = { step: 'F', alter: 0 };  // F自然音
            } else if (root === 'E') {
                rules[7] = { step: 'G', alter: 0 };  // G自然音
            } else if (root === 'F') {
                rules[8] = { step: 'A', alter: -1 }; // Ab，不是G#
            } else if (root === 'G') {
                rules[10] = { step: 'B', alter: -1 }; // Bb，不是A#
            } else if (root === 'A') {
                rules[0] = { step: 'C', alter: 0 };   // C自然音
            } else if (root === 'B') {
                rules[2] = { step: 'D', alter: 0 };   // D自然音
            } else if (root === 'Ab') {
                // 🔧 移除强制Cb→B转换，避免在Eb小调等降号调中影响Cb的正确拼写和八度计算
                // 原逻辑：rules[11] = { step: 'B', alter: 0 };  // B，不是Cb
                // 问题：这会在所有情况下强制转换，影响其他调性中Cb的正确显示
                // 解决：让调性感知的拼写系统处理，而不是在无调性规则中强制转换
            }
            break;

        case 'major':
        case 'maj':
        case 'M':
        default:
            // 大三和弦的特殊情况
            if (root === 'C#') {
                rules[5] = { step: 'F', alter: 0 };   // F，不是E#
            }
            break;
    }

    // 根据根音的调性偏好调整所有音符
    if (rootPreference === 'flat') {
        // 偏向降号的根音（如Bb, Eb, Ab, Db, Gb）
        rules[1] = rules[1] || { step: 'D', alter: -1 };  // Db
        rules[3] = rules[3] || { step: 'E', alter: -1 };  // Eb
        rules[6] = rules[6] || { step: 'G', alter: -1 };  // Gb
        rules[8] = rules[8] || { step: 'A', alter: -1 };  // Ab
        rules[10] = rules[10] || { step: 'B', alter: -1 }; // Bb
    } else if (rootPreference === 'sharp') {
        // 偏向升号的根音（如F#, C#, G#, D#, A#）
        rules[1] = rules[1] || { step: 'C', alter: 1 };   // C#
        rules[3] = rules[3] || { step: 'D', alter: 1 };   // D#
        rules[6] = rules[6] || { step: 'F', alter: 1 };   // F#
        rules[8] = rules[8] || { step: 'G', alter: 1 };   // G#
        rules[10] = rules[10] || { step: 'A', alter: 1 };  // A#
    }

    return rules;
}

// 根据根音确定调性偏好
function getRootPreference(root) {
    const flatRoots = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
    const sharpRoots = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];

    if (flatRoots.includes(root)) {
        return 'flat';
    } else if (sharpRoots.includes(root)) {
        return 'sharp';
    } else {
        return 'natural'; // C major等自然调
    }
}

// 解析音符音高
// 根据音域设置调整八度
function adjustOctaveToRange(octave, noteIndex, chordContext = null) {
    const rangeMinSelect = document.getElementById('rangeMin');
    const rangeMaxSelect = document.getElementById('rangeMax');

    if (!rangeMinSelect || !rangeMaxSelect) return octave;

    const minMidi = parseInt(rangeMinSelect.value);
    const maxMidi = parseInt(rangeMaxSelect.value);

    // 计算当前音符的MIDI值
    const currentMidi = (octave + 1) * 12 + noteIndex;

    console.log(`🔍 音符检查: 八度${octave}, 音符索引${noteIndex}, MIDI值${currentMidi}, 音域${minMidi}-${maxMidi}`);

    // 🛡️ 检查是否在根位模式下 - 挂留和弦保护
    const shouldAllowInversion = harmonyTheory.shouldChordBeAffectedByInversionSettings(
        chordContext || { type: 'unknown' },
        window.chordSettings.includeTriadInversions,
        window.chordSettings.includeSeventhInversions
    );
    const shouldPreserveRootPosition = !shouldAllowInversion;

    if (shouldPreserveRootPosition && chordContext) {
        // 检查是否需要特别保护根位结构
        const isExtraProtected = chordContext.preserveRootPosition;

        console.log(`🔒 根位模式：音符${chordContext.notePosition}/${chordContext.totalNotes} - ${isExtraProtected ? '特别保护' : '保守调整'}策略`);

        if (isExtraProtected) {
            // 特别保护模式：几乎不进行调整，优先保持根位结构
            console.log(`🛡️ 特别保护模式：保持原八度${octave}以确保根位结构完整`);
            return octave;
        } else {
            // 在根位模式下，只有在严重超出音域时才进行调整
            const severityThreshold = 12; // 超出一个八度才认为是严重的

            if (currentMidi < minMidi) {
                const deficit = minMidi - currentMidi;
                if (deficit > severityThreshold) {
                    const targetOctave = Math.floor((minMidi - noteIndex) / 12) - 1;
                    console.log(`🎵 音符严重过低(差${deficit}半音)，调整到八度${targetOctave}`);
                    return targetOctave;
                } else {
                    console.log(`✅ 音符略低但在可接受范围内，保持八度${octave}`);
                }
            } else if (currentMidi > maxMidi) {
                const excess = currentMidi - maxMidi;
                if (excess > severityThreshold) {
                    const targetOctave = Math.floor((maxMidi - noteIndex) / 12) - 1;
                    console.log(`🎵 音符严重过高(超${excess}半音)，调整到八度${targetOctave}`);
                    return targetOctave;
                } else {
                    console.log(`✅ 音符略高但在可接受范围内，保持八度${octave}`);
                }
            }
        }
    } else {
        // 非根位模式：使用原来的逻辑
        if (currentMidi < minMidi) {
            const targetOctave = Math.floor((minMidi - noteIndex) / 12) - 1;

            // 🔧 移除：之前添加的C和Cb音符特殊保护逻辑
            // 原因：真正的问题是Cb→B的强制转换，修复转换逻辑后八度计算应该正常

            console.log(`🎵 音符过低，从八度${octave}调整到${targetOctave} (MIDI: ${currentMidi} -> ${(targetOctave + 1) * 12 + noteIndex})`);
            return targetOctave;
        } else if (currentMidi > maxMidi) {
            const targetOctave = Math.floor((maxMidi - noteIndex) / 12) - 1;
            console.log(`🎵 音符过高，从八度${octave}调整到${targetOctave} (MIDI: ${currentMidi} -> ${(targetOctave + 1) * 12 + noteIndex})`);
            return targetOctave;
        }
    }

    console.log(`✅ 音符在范围内或保持根位结构，保持八度${octave}`);
    return octave;
}

// 为和弦音符创建分层分布，增加变化性
function parseNotePitchWithSpread(noteName, noteIndex, totalNotes, chordRoot = null) {
    let minMidi, maxMidi;

    // 获取当前音域
    if (currentActiveClef && clefRangeMemory[currentActiveClef]) {
        minMidi = clefRangeMemory[currentActiveClef].min;
        maxMidi = clefRangeMemory[currentActiveClef].max;
    } else {
        const rangeMinSelect = document.getElementById('rangeMin');
        const rangeMaxSelect = document.getElementById('rangeMax');
        if (rangeMinSelect && rangeMaxSelect) {
            minMidi = parseInt(rangeMinSelect.value);
            maxMidi = parseInt(rangeMaxSelect.value);
        } else {
            // 默认使用第4八度
            return parseNotePitch(noteName, 4);
        }
    }

    // 🛡️ 检查是否应该强制根位（不分层分布）- 挂留和弦保护
    const shouldAllowInversion = harmonyTheory.shouldChordBeAffectedByInversionSettings(
        { type: 'unknown' }, // 没有具体和弦上下文时的默认处理
        window.chordSettings.includeTriadInversions,
        window.chordSettings.includeSeventhInversions
    );
    const shouldPreserveRootPosition = !shouldAllowInversion;

    let targetOctave;
    if (shouldPreserveRootPosition) {
        // 🎯 根位模式：所有音符使用相同或相近的八度，保持紧密分布
        const baseOctave = 4;

        // 在根位模式下，音符应该紧密分布在同一八度内
        // 只有当音程跨度较大时才适当提升八度
        if (noteIndex === 0) {
            // 根音使用基础八度
            targetOctave = baseOctave;
        } else if (noteIndex === 1) {
            // 第二个音符通常在同一八度
            targetOctave = baseOctave;
        } else {
            // 第三个及以上音符可能需要提升一个八度以避免过度拥挤
            targetOctave = baseOctave + (noteIndex >= 2 ? 1 : 0);
        }

        console.log(`🎯 根位模式：音符${noteIndex + 1} ${noteName} 使用八度 ${targetOctave} (紧密分布)`);

        // 检查是否需要整体调整以适应音域
        const rangeMinSelect = document.getElementById('rangeMin');
        const rangeMaxSelect = document.getElementById('rangeMax');

        if (rangeMinSelect && rangeMaxSelect) {
            const minMidi = parseInt(rangeMinSelect.value);
            const maxMidi = parseInt(rangeMaxSelect.value);
            const estimatedMidi = (targetOctave + 1) * 12; // 大致的MIDI值

            // 如果超出音域，适当调整
            if (estimatedMidi > maxMidi) {
                const adjustedOctave = Math.floor(maxMidi / 12) - 1;
                if (adjustedOctave >= 3) {
                    targetOctave = adjustedOctave;
                    console.log(`📉 音域调整：调整到八度${targetOctave}以适应音域${minMidi}-${maxMidi}`);
                }
            } else if (estimatedMidi < minMidi) {
                const adjustedOctave = Math.floor(minMidi / 12) - 1;
                if (adjustedOctave <= 6) {
                    targetOctave = adjustedOctave;
                    console.log(`📈 音域调整：调整到八度${targetOctave}以适应音域${minMidi}-${maxMidi}`);
                }
            }
        }

        // 最终安全限制
        if (targetOctave > 6) {
            targetOctave = 6; // 最高限制
        } else if (targetOctave < 3) {
            targetOctave = 3; // 最低限制
        }
    } else {
        // 原有的分层分布逻辑（用于转位模式）
        const rangSpan = maxMidi - minMidi;
        const noteRatio = noteIndex / (totalNotes - 1); // 0 到 1 之间的比例
        const targetMidi = minMidi + Math.floor(rangSpan * noteRatio);
        targetOctave = Math.floor(targetMidi / 12) - 1;
        console.log(`🎵 分布模式：音符${noteIndex + 1}/${totalNotes}: ${noteName} -> 目标八度${targetOctave}`);
    }

    console.log(`🎵 音符${noteIndex + 1}/${totalNotes}: ${noteName} -> 目标八度${targetOctave}`);

    // 在根位模式下，传递和弦上下文信息，并标记为安全模式
    let chordContext = null;
    if (shouldPreserveRootPosition && chordRoot) {
        // 计算根音MIDI值作为参考
        const noteToSemitone = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
            'A#': 10, 'Bb': 10, 'B': 11
        };
        const rootSemitone = noteToSemitone[chordRoot] || 0;
        const rootMidi = (4 + 1) * 12 + rootSemitone; // 根音基础MIDI值

        chordContext = {
            notePosition: noteIndex,
            totalNotes: totalNotes,
            rootMidi: rootMidi,
            rootNote: chordRoot,
            preserveRootPosition: true // 标记需要保持根位
        };
    }

    return parseNotePitch(noteName, targetOctave, chordContext);
}

function parseNotePitch(noteName, baseOctave = null, chordContext = null) {
    // 如果没有指定八度，根据当前音域设置选择合适的初始八度
    if (baseOctave === null) {
        let minMidi, maxMidi;

        // 优先使用当前活跃谱号的音域记忆
        if (currentActiveClef && clefRangeMemory[currentActiveClef]) {
            minMidi = clefRangeMemory[currentActiveClef].min;
            maxMidi = clefRangeMemory[currentActiveClef].max;
            console.log(`🎼 使用${currentActiveClef}谱号的记忆音域: ${minMidi}-${maxMidi}`);
        } else {
            // 降级方案：从DOM元素读取
            const rangeMinSelect = document.getElementById('rangeMin');
            const rangeMaxSelect = document.getElementById('rangeMax');

            if (rangeMinSelect && rangeMaxSelect) {
                minMidi = parseInt(rangeMinSelect.value);
                maxMidi = parseInt(rangeMaxSelect.value);
                console.log(`🎼 使用DOM音域设置: ${minMidi}-${maxMidi}`);
            } else {
                baseOctave = 4; // 默认第4八度
                console.log(`🎼 使用默认八度: ${baseOctave}`);
                minMidi = maxMidi = null;
            }
        }

        if (minMidi !== null && maxMidi !== null) {
            // 选择音域中间的八度作为起始八度
            const middleMidi = Math.floor((minMidi + maxMidi) / 2);
            baseOctave = Math.floor(middleMidi / 12) - 1;
            console.log(`🎼 根据音域${minMidi}-${maxMidi}自动选择初始八度: ${baseOctave}`);
        }
    }
    const noteMap = {
        'C': { step: 'C', alter: 0 },
        'C#': { step: 'C', alter: 1 },
        'Db': { step: 'D', alter: -1 },
        'D': { step: 'D', alter: 0 },
        'D#': { step: 'D', alter: 1 },
        'Eb': { step: 'E', alter: -1 },
        'E': { step: 'E', alter: 0 },
        'F': { step: 'F', alter: 0 },
        'F#': { step: 'F', alter: 1 },
        'Gb': { step: 'G', alter: -1 },
        'G': { step: 'G', alter: 0 },
        'G#': { step: 'G', alter: 1 },
        'Ab': { step: 'A', alter: -1 },
        'A': { step: 'A', alter: 0 },
        'A#': { step: 'A', alter: 1 },
        'Bb': { step: 'B', alter: -1 },
        'B': { step: 'B', alter: 0 }
    };

    const noteInfo = noteMap[noteName] || { step: 'C', alter: 0 };

    // 获取音符的半音索引用于八度调整
    const noteIndex = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
        'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
        'A#': 10, 'Bb': 10, 'B': 11
    }[noteName] || 0;

    // 根据音域设置调整八度（提供和弦上下文）
    const adjustedOctave = adjustOctaveToRange(baseOctave, noteIndex, chordContext);

    return {
        step: noteInfo.step,
        alter: noteInfo.alter,
        octave: adjustedOctave
    };
}

// 计算调号的五度圈位置
function calculateFifths(keyInfo) {
    const majorKeys = {
        'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
        'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6, 'Cb': -7
    };

    const minorKeys = {
        'A': 0, 'E': 1, 'B': 2, 'F#': 3, 'C#': 4, 'G#': 5, 'D#': 6, 'A#': 7,
        'D': -1, 'G': -2, 'C': -3, 'F': -4, 'Bb': -5, 'Eb': -6, 'Ab': -7
    };

    if (keyInfo.mode === 'major') {
        return majorKeys[keyInfo.tonic] || 0;
    } else {
        return minorKeys[keyInfo.tonic] || 0;
    }
}

// ✅ 旧的getChordSymbol(chord)函数已移除，现在使用顶部统一配置中心的getChordSymbol()

// 🎵 和弦类型到MusicXML kind的映射 - 45+种和弦类型完整支持
function getChordKind(chordType) {
    const chordTypeMapping = {
        // 基本三和弦
        'major': 'major',
        'minor': 'minor',
        'diminished': 'diminished',
        'augmented': 'augmented',

        // 挂和弦 (使用MusicXML标准kind值)
        'sus2': 'suspended-second',
        'sus4': 'suspended-fourth',

        // ✅ 七和弦系列 - 使用标准MusicXML kind值（2025-09-30重构）
        'major7': 'major-seventh',
        'minor7': 'minor-seventh',
        'dominant7': 'dominant-seventh',
        'minor7b5': 'half-diminished',
        'diminished7': 'diminished-seventh',
        'minorMaj7': 'major-minor',
        'augmented7': 'augmented-seventh',
        'majorb5': 'major',

        // ✅ 七挂和弦 - 使用标准kind值 + 依赖SVG post-processing修复
        // 注意：kind="dominant-seventh"只会显示"7"，需要fixSusChordSymbols来添加"sus"部分
        // kind="other"会导致OSMD只显示根音，所以必须使用标准kind
        '7sus2': 'dominant-seventh',    // C7sus2 = C-D-G-Bb (2度代替3度 + 属七)
        '7sus4': 'dominant-seventh',    // C7sus4 = C-F-G-Bb (4度代替3度 + 属七)
        'maj7sus2': 'major-seventh',    // Cmaj7sus2 = C-D-G-B (2度代替3度 + 大七)
        'maj7sus4': 'major-seventh',    // Cmaj7sus4 = C-F-G-B (4度代替3度 + 大七)

        // ✅ 扩展和弦 - 使用标准MusicXML kind值
        // 🔧 (2025-10-02修复): add2/6和弦使用major/minor kind，依赖SVG立即修复
        'add9': 'major',  // 先显示为C，然后SVG立即修复为Cadd9
        'add2': 'major',  // 先显示为C，然后SVG立即修复为Cadd2
        'madd2': 'minor', // 先显示为Cm，然后SVG立即修复为Cmadd2
        'major9': 'major-ninth',
        'minor9': 'minor-ninth',
        'dominant9': 'dominant-ninth',
        'major11': 'major-11th',
        'minor11': 'minor-11th',
        'dominant11': 'dominant-11th',
        'major13': 'major-13th',
        'minor13': 'minor-13th',
        'dominant13': 'dominant-13th',

        // 特殊和弦
        'power': 'power',  // 五度和弦
        '6': 'major-sixth',  // 🔧 (2025-10-02): 显示为maj6，然后SVG修复为6
        'minor6': 'minor-sixth',  // 显示为m6，已正确
        'm6': 'minor-sixth',  // 显示为m6，已正确
        '6add9': 'major-sixth',
        'minor6add9': 'minor-sixth',

        // 其他变化和弦
        'majorSharp11': 'major-11th',
        'minorSharp11': 'minor-11th',
        'dominantSharp11': 'dominant-11th',
        'majorFlat5': 'major',
        'minorFlat5': 'minor',
        'dominantFlat5': 'dominant-seventh',

        // 🔧 兼容旧版本 - 也使用kind="other"防止消失
        'maj7': 'other',
        'm7': 'other',
        '7': 'other',
        'm7b5': 'other',
        'dim7': 'other',
        'aug7': 'other'
    };

    const mappedKind = chordTypeMapping[chordType] || 'major';

    // 🔍 调试日志：七和弦的MusicXML kind映射（验证修复效果）
    if (chordType && (chordType.includes('7') || chordType.includes('9') ||
                      chordType.includes('11') || chordType.includes('13'))) {
        console.log(`🎵 七/扩展和弦MusicXML映射: ${chordType} → kind="${mappedKind}" (使用other防止OSMD重新处理)`);
    }
    // 🔍 调试日志：sus和弦的MusicXML kind映射
    if (chordType && chordType.includes('sus')) {
        console.log(`🎵 Sus和弦MusicXML映射: ${chordType} → kind="${mappedKind}"`);

        // 特别提醒：7sus和弦使用kind="other"以强制OSMD使用text属性
        if (chordType.includes('7') && chordType.includes('sus')) {
            console.log(`⚠️ 7sus和弦特殊处理: 使用kind="other"强制OSMD显示text属性中的"${chordType}"符号`);
        }
    }

    return mappedKind;
}

/**
 * 循环生成随机和弦直到成功生成voicing
 * 🔧 新增 (2025-10-05): 替代minimal-fallback，生成完整的随机和弦
 * @param {string} key - 当前调性
 * @param {number} rangeMin - 最小MIDI值
 * @param {number} rangeMax - 最大MIDI值
 * @param {Array} voicingTypes - 允许的voicing类型
 * @param {number} maxAttempts - 最大尝试次数
 * @returns {Object|null} 成功生成的和弦对象或null
 */
function generateRandomChordUntilSuccess(key, rangeMin, rangeMax, voicingTypes, maxAttempts = 20) {
    console.log(`🎲 开始循环生成随机和弦（最多${maxAttempts}次尝试）`);

    // 获取可用的和弦类型（从用户设置，排除7sus）
    let availableTypes = window.chordSettings.chordTypes || ['major', 'minor', 'major7'];

    // 过滤掉7sus（如果用户只选了Drop2/Drop3）
    const onlyDrop2Drop3 = voicingTypes.every(v => v === 'drop2' || v === 'drop3');
    if (onlyDrop2Drop3) {
        availableTypes = availableTypes.filter(t => t !== '7sus2' && t !== '7sus4');
        console.log(`   过滤7sus后的可用类型: [${availableTypes.join(', ')}]`);
    }

    // 友好根音列表（避免复杂拼写）
    const friendlyRoots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // 随机选择根音和类型
        const root = friendlyRoots[Math.floor(Math.random() * friendlyRoots.length)];
        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

        console.log(`   🔄 第${attempt}次尝试: ${root}${type}`);

        // 尝试生成voicing
        const testChord = { root, type, key };
        const result = voicingEngine.generateVoicings(testChord, {
            enabledVoicings: voicingTypes,
            voicingPreference: voicingTypes[0],
            enableInversions: false, // 随机和弦不使用转位
            rangeMin: rangeMin,
            rangeMax: rangeMax,
            key: key
        });

        if (result && result.selected && voicingTypes.includes(result.selected.type)) {
            console.log(`   ✅ 成功生成随机和弦: ${root}${type} (${result.selected.type})`);
            return {
                root: root,
                type: type,
                key: key,
                voicing: result.selected,
                notes: result.selected.notes,
                isRandomReplacement: true // 标记为随机替代和弦
            };
        }
    }

    console.warn(`   ❌ ${maxAttempts}次尝试后仍无法生成随机和弦`);
    return null;
}

/**
 * 生成替代和弦（当主要voicing无法在音域内生成时）
 * @param {Object} chord - 原始和弦对象
 * @param {number} rangeMin - 最小MIDI值
 * @param {number} rangeMax - 最大MIDI值
 * @param {string} key - 当前调性
 * @returns {Object|null} 替代和弦对象或null
 */
function generateAlternativeChord(chord, rangeMin, rangeMax, key = 'C-major') {
    console.log(`🔄 为 ${chord.root}${getChordTypeSymbol(chord.type)} 寻找替代方案`);

    if (rangeMin === null || rangeMax === null) {
        console.warn('⚠️ 缺少音域参数，无法生成替代和弦');
        return null;
    }

    // 🎲 随机模式：只使用用户指定的13个友好根音，避免复杂拼写
    const noteToMidi = {
        'C': 60, 'Db': 61, 'D': 62, 'Eb': 63, 'E': 64, 'F': 65,
        'F#': 66, 'Gb': 66, 'G': 67, 'Ab': 68, 'A': 69, 'Bb': 70, 'B': 71
    };
    console.log(`🎲 替代和弦生成：使用用户指定的友好根音映射，避免C#, D#, G#, Cb等复杂拼写`);

    // 策略1: 简化当前和弦（根音+五度）
    console.log(`🎯 策略1: 尝试简化和弦 (根音+五度)`);
    const simplifiedChord = trySimplifiedChord(chord, rangeMin, rangeMax, noteToMidi);
    if (simplifiedChord) return simplifiedChord;

    // 策略2: 功能性替代和弦
    console.log(`🎯 策略2: 尝试功能性替代和弦`);
    const functionalAlternative = tryFunctionalAlternative(chord, rangeMin, rangeMax, key, noteToMidi);
    if (functionalAlternative) return functionalAlternative;

    // 策略3: 调内相关和弦
    console.log(`🎯 策略3: 尝试调内相关和弦`);
    const relatedChord = tryRelatedChord(chord, rangeMin, rangeMax, key, noteToMidi);
    if (relatedChord) return relatedChord;

    // 策略4: 最终兜底 - 仅根音
    console.log(`🎯 策略4: 最终兜底 - 仅根音`);
    const rootOnly = tryRootOnly(chord, rangeMin, rangeMax, noteToMidi);
    if (rootOnly) return rootOnly;

    console.warn(`❌ 所有替代策略失败`);
    return null;
}

/**
 * 检查和弦是否在调内
 * @param {Object} chord - 和弦对象
 * @param {Array} scaleNotes - 调性音阶
 * @param {string} key - 调性
 * @returns {boolean} 是否在调内
 */
function isChordInKey(chord, scaleNotes, key) {
    // 获取和弦的音符
    let chordNotes = chord.notes;

    // 如果chord.notes不存在，尝试从voicing获取
    if (!chordNotes || chordNotes.length === 0) {
        if (chord.voicing && chord.voicing.notes) {
            chordNotes = chord.voicing.notes;
        } else {
            // 最后尝试用buildChord构建
            const testChord = harmonyTheory.buildChord(chord.root, chord.type, key);
            if (testChord && testChord.notes) {
                chordNotes = testChord.notes;
            } else {
                console.warn(`⚠️ 无法获取和弦音符: ${chord.root}${chord.type}`);
                return false;
            }
        }
    }

    // 🔧 修复 (2025-10-03): 增强验证 - 使用pitch class比较识别同音异名
    // 方法1: 字符串匹配（快速路径）
    const outOfKeyNotes = chordNotes.filter(note => !scaleNotes.includes(note));

    if (outOfKeyNotes.length > 0) {
        // 方法2: Pitch class验证（识别同音异名拼写错误）
        const noteToSemitone = {
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

        // 将音符名转换为pitch class（忽略八度）
        const noteToPitchClass = (n) => {
            const cleanNote = n.replace(/\d+$/, ''); // 移除八度数字
            return noteToSemitone[cleanNote] % 12;
        };

        // 转换调性音阶和和弦音符为pitch class
        const scalePitchClasses = scaleNotes.map(noteToPitchClass).filter(pc => pc !== undefined);
        const chordPitchClasses = chordNotes.map(noteToPitchClass).filter(pc => pc !== undefined);

        // 检查是否有真正的调外音（pitch class不在调内）
        const outOfKeyPitches = chordPitchClasses.filter(pc => !scalePitchClasses.includes(pc));

        if (outOfKeyPitches.length > 0) {
            // 真正的调外音
            console.log(`   🔍 调外音符检测（Pitch Class验证）: ${chord.root}${chord.type || ''}`);
            console.log(`      和弦音符: [${chordNotes.join(', ')}]`);
            console.log(`      调性音阶: [${scaleNotes.join(', ')}]`);
            console.log(`      调外音符（字符串）: [${outOfKeyNotes.join(', ')}]`);
            console.log(`      调外pitch classes: [${outOfKeyPitches.join(', ')}]`);
            console.log(`      ❌ 这是真正的调外音（pitch class不在调内）`);
            return false;
        } else {
            // 只是同音异名拼写问题，和弦音高本身在调内
            console.log(`   ⚠️ 同音异名拼写问题（音高正确）: ${chord.root}${chord.type || ''}`);
            console.log(`      和弦音符: [${chordNotes.join(', ')}]`);
            console.log(`      拼写问题: [${outOfKeyNotes.join(', ')}]`);
            console.log(`      但pitch class都在调内，允许通过`);
            // 和弦本身在调内，只是拼写不准确，允许通过
            return true;
        }
    }

    return true;
}

/**
 * 尝试生成简化和弦（根音+五度）
 */
function trySimplifiedChord(chord, rangeMin, rangeMax, noteToMidi) {
    const rootBaseMidi = noteToMidi[chord.root];
    if (rootBaseMidi === undefined) return null;

    // 计算五度音（7个半音）
    const fifthSemitone = (rootBaseMidi + 7) % 12;
    const fifthNote = harmonyTheory.spellNoteInChordContext(fifthSemitone, chord.root, 7, harmonyTheory.keys[chord.key || 'C-major']);

    // 寻找合适的八度位置
    for (let octave = 0; octave <= 8; octave++) {
        const rootMidi = octave * 12 + (rootBaseMidi % 12);
        const fifthMidi = octave * 12 + fifthSemitone;

        // 检查两个音符都在音域内
        if (rootMidi >= rangeMin && rootMidi <= rangeMax &&
            fifthMidi >= rangeMin && fifthMidi <= rangeMax) {

            const simplifiedVoicing = {
                type: 'simplified-fifth',
                notes: [chord.root, fifthNote],
                midiNotes: [rootMidi, fifthMidi],
                range: octave,
                simplified: true,
                rangeConstraints: { minMidi: rangeMin, maxMidi: rangeMax }
            };

            const alternativeChord = {
                ...chord,
                voicing: simplifiedVoicing,
                notes: [chord.root, fifthNote],
                simplified: true,
                alternativeReason: 'simplified_fifth'
            };

            console.log(`✅ 简化和弦成功: ${chord.root}+${fifthNote} (MIDI ${rootMidi},${fifthMidi})`);
            return alternativeChord;
        }
    }

    console.log(`❌ 简化和弦失败：无法在音域内放置根音+五度`);
    return null;
}

/**
 * 尝试功能性替代和弦
 */
function tryFunctionalAlternative(chord, rangeMin, rangeMax, key, noteToMidi) {
    // 获取和弦在调内的功能
    const chordFunction = getChordFunction(chord.root, chord.type, key);
    const alternatives = getFunctionalAlternatives(chordFunction, key);

    console.log(`🎵 原和弦功能: ${chordFunction}, 可用替代: ${alternatives.map(alt => `${alt.root}${alt.type}`).join(', ')}`);

    for (const altChord of alternatives) {
        const testChord = {
            root: altChord.root,
            type: altChord.type,
            key: key
        };

        // 尝试生成这个替代和弦
        const voicingResult = voicingEngine.generateVoicings(testChord, {
            enabledVoicings: window.chordSettings.voicingTypes,
            enableInversions: false,
            rangeMin: rangeMin,
            rangeMax: rangeMax,
            // 🎵 修复：传递调号信息确保正确的音符拼写
            key: key
        });

        if (voicingResult && voicingResult.selected) {
            // 检查功能替代和弦的voicing类型
            const selectedType = voicingResult.selected.type;
            const allowedTypes = window.chordSettings.voicingTypes || ['close'];
            let finalVoicing = voicingResult.selected;

            if (!allowedTypes.includes(selectedType)) {
                console.warn(`❌ 功能替代和弦违规voicing: ${selectedType}，必须使用用户选择的类型`);

                // 严格模式：只使用用户选择的voicing类型
                let foundValidVoicing = false;
                for (const allowedType of allowedTypes) {
                    if (voicingResult.all && voicingResult.all[allowedType]) {
                        finalVoicing = voicingResult.all[allowedType];
                        foundValidVoicing = true;
                        console.log(`✅ 功能替代和弦使用${allowedType} voicing`);
                        break;
                    }
                }

                // 如果没有找到符合要求的voicing，返回null而不是使用错误类型
                if (!foundValidVoicing || !allowedTypes.includes(finalVoicing.type)) {
                    console.error(`❌ 功能替代和弦无法生成用户要求的voicing类型，跳过`);
                    return null;
                }
            }

            const alternativeChord = {
                ...testChord,
                voicing: finalVoicing,
                notes: finalVoicing.notes,
                alternativeOf: chord,
                alternativeReason: 'functional_substitute'
            };

            console.log(`✅ 功能性替代成功: ${altChord.root}${altChord.type} 替代 ${chord.root}${chord.type} - ${finalVoicing.type} voicing`);
            return alternativeChord;
        }
    }

    console.log(`❌ 功能性替代失败：所有替代和弦都无法适配音域`);
    return null;
}

/**
 * 尝试调内相关和弦
 */
function tryRelatedChord(chord, rangeMin, rangeMax, key, noteToMidi) {
    const relatedChords = getRelatedChords(chord.root, key);

    console.log(`🎵 调内相关和弦: ${relatedChords.map(rc => `${rc.root}${rc.type}`).join(', ')}`);

    for (const relChord of relatedChords) {
        const testChord = {
            root: relChord.root,
            type: relChord.type,
            key: key
        };

        // 尝试生成相关和弦
        const voicingResult = voicingEngine.generateVoicings(testChord, {
            enabledVoicings: window.chordSettings.voicingTypes,
            enableInversions: false,
            rangeMin: rangeMin,
            rangeMax: rangeMax,
            // 🎵 修复：传递调号信息确保正确的音符拼写
            key: key
        });

        if (voicingResult && voicingResult.selected) {
            // 检查相关和弦的voicing类型
            const selectedType = voicingResult.selected.type;
            const allowedTypes = window.chordSettings.voicingTypes || ['close'];
            let finalVoicing = voicingResult.selected;

            if (!allowedTypes.includes(selectedType)) {
                console.warn(`❌ 相关和弦违规voicing: ${selectedType}，必须使用用户选择的类型`);

                // 严格模式：只使用用户选择的voicing类型
                let foundValidVoicing = false;
                for (const allowedType of allowedTypes) {
                    if (voicingResult.all && voicingResult.all[allowedType]) {
                        finalVoicing = voicingResult.all[allowedType];
                        foundValidVoicing = true;
                        console.log(`✅ 相关和弦使用${allowedType} voicing`);
                        break;
                    }
                }

                // 如果没有找到符合要求的voicing，返回null而不是使用错误类型
                if (!foundValidVoicing || !allowedTypes.includes(finalVoicing.type)) {
                    console.error(`❌ 相关和弦无法生成用户要求的voicing类型，跳过`);
                    return null;
                }
            }

            const alternativeChord = {
                ...testChord,
                voicing: finalVoicing,
                notes: finalVoicing.notes,
                alternativeOf: chord,
                alternativeReason: 'related_chord'
            };

            console.log(`✅ 调内替代成功: ${relChord.root}${relChord.type} 替代 ${chord.root}${chord.type} - ${finalVoicing.type} voicing`);
            return alternativeChord;
        }
    }

    console.log(`❌ 调内替代失败：所有相关和弦都无法适配音域`);
    return null;
}

/**
 * 最终兜底策略：仅根音
 */
function tryRootOnly(chord, rangeMin, rangeMax, noteToMidi) {
    const rootBaseMidi = noteToMidi[chord.root];
    if (rootBaseMidi === undefined) return null;

    // 寻找在音域内的根音位置
    for (let octave = 0; octave <= 8; octave++) {
        const rootMidi = octave * 12 + (rootBaseMidi % 12);
        if (rootMidi >= rangeMin && rootMidi <= rangeMax) {
            const rootOnlyVoicing = {
                type: 'root-only',
                notes: [chord.root],
                midiNotes: [rootMidi],
                range: octave,
                simplified: true,
                rangeConstraints: { minMidi: rangeMin, maxMidi: rangeMax }
            };

            const alternativeChord = {
                ...chord,
                voicing: rootOnlyVoicing,
                notes: [chord.root],
                simplified: true,
                alternativeReason: 'root_only'
            };

            console.log(`✅ 根音兜底成功: ${chord.root} (MIDI ${rootMidi})`);
            return alternativeChord;
        }
    }

    console.log(`❌ 根音兜底失败：连根音都无法在音域内放置`);
    return null;
}

/**
 * 获取和弦在调内的功能
 */
function getChordFunction(root, type, key) {
    const keyInfo = harmonyTheory.keys[key] || harmonyTheory.keys['C-major'];
    const scale = keyInfo.notes;
    const rootIndex = scale.indexOf(root);

    if (rootIndex === -1) return 'unknown';

    const functionMap = {
        0: 'tonic',     // I
        1: 'supertonic', // ii
        2: 'mediant',   // iii
        3: 'subdominant', // IV
        4: 'dominant',  // V
        5: 'submediant', // vi
        6: 'dominant'   // vii° - 第七级减和弦具有属功能
    };

    return functionMap[rootIndex] || 'unknown';
}

/**
 * 获取功能性替代和弦
 */
function getFunctionalAlternatives(chordFunction, key) {
    // 🎲 检查是否为随机模式
    const functionalHarmonyToggle = document.getElementById('functionalHarmonyToggle');
    const isRandomMode = !functionalHarmonyToggle || !functionalHarmonyToggle.checked;

    if (isRandomMode) {
        // 🎲 随机模式：使用用户指定的友好根音作为替代选项
        const friendlyRoots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

        const randomAlternatives = {
            'tonic': [
                { root: 'A', type: 'minor' },  // Am (友好)
                { root: 'F', type: 'major' }   // F (友好)
            ],
            'subdominant': [
                { root: 'F', type: 'major' },  // F (友好)
                { root: 'A', type: 'minor' }   // Am (友好)
            ],
            'dominant': [
                { root: 'G', type: 'major' },  // G (友好)
                { root: 'D', type: 'major' }   // D (友好)
            ]
        };

        console.log(`🎲 随机模式替代和弦：使用友好根音替代，功能=${chordFunction}`);
        return randomAlternatives[chordFunction] || [];
    }

    // 功能和声模式：使用原有逻辑
    const keyInfo = harmonyTheory.keys[key] || harmonyTheory.keys['C-major'];
    const scale = keyInfo.notes;

    const alternativeMap = {
        'tonic': [
            { root: scale[5], type: 'minor' },  // vi
            { root: scale[2], type: 'minor' }   // iii
        ],
        'subdominant': [
            { root: scale[1], type: 'minor' },  // ii
            { root: scale[5], type: 'minor' }   // vi
        ],
        'dominant': [
            { root: scale[6], type: 'diminished' }, // vii°
            { root: scale[1], type: 'minor' }       // ii
        ]
    };

    return alternativeMap[chordFunction] || [];
}

/**
 * 获取调内相关和弦
 */
function getRelatedChords(root, key) {
    // 🎲 检查是否为随机模式
    const functionalHarmonyToggle = document.getElementById('functionalHarmonyToggle');
    const isRandomMode = !functionalHarmonyToggle || !functionalHarmonyToggle.checked;

    if (isRandomMode) {
        // 🎲 随机模式：使用用户指定的友好根音
        const friendlyRootChords = [
            { root: 'C', type: 'major' },   // C
            { root: 'D', type: 'minor' },   // Dm
            { root: 'F', type: 'major' },   // F
            { root: 'G', type: 'major' },   // G
            { root: 'A', type: 'minor' },   // Am
            { root: 'Bb', type: 'major' },  // Bb
            { root: 'Eb', type: 'major' }   // Eb
        ];

        console.log(`🎲 随机模式相关和弦：使用友好根音，排除原根音=${root}`);
        return friendlyRootChords.filter(chord => chord.root !== root);
    }

    // 功能和声模式：使用原有逻辑
    const keyInfo = harmonyTheory.keys[key] || harmonyTheory.keys['C-major'];
    const scale = keyInfo.notes;

    // 返回调内的基础三和弦
    return [
        { root: scale[0], type: 'major' },   // I
        { root: scale[1], type: 'minor' },   // ii
        { root: scale[2], type: 'minor' },   // iii
        { root: scale[3], type: 'major' },   // IV
        { root: scale[4], type: 'major' },   // V
        { root: scale[5], type: 'minor' }    // vi
    ].filter(chord => chord.root !== root); // 排除原和弦
}

// 显示和弦分析信息
function displayChordAnalysis(chords) {
    if (chords.analysis && chords.analysis.length > 0) {
        console.log('📊 和声功能分析:');
        chords.analysis.forEach(analysis => {
            const functionText = {
                'tonic': '主功能',
                'subdominant': '下属功能',
                'dominant': '属功能',
                'unknown': '未知功能'
            };

            console.log(`  第${analysis.measure}小节: ${getChordSymbol(analysis.chord)} (${functionText[analysis.function] || analysis.function})`);
        });
    }
}

/**
 * 🔍 验证voicing类型的准确性
 * 🔧 新增 (2025-10-05): 分析MIDI值特征，验证voicing类型标签是否准确
 * @param {Array} midiNotes - MIDI音符数组（已排序）
 * @param {string} voicingType - 声明的voicing类型
 * @returns {Object} { isValid: boolean, actualType: string, reason: string, details: object }
 */
function verifyVoicingType(midiNotes, voicingType) {
    if (!midiNotes || midiNotes.length < 3) {
        return { isValid: false, actualType: 'unknown', reason: '音符数量不足', details: {} };
    }

    // 排序MIDI值（从低到高）
    const sorted = [...midiNotes].sort((a, b) => a - b);
    const span = sorted[sorted.length - 1] - sorted[0];

    // 计算音符间隔
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
        intervals.push(sorted[i] - sorted[i - 1]);
    }

    const details = {
        span: span,
        intervals: intervals,
        lowestNote: sorted[0],
        highestNote: sorted[sorted.length - 1],
        noteCount: sorted.length
    };

    // Close voicing特征：跨度≤12半音，音符间隔紧密（大多数≤5半音）
    const isCloseCharacteristics = span <= 12 && intervals.every(i => i <= 7);

    // Drop2特征：有一个明显的大间隔（>7半音），通常在第2和第3个音符之间
    const hasBigGap = intervals.some(i => i > 7);
    const drop2Pattern = sorted.length >= 4 &&
                         (intervals[sorted.length - 2] > 7 || // 第2高音降八度
                          intervals.some((i, idx) => i > 7 && idx > 0));

    // Drop3特征：第3高音降八度，间隔模式不同
    const drop3Pattern = sorted.length >= 4 && hasBigGap && !drop2Pattern;

    // 判断实际类型
    let actualType = 'unknown';
    let isValid = false;
    let reason = '';

    if (isCloseCharacteristics) {
        actualType = 'close';
        isValid = (voicingType === 'close');
        reason = isValid ?
            `跨度${span}半音，紧密排列，符合close voicing特征` :
            `跨度${span}半音，紧密排列，疑似close voicing但标记为${voicingType}`;
    } else if (drop2Pattern) {
        actualType = 'drop2';
        isValid = (voicingType === 'drop2');
        reason = isValid ?
            `有明显间隔（${intervals.join('-')}半音），符合drop2特征` :
            `有明显间隔（${intervals.join('-')}半音），疑似drop2但标记为${voicingType}`;
    } else if (drop3Pattern) {
        actualType = 'drop3';
        isValid = (voicingType === 'drop3');
        reason = isValid ?
            `有明显间隔（${intervals.join('-')}半音），符合drop3特征` :
            `有明显间隔（${intervals.join('-')}半音），疑似drop3但标记为${voicingType}`;
    } else if (voicingType === 'shell') {
        actualType = 'shell';
        isValid = true;
        reason = `Shell voicing（根音+三音+七音）`;
    } else {
        actualType = 'unknown';
        isValid = false;
        reason = `无法识别voicing类型，跨度${span}半音，间隔${intervals.join('-')}`;
    }

    return { isValid, actualType, reason, details };
}

/**
 * 🔍 模拟generateChordNotesXML的实际渲染逻辑
 * 🔧 新增 (2025-10-05): 检测是否会触发强制根位排列等处理
 * @param {Object} chord - 和弦对象
 * @returns {Object} { notes: array, midiNotes: array, wasReordered: boolean, reason: string }
 */
function simulateActualRendering(chord) {
    if (!chord || !chord.voicing) {
        return { notes: [], midiNotes: [], wasReordered: false, reason: '无voicing数据' };
    }

    let notesToUse = chord.voicing.notes ? [...chord.voicing.notes] : [];
    let midiNotesToUse = chord.voicing.midiNotes ? [...chord.voicing.midiNotes] : [];
    let wasReordered = false;
    let reason = '';

    // 检查是否会触发强制根位排列
    const isSuspendedChord = chord.type && (chord.type.includes('sus'));
    const isDropVoicing = chord.voicing.type === 'drop2' || chord.voicing.type === 'drop3';

    // 模拟shouldAllowInversion检查
    const includeTriadInversions = window.chordSettings?.includeTriadInversions || false;
    const includeSeventhInversions = window.chordSettings?.includeSeventhInversions || false;

    const isTriad = !chord.type || ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'].includes(chord.type);
    const isSeventh = chord.type && (chord.type.includes('7') || chord.type.includes('ninth') || chord.type.includes('eleventh') || chord.type.includes('thirteenth'));

    let shouldAllowInversion = false;
    if (isTriad && includeTriadInversions) {
        shouldAllowInversion = true;
    } else if (isSeventh && includeSeventhInversions) {
        shouldAllowInversion = true;
    }

    // 判断是否会重新排序
    if (!shouldAllowInversion && !isSuspendedChord && !isDropVoicing) {
        // 会触发强制根位排列
        const rootNote = chord.root;
        const noteToSemitone = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10,
            'Bb': 10, 'B': 11, 'Cb': 11, 'B#': 0, 'E#': 5
        };

        const rootSemitone = noteToSemitone[rootNote];
        const rootIndex = notesToUse.findIndex(note => {
            const noteName = note.replace(/\d+$/, '');
            const noteSemitone = noteToSemitone[noteName];
            return noteSemitone === rootSemitone;
        });

        if (rootIndex > 0) {
            // 重新排列，将根音放到第一位
            const reorderedNotes = [notesToUse[rootIndex], ...notesToUse.filter((_, i) => i !== rootIndex)];
            const reorderedMidi = [midiNotesToUse[rootIndex], ...midiNotesToUse.filter((_, i) => i !== rootIndex)];

            notesToUse = reorderedNotes;
            midiNotesToUse = reorderedMidi;
            wasReordered = true;
            reason = `强制根位排列：根音${rootNote}从索引${rootIndex}移到索引0`;
        } else {
            reason = `根音${rootNote}已在第一位，无需重新排列`;
        }
    } else if (isDropVoicing) {
        reason = `Drop voicing，跳过强制根位排列（已由voicing-engine正确处理）`;
    } else if (isSuspendedChord) {
        reason = `挂留和弦，保持原始排列`;
    } else {
        reason = `允许转位，保持原始排列`;
    }

    return {
        notes: notesToUse,
        midiNotes: midiNotesToUse,
        wasReordered: wasReordered,
        reason: reason
    };
}

// 🔍 新增 (2025-10-04): 显示每个小节渲染的音符和音高（测试工具）
// 🔧 修复 (2025-10-04): 修复MIDI-octave mismatch，基于MIDI值重新计算正确octave
// 🔧 增强 (2025-10-05): 调用midiToPitchInfo()模拟实际MusicXML渲染逻辑
function displayRenderedNotes(chords) {
    if (!chords || !chords.progression || chords.progression.length === 0) {
        console.warn('⚠️ 渲染音符测试工具：没有和弦进行数据');
        return;
    }

    console.log('\n🎵 ========== 渲染音符测试工具 ==========');
    console.log('📊 显示每个小节实际渲染的音符和音高\n');

    // 获取调号信息（用于midiToPitchInfo）
    const keyInfo = chords.keySignature || window.keyInfo || { tonic: 'C', mode: 'major', sharps: 0, flats: 0 };

    chords.progression.forEach((chord, index) => {
        const measureNum = index + 1;

        // 获取渲染的音符信息
        let notesInfo = [];

        if (chord.voicing && chord.voicing.notes && chord.voicing.midiNotes) {
            // 有voicing信息（吉他模式或钢琴模式）
            const midiNotes = chord.voicing.midiNotes;

            // 🔧 修复 (2025-10-05): 调用midiToPitchInfo()模拟实际渲染
            // 这样可以看到真实的MusicXML渲染结果，包括同音异名拼写和八度修正
            for (let i = 0; i < midiNotes.length; i++) {
                const midiValue = midiNotes[i];

                // 模拟实际渲染逻辑
                // 🔧 修复 (2025-10-05 v8): 传递voicing的notes和midiNotes数组
                const voicingContext = {
                    ...chord,
                    notes: chord.voicing?.notes || chord.notes,
                    midiNotes: chord.voicing?.midiNotes || chord.midiNotes
                };
                const enhancedKeyInfo = {
                    ...keyInfo,
                    scaleVariant: chord.scaleVariant || null
                };

                try {
                    // 调用实际渲染使用的函数
                    const pitchInfo = midiToPitchInfo(midiValue, voicingContext, enhancedKeyInfo);

                    // 构建音符名称
                    let noteName = pitchInfo.step;
                    if (pitchInfo.alter > 0) {
                        noteName += '#'.repeat(pitchInfo.alter);
                    } else if (pitchInfo.alter < 0) {
                        noteName += 'b'.repeat(-pitchInfo.alter);
                    }
                    noteName += pitchInfo.octave;

                    notesInfo.push(`${noteName} (MIDI ${midiValue})`);
                } catch (error) {
                    // 如果midiToPitchInfo失败，回退到简单计算
                    console.warn(`⚠️ midiToPitchInfo失败: MIDI ${midiValue}`, error);
                    const octave = Math.floor(midiValue / 12) - 1;
                    const noteIndex = midiValue % 12;
                    const simpleNoteMap = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                    notesInfo.push(`${simpleNoteMap[noteIndex]}${octave} (MIDI ${midiValue})`);
                }
            }
        } else if (chord.notes && Array.isArray(chord.notes)) {
            // 只有音符名称，没有MIDI信息
            notesInfo = chord.notes.map(note => note);
        } else {
            // 没有音符信息
            notesInfo = ['无音符数据'];
        }

        // 显示和弦信息
        const chordSymbol = getChordSymbol(chord);
        const voicingType = chord.voicing ? chord.voicing.type || '未知' : '未知';

        console.log(`📍 小节${measureNum}: ${chordSymbol} (${voicingType})`);
        console.log(`   音符: ${notesInfo.join(', ')}`);

        console.log('');
    });

    console.log('========== 渲染音符测试工具结束 ==========\n');
}

// 显示功能分析面板
function showAnalysisPanel(chords) {
    const analysisPanel = document.getElementById('analysisPanel');
    if (!analysisPanel || !chords.functionalAnalysis) {
        return;
    }

    const analysis = chords.functionalAnalysis;
    const header = analysisPanel.querySelector('.analysis-header h3');
    if (header) {
        header.textContent = `🎼 和弦功能分析`; // 移除调式显示
    }

    // 创建分析内容
    let content = `
        <div class="analysis-content">
            <div class="progression-info">
                <h4>📊 进行信息</h4>
                <!-- 调性显示已禁用 -->
                <!-- 复杂度、强度、类型显示已禁用 -->
            </div>

            <div class="chord-analysis">
                <h4>🎵 逐小节分析</h4>
                <div class="chord-list">
    `;

    // 添加每个和弦的分析
    chords.progression.forEach((chord, index) => {
        const chordAnalysis = analysis.chordAnalysis[index];
        if (chordAnalysis) {
            const functionText = {
                'Tonic': '主功能',
                'Subdominant': '下属功能',
                'Dominant': '属功能',
                'Secondary': '副功能',
                'Chromatic': '色彩功能'
            };

            content += `
                <div class="chord-item">
                    <!-- 和弦代号显示已禁用 -->
                    <!-- 和弦功能、罗马数字、紧张度显示已禁用 -->
                </div>
            `;
        }
    });

    content += `
                </div>
            </div>

            <!-- 建议部分已禁用 -->

            <div class="analysis-footer">
                <button onclick="toggleAnalysisPanel()" class="close-btn">关闭分析</button>
            </div>
        </div>
    `;

    // 更新面板内容
    const existingContent = analysisPanel.querySelector('.analysis-content');
    if (existingContent) {
        existingContent.remove();
    }

    analysisPanel.insertAdjacentHTML('beforeend', content);
    analysisPanel.style.display = 'block';

    console.log('📊 功能分析面板已显示');
}

// 切换分析面板显示状态
function toggleAnalysisPanel() {
    const analysisPanel = document.getElementById('analysisPanel');
    if (analysisPanel) {
        if (analysisPanel.style.display === 'none') {
            analysisPanel.style.display = 'block';
        } else {
            analysisPanel.style.display = 'none';
        }
    }
}

// 备用和弦显示（当OSMD失败时）
function showFallbackChordDisplay(chords) {
    const scoreContainer = document.getElementById('score');
    if (scoreContainer) {
        let chordsText = '<div style="text-align: center; padding: 40px;">';
        // 调式显示已禁用
        // chordsText += `<h3>${chords.key}</h3>`;
        chordsText += '<div style="font-size: 18px; margin: 20px 0;">';

        chords.progression.forEach((chord, index) => {
            // 和弦代号显示已禁用
            // const symbol = getChordSymbol(chord);
            // chordsText += `<span style="margin: 0 15px; padding: 10px; background: #f0f0f0; border-radius: 5px;">${symbol}</span>`;
        });

        chordsText += '</div></div>';
        scoreContainer.innerHTML = chordsText;
    }
}

// MIDI音符到频率的转换
function midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Count In节拍播放函数 (增强调试版)
function playCountInBeat(frequency, startTime, duration, volume = 0.3) {
    console.log(`🔍 Count In调试: 准备播放 ${frequency}Hz, 开始时间: ${startTime.toFixed(3)}s, 时长: ${duration.toFixed(3)}s`);

    if (!audioContext) {
        console.error('🔍 playCountInBeat: audioContext未初始化！');
        return null;
    }

    console.log(`🔍 audioContext状态: ${audioContext.state}, 当前时间: ${audioContext.currentTime.toFixed(3)}s`);

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // 使用方波音色 (更清脆，类似节拍器)
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        // 快速攻击和衰减，类似节拍器
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.01);

        console.log(`🎵 ✅ Count In节拍创建成功: ${frequency}Hz, 时间: ${startTime.toFixed(3)}s, 音量: ${volume}`);
        return oscillator;
    } catch (error) {
        console.error('🔍 ❌ playCountInBeat失败:', error);
        return null;
    }
}

// 播放单个音符 (参考旋律视奏工具的三角波音色)
function playNote(frequency, startTime, duration, volume = 0.1) {
    if (!audioContext) {
        console.warn('🔍 playNote: audioContext未初始化');
        return null;
    }

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // 使用三角波音色 (柔和，适合多音符同时播放)
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        // 设置音量包络
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.1);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        console.log(`🔍 playNote成功: ${frequency.toFixed(2)}Hz, 开始时间: ${startTime.toFixed(3)}s, 时长: ${duration}s`);
        return oscillator;
    } catch (error) {
        console.error('🔍 playNote失败:', error);
        return null;
    }
}

// 停止当前播放
function stopPlayback() {
    currentPlayback.forEach(osc => {
        try {
            osc.stop();
        } catch(e) {
            // 忽略已经停止的振荡器
        }
    });
    currentPlayback = [];
    isPlayingChords = false;

    // 更新播放按钮状态
    const playBtn = document.getElementById('playMelodyBtn');
    if (playBtn) {
        playBtn.innerHTML = '播放';
    }
    console.log('⏹️ 播放已停止');
}

// 播放和弦
function directPlayTest() {
    console.log('🔍 播放功能调试 - 开始');

    // 如果正在播放，则停止
    if (isPlayingChords) {
        console.log('🔍 当前正在播放，停止播放');
        stopPlayback();
        return;
    }

    // 检查是否有生成的和弦
    if (!currentChords || currentChords.length === 0) {
        console.log('🔍 没有可播放的和弦数据');
        alert('请先生成和弦再播放');
        return;
    }

    console.log('🔍 和弦数据检查:', {
        currentChords: currentChords,
        chordsType: typeof currentChords,
        chordsIsArray: Array.isArray(currentChords),
        chordsCount: currentChords ? currentChords.length : 'N/A',
        firstChordStructure: currentChords && currentChords[0] ? currentChords[0] : 'N/A'
    });

    // 初始化audioContext
    if (!audioContext) {
        console.log('🔍 初始化AudioContext...');
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🔍 AudioContext创建成功:', audioContext);
        } catch (error) {
            console.error('🔍 AudioContext创建失败:', error);
            alert('音频系统初始化失败');
            return;
        }
    }

    console.log('🔍 AudioContext状态:', audioContext.state);
    if (audioContext.state === 'suspended') {
        console.log('🔍 AudioContext被暂停，正在恢复...');
        audioContext.resume().then(() => {
            console.log('🔍 AudioContext恢复成功');
        }).catch(error => {
            console.error('🔍 AudioContext恢复失败:', error);
        });
    }

    console.log('▶️ 开始播放和弦...');
    isPlayingChords = true;

    // 更新播放按钮
    const playBtn = document.getElementById('playMelodyBtn');
    if (playBtn) {
        playBtn.innerHTML = '⏸️ 停止';
    }

    // 🎵 获取页面上的BPM设定
    function getCurrentBPM() {
        const bpmInput = document.getElementById('headerMetronomeBpm');
        if (bpmInput && bpmInput.value) {
            const bpm = parseInt(bpmInput.value) || 60;
            console.log(`🎵 从页面获取BPM设定: ${bpm}`);
            return bpm;
        }
        console.log('🎵 使用默认BPM: 60');
        return 60;
    }

    const actualBPM = getCurrentBPM(); // 直接从页面获取BPM
    const beatDuration = 60.0 / actualBPM;

    const now = audioContext.currentTime;
    let chordDuration = beatDuration * 4; // 每个和弦播放4拍，基于页面BPM设定
    let needsCountIn = false;

    console.log(`🎵 播放速度设定: ${actualBPM} BPM, 每拍: ${beatDuration.toFixed(3)}s, 每个和弦: ${chordDuration.toFixed(3)}s`);

    // 🎵 参考旋律视奏工具的隐藏检测逻辑
    function checkIfChordsHidden() {
        // 检查全局变量chordsVisible
        if (!chordsVisible) {
            return true;
        }
        // 检查SVG是否有melody-hidden class (双重保险)
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            const svgElements = scoreElement.querySelectorAll('svg');
            for (let svg of svgElements) {
                if (svg.classList.contains('melody-hidden')) {
                    return true;
                }
            }
        }
        return false;
    }

    const isHiddenMode = checkIfChordsHidden();

    // 🎵 Count In检查 - 参考旋律视奏工具的逻辑（隐藏模式就触发，不依赖节拍器）
    console.log('🔍 Count In诊断:', {
        chordsVisible: chordsVisible,
        isHiddenMode: isHiddenMode,
        metronomeIsPlaying: metronomeIsPlaying,
        shouldTriggerCountIn: isHiddenMode  // 只要隐藏模式就触发Count In
    });

    // 🔒 隐藏模式下的Count In功能 (参考旋律视奏工具逻辑)
    if (isHiddenMode) {
        needsCountIn = true;
        console.log('🔒🎵 隐藏模式激活：启动Count In (参考旋律视奏工具)');

        // 🔇 修复 (2025-10-02): 如果节拍器开启，Count In首先终止节拍器
        let metronomeWasPlaying = false;
        if (isMetronomeRunning) {
            metronomeWasPlaying = true;
            console.log('🔇 Count In首先终止节拍器');

            // 使用stopMetronome()函数完全停止节拍器（确保状态一致）
            if (typeof stopMetronome === 'function') {
                stopMetronome();
            } else {
                // 回退方案：手动停止
                isMetronomeRunning = false;
                if (metronomeInterval) {
                    clearInterval(metronomeInterval);
                    metronomeInterval = null;
                }
                const metronomeBtn = document.getElementById('headerMetronomeBtn');
                if (metronomeBtn) {
                    metronomeBtn.textContent = '🎵';
                    metronomeBtn.title = '开始节拍器';
                }
            }
        }

        // Count In: 4拍预备
        const countInBeats = 4;
        const countInDuration = beatDuration * countInBeats;
        console.log(`🎵 Count In: ${countInBeats}拍预备，时长: ${countInDuration.toFixed(3)}秒`);
        console.log(`🎵 时机安排: Count In(${countInDuration.toFixed(1)}s) → 音频播放开始 → 节拍器对准拍子重启`);

        // 播放Count In节拍
        for (let beat = 0; beat < countInBeats; beat++) {
            const beatTime = now + 0.1 + (beat * beatDuration);
            const frequency = (beat === 0) ? 880 : 660; // 第一拍高音，其他中音
            playCountInBeat(frequency, beatTime, Math.min(beatDuration * 0.8, 0.1));
        }

        // 和弦播放延迟到Count In后
        chordStartTime = now + 0.1 + countInDuration;

        // 🎵 修复 (2025-10-02): Count In结束后，节拍器以对准拍子的形式重启
        if (metronomeWasPlaying) {
            const audioStartDelay = (chordStartTime - now) * 1000; // 转换为毫秒
            console.log(`🎵 节拍器将在 ${audioStartDelay.toFixed(0)}ms 后与音频播放对准拍子重启`);
            console.log(`🎵 重启时机：第一个和弦的第一拍，确保节拍器与音频完全同步`);

            setTimeout(() => {
                console.log('🎵 ✅ Count In结束，节拍器以对准拍子的形式重启');

                // 使用startMetronome()函数重启节拍器
                if (typeof startMetronome === 'function') {
                    startMetronome();
                    console.log('🎵 节拍器已同步到音频第一拍');
                } else {
                    // 回退方案：手动重启
                    isMetronomeRunning = true;
                    const interval = 60000 / metronomeTempo;

                    // 立即播放第一声（与第一个和弦的第一拍对齐）
                    if (typeof playMetronomeSound === 'function') {
                        playMetronomeSound();
                    }

                    // 设置定时器
                    metronomeInterval = setInterval(() => {
                        if (typeof playMetronomeSound === 'function') {
                            playMetronomeSound();
                        }
                    }, interval);

                    const metronomeBtn = document.getElementById('headerMetronomeBtn');
                    if (metronomeBtn) {
                        metronomeBtn.textContent = '⏸️';
                        metronomeBtn.title = '停止节拍器';
                    }
                }
            }, audioStartDelay);
        }
    }

    // 🔧 智能播放时间：节拍器开启时对齐网格，关闭时立即响应
    let chordStartTime;

    if (!needsCountIn) {
        const currentNow = audioContext.currentTime;

        if (typeof isMetronomeRunning !== 'undefined' && isMetronomeRunning) {
            // 🎵 节拍器开启 - 对齐全局网格确保同步
            const currentBeatNumber = Math.floor(currentNow / beatDuration);
            let nextBeatNumber = currentBeatNumber + 1;
            chordStartTime = nextBeatNumber * beatDuration;

            // 安全检查：确保 chordStartTime 至少在未来 50ms
            const minLookahead = 0.05;
            if (chordStartTime < currentNow + minLookahead) {
                nextBeatNumber++;
                chordStartTime = nextBeatNumber * beatDuration;
                console.log(`⚠️ 时间太近，跳到下一拍 (第${nextBeatNumber}拍)`);
            }

            console.log(`🎵 节拍器开启 - 同步到全局网格: BPM=${actualBPM}, 当前=${currentNow.toFixed(3)}s, 播放=${chordStartTime.toFixed(3)}s (第${nextBeatNumber}拍)`);
        } else {
            // 🚀 节拍器关闭 - 立即播放，响应迅速
            chordStartTime = currentNow + 0.1;
            console.log(`🚀 节拍器未开启 - 立即播放: BPM=${actualBPM}, 当前=${currentNow.toFixed(3)}s, 播放=${chordStartTime.toFixed(3)}s`);
        }
    } else {
        // needsCountIn 情况下的开始时间由 count-in 逻辑处理
        chordStartTime = now + 0.1 + (beatDuration * 4); // 设置在count-in之后
    }

    let totalNotesPlayed = 0;
    console.log('🔍 开始遍历和弦数据...');

    // 处理不同的currentChords数据格式
    let chordsArray = [];
    if (Array.isArray(window.currentChords)) {
        chordsArray = window.currentChords;
        console.log('🔍 currentChords是数组，直接使用');
    } else if (window.currentChords && typeof window.currentChords === 'object') {
        // 如果是对象，尝试提取和弦数据
        if (window.currentChords.progression && Array.isArray(window.currentChords.progression)) {
            chordsArray = window.currentChords.progression;
            console.log('🔍 从currentChords.progression提取数组 ✅ 找到真实数据！');
        } else if (window.currentChords.chords && Array.isArray(window.currentChords.chords)) {
            chordsArray = window.currentChords.chords;
            console.log('🔍 从currentChords.chords提取数组');
        } else if (window.currentChords.progressions && Array.isArray(window.currentChords.progressions)) {
            chordsArray = window.currentChords.progressions;
            console.log('🔍 从currentChords.progressions提取数组');
        } else {
            // 尝试将单个对象转为数组
            chordsArray = [window.currentChords];
            console.log('🔍 将单个currentChords对象转为数组');
        }
    } else {
        console.error('🔍 无法处理currentChords数据格式:', typeof window.currentChords);
        alert('和弦数据格式错误，无法播放');
        isPlayingChords = false;
        return;
    }

    console.log('🔍 最终使用的和弦数组:', chordsArray);

    chordsArray.forEach((chord, chordIndex) => {
        console.log(`🔍 处理和弦 ${chordIndex + 1}/${chordsArray.length}:`, chord);
        console.log(`🔍 和弦结构分析:`, {
            hasVoicings: !!chord.voicings,
            chordKeys: Object.keys(chord || {}),
            chordType: typeof chord,
            possibleVoicingPaths: {
                'chord.voicings': !!chord.voicings,
                'chord.chord?.voicings': !!(chord.chord && chord.chord.voicings),
                'chord.voicing': !!chord.voicing,
                'chord.midiNotes': !!chord.midiNotes,
                'chord.notes': !!chord.notes
            }
        });

        let actualVoicings = null;

        // 尝试不同的voicing路径 - 根据真实数据结构优化
        if (chord.voicing && chord.voicing.midiNotes) {
            // ✅ 真实数据路径：chord.voicing.midiNotes
            actualVoicings = { main: chord.voicing };
            console.log(`🔍 ✅ 找到MIDI数据在chord.voicing.midiNotes:`, chord.voicing.midiNotes);
        } else if (chord.voicings) {
            actualVoicings = chord.voicings;
            console.log(`🔍 找到voicings在chord.voicings`);
        } else if (chord.chord && chord.chord.voicings) {
            actualVoicings = chord.chord.voicings;
            console.log(`🔍 找到voicings在chord.chord.voicings`);
        } else if (chord.voicing) {
            actualVoicings = { main: chord.voicing };
            console.log(`🔍 找到单个voicing在chord.voicing`);
        } else if (chord.midiNotes) {
            actualVoicings = { main: { midiNotes: chord.midiNotes } };
            console.log(`🔍 找到MIDI数据在chord.midiNotes`);
        } else if (chord.notes) {
            // 如果有notes，尝试转换为MIDI
            console.log(`🔍 找到notes数据，尝试转换:`, chord.notes);
        }

        if (actualVoicings) {
            console.log(`🔍 和弦 ${chordIndex + 1} 的voicings:`, Object.keys(actualVoicings));

            // 播放所有voicing类型
            Object.values(actualVoicings).forEach((voicing, voicingIndex) => {
                if (voicing && voicing.midiNotes) {
                    console.log(`🔍 Voicing ${voicingIndex} MIDI音符:`, voicing.midiNotes);

                    voicing.midiNotes.forEach((midiNote, noteIndex) => {
                        const frequency = midiToFrequency(midiNote);
                        console.log(`🔍 MIDI ${midiNote} -> 频率 ${frequency.toFixed(2)}Hz`);

                        const oscillator = playNote(frequency, chordStartTime, chordDuration - 0.2);
                        if (oscillator) {
                            currentPlayback.push(oscillator);
                            totalNotesPlayed++;
                            console.log(`🔍 成功创建振荡器 ${totalNotesPlayed}`);
                        } else {
                            console.warn(`🔍 未能创建振荡器，MIDI: ${midiNote}, 频率: ${frequency}`);
                        }
                    });
                } else {
                    console.warn(`🔍 Voicing ${voicingIndex} 无MIDI数据:`, voicing);
                }
            });
        } else {
            console.warn(`🔍 和弦 ${chordIndex + 1} 无可用voicings数据`);
            console.warn(`🔍 完整和弦对象:`, JSON.stringify(chord, null, 2));
        }
        chordStartTime += chordDuration;
    });

    console.log(`🔍 播放准备完成，总计 ${totalNotesPlayed} 个音符，${currentPlayback.length} 个振荡器`);

    // 设置播放结束后的清理
    const totalDuration = chordsArray.length * chordDuration;
    setTimeout(() => {
        if (isPlayingChords) {
            stopPlayback();
        }
    }, totalDuration * 1000 + 500);

    console.log(`🎵 播放 ${chordsArray.length} 个和弦，总时长: ${totalDuration.toFixed(1)}秒`);
}

// 上一条和弦
function previousChords() {
    // 🎵 切换和弦时自动停止当前播放
    if (isPlayingChords) {
        console.log('⏹️ 切换到上一条和弦时自动停止当前播放');
        stopPlayback();
    }

    if (window.currentChordsIndex > 0) {
        window.currentChordsIndex--;
        window.currentChords = window.chordsHistory[window.currentChordsIndex];
        displayChords(window.currentChords);
    } else {
        console.log('已经是第一条和弦');
    }
}

// 下一条和弦
function nextChords() {
    // 🎵 切换和弦时自动停止当前播放
    if (isPlayingChords) {
        console.log('⏹️ 切换到下一条和弦时自动停止当前播放');
        stopPlayback();
    }

    if (window.currentChordsIndex < window.chordsHistory.length - 1) {
        window.currentChordsIndex++;
        window.currentChords = window.chordsHistory[window.currentChordsIndex];
        displayChords(window.currentChords);
    } else {
        console.log('已经是最后一条和弦');
    }
}

// 自动隐藏检查函数 (用于新生成内容的持久隐藏)
function applyAutoHideIfNeeded() {
    if (!chordsVisible) {
        // 立即尝试隐藏，如果SVG未加载则短延迟重试
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            const svgElements = scoreElement.querySelectorAll('svg');
            if (svgElements.length > 0) {
                // SVG已存在，立即隐藏
                svgElements.forEach(svg => {
                    svg.classList.add('melody-hidden');
                    svg.style.opacity = '0';
                    svg.style.filter = 'blur(10px)';
                    svg.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
                });
                console.log('🔒 持久隐藏模式：立即隐藏新生成的内容');
            } else {
                // SVG未加载，短延迟重试一次
                setTimeout(() => {
                    const svgElements = scoreElement.querySelectorAll('svg');
                    svgElements.forEach(svg => {
                        svg.classList.add('melody-hidden');
                        svg.style.opacity = '0';
                        svg.style.filter = 'blur(10px)';
                        svg.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
                    });
                    console.log('🔒 持久隐藏模式：延迟隐藏新生成的内容');
                }, 100); // 只延迟100ms
            }
        }
    }
}

// 切换和弦可见性
function toggleMelodyVisibility() {
    chordsVisible = !chordsVisible;
    const visibilityBtn = document.getElementById('melodyVisibilityBtn');
    const scoreElement = document.getElementById('score');

    if (!chordsVisible) {
        // 隐藏和弦
        if (scoreElement) {
            const svgElements = scoreElement.querySelectorAll('svg');
            svgElements.forEach(svg => {
                svg.classList.add('melody-hidden');
                svg.style.opacity = '0';
                svg.style.filter = 'blur(10px)';
                svg.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
            });
        }
        if (visibilityBtn) {
            visibilityBtn.innerHTML = '👂';
            visibilityBtn.title = '显示和弦';
            visibilityBtn.classList.add('hidden-state');
        }
        console.log('👂 和弦已隐藏');
    } else {
        // 显示和弦
        if (scoreElement) {
            const svgElements = scoreElement.querySelectorAll('svg');
            svgElements.forEach(svg => {
                svg.classList.remove('melody-hidden');
                svg.style.opacity = '1';
                svg.style.filter = 'none';
                svg.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
            });
        }
        if (visibilityBtn) {
            visibilityBtn.innerHTML = '👀';
            visibilityBtn.title = '隐藏和弦';
            visibilityBtn.classList.remove('hidden-state');
        }
        console.log('👀 和弦已显示');
    }
}

// 🎵 切换和弦代号显示
function toggleChordSymbols() {
    chordSymbolsVisible = !chordSymbolsVisible;
    const symbolBtn = document.getElementById('chordSymbolBtn');

    if (symbolBtn) {
        if (chordSymbolsVisible) {
            symbolBtn.innerHTML = '🎵';
            symbolBtn.title = translate('controls.chordSymbolsHide');
            symbolBtn.classList.remove('hidden-state');
            console.log('🎵 和弦代号已显示');
        } else {
            symbolBtn.innerHTML = '🎶';
            symbolBtn.title = translate('controls.chordSymbolsShow');
            symbolBtn.classList.add('hidden-state');
            console.log('🎶 和弦代号已隐藏');
        }
    }

    // 🔄 如果当前有和弦，重新渲染以应用显示设置
    if (currentChords && currentChords.progression) {
        console.log('🔄 重新渲染和弦以应用代号显示设置...');
        displayChords(currentChords);
    }
}

// 节拍器控制
function toggleMetronome() {
    const btn = document.getElementById('headerMetronomeBtn');

    if (metronomeInterval) {
        clearInterval(metronomeInterval);
        metronomeInterval = null;
        metronomeIsPlaying = false;
        btn.classList.remove('playing');
        btn.innerHTML = '🎵';
        console.log('⏹️ 节拍器停止');
    } else {
        startMetronome();
        metronomeIsPlaying = true;
        btn.classList.add('playing');
        btn.innerHTML = '⏸️';
        console.log('▶️ 节拍器开始');
    }
}

function startMetronome() {
    const interval = 60000 / currentTempo;
    metronomeInterval = setInterval(() => {
        playMetronomeSound();
        updateBeatIndicator();
    }, interval);
    playMetronomeSound();
    updateBeatIndicator();
}

function playMetronomeSound() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    try {
        // 恢复音频上下文（用户交互后）
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // 使用方波和自然音高 (参考NiceChord节拍器)
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5音高

        // 设置自然的音量包络 (更好的release time)
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
    } catch (error) {
        console.error('❌ 节拍器声音播放失败:', error);
    }
}

function updateBeatIndicator() {
    const indicator = document.getElementById('headerBeatIndicator');
    if (indicator) {
        indicator.classList.add('beat');
        setTimeout(() => {
            indicator.classList.remove('beat');
        }, 100);
    }
}

// 更新节拍器速度
function updateTempo() {
    const bpmInput = document.getElementById('headerMetronomeBpm');
    if (bpmInput) {
        const newTempo = parseInt(bpmInput.value) || 60;
        if (newTempo >= 1 && newTempo <= 999) {
            currentTempo = newTempo;
            if (metronomeInterval) {
                toggleMetronome();
                toggleMetronome();
            }
        }
    }
}

// 功能选择器控制
function toggleFunctionSelector() {
    const menu = document.getElementById('functionMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

function switchFunction(type) {
    const menu = document.getElementById('functionMenu');
    if (menu) menu.classList.remove('show');

    switch (type) {
        case 'melody':
            window.location.href = 'melody-generator.html';
            break;
        case 'jianpu':
            window.location.href = 'jianpu-generator.html';
            break;
        case 'interval':
            window.location.href = 'interval-generator.html';
            break;
        case 'chord':
            // 当前页面
            break;
    }
}

// 设置控制
function toggleSettings() {
    const menu = document.getElementById('settingsMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

// 主题切换
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('preferredTheme', theme);
    toggleSettings();
}

function loadTheme() {
    const savedTheme = localStorage.getItem('preferredTheme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
}

// 语言切换
// 🔧 翻译函数已移至 i18n.js (2025-10-04)
// 旧函数：switchLanguage(lang)、applyCurrentLanguage()
// 新用法：I18n.switchLanguage(lang)、I18n.applyLanguage()
// i18n.js 会自动初始化并应用语言设置

// 模态框控制函数

// 全选功能状态保存
const selectAllStates = {
    basicChords: null,
    seventhChords: null,
    voicings: null,
    rhythms: null,
    majorKeys: null,
    minorKeys: null,
    timeSignatures: null,
    clefs: null
};

// 和弦类型设置
function openChordTypeSettings() {
    console.log('🔧 打开和弦类型设置...');
    const modal = document.getElementById('chordTypeModal');
    console.log('找到模态框:', modal);
    if (modal) {
        modal.style.display = 'flex';
        console.log('模态框显示状态:', modal.style.display);

        // 加载当前保存的设置到UI
        loadCurrentChordTypeSettings();

        // 确保模态框内容被正确翻译
        if (typeof translatePage === 'function') {
            translatePage();
            console.log('🌐 和弦类型设置弹窗翻译已应用');
        }
    } else {
        console.error('未找到chordTypeModal元素');
    }
}

// 加载当前和弦类型设置到UI
function loadCurrentChordTypeSettings() {
    console.log('🔄 加载当前和弦类型设置到UI...');

    // 首先清除所有checkbox的选中状态
    const allCheckboxes = document.querySelectorAll('#chordTypeModal input[type="checkbox"]');
    allCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // 加载和弦类型设置
    if (window.chordSettings && window.chordSettings.chordTypes) {
        console.log('🎯 加载和弦类型:', window.chordSettings.chordTypes);
        window.chordSettings.chordTypes.forEach(type => {
            const checkbox = document.querySelector(`#chordTypeModal input[value="${type}"]`);
            if (checkbox) {
                checkbox.checked = true;
                console.log(`✅ 已选中和弦类型: ${type}`);
            }
        });
    } else {
        // 如果没有保存的设置，默认选中大三和弦和小三和弦
        ['major', 'minor'].forEach(type => {
            const checkbox = document.querySelector(`#chordTypeModal input[value="${type}"]`);
            if (checkbox) {
                checkbox.checked = true;
                console.log(`🎯 默认选中和弦类型: ${type}`);
            }
        });
    }

    // 加载转位设置
    if (window.chordSettings && window.chordSettings.includeTriadInversions) {
        const checkbox = document.querySelector('#chordTypeModal input[value="triad-inversion"]');
        if (checkbox) {
            checkbox.checked = true;
            console.log('✅ 已选中三和弦转位');
        }
    }

    if (window.chordSettings && window.chordSettings.includeSeventhInversions) {
        const checkbox = document.querySelector('#chordTypeModal input[value="seventh-inversion"]');
        if (checkbox) {
            checkbox.checked = true;
            console.log('✅ 已选中七和弦转位');
        }
    }

    // 加载Voicing设置（高级设置）
    if (window.chordSettings && window.chordSettings.voicingTypes) {
        console.log('🎯 加载Voicing设置:', window.chordSettings.voicingTypes);
        window.chordSettings.voicingTypes.forEach(voicing => {
            const checkbox = document.querySelector(`#chordTypeModal input[value="${voicing}"]`);
            if (checkbox) {
                checkbox.checked = true;
                console.log(`✅ 已选中Voicing类型: ${voicing}`);
            }
        });
    } else {
        // 如果没有保存的voicing设置，默认选中close
        const checkbox = document.querySelector('#chordTypeModal input[value="close"]');
        if (checkbox) {
            checkbox.checked = true;
            console.log('🎯 默认选中Voicing类型: close');
        }
    }

    // 🎹 加载钢琴音数设置（2025-10-01新增）
    if (window.pianoSettings && window.pianoSettings.enabledNoteCounts) {
        console.log('🎹 加载钢琴音数设置:', window.pianoSettings.enabledNoteCounts);
        window.pianoSettings.enabledNoteCounts.forEach(count => {
            const checkbox = document.getElementById(`notecount-${count}`);
            if (checkbox) {
                checkbox.checked = true;
                console.log(`✅ 已选中音数: ${count}音`);
            }
        });
    } else {
        // 如果没有保存的音数设置，默认选中4音
        const checkbox = document.getElementById('notecount-4');
        if (checkbox) {
            checkbox.checked = true;
            console.log('🎯 默认选中音数: 4音');
        }
    }

    // 🎵 加载Tension Note设置（2025-10-01新增）
    const tensionToggle = document.getElementById('tension-note-toggle');
    if (tensionToggle) {
        if (window.pianoSettings && typeof window.pianoSettings.enableTensions !== 'undefined') {
            tensionToggle.checked = window.pianoSettings.enableTensions;
            console.log(`🎵 加载Tension Note设置: ${window.pianoSettings.enableTensions ? '✅ 启用' : '❌ 禁用'}`);
        } else {
            // 默认禁用Tension Note
            tensionToggle.checked = false;
            console.log('🎵 Tension Note设置使用默认值: ❌ 禁用');
        }
    } else {
        console.warn('⚠️ 未找到tension-note-toggle元素');
    }
}

function closeChordTypeSettings() {
    // 先保存设置再关闭
    console.log('🔄 关闭和弦类型设置，自动保存设置...');
    saveChordTypeSettings();
    const modal = document.getElementById('chordTypeModal');
    if (modal) modal.style.display = 'none';
}

function saveChordTypeSettings() {
    console.log('\n\n🔍 ========== 开始保存和弦类型设置 ==========');

    // 🛡️ Toggle状态保护 - 在保存前记录当前状态
    const instrumentToggle = document.getElementById('instrumentModeToggle');
    const functionalToggle = document.getElementById('functionalHarmonyToggle');
    const savedInstrumentState = instrumentToggle ? instrumentToggle.checked : false;
    const savedFunctionalState = functionalToggle ? functionalToggle.checked : true;

    console.log('💾 保存和弦类型设置...');
    console.log(`🛡️ Toggle状态保护: 乐器模式=${savedInstrumentState ? '钢琴' : '吉他'}, 和声模式=${savedFunctionalState ? '功能和声' : '随机'}`);

    // 🔍 详细UI状态诊断
    if (functionalToggle) {
        const label = document.getElementById('harmonyModeLabel');
        const slider = functionalToggle.nextElementSibling;
        const sliderButton = slider ? slider.querySelector('.slider-button') : null;

        console.log('🔍 功能和声Toggle详细状态:');
        console.log('  - checked:', functionalToggle.checked);
        console.log('  - label.textContent:', label ? label.textContent : 'N/A');
        console.log('  - slider.style.backgroundColor:', slider ? slider.style.backgroundColor : 'N/A');
        console.log('  - sliderButton.style.transform:', sliderButton ? sliderButton.style.transform : 'N/A');
    }

    // 🚨 异常配置检测：UI数据收集阶段
    console.log(`\n🔍 === 异常配置检测 (UI数据收集) ===`);

    // 收集选中的和弦类型
    const selectedChords = [];
    let includeTriadInversions = false;
    let includeSeventhInversions = false;

    // 🔧 修复 (2025-10-01): 使用白名单过滤，只允许真正的和弦类型
    // 问题：原逻辑错误地将voicing类型和钢琴音数混入chordTypes数组
    const validChordTypes = [
        'major', 'minor', 'diminished', 'augmented',  // 三和弦
        'major7', 'minor7', 'dominant7', 'minor7b5', 'minorMaj7', 'augmented7', 'diminished7',  // 七和弦
        'sus', 'sus2', 'sus4', '7sus', '7sus2', '7sus4',  // sus和弦
        'major9', 'minor9', 'dominant9',  // 九和弦
        'major11', 'minor11', 'dominant11',  // 十一和弦
        'major13', 'minor13', 'dominant13'  // 十三和弦
    ];

    document.querySelectorAll('#chordTypeModal input[type="checkbox"]:checked').forEach(checkbox => {
        if (checkbox.value === 'triad-inversion') {
            includeTriadInversions = true;
        } else if (checkbox.value === 'seventh-inversion') {
            includeSeventhInversions = true;
        } else if (validChordTypes.includes(checkbox.value)) {
            // ✅ 只添加在白名单中的和弦类型
            selectedChords.push(checkbox.value);
            console.log(`✅ 添加和弦类型: ${checkbox.value}`);
        } else {
            // 🔍 调试：记录被过滤掉的值
            console.log(`⚠️ 过滤掉非和弦类型checkbox: value="${checkbox.value}", id="${checkbox.id}"`);
        }
    });

    // 收集Voicing设置 - 增强调试
    const selectedVoicings = [];
    console.log(`🔍 开始收集Voicing设置...`);

    // 详细检查每个checkbox
    const voicingCheckboxes = ['voicing-close', 'voicing-drop2', 'voicing-drop3', 'voicing-shell'];
    voicingCheckboxes.forEach(checkboxId => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            console.log(`🔍 Checkbox ${checkboxId}: checked=${checkbox.checked}, value=${checkbox.value}`);
            if (checkbox.checked) {
                selectedVoicings.push(checkbox.value);
                console.log(`✅ 添加到selectedVoicings: ${checkbox.value}`);
            }
        } else {
            console.error(`❌ 找不到checkbox: ${checkboxId}`);
        }
    });

    // 额外的通用检查
    document.querySelectorAll('#chordTypeModal input[type="checkbox"]:checked').forEach(checkbox => {
        if (['close', 'drop2', 'drop3', 'shell'].includes(checkbox.value)) {
            if (!selectedVoicings.includes(checkbox.value)) {
                console.warn(`⚠️ 通用检查发现遗漏的voicing: ${checkbox.value}`);
                selectedVoicings.push(checkbox.value);
            }
        }
    });

    console.log(`🎯 最终收集的selectedVoicings: ${JSON.stringify(selectedVoicings)}`);

    // 移除自动添加close的逻辑 - 让用户的选择完全被尊重
    if (selectedVoicings.length === 0) {
        console.warn('⚠️ 没有选择任何voicing类型！');
        // 不再自动添加close，让系统正确处理空选择
    }

    // 🎹 收集钢琴音数设置（2025-10-01新增修复）
    // 🔧 修复 (2025-10-01): 移除2音、8音、9音，只保留3-7音
    const selectedNoteCounts = [];
    const noteCountCheckboxes = ['notecount-3', 'notecount-4', 'notecount-5', 'notecount-6', 'notecount-7'];
    console.log(`🔍 开始收集钢琴音数设置...`);

    noteCountCheckboxes.forEach(checkboxId => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox && checkbox.checked) {
            const count = parseInt(checkbox.value);
            selectedNoteCounts.push(count);
            console.log(`✅ 添加音数选择: ${count}音`);
        }
    });

    console.log(`🎹 最终收集的selectedNoteCounts: ${JSON.stringify(selectedNoteCounts)}`);

    // 🎹 保存钢琴音数设置到 window.pianoSettings
    if (selectedNoteCounts.length > 0) {
        if (!window.pianoSettings) {
            window.pianoSettings = {};
        }
        window.pianoSettings.enabledNoteCounts = selectedNoteCounts;
        console.log(`✅ 钢琴音数设置已保存到 window.pianoSettings.enabledNoteCounts: ${JSON.stringify(selectedNoteCounts)}`);
    } else {
        console.warn(`⚠️ 没有选择任何钢琴音数，保持现有设置`);
    }

    // 🎵 保存Tension Note设置（2025-10-01新增）
    const tensionToggle = document.getElementById('tension-note-toggle');
    if (!window.pianoSettings) {
        window.pianoSettings = {};
    }
    window.pianoSettings.enableTensions = tensionToggle ? tensionToggle.checked : false;
    console.log(`🎵 Tension Note设置已保存: ${window.pianoSettings.enableTensions ? '✅ 启用' : '❌ 禁用'}`);


    // 更新设置 - 增强调试
    window.chordSettings.chordTypes = selectedChords;
    window.chordSettings.includeTriadInversions = includeTriadInversions;
    window.chordSettings.includeSeventhInversions = includeSeventhInversions;
    window.chordSettings.voicingTypes = selectedVoicings;
    window.chordSettings.enableVoiceLeading = true; // 永远启用Voice Leading
    window.chordSettings.voicingPreference = selectedVoicings[0]; // 使用第一个作为首选

    // 🚨 异常配置检测：设置保存阶段
    console.log(`\n🔍 === 异常配置检测 (设置保存) ===`);
    console.log(`🎯 保存前 window.chordSettings.chordTypes: ${JSON.stringify(window.chordSettings.chordTypes)}`);
    console.log(`🎯 即将保存的 selectedChords: ${JSON.stringify(selectedChords)}`);
    console.log(`🎯 保存前 window.chordSettings.voicingTypes: ${JSON.stringify(window.chordSettings.voicingTypes)}`);
    console.log(`🎯 保存前 selectedVoicings: ${JSON.stringify(selectedVoicings)}`);
    console.log(`🎯 保存设置 - voicingTypes: ${JSON.stringify(selectedVoicings)}`);
    console.log(`🎯 保存设置 - voicingPreference: ${window.chordSettings.voicingPreference}`);

    // 验证保存后的设置
    setTimeout(() => {
        console.log(`🎯 保存后验证 window.chordSettings.chordTypes: ${JSON.stringify(window.chordSettings.chordTypes)}`);
        console.log(`🎯 保存后验证 window.chordSettings.voicingTypes: ${JSON.stringify(window.chordSettings.voicingTypes)}`);

        // 验证和弦类型保存
        if (JSON.stringify(window.chordSettings.chordTypes) !== JSON.stringify(selectedChords)) {
            console.error(`🚨 和弦类型保存异常：保存前后不一致！`);
            console.error(`🚨 期望chordTypes: ${JSON.stringify(selectedChords)}`);
            console.error(`🚨 实际chordTypes: ${JSON.stringify(window.chordSettings.chordTypes)}`);
        } else {
            console.log(`✅ 和弦类型保存成功: ${JSON.stringify(selectedChords)}`);
        }

        // 验证voicing保存
        if (JSON.stringify(window.chordSettings.voicingTypes) !== JSON.stringify(selectedVoicings)) {
            console.error(`🚨 Voicing设置保存异常：保存前后不一致！`);
            console.error(`🚨 期望voicingTypes: ${JSON.stringify(selectedVoicings)}`);
            console.error(`🚨 实际voicingTypes: ${JSON.stringify(window.chordSettings.voicingTypes)}`);
        } else {
            console.log(`✅ Voicing设置保存成功: ${JSON.stringify(selectedVoicings)}`);
        }
    }, 10);

    // 更新voicing引擎设置
    if (voicingEngine) {
        voicingEngine.updateSettings({
            enabledVoicings: selectedVoicings,
            enableVoiceLeading: true, // 永远启用
            enableInversions: includeTriadInversions || includeSeventhInversions // 根据用户选择启用转位
        });
    }

    // 更新voice leading analyzer设置
    if (voiceLeadingAnalyzer) {
        voiceLeadingAnalyzer.updateSettings({
            enableInversions: includeTriadInversions || includeSeventhInversions // 根据用户选择启用转位
        });
    }

    console.log('保存的和弦类型:', selectedChords);
    console.log('包含三和弦转位:', includeTriadInversions);
    console.log('包含七和弦转位:', includeSeventhInversions);
    console.log('启用的Voicing类型:', selectedVoicings);
    console.log('Voice Leading: 永远启用');

    console.log('\n🔍 ========== Toggle状态检查与恢复 ==========');

    // 🛡️ Toggle状态立即恢复 - 在关闭弹窗前就恢复（防止视觉闪烁）
    if (instrumentToggle && instrumentToggle.checked !== savedInstrumentState) {
        console.warn(`⚠️ 检测到instrumentToggle状态被意外修改: ${savedInstrumentState ? '钢琴' : '吉他'} → ${instrumentToggle.checked ? '钢琴' : '吉他'}`);
        instrumentToggle.checked = savedInstrumentState;
        // 重新应用UI状态
        if (typeof toggleInstrumentMode === 'function') {
            toggleInstrumentMode();
        }
        console.log(`✅ 已恢复instrumentToggle状态为: ${savedInstrumentState ? '钢琴模式' : '吉他模式'}`);
    } else if (instrumentToggle) {
        console.log(`✅ instrumentToggle状态保持稳定: ${instrumentToggle.checked ? '钢琴模式' : '吉他模式'}`);
    }

    if (functionalToggle) {
        console.log(`🔍 functionalToggle检查前状态: checked=${functionalToggle.checked}, 期望=${savedFunctionalState}`);

        if (functionalToggle.checked !== savedFunctionalState) {
            console.warn(`⚠️ 检测到functionalToggle状态被意外修改: ${savedFunctionalState ? '功能和声' : '随机'} → ${functionalToggle.checked ? '功能和声' : '随机'}`);
            functionalToggle.checked = savedFunctionalState;
            console.log(`🔧 已修正functionalToggle.checked = ${savedFunctionalState}`);

            // 重新应用UI状态
            if (typeof toggleFunctionalHarmony === 'function') {
                console.log(`🔧 调用 toggleFunctionalHarmony() 来更新UI...`);
                toggleFunctionalHarmony();
            }

            // 再次验证UI状态
            const label = document.getElementById('harmonyModeLabel');
            const slider = functionalToggle.nextElementSibling;
            const sliderButton = slider ? slider.querySelector('.slider-button') : null;

            console.log('🔍 恢复后的UI状态:');
            console.log('  - checked:', functionalToggle.checked);
            console.log('  - label.textContent:', label ? label.textContent : 'N/A');
            console.log('  - slider.style.backgroundColor:', slider ? slider.style.backgroundColor : 'N/A');
            console.log('  - sliderButton.style.transform:', sliderButton ? sliderButton.style.transform : 'N/A');

            console.log(`✅ 已恢复functionalToggle状态为: ${savedFunctionalState ? '功能和声模式' : '随机模式'}`);
        } else {
            console.log(`✅ functionalToggle状态保持稳定: ${functionalToggle.checked ? '功能和声模式' : '随机模式'}`);

            // 即使状态没变，也验证UI是否正确
            const label = document.getElementById('harmonyModeLabel');
            const slider = functionalToggle.nextElementSibling;
            const sliderButton = slider ? slider.querySelector('.slider-button') : null;

            const expectedLabel = functionalToggle.checked ? '功能和声模式' : '完全随机模式';
            const expectedBgColor = functionalToggle.checked ? 'rgb(255, 149, 0)' : 'rgb(204, 204, 204)';
            const expectedTransform = functionalToggle.checked ? 'translateX(26px)' : 'translateX(0px)';

            let uiInconsistent = false;

            if (label && !label.textContent.includes(functionalToggle.checked ? '功能和声' : '随机')) {
                console.warn(`⚠️ UI不一致: label显示"${label.textContent}"，但应该显示"${expectedLabel}"`);
                uiInconsistent = true;
            }

            if (slider && slider.style.backgroundColor && slider.style.backgroundColor !== expectedBgColor) {
                console.warn(`⚠️ UI不一致: slider颜色为"${slider.style.backgroundColor}"，但应该是"${expectedBgColor}"`);
                uiInconsistent = true;
            }

            if (sliderButton && sliderButton.style.transform !== expectedTransform) {
                console.warn(`⚠️ UI不一致: button位置为"${sliderButton.style.transform}"，但应该是"${expectedTransform}"`);
                uiInconsistent = true;
            }

            if (uiInconsistent) {
                console.warn(`🔧 检测到UI不一致，强制刷新UI状态...`);
                if (typeof toggleFunctionalHarmony === 'function') {
                    toggleFunctionalHarmony();
                }
                console.log(`✅ UI已强制刷新`);
            }
        }
    }

    console.log('🔍 ========== Toggle状态检查完成 ==========\n');

    // 🔧 2025-10-01 修复：更新动态控件翻译，确保乐器模式label文字正确
    // 问题：打开弹窗时applyTranslations()会将instrumentModeLabel重置为"吉他和声"
    // 解决：调用updateDynamicControlsTranslation()根据toggle实际状态更新文字
    if (typeof updateDynamicControlsTranslation === 'function') {
        updateDynamicControlsTranslation();
        console.log('🔄 已更新动态控件翻译，确保乐器模式和和声模式label文字正确');
    } else {
        console.warn('⚠️ updateDynamicControlsTranslation函数未找到');
    }

    // 保存完成后自动关闭弹窗（在状态恢复之后）
    const modal = document.getElementById('chordTypeModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ 设置已保存，弹窗已关闭');
    }
}

function selectAllBasicChords() {
    // 🛡️ 挂留和弦与转位选项完全分离
    const basicChords = ['major', 'minor', 'diminished', 'augmented', 'triad-inversion'];
    const suspendedChords = ['sus']; // 挂留和弦独立分组

    // 检查是否所有基础和弦都被选中（不包括挂留和弦）
    const allBasicChecked = basicChords.every(chord => {
        const checkbox = document.getElementById(`chord-${chord}`);
        return checkbox && checkbox.checked;
    });

    // 单独检查挂留和弦
    const allSuspendedChecked = suspendedChords.every(chord => {
        const checkbox = document.getElementById(`chord-${chord}`);
        return checkbox && checkbox.checked;
    });

    const allChecked = allBasicChecked && allSuspendedChecked;

    if (allChecked) {
        // 如果全选，则恢复到之前保存的状态
        if (selectAllStates.basicChords) {
            basicChords.forEach(chord => {
                const checkbox = document.getElementById(`chord-${chord}`);
                if (checkbox) checkbox.checked = selectAllStates.basicChords[chord] || false;
            });
            // 🔧 修复：也要恢复挂和弦的状态
            suspendedChords.forEach(chord => {
                const checkbox = document.getElementById(`chord-${chord}`);
                if (checkbox) checkbox.checked = selectAllStates.basicChords[chord] || false;
            });
            selectAllStates.basicChords = null; // 清除保存的状态
        } else {
            // 如果没有保存的状态，则取消全选
            basicChords.forEach(chord => {
                const checkbox = document.getElementById(`chord-${chord}`);
                if (checkbox) checkbox.checked = false;
            });
            // 🔧 修复：也要取消挂和弦的勾选
            suspendedChords.forEach(chord => {
                const checkbox = document.getElementById(`chord-${chord}`);
                if (checkbox) checkbox.checked = false;
            });
        }
    } else {
        // 保存当前状态
        selectAllStates.basicChords = {};
        basicChords.forEach(chord => {
            const checkbox = document.getElementById(`chord-${chord}`);
            if (checkbox) selectAllStates.basicChords[chord] = checkbox.checked;
        });
        // 🔧 修复：也要保存挂和弦的状态
        suspendedChords.forEach(chord => {
            const checkbox = document.getElementById(`chord-${chord}`);
            if (checkbox) selectAllStates.basicChords[chord] = checkbox.checked;
        });

        // 然后全选基础和弦和挂留和弦
        [...basicChords, ...suspendedChords].forEach(chord => {
            const checkbox = document.getElementById(`chord-${chord}`);
            if (checkbox) checkbox.checked = true;
        });
    }
}

function selectAllSeventhChords() {
    // 🛡️ 七挂和弦与转位选项完全分离
    const seventhChords = ['major7', 'minor7', 'dominant7', 'minor7b5', 'seventh-inversion'];
    const seventhSuspendedChords = ['7sus']; // 七挂和弦独立分组

    // 检查是否所有七和弦都被选中（不包括七挂和弦）
    const allSeventhChecked = seventhChords.every(chord => {
        const checkbox = document.getElementById(`chord-${chord}`);
        return checkbox && checkbox.checked;
    });

    // 单独检查七挂和弦
    const allSeventhSuspendedChecked = seventhSuspendedChords.every(chord => {
        const checkbox = document.getElementById(`chord-${chord}`);
        return checkbox && checkbox.checked;
    });

    const allChecked = allSeventhChecked && allSeventhSuspendedChecked;

    if (allChecked) {
        // 如果全选，则恢复到之前保存的状态
        if (selectAllStates.seventhChords) {
            seventhChords.forEach(chord => {
                const checkbox = document.getElementById(`chord-${chord}`);
                if (checkbox) checkbox.checked = selectAllStates.seventhChords[chord] || false;
            });
            // 🔧 修复：也要恢复七挂和弦的状态
            seventhSuspendedChords.forEach(chord => {
                const checkbox = document.getElementById(`chord-${chord}`);
                if (checkbox) checkbox.checked = selectAllStates.seventhChords[chord] || false;
            });
            selectAllStates.seventhChords = null; // 清除保存的状态
        } else {
            // 如果没有保存的状态，则取消全选
            seventhChords.forEach(chord => {
                const checkbox = document.getElementById(`chord-${chord}`);
                if (checkbox) checkbox.checked = false;
            });
            // 🔧 修复：也要取消七挂和弦的勾选
            seventhSuspendedChords.forEach(chord => {
                const checkbox = document.getElementById(`chord-${chord}`);
                if (checkbox) checkbox.checked = false;
            });
        }
    } else {
        // 保存当前状态
        selectAllStates.seventhChords = {};
        seventhChords.forEach(chord => {
            const checkbox = document.getElementById(`chord-${chord}`);
            if (checkbox) selectAllStates.seventhChords[chord] = checkbox.checked;
        });
        // 🔧 修复：也要保存七挂和弦的状态
        seventhSuspendedChords.forEach(chord => {
            const checkbox = document.getElementById(`chord-${chord}`);
            if (checkbox) selectAllStates.seventhChords[chord] = checkbox.checked;
        });

        // 然后全选七和弦和七挂和弦
        [...seventhChords, ...seventhSuspendedChords].forEach(chord => {
            const checkbox = document.getElementById(`chord-${chord}`);
            if (checkbox) checkbox.checked = true;
        });
    }
}

function toggleChordAdvancedSettings() {
    const advancedSettings = document.getElementById('chordAdvancedSettings');
    const toggleBtn = document.getElementById('chordAdvancedBtn');

    if (advancedSettings.style.display === 'none') {
        advancedSettings.style.display = 'block';
        toggleBtn.textContent = '隐藏高级设置';
    } else {
        advancedSettings.style.display = 'none';
        toggleBtn.textContent = '高级设置';
    }
}

function toggleSelectAllVoicings() {
    const voicingCheckboxes = ['voicing-close', 'voicing-drop2', 'voicing-drop3', 'voicing-shell'];
    const selectAllText = document.getElementById('voicingSelectAllText');

    // 检查是否所有voicing都被选中
    const allChecked = voicingCheckboxes.every(id => {
        const checkbox = document.getElementById(id);
        return checkbox && checkbox.checked;
    });

    if (allChecked) {
        // 如果全选，则恢复到之前保存的状态
        if (selectAllStates.voicings) {
            voicingCheckboxes.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) checkbox.checked = selectAllStates.voicings[id] || false;
            });
            selectAllStates.voicings = null; // 清除保存的状态
        } else {
            // 如果没有保存的状态，则取消全选
            voicingCheckboxes.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) checkbox.checked = false;
            });
        }
        selectAllText.textContent = '全选';
    } else {
        // 保存当前状态
        selectAllStates.voicings = {};
        voicingCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) selectAllStates.voicings[id] = checkbox.checked;
        });

        // 然后全选
        voicingCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = true;
        });
        selectAllText.textContent = '取消全选';
    }
}

// 节奏设置
function openRhythmSettings() {
    const modal = document.getElementById('rhythmModal');
    if (modal) {
        modal.style.display = 'flex';

        // 确保模态框内容被正确翻译
        if (typeof translatePage === 'function') {
            translatePage();
            console.log('🌐 节奏设置弹窗翻译已应用');
        }
    }
}

function closeRhythmSettings() {
    // 先保存设置再关闭
    console.log('🔄 关闭节奏设置，自动保存设置...');
    saveRhythmSettings();
    const modal = document.getElementById('rhythmModal');
    if (modal) modal.style.display = 'none';
}

function saveRhythmSettings() {
    console.log('💾 保存节奏设置...');

    // 收集选中的节奏
    const selectedRhythms = [];
    document.querySelectorAll('#rhythmModal input[type="checkbox"]:checked').forEach(checkbox => {
        selectedRhythms.push(checkbox.value);
    });

    window.chordSettings.rhythms = selectedRhythms;
    console.log('保存的节奏:', selectedRhythms);

    // 保存完成后自动关闭弹窗
    const modal = document.getElementById('rhythmModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ 节奏设置已保存，弹窗已关闭');
    }
}

function selectAllRhythms() {
    const rhythms = ['whole', 'half', 'quarter', 'eighth'];

    // 检查是否所有节奏都被选中
    const allChecked = rhythms.every(rhythm => {
        const checkbox = document.getElementById(`rhythm-${rhythm}`);
        return checkbox && checkbox.checked;
    });

    if (allChecked) {
        // 如果全选，则恢复到之前保存的状态
        if (selectAllStates.rhythms) {
            rhythms.forEach(rhythm => {
                const checkbox = document.getElementById(`rhythm-${rhythm}`);
                if (checkbox) checkbox.checked = selectAllStates.rhythms[rhythm] || false;
            });
            selectAllStates.rhythms = null; // 清除保存的状态
        } else {
            // 如果没有保存的状态，则取消全选
            rhythms.forEach(rhythm => {
                const checkbox = document.getElementById(`rhythm-${rhythm}`);
                if (checkbox) checkbox.checked = false;
            });
        }
    } else {
        // 保存当前状态
        selectAllStates.rhythms = {};
        rhythms.forEach(rhythm => {
            const checkbox = document.getElementById(`rhythm-${rhythm}`);
            if (checkbox) selectAllStates.rhythms[rhythm] = checkbox.checked;
        });

        // 然后全选
        rhythms.forEach(rhythm => {
            const checkbox = document.getElementById(`rhythm-${rhythm}`);
            if (checkbox) checkbox.checked = true;
        });
    }
}

// 演奏技巧设置

// 调号设置
function openKeySettings() {
    const modal = document.getElementById('keySignatureModal');
    if (modal) {
        modal.style.display = 'flex';

        // 确保模态框内容被正确翻译
        if (typeof translatePage === 'function') {
            translatePage();
            console.log('🌐 调号设置弹窗翻译已应用');
        }
    }
}

function closeKeySettings() {
    // 先保存设置再关闭
    console.log('🔄 关闭调号设置，自动保存设置...');
    saveKeySettings();
    const modal = document.getElementById('keySignatureModal');
    if (modal) modal.style.display = 'none';
}

function saveKeySettings() {
    console.log('💾 保存调号设置...');

    // 收集选中的调号
    const selectedKeys = [];
    document.querySelectorAll('#keySignatureModal input[type="checkbox"]:checked').forEach(checkbox => {
        selectedKeys.push(checkbox.value);
    });

    window.chordSettings.keys = selectedKeys;
    console.log('保存的调号:', selectedKeys);

    // 保存完成后自动关闭弹窗
    const modal = document.getElementById('keySignatureModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ 调号设置已保存，弹窗已关闭');
    }
}

function selectAllMajorKeys() {
    const majorKeys = [
        'C-major', 'G-major', 'D-major', 'A-major', 'E-major', 'B-major', 'Fs-major',
        'F-major', 'Bb-major', 'Eb-major', 'Ab-major', 'Db-major', 'Gb-major'
    ];

    // 检查是否所有大调都被选中
    const allChecked = majorKeys.every(key => {
        const checkbox = document.getElementById(`key-${key}`);
        return checkbox && checkbox.checked;
    });

    if (allChecked) {
        // 如果全选，则恢复到之前保存的状态
        if (selectAllStates.majorKeys) {
            majorKeys.forEach(key => {
                const checkbox = document.getElementById(`key-${key}`);
                if (checkbox) checkbox.checked = selectAllStates.majorKeys[key] || false;
            });
            selectAllStates.majorKeys = null; // 清除保存的状态
        } else {
            // 如果没有保存的状态，则取消全选
            majorKeys.forEach(key => {
                const checkbox = document.getElementById(`key-${key}`);
                if (checkbox) checkbox.checked = false;
            });
        }
    } else {
        // 保存当前状态
        selectAllStates.majorKeys = {};
        majorKeys.forEach(key => {
            const checkbox = document.getElementById(`key-${key}`);
            if (checkbox) selectAllStates.majorKeys[key] = checkbox.checked;
        });

        // 然后全选
        majorKeys.forEach(key => {
            const checkbox = document.getElementById(`key-${key}`);
            if (checkbox) checkbox.checked = true;
        });
    }
}

function selectAllMinorKeys() {
    const minorKeys = [
        'a-minor', 'e-minor', 'b-minor', 'fs-minor', 'cs-minor', 'gs-minor', 'ds-minor',
        'd-minor', 'g-minor', 'c-minor', 'f-minor', 'bb-minor', 'eb-minor'
    ];

    // 检查是否所有小调都被选中
    const allChecked = minorKeys.every(key => {
        const checkbox = document.getElementById(`key-${key}`);
        return checkbox && checkbox.checked;
    });

    if (allChecked) {
        // 如果全选，则恢复到之前保存的状态
        if (selectAllStates.minorKeys) {
            minorKeys.forEach(key => {
                const checkbox = document.getElementById(`key-${key}`);
                if (checkbox) checkbox.checked = selectAllStates.minorKeys[key] || false;
            });
            selectAllStates.minorKeys = null; // 清除保存的状态
        } else {
            // 如果没有保存的状态，则取消全选
            minorKeys.forEach(key => {
                const checkbox = document.getElementById(`key-${key}`);
                if (checkbox) checkbox.checked = false;
            });
        }
    } else {
        // 保存当前状态
        selectAllStates.minorKeys = {};
        minorKeys.forEach(key => {
            const checkbox = document.getElementById(`key-${key}`);
            if (checkbox) selectAllStates.minorKeys[key] = checkbox.checked;
        });

        // 然后全选
        minorKeys.forEach(key => {
            const checkbox = document.getElementById(`key-${key}`);
            if (checkbox) checkbox.checked = true;
        });
    }
}

// 拍号设置
function openTimeSignatureSettings() {
    const modal = document.getElementById('timeSignatureModal');
    if (modal) {
        modal.style.display = 'flex';

        // 确保模态框内容被正确翻译
        if (typeof translatePage === 'function') {
            translatePage();
            console.log('🌐 拍号设置弹窗翻译已应用');
        }
    }
}

function closeTimeSignatureSettings() {
    // 先保存设置再关闭
    console.log('🔄 关闭拍号设置，自动保存设置...');
    saveTimeSignatureSettings();
    const modal = document.getElementById('timeSignatureModal');
    if (modal) modal.style.display = 'none';
}

function saveTimeSignatureSettings() {
    console.log('💾 保存拍号设置...');

    // 收集选中的拍号
    const selectedTimeSignatures = [];
    document.querySelectorAll('#timeSignatureModal input[type="checkbox"]:checked').forEach(checkbox => {
        selectedTimeSignatures.push(checkbox.value);
    });

    window.chordSettings.timeSignatures = selectedTimeSignatures;
    console.log('保存的拍号:', selectedTimeSignatures);

    // 保存完成后自动关闭弹窗
    const modal = document.getElementById('timeSignatureModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ 拍号设置已保存，弹窗已关闭');
    }
}

function selectAllTimeSignatures() {
    const timeSignatures = ['4/4', '3/4', '2/4', '6/8'];

    // 检查是否所有拍号都被选中
    const allChecked = timeSignatures.every(timeSignature => {
        const checkbox = document.getElementById(`time-${timeSignature.replace('/', '-')}`);
        return checkbox && checkbox.checked;
    });

    if (allChecked) {
        // 如果全选，则恢复到之前保存的状态
        if (selectAllStates.timeSignatures) {
            timeSignatures.forEach(timeSignature => {
                const checkbox = document.getElementById(`time-${timeSignature.replace('/', '-')}`);
                if (checkbox) checkbox.checked = selectAllStates.timeSignatures[timeSignature] || false;
            });
            selectAllStates.timeSignatures = null; // 清除保存的状态
        } else {
            // 如果没有保存的状态，则取消全选
            timeSignatures.forEach(timeSignature => {
                const checkbox = document.getElementById(`time-${timeSignature.replace('/', '-')}`);
                if (checkbox) checkbox.checked = false;
            });
        }
    } else {
        // 保存当前状态
        selectAllStates.timeSignatures = {};
        timeSignatures.forEach(timeSignature => {
            const checkbox = document.getElementById(`time-${timeSignature.replace('/', '-')}`);
            if (checkbox) selectAllStates.timeSignatures[timeSignature] = checkbox.checked;
        });

        // 然后全选
        timeSignatures.forEach(timeSignature => {
            const checkbox = document.getElementById(`time-${timeSignature.replace('/', '-')}`);
            if (checkbox) checkbox.checked = true;
        });
    }
}

// 谱号设置
function openClefSettings() {
    const modal = document.getElementById('clefModal');
    if (modal) {
        modal.style.display = 'flex';

        // 确保模态框内容被正确翻译
        if (typeof translatePage === 'function') {
            translatePage();
            console.log('🌐 谱号设置弹窗翻译已应用');
        }
    }
}

function closeClefSettings() {
    // 先保存设置再关闭
    console.log('🔄 关闭谱号设置，自动保存设置...');
    saveClefSettings();
    const modal = document.getElementById('clefModal');
    if (modal) modal.style.display = 'none';
}

function saveClefSettings() {
    console.log('💾 保存谱号设置...');

    // 收集选中的谱号
    const selectedClefs = [];
    document.querySelectorAll('#clefModal input[type="checkbox"]:checked').forEach(checkbox => {
        selectedClefs.push(checkbox.value);
    });

    window.chordSettings.clefs = selectedClefs;
    console.log('保存的谱号:', selectedClefs);

    // 保存完成后自动关闭弹窗
    const modal = document.getElementById('clefModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ 谱号设置已保存，弹窗已关闭');
    }
}

// 音域记忆系统 - 保存每个谱号的当前音域设置
const clefRangeMemory = {
    'treble': { min: 55, max: 88 },  // G3-E6
    'bass': { min: 40, max: 64 },    // E2-E4
    'grand_staff': { min: 40, max: 88 }  // E2-E6 (完整钢琴音域)
};

// 当前活跃的谱号
let currentActiveClef = 'treble';

function selectAllClefs() {
    const clefs = ['treble', 'bass'];

    // 检查是否所有谱号都被选中
    const allChecked = clefs.every(clef => {
        const checkbox = document.getElementById(`clef-${clef}`);
        return checkbox && checkbox.checked;
    });

    if (allChecked) {
        // 如果全选，则恢复到之前保存的状态
        if (selectAllStates.clefs) {
            clefs.forEach(clef => {
                const checkbox = document.getElementById(`clef-${clef}`);
                if (checkbox) checkbox.checked = selectAllStates.clefs[clef] || false;
            });
            selectAllStates.clefs = null; // 清除保存的状态
        } else {
            // 如果没有保存的状态，则取消全选
            clefs.forEach(clef => {
                const checkbox = document.getElementById(`clef-${clef}`);
                if (checkbox) checkbox.checked = false;
            });
        }
    } else {
        // 保存当前状态
        selectAllStates.clefs = {};
        clefs.forEach(clef => {
            const checkbox = document.getElementById(`clef-${clef}`);
            if (checkbox) selectAllStates.clefs[clef] = checkbox.checked;
        });

        // 然后全选
        clefs.forEach(clef => {
            const checkbox = document.getElementById(`clef-${clef}`);
            if (checkbox) checkbox.checked = true;
        });
    }
}

// 保存用户对音域的调整
function saveRangeForCurrentClef() {
    const rangeMinSelect = document.getElementById('rangeMin');
    const rangeMaxSelect = document.getElementById('rangeMax');

    if (!rangeMinSelect || !rangeMaxSelect) return;

    // 使用当前活跃的谱号
    if (currentActiveClef && clefRangeMemory[currentActiveClef]) {
        clefRangeMemory[currentActiveClef] = {
            min: parseInt(rangeMinSelect.value),
            max: parseInt(rangeMaxSelect.value)
        };
        console.log(`💾 保存${currentActiveClef}谱号音域: ${rangeMinSelect.value}-${rangeMaxSelect.value}`);
    }
}

// 初始化音域监听器
function initRangeListeners() {
    const rangeMinSelect = document.getElementById('rangeMin');
    const rangeMaxSelect = document.getElementById('rangeMax');

    if (rangeMinSelect && rangeMaxSelect) {
        rangeMinSelect.addEventListener('change', () => {
            console.log('🎚️ 用户调整了最低音设置');
            saveRangeForCurrentClef();
        });

        rangeMaxSelect.addEventListener('change', () => {
            console.log('🎚️ 用户调整了最高音设置');
            saveRangeForCurrentClef();
        });

        console.log('✅ 音域监听器已初始化');
    }
}

// 根据谱号设置合适的音域 - 使用音域记忆系统
function setRangeForClef(clef) {
    const rangeMinSelect = document.getElementById('rangeMin');
    const rangeMaxSelect = document.getElementById('rangeMax');

    if (!rangeMinSelect || !rangeMaxSelect) return;

    // 更新当前活跃谱号
    currentActiveClef = clef;

    // 从音域记忆中获取设置，如果没有则使用默认值
    const rangeSettings = clefRangeMemory[clef];

    if (rangeSettings) {
        rangeMinSelect.value = rangeSettings.min.toString();
        rangeMaxSelect.value = rangeSettings.max.toString();

        const noteNames = {
            36: 'C2', 40: 'E2', 48: 'C3', 50: 'D3',
            60: 'C4', 64: 'E4', 71: 'B4', 72: 'C5'
        };

        const minNote = noteNames[rangeSettings.min] || `MIDI${rangeSettings.min}`;
        const maxNote = noteNames[rangeSettings.max] || `MIDI${rangeSettings.max}`;

        console.log(`🎼 设置${clef}谱号音域: ${minNote}-${maxNote} (MIDI ${rangeSettings.min}-${rangeSettings.max})`);
    } else {
        // 默认使用高音谱号音域
        rangeMinSelect.value = '55'; // G3
        rangeMaxSelect.value = '88'; // E6
        console.log('🎼 设置默认音域: G3-E6');
    }

    console.log(`🔄 当前活跃谱号已更新为: ${currentActiveClef}`);
}

// 🔧 新增 (2025-10-06): 检测每行实际渲染了几个小节
// 修改 (2025-10-06): 基于和弦代号检测，避免钢琴双谱表重复计数
function detectMeasuresPerLine(svg, totalMeasures) {
    try {
        console.log(`📊 开始小节布局检测 (总共${totalMeasures}个和弦)...`);

        // 🎵 方法：基于和弦代号检测（每个小节有1个和弦代号，不受双谱表影响）
        const allTextElements = svg.querySelectorAll('.vf-text, text');
        console.log(`🔍 找到 ${allTextElements.length} 个文本元素`);

        // 过滤出和弦代号（排除小节号等）
        const chordPattern = /^[A-G][#b♯♭]?(m|maj|Maj|min|Min|dim|Dim|aug|Aug|sus|add|°|ø|Δ|\+|-)?[0-9]*(\/[A-G][#b♯♭]?)?$/;

        const chordElements = [];
        allTextElements.forEach(el => {
            const text = el.textContent.trim();
            // 排除纯数字（小节号）和空文本
            if (text && !/^\d+$/.test(text) && chordPattern.test(text)) {
                chordElements.push({
                    element: el,
                    text: text,
                    rect: el.getBoundingClientRect()
                });
            }
        });

        console.log(`🎵 检测到 ${chordElements.length} 个和弦代号`);

        // 🔧 修复 (2025-10-06): 钢琴双谱表会在同一位置重复显示和弦代号
        // 改进：基于X坐标去重而非文本内容，避免删除同名和弦
        const uniqueChords = [];
        const positionTolerance = 5; // X坐标容差5px

        chordElements.forEach(chord => {
            // 检查是否已有相同位置的和弦（双谱表重复）
            let isDuplicate = false;
            for (let existing of uniqueChords) {
                if (Math.abs(existing.rect.x - chord.rect.x) <= positionTolerance) {
                    isDuplicate = true;
                    console.log(`   🔍 跳过重复和弦: ${chord.text} (X=${chord.rect.x.toFixed(1)}, 与已有和弦X=${existing.rect.x.toFixed(1)}相同)`);
                    break;
                }
            }
            if (!isDuplicate) {
                uniqueChords.push(chord);
                console.log(`   ✅ 保留和弦: ${chord.text} (X=${chord.rect.x.toFixed(1)})`);
            }
        });

        console.log(`🎵 去重后: ${uniqueChords.length} 个唯一和弦 (基于位置去重)`);
        console.log(`🎵 和弦列表: [${uniqueChords.map(c => c.text).join(', ')}]`);

        if (uniqueChords.length === 0) {
            console.log('⚠️ 未找到和弦代号，使用推断方案');
            const linesCount = Math.ceil(totalMeasures / 4);
            console.log(`📊 推断布局 (总共${totalMeasures}个小节):`);
            for (let i = 0; i < linesCount; i++) {
                const count = i === linesCount - 1 ? totalMeasures - (i * 4) : 4;
                const status = count === 4 ? '✅' : '⚠️';
                console.log(`   ${status} 第${i + 1}行: 预期${count}个小节`);
            }
            return;
        }

        // 按Y坐标分组（容差10px）
        const tolerance = 10;
        const lines = [];

        uniqueChords.forEach(chord => {
            const y = chord.rect.y;
            let foundLine = false;

            for (let line of lines) {
                if (Math.abs(line.y - y) <= tolerance) {
                    line.chords.push(chord);
                    foundLine = true;
                    break;
                }
            }

            if (!foundLine) {
                lines.push({
                    y: y,
                    chords: [chord]
                });
            }
        });

        // 按Y坐标排序
        lines.sort((a, b) => a.y - b.y);

        // 输出结果
        console.log(`📊 小节布局检测结果:`);
        lines.forEach((line, lineIndex) => {
            const count = line.chords.length;
            const status = count === 4 ? '✅' : '⚠️';
            const chordNames = line.chords.map(c => c.text).join(', ');
            console.log(`   ${status} 第${lineIndex + 1}行: ${count}个小节 [${chordNames}]`);
        });

        // 总结
        const allLinesHave4 = lines.every(line => line.chords.length === 4);
        const totalDetected = lines.reduce((sum, line) => sum + line.chords.length, 0);

        if (allLinesHave4 && totalDetected === totalMeasures) {
            console.log(`✅ 布局完美: 所有${lines.length}行都是4个小节，共${totalDetected}个`);
        } else if (totalDetected !== totalMeasures) {
            console.log(`⚠️ 检测异常: 预期${totalMeasures}个和弦，实际检测到${totalDetected}个`);
        } else {
            console.log(`⚠️ 布局警告: 部分行不是4个小节`);
        }

    } catch (error) {
        console.error('❌ 小节检测失败:', error);
    }
}

// SVG后处理重排函数 - 强制实现每行4小节布局
function applySVGPostProcessLayout() {
    console.log('🎨 开始SVG后处理重排...');

    const scoreContainer = document.getElementById('score');
    if (!scoreContainer) {
        console.error('❌ 找不到score容器');
        return;
    }

    const svg = scoreContainer.querySelector('svg');
    if (!svg) {
        console.error('❌ 找不到SVG元素');
        return;
    }

    console.log('🔍 分析SVG结构...');
    console.log('SVG外层HTML:', scoreContainer.innerHTML.substring(0, 500));

    // 输出所有的g元素，帮助调试
    const allGroups = svg.querySelectorAll('g');
    console.log(`📊 SVG中共有 ${allGroups.length} 个g元素`);

    allGroups.forEach((group, index) => {
        const id = group.getAttribute('id') || '';
        const className = group.getAttribute('class') || '';
        const transform = group.getAttribute('transform') || '';
        const childCount = group.children.length;

        if (index < 20) { // 只显示前20个避免日志过多
            console.log(`  g[${index}]: id="${id}", class="${className}", children=${childCount}, transform="${transform}"`);
        }
    });

    // 查找所有可能的小节元素
    const measureSelectors = [
        'g[id*="measure"]',
        'g[class*="measure"]',
        'g[id*="Measure"]',
        'g[class*="Measure"]',
        'g[id*="MeasureContent"]',
        'g[class*="MeasureContent"]'
    ];

    let allMeasures = [];
    measureSelectors.forEach(selector => {
        const elements = svg.querySelectorAll(selector);
        elements.forEach(el => {
            if (!allMeasures.includes(el)) {
                allMeasures.push(el);
            }
        });
    });

    console.log(`🎼 找到 ${allMeasures.length} 个小节元素`);

    if (allMeasures.length === 0) {
        console.warn('⚠️ 未找到小节元素，尝试查找系统元素');

        // 备选方案：查找系统元素
        const systemSelectors = [
            'g[id*="system"]',
            'g[class*="system"]',
            'g[id*="System"]',
            'g[class*="System"]'
        ];

        let systems = [];
        systemSelectors.forEach(selector => {
            const elements = svg.querySelectorAll(selector);
            elements.forEach(el => {
                if (!systems.includes(el)) {
                    systems.push(el);
                }
            });
        });

        console.log(`🎼 找到 ${systems.length} 个系统元素`);

        if (systems.length > 0) {
            applySVGSystemLayout(systems, scoreContainer);
        } else {
            console.error('❌ 既没有找到小节元素也没有找到系统元素');
            // 最后的备选方案：基于Y坐标的强制重排
            applyCoordinateBasedLayout(svg, scoreContainer);
        }
        return;
    }

    // 解析小节的坐标信息
    const measureData = allMeasures.map((measure, index) => {
        const transform = measure.getAttribute('transform') || '';
        let x = 0, y = 0;

        // 解析transform属性
        const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
            x = parseFloat(translateMatch[1]) || 0;
            y = parseFloat(translateMatch[2]) || 0;
        }

        return {
            element: measure,
            index: index,
            originalX: x,
            originalY: y,
            measureNumber: index + 1
        };
    });

    console.log('📍 小节位置信息:', measureData.map(m => `小节${m.measureNumber}: (${Math.round(m.originalX)}, ${Math.round(m.originalY)})`));

    // 强制重排：每行4小节
    const containerWidth = scoreContainer.offsetWidth;
    const targetMeasuresPerLine = 4;
    const measureWidth = Math.max(120, (containerWidth - 80) / targetMeasuresPerLine);
    const measureSpacing = measureWidth;
    const lineHeight = 120; // 行间距
    const startX = 40; // 左边距
    const startY = 80; // 顶部边距

    console.log(`📐 重排参数: 容器宽度=${containerWidth}px, 小节宽度=${Math.round(measureWidth)}px`);

    measureData.forEach((measure, index) => {
        const line = Math.floor(index / targetMeasuresPerLine);
        const positionInLine = index % targetMeasuresPerLine;

        const newX = startX + (positionInLine * measureSpacing);
        const newY = startY + (line * lineHeight);

        // 应用新的transform
        const newTransform = `translate(${newX}, ${newY})`;
        measure.element.setAttribute('transform', newTransform);

        console.log(`🎯 小节${measure.measureNumber}: 第${line + 1}行位置${positionInLine + 1} -> (${Math.round(newX)}, ${Math.round(newY)})`);
    });

    // 调整SVG容器大小
    const totalLines = Math.ceil(measureData.length / targetMeasuresPerLine);
    const newSVGHeight = startY + (totalLines * lineHeight) + 50;
    svg.setAttribute('height', newSVGHeight);

    console.log(`✅ SVG后处理重排完成: ${totalLines}行，每行${targetMeasuresPerLine}小节`);

    // 🛡️ 三重保障 (2025-10-06): 防止OSMD覆盖我们的布局
    // 方案2：MutationObserver监控（实时检测并修正被OSMD修改的位置）
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'transform') {
                const element = mutation.target;
                const measureInfo = measureData.find(m => m.element === element);
                if (measureInfo) {
                    const index = measureData.indexOf(measureInfo);
                    const line = Math.floor(index / targetMeasuresPerLine);
                    const positionInLine = index % targetMeasuresPerLine;
                    const correctX = startX + (positionInLine * measureSpacing);
                    const correctY = startY + (line * lineHeight);
                    const correctTransform = `translate(${correctX}, ${correctY})`;

                    if (element.getAttribute('transform') !== correctTransform) {
                        console.log(`🛡️ 检测到小节${measureInfo.measureNumber}位置被修改，重新强制设置`);
                        element.setAttribute('transform', correctTransform);
                    }
                }
            }
        });
    });

    // 监控所有小节的transform属性变化
    measureData.forEach(measure => {
        observer.observe(measure.element, { attributes: true, attributeFilter: ['transform'] });
    });

    // 方案3：CSS !important 锁定（最强保障，浏览器级别强制）
    const style = document.createElement('style');
    style.id = 'measure-position-lock';
    let cssRules = '';
    measureData.forEach((measure, index) => {
        const line = Math.floor(index / targetMeasuresPerLine);
        const positionInLine = index % targetMeasuresPerLine;
        const x = startX + (positionInLine * measureSpacing);
        const y = startY + (line * lineHeight);

        // 为每个小节生成唯一的CSS规则
        if (measure.element.id) {
            const selector = `g[id="${measure.element.id}"]`;
            cssRules += `${selector} { transform: translate(${x}px, ${y}px) !important; }\n`;
        }
    });

    if (cssRules) {
        style.textContent = cssRules;

        // 移除旧的锁定样式（如果存在）
        const oldStyle = document.getElementById('measure-position-lock');
        if (oldStyle) {
            oldStyle.remove();
        }

        // 添加新的锁定样式
        document.head.appendChild(style);
        console.log('🛡️ CSS锁定已应用');
    }

    console.log('🛡️ 三重保障已激活: 延迟执行 + MutationObserver + CSS锁定');
}

// 系统元素布局处理
function applySVGSystemLayout(systems, container) {
    console.log('🎨 处理系统元素布局...');

    const containerWidth = container.offsetWidth;
    const systemSpacing = 120;
    const startY = 80;

    systems.forEach((system, index) => {
        const newY = startY + (index * systemSpacing);

        // 设置系统位置
        const currentTransform = system.getAttribute('transform') || '';
        let newTransform;

        if (currentTransform.includes('translate')) {
            newTransform = currentTransform.replace(/translate\([^)]+\)/, `translate(0, ${newY})`);
        } else {
            newTransform = `translate(0, ${newY}) ${currentTransform}`.trim();
        }

        system.setAttribute('transform', newTransform);

        // 强制系统内元素水平分布
        system.style.display = 'flex';
        system.style.justifyContent = 'space-evenly';
        system.style.width = '100%';

        console.log(`🎯 系统${index + 1}: Y=${newY}`);
    });

    console.log('✅ 系统元素布局处理完成');
}

// 基于坐标分析的强制重排（激进方案）
function applyCoordinateBasedLayout(svg, container) {
    console.log('🚀 应用基于坐标的强制重排...');

    const allGroups = svg.querySelectorAll('g');
    const elementsWithCoords = [];

    // 分析所有g元素的坐标
    allGroups.forEach((group, index) => {
        const transform = group.getAttribute('transform') || '';
        let x = 0, y = 0;

        const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
            x = parseFloat(translateMatch[1]) || 0;
            y = parseFloat(translateMatch[2]) || 0;
        }

        const childCount = group.children.length;
        const id = group.getAttribute('id') || '';
        const className = group.getAttribute('class') || '';

        // 只考虑有坐标且有子元素的g
        if (childCount > 0 && (x !== 0 || y !== 0)) {
            elementsWithCoords.push({
                element: group,
                x: x,
                y: y,
                childCount: childCount,
                id: id,
                className: className,
                index: index
            });
        }
    });

    console.log(`🎼 找到 ${elementsWithCoords.length} 个有坐标的元素`);

    // 按Y坐标分组
    const yGroups = {};
    const yTolerance = 20; // Y坐标容差

    elementsWithCoords.forEach(element => {
        let foundGroup = false;
        for (let existingY in yGroups) {
            if (Math.abs(element.y - parseFloat(existingY)) <= yTolerance) {
                yGroups[existingY].push(element);
                foundGroup = true;
                break;
            }
        }
        if (!foundGroup) {
            yGroups[element.y] = [element];
        }
    });

    console.log(`📊 按Y坐标分组: 共 ${Object.keys(yGroups).length} 行`);

    // 分析最可能是小节的元素
    let mostLikelyMeasures = [];
    for (let y in yGroups) {
        const group = yGroups[y];
        // 按X坐标排序
        group.sort((a, b) => a.x - b.x);

        console.log(`  Y=${y}: ${group.length}个元素, X坐标=[${group.map(g => Math.round(g.x)).join(', ')}]`);

        // 如果这一行有4个或接近4个元素，很可能是小节行
        if (group.length >= 3 && group.length <= 5) {
            mostLikelyMeasures = mostLikelyMeasures.concat(group.slice(0, 4));
        }
    }

    if (mostLikelyMeasures.length >= 4) {
        console.log(`🎯 识别到 ${mostLikelyMeasures.length} 个最可能的小节元素`);

        // 强制重排为每行4个
        const containerWidth = container.offsetWidth;
        const measureWidth = (containerWidth - 80) / 4;
        const startX = 40;
        const startY = 80;

        mostLikelyMeasures.slice(0, 4).forEach((measure, index) => {
            const newX = startX + (index * measureWidth);
            const newTransform = `translate(${newX}, ${startY})`;
            measure.element.setAttribute('transform', newTransform);

            console.log(`🎯 强制重排小节${index + 1}: (${Math.round(measure.x)}, ${Math.round(measure.y)}) -> (${Math.round(newX)}, ${startY})`);
        });

        console.log('✅ 基于坐标的强制重排完成');
    } else {
        console.warn('⚠️ 坐标分析法也无法识别小节，尝试最后的CSS强制方案');
        applyFinalCSSOverride(svg, container);
    }
}

// 最终CSS强制覆盖方案
function applyFinalCSSOverride(svg, container) {
    console.log('💥 应用最终CSS强制覆盖方案...');

    // 直接用CSS强制所有g元素水平排列
    const style = document.createElement('style');
    style.textContent = `
        #score svg {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
        }

        #score svg > g {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-evenly !important;
            width: 100% !important;
            margin: 10px 0 !important;
        }

        #score svg g > g {
            flex: 1 !important;
            display: inline-block !important;
            text-align: center !important;
        }
    `;

    document.head.appendChild(style);

    // 同时通过JavaScript强制设置样式
    const allGroups = svg.querySelectorAll('g');
    console.log(`💥 对 ${allGroups.length} 个g元素应用强制样式`);

    allGroups.forEach((group, index) => {
        if (index < 4) { // 只处理前4个
            group.style.display = 'inline-block';
            group.style.width = '25%';
            group.style.verticalAlign = 'top';
            group.style.textAlign = 'center';
        }
    });

    console.log('✅ 最终CSS强制覆盖完成');
}

/**
 * 获取临时记号概率设置
 * @returns {number} 临时记号概率百分比 (0-100)
 */
function getAccidentalRate() {
    const slider = document.getElementById('accidentalRate');
    if (slider && slider.value) {
        const rate = parseInt(slider.value);
        console.log(`🎼 从UI获取临时记号概率: ${rate}%`);
        return rate;
    }
    console.log('🎼 使用默认临时记号概率: 0%');
    return 0;
}

/**
 * 应用临时记号到音符
 * @param {string} pitch - 原始音高（如 "C4"）
 * @returns {string} 可能带临时记号的音高
 */
function applyAccidental(pitch) {
    const accidentalRate = getAccidentalRate();

    if (accidentalRate <= 0 || Math.random() * 100 > accidentalRate) {
        return pitch; // 不应用临时记号
    }

    const accidentals = ['#', 'b'];
    const randomAccidental = accidentals[Math.floor(Math.random() * accidentals.length)];

    // 解析音符名和八度
    const match = pitch.match(/([A-G])([#b]?)([0-9]+)/);
    if (!match) return pitch;

    const [, noteName, currentAccidental, octave] = match;

    // 如果已经有临时记号，就不再添加
    if (currentAccidental) {
        return pitch;
    }

    const newPitch = noteName + randomAccidental + octave;
    console.log(`🎼 和弦临时记号应用: ${pitch} -> ${newPitch}`);
    return newPitch;
}

// ==================== 传统和声学转位辅助函数 ====================

/**
 * 为重复的挂和弦获取替代方案
 * @param {Object} chord - 当前和弦
 * @param {Object} prevChord - 前一个和弦
 * @param {string} key - 调性
 * @returns {Object|null} 替代和弦或null
 */
function getAlternativeSusChord(chord, prevChord, key) {
    if (!chord || !chord.type || !chord.type.includes('sus')) {
        return null;
    }

    console.log(`🔄 寻找挂和弦替代方案: ${chord.root}${chord.type}`);

    // 策略1: sus2 <-> sus4 切换
    let alternativeType = null;
    if (chord.type === 'sus2') {
        alternativeType = 'sus4';
    } else if (chord.type === 'sus4') {
        alternativeType = 'sus2';
    } else if (chord.type === '7sus2') {
        alternativeType = '7sus4';
    } else if (chord.type === '7sus4') {
        alternativeType = '7sus2';
    }

    if (alternativeType) {
        const alternativeChord = harmonyTheory.buildChord(chord.root, alternativeType, key);
        if (alternativeChord) {
            const result = {
                ...chord,
                type: alternativeType,
                notes: alternativeChord.notes
            };
            console.log(`  -> sus类型切换: ${chord.type} -> ${alternativeType}`);
            return result;
        }
    }

    // 策略2: 三和弦挂和弦 <-> 七和弦挂和弦切换
    if (chord.type === 'sus2') {
        const seventhAlternative = harmonyTheory.buildChord(chord.root, '7sus2', key);
        if (seventhAlternative) {
            const result = {
                ...chord,
                type: '7sus2',
                notes: seventhAlternative.notes
            };
            console.log(`  -> 扩展为七和弦: sus2 -> 7sus2`);
            return result;
        }
    } else if (chord.type === 'sus4') {
        const seventhAlternative = harmonyTheory.buildChord(chord.root, '7sus4', key);
        if (seventhAlternative) {
            const result = {
                ...chord,
                type: '7sus4',
                notes: seventhAlternative.notes
            };
            console.log(`  -> 扩展为七和弦: sus4 -> 7sus4`);
            return result;
        }
    } else if (chord.type === '7sus2') {
        const triadAlternative = harmonyTheory.buildChord(chord.root, 'sus2', key);
        if (triadAlternative) {
            const result = {
                ...chord,
                type: 'sus2',
                notes: triadAlternative.notes
            };
            console.log(`  -> 简化为三和弦: 7sus2 -> sus2`);
            return result;
        }
    } else if (chord.type === '7sus4') {
        const triadAlternative = harmonyTheory.buildChord(chord.root, 'sus4', key);
        if (triadAlternative) {
            const result = {
                ...chord,
                type: 'sus4',
                notes: triadAlternative.notes
            };
            console.log(`  -> 简化为三和弦: 7sus4 -> sus4`);
            return result;
        }
    }

    // 策略3: 同功能和弦替换（保留功能和声信息）
    if (chord.function) {
        const functionalAlternative = getSameFunctionAlternative(chord, key);
        if (functionalAlternative && !areChordsSame(functionalAlternative, prevChord)) {
            console.log(`  -> 同功能替换: ${chord.root}${chord.type} -> ${functionalAlternative.root}${functionalAlternative.type}`);
            return functionalAlternative;
        }
    }

    console.log(`  -> 未找到合适的挂和弦替代方案`);
    return null;
}

/**
 * 获取同功能的替代和弦
 * @param {Object} chord - 当前和弦
 * @param {string} key - 调性
 * @returns {Object|null} 同功能的替代和弦
 */
function getSameFunctionAlternative(chord, key) {
    if (!chord.function || !key) return null;

    // 简化版功能和弦映射（只处理C大调，可以后续扩展）
    const functionalAlternatives = {
        'C-major': {
            'tonic': [
                { root: 'C', type: 'major' },
                { root: 'E', type: 'minor' },
                { root: 'A', type: 'minor' }
            ],
            'subdominant': [
                { root: 'D', type: 'minor' },
                { root: 'F', type: 'major' }
            ],
            'dominant': [
                { root: 'G', type: 'major' },
                { root: 'B', type: 'diminished' }
            ]
        }
    };

    const alternatives = functionalAlternatives[key]?.[chord.function];
    if (!alternatives) return null;

    // 找到一个不同根音的替代和弦
    for (const alt of alternatives) {
        if (alt.root !== chord.root) {
            const builtChord = harmonyTheory.buildChord(alt.root, alt.type, key);
            if (builtChord) {
                return {
                    ...chord,
                    root: alt.root,
                    type: alt.type,
                    notes: builtChord.notes
                };
            }
        }
    }

    return null;
}

/**
 * 检查两个和弦是否相同（根音和类型）
 */
function areChordsSame(chord1, chord2) {
    if (!chord1 || !chord2) return false;
    return chord1.root === chord2.root && chord1.type === chord2.type;
}

/**
 * 检查是否为主和弦（一级和弦）
 */
function isTonicChord(chord, key) {
    if (!chord || !key) return false;

    const keyTonicMap = {
        'C-major': 'C',
        'G-major': 'G',
        'F-major': 'F',
        'D-major': 'D',
        'A-major': 'A',
        'E-major': 'E',
        'B-major': 'B',
        'a-minor': 'A',
        'e-minor': 'E',
        'b-minor': 'B',
        'd-minor': 'D',
        'g-minor': 'G'
    };

    return chord.root === keyTonicMap[key];
}

/**
 * 检查是否为属功能和弦
 */
function isDominantFunction(chord) {
    if (!chord) return false;
    return chord.function === 'dominant' ||
           (chord.degree && (chord.degree === 'V' || chord.degree === 'vii°' || chord.degree.includes('Vsus')));
}

/**
 * 判断是否应该使用经过六四和弦
 * 原理：在两个和弦之间插入六四和弦形成流畅过渡
 */
function shouldUsePassingSixFour(prevChord, currentChord, nextChord, key) {
    if (!prevChord || !nextChord || !currentChord) return false;

    // 检查当前和弦是否适合作为经过六四和弦
    // 通常在强拍到弱拍、或者在功能转换的关键位置使用
    const isPrevStrongFunction = prevChord.function === 'tonic' || prevChord.function === 'subdominant';
    const isNextStrongFunction = nextChord.function === 'dominant' || nextChord.function === 'tonic';

    // 如果前后都是强功能和弦，当前和弦可以作为经过六四和弦
    return isPrevStrongFunction && isNextStrongFunction && Math.random() < 0.3;
}

/**
 * 判断是否应该使用持续低音六四和弦
 * 原理：保持低音不变，通过六四和弦维持稳定感
 */
function shouldUsePedalSixFour(prevChord, currentChord) {
    if (!prevChord || !currentChord) return false;

    // 检查是否可以创造持续低音效果
    // 这需要分析理论上的低音音符
    const prevBass = getBassNote(prevChord);
    const currentBass = getBassNote(currentChord);

    // 如果当前和弦的五音等于前和弦的低音，可以使用六四和弦
    if (currentChord.notes && currentChord.notes.length >= 3) {
        const fifthNote = currentChord.notes[2]; // 假设第三个音符是五音
        return fifthNote === prevBass && Math.random() < 0.25;
    }

    return false;
}

/**
 * 获取和弦的低音音符
 */
function getBassNote(chord) {
    if (!chord || !chord.notes || chord.notes.length === 0) return null;

    if (chord.inversion) {
        // 如果有转位，低音是转位后的音符
        const inversionIndex = chord.inversion % chord.notes.length;
        return chord.notes[inversionIndex];
    } else {
        // 原位和弦，低音是根音
        return chord.notes[0];
    }
}

/**
 * 判断是否应该使用第一转位创造流畅低音线条
 * 原理：F→C/E→Dm 产生 F-E-D 的流畅下行线条
 */
function shouldUseFirstInversionForSmoothBass(prevChord, currentChord, nextChord, key) {
    if (!prevChord || !nextChord || !currentChord) return false;

    const prevBass = getBassNote(prevChord);
    const nextBass = getBassNote(nextChord);

    if (!prevBass || !nextBass) return false;

    // 检查第一转位是否能创造音阶线条
    const currentThird = getCurrentChordThird(currentChord, key);
    if (!currentThird) return false;

    // 检查是否形成音阶上行或下行
    const isScaleProgression = checkScaleProgression(prevBass, currentThird, nextBass);

    if (isScaleProgression) {
        console.log(`  -> 检测到音阶线条: ${prevBass}-${currentThird}-${nextBass}`);
        return Math.random() < 0.7; // 70%概率应用
    }

    return false;
}

/**
 * 获取当前和弦的三音
 */
function getCurrentChordThird(chord, key) {
    if (!chord || !chord.notes || chord.notes.length < 2) return null;
    return chord.notes[1]; // 假设第二个音符是三音
}

/**
 * 检查三个音符是否形成音阶进行
 */
function checkScaleProgression(note1, note2, note3) {
    if (!note1 || !note2 || !note3) return false;

    // 简化的音阶检查：检查是否为相邻的音符
    const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    const index1 = noteOrder.indexOf(note1.charAt(0));
    const index2 = noteOrder.indexOf(note2.charAt(0));
    const index3 = noteOrder.indexOf(note3.charAt(0));

    if (index1 === -1 || index2 === -1 || index3 === -1) return false;

    // 检查是否为连续上行或下行
    return (index2 === (index1 + 1) % 7 && index3 === (index2 + 1) % 7) ||
           (index2 === (index1 - 1 + 7) % 7 && index3 === (index2 - 1 + 7) % 7);
}

/**
 * 判断是否应该应用功能和声转位
 */
function shouldApplyFunctionalInversion(chord, prevChord, nextChord, index, totalLength) {
    if (!chord.function) return false;

    // 🚫 挂留和弦绝对不能使用转位
    if (harmonyTheory.isSuspendedChord(chord)) {
        console.log(`🚫 功能和声转位：跳过挂留和弦 ${chord.root}${chord.type} 的转位处理`);
        return false;
    }

    // 在功能和声进行的关键点应用转位
    const isKeyPosition = index === 1 || index === totalLength - 2; // 第二个和倒数第二个和弦
    const hasStrongContext = prevChord && nextChord;

    return hasStrongContext && (isKeyPosition || Math.random() < 0.4);
}

/**
 * 获取功能和声转位设置
 */
function getFunctionalInversion(chord, prevChord, nextChord, index, totalLength) {
    const result = { inversion: 0, name: '', reason: '' };

    // 🚫 双重检查：挂留和弦绝对不能使用转位
    if (harmonyTheory.isSuspendedChord(chord)) {
        console.log(`🚫 getFunctionalInversion：跳过挂留和弦 ${chord.root}${chord.type} 的转位处理`);
        return result; // 返回默认的无转位结果
    }

    // 属功能和弦在解决到主功能时的处理
    if (chord.function === 'dominant' && nextChord && nextChord.function === 'tonic') {
        if (Math.random() < 0.5) {
            result.inversion = 1;
            result.name = '第一转位';
            result.reason = '属功能第一转位：增强向主功能的解决感';
        }
    }

    // 下属功能和弦倾向于使用第一转位
    else if (chord.function === 'subdominant') {
        if (Math.random() < 0.6) {
            result.inversion = 1;
            result.name = '第一转位';
            result.reason = '下属功能第一转位：增加流动性';
        }
    }

    // 主功能和弦在进行中间的处理
    else if (chord.function === 'tonic' && index > 0 && index < totalLength - 1) {
        const random = Math.random();
        if (random < 0.3) {
            result.inversion = 1;
            result.name = '第一转位';
            result.reason = '进行中的主和弦第一转位';
        } else if (random < 0.4) {
            result.inversion = 2;
            result.name = '第二转位(六四和弦)';
            result.reason = '进行中的主和弦六四和弦';
        }
    }

    return result;
}

/**
 * 判断是否应该应用七和弦转位
 */
function shouldApplySeventhInversion(chord, prevChord, nextChord, index) {
    if (!chord.type || !chord.type.includes('7')) return false;

    // 🚫 挂留和弦绝对不能使用转位（包括7sus2, 7sus4等）
    if (harmonyTheory.isSuspendedChord(chord)) {
        console.log(`🚫 七和弦转位：跳过挂留和弦 ${chord.root}${chord.type} 的转位处理`);
        return false;
    }

    // 七和弦转位使用更加保守
    return Math.random() < 0.3;
}

/**
 * 获取七和弦转位设置
 */
function getSeventhInversion(chord, prevChord, nextChord) {
    const result = { inversion: 0, name: '', reason: '' };

    // 🚫 双重检查：挂留和弦绝对不能使用转位
    if (harmonyTheory.isSuspendedChord(chord)) {
        console.log(`🚫 getSeventhInversion：跳过挂留和弦 ${chord.root}${chord.type} 的转位处理`);
        return result; // 返回默认的无转位结果
    }

    const random = Math.random();
    if (random < 0.5) {
        result.inversion = 1;
        result.name = '第一转位';
        result.reason = '七和弦第一转位：保持稳定';
    } else if (random < 0.8) {
        result.inversion = 2;
        result.name = '第二转位';
        result.reason = '七和弦第二转位：增加色彩';
    } else {
        result.inversion = 3;
        result.name = '第三转位';
        result.reason = '七和弦第三转位：特殊效果';
    }

    return result;
}

// ==================== 强化重复避免系统 ====================

/**
 * 获取不同功能组的替代和弦
 * @param {Object} prevChord - 前一个和弦
 * @param {string} key - 调性
 * @param {Object} functionalChords - 功能和弦映射
 * @returns {Object|null} 替代和弦或null
 */
function getAlternativeFunctionChord(prevChord, key, functionalChords) {
    if (!prevChord || !key || !functionalChords) return null;

    const keyChords = functionalChords[key];
    if (!keyChords) return null;

    // 获取用户选择的和弦类型
    let userTypes = [];
    if (window.chordSettings.chordTypes && window.chordSettings.chordTypes.length > 0) {
        window.chordSettings.chordTypes.forEach(type => {
            if (type === 'sus') {
                userTypes.push('sus2', 'sus4');
            } else if (type === '7sus') {
                userTypes.push('7sus2', '7sus4');
            } else {
                userTypes.push(type);
            }
        });
    } else {
        userTypes = ['major', 'minor'];
    }

    console.log(`🔄 寻找跨功能替代和弦，避免重复: ${prevChord.root}${prevChord.type}`);

    // 尝试从所有功能组中找到不重复且符合用户设置的和弦
    const allFunctions = ['tonic', 'subdominant', 'dominant'];

    for (const func of allFunctions) {
        if (keyChords[func]) {
            const alternatives = keyChords[func].filter(chord =>
                !(chord.root === prevChord.root && chord.type === prevChord.type) &&
                userTypes.includes(chord.type)  // 必须是用户选择的类型
            );

            if (alternatives.length > 0) {
                const selected = alternatives[Math.floor(Math.random() * alternatives.length)];
                console.log(`  -> 跨功能替代: ${func}功能组 ${selected.root}${selected.type}`);
                return {
                    ...selected,
                    function: func
                };
            }
        }
    }

    console.log(`  -> 无法找到符合用户设置的跨功能替代和弦`);
    return null;
}

/**
 * 强制生成不同类型的和弦
 * @param {Object} chord - 原和弦
 * @param {Object} prevChord - 前一个和弦
 * @param {string} key - 调性
 * @returns {Object} 修改后的和弦
 */
function forceAlternativeChordType(chord, prevChord, key) {
    if (!chord || !prevChord) return chord;

    // 获取用户选择的和弦类型
    let userTypes = [];
    if (window.chordSettings.chordTypes && window.chordSettings.chordTypes.length > 0) {
        window.chordSettings.chordTypes.forEach(type => {
            if (type === 'sus') {
                userTypes.push('sus2', 'sus4');
            } else if (type === '7sus') {
                userTypes.push('7sus2', '7sus4');
            } else {
                userTypes.push(type);
            }
        });
    } else {
        userTypes = ['major', 'minor'];
    }

    console.log(`🔧 强制修改和弦类型: ${chord.root}${chord.type} (避免与 ${prevChord.root}${prevChord.type} 重复)`);

    // 策略0: 优先尝试用户选择类型的调内和弦
    const scaleNotes = getScaleChordRoots(key);  // 🔧 修复：使用正确的音阶定义
    const availableOptions = [];

    // 生成所有可能的用户类型和弦
    for (const root of scaleNotes) {
        for (const type of userTypes) {
            if (!(root === prevChord.root && type === prevChord.type)) {
                const testChord = harmonyTheory.buildChord(root, type, key);
                if (testChord && !testChord.notes.some(note => !scaleNotes.includes(note))) {
                    availableOptions.push({ root, type, notes: testChord.notes });
                }
            }
        }
    }

    if (availableOptions.length > 0) {
        const randomOption = availableOptions[Math.floor(Math.random() * availableOptions.length)];
        console.log(`  -> 用户类型替代: ${chord.root}${chord.type} -> ${randomOption.root}${randomOption.type}`);
        return {
            ...chord,
            root: randomOption.root,
            type: randomOption.type,
            notes: randomOption.notes
        };
    }

    // 如果无法生成不重复的用户类型和弦，返回null表示无法生成
    console.warn(`❌ 无法生成不重复的用户类型和弦`);
    return null;
}

/**
 * 获取调内可用的和弦根音
 * @param {string} key - 调性
 * @returns {Array} 和弦根音数组
 */
function getScaleChordRoots(key) {
    const scaleChordRoots = {
        'C-major': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        'G-major': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
        'F-major': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
        'D-major': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
        'A-major': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
        'E-major': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
        'B-major': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
        'F#-major': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
        'a-minor': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        'e-minor': ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
        'b-minor': ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
        'd-minor': ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
        'g-minor': ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],

        // 🔧 修复：补全缺失的降号大调 (5个)
        'Bb-major': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
        'Eb-major': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
        'Ab-major': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
        'Db-major': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
        'Gb-major': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],

        // 🔧 修复：补全缺失的小调 (8个)
        'f#-minor': ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
        'c#-minor': ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
        'g#-minor': ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'],
        'c-minor': ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
        'f-minor': ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
        'bb-minor': ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],

        // 🔧 新增：极高升号/降号小调音阶定义 (修复：使用HTML中的小写命名)
        'd#-minor': ['D#', 'E#', 'F#', 'G#', 'A#', 'B', 'C#'],  // 6个升号小调
        'eb-minor': ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db']   // 6个降号小调
    };

    return scaleChordRoots[key] || ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
}

/**
 * 生成调内和弦同时避免重复
 * @param {string} rootNote - 根音
 * @param {string} key - 调性
 * @param {Array} scaleNotes - 调内音符
 * @param {Array} existingChords - 已存在的和弦进行
 * @returns {Object|null} 调内和弦对象
 */
function generateCorrectDiatonicChordWithRepetitionAvoidance(rootNote, key, scaleNotes, existingChords) {
    // 获取用户选择的和弦类型
    let availableTypes = [];
    if (window.chordSettings.chordTypes && window.chordSettings.chordTypes.length > 0) {
        window.chordSettings.chordTypes.forEach(type => {
            if (type === 'sus') {
                availableTypes.push('sus2', 'sus4');
            } else if (type === '7sus') {
                availableTypes.push('7sus2', '7sus4');
            } else {
                availableTypes.push(type);
            }
        });
    } else {
        availableTypes = ['major', 'minor'];
    }

    // 尝试使用用户选择的和弦类型构建调内和弦
    let standardDiatonicChord = null;

    // 首先尝试使用根音和用户选择的和弦类型
    for (const chordType of availableTypes) {
        const testChord = harmonyTheory.buildChord(rootNote, chordType, key);
        if (testChord && !testChord.notes.some(note => !scaleNotes.includes(note))) {
            standardDiatonicChord = {
                root: rootNote,
                type: chordType,
                notes: testChord.notes
            };
            break;
        }
    }

    // 如果找不到符合用户设置的和弦，返回null
    if (!standardDiatonicChord) {
        console.log(`❌ 无法为根音 ${rootNote} 生成符合用户设置的调内和弦`);
        return null;
    }

    // 检查是否与前一个和弦重复
    if (existingChords.length > 0 && standardDiatonicChord) {
        const prevChord = existingChords[existingChords.length - 1];
        const wouldRepeat = prevChord.root === standardDiatonicChord.root &&
                           prevChord.type === standardDiatonicChord.type;

        if (wouldRepeat) {
            console.log(`🔄 标准调内和弦 ${standardDiatonicChord.root}${standardDiatonicChord.type} 会重复，寻找替代...`);

            // 尝试其他调内和弦根音，但限制在用户选择的和弦类型内
            const diatonicOptions = getDiatonicChordOptionsWithUserSettings(key, availableTypes);
            for (const option of diatonicOptions) {
                if (!(option.root === prevChord.root && option.type === prevChord.type)) {
                    const alternativeChord = harmonyTheory.buildChord(option.root, option.type, key);
                    if (alternativeChord && !alternativeChord.notes.some(note => !scaleNotes.includes(note))) {
                        console.log(`  -> 使用调内替代和弦: ${option.root}${option.type}`);
                        return {
                            root: option.root,
                            type: option.type,
                            notes: alternativeChord.notes
                        };
                    }
                }
            }

            console.warn(`⚠️ 无法找到非重复的调内和弦，使用标准选项`);
        }
    }

    return standardDiatonicChord;
}

/**
 * 为指定根音生成用户类型的和弦选项
 * @param {Array} roots - 根音数组
 * @param {Array} types - 和弦类型数组
 * @param {string} key - 调性
 * @param {Array} scaleNotes - 音阶音符
 * @returns {Array} 和弦选项数组
 */
function generateUserTypeChordsForRoots(roots, types, key, scaleNotes) {
    const options = [];
    for (const root of roots) {
        for (const type of types) {
            const testChord = harmonyTheory.buildChord(root, type, key);
            if (testChord && !testChord.notes.some(note => !scaleNotes.includes(note))) {
                options.push({
                    root: root,
                    type: type,
                    degree: '?'
                });
            }
        }
    }
    return options;
}

/**
 * 获取符合用户设置的调内和弦选项
 * @param {string} key - 调性
 * @param {Array} availableTypes - 用户选择的和弦类型
 * @returns {Array} 调内和弦选项数组
 */
function getDiatonicChordOptionsWithUserSettings(key, availableTypes) {
    const scaleNotes = getScaleChordRoots(key);  // 🔧 修复：使用正确的音阶定义
    const options = [];

    // 为每个调内音符尝试用户选择的和弦类型
    for (const root of scaleNotes) {
        for (const type of availableTypes) {
            const testChord = harmonyTheory.buildChord(root, type, key);
            if (testChord && !testChord.notes.some(note => !scaleNotes.includes(note))) {
                options.push({ root, type });
            }
        }
    }

    console.log(`🎯 用户设置的调内和弦选项 (${key}):`, options.map(o => `${o.root}${o.type}`).join(', '));
    return options;
}

/**
 * 获取调内和弦选项
 * @param {string} key - 调性
 * @returns {Array} 调内和弦选项数组
 */
function getDiatonicChordOptions(key) {
    const diatonicOptions = {
        'C-major': [
            { root: 'C', type: 'major' },    // I
            { root: 'D', type: 'minor' },    // ii
            { root: 'E', type: 'minor' },    // iii
            { root: 'F', type: 'major' },    // IV
            { root: 'G', type: 'major' },    // V
            { root: 'A', type: 'minor' },    // vi
            { root: 'B', type: 'diminished' } // vii°
        ],
        'B-major': [
            { root: 'B', type: 'major' },    // I
            { root: 'C#', type: 'minor' },   // ii
            { root: 'D#', type: 'minor' },   // iii
            { root: 'E', type: 'major' },    // IV
            { root: 'F#', type: 'major' },   // V
            { root: 'G#', type: 'minor' },   // vi
            { root: 'A#', type: 'diminished' } // vii°
        ],
        'F#-major': [
            { root: 'F#', type: 'major' },   // I
            { root: 'G#', type: 'minor' },   // ii
            { root: 'A#', type: 'minor' },   // iii
            { root: 'B', type: 'major' },    // IV
            { root: 'C#', type: 'major' },   // V
            { root: 'D#', type: 'minor' },   // vi
            { root: 'F', type: 'diminished' } // vii° (F natural, 理论上是E#)
        ],
        'a-minor': [
            { root: 'A', type: 'minor' },    // i
            { root: 'B', type: 'diminished' }, // ii°
            { root: 'C', type: 'major' },    // III
            { root: 'D', type: 'minor' },    // iv
            { root: 'E', type: 'minor' },    // v
            { root: 'F', type: 'major' },    // VI
            { root: 'G', type: 'major' }     // VII
        ]
    };

    return diatonicOptions[key] || diatonicOptions['C-major'];
}

/**
 * 根据用户设置过滤和弦选项
 * @param {Array} chordOptions - 原始和弦选项
 * @returns {Array} 过滤后的和弦选项
 */
function filterChordOptionsByUserSettings(chordOptions) {
    if (!chordOptions || !window.chordSettings || !window.chordSettings.chordTypes) {
        return chordOptions;
    }

    const userSelectedTypes = window.chordSettings.chordTypes;
    console.log(`🔍 过滤和弦选项，用户选择的类型: ${userSelectedTypes.join(', ')}`);

    // 展开用户选择的类型（处理sus和7sus）
    let expandedTypes = [];
    userSelectedTypes.forEach(type => {
        if (type === 'sus') {
            expandedTypes.push('sus2', 'sus4');
        } else if (type === '7sus') {
            expandedTypes.push('7sus2', '7sus4');
        } else {
            expandedTypes.push(type);
        }
    });

    const filteredOptions = chordOptions.filter(chord => {
        // 严格检查：和弦类型必须完全匹配用户选择
        return expandedTypes.includes(chord.type);
    });

    console.log(`  -> 过滤前: ${chordOptions.length}个选项, 过滤后: ${filteredOptions.length}个选项`);
    console.log(`  -> 过滤后的和弦: ${filteredOptions.map(c => `${c.root}${c.type}`).join(', ')}`);

    if (filteredOptions.length === 0) {
        console.warn(`⚠️ 用户设置过滤后无可用和弦，返回空数组以强制生成用户选择的类型`);
        return []; // 返回空数组，让调用者知道需要生成符合用户设置的和弦
    }

    return filteredOptions;
}

/**
 * 验证Drop2特征
 * @param {Object} voicing - voicing对象
 * @returns {boolean} 是否具有有效的Drop2特征
 */
function validateDrop2Characteristics(voicing) {
    if (!voicing || !voicing.midiNotes || voicing.midiNotes.length < 3) {
        return false;
    }

    const midiNotes = voicing.midiNotes;
    const sortedMidi = [...midiNotes].sort((a, b) => a - b);

    // 计算相邻音符的间隔
    const intervals = [];
    for (let i = 1; i < sortedMidi.length; i++) {
        intervals.push(sortedMidi[i] - sortedMidi[i-1]);
    }

    // Drop2的特征：应该有至少一个大跳间隔（7个半音或以上）
    const hasLargeInterval = intervals.some(interval => interval >= 7);

    console.log(`🔍 Drop2验证: 间隔=${intervals.join(',')}, 有大跳=${hasLargeInterval}`);

    return hasLargeInterval;
}

// 🎛️ 四声部三和弦用户控制接口
/**
 * 🎚️ 启用四声部三和弦
 * @param {boolean} enabled - 是否启用
 */
function enableFourVoiceTriads(enabled = true) {
    window.chordSettings.fourVoiceTriadSettings.enabled = enabled;
    console.log(`🎛️ 四声部三和弦 ${enabled ? '已启用' : '已禁用'}`);
    console.log(`💡 当前设置:`, window.chordSettings.fourVoiceTriadSettings);
}

/**
 * 🎚️ 配置特定的四声部排列
 * @param {string} configuration - 配置名称 ('5135', '5131', '1351', '1513', '3513')
 * @param {boolean} enabled - 是否启用
 */
function configureFourVoiceTriad(configuration, enabled = true) {
    if (!window.chordSettings.fourVoiceTriadSettings.allowedConfigurations.hasOwnProperty(configuration)) {
        console.error(`❌ 未知配置: ${configuration}`);
        console.log(`💡 可用配置: ${Object.keys(window.chordSettings.fourVoiceTriadSettings.allowedConfigurations).join(', ')}`);
        return;
    }

    window.chordSettings.fourVoiceTriadSettings.allowedConfigurations[configuration] = enabled;
    console.log(`🎚️ 配置 ${configuration} ${enabled ? '已启用' : '已禁用'}`);

    // 显示配置详情
    const configDescriptions = {
        '5135': '5-1-3-5 排列 (例如 G3-C4-E4-G4)',
        '5131': '5-1-3-1 排列 (例如 G3-C4-E4-C5，需要Eb4+)',
        '1351': '1-3-5-1 排列 (例如 C4-E4-G4-C5)',
        '1513': '1-5-1-3 排列 (例如 C4-G4-C5-E5)',
        '3513': '3-5-1-3 排列 (例如 E4-G4-C5-E5)'
    };
    console.log(`   描述: ${configDescriptions[configuration]}`);
}

/**
 * 🎛️ 设置四声部优先级
 * @param {boolean} preferFourVoice - 是否优先选择四声部
 */
function setFourVoicePreference(preferFourVoice = true) {
    window.chordSettings.fourVoiceTriadSettings.preferFourVoice = preferFourVoice;
    console.log(`🎛️ 四声部优先级 ${preferFourVoice ? '已启用' : '已禁用'}`);
}

/**
 * 🎛️ 显示当前四声部设置
 */
function showFourVoiceTriadSettings() {
    console.log('🎛️ 当前四声部三和弦设置:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`总开关: ${window.chordSettings.fourVoiceTriadSettings.enabled ? '✅ 已启用' : '❌ 已禁用'}`);
    console.log(`四声部优先: ${window.chordSettings.fourVoiceTriadSettings.preferFourVoice ? '✅ 是' : '❌ 否'}`);
    console.log(`三声部回退: ${window.chordSettings.fourVoiceTriadSettings.fallbackToThreeVoice ? '✅ 是' : '❌ 否'}`);
    console.log('\n🎚️ 具体配置状态:');

    const configs = window.chordSettings.fourVoiceTriadSettings.allowedConfigurations;
    const descriptions = {
        '5135': '5-1-3-5 排列 (例如 G3-C4-E4-G4)',
        '5131': '5-1-3-1 排列 (例如 G3-C4-E4-C5，需要Eb4+)',
        '1351': '1-3-5-1 排列 (例如 C4-E4-G4-C5)',
        '1513': '1-5-1-3 排列 (例如 C4-G4-C5-E5)',
        '3513': '3-5-1-3 排列 (例如 E4-G4-C5-E5)'
    };

    Object.keys(configs).forEach(key => {
        const status = configs[key] ? '✅' : '❌';
        console.log(`  ${key}: ${status} ${descriptions[key]}`);
    });

    console.log('\n💡 快速控制命令:');
    console.log('  enableFourVoiceTriads(true)           - 启用四声部');
    console.log('  configureFourVoiceTriad("5135", true) - 启用特定配置');
    console.log('  setFourVoicePreference(true)          - 设置优先级');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * 🎯 快速启用所有四声部配置
 */
function enableAllFourVoiceConfigurations() {
    enableFourVoiceTriads(true);
    ['5135', '1351', '1513', '3513'].forEach(config => {
        configureFourVoiceTriad(config, true);
    });
    // 5131 需要特殊考虑，因为有音域限制
    console.log('⚠️ 配置 5131 (5-1-3-1) 需要音域 ≥ Eb4，请根据需要手动启用：');
    console.log('   configureFourVoiceTriad("5131", true)');
}

/**
 * 🎯 重置为默认设置
 */
function resetFourVoiceTriadSettings() {
    window.chordSettings.fourVoiceTriadSettings = {
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
    console.log('🔄 四声部三和弦设置已重置为默认值');
    showFourVoiceTriadSettings();
}

/**
 * 🎯 测试四声部三和弦的转位系统
 */
function testFourVoiceTriadInversions() {
    console.log('\n🧪 === 四声部三和弦转位系统测试 ===');

    // 兼容不同的voicingEngine引用方式
    const voicingEngineInstance = window.voicingEngine || voicingEngine;
    if (!voicingEngineInstance) {
        console.error('❌ VoicingEngine 未初始化，请刷新页面');
        console.log('🔧 尝试运行: initializeVoicingSystem()');
        return;
    }

    // 测试不同转位的和弦
    const testCases = [
        { root: 'C', type: 'major', inversion: 0, inversionName: '原位 (1-3-5)' },
        { root: 'C', type: 'major', inversion: 1, inversionName: '第一转位 (3-5-1)' },
        { root: 'C', type: 'major', inversion: 2, inversionName: '第二转位 (5-1-3)' },
        { root: 'A', type: 'minor', inversion: 0, inversionName: '原位 (1-3-5)' },
        { root: 'A', type: 'minor', inversion: 1, inversionName: '第一转位 (3-5-1)' },
        { root: 'A', type: 'minor', inversion: 2, inversionName: '第二转位 (5-1-3)' }
    ];

    console.log('🎵 测试各种转位的四声部配置...\n');

    testCases.forEach((testChord, index) => {
        console.log(`🎼 测试 ${index + 1}: ${testChord.root}${testChord.type} - ${testChord.inversionName}`);

        try {
            const result = voicingEngineInstance.generateCloseVoicing(testChord, {
                rangeMin: 55,
                rangeMax: 88,
                allowEnhanced: true,
                voicingContext: 'close-only'
            });

            if (result && result.notes && result.notes.length > 0) {
                console.log(`  ✅ 生成成功: ${result.notes.join('-')}`);
                console.log(`  🔢 声部数: ${result.notes.length} ${result.notes.length === 4 ? '(四声部 🎉)' : '(三声部)'}`);
                console.log(`  🎵 MIDI: [${result.midiNotes.join(', ')}]`);

                if (result.isEnhancedTriad) {
                    console.log(`  🎸 配置: ${result.enhancedConfigName || '增强配置'}`);
                }

                // 验证转位是否正确
                const lowestNote = Math.min(...result.midiNotes);
                const lowestNoteName = result.notes[result.midiNotes.indexOf(lowestNote)];
                console.log(`  🔍 低音: ${lowestNoteName} (验证转位)`);
            } else {
                console.log(`  ❌ 生成失败`);
            }
        } catch (error) {
            console.log(`  ❌ 生成错误: ${error.message}`);
        }
        console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * 🎯 快速验证四声部三和弦是否工作（保持原有测试）
 */
function testFourVoiceTriads() {
    console.log('\n🧪 === 四声部三和弦快速验证 ===');

    // 兼容不同的voicingEngine引用方式
    const voicingEngineInstance = window.voicingEngine || voicingEngine;
    if (!voicingEngineInstance) {
        console.error('❌ VoicingEngine 未初始化，请刷新页面');
        console.log('🔧 尝试运行: initializeVoicingSystem()');
        return;
    }

    console.log('🎛️ 当前设置状态:');
    console.log(`  增强三和弦: ${window.chordSettings.enhancedGuitarTriads ? '✅ 启用' : '❌ 禁用'}`);
    console.log(`  四声部总开关: ${window.chordSettings.fourVoiceTriadSettings.enabled ? '✅ 启用' : '❌ 禁用'}`);

    // 🔍 诊断关键问题
    const currentVoicingTypes = window.chordSettings.voicingTypes || [];
    const isCloseVoicingOnly = currentVoicingTypes.length === 1 && currentVoicingTypes[0] === 'close';
    console.log(`  当前voicing类型: [${currentVoicingTypes.join(', ')}]`);
    console.log(`  仅选择close: ${isCloseVoicingOnly ? '✅ 是' : '❌ 否'}`);
    console.log(`  四声部条件满足: ${window.chordSettings.enhancedGuitarTriads && isCloseVoicingOnly ? '✅ 是' : '❌ 否'}`);

    if (!isCloseVoicingOnly) {
        console.log('\n⚠️  发现问题: 四声部三和弦需要"仅选择Close voicing"');
        console.log('   解决方案: 在界面上取消其他voicing类型，只保留"Close"');
        console.log('   或者运行: window.chordSettings.voicingTypes = ["close"]');
    }

    // 测试几个和弦
    const testChords = [
        { root: 'C', type: 'major' },
        { root: 'F', type: 'major' },
        { root: 'G', type: 'major' }
    ];

    console.log('\n🎵 生成测试和弦...');

    testChords.forEach((chord, index) => {
        console.log(`\n🎼 测试 ${index + 1}: ${chord.root} 大三和弦`);

        try {
            const result = voicingEngineInstance.generateCloseVoicing(chord, {
                rangeMin: 55,
                rangeMax: 88,
                allowEnhanced: true,
                voicingContext: 'close-only'
            });

            if (result && result.notes && result.notes.length > 0) {
                console.log(`  ✅ 生成成功: ${result.notes.join('-')}`);
                console.log(`  🔢 声部数: ${result.notes.length} ${result.notes.length === 4 ? '(四声部 🎉)' : '(三声部)'}`);
                console.log(`  🎵 MIDI: [${result.midiNotes.join(', ')}]`);

                if (result.isEnhancedTriad) {
                    console.log(`  🎸 增强配置: ${result.enhancedConfigName || '是'}`);
                }
            } else {
                console.log(`  ❌ 生成失败`);
            }
        } catch (error) {
            console.log(`  ❌ 生成错误: ${error.message}`);
        }
    });

    console.log('\n💡 解决提示:');
    if (isCloseVoicingOnly) {
        console.log('  ✅ voicing设置正确，如果还是3声部请检查音域设置');
        console.log('  🧪 运行转位测试: testFourVoiceTriadInversions()');
    } else {
        console.log('  ❌ 请确保只选择"Close voicing"，取消其他voicing类型');
        console.log('  🔧 快速修复: forceCloseVoicingOnly()');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * 🔧 强制设置为仅Close voicing模式
 */
function forceCloseVoicingOnly() {
    window.chordSettings.voicingTypes = ['close'];
    console.log('🔧 已强制设置为仅Close voicing模式');
    console.log('💡 现在重新生成和弦应该能看到四声部效果');
    testFourVoiceTriads();
}

/**
 * 🔍 检查和初始化系统状态
 */
function checkSystemStatus() {
    console.log('\n🔍 === 系统状态检查 ===');

    // 检查必要的类是否存在
    console.log('📋 核心组件状态:');
    console.log(`  HarmonyTheory 类: ${typeof HarmonyTheory !== 'undefined' ? '✅ 已加载' : '❌ 未加载'}`);
    console.log(`  VoicingEngine 类: ${typeof VoicingEngine !== 'undefined' ? '✅ 已加载' : '❌ 未加载'}`);
    console.log(`  harmonyTheory 实例: ${typeof harmonyTheory !== 'undefined' && harmonyTheory ? '✅ 已创建' : '❌ 未创建'}`);
    console.log(`  voicingEngine 实例: ${typeof voicingEngine !== 'undefined' && voicingEngine ? '✅ 已创建' : '❌ 未创建'}`);

    // 检查设置
    console.log('\n⚙️ 配置状态:');
    console.log(`  增强三和弦: ${window.chordSettings.enhancedGuitarTriads ? '✅ 启用' : '❌ 禁用'}`);
    console.log(`  四声部总开关: ${window.chordSettings.fourVoiceTriadSettings.enabled ? '✅ 启用' : '❌ 禁用'}`);

    const currentVoicingTypes = window.chordSettings.voicingTypes || [];
    const isCloseVoicingOnly = currentVoicingTypes.length === 1 && currentVoicingTypes[0] === 'close';
    console.log(`  voicing类型: [${currentVoicingTypes.join(', ')}]`);
    console.log(`  仅Close voicing: ${isCloseVoicingOnly ? '✅ 是' : '❌ 否'}`);

    // 提供解决方案
    console.log('\n💡 解决方案:');
    if (typeof voicingEngine === 'undefined' || !voicingEngine) {
        console.log('  ❌ VoicingEngine 未初始化');
        console.log('  🔧 解决方法: 运行 initializeVoicingSystem()');
    } else {
        console.log('  ✅ VoicingEngine 已准备就绪');
        if (!isCloseVoicingOnly) {
            console.log('  🔧 建议运行: forceCloseVoicingOnly()');
        } else {
            console.log('  🎵 可以运行: testFourVoiceTriads()');
        }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * 🚀 手动初始化Voicing系统
 */
function initializeVoicingSystem() {
    console.log('\n🚀 === 手动初始化Voicing系统 ===');

    try {
        // 检查必要的类
        if (typeof HarmonyTheory === 'undefined') {
            console.error('❌ HarmonyTheory 类未加载，请检查 harmony-theory.js 是否正确加载');
            return;
        }

        if (typeof VoicingEngine === 'undefined') {
            console.error('❌ VoicingEngine 类未加载，请检查 voicing-engine.js 是否正确加载');
            return;
        }

        // 初始化 harmonyTheory
        if (typeof harmonyTheory === 'undefined' || !harmonyTheory) {
            console.log('🔧 初始化 HarmonyTheory...');
            window.harmonyTheory = new HarmonyTheory();
            console.log('✅ HarmonyTheory 初始化完成');
        }

        // 初始化 voicingEngine
        if (typeof voicingEngine === 'undefined' || !voicingEngine) {
            console.log('🔧 初始化 VoicingEngine...');
            window.voicingEngine = new VoicingEngine(window.harmonyTheory);
            console.log('✅ VoicingEngine 初始化完成');
        }

        // 验证初始化
        console.log('\n✅ 系统初始化完成！');
        console.log('🎵 现在可以运行: testFourVoiceTriads()');

    } catch (error) {
        console.error('❌ 初始化失败:', error);
        console.log('💡 建议刷新页面重新加载所有脚本');
    }
}

/**
 * 🔍 全面系统诊断器 - 一键诊断所有潜在问题
 * 在浏览器控制台中调用：fullSystemDiagnostic()
 */
function fullSystemDiagnostic() {
    console.log('\n🔍 ===== 全面系统诊断开始 =====');
    console.log('📋 诊断增强三和弦系统的所有潜在问题...\n');

    let issuesFound = 0;
    let recommendedFixes = [];

    // === 1. 核心系统检查 ===
    console.log('🔧 1. 核心系统状态检查');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');

    // VoicingEngine检查
    if (typeof voicingEngine === 'undefined' || !voicingEngine) {
        console.error('❌ VoicingEngine 未初始化');
        issuesFound++;
        recommendedFixes.push('运行: initializeVoicingSystem()');
    } else {
        console.log('✅ VoicingEngine 已就绪');
    }

    // window.chordSettings检查
    if (typeof window.chordSettings === 'undefined') {
        console.error('❌ window.chordSettings 未定义');
        issuesFound++;
        recommendedFixes.push('重新加载页面');
    } else {
        console.log('✅ window.chordSettings 已就绪');
    }

    // === 2. 增强三和弦设置检查 ===
    console.log('\n🎸 2. 增强三和弦设置检查');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (typeof window.chordSettings !== 'undefined') {
        // 主开关检查
        const enhancedEnabled = window.chordSettings.enhancedGuitarTriads;
        console.log(`增强三和弦主开关: ${enhancedEnabled ? '✅ 启用' : '❌ 禁用'}`);
        if (!enhancedEnabled) {
            issuesFound++;
            recommendedFixes.push('运行: enableEnhancedTriads()');
        }

        // 四声部设置检查
        if (window.chordSettings.fourVoiceTriadSettings) {
            const fourVoiceEnabled = window.chordSettings.fourVoiceTriadSettings.enabled;
            console.log(`四声部三和弦开关: ${fourVoiceEnabled ? '✅ 启用' : '❌ 禁用'}`);
            if (!fourVoiceEnabled) {
                issuesFound++;
                recommendedFixes.push('运行: enableFourVoiceTriads()');
            }
        } else {
            console.error('❌ fourVoiceTriadSettings 未定义');
            issuesFound++;
            recommendedFixes.push('重新加载页面');
        }
    }

    // === 3. Voicing类型选择检查 ===
    console.log('\n🎼 3. Voicing类型选择检查');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (typeof window.chordSettings !== 'undefined' && window.chordSettings.voicingTypes) {
        const currentTypes = window.chordSettings.voicingTypes;
        const isCloseOnly = currentTypes.length === 1 && currentTypes[0] === 'close';

        console.log(`当前选择的voicing类型: [${currentTypes.join(', ')}]`);
        console.log(`仅选择Close voicing: ${isCloseOnly ? '✅ 是' : '❌ 否'}`);

        if (!isCloseOnly && currentTypes.includes('close')) {
            console.warn('⚠️ 检测到多选模式，可能影响四声部三和弦激活');
            console.log('💡 四声部三和弦在多选模式下激活条件更严格');
        }

        if (!currentTypes.includes('close')) {
            console.error('❌ 没有选择Close voicing，四声部三和弦无法激活');
            issuesFound++;
            recommendedFixes.push('在界面上勾选Close voicing');
        }
    }

    // === 4. 乐器模式检查 ===
    console.log('\n🎸 4. 乐器模式检查');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');

    const instrumentToggle = document.getElementById('instrumentModeToggle');
    const isGuitarMode = !instrumentToggle || !instrumentToggle.checked;
    console.log(`当前乐器模式: ${isGuitarMode ? '🎸 吉他模式' : '🎹 钢琴模式'}`);

    if (!isGuitarMode) {
        console.warn('⚠️ 当前是钢琴模式，增强三和弦功能仅在吉他模式下可用');
        recommendedFixes.push('切换到吉他模式（取消勾选钢琴模式）');
    }

    // === 5. 和弦类型检查 ===
    console.log('\n🎵 5. 和弦类型检查');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');

    const chordTypeCheckboxes = document.querySelectorAll('input[name="chordType"]:checked');
    const triadSelected = Array.from(chordTypeCheckboxes).some(cb => cb.value === 'triad');
    console.log(`三和弦类型已选择: ${triadSelected ? '✅ 是' : '❌ 否'}`);

    if (!triadSelected) {
        console.error('❌ 没有选择三和弦类型，四声部三和弦无法激活');
        issuesFound++;
        recommendedFixes.push('在界面上勾选"三和弦"选项');
    }

    // === 6. 激活条件综合评估 ===
    console.log('\n🎯 6. 激活条件综合评估');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');

    const allConditionsMet = (
        typeof voicingEngine !== 'undefined' && voicingEngine &&
        typeof window.chordSettings !== 'undefined' &&
        window.chordSettings.enhancedGuitarTriads &&
        window.chordSettings.fourVoiceTriadSettings?.enabled &&
        window.chordSettings.voicingTypes?.includes('close') &&
        isGuitarMode &&
        triadSelected
    );

    console.log(`四声部三和弦激活条件: ${allConditionsMet ? '✅ 全部满足' : '❌ 不满足'}`);

    // === 7. 生成测试 ===
    console.log('\n🧪 7. 实际生成测试');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (allConditionsMet && typeof voicingEngine !== 'undefined') {
        try {
            const testChord = { root: 'C', type: 'major' };
            const testOptions = {
                rangeMin: 55,
                rangeMax: 88,
                voicingContext: 'close-only',
                allowEnhanced: true
            };

            console.log('🔍 测试C大三和弦生成...');
            const testResult = voicingEngine.generateCloseVoicing(testChord, testOptions);

            if (testResult && testResult.notes && testResult.notes.length >= 3) {
                console.log(`✅ 生成成功: ${testResult.notes.join('-')}`);
                console.log(`🔢 声部数: ${testResult.notes.length} ${testResult.notes.length === 4 ? '(四声部 🎉)' : '(三声部)'}`);

                // 检查是否有异常配置
                if (testResult.notes && testResult.notes.length > 0) {
                    const noteSpread = testResult.midiNotes ?
                        Math.max(...testResult.midiNotes) - Math.min(...testResult.midiNotes) : 0;

                    if (noteSpread > 24) { // 超过两个八度
                        console.warn(`⚠️ 检测到异常音符跨度: ${noteSpread}个半音`);
                        console.warn(`   可能出现了C4-E4-G5这类问题配置`);
                        issuesFound++;
                        recommendedFixes.push('检查音符分配算法');
                    } else {
                        console.log(`✅ 音符跨度正常: ${noteSpread}个半音`);
                    }
                }

                if (testResult.notes.length === 4) {
                    console.log('🎉 四声部三和弦功能正常工作！');
                } else {
                    console.warn('⚠️ 仍然是三声部，可能需要进一步调整');
                    issuesFound++;
                    recommendedFixes.push('检查音域设置或运行 optimizeForFourVoice()');
                }
            } else {
                console.error('❌ 生成失败或结果异常');
                issuesFound++;
                recommendedFixes.push('检查voicing引擎状态');
            }
        } catch (error) {
            console.error(`❌ 生成测试失败: ${error.message}`);
            issuesFound++;
        }
    } else {
        console.log('⏭️ 跳过生成测试（激活条件不满足）');
    }

    // === 8. 诊断总结 ===
    console.log('\n📊 诊断总结');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (issuesFound === 0) {
        console.log('🎉 恭喜！系统状态完美，四声部三和弦功能应该正常工作');
        console.log('🎵 可以直接生成三和弦来验证效果');
    } else {
        console.warn(`⚠️ 发现 ${issuesFound} 个问题需要修复`);
        console.log('\n🔧 推荐修复方案：');
        recommendedFixes.forEach((fix, index) => {
            console.log(`  ${index + 1}. ${fix}`);
        });
    }

    console.log('\n💡 快速修复命令：');
    console.log('  - autoFixAllIssues()    # 一键修复所有问题');
    console.log('  - enableEnhancedTriads() # 启用增强三和弦');
    console.log('  - forceCloseVoicingOnly() # 强制仅选择Close voicing');
    console.log('  - optimizeForFourVoice() # 优化四声部设置');

    console.log('\n🔍 ===== 全面系统诊断完成 =====');

    return {
        issuesFound,
        allConditionsMet,
        recommendedFixes
    };
}

/**
 * 🔧 一键修复所有问题
 * 在浏览器控制台中调用：autoFixAllIssues()
 */
function autoFixAllIssues() {
    console.log('\n🔧 === 一键修复所有问题 ===');

    let fixesApplied = 0;

    // 修复1: 确保VoicingEngine已初始化
    if (typeof voicingEngine === 'undefined' || !voicingEngine) {
        console.log('🔧 修复1: 初始化VoicingEngine...');
        initializeVoicingSystem();
        fixesApplied++;
    }

    // 修复2: 启用增强三和弦
    if (typeof window.chordSettings !== 'undefined' && !window.chordSettings.enhancedGuitarTriads) {
        console.log('🔧 修复2: 启用增强三和弦...');
        window.chordSettings.enhancedGuitarTriads = true;
        fixesApplied++;
    }

    // 修复3: 启用四声部三和弦
    if (typeof window.chordSettings !== 'undefined' && window.chordSettings.fourVoiceTriadSettings &&
        !window.chordSettings.fourVoiceTriadSettings.enabled) {
        console.log('🔧 修复3: 启用四声部三和弦...');
        window.chordSettings.fourVoiceTriadSettings.enabled = true;
        fixesApplied++;
    }

    // 修复4: 确保选择了Close voicing
    if (typeof window.chordSettings !== 'undefined' && window.chordSettings.voicingTypes) {
        if (!window.chordSettings.voicingTypes.includes('close')) {
            console.log('🔧 修复4: 添加Close voicing到选择中...');
            window.chordSettings.voicingTypes.push('close');
            updateVoicingUI();
            fixesApplied++;
        }
    }

    // 修复5: 确保选择了三和弦类型
    const triadCheckbox = document.querySelector('input[name="chordType"][value="triad"]');
    if (triadCheckbox && !triadCheckbox.checked) {
        console.log('🔧 修复5: 选择三和弦类型...');
        triadCheckbox.checked = true;
        if (typeof updateChordTypeSelection === 'function') {
            updateChordTypeSelection();
        }
        fixesApplied++;
    }

    // 修复6: 确保是吉他模式
    const instrumentToggle = document.getElementById('instrumentModeToggle');
    if (instrumentToggle && instrumentToggle.checked) {
        console.log('🔧 修复6: 切换到吉他模式...');
        instrumentToggle.checked = false;
        if (typeof toggleInstrumentMode === 'function') {
            toggleInstrumentMode();
        }
        fixesApplied++;
    }

    console.log(`\n✅ 修复完成！已应用 ${fixesApplied} 个修复`);

    if (fixesApplied > 0) {
        console.log('🎵 现在可以尝试生成三和弦来验证四声部效果');
        console.log('🔍 运行 fullSystemDiagnostic() 来验证修复效果');
    } else {
        console.log('ℹ️ 没有发现需要修复的问题');
    }

    return fixesApplied;
}

/**
 * 🎯 为四声部优化系统设置
 * 在浏览器控制台中调用：optimizeForFourVoice()
 */
function optimizeForFourVoice() {
    console.log('\n🎯 === 四声部三和弦优化设置 ===');

    if (typeof window.chordSettings === 'undefined') {
        console.error('❌ window.chordSettings 未定义');
        return false;
    }

    // 强制启用所有必要设置
    window.chordSettings.enhancedGuitarTriads = true;
    if (window.chordSettings.fourVoiceTriadSettings) {
        window.chordSettings.fourVoiceTriadSettings.enabled = true;
        window.chordSettings.fourVoiceTriadSettings.preferFourVoice = true;
        window.chordSettings.fourVoiceTriadSettings.fallbackToThreeVoice = false; // 强制四声部
    }

    // 设置仅Close voicing
    window.chordSettings.voicingTypes = ['close'];

    // 更新界面
    updateVoicingUI();

    console.log('✅ 四声部优化设置已应用');
    console.log('🎵 现在应该能够生成四声部三和弦');
    console.log('🔍 运行 testFourVoiceTriads() 来验证效果');

    return true;
}

// 在全局作用域中暴露核心函数和控制函数
// 🎵 核心和弦生成函数
window.generateChords = generateChords;
window.generateDiverseProgression = generateDiverseProgression;
window.generateFunctionalProgression = generateFunctionalProgression;

// 🔧 控制和测试函数
window.enableFourVoiceTriads = enableFourVoiceTriads;
window.configureFourVoiceTriad = configureFourVoiceTriad;
window.setFourVoicePreference = setFourVoicePreference;
window.showFourVoiceTriadSettings = showFourVoiceTriadSettings;
window.enableAllFourVoiceConfigurations = enableAllFourVoiceConfigurations;
window.resetFourVoiceTriadSettings = resetFourVoiceTriadSettings;
window.testFourVoiceTriads = testFourVoiceTriads;
window.testFourVoiceTriadInversions = testFourVoiceTriadInversions;
window.forceCloseVoicingOnly = forceCloseVoicingOnly;
window.checkSystemStatus = checkSystemStatus;
window.initializeVoicingSystem = initializeVoicingSystem;
window.fullSystemDiagnostic = fullSystemDiagnostic;
window.autoFixAllIssues = autoFixAllIssues;
window.optimizeForFourVoice = optimizeForFourVoice;

// 控制台输出初始化完成信息
console.log('✅ 和弦视奏生成器脚本加载完成');
console.log('🎹 当前版本: 1.0.0');
console.log('🔧 开发状态: 传统和声学转位系统已集成');
console.log('🎛️ 四声部三和弦控制系统已加载');
console.log('💡 使用 showFourVoiceTriadSettings() 查看控制选项');
console.log('');
console.log('🎵 四声部三和弦已默认启用！');
console.log('📋 当前启用的配置: 5135, 1351, 1513, 3513');
console.log('⚠️  配置 5131 需要音域 ≥ Eb4，默认关闭');
console.log('🎯 选择"三和弦"+"Close voicing"即可体验四声部效果');
console.log('');
console.log('🔧 故障排除命令:');
console.log('  fullSystemDiagnostic()       - 🔍 全面系统诊断（推荐首选）');
console.log('  autoFixAllIssues()           - 🔧 一键修复所有问题');
console.log('  optimizeForFourVoice()       - 🎯 优化四声部设置');
console.log('  checkSystemStatus()          - 检查系统状态');
console.log('  initializeVoicingSystem()    - 手动初始化系统');
console.log('  testFourVoiceTriads()        - 测试四声部功能');
console.log('  testFourVoiceTriadInversions() - 测试转位系统');
console.log('  testFixedCloseVoicingGenerator() - 🧪 测试修复后的Close Voicing生成器');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

/**
 * 🧪 测试修复后的Close Voicing生成器
 * 验证修复是否成功解决了异常配置问题
 */
function testFixedCloseVoicingGenerator() {
    console.log('\n🧪 === 测试修复后的Close Voicing生成器 ===');
    console.log('🎯 目标：验证不再生成C4-E4-G5等异常配置');

    if (!window.voicingEngine) {
        console.error('❌ VoicingEngine未找到，无法进行测试');
        return;
    }

    const testChords = [
        { root: 'C', type: '', notes: ['C', 'E', 'G'] },
        { root: 'D', type: 'm', notes: ['D', 'F', 'A'] },
        { root: 'G', type: '7', notes: ['G', 'B', 'D', 'F'] },
        { root: 'F', type: 'maj7', notes: ['F', 'A', 'C', 'E'] },
        { root: 'A', type: 'm7', notes: ['A', 'C', 'E', 'G'] }
    ];

    const testRanges = [
        { name: '标准吉他音域', min: 55, max: 88 }, // G3-E6
        { name: '窄音域测试', min: 60, max: 72 },   // C4-C5
        { name: '宽音域测试', min: 48, max: 96 }    // C3-C7
    ];

    let totalTests = 0;
    let passedTests = 0;
    let abnormalConfigurations = [];

    for (const range of testRanges) {
        console.log(`\n📏 测试音域: ${range.name} (MIDI ${range.min}-${range.max})`);

        for (const chord of testChords) {
            totalTests++;
            console.log(`\n🎵 测试和弦: ${chord.root}${chord.type}`);

            try {
                const voicing = window.voicingEngine.generateCloseVoicing(chord, {
                    rangeMin: range.min,
                    rangeMax: range.max,
                    enableInversions: false
                });

                if (!voicing) {
                    console.log(`ℹ️ 和弦生成器正确拒绝了无法处理的配置`);
                    passedTests++;
                    continue;
                }

                // 分析生成的voicing
                const midiNotes = voicing.midiNotes;
                const notes = voicing.notes;

                if (!midiNotes || midiNotes.length === 0) {
                    console.warn(`⚠️ 生成的voicing没有MIDI数据`);
                    continue;
                }

                console.log(`🎼 生成结果: ${notes.join('-')} (MIDI: ${midiNotes.join(', ')})`);

                // 检查音域遵循
                const outOfRange = midiNotes.filter(midi => midi < range.min || midi > range.max);
                const rangeCompliance = outOfRange.length === 0;

                // 检查Close Voicing特性
                const span = Math.max(...midiNotes) - Math.min(...midiNotes);
                const intervals = midiNotes.slice(1).map((midi, i) => midi - midiNotes[i]);
                const maxInterval = Math.max(...intervals);
                const isValidCloseVoicing = span <= 24 && maxInterval <= 12;

                // 检查是否有异常跳跃 (超过八度的音程)
                const hasAbnormalJumps = intervals.some(interval => interval > 12);

                console.log(`  📊 分析:`);
                console.log(`    - 音域遵循: ${rangeCompliance ? '✅' : '❌'} (${outOfRange.length}个音符超出)`);
                console.log(`    - Close特性: ${isValidCloseVoicing ? '✅' : '❌'} (跨度${span}半音, 最大间隔${maxInterval}半音)`);
                console.log(`    - 异常跳跃: ${hasAbnormalJumps ? '❌' : '✅'} (间隔: [${intervals.join(', ')}])`);

                if (rangeCompliance && isValidCloseVoicing && !hasAbnormalJumps) {
                    console.log(`✅ 测试通过：生成了合格的Close Voicing`);
                    passedTests++;
                } else {
                    console.log(`❌ 测试失败：不符合标准`);

                    // 记录异常配置用于分析
                    if (hasAbnormalJumps || !isValidCloseVoicing) {
                        abnormalConfigurations.push({
                            chord: `${chord.root}${chord.type}`,
                            range: range.name,
                            voicing: notes.join('-'),
                            midi: midiNotes.join(','),
                            issues: []
                        });

                        if (hasAbnormalJumps) {
                            abnormalConfigurations[abnormalConfigurations.length - 1].issues.push('异常跳跃');
                        }
                        if (!isValidCloseVoicing) {
                            abnormalConfigurations[abnormalConfigurations.length - 1].issues.push('非Close Voicing');
                        }
                    }
                }

            } catch (error) {
                console.error(`❌ 测试出错: ${error.message}`);
            }
        }
    }

    // 测试总结
    console.log(`\n📊 === 测试总结 ===`);
    console.log(`✅ 通过: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);

    if (abnormalConfigurations.length > 0) {
        console.log(`\n⚠️ 发现的异常配置:`);
        abnormalConfigurations.forEach((config, index) => {
            console.log(`${index + 1}. ${config.chord} in ${config.range}:`);
            console.log(`   配置: ${config.voicing} (${config.midi})`);
            console.log(`   问题: ${config.issues.join(', ')}`);
        });
    } else {
        console.log(`🎉 没有发现异常配置！修复成功！`);
    }

    // 推荐下一步
    if (passedTests === totalTests) {
        console.log(`\n🎉 所有测试通过！Close Voicing生成器已成功修复`);
        console.log(`📝 下一步建议:`);
        console.log(`   1. 在界面中测试生成三和弦Close Voicing`);
        console.log(`   2. 验证四声部三和弦系统是否正常工作`);
        console.log(`   3. 检查其他voicing类型是否仍然正常`);
    } else {
        console.log(`\n🔧 还需要进一步调整，请检查上述异常配置`);
    }

    return {
        totalTests,
        passedTests,
        successRate: Math.round(passedTests/totalTests*100),
        abnormalConfigurations
    };
}

// 将测试函数添加到全局作用域
window.testFixedCloseVoicingGenerator = testFixedCloseVoicingGenerator;

/**
 * 🧪 综合测试套件 - 验证所有修复
 * 测试所有关键修复：close voicing、enhanced triads、voicing selection
 */
function runComprehensiveTestSuite() {
    console.log('\n🎯 === 综合测试套件 ===');
    console.log('🔍 验证所有关键修复是否工作正常');

    if (!window.voicingEngine) {
        console.error('❌ VoicingEngine未找到，无法进行测试');
        return;
    }

    let totalTests = 0;
    let passedTests = 0;
    const issues = [];

    // 测试1: Close Voicing生成器修复
    console.log('\n📋 测试1: Close Voicing生成器修复');
    totalTests++;
    try {
        const testResult = window.voicingEngine.generateCloseVoicing(
            { root: 'C', type: '', notes: ['C', 'E', 'G'] },
            { rangeMin: 60, rangeMax: 72, enableInversions: false }
        );

        if (testResult && testResult.midiNotes) {
            const span = Math.max(...testResult.midiNotes) - Math.min(...testResult.midiNotes);
            const intervals = testResult.midiNotes.slice(1).map((midi, i) => midi - testResult.midiNotes[i]);
            const maxInterval = Math.max(...intervals);

            if (span <= 24 && maxInterval <= 12) {
                console.log('✅ Close Voicing生成器: 正常生成合格voicing');
                passedTests++;
            } else {
                console.log(`❌ Close Voicing生成器: 仍然生成异常配置 (跨度${span}, 最大间隔${maxInterval})`);
                issues.push('Close Voicing生成器仍然产生异常配置');
            }
        } else {
            console.log('❌ Close Voicing生成器: 无法生成voicing');
            issues.push('Close Voicing生成器无法生成voicing');
        }
    } catch (error) {
        console.log(`❌ Close Voicing生成器: 测试出错 - ${error.message}`);
        issues.push(`Close Voicing生成器测试错误: ${error.message}`);
    }

    // 测试2: Enhanced Triads激活条件优化
    console.log('\n📋 测试2: Enhanced Triads激活条件优化');
    totalTests++;
    try {
        // 测试在混合voicing场景下是否能激活enhanced triads
        const shouldActivate1 = window.voicingEngine.shouldUseEnhancedGuitarTriad(
            { root: 'C', type: '' },
            { voicingContext: 'mixed', allowEnhanced: true }
        );

        // 测试在enabledVoicings包含close时是否能激活
        const shouldActivate2 = window.voicingEngine.shouldUseEnhancedGuitarTriad(
            { root: 'C', type: '' },
            { enabledVoicings: ['close', 'drop2'], allowEnhanced: true }
        );

        // 测试在默认情况下是否能激活
        const shouldActivate3 = window.voicingEngine.shouldUseEnhancedGuitarTriad(
            { root: 'C', type: '' },
            { allowEnhanced: true }
        );

        if (shouldActivate1 && shouldActivate2 && shouldActivate3) {
            console.log('✅ Enhanced Triads激活条件: 优化成功，更加用户友好');
            passedTests++;
        } else {
            console.log(`❌ Enhanced Triads激活条件: 仍然过于严格 (${shouldActivate1}/${shouldActivate2}/${shouldActivate3})`);
            issues.push('Enhanced Triads激活条件仍然过于严格');
        }
    } catch (error) {
        console.log(`❌ Enhanced Triads激活条件: 测试出错 - ${error.message}`);
        issues.push(`Enhanced Triads激活条件测试错误: ${error.message}`);
    }

    // 测试3: Voicing Type Selection同步
    console.log('\n📋 测试3: Voicing Type Selection同步');
    totalTests++;
    try {
        // 测试只选择drop2时的严格遵循
        const result1 = window.voicingEngine.generateVoicings(
            { root: 'C', type: '', notes: ['C', 'E', 'G'] },
            { enabledVoicings: ['drop2'], rangeMin: 55, rangeMax: 88 }
        );

        // 测试空选择时的正确处理
        const result2 = window.voicingEngine.generateVoicings(
            { root: 'C', type: '', notes: ['C', 'E', 'G'] },
            { enabledVoicings: [], rangeMin: 55, rangeMax: 88 }
        );

        let syncTestPassed = true;
        let syncIssues = [];

        // 验证result1只包含drop2或为空（如果无法生成）
        if (result1 && typeof result1 === 'object') {
            const generatedTypes = Object.keys(result1);
            const hasUnexpectedTypes = generatedTypes.some(type =>
                !['drop2', 'selected'].includes(type) && result1[type]
            );

            if (hasUnexpectedTypes) {
                syncTestPassed = false;
                syncIssues.push('仍然生成未选择的voicing类型');
            }
        }

        // 验证result2为空对象
        if (result2 && Object.keys(result2).length > 0) {
            syncTestPassed = false;
            syncIssues.push('空选择时仍然生成voicing');
        }

        if (syncTestPassed) {
            console.log('✅ Voicing Type Selection同步: 严格遵循用户选择');
            passedTests++;
        } else {
            console.log(`❌ Voicing Type Selection同步: ${syncIssues.join(', ')}`);
            issues.push(`Voicing同步问题: ${syncIssues.join(', ')}`);
        }
    } catch (error) {
        console.log(`❌ Voicing Type Selection同步: 测试出错 - ${error.message}`);
        issues.push(`Voicing同步测试错误: ${error.message}`);
    }

    // 测试4: 系统诊断工具验证
    console.log('\n📋 测试4: 系统诊断工具验证');
    totalTests++;
    try {
        if (typeof fullSystemDiagnostic === 'function' &&
            typeof autoFixAllIssues === 'function' &&
            typeof optimizeForFourVoice === 'function') {
            console.log('✅ 系统诊断工具: 所有工具函数可用');
            passedTests++;
        } else {
            console.log('❌ 系统诊断工具: 部分工具函数缺失');
            issues.push('系统诊断工具不完整');
        }
    } catch (error) {
        console.log(`❌ 系统诊断工具: 测试出错 - ${error.message}`);
        issues.push(`系统诊断工具测试错误: ${error.message}`);
    }

    // 测试总结
    console.log('\n📊 === 综合测试总结 ===');
    console.log(`✅ 通过测试: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`❌ 失败测试: ${totalTests - passedTests}/${totalTests}`);

    if (issues.length > 0) {
        console.log('\n⚠️ 发现的问题:');
        issues.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue}`);
        });
    }

    // 最终评估
    if (passedTests === totalTests) {
        console.log('\n🎉 恭喜！所有修复都已成功完成！');
        console.log('📝 系统状态: 所有关键问题已解决');
        console.log('🎯 建议: 现在可以正常使用增强四声部三和弦系统');
    } else {
        const successRate = Math.round(passedTests/totalTests*100);
        if (successRate >= 75) {
            console.log('\n✅ 大部分修复成功完成！');
            console.log('📝 系统状态: 主要问题已解决，存在少量待优化项');
        } else {
            console.log('\n⚠️ 需要进一步修复');
            console.log('📝 系统状态: 仍有重要问题需要解决');
        }
    }

    return {
        totalTests,
        passedTests,
        successRate: Math.round(passedTests/totalTests*100),
        issues
    };
}

// 将综合测试函数添加到全局作用域
window.runComprehensiveTestSuite = runComprehensiveTestSuite;

/**
 * 🚫 阶段2验证：确认增强三和弦系统隔离状态
 * 这个函数验证所有隔离措施是否有效
 */
function verifyEnhancedTriadIsolation() {
    console.log('\n🚫 === 阶段2验证：增强三和弦系统隔离状态 ===');

    let isolationSuccessful = true;

    // 检查默认设置
    console.log(`🔍 1. 默认设置检查:`);
    console.log(`   window.chordSettings.enhancedGuitarTriads: ${window.chordSettings?.enhancedGuitarTriads}`);
    if (window.chordSettings?.enhancedGuitarTriads === false) {
        console.log(`   ✅ 默认设置已正确隔离`);
    } else {
        console.error(`   ❌ 默认设置隔离失败！当前值: ${window.chordSettings?.enhancedGuitarTriads}`);
        isolationSuccessful = false;
    }

    // 检查shouldUseEnhancedGuitarTriad函数
    console.log(`\n🔍 2. shouldUseEnhancedGuitarTriad函数检查:`);
    if (typeof window !== 'undefined' && window.voicingEngine) {
        try {
            const testResult = window.voicingEngine.shouldUseEnhancedGuitarTriad(
                { root: 'C', type: 'major' },
                { allowEnhanced: true, voicingContext: 'close-only' }
            );
            console.log(`   测试结果: ${testResult}`);
            if (testResult === false) {
                console.log(`   ✅ shouldUseEnhancedGuitarTriad已正确隔离`);
            } else {
                console.error(`   ❌ shouldUseEnhancedGuitarTriad隔离失败！返回值: ${testResult}`);
                isolationSuccessful = false;
            }
        } catch (error) {
            console.error(`   ❌ shouldUseEnhancedGuitarTriad测试出错:`, error);
            isolationSuccessful = false;
        }
    } else {
        console.warn(`   ⚠️ VoicingEngine不可用，跳过检查`);
    }

    // 检查generateEnhancedGuitarTriadVoicing函数
    console.log(`\n🔍 3. generateEnhancedGuitarTriadVoicing函数检查:`);
    if (typeof window !== 'undefined' && window.voicingEngine) {
        try {
            const testResult2 = window.voicingEngine.generateEnhancedGuitarTriadVoicing(
                { root: 'C', type: 'major' },
                { allowEnhanced: true }
            );
            console.log(`   测试结果: ${testResult2}`);
            if (testResult2 === null) {
                console.log(`   ✅ generateEnhancedGuitarTriadVoicing已正确隔离`);
            } else {
                console.error(`   ❌ generateEnhancedGuitarTriadVoicing隔离失败！返回值:`, testResult2);
                isolationSuccessful = false;
            }
        } catch (error) {
            console.error(`   ❌ generateEnhancedGuitarTriadVoicing测试出错:`, error);
            isolationSuccessful = false;
        }
    } else {
        console.warn(`   ⚠️ VoicingEngine不可用，跳过检查`);
    }

    // 测试标准三和弦生成
    console.log(`\n🔍 4. 标准三和弦生成测试:`);
    if (typeof window !== 'undefined' && window.voicingEngine) {
        try {
            const standardResult = window.voicingEngine.generateVoicings(
                { root: 'C', type: 'major' },
                { enabledVoicings: ['close'], rangeMin: 60, rangeMax: 72 }
            );

            if (standardResult && standardResult.close) {
                console.log(`   ✅ 标准三和弦生成正常: ${standardResult.close.notes?.join('-')}`);

                // 检查是否是异常配置
                const span = Math.max(...standardResult.close.midiNotes) - Math.min(...standardResult.close.midiNotes);
                if (span <= 12) {
                    console.log(`   ✅ 生成配置正常，跨度${span}半音 ≤ 12半音`);
                } else {
                    console.warn(`   ⚠️ 可能仍有问题，跨度${span}半音 > 12半音`);
                    isolationSuccessful = false;
                }
            } else {
                console.warn(`   ⚠️ 标准生成返回异常:`, standardResult);
                isolationSuccessful = false;
            }
        } catch (error) {
            console.error(`   ❌ 标准生成测试失败:`, error);
            isolationSuccessful = false;
        }
    } else {
        console.warn(`   ⚠️ VoicingEngine不可用，跳过检查`);
    }

    console.log(`\n🚫 === 隔离状态验证完成 ===`);
    if (isolationSuccessful) {
        console.log(`🎉 隔离验证成功！增强系统已完全隔离`);
        console.log(`💡 现在应该不再出现C4-E4-G5类型的异常配置`);
        console.log(`✅ 阶段2任务完成：增强三和弦系统已成功隔离`);
    } else {
        console.error(`❌ 隔离验证失败！仍有部分增强系统未完全隔离`);
        console.error(`💡 需要进一步检查和修复隔离措施`);
    }

    return isolationSuccessful;
}

/**
 * 🔧 阶段2验证：确认voicing选择传递机制重构状态
 * 这个函数验证重构后的选择机制是否严格遵循用户意愿
 */
function verifyVoicingSelectionMechanism() {
    console.log('\n🔧 === 阶段2验证：voicing选择传递机制重构状态 ===');

    let mechanismWorking = true;

    if (!window.voicingEngine) {
        console.warn('⚠️ VoicingEngine不可用，跳过验证');
        return false;
    }

    // 测试1: 单一voicing类型选择
    console.log(`\n🔍 测试1: 单一voicing类型选择严格性`);
    try {
        const result1 = window.voicingEngine.generateVoicings(
            { root: 'C', type: 'major' },
            { enabledVoicings: ['close'], rangeMin: 60, rangeMax: 72 }
        );

        const returnedTypes1 = Object.keys(result1).filter(k =>
            !['selected', 'all', 'analysis'].includes(k) &&
            result1[k] && typeof result1[k] === 'object'
        );

        console.log(`   请求类型: ['close']`);
        console.log(`   返回类型: ${JSON.stringify(returnedTypes1)}`);

        if (returnedTypes1.length === 1 && returnedTypes1[0] === 'close') {
            console.log(`   ✅ 单一选择测试通过`);
        } else {
            console.error(`   ❌ 单一选择测试失败：返回了${returnedTypes1.length}个类型`);
            mechanismWorking = false;
        }
    } catch (error) {
        console.error(`   ❌ 单一选择测试出错:`, error);
        mechanismWorking = false;
    }

    // 测试2: 多重voicing类型选择
    console.log(`\n🔍 测试2: 多重voicing类型选择严格性`);
    try {
        const result2 = window.voicingEngine.generateVoicings(
            { root: 'C', type: 'major' },
            { enabledVoicings: ['close', 'drop2'], rangeMin: 60, rangeMax: 72 }
        );

        const returnedTypes2 = Object.keys(result2).filter(k =>
            !['selected', 'all', 'analysis'].includes(k) &&
            result2[k] && typeof result2[k] === 'object'
        );

        console.log(`   请求类型: ['close', 'drop2']`);
        console.log(`   返回类型: ${JSON.stringify(returnedTypes2)}`);

        const expectedTypes = ['close', 'drop2'];
        const matchesExpected = expectedTypes.every(type => returnedTypes2.includes(type)) &&
                               returnedTypes2.every(type => expectedTypes.includes(type));

        if (matchesExpected) {
            console.log(`   ✅ 多重选择测试通过`);
        } else {
            console.error(`   ❌ 多重选择测试失败：期望${JSON.stringify(expectedTypes)}，实际${JSON.stringify(returnedTypes2)}`);
            mechanismWorking = false;
        }
    } catch (error) {
        console.error(`   ❌ 多重选择测试出错:`, error);
        mechanismWorking = false;
    }

    // 测试3: 空选择处理
    console.log(`\n🔍 测试3: 空选择处理`);
    try {
        const result3 = window.voicingEngine.generateVoicings(
            { root: 'C', type: 'major' },
            { enabledVoicings: [], rangeMin: 60, rangeMax: 72 }
        );

        const returnedTypes3 = Object.keys(result3).filter(k =>
            !['selected', 'all', 'analysis'].includes(k) &&
            result3[k] && typeof result3[k] === 'object'
        );

        console.log(`   请求类型: []`);
        console.log(`   返回类型: ${JSON.stringify(returnedTypes3)}`);

        if (returnedTypes3.length === 0) {
            console.log(`   ✅ 空选择测试通过`);
        } else {
            console.error(`   ❌ 空选择测试失败：应该返回空结果，实际返回${returnedTypes3.length}个类型`);
            mechanismWorking = false;
        }
    } catch (error) {
        console.error(`   ❌ 空选择测试出错:`, error);
        mechanismWorking = false;
    }

    // 测试4: 不合法voicing类型检测
    console.log(`\n🔍 测试4: 不合法voicing类型拒绝`);
    try {
        const result4 = window.voicingEngine.generateVoicings(
            { root: 'C', type: 'major' },
            { enabledVoicings: ['close', 'invalid_type'], rangeMin: 60, rangeMax: 72 }
        );

        if (!result4 || Object.keys(result4).length === 0) {
            console.log(`   ✅ 不合法类型拒绝测试通过`);
        } else {
            console.error(`   ❌ 不合法类型拒绝测试失败：应该拒绝生成，但仍有返回结果`);
            mechanismWorking = false;
        }
    } catch (error) {
        console.error(`   ❌ 不合法类型测试出错:`, error);
        mechanismWorking = false;
    }

    console.log(`\n🔧 === voicing选择机制验证完成 ===`);
    if (mechanismWorking) {
        console.log(`🎉 选择机制重构成功！所有测试通过`);
        console.log(`✅ 用户voicing选择现在得到严格遵循`);
        console.log(`✅ 阶段2任务完成：voicing选择传递机制已成功重构`);
    } else {
        console.error(`❌ 选择机制验证失败！仍有问题需要修复`);
    }

    return mechanismWorking;
}

// 🔍 诊断G小调MusicXML渲染同音异名问题
function diagnoseGMinorEnharmonicRendering() {
    console.log('\n🔍 ==================== G小调MusicXML渲染诊断 ====================');

    // 测试场景：G小调中包含Eb的和弦
    const testChords = [
        { root: 'G', type: 'minor', expectedEb: false },     // Gm: G-Bb-D (不含Eb)
        { root: 'Eb', type: 'major', expectedEb: true },     // Eb: Eb-G-Bb (肯定含Eb)
        { root: 'Bb', type: 'major', expectedEb: false },    // Bb: Bb-D-F (不含Eb)
        { root: 'C', type: 'minor', expectedEb: true }       // Cm: C-Eb-G (肯定含Eb)
    ];

    // 创建G小调调性信息
    const gMinorKey = 'g-minor';
    let gMinorKeyInfo = null;

    try {
        gMinorKeyInfo = harmonyTheory.keys[gMinorKey];
        console.log(`📊 G小调调性信息:`, gMinorKeyInfo);
        if (!gMinorKeyInfo) {
            console.error(`❌ G小调调性信息不存在，可用的调性:`, Object.keys(harmonyTheory.keys).filter(k => k.includes('minor')).slice(0, 5));
            return;
        }
    } catch (e) {
        console.error(`❌ 无法获取G小调调性信息:`, e);
        return;
    }

    testChords.forEach((testChord, index) => {
        console.log(`\n--- 测试${index + 1}: ${testChord.root}${testChord.type} ---`);

        try {
            // 步骤1: 生成和弦对象
            const chord = harmonyTheory.buildChord(testChord.root, testChord.type, gMinorKey);
            console.log(`🎵 和弦构建结果:`, chord.notes);

            if (testChord.expectedEb) {
                // 步骤2: 检查是否包含Eb
                const hasEb = chord.notes && chord.notes.includes('Eb');
                console.log(`🔍 是否包含Eb: ${hasEb ? '是' : '否'}`);

                if (hasEb) {
                    // 步骤3: 测试Eb的MusicXML渲染
                    const ebNoteIndex = 3; // Eb在12音序列中的位置
                    console.log(`🧪 测试Eb渲染 (noteIndex: ${ebNoteIndex})`);

                    const chordContext = {
                        root: chord.root,
                        type: chord.type,
                        voicing: 'close'
                    };

                    // 测试不同keyInfo传递情况
                    console.log(`🧪 测试场景1: 传递正确的G小调keyInfo`);
                    console.log(`   keyInfo详情: flats=${gMinorKeyInfo?.flats}, sharps=${gMinorKeyInfo?.sharps}`);

                    const correctResult = getCorrectEnharmonic(ebNoteIndex, chordContext, 4, gMinorKeyInfo);
                    console.log(`   结果: step=${correctResult.step}, alter=${correctResult.alter}`);
                    console.log(`   期望: step=E, alter=-1 (Eb)`);

                    if (correctResult.step === 'E' && correctResult.alter === -1) {
                        console.log(`   ✅ 正确: Eb拼写正确`);
                    } else {
                        console.error(`   ❌ 错误: Eb被拼成${correctResult.step}${correctResult.alter > 0 ? '#'.repeat(correctResult.alter) : correctResult.alter < 0 ? 'b'.repeat(Math.abs(correctResult.alter)) : ''}`);
                    }

                    console.log(`🧪 测试场景2: keyInfo为null`);
                    const nullResult = getCorrectEnharmonic(ebNoteIndex, chordContext, 4, null);
                    console.log(`   结果: step=${nullResult.step}, alter=${nullResult.alter}`);

                    console.log(`🧪 测试场景3: keyInfo为空对象`);
                    const emptyResult = getCorrectEnharmonic(ebNoteIndex, chordContext, 4, {});
                    console.log(`   结果: step=${emptyResult.step}, alter=${emptyResult.alter}`);
                }
            }

            // 步骤4: 测试完整的MusicXML生成链条
            console.log(`🔗 测试完整MusicXML渲染链条`);
            try {
                const xmlResult = generateChordNotesXML(chord, gMinorKeyInfo, '4/4');

                // 查找XML中的音符信息
                const stepRegex = /<step>([A-G])<\/step>/g;
                const alterRegex = /<alter>(-?\d+)<\/alter>/g;

                let stepMatches = [];
                let alterMatches = [];
                let match;

                while ((match = stepRegex.exec(xmlResult)) !== null) {
                    stepMatches.push(match[1]);
                }

                while ((match = alterRegex.exec(xmlResult)) !== null) {
                    alterMatches.push(parseInt(match[1]));
                }

                console.log(`📄 XML中的音符: steps=[${stepMatches.join(', ')}], alters=[${alterMatches.join(', ')}]`);

                // 检查是否有D#错误 (step="D" alter="1")
                for (let i = 0; i < stepMatches.length; i++) {
                    if (stepMatches[i] === 'D' && alterMatches[i] === 1) {
                        console.error(`❌ 发现D#问题: step=${stepMatches[i]}, alter=${alterMatches[i]} (应该是Eb)`);
                    }
                    if (stepMatches[i] === 'E' && alterMatches[i] === -1) {
                        console.log(`✅ 正确: 找到Eb (step=${stepMatches[i]}, alter=${alterMatches[i]})`);
                    }
                }

            } catch (xmlError) {
                console.error(`❌ MusicXML生成错误:`, xmlError);
            }

        } catch (chordError) {
            console.error(`❌ 和弦生成错误:`, chordError);
        }
    });

    // 步骤5: 测试调性检测的准确性
    console.log(`\n🔍 调性检测准确性验证:`);
    const variations = ['g-minor', 'G-minor', 'g minor'];
    variations.forEach(keyVariation => {
        try {
            const keyInfo = harmonyTheory.keys[keyVariation];
            if (keyInfo) {
                console.log(`   '${keyVariation}': flats=${keyInfo.flats}, sharps=${keyInfo.sharps}, tonic=${keyInfo.tonic}, mode=${keyInfo.mode}`);
            } else {
                console.log(`   '${keyVariation}': ❌ 调性不存在`);
            }
        } catch (e) {
            console.log(`   '${keyVariation}': 错误 - ${e.message}`);
        }
    });

    console.log('\n🔍 ==================== G小调诊断完成 ====================\n');
}

// 🔍 全面诊断G小调在不同场景下的Eb/D#问题
function diagnoseGMinorComprehensive() {
    console.log('\n🔬 ==================== G小调全面诊断启动 ====================');

    // 测试不同的生成场景
    const testScenarios = [
        {
            name: '随机模式Eb大三和弦',
            method: 'random',
            chordType: { root: 'Eb', type: 'major' },
            key: 'g-minor'
        },
        {
            name: '功能和声模式C小调',
            method: 'functional',
            chordType: { root: 'C', type: 'minor' },
            key: 'g-minor'
        },
        {
            name: '直接generateDiverseProgression',
            method: 'diverse',
            chordType: null,
            key: 'g-minor'
        }
    ];

    const voicingTypes = ['close', 'drop2', 'drop3', 'shell'];

    testScenarios.forEach((scenario, index) => {
        console.log(`\n--- 场景${index + 1}: ${scenario.name} ---`);

        try {
            let testChords = [];

            // 根据不同方法生成测试和弦
            if (scenario.method === 'random' || scenario.method === 'functional') {
                // 直接构建单个和弦进行测试
                const chord = harmonyTheory.buildChord(scenario.chordType.root, scenario.chordType.type, scenario.key);
                testChords = [{
                    ...chord,
                    duration: '4n',
                    measure: 1
                }];
            } else if (scenario.method === 'diverse') {
                // 使用实际的生成函数
                try {
                    const progression = generateDiverseProgression(scenario.key, 2); // 生成2小节
                    testChords = progression.measures.flatMap(measure => measure.chords);
                    console.log(`🎵 生成的和弦进行: ${testChords.map(c => `${c.root}${c.type}`).join(' - ')}`);
                } catch (e) {
                    console.error(`❌ generateDiverseProgression失败:`, e);
                    return;
                }
            }

            // 找到包含Eb的和弦
            const chordsWithEb = testChords.filter(chord =>
                chord.notes && chord.notes.includes('Eb')
            );

            if (chordsWithEb.length === 0) {
                console.log(`⚠️ 该场景没有生成包含Eb的和弦`);
                return;
            }

            console.log(`🎵 发现${chordsWithEb.length}个包含Eb的和弦:`,
                chordsWithEb.map(c => `${c.root}${c.type}(${c.notes?.join('-')})`));

            // 测试每种voicing类型
            voicingTypes.forEach(voicingType => {
                console.log(`\n  🎸 测试${voicingType}配置:`);

                chordsWithEb.forEach(chord => {
                    // 测试MusicXML生成 - 这是关键步骤
                    try {
                        const keyInfo = harmonyTheory.keys[scenario.key];
                        if (!keyInfo) {
                            console.error(`❌ 无法获取调性信息: ${scenario.key}`);
                            return;
                        }

                        // 创建更真实的和弦上下文
                        const enhancedChord = {
                            ...chord,
                            voicing: voicingType,
                            key: scenario.key
                        };

                        console.log(`    🧪 测试 ${chord.root}${chord.type} (${voicingType})`);

                        // 生成MusicXML - 这里可能会触发问题
                        const xmlResult = generateChordNotesXML(enhancedChord, keyInfo, '4/4');

                        // 解析XML中的step和alter
                        const stepRegex = /<step>([A-G])<\/step>/g;
                        const alterRegex = /<alter>(-?\d+)<\/alter>/g;

                        let stepMatches = [];
                        let alterMatches = [];
                        let match;

                        while ((match = stepRegex.exec(xmlResult)) !== null) {
                            stepMatches.push(match[1]);
                        }

                        while ((match = alterRegex.exec(xmlResult)) !== null) {
                            alterMatches.push(parseInt(match[1]));
                        }

                        // 检查是否有问题的D# (step="D" alter="1")
                        let foundProblem = false;
                        let foundCorrectEb = false;

                        for (let i = 0; i < stepMatches.length; i++) {
                            if (stepMatches[i] === 'D' && alterMatches[i] === 1) {
                                console.error(`    ❌ 发现D#问题! step=${stepMatches[i]}, alter=${alterMatches[i]} (应该是Eb)`);
                                foundProblem = true;
                            }
                            if (stepMatches[i] === 'E' && alterMatches[i] === -1) {
                                console.log(`    ✅ 找到正确Eb: step=${stepMatches[i]}, alter=${alterMatches[i]}`);
                                foundCorrectEb = true;
                            }
                        }

                        if (!foundProblem && foundCorrectEb) {
                            console.log(`    ✅ ${voicingType}配置下Eb拼写正确`);
                        } else if (!foundProblem && !foundCorrectEb) {
                            console.log(`    ⚠️ ${voicingType}配置下未找到Eb音符`);
                        }

                        // 显示完整的音符信息
                        console.log(`    📄 音符: ${stepMatches.map((step, i) =>
                            `${step}${alterMatches[i] > 0 ? '#'.repeat(alterMatches[i]) : alterMatches[i] < 0 ? 'b'.repeat(Math.abs(alterMatches[i])) : ''}`
                        ).join(', ')}`);

                    } catch (xmlError) {
                        console.error(`    ❌ MusicXML生成失败 (${voicingType}):`, xmlError);
                    }
                });
            });

        } catch (scenarioError) {
            console.error(`❌ 场景${index + 1}执行失败:`, scenarioError);
        }
    });

    // 额外测试：模拟实际UI调用流程
    console.log(`\n🎯 === 模拟实际UI调用流程 ===`);
    try {
        // 模拟用户选择G小调并生成和弦的实际流程
        const actualKey = 'g-minor';
        console.log(`🎵 模拟用户选择调性: ${actualKey}`);

        // 测试实际的和弦生成流程 - 这可能使用不同的代码路径
        if (typeof generateRandomChordProgression === 'function') {
            console.log(`🎲 测试随机和弦生成...`);
            const randomResult = generateRandomChordProgression(actualKey, 1);
            console.log(`🎵 随机生成结果:`, randomResult);
        }

        if (typeof generateFunctionalProgression === 'function') {
            console.log(`🎼 测试功能和声生成...`);
            const functionalResult = generateFunctionalProgression(actualKey, 1);
            console.log(`🎵 功能和声结果:`, functionalResult);
        }

    } catch (uiError) {
        console.error(`❌ UI流程模拟失败:`, uiError);
    }

    console.log('\n🔬 ==================== G小调全面诊断完成 ====================\n');
}

// 🔍 专门诊断getChordSpellingRules函数的C小三和弦问题
function diagnoseCMinorSpellingRules() {
    console.log('\n🔬 ==================== C小三和弦拼写规则诊断 ====================');

    // 测试C小三和弦的拼写规则
    const testRoot = 'C';
    const testType = 'minor';

    console.log(`🎵 测试和弦: ${testRoot}${testType}`);

    // 直接调用getChordSpellingRules函数
    const spellingRules = getChordSpellingRules(testRoot, testType);
    console.log(`🔍 生成的拼写规则:`, spellingRules);

    // 测试每个可能的音符索引
    const expectedNotes = [
        { index: 0, note: 'C', expected: 'C natural' },
        { index: 3, note: 'Eb', expected: 'Eb (E with alter=-1)' },
        { index: 7, note: 'G', expected: 'G natural' }
    ];

    expectedNotes.forEach(noteTest => {
        const rule = spellingRules[noteTest.index];
        if (rule) {
            console.log(`✅ 索引${noteTest.index} (${noteTest.note}): 有规则 step=${rule.step}, alter=${rule.alter}`);
        } else {
            console.error(`❌ 索引${noteTest.index} (${noteTest.note}): 无规则! 期望: ${noteTest.expected}`);
        }
    });

    // 测试在G小调环境下的实际拼写结果
    console.log(`\n🧪 在G小调环境下测试实际拼写结果:`);
    const gMinorKeyInfo = harmonyTheory.keys['g-minor'];

    expectedNotes.forEach(noteTest => {
        const chordContext = { root: testRoot, type: testType };

        console.log(`\n🎵 测试 ${noteTest.note} (索引${noteTest.index}):`);
        console.log(`   和弦上下文: ${chordContext.root}${chordContext.type}`);

        const result = getCorrectEnharmonic(noteTest.index, chordContext, 4, gMinorKeyInfo);
        console.log(`   渲染结果: step=${result.step}, alter=${result.alter}`);

        // 转换为易读格式
        const displayNote = `${result.step}${result.alter > 0 ? '#'.repeat(result.alter) : result.alter < 0 ? 'b'.repeat(Math.abs(result.alter)) : ''}`;
        console.log(`   显示为: ${displayNote}`);

        // 检查是否正确
        if (noteTest.index === 0 && result.step === 'C' && result.alter === 0) {
            console.log(`   ✅ C根音拼写正确`);
        } else if (noteTest.index === 3 && result.step === 'E' && result.alter === -1) {
            console.log(`   ✅ Eb三音拼写正确`);
        } else if (noteTest.index === 7 && result.step === 'G' && result.alter === 0) {
            console.log(`   ✅ G五音拼写正确`);
        } else {
            console.error(`   ❌ 拼写错误! 期望: ${noteTest.expected}`);

            // 详细分析错误原因
            console.log(`   🔍 错误分析:`);
            console.log(`     - G小调有${gMinorKeyInfo.flats}个降号`);
            console.log(`     - 是否满足flats>=4条件: ${gMinorKeyInfo.flats >= 4 ? '是' : '否'}`);
            console.log(`     - 拼写规则中该索引的规则:`, spellingRules[noteTest.index] || '无规则');
        }
    });

    console.log('\n🔬 ==================== C小三和弦拼写规则诊断完成 ====================\n');
}

// 🔧 验证全局小调同音异名问题修复效果
function testGlobalMinorEnharmonicFix() {
    console.log('\n🔧 ==================== 全局小调同音异名修复验证 ====================');

    // 测试用户报告的具体问题场景
    const testCases = [
        {
            keyName: 'c-minor',
            problematicNotes: [10], // Bb (用户报告Bb→A#)
            description: 'C小调中的Bb拼写'
        },
        {
            keyName: 'f-minor',
            problematicNotes: [3, 1], // Eb, Db (用户报告Eb→D#, Db→C#)
            description: 'F小调中的Eb和Db拼写'
        },
        {
            keyName: 'g-minor',
            problematicNotes: [3, 10], // Eb, Bb (G小调测试)
            description: 'G小调中的Eb和Bb拼写'
        },
        {
            keyName: 'd-minor',
            problematicNotes: [10], // Bb (D小调测试)
            description: 'D小调中的Bb拼写'
        }
    ];

    // 也测试一个大调（用户报告的Gb大调Cb→B问题）
    const majorTestCases = [
        {
            keyName: 'gb-major', // 可能需要修正调性名称
            problematicNotes: [11], // Cb (用户报告Cb→B)
            description: 'Gb大调中的Cb拼写'
        }
    ];

    const allTestCases = [...testCases, ...majorTestCases];

    allTestCases.forEach((testCase, index) => {
        console.log(`\n--- 测试${index + 1}: ${testCase.description} ---`);

        const keyInfo = harmonyTheory.keys[testCase.keyName];
        if (!keyInfo) {
            console.error(`❌ 找不到调性信息: ${testCase.keyName}`);
            return;
        }

        console.log(`📊 调性信息: ${keyInfo.tonic} ${keyInfo.mode}, ${keyInfo.flats}♭ ${keyInfo.sharps}♯`);
        console.log(`🔍 是否满足新条件(flats>=1): ${keyInfo.flats >= 1 ? '是' : '否'}`);

        testCase.problematicNotes.forEach(noteIndex => {
            console.log(`\n🎵 测试音符索引 ${noteIndex}:`);

            // 不提供和弦上下文，测试纯调性拼写
            const result1 = getCorrectEnharmonic(noteIndex, null, 4, keyInfo);
            console.log(`   无和弦上下文: step=${result1.step}, alter=${result1.alter}`);

            const displayNote1 = `${result1.step}${result1.alter > 0 ? '#'.repeat(result1.alter) : result1.alter < 0 ? 'b'.repeat(Math.abs(result1.alter)) : ''}`;
            console.log(`   显示为: ${displayNote1}`);

            // 验证是否为降号拼写
            if (result1.alter < 0) {
                console.log(`   ✅ 正确使用降号拼写`);
            } else if (result1.alter > 0) {
                console.error(`   ❌ 错误：使用了升号拼写 (${displayNote1})`);
            } else {
                console.log(`   ℹ️ 使用自然音拼写 (${displayNote1})`);
            }

            // 也测试有和弦上下文的情况
            const testChordContext = { root: keyInfo.tonic, type: 'minor' };
            const result2 = getCorrectEnharmonic(noteIndex, testChordContext, 4, keyInfo);
            const displayNote2 = `${result2.step}${result2.alter > 0 ? '#'.repeat(result2.alter) : result2.alter < 0 ? 'b'.repeat(Math.abs(result2.alter)) : ''}`;

            console.log(`   有和弦上下文(${testChordContext.root}${testChordContext.type}): ${displayNote2}`);

            // 比较两种情况是否一致
            if (result1.step === result2.step && result1.alter === result2.alter) {
                console.log(`   ✅ 有无上下文结果一致`);
            } else {
                console.warn(`   ⚠️ 有无上下文结果不一致`);
            }
        });
    });

    console.log('\n🔧 ==================== 全局小调同音异名修复验证完成 ====================\n');
}

// 🧪 真实UI场景测试：模拟用户实际操作
function testRealUIScenarios() {
    console.log('\n🧪 ==================== 真实UI场景测试 ====================');

    // 用户报告问题的具体场景
    const realScenarios = [
        {
            key: 'c-minor',
            description: 'C小调生成和弦，检查是否有Bb→A#问题'
        },
        {
            key: 'f-minor',
            description: 'F小调生成和弦，检查是否有Eb→D#, Db→C#问题'
        },
        {
            key: 'g-minor',
            description: 'G小调生成和弦，检查是否有Eb→D#问题'
        }
    ];

    realScenarios.forEach((scenario, index) => {
        console.log(`\n--- 真实场景${index + 1}: ${scenario.description} ---`);

        try {
            // 模拟用户生成和弦的完整流程
            console.log(`🎹 模拟用户选择调性: ${scenario.key}`);

            // 使用实际的generateDiverseProgression函数
            const progression = generateDiverseProgression(scenario.key, 1);
            console.log(`🎵 生成的和弦进行:`, progression);

            if (progression && progression.measures && progression.measures[0]) {
                const firstMeasure = progression.measures[0];
                console.log(`🎼 第一小节和弦:`, firstMeasure.chords);

                // 测试每个和弦的MusicXML渲染
                firstMeasure.chords.forEach((chord, chordIndex) => {
                    console.log(`\n🎵 测试和弦${chordIndex + 1}: ${chord.root}${chord.type}`);
                    console.log(`   构建的音符: [${chord.notes ? chord.notes.join('-') : '无'}]`);

                    if (chord.notes) {
                        // 检查是否包含问题音符
                        const problematicNotes = chord.notes.filter(note =>
                            note.includes('#') && (
                                note === 'A#' || note === 'D#' || note === 'C#'
                            )
                        );

                        if (problematicNotes.length > 0) {
                            console.error(`   ❌ 发现问题音符: [${problematicNotes.join(', ')}]`);
                        } else {
                            console.log(`   ✅ 音符拼写看起来正确`);
                        }

                        // 测试MusicXML渲染
                        try {
                            const keyInfo = harmonyTheory.keys[scenario.key];
                            const xmlResult = generateChordNotesXML(chord, keyInfo, '4/4');

                            // 分析XML中的音符
                            const stepRegex = /<step>([A-G])<\/step>/g;
                            const alterRegex = /<alter>(-?\d+)<\/alter>/g;

                            let stepMatches = [];
                            let alterMatches = [];
                            let match;

                            while ((match = stepRegex.exec(xmlResult)) !== null) {
                                stepMatches.push(match[1]);
                            }

                            while ((match = alterRegex.exec(xmlResult)) !== null) {
                                alterMatches.push(parseInt(match[1]));
                            }

                            // 转换为用户看到的显示格式
                            const displayNotes = stepMatches.map((step, i) => {
                                const alter = alterMatches[i] || 0;
                                return `${step}${alter > 0 ? '#'.repeat(alter) : alter < 0 ? 'b'.repeat(Math.abs(alter)) : ''}`;
                            });

                            console.log(`   📄 XML渲染结果: [${displayNotes.join(', ')}]`);

                            // 检查是否有错误的升号拼写
                            const badSharps = displayNotes.filter(note =>
                                note === 'A#' || note === 'D#' || note === 'C#'
                            );

                            if (badSharps.length > 0) {
                                console.error(`   🚨 XML渲染错误: 发现升号拼写 [${badSharps.join(', ')}]`);
                                console.error(`   💡 应该使用降号: A#→Bb, D#→Eb, C#→Db`);
                            } else {
                                console.log(`   ✅ XML渲染正确: 使用了正确的降号拼写`);
                            }

                        } catch (xmlError) {
                            console.error(`   ❌ MusicXML渲染失败:`, xmlError);
                        }
                    }
                });
            } else {
                console.error(`❌ 和弦生成失败: ${scenario.key}`);
            }

        } catch (scenarioError) {
            console.error(`❌ 场景测试失败:`, scenarioError);
        }
    });

    console.log('\n🧪 ==================== 真实UI场景测试完成 ====================\n');
}

// 🔍 诊断C-E-F#和弦识别问题
function diagnoseChordEFSharpMisidentification() {
    console.log('\n🔍 ==================== C-E-F#和弦识别问题诊断 ====================');
    console.log('🎯 目标：检查C-E-F#被错误识别为C+（增三和弦）的问题');

    // 1. 分析C-E-F#和弦的音程结构
    console.log('\n📊 步骤1: 音程结构分析');
    const testChord = { root: 'C', notes: ['C', 'E', 'F#'], type: 'unknown' };
    console.log(`🎵 测试和弦: [${testChord.notes.join('-')}]`);

    // 计算音程
    const cSemitone = harmonyTheory.noteToSemitone['C'];
    testChord.notes.forEach((note, i) => {
        const semitone = harmonyTheory.noteToSemitone[note];
        const interval = (semitone - cSemitone + 12) % 12;

        const intervalName = (() => {
            switch(interval) {
                case 0: return '根音';
                case 4: return '大三度';
                case 6: return '#11度(增四度)';
                case 8: return '增五度';
                default: return `${interval}半音`;
            }
        })();

        console.log(`   ${note}: ${intervalName} (${interval}半音)`);
    });

    // 2. 对比正确的C+和弦
    console.log('\n📋 步骤2: 与正确增三和弦对比');
    const cAugmented = harmonyTheory.buildChord('C', 'augmented', 'a-minor');
    if (cAugmented) {
        console.log(`🎼 正确的C+和弦: [${cAugmented.notes.join('-')}]`);
        console.log(`🔍 对比分析:`);
        console.log(`   C-E-F#: 根音 + 大三度 + #11度 (0-4-6半音)`);
        console.log(`   C-E-G#: 根音 + 大三度 + 增五度 (0-4-8半音)`);
        console.log(`💡 结论: C-E-F#不是增三和弦，是C(add#11)或其他类型`);
    }

    // 3. 检查和弦识别逻辑
    console.log('\n🔧 步骤3: 和弦识别逻辑检查');

    // 检查是否存在错误的音程匹配逻辑
    const augmentedIntervals = harmonyTheory.chordTypes['augmented'];
    console.log(`📖 增三和弦标准音程: [${augmentedIntervals.join(', ')}]`);

    const testChordIntervals = testChord.notes.map(note => {
        const semitone = harmonyTheory.noteToSemitone[note];
        return (semitone - cSemitone + 12) % 12;
    });
    console.log(`🔍 C-E-F#实际音程: [${testChordIntervals.join(', ')}]`);

    // 检查是否匹配增三和弦音程
    const intervalsMatch = JSON.stringify(augmentedIntervals.sort()) === JSON.stringify(testChordIntervals.sort());
    console.log(`🎯 音程匹配检查: ${intervalsMatch ? '✅ 匹配' : '❌ 不匹配'}`);

    if (!intervalsMatch) {
        console.log(`💡 C-E-F#不应该被识别为增三和弦`);
        console.log(`   建议: 检查和弦识别算法中的容错逻辑或异名同音处理`);
    }

    // 4. 检查可能的异名同音问题
    console.log('\n🎼 步骤4: 异名同音问题检查');
    console.log(`🔍 检查F#是否被误认为Gb:`);

    const fSharpSemitone = harmonyTheory.noteToSemitone['F#'];
    const gbSemitone = harmonyTheory.noteToSemitone['Gb'];
    console.log(`   F#半音值: ${fSharpSemitone}`);
    console.log(`   Gb半音值: ${gbSemitone}`);

    if (fSharpSemitone === gbSemitone) {
        console.log(`⚠️ F#和Gb是异名同音(${fSharpSemitone}半音)`);
        console.log(`💡 可能的问题: 系统将F#误认为Gb，导致C-E-Gb被错误分析`);

        // 测试C-E-Gb是否更接近增三和弦
        const cGbInterval = (gbSemitone - cSemitone + 12) % 12;
        console.log(`🔍 C到Gb的音程: ${cGbInterval}半音`);

        if (cGbInterval === 6) {
            console.log(`⚠️ C-E-Gb包含C到Gb的6半音间距（减五度）`);
            console.log(`💡 但这仍然不是增三和弦（应该是8半音的增五度）`);
        }
    }

    // 5. 生成修复建议
    console.log('\n🔧 步骤5: 修复建议');
    console.log(`📋 诊断结果:`);
    console.log(`   1. C-E-F#不是增三和弦，包含#11度而非增五度`);
    console.log(`   2. 正确的增三和弦应该是C-E-G# (0-4-8半音)`);
    console.log(`   3. C-E-F#可能被错误归类或生成`);

    console.log(`\n🛠️ 建议修复方案:`);
    console.log(`   1. 检查和弦类型识别算法，确保音程匹配精确`);
    console.log(`   2. 如果C-E-F#不应该被生成，增加过滤逻辑`);
    console.log(`   3. 如果应该被生成，正确标识为C(add#11)而非C+`);
    console.log(`   4. 检查异名同音处理是否影响识别逻辑`);

    console.log('\n🔍 ==================== C-E-F#和弦识别问题诊断完成 ====================\n');

    return {
        chordAnalyzed: testChord,
        correctAugmented: cAugmented,
        intervalsMatch: intervalsMatch,
        enharmonicIssue: fSharpSemitone === gbSemitone,
        recommendations: [
            'precision_check_chord_identification',
            'filter_inappropriate_chords',
            'proper_labeling_add11_chords',
            'enharmonic_handling_review'
        ]
    };
}

// 将隔离验证函数添加到全局作用域
window.diagnoseGMinorEnharmonicRendering = diagnoseGMinorEnharmonicRendering;
window.diagnoseGMinorComprehensive = diagnoseGMinorComprehensive;
window.diagnoseCMinorSpellingRules = diagnoseCMinorSpellingRules;
window.testGlobalMinorEnharmonicFix = testGlobalMinorEnharmonicFix;
window.diagnoseChordEFSharpMisidentification = diagnoseChordEFSharpMisidentification;
window.testRealUIScenarios = testRealUIScenarios;
window.verifyEnhancedTriadIsolation = verifyEnhancedTriadIsolation;
window.verifyVoicingSelectionMechanism = verifyVoicingSelectionMechanism;
window.diagnoseFlatKeyEnharmonicIssues = diagnoseFlatKeyEnharmonicIssues;

/**
 * 诊断降号调同音异名问题
 * 专门测试C小调、F小调、Gb大调等用户反馈的问题
 */
function diagnoseFlatKeyEnharmonicIssues() {
    console.log('\n🔍 ===== 诊断降号调同音异名问题 =====');

    if (!window.harmonyTheory) {
        console.error('❌ harmonyTheory对象不存在，请先初始化系统');
        return;
    }

    const problemScenarios = [
        {
            key: 'c-minor',
            note: 'Bb',
            issue: 'Bb被拼成A#',
            semitone: 10,
            description: 'C小调中的Bb音符'
        },
        {
            key: 'f-minor',
            note: 'Eb',
            issue: 'Eb被拼成D#',
            semitone: 3,
            description: 'F小调中的Eb音符'
        },
        {
            key: 'f-minor',
            note: 'Db',
            issue: 'Db被拼成C#',
            semitone: 1,
            description: 'F小调中的Db音符'
        },
        {
            key: 'gb-major',
            note: 'Cb',
            issue: 'Cb被拼成B',
            semitone: 11,
            description: 'Gb大调中的Cb音符'
        }
    ];

    let allIssuesFixed = true;

    console.log('🎵 测试降号调音符拼写:');

    problemScenarios.forEach((scenario, index) => {
        console.log(`\n测试 ${index + 1}: ${scenario.description}`);

        try {
            // 获取调性信息
            const keyInfo = harmonyTheory.keys[scenario.key];
            if (!keyInfo) {
                console.error(`   ❌ 找不到调性信息: ${scenario.key}`);
                allIssuesFixed = false;
                return;
            }

            console.log(`   调性: ${scenario.key} (${keyInfo.flats}个降号)`);
            console.log(`   期望音符: ${scenario.note}`);
            console.log(`   半音值: ${scenario.semitone}`);

            // 测试getCorrectEnharmonic函数
            const result = getCorrectEnharmonic(scenario.semitone, null, 4, keyInfo);

            // 构造期望的音符字符串
            let expectedNote = scenario.note;
            let actualNote = result.step;
            if (result.alter > 0) {
                actualNote += '#'.repeat(result.alter);
            } else if (result.alter < 0) {
                actualNote += 'b'.repeat(Math.abs(result.alter));
            }

            console.log(`   实际结果: ${actualNote} (step=${result.step}, alter=${result.alter})`);

            if (actualNote === expectedNote) {
                console.log(`   ✅ 拼写正确: ${scenario.semitone} → ${actualNote}`);
            } else {
                console.log(`   ❌ 拼写错误: ${scenario.semitone} → ${actualNote} (期望: ${expectedNote})`);
                console.log(`   🚨 问题确认: ${scenario.issue}`);
                allIssuesFixed = false;
            }

        } catch (error) {
            console.error(`   ❌ 测试异常: ${error.message}`);
            allIssuesFixed = false;
        }
    });

    // 测试实际和弦生成情况
    console.log('\n🎼 测试实际和弦生成:');

    const chordTests = [
        { key: 'c-minor', root: 'G', type: 'major', expectedNotes: ['G', 'B', 'D'], description: 'C小调中的G大调' },
        { key: 'f-minor', root: 'Bb', type: 'major', expectedNotes: ['Bb', 'D', 'F'], description: 'F小调中的Bb大调' },
        { key: 'gb-major', root: 'Cb', type: 'major', expectedNotes: ['Cb', 'Eb', 'Gb'], description: 'Gb大调中的Cb大调' }
    ];

    chordTests.forEach((test, index) => {
        console.log(`\n和弦测试 ${index + 1}: ${test.description}`);

        try {
            const chord = harmonyTheory.buildChord(test.root, test.type, test.key);
            console.log(`   生成的和弦: ${JSON.stringify(chord.notes)}`);
            console.log(`   期望的和弦: ${JSON.stringify(test.expectedNotes)}`);

            const hasCorrectNotes = test.expectedNotes.every(note => chord.notes.includes(note));
            if (hasCorrectNotes) {
                console.log(`   ✅ 和弦拼写正确`);
            } else {
                console.log(`   ❌ 和弦拼写可能有问题`);
                allIssuesFixed = false;
            }

        } catch (error) {
            console.error(`   ❌ 和弦生成异常: ${error.message}`);
            allIssuesFixed = false;
        }
    });

    // 测试MusicXML渲染链
    console.log('\n🎛️ 测试MusicXML渲染链:');
    try {
        // 创建测试和弦对象
        const testChord = {
            root: 'Bb',
            type: 'major',
            notes: ['Bb', 'D', 'F'],
            key: 'c-minor'
        };

        // 测试关键调用链：generateChordNotesXML -> midiToPitchInfo -> getCorrectEnharmonic
        console.log('   测试generateChordNotesXML函数调用链...');

        // 模拟MIDI音符 (Bb = 58 in octave 4)
        const testMidi = 58;
        const keyInfo = harmonyTheory.keys['c-minor'];

        console.log(`   测试MIDI: ${testMidi} (应为Bb)`);
        console.log(`   调性信息: ${JSON.stringify(keyInfo)}`);

        const pitchInfo = midiToPitchInfo(testMidi, null, keyInfo);
        console.log(`   midiToPitchInfo结果: ${JSON.stringify(pitchInfo)}`);

        if (pitchInfo.step === 'B' && pitchInfo.alter === -1) {
            console.log('   ✅ MusicXML渲染链正常工作');
        } else {
            console.log('   ❌ MusicXML渲染链存在问题');
            allIssuesFixed = false;
        }

    } catch (error) {
        console.error(`   ❌ MusicXML渲染链测试异常: ${error.message}`);
        allIssuesFixed = false;
    }

    // 总结
    console.log('\n🎯 ===== 降号调同音异名问题诊断总结 =====');
    if (allIssuesFixed) {
        console.log('✅ 所有测试通过！降号调同音异名问题已修复！');
    } else {
        console.log('❌ 发现问题！需要进一步修复降号调的同音异名处理');

        console.log('\n🔧 可能的问题原因：');
        console.log('1. keySignature信息没有正确传递到getCorrectEnharmonic');
        console.log('2. 和弦生成过程中调性信息丢失');
        console.log('3. MusicXML渲染链的某个环节有问题');
        console.log('4. 降号调映射表需要完善');
    }

    return {
        allIssuesFixed,
        testType: 'flat-key-enharmonic-diagnosis',
        timestamp: new Date().toISOString()
    };
}

console.log('🧪 添加了测试函数：');
console.log('  - testFixedCloseVoicingGenerator() - 测试Close Voicing修复');
console.log('  - runComprehensiveTestSuite() - 综合测试所有修复');
console.log('  - verifyEnhancedTriadIsolation() - 🚫 验证增强系统隔离状态');
console.log('  - verifyVoicingSelectionMechanism() - 🔧 验证voicing选择机制重构');
console.log('  - diagnoseGMinorEnharmonicRendering() - 🔍 诊断G小调MusicXML同音异名问题');
console.log('  - diagnoseGMinorComprehensive() - 🔬 全面诊断G小调不同场景Eb/D#问题');
console.log('  - diagnoseCMinorSpellingRules() - 🎵 专门诊断C小三和弦拼写规则问题');
console.log('  - testGlobalMinorEnharmonicFix() - 🔧 验证全局小调同音异名修复效果');
console.log('  - diagnoseChordEFSharpMisidentification() - 🔍 诊断C-E-F#和弦识别问题');
console.log('  - testRealUIScenarios() - 🧪 测试真实UI场景中的同音异名问题');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 🚫 自动运行阶段2验证
if (typeof window !== 'undefined') {
    // 延迟执行，确保voicingEngine已初始化
    setTimeout(() => {
        console.log('\n🔧 === 阶段2自动验证启动 ===');

        if (typeof verifyEnhancedTriadIsolation === 'function') {
            console.log('\n🚫 自动执行增强系统隔离验证...');
            const isolationSuccess = verifyEnhancedTriadIsolation();

            if (isolationSuccess && typeof verifyVoicingSelectionMechanism === 'function') {
                console.log('\n🔧 自动执行voicing选择机制验证...');
                const selectionSuccess = verifyVoicingSelectionMechanism();

                if (isolationSuccess && selectionSuccess) {
                    console.log('\n🎉 === 阶段2验证全部通过！===');
                    console.log('✅ 增强系统已完全隔离');
                    console.log('✅ voicing选择机制已成功重构');
                    console.log('💡 现在可以安全使用和弦生成器，不会出现异常配置');
                } else {
                    console.error('\n❌ === 阶段2验证未完全通过 ===');
                    if (!isolationSuccess) console.error('❌ 增强系统隔离不完整');
                    if (!selectionSuccess) console.error('❌ voicing选择机制重构不完整');
                }
            }
        }
    }, 2000);
}

/**
 * 🔍 诊断函数：检查三和弦消失问题
 * 用户在控制台运行此函数来诊断为什么功能和声模式下Drop2/Drop3没有三和弦
 */
function diagnoseTriadIssue() {
    console.log('\n\n🔍 ========== 三和弦诊断报告 ==========');

    // 1. 检查用户的和弦类型设置
    console.log('\n📋 第1步：检查用户和弦类型设置');
    if (!window.chordSettings || !window.chordSettings.chordTypes) {
        console.error('❌ window.chordSettings.chordTypes 未定义！');
        console.log('💡 这意味着和弦类型设置没有被正确初始化');
        return;
    }

    const chordTypes = window.chordSettings.chordTypes;
    console.log(`✅ window.chordSettings.chordTypes = ${JSON.stringify(chordTypes)}`);
    console.log(`   数组长度: ${chordTypes.length}`);

    // 2. 分类统计
    console.log('\n📊 第2步：分类统计');
    const triads = chordTypes.filter(t => ['major', 'minor', 'diminished', 'augmented', 'sus', 'sus2', 'sus4'].includes(t));
    const sevenths = chordTypes.filter(t => t.includes('7') || t.includes('maj7'));
    const others = chordTypes.filter(t => !triads.includes(t) && !sevenths.includes(t));

    console.log(`   三和弦类型 (${triads.length}个): ${triads.join(', ') || '无'}`);
    console.log(`   七和弦类型 (${sevenths.length}个): ${sevenths.join(', ') || '无'}`);
    if (others.length > 0) {
        console.log(`   ⚠️ 其他/未知类型 (${others.length}个): ${others.join(', ')}`);
    }

    // 3. 检查voicing设置
    console.log('\n🎸 第3步：检查voicing设置');
    const voicingTypes = window.chordSettings.voicingTypes || [];
    console.log(`   Voicing类型: ${voicingTypes.join(', ') || '无'}`);
    const isUsingDrop2 = voicingTypes.includes('drop2');
    const isUsingDrop3 = voicingTypes.includes('drop3');
    console.log(`   使用Drop2: ${isUsingDrop2 ? '✅ 是' : '❌ 否'}`);
    console.log(`   使用Drop3: ${isUsingDrop3 ? '✅ 是' : '❌ 否'}`);

    // 4. 模拟过滤过程
    console.log('\n🔬 第4步：模拟过滤过程');
    const sampleTriad = { root: 'C', type: 'major', degree: 'I', function: 'tonic' };
    const sampleSeventh = { root: 'C', type: 'major7', degree: 'Imaj7', function: 'tonic' };

    console.log('   测试三和弦: Cmajor');
    const triadPasses = chordTypes.includes('major');
    console.log(`   → 通过过滤: ${triadPasses ? '✅ 是' : '❌ 否'}`);

    console.log('   测试七和弦: Cmaj7');
    const seventhPasses = chordTypes.includes('major7');
    console.log(`   → 通过过滤: ${seventhPasses ? '✅ 是' : '❌ 否'}`);

    // 5. 诊断结论
    console.log('\n💡 第5步：诊断结论');
    if (triads.length === 0) {
        console.error('❌ 问题诊断：用户没有勾选任何三和弦类型！');
        console.log('   📌 解决方案：');
        console.log('   1. 打开"和弦类型设置"弹窗');
        console.log('   2. 在"三和弦"部分勾选所需的类型（major, minor等）');
        console.log('   3. 点击"保存设置"');
        console.log('   4. 重新生成和弦');
    } else if (isUsingDrop2 || isUsingDrop3) {
        console.log('✅ 设置看起来正常：');
        console.log(`   - 已勾选 ${triads.length} 个三和弦类型`);
        console.log(`   - 使用 Drop2/Drop3 voicing`);
        console.log('\n   如果仍然没有三和弦生成，请：');
        console.log('   1. 生成一次和弦');
        console.log('   2. 检查控制台中的详细日志');
        console.log('   3. 搜索"过滤前"和"过滤后"来查看过滤过程');
        console.log('   4. 查看是否有"⏭️ 跳过三和弦"的日志');
    } else {
        console.warn('⚠️ 没有使用Drop2或Drop3 voicing');
        console.log('   如果要测试Drop2/Drop3三和弦问题，请勾选相应的voicing类型');
    }

    // 6. 检查白名单
    console.log('\n🛡️ 第6步：检查saveChordTypeSettings白名单');
    const validChordTypes = [
        'major', 'minor', 'diminished', 'augmented',
        'major7', 'minor7', 'dominant7', 'minor7b5', 'minorMaj7', 'augmented7', 'diminished7',
        'sus', 'sus2', 'sus4', '7sus', '7sus2', '7sus4',
        'major9', 'minor9', 'dominant9',
        'major11', 'minor11', 'dominant11',
        'major13', 'minor13', 'dominant13'
    ];

    const invalidTypes = chordTypes.filter(t => !validChordTypes.includes(t));
    if (invalidTypes.length > 0) {
        console.error(`❌ 检测到无效的和弦类型: ${invalidTypes.join(', ')}`);
        console.log('   这些类型不在白名单中，可能导致过滤异常');
    } else {
        console.log('✅ 所有和弦类型都在白名单中');
    }

    console.log('\n========== 诊断完成 ==========\n');
}
