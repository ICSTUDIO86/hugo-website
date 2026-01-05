/**
 * i18n.js - 国际化（Internationalization）模块
 *
 * 独立的翻译系统，支持多语言切换
 * 支持语言：简体中文(zh-CN)、繁体中文(zh-TW)、英文(en)
 *
 * 创建时间：2025-10-04
 * 分离自：chord-sight-reading.js (Line 441-850, 11215-11234)
 */

const I18n = {
    /**
     * 翻译数据库
     * 包含所有UI文本的多语言翻译
     */
    translations: {
        'zh-CN': {
            'app.title': 'IC Studio - 和弦视奏生成器',
            'app.subtitle': '专业级乐谱渲染与音乐理论工具',
            'app.melodyMode': '旋律视奏',
            'app.intervalMode': '音程视奏',
            'app.jianpuMode': '简谱视奏',
            'app.chordMode': '和弦视奏',
            'controls.chordType': '和弦类型',
            'controls.chordTypeSettings': '和弦类型设置',
            'controls.measures': '小节数',
            'controls.measures2': '2小节',
            'controls.measures4': '4小节',
            'controls.measures8': '8小节',
            'controls.key': '调号',
            'controls.KeySettings': '调号设置',
            'controls.time': '拍号',
            'controls.timeSettings': '拍号设置',
            'controls.clef': '谱号',
            'controls.clefSettings': '谱号设置',
            'controls.mode': '模式',
            'mode.free': '自由',
            'mode.challenge': '挑战',
            'controls.rangeMin': '最低音',
            'controls.rangeMax': '最高音',
            'controls.display': '显示控制',
            'controls.staff': '五线谱',
            'controls.chordSymbol': '和弦代号',
            'controls.metronome': '节拍器',
            'controls.generate': '生成和弦',
            'controls.previous': '上一条',
            'controls.next': '下一条',
            'controls.play': '播放',
            'controls.chordSymbols': '和弦代号',
            'controls.chordSymbolsShow': '显示和弦代号',
            'controls.chordSymbolsHide': '隐藏和弦代号',
            'controls.rhythm': '节奏设置',
            'score.empty': '点击生成和弦开始练习',
            'settings.title': '设置',
            'settings.theme': '主题',
            'settings.lightMode': '浅色模式',
            'settings.darkMode': '深色模式',
            'settings.language': '语言',
            'modal.challenge.title': '挑战模式',
            'challenge.prepTime': '准备时间（秒）',
            'challenge.bpm': 'BPM',
            'challenge.cursor': '光标',
            'challenge.metronome': '节拍器',
            'challenge.hide': '隐藏',
            'challenge.cursorHint': '光标开关：光标用于提示当前应演奏的位置，count-in结束后出现并随旋律跳动。',
            'challenge.hideHint': '隐藏开关：开启后，系统在进入下一小节时会自动遮挡上一小节，仅保留当前阅读区。',
            'challenge.preparingLabel': '准备',
            'challenge.seconds': '秒',
            'button.start': '开始',
            // 弹窗标题
            'modal.chordType.title': '和弦类型设置',
            'modal.rhythm.title': '节奏设置',
            'modal.keySignature.title': '调号设置',
            'modal.timeSignature.title': '拍号设置',
            'modal.clef.title': '谱号设置',
            // 弹窗内容
            'modal.chordType.triads': '三和弦',
            'modal.chordType.seventhChords': '七和弦',
            'modal.chordType.advancedSettings': '高级设置',
            'modal.chordType.voicingTypes': 'Voicing 类型选择',
            'modal.rhythm.basicUnit': '基本节奏单位',
            'modal.keySignature.major': '大调 (Major)',
            'modal.keySignature.minor': '小调 (Minor)',
            'modal.timeSignature.selection': '拍号选择',
            'modal.clef.selection': '谱号选择',
            // 和弦类型
            'chord.major': '大三和弦',
            'chord.minor': '小三和弦',
            'chord.diminished': '减三和弦',
            'chord.augmented': '增三和弦',
            'chord.sus': '挂和弦 (sus2/sus4)',
            'chord.triadInversion': '包含转位',
            'chord.major7': '大七和弦',
            'chord.minor7': '小七和弦',
            'chord.dominant7': '属七和弦',
            'chord.minor7b5': '半减七和弦 (m7♭5)',
            'chord.7sus': '七挂和弦 (7sus2/7sus4)',
            'chord.seventhInversion': '包含转位',
            // Voicing类型
            'voicing.close': '密集排列 (Close)',
            'voicing.drop2': 'Drop 2 Voicing',
            'voicing.drop3': 'Drop 3 Voicing',
            'voicing.shell': 'Shell Voicing',
            // 节奏类型
            'rhythm.whole': '全音符',
            'rhythm.half': '二分音符',
            'rhythm.quarter': '四分音符',
            'rhythm.eighth': '八分音符',
            'rhythm.sixteenth': '十六分音符',
            // 谱号类型
            'clef.grand_staff': '大谱表',
            'clef.treble': '高音谱号',
            'clef.bass': '低音谱号',
            // 按钮
            'button.advanced': '高级设置',
            'button.save': '保存设置',
            'button.cancel': '取消',
            'button.close': '关闭',
            'button.selectAll': '全选',
            'button.unselectAll': '取消全选',
            'button.selectAllMajor': '全选',
            'button.selectAllMinor': '全选',
            // 调号翻译
            'key.C-major': 'C 大调',
            'key.G-major': 'G 大调 (1#)',
            'key.D-major': 'D 大调 (2#)',
            'key.A-major': 'A 大调 (3#)',
            'key.E-major': 'E 大调 (4#)',
            'key.B-major': 'B 大调 (5#)',
            'key.Fs-major': 'F# 大调 (6#)',
            'key.F-major': 'F 大调 (1b)',
            'key.Bb-major': 'Bb 大调 (2b)',
            'key.Eb-major': 'Eb 大调 (3b)',
            'key.Ab-major': 'Ab 大调 (4b)',
            'key.Db-major': 'Db 大调 (5b)',
            'key.Gb-major': 'Gb 大调 (6b)',
            'key.a-minor': 'A 小调',
            'key.e-minor': 'E 小调 (1#)',
            'key.b-minor': 'B 小调 (2#)',
            'key.fs-minor': 'F# 小调 (3#)',
            'key.cs-minor': 'C# 小调 (4#)',
            'key.gs-minor': 'G# 小调 (5#)',
            'key.ds-minor': 'D# 小调 (6#)',
            'key.d-minor': 'D 小调 (1b)',
            'key.g-minor': 'G 小调 (2b)',
            'key.c-minor': 'C 小调 (3b)',
            'key.f-minor': 'F 小调 (4b)',
            'key.bb-minor': 'Bb 小调 (5b)',
            'key.eb-minor': 'Eb 小调 (6b)',
            // Voicing描述
            'voicing.description.title': '功能说明：',
            'voicing.description.close': '和弦各音尽量紧密排列在一起、音程间距较小的和声配置（三音）',
            'voicing.description.drop2': '将密集排列和声的第二高的音符降低一个八度（三音）',
            'voicing.description.drop3': '将密集排列和声的第三高的音符降低一个八度（四音）',
            'voicing.description.shell': '只保留和弦的 根音、三度、七度（省略五度等音）的简化和声配置（三音）',
            // 控件翻译
            'controls.harmonyMode': '和声模式',
            'controls.instrumentMode': '乐器模式',
            'controls.accidental': '临时记号',
            'controls.randomMode': '随机模式',
            'controls.pureRandomMode': '完全随机模式',
            'controls.functionalMode': '功能和声',
            'controls.guitarMode': '吉他和声',
            'controls.pianoMode': '钢琴和声',
            'controls.practiceCounter': '练习计数',
            'controls.practiceAdd': '+',
            'controls.practiceReset': '-',
            // 高级设置切换
            'button.showAdvanced': '高级设置',
            'button.hideAdvanced': '隐藏高级设置'
        },
        'zh-TW': {
            'app.title': 'IC Studio - 和弦視奏生成器',
            'app.subtitle': '專業級樂譜渲染與音樂理論工具',
            'app.melodyMode': '旋律視奏',
            'app.intervalMode': '音程視奏',
            'app.jianpuMode': '簡譜視奏',
            'app.chordMode': '和弦視奏',
            'controls.chordType': '和弦類型',
            'controls.chordTypeSettings': '和弦類型設置',
            'controls.measures': '小節數',
            'controls.measures2': '2小節',
            'controls.measures4': '4小節',
            'controls.measures8': '8小節',
            'controls.key': '調號',
            'controls.KeySettings': '調號設置',
            'controls.time': '拍號',
            'controls.timeSettings': '拍號設置',
            'controls.clef': '譜號',
            'controls.clefSettings': '譜號設置',
            'controls.mode': '模式',
            'mode.free': '自由',
            'mode.challenge': '挑戰',
            'controls.rangeMin': '最低音',
            'controls.rangeMax': '最高音',
            'controls.display': '顯示控制',
            'controls.staff': '五線譜',
            'controls.chordSymbol': '和弦代號',
            'controls.metronome': '節拍器',
            'controls.generate': '生成和弦',
            'controls.previous': '上一條',
            'controls.next': '下一條',
            'controls.play': '播放',
            'controls.practiceCounter': '練習計數',
            'controls.practiceAdd': '+',
            'controls.practiceReset': '-',
            'controls.chordSymbols': '和弦代號',
            'controls.chordSymbolsShow': '顯示和弦代號',
            'controls.chordSymbolsHide': '隱藏和弦代號',
            'controls.rhythm': '節奏設置',
            'score.empty': '點擊生成和弦開始練習',
            'settings.title': '設置',
            'settings.theme': '主題',
            'settings.lightMode': '淺色模式',
            'settings.darkMode': '深色模式',
            'settings.language': '語言',
            'modal.challenge.title': '挑戰模式',
            'challenge.prepTime': '準備時間（秒）',
            'challenge.bpm': 'BPM',
            'challenge.cursor': '光標',
            'challenge.metronome': '節拍器',
            'challenge.hide': '隱藏',
            'challenge.cursorHint': '光標開關：光標用於提示目前應演奏的位置，count-in結束後出現並隨旋律跳動。',
            'challenge.hideHint': '隱藏開關：開啟後，系統在進入下一小節時會自動遮擋上一小節，僅保留當前閱讀區。',
            'challenge.preparingLabel': '準備',
            'challenge.seconds': '秒',
            'button.start': '開始',
            // 弹窗标题
            'modal.chordType.title': '和弦類型設置',
            'modal.rhythm.title': '節奏設置',
            'modal.keySignature.title': '調號設置',
            'modal.timeSignature.title': '拍號設置',
            'modal.clef.title': '譜號設置',
            // 弹窗内容
            'modal.chordType.triads': '三和弦',
            'modal.chordType.seventhChords': '七和弦',
            'modal.chordType.advancedSettings': '高級設置',
            'modal.chordType.voicingTypes': 'Voicing 類型選擇',
            'modal.rhythm.basicUnit': '基本節奏單位',
            'modal.keySignature.major': '大調 (Major)',
            'modal.keySignature.minor': '小調 (Minor)',
            'modal.timeSignature.selection': '拍號選擇',
            'modal.clef.selection': '譜號選擇',
            // 和弦类型
            'chord.major': '大三和弦',
            'chord.minor': '小三和弦',
            'chord.diminished': '減三和弦',
            'chord.augmented': '增三和弦',
            'chord.sus': '掛和弦 (sus2/sus4)',
            'chord.triadInversion': '包含轉位',
            'chord.major7': '大七和弦',
            'chord.minor7': '小七和弦',
            'chord.dominant7': '屬七和弦',
            'chord.minor7b5': '半減七和弦 (m7♭5)',
            'chord.7sus': '七掛和弦 (7sus2/7sus4)',
            'chord.seventhInversion': '包含轉位',
            // Voicing类型
            'voicing.close': '密集排列 (Close)',
            'voicing.drop2': 'Drop 2 Voicing',
            'voicing.drop3': 'Drop 3 Voicing',
            'voicing.shell': 'Shell Voicing',
            // 节奏类型
            'rhythm.whole': '全音符',
            'rhythm.half': '二分音符',
            'rhythm.quarter': '四分音符',
            'rhythm.eighth': '八分音符',
            'rhythm.sixteenth': '十六分音符',
            // 谱号类型
            'clef.grand_staff': '大譜表',
            'clef.treble': '高音譜號',
            'clef.bass': '低音譜號',
            // 按钮
            'button.advanced': '高級設置',
            'button.save': '保存設置',
            'button.cancel': '取消',
            'button.close': '關閉',
            'button.selectAll': '全選',
            'button.unselectAll': '取消全選',
            'button.selectAllMajor': '全選大調',
            'button.selectAllMinor': '全選小調',
            // 调号翻译
            'key.C-major': 'C 大調',
            'key.G-major': 'G 大調 (1#)',
            'key.D-major': 'D 大調 (2#)',
            'key.A-major': 'A 大調 (3#)',
            'key.E-major': 'E 大調 (4#)',
            'key.B-major': 'B 大調 (5#)',
            'key.Fs-major': 'F# 大調 (6#)',
            'key.F-major': 'F 大調 (1b)',
            'key.Bb-major': 'Bb 大調 (2b)',
            'key.Eb-major': 'Eb 大調 (3b)',
            'key.Ab-major': 'Ab 大調 (4b)',
            'key.Db-major': 'Db 大調 (5b)',
            'key.Gb-major': 'Gb 大調 (6b)',
            'key.a-minor': 'A 小調',
            'key.e-minor': 'E 小調 (1#)',
            'key.b-minor': 'B 小調 (2#)',
            'key.fs-minor': 'F# 小調 (3#)',
            'key.cs-minor': 'C# 小調 (4#)',
            'key.gs-minor': 'G# 小調 (5#)',
            'key.ds-minor': 'D# 小調 (6#)',
            'key.d-minor': 'D 小調 (1b)',
            'key.g-minor': 'G 小調 (2b)',
            'key.c-minor': 'C 小調 (3b)',
            'key.f-minor': 'F 小調 (4b)',
            'key.bb-minor': 'Bb 小調 (5b)',
            'key.eb-minor': 'Eb 小調 (6b)',
            // Voicing描述
            'voicing.description.title': '功能說明：',
            'voicing.description.close': '和弦各音盡量緊密排列在一起、音程間距較小的和聲配置（三音）',
            'voicing.description.drop2': '將密集排列和聲的第二高的音符降低一個八度（三音）',
            'voicing.description.drop3': '將密集排列和聲的第三高的音符降低一個八度（四音）',
            'voicing.description.shell': '只保留和弦的 根音、三度、七度（省略五度等音）的簡化和聲配置（三音）',
            // 控件翻译
            'controls.harmonyMode': '和聲模式',
            'controls.instrumentMode': '樂器模式',
            'controls.accidental': '臨時記號',
            'controls.randomMode': '隨機模式',
            'controls.pureRandomMode': '完全隨機模式',
            'controls.functionalMode': '功能和聲',
            'controls.guitarMode': '吉他和聲',
            'controls.pianoMode': '鋼琴和聲',
            // 高級設置切換
            'button.showAdvanced': '高級設置',
            'button.hideAdvanced': '隱藏高級設置'
        },
        'en': {
            'app.title': 'IC Studio - Chord Sight-Reading Generator',
            'app.subtitle': 'Professional Music Score Rendering & Music Theory Tool',
            'app.melodyMode': 'Melody Sight-Reading',
            'app.intervalMode': 'Interval Sight-Reading',
            'app.jianpuMode': 'Jianpu Sight-Reading',
            'app.chordMode': 'Chord Sight-Reading',
            'controls.chordType': 'Chord Type',
            'controls.chordTypeSettings': 'Chord Type Settings',
            'controls.measures': 'Measures',
            'controls.measures2': '2 Measures',
            'controls.measures4': '4 Measures',
            'controls.measures8': '8 Measures',
            'controls.key': 'Key Signature',
            'controls.KeySettings': 'Key Settings',
            'controls.time': 'Time Signature',
            'controls.timeSettings': 'Time Settings',
            'controls.clef': 'Clef',
            'controls.clefSettings': 'Clef Settings',
            'controls.mode': 'Mode',
            'mode.free': 'Free',
            'mode.challenge': 'Challenge',
            'controls.rangeMin': 'Lowest Note',
            'controls.rangeMax': 'Highest Note',
            'controls.display': 'Display Controls',
            'controls.staff': 'Staff',
            'controls.chordSymbol': 'Chord Symbols',
            'controls.metronome': 'Metronome',
            'controls.generate': 'Generate Chords',
            'controls.previous': 'Previous',
            'controls.next': 'Next',
            'controls.practiceCounter': 'Practice',
            'controls.practiceAdd': '+',
            'controls.practiceReset': '-',
            'controls.play': '▶️ Play',
            'controls.chordSymbols': 'Chord Symbols',
            'controls.chordSymbolsShow': 'Show Chord Symbols',
            'controls.chordSymbolsHide': 'Hide Chord Symbols',
            'controls.rhythm': 'Rhythm Settings',
            'score.empty': 'Click Generate Chords to start practicing',
            'settings.title': 'Settings',
            'settings.theme': 'Theme',
            'settings.lightMode': 'Light Mode',
            'settings.darkMode': 'Dark Mode',
            'settings.language': 'Language',
            'modal.challenge.title': 'Challenge Mode',
            'challenge.prepTime': 'Preparation Time (sec)',
            'challenge.bpm': 'BPM',
            'challenge.cursor': 'Cursor',
            'challenge.metronome': 'Metronome',
            'challenge.hide': 'Hide',
            'challenge.cursorHint': 'Cursor toggle: The cursor indicates the exact playing position and appears after the count-in, following the melody.',
            'challenge.hideHint': 'Hide toggle: When enabled, the previous measure is masked as you enter the next, leaving only the current reading area.',
            'challenge.preparingLabel': 'Prep',
            'challenge.seconds': 'sec',
            'button.start': 'Start',
            // Modal titles
            'modal.chordType.title': 'Chord Type Settings',
            'modal.rhythm.title': 'Rhythm Settings',
            'modal.keySignature.title': 'Key Signature Settings',
            'modal.timeSignature.title': 'Time Signature Settings',
            'modal.clef.title': 'Clef Settings',
            // Modal content
            'modal.chordType.triads': 'Triads',
            'modal.chordType.seventhChords': 'Seventh Chords',
            'modal.chordType.advancedSettings': 'Advanced Settings',
            'modal.chordType.voicingTypes': 'Voicing Type Selection',
            'modal.rhythm.basicUnit': 'Basic Rhythm Unit',
            'modal.keySignature.major': 'Major Keys',
            'modal.keySignature.minor': 'Minor Keys',
            'modal.timeSignature.selection': 'Time Signature Selection',
            'modal.clef.selection': 'Clef Selection',
            // Chord types
            'chord.major': 'Major Triad',
            'chord.minor': 'Minor Triad',
            'chord.diminished': 'Diminished Triad',
            'chord.augmented': 'Augmented Triad',
            'chord.sus': 'Suspended Chords (sus2/sus4)',
            'chord.triadInversion': 'Include Inversions',
            'chord.major7': 'Major 7th',
            'chord.minor7': 'Minor 7th',
            'chord.dominant7': 'Dominant 7th',
            'chord.minor7b5': 'Half-Diminished 7th (m7♭5)',
            'chord.7sus': '7th Suspended (7sus2/7sus4)',
            'chord.seventhInversion': 'Include Inversions',
            // Voicing types
            'voicing.close': 'Close Voicing',
            'voicing.drop2': 'Drop 2 Voicing',
            'voicing.drop3': 'Drop 3 Voicing',
            'voicing.shell': 'Shell Voicing',
            // Rhythm types
            'rhythm.whole': 'Whole Note',
            'rhythm.half': 'Half Note',
            'rhythm.quarter': 'Quarter Note',
            'rhythm.eighth': 'Eighth Note',
            'rhythm.sixteenth': 'Sixteenth Note',
            // Clef types
            'clef.treble': 'Treble Clef',
            'clef.bass': 'Bass Clef',
            'clef.grand_staff': 'Grand Staff',
            // Buttons
            'button.advanced': 'Advanced Settings',
            'button.save': 'Save Settings',
            'button.cancel': 'Cancel',
            'button.close': 'Close',
            'button.selectAll': 'Select All',
            'button.unselectAll': 'Unselect All',
            'button.selectAllMajor': 'Select All Major',
            'button.selectAllMinor': 'Select All Minor',
            // Key signature translations
            'key.C-major': 'C Major',
            'key.G-major': 'G Major (1#)',
            'key.D-major': 'D Major (2#)',
            'key.A-major': 'A Major (3#)',
            'key.E-major': 'E Major (4#)',
            'key.B-major': 'B Major (5#)',
            'key.Fs-major': 'F# Major (6#)',
            'key.F-major': 'F Major (1♭)',
            'key.Bb-major': 'B♭ Major (2♭)',
            'key.Eb-major': 'E♭ Major (3♭)',
            'key.Ab-major': 'A♭ Major (4♭)',
            'key.Db-major': 'D♭ Major (5♭)',
            'key.Gb-major': 'G♭ Major (6♭)',
            'key.a-minor': 'A Minor',
            'key.e-minor': 'E Minor (1#)',
            'key.b-minor': 'B Minor (2#)',
            'key.fs-minor': 'F# Minor (3#)',
            'key.cs-minor': 'C# Minor (4#)',
            'key.gs-minor': 'G# Minor (5#)',
            'key.ds-minor': 'D# Minor (6#)',
            'key.d-minor': 'D Minor (1♭)',
            'key.g-minor': 'G Minor (2♭)',
            'key.c-minor': 'C Minor (3♭)',
            'key.f-minor': 'F Minor (4♭)',
            'key.bb-minor': 'B♭ Minor (5♭)',
            'key.eb-minor': 'E♭ Minor (6♭)',
            // Voicing descriptions
            'voicing.description.title': 'Function Description:',
            'voicing.description.close': 'Chord tones arranged tightly together with small intervals (3 voices)',
            'voicing.description.drop2': 'Lower the second-highest note of close voicing by an octave (3 voices)',
            'voicing.description.drop3': 'Lower the third-highest note of close voicing by an octave (4 voices)',
            'voicing.description.shell': 'Simplified voicing containing only root, 3rd, and 7th (omitting 5th) (3 voices)',
            // Controls translations
            'controls.harmonyMode': 'Harmony Mode',
            'controls.instrumentMode': 'Instrument Mode',
            'controls.accidental': 'Accidentals',
            'controls.randomMode': 'Random Mode',
            'controls.pureRandomMode': 'Pure Random Mode',
            'controls.functionalMode': 'Functional Harmony',
            'controls.guitarMode': 'Guitar Harmony',
            'controls.pianoMode': 'Piano Harmony',
            // Advanced settings toggle
            'button.showAdvanced': 'Advanced Settings',
            'button.hideAdvanced': 'Hide Advanced Settings'
        }
    },

    /**
     * 初始化i18n系统
     * 页面加载时自动应用保存的语言偏好
     */
    init() {
        // 1. 首先检查 localStorage 是否有用户选择
        const savedLang = localStorage.getItem('preferredLanguage');

        let currentLang;
        // 2. 如果没有保存的选择，自动检测浏览器语言
        if (!savedLang) {
            const browserLang = navigator.language || navigator.userLanguage;
            // 检测是否为中文环境（支持 zh, zh-CN, zh-TW, zh-HK）
            const isChinese = browserLang && browserLang.toLowerCase().startsWith('zh');
            currentLang = isChinese ? 'zh-CN' : 'en';
            console.log(`🌍 浏览器语言检测: ${browserLang} → ${currentLang}`);
        } else {
            currentLang = savedLang;
            console.log(`💾 使用保存的语言: ${savedLang}`);
        }

        this.applyLanguage(currentLang);
        console.log('🌐 I18n系统初始化完成，当前语言:', currentLang);
    },

    /**
     * 切换语言
     * @param {string} lang - 语言代码 ('zh-CN', 'zh-TW', 'en')
     */
    switchLanguage(lang) {
        // 验证语言代码有效性
        if (!this.translations[lang]) {
            console.warn(`⚠️ 不支持的语言: ${lang}，使用默认语言 zh-CN`);
            lang = 'zh-CN';
        }

        // 保存到localStorage
        localStorage.setItem('preferredLanguage', lang);

        // 应用翻译
        this.applyLanguage(lang);

        console.log('🌐 语言已切换为:', lang);
    },

    /**
     * 应用当前语言的翻译
     * @param {string} lang - 语言代码（可选，默认从localStorage读取）
     */
    applyLanguage(lang) {
        // 获取当前语言
        if (!lang) {
            lang = localStorage.getItem('preferredLanguage') || 'zh-CN';
        }

        // 获取翻译数据
        const currentTranslations = this.translations[lang] || this.translations['zh-CN'];

        // 应用翻译到所有带data-i18n属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (currentTranslations[key]) {
                element.textContent = currentTranslations[key];
            }
        });

        console.log('🌐 翻译已应用，语言:', lang);
    },

    /**
     * 获取翻译文本
     * @param {string} key - 翻译键
     * @param {string} lang - 语言代码（可选）
     * @returns {string} 翻译后的文本
     */
    t(key, lang) {
        if (!lang) {
            lang = localStorage.getItem('preferredLanguage') || 'zh-CN';
        }

        const translations = this.translations[lang] || this.translations['zh-CN'];
        return translations[key] || key;
    }
};

// 暴露到全局作用域
window.I18n = I18n;

// 自动初始化（仅在DOM加载完成后）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => I18n.init());
} else {
    // DOM已经加载完成
    I18n.init();
}

console.log('✅ i18n.js 模块已加载');
