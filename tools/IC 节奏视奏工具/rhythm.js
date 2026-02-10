/* Rhythm Sight-Reading Tool - MVP */
(() => {
    const divisions = 24; // ticks per quarter (supports compound tuplets)
    const WHOLE_TICKS = divisions * 4;
    const DOTTED_HALF_TICKS = divisions * 3;
    const HALF_TICKS = divisions * 2;
    const DOTTED_QUARTER_TICKS = Math.round(divisions * 1.5);
    const QUARTER_TICKS = divisions;
    const DOTTED_EIGHTH_TICKS = Math.round(divisions * 0.75);
    const EIGHTH_TICKS = divisions / 2;
    const SIXTEENTH_TICKS = divisions / 4;
    const state = {
        osmd: null,
        metronome: {
            timer: null,
            beatIndex: 0,
            stepIndex: 0,
            isRunning: false,
            audioCtx: null,
            outputGain: null,
            nextTime: 0,
            startedByPlayback: false
        },
        playback: {
            audioCtx: null,
            outputGain: null,
            isPlaying: false,
            stopTimer: null,
            noiseBuffer: null,
            countInTimer: null,
            countInActive: false,
            countInState: null,
            countInUiTimers: []
        },
        calibration: {
            enabled: false,
            active: false,
            startTime: 0,
            events: [],
            index: 0,
            windowSec: 0.08,
            judgedElements: new Set()
        },
        restAlignObserver: null,
        restAlignLock: false,
        lastSettings: null,
        lastVoices: null,
        customTimeSignature: null,
        allowedTimeSignatures: ['4/4']
    };
    const rhythmHistory = [];
    let currentHistoryIndex = -1;
    const maxHistory = 20;

    const durationDefs = {
        whole: { ticks: WHOLE_TICKS, type: 'whole', dots: 0 },
        'half.': { ticks: DOTTED_HALF_TICKS, type: 'half', dots: 1 },
        half: { ticks: HALF_TICKS, type: 'half', dots: 0 },
        'quarter.': { ticks: DOTTED_QUARTER_TICKS, type: 'quarter', dots: 1 },
        quarter: { ticks: QUARTER_TICKS, type: 'quarter', dots: 0 },
        'eighth.': { ticks: DOTTED_EIGHTH_TICKS, type: 'eighth', dots: 1 },
        eighth: { ticks: EIGHTH_TICKS, type: 'eighth', dots: 0 },
        '16th': { ticks: SIXTEENTH_TICKS, type: '16th', dots: 0 }
    };

    const metronomePatternStorageKey = 'ic_rhythm_metronome_pattern';
    const calibrationStorageKey = 'ic_rhythm_calibration_enabled';
    const patternSubdivisionOptions = [1, 2, 3, 4];
    const patternBarsOptions = [1, 2, 4];
    let metronomePattern = {
        enabled: false,
        subdivision: 1,
        bars: 1,
        steps: []
    };

    const OSTINATO_STORAGE_KEY = 'ic_rhythm_ostinato';
    const ostinatoState = {
        voice: 'none',
        length: 1,
        enabled: false,
        subdivision: 1,
        bars: 1,
        steps: [],
        lastVoice: '1'
    };

    const translations = {
        'zh-CN': {
            'app.title': 'Cognote - 节奏视奏生成器',
            'app.subtitle': '专业级节奏视奏与时间控制训练工具',
            'app.footer': ' - 专业级节奏视奏训练模块',
            'app.melodyMode': '旋律视奏',
            'app.jianpuMode': '简谱视奏',
            'app.intervalMode': '音程视奏',
            'app.chordMode': '和弦视奏',
            'app.rhythmMode': '节奏视奏',
            'settings.title': '设置',
            'settings.theme': '主题',
            'settings.lightMode': '浅色模式',
            'settings.darkMode': '深色模式',
            'settings.language': '语言',
            'settings.midi': 'MIDI 输入',
            'settings.calibration': '输入校准',
            'midi.enable': '启用',
            'midi.device': '设备',
            'midi.status.unsupported': '当前浏览器不支持 MIDI',
            'midi.status.permission': '未授权 MIDI 访问',
            'midi.status.nodevice': '未检测到 MIDI 设备',
            'midi.status.connected': '已连接: {device}',
            'midi.status.disconnected': '设备已断开',
            'midi.status.disabled': 'MIDI 已关闭',
            'calibration.enable': '启用',
            'calibration.hint': '校准模式：单声部只判断节奏不看音高；双声部时 MIDI 的 Do 视为低声部、Sol 视为高声部。无 MIDI 也可用键盘 F（底鼓/低声部）/ J（军鼓/高声部）输入。',
            'settings.ostinato': 'Ostinato',
            'ostinato.voice': 'Ostinato 声部',
            'ostinato.none': '无',
            'ostinato.voice1': '声部 1',
            'ostinato.voice2': '声部 2',
            'ostinato.length': '长度（小节）',
            'ostinato.pattern': '节奏内容',
            'ostinato.rest': '休止',
            'ostinato.undo': '撤销',
            'ostinato.clear': '清空',
            'controls.time': '拍号',
            'controls.measures': '小节数',
            'controls.measures2': '2小节',
            'controls.measures4': '4小节',
            'controls.measures8': '8小节',
            'controls.difficulty': '难度预设',
            'controls.metronome': '节拍器',
            'controls.metronomePattern': '节拍器节奏型',
            'controls.density': '节奏密度',
            'controls.noteValues': '可用符值',
            'controls.rhythmOptions': '节奏特征',
            'controls.rhythm': '节奏设置',
            'controls.timeSettings': '拍号设置',
            'controls.syncopation': '切分强度',
            'controls.accent': '重音标记',
            'controls.voices': '声部模式',
            'controls.voiceSettings': '声部设置',
            'controls.advancedSettings': '高级设置',
            'controls.frequencyDesc': '调整各节奏单位在节奏中的出现频率',
            'controls.secondaryDensity': '第二声部密度',
            'controls.mode': '模式',
            'mode.free': '自由',
            'mode.challenge': '挑战',
            'controls.generate': '生成节奏',
            'controls.previous': '上一条',
            'controls.next': '下一条',
            'controls.practiceCounter': '练习计数',
            'controls.practiceAdd': '+',
            'controls.practiceReset': '-',
            'controls.play': '播放',
            'controls.stop': '停止',
            'modal.rhythm.title': '节奏设置',
            'modal.timeSignature.title': '拍号设置',
            'modal.timeSignature.selection': '拍号选项',
            'modal.voice.title': '声部设置',
            'modal.voice.selection': '声部模式',
            'modal.challenge.title': '挑战模式',
            'modal.metronomePattern.title': '节拍器节奏型',
            'challenge.prepTime': '准备时间（秒）',
            'challenge.bpm': 'BPM',
            'challenge.cursor': '光标',
            'challenge.metronome': '节拍器',
            'challenge.hide': '隐藏',
            'challenge.modeToggle': '挑战模式',
            'challenge.calibration': '输入校准',
            'challenge.cursorHint': '光标开关：光标用于提示当前应演奏的位置，count-in结束后出现并随节奏跳动。',
            'challenge.hideHint': '隐藏开关：开启后，系统在进入下一小节时会自动遮挡上一小节，仅保留当前阅读区。',
            'challenge.calibration.hintSingle': '校准模式（单声部）：任意音高均可，只判断节奏。',
            'challenge.calibration.hintDual': '校准模式（双声部）：MIDI 的 Do 为低声部、Sol 为高声部；无 MIDI 可用键盘 F（底鼓/低声部）/ J（军鼓/高声部）输入。',
            'challenge.calibration.correct': '校准正确',
            'challenge.calibration.wrong': '校准错误',
            'challenge.preparingLabel': '准备',
            'challenge.countInLabel': 'Count In',
            'challenge.seconds': '秒',
            'time.2-4': '2/4 拍',
            'time.3-4': '3/4 拍',
            'time.4-4': '4/4 拍',
            'time.6-8': '6/8 拍',
            'time.12-8': '12/8 拍',
            'time.custom': '自定义',
            'time.custom.beats': '拍数',
            'time.custom.denominator': '单位',
            'time.custom.hint': '示例：5/4、7/4、5/8、7/8',
            'button.save': '保存设置',
            'button.cancel': '取消',
            'button.start': '开始',
            'button.saveOnly': '保存',
            'button.advanced': '高级设置',
            'metronomePattern.enable': '启用自定义节奏',
            'metronomePattern.subdivision': '细分',
            'metronomePattern.subdivision.beat': '每拍1下',
            'metronomePattern.subdivision.eighth': '每拍2分 (八分)',
            'metronomePattern.subdivision.triplet': '每拍3分 (三连)',
            'metronomePattern.subdivision.sixteenth': '每拍4分 (十六分)',
            'metronomePattern.bars': '小节数',
            'metronomePattern.bars.1': '1小节',
            'metronomePattern.bars.2': '2小节',
            'metronomePattern.bars.4': '4小节',
            'metronomePattern.timeSig': '当前拍号',
            'metronomePattern.hint': '点击方格启用/静音节拍',
            'metronomePattern.resetBeats': '重置为每拍',
            'metronomePattern.clear': '全部静音',
            'difficulty.basic': '基础',
            'difficulty.intermediate': '进阶',
            'difficulty.advanced': '高级',
            'noteValues.whole': '全音符',
            'noteValues.half': '二分音符',
            'noteValues.quarter': '四分音符',
            'noteValues.eighth': '八分音符',
            'noteValues.sixteenth': '十六分音符',
            'noteValues.triplet': '三连音',
            'noteValues.duplet': '二连音',
            'noteValues.quadruplet': '四连音',
            'rhythm.dottedHalf': '附点二分音符',
            'rhythm.dottedQuarter': '附点四分音符',
            'rhythm.dottedEighth': '附点八分音符',
            'rhythm.dottedOptions': '附点音符选项',
            'rhythm.allowDotted': '允许附点音符 (根据已选节奏自动生成附点版本)',
            'rhythm.dottedDesc': '勾选后将自动为已选择的节奏类型生成附点版本',
            'rhythm.dottedExample': '例如：勾选四分音符+附点音符 → 可生成四分音符和附点四分音符',
            'options.rests': '包含休止',
            'options.dotted': '附点节奏',
            'options.triplets': '三连音',
            'rhythm.freq.dottedOverall': '附点音符总体频率:',
            'rhythm.freq.dottedHalf': '附点二分音符频率:',
            'rhythm.freq.dottedQuarter': '附点四分音符频率:',
            'rhythm.freq.dottedEighth': '附点八分音符频率:',
            'frequency.whole': '全音符频率:',
            'frequency.half': '二分音符频率:',
            'frequency.quarter': '四分音符频率:',
            'frequency.eighth': '八分音符频率:',
            'frequency.sixteenth': '十六分音符频率:',
            'frequency.triplet': '三连音频率:',
            'frequency.duplet': '二连音频率:',
            'frequency.quadruplet': '四连音频率:',
            'score.empty': '点击生成节奏开始练习',
            'syncopation.off': '关闭',
            'syncopation.light': '轻度',
            'syncopation.medium': '中等',
            'syncopation.strong': '强烈',
            'accent.downbeat': '强调强拍',
            'accent.random': '随机点缀',
            'accent.off': '不标记',
            'voices.single': '单声部',
            'voices.double': '双声部'
        },
        'zh-TW': {
            'app.title': 'Cognote - 節奏視奏生成器',
            'app.subtitle': '專業級節奏視奏與時間控制訓練工具',
            'app.footer': ' - 專業級節奏視奏訓練模組',
            'app.melodyMode': '旋律視奏',
            'app.jianpuMode': '簡譜視奏',
            'app.intervalMode': '音程視奏',
            'app.chordMode': '和弦視奏',
            'app.rhythmMode': '節奏視奏',
            'settings.title': '設定',
            'settings.theme': '主題',
            'settings.lightMode': '淺色模式',
            'settings.darkMode': '深色模式',
            'settings.language': '語言',
            'settings.midi': 'MIDI 輸入',
            'settings.calibration': '輸入校準',
            'midi.enable': '啟用',
            'midi.device': '裝置',
            'midi.status.unsupported': '目前瀏覽器不支援 MIDI',
            'midi.status.permission': '未授權 MIDI 存取',
            'midi.status.nodevice': '未偵測到 MIDI 裝置',
            'midi.status.connected': '已連接: {device}',
            'midi.status.disconnected': '裝置已斷開',
            'midi.status.disabled': 'MIDI 已關閉',
            'calibration.enable': '啟用',
            'calibration.hint': '校準模式：單聲部只判斷節奏不看音高；雙聲部時 MIDI 的 Do 視為低聲部、Sol 視為高聲部。未連接 MIDI 也可用鍵盤 F（底鼓/低聲部）/ J（軍鼓/高聲部）輸入。',
            'settings.ostinato': 'Ostinato',
            'ostinato.voice': 'Ostinato 聲部',
            'ostinato.none': '無',
            'ostinato.voice1': '聲部 1',
            'ostinato.voice2': '聲部 2',
            'ostinato.length': '長度（小節）',
            'ostinato.pattern': '節奏內容',
            'ostinato.rest': '休止',
            'ostinato.undo': '撤銷',
            'ostinato.clear': '清空',
            'controls.time': '拍號',
            'controls.measures': '小節數',
            'controls.measures2': '2小節',
            'controls.measures4': '4小節',
            'controls.measures8': '8小節',
            'controls.difficulty': '難度預設',
            'controls.metronome': '節拍器',
            'controls.metronomePattern': '節拍器節奏型',
            'controls.density': '節奏密度',
            'controls.noteValues': '可用符值',
            'controls.rhythmOptions': '節奏特徵',
            'controls.rhythm': '節奏設置',
            'controls.timeSettings': '拍號設置',
            'controls.syncopation': '切分強度',
            'controls.accent': '重音標記',
            'controls.voices': '聲部模式',
            'controls.voiceSettings': '聲部設置',
            'controls.advancedSettings': '高級設置',
            'controls.frequencyDesc': '調整各節奏單位在節奏中的出現頻率',
            'controls.secondaryDensity': '第二聲部密度',
            'controls.mode': '模式',
            'mode.free': '自由',
            'mode.challenge': '挑戰',
            'controls.generate': '生成節奏',
            'controls.previous': '上一條',
            'controls.next': '下一條',
            'controls.practiceCounter': '練習計數',
            'controls.practiceAdd': '+',
            'controls.practiceReset': '-',
            'controls.play': '播放',
            'controls.stop': '停止',
            'modal.rhythm.title': '節奏設置',
            'modal.timeSignature.title': '拍號設置',
            'modal.timeSignature.selection': '拍號選項',
            'modal.voice.title': '聲部設置',
            'modal.voice.selection': '聲部模式',
            'modal.challenge.title': '挑戰模式',
            'modal.metronomePattern.title': '節拍器節奏型',
            'challenge.prepTime': '準備時間（秒）',
            'challenge.bpm': 'BPM',
            'challenge.cursor': '光標',
            'challenge.metronome': '節拍器',
            'challenge.hide': '隱藏',
            'challenge.modeToggle': '挑戰模式',
            'challenge.calibration': '輸入校準',
            'challenge.cursorHint': '光標開關：光標用於提示當前應演奏的位置，count-in 結束後出現並隨節奏跳動。',
            'challenge.hideHint': '隱藏開關：開啟後，系統在進入下一小節時會自動遮擋上一小節，僅保留當前閱讀區。',
            'challenge.calibration.hintSingle': '校準模式（單聲部）：任意音高皆可，只判斷節奏。',
            'challenge.calibration.hintDual': '校準模式（雙聲部）：MIDI 的 Do 為低聲部、Sol 為高聲部；未連接 MIDI 也可用鍵盤 F（底鼓/低聲部）/ J（軍鼓/高聲部）輸入。',
            'challenge.calibration.correct': '校準正確',
            'challenge.calibration.wrong': '校準錯誤',
            'challenge.preparingLabel': '準備',
            'challenge.countInLabel': 'Count In',
            'challenge.seconds': '秒',
            'time.2-4': '2/4 拍',
            'time.3-4': '3/4 拍',
            'time.4-4': '4/4 拍',
            'time.6-8': '6/8 拍',
            'time.12-8': '12/8 拍',
            'time.custom': '自訂',
            'time.custom.beats': '拍數',
            'time.custom.denominator': '單位',
            'time.custom.hint': '例：5/4、7/4、5/8、7/8',
            'button.save': '保存設定',
            'button.cancel': '取消',
            'button.start': '開始',
            'button.saveOnly': '保存',
            'button.advanced': '高級設置',
            'metronomePattern.enable': '啟用自訂節奏',
            'metronomePattern.subdivision': '細分',
            'metronomePattern.subdivision.beat': '每拍1下',
            'metronomePattern.subdivision.eighth': '每拍2分 (八分)',
            'metronomePattern.subdivision.triplet': '每拍3分 (三連)',
            'metronomePattern.subdivision.sixteenth': '每拍4分 (十六分)',
            'metronomePattern.bars': '小節數',
            'metronomePattern.bars.1': '1小節',
            'metronomePattern.bars.2': '2小節',
            'metronomePattern.bars.4': '4小節',
            'metronomePattern.timeSig': '目前拍號',
            'metronomePattern.hint': '點擊方格啟用/靜音節拍',
            'metronomePattern.resetBeats': '重置為每拍',
            'metronomePattern.clear': '全部靜音',
            'difficulty.basic': '基礎',
            'difficulty.intermediate': '進階',
            'difficulty.advanced': '高級',
            'noteValues.whole': '全音符',
            'noteValues.half': '二分音符',
            'noteValues.quarter': '四分音符',
            'noteValues.eighth': '八分音符',
            'noteValues.sixteenth': '十六分音符',
            'noteValues.triplet': '三連音',
            'noteValues.duplet': '二連音',
            'noteValues.quadruplet': '四連音',
            'rhythm.dottedHalf': '附點二分音符',
            'rhythm.dottedQuarter': '附點四分音符',
            'rhythm.dottedEighth': '附點八分音符',
            'rhythm.dottedOptions': '附點音符選項',
            'rhythm.allowDotted': '允許附點音符 (根據已選節奏自動生成附點版本)',
            'rhythm.dottedDesc': '勾選後將自動為已選擇的節奏類型生成附點版本',
            'rhythm.dottedExample': '例如：勾選四分音符+附點音符 → 可生成四分音符和附點四分音符',
            'options.rests': '包含休止',
            'options.dotted': '附點節奏',
            'options.triplets': '三連音',
            'rhythm.freq.dottedOverall': '附點音符總體頻率:',
            'rhythm.freq.dottedHalf': '附點二分音符頻率:',
            'rhythm.freq.dottedQuarter': '附點四分音符頻率:',
            'rhythm.freq.dottedEighth': '附點八分音符頻率:',
            'frequency.whole': '全音符頻率:',
            'frequency.half': '二分音符頻率:',
            'frequency.quarter': '四分音符頻率:',
            'frequency.eighth': '八分音符頻率:',
            'frequency.sixteenth': '十六分音符頻率:',
            'frequency.triplet': '三連音頻率:',
            'frequency.duplet': '二連音頻率:',
            'frequency.quadruplet': '四連音頻率:',
            'score.empty': '點擊生成節奏開始練習',
            'syncopation.off': '關閉',
            'syncopation.light': '輕度',
            'syncopation.medium': '中等',
            'syncopation.strong': '強烈',
            'accent.downbeat': '強調強拍',
            'accent.random': '隨機點綴',
            'accent.off': '不標記',
            'voices.single': '單聲部',
            'voices.double': '雙聲部'
        },
        'en': {
            'app.title': 'Cognote - Rhythm Sight Reading Generator',
            'app.subtitle': 'Professional rhythm sight-reading and timing control tool',
            'app.footer': ' - Professional rhythm sight-reading module',
            'app.melodyMode': 'Melody',
            'app.jianpuMode': 'Jianpu',
            'app.intervalMode': 'Interval',
            'app.chordMode': 'Chord',
            'app.rhythmMode': 'Rhythm',
            'settings.title': 'Settings',
            'settings.theme': 'Theme',
            'settings.lightMode': 'Light Mode',
            'settings.darkMode': 'Dark Mode',
            'settings.language': 'Language',
            'settings.midi': 'MIDI Input',
            'settings.calibration': 'Input Calibration',
            'midi.enable': 'Enable',
            'midi.device': 'Device',
            'midi.status.unsupported': 'MIDI is not supported in this browser',
            'midi.status.permission': 'MIDI access not authorized',
            'midi.status.nodevice': 'No MIDI devices detected',
            'midi.status.connected': 'Connected: {device}',
            'midi.status.disconnected': 'Device disconnected',
            'midi.status.disabled': 'MIDI is off',
            'calibration.enable': 'Enable',
            'calibration.hint': 'Calibration: in single voice, timing is judged without pitch; in two-voice mode, MIDI C = low voice and G = high voice. Without MIDI, use F (kick/low) / J (snare/high) on the keyboard.',
            'settings.ostinato': 'Ostinato',
            'ostinato.voice': 'Ostinato Voice',
            'ostinato.none': 'None',
            'ostinato.voice1': 'Voice 1',
            'ostinato.voice2': 'Voice 2',
            'ostinato.length': 'Length (measures)',
            'ostinato.pattern': 'Pattern',
            'ostinato.rest': 'Rest',
            'ostinato.undo': 'Undo',
            'ostinato.clear': 'Clear',
            'controls.time': 'Time Signature',
            'controls.measures': 'Bars',
            'controls.measures2': '2 bars',
            'controls.measures4': '4 bars',
            'controls.measures8': '8 bars',
            'controls.difficulty': 'Difficulty Preset',
            'controls.metronome': 'Metronome',
            'controls.metronomePattern': 'Metronome Pattern',
            'controls.density': 'Rhythm Density',
            'controls.noteValues': 'Note Values',
            'controls.rhythmOptions': 'Rhythm Features',
            'controls.rhythm': 'Rhythm Settings',
            'controls.timeSettings': 'Time Settings',
            'controls.syncopation': 'Syncopation',
            'controls.accent': 'Accent Marking',
            'controls.voices': 'Voice Mode',
            'controls.voiceSettings': 'Voice Settings',
            'controls.advancedSettings': 'Advanced Settings',
            'controls.frequencyDesc': 'Adjust how often each rhythm value appears',
            'controls.secondaryDensity': 'Secondary Density',
            'controls.mode': 'Mode',
            'mode.free': 'Free',
            'mode.challenge': 'Challenge',
            'controls.generate': 'Generate Rhythm',
            'controls.previous': 'Previous',
            'controls.next': 'Next',
            'controls.practiceCounter': 'Practice Counter',
            'controls.practiceAdd': '+',
            'controls.practiceReset': '-',
            'controls.play': 'Play',
            'controls.stop': 'Stop',
            'modal.rhythm.title': 'Rhythm Settings',
            'modal.timeSignature.title': 'Time Signature Settings',
            'modal.timeSignature.selection': 'Time Signature Options',
            'modal.voice.title': 'Voice Settings',
            'modal.voice.selection': 'Voice Options',
            'modal.challenge.title': 'Challenge Mode',
            'modal.metronomePattern.title': 'Metronome Pattern',
            'challenge.prepTime': 'Prep Time (sec)',
            'challenge.bpm': 'BPM',
            'challenge.cursor': 'Cursor',
            'challenge.metronome': 'Metronome',
            'challenge.hide': 'Hide',
            'challenge.modeToggle': 'Challenge Mode',
            'challenge.calibration': 'Input Calibration',
            'challenge.cursorHint': 'Cursor: shows the current position; appears after count-in and moves with the rhythm.',
            'challenge.hideHint': 'Hide: when enabled, previous measures are masked as you advance.',
            'challenge.calibration.hintSingle': 'Calibration (single voice): any pitch is accepted; timing only.',
            'challenge.calibration.hintDual': 'Calibration (two voices): MIDI C = low voice, G = high voice; without MIDI use F (kick/low) / J (snare/high).',
            'challenge.calibration.correct': 'Correct',
            'challenge.calibration.wrong': 'Wrong',
            'challenge.preparingLabel': 'Ready',
            'challenge.countInLabel': 'Count In',
            'challenge.seconds': 's',
            'time.2-4': '2/4 Time',
            'time.3-4': '3/4 Time',
            'time.4-4': '4/4 Time',
            'time.6-8': '6/8 Time',
            'time.12-8': '12/8 Time',
            'time.custom': 'Custom',
            'time.custom.beats': 'Beats',
            'time.custom.denominator': 'Unit',
            'time.custom.hint': 'Examples: 5/4, 7/4, 5/8, 7/8',
            'button.save': 'Save',
            'button.cancel': 'Cancel',
            'button.start': 'Start',
            'button.saveOnly': 'Save',
            'button.advanced': 'Advanced',
            'metronomePattern.enable': 'Enable custom pattern',
            'metronomePattern.subdivision': 'Subdivision',
            'metronomePattern.subdivision.beat': '1 per beat',
            'metronomePattern.subdivision.eighth': '2 per beat (eighths)',
            'metronomePattern.subdivision.triplet': '3 per beat (triplets)',
            'metronomePattern.subdivision.sixteenth': '4 per beat (sixteenths)',
            'metronomePattern.bars': 'Bars',
            'metronomePattern.bars.1': '1 bar',
            'metronomePattern.bars.2': '2 bars',
            'metronomePattern.bars.4': '4 bars',
            'metronomePattern.timeSig': 'Time signature',
            'metronomePattern.hint': 'Click squares to enable/mute beats',
            'metronomePattern.resetBeats': 'Reset to beats',
            'metronomePattern.clear': 'Mute all',
            'difficulty.basic': 'Basic',
            'difficulty.intermediate': 'Intermediate',
            'difficulty.advanced': 'Advanced',
            'noteValues.whole': 'Whole Note',
            'noteValues.half': 'Half Note',
            'noteValues.quarter': 'Quarter Note',
            'noteValues.eighth': 'Eighth Note',
            'noteValues.sixteenth': 'Sixteenth Note',
            'noteValues.triplet': 'Triplet',
            'noteValues.duplet': 'Duplet',
            'noteValues.quadruplet': 'Quadruplet',
            'rhythm.dottedHalf': 'Dotted Half Note',
            'rhythm.dottedQuarter': 'Dotted Quarter Note',
            'rhythm.dottedEighth': 'Dotted Eighth Note',
            'rhythm.dottedOptions': 'Dotted Note Options',
            'rhythm.allowDotted': 'Allow Dotted Notes (Auto-generate dotted versions based on selected rhythms)',
            'rhythm.dottedDesc': 'Auto-generate dotted versions for selected rhythm types when checked',
            'rhythm.dottedExample': 'Example: Select quarter note + dotted notes → generates both quarter notes and dotted quarter notes',
            'options.rests': 'Include Rests',
            'options.dotted': 'Dotted Rhythms',
            'options.triplets': 'Triplets',
            'rhythm.freq.dottedOverall': 'Overall Dotted Note Frequency:',
            'rhythm.freq.dottedHalf': 'Dotted Half Note Frequency:',
            'rhythm.freq.dottedQuarter': 'Dotted Quarter Note Frequency:',
            'rhythm.freq.dottedEighth': 'Dotted Eighth Note Frequency:',
            'frequency.whole': 'Whole Note Frequency:',
            'frequency.half': 'Half Note Frequency:',
            'frequency.quarter': 'Quarter Note Frequency:',
            'frequency.eighth': 'Eighth Note Frequency:',
            'frequency.sixteenth': 'Sixteenth Note Frequency:',
            'frequency.triplet': 'Triplet Frequency:',
            'frequency.duplet': 'Duplet Frequency:',
            'frequency.quadruplet': 'Quadruplet Frequency:',
            'score.empty': 'Click Generate to start practicing',
            'syncopation.off': 'Off',
            'syncopation.light': 'Light',
            'syncopation.medium': 'Medium',
            'syncopation.strong': 'Strong',
            'accent.downbeat': 'Downbeats',
            'accent.random': 'Random',
            'accent.off': 'None',
            'voices.single': 'Single Voice',
            'voices.double': 'Two Voices'
        }
    };

    const SHOW_CUSTOM_TIME_SIGNATURE = true;
    const BUILTIN_TIME_SIGNATURES = ['2/4', '3/4', '4/4', '6/8'];

    function parseTimeSignatureString(ts) {
        if (typeof ts !== 'string') return null;
        const parts = ts.split('/');
        if (parts.length !== 2) return null;
        const beats = parseInt(parts[0], 10);
        const beatType = parseInt(parts[1], 10);
        if (!Number.isFinite(beats) || !Number.isFinite(beatType)) return null;
        return { beats, beatType };
    }

    function isBuiltInTimeSignature(ts) {
        return BUILTIN_TIME_SIGNATURES.includes(ts);
    }

    function isCompoundTimeSignature(ts) {
        const parsed = parseTimeSignatureString(ts);
        if (!parsed) return false;
        if (parsed.beatType !== 8) return false;
        if (parsed.beats % 3 !== 0) return false;
        return parsed.beats > 3;
    }

    function getCustomBeatGrouping(timeSignature, measureIndex) {
        if (!timeSignature || isBuiltInTimeSignature(timeSignature)) return null;
        const parsed = parseTimeSignatureString(timeSignature);
        if (!parsed) return null;
        const { beats, beatType } = parsed;
        const unit = beatType === 8 ? 0.5 : beatType === 16 ? 0.25 : beatType === 2 ? 2 : 1;
        let groups = [];

        if (beats === 5) {
            groups = (measureIndex % 2 === 0) ? [3, 2] : [2, 3];
        } else if (beats === 7) {
            groups = (measureIndex % 2 === 0) ? [3, 2, 2] : [2, 2, 3];
        } else if (beats === 8) {
            groups = (measureIndex % 2 === 0) ? [3, 3, 2] : [2, 3, 3];
        } else if (isCompoundTimeSignature(timeSignature)) {
            const fullGroups = Math.floor(beats / 3);
            groups = new Array(fullGroups).fill(3);
            const remainder = beats % 3;
            if (remainder) groups.push(remainder);
        } else {
            let remaining = beats;
            while (remaining > 0) {
                if (remaining === 5) {
                    groups.push(3, 2);
                    break;
                }
                if (remaining === 7) {
                    groups.push(3, 2, 2);
                    break;
                }
                if (remaining === 3) {
                    groups.push(3);
                    break;
                }
                if (remaining === 2) {
                    groups.push(2);
                    break;
                }
                groups.push(2);
                remaining -= 2;
            }
        }

        const starts = [0];
        let acc = 0;
        for (let i = 0; i < groups.length - 1; i += 1) {
            acc += groups[i] * unit;
            starts.push(acc);
        }

        return { starts, totalBeats: beats * (4 / beatType) };
    }

    let currentLanguage = 'zh-CN';
    let currentTheme = localStorage.getItem('preferredTheme') || 'light';

    const themeIcons = {
        light: '🌙',
        dark: '☀️'
    };
    let openModalCount = 0;

    function clampNumber(value, min, max, fallback) {
        const num = parseInt(value, 10);
        if (!Number.isFinite(num)) return fallback;
        return Math.min(max, Math.max(min, num));
    }

    function normalizeSubdivision(value) {
        const normalized = parseInt(value, 10);
        return patternSubdivisionOptions.includes(normalized) ? normalized : patternSubdivisionOptions[0];
    }

    function normalizeBars(value) {
        const normalized = parseInt(value, 10);
        return patternBarsOptions.includes(normalized) ? normalized : patternBarsOptions[0];
    }

    function buildDefaultPattern(stepsPerPattern, subdivision) {
        const steps = new Array(stepsPerPattern).fill(0);
        for (let i = 0; i < stepsPerPattern; i += subdivision) {
            steps[i] = 1;
        }
        return steps;
    }

    function ensurePatternSteps(stateRef, stepsPerPattern, subdivision, saveFn) {
        if (!Array.isArray(stateRef.steps) || stateRef.steps.length !== stepsPerPattern) {
            stateRef.steps = buildDefaultPattern(stepsPerPattern, subdivision);
            if (typeof saveFn === 'function') saveFn();
        }
        stateRef.steps = stateRef.steps.map(step => (step ? 1 : 0));
        return stateRef.steps;
    }

    function normalizeMetronomeSubdivision(value) {
        return normalizeSubdivision(value);
    }

    function normalizeMetronomeBars(value) {
        return normalizeBars(value);
    }

    function loadMetronomePatternSettings() {
        try {
            const raw = localStorage.getItem(metronomePatternStorageKey);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data && typeof data === 'object') {
                metronomePattern.enabled = !!data.enabled;
                metronomePattern.subdivision = normalizeMetronomeSubdivision(data.subdivision);
                metronomePattern.bars = normalizeMetronomeBars(data.bars);
                metronomePattern.steps = Array.isArray(data.steps) ? data.steps.map(step => (step ? 1 : 0)) : [];
            }
        } catch (error) {
            console.warn('⚠️ 节拍器节奏型读取失败，使用默认设置', error);
        }
    }

    function saveMetronomePatternSettings() {
        try {
            const payload = {
                enabled: !!metronomePattern.enabled,
                subdivision: normalizeMetronomeSubdivision(metronomePattern.subdivision),
                bars: normalizeMetronomeBars(metronomePattern.bars),
                steps: Array.isArray(metronomePattern.steps) ? metronomePattern.steps.map(step => (step ? 1 : 0)) : []
            };
            localStorage.setItem(metronomePatternStorageKey, JSON.stringify(payload));
        } catch (error) {
            console.warn('⚠️ 节拍器节奏型保存失败', error);
        }
    }

    function getMetronomeTimeSignatureInfo() {
        const settings = getSettings();
        return { beats: settings.beats, den: settings.beatType };
    }

    function getMetronomePatternInfo(tempoOverride) {
        const tempo = Math.max(1, tempoOverride || 80);
        if (!metronomePattern.enabled) {
            return {
                usePattern: false,
                stepDuration: 60.0 / tempo
            };
        }

        const tsInfo = getMetronomeTimeSignatureInfo();
        const subdivision = normalizeMetronomeSubdivision(metronomePattern.subdivision);
        const bars = normalizeMetronomeBars(metronomePattern.bars);
        const beatDuration = (60.0 / tempo) * (4 / tsInfo.den);
        const stepDuration = beatDuration / subdivision;
        const stepsPerBar = tsInfo.beats * subdivision;
        const stepsPerPattern = stepsPerBar * bars;
        const steps = ensurePatternSteps(metronomePattern, stepsPerPattern, subdivision, saveMetronomePatternSettings);

        return {
            usePattern: true,
            stepDuration,
            stepsPerBar,
            stepsPerPattern,
            steps,
            subdivision,
            bars
        };
    }

    function restartMetronomeIfRunning() {
        if (state.metronome.isRunning) {
            const startedByPlayback = state.metronome.startedByPlayback;
            stopMetronome();
            startMetronome(undefined, startedByPlayback);
        }
    }

    function updateMetronomePatternTimeSig() {
        const label = document.getElementById('metronomePatternTimeSig');
        if (!label) return;
        const tsInfo = getMetronomeTimeSignatureInfo();
        label.textContent = `${tsInfo.beats}/${tsInfo.den}`;
    }

    function renderMetronomePatternGrid() {
        const grid = document.getElementById('metronomePatternGrid');
        if (!grid) return;
        const tsInfo = getMetronomeTimeSignatureInfo();
        const subdivision = normalizeMetronomeSubdivision(metronomePattern.subdivision);
        const bars = normalizeMetronomeBars(metronomePattern.bars);
        const stepsPerBar = tsInfo.beats * subdivision;
        const stepsPerPattern = stepsPerBar * bars;
        const steps = ensurePatternSteps(metronomePattern, stepsPerPattern, subdivision, saveMetronomePatternSettings);

        grid.classList.toggle('disabled', !metronomePattern.enabled);
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${stepsPerBar}, minmax(32px, 1fr))`;
        grid.style.gridAutoFlow = 'row';

        for (let i = 0; i < stepsPerPattern; i += 1) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'metronome-pattern-step';
            if (steps[i]) btn.classList.add('active');
            if (i % subdivision === 0) btn.classList.add('beat-start');
            if (i % stepsPerBar === 0) btn.classList.add('bar-start');
            btn.dataset.step = String(i);
            btn.setAttribute('aria-pressed', steps[i] ? 'true' : 'false');
            if (i % subdivision === 0) {
                const beatNumber = (Math.floor(i / subdivision) % tsInfo.beats) + 1;
                btn.textContent = String(beatNumber);
            } else {
                btn.textContent = '';
            }
            grid.appendChild(btn);
        }
    }

    function updateMetronomePatternUI() {
        const enableToggle = document.getElementById('metronomePatternEnable');
        const subdivisionSelect = document.getElementById('metronomePatternSubdivision');
        const barsSelect = document.getElementById('metronomePatternBars');

        if (enableToggle) enableToggle.checked = !!metronomePattern.enabled;
        if (subdivisionSelect) subdivisionSelect.value = String(normalizeMetronomeSubdivision(metronomePattern.subdivision));
        if (barsSelect) barsSelect.value = String(normalizeMetronomeBars(metronomePattern.bars));

        updateMetronomePatternTimeSig();
        renderMetronomePatternGrid();
    }

    function openMetronomePatternSettings() {
        const modal = document.getElementById('metronomePatternModal');
        if (!modal) return;
        updateMetronomePatternUI();
        showModal(modal);
    }

    function closeMetronomePatternSettings() {
        const modal = document.getElementById('metronomePatternModal');
        if (modal) hideModal(modal);
    }

    function saveMetronomePatternSettingsAndClose() {
        saveMetronomePatternSettings();
        closeMetronomePatternSettings();
    }

    function resetMetronomePattern() {
        const tsInfo = getMetronomeTimeSignatureInfo();
        const subdivision = normalizeMetronomeSubdivision(metronomePattern.subdivision);
        const bars = normalizeMetronomeBars(metronomePattern.bars);
        const stepsPerPattern = tsInfo.beats * subdivision * bars;
        metronomePattern.steps = buildDefaultPattern(stepsPerPattern, subdivision);
        saveMetronomePatternSettings();
        renderMetronomePatternGrid();
        restartMetronomeIfRunning();
    }

    function clearMetronomePattern() {
        const tsInfo = getMetronomeTimeSignatureInfo();
        const subdivision = normalizeMetronomeSubdivision(metronomePattern.subdivision);
        const bars = normalizeMetronomeBars(metronomePattern.bars);
        const stepsPerPattern = tsInfo.beats * subdivision * bars;
        metronomePattern.steps = new Array(stepsPerPattern).fill(0);
        saveMetronomePatternSettings();
        renderMetronomePatternGrid();
        restartMetronomeIfRunning();
    }

    function initializeMetronomePatternUI() {
        loadMetronomePatternSettings();
        const enableToggle = document.getElementById('metronomePatternEnable');
        const subdivisionSelect = document.getElementById('metronomePatternSubdivision');
        const barsSelect = document.getElementById('metronomePatternBars');
        const grid = document.getElementById('metronomePatternGrid');

        if (enableToggle) {
            enableToggle.checked = !!metronomePattern.enabled;
            enableToggle.addEventListener('change', function() {
                metronomePattern.enabled = !!this.checked;
                saveMetronomePatternSettings();
                renderMetronomePatternGrid();
                restartMetronomeIfRunning();
            });
        }

        if (subdivisionSelect) {
            subdivisionSelect.value = String(normalizeMetronomeSubdivision(metronomePattern.subdivision));
            subdivisionSelect.addEventListener('change', function() {
                metronomePattern.subdivision = normalizeMetronomeSubdivision(this.value);
                updateMetronomePatternUI();
                saveMetronomePatternSettings();
                restartMetronomeIfRunning();
            });
        }

        if (barsSelect) {
            barsSelect.value = String(normalizeMetronomeBars(metronomePattern.bars));
            barsSelect.addEventListener('change', function() {
                metronomePattern.bars = normalizeMetronomeBars(this.value);
                updateMetronomePatternUI();
                saveMetronomePatternSettings();
                restartMetronomeIfRunning();
            });
        }

        if (grid) {
            grid.addEventListener('click', function(event) {
                const target = event.target.closest('button[data-step]');
                if (!target) return;
                const index = parseInt(target.dataset.step, 10);
                if (isNaN(index)) return;
                if (!metronomePattern.enabled) {
                    metronomePattern.enabled = true;
                    if (enableToggle) enableToggle.checked = true;
                    grid.classList.remove('disabled');
                }
                metronomePattern.steps[index] = metronomePattern.steps[index] ? 0 : 1;
                target.classList.toggle('active', !!metronomePattern.steps[index]);
                target.setAttribute('aria-pressed', metronomePattern.steps[index] ? 'true' : 'false');
                saveMetronomePatternSettings();
                restartMetronomeIfRunning();
            });
        }

        updateMetronomePatternUI();
    }

    function loadOstinatoState() {
        try {
            const raw = localStorage.getItem(OSTINATO_STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data && typeof data === 'object') {
                if (typeof data.voice === 'string') ostinatoState.voice = data.voice;
                if (typeof data.enabled === 'boolean') ostinatoState.enabled = data.enabled;
                if (typeof data.subdivision === 'number') ostinatoState.subdivision = data.subdivision;
                if (typeof data.bars === 'number') ostinatoState.bars = data.bars;
                if (typeof data.length === 'number') ostinatoState.length = data.length;
                if (Array.isArray(data.steps)) ostinatoState.steps = data.steps;
            }
        } catch (_) {
            // ignore
        }
        if (!['none', '1', '2'].includes(String(ostinatoState.voice))) {
            ostinatoState.voice = 'none';
        }
        if (!Array.isArray(ostinatoState.steps)) {
            ostinatoState.steps = [];
        }
        ostinatoState.bars = normalizeBars(ostinatoState.bars || ostinatoState.length || 1);
        ostinatoState.length = ostinatoState.bars;
        ostinatoState.subdivision = normalizeSubdivision(ostinatoState.subdivision || 1);
        if (typeof ostinatoState.enabled !== 'boolean') {
            ostinatoState.enabled = ostinatoState.voice !== 'none';
        }
        if (ostinatoState.voice === 'none') {
            ostinatoState.enabled = false;
        }
        if (ostinatoState.voice !== 'none') {
            ostinatoState.lastVoice = String(ostinatoState.voice);
        }
    }

    function saveOstinatoState() {
        try {
            localStorage.setItem(OSTINATO_STORAGE_KEY, JSON.stringify({
                voice: ostinatoState.voice,
                enabled: !!ostinatoState.enabled,
                subdivision: ostinatoState.subdivision,
                bars: ostinatoState.bars,
                length: ostinatoState.bars,
                steps: Array.isArray(ostinatoState.steps) ? ostinatoState.steps.map(step => (step ? 1 : 0)) : []
            }));
        } catch (_) {
            // ignore
        }
    }

    function normalizeOstinatoSubdivision(value, beatType) {
        let normalized = normalizeSubdivision(value);
        const ticksPerBeat = divisions * (4 / beatType);
        if (ticksPerBeat % normalized !== 0) {
            const valid = patternSubdivisionOptions.filter(option => ticksPerBeat % option === 0);
            if (valid.length) normalized = valid[0];
        }
        return normalized;
    }

    function normalizeOstinatoBars(value) {
        return normalizeBars(value);
    }

    function ensureOstinatoPatternSteps(stepsPerPattern, subdivision) {
        return ensurePatternSteps(ostinatoState, stepsPerPattern, subdivision, saveOstinatoState);
    }

    function updateOstinatoPatternTimeSig() {
        const label = document.getElementById('ostinatoPatternTimeSig');
        if (!label) return;
        const tsInfo = getMetronomeTimeSignatureInfo();
        label.textContent = `${tsInfo.beats}/${tsInfo.den}`;
    }

    function renderOstinatoPatternGrid() {
        const grid = document.getElementById('ostinatoPatternGrid');
        if (!grid) return;
        const tsInfo = getMetronomeTimeSignatureInfo();
        const subdivision = normalizeOstinatoSubdivision(ostinatoState.subdivision, tsInfo.den);
        const bars = normalizeOstinatoBars(ostinatoState.bars);
        const stepsPerBar = tsInfo.beats * subdivision;
        const stepsPerPattern = stepsPerBar * bars;
        const steps = ensureOstinatoPatternSteps(stepsPerPattern, subdivision);
        const enabled = ostinatoState.enabled && ostinatoState.voice !== 'none';

        grid.classList.toggle('disabled', !enabled);
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${stepsPerBar}, minmax(32px, 1fr))`;
        grid.style.gridAutoFlow = 'row';

        for (let i = 0; i < stepsPerPattern; i += 1) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'metronome-pattern-step';
            if (steps[i]) btn.classList.add('active');
            if (i % subdivision === 0) btn.classList.add('beat-start');
            if (i % stepsPerBar === 0) btn.classList.add('bar-start');
            btn.dataset.step = String(i);
            btn.setAttribute('aria-pressed', steps[i] ? 'true' : 'false');
            if (i % subdivision === 0) {
                const beatNumber = (Math.floor(i / subdivision) % tsInfo.beats) + 1;
                btn.textContent = String(beatNumber);
            } else {
                btn.textContent = '';
            }
            grid.appendChild(btn);
        }
    }

    function updateOstinatoPatternUI() {
        const enableToggle = document.getElementById('ostinatoPatternEnable');
        const subdivisionSelect = document.getElementById('ostinatoPatternSubdivision');
        const barsSelect = document.getElementById('ostinatoPatternBars');
        const tsInfo = getMetronomeTimeSignatureInfo();
        const subdivision = normalizeOstinatoSubdivision(ostinatoState.subdivision, tsInfo.den);
        const bars = normalizeOstinatoBars(ostinatoState.bars);

        ostinatoState.subdivision = subdivision;
        ostinatoState.bars = bars;
        ostinatoState.length = bars;

        if (enableToggle) enableToggle.checked = !!(ostinatoState.enabled && ostinatoState.voice !== 'none');
        if (subdivisionSelect) subdivisionSelect.value = String(subdivision);
        if (barsSelect) barsSelect.value = String(bars);

        updateOstinatoPatternTimeSig();
        renderOstinatoPatternGrid();
    }

    function setOstinatoEnabled(enabled) {
        const voiceSelect = document.getElementById('ostinatoVoiceSelect');
        ostinatoState.enabled = !!enabled;
        if (ostinatoState.enabled) {
            if (ostinatoState.voice === 'none') {
                ostinatoState.voice = ostinatoState.lastVoice || '1';
            }
        } else {
            ostinatoState.voice = 'none';
        }
        if (voiceSelect) voiceSelect.value = ostinatoState.voice;
        saveOstinatoState();
        updateOstinatoPatternUI();
    }

    function resetOstinatoPattern() {
        const tsInfo = getMetronomeTimeSignatureInfo();
        const subdivision = normalizeOstinatoSubdivision(ostinatoState.subdivision, tsInfo.den);
        const bars = normalizeOstinatoBars(ostinatoState.bars);
        const stepsPerPattern = tsInfo.beats * subdivision * bars;
        ostinatoState.steps = buildDefaultPattern(stepsPerPattern, subdivision);
        saveOstinatoState();
        renderOstinatoPatternGrid();
    }

    function clearOstinatoPattern() {
        const tsInfo = getMetronomeTimeSignatureInfo();
        const subdivision = normalizeOstinatoSubdivision(ostinatoState.subdivision, tsInfo.den);
        const bars = normalizeOstinatoBars(ostinatoState.bars);
        const stepsPerPattern = tsInfo.beats * subdivision * bars;
        ostinatoState.steps = new Array(stepsPerPattern).fill(0);
        saveOstinatoState();
        renderOstinatoPatternGrid();
    }

    function initializeOstinatoPatternUI() {
        const enableToggle = document.getElementById('ostinatoPatternEnable');
        const subdivisionSelect = document.getElementById('ostinatoPatternSubdivision');
        const barsSelect = document.getElementById('ostinatoPatternBars');
        const grid = document.getElementById('ostinatoPatternGrid');

        if (enableToggle) {
            enableToggle.checked = !!(ostinatoState.enabled && ostinatoState.voice !== 'none');
            enableToggle.addEventListener('change', function() {
                setOstinatoEnabled(!!this.checked);
            });
        }

        if (subdivisionSelect) {
            subdivisionSelect.value = String(normalizeSubdivision(ostinatoState.subdivision));
            subdivisionSelect.addEventListener('change', function() {
                ostinatoState.subdivision = normalizeSubdivision(this.value);
                updateOstinatoPatternUI();
                saveOstinatoState();
            });
        }

        if (barsSelect) {
            barsSelect.value = String(normalizeOstinatoBars(ostinatoState.bars));
            barsSelect.addEventListener('change', function() {
                ostinatoState.bars = normalizeOstinatoBars(this.value);
                ostinatoState.length = ostinatoState.bars;
                updateOstinatoPatternUI();
                saveOstinatoState();
            });
        }

        if (grid) {
            grid.addEventListener('click', function(event) {
                const target = event.target.closest('button[data-step]');
                if (!target) return;
                const index = parseInt(target.dataset.step, 10);
                if (isNaN(index)) return;
                if (!ostinatoState.enabled) {
                    setOstinatoEnabled(true);
                }
                ostinatoState.steps[index] = ostinatoState.steps[index] ? 0 : 1;
                target.classList.toggle('active', !!ostinatoState.steps[index]);
                target.setAttribute('aria-pressed', ostinatoState.steps[index] ? 'true' : 'false');
                saveOstinatoState();
            });
        }

        updateOstinatoPatternUI();
    }

    function updateOstinatoUI() {
        const voiceSelect = document.getElementById('ostinatoVoiceSelect');
        if (voiceSelect) {
            voiceSelect.value = ostinatoState.voice;
        }
        updateOstinatoPatternUI();
    }

    function toggleOstinatoSection(show) {
        const section = document.getElementById('ostinatoSettingsSection');
        if (section) {
            section.style.display = show ? 'block' : 'none';
        }
        if (show) {
            updateOstinatoPatternUI();
        }
    }

    function getTranslation(key) {
        const pack = translations[currentLanguage] || translations['zh-CN'];
        return pack[key] || (translations['zh-CN'] && translations['zh-CN'][key]) || key;
    }

    function updatePlayButtonState(isPlaying) {
        const btn = document.getElementById('playRhythmBtn');
        if (!btn) return;
        btn.textContent = getTranslation(isPlaying ? 'controls.stop' : 'controls.play');
    }

    function applyTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');
        const langPack = translations[currentLanguage] || translations['zh-CN'];
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (langPack[key]) {
                element.textContent = langPack[key];
            }
        });
        updateMetronomePatternUI();
        updateOstinatoPatternUI();
        updatePlayButtonState(state.playback.isPlaying);
    }

    function switchLanguage(lang) {
        currentLanguage = lang;
        localStorage.setItem('preferredLanguage', lang);
        applyTranslations();
        closeSettings();
        if (window.__icMidi && typeof window.__icMidi.refreshStatus === 'function') {
            window.__icMidi.refreshStatus();
        }
        if (window.ICStudioSync) {
            window.ICStudioSync.syncLanguage(lang, 'rhythm-tool');
        }
    }

    function setTheme(theme) {
        currentTheme = theme;
        localStorage.setItem('preferredTheme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        closeSettings();
        if (window.ICStudioSync) {
            window.ICStudioSync.syncTheme(theme, 'rhythm-tool');
        }
    }

    function initializePreferences() {
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage && translations[savedLanguage]) {
            currentLanguage = savedLanguage;
        }
        document.documentElement.setAttribute('data-theme', currentTheme);
        applyTranslations();
    }

    function initializeCalibrationSettings() {
        // Calibration is handled in challenge modal only.
        state.calibration.enabled = false;
        writeCalibrationPreference(false);
        updateCalibrationToggleUI();
        updateCalibrationHint();
    }

    function toggleSettings() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        if (modal.dataset.open === 'true') {
            closeSettingsModal();
        } else {
            openSettingsModal();
        }
    }

    function openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        showModal(modal);
    }

    function closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        hideModal(modal);
    }

    function closeSettings() {
        closeSettingsModal();
    }

    function toggleFunctionSelector() {
        const functionMenu = document.getElementById('functionMenu');
        if (!functionMenu) return;
        functionMenu.classList.toggle('show');
        if (functionMenu.classList.contains('show')) {
            document.addEventListener('click', handleFunctionClickOutside);
        }
    }

    function closeFunctionSelector() {
        const functionMenu = document.getElementById('functionMenu');
        if (functionMenu) functionMenu.classList.remove('show');
        document.removeEventListener('click', handleFunctionClickOutside);
    }

    function handleFunctionClickOutside(event) {
        const functionSelector = document.querySelector('.function-selector');
        if (functionSelector && !functionSelector.contains(event.target)) {
            closeFunctionSelector();
        }
    }

    function switchFunction(mode) {
        if (mode === 'rhythm') {
            closeFunctionSelector();
            return;
        }
        const routes = {
            melody: 'melody-generator.html',
            jianpu: 'jianpu-generator.html',
            interval: 'interval-generator.html',
            chord: 'chord-generator.html'
        };
        if (routes[mode]) {
            window.location.href = routes[mode];
        }
    }

    function showModal(modal) {
        if (!modal || modal.dataset.open === 'true') return;
        modal.style.display = 'block';
        modal.dataset.open = 'true';
        openModalCount += 1;
        document.body.classList.add('modal-open');
    }

    function hideModal(modal) {
        if (!modal || modal.dataset.open !== 'true') return;
        modal.style.display = 'none';
        delete modal.dataset.open;
        openModalCount = Math.max(0, openModalCount - 1);
        if (openModalCount === 0) {
            document.body.classList.remove('modal-open');
        }
    }

    function setupModalAutoSave(modalId, onSave) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.addEventListener('click', event => {
            if (event.target === modal) {
                onSave();
            }
        });
    }

    function openRhythmSettings() {
        const modal = document.getElementById('rhythmSettingsModal');
        if (modal) {
            showModal(modal);
        }
    }

    function closeRhythmSettings() {
        const modal = document.getElementById('rhythmSettingsModal');
        if (modal) {
            hideModal(modal);
        }
    }

    function saveRhythmSettings() {
        closeRhythmSettings();
    }

    function toggleRhythmAdvancedSettings() {
        const panel = document.getElementById('rhythmAdvancedSettings');
        if (!panel) return;
        const isHidden = panel.style.display === 'none' || panel.style.display === '';
        panel.style.display = isHidden ? 'block' : 'none';
    }

    function updateCustomTimeSignatureFields(show) {
        const section = document.getElementById('customTimeSignatureFields');
        const beatsInput = document.getElementById('customTimeBeats');
        const beatTypeSelect = document.getElementById('customTimeBeatValue');
        if (section) {
            section.style.display = show ? 'block' : 'none';
        }
        if (!show) return;
        if (beatsInput && (!beatsInput.value || parseInt(beatsInput.value, 10) <= 0)) {
            beatsInput.value = '5';
        }
        if (beatTypeSelect && !beatTypeSelect.value) {
            beatTypeSelect.value = '4';
        }
    }

    function getCustomTimeSignatureInput() {
        const beatsInput = document.getElementById('customTimeBeats');
        const beatTypeSelect = document.getElementById('customTimeBeatValue');
        const beats = beatsInput ? parseInt(beatsInput.value, 10) : NaN;
        const beatType = beatTypeSelect ? parseInt(beatTypeSelect.value, 10) : NaN;

        if (!Number.isInteger(beats) || beats <= 0) {
            return { valid: false, message: '请输入正确的拍数（必须为大于0的整数）' };
        }
        if (![2, 4, 8, 16].includes(beatType)) {
            return { valid: false, message: '拍号单位仅支持 2/4/8/16' };
        }
        return { valid: true, value: `${beats}/${beatType}`, beats, beatType };
    }

    function findCustomTimeSignature(allowedTimeSignatures) {
        if (!Array.isArray(allowedTimeSignatures)) return null;
        return allowedTimeSignatures.find(ts => !isBuiltInTimeSignature(ts)) || null;
    }

    function collectTimeSignatureSelection() {
        const selectedTimeSignatures = [];
        const timeInputs = document.querySelectorAll('#timeSignatureModal input[type="checkbox"]');
        const customToggle = document.getElementById('time-custom');
        const customSelected = customToggle ? customToggle.checked : false;

        timeInputs.forEach(input => {
            if (!input.checked) return;
            if (input.value === 'custom') return;
            selectedTimeSignatures.push(input.value);
        });

        if (customSelected && SHOW_CUSTOM_TIME_SIGNATURE) {
            const customInput = getCustomTimeSignatureInput();
            if (!customInput.valid) {
                alert(customInput.message);
                return null;
            }
            state.customTimeSignature = customInput.value;
            if (isBuiltInTimeSignature(customInput.value)) {
                if (!selectedTimeSignatures.includes(customInput.value)) {
                    selectedTimeSignatures.push(customInput.value);
                }
                if (customToggle) {
                    customToggle.checked = false;
                    updateCustomTimeSignatureFields(false);
                }
                const builtInCheckbox = document.querySelector(`#timeSignatureModal input[value="${customInput.value}"]`);
                if (builtInCheckbox) builtInCheckbox.checked = true;
            } else {
                selectedTimeSignatures.push(customInput.value);
            }
        }

        return selectedTimeSignatures;
    }

    function ensureCustomTimeSignatureOption(select) {
        if (!select) return null;
        let option = document.getElementById('customTimeSignatureOption');
        if (!option) {
            option = document.createElement('option');
            option.id = 'customTimeSignatureOption';
            select.appendChild(option);
        }
        return option;
    }

    function setCustomTimeSignatureValue(select, value) {
        if (!select) return;
        const option = ensureCustomTimeSignatureOption(select);
        if (option) {
            option.value = value;
            option.textContent = value;
        }
        select.value = value;
        state.customTimeSignature = value;
    }

    function openTimeSignatureSettings() {
        const modal = document.getElementById('timeSignatureModal');
        const allowedTimeSignatures = Array.isArray(state.allowedTimeSignatures) && state.allowedTimeSignatures.length
            ? state.allowedTimeSignatures
            : ['4/4'];

        const timeInputs = document.querySelectorAll('#timeSignatureModal input[type="checkbox"]');
        timeInputs.forEach(input => {
            input.checked = allowedTimeSignatures.includes(input.value);
        });

        const customToggle = document.getElementById('time-custom');
        const customFromSelection = findCustomTimeSignature(allowedTimeSignatures);
        const customValue = customFromSelection || state.customTimeSignature;
        if (customToggle) {
            if (SHOW_CUSTOM_TIME_SIGNATURE) {
                customToggle.checked = !!customFromSelection;
                customToggle.onchange = () => updateCustomTimeSignatureFields(customToggle.checked);
                updateCustomTimeSignatureFields(customToggle.checked);
            } else {
                customToggle.checked = false;
                updateCustomTimeSignatureFields(false);
            }
        }
        if (customValue) {
            const parsed = parseTimeSignatureString(customValue);
            if (parsed) {
                const beatsInput = document.getElementById('customTimeBeats');
                const beatTypeSelect = document.getElementById('customTimeBeatValue');
                if (beatsInput) beatsInput.value = String(parsed.beats);
                if (beatTypeSelect) beatTypeSelect.value = String(parsed.beatType);
            }
        }

        if (modal) {
            showModal(modal);
        }
    }

    function closeTimeSignatureSettings() {
        const modal = document.getElementById('timeSignatureModal');
        if (modal) {
            hideModal(modal);
        }
    }

    function saveTimeSignatureSettings() {
        const select = document.getElementById('timeSignature');
        const selectedTimeSignatures = collectTimeSignatureSelection();
        if (!selectedTimeSignatures) return;
        if (selectedTimeSignatures.length === 0) {
            alert('请至少选择一个拍号！');
            return;
        }

        state.allowedTimeSignatures = selectedTimeSignatures;

        if (select) {
            if (selectedTimeSignatures.length === 1) {
                const single = selectedTimeSignatures[0];
                if (isBuiltInTimeSignature(single)) {
                    select.value = single;
                } else {
                    setCustomTimeSignatureValue(select, single);
                }
            } else {
                select.value = 'multi';
            }
            updateRhythmOptionsForTimeSignature(select.value);
        }

        closeTimeSignatureSettings();
    }

    function updateRhythmOptionsForTimeSignature(timeSignature) {
        if (!SHOW_CUSTOM_TIME_SIGNATURE && !isBuiltInTimeSignature(timeSignature) && timeSignature !== 'multi') {
            timeSignature = '4/4';
        }
        const wholeLabel = document.getElementById('rhythm-whole-label');
        const dottedHalfLabel = document.getElementById('rhythm-dotted-half-label');
        const halfLabel = document.getElementById('rhythm-half-label');
        const dottedQuarterLabel = document.getElementById('rhythm-dotted-quarter-label');
        const quarterLabel = document.getElementById('rhythm-quarter-label');
        const dottedEighthLabel = document.getElementById('rhythm-dotted-eighth-label');
        const eighthLabel = document.getElementById('rhythm-eighth-label');
        const sixteenthLabel = document.getElementById('rhythm-16th-label');
        const tripletLabel = document.getElementById('rhythm-triplet-label');
        const dupletLabel = document.getElementById('rhythm-duplet-label');
        const quadrupletLabel = document.getElementById('rhythm-quadruplet-label');
        const tripletCheckbox = document.getElementById('valueTriplet');
        const dupletCheckbox = document.getElementById('valueDuplet');
        const quadrupletCheckbox = document.getElementById('valueQuadruplet');
        const wholeCheckbox = document.getElementById('valueWhole');
        const dottedHalfCheckbox = document.getElementById('valueDottedHalf');
        const halfCheckbox = document.getElementById('valueHalf');
        const dottedQuarterCheckbox = document.getElementById('valueDottedQuarter');
        const quarterCheckbox = document.getElementById('valueQuarter');
        const dottedEighthCheckbox = document.getElementById('valueDottedEighth');
        const eighthCheckbox = document.getElementById('valueEighth');
        const sixteenthCheckbox = document.getElementById('valueSixteenth');
        const allowDottedNotesCheckbox = document.getElementById('allowDottedNotes');
        const allowDotted = allowDottedNotesCheckbox && allowDottedNotesCheckbox.checked;
        const dottedOptionsSection = document.getElementById('dottedOptionsSection');
        const freqDottedItem = document.getElementById('freq-dotted-item');
        const freqWholeItem = document.getElementById('freq-whole-item');
        const freqDottedHalfItem = document.getElementById('freq-dotted-half-item');
        const freqHalfItem = document.getElementById('freq-half-item');
        const freqDottedQuarterItem = document.getElementById('freq-dotted-quarter-item');
        const freqQuarterItem = document.getElementById('freq-quarter-item');
        const freqDottedEighthItem = document.getElementById('freq-dotted-eighth-item');
        const freqEighthItem = document.getElementById('freq-eighth-item');
        const freqSixteenthItem = document.getElementById('freq-sixteenth-item');
        const freqTripletItem = document.getElementById('freq-triplet-item');
        const freqDupletItem = document.getElementById('freq-duplet-item');
        const freqQuadrupletItem = document.getElementById('freq-quadruplet-item');

        const isMulti = timeSignature === 'multi';
        const multiHasCompound = isMulti && Array.isArray(state.allowedTimeSignatures)
            ? state.allowedTimeSignatures.some(ts => RHYTHM_NOTATION_RULES.isCompoundTimeSignature(ts))
            : false;
        const isCompound = !isMulti && RHYTHM_NOTATION_RULES.isCompoundTimeSignature(timeSignature);
        const showDottedToggle = !(isCompound || multiHasCompound);

        if (dottedOptionsSection) {
            dottedOptionsSection.style.display = showDottedToggle ? 'block' : 'none';
        }
        if (isMulti) {
            if (wholeLabel) wholeLabel.style.display = 'flex';
            if (dottedHalfLabel) dottedHalfLabel.style.display = 'flex';
            if (halfLabel) halfLabel.style.display = 'flex';
            if (dottedQuarterLabel) dottedQuarterLabel.style.display = 'flex';
            if (quarterLabel) quarterLabel.style.display = 'flex';
            if (dottedEighthLabel) dottedEighthLabel.style.display = 'flex';
            if (eighthLabel) eighthLabel.style.display = 'flex';
            if (sixteenthLabel) sixteenthLabel.style.display = 'flex';

            if (tripletLabel) tripletLabel.style.display = 'flex';
            if (dupletLabel) dupletLabel.style.display = 'flex';
            if (quadrupletLabel) quadrupletLabel.style.display = 'flex';

            if (freqDottedItem) freqDottedItem.style.display = 'none';
            if (freqWholeItem) freqWholeItem.style.display = 'block';
            if (freqDottedHalfItem) freqDottedHalfItem.style.display = 'block';
            if (freqHalfItem) freqHalfItem.style.display = 'block';
            if (freqDottedQuarterItem) freqDottedQuarterItem.style.display = 'block';
            if (freqQuarterItem) freqQuarterItem.style.display = 'block';
            if (freqDottedEighthItem) freqDottedEighthItem.style.display = 'block';
            if (freqEighthItem) freqEighthItem.style.display = 'block';
            if (freqSixteenthItem) freqSixteenthItem.style.display = 'block';
            if (freqTripletItem) freqTripletItem.style.display = 'block';
            if (freqDupletItem) freqDupletItem.style.display = 'block';
            if (freqQuadrupletItem) freqQuadrupletItem.style.display = 'block';

            updateFrequencyLabels();
            return;
        }

        if (isCompound) {
            if (wholeLabel) wholeLabel.style.display = 'none';
            if (halfLabel) halfLabel.style.display = 'none';
            if (quarterLabel) quarterLabel.style.display = 'none';

            if (dottedHalfLabel) dottedHalfLabel.style.display = 'flex';
            if (dottedQuarterLabel) dottedQuarterLabel.style.display = 'flex';
            if (dottedEighthLabel) dottedEighthLabel.style.display = 'flex';

            if (eighthLabel) eighthLabel.style.display = 'flex';
            if (sixteenthLabel) sixteenthLabel.style.display = 'flex';

            if (wholeCheckbox && wholeCheckbox.checked) {
                wholeCheckbox.checked = false;
                if (dottedHalfCheckbox) dottedHalfCheckbox.checked = true;
            }
            if (halfCheckbox && halfCheckbox.checked) {
                halfCheckbox.checked = false;
                if (dottedQuarterCheckbox) dottedQuarterCheckbox.checked = true;
            }
            if (quarterCheckbox && quarterCheckbox.checked) {
                quarterCheckbox.checked = false;
                if (dottedQuarterCheckbox) dottedQuarterCheckbox.checked = true;
            }

            if (tripletLabel) tripletLabel.style.display = 'none';
            if (dupletLabel) dupletLabel.style.display = 'flex';
            if (quadrupletLabel) quadrupletLabel.style.display = 'flex';
            if (tripletCheckbox && tripletCheckbox.checked) {
                tripletCheckbox.checked = false;
                if (dupletCheckbox && !dupletCheckbox.checked) dupletCheckbox.checked = true;
                if (quadrupletCheckbox && !quadrupletCheckbox.checked) quadrupletCheckbox.checked = true;
            }

            if (freqDottedItem) freqDottedItem.style.display = 'none';
            if (freqWholeItem) freqWholeItem.style.display = 'none';
            if (freqHalfItem) freqHalfItem.style.display = 'none';
            if (freqQuarterItem) freqQuarterItem.style.display = 'none';
            if (freqDottedHalfItem) freqDottedHalfItem.style.display = 'block';
            if (freqDottedQuarterItem) freqDottedQuarterItem.style.display = 'block';
            if (freqDottedEighthItem) freqDottedEighthItem.style.display = 'block';
            if (freqEighthItem) freqEighthItem.style.display = 'block';
            if (freqSixteenthItem) freqSixteenthItem.style.display = 'block';
            if (freqTripletItem) freqTripletItem.style.display = 'none';
            if (freqDupletItem) freqDupletItem.style.display = 'block';
            if (freqQuadrupletItem) freqQuadrupletItem.style.display = 'block';

            updateFrequencyLabels();
            return;
        }

        if (dottedOptionsSection) dottedOptionsSection.style.display = 'block';
        if (freqDottedItem) freqDottedItem.style.display = timeSignature === '4/4' ? 'block' : 'none';

        if (wholeLabel) wholeLabel.style.display = 'flex';
        if (halfLabel) halfLabel.style.display = 'flex';
        if (quarterLabel) quarterLabel.style.display = 'flex';
        if (eighthLabel) eighthLabel.style.display = 'flex';
        if (sixteenthLabel) sixteenthLabel.style.display = 'flex';

        const hideSpecificDotted = timeSignature === '4/4' || timeSignature === '2/4' || timeSignature === '3/4';
        if (dottedHalfLabel) dottedHalfLabel.style.display = hideSpecificDotted ? 'none' : 'flex';
        if (dottedQuarterLabel) dottedQuarterLabel.style.display = hideSpecificDotted ? 'none' : 'flex';
        if (dottedEighthLabel) dottedEighthLabel.style.display = hideSpecificDotted ? 'none' : 'flex';
        if (!allowDotted) {
            if (dottedHalfCheckbox) dottedHalfCheckbox.checked = false;
            if (dottedQuarterCheckbox) dottedQuarterCheckbox.checked = false;
            if (dottedEighthCheckbox) dottedEighthCheckbox.checked = false;
        }

        if (tripletLabel) tripletLabel.style.display = 'flex';
        if (dupletLabel) dupletLabel.style.display = 'none';
        if (quadrupletLabel) quadrupletLabel.style.display = 'none';
        if (dupletCheckbox?.checked || quadrupletCheckbox?.checked) {
            if (dupletCheckbox) dupletCheckbox.checked = false;
            if (quadrupletCheckbox) quadrupletCheckbox.checked = false;
            if (tripletCheckbox) tripletCheckbox.checked = true;
        }

        if (freqWholeItem) freqWholeItem.style.display = 'block';
        if (freqDottedHalfItem) freqDottedHalfItem.style.display = hideSpecificDotted ? 'none' : 'block';
        if (freqHalfItem) freqHalfItem.style.display = 'block';
        if (freqDottedQuarterItem) freqDottedQuarterItem.style.display = hideSpecificDotted ? 'none' : 'block';
        if (freqQuarterItem) freqQuarterItem.style.display = 'block';
        if (freqDottedEighthItem) freqDottedEighthItem.style.display = hideSpecificDotted ? 'none' : 'block';
        if (freqEighthItem) freqEighthItem.style.display = 'block';
        if (freqSixteenthItem) freqSixteenthItem.style.display = 'block';
        if (freqTripletItem) freqTripletItem.style.display = 'block';
        if (freqDupletItem) freqDupletItem.style.display = 'none';
        if (freqQuadrupletItem) freqQuadrupletItem.style.display = 'none';
        updateFrequencyLabels();
    }

    function openVoiceSettings() {
        const modal = document.getElementById('voiceSettingsModal');
        const select = document.getElementById('voiceMode');
        if (select) {
            const current = select.value;
            const radio = document.querySelector(`input[name="voiceOption"][value="${current}"]`);
            if (radio) {
                radio.checked = true;
            }
            toggleOstinatoSection(current === '2');
        }
        if (modal) {
            showModal(modal);
        }
    }

    function closeVoiceSettings() {
        const modal = document.getElementById('voiceSettingsModal');
        if (modal) {
            hideModal(modal);
        }
    }

    function saveVoiceSettings() {
        const selected = document.querySelector('input[name="voiceOption"]:checked');
        const select = document.getElementById('voiceMode');
        if (selected && select) {
            select.value = selected.value;
        }
        toggleSecondaryDensity(select && select.value === '2');
        closeVoiceSettings();
    }

    function updateDensityLabels() {
        const secondary = document.getElementById('secondaryDensity');
        const secondaryValue = document.getElementById('secondaryDensityValue');
        if (secondary && secondaryValue) {
            secondaryValue.textContent = `${secondary.value}%`;
        }
    }

    function updateFrequencyLabels() {
        const pairs = [
            ['freq-dotted', 'freq-dotted-value'],
            ['freq-whole', 'freq-whole-value'],
            ['freq-dotted-half', 'freq-dotted-half-value'],
            ['freq-half', 'freq-half-value'],
            ['freq-dotted-quarter', 'freq-dotted-quarter-value'],
            ['freq-quarter', 'freq-quarter-value'],
            ['freq-dotted-eighth', 'freq-dotted-eighth-value'],
            ['freq-eighth', 'freq-eighth-value'],
            ['freq-16th', 'freq-16th-value'],
            ['freq-triplet', 'freq-triplet-value'],
            ['freq-duplet', 'freq-duplet-value'],
            ['freq-quadruplet', 'freq-quadruplet-value']
        ];
        pairs.forEach(([inputId, valueId]) => {
            const input = document.getElementById(inputId);
            const value = document.getElementById(valueId);
            if (input && value) {
                value.textContent = `${input.value}%`;
            }
        });
    }

    function setEmptyScore() {
        const container = document.getElementById('score');
        if (!container) return;
        container.innerHTML = '<div class="empty-score-message" data-i18n="score.empty">点击生成节奏开始练习</div>';
        applyTranslations();
    }

    function toggleSecondaryDensity(show) {
        const group = document.getElementById('secondaryDensityGroup');
        if (group) {
            group.style.display = show ? 'flex' : 'none';
        }
        toggleOstinatoSection(show);
    }

    function applyPreset(preset) {
        const valueWhole = document.getElementById('valueWhole');
        const valueHalf = document.getElementById('valueHalf');
        const valueQuarter = document.getElementById('valueQuarter');
        const valueEighth = document.getElementById('valueEighth');
        const valueSixteenth = document.getElementById('valueSixteenth');
        const valueTriplet = document.getElementById('valueTriplet');
        const valueDuplet = document.getElementById('valueDuplet');
        const valueQuadruplet = document.getElementById('valueQuadruplet');
        const syncopation = document.getElementById('syncopation');
        const voiceMode = document.getElementById('voiceMode');
        const secondaryDensity = document.getElementById('secondaryDensity');

        if (!valueWhole || !valueHalf || !valueQuarter || !valueEighth || !valueSixteenth || !valueTriplet || !syncopation || !voiceMode || !secondaryDensity) {
            return;
        }

        if (preset === 'basic') {
            valueWhole.checked = false;
            valueHalf.checked = false;
            valueQuarter.checked = true;
            valueEighth.checked = true;
            valueSixteenth.checked = false;
            valueTriplet.checked = false;
            if (valueDuplet) valueDuplet.checked = false;
            if (valueQuadruplet) valueQuadruplet.checked = false;
            syncopation.value = '0';
            voiceMode.value = '1';
            secondaryDensity.value = 45;
        } else if (preset === 'intermediate') {
            valueWhole.checked = false;
            valueHalf.checked = true;
            valueQuarter.checked = true;
            valueEighth.checked = true;
            valueSixteenth.checked = true;
            valueTriplet.checked = false;
            if (valueDuplet) valueDuplet.checked = false;
            if (valueQuadruplet) valueQuadruplet.checked = false;
            syncopation.value = '20';
            voiceMode.value = '1';
            secondaryDensity.value = 50;
        } else if (preset === 'advanced') {
            valueWhole.checked = true;
            valueHalf.checked = true;
            valueQuarter.checked = true;
            valueEighth.checked = true;
            valueSixteenth.checked = true;
            valueTriplet.checked = true;
            if (valueDuplet) valueDuplet.checked = false;
            if (valueQuadruplet) valueQuadruplet.checked = false;
            syncopation.value = '40';
            voiceMode.value = '2';
            secondaryDensity.value = 60;
        }

        toggleSecondaryDensity(voiceMode.value === '2');
        updateDensityLabels();
        triggerGenerate();
    }

    function getMeasureCount() {
        const checked = document.querySelector('input[name="measureCount"]:checked');
        return checked ? parseInt(checked.value, 10) : 4;
    }

    function isElementVisible(element) {
        if (!element) return false;
        if (element.offsetParent !== null) return true;
        if (typeof window === 'undefined' || !window.getComputedStyle) return false;
        return window.getComputedStyle(element).display !== 'none';
    }

    function collectAllowedRhythms(allowDottedNotes, explicitDotted = false) {
        const selectedRhythms = [];
        const baseRhythms = [
            { id: 'valueWhole', value: 'whole' },
            { id: 'valueHalf', value: 'half' },
            { id: 'valueQuarter', value: 'quarter' },
            { id: 'valueEighth', value: 'eighth' },
            { id: 'valueSixteenth', value: '16th' },
            { id: 'valueTriplet', value: 'triplet' },
            { id: 'valueDuplet', value: 'duplet' },
            { id: 'valueQuadruplet', value: 'quadruplet' }
        ];

        baseRhythms.forEach(({ id, value }) => {
            const checkbox = document.getElementById(id);
            if (checkbox && checkbox.checked) {
                selectedRhythms.push(value);
            }
        });

        const dottedRhythms = [
            { id: 'valueDottedHalf', value: 'half.' },
            { id: 'valueDottedQuarter', value: 'quarter.' },
            { id: 'valueDottedEighth', value: 'eighth.' }
        ];

        dottedRhythms.forEach(({ id, value }) => {
            const checkbox = document.getElementById(id);
            if (!checkbox) return;
            const label = checkbox.closest('label');
            if ((allowDottedNotes || explicitDotted) && checkbox.checked && isElementVisible(label || checkbox)) {
                selectedRhythms.push(value);
            }
            if (!allowDottedNotes && !explicitDotted && checkbox.checked) {
                checkbox.checked = false;
            }
        });

        if (!explicitDotted) {
            if (allowDottedNotes) {
                if (selectedRhythms.includes('half') && selectedRhythms.includes('quarter') && !selectedRhythms.includes('half.')) {
                    selectedRhythms.push('half.');
                }
                if (selectedRhythms.includes('quarter') && selectedRhythms.includes('eighth') && !selectedRhythms.includes('quarter.')) {
                    selectedRhythms.push('quarter.');
                }
                if (selectedRhythms.includes('eighth') && selectedRhythms.includes('16th') && !selectedRhythms.includes('eighth.')) {
                    selectedRhythms.push('eighth.');
                }
            } else {
                return selectedRhythms.filter(rhythm => !(rhythm.includes('.') || rhythm.startsWith('dotted-')));
            }
        }

        return selectedRhythms;
    }

    function getSettings() {
        const timeSignatureSelect = document.getElementById('timeSignature');
        let uiTimeSignature = timeSignatureSelect ? timeSignatureSelect.value : '4/4';
        if (!SHOW_CUSTOM_TIME_SIGNATURE && !isBuiltInTimeSignature(uiTimeSignature) && uiTimeSignature !== 'multi') {
            uiTimeSignature = '4/4';
            if (timeSignatureSelect) timeSignatureSelect.value = '4/4';
        }
        const allowedTimeSignatures = Array.isArray(state.allowedTimeSignatures) && state.allowedTimeSignatures.length
            ? state.allowedTimeSignatures
            : (uiTimeSignature && uiTimeSignature !== 'multi' ? [uiTimeSignature] : ['4/4']);
        let timeSignature = uiTimeSignature;
        if (uiTimeSignature === 'multi') {
            const pick = allowedTimeSignatures[Math.floor(Math.random() * allowedTimeSignatures.length)];
            timeSignature = pick || '4/4';
        }
        const [beats, beatType] = timeSignature.split('/').map(Number);
        const isCompound = RHYTHM_NOTATION_RULES.isCompoundTimeSignature(timeSignature);
        const multiHasCompound = uiTimeSignature === 'multi'
            ? allowedTimeSignatures.some(ts => RHYTHM_NOTATION_RULES.isCompoundTimeSignature(ts))
            : false;
        const allowDottedToggle = document.getElementById('allowDottedNotes')?.checked ?? false;
        const explicitDotted = isCompound || multiHasCompound;
        const allowDottedNotes = explicitDotted ? false : allowDottedToggle;
        const voiceModeSelect = document.getElementById('voiceMode');
        const checkedVoiceOption = document.querySelector('input[name="voiceOption"]:checked');
        if (voiceModeSelect && checkedVoiceOption && checkedVoiceOption.value) {
            voiceModeSelect.value = checkedVoiceOption.value;
        }
        const voiceMode = parseInt(voiceModeSelect?.value || '1', 10);
        const secondaryDensityInput = document.getElementById('secondaryDensity');
        const syncopationInput = document.getElementById('syncopation');
        const ostinato = {
            voice: voiceMode === 2 && ostinatoState.enabled && ostinatoState.voice !== 'none'
                ? ostinatoState.voice
                : 'none',
            length: clampNumber(ostinatoState.bars || ostinatoState.length || 1, 1, patternBarsOptions[patternBarsOptions.length - 1], 1),
            subdivision: ostinatoState.subdivision,
            bars: ostinatoState.bars || ostinatoState.length || 1,
            steps: Array.isArray(ostinatoState.steps) ? ostinatoState.steps.slice() : [],
            enabled: !!(ostinatoState.enabled && ostinatoState.voice !== 'none')
        };
        return {
            beats,
            beatType,
            measures: getMeasureCount(),
            density: 60,
            secondaryDensity: secondaryDensityInput ? parseInt(secondaryDensityInput.value, 10) : 45,
            allowRests: true,
            allowDottedNotes,
            allowTriplets: !isCompound && (document.getElementById('valueTriplet')?.checked ?? false),
            allowDuplets: isCompound && (document.getElementById('valueDuplet')?.checked ?? false),
            allowQuadruplets: isCompound && (document.getElementById('valueQuadruplet')?.checked ?? false),
            syncopation: syncopationInput ? parseInt(syncopationInput.value, 10) : 0,
            accentMode: 'off',
            voiceMode,
            ostinato,
            timeSignature,
            allowedRhythms: collectAllowedRhythms(allowDottedNotes, explicitDotted),
            noteValues: {
                whole: document.getElementById('valueWhole')?.checked ?? false,
                half: document.getElementById('valueHalf')?.checked ?? false,
                quarter: document.getElementById('valueQuarter').checked,
                eighth: document.getElementById('valueEighth').checked,
                sixteenth: document.getElementById('valueSixteenth').checked,
                triplet: document.getElementById('valueTriplet')?.checked ?? false,
                duplet: document.getElementById('valueDuplet')?.checked ?? false,
                quadruplet: document.getElementById('valueQuadruplet')?.checked ?? false
            },
            frequency: {
                dotted: parseInt(document.getElementById('freq-dotted')?.value ?? '0', 10),
                whole: parseInt(document.getElementById('freq-whole')?.value ?? '0', 10),
                'dotted-half': parseInt(document.getElementById('freq-dotted-half')?.value ?? '0', 10),
                half: parseInt(document.getElementById('freq-half')?.value ?? '0', 10),
                'dotted-quarter': parseInt(document.getElementById('freq-dotted-quarter')?.value ?? '0', 10),
                quarter: parseInt(document.getElementById('freq-quarter')?.value ?? '0', 10),
                'dotted-eighth': parseInt(document.getElementById('freq-dotted-eighth')?.value ?? '0', 10),
                eighth: parseInt(document.getElementById('freq-eighth')?.value ?? '0', 10),
                '16th': parseInt(document.getElementById('freq-16th')?.value ?? '0', 10),
                triplet: parseInt(document.getElementById('freq-triplet')?.value ?? '0', 10),
                duplet: parseInt(document.getElementById('freq-duplet')?.value ?? '0', 10),
                quadruplet: parseInt(document.getElementById('freq-quadruplet')?.value ?? '0', 10)
            }
        };
    }

    function gcd(a, b) {
        return b === 0 ? a : gcd(b, a % b);
    }

    function normalizeFrequencyPercentage(value, fallbackValue = 15) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return fallbackValue;
        return Math.max(0, Math.min(100, Math.round(numeric)));
    }

    function getDefaultRhythmFrequency(type) {
        const defaults = {
            dotted: 20,
            whole: 10,
            'dotted-half': 15,
            half: 30,
            'dotted-quarter': 35,
            quarter: 50,
            'dotted-eighth': 25,
            eighth: 40,
            '16th': 20,
            triplet: 35,
            duplet: 30,
            quadruplet: 25
        };
        return defaults[type] ?? 20;
    }

    function getUserFrequency(settings, item) {
        const fallbackValue = getDefaultRhythmFrequency(item);
        const rawValue = settings.frequency?.[item] ?? fallbackValue;
        let normalized = normalizeFrequencyPercentage(rawValue, fallbackValue);
        if (item.startsWith('dotted-') && settings.timeSignature === '4/4') {
            const dottedGlobal = normalizeFrequencyPercentage(
                settings.frequency?.dotted ?? getDefaultRhythmFrequency('dotted'),
                getDefaultRhythmFrequency('dotted')
            );
            normalized = Math.round((normalized * dottedGlobal) / 100);
        }
        return normalized;
    }

    function mapDurationToFrequencyKey(duration) {
        const mapping = {
            'quarter.': 'dotted-quarter',
            'half.': 'dotted-half',
            'eighth.': 'dotted-eighth'
        };
        return mapping[duration] || duration;
    }

    function calculatePreciseRhythmWeight(settings, duration) {
        const mappedDuration = mapDurationToFrequencyKey(duration);
        const userFreq = getUserFrequency(settings, mappedDuration);
        if (userFreq === 0) {
            return 0;
        }
        let weight = Math.pow(userFreq / 100, 1.6);
        if (RHYTHM_NOTATION_RULES.isCompoundTimeSignature(settings.timeSignature)) {
            if (mappedDuration === 'eighth') {
                weight *= 1.45;
            } else if (mappedDuration === 'quarter') {
                weight *= 0.6;
            }
        }
        return weight;
    }

    function selectDurationByPreciseFrequency(availableDurations, settings) {
        const weightedOptions = availableDurations
            .map(duration => ({
                duration,
                weight: calculatePreciseRhythmWeight(settings, duration)
            }))
            .filter(option => option.weight > 0);

        if (weightedOptions.length === 0) {
            return availableDurations[0];
        }

        const totalWeight = weightedOptions.reduce((sum, option) => sum + option.weight, 0);
        const target = Math.random() * totalWeight;

        let accumulator = 0;
        for (const option of weightedOptions) {
            accumulator += option.weight;
            if (accumulator >= target) {
                return option.duration;
            }
        }

        return weightedOptions[weightedOptions.length - 1].duration;
    }

    function getDurationPool(settings) {
        const allowed = Array.isArray(settings.allowedRhythms) ? settings.allowedRhythms : [];
        const pool = allowed.filter(key => durationDefs[key]);
        return pool.length ? pool : ['quarter'];
    }

    function shouldRest(settings, position, ticksPerBeat) {
        if (!settings.allowRests) return false;
        const baseRest = Math.max(0.05, 1 - settings.density / 100);
        const syncBias = 0; // syncopation influence is disabled for now
        const onBeat = position % ticksPerBeat === 0;
        const restChance = onBeat ? Math.min(0.9, baseRest + syncBias * 0.4) : baseRest;
        return Math.random() < restChance;
    }

    function shouldAccent(settings, position, ticksPerBeat) {
        if (!settings.accentMode || settings.accentMode === 'off') return false;
        const onBeat = position % ticksPerBeat === 0;
        if (settings.accentMode === 'downbeat') {
            return onBeat;
        }
        if (settings.accentMode === 'random') {
            return Math.random() < 0.2 || onBeat;
        }
        return false;
    }

    function buildTupletGroup(settings, durationTicks, count, timeMod, voice, stem, startPosition, beatTicksForRest) {
        let type = 'eighth';
        if (durationTicks <= divisions / 4) {
            type = '16th';
        }
        return Array.from({ length: count }, (_, index) => {
            const position = startPosition + durationTicks * index;
            const rest = shouldRest(settings, position, beatTicksForRest);
            return {
                duration: durationTicks,
                type,
                dots: 0,
                voice,
                stem,
                rest,
                timeMod,
                tuplet: index === 0 ? 'start' : index === count - 1 ? 'stop' : null,
                accent: !rest && index === 0 && shouldAccent(settings, position, beatTicksForRest)
            };
        });
    }

    function buildTripletGroup(settings, ticksPerBeat, voice, stem, startPosition) {
        const durationTicks = Math.floor(ticksPerBeat / 3);
        return buildTupletGroup(
            settings,
            durationTicks,
            3,
            { actual: 3, normal: 2 },
            voice,
            stem,
            startPosition,
            ticksPerBeat
        );
    }

    function pickCompoundTupletType(settings) {
        const dupletWeight = settings.allowDuplets ? Math.max(0, getUserFrequency(settings, 'duplet')) : 0;
        const quadrupletWeight = settings.allowQuadruplets ? Math.max(0, getUserFrequency(settings, 'quadruplet')) : 0;
        const totalWeight = dupletWeight + quadrupletWeight;
        if (totalWeight <= 0) return null;
        const chance = Math.min(0.9, totalWeight / 100);
        if (Math.random() >= chance) return null;
        const roll = Math.random() * totalWeight;
        return roll < dupletWeight ? 'duplet' : 'quadruplet';
    }

    function buildVoiceMeasure(settings, densityOverride, voice) {
        const ticksPerBeat = divisions * (4 / settings.beatType);
        const measureTicks = ticksPerBeat * settings.beats;
        const timeSignature = `${settings.beats}/${settings.beatType}`;
        const isCompound = RHYTHM_NOTATION_RULES.isCompoundTimeSignature(timeSignature);
        const mainBeatTicks = isCompound ? ticksPerBeat * 3 : ticksPerBeat;
        const pool = getDurationPool(settings);
        const poolDefs = pool.map(key => durationDefs[key]).filter(Boolean);
        const gcdValue = poolDefs.reduce((acc, item) => gcd(acc, item.ticks), poolDefs[0].ticks);
        const minDuration = Math.min(...poolDefs.map(item => item.ticks));
        const events = [];
        const stem = voice === 1 ? 'up' : 'down';
        let position = 0;

        while (position < measureTicks) {
            const remaining = measureTicks - position;
            if (isCompound && position % mainBeatTicks === 0 && remaining >= mainBeatTicks) {
                const tupletType = pickCompoundTupletType(settings);
                if (tupletType) {
                    const count = tupletType === 'duplet' ? 2 : 4;
                    const durationTicks = Math.round(mainBeatTicks / count);
                    const timeMod = tupletType === 'duplet'
                        ? { actual: 2, normal: 3 }
                        : { actual: 4, normal: 3 };
                    const group = buildTupletGroup(
                        settings,
                        durationTicks,
                        count,
                        timeMod,
                        voice,
                        stem,
                        position,
                        mainBeatTicks
                    );
                    group.forEach(event => {
                        events.push(event);
                        position += event.duration;
                    });
                    continue;
                }
            }

            const tripletChance = Math.min(0.9, Math.max(0, getUserFrequency(settings, 'triplet') / 100));
            if (!isCompound && settings.allowTriplets && position % ticksPerBeat === 0 && remaining >= ticksPerBeat && Math.random() < tripletChance) {
                const group = buildTripletGroup(settings, ticksPerBeat, voice, stem, position);
                group.forEach(event => {
                    events.push(event);
                    position += event.duration;
                });
                continue;
            }

            const candidatePool = pool
                .filter(key => {
                    const item = durationDefs[key];
                    return item && item.ticks <= remaining && (remaining - item.ticks) % gcdValue === 0;
                })
                .filter(key => {
                    const item = durationDefs[key];
                    return item && (remaining - item.ticks === 0 || remaining - item.ticks >= minDuration);
                });
            const selectionKey = selectDurationByPreciseFrequency(candidatePool.length ? candidatePool : pool, settings);
            const selection = durationDefs[selectionKey] || durationDefs.quarter;
            const rest = shouldRest({ ...settings, density: densityOverride }, position, ticksPerBeat);
            events.push({
                duration: selection.ticks,
                type: selection.type,
                dots: selection.dots,
                voice,
                stem,
                rest,
                accent: !rest && shouldAccent(settings, position, ticksPerBeat),
                timeMod: null,
                tuplet: null
            });
            position += selection.ticks;
        }

        if (events.every(event => event.rest)) {
            events[0].rest = false;
        }

        return events;
    }

    function buildMeasures(settings, densityOverride, voice) {
        const measures = [];
        for (let i = 0; i < settings.measures; i += 1) {
            measures.push(buildVoiceMeasure(settings, densityOverride, voice));
        }
        return measures;
    }

    const RHYTHM_NOTATION_RULES = {
        isCompoundTimeSignature(timeSignature) {
            const [beats, beatType] = timeSignature.split('/').map(Number);
            return Number.isFinite(beats) && Number.isFinite(beatType) && beatType === 8 && beats % 3 === 0 && beats >= 6;
        },
        getCompoundInfo(timeSignature) {
            if (!this.isCompoundTimeSignature(timeSignature)) return null;
            const [beats, beatType] = timeSignature.split('/').map(Number);
            const measureBeats = beats * (4 / beatType);
            const mainBeatLength = 1.5;
            const mainBeats = Array.from({ length: beats / 3 }, (_, i) => i * mainBeatLength);
            const subdivisions = [];
            for (let pos = 0; pos < measureBeats - 0.0001; pos += 0.5) {
                subdivisions.push(Math.round(pos * 1000) / 1000);
            }
            return {
                beats,
                beatType,
                measureBeats,
                mainBeatLength,
                mainBeats,
                subdivisions
            };
        },
        getBeatStructure(timeSignature) {
            const [beats, beatType] = timeSignature.split('/').map(Number);
            if (this.isCompoundTimeSignature(timeSignature)) {
                const info = this.getCompoundInfo(timeSignature);
                return {
                    beatsPerMeasure: info.measureBeats,
                    realBeatsPerMeasure: info.beats / 3,
                    strongBeats: info.mainBeats,
                    subdivisions: info.subdivisions,
                    compoundMeter: true,
                    dottedQuarterBased: true
                };
            }
            switch (timeSignature) {
                case '2/4':
                    return { beatsPerMeasure: 2, strongBeats: [0, 1], subdivisions: [0, 0.5, 1, 1.5] };
                case '3/4':
                    return { beatsPerMeasure: 3, strongBeats: [0, 1, 2], subdivisions: [0, 0.5, 1, 1.5, 2, 2.5] };
                case '4/4':
                    return {
                        beatsPerMeasure: 4,
                        strongBeats: [0, 2],
                        mediumBeats: [1, 3],
                        subdivisions: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]
                    };
                case '6/8':
                    return {
                        beatsPerMeasure: 3,
                        realBeatsPerMeasure: 2,
                        strongBeats: [0, 1.5],
                        subdivisions: [0, 0.5, 1, 1.5, 2, 2.5],
                        compoundMeter: true,
                        dottedQuarterBased: true
                    };
                default:
                    return { beatsPerMeasure: beats, strongBeats: [0], subdivisions: [] };
            }
        },
        getCriticalBeatsForFinestRhythm(finestRhythm, timeSignature) {
            const structure = this.getBeatStructure(timeSignature);
            if (timeSignature === '4/4') {
                if (finestRhythm <= 0.125) return [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
                if (finestRhythm <= 0.25) return [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
                if (finestRhythm <= 0.5) return [0, 2];
                return [0];
            }
            if (timeSignature === '3/4') {
                if (finestRhythm <= 0.125) return [0, 0.5, 1, 1.5, 2, 2.5];
                if (finestRhythm <= 0.25) return [0, 0.5, 1, 1.5, 2, 2.5];
                if (finestRhythm <= 0.5) return [0, 1, 2];
                return [0];
            }
            if (timeSignature === '2/4') {
                if (finestRhythm <= 0.125) return [0, 0.5, 1, 1.5];
                if (finestRhythm <= 0.25) return [0, 0.5, 1, 1.5];
                if (finestRhythm <= 0.5) return [0];
                return [0];
            }
            if (this.isCompoundTimeSignature(timeSignature)) {
                if (finestRhythm <= 0.125) return structure.subdivisions;
                if (finestRhythm <= 0.25) return structure.subdivisions;
                if (finestRhythm <= 0.5) return structure.strongBeats;
                return [0];
            }
            return structure.strongBeats;
        },
        getCriticalBeatsForCompound(notes, timeSignature) {
            const info = this.getCompoundInfo(timeSignature);
            if (!info) return [];
            const criticalBeats = new Set();
            info.mainBeats.forEach(beat => criticalBeats.add(beat));
            const has16th = notes.some(note => !note.isTriplet && Math.abs(note.beats - 0.25) < 0.001);
            if (has16th) {
                info.mainBeats.forEach(start => {
                    criticalBeats.add(start + 0.5);
                    criticalBeats.add(start + 1);
                });
                return Array.from(criticalBeats).sort((a, b) => a - b);
            }
            for (const start of info.mainBeats) {
                const end = start + info.mainBeatLength;
                let minValue = Infinity;
                let currentPos = 0;
                for (const note of notes) {
                    if (note.isTriplet) {
                        currentPos += note.beats;
                        continue;
                    }
                    const noteStart = currentPos;
                    const noteEnd = currentPos + note.beats;
                    if (noteEnd > start && noteStart < end) {
                        minValue = Math.min(minValue, note.beats);
                    }
                    currentPos += note.beats;
                }
                if (minValue <= 0.5) {
                    criticalBeats.add(start + 0.5).add(start + 1);
                }
            }
            return Array.from(criticalBeats).sort((a, b) => a - b);
        },
        getCriticalBeatsFor3_4(notes) {
            const criticalBeats = new Set([0, 1, 2]);
            let hasEighth = false;
            for (const note of notes) {
                if (note.type === 'note' && !note.isTriplet && note.beats <= 0.5) {
                    hasEighth = true;
                    break;
                }
            }
            if (hasEighth) {
                criticalBeats.add(0.5).add(1.5).add(2.5);
            }
            return Array.from(criticalBeats).sort((a, b) => a - b);
        },
        getCriticalBeatsWithLocalRhythm(notes, timeSignature) {
            if (this.isCompoundTimeSignature(timeSignature)) return this.getCriticalBeatsForCompound(notes, timeSignature);
            if (timeSignature === '3/4') return this.getCriticalBeatsFor3_4(notes);
            if (timeSignature !== '4/4') {
                const validNotes = notes.filter(n => n.type === 'note' && !n.isTriplet);
                if (validNotes.length === 0) {
                    const structure = this.getBeatStructure(timeSignature);
                    return Array.isArray(structure.strongBeats) && structure.strongBeats.length
                        ? [...structure.strongBeats]
                        : [0];
                }
                const finestRhythm = Math.min(...validNotes.map(n => n.beats));
                return this.getCriticalBeatsForFinestRhythm(finestRhythm, timeSignature);
            }
            const criticalBeats = new Set();
            let has16thNote = false;
            for (const note of notes) {
                if (note.type === 'note' && !note.isTriplet && Math.abs(note.beats - 0.25) < 0.001) {
                    has16thNote = true;
                    break;
                }
            }
            if (has16thNote) {
                criticalBeats.add(0).add(1).add(2).add(3);
                return Array.from(criticalBeats).sort((a, b) => a - b);
            }
            const halfNoteBeatRegions = [
                { start: 0, end: 2, beatPoint: 0 },
                { start: 2, end: 4, beatPoint: 2 }
            ];
            const regionAnalysis = [];
            for (const region of halfNoteBeatRegions) {
                let regionMinValue = Infinity;
                let currentPos = 0;
                for (const note of notes) {
                    const noteStart = currentPos;
                    const noteEnd = currentPos + note.beats;
                    if (noteEnd > region.start && noteStart < region.end && !note.isTriplet) {
                        regionMinValue = Math.min(regionMinValue, note.beats);
                    }
                    currentPos += note.beats;
                }
                if (regionMinValue === Infinity) regionMinValue = 4;
                let requiredBeatLevel = 'none';
                if (regionMinValue <= 0.25) requiredBeatLevel = 'quarter';
                else if (regionMinValue <= 0.5) requiredBeatLevel = 'half';
                else if (regionMinValue <= 1) requiredBeatLevel = 'whole';
                regionAnalysis.push({ region, minValue: regionMinValue, beatLevel: requiredBeatLevel });
            }
            const has16thInAnyRegion = regionAnalysis.some(r => r && r.beatLevel === 'quarter');
            if (has16thInAnyRegion) {
                criticalBeats.add(0).add(1).add(2).add(3);
            } else {
                const region1 = regionAnalysis[0];
                if (region1) {
                    if (region1.beatLevel === 'half' || region1.beatLevel === 'whole') {
                        criticalBeats.add(0);
                    }
                }
                const region2 = regionAnalysis[1];
                if (region2) {
                    if (region2.beatLevel === 'half') {
                        criticalBeats.add(2);
                    }
                }
            }
            return Array.from(criticalBeats).sort((a, b) => a - b);
        },
        isBeatPointAlreadyClear(noteStart, noteEnd, beatPoint, allNotes, timeSignature) {
            if (timeSignature !== '4/4' && timeSignature !== '3/4' && !this.isCompoundTimeSignature(timeSignature)) return false;
            const criticalBeats = this.getCriticalBeatsWithLocalRhythm(allNotes, timeSignature);
            const tolerance = 0.0001;
            const isBeatPointCritical = criticalBeats.some(cb => Math.abs(cb - beatPoint) < tolerance);
            if (!isBeatPointCritical) return true;
            let currentPos = 0;
            for (const note of allNotes) {
                const noteStartPos = currentPos;
                const noteEndPos = currentPos + note.beats;
                if (Math.abs(noteStartPos - beatPoint) < tolerance) return true;
                if (Math.abs(noteEndPos - beatPoint) < tolerance) return true;
                currentPos += note.beats;
            }
            return false;
        },
        detectsCrossBeatsWithLocalRhythm(startPosition, duration, timeSignature, allNotes, noteType = 'note') {
            const endPosition = startPosition + duration;
            const tolerance = 0.0001;
            if (this.isCompoundTimeSignature(timeSignature)) {
                return this.detectsCrossBeatsForCompound(startPosition, duration, allNotes, noteType, timeSignature);
            }
            if (timeSignature === '3/4') {
                return this.detectsCrossBeatsFor3_4(startPosition, duration, allNotes, noteType);
            }
            if (timeSignature !== '4/4') {
                return this.detectsCrossBeatsGeneric(startPosition, duration, timeSignature, allNotes, noteType);
            }
            const criticalBeats = this.getCriticalBeatsWithLocalRhythm(allNotes, timeSignature);
            const has16thNotes = false;
            if (Math.abs(duration - 1.0) < tolerance && noteType === 'note') {
                if (Math.abs(startPosition - 1.5) < 0.01) {
                    if (!has16thNotes) {
                        return { crossesBeat: true, beatPoint: 2, splitPositions: [2] };
                    }
                }
                const beatPoints = [1, 2, 3];
                for (const beat of beatPoints) {
                    if (startPosition < beat - tolerance && endPosition > beat + tolerance) {
                        const isCritical = criticalBeats.some(cb => Math.abs(cb - beat) < tolerance);
                        if (!isCritical) continue;
                        const startsOnBeat = Math.abs(startPosition - Math.round(startPosition)) < tolerance;
                        if (!startsOnBeat) {
                            if (this.isBeatPointAlreadyClear(startPosition, endPosition, beat, allNotes, timeSignature)) {
                                continue;
                            }
                            return { crossesBeat: true, beatPoint: beat, splitPositions: [beat] };
                        }
                    }
                }
            }
            for (const beatPoint of criticalBeats) {
                if (startPosition < beatPoint - tolerance && endPosition > beatPoint + tolerance) {
                    if (has16thNotes) {
                        const quarterBeats = [0, 1, 2, 3];
                        const isQuarterBeat = quarterBeats.some(qb => Math.abs(beatPoint - qb) < tolerance);
                        if (isQuarterBeat) {
                            const startsOnQuarterBeat = quarterBeats.some(pos => Math.abs(startPosition - pos) < tolerance);
                            if (!startsOnQuarterBeat) {
                                return { crossesBeat: true, beatPoint, splitPositions: [beatPoint] };
                            }
                        }
                    }
                    if (noteType === 'rest') {
                        if (this.isBeatPointAlreadyClear(startPosition, endPosition, beatPoint, allNotes, timeSignature)) {
                            continue;
                        }
                        return { crossesBeat: true, beatPoint, splitPositions: [beatPoint] };
                    }
                    if (this.isNoteOnCorrespondingBeat(startPosition, duration, beatPoint, criticalBeats)) {
                        continue;
                    }
                    if (this.isBeatPointAlreadyClear(startPosition, endPosition, beatPoint, allNotes, timeSignature)) {
                        continue;
                    }
                    return { crossesBeat: true, beatPoint, splitPositions: [beatPoint] };
                }
            }
            return { crossesBeat: false };
        },
        isNoteOnCorrespondingBeat(startPosition, duration, crossedBeatPoint, criticalBeats = []) {
            const tolerance = 0.0001;
            const has16thNotes = criticalBeats.includes(0) && criticalBeats.includes(1) &&
                criticalBeats.includes(2) && criticalBeats.includes(3);
            if (has16thNotes) {
                const quarterBeats = [0, 1, 2, 3];
                const startsOnQuarterBeat = quarterBeats.some(pos => Math.abs(startPosition - pos) < tolerance);
                if (!startsOnQuarterBeat) return false;
            }
            if (Math.abs(duration - 2) < tolerance) {
                if (Math.abs(crossedBeatPoint - 2) < tolerance) {
                    const validStarts = [0, 2];
                    return validStarts.some(pos => Math.abs(startPosition - pos) < tolerance);
                }
                const halfBeats = [0, 2];
                return halfBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            }
            if (Math.abs(duration - 1) < tolerance) {
                const quarterBeats = [0, 1, 2, 3];
                const offBeats = [0.5, 1.5, 2.5, 3.5];
                const isOnQuarterBeat = quarterBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
                const isOnOffBeat = offBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
                if (isOnOffBeat) return false;
                if (isOnQuarterBeat) {
                    const needsHalfNoteBeatClarity = criticalBeats.length === 2 &&
                        criticalBeats.includes(1) && criticalBeats.includes(3) &&
                        !criticalBeats.includes(2) && !criticalBeats.includes(4);
                    if (needsHalfNoteBeatClarity && Math.abs(startPosition - 2) < tolerance) return false;
                    return true;
                }
                return false;
            }
            if (Math.abs(duration - 0.5) < tolerance) {
                const eighthBeats = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
                return eighthBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            }
            if (Math.abs(duration - 0.25) < tolerance) {
                const position16th = Math.round(startPosition / 0.25) * 0.25;
                return Math.abs(startPosition - position16th) < tolerance;
            }
            if (Math.abs(duration - 4) < tolerance) {
                return Math.abs(startPosition - 0) < tolerance;
            }
            return false;
        },
        detectsCrossBeatsForCompound(startPosition, duration, allNotes, noteType = 'note', timeSignature) {
            const endPosition = startPosition + duration;
            const tolerance = 0.0001;
            const criticalBeats = this.getCriticalBeatsForCompound(allNotes, timeSignature);
            for (const beatPoint of criticalBeats) {
                if (startPosition < beatPoint - tolerance && endPosition > beatPoint + tolerance) {
                    if (noteType === 'note' && this.isNoteOnCorrespondingBeatForCompound(startPosition, duration, beatPoint, timeSignature)) {
                        if (this.isBeatPointAlreadyClear(startPosition, endPosition, beatPoint, allNotes, timeSignature)) {
                            continue;
                        }
                    }
                    if (this.isBeatPointAlreadyClear(startPosition, endPosition, beatPoint, allNotes, timeSignature)) {
                        continue;
                    }
                    return { crossesBeat: true, beatPoint, splitPositions: [beatPoint] };
                }
            }
            return { crossesBeat: false };
        },
        detectsCrossBeatsFor3_4(startPosition, duration, allNotes, noteType = 'note') {
            const endPosition = startPosition + duration;
            const tolerance = 0.0001;
            if (Math.abs(duration - 3) < tolerance && noteType === 'note') {
                return { crossesBeat: false };
            }
            const criticalBeats = this.getCriticalBeatsFor3_4(allNotes);
            for (const beatPoint of criticalBeats) {
                if (startPosition < beatPoint - tolerance && endPosition > beatPoint + tolerance) {
                    if (noteType === 'note' && this.isNoteOnCorrespondingBeatFor3_4(startPosition, duration, beatPoint)) {
                        continue;
                    }
                    if (this.isBeatPointAlreadyClear(startPosition, endPosition, beatPoint, allNotes, '3/4')) {
                        continue;
                    }
                    return { crossesBeat: true, beatPoint, splitPositions: [beatPoint] };
                }
            }
            return { crossesBeat: false };
        },
        detectsCrossBeatsGeneric(startPosition, duration, timeSignature, allNotes, noteType = 'note') {
            const endPosition = startPosition + duration;
            const tolerance = 0.0001;
            const validNotes = allNotes.filter(n => n && n.type === 'note' && !n.isTriplet && typeof n.beats === 'number');
            if (validNotes.length === 0) return { crossesBeat: false };
            const finestRhythm = Math.min(...validNotes.map(n => n.beats));
            const criticalBeats = this.getCriticalBeatsForFinestRhythm(finestRhythm, timeSignature);
            for (const beatPoint of criticalBeats) {
                if (startPosition < beatPoint - tolerance && endPosition > beatPoint + tolerance) {
                    return { crossesBeat: true, beatPoint, splitPositions: [beatPoint] };
                }
            }
            return { crossesBeat: false };
        },
        isNoteOnCorrespondingBeatForCompound(startPosition, duration, crossedBeatPoint, timeSignature) {
            const tolerance = 0.0001;
            const info = this.getCompoundInfo(timeSignature);
            if (!info) return false;
            if (Math.abs(duration - info.mainBeatLength) < tolerance) {
                return info.mainBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            }
            if (Math.abs(duration - 1) < tolerance) {
                const quarterBeats = [];
                for (let pos = 0; pos < info.measureBeats - 0.0001; pos += 1) {
                    quarterBeats.push(pos);
                }
                return quarterBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            }
            if (Math.abs(duration - 0.5) < tolerance) {
                const eighthBeats = [];
                for (let pos = 0; pos < info.measureBeats - 0.0001; pos += 0.5) {
                    eighthBeats.push(pos);
                }
                return eighthBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            }
            return false;
        },
        isNoteOnCorrespondingBeatFor3_4(startPosition, duration, crossedBeatPoint) {
            const tolerance = 0.0001;
            if (Math.abs(duration - 3) < tolerance) {
                return Math.abs(startPosition - 0) < tolerance;
            }
            if (Math.abs(duration - 2) < tolerance) {
                const halfBeats = [0, 1];
                return halfBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            }
            if (Math.abs(duration - 1) < tolerance) {
                const quarterBeats = [0, 1, 2];
                return quarterBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            }
            if (Math.abs(duration - 0.5) < tolerance) {
                const eighthBeats = [0, 0.5, 1, 1.5, 2, 2.5];
                return eighthBeats.some(beat => Math.abs(startPosition - beat) < tolerance);
            }
            return false;
        }
    };

    const TYPE_BY_TICKS = {
        [WHOLE_TICKS]: 'whole',
        [DOTTED_HALF_TICKS]: 'half',
        [HALF_TICKS]: 'half',
        [DOTTED_QUARTER_TICKS]: 'quarter',
        [QUARTER_TICKS]: 'quarter',
        [DOTTED_EIGHTH_TICKS]: 'eighth',
        [EIGHTH_TICKS]: 'eighth',
        [SIXTEENTH_TICKS]: '16th'
    };

    const DOTS_BY_TICKS = {
        [DOTTED_HALF_TICKS]: 1,
        [DOTTED_QUARTER_TICKS]: 1,
        [DOTTED_EIGHTH_TICKS]: 1
    };

    function buildOstinatoMeasures(settings, ostinato, voice) {
        const ticksPerBeat = divisions * (4 / settings.beatType);
        const stem = voice === 1 ? 'up' : 'down';
        const cycleMeasures = Math.max(1, normalizeOstinatoBars(ostinato.bars || ostinato.length || 1));
        const subdivision = normalizeOstinatoSubdivision(ostinato.subdivision || 1, settings.beatType);
        const stepsPerBar = settings.beats * subdivision;
        const stepsPerPattern = stepsPerBar * cycleMeasures;
        const stepTicks = ticksPerBeat / subdivision;
        const steps = Array.isArray(ostinato.steps) ? ostinato.steps.map(step => (step ? 1 : 0)) : [];
        const normalizedSteps = steps.length === stepsPerPattern
            ? steps
            : buildDefaultPattern(stepsPerPattern, subdivision);
        const useTriplet = subdivision === 3;
        const tripletType = stepTicks <= divisions / 4 ? '16th' : 'eighth';
        const baseType = TYPE_BY_TICKS[stepTicks] || (useTriplet ? tripletType : 'eighth');

        const measuresInCycle = [];
        for (let m = 0; m < cycleMeasures; m += 1) {
            const events = [];
            for (let s = 0; s < stepsPerBar; s += 1) {
                const stepIndex = m * stepsPerBar + s;
                const isOn = normalizedSteps[stepIndex] === 1;
                const tupletPos = s % subdivision;
                events.push({
                    duration: stepTicks,
                    type: baseType,
                    dots: 0,
                    voice,
                    stem,
                    rest: !isOn,
                    accent: false,
                    timeMod: useTriplet ? { actual: 3, normal: 2 } : null,
                    tuplet: useTriplet
                        ? (tupletPos === 0 ? 'start' : (tupletPos === subdivision - 1 ? 'stop' : null))
                        : null
                });
            }
            measuresInCycle.push(events);
        }

        const measures = [];
        for (let i = 0; i < settings.measures; i += 1) {
            const source = measuresInCycle[i % cycleMeasures] || [];
            measures.push(source.map(item => ({ ...item, voice, stem })));
        }
        return measures;
    }

    function splitEventByBeatRules(event, beats, startPosition, timeSignature, notesForRules) {
        const epsilon = 0.00001;
        if (beats <= epsilon) return [];
        const crossInfo = RHYTHM_NOTATION_RULES.detectsCrossBeatsWithLocalRhythm(
            startPosition,
            beats,
            timeSignature,
            notesForRules,
            event.rest ? 'rest' : 'note'
        );
        if (!crossInfo.crossesBeat) {
            return [{ beats }];
        }
        const splitPosition = crossInfo.splitPositions[0];
        const firstDuration = splitPosition - startPosition;
        const secondDuration = beats - firstDuration;
        if (firstDuration <= epsilon || secondDuration <= epsilon) {
            return [{ beats }];
        }
        return [
            ...splitEventByBeatRules(event, firstDuration, startPosition, timeSignature, notesForRules),
            ...splitEventByBeatRules(event, secondDuration, splitPosition, timeSignature, notesForRules)
        ];
    }

    function decomposeTicks(totalTicks) {
        const parts = [];
        let remaining = totalTicks;
        const ticksOptions = [
            WHOLE_TICKS,
            DOTTED_HALF_TICKS,
            HALF_TICKS,
            DOTTED_QUARTER_TICKS,
            QUARTER_TICKS,
            DOTTED_EIGHTH_TICKS,
            EIGHTH_TICKS,
            SIXTEENTH_TICKS
        ];
        const epsilon = 0.1;
        ticksOptions.forEach(ticks => {
            while (remaining >= ticks - epsilon) {
                parts.push(ticks);
                remaining -= ticks;
            }
        });
        if (remaining > epsilon) {
            parts.push(remaining);
        }
        return parts;
    }

    function beatsToRestSpec(beats) {
        const tolerance = 0.001;
        const spec = [
            { beats: 4, type: 'whole', dots: 0 },
            { beats: 3, type: 'half', dots: 1 },
            { beats: 2, type: 'half', dots: 0 },
            { beats: 1.5, type: 'quarter', dots: 1 },
            { beats: 1, type: 'quarter', dots: 0 },
            { beats: 0.75, type: 'eighth', dots: 1 },
            { beats: 0.5, type: 'eighth', dots: 0 },
            { beats: 0.25, type: '16th', dots: 0 }
        ];
        for (const item of spec) {
            if (Math.abs(beats - item.beats) <= tolerance) {
                return { ...item, ticks: Math.round(item.beats * divisions) };
            }
        }
        return null;
    }

    function beatsToNoteSpec(beats) {
        const tolerance = 0.001;
        const spec = [
            { beats: 4, type: 'whole', dots: 0 },
            { beats: 3, type: 'half', dots: 1 },
            { beats: 2, type: 'half', dots: 0 },
            { beats: 1.5, type: 'quarter', dots: 1 },
            { beats: 1, type: 'quarter', dots: 0 },
            { beats: 0.75, type: 'eighth', dots: 1 },
            { beats: 0.5, type: 'eighth', dots: 0 },
            { beats: 0.25, type: '16th', dots: 0 }
        ];
        for (const item of spec) {
            if (Math.abs(beats - item.beats) <= tolerance) {
                return { ...item, ticks: Math.round(item.beats * divisions) };
            }
        }
        return null;
    }

    function getRhythmKeyFromSpec(spec) {
        if (!spec) return null;
        return spec.dots ? `${spec.type}.` : spec.type;
    }

    function splitEventAtMultiplePoints(event, startPos, splitPoints) {
        if (!splitPoints.length) return [event];
        const segments = [];
        let currentStart = startPos;
        const totalBeats = event.duration / divisions;
        const tolerance = 0.0001;

        splitPoints.forEach((splitAt, index) => {
            const segmentBeats = splitAt - currentStart;
            if (segmentBeats > tolerance) {
                const segmentTicks = Math.round(segmentBeats * divisions);
                const type = TYPE_BY_TICKS[segmentTicks] || event.type;
                const dots = DOTS_BY_TICKS[segmentTicks] || event.dots || 0;
                segments.push({
                    ...event,
                    duration: segmentTicks,
                    type,
                    dots,
                    accent: !event.rest && event.accent && segments.length === 0,
                    timeMod: null,
                    tuplet: null,
                    beams: null,
                    tieType: event.rest ? null : (segments.length === 0 ? 'start' : 'continue')
                });
            }
            currentStart = splitAt;
        });

        const finalBeats = (startPos + totalBeats) - currentStart;
        if (finalBeats > tolerance) {
            const segmentTicks = Math.round(finalBeats * divisions);
            const type = TYPE_BY_TICKS[segmentTicks] || event.type;
            const dots = DOTS_BY_TICKS[segmentTicks] || event.dots || 0;
            segments.push({
                ...event,
                duration: segmentTicks,
                type,
                dots,
                accent: !event.rest && event.accent && segments.length === 0,
                timeMod: null,
                tuplet: null,
                beams: null,
                tieType: event.rest ? null : 'stop'
            });
        }

        return segments;
    }

    function applyCustomGroupingBeatClarityEvents(events, settings, measureIndex) {
        const timeSignature = `${settings.beats}/${settings.beatType}`;
        if (!timeSignature || isBuiltInTimeSignature(timeSignature)) return events;
        const parsed = parseTimeSignatureString(timeSignature);
        if (!parsed) return events;

        const unit = 4 / parsed.beatType;
        const isCompound = isCompoundTimeSignature(timeSignature);
        const groupSize = unit * (isCompound ? 3 : 1);
        if (!groupSize || !Number.isFinite(groupSize)) return events;

        const measureLength = parsed.beats * unit;
        const boundaries = [];
        for (let pos = groupSize; pos < measureLength - 0.0001; pos += groupSize) {
            boundaries.push(Math.round(pos * 10000) / 10000);
        }
        if (!boundaries.length) return events;

        const corrected = [];
        let currentPos = 0;
        const tolerance = 0.0001;

        events.forEach(event => {
            const beats = event.duration / divisions;
            const endPos = currentPos + beats;

            if (event.rest || event.timeMod) {
                corrected.push(event);
                currentPos = endPos;
                return;
            }

            const splitPoints = boundaries.filter(b => b > currentPos + tolerance && b < endPos - tolerance);
            if (!splitPoints.length) {
                corrected.push(event);
                currentPos = endPos;
                return;
            }

            const segments = splitEventAtMultiplePoints(event, currentPos, splitPoints);
            segments.forEach(segment => corrected.push(segment));
            currentPos = endPos;
        });

        return corrected;
    }

    function normalizeCustomTieTypes(events, timeSignature) {
        if (!timeSignature || isBuiltInTimeSignature(timeSignature)) return events;
        const normalized = [...events];
        let i = 0;
        let cleaned = 0;

        while (i < normalized.length) {
            const current = normalized[i];
            if (!current || current.rest || !current.tieType) {
                i += 1;
                continue;
            }

            const group = [current];
            let j = i + 1;
            while (j < normalized.length) {
                const next = normalized[j];
                if (!next || next.rest || !next.tieType) break;
                group.push(next);
                if (next.tieType === 'stop') {
                    j += 1;
                    break;
                }
                j += 1;
            }

            if (group.length > 1) {
                group.forEach((event, index) => {
                    event.tieType = index === 0 ? 'start' : index === group.length - 1 ? 'stop' : 'continue';
                });
            } else {
                current.tieType = null;
                cleaned += 1;
            }

            i = j;
        }

        if (cleaned > 0) {
            console.log(`🧹 自定义拍号tie规范化: 清理${cleaned}个孤立tie`);
        }

        return normalized;
    }

    function mergeCustomGroupingTiedEvents(events, settings, measureIndex) {
        const timeSignature = `${settings.beats}/${settings.beatType}`;
        if (!timeSignature || isBuiltInTimeSignature(timeSignature)) return events;
        const grouping = getCustomBeatGrouping(timeSignature, measureIndex);
        if (!grouping || !Array.isArray(grouping.starts)) return events;

        const boundaries = grouping.starts
            .slice(1)
            .map(pos => Math.round(pos * 10000) / 10000);
        const totalBeats = grouping.totalBeats;
        const tolerance = 0.0001;
        const merged = [];
        let i = 0;
        let currentPos = 0;
        const allowedRhythms = new Set(Array.isArray(settings.allowedRhythms) ? settings.allowedRhythms : []);

        const isAllowedDuration = (beats) => {
            const spec = beatsToNoteSpec(beats);
            if (!spec) return null;
            const key = getRhythmKeyFromSpec(spec);
            if (!key) return null;
            if (allowedRhythms.size === 0) return spec;
            return allowedRhythms.has(key) ? spec : null;
        };

        const isWithinSingleGroup = (startPos, endPos) => {
            if (!boundaries.length) return true;
            return !boundaries.some(boundary => boundary > startPos + tolerance && boundary < endPos - tolerance);
        };

        const mergeSegmentsWithinGroup = (segments) => {
            const output = [];
            let idx = 0;
            while (idx < segments.length) {
                let sum = 0;
                let bestEnd = null;
                let bestSpec = null;

                for (let end = idx; end < segments.length; end += 1) {
                    sum += segments[end].duration / divisions;
                    if (sum > totalBeats + tolerance) break;
                    const spec = end > idx ? isAllowedDuration(sum) : null;
                    if (spec) {
                        bestEnd = end;
                        bestSpec = spec;
                    }
                }

                if (bestEnd !== null && bestSpec) {
                    output.push({
                        ...segments[idx],
                        duration: bestSpec.ticks,
                        type: bestSpec.type,
                        dots: bestSpec.dots,
                        tieType: null
                    });
                    idx = bestEnd + 1;
                    continue;
                }

                output.push(segments[idx]);
                idx += 1;
            }
            return output;
        };

        while (i < events.length) {
            const current = events[i];

            if (!current || current.rest || current.tieType !== 'start') {
                merged.push(current);
                currentPos += current ? current.duration / divisions : 0;
                i += 1;
                continue;
            }

            const chain = [current];
            let j = i + 1;
            while (j < events.length) {
                const next = events[j];
                if (!next || next.rest || !next.tieType) break;
                chain.push(next);
                if (next.tieType === 'stop') {
                    j += 1;
                    break;
                }
                j += 1;
            }

            const chainStartPos = currentPos;
            const chainEndPos = chainStartPos + chain.reduce((acc, seg) => acc + seg.duration / divisions, 0);

            if (chain.length < 2) {
                merged.push(current);
                currentPos += current.duration / divisions;
                i += 1;
                continue;
            }

            if (!isWithinSingleGroup(chainStartPos, chainEndPos)) {
                let segmentPos = chainStartPos;
                let buffer = [];

                const flushBuffer = () => {
                    if (!buffer.length) return;
                    const mergedBuffer = mergeSegmentsWithinGroup(buffer);
                    mergedBuffer.forEach(event => merged.push(event));
                    buffer = [];
                };

                for (const segment of chain) {
                    const segmentEnd = segmentPos + segment.duration / divisions;
                    const crossesBoundary = boundaries.some(boundary =>
                        boundary > segmentPos + tolerance && boundary < segmentEnd - tolerance
                    );

                    if (crossesBoundary) {
                        flushBuffer();
                        merged.push(segment);
                        segmentPos = segmentEnd;
                        continue;
                    }

                    buffer.push(segment);

                    const hitsBoundary = boundaries.some(boundary => Math.abs(segmentEnd - boundary) < tolerance);
                    if (hitsBoundary) {
                        flushBuffer();
                    }
                    segmentPos = segmentEnd;
                }

                flushBuffer();
            } else {
                const mergedChain = mergeSegmentsWithinGroup(chain);
                mergedChain.forEach(event => merged.push(event));
            }

            currentPos = chainEndPos;
            i += chain.length;
        }

        return merged;
    }

    function buildRestEventFromBeats(beats, template) {
        const spec = beatsToRestSpec(beats);
        if (!spec) return null;
        return {
            duration: spec.ticks,
            type: spec.type,
            dots: spec.dots,
            voice: template.voice,
            stem: template.stem,
            rest: true,
            accent: false,
            timeMod: null,
            tuplet: null,
            beams: null,
            tieType: null
        };
    }

    function getBeatHierarchyForCompound(timeSignature) {
        const info = RHYTHM_NOTATION_RULES.getCompoundInfo(timeSignature);
        if (!info) return [];
        const measureBeats = info.measureBeats;
        const segments = [];
        for (let pos = 0; pos < measureBeats - 0.0001; pos += 0.25) {
            segments.push({ start: pos, end: pos + 0.25, type: 'sixteenth' });
        }
        for (let pos = 0; pos < measureBeats - 0.0001; pos += 0.5) {
            segments.push({ start: pos, end: pos + 0.5, type: 'eighth' });
        }
        for (let pos = 0; pos < measureBeats - 0.0001; pos += 1) {
            segments.push({ start: pos, end: pos + 1, type: 'quarter' });
        }
        for (let pos = 0; pos < measureBeats - 0.0001; pos += info.mainBeatLength) {
            segments.push({ start: pos, end: pos + info.mainBeatLength, type: 'dotted-quarter' });
        }
        return segments;
    }

    function spanMatchesHierarchy(start, end, timeSignature) {
        const tolerance = 0.0001;
        if (!RHYTHM_NOTATION_RULES.isCompoundTimeSignature(timeSignature)) return false;
        const info = RHYTHM_NOTATION_RULES.getCompoundInfo(timeSignature);
        if (!info) return false;
        const beatIndex = Math.floor((start + 0.0001) / info.mainBeatLength);
        const beatStart = beatIndex * info.mainBeatLength;
        const beatEnd = beatStart + info.mainBeatLength;
        if (start < beatStart - tolerance || end > beatEnd + tolerance) return false;
        const hierarchy = getBeatHierarchyForCompound(timeSignature);
        return hierarchy.some(segment => Math.abs(segment.start - start) < tolerance && Math.abs(segment.end - end) < tolerance);
    }

    function areAllEventsSameTypeInSpan(events, start, end, restFlag) {
        const tolerance = 0.0001;
        let currentPos = 0;
        for (const event of events) {
            const beats = event.duration / divisions;
            const noteStart = currentPos;
            const noteEnd = currentPos + beats;
            if (noteEnd > start + tolerance && noteStart < end - tolerance) {
                if (!!event.rest !== restFlag) {
                    return false;
                }
            }
            currentPos = noteEnd;
        }
        return true;
    }

    function canMergeSpan(start, end, events, timeSignature, restFlag, criticalBeats) {
        const tolerance = 0.0001;
        if (restFlag && spanMatchesHierarchy(start, end, timeSignature)) {
            if (areAllEventsSameTypeInSpan(events, start, end, restFlag)) {
                return true;
            }
        }
        for (const beatPoint of criticalBeats) {
            if (start < beatPoint - tolerance && end > beatPoint + tolerance) {
                return false;
            }
        }
        return true;
    }

    function mergeAdjacentEventsForCompound(events, settings) {
        const timeSignature = `${settings.beats}/${settings.beatType}`;
        if (!RHYTHM_NOTATION_RULES.isCompoundTimeSignature(timeSignature)) return events;
        const compoundInfo = RHYTHM_NOTATION_RULES.getCompoundInfo(timeSignature);
        if (!compoundInfo) return events;
        let merged = [...events];
        let changed = true;
        let iterations = 0;
        const maxIterations = 10;

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations += 1;
            let position = 0;
            const notesForRules = merged.map(event => ({
                type: event.rest ? 'rest' : 'note',
                beats: event.duration / divisions,
                isTriplet: Boolean(event.timeMod)
            }));
            const criticalBeats = RHYTHM_NOTATION_RULES.getCriticalBeatsWithLocalRhythm(notesForRules, timeSignature);

            for (let i = 0; i < merged.length - 1; i += 1) {
                const current = merged[i];
                const next = merged[i + 1];
                const beats = current.duration / divisions;

                if (current.timeMod || next.timeMod) {
                    position += beats;
                    continue;
                }
                if (current.rest !== next.rest) {
                    position += beats;
                    continue;
                }
                if (current.voice !== next.voice || current.stem !== next.stem) {
                    position += beats;
                    continue;
                }

                const totalBeats = (current.duration + next.duration) / divisions;
                const spec = current.rest ? beatsToRestSpec(totalBeats) : beatsToNoteSpec(totalBeats);
                if (!spec) {
                    position += beats;
                    continue;
                }

                const startPos = position;
                const endPos = startPos + totalBeats;
                const tol = 0.0001;
                const beatIndex = Math.floor((startPos + tol) / compoundInfo.mainBeatLength);
                const beatStart = beatIndex * compoundInfo.mainBeatLength;
                const beatEnd = beatStart + compoundInfo.mainBeatLength;
                const withinMainBeat = startPos >= beatStart - tol && endPos <= beatEnd + tol;
                const hasTie = !current.rest && (current.tieType || next.tieType);
                const allowWithinBeatMerge = withinMainBeat && (
                    current.rest
                    || hasTie
                    || (!current.rest && spanMatchesHierarchy(startPos, endPos, timeSignature)
                        && areAllEventsSameTypeInSpan(merged, startPos, endPos, false))
                );
                if (!allowWithinBeatMerge && !canMergeSpan(startPos, endPos, merged, timeSignature, current.rest, criticalBeats)) {
                    position += beats;
                    continue;
                }

                const mergedEvent = {
                    ...current,
                    duration: spec.ticks,
                    type: spec.type,
                    dots: spec.dots,
                    tieType: null,
                    beams: null,
                    timeMod: null,
                    tuplet: null
                };
                if (!current.rest) {
                    mergedEvent.accent = current.accent || next.accent;
                } else {
                    mergedEvent.accent = false;
                }
                merged.splice(i, 2, mergedEvent);
                changed = true;
                break;
            }
        }

        return merged;
    }

    function mergeAdjacentRestsInRegion(events, region) {
        let currentPos = 0;
        const regionNotes = [];
        const tolerance = 0.001;

        for (let i = 0; i < events.length; i += 1) {
            const event = events[i];
            const beats = event.duration / divisions;
            const noteStart = currentPos;
            const noteEnd = currentPos + beats;
            if (noteStart >= region.start - tolerance && noteStart < region.end - tolerance) {
                regionNotes.push({ index: i, event, start: noteStart, end: noteEnd });
            }
            currentPos = noteEnd;
        }

        if (regionNotes.length < 2) {
            return { hasChanges: false, notes: events };
        }

        const mergedNotes = [...events];
        for (let i = 0; i < regionNotes.length - 1; i += 1) {
            const current = regionNotes[i];
            const next = regionNotes[i + 1];
            if (current.event.rest && next.event.rest && Math.abs(current.end - next.start) < tolerance) {
                const totalBeats = (current.event.duration + next.event.duration) / divisions;
                const mergedRest = buildRestEventFromBeats(totalBeats, current.event);
                if (mergedRest) {
                    mergedNotes.splice(current.index, 2, mergedRest);
                    return { hasChanges: true, notes: mergedNotes };
                }
            }
        }

        return { hasChanges: false, notes: events };
    }

    function mergeAdjacentRestsInQuarterRegion(events, region) {
        let currentPos = 0;
        const regionNotes = [];
        const tolerance = 0.001;

        for (let i = 0; i < events.length; i += 1) {
            const event = events[i];
            const beats = event.duration / divisions;
            const noteStart = currentPos;
            const noteEnd = currentPos + beats;

            if (noteStart >= region.start - tolerance && noteEnd <= region.end + tolerance) {
                regionNotes.push({ index: i, event, start: noteStart, end: noteEnd });
            }

            currentPos = noteEnd;
        }

        if (regionNotes.length < 2) {
            return { hasChanges: false, notes: events };
        }

        for (let i = 0; i < regionNotes.length - 1; i += 1) {
            const current = regionNotes[i];
            const next = regionNotes[i + 1];
            if (current.event.rest && next.event.rest && Math.abs(current.end - next.start) < tolerance) {
                const totalBeats = (current.event.duration + next.event.duration) / divisions;
                const mergedRest = buildRestEventFromBeats(totalBeats, current.event);
                if (mergedRest) {
                    const mergedNotes = [...events];
                    mergedNotes.splice(current.index, 2, mergedRest);
                    return { hasChanges: true, notes: mergedNotes };
                }
            }
        }

        return { hasChanges: false, notes: events };
    }

    function mergeAdjacentRestsInQuarterBeats(events, timeSignature) {
        if (timeSignature !== '4/4') return events;

        const beatRegions = [
            { start: 0, end: 1, name: 'beat1' },
            { start: 1, end: 2, name: 'beat2' },
            { start: 2, end: 3, name: 'beat3' },
            { start: 3, end: 4, name: 'beat4' }
        ];

        let mergedNotes = [...events];
        let hasChanges = true;
        let iterations = 0;
        const maxIterations = 10;

        while (hasChanges && iterations < maxIterations) {
            hasChanges = false;
            iterations += 1;
            for (const region of beatRegions) {
                const regionResult = mergeAdjacentRestsInQuarterRegion(mergedNotes, region);
                if (regionResult.hasChanges) {
                    mergedNotes = regionResult.notes;
                    hasChanges = true;
                    break;
                }
            }
        }

        return mergedNotes;
    }

    function mergeAdjacentRestsInHalfBeats(events, timeSignature) {
        if (timeSignature !== '4/4') return events;
        const finestRhythm = Math.min(...events.map(event => event.duration / divisions));
        if (finestRhythm <= 0.25 + 0.0001) return events;

        const halfBeatRegions = [
            { start: 0, end: 2, name: 'firstHalf' },
            { start: 2, end: 4, name: 'secondHalf' }
        ];

        let mergedNotes = [...events];
        let hasChanges = true;
        let iterations = 0;
        const maxIterations = 5;

        while (hasChanges && iterations < maxIterations) {
            hasChanges = false;
            iterations += 1;
            for (const region of halfBeatRegions) {
                const regionResult = mergeAdjacentRestsInRegion(mergedNotes, region);
                if (regionResult.hasChanges) {
                    mergedNotes = regionResult.notes;
                    hasChanges = true;
                    break;
                }
            }
        }

        return mergedNotes;
    }

    function mergeAdjacentRestsForCustomGrouping(events, settings, measureIndex) {
        const timeSignature = `${settings.beats}/${settings.beatType}`;
        if (!timeSignature || isBuiltInTimeSignature(timeSignature)) return events;
        const grouping = getCustomBeatGrouping(timeSignature, measureIndex);
        if (!grouping || !Array.isArray(grouping.starts) || grouping.starts.length === 0) return events;

        const totalBeats = grouping.totalBeats;
        const groupStarts = grouping.starts.slice();
        const groupEnds = groupStarts.slice(1).concat([totalBeats]);
        const tolerance = 0.0001;

        let merged = [...events];
        let changed = true;
        let iterations = 0;
        const maxIterations = 10;

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations += 1;
            let position = 0;

            for (let i = 0; i < merged.length - 1; i += 1) {
                const current = merged[i];
                const beats = current.duration / divisions;
                const start = position;
                const end = start + beats;
                const next = merged[i + 1];

                if (current.rest && !current.timeMod && next && next.rest && !next.timeMod) {
                    const nextBeats = next.duration / divisions;
                    const nextEnd = end + nextBeats;
                    const groupIndex = groupEnds.findIndex(groupEnd => start < groupEnd - tolerance);
                    const groupEnd = groupIndex >= 0 ? groupEnds[groupIndex] : totalBeats;

                    if (nextEnd <= groupEnd + tolerance) {
                        const combinedBeats = beats + nextBeats;
                        const mergedRest = buildRestEventFromBeats(combinedBeats, current);
                        if (mergedRest) {
                            merged.splice(i, 2, mergedRest);
                            changed = true;
                            break;
                        }
                    }
                }

                position = end;
            }
        }

        return merged;
    }

    function mergeRestsByBeatsFor3_4(events) {
        const finestRhythm = Math.min(...events.map(event => event.duration / divisions));
        let beatRegions = [];

        if (finestRhythm <= 0.5) {
            beatRegions = [
                { start: 0, end: 2, duration: 2, name: 'beats1-2' },
                { start: 0, end: 1, duration: 1, name: 'beat1' },
                { start: 1, end: 2, duration: 1, name: 'beat2' },
                { start: 2, end: 3, duration: 1, name: 'beat3' }
            ];
        } else {
            beatRegions = [
                { start: 0, end: 3, duration: 3, name: 'wholeMeasure' },
                { start: 0, end: 2, duration: 2, name: 'beats1-2' },
                { start: 1, end: 3, duration: 2, name: 'beats2-3' },
                { start: 0, end: 1, duration: 1, name: 'beat1' },
                { start: 1, end: 2, duration: 1, name: 'beat2' },
                { start: 2, end: 3, duration: 1, name: 'beat3' }
            ];
        }

        let mergedNotes = [...events];
        let hasChanges = true;
        let iterations = 0;
        const maxIterations = 5;

        while (hasChanges && iterations < maxIterations) {
            hasChanges = false;
            iterations += 1;

            for (const region of beatRegions) {
                let currentPos = 0;
                const regionNotes = [];
                let regionStart = -1;
                let regionEnd = -1;

                for (let i = 0; i < mergedNotes.length; i += 1) {
                    const note = mergedNotes[i];
                    const beats = note.duration / divisions;
                    const noteEnd = currentPos + beats;
                    if (currentPos < region.end && noteEnd > region.start) {
                        if (regionStart === -1) regionStart = i;
                        regionEnd = i;
                        regionNotes.push({ note, index: i, startPos: currentPos });
                    }
                    currentPos += beats;
                }

                if (regionNotes.length > 1) {
                    const allRests = regionNotes.every(item => item.note.rest);
                    const totalDuration = regionNotes.reduce((sum, item) => sum + item.note.duration, 0) / divisions;
                    const durationMatches = Math.abs(totalDuration - region.duration) < 0.001;
                    if (allRests && durationMatches) {
                        const mergedRest = buildRestEventFromBeats(region.duration, regionNotes[0].note);
                        if (mergedRest) {
                            mergedNotes.splice(regionStart, regionEnd - regionStart + 1, mergedRest);
                            hasChanges = true;
                            break;
                        }
                    }
                }
            }
        }

        return mergedNotes;
    }

    function mergeRestsByBeats(events, timeSignature) {
        if (timeSignature === '3/4') {
            return mergeRestsByBeatsFor3_4(events);
        }
        if (timeSignature !== '4/4') return events;

        const finestRhythm = Math.min(...events.map(event => event.duration / divisions));
        const hasSixteenth = finestRhythm <= 0.25 + 0.0001;
        const beatRegions = [
            { start: 0, end: 1, duration: 1, name: 'beat1' },
            { start: 1, end: 2, duration: 1, name: 'beat2' },
            { start: 2, end: 3, duration: 1, name: 'beat3' },
            { start: 3, end: 4, duration: 1, name: 'beat4' }
        ];
        if (!hasSixteenth) {
            beatRegions.push(
                { start: 0, end: 2, duration: 2, name: 'firstHalf' },
                { start: 2, end: 4, duration: 2, name: 'secondHalf' }
            );
        }

        let mergedNotes = [...events];
        let hasChanges = true;
        let iterations = 0;
        const maxIterations = 10;

        while (hasChanges && iterations < maxIterations) {
            hasChanges = false;
            iterations += 1;

            for (const region of beatRegions) {
                let currentPos = 0;
                const regionNotes = [];
                let regionStart = -1;
                let regionEnd = -1;

                for (let i = 0; i < mergedNotes.length; i += 1) {
                    const note = mergedNotes[i];
                    const beats = note.duration / divisions;
                    const noteEnd = currentPos + beats;
                    if (currentPos >= region.start && noteEnd <= region.end + 0.001) {
                        if (regionStart === -1) regionStart = i;
                        regionEnd = i;
                        regionNotes.push({ note, index: i, startPos: currentPos });
                    }
                    currentPos += beats;
                }

                if (regionNotes.length > 1) {
                    const allRests = regionNotes.every(item => item.note.rest);
                    const totalDuration = regionNotes.reduce((sum, item) => sum + item.note.duration, 0) / divisions;
                    const durationMatches = Math.abs(totalDuration - region.duration) < 0.001;
                    if (allRests && durationMatches) {
                        const mergedRest = buildRestEventFromBeats(region.duration, regionNotes[0].note);
                        if (mergedRest) {
                            mergedNotes.splice(regionStart, regionEnd - regionStart + 1, mergedRest);
                            hasChanges = true;
                            break;
                        }
                    }
                }
            }
        }

        return mergedNotes;
    }

    function applyRestMergeRules(events, settings) {
        const timeSignature = `${settings.beats}/${settings.beatType}`;
        let merged = mergeRestsByBeats(events, timeSignature);
        merged = mergeAdjacentRestsInQuarterBeats(merged, timeSignature);
        merged = mergeAdjacentRestsInHalfBeats(merged, timeSignature);
        return merged;
    }

    function normalizeEventsForBeatClarity(events, settings, measureIndex) {
        const timeSignature = `${settings.beats}/${settings.beatType}`;
        const notesForRules = events.map(event => ({
            type: event.rest ? 'rest' : 'note',
            duration: event.type,
            beats: event.duration / divisions,
            isTriplet: Boolean(event.timeMod)
        }));
        const normalized = [];
        let position = 0;
        events.forEach(event => {
            const beats = event.duration / divisions;
            if (event.timeMod) {
                normalized.push({ ...event });
                position += beats;
                return;
            }
            const beatSegments = splitEventByBeatRules(event, beats, position, timeSignature, notesForRules);
            const decomposedTicks = [];
            beatSegments.forEach(segment => {
                const segmentTicks = Math.round(segment.beats * divisions);
                decomposedTicks.push(...decomposeTicks(segmentTicks));
            });
            const needsTie = !event.rest && decomposedTicks.length > 1;
            decomposedTicks.forEach((ticks, index) => {
                const type = TYPE_BY_TICKS[ticks] || event.type;
                const dots = DOTS_BY_TICKS[ticks] || 0;
                const tieType = needsTie
                    ? (index === 0 ? 'start' : index === decomposedTicks.length - 1 ? 'stop' : 'continue')
                    : null;
                normalized.push({
                    duration: ticks,
                    type,
                    dots,
                    voice: event.voice,
                    stem: event.stem,
                    rest: event.rest,
                    accent: !event.rest && event.accent && index === 0,
                    timeMod: null,
                    tuplet: null,
                    beams: null,
                    tieType: event.rest ? null : tieType
                });
            });
            position += beats;
        });
        let merged = applyRestMergeRules(normalized, settings);
        if (!isBuiltInTimeSignature(timeSignature)) {
            merged = applyCustomGroupingBeatClarityEvents(merged, settings, measureIndex || 0);
            merged = mergeAdjacentRestsForCustomGrouping(merged, settings, measureIndex || 0);
            merged = normalizeCustomTieTypes(merged, timeSignature);
            merged = mergeCustomGroupingTiedEvents(merged, settings, measureIndex || 0);
            merged = normalizeCustomTieTypes(merged, timeSignature);
            return merged;
        }
        merged = mergeAdjacentEventsForCompound(merged, settings);
        return merged;
    }

    function isBeamableEvent(event) {
        return !event.rest && (event.type === 'eighth' || event.type === '16th');
    }

    function applyCustomBeamingToMeasure(events, timeSignature) {
        const parsed = parseTimeSignatureString(timeSignature);
        if (!parsed) return;
        const unit = 4 / parsed.beatType;
        if (!unit || !Number.isFinite(unit)) return;
        const isCompound = isCompoundTimeSignature(timeSignature);
        const groupSize = unit * (isCompound ? 3 : 1);
        if (!groupSize || !Number.isFinite(groupSize)) return;

        const tolerance = 0.0001;
        const noteMeta = [];
        let position = 0;

        events.forEach((event, index) => {
            const beats = event.duration / divisions;
            const start = position;
            const end = start + beats;
            const beamLevel = event.type === '16th' ? 2 : event.type === 'eighth' ? 1 : 0;
            const isBeamable = !event.rest && !event.timeMod && beamLevel >= 1;
            event.beams = null;
            noteMeta.push({
                index,
                event,
                start,
                end,
                beamLevel,
                isBeamable
            });
            position = end;
        });

        let currentGroup = [];
        let currentGroupStart = null;

        const finalizeGroup = () => {
            if (currentGroup.length < 2) {
                currentGroup = [];
                return;
            }

            currentGroup.forEach((meta, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === currentGroup.length - 1;
                meta.event.beams = {
                    1: isFirst ? 'begin' : isLast ? 'end' : 'continue'
                };
            });

            if (isCompound && currentGroup.some(meta => meta.beamLevel >= 2)) {
                const subSize = unit;
                currentGroup.forEach((meta, idx) => {
                    if (meta.beamLevel < 2) return;
                    const localPos = meta.start - (currentGroupStart || 0);
                    const subGroup = Math.floor((localPos + tolerance) / subSize);
                    const prevMeta = idx > 0 ? currentGroup[idx - 1] : null;
                    const nextMeta = idx < currentGroup.length - 1 ? currentGroup[idx + 1] : null;
                    const prevIsSameSub = prevMeta && prevMeta.beamLevel >= 2 &&
                        Math.floor(((prevMeta.start - (currentGroupStart || 0)) + tolerance) / subSize) === subGroup;
                    const nextIsSameSub = nextMeta && nextMeta.beamLevel >= 2 &&
                        Math.floor(((nextMeta.start - (currentGroupStart || 0)) + tolerance) / subSize) === subGroup;
                    let beam2;
                    if (!prevIsSameSub && !nextIsSameSub) {
                        beam2 = 'backward hook';
                    } else if (!prevIsSameSub && nextIsSameSub) {
                        beam2 = 'begin';
                    } else if (prevIsSameSub && !nextIsSameSub) {
                        beam2 = 'end';
                    } else {
                        beam2 = 'continue';
                    }
                    if (!meta.event.beams) meta.event.beams = {};
                    meta.event.beams[2] = beam2;
                });
            }

            currentGroup = [];
        };

        noteMeta.forEach(meta => {
            const groupIndex = Math.floor((meta.start + tolerance) / groupSize);
            const groupStart = groupIndex * groupSize;

            if (currentGroupStart === null) {
                currentGroupStart = groupStart;
            }

            if (Math.abs(groupStart - currentGroupStart) > tolerance) {
                finalizeGroup();
                currentGroupStart = groupStart;
            }

            if (!meta.isBeamable) {
                finalizeGroup();
                return;
            }

            currentGroup.push(meta);
        });

        finalizeGroup();
    }

    function applyBeamingToMeasure(events, settings) {
        const timeSignature = `${settings.beats}/${settings.beatType}`;
        if (!isBuiltInTimeSignature(timeSignature)) {
            applyCustomBeamingToMeasure(events, timeSignature);
            return;
        }
        const ticksPerBeat = divisions * (4 / settings.beatType);
        const isCompound = settings.beatType === 8 && settings.beats % 3 === 0;
        const groupSize = isCompound ? ticksPerBeat * 3 : ticksPerBeat;
        const totalTicks = ticksPerBeat * settings.beats;
        let position = 0;
        let tupletId = 0;
        let activeTupletId = null;

        events.forEach(event => {
            event._pos = position;
            position += event.duration;
            if (event.timeMod) {
                if (event.tuplet === 'start') {
                    tupletId += 1;
                    activeTupletId = tupletId;
                }
                event._tupletId = activeTupletId ?? tupletId;
                if (event.tuplet === 'stop') {
                    activeTupletId = null;
                }
            } else {
                event._tupletId = null;
            }
            event.beams = null;
        });

        function assignBeamsToSequence(sequence) {
            if (sequence.length < 2) return;
            const hasSixteenth = sequence.some(note => note.type === '16th');
            sequence.forEach((note, index) => {
                const isFirst = index === 0;
                const isLast = index === sequence.length - 1;
                const beams = {};

                beams[1] = isFirst ? 'begin' : isLast ? 'end' : 'continue';

                if (hasSixteenth && note.type === '16th') {
                    const prev = sequence[index - 1];
                    const next = sequence[index + 1];
                    const prevSixteenth = prev && prev.type === '16th';
                    const nextSixteenth = next && next.type === '16th';
                    if (!prevSixteenth && nextSixteenth) {
                        beams[2] = 'begin';
                    } else if (prevSixteenth && nextSixteenth) {
                        beams[2] = 'continue';
                    } else if (prevSixteenth && !nextSixteenth) {
                        beams[2] = 'end';
                    } else {
                        beams[2] = 'backward hook';
                    }
                }

                note.beams = beams;
            });
        }

        for (let groupStart = 0; groupStart < totalTicks; groupStart += groupSize) {
            const groupEnd = groupStart + groupSize;
            const groupEvents = events.filter(event => event._pos >= groupStart && event._pos < groupEnd);
            let sequence = [];
            let sequenceTuplet = null;

            const flushSequence = () => {
                assignBeamsToSequence(sequence);
                sequence = [];
                sequenceTuplet = null;
            };

            groupEvents.forEach(event => {
                if (!isBeamableEvent(event)) {
                    flushSequence();
                    return;
                }
                const tupletKey = event._tupletId || null;
                if (sequence.length === 0) {
                    sequence.push(event);
                    sequenceTuplet = tupletKey;
                    return;
                }
                if (tupletKey !== sequenceTuplet) {
                    flushSequence();
                    sequence.push(event);
                    sequenceTuplet = tupletKey;
                    return;
                }
                sequence.push(event);
            });

            flushSequence();
        }

        events.forEach(event => {
            delete event._pos;
            delete event._tupletId;
        });
    }

    function buildMusicXml(settings, voices) {
        const ticksPerBeat = divisions * (4 / settings.beatType);
        const measureTicks = ticksPerBeat * settings.beats;
        let xml = '';
        const useTwoVoiceStaff = voices.length > 1;
        xml += '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">';
        xml += '<score-partwise version="3.1">';
        xml += '<part-list>';
        xml += '<score-part id="P1">';
        xml += '<part-name>Rhythm</part-name>';
        xml += '<score-instrument id="P1-I1"><instrument-name>Percussion</instrument-name></score-instrument>';
        xml += '<midi-instrument id="P1-I1"><midi-channel>10</midi-channel><midi-unpitched>39</midi-unpitched></midi-instrument>';
        xml += '</score-part>';
        xml += '</part-list>';
        xml += '<part id="P1">';

        for (let measureIndex = 0; measureIndex < settings.measures; measureIndex += 1) {
            xml += `<measure number="${measureIndex + 1}">`;
            if (settings.measures > 4 && measureIndex > 0 && measureIndex % 4 === 0) {
                xml += '<print new-system="yes"/>';
            }
            if (measureIndex === 0) {
                xml += '<attributes>';
                xml += `<divisions>${divisions}</divisions>`;
                xml += `<time><beats>${settings.beats}</beats><beat-type>${settings.beatType}</beat-type></time>`;
                xml += `<clef><sign>percussion</sign><line>${useTwoVoiceStaff ? 3 : 1}</line></clef>`;
                xml += `<staff-details><staff-lines>${useTwoVoiceStaff ? 5 : 1}</staff-lines></staff-details>`;
                xml += '</attributes>';
            }

            voices.forEach((voiceMeasures, voiceIndex) => {
                const voiceNumber = voiceIndex + 1;
                const events = normalizeEventsForBeatClarity(voiceMeasures[measureIndex] || [], settings, measureIndex);
                applyBeamingToMeasure(events, settings);
                const useSingleVoiceLayout = voices.length === 1 && voiceNumber === 1;
                const display = useSingleVoiceLayout
                    ? { step: 'E', octave: '4' }
                    : (voiceNumber === 1 ? { step: 'C', octave: '5' } : { step: 'F', octave: '4' });
                events.forEach(event => {
                    xml += '<note>';
                    if (event.rest) {
                        xml += `<rest><display-step>${display.step}</display-step><display-octave>${display.octave}</display-octave></rest>`;
                    } else {
                        xml += `<unpitched><display-step>${display.step}</display-step><display-octave>${display.octave}</display-octave></unpitched>`;
                        xml += '<instrument id="P1-I1"/>';
                    }
                    xml += `<duration>${event.duration}</duration>`;
                    xml += `<voice>${voiceNumber}</voice>`;
                    xml += `<type>${event.type}</type>`;
                    if (!event.rest && event.tieType) {
                        if (event.tieType === 'continue') {
                            xml += '<tie type="stop"/><tie type="start"/>';
                        } else {
                            xml += `<tie type="${event.tieType}"/>`;
                        }
                    }
                    if (event.dots) {
                        for (let i = 0; i < event.dots; i += 1) {
                            xml += '<dot/>';
                        }
                    }
                    if (event.timeMod) {
                        xml += '<time-modification>';
                        xml += `<actual-notes>${event.timeMod.actual}</actual-notes>`;
                        xml += `<normal-notes>${event.timeMod.normal}</normal-notes>`;
                        xml += '</time-modification>';
                    }
                    if (!event.rest) {
                        xml += `<stem>${event.stem}</stem>`;
                    }
                    if (!event.rest && event.beams) {
                        Object.keys(event.beams).forEach(level => {
                            xml += `<beam number="${level}">${event.beams[level]}</beam>`;
                        });
                    }
                    if ((!event.rest && event.accent) || event.tuplet || (!event.rest && event.tieType)) {
                        xml += '<notations>';
                        if (!event.rest && event.accent) {
                            xml += '<articulations><accent/></articulations>';
                        }
                        if (!event.rest && event.tieType) {
                            if (event.tieType === 'continue') {
                                xml += '<tied type="stop"/><tied type="start"/>';
                            } else {
                                xml += `<tied type="${event.tieType}"/>`;
                            }
                        }
                        if (event.tuplet) {
                            xml += `<tuplet type="${event.tuplet}"/>`;
                        }
                        xml += '</notations>';
                    }
                    xml += '</note>';
                });

                if (voiceIndex === 0 && voices.length > 1) {
                    xml += `<backup><duration>${measureTicks}</duration></backup>`;
                }
            });

            if (measureIndex === settings.measures - 1) {
                xml += '<barline location="right"><bar-style>light-heavy</bar-style></barline>';
            }

            xml += '</measure>';
        }

        xml += '</part>';
        xml += '</score-partwise>';
        return xml;
    }

    function countMeasuresFromXml(xml) {
        if (!xml) return 0;
        const matches = xml.match(/<measure\b/g);
        return matches ? matches.length : 0;
    }

    function applySystemLayout(osmd, xml) {
        if (!osmd || !osmd.EngravingRules) return;
        const totalMeasures = state.lastSettings?.measures || countMeasuresFromXml(xml);
        if (!totalMeasures) return;
        const measuresPerSystem = totalMeasures <= 4 ? totalMeasures : 4;

        if ('MaxMeasuresPerSystem' in osmd.EngravingRules) {
            osmd.EngravingRules.MaxMeasuresPerSystem = measuresPerSystem;
        }
        if ('MinMeasuresPerSystem' in osmd.EngravingRules) {
            osmd.EngravingRules.MinMeasuresPerSystem = measuresPerSystem;
        }
        if ('RenderXMeasuresPerLineAkaSystem' in osmd.EngravingRules) {
            osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = measuresPerSystem;
        }
        if ('CompactMode' in osmd.EngravingRules) {
            osmd.EngravingRules.CompactMode = totalMeasures > 4;
        }
        if ('PageLeftMargin' in osmd.EngravingRules) {
            osmd.EngravingRules.PageLeftMargin = 6;
        }
        if ('PageRightMargin' in osmd.EngravingRules) {
            osmd.EngravingRules.PageRightMargin = 6;
        }
        if ('SystemLeftMargin' in osmd.EngravingRules) {
            osmd.EngravingRules.SystemLeftMargin = 4;
        }
        if ('SystemRightMargin' in osmd.EngravingRules) {
            osmd.EngravingRules.SystemRightMargin = 4;
        }
        if ('BetweenMeasuresDistance' in osmd.EngravingRules) {
            osmd.EngravingRules.BetweenMeasuresDistance = 15;
        }
        if ('StretchLastSystemLine' in osmd.EngravingRules) {
            osmd.EngravingRules.StretchLastSystemLine = true;
        }
        if ('NewSystemAtXMLNewSystem' in osmd.EngravingRules) {
            osmd.EngravingRules.NewSystemAtXMLNewSystem = true;
        }
        if ('NewSystemFromXMLNewSystemAttribute' in osmd.EngravingRules) {
            osmd.EngravingRules.NewSystemFromXMLNewSystemAttribute = true;
        }
        if ('NewSystemAtXMLNewSystemAttribute' in osmd.EngravingRules) {
            osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        }
    }

    function alignSingleLineRests() {
        if (state.restAlignLock) return;
        if (state.useFiveLineStaff) return;
        const container = document.getElementById('score');
        if (!container) return;
        const svg = container.querySelector('svg');
        if (!svg) {
            if ((state.restAlignAttempts || 0) < 3) {
                state.restAlignAttempts = (state.restAlignAttempts || 0) + 1;
                setTimeout(alignSingleLineRests, 100);
            }
            return;
        }

        state.restAlignLock = true;
        try {
        const noteheadCenters = [];
        const noteheadHeights = [];
        const allNoteheadHeights = [];

        // Use stemmed noteheads to estimate baseline notehead height so we can
        // distinguish rest glyphs from stemless whole notes.
        const stavenotesForHeight = Array.from(svg.querySelectorAll('g.vf-stavenote'));
        stavenotesForHeight.forEach(group => {
            const hasStem = group.querySelector('.vf-stem');
            if (!hasStem) return;
            const notehead = group.querySelector('[class*="notehead"], [class*="NoteHead"]');
            if (!notehead) return;
            try {
                const bbox = notehead.getBBox();
                if (bbox && Number.isFinite(bbox.height)) {
                    noteheadHeights.push(bbox.height);
                }
            } catch (e) {
                return;
            }
        });
        let baselineHeight = noteheadHeights.length
            ? noteheadHeights.sort((a, b) => a - b)[Math.floor(noteheadHeights.length / 2)]
            : null;
        if (!baselineHeight && allNoteheadHeights.length) {
            baselineHeight = allNoteheadHeights.sort((a, b) => a - b)[0];
        }
        const restHeightThreshold = baselineHeight ? baselineHeight * 1.25 : null;

        const restGroups = new Set();
        const xmlRestIndices = (() => {
            try {
                if (!window.__rhythmLastXml) return null;
                const doc = new DOMParser().parseFromString(window.__rhythmLastXml, 'application/xml');
                const notes = Array.from(doc.querySelectorAll('part > measure > note'));
                if (!notes.length) return null;
                const indices = [];
                notes.forEach((note, index) => {
                    if (note.querySelector('rest')) indices.push(index);
                });
                return indices;
            } catch (e) {
                return null;
            }
        })();
        const restIndexSet = xmlRestIndices ? new Set(xmlRestIndices) : null;

        const stavenotes = Array.from(svg.querySelectorAll('g.vf-stavenote'));
        stavenotes.forEach((group, index) => {
            if (restIndexSet && restIndexSet.has(index)) return;
            const notehead = group.querySelector('[class*="notehead"], [class*="NoteHead"]');
            if (!notehead) return;
            try {
                const bbox = notehead.getBBox();
                if (!bbox || !Number.isFinite(bbox.y)) return;
                noteheadCenters.push(bbox.y + bbox.height / 2);
                if (Number.isFinite(bbox.height)) {
                    allNoteheadHeights.push(bbox.height);
                }
            } catch (e) {
                return;
            }
        });

        const lineYs = [];
        if (!noteheadCenters.length) {
            const lineSegments = Array.from(svg.querySelectorAll('path, rect, line'))
                .map(el => {
                    try {
                        const bbox = el.getBBox();
                        if (bbox.height <= 2.5 && bbox.width > 50) {
                            return bbox;
                        }
                    } catch (e) {
                        return null;
                    }
                    return null;
                })
                .filter(Boolean);

            lineSegments.forEach(segment => {
                const y = segment.y;
                const exists = lineYs.some(existing => Math.abs(existing - y) < 0.75);
                if (!exists) lineYs.push(y);
            });
        }

        const rowTargets = [];
        const clusterValues = (values, threshold) => {
            const clusters = [];
            values
                .filter(value => Number.isFinite(value))
                .sort((a, b) => a - b)
                .forEach(value => {
                    const last = clusters[clusters.length - 1];
                    if (!last || Math.abs(last.center - value) > threshold) {
                        clusters.push({ center: value, values: [value] });
                    } else {
                        last.values.push(value);
                        last.center = last.values.reduce((sum, v) => sum + v, 0) / last.values.length;
                    }
                });
            return clusters.map(cluster => {
                const sorted = cluster.values.slice().sort((a, b) => a - b);
                return sorted[Math.floor(sorted.length / 2)];
            });
        };

        if (lineYs.length) {
            rowTargets.push(...clusterValues(lineYs, 8));
        } else if (noteheadCenters.length) {
            rowTargets.push(...clusterValues(noteheadCenters, 25));
        }

        let targetY = null;
        if (noteheadCenters.length) {
            noteheadCenters.sort((a, b) => a - b);
            targetY = noteheadCenters[Math.floor(noteheadCenters.length / 2)];
        } else if (lineYs.length) {
            lineYs.sort((a, b) => a - b);
            targetY = lineYs[Math.floor(lineYs.length / 2)];
        }

        if (targetY === null && rowTargets.length === 0) {
            if ((state.restAlignAttempts || 0) < 3) {
                state.restAlignAttempts = (state.restAlignAttempts || 0) + 1;
                setTimeout(alignSingleLineRests, 100);
            }
            return;
        }

        const restMarks = Array.from(svg.querySelectorAll('[class*="rest"], [class*="Rest"]'));
        restMarks.forEach(el => {
            let node = el;
            while (node && node !== svg) {
                if (node.tagName && node.tagName.toLowerCase() === 'g') {
                    restGroups.add(node);
                    break;
                }
                node = node.parentNode;
            }
        });

        if (xmlRestIndices && stavenotes.length) {
            xmlRestIndices.forEach(index => {
                const group = stavenotes[index];
                if (group) restGroups.add(group);
            });
        }
        stavenotes.forEach(group => {
            const hasRestMark = group.querySelector('[class*="rest"], [class*="Rest"]');
            const hasNotehead = group.querySelector('[class*="notehead"], [class*="NoteHead"]');
            if (hasRestMark || !hasNotehead) {
                restGroups.add(group);
                return;
            }

            if (restHeightThreshold && !group.querySelector('.vf-stem') && !group.querySelector('.vf-flag')) {
                const notehead = group.querySelector('[class*="notehead"], [class*="NoteHead"]');
                if (notehead) {
                    try {
                        const bbox = notehead.getBBox();
                        if (bbox && Number.isFinite(bbox.height) && bbox.height > restHeightThreshold) {
                            restGroups.add(group);
                        }
                    } catch (e) {
                        return;
                    }
                }
            }
        });

        const rests = Array.from(restGroups).filter(group => group.querySelector('[class*="rest"], [class*="Rest"]') || group.classList.contains('vf-stavenote'));
        rests.forEach(rest => {
            const baseTransformAttr = rest.getAttribute('data-rest-base-transform');
            if (baseTransformAttr === null) {
                rest.setAttribute('data-rest-base-transform', rest.getAttribute('transform') || '');
            }
            const baseTransform = rest.getAttribute('data-rest-base-transform') || '';
            if (rest.getAttribute('transform') !== baseTransform) {
                rest.setAttribute('transform', baseTransform);
            }

            let bbox;
            try {
                bbox = rest.getBBox();
            } catch (e) {
                return;
            }
            if (!bbox || !Number.isFinite(bbox.y)) return;

            const centerY = bbox.y + bbox.height / 2;
            let desiredY = targetY;
            if (rowTargets.length) {
                desiredY = rowTargets.reduce((closest, rowY) => {
                    if (closest === null) return rowY;
                    return Math.abs(rowY - centerY) < Math.abs(closest - centerY) ? rowY : closest;
                }, null);
            }
            if (!Number.isFinite(desiredY)) return;
            const shiftY = desiredY - centerY;
            if (Math.abs(shiftY) < 0.25) return;
            const shift = Number.isFinite(shiftY) ? shiftY.toFixed(2) : '0';
            const nextTransform = baseTransform
                ? `${baseTransform} translate(0 ${shift})`
                : `translate(0 ${shift})`;
            rest.setAttribute('transform', nextTransform);
        });

        state.restAlignAttempts = 0;
        } finally {
            state.restAlignLock = false;
        }
    }

    function scheduleRestAlignment() {
        if (state.useFiveLineStaff) return;
        const delays = [0, 120, 300, 600];
        delays.forEach(delay => {
            setTimeout(() => {
                alignSingleLineRests();
            }, delay);
        });

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                alignSingleLineRests();
            }).catch(() => {});
        }
    }

    function drawBeatCenterLines() {
        const container = document.getElementById('score');
        if (!container) return;
        const svg = container.querySelector('svg');
        if (!svg) {
            if ((state.beatCenterAttempts || 0) < 3) {
                state.beatCenterAttempts = (state.beatCenterAttempts || 0) + 1;
                setTimeout(drawBeatCenterLines, 100);
            }
            return;
        }
        const existing = svg.querySelector('#beatCenterLineLayer');
        if (existing) existing.remove();

        const barlineRects = Array.from(svg.querySelectorAll('rect')).filter(rect => {
            const width = parseFloat(rect.getAttribute('width') || '0');
            const height = parseFloat(rect.getAttribute('height') || '0');
            return width > 0 && width <= 2 && height >= 12;
        });

        if (!barlineRects.length) {
            if ((state.beatCenterAttempts || 0) < 3) {
                state.beatCenterAttempts = (state.beatCenterAttempts || 0) + 1;
                setTimeout(drawBeatCenterLines, 100);
            }
            drawFiveLineStaffOverlay(svg, new Map());
            state.beatCenterAttempts = 0;
            return;
        }

        const rowGroups = new Map();
        barlineRects.forEach(rect => {
            const y = parseFloat(rect.getAttribute('y') || '0');
            const height = parseFloat(rect.getAttribute('height') || '0');
            const key = `${Math.round(y)}:${Math.round(height)}`;
            if (!rowGroups.has(key)) {
                rowGroups.set(key, { y, height, rects: [] });
            }
            rowGroups.get(key).rects.push(rect);
        });

        drawFiveLineStaffOverlay(svg, rowGroups);
        state.beatCenterAttempts = 0;

        const enableBeatCenters = false;
        if (!enableBeatCenters) {
            return;
        }

        const svgNS = 'http://www.w3.org/2000/svg';
        const layer = document.createElementNS(svgNS, 'g');
        layer.setAttribute('id', 'beatCenterLineLayer');
        layer.setAttribute('class', 'beat-center-lines');
        svg.appendChild(layer);

        const candidates = Array.from(
            svg.querySelectorAll('g.vf-notehead, g.vf-clef, g.vf-timesignature, g.vf-stavenote, g.vf-rest')
        );

        const seen = new Set();
        rowGroups.forEach(row => {
            const barXs = row.rects
                .map(rect => parseFloat(rect.getAttribute('x') || '0'))
                .filter(value => Number.isFinite(value))
                .sort((a, b) => a - b);
            if (!barXs.length) return;

            let minX = Infinity;
            candidates.forEach(el => {
                if (!el.getBBox) return;
                const bbox = el.getBBox();
                if (!bbox) return;
                const overlaps = bbox.y + bbox.height >= row.y && bbox.y <= row.y + row.height;
                if (overlaps && bbox.x < minX) {
                    minX = bbox.x;
                }
            });
            if (!Number.isFinite(minX)) {
                minX = barXs[0] - (barXs[1] ? (barXs[1] - barXs[0]) : 100);
            }

            const centers = [];
            centers.push((minX + barXs[0]) / 2);
            for (let i = 1; i < barXs.length; i += 1) {
                centers.push((barXs[i - 1] + barXs[i]) / 2);
            }

            centers.forEach(centerX => {
                const key = `${Math.round(centerX)}:${Math.round(row.y)}`;
                if (seen.has(key)) return;
                seen.add(key);
                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', centerX);
                line.setAttribute('x2', centerX);
                line.setAttribute('y1', row.y);
                line.setAttribute('y2', row.y + row.height);
                line.setAttribute('class', 'beat-center-line');
                layer.appendChild(line);
            });
        });
    }

    function drawFiveLineStaffOverlay(svg, rowGroups) {
        const existing = svg.querySelector('#fiveLineStaffLayer');
        if (existing) existing.remove();
        if (!state.useFiveLineStaff) return;

        const svgNS = 'http://www.w3.org/2000/svg';
        const layer = document.createElementNS(svgNS, 'g');
        layer.setAttribute('id', 'fiveLineStaffLayer');
        layer.setAttribute('class', 'five-line-staff-lines');
        svg.insertBefore(layer, svg.firstChild);

        const lineSegments = Array.from(svg.querySelectorAll('path, rect, line'))
            .map(el => {
                try {
                    const bbox = el.getBBox();
                    if (bbox.height <= 1 && bbox.width > 50) {
                        return { x: bbox.x, y: bbox.y, width: bbox.width };
                    }
                } catch (e) {
                    return null;
                }
                return null;
            })
            .filter(Boolean);

        if (!lineSegments.length) return;

        const rowLookup = Array.from(rowGroups.values()).map(row => ({
            center: row.y + row.height / 2,
            height: row.height
        }));

        const lineGroups = new Map();
        lineSegments.forEach(segment => {
            const key = Math.round(segment.y);
            if (!lineGroups.has(key)) lineGroups.set(key, []);
            lineGroups.get(key).push(segment);
        });

        lineGroups.forEach((segments, key) => {
            const centerY = Number(key);
            let spacing = 10;
            const row = rowLookup.reduce((closest, item) => {
                if (!closest) return item;
                return Math.abs(item.center - centerY) < Math.abs(closest.center - centerY) ? item : closest;
            }, null);
            if (row && row.height) {
                spacing = row.height / 4;
            }

            const offsets = [-2, -1, 1, 2];
            segments.forEach(segment => {
                offsets.forEach(multiplier => {
                    const y = centerY + multiplier * spacing;
                    const line = document.createElementNS(svgNS, 'line');
                    line.setAttribute('x1', segment.x);
                    line.setAttribute('x2', segment.x + segment.width);
                    line.setAttribute('y1', y);
                    line.setAttribute('y2', y);
                    line.setAttribute('class', 'five-line-staff-line');
                    layer.appendChild(line);
                });
            });
        });
    }

    async function renderScore(xml) {
        const container = document.getElementById('score');
        if (!container || !window.opensheetmusicdisplay) return;
        if (!state.osmd) {
            container.innerHTML = '';
            state.osmd = new window.opensheetmusicdisplay.OpenSheetMusicDisplay(container, {
                autoResize: true,
                drawTitle: false,
                drawSubtitle: false,
                drawComposer: false,
                drawPartNames: false,
                drawMeasureNumbers: false
            });
            window.__rhythmOsmd = state.osmd;
        }
        applySystemLayout(state.osmd, xml);
        await state.osmd.load(xml);
        applySystemLayout(state.osmd, xml);
        state.osmd.render();
        state.useFiveLineStaff = xml.includes('<staff-lines>5</staff-lines>');
        state.beatCenterAttempts = 0;
        state.restAlignAttempts = 0;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            drawBeatCenterLines();
            scheduleRestAlignment();
        }));
    }

    function pushHistory(xml, voices, settings) {
        if (currentHistoryIndex < rhythmHistory.length - 1) {
            rhythmHistory.splice(currentHistoryIndex + 1);
        }
        rhythmHistory.push({ xml, voices, settings });
        if (rhythmHistory.length > maxHistory) {
            rhythmHistory.shift();
        }
        currentHistoryIndex = rhythmHistory.length - 1;
    }

    function renderHistory(index) {
        const entry = rhythmHistory[index];
        if (!entry) return;
        stopPlayback();
        currentHistoryIndex = index;
        window.__rhythmLastXml = entry.xml;
        if (entry.voices) state.lastVoices = entry.voices;
        if (entry.settings) state.lastSettings = entry.settings;
        renderScore(entry.xml).catch(err => console.error('OSMD render error', err));
    }

    function triggerGenerate() {
        if (typeof window.generateMelody === 'function') {
            return window.generateMelody();
        }
        if (typeof window.generateIntervals === 'function') {
            return window.generateIntervals();
        }
        return generateRhythm();
    }

    function generateRhythm() {
        stopPlayback();
        const settings = getSettings();
        state.lastSettings = settings;
        const ostinato = settings.ostinato || { voice: 'none' };
        const useOstinato = settings.voiceMode > 1 && ostinato.voice && ostinato.voice !== 'none';
        const primaryMeasures = useOstinato && String(ostinato.voice) === '1'
            ? buildOstinatoMeasures(settings, ostinato, 1)
            : buildMeasures(settings, settings.density, 1);
        const voices = [primaryMeasures];
        if (settings.voiceMode > 1) {
            const secondaryMeasures = useOstinato && String(ostinato.voice) === '2'
                ? buildOstinatoMeasures(settings, ostinato, 2)
                : buildMeasures(settings, settings.secondaryDensity, 2);
            voices.push(secondaryMeasures);
        }
        state.lastVoices = voices;
        const xml = buildMusicXml(settings, voices);
        window.__rhythmLastXml = xml;
        pushHistory(xml, voices, settings);
        renderScore(xml).catch(err => console.error('OSMD render error', err));
    }

    if (!window.generateMelody) {
        window.generateMelody = generateRhythm;
    }

    if (!window.generateIntervals) {
        window.generateIntervals = function(...args) {
            if (typeof window.generateMelody === 'function') {
                return window.generateMelody(...args);
            }
            return generateRhythm(...args);
        };
    }

    function previousRhythm() {
        if (currentHistoryIndex > 0) {
            renderHistory(currentHistoryIndex - 1);
        }
    }

    function nextRhythm() {
        if (currentHistoryIndex < rhythmHistory.length - 1) {
            renderHistory(currentHistoryIndex + 1);
        }
    }

    function loadPracticeCount() {
        const el = document.getElementById('practiceCountValue');
        if (!el) return 0;
        const value = parseInt(el.textContent || '0', 10);
        return Number.isFinite(value) ? Math.max(0, value) : 0;
    }

    function updatePracticeCountDisplay(value) {
        const el = document.getElementById('practiceCountValue');
        if (el) {
            el.textContent = String(Math.max(0, value));
        }
    }

    function incrementPracticeCount() {
        updatePracticeCountDisplay(loadPracticeCount() + 1);
    }

    function decrementPracticeCount() {
        updatePracticeCountDisplay(loadPracticeCount() - 1);
    }

    function initAudioContext() {
        if (!state.metronome.audioCtx) {
            state.metronome.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function getRhythmAudioContext() {
        initAudioContext();
        const ctx = state.metronome.audioCtx;
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(()=>{});
        }
        return ctx;
    }

    function ensurePlaybackContext() {
        const ctx = getRhythmAudioContext();
        state.playback.audioCtx = ctx;
        return ctx;
    }

    function getPlaybackOutputGain(ctx) {
        if (!ctx) return null;
        if (state.playback.outputGain && state.playback.outputGain.context === ctx) {
            return state.playback.outputGain;
        }
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1, ctx.currentTime);
        gain.connect(ctx.destination);
        state.playback.outputGain = gain;
        return gain;
    }

    function getMetronomeOutputGain(ctx) {
        if (!ctx) return null;
        if (state.metronome.outputGain && state.metronome.outputGain.context === ctx) {
            return state.metronome.outputGain;
        }
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1, ctx.currentTime);
        gain.connect(ctx.destination);
        state.metronome.outputGain = gain;
        return gain;
    }

    function muteAudioGain(gain, ctx) {
        if (!gain || !ctx) return;
        const now = ctx.currentTime;
        try {
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value || 0.0001), now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01);
        } catch (_) {
            // ignore gain cancellation errors
        }
    }

    function ensureAudioGain(gain, ctx) {
        if (!gain || !ctx) return;
        const now = ctx.currentTime;
        try {
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(1, now);
        } catch (_) {
            // ignore gain restore errors
        }
    }

    function getCurrentTempo() {
        const bpmInput = document.getElementById('metronomeBpm');
        const tempo = Math.max(1, parseInt(bpmInput?.value || '80', 10) || 80);
        return tempo;
    }

    function getMetronomeBeatDuration(tempo) {
        const patternInfo = getMetronomePatternInfo(tempo);
        const subdivision = patternInfo.usePattern ? patternInfo.subdivision : 1;
        const stepDuration = patternInfo.stepDuration || (60 / tempo);
        return stepDuration * subdivision;
    }

    function readCalibrationPreference() {
        try {
            const raw = localStorage.getItem(calibrationStorageKey);
            return raw === '1' || raw === 'true';
        } catch (_) {
            return false;
        }
    }

    function writeCalibrationPreference(enabled) {
        try { localStorage.setItem(calibrationStorageKey, enabled ? '1' : '0'); } catch (_) {}
    }

    function updateCalibrationHint() {
        const hint = document.getElementById('calibrationHint');
        if (!hint) return;
        hint.style.display = state.calibration.enabled ? 'block' : 'none';
    }

    function updateCalibrationToggleUI() {
        const toggle = document.getElementById('rhythmCalibrationToggle');
        if (!toggle) return;
        toggle.checked = !!state.calibration.enabled;
    }

    function ensurePlaybackCountInLabel() {
        const score = document.getElementById('score');
        if (!score) return null;
        let label = document.getElementById('playbackCountInLabel');
        if (!label) {
            label = document.createElement('div');
            label.id = 'playbackCountInLabel';
            label.style.position = 'absolute';
            label.style.top = '8px';
            label.style.left = '50%';
            label.style.transform = 'translateX(-50%)';
            label.style.fontSize = '18px';
            label.style.fontWeight = '700';
            label.style.color = 'var(--text-color)';
            label.style.background = 'rgba(0,0,0,0.05)';
            label.style.padding = '4px 10px';
            label.style.borderRadius = '999px';
            label.style.backdropFilter = 'blur(2px)';
            label.style.pointerEvents = 'none';
            label.style.display = 'none';
            label.style.zIndex = '5';
            score.appendChild(label);
        }
        return label;
    }

    function showPlaybackCountdown(value, isStrong) {
        const label = ensurePlaybackCountInLabel();
        if (!label) return;
        label.textContent = String(value);
        label.style.display = 'inline-flex';
        if (isStrong) {
            label.style.color = 'var(--primary-blue, #007aff)';
            label.style.opacity = '1';
        } else {
            label.style.color = 'var(--text-color)';
            label.style.opacity = '0.75';
        }
    }

    function hidePlaybackCountdown() {
        const label = document.getElementById('playbackCountInLabel');
        if (label && label.parentNode) {
            label.parentNode.removeChild(label);
        }
    }

    function schedulePlaybackCountdown(value, time, isStrong) {
        const ctx = getRhythmAudioContext();
        const delay = Math.max(0, (time - ctx.currentTime) * 1000);
        const id = setTimeout(() => {
            showPlaybackCountdown(value, isStrong);
        }, delay);
        state.playback.countInUiTimers.push(id);
    }

    function clearCalibrationStyles() {
        if (state.calibration.judgedElements && state.calibration.judgedElements.size) {
            state.calibration.judgedElements.forEach(el => {
                el.classList.remove('midi-judge-correct', 'midi-judge-wrong');
            });
            state.calibration.judgedElements.clear();
            return;
        }
        const svg = document.getElementById('score')?.querySelector('svg');
        if (!svg) return;
        const nodes = svg.querySelectorAll('.midi-judge-wrong, .midi-judge-correct');
        nodes.forEach(el => el.classList.remove('midi-judge-wrong', 'midi-judge-correct'));
    }

    function setCalibrationEnabled(enabled, save = true) {
        state.calibration.enabled = !!enabled;
        if (save) writeCalibrationPreference(state.calibration.enabled);
        updateCalibrationToggleUI();
        updateCalibrationHint();
        if (!state.calibration.enabled) {
            stopCalibration();
        }
    }

    function isRestLikeElement(el) {
        if (!el || !el.closest) return false;
        if (el.closest('g.vf-rest, [class*="rest" i], use[href*="rest" i]')) return true;
        const note = el.closest('g.vf-stavenote, g.vf-note');
        if (!note) return false;
        const hasHead = !!note.querySelector('g.vf-notehead, .vf-notehead, use[href*="notehead" i], [class*="notehead" i]');
        return !hasHead;
    }

    function getNotePaintTarget(el) {
        if (!el) return null;
        if (isRestLikeElement(el)) return null;
        if (el.matches && el.matches('use[href*="notehead" i]')) return el;
        if (el.matches && el.matches('.vf-notehead, g.vf-notehead')) {
            const tag = el.tagName ? el.tagName.toLowerCase() : '';
            if (tag === 'path' || tag === 'ellipse' || tag === 'circle') return el;
        }
        const head = el.closest('g.vf-notehead, .vf-notehead');
        if (head && !isRestLikeElement(head)) {
            const concrete = head.querySelector('use[href*="notehead" i], :scope > path, :scope > ellipse, :scope > circle');
            if (concrete) return concrete;
            const headTag = head.tagName ? head.tagName.toLowerCase() : '';
            if (headTag === 'path' || headTag === 'ellipse' || headTag === 'circle') return head;
            return null;
        }
        const note = el.closest('g.vf-stavenote, g.vf-note');
        if (!note || isRestLikeElement(note)) return null;
        const ownerHead = note.querySelector('g.vf-notehead, .vf-notehead, use[href*="notehead" i]');
        if (!ownerHead) return null;
        if (ownerHead.matches && ownerHead.matches('use[href*="notehead" i]')) return ownerHead;
        const concrete = ownerHead.querySelector
            ? ownerHead.querySelector('use[href*="notehead" i], :scope > path, :scope > ellipse, :scope > circle')
            : null;
        return concrete || null;
    }

    function collectCalibrationElements() {
        const svg = document.getElementById('score')?.querySelector('svg');
        if (!svg) return [];
        const candidates = Array.from(svg.querySelectorAll(
            '.vf-notehead, g.vf-notehead, use[href*="notehead" i]'
        ));
        const seen = new Set();
        const scored = candidates.map(el => {
            const target = getNotePaintTarget(el);
            if (!target || seen.has(target)) return null;
            seen.add(target);
            const rect = target.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return null;
            return {
                el: target,
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                w: rect.width,
                h: rect.height
            };
        }).filter(item => item && item.el && item.w > 0 && item.h > 0);
        scored.sort((a, b) => (a.x - b.x) || (a.y - b.y));
        return scored;
    }

    function computeCalibrationWindowSec(tempo) {
        const beatSec = 60 / Math.max(1, tempo || 80);
        const window = beatSec * 0.22;
        return Math.max(0.07, Math.min(0.26, window));
    }

    function isEditableElement(target) {
        if (!target) return false;
        const tag = target.tagName ? target.tagName.toLowerCase() : '';
        return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
    }

    function buildCalibrationEvents(tempo) {
        const { events } = buildPlaybackEvents();
        if (!events || !events.length) return [];
        const secondsPerTick = (60 / Math.max(1, tempo || 80)) / divisions;
        const noteheads = collectCalibrationElements();
        const voiceMode = (state.lastSettings || getSettings())?.voiceMode || 1;
        const groups = [];
        const groupTolerance = 4;

        noteheads.forEach(item => {
            const last = groups[groups.length - 1];
            if (!last || Math.abs(item.x - last.centerX) > groupTolerance) {
                groups.push({ centerX: item.x, items: [item] });
                return;
            }
            last.items.push(item);
            last.centerX = (last.centerX * (last.items.length - 1) + item.x) / last.items.length;
        });
        groups.forEach(group => {
            group.items.sort((a, b) => a.y - b.y);
        });

        const tickGroups = [];
        let current = null;
        events.forEach(ev => {
            if (!current || current.ticks !== ev.ticks) {
                current = { ticks: ev.ticks, items: [ev] };
                tickGroups.push(current);
                return;
            }
            current.items.push(ev);
        });

        const mapped = [];
        const lastXByVoice = new Map();
        let groupCursor = 0;
        tickGroups.forEach(tg => {
            const group = groups[groupCursor] || null;
            const bucket = group ? group.items.slice() : [];
            const orderedByLow = bucket.slice().sort((a, b) => b.y - a.y);

            tg.items.forEach((ev, idx) => {
                let picked = null;
                let logicalVoice = ev.voice || 1;
                const lastX = lastXByVoice.get(logicalVoice);
                const minX = Number.isFinite(lastX) ? (lastX - 2) : -Infinity;
                if (voiceMode > 1 && orderedByLow.length) {
                    const upper = orderedByLow[orderedByLow.length - 1];
                    const lower = orderedByLow[0];
                    if (logicalVoice === 1) {
                        picked = upper || lower || null;
                    } else if (logicalVoice === 2) {
                        picked = lower || upper || null;
                    } else {
                        picked = orderedByLow[idx] || orderedByLow[orderedByLow.length - 1];
                    }
                    if (picked && picked.x < minX) {
                        const forward = orderedByLow.find(item => item.x >= minX) || null;
                        picked = forward || null;
                    }
                } else if (bucket.length) {
                    picked = bucket[Math.min(idx, bucket.length - 1)];
                    if (picked && picked.x < minX) {
                        const forward = bucket.find(item => item.x >= minX) || null;
                        picked = forward || null;
                    }
                }
                if (picked && Number.isFinite(picked.x)) {
                    lastXByVoice.set(logicalVoice, picked.x);
                }
                mapped.push({
                    time: ev.ticks * secondsPerTick,
                    voice: logicalVoice,
                    judged: false,
                    elements: picked && picked.el ? [picked.el] : [],
                    tieType: ev.tieType || null,
                    tieGroup: ev.tieGroup || null
                });
            });
            groupCursor += 1;
        });
        const grouped = [];
        const EPS = secondsPerTick * 0.5;
        mapped.forEach(item => {
            const last = grouped[grouped.length - 1];
            const target = {
                voice: item.voice || 1,
                judged: false,
                elements: Array.isArray(item.elements) ? item.elements.slice() : [],
                tieType: item.tieType || null,
                tieGroup: item.tieGroup || null
            };
            if (last && Math.abs(last.time - item.time) <= EPS) {
                last.targets.push(target);
                last.elements = last.targets.flatMap(t => t.elements || []);
                return;
            }
            grouped.push({
                time: item.time,
                judged: false,
                targets: [target],
                elements: target.elements.slice()
            });
        });
        const normalized = grouped.map(ev => {
            const targets = (Array.isArray(ev.targets) ? ev.targets : []).filter(target =>
                Array.isArray(target.elements) && target.elements.length > 0
            );
            return {
                ...ev,
                targets,
                elements: targets.flatMap(target => target.elements || []),
                judged: targets.length === 0 ? true : !!ev.judged
            };
        }).filter(ev => ev.targets.length > 0);
        return normalized;
    }

    function markCalibrationTarget(targetEvent, status) {
        if (!targetEvent || targetEvent.judged) return;
        targetEvent.judged = true;
        const cls = status === 'correct' ? 'midi-judge-correct' : 'midi-judge-wrong';
        const elements = Array.isArray(targetEvent.elements) ? targetEvent.elements : [];
        elements.forEach(el => {
            const target = getNotePaintTarget(el);
            if (!target) return;
            target.classList.remove('midi-judge-correct', 'midi-judge-wrong');
            target.classList.add(cls);
            state.calibration.judgedElements.add(target);
        });
        sanitizeCalibrationPaintTargets();
    }

    function sanitizeCalibrationPaintTargets() {
        const svg = document.getElementById('score')?.querySelector('svg');
        if (!svg) return;
        const marked = svg.querySelectorAll('.midi-judge-correct, .midi-judge-wrong');
        marked.forEach(el => {
            const status = el.classList.contains('midi-judge-correct') ? 'correct'
                : (el.classList.contains('midi-judge-wrong') ? 'wrong' : null);
            if (isRestLikeElement(el)) {
                el.classList.remove('midi-judge-correct', 'midi-judge-wrong');
                state.calibration.judgedElements.delete(el);
                return;
            }
            const canonical = getNotePaintTarget(el);
            if (!canonical) {
                el.classList.remove('midi-judge-correct', 'midi-judge-wrong');
                state.calibration.judgedElements.delete(el);
                return;
            }
            if (canonical !== el) {
                el.classList.remove('midi-judge-correct', 'midi-judge-wrong');
                state.calibration.judgedElements.delete(el);
                if (status) {
                    canonical.classList.remove('midi-judge-correct', 'midi-judge-wrong');
                    canonical.classList.add(status === 'correct' ? 'midi-judge-correct' : 'midi-judge-wrong');
                    state.calibration.judgedElements.add(canonical);
                }
            }
        });
    }

    function markCalibrationTieGroup(tieGroup, status) {
        if (!tieGroup) return;
        const events = Array.isArray(state.calibration.events) ? state.calibration.events : [];
        events.forEach(ev => {
            const targets = Array.isArray(ev.targets) && ev.targets.length
                ? ev.targets
                : [{ judged: !!ev.judged, elements: Array.isArray(ev.elements) ? ev.elements : [], voice: ev.voice || 1, tieType: ev.tieType || null, tieGroup: ev.tieGroup || null }];
            targets.forEach(target => {
                if (!target.judged && target.tieGroup === tieGroup) {
                    markCalibrationTarget(target, status);
                }
            });
            ev.judged = targets.every(target => !!target.judged);
        });
    }

    function markCalibrationEvent(ev, status) {
        if (!ev) return;
        const targets = Array.isArray(ev.targets) && ev.targets.length
            ? ev.targets
            : [{ judged: !!ev.judged, elements: Array.isArray(ev.elements) ? ev.elements : [], voice: ev.voice || 1 }];
        targets.forEach(target => {
            if (!target.judged) markCalibrationTarget(target, status);
        });
        ev.judged = targets.every(target => !!target.judged);
        sanitizeCalibrationPaintTargets();
    }

    function startCalibrationAt(startTime, tempo) {
        if (!state.calibration.enabled) return;
        state.calibration.active = true;
        state.calibration.startTime = startTime;
        state.calibration.events = buildCalibrationEvents(tempo);
        state.calibration.index = 0;
        state.calibration.windowSec = computeCalibrationWindowSec(tempo);
        clearCalibrationStyles();
    }

    function stopCalibration() {
        state.calibration.active = false;
        state.calibration.startTime = 0;
        state.calibration.events = [];
        state.calibration.index = 0;
        clearCalibrationStyles();
    }

    function mapMidiToVoice(midi, voiceMode) {
        if (voiceMode <= 1) return 1;
        const pc = ((midi % 12) + 12) % 12;
        if (pc === 0) return 2; // C/Do -> lower voice (kick)
        if (pc === 7) return 1; // G/Sol -> upper voice (snare)
        return null;
    }

    function handleCalibrationInput(voice, time) {
        if (!state.calibration.enabled || !state.calibration.active) return;
        const ctx = getRhythmAudioContext();
        const now = typeof time === 'number' ? time : ctx.currentTime;
        const nowSec = now - (state.calibration.startTime || 0);
        const events = state.calibration.events;
        if (!events || !events.length) return;
        const baseWindow = state.calibration.windowSec || 0.08;
        const getWindow = index => {
            if (index === 0) {
                return { early: Math.min(0.28, baseWindow + 0.1), late: Math.min(0.32, baseWindow + 0.14) };
            }
            return { early: baseWindow, late: baseWindow };
        };
        const getOverdueLate = (index, ev) => {
            const w = getWindow(index);
            const targetCount = Array.isArray(ev?.targets) ? ev.targets.length : 1;
            const extraFirst = index === 0 ? 0.18 : 0;
            const extraChord = targetCount > 1 ? 0.08 : 0;
            return Math.max(w.late + extraFirst + extraChord, index === 0 ? 0.35 : w.late);
        };
        const advanceIndex = () => {
            while (state.calibration.index < events.length && events[state.calibration.index].judged) {
                state.calibration.index += 1;
            }
        };

        while (state.calibration.index < events.length &&
               nowSec > events[state.calibration.index].time + getOverdueLate(state.calibration.index, events[state.calibration.index])) {
            markCalibrationEvent(events[state.calibration.index], 'wrong');
            state.calibration.index += 1;
            advanceIndex();
        }

        if (state.calibration.index >= events.length) return;
        if (state.calibration.index === 0) {
            const first = events[0];
            if (first && !first.judged) {
                const fw = getWindow(0);
                const hardLate = Math.max(fw.late, 0.35);
                if (nowSec >= -fw.early && nowSec <= hardLate) {
                    const targets = Array.isArray(first.targets) && first.targets.length
                        ? first.targets
                        : [{ judged: !!first.judged, elements: Array.isArray(first.elements) ? first.elements : [], voice: first.voice || 1 }];
                    const match = targets.find(target =>
                        !target.judged &&
                        Array.isArray(target.elements) &&
                        target.elements.length > 0 &&
                        (voice == null || voice === target.voice)
                    );
                    if (match) {
                        markCalibrationTarget(match, 'correct');
                        if (match.tieType === 'start' && match.tieGroup) {
                            markCalibrationTieGroup(match.tieGroup, 'correct');
                        }
                        first.judged = targets.every(target => !!target.judged);
                        if (first.judged) {
                            state.calibration.index = 1;
                            advanceIndex();
                        }
                        return;
                    }
                }
            }
        }

        const ev = events[state.calibration.index];
        if (!ev || ev.judged) return;
        const window = getWindow(state.calibration.index);
        const targetCount = Array.isArray(ev.targets) ? ev.targets.length : 1;
        const late = window.late + (targetCount > 1 ? 0.08 : 0);
        const delta = nowSec - ev.time;
        if (delta < -window.early || delta > late) return;
        const targets = Array.isArray(ev.targets) && ev.targets.length
            ? ev.targets
            : [{ judged: !!ev.judged, elements: Array.isArray(ev.elements) ? ev.elements : [], voice: ev.voice || 1 }];
        const match = targets.find(target =>
            !target.judged &&
            Array.isArray(target.elements) &&
            target.elements.length > 0 &&
            (voice == null || voice === target.voice)
        );
        if (match) {
            markCalibrationTarget(match, 'correct');
            if (match.tieType === 'start' && match.tieGroup) {
                markCalibrationTieGroup(match.tieGroup, 'correct');
            }
            ev.judged = targets.every(target => !!target.judged);
            if (ev.judged) {
                state.calibration.index += 1;
            }
            advanceIndex();
        }
    }


    function getSnareNoiseBuffer(ctx) {
        if (state.playback.noiseBuffer && state.playback.noiseBuffer.sampleRate === ctx.sampleRate) {
            return state.playback.noiseBuffer;
        }
        const length = Math.floor(ctx.sampleRate * 0.25);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / length);
        }
        state.playback.noiseBuffer = buffer;
        return buffer;
    }

    function playSnare(time, velocity) {
        const ctx = ensurePlaybackContext();
        const output = getPlaybackOutputGain(ctx);
        if (!output) return;
        ensureAudioGain(output, ctx);
        const level = Math.max(0.1, Math.min(1, velocity || 0.95));
        const noise = ctx.createBufferSource();
        noise.buffer = getSnareNoiseBuffer(ctx);
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(900, time);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(level * 1.35, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
        noise.connect(noiseFilter).connect(noiseGain).connect(output);
        noise.start(time);
        noise.stop(time + 0.2);

        const tone = ctx.createOscillator();
        tone.type = 'triangle';
        tone.frequency.setValueAtTime(180, time);
        const toneGain = ctx.createGain();
        toneGain.gain.setValueAtTime(level * 0.5, time);
        toneGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
        tone.connect(toneGain).connect(output);
        tone.start(time);
        tone.stop(time + 0.2);
    }

    function playKick(time, velocity) {
        const ctx = ensurePlaybackContext();
        const output = getPlaybackOutputGain(ctx);
        if (!output) return;
        ensureAudioGain(output, ctx);
        const level = Math.max(0.15, Math.min(1, velocity || 1.0));
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.14);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(level * 1.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
        osc.connect(gain).connect(output);
        osc.start(time);
        osc.stop(time + 0.25);
    }

    function playKeyboardDrumByKey(key, time) {
        const normalized = String(key || '').toLowerCase();
        if (normalized !== 'f' && normalized !== 'j') return;
        const ctx = getRhythmAudioContext();
        if (!ctx) return;
        const when = typeof time === 'number' ? time : (ctx.currentTime + 0.01);
        if (normalized === 'f') {
            playKick(when, 1.0);
        } else {
            playSnare(when, 0.95);
        }
    }

    function buildPlaybackEvents() {
        const voices = state.lastVoices;
        const settings = state.lastSettings || getSettings();
        if (!Array.isArray(voices) || voices.length === 0) {
            return { events: [], totalTicks: 0, settings };
        }
        const ticksPerBeat = divisions * (4 / settings.beatType);
        const measureTicks = ticksPerBeat * settings.beats;
        const events = [];
        voices.forEach((measures, voiceIndex) => {
            if (!Array.isArray(measures)) return;
            measures.forEach((measure, measureIndex) => {
                let position = 0;
                (measure || []).forEach(event => {
                    const voice = event.voice || (voiceIndex + 1);
                    if (!event.rest) {
                        events.push({
                            ticks: measureIndex * measureTicks + position,
                            voice,
                            tieType: event.tieType || null
                        });
                    }
                    position += event.duration || 0;
                });
            });
        });
        const openTieByVoice = new Map();
        events.forEach((ev, idx) => {
            const voiceKey = String(ev.voice || 1);
            const tieType = ev.tieType || null;
            ev.tieGroup = null;
            if (!tieType) return;
            if (tieType === 'start') {
                const groupId = `v${voiceKey}-t${ev.ticks}-${idx}`;
                openTieByVoice.set(voiceKey, groupId);
                ev.tieGroup = groupId;
                return;
            }
            const openId = openTieByVoice.get(voiceKey) || null;
            ev.tieGroup = openId;
            if (tieType === 'stop' && openId) {
                openTieByVoice.delete(voiceKey);
            }
        });
        const totalTicks = measureTicks * (voices[0] ? voices[0].length : 0);
        events.sort((a, b) => a.ticks - b.ticks);
        return { events, totalTicks, settings };
    }

    function stopPlayback() {
        if (state.playback.countInTimer) {
            clearTimeout(state.playback.countInTimer);
            state.playback.countInTimer = null;
        }
        if (state.playback.countInUiTimers && state.playback.countInUiTimers.length) {
            state.playback.countInUiTimers.forEach(id => clearTimeout(id));
            state.playback.countInUiTimers = [];
        }
        state.playback.countInActive = false;
        state.playback.countInState = null;
        hidePlaybackCountdown();
        if (state.playback.stopTimer) {
            clearTimeout(state.playback.stopTimer);
            state.playback.stopTimer = null;
        }
        if (state.metronome.isRunning && state.metronome.startedByPlayback) {
            stopMetronome();
        }
        muteAudioGain(state.metronome.outputGain, state.metronome.audioCtx);
        if (state.calibration.active) {
            stopCalibration();
        }
        if (!state.playback.isPlaying && !state.playback.audioCtx) {
            updatePlayButtonState(false);
            return;
        }
        state.playback.isPlaying = false;
        updatePlayButtonState(false);
        muteAudioGain(state.playback.outputGain, state.playback.audioCtx);
        if (state.playback.audioCtx && state.playback.audioCtx !== state.metronome.audioCtx) {
            try {
                state.playback.audioCtx.close();
            } catch (_) {
                // ignore
            }
            state.playback.audioCtx = null;
        }
    }

    function startPlaybackAt(startTime, tempoOverride) {
        const { events, totalTicks, settings } = buildPlaybackEvents();
        const ctx = ensurePlaybackContext();
        const tempo = Math.max(1, tempoOverride || getCurrentTempo());
        const secondsPerTick = (60 / tempo) / divisions;
        const useTwoVoices = (settings && settings.voiceMode > 1) || events.some(event => event.voice === 2);

        if (!events.length) {
            playSnare(startTime || (ctx.currentTime + 0.05), 0.95);
            const delay = Math.max(0, ((startTime || ctx.currentTime) - ctx.currentTime) * 1000);
            state.playback.stopTimer = setTimeout(() => {
                state.playback.isPlaying = false;
                updatePlayButtonState(false);
                if (state.metronome.isRunning && state.metronome.startedByPlayback) {
                    stopMetronome();
                }
                if (state.calibration.active) {
                    stopCalibration();
                }
            }, Math.ceil(delay + 300));
            return;
        }

        const baseTime = startTime || (ctx.currentTime + 0.08);
        events.forEach(event => {
            const time = baseTime + event.ticks * secondsPerTick;
            if (useTwoVoices) {
                if (event.voice === 2) {
                    playKick(time, 1.0);
                } else {
                    playSnare(time, 0.95);
                }
            } else {
                playSnare(time, 0.95);
            }
        });

        const totalDuration = Math.max(totalTicks * secondsPerTick, 0.2);
        const delayMs = Math.max(0, (baseTime - ctx.currentTime) * 1000);
        state.playback.stopTimer = setTimeout(() => {
            state.playback.isPlaying = false;
            updatePlayButtonState(false);
            if (state.metronome.isRunning && state.metronome.startedByPlayback) {
                stopMetronome();
            }
            if (state.calibration.active) {
                stopCalibration();
            }
        }, Math.ceil(delayMs + (totalDuration + 0.3) * 1000));
    }

    function getPlaybackCountInInfo(settings) {
        let beats = Math.max(1, settings?.beats || 4);
        let beatType = Math.max(1, settings?.beatType || 4);
        const xml = typeof window.__rhythmLastXml === 'string' ? window.__rhythmLastXml : '';
        if (xml) {
            const beatsMatch = xml.match(/<time>\s*<beats>(\d+)<\/beats>\s*<beat-type>(\d+)<\/beat-type>\s*<\/time>/i);
            if (beatsMatch) {
                const parsedBeats = parseInt(beatsMatch[1], 10);
                const parsedBeatType = parseInt(beatsMatch[2], 10);
                if (Number.isFinite(parsedBeats) && parsedBeats > 0) beats = parsedBeats;
                if (Number.isFinite(parsedBeatType) && parsedBeatType > 0) beatType = parsedBeatType;
            }
        }
        return { beats, beatType };
    }

    function startPlaybackWithCountIn() {
        stopPlayback();
        if (state.metronome.isRunning) {
            stopMetronome();
        }
        const ctx = ensurePlaybackContext();
        const output = getPlaybackOutputGain(ctx);
        const metOutput = getMetronomeOutputGain(ctx);
        if (output) {
            output.gain.cancelScheduledValues(ctx.currentTime);
            output.gain.setValueAtTime(1, ctx.currentTime);
        }
        if (metOutput) {
            metOutput.gain.cancelScheduledValues(ctx.currentTime);
            metOutput.gain.setValueAtTime(1, ctx.currentTime);
        }
        const settings = state.lastSettings || getSettings();
        const countInInfo = getPlaybackCountInInfo(settings);
        const countInBeats = countInInfo.beats;
        const initialTime = ctx.currentTime + 0.08;

        state.playback.isPlaying = true;
        updatePlayButtonState(true);

        state.playback.countInActive = true;
        state.playback.countInState = {
            remaining: countInBeats,
            total: countInBeats,
            nextTime: initialTime
        };
        const scheduleNextCountIn = () => {
            if (!state.playback.countInActive || !state.playback.countInState) return;
            const tempo = getCurrentTempo();
            const beatDuration = getMetronomeBeatDuration(tempo);
            const { remaining, total } = state.playback.countInState;
            const countIndex = (total - remaining) + 1;
            const isDownbeat = (countInInfo.beats === 6 && countInInfo.beatType === 8)
                ? (countIndex === 1 || countIndex === 4)
                : (countIndex === 1);
            const scheduledTime = state.playback.countInState.nextTime;

            playClick(isDownbeat, scheduledTime);
            schedulePlaybackCountdown(countIndex, scheduledTime, isDownbeat);

            state.playback.countInState.remaining -= 1;
            state.playback.countInState.nextTime = scheduledTime + beatDuration;

            if (state.playback.countInState.remaining <= 0) {
                state.playback.countInActive = false;
                const startTime = state.playback.countInState.nextTime;
                const tempoAtStart = getCurrentTempo();
                if (state.calibration.enabled) {
                    startCalibrationAt(startTime, tempoAtStart);
                }
                startMetronome(startTime, true);
                startPlaybackAt(startTime, tempoAtStart);
                const hideDelayMs = Math.max(0, (startTime - ctx.currentTime) * 1000);
                const hideId = setTimeout(() => {
                    hidePlaybackCountdown();
                }, hideDelayMs);
                state.playback.countInUiTimers.push(hideId);
                return;
            }

            const lookahead = 0.05;
            const delayMs = Math.max(0, (state.playback.countInState.nextTime - ctx.currentTime - lookahead) * 1000);
            state.playback.countInTimer = setTimeout(scheduleNextCountIn, delayMs);
        };

        scheduleNextCountIn();
    }

    function directPlayTest() {
        if (state.playback.isPlaying) {
            stopPlayback();
            return;
        }
        startPlaybackWithCountIn();
    }

    function handleMidiNoteOn(midi) {
        if (!state.calibration.enabled) return;
        const settings = state.lastSettings || getSettings();
        const voiceMode = settings?.voiceMode || 1;
        const voice = mapMidiToVoice(midi, voiceMode);
        if (voiceMode > 1 && !voice) return;
        handleCalibrationInput(voice, getRhythmAudioContext().currentTime);
    }

    function handleMidiDrumNoteOn(midi, velocity) {
        const ctx = getRhythmAudioContext();
        if (!ctx) return null;
        const now = ctx.currentTime + 0.01;
        const level = Math.max(0.15, Math.min(1, (velocity || 0) / 127));
        const settings = state.lastSettings || getSettings();
        const voiceMode = settings?.voiceMode || 1;
        const voice = voiceMode > 1 ? mapMidiToVoice(midi, voiceMode) : 1;
        if (voiceMode > 1 && !voice) {
            return null;
        }
        if (voiceMode > 1 && voice === 2) {
            playKick(now, level);
        } else {
            playSnare(now, level);
        }
        return null;
    }

    window.IC_MIDI_CONFIG = {
        getAudioContext: getRhythmAudioContext,
        useSamplePlayer: false,
        translations,
        getLanguage: () => currentLanguage,
        noteOn: handleMidiDrumNoteOn,
        onNoteOn: handleMidiNoteOn
    };

    window.getMetronomeState = () => {
        const bpmInput = document.getElementById('metronomeBpm');
        const bpmValue = bpmInput ? parseInt(bpmInput.value, 10) : 80;
        const tempo = Number.isFinite(bpmValue) ? bpmValue : 80;
        return {
            audioContext: getRhythmAudioContext(),
            tempo
        };
    };

    function scheduleMetronomeIndicator(shouldPlay, accent, time) {
        const indicator = document.getElementById('metronomeBeatIndicator');
        if (!indicator || !state.metronome.audioCtx) return;
        const ctx = state.metronome.audioCtx;
        const delay = Math.max(0, (time - ctx.currentTime) * 1000);
        setTimeout(() => {
            if (!state.metronome.isRunning) return;
            indicator.classList.toggle('beat', shouldPlay && accent);
            indicator.style.opacity = shouldPlay && accent ? '1' : '0.6';
        }, delay);
    }

    function playClick(accent, time) {
        const ctx = state.metronome.audioCtx;
        if (!ctx) return;
        const output = getMetronomeOutputGain(ctx);
        if (!output) return;
        const scheduleTime = typeof time === 'number' ? time : ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const baseFreq = 523.25; // C5, match other tools
        osc.type = 'square';
        osc.frequency.setValueAtTime(accent ? baseFreq * 1.2 : baseFreq, scheduleTime);
        gain.gain.setValueAtTime(0.5, scheduleTime);
        gain.gain.exponentialRampToValueAtTime(0.01, scheduleTime + 0.05);
        osc.connect(gain).connect(output);
        osc.start(scheduleTime);
        osc.stop(scheduleTime + 0.05);
    }

    function startMetronome(startAtTime, startedByPlayback = false) {
        const settings = getSettings();
        const beatsPerMeasure = settings.beats;
        const ctx = getRhythmAudioContext();
        const output = getMetronomeOutputGain(ctx);
        if (output) {
            output.gain.cancelScheduledValues(ctx.currentTime);
            output.gain.setValueAtTime(1, ctx.currentTime);
        }
        const startTime = typeof startAtTime === 'number'
            ? startAtTime
            : (ctx.currentTime + 0.05);
        state.metronome.beatIndex = 0;
        state.metronome.stepIndex = 0;
        state.metronome.isRunning = true;
        state.metronome.startedByPlayback = !!startedByPlayback;
        state.metronome.nextTime = Math.max(startTime, state.metronome.audioCtx.currentTime + 0.02);

        const schedule = () => {
            if (!state.metronome.isRunning || !state.metronome.audioCtx) return;
            const ctx = state.metronome.audioCtx;
            const lookahead = 0.12;

            while (state.metronome.nextTime < ctx.currentTime + lookahead) {
                const currentTempo = getCurrentTempo();
                const patternInfo = getMetronomePatternInfo(currentTempo);
                const subdivision = patternInfo.usePattern ? patternInfo.subdivision : 1;
                let shouldPlay = true;
                if (patternInfo.usePattern && patternInfo.stepsPerPattern) {
                    const idx = state.metronome.stepIndex % patternInfo.stepsPerPattern;
                    shouldPlay = patternInfo.steps[idx] === 1;
                }
                const isBeatStart = patternInfo.usePattern ? (state.metronome.stepIndex % subdivision === 0) : true;
                if (isBeatStart) {
                    state.metronome.beatIndex += 1;
                }
                const accent = isBeatStart && (state.metronome.beatIndex - 1) % beatsPerMeasure === 0;
                if (shouldPlay) {
                    playClick(accent, state.metronome.nextTime);
                }
                scheduleMetronomeIndicator(shouldPlay, accent, state.metronome.nextTime);
                state.metronome.stepIndex += 1;
                const stepDuration = patternInfo.stepDuration || (60 / currentTempo);
                state.metronome.nextTime += stepDuration;
            }

            state.metronome.timer = setTimeout(schedule, 25);
        };

        schedule();
    }

    function stopMetronome() {
        if (state.metronome.timer) {
            clearTimeout(state.metronome.timer);
            state.metronome.timer = null;
        }
        state.metronome.isRunning = false;
        state.metronome.stepIndex = 0;
        state.metronome.beatIndex = 0;
        state.metronome.nextTime = 0;
        state.metronome.startedByPlayback = false;
        muteAudioGain(state.metronome.outputGain, state.metronome.audioCtx);
        const indicator = document.getElementById('metronomeBeatIndicator');
        if (indicator) {
            indicator.classList.remove('beat');
            indicator.style.opacity = '0.6';
        }
    }

    function toggleMetronome() {
        if (state.metronome.isRunning) {
            stopMetronome();
        } else {
            startMetronome();
        }
    }

    function bindEvents() {
        const secondaryDensity = document.getElementById('secondaryDensity');
        const voiceMode = document.getElementById('voiceMode');
        const preset = document.getElementById('difficultyPreset');
        const generateBtn = document.getElementById('generateBtn');
        const previousBtn = document.getElementById('previousBtn');
        const nextBtn = document.getElementById('nextBtn');
        const metronomeBtn = document.getElementById('metronomeToggleBtn');
        const scoreContainer = document.getElementById('score');
        const ostinatoVoice = document.getElementById('ostinatoVoiceSelect');
        const timeSignatureSelect = document.getElementById('timeSignature');
        const allowDottedNotes = document.getElementById('allowDottedNotes');

        updateFrequencyLabels();
        ['freq-dotted', 'freq-whole', 'freq-dotted-half', 'freq-half', 'freq-dotted-quarter', 'freq-quarter', 'freq-dotted-eighth', 'freq-eighth', 'freq-16th', 'freq-triplet', 'freq-duplet', 'freq-quadruplet'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.addEventListener('input', updateFrequencyLabels);
        });
        if (secondaryDensity) {
            secondaryDensity.addEventListener('input', updateDensityLabels);
        }
        voiceMode.addEventListener('change', () => {
            toggleSecondaryDensity(voiceMode.value === '2');
        });
        if (ostinatoVoice) {
            ostinatoVoice.addEventListener('change', () => {
                ostinatoState.voice = ostinatoVoice.value;
                if (ostinatoState.voice !== 'none') {
                    ostinatoState.lastVoice = ostinatoState.voice;
                    ostinatoState.enabled = true;
                } else {
                    ostinatoState.enabled = false;
                }
                saveOstinatoState();
                updateOstinatoPatternUI();
            });
        }
        if (preset) {
            preset.addEventListener('change', () => applyPreset(preset.value));
        }
        if (timeSignatureSelect) {
            timeSignatureSelect.addEventListener('change', () => {
                updateRhythmOptionsForTimeSignature(timeSignatureSelect.value);
            });
        }
        if (allowDottedNotes) {
            allowDottedNotes.addEventListener('change', () => {
                if (timeSignatureSelect) {
                    updateRhythmOptionsForTimeSignature(timeSignatureSelect.value);
                }
            });
        }
        generateBtn.addEventListener('click', triggerGenerate);
        if (previousBtn) previousBtn.addEventListener('click', previousRhythm);
        if (nextBtn) nextBtn.addEventListener('click', nextRhythm);
        metronomeBtn.addEventListener('click', toggleMetronome);
        if (scoreContainer) {
            scoreContainer.addEventListener('click', () => {
                triggerGenerate();
            });
        }
        const voiceOptions = document.querySelectorAll('input[name="voiceOption"]');
        voiceOptions.forEach(option => {
            option.addEventListener('change', () => {
                toggleOstinatoSection(option.value === '2');
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadOstinatoState();
        initializePreferences();
        initializeCalibrationSettings();
        bindEvents();
        initializeMetronomePatternUI();
        initializeOstinatoPatternUI();
        updateDensityLabels();
        updateOstinatoUI();
        const voiceMode = document.getElementById('voiceMode');
        toggleOstinatoSection(voiceMode && voiceMode.value === '2');
        const timeSignatureSelect = document.getElementById('timeSignature');
        if (timeSignatureSelect) {
            updateRhythmOptionsForTimeSignature(timeSignatureSelect.value);
        }
        updatePracticeCountDisplay(0);
        setupModalAutoSave('rhythmSettingsModal', saveRhythmSettings);
        setupModalAutoSave('timeSignatureModal', saveTimeSignatureSettings);
        setupModalAutoSave('voiceSettingsModal', saveVoiceSettings);
        setupModalAutoSave('metronomePatternModal', saveMetronomePatternSettingsAndClose);
        setupModalAutoSave('settingsModal', closeSettingsModal);
        setEmptyScore();

        // ============ 跨工具同步监听机制 ============
        window.addEventListener('storage', function(e) {
            if (e.key === 'preferredTheme' && e.newValue && e.newValue !== currentTheme) {
                currentTheme = e.newValue;
                document.documentElement.setAttribute('data-theme', currentTheme);
            }

            if (e.key === 'preferredLanguage' && e.newValue && e.newValue !== currentLanguage) {
                currentLanguage = e.newValue;
                applyTranslations();
                if (window.__icMidi && typeof window.__icMidi.refreshStatus === 'function') {
                    window.__icMidi.refreshStatus();
                }
            }
        });

        // ============ 统一同步系统 ============
        window.ICStudioSync = window.ICStudioSync || {
            tools: new Set(),

            registerTool: function(toolName, callbacks) {
                this.tools.add({
                    name: toolName,
                    onThemeChange: callbacks.onThemeChange,
                    onLanguageChange: callbacks.onLanguageChange
                });
            },

            syncTheme: function(newTheme, fromTool) {
                this.tools.forEach(tool => {
                    if (tool.name !== fromTool && tool.onThemeChange) {
                        try {
                            tool.onThemeChange(newTheme);
                        } catch (error) {
                            console.warn(`⚠️ ${tool.name} 主题同步失败:`, error);
                        }
                    }
                });
            },

            syncLanguage: function(newLanguage, fromTool) {
                this.tools.forEach(tool => {
                    if (tool.name !== fromTool && tool.onLanguageChange) {
                        try {
                            tool.onLanguageChange(newLanguage);
                        } catch (error) {
                            console.warn(`⚠️ ${tool.name} 语言同步失败:`, error);
                        }
                    }
                });
            }
        };

        window.ICStudioSync.registerTool('rhythm-tool', {
            onThemeChange: function(newTheme) {
                if (currentTheme !== newTheme) {
                    currentTheme = newTheme;
                    document.documentElement.setAttribute('data-theme', currentTheme);
                }
            },
            onLanguageChange: function(newLanguage) {
                if (currentLanguage !== newLanguage) {
                    currentLanguage = newLanguage;
                    applyTranslations();
                    if (window.__icMidi && typeof window.__icMidi.refreshStatus === 'function') {
                        window.__icMidi.refreshStatus();
                    }
                }
            }
        });
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            const modal = document.getElementById('settingsModal');
            if (modal && modal.dataset.open === 'true') {
                closeSettingsModal();
            }
        }
        if (!state.calibration.enabled) return;
        if (event.repeat || isEditableElement(event.target)) return;
        const key = (event.key || '').toLowerCase();
        if (key === 'f' || key === 'j') {
            playKeyboardDrumByKey(key);
            const settings = state.lastSettings || getSettings();
            const voiceMode = settings?.voiceMode || 1;
            const voice = voiceMode > 1 ? (key === 'f' ? 2 : 1) : 1;
            handleCalibrationInput(voice, getRhythmAudioContext().currentTime);
        }
    });

    window.toggleFunctionSelector = toggleFunctionSelector;
    window.toggleSettings = toggleSettings;
    window.openSettingsModal = openSettingsModal;
    window.closeSettingsModal = closeSettingsModal;
    window.setTheme = setTheme;
    window.switchLanguage = switchLanguage;
    window.switchFunction = switchFunction;
    window.openRhythmSettings = openRhythmSettings;
    window.closeRhythmSettings = closeRhythmSettings;
    window.saveRhythmSettings = saveRhythmSettings;
    window.toggleRhythmAdvancedSettings = toggleRhythmAdvancedSettings;
    window.openTimeSignatureSettings = openTimeSignatureSettings;
    window.closeTimeSignatureSettings = closeTimeSignatureSettings;
    window.saveTimeSignatureSettings = saveTimeSignatureSettings;
    window.openVoiceSettings = openVoiceSettings;
    window.closeVoiceSettings = closeVoiceSettings;
    window.saveVoiceSettings = saveVoiceSettings;
    window.previousRhythm = previousRhythm;
    window.nextRhythm = nextRhythm;
    window.incrementPracticeCount = incrementPracticeCount;
    window.decrementPracticeCount = decrementPracticeCount;
    window.openMetronomePatternSettings = openMetronomePatternSettings;
    window.closeMetronomePatternSettings = closeMetronomePatternSettings;
    window.saveMetronomePatternSettingsAndClose = saveMetronomePatternSettingsAndClose;
    window.resetMetronomePattern = resetMetronomePattern;
    window.clearMetronomePattern = clearMetronomePattern;
    window.loadMetronomePatternSettings = loadMetronomePatternSettings;
    window.getMetronomePatternInfo = getMetronomePatternInfo;
    window.__icRhythmPlayKeyboardDrum = playKeyboardDrumByKey;
    window.resetOstinatoPattern = resetOstinatoPattern;
    window.clearOstinatoPattern = clearOstinatoPattern;
    window.directPlayTest = directPlayTest;
})();
